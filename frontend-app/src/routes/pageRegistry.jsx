import React from "react";
import {
  Dashboard,
  Products,
  Stock,
  Customers,
  Vendors,
  Invoices,
  DocPage,
  Transactions,
  Users,
  Soon,
} from "../pages.jsx";
import { Tickets, Reminders, Bank, PVar } from "../extra2.jsx";
import { Payments, Moves, Reports } from "../extra.jsx";
import P2P from "../p2p.jsx";
import O2C from "../o2c.jsx";
import R2R from "../r2r.jsx";

// Each entry: path -> { component, props }
export const PAGES = {
  dashboard: { component: Dashboard },
  p2p: { component: P2P, props: { mode: "flow" } },
  o2c: { component: O2C, props: { mode: "flow" } },
  r2r: { component: R2R },
  products: { component: Products },
  stock: { component: Stock },
  customers: { component: Customers },
  vendors: { component: Vendors },
  invoices: { component: Invoices },
  jobs: { component: Tickets, props: { kind: "jobs" } },
  exch: { component: Tickets, props: { kind: "exch" } },
  repairs: { component: Tickets, props: { kind: "repairs" } },
  warranty: { component: Tickets, props: { kind: "warranty" } },
  rtf: { component: Tickets, props: { kind: "rtf" } },
  deliveries: { component: O2C, props: { mode: "del" } },
  so: { component: O2C, props: { mode: "so" } },
  pr: { component: P2P, props: { mode: "pr" } },
  po: { component: P2P, props: { mode: "po" } },
  notes: { component: NotesPage },
  payments: { component: Payments },
  bank: { component: Bank },
  remind: { component: Reminders },
  moves: { component: Moves },
  pvar: { component: PVar },
  users: { component: Users },
  transactions: { component: Transactions },
  reports: { component: Reports },
};

function NotesPage(props) {
  const [k, setK] = React.useState("cn");
  return (
    <>
      <div className="top">
        <div>
          <button className={k === "cn" ? "p" : ""} onClick={() => setK("cn")}>
            Credit notes
          </button>{" "}
          <button className={k === "dn" ? "p" : ""} onClick={() => setK("dn")}>
            Debit notes
          </button>
        </div>
      </div>
      <DocPage key={k} {...props} kind={k} />
    </>
  );
}