import React, { useState } from "react";
import { Link } from "react-router-dom";
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

export default function PublicLanding() {
  // "Crear mi empresa" / "Comenzar ahora" ya no navegan directo al alta de
  // tenant (/registro) — abren un cuadro de diálogo que solo captura datos
  // de contacto y avisa a Cibercom por correo; Cibercom da de alta a mano
  // (mismo pedido del cliente).
  const [mostrarLead, setMostrarLead] = useState(false);

  return <main className="public-site">
    <nav className="public-nav"><Link to="/" className="public-brand">CibercomHR</Link><div><Link to="/Login" className="public-link">Ya tengo una cuenta</Link><button type="button" className="public-button public-button--small" onClick={() => setMostrarLead(true)}>Crear mi empresa</button></div></nav>
    <section className="public-hero"><span className="public-eyebrow">Recursos humanos, sin fragmentación</span><h1>Gestiona a tu equipo desde un solo lugar</h1><p>La operación de RH que tu empresa necesita: expedientes, estructura, vacaciones, desempeño e indicadores dentro de un espacio propio.</p><div className="public-actions"><button type="button" className="public-button" onClick={() => setMostrarLead(true)}>Crear mi empresa <FiArrowRight /></button><Link to="/Login" className="public-button public-button--ghost">Ya tengo una cuenta</Link></div></section>
    <section className="public-features" aria-label="Capacidades">{FEATURES.map(([Icon, title, copy]) => <article className="public-card" key={title}><span className="public-card__icon"><Icon /></span><h2>{title}</h2><p>{copy}</p></article>)}</section>
    <section className="public-cta"><h2>Un sistema que crece con tu empresa</h2><p>Regístrate y recibe una dirección exclusiva para tu organización.</p><button type="button" className="public-button" onClick={() => setMostrarLead(true)}>Comenzar ahora <FiArrowRight /></button></section>

    {mostrarLead && <LeadModal onClose={() => setMostrarLead(false)} />}
  </main>;
}
