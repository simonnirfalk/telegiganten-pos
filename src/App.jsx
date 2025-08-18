import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NewRepair from "./pages/NewRepair";
import RepairsPage from "./pages/RepairsPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import { RepairProvider } from "./context/RepairContext";
import EditRepairsPage from "./pages/EditRepairsPage";
import SparePartsPage from "./pages/SparePartsPage";
import RepairSlipPrint from "./pages/RepairSlipPrint";
import { api } from "./data/apiClient"; // ← brug proxy

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hent kunder med reparationer (via proxy for konsistens)
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getCustomersWithRepairs();
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
        <header style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          padding: "1rem 2rem",
          backgroundColor: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img src="/logo.png" alt="Telegiganten" style={{ height: 40 }} />
          </div>
        </header>

        <main style={{ padding: "2rem" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/opret" element={<NewRepair />} />
            <Route path="/repairs" element={<RepairsPage />} />
            <Route path="/customers" element={<CustomersPage customers={customers} />} />
            <Route path="/customers/:id" element={<CustomerDetailPage customers={customers} />} />
            <Route path="/edit-repairs" element={<EditRepairsPage />} />
            <Route path="/spareparts" element={<SparePartsPage />} />
            {/* 🔧 Fix: brug den rigtige route til print-siden */}
            <Route path="/print-slip/:orderId" element={<RepairSlipPrint />} />
          </Routes>
        </main>
      </div>
    </RepairProvider>
  );
}
