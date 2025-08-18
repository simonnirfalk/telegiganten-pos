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
 * Du kan give:
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

  // Payload som WP-proxyforventning
  const payload = {
    destination: "telegiganten-wp",
    data: {
      method,
      path: finalPath,
      as_json: true,
      // Videresend body (som JSON). WP-proxyen bør sende denne videre som raw JSON.
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
  /* ---------------------- Brands / modeller / repairs (skabeloner) ---------------------- */
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

  /* ---------------------- Kunder ---------------------- */
  getCustomers: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/customers" }),

  createCustomer: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-customer",
      method: "POST",
      body: data,
    }),

  // 🔹 NY: brugt af EditCustomerModal
  updateCustomer: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/update-customer",
      method: "POST",
      body: data,
    }),

  getCustomersWithRepairs: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/customers-with-repairs" }),

  /* ---------------------- Ordrer (tg_repair) ---------------------- */
  getRepairOrders: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/repair-orders" }),

  createRepair: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/create-repair",
      method: "POST",
      body: data,
    }),

  updateRepair: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/update-repair",
      method: "POST",
      body: data,
    }),

  updateRepairWithHistory: (data) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/update-repair-with-history",
      method: "POST",
      body: data,
    }),

  /* ---------------------- Øvrigt ---------------------- */
  // Bemærk: Disse to routes eksisterer ikke i det WP-plugin vi har gennemgået.
  // De står her fordi andre dele af projektet muligvis refererer til dem (fx SparePartsPage).
  // Hvis de ikke bruges, kan de slettes senere – ellers skal der laves tilsvarende WP-endpoints.
  getAllRepairOptions: () =>
    proxyFetch({ path: "/wp-json/telegiganten/v1/repair-options" }),

  updateRepairOption: (id, patch) =>
    proxyFetch({
      path: `/wp-json/telegiganten/v1/repair-options/${id}`,
      method: "PATCH",
      body: patch,
    }),

  // 🔹 Bump usage når en model vælges i Step1
  incrementModelUsage: (modelId) =>
    proxyFetch({
      path: "/wp-json/telegiganten/v1/increment-model-usage",
      method: "POST",
      body: { model_id: modelId },
    }),
};
