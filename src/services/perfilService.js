// services/perfilService.js
// Qué secciones del perfil puede ver/editar quien está logueado, y la
// tarjeta pública (nombre, foto, puesto…) que cualquier compañero puede ver.
// La regla vive en el backend (core/visibilidad_perfil.py); aquí solo se
// consulta para saber qué pintar.
import { apiFetch } from "./apiConfig";

export const perfilService = {
  getAcceso:  (id) => apiFetch(`/perfil/${id}/acceso`),
  getPublico: (id) => apiFetch(`/perfil/${id}/publico`),
  // Foto, nombre para mostrar y titular — solo el propio empleado (o RH).
  updateAjustes: (id, datos) => apiFetch(`/perfil/${id}/ajustes`, {
    method: "PATCH", body: JSON.stringify(datos),
  }),
};

// Avisa a toda la app (barra lateral, perfil abierto) que la foto o el nombre
// cambiaron, para que se refresquen sin recargar la página.
export const PERFIL_ACTUALIZADO = "perfil-actualizado";
export const ABRIR_AJUSTES = "abrir-ajustes-perfil";
export const abrirAjustes = (seccion = "perfil") =>
  window.dispatchEvent(new CustomEvent(ABRIR_AJUSTES, { detail: { seccion } }));
