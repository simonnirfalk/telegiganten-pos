import React, { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";

const blue = "#2166AC";

const weekdayLabels = [
  { iso: 1, label: "Mandag" },
  { iso: 2, label: "Tirsdag" },
  { iso: 3, label: "Onsdag" },
  { iso: 4, label: "Torsdag" },
  { iso: 5, label: "Fredag" },
  { iso: 6, label: "Lørdag" },
  { iso: 7, label: "Søndag" },
];

export default function BookingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");

  const [closedWeekdays, setClosedWeekdays] = useState([]); // [1..7]
  const [closedDates, setClosedDates] = useState([]); // ["YYYY-MM-DD", ...]

  const [newDate, setNewDate] = useState("");
  const [adminKey, setAdminKey] = useState(""); // valgfri (kun hvis du sætter tg_pos_admin_key i WP)

  const closedWeekdaySet = useMemo(() => new Set(closedWeekdays), [closedWeekdays]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getBookingAvailabilityRules();
        if (data?.ok) {
          setMinDate(String(data?.range?.min || ""));
          setMaxDate(String(data?.range?.max || ""));

          const cw = Array.isArray(data?.closures?.closed_weekdays) ? data.closures.closed_weekdays : [];
          const cd = Array.isArray(data?.closures?.closed_dates) ? data.closures.closed_dates : [];

          setClosedWeekdays(cw.map(Number).filter((n) => n >= 1 && n <= 7));
          setClosedDates(cd.map(String).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)));
        }
      } catch (e) {
        console.error("Fejl ved hentning af booking-regler:", e);
        alert("Kunne ikke hente booking-regler. Se console for detaljer.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleWeekday(n) {
    setClosedWeekdays((prev) => {
      const set = new Set(prev);
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return Array.from(set).sort((a, b) => a - b);
    });
  }

  function addClosedDate() {
    const d = String(newDate || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;

    setClosedDates((prev) => {
      const set = new Set(prev);
      set.add(d);
      return Array.from(set).sort().reverse(); // nyest øverst
    });
    setNewDate("");
  }

  function removeClosedDate(d) {
    setClosedDates((prev) => prev.filter((x) => x !== d));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateBookingAvailabilityRules({
        closed_weekdays: closedWeekdays,
        closed_dates: closedDates,
        adminKey: adminKey.trim(),
      });

      if (!res?.ok) throw new Error("Ugyldigt svar fra server");
      alert("Gemt ✅");
    } catch (e) {
      console.error("Fejl ved gem:", e);
      alert("Kunne ikke gemme. Hvis du har sat en admin key i WP, så udfyld feltet her.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: "2rem" }}>Indlæser booking-indstillinger…</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Booking-indstillinger</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Styr lukkedage og lukkede ugedage for booking-v2. (Min/max dato styres af bookingens “months ahead”.)
      </p>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={labelStyle}>Dato-range (info)</div>
            <div style={{ color: "#111" }}>
              Min: <strong>{minDate || "—"}</strong> · Max: <strong>{maxDate || "—"}</strong>
            </div>
          </div>

          <div style={{ minWidth: 260 }}>
            <div style={labelStyle}>Admin key (valgfri)</div>
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Kun hvis du har sat tg_pos_admin_key i WP"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Lukkede ugedage</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {weekdayLabels.map((w) => {
            const checked = closedWeekdaySet.has(w.iso);
            return (
              <button
                key={w.iso}
                type="button"
                onClick={() => toggleWeekday(w.iso)}
                style={{
                  ...chipStyle,
                  background: checked ? blue : "white",
                  color: checked ? "white" : "#111",
                  borderColor: blue,
                }}
              >
                {w.label} {checked ? "• Lukket" : "• Åben"}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
          Tip: hvis en ugedag er lukket her, vil den være lukket i booking, uanset tider.
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Lukkede datoer</div>

        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <div style={labelStyle}>Tilføj dato</div>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={minDate || undefined}
              max={maxDate || undefined}
              style={inputStyle}
            />
          </div>

          <button type="button" onClick={addClosedDate} style={primaryBtnStyle} disabled={!newDate}>
            Tilføj
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {closedDates.length === 0 ? (
            <div style={{ color: "#666" }}>(Ingen lukkede datoer)</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {closedDates.map((d) => (
                <div key={d} style={rowStyle}>
                  <div style={{ fontWeight: 700 }}>{d}</div>
                  <button type="button" onClick={() => removeClosedDate(d)} style={dangerBtnStyle}>
                    Slet
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button type="button" onClick={save} style={primaryBtnStyle} disabled={saving}>
          {saving ? "Gemmer…" : "Gem ændringer"}
        </button>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  border: "1px solid #e9eef3",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  marginTop: 14,
};

const labelStyle = { fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 700 };

const inputStyle = {
  width: "100%",
  maxWidth: 360,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d9e2ec",
  outline: "none",
  fontSize: 14,
};

const primaryBtnStyle = {
  background: blue,
  color: "white",
  border: `1px solid ${blue}`,
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 800,
  cursor: "pointer",
};

const dangerBtnStyle = {
  background: "white",
  color: blue,
  border: `1px solid ${blue}`,
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 800,
  cursor: "pointer",
};

const chipStyle = {
  border: `1px solid ${blue}`,
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "left",
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eef2f6",
  background: "#fbfcfe",
};
