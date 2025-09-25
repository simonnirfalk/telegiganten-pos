// src/pages/OrderPrint.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../data/apiClient";

function formatCurrency(n) {
  const val = Number(n ?? 0);
  return `${val.toLocaleString("da-DK")} kr.`;
}
function formatDateTime(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    return d.toLocaleString("da-DK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

export default function OrderPrint() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getOrderById(id);
      setOrder(data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      // Åbn printdialog når data er klar
      setTimeout(() => window.print(), 300);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Henter…</div>;
  if (!order) return <div style={{ padding: 20 }}>Bestilling ikke fundet.</div>;

  return (
    <div>
      <style>{`
        @media print {
          .page { page-break-after: always; }
        }
        body { background: #fff !important; }
      `}</style>

      <Receipt order={order} copyLabel="Butikskopi" />
      <div className="page" />
      <Receipt order={order} copyLabel="Kundekopi" />
    </div>
  );
}

function Receipt({ order, copyLabel }) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Bestillingskvittering</h2>
        <div style={{ fontWeight: 700 }}>{copyLabel}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Telegiganten</strong><br />
        Taastrup hovedgade 66, 2630 Taastrup<br />
        CVR: —<br />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <strong>Kunde</strong><br />
          {order.customer_name || "—"}<br />
          {order.customer_phone || ""}{order.customer_phone && order.customer_email ? " • " : ""}{order.customer_email || ""}
        </div>
        <div>
          <strong>Bestilling</strong><br />
          ID: {order.id ?? order.order_id}<br />
          Oprettet: {formatDateTime(order.created_at)}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 0" }}>Vare</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 0" }}>Pris</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "6px 0" }}>{order.item}</td>
            <td style={{ textAlign: "right", padding: "6px 0" }}>{formatCurrency(order.price)}</td>
          </tr>
        </tbody>
        <tfoot>
          {order.deposit_amount ? (
            <tr>
              <td style={{ paddingTop: 8, fontWeight: 700 }}>Depositum</td>
              <td style={{ textAlign: "right", paddingTop: 8, fontWeight: 700 }}>
                {formatCurrency(order.deposit_amount)}
              </td>
            </tr>
          ) : null}
          <tr>
            <td style={{ paddingTop: 8, fontWeight: 700 }}>Rest ved afhentning</td>
            <td style={{ textAlign: "right", paddingTop: 8, fontWeight: 700 }}>
              {formatCurrency((order.price || 0) - (order.deposit_amount || 0))}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginBottom: 12 }}>
        <strong>Forventet klar:</strong> {order.eta ? formatDateTime(order.eta) : "—"}
      </div>

      {order.note ? (
        <div style={{ marginTop: 10 }}>
          <strong>Bemærkning:</strong>
          <div style={{ whiteSpace: "pre-wrap" }}>{order.note}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 24, fontSize: 13, color: "#555" }}>
        Medarbejderens underskrift: ______________________
      </div>
    </div>
  );
}
