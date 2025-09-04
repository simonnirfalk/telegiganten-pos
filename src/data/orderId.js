import { api } from "./apiClient";
export async function getNextOrderId() {
  return api.getNextOrderId();
}
