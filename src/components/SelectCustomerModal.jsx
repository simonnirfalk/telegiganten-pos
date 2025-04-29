// SelectCustomerModal.jsx
import React, { useState, useEffect } from "react";

export default function SelectCustomerModal({ customers, onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "10px",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "80vh",
          overflowY: "auto"
        }}
      >
        <h2>Vælg kunde</h2>
        <input
          type="text"
          placeholder="Søg navn eller telefonnummer"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: "1rem", width: "100%", padding: "0.5rem" }}
        />

        {filteredCustomers.length === 0 ? (
          <p>Ingen kunder matcher.</p>
        ) : (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "0.75rem",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                borderRadius: "6px",
                transition: "background 0.2s"
              }}
              onClick={() => {
                onSelect(c);
                onClose();
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <strong>{c.name}</strong><br />
              {c.phone} • {c.email}
            </div>
          ))
        )}

        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <button onClick={onClose} style={{ background: "#ccc", padding: "0.5rem 1rem", border: "none", borderRadius: "6px" }}>
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}
