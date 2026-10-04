// src/Components/Tenants.jsx
// "Empresas" — solo la cuenta suprema de la plataforma (Cibercom, dueña de la
// app). Cada empresa es un universo aislado; aquí se ven como tarjetas con
// su uso (personas, cuentas, solicitudes abiertas, última actividad), se da
// de alta una nueva desde un pop-up y se puede ENTRAR a ver su universo en
// modo soporte (solo lectura, queda en la auditoría de esa empresa).
import React, { useState, useEffect, useCallback } from "react";
import { FiBriefcase, FiExternalLink, FiEye, FiUsers, FiKey, FiInbox, FiSend } from "react-icons/fi";
import { tenantsService } from "../services/tenantsService";
import { authService } from "../services/authService";
import IconButton from "./IconButton";
import Modal from "./Modal";
import "./Tenants.css";

const initialForm = { nombre: "", org_id: "", contacto_nombre: "", contacto_email: "" };
const fecha = (iso) => {
  if (!iso) return "sin actividad";
  try { return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }); } catch { return iso; }
};
const iniciales = (n = "") => n.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "?";
const slugDe = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [slugEditado, setSlugEditado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [credentials, setCredentials] = useState({ usuario: "", temp_password: "" });
  const [accessSent, setAccessSent] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [entrando, setEntrando] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [data, res] = await Promise.all([
        tenantsService.getAll(),
        tenantsService.resumen ? tenantsService.resumen().catch(() => ({})) : Promise.resolve({}),
      ]);
      setTenants(Array.isArray(data) ? data : []);
      setResumen(res || {});
    } catch (e) {
      setError(e.message || "No se pudo cargar el registro de empresas.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirNueva = () => {
    setForm(initialForm); setSlugEditado(false); setCreated(null); setAccessSent(false);
    setCredentials({ usuario: "", temp_password: "" }); setErrorModal(""); setAbierto(true);
  };

  const change = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const n = { ...f, [name]: value };
      if (name === "nombre" && !slugEditado) n.org_id = slugDe(value);
      return n;
    });
    if (name === "org_id") setSlugEditado(true);
  };

  const preparar = async () => {
    setSaving(true); setErrorModal("");
    try {
      const result = await tenantsService.createManual(form);
      setCreated(result);
      setCredentials({ usuario: form.contacto_email, temp_password: "" });
      await cargar();
    } catch (e) {
      setErrorModal(e.message || "No se pudo preparar la empresa.");
    } finally {
      setSaving(false);
    }
  };

  const enviarAcceso = async () => {
    setSaving(true); setErrorModal("");
    try {
      await tenantsService.deliverAccess(created.org_id, credentials);
      setAccessSent(true);
      setCredentials(c => ({ ...c, temp_password: "" }));
    } catch (e) {
      setErrorModal(e.message || "No se pudieron enviar las credenciales.");
    } finally {
      setSaving(false);
    }
  };

  const entrar = async (t) => {
    setEntrando(t.org_id); setError("");
    try {
      const r = await tenantsService.entrar(t.org_id);
      authService.setUniverso(t.org_id, r?.nombre || t.nombre || t.org_id);
      window.location.href = "/Dashboard";
    } catch (e) {
      setError(e.message || "No se pudo entrar a esa empresa.");
      setEntrando("");
    }
  };

  const paso2 = !!created?.login_url;
  const formValido = form.nombre.trim() && form.org_id.trim() && form.contacto_nombre.trim() && form.contacto_email.trim();

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiBriefcase style={{ marginRight: 8, verticalAlign: "-3px" }} />Empresas</h2>
          <p className="hr-subtitle">Cada empresa es un universo aislado. Entra a ver cualquiera en modo soporte (solo lectura).</p>
        </div>
        <IconButton accion="agregar" size="lg" label="Nueva empresa" tooltipPos="left" onClick={abrirNueva} />
      </div>

      {error && <p className="cm-error" role="alert">{error}</p>}

      {loading ? (
        <div className="rc-grid">{[0, 1, 2].map(i => <div key={i} className="mo-skeleton" style={{ height: 170, borderRadius: 20 }} />)}</div>
      ) : tenants.length === 0 ? (
        <p className="rc-empty">Todavía no hay empresas. Usa + para dar de alta la primera.</p>
      ) : (
        <div className="tn-grid mo-stagger">
          {tenants.map(t => {
            const activo = ["activo", "active"].includes(t.estado);
            const r = resumen[t.org_id] || {};
            return (
              <article key={t._id} className={`tn-card${activo ? "" : " tn-card--inactiva"}`}>
                <header className="tn-card-head">
                  <span className="tn-logo">{iniciales(t.nombre || t.org_id)}</span>
                  <div className="tn-card-titulo">
                    <h3 title={t.nombre || t.org_id}>{t.nombre || t.org_id}</h3>
                    <span>/{t.org_id}</span>
                  </div>
                  <span className={`rc-badge rc-badge--${activo ? "success" : "danger"}`}>{activo ? "Activa" : "Inactiva"}</span>
                </header>
                <div className="tn-stats">
                  <span><FiUsers aria-hidden="true" /><strong>{r.empleados ?? "—"}</strong> personas</span>
                  <span><FiKey aria-hidden="true" /><strong>{r.cuentas ?? "—"}</strong> cuentas</span>
                  <span><FiInbox aria-hidden="true" /><strong>{r.solicitudes_abiertas ?? "—"}</strong> solicitudes</span>
                </div>
                <footer className="tn-card-foot">
                  <span className="tn-actividad">Última actividad: {fecha(r.ultima_actividad)}</span>
                  <div className="icon-btn-group">
                    <a className="icon-btn icon-btn--sm" href={`/${t.org_id}`} target="_blank" rel="noreferrer"
                      data-tooltip="Abrir su página de acceso"><FiExternalLink aria-hidden="true" /><span className="sr-only">Abrir su página de acceso</span></a>
                    <IconButton icon={FiEye} tone="edit" size="sm" label="Entrar a ver su universo" tooltipPos="left"
                      busy={entrando === t.org_id} onClick={() => entrar(t)} />
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <Modal abierto={abierto} onClose={() => setAbierto(false)} ancho={600}
        titulo={paso2 ? "Empresa preparada" : "Nueva empresa"}
        subtitulo={paso2 ? "Crea su administradora en AEGIS y envíale aquí su contraseña temporal." : "Empezará vacía: sin empleados ni información precargada."}
        onGuardar={paso2 ? (accessSent ? undefined : enviarAcceso) : preparar}
        labelGuardar={paso2 ? "Enviar credenciales" : "Preparar empresa"} iconGuardar={paso2 ? FiSend : undefined}
        guardando={saving} error={errorModal}
        puedeGuardar={paso2 ? !!(credentials.usuario && credentials.temp_password) : !!formValido}>
        {!paso2 ? (
          <div className="field-grid">
            <div className="field-row field-span-2"><label className="field-label" htmlFor="tn-nombre">Nombre de la empresa</label>
              <input id="tn-nombre" className="field-input" name="nombre" value={form.nombre} onChange={change} /></div>
            <div className="field-row field-span-2"><label className="field-label" htmlFor="tn-slug">Slug</label>
              <input id="tn-slug" className="field-input" name="org_id" value={form.org_id} onChange={change} placeholder="nombre-de-la-empresa" />
              <span className="field-hint">Su dirección de acceso será /{form.org_id || "nombre-de-la-empresa"}</span></div>
            <div className="field-row"><label className="field-label" htmlFor="tn-contacto">Persona de contacto</label>
              <input id="tn-contacto" className="field-input" name="contacto_nombre" value={form.contacto_nombre} onChange={change} /></div>
            <div className="field-row"><label className="field-label" htmlFor="tn-correo">Correo de contacto</label>
              <input id="tn-correo" className="field-input" type="email" name="contacto_email" value={form.contacto_email} onChange={change} /></div>
          </div>
        ) : (
          <>
            <a className="srh-perfil-link" href={created.login_url} target="_blank" rel="noreferrer">{created.login_url}</a>
            {accessSent ? (
              <p className="ap-ok ap-ok--block" role="status">Credenciales enviadas por correo.</p>
            ) : (
              <div className="field-grid">
                <div className="field-row"><label className="field-label" htmlFor="tn-usuario">Usuario AEGIS</label>
                  <input id="tn-usuario" className="field-input" name="usuario" value={credentials.usuario}
                    onChange={e => setCredentials(c => ({ ...c, usuario: e.target.value }))} /></div>
                <div className="field-row"><label className="field-label" htmlFor="tn-pass">Contraseña temporal</label>
                  <input id="tn-pass" className="field-input" type="password" autoComplete="new-password" name="temp_password" value={credentials.temp_password}
                    onChange={e => setCredentials(c => ({ ...c, temp_password: e.target.value }))} /></div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

export default Tenants;
