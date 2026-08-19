// src/Components/Login/OrgGate.js
// ─────────────────────────────────────────────────────────────────────────────
// Puerta de entrada por empresa: /<org_id> (ej. /perrucho). El org_id es
// directamente el tenant_key que ya resuelve Aegis — no es un slug nuevo que
// haya que mantener sincronizado con nada.
//
// Esto NO autentica ni resuelve el tenant del login (eso lo sigue haciendo
// Aegis vía resolve-tenant con el email, como siempre) — es puramente para
// que la marca de la empresa (logo/colores) se vea ANTES de escribir el
// correo, en vez de la pantalla genérica que carga branding recién después
// de loguearse.
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useOrg } from "../../context/OrgContext";
import Login from "./Login";
import "./Login.css";

function OrgGate({ setIsAuthenticated, setUserRole }) {
  const { orgSlug } = useParams();
  const { loadOrgConfig } = useOrg();
  const [status, setStatus] = useState("loading"); // loading | ok | notfound

  useEffect(() => {
    let vivo = true;
    setStatus("loading");
    loadOrgConfig(orgSlug).then((cfg) => {
      if (!vivo) return;
      if (cfg && cfg.existe) {
        // Recordado para que "cerrar sesión" regrese a este mismo link con
        // su marca, en vez de a la pantalla genérica de /Login.
        sessionStorage.setItem("entry_org_slug", orgSlug);
        setStatus("ok");
      } else {
        setStatus("notfound");
      }
    });
    return () => { vivo = false; };
  }, [orgSlug, loadOrgConfig]);

  if (status === "loading") {
    return (
      <div className="login-page">
        <div className="org-gate-loading" role="status" aria-live="polite">
          <span className="login-spinner" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="login-page">
        <div className="login-wrapper">
          <div className="login-card org-gate-notfound">
            <h2 className="login-card-heading">Empresa no encontrada</h2>
            <p className="org-gate-notfound-text">
              El link <strong>/{orgSlug}</strong> no corresponde a ninguna empresa dada de alta en el sistema.
              Verifica el link con quien te lo compartió.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />;
}

export default OrgGate;
