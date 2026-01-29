import { API_URL, defaultHeaders } from "./apiConfig";

export const rhService = {
  getByEmpleado: (id) => fetch(`${API_URL}/rh/empleado/${id}`).then(res => res.json()),
  getJerarquia: () => fetch(`${API_URL}/jerarquia`).then(res => res.json()),
  
  saveJerarquia: (datos) => fetch(`${API_URL}/jerarquia`, {
    method: "POST", headers: defaultHeaders, body: JSON.stringify(datos)
  }).then(res => res.json()),

  update: (id, datos) => fetch(`${API_URL}/rh/${id}`, {
    method: "PUT", headers: defaultHeaders, body: JSON.stringify(datos)
  }).then(res => res.json()),

  delete: (id) => fetch(`${API_URL}/rh/${id}`, { method: "DELETE", headers: defaultHeaders })
};