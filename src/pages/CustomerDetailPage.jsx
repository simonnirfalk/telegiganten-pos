import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaPlus, FaEdit, FaTrashAlt, FaPhone, FaEnvelope, FaUserPlus, FaUser, FaHome, FaLock } from "react-icons/fa";

export default function CustomerDetailPage({ customers, bookings, setBookings }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const customer = customers.find((c) => c.id === parseInt(id));
  const customerBookings = bookings.filter((b) => b.customerId === parseInt(id));

  const [editingField, setEditingField] = useState({});

  const handleUpdateBooking = (bookingId, field, value, repairIndex = null) => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        if (repairIndex !== null) {
          const newRepairs = [...b.repairs];
          newRepairs[repairIndex][field] = value;
          return { ...b, repairs: newRepairs };
        } else {
          return { ...b, [field]: value };
        }
      }
      return b;
    });
    setBookings(updated);
    setEditingField({});
  };

  if (!customer) return <p>Kunde ikke fundet.</p>;

  return (
    <div style={{ padding: "2rem" }}>
      {/* Top-bar */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem" }}>
  <button
    onClick={() => navigate("/")}
    style={{ backgroundColor: "#2166AC", color: "white", padding: "0.6rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
  >
    <FaHome /> Dashboard
  </button>

  <button
    onClick={() => navigate("/customers")}
    style={{ backgroundColor: "#2166AC", color: "white", padding: "0.6rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
  >
    ⬅️ Tilbage til kunder
  </button>
</div>


      {/* Kundeinfo */}
      <h2 style={{ marginBottom: "1rem" }}>{customer.name}</h2>
      <p><strong>Telefon:</strong> {customer.phone}</p>
      {customer.extraPhone && <p><strong>Ekstra telefon:</strong> {customer.extraPhone}</p>}
      <p><strong>E-mail:</strong> {customer.email}</p>

      {/* Reparationer */}
      <h3 style={{ marginTop: "2rem" }}>Reparationer</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Booket tid</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Enhed + Reparation</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Pris + Tid</th>
            <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {customerBookings.map((b) => (
            <tr key={b.id}>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {new Date(b.bookedTime).toLocaleString()}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {b.repairs.map((r, i) => (
                  <div key={i} style={{ marginBottom: "0.5rem" }}>
                    {/* Enhed */}
                    {editingField.field === "device" && editingField.bookingId === b.id && editingField.repairIndex === i ? (
                      <input
                        defaultValue={r.device}
                        autoFocus
                        onBlur={(e) => handleUpdateBooking(b.id, "device", e.target.value, i)}
                        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      />
                    ) : (
                      <span onClick={() => setEditingField({ bookingId: b.id, field: "device", repairIndex: i })}>
                        {r.device} ✏️
                      </span>
                    )}
                    {" - "}
                    {/* Reparation */}
                    {editingField.field === "repair" && editingField.bookingId === b.id && editingField.repairIndex === i ? (
                      <input
                        defaultValue={r.repair}
                        autoFocus
                        onBlur={(e) => handleUpdateBooking(b.id, "repair", e.target.value, i)}
                        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      />
                    ) : (
                      <span onClick={() => setEditingField({ bookingId: b.id, field: "repair", repairIndex: i })}>
                        {r.repair} ✏️
                      </span>
                    )}
                  </div>
                ))}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {/* Pris */}
                {editingField.field === "price" && editingField.bookingId === b.id ? (
                  <input
                    defaultValue={b.price}
                    autoFocus
                    onBlur={(e) => handleUpdateBooking(b.id, "price", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                  />
                ) : (
                  <span onClick={() => setEditingField({ bookingId: b.id, field: "price" })}>
                    {b.price} kr ✏️
                  </span>
                )}
                {" • "}
                {/* Tid */}
                {editingField.field === "time" && editingField.bookingId === b.id ? (
                  <input
                    defaultValue={b.time}
                    autoFocus
                    onBlur={(e) => handleUpdateBooking(b.id, "time", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                  />
                ) : (
                  <span onClick={() => setEditingField({ bookingId: b.id, field: "time" })}>
                    {b.time} min ✏️
                  </span>
                )}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                {editingField.field === "status" && editingField.bookingId === b.id ? (
                  <select
                    defaultValue={b.status}
                    autoFocus
                    onBlur={(e) => handleUpdateBooking(b.id, "status", e.target.value)}
                  >
                    {['booket', 'under reparation', 'afventer', 'afsluttet'].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span onClick={() => setEditingField({ bookingId: b.id, field: "status" })}>
                    {b.status} ✏️
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {customerBookings.length === 0 && (
        <p style={{ marginTop: "1rem" }}>Ingen reparationer fundet for denne kunde.</p>
      )}
    </div>
  );
}
