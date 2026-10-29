import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./Organigrama.css";
import { authService }         from "../services/authService";
import { apiFetch }            from "../services/apiConfig";
import ArbolPersonas, { armarArbol } from "./ArbolPersonas";
import { useOrg }              from "../context/OrgContext";

const BUBBLE_COLORS = [
  ["#5B8AF0", "rgba(91,138,240,"],
  ["#4ECAAC", "rgba(78,202,172,"],
  ["#F5A623", "rgba(245,166,35,"],
  ["#B57EDC", "rgba(181,126,220,"],
  ["#E86B5F", "rgba(232,107,95,"],
  ["#59C1E8", "rgba(89,193,232,"],
];
const colorFor = (str = "") => BUBBLE_COLORS[(str.charCodeAt(0) || 0) % BUBBLE_COLORS.length];

const getId = (e) => e?._id?.$oid || e?._id || "";
const nombreCompleto = (e) => [e?.Nombre, e?.ApelPaterno].filter(Boolean).join(" ");
const iniciales = (nombre = "") => nombre.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

// ─── Popup con la lista de empleados sin área asignada — se abre desde el
// botón junto a la raíz, en vez de ocupar un bloque fijo en la página.
function SinAsignarModal({ titulo = "Sin área asignada", empleados, fotosMap, onNodeClick, onClose }) {
  return (
    <div className="org-modal-overlay" onClick={onClose}>
      <div className="org-modal" onClick={e => e.stopPropagation()}>
        <div className="org-modal-header">
          <h3>{titulo}</h3>
          <button className="org-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <p className="org-modal-sub">{empleados.length} {empleados.length === 1 ? "persona aún no tiene" : "personas aún no tienen"} jefe inmediato ni equipo a su cargo. Asígnalo en su perfil, sección Laboral.</p>
        <div className="org-modal-lista">
          {empleados.map(emp => {
            const nombre = nombreCompleto(emp);
            const foto = fotosMap[getId(emp)];
            const [bg] = colorFor(nombre);
            return (
              <button key={getId(emp)} className="org-modal-item" onClick={() => onNodeClick(getId(emp))}>
                <span className="org-miembro-avatar" style={{ width: 40, height: 40 }}>
                  {foto ? (
                    <img src={foto} alt={nombre} onError={e => { e.target.style.display = "none"; }} />
                  ) : (
                    <span className="org-miembro-inicial" style={{ background: bg }}>{iniciales(nombre)}</span>
                  )}
                </span>
                <span className="org-modal-item-nombre">{nombre}</span>
                <span className="org-modal-item-ver">Ver perfil <FiArrowRight aria-hidden="true" className="btn-trail-icon" /></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Organigrama() {
  const [personas,  setPersonas]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [mostrarSinAsignar, setMostrarSinAsignar] = useState(false);

  const navigate     = useNavigate();
  const { orgConfig } = useOrg();
  const miEmpleadoId = authService.getEmpleadoId();

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const lista = await apiFetch("/organigrama");
      setPersonas(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("Error cargando organigrama:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleNodeClick = (id) => { if (id) navigate(`/Perfil/${id}`); };

  // El organigrama es la jerarquía real: cada persona cuelga de su jefe
  // inmediato (el de su ficha laboral). Quien todavía no tiene jefe ni
  // equipo no forma parte del árbol y se lista aparte.
  const { raices, sinJerarquia } = useMemo(() => armarArbol(personas), [personas]);
  const sinAsignarEmpleados = useMemo(
    () => sinJerarquia.map(p => ({ _id: p._id, Nombre: p.Nombre, ApelPaterno: p.ApelPaterno })),
    [sinJerarquia]
  );
  const fotosMap = useMemo(() => Object.fromEntries(personas.filter(p => p.Foto).map(p => [p._id, p.Foto])), [personas]);

  if (loading) {
    return (
      <section className="organigrama-section" id="organigrama-section">
        <div className="org-loading">
          <div className="org-loading-ring" />
          <p>Cargando estructura organizacional...</p>
        </div>
      </section>
    );
  }

  const totalAreas = new Set(personas.map(p => p.Departamento).filter(Boolean)).size;
  const hayJerarquia = raices.length > 0;
  const haySinAsignar = sinAsignarEmpleados.length > 0;

  return (
    <section className="organigrama-section" id="organigrama-section">
      {haySinAsignar && (
        <button className="org-sinasignar-corner" onClick={() => setMostrarSinAsignar(true)}>
          <span className="org-sinasignar-btn-dot" />
          Sin jefe asignado
          <span className="org-sinasignar-btn-count">{sinAsignarEmpleados.length}</span>
        </button>
      )}

      {error ? (
        <p className="error-text">No se pudo cargar la estructura organizacional.</p>
      ) : (
        <>
          <ArbolPersonas
            raices={raices}
            destacadoId={miEmpleadoId}
            onAbrir={handleNodeClick}
            cabecera={(
              <div className="org-root-card">
                <span className="org-root-nombre">{orgConfig?.name || "Organización"}</span>
                <span className="org-root-count">{personas.length} colaboradores · {totalAreas} {totalAreas === 1 ? "área" : "áreas"}</span>
              </div>
            )}
          />
          {!hayJerarquia && (
            <p className="org-scope-label" style={{ textAlign: "center" }}>
              Aún no hay jefes asignados. Asigna el jefe inmediato de cada persona en su perfil (Laboral) y el organigrama se arma solo.
            </p>
          )}
          {miEmpleadoId && hayJerarquia && sinJerarquia.some(p => p._id === miEmpleadoId) && (
            <p className="org-scope-label" style={{ textAlign: "center" }}>Todavía no tienes jefe inmediato asignado.</p>
          )}

          {mostrarSinAsignar && (
            <SinAsignarModal
              titulo="Sin jefe asignado"
              empleados={sinAsignarEmpleados}
              fotosMap={fotosMap}
              onNodeClick={(id) => { setMostrarSinAsignar(false); handleNodeClick(id); }}
              onClose={() => setMostrarSinAsignar(false)}
            />
          )}
        </>
      )}
    </section>
  );
}

export default Organigrama;
