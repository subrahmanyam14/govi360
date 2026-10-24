import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import Login from "../components/Login";
import ProtectedRoute from "../components/ProtectedRoute";
import { PAGES } from "./pageRegistry";

export default function AppRoutes({ db, setDb, me, setMe, onReset }) {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  // Generic page wrapper that injects db/setDb/go
  const renderPage = (key) => {
    const entry = PAGES[key];
    if (!entry) return <p>Page not found</p>;
    const { component: Component, props = {} } = entry;
    return <Component db={db} setDb={setDb} go={null} {...props} />;
  };

  // Build routes from registry
  const pageRoutes = Object.keys(PAGES).map((key) => (
    <Route key={key} path={key} element={renderPage(key)} />
  ));

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            me ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login users={db.users} onLogin={setMe} />
            )
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute user={me}>
              <Layout user={me} onLogout={() => setMe(null)} onReset={onReset} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          {pageRoutes}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to={me ? "/dashboard" : "/login"} replace />} />
      </Routes>
      {loading && (
        <div className="page-loader" role="status" aria-live="polite">
          <span className="page-loader-spinner" aria-hidden="true" />
          <span>Loading page...</span>
        </div>
      )}
    </>
  );
}