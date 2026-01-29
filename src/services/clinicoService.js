import { API_URL, defaultHeaders } from "./apiConfig";

export const clinicoService = {
  getByEmpleado: (id) => fetch(`${API_URL}/expedienteclinico/empleado/${id}`).then(res => res.json()),
  
  update: (id, datos) => fetch(`${API_URL}/expedienteclinico/empleado/${id}`, {
    method: "PUT", headers: defaultHeaders, body: JSON.stringify(datos)
  }).then(res => res.json()),

  delete: (id) => fetch(`${API_URL}/expedienteclinico/${id}`, { method: "DELETE", headers: defaultHeaders })
};