import React, { useEffect, useState, useCallback } from "react";
import "./styles.css";
import {
  Route, Link, Routes,
  useNavigate, Navigate, useLocation
} from "react-router-dom";

import Home        from "./Components/Home";
import Perfil      from "./Components/Perfil/Perfil";
import Organigrama from "./Components/Organigrama";
import Login       from "./Components/Login/Login";
import Empleados   from "./Components/Empleados";
import { authService } from "./services/authService";

// ─── Rutas protegidas por autenticación ──────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const ok = authService.isAuthenticated();
  return ok ? children : <Navigate to="/Login" replace />;
};

// ─── Rutas protegidas por rol ────────────────────────────────────────────────
// roles: array de roles permitidos, ej. ["ADMIN", "SUPER_ADMIN"]
const RoleRoute = ({ children, roles }) => {
  if (!authService.isAuthenticated()) return <Navigate to="/Login" replace />;
  if (!roles.includes(authService.getRole())) return <Navigate to="/Dashboard" replace />;
  return children;
};

// ─── Dashboard según rol ──────────────────────────────────────────────────────
const MainDashboard = ({ userRole }) => (
  <div className="vertical-landing fade-in-page">
    <section id="home-section"><Home /></section>
    <section id="organigrama-section"><Organigrama /></section>

    {/* ADMIN y SUPER_ADMIN ven el módulo de empleados */}
    {(userRole === "SUPER_ADMIN" || userRole === "ADMIN") && (
      <section id="empleados-section"><Empleados /></section>
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => authService.isAuthenticated()
  );
  const [userRole,  setUserRole]  = useState(() => authService.getRole());
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isLoginPage   = location.pathname === "/Login" || location.pathname === "/";
  const isProfilePage = location.pathname.startsWith("/Perfil/");

  // Empleado id propio para el acceso rápido a "Mi perfil"
  const myEmpleadoId = authService.getEmpleadoId();

  // Sincronizar estado de auth cuando cambia la ruta
  useEffect(() => {
    const token = authService.getToken();
    const role  = authService.getRole();

    if (!token) {
      setIsAuthenticated(false);
      setUserRole(null);
      if (!isLoginPage) navigate("/Login", { replace: true });
    } else {
      setIsAuthenticated(true);
      setUserRole(role);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll listener para la navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUserRole(null);
    setMenuOpen(false);
    navigate("/Login", { replace: true });
  }, [navigate]);

  const scrollToSection = useCallback((id) => {
    setMenuOpen(false);
    if (isProfilePage) {
      navigate("/Dashboard");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isProfilePage, navigate]);

  // ─── Navbar items según rol ────────────────────────────────────────────────
  // EMPLOYEE: Home · Organigrama · Mi Perfil
  // ADMIN:    Home · Organigrama · RH/Empleados · Mi Perfil
  // SUPER_ADMIN: Home · Organigrama · RH/Empleados · Mi Perfil
  const navItems = [
    { label: "Home",        action: () => scrollToSection("home-section"),      roles: ["EMPLOYEE", "ADMIN", "SUPER_ADMIN"] },
    { label: "Organigrama", action: () => scrollToSection("organigrama-section"),roles: ["EMPLOYEE", "ADMIN", "SUPER_ADMIN"] },
    { label: "RH / Empleados", action: () => scrollToSection("empleados-section"), roles: ["ADMIN", "SUPER_ADMIN"] },
  ];

  return (
    <div className="App">
      <div className="noise-overlay" />
      <div className="ambient-glow" />

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      {!isLoginPage && (
        <header className={[
          "header",
          scrolled  ? "scrolled-capsule" : "",
          menuOpen  ? "menu-is-open"     : "",
        ].filter(Boolean).join(" ")}>

          <Link to="/Dashboard" className="logo" onClick={() => setMenuOpen(false)}>
            Cibercom
          </Link>

          {isAuthenticated && (
            <>
              <button
                className="menu-toggle"
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(prev => !prev)}
              >
                <span className={menuOpen ? "open" : ""} />
              </button>

              <nav className={`navbar${menuOpen ? " active" : ""}`}>
                {/* Items filtrados por rol */}
                {navItems
                  .filter(item => item.roles.includes(userRole))
                  .map(item => (
                    <button key={item.label} onClick={item.action}>
                      {item.label}
                    </button>
                  ))
                }

                {/* Acceso rápido a "Mi perfil" — solo si el usuario tiene empleado_id */}
                {myEmpleadoId && (
                  <Link
                    to={`/Perfil/${myEmpleadoId}`}
                    className="btn-mi-perfil"
                    onClick={() => setMenuOpen(false)}
                  >
                    Mi perfil
                  </Link>
                )}

                <button className="btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </nav>
            </>
          )}
        </header>
      )}

      {/* ── Rutas ─────────────────────────────────────────────────────────── */}
      <main className="main-content">
        <Routes location={location} key={location.pathname}>

          {/* Login */}
          <Route
            path="/Login"
            element={
              isAuthenticated
                ? <Navigate to="/Dashboard" replace />
                : <Login
                    setIsAuthenticated={setIsAuthenticated}
                    setUserRole={setUserRole}
                  />
            }
          />

          {/* Dashboard — todos los roles autenticados */}
          <Route
            path="/Dashboard"
            element={
              <PrivateRoute>
                <MainDashboard userRole={userRole} />
              </PrivateRoute>
            }
          />

          {/* Perfil — todos los roles autenticados */}
          <Route
            path="/Perfil/:id"
            element={
              <PrivateRoute>
                <Perfil />
              </PrivateRoute>
            }
          />

          {/* Módulo Empleados — solo ADMIN y SUPER_ADMIN */}
          {/* (Por si alguien intenta acceder directamente por URL) */}
          <Route
            path="/Empleados"
            element={
              <RoleRoute roles={["ADMIN", "SUPER_ADMIN"]}>
                <Empleados />
              </RoleRoute>
            }
          />

          {/* Catch-all */}
          <Route
            path="*"
            element={
              <Navigate
                to={isAuthenticated ? "/Dashboard" : "/Login"}
                replace
              />
            }
          />

        </Routes>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {!isLoginPage && (
        <footer className="footer">
          <p>Copyright &copy; 2026 | Cibercom Sistemas</p>
        </footer>
      )}
    </div>
  );
}

export default App;