import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";

export default function CustomerDetailPage({ customers }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // ✅ Vent med at finde kunde indtil customers er hentet
  if (!customers || customers.length === 0) {
    return <p>Indlæser kunder...</p>;
  }

  const customer = customers.find((c) => String(c.id) === String(id));

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
      {customer.repairs.length === 0 ? (
        <p>Ingen reparationer fundet for denne kunde.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Oprettet</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Enhed</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Reparation</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Pris</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Tid</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Ordre-ID</th>
            </tr>
          </thead>
          <tbody>
            {customer.repairs.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                  {new Date(r.created_at).toLocaleDateString("da-DK", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}, kl.{" "}
                  {new Date(r.created_at).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.device}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.repair}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.price} kr</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.time} min</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.order_id || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
