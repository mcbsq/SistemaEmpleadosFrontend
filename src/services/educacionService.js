import { API_URL, defaultHeaders } from "./apiConfig";

export const educacionService = {
  getAll: () =>
    fetch(`${API_URL}/educacion`, { headers: defaultHeaders })
      .then(res => res.json()),

  getByEmpleado: (id) =>
    fetch(`${API_URL}/educacion/empleado/${id}`, { headers: defaultHeaders })
      .then(res => res.json()),

  // upsert: PUT con fallback a POST si no existe
  update: async (id, datos) => {
    const res = await fetch(`${API_URL}/educacion/${id}`, {
      method: "PUT",
      headers: defaultHeaders,
      body: JSON.stringify({ ...datos, empleado_id: id }),
    });
    if (res.status === 404) {
      return fetch(`${API_URL}/educacion`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ ...datos, empleado_id: id }),
      }).then(r => r.json());
    }
    return res.json();
  },

  delete: (id) =>
    fetch(`${API_URL}/educacion/${id}`, { method: "DELETE", headers: defaultHeaders }),
};