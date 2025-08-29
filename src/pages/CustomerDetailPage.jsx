// src/pages/CustomerDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { api } from "../data/apiClient";
import RepairHistory from "../components/RepairHistory";

/** Utils */
const monthsDk = [
  "januar","februar","marts","april","maj","juni",
  "juli","august","september","oktober","november","december"
];

function formatDkDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = monthsDk[d.getMonth()];
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

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedRepair, setSelectedRepair] = useState(null); // <-- modal

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const data = await api.getCustomerById(id);
        if (!mounted) return;

        const normalized = {
          id: data?.id ?? data?.ID ?? "",
          name: data?.name ?? data?.customer_name ?? "",
          phone: data?.phone ?? data?.customer_phone ?? "",
          email: data?.email ?? "",
          repairs: Array.isArray(data?.repairs) ? data.repairs : [],
        };
        setCustomer(normalized);
      } catch (err) {
        console.error("Fejl ved hentning af kunde:", err);
        if (mounted) setLoadError("Kunne ikke hente kunden.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Normaliser og sorter reparationer nyeste først
  const repairs = useMemo(() => {
    if (!customer) return [];
    const arr = (customer.repairs || []).map((r) => ({
      id: r.id ?? r.ID ?? r.post_id ?? r.order_id ?? Math.random().toString(36).slice(2),
      created_at: r.created_at ?? r.date ?? r.createdAt ?? null,
      device: r.device ?? r.model ?? r.model_name ?? "",
      model: r.device ?? r.model ?? r.model_name ?? "",
      repair: r.repair ?? r.repair_title ?? r.title ?? "",
      price: r.price ?? r.amount ?? "",
      time: r.time ?? r.duration ?? "",
      order_id: r.order_id ?? r.id ?? "",
      status: r.status ?? "",
      payment: r.payment ?? "",
      // history, password, contact osv. følger evt. senere fra update
    }));
    arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return arr;
  }, [customer]);

  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  function openRepair(r) {
    // Byg et komplet repair-objekt til modallen
    const forModal = {
      ...r,
      customer: customer?.name || "",
      customer_id: customer?.id || 0,
      phone: customer?.phone || "",
      // Sikrer felter som modallen forventer findes:
      payment_type: r.payment_type, // hvis vi har det
      note: r.note ?? "",
      password: r.password ?? "",
      contact: r.contact ?? "",
      history: r.history || [], // kan være tom – modallen håndterer det
    };
    setSelectedRepair(forModal);
  }

  function closeModal() {
    setSelectedRepair(null);
  }

  async function handleSaveFromModal(payload) {
    // payload: { repair_id, fields }
    const res = await api.updateRepairWithHistory(payload);
    // Optimistisk opdatering af kundens reparationsliste
    setCustomer((prev) => {
      if (!prev) return prev;
      const updated = prev.repairs.map((row) => {
        if ((row.id ?? row.ID) === payload.repair_id) {
          return { ...row, ...payload.fields };
        }
        return row;
      });
      return { ...prev, repairs: updated };
    });
    // Opdater også den valgte reparation i modallen med nye værdier + history fra API
    if (res?.history && Array.isArray(res.history)) {
      setSelectedRepair((old) => (old ? { ...old, ...payload.fields, history: res.history } : old));
    } else {
      setSelectedRepair((old) => (old ? { ...old, ...payload.fields } : old));
    }
  }

  if (loading) return <div style={{ padding: "2rem" }}><p>Indlæser kunde…</p></div>;
  if (loadError) return <div style={{ padding: "2rem" }}><p style={{ color: "crimson" }}>{loadError}</p></div>;
  if (!customer) return <div style={{ padding: "2rem" }}><p>Kunde ikke fundet.</p></div>;

  return (
    <div style={{ padding: "2rem" }}>
      {/* Top-bar */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem" }}>
        <button onClick={() => navigate("/")} style={buttonStyle}>
          <FaHome /> Dashboard
        </button>
        <button onClick={() => navigate("/customers")} style={buttonStyle}>
          ⬅️ Tilbage til kunder
        </button>
      </div>

      {/* Kundeinfo */}
      <h2 style={{ marginBottom: "1rem" }}>{customer.name || "—"}</h2>
      <p><strong>Telefon:</strong> {customer.phone || "—"}</p>
      <p><strong>E-mail:</strong> {customer.email || "—"}</p>

      {/* Reparationer */}
      <h3 style={{ marginTop: "2rem" }}>Reparationer</h3>
      {repairs.length === 0 ? (
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
            {repairs.map((r) => (
              <tr
                key={r.id}
                onClick={() => openRepair(r)}
                style={{ cursor: "pointer" }}
                title="Klik for at se historik/redigere"
              >
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                  {formatDkDateTime(r.created_at)}
                </td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.device || "—"}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.repair || "—"}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{formatPrice(r.price)}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                  {r.time ? `${r.time} min` : "—"}
                </td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{r.order_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Repair modal */}
      {selectedRepair && (
        <RepairHistory
          repair={selectedRepair}
          onClose={closeModal}
          onSave={handleSaveFromModal}
        />
      )}
    </div>
  );
}
