// src/components/DashboardStats.jsx
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const dummyData = {
  "7d": {
    chart: [
      { date: "14/4", sales: 2200 },
      { date: "15/4", sales: 1850 },
      { date: "16/4", sales: 2600 },
      { date: "17/4", sales: 3200 },
      { date: "18/4", sales: 1750 },
      { date: "19/4", sales: 2850 },
      { date: "20/4", sales: 3100 },
    ],
    count: 28,
    revenue: 17550,
  },
  "30d": {
    chart: Array.from({ length: 30 }).map((_, i) => ({
      date: `${i + 1}/4`,
      sales: Math.floor(Math.random() * 3000 + 1000),
    })),
    count: 125,
    revenue: 84400,
  },
  year: {
    chart: Array.from({ length: 12 }).map((_, i) => ({
      date: `${i + 1}/2024`,
      sales: Math.floor(Math.random() * 80000 + 20000),
    })),
    count: 1200,
    revenue: 562000,
  },
};

export default function DashboardStats() {
  const [period, setPeriod] = useState("7d");
  const data = dummyData[period];

  return (
    <div style={{ marginTop: "3rem" }}>
      <h2 style={{ fontFamily: "Archivo Black", textTransform: "uppercase", marginBottom: "1rem" }}>
        Statistik
      </h2>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "2rem",
        alignItems: "center",
        background: "white",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#777" }}>Reparationer</p>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{data.count}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#777" }}>Omsætning</p>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{data.revenue.toLocaleString()} kr</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#777" }}>Gennemsnit pr. rep.</p>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{Math.round(data.revenue / data.count)} kr</p>
        </div>

        <select
          style={{ marginLeft: "auto", fontSize: "1rem", padding: "0.5rem 1rem", borderRadius: "8px" }}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="7d">Sidste 7 dage</option>
          <option value="30d">Sidste 30 dage</option>
          <option value="year">Hele året</option>
        </select>
      </div>

      <div style={{ height: 300, marginTop: "2rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.chart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `${value} kr`} />
            <Line type="monotone" dataKey="sales" stroke="#2166AC" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
