import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator } from "use-file-picker/validators";
import "../Personal.css";

// Servicios (Arquitectura 2026 - Rutas relativas corregidas)
import { empleadoService } from "../../services/empleadoService";
import { contactoService } from "../../services/contactoService";
import { educacionService } from "../../services/educacionService";
import { rhService } from "../../services/rhService"; 
import { clinicoService } from "../../services/clinicoService";

// Renderizadores de UI
import {
  EducationSectionRenderer,
  DescriptionRenderer,
  ExperienceSectionRenderer,
  SkillSectionRenderer,
  RedesSocialesRenderer,
  RHSectionRenderer,
  PersonasContactoRenderer,
  InfoPersonalRenderer,
  ExpedienteClinicoRenderer,
} from "./renderpersonal.js";

function Perfil() {
  const { id } = useParams();
  const empleadoId = id?.trim();

  // --- ESTADOS DE DATOS (INICIALIZACIÓN BLINDADA) ---
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [jerarquia, setJerarquia] = useState({ name: "Jerarquía de Empleados", children: [] });
  const [listaAreas, setListaAreas] = useState([]);

  const [descripcion, setDescripcion] = useState("Por favor, edita tu descripción.");
  const [educationItems, setEducationItems] = useState([]);
  const [experienciaItems, setExperienciaItems] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  
  const [datosContacto, setDatosContacto] = useState({ 
    telefonoF: "", telefonoC: "", IDwhatsapp: "", IDtelegram: "", correo: "" 
  });
  
  const [personalContacto, setPersonalContacto] = useState({ 
    parenstesco: "", nombreContacto: "", telefonoContacto: "", correoContacto: "", direccionContacto: "" 
  });

  const [rh, setRh] = useState({ 
    Puesto: "", 
    JefeInmediato: "", 
    HorarioLaboral: { 
      HoraEntrada: "", HoraSalida: "", TiempoComida: "", DiasTrabajados: "" 
    }, 
    ExpedienteDigitalPDF: null 
  });

  const [expediente, setExpediente] = useState({ 
    tipoSangre: "", Padecimientos: "", NumeroSeguroSocial: "", Datossegurodegastos: "", PDFSegurodegastosmedicos: null 
  });

  // --- CONFIGURACIÓN DE ARCHIVOS ---
  const { openFilePicker, filesContent } = useFilePicker({
    readAs: "DataURL", accept: "pdf/*", validators: [new FileAmountLimitValidator({ max: 1 })],
  });

  const { openFilePicker: openRHPicker, filesContent: rhFiles } = useFilePicker({
    readAs: "DataURL", accept: "pdf/*", validators: [new FileAmountLimitValidator({ max: 1 })],
  });

  // Actualización de archivos en el estado local
  useEffect(() => {
    if (filesContent.length > 0) {
      setExpediente(prev => ({ ...prev, PDFSegurodegastosmedicos: filesContent }));
    }
  }, [filesContent]);

  useEffect(() => {
    if (rhFiles.length > 0) {
      setRh(prev => ({ ...prev, ExpedienteDigitalPDF: rhFiles }));
    }
  }, [rhFiles]);

  // --- LÓGICA DE JERARQUÍA ---
  const obtenerAreas = useCallback((nodo, acumulador = new Set(["Jerarquía de Empleados"])) => {
    if (nodo?.name) acumulador.add(nodo.name);
    if (nodo?.children) nodo.children.forEach(hijo => obtenerAreas(hijo, acumulador));
    return [...acumulador];
  }, []);

  const buscarNodo = (nodo, nombre) => {
    if (nodo.name === nombre) return nodo;
    if (nodo.children) {
      for (const hijo of nodo.children) {
        const encontrado = buscarNodo(hijo, nombre);
        if (encontrado) return encontrado;
      }
    }
    return null;
  };

  // --- CARGA INICIAL (CON MANEJO DE 404) ---
  const cargarInformacionTotal = useCallback(async () => {
    try {
      // 1. Cargamos empleado (Requisito mínimo)
      const emp = await empleadoService.getById(empleadoId);
      setEmpleadoEncontrado(emp);

      // 2. Cargamos el resto en paralelo. Si dan 404, devolvemos estructura vacía para no romper el render.
      const [dc, pc, rs, ed, rhData, clin, jer] = await Promise.all([
        contactoService.getDatosByEmpleado(empleadoId).catch(() => ({})),
        contactoService.getPersonasByEmpleado(empleadoId).catch(() => ({})),
        contactoService.getRedesByEmpleado(empleadoId).catch(() => ([])),
        educacionService.getByEmpleado(empleadoId).catch(() => ({})),
        rhService.getByEmpleado(empleadoId).catch(() => ({})),
        clinicoService.getByEmpleado(empleadoId).catch(() => ({})),
        rhService.getJerarquia().catch(() => ({ name: "Jerarquía de Empleados", children: [] }))
      ]);

      // Mapeo seguro de Datos de Contacto
      setDatosContacto({ 
        telefonoF: dc?.TelFijo || "", 
        telefonoC: dc?.TelCelular || "", 
        IDwhatsapp: dc?.IdWhatsApp || "", 
        IDtelegram: dc?.IdTelegram || "", 
        correo: dc?.ListaCorreos || "" 
      });

      // Mapeo seguro de Personas de Contacto
      if (pc?.personalcontacto) setPersonalContacto(pc.personalcontacto);

      // Redes Sociales
      setRedesSociales(rs[0]?.RedesSociales || []);

      // Educación y Experiencia
      if (ed) {
        setDescripcion(ed.Descripcion || "Sin descripción");
        setEducationItems(ed.Educacion?.map(i => ({ year: i.Fecha, title: i.Titulo, description: i.Description || i.Descripcion })) || []);
        setExperienciaItems(ed.Experiencia?.map(i => ({ year: i.Fecha, title: i.Titulo, description: i.Description || i.Descripcion })) || []);
        setHabilidades(ed.Habilidades?.Programacion?.map(i => ({ skillName: i.Titulo, porcentaje: i.Porcentaje })) || []);
      }

      // RH con blindaje para HorarioLaboral
      setRh({
        Puesto: rhData?.Puesto || "",
        JefeInmediato: rhData?.JefeInmediato || "",
        HorarioLaboral: rhData?.HorarioLaboral || { HoraEntrada: "", HoraSalida: "", TiempoComida: "", DiasTrabajados: "" },
        ExpedienteDigitalPDF: rhData?.ExpedienteDigitalPDF || null
      });

      // Expediente Clínico
      setExpediente(clin || { tipoSangre: "", Padecimientos: "", NumeroSeguroSocial: "", Datossegurodegastos: "" });

      // Jerarquía
      setJerarquia(jer);
      setListaAreas(obtenerAreas(jer));

      setDatosCargados(true);
    } catch (error) {
      console.error("Error crítico cargando el perfil:", error);
      setDatosCargados(true);
    }
  }, [empleadoId, obtenerAreas]);

  useEffect(() => { cargarInformacionTotal(); }, [cargarInformacionTotal]);

  // --- GUARDADO ---
  const handleSaveClick = async () => {
    setIsEditing(false);
    try {
      const payloadEducacion = {
        empleado_id: empleadoId,
        Descripcion: descripcion,
        Educacion: educationItems.map(i => ({ Fecha: i.year, Titulo: i.title, Descripcion: i.description })),
        Experiencia: experienciaItems.map(i => ({ Fecha: i.year, Titulo: i.title, Descripcion: i.description })),
        Habilidades: { Programacion: habilidades.map(h => ({ Titulo: h.skillName, Porcentaje: h.porcentaje })) }
      };

      // Actualizar Jerarquía local
      const nuevaJerarquia = { ...jerarquia };
      const areaPadre = buscarNodo(nuevaJerarquia, rh.JefeInmediato);
      if (areaPadre) {
        if (!areaPadre.children) areaPadre.children = [];
        const nombreCompleto = `${empleadoEncontrado.Nombre} ${empleadoEncontrado.ApelPaterno}`;
        const index = areaPadre.children.findIndex(h => h.attributes?.Id === empleadoId);
        const nodoEmpleado = { name: nombreCompleto, attributes: { Cargo: rh.Puesto, Id: empleadoId }, children: [] };
        if (index !== -1) areaPadre.children[index] = nodoEmpleado;
        else areaPadre.children.push(nodoEmpleado);
      }

      await Promise.all([
        educacionService.update(empleadoId, payloadEducacion),
        rhService.update(empleadoId, rh),
        rhService.saveJerarquia(nuevaJerarquia),
        contactoService.updateDatos(empleadoId, datosContacto),
        clinicoService.update(empleadoId, expediente)
      ]);

      cargarInformacionTotal();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  // --- HANDLERS ---
  const handleRHChange = (prop, value) => {
    const keys = prop.split('.');
    if (keys.length > 1) {
      setRh(prev => ({
        ...prev,
        [keys[0]]: { ...prev[keys[0]], [keys[1]]: value }
      }));
    } else {
      setRh(prev => ({ ...prev, [prop]: value }));
    }
  };

  if (!datosCargados || !empleadoEncontrado) return <div className="loading"><span className="span1"></span></div>;

  return (
    <div className="Perfil">
      <div className="Perfil-content">
        <section className="about">
          <h2 className="main-heading">Sobre <span>Mi</span></h2>
          <div className="circle-spin"></div>
          <div className="about-img">
            <img src={empleadoEncontrado.Fotografias?.[0] || empleadoEncontrado.Fotografia} alt="perfil" />
          </div>

          <div className="about-content">
            <div className="left-column">
              <div className="section-card">
                <DescriptionRenderer isEditing={isEditing} descripcion={descripcion} setDescripcion={setDescripcion} />
              </div>
              <div className="section-card">
                <InfoPersonalRenderer 
                  isEditing={isEditing} 
                  datoscontacto={datosContacto} 
                  handleInputChangedatoscontacto={(f, v) => setDatosContacto(p => ({ ...p, [f]: v }))} 
                />
              </div>
              <div className="section-card">
                <PersonasContactoRenderer 
                   isEditing={isEditing}
                   personalcontacto={personalContacto}
                   handlePersonalContactoChange={(f, v) => setPersonalContacto(p => ({ ...p, [f]: v }))}
                />
              </div>
              <div className="section-card">
                <RedesSocialesRenderer 
                  isEditing={isEditing} 
                  redesSociales={redesSociales} 
                  setRedesSociales={setRedesSociales} 
                />
              </div>
            </div>

            <div className="right-column">
              <div className="section-card">
                <EducationSectionRenderer 
                  isEditing={isEditing} 
                  educationItems={educationItems} 
                  setEducationItems={setEducationItems} 
                />
                <ExperienceSectionRenderer 
                  isEditing={isEditing} 
                  experienceItems={experienciaItems} 
                  setExperienceItems={setExperienciaItems} 
                />
              </div>
              <div className="section-card">
                <SkillSectionRenderer 
                  isEditing={isEditing} 
                  habilidades={habilidades} 
                  setHabilidades={setHabilidades} 
                />
              </div>
              <div className="section-card">
                <RHSectionRenderer 
                  isEditing={isEditing} 
                  RH={rh} 
                  handleRHChange={handleRHChange} 
                  listaAreas={listaAreas} 
                  openRHPicker={openRHPicker} 
                />
              </div>
              <div className="section-card">
                <ExpedienteClinicoRenderer 
                  isEditing={isEditing}
                  expedienteclinico={expediente}
                  setexpedienteclinico={setExpediente}
                  openFilePicker={openFilePicker}
                />
              </div>
              
              <div className="actions-section">
                {isEditing ? (
                  <button className="btn btn-save" onClick={handleSaveClick}>Guardar Cambios</button>
                ) : (
                  <button className="btn btn-edit" onClick={() => setIsEditing(true)}>Editar Perfil</button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Perfil;