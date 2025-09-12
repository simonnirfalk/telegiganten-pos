// src/pages/RepairsPage.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import RepairHistory from "../components/RepairHistory";
import { api } from "../data/apiClient";

/** Utils */
const dkMonths = [
  "januar","februar","marts","april","maj","juni",
  "juli","august","september","oktober","november","december"
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
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("da-DK") + " kr.";
}

/** Statusliste (nu med 'annulleret') */
const STATUS_OPTIONS = ["Alle", "under reparation", "klar til afhentning", "afsluttet", "annulleret"];

/** Badge-farver til status */
function statusPill(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  const map = {
    "under reparation":    { bg: "#e0f2fe", fg: "#075985" },
    "klar til afhentning": { bg: "#fff7ed", fg: "#9a3412" },
    "afsluttet":           { bg: "#dcfce7", fg: "#166534" },
    "annulleret":          { bg: "#fee2e2", fg: "#991b1b" },
  };
  const c = map[s] || { bg: "#e5e7eb", fg: "#111827" };
  return (
    <span style={{
      background: c.bg, color: c.fg, padding: "2px 10px",
      borderRadius: 999, fontSize: 12, fontWeight: 700, display: "inline-block", lineHeight: 1.6
    }}>
      {statusRaw || "—"}
    </span>
  );
}

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

  /** Genbrugelig loader så vi kan refetch'e efter gem */
  const loadRepairs = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const data = await api.getRepairOrders();
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      setRepairs(items);
    } catch (err) {
      console.error("Fejl ved hentning af reparationer:", err);
      setLoadError("Kunne ikke hente reparationer.");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Første load */
  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  /** Normaliser topfelter (ingen API-ændringer) */
  const normalizedRepairs = useMemo(() => {
    return (Array.isArray(repairs) ? repairs : []).map((r) => ({
      _raw: r,
      id: r.id ?? r.ID ?? r.post_id ?? r.order_id ?? Math.random().toString(36).slice(2),
      order_id: r.order_id ?? r.id ?? r.ID ?? "",
      created_at: r.updated_at ?? r.created_at ?? r.date ?? r.createdAt ?? r.timestamp ?? null,
      customer: r.customer_name ?? r.customer ?? r.name ?? "",
      phone: r.phone ?? r.customer_phone ?? "",
      email: (r.email ?? r.customer_email ?? (r.contact?.includes("@") ? r.contact : "")),
      model: r.model_name ?? r.model ?? r.device ?? "",
      repair: r.repair_title ?? r.repair ?? r.title ?? "",
      price: Number(r.price ?? r.amount ?? 0),
      time: Number(r.time ?? r.duration ?? 0),
      payment: r.payment ?? r.payment_method ?? "",
      payment_type: r.payment_type ?? "",
      status: r.status ?? "",
      part: r.part ?? r.meta?.part ?? null,
    }));
  }, [repairs]);

  /** Gruppér pr. ordre-ID med totaler */
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of normalizedRepairs) {
      const key = r.order_id || r.id;
      if (!map.has(key)) {
        map.set(key, {
          order_id: key,
          created_at: r.created_at,
          customer: r.customer,
          phone: r.phone,
          email: r.email,
          model: r.model,
          status: r.status,
          payment_type: r.payment_type,
          payment: r.payment,
          lines: [],
          totalPrice: 0,
          totalTime: 0,
          _rows: [],
        });
      }
      const g = map.get(key);
      g._rows.push(r);
      if (r.created_at && (!g.created_at || new Date(r.created_at) < new Date(g.created_at))) {
        g.created_at = r.created_at;
      }
      const gLatestTs = new Date(g._rows[g._rows.length - 1]?.created_at || 0).getTime();
      const rTs = new Date(r.created_at || 0).getTime();
      if (rTs >= gLatestTs && r.status) g.status = r.status;

      const sourceId = r?._raw?.id ?? r?.id ?? r?._raw?.post_id ?? r?.post_id ?? null;

      g.lines.push({
        device: r.model,
        repair: r.repair,
        price: Number(r.price || 0),
        time: Number(r.time || 0),
        part: r.part || null,
        source_id: sourceId,
      });
      g.totalPrice += Number(r.price || 0);
      g.totalTime += Number(r.time || 0);
    }

    return Array.from(map.values());
  }, [normalizedRepairs]);

  // --- Åbn specifik ordre fra Dashboard/state (placeret EFTER grouped er defineret) ---
  const consumedOpenRef = useRef(false);
  useEffect(() => {
    const opener = location.state?.openRepair;
    if (!opener || consumedOpenRef.current) return;

    if (!Array.isArray(grouped) || grouped.length === 0) return;

    const key = String(opener.order_id ?? opener.id ?? "");
    const g = grouped.find((x) => String(x.order_id) === key);

    if (g) {
      consumedOpenRef.current = true;
      openGroupedInHistory(g);
      navigate(location.pathname, { replace: true, state: null }); // ryd state
    }
  }, [location, grouped, navigate]);

  /** Filtrering + sortering på gruppe-niveau */
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return grouped
      .filter((g) => {
        if (!term) return true;
        const hay = [
          g.customer, g.phone, g.email, g.model,
          g.lines.map((ln) => `${ln.repair} ${ln.device}`).join(" "),
          String(g.order_id),
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(term);
      })
      .filter((g) => {
        if (!g.created_at) return true;
        const created = new Date(g.created_at);
        if (from && created < from) return false;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (created > toEnd) return false;
        }
        return true;
      })
      .filter((g) => {
        if (selectedStatus === "Alle") return true;
        return String(g.status || "").toLowerCase() === selectedStatus.toLowerCase();
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [grouped, searchTerm, fromDate, toDate, selectedStatus]);

  /* Åbn RepairHistory med syntetisk “samlet ordre” */
  const openGroupedInHistory = (g) => {
    const synthetic = {
      id: g._rows[0]?.id,
      order_id: g.order_id,
      created_at: g.created_at,
      customer: g.customer,
      customer_id:
        g._rows[0]?._raw?.customer_id ??
        g._rows[0]?._raw?.customerId ??
        g._rows.find(r => r?._raw?.customer_id || r?._raw?.customerId)?._raw?.customer_id ??
        g._rows.find(r => r?._raw?.customer_id || r?._raw?.customerId)?._raw?.customerId ??
        null,
      phone: g.phone,
      contact: g.email || g.phone || "",
      status: g.status,
      payment_type: g.payment_type || "efter",
      payment_total: g.totalPrice,
      deposit_amount: null,
      remaining_amount: null,
      note: g._rows[0]?._raw?.note || "",
      password: g._rows[0]?._raw?.password || "",
      lines: g.lines,
      history: g._rows[0]?._raw?.history || [],
    };
    setSelectedRepair(synthetic);
  };

  /* ---------- UI ---------- */
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
          placeholder="Søg navn, telefon, model, reparation eller ordre-id…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 240 }}
        />
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
      </div>

      {/* Statusfilter */}
      <div style={{ marginBottom: "1rem" }}>
        {STATUS_OPTIONS.map((status) => (
          <button key={status} onClick={() => setSelectedStatus(status)} style={statusButtonStyle(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && <p>Indlæser reparationer…</p>}
      {loadError && <p style={{ color: "crimson" }}>{loadError}</p>}

      {/* Tabel – én række pr. ordre */}
      {!loading && !loadError && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Ordre ID</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Oprettet</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Kunde</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Model</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Reparation(er)</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Pris + Tid (total)</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Betaling</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.order_id} onClick={() => openGroupedInHistory(g)} style={{ cursor: "pointer" }}>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{g.order_id}</td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{formatDkDateTime(g.created_at)}</td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{g.customer || "—"}</td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{g.model || (g.lines[0]?.device || "—")}</td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {g.lines.map((ln) => ln.repair).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {formatPrice(g.totalPrice)} • {g.totalTime ? `${g.totalTime} min` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>
                    {g.payment || `Betaling efter reparation: ${g.totalPrice.toLocaleString("da-DK")} kr`}
                  </td>
                  <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{statusPill(g.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && <p style={{ marginTop: "1rem" }}>Ingen reparationer fundet.</p>}
        </>
      )}

      {/* Modal med historik / visning (syntetisk samlet ordre) */}
      {selectedRepair && (
        <RepairHistory
          repair={selectedRepair}
          onClose={() => setSelectedRepair(null)}
          onAfterSave={loadRepairs}  // ⬅️ refresher listen efter gem
        />
      )}
    </div>
  );
}
