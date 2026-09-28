// services/contactoService.js
// Migrado a apiFetch: agrega el Bearer token automáticamente en todas las
// llamadas (antes iban sin sesión y el backend las rechazaba en silencio).
import { apiFetch } from "./apiConfig";

export const contactoService = {
  createDatos: (datos) =>
    apiFetch("/datoscontacto", { method: "POST", body: JSON.stringify(datos) }),

  getDatos: () => apiFetch("/datoscontacto"),

  getDatosByEmpleado: (id) => apiFetch(`/datoscontacto/empleado/${id}`),

  getPersonas: () => apiFetch("/personascontacto"),

  // Devuelve { Contactos: [...] } — N contactos de emergencia por empleado.
  getPersonasByEmpleado: (id) => apiFetch(`/personascontacto/empleado/${id}`),

  // Reemplaza la lista COMPLETA de contactos de emergencia (agregar/quitar
  // uno es responsabilidad del caller: arma el arreglo nuevo y lo manda
  // completo). El backend ignora contactos sin nombre/parentesco en vez de
  // rechazar todo el guardado.
  updatePersona: (id, contactos) =>
    apiFetch(`/personascontacto/empleado/${id}`, {
      method: "PUT",
      body: JSON.stringify({ personalcontacto: contactos }),
    }),

  getRedes: () => apiFetch("/redsocial"),

  getRedesByEmpleado: (id) => apiFetch(`/redsocial/empleado/${id}`),

  // El backend ya tenía este endpoint (api/redsocial/routes.py PUT
  // /redsocial/empleado/:id) pero nada en el frontend lo llamaba — Perfil.js
  // dejaba editar "Redes Sociales" pero nunca lo mandaba a guardar.
  updateRedes: (id, redesSociales) =>
    apiFetch(`/redsocial/empleado/${id}`, {
      method: "PUT",
      body: JSON.stringify({ RedesSociales: redesSociales }),
    }),

  // Mapea los campos del estado local (telefonoF, IDwhatsapp...)
  // a los campos que espera Flask (TelFijo, IdWhatsApp...). ListaCorreos
  // pasó de string único a lista [{email, principal}] — el nombre del campo
  // en Mongo ya se llamaba así desde siempre, solo nadie mandaba una lista.
  updateDatos: (id, datos) =>
    apiFetch(`/datoscontacto/empleado/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        TelFijo:      datos.telefonoF   || "",
        TelCelular:   datos.telefonoC   || "",
        IdWhatsApp:   datos.IDwhatsapp  || "",
        IdTelegram:   datos.IDtelegram  || "",
        ListaCorreos: (datos.correos || []).filter(c => c.email?.trim()),
        empleado_id:  id,
      }),
    }),

  deleteDatos:    (id) => apiFetch(`/datoscontacto/${id}`,    { method: "DELETE" }),
  deletePersonas: (id) => apiFetch(`/personascontacto/${id}`, { method: "DELETE" }),
  deleteRedes:    (id) => apiFetch(`/redsocial/${id}`,        { method: "DELETE" }),
};
