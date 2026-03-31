// src/services/apiConfig.js
// Única fuente de verdad para URL, headers y fetch base.

/**
 * LÓGICA DE LIMPIEZA DE URL (Anti-errores de Vercel y concatenación)
 * Esta sección asegura que la URL sea absoluta para que no se pegue a la del frontend.
 */
let rawUrl = (process.env.REACT_APP_API_URL || "").trim();

// 1. Limpieza de caracteres extraños (como corchetes o espacios accidentales)
rawUrl = rawUrl.replace(/[\[\]]/g, "");

// 2. FORZAR PROTOCOLO: Si no empieza con http, el navegador la trata como ruta relativa.
// Esto evita el error: frontend.com/https:/backend.com
if (rawUrl && !rawUrl.startsWith("http")) {
  // Quitamos barras iniciales sobrantes y ponemos https://
  const cleanPath = rawUrl.replace(/^\/+/, "");
  rawUrl = `https://${cleanPath}`;
}

// 3. Corregir el error de una sola barra (https:/ -> https://)
if (rawUrl.includes("https:/") && !rawUrl.includes("https://")) {
  rawUrl = rawUrl.replace("https:/", "https://");
}

// 4. Quitar diagonal final para evitar "//" en la ruta final
const API_URL = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;

// Log de diagnóstico
if (!API_URL) {
  console.error(
    "[apiConfig] REACT_APP_API_URL no está definida. Revisa el Dashboard de Vercel."
  );
} else {
  console.log("🔍 API_URL FINAL CONFIGURADA:", API_URL);
}

export { API_URL };

export const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

/**
 * Helper con manejo de errores, token automático y limpieza de rutas.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem("access_token");

  // Nos aseguramos de que el endpoint empiece con /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // Construcción de la URL final (Al ser absoluta gracias a la limpieza de arriba, no se concatenará)
  const finalUrl = `${API_URL}${cleanEndpoint}`;

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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Error ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
    
  } catch (error) {
    console.error(`❌ Error en apiFetch (${cleanEndpoint}):`, error.message);
    throw error;
  }
}