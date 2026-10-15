import React, { useState } from "react";
import { API_URL } from "../../services/apiConfig";

const MENSAJE = "Recibimos tu solicitud. El equipo revisará los datos y te indicará los siguientes pasos por correo.";

export default function SolicitarAcceso() {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [contacto, setContacto] = useState("");
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setEstado(null);
    try {
      const res = await fetch(`${API_URL}/public/access-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa, contacto, correo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 202) setEstado({ ok: true, texto: data.message || MENSAJE });
      else setEstado({ ok: false, texto: data.error || "No se pudo registrar la solicitud." });
    } catch {
      setEstado({ ok: false, texto: "El registro de solicitudes no está disponible." });
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) {
    return (
      <button type="button" className="login-btn-recovery" onClick={() => setAbierto(true)}>
        Solicitar acceso
      </button>
    );
  }

  return (
    <div className="login-recovery-form">
      <p className="login-recovery-text">¿Qué necesitas?</p>
      <button type="button" className="login-btn-recovery" onClick={() => setModo("nueva")}>
        Registrar una empresa nueva
      </button>
      <button type="button" className="login-btn-recovery" onClick={() => setModo("existente")}>
        Ya pertenezco a una empresa
      </button>

      {modo === "existente" && (
        <p className="login-recovery-text">
          Pide a la persona que administra tu empresa que te invite, o abre el enlace de invitación
          que te enviaron. Conocer el nombre o el dominio de la empresa no da acceso.
        </p>
      )}

      {modo === "nueva" && (
        <form onSubmit={enviar}>
          <p className="login-recovery-text">
            Deja tus datos. El equipo los revisará y te escribirá. Esta solicitud no crea la empresa ni una contraseña.
          </p>
          <input className="login-input" aria-label="Nombre de la empresa" placeholder="Nombre de la empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} required />
          <input className="login-input" aria-label="Tu nombre" placeholder="Tu nombre" value={contacto} onChange={e => setContacto(e.target.value)} required />
          <input className="login-input" aria-label="Correo" type="email" placeholder="Correo de contacto" value={correo} onChange={e => setCorreo(e.target.value)} required />
          {estado && (
            <div className={estado.ok ? "login-recovery-info" : "login-error"} role={estado.ok ? "status" : "alert"}>
              <span>{estado.texto}</span>
            </div>
          )}
          {!estado?.ok && (
            <button type="submit" className="login-btn-primary" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar solicitud"}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
