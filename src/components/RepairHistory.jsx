// src/components/RepairHistory.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  try {
    return new Date(iso).toLocaleString("da-DK");
  } catch {
    return iso;
  }
}

const PAYMENT_OPTIONS = [
  { value: "efter", label: "Betaling efter reparation" },
  { value: "betalt", label: "Allerede betalt" },
  { value: "depositum", label: "Delvis betalt (depositum)" },
  { value: "garanti", label: "Garanti (ingen betaling)" },
];

const STATUS_OPTIONS = ["under reparation", "klar til afhentning", "afsluttet", "annulleret"].map(
  (s) => ({ value: s, label: s })
);

const sum = (arr, key) => (arr || []).reduce((acc, it) => acc + (Number(it?.[key]) || 0), 0);
const safeParseJSON = (s) => {
  if (typeof s !== "string") return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** Læs linjer i *alle* kendte former */
function extractLinesFromAny(r) {
  if (!r) return { lines: [], fromMeta: false };

  // 1) direkte fra props (syntetisk samlet ordre)
  if (Array.isArray(r.lines) && r.lines.length) {
    const map = r.lines.map((ln) => ({
      device: ln.device || r.model || r.device || "",
      repair: ln.repair || ln.title || "",
      price: Number(ln.price || 0),
      time: Number(ln.time || 0),
      part: ln.part || ln.meta || null,
      source_id: ln.source_id ?? ln.id ?? null,
    }));
    return { lines: map, fromMeta: true };
  }

  // 2) WP meta som JSON-streng
  const metaJson = r.meta_json || r.meta || r._meta || null;
  const parsed = typeof metaJson === "string" ? safeParseJSON(metaJson) : metaJson;
  const metaLines = parsed?.lines || parsed?.repairs || null;

  if (Array.isArray(metaLines) && metaLines.length) {
    return {
      lines: metaLines.map((ln) => ({
        device: ln.device || ln.model || r.model || r.device || "",
        repair: ln.repair || ln.title || "",
        price: Number(ln.price || 0),
        time: Number(ln.time || 0),
        part: ln.part || ln.meta || null,
        source_id: ln.id ?? ln.source_id ?? null,
      })),
      fromMeta: true,
    };
  }

  // 3) enkeltlinje-faldback
  const single = {
    device: r.model || r.device || "",
    repair: r.repair || r.title || r.repair_title || "",
    price: Number(r.price || r.amount || 0),
    time: Number(r.time || r.duration || 0),
    part: r.part || null,
    source_id: r.id ?? r.repair_id ?? r.post_id ?? null,
  };

  return { lines: [single], fromMeta: false };
}

/** Mapper UI-felter → WP meta keys */
function mapPriceTime(fields = {}) {
  const f = { ...fields };
  if (Object.prototype.hasOwnProperty.call(f, "price")) {
    f._telegiganten_repair_repair_price = Number(f.price);
    delete f.price;
  }
  if (Object.prototype.hasOwnProperty.call(f, "time")) {
    f._telegiganten_repair_repair_time = Number(f.time);
    delete f.time;
  }
  return f;
}

/* Normaliser telefon til DK-format (Twilio kræver E.164) */
function normalizePhoneLocalOrDK(phone) {
  const digits = String(phone || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 8) return `+45${digits}`;
  if (digits.length >= 10) return `+${digits.replace(/^0+/, "")}`;
  return phone;
}

/* ---------------- Component ---------------- */
export default function RepairHistory({ repair, onClose, onAfterSave }) {
  const overlayRef = useRef(null);
  const navigate = useNavigate();

  const { lines, fromMeta } = useMemo(() => extractLinesFromAny(repair), [repair]);

  // top-level state
  const [edited, setEdited] = useState(() => ({
    customer: repair.customer || "",
    phone: repair.phone || "",
    contact: repair.contact || "",
    password: repair.password || "",
    note: repair.note || "",
    status: (repair.status || "").toLowerCase(),
    payment_type: (repair.payment_type || "").toLowerCase() || "efter",
    payment_total: Number(repair.payment_total || 0) || (fromMeta ? sum(lines, "price") : 0),
    deposit_amount: Number(repair.deposit_amount || 0) || 0,
    remaining_amount: Number(repair.remaining_amount || 0) || 0,
  }));

  useEffect(() => {
    if (fromMeta && !edited.payment_total) {
      setEdited((prev) => ({ ...prev, payment_total: sum(lines, "price") }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromMeta, lines]);

  const handleChange = (key, val) => setEdited((e) => ({ ...e, [key]: val }));

  // linjer
  const [editableLines, setEditableLines] = useState(() =>
    (lines || []).map((ln, idx) => ({
      idx,
      device: ln.device || "",
      repair: ln.repair || "",
      price: Number(ln.price || 0),
      time: Number(ln.time || 0),
      part: ln.part || ln.meta || null,
      source_id: ln.source_id ?? ln.id ?? null,
      _dirty: false,
      _new: false,
    }))
  );

  useEffect(() => {
    setEditableLines(
      (lines || []).map((ln, idx) => ({
        idx,
        device: ln.device || "",
        repair: ln.repair || "",
        price: Number(ln.price || 0),
        time: Number(ln.time || 0),
        part: ln.part || ln.meta || null,
        source_id: ln.source_id ?? ln.id ?? null,
        _dirty: false,
        _new: false,
      }))
    );
  }, [lines]);

  const setLineField = (idx, field, value) => {
    setEditableLines((prev) =>
      prev.map((l) =>
        l.idx === idx
          ? {
              ...l,
              [field]:
                field === "price" || field === "time"
                  ? Number(String(value).replace(",", ".")) || 0
                  : value,
              _dirty: true,
            }
          : l
      )
    );
  };

  function addNewLine() {
    setEditableLines((prev) => {
      const nextIdx = prev?.length || 0;
      return [
        ...prev,
        {
          idx: nextIdx,
          device: "",
          repair: "",
          price: 0,
          time: 0,
          part: null,
          source_id: null,
          _dirty: true,
          _new: true,
        },
      ];
    });
  }

  // 🗑️ Slet en linje (med bekræftelse) - NU MED HÅRD FEJL-CHECK
  async function requestDeleteLine(line) {
    if (!line) return;
    const ok = window.confirm("Er du sikker på at du vil slette?");
    if (!ok) return;

    // Ny/ikke-gemt linje → fjern lokalt
    if (!line.source_id) {
      setEditableLines((prev) =>
        prev.filter((l) => l.idx !== line.idx).map((l, i) => ({ ...l, idx: i }))
      );
      return;
    }

    try {
      const id = Number(line.source_id);

      // Kald delete endpoint
      let res = null;
      if (api.deleteRepairWithHistory) {
        res = await api.deleteRepairWithHistory({ repair_id: id });
      } else if (api.deleteRepair) {
        res = await api.deleteRepair({ repair_id: id });
      } else {
        // fallback: markér annulleret
        res = await api.updateRepairWithHistory?.({
          repair_id: id,
          fields: { status: "annulleret" },
          change_note: "Linje annulleret via RepairHistory",
        });
      }

      // 🔥 HARD CHECK: hvis API ikke svarer “deleted”, så stopper vi her
      // (ellers får vi silent fail og linjen dukker op igen)
      if (api.deleteRepairWithHistory || api.deleteRepair) {
        if (!res || res.status !== "deleted") {
          throw new Error(
            `Slet mislykkedes (API). Forventede {status:"deleted"} men fik: ${JSON.stringify(res)}`
          );
        }
      }

      // Fjern fra UI
      setEditableLines((prev) =>
        prev.filter((l) => l.idx !== line.idx).map((l, i) => ({ ...l, idx: i }))
      );

      // 🔁 Refresh parent list med det samme (så listen og totals opdaterer)
      await Promise.resolve(onAfterSave?.());
    } catch (e) {
      console.error(e);
      alert(e?.message || "Kunne ikke slette linjen.");
    }
  }

  // totaler
  const totalsFromEdits = useMemo(
    () => ({
      price: (editableLines || []).reduce((s, l) => s + (Number(l.price) || 0), 0),
      time: (editableLines || []).reduce((s, l) => s + (Number(l.time) || 0), 0),
    }),
    [editableLines]
  );

  // ændrede topfelter
  const changedFields = useMemo(() => {
    const out = {};
    const keys = [
      "phone",
      "contact",
      "password",
      "note",
      "status",
      "payment_type",
      "payment_total",
      "deposit_amount",
      "remaining_amount",
    ];
    for (const k of keys) {
      const v = edited[k];
      const orig = repair[k];
      const nv =
        k === "payment_total" || k === "deposit_amount" || k === "remaining_amount"
          ? Number(v || 0)
          : v;
      const ov =
        k === "payment_total" || k === "deposit_amount" || k === "remaining_amount"
          ? Number(orig || 0)
          : orig;
      if ((nv ?? "") !== (ov ?? "")) out[k] = nv;
    }
    return out;
  }, [edited, repair]);

  const dirtyLines = useMemo(() => {
    if (!fromMeta) return [];
    return editableLines.filter((ln) => ln._dirty && !!ln.source_id);
  }, [fromMeta, editableLines]);

  const newLinesForCreate = useMemo(() => {
    return editableLines.filter((l) => !l.source_id && (l.device || l.repair || l.price || l.time));
  }, [editableLines]);

  const noteChanged = useMemo(() => (edited.note ?? "") !== (repair.note ?? ""), [edited.note, repair.note]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const primaryRepairId = useMemo(() => {
    const direct = Number(repair?.id || 0) || null;
    if (direct) return direct;
    const first = editableLines.find((l) => l.source_id)?.source_id;
    return first ? Number(first) : null;
  }, [repair?.id, editableLines]);

  const allRepairIds = useMemo(() => {
    const ids = [];
    if (repair?.id) ids.push(Number(repair.id));
    for (const l of editableLines) if (l?.source_id) ids.push(Number(l.source_id));
    return Array.from(new Set(ids.filter(Boolean)));
  }, [repair?.id, editableLines]);

  const handleSave = async () => {
    const hasTop = Object.keys(changedFields).length > 0;
    const hasLines = dirtyLines.length > 0;
    const hasNote = noteChanged;

    if (!hasTop && !hasLines && !hasNote && newLinesForCreate.length === 0) {
      onClose?.();
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 0) Opret nye linjer
      for (const ln of newLinesForCreate) {
        const fields = {
          title: String(ln.repair || "").trim(),
          model_id: Number(repair.model_id || ln.model_id || 0) || 0,
          order_id: repair.order_id,
          device: ln.device || "",
          repair: ln.repair || "",
          price: Number(ln.price || 0),
          time: Number(ln.time || 0),
          customer_id: Number(repair.customer_id || 0) || 0,
          _telegiganten_repair_repair_price: Number(ln.price || 0),
          _telegiganten_repair_repair_time: Number(ln.time || 0),
        };

        if (!fields.title || !fields.model_id) {
          throw new Error("Kan ikke oprette linje: title eller model_id mangler.");
        }

        const created = api.createRepairWithHistory
          ? await api.createRepairWithHistory({ fields, change_note: "Ny linje tilføjet via RepairHistory" })
          : await api.createRepair(fields);

        const newId = created?.repair_id || created?.id || created?.post_id || created?.ID || null;

        setEditableLines((prev) =>
          prev.map((x) => (x.idx === ln.idx ? { ...x, source_id: newId, _new: false, _dirty: false } : x))
        );
      }

      // 1) Opdater eksisterende linjer
      for (const ln of dirtyLines) {
        await api.updateRepairWithHistory({
          repair_id: Number(ln.source_id),
          fields: mapPriceTime({
            device: ln.device,
            repair: ln.repair,
            price: Number(ln.price || 0),
            time: Number(ln.time || 0),
          }),
          change_note: "Opdateret via RepairHistory (linje)",
        });
      }

      // 2) Topfelter
      if (primaryRepairId && Object.keys(changedFields).length) {
        const top = { ...changedFields };

        if (Object.prototype.hasOwnProperty.call(top, "phone")) {
          top.phone = normalizePhoneLocalOrDK(top.phone);
        }

        await api.updateRepairWithHistory({
          repair_id: primaryRepairId,
          fields: top,
          change_note: "Topfelter opdateret via RepairHistory",
        });
      }

      // 3) Status broadcast til alle
      const statusVal = String(edited.status || "").toLowerCase();
      for (const id of allRepairIds) {
        await api.updateRepairWithHistory({
          repair_id: id,
          fields: { status: statusVal },
          change_note: "Status opdateret for hele ordren via RepairHistory",
        });
      }

      await Promise.resolve(onAfterSave?.());
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Kunne ikke gemme ændringer. Prøv igen.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0 }}>
              Redigér reparation – Ordre-ID #{repair.order_id}
              {repair.id ? (
                <span style={{ fontSize: "0.8rem", color: "#666" }}> (post #{repair.id})</span>
              ) : null}
            </h2>
            <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>Oprettet: {formatDateTime(repair.created_at)}</div>
          </div>
          <button onClick={onClose} style={styles.close} title="Luk">
            <FaTimes />
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.body}>
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Kunde:</strong>
            </label>
            {repair.customer_id ? (
              <Link to={`/customers/${repair.customer_id}`} style={styles.linkBox} title="Åbn kundens side">
                {repair.customer || "—"}
              </Link>
            ) : (
              <div style={styles.readonlyBox}>{repair.customer || "—"}</div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Telefon:</strong>
            </label>
            <input type="text" value={edited.phone ?? ""} onChange={(e) => handleChange("phone", e.target.value)} style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Reparationslinjer</strong>
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", margin: "6px 0 10px" }}>
              <button onClick={addNewLine} style={styles.secondary} title="Tilføj ny linje">
                + Tilføj linje
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr .6fr .6fr",
                  gap: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#374151",
                }}
              >
                <div>Model</div>
                <div>Reparation</div>
                <div>Pris (kr)</div>
                <div>Tid (min)</div>
              </div>

              {editableLines.map((ln) => (
                <div key={ln.idx} style={styles.lineCard}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.2fr .6fr .6fr",
                      gap: 8,
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <input style={styles.input} value={ln.device} onChange={(e) => setLineField(ln.idx, "device", e.target.value)} placeholder="Model / enhed" />
                    <input style={styles.input} value={ln.repair} onChange={(e) => setLineField(ln.idx, "repair", e.target.value)} placeholder="Reparation" />
                    <input style={styles.input} type="text" inputMode="numeric" value={String(ln.price)} onChange={(e) => setLineField(ln.idx, "price", e.target.value)} placeholder="Pris" />
                    <input style={styles.input} type="text" inputMode="numeric" value={String(ln.time)} onChange={(e) => setLineField(ln.idx, "time", e.target.value)} placeholder="Min." />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      <PartBadge meta={ln.part} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => requestDeleteLine(ln)} style={{ ...styles.cancel, padding: "6px 10px" }} title="Slet linje">
                        Slet
                      </button>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{ln.source_id ? `#${ln.source_id}` : "—"}</div>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontWeight: 700 }}>
                <span>Samlet</span>
                <span>
                  {totalsFromEdits.price.toLocaleString("da-DK")} kr
                  {totalsFromEdits.time ? ` • ${totalsFromEdits.time} min` : ""}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Betaling:</strong>
            </label>
            <select value={edited.payment_type} onChange={(e) => handleChange("payment_type", e.target.value)} style={{ ...styles.input, appearance: "auto" }}>
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Status:</strong>
            </label>
            <select value={edited.status || ""} onChange={(e) => handleChange("status", e.target.value)} style={{ ...styles.input, appearance: "auto" }}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inputRow2}>
            <div>
              <label style={{ marginBottom: 6 }}>
                <strong>Kontakt:</strong>
              </label>
              <input type="text" value={edited.contact ?? ""} onChange={(e) => handleChange("contact", e.target.value)} style={styles.input} />
            </div>
            <div>
              <label style={{ marginBottom: 6 }}>
                <strong>Adgangskode:</strong>
              </label>
              <input type="text" value={edited.password ?? ""} onChange={(e) => handleChange("password", e.target.value)} style={styles.input} />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Note:</strong>
            </label>
            <textarea rows={3} value={edited.note ?? ""} onChange={(e) => handleChange("note", e.target.value)} style={{ ...styles.input, resize: "vertical" }} />
          </div>

          <div style={styles.footer}>
            <button onClick={onClose} disabled={saving} style={styles.cancel}>
              Annullér
            </button>
            <button onClick={handleSave} style={styles.save} disabled={saving}>
              {saving ? "Gemmer…" : "Gem ændringer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    width: "min(980px, 94vw)",
    maxHeight: "90vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 16,
    padding: "18px 18px 14px",
    boxShadow: "0 20px 60px rgba(0,0,0,.2)",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 },
  close: {
    border: "none",
    background: "#eef2ff",
    color: "#111827",
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  body: { display: "grid", gap: 12 },
  inputGroup: { display: "grid", gap: 6 },
  inputRow2: { display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, background: "#fff" },
  readonlyBox: { width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, background: "#f9fafb" },
  linkBox: {
    display: "inline-block",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#f0f9ff",
    textDecoration: "none",
    color: "#0c4a6e",
    fontWeight: 700,
  },
  lineCard: { padding: 8, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" },
  footer: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 },
  cancel: { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 },
  save: { background: "#2166AC", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 },
  secondary: { background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 },
  errorBox: { background: "#fee2e2", color: "#991b1b", padding: "8px 10px", borderRadius: 10, marginBottom: 10 },
};
