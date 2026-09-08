// src/Components/LeadModal.jsx
// Cuadro de diálogo de "Crear mi empresa" / "Comenzar ahora" en el sitio
// público — captura nombre/correo/teléfono/notas y los manda por correo a
// Cibercom (api/leads/routes.py). No crea ningún tenant ni cuenta; es
// puramente una solicitud de información, pedido explícito del cliente
// (Observaciones Empleados 2026-09-03, punto 2).
import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { leadsService } from "../services/leadsService";
import "./LeadModal.css";

// El backend devuelve códigos cortos (ver api/leads/logic.py), no mensajes
// para mostrar directo al usuario — se traducen aquí.
const MENSAJES_ERROR = {
  invalid_lead: "Revisa que el correo y el teléfono sean válidos.",
  rate_limited: "Ya enviaste varias solicitudes seguidas — intenta de nuevo en un rato.",
  email_delivery_failed: "No pudimos enviar tu solicitud en este momento. Intenta de nuevo en unos minutos.",
};

function LeadModal({ onClose }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !correo.trim() || !telefono.trim()) {
      setError("Nombre, correo y teléfono son obligatorios.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await leadsService.crear({ nombre, correo, telefono, notas });
      setEnviado(true);
    } catch (err) {
      setError(MENSAJES_ERROR[err.message] || "No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="lead-modal-overlay" onClick={onClose}>
      <div className="lead-modal" onClick={e => e.stopPropagation()}>
        <button className="lead-modal-close" onClick={onClose} aria-label="Cerrar"><FiX /></button>

        {enviado ? (
          <div className="lead-modal-success">
            <h3>¡Listo! Ya enviamos tu solicitud</h3>
            <p>Un asesor de Cibercom te va a contactar en breve para darte de alta.</p>
            <button className="lead-modal-submit" onClick={onClose}>Entendido</button>
          </div>
        ) : (
          <>
            <h3 className="lead-modal-title">Ingresa tus datos para enviarte información detallada.</h3>
            <form onSubmit={handleSubmit} noValidate>
              <input
                className="lead-modal-input"
                placeholder="Nombre completo"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                disabled={enviando}
                autoFocus
              />
              <input
                className="lead-modal-input"
                type="email"
                placeholder="Correo electrónico"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                disabled={enviando}
              />
              <input
                className="lead-modal-input"
                placeholder="Teléfono de contacto"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                disabled={enviando}
              />
              <textarea
                className="lead-modal-input lead-modal-textarea"
                placeholder="Notas (opcional)"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                disabled={enviando}
                rows={3}
              />
              {error && <p className="lead-modal-error">{error}</p>}
              <div className="lead-modal-actions">
                <button type="button" className="lead-modal-cancel" onClick={onClose} disabled={enviando}>Cancelar</button>
                <button type="submit" className="lead-modal-submit" disabled={enviando}>
                  {enviando ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default LeadModal;
