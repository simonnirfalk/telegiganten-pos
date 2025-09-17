// src/App.jsx
import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { RepairProvider } from "./context/RepairContext";
import { api } from "./data/apiClient";

// Lazy-load pages to avoid any top-level side-effects on import
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewRepair = lazy(() => import("./pages/NewRepair"));
const RepairsPage = lazy(() => import("./pages/RepairsPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/CustomerDetailPage"));
const EditRepairsPage = lazy(() => import("./pages/EditRepairsPage"));
const SparePartsPage = lazy(() => import("./pages/SparePartsPage"));
const RepairSlipPrint = lazy(() => import("./pages/RepairSlipPrint"));
const BookingsPage = lazy(() => import("./pages/BookingsPage"));
const ImportExportPage = lazy(() => import("./pages/ImportExportPage")); // ⬅️ NY

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getCustomers();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fejl ved hentning af kunder:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Indlæser kundedata...</p>;

  return (
    <RepairProvider>
      <div style={{ fontFamily: "Inter, sans-serif", background: "#f8f8f8", minHeight: "100vh" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 2rem",
            backgroundColor: "white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img src="/logo.png" alt="Telegiganten" style={{ height: 40 }} />
          </div>

          {/* Lille header-knap til Import/Export */}
          <Link
            to="/import-export"
            className="no-print"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #2166AC",
              color: "#2166AC",
              background: "white",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
            title="CSV import/eksport"
            aria-label="Åbn Import/Export"
          >
            Import / Export
          </Link>
        </header>

        <main style={{ padding: "2rem" }}>
          <Suspense fallback={<div>Indlæser side…</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/opret" element={<NewRepair />} />
              <Route path="/repairs" element={<RepairsPage />} />
              <Route path="/customers" element={<CustomersPage customers={customers} />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/edit-repairs" element={<EditRepairsPage />} />
              <Route path="/spareparts" element={<SparePartsPage />} />
              <Route path="/print-slip/:orderId" element={<RepairSlipPrint />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/import-export" element={<ImportExportPage />} /> {/* ⬅️ NY */}

              {/* 404 fallback – undgår at en forkert sti viser en “tilfældig” side */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </RepairProvider>
  );
}
