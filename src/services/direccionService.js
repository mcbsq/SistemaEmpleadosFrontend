// services/direccionService.js
import { apiFetch } from "./apiConfig";

export const direccionService = {
  create: (payload) =>
    apiFetch("/direccion", { method: "POST", body: JSON.stringify(payload) }),

  getByEmpleado: (empleadoId) =>
    apiFetch(`/direccion/empleado/${empleadoId}`),

  update: (empleadoId, payload) =>
    apiFetch(`/direccion/empleado/${empleadoId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};