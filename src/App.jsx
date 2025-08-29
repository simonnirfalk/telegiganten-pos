// src/App.jsx
import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
            justifyContent: "flex-start",
            alignItems: "center",
            padding: "1rem 2rem",
            backgroundColor: "white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img src="/logo.png" alt="Telegiganten" style={{ height: 40 }} />
          </div>
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

              {/* 404 fallback – undgår at en forkert sti viser en “tilfældig” side */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </RepairProvider>
  );
}
