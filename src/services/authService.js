// src/services/authService.js
import { apiFetch } from "./apiConfig";

// ─── Mapa de permisos por rol — fallback si el backend no los devuelve ────────
// Estos son los permisos DEFAULT. El Super Admin puede modificarlos desde /roles.
const PERMISOS_DEFAULT = {
  SUPER_ADMIN:     ["*"], // wildcard = todo
  ADMIN:           ["ver_empleados","crud_empleados","ver_expediente","ver_rh",
                    "ver_proyectos","ver_organigrama","ver_habilidades",
                    "ver_dashboard","ver_carrusel"],
  EMPLOYEE:        ["ver_organigrama","ver_carrusel","ver_perfil_propio"],
  JEFE_AREA:       ["ver_empleados","ver_organigrama","ver_proyectos",
                    "ver_habilidades","solo_equipo_directo","ver_carrusel",
                    "ver_dashboard"],
  CONTADOR:        ["ver_empleados","ver_rh","ver_organigrama","ver_dashboard","ver_carrusel"],
  PROJECT_MANAGER: ["ver_empleados","ver_proyectos","ver_habilidades",
                    "ver_organigrama","ver_dashboard","ver_carrusel"],
  MEDICO:          ["ver_empleados","ver_expediente","ver_organigrama",
                    "ver_dashboard","ver_carrusel"],
};

// ─── Qué módulos del dashboard activa cada rol ────────────────────────────────
const DASHBOARD_MODULOS = {
  SUPER_ADMIN:     ["dashboard_admin","home_carousel","organigrama"],
  ADMIN:           ["dashboard_admin","home_carousel","organigrama"],
  EMPLOYEE:        ["home_carousel","organigrama"],
  JEFE_AREA:       ["dashboard_jefe_area","home_carousel","organigrama"],
  CONTADOR:        ["dashboard_contador","home_carousel","organigrama"],
  PROJECT_MANAGER: ["dashboard_pm","home_carousel","organigrama"],
  MEDICO:          ["dashboard_medico","home_carousel","organigrama"],
};

export const authService = {

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(credentials) {
    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (data.access_token) {
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("user_role",    data.role);
        sessionStorage.setItem("empleado_id",  data.empleado_id  ?? "");
        sessionStorage.setItem("depto_id",     data.depto_id     ?? "");
        if (data.user) sessionStorage.setItem("user_name", data.user);

        // Guardar permisos: primero los que devuelve el backend,
        // si no, usar los defaults según el rol
        const permisos = data.permisos
          || PERMISOS_DEFAULT[data.role]
          || PERMISOS_DEFAULT["EMPLOYEE"];
        sessionStorage.setItem("user_permisos", JSON.stringify(permisos));

        // Guardar módulos del dashboard activos para este rol
        const modulos = data.modulos
          || DASHBOARD_MODULOS[data.role]
          || DASHBOARD_MODULOS["EMPLOYEE"];
        sessionStorage.setItem("user_modulos", JSON.stringify(modulos));
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // ─── Logout ───────────────────────────────────────────────────────────────
  logout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user_role");
    sessionStorage.removeItem("empleado_id");
    sessionStorage.removeItem("depto_id");
    sessionStorage.removeItem("user_name");
    sessionStorage.removeItem("user_permisos");
    sessionStorage.removeItem("user_modulos");
    window.location.href = "/";
  },

  // ─── Getters básicos — NO CAMBIAN, compatibilidad total ──────────────────
  getToken()      { return sessionStorage.getItem("access_token"); },
  getRole()       { return sessionStorage.getItem("user_role"); },
  getEmpleadoId() { return sessionStorage.getItem("empleado_id"); },
  getDeptoId()    { return sessionStorage.getItem("depto_id"); },
  isAuthenticated() { return !!sessionStorage.getItem("access_token"); },

  // ─── Checks de rol — NO CAMBIAN ───────────────────────────────────────────
  isSuperAdmin() { return sessionStorage.getItem("user_role") === "SUPER_ADMIN"; },
  isAdmin() {
    const role = sessionStorage.getItem("user_role");
    return role === "ADMIN" || role === "SUPER_ADMIN";
  },
  isEmployee() { return sessionStorage.getItem("user_role") === "EMPLOYEE"; },

  // ─── NUEVO: Sistema de permisos granulares ────────────────────────────────

  // Obtener todos los permisos del usuario actual
  getPermisos() {
    try {
      return JSON.parse(sessionStorage.getItem("user_permisos") || "[]");
    } catch {
      return [];
    }
  },

  // Verificar si tiene un permiso específico
  // "ver_empleados", "crud_empleados", "ver_rh", etc.
  hasPermiso(key) {
    if (this.isSuperAdmin()) return true; // Super Admin siempre puede todo
    const permisos = this.getPermisos();
    return permisos.includes("*") || permisos.includes(key);
  },

  // Verificar varios permisos a la vez (necesita TODOS)
  hasPermisos(keys = []) {
    return keys.every(k => this.hasPermiso(k));
  },

  // Verificar si tiene AL MENOS UNO de los permisos
  hasAnyPermiso(keys = []) {
    return keys.some(k => this.hasPermiso(k));
  },

  // ─── NUEVO: Módulos activos del dashboard ─────────────────────────────────
  getModulosActivos() {
    try {
      return JSON.parse(sessionStorage.getItem("user_modulos") || "[]");
    } catch {
      return [];
    }
  },

  isModuloActivo(key) {
    if (this.isSuperAdmin()) return true;
    return this.getModulosActivos().includes(key);
  },

  // ─── Checks de acceso — NO CAMBIAN, compatibilidad total ─────────────────
  canEdit(perfilEmpleadoId) {
    return this.isOwnProfile(perfilEmpleadoId) || this.isAdmin();
  },

  canViewSensitive(perfilEmpleadoId) {
    if (this.isSuperAdmin()) return true;
    return this.isOwnProfile(perfilEmpleadoId) || this.isAdmin();
  },

  canManageEmployees() {
    return this.isAdmin() || this.hasPermiso("crud_empleados");
  },

  isOwnProfile(perfilEmpleadoId) {
    const currentId = sessionStorage.getItem("empleado_id");
    return currentId && String(currentId) === String(perfilEmpleadoId);
  },

  isSameArea(empDeptoId) {
    if (this.isSuperAdmin()) return true;
    const myDepto = sessionStorage.getItem("depto_id");
    return myDepto && String(myDepto) === String(empDeptoId);
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
  },
};