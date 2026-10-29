// Mini organigrama del perfil: la persona, hasta 3 niveles de jefes hacia
// arriba y quiénes le reportan directamente. Sale de los "Jefe inmediato"
// de cada ficha laboral (GET /perfil/<id>/cadena-mando), así que siempre
// coincide con lo que RH capturó.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiGitMerge, FiMoreVertical } from "react-icons/fi";
import Modal from "../Modal";
import { apiFetch } from "../../services/apiConfig";
import "./CadenaMando.css";

const iniciales = (n = "") => n.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "?";

function Nodo({ n, actual, onIr }) {
  const nombre = `${n.Nombre || ""} ${n.ApelPaterno || ""}`.trim() || "Sin nombre";
  const contenido = (
    <>
      <span className="cm-avatar" aria-hidden="true">
        {n.Foto ? <img src={n.Foto} alt="" /> : iniciales(nombre)}
      </span>
      <span className="cm-texto">
        <span className="cm-nombre" title={nombre}>{nombre}</span>
        <span className="cm-puesto" title={[n.Puesto, n.Departamento].filter(Boolean).join(" · ")}>
          {[n.Puesto, n.Departamento].filter(Boolean).join(" · ") || "Sin puesto registrado"}
        </span>
      </span>
    </>
  );
  if (actual || !n._id) return <div className={`cm-nodo${actual ? " cm-nodo--actual" : ""}`} aria-current={actual ? "true" : undefined}>{contenido}</div>;
  return <Link to={`/Perfil/${n._id}`} className="cm-nodo cm-nodo--link" onClick={onIr}>{contenido}</Link>;
}

export default function CadenaMando({ empleadoId, abierto, onClose }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto || !empleadoId) return;
    let vivo = true;
    setDatos(null); setError("");
    apiFetch(`/perfil/${empleadoId}/cadena-mando?niveles=3`)
      .then(d => vivo && setDatos(d))
      .catch(e => vivo && setError(e.message || "No se pudo cargar la jerarquía."));
    return () => { vivo = false; };
  }, [abierto, empleadoId]);

  const superiores = datos?.superiores || [];
  const directos = datos?.directos || [];

  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Jerarquía" ancho={520}
      subtitulo="Su jefe inmediato y hasta 3 niveles hacia arriba, y quiénes le reportan.">
      {!datos && !error && <div className="cm-cargando"><div className="mapa-loading-dot" /> Cargando jerarquía…</div>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {datos && (
        <div className="cm-arbol" role="list" aria-label="Cadena de mando">
          {datos.hay_mas_arriba && <div className="cm-mas" aria-hidden="true"><FiMoreVertical /></div>}
          {superiores.length === 0 && <p className="cm-vacio">No tiene jefe inmediato asignado.</p>}
          {superiores.map((n, i) => (
            <div key={n._id || i} className="cm-nivel" role="listitem">
              <Nodo n={n} onIr={onClose} />
            </div>
          ))}
          <div className="cm-nivel" role="listitem">
            <Nodo n={datos.actual} actual />
          </div>
          {directos.length > 0 && (
            <div className="cm-directos" role="group" aria-label="Le reportan directamente">
              <p className="cm-directos-titulo"><FiGitMerge aria-hidden="true" /> Le reportan directamente ({directos.length})</p>
              <div className="cm-directos-lista">
                {directos.map(n => <Nodo key={n._id} n={n} onIr={onClose} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
