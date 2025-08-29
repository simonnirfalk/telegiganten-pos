// src/components/EditCustomerModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { validatePhone, validateEmail, normalizePhone } from "../utils/customerUtils";

export default function EditCustomerModal({ customer, onSave, onClose }) {
  const [formData, setFormData] = useState({
    id: customer?.id,
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Luk på Escape
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setServerError("");
  };

  const cleaned = useMemo(
    () => ({
      id: customer?.id,
      name: (formData.name || "").trim(),
      phone: normalizePhone(formData.phone || ""),
      email: (formData.email || "").trim().toLowerCase(),
    }),
    [formData, customer?.id]
  );

  const validate = () => {
    const e = {};
    if (!cleaned.name) e.name = "Navn er påkrævet.";
    if (!validatePhone(cleaned.phone)) e.phone = "Ugyldigt telefonnummer.";
    if (cleaned.email && !validateEmail(cleaned.email)) e.email = "Ugyldig e-mailadresse.";
    return e;
  };

  const formInvalid = useMemo(() => Object.keys(validate()).length > 0, [cleaned]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (saving) return;

    const eMap = validate();
    if (Object.keys(eMap).length) {
      setErrors(eMap);
      return;
    }

    setSaving(true);
    setServerError("");
    try {
      // Kalder WP via proxy: /update-customer
      // Payload indeholder ikke længere extraPhone
      const res = await api.updateCustomer(cleaned);
      // Forventet form fra plugin: { status: 'updated', customer: {...} }
      if (res?.status === "updated" && res?.customer) {
        onSave?.(res.customer);
        onClose?.();
      } else {
        const msg =
          res?.message ||
          res?.error ||
          "Kunne ikke opdatere kunde. Prøv igen.";
        setServerError(msg);
      }
    } catch (err) {
      const msg = err?.message || "Der opstod en fejl under opdatering.";
      setServerError(msg);
      console.error("Fejl ved opdatering af kunde:", err);
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
        zIndex: 1000,
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
          maxWidth: "500px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Rediger kunde</h2>

        {serverError && (
          <p
            style={{
              color: "#a40000",
              background: "#ffe8e8",
              border: "1px solid #f5b5b5",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              marginTop: 0,
            }}
          >
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
        {errors.name && (
          <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.name}</p>
        )}

        <input
          placeholder="Telefonnummer"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.phone && (
          <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.phone}</p>
        )}

        <input
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          style={{ marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
        />
        {errors.email && (
          <p style={{ color: "red", marginTop: "-0.3rem" }}>{errors.email}</p>
        )}

        <div style={{ textAlign: "right" }}>
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
              backgroundColor: "#22b783",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              opacity: saving || formInvalid ? 0.7 : 1,
            }}
          >
            {saving ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </form>
    </div>
  );
}
