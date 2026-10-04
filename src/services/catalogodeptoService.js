// services/catalogodeptoService.js
import { apiFetch } from "./apiConfig";

export const catalogodeptoService = {
  getAll: () => apiFetch("/catalogodepto"),

  create: (payload) =>
    apiFetch("/catalogodepto", { method: "POST", body: JSON.stringify(payload) }),

  update: (id, payload) =>
    apiFetch(`/catalogodepto/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  // Catálogo de puestos del área (solo RH / Administrador general).
  setPuestos: (id, Puestos) =>
    apiFetch(`/catalogodepto/${id}/puestos`, { method: "PUT", body: JSON.stringify({ Puestos }) }),

  delete: (id) =>
    apiFetch(`/catalogodepto/${id}`, { method: "DELETE" }),
};
