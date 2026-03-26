// ─── URL base desde variable de entorno ───────────────────────────────────────
// En desarrollo: crea un archivo .env con REACT_APP_API_URL=http://localhost:5001
// En producción: configura la variable en tu servidor/CI
const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  console.error(
    '[apiRequests] REACT_APP_API_URL no está definida. ' +
    'Crea un archivo .env en la raíz del proyecto.'
  );
}

// ─── Headers comunes ──────────────────────────────────────────────────────────
const jsonHeaders = {
  'Content-Type': 'application/json',
};

// ─── Función base para fetch con manejo de errores ───────────────────────────
async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...jsonHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `[${options.method || 'GET'}] ${endpoint} → ${response.status} ${response.statusText}. ${errorBody}`
    );
  }

  return response.json();
}

// ─── Función upsert genérica ──────────────────────────────────────────────────
// Verifica si ya existe un recurso con GET; si existe → PUT, si no → POST.
// Evita duplicar esta lógica en cada módulo.
async function upsert({ checkEndpoint, createEndpoint, updateEndpoint, data }) {
  const exists = await fetch(`${API_URL}${checkEndpoint}`)
    .then((r) => r.ok)
    .catch(() => false);

  if (exists) {
    return apiFetch(updateEndpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } else {
    return apiFetch(createEndpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLEADOS
// ═══════════════════════════════════════════════════════════════════════════════

export const cargarEmpleadosBD = () =>
  apiFetch('/empleados');

// ═══════════════════════════════════════════════════════════════════════════════
// EDUCACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export const enviarDatosEducacion = (id, datosEducacion) =>
  upsert({
    checkEndpoint:  `/educacion/empleado/${id}`,
    createEndpoint: `/educacion`,
    updateEndpoint: `/educacion/${id}`,
    data: datosEducacion,
  });

export const cargarEducacionPorEmpleado = (empleadoId) =>
  apiFetch(`/educacion/empleado/${empleadoId}`);

// ═══════════════════════════════════════════════════════════════════════════════
// REDES SOCIALES
// ═══════════════════════════════════════════════════════════════════════════════

export const enviarDatosRedesSociales = (id, datosRedesSociales) =>
  upsert({
    checkEndpoint:  `/redsocial/empleado/${id}`,
    createEndpoint: `/redsocial`,
    updateEndpoint: `/redsocial/empleado/${id}`,
    data: datosRedesSociales,
  });

export const cargarRedesSocialesPorEmpleado = async (empleadoId) => {
  const json = await apiFetch(`/redsocial/empleado/${empleadoId}`);

  if (!json?.[0]?.RedesSociales) return [];

  return json[0].RedesSociales.map(({ redSocialSeleccionada, URLRedSocial, NombreRedSocial }) => ({
    redSocialSeleccionada,
    URLRedSocial,
    NombreRedSocial,
  }));
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH
// ═══════════════════════════════════════════════════════════════════════════════

export const enviarDatosRH = (id, datosRH) =>
  upsert({
    checkEndpoint:  `/rh/${datosRH.empleado_id}`,
    createEndpoint: `/rh`,
    updateEndpoint: `/rh/${id}`,
    data: datosRH,
  });

export const cargarRHPorEmpleado = async (empleadoId) => {
  const rhData = await apiFetch(`/rh/${empleadoId}`);
  return {
    Puesto:           rhData.Puesto || '',
    JefeInmediato:    rhData.JefeInmediato || '',
    HorarioLaboral: {
      HoraEntrada:    rhData.HorarioLaboral?.HoraEntrada    || '',
      HoraSalida:     rhData.HorarioLaboral?.HoraSalida     || '',
      TiempoComida:   rhData.HorarioLaboral?.TiempoComida   || '',
      DiasTrabajados: rhData.HorarioLaboral?.DiasTrabajados || '',
    },
    ExpedienteDigitalPDF: rhData.ExpedienteDigitalPDF || null,
    empleadoid:           rhData.empleado_id || empleadoId,
  };
};

export const cargarrhpuesto = () =>
  apiFetch('/rh');

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONAS CONTACTO
// ═══════════════════════════════════════════════════════════════════════════════

export const enviarPersonasContacto = (id, datosPersonasContacto) =>
  upsert({
    checkEndpoint:  `/personascontacto/empleado/${id}`,
    createEndpoint: `/personascontacto`,
    updateEndpoint: `/personascontacto/empleado/${id}`,
    data: datosPersonasContacto,
  });

export const cargarPersonasContactoPorEmpleado = async (empleadoId) => {
  const json = await apiFetch(`/personascontacto/empleado/${empleadoId}`);

  if (!Array.isArray(json) || json.length === 0) return null;

  const p = json[0];
  return {
    parenstesco:       p.parenstesco,
    nombreContacto:    p.nombreContacto,
    telefonoContacto:  p.telefonoContacto,
    correoContacto:    p.correoContacto,
    direccionContacto: p.direccionContacto,
    empleadoid:        p.empleadoid,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATOS CONTACTO
// ═══════════════════════════════════════════════════════════════════════════════

export const enviarDatosContacto = (datosContacto) =>
  upsert({
    checkEndpoint:  `/datoscontacto/empleado/${datosContacto.empleado_id}`,
    createEndpoint: `/datoscontacto`,
    updateEndpoint: `/datoscontacto/empleado/${datosContacto.empleado_id}`,
    data: datosContacto,
  });

export const cargarDatosContactoPorEmpleado = async (empleadoId) => {
  const json = await apiFetch(`/datoscontacto/empleado/${empleadoId}`);

  if (!json?._id) return null;

  return {
    telefonoF:  json.TelFijo,
    telefonoC:  json.TelCelular,
    direccion:  json.Direccion,
    IDwhatsapp: json.IdWhatsApp,
    IDtelegram: json.IdTelegram,
    correo:     json.ListaCorreos,
    empleadoid: json.empleadoId,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPEDIENTE CLÍNICO
// ═══════════════════════════════════════════════════════════════════════════════

export const enviarDatosExpedienteClinico = (id, datosExpedienteClinico) =>
  upsert({
    checkEndpoint:  `/expedienteclinico/empleado/${id}`,
    createEndpoint: `/expedienteclinico`,
    updateEndpoint: `/expedienteclinico/empleado/${id}`,
    data: datosExpedienteClinico,
  });

export const cargarExpedienteClinicoPorEmpleado = async (empleadoId) => {
  const json = await apiFetch(`/expedienteclinico/empleado/${empleadoId}`);

  if (!Array.isArray(json) || json.length === 0) return null;

  const e = json[0];
  return {
    tipoSangre:              e.tipoSangre,
    Padecimientos:           e.Padecimientos,
    NumeroSeguroSocial:      e.NumeroSeguroSocial,
    Datossegurodegastos:     e.Segurodegastosmedicos,
    PDFSegurodegastosmedicos: e.PDFSegurodegastosmedicos || null,
  };
};