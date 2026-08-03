// src/Components/Reclutamiento.jsx
// Vacantes + candidatos con pipeline por etapas — patrón simplificado de
// sistemas de mercado (Greenhouse/BambooHR). Solo ADMIN/SUPER_ADMIN.
import React, { useState, useEffect, useCallback } from "react";
import { FiBriefcase, FiPlus, FiX, FiTrash2, FiUser, FiStar } from "react-icons/fi";
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
    cargarCandidatos(vacanteActiva._id);
  };

  const handleEliminarCandidato = async (candidato) => {
    await apiFetch(`/candidatos/${candidato._id}`, { method: "DELETE" });
    cargarCandidatos(vacanteActiva._id);
    cargarVacantes();
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
            <button className="orgs-refresh-btn" onClick={() => setVacanteActiva(null)}>← Vacantes</button>
            <h2 className="hr-title" style={{ marginTop: 10 }}>{vacanteActiva.titulo}</h2>
            <p className="hr-subtitle">{vacanteActiva.departamento} · {vacanteActiva.ubicacion} · {vacanteActiva.estado}</p>
          </div>
          <button className="orgs-save-btn" onClick={() => setNuevoCandidato({ ...CANDIDATO_INIT })}>
            <FiPlus style={{ verticalAlign: "-2px", marginRight: 4 }} />Agregar candidato
          </button>
        </div>

        {nuevoCandidato && (
          <div className="hr-card" style={{ marginBottom: 16 }}>
            <div className="hr-card-title">Nuevo candidato</div>
            <input className="orgs-input" placeholder="Nombre" value={nuevoCandidato.nombre} onChange={e => setNuevoCandidato(c => ({ ...c, nombre: e.target.value }))} style={{ marginBottom: 8 }} />
            <input className="orgs-input" placeholder="Email" value={nuevoCandidato.email} onChange={e => setNuevoCandidato(c => ({ ...c, email: e.target.value }))} style={{ marginBottom: 8 }} />
            <input className="orgs-input" placeholder="Teléfono" value={nuevoCandidato.telefono} onChange={e => setNuevoCandidato(c => ({ ...c, telefono: e.target.value }))} style={{ marginBottom: 8 }} />
            <textarea className="orgs-input" placeholder="Notas" value={nuevoCandidato.notas} onChange={e => setNuevoCandidato(c => ({ ...c, notas: e.target.value }))} style={{ marginBottom: 8, minHeight: 60 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="orgs-save-btn" onClick={handleCrearCandidato}>Guardar</button>
              <button className="orgs-refresh-btn" onClick={() => setNuevoCandidato(null)}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="recl-pipeline">
          {ETAPAS.map(etapa => (
            <div key={etapa.id} className="recl-columna">
              <div className="recl-columna-header">{etapa.label} ({candidatos.filter(c => c.etapa === etapa.id).length})</div>
              {candidatos.filter(c => c.etapa === etapa.id).map(c => (
                <div key={c._id} className="recl-card">
                  <div className="recl-card-nombre"><FiUser style={{ verticalAlign: "-2px", marginRight: 4 }} />{c.nombre}</div>
                  {c.email && <div className="recl-card-detalle">{c.email}</div>}
                  {c.telefono && <div className="recl-card-detalle">{c.telefono}</div>}
                  {c.puntaje_promedio != null && (
                    <div className="recl-card-score"><FiStar style={{ verticalAlign: "-2px", marginRight: 3 }} />{c.puntaje_promedio}/5</div>
                  )}
                  <select className="orgs-input recl-etapa-select" value={c.etapa} onChange={e => handleMoverEtapa(c, e.target.value)}>
                    {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button className="orgs-refresh-btn" onClick={() => abrirEvaluar(c)}>
                      <FiStar style={{ verticalAlign: "-2px", marginRight: 4 }} />Evaluar
                    </button>
                    <button className="orgs-refresh-btn" onClick={() => handleEliminarCandidato(c)}>
                      <FiTrash2 style={{ verticalAlign: "-2px" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {evaluando && (
          <div className="recl-modal-overlay" onClick={() => setEvaluando(null)}>
            <div className="hr-card recl-modal" onClick={e => e.stopPropagation()}>
              <div className="hr-card-title">Scorecard — {evaluando.nombre}</div>
              <p className="orgs-desc">Criterios estándar de evaluación de candidatos.</p>
              <div className="des-criterios" style={{ marginTop: 10 }}>
                {criteriosCatalogo.map(cr => (
                  <div key={cr.id} className="des-criterio-row">
                    <span className="des-criterio-nombre">{cr.nombre}</span>
                    <EstrellasMini value={criteriosVals[cr.id] || 0} onChange={n => setCriteriosVals(v => ({ ...v, [cr.id]: n }))} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="orgs-save-btn" onClick={guardarEvaluacion}>Guardar</button>
                <button className="orgs-refresh-btn" onClick={() => setEvaluando(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiBriefcase style={{ marginRight: 8, verticalAlign: "-3px" }} />Reclutamiento</h2>
          <p className="hr-subtitle">Vacantes y pipeline de candidatos · ADMIN / SUPER_ADMIN</p>
        </div>
        <button className="orgs-save-btn" onClick={() => setNuevaVacante({ ...VACANTE_INIT })}>
          <FiPlus style={{ verticalAlign: "-2px", marginRight: 4 }} />Nueva vacante
        </button>
      </div>

      {nuevaVacante && (
        <div className="hr-card" style={{ marginBottom: 16 }}>
          <div className="hr-card-title">Nueva vacante</div>
          <input className="orgs-input" placeholder="Título del puesto" value={nuevaVacante.titulo} onChange={e => setNuevaVacante(v => ({ ...v, titulo: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="orgs-input" placeholder="Departamento" value={nuevaVacante.departamento} onChange={e => setNuevaVacante(v => ({ ...v, departamento: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="orgs-input" placeholder="Ubicación" value={nuevaVacante.ubicacion} onChange={e => setNuevaVacante(v => ({ ...v, ubicacion: e.target.value }))} style={{ marginBottom: 8 }} />
          <textarea className="orgs-input" placeholder="Descripción" value={nuevaVacante.descripcion} onChange={e => setNuevaVacante(v => ({ ...v, descripcion: e.target.value }))} style={{ marginBottom: 8, minHeight: 60 }} />
          <textarea className="orgs-input" placeholder="Requisitos" value={nuevaVacante.requisitos} onChange={e => setNuevaVacante(v => ({ ...v, requisitos: e.target.value }))} style={{ marginBottom: 8, minHeight: 60 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="orgs-save-btn" onClick={handleCrearVacante} disabled={creando}>{creando ? "Creando…" : "Crear vacante"}</button>
            <button className="orgs-refresh-btn" onClick={() => setNuevaVacante(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : vacantes.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiBriefcase /></span>
          <p>Sin vacantes creadas todavía</p>
        </div>
      ) : (
        <div className="orgs-incident-list">
          {vacantes.map(v => (
            <div key={v._id} className="orgs-incident-row" style={{ cursor: "pointer" }} onClick={() => abrirVacante(v)}>
              <span className={`orgs-sev-badge ${v.estado === "abierta" ? "orgs-sev--info" : "orgs-sev--error"}`}>{v.estado}</span>
              <div className="orgs-incident-info">
                <span className="orgs-incident-msg">{v.titulo}</span>
                <span className="orgs-incident-meta">
                  <span>{v.departamento}</span><span>{v.ubicacion}</span>
                  <span className="orgs-incident-code">{v.candidatos_count} candidato{v.candidatos_count !== 1 ? "s" : ""}</span>
                </span>
              </div>
              <div className="orgs-apikey-actions" onClick={e => e.stopPropagation()}>
                <button className="orgs-refresh-btn" onClick={() => handleCerrarVacante(v)}>{v.estado === "abierta" ? "Cerrar" : "Reabrir"}</button>
                <button className="orgs-refresh-btn" onClick={() => handleEliminarVacante(v)}><FiX /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Reclutamiento;
