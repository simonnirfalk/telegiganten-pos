// src/pages/RepairPrintSlip.jsx
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/** Label-bredde i mm (ret hvis rullen er anden bredde) */
const LABEL_WIDTH_MM = 80;

/** Logo (SVG/PNG i høj opløsning anbefales) */
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

  // ---------- Styles & renderers ----------
  const baseStyles = `
    :root { color-scheme: light; }
    html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-sizing: border-box; -webkit-text-size-adjust: 100%; text-rendering: optimizeLegibility; }
    .sheet {
      max-width: ${LABEL_WIDTH_MM}mm; width: 100%; margin: 0 auto;
      padding: 10px 10px;
      color: #0b0b0c;
      background: #fff;
      font: 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      break-inside: avoid-page; page-break-inside: avoid;
    }

    /* Ny header: logo (centreret), derefter ordre-id som overskrift og dato/tid under */
    .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 6px; }
    .logo { height: 18px; image-rendering: optimizeQuality; display: inline-block; }
    .orderTitle { font-size: 15px; font-weight: 800; margin: 6px 0 2px; }
    .dateLine { font-size: 12px; color: #52525b; }

    .sectionTitle {
      font-weight: 800; text-transform: uppercase; font-size: 12px;
      padding: 6px 8px; border: 1.8px solid #e5e7eb; border-radius: 8px; background: #f8fafc;
      margin: 8px 0 6px;
    }
    .card {
      border: 1.8px solid #e5e7eb; border-radius: 8px; padding: 8px;
      background: #fff;
    }
    .muted { color: #555; }

    /* Reparation som blokke */
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
    .paymentBox {
      border: 1.8px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; margin-top: 6px; background: #fff;
      font-weight: 600;
    }

    /* Særlig tydelig adgangskode på tech-slip */
    .passwordBox {
      border: 2px solid #94a3b8; border-radius: 8px; background: #f1f5f9; color: #0f172a;
      padding: 8px; margin: 6px 0 6px; font-weight: 800; text-align: center;
    }

    @media print { @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 3mm; } }
  `;

  function renderHeader() {
    return `
      <div class="header">
        <img class="logo" src="${LOGO_URL}" alt="" onerror="this.style.display='none'"/>
        <div class="orderTitle">Ordre-ID: #${order.id}</div>
        <div class="dateLine">${dt.date} kl. ${dt.time}</div>
      </div>
    `;
  }

  function renderCustomerSlip() {
    return `
      <div class="sheet">
        ${renderHeader()}

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
        <div class="paymentBox">Betaling: ${paymentText}</div>
      </div>
    `;
  }

  function renderTechSlip() {
    return `
      <div class="sheet">
        ${renderHeader()}

        <div class="sectionTitle">Reparation</div>

        <!-- Adgangskode meget tydeligt, lige under Reparation -->
        <div class="passwordBox">Adgangskode: ${order.password || "—"}</div>

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

  // Skærmforhåndsvisning + knapper
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

const btnBlue = {
  background: "#2166AC", color: "#fff", border: 0, borderRadius: 8,
  padding: "8px 14px", cursor: "pointer", fontWeight: 700
};
const btnGrey = {
  background: "#f0f0f0", color: "#111", border: 0, borderRadius: 8,
  padding: "8px 14px", cursor: "pointer", fontWeight: 600
};
