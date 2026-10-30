// "¿Olvidaste tu contraseña?" — pop-up en tres pasos, al estilo Google:
//   1. correo → el sistema manda un código de 6 dígitos
//   2. código → confirma que el correo es tuyo
//   3. contraseña nueva (y la empresa, solo si el correo tiene cuenta en
//      varias) → Aegis restablece la cuenta y queda la contraseña elegida.
// Backend: api/login/recuperacion.py (POST /recuperar/codigo|verificar|confirmar).
import React, { useEffect, useState } from "react";
import { FiMail, FiCheckCircle } from "react-icons/fi";
import Modal from "../Modal";
import { apiFetch } from "../../services/apiConfig";

const REGLAS = [
  { texto: "Al menos 12 caracteres", ok: v => v.length >= 12 },
  { texto: "Una letra mayúscula", ok: v => /[A-Z]/.test(v) },
  { texto: "Una letra minúscula", ok: v => /[a-z]/.test(v) },
  { texto: "Un número", ok: v => /\d/.test(v) },
  { texto: "Un símbolo (!@#$%…)", ok: v => /[^A-Za-z0-9]/.test(v) },
];

const SUBTITULOS = {
  correo: "Escribe el correo de tu cuenta y te enviaremos un código para confirmar que eres tú.",
  codigo: "Revisa tu correo (y la carpeta de spam) y escribe el código de 6 dígitos.",
  nueva: "Elige tu contraseña nueva.",
  listo: "",
};

export default function RecuperarContrasena({ abierto, onClose, correoInicial = "", onListo }) {
  const [paso, setPaso] = useState("correo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [token, setToken] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [orgId, setOrgId] = useState("");
  const [nueva, setNueva] = useState("");
  const [nueva2, setNueva2] = useState("");
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  // Al abrir, empezar de cero (y con el correo que ya escribió en el login).
  useEffect(() => {
    if (!abierto) return;
    setPaso("correo"); setEmail(correoInicial.includes("@") ? correoInicial : ""); setCodigo("");
    setToken(""); setEmpresas([]); setOrgId(""); setNueva(""); setNueva2(""); setAviso(""); setError("");
  }, [abierto, correoInicial]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const llamar = async (ruta, cuerpo) => {
    setEnviando(true); setError("");
    try {
      return await apiFetch(ruta, { method: "POST", body: JSON.stringify(cuerpo) });
    } catch (e) {
      setError(e.message || "No se pudo conectar. Revisa tu internet.");
      return null;
    } finally {
      setEnviando(false);
    }
  };

  const pedirCodigo = async () => {
    const r = await llamar("/recuperar/codigo", { email: email.trim(), org_id: sessionStorage.getItem("entry_org_slug") || undefined });
    if (!r) return;
    setAviso(r.message); setEspera(r.reenviar_en || 60); setCodigo(""); setPaso("codigo");
  };

  const verificar = async () => {
    const r = await llamar("/recuperar/verificar", { email: email.trim(), codigo });
    if (!r) return;
    setToken(r.token);
    setEmpresas(r.empresas || []);
    setOrgId(r.empresas?.length === 1 ? r.empresas[0].org_id : "");
    setPaso("nueva");
  };

  const reglasOk = REGLAS.every(r => r.ok(nueva));
  const confirmar = async () => {
    const r = await llamar("/recuperar/confirmar", { token, org_id: orgId, nueva });
    if (!r) return;
    setAviso(r.message); setPaso("listo");
    onListo?.(r.usuario || email.trim());
  };

  const config = {
    correo: { onGuardar: pedirCodigo, label: "Enviar código", puede: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) },
    codigo: { onGuardar: verificar, label: "Verificar código", puede: codigo.length === 6 },
    nueva:  { onGuardar: confirmar, label: "Guardar contraseña", puede: reglasOk && nueva === nueva2 && (empresas.length <= 1 || !!orgId) },
    listo:  { onGuardar: onClose, label: "Ir a iniciar sesión", puede: true },
  }[paso];

  return (
    <Modal abierto={abierto} onClose={onClose} ancho={440}
      titulo={paso === "listo" ? "Contraseña actualizada" : "Recuperar contraseña"}
      subtitulo={SUBTITULOS[paso]}
      onGuardar={config.onGuardar} labelGuardar={config.label} puedeGuardar={config.puede}
      guardando={enviando} error={error}>
      {paso === "correo" && (
        <div className="field-row">
          <label className="field-label" htmlFor="rec-correo">Correo</label>
          <input id="rec-correo" className="field-input" type="email" autoComplete="username" placeholder="correo@empresa.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
      )}

      {paso === "codigo" && (
        <>
          <p className="rec-aviso"><FiMail aria-hidden="true" /> {aviso || "Te enviamos un código."} <strong>{email.trim()}</strong></p>
          <div className="field-row">
            <label className="field-label" htmlFor="rec-codigo">Código</label>
            <input id="rec-codigo" className="field-input rec-codigo" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} placeholder="000000" value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="rec-acciones">
            <button type="button" className="rec-link" onClick={() => { setPaso("correo"); setError(""); }}>Cambiar correo</button>
            <button type="button" className="rec-link" disabled={espera > 0 || enviando} onClick={pedirCodigo}>
              {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
            </button>
          </div>
        </>
      )}

      {paso === "nueva" && (
        <>
          {empresas.length > 1 && (
            <div className="field-row">
              <label className="field-label" htmlFor="rec-empresa">¿De qué empresa es la cuenta?</label>
              <select id="rec-empresa" className="field-input" value={orgId} onChange={e => setOrgId(e.target.value)}>
                <option value="">Elige la empresa</option>
                {empresas.map(e => <option key={e.org_id} value={e.org_id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="field-row">
            <label className="field-label" htmlFor="rec-nueva">Contraseña nueva</label>
            <input id="rec-nueva" className="field-input" type="password" autoComplete="new-password"
              value={nueva} onChange={e => setNueva(e.target.value)} />
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="rec-nueva2">Confírmala</label>
            <input id="rec-nueva2" className="field-input" type="password" autoComplete="new-password"
              value={nueva2} onChange={e => setNueva2(e.target.value)} />
          </div>
          <ul className="login-password-rules" aria-live="polite">
            {[...REGLAS, { texto: "Las dos coinciden", ok: v => !!v && v === nueva2 }].map(r => (
              <li key={r.texto} className={`login-rule ${r.ok(nueva) ? "login-rule--ok" : ""}`}>
                <span className="login-rule-dot" aria-hidden="true" />{r.texto}
              </li>
            ))}
          </ul>
        </>
      )}

      {paso === "listo" && (
        <p className="rec-aviso rec-aviso--ok"><FiCheckCircle aria-hidden="true" /> {aviso} Por seguridad cerramos las sesiones que tenías abiertas.</p>
      )}
    </Modal>
  );
}
