// services/apiConfig.js
// Única fuente de verdad para URL, headers y fetch base.

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  console.error(
    "[apiConfig] REACT_APP_API_URL no definida. Crea un archivo .env en la raíz del proyecto."
  );
}

// Exportado para los servicios existentes que lo importan directamente
export { API_URL };

// Headers base — también exportado para compatibilidad con servicios existentes
export const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

// Helper con manejo de errores y token automático
// Úsalo en servicios nuevos en lugar de fetch directo
export async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem("access_token");

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `[${options.method || "GET"}] ${endpoint} → ${response.status}. ${body}`
    );
  }

  return response.json();
}