// src/components/DashboardRecentBookings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBookings } from "../data/apiClient";

const cap = (s = "", n = 80) => (s?.length > n ? s.slice(0, n - 1) + "…" : s);

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1rem",
};
const cardStyle = {
  background: "white",
  borderRadius: 12,
  padding: "12px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  cursor: "pointer",
  transition: "transform .12s ease, box-shadow .12s ease",
};
const skeletonLine = (w) => ({ height: 12, width: w, background: "#eee", borderRadius: 8 });

const statusPill = (status) => {
  const map = {
    booking_pending:    { bg: "#e0ecff", fg: "#1d4ed8", label: "Booket" },
    booking_confirmed:  { bg: "#dcfce7", fg: "#166534", label: "Bekræftet" },
    booking_processing: { bg: "#fff7ed", fg: "#9a3412", label: "Under behandling" },
    booking_completed:  { bg: "#e5e7eb", fg: "#111827", label: "Afsluttet" },
    booking_canceled:   { bg: "#fee2e2", fg: "#b91c1c", label: "Annulleret" },
  }[status] || { bg: "#eef2ff", fg: "#3730a3", label: status || "—" };

  return (
    <span style={{ background: map.bg, color: map.fg, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
      {map.label}
    </span>
  );
};

// DK-format helpers
const formatDkDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-").map(n => parseInt(n, 10));
  if (y && m && d) return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  return dateStr;
};
const formatDkDateTime = (dateStr, timeStr) => {
  const d = formatDkDate(dateStr);
  if (!d && !timeStr) return "—";
  return `${d}${timeStr ? ` kl. ${timeStr}` : ""}`.trim();
};

// Normaliser en booking (eller repair-lignende record)
function normalize(v) {
  const order_id = v.order_id ?? v.id ?? v.ID ?? "";

  // booket dato/tid (læser både flad og nested struktur)
  const date = v.booking_date ?? v?.booking?.date ?? v.date ?? "";
  const time = v.booking_time ?? v?.booking?.time ?? v.time ?? "";

  // created_at til sortering som før
  const created_at = v.created_at ?? v.date ?? v.updated_at ?? null;

  const customer_name = v.customer_name ?? v.customer ?? v.name ?? "";
  const customer_phone = v.customer_phone ?? v.phone ?? "";
  const customer_email = v.customer_email ?? v.email ?? (v.contact?.includes("@") ? v.contact : "");
  const model = v.model || v.model_name || v.device || "";
  const t = Number(v.time ?? v.duration ?? 0);
  const p = Number(v.price ?? v.amount ?? 0);
  const repairName = v.repair || v.repair_title || v.title || "";
  const status = v.status ?? v.booking_status ?? "";

  const repairs = Array.isArray(v.repairs)
    ? v.repairs.map(r => ({ name: r?.name || r?.title || r?.repair || "", price: Number(r?.price || 0), time: Number(r?.time || 0) }))
    : (repairName || p || t) ? [{ name: repairName, price: p, time: t }] : [];

  return {
    raw: v,
    order_id,
    created_at,
    date,
    time,
    customer_name,
    customer_phone,
    customer_email,
    model,
    repairs,
    status,
  };
}

export default function DashboardRecentBookings() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetchBookings({ per_page: 200 });
        const raw = Array.isArray(res) ? res : (res?.items ?? []);
        if (!cancel) setItems(raw);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Kunne ikke hente bookinger.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Gruppér pr. order_id (én kort pr. ordre)
  const grouped = useMemo(() => {
    const m = new Map();
    for (const it of (Array.isArray(items) ? items : [])) {
      const n = normalize(it);
      const key = n.order_id || Math.random().toString(36).slice(2);
      if (!m.has(key)) {
        m.set(key, {
          order_id: key,
          created_at: n.created_at,
          // booket dato/tid vises på kortet:
          date: n.date || "",
          time: n.time || "",
          customer_name: n.customer_name,
          customer_phone: n.customer_phone,
          customer_email: n.customer_email,
          model: n.model,
          status: n.status,
          repairs: [],
          totalPrice: 0,
          totalTime: 0,
        });
      }
      const g = m.get(key);

      if (!g.model && n.model) g.model = n.model;
      if (!g.customer_name && n.customer_name) g.customer_name = n.customer_name;
      if (!g.customer_phone && n.customer_phone) g.customer_phone = n.customer_phone;
      if (!g.customer_email && n.customer_email) g.customer_email = n.customer_email;
      if (n.created_at && (!g.created_at || new Date(n.created_at) < new Date(g.created_at))) {
        g.created_at = n.created_at;
      }
      // sæt dato/tid hvis ikke sat (eller behold første fundne)
      if (!g.date && n.date) g.date = n.date;
      if (!g.time && n.time) g.time = n.time;

      if (n.status) g.status = n.status;

      for (const r of n.repairs) {
        g.repairs.push(r);
        g.totalPrice += Number(r.price || 0);
        g.totalTime += Number(r.time || 0);
      }
    }
    return Array.from(m.values());
  }, [items]);

  // Nyeste først
  const sorted = useMemo(
    () => grouped.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 6),
    [grouped]
  );

  const openOrder = (id) => navigate("/bookings", { state: { openBookingId: id } });

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...cardStyle, cursor: "default" }}>
            <div style={{ ...skeletonLine("60%"), marginBottom: 8 }} />
            <div style={{ ...skeletonLine("40%"), marginBottom: 8 }} />
            <div style={{ ...skeletonLine(100), height: 20, borderRadius: 999 }} />
          </div>
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ margin: "1rem 0 2rem", padding: "12px 14px", borderRadius: 12, background: "#fee2e2", color: "#991b1b" }}>
        {err}
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {sorted.map((g) => (
        <div
          key={g.order_id}
          style={cardStyle}
          onClick={() => openOrder(g.order_id)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
          title={`Åbn booking #${g.order_id}`}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {g.model || "Uden model"} — {cap(g.repairs.map(r => r.name).filter(Boolean).join(", "), 48)}
          </div>

          {/* 👇 Nyt: vis booket dato/tid */}
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
            {formatDkDateTime(g.date, g.time)}
          </div>

          <div style={{ color: "#374151" }}>{g.customer_name || "Uden navn"}</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
            {[g.customer_phone, g.customer_email].filter(Boolean).join(" · ") || "—"}
          </div>

          <div style={{ marginTop: 8 }}>{statusPill(g.status)}</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
            Total: {g.totalPrice.toLocaleString("da-DK")} kr • {g.totalTime || 0} min
          </div>
        </div>
      ))}
    </div>
  );
}
