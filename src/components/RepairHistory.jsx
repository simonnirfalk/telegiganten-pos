// src/components/RepairHistory.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { api, proxyFetch } from "../data/apiClient";

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

const STATUS_OPTIONS = ["under reparation", "klar til afhentning", "afsluttet", "annulleret"].map((s) => ({
  value: s,
  label: s,
}));

function sum(arr, key) {
  return (arr || []).reduce((acc, it) => acc + (Number(it?.[key]) || 0), 0);
}

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

export default function RepairHistory({ repair, onClose, onAfterSave }) {
  const overlayRef = useRef(null);
  const navigate = useNavigate();

  const initialLines = useMemo(() => {
    const arr = Array.isArray(repair?.lines) ? repair.lines : [];
    return arr.map((ln, idx) => ({
      idx,
      device: ln.device || "",
      repair: ln.repair || "",
      price: Number(ln.price || 0),
      time: Number(ln.time || 0),
      source_id: ln.source_id ?? null,
      model_id: Number(ln.model_id || 0) || 0,
      _dirty: false,
      _new: false,
    }));
  }, [repair]);

  const fallbackModelId = useMemo(() => {
    const fromOrder = Number(repair?.model_id || 0) || 0;
    if (fromOrder) return fromOrder;
    const first = initialLines.find((x) => Number(x.model_id || 0) > 0);
    return Number(first?.model_id || 0) || 0;
  }, [repair?.model_id, initialLines]);

  const [edited, setEdited] = useState(() => ({
    customer: repair.customer || "",
    phone: repair.phone || "",
    contact: repair.contact || "",
    password: repair.password || "",
    note: repair.note || "",
    status: (repair.status || "").toLowerCase(),
    payment_type: (repair.payment_type || "").toLowerCase() || "efter",
    payment_total: Number(repair.payment_total || 0) || sum(initialLines, "price"),
    deposit_amount: Number(repair.deposit_amount || 0) || 0,
    remaining_amount: Number(repair.remaining_amount || 0) || 0,
  }));

  const [editableLines, setEditableLines] = useState(initialLines);

  useEffect(() => {
    setEditableLines(initialLines);
  }, [initialLines]);

  const handleChange = (key, val) => setEdited((e) => ({ ...e, [key]: val }));

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
          source_id: null,
          model_id: fallbackModelId, // arver model_id
          _dirty: true,
          _new: true,
        },
      ];
    });
  }

  // ✅ HARD delete via /delete-repair (så linjen reelt forsvinder)
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

      // Brug proxyFetch, som vi ved virker i dit setup (CSP)
      const res = api.deleteRepair
        ? await api.deleteRepair({ repair_id: id })
        : await proxyFetch({
            path: "/wp-json/telegiganten/v1/delete-repair",
            method: "POST",
            body: { repair_id: id },
          });

      if (!res || res.status !== "deleted") {
        throw new Error(
          `Slet mislykkedes. Forventede {status:"deleted"} men fik: ${JSON.stringify(res)}`
        );
      }

      // Fjern fra UI
      setEditableLines((prev) =>
        prev.filter((l) => l.idx !== line.idx).map((l, i) => ({ ...l, idx: i }))
      );

      // 🔁 Opdater listen bagved (så pris/tid ændrer sig)
      await Promise.resolve(onAfterSave?.());
    } catch (e) {
      console.error(e);
      alert(e?.message || "Kunne ikke slette linjen.");
    }
  }

  const totalsFromEdits = useMemo(
    () => ({
      price: (editableLines || []).reduce((s, l) => s + (Number(l.price) || 0), 0),
      time: (editableLines || []).reduce((s, l) => s + (Number(l.time) || 0), 0),
    }),
    [editableLines]
  );

  const dirtyLines = useMemo(() => {
    return editableLines.filter((ln) => ln._dirty && !!ln.source_id);
  }, [editableLines]);

  const newLinesForCreate = useMemo(() => {
    return editableLines.filter(
      (l) => !l.source_id && (l.device || l.repair || l.price || l.time)
    );
  }, [editableLines]);

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

  /* ---------- SMS modal state + helpers ---------- */
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsText, setSmsText] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState("");

  function defaultSmsText() {
    return `Kære ${repair.customer || "kunde"},

Din reparation #${repair.order_id} er klar til afhentning. 

Telegiganten
Taastrup hovedgade 66
2630 Taastrup
Tlf. 70 70 78 56
Åbningstider: Man - Fre 10-18, Lør 10-14`;
  }

  function openSmsBox() {
    const phonePrefill = edited.contact?.trim() || edited.phone?.trim() || "";
    setSmsPhone(normalizePhoneLocalOrDK(phonePrefill));
    setSmsText(defaultSmsText());
    setSmsError("");
    setSmsOpen(true);
  }

  async function handleSmsSend() {
    setSmsSending(true);
    setSmsError("");
    try {
      const to = normalizePhoneLocalOrDK(smsPhone);
      if (!to) throw new Error("Telefonnummer mangler.");
      if (!smsText.trim()) throw new Error("SMS-tekst mangler.");

      // Forventer api.sendSMS({ to, body, repair_id })
      await api.sendSMS({
        to,
        body: smsText,
        repair_id: primaryRepairId || repair.id || null,
      });

      setSmsOpen(false);
    } catch (e) {
      setSmsError(e?.message || "Kunne ikke sende SMS.");
    } finally {
      setSmsSending(false);
    }
  }

  async function copySmsToClipboard() {
    try {
      await navigator.clipboard.writeText(`${smsPhone}\n\n${smsText}`);
      setSmsError("Tekst kopieret til udklipsholder.");
    } catch {
      setSmsError("Kunne ikke kopiere til udklipsholder.");
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // 0) Opret NYE linjer
      for (const ln of newLinesForCreate) {
        const model_id = Number(ln.model_id || repair.model_id || fallbackModelId || 0) || 0;
        const fields = {
          title: String(ln.repair || "").trim(),
          model_id,
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
          throw new Error("Kan ikke oprette linje: 'title' eller 'model_id' mangler. (API-krav)");
        }

        const created = api.createRepairWithHistory
          ? await api.createRepairWithHistory({
              fields,
              change_note: "Ny linje tilføjet via RepairHistory",
            })
          : await api.createRepair(fields);

        const newId = created?.repair_id || created?.id || created?.post_id || created?.ID || null;

        setEditableLines((prev) =>
          prev.map((x) =>
            x.idx === ln.idx
              ? { ...x, source_id: newId ? Number(newId) : null, _new: false, _dirty: false }
              : x
          )
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
      if (primaryRepairId) {
        await api.updateRepairWithHistory({
          repair_id: primaryRepairId,
          fields: {
            payment_type: String(edited.payment_type || "efter").toLowerCase(),
            payment_total: Number(edited.payment_total || 0),
            deposit_amount: Number(edited.deposit_amount || 0),
            remaining_amount: Number(edited.remaining_amount || 0),
            phone: edited.phone ?? "",
            contact: edited.contact ?? "",
            password: edited.password ?? "",
            note: edited.note ?? "",
          },
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
            <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
              Oprettet: {formatDateTime(repair.created_at)}
            </div>
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
            <input
              type="text"
              value={edited.phone ?? ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              style={styles.input}
            />
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
                    <input
                      style={styles.input}
                      value={ln.device}
                      onChange={(e) => setLineField(ln.idx, "device", e.target.value)}
                      placeholder="Model / enhed"
                    />
                    <input
                      style={styles.input}
                      value={ln.repair}
                      onChange={(e) => setLineField(ln.idx, "repair", e.target.value)}
                      placeholder="Reparation"
                    />
                    <input
                      style={styles.input}
                      type="text"
                      inputMode="numeric"
                      value={String(ln.price)}
                      onChange={(e) => setLineField(ln.idx, "price", e.target.value)}
                      placeholder="Pris"
                    />
                    <input
                      style={styles.input}
                      type="text"
                      inputMode="numeric"
                      value={String(ln.time)}
                      onChange={(e) => setLineField(ln.idx, "time", e.target.value)}
                      placeholder="Min."
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      model_id: {Number(ln.model_id || fallbackModelId || 0) || "—"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={() => requestDeleteLine(ln)}
                        style={{ ...styles.cancel, padding: "6px 10px" }}
                        title="Slet linje"
                      >
                        Slet
                      </button>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {ln.source_id ? `#${ln.source_id}` : "—"}
                      </div>
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
            <select
              value={edited.payment_type}
              onChange={(e) => handleChange("payment_type", e.target.value)}
              style={{ ...styles.input, appearance: "auto" }}
            >
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
            <select
              value={edited.status || ""}
              onChange={(e) => handleChange("status", e.target.value)}
              style={{ ...styles.input, appearance: "auto" }}
            >
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
              <input
                type="text"
                value={edited.contact ?? ""}
                onChange={(e) => handleChange("contact", e.target.value)}
                style={styles.input}
              />
            </div>
            <div>
              <label style={{ marginBottom: 6 }}>
                <strong>Adgangskode:</strong>
              </label>
              <input
                type="text"
                value={edited.password ?? ""}
                onChange={(e) => handleChange("password", e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Note:</strong>
            </label>
            <textarea
              rows={3}
              value={edited.note ?? ""}
              onChange={(e) => handleChange("note", e.target.value)}
              style={{ ...styles.input, resize: "vertical" }}
            />
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            {/* Venstre knapper: Print + SMS (genindført) */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={styles.secondary}
                onClick={() => navigate(`/print-slip/${repair.order_id}`, { state: { order: repair } })}
              >
                Print slip
              </button>
              <button style={styles.secondary} onClick={openSmsBox} title="Send SMS til kunden">
                Send SMS
              </button>
            </div>

            {/* Højre knapper */}
            <div style={{ display: "flex", gap: 8 }}>
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

      {/* ---------- SMS modal (genindført) ---------- */}
      {smsOpen && (
        <div
          style={styles.smsOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSmsOpen(false);
          }}
        >
          <div style={styles.smsModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Send SMS</h3>

            {smsError && (
              <div style={styles.errorBox} role="alert">
                {smsError}
              </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              <label>
                <strong>Telefon</strong>
              </label>
              <input
                style={styles.input}
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+45xxxxxxxx"
              />

              <label>
                <strong>Besked</strong>
              </label>
              <textarea
                rows={8}
                style={{ ...styles.input, resize: "vertical" }}
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={() => setSmsOpen(false)} style={styles.cancel}>
                Luk
              </button>
              <button onClick={copySmsToClipboard} style={styles.secondary}>
                Kopiér
              </button>
              <button
                onClick={handleSmsSend}
                style={styles.save}
                disabled={smsSending || !smsPhone || !smsText.trim()}
              >
                {smsSending ? "Sender…" : "Send SMS"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
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
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    background: "#fff",
  },
  readonlyBox: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    background: "#f9fafb",
  },
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
  lineCard: {
    padding: 8,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
  },
  footer: { display: "flex", gap: 8, justifyContent: "space-between", marginTop: 12 },
  cancel: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  save: {
    background: "#2166AC",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondary: {
    background: "#f0f9ff",
    color: "#0369a1",
    border: "1px solid #bae6fd",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "8px 10px",
    borderRadius: 10,
    marginBottom: 10,
  },

  // SMS modal styles
  smsOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
  },
  smsModal: {
    width: "min(560px, 94vw)",
    maxHeight: "85vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
  },
};
