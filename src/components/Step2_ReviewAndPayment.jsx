// src/components/Step2_ReviewAndPayment.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaPhone, FaEnvelope, FaLock, FaStickyNote } from "react-icons/fa";
import { api } from "../data/apiClient";

export default function Step2_ReviewAndPayment({ order, onBack, onSubmit, setOrder }) {
  const navigate = useNavigate();

  // Betaling
  const [paymentType, setPaymentType] = useState(order.paymentType || "efter"); // "efter" | "betalt" | "depositum" | "garanti"
  const [depositAmount, setDepositAmount] = useState(order.depositAmount || "");

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Manuelt ordre-id (midlertidig løsning)
  const [manualIdEnabled, setManualIdEnabled] = useState(false);
  const [manualIdInput, setManualIdInput] = useState(
    (order?.id ?? "").toString()
  );

  // Samlet total
  const total = useMemo(
    () => (order?.repairs || []).reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [order?.repairs]
  );

  // Sørg for at payment state følger med order hvis siden reloades
  useEffect(() => {
    setPaymentType(order.paymentType || "efter");
    setDepositAmount(order.depositAmount || "");
  }, [order?.paymentType, order?.depositAmount]);

  const button = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.7rem 1.1rem",
    borderRadius: "8px",
    border: "1px solid #2166AC",
    cursor: "pointer",
    fontWeight: 600,
  };

  const ghost = {
    backgroundColor: "white",
    color: "#2166AC",
    padding: "0.7rem 1.1rem",
    borderRadius: "8px",
    border: "1px solid #2166AC",
    cursor: "pointer",
    fontWeight: 600,
  };

  const input = {
    width: "100%",
    padding: "0.6rem 0.7rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "0.95rem",
  };

  const canSubmit = useMemo(() => {
    if (!order?.id) return false;
    if (!Array.isArray(order?.repairs) || order.repairs.length === 0) return false;
    return true;
  }, [order?.id, order?.repairs]);

  // ---------- Manuel ordre-ID: gem indtastningen i order.id ----------
  function applyManualOrderId() {
    const raw = (manualIdInput || "").trim();
    if (!raw) {
      setError("Ordre-ID må ikke være tomt.");
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Ordre-ID skal være et positivt tal.");
      return;
    }
    // Opdater order.id og gem i localStorage for print-siden
    setOrder((prev) => ({ ...prev, id: num }));
    try {
      const last = JSON.parse(localStorage.getItem("tg_last_order") || "{}");
      localStorage.setItem("tg_last_order", JSON.stringify({ ...last, id: num }));
    } catch {}
    setError("");
    setOkMsg(`Ordre-ID sat til #${num}`);
    setTimeout(() => setOkMsg(""), 2000);
  }

  // ---------- Submit handler (opret reparation) ----------
  async function handleConfirm() {
    if (!canSubmit) return;

    setSaving(true);
    setError("");
    try {
      const payloads = (order.repairs || []).map((r) => ({
        title: `${order?.device || r.device || "Enhed"} – ${r.repair || "Reparation"}`,
        model_id: r.model_id || 0,
        price: Number(r.price) || 0,
        time: Number(r.time) || 0,
        device: order?.device || r.device || "",
        repair: r.repair || "",
        order_id: order.id, // ← VIGTIG: bruger (evt. manuelt) id
        customer_id: order?.customer?.id || 0,
        customer: order?.customer?.name || "",
        phone: order?.customer?.phone || "",
        contact: order?.contact || "",
        status: "Ny",
        note: (order?.note || "").trim(),
        payment: paymentType === "betalt" ? "Betalt" :
                 paymentType === "depositum" ? `Depositum ${depositAmount || 0}` :
                 paymentType === "garanti" ? "Garanti" : "Efter reparation",
        created_at: new Date().toISOString(),
      }));

      // Kald backend for hver reparation (simpelt; kan batches hvis du har et endpoint til flere ad gangen)
      for (const body of payloads) {
        await api.createRepair(body);
      }

      // Gem til print
      try {
        localStorage.setItem("tg_last_order", JSON.stringify(order));
        localStorage.setItem("tg_last_order_id", String(order.id));
      } catch {}

      setSaving(false);
      setOkMsg("Reparation oprettet");
      onSubmit?.();

      // Videre til print
      navigate(`/print/${order.id}`, { state: { order } });
    } catch (e) {
      setSaving(false);
      setError(e?.message || "Der gik noget galt ved oprettelse af reparationen.");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", padding: "2rem" }}>
      {/* Venstre: Oversigt / kvittering */}
      <div>
        <button onClick={() => navigate("/")} style={{ ...ghost, marginBottom: "1rem" }}>
          <FaHome style={{ marginRight: 8 }} /> Dashboard
        </button>

        <h2 style={{ marginTop: 0 }}>Oversigt</h2>

        {/* Manuelt ordre-ID (midlertidigt værktøj) */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={manualIdEnabled}
                onChange={(e) => setManualIdEnabled(e.target.checked)}
              />
              <strong>Manuelt ordre-ID</strong>
            </label>
            <span style={{ color: "#6b7280" }}>(midlertidigt – til at sætte startværdien)</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input
              style={{ ...input, opacity: manualIdEnabled ? 1 : 0.6 }}
              type="text"
              inputMode="numeric"
              placeholder="fx 42015"
              disabled={!manualIdEnabled}
              value={manualIdInput}
              onChange={(e) => setManualIdInput(e.target.value.replace(/[^\d]/g, ""))}
            />
            <button
              style={{ ...button, opacity: manualIdEnabled ? 1 : 0.6 }}
              disabled={!manualIdEnabled}
              onClick={applyManualOrderId}
            >
              Gem ordre-ID
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 14 }}>
            Aktuelt ordre-ID: <strong>#{order?.id || "—"}</strong>
          </div>
        </div>

        {/* Reparationslinjer */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem" }}>
          {(order?.repairs || []).map((r, idx) => (
            <div key={idx} style={{ padding: "0.6rem 0", borderBottom: idx < order.repairs.length - 1 ? "1px solid #eee" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{order?.device || r.device || "Enhed"}</div>
              <div style={{ color: "#374151", marginTop: 2 }}>{r.repair}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 6, color: "#111827" }}>
                <div><strong>Pris:</strong> {Number(r.price) || 0} kr</div>
                <div><strong>Tid:</strong> {Number(r.time) || 0} min</div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.8rem", fontSize: 18 }}>
            <strong>Total</strong>
            <strong>{total} kr</strong>
          </div>
        </div>

        {/* Kunde & noter */}
        <div style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Kunde</div>
          {order?.customer ? (
            <>
              <div><FaPhone /> {order.customer.phone || "—"}</div>
              <div><FaEnvelope /> {order.customer.email || "—"}</div>
            </>
          ) : (
            <div style={{ color: "#6b7280" }}>Ingen kunde valgt</div>
          )}
          <div style={{ marginTop: 10 }}><FaLock /> Adgangskode: <strong>{order?.password || "—"}</strong></div>
          <div style={{ marginTop: 6 }}><FaStickyNote /> Note: {order?.note || "—"}</div>
        </div>
      </div>

      {/* Højre: Betaling & handlinger */}
      <div>
        <h2 style={{ marginTop: 0 }}>Betaling</h2>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem" }}>
            <input
              type="radio"
              name="pay"
              checked={paymentType === "efter"}
              onChange={() => setPaymentType("efter")}
            />
            Efter reparation
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem" }}>
            <input
              type="radio"
              name="pay"
              checked={paymentType === "betalt"}
              onChange={() => setPaymentType("betalt")}
            />
            Betalt
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem" }}>
            <input
              type="radio"
              name="pay"
              checked={paymentType === "depositum"}
              onChange={() => setPaymentType("depositum")}
            />
            Delvis betalt (depositum)
          </label>
          {paymentType === "depositum" && (
            <input
              style={{ ...input, marginLeft: 34, width: "calc(100% - 34px)" }}
              placeholder="Depositum i kr."
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
          )}
          <label style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem" }}>
            <input
              type="radio"
              name="pay"
              checked={paymentType === "garanti"}
              onChange={() => setPaymentType("garanti")}
            />
            Garanti (ingen betaling)
          </label>
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 600 }}>{error}</div>
        )}
        {okMsg && (
          <div style={{ marginTop: 12, color: "#047857", fontWeight: 600 }}>{okMsg}</div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onBack} style={ghost}>Tilbage</button>
          <button
            onClick={handleConfirm}
            style={{ ...button, opacity: canSubmit ? 1 : 0.6 }}
            disabled={!canSubmit || saving}
          >
            {saving ? "Opretter…" : "Bekræft & print"}
          </button>
        </div>
      </div>
    </div>
  );
}
