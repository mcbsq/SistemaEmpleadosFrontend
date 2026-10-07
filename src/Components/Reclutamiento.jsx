// src/Components/Reclutamiento.jsx
// Vacantes + candidatos con pipeline por etapas — patrón simplificado de
// sistemas de mercado (Greenhouse/BambooHR). Solo ADMIN/SUPER_ADMIN.
import { confirmar } from "../services/dialogo";
import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import IconButton from "./IconButton";
import { RecordCard } from "./RecordCard";
import { FiBriefcase, FiTrash2, FiUser, FiStar, FiLock, FiUnlock, FiMail, FiPhone } from "react-icons/fi";
import { apiFetch } from "../services/apiConfig";
import "./Reclutamiento.css";

const ESTRELLAS = [1, 2, 3, 4, 5];

function EstrellasMini({ value, onChange }) {
  return (
    <div className="recl-estrellas">
      {ESTRELLAS.map(n => (
        <button key={n} type="button" className={`recl-estrella ${value >= n ? "recl-estrella--activa" : ""}`}
          onClick={() => onChange(n)}><FiStar /></button>
      ))}
    </div>
  );
}

const ETAPAS = [
  { id: "aplicado",   label: "Aplicado" },
  { id: "entrevista", label: "Entrevista" },
  { id: "oferta",     label: "Oferta" },
  { id: "contratado", label: "Contratado" },
  { id: "rechazado",  label: "Rechazado" },
];

const VACANTE_INIT = { titulo: "", departamento: "", descripcion: "", requisitos: "", ubicacion: "", tipo_contrato: "tiempo_completo" };
const CANDIDATO_INIT = { nombre: "", email: "", telefono: "", notas: "" };

function Reclutamiento() {
  const [vacantes, setVacantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevaVacante, setNuevaVacante] = useState(null);
  const [creando, setCreando] = useState(false);

  const [vacanteActiva, setVacanteActiva] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [nuevoCandidato, setNuevoCandidato] = useState(null);
  const [criteriosCatalogo, setCriteriosCatalogo] = useState([]);
  const [evaluando, setEvaluando] = useState(null);
  const [criteriosVals, setCriteriosVals] = useState({});

  useEffect(() => {
    apiFetch("/reclutamiento/criterios").then(d => setCriteriosCatalogo(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const cargarVacantes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/vacantes").catch(() => []);
      setVacantes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarVacantes(); }, [cargarVacantes]);

  const cargarCandidatos = useCallback(async (vacanteId) => {
    const data = await apiFetch(`/vacantes/${vacanteId}/candidatos`).catch(() => []);
    setCandidatos(Array.isArray(data) ? data : []);
  }, []);

  const abrirVacante = (v) => {
    setVacanteActiva(v);
    cargarCandidatos(v._id);
  };

  const handleCrearVacante = async () => {
    if (!nuevaVacante.titulo.trim()) return;
    setCreando(true);
    try {
      await apiFetch("/vacantes", { method: "POST", body: JSON.stringify(nuevaVacante) });
      setNuevaVacante(null);
      cargarVacantes();
    } finally {
      setCreando(false);
    }
  };

  const handleCerrarVacante = async (v) => {
    await apiFetch(`/vacantes/${v._id}`, { method: "PATCH", body: JSON.stringify({ estado: v.estado === "abierta" ? "cerrada" : "abierta" }) });
    cargarVacantes();
    if (vacanteActiva?._id === v._id) setVacanteActiva({ ...v, estado: v.estado === "abierta" ? "cerrada" : "abierta" });
  };

  const handleEliminarVacante = async (v) => {
    if (!(await confirmar(`¿Eliminar la vacante "${v.titulo}" y sus candidatos?`))) return;
    await apiFetch(`/vacantes/${v._id}`, { method: "DELETE" });
    if (vacanteActiva?._id === v._id) setVacanteActiva(null);
    cargarVacantes();
  };

  const handleCrearCandidato = async () => {
    if (!nuevoCandidato.nombre.trim()) return;
    await apiFetch(`/vacantes/${vacanteActiva._id}/candidatos`, { method: "POST", body: JSON.stringify(nuevoCandidato) });
    setNuevoCandidato(null);
    cargarCandidatos(vacanteActiva._id);
    cargarVacantes();
  };

  const handleMoverEtapa = async (candidato, etapa) => {
    await apiFetch(`/candidatos/${candidato._id}/etapa`, { method: "PATCH", body: JSON.stringify({ etapa }) });
    setEvaluando(c => (c && c._id === candidato._id ? { ...c, etapa } : c));
    cargarCandidatos(vacanteActiva._id);
  };

  const handleEliminarCandidato = async (candidato) => {
    if (!(await confirmar(`¿Quitar a ${candidato.nombre} de esta vacante?`))) return;
    await apiFetch(`/candidatos/${candidato._id}`, { method: "DELETE" });
    cargarCandidatos(vacanteActiva._id);
    cargarVacantes();
    setEvaluando(null);
  };

  const abrirEvaluar = (candidato) => {
    setEvaluando(candidato);
    const vals = {};
    (candidato.criterios || []).forEach(c => { vals[c.id] = c.puntaje; });
    setCriteriosVals(vals);
  };

  const guardarEvaluacion = async () => {
    const criterios = Object.entries(criteriosVals).filter(([, p]) => p > 0).map(([id, puntaje]) => ({ id, puntaje }));
    await apiFetch(`/candidatos/${evaluando._id}/evaluar`, { method: "PUT", body: JSON.stringify({ criterios }) });
    setEvaluando(null);
    cargarCandidatos(vacanteActiva._id);
  };

  if (vacanteActiva) {
    return (
      <div className="orgs-root">
        <div className="hr-page-header">
          <div>
            <IconButton accion="volver" label="Volver a vacantes" tooltipPos="right" onClick={() => setVacanteActiva(null)} />
            <h2 className="hr-title" style={{ marginTop: 10 }}>{vacanteActiva.titulo}</h2>
            <p className="hr-subtitle">{vacanteActiva.departamento} · {vacanteActiva.ubicacion} · {vacanteActiva.estado}</p>
          </div>
          <IconButton accion="agregar" size="lg" label="Agregar candidato" tooltipPos="left" onClick={() => setNuevoCandidato({ ...CANDIDATO_INIT })} />
        </div>

        <Modal abierto={!!nuevoCandidato} onClose={() => setNuevoCandidato(null)} titulo="Nuevo candidato"
          onGuardar={handleCrearCandidato} labelGuardar="Guardar candidato" puedeGuardar={!!nuevoCandidato?.nombre?.trim()}>
          {nuevoCandidato && (<>
            <input className="orgs-input" placeholder="Nombre" aria-label="Nombre" value={nuevoCandidato.nombre} onChange={e => setNuevoCandidato(c => ({ ...c, nombre: e.target.value }))} style={{ marginBottom: 8 }} />
            <input className="orgs-input" placeholder="Email" aria-label="Email" value={nuevoCandidato.email} onChange={e => setNuevoCandidato(c => ({ ...c, email: e.target.value }))} style={{ marginBottom: 8 }} />
            <input className="orgs-input" placeholder="Teléfono" aria-label="Teléfono" value={nuevoCandidato.telefono} onChange={e => setNuevoCandidato(c => ({ ...c, telefono: e.target.value }))} style={{ marginBottom: 8 }} />
            <textarea className="orgs-input" placeholder="Notas" aria-label="Notas" value={nuevoCandidato.notas} onChange={e => setNuevoCandidato(c => ({ ...c, notas: e.target.value }))} style={{ minHeight: 80 }} />
          </>)}
        </Modal>

        <div className="recl-pipeline">
          {ETAPAS.map(etapa => (
            <div key={etapa.id} className="recl-columna">
              <div className="recl-columna-header">{etapa.label} ({candidatos.filter(c => c.etapa === etapa.id).length})</div>
              {candidatos.filter(c => c.etapa === etapa.id).map(c => (
                <button key={c._id} type="button" className="recl-card" onClick={() => abrirEvaluar(c)}>
                  <span className="recl-card-nombre"><FiUser aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />{c.nombre}</span>
                  {c.email && <span className="recl-card-detalle">{c.email}</span>}
                  {c.puntaje_promedio != null && (
                    <span className="recl-card-score"><FiStar aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 3 }} />{c.puntaje_promedio}/5</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <Modal abierto={!!evaluando} onClose={() => setEvaluando(null)} titulo={evaluando?.nombre || ""}
          subtitulo={evaluando ? `Candidato a ${vacanteActiva.titulo}` : undefined}
          onGuardar={guardarEvaluacion} labelGuardar="Guardar scorecard">
          {evaluando && (<>
            {(evaluando.email || evaluando.telefono) && (
              <p className="cm-texto recl-contacto">
                {evaluando.email && <span><FiMail aria-hidden="true" />{evaluando.email}</span>}
                {evaluando.telefono && <span><FiPhone aria-hidden="true" />{evaluando.telefono}</span>}
              </p>
            )}
            {evaluando.notas && <p className="cm-texto">{evaluando.notas}</p>}
            <span className="field-label">Etapa</span>
            <div className="mdl-chips" role="radiogroup" aria-label="Etapa" style={{ marginBottom: 14 }}>
              {ETAPAS.map(e => (
                <button key={e.id} type="button" role="radio" aria-checked={evaluando.etapa === e.id}
                  className={`rc-chip${evaluando.etapa === e.id ? " is-on" : ""}`} onClick={() => handleMoverEtapa(evaluando, e.id)}>{e.label}</button>
              ))}
            </div>
            <span className="field-label">Scorecard</span>
            <div className="des-criterios">
              {criteriosCatalogo.map(cr => (
                <div key={cr.id} className="des-criterio-row">
                  <span className="des-criterio-nombre">{cr.nombre}</span>
                  <EstrellasMini value={criteriosVals[cr.id] || 0} onChange={n => setCriteriosVals(v => ({ ...v, [cr.id]: n }))} />
                </div>
              ))}
            </div>
            <div className="icon-btn-group" style={{ justifyContent: "flex-start", marginTop: 14 }}>
              <IconButton accion="eliminar" icon={FiTrash2} label="Quitar candidato" onClick={() => handleEliminarCandidato(evaluando)} />
            </div>
          </>)}
        </Modal>
      </div>
    );
  }

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiBriefcase style={{ marginRight: 8, verticalAlign: "-3px" }} />Reclutamiento</h2>
          <p className="hr-subtitle">Vacantes y candidatos por etapa. Toca una vacante para ver su pipeline.</p>
        </div>
        <IconButton accion="agregar" size="lg" label="Nueva vacante" tooltipPos="left" onClick={() => setNuevaVacante({ ...VACANTE_INIT })} />
      </div>

      <Modal abierto={!!nuevaVacante} onClose={() => setNuevaVacante(null)} titulo="Nueva vacante"
        onGuardar={handleCrearVacante} labelGuardar="Crear vacante" guardando={creando} puedeGuardar={!!nuevaVacante?.titulo?.trim()}>
        {nuevaVacante && (<>
          <input className="orgs-input" placeholder="Título del puesto" aria-label="Título del puesto" value={nuevaVacante.titulo} onChange={e => setNuevaVacante(v => ({ ...v, titulo: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="orgs-input" placeholder="Departamento" aria-label="Departamento" value={nuevaVacante.departamento} onChange={e => setNuevaVacante(v => ({ ...v, departamento: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="orgs-input" placeholder="Ubicación" aria-label="Ubicación" value={nuevaVacante.ubicacion} onChange={e => setNuevaVacante(v => ({ ...v, ubicacion: e.target.value }))} style={{ marginBottom: 8 }} />
          <textarea className="orgs-input" placeholder="Descripción" aria-label="Descripción" value={nuevaVacante.descripcion} onChange={e => setNuevaVacante(v => ({ ...v, descripcion: e.target.value }))} style={{ marginBottom: 8, minHeight: 70 }} />
          <textarea className="orgs-input" placeholder="Requisitos" aria-label="Requisitos" value={nuevaVacante.requisitos} onChange={e => setNuevaVacante(v => ({ ...v, requisitos: e.target.value }))} style={{ minHeight: 70 }} />
        </>)}
      </Modal>

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : vacantes.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiBriefcase /></span>
          <p>Sin vacantes creadas todavía</p>
        </div>
      ) : (
        <div className="rc-grid mo-stagger">
          {vacantes.map(v => {
            const abierta = v.estado === "abierta";
            return (
              <RecordCard key={v._id} tono={abierta ? "success" : "danger"} onClick={() => abrirVacante(v)}
                tile={<><span className="rc-tile-big">{v.candidatos_count || 0}</span><span className="rc-tile-small">cand.</span></>}
                titulo={v.titulo}
                badge={<span className={`rc-badge rc-badge--${abierta ? "success" : "danger"}`}>{abierta ? "Abierta" : "Cerrada"}</span>}
                meta={<>{v.departamento && <span>{v.departamento}</span>}{v.ubicacion && <span>{v.ubicacion}</span>}</>}
                acciones={<>
                  <IconButton icon={abierta ? FiLock : FiUnlock} label={abierta ? "Cerrar vacante" : "Reabrir vacante"} onClick={() => handleCerrarVacante(v)} />
                  <IconButton accion="eliminar" icon={FiTrash2} label="Eliminar vacante" tooltipPos="left" onClick={() => handleEliminarVacante(v)} />
                </>} />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Reclutamiento;
