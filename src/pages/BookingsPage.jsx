// BookingsPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";

export default function BookingsPage() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Alle");
  const [editingStatusId, setEditingStatusId] = useState(null);

  const [bookings, setBookings] = useState([
    {
      id: 1,
      createdAt: "2024-06-01T10:00",
      bookedTime: "2024-06-05T15:00",
      name: "Mads Andersen",
      repairs: [{ device: "iPhone 13", repair: "Skærmskift" }],
      price: 899,
      time: 60,
      phone: "22223333",
      email: "mads@eksempel.dk",
      comment: "Kommer lidt før tid",
      status: "booket"
    },
    {
      id: 2,
      createdAt: "2024-06-02T12:30",
      bookedTime: "2024-06-07T12:00",
      name: "Laura Jensen",
      repairs: [{ device: "Samsung S22", repair: "Batteriskift" }],
      price: 699,
      time: 45,
      phone: "44445555",
      email: "laura@eksempel.dk",
      comment: "",
      status: "afventer"
    }
    // flere bookings kan tilføjes her
  ]);

  const filteredBookings = bookings
    .filter(b =>
      (b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phone.includes(searchTerm))
    )
    .filter(b => {
      const bookingDate = new Date(b.bookedTime);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      if (from && bookingDate < from) return false;
      if (to && bookingDate > to) return false;
      return true;
    })
    .filter(b => selectedStatus === "Alle" || b.status === selectedStatus)
    .sort((a, b) => new Date(b.bookedTime) - new Date(a.bookedTime));

  const statusOptions = ["booket", "under reparation", "afventer", "afsluttet"];

  const handleStatusChange = (id, newStatus) => {
    setBookings(prev => 
      prev.map(b => b.id === id ? { ...b, status: newStatus } : b)
    );
    setEditingStatusId(null);
  };

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
      {/* Dashboard-knap */}
      <button onClick={() => navigate("/")} style={buttonStyle}>
         Dashboard
      </button>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Bookinger</h2>

      {/* Søgefelt og dato-filtre */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Søg navn eller telefonnummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{ ...inputStyle, width: "180px" }}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          style={{ ...inputStyle, width: "180px" }}
        />
      </div>

      {/* Statusfiltre */}
      <div style={{ marginBottom: "1rem" }}>
        {["Alle", "booket", "under reparation", "afventer", "afsluttet"].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            style={statusButtonStyle(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Bookinger-tabel */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Booket tid</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Navn</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Reparation</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Pris + Tid</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Telefonnummer</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>E-mail</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Kommentar</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Oprettet</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredBookings.map((b) => (
            <tr key={b.id}>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {new Date(b.bookedTime).toLocaleString()}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {b.name}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {b.repairs.map((r, i) => (
                  <div key={i}>{r.device} - {r.repair}</div>
                ))}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {b.price} kr • {b.time} min
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {b.phone}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {b.email}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {b.comment || "-"}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {new Date(b.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {editingStatusId === b.id ? (
                  <select
                    value={b.status}
                    onChange={(e) => handleStatusChange(b.id, e.target.value)}
                    onBlur={() => setEditingStatusId(null)}
                    style={{ padding: "0.3rem" }}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    onClick={() => setEditingStatusId(b.id)}
                    style={{ cursor: "pointer", textDecoration: "underline", color: "#2166AC" }}
                  >
                    {b.status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredBookings.length === 0 && (
        <p style={{ marginTop: "1rem" }}>Ingen bookinger fundet.</p>
      )}
    </div>
  );
}
