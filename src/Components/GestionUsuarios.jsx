// src/Components/GestionUsuarios.jsx
// SUPER_ADMIN — panel de cuentas del sistema. La contraseña definitiva de
// una persona nunca es visible. La TEMPORAL (la que genera Aegis al dar de
// alta o al restablecer) sí se puede volver a consultar mientras la persona
// no la cambie, para entregársela; cada consulta y cada reseteo quedan en la
// auditoría (quién y cuándo, nunca el valor).
import { confirmar, avisar } from "../services/dialogo";
import React, { useState, useEffect, useCallback } from "react";
import { FiUsers, FiRefreshCw, FiAlertTriangle, FiSmartphone, FiKey } from "react-icons/fi";
import { usuarioService } from "../services/usuarioService";
import { apiFetch } from "../services/apiConfig";
import { roleLabel } from "../utils/roleLabels";
import { RecordCard } from "./RecordCard";
import IconButton from "./IconButton";

function getId(item) { return item?._id?.$oid || item?._id || ""; }

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reseteando, setReseteando] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usuarioService.getAll().catch(() => []);
      setUsuarios(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Si alguien pierde su teléfono: sus celulares dejan de entrar a la app con
  // Face ID / huella y tendrán que volver a escribir la contraseña.
  const desvincular = async (u) => {
    if (!(await confirmar(`¿Desvincular los celulares de "${u.user}"? Tendrá que volver a escribir su contraseña en la app.`))) return;
    setError("");
    try {
      const r = await apiFetch(`/usuario/${getId(u)}/dispositivos`, { method: "DELETE" });
      await avisar({ titulo: "Celulares desvinculados", mensaje: r.desvinculados ? `Se desvincularon ${r.desvinculados} celular(es).` : "Esta cuenta no tenía celulares vinculados." });
    } catch (e) {
      setError(e.message || "No se pudieron desvincular los celulares.");
    }
  };

  const mostrarTemporal = (titulo, user, temp, enviado) => avisar({
    titulo, copiable: temp,
    mensaje: `Contraseña temporal de ${user}${enviado ? " (también se envió a su correo)" : ""}. `
      + "Deberá cambiarla en su primer inicio de sesión; mientras no lo haga, puedes volver a verla aquí.",
  });

  const verTemporal = async (u) => {
    const id = getId(u);
    setViendo(id); setError("");
    try {
      const r = await apiFetch(`/usuario/${id}/temporal`);
      await mostrarTemporal("Contraseña temporal", u.user, r.temp_password, false);
    } catch (e) {
      setError(e.message || "No se pudo consultar la contraseña temporal.");
    } finally {
      setViendo(null);
    }
  };

  const restablecer = async (u) => {
    const id = getId(u);
    if (!(await confirmar(`¿Restablecer la contraseña de "${u.user}"? Se generará una nueva contraseña temporal y la actual dejará de funcionar.`))) return;
    setReseteando(id);
    setError("");
    try {
      const res = await usuarioService.update(id, { password: "__reset__" });
      if (res?.temp_password) await mostrarTemporal("Contraseña restablecida", u.user, res.temp_password, res.email_sent);
      else await avisar({ titulo: res?.recovery_email_sent ? "Enlace de recuperación enviado" : "Contraseña restablecida", mensaje: res?.message || "Listo." });
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo restablecer la contraseña.");
    } finally {
      setReseteando(null);
    }
  };

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiUsers style={{ marginRight: 8, verticalAlign: "-3px" }} />Cuentas del sistema</h2>
          <p className="hr-subtitle">
            Usuarios, rol y estado de la identidad en Aegis · SUPER_ADMIN. Las contraseñas definitivas nunca son
            visibles; la temporal se puede consultar hasta que la persona la cambie.
          </p>
        </div>
      </div>

      {error && (
        <p className="orgs-desc" style={{ color: "var(--hr-danger, #e86b5f)", marginBottom: 10 }}>
          <FiAlertTriangle style={{ verticalAlign: "-2px", marginRight: 4 }} />{error}
        </p>
      )}

      {loading ? (
        <div className="orgs-monitor-loading"><div className="hr-spinner" /><span>Cargando…</span></div>
      ) : usuarios.length === 0 ? (
        <div className="orgs-monitor-empty">
          <span className="orgs-monitor-empty-icon"><FiUsers /></span>
          <p>Sin usuarios registrados todavía.</p>
        </div>
      ) : (
        <div className="rc-grid rc-grid--ancho mo-stagger">
          {usuarios.map(u => {
            const id = getId(u);
            const aegis = u.aegis;
            const inactiva = aegis?.is_active === false;
            const tono = inactiva || aegis === null ? "danger" : aegis?.must_change_password ? "warning" : "success";
            const estado = inactiva ? "Inactiva" : aegis === null ? "Sin Aegis" : aegis?.must_change_password ? "Clave temporal" : "Activa";
            return (
              <RecordCard key={id} tono={tono}
                tile={<span className="rc-tile-big">{(u.user || "?").slice(0, 2).toUpperCase()}</span>}
                titulo={u.user}
                badge={<span className={`rc-badge rc-badge--${tono}`}>{estado}</span>}
                meta={<><span>{roleLabel(u.role)}</span>{u.email && <span className="rc-meta-trunc" title={u.email}>{u.email}</span>}</>}
                acciones={<>
                  {u.tiene_temporal && (
                    <IconButton icon={FiKey} label="Ver contraseña temporal" tooltipPos="left"
                      busy={viendo === id} disabled={viendo === id} onClick={() => verTemporal(u)} />
                  )}
                  <IconButton icon={FiSmartphone} label="Desvincular celulares (Face ID / huella)" tooltipPos="left" onClick={() => desvincular(u)} />
                  <IconButton icon={FiRefreshCw} label="Restablecer contraseña" tooltipPos="left"
                    busy={reseteando === id} disabled={reseteando === id} onClick={() => restablecer(u)} />
                </>} />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GestionUsuarios;
