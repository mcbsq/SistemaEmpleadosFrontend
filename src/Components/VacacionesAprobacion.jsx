// Components/VacacionesAprobacion.jsx
// Cola de aprobación de vacaciones, en tarjetas. Doble visto bueno: el jefe
// directo (según la ficha laboral) y RH/Administración; la solicitud queda
// aprobada solo con ambos. El backend decide qué ve cada quien: el jefe, las
// de su equipo; RH, todas (ver api/vacaciones/logic.py).
// Cada tarjeta abre un pop-up para decidir (con comentario opcional) — la
// tarjeta solo muestra lo indispensable: quién, cuándo y cuántos días.
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiSun, FiX, FiCheck, FiUser, FiClock, FiMinus } from "react-icons/fi";
import { vacacionesService } from "../services/vacacionesService";
import { RecordCard } from "./RecordCard";
import Modal from "./Modal";
import IconButton from "./IconButton";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const partes = (f) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f || ""); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
const rango = (a, b) => {
  const x = partes(a), y = partes(b);
  if (!x || !y) return `${a} – ${b}`;
  return x.m === y.m && x.y === y.y ? `${x.d}–${y.d} ${MESES[x.m]} ${x.y}` : `${x.d} ${MESES[x.m]} – ${y.d} ${MESES[y.m]} ${y.y}`;
};

const ETAPAS = [
  { id: "jefe", label: "Jefe directo" },
  { id: "rh",   label: "RH" },
];
const ICONO_ETAPA = { aprobada: FiCheck, rechazada: FiX, pendiente: FiClock, no_aplica: FiMinus };

// Los dos vistos buenos como píldoras: verde = dado, ámbar = falta, gris = no aplica.
function Vistos({ aprobaciones = {} }) {
  return (
    <span className="vac-vistos">
      {ETAPAS.map(e => {
        const a = aprobaciones[e.id] || { estado: "pendiente" };
        const Icono = ICONO_ETAPA[a.estado] || FiClock;
        const nombre = e.id === "jefe" && a.jefe_nombre ? a.jefe_nombre : e.label;
        return (
          <span key={e.id} className={`vac-visto vac-visto--${a.estado}`}
            title={a.estado === "no_aplica" ? `${e.label}: no aplica` : `${nombre}: ${a.estado}`}>
            <Icono aria-hidden="true" />{e.label}
          </span>
        );
      })}
    </span>
  );
}

function VacacionesAprobacion() {
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autorizado, setAutorizado] = useState(true);
  const [abierta, setAbierta] = useState(null);
  const [comentario, setComentario] = useState("");
  const [procesando, setProcesando] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    setLoading(true);
    vacacionesService.getPendientes()
      .then(d => { setPendientes(Array.isArray(d) ? d : []); setAutorizado(true); })
      .catch(() => setAutorizado(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const resolver = async (estado) => {
    setProcesando(estado); setError("");
    try {
      await vacacionesService.actualizarEstado(abierta._id, estado, comentario);
      setAbierta(null);
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    } finally {
      setProcesando("");
    }
  };

  if (!autorizado) {
    return (
      <div className="cm-root">
        <p className="rc-empty">No tienes solicitudes de vacaciones por revisar. Aquí aparecen las de tu equipo directo cuando las pidan.</p>
      </div>
    );
  }

  return (
    <div className="cm-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiSun style={{ marginRight: 8, verticalAlign: "-3px" }} />Solicitudes de vacaciones</h2>
          <p className="hr-subtitle">Cada solicitud necesita el visto bueno del jefe directo y de RH. Toca una para dar el tuyo.</p>
        </div>
      </div>

      {loading ? (
        <div className="rc-grid">{[0, 1, 2].map(i => <div key={i} className="mo-skeleton" style={{ height: 84, borderRadius: 16 }} />)}</div>
      ) : pendientes.length === 0 ? (
        <p className="rc-empty"><FiCheckCircle style={{ marginRight: 6, verticalAlign: "-2px" }} />No hay solicitudes pendientes.</p>
      ) : (
        <div className="rc-grid mo-stagger">
          {pendientes.map(s => {
            const ini = partes(s.fecha_inicio);
            return (
              <RecordCard key={s._id} tono={(s.puedo_resolver || []).length ? "warning" : "accent"} onClick={() => { setAbierta(s); setComentario(""); setError(""); }}
                tile={<><span className="rc-tile-big">{ini?.d ?? "—"}</span><span className="rc-tile-small">{ini ? MESES[ini.m] : ""}</span></>}
                titulo={s.empleado_nombre || "Empleado"}
                badge={<span className="rc-badge rc-badge--warning">{s.dias_solicitados} {Number(s.dias_solicitados) === 1 ? "día" : "días"}</span>}
                meta={<><span>{rango(s.fecha_inicio, s.fecha_fin)}</span><Vistos aprobaciones={s.aprobaciones} /></>} />
            );
          })}
        </div>
      )}

      <Modal abierto={!!abierta} onClose={() => setAbierta(null)} titulo={abierta?.empleado_nombre || ""}
        subtitulo={abierta ? `${rango(abierta.fecha_inicio, abierta.fecha_fin)} · ${abierta.dias_solicitados} días` : undefined} error={error}>
        {abierta && (
          <>
            {abierta.motivo && <p className="cm-texto">Motivo: {abierta.motivo}</p>}
            <ol className="vac-pasos">
              {ETAPAS.map(e => {
                const a = (abierta.aprobaciones || {})[e.id] || { estado: "pendiente" };
                const Icono = ICONO_ETAPA[a.estado] || FiClock;
                const quien = e.id === "jefe" ? (a.jefe_nombre ? `Jefe directo · ${a.jefe_nombre}` : "Jefe directo") : "Recursos Humanos o Administración";
                const txt = { aprobada: `Dio su visto bueno${a.por ? ` (${a.por})` : ""}`, rechazada: "La rechazó", pendiente: "Falta su visto bueno", no_aplica: "No tiene jefe asignado, se salta" }[a.estado];
                return (
                  <li key={e.id} className={`vac-paso vac-paso--${a.estado}`}>
                    <span className="vac-paso-icono"><Icono aria-hidden="true" /></span>
                    <span><strong>{quien}</strong><small>{txt}</small></span>
                  </li>
                );
              })}
            </ol>
            <button type="button" className="link-btn" style={{ alignSelf: "flex-start", marginBottom: 12 }} onClick={() => navigate(`/Perfil/${abierta.empleado_id}?tab=vacaciones`)}>
              <FiUser aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />Ver su saldo y su historial
            </button>
            {(abierta.puedo_resolver || []).length > 0 && <div className="field-row">
              <label className="field-label" htmlFor="vac-coment">Comentario (opcional)</label>
              <textarea id="vac-coment" className="field-textarea" value={comentario} onChange={e => setComentario(e.target.value)}
                placeholder="Le llega junto con la respuesta" />
            </div>}
            {(abierta.puedo_resolver || []).length ? (
              <div className="icon-btn-group" style={{ justifyContent: "flex-end", width: "100%" }}>
                <IconButton accion="eliminar" icon={FiX} size="lg" label="Rechazar" busy={procesando === "rechazada"} disabled={!!procesando} onClick={() => resolver("rechazada")} />
                <IconButton accion="guardar" icon={FiCheck} size="lg" label="Dar mi visto bueno" busy={procesando === "aprobada"} disabled={!!procesando} tooltipPos="left" onClick={() => resolver("aprobada")} />
              </div>
            ) : (
              <p className="field-hint">Tu visto bueno ya quedó registrado. Falta el de la otra persona.</p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

export default VacacionesAprobacion;
