// services/solicitudesRhService.js
// Canal empleado → RH (ver backend api/solicitudes_rh/routes.py).
import { apiFetch } from "./apiConfig";

export const solicitudesRhService = {
  crear:     (datos) => apiFetch("/solicitudes-rh", { method: "POST", body: JSON.stringify(datos) }),
  mias:      () => apiFetch("/solicitudes-rh/mias"),
  todas:     (estado) => apiFetch(`/solicitudes-rh${estado ? `?estado=${estado}` : ""}`),
  responder: (id, datos) => apiFetch(`/solicitudes-rh/${id}`, { method: "PATCH", body: JSON.stringify(datos) }),
};

export const TIPOS_SOLICITUD = [
  { value: "correccion", label: "Corregir un dato" },
  { value: "constancia", label: "Pedir constancia o documento" },
  { value: "duda",       label: "Hacer una pregunta" },
  { value: "otro",       label: "Otro" },
];
export const SECCIONES_SOLICITUD = [
  { value: "personal",     label: "Datos personales" },
  { value: "laboral",      label: "Información laboral" },
  { value: "compensacion", label: "Sueldo o datos bancarios" },
  { value: "vacaciones",   label: "Vacaciones" },
  { value: "salud",        label: "Expediente médico" },
  { value: "documentos",   label: "Recibos o documentos" },
  { value: "otro",         label: "Otro tema" },
];
export const ESTADOS_SOLICITUD = {
  abierta:    { label: "Enviada",    tono: "warning" },
  en_proceso: { label: "En proceso", tono: "accent" },
  resuelta:   { label: "Resuelta",   tono: "success" },
  rechazada:  { label: "No procede", tono: "danger" },
};

export const ABRIR_CONTACTO_RH = "abrir-contacto-rh";
export const SOLICITUD_RH_CREADA = "solicitud-rh-creada";
export const abrirContactoRH = (detalle = {}) =>
  window.dispatchEvent(new CustomEvent(ABRIR_CONTACTO_RH, { detail: detalle }));
