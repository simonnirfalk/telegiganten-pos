// src/pages/RepairPrintSlip.jsx
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const LABEL_WIDTH_MM = 80;
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

  const baseStyles = `
    html, body {
      margin: 0; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
    .sheet {
      max-width: ${LABEL_WIDTH_MM}mm;
      margin: 0 auto;
      padding: 8px;
      font-size: 14px;
      line-height: 1.35;
    }
    .header-cus { text-align: center; margin-bottom: 6px; }
    .header-cus img { height: 18px; display:block; margin:0 auto 4px; }
    .orderTitle { font-weight: 800; font-size: 16px; margin: 2px 0; }
    .dateLine { font-size: 12px; }
    .header-tech { text-align: center; margin-bottom: 6px; }
    .techTitle { font-weight: 900; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    .techOrder { font-weight: 800; font-size: 16px; margin-top: 2px; }
    .sectionTitle { font-weight: 700; font-size: 12px; margin: 8px 0 4px; }
    .hr { border-top: 2px solid #000; margin: 6px 0; }
    .repairItem { margin: 6px 0; }
    .repRow1 { font-weight: 700; }
    .repRow2 { margin-top: 3px; font-size: 13px; }
    .passwordBox { font-weight: 800; text-align: center; margin: 6px 0; padding: 4px 0; }
    .totalLine { font-weight: 800; display: flex; justify-content: space-between; }
    .paymentLine { margin-top: 4px; }
    .infoBox { font-size: 13px; margin-top: 6px; }
    .footer { margin-top: 8px; text-align: center; font-size: 12px; }
    @media print { @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 3mm; } }
  `;

  const renderCustomerSlip = () => `
    <div class="sheet">
      <div class="header-cus">
        ${LOGO_URL ? `<img src="${LOGO_URL}" alt="" />` : ""}
        <div class="orderTitle">Ordre-ID: #${order.id}</div>
        <div class="dateLine">${dt.date} kl. ${dt.time}</div>
      </div>

      <div class="sectionTitle">Kunde</div>
      <div>${order.customer?.name || "-"}</div>
      <div>${order.customer?.phone || "-"}</div>
      <div>${order.customer?.email || "-"}</div>
      <div class="hr"></div>

      <div class="sectionTitle">Reparationer</div>
      ${(order.repairs || []).map((r) => `
        <div class="repairItem">
          <div class="repRow1">${r.device || ""} — ${r.repair || ""}</div>
          <div class="repRow2">Pris: ${Number(r.price||0)} kr · Tid: ${Number(r.time||0)} min</div>
        </div>
      `).join("")}

      <div class="hr"></div>
      <div class="totalLine"><span>Total</span><span>${total} kr</span></div>
      <div class="hr"></div>
      <div class="paymentLine">Betaling: ${paymentText}</div>

      <div class="hr"></div>
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

  const renderTechSlip = () => `
    <div class="sheet">
      <div class="header-tech">
        <div class="techTitle">TECH SLIP</div>
        <div class="techOrder">Ordre-ID: #${order.id}</div>
        <div class="dateLine">${dt.date} kl. ${dt.time}</div>
      </div>

      <div class="sectionTitle">Reparation</div>
      <div class="hr"></div>
      <div class="passwordBox">Adgangskode: ${order.password || "—"}</div>
      <div class="hr"></div>

      ${(order.repairs || []).map((r) => `
        <div class="repairItem">
          <div class="repRow1">${r.device || ""} — ${r.repair || ""}</div>
          <div class="repRow2">Pris: ${Number(r.price||0)} kr · Tid: ${Number(r.time||0)} min</div>
          ${r.part ? `<div>Reservedel: ${r.part.model || "-"} ${r.part.location || ""}</div>` : `<div>(ingen reservedel valgt)</div>`}
        </div>
      `).join("")}

      <div class="hr"></div>
      <div class="totalLine"><span>Total</span><span>${total} kr</span></div>
      <div class="paymentLine">Betaling: ${paymentText}</div>
      <div class="hr"></div>

      <div class="sectionTitle">Kunde</div>
      <div>${order.customer?.name || "-"}</div>
      <div>${order.customer?.phone || "-"}</div>
      ${order.contact ? `<div>Kontakt: ${order.contact}</div>` : ""}
      ${order.note ? `<div>Note: ${order.note}</div>` : ""}
    </div>
  `;

  const printTwoJobs = async () => {
    const w = window.open("", "tg-print", "width=460,height=700");
    if (!w) return;
    const writeAndPrint = (innerHTML) => new Promise((resolve) => {
      w.document.open();
      w.document.write(`<!doctype html><html><head><style>${baseStyles}</style></head><body>${innerHTML}</body></html>`);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); resolve(); }, 150);
    });
    await writeAndPrint(renderCustomerSlip());
    await writeAndPrint(renderTechSlip());
    setTimeout(() => { try { w.close(); } catch {} }, 300);
  };

  useEffect(() => { if (order) printTwoJobs(); }, []); // eslint-disable-line

  return (
    <div style={{ maxWidth: 600, margin: "1rem auto", padding: "0 12px" }}>
      <h3>Udskriver kvitteringer…</h3>
      <button onClick={() => nav("/")}>Tilbage</button>
      <button onClick={printTwoJobs}>Print igen</button>
    </div>
  );
}
