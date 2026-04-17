import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "./EmployeeQuickView.css";
import { contactoService } from "../services/contactoService";
import { rhService }        from "../services/rhService";
import { clinicoService }   from "../services/clinicoService";
import { authService }      from "../services/authService";

// ─── Helper: extraer ID ───────────────────────────────────────────────────────
const getId = (item) => item?._id?.$oid || item?._id || "";

const AVATAR_COLORS = [
  ["#dbeafe","#1d4ed8"],["#dcfce7","#15803d"],["#fef3c7","#b45309"],
  ["#ede9fe","#6d28d9"],["#fce7f3","#be185d"],["#e0f2fe","#0369a1"],
  ["#fff7ed","#c2410c"],["#f0fdf4","#166534"],
];
const avatarColor = (str = "") =>
  AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Fila de dato ─────────────────────────────────────────────────────────────
const Row = ({ label, value, mono = false }) => {
  if (!value) return null;
  return (
    <div className="eqv-row">
      <span className="eqv-key">{label}</span>
      <span className={`eqv-val ${mono ? "eqv-val--mono" : ""}`}>{value}</span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// Props:
//   emp        — objeto empleado completo (requerido)
//   anchorRect — { top, left, width, height } del elemento que lo abrió
//   onClose    — función para cerrar
// ════════════════════════════════════════════════════════════════════════════════
function EmployeeQuickView({ emp, anchorRect, onClose }) {
  const [contacto,  setContacto]  = useState(null);
  const [rh,        setRh]        = useState(null);
  const [clinico,   setClinico]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const panelRef = useRef(null);

  const empId = getId(emp);
  const canViewClinical = authService.isSuperAdmin() || authService.isAdmin();

  // Cargar datos del empleado
  useEffect(() => {
    if (!empId) return;
    Promise.all([
      contactoService.getDatosByEmpleado(empId).catch(() => null),
      rhService.getByEmpleado(empId).catch(() => null),
      canViewClinical
        ? clinicoService.getByEmpleado(empId).catch(() => null)
        : Promise.resolve(null),
    ]).then(([cont, rhData, clin]) => {
      setContacto(cont);
      setRh(rhData);
      setClinico(clin);
    }).finally(() => setLoading(false));
  }, [empId, canViewClinical]);

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cerrar al clic fuera
  useEffect(() => {
    const onClickOut = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    // Delay para que el clic que abrió no lo cierre inmediatamente
    const tid = setTimeout(() => document.addEventListener("mousedown", onClickOut), 100);
    return () => { clearTimeout(tid); document.removeEventListener("mousedown", onClickOut); };
  }, [onClose]);

  // Posicionamiento: aparece a la derecha o izquierda según espacio
  const style = {};
  if (anchorRect) {
    const panelW  = 300;
    const spaceRight = window.innerWidth - anchorRect.right;
    if (spaceRight >= panelW + 12) {
      style.left = anchorRect.right + 12;
    } else {
      style.left = Math.max(8, anchorRect.left - panelW - 12);
    }
    style.top = Math.min(
      anchorRect.top,
      window.innerHeight - 420
    );
    style.position = "fixed";
    style.zIndex = 1000;
  }

  const nombre = [emp?.Nombre, emp?.ApelPaterno, emp?.ApelMaterno].filter(Boolean).join(" ");
  const inicial1 = emp?.Nombre?.[0] || "";
  const inicial2 = emp?.ApelPaterno?.[0] || "";
  const ini = (inicial1 + inicial2).toUpperCase();
  const [bgColor, fgColor] = avatarColor(emp?.Nombre || "");
  const foto = emp?.Fotografias?.[0] || emp?.Fotografia;

  return (
    <>
      {/* Backdrop semitransparente */}
      <div className="eqv-backdrop" onClick={onClose} />

      <div className="eqv-panel" ref={panelRef} style={style}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="eqv-header">
          <button className="eqv-close" onClick={onClose} aria-label="Cerrar">✕</button>
          <div className="eqv-avatar-wrap">
            {foto ? (
              <img src={foto} alt={nombre} className="eqv-avatar-img"
                onError={e => { e.target.style.display = "none"; }} />
            ) : (
              <div className="eqv-avatar-ph" style={{ background: bgColor, color: fgColor }}>
                {ini || "?"}
              </div>
            )}
            {rh?.Puesto && (
              <span className="eqv-puesto-badge">{rh.Puesto}</span>
            )}
          </div>
          <div className="eqv-name-wrap">
            <h3 className="eqv-name">{nombre}</h3>
            {rh?.JefeInmediato && (
              <p className="eqv-jefe">Reporta a: {rh.JefeInmediato}</p>
            )}
          </div>
        </div>

        {/* ── Contenido ────────────────────────────────────────────── */}
        <div className="eqv-body">
          {loading ? (
            <div className="eqv-loading">
              <div className="eqv-spinner" />
              <span>Cargando datos…</span>
            </div>
          ) : (
            <>
              {/* Contacto */}
              {(contacto?.TelCelular || contacto?.IdWhatsApp || contacto?.ListaCorreos) && (
                <div className="eqv-section">
                  <div className="eqv-section-title">Contacto</div>
                  <Row label="Celular"   value={contacto?.TelCelular} mono />
                  <Row label="WhatsApp"  value={contacto?.IdWhatsApp} mono />
                  <Row label="Telegram"  value={contacto?.IdTelegram} mono />
                  <Row label="Correo"    value={contacto?.ListaCorreos} />
                </div>
              )}

              {/* RH */}
              {rh && (
                <div className="eqv-section">
                  <div className="eqv-section-title">RH</div>
                  <Row label="Horario"
                    value={rh?.HorarioLaboral?.HoraEntrada
                      ? `${rh.HorarioLaboral.HoraEntrada} – ${rh.HorarioLaboral.HoraSalida}`
                      : null}
                  />
                  <Row label="Días"     value={rh?.HorarioLaboral?.DiasTrabajados} />
                  <Row label="Comida"   value={rh?.HorarioLaboral?.TiempoComida} />
                </div>
              )}

              {/* Clínico — solo roles con acceso */}
              {canViewClinical && clinico && (
                <div className="eqv-section">
                  <div className="eqv-section-title">Clínico</div>
                  <Row label="Sangre"   value={clinico?.tipoSangre} />
                  <Row label="NSS"      value={clinico?.NumeroSeguroSocial} mono />
                  <Row label="Seguro"   value={clinico?.Segurodegastosmedicos} />
                </div>
              )}

              {/* Vacío */}
              {!contacto && !rh && !clinico && (
                <p className="eqv-empty">Sin datos adicionales registrados.</p>
              )}
            </>
          )}
        </div>

        {/* ── Footer con link al perfil completo ───────────────────── */}
        <div className="eqv-footer">
          <Link to={`/Perfil/${empId}`} className="eqv-profile-btn" onClick={onClose}>
            Ver perfil completo →
          </Link>
        </div>
      </div>
    </>
  );
}

export default EmployeeQuickView;