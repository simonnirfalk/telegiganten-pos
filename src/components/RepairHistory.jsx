// src/components/RepairHistory.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import ReadOnlyPartBadge from "./ReadOnlyPartBadge";

/** Hjælper til robust datoformat */
function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("da-DK");
  } catch {
    return iso;
  }
}

/** Betalingstyper (labels matcher Step2) */
const PAYMENT_OPTIONS = [
  { value: "efter", label: "Betaling efter reparation" },
  { value: "betalt", label: "Allerede betalt" },
  { value: "depositum", label: "Delvis betalt (depositum)" },
  { value: "garanti", label: "Garanti (ingen betaling)" },
];

/** Status (kun 3 muligheder) */
const STATUS_OPTIONS = ["under reparation", "klar til afhentning", "afsluttet"].map((s) => ({
  value: s,
  label: s,
}));

/** Udled payment_type ud fra tekst, hvis feltet mangler */
function inferPaymentType(paymentText = "") {
  const t = (paymentText || "").toLowerCase();
  if (t.includes("garanti")) return "garanti";
  if (t.includes("depositum") || t.includes("delvis")) return "depositum";
  if (t.includes("allerede betalt") || t.includes("betalt:")) return "betalt";
  return "efter";
}

export default function RepairHistory({ repair, onClose, onSave }) {
  const overlayRef = useRef(null);

  // Start-state: inkluder evt. depositumfelter hvis backend sender dem
  const [edited, setEdited] = useState(() => ({
    ...repair,
    payment_type: repair.payment_type || inferPaymentType(repair.payment),
    deposit_amount: repair.deposit_amount ?? null,
    remaining_amount: repair.remaining_amount ?? null,
    payment_total: repair.payment_total ?? null,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Historik – sorter nyeste først
  const [history, setHistory] = useState(
    Array.isArray(repair.history) ? [...repair.history] : []
  );
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

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const handleChange = (field, value) => {
    setEdited((prev) => ({ ...prev, [field]: value }));
  };

  /** Kun felter, der er ændret (reservedel er read-only → ingen part_id i payload) */
  const changedFields = useMemo(() => {
    const out = {};
    const orig = repair || {};
    const FIELDS = [
      "phone",
      "model",
      "repair",
      "price",
      "time",
      "payment_type",
      "status",
      "password",
      "note",
      "contact",
      "deposit_amount",
      "remaining_amount",
      "payment_total",
    ];

    for (const key of FIELDS) {
      if (edited[key] !== orig[key]) out[key] = edited[key];
    }

    // Talsanitering
    for (const k of ["price", "time", "deposit_amount", "remaining_amount", "payment_total"]) {
      if (out[k] !== undefined && out[k] !== "") {
        const n = Number(out[k]);
        if (!Number.isNaN(n)) out[k] = n;
      }
    }

    // Hvis payment_type ikke er depositum, nulstil depositumfelter i payload (valgfrit)
    if ((out.payment_type ?? edited.payment_type) !== "depositum") {
      // Hvis de oprindeligt var sat, og vi skifter væk fra depositum, kan vi rydde dem
      // Kommentér ud hvis I hellere vil bevare historik:
      // out.deposit_amount = 0;
      // out.remaining_amount = 0;
    }

    return out;
  }, [edited, repair]);

  /** Reservedelsmeta: fra repair.meta eller top-level spare_part_* (sådan som PHP endpoint leverer) */
  const sparePartMeta = useMemo(() => {
    if (repair && repair.meta && typeof repair.meta === "object" && !Array.isArray(repair.meta)) {
      return repair.meta;
    }
    const hasTopLevel =
      repair &&
      (repair.spare_part_id !== undefined ||
        repair.spare_part_model !== undefined ||
        repair.spare_part_location !== undefined ||
        repair.spare_part_stock !== undefined ||
        repair.spare_part_category !== undefined ||
        repair.spare_part_repair !== undefined);

    if (hasTopLevel) {
      return {
        spare_part_id: repair.spare_part_id ?? null,
        spare_part_model: repair.spare_part_model ?? "",
        spare_part_location: repair.spare_part_location ?? "",
        spare_part_stock: repair.spare_part_stock ?? null,
        spare_part_category: repair.spare_part_category ?? "",
        spare_part_repair: repair.spare_part_repair ?? "",
      };
    }
    return null;
  }, [repair]);

  /** Depositum: vis + beregn “mangler” live */
  const depositComputed = useMemo(() => {
    if ((edited.payment_type || "efter") !== "depositum") return null;

    // total: brug payment_total hvis sat; ellers pris (single repair i denne modal)
    const total =
      Number.isFinite(Number(edited.payment_total ?? repair.payment_total))
        ? Number(edited.payment_total ?? repair.payment_total)
        : Number(edited.price ?? repair.price ?? 0);

    const deposit = Number(edited.deposit_amount ?? repair.deposit_amount ?? 0);
    const remaining =
      Number.isFinite(Number(edited.remaining_amount ?? repair.remaining_amount))
        ? Number(edited.remaining_amount ?? repair.remaining_amount)
        : Math.max(total - (Number.isFinite(deposit) ? deposit : 0), 0);

    return { total, deposit: Number.isFinite(deposit) ? deposit : 0, remaining };
  }, [edited.payment_type, edited.price, edited.payment_total, edited.deposit_amount, edited.remaining_amount, repair.price, repair.payment_total, repair.deposit_amount, repair.remaining_amount]);

  /** Gem */
  const handleSave = async () => {
    if (!Object.keys(changedFields).length) {
      onClose?.();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await Promise.resolve(
        onSave?.({
          repair_id: Number(repair.id),
          fields: changedFields,
        })
      );
    } catch (err) {
      console.error("Fejl fra onSave:", err);
      setError("Kunne ikke gemme ændringer. Prøv igen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={styles.overlay}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
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

        {/* Fejlbesked */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Inputs */}
        <div style={styles.body}>
          {/* Kunde – vis som link, ikke redigerbar */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Kunde:</strong>
            </label>
            {repair.customer_id ? (
              <Link
                to={`/customers/${repair.customer_id}`}
                style={styles.linkBox}
                title="Åbn kundens side"
              >
                {repair.customer || "—"}
              </Link>
            ) : (
              <div style={styles.readonlyBox}>{repair.customer || "—"}</div>
            )}
          </div>

          {/* Telefon */}
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

          {/* Model */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Model:</strong>
            </label>
            <input
              type="text"
              value={edited.model ?? ""}
              onChange={(e) => handleChange("model", e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Reparation */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Reparation:</strong>
            </label>
            <input
              type="text"
              value={edited.repair ?? ""}
              onChange={(e) => handleChange("repair", e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Pris */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Pris:</strong>
            </label>
            <input
              type="number"
              value={edited.price ?? ""}
              onChange={(e) => handleChange("price", e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Tid */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Tid:</strong>
            </label>
            <input
              type="number"
              value={edited.time ?? ""}
              onChange={(e) => handleChange("time", e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Betaling (dropdown) */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Betaling:</strong>
            </label>
            <select
              value={edited.payment_type || "efter"}
              onChange={(e) => handleChange("payment_type", e.target.value)}
              style={styles.input}
            >
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Depositum-sektion når valgt */}
            {edited.payment_type === "depositum" && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
                      Forudbetalt beløb
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={edited.deposit_amount ?? repair.deposit_amount ?? 0}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEdited((prev) => ({ ...prev, deposit_amount: v === "" ? "" : Number(v) }));
                      }}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
                      Samlet pris (total)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={
                        edited.payment_total ??
                        repair.payment_total ??
                        edited.price ??
                        repair.price ??
                        0
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setEdited((prev) => ({ ...prev, payment_total: v === "" ? "" : Number(v) }));
                      }}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "#223" }}>
                  <strong>Mangler:</strong>{" "}
                  {depositComputed ? depositComputed.remaining : 0} kr
                </div>
              </div>
            )}
          </div>

          {/* Status (dropdown) – opdateret værdiliste */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Status:</strong>
            </label>
            <select
              value={edited.status || "oprettet"}
              onChange={(e) => handleChange("status", e.target.value)}
              style={styles.input}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Adgangskode */}
          <div style={styles.inputGroup}>
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

          {/* Kontakt */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Kontakt:</strong>
            </label>
            <input
              type="text"
              value={edited.contact ?? ""}
              onChange={(e) => handleChange("contact", e.target.value)}
              style={styles.input}
              placeholder="Alternativt telefonnummer"
            />
          </div>

          {/* Note */}
          <div style={styles.inputGroup}>
            <label style={{ marginBottom: 6 }}>
              <strong>Note:</strong>
            </label>
            <input
              type="text"
              value={edited.note ?? ""}
              onChange={(e) => handleChange("note", e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Reservedel (read-only) */}
          <div style={{ gridColumn: "1 / -1", marginTop: "0.25rem" }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              <strong>Reservedel</strong>
            </label>
            <ReadOnlyPartBadge part={edited.part} meta={sparePartMeta} />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} disabled={saving} style={styles.cancel}>
            Annullér
          </button>
          <button
            onClick={handleSave}
            style={styles.save}
            disabled={saving || !Object.keys(changedFields).length}
            title={!Object.keys(changedFields).length ? "Ingen ændringer" : "Gem"}
          >
            {saving ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>

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
  );
}

/** Styles */
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#fff",
    padding: "1.25rem 1.25rem 1rem",
    borderRadius: "12px",
    width: "min(760px, 96vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.8rem",
  },
  close: {
    background: "none",
    border: "none",
    fontSize: "1.15rem",
    cursor: "pointer",
    color: "#333",
  },
  errorBox: {
    background: "#ffe8e8",
    color: "#900",
    border: "1px solid #f3b4b4",
    padding: "0.6rem 0.75rem",
    borderRadius: 8,
    marginBottom: "0.8rem",
  },
  body: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.9rem 1rem",
  },
  inputGroup: { display: "flex", flexDirection: "column" },
  input: {
    padding: "0.55rem 0.7rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "0.95rem",
  },
  readonlyBox: {
    padding: "0.55rem 0.7rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
  },
  linkBox: {
    display: "inline-block",
    padding: "0.55rem 0.7rem",
    borderRadius: "8px",
    border: "1px solid #2166AC",
    color: "#2166AC",
    textDecoration: "none",
    fontWeight: 600,
  },
  footer: {
    marginTop: "1.2rem",
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.6rem",
  },
  cancel: {
    background: "#fff",
    color: "#2166AC",
    border: "2px solid #2166AC",
    padding: "0.55rem 1rem",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
  save: {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.65rem 1.2rem",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
