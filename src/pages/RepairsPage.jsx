// src/pages/RepairsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import RepairHistory from "../components/RepairHistory";
import { api } from "../data/apiClient";

export default function RepairsPage() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Alle");

  const [repairs, setRepairs] = useState([]);
  const [selectedRepair, setSelectedRepair] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError("");

    api.getRepairOrders()
      .then((data) => {
        if (!isMounted) return;
        setRepairs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Fejl ved hentning af reparationer:", err);
        if (isMounted) setLoadError("Kunne ikke hente reparationer.");
      })
      .finally(() => isMounted && setLoading(false));

    return () => { isMounted = false; };
  }, []);

  const handleSaveRepair = async (updatedRepair) => {
    try {
      // Gem i WP med historik (endpointet forventer typisk et objekt med id + felter)
      await api.updateRepairWithHistory(updatedRepair);

      // Optimistisk UI-opdatering
      setRepairs((prev) =>
        prev.map((r) => (r.id === updatedRepair.id ? { ...r, ...updatedRepair } : r))
      );

      setSelectedRepair(null);
    } catch (err) {
      console.error("Fejl ved opdatering af reparation:", err);
      alert("Kunne ikke gemme ændringer. Prøv igen.");
    }
  };

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
    fontWeight: "bold",
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
    gap: "0.5rem",
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return repairs
      .filter((r) => {
        if (!term) return true;
        const c = (r.customer || "").toLowerCase();
        const p = (r.phone || "").toLowerCase();
        const m = (r.model || "").toLowerCase();
        const rid = String(r.order_id || "").toLowerCase();
        return c.includes(term) || p.includes(term) || m.includes(term) || rid.includes(term);
      })
      .filter((r) => {
        const created = new Date(r.created_at);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        if (from && created < from) return false;
        if (to && created > to) return false;
        return true;
      })
      .filter((r) => selectedStatus === "Alle" || r.status === selectedStatus)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [repairs, searchTerm, fromDate, toDate, selectedStatus]);

  return (
    <div style={{ padding: "2rem" }}>
      <button onClick={() => navigate("/")} style={buttonStyle}>
        <FaHome /> Dashboard
      </button>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Reparationer</h2>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Søg navn, telefon, model eller ordre-id..."
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

      <div style={{ marginBottom: "1rem" }}>
        {["Alle", ...statusOptions].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            style={statusButtonStyle(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p>Indlæser reparationer…</p>}
      {loadError && <p style={{ color: "crimson" }}>{loadError}</p>}

      {!loading && !loadError && (
        <>
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
                <tr
                  key={r.id}
                  onClick={() => setSelectedRepair(r)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.order_id}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.customer}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.model}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.repair}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.price} kr • {r.time} min
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.payment}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p style={{ marginTop: "1rem" }}>Ingen reparationer fundet.</p>
          )}
        </>
      )}

      {selectedRepair && (
        <RepairHistory
          repair={selectedRepair}
          onClose={() => setSelectedRepair(null)}
          onSave={handleSaveRepair}
        />
      )}
    </div>
  );
}
