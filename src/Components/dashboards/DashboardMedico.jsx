// ── DashboardMedico.jsx ───────────────────────────────────────────────────────
import React, { useEffect, useState, useMemo } from "react";
import "./DashboardEspecializado.css";
import { empleadoService } from "../../services/empleadoService";
import { clinicoService }   from "../../services/clinicoService";
import EmployeeQuickView    from "../EmployeeQuickView";

const getId = (i) => i?._id?.$oid || i?._id || "";

const SANGRE_COLORS = {
  "A+":"#5B8AF0","A-":"#4ECAAC","B+":"#F5A623","B-":"#9B7FE8",
  "AB+":"#E86B5F","AB-":"#73C990","O+":"#5DC8F5","O-":"#F07E6E",
};

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

export function DashboardMedico() {
  const [empleados, setEmpleados] = useState([]);
  const [clinico,   setClinico]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [quickView, setQuickView] = useState(null);

  useEffect(() => {
    Promise.all([
      empleadoService.getAll(),
      clinicoService.getAll().catch(() => []),
    ]).then(([emps, clin]) => {
      setEmpleados(Array.isArray(emps) ? emps : []);
      setClinico(Array.isArray(clin) ? clin  : []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const sangresMap = {};
    const padMap     = {};
    let conNSS = 0, conSeguro = 0;

    clinico.forEach(c => {
      if (c.tipoSangre) sangresMap[c.tipoSangre] = (sangresMap[c.tipoSangre] || 0) + 1;
      if (c.NumeroSeguroSocial) conNSS++;
      if (c.Segurodegastosmedicos) conSeguro++;
      if (c.Padecimientos) {
        c.Padecimientos.split(/[,;\/]/).forEach(p => {
          const pad = p.trim();
          if (pad) padMap[pad] = (padMap[pad] || 0) + 1;
        });
      }
    });

    const sangresData = Object.entries(sangresMap)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);

    const padData = Object.entries(padMap)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count).slice(0, 6);

    // Empleados sin expediente
    const clinIds = new Set(clinico.map(c => c.empleado_id?.$oid || c.empleado_id || ""));
    const sinExpediente = empleados.filter(e => !clinIds.has(getId(e)));

    return { sangresData, padData, conNSS, conSeguro, sinExpediente, total: empleados.length, conExpediente: clinico.length };
  }, [empleados, clinico]);

  const handleEmpClick = (emp, e) => setQuickView({ emp, rect: e.currentTarget.getBoundingClientRect() });

  if (loading) return <div className="de-loading"><div className="de-spinner" /><span>Cargando…</span></div>;

  return (
    <div className="de-root">
      {quickView && <EmployeeQuickView emp={quickView.emp} anchorRect={quickView.rect} onClose={() => setQuickView(null)} />}

      <div className="de-page-header">
        <div>
          <h2 className="de-title">Expediente clínico</h2>
          <p className="de-subtitle">Vista Médico · Información confidencial de salud</p>
        </div>
        <span className="de-role-badge de-role-badge--red">MÉDICO</span>
      </div>

      <div className="de-kpi-grid">
        <KpiCard label="Con expediente"     value={stats.conExpediente} color="#4ECAAC" sub={`de ${stats.total} empleados`} />
        <KpiCard label="Con NSS registrado" value={stats.conNSS}        color="#5B8AF0" />
        <KpiCard label="Con seguro médico"  value={stats.conSeguro}     color="#F5A623" />
        <KpiCard label="Sin expediente"     value={stats.sinExpediente.length} color="#E86B5F" />
      </div>

      <div className="de-mid-row">
        <div className="de-card">
          <div className="de-card-title">Distribución de tipos de sangre</div>
          <div className="de-sangre-grid">
            {stats.sangresData.map(s => (
              <div key={s.tipo} className="de-sangre-chip"
                style={{ background: `${SANGRE_COLORS[s.tipo] || "#888"}18`, borderColor: `${SANGRE_COLORS[s.tipo] || "#888"}40` }}>
                <span className="de-sangre-tipo" style={{ color: SANGRE_COLORS[s.tipo] || "#888" }}>{s.tipo}</span>
                <span className="de-sangre-count">{s.count}</span>
              </div>
            ))}
            {stats.sangresData.length === 0 && <p className="de-empty">Sin datos de tipo de sangre.</p>}
          </div>
        </div>

        <div className="de-card">
          <div className="de-card-title">Padecimientos frecuentes</div>
          {stats.padData.length === 0
            ? <p className="de-empty">Sin padecimientos registrados.</p>
            : stats.padData.map((p, i) => (
                <div key={p.nombre} className="de-bar-row">
                  <span className="de-bar-lbl" title={p.nombre}>{p.nombre}</span>
                  <div className="de-bar-track">
                    <div className="de-bar-fill"
                      style={{ width: `${Math.round((p.count / Math.max(stats.padData[0]?.count, 1)) * 100)}%`, background: "#E86B5F" }} />
                  </div>
                  <span className="de-bar-num">{p.count}</span>
                </div>
              ))
          }
        </div>
      </div>

      <div className="de-card">
        <div className="de-card-title">Empleados sin expediente clínico · {stats.sinExpediente.length}</div>
        {stats.sinExpediente.slice(0, 8).map(emp => (
          <div key={getId(emp)} className="de-emp-row" onClick={ev => handleEmpClick(emp, ev)} style={{ cursor: "pointer" }}>
            <div className="de-emp-ini" style={{ background: "#fee2e2", color: "#b91c1c" }}>
              {(emp.Nombre?.[0] || "") + (emp.ApelPaterno?.[0] || "")}
            </div>
            <div className="de-emp-info">
              <span className="de-emp-name">{emp.Nombre} {emp.ApelPaterno}</span>
            </div>
            <span className="de-tag de-tag--red">Sin expediente</span>
          </div>
        ))}
        {stats.sinExpediente.length === 0 && <p className="de-empty">Todos los empleados tienen expediente clínico.</p>}
      </div>
    </div>
  );
}

export default DashboardMedico;