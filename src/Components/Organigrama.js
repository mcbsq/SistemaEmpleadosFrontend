import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Organigrama.css";
import Tree from "react-d3-tree";

// --- CONFIGURACIÓN DINÁMICA DE LA API ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const apiurl = isLocal ? "http://localhost:5001" : "http://51.79.18.52:5001";

function Organigrama() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [jerarquia, setJerarquia] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Resize para mantener el centro del árbol
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    cargarJerarquia();
  }, []);

  const cargarJerarquia = async () => {
    try {
      const response = await fetch(`${apiurl}/jerarquia`);
      const data = await response.json();
      // Asumimos que el backend devuelve un objeto con { name: "Empresa", children: [...] }
      setJerarquia(data.jerarquia || data); 
      setLoading(false);
    } catch (error) {
      console.error("Error al cargar la jerarquía:", error);
      setLoading(false);
    }
  };

  // Configuración visual del árbol
  const containerStyles = { width: "100%", height: "80vh" };
  const translate = { x: windowWidth / 3, y: 50 };
  
  // Función para manejar el clic en los nodos
  const handleNodeClick = (nodeData) => {
    // Si el nodo tiene un ID de empleado (no es solo una etiqueta de área)
    if (nodeData.attributes && nodeData.attributes.empleado_id) {
      navigate(`/Perfil/${nodeData.attributes.empleado_id}`);
    }
  };

  if (loading) return <div className="loading">Cargando Estructura Organizacional...</div>;

  return (
    <section className="organigrama-section" id="organigrama-section">
      <div className="section-header">
        <h2>Organigrama</h2>
      </div>

      <div className="tree-wrapper" style={containerStyles}>
        {jerarquia ? (
          <Tree
            data={jerarquia}
            orientation="vertical"
            pathFunc="step" // Hace que las líneas sean ortogonales (más limpias)
            translate={translate}
            collapsible={true}
            onNodeClick={handleNodeClick}
            nodeSize={{ x: 250, y: 250 }}
            renderCustomNodeElement={(rd3tProps) => (
              <RenderNode {...rd3tProps} onNodeClick={handleNodeClick} />
            )}
            // Estilos de las líneas (links)
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

// Componente para renderizar cada Nodo de forma personalizada
const RenderNode = ({ nodeDatum, onNodeClick }) => {
  const isArea = !nodeDatum.attributes?.empleado_id; // Si no tiene ID, es un nombre de Área
  
  return (
    <g>
      {/* Círculo o Rectángulo base */}
      <circle 
  r="10" 
  className={isArea ? "area-node-dot" : "employee-node-dot"} 
/>
      
      {/* Contenedor de texto (ForeignObject permite usar HTML/CSS dentro de SVG) */}
      <foreignObject x="-100" y="20" width="200" height="80">
        <div 
          className={`node-card ${isArea ? 'area-node' : 'employee-node'}`}
          onClick={() => onNodeClick(nodeDatum)}
        >
          <div className="node-name">{nodeDatum.name}</div>
          {nodeDatum.attributes?.Cargo && (
            <div className="node-role">{nodeDatum.attributes.Cargo}</div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

export default Organigrama;