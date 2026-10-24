import React from "react";
import { NavLink } from "react-router-dom";

const NAV = [
  { path: "/dashboard", label: "Dashboard", group: "Overview" },
  { path: "/p2p", label: "P2P · Procure-to-Pay", group: "Processes" },
  { path: "/o2c", label: "O2C · Order-to-Cash", group: "Processes" },
  { path: "/r2r", label: "R2R · Record-to-Report", group: "Processes" },
  { path: "/products", label: "Products", group: "Master Data" },
  { path: "/stock", label: "Stock Report", group: "Master Data" },
  { path: "/customers", label: "Customers", group: "Master Data" },
  { path: "/vendors", label: "Vendors", group: "Master Data" },
  { path: "/invoices", label: "Invoices", group: "Sales" },
  { path: "/jobs", label: "Tailoring Jobs", group: "Service" },
  { path: "/exch", label: "Exchanges", group: "Service" },
  { path: "/repairs", label: "Repairs", group: "Service" },
  { path: "/warranty", label: "Warranty Desk", group: "Service" },
  { path: "/rtf", label: "Factory Returns", group: "Service" },
  { path: "/deliveries", label: "Deliveries", group: "Sales" },
  { path: "/so", label: "Sales Orders", group: "Sales" },
  { path: "/pr", label: "Purchase Req.", group: "Purchasing" },
  { path: "/po", label: "Purchase Orders", group: "Purchasing" },
  { path: "/notes", label: "Credit / Debit Notes", group: "Finance" },
  { path: "/payments", label: "Payments", group: "Finance" },
  { path: "/bank", label: "Bank & Cheques", group: "Finance" },
  { path: "/remind", label: "⏰ Warranty Reminders", group: "Service" },
  { path: "/moves", label: "Stock Movements", group: "Reports" },
  { path: "/pvar", label: "Price Variance", group: "Reports" },
  { path: "/users", label: "Users", group: "Admin" },
  { path: "/transactions", label: "Transactions", group: "Reports" },
  { path: "/reports", label: "Reports", group: "Reports" },
];

export default function Sidebar({ user, onLogout, onReset, isOpen, onClose }) {
  // Group nav items
  const groups = NAV.reduce((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  return (
    <nav id="main-navigation" className={"sidebar" + (isOpen ? " open" : "")}>
      <div className="sidebar-header">
        <h1>📦 Govi360X</h1>
        <button
          className="sidebar-close"
          aria-label="Close navigation menu"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="sidebar-scroll">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="nav-group">
            <div className="nav-group-label">{group}</div>
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => "nav-link" + (isActive ? " on" : "")}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="nav-link logout-btn" onClick={onLogout}>
          ⏻ Logout ({user.username})
        </button>
        <button className="nav-link reset-btn" onClick={onReset}>
          ↺ Reset demo data
        </button>
      </div>
    </nav>
  );
}