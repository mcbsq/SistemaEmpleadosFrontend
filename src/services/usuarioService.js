// services/usuarioService.js
import { apiFetch } from "./apiConfig";

export const usuarioService = {
  create: (payload) =>
    apiFetch("/usuario", { method: "POST", body: JSON.stringify(payload) }),
};