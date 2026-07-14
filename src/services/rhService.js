// services/rhService.js
// Migrado a apiFetch: agrega el Bearer token automáticamente (las rutas /rh
// están protegidas — el fetch crudo sin token hacía que todo RH llegara vacío).
import { apiFetch } from "./apiConfig";

export const rhService = {
  getAll: () => apiFetch("/rh"),

  // Ruta Flask real es /rh/<empleado_id>
  getByEmpleado: (id) => apiFetch(`/rh/${id}`),

  getJerarquia: () => apiFetch("/jerarquia"),

  saveJerarquia: (datos) =>
    apiFetch("/jerarquia", { method: "POST", body: JSON.stringify(datos) }),

  update: (id, datos) =>
    apiFetch(`/rh/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...datos, empleado_id: id }),
    }),

  delete: (id) => apiFetch(`/rh/${id}`, { method: "DELETE" }),
};
