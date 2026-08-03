// src/Components/Spotlight.jsx
// Buscador global estilo macOS Spotlight: overlay centrado con fondo
// oscurecido, invocado con ⌘K/Ctrl+K desde cualquier pantalla. Reemplaza la
// barra de búsqueda fija que vivía dentro del sidebar.
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiSearch, FiX, FiGrid, FiUsers, FiShare2, FiList, FiShield, FiZap } from "react-icons/fi";
import "./Spotlight.css";
import { empleadoService } from "../services/empleadoService";
import { rhService }        from "../services/rhService";

const getId = (item) => item?._id?.$oid || item?._id || "";

const AVATAR_COLORS = [
  ["#dbeafe","#1d4ed8"],["#dcfce7","#15803d"],["#fef3c7","#b45309"],
  ["#ede9fe","#6d28d9"],["#fce7f3","#be185d"],["#e0f2fe","#0369a1"],
];
const avatarColor = (str = "") =>
  AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const SECCIONES = [
  { label: "Dashboard · analíticos",  icon: FiGrid,   tipo: "scroll", target: "admin-dashboard-section", roles: ["ADMIN","SUPER_ADMIN","CONTADOR","PROJECT_MANAGER","MEDICO","JEFE_AREA"] },
  { label: "Mi equipo · carrusel",     icon: FiUsers,  tipo: "scroll", target: "home-section",            roles: ["EMPLOYEE","JEFE_AREA","ADMIN","SUPER_ADMIN"] },
  { label: "Organigrama",              icon: FiShare2, tipo: "scroll", target: "organigrama-section",     roles: ["EMPLOYEE","JEFE_AREA","ADMIN","SUPER_ADMIN","CONTADOR","PROJECT_MANAGER","MEDICO"] },
  { label: "Empleados / RH · tabla",   icon: FiList,   tipo: "ruta",   target: "/empleados",              roles: ["ADMIN","SUPER_ADMIN"] },
  { label: "Gestión de roles",         icon: FiShield, tipo: "ruta",   target: "/roles",                  roles: ["SUPER_ADMIN"] },
  { label: "Monitor de incidencias",   icon: FiZap,    tipo: "ruta",   target: "/monitor",                roles: ["SUPER_ADMIN"] },
];

function Spotlight({ userRole }) {
  const [query,     setQuery]     = useState("");
  const [open,      setOpen]      = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [rhData,    setRhData]    = useState([]);
  const [loaded,    setLoaded]    = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open || loaded) return;
    Promise.all([
      empleadoService.getAll().catch(() => []),
      rhService.getAll().catch(() => []),
    ]).then(([emps, rh]) => {
      setEmpleados(Array.isArray(emps) ? emps : []);
      setRhData(Array.isArray(rh)     ? rh   : []);
      setLoaded(true);
    });
  }, [open, loaded]);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(p => !p);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Botón dedicado en el sidebar — dispara este evento en vez de duplicar
  // el estado "open" entre componentes.
  useEffect(() => {
    const onAbrir = () => setOpen(true);
    window.addEventListener("abrir-spotlight", onAbrir);
    return () => window.removeEventListener("abrir-spotlight", onAbrir);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQuery("");
  }, [open]);

  const getResults = useCallback(() => {
    if (!query.trim()) return { emps: [], secs: [] };
    const q = query.toLowerCase();

    const secs = SECCIONES
      .filter(s => !s.roles || s.roles.includes(userRole))
      .filter(s => s.label.toLowerCase().includes(q));

    const emps = empleados
      .map(emp => {
        const rh = rhData.find(r => (r.empleado_id?.$oid || r.empleado_id) === getId(emp));
        return { emp, puesto: rh?.Puesto || "" };
      })
      .filter(({ emp, puesto }) => {
        const nombre = `${emp.Nombre || ""} ${emp.ApelPaterno || ""} ${emp.ApelMaterno || ""}`.toLowerCase();
        return nombre.includes(q) || puesto.toLowerCase().includes(q);
      })
      .slice(0, 8);

    return { secs, emps };
  }, [query, empleados, rhData, userRole]);

  const { secs, emps } = getResults();
  const allResults = [
    ...secs.map(s => ({ type: "seccion", data: s })),
    ...emps.map(r => ({ type: "empleado", data: r })),
  ];
  const total = allResults.length;

  useEffect(() => { setActiveIdx(-1); }, [query]);

  const selectItem = useCallback((item) => {
    if (!item) return;
    setOpen(false);
    setQuery("");
    if (item.type === "seccion") {
      const sec = item.data;
      if (sec.tipo === "ruta") {
        navigate(sec.target);
      } else if (location.pathname !== "/Dashboard") {
        navigate("/Dashboard");
        setTimeout(() => document.getElementById(sec.target)?.scrollIntoView({ behavior: "smooth" }), 200);
      } else {
        document.getElementById(sec.target)?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(`/Perfil/${getId(item.data.emp)}`);
    }
  }, [navigate, location.pathname]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, total - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); selectItem(allResults[activeIdx]); }
  };

  const hi = (text, q) => {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (<>{text.slice(0, idx)}<mark className="spot-mark">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>);
  };

  const hasQuery = query.trim().length > 0;
  if (!open) return null;

  return (
    <div className="spot-backdrop" onClick={() => setOpen(false)}>
      <div className="spot-panel" onClick={e => e.stopPropagation()}>
        <div className="spot-input-row">
          <FiSearch className="spot-icon" />
          <input
            ref={inputRef}
            className="spot-input"
            placeholder="Buscar empleados, secciones…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
          />
          <button className="spot-close" onClick={() => setOpen(false)} aria-label="Cerrar"><FiX /></button>
        </div>

        <div className="spot-body">
          {!hasQuery ? (
            <div className="spot-quick-list">
              {SECCIONES.filter(s => !s.roles || s.roles.includes(userRole)).map(s => {
                const Icon = s.icon;
                return (
                  <button key={s.label} className="spot-quick-item" onClick={() => selectItem({ type: "seccion", data: s })}>
                    <Icon className="spot-quick-icon" />
                    <span className="spot-quick-label">{s.label}</span>
                  </button>
                );
              })}
            </div>
          ) : total === 0 ? (
            <div className="spot-no-results">Sin resultados para <strong>"{query}"</strong></div>
          ) : (
            <>
              {secs.length > 0 && (
                <div className="spot-group">
                  <div className="spot-group-label">Secciones</div>
                  {secs.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className={`spot-result ${activeIdx === i ? "spot-result--active" : ""}`}
                        onClick={() => selectItem({ type: "seccion", data: s })} onMouseEnter={() => setActiveIdx(i)}>
                        <Icon className="spot-result-icon" />
                        <span className="spot-result-name">{hi(s.label, query)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {emps.length > 0 && (
                <div className="spot-group">
                  <div className="spot-group-label">Empleados</div>
                  {emps.map(({ emp, puesto }, i) => {
                    const gIdx = secs.length + i;
                    const nombre = `${emp.Nombre || ""} ${emp.ApelPaterno || ""}`.trim();
                    const foto = emp.Fotografias?.[0] || emp.Fotografia;
                    const [bg, fg] = avatarColor(emp.Nombre || "");
                    const ini = ((emp.Nombre?.[0] || "") + (emp.ApelPaterno?.[0] || "")).toUpperCase();
                    return (
                      <div key={getId(emp)} className={`spot-result ${activeIdx === gIdx ? "spot-result--active" : ""}`}
                        onClick={() => selectItem({ type: "empleado", data: { emp } })} onMouseEnter={() => setActiveIdx(gIdx)}>
                        {foto
                          ? <img src={foto} alt={nombre} className="spot-avatar-img" onError={e => { e.target.style.display = "none"; }} />
                          : <div className="spot-avatar-ph" style={{ background: bg, color: fg }}>{ini || "?"}</div>}
                        <div className="spot-result-info">
                          <span className="spot-result-name">{hi(nombre, query)}</span>
                          {puesto && <span className="spot-result-sub">{hi(puesto, query)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="spot-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> ir</span>
          <span><kbd>ESC</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}

export default Spotlight;
