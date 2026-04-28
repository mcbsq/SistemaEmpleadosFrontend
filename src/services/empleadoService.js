import { API_URL, defaultHeaders } from "./apiConfig";
import { contactoService } from "./contactoService";
import { educacionService } from "./educacionService";
import { clinicoService } from "./clinicoService";
import { rhService } from "./rhService";

// ─── Headers con token automático ─────────────────────────────────────────────
const authHeaders = () => {
  const token = sessionStorage.getItem("access_token");
  return {
    ...defaultHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Helpers para ofuscar/desofuscar el ID en la URL ─────────────────────────
// Usa base64 simple — no es cifrado fuerte, pero oculta el ObjectId de Mongo
// en la URL sin necesidad de cambios en el backend.
export const encodeId = (id) =>
  btoa(id).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export const decodeId = (encoded) => {
  // Revertir URL-safe base64
  let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  // Restaurar padding
  while (b64.length % 4) b64 += "=";
  try { return atob(b64); } catch { return encoded; }
};

export const empleadoService = {

  // ── GET todos ─────────────────────────────────────────────────────────────
  getAll: () =>
    fetch(`${API_URL}/empleados`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .catch(() => []),

  // ── GET por ID — acepta tanto ID real como ID encriptado ──────────────────
  getById: (idOrEncoded) => {
    // Si parece un ObjectId de Mongo (24 hex chars) lo usa directo
    // Si no, intenta desencriptarlo
    const realId = /^[a-f0-9]{24}$/i.test(idOrEncoded)
      ? idOrEncoded
      : decodeId(idOrEncoded);
    return fetch(`${API_URL}/empleados/${realId}`, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error("Empleado no encontrado");
        return res.json();
      });
  },

  // ── CREATE ────────────────────────────────────────────────────────────────
  create: (datos) =>
    fetch(`${API_URL}/empleados`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(datos),
    }).then(res => res.json()),

  // ── UPDATE ────────────────────────────────────────────────────────────────
  update: (id, datos) =>
    fetch(`${API_URL}/empleados/${id}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify(datos),
    }).then(res => res.json()),

  // ── DESACTIVAR ────────────────────────────────────────────────────────────
  desactivar: (id) =>
    fetch(`${API_URL}/empleados/${id}/desactivar`, {
      method: "PATCH", headers: authHeaders(),
    }).then(res => res.json()),

  // ── REACTIVAR ─────────────────────────────────────────────────────────────
  reactivar: (id) =>
    fetch(`${API_URL}/empleados/${id}/reactivar`, {
      method: "PATCH", headers: authHeaders(),
    }).then(res => res.json()),

  // ── APROBAR ───────────────────────────────────────────────────────────────
  aprobar: (id) =>
    fetch(`${API_URL}/empleados/${id}/aprobar`, {
      method: "PATCH", headers: authHeaders(),
    }).then(res => res.json()),

  // ── DELETE COMPLETO ───────────────────────────────────────────────────────
  deleteFull: async (id) => {
    const res = await fetch(`${API_URL}/empleados/${id}`, {
      method: "DELETE", headers: authHeaders(),
    });
    await Promise.allSettled([
      contactoService.deleteDatos(id),
      contactoService.deletePersonas(id),
      contactoService.deleteRedes(id),
      educacionService.delete(id),
      clinicoService.delete(id),
      rhService.delete(id),
    ]);
    return res.json();
  },
};