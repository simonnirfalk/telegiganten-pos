// src/pages/SparePartsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaTrash,
  FaPlus,
  FaHistory,
  FaHome,
  FaSlidersH,
  FaChevronDown,
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

/** === KONFIG === */
const API_BASE =
  import.meta.env.VITE_SPAREPARTS_V2 || "/wp-json/telegiganten/v1/spareparts-v2";
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
const btnPrimary = {
  backgroundColor: BLUE,
  color: "#fff",
  padding: "10px 14px",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};
const btnGhost = {
  background: "#fff",
  color: BLUE,
  border: `1px solid ${BLUE}33`,
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};
const btnDanger = {
  backgroundColor: "#cc0000",
  color: "#fff",
  padding: "6px 10px",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};
const inputStyle = { padding: 8, borderRadius: 8, border: "1px solid #d1d5db" };
const chip = { fontSize: 13, color: "#64748b" };

const fieldLabelStyle = { fontSize: 12, color: "#64748b", marginBottom: 6 };
const fieldHelpStyle = { marginTop: 6, fontSize: 12, color: "#64748b" };

/** --- helpers --- */
function withQuery(u, q = {}) {
  const url = new URL(u, window.location.origin);
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  return url.toString();
}
function authHeaders(base = {}) {
  const h = { ...base };
  if (AUTH_HEADER) h.Authorization = AUTH_HEADER;
  const nonce = window?.wpApiSettings?.nonce;
  if (nonce) h["X-WP-Nonce"] = nonce;
  return h;
}
async function apiList({ offset = 0, limit = 100, search = "", lokation = "", cb = "" } = {}, signal) {
  const res = await fetch(withQuery(API_BASE, { offset: String(offset), limit: String(limit), search, lokation, cb }), {
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
    e.status = 409;
    e.data = out;
    throw e;
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
  useEffect(() => {
    const t = setTimeout(() => setOut(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
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

  const [pausedNotice, setPausedNotice] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);

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

  const originalRef = useRef(new Map());

  const pollRef = useRef(null);

  function cacheKey(q, loc, limit, p) {
    return `${q}::${loc}::${limit}::${p}`;
  }

  const locationOptions = useMemo(() => {
    const set = new Set();
    parts.forEach((p) => {
      if (p.location) set.add(String(p.location));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [parts]);

  const isPageVisible = () =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true;

  async function fetchPage({ pageArg = page, query = debouncedSearch, loc = locationFilter, bustCache = false } = {}) {
    const key = cacheKey(query, loc, pageSize, pageArg);
    const cached = pageCacheRef.current.get(key);

    if (!bustCache && cached) {
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
        const data = await apiList(
          { offset, limit: lim, search: query, lokation: loc, cb: bustCache ? String(Date.now()) : "" },
          controller.signal
        );
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
        if (!serverErr || isLast) {
          setProblem(e.message || "Kunne ikke hente data");
          break;
        }
      }
    }
    if (myId === reqIdRef.current) setLoading(false);
  }

  function refreshNow() {
    pageCacheRef.current.clear();
    fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter, bustCache: true });
  }

  useEffect(() => {
    fetchPage({ pageArg: 1, query: "", loc: "" }); // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setPage(1);
    pageCacheRef.current.clear();
    fetchPage({ pageArg: 1, query: debouncedSearch, loc: locationFilter, bustCache: true }); // eslint-disable-next-line
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
    pageCacheRef.current.clear();
    fetchPage({ pageArg: 1, query: debouncedSearch, loc: locationFilter, bustCache: true }); // eslint-disable-next-line
  }, [locationFilter]);

  useEffect(() => {
    fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter }); // eslint-disable-next-line
  }, [page]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(() => {
      if (!isPageVisible()) return;
      if (editingIndex !== null) {
        setPausedNotice(true);
        return;
      }
      setPausedNotice(false);
      refreshNow();
    }, 30000);

    const onFocus = () => {
      if (!isPageVisible()) return;
      if (editingIndex !== null) {
        setPausedNotice(true);
        return;
      }
      setPausedNotice(false);
      refreshNow();
    };
    const onVis = () => {
      if (!isPageVisible()) return;
      if (editingIndex !== null) {
        setPausedNotice(true);
        return;
      }
      setPausedNotice(false);
      refreshNow();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [editingIndex, page, debouncedSearch, locationFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveField = async (id, field, finalValue) => {
    const key = `${id}:${field}`;
    const original = originalRef.current.get(key);

    const prevRow = parts.find((p) => p.id === id);
    const fallbackOriginal = prevRow ? prevRow[field] : undefined;

    const before = original !== undefined ? original : fallbackOriginal;

    const normalized =
      field === "price" || field === "cost_price"
        ? Number(finalValue) || 0
        : field === "stock"
        ? Number(finalValue) || 0
        : finalValue;

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
      pageCacheRef.current.clear();
    } catch (e) {
      if (e.status === 409) {
        alert("Rækken er ændret siden sidst. Indlæser igen.");
        pageCacheRef.current.clear();
        fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter, bustCache: true });
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
      if (!clean.model) {
        alert("Model skal udfyldes.");
        return;
      }
      await apiCreate(clean);
      setNewRow(COLS.reduce((acc, k) => ({ ...acc, [k]: "" }), {}));
      pageCacheRef.current.clear();
      setPage(1);
      setCreateOpen(false);
      fetchPage({ pageArg: 1, query: debouncedSearch, loc: locationFilter, bustCache: true });
    } catch (e) {
      alert(e.message || "Kunne ikke oprette række");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Slet denne reservedel?")) return;
    try {
      await apiRemove(id);
      setParts((prev) => prev.filter((p) => p.id !== id));
      pageCacheRef.current.clear();
      fetchPage({ pageArg: page, query: debouncedSearch, loc: locationFilter, bustCache: true });
    } catch (e) {
      alert(e.message || "Kunne ikke slette række");
    }
  }

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
          setPausedNotice(false);
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
    COLS.forEach((c) => {
      if (visibleCols[c]) arr.push(c);
    });
    if (visibleCols.updatedAt) arr.push("updatedAt");
    return arr;
  }, [visibleCols]);

  function ColumnPicker() {
    return (
      <div style={{ position: "relative" }}>
        <button
          style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 8 }}
          onClick={() => setColPickerOpen((o) => !o)}
        >
          <FaSlidersH /> Kolonner <FaChevronDown style={{ fontSize: 12 }} />
        </button>
        {colPickerOpen && (
          <div
            style={{
              position: "absolute",
              zIndex: 20,
              marginTop: 8,
              right: 0,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: 10,
              minWidth: 220,
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            }}
          >
            {[...COLS, "updatedAt"].map((key) => (
              <label
                key={key}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[key]}
                  onChange={(e) => setVisibleCols((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>{LABEL[key] || key}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  function LocationFilter({ buttonStyle }) {
    const filt = locationOptions.filter((l) => l.toLowerCase().includes(locationQuery.toLowerCase()));
    return (
      <div style={{ position: "relative", width: "100%" }}>
        <button
          style={{
            ...btnGhost,
            ...buttonStyle,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
          onClick={() => setLocationOpen((o) => !o)}
        >
          <span>Lokation: {locationFilter || "Alle"}</span>
          <FaChevronDown style={{ fontSize: 12 }} />
        </button>
        {locationOpen && (
          <div
            style={{
              position: "absolute",
              zIndex: 20,
              marginTop: 8,
              right: 0,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: 10,
              width: 260,
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            }}
          >
            <input
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Søg lokation…"
              style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
            />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              <div
                onClick={() => {
                  setLocationFilter("");
                  setLocationOpen(false);
                  setLocationQuery("");
                }}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: locationFilter === "" ? "#f1f5f9" : "transparent",
                }}
              >
                Alle
              </div>
              {filt.map((loc) => (
                <div
                  key={loc}
                  onClick={() => {
                    setLocationFilter(loc);
                    setLocationOpen(false);
                    setLocationQuery("");
                  }}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: locationFilter === loc ? "#f1f5f9" : "transparent",
                  }}
                >
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

  const tableGridTemplate = useMemo(() => {
    const idCol = "90px";
    const handlingCol = "140px";

    const cols = shownCols.map((c) => {
      if (c === "model") return "minmax(260px, 3fr)";
      if (c === "sku") return "minmax(140px, 1.2fr)";
      if (c === "price") return "minmax(110px, 1fr)";
      if (c === "stock") return "minmax(90px, 1fr)";
      if (c === "location") return "minmax(120px, 1fr)";
      if (c === "category") return "minmax(140px, 1.2fr)";
      if (c === "cost_price") return "minmax(120px, 1fr)";
      if (c === "repair") return "minmax(140px, 1.2fr)";
      if (c === "updatedAt") return "minmax(160px, 1fr)";
      return "minmax(120px, 1fr)";
    });

    return `${idCol} ${cols.join(" ")} ${handlingCol}`;
  }, [shownCols]);

  const idxModel = shownCols.indexOf("model");
  const idxCategory = shownCols.indexOf("category");
  const idxCost = shownCols.indexOf("cost_price");
  const idxRepair = shownCols.indexOf("repair");

  const gridColForShown = (idx) => 2 + idx;

  const searchGridStart = idxModel >= 0 ? gridColForShown(idxModel) : 2;
  const searchGridEnd = idxCategory >= 0 ? gridColForShown(idxCategory) + 1 : 2 + shownCols.length;

  const locGridStart = idxCost >= 0 ? gridColForShown(idxCost) : 2;
  const locGridEnd = idxRepair >= 0 ? gridColForShown(idxRepair) + 1 : locGridStart + 1;

  const bannerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    padding: "10px 12px",
    borderRadius: 10,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  };

  return (
    <div style={{ padding: 16 }}>
      {pausedNotice && (
        <div style={bannerStyle}>
          <div style={{ fontWeight: 700 }}>Auto-opdatering er sat på pause mens du redigerer.</div>
          <button
            onClick={() => {
              setPausedNotice(false);
              refreshNow();
            }}
            style={{
              backgroundColor: "#2166AC",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
            title="Hent nyeste data (når du er færdig med at redigere)"
          >
            Opdater nu
          </button>
        </div>
      )}

      {/* Topbar (primære actions) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={() => navigate("/")} style={btnGhost}>
          <FaHome /> Forside
        </button>
        <button onClick={refreshNow} style={btnGhost} title="Hent nyeste data nu">
          Opdater
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setCreateOpen((o) => !o)}
          style={{
            ...btnGhost,
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderColor: createOpen ? `${BLUE}77` : `${BLUE}33`,
            background: createOpen ? "#F0F7FF" : "#fff",
          }}
          title="Åbn/luk opret-ny rækken"
        >
          {createOpen ? <FaTimes /> : <FaPlus />}
          Opret ny
        </button>

        <ColumnPicker />
      </div>

      {/* Info / pagination (TOP) */}
      <div style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={chip}>
          {loading ? "Henter…" : `Viser ${parts.length}${unknownTotal ? "" : ` / ${total}`} rækker`}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label>Pr. side</label>
          <select style={inputStyle} value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
            {LIMITS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
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

      {problem && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "#fee2e2", color: "#7f1d1d" }}>
          {problem}
        </div>
      )}

      {/* Filter-bar “aligned” med tabellen */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 10,
          marginBottom: 10,
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: tableGridTemplate,
            gap: 8,
            alignItems: "start",
            minWidth: 900,
          }}
        >
          {/* tom “ID” kolonne */}
          <div style={{ gridColumn: "1 / 2" }} />

          {/* SØG (uniform: label + input + help) */}
          <div style={{ gridColumn: `${searchGridStart} / ${searchGridEnd}` }}>
            <div style={fieldLabelStyle}>Søg</div>
            <input
              placeholder="Søg fx 'Samsung S20 skærm'…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                ...inputStyle,
                width: "100%",
                padding: "12px 14px",
                fontSize: 16,
                borderRadius: 12,
              }}
            />
            <div style={fieldHelpStyle}>Tip: søg på model, SKU, reparation, kategori eller lokation.</div>
          </div>

          {/* FILTER (uniform: label + dropdown + help) */}
          <div style={{ gridColumn: `${locGridStart} / ${locGridEnd}` }}>
            <div style={fieldLabelStyle}>Filtrér</div>
            <LocationFilter buttonStyle={{ padding: "10px 12px", borderRadius: 12 }} />
            <div style={fieldHelpStyle}>Tip: vælg “Alle” for at vise alle lokationer.</div>
          </div>

          {/* tom “Handling” kolonne */}
          <div style={{ gridColumn: `${shownCols.length + 2} / ${shownCols.length + 3}` }} />
        </div>
      </div>

      {/* Tabel */}
      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: 8, width: 90 }}>ID</th>
              {shownCols.map((c) => (
                <th
                  key={c}
                  style={{
                    textAlign: "left",
                    padding: 8,
                    ...(c === "model" ? { width: "30%", minWidth: 260 } : {}),
                  }}
                >
                  {LABEL[c]}
                </th>
              ))}
              <th style={{ textAlign: "left", padding: 8, width: 110 }}>Handling</th>
            </tr>
          </thead>

          <tbody>
            {createOpen && (
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
                        onChange={(e) =>
                          setNewRow((prev) => ({
                            ...prev,
                            [c]: num ? (e.target.value === "" ? "" : e.target.valueAsNumber) : e.target.value,
                          }))
                        }
                        style={{ ...inputStyle, width: "100%" }}
                        placeholder={LABEL[c]}
                      />
                    </td>
                  );
                })}
                <td style={{ padding: 6, display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={handleCreate} style={btnPrimary}>
                    <FaPlus /> Opret
                  </button>
                  <button
                    onClick={() => {
                      setCreateOpen(false);
                      setNewRow(COLS.reduce((acc, k) => ({ ...acc, [k]: "" }), {}));
                    }}
                    style={btnGhost}
                    title="Luk opret-rækken"
                  >
                    <FaTimes /> Luk
                  </button>
                </td>
              </tr>
            )}

            {parts.map((row) => {
              const rowUpdatedAt = row.updatedAt || row.updated_at || "—";
              return (
                <tr
                  key={row.id}
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    background: editingIndex === row.id ? "#fffbeb" : "#fff",
                  }}
                >
                  <td style={{ padding: 6, color: "#64748b" }}>{row.id}</td>
                  {shownCols.map((c) =>
                    c === "updatedAt" ? (
                      <td key="updatedAt" style={{ padding: 6, fontFamily: "monospace", fontSize: 12 }}>
                        {rowUpdatedAt}
                      </td>
                    ) : (
                      <td key={c} style={{ padding: 6, ...(c === "model" ? { width: "30%", minWidth: 260 } : {}) }}>
                        {cellEditor(row, c)}
                      </td>
                    )
                  )}
                  <td style={{ padding: 6 }}>
                    <button onClick={() => handleDelete(row.id)} style={btnDanger}>
                      <FaTrash /> Slet
                    </button>
                  </td>
                </tr>
              );
            })}

            {!parts.length && !loading && (
              <tr>
                <td colSpan={shownCols.length + 2} style={{ padding: 16, color: "#64748b" }}>
                  Ingen rækker
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (BOTTOM) */}
      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
        <button style={btnGhost} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
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
        <button style={btnGhost} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
          Næste
        </button>
      </div>

      {/* Seneste ændringer */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          <FaHistory /> Seneste ændringer
        </div>
        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Ingen ændringer i denne session.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {history.map((h, i) => (
              <li key={i}>
                #{h.id} — {LABEL[h.field] || h.field}: <em style={{ color: "#64748b" }}>{String(h.old ?? "—")}</em> →{" "}
                <strong>{String(h.newVal ?? "—")}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
