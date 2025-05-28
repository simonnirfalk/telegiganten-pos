import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";

export default function RepairHistory({ repair, onClose, onSave }) {
  const [edited, setEdited] = useState({ ...repair });
  const [history, setHistory] = useState(repair.history || []);
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setEdited((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const changedFields = {};

    for (const key in edited) {
      if (edited[key] !== repair[key]) {
        changedFields[key] = edited[key];
      }
    }

    if (Object.keys(changedFields).length === 0) {
      setSaving(false);
      onClose();
      return;
    }

    try {
      const response = await fetch("https://telegiganten.dk/wp-json/telegiganten/v1/update-repair-with-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repair_id: repair.id,
          fields: changedFields
        })
      });

      const result = await response.json();
      if (result.status === "updated") {
        setHistory(result.history || []);
        onSave({ ...edited, history: result.history });
        onClose();
      } else {
        console.warn("Opdatering mislykkedes:", result);
      }
    } catch (error) {
      console.error("Fejl ved opdatering af reparation:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2>Redigér reparation #{repair.id}</h2>
          <button onClick={onClose} style={styles.close}><FaTimes /></button>
        </div>

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
              <label><strong>{label}:</strong></label>
              <input
                type="text"
                value={edited[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                style={styles.input}
              />
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <button onClick={handleSave} style={styles.save} disabled={saving}>
            {saving ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>

        {history.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3>Historik</h3>
            <ul>
              {history.map((entry, index) => (
                <li key={index} style={{ marginBottom: "0.5rem" }}>
                  <small>{entry.timestamp} – {entry.field}: "{entry.old}" → "{entry.new}"</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    padding: "2rem",
    borderRadius: "12px",
    width: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  close: {
    background: "none",
    border: "none",
    fontSize: "1.25rem",
    cursor: "pointer",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "0.5rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  footer: {
    marginTop: "2rem",
    display: "flex",
    justifyContent: "flex-end",
  },
  save: {
    backgroundColor: "#22b783",
    color: "white",
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
