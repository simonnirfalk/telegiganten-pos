import React from "react";
import { FaPlus } from "react-icons/fa";

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
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "10px",
          width: "95%",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>{device.title || device.name}</h2>

        {repairs.length === 0 ? (
          <p>Ingen reparationer tilgængelige for denne enhed.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Reparation</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Pris</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Tid</th>
                <th style={{ padding: "0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{r.title}</td>
                  <td style={{ padding: "0.5rem" }}>{r.price} kr</td>
                  <td style={{ padding: "0.5rem" }}>{r.time} min</td>
                  <td style={{ padding: "0.5rem" }}>
                    <button
                      onClick={() => onAdd(device.title || device.name, r)}
                      style={{
                        padding: "0.4rem 0.8rem",
                        backgroundColor: "#2166AC",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer"
                      }}
                    >
                      <FaPlus />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ textAlign: "right", marginTop: "1rem" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#2166AC",
              color: "white",
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
