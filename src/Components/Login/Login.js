import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import "./Login.css";

function Login({ setIsAuthenticated, setUserRole }) {
  const [user,         setUser]         = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message,      setMessage]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!user || !password) { setMessage("Ingresa usuario y contraseña."); return; }
    setLoading(true);
    try {
      const data = await authService.login({ user, password });
      setIsAuthenticated(true);
      setUserRole(data.role);
      navigate("/Dashboard", { replace: true });
    } catch (error) {
      setMessage(error.message || "No se pudo conectar con el servidor.");
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
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="var(--hr-accent)" fillOpacity="0.15"/>
              <path d="M8 24V10l8-4 8 4v14l-8 4-8-4Z" stroke="var(--hr-accent)" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <circle cx="16" cy="16" r="3" fill="var(--hr-accent-2)"/>
            </svg>
          </div>
          <div>
            <h1 className="login-brand-title">CibercomHR</h1>
            <p className="login-brand-sub">Cibernética en el Siglo XXI</p>
          </div>
        </header>

        {/* Card principal */}
        <div className="login-card">
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
            <div className="login-recovery-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{flexShrink:0, marginTop:2}}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                La recuperación de contraseña está gestionada por el sistema de identidad corporativo.
                Contacta a tu administrador de TI o accede al portal de autoservicio de tu organización.
              </span>
            </div>
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