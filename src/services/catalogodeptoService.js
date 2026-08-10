// services/catalogodeptoService.js
import { apiFetch } from "./apiConfig";

export const catalogodeptoService = {
  getAll: () => apiFetch("/catalogodepto"),

  create: (payload) =>
    apiFetch("/catalogodepto", { method: "POST", body: JSON.stringify(payload) }),

  update: (id, payload) =>
    apiFetch(`/catalogodepto/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  delete: (id) =>
    apiFetch(`/catalogodepto/${id}`, { method: "DELETE" }),
};
