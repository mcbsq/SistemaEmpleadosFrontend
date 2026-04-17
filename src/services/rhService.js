import { API_URL, defaultHeaders } from "./apiConfig";

export const rhService = {
  getAll: () =>
    fetch(`${API_URL}/rh`, { headers: defaultHeaders })
      .then(res => res.ok ? res.json() : []),

  // FIX: era /rh/empleado/${id} → ruta Flask real es /rh/<empleado_id>
  getByEmpleado: (id) =>
    fetch(`${API_URL}/rh/${id}`, { headers: defaultHeaders })
      .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); }),

  getJerarquia: () =>
    fetch(`${API_URL}/jerarquia`, { headers: defaultHeaders })
      .then(res => res.json()),

  saveJerarquia: (datos) =>
    fetch(`${API_URL}/jerarquia`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(datos),
    }).then(res => res.json()),

  update: (id, datos) =>
    fetch(`${API_URL}/rh/${id}`, {
      method: "PUT",
      headers: defaultHeaders,
      body: JSON.stringify({ ...datos, empleado_id: id }),
    }).then(res => res.json()),

  delete: (id) =>
    fetch(`${API_URL}/rh/${id}`, { method: "DELETE", headers: defaultHeaders }),
};