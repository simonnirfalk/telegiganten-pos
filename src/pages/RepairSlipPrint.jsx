// src/pages/RepairSlipPrint.jsx
import React, { useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/**
 * Printer to *separate* jobs via HIDDEN IFRAMES:
 *  1) Kundeslip (samler alle linjer)
 *  2) Techslip (samler alle linjer)
 *
 * - Ingen window.open() → ingen blanke popups
 * - Guard mod React StrictMode (kører én gang)
 * - onafterprint + fallback-timeout mellem jobs, så de ikke klumper sammen
 */

const LABEL_WIDTH_MM = 80;
const LOGO_URL = import.meta.env.VITE_PRINT_LOGO_URL || "/logo.png";

export default function RepairSlipPrint() {
  const nav = useNavigate();
  const { orderId } = useParams();
  const location = useLocation();
  const startedRef = useRef(false); // StrictMode guard

  // Order via route state; fallback til localStorage
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

  // Fælles styles
  const styles = `
    html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
    .sheet { max-width: ${LABEL_WIDTH_MM}mm; margin: 0 auto; padding: 8px; font-size: 14px; line-height: 1.35; page-break-inside: avoid; break-inside: avoid; }
    .center { text-align: center; }
    .logo { height: 18px; display:block; margin:0 auto 4px; }
    .orderTitle { font-weight: 800; font-size: 16px; margin: 2px 0; }
    .dateLine { font-size: 12px; }
    .title { font-weight: 700; font-size: 12px; margin: 8px 0 4px; }
    .hr { border-top: 2px solid #000; margin: 6px 0; }
    .item { margin: 6px 0; page-break-inside: avoid; break-inside: avoid; }
    .row1 { font-weight: 700; }
    .row2 { margin-top: 3px; font-size: 13px; }
    .password { font-weight: 800; text-align: center; margin: 6px 0; padding: 4px 0; }
    .total { font-weight: 800; display: flex; justify-content: space-between; }
    .payment { margin-top: 4px; }
    .info { font-size: 13px; margin-top: 6px; }
    .footer { margin-top: 8px; text-align: center; font-size: 12px; }
    @media print { @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 3mm; } }
  `;

  // BODY for kundeslip – ALLE linjer
  const bodyCustomer = useMemo(() => `
    <div class="sheet">
      <div class="center">
        ${LOGO_URL ? `<img class="logo" src="${LOGO_URL}" alt="" />` : ""}
        <div class="orderTitle">Ordre-ID: #${order?.id ?? orderId ?? ""}</div>
        <div class="dateLine">${dt.date} kl. ${dt.time}</div>
      </div>

      <div class="title">Kunde</div>
      <div>${order?.customer?.name || "-"}</div>
      <div>${order?.customer?.phone || "-"}</div>
      <div>${order?.customer?.email || "-"}</div>
      <div class="hr"></div>

      <div class="title">Reparationer</div>
      ${(order?.repairs || []).map((r) => `
        <div class="item">
          <div class="row1">${r.device || ""} — ${r.repair || ""}</div>
          <div class="row2">Pris: ${Number(r.price||0)} kr · Forventet tid: ${Number(r.time||0)} min</div>
        </div>
      `).join("")}

      <div class="hr"></div>
      <div class="total"><span>Total</span><span>${total} kr</span></div>
      <div class="hr"></div>
      <div class="payment">Betaling: ${paymentText}</div>

      <div class="hr"></div>
      <div class="info">
        <div><strong>Adgangskode:</strong> ${order?.password || "—"}</div>
        <div><strong>Kontakt:</strong> ${order?.contact || "—"}</div>
        <div><strong>Note:</strong> ${order?.note || "—"}</div>
      </div>

      <div class="footer">
        Taastrup Hovedgade 66, 2630 Taastrup · Tlf: 70 70 78 56 · info@telegiganten.dk<br/>
        Man–Fre 10–18, Lør 10–14 — <strong>Husk din kvittering når du henter!</strong>
      </div>
    </div>
  `, [order, orderId, dt, total, paymentText]);

  // BODY for techslip – ALLE linjer
  const bodyTech = useMemo(() => `
    <div class="sheet">
      <div class="center">
        <div class="title" style="letter-spacing:1px;text-transform:uppercase;">TECH SLIP</div>
        <div class="orderTitle">Ordre-ID: #${order?.id ?? orderId ?? ""}</div>
        <div class="dateLine">${dt.date} kl. ${dt.time}</div>
      </div>

      <div class="title">Adgangskode</div>
      <div class="password">${order?.password || "—"}</div>

      <div class="hr"></div>
      <div class="title">Reparationer</div>
      ${(order?.repairs || []).map((r) => {
        const partBits = r.part ? [
          r.part.model || "",
          r.part.location || "",
          (r.part.stock ?? "") !== "" ? ("Lager: " + r.part.stock) : ""
        ].filter(Boolean).join(" · ") : "";
        return `
          <div class="item">
            <div class="row1">${r.device || ""} — ${r.repair || ""}</div>
            <div class="row2">Pris: ${Number(r.price||0)} kr · Tid: ${Number(r.time||0)} min</div>
            ${r.part ? `<div class="row2">Reservedel: ${partBits}</div>` : `<div class="row2" style="opacity:.7">(ingen reservedel valgt)</div>`}
          </div>
        `;
      }).join("")}

      <div class="hr"></div>
      <div class="total"><span>Total</span><span>${total} kr</span></div>
    </div>
  `, [order, orderId, dt, total]);

  // Pak body ind i komplet HTML-dokument
  const makeDoc = (bodyHtml) =>
    `<!doctype html><html><head><meta charset="utf-8"/><title>Print</title><style>${styles}</style></head><body>${bodyHtml}</body></html>`;

  // Print via hidden iframe — returnerer når printdialogen er lukket (eller timeout)
  function printHtmlViaIframe(html) {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "-10000px";
      iframe.style.bottom = "-10000px";
      iframe.width = "0";
      iframe.height = "0";
      document.body.appendChild(iframe);

      const done = () => {
        try { document.body.removeChild(iframe); } catch {}
        resolve();
      };

      const runPrint = () => {
        try {
          const w = iframe.contentWindow;
          // sikkerhedsnet: afslut hvis onafterprint aldrig skyder
          let finished = false;
          const finish = () => { if (finished) return; finished = true; done(); };

          // nogle browsere skyder onafterprint, andre ikke → vi har fallback
          if (w) {
            w.onafterprint = () => finish();
            w.focus();
            w.print();
            setTimeout(finish, 1500);
          } else {
            finish();
          }
        } catch {
          done();
        }
      };

      // Forsøg srcdoc først (hurtigst). Fald tilbage til document.write hvis ikke understøttet.
      try {
        iframe.onload = () => setTimeout(runPrint, 80);
        if ("srcdoc" in iframe) {
          iframe.srcdoc = html;
        } else {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          doc.open(); doc.write(html); doc.close();
        }
      } catch {
        // sidste fallback
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          doc.open(); doc.write(html); doc.close();
          setTimeout(runPrint, 120);
        } catch {
          done();
        }
      }
    });
  }

  async function startPrinting() {
    if (!order) return;
    // To *separate* jobs i rækkefølge
    await printHtmlViaIframe(makeDoc(bodyCustomer));
    await printHtmlViaIframe(makeDoc(bodyTech));
  }

  useEffect(() => {
    if (startedRef.current) return;        // StrictMode guard
    startedRef.current = true;
    startPrinting();
  }, []);

  if (!order) {
    return (
      <div style={{ maxWidth: 600, margin: "1rem auto", padding: "0 12px" }}>
        <h3>Der er ingen ordredata at printe.</h3>
        <button onClick={() => nav("/")}>Tilbage</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "1rem auto", padding: "0 12px" }}>
      <h3>Udskriver kvitteringer…</h3>
      <p>Hvis der ikke sker noget, klik “Print igen”. (Nogle browsere kræver brugerklik.)</p>
      <button onClick={() => nav("/")}>Tilbage</button>
      <button onClick={startPrinting}>Print igen</button>
    </div>
  );
}
