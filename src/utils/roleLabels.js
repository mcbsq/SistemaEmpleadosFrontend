// src/utils/roleLabels.js
// Pedido explícito del cliente (2026-09-24): "quitar la palabra super_admin"
// de lo que ve — el nombre técnico interno del rol no debe mostrarse tal
// cual; ADMIN y SUPER_ADMIN se leen igual de cara al usuario.
export const ROLE_LABELS = {
  SUPER_ADMIN: "Administrador",
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
  CONTADOR: "Contador",
  PROJECT_MANAGER: "Project Manager",
  JEFE_AREA: "Jefe de área",
  MEDICO: "Médico",
};

export const roleLabel = (role) => ROLE_LABELS[role] || role;
