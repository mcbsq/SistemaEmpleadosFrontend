// src/utils/roleLabels.js
// Pedido explícito del cliente (2026-09-24): "quitar la palabra super_admin"
// de lo que ve — el nombre técnico interno del rol no debe mostrarse tal
// cual; se muestran como "Administrador general" / "Administrador de área".
export const ROLE_LABELS = {
  SUPER_ADMIN: "Administrador general",
  ADMIN: "Administrador de área",
  EMPLOYEE: "Empleado",
  CONTADOR: "Contador",
  PROJECT_MANAGER: "Project Manager",
  JEFE_AREA: "Jefe de área",
  MEDICO: "Médico",
  RH: "Recursos Humanos",
};

export const roleLabel = (role) => ROLE_LABELS[role] || role;
