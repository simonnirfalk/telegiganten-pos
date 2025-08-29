// src/pages/SparePartsPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { FaUndo, FaTrash, FaPlus, FaHistory, FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

/** Sæt til din GAS Web App EXEC-URL */
const GAS_URL = import.meta.env.VITE_GAS_URL;

/** Felter vi viser/redigerer (matcher Code.gs -> _apiList kortnøgler) */
const FIELDS = ["model", "price", "stock", "location", "category", "cost_price", "repair"];

/** Map til create-kald (kortnøgle -> header i arket) */
const TO_SHEET_HEADER = {
  model: "Model",
  sku: "SKU",
  price: "Pris",
  stock: "Lager",
  location: "Lokation",
  category: "Kategori",
  cost_price: "Kostpris",
  repair: "Reparation",
};

/* -------------------- UI styles (matcher EditRepairsPage) -------------------- */
const BLUE = "#2166AC";
const btnPrimary = {
  backgroundColor: BLUE,
  color: "white",
  padding: "10px 16px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
const btnGhost = {
  background: "white",
  color: BLUE,
  border: `1px solid ${BLUE}33`,
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};
const btnDanger = {
  backgroundColor: "#cc0000",
  color: "white",
  padding: "6px 10px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
const inputStyle = {
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};
const chip = { fontSize: 12, color: "#64748b" };

/* -------------------- små helpers -------------------- */
function useRowDebouncers() {
  const mapRef = useRef(new Map());
  return (key, fn, delay = 600) => {
    const map = mapRef.current;
    if (map.has(key)) clearTimeout(map.get(key));
    const t = setTimeout(fn, delay);
    map.set(key, t);
  };
}
function useUpdateQueue() {
  const chainRef = useRef(Promise.resolve());
  return (task) => {
    const next = chainRef.current.then(() => task()).catch(() => {});
    chainRef.current = next;
    return next;
  };
}
function useDebouncedValue(value, delay = 500) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* -------------------- HTTP mod GAS -------------------- */
async function httpGet(paramsObj, signal) {
  const qs = new URLSearchParams(paramsObj).toString();
  const res = await fetch(`${GAS_URL}?${qs}`, { method: "GET", signal });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: res.ok, raw: text }; }
  if (!res.ok || data?.error) throw new Error(data?.error || "Request failed");
  return data;
}
// text/plain for at undgå CORS preflight på GAS
async function httpPost(body) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: res.ok, raw: text }; }
  if (data?.status === "conflict") {
    const err = new Error("Conflict");
    err.status = 409;
    err.data = data;
    throw err;
  }
  if (!res.ok || data?.error) {
    const err = new Error(data?.error || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* -------------------- API wrapper -------------------- */
async function apiList({ offset = 0, limit = 200, search = "", lokation = "" } = {}, signal) {
  return httpGet({ api: "list", offset: String(offset), limit: String(limit), search, lokation }, signal);
}
async function apiCreate(rowShort) {
  const rowHeaders = {};
  const withSku = { sku: "", ...rowShort };
  for (const [shortKey, val] of Object.entries(withSku)) {
    const header = TO_SHEET_HEADER[shortKey];
    if (header) rowHeaders[header] = val ?? "";
  }
  return httpPost({ action: "create", row: rowHeaders });
}
async function apiUpdate(id, patchShort, expectedUpdatedAt) {
  return httpPost({ action: "update", id, patch: patchShort, expectedUpdatedAt: expectedUpdatedAt || null });
}
async function apiDelete(id) {
  return httpPost({ action: "delete", id });
}

/* -------------------- Komponent -------------------- */
export default function SparePartsPage() {
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const [history, setHistory] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(null);

  // paging
  const PAGE_SIZE = 200;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [activeQuery, setActiveQuery] = useState("");

  // anti-stale guards
  const listAbortRef = useRef(null);
  const listReqIdRef = useRef(0);

  const [newPart, setNewPart] = useState(
    FIELDS.reduce((acc, k) => ((acc[k] = ""), acc), {})
  );

  const navigate = useNavigate();
  const debounceRow = useRowDebouncers();
  const enqueue = useUpdateQueue();

  /** Hent side (med stale guards) */
  const fetchPage = async ({ pageArg = page, query = activeQuery } = {}) => {
    if (listAbortRef.current) listAbortRef.current.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    const myId = ++listReqIdRef.current;

    setLoading(true);
    setProblem(null);

    try {
      const offset = (pageArg - 1) * PAGE_SIZE;
      const data = await apiList(
        { offset, limit: PAGE_SIZE, search: query, lokation: "" },
        controller.signal
      );
      if (myId !== listReqIdRef.current) return;

      const items = data?.items || [];
      setParts(items);
      setTotal(Number(data?.total || 0));
      setActiveQuery(query);
    } catch (e) {
      if (e.name === "AbortError") return;
      setProblem(e.message || "Kunne ikke hente data");
    } finally {
      if (myId === listReqIdRef.current) setLoading(false);
    }
  };

  // Første load
  useEffect(() => { fetchPage({ pageArg: 1, query: "" }); /* eslint-disable-next-line */ }, []);

  // Debounced søgning -> side 1
  useEffect(() => {
    setPage(1);
    fetchPage({ pageArg: 1, query: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Side skifter -> hent
  useEffect(() => {
    fetchPage({ pageArg: page, query: activeQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /** Gem ændring (optimistic + debounce + kø) */
  const saveChange = (id, field, value) => {
    if (id == null) {
      alert("Denne række mangler ID – opdaterer visningen.");
      fetchPage({ pageArg: page, query: activeQuery });
      return;
    }
    const prevRow = parts.find((p) => p.id === id);
    const old = prevRow ? prevRow[field] : undefined;

    setParts((prev) =>
      prev.map((p) => (p.id != null && p.id === id ? { ...p, [field]: value } : p))
    );
    setHistory((prev) => [{ id, field, old, newVal: value }, ...prev.slice(0, 9)]);

    const debKey = `${id}:${field}`;
    debounceRow(
      debKey,
      () =>
        enqueue(async () => {
          try {
            const current = (parts.find((p) => p.id === id) || {});
            await apiUpdate(id, { [field]: value }, current.updatedAt);
            await fetchPage({ pageArg: page, query: activeQuery });
          } catch (e) {
            if (e.status === 409) {
              await fetchPage({ pageArg: page, query: activeQuery });
              alert("Rækken blev ændret et andet sted. Se opdaterede værdier og prøv igen.");
            } else {
              setParts((prev) =>
                prev.map((p) => (p.id != null && p.id === id ? { ...p, [field]: old } : p))
              );
              alert(e.message || "Fejl ved opdatering");
            }
          }
        }),
      600
    );
  };

  /** Undo sidste ændring */
  const undoLast = () => {
    const last = history[0];
    if (!last) return;
    saveChange(last.id, last.field, last.old);
    setHistory((prev) => prev.slice(1));
  };

  /** Opret */
  const addPart = async () => {
    try {
      await enqueue(async () => { await apiCreate(newPart); });
      setNewPart(FIELDS.reduce((acc, k) => ((acc[k] = ""), acc), {}));
      await fetchPage({ pageArg: 1, query: activeQuery });
      setPage(1);
    } catch (e) {
      alert(e.message || "Fejl ved oprettelse");
    }
  };

  /** Slet */
  const deletePart = async (id) => {
    if (!window.confirm("Er du sikker på at du vil slette?")) return;
    try {
      await enqueue(async () => { await apiDelete(id); });
      const newTotal = Math.max(0, total - 1);
      const maxPage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      const nextPage = Math.min(page, maxPage);
      setPage(nextPage);
      await fetchPage({ pageArg: nextPage, query: activeQuery });
    } catch (e) {
      alert(e.message || "Fejl ved sletning");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: "2rem" }}>
      {/* Top-knap (samme som EditRepairsPage) */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button onClick={() => navigate("/")} style={btnPrimary}>
          <FaHome style={{ marginRight: 6 }} /> Dashboard
        </button>
      </div>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1rem" }}>
        Reservedele
      </h2>

      {/* Sticky værktøjsbar (matcher EditRepairsPage) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#f9f9f9",
          padding: "1rem 0",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #ddd",
        }}
      >
        <button onClick={undoLast} style={btnGhost} title="Fortryd sidste ændring">
          <FaUndo style={{ marginRight: 6 }} />
          Fortryd
        </button>

        <button onClick={() => alert(JSON.stringify(history, null, 2))} style={btnGhost} title="Vis historik (debug)">
          <FaHistory style={{ marginRight: 6 }} />
          Historik
        </button>

        <input
          style={{ ...inputStyle, width: 320 }}
          placeholder="Søg… (server, debounce)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          title="Server-side søgning (hele arket)"
        />

        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <button
            onClick={() => setEditingIndex(editingIndex === -1 ? null : -1)}
            style={btnPrimary}
            title="Tilføj ny række"
          >
            <FaPlus style={{ marginRight: 6 }} />
            Tilføj reservedel
          </button>

          {loading && <span style={chip} aria-live="polite">Indlæser…</span>}
        </div>
      </div>

      {/* Info / fejl */}
      <div style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>
        {problem ? (
          <span style={{ color: "#cc0000" }}>{problem}</span>
        ) : (
          <>
            <span>Viser {parts.length} af {total} match</span>
            <span> · Side {page} af {totalPages}</span>
            {activeQuery && <span style={chip}> · Søg: “{activeQuery}”</span>}
          </>
        )}
      </div>

      {/* Opret ny række (inline form) */}
      {editingIndex === -1 && (
        <div
          style={{
            marginBottom: "1rem",
            border: "1px solid #ddd",
            padding: "1rem",
            borderRadius: "6px",
            background: "#fff",
          }}
        >
          <h4 style={{ marginBottom: "0.75rem", fontSize: "1.05rem", fontWeight: "bold" }}>
            Opret ny reservedel
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.6fr 0.6fr 1fr 1fr 1fr 1.2fr auto", gap: "0.5rem" }}>
            {FIELDS.map((field) => (
              <input
                key={`new-${field}`}
                placeholder={field}
                value={newPart[field]}
                onChange={(e) => setNewPart((prev) => ({ ...prev, [field]: e.target.value }))}
                style={inputStyle}
              />
            ))}
            <button onClick={addPart} style={btnPrimary}>
              Tilføj
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
            <tr>
              <th className="p-2 text-left" style={{ width: "40%" }}>Model</th>
              <th className="p-2 text-left" style={{ width: "6%" }}>Pris</th>
              <th className="p-2 text-left" style={{ width: "6%" }}>Lager</th>
              <th className="p-2 text-left" style={{ width: "12%" }}>Lokation</th>
              <th className="p-2 text-left" style={{ width: "12%" }}>Kategori</th>
              <th className="p-2 text-left" style={{ width: "12%" }}>Kostpris</th>
              <th className="p-2 text-left" style={{ width: "12%" }}>Reparation</th>
              <th className="p-2 text-left" style={{ width: "6%" }}></th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, idx) => {
              const keyBase = part.id ?? `row-${idx}`;
              return (
                <tr key={keyBase} style={{ borderTop: "1px dashed #e5e7eb" }}>
                  {FIELDS.map((field) => (
                    <td key={`${keyBase}-${field}`} className="p-1">
                      <input
                        style={{ ...inputStyle, padding: "6px", width: "100%" }}
                        value={part[field] ?? ""}
                        onChange={(e) => saveChange(part.id, field, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="p-1" style={{ textAlign: "right" }}>
                    <button
                      onClick={() => part.id != null && deletePart(part.id)}
                      style={btnDanger}
                      title="Slet række"
                      disabled={part.id == null}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              );
            })}
            {parts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "1rem", color: "#64748b" }}>
                  Ingen resultater.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls (samme look & feel) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginTop: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          style={{
            ...(page <= 1 || loading ? { backgroundColor: "#ccc", cursor: "not-allowed" } : { backgroundColor: BLUE, cursor: "pointer" }),
            color: "white",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
          }}
        >
          Forrige
        </button>

        <span style={{ fontSize: "0.95rem" }}>
          Side {page} af {totalPages}{" "}
          <span style={chip}>({total} rækker)</span>
        </span>

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          style={{
            ...(page >= totalPages || loading ? { backgroundColor: "#ccc", cursor: "not-allowed" } : { backgroundColor: BLUE, cursor: "pointer" }),
            color: "white",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
          }}
        >
          Næste
        </button>
      </div>
    </div>
  );
}
