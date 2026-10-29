import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/apiConfig";
import { authService } from "../services/authService";

export default function SolicitudesAcceso() {
  const [filas, setFilas] = useState([]);
  const [error, setError] = useState("");
  const [nota, setNota] = useState({});
  const [ids, setIds] = useState({});

  const cargar = useCallback(async () => {
    if (!authService.isPlataforma()) return;
    try {
      setFilas(await apiFetch("/admin/access-requests"));
      setError("");
    } catch (e) {
      setError(e.message || "No se pudieron cargar las solicitudes.");
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  if (!authService.isPlataforma()) return null;

  const resolver = async (id, estado) => {
    const extra = ids[id] || {};
    await apiFetch(`/admin/access-requests/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({
        estado,
        nota: nota[id] || "",
        identificadores: estado === "aprobada" ? extra : {},
      }),
    });
    await cargar();
  };

  return (
    <section style={{ marginTop: 28 }}>
      <h3 className="hr-title">Solicitudes de acceso</h3>
      <p className="hr-subtitle">
        Marcar una solicitud no crea la empresa ni el acceso. El alta se hace en la consola de Aegis
        y aquí solo se archivan los identificadores ya confirmados.
      </p>
      {error && <p className="cm-error" role="alert">{error}</p>}
      {filas.length === 0 ? <p className="rc-empty">No hay solicitudes.</p> : filas.map(fila => (
        <article key={fila.id} className="tn-card" style={{ marginBottom: 12 }}>
          <header className="tn-card-head">
            <div>
              <h3>{fila.empresa}</h3>
              <span>{fila.contacto} · {fila.correo}</span>
            </div>
            <span className="rc-badge">{fila.estado}</span>
          </header>
          {fila.estado !== "aprobada" && fila.estado !== "rechazada" && (
            <div className="field-grid">
              <input className="field-input" placeholder="UUID de empresa en Aegis" aria-label="UUID de empresa"
                value={(ids[fila.id] || {}).aegis_tenant_id || ""}
                onChange={e => setIds(v => ({ ...v, [fila.id]: { ...(v[fila.id] || {}), aegis_tenant_id: e.target.value } }))} />
              <input className="field-input" placeholder="UUID de usuario en Aegis" aria-label="UUID de usuario"
                value={(ids[fila.id] || {}).aegis_user_id || ""}
                onChange={e => setIds(v => ({ ...v, [fila.id]: { ...(v[fila.id] || {}), aegis_user_id: e.target.value } }))} />
              <input className="field-input" placeholder="Clave textual de empresa" aria-label="Clave de empresa"
                value={(ids[fila.id] || {}).org_id || ""}
                onChange={e => setIds(v => ({ ...v, [fila.id]: { ...(v[fila.id] || {}), org_id: e.target.value } }))} />
              <input className="field-input" placeholder="Nota de la revisión" aria-label="Nota"
                value={nota[fila.id] || ""} onChange={e => setNota(v => ({ ...v, [fila.id]: e.target.value }))} />
              <button type="button" className="login-btn-recovery" onClick={() => resolver(fila.id, "en_revision")}>Marcar en revisión</button>
              <button type="button" className="login-btn-primary" onClick={() => resolver(fila.id, "aprobada")}>Registrar resolución</button>
              <button type="button" className="login-btn-recovery" onClick={() => resolver(fila.id, "rechazada")}>Rechazar</button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
