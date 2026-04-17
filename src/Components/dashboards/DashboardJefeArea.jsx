import React, { useEffect, useState, useMemo } from "react";
import "./DashboardEspecializado.css";
import { empleadoService } from "../../services/empleadoService";
import { rhService }        from "../../services/rhService";
import { educacionService } from "../../services/educacionService";
import { authService }      from "../../services/authService";
import EmployeeQuickView    from "../EmployeeQuickView";

const getId = (i) => i?._id?.$oid || i?._id || "";
const COLORS = ["#5B8AF0","#4ECAAC","#9B7FE8","#F5A623","#E86B5F","#73C990"];

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

function DashboardJefeArea() {
  const [empleados,  setEmpleados]  = useState([]);
  const [rhData,     setRhData]     = useState([]);
  const [educacion,  setEducacion]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [quickView,  setQuickView]  = useState(null);

  // El jefe solo ve su propio equipo (empleados que le reportan)
  const miNombre = authService.getNombre?.() || "";

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
    // Filtrar solo los que reportan a este jefe
    const miEquipoRH = miNombre
      ? rhData.filter(r => r.JefeInmediato === miNombre)
      : rhData;
    const miEquipoIds = new Set(miEquipoRH.map(r => r.empleado_id?.$oid || r.empleado_id || ""));
    const miEquipo = miNombre
      ? empleados.filter(e => miEquipoIds.has(getId(e)))
      : empleados;

    // Habilidades del equipo
    const skillMap = {};
    educacion
      .filter(ed => miEquipoIds.size === 0 || miEquipoIds.has(ed.empleado_id?.$oid || ed.empleado_id || ""))
      .forEach(ed => {
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
      .map(([nombre, { suma, count }]) => ({ nombre, promedio: Math.round(suma / count), personas: count }))
      .sort((a, b) => b.personas - a.personas).slice(0, 8);

    // Horarios del equipo
    const horarioMap = {};
    miEquipoRH.forEach(r => {
      if (r.HorarioLaboral?.HoraEntrada) {
        const h = `${r.HorarioLaboral.HoraEntrada}–${r.HorarioLaboral.HoraSalida}`;
        horarioMap[h] = (horarioMap[h] || 0) + 1;
      }
    });
    const horarioData = Object.entries(horarioMap).map(([h, c]) => ({ h, c }));

    return { miEquipo, miEquipoRH, skillData, horarioData };
  }, [empleados, rhData, educacion, miNombre]);

  const handleEmpClick = (emp, e) => setQuickView({ emp, rect: e.currentTarget.getBoundingClientRect() });

  if (loading) return <div className="de-loading"><div className="de-spinner" /><span>Cargando…</span></div>;

  return (
    <div className="de-root">
      {quickView && <EmployeeQuickView emp={quickView.emp} anchorRect={quickView.rect} onClose={() => setQuickView(null)} />}

      <div className="de-page-header">
        <div>
          <h2 className="de-title">Mi equipo</h2>
          <p className="de-subtitle">Vista Jefe de Área · Solo tu equipo directo</p>
        </div>
        <span className="de-role-badge de-role-badge--teal">JEFE DE ÁREA</span>
      </div>

      <div className="de-kpi-grid">
        <KpiCard label="Personas en mi equipo" value={stats.miEquipo.length}    color="#4ECAAC" />
        <KpiCard label="Con horario definido"   value={stats.miEquipoRH.filter(r => r.HorarioLaboral?.HoraEntrada).length} color="#5B8AF0" />
        <KpiCard label="Habilidades distintas"  value={stats.skillData.length}  color="#9B7FE8" />
        <KpiCard label="Turnos diferentes"      value={stats.horarioData.length} color="#F5A623" />
      </div>

      <div className="de-mid-row">
        <div className="de-card">
          <div className="de-card-title">Habilidades del equipo</div>
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

        <div className="de-card">
          <div className="de-card-title">Mi equipo · clic para ver datos</div>
          {stats.miEquipo.slice(0, 8).map(emp => {
            const rh = rhData.find(r => (r.empleado_id?.$oid || r.empleado_id) === getId(emp));
            return (
              <div key={getId(emp)} className="de-emp-row" onClick={ev => handleEmpClick(emp, ev)} style={{ cursor: "pointer" }}>
                <div className="de-emp-ini" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  {(emp.Nombre?.[0] || "") + (emp.ApelPaterno?.[0] || "")}
                </div>
                <div className="de-emp-info">
                  <span className="de-emp-name">{emp.Nombre} {emp.ApelPaterno}</span>
                  <span className="de-emp-hint">{rh?.HorarioLaboral?.HoraEntrada ? `${rh.HorarioLaboral.HoraEntrada}–${rh.HorarioLaboral.HoraSalida}` : "Sin horario"}</span>
                </div>
                <span className="de-tag de-tag--blue">{rh?.Puesto || "Sin puesto"}</span>
              </div>
            );
          })}
          {stats.miEquipo.length === 0 && <p className="de-empty">No tienes empleados asignados como reportes directos.</p>}
        </div>
      </div>
    </div>
  );
}

export default DashboardJefeArea;