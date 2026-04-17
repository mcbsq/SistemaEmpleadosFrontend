// ─────────────────────────────────────────────────────────────────────────────
// incidentLogger.js
// Intercepta todos los fetch del sistema y registra errores en memoria.
// No requiere backend. El IncidentMonitor lo lee en tiempo real.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_INCIDENTS = 200;

// Array global en memoria — persiste mientras la pestaña esté abierta
if (!window.__CIBERCOM_INCIDENTS__) {
  window.__CIBERCOM_INCIDENTS__ = [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "sin_sesion";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || payload.sub || "desconocido";
  } catch {
    return "sin_sesion";
  }
};

const severidad = (status) => {
  if (!status || status >= 500) return "critical";
  if (status >= 400)            return "warning";
  if (status >= 300)            return "info";
  return "ok";
};

// ─── Registrar un incidente ───────────────────────────────────────────────────
export const logIncident = ({ url, method = "GET", status, message, stack }) => {
  const incident = {
    id:        Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    url:       url || "desconocido",
    method:    method.toUpperCase(),
    status:    status || 0,
    message:   message || "Error desconocido",
    stack:     stack || "",
    role:      getRole(),
    userAgent: navigator.userAgent.split(" ").slice(-2).join(" "),
    severidad: severidad(status),
  };

  window.__CIBERCOM_INCIDENTS__.unshift(incident);

  // Mantener máximo MAX_INCIDENTS entradas (FIFO)
  if (window.__CIBERCOM_INCIDENTS__.length > MAX_INCIDENTS) {
    window.__CIBERCOM_INCIDENTS__ = window.__CIBERCOM_INCIDENTS__.slice(0, MAX_INCIDENTS);
  }

  // Persistir en sessionStorage para sobrevivir hot-reload en dev
  try {
    sessionStorage.setItem(
      "cibercom_incidents",
      JSON.stringify(window.__CIBERCOM_INCIDENTS__.slice(0, 50))
    );
  } catch { /* quota exceeded — ignorar */ }

  return incident;
};

// ─── Leer incidentes ──────────────────────────────────────────────────────────
export const getIncidents = () => {
  // Recuperar de sessionStorage si la página fue recargada
  if (window.__CIBERCOM_INCIDENTS__.length === 0) {
    try {
      const stored = sessionStorage.getItem("cibercom_incidents");
      if (stored) window.__CIBERCOM_INCIDENTS__ = JSON.parse(stored);
    } catch { /* ignorar */ }
  }
  return [...window.__CIBERCOM_INCIDENTS__];
};

export const clearIncidents = () => {
  window.__CIBERCOM_INCIDENTS__ = [];
  sessionStorage.removeItem("cibercom_incidents");
};

// ─── Parchear fetch globalmente ───────────────────────────────────────────────
// Se llama UNA sola vez desde index.js o apiConfig.js
let _patched = false;

export const patchFetch = () => {
  if (_patched || typeof window === "undefined") return;
  _patched = true;

  const originalFetch = window.fetch;

  window.fetch = async function patchedFetch(input, init = {}) {
    const url    = typeof input === "string" ? input : input?.url || "";
    const method = init?.method || "GET";

    try {
      const response = await originalFetch(input, init);

      // Registrar solo errores HTTP (4xx, 5xx)
      if (!response.ok) {
        let bodyText = "";
        try {
          const clone = response.clone();
          bodyText = await clone.text();
        } catch { /* ignorar */ }

        logIncident({
          url, method,
          status:  response.status,
          message: bodyText.slice(0, 200) || `HTTP ${response.status}`,
        });
      }

      return response;
    } catch (networkError) {
      // Error de red: servidor caído, CORS, timeout, etc.
      logIncident({
        url, method,
        status:  0,
        message: networkError.message || "Network error — servidor posiblemente caído",
        stack:   networkError.stack?.slice(0, 300) || "",
      });
      throw networkError;
    }
  };
};