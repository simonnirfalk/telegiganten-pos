import React from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaArrowLeft, FaCheck } from "react-icons/fa";

export default function Step3_Confirm({ order, onBack, onFinish }) {
  const navigate = useNavigate();

  const totalPrice = order.repairs.reduce((sum, r) => sum + r.price, 0);
  const totalTime = order.repairs.reduce((sum, r) => sum + r.time, 0);

  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1.5rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem"
  };

  const greenButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#22b783"
  };

  return (
    <div>
      {/* Topbar med dashboard */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, marginRight: "auto" }}>
          <FaHome /> Dashboard
        </button>
      </div>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Bekræft ordre</h2>

      <div style={{
        background: "#fff",
        padding: "1rem",
        borderRadius: "10px",
        border: "1px solid #ddd",
        maxWidth: "600px",
        marginBottom: "2rem"
      }}>
        <h3>📱 Reparationer</h3>
        {order.repairs.map((r, i) => (
          <div key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
            <strong>{r.device}</strong><br />
            {r.repair} – {r.price} kr / {r.time} min
          </div>
        ))}
        <p style={{ marginTop: "1rem" }}><strong>Samlet:</strong> {totalPrice} kr • {totalTime} min</p>

        <h3 style={{ marginTop: "2rem" }}>👤 Kunde</h3>
        {order.customer ? (
          <div>
            <p><strong>{order.customer.name}</strong></p>
            <p>{order.customer.phone}</p>
            <p>{order.customer.email}</p>
            {order.customer.extraPhone && <p>Ekstra nummer: {order.customer.extraPhone}</p>}
            {order.customer.notes && <p><em>{order.customer.notes}</em></p>}
          </div>
        ) : (
          <p style={{ color: "red" }}>Ingen kunde tilføjet!</p>
        )}
      </div>

      <button onClick={onBack} style={{ ...buttonStyle, marginRight: "1rem" }}>
        <FaArrowLeft /> Tilbage
      </button>
      <button onClick={onFinish} style={greenButtonStyle}>
        <FaCheck /> Bekræft og opret reparation
      </button>
    </div>
  );
}
