// src/Components/OrgSettings.js
// Monitor de errores integrado como tab — el /monitor ya no necesita ser ruta separada.
// Acceso: solo SUPER_ADMIN (controlado por RoleRoute en App.js)

import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { MeshGradient } from "@paper-design/shaders-react";
import { PRESETS_GRADIENTE, coloresGradiente } from "../utils/gradiente";
import IconButton from "./IconButton";
import { RecordCard } from "./RecordCard";
import { FiZap, FiCheck, FiKey, FiFileText, FiGitBranch, FiTrash2, FiArrowRight, FiX } from "react-icons/fi";
import { useOrg } from "../context/OrgContext";
import { apiFetch } from "../services/apiConfig";
import { catalogodeptoService } from "../services/catalogodeptoService";
import "./OrgSettings.css";

const MODULE_CATALOG = [
  { key: "home_carousel",       label: "Carrusel de empleados",  desc: "Vista 3D del equipo en Home" },
  { key: "organigrama",         label: "Organigrama",            desc: "Árbol jerárquico interactivo" },
  { key: "empleados_table",     label: "Tabla de empleados",     desc: "CRUD completo de RH" },
  { key: "dashboard_admin",     label: "Dashboard Admin",        desc: "KPIs y analíticos generales" },
  { key: "dashboard_rh",        label: "Panel de RH",            desc: "Pendientes, expedientes incompletos y la semana" },
  { key: "dashboard_medico",    label: "Dashboard Médico",       desc: "Expediente clínico y salud" },
  { key: "dashboard_pm",        label: "Dashboard PM",           desc: "Proyectos y capacidad del equipo" },
  { key: "dashboard_contador",  label: "Dashboard Contador",     desc: "Nómina y finanzas" },
  { key: "dashboard_jefe_area", label: "Dashboard Jefe de Área", desc: "Mi equipo directo" },
  { key: "global_search",       label: "Búsqueda global",        desc: "Buscar empleados y datos" },
  { key: "incident_monitor",    label: "Monitor de errores",     desc: "Log de fallos del sistema" },
  { key: "vacaciones",          label: "Vacaciones",             desc: "Solicitud y aprobación de vacaciones" },
  { key: "prestamos",           label: "Préstamos a empleados",  desc: "Registro y seguimiento de préstamos" },
  { key: "documentos_financieros", label: "Documentos financieros", desc: "Recibos de nómina y CFDI en el perfil" },
  { key: "redes_sociales",      label: "Redes sociales",         desc: "Perfiles de redes en el perfil del empleado" },
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
  { id: "areas",       label: "Áreas"       },
  { id: "vacaciones",  label: "Vacaciones"  },
  { id: "apikeys",     label: "API Keys"    },
  { id: "auditoria",   label: "Auditoría"   },
  { id: "monitor",     label: "Monitor", icon: FiZap },
];

function OrgSettings() {
  const { orgConfig, updateOrgConfig } = useOrg();

  const [activeTab,    setActiveTab]    = useState("identidad");
  const [localName,    setLocalName]    = useState(orgConfig?.name     || "");
  const [localSessionMinutes, setLocalSessionMinutes] = useState(orgConfig?.sessionMinutes || 30);
  const [localColors,  setLocalColors]  = useState(orgConfig?.branding || {});
  const [localModules, setLocalModules] = useState(orgConfig?.modules  || {});
  const [localKpis,    setLocalKpis]    = useState(orgConfig?.kpis     || []);
  const [localVacaciones, setLocalVacaciones] = useState(
    orgConfig?.vacaciones || { tabla_dias_por_antiguedad: {}, roles_aprueban: [], notificar_por_correo: true }
  );
  const gradiente = coloresGradiente({ branding: localColors }, "dark");
  const [detalle, setDetalle] = useState(null); // tarjeta de Auditoría/Monitor abierta
  const [modalArea, setModalArea] = useState(false);
  const [modalKey, setModalKey] = useState(false);
  const [areaAbierta, setAreaAbierta] = useState(null);
  const [keyAbierta, setKeyAbierta] = useState(null);
  const [nuevoPuesto, setNuevoPuesto] = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  // Áreas — jerarquía real de departamentos (quién depende de quién), la
  // que usa el Organigrama para dibujar el árbol de arriba hacia abajo.
  const [areas,        setAreas]        = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areaNueva,    setAreaNueva]    = useState({ NombreDepto: "", Descripcion: "", DeptoPadre: "" });
  const [creandoArea,  setCreandoArea]  = useState(false);

  const cargarAreas = useCallback(async () => {
    setAreasLoading(true);
    try {
      const data = await catalogodeptoService.getAll().catch(() => []);
      setAreas(Array.isArray(data) ? data : []);
    } finally {
      setAreasLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "areas") cargarAreas();
  }, [activeTab, cargarAreas]);

  const handleCrearArea = async () => {
    if (!areaNueva.NombreDepto.trim()) return;
    setCreandoArea(true);
    try {
      await catalogodeptoService.create({
        NombreDepto: areaNueva.NombreDepto.trim(),
        Descripcion: areaNueva.Descripcion.trim(),
        Poblacion: 0,
        DeptoPadre: areaNueva.DeptoPadre || null,
      });
      setAreaNueva({ NombreDepto: "", Descripcion: "", DeptoPadre: "" });
      cargarAreas();
    } finally {
      setCreandoArea(false);
    }
  };

  const handleCambiarPadre = async (area, nuevoPadre) => {
    await catalogodeptoService.update(area._id.$oid || area._id, {
      NombreDepto: area.NombreDepto, Descripcion: area.Descripcion || "",
      Poblacion: area.Poblacion || 0, DeptoPadre: nuevoPadre || null,
    });
    cargarAreas();
  };

  // Catálogo de puestos del área: se guarda al momento (agregar o quitar).
  const guardarPuestos = async (area, puestos) => {
    const id = area._id.$oid || area._id;
    const r = await catalogodeptoService.setPuestos(id, puestos).catch(() => null);
    if (!r) return;
    const act = { ...area, Puestos: r.Puestos };
    setAreas(lista => lista.map(a => (a.NombreDepto === area.NombreDepto ? act : a)));
    setAreaAbierta(act);
  };
  const agregarPuesto = () => {
    const nombre = nuevoPuesto.trim();
    if (!nombre || !areaAbierta) return;
    guardarPuestos(areaAbierta, [...(areaAbierta.Puestos || []), nombre]);
    setNuevoPuesto("");
  };

  const handleEliminarArea = async (area) => {
    if (!window.confirm(`¿Eliminar el área "${area.NombreDepto}" del catálogo? Los empleados que ya la tengan asignada no se ven afectados.`)) return false;
    await catalogodeptoService.delete(area._id.$oid || area._id);
    cargarAreas();
    return true;
  };

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
    return true;
  };

  const handleEliminarApiKey = async (id) => {
    if (!window.confirm("¿Eliminar esta API key? Los sistemas que la usen dejarán de conectarse.")) return false;
    await apiFetch(`/apikeys/${id}`, { method: "DELETE" }).catch(() => null);
    cargarApiKeys();
    return true;
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
    setLocalSessionMinutes(orgConfig?.sessionMinutes || 30);
  }, [orgConfig]);

  // Los módulos se guardan de inmediato al activarlos/desactivarlos — no
  // dependen del botón "Guardar cambios" de arriba (que es para
  // Identidad/KPIs/Vacaciones). Pedido implícito del cliente: activar un
  // módulo y que aparezca al toque, sin un paso de guardado adicional que
  // pueda olvidarse.
  const toggleModule = (key) => {
    setLocalModules(p => {
      const next = { ...p, [key]: !p[key] };
      updateOrgConfig({ modules: next }).catch(() => {});
      return next;
    });
  };
  const toggleKpi    = (id)  => setLocalKpis(p => p.map(k => k.id === id ? { ...k, visible: !k.visible } : k));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrgConfig({
        name: localName, branding: localColors, modules: localModules, kpis: localKpis,
        vacaciones: localVacaciones, sessionMinutes: localSessionMinutes,
      });
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
        {activeTab !== "monitor" && activeTab !== "apikeys" && activeTab !== "auditoria" && (
          <IconButton accion="guardar" size="lg" icon={saved ? FiCheck : undefined} busy={saving}
            label={saved ? "Guardado" : "Guardar cambios"} onClick={handleSave} tooltipPos="left" />
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
          <div className="hr-card">
            <div className="hr-card-title">Sesión</div>
            <p className="orgs-desc">
              Cuánto tiempo dura una sesión sin actividad antes de que el sistema
              cierre la sesión automáticamente. Cada empresa decide su propio
              criterio de seguridad.
            </p>
            <div className="orgs-field">
              <label className="orgs-label">Duración de la sesión (minutos)</label>
              <input
                className="orgs-input"
                type="number"
                min={5}
                max={1440}
                value={localSessionMinutes}
                onChange={e => setLocalSessionMinutes(Math.max(5, Math.min(1440, Number(e.target.value) || 30)))}
              />
            </div>
          </div>
          <div className="hr-card orgs-card--ancha">
            <div className="hr-card-title">Fondo animado</div>
            <p className="orgs-desc">Los colores del gradiente que se mueve detrás de todo el sistema. Elige un estilo o arma el tuyo.</p>
            <div className="orgs-grad">
              <div className="orgs-grad-preview" aria-hidden="true">
                <MeshGradient className="orgs-grad-mesh" colors={gradiente} speed={0.3} distortion={0.8} swirl={0.4} grainMixer={0} grainOverlay={0.03} fit="cover" />
              </div>
              <div className="orgs-grad-controles">
                <div className="orgs-grad-presets" role="radiogroup" aria-label="Estilos predefinidos">
                  {PRESETS_GRADIENTE.map(p => {
                    const activo = p.colores.join() === gradiente.join();
                    return (
                      <button key={p.id} type="button" role="radio" aria-checked={activo}
                        className={`orgs-grad-preset${activo ? " is-on" : ""}`}
                        onClick={() => setLocalColors(c => ({ ...c, gradiente: p.colores }))}>
                        <span className="orgs-grad-swatch" style={{ background: `linear-gradient(135deg, ${p.colores.join(", ")})` }} />
                        <span>{p.nombre}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="orgs-grad-colores">
                  {gradiente.map((c, i) => (
                    <label key={i} className="orgs-grad-color">
                      <input type="color" value={c} aria-label={`Color ${i + 1} del gradiente`}
                        onChange={e => setLocalColors(cfg => { const g = [...gradiente]; g[i] = e.target.value; return { ...cfg, gradiente: g }; })} />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
                <p className="orgs-desc">El primer color es el fondo; procura que sea oscuro para que el texto se lea bien. En tema claro se usan los mismos colores, aclarados.</p>
              </div>
            </div>
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

      {/* ── Áreas — jerarquía real para el Organigrama ──────────────── */}
      {activeTab === "areas" && (
        <div className="hr-card">
          <div className="hr-card-title"><FiGitBranch style={{ verticalAlign: "-2px", marginRight: 6 }} />Jerarquía de áreas</div>
          <p className="orgs-desc">
            Define de qué área depende cada una (ej. "Tecnología" depende de "Dirección General").
            El Organigrama dibuja el árbol de arriba hacia abajo exactamente como quede aquí — las áreas
            sin "Depende de" quedan como primer nivel, justo debajo de la empresa.
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton accion="agregar" label="Agregar área" tooltipPos="left" onClick={() => setModalArea(true)} />
          </div>
          <Modal abierto={modalArea} onClose={() => setModalArea(false)} titulo="Agregar área"
            subtitulo="Elige de qué área depende; el organigrama se dibuja con esta jerarquía."
            onGuardar={async () => { await handleCrearArea(); setModalArea(false); }} guardando={creandoArea}
            labelGuardar="Agregar área" puedeGuardar={!!areaNueva.NombreDepto.trim()}>
          <div className="orgs-color-row" style={{ marginBottom: 10 }}>
            <input className="orgs-input" placeholder="Nombre del área (ej. Tecnología)"
              value={areaNueva.NombreDepto} onChange={e => setAreaNueva(a => ({ ...a, NombreDepto: e.target.value }))} />
            <select className="orgs-input" value={areaNueva.DeptoPadre}
              onChange={e => setAreaNueva(a => ({ ...a, DeptoPadre: e.target.value }))}>
              <option value="">— Primer nivel (sin depender de nadie) —</option>
              {areas.map(a => <option key={a.NombreDepto} value={a.NombreDepto}>Depende de: {a.NombreDepto}</option>)}
            </select>
          </div>
          <input className="orgs-input" placeholder="Descripción (opcional)" style={{ marginBottom: 10 }}
            value={areaNueva.Descripcion} onChange={e => setAreaNueva(a => ({ ...a, Descripcion: e.target.value }))} />
          </Modal>

          <Modal abierto={!!areaAbierta} onClose={() => { setAreaAbierta(null); setNuevoPuesto(""); }} titulo={areaAbierta?.NombreDepto || ""}
            subtitulo={areaAbierta?.Descripcion || "Sin descripción"}>
            {areaAbierta && (
              <>
                <label className="field-label" htmlFor="area-padre">¿De qué área depende?</label>
                <select id="area-padre" className="orgs-input" value={areaAbierta.DeptoPadre || ""}
                  onChange={async e => { const v = e.target.value; await handleCambiarPadre(areaAbierta, v); setAreaAbierta(x => ({ ...x, DeptoPadre: v || null })); }}>
                  <option value="">Primer nivel (no depende de nadie)</option>
                  {areas.filter(x => x.NombreDepto !== areaAbierta.NombreDepto).map(x => (
                    <option key={x.NombreDepto} value={x.NombreDepto}>Depende de: {x.NombreDepto}</option>
                  ))}
                </select>
                <p className="field-hint">El cambio se guarda al momento y el Organigrama lo refleja.</p>

                <span className="field-label" style={{ marginTop: 14, display: "block" }}>Puestos de esta área</span>
                <div className="orgs-puestos">
                  {(areaAbierta.Puestos || []).length === 0 && <span className="field-hint">Sin puestos todavía. Los empleados los eligen de esta lista en su perfil.</span>}
                  {(areaAbierta.Puestos || []).map(p => (
                    <span key={p} className="orgs-puesto">
                      {p}
                      <button type="button" aria-label={`Quitar ${p}`} title={`Quitar ${p}`}
                        onClick={() => guardarPuestos(areaAbierta, areaAbierta.Puestos.filter(x => x !== p))}><FiX aria-hidden="true" /></button>
                    </span>
                  ))}
                </div>
                <div className="orgs-puesto-nuevo">
                  <input className="orgs-input" type="text" placeholder="Nuevo puesto, ej. Desarrollador frontend" aria-label="Nuevo puesto"
                    maxLength={60} value={nuevoPuesto} onChange={e => setNuevoPuesto(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarPuesto(); } }} />
                  <IconButton accion="agregar" label="Agregar puesto" tooltipPos="left" disabled={!nuevoPuesto.trim()} onClick={agregarPuesto} />
                </div>
                <div className="icon-btn-group" style={{ justifyContent: "flex-end", width: "100%", marginTop: 12 }}>
                  <IconButton accion="eliminar" icon={FiTrash2} label="Eliminar área" tooltipPos="left"
                    onClick={async () => { if (await handleEliminarArea(areaAbierta)) setAreaAbierta(null); }} />
                </div>
              </>
            )}
          </Modal>

          {areasLoading ? (
            <div className="orgs-monitor-loading" style={{ marginTop: 16 }}><div className="hr-spinner" /><span>Cargando…</span></div>
          ) : areas.length === 0 ? (
            <p className="orgs-desc" style={{ marginTop: 16 }}>Sin áreas en el catálogo todavía — el Organigrama seguirá mostrando un árbol de un solo nivel hasta que definas al menos una jerarquía aquí.</p>
          ) : (
            <div className="rc-grid mo-stagger" style={{ marginTop: 16 }}>
              {areas.map(a => (
                <RecordCard key={a.NombreDepto} tono={a.DeptoPadre ? "accent" : "success"} onClick={() => setAreaAbierta(a)}
                  tile={<FiGitBranch />} titulo={a.NombreDepto}
                  badge={<span className={`rc-badge rc-badge--${a.DeptoPadre ? "accent" : "success"}`}>{a.DeptoPadre ? "Subárea" : "Primer nivel"}</span>}
                  meta={<>{a.DeptoPadre && <span>Depende de {a.DeptoPadre}</span>}<span>{(a.Puestos || []).length} {(a.Puestos || []).length === 1 ? "puesto" : "puestos"}</span></>} />
              ))}
            </div>
          )}
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
            <div className="hr-card-title">Cómo se aprueban las vacaciones</div>
            <p className="orgs-desc">
              Una solicitud queda aprobada solo cuando recibe todos los vistos buenos. Si alguien la rechaza, se cierra.
            </p>
            <ol className="orgs-flujo">
              <li className={`orgs-flujo-paso${localVacaciones.doble_aprobacion !== false ? "" : " is-off"}`}>
                <span className="orgs-flujo-num">1</span>
                <div className="orgs-module-info">
                  <span className="orgs-module-label">Jefe directo</span>
                  <span className="orgs-module-desc">El jefe inmediato que tiene la persona en su ficha laboral. Si no tiene jefe asignado, este paso se salta.</span>
                </div>
                <button
                  className={`orgs-toggle ${localVacaciones.doble_aprobacion !== false ? "orgs-toggle--on" : ""}`}
                  aria-label="Pedir visto bueno del jefe directo" aria-pressed={localVacaciones.doble_aprobacion !== false}
                  onClick={() => setLocalVacaciones(p => ({ ...p, doble_aprobacion: p.doble_aprobacion === false }))}
                >
                  <span className="orgs-toggle-thumb" />
                </button>
              </li>
              <li className="orgs-flujo-paso">
                <span className="orgs-flujo-num">2</span>
                <div className="orgs-module-info">
                  <span className="orgs-module-label">Recursos Humanos o Administración</span>
                  <span className="orgs-module-desc">Cualquier cuenta de RH, Administrador de área o Administrador general. Siempre se pide.</span>
                </div>
                <FiCheck className="orgs-flujo-fijo" aria-label="Siempre activo" />
              </li>
            </ol>
            <div className="orgs-module-row" style={{ marginTop: 12 }}>
              <div className="orgs-module-info">
                <span className="orgs-module-label">Avisar también por correo</span>
                <span className="orgs-module-desc">Además de la campana, manda correo al jefe y a RH cuando entra una solicitud</span>
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
          <Modal abierto={modalKey} onClose={() => { setModalKey(false); setKeyRecienCreada(null); }}
            titulo={keyRecienCreada ? "API key generada" : "Generar API key"}
            subtitulo={keyRecienCreada ? undefined : "Para que otro programa consuma información de este sistema. La key se muestra una sola vez."}
            onGuardar={keyRecienCreada ? undefined : handleCrearApiKey} guardando={creandoKey} labelGuardar="Generar API key"
            puedeGuardar={!!(nuevaKeyNombre.trim() && nuevaKeyScopes.length)}>
            {!keyRecienCreada && (<>
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
            </>)}
            {keyRecienCreada && (
              <div className="orgs-desc" style={{ marginTop: 14, padding: 12, border: "1px solid var(--orgs-border, #444)", borderRadius: 8 }}>
                <strong>Copia esta key ahora — no volverá a mostrarse:</strong>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                  <code style={{ userSelect: "all", wordBreak: "break-all" }}>{keyRecienCreada.key}</code>
                  <IconButton accion="copiar" label="Copiar" onClick={() => { navigator.clipboard?.writeText(keyRecienCreada.key); }} />
                </div>
                <IconButton accion="confirmar" label="Listo, ya la copié" style={{ marginTop: 8 }} onClick={() => setKeyRecienCreada(null)} />
              </div>
            )}
          </Modal>
          <Modal abierto={!!keyAbierta} onClose={() => setKeyAbierta(null)} titulo={keyAbierta?.nombre || ""}
            subtitulo={keyAbierta ? `${keyAbierta.prefijo} · ${keyAbierta.activa ? "Activa" : "Revocada"}` : undefined}>
            {keyAbierta && (
              <>
                <span className="field-label">Permisos</span>
                <div className="mdl-chips">{(keyAbierta.scopes || []).map(sc => <span key={sc} className="rc-chip">{sc}</span>)}</div>
                <p className="field-hint" style={{ marginTop: 12 }}>
                  {keyAbierta.usos_totales || 0} llamadas
                  {keyAbierta.ultimo_uso ? ` · último uso ${new Date(keyAbierta.ultimo_uso).toLocaleString("es-MX")}` : " · sin uso todavía"}
                </p>
                <div className="icon-btn-group" style={{ justifyContent: "flex-end", width: "100%", marginTop: 12 }}>
                  {keyAbierta.activa && (
                    <IconButton accion="cancelar" label="Revocar" onClick={async () => { await handleRevocarApiKey(keyAbierta._id); setKeyAbierta(null); }} />
                  )}
                  <IconButton accion="eliminar" icon={FiTrash2} label="Eliminar" tooltipPos="left"
                    onClick={async () => { if (await handleEliminarApiKey(keyAbierta._id)) setKeyAbierta(null); }} />
                </div>
              </>
            )}
          </Modal>
          <div className="hr-card" style={{ gridColumn: "1 / -1" }}>
            <div className="hr-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              API keys
              <IconButton accion="agregar" label="Generar API key" tooltipPos="left" onClick={() => { setKeyRecienCreada(null); setModalKey(true); }} />
            </div>
            {keysLoading ? (
              <div className="orgs-monitor-loading"><div className="hr-spinner"/><span>Cargando…</span></div>
            ) : apiKeys.length === 0 ? (
              <div className="orgs-monitor-empty">
                <span className="orgs-monitor-empty-icon"><FiKey /></span>
                <p>Sin API keys generadas todavía</p>
              </div>
            ) : (
              <div className="rc-grid mo-stagger">
                {apiKeys.map(k => (
                  <RecordCard key={k._id} tono={k.activa ? "success" : "danger"} onClick={() => setKeyAbierta(k)}
                    tile={<FiKey />} titulo={k.nombre}
                    badge={<span className={`rc-badge rc-badge--${k.activa ? "success" : "danger"}`}>{k.activa ? "Activa" : "Revocada"}</span>}
                    meta={<><code className="orgs-incident-code">{k.prefijo}</code><span>{k.usos_totales || 0} llamadas</span></>} />
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
            <IconButton accion="refrescar" label="Refrescar" tooltipPos="left" onClick={() => cargarAuditoria(auditFiltro)} />
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
                <button type="button" key={a._id} className="orgs-incident-row orgs-card-click"
                  onClick={() => setDetalle({ tipo: "auditoria", item: a })}>
                  <span className="orgs-sev-badge orgs-sev--info">{a.accion}</span>
                  <div className="orgs-incident-info">
                    <span className="orgs-incident-msg"><strong>{a.usuario || "—"}</strong> modificó <strong>{a.entidad}</strong></span>
                    <span className="orgs-incident-meta">
                      {a.cambios && Object.keys(a.cambios).length > 0
                        ? `${Object.keys(a.cambios).length} ${Object.keys(a.cambios).length === 1 ? "campo" : "campos"} · `
                        : ""}{new Date(a.creado_en).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
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
            <IconButton accion="refrescar" label="Refrescar" tooltipPos="left" onClick={cargarIncidentes} />
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
                  <button type="button" key={inc.id || i} className="orgs-incident-row orgs-card-click"
                    onClick={() => setDetalle({ tipo: "monitor", item: inc, sev })}>
                    <span className={`orgs-sev-badge ${sev.cls}`}>{sev.label}</span>
                    <div className="orgs-incident-info">
                      <span className="orgs-incident-msg">{inc.message || inc.error || inc.msg || "Sin descripción"}</span>
                      <span className="orgs-incident-meta">
                        {inc.endpoint && <code className="orgs-incident-code">{inc.endpoint}</code>}
                        {inc.timestamp && <span className="orgs-incident-time">{new Date(inc.timestamp).toLocaleString("es-MX")}</span>}
                      </span>
                    </div>
                    {inc.status && <span className="orgs-incident-status">{inc.status}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detalle de una tarjeta de Auditoría o Monitor */}
      <Modal abierto={!!detalle} onClose={() => setDetalle(null)} ancho={640}
        titulo={detalle?.tipo === "auditoria" ? `${detalle.item.usuario || "—"} modificó ${detalle.item.entidad}` : (detalle?.sev?.label || "Incidente")}
        subtitulo={detalle ? new Date(detalle.item.creado_en || detalle.item.timestamp).toLocaleString("es-MX", { dateStyle: "full", timeStyle: "medium" }) : undefined}>
        {detalle?.tipo === "auditoria" && (
          <div className="orgs-detalle">
            <p><strong>Rol:</strong> {detalle.item.role || "—"} · <strong>Acción:</strong> {detalle.item.accion}{detalle.item.entidad_id ? <> · <strong>Registro:</strong> <code>{detalle.item.entidad_id}</code></> : null}</p>
            {detalle.item.detalle && <p>{detalle.item.detalle}</p>}
            {detalle.item.cambios && Object.keys(detalle.item.cambios).length > 0 && (
              <div className="orgs-cambios">
                {Object.entries(detalle.item.cambios).map(([campo, { antes, despues }]) => (
                  <div key={campo} className="orgs-cambio">
                    <span className="orgs-cambio-campo">{campo}</span>
                    <span className="orgs-cambio-antes">{JSON.stringify(antes) ?? "—"}</span>
                    <FiArrowRight aria-label="cambió a" />
                    <span className="orgs-cambio-despues">{JSON.stringify(despues) ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {detalle?.tipo === "monitor" && (
          <div className="orgs-detalle">
            <p>{detalle.item.message || detalle.item.error || detalle.item.msg || "Sin descripción"}</p>
            {detalle.item.endpoint && <p><strong>Ruta:</strong> <code>{detalle.item.endpoint}</code></p>}
            {detalle.item.status && <p><strong>Código:</strong> {detalle.item.status}</p>}
            <pre className="orgs-json">{JSON.stringify(detalle.item, null, 2)}</pre>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default OrgSettings;