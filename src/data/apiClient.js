// src/data/apiClient.js
const PROXY_URL = "/wp-json/tg/v1/proxy";

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
 * Sender en request gennem WP-proxyen.
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
      headers,
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

export const api = {
  /* ---------------------- Brands / modeller / skabeloner ---------------------- */
  getBrands: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/brands" }),

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

  getTopModels: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/top-models" }),

  // All-in-one struktur til EditRepairsPage
  getAllRepairs: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/all-repairs" }),

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
  getCustomers: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/customers" }),

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

  // Opret ORDRE (ikke skabelon)
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
};
