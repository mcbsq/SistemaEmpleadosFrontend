// src/Components/Desempeno.jsx
// Evaluaciones de desempeño: ciclos + autoevaluación + evaluación de jefe.
// Vista dual: ADMIN/SUPER_ADMIN gestionan ciclos y califican; cualquier
// empleado ve y llena su propia evaluación del ciclo activo.
import { confirmar } from "../services/dialogo";
import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { RecordCard } from "./RecordCard";
import IconButton from "./IconButton";
import { FiAward, FiCheckCircle, FiClock, FiStar, FiLock } from "react-icons/fi";
import { apiFetch } from "../services/apiConfig";
import { authService } from "../services/authService";
import "./Desempeno.css";

const ESTRELLAS = [1, 2, 3, 4, 5];

function EstrellasInput({ value, onChange, readOnly }) {
  return (
    <div className="des-estrellas">
      {ESTRELLAS.map(n => (
        <button
          key={n}
          type="button"
          className={`des-estrella ${value >= n ? "des-estrella--activa" : ""}`}
          onClick={() => !readOnly && onChange(n)}
          disabled={readOnly}
        aria-label={`${n} de 5`}><FiStar aria-hidden="true" /></button>
      ))}
    </div>
  );
}

// ── Criterios estándar de RH — mismo catálogo que valida el backend ────────
function useCriteriosCatalogo() {
  const [criterios, setCriterios] = useState([]);
  useEffect(() => {
    apiFetch("/desempeno/criterios").then(d => setCriterios(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  return criterios;
}

function criteriosAMapa(lista) {
  const mapa = {};
  (lista || []).forEach(c => { mapa[c.id] = c.puntaje; });
  return mapa;
}

function CriteriosInput({ catalogo, valores, onChange, readOnly }) {
  if (catalogo.length === 0) return null;
  return (
    <div className="des-criterios">
      {catalogo.map(c => (
        <div key={c.id} className="des-criterio-row">
          <span className="des-criterio-nombre">{c.nombre}</span>
          <EstrellasInput
            value={valores[c.id] || 0}
            readOnly={readOnly}
            onChange={n => onChange(c.id, n)}
          />
        </div>
      ))}
    </div>
  );
}

function VistaEmpleado() {
  const empleadoId = authService.getEmpleadoId();
  const catalogo = useCriteriosCatalogo();
  const [evalActiva, setEvalActiva] = useState(undefined);
  const [metas, setMetas] = useState([]);
  const [criterios, setCriterios] = useState({});
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!empleadoId) return;
    const data = await apiFetch(`/desempeno/empleado/${empleadoId}/activa`).catch(() => null);
    setEvalActiva(data);
    if (data) {
      setMetas(data.metas.length ? data.metas : [{ descripcion: "", cumplimiento: 0, comentario: "" }]);
      setCriterios(criteriosAMapa(data.autoevaluacion?.criterios));
      setComentario(data.autoevaluacion?.comentario || "");
    }
  }, [empleadoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const puntajeGeneral = (() => {
    const vals = Object.values(criterios).filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  })();

  const actualizarMeta = (i, campo, valor) => {
    setMetas(m => m.map((meta, idx) => idx === i ? { ...meta, [campo]: valor } : meta));
  };
  const agregarMeta = () => setMetas(m => [...m, { descripcion: "", cumplimiento: 0, comentario: "" }]);

  const calificarCriterio = (id, n) => setCriterios(c => ({ ...c, [id]: n }));

  const guardarTodo = async () => {
    setGuardando(true);
    try {
      const criteriosPayload = Object.entries(criterios)
        .filter(([, p]) => p > 0)
        .map(([id, puntaje]) => ({ id, puntaje }));
      await apiFetch(`/desempeno/evaluaciones/${evalActiva._id}/metas`, { method: "PUT", body: JSON.stringify({ metas }) });
      await apiFetch(`/desempeno/evaluaciones/${evalActiva._id}/autoevaluacion`, { method: "PUT", body: JSON.stringify({ criterios: criteriosPayload, comentario }) });
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  if (evalActiva === undefined) return <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>;
  if (!evalActiva) {
    return (
      <div className="orgs-monitor-empty">
        <span className="orgs-monitor-empty-icon"><FiAward /></span>
        <p>No hay un ciclo de evaluación activo en este momento.</p>
      </div>
    );
  }

  const completada = evalActiva.autoevaluacion?.completada;

  return (
    <div className="hr-card">
      <div className="hr-card-title">Mi evaluación de este ciclo</div>
      {completada && <p className="orgs-desc"><FiCheckCircle style={{ verticalAlign: "-2px", marginRight: 4 }} />Ya enviaste tu autoevaluación — puedes actualizarla mientras el ciclo siga activo.</p>}

      <p className="orgs-desc" style={{ marginTop: 10 }}>Metas del periodo</p>
      {metas.map((m, i) => (
        <div key={i} className="des-meta-row">
          <input className="orgs-input" placeholder="Descripción de la meta" value={m.descripcion} onChange={e => actualizarMeta(i, "descripcion", e.target.value)} />
          <input type="number" min="0" max="100" className="orgs-input" style={{ maxWidth: 90 }} value={m.cumplimiento} onChange={e => actualizarMeta(i, "cumplimiento", Number(e.target.value))} />
          <span className="orgs-desc">%</span>
        </div>
      ))}
      <IconButton accion="agregar" label="Agregar meta" onClick={agregarMeta} tooltipPos="right" />

      <div style={{ marginTop: 16 }}>
        <p className="orgs-desc">Autoevaluación por criterio</p>
        <CriteriosInput catalogo={catalogo} valores={criterios} onChange={calificarCriterio} />
        {puntajeGeneral > 0 && (
          <p className="orgs-desc" style={{ marginTop: 8 }}>Promedio general: <strong>{puntajeGeneral}/5</strong></p>
        )}
        <textarea className="orgs-input" style={{ marginTop: 8, minHeight: 70 }} placeholder="Comentarios sobre tu desempeño este periodo…" value={comentario} onChange={e => setComentario(e.target.value)} />
      </div>

      <IconButton accion="guardar" label="Guardar autoevaluación" busy={guardando} disabled={puntajeGeneral === 0}
        onClick={guardarTodo} style={{ marginTop: 14 }} tooltipPos="right" />

      {evalActiva.evaluacion_jefe?.completada && (
        <div className="hr-card" style={{ marginTop: 16, background: "var(--hr-bg)" }}>
          <div className="hr-card-title">Evaluación de tu jefe</div>
          {evalActiva.evaluacion_jefe.criterios?.length > 0 ? (
            <CriteriosInput catalogo={catalogo} valores={criteriosAMapa(evalActiva.evaluacion_jefe.criterios)} readOnly />
          ) : (
            <EstrellasInput value={evalActiva.evaluacion_jefe.puntaje} readOnly />
          )}
          <p className="orgs-desc" style={{ marginTop: 8 }}>Promedio: <strong>{evalActiva.evaluacion_jefe.puntaje}/5</strong></p>
          <p className="orgs-desc" style={{ marginTop: 8 }}>{evalActiva.evaluacion_jefe.comentario}</p>
        </div>
      )}
    </div>
  );
}

function VistaAdmin() {
  const catalogo = useCriteriosCatalogo();
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoCiclo, setNuevoCiclo] = useState(null);
  const [cicloActivo, setCicloActivo] = useState(null);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [editando, setEditando] = useState(null);
  const [criteriosJefe, setCriteriosJefe] = useState({});
  const [comentarioJefe, setComentarioJefe] = useState("");

  const cargarCiclos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/desempeno/ciclos").catch(() => []);
      setCiclos(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarCiclos(); }, [cargarCiclos]);

  const abrirCiclo = async (ciclo) => {
    setCicloActivo(ciclo);
    const data = await apiFetch(`/desempeno/ciclos/${ciclo._id}/evaluaciones`).catch(() => []);
    setEvaluaciones(Array.isArray(data) ? data : []);
  };

  const handleCrearCiclo = async () => {
    if (!nuevoCiclo.nombre.trim()) return;
    await apiFetch("/desempeno/ciclos", { method: "POST", body: JSON.stringify(nuevoCiclo) });
    setNuevoCiclo(null);
    cargarCiclos();
  };

  const handleCerrarCiclo = async (ciclo) => {
    if (!(await confirmar(`¿Cerrar el ciclo "${ciclo.nombre}"?`))) return;
    await apiFetch(`/desempeno/ciclos/${ciclo._id}/cerrar`, { method: "PATCH" });
    cargarCiclos();
    if (cicloActivo?._id === ciclo._id) setCicloActivo({ ...ciclo, estado: "cerrado" });
  };

  const abrirEvaluar = (ev) => {
    setEditando(ev);
    setCriteriosJefe(criteriosAMapa(ev.evaluacion_jefe?.criterios));
    setComentarioJefe(ev.evaluacion_jefe?.comentario || "");
  };

  const calificarCriterioJefe = (id, n) => setCriteriosJefe(c => ({ ...c, [id]: n }));

  const puntajeJefePromedio = (() => {
    const vals = Object.values(criteriosJefe).filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  })();

  const guardarEvaluacionJefe = async () => {
    const criteriosPayload = Object.entries(criteriosJefe)
      .filter(([, p]) => p > 0)
      .map(([id, puntaje]) => ({ id, puntaje }));
    await apiFetch(`/desempeno/evaluaciones/${editando._id}/jefe`, { method: "PUT", body: JSON.stringify({ criterios: criteriosPayload, comentario: comentarioJefe }) });
    setEditando(null);
    abrirCiclo(cicloActivo);
  };

  if (cicloActivo) {
    return (
      <div>
        <IconButton accion="volver" label="Volver a ciclos" tooltipPos="right" onClick={() => setCicloActivo(null)} />
        <h3 className="hr-card-title" style={{ marginTop: 10 }}>{cicloActivo.nombre}</h3>
        <div className="rc-grid mo-stagger" style={{ marginTop: 10 }}>
          {evaluaciones.map(ev => {
            const jefe = ev.evaluacion_jefe.completada;
            const auto = ev.autoevaluacion.completada;
            const tono = jefe ? "success" : auto ? "accent" : "warning";
            return (
              <RecordCard key={ev._id} tono={tono} onClick={() => abrirEvaluar(ev)}
                tile={jefe ? <><span className="rc-tile-big">{ev.evaluacion_jefe.puntaje}</span><span className="rc-tile-small">de 5</span></> : <FiClock />}
                titulo={ev.empleado_nombre}
                badge={<span className={`rc-badge rc-badge--${tono}`}>{jefe ? "Evaluado" : auto ? "Autoeval. lista" : "Pendiente"}</span>}
                meta={<span>{jefe ? `Jefe: ${ev.evaluacion_jefe.puntaje}/5` : "Sin evaluación de jefe"}{auto ? ` · Autoeval.: ${ev.autoevaluacion.puntaje}/5` : ""}</span>} />
            );
          })}
        </div>

        <Modal abierto={!!editando} onClose={() => setEditando(null)} titulo={editando ? `Evaluar a ${editando.empleado_nombre}` : ""}
          onGuardar={guardarEvaluacionJefe} labelGuardar="Guardar evaluación" puedeGuardar={puntajeJefePromedio > 0} ancho={620}>
          {editando && (<>
            {editando.autoevaluacion.completada ? (
              <p className="orgs-desc">Autoevaluación: {editando.autoevaluacion.puntaje}/5 — "{editando.autoevaluacion.comentario}"</p>
            ) : (
              <p className="orgs-desc">Este empleado aún no ha llenado su autoevaluación.</p>
            )}
            <p className="orgs-desc" style={{ marginTop: 10 }}>Tu evaluación por criterio</p>
            <CriteriosInput catalogo={catalogo} valores={criteriosJefe} onChange={calificarCriterioJefe} />
            {puntajeJefePromedio > 0 && (
              <p className="orgs-desc" style={{ marginTop: 8 }}>Promedio general: <strong>{puntajeJefePromedio}/5</strong></p>
            )}
            <textarea className="orgs-input" style={{ marginTop: 8, minHeight: 70 }} value={comentarioJefe} onChange={e => setComentarioJefe(e.target.value)} placeholder="Comentarios del jefe…" aria-label="Comentarios del jefe" />
          </>)}
        </Modal>
      </div>
    );
  }

  return (
    <div>
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiAward style={{ marginRight: 8, verticalAlign: "-3px" }} />Evaluaciones de desempeño</h2>
          <p className="hr-subtitle">Ciclos de evaluación. Toca uno para calificar a cada persona.</p>
        </div>
        <IconButton accion="agregar" size="lg" label="Nuevo ciclo de evaluación" tooltipPos="left"
          onClick={() => setNuevoCiclo({ nombre: "", fecha_inicio: "", fecha_fin: "" })} />
      </div>

      <Modal abierto={!!nuevoCiclo} onClose={() => setNuevoCiclo(null)} titulo="Nuevo ciclo de evaluación"
        subtitulo="Al crearlo se genera una evaluación vacía para cada empleado activo."
        onGuardar={handleCrearCiclo} labelGuardar="Crear ciclo"
        puedeGuardar={!!(nuevoCiclo?.nombre?.trim() && nuevoCiclo?.fecha_inicio && nuevoCiclo?.fecha_fin)}>
        {nuevoCiclo && (<>
          <input className="orgs-input" placeholder="Nombre (ej. Q3 2026)" aria-label="Nombre del ciclo" value={nuevoCiclo.nombre} onChange={e => setNuevoCiclo(c => ({ ...c, nombre: e.target.value }))} style={{ marginBottom: 8 }} />
          <div className="orgs-color-row">
            <input type="date" className="orgs-input" aria-label="Inicio" value={nuevoCiclo.fecha_inicio} onChange={e => setNuevoCiclo(c => ({ ...c, fecha_inicio: e.target.value }))} />
            <input type="date" className="orgs-input" aria-label="Fin" value={nuevoCiclo.fecha_fin} onChange={e => setNuevoCiclo(c => ({ ...c, fecha_fin: e.target.value }))} />
          </div>
        </>)}
      </Modal>

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : ciclos.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiAward /></span>
          <p>Sin ciclos de evaluación creados todavía</p>
        </div>
      ) : (
        <div className="rc-grid mo-stagger">
          {ciclos.map(c => {
            const activo = c.estado === "activo";
            return (
              <RecordCard key={c._id} tono={activo ? "success" : "danger"} onClick={() => abrirCiclo(c)}
                tile={<FiAward />} titulo={c.nombre}
                badge={<span className={`rc-badge rc-badge--${activo ? "success" : "danger"}`}>{activo ? "Activo" : "Cerrado"}</span>}
                meta={<span>{c.fecha_inicio} – {c.fecha_fin}</span>}
                acciones={activo ? <IconButton icon={FiLock} label="Cerrar ciclo" tooltipPos="left" onClick={() => handleCerrarCiclo(c)} /> : undefined} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Desempeno() {
  const isAdmin = authService.isAdmin();
  return (
    <div className="orgs-root">
      {isAdmin ? <VistaAdmin /> : <VistaEmpleado />}
    </div>
  );
}

export default Desempeno;
