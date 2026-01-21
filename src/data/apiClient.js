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
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, normalizeEntities(v)]));
  }
  return obj;
}

// ===== Konfiguration =====
const WP_ORIGIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WP_ORIGIN) || "https://telegiganten.dk";

// Normaliser for sammenligning (fjern trailing slash)
const WP_ORIGIN_NORM = (WP_ORIGIN || "").replace(/\/+$/, "");

// Vercel-proxy ligger på samme origin som appen; brug RELATIV sti
const PROXY_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PROXY_URL) || "/wp-json/tg/v1/proxy";

const WP_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  `${WP_ORIGIN_NORM}/wp-json/telegiganten/v1`;

// Valgfrit: bypass-token hvis Deployment Protection er slået til
const VERCEL_BYPASS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VERCEL_BYPASS_TOKEN) ||
  (typeof window !== "undefined" && window.__VERCEL_BYPASS) ||
  "";

// --- POPULAR MODELS ENDPOINT (kan styres via .env)
const POPULAR_MODELS_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_POPULAR_MODELS_URL) ||
  "/wp-json/telegiganten/v1/top-models";

// ================================
// Hjælpere
// ================================
function withQuery(path, query) {
  if (!query || typeof query !== "object" || Object.keys(query).length === 0) return path;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${usp.toString()}`;
}

// Gør alle paths WP-relative. Afvis fremmede origins.
function toWpRelative(p) {
  if (!p) throw new Error("toWpRelative: path mangler");
  if (/^https?:\/\//i.test(p)) {
    const u = new URL(p);
    if (u.origin.replace(/\/+$/, "") !== WP_ORIGIN_NORM) {
      throw new Error(`Ekstern URL er ikke tilladt af WP-proxy: ${u.origin}`);
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
      u.searchParams.set("x-vercel-protection-bypass", VERCEL_BYPASS);
      return u.pathname + u.search; // behold relativ
    } catch {
      // falder igennem til string-mode
    }
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}x-vercel-protection-bypass=${encodeURIComponent(VERCEL_BYPASS)}`;
}

// Simpel fetch til eksterne endpoints (GAS m.m.)
async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "omit",
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
 * Direkte WP fetch (uden proxy) – bruges kun som fallback til Orders.
 * Denne rammer /wp-json/... på samme origin (Vercel), og afhænger derfor af dit vercel.json rewrite.
 */
async function wpDirectFetch({ path, method = "GET", query, body, headers = {} } = {}) {
  if (!path || typeof path !== "string") throw new Error("wpDirectFetch: 'path' er påkrævet");

  const relPath = toWpRelative(path);
  const finalPath = withQuery(relPath, query);

  const res = await fetch(withBypass(finalPath), {
    method,
    credentials: "omit",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`WP direct fejl: ${res.status} - ${msg}`);
  }

  return normalizeEntities(data);
}

/**
 * Sender en request gennem WP-proxyen.
 * - path: fx "/wp-json/telegiganten/v1/customers" (kan være absolut til WP_ORIGIN – konverteres)
 */
export async function proxyFetch({ path, method = "GET", query, body, headers = {} } = {}) {
  if (!path || typeof path !== "string") throw new Error("proxyFetch: 'path' er påkrævet");

  // Relativ sti til WP (plugin’et afviser absolutte eksterne URLs)
  const relPath = toWpRelative(path);
  const finalPath = withQuery(relPath, query);

  const payload = {
    destination: "telegiganten-wp",
    data: {
      method,
      path: finalPath, // RELATIV sti
      as_json: true,
      body: body ?? null,
      headers: { "Content-Type": "application/json", ...(headers || {}) },
    },
  };

  const res = await fetch(withBypass(PROXY_URL), {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(VERCEL_BYPASS ? { "x-vercel-protection-bypass": VERCEL_BYPASS } : {}),
    },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let errText;
    try {
      errText = await res.text();
    } catch {
      errText = `HTTP ${res.status}`;
    }
    throw new Error(`Proxy fejl: ${res.status} - ${errText}`);
  }

  const data = ct.includes("application/json") ? await res.json() : await res.text();
  return normalizeEntities(data);
}

// --- BOOKING API HELPERS ---
function normalizeBooking(b = {}) {
  const customer = b.customer || {};
  const booking = b.booking || {};
  const sel = b.selection || {};
  const totals = b.totals || {};

  const brandTitle = b.brand ?? sel.brand?.title ?? "";
  const modelTitle = b.model ?? sel.model?.title ?? sel.device?.title ?? "";

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
    totals: { total_price_before, total_price, total_time, discount },
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
 * Spareparts – v2 (SQL via WP)
 * ================================ */

// Kan bruges fra andre steder:
const env = (k) => (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[k]) || undefined;

// (legacy) GAS fallback beholdes til nødstilfælde
const ENV_GAS_URL = env("VITE_GAS_URL");
const ENV_GAS_EXEC = env("VITE_GAS_EXEC");
const SPAREPARTS_MODE =
  env("VITE_SPAREPARTS_MODE") ||
  ((ENV_GAS_URL || "").startsWith("/wp-json/") ? "wp" : undefined) ||
  (typeof window !== "undefined" && window.__SPAREPARTS_MODE) ||
  "wp"; // <-- default nu 'wp' (SQL)

// Base til GAS (kun fallback)
const GAS_BASE_URL =
  ENV_GAS_EXEC ||
  ENV_GAS_URL ||
  (typeof window !== "undefined" && (window.__GAS_URL || window.__SPAREPARTS_GAS_URL)) ||
  "";

// Normalisering til kanonisk shape
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
    updatedAt: obj.updatedAt ?? obj.updated_at ?? obj.UpdatedAt ?? "",
  };
}

// --- GAS fallback helpers (uændret) ---
async function gasList({ offset = 0, limit = 400, search = "", lokation = "" } = {}) {
  if (!GAS_BASE_URL) return [];
  const url = withQuery(GAS_BASE_URL, { action: "list", offset, limit, search, lokation });
  const data = await httpJson(url);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows.map(normSparepart);
}

async function gasCreate(part) {
  const url = withQuery(GAS_BASE_URL, { action: "create" });
  const payload = {
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
  const data = await httpJson(url, { method: "POST", body: JSON.stringify(payload) });
  return normSparepart(data?.item || data || payload);
}

async function gasUpdate(id, patch) {
  const url = withQuery(GAS_BASE_URL, { action: "update" });
  const payload = {
    id,
    Model: patch.model ?? "",
    SKU: patch.sku ?? "",
    Pris: patch.price ?? "",
    Lager: patch.stock ?? "",
    Lokation: patch.location ?? "",
    Kategori: patch.category ?? "",
    Kostpris: patch.cost_price ?? "",
    Reparation: patch.repair ?? "",
  };
  const data = await httpJson(url, { method: "POST", body: JSON.stringify(payload) });
  return normSparepart(data?.item || { id, ...patch });
}

async function gasDelete(id) {
  const url = withQuery(GAS_BASE_URL, { action: "delete", id });
  await httpJson(url, { method: "POST" });
  return { status: "deleted", id };
}

// --- WP v2 helpers (NYE) ---
async function wpListV2({ offset = 0, limit = 100, search = "", lokation = "" } = {}) {
  const data = await proxyFetch({
    path: "/wp-json/telegiganten/v1/spareparts-v2",
    method: "GET",
    query: { offset, limit, search, lokation },
  });
  const items = Array.isArray(data) ? data : data?.items || [];
  return {
    items: items.map(normSparepart),
    total: typeof data?.total === "number" ? data.total : items.length,
  };
}

async function wpCreateV2(part) {
  const body = {
    model: part.model ?? "",
    sku: part.sku ?? "",
    price: part.price ?? "",
    stock: part.stock ?? "",
    location: part.location ?? "",
    category: part.category ?? "",
    cost_price: part.cost_price ?? "",
    repair: part.repair ?? "",
  };
  const data = await proxyFetch({
    path: "/wp-json/telegiganten/v1/spareparts-v2",
    method: "POST",
    body,
  });
  return normSparepart(data?.item || data || body);
}

async function wpPatchV2(id, patch, expectedUpdatedAt) {
  const payload = { patch, expectedUpdatedAt: expectedUpdatedAt ?? null };
  const data = await proxyFetch({
    path: `/wp-json/telegiganten/v1/spareparts-v2/${id}`,
    method: "PATCH",
    body: payload,
  });
  return normSparepart(data?.item || data || { id, ...patch });
}

async function wpDeleteV2(id) {
  const data = await proxyFetch({
    path: `/wp-json/telegiganten/v1/spareparts-v2/${id}`,
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

// Hent top-N populære modeller fra backend
async function getPopularModelsTop(limit = 20) {
  const urlFromEnv =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_POPULAR_MODELS_URL) ||
    (typeof window !== "undefined" && window.__POPULAR_MODELS_URL) ||
    null;

  const url = urlFromEnv
    ? `${urlFromEnv}${urlFromEnv.includes("?") ? "&" : "?"}limit=${encodeURIComponent(limit)}`
    : `/wp-json/telegiganten/v1/top-models?limit=${encodeURIComponent(limit)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`getPopularModelsTop: ${res.status}`);
  const data = await res.json().catch(() => null);
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.models)) return data.models;
  if (Array.isArray(data.ids)) return data.ids.map((id) => ({ id }));
  if (Array.isArray(data.titles)) return data.titles.map((title) => ({ title }));
  return [];
}

/* ================================
 * API – hoved-objekt
 * ================================ */

export const api = {
  /* -------- Brands / modeller / skabeloner -------- */
  getBrands: () => proxyFetch({ path: "/wp-json/telegiganten/v1/brands" }),

  // createModel: default aktiv = 1
  createModel: ({ brand, brand_id, model, active = 1 }) =>
    proxyFetch({
      method: "POST",
      path: "/wp-json/telegiganten/v1/create-model",
      body: { brand, brand_id, model, active: active ? 1 : 0 },
    }),

  // updateModel: send kun eksplicit det vi vil ændre
  updateModel: ({ model_id, fields }) => {
    const f = {};
    if (fields?.model != null) f.model = String(fields.model).trim();
    if (fields?.active != null) f.active = fields.active ? 1 : 0;
    if (fields?.slug != null) f.slug = String(fields.slug).trim();
    if (fields?.brand_id != null) f.brand_id = Number(fields.brand_id) || 0;

    return proxyFetch({
      path: "/wp-json/telegiganten/v1/update-model",
      method: "POST",
      body: { model_id, fields: f },
    });
  },

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

  // NY: hent ALLE repairs (evt. kun aktive)
  getRepairs: (opts = {}) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/repairs",
      query: { active_only: opts.activeOnly ? 1 : undefined },
    }),

  // Opdateret: inkluder active_only
  getRepairsForModel: (modelId, opts = {}) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/repairs-by-model",
      query: { model_id: modelId, active_only: opts.activeOnly ? 1 : undefined },
    }),

  getTopModels: () => proxyFetch({ path: "/wp-json/telegiganten/v1/top-models" }),

  getPopularModelsTop: async (limit = 25) => {
    const data = await proxyFetch({
      path: "/wp-json/telegiganten/v1/top-models",
      method: "GET",
    });
    const arr = Array.isArray(data) ? data : [];
    return arr.slice(0, limit).map((m) => ({
      id: Number(m.id),
      title: String(m.title || ""),
    }));
  },

  getAllRepairs: (opts = {}) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/all-repairs",
      query: { active_only: opts.activeOnly ? 1 : undefined },
    }),

  createRepairTemplate: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-repair-template",
      method: "POST",
      body: data,
    }),

  updateRepair: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/update-repair",
      method: "POST",
      body: data,
    }),

  applyRepairChanges: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/apply-repair-changes",
      method: "POST",
      body: data,
    }),

  // Legacy navn (beholdes for kompatibilitet)
  deleteRepairTemplate: (repair_id) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/delete-repair",
      method: "POST",
      body: { repair_id },
    }),

  incrementModelUsage: (modelId) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/increment-model-usage",
      method: "POST",
      body: { model_id: modelId },
    }),

  /* ---------------------- Kunder ---------------------- */
  getCustomers: () => proxyFetch({ path: "/wp-json/telegiganten/v1/customers" }),
  getCustomersWithRepairs: () => proxyFetch({ path: "/wp-json/telegiganten/v1/customers-with-repairs" }),

  createCustomer: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-customer",
      method: "POST",
      body: data,
    }),

  updateCustomer: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/update-customer",
      method: "POST",
      body: data,
    }),

  getCustomerById: (id) => proxyFetch({ path: `/wp-json/telegiganten/v1/customer/${id}`, method: "GET" }),

  getCustomerByPhone: (phone) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/customer-by-phone",
      method: "GET",
      query: { phone },
    }),

  /* ---------------------- Ordrer (tg_repair) ---------------------- */
  getRepairOrders: () => proxyFetch({ path: "/wp-json/telegiganten/v1/repair-orders" }),

  createRepair: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-repair",
      method: "POST",
      body: data,
    }),

  createRepairOrder: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-repair",
      method: "POST",
      body: data,
    }),

  updateRepairWithHistory: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/update-repair-with-history",
      method: "POST",
      body: data,
    }),

  // ✅ Den “rigtige” delete, som RepairHistory (og andre) kan bruge ensartet
  deleteRepair: ({ repair_id }) => {
    const id = Number(repair_id) || 0;
    if (!id) throw new Error("deleteRepair: repair_id mangler/ugyldigt");
    return proxyFetch({
      path: "/wp-json/telegiganten/v1/delete-repair",
      method: "POST",
      body: { repair_id: id },
    });
  },

  // ✅ Alias: hvis noget UI kalder deleteRepairWithHistory
  deleteRepairWithHistory: ({ repair_id }) => {
    const id = Number(repair_id) || 0;
    if (!id) throw new Error("deleteRepairWithHistory: repair_id mangler/ugyldigt");
    return proxyFetch({
      path: "/wp-json/telegiganten/v1/delete-repair",
      method: "POST",
      body: { repair_id: id },
    });
  },

  getNextOrderId: async () => {
    const res = await proxyFetch({
      path: "/wp-json/telegiganten/v1/order-id/reserve",
      method: "POST",
      body: {},
    });
    if (!res || typeof res.id === "undefined") throw new Error("Ugyldigt svar fra order-id/reserve");
    return res.id;
  },

  /* ---------------------- Bookinger ---------------------- */
  getBookings: (args = {}) => fetchBookings(args),

  /* ---------------------- Spareparts (v2 + GAS fallback) ---------------------- */
  async getSpareParts(params = {}) {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpListV2(params), () => gasList(params));
    }
    return primaryThenFallback(() => gasList(params), () => wpListV2(params));
  },

  createSparePart: (part) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpCreateV2(part), () => gasCreate(part));
    }
    return primaryThenFallback(() => gasCreate(part), () => wpCreateV2(part));
  },

  updateSparePart: (id, patch, expectedUpdatedAt = null) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpPatchV2(id, patch, expectedUpdatedAt), () => gasUpdate(id, patch));
    }
    return primaryThenFallback(() => gasUpdate(id, patch), () => wpPatchV2(id, patch, expectedUpdatedAt));
  },

  deleteSparePart: (id) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpDeleteV2(id), () => gasDelete(id));
    }
    return primaryThenFallback(() => gasDelete(id), () => wpDeleteV2(id));
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

  /* -------- Bestillinger -------- */

  // Kun Orders: prøv proxy først → fallback til direct (så vi ikke rører alt andet)
  getOrders: async () => {
    try {
      return await proxyFetch({ path: "/wp-json/telegiganten/v1/orders" });
    } catch (e) {
      console.warn("[orders] proxy fejlede, prøver direct:", e?.message || e);
      return wpDirectFetch({ path: "/wp-json/telegiganten/v1/orders" });
    }
  },

  getOrderById: async (order_id) => {
    try {
      return await proxyFetch({ path: `/wp-json/telegiganten/v1/orders/${order_id}` });
    } catch (e) {
      console.warn("[orders] proxy fejlede, prøver direct:", e?.message || e);
      return wpDirectFetch({ path: `/wp-json/telegiganten/v1/orders/${order_id}` });
    }
  },

  createOrder: async (payload) => {
    try {
      return await proxyFetch({
        path: "/wp-json/telegiganten/v1/orders",
        method: "POST",
        body: payload,
      });
    } catch (e) {
      console.warn("[orders] proxy fejlede, prøver direct:", e?.message || e);
      return wpDirectFetch({
        path: "/wp-json/telegiganten/v1/orders",
        method: "POST",
        body: payload,
      });
    }
  },

  updateOrder: async ({ order_id, fields }) => {
    try {
      return await proxyFetch({
        path: `/wp-json/telegiganten/v1/orders/${order_id}`,
        method: "POST",
        body: { fields },
      });
    } catch (e) {
      console.warn("[orders] proxy fejlede, prøver direct:", e?.message || e);
      return wpDirectFetch({
        path: `/wp-json/telegiganten/v1/orders/${order_id}`,
        method: "POST",
        body: { fields },
      });
    }
  },

  /* ---------------------- SMS ---------------------- */
  sendSMS: ({ to, body, repair_id }) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/send-sms",
      method: "POST",
      body: { to, body, repair_id },
    }),
};
