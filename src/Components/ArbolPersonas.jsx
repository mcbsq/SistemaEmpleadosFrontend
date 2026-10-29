// Árbol de personas por jefe inmediato — lo usan el Organigrama (empresa
// completa) y el mini organigrama del perfil ("Ver jerarquía"), así los dos
// se ven y funcionan igual: tarjetas de persona unidas por líneas de jefe a
// equipo, y clic en una tarjeta abre su perfil.
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import "./ArbolPersonas.css";

const COLORES = ["#5B8AF0", "#4ECAAC", "#F5A623", "#B57EDC", "#E86B5F", "#59C1E8"];
const colorDe = (txt = "") => {
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return COLORES[h % COLORES.length];
};
const iniciales = (n = "") => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
export const nombreDe = (p) => [p?.Nombre, p?.ApelPaterno].filter(Boolean).join(" ") || "Sin nombre";

/**
 * Arma el árbol a partir de una lista plana de personas
 * ({_id, JefeInmediato_id, ...}). Devuelve las raíces que tienen equipo y,
 * aparte, a quienes no tienen ni jefe ni equipo (no forman parte de la
 * jerarquía todavía).
 */
export function armarArbol(personas) {
  const porId = new Map(personas.map(p => [p._id, p]));
  const hijos = new Map();
  personas.forEach(p => {
    const j = p.JefeInmediato_id && porId.has(p.JefeInmediato_id) ? p.JefeInmediato_id : null;
    if (!hijos.has(j)) hijos.set(j, []);
    hijos.get(j).push(p);
  });
  const orden = (a, b) => nombreDe(a).localeCompare(nombreDe(b), "es");
  const construir = (p, ruta) => {
    if (ruta.has(p._id) || ruta.size > 12) return null; // ciclo o jerarquía absurda
    const r = new Set(ruta); r.add(p._id);
    return { ...p, hijos: (hijos.get(p._id) || []).sort(orden).map(h => construir(h, r)).filter(Boolean) };
  };
  const raices = (hijos.get(null) || []).sort(orden).map(p => construir(p, new Set())).filter(Boolean);
  // Un ciclo (A jefe de B y B jefe de A) deja a todos sin raíz: se rompe en
  // la primera persona del ciclo para que nadie desaparezca del árbol.
  const enArbol = new Set();
  const marcar = n => { enArbol.add(n._id); n.hijos.forEach(marcar); };
  raices.forEach(marcar);
  personas.filter(p => !enArbol.has(p._id)).sort(orden).forEach(p => {
    if (enArbol.has(p._id)) return;
    const n = construir({ ...p, JefeInmediato_id: "" }, new Set());
    marcar(n); raices.push(n);
  });
  return {
    raices: raices.filter(n => n.hijos.length > 0),
    sinJerarquia: raices.filter(n => n.hijos.length === 0),
  };
}

function Tarjeta({ p, destacadoId, onAbrir, registrar }) {
  const nombre = nombreDe(p);
  const color = colorDe(p.Departamento || nombre);
  const actual = p._id && p._id === destacadoId;
  const contenido = (
    <>
      <span className="arb-avatar" style={{ background: p.Foto ? undefined : color }} aria-hidden="true">
        {p.Foto ? <img src={p.Foto} alt="" onError={e => { e.currentTarget.style.display = "none"; }} /> : iniciales(nombre)}
      </span>
      <span className="arb-texto">
        <span className="arb-nombre" title={nombre}>{nombre}</span>
        <span className="arb-puesto" title={p.Puesto || ""}>{p.Puesto || "Sin puesto registrado"}</span>
        {p.Departamento && (
          <span className="arb-area"><i style={{ background: color }} aria-hidden="true" />{p.Departamento}</span>
        )}
      </span>
      {p.hijos?.length > 0 && <span className="arb-equipo" title="Le reportan directamente">{p.hijos.length}</span>}
    </>
  );
  const clase = `arb-tarjeta${actual ? " arb-tarjeta--actual" : ""}`;
  if (!p._id || !onAbrir) {
    return <div ref={registrar} className={clase} aria-current={actual ? "true" : undefined} style={{ "--arb-color": color }}>{contenido}</div>;
  }
  return (
    <button type="button" ref={registrar} className={`${clase} arb-tarjeta--link`} style={{ "--arb-color": color }}
      onClick={() => onAbrir(p._id)} title={`${nombre} — Ver perfil`}>
      {contenido}
    </button>
  );
}

function Rama({ nodo, ruta, ...props }) {
  const clave = `${ruta}/${nodo._id || nodo.Nombre}`;
  return (
    <div className="arb-rama">
      <Tarjeta p={nodo} registrar={props.registrar(clave)} destacadoId={props.destacadoId} onAbrir={props.onAbrir} />
      {nodo.hijos?.length > 0 && (
        <div className="arb-hijos">
          {nodo.hijos.map(h => <Rama key={h._id || h.Nombre} nodo={h} ruta={clave} {...props} />)}
        </div>
      )}
    </div>
  );
}

// Líneas jefe → equipo medidas en pantalla (así aguantan cualquier ancho).
function useLineas(wrapRef, aristasRef, refs, deps) {
  const [lineas, setLineas] = useState([]);
  const calcular = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const nuevas = [];
    aristasRef.current.forEach(([a, b]) => {
      const o = refs.current[a], d = refs.current[b];
      if (!o || !d) return;
      const ob = o.getBoundingClientRect(), db = d.getBoundingClientRect();
      const oX = ob.left + ob.width / 2 - w.left + wrap.scrollLeft, oY = ob.bottom - w.top + wrap.scrollTop;
      const dX = db.left + db.width / 2 - w.left + wrap.scrollLeft, dY = db.top - w.top + wrap.scrollTop;
      nuevas.push({ oX, oY, dX, dY, midY: oY + (dY - oY) / 2 });
    });
    setLineas(nuevas);
  }, [wrapRef, aristasRef, refs]);
  useLayoutEffect(() => {
    calcular();
    const t = setTimeout(calcular, 300);
    window.addEventListener("resize", calcular);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(calcular) : null;
    if (ro && wrapRef.current) ro.observe(wrapRef.current);
    return () => { clearTimeout(t); window.removeEventListener("resize", calcular); ro?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return lineas;
}

/**
 * raices: nodos {_id, Nombre, ApelPaterno, Foto, Puesto, Departamento, hijos[]}
 * cabecera: nodo opcional por encima de todo (p. ej. la empresa), sin perfil.
 */
export default function ArbolPersonas({ raices = [], cabecera, destacadoId, onAbrir, compacto = false, arriba }) {
  const wrapRef = useRef(null);
  const refs = useRef({});
  const aristasRef = useRef([]);
  refs.current = {};
  const registrar = (clave) => (el) => { if (el) refs.current[clave] = el; };

  const aristas = [];
  const recorrer = (n, ruta, padre) => {
    const clave = `${ruta}/${n._id || n.Nombre}`;
    if (padre) aristas.push([padre, clave]);
    (n.hijos || []).forEach(h => recorrer(h, clave, clave));
  };
  raices.forEach(r => recorrer(r, "", cabecera ? "__cabecera__" : null));
  aristasRef.current = aristas;

  const lineas = useLineas(wrapRef, aristasRef, refs, [raices, cabecera, compacto]);

  return (
    <div className={`arb-wrap${compacto ? " arb-wrap--compacto" : ""}`} ref={wrapRef}>
      <svg className="arb-lineas" aria-hidden="true">
        {lineas.map((l, i) => (
          <path key={i} className="arb-linea" style={{ animationDelay: `${(i % 6) * 0.05 + 0.1}s` }}
            d={`M ${l.oX} ${l.oY} L ${l.oX} ${l.midY} L ${l.dX} ${l.midY} L ${l.dX} ${l.dY}`} />
        ))}
      </svg>
      <div className="arb-contenido">
        {arriba}
        {cabecera && <div className="arb-cabecera" ref={registrar("__cabecera__")}>{cabecera}</div>}
        <div className={`arb-hijos arb-hijos--raiz${cabecera ? "" : " arb-hijos--sin-cabecera"}`}>
          {raices.map(r => (
            <Rama key={r._id || r.Nombre} nodo={r} ruta="" registrar={registrar} destacadoId={destacadoId} onAbrir={onAbrir} />
          ))}
        </div>
      </div>
    </div>
  );
}
