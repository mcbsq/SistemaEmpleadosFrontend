// services/prestamoService.js
// El backend (api/prestamo/) ya existía completo — solo nunca se conectó
// al frontend. Ver auditoría: 2026-07-26.
import { apiFetch } from "./apiConfig";

export const prestamoService = {
  getByEmpleado: (empleadoId) => apiFetch(`/prestamo/empleado/${empleadoId}`),

  getAll: () => apiFetch("/prestamo"),

  create: (payload) =>
    apiFetch("/prestamo", { method: "POST", body: JSON.stringify(payload) }),

  update: (id, payload) =>
    apiFetch(`/prestamo/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  delete: (id) => apiFetch(`/prestamo/${id}`, { method: "DELETE" }),
};
