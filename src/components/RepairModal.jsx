// src/components/RepairModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import PartsPicker from "./PartsPicker";

// ---- RepairModal helpers: priority sorting ----
const REPAIR_PRIORITY = [
  "SKÆRM_A+",                 // Skærm (A+)
  "SKÆRM_OEM",                // Skærm (OEM)
  "SKÆRM_OTHER",              // Skærm [alle andre typer]
  "BESKYTTELSESGLAS",
  "BATTERI",
  "BUNDSTIK",
  "BAGCOVER_GLAS",
  "BAGCOVER_RAMME",
  "BAGKAMERA",
  "FRONTKAMERA",
  "HØJTTALER",                // (loudspeaker / højtaler)
  "ØREHØJTTALER",             // (earpiece / ørehøjtaler)
  "VANDSKADE",
  "TÆND_SLUK",
  "VOLUMEKNAP",
  "SOFTWARE",
  "OVERFØR_DATA",
  "DIAGNOSE",
];

function normalizeTitle(raw) {
  if (!raw) return "";
  // Fjern alt efter | (så "Skærm | iPhone 12" stadig matches)
  const clean = String(raw).split("|")[0].trim().toLowerCase();
  // Normaliser danske tegn til simple sammenligninger
  return clean
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/æ/g, "ae");
}

function classifyRepair(titleRaw) {
  const t = normalizeTitle(titleRaw);

  // --- Skærm varianter: A+ og OEM skal komme først, resten som "other"
  if (t.includes("skaerm")) {
    if (/\b(a\+|a plus)\b/.test(t)) return "SKÆRM_A+";
    if (/\boem\b/.test(t))          return "SKÆRM_OEM";
    return "SKÆRM_OTHER";
  }

  if (t.includes("beskyttelsesglas"))       return "BESKYTTELSESGLAS";
  if (t.includes("batteri"))                return "BATTERI";
  if (t.includes("bundstik"))               return "BUNDSTIK";

  // Bagcover varianter
  if (t.includes("bagcover")) {
    if (t.includes("inkl") && t.includes("ramme")) return "BAGCOVER_RAMME";
    if (t.includes("glas"))                        return "BAGCOVER_GLAS";
    // Hvis hverken glas eller inkl. ramme er nævnt, lad dem falde udenfor listen (efter)
  }

  // Kamera
  if (t.includes("bagkamera") || (t.includes("kamera") && t.includes("bag"))) return "BAGKAMERA";
  if (t.includes("frontkamera") || (t.includes("kamera") && t.includes("front"))) return "FRONTKAMERA";

  // Lyd
  if (t.includes("hoejtaler") || t.includes("hoytaler") || t.includes("hojtaler")) return "HØJTTALER";
  if (t.includes("oerehoejtaler") || t.includes("orehoejtaler") || t.includes("oerehojtaler") || t.includes("oreh")) return "ØREHØJTTALER";

  // Øvrige
  if (t.includes("vandskade"))              return "VANDSKADE";
  if (t.includes("taend") || t.includes("tænd") || t.includes("power")) return "TÆND_SLUK";
  if (t.includes("volumeknap") || (t.includes("volume") && t.includes("knap"))) return "VOLUMEKNAP";
  if (t.includes("software"))              return "SOFTWARE";
  if (t.includes("overfoer") || t.includes("overfør") || t.includes("dataoverfoer") || t.includes("dataoverfør")) return "OVERFØR_DATA";
  if (t.includes("diagnose") || t.includes("fejlfinding")) return "DIAGNOSE";

  // Ikke i prioriteret liste
  return null;
}

function getPriorityIndex(titleRaw) {
  const key = classifyRepair(titleRaw);
  if (!key) return Number.POSITIVE_INFINITY; // alt ukendt kommer efter de kendte
  const idx = REPAIR_PRIORITY.indexOf(key);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}

// Stabil comparator: først efter prioritet, derefter alfabetisk som tie-breaker
export function compareRepairsByPriority(a, b) {
  const label = (o) => (o?.title || o?.name || o?.repair || "");

  const pa = getPriorityIndex(label(a));
  const pb = getPriorityIndex(label(b));
  if (pa !== pb) return pa - pb;

  // Tie-break: alfabetisk på “visningsnavn”
  const ta = normalizeTitle(label(a));
  const tb = normalizeTitle(label(b));
  return ta.localeCompare(tb);
}

/** Udleder en "basis-type" for at matche arket's kolonne 'Reparation' */
function baseRepairType(title) {
  const KEYS = [
    "Skærm","Batteri","Bagkamera","Frontkamera","Kamera","Bundstik","Software",
    "Bagcover","Bagglas","Face-ID","Tænd/sluk","Ørehøjtaler","Højtaler","Mikrofon",
    "Sim","Simkortslæser","Beskyttelsesglas","Vandskade","Diagnose","Overfør data"
  ];
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim();
  const n = norm(title);
  for (const k of KEYS) if (n.includes(norm(k))) return k;
  const plain = String(title || "").split("(")[0].trim();
  return plain.split(/\s+/)[0] || "Reparation";
}

export default function RepairModal({ device, repairs, onAdd, onClose }) {
  if (!device) return null;

  // Luk på Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const deviceTitle = device.title || device.name || "Ukendt enhed";
  const safeRepairs = useMemo(() => (Array.isArray(repairs) ? repairs : []), [repairs]);
  const sortedRepairs = useMemo(
    () => safeRepairs.slice().sort(compareRepairsByPriority),
    [safeRepairs]
  );

  // Accordion state
  const [openKey, setOpenKey] = useState(null);

  // Valgte parts pr. repair-type
  const [selectedParts, setSelectedParts] = useState({});
  const pickPart = (repairType, part) =>
    setSelectedParts((prev) => ({ ...prev, [repairType]: part || null }));

  const toggle = (key) => setOpenKey((k) => (k === key ? null : key));

  const handleAddRepair = (r) => {
    const type = baseRepairType(r.title || r.name || r.repair || "");
    const part = selectedParts[type] || null;
    // send part som metadata – så højre ordreblok og Step2 kan vise det
    onAdd?.(deviceTitle, { ...r, part });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          padding: "1.5rem",
          borderRadius: "10px",
          width: "min(1000px, 96vw)",
          maxHeight: "86vh",
          overflowY: "auto",
          boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repair-modal-heading"
      >
        <h2 id="repair-modal-heading" style={{ marginTop: 0 }}>{deviceTitle}</h2>

        {safeRepairs.length === 0 ? (
          <p>Ingen reparationer tilgængelige for denne enhed.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sortedRepairs.map((r, i) => {
              const itemKey = r.id ?? `${deviceTitle}-${i}`;
              const title = r.title || r.name || "—";
              const type = baseRepairType(title);
              const chosen = selectedParts[type] || null;
              const open = openKey === itemKey;

              return (
                <div
                  key={itemKey}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fff",
                  }}
                >
                  {/* Header */}
                  <div
                    onClick={() => toggle(itemKey)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                       {r.time != null ? `${Number(r.time)} min` : ""}
                       {typeof r.price !== "undefined" && r.price !== null
                       ? ` • ${Number(r.price)} kr`
                       : ""}
                     </div>

                      {/* badge med valgt reservedel (hvis valgt) */}
                      {chosen && (
                        <div
                          style={{
                            display: "inline-flex",
                            gap: 8,
                            alignItems: "center",
                            paddingTop: 6,
                            flexWrap: "wrap",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span
                            title={chosen.model}
                            style={{
                              fontSize: 12,
                              background: "#f8fafc",
                              border: "1px solid #e5e7eb",
                              padding: "2px 6px",
                              borderRadius: 6,
                              maxWidth: 520,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {chosen.model}
                          </span>
                          <span style={{ fontSize: 12, background: "#eef6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: 6 }}>
                            Lager: {chosen.stock ?? "—"}
                          </span>
                          {chosen.location && (
                            <span style={{ fontSize: 12, background: "#f1f5f9", color: "#334155", padding: "2px 6px", borderRadius: 6 }}>
                              {chosen.location}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleAddRepair(r)}
                        style={{
                          padding: "0.45rem 0.75rem",
                          backgroundColor: "#2166AC",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <FaPlus /> Tilføj
                      </button>
                    </div>
                  </div>

                  {/* Body (collapsible) */}
                  {open && (
                    <div style={{ padding: "10px 14px 12px", borderTop: "1px solid #eef2f7" }}>
                      {/* PartsPicker filtrerer selv efter deviceName + repairType; ingen priser vises der */}
                      <PartsPicker
                        deviceName={deviceTitle}
                        repairType={type}
                        onPick={(part) => pickPart(type, part)}
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "right", marginTop: "1rem" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#2166AC",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}
