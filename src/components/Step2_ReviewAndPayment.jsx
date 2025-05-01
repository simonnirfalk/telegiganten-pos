import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaPhone,
  FaEnvelope,
  FaLock,
  FaStickyNote
} from "react-icons/fa";
import RepairSlip from "./RepairSlip";


export default function Step2_ReviewAndPayment({ order, onBack, onSubmit }) {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState("efter");
  const [depositAmount, setDepositAmount] = useState("");
  const [showSlip, setShowSlip] = useState(false);

  const handleSubmitAndPrint = () => {
    setShowSlip(true);
  
    setTimeout(() => {
      window.print();
      setShowSlip(false);
      onSubmit(); // evt. gem ordre
    }, 300);
  };
  
  const totalPrice = order.repairs.reduce((sum, r) => sum + (r.price || 0), 0);
  const remaining = Math.max(totalPrice - parseInt(depositAmount || 0, 10), 0);
  const today = new Date().toLocaleDateString("da-DK");

  const cardStyle = (active) => ({
    border: active ? "2px solid #2166AC" : "1px solid #ddd",
    backgroundColor: active ? "#2166AC" : "#fff",
    color: active ? "#fff" : "#000",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "1rem",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    transition: "all 0.2s ease"
    
  });

  return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Venstre side – kvittering */}
      <div
        style={{
          flex: 1,
          padding: "2rem",
          backgroundColor: "#f5f5f5",
          overflowY: "auto"
        }}
      >
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

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1.5rem"
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontWeight: "bold" }}>👤 Kunde</h4>
              <p style={{ margin: 0 }}>{order.customer?.name || "-"}</p>
              <p style={{ margin: 0 }}>
                <FaPhone style={{ marginRight: "0.5rem" }} />
                {order.customer?.phone || "-"}
              </p>
              <p style={{ margin: 0 }}>
                <FaEnvelope style={{ marginRight: "0.5rem" }} />
                {order.customer?.email || "-"}
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.9rem", color: "#555" }}>
              <p style={{ margin: 0 }}>Dato: {today}</p>
              <p style={{ margin: 0 }}>Ordre-ID: #{order.id || "–"}</p>
            </div>
          </div>

          <hr style={{ margin: "1.5rem 0" }} />

          <div>
            <h4 style={{ fontWeight: "bold" }}>🔧 Reparation</h4>
            {order.repairs.map((r, i) => (
              <div
                key={i}
                style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}
              >
                <strong>{r.device}</strong>
                <br />
                <span style={{ color: "#555" }}>
                  {r.repair} • {r.price} kr • {r.time} min
                </span>
              </div>
            ))}
            <div style={{ marginTop: "1rem", fontWeight: "bold" }}>
              Samlet: {totalPrice} kr
            </div>
          </div>

          <hr style={{ margin: "1.5rem 0" }} />

          <div>
            <h4 style={{ fontWeight: "bold" }}>
              <FaLock style={{ marginRight: "0.5rem" }} />
              Adgangskode
            </h4>
            <p>{order.password || "-"}</p>

            <h4 style={{ fontWeight: "bold" }}>
              <FaStickyNote style={{ marginRight: "0.5rem" }} />
              Note
            </h4>
            <p>{order.note || "-"}</p>
          </div>
        </div>
      </div>

      {/* Højre side – betalingsvalg */}
      <div
        style={{
          flex: 1,
          padding: "2rem",
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
          <h3
            style={{
              textTransform: "uppercase",
              fontWeight: "bold",
              marginBottom: "1.5rem"
            }}
          >
            Betaling
          </h3>

          {/* Kortvalg */}
          <div
            onClick={() => setPaymentType("efter")}
            style={cardStyle(paymentType === "efter")}
          >
            Betaling efter reparation
            <br />
            <small>{totalPrice} kr</small>
          </div>

          <div
            onClick={() => setPaymentType("betalt")}
            style={cardStyle(paymentType === "betalt")}
          >
            Allerede betalt
            <br />
            <small>{totalPrice} kr</small>
          </div>

          <div
            onClick={() => setPaymentType("depositum")}
            style={cardStyle(paymentType === "depositum")}
          >
            Delvis betalt (depositum)
            <br />
            <small>Indtast forudbetalt beløb nedenfor</small>
          </div>

          {paymentType === "depositum" && (
            <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
              <label>
                <strong>Beløb forudbetalt:</strong>
              </label>
              <input
                type="number"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  marginTop: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #ccc"
                }}
              />
              <p style={{ marginTop: "0.5rem" }}>
                <strong>Mangler:</strong> {remaining} kr
              </p>
            </div>
          )}

          <div
            onClick={() => setPaymentType("garanti")}
            style={cardStyle(paymentType === "garanti")}
          >
            Garanti (ingen betaling)
          </div>

          {/* Totalvisning */}
          <div style={{ marginTop: "2rem", fontWeight: "bold" }}>
            <p>
              Total:{" "}
              {paymentType === "garanti"
                ? "Garanti"
                : paymentType === "depositum"
                ? `${remaining} kr tilbage`
                : `${totalPrice} kr`}
            </p>
          </div>
        </div>

{/* Knap */}
<div>
  <button
    onClick={handleSubmitAndPrint} // ← BRUG DEN NYE FUNKTION HER
    style={{
      backgroundColor: "#22b783",
      color: "white",
      padding: "1rem",
      borderRadius: "8px",
      fontSize: "1rem",
      fontWeight: "bold",
      border: "none",
      width: "100%"
    }}
  >
    Opret og print
  </button>
</div>

      </div>
      <div style={{ marginTop: "3rem" }}>
  <RepairSlip order={order} />
</div>
{showSlip && <RepairSlip order={{ ...order, payment: paymentType }} />}
    </div>
  );
}
