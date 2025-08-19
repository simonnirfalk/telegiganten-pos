// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardStats from "../components/DashboardStats";
import { useNavigate } from "react-router-dom";
import { api } from "../data/apiClient";

// ---------------- Styles (beholder din stil) ----------------
const navBoxStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "2rem",
  textAlign: "center",
  fontSize: "1.1rem",
  fontWeight: "bold",
  flex: "1 1 180px",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  transition: "all .15s ease",
};

const navHover = (e, hover) => {
  if (hover) {
    e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
    e.currentTarget.style.transform = "translateY(-2px)";
  } else {
    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";
    e.currentTarget.style.transform = "translateY(0)";
  }
};

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "1rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  display: "grid",
  gap: "6px",
};

const badgeBase = {
  display: "inline-block",
  marginTop: "0.5rem",
  color: "white",
  padding: "0.3rem 0.8rem",
  borderRadius: "999px",
  fontSize: "0.8rem",
  fontWeight: 700,
};

function statusColor(status) {
  const s = String(status || "").toLowerCase();
  if (["modtaget", "received", "new"].includes(s)) return "#22b783";
  if (["i gang", "in progress", "working"].includes(s)) return "#2166AC";
  if (["afsluttet", "done", "completed"].includes(s)) return "#1f9d55";
  if (["afventer", "pending", "awaiting"].includes(s)) return "#f59e0b";
  if (["afvist", "canceled", "cancelled"].includes(s)) return "#ef4444";
  return "#6b7280"; // fallback grå
}

function formatDkDate(input) {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const months = [
    "jan.", "feb.", "mar.", "apr.", "maj", "jun.",
    "jul.", "aug.", "sep.", "okt.", "nov.", "dec.",
  ];
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("da-DK") + " kr.";
}

// ---------------- Component ----------------
export default function Dashboard() {
  const navigate = useNavigate();

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        // Hent ALLE ordrer (tg_repair). Vi viser kun de seneste 5 nedenfor.
        const res = await api.getRepairOrders();
        // res kan være et array eller et objekt med items; vær defensiv:
        const items = Array.isArray(res) ? res : (res?.items ?? []);
        if (!cancelled) setRepairs(items);
      } catch (err) {
        if (!cancelled) setErrorMsg(err?.message || "Kunne ikke hente reparationer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sorter efter created_at (nyeste først) og begræns til 5
  const latestRepairs = useMemo(() => {
    const list = Array.isArray(repairs) ? repairs.slice() : [];
    list.sort((a, b) => {
      const ta = new Date(a?.created_at || a?.date || a?.createdAt || 0).getTime();
      const tb = new Date(b?.created_at || b?.date || b?.createdAt || 0).getTime();
      return tb - ta;
    });
    return list.slice(0, 5);
  }, [repairs]);

  const placeholderCount = 5;
  const hasData = latestRepairs.length > 0;

  return (
    <div>
      {/* Top-knapper */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <div
          onClick={() => navigate("/opret")}
          style={navBoxStyle}
          onMouseEnter={(e) => navHover(e, true)}
          onMouseLeave={(e) => navHover(e, false)}
        >
          Opret reparation
        </div>
        <div
          onClick={() => navigate("/repairs")}
          style={navBoxStyle}
          onMouseEnter={(e) => navHover(e, true)}
          onMouseLeave={(e) => navHover(e, false)}
        >
          Reparationer
        </div>
        <div
          onClick={() => navigate("/customers")}
          style={navBoxStyle}
          onMouseEnter={(e) => navHover(e, true)}
          onMouseLeave={(e) => navHover(e, false)}
        >
          Kunder
        </div>
        <div
          onClick={() => navigate("/edit-repairs")}
          style={navBoxStyle}
          onMouseEnter={(e) => navHover(e, true)}
          onMouseLeave={(e) => navHover(e, false)}
        >
          Priser
        </div>
        <div
          onClick={() => navigate("/spareparts")}
          style={navBoxStyle}
          onMouseEnter={(e) => navHover(e, true)}
          onMouseLeave={(e) => navHover(e, false)}
        >
          Reservedele
        </div>
      </div>

      {/* Reparationer */}
      <h2 style={{ fontFamily: "Archivo Black", textTransform: "uppercase", marginBottom: "1rem" }}>
        Seneste reparationer
      </h2>

      {/* Loading / Error / Empty */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "2.5rem",
          }}
        >
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <div key={i} style={{ ...cardStyle }}>
              <div style={{ height: 14, width: "60%", background: "#eee", borderRadius: 8 }} />
              <div style={{ height: 12, width: "40%", background: "#f0f0f0", borderRadius: 8 }} />
              <div style={{ height: 24, width: 90, background: "#e6e6e6", borderRadius: 999, marginTop: 8 }} />
              <div style={{ height: 12, width: "50%", background: "#f0f0f0", borderRadius: 8, marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && errorMsg && (
        <div style={{ margin: "1rem 0 2rem", padding: "12px 14px", borderRadius: 12, background: "#fee2e2", color: "#991b1b" }}>
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "2.5rem",
          }}
        >
          {hasData ? (
            latestRepairs.map((r, i) => {
              const model = r?.model_name || r?.model || "Ukendt model";
              const customer = r?.customer_name || r?.customer || "—";
              const status = r?.status || "—";
              const date = r?.created_at || r?.date || r?.createdAt;
              const price = r?.price ?? r?.amount;

              return (
                <div key={r?.id || i} style={cardStyle}>
                  <p style={{ margin: 0, fontWeight: "bold" }}>{model}</p>
                  <p style={{ margin: 0, color: "#333" }}>{customer}</p>
                  <span style={{ ...badgeBase, backgroundColor: statusColor(status) }}>
                    {String(status)}
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <p style={{ fontSize: "0.8rem", color: "#999", margin: 0 }}>{formatDkDate(date)}</p>
                    <p style={{ fontSize: "0.85rem", color: "#444", margin: 0 }}>
                      <strong>{formatPrice(price)}</strong>
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            Array.from({ length: placeholderCount }).map((_, i) => (
              <div key={i} style={cardStyle}>
                <p style={{ margin: 0, fontWeight: "bold" }}>—</p>
                <p style={{ margin: 0 }}>Ingen data</p>
                <span style={{ ...badgeBase, backgroundColor: "#6b7280" }}>—</span>
                <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "0.5rem" }}>—</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analysekomponent */}
      <DashboardStats />
    </div>
  );
}
