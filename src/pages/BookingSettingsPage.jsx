import React, { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";

const BLUE = "#2166AC";

const weekdayLabels = [
  { iso: 1, label: "Mandag" },
  { iso: 2, label: "Tirsdag" },
  { iso: 3, label: "Onsdag" },
  { iso: 4, label: "Torsdag" },
  { iso: 5, label: "Fredag" },
  { iso: 6, label: "Lørdag" },
  { iso: 7, label: "Søndag" },
];

// availability-config bruger 0..6 (0=søndag)
function isoToDow0(iso) {
  // iso: 1..7 (man..søn) -> dow0: 0..6 (søn..lør)
  if (iso === 7) return 0;
  return iso; // 1..6 passer direkte
}

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function isValidTime(s) {
  return /^\d{2}:\d{2}$/.test(String(s || ""));
}

export default function BookingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Shared
  const [adminKey, setAdminKey] = useState("");

  // ---------- availability-rules ----------
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");

  const [closedWeekdays, setClosedWeekdays] = useState([]); // ISO 1..7
  const [closedDates, setClosedDates] = useState([]); // ["YYYY-MM-DD"]
  const closedWeekdaySet = useMemo(() => new Set(closedWeekdays), [closedWeekdays]);

  const [newClosedDate, setNewClosedDate] = useState("");

  // ---------- availability-config ----------
  const [timezone, setTimezone] = useState("Europe/Copenhagen");
  const [slotMinutes, setSlotMinutes] = useState(30);

  // weeklyHours: { [dow0 0..6]: { open:"HH:MM", close:"HH:MM" } | null }
  const [weeklyHours, setWeeklyHours] = useState(() => ({
    0: null,
    1: { open: "10:00", close: "17:00" },
    2: { open: "10:00", close: "17:00" },
    3: { open: "10:00", close: "17:00" },
    4: { open: "10:00", close: "17:00" },
    5: { open: "10:00", close: "15:00" },
    6: null,
  }));

  // overrides: { "YYYY-MM-DD": {open,close} | null }
  const [overrides, setOverrides] = useState({});
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideMode, setOverrideMode] = useState("open"); // "open" | "closed"
  const [overrideOpen, setOverrideOpen] = useState("10:00");
  const [overrideClose, setOverrideClose] = useState("13:00");

  const overrideEntries = useMemo(() => {
    const entries = Object.entries(overrides || {});
    entries.sort((a, b) => (a[0] < b[0] ? 1 : -1)); // nyest først
    return entries;
  }, [overrides]);

  useEffect(() => {
    (async () => {
      try {
        console.log("[booking settings] api keys:", Object.keys(api));
        console.log(
          "[booking settings] has getBookingAvailabilityConfig:",
          typeof api.getBookingAvailabilityConfig
        );
    
        // 1) Rules (closures + range)
        const rulesRes = await api.getBookingAvailabilityRules();
        if (rulesRes?.ok) {
          setMinDate(String(rulesRes?.range?.min || ""));
          setMaxDate(String(rulesRes?.range?.max || ""));

          const cw = Array.isArray(rulesRes?.closures?.closed_weekdays)
            ? rulesRes.closures.closed_weekdays
            : [];
          const cd = Array.isArray(rulesRes?.closures?.closed_dates)
            ? rulesRes.closures.closed_dates
            : [];

          setClosedWeekdays(
            cw.map(Number).filter((n) => Number.isFinite(n) && n >= 1 && n <= 7)
          );
          setClosedDates(
            cd.map(String).filter((d) => isValidDate(d))
          );
        }

        // 2) Config (opening hours + slot minutes)
        const cfgRes = await api.getBookingAvailabilityConfig();
        if (cfgRes?.ok && cfgRes?.config) {
          const cfg = cfgRes.config;
          if (cfg.timezone) setTimezone(String(cfg.timezone));
          if ([15, 30, 60].includes(Number(cfg.slot_minutes))) setSlotMinutes(Number(cfg.slot_minutes));

          // Weekly
          if (cfg.weekly && typeof cfg.weekly === "object") {
            const next = { ...weeklyHours };
            for (const [k, v] of Object.entries(cfg.weekly)) {
              const d = Number(k);
              if (!Number.isFinite(d) || d < 0 || d > 6) continue;

              if (v === null) next[d] = null;
              else if (v && typeof v === "object" && isValidTime(v.open) && isValidTime(v.close)) {
                next[d] = { open: v.open, close: v.close };
              }
            }
            setWeeklyHours(next);
          }

          // Overrides
          if (cfg.overrides && typeof cfg.overrides === "object") {
            const nextOv = {};
            for (const [date, val] of Object.entries(cfg.overrides)) {
              if (!isValidDate(date)) continue;
              if (val === null) nextOv[date] = null;
              else if (val && typeof val === "object" && isValidTime(val.open) && isValidTime(val.close)) {
                nextOv[date] = { open: val.open, close: val.close };
              }
            }
            setOverrides(nextOv);
          }
        }
      } catch (e) {
        console.error("Fejl ved hentning af booking-indstillinger:", e);
        alert("Kunne ikke hente booking-indstillinger. Se console for detaljer.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Rules handlers ----------
  function toggleClosedWeekday(iso) {
    setClosedWeekdays((prev) => {
      const set = new Set(prev);
      if (set.has(iso)) set.delete(iso);
      else set.add(iso);
      return Array.from(set).sort((a, b) => a - b);
    });
  }

  function addClosedDate() {
    const d = String(newClosedDate || "").trim();
    if (!isValidDate(d)) return;

    setClosedDates((prev) => {
      const set = new Set(prev);
      set.add(d);
      return Array.from(set).sort().reverse();
    });
    setNewClosedDate("");
  }

  function removeClosedDate(d) {
    setClosedDates((prev) => prev.filter((x) => x !== d));
  }

  // ---------- Config handlers ----------
  function setDayClosed(iso, closed) {
    const d0 = isoToDow0(iso);
    setWeeklyHours((prev) => {
      const next = { ...prev };
      if (closed) next[d0] = null;
      else next[d0] = next[d0] || { open: "10:00", close: "17:00" };
      return next;
    });
  }

  function setDayTime(iso, field, value) {
    const d0 = isoToDow0(iso);
    setWeeklyHours((prev) => {
      const next = { ...prev };
      const day = next[d0];
      if (!day) return next;
      next[d0] = { ...day, [field]: value };
      return next;
    });
  }

  function addOverride() {
    const d = String(overrideDate || "").trim();
    if (!isValidDate(d)) return;

    setOverrides((prev) => {
      const next = { ...prev };
      if (overrideMode === "closed") {
        next[d] = null;
      } else {
        if (!isValidTime(overrideOpen) || !isValidTime(overrideClose)) return next;
        next[d] = { open: overrideOpen, close: overrideClose };
      }
      return next;
    });

    setOverrideDate("");
  }

  function removeOverride(date) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  }

  // ---------- Save ----------
  async function saveAll() {
    setSaving(true);
    try {
      // 1) Save closures
      const res1 = await api.updateBookingAvailabilityRules({
        closed_weekdays: closedWeekdays,
        closed_dates: closedDates,
        adminKey: adminKey.trim(),
      });

      if (!res1?.ok) throw new Error("Kunne ikke gemme lukkedage (availability-rules)");

      // 2) Save config
      const res2 = await api.updateBookingAvailabilityConfig({
        timezone,
        slot_minutes: slotMinutes,
        weekly: weeklyHours,
        overrides,
        adminKey: adminKey.trim(),
      });

      if (!res2?.ok) throw new Error("Kunne ikke gemme tider (availability-config)");

      alert("Gemt ✅");
    } catch (e) {
      console.error(e);
      alert(
        "Kunne ikke gemme. Hvis du har sat en admin key i WP, så udfyld feltet. Se console for detaljer."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: "2rem" }}>Indlæser booking-indstillinger…</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Booking-indstillinger</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Styr lukkedage og åbningstider for booking-v2. Custom datepicker kommer bagefter.
      </p>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={labelStyle}>Dato-range (info)</div>
            <div style={{ color: "#111" }}>
              Min: <strong>{minDate || "—"}</strong> · Max: <strong>{maxDate || "—"}</strong>
            </div>
          </div>

          <div style={{ minWidth: 280 }}>
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

      {/* --------- Closures (rules) --------- */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Lukkede ugedage</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {weekdayLabels.map((w) => {
            const checked = closedWeekdaySet.has(w.iso);
            return (
              <button
                key={w.iso}
                type="button"
                onClick={() => toggleClosedWeekday(w.iso)}
                style={{
                  ...chipStyle,
                  background: checked ? BLUE : "white",
                  color: checked ? "white" : "#111",
                  borderColor: BLUE,
                }}
              >
                {w.label} {checked ? "• Lukket" : "• Åben"}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
          Disse dage er lukket uanset tider. (Bruges til at disable dage i datepicker.)
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Lukkede datoer</div>

        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <div style={labelStyle}>Tilføj dato</div>
            <input
              type="date"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              min={minDate || undefined}
              max={maxDate || undefined}
              style={inputStyle}
            />
          </div>

          <button type="button" onClick={addClosedDate} style={primaryBtnStyle} disabled={!newClosedDate}>
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
                  <div style={{ fontWeight: 800 }}>{d}</div>
                  <button type="button" onClick={() => removeClosedDate(d)} style={dangerBtnStyle}>
                    Slet
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --------- Config (opening hours) --------- */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Åbningstider & slots</div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
              Ugeplan bestemmer hvilke tidspunkter der kan bookes, med mulighed for dato-overrides.
            </div>
          </div>

          <div style={{ minWidth: 220 }}>
            <div style={labelStyle}>Slot-længde</div>
            <select
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
              style={{ ...inputStyle, maxWidth: 220 }}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {weekdayLabels.map((w) => {
            const d0 = isoToDow0(w.iso);
            const day = weeklyHours[d0];
            const isClosed = day === null;

            return (
              <div key={w.iso} style={rowStyle}>
                <div style={{ fontWeight: 900 }}>{w.label}</div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setDayClosed(w.iso, !isClosed)}
                    style={{
                      ...chipStyle,
                      padding: "8px 10px",
                      background: isClosed ? BLUE : "white",
                      color: isClosed ? "white" : "#111",
                    }}
                    title="Toggle lukket/åben"
                  >
                    {isClosed ? "Lukket" : "Åben"}
                  </button>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Åbner</div>
                    <input
                      type="time"
                      value={day?.open || "10:00"}
                      onChange={(e) => setDayTime(w.iso, "open", e.target.value)}
                      disabled={isClosed}
                      style={{ ...inputStyle, maxWidth: 150 }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Lukker</div>
                    <input
                      type="time"
                      value={day?.close || "17:00"}
                      onChange={(e) => setDayTime(w.iso, "close", e.target.value)}
                      disabled={isClosed}
                      style={{ ...inputStyle, maxWidth: 150 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Dato-overrides (særlige tider eller lukket)</div>

        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <div style={labelStyle}>Dato</div>
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              min={minDate || undefined}
              max={maxDate || undefined}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>Type</div>
            <select
              value={overrideMode}
              onChange={(e) => setOverrideMode(e.target.value)}
              style={{ ...inputStyle, maxWidth: 220 }}
            >
              <option value="open">Særåbent</option>
              <option value="closed">Lukket</option>
            </select>
          </div>

          {overrideMode === "open" && (
            <>
              <div>
                <div style={labelStyle}>Åbner</div>
                <input
                  type="time"
                  value={overrideOpen}
                  onChange={(e) => setOverrideOpen(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 170 }}
                />
              </div>

              <div>
                <div style={labelStyle}>Lukker</div>
                <input
                  type="time"
                  value={overrideClose}
                  onChange={(e) => setOverrideClose(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 170 }}
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={addOverride}
            style={primaryBtnStyle}
            disabled={!overrideDate || (overrideMode === "open" && (!overrideOpen || !overrideClose))}
          >
            Tilføj
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {overrideEntries.length === 0 ? (
            <div style={{ color: "#666" }}>(Ingen overrides)</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {overrideEntries.map(([date, val]) => (
                <div key={date} style={rowStyle}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{date}</div>
                    <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
                      {val === null ? "Lukket" : `${val.open} – ${val.close}`}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeOverride(date)} style={dangerBtnStyle}>
                    Slet
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
          Overrides påvirker kun tider. Lukkede datoer (ovenfor) bliver stadig lukket i datepicker.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button type="button" onClick={saveAll} style={primaryBtnStyle} disabled={saving}>
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

const labelStyle = { fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 800 };

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
  background: BLUE,
  color: "white",
  border: `1px solid ${BLUE}`,
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const dangerBtnStyle = {
  background: "white",
  color: BLUE,
  border: `1px solid ${BLUE}`,
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const chipStyle = {
  border: `1px solid ${BLUE}`,
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 900,
  cursor: "pointer",
  textAlign: "left",
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eef2f6",
  background: "#fbfcfe",
};
