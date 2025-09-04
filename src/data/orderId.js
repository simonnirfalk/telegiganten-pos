// src/data/orderId.js
import { api } from "./apiClient";

// Hent næste ordre-ID fra backend
export async function getNextOrderId() {
  try {
    const res = await api("/next-order-id", { method: "GET" });
    if (!res || !res.next_id) {
      throw new Error("Ugyldigt svar fra API");
    }
    return res.next_id;
  } catch (err) {
    console.error("Fejl ved hentning af næste order_id:", err);
    throw err;
  }
}
