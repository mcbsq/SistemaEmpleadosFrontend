import { API_URL, defaultHeaders } from "./apiConfig";
import { contactoService } from "./contactoService";
import { educacionService } from "./educacionService";
import { clinicoService } from "./clinicoService";
import { rhService } from "./rhService";

export const empleadoService = {
  getAll: () => fetch(`${API_URL}/empleados`).then(res => res.json()),
  
  getById: (id) => fetch(`${API_URL}/empleados/${id}`).then(res => {
    if (!res.ok) throw new Error("Empleado no encontrado");
    return res.json();
  }),

  create: (datos) => fetch(`${API_URL}/empleados`, {
    method: "POST", headers: defaultHeaders, body: JSON.stringify(datos)
  }).then(res => res.json()),

  deleteFull: async (id) => {
    const res = await fetch(`${API_URL}/empleados/${id}`, { method: "DELETE", headers: defaultHeaders });
    await Promise.allSettled([
      contactoService.deleteDatos(id),
      contactoService.deletePersonas(id),
      contactoService.deleteRedes(id),
      educacionService.delete(id),
      clinicoService.delete(id),
      rhService.delete(id)
    ]);
    return res.json();
  }
};