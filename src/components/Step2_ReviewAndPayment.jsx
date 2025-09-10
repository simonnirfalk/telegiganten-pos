// src/components/Step2_ReviewAndPayment.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaPhone, FaEnvelope, FaLock, FaStickyNote } from "react-icons/fa";
import { api } from "../data/apiClient";

export default function Step2_ReviewAndPayment({ order, onBack, onSubmit, setOrder }) {
  const navigate = useNavigate();

  const [paymentType, setPaymentType] = useState(order.paymentType || "efter"); // "efter" | "betalt" | "depositum" | "garanti"
  const [depositAmount, setDepositAmount] = useState(order.depositAmount || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(
    () => (order?.repairs || []).reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [order?.repairs]
  );
  const totalFormatted = useMemo(() => Number(total).toLocaleString("da-DK"), [total]);
  const today = useMemo(() => new Date().toLocaleDateString("da-DK"), []);
  const createdAtISO = useMemo(() => new Date().toISOString(), []);

  const numericDeposit = Number(depositAmount || 0);
  const remaining = Math.max(total - (isNaN(numericDeposit) ? 0 : numericDeposit), 0);

  const canSubmit =
    !saving &&
    (order?.repairs?.length || 0) > 0 &&
    !!order?.customer?.id &&
    !!order?.id;

  function paymentText() {
    if (paymentType === "garanti") return "Garanti (ingen betaling)";
    if (paymentType === "betalt") return `Betalt: ${totalFormatted} kr`;
    if (paymentType === "depositum") {
      return `Depositum: ${numericDeposit} kr — Mangler: ${remaining} kr`;
    }
    return `Betaling efter reparation: ${totalFormatted} kr`;
  }

  /**
   * NY IMPLEMENTATION:
   * Opret ÉN reparationspost (master) med alle linjer i meta,
   * i stedet for én post pr. linje.
   */
  async function saveRepairsToWordPress() {
    const lines = (order.repairs || []).map((r) => {
      const part = r.part || null;
      return {
        device: r.device,
        repair: r.repair,
        price: Number(r.price) || 0,
        time: Number(r.time) || 0,
        model_id: r.model_id || 0,
        part: part
          ? {
              id: part.id ?? part.ID ?? null,
              model: part.model ?? "",
              stock: Number(part.stock ?? 0),
              location: part.location ?? "",
              category: part.category ?? "",
              repair: part.repair ?? "",
            }
          : null,
      };
    });

    const totalPrice = lines.reduce((s, l) => s + (Number(l.price) || 0), 0);
    const totalTime  = lines.reduce((s, l) => s + (Number(l.time)  || 0), 0);
    const firstDevice = lines[0]?.device || "";
    const repairSummary = lines.map((l) => l.repair).filter(Boolean).join(", ");

    const metaPayload = {
      lines_count: lines.length,
      // to be safe on WP side, send both object and JSON string:
      lines,                          // hvis backend kan gemme arrays
      lines_json: JSON.stringify(lines), // hvis backend forventer strenge
    };

    const title = `${order.id} • ${order.customer?.name || ""} • ${firstDevice}${repairSummary ? " — " + repairSummary : ""}`;

    // 1) Opret master-reparation
    const createRes = await api.createRepair({
      title,
      // aggregeret “hoved”-reparation
      repair: repairSummary || "Flere reparationer",
      device: firstDevice,
      price: Number(totalPrice) || 0,
      time: Number(totalTime) || 0,
      model_id: lines[0]?.model_id || 0,

      order_id: order.id,
      customer_id: order.customer?.id || 0,

      status: "under reparation",
      payment_type: paymentType,
      payment_total: Number(total) || 0,
      deposit_amount: paymentType === "depositum" ? (Number(depositAmount) || 0) : 0,
      remaining_amount: paymentType === "depositum" ? remaining : 0,
      payment: paymentText(),

      password: order.password || "",
      note: order.note || "",
      contact: order.contact || "",
      customer: order.customer?.name || "",
      phone: order.customer?.phone || "",

      meta: metaPayload,
    });

    if (!createRes || createRes.status !== "created" || !createRes.repair_id) {
      throw new Error("Opret reparation fejlede.");
    }

    const masterRepairId = createRes.repair_id;

    // 2) Opdater + historik (aggregerede felter + gem meta igen for en sikkerheds skyld)
    const fields = {
      status: "under reparation",
      payment_type: paymentType,
      payment_total: Number(total) || 0,
      deposit_amount: paymentType === "depositum" ? (Number(depositAmount) || 0) : 0,
      remaining_amount: paymentType === "depositum" ? remaining : 0,
      payment: paymentText(),
      created_at: createdAtISO,

      // aggregeret “hoved”-reparation
      repair: repairSummary || "Flere reparationer",
      device: firstDevice,
      price: Number(totalPrice) || 0,
      time: Number(totalTime) || 0,

      password: order.password || "",
      note: order.note || "",
      contact: order.contact || "",
      customer: order.customer?.name || "",
      phone: order.customer?.phone || "",
    };

    await api.updateRepairWithHistory({
      repair_id: masterRepairId,
      fields,
      meta: metaPayload,
    });

    // Gem master id i state (vi beholder dine linjer uændret til print osv.)
    setOrder((prev) => ({
      ...prev,
      paymentType,
      depositAmount,
      masterRepairId,
      // behold prev.repairs som er linjerne
    }));

    return masterRepairId;
  }

  async function handleConfirm() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    try {
      const masterRepairId = await saveRepairsToWordPress();

      const cleanOrder = {
        id: order.id,
        today,
        created_at: createdAtISO,
        customer: order.customer,
        repairs: order.repairs,               // behold alle linjer til slip
        password: order.password || "",
        note: order.note || "",
        contact: order.contact || "",
        total,
        payment: { method: paymentType, upfront: Number(depositAmount) || 0 },
        masterRepairId,                       // nyttigt hvis man skal slå ordren op igen
      };

      try { localStorage.setItem("tg_last_order", JSON.stringify(cleanOrder)); } catch {}

      navigate(`/print-slip/${order.id}`, { state: { order: cleanOrder }, replace: true });

      if (typeof onSubmit === "function") onSubmit();
    } catch (e) {
      console.error(e);
      setError("Der opstod en fejl under gem af reparationen.");
    } finally {
      setSaving(false);
    }
  }

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
      {/* Venstre: oversigt */}
      <div style={{ flex: 1, padding: "2rem", backgroundColor: "#f5f5f5", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
          <button
            onClick={() => (onBack ? onBack() : navigate(-1))}
            style={{
              backgroundColor: "#f0f0f0",
              color: "#333",
              padding: "0.4rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer"
            }}
            disabled={saving}
          >
            ← Tilbage
          </button>

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
              gap: "0.5rem"
            }}
          >
            <FaHome /> Dashboard
          </button>
        </div>

        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <h4 style={{ margin: 0, fontWeight: "bold" }}>👤 Kunde</h4>
              <p style={{ margin: 0 }}>{order.customer?.name || "-"}</p>
              <p style={{ margin: 0 }}><FaPhone style={{ marginRight: "0.5rem" }} />{order.customer?.phone || "-"}</p>
              <p style={{ margin: 0 }}><FaEnvelope style={{ marginRight: "0.5rem" }} />{order.customer?.email || "-"}</p>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.9rem", color: "rgb(85,85,85)" }}>
              <p style={{ margin: 0 }}>Dato: {today}</p>
              <p style={{ margin: 0 }}>Ordre-ID: #{order.id || "–"}</p>
            </div>
          </div>

          <hr style={{ margin: "1.5rem 0" }} />

          <div>
            <h4 style={{ fontWeight: "bold" }}>🔧 Reparation</h4>

            {(order.repairs || []).map((r, i) => {
              const part = r.part || null;
              return (
                <div key={i} style={{ padding: "0.75rem 0", borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                    <div>
                      <strong>{r.device}</strong><br />
                      <span style={{ color: "#555" }}>{r.repair} • {r.price} kr • {r.time} min</span>

                      <div style={{ marginTop: 6, fontSize: 13, color: "#223" }}>
                        {part ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            <span style={{ fontWeight: 600 }}>{part.model}</span>
                            <span style={{ padding: "2px 6px", background: "#eef6ff" }}>
                              Lager: {part.stock ?? "—"}
                            </span>
                            {part.location && (
                              <span style={{ padding: "2px 6px", background: "#f1f5f9" }}>
                                {part.location}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#6b7280" }}>(ingen reservedel valgt)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: "1rem", fontWeight: "bold" }}>
              Samlet: {totalFormatted} kr
            </div>
          </div>

          <hr style={{ margin: "1.5rem 0" }} />

          {/* Kontakt sammen med Adgangskode & Note */}
          <div>
            <h4 style={{ fontWeight: "bold" }}><FaLock style={{ marginRight: "0.5rem" }} />Adgangskode & Note</h4>
            <p><strong>Adgangskode:</strong> {order.password || "-"}</p>
            <p><strong>Kontakt:</strong> {order.contact || "-"}</p>
            <p><strong>Note:</strong> {order.note || "-"}</p>
          </div>

          {error && (
            <div style={{ marginTop: "1rem", color: "#b00020", fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Højre: betaling + opret/print */}
      <div
        style={{
          flex: 1,
          padding: "2rem",
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}
      >
        <div>
          <h3 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1.5rem" }}>Betaling</h3>

          <div onClick={() => setPaymentType("efter")} style={cardStyle(paymentType === "efter")}>
            Betaling efter reparation<br /><small>{totalFormatted} kr</small>
          </div>
          <div onClick={() => setPaymentType("betalt")} style={cardStyle(paymentType === "betalt")}>
            Allerede betalt<br /><small>{totalFormatted} kr</small>
          </div>
          <div onClick={() => setPaymentType("depositum")} style={cardStyle(paymentType === "depositum")}>
            Delvis betalt (depositum)<br /><small>Indtast forudbetalt beløb nedenfor</small>
          </div>

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

          <div onClick={() => setPaymentType("garanti")} style={cardStyle(paymentType === "garanti")}>
            Garanti (ingen betaling)
          </div>

          {/* Knappen står nu lige under betalingsvalg */}
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            style={{
              marginTop: "1rem",
              backgroundColor: canSubmit ? "#22b783" : "#9bdac5",
              color: "white",
              padding: "1rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "bold",
              border: "none",
              width: "100%",
              cursor: canSubmit ? "pointer" : "not-allowed"
            }}
          >
            {saving ? "Opretter..." : "Bekræft og print"}
          </button>
        </div>
      </div>
    </div>
  );
}