// src/data/apiClient.js

// Decode HTML entities (fx &#8211; → –)
function normalizeEntities(obj) {
  if (typeof obj === "string") {
    return obj
      .replace(/&#8211;/g, "–") // en dash
      .replace(/&#8212;/g, "—") // em dash
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  } else if (Array.isArray(obj)) {
    return obj.map(normalizeEntities);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, normalizeEntities(v)])
    );
  }
  return obj;
}

// ===== Konfiguration =====
const WP_ORIGIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WP_ORIGIN) ||
  "https://telegiganten.dk";

// Normaliser for sammenligning (fjern trailing slash)
const WP_ORIGIN_NORM = (WP_ORIGIN || "").replace(/\/+$/, "");

// Universal Proxy endpoint (WordPress plugin): POST /wp-json/tg/v1/proxy
// (Vi beholder den til eksterne mål, fx Google Sheets)
const PROXY_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PROXY_URL) ||
  "/wp-json/tg/v1/proxy";

const WP_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  `${WP_ORIGIN_NORM}/wp-json/telegiganten/v1`;

// Valgfrit: bypass-token hvis Deployment Protection er slået til
const VERCEL_BYPASS =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_VERCEL_BYPASS_TOKEN) ||
  (typeof window !== "undefined" && window.__VERCEL_BYPASS) ||
  "";

// Popular models endpoint (kan styres via .env)
const POPULAR_MODELS_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_POPULAR_MODELS_URL) ||
  "/wp-json/telegiganten/v1/top-models";

// ================================
// Hjælpere
// ================================
function withQuery(path, query) {
  if (!query || typeof query !== "object") return path;
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  const s = qs.toString();
  if (!s) return path;
  return path.includes("?") ? `${path}&${s}` : `${path}?${s}`;
}

function toWpRelative(p) {
  if (!p) return "/";
  if (p.startsWith("http://") || p.startsWith("https://")) {
    const u = new URL(p);
    const origin = (u.origin || "").replace(/\/+$/, "");
    if (origin !== WP_ORIGIN_NORM) {
      throw new Error(`Ekstern URL er ikke tilladt: ${u.origin}`);
    }
    return u.pathname + (u.search || "");
  }
  return p.startsWith("/") ? p : `/${p}`;
}

// Tilføj bypass-token, men bevar RELATIV sti
function withBypass(url) {
  if (!VERCEL_BYPASS) return url;

  if (typeof window !== "undefined") {
    try {
      const u = new URL(url, window.location.origin);
      u.searchParams.set("x-vercel-bypass", VERCEL_BYPASS);
      return u.pathname + u.search;
    } catch {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}x-vercel-bypass=${encodeURIComponent(VERCEL_BYPASS)}`;
    }
  }

  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}x-vercel-bypass=${encodeURIComponent(VERCEL_BYPASS)}`;
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, options);

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `HTTP ${res.status} ${res.statusText || ""}`.trim();
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return normalizeEntities(data);
}

// ================================
// Universal Proxy (eksterne mål) – beholdes
// ================================
export async function proxyFetch({
  path,
  method = "GET",
  query,
  body,
  headers = {},
} = {}) {
  if (!path || typeof path !== "string")
    throw new Error("proxyFetch: 'path' er påkrævet");

  const relPath = toWpRelative(path);
  const finalPath = withQuery(relPath, query);

  const payload = {
    destination: "telegiganten-wp",
    data: {
      method,
      path: finalPath,
      as_json: true,
      body: body ?? null,
      headers: { "Content-Type": "application/json", ...(headers || {}) },
    },
  };

  return httpJson(withBypass(PROXY_URL), {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(VERCEL_BYPASS ? { "x-vercel-protection-bypass": VERCEL_BYPASS } : {}),
    },
    body: JSON.stringify(payload),
  });
}

// ================================
// ✅ Direkte WP fetch via Vercel rewrites
// (forudsætter rewrite /wp-json/* -> https://telegiganten.dk/wp-json/*)
// ================================
export async function wpFetch({
  path,
  method = "GET",
  query,
  body,
  headers = {},
} = {}) {
  if (!path || typeof path !== "string")
    throw new Error("wpFetch: 'path' er påkrævet");

  const relPath = toWpRelative(path);
  const finalPath = withQuery(relPath, query);

  return httpJson(withBypass(finalPath), {
    method,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

// ================================
// Spare parts helpers (uændret)
// ================================
async function gasList({ offset = 0, limit = 400, search = "", lokation = "" } = {}) {
  const qs = new URLSearchParams();
  qs.set("offset", String(offset));
  qs.set("limit", String(limit));
  if (search) qs.set("search", search);
  if (lokation) qs.set("lokation", lokation);

  const url = withBypass(`/wp-json/telegiganten/v1/spareparts?${qs.toString()}`);
  return httpJson(url, { method: "GET", credentials: "omit" });
}

async function gasCreate(part) {
  return httpJson(withBypass(`/wp-json/telegiganten/v1/spareparts`), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part || {}),
  });
}

async function gasUpdate(id, patch) {
  return httpJson(withBypass(`/wp-json/telegiganten/v1/spareparts/${id}`), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {}),
  });
}

async function gasDelete(id) {
  return httpJson(withBypass(`/wp-json/telegiganten/v1/spareparts/${id}`), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _delete: true }),
  });
}

// ================================
// Fallback helpers (uændret)
// ================================
async function wpListV2({ offset = 0, limit = 100, search = "", lokation = "" } = {}) {
  const qs = new URLSearchParams();
  qs.set("offset", String(offset));
  qs.set("limit", String(limit));
  if (search) qs.set("search", search);
  if (lokation) qs.set("lokation", lokation);

  return httpJson(withBypass(`/wp-json/telegiganten/v1/spareparts?${qs.toString()}`), {
    method: "GET",
    credentials: "omit",
  });
}

async function wpCreateV2(part) {
  return httpJson(withBypass(`/wp-json/telegiganten/v1/spareparts`), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part || {}),
  });
}

async function wpPatchV2(id, patch, expectedUpdatedAt) {
  const body = { ...(patch || {}) };
  if (expectedUpdatedAt) body.expected_updated_at = expectedUpdatedAt;

  return httpJson(withBypass(`/wp-json/telegiganten/v1/spareparts/${id}`), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function wpDeleteV2(id) {
  return httpJson(withBypass(`/wp-json/telegiganten/v1/spareparts/${id}`), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _delete: true }),
  });
}

async function primaryThenFallback(primaryFn, fallbackFn) {
  try {
    return await primaryFn();
  } catch (e) {
    console.warn("Primary failed, falling back:", e?.message || e);
    return await fallbackFn();
  }
}

// Popular models helper (uændret)
async function getPopularModelsTop(limit = 20) {
  const data = await httpJson(withBypass(POPULAR_MODELS_URL), {
    method: "GET",
    credentials: "omit",
  });
  if (Array.isArray(data)) return data.slice(0, limit);
  if (Array.isArray(data?.models)) return data.models.slice(0, limit);
  return [];
}

// ================================
// API (det rigtige interface)
// ================================
export const api = {
  // Repairs (aka bookings)
  getRepairs: (opts = {}) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/repairs",
      query: opts,
    }),

  getRepairsForModel: (modelId, opts = {}) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/repairs",
      query: { model_id: modelId, ...(opts || {}) },
    }),

  createRepairTemplate: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/create-repair-template",
      method: "POST",
      body: data,
    }),

  createRepair: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/create-repair",
      method: "POST",
      body: data,
    }),

  createRepairOrder: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/create-repair-order",
      method: "POST",
      body: data,
    }),

  updateRepairWithHistory: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/update-repair-with-history",
      method: "POST",
      body: data,
    }),

  deleteRepair: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/delete-repair",
      method: "POST",
      body: data,
    }),

  // Customers
  getCustomers: () => wpFetch({ path: "/wp-json/telegiganten/v1/customers" }),
  getCustomersWithRepairs: () =>
    wpFetch({ path: "/wp-json/telegiganten/v1/customers-with-repairs" }),

  createCustomer: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/create-customer",
      method: "POST",
      body: data,
    }),

  // Brands / Models
  getBrands: () => wpFetch({ path: "/wp-json/telegiganten/v1/brands" }),

  getModelsByBrand: (brandId) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/models",
      query: { brand_id: brandId },
    }),

  getTopModels: () => wpFetch({ path: "/wp-json/telegiganten/v1/top-models" }),

  // Orders
  getOrders: () => wpFetch({ path: "/wp-json/telegiganten/v1/orders" }),

  getOrderById: (id) => wpFetch({ path: `/wp-json/telegiganten/v1/orders/${id}` }),

  createOrder: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/orders",
      method: "POST",
      body: data,
    }),

  updateOrder: (id, fields) =>
    wpFetch({
      path: `/wp-json/telegiganten/v1/orders/${id}`,
      method: "POST",
      body: { fields },
    }),

  // SMS
  sendSMS: (data) =>
    wpFetch({
      path: "/wp-json/telegiganten/v1/send-sms",
      method: "POST",
      body: data,
    }),

  // Spare parts
  spareparts: {
    list: (opts) => primaryThenFallback(() => gasList(opts), () => wpListV2(opts)),
    create: (part) => primaryThenFallback(() => gasCreate(part), () => wpCreateV2(part)),
    update: (id, patch, expectedUpdatedAt) =>
      primaryThenFallback(
        () => gasUpdate(id, patch),
        () => wpPatchV2(id, patch, expectedUpdatedAt)
      ),
    delete: (id) => primaryThenFallback(() => gasDelete(id), () => wpDeleteV2(id)),
  },

  // Popular models helper
  getPopularModelsTop,
};

// ================================
// ✅ LEGACY EXPORTS (kun dem du reelt bruger i projektet)
// ================================

// Bruges af DashboardRecentBookings.jsx + BookingsPage.jsx
export async function fetchBookings(query = {}) {
  return api.getRepairs(query);
}

// Bruges af BookingModal.jsx
export async function updateBookingStatus(bookingId, status, change_note = "Status opdateret") {
  if (!bookingId) throw new Error("updateBookingStatus: bookingId mangler");

  return api.updateRepairWithHistory({
    repair_id: Number(bookingId),
    fields: { status: String(status || "").toLowerCase() },
    change_note,
  });
}
