// src/components/RepairHistory.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { FaTimes } from "react-icons/fa";

// NYT:
import PartAttachControls from "./PartAttachControls";
import StockAdjustButtons from "./StockAdjustButtons";

/** Hjælper til robust datoformat */
function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("da-DK");
  } catch {
    return iso;
  }
}

export default function RepairHistory({ repair, onClose, onSave }) {
  const overlayRef = useRef(null);

  // Start med en kopi af repair-objektet (så vi kan redigere frit)
  const [edited, setEdited] = useState({ ...repair });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Historik beholdes til visning (parent kan sende ny history ind)
  const [history, setHistory] = useState(repair.history || []);
  useEffect(() => {
    setHistory(repair.history || []);
  }, [repair.history]);

  // Luk på Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Luk ved klik på overlay (udenfor boksen)
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const handleChange = (field, value) => {
    setEdited((prev) => ({ ...prev, [field]: value }));
  };

  /** Udregn kun de felter, der faktisk er ændret, og sørg for rigtige typer */
  const changedFields = useMemo(() => {
    const out = {};
    const orig = repair || {};

    // Liste over simple felter der kan redigeres
    const FIELDS = [
      "customer", "phone", "model", "repair", "price", "time",
      "payment", "status", "password", "note",
    ];

    for (const key of FIELDS) {
      if (edited[key] !== orig[key]) {
        out[key] = edited[key];
      }
    }

    // Numeriske felter som tal
    if (out.price !== undefined && out.price !== "") {
      const n = Number(out.price);
      if (!Number.isNaN(n)) out.price = n;
    }
    if (out.time !== undefined && out.time !== "") {
      const n = Number(out.time);
      if (!Number.isNaN(n)) out.time = n;
    }

    // Reservedel (kun send part_id hvis den er ændret)
    const oldPartId = orig?.part?.id || orig?.part_id || null;
    const newPartId = edited?.part?.id || edited?.part_id || null;
    if (newPartId !== oldPartId) {
      out.part_id = newPartId || null; // tillad også at fjerne (null)
    }

    return out;
  }, [edited, repair]);

  /** Gem-knap */
  const handleSave = async () => {
    if (!Object.keys(changedFields).length) {
      onClose?.();
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Parent håndterer API-kald + optimistisk UI + lukning
      await Promise.resolve(
        onSave?.({
          repair_id: Number(repair.id),
          fields: changedFields,
        })
      );
      // Ved succes lukker parent typisk selv modalen (setSelectedRepair(null)).
    } catch (err) {
      console.error("Fejl fra onSave:", err);
      setError("Kunne ikke gemme ændringer. Prøv igen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={styles.overlay}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0 }}>Redigér reparation #{repair.id}</h2>
            <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
              Oprettet: {formatDateTime(repair.created_at)}
            </div>
          </div>
          <button onClick={onClose} style={styles.close} title="Luk">
            <FaTimes />
          </button>
        </div>

        {/* Fejlbesked */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Inputs */}
        <div style={styles.body}>
          {[
            { label: "Kunde", field: "customer", type: "text" },
            { label: "Telefon", field: "phone", type: "text" },
            { label: "Model", field: "model", type: "text" },
            { label: "Reparation", field: "repair", type: "text" },
            { label: "Pris", field: "price", type: "number" },
            { label: "Tid", field: "time", type: "number" },
            { label: "Betaling", field: "payment", type: "text" },
            { label: "Status", field: "status", type: "text" },
            { label: "Adgangskode", field: "password", type: "text" },
            { label: "Note", field: "note", type: "text" },
          ].map(({ label, field, type }) => (
            <div key={field} style={styles.inputGroup}>
              <label style={{ marginBottom: 6 }}>
                <strong>{label}:</strong>
              </label>
              <input
                type={type}
                value={edited[field] ?? ""}
                onChange={(e) => handleChange(field, e.target.value)}
                style={styles.input}
              />
            </div>
          ))}

          {/* Reservedel: badge + vælg/skift/fjern */}
          <div style={{ gridColumn: "1 / -1", marginTop: "0.25rem" }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              <strong>Reservedel</strong>
            </label>

            <PartAttachControls
              deviceName={edited.model}
              repairTitle={edited.repair}
              defaultRepairType={edited.repair}
              value={edited.part || null}
              onChange={(part) => setEdited((prev) => ({ ...prev, part }))}
            />

            {/* Lagerjustering når der er valgt part */}
            {edited.part?.id && (
              <div style={{ marginTop: "0.6rem" }}>
                <StockAdjustButtons
                  part={edited.part}
                  onChanged={(updatedItem) =>
                    setEdited((prev) => ({
                      ...prev,
                      part: { ...prev.part, stock: Number(updatedItem.stock) },
                    }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} disabled={saving} style={styles.cancel}>
            Annullér
          </button>
          <button
            onClick={handleSave}
            style={styles.save}
            disabled={saving || !Object.keys(changedFields).length}
            title={!Object.keys(changedFields).length ? "Ingen ændringer" : "Gem"}
          >
            {saving ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>

        {/* Historik */}
        {!!history?.length && (
          <div style={{ marginTop: "1.2rem" }}>
            <h3 style={{ margin: "0 0 0.6rem" }}>Historik</h3>
            <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
              {history.map((entry, idx) => (
                <li key={idx} style={{ marginBottom: "0.4rem" }}>
                  <small>
                    {entry.timestamp} – {entry.field}: "{entry.old}" → "{entry.new}"
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** Styles */
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#fff",
    padding: "1.25rem 1.25rem 1rem",
    borderRadius: "12px",
    width: "min(760px, 96vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.8rem",
  },
  close: {
    background: "none",
    border: "none",
    fontSize: "1.15rem",
    cursor: "pointer",
    color: "#333",
  },
  errorBox: {
    background: "#ffe8e8",
    color: "#900",
    border: "1px solid #f3b4b4",
    padding: "0.6rem 0.75rem",
    borderRadius: 8,
    marginBottom: "0.8rem",
  },
  body: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.9rem 1rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "0.55rem 0.7rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "0.95rem",
  },
  footer: {
    marginTop: "1.2rem",
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.6rem",
  },
  cancel: {
    background: "#fff",
    color: "#2166AC",
    border: "2px solid #2166AC",
    padding: "0.55rem 1rem",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
  save: {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.65rem 1.2rem",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
