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
// Excepción: "/api" (empieza con una sola "/") es a propósito una ruta del
// mismo sitio — vercel.json la reenvía al backend, así la cookie de sesión
// es del mismo sitio en todos los navegadores (Safari bloquea las de terceros).
const esRutaPropia = /^\/[^/]/.test(rawUrl);
if (rawUrl && !esRutaPropia && !rawUrl.startsWith("http")) {
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
  console.log("API_URL configurada:", API_URL);
}

export { API_URL };

export const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

/**
 * Headers de sesión: token + universo (modo soporte). TODA llamada al backend
 * debe llevarlos — sin X-Universo el servidor responde con la empresa de la
 * cuenta (Cibercom) y en modo soporte se mezclarían los datos de dos
 * empresas. Usar siempre este helper (o apiFetch), nunca armar el
 * Authorization a mano.
 */
let csrfEnMemoria = "";

export function guardarCsrf(token) {
  csrfEnMemoria = token || "";
}

export function leerCsrf() {
  return csrfEnMemoria;
}

export function sessionHeaders(method = "GET") {
  const universo = sessionStorage.getItem("universo");
  const mutacion = !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
  const csrf = mutacion ? leerCsrf() : "";
  return {
    ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    ...(universo ? { "X-Universo": universo } : {}),
  };
}

// Toda llamada al API lleva la cookie de sesión. El token no se guarda en JS.
if (typeof window !== "undefined" && !window.__empleadosFetch) {
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = (url, options = {}) => {
    const destino = typeof url === "string" ? url : "";
    if (API_URL && destino.startsWith(API_URL)) {
      const method = options.method || "GET";
      options = {
        ...options,
        credentials: "include",
        headers: { ...sessionHeaders(method), ...(options.headers || {}) },
      };
    }
    return fetchOriginal(url, options);
  };
  window.__empleadosFetch = true;
}

/**
 * Helper con manejo de errores, token automático y limpieza de rutas.
 */
export async function apiFetch(endpoint, options = {}) {
  const sesionActiva = sessionStorage.getItem("sesion_activa") === "1";

  // Nos aseguramos de que el endpoint empiece con /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // Construcción de la URL final (Al ser absoluta gracias a la limpieza de arriba, no se concatenará)
  const finalUrl = `${API_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(finalUrl, {
      ...options,
      credentials: "include",
      // Refuerzo del lado del cliente al Cache-Control: no-store que ya
      // manda el backend (app.py) — así el navegador nunca usa una copia
      // en caché aunque algún proxy intermedio ignore el header del server.
      cache: "no-store",
      headers: {
        ...defaultHeaders,
        ...sessionHeaders(options.method),
        ...options.headers,
      },
    });

    // Si el status es 204 (No Content), regresamos éxito
    if (response.status === 204) return true;

    // Sesión expirada o revocada: limpiar y volver al login en vez de dejar
    // pantallas vacías. Se excluyen /login (credenciales incorrectas) y
    // /change-password (contraseña actual incorrecta), donde el 401 es
    // parte del flujo normal.
    if (
      response.status === 401 &&
      sesionActiva &&
      !cleanEndpoint.startsWith("/login") &&
      !cleanEndpoint.startsWith("/change-password") &&
      !cleanEndpoint.startsWith("/logout") &&
      !cleanEndpoint.startsWith("/session")
    ) {
      const slug = sessionStorage.getItem("entry_org_slug");
      sessionStorage.clear();
      try { sessionStorage.setItem("aviso_login", "Tu sesión expiró. Vuelve a entrar; si estabas capturando algo, revisa que se haya guardado."); } catch { /* sin storage */ }
      window.location.href = slug ? `/${slug}` : "/Login";
      throw new Error("Sesión expirada. Inicia sesión de nuevo.");
    }

    // Si la respuesta no es OK (200-299)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Error ${response.status}`;
      const err = new Error(errorMessage);
      // Errores por campo (ej. {CURP: "formato inválido"}) para marcarlos
      // junto a cada input en vez de un solo mensaje genérico.
      err.status = response.status;
      err.campos = errorData.campos || null;
      throw err;
    }

    return await response.json();
    
  } catch (error) {
    console.error(`Error en apiFetch (${cleanEndpoint}):`, error.message);
    throw error;
  }
}