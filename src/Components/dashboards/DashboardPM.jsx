import React, { useEffect, useState, useMemo } from "react";
import "./DashboardEspecializado.css";
import { empleadoService } from "../../services/empleadoService";
import { rhService }        from "../../services/rhService";
import { educacionService } from "../../services/educacionService";
import EmployeeQuickView    from "../EmployeeQuickView";

const getId = (i) => i?._id?.$oid || i?._id || "";
const COLORS = ["#5B8AF0","#4ECAAC","#9B7FE8","#F5A623","#E86B5F","#73C990","#5DC8F5","#F07E6E"];

// Proyectos mockeados — cuando exista endpoint real solo cambiar el fetch
const PROYECTOS_MOCK = [
  { id:1, nombre:"Portal Web Cibercom",     avance:75,  estado:"Activo",     entrega:"2026-04-30", equipo:3 },
  { id:2, nombre:"App Móvil Empleados",     avance:40,  estado:"Activo",     entrega:"2026-06-15", equipo:2 },
  { id:3, nombre:"Migración Base de Datos", avance:100, estado:"Completado", entrega:"2026-02-01", equipo:2 },
  { id:4, nombre:"API de Integraciones",    avance:20,  estado:"Activo",     entrega:"2026-07-01", equipo:4 },
  { id:5, nombre:"Dashboard Directivo",     avance:60,  estado:"Activo",     entrega:"2026-05-15", equipo:2 },
];

const estadoColor = { Activo: "#4ECAAC", Completado: "#5B8AF0", Pausado: "#F5A623", Cancelado: "#E86B5F" };

const KpiCard = ({ label, value, sub, color }) => (
  <div className="de-kpi">
    <span className="de-kpi-accent" style={{ background: color }} />
    <div>
      <div className="de-kpi-val">{value}</div>
      <div className="de-kpi-lbl">{label}</div>
      {sub && <div className="de-kpi-sub">{sub}</div>}
    </div>
  </div>
);

function DashboardPM() {
  const [empleados,  setEmpleados]  = useState([]);
  const [rhData,     setRhData]     = useState([]);
  const [educacion,  setEducacion]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [quickView,  setQuickView]  = useState(null);

  useEffect(() => {
    Promise.all([
      empleadoService.getAll(),
      rhService.getAll().catch(() => []),
      educacionService.getAll().catch(() => []),
    ]).then(([emps, rh, edu]) => {
      setEmpleados(Array.isArray(emps) ? emps : []);
      setRhData(Array.isArray(rh)   ? rh   : []);
      setEducacion(Array.isArray(edu)  ? edu  : []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
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
        nombre, promedio: Math.round(suma / count), personas: count,
      }))
      .sort((a, b) => b.personas - a.personas || b.promedio - a.promedio)
      .slice(0, 10);

    // Carga de trabajo aproximada: empleados por jefe
    const cargaMap = {};
    rhData.forEach(r => {
      const j = r.JefeInmediato || "Sin asignar";
      cargaMap[j] = (cargaMap[j] || 0) + 1;
    });
    const cargaData = Object.entries(cargaMap)
      .map(([jefe, count]) => ({ jefe, count }))
      .sort((a, b) => b.count - a.count).slice(0, 6);

    const activos    = PROYECTOS_MOCK.filter(p => p.estado === "Activo").length;
    const completados = PROYECTOS_MOCK.filter(p => p.estado === "Completado").length;
    const avancePromedio = Math.round(
      PROYECTOS_MOCK.filter(p => p.estado === "Activo")
        .reduce((s, p) => s + p.avance, 0) /
      Math.max(activos, 1)
    );

    return { skillData, cargaData, activos, completados, avancePromedio, maxCarga: Math.max(...cargaData.map(c => c.count), 1) };
  }, [educacion, rhData]);

  const handleEmpClick = (emp, e) => {
    setQuickView({ emp, rect: e.currentTarget.getBoundingClientRect() });
  };

  if (loading) return <div className="de-loading"><div className="de-spinner" /><span>Cargando…</span></div>;

  return (
    <div className="de-root">
      {quickView && (
        <EmployeeQuickView emp={quickView.emp} anchorRect={quickView.rect} onClose={() => setQuickView(null)} />
      )}

      <div className="de-page-header">
        <div>
          <h2 className="de-title">Seguimiento de proyectos</h2>
          <p className="de-subtitle">Vista Project Manager · Capacidad y habilidades del equipo</p>
        </div>
        <span className="de-role-badge de-role-badge--purple">PM</span>
      </div>

      <div className="de-kpi-grid">
        <KpiCard label="Proyectos activos"    value={stats.activos}         color="#4ECAAC" />
        <KpiCard label="Completados"          value={stats.completados}     color="#5B8AF0" />
        <KpiCard label="Avance promedio"      value={`${stats.avancePromedio}%`} color="#F5A623"
          sub="proyectos activos" />
        <KpiCard label="Total equipo"         value={empleados.length}      color="#9B7FE8" />
      </div>

      {/* Proyectos */}
      <div className="de-card" style={{ marginBottom: 10 }}>
        <div className="de-card-title">Estado de proyectos</div>
        {PROYECTOS_MOCK.map(p => (
          <div key={p.id} className="de-proyecto-row">
            <div className="de-proyecto-info">
              <span className="de-proyecto-nombre">{p.nombre}</span>
              <span className="de-proyecto-meta">Entrega: {p.entrega} · {p.equipo} personas</span>
            </div>
            <div className="de-proyecto-bar-wrap">
              <div className="de-bar-track" style={{ flex: 1 }}>
                <div className="de-bar-fill"
                  style={{ width: `${p.avance}%`, background: estadoColor[p.estado] || "#888" }} />
              </div>
              <span className="de-proyecto-pct">{p.avance}%</span>
            </div>
            <span className="de-tag"
              style={{ background: `${estadoColor[p.estado]}18`, color: estadoColor[p.estado] }}>
              {p.estado}
            </span>
          </div>
        ))}
      </div>

      <div className="de-mid-row">
        {/* Habilidades del equipo */}
        <div className="de-card">
          <div className="de-card-title">Habilidades del equipo · promedio</div>
          {stats.skillData.length === 0
            ? <p className="de-empty">Sin habilidades registradas.</p>
            : stats.skillData.map((s, i) => (
                <div key={s.nombre} className="de-skill-row">
                  <span className="de-skill-name">{s.nombre}</span>
                  <div className="de-bar-track" style={{ flex: 1 }}>
                    <div className="de-bar-fill"
                      style={{ width: `${s.promedio}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="de-skill-meta">{s.promedio}% · {s.personas}p</span>
                </div>
              ))
          }
        </div>

        {/* Carga por jefe */}
        <div className="de-card">
          <div className="de-card-title">Carga de reportes por jefe inmediato</div>
          {stats.cargaData.map((c, i) => (
            <div key={c.jefe} className="de-bar-row">
              <span className="de-bar-lbl" title={c.jefe}>{c.jefe}</span>
              <div className="de-bar-track">
                <div className="de-bar-fill"
                  style={{ width: `${Math.round((c.count / stats.maxCarga) * 100)}%`, background: COLORS[i % COLORS.length] }} />
              </div>
              <span className="de-bar-num">{c.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de equipo clickeable */}
      <div className="de-card">
        <div className="de-card-title">Equipo · clic para ver datos rápidos</div>
        <div className="de-emp-grid">
          {empleados.slice(0, 12).map(emp => {
            const rh = rhData.find(r => (r.empleado_id?.$oid || r.empleado_id) === getId(emp));
            const [bg, fg] = [["#ede9fe","#6d28d9"],["#dbeafe","#1d4ed8"],["#dcfce7","#15803d"]][
              (emp.Nombre?.charCodeAt(0) || 0) % 3
            ];
            return (
              <div key={getId(emp)} className="de-emp-chip"
                onClick={ev => handleEmpClick(emp, ev)}>
                <div className="de-emp-ini" style={{ background: bg, color: fg, width: 24, height: 24, fontSize: 10 }}>
                  {(emp.Nombre?.[0] || "") + (emp.ApelPaterno?.[0] || "")}
                </div>
                <div className="de-emp-chip-info">
                  <span className="de-emp-name" style={{ fontSize: "0.72rem" }}>{emp.Nombre} {emp.ApelPaterno?.[0]}.</span>
                  <span className="de-emp-hint">{rh?.Puesto || "Sin puesto"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DashboardPM;