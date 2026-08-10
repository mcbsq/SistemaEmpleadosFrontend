// src/Components/GestionUsuarios.jsx
// SUPER_ADMIN — panel de cuentas del sistema. Aegis (el proveedor de
// identidad) nunca expone contraseñas existentes en texto plano: lo único
// posible es RESTABLECER (genera una temporal nueva) y mostrarla una sola
// vez, igual que al dar de alta un empleado. Cada reseteo queda en la
// auditoría (quién y cuándo, nunca el valor).
import React, { useState, useEffect, useCallback } from "react";
import { FiUsers, FiRefreshCw, FiCheckCircle, FiXCircle, FiCopy, FiX, FiAlertTriangle } from "react-icons/fi";
import { usuarioService } from "../services/usuarioService";

function getId(item) { return item?._id?.$oid || item?._id || ""; }

function TempPasswordModal({ resultado, onClose }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(resultado.temp_password || "");
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };
  return (
    <div className="nb-overlay" onClick={onClose}>
      <div className="nb-panel" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="nb-panel-header">
          <span>Contraseña restablecida</span>
          <button className="nb-close-btn" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </div>
        <div style={{ padding: 20 }}>
          {resultado.email_sent ? (
            <p className="orgs-desc">Se envió por correo a <strong>{resultado.user}</strong>. Deberá cambiarla en su próximo inicio de sesión.</p>
          ) : (
            <>
              <p className="orgs-desc" style={{ marginBottom: 10 }}>
                Sin SMTP configurado — entrega esta contraseña temporal a <strong>{resultado.user}</strong> en mano.
                Solo se muestra una vez: ni el sistema ni Aegis la vuelven a exponer.
              </p>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--hr-bg)", border: "1px solid var(--hr-border)",
                borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: "0.9rem",
              }}>
                <span style={{ flex: 1, wordBreak: "break-all" }}>{resultado.temp_password}</span>
                <button className="orgs-refresh-btn" onClick={copiar}>
                  <FiCopy style={{ verticalAlign: "-2px", marginRight: 4 }} />{copiado ? "Copiada" : "Copiar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reseteando, setReseteando] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usuarioService.getAll().catch(() => []);
      setUsuarios(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const restablecer = async (u) => {
    const id = getId(u);
    if (!window.confirm(`¿Restablecer la contraseña de "${u.user}"? Se generará una nueva contraseña temporal.`)) return;
    setReseteando(id);
    setError("");
    try {
      const res = await usuarioService.update(id, { password: "__reset__" });
      setResultado({ ...res, user: u.user });
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo restablecer la contraseña.");
    } finally {
      setReseteando(null);
    }
  };

  return (
    <div className="orgs-root">
      {resultado && <TempPasswordModal resultado={resultado} onClose={() => setResultado(null)} />}

      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiUsers style={{ marginRight: 8, verticalAlign: "-3px" }} />Cuentas del sistema</h2>
          <p className="hr-subtitle">
            Usuarios, rol y estado de la identidad en Aegis · SUPER_ADMIN. Las contraseñas nunca son visibles —
            solo se pueden restablecer, y la nueva se muestra una única vez.
          </p>
        </div>
      </div>

      {error && (
        <p className="orgs-desc" style={{ color: "var(--hr-danger, #e86b5f)", marginBottom: 10 }}>
          <FiAlertTriangle style={{ verticalAlign: "-2px", marginRight: 4 }} />{error}
        </p>
      )}

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : usuarios.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiUsers /></span>
          <p>Sin usuarios registrados todavía.</p>
        </div>
      ) : (
        <div className="orgs-incident-list">
          {usuarios.map(u => {
            const id = getId(u);
            const aegis = u.aegis;
            return (
              <div key={id} className="orgs-incident-row">
                <span className={`orgs-sev-badge ${aegis?.is_active === false ? "orgs-sev--error" : "orgs-sev--info"}`}>
                  {aegis?.is_active === false ? <FiXCircle /> : <FiCheckCircle />}
                </span>
                <div className="orgs-incident-info">
                  <span className="orgs-incident-msg">{u.user}</span>
                  <span className="orgs-incident-meta">
                    {u.role}{u.email ? ` · ${u.email}` : ""}
                    {aegis?.must_change_password && " · Pendiente de cambiar contraseña"}
                    {aegis === null && " · Sin identidad Aegis vinculada"}
                  </span>
                </div>
                <div className="orgs-apikey-actions">
                  <button className="orgs-refresh-btn" onClick={() => restablecer(u)} disabled={reseteando === id}>
                    <FiRefreshCw style={{ verticalAlign: "-2px", marginRight: 4 }} />
                    {reseteando === id ? "Restableciendo…" : "Restablecer contraseña"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GestionUsuarios;
