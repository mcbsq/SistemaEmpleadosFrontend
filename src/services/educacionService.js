import { API_URL, defaultHeaders } from "./apiConfig";

export const educacionService = {
  getAll: () => fetch(`${API_URL}/educacion`).then(res => res.json()),
  getByEmpleado: (id) => fetch(`${API_URL}/educacion/empleado/${id}`).then(res => res.json()),

  update: (id, datos) => fetch(`${API_URL}/educacion/${id}`, {
    method: "PUT", headers: defaultHeaders, body: JSON.stringify(datos)
  }).then(res => res.json()),

  delete: (id) => fetch(`${API_URL}/educacion/${id}`, { method: "DELETE", headers: defaultHeaders })
};