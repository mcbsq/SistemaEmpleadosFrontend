import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator } from "use-file-picker/validators";
import "../Personal.css";

import { authService }      from "../../services/authService";
import { empleadoService }  from "../../services/empleadoService";
import { contactoService }  from "../../services/contactoService";
import { educacionService } from "../../services/educacionService";
import { rhService }        from "../../services/rhService";
import { clinicoService }   from "../../services/clinicoService";

import {
  DescriptionRenderer,
  InfoPersonalRenderer,
  PersonasContactoRenderer,
  RedesSocialesRenderer,
  EducationSectionRenderer,
  ExperienceSectionRenderer,
  SkillSectionRenderer,
  RHSectionRenderer,
  ExpedienteClinicoRenderer,
  ProyectosRenderer,
  CVExportRenderer,
} from "./renderpersonal.js";

// ─── Estados iniciales ────────────────────────────────────────────────────────
const CONTACTO_INIT  = { telefonoF:"", telefonoC:"", IDwhatsapp:"", IDtelegram:"", correo:"" };
const PERS_CONT_INIT = { parenstesco:"", nombreContacto:"", telefonoContacto:"", correoContacto:"", direccionContacto:"" };
const RH_INIT        = { Puesto:"", JefeInmediato:"", JefeInmediato_id:"", HorarioLaboral:{ HoraEntrada:"", HoraSalida:"", TiempoComida:"", DiasTrabajados:"" }, ExpedienteDigitalPDF:null };
const EXP_INIT       = { tipoSangre:"", Padecimientos:"", NumeroSeguroSocial:"", Datossegurodegastos:"", PDFSegurodegastosmedicos:null };

const PROYECTOS_MOCK = [
  { id:1, nombre:"Portal Web Cibercom",     avance:75,  estado:"Activo",  entrega:"2026-04-30" },
  { id:2, nombre:"App Móvil Empleados",     avance:40,  estado:"Activo",  entrega:"2026-06-15" },
  { id:3, nombre:"Migración Base de Datos", avance:100, estado:"Cerrado", entrega:"2026-02-01" },
];

const buscarNodo = (nodo, nombre) => {
  if (nodo.name === nombre) return nodo;
  for (const hijo of nodo.children ?? []) {
    const found = buscarNodo(hijo, nombre);
    if (found) return found;
  }
  return null;
};

function Perfil() {
  const { id }     = useParams();
  const empleadoId = id?.trim();

  // ─── Permisos ─────────────────────────────────────────────────────────────
  // canEdit: dueño del perfil, ADMIN o SUPER_ADMIN
  const canEdit         = authService.canEdit(empleadoId);
  // canViewSensitive: dueño, ADMIN o SUPER_ADMIN
  // Un EMPLOYEE viendo el perfil de un compañero NO ve RH ni expediente clínico
  const canViewSensitive = authService.canViewSensitive(empleadoId);
  const isSuperAdmin     = authService.isSuperAdmin();
  const isAdmin          = authService.isAdmin();

  // ─── Estados ──────────────────────────────────────────────────────────────
  const [empleado,         setEmpleado]         = useState(null);
  const [datosCargados,    setDatosCargados]    = useState(false);
  const [isEditing,        setIsEditing]        = useState(false);
  const [saveStatus,       setSaveStatus]       = useState(null);
  const [listaEmpleados,   setListaEmpleados]   = useState([]);

  const [descripcion,      setDescripcion]      = useState("");
  const [educationItems,   setEducationItems]   = useState([]);
  const [experienciaItems, setExperienciaItems] = useState([]);
  const [habilidades,      setHabilidades]      = useState([]);
  const [redesSociales,    setRedesSociales]    = useState([]);
  const [datosContacto,    setDatosContacto]    = useState(CONTACTO_INIT);
  const [personalContacto, setPersonalContacto] = useState(PERS_CONT_INIT);
  const [rh,               setRh]               = useState(RH_INIT);
  const [expediente,       setExpediente]       = useState(EXP_INIT);
  const [jerarquia,        setJerarquia]        = useState({ name:"Jerarquía", children:[] });

  // ─── File pickers ──────────────────────────────────────────────────────────
  const { openFilePicker: openClinicoPicker, filesContent: clinicoFiles } = useFilePicker({
    readAs:"DataURL", accept:"application/pdf",
    validators:[new FileAmountLimitValidator({ max:1 })],
  });
  const { openFilePicker: openRHPicker, filesContent: rhFiles } = useFilePicker({
    readAs:"DataURL", accept:"application/pdf",
    validators:[new FileAmountLimitValidator({ max:1 })],
  });

  useEffect(() => {
    if (clinicoFiles.length > 0)
      setExpediente(p => ({ ...p, PDFSegurodegastosmedicos: clinicoFiles }));
  }, [clinicoFiles]);

  useEffect(() => {
    if (rhFiles.length > 0)
      setRh(p => ({ ...p, ExpedienteDigitalPDF: rhFiles }));
  }, [rhFiles]);

  // ─── Carga ────────────────────────────────────────────────────────────────
  const cargarPerfil = useCallback(async () => {
    try {
      const emp = await empleadoService.getById(empleadoId);
      setEmpleado(emp);

      // Carga en paralelo — todos los errores 404 se manejan con fallback
      const [dc, pc, rs, ed, rhData, clin, jer] = await Promise.all([
        contactoService.getDatosByEmpleado(empleadoId).catch(() => ({})),
        contactoService.getPersonasByEmpleado(empleadoId).catch(() => ({})),
        contactoService.getRedesByEmpleado(empleadoId).catch(() => ([])),
        educacionService.getByEmpleado(empleadoId).catch(() => ({})),
        rhService.getByEmpleado(empleadoId).catch(() => ({})),
        clinicoService.getByEmpleado(empleadoId).catch(() => ({})),
        rhService.getJerarquia().catch(() => ({ name:"Jerarquía", children:[] })),
      ]);

      setDatosContacto({
        telefonoF:  dc?.TelFijo      || "",
        telefonoC:  dc?.TelCelular   || "",
        IDwhatsapp: dc?.IdWhatsApp   || "",
        IDtelegram: dc?.IdTelegram   || "",
        correo:     dc?.ListaCorreos || "",
      });

      if (pc?.personalcontacto) setPersonalContacto(pc.personalcontacto);
      setRedesSociales(rs[0]?.RedesSociales || []);

      if (ed) {
        setDescripcion(ed.Descripcion || "");
        setEducationItems(
          ed.Educacion?.map(i => ({ year:i.Fecha, title:i.Titulo, description:i.Description||i.Descripcion })) || []
        );
        setExperienciaItems(
          ed.Experiencia?.map(i => ({ year:i.Fecha, title:i.Titulo, description:i.Description||i.Descripcion })) || []
        );
        setHabilidades(
          ed.Habilidades?.Programacion?.map(i => ({ skillName:i.Titulo, porcentaje:i.Porcentaje })) || []
        );
      }

      setRh({
        Puesto:               rhData?.Puesto            || "",
        JefeInmediato:        rhData?.JefeInmediato     || "",
        JefeInmediato_id:     rhData?.JefeInmediato_id  || "",
        HorarioLaboral:       rhData?.HorarioLaboral    || RH_INIT.HorarioLaboral,
        ExpedienteDigitalPDF: rhData?.ExpedienteDigitalPDF || null,
      });

      setExpediente({
        tipoSangre:               clin?.tipoSangre             || "",
        Padecimientos:            clin?.Padecimientos          || "",
        NumeroSeguroSocial:       clin?.NumeroSeguroSocial     || "",
        Datossegurodegastos:      clin?.Segurodegastosmedicos  || "",
        PDFSegurodegastosmedicos: clin?.PDFSegurodegastosmedicos || null,
      });

      const arbol = jer.jerarquia || jer;
      setJerarquia(arbol);

      // Lista de empleados para selector de jefe — solo admins la necesitan
      if (isAdmin) {
        const [todos, todosRH] = await Promise.all([
          empleadoService.getAll().catch(() => []),
          rhService.getAll().catch(() => []),
        ]);
        setListaEmpleados(
          todos.map(e => {
            const rhEmp = todosRH.find(r =>
              (r.empleado_id?.$oid || r.empleado_id) === (e._id?.$oid || e._id)
            );
            return { ...e, Puesto: rhEmp?.Puesto || "" };
          })
        );
      }

    } catch (err) {
      console.error("Error cargando perfil:", err);
    } finally {
      setDatosCargados(true);
    }
  }, [empleadoId, isAdmin]);

  useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

  // ─── Guardado ─────────────────────────────────────────────────────────────
  const handleSaveClick = async () => {
    setSaveStatus("saving");
    setIsEditing(false);

    try {
      const payloadEducacion = {
        empleado_id: empleadoId,
        Descripcion: descripcion,
        Educacion:   educationItems.map(i => ({ Fecha:i.year, Titulo:i.title, Descripcion:i.description })),
        Experiencia: experienciaItems.map(i => ({ Fecha:i.year, Titulo:i.title, Descripcion:i.description })),
        Habilidades: { Programacion: habilidades.map(h => ({ Titulo:h.skillName, Porcentaje:h.porcentaje })) },
      };

      const saves = [
        educacionService.update(empleadoId, payloadEducacion),
        contactoService.updateDatos(empleadoId, datosContacto),
        clinicoService.update(empleadoId, expediente),
      ];

      // RH solo lo guarda alguien que pueda editar datos sensibles
      if (canViewSensitive) {
        saves.push(rhService.update(empleadoId, rh));
      }

      // Jerarquía solo si es admin y se asignó jefe
      if (isAdmin && rh.JefeInmediato) {
        const jerarquiaFresca = await rhService.getJerarquia()
          .then(d => d.jerarquia || d)
          .catch(() => structuredClone(jerarquia));

        const jerarquiaActualizada = structuredClone(jerarquiaFresca);

        // Limpiar nodo anterior del empleado
        const limpiar = (nodo) => {
          if (nodo.children) {
            nodo.children = nodo.children.filter(h => h.attributes?.Id !== empleadoId);
            nodo.children.forEach(limpiar);
          }
        };
        limpiar(jerarquiaActualizada);

        // Insertar bajo el nuevo jefe
        let padre = buscarNodo(jerarquiaActualizada, rh.JefeInmediato);
        if (!padre) {
          // Jefe aún no está en el árbol — crearlo bajo la raíz
          padre = { name: rh.JefeInmediato, attributes:{ Id: rh.JefeInmediato_id }, children:[] };
          jerarquiaActualizada.children = jerarquiaActualizada.children ?? [];
          jerarquiaActualizada.children.push(padre);
        }

        padre.children = padre.children ?? [];
        padre.children.push({
          name: `${empleado.Nombre} ${empleado.ApelPaterno}`,
          attributes: { Cargo: rh.Puesto, Id: empleadoId },
          children: [],
        });

        saves.push(rhService.saveJerarquia(jerarquiaActualizada));
        setJerarquia(jerarquiaActualizada);
      }

      await Promise.all(saves);
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus(null), 3000);
      cargarPerfil();
    } catch (err) {
      console.error("Error al guardar:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleRHChange = (prop, value) => {
    const keys = prop.split(".");
    if (keys.length > 1) {
      setRh(prev => ({ ...prev, [keys[0]]: { ...prev[keys[0]], [keys[1]]: value } }));
    } else {
      setRh(prev => ({ ...prev, [prop]: value }));
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (!datosCargados || !empleado) {
    return (
      <div className="perfil-loading">
        <div className="loading-ring" />
        <p>Cargando perfil...</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="Perfil">
      {saveStatus && (
        <div className={`save-toast save-toast--${saveStatus}`}>
          {saveStatus === "saving" && "Guardando cambios..."}
          {saveStatus === "ok"     && "✓ Cambios guardados correctamente"}
          {saveStatus === "error"  && "✗ Error al guardar. Intenta de nuevo."}
        </div>
      )}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="perfil-hero">
        <div className="perfil-avatar-wrap">
          <div className="perfil-avatar-ring" />
          <img
            className="perfil-avatar"
            src={empleado.Fotografias?.[0] || empleado.Fotografia || "/default-avatar.png"}
            alt={`${empleado.Nombre} ${empleado.ApelPaterno}`}
            onError={e => { e.target.src = "/default-avatar.png"; }}
          />
        </div>
        <div className="perfil-hero-info">
          <h1 className="perfil-nombre">
            {empleado.Nombre} <span>{empleado.ApelPaterno}</span>
          </h1>
          <p className="perfil-puesto">{rh.Puesto || "Sin puesto asignado"}</p>
          {rh.JefeInmediato && (
            <p className="perfil-jefe">
              Reporta a: <strong>{rh.JefeInmediato}</strong>
            </p>
          )}

          {/* Botones de edición — solo quien puede editar */}
          {canEdit && (
            <div className="perfil-actions">
              {isEditing ? (
                <>
                  <button
                    className="btn-save"
                    onClick={handleSaveClick}
                    disabled={saveStatus === "saving"}
                  >
                    {saveStatus === "saving" ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => { setIsEditing(false); cargarPerfil(); }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button className="btn-edit" onClick={() => setIsEditing(true)}>
                  Editar perfil
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div className="perfil-grid">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="perfil-sidebar">
          <div className="section-card">
            <DescriptionRenderer
              isEditing={isEditing && canEdit}
              descripcion={descripcion}
              setDescripcion={setDescripcion}
            />
          </div>
          <div className="section-card">
            <InfoPersonalRenderer
              isEditing={isEditing && canEdit}
              datoscontacto={datosContacto}
              handleInputChangedatoscontacto={(f, v) =>
                setDatosContacto(p => ({ ...p, [f]: v }))
              }
            />
          </div>
          <div className="section-card">
            <PersonasContactoRenderer
              isEditing={isEditing && canEdit}
              personalcontacto={personalContacto}
              handlePersonalContactoChange={(f, v) =>
                setPersonalContacto(p => ({ ...p, [f]: v }))
              }
            />
          </div>
          <div className="section-card">
            <RedesSocialesRenderer
              isEditing={isEditing && canEdit}
              redesSociales={redesSociales}
              setRedesSociales={setRedesSociales}
            />
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="perfil-main">
          <div className="section-card">
            <EducationSectionRenderer
              isEditing={isEditing && canEdit}
              educationItems={educationItems}
              setEducationItems={setEducationItems}
            />
          </div>
          <div className="section-card">
            <ExperienceSectionRenderer
              isEditing={isEditing && canEdit}
              experienceItems={experienciaItems}
              setExperienceItems={setExperienciaItems}
            />
          </div>
          <div className="section-card">
            <SkillSectionRenderer
              isEditing={isEditing && canEdit}
              habilidades={habilidades}
              setHabilidades={setHabilidades}
            />
          </div>
          <div className="section-card">
            <ProyectosRenderer proyectos={PROYECTOS_MOCK} />
          </div>
          <div className="section-card">
            <CVExportRenderer
              empleado={empleado}
              rh={rh}
              descripcion={descripcion}
              educationItems={educationItems}
              experienciaItems={experienciaItems}
              habilidades={habilidades}
            />
          </div>

          {/*
            ── Secciones sensibles ────────────────────────────────────────────
            Solo visibles para:
            · El propio empleado
            · ADMIN (gestiona su área)
            · SUPER_ADMIN

            Un EMPLOYEE viendo el perfil de un compañero NO ve estas secciones.
          */}
          {canViewSensitive && (
            <>
              <div className="section-card section-card--sensitive">
                <div className="sensitive-badge">Solo tú y RH</div>
                <RHSectionRenderer
                  isEditing={isEditing && canEdit}
                  RH={rh}
                  handleRHChange={handleRHChange}
                  listaEmpleados={listaEmpleados}
                  openRHPicker={openRHPicker}
                  empleadoEncontrado={empleado}
                />
              </div>

              <div className="section-card section-card--sensitive">
                <div className="sensitive-badge">Confidencial</div>
                <ExpedienteClinicoRenderer
                  isEditing={isEditing && canEdit}
                  expedienteclinico={expediente}
                  setexpedienteclinico={setExpediente}
                  openFilePicker={openClinicoPicker}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Perfil;