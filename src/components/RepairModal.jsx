// src/components/RepairModal.jsx
import React, { useEffect, useMemo } from "react";
import { FaPlus } from "react-icons/fa";

export default function RepairModal({ device, repairs, onAdd, onClose }) {
  if (!device) return null;

  // Luk på Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const safeRepairs = useMemo(
    () => (Array.isArray(repairs) ? repairs : []),
    [repairs]
  );

  const deviceTitle = device.title || device.name || "Ukendt enhed";

  const fmtPrice = (n) =>
    typeof n === "number"
      ? `${n.toLocaleString("da-DK")} kr`
      : n
      ? `${Number(n).toLocaleString("da-DK")} kr`
      : "—";

  const fmtTime = (n) =>
    typeof n === "number" ? `${n} min` : n ? `${Number(n)} min` : "—";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "1rem",
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
          overflowY: "auto",
          boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repair-modal-heading"
      >
        <h2 id="repair-modal-heading" style={{ marginTop: 0 }}>
          {deviceTitle}
        </h2>

        {safeRepairs.length === 0 ? (
          <p>Ingen reparationer tilgængelige for denne enhed.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "1rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>
                  Reparation
                </th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Pris</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Tid</th>
                <th style={{ padding: "0.5rem" }} />
              </tr>
            </thead>
            <tbody>
              {safeRepairs.map((r, i) => {
                const key = r.id ?? `${deviceTitle}-${i}`;
                const canAdd = r && (r.price ?? r.time) !== undefined;
                return (
                  <tr key={key} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.5rem" }}>{r.title || "—"}</td>
                    <td style={{ padding: "0.5rem" }}>{fmtPrice(r.price)}</td>
                    <td style={{ padding: "0.5rem" }}>{fmtTime(r.time)}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>
                      <button
                        onClick={() => onAdd?.(deviceTitle, r)}
                        style={{
                          padding: "0.4rem 0.8rem",
                          backgroundColor: "#2166AC",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          opacity: canAdd ? 1 : 0.6,
                        }}
                        aria-label={`Tilføj ${r.title || "reparation"}`}
                        disabled={!canAdd}
                      >
                        <FaPlus />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
              cursor: "pointer",
            }}
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}
