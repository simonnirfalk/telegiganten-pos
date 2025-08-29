import React from "react";

export default function DashboardRecentBookings({ items = [], onOpen }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "10px 12px", background: "#f1f5f9", fontWeight: 600 }}>Seneste bookinger</div>
      {items.length === 0 && <div style={{ padding: 12, color: "#6b7280" }}>Ingen bookinger.</div>}
      {items.slice(0, 6).map((b) => (
        <button
          key={b.id}
          onClick={() => onOpen?.(b)}
          style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8, padding: "10px 12px",
                   border: "none", background: "white", borderTop: "1px dashed #e5e7eb", textAlign: "left", cursor: "pointer" }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{b.customer_name || "—"}</div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>{[b.brand, b.model].filter(Boolean).join(" ")}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><b>{b?.totals?.total_price ?? 0} kr</b></div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>{(b.status || "").replace("booking_","")}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
