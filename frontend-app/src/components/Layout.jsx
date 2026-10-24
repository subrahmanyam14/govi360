import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout({ user, onLogout, onReset }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="app">
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar
        user={user}
        onLogout={onLogout}
        onReset={onReset}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <main className="main-content">
        <div className="mobile-topbar">
          <button
            className="menu-toggle"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(true)}
          >
            <span aria-hidden="true">☰</span>
            Menu
          </button>
          <strong>📦 Govi360X</strong>
        </div>
        <Outlet />
      </main>
    </div>
  );
}