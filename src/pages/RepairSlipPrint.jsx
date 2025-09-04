// src/pages/RepairPrintSlip.jsx
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/** Label-bredde i mm (ret hvis rullen er anden bredde) */
const LABEL_WIDTH_MM = 80;

/** Logo til header (SVG/PNG i høj opløsning anbefales) */
const LOGO_URL =
  import.meta.env.VITE_PRINT_LOGO_URL ||
  "/logo.png"; // fallback – læg en /public/logo.png ind hvis du vil vise logo

export default function RepairSlipPrint() {
  const nav = useNavigate();
  const { orderId } = useParams();
  const location = useLocation();

  const order =
    location.state?.order ||
    (() => {
      try { return JSON.parse(localStorage.getItem("tg_last_order") || "null"); }
      catch { return null; }
    })();

  const total = useMemo(
    () => (order?.repairs || []).reduce((s, r) => s + (Number(r.price) || 0), 0),
    [order]
  );

  const dt = useMemo(() => {
    const d = order?.created_at ? new Date(order.created_at) : new Date();
    return {
      date: d.toLocaleDateString("da-DK"),
      time: d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }),
    };
  }, [order?.created_at]);

  const paymentText = useMemo(() => {
    const m = order?.payment?.method || "efter";
    if (m === "garanti") return "Garanti (ingen betaling)";
    if (m === "betalt") return `Betalt: ${total} kr`;
    if (m === "depositum") {
      const up = Number(order?.payment?.upfront || 0);
      const rest = Math.max(total - up, 0);
      return `Depositum: ${up} kr — Mangler: ${rest} kr`;
    }
    return `Betaling efter reparation: ${total} kr`;
  }, [order, total]);

  // ---------- HTML builders (nyt, mere tydeligt layout) ----------
  const baseStyles = `
    :root { color-scheme: light; }
    html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-sizing: border-box; -webkit-text-size-adjust: 100%; text-rendering: optimizeLegibility; }
    .sheet {
      max-width: ${LABEL_WIDTH_MM}mm; width: 100%; margin: 0 auto;
      padding: 10px 10px;
      color: #0b0b0c;
      background: #fff;
      font: 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; /* lidt større tekst */
      break-inside: avoid-page; page-break-inside: avoid;
    }

    /* Header med logo */
    .header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
      padding-bottom: 6px; border-bottom: 2px solid #e5e7eb;
    }
    .logo {
      height: 18px; /* lav men skarp – SVG anbefales */
      image-rendering: optimizeQuality;
    }
    .brand {
      font-weight: 800; letter-spacing: 0.2px;
    }
    .header .right { margin-left: auto; text-align: right; font-size: 12px; color: #3f3f46; }

    .title { text-align: center; margin: 6px 0 8px; }
    .title .order { font-size: 15px; font-weight: 800; }
    .title .date { font-size: 12px; color: #52525b; margin-top: 1px; }

    .section { margin-top: 8px; }
    .card {
      border: 1.8px solid #e5e7eb; border-radius: 8px; padding: 8px;
      background: #fff;
    }
    .sectionTitle {
      font-weight: 800; text-transform: uppercase; font-size: 12px;
      padding: 6px 8px; border: 1.8px solid #e5e7eb; border-radius: 8px; background: #f8fafc;
      margin: 8px 0 6px;
    }

    .muted { color: #555; }

    /* Reparation-liste som blokke (mere plads til tekst) */
    .repairItem {
      border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 8px; margin-bottom: 6px;
    }
    .repRow1 { font-weight: 700; }
    .repRow2 { display: flex; gap: 10px; margin-top: 2px; font-size: 12px; color: #111827; }
    .repMeta { display: inline-flex; align-items: baseline; gap: 4px; }
    .repMeta .label { color: #6b7280; }

    .partRow { margin-top: 4px; font-size: 12px; color: #334155; }
    .chip {
      display: inline-block; padding: 1px 6px; border-radius: 999px;
      background: #eef2ff; color: #1e3a8a; margin-left: 6px; border: 1px solid #e0e7ff;
    }

    .totalBox {
      border: 2px solid #d4d4d8; border-radius: 8px; padding: 8px; margin-top: 6px;
      background: #fafafa; font-weight: 800; display: flex; justify-content: space-between;
    }

    .footer {
      margin-top: 8px; text-align: center; color: #555; font-size: 11.5px;
    }

    @media print { @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 3mm; } }
  `;

  function renderCustomerSlip() {
    return `
      <div class="sheet">
        <div class="header">
          <img class="logo" src="${LOGO_URL}" alt="" onerror="this.style.display='none'"/>
          <div class="brand">Telegiganten</div>
          <div class="right">
            <div>Ordre-ID: <strong>#${order.id}</strong></div>
            <div>${dt.date} kl. ${dt.time}</div>
          </div>
        </div>

        <div class="sectionTitle">Kunde</div>
        <div class="card">
          <div>${order.customer?.name || "-"}</div>
          <div>${order.customer?.phone || "-"}</div>
          <div class="muted">${order.customer?.email || "-"}</div>
        </div>

        <div class="sectionTitle">Reparationer</div>
        ${(order.repairs || []).map((r) => {
          const p = r.part || null;
          return `
            <div class="repairItem">
              <div class="repRow1">${r.device || ""} — ${r.repair || ""}</div>
              <div class="repRow2">
                <span class="repMeta"><span class="label">Pris</span><strong>${Number(r.price||0)} kr</strong></span>
                <span class="repMeta"><span class="label">Tid</span><strong>${Number(r.time||0)} min</strong></span>
              </div>
              ${
                p
                  ? `<div class="partRow">Reservedel: <strong>${p.model || "-"}</strong>
                       ${p.location ? `<span class="chip">${p.location}</span>` : ""}
                       ${(p.stock ?? "") !== "" ? `<span class="chip">Lager: ${p.stock}</span>` : ""}
                     </div>`
                  : ""
              }
            </div>
          `;
        }).join("")}

        <div class="totalBox"><span>Total</span><span>${total} kr</span></div>

        <div class="sectionTitle">Service</div>
        <div class="card">
          <div><strong>Adgangskode:</strong> ${order.password || "-"}</div>
          <div><strong>Kontakt:</strong> ${order.contact || "-"}</div>
          <div><strong>Note:</strong> ${order.note || "-"}</div>
        </div>

        <div class="section" style="margin-top:6px">
          <strong>Betaling:</strong> ${paymentText}
        </div>

        <div class="footer">
          Taastrup Hovedgade 66, 2630 Taastrup · Tlf: 70 70 78 56 · info@telegiganten.dk<br/>
          Man–Fre 10–18, Lør 10–14 — <strong>Husk din kvittering ved afhentning</strong>
        </div>
      </div>
    `;
  }

  function renderTechSlip() {
    return `
      <div class="sheet">
        <div class="header">
          <img class="logo" src="${LOGO_URL}" alt="" onerror="this.style.display='none'"/>
          <div class="brand">Telegiganten</div>
          <div class="right">
            <div>Ordre-ID: <strong>#${order.id}</strong></div>
            <div>${dt.date} kl. ${dt.time}</div>
          </div>
        </div>

        <div class="sectionTitle">Reparation</div>
        ${(order.repairs || []).map((r) => {
          const p = r.part || null;
          return `
            <div class="repairItem">
              <div class="repRow1">${r.device || ""} — ${r.repair || ""}</div>
              <div class="repRow2">
                <span class="repMeta"><span class="label">Pris</span><strong>${Number(r.price||0)} kr</strong></span>
                <span class="repMeta"><span class="label">Tid</span><strong>${Number(r.time||0)} min</strong></span>
              </div>
              ${
                p
                  ? `<div class="partRow">Reservedel: <strong>${p.model || "-"}</strong>
                       ${p.location ? `<span class="chip">${p.location}</span>` : ""}
                       ${(p.stock ?? "") !== "" ? `<span class="chip">Lager: ${p.stock}</span>` : ""}
                     </div>`
                  : `<div class="partRow muted">(ingen reservedel valgt)</div>`
              }
            </div>
          `;
        }).join("")}

        <div class="totalBox"><span>Total</span><span>${total} kr</span></div>

        <div class="sectionTitle">Kunde</div>
        <div class="card">
          <div>${order.customer?.name || "-"}</div>
          <div>${order.customer?.phone || "-"}</div>
          ${order.contact ? `<div>Kontakt: ${order.contact}</div>` : ""}
          ${order.note ? `<div>Note: ${order.note}</div>` : ""}
        </div>
      </div>
    `;
  }

  // ---------- Print-control: to jobs i samme popup ----------
  const printTwoJobs = async () => {
    const w = window.open("", "tg-print", "width=460,height=700");
    if (!w) { alert("Popup blokeret – tillad popups for at printe."); return; }

    const writeAndPrint = (innerHTML) =>
      new Promise((resolve) => {
        w.document.open();
        w.document.write(`<!doctype html><html><head>
            <meta charset="utf-8"/>
            <title>Print</title>
            <style>${baseStyles}</style>
          </head><body>${innerHTML}</body></html>`);
        w.document.close();

        setTimeout(() => {
          const onAfter = () => { w.removeEventListener("afterprint", onAfter); resolve(); };
          w.addEventListener("afterprint", onAfter);
          w.focus(); w.print();
        }, 150);
      });

    try {
      await writeAndPrint(renderCustomerSlip()); // job #1
      await writeAndPrint(renderTechSlip());     // job #2
    } finally {
      setTimeout(() => { try { w.close(); } catch {} }, 300);
    }
  };

  useEffect(() => { if (order) printTwoJobs(); }, []); // eslint-disable-line

  // Skærmforhåndsvisning + knapper (hjælper ved test)
  return (
    <div style={{ maxWidth: 620, margin: "12px auto", padding: "0 12px" }}>
      <h3>Udskriver kvitteringer…</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => nav("/")} style={btnGrey}>Tilbage</button>
        <button onClick={printTwoJobs} style={btnBlue}>Print igen</button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: `<style>${baseStyles}</style>` }} />
      <div dangerouslySetInnerHTML={{ __html: renderCustomerSlip() }} />
      <div style={{ borderTop: "1px dashed #d4d4d4", margin: "10px 0" }} />
      <div dangerouslySetInnerHTML={{ __html: renderTechSlip() }} />
    </div>
  );
}

/* små knapper til preview */
const btnBlue = {
  background: "#2166AC", color: "#fff", border: 0, borderRadius: 8,
  padding: "8px 14px", cursor: "pointer", fontWeight: 700
};
const btnGrey = {
  background: "#f0f0f0", color: "#111", border: 0, borderRadius: 8,
  padding: "8px 14px", cursor: "pointer", fontWeight: 600
};
