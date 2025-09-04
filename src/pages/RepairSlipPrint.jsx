// src/pages/RepairPrintSlip.jsx
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/** Sæt til false hvis du VIL bruge ét printjob med CSS page-break (ikke anbefalet til continuous rolls) */
const SEPARATE_PRINT_JOBS = true;

/** Label-bredde i mm (ret hvis jeres rulle er anden bredde) */
const LABEL_WIDTH_MM = 80;

export default function RepairSlipPrint() {
  const nav = useNavigate();
  const { orderId } = useParams();
  const location = useLocation();

  const order =
    location.state?.order ||
    (() => {
      try {
        const raw = localStorage.getItem("tg_last_order");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

  const total = useMemo(
    () => (order?.repairs || []).reduce((s, r) => s + (Number(r.price) || 0), 0),
    [order]
  );

  const dt = useMemo(() => {
    const d = order?.created_at ? new Date(order.created_at) : new Date();
    const date = d.toLocaleDateString("da-DK");
    const time = d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
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

  // ---------- PRINT HJÆLPERE (separate jobs via iframe) ----------
  function buildStyles(extra = "") {
    return `
      :root { color-scheme: light; }
      html, body { margin: 0; background: #fff; }
      .sheet {
        max-width: ${LABEL_WIDTH_MM}mm;
        width: 100%;
        margin: 0 auto;
        padding: 8px 10px;
        box-sizing: border-box;
        background: #fff;
        color: #000;
        line-height: 1.35;
        font-family: Arial, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        font-size: 11px;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .title { text-align: center; margin: 0 0 6px 0; }
      .title .order { font-size: 14px; font-weight: 700; }
      .title .date { font-size: 11px; color: #444; margin-top: 2px; }
      .section { margin-top: 8px; }
      .muted { color: #555; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 4px 0; border-bottom: 1px solid #eee; text-align: left; }
      th { font-weight: 700; }
      .tr { text-align: right; }
      .partRow { font-size: 10px; color: #334155; }
      .chip { display: inline-block; padding: 1px 6px; border-radius: 10px; background: #f1f5f9; margin-left: 6px; }
      .footer { margin-top: 8px; text-align: center; color: #444; font-size: 10px; }
      @media print {
        @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 4mm; }
      }
      ${extra}
    `;
  }

  function renderCustomerSlip() {
    return `
      <div class="sheet">
        <div class="title">
          <div class="order">Ordre-ID: #${order.id}</div>
          <div class="date">${dt.date} kl. ${dt.time}</div>
        </div>

        <div class="section">
          <strong>Kunde</strong>
          <div>${order.customer?.name || "-"}</div>
          <div>${order.customer?.phone || "-"}</div>
          <div class="muted">${order.customer?.email || "-"}</div>
        </div>

        <div class="section">
          <strong>Reparationer</strong>
          <table>
            <thead>
              <tr>
                <th>Enhed</th>
                <th>Reparation</th>
                <th class="tr">Pris</th>
                <th class="tr">Min</th>
              </tr>
            </thead>
            <tbody>
              ${(order.repairs || [])
                .map(r => `
                  <tr>
                    <td>${r.device}</td>
                    <td>${r.repair}</td>
                    <td class="tr">${Number(r.price || 0)} kr</td>
                    <td class="tr">${Number(r.time || 0)}</td>
                  </tr>`).join("")}
              <tr>
                <td colspan="2"><strong>Total</strong></td>
                <td class="tr"><strong>${total} kr</strong></td>
                <td class="tr"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div><strong>Adgangskode:</strong> ${order.password || "-"}</div>
          <div><strong>Kontakt:</strong> ${order.contact || "-"}</div>
          <div><strong>Note:</strong> ${order.note || "-"}</div>
        </div>

        <div class="section">
          <strong>Betaling:</strong> ${paymentText}
        </div>

        <div class="footer">
          Taastrup Hovedgade 66, 2630 Taastrup · Tlf: 70 70 78 56<br/>
          info@telegiganten.dk · Man–Fre 10–18, Lør 10–14 <br/>
          <p><strong>Husk din kvittering når du henter din reparation!</strong></p>
        </div>
      </div>
    `;
  }

  function renderTechSlip() {
    const rows = (order.repairs || []).map(r => {
      const part = r.part || null;
      return `
        <tr>
          <td>${r.device}</td>
          <td>${r.repair}</td>
          <td class="tr">${Number(r.price || 0)} kr</td>
          <td class="tr">${Number(r.time || 0)}</td>
        </tr>
        ${part
          ? `<tr class="partRow">
               <td colspan="4">
                 Reservedel: <strong>${part.model || "-"}</strong>
                 ${part.location ? `<span class="chip">${part.location}</span>` : ""}
                 ${(part.stock ?? "") !== "" ? `<span class="chip">Lager: ${part.stock}</span>` : ""}
               </td>
             </tr>`
          : `<tr class="partRow"><td colspan="4" class="muted">(ingen reservedel valgt)</td></tr>`
        }
      `;
    }).join("");

    return `
      <div class="sheet">
        <div class="title">
          <div class="order">Ordre-ID: #${order.id}</div>
          <div class="date">${dt.date} kl. ${dt.time}</div>
        </div>

        <div class="section">
          <strong>Reparation</strong>
          <table>
            <thead>
              <tr>
                <th>Enhed</th>
                <th>Reparation</th>
                <th class="tr">Pris</th>
                <th class="tr">Min</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr>
                <td colspan="2"><strong>Total</strong></td>
                <td class="tr"><strong>${total} kr</strong></td>
                <td class="tr"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <strong>Kunde</strong>
          <div>${order.customer?.name || "-"}</div>
          <div>${order.customer?.phone || "-"}</div>
          ${order.contact ? `<div>Kontakt: ${order.contact}</div>` : ""}
          ${order.note ? `<div>Note: ${order.note}</div>` : ""}
        </div>
      </div>
    `;
  }

  function printHTMLInIframe(html) {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      // Når indholdet er klar, print og fjern iframe
      const doPrint = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // nogle browsere fyrer 'afterprint', andre gør ikke – giv lille buffer
        const cleanup = () => {
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve();
          }, 100);
        };
        if ("onafterprint" in iframe.contentWindow) {
          iframe.contentWindow.addEventListener("afterprint", cleanup, { once: true });
        } else {
          cleanup();
        }
      };

      // Vent et øjeblik for fonts/layout
      setTimeout(doPrint, 150);
    });
  }

  function buildHTML(bodyHTML) {
    const styles = buildStyles();
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Print</title>
          <style>${styles}</style>
        </head>
        <body>
          ${bodyHTML}
        </body>
      </html>
    `;
  }

  useEffect(() => {
    if (!order) return;

    if (SEPARATE_PRINT_JOBS) {
      // 1) print kundeslip, 2) print techslip (to FYSISKE printjobs => printeren skærer imellem)
      (async () => {
        await printHTMLInIframe(buildHTML(renderCustomerSlip()));
        // lille pause for at printer-driver kan registrere job-skift
        setTimeout(async () => {
          await printHTMLInIframe(buildHTML(renderTechSlip()));
        }, 250);
      })();
    } else {
      // fallback: én side med page-break (kan fejle på continuous roll)
      setTimeout(() => window.print(), 120);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) {
    return (
      <div style={{ padding: 24 }}>
        <p>Kunne ikke finde data for ordren.</p>
        <button
          className="no-print"
          onClick={() => nav("/")}
          style={{
            background: "#2166AC",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Tilbage til dashboard
        </button>
      </div>
    );
  }

  // En simpel forhåndsvisning på skærm (ikke nødvendig for at printe)
  return (
    <div style={{ maxWidth: 600, margin: "12px auto", padding: "0 12px" }}>
      <h3>Udskriver kvitteringer …</h3>
      <p className="no-print" style={{ color: "#555" }}>
        Denne side sender to print-jobs: først kundeslip og derefter techslip. Sørg for at din labelprinter har
        “Auto cut between jobs/pages” slået til i driveren.
      </p>
      <div style={{ borderTop: "1px dashed #ddd", margin: "12px 0" }} />
      <div dangerouslySetInnerHTML={{ __html: renderCustomerSlip() }} />
      <div style={{ borderTop: "1px dashed #ddd", margin: "12px 0" }} />
      <div dangerouslySetInnerHTML={{ __html: renderTechSlip() }} />
    </div>
  );
}
