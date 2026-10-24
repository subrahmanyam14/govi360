import React, { useState } from "react";
import { Head, Kpi, Table, Tag, Modal, money } from "./ui.jsx";
import { calcInvoice, invDue } from "./pages.jsx";
const r2 = (x) => Math.round(x * 100) / 100, today = () => new Date().toISOString().slice(0, 10);
const docTotal = (d, db) => r2(d.items.reduce((s, l) => { const p = db.products.find((x) => x.id === l.pid) || {}; return s + l.rate * l.qty * (1 + (p.gst || 0) / 100); }, 0));
export const custBal = (db, id) => r2(db.invoices.filter((i) => i.cid === id).reduce((s, i) => s + invDue(db, i), 0)
  - (db.pays || []).filter((x) => x.kind === "c" && x.party === id && !x.doc).reduce((s, x) => s + x.amount, 0)
  - (db.docs || []).filter((d) => d.type === "CN" && d.party === id).reduce((s, d) => s + docTotal(d, db), 0));
export const vendBal = (db, id) => r2((db.docs || []).filter((d) => d.type === "PO" && d.status === "Received" && d.party === id).reduce((s, d) => s + docTotal(d, db), 0)
  - (db.pays || []).filter((x) => x.kind === "v" && x.party === id).reduce((s, x) => s + x.amount, 0)
  - (db.docs || []).filter((d) => d.type === "DN" && d.party === id).reduce((s, d) => s + docTotal(d, db), 0));

export function Payments({ db, setDb }) {
  const [f, setF] = useState(null), pays = db.pays || [];
  const list = f && (f.kind === "c" ? db.customers : db.vendors);
  const bal = (id) => (f.kind === "c" ? custBal(db, id) : vendBal(db, id));
  const save = () => {
    if (!(+f.amount > 0)) return alert("Enter a valid amount");
    const x = { id: "pay" + Date.now(), date: today(), kind: f.kind, party: f.party, amount: +f.amount, mode: f.mode, ref: f.ref || "" };
    const nm = list.find((y) => y.id === f.party)?.name;
    setDb((d) => ({ ...d, pays: [x, ...(d.pays || [])], txns: [{ id: "t" + Date.now(), date: x.date, type: f.kind === "c" ? "Receipt" : "Payment", ref: x.ref || "—", desc: (f.kind === "c" ? "Received from " : "Paid to ") + nm, amount: x.amount, by: "me" }, ...d.txns] }));
    setF(null);
  };
  const open = (kind) => { const l = kind === "c" ? db.customers : db.vendors; l.length ? setF({ kind, party: l[0].id, amount: "", mode: "Cash", ref: "" }) : alert("Add a party first"); };
  const nm = (x) => ((x.kind === "c" ? db.customers : db.vendors).find((y) => y.id === x.party) || {}).name;
  return (<>
    <Head title="Payments"><button className="p" onClick={() => open("c")}>+ Customer receipt</button> <button onClick={() => open("v")}>+ Vendor payment</button></Head>
    <div className="grid"><Kpi label="Receivable" value={money(db.customers.reduce((s, c) => s + Math.max(0, custBal(db, c.id)), 0))} /><Kpi label="Payable" value={money(db.vendors.reduce((s, v) => s + Math.max(0, vendBal(db, v.id)), 0))} /></div>
    <Table head={["Date", "Type", "Party", "Mode", "Ref", "Amount"]}>
      {pays.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.kind === "c" ? "Receipt" : "Payment"}</td><td>{nm(x)}</td><td>{x.mode}</td><td>{x.ref}</td><td>{money(x.amount)}</td></tr>)}
    </Table>
    {f && <Modal title={f.kind === "c" ? "Customer receipt" : "Vendor payment"} onClose={() => setF(null)} onSave={save}>
      <label>{f.kind === "c" ? "Customer" : "Vendor"}</label>
      <select value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })}>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <p className="muted">Outstanding: {money(bal(f.party))}</p>
      <label>Amount (₹)</label><input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
      <label>Mode</label><select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{["Cash", "UPI", "Bank transfer", "Cheque"].map((m) => <option key={m}>{m}</option>)}</select>
      <label>Reference / cheque no.</label><input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} />
    </Modal>}
  </>);
}

export function Moves({ db }) {
  const rows = db.txns.filter((t) => ["Sale", "Purchase", "Delivery", "Goods Receipt", "Credit Note", "Debit Note", "Opening"].includes(t.type));
  return (<><Head title="Stock Movements" />
    <Table head={["Date", "Type", "Ref", "Description", "By"]}>{rows.map((t) => <tr key={t.id}><td>{t.date}</td><td>{t.type}</td><td>{t.ref}</td><td>{t.desc}</td><td>{t.by}</td></tr>)}</Table></>);
}

export function Reports({ db }) {
  const m = {};
  const add = (date, k, v) => { const key = date.slice(0, 7); (m[key] = m[key] || { o: 0, i: 0 })[k] += v; };
  db.invoices.forEach((i) => add(i.date, "o", calcInvoice(i, db).tax));
  (db.docs || []).filter((d) => d.type === "PO" && d.status === "Received").forEach((d) => add(d.date, "i", d.items.reduce((s, l) => s + l.rate * l.qty * ((db.products.find((p) => p.id === l.pid) || {}).gst || 0) / 100, 0)));
  const rows = Object.entries(m).sort().reverse();
  return (<><Head title="Reports" />
    <h3>GST summary (monthly)</h3>
    <Table head={["Month", "Output GST", "Input GST", "Net payable"]}>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{money(r2(v.o))}</td><td>{money(r2(v.i))}</td><td>{money(r2(v.o - v.i))}</td></tr>)}</Table>
    <h3>Customer outstanding</h3>
    <Table head={["Customer", "Balance"]}>{db.customers.map((c) => <tr key={c.id}><td>{c.name}</td><td>{money(custBal(db, c.id))}</td></tr>)}</Table>
    <h3>Vendor outstanding</h3>
    <Table head={["Vendor", "Balance"]}>{db.vendors.map((v) => <tr key={v.id}><td>{v.name}</td><td>{money(vendBal(db, v.id))}</td></tr>)}</Table></>);
}
