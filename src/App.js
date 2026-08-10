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
import VacacionesAprobacion from "./Components/VacacionesAprobacion";
import RoleManager       from "./Components/RoleManager";
import GestionUsuarios   from "./Components/GestionUsuarios";
import ConexionesExternas from "./Components/ConexionesExternas";
import Spotlight         from "./Components/Spotlight";
import NotificationBell  from "./Components/NotificationBell";
import OrgSettings       from "./Components/OrgSettings";
import NominaConfig      from "./Components/NominaConfig";
import Reclutamiento     from "./Components/Reclutamiento";
import Desempeno         from "./Components/Desempeno";
import Analitica         from "./Components/Analitica";
import OnboardingTour    from "./Components/OnboardingTour";
import {
  FiGrid, FiUsers, FiShare2, FiList, FiSun, FiSettings,
  FiShield, FiUser, FiMoon, FiLogOut, FiDollarSign, FiBriefcase, FiAward, FiBarChart2, FiSearch,
} from "react-icons/fi";

import DashboardContador from "./Components/dashboards/DashboardContador";
import DashboardPM       from "./Components/dashboards/DashboardPM";
import DashboardMedico   from "./Components/dashboards/DashboardMedico";
import DashboardJefeArea from "./Components/dashboards/DashboardJefeArea";

import { authService }             from "./services/authService";
import { encodeId }                from "./services/empleadoService";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { OrgProvider, useOrg }      from "./context/OrgContext";
import { useSidebarGlow }          from "./hooks/useRevealOnScroll";

const ROLES_ADMIN = ["ADMIN", "SUPER_ADMIN"];

// ─── Convierte nombre a slug URL-friendly ─────────────────────────────────────
// "Juan Pérez López" → "juan-perez-lopez"
// Se guarda el ID real en sessionStorage mapeado al slug para recuperarlo
const toSlug = (str = "") =>
  str.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")  // quitar acentos
     .toLowerCase()
     .trim()
     .replace(/[^a-z0-9\s-]/g, "")
     .replace(/\s+/g, "-");

// ─── Mapa slug → ID (persiste en sessionStorage para la sesión) ───────────────
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
  // Si es ObjectId directo (24 hex) → usarlo tal cual
  if (/^[a-f0-9]{24}$/i.test(slugOrEncoded)) return slugOrEncoded;

  // Intentar como slug en el mapa
  const map = getSlugMap();
  if (map[slugOrEncoded]) return map[slugOrEncoded];

  // Fallback: intentar decodificar como base64 (compatibilidad con links viejos)
  try {
    let b64 = slugOrEncoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const decoded = atob(b64);
    if (/^[a-f0-9]{24}$/i.test(decoded)) return decoded;
  } catch { /* no era base64 */ }

  return slugOrEncoded; // devolver tal cual y dejar que el backend lo rechace
};

const PrivateRoute = ({ children }) =>
  authService.isAuthenticated() ? children : <Navigate to="/Login" replace />;

const RoleRoute = ({ children, roles }) => {
  if (!authService.isAuthenticated()) return <Navigate to="/Login" replace />;
  if (!roles.includes(authService.getRole())) return <Navigate to="/Dashboard" replace />;
  return children;
};

const DashboardPage = ({ userRole }) => {
  const isAdmin = ROLES_ADMIN.includes(userRole);
  const { isModuleActive } = useOrg();
  return (
    <div className="vertical-landing fade-in-page">
      {isAdmin                        && isModuleActive("dashboard_admin")    && <section id="admin-dashboard-section"><AdminDashboard /></section>}
      {userRole === "CONTADOR"        && isModuleActive("dashboard_contador") && <section id="admin-dashboard-section"><DashboardContador /></section>}
      {userRole === "PROJECT_MANAGER" && isModuleActive("dashboard_pm")       && <section id="admin-dashboard-section"><DashboardPM /></section>}
      {userRole === "MEDICO"          && isModuleActive("dashboard_medico")   && <section id="admin-dashboard-section"><DashboardMedico /></section>}
      {userRole === "JEFE_AREA"       && isModuleActive("dashboard_jefe_area") && <section id="admin-dashboard-section"><DashboardJefeArea /></section>}
      {isModuleActive("home_carousel") && <section id="home-section"><Home /></section>}
      {isModuleActive("organigrama")   && <section id="organigrama-section"><Organigrama /></section>}
    </div>
  );
};

function AppInner() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [userRole,    setUserRole]    = useState(() => authService.getRole());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Fix producción: forzar re-read de sessionStorage después del primer render
  // En Vercel el lazy initializer de useState puede ejecutarse antes de que
  // sessionStorage esté completamente disponible con los datos del login
  const [roleReady, setRoleReady] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { orgConfig, loadOrgConfig, isModuleActive } = useOrg();
  const orgName = orgConfig?.name || "Cibercom";

  // Carga la configuración de la organización (branding, módulos, políticas
  // de vacaciones) de la EMPRESA REAL del usuario logueado — multi-tenencia:
  // cada empresa tiene su propio org_id (el tenant que resolvió Aegis en el
  // login), así que dos empresas nunca comparten branding/módulos. Antes de
  // loguearse no hay org_id todavía, así que se usa "default" solo para la
  // pantalla de login (branding genérico, no específico de ninguna empresa).
  useEffect(() => { loadOrgConfig(authService.getOrgId()); }, [loadOrgConfig, userRole]);
  const navigate = useNavigate();
  const location = useLocation();
  const glowRef  = useRef(null);
  const navRef   = useSidebarGlow();

  const isLoginPage   = location.pathname === "/Login" || location.pathname === "/";
  const isMonitorPage = location.pathname === "/monitor";
  const isAdmin       = ROLES_ADMIN.includes(userRole);
  const isSuperAdmin  = userRole === "SUPER_ADMIN";
  const hasSpecialDashboard = ["CONTADOR","PROJECT_MANAGER","MEDICO","JEFE_AREA"].includes(userRole);

  // ─── Slug del perfil propio ───────────────────────────────────────────────
  // Construye /Perfil/juan-perez y registra el mapeo slug→id
  const myEmpleadoId = authService.getEmpleadoId();
  const myUserName   = sessionStorage.getItem("user_name") || "";
  const mySlug = (() => {
    if (!myEmpleadoId) return null;
    const slug = toSlug(myUserName) || encodeId(myEmpleadoId);
    registerSlug(slug, myEmpleadoId);
    return slug;
  })();

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

  // Re-leer rol del sessionStorage al montar — fix para producción (Vercel)
  useEffect(() => {
    const role = authService.getRole();
    if (role) setUserRole(role);
    setRoleReady(true);
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
  }, [location.pathname]); // eslint-disable-line

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false); setUserRole(null);
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
          ? [{ label: "Dashboard", icon: FiGrid, action: () => scrollTo("admin-dashboard-section"), tour: "dashboard" }]
          : []),
        ...(isModuleActive("home_carousel")
          ? [{ label: "Mi equipo", icon: FiUsers, action: () => scrollTo("home-section"), tour: !(isAdmin || hasSpecialDashboard) ? "dashboard" : undefined }]
          : []),
        ...(isModuleActive("organigrama")
          ? [{ label: "Organigrama", icon: FiShare2, action: () => scrollTo("organigrama-section") }]
          : []),
        { label: "Evaluaciones", icon: FiAward, isLink: true, to: "/desempeno" },
        { label: "Analítica", icon: FiBarChart2, isLink: true, to: "/analitica" },
      ],
    },
    ...(isAdmin || hasSpecialDashboard
      ? [{
          section: "Gestión",
          entries: [
            ...(isAdmin && isModuleActive("empleados_table")
              ? [{ label: "Empleados / RH", icon: FiList, isLink: true, to: "/empleados" }] : []),
            ...(isModuleActive("vacaciones")
              ? [{ label: "Solicitudes de vacaciones", icon: FiSun, isLink: true, to: "/vacaciones" }] : []),
            ...((isAdmin || userRole === "CONTADOR")
              ? [{ label: "Nómina", icon: FiDollarSign, isLink: true, to: "/nomina" }] : []),
            ...(isAdmin
              ? [{ label: "Reclutamiento", icon: FiBriefcase, isLink: true, to: "/reclutamiento" }] : []),
          ],
        }]
      : []),
    ...(isSuperAdmin
      ? [{
          section: "Sistema",
          entries: [
            { label: "Configuración",    icon: FiSettings, isLink: true, to: "/settings" },
            { label: "Gestión de roles", icon: FiShield,   isLink: true, to: "/roles" },
            { label: "Cuentas",          icon: FiUsers,    isLink: true, to: "/cuentas" },
            { label: "Integraciones",    icon: FiShare2,   isLink: true, to: "/integraciones" },
          ],
        }]
      : []),
    {
      section: "Cuenta",
      entries: [
        // URL limpia: /Perfil/juan-perez
        ...(mySlug ? [{ label: "Mi perfil", icon: FiUser, isLink: true, to: `/Perfil/${mySlug}`, tour: "mi-perfil" }] : []),
      ],
    },
  ];

  // No renderizar el dashboard hasta que el rol esté confirmado desde sessionStorage
  if (!roleReady && !isLoginPage && !isMonitorPage) return null;

  if (isMonitorPage) return <Routes><Route path="/monitor" element={<IncidentMonitor />} /></Routes>;

  if (isLoginPage) return (
    <Routes>
      <Route path="/Login" element={
        isAuthenticated
          ? <Navigate to="/Dashboard" replace />
          : <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />
      } />
      <Route path="*" element={<Navigate to="/Login" replace />} />
    </Routes>
  );

  return (
    <div className="app-shell">
      <div className="noise-overlay" />
      <div className="ambient-glow" ref={glowRef} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {isAuthenticated && (
        <aside className={`app-sidebar ${sidebarOpen ? "app-sidebar--open" : ""}`}>
          <div className="sb-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="sb-logo-block" data-tour="logo">
              <span className="sb-logo-mono">{(orgName || "?")[0]}</span>
              <Link to="/Dashboard" className="sb-logo-link" onClick={() => setSidebarOpen(false)}>{orgName}</Link>
              <span className="sb-logo-sub">Sistemas</span>
            </div>
            <span data-tour="notificaciones"><NotificationBell align="left" /></span>
          </div>
          <div className="sb-spotlight-trigger" data-tour="spotlight">
            <button className="sb-item" onClick={() => window.dispatchEvent(new Event("abrir-spotlight"))}>
              <span className="sb-item-icon"><FiSearch /></span>
              <span className="sb-item-label">Buscar…</span>
              <span className="sb-item-kbd">⌘K</span>
            </button>
          </div>
          <nav className="sb-nav" ref={navRef}>
            {navGroups.map(group => group.entries.length > 0 && (
              <div key={group.section} className="sb-group">
                <div className="sb-group-label">{group.section}</div>
                {group.entries.map(item =>
                  item.isLink
                    ? <Link key={item.label} to={item.to} data-tour={item.tour}
                        className={`sb-item ${location.pathname === item.to ? "sb-item--active" : ""}`}
                        onClick={() => setSidebarOpen(false)}>
                        <span className="sb-item-icon"><item.icon /></span>
                        <span className="sb-item-label">{item.label}</span>
                      </Link>
                    : <button key={item.label} className="sb-item" data-tour={item.tour} onClick={item.action}>
                        <span className="sb-item-icon"><item.icon /></span>
                        <span className="sb-item-label">{item.label}</span>
                      </button>
                )}
              </div>
            ))}
          </nav>
          <div className="sb-footer">
            <button className="sb-theme-btn" onClick={toggleTheme}>
              <span className="sb-theme-icon">{theme === "dark" ? <FiSun /> : <FiMoon />}</span>
              <span className="sb-theme-label">{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
            </button>
            <div className="sb-user-row"><span className="sb-user-role">{userRole}</span></div>
            <button className="sb-logout" onClick={handleLogout}>
              <FiLogOut style={{ marginRight: 6 }} />
              <span className="sb-item-label">Cerrar sesión</span>
            </button>
          </div>
        </aside>
      )}

      {isAuthenticated && <Spotlight userRole={userRole} />}
      {isAuthenticated && <OnboardingTour />}

      {isAuthenticated && (
        <header className="app-topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(p => !p)} aria-label="Abrir menú">
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
          </button>
          <Link to="/Dashboard" className="topbar-logo">{orgName}</Link>
          <span className="topbar-spacer" />
          <NotificationBell />
        </header>
      )}

      <main className="app-main">
        <Routes location={location} key={location.pathname}>
          <Route path="/Login" element={
            isAuthenticated
              ? <Navigate to="/Dashboard" replace />
              : <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />
          } />
          <Route path="/Dashboard"  element={<PrivateRoute><DashboardPage userRole={userRole} /></PrivateRoute>} />
          <Route path="/Perfil/:id" element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/empleados"  element={<RoleRoute roles={ROLES_ADMIN}><div className="page-padded fade-in-page"><Empleados /></div></RoleRoute>} />
          {/* Sin restricción de rol estática: quién aprueba vacaciones es
              configurable por SUPER_ADMIN, y el backend es la frontera real. */}
          <Route path="/vacaciones" element={<PrivateRoute><div className="page-padded fade-in-page"><VacacionesAprobacion /></div></PrivateRoute>} />
          <Route path="/nomina"     element={<RoleRoute roles={["ADMIN","SUPER_ADMIN","CONTADOR"]}><div className="page-padded fade-in-page"><NominaConfig /></div></RoleRoute>} />
          <Route path="/reclutamiento" element={<RoleRoute roles={ROLES_ADMIN}><div className="page-padded fade-in-page"><Reclutamiento /></div></RoleRoute>} />
          <Route path="/desempeno" element={<PrivateRoute><div className="page-padded fade-in-page"><Desempeno /></div></PrivateRoute>} />
          <Route path="/analitica" element={<PrivateRoute><div className="page-padded fade-in-page"><Analitica /></div></PrivateRoute>} />
          <Route path="/settings"   element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><OrgSettings /></div></RoleRoute>} />
          <Route path="/roles"      element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><RoleManager /></div></RoleRoute>} />
          <Route path="/cuentas"    element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><GestionUsuarios /></div></RoleRoute>} />
          <Route path="/integraciones" element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><ConexionesExternas /></div></RoleRoute>} />
          <Route path="/monitor"    element={<RoleRoute roles={["SUPER_ADMIN"]}><IncidentMonitor /></RoleRoute>} />
          <Route path="*"           element={<Navigate to={isAuthenticated ? "/Dashboard" : "/Login"} replace />} />
        </Routes>
        <footer className="app-footer"><p>Copyright © 2026 | {orgName} Sistemas</p></footer>
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