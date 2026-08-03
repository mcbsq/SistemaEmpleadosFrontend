// Components/VacacionesAprobacion.jsx
// Cola de aprobación de vacaciones. Accesible a cualquier sesión autenticada
// a nivel de ruta (PrivateRoute); el backend es la frontera real — si el rol
// no está en la lista de aprobadores configurada por SUPER_ADMIN, /vacaciones
// /pendientes responde 403 y aquí se muestra el aviso correspondiente.
import React, { useState, useEffect, useCallback } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { vacacionesService } from "../services/vacacionesService";

// Slug mínimo — suficiente para navegar al perfil desde aquí (resolveSlug en
// App.js ya sabe recuperar por ObjectId si el slug no está en el mapa local).
const perfilUrl = (empleadoId) => `/Perfil/${empleadoId}`;

function VacacionesAprobacion() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autorizado, setAutorizado] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [comentarios, setComentarios] = useState({});

  const cargar = useCallback(() => {
    setLoading(true);
    vacacionesService.getPendientes()
      .then(d => { setPendientes(Array.isArray(d) ? d : []); setAutorizado(true); })
      .catch(() => setAutorizado(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const resolver = async (id, estado) => {
    setProcesando(id);
    try {
      await vacacionesService.actualizarEstado(id, estado, comentarios[id] || "");
      cargar();
    } finally {
      setProcesando(null);
    }
  };

  if (!autorizado) {
    return (
      <div className="empleados-loading">
        <p>No tienes permiso para aprobar solicitudes de vacaciones.</p>
        <p className="emp-dim">Un Super Admin puede agregarte como aprobador desde Configuración → Vacaciones.</p>
      </div>
    );
  }

  return (
    <section className="empleados">
      <div className="CRUDS">
        <div className="hr-page-header">
          <div>
            <h2 className="hr-title">Solicitudes de vacaciones</h2>
            <p className="hr-subtitle">Aprueba o rechaza las solicitudes pendientes de tu equipo.</p>
          </div>
        </div>

        {loading ? (
          <div className="empleados-loading"><div className="emp-loading-ring" /><p>Cargando…</p></div>
        ) : pendientes.length === 0 ? (
          <div className="emp-empty"><p><FiCheckCircle style={{ marginRight: 6, verticalAlign: "-2px" }} />No hay solicitudes pendientes.</p></div>
        ) : (
          <div className="fin-doc-list">
            {pendientes.map(s => (
              <div key={s._id} className="fin-doc-row" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <a href={perfilUrl(s.empleado_id)} className="fin-doc-periodo" style={{ textDecoration: "none" }}>
                  {s.empleado_nombre || "Empleado"}
                </a>
                <span className="emp-dim">{s.fecha_inicio} → {s.fecha_fin}</span>
                <span className="emp-chip">{s.dias_solicitados} días</span>
                {s.motivo && <span className="emp-dim">· {s.motivo}</span>}
                <input
                  className="field-input" placeholder="Comentario (opcional)"
                  style={{ maxWidth: 220 }}
                  value={comentarios[s._id] || ""}
                  onChange={e => setComentarios(p => ({ ...p, [s._id]: e.target.value }))}
                />
                <button className="btn-ghost btn-ghost--accent" disabled={procesando === s._id}
                  onClick={() => resolver(s._id, "aprobada")}>
                  {procesando === s._id ? "…" : "Aprobar"}
                </button>
                <button className="btn-ghost" disabled={procesando === s._id}
                  onClick={() => resolver(s._id, "rechazada")}>
                  Rechazar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default VacacionesAprobacion;
