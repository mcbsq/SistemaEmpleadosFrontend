// src/services/apiConfig.js
// Única fuente de verdad para URL, headers y fetch base.

/**
 * LÓGICA DE LIMPIEZA DE URL (Anti-errores de Vercel)
 * Obtenemos la variable y nos aseguramos de que tenga el formato correcto: https://...
 */
let rawUrl = (process.env.REACT_APP_API_URL || "").trim();

// 1. Forzar las dos barras si solo viene una (ej. https:/ -> https://)
if (rawUrl.startsWith("https:/") && !rawUrl.startsWith("https://")) {
  rawUrl = rawUrl.replace("https:/", "https://");
}

// 2. Quitar diagonal final para evitar problemas de concatenación (ej. url//login)
const API_URL = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;

// Log para que tú mismo verifiques en la consola del navegador (F12) qué está leyendo el código
if (!API_URL) {
  console.error(
    "[apiConfig] REACT_APP_API_URL no está definida. Revisa el Dashboard de Vercel."
  );
} else {
  console.log("🔍 API_URL Configurada:", API_URL);
}

// Exportado para servicios existentes
export { API_URL };

// Headers base
export const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

/**
 * Helper con manejo de errores, token automático y limpieza de rutas.
 * @param {string} endpoint - Ejemplo: '/login'
 * @param {object} options - Opciones estándar de fetch
 */
export async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem("access_token");

  // Nos aseguramos de que el endpoint empiece con /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // Construcción de la URL final
  const finalUrl = `${API_URL}${cleanEndpoint}`;

  // Log de depuración para ver exactamente a dónde va la petición
  console.log(`🚀 Solicitando [${options.method || "GET"}]:`, finalUrl);

  try {
    const response = await fetch(finalUrl, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    // Si el status es 204 (No Content), regresamos éxito
    if (response.status === 204) return true;

    // Si la respuesta no es OK (200-299)
    if (!response.ok) {
      // Intentamos leer el JSON de error del backend
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Error ${response.status}`;
      
      throw new Error(errorMessage);
    }

    return await response.json();
    
  } catch (error) {
    // Si el error es de red o de parseo, lo lanzamos para que el componente lo maneje
    console.error(`❌ Error en apiFetch (${cleanEndpoint}):`, error.message);
    throw error;
  }
}