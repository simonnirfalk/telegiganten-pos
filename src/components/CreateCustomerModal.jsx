import React, { useState } from "react";

export default function CreateCustomerModal({ onClose, onCreate, customers = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    extraPhone: "",
    email: ""
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\s+/g, "");
    return /^(\+?\d{8,15})$/.test(cleanPhone);
  };

  const validateEmail = (email) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Navn er påkrævet.";
    if (!validatePhone(formData.phone)) newErrors.phone = "Ugyldigt telefonnummer.";
    if (formData.extraPhone && !validatePhone(formData.extraPhone)) newErrors.extraPhone = "Ugyldigt ekstra telefonnummer.";
    if (!validateEmail(formData.email)) newErrors.email = "Ugyldig e-mailadresse.";

    const exists = customers.find(c => c.phone.replace(/\s+/g, "") === formData.phone.replace(/\s+/g, ""));
    if (exists) {
      newErrors.phone = `Telefonnummer findes allerede: ${exists.name}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 🟢 API-kald til WordPress for at oprette kunde
    fetch("https://telegiganten.dk/wp-json/telegiganten/v1/create-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === "created" || data.status === "exists") {
          const newCustomer = {
            id: data.customer_id,
            ...formData
          };
          if (onCreate) onCreate(newCustomer);
          onClose();
        } else {
          alert("Uventet svar fra serveren: " + JSON.stringify(data));
        }
      })
      .catch(err => {
        console.error("Fejl ved oprettelse af kunde:", err);
        alert("Der opstod en fejl under oprettelsen.");
      });
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
            style={{
              backgroundColor: "#ccc",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              marginRight: "0.5rem"
            }}
          >
            Annullér
          </button>
          <button
            onClick={handleSubmit}
            style={{
              backgroundColor: "#2166AC",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none"
            }}
          >
            Gem kunde
          </button>
        </div>
      </div>
    </div>
  );
}
