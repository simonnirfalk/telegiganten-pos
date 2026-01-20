// src/pages/CustomersPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { api } from "../data/apiClient";
import { useAutoRefresh } from "../hooks/useAutoRefresh";

/** Utils */
const monthsDk = [
  "januar","februar","marts","april","maj","juni",
  "juli","august","september","oktober","november","december"
];

function formatDkDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()}. ${monthsDk[d.getMonth()]} ${d.getFullYear()}`;
}

/** Komponent */
export default function CustomersPage() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  async function loadCustomers({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      setLoadError("");
      const data = await api.getCustomersWithRepairs();

      const normalized = (Array.isArray(data) ? data : []).map((c) => ({
        id: c.id ?? c.ID ?? c.customer_id ?? Math.random().toString(36).slice(2),
        name: c.name ?? c.customer_name ?? "",
        phone: c.phone ?? c.customer_phone ?? "",
        email: c.email ?? "",
        repairs: Array.isArray(c.repairs) ? c.repairs : [],
      }));

      setCustomers(normalized);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error("Fejl ved hentning af kunder:", err);
      setLoadError("Kunne ikke hente kunder.");
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadCustomers({ silent: false });
  }, []);

  useAutoRefresh({
    enabled: true,
    intervalMs: 60000,
    refresh: async () => {
      await loadCustomers({ silent: true });
    },
  });

  // Søgning + sortering (seneste reparation først)
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const list = (customers || []).filter((c) => {
      if (!term) return true;
      const hay = [c.name || "", c.phone || "", c.email || ""].join(" ").toLowerCase();
      return hay.includes(term);
    });

    list.sort((a, b) => {
      const lastA = a.repairs?.length ? a.repairs[a.repairs.length - 1] : null;
      const lastB = b.repairs?.length ? b.repairs[b.repairs.length - 1] : null;
      const ta = lastA ? new Date(lastA.created_at || lastA.date || 0).getTime() : 0;
      const tb = lastB ? new Date(lastB.created_at || lastB.date || 0).getTime() : 0;
      return tb - ta;
    });

    return list;
  }, [customers, searchTerm]);

  const inputStyle = { padding: "0.5rem", margin: "0.5rem 0", width: "100%" };
  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  return (
    <div style={{ padding: "2rem" }}>
      {/* Top-knapper */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button onClick={() => navigate("/")} style={buttonStyle}>
          <FaHome /> Dashboard
        </button>
      </div>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Kunder</h2>

      <div style={{ marginBottom: "0.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
        {isRefreshing ? "Opdaterer…" : lastUpdatedAt ? `Sidst opdateret: ${lastUpdatedAt.toLocaleTimeString("da-DK")}` : ""}
      </div>

      <input
        type="text"
        placeholder="Søg navn, telefon eller e-mail…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={inputStyle}
      />

      {/* Loading / Error states */}
      {loading && <p>Indlæser kunder…</p>}
      {loadError && <p style={{ color: "crimson" }}>{loadError}</p>}

      {!loading && !loadError && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Navn</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Telefon</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>E-mail</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Antal reparationer</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Seneste reparation</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const count = c.repairs?.length || 0;
                const last = count ? c.repairs[count - 1] : null;
                const lastDate = last ? (last.created_at || last.date) : null;

                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.name || "—"}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.phone || "—"}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.email || "—"}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{count}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                      {count ? formatDkDate(lastDate) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <p style={{ marginTop: "1rem" }}>Ingen kunder fundet.</p>
          )}
        </>
      )}
    </div>
  );
}
