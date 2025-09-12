// src/utils/orderHelpers.js

// Robust parse for DK-formaterede tal: "1.200,00", "1.200", "1200,5", "1200", "1 200", "1.200,00 kr"
export const toNumber = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // fjern alt undtagen cifre, komma, punktum og minus
    const cleaned = v
      .replace(/[^\d,.\-]/g, "") // fjerner " kr", mellemrum osv.
      .replace(/\.(?=\d{3}(?:\D|$))/g, "") // fjern tusindtals-prikker: "1.200" -> "1200"
      .replace(",", "."); // dansk komma-decimal -> punktum
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Robust JSON parse
const safeParseJSON = (s) => {
  if (typeof s !== "string") return null;
  try { return JSON.parse(s); } catch { return null; }
};

// Sum helper (med toNumber på hvert element)
export const sumBy = (arr, key) =>
  Array.isArray(arr) ? arr.reduce((acc, it) => acc + toNumber(it?.[key]), 0) : 0;

/**
 * Finder order-lines i alle kendte former.
 * Returnerer altid et array med objekter der mindst har { device, repair, price, time }.
 */
export function extractLinesFromAny(order) {
  if (!order || typeof order !== "object") return [];

  // 1) Direkte felter
  if (Array.isArray(order.lines) && order.lines.length) return order.lines;

  // 2) JSON-felter på roden
  for (const k of ["lines_json", "meta_json", "meta_lines_json"]) {
    const parsed = safeParseJSON(order[k]);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  }

  // 3) Meta-objekter (enten objekt eller JSON-string)
  const meta = (typeof order.meta === "object" && order.meta) || safeParseJSON(order.meta);
  if (meta) {
    if (Array.isArray(meta.lines) && meta.lines.length) return meta.lines;
    const metaParsed = safeParseJSON(meta.lines_json);
    if (Array.isArray(metaParsed) && metaParsed.length) return metaParsed;
  }

  // 4) Alle andre rodfelter, der ligner "lines" (string → json)
  for (const [k, v] of Object.entries(order)) {
    if (typeof v === "string" && /lines/i.test(k)) {
      const parsed = safeParseJSON(v);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  }

  // 5) Fallback for legacy (single-line)
  return [{
    device: order.model || order.device || "",
    repair: order.repair || order.repair_title || order.title || "",
    price: toNumber(order.price ?? order.amount ?? 0),
    time: toNumber(order.time ?? 0),
    model_id: order.model_id || 0,
    part: undefined,
  }];
}

/**
 * Beregner totalpris og -tid robust for både nye og legacy ordrer.
 * totalPrice: payment_total || total_price || sum(lines.price) || price/amount
 * totalTime:  total_time  || sum(lines.time)  || time
 */
export function computeTotals(order) {
  const lines = extractLinesFromAny(order);
  const linesPrice = sumBy(lines, "price");
  const linesTime  = sumBy(lines, "time");

  const totalPrice = toNumber(
    order?.payment_total ??
    order?.total_price ??
    (Number.isFinite(linesPrice) ? linesPrice : 0) ??
    order?.amount ?? order?.price ?? 0
  );

  const totalTime = toNumber(
    order?.total_time ??
    (Number.isFinite(linesTime) ? linesTime : 0) ??
    order?.time ?? 0
  );

  return { lines, totalPrice, totalTime };
}
