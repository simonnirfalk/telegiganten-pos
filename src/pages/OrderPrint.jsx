// src/pages/OrderPrint.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../data/apiClient";

const LOGO_URL = import.meta.env.VITE_PRINT_LOGO_URL || "/logo.png";

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

function formatDateOnly(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    return d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dt;
  }
}

function normalizeOrder(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id ?? raw.order_id ?? null;

  const price = Number(raw.price ?? 0) || 0;
  const deposit = Number(raw.deposit_amount ?? 0) || 0;

  // eta kan være ISO eller datetime-local string – begge kan Date() typisk læse
  const eta = raw.eta ?? null;

  return {
    id,
    item: raw.item ?? "",
    price,
    deposit_amount: deposit,
    remaining_amount: Math.max(price - deposit, 0),
    eta,
    payment_method: raw.payment_method ?? "depositum",
    status: raw.status ?? "open",
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    customer_name: raw.customer_name ?? "",
    customer_phone: raw.customer_phone ?? "",
    customer_email: raw.customer_email ?? "",
    note: raw.note ?? "",
  };
}

export default function OrderPrint() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getOrderById(id);
      setOrder(normalizeOrder(data));
    } catch (e) {
      console.error(e);
      setOrder(null);
    } finally {
      setLoading(false);
      // Print når data er klar
      setTimeout(() => window.print(), 250);
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
      <style>{printStyles}</style>

      <Slip order={order} copyLabel="Butikskopi" variant="shop" />
      <div className="pageBreak" />
      <Slip order={order} copyLabel="Kundekopi" variant="customer" />
    </div>
  );
}

function Slip({ order, copyLabel, variant }) {
  const created = useMemo(() => formatDateTime(order.created_at), [order.created_at]);

  const etaLine = useMemo(() => {
    if (!order.eta) return "—";
    // ofte vil du gerne have dato tydeligt, men stadig med tid hvis der er
    const dt = formatDateTime(order.eta);
    const dOnly = formatDateOnly(order.eta);
    return dt !== "—" ? dt : dOnly;
  }, [order.eta]);

  const paymentLine = useMemo(() => {
    const method = String(order.payment_method || "depositum").toLowerCase();
    if (method === "fuld" || method === "betalt") return "Betalt fuldt";
    if (method === "senere") return "Betales ved afhentning";
    return "Depositum";
  }, [order.payment_method]);

  const statusPretty = useMemo(() => {
    const s = String(order.status || "open").toLowerCase();
    if (s === "open") return "Åben";
    if (s === "awaiting") return "Afventer";
    if (s === "closed") return "Afsluttet";
    if (s === "cancelled" || s === "annulleret") return "Annulleret";
    return order.status || "Åben";
  }, [order.status]);

  return (
    <div className="sheet">
      <div className="topRow">
        <div className="brand">
          {LOGO_URL ? <img className="logo" src={LOGO_URL} alt="" /> : null}
          <div className="shopName">Telegiganten</div>
          <div className="shopMeta">Taastrup Hovedgade 66 · 2630 Taastrup · 70 70 78 56</div>
        </div>

        <div className="copyBox">
          <div className="copyLabel">{copyLabel}</div>
          <div className="docTitle">BESTILLING</div>
          <div className="orderId">ID: #{order.id}</div>
          <div className="createdAt">Oprettet: {created}</div>
        </div>
      </div>

      <div className="grid2">
        <div className="box">
          <div className="boxTitle">Kunde</div>
          <div className="line"><strong>Navn:</strong> {order.customer_name || "—"}</div>
          <div className="line"><strong>Tlf:</strong> {order.customer_phone || "—"}</div>
          <div className="line"><strong>Email:</strong> {order.customer_email || "—"}</div>
        </div>

        <div className="box">
          <div className="boxTitle">Bestilling</div>
          <div className="line"><strong>Forventet klar:</strong> {etaLine}</div>
          <div className="line"><strong>Betaling:</strong> {paymentLine}</div>
          <div className="line"><strong>Status:</strong> {statusPretty}</div>
        </div>
      </div>

      <div className="box">
        <div className="boxTitle">Vare</div>
        <div className="itemRow">
          <div className="itemName">{order.item || "—"}</div>
          <div className="itemPrice">{formatCurrency(order.price)}</div>
        </div>

        <div className="totals">
          <div className="totRow">
            <span>Depositum</span>
            <span>{formatCurrency(order.deposit_amount)}</span>
          </div>
          <div className="totRow strong">
            <span>Rest ved afhentning</span>
            <span>{formatCurrency(order.remaining_amount)}</span>
          </div>
        </div>
      </div>

      {/* Checkliste + interne felter */}
      <div className="grid2">
        <div className="box">
          <div className="boxTitle">Checkliste</div>
          <div className="checks">
            <label className="check"><span className="cb" /> Bestilt</label>
            <label className="check"><span className="cb" /> Modtaget</label>
            <label className="check"><span className="cb" /> SMS sendt</label>
            <label className="check"><span className="cb" /> Klar til afhentning</label>
            <label className="check"><span className="cb" /> Afhentet</label>
            <label className="check"><span className="cb" /> Annulleret</label>
          </div>

          <div className="signRow">
            <div>
              <div className="smallLabel">Medarbejder</div>
              <div className="lineBlank" />
            </div>
            <div>
              <div className="smallLabel">Underskrift</div>
              <div className="lineBlank" />
            </div>
          </div>
        </div>

        <div className="box">
          <div className="boxTitle">{variant === "customer" ? "Bemærkning" : "Bemærkning / interne noter"}</div>
          <div className="noteArea">{order.note ? order.note : "—"}</div>

          {variant === "shop" ? (
            <>
              <div className="smallLabel" style={{ marginTop: 10 }}>Internt (lager/leverandør)</div>
              <div className="noteArea noteAreaSmall" />
            </>
          ) : null}
        </div>
      </div>

      <div className="footer">
        <div><strong>Husk at medbringe denne seddel ved afhentning.</strong></div>
        <div className="footerSmall">
          Telegiganten · Taastrup Hovedgade 66 · 2630 Taastrup · Tlf. 70 70 78 56 · info@telegiganten.dk
        </div>
      </div>
    </div>
  );
}

const printStyles = `
  html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }

  .pageBreak { page-break-after: always; }

  /* A4-ish slip */
  .sheet {
    width: 210mm;
    min-height: 297mm;
    padding: 14mm 14mm;
    margin: 0 auto;
    color: #111;
  }

  .topRow {
    display: flex;
    justify-content: space-between;
    gap: 12mm;
    align-items: flex-start;
    margin-bottom: 10mm;
  }

  .brand .logo { height: 18px; display: block; margin-bottom: 6px; }
  .brand .shopName { font-weight: 800; font-size: 18px; margin-bottom: 2px; }
  .brand .shopMeta { font-size: 12px; color: #444; }

  .copyBox {
    border: 2px solid #111;
    padding: 10px 12px;
    min-width: 72mm;
    text-align: right;
  }
  .copyLabel { font-weight: 800; font-size: 12px; letter-spacing: .5px; }
  .docTitle { font-weight: 900; font-size: 22px; margin-top: 4px; }
  .orderId { font-weight: 800; font-size: 14px; margin-top: 2px; }
  .createdAt { font-size: 12px; color: #333; margin-top: 4px; }

  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8mm;
    margin-bottom: 8mm;
  }

  .box {
    border: 1px solid #ddd;
    padding: 10px 12px;
  }
  .boxTitle {
    font-weight: 800;
    font-size: 12px;
    letter-spacing: .4px;
    text-transform: uppercase;
    margin-bottom: 8px;
    color: #111;
  }

  .line { font-size: 13px; margin: 3px 0; }

  .itemRow {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0 10px;
    border-bottom: 1px dashed #bbb;
  }
  .itemName { font-weight: 800; font-size: 14px; }
  .itemPrice { font-weight: 800; font-size: 14px; }

  .totals { padding-top: 10px; }
  .totRow {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin: 4px 0;
  }
  .totRow.strong { font-weight: 900; font-size: 14px; margin-top: 6px; }

  .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .cb { width: 14px; height: 14px; border: 2px solid #111; display: inline-block; }

  .signRow {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10mm;
    margin-top: 10mm;
  }
  .smallLabel { font-size: 11px; color: #444; margin-bottom: 4px; }
  .lineBlank { border-bottom: 2px solid #111; height: 16px; }

  .noteArea {
    min-height: 34mm;
    border: 1px dashed #bbb;
    padding: 8px;
    font-size: 13px;
    white-space: pre-wrap;
  }
  .noteAreaSmall { min-height: 18mm; }

  .footer { margin-top: 10mm; text-align: center; }
  .footerSmall { margin-top: 4px; font-size: 11px; color: #444; }

  @media print {
    @page { size: A4; margin: 0; }
  }
`;

