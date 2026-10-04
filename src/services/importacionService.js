// services/importacionService.js — carga masiva de empleados (backend api/importacion).
import { apiFetch, API_URL, sessionHeaders } from "./apiConfig";

export const importacionService = {
  // Descarga autenticada de la plantilla (un <a href> no puede llevar el token).
  async descargarPlantilla() {
    const res = await fetch(`${API_URL}/importacion/plantilla`, { headers: sessionHeaders() });
    if (!res.ok) throw new Error("No se pudo descargar la plantilla.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla-carga-empleados.xlsx";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
  validar:   (archivo, crear_cuentas) => apiFetch("/importacion/validar",   { method: "POST", body: JSON.stringify({ archivo, crear_cuentas }) }),
  confirmar: (archivo, crear_cuentas) => apiFetch("/importacion/confirmar", { method: "POST", body: JSON.stringify({ archivo, crear_cuentas }) }),
};
