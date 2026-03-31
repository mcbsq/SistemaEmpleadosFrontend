// services/apiConfig.js
// Única fuente de verdad para URL, headers y fetch base.

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  console.error(
    "[apiConfig] REACT_APP_API_URL no definida. Verifica las Environment Variables en Vercel."
  );
}

// Exportado para los servicios existentes que lo importan directamente
export { API_URL };

// Headers base
export const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

/**
 * Helper con manejo de errores y token automático.
 * @param {string} endpoint - Debe empezar con / (ej: '/login')
 * @param {object} options - Opciones estándar de fetch
 */
export async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem("access_token");

  // Limpiamos la URL para evitar dobles slashes si la API_URL termina en /
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${baseUrl}${cleanEndpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Manejo de errores detallado para la consola
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.message || `Error ${response.status}`;
    
    throw new Error(
      `[${options.method || "GET"}] ${cleanEndpoint} → ${response.status}: ${errorMessage}`
    );
  }

  // Si el status es 204 (No Content), regresamos éxito vacío
  if (response.status === 204) return true;

  return response.json();
}