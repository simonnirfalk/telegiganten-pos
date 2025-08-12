// src/data/apiClient.js
const PROXY_URL = '/wp-json/tg/v1/proxy';

export async function proxyFetch({
  path,
  method = 'GET',
  query,
  body,
  headers = {},
} = {}) {
  const payload = {
    destination: 'telegiganten-wp',
    data: { method, path, query, as_json: true, body: body ?? null, headers },
  };

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errText;
    try { errText = await res.text(); } catch { errText = `HTTP ${res.status}`; }
    throw new Error(`Proxy fejl: ${res.status} - ${errText}`);
  }
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export const api = {
  // Brands / modeller / repairs (skabeloner)
  getBrands: () => proxyFetch({ path: '/wp-json/telegiganten/v1/brands' }),
  getModelsByBrand: (brandId) =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/models', query: { brand_id: brandId } }),
  getRepairsForModel: (modelId) =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/repairs-by-model', query: { model_id: modelId } }),
  getTopModels: () => proxyFetch({ path: '/wp-json/telegiganten/v1/top-models' }),

  // Kunder
  getCustomers: () => proxyFetch({ path: '/wp-json/telegiganten/v1/customers' }), // 🔹 NY
  createCustomer: (data) =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/create-customer', method: 'POST', body: data }),
  getCustomersWithRepairs: () =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/customers-with-repairs' }),

  // Ordrer (tg_repair)
  getRepairOrders: () => proxyFetch({ path: '/wp-json/telegiganten/v1/repair-orders' }),
  createRepair: (data) =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/create-repair', method: 'POST', body: data }),
  updateRepair: (data) =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/update-repair', method: 'POST', body: data }),
  updateRepairWithHistory: (data) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/update-repair-with-history',
      method: 'POST',
      body: data,
    }),

  // Øvrigt
  getAllRepairOptions: () => proxyFetch({ path: '/wp-json/telegiganten/v1/repair-options' }),
  updateRepairOption: (id, patch) =>
    proxyFetch({ path: `/wp-json/telegiganten/v1/repair-options/${id}`, method: 'PATCH', body: patch }),

  // 🔹 NY: bump usage når en model vælges i Step1
  incrementModelUsage: (modelId) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/increment-model-usage',
      method: 'POST',
      body: { model_id: modelId },
    }),
};
