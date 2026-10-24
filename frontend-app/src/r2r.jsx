import React, { useState } from "react";
import { Head, Kpi, Table, Tag, Modal, money } from "./ui.jsx";
import { calcInvoice, invDue } from "./pages.jsx";
import { custBal, vendBal } from "./extra.jsx";

/* =====================================================================
   R2R · Record-to-Report
   A general ledger derived automatically from every document in the app
   (invoices, PGI, MIGO / MIRO, credit / debit notes, receipts, payments,
   payroll & expense vouchers). Nothing is posted twice and nothing is typed in twice.
   ===================================================================== */

const r2 = (x) => Math.round(x * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const SUM = (a, f) => a.reduce((s, x) => s + f(x), 0);
const nextRef = (list, pre) => pre + "-" + (Math.max(1000, ...list.map((s) => +String(s).split("-")[1] || 0)) + 1);
const prod = (db, id) => db.products.find((p) => p.id === id) || {};
const cName = (db, id) => (db.customers.find((c) => c.id === id) || {}).name || "—";
const vNm = (db, id) => (db.vendors.find((v) => v.id === id) || {}).name || "—";
const link = { cursor: "pointer", color: "var(--pr)" };

/* chart of accounts: type A asset · L liability · E equity · I income · R sales return (contra) · C cost of goods · X expense */
const COA = {
  "Cash in hand": ["A", 1010], "Bank / UPI": ["A", 1020], "Accounts receivable": ["A", 1100], "Inventory": ["A", 1200], "Input GST": ["A", 1300],
  "Accounts payable": ["L", 2100], "GR/IR clearing": ["L", 2150], "Output GST": ["L", 2200], "Expenses payable": ["L", 2300], "Opening balance equity": ["E", 3000],
  "Sales": ["I", 4000], "Sales returns": ["R", 4510], "Cost of goods sold": ["C", 5000],
  "Salaries expense": ["X", 6400], "Wages expense": ["X", 6410], "Bonus expense": ["X", 6420], "Rent expense": ["X", 6500], "Daily & office expenses": ["X", 6600],
};
const EXPA = ["Salaries expense", "Wages expense", "Bonus expense", "Rent expense", "Daily & office expenses"];
const EXPACC = { Salary: "Salaries expense", Wages: "Wages expense", Bonus: "Bonus expense", Rent: "Rent expense", "Daily expense": "Daily & office expenses" };
const EXPCAT = Object.keys(EXPACC), EXPM = ["Cash", "UPI", "Bank transfer", "Cheque", "Unpaid"];
const cashAcct = (m) => (m === "Cash" ? "Cash in hand" : "Bank / UPI");

/* totals of a PR/PO/CN/DN style document (items carry rate + qty) */
const dTax = (db, d) => r2(SUM(d.items, (l) => (l.rate * l.qty * (prod(db, l.pid).gst || 0)) / 100));
const dTaxable = (d) => r2(SUM(d.items, (l) => l.rate * l.qty));

function glBuild(db) {
  const E = [], docs = db.docs || [], pays = db.pays || [], dels = db.dels || [], exps = db.exps || [];
  const add = (date, ref, src, narr, lines) => {
    const L = lines.filter((l) => Math.abs(l[1] || 0) + Math.abs(l[2] || 0) > 0.004).map((l) => ({ a: l[0], dr: r2(l[1] || 0), cr: r2(l[2] || 0) }));
    if (L.length) E.push({ date, ref, src, narr, L });
  };
  const cost = (items) => r2(SUM(items, (l) => (prod(db, l.pid).cost || 0) * l.qty));

  db.invoices.forEach((i) => {
    const c = calcInvoice(i, db), cg = i.delId ? 0 : cost(i.items); // invoices created from a delivery take COGS at PGI
    add(i.date, i.no, "Sales invoice", "Invoice – " + cName(db, i.cid) + (i.soId ? " · " + ((docs.find((x) => x.id === i.soId) || {}).no || "") : ""),
      [["Accounts receivable", c.total], ["Sales", 0, c.taxable], ["Output GST", 0, c.tax], ["Cost of goods sold", cg], ["Inventory", 0, cg]]);
    if (i.pay === "Paid") { // invoice marked paid without a full set of receipts
      const rem = r2(c.total - SUM(pays.filter((x) => x.kind === "c" && x.doc === i.id), (x) => x.amount));
      if (rem > 0.004) add(i.date, i.no, "Invoice settled", "Marked paid – " + cName(db, i.cid), [["Cash in hand", rem], ["Accounts receivable", 0, rem]]);
    }
  });
  dels.forEach((dl) => { if (dl.pgi && dl.pgi.cogs > 0) add(dl.pgi.date, dl.pgi.no, "Goods issue (PGI)", "PGI " + dl.no, [["Cost of goods sold", dl.pgi.cogs], ["Inventory", 0, dl.pgi.cogs]]); });
  docs.forEach((d) => {
    const tax = dTax(db, d), tx = dTaxable(d), tot = r2(tx + tax);
    if (d.type === "CN") { const c = d.stk ? cost(d.items) : 0; add(d.date, d.no, "Credit note", "Credit note – " + cName(db, d.party), [["Sales returns", tx], ["Output GST", tax], ["Accounts receivable", 0, tot], ["Inventory", c], ["Cost of goods sold", 0, c]]); }
    else if (d.type === "DN") add(d.date, d.no, "Debit note", "Debit note – " + vNm(db, d.party), [["Accounts payable", tot], ["Inventory", 0, tx], ["Input GST", 0, tax]]);
    else if (d.type === "PO" && d.migo) {
      const m = d.migo;
      add(m.date, m.no, "Goods receipt (MIGO)", "MIGO " + d.no + " – " + vNm(db, d.party), [["Inventory", m.taxable], ["GR/IR clearing", 0, m.taxable]]);
      if (d.miro) { const q = d.miro, v = r2(q.taxable - m.taxable);
        add(q.date, q.no, "Vendor invoice (MIRO)", "MIRO " + d.no + " / " + m.no + " – " + vNm(db, d.party) + " – inv " + q.vinv,
          [["GR/IR clearing", m.taxable], v >= 0 ? ["Inventory", v] : ["Inventory", 0, -v], ["Input GST", q.tax], ["Accounts payable", 0, q.total]]); }
    }
  });
  pays.forEach((p) => {
    const ca = cashAcct(p.mode), who = (p.kind === "c" ? cName(db, p.party) : vNm(db, p.party));
    if (p.kind === "c") add(p.date, p.no, "Receipt", who, [[ca, p.amount], ["Accounts receivable", 0, p.amount]]);
    else add(p.date, p.no, "Vendor payment", who, [["Accounts payable", p.amount], [ca, 0, p.amount]]);
  });
  exps.forEach((e) => {
    const acct = EXPACC[e.cat] || "Daily & office expenses", nar = e.cat + " – " + e.desc + (e.period ? " (" + e.period + ")" : "");
    if (e.mode === "Unpaid") {
      add(e.date, e.no, "Payroll / expense", nar, [[acct, e.amount], ["Expenses payable", 0, e.amount]]);
      if (e.status === "Paid") add(e.pdate || e.date, e.no, "Expense payment", nar, [["Expenses payable", e.amount], [cashAcct(e.pmode), 0, e.amount]]);
    } else add(e.date, e.no, "Payroll / expense", nar, [[acct, e.amount], [cashAcct(e.mode), 0, e.amount]]);
  });
  // balancing entry: opening stock and manual stock edits have no purchase document
  const sv = r2(SUM(db.products, (p) => p.qty * p.cost)), ib = r2(SUM(E.flatMap((e) => e.L).filter((l) => l.a === "Inventory"), (l) => l.dr - l.cr)), pl = r2(sv - ib);
  add("0000-00-00", "OPENING", "Balancing entry", "Stock brought forward & manual stock adjustments", [["Inventory", Math.max(pl, 0), Math.max(-pl, 0)], ["Opening balance equity", Math.max(-pl, 0), Math.max(pl, 0)]]);
  E.plug = pl; E.sv = sv; E.ib = ib;
  return E;
}
function glSum(E, from, to) {
  const A = {}; Object.keys(COA).forEach((k) => (A[k] = { a: k, t: COA[k][0], code: COA[k][1], open: 0, dr: 0, cr: 0 }));
  E.forEach((e) => e.L.forEach((l) => { const x = A[l.a]; if (from && e.date < from) x.open += l.dr - l.cr; else if (!to || e.date <= to) { x.dr += l.dr; x.cr += l.cr; } }));
  return Object.values(A).sort((a, b) => a.code - b.code).map((x) => ({ ...x, open: r2(x.open), dr: r2(x.dr), cr: r2(x.cr), close: r2(x.open + x.dr - x.cr) }));
}
const act = (S, a) => { const x = S.find((r) => r.a === a); return x ? r2(x.dr - x.cr) : 0; };
const drc = (x) => (Math.abs(x) < 0.005 ? "—" : x > 0 ? money(x) + " Dr" : money(-x) + " Cr");
function plCalc(S) {
  const sales = -act(S, "Sales"), ret = act(S, "Sales returns"), net = r2(sales - ret), cg = act(S, "Cost of goods sold"), gp = r2(net - cg), ex = EXPA.map((a) => [a, act(S, a)]);
  return { sales, ret, net, cg, gp, ex, np: r2(gp - SUM(ex, (x) => x[1])) };
}
function download(name, rows) {
  const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click(); URL.revokeObjectURL(url);
}
const Rw = (a, b, bold = false, key) => (<tr key={key}><td>{bold ? <b>{a}</b> : a}</td><td className="r">{bold ? <b>{money(b)}</b> : money(b)}</td></tr>);

export default function R2R({ db, setDb, go }) {
  const [tab, setTab] = useState("tb"), [from, setFrom] = useState(""), [to, setTo] = useState(""), [m, setM] = useState(null);
  const exps = db.exps || [], emps = db.emps || [], docs = db.docs || [], dels = db.dels || [], pays = db.pays || [];
  const E = glBuild(db), S = glSum(E, from, to), P = plCalc(S);
  const inR = (d) => (!from || d >= from) && (!to || d <= to);
  const empName = (id) => (emps.find((x) => x.id === id) || {}).name || "";
  const txn = (type, ref, desc, amount, date) => ({ id: "t" + Date.now() + Math.random().toString(36).slice(2, 5), date, type, ref, desc, amount, by: "me" });

  /* ---- payroll & expense vouchers ---- */
  const calcAmt = (f) => { const e = emps.find((x) => x.id === f.emp); if (!e) return f.amount; if (f.cat === "Salary") return e.base; if (f.cat === "Wages") return e.base * (+f.days || 0); return f.amount; };
  const setExp = (patch) => setM((f) => { const n = { ...f, ...patch }; if ("cat" in patch || "emp" in patch || "days" in patch) { n.amount = calcAmt(n); if ((n.cat === "Salary" || n.cat === "Wages" || n.cat === "Bonus") && !n.emp) n.emp = emps[0]?.id || ""; if (!["Salary", "Wages", "Bonus"].includes(n.cat)) n.emp = ""; } return n; });
  const openExp = (cat) => { const f = { k: "exp", cat, emp: "", period: today().slice(0, 7), days: 26, desc: "", amount: "", mode: "Cash", date: today() }; setM(f); if (["Salary", "Wages", "Bonus"].includes(cat)) { f.emp = emps[0]?.id || ""; f.amount = calcAmt(f); setM({ ...f }); } };
  const saveExp = () => {
    const amt = +m.amount, emp = emps.find((x) => x.id === m.emp), pay = ["Salary", "Wages", "Bonus"].includes(m.cat);
    if (!(amt > 0)) return alert("Enter a valid amount");
    if (pay && !emp) return alert("Add an employee first");
    if (!pay && !m.desc.trim()) return alert("Enter a description");
    if (pay && m.cat !== "Bonus" && exps.some((e) => e.emp === emp.id && e.cat === m.cat && e.period === m.period && (m.cat === "Salary" || e.date === m.date)) && !confirm(emp.name + " already has a " + m.cat + " voucher for " + m.period + ". Add another?")) return;
    const unpaid = m.mode === "Unpaid";
    setDb((d) => {
      const no = nextRef((d.exps || []).map((x) => x.no), "EXP");
      const e = { id: "x" + Date.now(), no, date: m.date, cat: m.cat, emp: pay ? emp.id : "", period: pay || m.cat === "Rent" ? m.period : "", days: m.cat === "Wages" ? +m.days || 0 : 0, desc: m.desc.trim() || (emp ? emp.name : m.cat), amount: amt, mode: m.mode, status: unpaid ? "Payable" : "Paid", pdate: unpaid ? "" : m.date, pmode: unpaid ? "" : m.mode };
      return { ...d, exps: [e, ...(d.exps || [])], txns: [txn("Expense", no, e.cat + ": " + e.desc + (unpaid ? " (payable)" : ""), amt, m.date), ...d.txns] };
    });
    setM(null);
  };
  const payExp = () => {
    const e = m.e;
    setDb((d) => ({ ...d, exps: d.exps.map((x) => (x.id === e.id ? { ...x, status: "Paid", pdate: m.date, pmode: m.mode } : x)), txns: [txn("Expense", e.no, "Paid by " + m.mode + " – " + e.desc, e.amount, m.date), ...d.txns] }));
    setM(null);
  };
  const delExp = (e) => confirm("Delete voucher " + e.no + "? Its ledger entries are removed.") && setDb((d) => ({ ...d, exps: d.exps.filter((x) => x.id !== e.id) }));
  const saveEmp = () => {
    if (!m.name.trim() || m.base === "" || !(+m.base >= 0)) return alert("Enter name and pay rate");
    const e = { id: m.id || "e" + Date.now(), name: m.name.trim(), role: m.role, type: m.type, base: +m.base };
    setDb((d) => ({ ...d, emps: m.id ? d.emps.map((x) => (x.id === m.id ? e : x)) : [...(d.emps || []), e] }));
    setM(null);
  };
  const delEmp = (e) => { if (exps.some((x) => x.emp === e.id)) return alert("Employee has vouchers – cannot delete"); confirm("Delete employee?") && setDb((d) => ({ ...d, emps: d.emps.filter((x) => x.id !== e.id) })); };

  /* ---- tabs ---- */
  const tabs = [["tb", "Trial balance"], ["pl", "Profit & loss"], ["bs", "Balance sheet"], ["jr", "Journal"], ["rc", "Reconciliation"], ["ip", "Invoice processes"], ["ex", "Payroll & expenses"], ["cl", "Period close"]];
  let body;

  if (tab === "tb") {
    const rows = S.filter((x) => x.open || x.dr || x.cr), tD = SUM(rows, (x) => x.dr), tC = SUM(rows, (x) => x.cr), cl = r2(SUM(rows, (x) => x.close));
    body = (<Table head={["Code", "Account", "Opening", "Period debit", "Period credit", "Closing"]}>
      {rows.map((x) => <tr key={x.a}><td>{x.code}</td><td>{x.a}</td><td>{drc(x.open)}</td><td>{x.dr ? money(x.dr) : "—"}</td><td>{x.cr ? money(x.cr) : "—"}</td><td><b>{drc(x.close)}</b></td></tr>)}
      <tr><td></td><td><b>Total</b></td><td></td><td><b>{money(r2(tD))}</b></td><td><b>{money(r2(tC))}</b></td><td>{Math.abs(cl) < 0.01 ? <Tag cls="in">✔ Books balanced</Tag> : <Tag cls="out">Out by {money(cl)}</Tag>}</td></tr>
    </Table>);
  } else if (tab === "pl") {
    body = (<Table head={["Profit & loss" + (from || to ? " – " + (from || "start") + " to " + (to || "today") : ""), "Amount"]}>
      {Rw("Sales (gross)", P.sales)}{Rw("Less: sales returns", -P.ret)}{Rw("Net sales", P.net, true)}{Rw("Less: cost of goods sold", -P.cg)}{Rw("Gross profit", P.gp, true)}
      {P.ex.filter((x) => x[1]).map((x) => Rw("Less: " + x[0], -x[1], false, x[0]))}{Rw("Net profit / (loss)", P.np, true)}
    </Table>);
  } else if (tab === "bs") {
    const B = glSum(E, "", to), as = [], li = [];
    B.filter((x) => x.t === "A" || x.t === "L").forEach((x) => { if (Math.abs(x.close) < 0.005) return; (x.close > 0 ? as : li).push([x.a + (x.t === "A" && x.close < 0 ? " (credit balance)" : x.t === "L" && x.close > 0 ? " (debit balance)" : ""), Math.abs(x.close)]); });
    const eq = -SUM(B.filter((x) => x.t === "E"), (x) => x.close), re = -SUM(B.filter((x) => ["I", "R", "C", "X"].includes(x.t)), (x) => x.close), tA = SUM(as, (x) => x[1]), tL = SUM(li, (x) => x[1]) + eq + re;
    body = (<><Table head={["Assets (as at " + (to || "today") + ")", "Amount"]}>
      {as.map((x) => Rw(x[0], x[1], false, x[0]))}{Rw("Total assets", r2(tA), true)}
      <tr><th>Liabilities &amp; equity</th><th></th></tr>{li.map((x) => Rw(x[0], x[1], false, x[0]))}
      {Rw("Opening balance equity", eq)}{Rw("Retained earnings (cumulative profit)", re)}{Rw("Total liabilities & equity", r2(tL), true)}
    </Table><p>{Math.abs(tA - tL) < 0.01 ? <Tag cls="in">✔ Balance sheet balances</Tag> : <Tag cls="out">Difference {money(r2(tA - tL))}</Tag>}</p></>);
  } else if (tab === "jr") {
    const ev = E.filter((e) => e.date === "0000-00-00" || inR(e.date)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 300);
    body = (<Table head={["Date", "Ref", "Source", "Narration", "Account", "Debit", "Credit"]}>
      {ev.map((e, n) => e.L.map((l, k) => <tr key={n + "-" + k}><td>{k ? "" : e.date === "0000-00-00" ? "Opening" : e.date}</td><td>{k ? "" : e.ref}</td><td>{k ? "" : e.src}</td><td>{k ? "" : e.narr}</td>
        <td style={l.cr ? { paddingLeft: 24 } : {}}>{l.a}</td><td>{l.dr ? money(l.dr) : ""}</td><td>{l.cr ? money(l.cr) : ""}</td></tr>))}
    </Table>);
  } else if (tab === "rc") {
    const all = glSum(E, "", ""), g = (a) => all.find((x) => x.a === a).close;
    const go_ = r2(SUM(db.invoices, (i) => calcInvoice(i, db).tax) - SUM(docs.filter((d) => d.type === "CN"), (d) => dTax(db, d)));
    const gi = r2(SUM(docs.filter((d) => d.miro), (d) => d.miro.tax) - SUM(docs.filter((d) => d.type === "DN"), (d) => dTax(db, d)));
    const rows = [["Accounts receivable vs customer ledgers", g("Accounts receivable"), r2(SUM(db.customers, (c) => custBal(db, c.id)))], ["Accounts payable vs vendor ledgers", -g("Accounts payable"), r2(SUM(db.vendors, (v) => vendBal(db, v.id)))],
      ["Output GST vs GST report", -g("Output GST"), go_], ["Input GST vs GST report", g("Input GST"), gi], ["Inventory (before balancing entry) vs stock valuation", E.ib, E.sv]];
    body = (<><Table head={["Control account", "General ledger", "Sub-ledger / report", "Difference", "Result"]}>
      {rows.map((r) => { const d = r2(r[1] - r[2]); return (<tr key={r[0]}><td>{r[0]}</td><td>{money(r2(r[1]))}</td><td>{money(r2(r[2]))}</td><td>{money(d)}</td>
        <td>{Math.abs(d) < 0.02 ? <Tag cls="in">✔ Agrees</Tag> : r[0].startsWith("Inventory") ? <Tag cls="low">Balancing entry {money(E.plug)}</Tag> : <Tag cls="out">Investigate</Tag>}</td></tr>); })}</Table>
      <p className="note">Inventory differences come from opening stock and manual stock edits, which have no purchase document. They are posted to <b>Opening balance equity</b> so the stock ledger and general ledger agree.</p></>);
  } else if (tab === "ip") {
    const ci = db.invoices.filter((i) => inR(i.date)), vi = docs.filter((d) => d.type === "PO" && d.migo && inR(d.miro ? d.miro.date : d.migo.date)), grir = r2(SUM(docs.filter((d) => d.type === "PO" && d.status === "GR posted" && d.migo), (d) => d.migo.taxable));
    body = (<>
      <div className="grid"><Kpi label="Customer invoices" value={ci.length} /><Kpi label="Customer invoice value" value={money(r2(SUM(ci, (i) => calcInvoice(i, db).total)))} />
        <Kpi label="Vendor invoices (MIRO)" value={vi.filter((d) => d.miro).length} /><Kpi label="Vendor invoice value" value={money(r2(SUM(vi.filter((d) => d.miro), (d) => d.miro.total)))} /><Kpi label="Goods received, not invoiced (GR/IR)" value={money(grir)} /></div>
      <h3>Customer invoice process – each invoice with its order, delivery and goods issue</h3>
      <Table head={["Invoice", "Date", "Customer", "Sales order", "Delivery", "PGI", "Taxable", "GST", "Total", "Payment", "Ledger posting"]}>
        {ci.map((i) => { const c = calcInvoice(i, db), so = docs.find((x) => x.id === i.soId), dl = dels.find((x) => x.id === i.delId); return (
          <tr key={i.id}><td>{i.no}</td><td>{i.date}</td><td>{cName(db, i.cid)}</td><td>{so ? so.no : "—"}</td><td>{dl ? dl.no : "—"}</td><td>{dl?.pgi ? dl.pgi.no : "—"}</td><td>{money(c.taxable)}</td><td>{money(c.tax)}</td><td>{money(c.total)}</td>
            <td><Tag cls={invDue(db, i) <= 0.005 ? "in" : "low"}>{invDue(db, i) <= 0.005 ? "Paid" : "Due " + money(invDue(db, i))}</Tag></td><td><small className="sub">Dr Receivable · Cr Sales &amp; Output GST</small></td></tr>); })}
      </Table>
      <h3>Vendor invoice process – each vendor invoice with its requisition, PO and goods receipt</h3>
      <Table head={["MIRO / vendor invoice", "Date", "Purchase order", "Requisition", "MIGO", "Vendor", "Taxable", "GST", "Total", "Status", "Ledger posting"]}>
        {vi.map((d) => { const pr = docs.find((x) => x.id === d.prId); return (
          <tr key={d.id}><td>{d.miro ? <>{d.miro.no}<small className="sub">Inv {d.miro.vinv}</small></> : <Tag cls="low">MIRO pending</Tag>}</td><td>{d.miro ? d.miro.date : d.migo.date}</td><td>{d.no}</td><td>{pr ? pr.no : <small className="sub">Direct PO</small>}</td><td>{d.migo.no}</td><td>{vNm(db, d.party)}</td>
            <td>{money(d.miro ? d.miro.taxable : d.migo.taxable)}</td><td>{d.miro ? money(d.miro.tax) : "—"}</td><td>{d.miro ? money(d.miro.total) : "—"}</td><td><Tag cls={d.miro ? "in" : "low"}>{d.miro ? "Invoiced" : "Goods received"}</Tag></td>
            <td><small className="sub">{d.miro ? "Dr GR/IR · Input GST · Cr Payable" : "Dr Inventory · Cr GR/IR clearing"}</small></td></tr>); })}
      </Table></>);
  } else if (tab === "ex") {
    const list = exps.filter((e) => inR(e.date)), g = (a) => act(S, a), months = {};
    exps.forEach((e) => { const k = e.date.slice(0, 7), r = months[k] || (months[k] = { k, t: 0 }); r[e.cat] = (r[e.cat] || 0) + e.amount; r.t += e.amount; });
    const mr = Object.values(months).sort((a, b) => (a.k < b.k ? 1 : -1));
    body = (<>
      <div className="card tabs"><button className="p" onClick={() => openExp("Salary")}>+ Salary / wages / bonus</button><button className="p" onClick={() => openExp("Rent")}>+ Rent</button><button className="p" onClick={() => openExp("Daily expense")}>+ Daily expense</button>
        <button onClick={() => setM({ k: "emp", name: "", role: "", type: "Salaried", base: "" })}>+ Employee</button>
        <button onClick={() => download("payroll-expenses.csv", [["Voucher", "Date", "Category", "Employee", "Period", "Description", "Amount", "Payment", "Status", "Paid on"], ...exps.map((e) => [e.no, e.date, e.cat, empName(e.emp), e.period, e.desc, e.amount, e.mode, e.status, e.pdate])])}>⬇ CSV</button></div>
      <div className="grid"><Kpi label="Salaries" value={money(g("Salaries expense"))} /><Kpi label="Wages" value={money(g("Wages expense"))} /><Kpi label="Bonus" value={money(g("Bonus expense"))} /><Kpi label="Rent" value={money(g("Rent expense"))} />
        <Kpi label="Daily & office expenses" value={money(g("Daily & office expenses"))} /><Kpi label="Unpaid (payable)" value={money(r2(SUM(exps.filter((e) => e.status === "Payable"), (e) => e.amount)))} /></div>
      <h3>Month-wise payroll &amp; expenses</h3>
      <Table head={["Month", ...EXPCAT, "Total"]}>{mr.map((r) => <tr key={r.k}><td>{r.k}</td>{EXPCAT.map((c) => <td key={c}>{r[c] ? money(r2(r[c])) : "—"}</td>)}<td><b>{money(r2(r.t))}</b></td></tr>)}</Table>
      <h3>Vouchers</h3>
      <Table head={["Voucher", "Date", "Category", "Employee / payee", "Period", "Amount", "Payment", "Status", "Actions"]}>
        {list.map((e) => <tr key={e.id}><td>{e.no}</td><td>{e.date}</td><td>{e.cat}</td><td>{empName(e.emp) || e.desc}{e.emp && e.desc && e.desc !== empName(e.emp) && <small className="sub">{e.desc}</small>}</td><td>{e.period || "—"}{e.days ? <small className="sub">{e.days} days</small> : null}</td>
          <td>{money(e.amount)}</td><td>{e.mode}{e.status === "Paid" && e.mode === "Unpaid" ? " → " + e.pmode : ""}</td><td><Tag cls={e.status === "Paid" ? "in" : "low"}>{e.status}{e.pdate && e.mode === "Unpaid" ? " " + e.pdate : ""}</Tag></td>
          <td>{e.status === "Payable" && <button className="sm p" onClick={() => setM({ k: "pay", e, date: today(), mode: "Cash" })}>Pay</button>}<button className="sm d" onClick={() => delExp(e)}>Delete</button></td></tr>)}
      </Table>
      <h3>Employees</h3>
      <Table head={["Name", "Designation", "Pay type", "Rate", "Paid so far", "Actions"]}>
        {emps.map((e) => <tr key={e.id}><td>{e.name}</td><td>{e.role}</td><td>{e.type}</td><td>{money(e.base)}{e.type === "Daily wage" ? " / day" : " / month"}</td><td>{money(r2(SUM(exps.filter((x) => x.emp === e.id), (x) => x.amount)))}</td>
          <td><button className="sm" onClick={() => setM({ k: "emp", ...e })}>Edit</button><button className="sm d" onClick={() => delEmp(e)}>Delete</button></td></tr>)}
      </Table>
      <p className="note">Salaries, wages, bonus, rent and daily expenses post to the ledger and reduce net profit. Unpaid vouchers sit in Expenses payable until paid.</p></>);
  } else {
    const tbCl = r2(SUM(S, (x) => x.close)), pos = docs.filter((d) => d.type === "PO"), tix = db.tix || {}, openTix = (k, last) => (tix[k] || []).filter((r) => r.status !== last && r.status !== "Rejected").length;
    const c = [["Sales orders not yet invoiced", docs.filter((d) => d.type === "SO" && !["Billed", "Cancelled"].includes(d.status)).length, "o2c"],
      ["Purchase requisitions not converted", docs.filter((d) => d.type === "PR" && ["Open", "Approved"].includes(d.status)).length, "p2p"],
      ["Purchase orders not yet received", pos.filter((d) => ["Open", "Approved"].includes(d.status)).length, "p2p"],
      ["Goods received, MIRO (vendor invoice) pending", pos.filter((d) => d.status === "GR posted").length, "p2p"],
      ["Received POs awaiting vendor payment", pos.filter((d) => d.status === "Received" && r2(d.miro.total - SUM(pays.filter((x) => x.doc === d.id), (x) => x.amount)) > 0.005).length, "p2p"],
      ["Goods issued, not invoiced", dels.filter((x) => x.pgi && !db.invoices.some((i) => i.delId === x.id)).length, "o2c"],
      ["Deliveries pending / in transit", dels.filter((x) => ["Pending", "Dispatched"].includes(x.status)).length, "deliveries"],
      ["Invoices awaiting payment", db.invoices.filter((i) => invDue(db, i) > 0.005).length, "o2c"],
      ["Payroll / expense vouchers unpaid", exps.filter((e) => e.status === "Payable").length, "r2r"],
      ["Tailoring jobs open", openTix("jobs", "Delivered"), "jobs"], ["Repairs open", openTix("repairs", "Returned"), "repairs"], ["Warranty claims open", openTix("warranty", "Replaced"), "warranty"],
      ["Books out of balance (trial balance)", Math.abs(tbCl) > 0.01 ? 1 : 0, "r2r"]];
    body = (<><Table head={["Close check", "Open items", "Status", "Go to"]}>
      {c.map((x) => <tr key={x[0]}><td>{x[0]}</td><td>{x[1]}</td><td>{x[1] ? <Tag cls="low">Review</Tag> : <Tag cls="in">✔ Clear</Tag>}</td><td><a style={link} onClick={() => go && go(x[2])}>Open</a></td></tr>)}</Table>
      <p className="note">Clear or review these before closing a month, then download the trial balance, P&amp;L and journal for that period.</p></>);
  }

  return (<>
    <Head title="Record-to-Report (R2R)">
      <button onClick={() => download("journal.csv", [["Date", "Ref", "Source", "Narration", "Account", "Debit", "Credit"], ...E.flatMap((e) => e.L.map((l) => [e.date, e.ref, e.src, e.narr, l.a, l.dr, l.cr]))])}>⬇ Journal</button>{" "}
      <button onClick={() => download("trial-balance.csv", [["Code", "Account", "Opening (Dr+/Cr-)", "Period debit", "Period credit", "Closing (Dr+/Cr-)"], ...S.map((x) => [x.code, x.a, x.open, x.dr, x.cr, x.close])])}>⬇ Trial balance</button>
    </Head>
    <div className="card tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? "p" : ""} onClick={() => setTab(k)}>{l}</button>)}
      <div className="datebox"><div><label>From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div><label>To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></div></div>
    <div className="grid"><Kpi label="Net sales" value={money(P.net)} /><Kpi label="Gross profit" value={money(P.gp)} /><Kpi label="Net profit / (loss)" value={money(P.np)} /><Kpi label="Payroll & expenses" value={money(r2(SUM(EXPA, (a) => act(S, a))))} /></div>
    {body}
    <p className="note">The ledger is derived automatically from customer invoices, goods issues (PGI), vendor invoices (MIGO / MIRO), payroll &amp; expense vouchers, credit / debit notes and receipts / payments. Nothing is posted twice.</p>

    {m && m.k === "exp" && <Modal title={"New voucher – " + m.cat} onClose={() => setM(null)} onSave={saveExp} okText="Save voucher">
      <label>Category</label><select value={m.cat} onChange={(e) => setExp({ cat: e.target.value })}>{EXPCAT.map((c) => <option key={c}>{c}</option>)}</select>
      {["Salary", "Wages", "Bonus"].includes(m.cat) && <><label>Employee</label><select value={m.emp} onChange={(e) => setExp({ emp: e.target.value })}>{emps.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.type})</option>)}</select></>}
      <div className="row"><div><label>Date</label><input type="date" value={m.date} onChange={(e) => setExp({ date: e.target.value })} /></div>
        {["Salary", "Wages", "Bonus", "Rent"].includes(m.cat) && <div><label>Period (month)</label><input type="month" value={m.period} onChange={(e) => setExp({ period: e.target.value })} /></div>}
        {m.cat === "Wages" && <div><label>Days worked</label><input type="number" value={m.days} onChange={(e) => setExp({ days: e.target.value })} /></div>}</div>
      <label>Description</label><input value={m.desc} onChange={(e) => setExp({ desc: e.target.value })} />
      <div className="row"><div><label>Amount (₹)</label><input type="number" value={m.amount} onChange={(e) => setExp({ amount: e.target.value })} /></div>
        <div><label>Payment</label><select value={m.mode} onChange={(e) => setExp({ mode: e.target.value })}>{EXPM.map((x) => <option key={x}>{x}</option>)}</select></div></div>
    </Modal>}
    {m && m.k === "pay" && <Modal title={"Pay " + m.e.no + " – " + m.e.desc + " (" + money(m.e.amount) + ")"} onClose={() => setM(null)} onSave={payExp} okText="Pay">
      <label>Payment date</label><input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
      <label>Mode</label><select value={m.mode} onChange={(e) => setM({ ...m, mode: e.target.value })}>{EXPM.filter((x) => x !== "Unpaid").map((x) => <option key={x}>{x}</option>)}</select>
    </Modal>}
    {m && m.k === "emp" && <Modal title={(m.id ? "Edit" : "Add") + " employee"} onClose={() => setM(null)} onSave={saveEmp}>
      <label>Name</label><input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
      <label>Designation</label><input value={m.role} onChange={(e) => setM({ ...m, role: e.target.value })} />
      <label>Pay type</label><select value={m.type} onChange={(e) => setM({ ...m, type: e.target.value })}><option>Salaried</option><option>Daily wage</option></select>
      <label>Monthly salary or daily wage (₹)</label><input type="number" value={m.base} onChange={(e) => setM({ ...m, base: e.target.value })} />
    </Modal>}
  </>);
}
