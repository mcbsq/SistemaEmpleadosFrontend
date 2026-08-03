// services/documentosFinancierosService.js
// Recibos de nómina (sube el admin) y CFDI de prestadores de servicios (sube
// el propio empleado). PDF como base64, mismo patrón que RH/expediente clínico.
import { apiFetch } from "./apiConfig";

export const documentosFinancierosService = {
  getByEmpleado: (empleadoId) =>
    apiFetch(`/documentosfinancieros/empleado/${empleadoId}`),

  create: (payload) =>
    apiFetch("/documentosfinancieros", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateEstado: (docId, estado) =>
    apiFetch(`/documentosfinancieros/${docId}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    }),

  delete: (docId) =>
    apiFetch(`/documentosfinancieros/${docId}`, { method: "DELETE" }),
};
