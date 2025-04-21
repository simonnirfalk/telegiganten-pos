// src/components/Step1_SelectDevice.jsx
import React from "react";

export default function Step1_SelectDevice({ devices, searchTerm, setSearchTerm, selectedDevice, setSelectedDevice, onNext }) {
  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch || searchTerm.length === 0;
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Søg efter model..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ padding: "0.5rem 1rem", fontSize: "1rem", marginBottom: "1rem", width: "100%", maxWidth: "400px", borderRadius: "8px", border: "1px solid #ccc" }}
      />
      <p style={{ fontWeight: "bold" }}>1. Vælg enhed</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {filteredDevices.map((device) => (
          <button
            key={device.id}
            onClick={() => setSelectedDevice(device)}
            style={{
              padding: "1rem",
              backgroundColor: "white",
              color: "#111",
              border: selectedDevice?.id === device.id ? "2px solid #2166AC" : "1px solid #ccc",
              borderRadius: "12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
              minWidth: "200px",
              textAlign: "left"
            }}
          >
            <strong>{device.name}</strong>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>{device.brand}</div>
          </button>
        ))}
      </div>
      <button
        disabled={!selectedDevice}
        onClick={onNext}
        style={{ marginTop: "2rem" }}
      >
        Næste
      </button>
    </div>
  );
}
