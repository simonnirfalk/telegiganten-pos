// src/data/apiClient.js
const PROXY_URL = "/wp-json/tg/v1/proxy";

/** ================================
 *  Hjælpere
 *  ================================ */

/**
 * Bygger en URL-sti med query params.
 */
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

/**
 * Simpel fetch der forventer JSON (bruges til eksterne endpoints – f.eks. GAS).
 */
async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok)
    throw new Error(
      `HTTP ${res.status} - ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`
    );
  return payload;
}

/**
 * Sender en request gennem WP-proxyen (til WordPress på telegiganten.dk).
 *  - path: mål-endpoint på telegiganten.dk (fx "/wp-json/telegiganten/v1/customers")
 *  - method: GET/POST/PATCH/DELETE
 *  - query: object med query params (fx { model_id: 123 })
 *  - body: vil blive JSON-serialiseret (sendes som application/json)
 *  - headers: evt. ekstra headers
 */
export async function proxyFetch({
  path,
  method = "GET",
  query,
  body,
  headers = {},
} = {}) {
  if (!path || typeof path !== "string") {
    throw new Error("proxyFetch: 'path' er påkrævet");
  }

  const finalPath = withQuery(path, query);

  // Payload som WP-proxy forventer
  const payload = {
    destination: "telegiganten-wp",
    data: {
      method,
      path: finalPath,
      as_json: true,
      body: body ?? null,
      // Tving JSON-headers ind i proxien (fletter brugerens headers ind)
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

/** ================================
 *  Spareparts – konfiguration
 *  ================================ */

// Mode: "gas" (default) eller "wp". Kan overstyres via env eller global.
const SPAREPARTS_MODE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SPAREPARTS_MODE) ||
  (typeof window !== "undefined" && window.__SPAREPARTS_MODE) ||
  "gas";

// Google Apps Script webapp base URL (skal returnere JSON til de handlinger vi kalder)
const GAS_BASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SPAREPARTS_GAS_URL) ||
  "https://script.google.com/macros/s/PASTE_YOUR_DEPLOYMENT_ID/exec";

/** Normalisering til kanonisk shape */
function normSparepart(obj) {
  if (!obj || typeof obj !== "object") return null;

  // WP forventet (snake/lowercase). Mapper hvis muligt.
  const fromWp = {
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
  return fromWp;
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

/** Mapper til GAS payload/parametre */
function toGasPayload(part) {
  // Vi sender felter med de labels der findes i arket (jvf. Code.gs -> COL_KEYS)
  return {
    id: part.id, // bruges kun til update/delete (rowIndex eller egen id fra webappen)
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

/** GAS actions helpers */
async function gasList({ offset = 0, limit = 400, search = "", lokation = "" } = {}) {
  // Forvent at webappen understøtter disse query-parametre og svarer med:
  // { rows: [...], total, capped } hvor rows er i ark-format (Model, Pris, ...)
  const url = withQuery(GAS_BASE_URL, { action: "list", offset, limit, search, lokation });
  const data = await httpJson(url);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows.map(normSparepart);
}

async function gasCreate(part) {
  const url = withQuery(GAS_BASE_URL, { action: "create" });
  const payload = toGasPayload(part);
  const data = await httpJson(url, { method: "POST", body: JSON.stringify(payload) });
  // Forvent at svare med det oprettede objekt (inkl. rowIndex/id)
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
  // WP kan returnere {status:'created', item:{...}} eller bare posten – normalisér:
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

/** Sikker wrapper: prøv primær kilde → fallback til sekundær kilde */
async function primaryThenFallback(primaryFn, fallbackFn) {
  try {
    return await primaryFn();
  } catch (err) {
    console.warn("[spareparts] primær kilde fejlede, prøver fallback:", err?.message || err);
    return await fallbackFn();
  }
}

/** ================================
 *  API – eksisterende + reservedele
 *  ================================ */

export const api = {
  /* ---------------------- Brands / modeller / skabeloner ---------------------- */
  getBrands: () => proxyFetch({ path: "/wp-json/telegiganten/v1/brands" }),

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
  getRepairOrders: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/repair-orders" }),

  // Opret ORDRE (ikke skabelon) – Step2 kalder createRepair
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
  // Hent liste (valgfri params til fremtidig brug: { search, offset, limit, lokation })
  getSpareParts: (params = {}) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpList(), () => gasList(params));
    }
    return primaryThenFallback(() => gasList(params), () => wpList());
  },

  // Opret
  createSparePart: (part) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpCreate(part), () => gasCreate(part));
    }
    return primaryThenFallback(() => gasCreate(part), () => wpCreate(part));
  },

  // Opdater (id, patch)
  updateSparePart: (id, patch) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(
        () => wpUpdate(id, patch),
        () => gasUpdate(id, patch)
      );
    }
    return primaryThenFallback(
      () => gasUpdate(id, patch),
      () => wpUpdate(id, patch)
    );
  },

  // Slet
  deleteSparePart: (id) => {
    if (SPAREPARTS_MODE === "wp") {
      return primaryThenFallback(() => wpDelete(id), () => gasDelete(id));
    }
    return primaryThenFallback(() => gasDelete(id), () => wpDelete(id));
  },
};
