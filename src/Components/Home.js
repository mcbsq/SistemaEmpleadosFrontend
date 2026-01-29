import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

// --- CONFIGURACIÓN DINÁMICA DE LA API ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const apiurl = isLocal 
  ? "http://localhost:5001" 
  : "http://51.79.18.52:5001";

function Home() {
  const [empleados, setEmpleados] = useState([]);
  const [filteredEmpleados, setFilteredEmpleados] = useState([]);
  const [datosCargados, setDatosCargados] = useState(false);
  const [hoveredEmpleado, setHoveredEmpleado] = useState(null);
  const [datosContacto, setDatosContacto] = useState(null);
  
  // Estado para la Rotación Maestra
  const [currentRotation, setCurrentRotation] = useState(0); 
  const [isPaused, setIsPaused] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const autoRotateRef = useRef(null);
  const touchStartX = useRef(null); // Ref para el inicio del swipe

  // 1. Cargar empleados
  useEffect(() => {
    const cargarEmpleadosBD = () => {
      fetch(`${apiurl}/empleados`, {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => response.json())
      .then((json) => {
        setEmpleados(json);
        setFilteredEmpleados(json);
        setDatosCargados(true);
      })
      .catch(err => console.error("Error cargando empleados:", err));
    };
    cargarEmpleadosBD();
  }, []);

  // 2. Lógica de Rotación Automática
  useEffect(() => {
    if (!isPaused && !isNavigating && filteredEmpleados.length > 0) {
      autoRotateRef.current = setInterval(() => {
        setCurrentRotation(prev => prev - 0.2); 
      }, 30);
    } else {
      clearInterval(autoRotateRef.current);
    }
    return () => clearInterval(autoRotateRef.current);
  }, [isPaused, isNavigating, filteredEmpleados.length]);


  // 3. Handlers para navegación
  const handlePrevClick = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    const step = 360 / (filteredEmpleados.length || 1);
    setCurrentRotation(prev => prev + step);
    setTimeout(() => setIsNavigating(false), 800);
  };

  const handleNextClick = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    const step = 360 / (filteredEmpleados.length || 1);
    setCurrentRotation(prev => prev - step);
    setTimeout(() => setIsNavigating(false), 800);
  };

  // --- LÓGICA DE GESTOS MÓVILES ---
  const handleTouchStart = (e) => {
    touchStartX.current = e.nativeEvent.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || isNavigating) return;
    const touchEndX = e.nativeEvent.touches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    // Umbral de 50px para evitar giros accidentales al hacer scroll vertical
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNextClick();
      else handlePrevClick();
      touchStartX.current = null; // Reiniciar para el siguiente movimiento
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    touchStartX.current = null;
  };

  // 4. Datos de contacto
  const fetchDatosContacto = (empleado_id) => {
    fetch(`${apiurl}/datoscontacto/empleado/${empleado_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
      setDatosContacto(data);
      const emp = empleados.find(e => e._id === empleado_id);
      setHoveredEmpleado(emp);
    })
    .catch(error => console.error("Error fetching contact data:", error));
  };
  
  function getFullName(empleado) {
    if (!empleado) return "";
    return `${empleado.Nombre || ''} ${empleado.ApelPaterno || ''} ${empleado.ApelMaterno || ''}`.trim();
  }

  // Ajuste de radio dinámico: un poco más pequeño en móviles para que no se "salga" del viewport
  const isMobile = window.innerWidth < 768;
  const radius = isMobile 
    ? Math.max(280, filteredEmpleados.length * 35) 
    : Math.max(450, filteredEmpleados.length * 45);

  return (
    <section className="home" id="home">
      <div className="home-content">
        <div 
          className="carousel-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="gallery-container">
            <div 
              className={`box ${isNavigating ? "is-navigating" : ""}`} 
              style={{ transform: `rotateY(${currentRotation}deg)` }}
            > 
              {filteredEmpleados.map((empleado, index) => {
                const itemAngle = (360 / filteredEmpleados.length) * index;
                return (
                  <div
                    className="card"
                    key={empleado._id}
                    onMouseEnter={() => {
                      if(!isMobile) {
                        fetchDatosContacto(empleado._id);
                        setIsPaused(true);
                      }
                    }}
                    onMouseLeave={() => {
                      if(!isMobile) {
                        setHoveredEmpleado(null);
                        setDatosContacto(null);
                        setIsPaused(false);
                      }
                    }}
                    // Para mobile, activamos la info con un toque largo o tap
                    onClick={() => {
                        if(isMobile) fetchDatosContacto(empleado._id);
                    }}
                    style={{
                      transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                    }}
                  >
                    <img 
                      src={empleado.Fotografias && empleado.Fotografias[0] ? empleado.Fotografias[0] : ""} 
                      alt={getFullName(empleado)} 
                    />
                    <div className="card-info">
                        <p className="card-name">{empleado.Nombre}</p>
                        <Link to={`/Perfil/${empleado._id}`} className="btn-direction">Ver Perfil</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="button-container">
            <div className="button prev" onClick={handlePrevClick}></div>
            <div className="button next" onClick={handleNextClick}></div>
          </div>
        </div>

        {datosContacto && hoveredEmpleado && (
          <div className="info-card-overlay">
            {/* Botón cerrar solo visible en mobile para mejorar UX */}
            <button className="close-info" onClick={() => { setDatosContacto(null); setIsPaused(false); }}>✕</button>
            <div className="info-card-content">
              <h4>{getFullName(hoveredEmpleado)}</h4>
              <hr />
              <p><strong>Email:</strong> {datosContacto.ListaCorreos}</p>
              <p><strong>Celular:</strong> {datosContacto.TelCelular}</p>
              <p><strong>WhatsApp:</strong> {datosContacto.IdWhatsApp}</p>
              <p><strong>Telegram:</strong> {datosContacto.IdTelegram}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Home;