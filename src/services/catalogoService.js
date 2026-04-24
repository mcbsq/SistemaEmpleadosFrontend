import { apiFetch } from "./apiConfig";

export const FALLBACK = {
  parentesco: [
    "Esposa", "Esposo", "Madre", "Padre", "Amistad",
    "Hermana", "Hermano", "Prima", "Primo",
    "Tía", "Tío", "Abuela", "Abuelo",
  ],
  esquema_contratacion: [
    "Nómina", "Asimilados", "Servicios profesionales",
  ],
  tipo_vialidad: [
    "Andador", "Avenida", "Boulevard", "Calle", "Callejón",
    "Calzada", "Camino", "Carretera", "Cerrada", "Circuito",
    "Circunvalación", "Corredor", "Diagonal", "Eje vial",
    "Pasaje", "Peatonal", "Periférico", "Privada",
    "Prolongación", "Retorno", "Viaducto",
  ],
};

let _cache = null;

export const catalogoService = {
  async getAll() {
    if (_cache) return _cache;
    try {
      const data = await apiFetch("/catalogos");
      _cache = {
        parentesco:           data.parentesco           || FALLBACK.parentesco,
        esquema_contratacion: data.esquema_contratacion || FALLBACK.esquema_contratacion,
        tipo_vialidad:        data.tipo_vialidad        || FALLBACK.tipo_vialidad,
      };
      return _cache;
    } catch {
      return FALLBACK;
    }
  },

  clearCache() { _cache = null; },

  async getParentesco()          { return (await this.getAll()).parentesco; },
  async getEsquemaContratacion() { return (await this.getAll()).esquema_contratacion; },
  async getTipoVialidad()        { return (await this.getAll()).tipo_vialidad; },
};