// TestLayout.jsx (brug denne som en isoleret test inde i dit projekt)
import React from "react";

export default function TestLayout() {
  const boxStyle = {
    background: "#2166AC",
    color: "white",
    padding: "1rem",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold"
  };

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <h2 style={{ marginBottom: "1rem" }}>Test af responsiv grid</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "1rem",
          background: "#f0f0f0",
          padding: "1rem"
        }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={boxStyle}>
            Kort #{i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
