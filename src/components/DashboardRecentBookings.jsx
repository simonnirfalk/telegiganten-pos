// src/components/DashboardRecentBookings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBookings } from "../data/apiClient";

const cap = (s = "", n = 80) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function getView(item) {
  const customer_name  = item.customer_name  ?? item?.customer?.name  ?? "";
  const customer_email = item.customer_email ?? item?.customer?.email ?? "";
  const customer_phone = item.customer_phone ?? item?.customer?.phone ?? "";

  const model =
    item.model ??
    item?.selection?.model?.title ??
    item?.selection?.device?.title ??
    "";

  const repairs = Array.isArray(item.repairs)
    ? item.repairs
    : (Array.isArray(item?.selection?.repairs) ? item.selection.repairs : []);

  const date = item.booking_date ?? item?.booking?.date ?? item.date ?? "";
  const time = item.booking_time ?? item?.booking?.time ?? item.time ?? "";
  const status = item.status || "";

  return {
    id: item.id,
    date, time, status,
    customer_name, customer_email, customer_phone,
    model,
    repairs,
  };
}

function fmtDate(d, t) {
  if (!d && !t) return "—";
  return `${d || ""}${t ? ` kl. ${t}` : ""}`.trim();
}

const statusPill = (status) => {
  const map = {
    booking_pending:    { bg: "#e0ecff", fg: "#1d4ed8", label: "Booket" },
    booking_confirmed:  { bg: "#dcfce7", fg: "#166534", label: "Bekræftet" },
    booking_processing: { bg: "#fff7ed", fg: "#9a3412", label: "Under behandling" },
    booking_completed:  { bg: "#e5e7eb", fg: "#111827", label: "Afsluttet" },
    booking_canceled:   { bg: "#fee2e2", fg: "#b91c1c", label: "Annulleret" },
  }[status] || { bg: "#eef2ff", fg: "#3730a3", label: status || "—" };

  return (
    <span
      style={{
        background: map.bg, color: map.fg, padding: "2px 8px",
        borderRadius: 999, fontSize: 12, fontWeight: 700,
      }}
    >
      {map.label}
    </span>
  );
};

export default function DashboardRecentBookings() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchBookings({ per_page: 20 }); // hent lidt ekstra, vi sorterer/klipper selv
        const raw = Array.isArray(res) ? res : (res?.items ?? []);
        const views = raw.map(getView);

        // sortér efter dato+tid nyeste først (fallback: id)
        views.sort((a, b) => {
          const ta = new Date(`${a.date} ${a.time}`.trim()).getTime() || 0;
          const tb = new Date(`${b.date} ${b.time}`.trim()).getTime() || 0;
          if (tb !== ta) return tb - ta;
          return (b.id || 0) - (a.id || 0);
        });

        if (!cancel) setItems(views.slice(0, 6)); // Simon har ændret til 6 seneste
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

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

  const onClick = (id) => {
    navigate("/bookings", { state: { openBookingId: id } });
  };

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ ...cardStyle, cursor: "default" }}>
            <div style={{ height: 14, width: "60%", background: "#eee", borderRadius: 8 }} />
            <div style={{ height: 12, width: "40%", background: "#f0f0f0", borderRadius: 8, marginTop: 8 }} />
            <div style={{ height: 20, width: 100, background: "#e6e6e6", borderRadius: 999, marginTop: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {items.map((b) => (
        <div
          key={b.id}
          style={cardStyle}
          onClick={() => onClick(b.id)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
          title={`Åbn booking #${b.id}`}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {b.model || "Uden model"}{b.repairs?.length ? ` — ${cap(b.repairs.map(r => r.name || r.title).join(", "), 40)}` : ""}
          </div>
          <div style={{ color: "#374151" }}>{b.customer_name || "Uden navn"}</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
            { [b.customer_phone, b.customer_email].filter(Boolean).join(" · ") || "—" }
          </div>
          <div style={{ marginTop: 8 }}>{statusPill(b.status)}</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
            {fmtDate(b.date, b.time)}
          </div>
        </div>
      ))}
    </div>
  );
}
