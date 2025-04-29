// EditCustomerModal.jsx
import React, { useState } from "react";

export default function EditCustomerModal({ customer, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...customer });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.phone) return;
    onSave(formData);
    onClose();
  };

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
        maxWidth: "500px"
      }}>
        <h2 style={{ marginTop: 0 }}>Rediger kunde</h2>

        <input
          placeholder="Navn"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        <input
          placeholder="Telefonnummer"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        <input
          placeholder="Ekstra telefonnummer"
          value={formData.extraPhone}
          onChange={(e) => handleChange("extraPhone", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        <input
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />

        <div style={{ textAlign: "right" }}>
          <button onClick={onClose} style={{
            backgroundColor: "#ccc", padding: "0.5rem 1rem",
            borderRadius: "6px", border: "none", marginRight: "0.5rem"
          }}>
            Annullér
          </button>
          <button onClick={handleSubmit} style={{
            backgroundColor: "#22b783", color: "white",
            padding: "0.5rem 1rem", borderRadius: "6px", border: "none"
          }}>
            Gem ændringer
          </button>
        </div>
      </div>
    </div>
  );
}
