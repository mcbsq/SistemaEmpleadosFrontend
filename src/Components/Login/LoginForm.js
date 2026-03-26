// LoginForm.js — Flujo de registro en 3 pasos
import React, { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Progress } from "reactstrap";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator, FileSizeValidator } from "use-file-picker/validators";

import { empleadoService } from "../../services/empleadoService";
import { contactoService }  from "../../services/contactoService";
import { direccionService } from "../../services/direccionService";
import { usuarioService }   from "../../services/usuarioService";

import "./Login.css";

// ─── Componente de alerta inline (reemplaza alert() nativo) ─────────────────
const InlineAlert = ({ message, type = "danger" }) =>
  message ? (
    <div className={`alert alert-${type} p-2 small border-0 bg-${type} bg-opacity-10`} role="alert">
      {message}
    </div>
  ) : null;

// ─── Checklist de contraseña ─────────────────────────────────────────────────
const PasswordChecklist = ({ validations }) => {
  const rules = [
    "Mínimo 5 caracteres",
    "Una letra mayúscula",
    "Un número",
    "Símbolo ($&+,:;=@#)",
  ];
  return (
    <div className="password-checklist mt-3">
      {rules.map((rule, i) => (
        <div key={i} className={validations[i] ? "text-success" : "text-danger"}>
          • {rule}
        </div>
      ))}
    </div>
  );
};

// ─── Helper genérico para inputs controlados ─────────────────────────────────
const useFormState = (initial) => {
  const [form, setForm] = useState(initial);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  return [form, handleChange, setForm];
};

// ════════════════════════════════════════════════════════════════════════════════
const LoginForm = ({ onClose }) => {
  const [step, setStep]           = useState(1); // 1 | 2 | 3
  const [loading, setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert]         = useState({ message: "", type: "danger" });

  const [empleadoId, setEmpleadoId] = useState(null);

  const [formEmpleado, onEmpleadoChange] = useFormState({
    Nombre: "", ApelPaterno: "", ApelMaterno: "", FecNacimiento: "",
  });

  const [formUsuario, onUsuarioChange] = useFormState({ user: "", password: "" });

  const [formContacto, onContactoChange] = useFormState({
    TelFijo: "", TelCelular: "", IdWhatsApp: "", IdTelegram: "",
  });

  const [formDireccion, onDireccionChange] = useFormState({
    Calle: "", NumExterior: "", NumInterior: "",
    Municipio: "", Ciudad: "", CodigoP: "",
  });

  const [validations, setValidations] = useState([false, false, false, false]);

  const { openFilePicker, filesContent, clear } = useFilePicker({
    readAs: "DataURL",
    accept: "image/*",
    multiple: false,
    validators: [
      new FileAmountLimitValidator({ max: 1 }),
      new FileSizeValidator({ maxFileSize: 1024 * 1024 * 2 }),
    ],
  });

  // Limpia la alerta al cambiar de paso
  useEffect(() => { setAlert({ message: "", type: "danger" }); }, [step]);

  const validatePassword = (e) => {
    const pwd = e.target.value;
    setValidations([
      pwd.length >= 5,
      /[A-Z]/.test(pwd),
      /[0-9]/.test(pwd),
      /[$&+,:;=?@#]/.test(pwd),
    ]);
    onUsuarioChange(e);
  };

  // ─── Paso 1: Crear empleado ────────────────────────────────────────────────
  const step1_CrearEmpleado = async () => {
    if (!formEmpleado.Nombre || !formEmpleado.ApelPaterno) {
      setAlert({ message: "El nombre y el primer apellido son obligatorios.", type: "danger" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formEmpleado,
        Fotografia: filesContent[0]?.content ?? "",
        depto_id: "Sin Asignar",
        Cargo: "Personal",
      };

      const data = await empleadoService.create(payload);
      const id   = data._id || data.id;

      if (!id) throw new Error("El servidor no devolvió un ID válido.");

      setEmpleadoId(id);
      setStep(2);
    } catch (err) {
      setAlert({ message: `Error al registrar empleado: ${err.message}`, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso 2: Crear usuario / credenciales ─────────────────────────────────
  const step2_CrearUsuario = async () => {
    if (!validations.every(Boolean)) {
      setAlert({ message: "La contraseña no cumple los requisitos de seguridad.", type: "danger" });
      return;
    }
    if (!formUsuario.user) {
      setAlert({ message: "Ingresa un nombre de usuario.", type: "danger" });
      return;
    }

    setLoading(true);
    try {
      await usuarioService.create({
        user:        formUsuario.user,
        password:    formUsuario.password,
        role:        "USER",
        empleado_id: empleadoId,
      });
      setStep(3);
    } catch (err) {
      setAlert({ message: err.message || "El nombre de usuario ya existe.", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso 3: Contacto + Dirección ─────────────────────────────────────────
  const step3_Finalizar = async () => {
    setLoading(true);
    try {
      await contactoService.createDatos({
        TelCelular:  formContacto.TelCelular,
        TelFijo:     formContacto.TelFijo,
        IdWhatsApp:  formContacto.IdWhatsApp,
        IdTelegram:  formContacto.IdTelegram,
        empleado_id: empleadoId,
      });

      await direccionService.create({
        ...formDireccion,
        empleado_id: empleadoId,
      });

      setAlert({ message: "Registro completado exitosamente.", type: "success" });
      clear();

      // Pequeña pausa para que el usuario vea el mensaje de éxito
      setTimeout(() => { onClose(); }, 1500);
    } catch (err) {
      setAlert({ message: `Error al finalizar el registro: ${err.message}`, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const progress = { 1: 33, 2: 66, 3: 100 }[step];

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="login-register-flow">

      {/* ── MODAL 1: IDENTIDAD ─────────────────────────────────────────────── */}
      <Modal isOpen={step === 1} centered size="lg" className="cyber-modal" fade={false}>
        <ModalHeader className="border-0 bg-dark text-white">
          Registro de Identidad — Paso 1 de 3
        </ModalHeader>
        <Progress value={progress} className="cyber-progress" />
        <ModalBody className="glass-modal-body">
          <div className="row g-4">
            <div className="col-md-8">
              <div className="row g-3">
                {[
                  { name: "Nombre",       label: "Nombre(s)",         placeholder: "Ej: Juan" },
                  { name: "ApelPaterno",  label: "Apellido Paterno",  placeholder: "Ej: Pérez" },
                  { name: "ApelMaterno",  label: "Apellido Materno",  placeholder: "Ej: López" },
                ].map(({ name, label, placeholder }) => (
                  <div key={name} className="col-md-6">
                    <label>{label}</label>
                    <input name={name} className="form-control" placeholder={placeholder} onChange={onEmpleadoChange} />
                  </div>
                ))}
                <div className="col-md-6">
                  <label>Fecha de Nacimiento</label>
                  <input name="FecNacimiento" type="date" className="form-control" onChange={onEmpleadoChange} />
                </div>
              </div>
            </div>

            <div className="col-md-4 text-center border-start border-secondary border-opacity-25">
              <button
                className={`btn-upload-circle ${filesContent.length > 0 ? "success" : ""}`}
                onClick={openFilePicker}
                type="button"
                aria-label="Seleccionar foto de perfil"
              >
                <i className={filesContent.length > 0 ? "fas fa-check" : "fas fa-camera"} />
                <div className="btn-upload-ring" />
              </button>
              <p className="mt-2 small text-secondary text-uppercase">Foto de Perfil</p>
              {filesContent[0] && (
                <img
                  src={filesContent[0].content}
                  className="rounded-circle mt-2"
                  width="100"
                  height="100"
                  style={{ objectFit: "cover" }}
                  alt="Vista previa"
                />
              )}
            </div>
          </div>
          <div className="mt-3">
            <InlineAlert {...alert} />
          </div>
        </ModalBody>
        <ModalFooter className="border-0">
          <button type="button" className="btn btn-outline-secondary me-2" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-login-submit" onClick={step1_CrearEmpleado} disabled={loading}>
            {loading ? "Registrando..." : "Continuar →"}
          </button>
        </ModalFooter>
      </Modal>

      {/* ── MODAL 2: CREDENCIALES ──────────────────────────────────────────── */}
      <Modal isOpen={step === 2} centered className="cyber-modal" fade={false}>
        <ModalHeader className="border-0">Configuración de Acceso — Paso 2 de 3</ModalHeader>
        <Progress value={progress} className="cyber-progress" />
        <ModalBody className="glass-modal-body">
          <div className="mb-3">
            <label>Nombre de Usuario</label>
            <input
              name="user"
              className="form-control"
              placeholder="usuario123"
              onChange={onUsuarioChange}
            />
          </div>
          <div className="mb-3">
            <label>Contraseña</label>
            <div className="input-group">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                onChange={validatePassword}
              />
              <button
                type="button"
                className="btn btn-outline-info"
                aria-label={showPassword ? "Ocultar" : "Mostrar"}
                onClick={() => setShowPassword((v) => !v)}
              >
                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
            <PasswordChecklist validations={validations} />
          </div>
          <InlineAlert {...alert} />
        </ModalBody>
        <ModalFooter className="border-0">
          <button type="button" className="btn btn-outline-secondary me-2" onClick={() => setStep(1)}>
            ← Atrás
          </button>
          <button type="button" className="btn-login-submit" onClick={step2_CrearUsuario} disabled={loading}>
            {loading ? "Vinculando..." : "Vincular Cuenta →"}
          </button>
        </ModalFooter>
      </Modal>

      {/* ── MODAL 3: CONTACTO Y DIRECCIÓN ─────────────────────────────────── */}
      <Modal isOpen={step === 3} centered size="lg" className="cyber-modal" fade={false}>
        <ModalHeader className="border-0">Información de Contacto — Paso 3 de 3</ModalHeader>
        <Progress value={progress} className="cyber-progress-success" />
        <ModalBody className="glass-modal-body" style={{ maxHeight: "65vh", overflowY: "auto" }}>
          <h6 className="text-info mb-3">
            <i className="fas fa-phone-alt me-2" />Medios de Comunicación
          </h6>
          <div className="row g-3 mb-4">
            {[
              { name: "TelCelular", label: "Teléfono Celular", handler: onContactoChange },
              { name: "IdWhatsApp", label: "WhatsApp (ID)",    handler: onContactoChange },
              { name: "TelFijo",    label: "Teléfono Fijo",   handler: onContactoChange },
              { name: "IdTelegram", label: "Telegram",         handler: onContactoChange },
            ].map(({ name, label, handler }) => (
              <div key={name} className="col-md-6">
                <label>{label}</label>
                <input name={name} className="form-control" onChange={handler} />
              </div>
            ))}
          </div>

          <h6 className="text-info mb-3">
            <i className="fas fa-map-marker-alt me-2" />Ubicación Domiciliaria
          </h6>
          <div className="row g-3">
            {[
              { name: "Calle",       label: "Calle",                  col: "col-md-8" },
              { name: "NumExterior", label: "Ext.",                   col: "col-md-2" },
              { name: "NumInterior", label: "Int.",                   col: "col-md-2" },
              { name: "Municipio",   label: "Municipio / Delegación", col: "col-md-4" },
              { name: "Ciudad",      label: "Ciudad / Estado",        col: "col-md-4" },
              { name: "CodigoP",     label: "Código Postal",          col: "col-md-4" },
            ].map(({ name, label, col }) => (
              <div key={name} className={col}>
                <label>{label}</label>
                <input name={name} className="form-control" onChange={onDireccionChange} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <InlineAlert {...alert} />
          </div>
        </ModalBody>
        <ModalFooter className="border-0">
          <button type="button" className="btn btn-outline-secondary me-2" onClick={() => setStep(2)}>
            ← Atrás
          </button>
          <button type="button" className="btn-login-submit success-glow" onClick={step3_Finalizar} disabled={loading}>
            {loading ? "Guardando..." : "Completar Registro"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default LoginForm;