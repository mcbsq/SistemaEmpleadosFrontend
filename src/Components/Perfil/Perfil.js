import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator } from "use-file-picker/validators";
import "../Personal.css";

import { useOrg }           from "../../context/OrgContext";
import { authService }      from "../../services/authService";
import { decodeId, empleadoService } from "../../services/empleadoService";
import { perfilService, abrirAjustes, PERFIL_ACTUALIZADO } from "../../services/perfilService";
import { useTheme }         from "../../context/ThemeContext";
import { coloresGradiente } from "../../utils/gradiente";
import IconButton           from "../IconButton";
import { MisSolicitudes }   from "../SolicitudesRH";
import { abrirContactoRH }  from "../../services/solicitudesRhService";
import { AnimatePresence, motion } from "framer-motion";
import { MeshGradient }     from "@paper-design/shaders-react";
import { contactoService }  from "../../services/contactoService";
import { educacionService } from "../../services/educacionService";
import { rhService }        from "../../services/rhService";
import { clinicoService }   from "../../services/clinicoService";
import { direccionService } from "../../services/direccionService";
import { catalogoService, FALLBACK } from "../../services/catalogoService";
import {
  FiAlertTriangle, FiCheck, FiX, FiMail, FiUser, FiHome,
  FiBriefcase, FiDollarSign, FiSun, FiHeart, FiFileText, FiEyeOff, FiLoader, FiCamera, FiSettings, FiMessageSquare,
} from "react-icons/fi";

import {
  DescriptionRenderer, InfoPersonalRenderer, PersonasContactoRenderer,
  DireccionRenderer, RedesSocialesRenderer, EducationSectionRenderer,
  ExperienceSectionRenderer, SkillSectionRenderer, LaboralRenderer, CompensacionRenderer,
  ExpedienteClinicoRenderer, CVExportRenderer, FinancialSectionRenderer, NominaExternaRenderer,
  VacacionesRenderer,
} from "./renderpersonal.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const resolveToId = (slugOrId) => {
  if (!slugOrId) return slugOrId;
  if (/^[a-f0-9]{24}$/i.test(slugOrId)) return slugOrId;
  try {
    const map = JSON.parse(sessionStorage.getItem("hr_slug_map") || "{}");
    if (map[slugOrId]) return map[slugOrId];
  } catch {}
  return decodeId(slugOrId);
};

const toSlug = (nombre = "", apelPaterno = "") =>
  `${nombre} ${apelPaterno}`.normalize("NFD")
    .replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

// Placeholder de avatar como data URI — nunca depende de red, así que nunca
// puede volver a fallar ("/default-avatar.png" no existía y provocaba un
// loop infinito de onError).
const AVATAR_FALLBACK =
  "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" fill="#2a2f3d"/>' +
    '<circle cx="50" cy="38" r="18" fill="#6b7280"/>' +
    '<path d="M50 60c-22 0-34 12-34 26v6h68v-6c0-14-12-26-34-26z" fill="#6b7280"/>' +
    '</svg>'
  );

const CONTACTO_INIT = { telefonoF:"", telefonoC:"", IDwhatsapp:"", IDtelegram:"", correos:[] };
const DIR_INIT      = { Calle:"", NumExterior:"", NumInterior:"", Municipio:"", Ciudad:"", CodigoP:"", lat:null, lng:null };
const RH_INIT       = { Puesto:"", JefeInmediato:"", JefeInmediato_id:"", HorarioLaboral:{ HoraEntrada:"", HoraSalida:"", TiempoComida:"", DiasTrabajados:"" }, ExpedienteDigitalPDF:null };
const EXP_INIT      = { tipoSangre:"", Padecimientos:"", NumeroSeguroSocial:"", Datossegurodegastos:"", PDFSegurodegastosmedicos:null };

// Pestañas del perfil. Cada una aparece solo si el servidor dice que quien
// mira puede ver esa sección (GET /perfil/<id>/acceso) — ver la matriz en
// backend core/visibilidad_perfil.py. `modulo` la oculta si la empresa
// apagó ese módulo en Configuración.
const TABS = [
  { id: "resumen",      label: "Resumen",      icon: FiUser,       secciones: ["profesional"] },
  { id: "personal",     label: "Personal",     icon: FiHome,       secciones: ["contacto", "emergencia"] },
  { id: "laboral",      label: "Laboral",      icon: FiBriefcase,  secciones: ["laboral"] },
  { id: "compensacion", label: "Compensación", icon: FiDollarSign, secciones: ["compensacion"] },
  { id: "vacaciones",   label: "Vacaciones",   icon: FiSun,        secciones: ["vacaciones"], modulo: "vacaciones" },
  { id: "salud",        label: "Salud",        icon: FiHeart,      secciones: ["clinico"] },
  { id: "documentos",   label: "Documentos",   icon: FiFileText,   secciones: ["financiero"], modulo: "documentos_financieros" },
  // Solo en el perfil propio: lo que la persona le ha escrito a RH.
  { id: "solicitudes",  label: "Solicitudes",  icon: FiMessageSquare, secciones: ["propio"] },
];

// Pestaña abierta → tema que se propone al escribir a RH.
const TAB_A_SECCION_RH = { personal: "personal", laboral: "laboral", compensacion: "compensacion", vacaciones: "vacaciones", salud: "salud", documentos: "documentos" };

// Venir de una alerta del dashboard (?ir=contacto|rh|clinico) abre la pestaña.
const IR_A_TAB = { contacto: "personal", rh: "laboral", clinico: "salud" };

// Indicador de auto-guardado para las secciones que se guardan solas.
function AutoSaveBadge({ status }) {
  if (!status) return null;
  const TEXTO = { editando: "Editando…", guardando: "Guardando…", guardado: "Guardado", error: "No se pudo guardar" };
  return (
    <span className={`autosave-badge autosave-badge--${status}`} role="status">
      {status === "guardado" && <FiCheck aria-hidden="true" />}
      {status === "error" && <FiAlertTriangle aria-hidden="true" />}
      {TEXTO[status]}
    </span>
  );
}

function DeleteModal({ empleado, onConfirm, onCancel, loading }) {
  return (
    <div className="vp-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="vp-card" role="alertdialog" aria-labelledby="del-title" aria-describedby="del-desc">
        <div className="vp-icon"><FiAlertTriangle /></div>
        <h3 className="vp-title" id="del-title">Eliminar empleado</h3>
        <p className="vp-sub" id="del-desc">
          Se borrará a <strong>{empleado?.Nombre} {empleado?.ApelPaterno}</strong> con todo su expediente. Esta acción no se puede deshacer.
        </p>
        <div className="vp-actions">
          <IconButton accion="cancelar" size="lg" label="Cancelar" onClick={onCancel} disabled={loading} autoFocus />
          <button className="vp-btn-danger" onClick={onConfirm} disabled={loading}>{loading ? "Eliminando…" : "Sí, eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Perfil() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const irA = searchParams.get("ir");
  const { isModuleActive, orgConfig } = useOrg();
  const { theme, reducedMotion } = useTheme();
  const empleadoId = resolveToId(id?.trim());
  const esSuperAdmin = authService.getRole() === "SUPER_ADMIN";

  const [acceso,        setAcceso]        = useState(null);
  const [publico,       setPublico]       = useState(null);
  const [errorCarga,    setErrorCarga]    = useState("");
  const [datosCargados, setDatosCargados] = useState(false);
  const [isEditing,     setIsEditing]     = useState(false);
  const [saveStatus,    setSaveStatus]    = useState(null);
  const [rhErrores,     setRhErrores]     = useState({});
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [listaEmpleados,   setListaEmpleados]   = useState([]);
  const [catalogos,        setCatalogos]        = useState(FALLBACK);
  const [descripcion,      setDescripcion]      = useState("");
  const [educationItems,   setEducationItems]   = useState([]);
  const [experienciaItems, setExperienciaItems] = useState([]);
  const [habilidades,      setHabilidades]      = useState([]);
  const [redesSociales,    setRedesSociales]    = useState([]);
  const [datosContacto,    setDatosContacto]    = useState(CONTACTO_INIT);
  const [personalContactos, setPersonalContactos] = useState([]);
  const [direccion,        setDireccion]        = useState(DIR_INIT);
  const [rh,               setRh]               = useState(RH_INIT);
  const [expediente,       setExpediente]       = useState(EXP_INIT);
  const [jerarquia,        setJerarquia]        = useState({ name:"Jerarquía", children:[] });

  const ver    = acceso?.ver    || {};
  const editar = acceso?.editar || {};
  const rels   = acceso?.relaciones || [];
  const esRH   = rels.includes("rh");
  const esPropio = rels.includes("propio");
  const puedeEditarAlgo = Object.values(editar).some(Boolean);
  const edita = (seccion) => isEditing && !!editar[seccion];

  const tabsVisibles = useMemo(() => TABS.filter(t =>
    t.secciones.some(s => s === "propio" ? acceso?.relaciones?.includes("propio") : acceso?.ver?.[s])
    && (!t.modulo || isModuleActive(t.modulo))
  ), [acceso, isModuleActive]);

  const tabPedida = searchParams.get("tab") || IR_A_TAB[irA] || "resumen";
  const tabActiva = tabsVisibles.some(t => t.id === tabPedida) ? tabPedida : (tabsVisibles[0]?.id || "resumen");
  const irATab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab); next.delete("ir");
    setSearchParams(next, { replace: true });
  };

  // ─── PDFs: el ref guarda el valor del backend sin re-render, para no pisar
  // un PDF recién elegido al recargar ni re-enviar uno que no cambió.
  const rhPdfRef   = useRef(null);
  const clinPdfRef = useRef(null);
  const { openFilePicker: openClinicoPicker, filesContent: clinicoFiles } = useFilePicker({
    readAs:"DataURL", accept:"application/pdf", validators:[new FileAmountLimitValidator({max:1})],
  });
  const { openFilePicker: openRHPicker, filesContent: rhFiles } = useFilePicker({
    readAs:"DataURL", accept:"application/pdf", validators:[new FileAmountLimitValidator({max:1})],
  });
  useEffect(() => {
    if (rhFiles.length > 0) { setRh(p => ({ ...p, ExpedienteDigitalPDF: rhFiles })); rhPdfRef.current = rhFiles; }
  }, [rhFiles]);
  useEffect(() => {
    if (clinicoFiles.length > 0) { setExpediente(p => ({ ...p, PDFSegurodegastosmedicos: clinicoFiles })); clinPdfRef.current = clinicoFiles; }
  }, [clinicoFiles]);

  useEffect(() => { catalogoService.getAll().then(setCatalogos).catch(()=>{}); }, []);

  // ─── Carga: primero qué puede ver quien mira, luego SOLO esas secciones ───
  const cargarPerfil = useCallback(async () => {
    try {
      const [acc, pub] = await Promise.all([
        perfilService.getAcceso(empleadoId),
        perfilService.getPublico(empleadoId),
      ]);
      setAcceso(acc);
      setPublico(pub);
      setErrorCarga("");

      // URL limpia con el nombre (/Perfil/juan-perez) en vez del ID crudo.
      const slug = toSlug(pub.Nombre || "", pub.ApelPaterno || "");
      if (slug && id?.trim() !== slug) {
        try {
          const map = JSON.parse(sessionStorage.getItem("hr_slug_map") || "{}");
          map[slug] = empleadoId;
          sessionStorage.setItem("hr_slug_map", JSON.stringify(map));
        } catch {}
        window.history.replaceState(null, "", `/Perfil/${slug}${window.location.search}`);
      }

      const v = acc.ver || {};
      const nada = (x) => Promise.resolve(x);
      const [dc, pc, rs, ed, rhData, clin, dir] = await Promise.all([
        v.contacto     ? contactoService.getDatosByEmpleado(empleadoId).catch(()=>({}))    : nada({}),
        v.emergencia   ? contactoService.getPersonasByEmpleado(empleadoId).catch(()=>({})) : nada({}),
        v.contacto && isModuleActive("redes_sociales") ? contactoService.getRedesByEmpleado(empleadoId).catch(()=>([])) : nada([]),
        v.profesional  ? educacionService.getByEmpleado(empleadoId).catch(()=>({}))        : nada({}),
        v.laboral      ? rhService.getByEmpleado(empleadoId).catch(()=>({}))               : nada({}),
        v.clinico      ? clinicoService.getByEmpleado(empleadoId).catch(()=>({}))          : nada({}),
        v.contacto     ? direccionService.getByEmpleado(empleadoId).catch(()=>({}))        : nada({}),
      ]);

      // ListaCorreos era un string suelto en empleados viejos: normalizarlo
      // a la lista [{email, principal}] sin perder el dato.
      const correosCrudo = dc?.ListaCorreos;
      const correos = Array.isArray(correosCrudo)
        ? correosCrudo
        : (correosCrudo ? [{ email: correosCrudo, principal: true }] : []);
      setDatosContacto({ telefonoF:dc?.TelFijo||"", telefonoC:dc?.TelCelular||"", IDwhatsapp:dc?.IdWhatsApp||"", IDtelegram:dc?.IdTelegram||"", correos });
      setPersonalContactos(Array.isArray(pc?.Contactos) ? pc.Contactos : []);
      setRedesSociales(rs?.[0]?.RedesSociales || []);

      setDescripcion(ed?.Descripcion || "");
      setEducationItems(ed?.Educacion?.map(i=>({year:i.Fecha,title:i.Titulo,description:i.Description||i.Descripcion}))||[]);
      setExperienciaItems(ed?.Experiencia?.map(i=>({year:i.Fecha,title:i.Titulo,description:i.Description||i.Descripcion}))||[]);
      setHabilidades(ed?.Habilidades?.Programacion?.map(i=>({skillName:i.Titulo,porcentaje:i.Porcentaje}))||[]);

      const pdfRH   = rhData?.ExpedienteDigitalPDF   || null;
      const pdfClin = clin?.PDFSegurodegastosmedicos || null;
      rhPdfRef.current   = pdfRH;
      clinPdfRef.current = pdfClin;

      setRh({
        Puesto:               rhData?.Puesto           || pub.Puesto || "",
        JefeInmediato:        rhData?.JefeInmediato    || pub.JefeInmediato || "",
        JefeInmediato_id:     rhData?.JefeInmediato_id || pub.JefeInmediato_id || "",
        HorarioLaboral:       rhData?.HorarioLaboral   || RH_INIT.HorarioLaboral,
        ExpedienteDigitalPDF: pdfRH,
        Departamento:         rhData?.Departamento     || pub.Departamento || "",
        contrato_firmado:     rhData?.contrato_firmado || false,
        tipo_contrato:        rhData?.tipo_contrato    || "",
        FechaIngreso:         rhData?.FechaIngreso     || "",
        NumeroEmpleado:       rhData?.NumeroEmpleado   || "",
        CURP:                 rhData?.CURP             || "",
        RFC:                  rhData?.RFC              || "",
        NSS:                  rhData?.NSS              || "",
        EstadoCivil:          rhData?.EstadoCivil      || "",
        Nacionalidad:         rhData?.Nacionalidad     || "",
        Salario:              rhData?.Salario          || "",
        SalarioDiario:        rhData?.SalarioDiario    || "",
        SalarioDiarioIntegrado: rhData?.SalarioDiarioIntegrado || "",
        Banco:                rhData?.Banco            || "",
        CLABE:                rhData?.CLABE            || "",
        CuentaBancaria:       rhData?.CuentaBancaria   || "",
        CamposPersonalizados: rhData?.CamposPersonalizados || {},
        TipoRelacionLaboral:  rhData?.TipoRelacionLaboral || "nomina",
      });

      setExpediente({
        tipoSangre:               clin?.tipoSangre             ||"",
        Padecimientos:            clin?.Padecimientos          ||"",
        NumeroSeguroSocial:       clin?.NumeroSeguroSocial     ||"",
        Datossegurodegastos:      clin?.Segurodegastosmedicos  ||"",
        PDFSegurodegastosmedicos: pdfClin,
      });

      setDireccion({ Calle:dir?.Calle||"", NumExterior:dir?.NumExterior||"", NumInterior:dir?.NumInterior||"", Municipio:dir?.Municipio||"", Ciudad:dir?.Ciudad||"", CodigoP:dir?.CodigoP||"", lat:dir?.lat||null, lng:dir?.lng||null });

      // Solo RH asigna jefe inmediato: necesita la lista de empleados y la jerarquía.
      if (acc.editar?.laboral) {
        const [todos, todosRH, jer] = await Promise.all([
          empleadoService.getAll().catch(()=>[]),
          rhService.getAll().catch(()=>[]),
          rhService.getJerarquia().catch(()=>({name:"Jerarquía",children:[]})),
        ]);
        setJerarquia(jer.jerarquia || jer);
        setListaEmpleados(todos.map(e => {
          const r = todosRH.find(r => (r.empleado_id?.$oid || r.empleado_id) === (e._id?.$oid || e._id));
          return { ...e, _id: e._id?.$oid || e._id, Puesto: r?.Puesto || "" };
        }));
      }
    } catch (err) {
      console.error("Error cargando perfil:", err);
      setErrorCarga(err.status === 404 ? "Este empleado no existe o fue dado de baja." : "No se pudo cargar el perfil. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setDatosCargados(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

  // Cambió la foto o el nombre desde Ajustes de perfil: refrescar la tarjeta.
  useEffect(() => {
    const on = (e) => {
      if (e.detail?.empleadoId !== empleadoId) return;
      perfilService.getPublico(empleadoId).then(setPublico).catch(() => {});
    };
    window.addEventListener(PERFIL_ACTUALIZADO, on);
    return () => window.removeEventListener(PERFIL_ACTUALIZADO, on);
  }, [empleadoId]);

  // Dirección del cambio de pestaña: el panel entra desde el lado correcto.
  const tabPrevia = useRef(null);

  // Desde una alerta del dashboard: RH llega directo a editar la sección.
  useEffect(() => {
    if (irA && editar[tabActiva === "personal" ? "contacto" : tabActiva === "salud" ? "clinico" : "laboral"]) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceso]);

  // ── Auto-guardado ──────────────────────────────────────────────────────
  // Contacto, contactos de emergencia y redes se guardan solos ~1 s después
  // de cada cambio mientras se edita — el cliente reportó que la info "se
  // perdía" cuando dependía de un solo botón. El gate en isEditing evita que
  // la carga inicial dispare un guardado fantasma.
  const [autoSaveStatus, setAutoSaveStatus] = useState({});
  const autoSaveTimers = useRef({});
  const useAutoSave = (key, value, saveFn, seccion) => {
    const primerRender = useRef(true);
    useEffect(() => {
      if (primerRender.current) { primerRender.current = false; return; }
      if (!isEditing || !editar[seccion]) return;
      clearTimeout(autoSaveTimers.current[key]);
      setAutoSaveStatus(s => ({ ...s, [key]: "editando" }));
      autoSaveTimers.current[key] = setTimeout(async () => {
        setAutoSaveStatus(s => ({ ...s, [key]: "guardando" }));
        try {
          await saveFn(value);
          setAutoSaveStatus(s => ({ ...s, [key]: "guardado" }));
          setTimeout(() => setAutoSaveStatus(s => (s[key] === "guardado" ? { ...s, [key]: null } : s)), 2000);
        } catch {
          setAutoSaveStatus(s => ({ ...s, [key]: "error" }));
        }
      }, 900);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
  };
  useAutoSave("contacto",   datosContacto,     (v) => contactoService.updateDatos(empleadoId, v),   "contacto");
  useAutoSave("redes",      redesSociales,     (v) => contactoService.updateRedes(empleadoId, v),   "contacto");

  // ── Listas que se capturan en pop-up (experiencia, educación, habilidades,
  // contactos de emergencia): se guardan al confirmar el pop-up, sin pasar
  // por "Editar perfil". El backend recibe el documento completo de
  // educación, así que se arma con lo que hay más lo que cambió.
  const guardarProfesional = async (cambios) => {
    const edu = cambios.educacion   ?? educationItems;
    const exp = cambios.experiencia ?? experienciaItems;
    const hab = cambios.habilidades ?? habilidades;
    await educacionService.update(empleadoId, {
      empleado_id: empleadoId,
      Descripcion: descripcion,
      Educacion:   edu.map(i => ({ Fecha: i.year, Titulo: i.title, Descripcion: i.description })),
      Experiencia: exp.map(i => ({ Fecha: i.year, Titulo: i.title, Descripcion: i.description })),
      Habilidades: { Programacion: hab.map(h => ({ Titulo: h.skillName, Porcentaje: h.porcentaje })) },
    });
    if (cambios.educacion)   setEducationItems(edu);
    if (cambios.experiencia) setExperienciaItems(exp);
    if (cambios.habilidades) setHabilidades(hab);
  };
  const guardarEmergencia = async (lista) => {
    await contactoService.updatePersona(empleadoId, lista);
    setPersonalContactos(lista);
  };

  const handleSaveClick = async () => {
    setSaveStatus("saving"); setRhErrores({});
    try {
      const saves = [];
      if (editar.profesional) {
        saves.push(educacionService.update(empleadoId, {
          empleado_id: empleadoId,
          Descripcion: descripcion,
          Educacion:   educationItems.map(i=>({Fecha:i.year,Titulo:i.title,Descripcion:i.description})),
          Experiencia: experienciaItems.map(i=>({Fecha:i.year,Titulo:i.title,Descripcion:i.description})),
          Habilidades: {Programacion:habilidades.map(h=>({Titulo:h.skillName,Porcentaje:h.porcentaje}))},
        }));
      }
      if (editar.clinico)  saves.push(clinicoService.update(empleadoId, { ...expediente }));
      if (editar.contacto) saves.push(direccionService.update(empleadoId, direccion));

      if (editar.laboral || editar.compensacion) {
        // RH primero y por separado: si trae CURP/RFC/CLABE inválidos hay que
        // marcar el campo exacto y NO tocar la jerarquía.
        try {
          await rhService.update(empleadoId, { ...rh });
          // La tarjeta de arriba (puesto · área) refleja lo recién guardado.
          setPublico(p => (p ? { ...p, Puesto: rh.Puesto, Departamento: rh.Departamento } : p));
        } catch (err) {
          if (err.campos) {
            setRhErrores(err.campos);
            const enCompensacion = Object.keys(err.campos).some(k => ["CLABE", "CuentaBancaria"].includes(k));
            irATab(enCompensacion ? "compensacion" : "laboral");
            // Llevar el foco al primer campo marcado: el usuario ve qué arreglar sin buscarlo.
            setTimeout(() => {
              const el = document.querySelector('.Perfil [aria-invalid="true"]');
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              el?.focus({ preventScroll: true });
            }, 120);
          }
          throw err;
        }
        if (rh.JefeInmediato && publico) {
          const jerarquiaFresca = await rhService.getJerarquia().then(d=>d.jerarquia||d).catch(()=>structuredClone(jerarquia));
          const jer = structuredClone(jerarquiaFresca);
          const limpiar = (nodo) => {
            if (nodo.children) { nodo.children = nodo.children.filter(h=>h.attributes?.Id!==empleadoId); nodo.children.forEach(limpiar); }
          };
          limpiar(jer);
          const buscar = (nodo, nombre) => {
            if (nodo.name === nombre) return nodo;
            for (const h of nodo.children ?? []) { const f = buscar(h, nombre); if (f) return f; }
            return null;
          };
          let padre = buscar(jer, rh.JefeInmediato);
          if (!padre) { padre = {name:rh.JefeInmediato,attributes:{Id:rh.JefeInmediato_id},children:[]}; jer.children = jer.children ?? []; jer.children.push(padre); }
          padre.children = padre.children ?? [];
          padre.children.push({name:`${publico.Nombre} ${publico.ApelPaterno}`,attributes:{Cargo:rh.Puesto,Id:empleadoId},children:[]});
          saves.push(rhService.saveJerarquia(jer));
          setJerarquia(jer);
        }
      }

      await Promise.all(saves);
      setIsEditing(false);
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus(null), 3000);
      cargarPerfil();
    } catch (err) {
      console.error("Error guardando:", err);
      setSaveStatus(err.campos ? "invalid" : "error");
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const cancelarEdicion = () => { setIsEditing(false); setRhErrores({}); cargarPerfil(); };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try { await empleadoService.deleteFull(empleadoId); navigate("/empleados"); }
    catch (err) { console.error("Error eliminando:", err); setDeleteLoading(false); setDeleteModal(false); }
  };

  const handleRHChange = (prop, value) => {
    const keys = prop.split(".");
    if (keys.length > 1) setRh(p => ({ ...p, [keys[0]]: { ...p[keys[0]], [keys[1]]: value } }));
    else setRh(p => ({ ...p, [prop]: value }));
    if (rhErrores[prop]) setRhErrores(e => { const n = { ...e }; delete n[prop]; return n; });
  };

  // ─── Estados de carga / error ─────────────────────────────────────────────
  if (!datosCargados) return (
    <div className="perfil-loading"><div className="loading-ring"/><p>Cargando perfil…</p></div>
  );
  if (errorCarga || !publico) return (
    <div className="perfil-loading" role="alert">
      <FiAlertTriangle size={28} aria-hidden="true" />
      <p>{errorCarga || "No se pudo cargar el perfil."}</p>
      <IconButton accion="volver" label="Volver" onClick={() => navigate(-1)} />
    </div>
  );

  const empleado = publico;
  const fotoSrc  = empleado.Fotografias?.[0] || AVATAR_FALLBACK;
  const nombreCompleto = `${empleado.Nombre} ${empleado.ApelPaterno}`;
  const nombreMostrado = empleado.NombrePreferido || nombreCompleto;
  const idxTab = tabsVisibles.findIndex(t => t.id === tabActiva);
  const dirTab = tabPrevia.current == null || idxTab >= tabPrevia.current ? 1 : -1;
  tabPrevia.current = idxTab;
  const soloPublico = !esPropio && !esRH && tabsVisibles.length <= 1;

  return (
    <div className="Perfil">
      {deleteModal && (
        <DeleteModal empleado={empleado} onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(false)} loading={deleteLoading} />
      )}
      {saveStatus && (
        <div className={`save-toast save-toast--${saveStatus === "invalid" ? "error" : saveStatus}`} role="status">
          {saveStatus === "saving"  && (<><FiLoader className="spin" aria-hidden="true"/>Guardando cambios…</>)}
          {saveStatus === "ok"      && (<><FiCheck aria-hidden="true"/>Cambios guardados</>)}
          {saveStatus === "invalid" && (<><FiAlertTriangle aria-hidden="true"/>Revisa los campos marcados</>)}
          {saveStatus === "error"   && (<><FiX aria-hidden="true"/>No se pudo guardar. Intenta de nuevo.</>)}
        </div>
      )}

      {/* ── Hero estilo red social: portada viva + avatar encimado ───────── */}
      <header className="perfil-hero perfil-hero--social">
        <div className="perfil-cover" aria-hidden="true">
          {reducedMotion ? <div className="perfil-cover__static" /> : (
            <MeshGradient className="perfil-cover__mesh"
              colors={coloresGradiente(orgConfig, theme)}
              speed={0.22} distortion={0.8} swirl={0.4} grainMixer={0} grainOverlay={0.04}
              maxPixelCount={900 * 260} fit="cover" />
          )}
        </div>
        <div className="perfil-hero-body">
          <div className="perfil-avatar-wrap">
            {empleado.Fotografias?.[0] ? (
              <img className="perfil-avatar" src={fotoSrc} alt={nombreMostrado}
                onError={e => {
                  if (e.target.dataset.fallback) return;
                  e.target.dataset.fallback = "1";
                  e.target.src = AVATAR_FALLBACK;
                }}/>
            ) : (
              <span className="perfil-avatar perfil-avatar--inicial" role="img" aria-label={nombreMostrado}>
                {nombreMostrado.trim()[0]?.toUpperCase()}
              </span>
            )}
            {esPropio && (
              <button type="button" className="perfil-avatar-edit" onClick={() => abrirAjustes("perfil")} aria-label="Cambiar foto de perfil">
                <FiCamera aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="perfil-hero-info">
            <h1 className="perfil-nombre">{nombreMostrado}</h1>
            {empleado.NombrePreferido && (esPropio || esRH) && (
              <p className="perfil-legal">Nombre legal: {nombreCompleto}</p>
            )}
            {empleado.Titular
              ? <p className="perfil-titular">{empleado.Titular}</p>
              : esPropio && <button type="button" className="perfil-titular perfil-titular--vacio" onClick={() => abrirAjustes("perfil")}>Agrega una frase sobre ti</button>}
            <dl className="perfil-meta">
              <div><dt>Puesto</dt><dd title={empleado.Puesto}>{empleado.Puesto || "Sin puesto asignado"}</dd></div>
              {empleado.Departamento && (<div><dt>Área</dt><dd title={empleado.Departamento}>{empleado.Departamento}</dd></div>)}
              {empleado.JefeInmediato && (
                <div>
                  <dt>Reporta a</dt>
                  <dd>
                    {empleado.JefeInmediato_id
                      ? <Link to={`/Perfil/${empleado.JefeInmediato_id}`}>{empleado.JefeInmediato}</Link>
                      : empleado.JefeInmediato}
                  </dd>
                </div>
              )}
              {empleado.CorreoLaboral && (
                <div><dt>Correo</dt><dd><a href={`mailto:${empleado.CorreoLaboral}`} title={empleado.CorreoLaboral}><FiMail aria-hidden="true"/>{empleado.CorreoLaboral}</a></dd></div>
              )}
            </dl>
            {ver.laboral && rh.tipo_contrato && (
              <span className={`perfil-contrato perfil-contrato--${rh.contrato_firmado ? "ok" : "no"}`}>
                {rh.contrato_firmado ? (rh.tipo_contrato === "digital" ? "Contrato firmado digitalmente" : "Contrato firmado en papel") : "Contrato pendiente de firma"}
              </span>
            )}
          </div>

          {(puedeEditarAlgo || esSuperAdmin || esPropio) && (
            <div className="perfil-actions icon-btn-group">
              {esPropio && !isEditing && (
                <IconButton icon={FiMessageSquare} size="lg" label="Escribir a RH" onClick={() => abrirContactoRH({ seccion: TAB_A_SECCION_RH[tabActiva] })} />
              )}
              {esPropio && !isEditing && (
                <IconButton icon={FiSettings} size="lg" label="Ajustes de perfil" onClick={() => abrirAjustes("perfil")} />
              )}
              {puedeEditarAlgo && !isEditing && (
                <IconButton accion="editar" size="lg" label={esPropio && !esRH ? "Editar mi información" : "Editar perfil"} onClick={() => setIsEditing(true)} />
              )}
              {isEditing && (
                <>
                  <IconButton accion="guardar" size="lg" label="Guardar cambios" busy={saveStatus === "saving"} onClick={handleSaveClick} />
                  <IconButton accion="cancelar" size="lg" label="Cancelar" onClick={cancelarEdicion} />
                </>
              )}
              {esSuperAdmin && esRH && !isEditing && !esPropio && (
                <IconButton accion="eliminar" size="lg" label="Eliminar empleado" onClick={() => setDeleteModal(true)} />
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Pestañas ─────────────────────────────────────────────────────── */}
      {tabsVisibles.length > 1 && (
        <nav className="perfil-tabs" role="tablist" aria-label="Secciones del perfil">
          {tabsVisibles.map(t => (
            <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tabActiva === t.id}
              aria-controls={`panel-${t.id}`} tabIndex={tabActiva === t.id ? 0 : -1}
              className={`perfil-tab${tabActiva === t.id ? " perfil-tab--active" : ""}`}
              onClick={() => irATab(t.id)}
              onKeyDown={e => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const i = tabsVisibles.findIndex(x => x.id === t.id);
                const sig = tabsVisibles[(i + (e.key === "ArrowRight" ? 1 : -1) + tabsVisibles.length) % tabsVisibles.length];
                irATab(sig.id);
                document.getElementById(`tab-${sig.id}`)?.focus();
              }}>
              {tabActiva === t.id && (
                <motion.span layoutId="perfil-tab-indicator" className="perfil-tab-indicator"
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
              )}
              <t.icon aria-hidden="true"/>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {soloPublico && (
        <p className="perfil-privacy-note"><FiEyeOff aria-hidden="true"/>
          Estás viendo el perfil público de {empleado.Nombre}. Sus datos personales, laborales y de nómina solo los ven {empleado.Nombre}, su jefe directo y Recursos Humanos.
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
      <motion.section key={tabActiva} className="perfil-panel" role="tabpanel" id={`panel-${tabActiva}`} aria-labelledby={`tab-${tabActiva}`}
        initial={{ opacity: 0, x: 24 * dirTab, filter: "blur(4px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } }}
        exit={{ opacity: 0, x: -16 * dirTab, filter: "blur(3px)" }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
        {tabActiva === "resumen" && (
          <div className="perfil-grid">
            <aside className="perfil-sidebar">
              <div className="section-card">
                <DescriptionRenderer isEditing={edita("profesional")} descripcion={descripcion} setDescripcion={setDescripcion}/>
              </div>
              <div className="section-card">
                <SkillSectionRenderer habilidades={habilidades} puedeEditar={edita("profesional")} onSave={(l) => guardarProfesional({ habilidades: l })}/>
              </div>
            </aside>
            <div className="perfil-main">
              <div className="section-card">
                <ExperienceSectionRenderer experienceItems={experienciaItems} puedeEditar={edita("profesional")} onSave={(l) => guardarProfesional({ experiencia: l })}/>
              </div>
              <div className="section-card">
                <EducationSectionRenderer educationItems={educationItems} puedeEditar={edita("profesional")} onSave={(l) => guardarProfesional({ educacion: l })}/>
              </div>
              {editar.profesional && (
                <div className="section-card">
                  <CVExportRenderer empleado={empleado} rh={rh} descripcion={descripcion} educationItems={educationItems} experienciaItems={experienciaItems} habilidades={habilidades}/>
                </div>
              )}
            </div>
          </div>
        )}

        {tabActiva === "personal" && (
          <div className="perfil-cols">
            {ver.contacto && (
              <div className="section-card">
                <AutoSaveBadge status={autoSaveStatus.contacto} />
                <InfoPersonalRenderer isEditing={edita("contacto")} datoscontacto={datosContacto} handleInputChangedatoscontacto={(f,v)=>setDatosContacto(p=>({...p,[f]:v}))}/>
              </div>
            )}
            {ver.emergencia && (
              <div className="section-card">
                <PersonasContactoRenderer personalcontactos={personalContactos} puedeEditar={edita("emergencia")} onSave={guardarEmergencia} opcionesParentesco={catalogos.parentesco}/>
              </div>
            )}
            {ver.contacto && (
              <div className="section-card perfil-cols-full">
                <DireccionRenderer isEditing={edita("contacto")} direccion={direccion} onDireccionChange={(f,v)=>setDireccion(p=>({...p,[f]:v}))} lat={direccion.lat} lng={direccion.lng} onCoordsChange={(lat,lng)=>setDireccion(p=>({...p,lat,lng}))}/>
              </div>
            )}
            {ver.contacto && isModuleActive("redes_sociales") && (
              <div className="section-card perfil-cols-full">
                <AutoSaveBadge status={autoSaveStatus.redes} />
                <RedesSocialesRenderer isEditing={edita("contacto")} redesSociales={redesSociales} setRedesSociales={setRedesSociales}/>
              </div>
            )}
            {esPropio && !esRH && (
              <p className="perfil-cols-full field-hint">
                Estos datos son tuyos y puedes actualizarlos cuando cambien. Recursos Humanos recibe un aviso de cada cambio.
              </p>
            )}
          </div>
        )}

        {tabActiva === "laboral" && (
          <div className="section-card">
            <LaboralRenderer isEditing={edita("laboral")} puedeEditar={!!editar.laboral} esPropio={esPropio} RH={rh} handleRHChange={handleRHChange}
              listaEmpleados={listaEmpleados} openRHPicker={openRHPicker} empleadoEncontrado={empleado}
              errores={rhErrores} nssClinico={expediente.NumeroSeguroSocial}/>
          </div>
        )}

        {tabActiva === "compensacion" && (
          <div className="section-card">
            <CompensacionRenderer isEditing={edita("compensacion")} puedeEditar={!!editar.compensacion} esPropio={esPropio} RH={rh} handleRHChange={handleRHChange}
              errores={rhErrores} empleadoId={empleadoId} mostrarPrestamos={isModuleActive("prestamos")}/>
          </div>
        )}

        {tabActiva === "vacaciones" && (
          <div className="section-card">
            <VacacionesRenderer empleadoId={empleadoId} isOwnProfile={esPropio} puedeVer={ver.vacaciones} modoEdicion={isEditing} />
          </div>
        )}

        {tabActiva === "salud" && (
          <div className="section-card">
            <ExpedienteClinicoRenderer isEditing={edita("clinico")} expedienteclinico={expediente} setexpedienteclinico={setExpediente} openFilePicker={openClinicoPicker}/>
          </div>
        )}

        {tabActiva === "solicitudes" && (
          <div className="section-card"><MisSolicitudes /></div>
        )}

        {tabActiva === "documentos" && (
          <div className="section-card">
            <FinancialSectionRenderer empleadoId={empleadoId} tipoRelacionLaboral={rh?.TipoRelacionLaboral} isOwnProfile={esPropio} modoEdicion={isEditing} periodoInicial={searchParams.get("periodo") || undefined} />
            <NominaExternaRenderer empleadoId={empleadoId} />
          </div>
        )}
      </motion.section>
      </AnimatePresence>
    </div>
  );
}

export default Perfil;
