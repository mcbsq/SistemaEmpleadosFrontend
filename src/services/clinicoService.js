import { API_URL, defaultHeaders } from "./apiConfig";

export const clinicoService = {
  getAll: () =>
    fetch(`${API_URL}/expedienteclinico`, { headers: defaultHeaders })
      .then(res => res.ok ? res.json() : []),

  getByEmpleado: (id) =>
    fetch(`${API_URL}/expedienteclinico/empleado/${id}`, { headers: defaultHeaders })
      .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); }),

  // upsert con normalización de PDF (use-file-picker devuelve array)
  update: async (id, datos) => {
    let pdfBase64 = datos.PDFSegurodegastosmedicos;
    if (Array.isArray(pdfBase64) && pdfBase64.length > 0) {
      pdfBase64 = pdfBase64[0].content || pdfBase64[0];
    }

    const payload = {
      empleado_id:              id,
      tipoSangre:               datos.tipoSangre              || "",
      Padecimientos:            datos.Padecimientos           || "",
      NumeroSeguroSocial:       datos.NumeroSeguroSocial      || "",
      Segurodegastosmedicos:    datos.Datossegurodegastos     || "",
      PDFSegurodegastosmedicos: pdfBase64                     || null,
    };

    const res = await fetch(`${API_URL}/expedienteclinico/empleado/${id}`, {
      method: "PUT",
      headers: defaultHeaders,
      body: JSON.stringify(payload),
    });
    if (res.status === 404) {
      return fetch(`${API_URL}/expedienteclinico`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(payload),
      }).then(r => r.json());
    }
    return res.json();
  },

  delete: (id) =>
    fetch(`${API_URL}/expedienteclinico/${id}`, {
      method: "DELETE",
      headers: defaultHeaders,
    }),
};