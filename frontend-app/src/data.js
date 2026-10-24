// Hardcoded demo data (taken from the original HTML seed). Replace with API calls later.
export const company = { name: "Govi360X Traders", gstin: "33ABCDE1234F1Z5", state: "Tamil Nadu" };
export const products = [
  { id: "p1", name: "Ceiling Fan 1200mm", sku: "CF-1200", price: 2800, cost: 2300, qty: 25, sold: 40, min: 5, hsn: "8414", gst: 18, cat: "Fans", unit: "pcs", warranty: 24 },
  { id: "p2", name: "Table Fan 400mm", sku: "TF-400", price: 1900, cost: 1500, qty: 12, sold: 18, min: 4, hsn: "8414", gst: 18, cat: "Fans", unit: "pcs", warranty: 12 },
  { id: "p3", name: "Exhaust Fan 150mm", sku: "EF-150", price: 950, cost: 760, qty: 3, sold: 22, min: 5, hsn: "8414", gst: 18, cat: "Fans", unit: "pcs", warranty: 12 },
  { id: "p4", name: "LED Bulb 12W", sku: "LB-012", price: 90, cost: 60, qty: 0, sold: 200, min: 50, hsn: "8539", gst: 18, cat: "Electronics", unit: "pcs", warranty: 6 },
  { id: "p5", name: "Extension Board 4-way", sku: "EB-004", price: 450, cost: 320, qty: 40, sold: 30, min: 10, hsn: "8536", gst: 18, cat: "Electronics", unit: "pcs", warranty: 12 },
  { id: "p6", name: "Mobile Charger 20W", sku: "MC-020", price: 350, cost: 220, qty: 60, sold: 45, min: 15, hsn: "8504", gst: 18, cat: "Electronics", unit: "pcs", warranty: 6 },
  { id: "p7", name: "Cotton Fabric", sku: "FB-COT", price: 180, cost: 130, qty: 200, sold: 0, min: 30, hsn: "5208", gst: 5, cat: "Fabric", unit: "mtr", warranty: 0 },
  { id: "p8", name: "Shirting Fabric", sku: "FB-SHT", price: 320, cost: 240, qty: 150, sold: 0, min: 30, hsn: "5209", gst: 5, cat: "Fabric", unit: "mtr", warranty: 0 },
  { id: "p9", name: "Fan Capacitor 2.5µF", sku: "SP-CAP", price: 90, cost: 45, qty: 80, sold: 0, min: 20, hsn: "8532", gst: 18, cat: "Spares", unit: "pcs", warranty: 3 },
  { id: "p10", name: "Fan Regulator", sku: "SP-REG", price: 180, cost: 110, qty: 30, sold: 0, min: 10, hsn: "8537", gst: 18, cat: "Spares", unit: "pcs", warranty: 3 },
  { id: "p11", name: "Sewing Machine Needle Pack", sku: "SP-NDL", price: 60, cost: 35, qty: 50, sold: 0, min: 10, hsn: "8452", gst: 18, cat: "Spares", unit: "pcs", warranty: 0 },
];
export const customers = [
  { id: "c1", name: "Walk-in Customer", phone: "", email: "", address: "Chennai", state: "Tamil Nadu", gstin: "" },
  { id: "c2", name: "Sri Electricals", phone: "9123456780", email: "sri@example.com", address: "Bengaluru", state: "Karnataka", gstin: "29ABCDE1234F1Z5" },
  { id: "c3", name: "Lakshmi Tailors", phone: "9876501234", email: "lakshmi@example.com", address: "Coimbatore", state: "Tamil Nadu", gstin: "" },
];
export const vendors = [
  { id: "v1", name: "Sunrise Fan Distributors", phone: "9000000001", email: "sunrise@example.com", gst: "", address: "Coimbatore", state: "Tamil Nadu" },
  { id: "v2", name: "Bright Electricals", phone: "9000000002", email: "bright@example.com", gst: "", address: "Chennai", state: "Tamil Nadu" },
  { id: "v3", name: "Fabric Mart", phone: "9000000003", email: "fabric@example.com", gst: "", address: "Erode", state: "Tamil Nadu" },
];
export const users = [
  { id: "u1", username: "admin", password: "admin123", name: "Administrator", role: "Admin" },
  { id: "u2", username: "sales", password: "sales123", name: "Sales Staff", role: "Sales" },
  { id: "u3", username: "store", password: "store123", name: "Store Keeper", role: "Store" },
  { id: "u4", username: "purchase", password: "purchase123", name: "Purchase Staff", role: "Purchase" },
];
export const invoices = [
  { id: "i1", no: "INV-1001", date: "2026-10-02", cid: "c1", pay: "Paid", items: [{ pid: "p1", qty: 2 }, { pid: "p9", qty: 2 }] },
  { id: "i2", no: "INV-1002", date: "2026-10-09", cid: "c2", pay: "Unpaid", items: [{ pid: "p2", qty: 5 }, { pid: "p5", qty: 10 }] },
  { id: "i3", no: "INV-1003", date: "2026-10-18", cid: "c3", pay: "Paid", items: [{ pid: "p7", qty: 20 }, { pid: "p8", qty: 10 }] },
];
export const txns = [
  { id: "t1", date: "2026-10-18", type: "Sale", ref: "INV-1003", desc: "Invoice to Lakshmi Tailors", amount: 7056, by: "admin" },
  { id: "t2", date: "2026-10-09", type: "Sale", ref: "INV-1002", desc: "Invoice to Sri Electricals", amount: 16520, by: "sales" },
  { id: "t3", date: "2026-10-05", type: "Purchase", ref: "STOCK-IN", desc: "Stock in 20 × Ceiling Fan 1200mm", amount: 46000, by: "store" },
  { id: "t4", date: "2026-10-02", type: "Sale", ref: "INV-1001", desc: "Invoice to Walk-in Customer", amount: 6136, by: "admin" },
  { id: "t5", date: "2026-10-01", type: "Opening", ref: "—", desc: "Opening stock loaded", amount: 0, by: "admin" },
];

// ===== P2P seed data (hardcoded) – covers every stage of the Procure-to-Pay chain =====
const it = (pid, qty, rate) => ({ pid, qty, rate });
export const docs = [
  { id: "d-po4", type: "PO", no: "PO-1001", date: "2026-10-22", party: "v3", prId: "d-pr3", items: [it("p7", 100, 130)], status: "Open" },
  { id: "d-pr3", type: "PR", no: "PR-1003", date: "2026-10-22", party: "v3", items: [it("p7", 100, 130)], status: "Converted" },
  { id: "d-pr2", type: "PR", no: "PR-1002", date: "2026-10-21", party: "v2", items: [it("p5", 20, 320), it("p4", 200, 60)], status: "Approved" },
  { id: "d-pr1", type: "PR", no: "PR-1001", date: "2026-10-20", party: "v1", items: [it("p1", 10, 2300)], status: "Open" },
  { id: "d-po6", type: "PO", no: "PO-1002", date: "2026-10-19", party: "v1", prId: "d-pr4", items: [it("p2", 10, 1500)], status: "Approved" },
  { id: "d-pr4", type: "PR", no: "PR-1004", date: "2026-10-18", party: "v1", items: [it("p2", 10, 1500)], status: "Converted" },
  { id: "d-po3", type: "PO", no: "PO-1003", date: "2026-10-15", party: "v2", items: [it("p6", 30, 220)], status: "GR posted",
    migo: { no: "MIGO-1003", date: "2026-10-17", dn: "CH-4471", taxable: 6600 } },
  { id: "d-po2", type: "PO", no: "PO-1004", date: "2026-10-03", party: "v1", prId: "d-pr5", status: "Received", items: [{ pid: "p1", qty: 20, rate: 2350, poRate: 2300 }],
    poTotal: 54280, migo: { no: "MIGO-1002", date: "2026-10-05", dn: "CH-2210", taxable: 46000 },
    miro: { no: "MIRO-1002", date: "2026-10-08", vinv: "SFD/2231", taxable: 47000, tax: 8460, total: 55460 } },
  { id: "d-pr5", type: "PR", no: "PR-1005", date: "2026-10-01", party: "v1", items: [it("p1", 20, 2300)], status: "Converted" },
  { id: "d-po1", type: "PO", no: "PO-1005", date: "2026-09-28", party: "v3", items: [it("p8", 50, 240)], status: "Received",
    poTotal: 12600, migo: { no: "MIGO-1001", date: "2026-09-30", dn: "FM-118", taxable: 12000 },
    miro: { no: "MIRO-1001", date: "2026-10-01", vinv: "FM/889", taxable: 12000, tax: 600, total: 12600 } },
    // Credit notes (customer returns / price adjustments)
  { id: "d-cn1", type: "CN", no: "CN-1002", date: "2026-10-21", party: "c2",
    items: [{ pid: "p2", qty: 1, rate: 1900 }],
    status: "Posted" },
  { id: "d-cn2", type: "CN", no: "CN-1001", date: "2026-10-12", party: "c1",
    items: [{ pid: "p4", qty: 5, rate: 90 }],
    status: "Posted" },

  // Debit notes (vendor rate disputes / returns to vendor)
  { id: "d-dn1", type: "DN", no: "DN-1002", date: "2026-10-19", party: "v1",
    items: [{ pid: "p1", qty: 2, rate: 2300 }],
    status: "Posted" },
  { id: "d-dn2", type: "DN", no: "DN-1001", date: "2026-10-06", party: "v2",
    items: [{ pid: "p6", qty: 3, rate: 220 }],
    status: "Posted" },
];
export const pays = [
  { id: "pay2", no: "PAY-1002", date: "2026-10-12", kind: "v", party: "v1", doc: "d-po2", amount: 25000, mode: "UPI", ref: "UPI-88213" },
  { id: "pay1", no: "PAY-1001", date: "2026-10-03", kind: "v", party: "v3", doc: "d-po1", amount: 12600, mode: "Bank transfer", ref: "UTR-5521904" },
];
export const pvar = [
  { id: "pv1", date: "2026-10-08", ref: "PO-1004", vendor: "Sunrise Fan Distributors", pid: "p1", name: "Ceiling Fan 1200mm", qty: 20, poRate: 2300, actRate: 2350, mapBefore: 2260, mapAfter: 2300, ppv: 1000 },
];
txns.unshift(
  { id: "t6", date: "2026-10-12", type: "Payment", ref: "PAY-1002", desc: "Paid to Sunrise Fan Distributors", amount: 25000, by: "purchase" },
  { id: "t7", date: "2026-10-08", type: "Vendor Invoice", ref: "MIRO-1002", desc: "MIRO for PO-1004 / MIGO-1002 – inv SFD/2231", amount: 55460, by: "purchase" },
  { id: "t8", date: "2026-10-05", type: "Goods Receipt", ref: "MIGO-1002", desc: "MIGO for PO-1004 from Sunrise Fan Distributors", amount: 46000, by: "store" },
  { id: "t12", date: "2026-10-21", type: "Credit Note", ref: "CN-1002", desc: "Credit note to Sri Electricals", amount: -2242, by: "sales" },
  { id: "t13", date: "2026-10-12", type: "Credit Note", ref: "CN-1001", desc: "Credit note to Walk-in Customer", amount: -531, by: "sales" },
  { id: "t14", date: "2026-10-19", type: "Debit Note", ref: "DN-1002", desc: "Debit note to Sunrise Fan Distributors", amount: 5428, by: "purchase" },
  { id: "t15", date: "2026-10-06", type: "Debit Note", ref: "DN-1001", desc: "Debit note to Bright Electricals", amount: 779, by: "purchase" },
);

// ===== O2C seed data (hardcoded) – sales orders, deliveries, goods issue, invoices, receipts =====
const so = (id, no, date, party, items, status, invId) => ({ id, type: "SO", no, date, party, items, status, invId });
docs.push(
  so("d-so5", "SO-1005", "2026-10-21", "c2", [it("p6", 20, 350)], "Open"),
  so("d-so4", "SO-1004", "2026-10-20", "c3", [it("p5", 10, 450)], "In delivery"),
  so("d-so3", "SO-1003", "2026-10-16", "c2", [it("p1", 2, 2800)], "Issued"),
  so("d-so2", "SO-1002", "2026-10-12", "c2", [it("p2", 3, 1900)], "Billed", "i5"),
  so("d-so1", "SO-1001", "2026-10-10", "c1", [it("p9", 10, 90)], "Billed", "i4"),
);
export const dels = [
  { id: "dl4", no: "DEL-1004", soId: "d-so4", date: "2026-10-21", cid: "c3", items: [it("p5", 10, 450)], pgi: null, status: "Pending" },
  { id: "dl3", no: "DEL-1003", soId: "d-so3", date: "2026-10-17", cid: "c2", items: [it("p1", 2, 2800)], pgi: { no: "PGI-1003", date: "2026-10-17", cogs: 4600 }, status: "Dispatched" },
  { id: "dl2", no: "DEL-1002", soId: "d-so2", date: "2026-10-13", cid: "c2", items: [it("p2", 3, 1900)], pgi: { no: "PGI-1002", date: "2026-10-13", cogs: 4500 }, status: "Delivered" },
  { id: "dl1", no: "DEL-1001", soId: "d-so1", date: "2026-10-11", cid: "c1", items: [it("p9", 10, 90)], pgi: { no: "PGI-1001", date: "2026-10-11", cogs: 450 }, status: "Delivered" },
];
invoices.push(
  { id: "i4", no: "INV-1004", date: "2026-10-12", cid: "c1", pay: "Paid", items: [{ pid: "p9", qty: 10 }], soId: "d-so1", delId: "dl1" },
  { id: "i5", no: "INV-1005", date: "2026-10-14", cid: "c2", pay: "Unpaid", items: [{ pid: "p2", qty: 3 }], soId: "d-so2", delId: "dl2" },
);
pays.push({ id: "rc1", no: "RCT-1001", date: "2026-10-15", kind: "c", party: "c2", doc: "i5", amount: 3000, mode: "UPI", ref: "UPI-77120" });
txns.unshift(
  { id: "t9", date: "2026-10-15", type: "Receipt", ref: "RCT-1001", desc: "Received from Sri Electricals against INV-1005", amount: 3000, by: "sales" },
  { id: "t10", date: "2026-10-14", type: "Sale", ref: "INV-1005", desc: "Invoice to Sri Electricals (from DEL-1002)", amount: 6726, by: "sales" },
  { id: "t11", date: "2026-10-13", type: "Delivery", ref: "PGI-1002", desc: "Goods issue for DEL-1002 / SO-1002", amount: 5700, by: "store" },
);

// ===== R2R seed data (hardcoded) – employees and payroll / expense vouchers =====
export const emps = [
  { id: "e1", name: "Ravi Kumar", role: "Sales executive", type: "Salaried", base: 18000 },
  { id: "e2", name: "Meena", role: "Store keeper", type: "Salaried", base: 15000 },
  { id: "e3", name: "Murugan", role: "Helper", type: "Daily wage", base: 600 },
];
const ex = (no, date, cat, emp, period, days, desc, amount, mode, status, pdate) => ({ id: "x" + no, no: "EXP-" + no, date, cat, emp, period, days, desc, amount, mode, status, pdate: pdate || "", pmode: status === "Paid" && mode === "Unpaid" ? "Cash" : "" });
export const exps = [
  ex(1006, "2026-10-20", "Daily expense", "", "", 0, "Electricity bill – October", 3400, "Unpaid", "Payable"),
  ex(1005, "2026-10-18", "Bonus", "e1", "2026-10", 0, "Festival bonus", 5000, "Cash", "Paid", "2026-10-18"),
  ex(1004, "2026-10-15", "Wages", "e3", "2026-10", 12, "Murugan", 7200, "Cash", "Paid", "2026-10-15"),
  ex(1003, "2026-10-05", "Rent", "", "2026-10", 0, "Shop rent – October", 12000, "UPI", "Paid", "2026-10-05"),
  ex(1002, "2026-10-01", "Salary", "e2", "2026-09", 0, "Meena", 15000, "Bank transfer", "Paid", "2026-10-01"),
  ex(1001, "2026-10-01", "Salary", "e1", "2026-09", 0, "Ravi Kumar", 18000, "Bank transfer", "Paid", "2026-10-01"),
];

// ===== Tickets (service desk) seed data =====
// Covers: jobs (tailoring), exch (exchanges), repairs, warranty, rtf (factory returns)
const addMonths = (d, m) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x.toISOString().slice(0, 10);
};

export const tix = {
  // Tailoring jobs – SO-style workflow: Received → Cutting → Stitching → Ready → Delivered
  jobs: [
    { id: "k-j1", no: "JOBS-1004", date: "2026-10-20", party: "c3", item: "Cotton shirt – 3 pcs (measurements attached)", note: "Slim fit, blue buttons", amount: 1800, status: "Stitching", pid: "p7", serial: "", expiry: "" },
    { id: "k-j2", no: "JOBS-1003", date: "2026-10-18", party: "c3", item: "Formal trousers – 2 pcs", note: "Grey, 32 waist", amount: 1400, status: "Cutting", pid: "p8", serial: "", expiry: "" },
    { id: "k-j3", no: "JOBS-1002", date: "2026-10-14", party: "c3", item: "Blouse alteration – 1 pc", note: "Take in 2 inches at waist", amount: 350, status: "Ready", pid: "", serial: "", expiry: "" },
    { id: "k-j4", no: "JOBS-1001", date: "2026-10-08", party: "c1", item: "Shirt stitching – 2 pcs", note: "White, full sleeve", amount: 900, status: "Delivered", pid: "p8", serial: "", expiry: "" },
  ],

  // Exchanges – Requested → Approved → Replaced
  exch: [
    { id: "k-e1", no: "EXCH-1003", date: "2026-10-21", party: "c2", item: "Ceiling Fan 1200mm – wrong colour (brown instead of white)", note: "Customer wants white", amount: 2800, status: "Requested", pid: "p1", serial: "CF-1200-BR", expiry: "" },
    { id: "k-e2", no: "EXCH-1002", date: "2026-10-17", party: "c1", item: "LED Bulb 12W – dead on arrival", note: "Brought back within 2 days", amount: 90, status: "Approved", pid: "p4", serial: "LB-012-A1", expiry: "" },
    { id: "k-e3", no: "EXCH-1001", date: "2026-10-05", party: "c2", item: "Extension Board 4-way – damaged", note: "Replaced with new unit", amount: 450, status: "Replaced", pid: "p5", serial: "EB-004-X3", expiry: "" },
  ],

  // Repairs – Received → In repair → Repaired → Returned
  repairs: [
    { id: "k-r1", no: "REPAIRS-1003", date: "2026-10-22", party: "c2", item: "Ceiling Fan 1200mm – winding burnt", note: "Customer reported smoke", amount: 650, status: "Received", pid: "p1", serial: "CF-1200-0412", expiry: "" },
    { id: "k-r2", no: "REPAIRS-1002", date: "2026-10-19", party: "c1", item: "Table Fan 400mm – blade wobble", note: "Balance needed", amount: 250, status: "In repair", pid: "p2", serial: "TF-400-889", expiry: "" },
    { id: "k-r3", no: "REPAIRS-1001", date: "2026-10-10", party: "c3", item: "Sewing machine – tension spring", note: "Fixed and tested", amount: 400, status: "Returned", pid: "p11", serial: "SP-NDL-77", expiry: "" },
  ],

  // Warranty desk – Open → Sent to factory → Replaced / Rejected
  warranty: [
    { id: "k-w1", no: "WARRANTY-1003", date: "2026-10-22", party: "c2", item: "Ceiling Fan 1200mm – motor noise", note: "Bought 2025-06-15, 16 months into warranty", amount: 0, status: "Open", pid: "p1", serial: "CF-1200-2288", expiry: addMonths("2025-06-15", 24) },
    { id: "k-w2", no: "WARRANTY-1002", date: "2026-10-16", party: "c2", item: "Mobile Charger 20W – not charging", note: "Bought 2026-06-01", amount: 0, status: "Sent to factory", pid: "p6", serial: "MC-020-4471", expiry: addMonths("2026-06-01", 6) },
    { id: "k-w3", no: "WARRANTY-1001", date: "2026-10-04", party: "c1", item: "Exhaust Fan 150mm – regulator failure", note: "Bought 2025-09-20, near expiry", amount: 0, status: "Replaced", pid: "p3", serial: "EF-150-0021", expiry: addMonths("2025-09-20", 12) },
  ],

  // Factory returns – Raised → Sent to factory → Received back → Credited
  rtf: [
    { id: "k-f1", no: "RTF-1002", date: "2026-10-20", party: "v1", item: "Ceiling Fan 1200mm – 5 units defective (batch 0412)", note: "Awaiting replacement lot", amount: 11500, status: "Sent to factory", pid: "p1", serial: "", expiry: "" },
    { id: "k-f2", no: "RTF-1001", date: "2026-10-09", party: "v2", item: "Mobile Charger 20W – 10 units dead", note: "Credit note received from vendor", amount: 2200, status: "Credited", pid: "p6", serial: "", expiry: "" },
  ],
};

// ===== Cheques (bank register) seed data =====
export const cheques = [
  { id: "q1", date: "2026-10-20", no: "123456", party: "Sri Electricals", amount: 16520, dir: "Received", status: "Pending" },
  { id: "q2", date: "2026-10-18", no: "654321", party: "Sunrise Fan Distributors", amount: 25000, dir: "Issued", status: "Cleared" },
  { id: "q3", date: "2026-10-15", no: "778899", party: "Lakshmi Tailors", amount: 7056, dir: "Received", status: "Cleared" },
  { id: "q4", date: "2026-10-10", no: "112233", party: "Bright Electricals", amount: 6600, dir: "Issued", status: "Bounced" },
  { id: "q5", date: "2026-10-24", no: "445566", party: "Fabric Mart", amount: 13000, dir: "Issued", status: "Pending" },
];
