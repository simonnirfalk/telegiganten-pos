// src/components/PartsPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const GAS_URL = import.meta.env.VITE_GAS_URL;

async function httpGetJSON(url, params, signal) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`, { method: "GET", signal });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(text || "Ugyldigt svar"); }
  if (!res.ok || data?.error) throw new Error(data?.error || "Fejl fra server");
  return data;
}

export default function PartsPicker({
  deviceName,
  repairType,
  onPick,
  gasUrl = GAS_URL,
  pageSize = 50,
  compact = false,
}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(null);

  const abortRef = useRef(null);
  const reqIdRef = useRef(0);

  const effectiveInStock = compact ? true : inStockOnly;
  const effectivePage = compact ? 1 : page;
  const effectivePageSize = compact ? 500 : pageSize;

  const cacheRef = useRef(new Map());
  const cacheKey = useMemo(
    () =>
      `${(deviceName || "").trim()}||${(repairType || "").trim()}||${
        effectiveInStock ? "1" : "0"
      }||${effectivePage}||${effectivePageSize}`,
    [deviceName, repairType, effectiveInStock, effectivePage, effectivePageSize]
  );

  const valid = Boolean(deviceName && repairType);

  async function fetchParts() {
    if (!valid) { setItems([]); setTotal(0); setProblem(null); return; }
    if (cacheRef.current.has(cacheKey)) {
      const c = cacheRef.current.get(cacheKey);
      setItems(c.items); setTotal(c.total); setProblem(null); return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const myId = ++reqIdRef.current;

    setLoading(true);
    setProblem(null);

    try {
      const offset = (effectivePage - 1) * effectivePageSize;
      const data = await httpGetJSON(
        gasUrl,
        {
          api: "list",
          search: deviceName || "",
          repair: repairType || "",
          inStock: effectiveInStock ? "true" : "false",
          limit: String(effectivePageSize),
          offset: String(offset),
        },
        controller.signal
      );
      if (myId !== reqIdRef.current) return;

      const parts = (data?.items || []).map((p) => ({
        id: p.id,
        model: p.model,
        stock: Number(p.stock || 0),
        location: p.location || "",
        category: p.category || "",
        repair: p.repair || "",
      }));

      setItems(parts);
      setTotal(Number(data?.total || 0));
      cacheRef.current.set(cacheKey, { items: parts, total: Number(data?.total || 0) });
    } catch (e) {
      if (e.name === "AbortError") return;
      setProblem(e.message || "Kunne ikke hente reservedele");
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }

  useEffect(() => { if (!compact) setPage(1); }, [deviceName, repairType, inStockOnly, compact]);
  useEffect(() => { fetchParts(); /* eslint-disable-next-line */ }, [
    deviceName, repairType, effectiveInStock, effectivePage, effectivePageSize
  ]);

  const totalPages = Math.max(1, Math.ceil(total / (compact ? (items.length || 1) : pageSize)));

  if (!valid) {
    return <div className="p-3 text-sm text-gray-600">Vælg enhed og reparation for at se relevante reservedele.</div>;
  }

  return (
    <div className="border rounded-lg p-3 bg-white">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-sm">
            <span className="font-medium">{repairType}</span> · {deviceName}
            {loading && <span className="ml-2 text-gray-500">Indlæser…</span>}
          </div>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
            Kun vis på lager
          </label>
        </div>
      )}

      {problem && <div className="text-red-600 text-sm mb-2">{problem}</div>}

      {/* Mindre tekststørrelse + tydelig centrering i Lager/Lokation */}
      <div className="max-h-72 overflow-auto border rounded">
        <table className="w-full" style={{ fontSize: "13px" }}>
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-2" style={{ width: "55%", textAlign: "left" }}>Model</th>
              <th className="p-2" style={{ width: "15%", textAlign: "center" }}>Lager</th>
              <th className="p-2" style={{ width: "20%", textAlign: "center" }}>Lokation</th>
              <th className="p-2" style={{ width: "10%" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan={4} className="p-3 text-center text-gray-500">Ingen match.</td></tr>
            )}
            {items.map((part) => (
              <tr key={part.id} className="border-t">
                <td className="p-2" style={{ textAlign: "left" }}>{part.model}</td>
                <td className="p-2" style={{ textAlign: "center" }}>
                  <StockBadge qty={part.stock} />
                </td>
                <td className="p-2" style={{ textAlign: "center" }}>
                  {part.location || "—"}
                </td>
                <td className="p-2" style={{ textAlign: "right" }}>
                  <button
                    className="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                    onClick={() => onPick && onPick(part)}
                    disabled={!part.id}
                    style={{ fontSize: "12px" }}
                  >
                    Vælg
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!compact && (
        <div className="flex items-center justify-between mt-3 text-sm" style={{ fontSize: "13px" }}>
          <span>
            Viser {items.length} af {total} · Side {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              ← Forrige
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Næste →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StockBadge({ qty }) {
  const n = Number(qty || 0);
  let cls = "bg-red-100 text-red-800";
  if (n > 5) cls = "bg-green-100 text-green-800";
  else if (n > 0) cls = "bg-yellow-100 text-yellow-800";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded ${cls}`}
      style={{ fontSize: "11px", lineHeight: 1.1 }}
    >
      {isNaN(n) ? "-" : n}
    </span>
  );
}
