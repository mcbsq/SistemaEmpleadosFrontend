import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Organigrama.css";
import Tree from "react-d3-tree";
import { rhService }       from "../services/rhService";
import { authService }     from "../services/authService";
import { empleadoService } from "../services/empleadoService";

// ─── Filtrado de árbol por empleado ──────────────────────────────────────────
const filtrarArbolPorEmpleado = (nodo, empleadoId, path = []) => {
  const esteNodo   = { ...nodo, children: [] };
  const rutaActual = [...path, esteNodo];

  if (nodo.attributes?.Id === empleadoId) {
    esteNodo.children = nodo.children ?? [];
    return construirCadena(rutaActual);
  }
  for (const hijo of nodo.children ?? []) {
    const resultado = filtrarArbolPorEmpleado(hijo, empleadoId, rutaActual);
    if (resultado) return resultado;
  }
  return null;
};

const construirCadena = (path) => {
  if (!path.length) return null;
  const raiz = { ...path[0] };
  let actual = raiz;
  for (let i = 1; i < path.length; i++) {
    const nodo = { ...path[i] };
    actual.children = [nodo];
    actual = nodo;
  }
  return raiz;
};

// ─── Nodo personalizado ───────────────────────────────────────────────────────
const RenderNode = ({ nodeDatum, onNodeClick, fotosMap }) => {
  const isArea     = !nodeDatum.attributes?.Id;
  const empleadoId = nodeDatum.attributes?.Id;
  const foto       = fotosMap?.[empleadoId];

  // Iniciales para el placeholder del avatar
  const iniciales = nodeDatum.name
    ?.split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <g>
      <circle
        r="8"
        className={isArea ? "area-node-dot" : "employee-node-dot"}
      />

      <foreignObject x="-90" y="18" width="180" height={isArea ? 50 : 72}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className={`node-card ${isArea ? "area-node" : "employee-node"}`}
          onClick={() => !isArea && onNodeClick(empleadoId)}
          title={!isArea ? "Ver perfil" : undefined}
        >
          {/* Nodo de empleado: avatar + texto */}
          {!isArea && (
            <>
              {foto ? (
                <img
                  className="node-avatar"
                  src={foto}
                  alt={nodeDatum.name}
                  onError={e => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="node-avatar-placeholder">{iniciales}</div>
              )}
              <div className="node-text">
                <div className="node-name">{nodeDatum.name}</div>
                {nodeDatum.attributes?.Cargo && (
                  <div className="node-role">{nodeDatum.attributes.Cargo}</div>
                )}
                <div className="node-profile-hint">Ver perfil →</div>
              </div>
            </>
          )}

          {/* Nodo de área: solo nombre */}
          {isArea && (
            <div className="node-name">{nodeDatum.name}</div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
function Organigrama() {
  const [windowWidth,       setWindowWidth]       = useState(window.innerWidth);
  const [jerarquiaMostrada, setJerarquiaMostrada] = useState(null);
  const [fotosMap,          setFotosMap]          = useState({}); // { empleadoId: urlFoto }
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(false);

  const navigate     = useNavigate();
  const isSuperAdmin = authService.isSuperAdmin();
  const empleadoId   = authService.getEmpleadoId();

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar jerarquía y empleados en paralelo
      const [jerarquiaData, todosEmpleados] = await Promise.all([
        rhService.getJerarquia(),
        empleadoService.getAll().catch(() => []),
      ]);

      const arbol = jerarquiaData.jerarquia || jerarquiaData;

      // Construir mapa de fotos { _id: urlFoto } para los nodos
      const mapa = {};
      todosEmpleados.forEach(e => {
        const foto = e.Fotografias?.[0] || e.Fotografia || null;
        if (foto) mapa[e._id] = foto;
      });
      setFotosMap(mapa);

      if (isSuperAdmin || !empleadoId) {
        setJerarquiaMostrada(arbol);
      } else {
        const filtrado = filtrarArbolPorEmpleado(arbol, empleadoId);
        setJerarquiaMostrada(filtrado || arbol);
      }
    } catch (err) {
      console.error("Error cargando organigrama:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, empleadoId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleNodeClick = (id) => {
    if (id) navigate(`/Perfil/${id}`);
  };

  const translate = { x: windowWidth / 3, y: 60 };
  const nodeSize  = { x: 260, y: 110 };

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
        {!isSuperAdmin && empleadoId && (
          <p className="org-scope-label">Mostrando tu área y cadena de reporte</p>
        )}
      </div>

      <div className="tree-wrapper" style={{ width: "100%", height: "80vh" }}>
        {jerarquiaMostrada && !error ? (
          <Tree
            data={jerarquiaMostrada}
            orientation="vertical"
            pathFunc="step"
            translate={translate}
            collapsible
            nodeSize={nodeSize}
            separation={{ siblings: 1.4, nonSiblings: 1.8 }}
            renderCustomNodeElement={(rd3tProps) => (
              <RenderNode
                {...rd3tProps}
                onNodeClick={handleNodeClick}
                fotosMap={fotosMap}
              />
            )}
            rootNodeClassName="node__root"
            branchNodeClassName="node__branch"
            leafNodeClassName="node__leaf"
          />
        ) : (
          <p className="error-text">No se pudo cargar la jerarquía de personal.</p>
        )}
      </div>
    </section>
  );
}

export default Organigrama;