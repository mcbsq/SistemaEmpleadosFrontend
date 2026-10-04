// src/Components/SolicitudesRH.jsx
// Las dos caras del canal empleado ↔ RH:
//   <MisSolicitudes />  pestaña "Solicitudes" del propio perfil.
//   <BandejaRH />       pantalla /solicitudes de RH: todo lo que llega,
//                       filtrable por estado, con respuesta y cambio de estado.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiInbox, FiMessageSquare, FiUser, FiSearch, FiSend } from "react-icons/fi";
import Modal from "./Modal";
import IconButton from "./IconButton";
import { RecordCard } from "./RecordCard";
import {
  solicitudesRhService, ESTADOS_SOLICITUD, SECCIONES_SOLICITUD, abrirContactoRH, SOLICITUD_RH_CREADA,
} from "../services/solicitudesRhService";
import "./SolicitudesRH.css";

const fechaCorta = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
};
const seccionLabel = (v) => SECCIONES_SOLICITUD.find(s => s.value === v)?.label || "Otro tema";
const estadoDe = (e) => ESTADOS_SOLICITUD[e] || ESTADOS_SOLICITUD.abierta;

// Hilo de la solicitud: mensaje original + respuestas de RH.
function Hilo({ sol }) {
  return (
    <div className="srh-hilo">
      <div className="srh-msg srh-msg--empleado">
        <span className="srh-msg-autor">{sol.empleado_nombre || "Empleado"} · {fechaCorta(sol.creado_en)}</span>
        <p>{sol.mensaje}</p>
      </div>
      {sol.respuestas.map((r, i) => (
        <div key={i} className="srh-msg srh-msg--rh">
          <span className="srh-msg-autor">Recursos Humanos · {fechaCorta(r.fecha)}</span>
          <p>{r.texto}</p>
        </div>
      ))}
    </div>
  );
}

function TarjetaSolicitud({ sol, mostrarEmpleado, onClick }) {
  const est = estadoDe(sol.estado);
  return (
    <RecordCard tono={est.tono} onClick={onClick}
      tile={mostrarEmpleado ? <span className="rc-tile-big">{(sol.empleado_nombre || "?").split(" ").slice(0, 2).map(x => x[0]).join("").toUpperCase()}</span> : <FiMessageSquare />}
      titulo={mostrarEmpleado ? sol.empleado_nombre : sol.asunto}
      badge={<span className={`rc-badge rc-badge--${est.tono}`}>{est.label}</span>}
      meta={<>
        {mostrarEmpleado && <span>{sol.asunto}</span>}
        <span>{seccionLabel(sol.seccion)}</span>
        <span>{fechaCorta(sol.creado_en)}</span>
        {sol.respuestas.length > 0 && <span>{sol.respuestas.length} {sol.respuestas.length === 1 ? "respuesta" : "respuestas"}</span>}
      </>}
    />
  );
}

// ── Pestaña "Solicitudes" del perfil propio ─────────────────────────────────
export function MisSolicitudes() {
  const [lista, setLista] = useState(null);
  const [viendo, setViendo] = useState(null);

  const cargar = useCallback(() => {
    solicitudesRhService.mias().then(setLista).catch(() => setLista([]));
  }, []);
  useEffect(() => {
    cargar();
    window.addEventListener(SOLICITUD_RH_CREADA, cargar);
    return () => window.removeEventListener(SOLICITUD_RH_CREADA, cargar);
  }, [cargar]);

  return (
    <div className="section-inner">
      <div className="rc-section-head">
        <h3 className="section-title">Mis solicitudes a RH</h3>
        <IconButton icon={FiMessageSquare} tone="add" label="Escribir a RH" tooltipPos="left" onClick={() => abrirContactoRH()} />
      </div>
      {lista === null ? (
        <div className="rc-grid">{[0, 1].map(i => <div key={i} className="mo-skeleton" style={{ height: 84, borderRadius: 16 }} />)}</div>
      ) : lista.length === 0 ? (
        <p className="rc-empty">No has escrito a RH. Si un dato está mal o necesitas una constancia, escríbeles desde aquí.</p>
      ) : (
        <div className="rc-grid mo-stagger">
          {lista.map(s => <TarjetaSolicitud key={s._id} sol={s} onClick={() => setViendo(s)} />)}
        </div>
      )}
      <Modal abierto={!!viendo} onClose={() => setViendo(null)} titulo={viendo?.asunto || ""}
        subtitulo={viendo ? `${seccionLabel(viendo.seccion)} · ${estadoDe(viendo.estado).label}` : undefined}>
        {viendo && <Hilo sol={viendo} />}
        {viendo && viendo.respuestas.length === 0 && <p className="field-hint">RH aún no responde. Te llegará un aviso a la campana cuando lo haga.</p>}
      </Modal>
    </div>
  );
}

// ── Bandeja de RH (/solicitudes) ────────────────────────────────────────────
export default function BandejaRH() {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [estado, setEstado] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    solicitudesRhService.todas().then(setLista).catch(() => setLista([]));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const conteo = useMemo(() => (lista || []).reduce((acc, s) => {
    acc[s.estado] = (acc[s.estado] || 0) + 1; return acc;
  }, {}), [lista]);
  const pendientes = (conteo.abierta || 0) + (conteo.en_proceso || 0);

  const visibles = (lista || [])
    .filter(s => filtro === "todas" || (filtro === "pendientes" ? ["abierta", "en_proceso"].includes(s.estado) : s.estado === filtro))
    .filter(s => !busqueda.trim() || `${s.empleado_nombre} ${s.asunto} ${s.mensaje}`.toLowerCase().includes(busqueda.toLowerCase()));

  const abrir = (s) => { setAbierta(s); setRespuesta(""); setEstado(s.estado === "abierta" ? "en_proceso" : s.estado); setError(""); };
  const guardar = async () => {
    setGuardando(true); setError("");
    try {
      const act = await solicitudesRhService.responder(abierta._id, { estado, respuesta });
      setLista(l => l.map(x => (x._id === act._id ? act : x)));
      setAbierta(null);
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const FILTROS = [
    ["pendientes", "Pendientes", pendientes],
    ["resuelta", "Resueltas", conteo.resuelta || 0],
    ["rechazada", "No proceden", conteo.rechazada || 0],
    ["todas", "Todas", (lista || []).length],
  ];

  return (
    <div className="orgs-root srh-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiInbox style={{ marginRight: 8, verticalAlign: "-3px" }} />Solicitudes a RH</h2>
          <p className="hr-subtitle">Lo que los empleados piden desde su perfil: correcciones, constancias y dudas.</p>
        </div>
      </div>

      <div className="rc-filtros">
        <div className="rc-chips" role="group" aria-label="Filtrar solicitudes">
          {FILTROS.map(([k, label, n]) => (
            <button key={k} type="button" className={`rc-chip${filtro === k ? " is-on" : ""}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              {label}<span>{n}</span>
            </button>
          ))}
        </div>
        <label className="srh-buscar">
          <FiSearch aria-hidden="true" />
          <input type="text" placeholder="Buscar por nombre o asunto" value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar solicitudes" />
        </label>
      </div>

      {lista === null ? (
        <div className="rc-grid">{[0, 1, 2].map(i => <div key={i} className="mo-skeleton" style={{ height: 84, borderRadius: 16 }} />)}</div>
      ) : visibles.length === 0 ? (
        <p className="rc-empty">{filtro === "pendientes" ? "No hay solicitudes pendientes. Todo al día." : "No hay solicitudes con ese filtro."}</p>
      ) : (
        <div className="rc-grid mo-stagger">
          {visibles.map(s => <TarjetaSolicitud key={s._id} sol={s} mostrarEmpleado onClick={() => abrir(s)} />)}
        </div>
      )}

      <Modal abierto={!!abierta} onClose={() => setAbierta(null)} ancho={620}
        titulo={abierta ? `${abierta.empleado_nombre} · ${abierta.asunto}` : ""}
        subtitulo={abierta ? `${seccionLabel(abierta.seccion)} · ${fechaCorta(abierta.creado_en)}` : undefined}
        onGuardar={guardar} guardando={guardando} labelGuardar={respuesta.trim() ? "Responder" : "Actualizar estado"}
        iconGuardar={respuesta.trim() ? FiSend : undefined} error={error}
        puedeGuardar={!!(abierta && (respuesta.trim() || estado !== abierta.estado))}>
        {abierta && (
          <>
            <Hilo sol={abierta} />
            <Link className="srh-perfil-link" to={`/Perfil/${abierta.empleado_id}`} onClick={() => setAbierta(null)}>
              <FiUser aria-hidden="true" />Abrir el perfil de {abierta.empleado_nombre}
            </Link>
            <div className="field-row">
              <label className="field-label" htmlFor="srh-resp">Respuesta</label>
              <textarea id="srh-resp" className="field-textarea" maxLength={2000} value={respuesta}
                placeholder="Lo que le escribas aquí le llega como aviso" onChange={e => setRespuesta(e.target.value)} />
            </div>
            <span className="field-label">Estado</span>
            <div className="mdl-chips" role="radiogroup" aria-label="Estado">
              {Object.entries(ESTADOS_SOLICITUD).map(([k, v]) => (
                <button key={k} type="button" role="radio" aria-checked={estado === k}
                  className={`rc-chip${estado === k ? " is-on" : ""}`} onClick={() => setEstado(k)}>{v.label}</button>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
