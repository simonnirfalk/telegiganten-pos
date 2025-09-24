// src/pages/SparePartsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaTrash, FaPlus, FaHistory, FaHome, FaSlidersH, FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

/** === KONFIG === */
const API_BASE = import.meta.env.VITE_SPAREPARTS_V2 || "/wp-json/telegiganten/v1/spareparts-v2";
const AUTH_HEADER = (import.meta.env.VITE_WP_BASIC_AUTH || "").trim();

// must-keep felter
const COLS = ["model", "sku", "price", "stock", "location", "category", "cost_price", "repair"];
const LABEL = {
  model: "Model",
  sku: "SKU",
  price: "Pris",
  stock: "Lager",
  location: "Lokation",
  category: "Kategori",
  cost_price: "Kostpris",
  repair: "Reparation",
  updatedAt: "UpdatedAt",
};

/** --- UI styles --- */
const BLUE = "#2166AC";
const btnPrimary = { backgroundColor: BLUE, color: "#fff", padding: "10px 14px", border: "none", borderRadius: 8, cursor: "pointer" };
const btnGhost   = { background: "#fff", color: BLUE, border: `1px solid ${BLUE}33`, padding: "8px 12px", borderRadius: 8, cursor: "pointer" };
const btnDanger  = { backgroundColor: "#cc0000", color: "#fff", padding: "6px 10px", border: "none", borderRadius: 8, cursor: "pointer" };
const inputStyle = { padding: 8, borderRadius: 8, border: "1px solid #d1d5db" };
const chip = { fontSize: 13, color: "#64748b" };

/** --- helpers --- */
function withQuery(u, q = {}) {
  const url = new URL(u, window.location.origin);
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v); });
  return url.toString();
}
function authHeaders(base = {}) {
  const h = { ...base };
  if (AUTH_HEADER) h.Authorization = AUTH_HEADER;
  const nonce = window?.wpApiSettings?.nonce;
  if (nonce) h["X-WP-Nonce"] = nonce;
  return h;
}
async function apiList({ offset = 0, limit = 100, search = "", lokation = "" } = {}, signal) {
  const res = await fetch(withQuery(API_BASE, { offset: String(offset), limit: String(limit), search, lokation }), {
    method: "GET",
    headers: authHeaders({ Accept: "application/json" }),
    signal,
  });
  if (!res.ok) throw new Error(`List fejlede (${res.status})`);
  const data = await res.json().catch(() => ({}));
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data.items || [], total: typeof data.total === "number" ? data.total : null };
}
async function apiCreate(row) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(row),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out?.message || `Create fejlede (${res.status})`);
  return out;
}
async function apiPatch(id, patch, expectedUpdatedAt) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ patch, expectedUpdatedAt }),
  });
  const out = await res.json().catch(() => ({}));
  if (res.status === 409) {
    const e = new Error(out?.message || "Conflict");
    e.status = 409; e.data = out; throw e;
  }
  if (!res.ok) throw new Error(out?.message || `Update fejlede (${res.status})`);
  return out;
}
async function apiRemove(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE", headers: authHeaders({ Accept: "application/json" }) });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    throw new Error(out?.message || `Delete fejlede (${res.status})`);
  }
  return true;
}
function useDebouncedValue(v, ms = 500) {
  const [out, setOut] = useState(v);
  useEffect(() => { const t = setTimeout(() => setOut(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return out;
}

export default function SparePartsPage() {
  const navigate = useNavigate();

  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [unknownTotal, setUnknownTotal] = useState(false);

  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const [locationFilter, setLocationFilter] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");

  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  // kolonne-visibility (SKU, Pris, UpdatedAt skjult by default)
  const [visibleCols, setVisibleCols] = useState(() => ({
    model: true,
    sku: false,
    price: false,
    stock: true,
    location: true,
    category: true,
    cost_price: true,
    repair: true,
    updatedAt: false,
  }));
  const [colPickerOpen, setColPickerOpen] = useState(false);

  const LIMITS = [200, 100, 50, 25];
  const totalPages = useMemo(() => {
    if (unknownTotal) return page + (parts.length >= pageSize ? 1 : 0);
    return Math.max(1, Math.ceil((total || 0) / pageSize));
  }, [unknownTotal, total, pageSize, page, parts.length]);

  const abortRef = useRef(null);
  const reqIdRef = useRef(0);
  const pageCacheRef = useRef(new Map());

  // 👉 snapshot originalværdi pr. felt ved redigering
  const originalRef = useRef(new Map());

  function cacheKey(q, loc, limit, p) { return `${q}::${loc}::${limit}::${p}`; }

  const locationOptions = useMemo(() => {
    const set = new Set();
    parts.forEach(p => { if (p.location) set.add(String(p.location)); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [parts]);

  async function fetchPage({ pageArg = page, query = debouncedSearch, loc = locationFilter } = {}) {
    const key = cacheKey(query, loc, pageSize, pageArg);
    const cached = pageCacheRef.current.get(key);
    if (cached) {
      setParts(cached.items);
      setTotal(cached.total ?? 0);
      setUnknownTotal(cached.total == null);
      setProblem("");
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const myId = ++reqIdRef.current;

    setLoading(true);
    setProblem("");

    const currentIdx = Math.max(0, LIMITS.indexOf(pageSize));
    const tryLimits = [pageSize, ...LIMITS.slice(currentIdx + 1)];

    for (const lim of tryLimits) {
      try {
        const offset = (pageArg - 1) * lim;
        const data = await apiList({ offset, limit: lim, search: query, lokation: loc }, controller.signal);
        if (myId !== reqIdRef.current) return;

        const items = Array.isArray(data?.items) ? data.items : [];
        const srvTotal = typeof data?.total === "number" ? data.total : null;

        setParts(items);
        setTotal(srvTotal ?? 0);
        setUnknownTotal(srvTotal == null);
        if (lim !== pageSize) setPageSize(lim);

        pageCacheRef.current.set(key, { items, total: srvTotal, ts: Date.now() });
        setLoading(false);
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
        const serverErr = [0, 500, 502, 504].includes(e.status || 0);
        const isLast = lim === tryLimits[tryLimits.length - 1];
        if (!serverErr || isLast) { setProblem(e.message || "Kunne ikke hente data"); break; }
      }
    }
    if (myId === reqIdRef.current) setLoading(false);
  }

  // initial fetch
  useEffect(() => { fetchPage({ pageArg: 1, query: "", loc: "" }); /* eslint-disable-next-line */ }, []);
  // search ændrer
  useEffect(() => { setPage(1); pageCacheRef.current.clear(); fetchPage({ pageArg: 1, query: debouncedSearch, loc: locationFilter }); /* eslint-disable-next-line */ }, [debouncedSearch]);
  // lokationsfilter ændrer
  useEffect(() => { setPage(1); pageCacheRef.current.clear(); fetchPage({ pageArg: 1, query: debouncedSearch, loc: locationFilter }); /* eslint-disable-next-line */ }, [locationFilter]);
  // side ændrer
  useEffect(() => { fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter }); /* eslint-disable-next-line */ }, [page]);

  /** Gem på blur/Enter — sammenlign med ORIGINAL (ikke state) */
  const saveField = async (id, field, finalValue) => {
    const key = `${id}:${field}`;
    const original = originalRef.current.get(key);

    const prevRow = parts.find((p) => p.id === id);
    const fallbackOriginal = prevRow ? prevRow[field] : undefined;

    const before = original !== undefined ? original : fallbackOriginal;

    const normalized =
      field === "price" || field === "cost_price" ? (Number(finalValue) || 0) :
      field === "stock" ? (Number(finalValue) || 0) :
      finalValue;

    if (String(normalized) === String(before ?? "")) {
      originalRef.current.delete(key);
      return;
    }

    const expectedUpdatedAt = prevRow?.updatedAt || prevRow?.updated_at || null;
    const patch = { [field]: normalized };

    try {
      const updated = await apiPatch(id, patch, expectedUpdatedAt);
      setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      setHistory((h) => [{ id, field, old: before, newVal: normalized }, ...h.slice(0, 49)]);
    } catch (e) {
      if (e.status === 409) {
        alert("Rækken er ændret siden sidst. Indlæser igen.");
        pageCacheRef.current.clear();
        fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter });
      } else {
        alert(e.message || "Kunne ikke gemme ændring");
        setParts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: before } : p)));
      }
    } finally {
      originalRef.current.delete(key);
    }
  };

  const [newRow, setNewRow] = useState(() => COLS.reduce((acc, k) => ({ ...acc, [k]: "" }), {}));
  async function handleCreate() {
    try {
      const clean = {
        model: String(newRow.model || "").trim(),
        sku: String(newRow.sku || "").trim(),
        price: Number(newRow.price) || 0,
        stock: Number(newRow.stock) || 0,
        location: String(newRow.location || ""),
        category: String(newRow.category || ""),
        cost_price: Number(newRow.cost_price) || 0,
        repair: String(newRow.repair || ""),
      };
      if (!clean.model) { alert("Model skal udfyldes."); return; }
      await apiCreate(clean);
      setNewRow(COLS.reduce((acc, k) => ({ ...acc, [k]: "" }), {}));
      pageCacheRef.current.clear();
      setPage(1);
      fetchPage({ pageArg: 1, query: debouncedSearch, loc: locationFilter });
    } catch (e) { alert(e.message || "Kunne ikke oprette række"); }
  }
  async function handleDelete(id) {
    if (!window.confirm("Slet denne reservedel?")) return;
    try {
      await apiRemove(id);
      setParts((prev) => prev.filter((p) => p.id !== id));
      pageCacheRef.current.clear();
      fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter });
    } catch (e) { alert(e.message || "Kunne ikke slette række"); }
  }

  /** --- UI helpers --- */
  function cellEditor(row, field) {
    const v = row[field] ?? "";
    const num = field === "price" || field === "stock" || field === "cost_price";

    const toVal = (ev) => (num ? (ev.target.value === "" ? "" : ev.target.valueAsNumber) : ev.target.value);
    const key = `${row.id}:${field}`;

    return (
      <input
        type={num ? "number" : "text"}
        step={num ? "0.01" : undefined}
        value={String(v)}
        onChange={(e) => {
          const val = toVal(e);
          setParts((prev) => prev.map((p) => (p.id === row.id ? { ...p, [field]: val } : p)));
        }}
        onFocus={() => {
          setEditingIndex(row.id);
          if (!originalRef.current.has(key)) {
            originalRef.current.set(key, row[field]);
          }
        }}
        onBlur={(e) => {
          const val = toVal(e);
          saveField(row.id, field, val);
          setEditingIndex(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const val = toVal(e);
            saveField(row.id, field, val);
            e.currentTarget.blur();
          }
        }}
        style={{ ...inputStyle, width: "100%" }}
      />
    );
  }

  const shownCols = useMemo(() => {
    const arr = [];
    COLS.forEach((c) => { if (visibleCols[c]) arr.push(c); });
    if (visibleCols.updatedAt) arr.push("updatedAt");
    return arr;
  }, [visibleCols]);

  function ColumnPicker() {
    return (
      <div style={{ position: "relative" }}>
        <button style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 8 }} onClick={() => setColPickerOpen((o) => !o)}>
          <FaSlidersH /> Kolonner <FaChevronDown style={{ fontSize: 12 }} />
        </button>
        {colPickerOpen && (
          <div style={{
            position: "absolute", zIndex: 20, marginTop: 8, right: 0,
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minWidth: 220,
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)"
          }}>
            {[...COLS, "updatedAt"].map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer" }}>
                <input type="checkbox" checked={!!visibleCols[key]} onChange={(e) => setVisibleCols((prev) => ({ ...prev, [key]: e.target.checked }))} />
                <span>{LABEL[key] || key}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  function LocationFilter() {
    const filt = locationOptions.filter(l => l.toLowerCase().includes(locationQuery.toLowerCase()));
    return (
      <div style={{ position: "relative" }}>
        <button style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 8 }} onClick={() => setLocationOpen((o) => !o)}>
          Lokation: {locationFilter || "Alle"} <FaChevronDown style={{ fontSize: 12 }} />
        </button>
        {locationOpen && (
          <div style={{
            position: "absolute", zIndex: 20, marginTop: 8,
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, width: 260,
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)"
          }}>
            <input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="Søg lokation…" style={{ ...inputStyle, width: "100%", marginBottom: 8 }} />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              <div onClick={() => { setLocationFilter(""); setLocationOpen(false); setLocationQuery(""); }}
                   style={{ padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: locationFilter === "" ? "#f1f5f9" : "transparent" }}>
                Alle
              </div>
              {filt.map((loc) => (
                <div key={loc} onClick={() => { setLocationFilter(loc); setLocationOpen(false); setLocationQuery(""); }}
                     style={{ padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: locationFilter === loc ? "#f1f5f9" : "transparent" }}>
                  {loc}
                </div>
              ))}
              {!filt.length && <div style={{ padding: "6px 8px", color: "#64748b" }}>Ingen match</div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={() => navigate("/")} style={btnGhost}><FaHome /> Forside</button>
        <div style={{ flex: 1 }} />
        <input placeholder="Søg fx 'Samsung S20 skærm'…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, width: 380 }} />
        <LocationFilter />
        <ColumnPicker />
      </div>

      {/* Info / pagination (TOP) */}
      <div style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={chip}>{loading ? "Henter…" : `Viser ${parts.length}${unknownTotal ? "" : ` / ${total}`} rækker`}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label>Pr. side</label>
          <select style={inputStyle} value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
            {LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label>Side</label>
          <input
            style={{ ...inputStyle, width: 70 }}
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => setPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value || "1", 10))))}
            onBlur={() => fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter })}
          />
          <span style={chip}>af {totalPages}</span>
        </div>
      </div>

      {problem && <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "#fee2e2", color: "#7f1d1d" }}>{problem}</div>}

      {/* Tabel */}
      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: 8, width: 90 }}>ID</th>
              {shownCols.map((c) => (
                <th key={c} style={{ textAlign: "left", padding: 8, ...(c === "model" ? { width: "30%", minWidth: 260 } : {}) }}>
                  {LABEL[c]}
                </th>
              ))}
              <th style={{ textAlign: "left", padding: 8, width: 110 }}>Handling</th>
            </tr>
          </thead>
          <tbody>
            {/* Opret-ny række */}
            <tr style={{ background: "#F0F7FF", borderBottom: "2px solid #e2e8f0" }}>
              <td style={{ padding: 8, color: "#334155", fontWeight: 700 }}>Opret ny</td>
              {shownCols.map((c) => {
                const num = c === "price" || c === "stock" || c === "cost_price";
                return (
                  <td key={c} style={{ padding: 6 }}>
                    <input
                      type={num ? "number" : "text"}
                      step={num ? "0.01" : undefined}
                      value={String(newRow[c] ?? "")}
                      onChange={(e) => setNewRow((prev) => ({ ...prev, [c]: num ? (e.target.value === "" ? "" : e.target.valueAsNumber) : e.target.value }))}
                      style={{ ...inputStyle, width: "100%" }}
                      placeholder={LABEL[c]}
                    />
                  </td>
                );
              })}
              <td style={{ padding: 6 }}>
                <button onClick={handleCreate} style={btnPrimary}><FaPlus /> Opret</button>
              </td>
            </tr>

            {parts.map((row) => {
              const rowUpdatedAt = row.updatedAt || row.updated_at || "—";
              return (
                <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9", background: editingIndex === row.id ? "#fffbeb" : "#fff" }}>
                  <td style={{ padding: 6, color: "#64748b" }}>{row.id}</td>
                  {shownCols.map((c) =>
                    c === "updatedAt" ? (
                      <td key="updatedAt" style={{ padding: 6, fontFamily: "monospace", fontSize: 12 }}>{rowUpdatedAt}</td>
                    ) : (
                      <td key={c} style={{ padding: 6, ...(c === "model" ? { width: "30%", minWidth: 260 } : {}) }}>
                        {cellEditor(row, c)}
                      </td>
                    )
                  )}
                  <td style={{ padding: 6 }}>
                    <button onClick={() => handleDelete(row.id)} style={btnDanger}><FaTrash /> Slet</button>
                  </td>
                </tr>
              );
            })}

            {!parts.length && !loading && (
              <tr><td colSpan={shownCols.length + 2} style={{ padding: 16, color: "#64748b" }}>Ingen rækker</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (BOTTOM) */}
      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
        <button
          style={btnGhost}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Forrige
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label>Gå til side</label>
          <input
            style={{ ...inputStyle, width: 70 }}
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => setPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value || "1", 10))))}
            onBlur={() => fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter })}
          />
          <span style={chip}>af {totalPages}</span>
        </div>
        <button
          style={btnGhost}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Næste
        </button>
      </div>

      {/* Seneste ændringer */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}><FaHistory /> Seneste ændringer</div>
        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Ingen ændringer i denne session.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {history.map((h, i) => (
              <li key={i}>
                #{h.id} — {(LABEL[h.field] || h.field)}: <em style={{ color: "#64748b" }}>{String(h.old ?? "—")}</em> → <strong>{String(h.newVal ?? "—")}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
