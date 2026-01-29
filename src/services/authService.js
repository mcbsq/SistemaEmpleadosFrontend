// src/services/authService.js
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_URL = isLocal ? "http://localhost:5001" : "http://51.79.18.52:5001";

export const authService = {
  login: async (credentials) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error('Error en autenticación');
    return res.json();
  },

  // Registro paso a paso para evitar los 404 de dependencias
  createEmpleado: async (empleadoData) => {
    const res = await fetch(`${API_URL}/empleados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empleadoData),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Error al crear empleado base');
    }
    return res.json();
  },

  createUsuario: async (usuarioData) => {
    const res = await fetch(`${API_URL}/usuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioData),
    });
    if (!res.ok) throw new Error('Error al crear credenciales de usuario');
    return res.json();
  }
};