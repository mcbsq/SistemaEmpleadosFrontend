// ---------------------------------------------------------
// LOGIN FORM REINFORCED - STABILITY VERSION 2026.01.28
// ---------------------------------------------------------

import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Progress, Table } from "reactstrap";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator, FileSizeValidator } from "use-file-picker/validators";

// --- SERVICIOS PROPIOS ---
import { empleadoService } from "../../services/empleadoService";
import { contactoService } from "../../services/contactoService";

import './Login.css';

const LoginForm = ({ openRegisterModal, onClose }) => {
  // -----------------------------------------
  // ESTADOS DE CONTROL DE UI
  // -----------------------------------------
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [modalEmpleado, setModalEmpleado] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalContactoDir, setModalContactoDir] = useState(false);

  const [alertMessage, setAlertMessage] = useState("");
  const [validations, setValidations] = useState([false, false, false, false]);

  // -----------------------------------------
  // ESTADOS DE DATOS (FORMULARIOS COMPLETOS)
  // -----------------------------------------
  const [formEmpleado, setFormEmpleado] = useState({ 
    id: "", 
    Nombre: "", 
    ApelPaterno: "", 
    ApelMaterno: "", 
    FecNacimiento: "" 
  });

  const [formUsuario, setFormUsuario] = useState({ 
    user: "", 
    password: "" 
  });

  const [formContacto, setFormContacto] = useState({ 
    TelFijo: "", 
    TelCelular: "", 
    IdWhatsApp: "", 
    IdTelegram: "" 
  });

  const [formDireccion, setFormDireccion] = useState({ 
    Calle: "", 
    NumExterior: "", 
    NumInterior: "", 
    Municipio: "", 
    Ciudad: "", 
    CodigoP: "" 
  });

  // -----------------------------------------
  // CONFIGURACIÓN DE SELECTOR DE ARCHIVOS
  // -----------------------------------------
  const { openFilePicker, filesContent, clear } = useFilePicker({
    readAs: "DataURL",
    accept: "image/*",
    multiple: false,
    validators: [
      new FileAmountLimitValidator({ max: 1 }),
      new FileSizeValidator({ maxFileSize: 1024 * 1024 * 2 }) // Ajustado a 2MB
    ],
  });

  // -----------------------------------------
  // LÓGICA DE VALIDACIÓN Y HELPER
  // -----------------------------------------
  const handleInputChange = (e, setter) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: value }));
  };

  const validatePassword = (e) => {
    const pwd = e.target.value;
    setValidations([
      pwd.length >= 5,
      /[A-Z]/.test(pwd),
      /[0-9]/.test(pwd),
      /[$&+,:;=?@#]/.test(pwd)
    ]);
  };

  // -----------------------------------------
  // FLUJO DE PERSISTENCIA (PASO A PASO)
  // -----------------------------------------

  const step1_CrearEmpleado = async () => {
    if (!formEmpleado.Nombre || !formEmpleado.ApelPaterno) {
      alert("⚠️ El nombre y el primer apellido son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        Nombre: formEmpleado.Nombre,
        ApelPaterno: formEmpleado.ApelPaterno,
        ApelMaterno: formEmpleado.ApelMaterno,
        FecNacimiento: formEmpleado.FecNacimiento,
        Fotografia: filesContent.length > 0 ? filesContent[0].content : "",
        depto_id: "Sin Asignar",
        Cargo: "Personal"
      };

      console.log("🚀 Iniciando Step 1: Payload ->", payload);
      
      const response = await fetch("http://localhost:5001/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔥 Error 500 del Servidor:", errorText);
        throw new Error("El servidor falló al crear el empleado.");
      }

      const data = await response.json();
      const generatedId = data._id || data.id;

      if (generatedId) {
        setFormEmpleado(prev => ({ ...prev, id: generatedId }));
        console.log("✅ Empleado creado con éxito ID:", generatedId);
        setModalEmpleado(false);
        setModalUsuario(true);
      } else {
        throw new Error("Respuesta exitosa pero sin ID de objeto.");
      }
    } catch (err) {
      console.error("❌ Error Crítico Step 1:", err);
      alert(`Error en el registro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const step2_CrearUsuario = async () => {
    if (!validations.every(v => v)) {
      setAlertMessage("La contraseña no cumple los requisitos de seguridad.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/usuario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user: formUsuario.user,
          password: formUsuario.password,
          role: "USER", 
          empleado_id: formEmpleado.id 
        }),
      });

      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.message || "Error al crear credenciales.");
      }

      console.log("✅ Usuario vinculado correctamente.");
      setModalUsuario(false);
      setModalContactoDir(true);
    } catch (err) {
      setAlertMessage(err.message || "El nombre de usuario ya existe.");
    } finally {
      setLoading(false);
    }
  };

  const step3_Finalizar = async () => {
    setLoading(true);
    try {
      console.log("📦 Iniciando Step 3 para ID:", formEmpleado.id);

      // 1. Guardar Datos de Contacto (Usando la nueva función createDatos del servicio)
      // Pasamos los teléfonos y el empleado_id
      await contactoService.createDatos({ 
        TelCelular: formContacto.TelCelular,
        TelFijo: formContacto.TelFijo,
        empleado_id: formEmpleado.id 
      });

      // 2. Guardar Redes Sociales (Opcional, si tu backend lo requiere por separado)
      // Si IdWhatsApp o IdTelegram tienen datos, podrías enviarlos aquí
      // await contactoService.createRedes({ ... });
      
      // 3. Guardar Dirección (Fetch Manual)
      const resDir = await fetch(`http://localhost:5001/direccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formDireccion, 
          empleado_id: formEmpleado.id 
        }),
      });

      if (!resDir.ok) throw new Error("Fallo al guardar la dirección física.");

      alert("✨ ¡Proceso de registro maestro finalizado con éxito!");
      clear(); 
      setModalContactoDir(false);
      onClose(); 
    } catch (err) {
      console.error("❌ Error en Step 3:", err);
      alert(`Error en el cierre de registro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openRegisterModal) {
      setModalEmpleado(true);
      setAlertMessage("");
    }
  }, [openRegisterModal]);

  return (
    <div className="login-register-flow">
      {/* MODAL 1: IDENTIDAD */}
      <Modal isOpen={modalEmpleado} centered size="lg" className="cyber-modal" fade={false}>
        <ModalHeader className="border-0 bg-dark text-white">Registro de Identidad - Paso 1</ModalHeader>
        <Progress value="33" className="cyber-progress" />
        <ModalBody className="glass-modal-body">
          <div className="row g-4">
            <div className="col-md-8">
              <Table borderless className="text-white">
                <tbody>
                  <tr>
                    <td>
                      <label>Nombre(s)</label>
                      <input name="Nombre" className="form-control" placeholder="Ej: Juan" onChange={e => handleInputChange(e, setFormEmpleado)}/>
                    </td>
                    <td>
                      <label>Apellido Paterno</label>
                      <input name="ApelPaterno" className="form-control" placeholder="Ej: Pérez" onChange={e => handleInputChange(e, setFormEmpleado)}/>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label>Apellido Materno</label>
                      <input name="ApelMaterno" className="form-control" placeholder="Ej: López" onChange={e => handleInputChange(e, setFormEmpleado)}/>
                    </td>
                    <td>
                      <label>Fecha de Nacimiento</label>
                      <input name="FecNacimiento" type="date" className="form-control" onChange={e => handleInputChange(e, setFormEmpleado)}/>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </div>
            <div className="col-md-4 text-center border-start border-secondary border-opacity-25">
              <div className="upload-section">
                <button className={`btn-upload-circle ${filesContent.length > 0 ? 'success' : ''}`} onClick={openFilePicker}>
                  <i className={filesContent.length > 0 ? "fas fa-check" : "fas fa-camera"}></i>
                  <div className="btn-upload-ring"></div>
                </button>
                <p className="mt-2 small text-secondary text-uppercase">Foto de Perfil</p>
              </div>
              {filesContent.map((f, i) => (
                <img key={i} src={f.content} className="rounded-circle mt-2 shadow-glow" width="100" height="100" style={{objectFit:'cover'}} alt="preview"/>
              ))}
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-0">
          <button className="btn-login-submit" onClick={step1_CrearEmpleado} disabled={loading}>
            {loading ? "Sincronizando con DB..." : "Continuar a Seguridad"}
          </button>
        </ModalFooter>
      </Modal>

      {/* MODAL 2: SEGURIDAD / CUENTA */}
      <Modal isOpen={modalUsuario} centered className="cyber-modal" fade={false}>
        <ModalHeader className="border-0">Configuración de Acceso - Paso 2</ModalHeader>
        <Progress value="66" className="cyber-progress" />
        <ModalBody className="glass-modal-body">
          <div className="mb-3">
            <label>Nombre de Usuario</label>
            <input name="user" className="form-control" placeholder="usuario123" onChange={e => handleInputChange(e, setFormUsuario)}/>
          </div>
          <div className="mb-3">
            <label>Contraseña</label>
            <div className="input-group">
              <input 
                name="password"
                type={showPassword ? "text" : "password"} 
                className="form-control" 
                onChange={e => { handleInputChange(e, setFormUsuario); validatePassword(e); }}
              />
              <button className="btn btn-outline-info" onClick={() => setShowPassword(!showPassword)}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            <div className="password-checklist mt-3">
              <div className={validations[0] ? "text-success" : "text-danger"}>• Mínimo 5 caracteres</div>
              <div className={validations[1] ? "text-success" : "text-danger"}>• Una letra Mayúscula</div>
              <div className={validations[2] ? "text-success" : "text-danger"}>• Un número</div>
              <div className={validations[3] ? "text-success" : "text-danger"}>• Símbolo ($&+,:;=@#)</div>
            </div>
          </div>
          {alertMessage && <div className="alert alert-danger p-2 small border-0 bg-danger bg-opacity-10">{alertMessage}</div>}
        </ModalBody>
        <ModalFooter className="border-0">
          <button className="btn-login-submit" onClick={step2_CrearUsuario} disabled={loading}>Vincular Cuenta</button>
        </ModalFooter>
      </Modal>

      {/* MODAL 3: CONTACTO Y DIRECCIÓN */}
      <Modal isOpen={modalContactoDir} centered size="lg" className="cyber-modal" fade={false}>
        <ModalHeader className="border-0">Información de Contacto - Finalizar</ModalHeader>
        <Progress value="100" className="cyber-progress-success" />
        <ModalBody className="glass-modal-body" style={{maxHeight: '65vh', overflowY: 'auto'}}>
          <h6 className="text-info mb-3"><i className="fas fa-phone-alt me-2"></i>Medios de Comunicación</h6>
          <div className="row g-3 mb-4">
            <div className="col-md-6"><label>Teléfono Celular</label><input name="TelCelular" className="form-control" onChange={e => handleInputChange(e, setFormContacto)}/></div>
            <div className="col-md-6"><label>WhatsApp (ID)</label><input name="IdWhatsApp" className="form-control" onChange={e => handleInputChange(e, setFormContacto)}/></div>
            <div className="col-md-6"><label>Teléfono Fijo</label><input name="TelFijo" className="form-control" onChange={e => handleInputChange(e, setFormContacto)}/></div>
            <div className="col-md-6"><label>Telegram</label><input name="IdTelegram" className="form-control" onChange={e => handleInputChange(e, setFormContacto)}/></div>
          </div>

          <h6 className="text-info mb-3"><i className="fas fa-map-marker-alt me-2"></i>Ubicación Domiciliaria</h6>
          <div className="row g-3">
            <div className="col-md-8"><label>Calle</label><input name="Calle" className="form-control" onChange={e => handleInputChange(e, setFormDireccion)}/></div>
            <div className="col-md-2"><label>Ext.</label><input name="NumExterior" className="form-control" onChange={e => handleInputChange(e, setFormDireccion)}/></div>
            <div className="col-md-2"><label>Int.</label><input name="NumInterior" className="form-control" onChange={e => handleInputChange(e, setFormDireccion)}/></div>
            <div className="col-md-4"><label>Municipio / Delegación</label><input name="Municipio" className="form-control" onChange={e => handleInputChange(e, setFormDireccion)}/></div>
            <div className="col-md-4"><label>Ciudad / Estado</label><input name="Ciudad" className="form-control" onChange={e => handleInputChange(e, setFormDireccion)}/></div>
            <div className="col-md-4"><label>Código Postal</label><input name="CodigoP" className="form-control" onChange={e => handleInputChange(e, setFormDireccion)}/></div>
          </div>
        </ModalBody>
        <ModalFooter className="border-0">
          <button className="btn-login-submit success-glow" onClick={step3_Finalizar} disabled={loading}>
            {loading ? "Guardando Registro Maestro..." : "Completar Registro"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default LoginForm;