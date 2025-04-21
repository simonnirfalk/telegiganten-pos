// src/components/Step4_Confirm.jsx
import React from "react";

export default function Step4_Confirm({
  selectedDevice,
  selectedRepair,
  selectedCustomer,
  onBack,
  onSubmit
}) {
  return (
    <div>
      <h3 style={{ fontWeight: "bold" }}>4. Bekræft reparation</h3>

      <p><strong>Model:</strong> {selectedDevice?.name}</p>
      <p><strong>Reparation:</strong> {selectedRepair?.name} – {selectedRepair?.price} kr ({selectedRepair?.time})</p>
      <p><strong>Kunde:</strong> {selectedCustomer?.name} ({selectedCustomer?.phone})</p>
      <p><strong>E-mail:</strong> {selectedCustomer?.email}</p>
      <p><strong>Kommentar:</strong> {selectedCustomer?.notes}</p>

      <div style={{ marginTop: "2rem" }}>
        <button onClick={onBack} style={{ marginRight: "1rem" }}>⬅️ Tilbage</button>
        <button
          onClick={onSubmit}
          style={{
            backgroundColor: "#22b783",
            color: "white",
            padding: "0.8rem 2rem",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold"
          }}
        >
          Opret reparation
        </button>
      </div>
    </div>
  );
}
