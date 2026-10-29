// src/Components/RoleManager.js
// Mejoras respecto al original:
// 1. Los roles custom se guardan en el backend (con fallback a localStorage)
// 2. Permisos granulares por módulo con etiquetas CRUD
// 3. El Super Admin puede editar permisos de cualquier rol y eliminar cualquiera
//    salvo el Administrador general; un rol eliminado se recrea "de cero".
// 4. Vista previa del dashboard que verá el rol

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { confirmar } from "../services/dialogo";
import { roleLabel } from "../utils/roleLabels";
import IconButton from "./IconButton";
import { FiCheck, FiX, FiUserPlus, FiSliders, FiEyeOff, FiEye, FiBriefcase } from "react-icons/fi";
import { useOrg } from "../context/OrgContext";
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
  // Directorio: qué ve este rol de sus COMPAÑEROS (perfil y directorio)
  { key: "dir_contacto",          label: "Contacto laboral: correo de trabajo, teléfono de oficina y extensión", grupo: "Directorio", crud: "R" },
  { key: "dir_estado",            label: "Estado: activo, de vacaciones (y cuándo regresa)", grupo: "Directorio", crud: "R" },
  { key: "dir_puesto",            label: "Puesto, área y jefe inmediato",    grupo: "Directorio", crud: "R" },
  { key: "dir_profesional",       label: "Perfil profesional: educación, experiencia, habilidades", grupo: "Directorio", crud: "R" },
  { key: "dir_cumpleanos",        label: "Cumpleaños (día y mes, sin el año)", grupo: "Directorio", crud: "R" },
  { key: "dir_contacto_personal", label: "Contacto personal: celular y correo personal", grupo: "Directorio", crud: "R" },
  // Sistema
  { key: "gestionar_roles",      label: "Gestionar roles y permisos",      grupo: "Sistema",   crud: "CRUD" },
  { key: "monitor_incidencias",  label: "Acceder al monitor de errores",   grupo: "Sistema",   crud: "R" },
];

const GRUPOS_ORDEN = ["Dashboard","Empleados","Perfil","Directorio","Proyectos","Confidencial","Restricciones","Sistema"];
const DESC_GRUPO = {
  Directorio: "Qué puede ver este rol de sus compañeros. Su propio perfil, RH y su jefe directo siempre ven todo.",
};

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
  RH:              ["dashboard_rh","home_carousel","organigrama"],
};

// Qué hace cada rol de sistema, en una línea que entiende cualquiera.
const DESCRIPCION_ROL = {
  EMPLOYEE:        "Consulta y actualiza su perfil, solicita vacaciones y envía solicitudes a Recursos Humanos.",
  JEFE_AREA:       "Consulta la información de su equipo directo y autoriza sus solicitudes de vacaciones.",
  CONTADOR:        "Consulta sueldos, nómina y recibos de toda la empresa.",
  PROJECT_MANAGER: "Consulta la capacidad y las habilidades del equipo de proyectos.",
  MEDICO:          "Consulta los expedientes clínicos del personal.",
  RH:              "Administra al personal: expedientes, sueldos, vacaciones, carga masiva y solicitudes.",
  ADMIN:           "Administra al personal de las áreas que tenga asignadas.",
  SUPER_ADMIN:     "Control total del sistema: configuración, roles, cuentas e integraciones.",
};

const ROLES_SISTEMA = ["EMPLOYEE","JEFE_AREA","CONTADOR","PROJECT_MANAGER","MEDICO","RH","ADMIN","SUPER_ADMIN"];
// Los de administración siempre existen; el resto cada empresa decide si los usa.
const ROLES_NO_OCULTABLES = ["SUPER_ADMIN", "ADMIN", "RH", "EMPLOYEE"];

// Plantilla para la dirección general: ve indicadores, analítica, organigrama
// y el directorio, sin poder editar personas.
const PLANTILLA_DIRECCION = {
  nombre: "DIRECCION",
  descripcion: "Dirección general: consulta indicadores, analítica (rotación, plantilla y nómina), el organigrama y el directorio, sin permisos de edición.",
  color: "purple", nivel: 4,
  permisos: ["ver_empleados", "ver_organigrama", "ver_dashboard", "ver_carrusel", "ver_perfil_propio"],
  modulos: ["dashboard_admin", "home_carousel", "organigrama"],
};

// Roles a los que se les puede otorgar/quitar reportes de Analítica —
// ADMIN y SUPER_ADMIN siempre ven todos, así que no aplica editarlos aquí.
// Antes esto vivía en Configuración → Analítica, en una tabla apretada de
// 5 columnas donde el nombre del reporte se veía cortado; el cliente pidió
// moverlo aquí, junto con los demás permisos del rol, uno por tarjeta.
const ROLES_ANALITICA = ["EMPLOYEE", "JEFE_AREA", "CONTADOR", "PROJECT_MANAGER", "MEDICO"];

// Espejo de core/permissions.py::PERMISOS_DEFAULT (permisos de fábrica).
const DIRECTORIO_BASE = ["dir_contacto","dir_estado","dir_puesto","dir_profesional","dir_cumpleanos"];
const PERMISOS_SISTEMA = {
  EMPLOYEE:        ["ver_organigrama","ver_carrusel","ver_perfil_propio",...DIRECTORIO_BASE],
  JEFE_AREA:       ["ver_empleados","ver_organigrama","ver_proyectos","ver_habilidades","solo_equipo_directo","ver_carrusel","ver_dashboard",...DIRECTORIO_BASE],
  CONTADOR:        ["ver_empleados","ver_rh","ver_organigrama","ver_dashboard","ver_carrusel",...DIRECTORIO_BASE],
  PROJECT_MANAGER: ["ver_empleados","ver_proyectos","ver_habilidades","ver_organigrama","ver_dashboard","ver_carrusel",...DIRECTORIO_BASE],
  MEDICO:          ["ver_empleados","ver_expediente","ver_organigrama","ver_dashboard","ver_carrusel",...DIRECTORIO_BASE],
  ADMIN:           ["ver_empleados","crud_empleados","ver_expediente","ver_rh","ver_proyectos","ver_organigrama","ver_habilidades","ver_dashboard","ver_carrusel","gestionar_roles","monitor_incidencias","ver_perfil_equipo",...DIRECTORIO_BASE,"dir_contacto_personal"],
  RH:              ["ver_empleados","crud_empleados","ver_expediente","ver_rh","ver_proyectos","ver_organigrama","ver_habilidades","ver_dashboard","ver_carrusel","ver_perfil_equipo",...DIRECTORIO_BASE,"dir_contacto_personal"],
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

const FORM_INIT = { nombre:"", descripcion:"", color:"blue", nivel:2, permisos:["ver_perfil_propio","ver_organigrama","ver_carrusel",...DIRECTORIO_BASE] };
const normalizarNombre = (n) => (n || "").trim().toUpperCase().replace(/\s+/g, "_");

// Los modales van al <body>: dentro de la página quedaban atrapados por
// contenedores con transform/blur y no se podían desplazar.
const Portal = ({ children }) => createPortal(children, document.body);

// ─── Guardar/cargar roles custom (backend con fallback localStorage) ──────────
const cargarConfigRoles = async () => {
  try {
    const data = await apiFetch("/roles/config");
    return {
      custom: Array.isArray(data?.custom) ? data.custom : [],
      sistema_eliminados: Array.isArray(data?.sistema_eliminados) ? data.sistema_eliminados : [],
      permisos_sistema: data?.permisos_sistema || {},
    };
  } catch {
    return { custom: [], sistema_eliminados: [], permisos_sistema: {} };
  }
};

const guardarRolBackend = (roles) => apiFetch("/roles/custom", { method: "POST", body: JSON.stringify(roles) });

// ════════════════════════════════════════════════════════════════════════════════
function RoleManager() {
  const { orgConfig, updateOrgConfig } = useOrg();
  const ocultos = orgConfig?.roles_ocultos || [];
  const [verOcultos, setVerOcultos] = useState(false);
  const [usuarios,    setUsuarios]    = useState([]);
  const [empleados,   setEmpleados]   = useState([]);
  const [rolesCustom, setRolesCustom] = useState([]);
  const [sistemaEliminados, setSistemaEliminados] = useState([]);
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
  // Reportes de Analítica por rol (antes vivía en Configuración → Analítica)
  const [catalogoReportes, setCatalogoReportes] = useState([]);
  const [permisosAnalitica, setPermisosAnalitica] = useState({});
  const [formReportes, setFormReportes] = useState([]);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Si el backend rechaza (nombre repetido, sin permiso…), no se toca el estado.
  const saveRolesCustom = async (roles) => {
    await guardarRolBackend(roles);
    setRolesCustom(roles);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [users, emps, rolesC, cat, perms] = await Promise.all([
        usuarioService.getAll().catch(() => []),
        empleadoService.getAll().catch(() => []),
        cargarConfigRoles(),
        apiFetch("/analitica/catalogo").catch(() => []),
        apiFetch("/analitica/permisos").catch(() => ({ permisos: {} })),
      ]);
      setUsuarios(Array.isArray(users) ? users : []);
      setEmpleados(Array.isArray(emps)  ? emps  : []);
      setRolesCustom(rolesC.custom);
      setSistemaEliminados(rolesC.sistema_eliminados);
      setPermsSistema(rolesC.permisos_sistema);
      setCatalogoReportes(Array.isArray(cat) ? cat : []);
      setPermisosAnalitica(perms?.permisos || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Permisos efectivos de un rol de sistema (con posibles overrides) ────
  const getPermsSistema = (rolNombre) => {
    return permsSistema[rolNombre] || PERMISOS_SISTEMA[rolNombre] || [];
  };

  const savePermsSistema = async (rolNombre, perms) => {
    await apiFetch(`/roles/sistema/${encodeURIComponent(rolNombre)}/permisos`, {
      method: "PUT", body: JSON.stringify({ permisos: perms }),
    });
    setPermsSistema(p => ({ ...p, [rolNombre]: perms }));
    showToast(`Permisos de ${roleLabel(rolNombre)} actualizados`);
  };

  // ─── Todos los roles ──────────────────────────────────────────────────────
  const todosRoles = [
    ...ROLES_SISTEMA.filter(r => !sistemaEliminados.includes(r)).map(r => ({
      id: r, nombre: r, descripcion: DESCRIPCION_ROL[r] || "", sistema: true,
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

  const rolesVisibles = todosRoles.filter(r => !ocultos.includes(r.nombre));
  const rolesOcultos  = todosRoles.filter(r => ocultos.includes(r.nombre));

  const ocultarRol = async (rol, ocultar) => {
    if (ocultar && rol.usuarios > 0) {
      showToast(`No se puede ocultar: ${rol.usuarios} cuenta(s) tienen este rol`, "error");
      return;
    }
    const next = ocultar ? [...new Set([...ocultos, rol.nombre])] : ocultos.filter(r => r !== rol.nombre);
    await updateOrgConfig({ roles_ocultos: next }).catch(() => null);
    showToast(ocultar ? `${roleLabel(rol.nombre)} ya no se ofrecerá al asignar roles` : `${roleLabel(rol.nombre)} visible de nuevo`);
  };

  const yaHayDireccion = rolesCustom.some(r => r.nombre === PLANTILLA_DIRECCION.nombre);
  const crearDireccion = async () => {
    const rol = { id: `custom_${Date.now()}`, ...PLANTILLA_DIRECCION };
    await saveRolesCustom([...rolesCustom, rol]);
    // Todos los reportes de Analítica para la dirección.
    const todos = catalogoReportes.map(r => r.id);
    const actualizado = { ...permisosAnalitica, [rol.nombre]: todos };
    setPermisosAnalitica(actualizado);
    await apiFetch("/analitica/permisos", { method: "PUT", body: JSON.stringify({ permisos: actualizado }) }).catch(() => null);
    showToast("Rol Dirección creado: asígnalo a la cuenta del director");
  };

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
    setFormReportes([...(permisosAnalitica[rol.nombre] || [])]);
    setPaso(2); // Solo el paso de permisos para roles de sistema
    setModal("editar_sistema");
  };

  const toggleReportePermiso = (reporteId) => {
    setFormReportes(p => p.includes(reporteId) ? p.filter(id => id !== reporteId) : [...p, reporteId]);
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
    const nombre = normalizarNombre(form.nombre);
    const choca = todosRoles.some(r => r.nombre === nombre && (r.sistema || r.id !== editingRol?.id));
    if (choca) { showToast(`Ya existe un rol llamado ${nombre}`, "error"); return; }
    setSaving(true);
    const nuevoRol = {
      id:          editingRol?.id || `custom_${Date.now()}`,
      nombre,
      descripcion: form.descripcion,
      color:       form.color,
      nivel:       form.nivel,
      permisos:    form.permisos,
      modulos:     MODULOS_POR_ROL[form.nombre.toUpperCase().replace(/\s+/g,"_")] || ["home_carousel","organigrama"],
    };

    const updated = modal === "editar" && editingRol
      ? rolesCustom.map(r => r.id === editingRol.id ? nuevoRol : r)
      : [...rolesCustom, nuevoRol];
    try {
      await saveRolesCustom(updated);
      showToast(modal === "editar" ? `Rol "${nombre}" actualizado` : `Rol "${nombre}" creado`);
      setModal(null);
    } catch (e) {
      showToast(e.message || "No se pudo guardar el rol", "error");
    } finally {
      setSaving(false);
    }
  };

  // ─── Guardar permisos de rol sistema ─────────────────────────────────────
  const guardarPermsSistema = async () => {
    if (!editSistema) return;
    try { await savePermsSistema(editSistema.nombre, form.permisos); }
    catch (e) { showToast(e.message || "No se pudieron guardar los permisos", "error"); return; }
    if (ROLES_ANALITICA.includes(editSistema.nombre)) {
      const actualizado = { ...permisosAnalitica, [editSistema.nombre]: formReportes };
      setPermisosAnalitica(actualizado);
      await apiFetch("/analitica/permisos", { method: "PUT", body: JSON.stringify({ permisos: actualizado }) }).catch(() => null);
    }
    setModal(null);
  };

  // ─── Eliminar rol (personalizado o de sistema) ─────────────────────────
  // Para volver a tenerlo se crea de cero con "Nuevo rol" (puede usar el
  // mismo nombre). Nunca se elimina un rol que alguien tiene asignado.
  const eliminarRol = async (rol) => {
    if (rol.usuarios > 0) {
      showToast(`No se puede eliminar: ${rol.usuarios} cuenta(s) tienen este rol. Asígnales otro primero.`, "error");
      return;
    }
    const nombre = rol.sistema ? roleLabel(rol.nombre) : rol.nombre;
    const ok = await confirmar(rol.sistema
      ? `¿Eliminar el rol ${nombre}? Dejará de existir en tu empresa. Si después lo necesitas, créalo de cero con "Nuevo rol".`
      : `¿Eliminar el rol ${nombre}?`);
    if (!ok) return;
    try {
      await apiFetch(`/roles/${encodeURIComponent(rol.nombre)}`, { method: "DELETE" });
      if (rol.sistema) setSistemaEliminados(p => [...p, rol.nombre]);
      else setRolesCustom(p => p.filter(r => r.nombre !== rol.nombre));
      showToast(`Rol ${nombre} eliminado`);
    } catch (e) {
      showToast(e.message || "No se pudo eliminar el rol", "error");
    }
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

  const usuariosFiltrados = usuarios
    .filter(u => {
      if (!asignBusq) return true;
      const q   = asignBusq.toLowerCase();
      const emp = empleados.find(e => getId(e) === (u.empleado_id?.$oid || u.empleado_id));
      const nombre = emp ? `${emp.Nombre} ${emp.ApelPaterno}`.toLowerCase() : "";
      return u.user?.toLowerCase().includes(q) || nombre.includes(q) || (u.email || "").toLowerCase().includes(q);
    })
    .sort((a, b) => (a.user || "").localeCompare(b.user || "", "es"));

  if (loading) return (
    <div className="rm-root">
      <div className="rm-loading"><div className="rm-spinner" /><span>Cargando roles…</span></div>
    </div>
  );

  const colorActual = colorById(form.color);

  // ─── Panel de permisos reutilizable ──────────────────────────────────────
  // Función (no componente): como componente se re-montaba en cada casilla
  // marcada y el panel saltaba al inicio, perdiendo el scroll.
  const panelPermisos = (conReportes = false) => (
    <div className="rm-modal-body">
      <p className="rm-paso-desc">
        Activa los módulos y acciones permitidas para este rol.
        Los cambios aplican al próximo login del usuario.
      </p>
      {Object.entries(gruposPermisos).map(([grupo, perms]) => (
        <div key={grupo} className="rm-permiso-grupo">
          <div className="rm-permiso-grupo-title">{grupo}</div>
          {DESC_GRUPO[grupo] && <p className="rm-paso-desc" style={{ margin: "-4px 0 8px" }}>{DESC_GRUPO[grupo]}</p>}
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

      {conReportes && (
        <div className="rm-permiso-grupo">
          <div className="rm-permiso-grupo-title">Reportes de Analítica</div>
          {catalogoReportes.length === 0 ? (
            <p className="rm-paso-desc">Sin reportes en el catálogo todavía.</p>
          ) : catalogoReportes.map(r => (
            <label key={r.id} className="rm-permiso-row">
              <input
                type="checkbox"
                checked={formReportes.includes(r.id)}
                onChange={() => toggleReportePermiso(r.id)}
                className="rm-checkbox"
              />
              <span className="rm-permiso-label">
                {r.nombre}
                <span style={{ display: "block", fontWeight: 400, fontSize: "0.75rem", color: "var(--rm-muted)", marginTop: 2 }}>
                  {r.descripcion}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="rm-root">
      {toast && <div className={`rm-toast rm-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="rm-header">
        <div>
          <h2 className="rm-title">Gestión de roles</h2>
          <p className="rm-sub">{rolesVisibles.length} roles en uso · {usuarios.length} usuarios</p>
        </div>
        {!yaHayDireccion && (
          <IconButton icon={FiBriefcase} size="lg" label="Crear rol de Dirección (solo lectura de indicadores)" tooltipPos="left" onClick={crearDireccion} />
        )}
        <IconButton accion="agregar" size="lg" label="Nuevo rol" tooltipPos="left" onClick={abrirCrear} />
      </div>

      <div className="rm-guia">
        <strong>¿Por dónde empezar?</strong> Cada persona recibe el rol que corresponde a sus funciones: la cuenta
        principal es <em>Administrador general</em>; el personal de Recursos Humanos, <em>Recursos Humanos</em>, y el
        resto del personal, <em>Empleado</em>. Los responsables que autorizan las vacaciones de su equipo tienen el rol
        <em> Jefe de área</em>, y la dirección general utiliza el rol <em>Dirección</em>. Los roles que la empresa no
        utilice pueden ocultarse con el ícono del ojo o eliminarse con el bote; un rol eliminado se vuelve a crear de
        cero con <em>Nuevo rol</em>. En el grupo <em>Directorio</em> se decide qué ve cada rol de sus compañeros.
      </div>

      {/* ─── Grid de roles ─────────────────────────────────────────── */}
      <div className="rm-roles-grid">
        {(verOcultos ? [...rolesVisibles, ...rolesOcultos] : rolesVisibles).map(rol => {
          const oculto = ocultos.includes(rol.nombre);
          const { bg, fg } = colorById(rol.color);
          const isSuperAdmin = rol.nombre === "SUPER_ADMIN";
          return (
            <div key={rol.id || rol.nombre}
              className={`rm-rol-card ${rol.sistema ? "rm-rol-card--sistema" : ""}`} style={oculto ? { opacity: 0.55 } : undefined}>
              <div className="rm-rol-card-top">
                <span className="rm-rol-badge" style={{ background: bg, color: fg }} title={rol.nombre}>
                  {rol.sistema ? roleLabel(rol.nombre) : rol.nombre}
                </span>
                {rol.sistema && <span className="rm-rol-sistema-tag">{oculto ? "Oculto" : "Sistema"}</span>}
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
                    <IconButton icon={FiUserPlus} size="sm" label={`Asignar ${rol.nombre} a una cuenta`} onClick={() => abrirAsignar(rol)} />
                  )}
                  {rol.sistema && !isSuperAdmin && (
                    <IconButton icon={FiSliders} size="sm" label="Editar permisos de este rol" onClick={() => abrirEditarSistema(rol)} />
                  )}
                  {rol.sistema && !ROLES_NO_OCULTABLES.includes(rol.nombre) && (
                    <IconButton icon={oculto ? FiEye : FiEyeOff} size="sm" tooltipPos="left"
                      label={oculto ? "Volver a usar este rol" : "Ocultar: mi empresa no usa este rol"} onClick={() => ocultarRol(rol, !oculto)} />
                  )}
                  {!rol.sistema && (
                    <IconButton accion="editar" size="sm" label={`Editar ${rol.nombre}`} onClick={() => abrirEditar(rol)} />
                  )}
                  {!isSuperAdmin && (
                    <IconButton accion="eliminar" size="sm" tooltipPos="left"
                      label={rol.usuarios > 0 ? `No se puede eliminar: ${rol.usuarios} cuenta(s) lo tienen` : `Eliminar ${rol.sistema ? roleLabel(rol.nombre) : rol.nombre}`}
                      onClick={() => eliminarRol(rol)} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rolesOcultos.length > 0 && (
        <button type="button" className="rm-ver-ocultos" onClick={() => setVerOcultos(v => !v)}>
          {verOcultos ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
          {verOcultos ? "Esconder roles ocultos" : `Ver roles ocultos (${rolesOcultos.length})`}
        </button>
      )}

      {/* ─── Modal crear / editar rol custom ─────────────────────── */}
      {(modal === "crear" || modal === "editar") && (
        <Portal><div className="rm-overlay" onClick={cerrarModal}>
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
                        {paso > s ? <FiCheck /> : s}
                      </div>
                      {s < 3 && <div className={`rm-step-line ${paso>s?"rm-step-line--done":""}`}/>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <button className="rm-modal-close" onClick={cerrarModal}><FiX /></button>
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
                        {form.color===c.id && <span className="rm-color-check"><FiCheck /></span>}
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

            {paso === 2 && panelPermisos()}

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
                <IconButton accion="anterior" label="Anterior" onClick={() => setPaso(p => p-1)} />
              )}
              <div style={{flex:1}} />
              {paso < 3
                ? <IconButton accion="siguiente" label="Siguiente" tooltipPos="left" onClick={() => setPaso(p => p+1)}
                    disabled={paso===1 && !form.nombre.trim()} />
                : <IconButton accion="guardar" busy={saving} label={modal==="editar" ? "Guardar cambios" : "Crear rol"} onClick={guardarRol} tooltipPos="left" />
              }
            </div>
          </div>
        </div></Portal>
      )}

      {/* ─── Modal editar permisos de rol sistema ────────────────── */}
      {modal === "editar_sistema" && editSistema && (
        <Portal><div className="rm-overlay" onClick={cerrarModal}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div>
                <h3 className="rm-modal-title">Permisos · {editSistema.nombre}</h3>
                <p className="rm-modal-subtitle" style={{fontSize:"0.75rem",color:"var(--rm-muted)",marginTop:4}}>
                  Rol de sistema — solo se pueden editar los permisos
                </p>
              </div>
              <button className="rm-modal-close" onClick={cerrarModal}><FiX /></button>
            </div>
            {panelPermisos(ROLES_ANALITICA.includes(editSistema.nombre))}
            <div className="rm-modal-footer">
              <div style={{flex:1}}/>
              <IconButton accion="guardar" label="Guardar permisos" onClick={guardarPermsSistema} tooltipPos="left" />
            </div>
          </div>
        </div></Portal>
      )}

      {/* ─── Modal asignar rol ────────────────────────────────────── */}
      {modal === "asignar" && asignando && (
        <Portal><div className="rm-overlay" onClick={cerrarModal}>
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
              <button className="rm-modal-close" onClick={cerrarModal}><FiX /></button>
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
                        {u.aegis !== undefined && (
                          u.aegis === null
                            ? <span style={{ fontSize: "0.7rem", color: "#e5484d" }}>Sin identidad Aegis</span>
                            : !u.aegis.is_active
                              ? <span style={{ fontSize: "0.7rem", color: "#e5484d" }}>Aegis: inactiva</span>
                              : u.aegis.must_change_password
                                ? <span style={{ fontSize: "0.7rem", color: "#f5a524" }}>Aegis: contraseña temporal</span>
                                : <span style={{ fontSize: "0.7rem", color: "#30a46c" }}>Aegis: activa</span>
                        )}
                      </div>
                      {yaTiene
                        ? <span className="rm-ya-asignado" aria-label="Ya asignado" title="Ya asignado"><FiCheck aria-hidden="true" /></span>
                        : <IconButton accion="siguiente" size="sm" label="Asignar este rol" tooltipPos="left"
                            onClick={() => asignarRolAUsuario(uid)} disabled={saving} />}
                    </div>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <p className="rm-empty">Sin usuarios que coincidan.</p>
                )}
                {usuariosFiltrados.length > 10 && (
                  <p className="rm-empty" role="status">
                    Mostrando 10 de {usuariosFiltrados.length} — escribe para afinar la búsqueda.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div></Portal>
      )}
    </div>
  );
}

export default RoleManager;