import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUsers, FiShare2, FiBarChart2, FiShield, FiArrowRight } from "react-icons/fi";
import LeadModal from "../Components/LeadModal";
import "./PublicLanding.css";

const FEATURES = [
  [FiUsers, "Expedientes en orden", "Centraliza información laboral, contacto, documentos y seguimiento de cada persona."],
  [FiShare2, "Tu estructura, clara", "Consulta organigrama, áreas, responsables y equipos desde una sola vista."],
  [FiBarChart2, "Decisiones con contexto", "Vacaciones, desempeño, reclutamiento y analítica conectados con tu operación."],
  // "slug" (jerga técnica) reemplazado por "ambiente de trabajo" — pedido
  // explícito del cliente (Observaciones Empleados 2026-09-03, punto 1).
  [FiShield, "Un espacio por empresa", "Cada organización trabaja bajo su propio ambiente de trabajo y sus datos permanecen aislados."],
];

const EASE = [0.16, 1, 0.3, 1];
const TITULO = "Gestiona a tu equipo desde un solo lugar";

// Cada palabra del título sube desde detrás de una "máscara" — el fondo
// azul-verde vivo (AmbientBackground, montado en App) hace el resto.
function TituloAnimado({ texto }) {
  return (
    <h1 aria-label={texto}>
      {texto.split(" ").map((palabra, i) => (
        <span className="pl-word" key={i} aria-hidden="true">
          <motion.span
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.9, ease: EASE }}
          >
            {palabra}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

const aparecer = (delay = 0) => ({
  initial: { opacity: 0, y: 24, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  transition: { delay, duration: 0.8, ease: EASE },
});

export default function PublicLanding() {
  // "Crear mi empresa" / "Comenzar ahora" no navegan directo al alta de
  // tenant (/registro): abren un cuadro de diálogo que solo captura datos de
  // contacto y avisa a Cibercom por correo; Cibercom da de alta a mano
  // (Observaciones Empleados 2026-09-03, punto 2).
  const [mostrarLead, setMostrarLead] = useState(false);

  return (
    <main className="public-site">
      <motion.nav className="public-nav" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <Link to="/" className="public-brand"><span className="public-brand__mark">C</span>CibercomHR</Link>
        <div>
          <Link to="/Login" className="public-link">Ya tengo una cuenta</Link>
          <button type="button" className="public-button public-button--small" onClick={() => setMostrarLead(true)}>Crear mi empresa</button>
        </div>
      </motion.nav>

      <section className="public-hero">
        <TituloAnimado texto={TITULO} />
        <motion.p {...aparecer(0.6)}>
          La operación de RH que tu empresa necesita: expedientes, estructura, vacaciones, desempeño e indicadores dentro de un espacio propio.
        </motion.p>
        <motion.div className="public-actions" {...aparecer(0.75)}>
          <button type="button" className="public-button public-button--glow" onClick={() => setMostrarLead(true)}>
            Crear mi empresa <FiArrowRight className="public-button__arrow" aria-hidden="true" />
          </button>
          <Link to="/Login" className="public-button public-button--ghost">Ya tengo una cuenta</Link>
        </motion.div>
      </section>

      <section className="public-features" aria-label="Capacidades">
        {FEATURES.map(([Icon, title, copy], i) => (
          <motion.article className="public-card" key={title}
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.08, duration: 0.8, ease: EASE }}>
            <span className="public-card__icon"><Icon aria-hidden="true" /></span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </motion.article>
        ))}
      </section>

      <motion.section className="public-cta"
        initial={{ opacity: 0, y: 40, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.9, ease: EASE }}>
        <h2>Un sistema que crece con tu empresa</h2>
        <p>Regístrate y recibe una dirección exclusiva para tu organización.</p>
        <button type="button" className="public-button public-button--glow" onClick={() => setMostrarLead(true)}>
          Comenzar ahora <FiArrowRight className="public-button__arrow" aria-hidden="true" />
        </button>
      </motion.section>

      {mostrarLead && <LeadModal onClose={() => setMostrarLead(false)} />}
    </main>
  );
}
