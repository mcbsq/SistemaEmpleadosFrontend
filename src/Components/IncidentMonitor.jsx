import React, { useEffect, useState, useCallback } from "react";
import "./IncidentMonitor.css";
import { getIncidents, clearIncidents } from "../utils/incidentLogger";

// ─── Backdoor key: /monitor?key=cibercom2026 ─────────────────────────────────
// Accesible sin login. Ruta: /monitor
const BACKDOOR_KEY = "cibercom2026";

const SEV_LABEL = {
  critical: "Crítico",
  warning:  "Advertencia",
  info:     "Info",
  ok:       "OK",
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
  const [authorized, setAuthorized] = useState(false);
  const [keyInput,   setKeyInput]   = useState("");
  const [keyError,   setKeyError]   = useState(false);
  const [incidents,  setIncidents]  = useState([]);
  const [filter,     setFilter]     = useState("all"); // all | critical | warning | info
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

  // Cargar y refrescar incidentes
  const refresh = useCallback(() => {
    const data = getIncidents();
    setIncidents(data);
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
          <div className="im-lock-icon">⚡</div>
          <h2 className="im-lock-title">Monitor de incidencias</h2>
          <p className="im-lock-sub">Cibercom Sistemas · Acceso restringido</p>
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
            Cibercom Sistemas · Última actualización: {lastUpdate || "—"}
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
            <button className="im-detail-close" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="im-detail-grid">
            <div className="im-detail-row"><span className="im-detail-key">ID</span><code className="im-detail-val">{inc => inc.id}</code></div>
            {[
              ["Timestamp",    formatTime(selected.timestamp)],
              ["Método",       selected.method],
              ["URL completa", selected.url],
              ["Status HTTP",  selected.status || "Sin respuesta (error de red)"],
              ["Mensaje",      selected.message],
              ["Rol usuario",  selected.role],
              ["User agent",   selected.userAgent],
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
        Cibercom Sistemas · Monitor de incidencias · {filtered.length} de {incidents.length} registros visibles
      </div>
    </div>
  );
}

export default IncidentMonitor;