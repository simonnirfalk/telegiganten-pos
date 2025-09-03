// src/data/apiClient.js

// ===== Konfiguration (Vercel-friendly) =====
const WP_ORIGIN =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_WP_ORIGIN) ||
  "https://telegiganten.dk";

const PROXY_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_PROXY_URL) ||
  `${WP_ORIGIN}/wp-json/tg/v1/proxy`;

const WP_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  `${WP_ORIGIN}/wp-json/telegiganten/v1`;

const GAS_BASE_URL_ENV =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GAS_URL) ||
  "";

// Vercel Security Checkpoint bypass token (læses fra Vite env eller window)
const VERCEL_BYPASS_TOKEN =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_VERCEL_BYPASS_TOKEN) ||
  (typeof window !== "undefined" && window.__VERCEL_BYPASS_TOKEN) ||
  "";

/* ================================
 * Hjælpere
 * ================================ */

/** Er en URL (string) same-origin ift. den kørende app? */
function isSameOrigin(url) {
  if (typeof window === "undefined") return false;
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const u = new URL(url, window.location.href);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Bygger en URL-sti med query params. */
function withQuery(path, query) {
  if (!query || typeof query !== "object" || Object.keys(query).length === 0) {
    return path;
  }
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${usp.toString()}`;
}

/** Sæt Vercel bypass-cookie, hvis muligt. */
async function ensureVercelBypassCookie() {
  if (typeof window === "undefined") return false;
  if (!VERCEL_BYPASS_TOKEN) return false;

  try {
    const u = new URL(window.location.href);
    u.searchParams.set("x-vercel-set-bypass-cookie", "true");
    u.searchParams.set("x-vercel-protection-bypass", VERCEL_BYPASS_TOKEN);
    // Same-origin: send cookies med så Vercel kan sætte den nye.
    await fetch(u.toString(), { credentials: "include" });
    return true;
  } catch (err) {
    console.warn("[vercel-bypass] Kunne ikke sætte cookie:", err);
    return false;
  }
}

/** Simpel fetch der forventer JSON (bruges til eksterne endpoints – f.eks. GAS). */
async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "omit", // eksternt
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} - ${typeof payload === "string" ? payload : JSON.stringify(payload)}`
    );
  }
  return payload;
}

/**
 * Sender en request gennem WP-proxyen (til WordPress på telegiganten.dk).
 *  - path: mål-endpoint (fx "/wp-json/telegiganten/v1/customers")
 *  - method: GET/POST/PATCH/DELETE
 *  - query: object med query params
 *  - body: JSON-serialiseres
 */
export async function proxyFetch({ path, method = "GET", query, body, headers = {} } = {}) {
  if (!path || typeof path !== "string") throw new Error("proxyFetch: 'path' er påkrævet");

  // Sørg for at path er ABSOLUT mod WP (så vi undgår fejl på Vercel-origin)
  const absolutePath = path.startsWith("http")
    ? path
    : `${WP_ORIGIN}${path.startsWith("/") ? "" : "/"}${path.replace(/^\//, "")}`;

  const finalPath = withQuery(absolutePath, query);

  const payload = {
    destination: "telegiganten-wp",
    data: {
      method,
      path: finalPath, // absolut URL til WP REST
      as_json: true,
      body: body ?? null,
      headers: { "Content-Type": "application/json", ...(headers || {}) },
    },
  };

  const sameOrigin = isSameOrigin(PROXY_URL);
  const baseHeaders = { "Content-Type": "application/json" };
  if (sameOrigin && VERCEL_BYPASS_TOKEN) {
    baseHeaders["x-vercel-protection-bypass"] = VERCEL_BYPASS_TOKEN;
  }

  // 1. forsøg
  let res = await fetch(PROXY_URL, {
    method: "POST",
    headers: baseHeaders,
    credentials: sameOrigin ? "include" : "omit",
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  // Hvis Vercel Security Checkpoint blokerer (401/403), så sæt cookie og prøv igen
  if ((res.status === 401 || res.status === 403) && sameOrigin && VERCEL_BYPASS_TOKEN) {
    await ensureVercelBypassCookie();

    res = await fetch(PROXY_URL, {
      method: "POST",
      headers: baseHeaders,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  }

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    let errText;
    try {
      errText = await res.text();
    } catch {
      errText = `HTTP ${res.status}`;
    }
    throw new Error(`Proxy fejl: ${res.status} - ${errText}`);
  }
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

/* ===== (ALIAS) Named exports til bagudkompatibilitet ===== */
export async function createModel({ brand, brand_id, model }) {
  return proxyFetch({
    method: "POST",
    path: "/wp-json/telegiganten/v1/create-model",
    body: { brand, brand_id, model },
  }); // -> { status: "created", model_id }
}

export async function bulkCreateRepairTemplates({
  model_id,
  titles,
  price = 0,
  time = 0,
  active = 0,
}) {
  return proxyFetch({
    method: "POST",
    path: "/wp-json/telegiganten/v1/bulk-create-repair-templates",
    body: { model_id, titles, price, time, active },
  });
}

// --- BOOKING API HELPERS ---

/** Gør bookings ensartede uanset om API'et returnerer fladt eller nested. */
function normalizeBooking(b = {}) {
  const customer = b.customer || {};
  const booking = b.booking || {};
  const sel = b.selection || {};
  const totals = b.totals || {};

  const brandTitle = b.brand ?? sel.brand?.title ?? "";
  const modelTitle = b.model ?? sel.model?.title ?? sel.device?.title ?? "";

  // Ensartede totals
  const total_price_before = totals.total_price_before ?? totals.price_before ?? 0;
  const total_price = totals.total_price ?? totals.price ?? 0;
  const total_time = totals.total_time ?? totals.time ?? 0;
  const discount = totals.discount ?? totals.discount_pct ?? 0;

  return {
    ...b,
    customer_name: b.customer_name ?? customer.name ?? "",
    customer_phone: b.customer_phone ?? customer.phone ?? "",
    customer_email: b.customer_email ?? customer.email ?? "",
    date: b.date ?? booking.date ?? "",
    time: b.time ?? booking.time ?? "",
    shipping_option: b.shipping_option ?? booking.shipping_option ?? "",
    comment: b.comment ?? booking.comment ?? "",
    brand: brandTitle,
    model: modelTitle,
    model_id: b.model_id ?? sel.model?.id ?? 0,
    repairs: b.repairs ?? sel.repairs ?? [],
    totals: {
      total_price_before,
      total_price,
      total_time,
      discount,
    },
  };
}

export async function fetchBookings({ status = "", search = "", page = 1, per_page = 50 } = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (search) qs.set("search", search);
  qs.set("page", page);
  qs.set("per_page", per_page);

  const res = await proxyFetch({ path: `/wp-json/telegiganten/v1/bookings?${qs.toString()}` });

  if (Array.isArray(res)) return res.map(normalizeBooking);
  const items = Array.isArray(res?.items) ? res.items.map(normalizeBooking) : [];
  return { ...res, items };
}

export async function updateBookingStatus({ booking_id, status, notify = true }) {
  return proxyFetch({
    path: "/wp-json/telegiganten/v1/update-booking-status",
    method: "POST",
    body: { booking_id, status, notify },
  });
}

export async function createRepairFromBooking(booking) {
  const b = normalizeBooking(booking);

  // 1) find/opret kunde ud fra telefon
  const phone = b.customer_phone || "";
  let customer;
  try {
    customer = await proxyFetch({
      path: `/wp-json/telegiganten/v1/customer-by-phone`,
      method: "GET",
      query: { phone },
    });
  } catch {
    customer = null;
  }

  let customer_id = customer?.id || 0;
  if (!customer_id) {
    const res = await proxyFetch({
      path: "/wp-json/telegiganten/v1/create-customer",
      method: "POST",
      body: {
        name: b.customer_name || "Uden navn",
        phone: b.customer_phone || "",
        email: b.customer_email || "",
      },
    });
    customer_id = res?.customer_id || 0;
  }

  // 2) opret repair-ordre
  const repairTitles = (b.repairs || []).map((r) => r?.name).filter(Boolean);
  const repairTitle = repairTitles[0] || "Reparation";
  const title = `${b.model || "Enhed"} – ${repairTitle}`;
  const deviceLabel = [b.brand, b.model].filter(Boolean).join(" ");

  const payload = {
    title,
    model_id: b.model_id || 0,
    price: b.totals?.total_price ?? 0,
    time: b.totals?.total_time ?? 0,
    device: deviceLabel,
    repair: repairTitles.join(", "),
    order_id: "",
    customer_id,
    customer: b.customer_name || "",
    phone: b.customer_phone || "",
    contact: b.customer_email || "",
    status: "Ny",
    note: (b.comment || "").trim(),
  };

  const res = await proxyFetch({
    path: "/wp-json/telegiganten/v1/create-repair",
    method: "POST",
    body: payload,
  });

  return { repair_id: res?.repair_id, customer_id };
}

/* ================================
 * Spareparts – konfiguration
 * ================================ */

const env = (k) =>
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[k]) || undefined;

// Mode: "gas" (default) eller "wp"
const SPAREPARTS_MODE =
  env("VITE_SPAREPARTS_MODE") ||
  (typeof window !== "undefined" && window.__SPAREPARTS_MODE) ||
  "gas";

/** GAS base URL prioritet */
const GAS_BASE_URL =
  GAS_BASE_URL_ENV ||
  env("VITE_SPAREPARTS_GAS_URL") ||
  (typeof window !== "undefined" && (window.__GAS_URL || window.__SPAREPARTS_GAS_URL)) ||
  "";

if (!GAS_BASE_URL) {
  console.warn(
    "[spareparts] GAS_BASE_URL mangler. Sæt VITE_GAS_URL i Vercel env eller window.__GAS_URL i runtime."
  );
}

/** Normalisering til kanonisk shape */
function normSparepart(obj) {
  if (!obj || typeof obj !== "object") return null;
  return {
    id: obj.id ?? obj.ID ?? obj.rowIndex ?? null,
    model: obj.model ?? obj.Model ?? "",
    sku: obj.sku ?? obj.SKU ?? "",
    price: obj.price ?? obj.Pris ?? "",
    stock: obj.stock ?? obj.Lager ?? "",
    location: obj.location ?? obj.Lokation ?? "",
    category: obj.category ?? obj.Kategori ?? "",
    cost_price: obj.cost_price ?? obj.Kostpris ?? "",
    repair: obj.repair ?? obj.Reparation ?? "",
  };
}

/** Mapper til WP body */
function toWpBody(part) {
  return {
    id: part.id,
    model: part.model ?? "",
    sku: part.sku ?? "",
    price: part.price ?? "",
    stock: part.stock ?? "",
    location: part.location ?? "",
    category: part.category ?? "",
    cost_price: part.cost_price ?? "",
    repair: part.repair ?? "",
  };
}

/** Mapper til GAS payload */
function toGasPayload(part) {
  return {
    id: part.id,
    Model: part.model ?? "",
    SKU: part.sku ?? "",
    Pris: part.price ?? "",
    Lager: part.stock ?? "",
    Lokation: part.location ?? "",
    Kategori: part.category ?? "",
    Kostpris: part.cost_price ?? "",
    Reparation: part.repair ?? "",
  };
}

/** GAS helpers */
async function gasList({ offset = 0, limit = 400, search = "", lokation = "" } = {}) {
  const url = withQuery(GAS_BASE_URL, { action: "list", offset, limit, search, lokation });
  const data = await httpJson(url);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows.map(normSparepart);
}
async function gasCreate(part) {
  const url = withQuery(GAS_BASE_URL, { action: "create" });
  const payload = toGasPayload(part);
  const data = await httpJson(url, { method: "POST", body: JSON.stringify(payload) });
  return normSparepart(data?.item || data || payload);
}
async function gasUpdate(id, patch) {
  const url = withQuery(GAS_BASE_URL, { action: "update" });
  const payload = { id, ...toGasPayload(patch) };
  const data = await httpJson(url, { method: "POST", body: JSON.stringify(payload) });
  return normSparepart(data?.item || { id, ...patch });
}
async function gasDelete(id) {
  const url = withQuery(GAS_BASE_URL, { action: "delete", id });
  await httpJson(url, { method: "POST" });
  return { status: "deleted", id };
}

/** WP helpers (via proxy) */
async function wpList() {
  const data = await proxyFetch({ path: "/wp-json/telegiganten/v1/spareparts" });
  const arr = Array.isArray(data) ? data : data?.items || [];
  return arr.map(normSparepart);
}
async function wpCreate(part) {
  const data = await proxyFetch({
    path: "/wp-json/telegiganten/v1/spareparts",
    method: "POST",
    body: toWpBody(part),
  });
  const item = data?.item || data;
  return normSparepart(item);
}
async function wpUpdate(id, patch) {
  const data = await proxyFetch({
    path: `/wp-json/telegiganten/v1/spareparts/${id}`,
    method: "PUT",
    body: toWpBody({ id, ...patch }),
  });
  const item = data?.item || data;
  return normSparepart(item || { id, ...patch });
}
async function wpDelete(id) {
  const data = await proxyFetch({
    path: `/wp-json/telegiganten/v1/spareparts/${id}`,
    method: "DELETE",
  });
  return data || { status: "deleted", id };
}

/** Sikker wrapper: primær → fallback */
async function primaryThenFallback(primaryFn, fallbackFn) {
  try {
    return await primaryFn();
  } catch (err) {
    console.warn("[spareparts] primær kilde fejlede, prøver fallback:", err?.message || err);
    return await fallbackFn();
  }
}

/* ================================
 * API – hoved-objekt
 * ================================ */

export const api = {
  /* -------- Brands / modeller / skabeloner -------- */
  getBrands: () => proxyFetch({ path: "/wp-json/telegiganten/v1/brands" }),

  createModel: ({ brand, brand_id, model }) =>
    proxyFetch({
      method: "POST",
      path: "/wp-json/telegiganten/v1/create-model",
      body: { brand, brand_id, model },
    }),

  updateModel: ({ model_id, fields }) =>
    proxyFetch({
      path: `/wp-json/telegiganten/v1/update-model`,
      method: "POST",
      body: { model_id, fields: { model: fields?.model?.trim() } },
    }),

  bulkCreateRepairTemplates: ({ model_id, titles, price = 0, time = 0, active = 0 }) =>
    proxyFetch({
      method: "POST",
      path: "/wp-json/telegiganten/v1/bulk-create-repair-templates",
      body: { model_id, titles, price, time, active },
    }),

  getModelsByBrand: (brandId) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/models",
      query: { brand_id: brandId },
    }),

  getRepairsForModel: (modelId) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/repairs-by-model",
      query: { model_id: modelId },
    }),

  getTopModels: () => proxyFetch({ path: "/wp-json/telegiganten/v1/top-models" }),

  getAllRepairs: () => proxyFetch({ path: "/wp-json/telegiganten/v1/all-repairs" }),

  createRepairTemplate: (data) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/create-repair-template", method: "POST", body: data }),

  updateRepair: (data) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/update-repair", method: "POST", body: data }),

  applyRepairChanges: (data) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/apply-repair-changes", method: "POST", body: data }),

  deleteRepairTemplate: (repair_id) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/delete-repair", method: "POST", body: { repair_id } }),

  incrementModelUsage: (modelId) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/increment-model-usage", method: "POST", body: { model_id: modelId } }),

  /* ---------------------- Kunder ---------------------- */
  getCustomers: () => proxyFetch({ path: "/wp-json/telegiganten/v1/customers" }),
  getCustomersWithRepairs: () => proxyFetch({ path: "/wp-json/telegiganten/v1/customers-with-repairs" }),

  createCustomer: (data) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/create-customer", method: "POST", body: data }),

  updateCustomer: (data) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/update-customer", method: "POST", body: data }),

  getCustomerById: (id) => proxyFetch({ path: `/wp-json/telegiganten/v1/customer/${id}`, method: "GET" }),

  getCustomerByPhone: (phone) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/customer-by-phone", method: "GET", query: { phone } }),

  /* ---------------------- Ordrer (tg_repair) ---------------------- */
  getRepairOrders: () => proxyFetch({ path: "/wp-json/telegiganten/v1/repair-orders" }),

  createRepair: (data) => proxyFetch({ path: "/wp-json/telegiganten/v1/create-repair", method: "POST", body: data }),

  createRepairOrder: (data) => proxyFetch({ path: "/wp-json/telegiganten/v1/create-repair", method: "POST", body: data }),

  updateRepairWithHistory: (data) =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/update-repair-with-history", method: "POST", body: data }),

  /* ---------------------- Spareparts (dual-source) ---------------------- */
  getSpareParts: (params = {}) => {
    if (SPAREPARTS_MODE === "wp") return primaryThenFallback(() => wpList(), () => gasList(params));
    return primaryThenFallback(() => gasList(params), () => wpList());
  },

  createSparePart: (part) => {
    if (SPAREPARTS_MODE === "wp") return primaryThenFallback(() => wpCreate(part), () => gasCreate(part));
    return primaryThenFallback(() => gasCreate(part), () => wpCreate(part));
  },

  updateSparePart: (id, patch) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpUpdate(id, patch), () => gasUpdate(id, patch));
    }
    return primaryThenFallback(() => gasUpdate(id, patch), () => wpUpdate(id, patch));
  },

  deleteSparePart: (id) => {
    if (SPAREPARTS_MODE === "wp") return primaryThenFallback(() => wpDelete(id), () => gasDelete(id));
    return primaryThenFallback(() => gasDelete(id), () => wpDelete(id));
  },

  /* ---------------------- CSV Import / Export ---------------------- */
  getExportUrl(type) {
    const t = encodeURIComponent(type || "");
    return `${WP_API_BASE}/export?type=${t}`;
  },

  async importCSV(type, file) {
    if (!type) throw new Error("Mangler type");
    if (!file) throw new Error("Mangler fil");
    const form = new FormData();
    form.append("type", type);
    form.append("file", file);
    const res = await fetch(`${WP_API_BASE}/import`, {
      method: "POST",
      credentials: "omit",
      body: form,
    });
    if (!res.ok) {
      let msg = `Serverfejl (${res.status})`;
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  /* ---------------------- SMS ---------------------- */
  sendSMS: ({ to, body, repair_id }) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/send-sms",
      method: "POST",
      body: { to, body, repair_id },
    }),
};
