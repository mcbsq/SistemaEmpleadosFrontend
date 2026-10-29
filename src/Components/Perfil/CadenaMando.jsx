// Mini organigrama del perfil ("Ver jerarquía"): el mismo árbol que el
// Organigrama, recortado a esta persona — hasta 3 jefes hacia arriba, ella
// resaltada y quienes le reportan directamente. Sale de los "Jefe
// inmediato" de cada ficha laboral (GET /perfil/<id>/cadena-mando).
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMoreVertical } from "react-icons/fi";
import Modal from "../Modal";
import ArbolPersonas from "../ArbolPersonas";
import { apiFetch } from "../../services/apiConfig";
import "./CadenaMando.css";

// superiores (de arriba hacia abajo) → actual → directos, como un solo árbol.
function arbolDeCadena(datos) {
  if (!datos?.actual) return [];
  let nodo = { ...datos.actual, hijos: (datos.directos || []).map(d => ({ ...d, hijos: [] })) };
  [...(datos.superiores || [])].reverse().forEach(jefe => { nodo = { ...jefe, hijos: [nodo] }; });
  return [nodo];
}

export default function CadenaMando({ empleadoId, abierto, onClose }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!abierto || !empleadoId) return;
    let vivo = true;
    setDatos(null); setError("");
    apiFetch(`/perfil/${empleadoId}/cadena-mando?niveles=3`)
      .then(d => vivo && setDatos(d))
      .catch(e => vivo && setError(e.message || "No se pudo cargar la jerarquía."));
    return () => { vivo = false; };
  }, [abierto, empleadoId]);

  const raices = useMemo(() => arbolDeCadena(datos), [datos]);
  const abrir = (id) => {
    if (id === empleadoId) return;
    onClose();
    navigate(`/Perfil/${id}`);
  };

  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Jerarquía" ancho={760}
      subtitulo="Su jefe inmediato y hasta 3 niveles hacia arriba, y quiénes le reportan. Toca a alguien para ver su perfil.">
      {!datos && !error && <div className="cm-cargando"><div className="mapa-loading-dot" /> Cargando jerarquía…</div>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {datos && (
        <>
          {!datos.superiores?.length && !datos.directos?.length && (
            <p className="cm-vacio">Aún no tiene jefe inmediato ni personas a su cargo. Se asignan en la sección Laboral del perfil.</p>
          )}
          <ArbolPersonas compacto raices={raices} destacadoId={empleadoId} onAbrir={abrir}
            arriba={datos.hay_mas_arriba && <div className="cm-mas" title="Hay más niveles arriba"><FiMoreVertical aria-hidden="true" /></div>} />
        </>
      )}
    </Modal>
  );
}
