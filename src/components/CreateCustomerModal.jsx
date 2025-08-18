// src/components/CreateCustomerModal.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  // Luk på Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setServerError("");
  };

  const cleaned = useMemo(() => ({
    name: formData.name.trim(),
    phone: normalizePhone(formData.phone),
    extraPhone: normalizePhone(formData.extraPhone),
    email: formData.email.trim().toLowerCase(),
  }), [formData]);

  const validate = () => {
    const e = {};
    if (!cleaned.name) e.name = "Navn er påkrævet.";
    if (!validatePhone(cleaned.phone)) e.phone = "Ugyldigt telefonnummer.";
    if (cleaned.extraPhone && !validatePhone(cleaned.extraPhone)) e.extraPhone = "Ugyldigt ekstra telefonnummer.";
    if (!validateEmail(cleaned.email)) e.email = "Ugyldig e-mailadresse.";

    // Lokal duplikat-tjek
    const exists = customers.find(
      (c) => normalizePhone(c.phone) === cleaned.phone
    );
    if (exists) e.phone = `Telefonnummer findes allerede: ${exists.name}`;

    return e;
  };

  const formInvalid = useMemo(() => {
    const e = validate();
    return Object.keys(e).length > 0;
  }, [cleaned, customers]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (saving) return;

    const eMap = validate();
    if (Object.keys(eMap).length > 0) {
      setErrors(eMap);
      return;
    }

    setSaving(true);
    setServerError("");
    try {
      const data = await api.createCustomer(cleaned);
      if (data?.status === "created" || data?.status === "exists") {
        const newCustomer = { id: data.customer_id, ...cleaned };
        onCreate?.(newCustomer);
        onClose?.();
      } else {
        setServerError(data?.message || "Uventet svar fra serveren.");
      }
    } catch (err) {
      console.error("Fejl ved oprettelse af kunde:", err);
      // Hvis backend returnerer WP_Error med status 409 for telefon-unik, prøv at læse beskeden
      const msg = err?.message || "Der opstod en fejl under oprettelsen.";
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
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

        {serverError && (
          <p style={{ color: "#a40000", background: "#ffe8e8", border: "1px solid #f5b5b5", padding: "0.5rem 0.75rem", borderRadius: 8 }}>
            {serverError}
          </p>
        )}

        <input
          autoFocus
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
            type="button"
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
            type="submit"
            disabled={saving || formInvalid}
            style={{
              backgroundColor: "#2166AC",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              opacity: saving || formInvalid ? 0.7 : 1
            }}
          >
            {saving ? "Gemmer…" : "Gem kunde"}
          </button>
        </div>
      </form>
    </div>
  );
}
