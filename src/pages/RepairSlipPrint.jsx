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

  useEffect(() => {
    // auto-print når siden er klar
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
      {/* Minimal, robust print CSS – kun for kvitteringen */}
      <style>{`
        :root { color-scheme: light; }
        body { margin: 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
        }
        .print-sheet {
          max-width: 80mm; /* skift til 58mm hvis det er din rulle */
          width: 100%;
          margin: 0 auto;
          padding: 12px;
          box-sizing: border-box;
          background: #fff;
          color: #000;
          line-height: 1.35;
          font-family: Arial, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          font-size: 12px;
        }
        .brand { font-weight: 700; font-size: 16px; margin: 0 0 8px 0; }
        .muted { color: #555; }
        .hr { border-top: 1px dashed #ccc; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 0; border-bottom: 1px solid #eee; text-align: left; }
        .tr { text-align: right; }
        .btn {
          background: #2166AC; color: #fff; border: 0; border-radius: 6px;
          padding: 8px 14px; cursor: pointer;
        }
        .btn.secondary { background: #f0f0f0; color: #333; }
        @media print {
          .print-sheet { box-shadow: none !important; margin: 0 !important; padding: 8px !important; }
          @page { size: auto; margin: 4mm; }
        }
      `}</style>

      <div className="print-sheet">
        <div className="row">
          <h1 className="brand">Telegiganten</h1>
          <div className="muted" style={{ textAlign: "right" }}>
            Ordre-ID: #{order.id}<br />
            Dato: {order.today || new Date().toLocaleDateString("da-DK")}
          </div>
        </div>

        <div className="muted" style={{ marginBottom: 8 }}>
          Taastrup Hovedgade 66, 2630 Taastrup · Tlf: 70 70 78 56<br />
          info@telegiganten.dk · Man–Fre 10–18, Lør 10–14
        </div>

        <div className="hr" />

        <strong>Kunde</strong>
        <div>{order.customer?.name || "-"}</div>
        <div>{order.customer?.phone || "-"}</div>
        <div className="muted">{order.customer?.email || "-"}</div>

        <div className="hr" />

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

        <div className="hr" />

        <div><strong>Adgangskode:</strong> {order.password || "-"}</div>
        <div><strong>Note:</strong> {order.note || "-"}</div>

        <div className="hr" />

        <div><strong>Betaling:</strong> {paymentText}</div>

        {/* Skjules ved print */}
        <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn secondary" onClick={() => nav("/")}>Tilbage til dashboard</button>
          <button className="btn" onClick={() => window.print()}>Print igen</button>
        </div>
      </div>
    </>
  );
}
