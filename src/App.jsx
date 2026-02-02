// src/App.jsx
import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { RepairProvider } from "./context/RepairContext";
import { api } from "./data/apiClient";
import OrdersPage from "./pages/OrdersPage";
import OrderPrint from "./pages/OrderPrint";
import BuybackAdminPage from "./pages/BuybackAdminPage";

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
const ImportExportPage = lazy(() => import("./pages/ImportExportPage"));
const BookingSettingsPage = lazy(() => import("./pages/BookingSettingsPage"));

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
        <HeaderFoldout />
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
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id/print" element={<OrderPrint />} />
              <Route path="/buyback-admin" element={<BuybackAdminPage />} />
              <Route path="/booking-settings" element={<BookingSettingsPage />} />
              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </RepairProvider>
  );
}

/** Topbar med foldout (erstatter tidligere "Import / Export"-link) */
function HeaderFoldout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const blue = "#2166AC";

  // Luk når man klikker udenfor
  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      const target = e.target;
      if (menuRef.current && !menuRef.current.contains(target) && btnRef.current && !btnRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Knappens standard/hovre-stil matcher dit blå design
  const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${blue}`,
    color: blue,
    background: "white",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <header
      className="no-print"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        backgroundColor: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <img src="/logo.png" alt="Telegiganten" style={{ height: 40 }} />
      </div>

      {/* Foldout-knap (tidl. Import/Export) */}
      <div style={{ position: "relative" }}>
        <button
          ref={btnRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.color = blue;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.color = blue;
          }}
          style={btnStyle}
          title="Flere handlinger"
        >
          Mere ▾
        </button>

        {open && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Hurtigmenu"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              background: "#fff",
              border: "1px solid #e9eef3",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
              minWidth: 220,
              padding: 8,
              zIndex: 60,
            }}
          >
            <MenuItem
              label="Bestillinger"
              onClick={() => {
                setOpen(false);
                navigate("/orders");
              }}
            />
            <MenuItem
              label="Sælg"
              onClick={() => {
                setOpen(false);
                navigate("/buyback-admin");
              }}
            />
            <MenuItem
              label="Import / Export"
              onClick={() => {
                setOpen(false);
                navigate("/import-export");
              }}
            />
            <MenuItem
              label="Booking-indstillinger"
              onClick={() => {
                setOpen(false);
                navigate("/booking-settings");
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({ label, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 10,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "0.95rem",
        color: "#000"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#F5F8FB";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
