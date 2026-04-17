// src/Components/OrgSettings.js
// Monitor de errores integrado como tab — el /monitor ya no necesita ser ruta separada.
// Acceso: solo SUPER_ADMIN (controlado por RoleRoute en App.js)

import React, { useState, useEffect, useCallback } from "react";
import { useOrg } from "../context/OrgContext";
import { apiFetch } from "../services/apiConfig";
import "./OrgSettings.css";

const MODULE_CATALOG = [
  { key: "home_carousel",       label: "Carrusel de empleados",  desc: "Vista 3D del equipo en Home" },
  { key: "organigrama",         label: "Organigrama",            desc: "Árbol jerárquico interactivo" },
  { key: "empleados_table",     label: "Tabla de empleados",     desc: "CRUD completo de RH" },
  { key: "dashboard_admin",     label: "Dashboard Admin",        desc: "KPIs y analíticos generales" },
  { key: "dashboard_rh",        label: "Dashboard RH",           desc: "Headcount, puestos, jefes" },
  { key: "dashboard_medico",    label: "Dashboard Médico",       desc: "Expediente clínico y salud" },
  { key: "dashboard_pm",        label: "Dashboard PM",           desc: "Proyectos y capacidad del equipo" },
  { key: "dashboard_contador",  label: "Dashboard Contador",     desc: "Nómina y finanzas" },
  { key: "dashboard_jefe_area", label: "Dashboard Jefe de Área", desc: "Mi equipo directo" },
  { key: "global_search",       label: "Búsqueda global",        desc: "Buscar empleados y datos" },
  { key: "incident_monitor",    label: "Monitor de errores",     desc: "Log de fallos del sistema" },
];

const SEV_MAP = {
  error:   { label: "Error",  cls: "orgs-sev--error"   },
  warning: { label: "Aviso",  cls: "orgs-sev--warning" },
  info:    { label: "Info",   cls: "orgs-sev--info"    },
};

const TABS = [
  { id: "identidad", label: "Identidad"  },
  { id: "modulos",   label: "Módulos"    },
  { id: "kpis",      label: "KPIs"       },
  { id: "monitor",   label: "Monitor ⚡" },
];

function OrgSettings() {
  const { orgConfig, updateOrgConfig } = useOrg();

  const [activeTab,    setActiveTab]    = useState("identidad");
  const [localName,    setLocalName]    = useState(orgConfig?.name     || "");
  const [localColors,  setLocalColors]  = useState(orgConfig?.branding || {});
  const [localModules, setLocalModules] = useState(orgConfig?.modules  || {});
  const [localKpis,    setLocalKpis]    = useState(orgConfig?.kpis     || []);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  // Monitor
  const [incidents,       setIncidents]       = useState([]);
  const [monitorLoading,  setMonitorLoading]  = useState(false);
  const [monitorFilter,   setMonitorFilter]   = useState("all");

  const cargarIncidentes = useCallback(async () => {
    setMonitorLoading(true);
    try {
      const data = await apiFetch("/monitor/incidents").catch(() => null);
      if (Array.isArray(data)) {
        setIncidents(data);
      } else {
        // Fallback al log en memoria que crea incidentLogger.js
        const log = window.__incidentLog || [];
        setIncidents([...log].reverse());
      }
    } finally {
      setMonitorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "monitor") cargarIncidentes();
  }, [activeTab, cargarIncidentes]);

  const toggleModule = (key) => setLocalModules(p => ({ ...p, [key]: !p[key] }));
  const toggleKpi    = (id)  => setLocalKpis(p => p.map(k => k.id === id ? { ...k, visible: !k.visible } : k));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrgConfig({ name: localName, branding: localColors, modules: localModules, kpis: localKpis });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* logueado en contexto */ }
    finally { setSaving(false); }
  };

  const filtrados = monitorFilter === "all"
    ? incidents
    : incidents.filter(i => (i.severity || i.type || "info") === monitorFilter);

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title">Configuración del sistema</h2>
          <p className="hr-subtitle">Módulos · Identidad · KPIs · Monitor · Solo SUPER_ADMIN</p>
        </div>
        {activeTab !== "monitor" && (
          <button className="orgs-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar cambios"}
          </button>
        )}
      </div>

      <div className="orgs-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`orgs-tab ${activeTab === t.id ? "orgs-tab--active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Identidad ─────────────────────────────────────────────── */}
      {activeTab === "identidad" && (
        <div className="orgs-grid">
          <div className="hr-card">
            <div className="hr-card-title">Nombre e identidad</div>
            <div className="orgs-field">
              <label className="orgs-label">Nombre de la empresa</label>
              <input className="orgs-input" value={localName} onChange={e => setLocalName(e.target.value)} placeholder="Nombre de tu organización" />
            </div>
          </div>
          <div className="hr-card">
            <div className="hr-card-title">Colores de marca</div>
            <p className="orgs-desc">Los cambios se aplican inmediatamente en toda la interfaz.</p>
            {[
              { key: "primaryColor",   label: "Color primario"   },
              { key: "secondaryColor", label: "Color secundario" },
              { key: "accentColor",    label: "Color de acento"  },
            ].map(({ key, label }) => (
              <div key={key} className="orgs-color-row">
                <span className="orgs-color-label">{label}</span>
                <div className="orgs-color-pick">
                  <input type="color" value={localColors[key] || "#5B8AF0"} onChange={e => setLocalColors(p => ({ ...p, [key]: e.target.value }))} className="orgs-color-input" />
                  <span className="orgs-color-hex">{localColors[key] || "#5B8AF0"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Módulos ───────────────────────────────────────────────── */}
      {activeTab === "modulos" && (
        <div className="hr-card">
          <div className="hr-card-title">Módulos activos</div>
          <p className="orgs-desc">Activa solo los módulos que tu empresa necesita. Los desactivados desaparecen de la interfaz para todos los usuarios.</p>
          <div className="orgs-module-list">
            {MODULE_CATALOG.map(({ key, label, desc }) => (
              <div key={key} className="orgs-module-row">
                <div className="orgs-module-info">
                  <span className="orgs-module-label">{label}</span>
                  <span className="orgs-module-desc">{desc}</span>
                </div>
                <button className={`orgs-toggle ${localModules[key] ? "orgs-toggle--on" : ""}`} onClick={() => toggleModule(key)}>
                  <span className="orgs-toggle-thumb" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      {activeTab === "kpis" && (
        <div className="hr-card">
          <div className="hr-card-title">KPIs visibles en dashboard</div>
          <p className="orgs-desc">Elige qué métricas aparecen en el panel principal.</p>
          <div className="orgs-kpi-list">
            {localKpis.map(kpi => (
              <div key={kpi.id} className="orgs-kpi-row">
                <span className="orgs-kpi-dot" style={{ background: kpi.color }} />
                <span className="orgs-kpi-label">{kpi.label}</span>
                <button className={`orgs-toggle ${kpi.visible ? "orgs-toggle--on" : ""}`} onClick={() => toggleKpi(kpi.id)}>
                  <span className="orgs-toggle-thumb" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monitor ───────────────────────────────────────────────── */}
      {activeTab === "monitor" && (
        <div className="orgs-monitor">
          <div className="orgs-monitor-toolbar">
            <div className="orgs-monitor-filters">
              {["all","error","warning","info"].map(f => (
                <button key={f} className={`orgs-filter-btn ${monitorFilter === f ? "orgs-filter-btn--active" : ""}`} onClick={() => setMonitorFilter(f)}>
                  {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button className="orgs-refresh-btn" onClick={cargarIncidentes}>↺ Refrescar</button>
          </div>

          {monitorLoading ? (
            <div className="orgs-monitor-loading"><div className="hr-spinner"/><span>Cargando…</span></div>
          ) : filtrados.length === 0 ? (
            <div className="orgs-monitor-empty">
              <span className="orgs-monitor-empty-icon">✓</span>
              <p>Sin incidentes{monitorFilter !== "all" ? ` de tipo "${monitorFilter}"` : ""}</p>
            </div>
          ) : (
            <div className="orgs-incident-list">
              {filtrados.map((inc, i) => {
                const sev = SEV_MAP[inc.severity || inc.type || "info"] || SEV_MAP.info;
                return (
                  <div key={inc.id || i} className="orgs-incident-row">
                    <span className={`orgs-sev-badge ${sev.cls}`}>{sev.label}</span>
                    <div className="orgs-incident-info">
                      <span className="orgs-incident-msg">{inc.message || inc.error || inc.msg || "Sin descripción"}</span>
                      <span className="orgs-incident-meta">
                        {inc.endpoint && <code className="orgs-incident-code">{inc.endpoint}</code>}
                        {inc.timestamp && <span className="orgs-incident-time">{new Date(inc.timestamp).toLocaleString("es-MX")}</span>}
                      </span>
                    </div>
                    {inc.status && <span className="orgs-incident-status">{inc.status}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OrgSettings;