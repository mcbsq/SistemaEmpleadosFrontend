// src/Components/ConexionesExternas.jsx
// SUPER_ADMIN — conexiones a sistemas externos (ej. nómina generada en otro
// sistema, consumida en vivo y mostrada en el perfil del empleado). La API
// key nunca se vuelve a mostrar en claro tras crearla — el backend solo
// regresa un preview enmascarado.
import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import IconButton from "./IconButton";
import { RecordCard } from "./RecordCard";
import { FiLink, FiTrash2, FiToggleLeft, FiToggleRight } from "react-icons/fi";
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
        <IconButton accion="agregar" size="lg" label="Nueva conexión" onClick={() => setNueva({ ...NUEVA_INIT })} tooltipPos="left" />
      </div>

      <Modal abierto={!!nueva} onClose={() => { setNueva(null); setError(""); }} titulo="Nueva conexión" ancho={620}
        subtitulo="La API key se guarda cifrada y nunca se vuelve a mostrar."
        onGuardar={crear} labelGuardar="Crear conexión" guardando={guardando} error={error}
        puedeGuardar={!!(nueva?.nombre?.trim() && nueva?.base_url?.trim())}>
        {nueva && (<>
          <div className="orgs-color-row" style={{ marginBottom: 8 }}>
            <input className="orgs-input" placeholder="Nombre (ej. Sistema de Nómina ACME)" aria-label="Nombre"
              value={nueva.nombre} onChange={e => setNueva(n => ({ ...n, nombre: e.target.value }))} />
            <select className="orgs-input" aria-label="Tipo" value={nueva.tipo} onChange={e => setNueva(n => ({ ...n, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <input className="orgs-input" placeholder="URL base (https://api.sistema-externo.com)" aria-label="URL base" style={{ marginBottom: 8 }}
            value={nueva.base_url} onChange={e => setNueva(n => ({ ...n, base_url: e.target.value }))} />
          <input className="orgs-input" placeholder="Ruta con {identificador} (ej. /nomina/{identificador})" aria-label="Ruta" style={{ marginBottom: 8 }}
            value={nueva.ruta_plantilla} onChange={e => setNueva(n => ({ ...n, ruta_plantilla: e.target.value }))} />
          <div className="orgs-color-row" style={{ marginBottom: 8 }}>
            <select className="orgs-input" aria-label="Campo de mapeo" value={nueva.campo_mapeo} onChange={e => setNueva(n => ({ ...n, campo_mapeo: e.target.value }))}>
              {CAMPOS_MAPEO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className="orgs-input" placeholder="Esquema (Bearer)" aria-label="Esquema" value={nueva.esquema_auth}
              onChange={e => setNueva(n => ({ ...n, esquema_auth: e.target.value }))} />
          </div>
          <input className="orgs-input" type="password" placeholder="API key del sistema externo" aria-label="API key" style={{ marginBottom: 8 }}
            value={nueva.api_key} onChange={e => setNueva(n => ({ ...n, api_key: e.target.value }))} />
          <p className="orgs-desc">
            El campo de mapeo decide qué valor del empleado se manda como {"{identificador}"} en la ruta —
            debe coincidir con lo que el sistema externo espera recibir.
          </p>
        </>)}
      </Modal>

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : conexiones.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiLink /></span>
          <p>Sin conexiones configuradas todavía.</p>
        </div>
      ) : (
        <div className="rc-grid mo-stagger">
          {conexiones.map(c => (
            <RecordCard key={c._id} tono={c.activa ? "success" : "danger"}
              tile={<FiLink />} titulo={c.nombre}
              badge={<span className={`rc-badge rc-badge--${c.activa ? "success" : "danger"}`}>{c.activa ? "Activa" : "Inactiva"}</span>}
              meta={<><span>{TIPOS.find(t => t.value === c.tipo)?.label || c.tipo}</span><span className="rc-meta-trunc" title={`${c.base_url}${c.ruta_plantilla}`}>{c.base_url}{c.ruta_plantilla}</span><span>mapea por {c.campo_mapeo}</span></>}
              acciones={<>
                <IconButton icon={c.activa ? FiToggleRight : FiToggleLeft} label={c.activa ? "Desactivar" : "Activar"} onClick={() => toggleActiva(c)} />
                <IconButton accion="eliminar" icon={FiTrash2} label="Eliminar conexión" tooltipPos="left" onClick={() => eliminar(c)} />
              </>} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ConexionesExternas;
