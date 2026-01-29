import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./Personal.css";

// Iconos e UI
import { CiFacebook, CiLinkedin, CiYoutube } from "react-icons/ci";
import { FaInstagram, FaTiktok } from "react-icons/fa";
import TextareaAutosize from "react-textarea-autosize";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator } from "use-file-picker/validators";

// Servicios (Arquitectura centralizada)
import { empleadoService } from "../services/empleadoService";
import { contactoService } from "../services/contactoService";
import { educacionService } from "../services/educacionService";
import { rhService } from "../services/rhService"; 
import { expedienteService } from "../services/expedienteService";

function Personal() {
  const { id } = useParams();
  const empleadoId = id?.trim();

  // --- ESTADOS DE DATOS ---
  const [empleado, setEmpleado] = useState(null);
  const [datosContacto, setDatosContacto] = useState({ telefonoF: "", telefonoC: "", IDwhatsapp: "", IDtelegram: "", correo: "" });
  const [personalContacto, setPersonalContacto] = useState({ parenstesco: "", nombreContacto: "", telefonoContacto: "", correoContacto: "", direccionContacto: "" });
  const [redesSociales, setRedesSociales] = useState([]);
  const [educacion, setEducacion] = useState({ descripcion: "", items: [], experiencia: [], habilidades: [] });
  const [rh, setRh] = useState({ Puesto: "", JefeInmediato: "", HorarioLaboral: { HoraEntrada: "", HoraSalida: "", TiempoComida: "", DiasTrabajados: "" }, ExpedienteDigitalPDF: null });
  const [expediente, setExpediente] = useState({ tipoSangre: "", Padecimientos: "", NumeroSeguroSocial: "", Datossegurodegastos: "", PDFSegurodegastosmedicos: null });

  // --- UI STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);

  // --- CONFIGURACIÓN DE ARCHIVOS ---
  const { openFilePicker: openClinicoPicker, filesContent: clinicoFiles } = useFilePicker({
    readAs: "DataURL", accept: "pdf/*", validators: [new FileAmountLimitValidator({ max: 1 })],
  });

  const { openFilePicker: openRHPicker, filesContent: rhFiles } = useFilePicker({
    readAs: "DataURL", accept: "pdf/*", validators: [new FileAmountLimitValidator({ max: 1 })],
  });

  // --- CARGA DE DATOS (SERVICIOS) ---
  const cargarPerfil = useCallback(async () => {
    try {
      const [emp, dc, pc, rs, ed, rhData, clin] = await Promise.all([
        empleadoService.getById(empleadoId),
        contactoService.getDatosByEmpleado(empleadoId),
        contactoService.getPersonasByEmpleado(empleadoId),
        contactoService.getRedesByEmpleado(empleadoId),
        educacionService.getByEmpleado(empleadoId),
        rhService.getByEmpleado(empleadoId),
        expedienteService.getByEmpleado(empleadoId)
      ]);

      setEmpleado(emp);
      if (dc) setDatosContacto({ telefonoF: dc.TelFijo, telefonoC: dc.TelCelular, IDwhatsapp: dc.IdWhatsApp, IDtelegram: dc.IdTelegram, correo: dc.ListaCorreos });
      if (pc) setPersonalContacto(pc);
      if (rs) setRedesSociales(rs[0]?.RedesSociales || []);
      if (ed) setEducacion({
        descripcion: ed.Descripcion || "",
        items: ed.Educacion?.map(i => ({ year: i.Fecha, title: i.Titulo, description: i.Descripcion })) || [],
        experiencia: ed.Experiencia?.map(i => ({ year: i.Fecha, title: i.Titulo, description: i.Description })) || [],
        habilidades: ed.Habilidades?.Programacion?.map(i => ({ skillName: i.Titulo, porcentaje: i.Porcentaje })) || []
      });
      if (rhData) setRh(rhData);
      if (clin) setExpediente({ 
          tipoSangre: clin.tipoSangre, 
          Padecimientos: clin.Padecimientos, 
          NumeroSeguroSocial: clin.NumeroSeguroSocial,
          Datossegurodegastos: clin.Segurodegastosmedicos,
          PDFSegurodegastosmedicos: clin.PDFSegurodegastosmedicos 
      });

      setDatosCargados(true);
    } catch (error) {
      console.error("Error cargando perfil:", error);
      setDatosCargados(true);
    }
  }, [empleadoId]);

  useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

  // --- HANDLERS DE GUARDADO ---
  const handleSaveClick = async () => {
    setIsEditing(false);
    try {
      // Mapeo de vuelta a formato API
      const payloadEducacion = {
        Descripcion: educacion.descripcion,
        Educacion: educacion.items.map(i => ({ Fecha: i.year, Titulo: i.title, Descripcion: i.description })),
        Experiencia: educacion.experiencia.map(i => ({ Fecha: i.year, Titulo: i.title, Descripcion: i.description })),
        Habilidades: { Programacion: educacion.habilidades.map(h => ({ Titulo: h.skillName, Porcentaje: h.porcentaje })) }
      };

      await Promise.all([
        educacionService.update(empleadoId, payloadEducacion),
        rhService.update(empleadoId, rh),
        contactoService.updateDatos(empleadoId, datosContacto),
        expedienteService.update(empleadoId, expediente)
      ]);
      
      cargarPerfil();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  // --- RENDERIZADO DE SECCIONES (JSX) ---
  const renderHeader = () => (
    <div className="about-intro">
      <div className="circle-spin"></div>
      <div className="about-img">
        <img src={empleado?.Fotografia || "default-avatar.png"} alt="perfil" />
      </div>
      <h2 className="main-heading">
        {empleado?.Nombre} <span>{empleado?.ApelPaterno}</span>
      </h2>
    </div>
  );

  if (!datosCargados) return <div className="loading"><span className="span1"></span></div>;

  return (
    <div className="Personal">
      <div className="personal-content">
        <section className="about">
          {renderHeader()}
          
          <div className="about-content">
            {/* COLUMNA IZQUIERDA: Info Personal y Contacto */}
            <div className="left-column">
              <div className="info-box">
                <h3>Intro</h3>
                {isEditing ? (
                  <TextareaAutosize 
                    value={educacion.descripcion} 
                    onChange={(e) => setEducacion({...educacion, descripcion: e.target.value})}
                    className="EditarPersonal" 
                  />
                ) : <p>{educacion.descripcion}</p>}
              </div>

              <div className="info-box">
                <h3>Contacto</h3>
                <label>WhatsApp</label>
                {isEditing ? (
                  <input type="text" value={datosContacto.IDwhatsapp} onChange={(e) => setDatosContacto({...datosContacto, IDwhatsapp: e.target.value})} />
                ) : <p>{datosContacto.IDwhatsapp}</p>}
                <label>Correo</label>
                <p>{datosContacto.correo}</p>
              </div>

              <div className="expediente-clinico">
                <h3>Salud</h3>
                <label>Tipo de Sangre</label>
                <p>{expediente.tipoSangre}</p>
              </div>
            </div>

            {/* COLUMNA DERECHA: Trayectoria, Skills y RH */}
            <div className="right-column">
              <section className="education">
                <h2 className="heading">Trayectoria</h2>
                <div className="education-row">
                  <div className="education-column">
                     {educacion.items.map((item, idx) => (
                       <div key={idx} className="education-content">
                         <div className="content">
                           <div className="year"><i className='bx bxs-calendar'></i> {item.year}</div>
                           <h3>{item.title}</h3>
                           <p>{item.description}</p>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              </section>

              <div className="skills-row">
                <h2 className="heading">Habilidades</h2>
                {educacion.habilidades.map((skill, idx) => (
                  <div key={idx} className="skills-content">
                    <div className="progress">
                      <h3>{skill.skillName} <span>{skill.porcentaje}%</span></h3>
                      <div className="progress-bar-container">
                        <div className="bar" style={{ width: `${skill.porcentaje}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="RH">
                <h3>Recursos Humanos</h3>
                <p><strong>Puesto:</strong> {rh.Puesto}</p>
                <p><strong>Jefe:</strong> {rh.JefeInmediato}</p>
              </div>

              <div className="actions">
                {isEditing ? (
                  <button className="btn" onClick={handleSaveClick}>Guardar Cambios</button>
                ) : (
                  <button className="btn" onClick={() => setIsEditing(true)}>Editar Perfil</button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Personal;