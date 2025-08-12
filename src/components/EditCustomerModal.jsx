// src/components/EditCustomerModal.jsx
import React, { useState } from "react";
import { validatePhone, validateEmail, normalizePhone } from "../utils/customerUtils";

export default function EditCustomerModal({ customer, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...customer });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = "Navn er påkrævet.";
    if (!validatePhone(formData.phone)) newErrors.phone = "Ugyldigt telefonnummer.";
    if (formData.email && !validateEmail(formData.email)) newErrors.email = "Ugyldig e-mailadresse.";
    if (formData.extraPhone && !validatePhone(formData.extraPhone)) newErrors.extraPhone = "Ugyldigt ekstra telefonnummer.";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    const payload = {
      ...formData,
      phone: normalizePhone(formData.phone),
      extraPhone: normalizePhone(formData.extraPhone),
      name: formData.name.trim(),
      email: (formData.email || "").trim(),
    };
    onSave?.(payload);
    onClose?.();
    setSaving(false);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
      justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div style={{
        background: "white", padding: "2rem", borderRadius: "10px",
        width: "90%", maxWidth: "500px"
      }}>
        <h2 style={{ marginTop: 0 }}>Rediger kunde</h2>

        <input
          placeholder="Navn"
          value={formData.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.name && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.name}</p>}

        <input
          placeholder="Telefonnummer"
          value={formData.phone || ""}
          onChange={(e) => handleChange("phone", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.phone && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.phone}</p>}

        <input
          placeholder="Ekstra telefonnummer"
          value={formData.extraPhone || ""}
          onChange={(e) => handleChange("extraPhone", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.extraPhone && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.extraPhone}</p>}

        <input
          placeholder="E-mail"
          value={formData.email || ""}
          onChange={(e) => handleChange("email", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.email && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.email}</p>}

        <div style={{ textAlign: "right" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ backgroundColor: "#ccc", padding: "0.5rem 1rem",
              borderRadius: "6px", border: "none", marginRight: "0.5rem", cursor: "pointer" }}
          >
            Annullér
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ backgroundColor: "#22b783", color: "white",
              padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
          >
            {saving ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </div>
    </div>
  );
}
