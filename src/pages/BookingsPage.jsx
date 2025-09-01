// src/pages/BookingsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import BookingModal from "../components/BookingModal";
import { fetchBookings } from "../data/apiClient";

const STATUS_OPTIONS = [
  { value: "booking_pending", label: "Booket" },
  { value: "booking_confirmed", label: "Bekræftet" },
  { value: "booking_processing", label: "Under behandling" },
  { value: "booking_completed", label: "Afsluttet" },
  { value: "booking_canceled", label: "Annulleret" },
];

const STATUS_STYLES = {
  booking_pending:   { bg: "#e0f2fe", text: "#075985" },
  booking_confirmed: { bg: "#dcfce7", text: "#166534" },
  booking_processing:{ bg: "#fef9c3", text: "#92400e" },
  booking_completed: { bg: "#e5e7eb", text: "#111827" },
  booking_canceled:  { bg: "#fee2e2", text: "#991b1b" },
};
const statusLabel = (v) => STATUS_OPTIONS.find(o => o.value === v)?.label ?? v;

/** DK-format helper for dato/tid */
function formatDkDate(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map((p) => parseInt(p, 10));
    if (y && m && d) {
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    }
  }
  return dateStr;
}
function formatDkDateTime(dateStr, timeStr) {
  const d = formatDkDate(dateStr);
  if (!d && !timeStr) return "—";
  return `${d}${timeStr ? ` kl. ${timeStr}` : ""}`.trim();
}

/** Normaliserer booking til et fladt "view" (samme semantik som i modalen) */
function getView(item) {
  const customer_name  = item.customer_name  ?? item?.customer?.name  ?? "";
  const customer_email = item.customer_email ?? item?.customer?.email ?? "";
  const customer_phone = item.customer_phone ?? item?.customer?.phone ?? "";

  const brand = item.brand ?? item?.selection?.brand?.title ?? "";
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
  const shipping_option = item.shipping_option ?? item?.booking?.shipping_option ?? "";
  const comment = item.comment ?? item?.booking?.comment ?? "";

  const price_before =
    item.total_price_before ??
    item?.totals?.price_before ??
    item?.totals?.total_price_before ??
    0;

  const discount_pct =
    item.discount_pct ??
    item?.totals?.discount_pct ??
    item?.totals?.discount ??
    0;

  const total_price =
    item.total_price ??
    item?.totals?.price ??
    item?.totals?.total_price ??
    0;

  const total_time =
    item.total_time ??
    item?.totals?.time ??
    item?.totals?.total_time ??
    0;

  return {
    id: item.id,
    status: item.status || "",
    customer_name,
    customer_email,
    customer_phone,
    brand,
    model,
    date,
    time,
    shipping_option,
    comment,
    repairs,
    totals: {
      price_before,
      discount_pct,
      price: total_price,
      time: total_time,
    },
  };
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();                    // ✅ brug hook inde i komponent
  const { pathname, state } = location;

  useEffect(() => {
    console.log("%c[BookingsPage] mounted:", "color:#2166AC;font-weight:bold;", pathname);
    return () => console.log("%c[BookingsPage] unmounted", "color:#999;");
  }, [pathname]);

  if (pathname !== "/bookings") return null;

  const [items, setItems] = useState([]); // [{...view, __raw}]
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchBookings({ status, search, page, per_page: perPage });
      const raw = Array.isArray(res) ? res : (res?.items ?? []);
      const normalized = raw.map((it) => ({ ...getView(it), __raw: it }));
      console.debug("[Bookings] raw sample:", raw.slice(0, 3));
      console.table(
        normalized.slice(0, 5).map(v => ({
          id: v.id,
          when: formatDkDateTime(v.date, v.time),
          customer_name: v.customer_name,
          model: v.model,
          price: v.totals.price,
          time: v.totals.time,
          status: v.status
        }))
      );
      setItems(normalized);
      setTotal(Array.isArray(res) ? res.length : (res.total || raw.length));
    } catch (e) {
      console.error(e);
      alert("Kunne ikke hente bookinger. Har du /telegiganten/v1/bookings endpointet på plads?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page, perPage]);

  // Åbn booking fra dashboard (state.openBookingId)
  useEffect(() => {
    const fromDash = state?.openBookingId;
    if (fromDash && items.length) {
      setSelectedId(fromDash);
      // ryd route state på en sikker måde
      navigate("/bookings", { replace: true, state: {} });
    }
  }, [state, items, navigate]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(v =>
      [v.customer_name, v.customer_email, v.customer_phone, v.brand, v.model]
        .filter(Boolean)
        .some(s => String(s).toLowerCase().includes(q))
    );
  }, [items, search]);

  const onStatusChange = (id, newStatus) => {
    setItems(prev => prev.map(x => (x.id === id ? { ...x, status: newStatus, __raw: { ...x.__raw, status: newStatus } } : x)));
  };

  const onCreateRepair = (prefill) => {
    navigate("/opret", { state: { prefillFromBooking: prefill } });
  };

  const selected = useMemo(
    () => items.find(it => it.id === selectedId) || null,
    [items, selectedId]
  );

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{ backgroundColor: "#2166AC", color: "white", padding: "0.6rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
        >
          <FaHome /> Dashboard
        </button>
      </div>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1rem" }}>
        Bookinger
      </h2>

      {/* Filterbar */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 10, background: "#f9f9f9", padding: "1rem 0",
          display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #ddd",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text" placeholder="Søg (navn, email, telefon, model)…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); if (page !== 1) setPage(1); }}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", width: 320 }}
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", width: 220 }}
        >
          <option value="">Alle</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={load} disabled={loading} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#2166AC", color: "#fff" }}>
          {loading ? "Opdaterer…" : "Opdater"}
        </button>

        <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <label>Vis pr. side</label>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setPage(1); }}
            style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6 }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr 1fr 1fr 160px 120px",
            gap: 8,
            padding: "10px 12px",
            background: "#f1f5f9",
            fontWeight: 600,
            color: "#334155",
          }}
        >
          <div>Dato/tid</div>
          <div>Kunde</div>
          <div>Kontakt</div>
          <div>Model / Reparation</div>
          <div>Status</div>
          <div>Pris / Tid</div>
        </div>

        {(filtered || []).map((v) => {
          const price = (v?.totals?.price ?? 0);
          const ttime = (v?.totals?.time ?? 0);
          const priceText = price > 0 ? `${price} kr` : "—";
          const timeText = `${ttime} min`;
          const st = STATUS_STYLES[v.status] || { bg: "#e5e7eb", text: "#111827" };

          return (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              style={{
                display: "grid",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "white",
                gridTemplateColumns: "160px 1fr 1fr 1fr 160px 120px",
                gap: 8,
                padding: "10px 12px",
                borderTop: "1px dashed #e5e7eb",
                cursor: "pointer",
                color: "#111827",
              }}
              title="Klik for at åbne"
            >
              <div style={{ color: "#64748b" }}>{formatDkDateTime(v.date, v.time)}</div>

              <div>{v.customer_name?.trim() ? v.customer_name : "—"}</div>

              <div style={{ color: "#64748b" }}>
                {[v.customer_phone, v.customer_email].filter(Boolean).join(" · ") || "—"}
              </div>

              <div>
                {v.model || "—"}
                {v.repairs?.length > 0 && (
                  <span style={{ color: "#64748b" }}>
                    {" — " + v.repairs.map(r => r.name || r.title).join(", ")}
                  </span>
                )}
              </div>

              <div>
                <span style={{
                  background: st.bg,
                  color: st.text,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 600
                }}>
                  {statusLabel(v.status)}
                </span>
              </div>

              <div>
                <b>{priceText}</b>
                <span style={{ color: "#64748b" }}> · {timeText}</span>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 16, color: "#6b7280" }}>Ingen bookinger fundet.</div>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{ background: page === 1 ? "#ccc" : "#2166AC", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px" }}
        >
          Forrige
        </button>
        <span>Side {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          style={{ background: "#2166AC", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px" }}
        >
          Næste
        </button>
        <span style={{ color: "#64748b" }}>{total} resultater</span>
      </div>

      {selected && (
        <BookingModal
          booking={selected.__raw || selected}
          onClose={() => setSelectedId(null)}
          onStatusChange={onStatusChange}
          onCreateRepair={onCreateRepair}
        />
      )}
    </div>
  );
}
