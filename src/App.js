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
import { encodeId }                from "./services/empleadoService";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { OrgProvider }             from "./context/OrgContext";
import { useSidebarGlow }          from "./hooks/useRevealOnScroll";

const ROLES_ADMIN = ["ADMIN", "SUPER_ADMIN"];

// ─── Funciones Helper de Slugs ────────────────────────────────────────────────
const toSlug = (str = "") =>
  str.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .trim()
     .replace(/[^a-z0-9\s-]/g, "")
     .replace(/\s+/g, "-");

const SLUG_MAP_KEY = "hr_slug_map";

const getSlugMap = () => {
  try { return JSON.parse(sessionStorage.getItem(SLUG_MAP_KEY) || "{}"); }
  catch { return {}; }
};

export const registerSlug = (slug, id) => {
  const map = getSlugMap();
  map[slug] = id;
  sessionStorage.setItem(SLUG_MAP_KEY, JSON.stringify(map));
};

export const resolveSlug = (slugOrEncoded) => {
  if (/^[a-f0-9]{24}$/i.test(slugOrEncoded)) return slugOrEncoded;
  const map = getSlugMap();
  if (map[slugOrEncoded]) return map[slugOrEncoded];
  try {
    let b64 = slugOrEncoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const decoded = atob(b64);
    if (/^[a-f0-9]{24}$/i.test(decoded)) return decoded;
  } catch {}
  return slugOrEncoded;
};

// ─── Componentes de Ruta Protegida ────────────────────────────────────────────
const PrivateRoute = ({ children }) =>
  authService.isAuthenticated() ? children : <Navigate to="/Login" replace />;

const RoleRoute = ({ children, roles }) => {
  if (!authService.isAuthenticated()) return <Navigate to="/Login" replace />;
  if (!roles.includes(authService.getRole())) return <Navigate to="/Dashboard" replace />;
  return children;
};

// ─── Dashboard Dinámico ───────────────────────────────────────────────────────
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

// ─── App Principal ────────────────────────────────────────────────────────────
function AppInner() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [userRole,    setUserRole]    = useState(() => authService.getRole());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const glowRef  = useRef(null);
  const navRef   = useSidebarGlow();

  // En producción, "/" debe tratarse como una redirección lógica
  const isLoginPage   = location.pathname === "/Login";
  const isMonitorPage = location.pathname === "/monitor";
  const isAdmin       = ROLES_ADMIN.includes(userRole);
  const isSuperAdmin  = userRole === "SUPER_ADMIN";
  const hasSpecialDashboard = ["CONTADOR","PROJECT_MANAGER","MEDICO","JEFE_AREA"].includes(userRole);

  const myEmpleadoId = authService.getEmpleadoId();
  const myUserName   = sessionStorage.getItem("user_name") || "";
  const mySlug = (() => {
    if (!myEmpleadoId) return null;
    const slug = toSlug(myUserName) || encodeId(myEmpleadoId);
    registerSlug(slug, myEmpleadoId);
    return slug;
  })();

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
      setIsAuthenticated(false); 
      setUserRole(null);
      // Solo navegar a login si no estamos ya en una ruta pública
      if (location.pathname !== "/Login" && location.pathname !== "/") {
        navigate("/Login", { replace: true });
      }
    } else {
      setIsAuthenticated(true); 
      setUserRole(role);
    }
  }, [location.pathname, navigate, isMonitorPage]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false); 
    setUserRole(null);
    navigate("/Login", { replace: true });
  }, [navigate]);

  const scrollTo = useCallback((id) => {
    setSidebarOpen(false);
    const isProfilePage = location.pathname.startsWith("/Perfil/");
    if (isProfilePage || location.pathname !== "/Dashboard") {
      navigate("/Dashboard");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 200);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [navigate, location.pathname]);

  const navGroups = [
    {
      section: "Principal",
      entries: [
        ...(isAdmin || hasSpecialDashboard
          ? [{ label: "Dashboard", icon: "◈", action: () => scrollTo("admin-dashboard-section") }]
          : []),
        { label: "Mi equipo",   icon: "◉", action: () => scrollTo("home-section") },
        { label: "Organigrama", icon: "⬡", action: () => scrollTo("organigrama-section") },
      ],
    },
    ...(isAdmin
      ? [{ section: "Gestión", entries: [{ label: "Empleados / RH", icon: "▤", isLink: true, to: "/empleados" }] }]
      : []),
    ...(isSuperAdmin
      ? [{
          section: "Sistema",
          entries: [
            { label: "Configuración",    icon: "◆", isLink: true, to: "/settings" },
            { label: "Gestión de roles", icon: "⚙", isLink: true, to: "/roles" },
          ],
        }]
      : []),
    {
      section: "Cuenta",
      entries: [
        ...(mySlug ? [{ label: "Mi perfil", icon: "◎", isLink: true, to: `/Perfil/${mySlug}` }] : []),
      ],
    },
  ];

  // Caso Monitor (Totalmente aislado)
  if (isMonitorPage) return <Routes><Route path="/monitor" element={<IncidentMonitor />} /></Routes>;

  return (
    <div className="app-shell">
      <div className="noise-overlay" />
      <div className="ambient-glow" ref={glowRef} />

      {/* Renderizado condicional del layout pero manteniendo el árbol de React */}
      {isAuthenticated && location.pathname !== "/Login" && (
        <>
          {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
          <aside className={`app-sidebar ${sidebarOpen ? "app-sidebar--open" : ""}`}>
            <div className="sb-header">
              <Link to="/Dashboard" className="sb-logo-link" onClick={() => setSidebarOpen(false)}>Cibercom</Link>
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
              <div className="sb-user-row"><span className="sb-user-role">{userRole}</span></div>
              <button className="sb-logout" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </aside>

          <header className="app-topbar">
            <button className="topbar-hamburger" onClick={() => setSidebarOpen(p => !p)} aria-label="Abrir menú">
              <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
            </button>
            <Link to="/Dashboard" className="topbar-logo">Cibercom</Link>
            <span className="topbar-spacer" />
          </header>
        </>
      )}

      {/* Main Container con rutas unificadas */}
      <main className={isAuthenticated && location.pathname !== "/Login" ? "app-main" : "app-main-login"}>
        <Routes location={location} key={location.pathname}>
          {/* Ruta raíz redirigiendo según Auth */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/Dashboard" : "/Login"} replace />} />
          
          {/* Login */}
          <Route path="/Login" element={
            isAuthenticated
              ? <Navigate to="/Dashboard" replace />
              : <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />
          } />

          {/* Secciones Protegidas */}
          <Route path="/Dashboard"  element={<PrivateRoute><DashboardPage userRole={userRole} /></PrivateRoute>} />
          <Route path="/Perfil/:id" element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/empleados"  element={<RoleRoute roles={ROLES_ADMIN}><div className="page-padded fade-in-page"><Empleados /></div></RoleRoute>} />
          <Route path="/settings"   element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><OrgSettings /></div></RoleRoute>} />
          <Route path="/roles"      element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><RoleManager /></div></RoleRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/Dashboard" : "/Login"} replace />} />
        </Routes>
        
        {isAuthenticated && location.pathname !== "/Login" && (
          <footer className="app-footer"><p>Copyright © 2026 | Cibercom Sistemas</p></footer>
        )}
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