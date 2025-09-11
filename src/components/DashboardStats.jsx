// src/components/DashboardStats.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../data/apiClient";

/* --------------------- Utils --------------------- */
const TG_BLUE = "#2166AC";

function isCancelledStatus(s) {
  const t = String(s || "").toLowerCase().trim();
  return (
    t === "annulleret" ||
    t === "canceled" ||
    t === "cancelled" ||
    t.includes("annull") ||
    t.includes("cancel")
  );
}

function parseDateSafe(input) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatDk(d) {
  return d.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit" });
}

function formatMonthYear(d) {
  const month = d.toLocaleDateString("da-DK", { month: "short" });
  return `${month} ${d.getFullYear()}`;
}

function clampToRange(date, from, to) {
  return date >= from && date <= to;
}

function getItemTimestamp(item) {
  return (
    parseDateSafe(item?.updated_at) ||
    parseDateSafe(item?.created_at) ||
    parseDateSafe(item?.date) ||
    parseDateSafe(item?.createdAt) ||
    null
  );
}

function getItemPrice(item) {
  const v = item?.price ?? item?.amount ?? item?.total ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* --------------------- Presets --------------------- */
const PERIODS = [
  { key: "day", label: "Dag" },
  { key: "week", label: "Uge" },
  { key: "month", label: "Måned" },
  { key: "year", label: "År" },
  { key: "custom", label: "Tilpasset" },
];

const SOURCES = [
  { key: "repairs", label: "Reparationer" },
  { key: "bookings", label: "Bookinger" },
];

/* --------------------- Component --------------------- */
export default function DashboardStats() {
  const [source, setSource] = useState("repairs"); // "repairs" | "bookings"
  const [period, setPeriod] = useState("week"); // "day" | "week" | "month" | "year" | "custom"
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);

  // Udled dato-interval for den valgte periode
  const { fromDate, toDate, granularity } = useMemo(() => {
    const now = new Date();
    let from, to, gran = "day"; // granularity: "day" | "month"
    switch (period) {
      case "day": {
        from = startOfDay(now);
        to = endOfDay(now);
        gran = "hour"; // (vi viser stadig per dag i grafen; gns. pr. dag – men kan udvides til time hvis ønsket)
        break;
      }
      case "week": {
        const tmp = new Date(now);
        const weekday = (tmp.getDay() + 6) % 7; // mandag=0
        tmp.setDate(tmp.getDate() - weekday);
        from = startOfDay(tmp);
        to = endOfDay(new Date());
        break;
      }
      case "month": {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        from = startOfDay(first);
        to = endOfDay(new Date());
        break;
      }
      case "year": {
        const first = new Date(now.getFullYear(), 0, 1);
        from = startOfDay(first);
        to = endOfDay(new Date());
        gran = "month";
        break;
      }
      case "custom": {
        const f = customFrom ? startOfDay(new Date(customFrom)) : null;
        const t = customTo ? endOfDay(new Date(customTo)) : null;
        from = f || startOfDay(now);
        to = t || endOfDay(now);
        // vælg automatisk granularity for custom: > 120 dage => måned, ellers dag
        const diffDays = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)));
        gran = diffDays > 120 ? "month" : "day";
        break;
      }
      default: {
        from = startOfDay(now);
        to = endOfDay(now);
      }
    }
    return { fromDate: from, toDate: to, granularity: gran };
  }, [period, customFrom, customTo]);

  // Hent data når source/periode ændres
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        let res;

        if (source === "repairs") {
          // tg_repair or telegiganten_repair list
          res = await api.getRepairOrders();
        } else {
          // bookings endpoint – findes i projektet ifm. DashboardRecentBookings
          if (typeof api.getBookings === "function") {
            res = await api.getBookings();
          } else if (typeof api.getRecentBookings === "function") {
            res = await api.getRecentBookings();
          } else {
            throw new Error(
              "Kunne ikke finde bookings-endpoint i apiClient. Tilføj api.getBookings()."
            );
          }
        }

        const list = Array.isArray(res) ? res : res?.items || [];
        if (cancelled) return;

        // Normalisér & filtrér på status + dato-range
        const norm = list
          .filter((x) => !isCancelledStatus(x?.status))
          .map((x) => {
            const ts = getItemTimestamp(x);
            return {
              ts,
              price: getItemPrice(x),
            };
          })
          .filter((x) => x.ts && clampToRange(x.ts, fromDate, toDate));

        setItems(norm);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err?.message || "Kunne ikke hente data.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, fromDate, toDate]);

  // Aggreger til graf og KPI’er
  const { chartData, totalCount, totalRevenue } = useMemo(() => {
    if (!items?.length) {
      return { chartData: [], totalCount: 0, totalRevenue: 0 };
    }

    const buckets = new Map();

    if (granularity === "month") {
      // Gruppér pr. måned
      for (const it of items) {
        const key = `${it.ts.getFullYear()}-${String(it.ts.getMonth() + 1).padStart(2, "0")}`;
        const label = formatMonthYear(new Date(it.ts.getFullYear(), it.ts.getMonth(), 1));
        if (!buckets.has(key)) {
          buckets.set(key, { label, count: 0, revenue: 0 });
        }
        const b = buckets.get(key);
        b.count += 1;
        b.revenue += it.price;
      }
    } else {
      // Gruppér pr. dag
      for (const it of items) {
        const day = startOfDay(it.ts);
        const key = day.toISOString().slice(0, 10);
        const label = formatDk(day);
        if (!buckets.has(key)) {
          buckets.set(key, { label, count: 0, revenue: 0 });
        }
        const b = buckets.get(key);
        b.count += 1;
        b.revenue += it.price;
      }
    }

    // Sortér efter dato
    const sorted = Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
    const chart = sorted.map(([, v]) => ({
      date: v.label,
      count: v.count,
      sales: Math.round(v.revenue),
    }));

    const totals = sorted.reduce(
      (acc, [, v]) => {
        acc.count += v.count;
        acc.revenue += v.revenue;
        return acc;
      },
      { count: 0, revenue: 0 }
    );

    return { chartData: chart, totalCount: totals.count, totalRevenue: Math.round(totals.revenue) };
  }, [items, granularity]);

  const avg = totalCount ? Math.round(totalRevenue / totalCount) : 0;

  /* --------------------- UI --------------------- */
  return (
    <div style={{ marginTop: "3rem" }}>
      <h2 style={{ fontFamily: "Archivo Black", textTransform: "uppercase", marginBottom: "1rem" }}>
        Statistik
      </h2>

      {/* Filterbar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px",
          marginBottom: "1rem",
        }}
      >
        {/* Kildevalg */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SOURCES.map((s) => (
            <button
              key={s.key}
              onClick={() => setSource(s.key)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${source === s.key ? TG_BLUE : "#e5e7eb"}`,
                background: source === s.key ? TG_BLUE : "#fff",
                color: source === s.key ? "#fff" : "#111",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Periodevalg */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${period === p.key ? TG_BLUE : "#e5e7eb"}`,
                background: period === p.key ? TG_BLUE : "#fff",
                color: period === p.key ? "#fff" : "#111",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {p.label}
            </button>
          ))}

          {period === "custom" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ fontSize: 12, color: "#555" }}>Fra</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <label style={{ fontSize: 12, color: "#555" }}>Til</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI-kort */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "2rem",
          alignItems: "center",
          background: "white",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#777" }}>
            {source === "repairs" ? "Reparationer" : "Bookinger"}
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{totalCount}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#777" }}>Omsætning</p>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>
            {totalRevenue.toLocaleString("da-DK")} kr
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#777" }}>Gennemsnit pr. enhed</p>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>
            {avg.toLocaleString("da-DK")} kr
          </p>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
          Interval:{" "}
          <strong>
            {fromDate.toLocaleDateString("da-DK")} – {toDate.toLocaleDateString("da-DK")}
          </strong>{" "}
          {granularity === "month" ? "(månedlig visning)" : "(daglig visning)"}
        </div>
      </div>

      {/* Loader / fejl */}
      {loading && (
        <div
          style={{
            marginTop: "1rem",
            padding: "12px 14px",
            borderRadius: 12,
            background: "#EFF6FF",
            color: TG_BLUE,
          }}
        >
          Indlæser statistik…
        </div>
      )}
      {!loading && errorMsg && (
        <div
          style={{
            marginTop: "1rem",
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Graf */}
      <div style={{ height: 320, marginTop: "1.25rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => {
                if (name === "sales") return [`${value.toLocaleString("da-DK")} kr`, "Omsætning"];
                if (name === "count") return [value, "Antal"];
                return value;
              }}
            />
            {/* Primært fokus på omsætning – antal kan toggles ved at ændre dataKey her */}
            <Line type="monotone" dataKey="sales" stroke={TG_BLUE} strokeWidth={3} dot={false} />
            {/* Sekundær linje for antal (kan kommenteres ud hvis du vil holde grafen “ren”) */}
            <Line type="monotone" dataKey="count" stroke="#9CA3AF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
