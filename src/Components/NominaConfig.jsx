// src/Components/NominaConfig.jsx
// Motor de nómina: parámetros de ISR/IMSS/deducciones (editables por ADMIN o
// CONTADOR) + calculadora de referencia por empleado. El cálculo es una
// simplificación de la tabla pública del SAT — no reemplaza timbrado fiscal.
import React, { useState, useEffect, useCallback } from "react";
import { FiDollarSign, FiPlus, FiTrash2, FiSave } from "react-icons/fi";
import { apiFetch } from "../services/apiConfig";
import { empleadoService } from "../services/empleadoService";
import "./NominaConfig.css";

const getId = (item) => item?._id?.$oid || item?._id || "";

function NominaConfig() {
  const [params, setParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [empleados, setEmpleados] = useState([]);
  const [empleadoSel, setEmpleadoSel] = useState("");
  const [periodo, setPeriodo] = useState("mensual");
  const [resultado, setResultado] = useState(null);
  const [calcError, setCalcError] = useState("");
  const [calculando, setCalculando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, emps] = await Promise.all([
        apiFetch("/nomina/parametros").catch(() => null),
        empleadoService.getAll().catch(() => []),
      ]);
      setParams(p);
      setEmpleados(Array.isArray(emps) ? emps : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      await apiFetch("/nomina/parametros", { method: "PUT", body: JSON.stringify(params) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  const actualizarRango = (idx, campo, valor) => {
    setParams(p => {
      const tabla = [...p.isr_tabla];
      tabla[idx] = { ...tabla[idx], [campo]: valor === "" ? null : Number(valor) };
      return { ...p, isr_tabla: tabla };
    });
  };

  const agregarDeduccion = () => {
    setParams(p => ({
      ...p,
      otras_deducciones: [...(p.otras_deducciones || []), { nombre: "Nueva deducción", tipo: "porcentaje", valor: 0 }],
    }));
  };

  const actualizarDeduccion = (idx, campo, valor) => {
    setParams(p => {
      const lista = [...p.otras_deducciones];
      lista[idx] = { ...lista[idx], [campo]: campo === "valor" ? Number(valor) : valor };
      return { ...p, otras_deducciones: lista };
    });
  };

  const eliminarDeduccion = (idx) => {
    setParams(p => ({ ...p, otras_deducciones: p.otras_deducciones.filter((_, i) => i !== idx) }));
  };

  const handleCalcular = async () => {
    if (!empleadoSel) return;
    setCalculando(true); setCalcError(""); setResultado(null);
    try {
      const data = await apiFetch(`/nomina/calcular/${empleadoSel}?periodo=${periodo}`);
      setResultado(data);
    } catch (e) {
      setCalcError(e.message || "No se pudo calcular la nómina.");
    } finally {
      setCalculando(false);
    }
  };

  if (loading || !params) {
    return <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>;
  }

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiDollarSign style={{ marginRight: 8, verticalAlign: "-3px" }} />Motor de nómina</h2>
          <p className="hr-subtitle">Parámetros de ISR, IMSS y deducciones · ADMIN / CONTADOR</p>
        </div>
        <button className="orgs-save-btn" onClick={handleGuardar} disabled={saving}>
          {saving ? "Guardando…" : saved ? "Guardado" : "Guardar parámetros"}
        </button>
      </div>

      <div className="orgs-grid">
        <div className="hr-card">
          <div className="hr-card-title">IMSS</div>
          <p className="orgs-desc">Porcentaje de cuota obrera aplicado sobre el sueldo mensual.</p>
          <div className="orgs-field">
            <label className="orgs-label">% IMSS</label>
            <input
              type="number" step="0.001" className="orgs-input" style={{ maxWidth: 140 }}
              value={params.imss_porcentaje}
              onChange={e => setParams(p => ({ ...p, imss_porcentaje: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="hr-card">
          <div className="hr-card-title">Deducciones adicionales</div>
          <p className="orgs-desc">Ej. préstamos internos, cuotas sindicales. Se aplican a todos los cálculos.</p>
          {(params.otras_deducciones || []).map((d, i) => (
            <div key={i} className="nom-deduccion-row">
              <input className="orgs-input" value={d.nombre} onChange={e => actualizarDeduccion(i, "nombre", e.target.value)} placeholder="Nombre" />
              <select className="orgs-input" style={{ maxWidth: 130 }} value={d.tipo} onChange={e => actualizarDeduccion(i, "tipo", e.target.value)}>
                <option value="porcentaje">%</option>
                <option value="monto_fijo">Monto fijo</option>
              </select>
              <input type="number" className="orgs-input" style={{ maxWidth: 100 }} value={d.valor} onChange={e => actualizarDeduccion(i, "valor", e.target.value)} />
              <button className="orgs-refresh-btn" onClick={() => eliminarDeduccion(i)}><FiTrash2 /></button>
            </div>
          ))}
          <button className="orgs-refresh-btn" style={{ marginTop: 10 }} onClick={agregarDeduccion}>
            <FiPlus style={{ verticalAlign: "-2px", marginRight: 4 }} />Agregar deducción
          </button>
        </div>
      </div>

      <div className="hr-card" style={{ marginTop: 20 }}>
        <div className="hr-card-title">Tabla ISR mensual</div>
        <p className="orgs-desc">Rangos de ingreso mensual → cuota fija + % sobre excedente. Ajusta según la tabla vigente de tu país/año.</p>
        <div className="nom-isr-table">
          <div className="nom-isr-header">
            <span>Límite inferior</span><span>Límite superior</span><span>Cuota fija</span><span>% excedente</span>
          </div>
          {params.isr_tabla.map((r, i) => (
            <div key={i} className="nom-isr-row">
              <input type="number" className="orgs-input" value={r.limite_inferior} onChange={e => actualizarRango(i, "limite_inferior", e.target.value)} />
              <input type="number" className="orgs-input" value={r.limite_superior ?? ""} placeholder="Sin límite" onChange={e => actualizarRango(i, "limite_superior", e.target.value)} />
              <input type="number" className="orgs-input" value={r.cuota_fija} onChange={e => actualizarRango(i, "cuota_fija", e.target.value)} />
              <input type="number" className="orgs-input" value={r.porcentaje_excedente} onChange={e => actualizarRango(i, "porcentaje_excedente", e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="hr-card" style={{ marginTop: 20 }}>
        <div className="hr-card-title">Calculadora de referencia</div>
        <div className="orgs-color-row">
          <select className="orgs-input" value={empleadoSel} onChange={e => setEmpleadoSel(e.target.value)}>
            <option value="">Selecciona un empleado…</option>
            {empleados.map(e => (
              <option key={getId(e)} value={getId(e)}>{e.Nombre} {e.ApelPaterno}</option>
            ))}
          </select>
          <select className="orgs-input" style={{ maxWidth: 140 }} value={periodo} onChange={e => setPeriodo(e.target.value)}>
            <option value="mensual">Mensual</option>
            <option value="quincenal">Quincenal</option>
          </select>
          <button className="orgs-save-btn" onClick={handleCalcular} disabled={!empleadoSel || calculando}>
            {calculando ? "Calculando…" : "Calcular"}
          </button>
        </div>

        {calcError && <p style={{ color: "var(--hr-danger, #e86b5f)", marginTop: 10 }}>{calcError}</p>}

        {resultado && (
          <div className="nom-resultado">
            <div className="nom-resultado-row"><span>Percepción bruta</span><strong>${resultado.percepcion_bruta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            <div className="nom-resultado-row"><span>ISR</span><strong>-${resultado.isr.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            <div className="nom-resultado-row"><span>IMSS</span><strong>-${resultado.imss.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            {resultado.otras_deducciones.map((d, i) => (
              <div key={i} className="nom-resultado-row"><span>{d.nombre}</span><strong>-${d.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            ))}
            <div className="nom-resultado-row nom-resultado-row--total"><span>Neto ({resultado.periodo})</span><strong>${resultado.neto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NominaConfig;
