import React, { useEffect, useState, useCallback } from "react";
import { FiZap, FiX } from "react-icons/fi";
import "./IncidentMonitor.css";
import { getIncidents, clearIncidents } from "../utils/incidentLogger";
import { useOrg } from "../context/OrgContext";

// ─── Backdoor key: /monitor?key=cibercom2026 ─────────────────────────────────
// Accesible sin login. Ruta: /monitor
const BACKDOOR_KEY = "cibercom2026";

const SEV_LABEL = {
  critical: "Crítico",
  warning:  "Advertencia",
  info:     "Info",
  ok:       "OK",
};

// Catálogo de categorías de error (ver utils/incidentLogger.js)
const CAT_LABEL = {
  red:           "Red",
  autenticacion: "Autenticación",
  api:           "API",
  cliente:       "JS Cliente",
  promesa:       "Promesa",
  render:        "Render",
};

const METHOD_COLOR = {
  GET:    "#5B8AF0",
  POST:   "#4ECAAC",
  PUT:    "#F5A623",
  DELETE: "#E86B5F",
  PATCH:  "#9B7FE8",
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const formatUrl = (url) => {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
};

// ─── Gráfica de barras de errores por hora (últimas 12h) ─────────────────────
const ErrorSparkline = ({ incidents }) => {
  const now   = Date.now();
  const hours = Array.from({ length: 12 }, (_, i) => {
    const start = now - (11 - i) * 3600000;
    const end   = start + 3600000;
    return {
      label: new Date(start).getHours() + "h",
      count: incidents.filter(inc => {
        const t = new Date(inc.timestamp).getTime();
        return t >= start && t < end;
      }).length,
    };
  });
  const maxVal = Math.max(...hours.map(h => h.count), 1);
  return (
    <div className="im-sparkline">
      {hours.map((h, i) => (
        <div key={i} className="im-spark-col">
          <div
            className="im-spark-bar"
            style={{ height: `${Math.round((h.count / maxVal) * 48)}px` }}
            title={`${h.label}: ${h.count} errores`}
          />
          <span className="im-spark-lbl">{i % 3 === 0 ? h.label : ""}</span>
        </div>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
function IncidentMonitor() {
  const { orgConfig } = useOrg();
  const orgName = orgConfig?.name || "Cibercom";
  const [authorized, setAuthorized] = useState(false);
  const [keyInput,   setKeyInput]   = useState("");
  const [keyError,   setKeyError]   = useState(false);
  const [incidents,  setIncidents]  = useState([]);
  const [filter,     setFilter]     = useState("all"); // all | critical | warning | info
  const [catFilter,  setCatFilter]  = useState("all"); // all | red | autenticacion | api | cliente | promesa | render
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate]  = useState(null);

  // Verificar key en URL al montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("key") === BACKDOOR_KEY) {
      setAuthorized(true);
    }
  }, []);

  // Cargar y refrescar incidentes: locales (esta pestaña) + persistidos en el
  // backend (errores de cualquier usuario/sesión), si hay sesión admin activa.
  const refresh = useCallback(async () => {
    const locales = getIncidents();

    let remotos = [];
    try {
      const token = sessionStorage.getItem("access_token");
      const base  = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
      if (token && base) {
        const r = await fetch(`${base}/monitor/incidents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const docs = await r.json();
          remotos = (Array.isArray(docs) ? docs : []).map(d => ({
            id:        `srv-${d._id}`,
            timestamp: d.timestamp,
            url:       d.endpoint || "—",
            method:    d.method || "—",
            status:    d.status || 0,
            message:   d.message || "",
            stack:     "",
            role:      d.role || "—",
            userAgent: "",
            categoria: d.categoria || "api",
            severidad: d.severity || "warning",
            origen:    "servidor",
          }));
        }
      }
    } catch { /* sin backend disponible: solo locales */ }

    const localesMarcados = locales.map(l => ({ ...l, origen: l.origen || "local" }));
    // Merge simple: locales primero (más frescos), luego remotos que no dupliquen mensaje+timestamp
    const clave = i => `${i.timestamp}|${i.message?.slice(0,60)}`;
    const vistos = new Set(localesMarcados.map(clave));
    const combinados = [...localesMarcados, ...remotos.filter(r => !vistos.has(clave(r)))]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 300);

    setIncidents(combinados);
    setLastUpdate(new Date().toLocaleTimeString("es-MX"));
  }, []);

  useEffect(() => {
    if (!authorized) return;
    refresh();
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [authorized, autoRefresh, refresh]);

  const handleKeySubmit = (e) => {
    e.preventDefault();
    if (keyInput.trim() === BACKDOOR_KEY) {
      setAuthorized(true);
      setKeyError(false);
    } else {
      setKeyError(true);
    }
  };

  // ─── Filtrado ────────────────────────────────────────────────────────────
  const filtered = incidents.filter(inc => {
    if (filter !== "all" && inc.severidad !== filter) return false;
    if (catFilter !== "all" && (inc.categoria || "api") !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inc.url.toLowerCase().includes(q) ||
        inc.message.toLowerCase().includes(q) ||
        inc.role.toLowerCase().includes(q) ||
        String(inc.status).includes(q)
      );
    }
    return true;
  });

  // ─── Estadísticas rápidas ────────────────────────────────────────────────
  const stats = {
    total:    incidents.length,
    critical: incidents.filter(i => i.severidad === "critical").length,
    warning:  incidents.filter(i => i.severidad === "warning").length,
    info:     incidents.filter(i => i.severidad === "info").length,
  };

  // ─── Pantalla de acceso ──────────────────────────────────────────────────
  if (!authorized) {
    return (
      <div className="im-lock-screen">
        <div className="im-lock-card">
          <div className="im-lock-icon"><FiZap /></div>
          <h2 className="im-lock-title">Monitor de incidencias</h2>
          <p className="im-lock-sub">{orgName} Sistemas · Acceso restringido</p>
          <form onSubmit={handleKeySubmit} className="im-lock-form">
            <input
              type="password"
              className={`im-lock-input ${keyError ? "im-lock-input--error" : ""}`}
              placeholder="Clave de acceso"
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setKeyError(false); }}
              autoFocus
            />
            {keyError && <p className="im-lock-error">Clave incorrecta</p>}
            <button type="submit" className="im-lock-btn">Acceder</button>
          </form>
          <p className="im-lock-hint">Acceso independiente del estado del servidor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="im-root">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="im-header">
        <div>
          <h1 className="im-title">Monitor de incidencias</h1>
          <p className="im-subtitle">
            {orgName} Sistemas · Última actualización: {lastUpdate || "—"}
          </p>
        </div>
        <div className="im-header-actions">
          <label className="im-toggle-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh 5s</span>
          </label>
          <button className="im-btn im-btn--refresh" onClick={refresh}>Actualizar</button>
          <button
            className="im-btn im-btn--clear"
            onClick={() => { clearIncidents(); refresh(); }}
          >
            Limpiar log
          </button>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="im-kpi-row">
        <div className="im-kpi">
          <span className="im-kpi-val">{stats.total}</span>
          <span className="im-kpi-lbl">Total registros</span>
        </div>
        <div className="im-kpi im-kpi--critical">
          <span className="im-kpi-val">{stats.critical}</span>
          <span className="im-kpi-lbl">Críticos (5xx)</span>
        </div>
        <div className="im-kpi im-kpi--warning">
          <span className="im-kpi-val">{stats.warning}</span>
          <span className="im-kpi-lbl">Advertencias (4xx)</span>
        </div>
        <div className="im-kpi im-kpi--info">
          <span className="im-kpi-val">{stats.info}</span>
          <span className="im-kpi-lbl">Informativos</span>
        </div>
      </div>

      {/* ── Sparkline ────────────────────────────────────────────────────── */}
      <div className="im-card im-sparkline-wrap">
        <div className="im-card-title">Errores por hora — últimas 12h</div>
        <ErrorSparkline incidents={incidents} />
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="im-filters">
        <div className="im-filter-tabs">
          {["all","critical","warning","info"].map(f => (
            <button
              key={f}
              className={`im-filter-tab ${filter === f ? "im-filter-tab--active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : SEV_LABEL[f]}
              {f !== "all" && (
                <span className={`im-filter-count im-filter-count--${f}`}>
                  {stats[f]}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="im-search"
          placeholder="Buscar por ruta, mensaje, rol..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Filtro por categoría (catálogo de errores) ───────────────────── */}
      <div className="im-filters" style={{ marginTop: -8 }}>
        <div className="im-filter-tabs" role="group" aria-label="Filtrar por categoría">
          <button
            className={`im-filter-tab ${catFilter === "all" ? "im-filter-tab--active" : ""}`}
            onClick={() => setCatFilter("all")}
          >
            Todas las categorías
          </button>
          {Object.entries(CAT_LABEL).map(([key, label]) => {
            const n = incidents.filter(i => (i.categoria || "api") === key).length;
            if (n === 0 && catFilter !== key) return null;
            return (
              <button
                key={key}
                className={`im-filter-tab ${catFilter === key ? "im-filter-tab--active" : ""}`}
                onClick={() => setCatFilter(key)}
              >
                {label}
                <span className="im-filter-count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tabla de incidentes ───────────────────────────────────────────── */}
      <div className="im-card im-table-wrap">
        {filtered.length === 0 ? (
          <div className="im-empty">
            {incidents.length === 0
              ? "Sin incidentes registrados. El sistema funciona correctamente."
              : "Sin resultados para el filtro actual."}
          </div>
        ) : (
          <table className="im-table">
            <thead>
              <tr>
                <th>Severidad</th>
                <th>Categoría</th>
                <th>Timestamp</th>
                <th>Método</th>
                <th>Ruta</th>
                <th>Status</th>
                <th>Rol</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr
                  key={inc.id}
                  className={`im-row im-row--${inc.severidad} ${selected?.id === inc.id ? "im-row--selected" : ""}`}
                  onClick={() => setSelected(selected?.id === inc.id ? null : inc)}
                >
                  <td>
                    <span className={`im-sev-badge im-sev-badge--${inc.severidad}`}>
                      {SEV_LABEL[inc.severidad]}
                    </span>
                  </td>
                  <td>
                    <span className="im-role-badge" title={inc.origen === "servidor" ? "Persistido en el servidor" : "Sesión local"}>
                      {CAT_LABEL[inc.categoria] || "API"}{inc.origen === "servidor" ? " ⬡" : ""}
                    </span>
                  </td>
                  <td className="im-cell-mono">{formatTime(inc.timestamp)}</td>
                  <td>
                    <span
                      className="im-method-badge"
                      style={{ color: METHOD_COLOR[inc.method] || "#888" }}
                    >
                      {inc.method}
                    </span>
                  </td>
                  <td className="im-cell-mono im-cell-url" title={inc.url}>
                    {formatUrl(inc.url)}
                  </td>
                  <td>
                    <span className={`im-status-badge im-status-badge--${inc.severidad}`}>
                      {inc.status || "NET"}
                    </span>
                  </td>
                  <td>
                    <span className="im-role-badge">{inc.role}</span>
                  </td>
                  <td className="im-cell-msg" title={inc.message}>
                    {inc.message.slice(0, 60)}{inc.message.length > 60 ? "…" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Panel de detalle al seleccionar ──────────────────────────────── */}
      {selected && (
        <div className="im-detail-panel">
          <div className="im-detail-header">
            <span className="im-detail-title">Detalle del incidente</span>
            <button className="im-detail-close" onClick={() => setSelected(null)}><FiX /></button>
          </div>
          <div className="im-detail-grid">
            {[
              ["ID",           String(selected.id)],
              ["Categoría",    CAT_LABEL[selected.categoria] || "API"],
              ["Origen",       selected.origen === "servidor" ? "Servidor (persistido)" : "Sesión local"],
              ["Timestamp",    formatTime(selected.timestamp)],
              ["Método",       selected.method],
              ["URL completa", selected.url],
              ["Status HTTP",  selected.status || "Sin respuesta (error de red)"],
              ["Mensaje",      selected.message],
              ["Rol usuario",  selected.role],
              ["User agent",   selected.userAgent || "—"],
              ["Severidad",    SEV_LABEL[selected.severidad]],
            ].map(([k, v]) => (
              <div key={k} className="im-detail-row">
                <span className="im-detail-key">{k}</span>
                <span className="im-detail-val">{v}</span>
              </div>
            ))}
            {selected.stack && (
              <div className="im-detail-row im-detail-row--full">
                <span className="im-detail-key">Stack trace</span>
                <pre className="im-detail-stack">{selected.stack}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="im-footer">
        {orgName} Sistemas · Monitor de incidencias · {filtered.length} de {incidents.length} registros visibles
      </div>
    </div>
  );
}

export default IncidentMonitor;