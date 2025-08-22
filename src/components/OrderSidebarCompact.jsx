// src/components/OrderSidebarCompact.jsx
import React, { useMemo } from "react";

export default function OrderSidebarCompact({
  order,
  onEditRepair,   // (idx) => void
  onRemoveRepair, // (idx) => void
}) {
  const repairs = Array.isArray(order?.repairs) ? order.repairs : [];

  const total = useMemo(
    () => repairs.reduce((s, r) => s + (Number(r.price) || 0), 0),
    [repairs]
  );
  const totalFormatted = useMemo(
    () => Number(total || 0).toLocaleString("da-DK"),
    [total]
  );

  return (
    <div>
      <h3 style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 14, letterSpacing: 0.5, margin: "0 0 12px" }}>
        Reparationer
      </h3>

      {repairs.length === 0 ? (
        <div style={{
          border: "1px dashed #d1d5db",
          borderRadius: 8,
          padding: "12px 14px",
          fontSize: 13,
          color: "#6b7280"
        }}>
          Ingen reparationer valgt endnu.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {repairs.map((r, idx) => {
            const device = r.device || r.model || "Ukendt enhed";
            const repair = r.repair || r.title || "Reparation";
            const price  = Number(r.price) || 0;
            const time   = Number(r.time) || 0;
            const part   = r.part || null;

            return (
              <div key={r.id || `${device}-${repair}-${idx}`}
                   style={{
                     border: "1px solid #e5e7eb",
                     borderRadius: 10,
                     background: "#fff",
                     padding: "10px 12px"
                   }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{device}</div>
                <div style={{ fontSize: 12, color: "#374151" }}>
                  {repair} • {price.toLocaleString("da-DK")} kr • {time} min
                </div>

                {/* Valgt reservedel som badges */}
                {part && (
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span title={part.model} style={badgeStyle("#f8fafc", "#0f172a", "#e5e7eb")}>
                      {part.model}
                    </span>
                    <span style={badgeStyle("#eef6ff", "#1d4ed8")}>Lager: {part.stock ?? "—"}</span>
                    {part.location && (
                      <span style={badgeStyle("#f1f5f9", "#334155")}>{part.location}</span>
                    )}
                  </div>
                )}

                {/* Slanke tekstknapper */}
                <div style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                  marginTop: 8
                }}>
                  <button
                    onClick={() => onEditRepair?.(idx)}
                    className="tg-ghost"
                    style={{ ...ghostBtn, color: "#141414ff" }}
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => onRemoveRepair?.(idx)}
                    className="tg-danger"
                    style={{ ...ghostBtn, color: "#b91c1c" }}
                  >
                    Fjern
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total */}
      <div style={{
        marginTop: 14,
        paddingTop: 10,
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        fontWeight: 700
      }}>
        <span>Samlet</span>
        <span>{totalFormatted} kr</span>
      </div>
    </div>
  );
}

const ghostBtn = {
  background: "transparent",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer"
};

function badgeStyle(bg, color, border = "transparent") {
  return {
    background: bg,
    color,
    border: `1px solid ${border}`,
    fontSize: 11,            // mindre tekst
    padding: "2px 6px",
    borderRadius: 6,
    maxWidth: 520,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  };
}
