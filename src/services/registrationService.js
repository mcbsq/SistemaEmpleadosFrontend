import { apiFetch } from "./apiConfig";

export const registrationService = {
  availability: (slug) => apiFetch(`/public/tenants/slug-availability?slug=${encodeURIComponent(slug)}`),
  register: (payload) => apiFetch("/public/tenants/register", { method: "POST", body: JSON.stringify(payload) }),
};
