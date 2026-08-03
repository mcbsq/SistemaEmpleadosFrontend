import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiX, FiChevronLeft, FiChevronRight, FiUser, FiMail, FiPhone, FiMessageCircle, FiSend } from "react-icons/fi";
import "./Home.css";
import { empleadoService } from "../services/empleadoService";
import { contactoService }  from "../services/contactoService";
import { authService }      from "../services/authService";
import { rhService }        from "../services/rhService";

// Sin PNG externo — un ícono simple es más robusto que un asset que puede
// faltar (y evita el parpadeo de "imagen rota" antes de que dispare onError).
const AVATAR_BG = ["#5B8AF0","#4ECAAC","#F5A623","#B57EDC","#E86B5F","#59C1E8"];
const colorForName = (str = "") => AVATAR_BG[(str.charCodeAt(0) || 0) % AVATAR_BG.length];

// ─── Helper: extraer todos los IDs de empleados de un subárbol ───────────────
const extraerIdsDeArbol = (nodo, ids = new Set()) => {
  if (nodo?.attributes?.Id) ids.add(nodo.attributes.Id);
  nodo?.children?.forEach(h => extraerIdsDeArbol(h, ids));
  return ids;
};

// ─── Helper: encontrar el subárbol del empleado ───────────────────────────────
const encontrarSubarbol = (nodo, empleadoId) => {
  if (nodo?.attributes?.Id === empleadoId) return nodo;
  for (const hijo of nodo?.children ?? []) {
    const found = encontrarSubarbol(hijo, empleadoId);
    if (found) return found;
  }
  return null;
};

function Home() {
  const [empleados,       setEmpleados]       = useState([]);
  const [datosCargados,   setDatosCargados]   = useState(false);
  const [hoveredEmpleado, setHoveredEmpleado] = useState(null);
  const [datosContacto,   setDatosContacto]   = useState(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isPaused,        setIsPaused]        = useState(false);
  const [isNavigating,    setIsNavigating]    = useState(false);
  const [windowWidth,     setWindowWidth]     = useState(window.innerWidth);

  const autoRotateRef = useRef(null);
  const touchStartX   = useRef(null);
  const closeTimeoutRef = useRef(null);

  const isSuperAdmin = authService.isSuperAdmin();
  const empleadoId   = authService.getEmpleadoId();

  // ─── Responsive ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ─── Carga de empleados ──────────────────────────────────────────────────────
  const cargarEmpleados = useCallback(async () => {
    try {
      const todos = await empleadoService.getAll();

      // ── Guardia: si el backend devuelve error u objeto en vez de array ──────
      if (!Array.isArray(todos)) {
        console.warn("empleadoService.getAll() no devolvió un array:", todos);
        setEmpleados([]);
        return;
      }

      if (isSuperAdmin || !empleadoId) {
        setEmpleados(todos);
      } else {
        const jerarquia = await rhService.getJerarquia()
          .then(d => d.jerarquia || d)
          .catch(() => null);

        if (!jerarquia) {
          const self = todos.find(e => e._id === empleadoId);
          setEmpleados(self ? [self] : todos);
        } else {
          const subArbol   = encontrarSubarbol(jerarquia, empleadoId);
          const idsEnArea  = subArbol
            ? extraerIdsDeArbol(subArbol)
            : new Set([empleadoId]);

          const filtrados = todos.filter(e =>
            idsEnArea.has(e._id) || e._id === empleadoId
          );
          setEmpleados(filtrados.length > 0 ? filtrados : todos);
        }
      }
    } catch (err) {
      console.error("Error cargando empleados:", err);
      setEmpleados([]); // nunca dejar el estado sin array
    } finally {
      setDatosCargados(true);
    }
  }, [isSuperAdmin, empleadoId]);

  useEffect(() => { cargarEmpleados(); }, [cargarEmpleados]);

  // ─── Auto-rotación ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPaused && !isNavigating && empleados.length > 0) {
      autoRotateRef.current = setInterval(() => {
        setCurrentRotation(prev => prev - 0.2);
      }, 30);
    } else {
      clearInterval(autoRotateRef.current);
    }
    return () => clearInterval(autoRotateRef.current);
  }, [isPaused, isNavigating, empleados.length]);

  // ─── Navegación ─────────────────────────────────────────────────────────────
  const step = 360 / (empleados.length || 1);

  const handlePrevClick = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    setCurrentRotation(prev => prev + step);
    setTimeout(() => setIsNavigating(false), 800);
  };

  const handleNextClick = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    setCurrentRotation(prev => prev - step);
    setTimeout(() => setIsNavigating(false), 800);
  };

  // ─── Gestos táctiles ────────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.nativeEvent.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || isNavigating) return;
    const diff = touchStartX.current - e.nativeEvent.touches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? handleNextClick() : handlePrevClick();
      touchStartX.current = null;
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    touchStartX.current = null;
  };

  // ─── Info de contacto al hover ──────────────────────────────────────────────
  const fetchDatosContacto = useCallback(async (empId) => {
    try {
      const data = await contactoService.getDatosByEmpleado(empId);
      const emp  = empleados.find(e => e._id === empId);
      setDatosContacto(data);
      setHoveredEmpleado(emp);
    } catch {
      const emp = empleados.find(e => e._id === empId);
      setDatosContacto({});
      setHoveredEmpleado(emp);
    }
  }, [empleados]);

  const cerrarInfo = () => {
    setDatosContacto(null);
    setHoveredEmpleado(null);
    setIsPaused(false);
  };

  // El overlay vive lejos de la tarjeta en pantalla (arriba a la derecha),
  // así que un mouseleave de la tarjeta no debe cerrarlo de inmediato —
  // le da tiempo al cursor de llegar hasta el overlay antes de decidir que
  // el usuario realmente se fue.
  const programarCierre = () => {
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(cerrarInfo, 250);
  };
  const cancelarCierre = () => clearTimeout(closeTimeoutRef.current);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const getFullName = (emp) =>
    [emp?.Nombre, emp?.ApelPaterno, emp?.ApelMaterno].filter(Boolean).join(" ");

  const isMobile = windowWidth < 768;
  const radius   = isMobile
    ? Math.max(280, empleados.length * 35)
    : Math.max(450, empleados.length * 45);

  if (!datosCargados) {
    return (
      <section className="home" id="home">
        <div className="home-loading">
          <div className="home-loading-ring" />
        </div>
      </section>
    );
  }

  return (
    <section className="home" id="home">
      <div className="home-content">
        {!isSuperAdmin && (
          <p className="home-scope-label">Tu equipo</p>
        )}

        {/* Carrusel vacío — no rompe si no hay empleados */}
        {empleados.length === 0 ? (
          <div className="home-empty">
            <p>No hay empleados registrados aún.</p>
          </div>
        ) : (
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
                {empleados.map((emp, index) => {
                  const itemAngle = (360 / empleados.length) * index;
                  const foto = emp.Fotografias?.[0] || emp.Fotografia || null;
                  const nombreCompleto = getFullName(emp) || emp.Nombre || "";
                  const inicial = (nombreCompleto.trim()[0] || "?").toUpperCase();

                  return (
                    <div
                      key={emp._id}
                      className="card"
                      style={{ transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)` }}
                      onMouseEnter={() => {
                        if (!isMobile) { cancelarCierre(); fetchDatosContacto(emp._id); setIsPaused(true); }
                      }}
                      onMouseLeave={() => {
                        if (!isMobile) programarCierre();
                      }}
                      onClick={() => {
                        if (isMobile) fetchDatosContacto(emp._id);
                      }}
                    >
                      {foto ? (
                        <img
                          src={foto}
                          alt={nombreCompleto}
                          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                        />
                      ) : null}
                      <div className="card-avatar-fallback" style={{ display: foto ? "none" : "flex", background: colorForName(nombreCompleto) }}>
                        {nombreCompleto ? <span>{inicial}</span> : <FiUser />}
                      </div>
                      <div className="card-info">
                        <p className="card-name">{emp.Nombre}</p>
                        <Link to={`/Perfil/${emp._id}`} className="btn-direction">
                          Ver Perfil
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="button-container">
              <button className="button prev" onClick={handlePrevClick} aria-label="Anterior"><FiChevronLeft /></button>
              <button className="button next" onClick={handleNextClick} aria-label="Siguiente"><FiChevronRight /></button>
            </div>
          </div>
        )}

        {/* ── Info card — el mouseenter cancela el cierre programado al salir
             de la tarjeta, así se puede interactuar con este panel ── */}
        {datosContacto && hoveredEmpleado && (
          <div
            className="info-card-overlay"
            onMouseEnter={cancelarCierre}
            onMouseLeave={() => !isMobile && programarCierre()}
          >
            <button className="close-info" onClick={cerrarInfo}><FiX /></button>
            <div className="info-card-content">
              <h4>{getFullName(hoveredEmpleado)}</h4>
              <hr />
              {datosContacto.ListaCorreos && (
                <p><strong><FiMail style={{verticalAlign:"-2px",marginRight:4}}/>Email</strong>{datosContacto.ListaCorreos}</p>
              )}
              {datosContacto.TelCelular && (
                <p><strong><FiPhone style={{verticalAlign:"-2px",marginRight:4}}/>Celular</strong>{datosContacto.TelCelular}</p>
              )}
              {datosContacto.IdWhatsApp && (
                <p><strong><FiMessageCircle style={{verticalAlign:"-2px",marginRight:4}}/>WhatsApp</strong>{datosContacto.IdWhatsApp}</p>
              )}
              {datosContacto.IdTelegram && (
                <p><strong><FiSend style={{verticalAlign:"-2px",marginRight:4}}/>Telegram</strong>{datosContacto.IdTelegram}</p>
              )}
              {!datosContacto.ListaCorreos && !datosContacto.TelCelular && (
                <p className="no-contact">Sin datos de contacto registrados.</p>
              )}
              <Link to={`/Perfil/${hoveredEmpleado._id}`} className="btn-ver-perfil">
                Ver perfil completo →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Home;