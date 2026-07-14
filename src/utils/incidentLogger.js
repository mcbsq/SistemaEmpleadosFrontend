// ─────────────────────────────────────────────────────────────────────────────
// incidentLogger.js
// Captura y CATALOGA todos los errores del sistema:
//   red           → fetch falló sin respuesta (servidor caído, CORS, timeout)
//   autenticacion → HTTP 401/403 (sesión expirada, permisos)
//   api           → HTTP 4xx/5xx restantes (backend respondió con error)
//   cliente       → excepción JavaScript no capturada (window.onerror)
//   promesa       → promesa rechazada sin catch (unhandledrejection)
//   render        → error de render de React (ErrorBoundary)
//
// Los incidentes viven en memoria + sessionStorage (para el monitor en vivo)
// y se envían en segundo plano a POST /monitor/incidents para persistir en
// Mongo, de modo que un admin pueda diagnosticar aunque el cliente cierre.
// Activación: llamar installIncidentCapture() UNA vez desde index.js.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_INCIDENTS = 200;

if (typeof window !== "undefined" && !window.__CIBERCOM_INCIDENTS__) {
  window.__CIBERCOM_INCIDENTS__ = [];
}

// fetch original (sin parchear) para enviar reportes sin re-capturarlos
let _rawFetch = typeof window !== "undefined" ? window.fetch.bind(window) : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getRole = () => {
  try {
    return sessionStorage.getItem("user_role") || "sin_sesion";
  } catch {
    return "sin_sesion";
  }
};

const severidad = (status, categoria) => {
  if (categoria === "render" || categoria === "cliente") return "critical";
  if (!status || status >= 500) return "critical";
  if (status === 401 || status === 403) return "warning";
  if (status >= 400) return "warning";
  return "info";
};

const categorizar = ({ status, categoria }) => {
  if (categoria) return categoria; // explícita (cliente/promesa/render)
  if (!status) return "red";
  if (status === 401 || status === 403) return "autenticacion";
  return "api";
};

// ─── Envío en segundo plano al backend (fire-and-forget) ────────────────────
const enviarAlBackend = (incident) => {
  if (!_rawFetch) return;
  // Nunca reportar errores del propio endpoint de monitor (evita bucles)
  if ((incident.url || "").includes("/monitor/incidents")) return;
  const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  if (!base) return;
  try {
    _rawFetch(`${base}/monitor/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        severity:  incident.severidad,
        categoria: incident.categoria,
        message:   incident.message,
        endpoint:  incident.url,
        method:    incident.method,
        status:    incident.status,
        role:      incident.role,
        timestamp: incident.timestamp,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* nunca romper la app por reportar */ }
};

// ─── Registrar un incidente ───────────────────────────────────────────────────
export const logIncident = ({ url, method = "GET", status, message, stack, categoria }) => {
  const cat = categorizar({ status, categoria });
  const incident = {
    id:        Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    url:       url || "desconocido",
    method:    (method || "GET").toUpperCase(),
    status:    status || 0,
    message:   message || "Error desconocido",
    stack:     stack || "",
    role:      getRole(),
    userAgent: navigator.userAgent.split(" ").slice(-2).join(" "),
    categoria: cat,
    severidad: severidad(status, cat),
  };

  window.__CIBERCOM_INCIDENTS__.unshift(incident);

  if (window.__CIBERCOM_INCIDENTS__.length > MAX_INCIDENTS) {
    window.__CIBERCOM_INCIDENTS__ = window.__CIBERCOM_INCIDENTS__.slice(0, MAX_INCIDENTS);
  }

  try {
    sessionStorage.setItem(
      "cibercom_incidents",
      JSON.stringify(window.__CIBERCOM_INCIDENTS__.slice(0, 50))
    );
  } catch { /* quota exceeded — ignorar */ }

  enviarAlBackend(incident);
  return incident;
};

// ─── Leer incidentes ──────────────────────────────────────────────────────────
export const getIncidents = () => {
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
let _patched = false;

export const patchFetch = () => {
  if (_patched || typeof window === "undefined") return;
  _patched = true;

  const originalFetch = window.fetch;
  _rawFetch = originalFetch.bind(window);

  window.fetch = async function patchedFetch(input, init = {}) {
    const url    = typeof input === "string" ? input : input?.url || "";
    const method = init?.method || "GET";

    try {
      const response = await originalFetch(input, init);

      if (!response.ok && !url.includes("/monitor/incidents")) {
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

// ─── Errores JS globales y promesas sin catch ────────────────────────────────
let _globalInstalled = false;

export const patchGlobalErrors = () => {
  if (_globalInstalled || typeof window === "undefined") return;
  _globalInstalled = true;

  window.addEventListener("error", (event) => {
    logIncident({
      categoria: "cliente",
      url:       event.filename || window.location.pathname,
      method:    "JS",
      message:   event.message || "Error de script",
      stack:     event.error?.stack?.slice(0, 400) || "",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    logIncident({
      categoria: "promesa",
      url:       window.location.pathname,
      method:    "JS",
      message:   (reason?.message || String(reason) || "Promesa rechazada").slice(0, 200),
      stack:     reason?.stack?.slice(0, 400) || "",
    });
  });
};

// ─── Errores de render (llamado por el ErrorBoundary de React) ───────────────
export const logRenderError = (error, info) => {
  logIncident({
    categoria: "render",
    url:       window.location.pathname,
    method:    "RENDER",
    message:   (error?.message || "Error de render").slice(0, 200),
    stack:     (info?.componentStack || error?.stack || "").slice(0, 400),
  });
};

// ─── Instalación completa (una sola llamada desde index.js) ──────────────────
export const installIncidentCapture = () => {
  patchFetch();
  patchGlobalErrors();
};
