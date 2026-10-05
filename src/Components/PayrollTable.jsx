// src/Components/PayrollTable.jsx
// Nómina en tarjetas: cada recibo del sistema de nómina externo muestra lo
// indispensable (quién, periodo, neto, estado); al tocarlo se abre el detalle
// de percepciones y deducciones en un pop-up.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiDollarSign, FiSearch, FiSettings } from "react-icons/fi";
import { payrollService } from "../services/payrollService";
import { authService } from "../services/authService";
import { RecordCard } from "./RecordCard";
import Modal from "./Modal";
import "./NominaConfig.css";

const money = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(value || 0));
const date = (value) => (value ? new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—");
const ESTADOS = {
  paid:      { label: "Pagada",    tono: "success" },
  pending:   { label: "Pendiente", tono: "warning" },
  cancelled: { label: "Cancelada", tono: "danger" },
};
const iniciales = (n = "") => n.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "?";

export default function PayrollTable({ embebido = false }) {
  const [filters, setFilters] = useState({ search: "", status: "", period_start: "", period_end: "", page: 1, page_size: 25 });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    let active = true;
    setError("");
    payrollService.list(filters)
      .then(r => active && setData(r))
      .catch(e => active && setError(e.message || "No se pudo consultar la nómina."));
    return () => { active = false; };
  }, [filters]);

  const change = (e) => setFilters(p => ({ ...p, [e.target.name]: e.target.value, page: 1 }));

  return (
    <div className="orgs-root payroll-root">
      {embebido ? (
        <p className="hr-subtitle" style={{ margin: "0 0 12px" }}>Recibos que vienen de tu sistema de nómina. Toca uno para ver su detalle.</p>
      ) : (
        <div className="hr-page-header">
          <div>
            <h2 className="hr-title"><FiDollarSign style={{ marginRight: 8, verticalAlign: "-3px" }} />Nómina</h2>
            <p className="hr-subtitle">Recibos que vienen de tu sistema de nómina. Toca uno para ver su detalle.</p>
          </div>
        </div>
      )}

      <div className="payroll-filters">
        <label><FiSearch aria-hidden="true" /><input aria-label="Buscar" name="search" placeholder="Empleado o número" value={filters.search} onChange={change} /></label>
        <select aria-label="Estado" name="status" value={filters.status} onChange={change}>
          <option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="paid">Pagada</option><option value="cancelled">Cancelada</option>
        </select>
        <input aria-label="Periodo desde" type="date" name="period_start" value={filters.period_start} onChange={change} />
        <input aria-label="Periodo hasta" type="date" name="period_end" value={filters.period_end} onChange={change} />
      </div>

      {error ? <div className="payroll-state payroll-state--error" role="alert">{error}</div>
        : !data ? <div className="rc-grid">{[0, 1, 2].map(i => <div key={i} className="mo-skeleton" style={{ height: 84, borderRadius: 16 }} />)}</div>
        : !data.configured ? (
          <div className="payroll-state">
            <FiSettings aria-hidden="true" />
            <h3>La integración de nómina aún no está configurada</h3>
            <p>Cuando tengas la URL y API key del sistema de facturación podrás conectarlas sin cambiar esta pantalla.</p>
            {authService.isSuperAdmin() && <Link className="orgs-save-btn" to="/integraciones">Configurar integración</Link>}
          </div>
        ) : data.items.length === 0 ? (
          <div className="payroll-state"><h3>No hay nóminas para estos filtros</h3><p>Prueba otro periodo o estado.</p></div>
        ) : (
          <div className="rc-grid mo-stagger">
            {data.items.map(item => {
              const est = ESTADOS[item.status] || { label: item.status, tono: "accent" };
              return (
                <RecordCard key={item.external_id} tono={est.tono} onClick={() => setAbierto(item)}
                  tile={<span className="rc-tile-big">{iniciales(item.employee_name)}</span>}
                  titulo={item.employee_name || "Sin nombre"}
                  badge={<span className={`rc-badge rc-badge--${est.tono}`}>{est.label}</span>}
                  meta={<><span>{date(item.period_start)} – {date(item.period_end)}</span><strong>{money(item.net, item.currency)}</strong></>} />
              );
            })}
          </div>
        )}

      <Modal abierto={!!abierto} onClose={() => setAbierto(null)} titulo={abierto?.employee_name || ""}
        subtitulo={abierto ? `${abierto.employee_number ? `#${abierto.employee_number} · ` : ""}${date(abierto.period_start)} – ${date(abierto.period_end)}` : undefined}>
        {abierto && (
          <div className="cm-cifras">
            <div><strong>{money(abierto.gross, abierto.currency)}</strong><span>Percepciones</span></div>
            <div className="is-mal"><strong>{money(abierto.deductions, abierto.currency)}</strong><span>Deducciones</span></div>
            <div className="is-bien"><strong>{money(abierto.net, abierto.currency)}</strong><span>Neto a pagar</span></div>
            <div><strong style={{ fontSize: "1.1rem" }}>{date(abierto.paid_at)}</strong><span>{(ESTADOS[abierto.status] || {}).label || abierto.status}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
