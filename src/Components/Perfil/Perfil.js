import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator } from "use-file-picker/validators";
import "../Personal.css";

import { authService }      from "../../services/authService";
import { decodeId }          from "../../services/empleadoService";

// Resuelve slug/base64/id a un ObjectId real de MongoDB
const resolveToId = (slugOrId) => {
  if (!slugOrId) return slugOrId;
  // ObjectId directo (24 hex) — caso más común al llegar por URL directa
  if (/^[a-f0-9]{24}$/i.test(slugOrId)) return slugOrId;
  // Buscar en mapa de slugs de sessionStorage
  try {
    const map = JSON.parse(sessionStorage.getItem("hr_slug_map") || "{}");
    if (map[slugOrId]) return map[slugOrId];
  } catch {}
  // Fallback base64
  return decodeId(slugOrId);
};

// Genera slug URL-friendly
const toSlug = (nombre = "", apelPaterno = "") =>
  `${nombre} ${apelPaterno}`.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
import { empleadoService }  from "../../services/empleadoService";
import { contactoService }  from "../../services/contactoService";
import { educacionService } from "../../services/educacionService";
import { rhService }        from "../../services/rhService";
import { clinicoService }   from "../../services/clinicoService";
import { direccionService } from "../../services/direccionService";
import { catalogoService, FALLBACK } from "../../services/catalogoService";
import { CiEdit, CiTrash, CiSaveDown2, CiCircleRemove } from "react-icons/ci";
import { MdLockOpen } from "react-icons/md";

import {
  DescriptionRenderer, InfoPersonalRenderer, PersonasContactoRenderer,
  DireccionRenderer, RedesSocialesRenderer, EducationSectionRenderer,
  ExperienceSectionRenderer, SkillSectionRenderer, RHSectionRenderer,
  ExpedienteClinicoRenderer, CVExportRenderer,
} from "./renderpersonal.js";

const CONTACTO_INIT  = { telefonoF:"", telefonoC:"", IDwhatsapp:"", IDtelegram:"", correo:"" };
const PERS_CONT_INIT = { parenstesco:"", nombreContacto:"", telefonoContacto:"", correoContacto:"", direccionContacto:"" };
const DIR_INIT       = { Calle:"", NumExterior:"", NumInterior:"", Municipio:"", Ciudad:"", CodigoP:"", lat:null, lng:null };
const RH_INIT        = { Puesto:"", JefeInmediato:"", JefeInmediato_id:"", HorarioLaboral:{ HoraEntrada:"", HoraSalida:"", TiempoComida:"", DiasTrabajados:"" }, ExpedienteDigitalPDF:null };
const EXP_INIT       = { tipoSangre:"", Padecimientos:"", NumeroSeguroSocial:"", Datossegurodegastos:"", PDFSegurodegastosmedicos:null };

// ─── Modal verificación ───────────────────────────────────────────────────────
function VerifyPasswordModal({ onConfirm, onCancel, loading, error }) {
  const [pwd, setPwd] = useState("");
  const operatorUser  = sessionStorage.getItem("user_name") || "administrador";
  return (
    <div className="vp-overlay" onClick={e => e.target===e.currentTarget && onCancel()}>
      <div className="vp-card">
        <div className="vp-icon">🔐</div>
        <h3 className="vp-title">Acceso restringido</h3>
        <p className="vp-sub">
          Ingresa tu contraseña de administrador<br/>
          <strong style={{color:"var(--hr-accent-2)"}}>({operatorUser})</strong> para continuar
        </p>
        <input type="password" className="vp-input" placeholder="Tu contraseña"
          value={pwd} onChange={e=>setPwd(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&pwd&&onConfirm(pwd)} autoFocus />
        {error && <p className="vp-error">{error}</p>}
        <div className="vp-actions">
          <button className="vp-btn-cancel"  onClick={onCancel}             disabled={loading}>Cancelar</button>
          <button className="vp-btn-confirm" onClick={()=>onConfirm(pwd)}   disabled={loading||!pwd}>
            {loading?"Verificando...":"Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal eliminar ───────────────────────────────────────────────────────────
function DeleteModal({ empleado, onConfirm, onCancel, loading }) {
  return (
    <div className="vp-overlay" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="vp-card">
        <div className="vp-icon">⚠️</div>
        <h3 className="vp-title">Eliminar empleado</h3>
        <p className="vp-sub">¿Estás seguro de eliminar a <strong>{empleado?.Nombre} {empleado?.ApelPaterno}</strong>? Esta acción no se puede deshacer.</p>
        <div className="vp-actions">
          <button className="vp-btn-cancel" onClick={onCancel}  disabled={loading}>Cancelar</button>
          <button className="vp-btn-danger" onClick={onConfirm} disabled={loading}>{loading?"Eliminando...":"Sí, eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── BlurOverlay ──────────────────────────────────────────────────────────────
function BlurOverlay({ onReveal }) {
  return (
    <div className="blur-overlay" onClick={onReveal}>
      <div className="blur-overlay-inner">
        <span className="blur-lock">🔒</span>
        <span className="blur-text">Clic para ver</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Perfil() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  // Resolver slug/base64 al ID real de MongoDB
  const empleadoId = resolveToId(id?.trim());

  const canEdit          = authService.canEdit(empleadoId);
  const canViewSensitive = authService.canViewSensitive(empleadoId);
  const isAdmin          = authService.isAdmin();

  const myRawId = authService.getEmpleadoId() || "";
  const isOwnProfile = myRawId && (() => {
    if (myRawId === empleadoId) return true;
    try {
      let b64 = empleadoId.replace(/-/g,"+").replace(/_/g,"/");
      while (b64.length % 4) b64 += "=";
      return myRawId === atob(b64);
    } catch { return false; }
  })();

  const [isRevealed,    setIsRevealed]    = useState(isOwnProfile);
  const [verifyModal,   setVerifyModal]   = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError,   setVerifyError]   = useState("");
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [empleado,         setEmpleado]         = useState(null);
  const [datosCargados,    setDatosCargados]    = useState(false);
  const [isEditing,        setIsEditing]        = useState(false);
  const [saveStatus,       setSaveStatus]       = useState(null);
  const [listaEmpleados,   setListaEmpleados]   = useState([]);
  const [catalogos,        setCatalogos]        = useState(FALLBACK);
  const [descripcion,      setDescripcion]      = useState("");
  const [educationItems,   setEducationItems]   = useState([]);
  const [experienciaItems, setExperienciaItems] = useState([]);
  const [habilidades,      setHabilidades]      = useState([]);
  const [redesSociales,    setRedesSociales]    = useState([]);
  const [datosContacto,    setDatosContacto]    = useState(CONTACTO_INIT);
  const [personalContacto, setPersonalContacto] = useState(PERS_CONT_INIT);
  const [direccion,        setDireccion]        = useState(DIR_INIT);
  const [rh,               setRh]               = useState(RH_INIT);
  const [expediente,       setExpediente]       = useState(EXP_INIT);
  const [jerarquia,        setJerarquia]        = useState({ name:"Jerarquía", children:[] });

  // ─── Refs para PDFs — guardan el valor del backend sin triggear re-renders ─
  // Esto evita que cargarPerfil() sobreescriba un PDF recién seleccionado,
  // y también evita re-enviar el PDF completo si el usuario no lo cambió.
  const rhPdfRef   = useRef(null);  // PDF guardado en BD para RH
  const clinPdfRef = useRef(null);  // PDF guardado en BD para Clínico

  const { openFilePicker: openClinicoPicker, filesContent: clinicoFiles } = useFilePicker({
    readAs:"DataURL", accept:"application/pdf", validators:[new FileAmountLimitValidator({max:1})],
  });
  const { openFilePicker: openRHPicker, filesContent: rhFiles } = useFilePicker({
    readAs:"DataURL", accept:"application/pdf", validators:[new FileAmountLimitValidator({max:1})],
  });

  // Cuando el usuario selecciona un PDF nuevo, actualizar estado Y ref
  useEffect(() => {
    if (rhFiles.length > 0) {
      setRh(p => ({ ...p, ExpedienteDigitalPDF: rhFiles }));
      rhPdfRef.current = rhFiles; // marcar como "nuevo, debe enviarse"
    }
  }, [rhFiles]);

  useEffect(() => {
    if (clinicoFiles.length > 0) {
      setExpediente(p => ({ ...p, PDFSegurodegastosmedicos: clinicoFiles }));
      clinPdfRef.current = clinicoFiles;
    }
  }, [clinicoFiles]);

  useEffect(() => { catalogoService.getAll().then(setCatalogos).catch(()=>{}); }, []);

  const cargarPerfil = useCallback(async () => {
    try {
      const emp = await empleadoService.getById(empleadoId);
      setEmpleado(emp);
      // ── Redirigir a URL limpia con nombre si la URL actual tiene ID crudo ──
      const slug = toSlug(emp.Nombre || "", emp.ApelPaterno || "");
      if (slug && id?.trim() !== slug) {
        // Registrar mapeo slug → ID real
        try {
          const map = JSON.parse(sessionStorage.getItem("hr_slug_map") || "{}");
          map[slug] = empleadoId;
          sessionStorage.setItem("hr_slug_map", JSON.stringify(map));
        } catch {}
        // Reemplazar URL sin recargar la página
        window.history.replaceState(null, "", `/Perfil/${slug}`);
      }

      const [dc,pc,rs,ed,rhData,clin,jer,dir] = await Promise.all([
        contactoService.getDatosByEmpleado(empleadoId).catch(()=>({})),
        contactoService.getPersonasByEmpleado(empleadoId).catch(()=>({})),
        contactoService.getRedesByEmpleado(empleadoId).catch(()=>([])),
        educacionService.getByEmpleado(empleadoId).catch(()=>({})),
        rhService.getByEmpleado(empleadoId).catch(()=>({})),
        clinicoService.getByEmpleado(empleadoId).catch(()=>({})),
        rhService.getJerarquia().catch(()=>({name:"Jerarquía",children:[]})),
        direccionService.getByEmpleado(empleadoId).catch(()=>({})),
      ]);

      setDatosContacto({ telefonoF:dc?.TelFijo||"", telefonoC:dc?.TelCelular||"", IDwhatsapp:dc?.IdWhatsApp||"", IDtelegram:dc?.IdTelegram||"", correo:dc?.ListaCorreos||"" });
      if (pc?.personalcontacto) setPersonalContacto(pc.personalcontacto);
      setRedesSociales(rs[0]?.RedesSociales || []);

      if (ed) {
        setDescripcion(ed.Descripcion||"");
        setEducationItems(ed.Educacion?.map(i=>({year:i.Fecha,title:i.Titulo,description:i.Description||i.Descripcion}))||[]);
        setExperienciaItems(ed.Experiencia?.map(i=>({year:i.Fecha,title:i.Titulo,description:i.Description||i.Descripcion}))||[]);
        setHabilidades(ed.Habilidades?.Programacion?.map(i=>({skillName:i.Titulo,porcentaje:i.Porcentaje}))||[]);
      }

      // ── PDF: guardar en ref, setear estado sin sobreescribir si hay uno nuevo ─
      const pdfRH   = rhData?.ExpedienteDigitalPDF   || null;
      const pdfClin = clin?.PDFSegurodegastosmedicos || null;
      rhPdfRef.current   = pdfRH;
      clinPdfRef.current = pdfClin;

      setRh({
        Puesto:               rhData?.Puesto           ||"",
        JefeInmediato:        rhData?.JefeInmediato    ||"",
        JefeInmediato_id:     rhData?.JefeInmediato_id ||"",
        HorarioLaboral:       rhData?.HorarioLaboral   || RH_INIT.HorarioLaboral,
        ExpedienteDigitalPDF: pdfRH,
        Departamento:         rhData?.Departamento     ||"",
        contrato_firmado:     rhData?.contrato_firmado ||false,
        tipo_contrato:        rhData?.tipo_contrato    ||"",
      });

      setExpediente({
        tipoSangre:               clin?.tipoSangre             ||"",
        Padecimientos:            clin?.Padecimientos          ||"",
        NumeroSeguroSocial:       clin?.NumeroSeguroSocial     ||"",
        Datossegurodegastos:      clin?.Segurodegastosmedicos  ||"",
        PDFSegurodegastosmedicos: pdfClin,
      });

      setDireccion({ Calle:dir?.Calle||"", NumExterior:dir?.NumExterior||"", NumInterior:dir?.NumInterior||"", Municipio:dir?.Municipio||"", Ciudad:dir?.Ciudad||"", CodigoP:dir?.CodigoP||"", lat:dir?.lat||null, lng:dir?.lng||null });
      setJerarquia(jer.jerarquia||jer);

      if (isAdmin) {
        const [todos,todosRH] = await Promise.all([
          empleadoService.getAll().catch(()=>[]),
          rhService.getAll().catch(()=>[]),
        ]);
        setListaEmpleados(todos.map(e=>{
          const r=todosRH.find(r=>(r.empleado_id?.$oid||r.empleado_id)===(e._id?.$oid||e._id));
          return {...e,Puesto:r?.Puesto||""};
        }));
      }
    } catch(err) { console.error("Error cargando perfil:",err); }
    finally { setDatosCargados(true); }
  }, [empleadoId, isAdmin]);

  useEffect(()=>{ cargarPerfil(); },[cargarPerfil]);

  const verificarPassword = async (password) => {
    setVerifyLoading(true); setVerifyError("");
    try {
      const operatorUser = sessionStorage.getItem("user_name")||"";
      const res = await fetch(`${process.env.REACT_APP_API_URL}/login`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({user:operatorUser,password}),
      });
      const data = await res.json();
      if (res.ok && data.access_token) return true;
      setVerifyError("Contraseña incorrecta. Intenta de nuevo.");
      return false;
    } catch { setVerifyError("Error de conexión."); return false; }
    finally { setVerifyLoading(false); }
  };

  const handleVerifyConfirm = async (password) => {
    const ok = await verificarPassword(password);
    if (!ok) return;
    setIsRevealed(true); setVerifyModal(false); setVerifyError("");
  };

  const handleSaveClick = async () => {
    setSaveStatus("saving"); setIsEditing(false);
    try {
      const payloadEducacion = {
        empleado_id: empleadoId,
        Descripcion: descripcion,
        Educacion:   educationItems.map(i=>({Fecha:i.year,Titulo:i.title,Descripcion:i.description})),
        Experiencia: experienciaItems.map(i=>({Fecha:i.year,Titulo:i.title,Descripcion:i.description})),
        Habilidades: {Programacion:habilidades.map(h=>({Titulo:h.skillName,Porcentaje:h.porcentaje}))},
      };

      // ── PDF: solo enviar al backend si el usuario subió uno nuevo ────────────
      // Si no hay nuevo (rhFiles vacío), mandar el PDF actual del estado
      // para que _build_payload no lo pise con null
      const rhParaGuardar = { ...rh };
      const expParaGuardar = { ...expediente };

      const saves = [
        educacionService.update(empleadoId, payloadEducacion),
        contactoService.updateDatos(empleadoId, datosContacto),
        clinicoService.update(empleadoId, expParaGuardar),
        direccionService.update(empleadoId, direccion),
      ];
      if (canViewSensitive) saves.push(rhService.update(empleadoId, rhParaGuardar));

      if (isAdmin && rh.JefeInmediato) {
        const jerarquiaFresca = await rhService.getJerarquia().then(d=>d.jerarquia||d).catch(()=>structuredClone(jerarquia));
        const jer = structuredClone(jerarquiaFresca);
        const limpiar = (nodo) => {
          if (nodo.children) { nodo.children=nodo.children.filter(h=>h.attributes?.Id!==empleadoId); nodo.children.forEach(limpiar); }
        };
        limpiar(jer);
        const buscar = (nodo,nombre) => {
          if (nodo.name===nombre) return nodo;
          for (const h of nodo.children??[]) { const f=buscar(h,nombre); if(f) return f; }
          return null;
        };
        let padre = buscar(jer,rh.JefeInmediato);
        if (!padre) { padre={name:rh.JefeInmediato,attributes:{Id:rh.JefeInmediato_id},children:[]}; jer.children=jer.children??[]; jer.children.push(padre); }
        padre.children=padre.children??[];
        padre.children.push({name:`${empleado.Nombre} ${empleado.ApelPaterno}`,attributes:{Cargo:rh.Puesto,Id:empleadoId},children:[]});
        saves.push(rhService.saveJerarquia(jer));
        setJerarquia(jer);
      }

      await Promise.all(saves);
      setSaveStatus("ok");
      setTimeout(()=>setSaveStatus(null),3000);
      // ── Recargar pero preservar PDFs del estado actual ───────────────────────
      cargarPerfil();
    } catch(err) { console.error("Error guardando:",err); setSaveStatus("error"); setTimeout(()=>setSaveStatus(null),4000); }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try { await empleadoService.deleteFull(empleadoId); navigate("/empleados"); }
    catch(err) { console.error("Error eliminando:",err); setDeleteLoading(false); setDeleteModal(false); }
  };

  const handleRHChange = (prop,value) => {
    const keys=prop.split(".");
    if(keys.length>1) setRh(p=>({...p,[keys[0]]:{...p[keys[0]],[keys[1]]:value}}));
    else setRh(p=>({...p,[prop]:value}));
  };

  if (!datosCargados||!empleado) return (
    <div className="perfil-loading"><div className="loading-ring"/><p>Cargando perfil...</p></div>
  );

  const fotoSrc = empleado.Fotografias?.[0]||empleado.Fotografia||"/default-avatar.png";

  return (
    <div className="Perfil">

      {verifyModal && (
        <VerifyPasswordModal
          onConfirm={handleVerifyConfirm}
          onCancel={()=>{setVerifyModal(false);setVerifyError("");}}
          loading={verifyLoading} error={verifyError}
        />
      )}
      {deleteModal && (
        <DeleteModal empleado={empleado} onConfirm={handleDeleteConfirm}
          onCancel={()=>setDeleteModal(false)} loading={deleteLoading} />
      )}
      {saveStatus && (
        <div className={`save-toast save-toast--${saveStatus}`}>
          {saveStatus==="saving"&&"Guardando cambios..."}
          {saveStatus==="ok"&&"✓ Cambios guardados"}
          {saveStatus==="error"&&"✗ Error al guardar"}
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="perfil-hero">
        <div className="perfil-avatar-wrap">
          <div className="perfil-avatar-ring"/>
          <img className="perfil-avatar" src={fotoSrc}
            alt={`${empleado.Nombre} ${empleado.ApelPaterno}`}
            onError={e=>{e.target.src="/default-avatar.png";}}/>
        </div>
        <div className="perfil-hero-info">
          <h1 className="perfil-nombre">{empleado.Nombre} <span>{empleado.ApelPaterno}</span></h1>
          <p className="perfil-puesto">{rh.Puesto||"Sin puesto asignado"}</p>
          {rh.JefeInmediato && <p className="perfil-jefe">Reporta a: <strong>{rh.JefeInmediato}</strong></p>}
          {rh.Departamento  && <p className="perfil-depto">{rh.Departamento}</p>}
          {rh.tipo_contrato && (
            <span className={`perfil-contrato perfil-contrato--${rh.contrato_firmado?"ok":"no"}`}>
              {rh.contrato_firmado
                ? rh.tipo_contrato==="digital"?"Contrato digital ✓":"Contrato autógrafo ✓"
                : "Contrato pendiente"}
            </span>
          )}

          {/* ── Botones con iconos ─────────────────────────────────────── */}
          <div className="perfil-actions">
            {!isRevealed && (
              <button className="emp-btn" title="Ver datos" onClick={()=>setVerifyModal(true)}>
                <MdLockOpen/>
              </button>
            )}
            {canEdit && !isEditing && (
              <button className="emp-btn emp-btn--edit" title="Editar perfil"
                onClick={()=>{ if(!isRevealed){setVerifyModal(true);return;} setIsEditing(true); }}>
                <CiEdit/>
              </button>
            )}
            {canEdit && isEditing && (
              <>
                <button className="emp-btn emp-btn--save" title="Guardar cambios"
                  onClick={handleSaveClick} disabled={saveStatus==="saving"}>
                  <CiSaveDown2/>
                </button>
                <button className="emp-btn emp-btn--cancel" title="Cancelar"
                  onClick={()=>{setIsEditing(false);cargarPerfil();}}>
                  <CiCircleRemove/>
                </button>
              </>
            )}
            {isAdmin && !isEditing && (
              <button className="emp-btn emp-btn--delete" title="Eliminar empleado"
                onClick={()=>{ if(!isRevealed){setVerifyModal(true);return;} setDeleteModal(true); }}>
                <CiTrash/>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="perfil-grid">
        <aside className="perfil-sidebar">
          <div className="section-card">
            <DescriptionRenderer isEditing={isEditing&&canEdit} descripcion={descripcion} setDescripcion={setDescripcion}/>
          </div>
          <div className={`section-card${!isRevealed?" section-card--blurred":""}`}>
            {!isRevealed&&<BlurOverlay onReveal={()=>setVerifyModal(true)}/>}
            <InfoPersonalRenderer isEditing={isEditing&&canEdit&&isRevealed} datoscontacto={datosContacto} handleInputChangedatoscontacto={(f,v)=>setDatosContacto(p=>({...p,[f]:v}))}/>
          </div>
          <div className={`section-card${!isRevealed?" section-card--blurred":""}`}>
            {!isRevealed&&<BlurOverlay onReveal={()=>setVerifyModal(true)}/>}
            <PersonasContactoRenderer isEditing={isEditing&&canEdit&&isRevealed} personalcontacto={personalContacto} handlePersonalContactoChange={(f,v)=>setPersonalContacto(p=>({...p,[f]:v}))} opcionesParentesco={catalogos.parentesco}/>
          </div>
          <div className={`section-card${!isRevealed?" section-card--blurred":""}`}>
            {!isRevealed&&<BlurOverlay onReveal={()=>setVerifyModal(true)}/>}
            <DireccionRenderer isEditing={isEditing&&canEdit&&isRevealed} direccion={direccion} onDireccionChange={(f,v)=>setDireccion(p=>({...p,[f]:v}))} lat={direccion.lat} lng={direccion.lng} onCoordsChange={(lat,lng)=>setDireccion(p=>({...p,lat,lng}))}/>
          </div>
          <div className="section-card">
            <RedesSocialesRenderer isEditing={isEditing&&canEdit} redesSociales={redesSociales} setRedesSociales={setRedesSociales}/>
          </div>
        </aside>

        <main className="perfil-main">
          <div className="section-card">
            <EducationSectionRenderer isEditing={isEditing&&canEdit} educationItems={educationItems} setEducationItems={setEducationItems}/>
          </div>
          <div className="section-card">
            <ExperienceSectionRenderer isEditing={isEditing&&canEdit} experienceItems={experienciaItems} setExperienceItems={setExperienciaItems}/>
          </div>
          <div className="section-card">
            <SkillSectionRenderer isEditing={isEditing&&canEdit} habilidades={habilidades} setHabilidades={setHabilidades}/>
          </div>
          <div className="section-card">
            <CVExportRenderer empleado={empleado} rh={rh} descripcion={descripcion} educationItems={educationItems} experienciaItems={experienciaItems} habilidades={habilidades}/>
          </div>
          {canViewSensitive && (
            <>
              <div className={`section-card section-card--sensitive${!isRevealed?" section-card--blurred":""}`}>
                {!isRevealed&&<BlurOverlay onReveal={()=>setVerifyModal(true)}/>}
                <div className="sensitive-badge">RH · Restringido</div>
                <RHSectionRenderer isEditing={isEditing&&canEdit&&isRevealed} RH={rh} handleRHChange={handleRHChange} listaEmpleados={listaEmpleados} openRHPicker={openRHPicker} empleadoEncontrado={empleado}/>
              </div>
              <div className={`section-card section-card--sensitive${!isRevealed?" section-card--blurred":""}`}>
                {!isRevealed&&<BlurOverlay onReveal={()=>setVerifyModal(true)}/>}
                <div className="sensitive-badge">Confidencial</div>
                <ExpedienteClinicoRenderer isEditing={isEditing&&canEdit&&isRevealed} expedienteclinico={expediente} setexpedienteclinico={setExpediente} openFilePicker={openClinicoPicker}/>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Perfil;