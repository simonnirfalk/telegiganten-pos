// src/pages/RepairSlipPrint.jsx
import React, { useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const LABEL_WIDTH_MM = 80;
const LOGO_URL = import.meta.env.VITE_PRINT_LOGO_URL || "/logo.png";

/** Normaliser ALLE kendte ordreformer til et fælles shape */
function normalizeOrder(raw, urlOrderId) {
  if (!raw || typeof raw !== "object") {
    return {
      order_id: urlOrderId || "",
      created_at: new Date().toISOString(),
      customer: { name: "", phone: "", email: "" },
      contact: "",
      password: "",
      note: "",
      repairs: [],
      payment: { method: "efter", upfront: 0 },
    };
  }

  // Kilder:
  //  A) Nyoprettet ordre (localStorage "tg_last_order")
  //     - { id, created_at, customer:{name,phone,email}, password, contact, note, repairs:[{device,repair,price,time,part}], payment:{method,upfront} }
  //  B) Syntetisk gruppe fra Repairs/History
  //     - { order_id, created_at, customer, phone, contact, password, note, lines:[{device,repair,price,time,part}], payment_type, payment_total, deposit_amount }
  //  C) Andre variationer fra WP

  // Læs sikre baser
  const order_id =
    raw.order_id ??
    raw.id ??                 // nogle steder gemmer vi order_id her
    urlOrderId ??
    "";

  const created_at =
    raw.created_at ?? raw.date ?? raw.updated_at ?? raw.timestamp ?? new Date().toISOString();

  // Kunde
  const customer = {
    name:
      raw.customer?.name ??
      raw.customer_name ??
      raw.customer ??
      "",
    phone:
      raw.customer?.phone ??
      raw.phone ??
      raw.customer_phone ??
      "",
    email:
      raw.customer?.email ??
      raw.email ??
      raw.customer_email ??
      "",
  };

  // Kontakt/password/note
  const contact = raw.contact ?? raw.phone ?? raw.email ?? "";
  const password = raw.password ?? "";
  const note = raw.note ?? "";

  // Linjer
  const repairs =
    (Array.isArray(raw.repairs) ? raw.repairs : null) ||
    (Array.isArray(raw.lines)
      ? raw.lines.map((ln) => ({
          device: ln.device || "",
          repair: ln.repair || "",
          price: Number(ln.price || 0),
          time: Number(ln.time || 0),
          part: ln.part || ln.meta || null,
        }))
      : []) ||
    [];

  // Betaling
  // A) direkte payment-objekt
  let method = (raw.payment?.method || raw.payment_type || "efter").toLowerCase();
  if (!["efter", "betalt", "depositum", "garanti"].includes(method)) method = "efter";

  const totalFromLines = repairs.reduce((s, r) => s + (Number(r.price) || 0), 0);

  const upfront =
    Number(
      raw.payment?.upfront ??
        raw.deposit_amount ??
        (method === "depositum" ? Math.min(Number(raw.payment_total || 0), totalFromLines) || 0 : 0)
    ) || 0;

  return {
    order_id: String(order_id),
    created_at,
    customer,
    contact,
    password,
    note,
    repairs,
    payment: { method, upfront },
  };
}

export default function RepairSlipPrint() {
  const nav = useNavigate();
  const { orderId } = useParams();
  const location = useLocation();
  const startedRef = useRef(false); // StrictMode guard

  // Hent rå ordre fra state eller localStorage
  const rawOrder =
    location.state?.order ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tg_last_order") || "null");
      } catch {
        return null;
      }
    })();

  // Normaliser den til et fælles shape
  const order = useMemo(() => normalizeOrder(rawOrder, orderId), [rawOrder, orderId]);

  const total = useMemo(
    () => (order.repairs || []).reduce((s, r) => s + (Number(r.price) || 0), 0),
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

  const bodyCustomer = useMemo(
    () => `
    <div class="sheet">
      <div class="center">
        ${LOGO_URL ? `<img class="logo" src="${LOGO_URL}" alt="" />` : ""}
        <div class="orderTitle">Ordre-ID: #${order?.order_id || orderId || ""}</div>
        <div class="dateLine">${dt.date} kl. ${dt.time}</div>
      </div>

      <div class="title">Kunde</div>
      <div>${order?.customer?.name || "-"}</div>
      <div>${order?.customer?.phone || "-"}</div>
      <div>${order?.customer?.email || "-"}</div>
      <div class="hr"></div>

      <div class="title">Reparationer</div>
      ${(order?.repairs || [])
        .map(
          (r) => `
        <div class="item">
          <div class="row1">${r.device || ""} — ${r.repair || ""}</div>
          <div class="row2">Pris: ${Number(r.price || 0)} kr · Forventet tid: ${Number(r.time || 0)} min</div>
        </div>
      `
        )
        .join("")}

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
  `,
    [order, orderId, dt, total, paymentText]
  );

  const bodyTech = useMemo(
    () => `
    <div class="sheet">
      <div class="center">
        <div class="title" style="letter-spacing:1px;text-transform:uppercase;">TECH SLIP</div>
        <div class="orderTitle">Ordre-ID: #${order?.order_id || orderId || ""}</div>
        <div class="dateLine">${dt.date} kl. ${dt.time}</div>
      </div>

      <div class="hr"></div>
      <div class="title">Adgangskode</div>
      <div class="password">${order?.password || "—"}</div>

      <div class="hr"></div>
      <div class="title">Reparationer</div>
      ${(order?.repairs || [])
        .map((r) => {
          const partBits = r.part
            ? [r.part.model || "", r.part.location || "", (r.part.stock ?? "") !== "" ? "Lager: " + r.part.stock : ""]
                .filter(Boolean)
                .join(" · ")
            : "";
          return `
          <div class="item">
            <div class="row1">${r.device || ""} — ${r.repair || ""}</div>
            <div class="row2">Pris: ${Number(r.price || 0)} kr · Tid: ${Number(r.time || 0)} min</div>
            ${
              r.part
                ? `<div class="row2">Reservedel: ${partBits}</div>`
                : `<div class="row2" style="opacity:.7">(ingen reservedel valgt)</div>`
            }
          </div>
        `;
        })
        .join("")}

      <div class="hr"></div>
      <div class="total"><span>Total</span><span>${total} kr</span></div>
      <div class="hr"></div>
      <div class="payment">Betaling: ${paymentText}</div>
      <div class="hr"></div>

      <div class="title">Kunde</div>
       <div>${order?.customer?.name || "-"}</div>
       <div>${order?.customer?.phone || "-"}</div>
       <div>${order?.customer?.email || "-"}</div>
       <div><strong>Kontakt:</strong> ${order?.contact || "—"}</div>

      <div class="hr"></div>
      <div class="info">
        <div><strong>Note:</strong> ${order?.note || "—"}</div>
      </div>
    </div>
  `,
    [order, orderId, dt, total]
  );

  const makeDoc = (bodyHtml) =>
    `<!doctype html><html><head><meta charset="utf-8"/><title>Print</title><style>${styles}</style></head><body>${bodyHtml}</body></html>`;

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
        try {
          document.body.removeChild(iframe);
        } catch {}
        resolve();
      };

      const runPrint = () => {
        try {
          const w = iframe.contentWindow;
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            done();
          };
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

      try {
        iframe.onload = () => setTimeout(runPrint, 80);
        if ("srcdoc" in iframe) {
          iframe.srcdoc = html;
        } else {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          doc.open();
          doc.write(html);
          doc.close();
        }
      } catch {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          doc.open();
          doc.write(html);
          doc.close();
          setTimeout(runPrint, 120);
        } catch {
          done();
        }
      }
    });
  }

  async function startPrinting() {
    if (!order) return;
    await printHtmlViaIframe(makeDoc(bodyCustomer));
    await printHtmlViaIframe(makeDoc(bodyTech));
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startPrinting();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
