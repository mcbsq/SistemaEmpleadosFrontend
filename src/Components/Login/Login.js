import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import './Login.css';
import "react-datepicker/dist/react-datepicker.css";
import LoginForm from "./LoginForm";

// --- CONFIGURACIÓN DINÁMICA DE LA API ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const apiurl = isLocal 
  ? "http://localhost:5001"  // Backend Flask local
  : "http://51.79.18.52:5001"; // Backend en producción

function Login({ setIsAuthenticated, setUserRole }) {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [user, setUser] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false); 
  const [message, setMessage] = useState('');
  const [loginFormState, setLoginFormState] = useState({ show: false, openRegisterModal: false });
  
  const navigate = useNavigate(); 

  const toggleShowPassword = () => setShowPassword(!showPassword); 
  const handleUserChange = (e) => setUser(e.target.value); 
  const handlePasswordChange = (e) => setPassword(e.target.value);

  // -----------------------------------------
  // LÓGICA DE LOGIN (JWT)
  // -----------------------------------------
  const handleLogin = async (credentials) => {
    try {
      const response = await fetch(`${apiurl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardamos la sesión (JWT y Rol)
        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('user_role', data.role);
        
        setIsAuthenticated(true);
        setUserRole(data.role);
        
        // Navegar al Home
        navigate('/Home');
      } else {
        setMessage(data.error || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error('Error en conexión:', error);
      setMessage('No se pudo conectar con el servidor de autenticación');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user || !password) {
      setMessage("Por favor, ingrese usuario y contraseña");
      return;
    }
    handleLogin({ user, password });
  };

  const abrirLoginForm = () => {
    setShowLoginForm(true);
    setLoginFormState({ show: true, openRegisterModal: true });
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
          <form onSubmit={handleSubmit}> 
            <div className="form-group"> 
              <label htmlFor="user">Nombre de Usuario</label> 
              <input 
                type="text" 
                id="user" 
                value={user} 
                onChange={handleUserChange}
                autoComplete="username" 
                placeholder="Ingrese su usuario"
                autoFocus
              /> 
            </div> 

            <div className="form-group"> 
              <label htmlFor="password">Contraseña</label> 
              <div className="password-wrapper"> 
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  value={password} 
                  onChange={handlePasswordChange} 
                  autoComplete="current-password"
                  placeholder="••••••••"
                /> 
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={toggleShowPassword} 
                > 
                  <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button> 
              </div> 
            </div> 

            {message && <div className="error-message alert alert-danger">{message}</div>}

            <div className="action-buttons mt-4">
              <button type="submit" className="btn-login-submit"> 
                Ingresar
              </button> 
              <div className="divider">o</div>
              <button type="button" className="btn-register-trigger" onClick={abrirLoginForm}> 
                Crear cuenta nueva
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Registro */}
      {showLoginForm && (
        <LoginForm 
          openRegisterModal={loginFormState.openRegisterModal}
          onClose={() => setShowLoginForm(false)} 
        />
      )}
    </div>
  );
} 

export default Login;