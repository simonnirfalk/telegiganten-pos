// src/pages/RepairsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import RepairHistory from "../components/RepairHistory";
import { api } from "../data/apiClient";

/** Utils */
const dkMonths = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december"
];

function formatDkDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = dkMonths[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}. ${month} ${year}, kl. ${hh}.${mm}`;
}
function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("da-DK") + " kr.";
}

/** Statusliste (kun de tre ønskede + Alle) */
const STATUS_OPTIONS = ["Alle", "under reparation", "klar til afhentning", "afsluttet"];

export default function RepairsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Alle");

  const [repairs, setRepairs] = useState([]);
  const [selectedRepair, setSelectedRepair] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /** Hent reparationer (tg_repair) */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const data = await api.getRepairOrders();
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        if (!isMounted) return;
        setRepairs(items);
      } catch (err) {
        console.error("Fejl ved hentning af reparationer:", err);
        if (isMounted) setLoadError("Kunne ikke hente reparationer.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Åbn en specifik reparation hvis vi blev navigeret hertil med state
  useEffect(() => {
    const r = location.state?.openRepair;
    if (r) {
      setSelectedRepair(r);
      // ryd state så back/refresh ikke åbner igen
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  /** Gem ændringer m. historik (accepter både {repair_id, fields} og fladt objekt) */
  const handleSaveRepair = async (payloadFromModal) => {
    let payload = { repair_id: 0, fields: {} };

    if (payloadFromModal && typeof payloadFromModal === "object") {
      if (payloadFromModal.repair_id && payloadFromModal.fields) {
        payload = {
          repair_id: Number(payloadFromModal.repair_id),
          fields: payloadFromModal.fields || {},
        };
      } else {
        const { id, ...rest } = payloadFromModal;
        payload = {
          repair_id: Number(id || 0),
          fields: rest,
        };
      }
    }

    if (!payload.repair_id) {
      console.error("Manglende repair_id i payload:", payloadFromModal);
      alert("Kunne ikke gemme ændringer. Ugyldigt ordre-ID.");
      return;
    }

    try {
      await api.updateRepairWithHistory(payload);

      // Optimistisk UI-opdatering af tabellen:
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === payload.repair_id ? { ...r, ...payload.fields } : r
        )
      );

      setSelectedRepair(null);
    } catch (err) {
      console.error("Fejl ved opdatering af reparation:", err);
      alert("Kunne ikke gemme ændringer. Prøv igen.");
    }
  };

  const inputStyle = { padding: "0.5rem", margin: "0.5rem 0", width: "100%" };
  const statusButtonStyle = (status) => {
    const active = selectedStatus.toLowerCase() === status.toLowerCase();
    return {
      padding: "0.4rem 0.8rem",
      margin: "0 0.5rem 0.5rem 0",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      backgroundColor: active ? "#2166AC" : "#ccc",
      color: "white",
      fontWeight: "regular",
    };
  };
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

  /** Normaliser felter, så filtrering/visning bliver robust */
  const normalizedRepairs = useMemo(() => {
    return (Array.isArray(repairs) ? repairs : []).map((r) => ({
      id: r.id ?? r.ID ?? r.post_id ?? r.order_id ?? Math.random().toString(36).slice(2),
      order_id: r.order_id ?? r.id ?? r.ID ?? "",
      created_at: r.created_at ?? r.date ?? r.createdAt ?? r.timestamp ?? null,
      customer: r.customer_name ?? r.customer ?? r.name ?? "",
      phone: r.phone ?? r.customer_phone ?? "",
      model: r.model_name ?? r.model ?? "",
      repair: r.repair_title ?? r.repair ?? r.title ?? "",
      price: r.price ?? r.amount ?? "",
      time: r.time ?? r.duration ?? "",
      payment: r.payment ?? r.payment_method ?? "",
      status: r.status ?? "",
      _raw: r,
    }));
  }, [repairs]);

  /** Filtrering + sortering */
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return normalizedRepairs
      .filter((r) => {
        if (!term) return true;
        const hay = [
          r.customer, r.phone, r.model, r.repair,
          String(r.order_id), String(r.id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      })
      .filter((r) => {
        if (!r.created_at) return true;
        const created = new Date(r.created_at);
        if (from && created < from) return false;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (created > toEnd) return false;
        }
        return true;
      })
      .filter((r) => {
        if (selectedStatus === "Alle") return true;
        return String(r.status || "").toLowerCase() === selectedStatus.toLowerCase();
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [normalizedRepairs, searchTerm, fromDate, toDate, selectedStatus]);

  return (
    <div style={{ padding: "2rem" }}>
      {/* Global regel: Dashboard-knap */}
      <button onClick={() => navigate("/")} style={buttonStyle}>
        <FaHome /> Dashboard
      </button>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Reparationer</h2>

      {/* Filterlinje */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Søg navn, telefon, model eller ordre-id..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 240 }}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{ ...inputStyle, width: 180 }}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          style={{ ...inputStyle, width: 180 }}
        />
      </div>

      {/* Statusfilter */}
      <div style={{ marginBottom: "1rem" }}>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            style={statusButtonStyle(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && <p>Indlæser reparationer…</p>}
      {loadError && <p style={{ color: "crimson" }}>{loadError}</p>}

      {/* Tabel */}
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
                  onClick={() => setSelectedRepair(r._raw || r)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.order_id || r.id}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {formatDkDateTime(r.created_at)}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.customer || "—"}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.model || "—"}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.repair || "—"}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {formatPrice(r.price)} • {r.time ? `${r.time} min` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.payment || "—"}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {r.status || "—"}
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

      {/* Modal med historik / redigering */}
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
