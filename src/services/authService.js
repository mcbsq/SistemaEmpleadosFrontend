// services/authService.js
import { apiFetch } from "./apiConfig";

export const authService = {

  // ─── Login ────────────────────────────────────────────────────────────────
  // Implementación usando apiFetch para manejar URL y errores automáticamente
  async login(credentials) {
    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      // Guardamos la información en el storage
      if (data.access_token) {
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("user_role",    data.role);
        sessionStorage.setItem("empleado_id",  data.empleado_id  ?? "");
        sessionStorage.setItem("depto_id",     data.depto_id     ?? "");
        
        // Opcional: Guardar nombre de usuario si el backend lo envía
        if (data.user) sessionStorage.setItem("user_name", data.user);
      }

      return data;
    } catch (error) {
      // Re-lanzamos el error para que el componente Login.js lo capture
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
    
    // Opcional: Forzar recarga para limpiar estado de React
    window.location.href = "/";
  },

  // ─── Getters ──────────────────────────────────────────────────────────────
  getToken()      { return sessionStorage.getItem("access_token"); },
  getRole()       { return sessionStorage.getItem("user_role"); },
  getEmpleadoId() { return sessionStorage.getItem("empleado_id"); },
  getDeptoId()    { return sessionStorage.getItem("depto_id"); },

  isAuthenticated() { 
    return !!sessionStorage.getItem("access_token"); 
  },

  // ─── Checks de rol ────────────────────────────────────────────────────────
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

  // ─── Checks de acceso ────────────────────────────────────────────────────

  // Puede editar un perfil: dueño del perfil, ADMIN o SUPER_ADMIN
  canEdit(perfilEmpleadoId) {
    return (
      this.isOwnProfile(perfilEmpleadoId) ||
      this.isAdmin()
    );
  },

  // Puede ver secciones sensibles (RH, expediente clínico):
  // solo el dueño, ADMIN o SUPER_ADMIN
  canViewSensitive(perfilEmpleadoId) {
    // El Super Admin siempre tiene acceso
    if (this.isSuperAdmin()) return true;
    
    return (
      this.isOwnProfile(perfilEmpleadoId) ||
      this.isAdmin()
    );
  },

  // Puede gestionar empleados (acceder al módulo Empleados)
  canManageEmployees() {
    return this.isAdmin();
  },

  // El perfil que se está viendo es el propio
  isOwnProfile(perfilEmpleadoId) {
    const currentId = sessionStorage.getItem("empleado_id");
    return currentId && String(currentId) === String(perfilEmpleadoId);
  },

  // El empleado pertenece al mismo depto que el usuario autenticado
  isSameArea(empDeptoId) {
    if (this.isSuperAdmin()) return true; // SUPER_ADMIN ve todo
    const myDepto = sessionStorage.getItem("depto_id");
    return myDepto && String(myDepto) === String(empDeptoId);
  },

  // Helper para headers manuales si se requieren en otros componentes
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
  }
};