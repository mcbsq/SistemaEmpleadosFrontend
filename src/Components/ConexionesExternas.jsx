// src/Components/ConexionesExternas.jsx
// SUPER_ADMIN — conexiones a sistemas externos (ej. nómina generada en otro
// sistema, consumida en vivo y mostrada en el perfil del empleado). La API
// key nunca se vuelve a mostrar en claro tras crearla — el backend solo
// regresa un preview enmascarado.
import React, { useState, useEffect, useCallback } from "react";
import { FiLink, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiX } from "react-icons/fi";
import { conexionesExternasService } from "../services/conexionesExternasService";

const TIPOS = [{ value: "nomina", label: "Nómina" }];
const CAMPOS_MAPEO = [
  { value: "NumeroEmpleado", label: "Número de empleado (RH)" },
  { value: "email", label: "Correo electrónico" },
  { value: "empleado_id", label: "ID interno del empleado" },
];

const NUEVA_INIT = {
  nombre: "", tipo: "nomina", base_url: "", ruta_plantilla: "/nomina/{identificador}",
  esquema_auth: "Bearer", campo_mapeo: "NumeroEmpleado", api_key: "",
};

function ConexionesExternas() {
  const [conexiones, setConexiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nueva, setNueva] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await conexionesExternasService.getAll().catch(() => []);
      setConexiones(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    if (!nueva.nombre || !nueva.base_url || !nueva.api_key) {
      setError("Nombre, URL base y API key son obligatorios.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await conexionesExternasService.create(nueva);
      setNueva(null);
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo crear la conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const toggleActiva = async (c) => {
    await conexionesExternasService.update(c._id, { activa: !c.activa }).catch(() => {});
    cargar();
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar la conexión "${c.nombre}"? Los perfiles dejarán de mostrar sus datos.`)) return;
    await conexionesExternasService.delete(c._id).catch(() => {});
    cargar();
  };

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiLink style={{ marginRight: 8, verticalAlign: "-3px" }} />Integraciones externas</h2>
          <p className="hr-subtitle">
            Sistemas de terceros de los que este sistema consume información en vivo (ej. nómina generada en
            otro sistema, mostrada en el perfil del empleado). La API key se guarda cifrada y nunca se vuelve a mostrar.
          </p>
        </div>
        <button className="orgs-save-btn" onClick={() => setNueva({ ...NUEVA_INIT })}>
          <FiPlus style={{ verticalAlign: "-2px", marginRight: 4 }} />Nueva conexión
        </button>
      </div>

      {nueva && (
        <div className="hr-card" style={{ marginBottom: 16 }}>
          <div className="hr-card-title">Nueva conexión</div>
          <div className="orgs-color-row" style={{ marginBottom: 8 }}>
            <input className="orgs-input" placeholder="Nombre (ej. Sistema de Nómina ACME)"
              value={nueva.nombre} onChange={e => setNueva(n => ({ ...n, nombre: e.target.value }))} />
            <select className="orgs-input" value={nueva.tipo} onChange={e => setNueva(n => ({ ...n, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <input className="orgs-input" placeholder="URL base (https://api.sistema-externo.com)" style={{ marginBottom: 8 }}
            value={nueva.base_url} onChange={e => setNueva(n => ({ ...n, base_url: e.target.value }))} />
          <input className="orgs-input" placeholder="Ruta con {identificador} (ej. /nomina/{identificador})" style={{ marginBottom: 8 }}
            value={nueva.ruta_plantilla} onChange={e => setNueva(n => ({ ...n, ruta_plantilla: e.target.value }))} />
          <div className="orgs-color-row" style={{ marginBottom: 8 }}>
            <select className="orgs-input" value={nueva.campo_mapeo} onChange={e => setNueva(n => ({ ...n, campo_mapeo: e.target.value }))}>
              {CAMPOS_MAPEO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className="orgs-input" placeholder="Esquema (Bearer)" value={nueva.esquema_auth}
              onChange={e => setNueva(n => ({ ...n, esquema_auth: e.target.value }))} />
          </div>
          <input className="orgs-input" type="password" placeholder="API key del sistema externo" style={{ marginBottom: 8 }}
            value={nueva.api_key} onChange={e => setNueva(n => ({ ...n, api_key: e.target.value }))} />
          <p className="orgs-desc" style={{ marginBottom: 8 }}>
            El campo de mapeo decide qué valor del empleado se manda como {"{identificador}"} en la ruta —
            debe coincidir con lo que el sistema externo espera recibir.
          </p>
          {error && <p style={{ color: "var(--hr-danger, #e86b5f)", fontSize: "0.82rem", marginBottom: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="orgs-save-btn" onClick={crear} disabled={guardando}>{guardando ? "Guardando…" : "Crear conexión"}</button>
            <button className="orgs-refresh-btn" onClick={() => { setNueva(null); setError(""); }}><FiX /> Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : conexiones.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiLink /></span>
          <p>Sin conexiones configuradas todavía.</p>
        </div>
      ) : (
        <div className="orgs-incident-list">
          {conexiones.map(c => (
            <div key={c._id} className="orgs-incident-row">
              <span className={`orgs-sev-badge ${c.activa ? "orgs-sev--info" : "orgs-sev--error"}`}>
                {TIPOS.find(t => t.value === c.tipo)?.label || c.tipo}
              </span>
              <div className="orgs-incident-info">
                <span className="orgs-incident-msg">{c.nombre}</span>
                <span className="orgs-incident-meta">{c.base_url}{c.ruta_plantilla} · mapea por {c.campo_mapeo}</span>
              </div>
              <div className="orgs-apikey-actions">
                <button className="orgs-refresh-btn" onClick={() => toggleActiva(c)}>
                  {c.activa ? <FiToggleRight style={{ verticalAlign: "-2px", marginRight: 4 }} /> : <FiToggleLeft style={{ verticalAlign: "-2px", marginRight: 4 }} />}
                  {c.activa ? "Activa" : "Inactiva"}
                </button>
                <button className="orgs-refresh-btn" onClick={() => eliminar(c)}><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConexionesExternas;
