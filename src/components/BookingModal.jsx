// src/components/BookingModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateBookingStatus } from "../data/apiClient";
import { api } from "../data/apiClient";

/* Dansk label mapping (samme som på BookingsPage) */
const STATUS_LABELS = {
  booking_pending: "Booket",
  booking_confirmed: "Bekræftet",
  booking_processing: "Under behandling",
  booking_completed: "Afsluttet",
  booking_canceled: "Annulleret",
};

const STATUS_OPTIONS = [
  { value: "booking_pending", label: "Booket" },
  { value: "booking_confirmed", label: "Bekræftet" },
  { value: "booking_processing", label: "Under behandling" },
  { value: "booking_completed", label: "Afsluttet" },
  { value: "booking_canceled", label: "Annulleret" },
];

// Helper som læser både normaliseret og rå (nested) booking
function getView(item) {
  // Customer
  const customer_name  = item.customer_name ?? item?.customer?.name ?? "";
  const customer_email = item.customer_email ?? item?.customer?.email ?? "";
  const customer_phone = item.customer_phone ?? item?.customer?.phone ?? "";

  // Selection / device
  const brand   = item.brand  ?? item?.selection?.brand?.title  ?? "";
  const model   = item.model  ?? item?.selection?.model?.title  ?? "";
  const model_id = item.model_id ?? item?.selection?.model?.id ?? 0;

  const repairs = Array.isArray(item.repairs)
    ? item.repairs
    : (Array.isArray(item?.selection?.repairs) ? item.selection.repairs : []);

  // Booking meta (dato/tid/levering/kommentar)
  const date = item.booking_date ?? item?.booking?.date ?? item.date ?? "";
  const time = item.booking_time ?? item?.booking?.time ?? item.time ?? "";
  const shipping_option = item.shipping_option ?? item?.booking?.shipping_option ?? "";
  const comment = item.comment ?? item?.booking?.comment ?? "";

  // Totals (supportér både nye nøgler og legacy)
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
    model_id,
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

/* Badge farver til status */
const statusBadgeStyle = (status) => {
  const m = {
    booking_pending:    { bg: "#e0ecff", color: "#1d4ed8" },
    booking_confirmed:  { bg: "#dcfce7", color: "#166534" },
    booking_processing: { bg: "#fff7ed", color: "#9a3412" },
    booking_completed:  { bg: "#e5e7eb", color: "#111827" },
    booking_canceled:   { bg: "#fee2e2", color: "#b91c1c" },
  }[status] || { bg: "#eef2ff", color: "#3730a3" };
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: m.bg,
    color: m.color,
    fontWeight: 600,
    fontSize: 12,
  };
};

export default function BookingModal({ booking, onClose, onStatusChange }) {
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  if (!booking) return null;

  const item = getView(booking);

  const setStatus = async (newStatus) => {
    setSaving(true);
    try {
      await updateBookingStatus({
        booking_id: item.id,
        status: newStatus,
        notify: newStatus === "booking_confirmed",
      });
      onStatusChange?.(item.id, newStatus);
    } catch (e) {
      console.error(e);
      alert("Kunne ikke opdatere status.");
    } finally {
      setSaving(false);
    }
  };

  /* NYT: Opret/”ensure” kunde, og navigér til Step1 med prefill */
  const handleCreateRepair = async () => {
    setCreating(true);
    try {
      // 1) Ensure customer in WP (find via phone -> ellers opret)
      const phone = item.customer_phone || "";
      let customer = null;
      if (phone) {
        try {
          customer = await api.getCustomerByPhone(phone); // { id, name, phone, email, repairs:[] }
        } catch {
          customer = null;
        }
      }
      if (!customer?.id) {
        const res = await api.createCustomer({
          name: item.customer_name || "Uden navn",
          phone: item.customer_phone || "",
          email: item.customer_email || "",
        }); // -> { status:'created'|'exists', customer_id }
        const cid = res?.customer_id || customer?.id || 0;
        customer = {
          id: cid,
          name: item.customer_name || "",
          phone: item.customer_phone || "",
          email: item.customer_email || "",
        };
      }

      // 2) Byg prefill og hop til Step1
      const prefillFromBooking = {
        booking_id: item.id,
        model_id: item.model_id || 0,
        model_title: item.model || "",
        repairs: (item.repairs || []).map(r => ({
          title: r?.name ?? r?.title ?? "",
          price: Number(r?.price || 0) || 0,
          time: Number(r?.time || 0) || 0,
        })),
        customer: {
          id: customer?.id || 0,
          name: customer?.name || "",
          phone: customer?.phone || "",
          email: customer?.email || "",
        },
        note: item.comment || "",
      };

      navigate("/opret", { state: { prefillFromBooking } });
    } catch (e) {
      console.error(e);
      alert("Kunne ikke forberede reparationen.");
    } finally {
      setCreating(false);
    }
  };

  const Row = ({ label, children }) => (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, marginBottom: 8 }}>
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div>{children}</div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 8, padding: 20, width: 720, maxWidth: "94%", maxHeight: "88vh", overflow: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Booking #{item.id}</h3>
          {/* blå luk-knap som aftalt */}
          <button
            onClick={onClose}
            style={{ border: "none", background: "#2166AC", color: "#fff", fontSize: 18, cursor: "pointer", width: 36, height: 36, borderRadius: 8 }}
            aria-label="Luk"
            title="Luk"
          >
            ✕
          </button>
        </div>

        <Row label="Status">
          <span style={statusBadgeStyle(item.status)}>{STATUS_LABELS[item.status] || item.status}</span>
        </Row>

        {/* Dropdown til statusændring */}
        <Row label="">
          <select
            value={item.status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={saving}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Row>

        <Row label="Dato/tid">
          <span>{item.date || "—"} {item.time ? `kl. ${item.time}` : ""}</span>
        </Row>

        <Row label="Levering">
          <span>{item.shipping_option === "shipment" ? "Forsendelse" : "Aflevering"}</span>
        </Row>

        <Row label="Enhed">
          <span>{item.model || "—"}</span>
        </Row>

        <Row label="Kunde">
          <div>
            <div>{item.customer_name || "—"}</div>
            <div style={{ color: "#6b7280" }}>
              {[item.customer_phone, item.customer_email].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </Row>

        <Row label="Reparation(er)">
          <div>
            {(item.repairs || []).map((r, idx) => (
              <div
                key={idx}
                style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #eee", padding: "6px 0" }}
              >
                <span>{r?.name ?? r?.title ?? "—"}</span>
                <span>{(r?.price ?? 0)} kr · {(r?.time ?? 0)} min</span>
              </div>
            ))}
          </div>
        </Row>

        <Row label="Total">
          <div>
            {item.totals.discount_pct ? (
              <div>
                <div style={{ color: "#6b7280", textDecoration: "line-through" }}>
                  {item.totals.price_before} kr
                </div>
                <div>
                  <b>{item.totals.price} kr</b> ({item.totals.discount_pct}% rabat) · {item.totals.time} min
                </div>
              </div>
            ) : (
              <div>
                <b>{item.totals.price} kr</b> · {item.totals.time} min
              </div>
            )}
          </div>
        </Row>

        {item.comment && (
          <Row label="Kommentar">
            <div style={{ whiteSpace: "pre-wrap" }}>{item.comment}</div>
          </Row>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={handleCreateRepair}
            disabled={creating}
            style={{ background: "#22b783", color: "#fff", border: "none", borderRadius: 6, padding: "10px 14px", cursor: creating ? "wait" : "pointer" }}
            title="Opretter/forbereder reparation i Step1 med data fra bookingen"
          >
            {creating ? "Opretter…" : "Opret reparation"}
          </button>
        </div>
      </div>
    </div>
  );
}
