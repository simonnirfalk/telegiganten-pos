import React from "react";

export default function RepairSlip({ order }) {
  const today = new Date().toLocaleDateString("da-DK");
  const total = order.repairs.reduce((sum, r) => sum + (r.price || 0), 0);

  return (
    <div className="receipt" style={{
      fontFamily: "Arial, sans-serif",
      padding: "2rem",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      {/* Logo og butiksinfo */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Telegiganten</h1>
        <p style={{ margin: 0 }}>Taastrup Hovedgade 123, 2630 Taastrup</p>
        <p style={{ margin: 0 }}>Tlf: 70 80 90 00 · kontakt@telegiganten.dk</p>
        <p style={{ marginTop: "0.3rem" }}>Åbent: Man–Fre 10–18, Lør 10–15</p>
      </div>

      {/* Ordreinfo */}
      <div style={{ marginBottom: "1.5rem", fontSize: "0.95rem" }}>
        <strong>Ordre-ID:</strong> #{order.id || "-"}<br />
        <strong>Dato:</strong> {today}
      </div>

      {/* Kundeinfo */}
      <div style={{ marginBottom: "1.5rem" }}>
        <strong>Kunde:</strong><br />
        {order.customer?.name}<br />
        {order.customer?.phone}<br />
        {order.customer?.email}
      </div>

      {/* Reparationer */}
      <div style={{ marginBottom: "1.5rem" }}>
        <strong>Reparation:</strong><br />
        {order.repairs.map((r, i) => (
          <div key={i} style={{ paddingBottom: "0.5rem" }}>
            <div><strong>{r.device}</strong></div>
            <div style={{ color: "#555" }}>{r.repair} • {r.price} kr • {r.time} min</div>
          </div>
        ))}
      </div>

      {/* Adgangskode og note */}
      <div style={{ marginBottom: "1.5rem" }}>
        <strong>Adgangskode:</strong> {order.password || "-"}<br />
        <strong>Note:</strong> {order.note || "-"}
      </div>

      {/* Pris */}
      <div style={{
        borderTop: "1px dashed #ccc",
        paddingTop: "1rem",
        fontWeight: "bold",
        fontSize: "1.1rem"
      }}>
        Total: {total} kr
      </div>
    </div>
  );
}
