// services/authService.js
import { apiFetch } from "./apiConfig";

export const authService = {

  // ─── Login ────────────────────────────────────────────────────────────────
  // Ahora usa apiFetch para centralizar la URL y los errores
  async login(credentials) {
    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      // Guardado de persistencia en sesión
      if (data.access_token) {
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("user_role",    data.role);
        sessionStorage.setItem("empleado_id",  data.empleado_id  ?? "");
        sessionStorage.setItem("depto_id",     data.depto_id     ?? "");
        sessionStorage.setItem("user_name",    data.user         ?? "");
      }

      return data;
    } catch (error) {
      // Re-lanzamos el error para que el componente Login.js lo capture en su catch
      throw error;
    }
  },

  // ─── Logout ───────────────────────────────────────────────────────────────
  logout() {
    sessionStorage.clear(); // Limpia todo rastro de la sesión
    window.location.href = "/"; // Redirige al inicio
  },

  // ─── Getters de Sesión ───────────────────────────────────────────────────
  getToken()      { return sessionStorage.getItem("access_token"); },
  getRole()       { return sessionStorage.getItem("user_role"); },
  getEmpleadoId() { return sessionStorage.getItem("empleado_id"); },
  getDeptoId()    { return sessionStorage.getItem("depto_id"); },
  getUserName()   { return sessionStorage.getItem("user_name"); },

  isAuthenticated() { 
    return !!sessionStorage.getItem("access_token"); 
  },

  // ─── Verificaciones de Rol ───────────────────────────────────────────────
  isSuperAdmin() {
    return sessionStorage.getItem("user_role") === "SUPER_ADMIN";
  },

  isAdmin() {
    const role = sessionStorage.getItem("user_role");
    return role === "ADMIN" || role === "SUPER_ADMIN";
  },

  isEmployee() {
    return sessionStorage.getItem("user_role") === "EMPLOYEE";
  },

  // ─── Lógica de Permisos de Acceso ────────────────────────────────────────

  // ¿Puede editar este perfil? (Dueño, ADMIN o SUPER_ADMIN)
  canEdit(perfilEmpleadoId) {
    return (
      this.isOwnProfile(perfilEmpleadoId) ||
      this.isAdmin()
    );
  },

  // ¿Puede ver datos sensibles (RH, Clínica)?
  canViewSensitive(perfilEmpleadoId) {
    if (this.isSuperAdmin()) return true;
    return (
      this.isOwnProfile(perfilEmpleadoId) ||
      this.isAdmin()
    );
  },

  // ¿Puede entrar al módulo de gestión de nómina/empleados?
  canManageEmployees() {
    return this.isAdmin();
  },

  // Verifica si el ID del perfil coincide con el usuario logueado
  isOwnProfile(perfilEmpleadoId) {
    const currentId = sessionStorage.getItem("empleado_id");
    return currentId && String(currentId) === String(perfilEmpleadoId);
  },

  // Verifica si el empleado pertenece al área del usuario (para jerarquías)
  isSameArea(empDeptoId) {
    if (this.isSuperAdmin()) return true;
    const myDepto = sessionStorage.getItem("depto_id");
    return myDepto && String(myDepto) === String(empDeptoId);
  },

  // Helper para headers de archivos (si necesitas subir PDFs después)
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};