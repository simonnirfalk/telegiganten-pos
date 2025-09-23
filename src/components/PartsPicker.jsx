// src/components/PartsPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../data/apiClient";

/**
 * PartsPicker – henter fra WP/SQL og viser en fast 4-kolonne tabel:
 * [ Model | Lager | Lokation | Vælg ]
 * Layout tvinges med inline styles (gridTemplateColumns), så det altid holder.
 */
export default function PartsPicker({
  deviceName,
  repair,
  repairType,
  onPick,
  pageSize = 50,
  compact = false,
}) {
  const effectiveRepair = (repair ?? repairType ?? "").trim();
  const valid = Boolean((deviceName || "").trim() && effectiveRepair);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState("");

  // compact-mode
  const effectiveInStock = compact ? true : inStockOnly;
  const effectivePage = compact ? 1 : page;
  const effectiveLimit = compact ? 100 : pageSize;

  // cache
  const cacheRef = useRef(new Map());
  const cacheKey = useMemo(() => {
    const d = (deviceName || "").trim();
    const r = effectiveRepair;
    return `${d}||${r}||${effectiveInStock ? "1" : "0"}||${effectivePage}||${effectiveLimit}`;
  }, [deviceName, effectiveRepair, effectiveInStock, effectivePage, effectiveLimit]);

  const abortRef = useRef(null);
  const reqIdRef = useRef(0);

  async function fetchParts() {
    if (!valid) {
      setItems([]); setTotal(0); setProblem(""); return;
    }
    if (cacheRef.current.has(cacheKey)) {
      const c = cacheRef.current.get(cacheKey);
      setItems(c.items); setTotal(c.total); setProblem("");
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const my = ++reqIdRef.current;

    setLoading(true); setProblem("");

    try {
      const search = `${(deviceName || "").trim()} ${effectiveRepair}`.trim();
      const offset = (effectivePage - 1) * effectiveLimit;

      const res = await api.getSpareParts({
        search,
        offset,
        limit: effectiveLimit,
        signal: controller.signal,
      });

      if (my !== reqIdRef.current) return;

      let parts = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      parts = parts.map((p) => ({
        id: p.id,
        model: p.model,
        stock: Number(p.stock ?? 0),
        location: p.location || "",
        category: p.category || "",
        repair: p.repair || "",
      }));

      if (effectiveInStock) parts = parts.filter((p) => (Number(p.stock || 0) || 0) > 0);

      const effectiveTotal = effectiveInStock
        ? parts.length
        : (typeof res?.total === "number" ? res.total : parts.length);

      setItems(parts);
      setTotal(effectiveTotal);
      cacheRef.current.set(cacheKey, { items: parts, total: effectiveTotal });
    } catch (e) {
      if (e.name === "AbortError") return;
      setProblem(e?.message || "Kunne ikke hente reservedele");
    } finally {
      if (my === reqIdRef.current) setLoading(false);
    }
  }

  useEffect(() => { if (!compact) setPage(1); }, [deviceName, effectiveRepair, effectiveInStock, compact]);
  useEffect(() => { fetchParts(); /* eslint-disable-next-line */ }, [deviceName, effectiveRepair, effectiveInStock, effectivePage, effectiveLimit]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / (compact ? (items.length || 1) : pageSize)));

  // ====== Inline styles (tvinger 4 kolonner) ======
  const headerRow = {
    display: "grid",
    gridTemplateColumns: "1fr 80px 140px 90px",
    alignItems: "center",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 600,
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
  };
  const row = {
    display: "grid",
    gridTemplateColumns: "1fr 80px 140px 90px",
    alignItems: "center",
    padding: "8px 12px",
    fontSize: "13px",
    borderTop: "1px solid #eef2f7",
  };
  const tableWrap = {
    maxHeight: 360,
    overflow: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
  };
  const btn = {
    padding: "6px 10px",
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    fontSize: 12,
    cursor: "pointer",
  };

  if (!valid) {
    return <div className="p-3 text-sm text-gray-600">Vælg enhed og reparation for at se relevante reservedele.</div>;
  }

  return (
    <div className="border rounded-lg p-3 bg-white">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-sm">
            <span className="font-medium">{effectiveRepair}</span> · {deviceName}
            {loading && <span className="ml-2 text-gray-500">Indlæser…</span>}
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            Kun vis på lager
          </label>
        </div>
      )}

      {problem && <div className="text-red-600 text-sm mb-2">{problem}</div>}

      <div style={tableWrap}>
        {/* Header */}
        <div style={headerRow}>
          <div style={{ paddingRight: 8 }}>Model</div>
          <div style={{ textAlign: "center" }}>Lager</div>
          <div>Lokation</div>
          <div />
        </div>

        {/* Rows */}
        {items.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-600">Ingen resultater.</div>
        ) : (
          items.map((it) => (
            <div key={it.id} style={row}>
              <div style={{ paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.model}>
                {it.model}
              </div>
              <div style={{ textAlign: "center" }}>{Number(it.stock ?? 0)}</div>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.location || ""}>
                {it.location || "—"}
              </div>
              <div style={{ textAlign: "right" }}>
                <button type="button" onClick={() => onPick?.(it)} style={btn}>
                  Vælg
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination (skjult i compact) */}
      {!compact && items.length > 0 && (
        <div className="flex items-center justify-between mt-2 text-sm">
          <div>Side {page} / {totalPages}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded"
              disabled={page <= 1}
            >
              Forrige
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 border rounded"
              disabled={page >= totalPages}
            >
              Næste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
