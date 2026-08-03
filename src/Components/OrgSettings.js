// src/Components/OrgSettings.js
// Monitor de errores integrado como tab — el /monitor ya no necesita ser ruta separada.
// Acceso: solo SUPER_ADMIN (controlado por RoleRoute en App.js)

import React, { useState, useEffect, useCallback } from "react";
import { FiZap, FiCheck, FiKey, FiFileText } from "react-icons/fi";
import { useOrg } from "../context/OrgContext";
import { apiFetch } from "../services/apiConfig";
import "./OrgSettings.css";

const MODULE_CATALOG = [
  { key: "home_carousel",       label: "Carrusel de empleados",  desc: "Vista 3D del equipo en Home" },
  { key: "organigrama",         label: "Organigrama",            desc: "Árbol jerárquico interactivo" },
  { key: "empleados_table",     label: "Tabla de empleados",     desc: "CRUD completo de RH" },
  { key: "dashboard_admin",     label: "Dashboard Admin",        desc: "KPIs y analíticos generales" },
  { key: "dashboard_medico",    label: "Dashboard Médico",       desc: "Expediente clínico y salud" },
  { key: "dashboard_pm",        label: "Dashboard PM",           desc: "Proyectos y capacidad del equipo" },
  { key: "dashboard_contador",  label: "Dashboard Contador",     desc: "Nómina y finanzas" },
  { key: "dashboard_jefe_area", label: "Dashboard Jefe de Área", desc: "Mi equipo directo" },
  { key: "global_search",       label: "Búsqueda global",        desc: "Buscar empleados y datos" },
  { key: "incident_monitor",    label: "Monitor de errores",     desc: "Log de fallos del sistema" },
  { key: "vacaciones",          label: "Vacaciones",             desc: "Solicitud y aprobación de vacaciones" },
  { key: "prestamos",           label: "Préstamos a empleados",  desc: "Registro y seguimiento de préstamos" },
  { key: "documentos_financieros", label: "Documentos financieros", desc: "Recibos de nómina y CFDI en el perfil" },
];

const ROLES_DISPONIBLES = [
  "SUPER_ADMIN", "ADMIN", "EMPLOYEE", "CONTADOR",
  "PROJECT_MANAGER", "JEFE_AREA", "MEDICO",
];

const SEV_MAP = {
  error:   { label: "Error",  cls: "orgs-sev--error"   },
  warning: { label: "Aviso",  cls: "orgs-sev--warning" },
  info:    { label: "Info",   cls: "orgs-sev--info"    },
};

const TABS = [
  { id: "identidad",   label: "Identidad"   },
  { id: "modulos",     label: "Módulos"     },
  { id: "kpis",        label: "KPIs"        },
  { id: "vacaciones",  label: "Vacaciones"  },
  { id: "apikeys",     label: "API Keys"    },
  { id: "auditoria",   label: "Auditoría"   },
  { id: "analitica",   label: "Analítica"   },
  { id: "monitor",     label: "Monitor", icon: FiZap },
];

const ROLES_ANALITICA = ["EMPLOYEE", "JEFE_AREA", "CONTADOR", "PROJECT_MANAGER", "MEDICO"];

function OrgSettings() {
  const { orgConfig, updateOrgConfig } = useOrg();

  const [activeTab,    setActiveTab]    = useState("identidad");
  const [localName,    setLocalName]    = useState(orgConfig?.name     || "");
  const [localColors,  setLocalColors]  = useState(orgConfig?.branding || {});
  const [localModules, setLocalModules] = useState(orgConfig?.modules  || {});
  const [localKpis,    setLocalKpis]    = useState(orgConfig?.kpis     || []);
  const [localVacaciones, setLocalVacaciones] = useState(
    orgConfig?.vacaciones || { tabla_dias_por_antiguedad: {}, roles_aprueban: [], notificar_por_correo: true }
  );
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  // Monitor
  const [incidents,       setIncidents]       = useState([]);
  const [monitorLoading,  setMonitorLoading]  = useState(false);
  const [monitorFilter,   setMonitorFilter]   = useState("all");

  // API Keys
  const [apiKeys,        setApiKeys]        = useState([]);
  const [apiScopes,      setApiScopes]      = useState([]);
  const [keysLoading,    setKeysLoading]    = useState(false);
  const [nuevaKeyNombre, setNuevaKeyNombre] = useState("");
  const [nuevaKeyScopes, setNuevaKeyScopes] = useState([]);
  const [creandoKey,     setCreandoKey]     = useState(false);
  const [keyRecienCreada, setKeyRecienCreada] = useState(null);

  const cargarApiKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const [keys, scopes] = await Promise.all([
        apiFetch("/apikeys").catch(() => []),
        apiFetch("/apikeys/scopes").catch(() => []),
      ]);
      setApiKeys(Array.isArray(keys) ? keys : []);
      setApiScopes(Array.isArray(scopes) ? scopes : []);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "apikeys") cargarApiKeys();
  }, [activeTab, cargarApiKeys]);

  const toggleNuevoScope = (key) =>
    setNuevaKeyScopes(p => p.includes(key) ? p.filter(s => s !== key) : [...p, key]);

  const handleCrearApiKey = async () => {
    if (!nuevaKeyNombre.trim() || nuevaKeyScopes.length === 0) return;
    setCreandoKey(true);
    try {
      const resp = await apiFetch("/apikeys", {
        method: "POST",
        body: JSON.stringify({ nombre: nuevaKeyNombre.trim(), scopes: nuevaKeyScopes }),
      });
      if (resp && resp.key) {
        setKeyRecienCreada(resp);
        setNuevaKeyNombre("");
        setNuevaKeyScopes([]);
        cargarApiKeys();
      }
    } finally {
      setCreandoKey(false);
    }
  };

  const handleRevocarApiKey = async (id) => {
    await apiFetch(`/apikeys/${id}/revocar`, { method: "PATCH" }).catch(() => null);
    cargarApiKeys();
  };

  const handleEliminarApiKey = async (id) => {
    await apiFetch(`/apikeys/${id}`, { method: "DELETE" }).catch(() => null);
    cargarApiKeys();
  };

  // Auditoría
  const [auditLog,        setAuditLog]        = useState([]);
  const [auditEntidades,  setAuditEntidades]   = useState([]);
  const [auditLoading,    setAuditLoading]     = useState(false);
  const [auditFiltro,     setAuditFiltro]      = useState("");

  const cargarAuditoria = useCallback(async (entidad) => {
    setAuditLoading(true);
    try {
      const qs = entidad ? `?entidad=${encodeURIComponent(entidad)}` : "";
      const [log, entidades] = await Promise.all([
        apiFetch(`/auditoria${qs}`).catch(() => []),
        apiFetch("/auditoria/entidades").catch(() => []),
      ]);
      setAuditLog(Array.isArray(log) ? log : []);
      setAuditEntidades(Array.isArray(entidades) ? entidades : []);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "auditoria") cargarAuditoria(auditFiltro);
  }, [activeTab, auditFiltro, cargarAuditoria]);

  // Analítica — permisos por rol
  const [catalogoReportes, setCatalogoReportes] = useState([]);
  const [permisosAnalitica, setPermisosAnalitica] = useState({});
  const [analiticaLoading, setAnaliticaLoading] = useState(false);
  const [analiticaSaved, setAnaliticaSaved] = useState(false);

  const cargarAnalitica = useCallback(async () => {
    setAnaliticaLoading(true);
    try {
      const [cat, perms] = await Promise.all([
        apiFetch("/analitica/catalogo").catch(() => []),
        apiFetch("/analitica/permisos").catch(() => ({ permisos: {} })),
      ]);
      setCatalogoReportes(Array.isArray(cat) ? cat : []);
      setPermisosAnalitica(perms?.permisos || {});
    } finally {
      setAnaliticaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "analitica") cargarAnalitica();
  }, [activeTab, cargarAnalitica]);

  const toggleReportePermiso = (role, reporteId) => {
    setPermisosAnalitica(p => {
      const actuales = p[role] || [];
      const otorgado = actuales.includes(reporteId);
      return { ...p, [role]: otorgado ? actuales.filter(id => id !== reporteId) : [...actuales, reporteId] };
    });
  };

  const handleGuardarAnalitica = async () => {
    await apiFetch("/analitica/permisos", { method: "PUT", body: JSON.stringify({ permisos: permisosAnalitica }) });
    setAnaliticaSaved(true);
    setTimeout(() => setAnaliticaSaved(false), 3000);
  };

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

  // Re-sincronizar cuando orgConfig termine de cargar del backend (llega
  // async después del primer render de este componente).
  useEffect(() => {
    setLocalName(orgConfig?.name || "");
    setLocalColors(orgConfig?.branding || {});
    setLocalModules(orgConfig?.modules || {});
    setLocalKpis(orgConfig?.kpis || []);
    setLocalVacaciones(orgConfig?.vacaciones || { tabla_dias_por_antiguedad: {}, roles_aprueban: [], notificar_por_correo: true });
  }, [orgConfig]);

  const toggleModule = (key) => setLocalModules(p => ({ ...p, [key]: !p[key] }));
  const toggleKpi    = (id)  => setLocalKpis(p => p.map(k => k.id === id ? { ...k, visible: !k.visible } : k));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrgConfig({ name: localName, branding: localColors, modules: localModules, kpis: localKpis, vacaciones: localVacaciones });
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
        {activeTab !== "monitor" && activeTab !== "apikeys" && activeTab !== "auditoria" && activeTab !== "analitica" && (
          <button className="orgs-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : saved ? <><FiCheck style={{ marginRight: 4, verticalAlign: "-2px" }} />Guardado</> : "Guardar cambios"}
          </button>
        )}
      </div>

      <div className="orgs-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`orgs-tab ${activeTab === t.id ? "orgs-tab--active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.icon && <t.icon style={{ marginRight: 6, verticalAlign: "-2px" }} />}
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

      {/* ── Vacaciones ────────────────────────────────────────────── */}
      {activeTab === "vacaciones" && (
        <div className="orgs-grid">
          <div className="hr-card">
            <div className="hr-card-title">Días de vacaciones por antigüedad</div>
            <p className="orgs-desc">
              Años cumplidos → días al año. Por defecto sigue el art. 76 de la LFT;
              cámbialo libremente según tu política interna.
            </p>
            {Object.entries(localVacaciones.tabla_dias_por_antiguedad || {})
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([anios, dias]) => (
                <div key={anios} className="orgs-color-row">
                  <span className="orgs-color-label">Desde el año {anios}</span>
                  <input
                    type="number" className="orgs-input" style={{ maxWidth: 90 }}
                    value={dias}
                    onChange={e => setLocalVacaciones(p => ({
                      ...p,
                      tabla_dias_por_antiguedad: { ...p.tabla_dias_por_antiguedad, [anios]: Number(e.target.value) },
                    }))}
                  />
                </div>
              ))}
          </div>

          <div className="hr-card">
            <div className="hr-card-title">Quién puede aprobar solicitudes</div>
            <p className="orgs-desc">
              ADMIN y SUPER_ADMIN siempre pueden aprobar. Agrega otros roles que también
              deban poder hacerlo (ej. Jefe de Área para su propio equipo).
            </p>
            <div className="orgs-module-list">
              {ROLES_DISPONIBLES.filter(r => r !== "SUPER_ADMIN" && r !== "ADMIN").map(rol => {
                const activo = (localVacaciones.roles_aprueban || []).includes(rol);
                return (
                  <div key={rol} className="orgs-module-row">
                    <div className="orgs-module-info">
                      <span className="orgs-module-label">{rol}</span>
                    </div>
                    <button
                      className={`orgs-toggle ${activo ? "orgs-toggle--on" : ""}`}
                      onClick={() => setLocalVacaciones(p => {
                        const actuales = p.roles_aprueban || [];
                        return {
                          ...p,
                          roles_aprueban: activo ? actuales.filter(r => r !== rol) : [...actuales, rol],
                        };
                      })}
                    >
                      <span className="orgs-toggle-thumb" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="orgs-module-row" style={{ marginTop: 12 }}>
              <div className="orgs-module-info">
                <span className="orgs-module-label">Notificar por correo al admin</span>
                <span className="orgs-module-desc">Avisa a los aprobadores cuando entra una solicitud nueva</span>
              </div>
              <button
                className={`orgs-toggle ${localVacaciones.notificar_por_correo ? "orgs-toggle--on" : ""}`}
                onClick={() => setLocalVacaciones(p => ({ ...p, notificar_por_correo: !p.notificar_por_correo }))}
              >
                <span className="orgs-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── API Keys ──────────────────────────────────────────────── */}
      {activeTab === "apikeys" && (
        <div className="orgs-grid">
          <div className="hr-card">
            <div className="hr-card-title">Generar nueva API key</div>
            <p className="orgs-desc">
              Para que otro programa consuma información de este sistema (integraciones,
              infraestructura propia, sistemas de terceros). La key se muestra una sola vez —
              guárdala en un lugar seguro, no puede recuperarse después.
            </p>
            <div className="orgs-field">
              <label className="orgs-label">Nombre / propósito</label>
              <input
                className="orgs-input"
                value={nuevaKeyNombre}
                onChange={e => setNuevaKeyNombre(e.target.value)}
                placeholder="Ej. Integración con sistema de nómina externo"
              />
            </div>
            <div className="orgs-module-list">
              {apiScopes.map(({ key, label }) => {
                const activo = nuevaKeyScopes.includes(key);
                return (
                  <div key={key} className="orgs-module-row">
                    <div className="orgs-module-info">
                      <span className="orgs-module-label">{label}</span>
                      <span className="orgs-module-desc">{key}</span>
                    </div>
                    <button className={`orgs-toggle ${activo ? "orgs-toggle--on" : ""}`} onClick={() => toggleNuevoScope(key)}>
                      <span className="orgs-toggle-thumb" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="orgs-save-btn"
              style={{ marginTop: 14 }}
              disabled={creandoKey || !nuevaKeyNombre.trim() || nuevaKeyScopes.length === 0}
              onClick={handleCrearApiKey}
            >
              {creandoKey ? "Generando…" : "Generar API key"}
            </button>

            {keyRecienCreada && (
              <div className="orgs-desc" style={{ marginTop: 14, padding: 12, border: "1px solid var(--orgs-border, #444)", borderRadius: 8 }}>
                <strong>Copia esta key ahora — no volverá a mostrarse:</strong>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                  <code style={{ userSelect: "all", wordBreak: "break-all" }}>{keyRecienCreada.key}</code>
                  <button
                    className="orgs-refresh-btn"
                    onClick={() => { navigator.clipboard?.writeText(keyRecienCreada.key); }}
                  >Copiar</button>
                </div>
                <button className="orgs-refresh-btn" style={{ marginTop: 8 }} onClick={() => setKeyRecienCreada(null)}>Cerrar</button>
              </div>
            )}
          </div>

          <div className="hr-card">
            <div className="hr-card-title">API keys existentes</div>
            {keysLoading ? (
              <div className="orgs-monitor-loading"><div className="hr-spinner"/><span>Cargando…</span></div>
            ) : apiKeys.length === 0 ? (
              <div className="orgs-monitor-empty">
                <span className="orgs-monitor-empty-icon"><FiKey /></span>
                <p>Sin API keys generadas todavía</p>
              </div>
            ) : (
              <div className="orgs-incident-list">
                {apiKeys.map(k => (
                  <div key={k._id} className="orgs-incident-row">
                    <span className={`orgs-sev-badge ${k.activa ? "orgs-sev--info" : "orgs-sev--error"}`}>
                      {k.activa ? "Activa" : "Revocada"}
                    </span>
                    <div className="orgs-incident-info">
                      <span className="orgs-incident-msg">{k.nombre}</span>
                      <span className="orgs-incident-meta">
                        <code className="orgs-incident-code">{k.prefijo}</code>
                        <span>{(k.scopes || []).join(", ")}</span>
                        {k.ultimo_uso && <span className="orgs-incident-time">Último uso: {new Date(k.ultimo_uso).toLocaleString("es-MX")}</span>}
                        <span className="orgs-incident-time">{k.usos_totales || 0} llamadas</span>
                      </span>
                    </div>
                    <div className="orgs-apikey-actions">
                      {k.activa && (
                        <button className="orgs-refresh-btn" onClick={() => handleRevocarApiKey(k._id)}>Revocar</button>
                      )}
                      <button className="orgs-refresh-btn" onClick={() => handleEliminarApiKey(k._id)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Auditoría ─────────────────────────────────────────────── */}
      {activeTab === "auditoria" && (
        <div className="hr-card">
          <div className="hr-card-title">Historial de cambios</div>
          <p className="orgs-desc">Quién cambió qué campo y cuándo, en datos sensibles del sistema.</p>

          <div className="orgs-monitor-toolbar">
            <div className="orgs-monitor-filters">
              <button className={`orgs-filter-btn ${auditFiltro === "" ? "orgs-filter-btn--active" : ""}`} onClick={() => setAuditFiltro("")}>
                Todo
              </button>
              {auditEntidades.map(ent => (
                <button
                  key={ent}
                  className={`orgs-filter-btn ${auditFiltro === ent ? "orgs-filter-btn--active" : ""}`}
                  onClick={() => setAuditFiltro(ent)}
                >
                  {ent}
                </button>
              ))}
            </div>
            <button className="orgs-refresh-btn" onClick={() => cargarAuditoria(auditFiltro)}>↺ Refrescar</button>
          </div>

          {auditLoading ? (
            <div className="orgs-monitor-loading"><div className="hr-spinner"/><span>Cargando…</span></div>
          ) : auditLog.length === 0 ? (
            <div className="orgs-monitor-empty">
              <span className="orgs-monitor-empty-icon"><FiFileText /></span>
              <p>Sin cambios registrados{auditFiltro ? ` en "${auditFiltro}"` : ""}</p>
            </div>
          ) : (
            <div className="orgs-incident-list">
              {auditLog.map(a => (
                <div key={a._id} className="orgs-incident-row">
                  <span className="orgs-sev-badge orgs-sev--info">{a.accion}</span>
                  <div className="orgs-incident-info">
                    <span className="orgs-incident-msg">
                      <strong>{a.usuario || "—"}</strong> ({a.role || "—"}) modificó <strong>{a.entidad}</strong>
                      {a.entidad_id ? ` (${a.entidad_id.slice(-6)})` : ""}
                    </span>
                    {a.detalle && <span className="orgs-incident-meta">{a.detalle}</span>}
                    {a.cambios && Object.keys(a.cambios).length > 0 && (
                      <span className="orgs-incident-meta" style={{ flexWrap: "wrap" }}>
                        {Object.entries(a.cambios).map(([campo, { antes, despues }]) => (
                          <code key={campo} className="orgs-incident-code">
                            {campo}: {JSON.stringify(antes)} → {JSON.stringify(despues)}
                          </code>
                        ))}
                      </span>
                    )}
                    <span className="orgs-incident-time">{new Date(a.creado_en).toLocaleString("es-MX")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Analítica: permisos por rol ───────────────────────────── */}
      {activeTab === "analitica" && (
        <div className="hr-card">
          <div className="hr-card-title">Permisos de reportes por rol</div>
          <p className="orgs-desc">
            ADMIN y SUPER_ADMIN siempre ven todos los reportes. Elige qué otros roles pueden
            ver y exportar cada uno.
          </p>
          {analiticaLoading ? (
            <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "var(--hr-font-xs)", color: "var(--hr-muted)" }}>Reporte</th>
                    {ROLES_ANALITICA.map(role => (
                      <th key={role} style={{ padding: "6px 10px", fontSize: "var(--hr-font-xs)", color: "var(--hr-muted)" }}>{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalogoReportes.map(r => (
                    <tr key={r.id}>
                      <td style={{ padding: "6px 10px" }}>
                        <div style={{ fontWeight: 600 }}>{r.nombre}</div>
                        <div className="orgs-desc" style={{ marginTop: 2 }}>{r.descripcion}</div>
                      </td>
                      {ROLES_ANALITICA.map(role => (
                        <td key={role} style={{ textAlign: "center", padding: "6px 10px" }}>
                          <button
                            className={`orgs-toggle ${(permisosAnalitica[role] || []).includes(r.id) ? "orgs-toggle--on" : ""}`}
                            onClick={() => toggleReportePermiso(role, r.id)}
                          >
                            <span className="orgs-toggle-thumb" />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="orgs-save-btn" style={{ marginTop: 16 }} onClick={handleGuardarAnalitica}>
            {analiticaSaved ? "Guardado" : "Guardar permisos"}
          </button>
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
              <span className="orgs-monitor-empty-icon"><FiCheck /></span>
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