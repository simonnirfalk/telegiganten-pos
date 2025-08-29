// src/components/BookingModal.jsx
import React, { useState } from "react";
import { updateBookingStatus, createRepairFromBooking } from "../data/apiClient";

const STATUS_LABELS = {
  booking_pending: "Pending",
  booking_confirmed: "Confirmed",
  booking_processing: "Processing",
  booking_completed: "Completed",
  booking_canceled: "Canceled",
};

// Helper der læser både normaliseret og rå (nested) booking
function getView(item) {
  // Customer
  const customer_name  = item.customer_name ?? item?.customer?.name ?? "";
  const customer_email = item.customer_email ?? item?.customer?.email ?? "";
  const customer_phone = item.customer_phone ?? item?.customer?.phone ?? "";

  // Selection / device
  const brand  = item.brand  ?? item?.selection?.brand?.title  ?? "";
  const model  = item.model  ?? item?.selection?.model?.title  ?? "";
  const repairs =
    Array.isArray(item.repairs)
      ? item.repairs
      : (Array.isArray(item?.selection?.repairs) ? item.selection.repairs : []);

  // Booking meta (dato/tid/levering/kommentar)
  const date = item.booking_date ?? item?.booking?.date ?? item.date ?? "";
  const time = item.booking_time ?? item?.booking?.time ?? item.time ?? "";
  const shipping_option =
    item.shipping_option ?? item?.booking?.shipping_option ?? "";
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

export default function BookingModal({ booking, onClose, onStatusChange, onCreateRepair }) {
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
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

  const handleCreateRepair = async () => {
    setCreating(true);
    try {
      const res = await createRepairFromBooking(booking); // send original (funktionen håndterer begge shapes)
      onCreateRepair?.(res);
    } catch (e) {
      console.error(e);
      alert("Kunne ikke oprette reparation.");
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
          <button onClick={onClose} style={{ border: "none", background: "#2166AC", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <Row label="Status">
          <span style={{ fontWeight: 600 }}>{STATUS_LABELS[item.status] || item.status}</span>
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
                <span>{r?.name ?? "—"}</span>
                <span>
                  {(r?.price ?? 0)} kr · {(r?.time ?? 0)} min
                </span>
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

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={saving} onClick={() => setStatus("booking_pending")}   style={{ padding: "8px 12px" }}>Pending</button>
            <button disabled={saving} onClick={() => setStatus("booking_confirmed")} style={{ padding: "8px 12px", background: "#33cccc", color: "#fff", border: "none", borderRadius: 6 }}>Confirmér</button>
            <button disabled={saving} onClick={() => setStatus("booking_processing")} style={{ padding: "8px 12px" }}>Processing</button>
            <button disabled={saving} onClick={() => setStatus("booking_completed")}  style={{ padding: "8px 12px" }}>Completed</button>
            <button disabled={saving} onClick={() => setStatus("booking_canceled")}   style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6 }}>Annullér</button>
          </div>

          <button
            onClick={handleCreateRepair}
            disabled={creating}
            style={{ background: "#22b783", color: "#fff", border: "none", borderRadius: 6, padding: "10px 14px", cursor: creating ? "wait" : "pointer" }}
            title="Opretter en reparationskladde i Step1 med alle data fra bookingen"
          >
            {creating ? "Opretter…" : "Opret reparation"}
          </button>
        </div>
      </div>
    </div>
  );
}
