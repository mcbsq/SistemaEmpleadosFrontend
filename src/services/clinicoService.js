// services/clinicoService.js
import { API_URL, defaultHeaders } from "./apiConfig";

export const clinicoService = {
  // GET /expedienteclinico — todos los registros (para la tabla de admin)
  getAll: () =>
    fetch(`${API_URL}/expedienteclinico`, { headers: defaultHeaders })
      .then(res => res.ok ? res.json() : []),

  getByEmpleado: (id) =>
    fetch(`${API_URL}/expedienteclinico/empleado/${id}`, { headers: defaultHeaders })
      .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); }),

  update: (id, datos) =>
    fetch(`${API_URL}/expedienteclinico/empleado/${id}`, {
      method: "PUT",
      headers: defaultHeaders,
      body: JSON.stringify(datos),
    }).then(res => res.json()),

  delete: (id) =>
    fetch(`${API_URL}/expedienteclinico/${id}`, {
      method: "DELETE",
      headers: defaultHeaders,
    }),
};