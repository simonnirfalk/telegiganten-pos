// src/components/RepairHistory.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { api } from "../data/apiClient";

/* ---------------- Badge for reservedel ---------------- */
function PartBadge({ meta, part }) {
  const p = meta || part;
  if (!p) return null;
  const id = p.id ?? p.ID ?? p.spare_part_id ?? null;
  const model = p.model ?? p.spare_part_model ?? "";
  const location = p.location ?? p.spare_part_location ?? "";
  const stock = p.stock ?? p.spare_part_stock ?? "";
  const category = p.category ?? p.spare_part_category ?? "";
  const repair = p.repair ?? p.spare_part_repair ?? "";

  const chip = (text) => (
    <span
      style={{
        display: "inline-block",
        padding: "2px 6px",
        borderRadius: 6,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
        fontSize: 12,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      {text}
    </span>
  );

  return (
    <div style={{ marginTop: 6 }}>
      {model && chip(model)}
      {location && chip(location)}
      {(stock ?? "") !== "" && chip(`Lager: ${stock}`)}
      {category && chip(category)}
      {repair && chip(repair)}
      {id && (
        <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>
          (del-ID: {id})
        </span>
      )}
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function formatDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("da-DK"); } catch { return iso; }
}
const PAYMENT_OPTIONS = [
  { value: "efter", label: "Betaling efter reparation" },
  { value: "betalt", label: "Allerede betalt" },
  { value: "depositum", label: "Delvis betalt (depositum)" },
  { value: "garanti", label: "Garanti (ingen betaling)" },
];
const STATUS_OPTIONS = ["under reparation", "klar til afhentning", "afsluttet", "annulleret"]
  .map((s) => ({ value: s, label: s }));

function inferPaymentType(paymentText = "") {
  const t = (paymentText || "").toLowerCase();
  if (t.includes("garanti")) return "garanti";
  if (t.includes("depositum") || t.includes("delvis")) return "depositum";
  if (t.includes("allerede betalt") || t.includes("betalt:")) return "betalt";
  return "efter";
}

const sum = (arr, key) => (arr || []).reduce((acc, it) => acc + (Number(it?.[key]) || 0), 0);

function safeParseJSON(s) {
  if (typeof s !== "string") return null;
  try { return JSON.parse(s); } catch { return null; }
}

/**
 * Forsøg at finde ordrelinjer i *alle* kendte former:
 * - repair.meta som objekt med {lines} / {lines_json}
 * - repair.meta som JSON-string
 * - felter på roden: lines / lines_json / meta_lines_json
 * - andre JSON-strenge på roden der indeholder et array med {repair, price, time}
 */
function extractLinesFromAny(repair) {
  const candidates = [];

  // 1) Direkte objekt
  if (repair?.meta && typeof repair.meta === "object") candidates.push(repair.meta);
  // 2) meta som JSON-string
  const metaParsed = safeParseJSON(repair?.meta);
  if (metaParsed) candidates.push(metaParsed);
  // 3) andre mulige felter som JSON-string
  ["lines_json", "meta_json", "meta_lines_json"].forEach((k) => {
    const parsed = safeParseJSON(repair?.[k]);
    if (parsed) candidates.push({ [k]: parsed });
  });
  // 4) rodfelter allerede som array
  if (Array.isArray(repair?.lines)) candidates.push({ lines: repair.lines });

  // 5) sidste chance: gennemgå alle stringfelter på roden og parse JSON
  for (const [k, v] of Object.entries(repair || {})) {
    if (typeof v === "string" && /lines/i.test(k)) {
      const parsed = safeParseJSON(v);
      if (parsed) candidates.push({ [k]: parsed });
    }
  }

  for (const c of candidates) {
    // direkte array
    if (Array.isArray(c.lines) && c.lines.length) return { lines: c.lines, fromMeta: true };
    // linjer via lines_json
    if (Array.isArray(c.lines_json) && c.lines_json.length) return { lines: c.lines_json, fromMeta: true };
    // hvis "meta" wrapper
    if (c.meta && typeof c.meta === "object") {
      if (Array.isArray(c.meta.lines) && c.meta.lines.length) return { lines: c.meta.lines, fromMeta: true };
      const p = safeParseJSON(c.meta.lines_json);
      if (Array.isArray(p) && p.length) return { lines: p, fromMeta: true };
    }
    // generisk: find *første* array med objekter der ligner linjer
    for (const val of Object.values(c)) {
      if (Array.isArray(val) && val.length && typeof val[0] === "object" && ("repair" in val[0] || "price" in val[0] || "time" in val[0])) {
        return { lines: val, fromMeta: true };
      }
    }
  }

  // Fallback (legacy: topfelter)
  return {
    lines: [{
      device: repair?.model || repair?.device || "",
      repair: repair?.repair || repair?.repair_title || "",
      price: Number(repair?.price || 0),
      time: Number(repair?.time || 0),
      model_id: repair?.model_id || 0,
      part: undefined,
    }],
    fromMeta: false,
  };
}

function buildPrintOrderFromRepair(r = {}) {
  const { lines } = extractLinesFromAny(r);
  const totalFromLines = sum(lines, "price");
  const total = Number.isFinite(Number(r.payment_total))
    ? Number(r.payment_total)
    : (totalFromLines || Number(r.price || 0));
  const upfront = Number.isFinite(Number(r.deposit_amount)) ? Number(r.deposit_amount) : 0;

  return {
    id: r.order_id || r.id || 0,
    today: new Date().toLocaleDateString("da-DK"),
    created_at: r.created_at || new Date().toISOString(),
    customer: {
      id: r.customer_id || 0,
      name: r.customer || "",
      phone: r.phone || "",
      email: r.contact?.includes("@") ? r.contact : "",
    },
    repairs: lines.map((ln) => ({
      device: ln.device || r.model || r.device || "",
      repair: ln.repair || "",
      price: Number(ln.price || 0),
      time: Number(ln.time || 0),
      part: ln.part || ln.meta || null,
    })),
    password: r.password || "",
    note: r.note || "",
    contact: r.contact || "",
    total,
    payment: { method: (r.payment_type || "efter").toLowerCase(), upfront },
  };
}

/* ---------------- Component ---------------- */
export default function RepairHistory({ repair, onClose, onSave }) {
  const navigate = useNavigate();
  const overlayRef = useRef(null);

  // Hvis første payload ikke har itemized linjer, prøv at hente fuld reparation fra API’et
  const [enriched, setEnriched] = useState(repair);
  useEffect(() => { setEnriched(repair); }, [repair]);

  const initial = useMemo(() => extractLinesFromAny(repair), [repair]);
  useEffect(() => {
    let alive = true;
    async function fetchFull() {
      if (initial.fromMeta) return; // vi har allerede linjerne
      if (!repair?.id) return;

      try {
        let full = null;
        if (api.getRepairDetails && typeof api.getRepairDetails === "function") {
          full = await api.getRepairDetails(repair.id);
        } else if (api.getRepair && typeof api.getRepair === "function") {
          full = await api.getRepair(repair.id);
        } else if (api.fetchRepair && typeof api.fetchRepair === "function") {
          full = await api.fetchRepair(repair.id);
        } else if (api.repairById && typeof api.repairById === "function") {
          full = await api.repairById(repair.id);
        }
        if (!alive || !full) return;
        // forvent at full har samme form som repair (med evt. meta)
        const merged = { ...repair, ...full };
        const got = extractLinesFromAny(merged);
        if (got.fromMeta) setEnriched(merged);
      } catch {
        // roligt fallback – vi fortsætter bare med den nuværende visning
      }
    }
    fetchFull();
    return () => { alive = false; };
  }, [repair, initial.fromMeta]);

  // Brug enriched når vi udleder linjer
  const { lines, fromMeta } = useMemo(() => extractLinesFromAny(enriched), [enriched]);
  const totalFromLines = useMemo(() => sum(lines, "price"), [lines]);
  const timeFromLines = useMemo(() => sum(lines, "time"), [lines]);

  // Form state
  const [edited, setEdited] = useState(() => ({
    ...repair,
    payment_type: repair.payment_type || inferPaymentType(repair.payment),
    deposit_amount: repair.deposit_amount ?? null,
    remaining_amount: repair.remaining_amount ?? null,
    payment_total: repair.payment_total ?? (totalFromLines || null),
  }));
  useEffect(() => {
    setEdited((e) => ({
      ...e,
      payment_total: e.payment_total ?? (totalFromLines || null),
    }));
  }, [totalFromLines]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Historik (nyeste først)
  const [history, setHistory] = useState(Array.isArray(repair.history) ? [...repair.history] : []);
  useEffect(() => {
    const h = Array.isArray(repair.history) ? [...repair.history] : [];
    h.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    setHistory(h);
  }, [repair.history]);

  // Luk på Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleOverlayClick(e) { if (e.target === overlayRef.current) onClose?.(); }
  function handleChange(field, value) { setEdited((prev) => ({ ...prev, [field]: value })); }

  // Hvilke felter må gemmes?
  const changedFields = useMemo(() => {
    const orig = repair || {};
    const out = {};

    // Når linjer kommer fra meta (vores nye model), skal topfelterne ikke gemmes.
    const BASE_FIELDS = [
      "customer","phone","contact",
      "password","note",
      "status","payment","payment_type",
      "deposit_amount","remaining_amount","payment_total",
    ];
    const SINGLE_ONLY_FIELDS = ["model","repair","price","time"];
    const compareFields = fromMeta ? BASE_FIELDS : [...BASE_FIELDS, ...SINGLE_ONLY_FIELDS];

    for (const key of compareFields) {
      if (edited[key] !== orig[key]) out[key] = edited[key];
    }
    for (const k of ["price","time","deposit_amount","remaining_amount","payment_total"]) {
      if (out[k] !== undefined && out[k] !== "") {
        const n = Number(out[k]); if (!Number.isNaN(n)) out[k] = n;
      }
    }
    return out;
  }, [edited, repair, fromMeta]);

  // Depositum preview
  const depositComputed = useMemo(() => {
    if ((edited.payment_type || "efter") !== "depositum") return null;
    const baseTotal = Number.isFinite(Number(edited.payment_total))
      ? Number(edited.payment_total)
      : (totalFromLines || Number(edited.price || repair.price || 0));
    const deposit = Number(edited.deposit_amount ?? repair.deposit_amount ?? 0);
    const remaining =
      Number.isFinite(Number(edited.remaining_amount ?? repair.remaining_amount))
        ? Number(edited.remaining_amount ?? repair.remaining_amount)
        : Math.max(baseTotal - (Number.isFinite(deposit) ? deposit : 0), 0);
    return { total: baseTotal, deposit: Number.isFinite(deposit) ? deposit : 0, remaining };
  }, [edited, repair, totalFromLines]);

  // Print slip (brug alle linjer)
  const handlePrintSlip = () => {
    const merged = { ...enriched, ...edited, meta: enriched.meta };
    const order = buildPrintOrderFromRepair(merged);
    try { localStorage.setItem("tg_last_order", JSON.stringify(order)); } catch {}
    navigate(`/print-slip/${order.id || ""}`, { state: { order } });
  };

  /* ---------- SMS ---------- */
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const defaultSmsText = useMemo(() => {
    const name = repair.customer || "kunde";
    const id = repair.order_id || repair.id || "";
    const info = "Telegiganten – Taastrup hovedgade 66, 2630 Taastrup. Tlf. 70 70 78 56. Åbningstider: Man–Fre 10–18, Lør 10–14.";
    return `Kære ${name}. Din reparation #${id} er klar til afhentning. ${info}`;
  }, [repair.customer, repair.order_id, repair.id]);
  const [smsText, setSmsText] = useState(defaultSmsText);
  const [smsTo, setSmsTo] = useState(repair.phone || "");
  useEffect(() => { setSmsText(defaultSmsText); setSmsTo(repair.phone || ""); }, [defaultSmsText, repair.phone]);

  async function handleSendSMS() {
    if (!smsTo || !smsText.trim()) return;
    setSmsSending(true);
    try {
      await api.sendSMS({ to: smsTo, body: smsText, repair_id: Number(repair.id) || undefined });
      setHistory((h) => [
        { timestamp: new Date().toISOString(), field: "sms_sent", old: "", new: `Til ${smsTo}: ${smsText.slice(0,160)}` },
        ...(Array.isArray(h) ? h : []),
      ]);
      setSmsOpen(false);
      alert("SMS sendt ✅");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Kunne ikke sende SMS.");
    } finally {
      setSmsSending(false);
    }
  }

  /* ---------- Gem ---------- */
  const handleSave = async () => {
    if (!Object.keys(changedFields).length) { onClose?.(); return; }
    setSaving(true);
    setError("");
    try {
      await Promise.resolve(onSave?.({ repair_id: Number(repair.id), fields: changedFields }));
      onClose?.();
    } catch (err) {
      console.error("Fejl fra onSave:", err);
      setError("Kunne ikke gemme ændringer. Prøv igen.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={styles.overlay}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0 }}>
              Redigér reparation – Ordre-ID #{repair.order_id}
              {repair.id ? <span style={{ fontSize: "0.8rem", color: "#666" }}> (post #{repair.id})</span> : null}
            </h2>
            <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
              Oprettet: {formatDateTime(repair.created_at)}
            </div>
          </div>
          <button onClick={onClose} style={styles.close} title="Luk"><FaTimes /></button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.body}>
          {/* Kunde */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}><strong>Kunde:</strong></label>
            {repair.customer_id ? (
              <Link to={`/customers/${repair.customer_id}`} style={styles.linkBox} title="Åbn kundens side">
                {repair.customer || "—"}
              </Link>
            ) : (
              <div style={styles.readonlyBox}>{repair.customer || "—"}</div>
            )}
          </div>

          {/* Telefon */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}><strong>Telefon:</strong></label>
            <input type="text" value={edited.phone ?? ""} onChange={(e) => handleChange("phone", e.target.value)} style={styles.input} />
          </div>

          {/* Itemized linjer (hvis vi har dem) ellers topfelter (legacy) */}
          {fromMeta ? (
            <div style={styles.inputGroup}>
              <label style={{ marginBottom: 6 }}><strong>Reparationslinjer</strong></label>
              <div style={{ display: "grid", gap: 10 }}>
                {lines.map((ln, idx) => (
                  <div key={idx} style={styles.lineCard}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{ln.device || "—"}</div>
                      <div style={{ color: "#374151" }}>{ln.repair || "—"}</div>
                      {(ln.part || ln.meta) && <div style={{ marginTop: 6 }}><PartBadge meta={ln.part || ln.meta} /></div>}
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={styles.priceChip}>{Number(ln.price || 0).toLocaleString("da-DK")} kr</div>
                      <div style={styles.timeChip}>{Number(ln.time || 0)} min</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontWeight: 700 }}>
                  <span>Samlet</span>
                  <span>
                    {(Number(edited.payment_total ?? 0) || totalFromLines || 0).toLocaleString("da-DK")} kr
                    {timeFromLines ? ` • ${timeFromLines} min` : ""}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={styles.inputGroup}>
                <label style={{ marginBottom: 6 }}><strong>Model:</strong></label>
                <input type="text" value={edited.model ?? ""} onChange={(e) => handleChange("model", e.target.value)} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={{ marginBottom: 6 }}><strong>Reparation:</strong></label>
                <input type="text" value={edited.repair ?? ""} onChange={(e) => handleChange("repair", e.target.value)} style={styles.input} />
              </div>
              <div style={styles.row2}>
                <div style={styles.inputGroup}>
                  <label style={{ marginBottom: 6 }}><strong>Pris (kr):</strong></label>
                  <input type="number" value={edited.price ?? ""} onChange={(e) => handleChange("price", e.target.value)} style={styles.input} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={{ marginBottom: 6 }}><strong>Tid (min):</strong></label>
                  <input type="number" value={edited.time ?? ""} onChange={(e) => handleChange("time", e.target.value)} style={styles.input} />
                </div>
              </div>
            </>
          )}

          {/* Betaling */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}><strong>Betaling:</strong></label>
            <select value={edited.payment_type || "efter"} onChange={(e) => handleChange("payment_type", e.target.value)} style={styles.input}>
              {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {edited.payment || ""}
            </div>
          </div>

          {/* Depositum felter */}
          {edited.payment_type === "depositum" && (
            <div style={styles.row2}>
              <div style={styles.inputGroup}>
                <label style={{ marginBottom: 6 }}><strong>Total (kr):</strong></label>
                <input type="number" value={edited.payment_total ?? (totalFromLines || "")} onChange={(e) => handleChange("payment_total", e.target.value)} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={{ marginBottom: 6 }}><strong>Depositum (kr):</strong></label>
                <input type="number" value={edited.deposit_amount ?? ""} onChange={(e) => handleChange("deposit_amount", e.target.value)} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={{ marginBottom: 6 }}><strong>Mangler (kr):</strong></label>
                <input
                  type="number"
                  value={
                    edited.payment_type === "depositum"
                      ? Math.max(
                          Number(edited.payment_total ?? totalFromLines ?? 0) - Number(edited.deposit_amount ?? 0),
                          0
                        )
                      : (edited.remaining_amount ?? "")
                  }
                  onChange={(e) => handleChange("remaining_amount", e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          {/* Status */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}><strong>Status:</strong></label>
            <select value={edited.status || "under reparation"} onChange={(e) => handleChange("status", e.target.value)} style={styles.input}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Kode, kontakt, note */}
          <div style={styles.row2}>
            <div style={styles.inputGroup}>
              <label style={{ marginBottom: 6 }}><strong>Adgangskode:</strong></label>
              <input type="text" value={edited.password ?? ""} onChange={(e) => handleChange("password", e.target.value)} style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
              <label style={{ marginBottom: 6 }}><strong>Kontakt (alternativ):</strong></label>
              <input type="text" value={edited.contact ?? ""} onChange={(e) => handleChange("contact", e.target.value)} style={styles.input} />
            </div>
          </div>
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}><strong>Note:</strong></label>
            <textarea rows={3} value={edited.note ?? ""} onChange={(e) => handleChange("note", e.target.value)} style={{ ...styles.input, resize: "vertical" }} />
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button onClick={onClose} disabled={saving} style={styles.cancel}>Annullér</button>
            <button type="button" onClick={() => setSmsOpen((v) => !v)} style={styles.sms} disabled={saving} title="Send SMS til kunden">Send SMS</button>
            <button type="button" onClick={handlePrintSlip} style={styles.print} disabled={saving} title="Print reparations-slip">Print slip</button>
            <button onClick={handleSave} style={styles.save} disabled={saving || !Object.keys(changedFields).length} title={!Object.keys(changedFields).length ? "Ingen ændringer" : "Gem"}>
              {saving ? "Gemmer…" : "Gem ændringer"}
            </button>
          </div>

          {/* SMS-panel */}
          {smsOpen && (
            <div style={styles.smsPanel}>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6 }}><strong>Modtager (telefon):</strong></label>
                  <input type="text" value={smsTo} onChange={(e) => setSmsTo(e.target.value)} style={styles.input} placeholder="+45XXXXXXXX" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6 }}><strong>Besked:</strong></label>
                  <textarea value={smsText} onChange={(e) => setSmsText(e.target.value)} rows={4} style={{ ...styles.input, resize: "vertical" }} />
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{smsText.length} tegn</div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setSmsOpen(false)} style={styles.cancel}>Luk</button>
                  <button onClick={handleSendSMS} disabled={smsSending || !smsTo || !smsText.trim()} style={styles.save}>
                    {smsSending ? "Sender…" : "Send SMS"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Historik */}
          {!!history?.length && (
            <div style={{ marginTop: "1.2rem" }}>
              <h3 style={{ margin: "0 0 0.6rem" }}>Historik</h3>
              <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
                {history.map((entry, idx) => (
                  <li key={idx} style={{ marginBottom: "0.4rem" }}>
                    <small>
                      {formatDateTime(entry.timestamp)} – <strong>{entry.field}</strong>: "
                      {entry.old ?? ""}" → "{entry.new ?? ""}"
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Styles ---------------- */
const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000 },
  modal: { background: "#fff", width: "min(980px, 96vw)", maxHeight: "92vh", borderRadius: 12, overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", padding: 16 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  close: { border: "none", background: "transparent", fontSize: 18, cursor: "pointer", width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 8 },
  body: { display: "grid", gap: 12 },
  inputGroup: { display: "grid", gap: 6 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, outline: "none" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  footer: { marginTop: 6, display: "flex", gap: 8, justifyContent: "flex-end" },
  cancel: { background: "#f3f4f6", color: "#111", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer" },
  save: { background: "#2166AC", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer" },
  print: { background: "#10b981", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer" },
  sms: { background: "#f59e0b", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer" },
  errorBox: { background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, marginBottom: 8 },
  linkBox: { display: "inline-block", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, textDecoration: "none", color: "#111" },
  readonlyBox: { padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fafafa" },

  // Itemized kort
  lineCard: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 },
  priceChip: { fontWeight: 800 },
  timeChip: { fontSize: 12, color: "#374151" },
};
