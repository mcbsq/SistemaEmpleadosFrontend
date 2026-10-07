import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { API_URL } from "../../services/apiConfig";
import { useOrg } from "../../context/OrgContext";
import "./Login.css";

function Login({ setIsAuthenticated, setUserRole }) {
  const { orgConfig } = useOrg();
  const orgName = orgConfig?.name || "CibercomHR";
  const [user,         setUser]         = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message,      setMessage]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recId,        setRecId]        = useState("");
  const [recEstado,    setRecEstado]    = useState(null); // {ok, texto}
  const [recEnviando,  setRecEnviando]  = useState(false);
  // Aviso de por qué se volvió al login (sesión expirada o por inactividad).
  const [aviso] = useState(() => {
    try { const a = sessionStorage.getItem("aviso_login"); sessionStorage.removeItem("aviso_login"); return a; } catch { return null; }
  });

  const solicitarRecuperacion = async (e) => {
    e.preventDefault();
    if (recId.trim().length < 3) { setRecEstado({ ok: false, texto: "Escribe tu usuario o tu correo." }); return; }
    setRecEnviando(true); setRecEstado(null);
    try {
      const res = await fetch(`${API_URL}/recuperar-contrasena`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador: recId.trim(), org_id: sessionStorage.getItem("entry_org_slug") || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      setRecEstado({ ok: res.ok, texto: data.message || data.error || "No se pudo enviar la solicitud." });
    } catch { setRecEstado({ ok: false, texto: "No se pudo conectar. Revisa tu internet." }); }
    finally { setRecEnviando(false); }
  };

  // Contraseña temporal (Aegis): el backend manda must_change_password=true
  // y obligamos a definir una nueva antes de entrar al sistema.
  const [mustChange,   setMustChange]   = useState(false);
  const [newPass,      setNewPass]      = useState("");
  const [newPass2,     setNewPass2]     = useState("");
  const [pendingRole,  setPendingRole]  = useState(null);

  const navigate = useNavigate();

  const enterApp = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    navigate("/Dashboard", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!user || !password) { setMessage("Ingresa usuario y contraseña."); return; }
    setLoading(true);
    try {
      const data = await authService.login({ user, password });
      if (data.must_change_password) {
        setPendingRole(data.role);
        setMustChange(true);
        return;
      }
      enterApp(data.role);
    } catch (error) {
      setMessage(error.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    if (newPass.length < 12) { setMessage("La nueva contraseña debe tener al menos 12 caracteres."); return; }
    if (newPass !== newPass2) { setMessage("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      await authService.changePassword(password, newPass);
      enterApp(pendingRole);
    } catch (error) {
      setMessage(error.message || "No se pudo cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-particles" aria-hidden="true" />
      <div className="login-bg-glow login-bg-glow--a" aria-hidden="true" />
      <div className="login-bg-glow login-bg-glow--b" aria-hidden="true" />

      <div className="login-wrapper">
        {/* Marca */}
        <header className="login-brand">
          <div className="login-brand-icon">
            {orgConfig?.logo ? (
              <img src={orgConfig.logo} alt="" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 10 }} />
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="var(--hr-accent)" fillOpacity="0.15"/>
                <path d="M8 24V10l8-4 8 4v14l-8 4-8-4Z" stroke="var(--hr-accent)" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                <circle cx="16" cy="16" r="3" fill="var(--hr-accent-2)"/>
              </svg>
            )}
          </div>
          <div>
            <h1 className="login-brand-title">{orgName}</h1>
            <p className="login-brand-sub">Cibernética en el Siglo XXI</p>
          </div>
        </header>

        {/* Card principal */}
        <div className="login-card">
          {mustChange ? (
            <>
              <h2 className="login-card-heading">Define tu nueva contraseña</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--hr-muted, #86868b)", marginBottom: 16 }}>
                La contraseña con la que acabas de entrar es la que el sistema te dio por default —
                ahora tienes que reemplazarla por una definitiva que cumpla las siguientes reglas.
              </p>
              <form onSubmit={handleChangePassword} noValidate>
                <div className="login-field">
                  <label className="login-label" htmlFor="login-newpass">Nueva contraseña</label>
                  <div className="login-input-wrap">
                    <input
                      id="login-newpass"
                      type="password"
                      className="login-input"
                      placeholder="Mínimo 12 caracteres"
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="login-field">
                  <label className="login-label" htmlFor="login-newpass2">Confirmar contraseña</label>
                  <div className="login-input-wrap">
                    <input
                      id="login-newpass2"
                      type="password"
                      className="login-input"
                      placeholder="Repite la nueva contraseña"
                      value={newPass2}
                      onChange={e => setNewPass2(e.target.value)}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Reglas que se van palomeando en vivo — pedido explícito
                    del cliente (Observaciones Empleados 2026-09-03, punto 3):
                    "ve palomeando la regla q ya va cumpliendo". Las primeras
                    5 son exactamente lo que Aegis valida del lado del
                    servidor (verificado en vivo contra /v1/auth/change-password,
                    no documentado en su openapi.json — solo aparece al
                    fallar) — mostrarlas de menos sería tan confuso como el
                    error original que reportó el cliente. */}
                <ul className="login-password-rules" aria-live="polite">
                  <li className={`login-rule ${newPass.length >= 12 ? "login-rule--ok" : ""}`}>
                    <span className="login-rule-dot" aria-hidden="true" />
                    Al menos 12 caracteres
                  </li>
                  <li className={`login-rule ${/[A-Z]/.test(newPass) ? "login-rule--ok" : ""}`}>
                    <span className="login-rule-dot" aria-hidden="true" />
                    Al menos una letra mayúscula
                  </li>
                  <li className={`login-rule ${/[a-z]/.test(newPass) ? "login-rule--ok" : ""}`}>
                    <span className="login-rule-dot" aria-hidden="true" />
                    Al menos una letra minúscula
                  </li>
                  <li className={`login-rule ${/[0-9]/.test(newPass) ? "login-rule--ok" : ""}`}>
                    <span className="login-rule-dot" aria-hidden="true" />
                    Al menos un número
                  </li>
                  <li className={`login-rule ${/[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']/.test(newPass) ? "login-rule--ok" : ""}`}>
                    <span className="login-rule-dot" aria-hidden="true" />
                    Al menos un carácter especial (!@#$%^&*…)
                  </li>
                  <li className={`login-rule ${newPass && newPass === newPass2 ? "login-rule--ok" : ""}`}>
                    <span className="login-rule-dot" aria-hidden="true" />
                    Las dos contraseñas coinciden
                  </li>
                </ul>

                {message && (
                  <div className="login-error" role="alert">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {message}
                  </div>
                )}
                <button type="submit" className="login-btn-primary" disabled={loading}>
                  {loading && <span className="login-spinner" aria-hidden="true" />}
                  {loading ? "Guardando..." : "Guardar y entrar"}
                </button>
              </form>
            </>
          ) : (
          <>
          <h2 className="login-card-heading">Acceso al sistema</h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Usuario */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-user">Usuario</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </span>
                <input
                  id="login-user"
                  type="text"
                  className="login-input"
                  placeholder="Tu nombre de usuario"
                  value={user}
                  onChange={e => setUser(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-pass">Contraseña</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  </svg>
                </span>
                <input
                  id="login-pass"
                  type={showPassword ? "text" : "password"}
                  className="login-input login-input--password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {aviso && !message && (
              <div className="login-recovery-info" role="status">
                <span>{aviso}</span>
              </div>
            )}

            {/* Error */}
            {message && (
              <div className="login-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {message}
              </div>
            )}

            <button type="submit" className="login-btn-primary" disabled={loading}>
              {loading && <span className="login-spinner" aria-hidden="true" />}
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          {/* Recuperar contraseña */}
          <button
            type="button"
            className="login-btn-recovery"
            onClick={() => setShowRecovery(v => !v)}
          >
            ¿Olvidaste tu contraseña?
          </button>

          {showRecovery && (
            <form className="login-recovery-form" onSubmit={solicitarRecuperacion}>
              <p className="login-recovery-text">
                Escribe tu usuario o correo. Avisaremos al administrador de tu empresa para que te asigne una contraseña temporal.
              </p>
              <div className="login-input-wrap">
                <input className="login-input" aria-label="Usuario o correo" placeholder="Usuario o correo" value={recId}
                  onChange={e => setRecId(e.target.value)} autoComplete="username" disabled={recEnviando || recEstado?.ok} />
              </div>
              {recEstado && (
                <div className={recEstado.ok ? "login-recovery-info" : "login-error"} role={recEstado.ok ? "status" : "alert"}>
                  <span>{recEstado.texto}</span>
                </div>
              )}
              {!recEstado?.ok && (
                <button type="submit" className="login-btn-primary" disabled={recEnviando}>
                  {recEnviando ? "Enviando…" : "Pedir nueva contraseña"}
                </button>
              )}
            </form>
          )}
          </>
          )}
        </div>

        <p className="login-footer-note">
          © {new Date().getFullYear()} Cibernética en el Siglo XXI
        </p>
      </div>
    </div>
  );
}

export default Login;