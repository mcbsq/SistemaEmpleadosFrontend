import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import LoginForm from "./LoginForm";
// ✔ Importación única y correcta hacia la carpeta services
import { authService } from "../../services/authService";

function Login({ setIsAuthenticated, setUserRole }) {
  const [user, setUser]               = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!user || !password) {
      setMessage("Por favor, ingrese usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      // Llamada al servicio que ya usa apiFetch y la URL de Vercel
      const data = await authService.login({ user, password });

      // Sincronizamos el estado global de la app
      setIsAuthenticated(true);
      setUserRole(data.role);

      // Redirección al Dashboard
      navigate("/Dashboard", { replace: true });
    } catch (error) {
      // El error viene formateado desde apiFetch o authService
      setMessage(error.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <header className="login-header">
          <h1>Sistema de Empleados</h1>
          <h3>Cibernética en el Siglo XXI</h3>
        </header>

        <div className="login-card">
          <h2>Acceso al Sistema</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="user">Nombre de Usuario</label>
              <input
                type="text"
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                placeholder="Ingrese su usuario"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <i className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            {message && (
              <div className="error-message alert alert-danger" role="alert">
                {message}
              </div>
            )}

            <div className="action-buttons mt-4">
              <button type="submit" className="btn-login-submit" disabled={loading}>
                {loading ? "Verificando..." : "Ingresar"}
              </button>
              <div className="divider">o</div>
              <button
                type="button"
                className="btn-register-trigger"
                onClick={() => setShowRegister(true)}
              >
                Crear cuenta nueva
              </button>
            </div>
          </form>
        </div>
      </div>

      {showRegister && (
        <LoginForm onClose={() => setShowRegister(false)} />
      )}
    </div>
  );
}

export default Login;