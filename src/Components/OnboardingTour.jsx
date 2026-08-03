// src/Components/OnboardingTour.jsx
// Tour guiado para usuarios nuevos: oscurece la pantalla y deja un "hueco" de
// luz sobre el elemento que se explica, con un tooltip al lado — mismo patrón
// que el onboarding de Perrucho. Se dispara una sola vez por usuario (se
// recuerda en localStorage) la primera vez que entra al Dashboard.
import React, { useState, useEffect, useCallback } from "react";
import { FiX, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import "./OnboardingTour.css";

const PASOS_BASE = [
  {
    selector: "[data-tour='logo']",
    titulo: "Bienvenido a Cibercom",
    texto: "Este es tu sistema de gestión de empleados. Te damos un recorrido rápido de 30 segundos por lo esencial.",
  },
  {
    selector: "[data-tour='dashboard']",
    titulo: "Dashboard",
    texto: "Aquí ves los KPIs de tu empresa: total de empleados, áreas, cumpleaños del mes y más.",
  },
  {
    selector: "[data-tour='notificaciones']",
    titulo: "Notificaciones",
    texto: "Cuando algo requiera tu atención — una solicitud de vacaciones, una evaluación pendiente — te avisamos aquí.",
  },
  {
    selector: "[data-tour='mi-perfil']",
    titulo: "Tu perfil",
    texto: "Consulta y edita tu información personal, laboral y documentos desde aquí.",
  },
  {
    selector: "body",
    titulo: "Búsqueda rápida",
    texto: "Presiona ⌘K (o Ctrl+K) en cualquier momento para buscar empleados y secciones al instante.",
    fullscreen: true,
  },
];

const STORAGE_PREFIX = "onboarding_visto_";

function getRect(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function OnboardingTour() {
  const [activo, setActivo] = useState(false);
  const [paso, setPaso] = useState(0);
  const [rect, setRect] = useState(null);
  const [pasosDisponibles, setPasosDisponibles] = useState([]);

  const usuario = sessionStorage.getItem("user_name") || "anon";
  const storageKey = `${STORAGE_PREFIX}${usuario}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    // Espera a que el dashboard termine de montar sus elementos con data-tour.
    const timeout = setTimeout(() => {
      const disponibles = PASOS_BASE.filter(p => p.fullscreen || document.querySelector(p.selector));
      if (disponibles.length > 0) {
        setPasosDisponibles(disponibles);
        setActivo(true);
      }
    }, 900);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualizarRect = useCallback(() => {
    if (!activo || !pasosDisponibles[paso]) return;
    const p = pasosDisponibles[paso];
    setRect(p.fullscreen ? null : getRect(p.selector));
  }, [activo, paso, pasosDisponibles]);

  useEffect(() => {
    actualizarRect();
    window.addEventListener("resize", actualizarRect);
    return () => window.removeEventListener("resize", actualizarRect);
  }, [actualizarRect]);

  const finalizar = () => {
    localStorage.setItem(storageKey, "1");
    setActivo(false);
  };

  if (!activo || pasosDisponibles.length === 0) return null;

  const actual = pasosDisponibles[paso];
  const esUltimo = paso === pasosDisponibles.length - 1;

  // Posición del tooltip: a la derecha del elemento si hay espacio, si no debajo.
  const TOOLTIP_ALTO_APROX = 190;
  let tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const espacioDerecha = window.innerWidth - rect.right;
    const topMax = window.innerHeight - TOOLTIP_ALTO_APROX - 16;
    if (espacioDerecha > 340) {
      tooltipStyle = { top: Math.min(Math.max(20, rect.top), topMax), left: rect.right + 20, transform: "none" };
    } else {
      const debajoCabe = rect.bottom + TOOLTIP_ALTO_APROX < window.innerHeight;
      const top = debajoCabe ? rect.bottom + 16 : Math.max(20, rect.top - TOOLTIP_ALTO_APROX - 16);
      tooltipStyle = { top: Math.min(top, topMax), left: Math.max(20, rect.left), transform: "none" };
    }
  }

  return (
    <div className={`ot-overlay ${!rect ? "ot-overlay--dark" : ""}`}>
      {rect && (
        <div
          className="ot-spotlight"
          style={{
            top: rect.top - 8, left: rect.left - 8,
            width: rect.width + 16, height: rect.height + 16,
          }}
        />
      )}
      <div className="ot-tooltip" style={tooltipStyle}>
        <button className="ot-close" onClick={finalizar} aria-label="Cerrar tour"><FiX /></button>
        <div className="ot-tooltip-titulo">{actual.titulo}</div>
        <p className="ot-tooltip-texto">{actual.texto}</p>
        <div className="ot-tooltip-footer">
          <span className="ot-tooltip-progreso">{paso + 1} / {pasosDisponibles.length}</span>
          <div className="ot-tooltip-nav">
            {paso > 0 && (
              <button className="ot-btn-ghost" onClick={() => setPaso(p => p - 1)}><FiChevronLeft /></button>
            )}
            {esUltimo ? (
              <button className="ot-btn-primary" onClick={finalizar}>Entendido</button>
            ) : (
              <button className="ot-btn-primary" onClick={() => setPaso(p => p + 1)}>
                Siguiente <FiChevronRight style={{ verticalAlign: "-2px" }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
