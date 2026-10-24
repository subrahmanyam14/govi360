import React, { useState } from "react";
import { Head, Kpi, Table, Tag, Modal, money } from "./ui.jsx";
import { calcInvoice } from "./pages.jsx";
const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10); };

const CFG = {
  jobs: { title: "Tailoring Jobs", item: "Garment / job", st: ["Received", "Cutting", "Stitching", "Ready", "Delivered"], amt: true },
  exch: { title: "Exchanges", item: "Item exchanged", st: ["Requested", "Approved", "Replaced"], amt: true },
  repairs: { title: "Repairs", item: "Item to repair", st: ["Received", "In repair", "Repaired", "Returned"], amt: true },
  rtf: { title: "Factory Returns", item: "Item sent to factory", st: ["Raised", "Sent to factory", "Received back", "Credited"], amt: true, vendor: true },
  warranty: { title: "Warranty Desk", item: "Serial / issue", st: ["Open", "Sent to factory", "Replaced", "Rejected"], warranty: true },
};

export function Tickets({ db, setDb, kind }) {
  const c = CFG[kind], [f, setF] = useState(null), rows = (db.tix || {})[kind] || [];
  const list = c.vendor ? db.vendors : db.customers;
  const put = (fn) => setDb((d) => ({ ...d, tix: { ...(d.tix || {}), [kind]: fn((d.tix || {})[kind] || []) } }));
  const nm = (r) => (list.find((x) => x.id === r.party) || {}).name || "—";
  const save = () => {
    if (!f.item.trim() && !c.warranty) return alert("Enter " + c.item.toLowerCase());
    const p = db.products.find((x) => x.id === f.pid);
    const r = { id: "k" + Date.now(), no: kind.toUpperCase() + "-" + (1001 + rows.length), date: today(), party: f.party, item: f.item, note: f.note, amount: +f.amount || 0, status: c.st[0], pid: f.pid, serial: f.serial, expiry: c.warranty && p ? addMonths(f.bought, p.warranty || 0) : "" };
    put((a) => [r, ...a]); setF(null);
  };
  const next = (r) => {
    const i = c.st.indexOf(r.status), s = c.st[i + 1];
    put((a) => a.map((x) => (x.id === r.id ? { ...x, status: s } : x)));
    if (s === "Delivered" || s === "Returned" || s === "Credited") setDb((d) => ({ ...d, txns: [{ id: "t" + Date.now(), date: today(), type: c.title, ref: r.no, desc: c.title + " " + r.no + " – " + s, amount: r.amount, by: "me" }, ...d.txns] }));
  };
  const last = c.st[c.st.length - 1];
  return (<>
    <Head title={c.title}><button className="p" onClick={() => list.length ? setF({ party: list[0].id, item: "", note: "", amount: "", pid: db.products[0]?.id, serial: "", bought: today() }) : alert("Add a customer/vendor first")}>+ New</button></Head>
    <Table head={["No", "Date", c.vendor ? "Vendor" : "Customer", c.item, ...(c.warranty ? ["Warranty till"] : ["Amount"]), "Status", "Actions"]}>
      {rows.map((r) => <tr key={r.id}><td>{r.no}</td><td>{r.date}</td><td>{nm(r)}</td><td>{c.warranty ? (db.products.find((p) => p.id === r.pid) || {}).name + " · " + r.serial : r.item}</td>
        <td>{c.warranty ? r.expiry || "—" : money(r.amount)}</td><td><Tag cls={r.status === last ? "in" : r.status === "Rejected" ? "out" : "low"}>{r.status}</Tag></td>
        <td>{r.status !== last && r.status !== "Rejected" && !(c.warranty && r.status === "Replaced") && <button className="sm" onClick={() => next(r)}>→ {c.st[c.st.indexOf(r.status) + 1]}</button>}
          {c.warranty && r.status === "Open" && <button className="sm d" onClick={() => put((a) => a.map((x) => (x.id === r.id ? { ...x, status: "Rejected" } : x)))}>Reject</button>}
          <button className="sm d" onClick={() => confirm("Delete?") && put((a) => a.filter((x) => x.id !== r.id))}>Delete</button></td></tr>)}
    </Table>
    {f && <Modal title={"New – " + c.title} onClose={() => setF(null)} onSave={save}>
      <label>{c.vendor ? "Vendor" : "Customer"}</label><select value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })}>{list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      {c.warranty && <><label>Product</label><select value={f.pid} onChange={(e) => setF({ ...f, pid: e.target.value })}>{db.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.warranty} mo)</option>)}</select>
        <label>Purchase date</label><input type="date" value={f.bought} onChange={(e) => setF({ ...f, bought: e.target.value })} /></>}
      <label>{c.warranty ? "Serial no." : c.item}</label><input value={c.warranty ? f.serial : f.item} onChange={(e) => setF({ ...f, [c.warranty ? "serial" : "item"]: e.target.value })} />
      {c.amt && <><label>Amount (₹)</label><input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></>}
      <label>Notes</label><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
    </Modal>}
  </>);
}

export function Reminders({ db }) {
  const rows = ((db.tix || {}).warranty || []).filter((r) => r.expiry).map((r) => ({ ...r, days: Math.ceil((new Date(r.expiry) - new Date()) / 864e5) })).sort((a, b) => a.days - b.days);
  return (<><Head title="⏰ Warranty Reminders" />
    <Table head={["No", "Product", "Serial", "Expires", "Days left", "Status"]}>
      {rows.map((r) => <tr key={r.id}><td>{r.no}</td><td>{(db.products.find((p) => p.id === r.pid) || {}).name}</td><td>{r.serial}</td><td>{r.expiry}</td><td>{r.days}</td>
        <td><Tag cls={r.days < 0 ? "out" : r.days <= 30 ? "low" : "in"}>{r.days < 0 ? "Expired" : r.days <= 30 ? "Expiring soon" : "Active"}</Tag></td></tr>)}
    </Table></>);
}

export function Deliveries({ db }) {
  const rows = (db.docs || []).filter((d) => d.type === "SO" && ["Approved", "Delivered"].includes(d.status));
  return (<><Head title="Deliveries" />
    <Table head={["Order", "Date", "Customer", "Items", "Delivery status"]}>
      {rows.map((d) => <tr key={d.id}><td>{d.no}</td><td>{d.date}</td><td>{(db.customers.find((c) => c.id === d.party) || {}).name}</td><td>{d.items.length}</td>
        <td><Tag cls={d.status === "Delivered" ? "in" : "low"}>{d.status === "Delivered" ? "Delivered" : "Pending"}</Tag></td></tr>)}
    </Table><p className="muted">Mark orders as delivered from Sales Orders (stock is reduced then).</p></>);
}

export function Bank({ db, setDb }) {
  const [f, setF] = useState(null), rows = db.cheques || [];
  const save = () => {
    if (!(+f.amount > 0) || !f.no) return alert("Enter cheque no. and amount");
    setDb((d) => ({ ...d, cheques: [{ id: "q" + Date.now(), date: today(), ...f, amount: +f.amount, status: "Pending" }, ...(d.cheques || [])] })); setF(null);
  };
  const set = (id, status) => setDb((d) => ({ ...d, cheques: d.cheques.map((x) => (x.id === id ? { ...x, status } : x)) }));
  return (<><Head title="Bank & Cheques"><button className="p" onClick={() => setF({ no: "", party: "", amount: "", dir: "Received" })}>+ Add cheque</button></Head>
    <Table head={["Date", "Cheque no.", "Party", "Direction", "Amount", "Status", "Actions"]}>
      {rows.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.no}</td><td>{x.party}</td><td>{x.dir}</td><td>{money(x.amount)}</td>
        <td><Tag cls={x.status === "Cleared" ? "in" : x.status === "Bounced" ? "out" : "low"}>{x.status}</Tag></td>
        <td>{x.status === "Pending" && <><button className="sm" onClick={() => set(x.id, "Cleared")}>Clear</button><button className="sm d" onClick={() => set(x.id, "Bounced")}>Bounce</button></>}</td></tr>)}
    </Table>
    {f && <Modal title="Add cheque" onClose={() => setF(null)} onSave={save}>
      <label>Cheque no.</label><input value={f.no} onChange={(e) => setF({ ...f, no: e.target.value })} />
      <label>Party</label><input value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} />
      <label>Direction</label><select value={f.dir} onChange={(e) => setF({ ...f, dir: e.target.value })}><option>Received</option><option>Issued</option></select>
      <label>Amount (₹)</label><input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
    </Modal>}</>);
}

export function PVar({ db }) {
  return (<><Head title="Price Variance" />
    <Table head={["Product", "Selling price", "Avg cost", "Margin ₹", "Margin %", "Last PO rate", "Variance vs cost"]}>
      {db.products.map((p) => { const po = (db.docs || []).filter((d) => d.type === "PO" && d.status === "Received").flatMap((d) => d.items).filter((l) => l.pid === p.id).pop(), m = p.price - p.cost;
        return <tr key={p.id}><td>{p.name}</td><td>{money(p.price)}</td><td>{money(p.cost)}</td><td>{money(m)}</td><td>{p.price ? Math.round((m / p.price) * 100) : 0}%</td><td>{po ? money(po.rate) : "—"}</td><td>{po ? money(po.rate - p.cost) : "—"}</td></tr>; })}
    </Table></>);
}

export function Flow({ db, kind }) {
  const docs = db.docs || [], n = (t, s) => docs.filter((d) => d.type === t && (!s || d.status === s)).length, pays = db.pays || [];
  const steps = {
    p2p: ["Purchase Requisition", "Purchase Order", "Goods receipt", "Vendor payment", [n("PR"), n("PO"), n("PO", "Received"), pays.filter((x) => x.kind === "v").length]],
    o2c: ["Sales Order", "Delivery", "Invoice", "Customer receipt", [n("SO"), n("SO", "Delivered"), db.invoices.length, pays.filter((x) => x.kind === "c").length]],
  };
  if (kind === "r2r") {
    const by = {}; db.txns.forEach((t) => (by[t.type] = (by[t.type] || 0) + t.amount));
    return (<><Head title="R2R · Record-to-Report" />
      <div className="grid">{Object.entries(by).map(([k, v]) => <Kpi key={k} label={k} value={money(v)} />)}</div>
      <Table head={["Records", "Count"]}>{[["Invoices", db.invoices.length], ["Documents", docs.length], ["Payments", pays.length], ["Transactions", db.txns.length]].map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</Table></>);
  }
  const s = steps[kind], cnt = s[4];
  return (<><Head title={kind === "p2p" ? "P2P · Procure-to-Pay" : "O2C · Order-to-Cash"} />
    <div className="grid">{[0, 1, 2, 3].map((i) => <Kpi key={i} label={(i + 1) + ". " + s[i]} value={cnt[i]} />)}</div></>);
}
