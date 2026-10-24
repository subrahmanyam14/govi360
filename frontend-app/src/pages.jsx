import React, { useState } from "react";
import { Head, Kpi, Table, Tag, Modal, Field, money, stockStatus } from "./ui.jsx";

const r2 = (x) => Math.round(x * 100) / 100;
export function calcInvoice(inv, db) {
  const cust = db.customers.find((c) => c.id === inv.cid) || {};
  const intra = (cust.state || db.company.state) === db.company.state;
  let taxable = 0, tax = 0;
  const lines = inv.items.map((l) => {
    const p = db.products.find((x) => x.id === l.pid) || {};
    const amt = p.price * l.qty, gst = (amt * (p.gst || 0)) / 100;
    taxable += amt; tax += gst;
    return { ...l, name: p.name, price: p.price, amt, gstPct: p.gst, gst };
  });
  return { cust, intra, lines, taxable: r2(taxable), tax: r2(tax), total: r2(taxable + tax) };
}

export const invDue = (db, i) => (i.pay === "Paid" ? 0 : r2(calcInvoice(i, db).total - (db.pays || []).filter((x) => x.kind === "c" && x.doc === i.id).reduce((s, x) => s + x.amount, 0)));

export function Dashboard({ db, go }) {
  const inv = db.invoices.map((i) => calcInvoice(i, db));
  const rev = inv.reduce((s, i) => s + i.total, 0);
  const due = db.invoices.reduce((s, i) => s + invDue(db, i), 0);
  const val = db.products.reduce((s, p) => s + p.qty * p.cost, 0);
  const lowCnt = db.products.filter((p) => stockStatus(p)[1] !== "in").length;
  return (<>
    <Head title="Dashboard" />
    <div className="grid">
      <Kpi label="Total sales" value={money(rev)} />
      <Kpi label="Receivable (customers owe)" value={money(due)} />
      <Kpi label="Units available" value={db.products.reduce((s, p) => s + p.qty, 0)} />
      <Kpi label="Units sold" value={db.products.reduce((s, p) => s + p.sold, 0)} />
      <Kpi label="Stock value" value={money(val)} />
      <Kpi label="Customers" value={db.customers.length} />
      <Kpi label="Invoices" value={db.invoices.length} />
      <Kpi label="Out / low stock" value={lowCnt} />
    </div>
    <h3>Recent transactions</h3>
    <Transactions db={db} limit={6} bare />
  </>);
}

export function Products({ db, setDb }) {
  const [q, setQ] = useState(""), [edit, setEdit] = useState(null);
  const rows = db.products.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase()));
  const save = () => {
    const f = { ...edit, price: +edit.price, qty: +edit.qty, min: +edit.min, gst: +edit.gst, cost: +edit.cost || +edit.price, warranty: +edit.warranty || 0 };
    if (!f.name || f.price < 0 || f.qty < 0) return alert("Enter valid name, price and quantity");
    setDb((d) => ({ ...d, products: f.id ? d.products.map((p) => (p.id === f.id ? f : p)) : [...d.products, { ...f, id: "p" + Date.now(), sold: 0 }] }));
    setEdit(null);
  };
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (<>
    <Head title="Products"><button className="p" onClick={() => setEdit({ name: "", sku: "", price: "", qty: 0, min: 10, hsn: "", gst: 18, cost: "", cat: "General", unit: "pcs", warranty: 0 })}>+ Add product</button></Head>
    <div className="card"><input placeholder="Search by description or material code…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <Table head={["Material code", "Description", "Category", "Price", "Avg cost", "HSN", "GST %", "Warranty", "Qty", "Status", "Actions"]}>
      {rows.map((p) => { const s = stockStatus(p); return (
        <tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{p.cat}</td><td>{money(p.price)}</td><td>{money(p.cost)}</td><td>{p.hsn}</td><td>{p.gst}%</td>
          <td>{p.warranty > 0 ? p.warranty + " mo" : "—"}</td><td>{p.qty} {p.unit}</td><td><Tag cls={s[1]}>{s[0]}</Tag></td>
          <td><button className="sm" onClick={() => setEdit(p)}>Edit</button>
            <button className="sm d" onClick={() => confirm("Delete " + p.name + "?") && setDb((d) => ({ ...d, products: d.products.filter((x) => x.id !== p.id) }))}>Delete</button></td></tr>); })}
    </Table>
    {edit && <Modal title={edit.id ? "Edit product" : "Add product"} onClose={() => setEdit(null)} onSave={save}>
      <Field label="Name" value={edit.name} onChange={set("name")} />
      <Field label="SKU / material code" value={edit.sku} onChange={set("sku")} />
      <div className="row"><Field label="Price (₹)" type="number" value={edit.price} onChange={set("price")} /><Field label="Quantity" type="number" value={edit.qty} onChange={set("qty")} /><Field label="Min level" type="number" value={edit.min} onChange={set("min")} /></div>
      <div className="row"><Field label="HSN" value={edit.hsn} onChange={set("hsn")} /><Field label="GST %" type="number" value={edit.gst} onChange={set("gst")} /><Field label="Cost (₹)" type="number" value={edit.cost} onChange={set("cost")} /></div>
      <div className="row"><div><label>Category</label><select value={edit.cat} onChange={set("cat")}>{["Fans", "Electronics", "Fabric", "Spares", "Accessories", "General"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label>Unit</label><select value={edit.unit} onChange={set("unit")}>{["pcs", "mtr", "set", "kg"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <Field label="Warranty (months)" type="number" value={edit.warranty} onChange={set("warranty")} /></div>
    </Modal>}
  </>);
}

export function Stock({ db }) {
  const t = db.products.reduce((a, p) => ({ q: a.q + p.qty, s: a.s + p.sold }), { q: 0, s: 0 });
  return (<>
    <Head title="Stock Report" />
    <div className="grid"><Kpi label="Total available" value={t.q} /><Kpi label="Total sold" value={t.s} /></div>
    <Table head={["Product", "Available", "Sold", "Sold %", "Stock value", "Status"]}>
      {db.products.map((p) => { const s = stockStatus(p), tot = p.qty + p.sold; return (
        <tr key={p.id}><td>{p.name}</td><td>{p.qty}</td><td>{p.sold}</td><td>{tot ? Math.round((p.sold / tot) * 100) : 0}%</td><td>{money(p.qty * p.cost)}</td><td><Tag cls={s[1]}>{s[0]}</Tag></td></tr>); })}
    </Table>
  </>);
}

function Party({ db, setDb, kind }) {
  const isC = kind === "customers", [edit, setEdit] = useState(null);
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  const gk = isC ? "gstin" : "gst";
  const billed = (id) => db.invoices.reduce((s, i) => s + (i.cid === id ? calcInvoice(i, db).total : 0), 0);
  const save = () => {
    if (!edit.name) return alert("Name is required");
    setDb((d) => ({ ...d, [kind]: edit.id ? d[kind].map((x) => (x.id === edit.id ? edit : x)) : [...d[kind], { ...edit, id: Date.now() + "" }] }));
    setEdit(null);
  };
  const blank = { name: "", phone: "", email: "", address: "", state: db.company.state, [gk]: "" };
  return (<>
    <Head title={isC ? "Customers" : "Vendors"}><button className="p" onClick={() => setEdit(blank)}>+ Add {isC ? "customer" : "vendor"}</button></Head>
    <Table head={["Name", "Phone", "Email", "Address", "State", "GSTIN", isC ? "Billed" : "Purchased", "Actions"]}>
      {db[kind].map((x) => (
        <tr key={x.id}><td>{x.name}</td><td>{x.phone}</td><td>{x.email}</td><td>{x.address}</td><td>{x.state}</td><td>{x[gk]}</td><td>{isC ? money(billed(x.id)) : "—"}</td>
          <td><button className="sm" onClick={() => setEdit(x)}>Edit</button>
            <button className="sm d" onClick={() => confirm("Delete " + x.name + "?") && setDb((d) => ({ ...d, [kind]: d[kind].filter((y) => y.id !== x.id) }))}>Delete</button></td></tr>))}
    </Table>
    {edit && <Modal title={(edit.id ? "Edit " : "Add ") + (isC ? "customer" : "vendor")} onClose={() => setEdit(null)} onSave={save}>
      <Field label="Name" value={edit.name} onChange={set("name")} /><Field label="Phone" value={edit.phone} onChange={set("phone")} />
      <Field label="Email" value={edit.email} onChange={set("email")} /><Field label="Address" value={edit.address} onChange={set("address")} />
      <div className="row"><Field label="State" value={edit.state} onChange={set("state")} /><Field label="GSTIN" value={edit[gk]} onChange={set(gk)} /></div>
    </Modal>}
  </>);
}
export const Customers = (p) => <Party {...p} kind="customers" />;
export const Vendors = (p) => <Party {...p} kind="vendors" />;

const today = () => new Date().toISOString().slice(0, 10);
const nextNo = (arr, pre, base) => pre + "-" + (Math.max(base, ...arr.map((x) => +String(x.no).split("-")[1] || 0)) + 1);

function LineEditor({ db, lines, setLines, useCost }) {
  const upd = (i, k, v) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (<>
    {lines.map((l, i) => (
      <div className="row" key={i} style={{ alignItems: "end" }}>
        <div style={{ flex: 3 }}><label>Item</label>
          <select value={l.pid} onChange={(e) => upd(i, "pid", e.target.value)}>
            {db.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.qty} {p.unit})</option>)}</select></div>
        <div><label>Qty</label><input type="number" min="1" value={l.qty} onChange={(e) => upd(i, "qty", e.target.value)} /></div>
        {useCost && <div><label>Rate</label><input type="number" min="0" value={l.rate ?? ""} placeholder="cost" onChange={(e) => upd(i, "rate", e.target.value)} /></div>}
        <button className="sm d" style={{ flex: "0 0 auto" }} onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>
      </div>))}
    <button className="sm" style={{ marginTop: 8 }} onClick={() => setLines([...lines, { pid: db.products[0]?.id, qty: 1 }])}>+ Add line</button>
  </>);
}
const cleanLines = (db, lines, useCost) => lines.map((l) => { const p = db.products.find((x) => x.id === l.pid); return { pid: l.pid, qty: +l.qty, rate: useCost ? +l.rate || p.cost : p.price }; });
const stockShort = (db, lines) => lines.map((l) => ({ p: db.products.find((x) => x.id === l.pid), q: l.qty })).find((x) => !(x.q > 0) || x.q > x.p.qty);

export function Invoices({ db, setDb }) {
  const [view, setView] = useState(null), [form, setForm] = useState(null);
  const v = view && calcInvoice(view, db);
  const create = () => {
    const items = cleanLines(db, form.lines);
    const bad = stockShort(db, items);
    if (bad) return alert(bad.q > 0 ? "Only " + bad.p.qty + " of " + bad.p.name + " in stock" : "Enter valid quantity");
    const inv = { id: "i" + Date.now(), no: nextNo(db.invoices, "INV", 1000), date: today(), cid: form.cid, pay: form.pay, items: items.map(({ pid, qty }) => ({ pid, qty })) };
    const c = calcInvoice(inv, db);
    setDb((d) => ({ ...d, invoices: [inv, ...d.invoices],
      products: d.products.map((p) => { const l = items.find((x) => x.pid === p.id); return l ? { ...p, qty: p.qty - l.qty, sold: p.sold + l.qty } : p; }),
      txns: [{ id: "t" + Date.now(), date: inv.date, type: "Sale", ref: inv.no, desc: "Invoice to " + c.cust.name, amount: c.total, by: "me" }, ...d.txns] }));
    setForm(null);
  };
  const toggle = (i) => setDb((d) => ({ ...d, invoices: d.invoices.map((x) => (x.id === i.id ? { ...x, pay: x.pay === "Paid" ? "Unpaid" : "Paid" } : x)) }));
  return (<>
    <Head title="Invoices"><button className="p" onClick={() => db.products.length && db.customers.length ? setForm({ cid: db.customers[0].id, pay: "Unpaid", lines: [{ pid: db.products[0].id, qty: 1 }] }) : alert("Add products and customers first")}>+ New invoice</button></Head>
    <Table head={["No", "Date", "Customer", "Supply", "Taxable", "CGST", "SGST", "IGST", "Total GST", "Total", "Payment", "Actions"]}>
      {db.invoices.map((i) => { const c = calcInvoice(i, db), h = r2(c.tax / 2); return (
        <tr key={i.id}><td>{i.no}</td><td>{i.date}</td><td>{c.cust.name}</td><td>{c.intra ? "Intra-state" : "Inter-state"}</td><td>{money(c.taxable)}</td>
          <td>{c.intra ? money(h) : "—"}</td><td>{c.intra ? money(h) : "—"}</td><td>{c.intra ? "—" : money(c.tax)}</td><td>{money(c.tax)}</td><td>{money(c.total)}</td>
          <td><Tag cls={i.pay === "Paid" ? "in" : "low"}>{i.pay}</Tag></td><td><button className="sm" onClick={() => setView(i)}>View</button><button className="sm" onClick={() => toggle(i)}>{i.pay === "Paid" ? "Mark unpaid" : "Mark paid"}</button></td></tr>); })}
    </Table>
    {form && <Modal title="New invoice" onClose={() => setForm(null)} onSave={create} okText="Create">
      <label>Customer</label><select value={form.cid} onChange={(e) => setForm({ ...form, cid: e.target.value })}>{db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label>Payment</label><select value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })}><option>Unpaid</option><option>Paid</option></select>
      <LineEditor db={db} lines={form.lines} setLines={(lines) => setForm({ ...form, lines })} />
    </Modal>}
    {view && <Modal title={"Tax Invoice " + view.no} onClose={() => setView(null)}>
      <p className="muted">{db.company.name} · GSTIN {db.company.gstin}<br />Bill to: <b>{v.cust.name}</b>, {v.cust.address} · {view.date}</p>
      <div className="tw"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>GST %</th><th>Amount</th></tr></thead>
        <tbody>{v.lines.map((l, k) => <tr key={k}><td>{l.name}</td><td>{l.qty}</td><td>{money(l.price)}</td><td>{l.gstPct}%</td><td>{money(l.amt)}</td></tr>)}</tbody></table></div>
      <p style={{ textAlign: "right" }}>Taxable {money(v.taxable)}<br />{v.intra ? "CGST + SGST" : "IGST"} {money(v.tax)}<br /><b>Total {money(v.total)}</b></p>
    </Modal>}
  </>);
}

const DOC = { so: ["SO", "Sales Order", "customers", "Deliver"], pr: ["PR", "Purchase Requisition", "vendors", null], po: ["PO", "Purchase Order", "vendors", "Receive"], cn: ["CN", "Credit Note", "customers", null], dn: ["DN", "Debit Note", "vendors", null] };
export function DocPage({ db, setDb, kind }) {
  const [T, title, pk, act] = DOC[kind], isSO = kind === "so", isN = kind === "cn" || kind === "dn", cust = pk === "customers", [form, setForm] = useState(null), [view, setView] = useState(null);
  const docs = (db.docs || []).filter((d) => d.type === T);
  const total = (d) => r2(d.items.reduce((s, l) => { const p = db.products.find((x) => x.id === l.pid) || {}; return s + l.rate * l.qty * (1 + (p.gst || 0) / 100); }, 0));
  const party = (d) => (db[pk].find((x) => x.id === d.party) || {}).name || "—";
  const patch = (id, f) => setDb((d) => ({ ...d, docs: d.docs.map((x) => (x.id === id ? { ...x, ...f } : x)) }));
  const create = () => {
    const items = cleanLines(db, form.lines, !cust);
    if (items.some((l) => !(l.qty > 0))) return alert("Enter valid quantity");
    if (isSO && stockShort(db, items)) return alert("Insufficient stock for this order");
    if (kind === "dn" && form.stk && stockShort(db, items)) return alert("Insufficient stock to return");
    const doc = { id: "d" + Date.now(), type: T, no: nextNo(db.docs || [], T, 1000), date: today(), party: form.party, items, status: isN ? "Posted" : "Open", stk: !!form.stk };
    const sg = kind === "cn" ? 1 : -1, amt = total(doc);
    setDb((d) => ({ ...d, docs: [doc, ...(d.docs || [])],
      products: isN && form.stk ? d.products.map((p) => { const l = items.find((i) => i.pid === p.id); return l ? { ...p, qty: p.qty + sg * l.qty } : p; }) : d.products,
      txns: isN ? [{ id: "t" + Date.now(), date: doc.date, type: title, ref: doc.no, desc: title + " " + doc.no, amount: kind === "cn" ? -amt : amt, by: "me" }, ...d.txns] : d.txns }));
    setForm(null);
  };
  const run = (d) => {
    const sign = isSO ? -1 : 1, amt = total(d);
    setDb((x) => ({ ...x, docs: x.docs.map((y) => (y.id === d.id ? { ...y, status: isSO ? "Delivered" : "Received" } : y)),
      products: x.products.map((p) => { const l = d.items.find((i) => i.pid === p.id); return l ? { ...p, qty: p.qty + sign * l.qty, sold: isSO ? p.sold + l.qty : p.sold, cost: !isSO ? Math.round((p.cost * p.qty + l.rate * l.qty) / (p.qty + l.qty)) : p.cost } : p; }),
      txns: [{ id: "t" + Date.now(), date: today(), type: isSO ? "Delivery" : "Purchase", ref: d.no, desc: title + " " + d.no, amount: amt, by: "me" }, ...x.txns] }));
  };
  const done = (d) => ["Delivered", "Received", "Cancelled", "Posted"].includes(d.status);
  return (<>
    <Head title={title + "s"}><button className="p" onClick={() => db[pk].length && db.products.length ? setForm({ party: db[pk][0].id, lines: [{ pid: db.products[0].id, qty: 1 }], stk: false }) : alert("Add products and parties first")}>+ New {title}</button></Head>
    <Table head={["No", "Date", cust ? "Customer" : "Vendor", "Items", "Total (incl. GST)", "Status", "Actions"]}>
      {docs.map((d) => <tr key={d.id}><td>{d.no}</td><td>{d.date}</td><td>{party(d)}</td><td>{d.items.length}</td><td>{money(total(d))}</td>
        <td><Tag cls={done(d) ? (d.status === "Cancelled" ? "out" : "in") : "low"}>{d.status}</Tag></td>
        <td><button className="sm" onClick={() => setView(d)}>View</button>
          {d.status === "Open" && !isN && <button className="sm" onClick={() => patch(d.id, { status: "Approved" })}>Approve</button>}
          {act && d.status === "Approved" && <button className="sm" onClick={() => run(d)}>{act}</button>}
          {!done(d) && !isN && <button className="sm d" onClick={() => patch(d.id, { status: "Cancelled" })}>Cancel</button>}</td></tr>)}
    </Table>
    {form && <Modal title={"New " + title} onClose={() => setForm(null)} onSave={create} okText="Create">
      <label>{isSO ? "Customer" : "Vendor"}</label><select value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}>{db[pk].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <LineEditor db={db} lines={form.lines} setLines={(lines) => setForm({ ...form, lines })} useCost={!cust} />
      {isN && <label><input type="checkbox" style={{ width: "auto" }} checked={form.stk} onChange={(e) => setForm({ ...form, stk: e.target.checked })} /> {kind === "cn" ? " Goods returned – add back to stock" : " Return goods to vendor – reduce stock"}</label>}
    </Modal>}
    {view && <Modal title={title + " " + view.no} onClose={() => setView(null)}>
      <p className="muted">{party(view)} · {view.date} · {view.status}</p>
      <div className="tw"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th></tr></thead><tbody>{view.items.map((l, k) => <tr key={k}><td>{(db.products.find((p) => p.id === l.pid) || {}).name}</td><td>{l.qty}</td><td>{money(l.rate)}</td></tr>)}</tbody></table></div>
      <p style={{ textAlign: "right" }}><b>Total {money(total(view))}</b></p>
    </Modal>}
  </>);
}

export function Transactions({ db, limit, bare }) {
  const rows = db.txns.slice(0, limit);
  return (<>
    {!bare && <Head title="Transactions" />}
    <Table head={["Date", "Type", "Ref", "Description", "Amount", "By"]}>
      {rows.map((t) => <tr key={t.id}><td>{t.date}</td><td>{t.type}</td><td>{t.ref}</td><td>{t.desc}</td><td>{money(t.amount)}</td><td>{t.by}</td></tr>)}
    </Table>
  </>);
}

export function Users({ db }) {
  return (<>
    <Head title="Users" />
    <div className="card muted">Admin – everything · Sales – customers, invoices, reports · Store – products, stock · Purchase – vendors, purchase orders</div>
    <Table head={["Username", "Name", "Role"]}>
      {db.users.map((u) => <tr key={u.id}><td>{u.username}</td><td>{u.name}</td><td><Tag cls="low">{u.role}</Tag></td></tr>)}
    </Table>
  </>);
}

export const Soon = ({ title }) => (<><Head title={title} /><div className="card muted">This module is not ported yet – it will be added in the next step.</div></>);
