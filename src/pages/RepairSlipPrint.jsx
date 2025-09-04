// src/pages/RepairPrintSlip.jsx
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const LABEL_WIDTH_MM = 80; // ret hvis rullebredde er anderledes

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

  if (!order) {
    return (
      <div style={{ padding: 24 }}>
        <p>Kunne ikke finde data for ordren.</p>
        <button
          className="no-print"
          onClick={() => nav("/")}
          style={{ background: "#2166AC", color: "#fff", border: 0, borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}
        >
          Tilbage til dashboard
        </button>
      </div>
    );
  }

  const paymentText = (() => {
    const m = order.payment?.method || "efter";
    if (m === "garanti") return "Garanti (ingen betaling)";
    if (m === "betalt") return `Betalt: ${total} kr`;
    if (m === "depositum") {
      const up = Number(order.payment?.upfront || 0);
      const rest = Math.max(total - up, 0);
      return `Depositum: ${up} kr — Mangler: ${rest} kr`;
    }
    return `Betaling efter reparation: ${total} kr`;
  })();

  // ---------- HTML builders ----------
  const baseStyles = `
    :root { color-scheme: light; }
    html, body { margin: 0; background: #fff; }
    .sheet {
      max-width: ${LABEL_WIDTH_MM}mm; width: 100%; margin: 0 auto;
      padding: 8px 10px; box-sizing: border-box; background: #fff; color: #000;
      line-height: 1.35; font-family: Arial, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 11px;
      break-inside: avoid-page; page-break-inside: avoid;
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
    @media print { @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 4mm; } }
  `;

  const renderCustomerSlip = () => `
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
            <tr><th>Enhed</th><th>Reparation</th><th class="tr">Pris</th><th class="tr">Min</th></tr>
          </thead>
          <tbody>
            ${(order.repairs || []).map(r => `
              <tr>
                <td>${r.device}</td>
                <td>${r.repair}</td>
                <td class="tr">${Number(r.price || 0)} kr</td>
                <td class="tr">${Number(r.time || 0)}</td>
              </tr>`).join("")}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="tr"><strong>${total} kr</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="section">
        <div><strong>Adgangskode:</strong> ${order.password || "-"}</div>
        <div><strong>Kontakt:</strong> ${order.contact || "-"}</div>
        <div><strong>Note:</strong> ${order.note || "-"}</div>
      </div>
      <div class="section"><strong>Betaling:</strong> ${paymentText}</div>
      <div class="footer">
        Taastrup Hovedgade 66, 2630 Taastrup · Tlf: 70 70 78 56<br/>
        info@telegiganten.dk · Man–Fre 10–18, Lør 10–14<br/>
        <p><strong>Husk din kvittering når du henter din reparation!</strong></p>
      </div>
    </div>
  `;

  const renderTechSlip = () => {
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
              <tr><th>Enhed</th><th>Reparation</th><th class="tr">Pris</th><th class="tr">Min</th></tr>
            </thead>
            <tbody>
              ${rows}
              <tr>
                <td colspan="2"><strong>Total</strong></td>
                <td class="tr"><strong>${total} kr</strong></td>
                <td></td>
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
  };

  // Print to separate jobs by reusing the SAME popup and waiting for afterprint
  const printTwoJobs = async () => {
    // åbner et tomt vindue (bedre kompatibilitet end iframe)
    const w = window.open("", "tg-print", "width=400,height=600");
    if (!w) {
      alert("Popup blokeret – tillad popups for at printe.");
      return;
    }

    // hjælper: skriv html og print, returnerer et løfte der resolves ved afterprint
    const writeAndPrint = (innerHTML) =>
      new Promise((resolve) => {
        w.document.open();
        w.document.write(`
          <!doctype html>
          <html><head>
            <meta charset="utf-8"/>
            <title>Print</title>
            <style>${baseStyles}</style>
          </head>
          <body>${innerHTML}</body></html>
        `);
        w.document.close();

        // Vent et øjeblik for layout før print
        setTimeout(() => {
          const onAfter = () => {
            w.removeEventListener("afterprint", onAfter);
            resolve();
          };
          // nogle browsere bruger window i stedet for document
          w.addEventListener("afterprint", onAfter);
          w.focus();
          w.print();
        }, 150);
      });

    try {
      await writeAndPrint(renderCustomerSlip()); // job #1
      await writeAndPrint(renderTechSlip());     // job #2
    } finally {
      // luk vinduet lidt efter, så driver kan nå at oprette job #2
      setTimeout(() => { try { w.close(); } catch {} }, 300);
    }
  };

  useEffect(() => {
    printTwoJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lille skærm-forhåndsvisning og “print igen”-knap
  return (
    <div style={{ maxWidth: 600, margin: "12px auto", padding: "0 12px" }}>
      <h3>Udskriver to separate kvitteringer…</h3>
      <p style={{ color: "#555" }}>
        Hvis kun én kommer ud: slå pop-up blokering fra, og tænd “Auto cut between jobs/pages” i printer-driveren.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => nav("/")} style={{ background: "#f0f0f0", border: 0, borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}>
          Tilbage
        </button>
        <button onClick={printTwoJobs} style={{ background: "#2166AC", color: "#fff", border: 0, borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}>
          Print begge slips igen
        </button>
      </div>

      <div dangerouslySetInnerHTML={{ __html: renderCustomerSlip() }} />
      <div style={{ borderTop: "1px dashed #ddd", margin: "12px 0" }} />
      <div dangerouslySetInnerHTML={{ __html: renderTechSlip() }} />
    </div>
  );
}
