// src/Components/NominaPrestaciones.jsx
// Aguinaldo del año y horas extra. Los cálculos los hace el backend
// (api/nomina/prestaciones.py, con la LFT): aquí solo se muestran.
import { confirmar } from "../services/dialogo";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiClock, FiCheck, FiX } from "react-icons/fi";
import IconButton from "./IconButton";
import Modal from "./Modal";
import { RecordCard } from "./RecordCard";
import { apiFetch, API_URL, sessionHeaders } from "../services/apiConfig";
import { empleadoService } from "../services/empleadoService";
import { authService } from "../services/authService";
import "./NominaConfig.css";

const money = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));
const fechaCorta = (v) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—");
const getId = (x) => x?._id?.$oid || x?._id || "";
const hoy = () => new Date().toISOString().slice(0, 10);
const mesActual = () => new Date().toISOString().slice(0, 7);
const iniciales = (n = "") => n.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "?";

async function descargar(path, nombre) {
  const res = await fetch(`${API_URL}${path}`, { headers: sessionHeaders() });
  if (!res.ok) return;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ── Aguinaldo ─────────────────────────────────────────────────────────────
export function Aguinaldo() {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    setDatos(null); setError("");
    apiFetch(`/nomina/aguinaldo?anio=${anio}`)
      .then(d => vivo && setDatos(d))
      .catch(e => vivo && setError(e.message || "No se pudo calcular el aguinaldo."));
    return () => { vivo = false; };
  }, [anio]);

  return (
    <div className="hr-card">
      <div className="nom-toolbar">
        <div className="nom-toolbar-fill">
          <div className="hr-card-title" style={{ margin: 0 }}>Aguinaldo {anio}</div>
          <p className="orgs-desc" style={{ margin: "4px 0 0" }}>
            {datos ? `${datos.dias_aguinaldo} días por año completo; proporcional para quien entró o salió en el año. Fecha límite de pago: 20 de diciembre.` : "Calculando…"}
          </p>
        </div>
        <select className="orgs-input" aria-label="Año" value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[anioActual + 1, anioActual, anioActual - 1, anioActual - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <IconButton accion="descargar" label="Exportar a Excel" tooltipPos="left"
          onClick={() => descargar("/analitica/reportes/aguinaldos/export", `aguinaldos-${anioActual}.xlsx`)} />
      </div>

      {error && <p className="field-error">{error}</p>}
      {!datos && !error && <div className="mo-skeleton" style={{ height: 160, borderRadius: 14 }} />}
      {datos && (
        <>
          <div className="cm-cifras" style={{ marginBottom: 14 }}>
            <div><strong>{datos.empleados.length}</strong><span>empleados</span></div>
            <div><strong>{money(datos.totales.monto)}</strong><span>aguinaldo total</span></div>
            <div className="is-mal"><strong>{money(datos.totales.isr)}</strong><span>ISR estimado</span></div>
            <div className="is-bien"><strong>{money(datos.totales.neto)}</strong><span>neto a pagar</span></div>
          </div>
          {datos.empleados.length === 0 ? (
            <p className="nom-aviso">No hay empleados con salario registrado para este año.</p>
          ) : (
            <div className="nom-tabla-wrap">
              <table className="nom-tabla">
                <thead><tr>
                  <th>Empleado</th><th>Salario diario</th><th>Días trabajados</th><th>Días a pagar</th>
                  <th>Aguinaldo</th><th>Exento</th><th>ISR</th><th>Neto</th>
                </tr></thead>
                <tbody>
                  {datos.empleados.map(e => (
                    <tr key={e.empleado_id}>
                      <td>{e.nombre}<span className="nom-sub">{e.area}{e.dado_de_baja ? " · dado de baja" : ""}{e.sin_fecha_ingreso ? " · sin fecha de ingreso (se asume año completo)" : ""}</span></td>
                      <td>{money(e.salario_diario)}</td>
                      <td>{e.dias_trabajados}{e.proporcional ? <span className="nom-sub">proporcional</span> : null}</td>
                      <td>{e.dias_a_pagar}</td>
                      <td>{money(e.monto)}</td>
                      <td>{money(e.exento)}</td>
                      <td>{money(e.isr)}</td>
                      <td><strong>{money(e.neto)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td>Total</td><td /><td /><td />
                  <td>{money(datos.totales.monto)}</td><td>{money(datos.totales.exento)}</td>
                  <td>{money(datos.totales.isr)}</td><td>{money(datos.totales.neto)}</td>
                </tr></tfoot>
              </table>
            </div>
          )}
          {datos.sin_salario.length > 0 && (
            <p className="nom-aviso">Sin salario registrado (no se calculan): {datos.sin_salario.map(s => s.nombre).join(", ")}.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Horas extra ───────────────────────────────────────────────────────────
const ESTADOS_HE = {
  aprobada:  { label: "Aprobada",  tono: "success" },
  pendiente: { label: "Por aprobar", tono: "warning" },
  rechazada: { label: "Rechazada", tono: "danger" },
};

function rangoMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

export function HorasExtra() {
  const role = authService.getRole();
  const puedeAprobar = ["ADMIN", "SUPER_ADMIN", "RH"].includes(role);
  const [mes, setMes] = useState(mesActual());
  const [registros, setRegistros] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [error, setError] = useState("");
  const [alta, setAlta] = useState(false);
  const [form, setForm] = useState({ empleado_id: "", fecha: hoy(), horas: "", motivo: "" });
  const [guardando, setGuardando] = useState(false);
  const [errorAlta, setErrorAlta] = useState("");
  const [aviso, setAviso] = useState("");
  const [calculo, setCalculo] = useState(null);

  const cargar = useCallback(() => {
    const { desde, hasta } = rangoMes(mes);
    setError("");
    apiFetch(`/horas-extra?desde=${desde}&hasta=${hasta}`)
      .then(setRegistros)
      .catch(e => { setRegistros([]); setError(e.message || "No se pudieron cargar las horas extra."); });
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { empleadoService.getAll().then(e => setEmpleados(Array.isArray(e) ? e : [])).catch(() => setEmpleados([])); }, []);

  const resumen = useMemo(() => {
    const por = {};
    (registros || []).filter(r => r.estado === "aprobada").forEach(r => {
      por[r.empleado_id] = por[r.empleado_id] || { empleado_id: r.empleado_id, nombre: r.nombre, horas: 0 };
      por[r.empleado_id].horas += Number(r.horas);
    });
    return Object.values(por).sort((a, b) => b.horas - a.horas);
  }, [registros]);

  const guardar = async () => {
    setGuardando(true); setErrorAlta("");
    try {
      const r = await apiFetch("/horas-extra", { method: "POST", body: JSON.stringify({ ...form, horas: Number(form.horas) }) });
      setAlta(false);
      setAviso(r.alertas?.length ? r.alertas.join(" ") : r.estado === "pendiente" ? "Registradas; RH debe aprobarlas." : "");
      setForm({ empleado_id: "", fecha: hoy(), horas: "", motivo: "" });
      cargar();
    } catch (e) { setErrorAlta(e.message || "No se pudieron registrar."); }
    finally { setGuardando(false); }
  };

  const resolver = async (r, estado) => {
    await apiFetch(`/horas-extra/${r._id}`, { method: "PATCH", body: JSON.stringify({ estado }) }).catch(e => setError(e.message));
    cargar();
  };
  const eliminar = async (r) => {
    if (!(await confirmar(`¿Eliminar ${r.horas} h de ${r.nombre} del ${fechaCorta(r.fecha)}?`))) return;
    await apiFetch(`/horas-extra/${r._id}`, { method: "DELETE" }).catch(e => setError(e.message));
    cargar();
  };
  const verCalculo = async (fila) => {
    setCalculo({ nombre: fila.nombre, datos: null });
    try { setCalculo({ nombre: fila.nombre, datos: await apiFetch(`/nomina/horas-extra/${fila.empleado_id}?mes=${mes}`) }); }
    catch (e) { setCalculo({ nombre: fila.nombre, error: e.message || "No se pudo calcular." }); }
  };

  return (
    <div className="hr-card">
      <div className="nom-toolbar">
        <div className="nom-toolbar-fill">
          <div className="hr-card-title" style={{ margin: 0 }}>Horas extra</div>
          <p className="orgs-desc" style={{ margin: "4px 0 0" }}>
            Máximo legal: 3 h al día y 3 días por semana, pagadas dobles. Lo que rebasa se paga triple. Solo las aprobadas entran a la nómina del mes.
          </p>
        </div>
        <input type="month" className="orgs-input" aria-label="Mes" value={mes} onChange={e => setMes(e.target.value)} />
        <IconButton accion="agregar" label="Registrar horas extra" tooltipPos="left" onClick={() => { setErrorAlta(""); setAlta(true); }} />
      </div>

      {aviso && <p className="nom-alerta" role="status">{aviso}</p>}
      {error && <p className="field-error">{error}</p>}

      {resumen.length > 0 && (
        <div className="nom-tabla-wrap" style={{ marginBottom: 14 }}>
          <table className="nom-tabla" style={{ minWidth: 0 }}>
            <thead><tr><th>Empleado</th><th>Horas aprobadas</th><th /></tr></thead>
            <tbody>
              {resumen.map(f => (
                <tr key={f.empleado_id}>
                  <td>{f.nombre}</td><td>{f.horas} h</td>
                  <td><IconButton icon={FiClock} size="sm" label="Ver cálculo del mes" tooltipPos="left" onClick={() => verCalculo(f)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {registros === null ? <div className="mo-skeleton" style={{ height: 120, borderRadius: 14 }} />
        : registros.length === 0 ? <p className="nom-aviso">Sin horas extra registradas en este mes.</p>
        : (
          <div className="rc-grid">
            {registros.map(r => {
              const est = ESTADOS_HE[r.estado] || { label: r.estado, tono: "accent" };
              return (
                <RecordCard key={r._id} tono={est.tono}
                  tile={<span className="rc-tile-big">{iniciales(r.nombre)}</span>}
                  titulo={r.nombre || "Empleado"}
                  badge={<span className={`rc-badge rc-badge--${est.tono}`}>{est.label}</span>}
                  meta={<><span>{fechaCorta(r.fecha)}{r.motivo ? ` · ${r.motivo}` : ""}</span><strong>{r.horas} h</strong></>}
                  acciones={puedeAprobar ? (<>
                    {r.estado !== "aprobada" && <IconButton icon={FiCheck} tone="save" size="sm" label="Aprobar" onClick={() => resolver(r, "aprobada")} />}
                    {r.estado === "pendiente" && <IconButton icon={FiX} size="sm" label="Rechazar" onClick={() => resolver(r, "rechazada")} />}
                    <IconButton accion="eliminar" size="sm" label="Eliminar registro" tooltipPos="left" onClick={() => eliminar(r)} />
                  </>) : null} />
              );
            })}
          </div>
        )}

      <Modal abierto={alta} onClose={() => setAlta(false)} titulo="Registrar horas extra" ancho={520}
        subtitulo={puedeAprobar ? "Quedan aprobadas y entran a la nómina del mes." : "Quedan por aprobar hasta que RH las revise."}
        onGuardar={guardar} guardando={guardando} error={errorAlta} labelGuardar="Registrar"
        puedeGuardar={!!(form.empleado_id && form.fecha && Number(form.horas) > 0)}>
        <div className="field-grid">
          <div className="field-row field-span-2">
            <label className="field-label" htmlFor="he-emp">Empleado</label>
            <select id="he-emp" className="field-input" value={form.empleado_id} onChange={e => setForm(f => ({ ...f, empleado_id: e.target.value }))}>
              <option value="">Elige…</option>
              {empleados.map(e => <option key={getId(e)} value={getId(e)}>{e.Nombre} {e.ApelPaterno}</option>)}
            </select>
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="he-fecha">Fecha</label>
            <input id="he-fecha" type="date" className="field-input" max={hoy()} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="he-horas">Horas</label>
            <input id="he-horas" type="number" min="0.5" max="12" step="0.5" className="field-input" value={form.horas}
              onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} />
            {Number(form.horas) > 3 && <span className="nom-alerta">Más de 3 h en un día: el excedente se paga triple.</span>}
          </div>
          <div className="field-row field-span-2">
            <label className="field-label" htmlFor="he-motivo">Motivo</label>
            <input id="he-motivo" className="field-input" maxLength={200} placeholder="Ej. Pedido de temporada" value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal abierto={!!calculo} onClose={() => setCalculo(null)} titulo={calculo ? `Horas extra de ${calculo.nombre}` : ""} ancho={620}
        subtitulo={calculo?.datos ? `Salario por hora ${money(calculo.datos.salario_hora)} (jornada de ${calculo.datos.jornada_horas} h)` : undefined}>
        {calculo?.error && <p className="field-error">{calculo.error}</p>}
        {calculo && !calculo.datos && !calculo.error && <div className="mo-skeleton" style={{ height: 120, borderRadius: 14 }} />}
        {calculo?.datos && (
          <>
            {calculo.datos.semanas.map(s => (
              <div key={s.desde} className="nom-semana">
                <div className="nom-semana-head">
                  <span>Semana del {fechaCorta(s.desde)} al {fechaCorta(s.hasta)}</span><span>{money(s.monto)}</span>
                </div>
                <span className="nom-sub">{s.dobles} h dobles ({money(s.pago_dobles)}) · {s.triples} h triples ({money(s.pago_triples)}) · exento {money(s.exento)}</span>
                {s.alertas.map((a, i) => <p key={i} className="nom-alerta">{a}</p>)}
              </div>
            ))}
            <div className="cm-cifras">
              <div><strong>{calculo.datos.totales.horas} h</strong><span>horas aprobadas</span></div>
              <div><strong>{money(calculo.datos.totales.monto)}</strong><span>a pagar</span></div>
              <div><strong>{money(calculo.datos.totales.exento)}</strong><span>exento de ISR</span></div>
              <div><strong>{money(calculo.datos.totales.gravado)}</strong><span>gravado</span></div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
