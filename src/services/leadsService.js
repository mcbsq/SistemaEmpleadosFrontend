// services/leadsService.js
// Solicitudes de información del sitio público (botones "Crear mi empresa" /
// "Comenzar ahora") — no crea ningún tenant, solo avisa a Cibercom por correo
// (ver api/leads/routes.py). Endpoint público, sin token.
import { apiFetch } from "./apiConfig";

export const leadsService = {
  crear: (data) => apiFetch("/public/leads", {
    method: "POST",
    body: JSON.stringify(data),
  }),
};
