import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaPhone,
  FaEnvelope,
  FaLock,
  FaStickyNote
} from "react-icons/fa";

export default function Step2_ReviewAndPayment({ order, onBack, onSubmit, setOrder }) {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState("efter");
  const [depositAmount, setDepositAmount] = useState("");

  const totalPrice = order.repairs.reduce((sum, r) => sum + (r.price || 0), 0);
  const remaining = Math.max(totalPrice - parseInt(depositAmount || 0, 10), 0);
  const today = new Date().toLocaleDateString("da-DK");

  const saveRepairsToWordPress = async () => {
    const updatedRepairs = [];

    for (const r of order.repairs) {
      try {
        const response = await fetch("https://telegiganten.dk/wp-json/telegiganten/v1/create-repair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: r.repair,
            device: r.device,
            price: r.price,
            time: r.time,
            model_id: r.model_id,
            order_id: order.id,
            customer_id: order.customer?.id || null  // 👈 Dette manglede
          })
        });
        const result = await response.json();
        if (result.status === "created" && result.repair_id) {
          updatedRepairs.push({ ...r, id: result.repair_id });
        } else {
          console.warn("Uventet svar:", result);
          updatedRepairs.push(r);
        }
      } catch (error) {
        console.error("Fejl ved gem af reparation:", error);
        updatedRepairs.push(r);
      }
    }
    

    setOrder((prev) => ({ ...prev, repairs: updatedRepairs }));
  };

  const handleSubmitAndPrint = async () => {
    await saveRepairsToWordPress();

    const receiptWindow = window.open("", "_blank", "width=800,height=600");
    const receiptHtml = `
      <html>
        <head>
          <title>Reparationskvittering</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 2rem;
            }
            h1 { margin: 0; }
            .line { border-top: 1px dashed #ccc; margin: 1rem 0; }
            svg { margin-top: 1rem; }
          </style>
        </head>
        <body>
          <h1>Telegiganten</h1>
          <p>Taastrup Hovedgade 123, 2630 Taastrup<br />
          Tlf: 70 80 90 00 · kontakt@telegiganten.dk<br />
          Åbent: Man–Fre 10–18, Lør 10–15</p>

          <div class="line"></div>

          <p><strong>Ordre-ID:</strong> #${order.id || "-"}<br />
          <strong>Dato:</strong> ${new Date().toLocaleDateString("da-DK")}</p>

          <div class="line"></div>

          <p><strong>Kunde:</strong><br />
          ${order.customer?.name || "-"}<br />
          ${order.customer?.phone || "-"}<br />
          ${order.customer?.email || "-"}</p>

          <div class="line"></div>

          <p><strong>Reparation:</strong><br />
          ${order.repairs.map(r => `
            <div>
              <strong>#${r.id || "-"} – ${r.device}</strong><br />
              ${r.repair} · ${r.price} kr · ${r.time} min
            </div>
          `).join("<br />")}
          </p>

          <div class="line"></div>

          <p><strong>Adgangskode:</strong> ${order.password || "-"}<br />
          <strong>Note:</strong> ${order.note || "-"}</p>

          <div class="line"></div>

          <p><strong>Total:</strong> ${order.repairs.reduce((sum, r) => sum + (r.price || 0), 0)} kr</p>

          <svg id="barcode"></svg>

          <script>
            window.onload = function() {
              JsBarcode("#barcode", "${order.id || "00000"}", {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 50,
                displayValue: true
              });
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();

    onSubmit();
  };

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
      <div style={{ flex: 1, padding: "2rem", backgroundColor: "#f5f5f5", overflowY: "auto" }}>
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

        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <h4 style={{ margin: 0, fontWeight: "bold" }}>👤 Kunde</h4>
              <p style={{ margin: 0 }}>{order.customer?.name || "-"}</p>
              <p style={{ margin: 0 }}><FaPhone style={{ marginRight: "0.5rem" }} />{order.customer?.phone || "-"}</p>
              <p style={{ margin: 0 }}><FaEnvelope style={{ marginRight: "0.5rem" }} />{order.customer?.email || "-"}</p>
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
              <div key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <strong>#{r.id || "-"} – {r.device}</strong><br />
                <span style={{ color: "#555" }}>{r.repair} • {r.price} kr • {r.time} min</span>
              </div>
            ))}
            <div style={{ marginTop: "1rem", fontWeight: "bold" }}>
              Samlet: {totalPrice} kr
            </div>
          </div>

          <hr style={{ margin: "1.5rem 0" }} />

          <div>
            <h4 style={{ fontWeight: "bold" }}><FaLock style={{ marginRight: "0.5rem" }} />Adgangskode</h4>
            <p>{order.password || "-"}</p>
            <h4 style={{ fontWeight: "bold" }}><FaStickyNote style={{ marginRight: "0.5rem" }} />Note</h4>
            <p>{order.note || "-"}</p>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        padding: "2rem",
        backgroundColor: "#f9f9f9",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}>
        <div>
          <h3 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1.5rem" }}>Betaling</h3>

          <div onClick={() => setPaymentType("efter")} style={cardStyle(paymentType === "efter")}>Betaling efter reparation<br /><small>{totalPrice} kr</small></div>
          <div onClick={() => setPaymentType("betalt")} style={cardStyle(paymentType === "betalt")}>Allerede betalt<br /><small>{totalPrice} kr</small></div>
          <div onClick={() => setPaymentType("depositum")} style={cardStyle(paymentType === "depositum")}>Delvis betalt (depositum)<br /><small>Indtast forudbetalt beløb nedenfor</small></div>

          {paymentType === "depositum" && (
            <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
              <label><strong>Beløb forudbetalt:</strong></label>
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
              <p style={{ marginTop: "0.5rem" }}><strong>Mangler:</strong> {remaining} kr</p>
            </div>
          )}

          <div onClick={() => setPaymentType("garanti")} style={cardStyle(paymentType === "garanti")}>Garanti (ingen betaling)</div>

          <div style={{ marginTop: "2rem", fontWeight: "bold" }}>
            <p>
              Total: {paymentType === "garanti" ? "Garanti" : paymentType === "depositum" ? `${remaining} kr tilbage` : `${totalPrice} kr`}
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={handleSubmitAndPrint}
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
    </div>
  );
}
