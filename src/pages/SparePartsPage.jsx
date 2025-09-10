// src/pages/SparePartsPage.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { FaUndo, FaTrash, FaPlus, FaHistory, FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

/** URLs:
 *  - LIST (WP endpoint med cache/pagination): /wp-json/telegiganten/v1/spareparts
 *  - EXEC (GAS – create/update/delete):       https://script.google.com/.../exec
 *
 *  Robust fallback: hvis VITE_SPAREPARTS_LIST mangler, prøv VITE_GAS_URL (back-compat),
 *  og som sidste udvej antag WP-route på samme origin.
 */
const LIST_URL =
  import.meta.env.VITE_SPAREPARTS_LIST ||
  import.meta.env.VITE_GAS_URL || // sidst kendte variabel hos dig
  "/wp-json/telegiganten/v1/spareparts";

const EXEC_URL =
  import.meta.env.VITE_GAS_EXEC ||
  import.meta.env.VITE_GAS_URL || // hvis du tidligere brugte samme til POST
  "";

if (!import.meta.env.VITE_SPAREPARTS_LIST) {
  // Én gang pr. load – hjælper med at opdage misconfig i dev tools
  console.warn(
    "[SparePartsPage] VITE_SPAREPARTS_LIST er ikke sat. Bruger fallback:",
    LIST_URL
  );
}

/** Felter vi viser/redigerer (matcher Code.gs -> _apiList kortnøgler) */
const FIELDS = ["model", "price", "stock", "location", "category", "cost_price", "repair"];

// Viste titler (UI) – rører ikke ved kolonne-mapping
const FIELD_LABELS = {
  model: "Model",
  price: "Pris",
  stock: "Lager",
  location: "Lokation",
  category: "Kategori",
  cost_price: "Kostpris",
  repair: "Reparation",
};

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

/* -------------------- UI styles -------------------- */
const BLUE = "#2166AC";
const btnPrimary = { backgroundColor: BLUE, color: "white", padding: "10px 16px", border: "none", borderRadius: 6, cursor: "pointer" };
const btnGhost   = { background: "white", color: BLUE, border: `1px solid ${BLUE}33`, padding: "8px 12px", borderRadius: 6, cursor: "pointer" };
const btnDanger  = { backgroundColor: "#cc0000", color: "white", padding: "6px 10px", border: "none", borderRadius: 6, cursor: "pointer" };
const inputStyle = { padding: 8, borderRadius: 6, border: "1px solid #ccc" };
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

/* -------------------- HTTP -------------------- */
async function httpGet(paramsObj, signal) {
  const base = String(LIST_URL || "").trim();
  if (!base) throw new Error("LIST_URL mangler – sæt VITE_SPAREPARTS_LIST i .env");
  const qs = new URLSearchParams(paramsObj).toString();
  const url = base.includes("?") ? `${base}&${qs}` : `${base}?${qs}`;

  const res = await fetch(url, { method: "GET", signal });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: res.ok, raw: text };
  }
  if (!res.ok || data?.error) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function httpPost(body) {
  const base = String(EXEC_URL || "").trim();
  if (!base) throw new Error("EXEC_URL mangler – sæt VITE_GAS_EXEC i .env");
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: res.ok, raw: text };
  }
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
  return httpGet({ offset: String(offset), limit: String(limit), search, lokation }, signal);
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

/* -------------------- Simple page cache -------------------- */
function makeKey({ query, limit, page }) {
  return `${query}::${limit}::${page}`;
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

  const LIMITS = [200, 100, 50, 25];
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unknownTotal, setUnknownTotal] = useState(false);

  const totalPages = useMemo(() => {
    if (unknownTotal) return page + (parts.length >= pageSize ? 1 : 0);
    return Math.max(1, Math.ceil(total / pageSize));
  }, [unknownTotal, total, pageSize, page, parts.length]);

  const [activeQuery, setActiveQuery] = useState("");

  const listAbortRef = useRef(null);
  const listReqIdRef = useRef(0);

  const pageCacheRef = useRef(new Map());
  const [newPart, setNewPart] = useState(FIELDS.reduce((acc, k) => ((acc[k] = ""), acc), {}));

  const navigate = useNavigate();
  const debounceRow = useRowDebouncers();
  const enqueue = useUpdateQueue();

  const fetchPage = async ({ pageArg = page, query = activeQuery } = {}) => {
    const cacheKey = makeKey({ query, limit: pageSize, page: pageArg });
    const cached = pageCacheRef.current.get(cacheKey);
    if (cached) {
      setParts(cached.items);
      setTotal(cached.total ?? 0);
      setUnknownTotal(cached.total == null);
      setActiveQuery(query);
      setProblem(null);
      return;
    }

    if (listAbortRef.current) listAbortRef.current.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    const myId = ++listReqIdRef.current;

    setLoading(true);
    setProblem(null);

    const currentIdx = Math.max(0, LIMITS.indexOf(pageSize));
    const tryLimits = [pageSize, ...LIMITS.slice(currentIdx + 1)];

    for (const lim of tryLimits) {
      try {
        const offset = (pageArg - 1) * lim;
        const data = await apiList({ offset, limit: lim, search: query, lokation: "" }, controller.signal);
        if (myId !== listReqIdRef.current) return;

        const items = data?.items || [];
        const srvTotal = typeof data?.total === "number" ? data.total : null;

        setParts(items);
        setTotal(srvTotal ?? 0);
        setUnknownTotal(srvTotal == null);
        setActiveQuery(query);

        if (lim !== pageSize) setPageSize(lim);

        pageCacheRef.current.set(cacheKey, { items, total: srvTotal, ts: Date.now() });

        setLoading(false);
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
        const s = e.status || 0;
        const serverErr = s === 500 || s === 502 || s === 504 || s === 0;
        const isLastAttempt = lim === tryLimits[tryLimits.length - 1];
        if (!serverErr || isLastAttempt) {
          setProblem(e.message || "Kunne ikke hente data");
          break;
        }
        // ellers prøv næste lavere limit
      }
    }

    if (myId === listReqIdRef.current) setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    pageCacheRef.current.clear();
    fetchPage({ pageArg: 1, query: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    pageCacheRef.current.clear();
    fetchPage({ pageArg: 1, query: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchPage({ pageArg: page, query: activeQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const saveChange = (id, field, value) => {
    if (id == null) {
      alert("Denne række mangler ID – opdaterer visningen.");
      pageCacheRef.current.clear();
      fetchPage({ pageArg: page, query: activeQuery });
      return;
    }
    const prevRow = parts.find((p) => p.id === id);
    const old = prevRow ? prevRow[field] : undefined;

    setParts((prev) => prev.map((p) => (p.id != null && p.id === id ? { ...p, [field]: value } : p)));
    setHistory((prev) => [{ id, field, old, newVal: value }, ...prev.slice(0, 9)]);

    const debKey = `${id}:${field}`;
    debounceRow(
      debKey,
      () =>
        enqueue(async () => {
          try {
            const current = parts.find((p) => p.id === id) || {};
            await apiUpdate(id, { [field]: value }, current.updatedAt);
            pageCacheRef.current.delete(makeKey({ query: activeQuery, limit: pageSize, page }));
            await fetchPage({ pageArg: page, query: activeQuery });
          } catch (e) {
            if (e.status === 409) {
              pageCacheRef.current.clear();
              await fetchPage({ pageArg: page, query: activeQuery });
              alert("Rækken blev ændret et andet sted. Se opdaterede værdier og prøv igen.");
            } else {
              setParts((prev) => prev.map((p) => (p.id != null && p.id === id ? { ...p, [field]: old } : p)));
              alert(e.message || "Fejl ved opdatering");
            }
          }
        }),
      600
    );
  };

  const undoLast = () => {
    const last = history[0];
    if (!last) return;
    saveChange(last.id, last.field, last.old);
    setHistory((prev) => prev.slice(1));
  };

  const addPart = async () => {
    try {
      await enqueue(async () => { await apiCreate(newPart); });
      setNewPart(FIELDS.reduce((acc, k) => ((acc[k] = ""), acc), {}));
      pageCacheRef.current.clear();
      await fetchPage({ pageArg: 1, query: activeQuery });
      setPage(1);
    } catch (e) {
      alert(e.message || "Fejl ved oprettelse");
    }
  };

  const deletePart = async (id) => {
    if (!window.confirm("Er du sikker på at du vil slette?")) return;
    try {
      await enqueue(async () => { await apiDelete(id); });
      pageCacheRef.current.clear();
      const newTotal = Math.max(0, total - 1);
      const maxPage = Math.max(1, Math.ceil(newTotal / pageSize));
      const nextPage = Math.min(page, maxPage);
      setPage(nextPage);
      await fetchPage({ pageArg: nextPage, query: activeQuery });
    } catch (e) {
      alert(e.message || "Fejl ved sletning");
    }
  };

  const totalInfo = unknownTotal ? (
    <span>Viser {parts.length} rækker (ukendt total)</span>
  ) : (
    <span>Viser {parts.length} af {total} match</span>
  );

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button onClick={() => navigate("/")} style={btnPrimary}>
          <FaHome style={{ marginRight: 6 }} /> Dashboard
        </button>
      </div>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1rem" }}>
        Reservedele
      </h2>

      <div
        style={{
          position: "sticky", top: 0, zIndex: 10, background: "#f9f9f9",
          padding: "1rem 0", display: "flex", flexWrap: "wrap", gap: "1rem",
          alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid #ddd",
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
          placeholder="Søg…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          title="Server-side søgning (hele arket)"
        />

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#334155" }}>pr. side:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPageSize(n);
              setPage(1);
              pageCacheRef.current.clear();
              fetchPage({ pageArg: 1, query: activeQuery });
            }}
            style={{ ...inputStyle, padding: "6px 8px" }}
          >
            {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <button
            onClick={() => setEditingIndex(editingIndex === -1 ? null : -1)}
            style={btnPrimary}
            title="Tilføj ny række"
          >
            <FaPlus style={{ marginRight: 6 }} />
            Tilføj reservedel, Samer
          </button>

          {loading && <span style={chip} aria-live="polite">Indlæser…</span>}
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>
        {problem ? (
          <span style={{ color: "#cc0000" }}>{problem}</span>
        ) : (
          <>
            {totalInfo}
            <span> · Side {page} af {totalPages}</span>
            {activeQuery && <span style={chip}> · Søg: “{activeQuery}”</span>}
            <span style={chip}> · pr. side: {pageSize}</span>
          </>
        )}
      </div>

      {editingIndex === -1 && (
        <div
          style={{ marginBottom: "1rem", border: "1px solid #ddd", padding: "1rem", borderRadius: 6, background: "#fff" }}
        >
          <h4 style={{ marginBottom: "0.75rem", fontSize: "1.05rem", fontWeight: "bold" }}>Opret ny reservedel</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.6fr 0.6fr 1fr 1fr 1fr 1.2fr auto", gap: "0.5rem" }}>
            {FIELDS.map((field) => (
              <input
                key={`new-${field}`}
                placeholder={FIELD_LABELS[field] || field}
                aria-label={FIELD_LABELS[field] || field}
                value={newPart[field]}
                onChange={(e) => setNewPart((prev) => ({ ...prev, [field]: e.target.value }))}
                style={inputStyle}
              />
            ))}
            <button onClick={addPart} style={btnPrimary}>Tilføj</button>
          </div>
        </div>
      )}

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

      <div
        style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.25rem", flexWrap: "wrap" }}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          style={{
            ...(page <= 1 || loading ? { backgroundColor: "#ccc", cursor: "not-allowed" } : { backgroundColor: BLUE, cursor: "pointer" }),
            color: "white", padding: "6px 14px", borderRadius: 6, border: "none",
          }}
        >
          Forrige
        </button>

        <span style={{ fontSize: "0.95rem" }}>
          Side {page} af {totalPages} { !unknownTotal && <span style={chip}>({total} rækker)</span> }
        </span>

        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={(!unknownTotal && page >= totalPages) || loading || (unknownTotal && parts.length < pageSize)}
          style={{
            ...( (!unknownTotal && page >= totalPages) || loading || (unknownTotal && parts.length < pageSize)
              ? { backgroundColor: "#ccc", cursor: "not-allowed" }
              : { backgroundColor: BLUE, cursor: "pointer" } ),
            color: "white", padding: "6px 14px", borderRadius: 6, border: "none",
          }}
        >
          Næste
        </button>
      </div>
    </div>
  );
}
