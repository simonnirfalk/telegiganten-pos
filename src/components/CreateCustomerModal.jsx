// src/components/CreateCustomerModal.jsx
import React, { useState } from "react";
import { api } from "../data/apiClient";
import { normalizePhone, validatePhone, validateEmail } from "../utils/customerUtils";

export default function CreateCustomerModal({ onClose, onCreate, customers = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    extraPhone: "",
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Navn er påkrævet.";
    if (!validatePhone(formData.phone)) newErrors.phone = "Ugyldigt telefonnummer.";
    if (formData.extraPhone && !validatePhone(formData.extraPhone))
      newErrors.extraPhone = "Ugyldigt ekstra telefonnummer.";
    if (!validateEmail(formData.email)) newErrors.email = "Ugyldig e-mailadresse.";

    // Lokal duplikat-tjek
    const exists = customers.find(
      (c) => normalizePhone(c.phone) === normalizePhone(formData.phone)
    );
    if (exists) newErrors.phone = `Telefonnummer findes allerede: ${exists.name}`;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: normalizePhone(formData.phone),
      extraPhone: normalizePhone(formData.extraPhone),
      email: formData.email.trim(),
    };

    setSaving(true);
    try {
      const data = await api.createCustomer(payload);
      if (data?.status === "created" || data?.status === "exists") {
        const newCustomer = { id: data.customer_id, ...payload };
        onCreate?.(newCustomer);
        onClose?.();
      } else {
        alert("Uventet svar fra serveren: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error("Fejl ved oprettelse af kunde:", err);
      alert("Der opstod en fejl under oprettelsen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "10px",
          width: "90%",
          maxWidth: "500px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Opret kunde</h2>

        <input
          placeholder="Navn"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.name && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.name}</p>}

        <input
          placeholder="Telefonnummer"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.phone && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.phone}</p>}

        <input
          placeholder="Ekstra telefonnummer"
          value={formData.extraPhone}
          onChange={(e) => handleChange("extraPhone", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.extraPhone && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.extraPhone}</p>}

        <input
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.email && <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.email}</p>}

        <div style={{ textAlign: "right", marginTop: "1rem" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              backgroundColor: "#ccc",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              marginRight: "0.5rem",
              cursor: "pointer",
            }}
          >
            Annullér
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              backgroundColor: "#2166AC",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {saving ? "Gemmer…" : "Gem kunde"}
          </button>
        </div>
      </div>
    </div>
  );
}
