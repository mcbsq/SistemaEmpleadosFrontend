// services/usuarioService.js
import { apiFetch } from "./apiConfig";

export const usuarioService = {
  create: (payload) =>
    apiFetch("/usuario", { method: "POST", body: JSON.stringify(payload) }),

  getAll: () =>
    apiFetch("/usuario"),

  getById: (id) =>
    apiFetch(`/usuario/${id}`),

  update: (id, payload) =>
    apiFetch(`/usuario/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  delete: (id) =>
    apiFetch(`/usuario/${id}`, { method: "DELETE" }),
};