// src/utils/customerUtils.js

export const normalizePhone = (p) => (p || "").replace(/\s+/g, "");

export const validatePhone = (phone) => /^(\+?\d{8,15})$/.test(normalizePhone(phone));

export const validateEmail = (email) =>
  !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Map en API-kunde til vores app-format (failsafe)
export const shapeCustomerFromApi = (c) => ({
  id: c?.id,
  name: c?.name || c?.title || "",
  phone: c?.phone || "",
  email: c?.email || "",
  extraPhone: c?.extraPhone || c?.extra_phone || "",
});
