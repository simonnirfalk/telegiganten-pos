// src/pages/OrdersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../data/apiClient"; // <-- korrekt sti

const blue = "#2166AC";

function Card({ children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e9eef3",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 2px rgba(16,24,40,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, onClick, style, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        background: blue,
        color: "#fff",
        border: `1px solid ${blue}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all .15s ease",
        ...(style || {}), // <-- korrekt spread
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#fff";
        e.currentTarget.style.color = blue;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = blue;
        e.currentTarget.style.color = "#fff";
      }}
    >
      {children}
    </button>
  );
}

function StatusPill({ label, tone = "default" }) {
  const colors = {
    default: { bg: "#e9eef3", fg: "#1a1f36" },
    open: { bg: "#E6F4FF", fg: blue },
    closed: { bg: "#EAF7EE", fg: "#1C7C3E" },
    awaiting: { bg: "#FFF3E6", fg: "#B45D00" },
  };
  const c = colors[tone] || colors.default;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
      }}
    >
      {label}
    </span>
  );
}

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

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(Array.isArray(data) ? data : data?.orders || []);
    } catch (e) {
      console.error("Failed to load orders", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((o) => {
      return [
        o.item,
        o.customer_name,
        o.customer_phone,
        o.status,
        String(o.price),
        String(o.deposit_amount),
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s));
    });
  }, [orders, q]);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Bestillinger</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Søg i bestillinger…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              border: "1px solid #e9eef3",
              borderRadius: 10,
              padding: "10px 12px",
              outline: "none",
              minWidth: 260,
            }}
          />
          <Button onClick={() => setShowCreate(true)}>Opret bestilling</Button>
        </div>
      </div>

      {loading ? (
        <p>Henter…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p style={{ margin: 0 }}>Ingen bestillinger endnu.</p>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((o) => (
            <Card key={o.id ?? o.order_id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>{o.item || "Vare (ukendt)"}</strong>
                <StatusPill
                  label={o.status || "åben"}
                  tone={o.status === "afsluttet" ? "closed" : o.status === "afventer" ? "awaiting" : "open"}
                />
              </div>

              <div style={{ fontSize: 14, color: "#3b3b3b", marginBottom: 8 }}>
                {o.customer_name ? <div>{o.customer_name}</div> : null}
                {o.customer_phone ? <div>{o.customer_phone}</div> : null}
                {o.customer_email ? <div>{o.customer_email}</div> : null}
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 14, marginBottom: 8 }}>
                <div><strong>Pris:</strong> {formatCurrency(o.price)}</div>
                {o.deposit_amount ? (
                  <div><strong>Depositum:</strong> {formatCurrency(o.deposit_amount)}</div>
                ) : null}
              </div>

              <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
                <div><strong>Forventet klar:</strong> {formatDateTime(o.eta)}</div>
                <div><strong>Oprettet:</strong> {formatDateTime(o.created_at)}</div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  onClick={() => navigate(`/orders/${o.id ?? o.order_id}/print`)}
                  style={{ padding: "8px 12px" }}
                >
                  Print kvittering ×2
                </Button>
                <Link
                  to="#"
                  style={{ marginLeft: "auto", fontSize: 14, textDecoration: "underline", color: blue }}
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Detaljer/redigering kommer i næste iteration 😊");
                  }}
                >
                  Detaljer
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function CreateOrderModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    item: "",
    price: "",
    eta: "",
    payment_method: "depositum",
    deposit_amount: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const canSave = form.item.trim() && String(form.price).trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form, // <-- korrekt spread
        price: Number(form.price || 0),
        deposit_amount: Number(form.deposit_amount || 0),
      };
      const created = await api.createOrder(payload);
      if (!created) throw new Error("Create failed");
      onCreated?.(created);
    } catch (err) {
      console.error(err);
      alert("Kunne ikke oprette bestilling.");
    } finally {
      setSaving(false);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value })); // <-- korrekt
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)", // <-- korrekt alpha
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 12,
          padding: 18,
          border: "1px solid #e9eef3",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Opret bestilling</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Luk"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
          <Input label="Vare" value={form.item} onChange={(v) => set("item", v)} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Pris (kr.)" value={form.price} onChange={(v) => set("price", v.replace(",", "."))} required />
            <Input label="Forventet klar (dato/tid)" type="datetime-local" value={form.eta} onChange={(v) => set("eta", v)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Select
              label="Betaling"
              value={form.payment_method}
              onChange={(v) => set("payment_method", v)}
              options={[
                { value: "depositum", label: "Depositum" },
                { value: "fuld", label: "Betalt fuldt" },
                { value: "senere", label: "Betales ved afhentning" },
              ]}
            />
            <Input
              label="Depositum (kr.)"
              value={form.deposit_amount}
              onChange={(v) => set("deposit_amount", v.replace(",", "."))}
              placeholder="0 hvis ikke relevant"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Kundens navn" value={form.customer_name} onChange={(v) => set("customer_name", v)} />
            <Input label="Telefon" value={form.customer_phone} onChange={(v) => set("customer_phone", v)} />
          </div>
          <Input label="E-mail" value={form.customer_email} onChange={(v) => set("customer_email", v)} />
          <Textarea label="Bemærkning" value={form.note} onChange={(v) => set("note", v)} />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
            <Button onClick={onClose} style={{ background: "#fff", color: blue }}>
              Annuller
            </Button>
            <Button type="submit">{saving ? "Gemmer…" : "Gem bestilling"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
      <span style={{ fontWeight: 600 }}>{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          border: "1px solid #e9eef3",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
        }}
      />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          border: "1px solid #e9eef3",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
          resize: "vertical",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid #e9eef3",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
          background: "#fff",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
