// src/pages/RepairPrintSlip.jsx
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/** Label-bredde i mm (tilpas til jeres rulle) */
const LABEL_WIDTH_MM = 80;
/** Logo til kundeslip. Bemærk: billeder bliver altid rasteriseret.
 *  Hvis du vil undgå raster helt, så fjern logo ved at sætte nedenstående til "".
 */
const LOGO_URL = import.meta.env.VITE_PRINT_LOGO_URL || "/logo.png";

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

  /* ======================== TERMAL-OPTIMERET STYLES ======================== */
  const baseStyles = `
    :root { color-scheme: light; }
    html, body {
      margin: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
      -webkit-text-size-adjust: 100%;
      text-rendering: optimizeLegibility;
    }

    .sheet {
      max-width: ${LABEL_WIDTH_MM}mm;
      width: 100%;
      margin: 0 auto;
      padding: 8px 8px;
      color: #000;                 /* fuld sort for skarphed */
      background: #fff;
      font-family: Arial, Helvetica, sans-serif; /* printer-venlig font */
      font-size: 14px;             /* lidt større for tydelighed */
      line-height: 1.35;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    /* HEADER – kunde: logo (valgfrit), ordre-id, dato/tid, alt centreret */
    .header-cus {
      text-align: center;
      border-bottom: 2px solid #000;   /* tydelig sort linje */
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .logo {
      height: 18px;
      display: inline-block;
    }
    .orderTitle { font-weight: 800; font-size: 16px; margin: 6px 0 2px; }
    .dateLine   { font-size: 12px; }

    /* HEADER – tech: ingen logo, “TECH SLIP” + ordre-id */
    .header-tech {
      text-align: center;
      border-bottom: 2px solid #000;
      padding: 6px 0;
      margin-bottom: 6px;
    }
    .techTitle { font-weight: 900; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    .techOrder { font-weight: 800; font-size: 16px; margin-top: 2px; }

    .sectionTitle {
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      padding: 6px 6px;
      border: 2px solid #000;         /* kraftig sort ramme */
      margin: 8px 0 6px;
    }

    .box {
      border: 2px solid #000;
      padding: 8px;
      background: #fff;
    }

    /* Reparation pr. blok – simple linjer, ingen farver */
    .repairItem {
      border: 2px solid #000;
      padding: 8px;
      margin-bottom: 6px;
    }
    .repRow1 { font-weight: 700; }
    .repRow2 { display: flex; gap: 12px; margin-top: 4px; font-size: 13px; }
    .repMeta { display: inline-flex; gap: 6px; }
    .repLbl  { font-weight: 600; }

    /* Reservedel vises kun på TECH-slip, som ren tekst */
    .partRow {
      margin-top: 4px;
      font-size: 13px;
    }

    .totalBox {
      border: 2px solid #000;
      padding: 8px;
      margin-top: 6px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
    }
    .paymentBox {
      border: 2px solid #000;
      padding: 6px 8px;
      margin-top: 6px;
      font-weight: 700;
    }

    /* Info (kundeslip): adgangskode, kontakt, note */
    .infoBox {
      border: 2px solid #000;
      padding: 8px;
      margin-top: 6px;
      font-size: 13px;
    }

    /* Adgangskode tydeligt (tech) */
    .passwordBox {
      border: 2px solid #000;
      padding: 8px;
      margin: 6px 0 6px;
      font-weight: 800;
      text-align: center;
    }

    .footer {
      margin-top: 8px;
      text-align: center;
      font-size: 12px;
    }

    @media print {
      @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 3mm; } /* ingen skalering */
    }
  `;

  /* ---------------- Header-renderers ---------------- */
  const renderHeaderCustomer = () => `
    <div class="header-cus">
      ${LOGO_URL ? `<img class="logo" src="${LOGO_URL}" alt="" onerror="this.style.display='none'"/>` : ""}
      <div class="orderTitle">Ordre-ID: #${order.id}</div>
      <div class="dateLine">${dt.date} kl. ${dt.time}</div>
    </div>
  `;

  const renderHeaderTech = () => `
    <div class="header-tech">
      <div class="techTitle">TECH SLIP</div>
      <div class="techOrder">Ordre-ID: #${order.id}</div>
      <div class="dateLine">${dt.date} kl. ${dt.time}</div>
    </div>
  `;

  /* ---------------- Slips ---------------- */
  function renderCustomerSlip() {
    return `
      <div class="sheet">
        ${renderHeaderCustomer()}

        <div class="sectionTitle">Kunde</div>
        <div class="box">
          <div>${order.customer?.name || "-"}</div>
          <div>${order.customer?.phone || "-"}</div>
          <div>${order.customer?.email || "-"}</div>
        </div>

        <div class="sectionTitle">Reparationer</div>
        ${(order.repairs || []).map((r) => `
          <div class="repairItem">
            <div class="repRow1">${r.device || ""} — ${r.repair || ""}</div>
            <div class="repRow2">
              <span class="repMeta"><span class="repLbl">Pris</span><span><strong>${Number(r.price||0)} kr</strong></span></span>
              <span class="repMeta"><span class="repLbl">Tid</span><span><strong>${Number(r.time||0)} min</strong></span></span>
            </div>
            <!-- Kundeslip: INGEN reservedel -->
          </div>
        `).join("")}

        <div class="totalBox"><span>Total</span><span>${total} kr</span></div>
        <div class="paymentBox">Betaling: ${paymentText}</div>

        <div class="infoBox">
          <div><strong>Adgangskode:</strong> ${order.password || "—"}</div>
          <div><strong>Kontakt:</strong> ${order.contact || "—"}</div>
          <div><strong>Note:</strong> ${order.note || "—"}</div>
        </div>

        <div class="footer">
          Taastrup Hovedgade 66, 2630 Taastrup · Tlf: 70 70 78 56 · info@telegiganten.dk<br/>
          Man–Fre 10–18, Lør 10–14 — <strong>Husk din kvittering når du henter din reparation!</strong>
        </div>
      </div>
    `;
  }

  function renderTechSlip() {
    return `
      <div class="sheet">
        ${renderHeaderTech()}

        <div class="sectionTitle">Reparation</div>
        <div class="passwordBox">Adgangskode: ${order.password || "—"}</div>

        ${(order.repairs || []).map((r) => {
          const p = r.part || null;
          return `
            <div class="repairItem">
              <div class="repRow1">${r.device || ""} — ${r.repair || ""}</div>
              <div class="repRow2">
                <span class="repMeta"><span class="repLbl">Pris</span><span><strong>${Number(r.price||0)} kr</strong></span></span>
                <span class="repMeta"><span class="repLbl">Tid</span><span><strong>${Number(r.time||0)} min</strong></span></span>
              </div>
              ${
                p
                  ? `<div class="partRow">Reservedel: ${p.model || "-"}${p.location ? " · " + p.location : ""}${(p.stock ?? "") !== "" ? " · Lager: " + p.stock : ""}</div>`
                  : `<div class="partRow">(ingen reservedel valgt)</div>`
              }
            </div>
          `;
        }).join("")}

        <div class="totalBox"><span>Total</span><span>${total} kr</span></div>

        <div class="sectionTitle">Kunde</div>
        <div class="box">
          <div>${order.customer?.name || "-"}</div>
          <div>${order.customer?.phone || "-"}</div>
          ${order.contact ? `<div>Kontakt: ${order.contact}</div>` : ""}
          ${order.note ? `<div>Note: ${order.note}</div>` : ""}
        </div>
      </div>
    `;
  }

  /* ======================== Print: to jobs i samme popup ======================== */
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

  /* Preview/knapper på skærm (til test) */
  return (
    <div style={{ maxWidth: 620, margin: "12px auto", padding: "0 12px" }}>
      <h3>Udskriver kvitteringer…</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => nav("/")} style={btnGrey}>Tilbage</button>
        <button onClick={printTwoJobs} style={btnBlue}>Print igen</button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: `<style>${baseStyles}</style>` }} />
      <div dangerouslySetInnerHTML={{ __html: renderCustomerSlip() }} />
      <div style={{ borderTop: "2px solid #000", margin: "10px 0" }} />
      <div dangerouslySetInnerHTML={{ __html: renderTechSlip() }} />
    </div>
  );
}

const btnBlue = {
  background: "#2166AC", color: "#fff", border: 0, borderRadius: 6,
  padding: "8px 14px", cursor: "pointer", fontWeight: 700
};
const btnGrey = {
  background: "#f0f0f0", color: "#111", border: 0, borderRadius: 6,
  padding: "8px 14px", cursor: "pointer", fontWeight: 600
};
