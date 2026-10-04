import React, { useEffect, useState, useCallback, useRef } from "react";
import "./styles.css";
import { Route, Link, Routes, useNavigate, Navigate, useLocation } from "react-router-dom";

import Home              from "./Components/Home";
import Perfil            from "./Components/Perfil/Perfil";
import Organigrama       from "./Components/Organigrama";
import Login             from "./Components/Login/Login";
import OrgGate           from "./Components/Login/OrgGate";
import Empleados         from "./Components/Empleados";
import AdminDashboard    from "./Components/AdminDashboard";
import IncidentMonitor   from "./Components/IncidentMonitor";
import VacacionesAprobacion from "./Components/VacacionesAprobacion";
import { vacacionesService } from "./services/vacacionesService";
import RoleManager       from "./Components/RoleManager";
import GestionUsuarios   from "./Components/GestionUsuarios";
import ConexionesExternas from "./Components/ConexionesExternas";
import Tenants            from "./Components/Tenants";
import Spotlight         from "./Components/Spotlight";
import NotificationBell  from "./Components/NotificationBell";
import OrgSettings       from "./Components/OrgSettings";
import PayrollTable      from "./Components/PayrollTable";
import Reclutamiento     from "./Components/Reclutamiento";
import Desempeno         from "./Components/Desempeno";
import Analitica         from "./Components/Analitica";
import OnboardingTour    from "./Components/OnboardingTour";
import AmbientBackground from "./Components/AmbientBackground";
import AjustesPerfil     from "./Components/AjustesPerfil";
import ContactoRH        from "./Components/ContactoRH";
import BandejaRH         from "./Components/SolicitudesRH";
import CargaMasiva       from "./Components/CargaMasiva";
import MiResumen         from "./Components/MiResumen";
import { MotionConfig }  from "framer-motion";
import { perfilService, abrirAjustes, PERFIL_ACTUALIZADO } from "./services/perfilService";
import PublicLanding     from "./pages/PublicLanding";
import CompanyRegistration from "./pages/CompanyRegistration";
import {
  FiGrid, FiUsers, FiShare2, FiList, FiSun, FiSettings,
  FiShield, FiUser, FiMoon, FiLogOut, FiSettings as FiAjustes, FiInbox, FiUploadCloud, FiEye, FiDollarSign, FiBriefcase, FiAward, FiBarChart2, FiSearch, FiGlobe,
} from "react-icons/fi";

import DashboardContador from "./Components/dashboards/DashboardContador";
import DashboardPM       from "./Components/dashboards/DashboardPM";
import DashboardMedico   from "./Components/dashboards/DashboardMedico";
import DashboardJefeArea from "./Components/dashboards/DashboardJefeArea";
import DashboardRH       from "./Components/dashboards/DashboardRH";

import { authService }             from "./services/authService";
import { encodeId }                from "./services/empleadoService";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { OrgProvider, useOrg }      from "./context/OrgContext";
import { useSidebarGlow }          from "./hooks/useRevealOnScroll";
import { roleLabel }               from "./utils/roleLabels";

// RH entra a todo lo de personas; la sección "Sistema" sigue siendo de SUPER_ADMIN.
const ROLES_ADMIN = ["ADMIN", "SUPER_ADMIN", "RH"];

// Rutas reales de un solo segmento que YA existen en el sistema — cualquier
// otro segmento único en la URL (ej. /perrucho) se interpreta como el link
// de entrada de una empresa (OrgGate), no como una ruta del sistema.
const RESERVED_ROOT_SEGMENTS = new Set([
  "login", "dashboard", "empleados", "vacaciones", "nomina", "reclutamiento",
  "desempeno", "analitica", "settings", "roles", "cuentas", "integraciones",
  "monitor", "perfil", "tenants", "registro", "solicitudes", "carga-masiva",
]);

// Tenant propio de Cibercom — el mismo criterio que usa el backend
// (api/tenants/routes.py: SUPER_ADMIN + org_id == tenant de Cibercom) para
// decidir quién es "operador de la plataforma" y no solo el SUPER_ADMIN de
// una empresa cliente cualquiera.
const TENANT_CIBERCOM = "cibercom";

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
  // La cuenta maestra (ADMIN/SUPER_ADMIN) ve CUALQUIER dashboard que active
  // en Módulos, no solo el suyo por rol — para los demás roles, cada quien
  // sigue viendo únicamente el dashboard de su propio puesto.
  return (
    <div className="vertical-landing fade-in-page">
      {/* Panel de RH primero: es lo que hay que ATENDER hoy (solicitudes,
          vacaciones, expedientes incompletos). Lo ven RH, ADMIN y SUPER_ADMIN. */}
      {isAdmin                                          && isModuleActive("dashboard_rh")        && <section id="rh-panel-section"><DashboardRH /></section>}
      {isAdmin                                          && isModuleActive("dashboard_admin")     && <section id="admin-dashboard-section"><AdminDashboard /></section>}
      {(isAdmin || userRole === "CONTADOR")              && isModuleActive("dashboard_contador")  && <section id="admin-dashboard-section"><DashboardContador /></section>}
      {(isAdmin || userRole === "PROJECT_MANAGER")       && isModuleActive("dashboard_pm")        && <section id="admin-dashboard-section"><DashboardPM /></section>}
      {(isAdmin || userRole === "MEDICO")                && isModuleActive("dashboard_medico")    && <section id="admin-dashboard-section"><DashboardMedico /></section>}
      {(isAdmin || userRole === "JEFE_AREA")             && isModuleActive("dashboard_jefe_area") && <section id="admin-dashboard-section"><DashboardJefeArea /></section>}
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
  // El título de la pestaña sigue a la empresa que se está viendo (incluido
  // el modo soporte), no a Cibercom fijo.
  useEffect(() => { document.title = `Sistema de Empleados | ${orgName}`; }, [orgName]);

  // Carga la configuración de la organización (branding, módulos, políticas
  // de vacaciones) de la EMPRESA REAL del usuario logueado — multi-tenencia:
  // cada empresa tiene su propio org_id (el tenant que resolvió Aegis en el
  // login), así que dos empresas nunca comparten branding/módulos. Antes de
  // loguearse no hay org_id todavía, así que se usa "default" solo para la
  // pantalla de login (branding genérico, no específico de ninguna empresa).
  useEffect(() => { loadOrgConfig(authService.getUniverso() || authService.getOrgId()); }, [loadOrgConfig, userRole]);
  const universo = authService.getUniverso();
  const salirDeUniverso = () => { authService.setUniverso(null); window.location.href = "/tenants"; };
  const navigate = useNavigate();
  const location = useLocation();
  const glowRef  = useRef(null);
  const navRef   = useSidebarGlow();

  // Link de empresa: /<org_id> (ej. /perrucho) — un solo segmento en la URL
  // que no coincide con ninguna ruta reservada del sistema. Solo cuenta
  // mientras no haya sesión: una vez logueado, el org_id real ya vive en el
  // JWT/sessionStorage y el segmento de la URL deja de tener efecto (no
  // reemplaza la resolución de tenant, que sigue siendo cosa de Aegis).
  const rootSegments = location.pathname.split("/").filter(Boolean);
  const orgGateSlug =
    !isAuthenticated && rootSegments.length === 1 && !RESERVED_ROOT_SEGMENTS.has(rootSegments[0].toLowerCase())
      ? rootSegments[0]
      : null;

  const isLoginPage   = location.pathname === "/Login" || location.pathname === "/" || !!orgGateSlug;
  const isMonitorPage = location.pathname === "/monitor";
  const isAdmin       = ROLES_ADMIN.includes(userRole);
  const isSuperAdmin  = userRole === "SUPER_ADMIN";
  // Solo la cuenta suprema de la plataforma (marca `plataforma`), no el
  // administrador de la EMPRESA Cibercom — ver backend api/tenants/routes.py.
  const isOperadorCibercom = isSuperAdmin && authService.getOrgId() === TENANT_CIBERCOM && authService.isPlataforma();
  const hasSpecialDashboard = ["CONTADOR","PROJECT_MANAGER","MEDICO","JEFE_AREA"].includes(userRole);

  // ─── Mi tarjeta en la barra lateral (foto + nombre para mostrar) ─────────
  const [miPerfil, setMiPerfil] = useState(null);
  useEffect(() => {
    const id = authService.getEmpleadoId();
    if (!isAuthenticated || !id) { setMiPerfil(null); return; }
    const cargar = () => perfilService.getPublico(id).then(setMiPerfil).catch(() => {});
    cargar();
    window.addEventListener(PERFIL_ACTUALIZADO, cargar);
    return () => window.removeEventListener(PERFIL_ACTUALIZADO, cargar);
  }, [isAuthenticated]);
  const miNombre = miPerfil
    ? (miPerfil.NombrePreferido || `${miPerfil.Nombre || ""} ${miPerfil.ApelPaterno || ""}`.trim())
    : (sessionStorage.getItem("user_name") || "");
  const miFoto = miPerfil?.Fotografias?.[0] || null;

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

  // Doble visto bueno de vacaciones: cualquier persona que sea jefe directo
  // de alguien revisa las solicitudes de su equipo, aunque su rol no tenga
  // menú de Gestión. Solo se muestra la entrada si de verdad tiene alguna.
  const [vacDeMiEquipo, setVacDeMiEquipo] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || isAdmin || hasSpecialDashboard || !isModuleActive("vacaciones")) return;
    vacacionesService.getPendientes()
      .then(d => setVacDeMiEquipo(Array.isArray(d) ? d.length : 0))
      .catch(() => setVacDeMiEquipo(0));
  }, [isAuthenticated, isAdmin, hasSpecialDashboard, isModuleActive, location.pathname]);

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
        ...(vacDeMiEquipo > 0
          ? [{ label: "Vacaciones de mi equipo", icon: FiSun, isLink: true, to: "/vacaciones" }] : []),
        // El empleado ve SU resumen, no la analítica de la empresa.
        { label: userRole === "EMPLOYEE" ? "Mi resumen" : "Analítica", icon: FiBarChart2, isLink: true, to: "/analitica" },
      ],
    },
    ...(isAdmin || hasSpecialDashboard
      ? [{
          section: "Gestión",
          entries: [
            ...(isAdmin && isModuleActive("empleados_table")
              ? [{ label: "Empleados / RH", icon: FiList, isLink: true, to: "/empleados" }] : []),
            ...(isAdmin
              ? [{ label: "Solicitudes a RH", icon: FiInbox, isLink: true, to: "/solicitudes" }] : []),
            ...((userRole === "RH" || userRole === "SUPER_ADMIN")
              ? [{ label: "Carga masiva", icon: FiUploadCloud, isLink: true, to: "/carga-masiva" }] : []),
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
            // Solo el operador de Cibercom (no cualquier SUPER_ADMIN de una
            // empresa cliente) — mismo criterio que protege /admin/tenants
            // en el backend (api/tenants/routes.py).
            ...(isOperadorCibercom
              ? [{ label: "Empresas", icon: FiGlobe, isLink: true, to: "/tenants" }] : []),
          ],
        }]
      : []),
    {
      section: "Cuenta",
      entries: [
        // URL limpia: /Perfil/juan-perez
        // Las cuentas administrativas no son personas de la plantilla: no tienen perfil.
        ...(mySlug && !["SUPER_ADMIN", "ADMIN"].includes(userRole) ? [{ label: "Mi perfil", icon: FiUser, isLink: true, to: `/Perfil/${mySlug}`, tour: "mi-perfil" }] : []),
      ],
    },
  ];

  // No renderizar el dashboard hasta que el rol esté confirmado desde sessionStorage
  if (!roleReady && !isLoginPage && !isMonitorPage) return null;

  if (isMonitorPage) return <Routes><Route path="/monitor" element={<IncidentMonitor />} /></Routes>;

  if (!isAuthenticated && location.pathname === "/") return <><AmbientBackground intensidad="alta" /><PublicLanding /></>;
  if (!isAuthenticated && location.pathname === "/registro") return <><AmbientBackground intensidad="alta" /><CompanyRegistration /></>;

  if (isLoginPage) return (
    <>
    <AmbientBackground intensidad="alta" />
    <Routes>
      <Route path="/Login" element={
        isAuthenticated
          ? <Navigate to="/Dashboard" replace />
          : <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />
      } />
      {/* Link de empresa: solo la marca/branding antes de loguearse — el
          login en sí sigue resolviendo el tenant por email, como siempre. */}
      <Route path="/:orgSlug" element={
        <OrgGate setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />
      } />
      <Route path="*" element={<Navigate to="/Login" replace />} />
    </Routes>
    </>
  );

  return (
    <div className="app-shell">
      <AmbientBackground />
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
            <button type="button" className="sb-me" onClick={() => abrirAjustes("perfil")} aria-label="Abrir ajustes de perfil" title="Ajustes de perfil">
              <span className="sb-me-avatar">
                {miFoto ? <img src={miFoto} alt="" /> : <span>{(miNombre || "?").trim()[0]?.toUpperCase()}</span>}
              </span>
              <span className="sb-me-text">
                <span className="sb-me-name">{miNombre || "Mi cuenta"}</span>
                <span className="sb-me-role">{roleLabel(userRole)}</span>
              </span>
              <FiAjustes className="sb-me-gear" aria-hidden="true" />
            </button>
            <button className="sb-logout" onClick={handleLogout}>
              <span className="sb-item-icon"><FiLogOut /></span>
              <span className="sb-item-label">Cerrar sesión</span>
            </button>
          </div>
        </aside>
      )}

      {isAuthenticated && <Spotlight userRole={userRole} />}
      {isAuthenticated && <OnboardingTour />}
      {isAuthenticated && <AjustesPerfil />}
      {isAuthenticated && <ContactoRH />}

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
        {universo && (
          <div className="universo-banner" role="status">
            <FiEye aria-hidden="true" />
            <span>Estás viendo el universo de <strong>{authService.getUniversoNombre()}</strong> · modo soporte, solo lectura</span>
            <button type="button" onClick={salirDeUniverso} aria-label="Salir del universo" title="Salir del universo"><FiLogOut aria-hidden="true" /></button>
          </div>
        )}
        <div className="route-view" key={location.pathname}>
        <Routes location={location}>
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
          <Route path="/nomina"     element={<RoleRoute roles={["ADMIN","SUPER_ADMIN","RH","CONTADOR"]}><div className="page-padded fade-in-page"><PayrollTable /></div></RoleRoute>} />
          <Route path="/carga-masiva" element={<RoleRoute roles={["RH", "SUPER_ADMIN"]}><div className="page-padded fade-in-page"><CargaMasiva /></div></RoleRoute>} />
          <Route path="/solicitudes" element={<RoleRoute roles={ROLES_ADMIN}><div className="page-padded fade-in-page"><BandejaRH /></div></RoleRoute>} />
          <Route path="/reclutamiento" element={<RoleRoute roles={ROLES_ADMIN}><div className="page-padded fade-in-page"><Reclutamiento /></div></RoleRoute>} />
          <Route path="/desempeno" element={<PrivateRoute><div className="page-padded fade-in-page"><Desempeno /></div></PrivateRoute>} />
          <Route path="/analitica" element={<PrivateRoute><div className="page-padded fade-in-page">{userRole === "EMPLOYEE" ? <MiResumen /> : <Analitica />}</div></PrivateRoute>} />
          <Route path="/settings"   element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><OrgSettings /></div></RoleRoute>} />
          <Route path="/roles"      element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><RoleManager /></div></RoleRoute>} />
          <Route path="/cuentas"    element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><GestionUsuarios /></div></RoleRoute>} />
          <Route path="/integraciones" element={<RoleRoute roles={["SUPER_ADMIN"]}><div className="page-padded fade-in-page"><ConexionesExternas /></div></RoleRoute>} />
          {/* Registro de empresas: no basta con RoleRoute(SUPER_ADMIN) — un
              SUPER_ADMIN de una empresa cliente no debe entrar aquí, solo el
              operador de Cibercom (mismo criterio que el backend). */}
          <Route path="/tenants" element={
            isOperadorCibercom
              ? <div className="page-padded fade-in-page"><Tenants /></div>
              : <Navigate to={isAuthenticated ? "/Dashboard" : "/Login"} replace />
          } />
          <Route path="/monitor"    element={<RoleRoute roles={["SUPER_ADMIN"]}><IncidentMonitor /></RoleRoute>} />
          <Route path="*"           element={<Navigate to={isAuthenticated ? "/Dashboard" : "/Login"} replace />} />
        </Routes>
        </div>
        <footer className="app-footer"><p>Copyright © 2026 | {orgName} Sistemas</p></footer>
      </main>
    </div>
  );
}

// framer-motion sigue la misma preferencia que el CSS (Ajustes → Preferencias
// o "reducir movimiento" del sistema operativo).
function MotionShell({ children }) {
  const { reducedMotion } = useTheme();
  return <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>{children}</MotionConfig>;
}

function App() {
  return (
    <ThemeProvider>
      <MotionShell>
        <OrgProvider>
          <AppInner />
        </OrgProvider>
      </MotionShell>
    </ThemeProvider>
  );
}

export default App;
