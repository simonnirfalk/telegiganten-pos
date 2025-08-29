// src/components/PartAttachControls.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../data/apiClient";

export default function PartAttachControls({
  mode = "default",               // "default" | "lean"
  deviceName = "",
  repairTitle = "",
  defaultRepairType = "",
  value = null,                   // { id, model, stock, location, ... }
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState(() => {
    const base = [deviceName, repairTitle || defaultRepairType].filter(Boolean).join(" ");
    return base || "";
  });

  const inputRef = useRef(null);

  // Tillad ekstern "genåbn" (bruges fra RepairHistory)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("tg-open-part-chooser", handler);
    return () => window.removeEventListener("tg-open-part-chooser", handler);
  }, []);

  // Loader – bruger KORREKT klientmetode + paramnavn
  const load = async () => {
    setLoading(true);
    try {
      // apiClient eksponerer getSpareParts({ search })
      const list = await api.getSpareParts({ search: q });
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Fejl ved søgning efter reservedel:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Når dialogen åbnes, hent forslag og fokusér søgefeltet
  useEffect(() => {
    if (!open) return;
    load();
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const triggerLabel = value?.id ? "Skift reservedel" : "Vælg reservedel";

  return (
    <div>
      {/* Lille trigger-knap */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "#fff",
          color: "#1a1a1a",
          border: "1px solid #d1d5db",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12,
          cursor: "pointer"
        }}
      >
        {triggerLabel}
      </button>

      {/* Vælger-modal */}
      {open && (
        <div style={overlay} onClick={() => setOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Vælg reservedel</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18 }}
                title="Luk"
              >
                ×
              </button>
            </div>

            {/* Søgning */}
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") load(); }}
                placeholder="Søg reservedel…"
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 14
                }}
              />
              <button
                type="button"
                onClick={load}
                style={{
                  backgroundColor: "#2166AC",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 14
                }}
              >
                Søg
              </button>
            </div>

            {/* Resultater */}
            <div style={{ marginTop: 12 }}>
              {loading ? (
                <div style={{ fontSize: 14, opacity: 0.8 }}>Indlæser…</div>
              ) : items.length === 0 ? (
                <div style={{ fontSize: 14, opacity: 0.8 }}>Ingen resultater.</div>
              ) : (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  {/* Minimal header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 120px 90px",
                      gap: 8,
                      padding: "8px 10px",
                      fontWeight: 600,
                      background: "#f8fafc",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: 13
                    }}
                  >
                    <div>Model</div>
                    <div>Lager</div>
                    <div>Lokation</div>
                    <div></div>
                  </div>

                  {/* Rows */}
                  <div>
                    {items.map((it) => {
                      const id = it.id ?? it.ID ?? it.rowIndex;
                      return (
                        <div
                          key={id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 80px 120px 90px",
                            gap: 8,
                            alignItems: "center",
                            padding: "8px 10px",
                            borderTop: "1px solid #f1f5f9",
                            fontSize: 13
                          }}
                        >
                          <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {it.model || it.title || "—"}
                          </div>
                          <div>{typeof it.stock !== "undefined" ? it.stock : "—"}</div>
                          <div>{it.location || "—"}</div>
                          <div style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const chosen = {
                                  id,
                                  model: it.model ?? it.title ?? "",
                                  stock: it.stock,
                                  location: it.location,
                                  category: it.category,
                                  repair: it.repair,
                                };
                                onChange?.(chosen);
                                setOpen(false);
                              }}
                              style={{
                                background: "#fff",
                                color: "#1a1a1a",
                                border: "1px solid #d1d5db",
                                padding: "6px 10px",
                                borderRadius: 6,
                                fontSize: 12,
                                cursor: "pointer"
                              }}
                            >
                              Vælg
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #d1d5db",
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Overlay/modal styles */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1100,
  padding: 12
};
const modal = {
  width: "min(720px, 96vw)",
  background: "#fff",
  borderRadius: 12,
  padding: 14,
  boxShadow: "0 12px 30px rgba(0,0,0,.2)",
  maxHeight: "85vh",
  overflow: "auto"
};
