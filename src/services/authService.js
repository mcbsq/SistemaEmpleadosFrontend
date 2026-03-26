// services/authService.js

export const authService = {

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(credentials) {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Credenciales inválidas.");

    sessionStorage.setItem("access_token", data.access_token);
    sessionStorage.setItem("user_role",    data.role);
    sessionStorage.setItem("empleado_id",  data.empleado_id  ?? "");
    sessionStorage.setItem("depto_id",     data.depto_id     ?? "");

    return data;
  },

  // ─── Logout ───────────────────────────────────────────────────────────────
  logout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user_role");
    sessionStorage.removeItem("empleado_id");
    sessionStorage.removeItem("depto_id");
  },

  // ─── Getters ──────────────────────────────────────────────────────────────
  getToken()      { return sessionStorage.getItem("access_token"); },
  getRole()       { return sessionStorage.getItem("user_role"); },
  getEmpleadoId() { return sessionStorage.getItem("empleado_id"); },
  getDeptoId()    { return sessionStorage.getItem("depto_id"); },

  isAuthenticated() { return !!sessionStorage.getItem("access_token"); },

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
    return sessionStorage.getItem("empleado_id") === String(perfilEmpleadoId);
  },

  // El empleado pertenece al mismo depto que el usuario autenticado
  isSameArea(empDeptoId) {
    if (this.isSuperAdmin()) return true; // SUPER_ADMIN ve todo
    return sessionStorage.getItem("depto_id") === String(empDeptoId);
  },
};