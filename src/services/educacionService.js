// services/educacionService.js
// Migrado a apiFetch: agrega el Bearer token automáticamente.
import { apiFetch } from "./apiConfig";

export const educacionService = {
  getAll: () => apiFetch("/educacion"),

  getByEmpleado: (id) => apiFetch(`/educacion/empleado/${id}`),

  // upsert: PUT con fallback a POST si no existe
  update: async (id, datos) => {
    try {
      return await apiFetch(`/educacion/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...datos, empleado_id: id }),
      });
    } catch {
      return apiFetch("/educacion", {
        method: "POST",
        body: JSON.stringify({ ...datos, empleado_id: id }),
      });
    }
  },

  delete: (id) => apiFetch(`/educacion/${id}`, { method: "DELETE" }),
};
