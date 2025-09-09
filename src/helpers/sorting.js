// src/helpers/sorting.js

/** ---------- Fælles byggeklods: prioritets-sorter ---------- */
/**
 * makePrioritySorter({ rankOf, tieBreak })
 *  - rankOf(item): returnér et heltal (lavt = højest prioritet). Ukendt -> 999.
 *  - tieBreak(a,b): sekundær sort (default = dk-alfabetisk på "title")
 */
export function makePrioritySorter({ rankOf, tieBreak } = {}) {
  const tie = tieBreak || ((a, b) =>
    String(a?.title ?? a).localeCompare(String(b?.title ?? b), "da"));

  return (a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    return tie(a, b);
  };
}

/* =========================
 * Hjælpefunktioner til modeller
 * ========================= */
const daNorm = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "oe")
    .replace(/å/gi, "aa")
    .replace(/æ/gi, "ae")
    .trim();

/** Fjern “4G/5G” tokens; bevar tal der er en del af modelnavnet (Flip5 etc.) */
const stripG = (s = "") =>
  s.replace(/\b(?:4g|5g)\b/gi, " ").replace(/\s{2,}/g, " ").trim();

/** Første tal i strengen (efter at 4G/5G er fjernet) */
const firstNumber = (s = "") => {
  const m = stripG(s).match(/\d{1,4}/);
  return m ? parseInt(m[0], 10) : null;
};

const byDa = (a, b) => String(a).localeCompare(String(b), "da");

/** ---------- Repairs (skabeloner) ---------- */
export const repairTitleOrder = [
  "Skærm (A+)",
  "Skærm (OEM)",
  "Skærm (Officiel - pulled)",
  "Skærm",
  "SkærmTouch",
  "Display (LCD)",
  "Beskyttelsesglas",
  "Batteri",
  "Bundstik",
  "Bagcover (glas)",
  "Bagcover (inkl. ramme)",
  "Bagkamera",
  "Frontkamera",
  "Kamera lens (Glas)",
  "Højtaler",
  "Ørehøjtaler",
  "Tænd/sluk",
  "Volumeknap",
  "Face-ID",
  "Simkortslæser",
  "WiFi-antenne",
  "Vandskade",
  "Software",
  "Overfør data til ny enhed",
  "Diagnose",
];

// robust klassificering for titler
function repairRankByTitle(title = "") {
  const t = String(title).trim();
  const exact = repairTitleOrder.indexOf(t);
  if (exact !== -1) return exact;

  const s = t.toLowerCase();
  const idx = (label) => repairTitleOrder.indexOf(label);

  if (/^skærm\b.*a\+/.test(s)) return idx("Skærm (A+)");
  if (/^skærm\b.*oem/.test(s)) return idx("Skærm (OEM)");
  if (/^skærm\b.*officiel/.test(s) || /pulled/.test(s)) return idx("Skærm (Officiel - pulled)");
  if (/^skærm\b/.test(s)) return Math.max(idx("Skærm (A+)"), idx("Skærm (OEM)"), idx("Skærm (Officiel - pulled)")) + 1;

  if (/beskyttelsesglas/.test(s)) return idx("Beskyttelsesglas");
  if (/batteri/.test(s)) return idx("Batteri");
  if (/bundstik/.test(s)) return idx("Bundstik");
  if (/bagcover.*glas/.test(s)) return idx("Bagcover (glas)");
  if (/bagcover.*ramme/.test(s)) return idx("Bagcover (inkl. ramme)");
  if (/bagkamera/.test(s)) return idx("Bagkamera");
  if (/frontkamera/.test(s)) return idx("Frontkamera");
  if (/(højtaler|højttal)/.test(s) && !/øre/.test(s)) return idx("Højtaler");
  if (/øre(højt|høj)al/.test(s)) return idx("Ørehøjtaler");
  if (/vandskade/.test(s)) return idx("Vandskade");
  if (/tænd\s*\/?\s*sluk/.test(s)) return idx("Tænd/sluk");
  if (/volume?knap/.test(s)) return idx("Volumeknap");
  if (/software/.test(s)) return idx("Software");
  if (/overf(ø|o)r.*data/.test(s)) return idx("Overfør data til ny enhed");
  if (/diagnose/.test(s)) return idx("Diagnose");

  return 999;
}

export const sortRepairs = makePrioritySorter({
  rankOf: (o) => repairRankByTitle(o?.title),
  tieBreak: (a, b) =>
    String(a?.title || "").localeCompare(String(b?.title || ""), "da"),
});

/** ---------- Brands (enheder) ---------- */
export const brandOrder = [
  "iPhone",
  "Samsung mobil",
  "iPad",
  "MacBook",
  "iMac",
  "Samsung Galaxy Tab",
  "Motorola mobil",
  "OnePlus mobil",
  "Nokia mobil",
  "Huawei mobil",
  "Xiaomi mobil",
  "Sony Xperia",
  "Oppo mobil",
  "Microsoft mobil",
  "Honor mobil",
  "Google Pixel",
  "Apple Watch",
  "Samsung Book",
  "Huawei tablet",
];

export const sortBrands = makePrioritySorter({
  rankOf: (b) => {
    const name = b?.brand ?? b?.title ?? b;
    const i = brandOrder.indexOf(String(name));
    return i === -1 ? 999 : i;
  },
  tieBreak: (a, b) =>
    String(a?.brand ?? a).localeCompare(String(b?.brand ?? b), "da"),
});

/** ---------- Modeller: generiske helpers ---------- */
const VARIANTS_IPHONE = ["", " Plus", " Pro", " Pro Max"];

/** “iPhone 15 Pro Max” → { number:15, variantIndex:3 } (generisk helper – 4G/5G ignoreres) */
export function extractModelRank(name) {
  const n = String(name || "");
  const num = firstNumber(n) ?? 0;
  let variantIndex = 0;
  for (let i = 0; i < VARIANTS_IPHONE.length; i++) {
    if (n.includes(VARIANTS_IPHONE[i])) { variantIndex = i; break; }
  }
  return { number: num, variantIndex };
}

/** Fallback/generisk modelsortering: højeste tal først, ellers dk-alfabetisk */
export const sortModels = (a, b) => {
  const sa = String(a?.model ?? a?.title ?? a);
  const sb = String(b?.model ?? b?.title ?? b);
  const na = firstNumber(sa) ?? -1;
  const nb = firstNumber(sb) ?? -1;
  if (na !== nb) return nb - na;
  return byDa(sa, sb);
};

/* ========== Brand-specifik modelsortering ========== */
/* iPhone
   - iPhone X = 10
   - iPhone SE (2020/2022) = 10
   - variantorden: "" → Plus → Pro → Pro Max
   - nyeste først
*/
function rankIphone(name) {
  const n = String(name || "");
  if (/\biphone\s*x\b/i.test(n)) return { num: 10, varIdx: variantIdxIphone(n) };
  if (/\biphone\s*se\b/i.test(n) && /\b(2020|2022)\b/.test(n))
    return { num: 10, varIdx: variantIdxIphone(n) };
  return { num: firstNumber(n) ?? -1, varIdx: variantIdxIphone(n) };
}
function variantIdxIphone(n) {
  for (let i = 0; i < VARIANTS_IPHONE.length; i++) {
    if (n.includes(VARIANTS_IPHONE[i])) return i;
  }
  return 0;
}
function sortIphone(a, b) {
  const ra = rankIphone(a?.model ?? a?.title ?? a);
  const rb = rankIphone(b?.model ?? b?.title ?? b);
  if (ra.num !== rb.num) return rb.num - ra.num;
  if (ra.varIdx !== rb.varIdx) return ra.varIdx - rb.varIdx;
  return byDa(a?.model ?? a, b?.model ?? b);
}

/* Samsung mobil
   Serie-prio: S > A > Z > Xcover > M > J > Note > (other)
   Indenfor S/A: højeste tal øverst
   Z: højeste tal øverst (Flip/Fold)
   S/Z-variant: "", "+", "Ultra" (standard→Plus→Ultra)
*/
const SAMSUNG_SERIES_ORDER = ["s", "a", "z", "xcover", "m", "j", "note", "other"];
function detectSamsungSeries(name) {
  const n = String(name || "");
  if (/(\bgalaxy\s*)?s\d+/i.test(n)) return "s";
  if (/(\bgalaxy\s*)?a\d+/i.test(n)) return "a";
  if (/\bz\s*(flip|fold)\s*\d*/i.test(n) || /\bgalaxy\s*z\b/i.test(n)) return "z";
  if (/xcover/i.test(n)) return "xcover";
  if (/(\bgalaxy\s*)?m\d+/i.test(n)) return "m";
  if (/(\bgalaxy\s*)?j\d+/i.test(n)) return "j";
  if (/note\s*\d+/i.test(n)) return "note";
  return "other";
}
function samsungVariantRank(name) {
  const n = String(name || "").toLowerCase();
  if (/\bultra\b/.test(n)) return 2;
  if (/\b\+\b/.test(n) || /\bplus\b/.test(n)) return 1;
  return 0;
}
function sortSamsungMobile(a, b) {
  const sa = String(a?.model ?? a?.title ?? a);
  const sb = String(b?.model ?? b?.title ?? b);

  const serieA = detectSamsungSeries(sa);
  const serieB = detectSamsungSeries(sb);
  const pa = SAMSUNG_SERIES_ORDER.indexOf(serieA);
  const pb = SAMSUNG_SERIES_ORDER.indexOf(serieB);
  if (pa !== pb) return pa - pb;

  const na = firstNumber(sa) ?? -1;
  const nb = firstNumber(sb) ?? -1;
  if (na !== nb) return nb - na;

  if (serieA === "s" || serieA === "z") {
    const va = samsungVariantRank(sa);
    const vb = samsungVariantRank(sb);
    if (va !== vb) return va - vb;
  }
  return byDa(sa, sb);
}

/* iPad / MacBook / iMac: brug årstal (nyest først); tie-break på tal og navn */
function sortByYearDesc(a, b) {
  const sa = String(a?.model ?? a?.title ?? a);
  const sb = String(b?.model ?? b?.title ?? b);

  // Årstal (2000-2099) – nyest først
  const mA = sa.match(/\b(20\d{2})\b/);
  const mB = sb.match(/\b(20\d{2})\b/);
  const ya = mA ? parseInt(mA[1], 10) : -1;
  const yb = mB ? parseInt(mB[1], 10) : -1;

  if (ya !== yb) return yb - ya;

  // Tie-break: højeste modeltal først (4G/5G ignoreres), derefter dk-alfabetisk
  const na = firstNumber(sa) ?? -1;
  const nb = firstNumber(sb) ?? -1;
  if (na !== nb) return nb - na;

  return byDa(sa, sb);
}


/* Samsung Galaxy Tab:
   S-serie (højeste tal øverst) > A-serie (højeste tal øverst) > andre
*/
function detectTabSeries(name) {
  const n = String(name || "");
  if (/tab\s*s\d+/i.test(n)) return "s";
  if (/tab\s*a\d+/i.test(n)) return "a";
  return "other";
}
const TAB_ORDER = ["s", "a", "other"];
function sortSamsungTab(a, b) {
  const sa = String(a?.model ?? a?.title ?? a);
  const sb = String(b?.model ?? b?.title ?? b);

  const ta = detectTabSeries(sa);
  const tb = detectTabSeries(sb);
  const ia = TAB_ORDER.indexOf(ta);
  const ib = TAB_ORDER.indexOf(tb);
  if (ia !== ib) return ia - ib;

  const na = firstNumber(sa) ?? -1;
  const nb = firstNumber(sb) ?? -1;
  if (na !== nb) return nb - na;

  return byDa(sa, sb);
}

/* Motorola:
   Edge > G-serien > E-serien > øvrige
   Indenfor serie: højeste tal øverst
*/
const MOTO_ORDER = ["edge", "g", "e", "other"];
function detectMotoSeries(name) {
  const n = String(name || "");
  if (/edge/i.test(n)) return "edge";
  if (/\bg\s*\d*/i.test(n)) return "g";
  if (/\be\s*\d*/i.test(n)) return "e";
  return "other";
}
function sortMotorola(a, b) {
  const sa = String(a?.model ?? a?.title ?? a);
  const sb = String(b?.model ?? b?.title ?? b);

  const ma = MOTO_ORDER.indexOf(detectMotoSeries(sa));
  const mb = MOTO_ORDER.indexOf(detectMotoSeries(sb));
  if (ma !== mb) return ma - mb;

  const na = firstNumber(sa) ?? -1;
  const nb = firstNumber(sb) ?? -1;
  if (na !== nb) return nb - na;

  return byDa(sa, sb);
}

/* OnePlus:
   Ikke-Nord (højeste tal øverst) før Nord (højeste tal øverst)
*/
function isNord(name) { return /\bnord\b/i.test(String(name || "")); }
function sortOnePlus(a, b) {
  const sa = String(a?.model ?? a?.title ?? a);
  const sb = String(b?.model ?? b?.title ?? b);

  const aNord = isNord(sa);
  const bNord = isNord(sb);
  if (aNord !== bNord) return aNord ? 1 : -1;

  const na = firstNumber(sa) ?? -1;
  const nb = firstNumber(sb) ?? -1;
  if (na !== nb) return nb - na;

  return byDa(sa, sb);
}

/** ---------- Offentlig API ---------- */
/**
 * Lav en modelsorterer for et givet brandnavn.
 * Brug: models.sort(makeModelSorter(brandName))
 */
export function makeModelSorter(brandName) {
  const b = String(brandName || "");
  if (/^iPhone$/i.test(b)) return (a, b) => sortIphone(a, b);
  if (/^Samsung mobil$/i.test(b)) return (a, b) => sortSamsungMobile(a, b);
  if (/^(iPad|MacBook|iMac)$/i.test(b)) return (a, b) => sortByYearDesc(a, b);
  if (/^Samsung Galaxy Tab$/i.test(b)) return (a, b) => sortSamsungTab(a, b);
  if (/^Motorola mobil$/i.test(b)) return (a, b) => sortMotorola(a, b);
  if (/^OnePlus mobil$/i.test(b)) return (a, b) => sortOnePlus(a, b);

  // fallback (generisk): højeste tal først, ellers alfabetisk
  return (a, b) => sortModels(a, b);
}
