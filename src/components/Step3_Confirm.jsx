import React from "react";

export default function Step3_Confirm({ order, onBack, onFinish }) {
  const totalPrice = order.repairs.reduce((sum, r) => sum + r.price, 0);
  const totalTime = order.repairs.reduce((sum, r) => sum + r.time, 0);

  return (
    <div>
      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Bekræft ordre</h2>

      {/* Kundeoplysninger */}
      <div style={cardStyle}>
        <h4>Kunde</h4>
        <p><strong>{order.customer.name}</strong></p>
        <p>📞 {order.customer.phone}</p>
        {order.customer.extraPhone && <p>📱 Ekstra: {order.customer.extraPhone}</p>}
        <p>✉️ {order.customer.email}</p>
        <p>📝 {order.customer.notes}</p>
      </div>

      {/* Reparationer */}
      <div style={cardStyle}>
        <h4>Reparationer ({order.repairs.length})</h4>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {order.repairs.map((r, i) => (
            <li key={i} style={{ marginBottom: "0.5rem" }}>
              <strong>{r.device}</strong> – {r.repair} ({r.price} kr / {r.time} min)
            </li>
          ))}
        </ul>
        <p style={{ marginTop: "1rem" }}>
          <strong>Total:</strong> {totalPrice} kr / {totalTime} min
        </p>
      </div>

      {/* Handling */}
      <div style={{ marginTop: "2rem" }}>
        <button onClick={onBack} style={btnStyle}>⬅️ Tilbage</button>
        <button onClick={onFinish} style={{ ...btnStyle, backgroundColor: "#2166AC" }}>
          ✅ Opret ordre
        </button>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: "1.5rem",
  borderRadius: "10px",
  border: "1px solid #ccc",
  marginBottom: "1.5rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
};

const btnStyle = {
  backgroundColor: "#22b783",
  color: "white",
  padding: "0.6rem 1.5rem",
  borderRadius: "8px",
  border: "none",
  marginRight: "1rem"
};
