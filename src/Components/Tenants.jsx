// src/Components/Tenants.jsx
// Registro central de empresas dadas de alta en el sistema — solo visible
// para el operador de Cibercom (ver api/tenants/routes.py: SUPER_ADMIN del
// tenant propio de Cibercom, no cualquier SUPER_ADMIN de una empresa cliente).
import React, { useState, useEffect, useCallback } from "react";
import { FiBriefcase, FiExternalLink, FiPlus } from "react-icons/fi";
import { tenantsService } from "../services/tenantsService";
import "./Tenants.css";

const initialForm = { nombre: "", org_id: "", contacto_nombre: "", contacto_email: "" };

const formatFecha = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [credentials, setCredentials] = useState({ usuario: "", temp_password: "" });
  const [sendingAccess, setSendingAccess] = useState(false);
  const [accessSent, setAccessSent] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await tenantsService.getAll();
      setTenants(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "No se pudo cargar el registro de empresas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setCreated(null);
    try {
      const result = await tenantsService.createManual(form);
      setCreated(result);
      setCredentials({ usuario: form.contacto_email, temp_password: "" });
      setAccessSent(false);
      setForm(initialForm);
      await cargar();
    } catch (e) {
      setError(e.message || "No se pudo preparar la empresa.");
    } finally {
      setSaving(false);
    }
  };

  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const changeCredentials = event => setCredentials(current => ({ ...current, [event.target.name]: event.target.value }));

  const deliverAccess = async event => {
    event.preventDefault();
    setSendingAccess(true);
    setError("");
    try {
      await tenantsService.deliverAccess(created.org_id, credentials);
      setAccessSent(true);
      setCredentials(current => ({ ...current, temp_password: "" }));
    } catch (e) {
      setError(e.message || "No se pudieron enviar las credenciales.");
    } finally {
      setSendingAccess(false);
    }
  };

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiBriefcase style={{ marginRight: 8, verticalAlign: "-3px" }} />Empresas</h2>
          <p className="hr-subtitle">
            Prepara el espacio aislado de una empresa antes de crear su administradora en AEGIS.
          </p>
        </div>
      </div>

      <form className="tenants-create-card" onSubmit={submit}>
        <div className="tenants-create-heading">
          <FiPlus />
          <div><strong>Nueva empresa</strong><span>Iniciará sin empleados ni información precargada.</span></div>
        </div>
        <div className="tenants-create-grid">
          <label>Nombre de la empresa<input className="orgs-input" name="nombre" value={form.nombre} onChange={change} required /></label>
          <label>Slug<input className="orgs-input" name="org_id" value={form.org_id} onChange={change} placeholder="nombre-de-la-empresa" required /></label>
          <label>Persona de contacto<input className="orgs-input" name="contacto_nombre" value={form.contacto_nombre} onChange={change} required /></label>
          <label>Correo de contacto<input className="orgs-input" type="email" name="contacto_email" value={form.contacto_email} onChange={change} required /></label>
        </div>
        <button className="orgs-save-btn" disabled={saving}>{saving ? "Preparando…" : "Preparar empresa"}</button>
      </form>

      {created?.login_url && (
        <div className="tenants-onboarding-card">
          <div className="tenants-created" role="status">
            <strong>Empresa preparada.</strong>
            <span>Crea ahora la identidad administradora en AEGIS y utiliza la contraseña temporal que te entregue.</span>
            <a href={created.login_url} target="_blank" rel="noreferrer">{created.login_url}</a>
          </div>
          <form className="tenants-access-form" onSubmit={deliverAccess}>
            <label>Usuario AEGIS<input className="orgs-input" name="usuario" value={credentials.usuario} onChange={changeCredentials} required /></label>
            <label>Contraseña temporal<input className="orgs-input" type="password" name="temp_password" value={credentials.temp_password} onChange={changeCredentials} autoComplete="new-password" required /></label>
            <button className="orgs-save-btn" disabled={sendingAccess}>{sendingAccess ? "Enviando…" : "Enviar credenciales"}</button>
          </form>
          {accessSent && <p className="tenants-access-success">Credenciales enviadas por correo.</p>}
        </div>
      )}

      {error && <p style={{ color: "var(--hr-danger, #e86b5f)", fontSize: "0.82rem", marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : tenants.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiBriefcase /></span>
          <p>Todavía no se ha dado de alta ninguna empresa por este medio.</p>
        </div>
      ) : (
        <div className="orgs-incident-list">
          {tenants.map(t => (
            <div key={t._id} className="orgs-incident-row">
              <span className={`orgs-sev-badge ${["activo", "active"].includes(t.estado) ? "orgs-sev--info" : "orgs-sev--error"}`}>
                {["activo", "active"].includes(t.estado) ? "Activo" : "Inactivo"}
              </span>
              <div className="orgs-incident-info">
                <span className="orgs-incident-msg">{t.nombre || t.org_id}</span>
                <span className="orgs-incident-meta">/{t.org_id} · dada de alta el {formatFecha(t.fecha_alta)}</span>
              </div>
              <a
                className="orgs-refresh-btn"
                href={`/${t.org_id}`}
                target="_blank"
                rel="noreferrer"
                title="Abrir el link de esta empresa"
              >
                <FiExternalLink style={{ verticalAlign: "-2px", marginRight: 4 }} />/{t.org_id}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Tenants;
