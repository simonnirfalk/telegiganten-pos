// RepairsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";

export default function RepairsPage() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Alle");
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [repairs, setRepairs] = useState([]);

  useEffect(() => {
    fetch("https://telegiganten.dk/wp-json/telegiganten/v1/repair-orders")
      .then(res => res.json())
      .then(data => setRepairs(data))
      .catch(err => console.error("Fejl ved hentning af reparationer:", err));
  }, []);

  const filtered = repairs
    .filter(r =>
      ((r.customer || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.phone || "").toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(r => {
      const created = new Date(r.created_at);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    })
    .filter(r => selectedStatus === "Alle" || r.status === selectedStatus)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const statusOptions = ["booket", "under reparation", "afventer", "afsluttet"];

  const inputStyle = { padding: "0.5rem", margin: "0.5rem 0", width: "100%" };
  const statusButtonStyle = (status) => ({
    padding: "0.4rem 0.8rem",
    margin: "0 0.5rem 0.5rem 0",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    backgroundColor: selectedStatus === status ? "#2166AC" : "#ccc",
    color: "white",
    fontWeight: "bold"
  });
  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    marginBottom: "1.5rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  };

  return (
    <div style={{ padding: "2rem" }}>
      <button onClick={() => navigate("/")} style={buttonStyle}>
        <FaHome /> Dashboard
      </button>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Reparationer</h2>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Søg navn eller telefonnummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...inputStyle, width: "180px" }} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...inputStyle, width: "180px" }} />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        {["Alle", ...statusOptions].map((status) => (
          <button key={status} onClick={() => setSelectedStatus(status)} style={statusButtonStyle(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Ordre ID</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Oprettet</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Kunde</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Model</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Reparation</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Pris + Tid</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Betaling</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.order_id}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{new Date(r.created_at).toLocaleString()}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.customer}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.model}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.repair}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.price} kr • {r.time} min</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.payment}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && <p style={{ marginTop: "1rem" }}>Ingen reparationer fundet.</p>}
    </div>
  );
}
