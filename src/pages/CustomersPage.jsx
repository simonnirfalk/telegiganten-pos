import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaEdit, FaTrashAlt, FaPhone, FaEnvelope, FaUserPlus, FaUser, FaHome, FaLock } from "react-icons/fa";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("https://telegiganten.dk/wp-json/telegiganten/v1/customers-with-repairs");
        const data = await res.json();
        setCustomers(data);
      } catch (err) {
        console.error("Fejl ved hentning af kunder:", err);
      }
    };
  
    fetchCustomers();
  }, []);

  const filteredCustomers = customers
    .filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );

  const inputStyle = { padding: "0.5rem", margin: "0.5rem 0", width: "100%" };

  return (
    <div style={{ padding: "2rem" }}>
      {/* Top-knapper */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{ backgroundColor: "#2166AC", color: "white", padding: "0.6rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
        >
          <FaHome /> Dashboard
        </button>
      </div>
      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Kunder</h2>

      <input
        type="text"
        placeholder="Søg navn eller telefonnummer..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={inputStyle}
      />

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Navn</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Telefon</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Ekstra tlf.</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>E-mail</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Antal reparationer</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Seneste reparation</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((c) => (
            <tr
              key={c.id}
              onClick={() => navigate(`/customers/${c.id}`)}
              style={{ cursor: "pointer" }}
            >
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.name}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.phone}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.extraPhone || "-"}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.email}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{c.repairs.length}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
              {c.repairs.length > 0
              ? new Date(c.repairs[c.repairs.length - 1].created_at).toLocaleDateString("da-DK")
              : "-"}

              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredCustomers.length === 0 && (
        <p style={{ marginTop: "1rem" }}>Ingen kunder fundet.</p>
      )}
    </div>
  );
}
