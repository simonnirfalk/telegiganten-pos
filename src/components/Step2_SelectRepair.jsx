// src/components/Step2_SelectRepair.jsx
import React from "react";

export default function Step2_SelectRepair({ repairs, selectedRepair, setSelectedRepair, onBack, onNext }) {
  return (
    <div>
      <p style={{ fontWeight: "bold" }}>2. Vælg reparation</p>
      {repairs.map((repair, index) => (
        <button
          key={index}
          onClick={() => setSelectedRepair(repair)}
          style={{
            display: "block",
            margin: "0.5rem 0",
            padding: "1rem",
            borderRadius: "10px",
            backgroundColor: "white",
            color: "#111",
            border: selectedRepair === repair ? "2px solid #2166AC" : "1px solid #ccc",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            textAlign: "left"
          }}
        >
          {repair.name} – {repair.price} kr ({repair.time})
        </button>
      ))}
      <div style={{ marginTop: "2rem" }}>
        <button onClick={onBack} style={{ marginRight: "1rem" }}>⬅️ Tilbage</button>
        <button disabled={!selectedRepair} onClick={onNext}>Næste</button>
      </div>
    </div>
  );
}
