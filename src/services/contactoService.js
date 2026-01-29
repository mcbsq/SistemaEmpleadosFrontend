import { API_URL, defaultHeaders } from "./apiConfig";

export const contactoService = {
  // --- NUEVO MÉTODO PARA CREAR ---
  createDatos: (datos) => fetch(`${API_URL}/datoscontacto`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(datos)
  }).then(res => {
    if (!res.ok) throw new Error("Error al crear datos de contacto");
    return res.json();
  }),

  // --- MÉTODOS EXISTENTES ---
  getDatos: () => fetch(`${API_URL}/datoscontacto`).then(res => res.json()),
  getDatosByEmpleado: (id) => fetch(`${API_URL}/datoscontacto/empleado/${id}`).then(res => res.json()),
  
  getPersonas: () => fetch(`${API_URL}/personascontacto`).then(res => res.json()),
  getPersonasByEmpleado: (id) => fetch(`${API_URL}/personascontacto/empleado/${id}`).then(res => res.json()),

  getRedes: () => fetch(`${API_URL}/redsocial`).then(res => res.json()),
  getRedesByEmpleado: (id) => fetch(`${API_URL}/redsocial/empleado/${id}`).then(res => res.json()),

  updateDatos: (id, datos) => fetch(`${API_URL}/datoscontacto/empleado/${id}`, {
    method: "PUT", headers: defaultHeaders, body: JSON.stringify(datos)
  }).then(res => res.json()),

  deleteDatos: (id) => fetch(`${API_URL}/datoscontacto/${id}`, { method: "DELETE", headers: defaultHeaders }),
  deletePersonas: (id) => fetch(`${API_URL}/personascontacto/${id}`, { method: "DELETE", headers: defaultHeaders }),
  deleteRedes: (id) => fetch(`${API_URL}/redsocial/${id}`, { method: "DELETE", headers: defaultHeaders })
};