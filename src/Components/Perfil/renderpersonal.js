import React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { CiFacebook, CiLinkedin, CiYoutube } from "react-icons/ci";
import { FaInstagram, FaTiktok } from "react-icons/fa";

const RedSocialIcons = [
  { label: "Facebook", value: <CiFacebook /> },
  { label: "Instagram", value: <FaInstagram /> },
  { label: "Linkedin", value: <CiLinkedin /> },
  { label: "Youtube", value: <CiYoutube /> },
  { label: "tiktok", value: <FaTiktok /> },
];

export const DescriptionRenderer = ({ isEditing, descripcion, setDescripcion }) => {
  return (
    <div className="description-container">
      <h3 className="title">Descripción</h3>
      {isEditing ? (
        <TextareaAutosize
          value={descripcion ?? ""}
          onChange={(event) => setDescripcion(event.target.value)}
          className="EditarPersonal"
        />
      ) : (
        <p>{descripcion || "Sin descripción disponible."}</p>
      )}
    </div>
  );
};

export const EducationSectionRenderer = ({
  educationItems = [],
  isEditing,
  setEducationItems,
}) => {
  const handleEdit = (index, field, value) => {
    const updated = [...educationItems];
    updated[index][field] = value;
    setEducationItems(updated);
  };

  const addItem = () => setEducationItems([...educationItems, { year: "2026", title: "", description: "" }]);
  const removeItem = () => setEducationItems(educationItems.slice(0, -1));

  return (
    <div className="education-column">
      <h3 className="title">Educación</h3>
      <div className="education-box">
        {educationItems.map((item, index) => (
          <div key={index} className="education-content">
            <div className="content">
              <div className="year">
                {isEditing ? (
                  <input
                    type="number"
                    value={item.year || ""}
                    onChange={(e) => handleEdit(index, "year", e.target.value)}
                    className="EditarEducacion"
                  />
                ) : (
                  <><i className="bx bxs-calendar"></i> {item.year}</>
                )}
              </div>
              {isEditing ? (
                <input
                  value={item.title || ""}
                  onChange={(e) => handleEdit(index, "title", e.target.value)}
                  className="EditarEducacion"
                  placeholder="Título"
                />
              ) : (
                <h3>{item.title}</h3>
              )}
              {isEditing ? (
                <TextareaAutosize
                  value={item.description || ""}
                  onChange={(e) => handleEdit(index, "description", e.target.value)}
                  className="EditarEducacion"
                  placeholder="Descripción"
                />
              ) : (
                <p>{item.description}</p>
              )}
            </div>
          </div>
        ))}
        {isEditing && (
          <div className="edit-controls">
            <button className="btn" onClick={addItem}>Agregar</button>
            <button className="btn" onClick={removeItem}>Eliminar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ExperienceSectionRenderer = ({
  experienceItems = [],
  isEditing,
  setExperienceItems,
}) => {
  const handleEdit = (index, field, value) => {
    const updated = [...experienceItems];
    updated[index][field] = value;
    setExperienceItems(updated);
  };

  return (
    <div className="education-column">
      <h3 className="title">Experiencia Laboral</h3>
      <div className="education-box">
        {experienceItems.map((item, index) => (
          <div key={index} className="education-content">
            <div className="content">
              <div className="year">
                {isEditing ? (
                  <input
                    type="number"
                    value={item.year || ""}
                    onChange={(e) => handleEdit(index, "year", e.target.value)}
                    className="EditarEducacion"
                  />
                ) : (
                  <><i className="bx bxs-calendar"></i> {item.year}</>
                )}
              </div>
              <h3>{isEditing ? <input value={item.title} onChange={(e) => handleEdit(index, "title", e.target.value)} className="EditarEducacion" /> : item.title}</h3>
              <p>{isEditing ? <TextareaAutosize value={item.description} onChange={(e) => handleEdit(index, "description", e.target.value)} className="EditarEducacion" /> : item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkillSectionRenderer = ({
  isEditing,
  habilidades = [],
  setHabilidades,
}) => {
  const actualizarPorcentaje = (e, index) => {
    const updated = [...habilidades];
    updated[index].porcentaje = e.target.value;
    setHabilidades(updated);
  };

  return (
    <div className="skills-row">
      <div className="skills-column">
        <h2 className="title">Habilidades</h2>
        <div className="skills-box">
          {habilidades.map((hab, index) => (
            <div key={index} className="skills-content">
              <div className="progress">
                <h3>{hab.skillName} <span>{hab.porcentaje}%</span></h3>
                <div className="progress-bar-container">
                  <div className="bar" style={{ width: `${hab.porcentaje}%` }}></div>
                </div>
                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hab.porcentaje}
                    onChange={(e) => actualizarPorcentaje(e, index)}
                    className="skill-range"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const RedesSocialesRenderer = ({
  isEditing,
  redesSociales = [],
  setRedesSociales,
}) => {
  const handleAdd = () => setRedesSociales([...redesSociales, { redSocialSeleccionada: "", URLRedSocial: "", NombreRedSocial: "" }]);
  
  return (
    <div className="redes-sociales-container">
      <h2 className="heading">Redes Sociales</h2>
      {isEditing ? (
        <div className="edit-social-grid">
          {redesSociales.map((social, index) => (
            <div key={index} className="social-media-content">
              <select
                value={social.redSocialSeleccionada}
                onChange={(e) => {
                  const up = [...redesSociales];
                  up[index].redSocialSeleccionada = e.target.value;
                  setRedesSociales(up);
                }}
              >
                <option value="">Selecciona Red</option>
                {RedSocialIcons.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
              </select>
              <input 
                placeholder="Username" 
                value={social.NombreRedSocial} 
                onChange={(e) => {
                  const up = [...redesSociales];
                  up[index].NombreRedSocial = e.target.value;
                  setRedesSociales(up);
                }}
              />
            </div>
          ))}
          <button className="btn" onClick={handleAdd}>Agregar Red</button>
        </div>
      ) : (
        <div className="redes-sociales-cont">
          {redesSociales.map((red, i) => (
            <div key={i} className="red-item">
              {RedSocialIcons.find(s => s.label === red.redSocialSeleccionada)?.value}
              <span>{red.NombreRedSocial}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RHSectionRenderer = ({
  isEditing,
  RH,
  handleRHChange,
  openRHPicker,
  listaAreas = [],
  empleadoEncontrado,
}) => {
  // BLINDAJE CONTRA UNDEFINED
  const horario = RH?.HorarioLaboral ?? { HoraEntrada: "", HoraSalida: "", TiempoComida: "", DiasTrabajados: "" };
  const nombrePropio = `${empleadoEncontrado?.Nombre} ${empleadoEncontrado?.ApelPaterno}`;

  return (
    <div className="RH-column">
      <h3 className="title">Recursos Humanos</h3>
      <div className="RH-box">
        <div className="RH-content">
          <label>Puesto:</label>
          {isEditing ? (
            <input 
              className="EditarRH" 
              value={RH?.Puesto || ""} 
              onChange={(e) => handleRHChange("Puesto", e.target.value)} 
            />
          ) : <p>{RH?.Puesto || "No asignado"}</p>}

          <label>Jefe Inmediato:</label>
          {isEditing ? (
            <select 
              value={RH?.JefeInmediato || ""} 
              onChange={(e) => handleRHChange("JefeInmediato", e.target.value)}
            >
              <option value="">Seleccione Jefe</option>
              {listaAreas.filter(a => a !== nombrePropio).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          ) : <p>{RH?.JefeInmediato || "Sin jefe asignado"}</p>}

          <label>Horario de Entrada:</label>
          {isEditing ? (
            <input 
              value={horario.HoraEntrada || ""} 
              onChange={(e) => handleRHChange("HorarioLaboral.HoraEntrada", e.target.value)} 
              className="EditarRH"
            />
          ) : <p>{horario.HoraEntrada || "--:--"}</p>}

          {/* Repetir patrón para Salida, Comida, etc. */}
          {isEditing && <button className="btn" onClick={openRHPicker}>Subir PDF RH</button>}
        </div>
      </div>
    </div>
  );
};

export const PersonasContactoRenderer = ({
  isEditing,
  personalcontacto,
  handlePersonalContactoChange,
}) => {
  const data = personalcontacto ?? {};
  return (
    <div className="section-card">
      <h3 className="title">Contacto de Emergencia</h3>
      <div className="content">
        <label>Nombre:</label>
        {isEditing ? (
          <input value={data.nombreContacto || ""} onChange={(e) => handlePersonalContactoChange("nombreContacto", e.target.value)} className="EditarEducacion"/>
        ) : <p>{data.nombreContacto || "Sin asignar"}</p>}
        {/* Repetir para teléfono, parentesco, etc. */}
      </div>
    </div>
  );
};

export const InfoPersonalRenderer = ({
  isEditing,
  datoscontacto,
  handleInputChangedatoscontacto,
}) => {
  const dc = datoscontacto ?? {};
  return (
    <div className="info-column">
      <h3 className="title">Datos de Contacto</h3>
      <div className="content">
        <label>WhatsApp:</label>
        {isEditing ? (
          <input value={dc.IDwhatsapp || ""} onChange={(e) => handleInputChangedatoscontacto("IDwhatsapp", e.target.value)} className="EditarEducacion"/>
        ) : <p>{dc.IDwhatsapp || "N/A"}</p>}
        
        <label>Correo:</label>
        {isEditing ? (
          <input value={dc.correo || ""} onChange={(e) => handleInputChangedatoscontacto("correo", e.target.value)} className="EditarEducacion"/>
        ) : <p>{dc.correo || "N/A"}</p>}
      </div>
    </div>
  );
};

export const ExpedienteClinicoRenderer = ({
  isEditing,
  expedienteclinico,
  setexpedienteclinico,
  openFilePicker,
}) => {
  const clin = expedienteclinico ?? {};
  const handleEdit = (field, value) => setexpedienteclinico({ ...clin, [field]: value });

  return (
    <div className="expediente-clinico">
      <h3 className="title">Expediente Clínico</h3>
      <div className="content">
        <label>Tipo de Sangre:</label>
        {isEditing ? (
          <input value={clin.tipoSangre || ""} onChange={(e) => handleEdit("tipoSangre", e.target.value)} className="EditarPersonal" />
        ) : <p>{clin.tipoSangre || "S/N"}</p>}
        
        <label>NSS:</label>
        {isEditing ? (
          <input value={clin.NumeroSeguroSocial || ""} onChange={(e) => handleEdit("NumeroSeguroSocial", e.target.value)} className="EditarPersonal" />
        ) : <p>{clin.NumeroSeguroSocial || "No registrado"}</p>}

        {isEditing && <button className="btn" onClick={openFilePicker}>Adjuntar Seguro</button>}
      </div>
    </div>
  );
};