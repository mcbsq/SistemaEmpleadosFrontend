import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./AdminDashboard.css";
import { empleadoService } from "../services/empleadoService";
import { authService }     from "../services/authService";
import { rhService }        from "../services/rhService";
import { clinicoService }   from "../services/clinicoService";
import { educacionService } from "../services/educacionService";
import { contactoService }  from "../services/contactoService";
import { useOrg } from "../context/OrgContext";
import { ReportesCard } from "./Analitica";
import { apiFetch } from "../services/apiConfig";
import { FiClock, FiActivity, FiCheckCircle } from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getId = (item) => item?._id?.$oid || item?._id || "";

const cumpleProximos7 = (fecNac) => {
  if (!fecNac) return false;
  const hoy     = new Date();
  const cumple  = new Date(fecNac);
  const proxima = new Date(hoy.getFullYear(), cumple.getMonth(), cumple.getDate());
  if (proxima < hoy) proxima.setFullYear(hoy.getFullYear() + 1);
  const diff = (proxima - hoy) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
};

const diasHastaCumple = (fecNac) => {
  const hoy    = new Date();
  const cumple = new Date(fecNac);
  const p      = new Date(hoy.getFullYear(), cumple.getMonth(), cumple.getDate());
  if (p < hoy) p.setFullYear(hoy.getFullYear() + 1);
  return Math.round((p - hoy) / (1000 * 60 * 60 * 24));
};

const cumpleEsteMes = (fecNac) => {
  if (!fecNac) return false;
  return new Date(fecNac).getMonth() === new Date().getMonth();
};

const formatNombre = (emp) =>
  [emp?.Nombre, emp?.ApelPaterno].filter(Boolean).join(" ");

const AVATAR_COLORS = [
  ["#dbeafe","#1d4ed8"],["#dcfce7","#15803d"],["#fef3c7","#b45309"],
  ["#ede9fe","#6d28d9"],["#fce7f3","#be185d"],["#e0f2fe","#0369a1"],
];
const avatarColor = (str = "") =>
  AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

const COLORS = [
  "#5B8AF0","#4ECAAC","#9B7FE8","#F5A623",
  "#E86B5F","#73C990","#5DC8F5","#F07E6E",
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color }) => (
  <div className="ad-kpi">
    <span className="ad-kpi-accent" style={{ background: color }} />
    <div>
      <div className="ad-kpi-val">{value}</div>
      <div className="ad-kpi-lbl">{label}</div>
      {sub && <div className="ad-kpi-sub">{sub}</div>}
    </div>
  </div>
);

// ─── Barra horizontal ─────────────────────────────────────────────────────────
const HBar = ({ label, value, max, color }) => (
  <div className="ad-bar-row">
    <span className="ad-bar-lbl" title={label}>{label}</span>
    <div className="ad-bar-track">
      <div
        className="ad-bar-fill"
        style={{ width: `${Math.round((value / Math.max(max, 1)) * 100)}%`, background: color }}
      />
    </div>
    <span className="ad-bar-num">{value}</span>
  </div>
);

// ─── Tag ─────────────────────────────────────────────────────────────────────
const Tag = ({ type, children }) => (
  <span className={`ad-tag ad-tag--${type}`}>{children}</span>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ emp, size = 28 }) => {
  const foto = emp?.Fotografias?.[0] || emp?.Fotografia;
  const [bg, fg] = avatarColor(emp?.Nombre || "");
  const ini = ((emp?.Nombre?.[0] || "") + (emp?.ApelPaterno?.[0] || "")).toUpperCase();
  return foto ? (
    <img src={foto} alt={formatNombre(emp)} className="ad-avatar-img"
      style={{ width: size, height: size }}
      onError={e => { e.target.style.display = "none"; }} />
  ) : (
    <div className="ad-avatar-ph"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.38) }}>
      {ini || "?"}
    </div>
  );
};

// ─── Gauge SVG ────────────────────────────────────────────────────────────────
const Gauge = ({ pct }) => {
  const safe  = Math.min(100, Math.max(0, pct));
  const angle = (safe / 100) * Math.PI;
  const ex    = 60 + 50 * Math.cos(Math.PI + angle);
  const ey    = 60 + 50 * Math.sin(Math.PI + angle);
  const lFlag = safe > 50 ? 1 : 0;
  return (
    <svg viewBox="0 0 120 70" width="120" height="70" aria-label={`Completitud ${pct}%`}>
      <path d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none" stroke="var(--ad-border)" strokeWidth="9" strokeLinecap="round" />
      {safe > 0 && (
        <path d={`M 10 60 A 50 50 0 ${lFlag} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
          fill="none" stroke="#5B8AF0" strokeWidth="9" strokeLinecap="round" />
      )}
      <text x="60" y="50" textAnchor="middle" fontSize="16" fontWeight="500"
        fill="var(--ad-text)">{pct}%</text>
      <text x="60" y="63" textAnchor="middle" fontSize="9"
        fill="var(--ad-text-muted)">completos</text>
    </svg>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
function AdminDashboard() {
  const { getActiveKpis } = useOrg();
  const [empleados, setEmpleados] = useState([]);
  const [rhData,    setRhData]    = useState([]);
  const [clinico,   setClinico]   = useState([]);
  const [educacion, setEducacion] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reintento, setReintento] = useState(0);
  const [pendientesVac, setPendientesVac] = useState([]);
  const [actividad,     setActividad]     = useState([]);

  const esSuperAdmin = authService.isSuperAdmin();

  useEffect(() => {
    apiFetch("/vacaciones/pendientes").then(d => setPendientesVac(Array.isArray(d) ? d : [])).catch(() => {});
    if (esSuperAdmin) {
      apiFetch("/auditoria?limite=5").then(d => setActividad(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [esSuperAdmin, reintento]);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      // Si /empleados falla (red, sesión), mostramos error con reintento en
      // vez de un dashboard vacío en silencio.
      empleadoService.getAll().catch(() => null),
      rhService.getAll().catch(() => []),
      clinicoService.getAll().catch(() => []),
      educacionService.getAll().catch(() => []),
      contactoService.getDatos().catch(() => []),
    ]).then(([emps, rh, clin, edu, cont]) => {
      if (emps === null) { setLoadError(true); return; }
      setEmpleados(Array.isArray(emps) ? emps  : []);
      setRhData(   Array.isArray(rh)   ? rh    : []);
      setClinico(  Array.isArray(clin) ? clin  : []);
      setEducacion(Array.isArray(edu)  ? edu   : []);
      setContactos(Array.isArray(cont) ? cont  : []);
    }).finally(() => setLoading(false));
  }, [reintento]);

  const stats = useMemo(() => {
    const total   = empleados.length;
    const clinIds = new Set(clinico.map(c  => c.empleado_id?.$oid  || c.empleado_id  || ""));
    const contIds = new Set(contactos.map(c => {
      const raw = c.empleado_id ?? c.EmpleadoId;
      return raw?.$oid || raw || "";
    }));
    const rhIds   = new Set(rhData.map(r   => r.empleado_id?.$oid  || r.empleado_id  || ""));

    // Distribución por puesto
    const puestoMap = {};
    rhData.forEach(r => {
      const p = r.Puesto || "Sin asignar";
      puestoMap[p] = (puestoMap[p] || 0) + 1;
    });
    const puestoData = Object.entries(puestoMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 7);

    // Completitud
    const conClinico  = empleados.filter(e => clinIds.has(getId(e))).length;
    const pctCompleto = total > 0 ? Math.round((conClinico / total) * 100) : 0;

    // Alertas
    const alertas = [];
    empleados.forEach(e => {
      const id = getId(e);
      if (cumpleProximos7(e.FecNacimiento)) {
        const d = diasHastaCumple(e.FecNacimiento);
        alertas.push({ emp: e, tipo: "cumple",   label: d === 0 ? "Hoy" : `En ${d}d` });
      }
      if (!clinIds.has(id))  alertas.push({ emp: e, tipo: "clinico",  label: "Sin exp. clínico" });
      if (!rhIds.has(id))    alertas.push({ emp: e, tipo: "rh",       label: "Sin puesto" });
      if (!contIds.has(id))  alertas.push({ emp: e, tipo: "contacto", label: "Sin contacto" });
    });

    // Habilidades agregadas
    const skillMap = {};
    educacion.forEach(ed => {
      (ed.Habilidades?.Programacion || []).forEach(h => {
        const nombre = h.Titulo || h.titulo || "";
        const pct    = Number(h.Porcentaje || h.porcentaje || 0);
        if (!nombre) return;
        if (!skillMap[nombre]) skillMap[nombre] = { suma: 0, count: 0 };
        skillMap[nombre].suma  += pct;
        skillMap[nombre].count += 1;
      });
    });
    const skillData = Object.entries(skillMap)
      .map(([nombre, { suma, count }]) => ({
        nombre,
        promedio: Math.round(suma / count),
        personas: count,
      }))
      .sort((a, b) => b.personas - a.personas || b.promedio - a.promedio)
      .slice(0, 8);

    // Empleados recientes con estado
    const empRecientes = [...empleados].reverse().slice(0, 5).map(e => ({
      emp: e,
      puesto:        rhData.find(r => (r.empleado_id?.$oid || r.empleado_id) === getId(e))?.Puesto || "",
      tieneClinico:  clinIds.has(getId(e)),
      tieneRH:       rhIds.has(getId(e)),
    }));

    return {
      total, pctCompleto,
      cumplesMes:   empleados.filter(e => cumpleEsteMes(e.FecNacimiento)).length,
      sinClinico:   total - conClinico,
      sinPuesto:    empleados.filter(e => !rhIds.has(getId(e))).length,
      areaCount:    puestoData.length,
      puestoData,
      maxPuesto:    Math.max(...puestoData.map(p => p.value), 1),
      alertas:      alertas.slice(0, 8),
      skillData,
      empRecientes,
      cumpleProx:   alertas.filter(a => a.tipo === "cumple").length,
    };
  }, [empleados, rhData, clinico, educacion, contactos]);

  if (loading) {
    return (
      <div className="ad-loading">
        <div className="ad-spinner" />
        <span>Cargando analíticos…</span>
      </div>
    );
  }

  // Un ADMIN sin áreas asignadas no ve empleados por diseño del backend:
  // explicárselo es mejor que mostrar un dashboard lleno de ceros.
  if (!loading && !loadError && empleados.length === 0 && authService.getRole() === "ADMIN") {
    return (
      <div className="ad-loading" role="status">
        <span style={{ fontSize: "1rem", fontWeight: 600 }}>No tienes áreas asignadas</span>
        <span style={{ maxWidth: 420, textAlign: "center", opacity: 0.75, marginTop: 8 }}>
          Tu cuenta de administrador aún no administra ningún área, por lo que no hay
          empleados que mostrar. Pide a un Super Admin que te asigne áreas desde
          Gestión de usuarios.
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="ad-loading" role="alert">
        <span>No se pudieron cargar los datos del dashboard.</span>
        <button
          type="button"
          onClick={() => setReintento(n => n + 1)}
          style={{
            marginTop: 12, padding: "8px 20px", borderRadius: 8,
            border: "1px solid var(--hr-border, #d2d2d7)", background: "transparent",
            color: "inherit", cursor: "pointer", fontSize: "0.85rem",
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="ad-root">

      {/* ── KPIs — configurables desde Configuración → KPIs ─────── */}
      <div className="ad-kpi-grid">
        {getActiveKpis().map(kpi => {
          const datos = {
            total_empleados:   { value: stats.total,      sub: null },
            areas_registradas: { value: stats.areaCount,  sub: null },
            cumpleanos_mes:    { value: stats.cumplesMes, sub: `${stats.cumpleProx} en próximos 7 días` },
            sin_expediente:    { value: stats.sinClinico, sub: `${stats.pctCompleto}% con expediente` },
            sin_puesto:        { value: stats.sinPuesto,  sub: null },
          }[kpi.id] || { value: "—", sub: null };
          return (
            <KpiCard key={kpi.id} label={kpi.label} value={datos.value} sub={datos.sub} color={kpi.color} />
          );
        })}
      </div>

      {/* ── Fila central ─────────────────────────────────────── */}
      <div className="ad-mid-row">

        <div className="ad-card">
          <div className="ad-card-title">Distribución por área</div>
          {stats.puestoData.length > 0
            ? stats.puestoData.map((d, i) => (
                <HBar key={d.label} label={d.label} value={d.value}
                  max={stats.maxPuesto} color={COLORS[i % COLORS.length]} />
              ))
            : <p className="ad-empty">Sin datos de RH.</p>
          }
        </div>

        <div className="ad-card">
          <div className="ad-card-title">Alertas activas</div>
          {stats.alertas.length === 0
            ? <p className="ad-empty">Sin alertas pendientes.</p>
            : (
              <ul className="ad-alert-list">
                {stats.alertas.map((a, i) => (
                  <li key={i} className="ad-alert-item">
                    <span className="ad-alert-name">{formatNombre(a.emp)}</span>
                    <Tag type={a.tipo === "cumple" ? "blue" : a.tipo === "rh" ? "red" : "amber"}>
                      {a.label}
                    </Tag>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        <div className="ad-card ad-gauge-card">
          <div className="ad-card-title">Completitud</div>
          <div className="ad-gauge-center">
            <Gauge pct={stats.pctCompleto} />
          </div>
          <p className="ad-gauge-hint">
            {stats.sinClinico > 0
              ? `${stats.sinClinico} sin expediente clínico`
              : "Todos los perfiles completos"}
          </p>
        </div>

      </div>

      {/* ── Aprobaciones pendientes / Actividad reciente ────────── */}
      <div className="ad-mid-row">
        <div className="ad-card">
          <div className="ad-card-title">
            <FiCheckCircle style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Aprobaciones pendientes
          </div>
          {pendientesVac.length === 0
            ? <p className="ad-empty">Sin solicitudes de vacaciones pendientes.</p>
            : (
              <ul className="ad-alert-list">
                {pendientesVac.slice(0, 5).map(s => (
                  <li key={s._id} className="ad-alert-item">
                    <span className="ad-alert-name">{s.empleado_nombre || "Empleado"}</span>
                    <Tag type="amber">{s.dias_solicitados} día{s.dias_solicitados === 1 ? "" : "s"}</Tag>
                  </li>
                ))}
              </ul>
            )
          }
          {pendientesVac.length > 0 && (
            <Link to="/vacaciones" className="ad-emp-link" style={{ display: "inline-block", marginTop: 10 }}>
              Ver todas ({pendientesVac.length}) →
            </Link>
          )}
        </div>

        {esSuperAdmin && (
          <div className="ad-card">
            <div className="ad-card-title">
              <FiActivity style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Actividad reciente
            </div>
            {actividad.length === 0
              ? <p className="ad-empty">Sin actividad registrada.</p>
              : (
                <ul className="ad-alert-list">
                  {actividad.map(a => (
                    <li key={a._id} className="ad-alert-item">
                      <span className="ad-alert-name">
                        <FiClock style={{ verticalAlign: "-2px", marginRight: 4, opacity: 0.6 }} />
                        {a.usuario || "Sistema"} · {a.accion} {a.entidad}
                      </span>
                      <Tag type="blue">
                        {a.creado_en ? new Date(a.creado_en).toLocaleDateString() : ""}
                      </Tag>
                    </li>
                  ))}
                </ul>
              )
            }
            <Link to="/settings" className="ad-emp-link" style={{ display: "inline-block", marginTop: 10 }}>
              Ver bitácora completa →
            </Link>
          </div>
        )}
      </div>

      {/* ── Fila inferior ────────────────────────────────────── */}
      <div className="ad-bottom-row">

        <div className="ad-card">
          <div className="ad-card-title">Empleados · acceso rápido</div>
          {stats.empRecientes.map(({ emp, puesto, tieneClinico, tieneRH }) => (
            <div key={getId(emp)} className="ad-emp-row">
              <Avatar emp={emp} size={28} />
              <div className="ad-emp-info">
                <div className="ad-emp-name">{formatNombre(emp)}</div>
                <div className="ad-emp-role">{puesto || "Sin puesto"}</div>
              </div>
              {!tieneClinico && <Tag type="amber">Sin exp.</Tag>}
              {!tieneRH      && <Tag type="red">Sin RH</Tag>}
              <Link to={`/Perfil/${getId(emp)}`} className="ad-emp-link">Ver →</Link>
            </div>
          ))}
          {empleados.length > 5 && (
            <div className="ad-emp-more">+{empleados.length - 5} empleados más</div>
          )}
        </div>

        <div className="ad-card">
          <div className="ad-card-title">Habilidades del equipo · promedio</div>
          {stats.skillData.length === 0
            ? <p className="ad-empty">Sin habilidades registradas.</p>
            : stats.skillData.map((s, i) => (
                <div key={s.nombre} className="ad-skill-row">
                  <span className="ad-skill-name">{s.nombre}</span>
                  <div className="ad-bar-track" style={{ flex: 1 }}>
                    <div className="ad-bar-fill"
                      style={{ width: `${s.promedio}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="ad-skill-meta">{s.promedio}% · {s.personas}p</span>
                </div>
              ))
          }
        </div>

      </div>

      {/* ── Analítica exportable ─────────────────────────────── */}
      <div className="ad-card" style={{ marginTop: 20 }}>
        <div className="ad-card-title">Analítica y reportes</div>
        <ReportesCard compact />
      </div>
    </div>
  );
}

export default AdminDashboard;