// services/clinicoService.js
// Migrado a apiFetch: agrega el Bearer token automáticamente (dato sensible —
// el backend exige sesión en todas las rutas de expediente clínico).
import { apiFetch } from "./apiConfig";

export const clinicoService = {

  // Listado completo (sin PDF, ver api/expedienteclinico/logic.py). Antes no
  // existía esta ruta y esto devolvía siempre [] — el dashboard de MEDICO
  // mostraba "0 con expediente" sin importar los datos reales.
  getAll: () => apiFetch("/expedienteclinico").catch(() => []),

  getByEmpleado: (id) => apiFetch(`/expedienteclinico/empleado/${id}`),

  // upsert con normalización de PDF (use-file-picker devuelve array)
  update: async (id, datos) => {
    let pdfBase64 = datos.PDFSegurodegastosmedicos;
    if (Array.isArray(pdfBase64) && pdfBase64.length > 0) {
      pdfBase64 = pdfBase64[0].content || pdfBase64[0];
    }

    const payload = {
      empleado_id:              id,
      tipoSangre:               datos.tipoSangre           || "",
      Padecimientos:            datos.Padecimientos        || "",
      NumeroSeguroSocial:       datos.NumeroSeguroSocial   || "",
      Segurodegastosmedicos:    datos.Datossegurodegastos  || "",
      PDFSegurodegastosmedicos: pdfBase64                  || null,
    };

    try {
      return await apiFetch(`/expedienteclinico/empleado/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch {
      // No existía: crear (upsert)
      return apiFetch("/expedienteclinico", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
  },

  delete: (id) => apiFetch(`/expedienteclinico/${id}`, { method: "DELETE" }),
};
