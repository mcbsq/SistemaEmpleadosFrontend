import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {FiDollarSign,FiSearch,FiSettings} from "react-icons/fi";
import {payrollService} from "../services/payrollService";
import {authService} from "../services/authService";
import "./NominaConfig.css";

const money=(value,currency="MXN")=>new Intl.NumberFormat("es-MX",{style:"currency",currency}).format(Number(value||0));
const date=value=>value?new Date(value).toLocaleDateString("es-MX"):"—";

export default function PayrollTable(){
 const [filters,setFilters]=useState({search:"",status:"",period_start:"",period_end:"",page:1,page_size:25}); const [data,setData]=useState(null); const [error,setError]=useState("");
 useEffect(()=>{let active=true;setError("");payrollService.list(filters).then(r=>active&&setData(r)).catch(e=>active&&setError(e.message||"No se pudo consultar la nómina."));return()=>{active=false}},[filters]);
 const change=e=>setFilters(p=>({...p,[e.target.name]:e.target.value,page:1}));
 return <div className="orgs-root payroll-root"><div className="hr-page-header"><div><h2 className="hr-title"><FiDollarSign/> Nómina</h2><p className="hr-subtitle">Consulta de recibos provenientes de tu sistema de facturación</p></div></div>
 <div className="payroll-filters"><label><FiSearch/><input aria-label="Buscar" name="search" placeholder="Empleado o número" value={filters.search} onChange={change}/></label><select aria-label="Estado" name="status" value={filters.status} onChange={change}><option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="paid">Pagada</option><option value="cancelled">Cancelada</option></select><input aria-label="Periodo desde" type="date" name="period_start" value={filters.period_start} onChange={change}/><input aria-label="Periodo hasta" type="date" name="period_end" value={filters.period_end} onChange={change}/></div>
 {error?<div className="payroll-state payroll-state--error" role="alert">{error}</div>:!data?<div className="orgs-monitor-loading"><div className="hr-spinner"/><span>Cargando nóminas…</span></div>:!data.configured?<div className="payroll-state"><FiSettings/><h3>La integración de nómina aún no está configurada</h3><p>Cuando tengas la URL y API key del sistema de facturación podrás conectarlas sin cambiar esta pantalla.</p>{authService.isSuperAdmin()&&<Link className="orgs-save-btn" to="/integraciones">Configurar integración</Link>}</div>:data.items.length===0?<div className="payroll-state"><h3>No hay nóminas para estos filtros</h3><p>Prueba otro periodo o estado.</p></div>:<div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Empleado</th><th>Periodo</th><th>Percepciones</th><th>Deducciones</th><th>Neto</th><th>Estado</th><th>Fecha de pago</th></tr></thead><tbody>{data.items.map(item=><tr key={item.external_id}><td><strong>{item.employee_name||"Sin nombre"}</strong><small>{item.employee_number||""}</small></td><td>{date(item.period_start)} – {date(item.period_end)}</td><td>{money(item.gross,item.currency)}</td><td>{money(item.deductions,item.currency)}</td><td><strong>{money(item.net,item.currency)}</strong></td><td><span className={`payroll-status payroll-status--${item.status}`}>{item.status}</span></td><td>{date(item.paid_at)}</td></tr>)}</tbody></table></div>}
 </div>;
}
