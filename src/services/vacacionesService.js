// services/vacacionesService.js
import { apiFetch } from "./apiConfig";

export const vacacionesService = {
  getBalance: (empleadoId) => apiFetch(`/vacaciones/balance/${empleadoId}`),

  getByEmpleado: (empleadoId) => apiFetch(`/vacaciones/empleado/${empleadoId}`),

  crear: (payload) =>
    apiFetch("/vacaciones", { method: "POST", body: JSON.stringify(payload) }),

  getPendientes: () => apiFetch("/vacaciones/pendientes"),

  actualizarEstado: (solicitudId, estado, comentario = "") =>
    apiFetch(`/vacaciones/${solicitudId}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado, comentario }),
    }),
};
