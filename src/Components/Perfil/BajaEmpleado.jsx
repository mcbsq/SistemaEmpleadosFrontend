// src/Components/Perfil/BajaEmpleado.jsx
// Dar de baja / reingresar a un empleado. La baja NO borra el expediente:
// lo saca del directorio y de los KPIs, desactiva su cuenta y deja el
// registro de la salida (fecha, tipo, motivo) para medir la rotación.
import React, { useEffect, useState } from "react";
import { FiUserX, FiUserCheck } from "react-icons/fi";
import Modal from "../Modal";
import { apiFetch } from "../../services/apiConfig";

const hoy = () => new Date().toISOString().slice(0, 10);
const money = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(v || 0));
const fecha = (v) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "—");

export function BajaModal({ abierto, empleado, onClose, onHecho }) {
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState({ fecha: hoy(), tipo: "", motivo: "", recontratable: true });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!abierto) return;
    setForm({ fecha: hoy(), tipo: "", motivo: "", recontratable: true });
    setErrores({}); setError(""); setResultado(null);
    apiFetch("/bajas/tipos").then(setTipos).catch(() => setTipos([]));
  }, [abierto]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrores(e => ({ ...e, [k]: undefined })); };

  const confirmar = async () => {
    setGuardando(true); setError("");
    try {
      setResultado(await apiFetch(`/empleados/${empleado._id}/baja`, { method: "POST", body: JSON.stringify(form) }));
    } catch (e) {
      setErrores(e.campos || {});
      setError(e.campos ? "" : (e.message || "No se pudo registrar la baja."));
    } finally { setGuardando(false); }
  };

  const nombre = `${empleado?.Nombre || ""} ${empleado?.ApelPaterno || ""}`.trim();

  if (resultado) {
    const ag = resultado.aguinaldo_proporcional;
    return (
      <Modal abierto={abierto} onClose={onHecho} titulo="Baja registrada" subtitulo={`${nombre} salió el ${fecha(resultado.baja?.fecha)}.`}
        onGuardar={onHecho} labelGuardar="Listo">
        <p className="vp-sub" style={{ marginTop: 0 }}>
          Su cuenta quedó desactivada y ya no aparece en el directorio. El expediente se conserva para la rotación y un posible reingreso.
        </p>
        {ag && (
          <>
            <h4 className="field-label" style={{ margin: "14px 0 8px" }}>Para el finiquito: aguinaldo proporcional {ag.anio}</h4>
            <div className="cm-cifras">
              <div><strong>{ag.dias_trabajados}</strong><span>días trabajados en el año</span></div>
              <div><strong>{ag.dias_a_pagar}</strong><span>días de aguinaldo</span></div>
              <div><strong>{money(ag.monto)}</strong><span>aguinaldo bruto</span></div>
              <div className="is-bien"><strong>{money(ag.neto)}</strong><span>neto (ISR {money(ag.isr)})</span></div>
            </div>
          </>
        )}
      </Modal>
    );
  }

  const valido = form.fecha && form.tipo && form.motivo.trim().length >= 3;
  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Dar de baja" ancho={560}
      subtitulo={`${nombre} dejará de aparecer en el directorio y su cuenta se desactivará. El expediente no se borra.`}
      onGuardar={confirmar} guardando={guardando} puedeGuardar={!!valido} error={error}
      labelGuardar="Dar de baja" iconGuardar={FiUserX}>
      <div className="field-grid">
        <div className="field-row">
          <label className="field-label" htmlFor="bj-fecha">Fecha de baja</label>
          <input id="bj-fecha" type="date" className="field-input" max={hoy()} value={form.fecha} onChange={e => set("fecha", e.target.value)}
            aria-invalid={!!errores.fecha} />
          {errores.fecha && <span className="field-error">{errores.fecha}</span>}
        </div>
        <div className="field-row">
          <label className="field-label" htmlFor="bj-tipo">Tipo de baja</label>
          <select id="bj-tipo" className="field-input" value={form.tipo} onChange={e => set("tipo", e.target.value)} aria-invalid={!!errores.tipo}>
            <option value="">Elige…</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {errores.tipo && <span className="field-error">{errores.tipo}</span>}
        </div>
        <div className="field-row field-span-2">
          <label className="field-label" htmlFor="bj-motivo">Motivo</label>
          <textarea id="bj-motivo" className="field-input" rows={3} maxLength={500} value={form.motivo}
            placeholder="Ej. Se cambió a otra empresa por mejor sueldo" onChange={e => set("motivo", e.target.value)} aria-invalid={!!errores.motivo} />
          {errores.motivo && <span className="field-error">{errores.motivo}</span>}
        </div>
        <label className="field-row field-span-2" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.recontratable} onChange={e => set("recontratable", e.target.checked)} />
          <span>Se puede volver a contratar</span>
        </label>
      </div>
    </Modal>
  );
}

export function BajaAviso({ baja, puedeReingresar, onReingresar }) {
  return (
    <div className="perfil-baja-aviso" role="status">
      <FiUserX aria-hidden="true" />
      <div>
        <strong>Dado de baja{baja?.fecha ? ` el ${fecha(baja.fecha)}` : ""}</strong>
        {baja && <span>{baja.motivo}{baja.recontratable === false ? " · No recontratable" : ""}</span>}
      </div>
      {puedeReingresar && (
        <button type="button" className="perfil-baja-btn" onClick={onReingresar}><FiUserCheck aria-hidden="true" /> Reingresar</button>
      )}
    </div>
  );
}

export function ReingresoModal({ abierto, empleado, onClose, onHecho }) {
  const [fechaR, setFechaR] = useState(hoy());
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (abierto) { setFechaR(hoy()); setError(""); } }, [abierto]);

  const confirmar = async () => {
    setGuardando(true); setError("");
    try {
      await apiFetch(`/empleados/${empleado._id}/reingreso`, { method: "POST", body: JSON.stringify({ fecha: fechaR }) });
      onHecho();
    } catch (e) { setError(e.campos?.fecha || e.message || "No se pudo registrar el reingreso."); }
    finally { setGuardando(false); }
  };

  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Reingresar empleado" ancho={480}
      subtitulo="Vuelve al directorio y se reactiva su cuenta. Su baja anterior se conserva en el historial y sigue contando en la rotación."
      onGuardar={confirmar} guardando={guardando} puedeGuardar={!!fechaR} error={error}
      labelGuardar="Reingresar" iconGuardar={FiUserCheck}>
      {empleado?.baja?.recontratable === false && (
        <p className="field-error" style={{ marginTop: 0 }}>En su baja se marcó como no recontratable.</p>
      )}
      <div className="field-row">
        <label className="field-label" htmlFor="rg-fecha">Fecha de reingreso (nueva fecha de ingreso)</label>
        <input id="rg-fecha" type="date" className="field-input" value={fechaR} onChange={e => setFechaR(e.target.value)} />
      </div>
    </Modal>
  );
}
