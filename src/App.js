// src/App.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import "./styles.css";
import { Route, Link, Routes, useNavigate, Navigate, useLocation } from "react-router-dom";

import Home              from "./Components/Home";
import Perfil            from "./Components/Perfil/Perfil";
import Organigrama       from "./Components/Organigrama";
import Login             from "./Components/Login/Login";
import Empleados         from "./Components/Empleados";
import AdminDashboard    from "./Components/AdminDashboard";
import IncidentMonitor   from "./Components/IncidentMonitor";
import RoleManager       from "./Components/RoleManager";
import GlobalSearch      from "./Components/GlobalSearch";
import OrgSettings       from "./Components/OrgSettings";

import DashboardContador from "./Components/dashboards/DashboardContador";
import DashboardPM       from "./Components/dashboards/DashboardPM";
import DashboardMedico   from "./Components/dashboards/DashboardMedico";
import DashboardJefeArea from "./Components/dashboards/DashboardJefeArea";

import { authService }             from "./services/authService";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { OrgProvider }             from "./context/OrgContext";
import { useSidebarGlow }          from "./hooks/useRevealOnScroll";

const ROLES_ADMIN = ["ADMIN", "SUPER_ADMIN"];

const PrivateRoute = ({ children }) =>
  authService.isAuthenticated() ? children : <Navigate to="/Login" replace />;

const RoleRoute = ({ children, roles }) => {
  if (!authService.isAuthenticated()) return <Navigate to="/Login" replace />;
  if (!roles.includes(authService.getRole())) return <Navigate to="/Dashboard" replace />;
  return children;
};

const DashboardPage = ({ userRole }) => {
  const isAdmin = ROLES_ADMIN.includes(userRole);
  return (
    <div className="vertical-landing fade-in-page">
      {isAdmin                                              && <section id="admin-dashboard-section"><AdminDashboard /></section>}
      {userRole === "CONTADOR"        && <section id="admin-dashboard-section"><DashboardContador /></section>}
      {userRole === "PROJECT_MANAGER" && <section id="admin-dashboard-section"><DashboardPM /></section>}
      {userRole === "MEDICO"          && <section id="admin-dashboard-section"><DashboardMedico /></section>}
      {userRole === "JEFE_AREA"       && <section id="admin-dashboard-section"><DashboardJefeArea /></section>}
      <section id="home-section"><Home /></section>
      <section id="organigrama-section"><Organigrama /></section>
    </div>
  );
};

function AppInner() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [userRole,    setUserRole]    = useState(() => authService.getRole());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const glowRef   = useRef(null);
  const navRef    = useSidebarGlow();

  const isLoginPage   = location.pathname === "/Login" || location.pathname === "/";
  const isMonitorPage = location.pathname === "/monitor";
  const isProfilePage = location.pathname.startsWith("/Perfil/");
  const myEmpleadoId  = authService.getEmpleadoId();
  const isAdmin       = ROLES_ADMIN.includes(userRole);
  const isSuperAdmin  = userRole === "SUPER_ADMIN";
  const hasSpecialDashboard = ["CONTADOR","PROJECT_MANAGER","MEDICO","JEFE_AREA"].includes(userRole);

  // Parallax ambient glow
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          el.style.transform = `translateX(-50%) translateY(${window.scrollY * 0.3}px)`;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isMonitorPage) return;
    const token = authService.getToken();
    const role  = authService.getRole();
    if (!token) {
      setIsAuthenticated(false); setUserRole(null);
      if (!isLoginPage) navigate("/Login", { replace: true });
    } else {
      setIsAuthenticated(true); setUserRole(role);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false); setUserRole(null);
    navigate("/Login", { replace: true });
  }, [navigate]);

  const scrollTo = useCallback((id) => {
    setSidebarOpen(false);
    if (isProfilePage || location.pathname !== "/Dashboard") {
      navigate("/Dashboard");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 200);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isProfilePage, navigate, location.pathname]);

  const navGroups = [
    {
      section: "Principal",
      entries: [
        ...(isAdmin || hasSpecialDashboard ? [{ label: "Dashboard", icon: "◈", action: () => scrollTo("admin-dashboard-section") }] : []),
        { label: "Mi equipo",   icon: "◉", action: () => scrollTo("home-section") },
        { label: "Organigrama", icon: "⬡", action: () => scrollTo("organigrama-section") },
      ],
    },
    ...(isAdmin ? [{ section: "Gestión", entries: [{ label: "Empleados / RH", icon: "▤", isLink: true, to: "/empleados" }] }] : []),
    ...(isSuperAdmin ? [{
      section: "Sistema",
      entries: [
        { label: "Configuración",      icon: "◆", isLink: true, to: "/settings" },
        { label: "Gestión de roles",   icon: "⚙", isLink: true, to: "/roles" },
      ],
    }] : []),
    { section: "Cuenta", entries: [...(myEmpleadoId ? [{ label: "Mi perfil", icon: "◎", isLink: true, to: `/Perfil/${myEmpleadoId}` }] : [])] },
  ];

  if (isMonitorPage) return <Routes><Route path="/monitor" element={<IncidentMonitor />} /></Routes>;

  if (isLoginPage) return (
    <Routes>
      <Route path="/Login" element={isAuthenticated ? <Navigate to="/Dashboard" replace /> : <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} />
      <Route path="*" element={<Navigate to="/Login" replace />} />
    </Routes>
  );

  return (
    <div className="app-shell">
      <div className="noise-overlay" />
      <div className="ambient-glow" ref={glowRef} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {isAuthenticated && (
        <aside className={`app-sidebar ${sidebarOpen ? "app-sidebar--open" : ""}`}>
          <div className="sb-header">
            <Link to="/Dashboard" className="sb-logo-link" onClick={() => setSidebarOpen(false)}>
              Cibercom
            </Link>
            <span className="sb-logo-sub">Sistemas</span>
          </div>

          <GlobalSearch userRole={userRole} />

          <nav className="sb-nav" ref={navRef}>
            {navGroups.map(group => group.entries.length > 0 && (
              <div key={group.section} className="sb-group">
                <div className="sb-group-label">{group.section}</div>
                {group.entries.map(item =>
                  item.isLink
                    ? <Link key={item.label} to={item.to}
                        className={`sb-item ${location.pathname === item.to ? "sb-item--active" : ""}`}
                        onClick={() => setSidebarOpen(false)}>
                        <span className="sb-item-icon">{item.icon}</span>{item.label}
                      </Link>
                    : <button key={item.label} className="sb-item" onClick={item.action}>
                        <span className="sb-item-icon">{item.icon}</span>{item.label}
                      </button>
                )}
              </div>
            ))}
          </nav>

          <div className="sb-footer">
            <button className="sb-theme-btn" onClick={toggleTheme}>
              <span className="sb-theme-icon">{theme === "dark" ? "☀" : "☾"}</span>
              <span className="sb-theme-label">{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
            </button>
            <div className="sb-user-row">
              <span className="sb-user-role">{userRole}</span>
            </div>
            <button className="sb-logout" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </aside>
      )}

      {/* ── Topbar móvil — solo hamburger + logo, sin tema ───────── */}
      {isAuthenticated && (
        <header className="app-topbar">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen(p => !p)}
            aria-label="Abrir menú"
          >
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
          </button>
          <Link to="/Dashboard" className="topbar-logo">Cibercom</Link>
          <span className="topbar-spacer" />
        </header>
      )}

      <main className="app-main">
        <Routes location={location} key={location.pathname}>
          <Route path="/Login" element={isAuthenticated ? <Navigate to="/Dashboard" replace /> : <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} />
          <Route path="/Dashboard" element={<PrivateRoute><DashboardPage userRole={userRole} /></PrivateRoute>} />
          <Route path="/Perfil/:id" element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/empleados" element={<RoleRoute roles={ROLES_ADMIN}><div className="page-padded fade-in-page"><Empleados /></div></RoleRoute>} />
          <Route path="/settings"  element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><OrgSettings /></div></RoleRoute>} />
          <Route path="/roles"     element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><RoleManager /></div></RoleRoute>} />
          <Route path="/monitor"   element={<RoleRoute roles={["SUPER_ADMIN"]}><IncidentMonitor /></RoleRoute>} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/Dashboard" : "/Login"} replace />} />
        </Routes>
        <footer className="app-footer"><p>Copyright © 2026 | Cibercom Sistemas</p></footer>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <OrgProvider>
        <AppInner />
      </OrgProvider>
    </ThemeProvider>
  );
}

export default App;