import React, { useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Organigrama.css";
import { authService }     from "../services/authService";
import { empleadoService } from "../services/empleadoService";
import { useOrg }          from "../context/OrgContext";

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

// ─── Tarjeta de miembro — chip con avatar + nombre, dentro de la caja de área.
function MiembroChip({ emp, foto, onClick }) {
  const nombre = nombreCompleto(emp);
  const [bg] = colorFor(nombre);
  return (
    <button className="org-miembro" onClick={() => onClick(getId(emp))} title={`${nombre} — Ver perfil`}>
      <span className="org-miembro-avatar">
        {foto ? (
          <img src={foto} alt={nombre} onError={e => { e.target.style.display = "none"; }} />
        ) : (
          <span className="org-miembro-inicial" style={{ background: bg }}>{iniciales(nombre)}</span>
        )}
      </span>
      <span className="org-miembro-nombre">{nombre}</span>
    </button>
  );
}

// ─── Caja de área — nodo del árbol, con título, contador y grid de miembros.
const AreaCard = React.forwardRef(function AreaCard({ area, empleados, fotosMap, onNodeClick, index }, ref) {
  const [color] = colorFor(area);
  const n = empleados.length;
  return (
    <div className="org-area-card" ref={ref} style={{ "--area-color": color, animationDelay: `${(index % 5) * 0.08}s` }}>
      <div className="org-area-header">
        <span className="org-area-dot" style={{ background: color }} />
        <span className="org-area-nombre">{area}</span>
        <span className="org-area-count">{n} {n === 1 ? "persona" : "personas"}</span>
      </div>
      <div className="org-area-miembros">
        {empleados.map(emp => (
          <MiembroChip key={getId(emp)} emp={emp} foto={fotosMap[getId(emp)]} onClick={onNodeClick} />
        ))}
      </div>
    </div>
  );
});

// ─── Líneas de conexión — se calculan midiendo posiciones reales en pantalla,
// así el árbol se ve como un organigrama de verdad (raíz → cada área), no
// una fila plana. Se recalculan en resize/scroll para no desalinearse.
function useConectores(wrapRef, rootRef, cardRefs, deps) {
  const [lineas, setLineas] = useState([]);

  const calcular = useCallback(() => {
    if (!wrapRef.current || !rootRef.current) return;
    const wrapBox = wrapRef.current.getBoundingClientRect();
    const rootBox = rootRef.current.getBoundingClientRect();
    const rootX = rootBox.left + rootBox.width / 2 - wrapBox.left;
    const rootY = rootBox.bottom - wrapBox.top;

    const nuevas = cardRefs.current.filter(Boolean).map(el => {
      const box = el.getBoundingClientRect();
      const x = box.left + box.width / 2 - wrapBox.left;
      const y = box.top - wrapBox.top;
      const midY = rootY + (y - rootY) / 2;
      return { rootX, rootY, x, y, midY };
    });
    setLineas(nuevas);
  }, [wrapRef, rootRef, cardRefs]);

  useLayoutEffect(() => {
    calcular();
    const onResize = () => calcular();
    window.addEventListener("resize", onResize);
    const id = setTimeout(calcular, 260); // tras animación de entrada
    return () => { window.removeEventListener("resize", onResize); clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return lineas;
}

function Organigrama() {
  const [empleados, setEmpleados] = useState([]);
  const [fotosMap,  setFotosMap]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);

  const navigate     = useNavigate();
  const { orgConfig } = useOrg();
  const isSuperAdmin = authService.isSuperAdmin();
  const miEmpleadoId = authService.getEmpleadoId();

  const wrapRef = useRef(null);
  const rootRef = useRef(null);
  const cardRefs = useRef([]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const todos = await empleadoService.getAll();
      const lista = Array.isArray(todos) ? todos : [];
      setEmpleados(lista);

      const mapa = {};
      lista.forEach(e => {
        const foto = e.Fotografias?.[0] || e.Fotografia || null;
        if (foto) mapa[getId(e)] = foto;
      });
      setFotosMap(mapa);
    } catch (err) {
      console.error("Error cargando organigrama:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleNodeClick = (id) => { if (id) navigate(`/Perfil/${id}`); };

  // ── Agrupar por área (depto_id) — un EMPLOYEE solo ve su propia área ──────
  const grupos = useMemo(() => {
    let base = empleados;
    if (!isSuperAdmin && miEmpleadoId) {
      const miArea = empleados.find(e => getId(e) === miEmpleadoId)?.depto_id;
      base = miArea ? empleados.filter(e => e.depto_id === miArea) : empleados;
    }
    const porArea = {};
    base.forEach(e => {
      const area = (e.depto_id || "Sin asignar").toString();
      (porArea[area] = porArea[area] || []).push(e);
    });
    return Object.entries(porArea).sort((a, b) => b[1].length - a[1].length);
  }, [empleados, isSuperAdmin, miEmpleadoId]);

  cardRefs.current = [];
  const registrarCardRef = (i) => (el) => { cardRefs.current[i] = el; };

  const lineas = useConectores(wrapRef, rootRef, cardRefs, [grupos.length, loading]);

  if (loading) {
    return (
      <section className="organigrama-section" id="organigrama-section">
        <div className="section-header"><h2>Organigrama</h2></div>
        <div className="org-loading">
          <div className="org-loading-ring" />
          <p>Cargando estructura organizacional...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="organigrama-section" id="organigrama-section">
      <div className="section-header">
        <h2>Organigrama</h2>
        {!isSuperAdmin && miEmpleadoId && (
          <p className="org-scope-label">Mostrando tu área</p>
        )}
      </div>

      {error || grupos.length === 0 ? (
        <p className="error-text">No se pudo cargar la estructura organizacional.</p>
      ) : (
        <div className="org-tree-wrap" ref={wrapRef}>
          <svg className="org-connectors" aria-hidden="true">
            {lineas.map((l, i) => (
              <path
                key={i}
                d={`M ${l.rootX} ${l.rootY} L ${l.rootX} ${l.midY} L ${l.x} ${l.midY} L ${l.x} ${l.y}`}
                className="org-connector-line"
                style={{ animationDelay: `${(i % 5) * 0.08 + 0.15}s` }}
              />
            ))}
          </svg>

          <div className="org-root-card" ref={rootRef}>
            <span className="org-root-nombre">{orgConfig?.name || "Organización"}</span>
            <span className="org-root-count">{empleados.length} colaboradores · {grupos.length} {grupos.length === 1 ? "área" : "áreas"}</span>
          </div>

          <div className="org-areas-row">
            {grupos.map(([area, emps], i) => (
              <AreaCard
                key={area}
                ref={registrarCardRef(i)}
                area={area}
                empleados={emps}
                fotosMap={fotosMap}
                onNodeClick={handleNodeClick}
                index={i}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default Organigrama;
