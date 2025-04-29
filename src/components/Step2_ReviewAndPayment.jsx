import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";

export default function Step2_ReviewAndPayment({ order, onBack, onSubmit }) {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState("efter");
  const [depositAmount, setDepositAmount] = useState("");

  const totalPrice = order.repairs.reduce((sum, r) => sum + (r.price || 0), 0);
  const remaining = Math.max(totalPrice - parseInt(depositAmount || 0, 10), 0);

  const inputStyle = {
    width: "100%",
    marginBottom: "0.5rem",
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "0.9rem"
  };

  const sectionStyle = {
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #eee"
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Venstre kolonne */}
      <div style={{ flex: 1, padding: "2rem", overflowY: "auto", backgroundColor: "#fff" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#2166AC",
            color: "white",
            padding: "0.4rem 1rem",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "2rem"
          }}
        >
          <FaHome /> Dashboard
        </button>

        <h2 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1rem" }}>Gennemgå og bekræft</h2>

        {/* Reparationer */}
        <div style={sectionStyle}>
          <h4 style={{ marginBottom: "0.5rem" }}>🔧 Reparation</h4>
          {order.repairs.map((r, i) => (
            <div key={i} style={{ marginBottom: "0.5rem" }}>
              <strong>{r.device}</strong><br />
              {r.repair} • {r.price} kr • {r.time} min
            </div>
          ))}
          <p><strong>Samlet:</strong> {totalPrice} kr</p>
        </div>

        {/* Kundeinfo */}
        <div style={sectionStyle}>
          <h4 style={{ marginBottom: "0.5rem" }}>👤 Kunde</h4>
          {order.customer ? (
            <>
              <strong>{order.customer.name}</strong><br />
              📞 {order.customer.phone}<br />
              ✉️ {order.customer.email || "-"}
            </>
          ) : (
            <p style={{ color: "red" }}>Ingen kunde valgt</p>
          )}
        </div>

        {/* Adgangskode og note */}
        <div style={sectionStyle}>
          <h4>🔒 Adgangskode</h4>
          <p>{order.password || "-"}</p>

          <h4>📝 Note</h4>
          <p>{order.note || "-"}</p>
        </div>
      </div>

      {/* Højre kolonne */}
      <div style={{
        width: "400px",
        padding: "2rem",
        borderLeft: "1px solid #ddd",
        backgroundColor: "#f9f9f9",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}>
        <div>
          <h3 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Betaling</h3>

          <div style={{ marginTop: "1rem" }}>
            <label>
              <input
                type="radio"
                name="payment"
                value="efter"
                checked={paymentType === "efter"}
                onChange={() => setPaymentType("efter")}
              />{" "}
              Betaling efter reparation
            </label><br />
            <label>
              <input
                type="radio"
                name="payment"
                value="betalt"
                checked={paymentType === "betalt"}
                onChange={() => setPaymentType("betalt")}
              />{" "}
              Allerede betalt
            </label><br />
            <label>
              <input
                type="radio"
                name="payment"
                value="depositum"
                checked={paymentType === "depositum"}
                onChange={() => setPaymentType("depositum")}
              />{" "}
              Delvis betalt (depositum)
            </label><br />
            <label>
              <input
                type="radio"
                name="payment"
                value="garanti"
                checked={paymentType === "garanti"}
                onChange={() => setPaymentType("garanti")}
              />{" "}
              Garanti (ingen betaling)
            </label>

            {paymentType === "depositum" && (
              <div style={{ marginTop: "1rem" }}>
                <label><strong>Beløb forudbetalt:</strong></label>
                <input
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={inputStyle}
                />
                <p><strong>Mangler:</strong> {remaining} kr</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: "2rem" }}>
            <p>
              <strong>Total:</strong>{" "}
              {paymentType === "garanti" ? "Garanti" : `${totalPrice} kr`}
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={onSubmit}
            style={{
              backgroundColor: "#22b783",
              color: "white",
              padding: "1rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "bold",
              border: "none",
              width: "100%",
              marginTop: "2rem"
            }}
          >
            Opret og print
          </button>
        </div>
      </div>
    </div>
  );
}
