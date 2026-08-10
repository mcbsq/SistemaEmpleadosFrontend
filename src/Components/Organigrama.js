import React, { useEffect, useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Organigrama.css";
import { authService }         from "../services/authService";
import { empleadoService }     from "../services/empleadoService";
import { catalogodeptoService } from "../services/catalogodeptoService";
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
const esSinAsignar = (nombre) => (nombre || "").toString().trim().toLowerCase() === "sin asignar";

// Deriva una forma orgánica (border-radius irregular) determinística a partir
// de la key del nodo, para que cada burbuja de área se vea "amebiforme" sin
// que la forma cambie entre renders.
const BLOB_SHAPES = [
  "62% 38% 55% 45% / 48% 42% 58% 52%",
  "45% 55% 62% 38% / 55% 48% 52% 45%",
  "58% 42% 40% 60% / 42% 60% 40% 58%",
  "40% 60% 58% 42% / 60% 45% 55% 40%",
  "55% 45% 45% 55% / 40% 55% 45% 60%",
];
const blobShapeFor = (key = "") => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return BLOB_SHAPES[hash % BLOB_SHAPES.length];
};

// ─── Burbuja de miembro — avatar circular + nombre, dentro del área.
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

// ─── Ameba de área — un nodo del árbol con forma orgánica, título con
// espacio propio arriba y sus miembros agrupados como burbujas adentro.
// forwardRef para que el padre pueda medir su posición y dibujar la línea
// que la conecta con su nodo padre (o con la raíz de la empresa).
const AreaCard = React.forwardRef(function AreaCard({ area, empleados, fotosMap, onNodeClick, index, nodeKey }, ref) {
  const [color] = colorFor(area);
  const n = empleados.length;
  return (
    <div
      className="org-area-card"
      ref={ref}
      style={{
        "--area-color": color,
        "--area-blob": blobShapeFor(nodeKey || area),
        animationDelay: `${(index % 5) * 0.08}s`,
      }}
    >
      <div className="org-area-header">
        <span className="org-area-dot" style={{ background: color }} />
        <span className="org-area-nombre">{area}</span>
        <span className="org-area-count">{n} {n === 1 ? "persona" : "personas"}</span>
      </div>
      {n > 0 && (
        <div className="org-area-miembros">
          {empleados.map(emp => (
            <MiembroChip key={getId(emp)} emp={emp} foto={fotosMap[getId(emp)]} onClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Un nivel del árbol — se dibuja a sí mismo y luego, debajo, la fila de
// sus áreas hijas (recursivo). Así "Dirección" queda arriba y sus áreas
// dependientes abajo, en vez de todas como hermanas de la empresa.
function NivelArbol({ nodo, fotosMap, onNodeClick, registrarRef, index, profundidad }) {
  const hijos = nodo.hijos || [];
  return (
    <div className="org-nivel">
      <AreaCard
        ref={registrarRef(nodo.key)}
        nodeKey={nodo.key}
        area={nodo.nombre}
        empleados={nodo.empleados}
        fotosMap={fotosMap}
        onNodeClick={onNodeClick}
        index={index}
      />
      {hijos.length > 0 && (
        <div className="org-hijos-row">
          {hijos.map((hijo, i) => (
            <NivelArbol
              key={hijo.key}
              nodo={hijo}
              fotosMap={fotosMap}
              onNodeClick={onNodeClick}
              registrarRef={registrarRef}
              index={i}
              profundidad={profundidad + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Líneas de conexión — se miden posiciones reales en pantalla para cada
// arista del árbol (raíz→primer nivel, y cada padre→hijo declarado en
// Configuración→Áreas), así el organigrama se ve como un árbol de verdad
// sin importar cuántos niveles de profundidad tenga.
function useConectores(wrapRef, resolverAristas, deps) {
  const [lineas, setLineas] = useState([]);

  const calcular = useCallback(() => {
    if (!wrapRef.current) return;
    const wrapBox = wrapRef.current.getBoundingClientRect();
    const nuevas = [];
    // Resolver los elementos DOM AQUÍ, no antes: esto corre después del
    // commit (useLayoutEffect), así que nodeRefs ya está poblado con la
    // pasada de render actual. Resolverlos en fase de render leería los
    // refs de la pasada ANTERIOR (o vacíos en el primer render).
    for (const [origenEl, destinoEl] of resolverAristas()) {
      if (!origenEl || !destinoEl) continue;
      const oBox = origenEl.getBoundingClientRect();
      const dBox = destinoEl.getBoundingClientRect();
      const oX = oBox.left + oBox.width / 2 - wrapBox.left;
      const oY = oBox.bottom - wrapBox.top;
      const dX = dBox.left + dBox.width / 2 - wrapBox.left;
      const dY = dBox.top - wrapBox.top;
      const midY = oY + (dY - oY) / 2;
      nuevas.push({ oX, oY, dX, dY, midY });
    }
    setLineas(nuevas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapRef]);

  useLayoutEffect(() => {
    calcular();
    const onResize = () => calcular();
    window.addEventListener("resize", onResize);
    const id = setTimeout(calcular, 280); // tras animación de entrada
    return () => { window.removeEventListener("resize", onResize); clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return lineas;
}

// ─── Popup con la lista de empleados sin área asignada — se abre desde el
// botón junto a la raíz, en vez de ocupar un bloque fijo en la página.
function SinAsignarModal({ empleados, fotosMap, onNodeClick, onClose }) {
  return (
    <div className="org-modal-overlay" onClick={onClose}>
      <div className="org-modal" onClick={e => e.stopPropagation()}>
        <div className="org-modal-header">
          <h3>Sin área asignada</h3>
          <button className="org-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <p className="org-modal-sub">{empleados.length} {empleados.length === 1 ? "persona no tiene" : "personas no tienen"} un área asignada todavía.</p>
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
                <span className="org-modal-item-ver">Ver perfil →</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Organigrama() {
  const [empleados, setEmpleados] = useState([]);
  const [areasCatalogo, setAreasCatalogo] = useState([]);
  const [fotosMap,  setFotosMap]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [mostrarSinAsignar, setMostrarSinAsignar] = useState(false);

  const navigate     = useNavigate();
  const { orgConfig } = useOrg();
  const isSuperAdmin = authService.isSuperAdmin();
  const miEmpleadoId = authService.getEmpleadoId();

  const wrapRef  = useRef(null);
  const rootRef  = useRef(null);
  const nodeRefs = useRef({}); // key -> DOM el

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [todos, areas] = await Promise.all([
        empleadoService.getAll(),
        catalogodeptoService.getAll().catch(() => []),
      ]);
      const lista = Array.isArray(todos) ? todos : [];
      setEmpleados(lista);
      setAreasCatalogo(Array.isArray(areas) ? areas : []);

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

  // ── Construir el árbol real: raíz → primer nivel → niveles hijos, según
  // el catálogo de áreas (Configuración → Áreas). Si el catálogo está vacío
  // (nadie ha definido jerarquía todavía), cae al comportamiento anterior:
  // un solo nivel plano con cada área como hija directa de la empresa —
  // así ningún despliegue existente se rompe por no tener el catálogo lleno.
  const arbol = useMemo(() => {
    let base = empleados;
    if (!isSuperAdmin && miEmpleadoId) {
      const miArea = empleados.find(e => getId(e) === miEmpleadoId)?.depto_id;
      base = miArea ? empleados.filter(e => e.depto_id === miArea) : empleados;
    }

    // "Sin asignar" no es una jerarquía real (nadie la configura en el
    // catálogo, es solo el hueco de quien no tiene depto_id) — se agrupa
    // aparte, en su propia línea, sin importar cómo esté capitalizada.
    const porArea = {};
    base.forEach(e => {
      const area = (e.depto_id || "Sin asignar").toString();
      if (esSinAsignar(area)) return;
      (porArea[area] = porArea[area] || []).push(e);
    });
    const nombresConGente = Object.keys(porArea);

    // Índice del catálogo: nombre → DeptoPadre (o null si es primer nivel).
    const padrePorNombre = {};
    areasCatalogo.forEach(a => { if (!esSinAsignar(a.NombreDepto)) padrePorNombre[a.NombreDepto] = a.DeptoPadre || null; });

    // Todo nombre de área que aparece en empleados pero no en el catálogo
    // se trata como si fuera de primer nivel (comportamiento anterior).
    const todosLosNombres = new Set([...nombresConGente, ...Object.keys(padrePorNombre)]);
    todosLosNombres.forEach(n => { if (!(n in padrePorNombre)) padrePorNombre[n] = null; });

    const hijosPorPadre = {};
    todosLosNombres.forEach(n => {
      const p = padrePorNombre[n];
      (hijosPorPadre[p] = hijosPorPadre[p] || []).push(n);
    });

    const construirNodo = (nombre, ruta, profundidad) => {
      // Guardia anti-ciclo: una jerarquía mal configurada no debe colgar el navegador.
      if (profundidad > 8 || ruta.has(nombre)) return null;
      const siguienteRuta = new Set(ruta); siguienteRuta.add(nombre);
      const hijosNombres = (hijosPorPadre[nombre] || []).filter(h => h !== nombre);
      return {
        key: [...ruta, nombre].join(" > "),
        nombre,
        empleados: porArea[nombre] || [],
        hijos: hijosNombres
          .map(h => construirNodo(h, siguienteRuta, profundidad + 1))
          .filter(Boolean)
          // Áreas sin gente y sin hijos con gente no aportan nada al árbol —
          // no mostrar cajas vacías que nadie configuró a propósito.
          .filter(nodo => nodo.empleados.length > 0 || nodo.hijos.length > 0),
      };
    };

    const raices = (hijosPorPadre[null] || [])
      .map(n => construirNodo(n, new Set(), 0))
      .filter(Boolean)
      .filter(nodo => nodo.empleados.length > 0 || nodo.hijos.length > 0)
      .sort((a, b) => (b.empleados.length + b.hijos.length) - (a.empleados.length + a.hijos.length));

    return raices;
  }, [empleados, areasCatalogo, isSuperAdmin, miEmpleadoId]);

  // Empleados sin área asignada — se muestran en su propia línea aparte,
  // fuera de la jerarquía real, sin importar cómo esté capitalizado el dato.
  const sinAsignarEmpleados = useMemo(() => {
    let base = empleados;
    if (!isSuperAdmin && miEmpleadoId) {
      const miArea = empleados.find(e => getId(e) === miEmpleadoId)?.depto_id;
      base = miArea ? empleados.filter(e => e.depto_id === miArea) : empleados;
    }
    return base.filter(e => esSinAsignar(e.depto_id || "Sin asignar"));
  }, [empleados, isSuperAdmin, miEmpleadoId]);

  // ── Registrar refs y armar la lista de aristas (padre→hijo) para las líneas.
  nodeRefs.current = {};
  const registrarRef = (key) => (el) => { nodeRefs.current[key] = el; };

  const aristasRef = useRef([]);
  aristasRef.current = useMemo(() => {
    const pares = [];
    const recorrer = (nodo, padreKey) => {
      pares.push([padreKey, nodo.key]);
      (nodo.hijos || []).forEach(h => recorrer(h, nodo.key));
    };
    arbol.forEach(raiz => recorrer(raiz, "__root__"));
    return pares;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arbol]);

  // useConectores necesita elementos DOM, no keys — se resuelven en cada
  // cálculo (después del commit), nunca durante el render.
  const resolverAristas = useCallback(() => aristasRef.current.map(([pKey, cKey]) => [
    pKey === "__root__" ? rootRef.current : nodeRefs.current[pKey],
    nodeRefs.current[cKey],
  ]), []);

  const lineas = useConectores(wrapRef, resolverAristas, [arbol, loading]);

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

  const totalEmpleados = empleados.length;
  const nombresArea = new Set(
    empleados.map(e => (esSinAsignar(e.depto_id || "Sin asignar") ? "Sin asignar" : e.depto_id))
  );
  const totalAreas = nombresArea.size;
  const hayJerarquia = arbol.length > 0;
  const haySinAsignar = sinAsignarEmpleados.length > 0;

  return (
    <section className="organigrama-section" id="organigrama-section">
      {haySinAsignar && (
        <button className="org-sinasignar-corner" onClick={() => setMostrarSinAsignar(true)}>
          <span className="org-sinasignar-btn-dot" />
          Sin asignar
          <span className="org-sinasignar-btn-count">{sinAsignarEmpleados.length}</span>
        </button>
      )}

      {!isSuperAdmin && miEmpleadoId && (
        <div className="section-header">
          <p className="org-scope-label">Mostrando tu área</p>
        </div>
      )}

      {error || (!hayJerarquia && !haySinAsignar) ? (
        <p className="error-text">No se pudo cargar la estructura organizacional.</p>
      ) : (
        <>
          <div className="org-tree-wrap" ref={wrapRef}>
            <svg className="org-connectors" aria-hidden="true">
              {lineas.map((l, i) => (
                <path
                  key={i}
                  d={`M ${l.oX} ${l.oY} L ${l.oX} ${l.midY} L ${l.dX} ${l.midY} L ${l.dX} ${l.dY}`}
                  className="org-connector-line"
                  style={{ animationDelay: `${(i % 6) * 0.06 + 0.15}s` }}
                />
              ))}
            </svg>

            <div className="org-root-card" ref={rootRef}>
              <span className="org-root-nombre">{orgConfig?.name || "Organización"}</span>
              <span className="org-root-count">{totalEmpleados} colaboradores · {totalAreas} {totalAreas === 1 ? "área" : "áreas"}</span>
            </div>

            {hayJerarquia && (
              <div className="org-areas-row">
                {arbol.map((nodo, i) => (
                  <NivelArbol
                    key={nodo.key}
                    nodo={nodo}
                    fotosMap={fotosMap}
                    onNodeClick={handleNodeClick}
                    registrarRef={registrarRef}
                    index={i}
                    profundidad={0}
                  />
                ))}
              </div>
            )}
          </div>

          {mostrarSinAsignar && (
            <SinAsignarModal
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
