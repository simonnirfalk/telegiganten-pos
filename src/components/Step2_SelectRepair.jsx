import React from "react";

export default function Step2_SelectRepair({
  selectedRepair,
  setSelectedRepair,
  onNext,
  onBack
}) {
  const repairs = [
    {
      id: 1,
      name: "Skærmskift",
      price: 999,
      time: 60
    },
    {
      id: 2,
      name: "Batteriskift",
      price: 599,
      time: 30
    },
    {
      id: 3,
      name: "Vandskade",
      price: 399,
      time: 45
    }
  ];

  return (
    <div>
      <h2 style={{ fontWeight: "bold", textTransform: "uppercase" }}>Reparation</h2>
      <p style={{ fontWeight: "bold" }}>2. Vælg reparation</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {repairs.map((repair) => (
          <div
            key={repair.id}
            onClick={() => setSelectedRepair(repair)}
            style={{
              padding: "1rem",
              borderRadius: "12px",
              backgroundColor: "white",
              border:
                selectedRepair?.id === repair.id
                  ? "2px solid #2166AC"
                  : "1px solid #ccc",
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
              minWidth: "240px"
            }}
          >
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>{repair.name}</p>
            <p style={{ margin: 0 }}>Pris: {repair.price} kr</p>
            <p style={{ margin: 0 }}>Tid: {repair.time} min</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={onBack}
          style={{
            marginRight: "1rem",
            backgroundColor: "#22b783",
            color: "white",
            padding: "0.6rem 1.5rem",
            borderRadius: "8px",
            border: "none"
          }}
        >
          ⬅️ Tilbage
        </button>
        <button
          disabled={!selectedRepair}
          onClick={onNext}
          style={{
            backgroundColor: selectedRepair ? "#22b783" : "#ccc",
            color: "white",
            padding: "0.6rem 1.5rem",
            borderRadius: "8px",
            border: "none",
            cursor: selectedRepair ? "pointer" : "not-allowed"
          }}
        >
          Næste
        </button>
      </div>
    </div>
  );
}
