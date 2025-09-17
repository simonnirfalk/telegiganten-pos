// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardStats from "../components/DashboardStats";
import DashboardRecentBookings from "../components/DashboardRecentBookings";
import { useNavigate } from "react-router-dom";
import { api } from "../data/apiClient";

// ---------------- Helpers ----------------
function isCancelledStatus(s) {
  const t = String(s || "").toLowerCase().trim();
  return (
    t === "annulleret" ||
    t === "canceled" ||
    t === "cancelled" ||
    t.includes("annull") ||
    t.includes("cancel")
  );
}

function formatDkDateTime(input) {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const months = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
  const dd = d.getDate();
  const mm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}. ${mm} ${yyyy} kl. ${hh}.${mi}`;
}
function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("da-DK") + " kr.";
}
const cap = (s = "", n = 64) => (s?.length > n ? s.slice(0, n - 1) + "…" : s);

// ---------------- Styles ----------------
const navBoxStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "2rem",
  textAlign: "center",
  fontSize: "1.1rem",
  fontWeight: "regular",
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
  cursor: "pointer",
  transition: "transform .12s ease, box-shadow .12s ease",
};
const cardHover = (e, hover) => {
  if (hover) {
    e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.12)";
    e.currentTarget.style.transform = "translateY(-2px)";
  } else {
    e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
    e.currentTarget.style.transform = "translateY(0)";
  }
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
  if (s === "under reparation") return "#2166AC";
  if (s === "klar til afhentning") return "#f59e0b";
  if (s === "afsluttet") return "#1f9d55";
  if (s === "annulleret") return "#861212ff";
  return "#6b7280";
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
        const res = await api.getRepairOrders(); // tg_repair
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

  // ---- NYT: Gruppér pr. order_id, beregn totaler og saml titler ----
  const groupedLatest = useMemo(() => {
    const list = (Array.isArray(repairs) ? repairs : []).filter((r) => !isCancelledStatus(r?.status));
    const m = new Map();

    for (const r of list) {
      const orderId = r?.order_id ?? r?.id ?? r?.ID ?? "";
      if (!orderId) continue;

      if (!m.has(orderId)) {
        m.set(orderId, {
          order_id: orderId,
          created_at: r?.updated_at || r?.created_at || r?.date || r?.createdAt || null,
          customer: r?.customer_name || r?.customer || "—",
          model: r?.model_name || r?.model || r?.device || "Ukendt model",
          status: r?.status || "—",
          titles: [],
          totalPrice: 0,
          totalTime: 0,
          firstRow: r, // gem til klik
        });
      }
      const g = m.get(orderId);

      // ældste created_at til visning
      const t = new Date(r?.updated_at || r?.created_at || r?.date || r?.createdAt || 0).getTime();
      const gt = new Date(g.created_at || 0).getTime();
      if (!g.created_at || t < gt) g.created_at = r?.updated_at || r?.created_at || r?.date || r?.createdAt || null;

      g.status = r?.status || g.status;

      const title = r?.repair_title || r?.repair || r?.title || "";
      if (title) g.titles.push(title);

      const price = Number(r?.price ?? r?.amount ?? 0);
      const time = Number(r?.time ?? r?.duration ?? 0);
      g.totalPrice += Number.isFinite(price) ? price : 0;
      g.totalTime += Number.isFinite(time) ? time : 0;
    }

    const arr = Array.from(m.values());
    arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return arr.slice(0, 6);
  }, [repairs]);

  const placeholderCount = 6;
  const hasData = groupedLatest.length > 0;

  const openOrder = (g) => {
    // Åbn i RepairsPage med state → derfra åbner vi historik for ordren
    navigate("/repairs", { state: { openRepair: { order_id: g.order_id } } });
  };

  return (
    <div>
      {/* Top-knapper */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        {[
          { label: "Opret reparation", to: "/opret" },
          { label: "Reparationer", to: "/repairs" },
          { label: "Bookinger", to: "/bookings" },
          { label: "Kunder", to: "/customers" },
          { label: "Priser", to: "/edit-repairs" },
          { label: "Reservedele", to: "/spareparts" },
        ].map((b) => (
          <div
            key={b.to}
            onClick={() => navigate(b.to)}
            style={navBoxStyle}
            onMouseEnter={(e) => navHover(e, true)}
            onMouseLeave={(e) => navHover(e, false)}
          >
            {b.label}
          </div>
        ))}
      </div>

      {/* Reparationer */}
      <h2 style={{ fontFamily: "Archivo Black", textTransform: "uppercase", marginBottom: "1rem" }}>
        Seneste reparationer
      </h2>

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
            <div key={i} style={{ ...cardStyle, cursor: "default" }}>
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
            groupedLatest.map((g) => (
              <div
                key={g.order_id}
                style={cardStyle}
                onClick={() => openOrder(g)}
                onMouseEnter={(e) => cardHover(e, true)}
                onMouseLeave={(e) => cardHover(e, false)}
                title={`Åbn ordre #${g.order_id}`}
              >
                <p style={{ margin: 0, fontWeight: "bold" }}>
                  {g.model} — {cap(g.titles.join(", "), 60)}
                </p>
                <p style={{ margin: 0, color: "#333" }}>{g.customer}</p>
                <span style={{ ...badgeBase, backgroundColor: statusColor(g.status) }}>{String(g.status)}</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <p style={{ fontSize: "0.8rem", color: "#999", margin: 0 }}>{formatDkDateTime(g.created_at)}</p>
                  <p style={{ fontSize: "0.85rem", color: "#444", margin: 0 }}>
                    <strong>{formatPrice(g.totalPrice)}</strong>
                    {g.totalTime ? ` • ${g.totalTime} min` : ""}
                  </p>
                </div>
              </div>
            ))
          ) : (
            Array.from({ length: placeholderCount }).map((_, i) => (
              <div key={i} style={{ ...cardStyle, cursor: "default" }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>—</p>
                <p style={{ margin: 0 }}>Ingen data</p>
                <span style={{ ...badgeBase, backgroundColor: "#6b7280" }}>—</span>
                <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "0.5rem" }}>—</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ✅ Seneste bookinger */}
      <h2 style={{ fontFamily: "Archivo Black", textTransform: "uppercase", margin: "1rem 0" }}>
        Seneste bookinger
      </h2>
      <div style={{ marginBottom: "2.5rem" }}>
        <DashboardRecentBookings />
      </div>

      {/* Analysekomponent */}
      <DashboardStats />
    </div>
  );
}
