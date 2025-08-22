// src/data/sparePartsApi.js
const GAS_URL = import.meta.env.VITE_GAS_URL;

// POST som text/plain for at undgå preflight
async function httpPost(body) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(text || "Ugyldigt svar"); }
  if (!res.ok || data?.error) throw new Error(data?.error || "Request failed");
  return data;
}

/** Atomisk lager-justering på serveren (delta kan være negativ eller positiv) */
export async function adjustStock(id, delta) {
  if (!id) throw new Error("Mangler id");
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Ugyldig delta");
  const data = await httpPost({ action: "adjustStock", id, delta });
  // data.item.stock er den nye værdi
  return data.item;
}
