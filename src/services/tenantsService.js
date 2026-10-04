// services/tenantsService.js
// Registro central de empresas — solo lo ve el operador de Cibercom
// (SUPER_ADMIN del tenant propio de Cibercom, ver api/tenants/routes.py).
import { apiFetch } from "./apiConfig";

export const tenantsService = {
  getAll: () => apiFetch("/admin/tenants"),
  createManual: data => apiFetch("/admin/tenants", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  // Conteos de uso por empresa (personas, cuentas, solicitudes abiertas).
  resumen: () => apiFetch("/admin/tenants/resumen"),
  // Modo soporte: registra la entrada en la auditoría de esa empresa.
  entrar: (orgId) => apiFetch(`/admin/tenants/${encodeURIComponent(orgId)}/entrar`, { method: "POST" }),
  deliverAccess: (orgId, data) => apiFetch(`/admin/tenants/${encodeURIComponent(orgId)}/deliver-access`, {
    method: "POST",
    body: JSON.stringify(data),
  }),
};
