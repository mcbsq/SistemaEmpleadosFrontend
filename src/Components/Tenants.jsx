// src/Components/Tenants.jsx
// Registro central de empresas dadas de alta en el sistema — solo visible
// para el operador de Cibercom (ver api/tenants/routes.py: SUPER_ADMIN del
// tenant propio de Cibercom, no cualquier SUPER_ADMIN de una empresa
// cliente). Puramente de lectura: una empresa nace sola al primer login de
// su gente (auto-provisioning en api/login/logic.py), esta pantalla no da
// de alta nada, solo muestra lo que ya existe.
import React, { useState, useEffect, useCallback } from "react";
import { FiBriefcase, FiExternalLink } from "react-icons/fi";
import { tenantsService } from "../services/tenantsService";

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

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiBriefcase style={{ marginRight: 8, verticalAlign: "-3px" }} />Empresas</h2>
          <p className="hr-subtitle">
            Registro de todas las empresas dadas de alta en el sistema. Cada una nace sola al primer inicio de
            sesión de su gente — esta pantalla es solo de consulta.
          </p>
        </div>
      </div>

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
              <span className={`orgs-sev-badge ${t.estado === "activo" ? "orgs-sev--info" : "orgs-sev--error"}`}>
                {t.estado === "activo" ? "Activo" : "Inactivo"}
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
