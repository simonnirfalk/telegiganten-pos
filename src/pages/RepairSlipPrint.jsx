// src/pages/RepairPrintSlip.jsx
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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

  useEffect(() => {
    const t = setTimeout(() => window.print(), 120);
    return () => clearTimeout(t);
  }, []);

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

  return (
    <>
      <style>{`
        :root { color-scheme: light; }
        body { margin: 0; }
        .no-print { display: block; }

        .sheet {
          max-width: 80mm;         /* ret til jeres rullebredde */
          width: 100%;
          margin: 0 auto;
          padding: 8px 10px;
          box-sizing: border-box;
          background: #fff;
          color: #000;
          line-height: 1.35;
          font-family: Arial, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          font-size: 11px;

          /* undgå sideskift inde i et slip */
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

        /* Vis en skærekant på skærm – skjules ved print */
        .cutline { max-width: 80mm; margin: 6px auto; border-top: 1px dashed #d4d4d4; }
        @media print { .cutline { display: none; } }

        /* Sideskift-element: bliver til en ny side ved print */
        .page-break {
          height: 0;
        }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; padding: 6px 8px !important; }
          /* tving rigtigt sideskift mellem slips */
          .page-break { break-after: page; page-break-after: always; }
          /* sæt siden til label-bredde; højde automatisk pr. side */
          @page { size: 80mm auto; margin: 4mm; }  /* ret margin hvis nødvendigt */
        }
      `}</style>

      {/* =============== KUNDE-SLIP (side 1) =============== */}
      <div className="sheet">
        <div className="title">
          <div className="order">Ordre-ID: #{order.id}</div>
          <div className="date">{dt.date} kl. {dt.time}</div>
        </div>

        <div className="section">
          <strong>Kunde</strong>
          <div>{order.customer?.name || "-"}</div>
          <div>{order.customer?.phone || "-"}</div>
          <div className="muted">{order.customer?.email || "-"}</div>
        </div>

        <div className="section">
          <strong>Reparationer</strong>
          <table>
            <thead>
              <tr>
                <th>Enhed</th>
                <th>Reparation</th>
                <th className="tr">Pris</th>
                <th className="tr">Min</th>
              </tr>
            </thead>
            <tbody>
              {(order.repairs || []).map((r, i) => (
                <tr key={i}>
                  <td>{r.device}</td>
                  <td>{r.repair}</td>
                  <td className="tr">{Number(r.price || 0)} kr</td>
                  <td className="tr">{Number(r.time || 0)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="tr"><strong>{total} kr</strong></td>
                <td className="tr"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section">
          <div><strong>Adgangskode:</strong> {order.password || "-"}</div>
          <div><strong>Kontakt:</strong> {order.contact || "-"}</div>
          <div><strong>Note:</strong> {order.note || "-"}</div>
        </div>

        <div className="section">
          <strong>Betaling:</strong> {paymentText}
        </div>

        <div className="footer">
          Taastrup Hovedgade 66, 2630 Taastrup · Tlf: 70 70 78 56<br />
          info@telegiganten.dk · Man–Fre 10–18, Lør 10–14 <br />
          <p><strong>Husk din kvittering når du henter din reparation!</strong></p>
        </div>
      </div>

      {/* Sideskift til næste label (denne div bliver til et rigtigt page break) */}
      <div className="page-break" />

      {/* (valgfri) skærekant på skærm for at se adskillelsen */}
      <div className="cutline" />

      {/* =============== TECH-SLIP (side 2) =============== */}
      <div className="sheet">
        <div className="title">
          <div className="order">Ordre-ID: #{order.id}</div>
          <div className="date">{dt.date} kl. {dt.time}</div>
        </div>

        <div className="section">
          <strong>Reparation</strong>
          <table>
            <thead>
              <tr>
                <th>Enhed</th>
                <th>Reparation</th>
                <th className="tr">Pris</th>
                <th className="tr">Min</th>
              </tr>
            </thead>
            <tbody>
              {(order.repairs || []).map((r, i) => {
                const part = r.part || null;
                return (
                  <React.Fragment key={i}>
                    <tr>
                      <td>{r.device}</td>
                      <td>{r.repair}</td>
                      <td className="tr">{Number(r.price || 0)} kr</td>
                      <td className="tr">{Number(r.time || 0)}</td>
                    </tr>
                    {part ? (
                      <tr className="partRow">
                        <td colSpan={4}>
                          Reservedel: <strong>{part.model}</strong>
                          {part.location ? <span className="chip">{part.location}</span> : null}
                          {part.stock !== undefined && part.stock !== null && part.stock !== ""
                            ? <span className="chip">Lager: {part.stock}</span>
                            : null}
                        </td>
                      </tr>
                    ) : (
                      <tr className="partRow">
                        <td colSpan={4} className="muted">(ingen reservedel valgt)</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="tr"><strong>{total} kr</strong></td>
                <td className="tr"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section">
          <strong>Kunde</strong>
          <div>{order.customer?.name || "-"}</div>
          <div>{order.customer?.phone || "-"}</div>
          {order.contact ? <div>Kontakt: {order.contact}</div> : null}
          {order.note ? <div>Note: {order.note}</div> : null}
        </div>
      </div>

      {/* Skjules ved print */}
      <div className="no-print" style={{ display: "flex", gap: 8, maxWidth: 520, margin: "10px auto" }}>
        <button className="btn secondary" onClick={() => nav("/")}>Tilbage til dashboard</button>
        <button className="btn" onClick={() => window.print()}>Print igen</button>
      </div>
    </>
  );
}
