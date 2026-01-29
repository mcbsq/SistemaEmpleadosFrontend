// src/services/direccionService.js
import { API_URL, defaultHeaders } from "./apiConfig";

export const direccionService = {
  // POST /direccion
  agregarDireccion: async (nuevaDireccion) => {
    try {
      const response = await fetch(`${API_URL}/direccion`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(nuevaDireccion),
      });
      return await response.json();
    } catch (error) {
      console.error("Error en direccionService.agregar:", error);
      throw error;
    }
  }
};