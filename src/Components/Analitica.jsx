// src/Components/Analitica.jsx
// Sección de analítica de todo el sistema: gráficas + catálogo de reportes
// exportables. Cada usuario solo ve las secciones a las que el SUPER_ADMIN
// le otorgó permiso (ADMIN/SUPER_ADMIN siempre ven todo).
import React, { useState, useEffect, useCallback } from "react";
import IconButton from "./IconButton";
import { FiBarChart2, FiLock, FiUsers, FiDollarSign, FiSun, FiAward, FiBriefcase, FiEye, FiX, FiUserMinus } from "react-icons/fi";
import { apiFetch, API_URL, sessionHeaders } from "../services/apiConfig";
import "./Analitica.css";

async function descargarArchivo(path, filename) {
  const res = await fetch(`${API_URL}${path}`, { headers: sessionHeaders() });
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  return true;
}

const COLORS = ["#5B8AF0", "#4ECAAC", "#F5A623", "#B57EDC", "#E86B5F", "#59C1E8"];

function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="an-hbar-row">
      <span className="an-hbar-label">{label}</span>
      <div className="an-hbar-track"><div className="an-hbar-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <span className="an-hbar-value">{value}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="an-stat-tile">
      <div className="an-stat-icon" style={{ color }}><Icon /></div>
      <div className="an-stat-value">{value}</div>
      <div className="an-stat-label">{label}</div>
      {sub && <div className="an-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Modal de reporte en línea — el cliente pidió explícitamente poder
// consultar los reportes dentro del sistema en vez de siempre tener que
// exportar a Excel solo para verlos.
function ReporteModal({ reporte, onClose }) {
  const [datos, setDatos] = useState(undefined);

  useEffect(() => {
    let vivo = true;
    setDatos(undefined);
    apiFetch(`/analitica/reportes/${reporte.id}/datos`)
      .then(d => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setDatos(null); });
    return () => { vivo = false; };
  }, [reporte.id]);

  return (
    <div className="an-modal-overlay" onClick={onClose}>
      <div className="an-modal" onClick={e => e.stopPropagation()}>
        <div className="an-modal-header">
          <div>
            <h3>{reporte.nombre}</h3>
            <p className="an-modal-desc">{reporte.descripcion}</p>
          </div>
          <button className="nb-close-btn" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </div>
        <div className="an-modal-body">
          {datos === undefined ? (
            <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
          ) : datos === null ? (
            <p className="adm-empty">Sin datos para este reporte todavía.</p>
          ) : (
            <>
              {/* Resumen — quién/cómo/cuántos de un vistazo, antes de la tabla
                  fila-por-fila. Pedido explícito: reportes "super descriptivos". */}
              {datos.resumen && Object.keys(datos.resumen).length > 0 && (
                <dl className="an-resumen-grid">
                  {Object.entries(datos.resumen).map(([etiqueta, valor]) => (
                    <div key={etiqueta} className="an-resumen-item">
                      <dt>{etiqueta}</dt>
                      <dd>{valor === null || valor === undefined || valor === "" ? "—" : String(valor)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {datos.rows.length === 0 ? (
                <p className="adm-empty">Sin filas de detalle todavía.</p>
              ) : (
                <div className="an-table-wrap">
                  <table className="an-table">
                    <thead>
                      <tr>{datos.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {datos.rows.map((row, i) => (
                        <tr key={i}>{row.map((cell, j) => <td key={j}>{cell === null || cell === undefined ? "—" : String(cell)}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportesCard({ compact = false }) {
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(null);
  const [viendo, setViendo] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/analitica/catalogo").catch(() => []);
      setCatalogo(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleExportar = async (r) => {
    setDescargando(r.id);
    try {
      await descargarArchivo(`/analitica/reportes/${r.id}/export`, `${r.id}.xlsx`);
    } finally {
      setDescargando(null);
    }
  };

  const visibles = catalogo.filter(r => r.permitido);

  if (loading) return <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>;
  if (visibles.length === 0 && !compact) {
    return (
      <div className="orgs-monitor-empty">
        <span className="orgs-monitor-empty-icon"><FiLock /></span>
        <p>No tienes acceso a ningún reporte todavía. Pide a tu SUPER_ADMIN que te otorgue permiso.</p>
      </div>
    );
  }
  if (visibles.length === 0) return null;

  return (
    <>
      {viendo && <ReporteModal reporte={viendo} onClose={() => setViendo(null)} />}
      <div className="orgs-incident-list">
        {visibles.map(r => (
          <div key={r.id} className="orgs-incident-row">
            <span className="orgs-sev-badge orgs-sev--info"><FiBarChart2 /></span>
            <div className="orgs-incident-info">
              <span className="orgs-incident-msg">{r.nombre}</span>
              <span className="orgs-incident-meta">{r.descripcion}</span>
            </div>
            <div className="orgs-apikey-actions">
              <IconButton icon={FiEye} label="Ver en línea" onClick={() => setViendo(r)} />
              <IconButton accion="descargar" label="Exportar .xlsx" tooltipPos="left" busy={descargando === r.id} onClick={() => handleExportar(r)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiquetaMes = (ym) => { const [y, m] = ym.split("-"); return `${MESES[Number(m) - 1]} ${y.slice(2)}`; };

// Rotación mensual: columnas = % de rotación del mes; debajo, bajas y altas.
function RotacionCard({ rot }) {
  const maxPct = Math.max(...rot.por_mes.map(m => m.rotacion_pct), 1);
  const maxArea = Math.max(...rot.por_area.map(a => a.bajas), 1);
  const maxTipo = Math.max(...rot.por_tipo.map(t => t.total), 1);
  return (
    <div className="hr-card" style={{ marginTop: 20 }}>
      <div className="hr-card-title">Rotación de personal · últimos 12 meses</div>
      <p className="orgs-desc" style={{ marginTop: 0 }}>
        {rot.rotacion_pct}% en el periodo: {rot.bajas} bajas sobre una plantilla promedio de {((rot.plantilla_inicial + rot.plantilla_final) / 2).toFixed(1)} personas.
        Rotación del mes = bajas ÷ plantilla promedio del mes.
      </p>
      <div className="an-rot-chart" role="img" aria-label={`Rotación mensual: ${rot.por_mes.map(m => `${etiquetaMes(m.mes)} ${m.rotacion_pct}%`).join(", ")}`}>
        {rot.por_mes.map(m => (
          <div key={m.mes} className="an-rot-col" title={`${etiquetaMes(m.mes)}: ${m.rotacion_pct}% · ${m.bajas} bajas · ${m.altas} altas · plantilla ${m.plantilla_final}`}>
            <span className="an-rot-pct">{m.rotacion_pct > 0 ? `${m.rotacion_pct}%` : ""}</span>
            <div className="an-rot-track"><div className="an-rot-bar" style={{ height: `${(m.rotacion_pct / maxPct) * 100}%` }} /></div>
            <span className="an-rot-mes">{etiquetaMes(m.mes)}</span>
            <span className="an-rot-mov"><b className="is-baja">−{m.bajas}</b> <b className="is-alta">+{m.altas}</b></span>
          </div>
        ))}
      </div>
      {rot.bajas > 0 && (
        <div className="an-rot-split">
          <div>
            <div className="an-rot-sub">Bajas por área</div>
            {rot.por_area.filter(a => a.bajas > 0).map((a, i) => (
              <HBar key={a.area} label={`${a.area} (${a.rotacion_pct}%)`} value={a.bajas} max={maxArea} color={COLORS[(i + 4) % COLORS.length]} />
            ))}
          </div>
          <div>
            <div className="an-rot-sub">Bajas por tipo</div>
            {rot.por_tipo.map((t, i) => (
              <HBar key={t.tipo} label={t.label} value={t.total} max={maxTipo} color={COLORS[i % COLORS.length]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Analitica() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/analitica/resumen").then(setResumen).catch(() => setResumen({})).finally(() => setLoading(false));
  }, []);

  const hc = resumen?.headcount;
  const maxDepto = hc?.por_departamento?.length ? Math.max(...hc.por_departamento.map(d => d.value)) : 0;

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiBarChart2 style={{ marginRight: 8, verticalAlign: "-3px" }} />Analítica del sistema</h2>
          <p className="hr-subtitle">Vista completa de headcount, rotación, nómina, vacaciones, desempeño y reclutamiento</p>
        </div>
      </div>

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : !resumen || Object.keys(resumen).length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiLock /></span>
          <p>No tienes acceso a ninguna analítica todavía. Pide a tu SUPER_ADMIN que te otorgue permiso.</p>
        </div>
      ) : (
        <>
          <div className="an-stat-grid">
            {hc && <StatTile icon={FiUsers} label="Empleados activos" value={hc.total} color={COLORS[0]} />}
            {resumen.nomina && <StatTile icon={FiDollarSign} label="Masa salarial neta" value={`$${resumen.nomina.masa_salarial_neta.toLocaleString("es-MX")}`} sub={`${resumen.nomina.empleados_en_nomina} en nómina`} color={COLORS[1]} />}
            {resumen.vacaciones && <StatTile icon={FiSun} label="Días de vacaciones tomados" value={resumen.vacaciones.dias_aprobados_anio} sub={`${resumen.vacaciones.solicitudes_pendientes} solicitudes pendientes`} color={COLORS[2]} />}
            {resumen.desempeno && <StatTile icon={FiAward} label="Autoevaluación promedio" value={resumen.desempeno.promedio_autoevaluacion ?? "—"} sub={`${resumen.desempeno.completadas}/${resumen.desempeno.total} completadas · ${resumen.desempeno.ciclo}`} color={COLORS[3]} />}
            {resumen.rotacion && <StatTile icon={FiUserMinus} label="Rotación (12 meses)" value={`${resumen.rotacion.rotacion_pct}%`} sub={`${resumen.rotacion.bajas} bajas · ${resumen.rotacion.altas} altas`} color={COLORS[4]} />}
            {resumen.reclutamiento && <StatTile icon={FiBriefcase} label="Vacantes abiertas" value={resumen.reclutamiento.vacantes_abiertas} sub={`${resumen.reclutamiento.candidatos_total} candidatos en pipeline`} color={COLORS[4]} />}
          </div>

          {hc && hc.por_departamento.length > 0 && (
            <div className="hr-card" style={{ marginTop: 20 }}>
              <div className="hr-card-title">Headcount por departamento</div>
              {hc.por_departamento.map((d, i) => (
                <HBar key={d.label} label={d.label} value={d.value} max={maxDepto} color={COLORS[i % COLORS.length]} />
              ))}
            </div>
          )}

          {resumen.rotacion && <RotacionCard rot={resumen.rotacion} />}

          {resumen.reclutamiento && Object.keys(resumen.reclutamiento.por_etapa).length > 0 && (
            <div className="hr-card" style={{ marginTop: 20 }}>
              <div className="hr-card-title">Candidatos por etapa</div>
              {Object.entries(resumen.reclutamiento.por_etapa).map(([etapa, total], i) => (
                <HBar key={etapa} label={etapa} value={total} max={resumen.reclutamiento.candidatos_total} color={COLORS[i % COLORS.length]} />
              ))}
            </div>
          )}

          {resumen.vacaciones && (resumen.vacaciones.solicitudes_aprobadas + resumen.vacaciones.solicitudes_pendientes > 0) && (
            <div className="hr-card" style={{ marginTop: 20 }}>
              <div className="hr-card-title">Solicitudes de vacaciones — año en curso</div>
              <HBar label="Aprobadas" value={resumen.vacaciones.solicitudes_aprobadas}
                max={Math.max(resumen.vacaciones.solicitudes_aprobadas, resumen.vacaciones.solicitudes_pendientes, 1)} color={COLORS[1]} />
              <HBar label="Pendientes" value={resumen.vacaciones.solicitudes_pendientes}
                max={Math.max(resumen.vacaciones.solicitudes_aprobadas, resumen.vacaciones.solicitudes_pendientes, 1)} color={COLORS[2]} />
            </div>
          )}

          {resumen.desempeno && (resumen.desempeno.promedio_autoevaluacion != null || resumen.desempeno.promedio_jefe != null) && (
            <div className="hr-card" style={{ marginTop: 20 }}>
              <div className="hr-card-title">Desempeño · {resumen.desempeno.ciclo}</div>
              <HBar label="Autoevaluación (prom.)" value={resumen.desempeno.promedio_autoevaluacion ?? 0} max={5} color={COLORS[3]} />
              <HBar label="Evaluación de jefe (prom.)" value={resumen.desempeno.promedio_jefe ?? 0} max={5} color={COLORS[0]} />
            </div>
          )}
        </>
      )}

      <div className="hr-card" style={{ marginTop: 20 }}>
        <div className="hr-card-title">Reportes exportables</div>
        <ReportesCard />
      </div>
    </div>
  );
}

export default Analitica;
