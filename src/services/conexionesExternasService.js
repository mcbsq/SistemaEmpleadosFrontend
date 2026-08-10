// services/conexionesExternasService.js
import { apiFetch } from "./apiConfig";

export const conexionesExternasService = {
  getAll: () => apiFetch("/conexiones-externas"),

  create: (payload) =>
    apiFetch("/conexiones-externas", { method: "POST", body: JSON.stringify(payload) }),

  update: (id, payload) =>
    apiFetch(`/conexiones-externas/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  delete: (id) =>
    apiFetch(`/conexiones-externas/${id}`, { method: "DELETE" }),

  getNominaExterna: (empleadoId) =>
    apiFetch(`/empleados/${empleadoId}/nomina-externa`),
};
