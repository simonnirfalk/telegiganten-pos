// src/pages/ImportExportPage.jsx
import React, { useMemo, useState } from "react";
import { FaHome, FaDownload, FaUpload, FaInfoCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { api } from "../data/apiClient";

const BLUE = "#2166AC";

const TYPES = [
  { key: "customers", label: "Kunder" },
  { key: "models", label: "Modeller" },
  { key: "repair_options", label: "Repair options" },
  { key: "repair_orders", label: "Repair orders" },
];

// Heuristik: gætværk på delimiter ud fra første linje
function detectDelimiter(text) {
  const firstLine = (text.split(/\r?\n/)[0] || "").trim();
  const commas = (firstLine.match(/,/g) || []).length;
  const semis  = (firstLine.match(/;/g) || []).length;
  if (semis > commas) return ";";
  return ","; // default
}

// Erstat et tegn kun UDENFOR anførselstegn (meget enkel state-maskine)
function replaceOutsideQuotes(line, fromChar = ";", toChar = ",") {
  let out = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // håndter "" som escaped "
      if (inQuotes && line[i + 1] === '"') {
        out += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      out += ch;
      continue;
    }
    if (!inQuotes && ch === fromChar) {
      out += toChar;
    } else {
      out += ch;
    }
  }
  return out;
}

// Normalisér CSV til kommasepareret hvis brugeren har gemt med semikolon (Excel i DK)
async function normalizeCsvFileToComma(file) {
  const txt = await file.text(); // modern browsers
  const normalized = txt.replace(/\r\n/g, "\n"); // CRLF -> LF
  const delim = detectDelimiter(normalized);

  if (delim === ",") {
    return file;
  }

  // Konverter linje for linje: ; -> , (kun udenfor anførselstegn)
  const lines = normalized.split("\n");
  const converted = lines.map((ln) => replaceOutsideQuotes(ln, ";", ",")).join("\n");

  // Lav en ny File, så vi kan uploade den som CSV
  const blob = new Blob([converted], { type: "text/csv;charset=utf-8" });
  const newName = file.name.replace(/\.csv$/i, "") + "_comma.csv";
  return new File([blob], newName, { type: "text/csv" });
}

export default function ImportExportPage() {
  const nav = useNavigate();
  const [activeType, setActiveType] = useState(TYPES[0].key);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const exportUrl = useMemo(() => {
    if (activeType === 'repair_options') {
      return `${API_BASE}/telegiganten/v1/export-repair-options`;
    }
    return `${API_BASE}/telegiganten/v1/export?type=${activeType}`;
  }, [activeType]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setReport(null);
    setUploading(true);
    try {
      // 🔧 VIGTIGT: auto-fix semikolon-CSV fra Excel
      const normalizedFile = await normalizeCsvFileToComma(file);
      const res = await api.importCSV(activeType, normalizedFile);
      setReport(res);
    } catch (err) {
      setError(err?.message || "Upload fejlede.");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input så samme fil kan vælges igen
    }
  };

  const onDownloadTemplate = () => {
    // Tom skabelon med KORREKTE kolonnehoveder (matcher backend)
    const headersByType = {
      customers: "id,name,phone,email,created_at\n",
      models: "id,brand_id,brand,title,slug,active\n",
      repair_options: "id,model_id,model,title,price,time_min,repair_option_active\n",
      repair_orders: "id,order_id,customer_id,device,repair,price,time_min,payment,status,created_at,phone,contact,password,note\n",
    };
    const csv = headersByType[activeType] || "id\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f7f7f8" }}>
      {/* Left: main content */}
      <div style={{ flex: 1, padding: "1rem 2rem" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <button
            onClick={() => nav("/")}
            style={{
              background: "transparent",
              border: `2px solid ${BLUE}`,
              color: BLUE,
              padding: "0.5rem 0.75rem",
              borderRadius: "999px",
              cursor: "pointer",
            }}
            title="Dashboard"
          >
            <FaHome />
          </button>
          <h2 style={{ margin: 0 }}>Import / Export</h2>
        </div>

        {/* Type switcher */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              style={{
                borderRadius: "999px",
                padding: "0.5rem 0.9rem",
                border: "2px solid " + BLUE,
                cursor: "pointer",
                background: activeType === t.key ? BLUE : "#fff",
                color: activeType === t.key ? "#fff" : BLUE,
                fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: 900 }}>
          {/* Export */}
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Eksportér {TYPES.find(t => t.key === activeType)?.label}</h3>
            <p style={{ marginTop: 0 }}>
              Download alle poster som CSV. Filen kan redigeres og importeres igen.
            </p>
            <a
              href={exportUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: BLUE,
                color: "#fff",
                border: "2px solid " + BLUE,
                padding: "0.6rem 0.9rem",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <FaDownload /> Download CSV
            </a>
            <button
              onClick={onDownloadTemplate}
              style={{
                marginLeft: "0.5rem",
                background: "#fff",
                color: BLUE,
                border: "2px solid " + BLUE,
                padding: "0.6rem 0.9rem",
                borderRadius: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hent tom skabelon
            </button>

            <div style={{ marginTop: "0.75rem", display: "flex", gap: 8, alignItems: "flex-start", color: "#444" }}>
              <FaInfoCircle />
              <small>
                Opdatering sker via <strong>id</strong>-kolonnen. Hvis id mangler eller er tomt, oprettes ny post.
              </small>
            </div>
          </div>

          {/* Import */}
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Importér {TYPES.find(t => t.key === activeType)?.label}</h3>
            <p style={{ marginTop: 0 }}>
              Vælg en CSV-fil. Første linje skal være kolonnehoveder (se skabelonen).
            </p>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: uploading ? "#ccc" : BLUE,
                color: "#fff",
                border: "2px solid " + (uploading ? "#ccc" : BLUE),
                padding: "0.6rem 0.9rem",
                borderRadius: "12px",
                fontWeight: 600,
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              <FaUpload /> {uploading ? "Uploader..." : "Vælg CSV-fil"}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>

            {error ? (
              <div style={{ marginTop: "0.75rem", color: "#b00020", fontWeight: 600 }}>{error}</div>
            ) : null}

            {report ? (
              <div style={{ marginTop: "0.75rem", background: "#f3f7ff", border: "1px solid #d6e4ff", padding: "0.75rem", borderRadius: 8 }}>
                <strong>Import-resultat:</strong>
                <ul style={{ margin: "0.5rem 0 0 1rem" }}>
                  <li>Type: {report.type}</li>
                  <li>Oprettet: {report.created}</li>
                  <li>Opdateret: {report.updated}</li>
                  <li>Fejl: {report.errors}</li>
                </ul>
                {Array.isArray(report.error_rows) && report.error_rows.length > 0 && (
                  <>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>Fejlrækker:</div>
                    <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(report.error_rows, null, 2)}</pre>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right: info panel */}
      <div style={{
        width: "22%",
        backgroundColor: "#fff",
        borderLeft: "1px solid #ddd",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto"
      }}>
        <h4 style={{ textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: 8 }}>CSV formater</h4>
        <div style={{ fontSize: "0.92rem", lineHeight: 1.4 }}>
          <p><strong>Kunder</strong>: id,name,phone,email,created_at</p>
          <p><strong>Modeller</strong>: id,brand_id, brand, title,slug,active</p>
          <p><strong>Repair options</strong>: id,model_id, model, title,price,time_min,repair_option_active</p>
          <p><strong>Repair orders</strong>: id,order_id,customer_id,device,repair,price,time_min,payment,status,created_at,phone,contact,password,note</p>
          <p style={{ color: "#666" }}>
            Tip: Gem som <em>CSV UTF-8 (kommaadskilt)</em> i Excel – eller upload hvad som helst, vi konverterer semikolon automatisk.
          </p>
          <p style={{ color: "#666" }}>
            Bemærk: <em>models</em> kræver et gyldigt <code>brand_id</code>. <em>repair_options</em> kræver gyldigt <code>model_id</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
