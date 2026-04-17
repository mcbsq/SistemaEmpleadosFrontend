import React, { useState, useEffect } from "react";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator, FileSizeValidator } from "use-file-picker/validators";

import { empleadoService } from "../../services/empleadoService";
import { contactoService }  from "../../services/contactoService";
import { direccionService } from "../../services/direccionService";
import { usuarioService }   from "../../services/usuarioService";

// ─── Validaciones de contraseña ───────────────────────────────────────────────
const PWD_RULES = [
  { label: "Mínimo 5 caracteres",    test: (p) => p.length >= 5 },
  { label: "Una letra mayúscula",    test: (p) => /[A-Z]/.test(p) },
  { label: "Un número",              test: (p) => /[0-9]/.test(p) },
  { label: "Símbolo ($&+,:;=@#)",   test: (p) => /[$&+,:;=?@#]/.test(p) },
];

// ─── Helper: input controlado ─────────────────────────────────────────────────
const useFormState = (initial) => {
  const [form, setForm] = useState(initial);
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  return [form, onChange, setForm];
};

// ─── Campo genérico de formulario ─────────────────────────────────────────────
const RegField = ({ label, name, type = "text", placeholder = "", onChange, autoComplete, col = "col-6" }) => (
  <div className={`rf-field ${col}`}>
    <label className="rf-label">{label}</label>
    <input
      name={name}
      type={type}
      className="rf-input"
      placeholder={placeholder}
      onChange={onChange}
      autoComplete={autoComplete}
    />
  </div>
);

// ─── Barra de progreso de pasos ────────────────────────────────────────────────
const StepBar = ({ current, total = 3 }) => (
  <div className="rf-steps">
    {Array.from({ length: total }, (_, i) => i + 1).map(n => (
      <React.Fragment key={n}>
        <div className={`rf-step ${n < current ? "done" : n === current ? "active" : ""}`}>
          {n < current ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ) : n}
        </div>
        {n < total && <div className={`rf-step-line ${n < current ? "done" : ""}`} />}
      </React.Fragment>
    ))}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
function LoginForm({ onClose }) {
  const [step,        setStep]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [alert,       setAlert]       = useState({ msg: "", ok: false });
  const [showPass,    setShowPass]    = useState(false);
  const [empleadoId,  setEmpleadoId]  = useState(null);
  const [pwdChecks,   setPwdChecks]   = useState(PWD_RULES.map(() => false));

  const [formEmp,  onEmpChange]  = useFormState({ Nombre:"", ApelPaterno:"", ApelMaterno:"", FecNacimiento:"" });
  const [formUser, onUserChange, setFormUser] = useFormState({ user:"", password:"" });
  const [formCont, onContChange] = useFormState({ TelFijo:"", TelCelular:"", IdWhatsApp:"", IdTelegram:"" });
  const [formDir,  onDirChange]  = useFormState({ Calle:"", NumExterior:"", NumInterior:"", Municipio:"", Ciudad:"", CodigoP:"" });

  const { openFilePicker, filesContent, clear } = useFilePicker({
    readAs: "DataURL", accept: "image/*", multiple: false,
    validators: [new FileAmountLimitValidator({ max: 1 }), new FileSizeValidator({ maxFileSize: 2 * 1024 * 1024 })],
  });

  useEffect(() => { setAlert({ msg: "", ok: false }); }, [step]);

  const validatePwd = (e) => {
    const p = e.target.value;
    setPwdChecks(PWD_RULES.map(r => r.test(p)));
    onUserChange(e);
  };

  // ─── Paso 1 ─────────────────────────────────────────────────────────────────
  const step1 = async () => {
    if (!formEmp.Nombre || !formEmp.ApelPaterno) {
      setAlert({ msg: "El nombre y el primer apellido son obligatorios.", ok: false });
      return;
    }
    setLoading(true);
    try {
      const payload = { ...formEmp, Fotografia: filesContent[0]?.content ?? "", depto_id: "Sin Asignar", Cargo: "Personal" };
      const data = await empleadoService.create(payload);
      const id   = data._id || data.id;
      if (!id) throw new Error("El servidor no devolvió un ID válido.");
      setEmpleadoId(id);
      setStep(2);
    } catch (err) {
      setAlert({ msg: `Error al registrar: ${err.message}`, ok: false });
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso 2 ─────────────────────────────────────────────────────────────────
  const step2 = async () => {
    if (!pwdChecks.every(Boolean)) {
      setAlert({ msg: "La contraseña no cumple los requisitos de seguridad.", ok: false });
      return;
    }
    if (!formUser.user) {
      setAlert({ msg: "Ingresa un nombre de usuario.", ok: false });
      return;
    }
    setLoading(true);
    try {
      await usuarioService.create({ user: formUser.user, password: formUser.password, role: "EMPLOYEE", empleado_id: empleadoId });
      setStep(3);
    } catch (err) {
      setAlert({ msg: err.message || "El nombre de usuario ya existe.", ok: false });
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso 3 ─────────────────────────────────────────────────────────────────
  const step3 = async () => {
    setLoading(true);
    try {
      await contactoService.createDatos({ ...formCont, empleado_id: empleadoId });
      await direccionService.create({ ...formDir, empleado_id: empleadoId });
      setAlert({ msg: "Cuenta creada correctamente.", ok: true });
      clear();
      setTimeout(() => onClose(), 1600);
    } catch (err) {
      setAlert({ msg: `Error al finalizar: ${err.message}`, ok: false });
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { label: "Identidad",    handler: step1, back: null },
    { label: "Credenciales", handler: step2, back: () => setStep(1) },
    { label: "Contacto",     handler: step3, back: () => setStep(2) },
  ];

  const current = STEPS[step - 1];

  return (
    <div className="rf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rf-modal" role="dialog" aria-modal="true" aria-label={`Registro — paso ${step} de 3`}>

        {/* Header */}
        <div className="rf-header">
          <div className="rf-header-top">
            <span className="rf-header-title">Crear cuenta</span>
            <button className="rf-close-btn" onClick={onClose} aria-label="Cerrar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <StepBar current={step} />
          <p className="rf-step-label">{`Paso ${step} de 3 — ${current.label}`}</p>
        </div>

        {/* Body */}
        <div className="rf-body">

          {/* ── PASO 1: Identidad ────────────────────────────────────────── */}
          {step === 1 && (
            <div className="rf-section">
              <div className="rf-avatar-zone">
                <button
                  type="button"
                  className={`rf-avatar-btn ${filesContent.length > 0 ? "has-photo" : ""}`}
                  onClick={openFilePicker}
                  aria-label="Seleccionar foto de perfil"
                >
                  {filesContent[0] ? (
                    <img src={filesContent[0].content} alt="Vista previa" className="rf-avatar-preview" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  )}
                  <div className="rf-avatar-ring" aria-hidden="true" />
                </button>
                <p className="rf-avatar-hint">Foto de perfil <span>(opcional)</span></p>
              </div>

              <div className="rf-grid">
                <RegField label="Nombre(s) *"       name="Nombre"       placeholder="Ej: Juan"   onChange={onEmpChange} col="col-12" />
                <RegField label="Apellido Paterno *" name="ApelPaterno"  placeholder="Ej: Pérez"  onChange={onEmpChange} />
                <RegField label="Apellido Materno"   name="ApelMaterno"  placeholder="Ej: López"  onChange={onEmpChange} />
                <RegField label="Fecha de Nacimiento" name="FecNacimiento" type="date" onChange={onEmpChange} />
              </div>
            </div>
          )}

          {/* ── PASO 2: Credenciales ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="rf-section">
              <RegField label="Nombre de usuario *" name="user" placeholder="usuario123" onChange={onUserChange} autoComplete="username" col="col-12" />

              <div className="rf-field col-12">
                <label className="rf-label">Contraseña *</label>
                <div className="rf-pwd-wrap">
                  <input
                    name="password"
                    type={showPass ? "text" : "password"}
                    className="rf-input"
                    placeholder="••••••••"
                    onChange={validatePwd}
                    autoComplete="new-password"
                  />
                  <button type="button" className="rf-pwd-toggle" onClick={() => setShowPass(v => !v)} aria-label="Mostrar/ocultar contraseña">
                    {showPass ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="rf-checklist">
                {PWD_RULES.map((r, i) => (
                  <div key={i} className={`rf-check-item ${pwdChecks[i] ? "ok" : ""}`}>
                    <span className="rf-check-dot" />
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 3: Contacto ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="rf-section">
              <p className="rf-section-title">Medios de contacto</p>
              <div className="rf-grid">
                <RegField label="Teléfono Celular" name="TelCelular" type="tel" onChange={onContChange} />
                <RegField label="WhatsApp"         name="IdWhatsApp"            onChange={onContChange} />
                <RegField label="Teléfono Fijo"    name="TelFijo"    type="tel" onChange={onContChange} />
                <RegField label="Telegram"         name="IdTelegram"            onChange={onContChange} />
              </div>

              <p className="rf-section-title" style={{ marginTop: 20 }}>Domicilio</p>
              <div className="rf-grid">
                <RegField label="Calle"                name="Calle"       onChange={onDirChange} col="col-8" />
                <RegField label="Núm. Ext."            name="NumExterior" onChange={onDirChange} col="col-4" />
                <RegField label="Núm. Int."            name="NumInterior" onChange={onDirChange} col="col-4" />
                <RegField label="Municipio"            name="Municipio"   onChange={onDirChange} col="col-8" />
                <RegField label="Ciudad / Estado"      name="Ciudad"      onChange={onDirChange} />
                <RegField label="Código Postal"        name="CodigoP"     onChange={onDirChange} />
              </div>
            </div>
          )}

          {/* Alerta */}
          {alert.msg && (
            <div className={`rf-alert ${alert.ok ? "rf-alert--ok" : "rf-alert--err"}`}>
              {alert.ok ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )}
              {alert.msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rf-footer">
          {current.back && (
            <button type="button" className="rf-btn-back" onClick={current.back} disabled={loading}>
              ← Atrás
            </button>
          )}
          <button
            type="button"
            className="rf-btn-next"
            onClick={current.handler}
            disabled={loading}
            style={{ marginLeft: current.back ? 0 : "auto" }}
          >
            {loading && <span className="rf-spinner" aria-hidden="true" />}
            {loading ? "Procesando..." : step < 3 ? "Continuar →" : "Completar registro"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;