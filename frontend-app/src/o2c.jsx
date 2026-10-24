import React, { useState } from "react";
import { Head, Kpi, Table, Tag, Modal, money } from "./ui.jsx";
import { calcInvoice, invDue } from "./pages.jsx";
import { custBal } from "./extra.jsx";

/* =====================================================================
   O2C · Order-to-Cash
   SO (sales order) → DEL (delivery) → PGI (post goods issue, stock leaves)
   → INV (invoice created from the delivery) → RCT (customer receipt)
   Data lives in db.docs (type "SO"), db.dels, db.invoices, db.pays (kind "c").
   ===================================================================== */

const r2 = (x) => Math.round(x * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const nextRef = (list, pre) => pre + "-" + (Math.max(1000, ...list.map((s) => +String(s).split("-")[1] || 0)) + 1);
const prod = (db, id) => db.products.find((p) => p.id === id) || {};
const cName = (db, id) => (db.customers.find((c) => c.id === id) || {}).name || "—";
const soTotal = (db, so) => r2(so.items.reduce((s, l) => s + l.rate * l.qty * (1 + (prod(db, l.pid).gst || 0) / 100), 0));
const invTotal = (db, i) => calcInvoice(i, db).total;
const rcvd = (db, i) => r2(invTotal(db, i) - invDue(db, i));
const age = (d) => Math.floor((Date.now() - new Date(d + "T12:00:00")) / 864e5);
const link = { cursor: "pointer", color: "var(--pr)" };

/* ---------- document-flow rows (one row per SO chain, plus direct invoices) ---------- */
function flowRows(db) {
  const docs = db.docs || [], dels = db.dels || [];
  const rows = docs.filter((d) => d.type === "SO").map((so) => ({ so, dl: dels.find((x) => x.soId === so.id && x.status !== "Cancelled"), inv: db.invoices.find((i) => i.soId === so.id), date: so.date }));
  db.invoices.filter((i) => !i.soId).forEach((inv) => rows.push({ so: null, dl: null, inv, date: inv.date }));
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}
function flowStatus(db, { so, dl, inv }) {
  if (inv) {
    if (dl && dl.status !== "Delivered") return ["Invoiced – delivery " + dl.status.toLowerCase(), "low"];
    return invDue(db, inv) > 0.005 ? ["Invoiced – awaiting payment", "low"] : ["Complete (paid)", "in"];
  }
  if (dl) return !dl.pgi ? ["Delivery created – awaiting PGI", "low"] : dl.status === "Delivered" ? ["Delivered – not invoiced", "out"] : ["Goods issued – not invoiced", "low"];
  if (so.status === "Cancelled") return ["Order cancelled", "out"];
  return ["Open order – nothing delivered / invoiced", "low"];
}
const SEL = {
  os: (r) => r.so && !r.dl && !r.inv && r.so.status !== "Cancelled",
  dn: (r) => r.dl && r.dl.pgi && !r.inv,
  up: (r, db) => r.inv && invDue(db, r.inv) > 0.005,
};
const HEAD = ["Sales order", "Date", "Customer", "Delivery", "PGI", "Delivery status", "Invoice", "Invoice status", "Value", "Received", "Balance", "Flow status"];
const invTag = (db, i) => { const d = invDue(db, i), t = invTotal(db, i); return d <= 0.005 ? <Tag cls="in">Paid</Tag> : d < t - 0.005 ? <Tag cls="low">Part paid</Tag> : <Tag cls="low">Unpaid</Tag>; };
const delTag = (s) => <Tag cls={s === "Delivered" ? "in" : s === "Cancelled" ? "out" : "low"}>{s}</Tag>;

function LineEditor({ db, lines, setLines }) {
  const upd = (i, f) => setLines(lines.map((l, j) => (j === i ? { ...l, ...f } : l)));
  return (<>
    {lines.map((l, i) => (
      <div className="row" key={i} style={{ alignItems: "end" }}>
        <div style={{ flex: 3 }}><label>Item</label>
          <select value={l.pid} onChange={(e) => upd(i, { pid: e.target.value, rate: prod(db, e.target.value).price })}>
            {db.products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock {p.qty} {p.unit})</option>)}</select></div>
        <div><label>Qty</label><input type="number" min="1" value={l.qty} onChange={(e) => upd(i, { qty: e.target.value })} /></div>
        <div><label>Rate (₹)</label><input type="number" min="0" value={l.rate} onChange={(e) => upd(i, { rate: e.target.value })} /></div>
        <button className="sm d" style={{ flex: "0 0 auto" }} onClick={() => lines.length > 1 && setLines(lines.filter((_, j) => j !== i))}>✕</button>
      </div>))}
    <button className="sm" style={{ marginTop: 8 }} onClick={() => setLines([...lines, { pid: db.products[0].id, qty: 1, rate: db.products[0].price }])}>+ Add line</button>
  </>);
}

export default function O2C({ db, setDb, mode = "flow" }) {
  const docs = db.docs || [], dels = db.dels || [], pays = db.pays || [];
  const SOs = docs.filter((d) => d.type === "SO");
  const [tab, setTab] = useState("ov"), [m, setM] = useState(null), [view, setView] = useState(null);
  const rows = flowRows(db);
  const delOf = (so) => dels.find((x) => x.soId === so.id && x.status !== "Cancelled");
  const invOf = (so) => db.invoices.find((i) => i.soId === so.id);

  const patchSO = (id, f) => setDb((d) => ({ ...d, docs: d.docs.map((x) => (x.id === id ? { ...x, ...f } : x)) }));
  const patchDel = (id, f) => setDb((d) => ({ ...d, dels: d.dels.map((x) => (x.id === id ? { ...x, ...f } : x)) }));
  const txn = (type, ref, desc, amount, date = today()) => ({ id: "t" + Date.now() + Math.random().toString(36).slice(2, 5), date, type, ref, desc, amount, by: "me" });

  /* ---- sales order ---- */
  const openSO = () => db.customers.length && db.products.length
    ? setM({ k: "so", party: db.customers[0].id, lines: [{ pid: db.products[0].id, qty: 1, rate: db.products[0].price }] }) : alert("Add customers and products first");
  const saveSO = () => {
    const items = m.lines.map((l) => ({ pid: l.pid, qty: +l.qty, rate: +l.rate }));
    if (items.some((l) => !(l.qty > 0) || !(l.rate >= 0))) return alert("Enter valid quantity and rate");
    setDb((d) => ({ ...d, docs: [{ id: "d" + Date.now(), type: "SO", no: nextRef(d.docs.filter((x) => x.type === "SO").map((x) => x.no), "SO"), date: today(), party: m.party, items, status: "Open" }, ...d.docs] }));
    setM(null);
  };
  const cancelSO = (so) => confirm("Cancel " + so.no + "?") && patchSO(so.id, { status: "Cancelled" });

  /* ---- delivery ---- */
  const createDel = (so) => setDb((d) => ({ ...d,
    dels: [{ id: "dl" + Date.now(), no: nextRef((d.dels || []).map((x) => x.no), "DEL"), soId: so.id, date: today(), cid: so.party, items: so.items.map((l) => ({ ...l })), pgi: null, status: "Pending" }, ...(d.dels || [])],
    docs: d.docs.map((x) => (x.id === so.id ? { ...x, status: "In delivery" } : x)) }));
  const cancelDel = (dl) => {
    if (dl.pgi) return alert("Goods issue already posted – cannot cancel");
    if (!confirm("Cancel " + dl.no + "?")) return;
    setDb((d) => ({ ...d, dels: d.dels.map((x) => (x.id === dl.id ? { ...x, status: "Cancelled" } : x)), docs: d.docs.map((x) => (x.id === dl.soId ? { ...x, status: "Open" } : x)) }));
  };

  /* ---- PGI: stock leaves, units sold go up, cost of goods is recorded ---- */
  const postPGI = (dl) => {
    const need = {}; dl.items.forEach((l) => (need[l.pid] = (need[l.pid] || 0) + l.qty));
    const short = Object.entries(need).map(([pid, q]) => [prod(db, pid), q]).find(([p, q]) => q > p.qty);
    if (short) return alert("Only " + short[0].qty + " " + short[0].unit + " of " + short[0].name + " in stock (need " + short[1] + ")");
    setDb((d) => {
      const cur = d.dels.find((x) => x.id === dl.id); if (!cur || cur.pgi) return d;
      const no = nextRef(d.dels.filter((x) => x.pgi).map((x) => x.pgi.no), "PGI");
      const cogs = r2(cur.items.reduce((s, l) => s + (d.products.find((p) => p.id === l.pid) || {}).cost * l.qty, 0));
      const so = d.docs.find((x) => x.id === cur.soId);
      return { ...d,
        products: cur.items.reduce((ps, l) => ps.map((p) => (p.id === l.pid ? { ...p, qty: p.qty - l.qty, sold: p.sold + l.qty } : p)), d.products),
        dels: d.dels.map((x) => (x.id === dl.id ? { ...x, pgi: { no, date: today(), cogs } } : x)),
        docs: d.docs.map((x) => (x.id === cur.soId && x.status === "In delivery" ? { ...x, status: "Issued" } : x)),
        txns: [txn("Delivery", no, "Goods issue for " + cur.no + (so ? " / " + so.no : ""), r2(cur.items.reduce((s, l) => s + l.rate * l.qty, 0))), ...d.txns] };
    });
  };

  /* ---- invoice from delivery (no second stock movement – PGI already issued the goods) ---- */
  const invoiceFromDel = (so) => {
    const dl = delOf(so);
    if (!dl || !dl.pgi) return alert("Post goods issue before invoicing");
    setDb((d) => {
      if (d.invoices.some((i) => i.soId === so.id)) return d;
      const no = nextRef(d.invoices.map((i) => i.no), "INV");
      const inv = { id: "i" + Date.now(), no, date: today(), cid: so.party, pay: "Unpaid", items: dl.items.map((l) => ({ pid: l.pid, qty: l.qty })), soId: so.id, delId: dl.id };
      return { ...d, invoices: [inv, ...d.invoices],
        docs: d.docs.map((x) => (x.id === so.id ? { ...x, status: "Billed", invId: inv.id } : x)),
        txns: [txn("Sale", no, "Invoice to " + cName(d, so.party) + " (from " + dl.no + ")", calcInvoice(inv, d).total), ...d.txns] };
    });
  };

  /* ---- receipt against an invoice ---- */
  const postRcpt = () => {
    const inv = m.inv, amt = +m.amount, due = invDue(db, inv);
    if (!(amt > 0) || amt > due + 0.005) return alert("Enter an amount between 0 and the balance " + money(due));
    setDb((d) => {
      const rcts = (d.pays || []).filter((x) => /^RCT-/.test(x.no || "")).map((x) => x.no);
      const n = nextRef(rcts, "RCT"), left = r2(due - amt);
      return { ...d, pays: [{ id: "rc" + Date.now(), no: n, date: m.date || today(), kind: "c", party: inv.cid, doc: inv.id, amount: amt, mode: m.mode, ref: m.ref || "" }, ...(d.pays || [])],
        invoices: d.invoices.map((i) => (i.id === inv.id && left <= 0.005 ? { ...i, pay: "Paid" } : i)),
        txns: [txn("Receipt", n, "Received from " + cName(d, inv.cid) + " against " + inv.no, amt, m.date || today()), ...d.txns] };
    });
    setM(null);
  };
  const receive = (inv) => setM({ k: "rcpt", inv, amount: invDue(db, inv), mode: "UPI", ref: "", date: today() });

  /* ---- buttons for the next step ---- */
  const soNext = (so) => {
    if (so.status === "Cancelled") return <Tag cls="out">Cancelled</Tag>;
    const dl = delOf(so), inv = invOf(so), due = inv ? invDue(db, inv) : 0;
    const b = [];
    if (!dl && !inv) b.push(<button key="d" className="sm p" onClick={() => createDel(so)}>Create delivery</button>);
    if (dl && !dl.pgi) b.push(<button key="g" className="sm p" onClick={() => postPGI(dl)}>Post goods issue</button>);
    if (dl && dl.pgi && !inv) b.push(<button key="i" className="sm p" onClick={() => invoiceFromDel(so)}>Create invoice</button>);
    if (dl && dl.pgi && dl.status === "Pending") b.push(<button key="s" className="sm" onClick={() => patchDel(dl.id, { status: "Dispatched" })}>Dispatch</button>);
    if (dl && dl.pgi && ["Pending", "Dispatched"].includes(dl.status)) b.push(<button key="v" className="sm" onClick={() => patchDel(dl.id, { status: "Delivered", date: today() })}>Delivered</button>);
    if (inv && due > 0.005) b.push(<button key="r" className="sm p" onClick={() => receive(inv)}>Receive payment</button>);
    if (so.status === "Open" && !dl) b.push(<button key="c" className="sm d" onClick={() => cancelSO(so)}>Cancel</button>);
    return b.length ? <>{b}</> : <Tag cls="in">Complete</Tag>;
  };

  const flowRow = (r) => {
    const { so, dl, inv } = r, fs = flowStatus(db, r), val = inv ? invTotal(db, inv) : so ? soTotal(db, so) : 0, pend = <Tag cls="low">Pending</Tag>;
    return (<tr key={(so || inv).id}>
      <td>{so ? <a style={link} onClick={() => setView(so)}>{so.no}</a> : <small className="sub">Direct invoice</small>}</td><td>{r.date}</td><td>{cName(db, so ? so.party : inv.cid)}</td>
      <td>{dl ? dl.no : "—"}</td><td>{dl ? (dl.pgi ? <><Tag cls="in">{dl.pgi.no}</Tag></> : pend) : "—"}</td><td>{dl ? delTag(dl.status) : "—"}</td>
      <td>{inv ? inv.no : "—"}</td><td>{inv ? invTag(db, inv) : "—"}</td>
      <td>{money(val)}</td><td>{inv ? money(rcvd(db, inv)) : "—"}</td><td>{inv ? money(invDue(db, inv)) : "—"}</td><td><Tag cls={fs[1]}>{fs[0]}</Tag></td></tr>);
  };

  const csv = () => {
    const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const body = rows.map((r) => { const { so, dl, inv } = r; return [so?.no, r.date, cName(db, so ? so.party : inv.cid), dl?.no, dl?.pgi?.no || (dl ? "Pending" : ""), dl?.status, inv?.no, inv ? (invDue(db, inv) <= 0.005 ? "Paid" : "Unpaid") : "", inv ? invTotal(db, inv) : so ? soTotal(db, so) : 0, inv ? rcvd(db, inv) : "", inv ? invDue(db, inv) : "", flowStatus(db, r)[0]]; });
    const url = URL.createObjectURL(new Blob([[HEAD, ...body].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "o2c-document-flow.csv" }).click(); URL.revokeObjectURL(url);
  };

  /* ---- numbers ---- */
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const openInv = db.invoices.filter((i) => invDue(db, i) > 0.005), awaitPGI = dels.filter((x) => !x.pgi && x.status !== "Cancelled");
  const tabs = [["ov", "Overview"], ["fl", "Document flow"], ["os", "Open sales orders (" + rows.filter(SEL.os).length + ")"], ["dn", "Issued, not invoiced (" + rows.filter(SEL.dn).length + ")"], ["up", "Invoiced, not paid (" + openInv.length + ")"]];
  const titles = { fl: "Complete document flow – sales order → delivery → PGI → invoice → payment", os: "Open sales orders (no delivery, no invoice)", dn: "Goods issued but not invoiced", up: "Invoiced but not fully paid" };

  const soTable = (
    <Table head={["SO", "Date", "Customer", "Items", "Order value", "Delivery", "PGI", "Invoice", "Status", "Next step"]}>
      {SOs.map((so) => { const dl = delOf(so), inv = invOf(so); return (
        <tr key={so.id}><td><a style={link} onClick={() => setView(so)}>{so.no}</a></td><td>{so.date}</td><td>{cName(db, so.party)}</td>
          <td>{so.items.map((l) => prod(db, l.pid).name + " ×" + l.qty).join(", ")}</td><td>{money(soTotal(db, so))}</td>
          <td>{dl ? dl.no : "—"}</td><td>{dl?.pgi ? dl.pgi.no : dl ? "Pending" : "—"}</td><td>{inv ? inv.no : "—"}</td>
          <td><Tag cls={so.status === "Cancelled" ? "out" : so.status === "Billed" ? "in" : "low"}>{so.status}</Tag></td><td>{soNext(so)}</td></tr>); })}
    </Table>);

  let body;
  if (mode === "so") body = soTable;
  else if (mode === "del") body = (
    <Table head={["Delivery", "Date", "Sales order", "Customer", "Items", "PGI (goods issue)", "Status", "Actions"]}>
      {dels.map((dl) => { const so = docs.find((x) => x.id === dl.soId), live = dl.status !== "Cancelled"; return (
        <tr key={dl.id}><td>{dl.no}</td><td>{dl.date}</td><td>{so ? so.no : "—"}</td><td>{cName(db, dl.cid)}</td><td>{dl.items.map((l) => prod(db, l.pid).name + " ×" + l.qty).join(", ")}</td>
          <td>{dl.pgi ? <Tag cls="in">{dl.pgi.no}</Tag> : <Tag cls="low">Pending</Tag>}</td><td>{delTag(dl.status)}</td>
          <td>{live && !dl.pgi && <><button className="sm p" onClick={() => postPGI(dl)}>Post goods issue</button><button className="sm d" onClick={() => cancelDel(dl)}>Cancel</button></>}
            {live && dl.pgi && dl.status === "Pending" && <button className="sm" onClick={() => patchDel(dl.id, { status: "Dispatched" })}>Dispatch</button>}
            {live && dl.pgi && ["Pending", "Dispatched"].includes(dl.status) && <button className="sm" onClick={() => patchDel(dl.id, { status: "Delivered", date: today() })}>Delivered</button>}</td></tr>); })}
    </Table>);
  else if (tab === "ov") {
    const buckets = (c) => { const b = [0, 0, 0, 0]; openInv.filter((i) => i.cid === c.id).forEach((i) => { const a = age(i.date); b[a <= 30 ? 0 : a <= 60 ? 1 : a <= 90 ? 2 : 3] += invDue(db, i); }); return b; };
    body = (<>
      <div className="flowrow">{[["1. Open sales orders", rows.filter(SEL.os).length, "no delivery yet"], ["2. Awaiting goods issue", awaitPGI.length, "deliveries without PGI"],
        ["3. Issued, not invoiced", rows.filter(SEL.dn).length, "goods out, no invoice"], ["4. Awaiting cash", openInv.length, money(sum(openInv, (i) => invDue(db, i)))]].map(([a, b, c]) => <div className="card" key={a}><span>{a}</span><b>{b}</b><span>{c}</span></div>)}</div>
      <div className="grid"><Kpi label="Receivable (customers owe)" value={money(db.customers.reduce((a, c) => a + Math.max(0, custBal(db, c.id)), 0))} />
        <Kpi label="Customer advances held" value={money(db.customers.reduce((a, c) => a + Math.max(0, -custBal(db, c.id)), 0))} />
        <Kpi label="Received from customers" value={money(sum(pays.filter((x) => x.kind === "c"), (x) => x.amount))} />
        <Kpi label="Sales orders billed" value={SOs.filter((d) => d.status === "Billed").length} /></div>
      <h3>Sales order chain – order → delivery → goods issue → invoice → cash</h3>{soTable}
      <h3>Invoices awaiting payment</h3>
      <Table head={["Invoice", "Date", "Order / delivery", "Customer", "Total", "Received", "Due", "Age (days)", "Action"]}>
        {openInv.map((i) => { const so = docs.find((x) => x.id === i.soId), dl = dels.find((x) => x.id === i.delId); return (
          <tr key={i.id}><td>{i.no}</td><td>{i.date}</td><td>{so ? so.no : "Direct"}{dl ? " → " + dl.no : ""}</td><td>{cName(db, i.cid)}</td><td>{money(invTotal(db, i))}</td><td>{money(rcvd(db, i))}</td><td>{money(invDue(db, i))}</td>
            <td className={age(i.date) > 60 ? "out" : age(i.date) > 30 ? "low" : ""}>{age(i.date)}</td><td><button className="sm p" onClick={() => receive(i)}>Receive</button></td></tr>); })}
      </Table>
      <h3>Receivables ageing</h3>
      <Table head={["Customer", "0–30 days", "31–60 days", "61–90 days", "Over 90", "Total due"]}>
        {db.customers.map((c) => { const b = buckets(c), t = sum(b, (x) => x); return t > 0.005 ? (
          <tr key={c.id}><td>{c.name}</td>{b.map((x, k) => <td key={k}>{x ? money(r2(x)) : "—"}</td>)}<td><b>{money(r2(t))}</b></td></tr>) : null; })}
      </Table></>);
  } else body = (<><h3>{titles[tab]}</h3><Table head={HEAD}>{rows.filter((r) => (tab === "fl" ? true : SEL[tab](r, db))).map(flowRow)}</Table></>);

  const title = mode === "so" ? "Sales Orders" : mode === "del" ? "Deliveries" : "Order-to-Cash (O2C)";
  const vModal = view && (() => { const dl = delOf(view), inv = invOf(view), rc = inv ? pays.filter((x) => x.doc === inv.id).map((x) => x.no) : [];
    const chain = ["SO " + view.no, dl && dl.no, dl?.pgi && dl.pgi.no, inv && inv.no, ...rc].filter(Boolean);
    return (<Modal title={"Sales Order " + view.no} onClose={() => setView(null)}>
      <p className="muted">{cName(db, view.party)} · {view.date} · {view.status}<br />{chain.join(" → ")}</p>
      <div className="tw"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>GST %</th><th>Amount</th></tr></thead>
        <tbody>{view.items.map((l, k) => <tr key={k}><td>{prod(db, l.pid).name}</td><td>{l.qty}</td><td>{money(l.rate)}</td><td>{prod(db, l.pid).gst}%</td><td>{money(l.rate * l.qty)}</td></tr>)}</tbody></table></div>
      <p style={{ textAlign: "right" }}><b>Order total {money(soTotal(db, view))}</b>{inv && <><br />Invoice {inv.no}: {money(invTotal(db, inv))} · Received {money(rcvd(db, inv))} · Balance <b>{money(invDue(db, inv))}</b></>}</p>
      {dl?.pgi && <p className="muted">Goods issue {dl.pgi.no} on {dl.pgi.date} · cost of goods {money(dl.pgi.cogs)}</p>}
    </Modal>); })();

  return (<>
    <Head title={title}><button className="p" onClick={openSO}>+ Sales order</button></Head>
    {mode === "flow" && <div className="card tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? "p" : ""} onClick={() => setTab(k)}>{l}</button>)}<div className="sp"><button onClick={csv}>⬇ Document flow CSV</button></div></div>}
    {body}
    {mode === "flow" && <p className="note">Unique number chain: <b>SO-</b> sales order → <b>DEL-</b> delivery → <b>PGI-</b> goods issue (stock leaves here, units sold increase) → <b>INV-</b> invoice (created from the delivery, so stock is not reduced twice) → <b>RCT-</b> customer receipt (part payments allowed; the invoice turns Paid when the balance reaches zero). Counter sales can still be billed directly from the Invoices page.</p>}

    {m && m.k === "so" && <Modal title="New sales order" onClose={() => setM(null)} onSave={saveSO} okText="Create">
      <label>Customer</label><select value={m.party} onChange={(e) => setM({ ...m, party: e.target.value })}>{db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <LineEditor db={db} lines={m.lines} setLines={(lines) => setM({ ...m, lines })} />
      <p className="note">Stock is checked when goods issue (PGI) is posted. The invoice is priced from the current product price and GST.</p>
    </Modal>}
    {m && m.k === "rcpt" && <Modal title={"Receive payment – " + m.inv.no} onClose={() => setM(null)} onSave={postRcpt} okText="Post receipt">
      <p className="muted">{cName(db, m.inv.cid)} · Total {money(invTotal(db, m.inv))} · Balance <b>{money(invDue(db, m.inv))}</b></p>
      <label>Amount (₹)</label><input type="number" value={m.amount} onChange={(e) => setM({ ...m, amount: e.target.value })} />
      <label>Date</label><input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
      <label>Mode</label><select value={m.mode} onChange={(e) => setM({ ...m, mode: e.target.value })}>{["Cash", "UPI", "Bank transfer", "Cheque"].map((x) => <option key={x}>{x}</option>)}</select>
      <label>Reference / cheque no.</label><input value={m.ref} onChange={(e) => setM({ ...m, ref: e.target.value })} />
    </Modal>}
    {vModal}
  </>);
}
