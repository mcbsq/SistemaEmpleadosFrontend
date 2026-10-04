// src/Components/ContactoRH.jsx
// "Escribir a RH" — pop-up global para que el empleado pida una corrección,
// una constancia o pregunte algo, sin salir de su perfil. Se abre con
// abrirContactoRH({ tipo, seccion }) desde cualquier parte (botón del perfil,
// nota "Lo administra RH" de cada sección…), ya con el tema pre-elegido.
import React, { useEffect, useState } from "react";
import IconButton from "./IconButton";
import { FiSend, FiCheckCircle } from "react-icons/fi";
import Modal from "./Modal";
import {
  solicitudesRhService, TIPOS_SOLICITUD, SECCIONES_SOLICITUD, ABRIR_CONTACTO_RH, SOLICITUD_RH_CREADA,
} from "../services/solicitudesRhService";

export default function ContactoRH() {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("duda");
  const [seccion, setSeccion] = useState("otro");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    const abrir = (e) => {
      setTipo(e.detail?.tipo || "duda");
      setSeccion(e.detail?.seccion || "otro");
      setMensaje(""); setError(""); setEnviado(false);
      setAbierto(true);
    };
    window.addEventListener(ABRIR_CONTACTO_RH, abrir);
    return () => window.removeEventListener(ABRIR_CONTACTO_RH, abrir);
  }, []);

  const enviar = async () => {
    setEnviando(true); setError("");
    try {
      await solicitudesRhService.crear({ tipo, seccion, mensaje });
      setEnviado(true);
      window.dispatchEvent(new Event(SOLICITUD_RH_CREADA));
    } catch (e) {
      setError(e.campos ? Object.values(e.campos)[0] : (e.message || "No se pudo enviar."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto={abierto} onClose={() => setAbierto(false)} titulo={enviado ? "Mensaje enviado" : "Escribir a Recursos Humanos"}
      subtitulo={enviado ? undefined : "RH recibe tu mensaje al instante y te avisa aquí mismo cuando responda."}
      onGuardar={enviado ? undefined : enviar} guardando={enviando} labelGuardar="Enviar a RH" iconGuardar={FiSend}
      error={error} puedeGuardar={mensaje.trim().length >= 5}>
      {enviado ? (
        <div className="crh-ok">
          <FiCheckCircle aria-hidden="true" />
          <p>Listo. Puedes ver el seguimiento en tu perfil, pestaña <strong>Solicitudes</strong>.</p>
          <IconButton accion="confirmar" label="Cerrar" onClick={() => setAbierto(false)} />
        </div>
      ) : (
        <>
          <span className="field-label">¿Qué necesitas?</span>
          <div className="mdl-chips" role="radiogroup" aria-label="Tipo de solicitud">
            {TIPOS_SOLICITUD.map(t => (
              <button key={t.value} type="button" role="radio" aria-checked={tipo === t.value}
                className={`rc-chip${tipo === t.value ? " is-on" : ""}`} onClick={() => setTipo(t.value)}>{t.label}</button>
            ))}
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="crh-seccion">Sobre</label>
            <select id="crh-seccion" className="field-input" value={seccion} onChange={e => setSeccion(e.target.value)}>
              {SECCIONES_SOLICITUD.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="crh-msg">Mensaje</label>
            <textarea id="crh-msg" className="field-textarea" maxLength={2000} value={mensaje}
              placeholder={tipo === "correccion" ? "Ej. Mi RFC tiene un error en la homoclave; el correcto es…" : "Escribe tu mensaje para RH"}
              onChange={e => setMensaje(e.target.value)} />
            <span className="field-hint" style={{ textAlign: "right" }}>{mensaje.length}/2000</span>
          </div>
        </>
      )}
    </Modal>
  );
}
