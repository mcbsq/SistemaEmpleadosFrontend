// src/services/usuarioService.js
import { API_URL, defaultHeaders } from "./apiConfig";

export const usuarioService = {
  create: async (nuevoUsuario) => {
    const response = await fetch(`${API_URL}/usuario`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(nuevoUsuario),
    });
    if (!response.ok) throw new Error("Error al agregar el usuario.");
    return await response.json();
  }
};
