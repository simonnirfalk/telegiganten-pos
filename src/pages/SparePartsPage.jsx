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

/** --- små helpers --- */
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

/** --- HTTP mod GAS --- */
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

/** --- API wrapper --- */
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

/** --- Komponent --- */
export default function SparePartsPage() {
  const [parts, setParts] = useState([]);       // viste rækker (200 pr. side)
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

  // den query der faktisk er i brug i resultaterne
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

  // Når debounced søgning ændres -> gå til side 1 og hent
  useEffect(() => {
    setPage(1);
    fetchPage({ pageArg: 1, query: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Når side ændres (via knapper), hent ny side for den AKTIVE query
  useEffect(() => {
    fetchPage({ pageArg: page, query: activeQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /** Gem ændring (optimistic + debounce + kø) */
  const saveChange = (id, field, value) => {
    // DEFENSIVT: hvis der mangler id, så lad være og refetch
    if (id == null) {
      alert("Denne række mangler ID – opdaterer visningen.");
      fetchPage({ pageArg: page, query: activeQuery });
      return;
    }

    const prevRow = parts.find((p) => p.id === id);
    const old = prevRow ? prevRow[field] : undefined;

    // Optimistisk UI kun for den ene række (kræv id match)
    setParts((prev) =>
      prev.map((p) => (p.id != null && p.id === id ? { ...p, [field]: value } : p))
    );
    setHistory((prev) => [{ id, field, old, newVal: value }, ...prev.slice(0, 9)]);

    // Debounce-nøgle per række+felt
    const debKey = `${id}:${field}`;

    debounceRow(
      debKey,
      () =>
        enqueue(async () => {
          try {
            // brug seneste updatedAt for netop denne række
            const current = (parts.find((p) => p.id === id) || {});
            await apiUpdate(id, { [field]: value }, current.updatedAt);
            await fetchPage({ pageArg: page, query: activeQuery });
          } catch (e) {
            if (e.status === 409) {
              await fetchPage({ pageArg: page, query: activeQuery });
              alert("Rækken blev ændret et andet sted. Se opdaterede værdier og prøv igen.");
            } else {
              // rulle visuelt tilbage i nuværende side
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
    <>
      <div className="mb-8 p1-2">
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#2166AC",
            color: "white",
            padding: "0.6rem 1rem",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          <FaHome style={{ marginRight: "6px" }} /> Dashboard
        </button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6 px-2">
          <div className="flex gap-3">
            <button onClick={undoLast} className="bg-green-600 text-white p-2 rounded" title="Fortryd sidste ændring">
              <FaUndo />
            </button>
            <button onClick={() => alert(JSON.stringify(history, null, 2))} className="bg-green-600 text-white p-2 rounded" title="Vis historik (debug)">
              <FaHistory />
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              className="border p-2 rounded"
              placeholder="Søg… (server, debounce)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              title="Server-side søgning (hele arket)"
            />
            {loading && (
              <span className="text-xs text-gray-600" aria-live="polite">
                Indlæser…
              </span>
            )}
          </div>

          <div>
            <button
              onClick={() => setEditingIndex(editingIndex === -1 ? null : -1)}
              className="bg-green-600 text-white p-2 rounded"
              title="Tilføj ny række"
            >
              <FaPlus />
            </button>
          </div>
        </div>

        <div className="mb-2 text-sm">
          {problem ? (
            <span className="text-red-600">{problem}</span>
          ) : (
            <>
              <span>Viser {parts.length} af {total} match</span>
              <span> · Side {page} / {totalPages}</span>
              {activeQuery && <span> · Søg: “{activeQuery}”</span>}
            </>
          )}
        </div>

        {editingIndex === -1 && (
          <div className="grid grid-cols-7 gap-2 mb-6">
            {FIELDS.map((field) => (
              <input
                key={`new-${field}`}
                placeholder={field}
                value={newPart[field]}
                onChange={(e) => setNewPart((prev) => ({ ...prev, [field]: e.target.value }))}
                className="border p-2 rounded"
              />
            ))}
            <button onClick={addPart} className="col-span-1 bg-blue-600 text-white p-2 rounded">
              Tilføj
            </button>
          </div>
        )}

        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left" style={{ width: "40%" }}>Model</th>
              <th className="p-2 text-left" style={{ width: "5%" }}>Pris</th>
              <th className="p-2 text-left" style={{ width: "5%" }}>Lager</th>
              <th className="p-2 text-left" style={{ width: "10%" }}>Lokation</th>
              <th className="p-2 text-left" style={{ width: "10%" }}>Kategori</th>
              <th className="p-2 text-left" style={{ width: "10%" }}>Kostpris</th>
              <th className="p-2 text-left" style={{ width: "15%" }}>Reparation</th>
              <th className="p-2 text-left" style={{ width: "5%" }}></th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, idx) => {
              const keyBase = part.id ?? `row-${idx}`; // fallback hvis id mangler
              return (
                <tr key={keyBase} className="border-t">
                  {FIELDS.map((field) => (
                    <td key={`${keyBase}-${field}`} className="p-1">
                      <input
                        className="border p-1 w-full"
                        value={part[field] ?? ""}
                        onChange={(e) => saveChange(part.id, field, e.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      onClick={() => part.id != null && deletePart(part.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded"
                      title="Slet række"
                      disabled={part.id == null}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination controls */}
        <div className="flex items-center gap-2 mt-3">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            ← Forrige
          </button>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Næste →
          </button>
        </div>
      </div>
    </>
  );
}