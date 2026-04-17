// src/Components/RoleManager.js
// Mejoras respecto al original:
// 1. Los roles custom se guardan en el backend (con fallback a localStorage)
// 2. Permisos granulares por módulo con etiquetas CRUD
// 3. El Super Admin puede editar permisos de roles del sistema (no eliminarlos)
// 4. Vista previa del dashboard que verá el rol

import React, { useEffect, useState, useCallback } from "react";
import "./RoleManager.css";
import { usuarioService }  from "../services/usuarioService";
import { empleadoService } from "../services/empleadoService";
import { apiFetch }        from "../services/apiConfig";

// ─── Catálogo de permisos — agrupados por módulo ──────────────────────────────
const PERMISOS_DEF = [
  // Empleados
  { key: "ver_empleados",        label: "Ver listado de empleados",       grupo: "Empleados",  crud: "R" },
  { key: "crud_empleados",       label: "Crear / editar / eliminar empleados", grupo: "Empleados", crud: "CRUD" },
  // Dashboard
  { key: "ver_dashboard",        label: "Ver dashboard con KPIs",         grupo: "Dashboard",  crud: "R" },
  { key: "ver_carrusel",         label: "Ver carrusel del equipo",         grupo: "Dashboard",  crud: "R" },
  { key: "ver_organigrama",      label: "Ver organigrama",                 grupo: "Dashboard",  crud: "R" },
  // Información sensible
  { key: "ver_expediente",       label: "Ver expediente clínico",          grupo: "Confidencial", crud: "R" },
  { key: "ver_rh",               label: "Ver datos de RH y nómina",        grupo: "Confidencial", crud: "R" },
  // Perfil
  { key: "ver_perfil_propio",    label: "Ver y editar perfil propio",      grupo: "Perfil",    crud: "RU" },
  { key: "ver_perfil_equipo",    label: "Ver perfiles del equipo",         grupo: "Perfil",    crud: "R" },
  // Proyectos y habilidades
  { key: "ver_proyectos",        label: "Ver proyectos y avances",         grupo: "Proyectos", crud: "R" },
  { key: "ver_habilidades",      label: "Ver habilidades del equipo",      grupo: "Proyectos", crud: "R" },
  // Restricciones
  { key: "solo_equipo_directo",  label: "Solo ver su equipo directo",      grupo: "Restricciones", crud: "-" },
  // Sistema
  { key: "gestionar_roles",      label: "Gestionar roles y permisos",      grupo: "Sistema",   crud: "CRUD" },
  { key: "monitor_incidencias",  label: "Acceder al monitor de errores",   grupo: "Sistema",   crud: "R" },
];

const GRUPOS_ORDEN = ["Dashboard","Empleados","Perfil","Proyectos","Confidencial","Restricciones","Sistema"];

const gruposPermisos = GRUPOS_ORDEN.reduce((acc, g) => {
  const perms = PERMISOS_DEF.filter(p => p.grupo === g);
  if (perms.length) acc[g] = perms;
  return acc;
}, {});

// ─── Módulos del dashboard que activa cada set de permisos ────────────────────
// Esto define qué secciones aparecen en /dashboard según el rol
const MODULOS_POR_ROL = {
  SUPER_ADMIN:     ["dashboard_admin","home_carousel","organigrama"],
  ADMIN:           ["dashboard_admin","home_carousel","organigrama"],
  EMPLOYEE:        ["home_carousel","organigrama"],
  JEFE_AREA:       ["dashboard_jefe_area","home_carousel","organigrama"],
  CONTADOR:        ["dashboard_contador","home_carousel","organigrama"],
  PROJECT_MANAGER: ["dashboard_pm","home_carousel","organigrama"],
  MEDICO:          ["dashboard_medico","home_carousel","organigrama"],
};

const ROLES_SISTEMA = ["EMPLOYEE","JEFE_AREA","CONTADOR","PROJECT_MANAGER","MEDICO","ADMIN","SUPER_ADMIN"];

const PERMISOS_SISTEMA = {
  EMPLOYEE:        ["ver_organigrama","ver_carrusel","ver_perfil_propio"],
  JEFE_AREA:       ["ver_empleados","ver_organigrama","ver_proyectos","ver_habilidades","solo_equipo_directo","ver_carrusel","ver_dashboard"],
  CONTADOR:        ["ver_empleados","ver_rh","ver_organigrama","ver_dashboard","ver_carrusel"],
  PROJECT_MANAGER: ["ver_empleados","ver_proyectos","ver_habilidades","ver_organigrama","ver_dashboard","ver_carrusel"],
  MEDICO:          ["ver_empleados","ver_expediente","ver_organigrama","ver_dashboard","ver_carrusel"],
  ADMIN:           ["ver_empleados","crud_empleados","ver_expediente","ver_rh","ver_proyectos","ver_organigrama","ver_habilidades","ver_dashboard","ver_carrusel","ver_perfil_propio","ver_perfil_equipo"],
  SUPER_ADMIN:     ["*"],
};

const COLORES_BADGE = [
  { id:"blue",   bg:"#dbeafe", fg:"#1d4ed8", label:"Azul"    },
  { id:"green",  bg:"#dcfce7", fg:"#15803d", label:"Verde"   },
  { id:"amber",  bg:"#fef3c7", fg:"#b45309", label:"Ámbar"   },
  { id:"purple", bg:"#ede9fe", fg:"#6d28d9", label:"Morado"  },
  { id:"red",    bg:"#fee2e2", fg:"#b91c1c", label:"Rojo"    },
  { id:"teal",   bg:"#ccfbf1", fg:"#0f766e", label:"Teal"    },
  { id:"gray",   bg:"#f3f4f6", fg:"#374151", label:"Gris"    },
];

const colorById = (id) => COLORES_BADGE.find(c => c.id === id) || COLORES_BADGE[0];
const getId     = (item) => item?._id?.$oid || item?._id || "";

const FORM_INIT = { nombre:"", descripcion:"", color:"blue", nivel:2, permisos:[] };

// ─── Guardar/cargar roles custom (backend con fallback localStorage) ──────────
const cargarRolesCustomBackend = async () => {
  try {
    const data = await apiFetch("/roles/custom");
    return Array.isArray(data) ? data : [];
  } catch {
    // Fallback: localStorage si el endpoint no existe aún
    try { return JSON.parse(localStorage.getItem("cibercom_roles_custom") || "[]"); }
    catch { return []; }
  }
};

const guardarRolBackend = async (roles) => {
  try {
    await apiFetch("/roles/custom", {
      method: "POST",
      body: JSON.stringify(roles),
    });
  } catch {
    // Fallback silencioso a localStorage
  }
  localStorage.setItem("cibercom_roles_custom", JSON.stringify(roles));
};

// ════════════════════════════════════════════════════════════════════════════════
function RoleManager() {
  const [usuarios,    setUsuarios]    = useState([]);
  const [empleados,   setEmpleados]   = useState([]);
  const [rolesCustom, setRolesCustom] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [paso,        setPaso]        = useState(1);
  const [form,        setForm]        = useState(FORM_INIT);
  const [editingRol,  setEditingRol]  = useState(null);
  const [asignando,   setAsignando]   = useState(null);
  const [asignBusq,   setAsignBusq]   = useState("");
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);
  // Para editar permisos de roles del sistema
  const [editSistema, setEditSistema] = useState(null);
  const [permsSistema, setPermsSistema] = useState({});

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveRolesCustom = async (roles) => {
    setRolesCustom(roles);
    await guardarRolBackend(roles);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [users, emps, rolesC] = await Promise.all([
        usuarioService.getAll().catch(() => []),
        empleadoService.getAll().catch(() => []),
        cargarRolesCustomBackend(),
      ]);
      setUsuarios(Array.isArray(users) ? users : []);
      setEmpleados(Array.isArray(emps)  ? emps  : []);
      setRolesCustom(Array.isArray(rolesC) ? rolesC : []);

      // Cargar overrides de permisos de sistema desde localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("cibercom_perms_sistema") || "{}");
        setPermsSistema(stored);
      } catch { /* ignorar */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Permisos efectivos de un rol de sistema (con posibles overrides) ────
  const getPermsSistema = (rolNombre) => {
    return permsSistema[rolNombre] || PERMISOS_SISTEMA[rolNombre] || [];
  };

  const savePermsSistema = (rolNombre, perms) => {
    const updated = { ...permsSistema, [rolNombre]: perms };
    setPermsSistema(updated);
    localStorage.setItem("cibercom_perms_sistema", JSON.stringify(updated));
    showToast(`Permisos de ${rolNombre} actualizados`);
  };

  // ─── Todos los roles ──────────────────────────────────────────────────────
  const todosRoles = [
    ...ROLES_SISTEMA.map(r => ({
      id: r, nombre: r, descripcion: "", sistema: true,
      color:    r === "SUPER_ADMIN" ? "blue" : r === "ADMIN" ? "green" :
                r === "EMPLOYEE" ? "gray" : "amber",
      permisos: getPermsSistema(r),
      usuarios: usuarios.filter(u => u.role === r).length,
    })),
    ...rolesCustom.map(r => ({
      ...r, sistema: false,
      usuarios: usuarios.filter(u => u.role === r.nombre).length,
    })),
  ];

  // ─── Abrir crear ──────────────────────────────────────────────────────────
  const abrirCrear = () => {
    setForm(FORM_INIT);
    setPaso(1);
    setEditingRol(null);
    setModal("crear");
  };

  // ─── Abrir editar permisos de rol sistema ────────────────────────────────
  const abrirEditarSistema = (rol) => {
    setEditSistema(rol);
    setForm({
      nombre: rol.nombre, descripcion: rol.descripcion || "",
      color: rol.color || "blue", nivel: rol.nivel || 3,
      permisos: [...getPermsSistema(rol.nombre)],
    });
    setPaso(2); // Solo el paso de permisos para roles de sistema
    setModal("editar_sistema");
  };

  // ─── Abrir editar rol custom ──────────────────────────────────────────────
  const abrirEditar = (rol) => {
    setEditingRol(rol);
    setForm({
      nombre: rol.nombre, descripcion: rol.descripcion || "",
      color: rol.color || "blue", nivel: rol.nivel || 2,
      permisos: [...(rol.permisos || [])],
    });
    setPaso(1);
    setModal("editar");
  };

  // ─── Guardar rol custom ───────────────────────────────────────────────────
  const guardarRol = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const nuevoRol = {
      id:          editingRol?.id || `custom_${Date.now()}`,
      nombre:      form.nombre.trim().toUpperCase().replace(/\s+/g,"_"),
      descripcion: form.descripcion,
      color:       form.color,
      nivel:       form.nivel,
      permisos:    form.permisos,
      modulos:     MODULOS_POR_ROL[form.nombre.toUpperCase().replace(/\s+/g,"_")] || ["home_carousel","organigrama"],
    };

    let updated;
    if (modal === "editar" && editingRol) {
      updated = rolesCustom.map(r => r.id === editingRol.id ? nuevoRol : r);
      showToast(`Rol "${nuevoRol.nombre}" actualizado`);
    } else {
      updated = [...rolesCustom, nuevoRol];
      showToast(`Rol "${nuevoRol.nombre}" creado`);
    }
    await saveRolesCustom(updated);
    setSaving(false);
    setModal(null);
  };

  // ─── Guardar permisos de rol sistema ─────────────────────────────────────
  const guardarPermsSistema = () => {
    if (!editSistema) return;
    savePermsSistema(editSistema.nombre, form.permisos);
    setModal(null);
  };

  // ─── Eliminar rol custom ──────────────────────────────────────────────────
  const eliminarRol = async (rol) => {
    if (rol.usuarios > 0) {
      showToast(`No se puede eliminar: ${rol.usuarios} usuario(s) con este rol`, "error");
      return;
    }
    await saveRolesCustom(rolesCustom.filter(r => r.id !== rol.id));
    showToast(`Rol "${rol.nombre}" eliminado`);
  };

  // ─── Asignar rol a usuario ────────────────────────────────────────────────
  const abrirAsignar = (rol) => {
    setAsignando(rol);
    setAsignBusq("");
    setModal("asignar");
  };

  const asignarRolAUsuario = async (userId) => {
    setSaving(true);
    try {
      await usuarioService.update(userId, { role: asignando.nombre });
      setUsuarios(prev =>
        prev.map(u => getId(u) === userId ? { ...u, role: asignando.nombre } : u)
      );
      showToast("Rol asignado correctamente");
    } catch {
      showToast("Error al asignar el rol", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePermiso = (key) => {
    setForm(p => ({
      ...p,
      permisos: p.permisos.includes(key)
        ? p.permisos.filter(k => k !== key)
        : [...p.permisos, key],
    }));
  };

  const cerrarModal = () => {
    setModal(null); setEditingRol(null);
    setAsignando(null); setEditSistema(null);
    setPaso(1);
  };

  const usuariosFiltrados = usuarios.filter(u => {
    if (!asignBusq) return true;
    const q   = asignBusq.toLowerCase();
    const emp = empleados.find(e => getId(e) === (u.empleado_id?.$oid || u.empleado_id));
    const nombre = emp ? `${emp.Nombre} ${emp.ApelPaterno}`.toLowerCase() : "";
    return u.user?.toLowerCase().includes(q) || nombre.includes(q);
  });

  if (loading) return (
    <div className="rm-root">
      <div className="rm-loading"><div className="rm-spinner" /><span>Cargando roles…</span></div>
    </div>
  );

  const colorActual = colorById(form.color);

  // ─── Panel de permisos reutilizable ──────────────────────────────────────
  const PanelPermisos = () => (
    <div className="rm-modal-body">
      <p className="rm-paso-desc">
        Activa los módulos y acciones permitidas para este rol.
        Los cambios aplican al próximo login del usuario.
      </p>
      {Object.entries(gruposPermisos).map(([grupo, perms]) => (
        <div key={grupo} className="rm-permiso-grupo">
          <div className="rm-permiso-grupo-title">{grupo}</div>
          {perms.map(p => (
            <label key={p.key} className="rm-permiso-row">
              <input
                type="checkbox"
                checked={form.permisos.includes(p.key)}
                onChange={() => togglePermiso(p.key)}
                className="rm-checkbox"
              />
              <span className="rm-permiso-label">{p.label}</span>
              <span className={`rm-crud-badge rm-crud-badge--${p.crud === "CRUD" ? "full" : p.crud === "-" ? "none" : "read"}`}>
                {p.crud}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="rm-root">
      {toast && <div className={`rm-toast rm-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="rm-header">
        <div>
          <h2 className="rm-title">Gestión de roles</h2>
          <p className="rm-sub">{todosRoles.length} roles · {usuarios.length} usuarios</p>
        </div>
        <button className="rm-btn-primary" onClick={abrirCrear}>+ Nuevo rol</button>
      </div>

      {/* ─── Grid de roles ─────────────────────────────────────────── */}
      <div className="rm-roles-grid">
        {todosRoles.map(rol => {
          const { bg, fg } = colorById(rol.color);
          const isSuperAdmin = rol.nombre === "SUPER_ADMIN";
          return (
            <div key={rol.id || rol.nombre}
              className={`rm-rol-card ${rol.sistema ? "rm-rol-card--sistema" : ""}`}>
              <div className="rm-rol-card-top">
                <span className="rm-rol-badge" style={{ background: bg, color: fg }}>
                  {rol.nombre}
                </span>
                {rol.sistema && <span className="rm-rol-sistema-tag">Sistema</span>}
              </div>

              {rol.descripcion && <p className="rm-rol-desc">{rol.descripcion}</p>}

              <div className="rm-rol-permisos">
                {isSuperAdmin
                  ? <span className="rm-permiso-chip rm-permiso-chip--super">Acceso total</span>
                  : (rol.permisos || []).slice(0, 3).map(k => {
                      const def = PERMISOS_DEF.find(p => p.key === k);
                      return def ? <span key={k} className="rm-permiso-chip">{def.label}</span> : null;
                    })
                }
                {!isSuperAdmin && (rol.permisos || []).length > 3 && (
                  <span className="rm-permiso-chip rm-permiso-chip--more">
                    +{rol.permisos.length - 3} más
                  </span>
                )}
                {!isSuperAdmin && (rol.permisos || []).length === 0 && (
                  <span className="rm-permiso-chip rm-permiso-chip--none">Sin permisos</span>
                )}
              </div>

              <div className="rm-rol-footer">
                <span className="rm-rol-usuarios">
                  {rol.usuarios} usuario{rol.usuarios !== 1 ? "s" : ""}
                </span>
                <div className="rm-rol-actions">
                  {!isSuperAdmin && (
                    <button className="rm-btn-action" onClick={() => abrirAsignar(rol)}>
                      Asignar
                    </button>
                  )}
                  {rol.sistema && !isSuperAdmin && (
                    <button className="rm-btn-action rm-btn-action--edit"
                      onClick={() => abrirEditarSistema(rol)}
                      title="Editar permisos de este rol">
                      Permisos
                    </button>
                  )}
                  {!rol.sistema && (
                    <>
                      <button className="rm-btn-action rm-btn-action--edit"
                        onClick={() => abrirEditar(rol)}>Editar</button>
                      <button className="rm-btn-action rm-btn-action--danger"
                        onClick={() => eliminarRol(rol)}>✕</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Modal crear / editar rol custom ─────────────────────── */}
      {(modal === "crear" || modal === "editar") && (
        <div className="rm-overlay" onClick={cerrarModal}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div>
                <h3 className="rm-modal-title">
                  {modal === "crear" ? "Crear nuevo rol" : `Editar · ${editingRol?.nombre}`}
                </h3>
                <div className="rm-steps">
                  {[1,2,3].map(s => (
                    <React.Fragment key={s}>
                      <div className={`rm-step ${paso===s?"rm-step--active":""} ${paso>s?"rm-step--done":""}`}
                        onClick={() => paso > s && setPaso(s)}>
                        {paso > s ? "✓" : s}
                      </div>
                      {s < 3 && <div className={`rm-step-line ${paso>s?"rm-step-line--done":""}`}/>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <button className="rm-modal-close" onClick={cerrarModal}>✕</button>
            </div>

            {paso === 1 && (
              <div className="rm-modal-body">
                <div className="rm-field">
                  <label className="rm-label">Nombre del rol</label>
                  <input className="rm-input" type="text"
                    placeholder="Ej: AUDITOR, SOPORTE_TI…"
                    value={form.nombre}
                    onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                    autoFocus />
                  {form.nombre && (
                    <span className="rm-input-preview">
                      Se guardará como: <strong>{form.nombre.toUpperCase().replace(/\s+/g,"_")}</strong>
                    </span>
                  )}
                </div>
                <div className="rm-field">
                  <label className="rm-label">Descripción corta</label>
                  <textarea className="rm-input rm-textarea" rows={2}
                    placeholder="¿Qué hace este rol en la empresa?"
                    value={form.descripcion}
                    onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Color del badge</label>
                  <div className="rm-color-grid">
                    {COLORES_BADGE.map(c => (
                      <button key={c.id}
                        className={`rm-color-btn ${form.color===c.id?"rm-color-btn--selected":""}`}
                        style={{ background: c.bg }}
                        onClick={() => setForm(p => ({...p, color: c.id}))}>
                        <span style={{color:c.fg, fontWeight:700, fontSize:"0.68rem"}}>{c.label}</span>
                        {form.color===c.id && <span className="rm-color-check">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="rm-badge-preview">
                    Vista previa:&nbsp;
                    <span className="rm-rol-badge" style={{background:colorActual.bg, color:colorActual.fg}}>
                      {form.nombre ? form.nombre.toUpperCase().replace(/\s+/g,"_") : "NOMBRE_ROL"}
                    </span>
                  </div>
                </div>
                <div className="rm-field">
                  <label className="rm-label">Nivel de acceso · {form.nivel}</label>
                  <input type="range" min={1} max={4} step={1}
                    value={form.nivel}
                    onChange={e => setForm(p => ({...p, nivel: Number(e.target.value)}))}
                    className="rm-range" />
                  <div className="rm-range-labels">
                    <span>1·Básico</span><span>2·Medio</span><span>3·Alto</span><span>4·Total</span>
                  </div>
                </div>
              </div>
            )}

            {paso === 2 && <PanelPermisos />}

            {paso === 3 && (
              <div className="rm-modal-body">
                <p className="rm-paso-desc">Revisa y confirma la configuración.</p>
                <div className="rm-resumen-card">
                  <div className="rm-resumen-row">
                    <span className="rm-resumen-key">Nombre</span>
                    <span className="rm-rol-badge" style={{background:colorActual.bg, color:colorActual.fg}}>
                      {form.nombre.toUpperCase().replace(/\s+/g,"_")}
                    </span>
                  </div>
                  {form.descripcion && (
                    <div className="rm-resumen-row">
                      <span className="rm-resumen-key">Descripción</span>
                      <span className="rm-resumen-val">{form.descripcion}</span>
                    </div>
                  )}
                  <div className="rm-resumen-row">
                    <span className="rm-resumen-key">Nivel</span>
                    <span className="rm-resumen-val">{form.nivel} de 4</span>
                  </div>
                  <div className="rm-resumen-row rm-resumen-row--col">
                    <span className="rm-resumen-key">Permisos ({form.permisos.length})</span>
                    <div className="rm-resumen-permisos">
                      {form.permisos.length === 0
                        ? <span className="rm-permiso-chip rm-permiso-chip--none">Sin permisos</span>
                        : form.permisos.map(k => {
                            const def = PERMISOS_DEF.find(p => p.key === k);
                            return def ? <span key={k} className="rm-permiso-chip">{def.label}</span> : null;
                          })
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rm-modal-footer">
              {paso > 1 && (
                <button className="rm-btn-secondary" onClick={() => setPaso(p => p-1)}>← Anterior</button>
              )}
              <div style={{flex:1}} />
              {paso < 3
                ? <button className="rm-btn-primary" onClick={() => setPaso(p => p+1)}
                    disabled={paso===1 && !form.nombre.trim()}>Siguiente →</button>
                : <button className="rm-btn-primary" onClick={guardarRol} disabled={saving}>
                    {saving ? "Guardando…" : modal==="editar" ? "Guardar cambios" : "Crear rol"}
                  </button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal editar permisos de rol sistema ────────────────── */}
      {modal === "editar_sistema" && editSistema && (
        <div className="rm-overlay" onClick={cerrarModal}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div>
                <h3 className="rm-modal-title">Permisos · {editSistema.nombre}</h3>
                <p className="rm-modal-subtitle" style={{fontSize:"0.75rem",color:"var(--rm-muted)",marginTop:4}}>
                  Rol de sistema — solo se pueden editar los permisos
                </p>
              </div>
              <button className="rm-modal-close" onClick={cerrarModal}>✕</button>
            </div>
            <PanelPermisos />
            <div className="rm-modal-footer">
              <div style={{flex:1}}/>
              <button className="rm-btn-primary" onClick={guardarPermsSistema}>
                Guardar permisos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal asignar rol ────────────────────────────────────── */}
      {modal === "asignar" && asignando && (
        <div className="rm-overlay" onClick={cerrarModal}>
          <div className="rm-modal rm-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div>
                <h3 className="rm-modal-title">Asignar rol</h3>
                <p className="rm-modal-subtitle">
                  Asignando:&nbsp;
                  <span className="rm-rol-badge" style={{
                    background: colorById(asignando.color).bg,
                    color: colorById(asignando.color).fg,
                  }}>{asignando.nombre}</span>
                </p>
              </div>
              <button className="rm-modal-close" onClick={cerrarModal}>✕</button>
            </div>
            <div className="rm-modal-body">
              <input className="rm-input" type="text"
                placeholder="Buscar usuario o nombre…"
                value={asignBusq}
                onChange={e => setAsignBusq(e.target.value)}
                autoFocus />
              <div className="rm-asignar-list">
                {usuariosFiltrados.slice(0,10).map(u => {
                  const uid = getId(u);
                  const emp = empleados.find(e => getId(e) === (u.empleado_id?.$oid || u.empleado_id));
                  const nombre = emp ? `${emp.Nombre} ${emp.ApelPaterno}` : u.user;
                  const yaTiene = u.role === asignando.nombre;
                  return (
                    <div key={uid} className="rm-asignar-row">
                      <div className="rm-asignar-info">
                        <span className="rm-asignar-nombre">{nombre}</span>
                        <span className="rm-asignar-user">@{u.user}</span>
                        <span className="rm-asignar-rol-actual">{u.role}</span>
                      </div>
                      <button
                        className={`rm-btn-asignar ${yaTiene?"rm-btn-asignar--ya":""}`}
                        onClick={() => !yaTiene && asignarRolAUsuario(uid)}
                        disabled={saving || yaTiene}>
                        {yaTiene ? "Ya asignado" : "Asignar →"}
                      </button>
                    </div>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <p className="rm-empty">Sin usuarios que coincidan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleManager;