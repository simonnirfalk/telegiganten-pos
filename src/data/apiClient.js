// src/data/apiClient.js
const PROXY_URL = "/wp-json/tg/v1/proxy";

/* ================================
 * Hjælpere
 * ================================ */

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

/** Simpel fetch der forventer JSON (bruges til eksterne endpoints – f.eks. GAS). */
async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} - ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`
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

  const finalPath = withQuery(path, query);

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

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

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
  const booking  = b.booking  || {};
  const sel      = b.selection || {};
  const totals   = b.totals || {};

  const brandTitle = b.brand ?? sel.brand?.title ?? "";
  const modelTitle = b.model ?? sel.model?.title ?? sel.device?.title ?? "";

  // Ensartede totals
  const total_price_before = totals.total_price_before ?? totals.price_before ?? 0;
  const total_price        = totals.total_price        ?? totals.price        ?? 0;
  const total_time         = totals.total_time         ?? totals.time         ?? 0;
  const discount           = totals.discount           ?? totals.discount_pct ?? 0;

  return {
    ...b,

    // Kunde (top-level aliases)
    customer_name:  b.customer_name  ?? customer.name  ?? "",
    customer_phone: b.customer_phone ?? customer.phone ?? "",
    customer_email: b.customer_email ?? customer.email ?? "",

    // Booking meta (top-level aliases)
    date:            b.date            ?? booking.date            ?? "",
    time:            b.time            ?? booking.time            ?? "",
    shipping_option: b.shipping_option ?? booking.shipping_option ?? "",
    comment:         b.comment         ?? booking.comment         ?? "",

    // Enhed/valg (top-level aliases)
    brand:    brandTitle,
    model:    modelTitle,
    model_id: b.model_id ?? sel.model?.id ?? 0,
    repairs:  b.repairs ?? sel.repairs ?? [],

    // Totals i fast struktur
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

  if (Array.isArray(res)) {
    // sjældent – men understøttes
    return res.map(normalizeBooking);
  }
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
  // booking kan være enten raw eller allerede normaliseret
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
  const repairTitles = (b.repairs || []).map(r => r?.name).filter(Boolean);
  const repairTitle  = repairTitles[0] || "Reparation";
  const title        = `${b.model || "Enhed"} – ${repairTitle}`;
  const deviceLabel  = [b.brand, b.model].filter(Boolean).join(" ");

  const payload = {
    title,
    model_id: b.model_id || 0,
    price: b.totals?.total_price ?? 0,
    time:  b.totals?.total_time  ?? 0,
    device: deviceLabel,
    repair: repairTitles.join(", "),
    order_id: "",
    customer_id,

    // ekstra felter til Step1
    customer: b.customer_name || "",
    phone:    b.customer_phone || "",
    contact:  b.customer_email || "",
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
  env("VITE_GAS_URL") ||
  env("VITE_SPAREPARTS_GAS_URL") ||
  (typeof window !== "undefined" && (window.__GAS_URL || window.__SPAREPARTS_GAS_URL)) ||
  "https://script.google.com/macros/s/PASTE_YOUR_DEPLOYMENT_ID/exec";

if (GAS_BASE_URL.includes("PASTE_YOUR_DEPLOYMENT_ID")) {
  console.warn(
    "[spareparts] GAS_BASE_URL mangler. Sæt VITE_GAS_URL i .env eller window.__GAS_URL i runtime."
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

  /** Opret model (telegiganten_model) */
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
      body: {
        model_id,
        fields: { model: fields?.model?.trim() }
      }
    }),

  /** Opret mange repair-skabeloner i ét hug (pris=0, tid=0, aktiv=0) */
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

  // All-in-one struktur til EditRepairsPage
  getAllRepairs: () => proxyFetch({ path: "/wp-json/telegiganten/v1/all-repairs" }),

  // Opret SKABELON (telegiganten_repair)
  createRepairTemplate: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-repair-template",
      method: "POST",
      body: data,
    }),

  // Opdater (virker til både tg_repair og telegiganten_repair)
  updateRepair: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/update-repair",
      method: "POST",
      body: data,
    }),

  // Global apply (skabeloner)
  applyRepairChanges: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/apply-repair-changes",
      method: "POST",
      body: data,
    }),

  // Slet SKABELON (telegiganten_repair)
  deleteRepairTemplate: (repair_id) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/delete-repair",
      method: "POST",
      body: { repair_id },
    }),

  // Bump popularitet på model
  incrementModelUsage: (modelId) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/increment-model-usage",
      method: "POST",
      body: { model_id: modelId },
    }),

  /* ---------------------- Kunder ---------------------- */
  getCustomers: () => proxyFetch({ path: "/wp-json/telegiganten/v1/customers" }),
  getCustomersWithRepairs: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/customers-with-repairs" }),

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

  getCustomerById: (id) =>
    proxyFetch({
      path: `/wp-json/telegiganten/v1/customer/${id}`,
      method: "GET",
    }),

  getCustomerByPhone: (phone) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/customer-by-phone",
      method: "GET",
      query: { phone },
    }),

  /* ---------------------- Ordrer (tg_repair) ---------------------- */
  getRepairOrders: () => proxyFetch({ path: "/wp-json/telegiganten/v1/repair-orders" }),

  // Opret ORDRE (ikke skabelon)
  createRepair: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-repair",
      method: "POST",
      body: data,
    }),

  // Alias til bagudkompatibilitet
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

  /** NYT: returnerer direkte download-URL til CSV-eksport (samme origin) */
  getExportUrl(type) {
    const t = encodeURIComponent(type || "");
    return `/wp-json/telegiganten/v1/export?type=${t}`;
  },

  /** NYT: multipart upload direkte til WP (ikke gennem proxy) */
  async importCSV(type, file) {
    if (!type) throw new Error("Mangler type");
    if (!file) throw new Error("Mangler fil");
    const form = new FormData();
    form.append("type", type);
    form.append("file", file);
    const res = await fetch(`/wp-json/telegiganten/v1/import`, {
      method: "POST",
      credentials: "include",
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
