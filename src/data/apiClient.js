// src/data/apiClient.js
// ÉN vej til alt: vi kalder WordPress-proxyen og lader den tale med WP-REST (telegiganten-wp).

const PROXY_URL = '/wp-json/tg/v1/proxy'; // samme domæne som WordPress

/**
 * Kald proxyen.
 * @param {Object} opts
 * @param {string} opts.path   - fx "/wp-json/telegiganten/v1/customers-with-repairs"
 * @param {string} [opts.method="GET"]
 * @param {Object} [opts.query]          - Query params som objekt
 * @param {Object} [opts.body]           - JSON body (hvis method != GET/DELETE)
 * @param {Object} [opts.headers]        - Ekstra headers (fx { "X-WP-Nonce": "..."} hvis nødvendigt)
 * @returns {Promise<any>}               - JSON eller tekst (afhængigt af svar)
 */
export async function proxyFetch({
  path,
  method = 'GET',
  query,
  body,
  headers = {},
} = {}) {
  // Byg payload til proxyen
  const payload = {
    destination: 'telegiganten-wp',
    data: {
      method,
      path,
      query,
      as_json: true,
      body: body ?? null,
      headers,
    },
  };

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Hvis du har brug for at sende en Authorization videre til WP:
      // 'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errText;
    try {
      errText = await res.text();
    } catch {
      errText = `HTTP ${res.status}`;
    }
    throw new Error(`Proxy fejl: ${res.status} - ${errText}`);
  }

  if (contentType.includes('application/json')) {
    return await res.json();
  }

  return await res.text();
}

/* ---------- Convenience wrappers til vores kendte endpoints ---------- */

// Brands / modeller / reparationer (læse)
export const api = {
  getBrands: () =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/brands' }),

  getModelsByBrand: (brandId) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/models',
      query: { brand_id: brandId },
    }),

  getRepairsForModel: (modelId) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/repairs-by-model',
      query: { model_id: modelId },
    }),

  getTopModels: () =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/top-models' }),

  // Kunder
  createCustomer: (data) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/customers',
      method: 'POST',
      body: data,
    }),

  getCustomersWithRepairs: () =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/customers-with-repairs',
    }),

  // Reparationer (ordrer)
  createRepair: (data) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/repairs',
      method: 'POST',
      body: data,
    }),

  updateRepair: (data) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/update-repair',
      method: 'POST',
      body: data,
    }),

  updateRepairWithHistory: (data) =>
    proxyFetch({
      path: '/wp-json/telegiganten/v1/update-repair-with-history',
      method: 'POST',
      body: data,
    }),

  // “Priser”-modul (global redigering)
  getAllRepairOptions: () =>
    proxyFetch({ path: '/wp-json/telegiganten/v1/repair-options' }),

  updateRepairOption: (id, patch) =>
    proxyFetch({
      path: `/wp-json/telegiganten/v1/repair-options/${id}`,
      method: 'PATCH',
      body: patch,
    }),
};
