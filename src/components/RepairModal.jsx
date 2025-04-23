import React from "react";

export default function RepairModal({ device, repairs, onAdd, onClose }) {
  if (!device) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "white",
        padding: "2rem",
        borderRadius: "10px",
        width: "90%",
        maxWidth: "500px",
        maxHeight: "80vh",
        overflowY: "auto"
      }}>
        <h2 style={{ marginTop: 0 }}>{device.name}</h2>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {repairs.map((r, i) => (
            <li key={i} style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              border: "1px solid #ccc",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>{r.name} ({r.price} kr / {r.time} min)</span>
              <button
                style={{
                  padding: "0.4rem 0.8rem",
                  backgroundColor: "#2166AC",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
                onClick={() => onAdd(device.name, r)}
              >
                ➕
              </button>
            </li>
          ))}
        </ul>
        <div style={{ textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#ccc",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}
