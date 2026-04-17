import React, { useEffect, useState, useMemo } from "react";
import "./DashboardEspecializado.css";
import { empleadoService } from "../../services/empleadoService";
import { rhService }        from "../../services/rhService";
import { clinicoService }   from "../../services/clinicoService";
import EmployeeQuickView    from "../EmployeeQuickView";

const getId = (item) => item?._id?.$oid || item?._id || "";

const COLORS = ["#5B8AF0","#4ECAAC","#F5A623","#9B7FE8","#E86B5F","#73C990"];

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

const HBar = ({ label, value, max, color }) => (
  <div className="de-bar-row">
    <span className="de-bar-lbl" title={label}>{label}</span>
    <div className="de-bar-track">
      <div className="de-bar-fill" style={{ width: `${Math.round((value / Math.max(max,1)) * 100)}%`, background: color }} />
    </div>
    <span className="de-bar-num">{value}</span>
  </div>
);

function DashboardContador() {
  const [empleados, setEmpleados] = useState([]);
  const [rhData,    setRhData]    = useState([]);
  const [clinico,   setClinico]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [quickView, setQuickView] = useState(null); // { emp, rect }

  useEffect(() => {
    Promise.all([
      empleadoService.getAll(),
      rhService.getAll().catch(() => []),
      clinicoService.getAll().catch(() => []),
    ]).then(([emps, rh, clin]) => {
      setEmpleados(Array.isArray(emps) ? emps : []);
      setRhData(Array.isArray(rh)   ? rh   : []);
      setClinico(Array.isArray(clin) ? clin  : []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    // Distribución por puesto (como proxy de costo relativo por área)
    const puestoMap = {};
    rhData.forEach(r => {
      const p = r.Puesto || "Sin asignar";
      puestoMap[p] = (puestoMap[p] || 0) + 1;
    });
    const puestoData = Object.entries(puestoMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 7);

    // NSS registrados
    const conNSS = clinico.filter(c => c.NumeroSeguroSocial).length;
    const conSeguro = clinico.filter(c => c.Segurodegastosmedicos).length;

    // Empleados por jefe (headcount por área de reporte)
    const jefesMap = {};
    rhData.forEach(r => {
      const j = r.JefeInmediato || "Sin jefe";
      jefesMap[j] = (jefesMap[j] || 0) + 1;
    });
    const jefesData = Object.entries(jefesMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);

    return {
      totalEmp:   empleados.length,
      conRH:      rhData.length,
      sinRH:      empleados.length - rhData.length,
      conNSS,
      sinNSS:     empleados.length - conNSS,
      conSeguro,
      sinSeguro:  empleados.length - conSeguro,
      puestoData,
      jefesData,
      maxPuesto:  Math.max(...puestoData.map(p => p.value), 1),
      maxJefe:    Math.max(...jefesData.map(j => j.value), 1),
    };
  }, [empleados, rhData, clinico]);

  const handleEmpClick = (emp, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setQuickView({ emp, rect });
  };

  if (loading) return <div className="de-loading"><div className="de-spinner" /><span>Cargando…</span></div>;

  return (
    <div className="de-root">
      {quickView && (
        <EmployeeQuickView
          emp={quickView.emp}
          anchorRect={quickView.rect}
          onClose={() => setQuickView(null)}
        />
      )}

      <div className="de-page-header">
        <div>
          <h2 className="de-title">Finanzas y nómina</h2>
          <p className="de-subtitle">Vista Contador · Solo roles autorizados</p>
        </div>
        <span className="de-role-badge de-role-badge--amber">CONTADOR</span>
      </div>

      <div className="de-kpi-grid">
        <KpiCard label="Total empleados"   value={stats.totalEmp}   color="#5B8AF0" />
        <KpiCard label="Con datos de RH"   value={stats.conRH}      color="#4ECAAC"
          sub={`${stats.sinRH} sin datos de RH`} />
        <KpiCard label="Con NSS registrado"  value={stats.conNSS}     color="#F5A623"
          sub={`${stats.sinNSS} sin NSS`} />
        <KpiCard label="Con seguro de gastos" value={stats.conSeguro}  color="#9B7FE8"
          sub={`${stats.sinSeguro} sin seguro`} />
      </div>

      <div className="de-mid-row">
        <div className="de-card">
          <div className="de-card-title">Headcount por puesto</div>
          {stats.puestoData.map((d, i) => (
            <HBar key={d.label} label={d.label} value={d.value}
              max={stats.maxPuesto} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
        <div className="de-card">
          <div className="de-card-title">Empleados por jefe inmediato</div>
          {stats.jefesData.map((d, i) => (
            <HBar key={d.label} label={d.label} value={d.value}
              max={stats.maxJefe} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      </div>

      <div className="de-card">
        <div className="de-card-title">Empleados sin datos de nómina · requieren atención</div>
        {empleados
          .filter(e => !rhData.find(r => (r.empleado_id?.$oid || r.empleado_id) === getId(e)))
          .slice(0, 8)
          .map(emp => (
            <div key={getId(emp)} className="de-emp-row"
              onClick={ev => handleEmpClick(emp, ev)} style={{ cursor: "pointer" }}>
              <div className="de-emp-ini"
                style={{ background: "#fef3c7", color: "#b45309" }}>
                {(emp.Nombre?.[0] || "") + (emp.ApelPaterno?.[0] || "")}
              </div>
              <div className="de-emp-info">
                <span className="de-emp-name">{emp.Nombre} {emp.ApelPaterno}</span>
                <span className="de-emp-hint">Sin datos de RH</span>
              </div>
              <span className="de-tag de-tag--amber">Sin RH</span>
            </div>
          ))}
        {empleados.filter(e => !rhData.find(r =>
          (r.empleado_id?.$oid || r.empleado_id) === getId(e)
        )).length === 0 && (
          <p className="de-empty">Todos los empleados tienen datos de RH registrados.</p>
        )}
      </div>
    </div>
  );
}

export default DashboardContador;