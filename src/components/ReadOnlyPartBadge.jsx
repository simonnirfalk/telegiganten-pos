// src/components/ReadOnlyPartBadge.jsx
import React from "react";

/**
 * ReadOnlyPartBadge
 * - Informations-only visning af en enkelt reservedel.
 * - Du kan give enten:
 *    1) part: { id, model, stock, location }
 *    2) meta: { spare_part_id, spare_part_model, spare_part_stock, spare_part_location }
 *
 * Props:
 * - part?: object
 * - meta?: object
 * - emptyText?: string (default: "(ingen reservedel valgt)")
 * - style?: React.CSSProperties (wrapper style)
 * - className?: string
 */
export default function ReadOnlyPartBadge({ part, meta, emptyText = "(ingen reservedel valgt)", style, className }) {
  const normalized = normalizePart(part, meta);

  if (!normalized) {
    return (
      <span style={{ color: "#6b7280", fontSize: 13 }}>{emptyText}</span>
    );
  }

  const { model, stock, location } = normalized;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        fontSize: 13,
        color: "#223",
        ...style,
      }}
    >
      {/* Modelnavn */}
      <span style={{ fontWeight: 600 }}>
        {model || "—"}
      </span>

      {/* Lagerchip */}
      <span
        style={{
          padding: "2px 6px",
          background: "#eef6ff",
          borderRadius: 6,
          border: "1px solid #e3efff",
          lineHeight: 1.4,
        }}
      >
        Lager: {stock ?? "—"}
      </span>

      {/* Lokationschip (kun hvis angivet) */}
      {location ? (
        <span
          style={{
            padding: "2px 6px",
            background: "#f1f5f9",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            lineHeight: 1.4,
          }}
        >
          {location}
        </span>
      ) : null}
    </div>
  );
}

/** Intern helper: accepterer både {part} eller {meta} og returnerer et ensartet objekt. */
function normalizePart(part, meta) {
  // 1) Hvis vi har et "part"-objekt fra frontend-state (Step1/Step2)
  if (part && (hasValue(part.id) || hasValue(part.model) || hasValue(part.location) || hasValue(part.stock))) {
    return {
      id: hasValue(part.id) ? part.id : null,
      model: part.model ?? "",
      stock: hasValue(part.stock) ? toNumberOrNull(part.stock) : null,
      location: part.location ?? "",
    };
  }

  // 2) Hvis vi i stedet har WP-meta-felter (fra RepairHistory load)
  if (meta && (hasValue(meta.spare_part_id) || hasValue(meta.spare_part_model) || hasValue(meta.spare_part_location) || hasValue(meta.spare_part_stock))) {
    return {
      id: hasValue(meta.spare_part_id) ? meta.spare_part_id : null,
      model: meta.spare_part_model ?? "",
      stock: hasValue(meta.spare_part_stock) ? toNumberOrNull(meta.spare_part_stock) : null,
      location: meta.spare_part_location ?? "",
    };
  }

  // 3) Ingenting at vise
  return null;
}

function hasValue(v) {
  return v !== undefined && v !== null && v !== "";
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
