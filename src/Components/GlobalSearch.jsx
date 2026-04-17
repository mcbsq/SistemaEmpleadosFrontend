import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./GlobalSearch.css";
import { empleadoService } from "../services/empleadoService";
import { rhService }        from "../services/rhService";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getId = (item) => item?._id?.$oid || item?._id || "";

const AVATAR_COLORS = [
  ["#dbeafe","#1d4ed8"],["#dcfce7","#15803d"],["#fef3c7","#b45309"],
  ["#ede9fe","#6d28d9"],["#fce7f3","#be185d"],["#e0f2fe","#0369a1"],
];
const avatarColor = (str = "") =>
  AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// Secciones del sistema con su ruta o sectionId
const SECCIONES = [
  { label: "Dashboard · analíticos",   icon: "◈", tipo: "scroll", target: "admin-dashboard-section", roles: ["ADMIN","SUPER_ADMIN","CONTADOR","PROJECT_MANAGER","MEDICO","JEFE_AREA"] },
  { label: "Mi equipo · carrusel",      icon: "◉", tipo: "scroll", target: "home-section",            roles: ["EMPLOYEE","JEFE_AREA","ADMIN","SUPER_ADMIN"] },
  { label: "Organigrama",              icon: "⬡", tipo: "scroll", target: "organigrama-section",     roles: ["EMPLOYEE","JEFE_AREA","ADMIN","SUPER_ADMIN","CONTADOR","PROJECT_MANAGER","MEDICO"] },
  { label: "Empleados / RH · tabla",   icon: "▤", tipo: "ruta",   target: "/empleados",              roles: ["ADMIN","SUPER_ADMIN"] },
  { label: "Gestión de roles",         icon: "⚙", tipo: "ruta",   target: "/roles",                  roles: ["SUPER_ADMIN"] },
  { label: "Monitor de incidencias",   icon: "⚡", tipo: "ruta",   target: "/monitor",                roles: ["SUPER_ADMIN"] },
];

// ════════════════════════════════════════════════════════════════════════════════
function GlobalSearch({ userRole }) {
  const [query,     setQuery]     = useState("");
  const [open,      setOpen]      = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [rhData,    setRhData]    = useState([]);
  const [loaded,    setLoaded]    = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef  = useRef(null);
  const dropRef   = useRef(null);
  const wrapRef   = useRef(null);
  const navigate  = useNavigate();
  const location  = useLocation();

  // Cargar datos una sola vez
  useEffect(() => {
    if (loaded) return;
    Promise.all([
      empleadoService.getAll().catch(() => []),
      rhService.getAll().catch(() => []),
    ]).then(([emps, rh]) => {
      setEmpleados(Array.isArray(emps) ? emps : []);
      setRhData(Array.isArray(rh)     ? rh   : []);
      setLoaded(true);
    });
  }, [loaded]);

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [location.pathname]);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Cerrar al clic fuera
  useEffect(() => {
    if (!open) return;
    const onOut = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, [open]);

  // ─── Resultados ─────────────────────────────────────────────────────────────
  const getResults = useCallback(() => {
    if (!query.trim()) return { emps: [], secs: [] };
    const q = query.toLowerCase();

    const secs = SECCIONES
      .filter(s => !s.roles || s.roles.includes(userRole))
      .filter(s => s.label.toLowerCase().includes(q));

    const emps = empleados
      .map(emp => {
        const rh = rhData.find(r =>
          (r.empleado_id?.$oid || r.empleado_id) === getId(emp)
        );
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

  // Reset active al cambiar query
  useEffect(() => { setActiveIdx(-1); }, [query]);

  // ─── Acción al seleccionar un resultado ─────────────────────────────────────
  const selectItem = useCallback((item) => {
    if (!item) return;
    setOpen(false);
    setQuery("");
    if (item.type === "seccion") {
      const sec = item.data;
      if (sec.tipo === "ruta") {
        navigate(sec.target);
      } else {
        // scroll — si no estamos en /Dashboard, navegar primero
        if (location.pathname !== "/Dashboard") {
          navigate("/Dashboard");
          setTimeout(() => {
            document.getElementById(sec.target)?.scrollIntoView({ behavior: "smooth" });
          }, 200);
        } else {
          document.getElementById(sec.target)?.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      navigate(`/Perfil/${getId(item.data.emp)}`);
    }
  }, [navigate, location.pathname]);

  // ─── Navegación por teclado ──────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectItem(allResults[activeIdx]);
    }
  };

  // ─── Highlight del texto buscado ────────────────────────────────────────────
  const hi = (text, q) => {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="gs-mark">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="gs-wrap" ref={wrapRef}>
      {/* ── Input siempre visible en sidebar ────────────────────────────── */}
      <div className={`gs-input-box ${open ? "gs-input-box--open" : ""}`}>
        <span className="gs-icon" aria-hidden>⌕</span>
        <input
          ref={inputRef}
          type="text"
          className="gs-input"
          placeholder="Buscar… (⌘K)"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            className="gs-clear"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            tabIndex={-1}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Dropdown flotante ────────────────────────────────────────────── */}
      {open && (
        <div className="gs-dropdown" ref={dropRef} role="listbox">
          {!hasQuery ? (
            /* Estado vacío: sugerencias rápidas */
            <div className="gs-empty-state">
              <p className="gs-empty-title">Búsqueda global</p>
              <p className="gs-empty-sub">Empleados, secciones, perfiles</p>
              <div className="gs-kbd-row">
                <span className="gs-kbd-hint"><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
                <span className="gs-kbd-hint"><kbd>↵</kbd> ir</span>
                <span className="gs-kbd-hint"><kbd>ESC</kbd> cerrar</span>
              </div>
              {/* Atajos rápidos de secciones visibles para este rol */}
              <div className="gs-quick-list">
                {SECCIONES
                  .filter(s => !s.roles || s.roles.includes(userRole))
                  .slice(0, 4)
                  .map(s => (
                    <button
                      key={s.label}
                      className="gs-quick-item"
                      onClick={() => selectItem({ type: "seccion", data: s })}
                    >
                      <span className="gs-quick-icon">{s.icon}</span>
                      <span className="gs-quick-label">{s.label}</span>
                      <span className="gs-quick-arrow">→</span>
                    </button>
                  ))
                }
              </div>
            </div>
          ) : total === 0 ? (
            <div className="gs-no-results">
              Sin resultados para <strong>"{query}"</strong>
            </div>
          ) : (
            <>
              {/* Secciones */}
              {secs.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label">Secciones del sistema</div>
                  {secs.map((s, i) => (
                    <div
                      key={s.label}
                      role="option"
                      className={`gs-result gs-result--section ${activeIdx === i ? "gs-result--active" : ""}`}
                      onClick={() => selectItem({ type: "seccion", data: s })}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      <span className="gs-result-icon">{s.icon}</span>
                      <span className="gs-result-name">{hi(s.label, query)}</span>
                      <span className="gs-result-go">
                        {s.tipo === "ruta" ? "Abrir →" : "Ir →"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Empleados */}
              {emps.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label">Empleados</div>
                  {emps.map(({ emp, puesto }, i) => {
                    const gIdx   = secs.length + i;
                    const nombre = `${emp.Nombre || ""} ${emp.ApelPaterno || ""}`.trim();
                    const foto   = emp.Fotografias?.[0] || emp.Fotografia;
                    const [bg, fg] = avatarColor(emp.Nombre || "");
                    const ini    = ((emp.Nombre?.[0] || "") + (emp.ApelPaterno?.[0] || "")).toUpperCase();

                    return (
                      <div
                        key={getId(emp)}
                        role="option"
                        className={`gs-result gs-result--emp ${activeIdx === gIdx ? "gs-result--active" : ""}`}
                        onClick={() => selectItem({ type: "empleado", data: { emp } })}
                        onMouseEnter={() => setActiveIdx(gIdx)}
                      >
                        {foto ? (
                          <img
                            src={foto} alt={nombre}
                            className="gs-avatar-img"
                            onError={e => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <div className="gs-avatar-ph" style={{ background: bg, color: fg }}>
                            {ini || "?"}
                          </div>
                        )}
                        <div className="gs-result-info">
                          <span className="gs-result-name">{hi(nombre, query)}</span>
                          {puesto && (
                            <span className="gs-result-sub">{hi(puesto, query)}</span>
                          )}
                        </div>
                        <span className="gs-result-go">Ver perfil →</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer con conteo */}
              <div className="gs-footer">
                <span>{total} resultado{total !== 1 ? "s" : ""}</span>
                {total >= 8 && (
                  <span className="gs-footer-hint">Refina la búsqueda para ver más</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;