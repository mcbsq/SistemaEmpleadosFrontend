// services/panelRhService.js — tablero del día de RH (backend api/panel_rh).
import { apiFetch } from "./apiConfig";
export const panelRhService = { get: () => apiFetch("/rh/panel") };
