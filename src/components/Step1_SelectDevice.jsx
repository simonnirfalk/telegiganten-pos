import React from "react";

export default function Step1_SelectDevice({
  devices,
  searchTerm,
  setSearchTerm,
  selectedDevice,
  setSelectedDevice,
  onNext
}) {
  const filteredDevices = devices.filter((device) => {
    const term = searchTerm.toLowerCase();
    return device.name.toLowerCase().includes(term);
  });

  return (
    <div>
      <h2 style={{ fontWeight: "bold", textTransform: "uppercase" }}>Opret reparation</h2>
      <p style={{ fontWeight: "bold" }}>1. Vælg enhed</p>

      <input
        type="text"
        placeholder="Søg fx iPhone 13"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          marginBottom: "1rem",
          width: "100%",
          maxWidth: "400px",
          borderRadius: "8px",
          border: "1px solid #ccc"
        }}
      />

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
            {device.name}
          </button>
        ))}
      </div>

      <button
        disabled={!selectedDevice}
        onClick={onNext}
        style={{
          marginTop: "2rem",
          padding: "0.75rem 1.5rem",
          backgroundColor: selectedDevice ? "#22b783" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: selectedDevice ? "pointer" : "not-allowed"
        }}
      >
        Næste
      </button>
    </div>
  );
}
