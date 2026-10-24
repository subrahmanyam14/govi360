import React, { useState } from "react";
import { Head, Kpi, Table, Tag, Modal, money } from "./ui.jsx";
import { vendBal } from "./extra.jsx";

/* =====================================================================
   P2P · Procure-to-Pay
   PR (requisition) → PO (purchase order) → MIGO (goods receipt, stock + MAP update)
   → MIRO (vendor invoice verification, price variance, payable created) → PAY (payment)
   All data lives in db.docs / db.pays / db.pvar (hardcoded seed in data.js).
   ===================================================================== */

const r2 = (x) => Math.round(x * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const nextRef = (list, pre) => pre + "-" + (Math.max(1000, ...list.map((s) => +String(s).split("-")[1] || 0)) + 1);

const prod = (db, id) => db.products.find((p) => p.id === id) || {};
export const docTaxable = (d) => r2(d.items.reduce((s, l) => s + l.rate * l.qty, 0));
export const docTax = (db, d) => r2(d.items.reduce((s, l) => s + (l.rate * l.qty * (prod(db, l.pid).gst || 0)) / 100, 0));
export const docTotal = (db, d) => r2(docTaxable(d) + docTax(db, d));
const paidOf = (db, d) => r2((db.pays || []).filter((x) => x.kind === "v" && x.doc === d.id).reduce((s, x) => s + x.amount, 0));
const balOf = (db, d) => r2(docTotal(db, d) - paidOf(db, d));
const poValue = (db, d) => (d.poTotal !== undefined ? d.poTotal : docTotal(db, d));
const vName = (db, d) => (db.vendors.find((v) => v.id === d.party) || {}).name || "—";
const payNos = (db, d) => (db.pays || []).filter((x) => x.doc === d.id).map((x) => x.no).join(", ") || "—";

/* ---------- document-flow rows (one row per PR→PO chain) ---------- */
const poOfPr = (docs, pr) => docs.find((x) => x.type === "PO" && x.prId === pr.id);
const prOfPo = (docs, po) => docs.find((x) => x.type === "PR" && x.id === po.prId);
function flowRows(docs) {
  const rows = [], used = new Set();
  docs.filter((d) => d.type === "PR").forEach((pr) => { const po = poOfPr(docs, pr); if (po) used.add(po.id); rows.push({ pr, po, date: pr.date }); });
  docs.filter((d) => d.type === "PO" && !used.has(d.id)).forEach((po) => rows.push({ pr: prOfPo(docs, po) || null, po, date: po.date }));
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}
function flowStatus(db, { pr, po }) {
  if (!po) return pr.status === "Cancelled" ? ["Requisition cancelled", "out"] : pr.status === "Approved" ? ["PR approved – PO pending", "low"] : ["Requisition open", "low"];
  if (po.status === "Cancelled") return ["PO cancelled", "out"];
  if (po.status === "Open") return ["PO awaiting approval", "low"];
  if (po.status === "Approved") return ["PO approved – awaiting MIGO", "low"];
  if (po.status === "GR posted") return ["Goods received – MIRO pending", "out"];
  return balOf(db, po) > 0.005 ? ["Invoiced – awaiting payment", "low"] : ["Complete (paid)", "in"];
}
const SEL = {
  pr: (r) => !r.po && r.pr.status !== "Cancelled",
  po: (r) => r.po && (r.po.status === "Open" || r.po.status === "Approved"),
  gr: (r) => r.po && r.po.status === "GR posted",
  up: (r, db) => r.po && r.po.status === "Received" && balOf(db, r.po) > 0.005,
};
const HEAD = ["PR", "PO", "Date", "Vendor", "MIGO (goods receipt)", "MIRO (vendor invoice)", "PO value", "Invoice value", "Paid", "Balance", "Payments", "Flow status"];

const Stp = ({ ok, label, sub }) => (<span className={"stp " + (ok ? "ok" : "no")}>{ok ? "✔ " : "○ "}{label}{sub && <small className="sub">{sub}</small>}</span>);

function LineEditor({ db, lines, setLines }) {
  const upd = (i, f) => setLines(lines.map((l, j) => (j === i ? { ...l, ...f } : l)));
  return (<>
    {lines.map((l, i) => (
      <div className="row" key={i} style={{ alignItems: "end" }}>
        <div style={{ flex: 3 }}><label>Item</label>
          <select value={l.pid} onChange={(e) => upd(i, { pid: e.target.value, rate: prod(db, e.target.value).cost })}>
            {db.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.qty} {p.unit})</option>)}</select></div>
        <div><label>Qty</label><input type="number" min="1" value={l.qty} onChange={(e) => upd(i, { qty: e.target.value })} /></div>
        <div><label>Rate (₹)</label><input type="number" min="0" value={l.rate} onChange={(e) => upd(i, { rate: e.target.value })} /></div>
        <button className="sm d" style={{ flex: "0 0 auto" }} onClick={() => lines.length > 1 && setLines(lines.filter((_, j) => j !== i))}>✕</button>
      </div>))}
    <button className="sm" style={{ marginTop: 8 }} onClick={() => setLines([...lines, { pid: db.products[0].id, qty: 1, rate: db.products[0].cost }])}>+ Add line</button>
  </>);
}

function ItemsTable({ db, d, showPo }) {
  return (<div className="tw"><table><thead><tr><th>Item</th><th>Qty</th>{showPo && <th>PO rate</th>}<th>Rate</th><th>GST %</th><th>Amount</th></tr></thead>
    <tbody>{d.items.map((l, k) => <tr key={k}><td>{prod(db, l.pid).name}</td><td>{l.qty}</td>{showPo && <td>{money(l.poRate ?? l.rate)}</td>}<td>{money(l.rate)}</td><td>{prod(db, l.pid).gst}%</td><td>{money(l.rate * l.qty)}</td></tr>)}</tbody></table></div>);
}

export default function P2P({ db, setDb, mode = "flow" }) {
  const docs = db.docs || [], pays = db.pays || [], pvar = db.pvar || [];
  const PRs = docs.filter((d) => d.type === "PR"), POs = docs.filter((d) => d.type === "PO");
  const [tab, setTab] = useState("ov"), [m, setM] = useState(null), [view, setView] = useState(null);
  const rows = flowRows(docs);

  const patch = (id, f) => setDb((d) => ({ ...d, docs: d.docs.map((x) => (x.id === id ? { ...x, ...f } : x)) }));
  const txn = (type, ref, desc, amount, date = today()) => ({ id: "t" + Date.now() + Math.random().toString(36).slice(2, 5), date, type, ref, desc, amount, by: "me" });

  /* ---- PR / PO creation ---- */
  const openForm = (k) => db.vendors.length && db.products.length
    ? setM({ k, party: db.vendors[0].id, lines: [{ pid: db.products[0].id, qty: 1, rate: db.products[0].cost }] }) : alert("Add vendors and products first");
  const saveDoc = () => {
    const items = m.lines.map((l) => ({ pid: l.pid, qty: +l.qty, rate: +l.rate }));
    if (items.some((l) => !(l.qty > 0) || !(l.rate >= 0))) return alert("Enter valid quantity and rate");
    const T = m.k === "pr" ? "PR" : "PO";
    setDb((d) => ({ ...d, docs: [{ id: "d" + Date.now(), type: T, no: nextRef(d.docs.filter((x) => x.type === T).map((x) => x.no), T), date: today(), party: m.party, items, status: "Open" }, ...d.docs] }));
    setM(null);
  };
  const toPO = (pr) => setDb((d) => ({ ...d,
    docs: [{ id: "d" + Date.now(), type: "PO", no: nextRef(d.docs.filter((x) => x.type === "PO").map((x) => x.no), "PO"), date: today(), party: pr.party, prId: pr.id, items: pr.items.map((l) => ({ ...l })), status: "Open" },
      ...d.docs.map((x) => (x.id === pr.id ? { ...x, status: "Converted" } : x))] }));
  const cancel = (d) => confirm("Cancel " + d.no + "?") && patch(d.id, { status: "Cancelled" });

  /* ---- MIGO: goods receipt – stock up, moving-average price (MAP) recalculated ---- */
  const postMigo = () => {
    const id = m.d.id, { date, dn } = m;
    setDb((d) => {
      const po = d.docs.find((x) => x.id === id);
      if (!po || po.status !== "Approved") return d;
      const no = nextRef(d.docs.filter((x) => x.migo).map((x) => x.migo.no), "MIGO");
      const products = po.items.reduce((ps, l) => ps.map((p) => {
        if (p.id !== l.pid) return p;
        const q = p.qty + l.qty;
        return { ...p, qty: q, cost: q ? r2((p.cost * p.qty + l.rate * l.qty) / q) : p.cost };
      }), d.products);
      const taxable = docTaxable(po);
      return { ...d, products,
        docs: d.docs.map((x) => (x.id === id ? { ...x, status: "GR posted", migo: { no, date: date || today(), dn: dn.trim(), taxable } } : x)),
        txns: [txn("Goods Receipt", no, "MIGO for " + po.no + " from " + vName(d, po), taxable, date || today()), ...d.txns] };
    });
    setM(null);
  };

  /* ---- MIRO: vendor invoice verification – price variance booked, payable created ---- */
  const postMiro = () => {
    const id = m.d.id, rates = m.rates.map(Number), { vinv, date } = m;
    if (!vinv.trim()) return alert("Enter the vendor's invoice number");
    if (rates.some((x) => !(x >= 0))) return alert("Enter valid rates");
    setDb((d) => {
      const po = d.docs.find((x) => x.id === id);
      if (!po || po.status !== "GR posted") return d;
      const no = nextRef(d.docs.filter((x) => x.miro).map((x) => x.miro.no), "MIRO");
      let products = d.products, pv = 0; const log = [];
      const items = po.items.map((l, k) => {
        const diff = r2((rates[k] - l.rate) * l.qty);
        if (Math.abs(diff) > 0.004) {
          pv += diff;
          const p = products.find((x) => x.id === l.pid) || {}, after = p.qty > 0 ? r2((p.cost * p.qty + diff) / p.qty) : p.cost;
          log.push({ id: "pv" + Date.now() + k, date: date || today(), ref: po.no, vendor: vName(d, po), pid: l.pid, name: p.name, qty: l.qty, poRate: l.rate, actRate: rates[k], mapBefore: p.cost, mapAfter: after, ppv: diff });
          products = products.map((x) => (x.id === l.pid ? { ...x, cost: after } : x));
        }
        return { ...l, poRate: l.rate, rate: rates[k] };
      });
      const inv = { ...po, items }, taxable = docTaxable(inv), tax = docTax(d, inv), total = r2(taxable + tax);
      return { ...d, products, pvar: [...log, ...(d.pvar || [])],
        docs: d.docs.map((x) => (x.id === id ? { ...inv, poTotal: docTotal(d, po), status: "Received", miro: { no, date: date || today(), vinv: vinv.trim(), taxable, tax, total } } : x)),
        txns: [txn("Vendor Invoice", no, "MIRO for " + po.no + " / " + po.migo.no + " – inv " + vinv.trim() + (Math.abs(pv) > 0.004 ? " – price variance " + money(r2(pv)) : ""), total, date || today()), ...d.txns] };
    });
    setM(null);
  };

  /* ---- Payment against an invoiced PO ---- */
  const postPay = () => {
    const id = m.d.id, amt = +m.amount, { date, mode: pm, ref } = m, b = balOf(db, m.d);
    if (!(amt > 0) || amt > b + 0.005) return alert("Enter an amount between 0 and the balance " + money(b));
    setDb((d) => {
      const po = d.docs.find((x) => x.id === id);
      const no = nextRef((d.pays || []).map((x) => x.no || ""), "PAY");
      return { ...d, pays: [{ id: "pay" + Date.now(), no, date: date || today(), kind: "v", party: po.party, doc: id, amount: amt, mode: pm, ref: ref || "" }, ...(d.pays || [])],
        txns: [txn("Payment", no, "Paid to " + vName(d, po) + " against " + po.no, amt, date || today()), ...d.txns] };
    });
    setM(null);
  };

  /* ---- action buttons for the next step of a document ---- */
  const next = (d) => {
    if (d.status === "Cancelled") return <Tag cls="out">Cancelled</Tag>;
    if (d.type === "PR") return (<>
      {d.status === "Open" && <button className="sm p" onClick={() => patch(d.id, { status: "Approved" })}>Approve</button>}
      {d.status === "Approved" && <button className="sm p" onClick={() => toPO(d)}>→ Create PO</button>}
      {d.status === "Converted" && <Tag cls="in">Converted</Tag>}
      {(d.status === "Open" || d.status === "Approved") && <button className="sm d" onClick={() => cancel(d)}>Cancel</button>}</>);
    return (<>
      {d.status === "Open" && <button className="sm p" onClick={() => patch(d.id, { status: "Approved" })}>Approve PO</button>}
      {d.status === "Approved" && <button className="sm p" onClick={() => setM({ k: "migo", d, date: today(), dn: "" })}>MIGO – goods receipt</button>}
      {d.status === "GR posted" && <button className="sm p" onClick={() => setM({ k: "miro", d, vinv: "", date: today(), rates: d.items.map((l) => l.rate) })}>MIRO – vendor invoice</button>}
      {d.status === "Received" && (balOf(db, d) > 0.005 ? <button className="sm p" onClick={() => setM({ k: "pay", d, amount: balOf(db, d), mode: "Bank transfer", ref: "", date: today() })}>Pay vendor</button> : <Tag cls="in">Complete</Tag>)}
      {(d.status === "Open" || d.status === "Approved") && <button className="sm d" onClick={() => cancel(d)}>Cancel</button>}</>);
  };

  /* ---- flow table row ---- */
  const flowRow = (r) => {
    const { pr, po } = r, isR = po && po.status === "Received", fs = flowStatus(db, r), pend = <Tag cls="low">Pending</Tag>;
    return (<tr key={(pr || po).id + (po ? po.id : "")}>
      <td>{pr ? <a style={{ cursor: "pointer", color: "var(--pr)" }} onClick={() => setView(pr)}>{pr.no}</a> : <small className="sub">Direct PO</small>}</td>
      <td>{po ? <a style={{ cursor: "pointer", color: "var(--pr)" }} onClick={() => setView(po)}>{po.no}</a> : pend}</td>
      <td>{r.date}</td><td>{vName(db, po || pr)}</td>
      <td>{po ? (po.migo ? <>{po.migo.no}<small className="sub">{po.migo.date}</small></> : pend) : "—"}</td>
      <td>{po ? (po.miro ? <>{po.miro.no}<small className="sub">Inv {po.miro.vinv} · {po.miro.date}</small></> : pend) : "—"}</td>
      <td>{money(po ? poValue(db, po) : docTotal(db, pr))}</td><td>{isR ? money(po.miro.total) : "—"}</td>
      <td>{po ? money(paidOf(db, po)) : "—"}</td><td>{isR ? money(balOf(db, po)) : "—"}</td><td>{po ? payNos(db, po) : "—"}</td>
      <td><Tag cls={fs[1]}>{fs[0]}</Tag></td></tr>);
  };

  /* ---- CSV export ---- */
  const csv = () => {
    const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const body = rows.map((r) => { const { pr, po } = r, isR = po && po.status === "Received";
      return [pr?.no, po?.no, r.date, vName(db, po || pr), po?.migo?.no, po?.miro ? po.miro.no + " / " + po.miro.vinv : "", po ? poValue(db, po) : docTotal(db, pr), isR ? po.miro.total : "", po ? paidOf(db, po) : "", isR ? balOf(db, po) : "", po ? payNos(db, po) : "", flowStatus(db, r)[0]]; });
    const url = URL.createObjectURL(new Blob([[HEAD, ...body].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "p2p-document-flow.csv" }).click();
    URL.revokeObjectURL(url);
  };

  /* ---- numbers for tabs / overview ---- */
  const prOpen = PRs.filter((d) => d.status === "Open" || d.status === "Approved"), toApp = POs.filter((d) => d.status === "Open"), toGR = POs.filter((d) => d.status === "Approved"),
    toInv = POs.filter((d) => d.status === "GR posted"), unpaid = POs.filter((d) => d.status === "Received" && balOf(db, d) > 0.005);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const tabs = [["ov", "Overview"], ["fl", "Document flow"], ["pr", "Open requisitions (" + rows.filter(SEL.pr).length + ")"], ["po", "POs awaiting receipt (" + rows.filter(SEL.po).length + ")"],
    ["gr", "Received, not invoiced (" + toInv.length + ")"], ["up", "Invoiced, not paid (" + unpaid.length + ")"]];
  const titles = { fl: "Complete document flow – PR → PO → MIGO → MIRO → payment", pr: "Requisitions not yet converted to a purchase order", po: "Purchase orders awaiting approval / goods receipt (MIGO)", gr: "Goods received (MIGO posted) but vendor invoice (MIRO) not posted", up: "Invoiced (MIRO posted) but not fully paid" };

  const dTable = (list, kind) => (
    <Table head={["No", "Date", "Vendor", "Items", kind === "PR" ? "Value (incl. GST)" : "PO value", "Status", "Next step"]}>
      {list.map((d) => <tr key={d.id}><td><a style={{ cursor: "pointer", color: "var(--pr)" }} onClick={() => setView(d)}>{d.no}</a></td><td>{d.date}</td><td>{vName(db, d)}</td>
        <td>{d.items.map((l) => prod(db, l.pid).name + " ×" + l.qty).join(", ")}</td><td>{money(poValue(db, d))}</td>
        <td><Tag cls={d.status === "Cancelled" ? "out" : ["Received", "Converted"].includes(d.status) ? "in" : "low"}>{d.status === "Received" ? "Invoiced (MIRO)" : d.status}</Tag></td><td>{next(d)}</td></tr>)}
    </Table>);

  let body;
  if (mode === "pr") body = dTable(PRs, "PR");
  else if (mode === "po") body = dTable(POs, "PO");
  else if (tab === "ov") {
    const grir = sum(toInv, (d) => d.migo.taxable), pvTot = sum(pvar, (x) => x.ppv);
    body = (<>
      <div className="flowrow">{[["1. Requisitions", prOpen.length, "open / approved"], ["2. PO to approve", toApp.length, "awaiting approval"], ["3. Awaiting MIGO", toGR.length, "approved POs"],
        ["4. MIRO pending", toInv.length, "goods received"], ["5. Awaiting payment", unpaid.length, money(sum(unpaid, (d) => balOf(db, d)))]].map(([a, b, c]) => <div className="card" key={a}><span>{a}</span><b>{b}</b><span>{c}</span></div>)}</div>
      <div className="grid"><Kpi label="Payable to vendors" value={money(db.vendors.reduce((a, v) => a + Math.max(0, vendBal(db, v.id)), 0))} />
        <Kpi label="Goods received, not invoiced (GR/IR)" value={money(grir)} /><Kpi label="Price variance (invoice vs PO)" value={money(r2(pvTot))} />
        <Kpi label="Paid to vendors" value={money(sum(pays.filter((x) => x.kind === "v"), (x) => x.amount))} /></div>
      <h3>Purchase order chain – requisition → PO → MIGO → MIRO → payment</h3>
      <Table head={["PO", "Date", "Vendor", "Requisition", "Approved", "MIGO", "MIRO / vendor invoice", "3-way match", "PO value", "Paid", "Balance", "Next step"]}>
        {POs.map((d) => { const pr = prOfPo(docs, d), isR = d.status === "Received", pv = r2(pvar.filter((x) => x.ref === d.no).reduce((a, x) => a + x.ppv, 0));
          const match = isR ? (Math.abs(pv) < 0.005 ? <Tag cls="in">Match</Tag> : <Tag cls="low">Variance {money(pv)}</Tag>) : d.status === "GR posted" ? <Tag cls="low">MIRO pending</Tag> : "—";
          return (<tr key={d.id}><td><a style={{ cursor: "pointer", color: "var(--pr)" }} onClick={() => setView(d)}>{d.no}</a></td><td>{d.date}</td><td>{vName(db, d)}</td>
            <td>{pr ? <Stp ok label={pr.no} /> : <small className="sub">Direct PO</small>}</td>
            <td><Stp ok={!["Open", "Cancelled"].includes(d.status)} label={d.status === "Open" ? "Pending" : d.status === "Cancelled" ? "Cancelled" : "Approved"} /></td>
            <td>{d.migo ? <Stp ok label={d.migo.no} sub={d.migo.date} /> : <Stp ok={false} label="Pending" />}</td>
            <td>{d.miro ? <Stp ok label={d.miro.no} sub={"Inv " + d.miro.vinv} /> : <Stp ok={false} label="Pending" />}</td><td>{match}</td>
            <td>{money(poValue(db, d))}</td><td>{money(paidOf(db, d))}</td><td>{isR ? money(balOf(db, d)) : "—"}</td><td>{next(d)}</td></tr>); })}
      </Table>
      <h3>Open requisitions</h3>
      {dTable(PRs.filter((d) => d.status === "Open" || d.status === "Approved"), "PR")}
      <h3>Price variance log (MIRO rate vs PO rate)</h3>
      <Table head={["Date", "PO", "Vendor", "Item", "Qty", "PO rate", "Invoice rate", "PPV", "MAP before", "MAP after"]}>
        {pvar.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.ref}</td><td>{x.vendor}</td><td>{x.name}</td><td>{x.qty}</td><td>{money(x.poRate)}</td><td>{money(x.actRate)}</td>
          <td className={x.ppv > 0 ? "out" : "in"}>{money(x.ppv)}</td><td>{money(x.mapBefore)}</td><td>{money(x.mapAfter)}</td></tr>)}
      </Table></>);
  } else body = (<><h3>{titles[tab]}</h3><Table head={HEAD}>{rows.filter((r) => (tab === "fl" ? true : SEL[tab](r, db))).map(flowRow)}</Table></>);

  const title = mode === "pr" ? "Purchase Requisitions" : mode === "po" ? "Purchase Orders" : "Procure-to-Pay (P2P)";
  const vModal = view && (() => { const chain = [view.type === "PO" && prOfPo(docs, view)?.no && "PR " + prOfPo(docs, view).no, view.type === "PR" && poOfPr(docs, view) && "PO " + poOfPr(docs, view).no,
    view.type === "PO" && "PO " + view.no, view.migo && "MIGO " + view.migo.no, view.miro && "MIRO " + view.miro.no, view.type === "PO" && payNos(db, view) !== "—" && payNos(db, view)].filter(Boolean);
    return (<Modal title={(view.type === "PR" ? "Purchase Requisition " : "Purchase Order ") + view.no} onClose={() => setView(null)}>
      <p className="muted">{vName(db, view)} · {view.date} · {view.status === "Received" ? "Invoiced (MIRO)" : view.status}<br />{chain.join(" → ")}</p>
      <ItemsTable db={db} d={view} showPo={!!view.miro} />
      <p style={{ textAlign: "right" }}>Taxable {money(docTaxable(view))}<br />GST {money(docTax(db, view))}<br /><b>Total {money(docTotal(db, view))}</b>
        {view.miro && <><br />Paid {money(paidOf(db, view))} · Balance <b>{money(balOf(db, view))}</b></>}</p>
      {view.migo && <p className="muted">MIGO {view.migo.no} on {view.migo.date}{view.migo.dn && " · challan " + view.migo.dn}</p>}
      {view.miro && <p className="muted">MIRO {view.miro.no} on {view.miro.date} · vendor invoice {view.miro.vinv}</p>}
    </Modal>); })();

  return (<>
    <Head title={title}>
      <button className="p" onClick={() => openForm("pr")}>+ Requisition</button> <button className="p" onClick={() => openForm("po")}>+ Purchase order</button>
    </Head>
    {mode === "flow" && <div className="card tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? "p" : ""} onClick={() => setTab(k)}>{l}</button>)}<div className="sp"><button onClick={csv}>⬇ Document flow CSV</button></div></div>}
    {body}
    {mode === "flow" && <p className="note">Unique number chain: <b>PR-</b> requisition → <b>PO-</b> purchase order (created from the PR) → <b>MIGO-</b> goods receipt (stock and moving-average price update; no vendor liability yet) → <b>MIRO-</b> vendor invoice verification (enter the vendor’s invoice number; price differences vs the PO are booked; vendor payable is created here) → <b>PAY-</b> payment.</p>}

    {m && (m.k === "pr" || m.k === "po") && <Modal title={m.k === "pr" ? "New purchase requisition" : "New purchase order (direct)"} onClose={() => setM(null)} onSave={saveDoc} okText="Create">
      <label>Vendor</label><select value={m.party} onChange={(e) => setM({ ...m, party: e.target.value })}>{db.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <LineEditor db={db} lines={m.lines} setLines={(lines) => setM({ ...m, lines })} />
      <p className="note">{m.k === "pr" ? "A requisition must be approved, then converted to a PO." : "A direct PO has no requisition. It must be approved before goods receipt."}</p>
    </Modal>}

    {m && m.k === "migo" && <Modal title={"MIGO – goods receipt against " + m.d.no} onClose={() => setM(null)} onSave={postMigo} okText="Post MIGO">
      <p className="note">Posts the receipt at the <b>PO rate</b>. Stock goes up and the moving-average price (MAP) is recalculated. No vendor liability is created yet – that happens in <b>MIRO</b>.</p>
      <label>Posting date</label><input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
      <label>Vendor delivery note / challan no.</label><input value={m.dn} onChange={(e) => setM({ ...m, dn: e.target.value })} />
      <ItemsTable db={db} d={m.d} />
    </Modal>}

    {m && m.k === "miro" && <Modal title={"MIRO – vendor invoice for " + m.d.no + " / " + m.d.migo.no} onClose={() => setM(null)} onSave={postMiro} okText="Post MIRO">
      <p className="note">Enter the vendor’s invoice number and the actual invoice rates. A rate different from the PO rate is booked as <b>price variance</b> and the item’s MAP is adjusted. The vendor payable is created at the invoice amount.</p>
      <label>Vendor invoice no.</label><input value={m.vinv} onChange={(e) => setM({ ...m, vinv: e.target.value })} />
      <label>Invoice date</label><input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
      {m.d.items.map((l, k) => (
        <div className="row" key={k} style={{ alignItems: "end" }}>
          <div style={{ flex: 2 }}><label>{prod(db, l.pid).name} × {l.qty}</label>
            <input type="number" min="0" step="0.01" value={m.rates[k]} onChange={(e) => setM({ ...m, rates: m.rates.map((x, j) => (j === k ? e.target.value : x)) })} /></div>
          <div><label>PO rate</label><input value={l.rate} disabled /></div></div>))}
    </Modal>}

    {m && m.k === "pay" && <Modal title={"Pay vendor – " + m.d.no} onClose={() => setM(null)} onSave={postPay} okText="Post payment">
      <p className="muted">{vName(db, m.d)} · Invoice {m.d.miro.vinv} · Total {money(docTotal(db, m.d))} · Balance <b>{money(balOf(db, m.d))}</b></p>
      <label>Amount (₹)</label><input type="number" value={m.amount} onChange={(e) => setM({ ...m, amount: e.target.value })} />
      <label>Date</label><input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
      <label>Mode</label><select value={m.mode} onChange={(e) => setM({ ...m, mode: e.target.value })}>{["Cash", "UPI", "Bank transfer", "Cheque"].map((x) => <option key={x}>{x}</option>)}</select>
      <label>Reference / cheque no.</label><input value={m.ref} onChange={(e) => setM({ ...m, ref: e.target.value })} />
    </Modal>}
    {vModal}
  </>);
}
