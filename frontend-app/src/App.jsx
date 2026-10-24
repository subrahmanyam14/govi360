import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import * as seed from "./data.js";
import AppRoutes from "./routes/index.jsx";

const initial = () => ({
  company: seed.company,
  products: seed.products,
  customers: seed.customers,
  vendors: seed.vendors,
  users: seed.users,
  invoices: seed.invoices,
  txns: seed.txns,
  docs: seed.docs,
  pays: seed.pays,
  pvar: seed.pvar,
  dels: seed.dels,
  emps: seed.emps,
  exps: seed.exps,
  tix: seed.tix,
  cheques: seed.cheques,
  demoDataVersion: 1,
});

const KEY = "govi360x-v4";

const hydrate = (saved) => {
  const db = { ...initial(), ...saved };
  if (saved.demoDataVersion === 1) return db;

  const savedTix = saved.tix && typeof saved.tix === "object" ? saved.tix : {};
  db.tix = { ...seed.tix, ...savedTix };
  Object.entries(seed.tix).forEach(([kind, rows]) => {
    if (!Array.isArray(savedTix[kind]) || savedTix[kind].length === 0) {
      db.tix[kind] = rows;
    }
  });

  if (!Array.isArray(saved.cheques) || saved.cheques.length === 0) {
    db.cheques = seed.cheques;
  }
  if (!Array.isArray(saved.pays) || saved.pays.length === 0) {
    db.pays = seed.pays;
  }

  const savedDocs = Array.isArray(saved.docs) ? saved.docs : [];
  const noteTypes = new Set(savedDocs.map((doc) => doc.type));
  db.docs = [
    ...savedDocs,
    ...seed.docs.filter(
      (doc) =>
        ["CN", "DN"].includes(doc.type) &&
        !noteTypes.has(doc.type),
    ),
  ];
  db.demoDataVersion = 1;
  return db;
};

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? hydrate(saved) : initial();
  } catch {
    return initial();
  }
};

export default function App() {
  const [db, setDb] = useState(load);
  const [me, setMe] = useState(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {}
  }, [db]);

  const handleReset = () => {
    if (confirm("Reset all demo data?")) {
      setDb(initial());
    }
  };

  return (
    <BrowserRouter>
      <AppRoutes
        db={db}
        setDb={setDb}
        me={me}
        setMe={setMe}
        onReset={handleReset}
      />
    </BrowserRouter>
  );
}