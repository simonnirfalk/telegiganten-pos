// src/components/DashboardRecentBookings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBookings } from "../data/apiClient"; // bruger din eksisterende helper

const cap = (s = "", n = 80) => (s?.length > n ? s.slice(0, n - 1) + "…" : s);

/* -------------------- Dato/tid helpers -------------------- */
function cleanTime(t = "") {
  // strip "kl." og ekstra mellemrum
  return String(t).replace(/\bkl\.\s*/i, "").trim();
}

function parseDateTime(date, time) {
  const dRaw = String(date || "").trim();
  const tRaw = cleanTime(time);

  if (!dRaw && !tRaw) return NaN;

  // 1) ISO direkte i date eller time
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(:\d{2})?)?$/.test(dRaw)) {
    const ms = Date.parse(dRaw);
    if (!Number.isNaN(ms)) return ms;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(tRaw) || /T\d{2}:\d{2}/.test(tRaw)) {
    const ms = Date.parse(tRaw);
    if (!Number.isNaN(ms)) return ms;
  }

  // 2) DD/MM/YYYY
  let m = dRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const [HH = "00", MM = "00"] = tRaw.split(/[.:]/);
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(HH),
      Number(MM)
    );
    return isNaN(d.getTime()) ? NaN : d.getTime();
  }

  // 3) DD-MM-YYYY
  m = dRaw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const [HH = "00", MM = "00"] = tRaw.split(/[.:]/);
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(HH),
      Number(MM)
    );
    return isNaN(d.getTime()) ? NaN : d.getTime();
  }

  // 4) DD.MM.YYYY
  m = dRaw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const [HH = "00", MM = "00"] = tRaw.split(/[.:]/);
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(HH),
      Number(MM)
    );
    return isNaN(d.getTime()) ? NaN : d.getTime();
  }

  // 5) Sidste forsøg: kombiner som fri tekst (kan virke hvis browseren kan tolke lokalt)
  const joined = `${dRaw}${tRaw ? ` ${tRaw}` : ""}`.trim();
  const ms = Date.parse(joined);
  if (!Number.isNaN(ms)) return ms;

  return NaN;
}

function startMsOrFallback(v) {
  const ms1 = parseDateTime(v.date, v.time);
  if (!Number.isNaN(ms1)) return ms1;

  const ms2 = v.created_at ? Date.parse(v.created_at) : NaN;
  if (!Number.isNaN(ms2)) return ms2;

  return Number.POSITIVE_INFINITY; // ukendt → til sidst
}

function fmtDate(d, t) {
  const hasD = !!d;
  const hasT = !!t;
  if (!hasD && !hasT) return "—";
  return `${hasD ? d : ""}${hasT ? ` kl. ${cleanTime(t)}` : ""}`.trim();
}

/* -------------------- UI helpers -------------------- */
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

const skeletonLine = (w) => ({
  height: 12,
  width: w,
  background: "#eee",
  borderRadius: 8,
});

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
        background: map.bg,
        color: map.fg,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {map.label}
    </span>
  );
};

/* -------------------- Component -------------------- */
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
        const res = await fetchBookings({ per_page: 200 }); // hent nok til at sortere korrekt
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

  // Sortér: kommende først (nærmest nu), derefter tidligere (nærmest nu), ukendte til sidst
  const sorted = useMemo(() => {
    const now = Date.now();
    const withKeys = (Array.isArray(items) ? items : []).map((v) => ({ v, ms: startMsOrFallback(v) }));

    const future  = withKeys.filter((x) => x.ms >= now && Number.isFinite(x.ms)).sort((a, b) => a.ms - b.ms);
    const past    = withKeys.filter((x) => x.ms <  now && Number.isFinite(x.ms)).sort((a, b) => b.ms - a.ms);
    const unknown = withKeys.filter((x) => !Number.isFinite(x.ms));

    return [...future, ...past, ...unknown].map((x) => x.v).slice(0, 6);
  }, [items]);

  const openBooking = (id) => navigate("/bookings", { state: { openBookingId: id } });

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
      {sorted.map((b, i) => (
        <div
          key={b.id ?? i}
          style={cardStyle}
          onClick={() => openBooking(b.id)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
          title={b.id ? `Åbn booking #${b.id}` : "Åbn booking"}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {b.model || "Uden model"}
            {Array.isArray(b.repairs) && b.repairs.length ? ` — ${cap(b.repairs.map(r => r?.name || r?.title || "").filter(Boolean).join(", "), 40)}` : ""}
          </div>
          <div style={{ color: "#374151" }}>{b.customer_name || "Uden navn"}</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
            {[b.customer_phone, b.customer_email].filter(Boolean).join(" · ") || "—"}
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
