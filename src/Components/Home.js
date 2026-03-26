import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import { empleadoService } from "../services/empleadoService";
import { contactoService }  from "../services/contactoService";
import { authService }      from "../services/authService";
import { rhService }        from "../services/rhService";

const DEFAULT_AVATAR = "/default-avatar.png";

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
  const [empleados,          setEmpleados]          = useState([]);
  const [datosCargados,      setDatosCargados]      = useState(false);
  const [hoveredEmpleado,    setHoveredEmpleado]    = useState(null);
  const [datosContacto,      setDatosContacto]      = useState(null);
  const [currentRotation,    setCurrentRotation]    = useState(0);
  const [isPaused,           setIsPaused]           = useState(false);
  const [isNavigating,       setIsNavigating]       = useState(false);
  const [windowWidth,        setWindowWidth]        = useState(window.innerWidth);

  const autoRotateRef = useRef(null);
  const touchStartX   = useRef(null);

  const isSuperAdmin = authService.isSuperAdmin();
  const empleadoId   = authService.getEmpleadoId();

  // ─── Responsive window width ────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ─── Carga de empleados filtrada por rol ────────────────────────────────────
  const cargarEmpleados = useCallback(async () => {
    try {
      const todos = await empleadoService.getAll();

      if (isSuperAdmin || !empleadoId) {
        // SUPER_ADMIN ve a todos
        setEmpleados(todos);
      } else {
        // Empleado: obtener jerarquía y filtrar por área
        const jerarquia = await rhService.getJerarquia()
          .then(d => d.jerarquia || d)
          .catch(() => null);

        if (!jerarquia) {
          // Si no hay jerarquía, al menos muestra a sí mismo
          const self = todos.find(e => e._id === empleadoId);
          setEmpleados(self ? [self] : todos);
        } else {
          // Buscar su subárbol (él + su equipo directo) y también su cadena hacia arriba
          const subArbol = encontrarSubarbol(jerarquia, empleadoId);
          const idsEnArea = subArbol
            ? extraerIdsDeArbol(subArbol)
            : new Set([empleadoId]);

          // También incluir al jefe inmediato si está en el árbol
          const filtrados = todos.filter(e =>
            idsEnArea.has(e._id) || e._id === empleadoId
          );

          setEmpleados(filtrados.length > 0 ? filtrados : todos);
        }
      }
    } catch (err) {
      console.error("Error cargando empleados:", err);
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
      // Sin datos de contacto — mostramos solo el nombre
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
                const foto = emp.Fotografias?.[0] || emp.Fotografia || DEFAULT_AVATAR;

                return (
                  <div
                    key={emp._id}
                    className="card"
                    style={{ transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)` }}
                    onMouseEnter={() => {
                      if (!isMobile) { fetchDatosContacto(emp._id); setIsPaused(true); }
                    }}
                    onMouseLeave={() => {
                      if (!isMobile) cerrarInfo();
                    }}
                    onClick={() => {
                      if (isMobile) fetchDatosContacto(emp._id);
                    }}
                  >
                    <img
                      src={foto}
                      alt={getFullName(emp)}
                      onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                    />
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
            <div className="button prev" onClick={handlePrevClick} />
            <div className="button next" onClick={handleNextClick} />
          </div>
        </div>

        {/* ── Info card ── */}
        {datosContacto && hoveredEmpleado && (
          <div className="info-card-overlay">
            <button className="close-info" onClick={cerrarInfo}>✕</button>
            <div className="info-card-content">
              <h4>{getFullName(hoveredEmpleado)}</h4>
              <hr />
              {datosContacto.ListaCorreos && (
                <p><strong>Email</strong>{datosContacto.ListaCorreos}</p>
              )}
              {datosContacto.TelCelular && (
                <p><strong>Celular</strong>{datosContacto.TelCelular}</p>
              )}
              {datosContacto.IdWhatsApp && (
                <p><strong>WhatsApp</strong>{datosContacto.IdWhatsApp}</p>
              )}
              {datosContacto.IdTelegram && (
                <p><strong>Telegram</strong>{datosContacto.IdTelegram}</p>
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