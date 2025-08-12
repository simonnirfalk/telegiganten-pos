// src/components/RepairHistory.jsx
import React, { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { proxyFetch } from "../data/apiClient"; // vi bruger direkte proxyFetch for at styre payload-format

export default function RepairHistory({ repair, onClose, onSave }) {
  const overlayRef = useRef(null);

  const [edited, setEdited] = useState({ ...repair });
  const [history, setHistory] = useState(repair.history || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const handleChange = (field, value) => {
    setEdited((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    // Diff: kun felter der reelt er ændret
    const changedFields = {};
    for (const key in edited) {
      if (key === "id" || key === "history") continue;
      if (edited[key] !== repair[key]) {
        changedFields[key] = edited[key];
      }
    }

    // Intet at gemme → luk pænt
    if (Object.keys(changedFields).length === 0) {
      setSaving(false);
      onClose?.();
      return;
    }

    try {
      // Kald endpointet via proxy, samme payload som i din gamle version
      const result = await proxyFetch({
        path: "/wp-json/telegiganten/v1/update-repair-with-history",
        method: "POST",
        body: {
          repair_id: repair.id,
          fields: changedFields,
        },
      });

      // Forventet svar: { status: "updated", history: [...] }
      if (result?.status === "updated") {
        const newHistory = Array.isArray(result.history) ? result.history : [];
        setHistory(newHistory);
        onSave?.({ ...edited, history: newHistory });
        onClose?.();
      } else {
        console.warn("Opdatering mislykkedes:", result);
        setError("Opdatering mislykkedes. Prøv igen.");
      }
    } catch (err) {
      console.error("Fejl ved opdatering af reparation:", err);
      setError("Kunne ikke gemme ændringer. Tjek forbindelse og prøv igen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={styles.overlay}
    >
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

        {/* Evt. fejl */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Body med inputs (samme felter som i din gamle) */}
        <div style={styles.body}>
          {[
            { label: "Kunde", field: "customer" },
            { label: "Telefon", field: "phone" },
            { label: "Model", field: "model" },
            { label: "Reparation", field: "repair" },
            { label: "Pris", field: "price" },
            { label: "Tid", field: "time" },
            { label: "Betaling", field: "payment" },
            { label: "Status", field: "status" },
            { label: "Adgangskode", field: "password" },
            { label: "Note", field: "note" },
          ].map(({ label, field }) => (
            <div key={field} style={styles.inputGroup}>
              <label style={{ marginBottom: 6 }}>
                <strong>{label}:</strong>
              </label>
              <input
                type="text"
                value={edited[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                style={styles.input}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={onClose}
            disabled={saving}
            style={styles.cancel}
          >
            Annullér
          </button>
          <button
            onClick={handleSave}
            style={styles.save}
            disabled={saving}
          >
            {saving ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>

        {/* Historik */}
        {history?.length > 0 && (
          <div style={{ marginTop: "1.2rem" }}>
            <h3 style={{ margin: "0 0 0.6rem" }}>Historik</h3>
            <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
              {history.map((entry, index) => (
                <li key={index} style={{ marginBottom: "0.4rem" }}>
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

function formatDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); }
  catch { return iso; }
}

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
    width: "min(680px, 96vw)",
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
