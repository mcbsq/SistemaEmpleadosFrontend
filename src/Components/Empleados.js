import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { avisar } from "../services/dialogo";
import "./Empleados.css";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import IconButton from "./IconButton";
import { Modal, ModalBody } from "reactstrap";
import SysModal from "./Modal";
import {
  CiFacebook, CiLinkedin, CiYoutube,
  CiUser, CiSearch, CiFileOn, CiBoxList, CiFolderOn
} from "react-icons/ci";
import { FiCheck, FiX, FiUsers, FiUserCheck, FiUserX, FiGrid, FiChevronUp, FiChevronDown, FiArrowRight, FiUploadCloud } from "react-icons/fi";
import {
  FaInstagram, FaTiktok, FaPlus,
  FaChevronLeft, FaChevronRight, FaFileExcel, FaGithub,
  FaUserSlash, FaWhatsapp, FaTelegram, FaEnvelope,
  FaPhone, FaTimes
} from "react-icons/fa";
import { useFilePicker } from "use-file-picker";
import * as XLSX from "xlsx";

import { empleadoService } from "../services/empleadoService";
import { contactoService }  from "../services/contactoService";
import { educacionService } from "../services/educacionService";
import { clinicoService }   from "../services/clinicoService";
import { rhService }        from "../services/rhService";
import { usuarioService }   from "../services/usuarioService";
import { direccionService } from "../services/direccionService";
import { catalogoService, FALLBACK } from "../services/catalogoService";
import { authService } from "../services/authService";
import { useOrg } from "../context/OrgContext";
import { correoPrincipal } from "../utils/correos";
// Genera slug URL-friendly desde nombre y registra el mapeo slug→id
const toSlug = (str = "") =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
     .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

const buildProfileUrl = (id, nombre, apelPaterno) => {
  const slug = toSlug(`${nombre} ${apelPaterno}`) || id;
  try {
    const map = JSON.parse(sessionStorage.getItem("hr_slug_map") || "{}");
    map[slug] = id;
    sessionStorage.setItem("hr_slug_map", JSON.stringify(map));
  } catch {}
  return `/Perfil/${slug}`;
};



// ─── Constantes ───────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8;

// Solo 4 tabs — la columna de expediente aparece en todas
const TABS = [
  { id: 1, label: "General"       },
  { id: 2, label: "Datos Básicos" },
  { id: 3, label: "Direcciones"   },
  { id: 4, label: "Contactos"     },
];

const EXP_SUBTABS = [
  { id: "rh",          label: "RH"          },
  { id: "clinico",     label: "Clínico"     },
  { id: "familia",     label: "Familia"     },
  { id: "experiencia", label: "Experiencia" },
  { id: "educacion",   label: "Educación"   },
  { id: "skills",      label: "Skills"      },
];

const REDES_META = {
  facebook:  { icon: <CiFacebook />,  color: "#1877F2" },
  instagram: { icon: <FaInstagram />, color: "#E1306C" },
  linkedin:  { icon: <CiLinkedin />,  color: "#0A66C2" },
  youtube:   { icon: <CiYoutube />,   color: "#FF0000" },
  tiktok:    { icon: <FaTiktok />,    color: "#888"    },
  github:    { icon: <FaGithub />,    color: "#aaa"    },
};

const TIPOS_SANGRE = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

const EMP_INIT  = { _id:"", Nombre:"", ApelPaterno:"", ApelMaterno:"", FecNacimiento:"" };
const USER_INIT = { user:"", password:"", email:"" };
const DIR_INIT  = { Calle:"", NumExterior:"", NumInterior:"", Colonia:"", Manzana:"", Lote:"", Municipio:"", Ciudad:"", CodigoP:"", Pais:"México" };
// Orden y etiquetas del domicilio; qué es obligatorio lo decide cada empresa
// (Configuración → Expediente). Default igual que el backend.
const CAMPOS_DIRECCION = [
  {label:"Calle",field:"Calle",span:true},
  {label:"Núm. exterior",field:"NumExterior"},
  {label:"Núm. interior",field:"NumInterior"},
  {label:"Colonia",field:"Colonia"},
  {label:"Código postal",field:"CodigoP"},
  {label:"Manzana",field:"Manzana"},
  {label:"Lote",field:"Lote"},
  {label:"Municipio / alcaldía",field:"Municipio"},
  {label:"Estado",field:"Ciudad"},
];
export const REGLAS_DIRECCION_DEFAULT = {
  Calle:"obligatorio", NumExterior:"obligatorio", NumInterior:"opcional", Colonia:"obligatorio",
  Manzana:"opcional", Lote:"opcional", Municipio:"obligatorio", Ciudad:"obligatorio", CodigoP:"obligatorio",
};
const DC_INIT   = { TelFijo:"", TelCelular:"", IdWhatsApp:"", IdTelegram:"", ListaCorreos:"" };

const getId = (item) => item?._id?.$oid || item?._id || "";

// Antigüedad legible (ej. "2 años 3 meses") — patrón estándar de directorios
// de RH de mercado, calculado a partir de FechaIngreso sin guardar un campo
// redundante en la base de datos.
const formatAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return "";
  const ingreso = new Date(`${fechaIngreso}T00:00:00`);
  if (isNaN(ingreso.getTime())) return "";
  const hoy = new Date();
  let meses = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());
  if (hoy.getDate() < ingreso.getDate()) meses -= 1;
  if (meses < 0) return "";
  const anios = Math.floor(meses / 12);
  const restoMeses = meses % 12;
  if (anios === 0) return `${restoMeses} ${restoMeses === 1 ? "mes" : "meses"}`;
  if (restoMeses === 0) return `${anios} ${anios === 1 ? "año" : "años"}`;
  return `${anios} ${anios === 1 ? "año" : "años"} ${restoMeses} ${restoMeses === 1 ? "mes" : "meses"}`;
};

const formatTel = (raw = "") => {
  const d = raw.replace(/\D/g,"").slice(0,10);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0,2)} ${d.slice(2)}`;
  return `${d.slice(0,2)} ${d.slice(2,6)} ${d.slice(6)}`;
};

// ─── AvatarCircle ─────────────────────────────────────────────────────────────
const AvatarCircle = ({ nombre = "", foto = null, size = 38, onClick }) => {
  const inicial    = (nombre.trim()[0] || "?").toUpperCase();
  const colors     = ["av-a","av-b","av-c","av-d","av-e"];
  const colorClass = colors[inicial.charCodeAt(0) % colors.length];
  return (
    <div className="ea-wrap" style={{ width:size, height:size, cursor: onClick ? "pointer":"default" }} onClick={onClick}>
      {foto && (
        <img src={foto} alt={nombre} className="ea-img" style={{width:size,height:size}}
          onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}} />
      )}
      <div className={`ea-initial ${colorClass}`}
        style={{width:size,height:size,fontSize:size*0.38,display:foto?"none":"flex"}}>
        {inicial}
      </div>
    </div>
  );
};

// ─── IdentityCell — identidad persistente en todas las pestañas ──────────────
// Patrón estándar de directorios de personal (BambooHR, Personio, Factorial):
// en la pestaña principal, avatar + nombre + puesto; en las demás, modo
// compacto: solo el avatar, con hover-card (también al enfocar con teclado)
// que muestra nombre y puesto sin ocupar ancho de columna.
const IdentityCell = ({ item, compact = false }) => {
  const id   = getId(item);
  const full = `${item.Nombre||""} ${item.ApelPaterno||""} ${item.ApelMaterno||""}`.trim();
  const foto = item.Fotografias?.[0] || null;
  const sub  = item._puesto || item.Cargo || "";

  if (compact) {
    return (
      <td className="emp-td emp-td--identity emp-td--identity-compact">
        <Link
          to={buildProfileUrl(id, item.Nombre||"", item.ApelPaterno||"")}
          className="emp-identity emp-identity--compact"
          aria-label={`Abrir perfil de ${full}`}
        >
          <AvatarCircle nombre={full} foto={foto} size={36} />
          <span className="emp-hovercard" role="tooltip">
            <span className="emp-identity-name">{full || "Sin nombre"}</span>
            {sub && <span className="emp-identity-sub">{sub}</span>}
          </span>
        </Link>
      </td>
    );
  }

  return (
    <td className="emp-td emp-td--identity">
      <Link
        to={buildProfileUrl(id, item.Nombre||"", item.ApelPaterno||"")}
        className="emp-identity"
        aria-label={`Abrir perfil de ${full}`}
      >
        <AvatarCircle nombre={full} foto={foto} size={36} />
        <span className="emp-identity-text">
          <span className="emp-identity-name">{full || "Sin nombre"}</span>
          {sub && <span className="emp-identity-sub">{sub}</span>}
        </span>
      </Link>
    </td>
  );
};

// ─── ContratoChip ─────────────────────────────────────────────────────────────
const ContratoChip = ({ firmado, tipo }) => (
  <span className={`emp-contrato emp-contrato--${firmado?"ok":"no"}`}>
    {firmado
      ? <>{tipo==="digital" ? "Digital" : tipo==="autografa" ? "Autógrafa" : "Firmado"} <FiCheck style={{ verticalAlign: "-2px" }} /></>
      : "Pendiente"}
  </span>
);

// ─── ContactoIcons ────────────────────────────────────────────────────────────
const ContactoIcons = ({ dc }) => {
  if (!dc) return <span className="emp-dim">—</span>;
  const items = [
    dc.TelCelular   && { href:`tel:${dc.TelCelular}`,                                              icon:<FaPhone />,    cls:"",     title:dc.TelCelular },
    dc.IdWhatsApp   && { href:`https://wa.me/${dc.IdWhatsApp.replace(/\D/g,"")}`, target:"_blank",  icon:<FaWhatsapp />, cls:"wa",   title:dc.IdWhatsApp },
    dc.IdTelegram   && { href:`https://t.me/${dc.IdTelegram}`,                    target:"_blank",  icon:<FaTelegram />, cls:"tg",   title:dc.IdTelegram },
    correoPrincipal(dc.ListaCorreos) && { href:`mailto:${correoPrincipal(dc.ListaCorreos)}`,        icon:<FaEnvelope />, cls:"mail", title:correoPrincipal(dc.ListaCorreos) },
  ].filter(Boolean);
  if (!items.length) return <span className="emp-dim">Sin datos</span>;
  return (
    <div className="emp-contact-row">
      {items.map((it,i) => (
        <a key={i} href={it.href} target={it.target} rel="noopener noreferrer"
          className={`emp-icon-btn emp-icon-btn--${it.cls||"phone"}`} title={it.title}>
          {it.icon}
        </a>
      ))}
    </div>
  );
};

// ─── RedSocialLink ────────────────────────────────────────────────────────────
const RedSocialLink = ({ red }) => {
  const key  = (red.redSocialSeleccionada||"").toLowerCase();
  const meta = REDES_META[key];
  if (!meta) return null;
  const url  = red.UrlRedSocial || red.NombreRedSocial || "#";
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="emp-social-btn" title={red.NombreRedSocial||url} style={{color:meta.color}}>
      {meta.icon}
    </a>
  );
};

// ─── DireccionCell (lazy, renderiza celdas <td> separadas) ───────────────────
function DireccionCell({ empleadoId }) {
  const [dir,     setDir]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empleadoId) { setLoading(false); return; }
    direccionService.getByEmpleado(empleadoId)
      .then(d => setDir(d && !d.error ? d : null))
      .catch(() => setDir(null))
      .finally(() => setLoading(false));
  }, [empleadoId]);

  if (loading) return <><td className="emp-td" colSpan={5}><span className="emp-dim">Cargando dirección…</span></td></>;
  if (!dir)    return <><td className="emp-td" colSpan={5}><span className="emp-dim">Sin dirección registrada</span></td></>;

  // Domicilio completo: calle, números, y manzana/lote cuando existen.
  const calle = [
    dir.Calle,
    dir.NumExterior,
    dir.NumInterior ? `Int. ${dir.NumInterior}` : "",
    dir.Manzana     ? `Mz. ${dir.Manzana}`      : "",
    dir.Lote        ? `Lt. ${dir.Lote}`         : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <td className="emp-td">{calle || "—"}</td>
      <td className="emp-td">{dir.Municipio || "—"}</td>
      <td className="emp-td">{dir.Ciudad    || "—"}</td>
      <td className="emp-td emp-td--num">{dir.CodigoP || "—"}</td>
      <td className="emp-td">{dir.Pais || "—"}</td>
    </>
  );
}

// ─── ExpedienteModal — solo lectura con tabs ──────────────────────────────────
function ExpedienteModal({ empleado, rhItem, clinItem, pcItem, edItem, onClose }) {
  const [tab, setTab] = useState("rh");
  if (!empleado) return null;

  const id    = getId(empleado);
  const full  = `${empleado.Nombre||""} ${empleado.ApelPaterno||""} ${empleado.ApelMaterno||""}`.trim();
  const foto  = empleado.Fotografias?.[0] || null;
  const puesto= rhItem?.Puesto || empleado._puesto || "";
  const depto = rhItem?.Departamento || empleado._departamento || "";

  // Qué secciones tienen datos — se refleja como punto de estado en cada tab
  // para que el admin vea de un vistazo qué falta por completar.
  const seccionCompleta = {
    rh:          !!rhItem,
    clinico:     !!clinItem,
    familia:     !!pcItem?.Contactos?.length,
    experiencia: !!(edItem?.Experiencia?.length),
    educacion:   !!(edItem?.Educacion?.length),
    skills:      !!(edItem?.Habilidades?.Programacion?.length),
  };

  // Helpers de lectura
  const Field = ({ label, value }) => (
    <div className="exp-field">
      <span className="exp-field-label">{label}</span>
      <span className="exp-field-value">{value || <span className="emp-dim">Sin registrar</span>}</span>
    </div>
  );

  const EmptySection = ({ texto }) => (
    <div className="exp-empty">
      <p className="emp-dim">{texto}</p>
      <Link to={buildProfileUrl(id, empleado.Nombre||"", empleado.ApelPaterno||"")} className="exp-empty-link">
        Completar en el perfil <FiArrowRight aria-hidden="true" className="btn-trail-icon" />
      </Link>
    </div>
  );

  return (
    <Modal isOpen toggle={onClose} size="xl" centered className="exp-modal"
      aria-label={`Expediente de ${full}`}>

      {/* ── Header ── */}
      <div className="exp-header">
        <AvatarCircle nombre={full} foto={foto} size={56} />
        <div className="exp-identity">
          <h3 className="exp-name">{full}</h3>
          <div className="exp-meta">
            {puesto && <span className="emp-chip">{puesto}</span>}
            {depto  && <span className="emp-chip">{depto}</span>}
            <ContratoChip firmado={empleado._contrato_firmado} tipo={empleado._tipo_contrato} />
          </div>
        </div>
        <button className="exp-close-btn" onClick={onClose} aria-label="Cerrar expediente">
          <FaTimes aria-hidden="true" />
        </button>
      </div>

      {/* ── Sub-tabs con indicador de completitud ── */}
      <div className="exp-tabs" role="tablist" aria-label="Secciones del expediente">
        {EXP_SUBTABS.map(s => (
          <button key={s.id}
            role="tab"
            aria-selected={tab===s.id}
            className={`exp-tab${tab===s.id?" exp-tab--active":""}`}
            onClick={() => setTab(s.id)}>
            <span className={`exp-tab-dot${seccionCompleta[s.id]?" exp-tab-dot--ok":""}`}
              aria-hidden="true" />
            {s.label}
            <span className="sr-only">
              {seccionCompleta[s.id] ? " (con información)" : " (sin información)"}
            </span>
          </button>
        ))}
      </div>

      {/* ── Contenido (solo lectura) ── */}
      <ModalBody className="exp-body">

        {tab === "rh" && (
          <div className="exp-section" role="tabpanel" aria-label="Información de RH">
            {!rhItem ? <EmptySection texto="Este empleado aún no tiene información de RH registrada." /> : <>
              <p className="exp-section-title">Posición</p>
              <div className="exp-grid-3">
                <Field label="Puesto"           value={rhItem?.Puesto} />
                <Field label="Jefe inmediato"   value={rhItem?.JefeInmediato} />
                <Field label="Departamento"     value={rhItem?.Departamento} />
                <Field label="Tipo de contrato" value={rhItem?.tipo_contrato} />
              </div>
              <p className="exp-section-title">Jornada laboral</p>
              <div className="exp-grid-3">
                <Field label="Hora de entrada"  value={rhItem?.HorarioLaboral?.HoraEntrada} />
                <Field label="Hora de salida"   value={rhItem?.HorarioLaboral?.HoraSalida} />
                <Field label="Tiempo de comida" value={rhItem?.HorarioLaboral?.TiempoComida} />
                <Field label="Días trabajados"  value={rhItem?.HorarioLaboral?.DiasTrabajados} />
              </div>
            </>}
          </div>
        )}

        {tab === "clinico" && (
          <div className="exp-section" role="tabpanel" aria-label="Expediente clínico">
            {!clinItem ? <EmptySection texto="Sin expediente clínico registrado." /> :
              <div className="exp-grid-3">
                <Field label="Tipo de sangre"   value={clinItem?.tipoSangre} />
                <Field label="NSS"              value={clinItem?.NumeroSeguroSocial} />
                <Field label="Seguro de gastos" value={clinItem?.Segurodegastosmedicos} />
                <Field label="Padecimientos"    value={clinItem?.Padecimientos} />
              </div>}
          </div>
        )}

        {tab === "familia" && (
          <div className="exp-section" role="tabpanel" aria-label="Contacto de emergencia">
            {!pcItem?.Contactos?.length ? <EmptySection texto="Sin contacto de emergencia registrado." /> :
              pcItem.Contactos.map((c, i) => (
                <div key={i} className="exp-grid-3" style={i ? { marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--hr-border)" } : undefined}>
                  <Field label="Nombre"      value={c.nombreContacto} />
                  <Field label="Parentesco"  value={c.parenstesco} />
                  <Field label="Teléfono"    value={c.telefonoContacto || c.whatsappContacto} />
                  <Field label="Correo"      value={c.correoContacto} />
                  <Field label="Dirección"   value={c.direccionContacto} />
                </div>
              ))}
          </div>
        )}

        {tab === "experiencia" && (
          <div className="exp-section" role="tabpanel" aria-label="Experiencia laboral">
            {!(edItem?.Experiencia?.length)
              ? <EmptySection texto="Sin experiencia registrada." />
              : (edItem.Experiencia||[]).map((exp,i) => (
                <div key={i} className="exp-card">
                  <div className="exp-card-title">{exp.Titulo||exp.titulo||"—"}</div>
                  <div className="exp-card-sub">{exp.Fecha||exp.fecha}</div>
                  {exp.Descripcion && <p className="exp-card-desc">{exp.Descripcion}</p>}
                </div>
              ))
            }
          </div>
        )}

        {tab === "educacion" && (
          <div className="exp-section" role="tabpanel" aria-label="Educación">
            {!(edItem?.Educacion?.length)
              ? <EmptySection texto="Sin educación registrada." />
              : (edItem.Educacion||[]).map((ed,i) => (
                <div key={i} className="exp-card">
                  <div className="exp-card-title">{ed.Titulo||ed.titulo||"—"}</div>
                  <div className="exp-card-sub">{ed.Institucion} {ed.Fecha ? `· ${ed.Fecha}` : ""}</div>
                </div>
              ))
            }
          </div>
        )}

        {tab === "skills" && (
          <div className="exp-section" role="tabpanel" aria-label="Habilidades">
            {!(edItem?.Habilidades?.Programacion?.length)
              ? <EmptySection texto="Sin habilidades registradas." />
              : (edItem.Habilidades.Programacion||[]).map((h,i) => {
                const pct = h.Porcentaje||h.porcentaje||0;
                return (
                  <div key={i} className="exp-skill-row">
                    <span className="exp-skill-name">{h.Titulo||h.titulo||"—"}</span>
                    <div className="exp-skill-track" role="meter" aria-valuenow={pct}
                      aria-valuemin={0} aria-valuemax={100}
                      aria-label={`${h.Titulo||h.titulo||"habilidad"}: ${pct}%`}>
                      <div className="exp-skill-fill" style={{width:`${pct}%`}} />
                    </div>
                    <span className="exp-skill-pct">{pct}%</span>
                  </div>
                );
              })
            }
          </div>
        )}

      </ModalBody>

      {/* ── Footer solo lectura ── */}
      <div className="exp-footer">
        <span className="emp-dim" style={{fontSize:"0.78rem"}}>
          Para editar esta información, accede al perfil del empleado.
        </span>
        <IconButton accion="cerrar" label="Cerrar" tooltipPos="left" onClick={onClose} />
      </div>

    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
function Empleados() {

  const isPrivileged = authService.isAdmin();
  const navigate = useNavigate();
  // Redes sociales es un módulo apagado por defecto (Configuración → Módulos).
  const { isModuleActive, orgConfig } = useOrg();
  const conRedes = isModuleActive("redes_sociales");

  // ─── Data ─────────────────────────────────────────────────────────────────
  const [empleados,     setEmpleados]     = useState([]);
  const [datosContacto, setDatosContacto] = useState([]);
  const [redesSocial,   setRedesSocial]   = useState([]);
  const [persContacto,  setPersContacto]  = useState([]);
  const [educacion,     setEducacion]     = useState([]);
  const [clinico,       setClinico]       = useState([]);
  const [rhData,        setRhData]        = useState([]);
  const [cargado,       setCargado]       = useState(false);

  // ─── UI ───────────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState(1);
  const [filtro,       setFiltro]       = useState("");
  const [pagina,       setPagina]       = useState(0);
  const [modal,        setModal]        = useState(null);
  const [guardando,    setGuardando]    = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const [expEmpleado,  setExpEmpleado]  = useState(null);
  const [searchParams] = useSearchParams();
  const [deptoFiltro,  setDeptoFiltro]  = useState(() => searchParams.get("depto") || "");
  const deptoFiltroRef = useRef(null);
  const [orden,        setOrden]        = useState({ campo: null, dir: 1 });

  // ─── Registro ─────────────────────────────────────────────────────────────
  const [formEmp,  setFormEmp]  = useState(EMP_INIT);
  const [formUser, setFormUser] = useState(USER_INIT);
  const [formDir,  setFormDir]  = useState(DIR_INIT);
  const [altaError, setAltaError] = useState("");
  const [altaCampos, setAltaCampos] = useState({});
  const [waIgual, setWaIgual] = useState(true);
  const [formDC,   setFormDC]   = useState(DC_INIT);

  const { openFilePicker, filesContent } = useFilePicker({ readAs:"DataURL", accept:"image/*", multiple:true });

  // ─── Carga ────────────────────────────────────────────────────────────────
  const cargarTodo = useCallback(async () => {
    try {
      const [emp,dc,rs,rh,pc,ed,clin] = await Promise.all([
        empleadoService.getAll(),
        contactoService.getDatos().catch(()=>[]),
        conRedes ? contactoService.getRedes().catch(()=>[]) : Promise.resolve([]),
        rhService.getAll().catch(()=>[]),
        contactoService.getPersonas().catch(()=>[]),
        educacionService.getAll().catch(()=>[]),
        clinicoService.getAll().catch(()=>[]),
      ]);
      setEmpleados(Array.isArray(emp)?emp:[]);
      setDatosContacto(Array.isArray(dc)?dc:[]);
      setRedesSocial(Array.isArray(rs)?rs:[]);
      setRhData(Array.isArray(rh)?rh:[]);
      setPersContacto(Array.isArray(pc)?pc:[]);
      setEducacion(Array.isArray(ed)?ed:[]);
      setClinico(Array.isArray(clin)?clin:[]);
    } catch(err) { console.error("Error cargando:", err); }
    finally { setCargado(true); }
  }, [conRedes]);

  useEffect(()=>{ cargarTodo(); }, [cargarTodo]);

  // ─── Lookups ──────────────────────────────────────────────────────────────
  // datoscontacto guarda el vínculo como `EmpleadoId`, personascontacto como
  // `empleadoid`; el resto usa `empleado_id`.
  const byEmpId = (arr, id) => arr.find(x => {
    const raw = x.empleado_id ?? x.EmpleadoId ?? x.empleadoid;
    return (raw?.$oid || raw || "") === id;
  });

  const getRH    = useCallback(id => byEmpId(rhData,       id), [rhData]);
  const getDC    = useCallback(id => byEmpId(datosContacto,id), [datosContacto]);
  const getClin  = useCallback(id => byEmpId(clinico,      id), [clinico]);
  const getPC    = useCallback(id => byEmpId(persContacto, id), [persContacto]);
  const getEd    = useCallback(id => byEmpId(educacion,    id), [educacion]);
  const getRedes = useCallback(id => (byEmpId(redesSocial,id)?.RedesSociales || []), [redesSocial]);

  // ─── Empleados enriquecidos ───────────────────────────────────────────────
  const empleadosRich = useMemo(() => empleados.map(emp => {
    const id = getId(emp);
    const rh = getRH(id);
    return {
      ...emp,
      _puesto:           rh?.Puesto           || "",
      _jefe:             rh?.JefeInmediato    || "",
      // depto_id primero: siempre está presente (default "Sin Asignar" al
      // crear el empleado) y es el mismo campo que usan Organigrama y el
      // Dashboard — rh.Departamento casi nunca se llena, queda como fallback.
      _departamento:     emp.depto_id || rh?.Departamento || "",
      _contrato_firmado: rh?.contrato_firmado ?? false,
      _tipo_contrato:    rh?.tipo_contrato    || "",
      _relacion_laboral: rh?.TipoRelacionLaboral || "nomina",
      _tiene_rh:         !!rh,
      _numero_empleado:  rh?.NumeroEmpleado   || "",
      _fecha_ingreso:    rh?.FechaIngreso     || "",
      _antiguedad:       formatAntiguedad(rh?.FechaIngreso),
      _estado:           (emp.estado || "activo").toLowerCase(),
    };
  }), [empleados, getRH]);

  // ── Departamentos únicos, para el filtro rápido ────────────────────────────
  const departamentos = useMemo(() => {
    const set = new Set(empleadosRich.map(e => e._departamento).filter(Boolean));
    return Array.from(set).sort();
  }, [empleadosRich]);

  const porEstado = useMemo(() =>
    empleadosRich.filter(e => {
      const st = (e.estado||"activo").toLowerCase();
      return verInactivos ? st==="inactivo" : st==="activo";
    }),
  [empleadosRich, verInactivos]);

  const filtered = useMemo(() => {
    let out = porEstado;
    if (deptoFiltro) out = out.filter(e => e._departamento === deptoFiltro);
    if (filtro.trim()) {
      const q = filtro.toLowerCase();
      out = out.filter(e =>
        (e.Nombre||"").toLowerCase().includes(q) ||
        (e.ApelPaterno||"").toLowerCase().includes(q)
      );
    }
    return out;
  }, [porEstado, filtro, deptoFiltro]);

  // ── Orden por columna — clic en encabezado alterna asc/desc ───────────────
  const ORDEN_ACCESSORS = {
    nombre:       e => `${e.Nombre||""} ${e.ApelPaterno||""}`.toLowerCase(),
    departamento: e => (e._departamento||"").toLowerCase(),
    antiguedad:   e => e._fecha_ingreso || "",
    estado:       e => e._estado || "",
  };
  const sorted = useMemo(() => {
    if (!orden.campo) return filtered;
    const acc = ORDEN_ACCESSORS[orden.campo];
    if (!acc) return filtered;
    return [...filtered].sort((a,b) => {
      const av = acc(a), bv = acc(b);
      if (av < bv) return -1*orden.dir;
      if (av > bv) return  1*orden.dir;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, orden]);

  const toggleOrden = (campo) => {
    setOrden(o => o.campo === campo ? { campo, dir: o.dir*-1 } : { campo, dir: 1 });
  };

  const totalPags = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const pageData  = sorted.slice(pagina*ITEMS_PER_PAGE, (pagina+1)*ITEMS_PER_PAGE);
  const cambiarTab = id => { setActiveTab(id); setPagina(0); setFiltro(""); };

  // ─── Excel ────────────────────────────────────────────────────────────────
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(empleadosRich.map(e=>({
      NumEmpleado:e._numero_empleado, Nombre:e.Nombre, Paterno:e.ApelPaterno, Materno:e.ApelMaterno,
      Puesto:e._puesto, Jefe:e._jefe, Depto:e._departamento,
      Estado:e.estado||"activo",
      FechaIngreso:e._fecha_ingreso, Antiguedad:e._antiguedad,
      Contrato:e._contrato_firmado?`Firmado(${e._tipo_contrato})`:"Pendiente",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Empleados");
    XLSX.writeFile(wb,`Reporte_Empleados_${(orgConfig?.name || "empresa").replace(/[^\wÁÉÍÓÚáéíóúÑñ-]+/g, "_")}.xlsx`);
  };

  // ─── Registro 3 pasos ─────────────────────────────────────────────────────
  // Orden pedido por el cliente: credenciales al final, ya que todo lo
  // demás del empleado esté capturado (2026-09-23).
  const reglaDir = (campo) => ({ ...REGLAS_DIRECCION_DEFAULT, ...(orgConfig?.campos_direccion || {}) })[campo] || "opcional";

  const paso1 = async () => {
    if (!formEmp.Nombre?.trim()||!formEmp.ApelPaterno?.trim()) { setAltaError("Escribe nombre y apellido paterno."); return; }
    setGuardando(true); setAltaError("");
    try {
      // Si ya se creó en un intento anterior (volvió del paso 2), no duplicar.
      if (!formEmp._id) {
        const res = await empleadoService.create({...formEmp, Fotografias:filesContent.map(f=>f.content), depto_id:"Sin Asignar", Cargo:"Personal"});
        setFormEmp(p=>({...p,_id:getId(res)}));
      }
      setAltaCampos({}); setModal("direccion");
    } catch (e) { setAltaError(e.message || "No se pudo guardar. Intenta de nuevo."); }
    finally { setGuardando(false); }
  };

  const paso2 = async () => {
    // Validación en el cliente con las reglas de la empresa (el backend repite la validación).
    const faltan = {};
    CAMPOS_DIRECCION.forEach(({label, field}) => {
      if (reglaDir(field) === "obligatorio" && !String(formDir[field]||"").trim()) faltan[field] = `Falta ${label.toLowerCase()}.`;
    });
    if (formDir.CodigoP && !/^\d{5}$/.test(formDir.CodigoP)) faltan.CodigoP = "El código postal tiene 5 dígitos.";
    if (Object.keys(faltan).length) { setAltaCampos(faltan); setAltaError("Completa los campos marcados."); return; }
    setGuardando(true); setAltaError(""); setAltaCampos({});
    try {
      await Promise.all([
        direccionService.create({...formDir, empleado_id:formEmp._id}),
        // ListaCorreos ahora es una lista [{email, principal}] — este
        // wizard solo captura un correo al dar de alta, así que se manda
        // como la lista de un solo elemento.
        contactoService.createDatos({
          ...formDC,
          empleado_id: formEmp._id,
          ListaCorreos: formDC.ListaCorreos ? [{ email: formDC.ListaCorreos, principal: true }] : [],
        }),
      ]);
      // Paso 3 con lo ya capturado: correo de trabajo y un usuario sugerido.
      const correo = (formDC.ListaCorreos || "").trim();
      const sugerido = correo.includes("@") ? correo.split("@")[0]
        : `${(formEmp.Nombre||"")[0]||""}${formEmp.ApelPaterno||""}`.normalize("NFD").replace(/[^a-zA-Z0-9]/g, "");
      setFormUser(p => ({ ...p, email: p.email || correo, user: p.user || sugerido.toLowerCase() }));
      setModal("usuario");
    } catch (e) {
      setAltaCampos(e.campos || {});
      setAltaError(e.campos ? "Revisa los campos marcados." : (e.message || "No se pudo guardar. Intenta de nuevo."));
    } finally { setGuardando(false); }
  };

  const paso3 = async () => {
    if (!formUser.user||!formUser.email) return;
    setGuardando(true); setAltaError("");
    try {
      const res = await usuarioService.create({...formUser, role:"EMPLOYEE", empleado_id:formEmp._id});
      setModal(null); setFormEmp(EMP_INIT); cargarTodo();
      if (res?.email_sent) {
        await avisar({ titulo: "Empleado dado de alta",
          mensaje: `La contraseña temporal se envió por correo a ${formUser.email}. El empleado deberá cambiarla en su primer inicio de sesión.` });
      } else if (res?.temp_password) {
        // Sin SMTP configurado: la contraseña la genera el sistema de identidad
        // y se muestra una sola vez para entregarla en mano.
        await avisar({ titulo: "Empleado dado de alta", copiable: res.temp_password,
          mensaje: `Contraseña temporal de ${formUser.user}. Entrégala al empleado: solo se muestra esta vez y deberá cambiarla en su primer inicio de sesión.` });
      }
      setFormUser(USER_INIT); setFormDir(DIR_INIT); setFormDC(DC_INIT); setWaIgual(true);
    } catch (e) {
      setAltaError(e.message || "No se pudo crear el acceso. Revisa el usuario y el correo.");
    } finally { setGuardando(false); }
  };

  if (!cargado) return (
    <div className="empleados-loading">
      <div className="emp-loading-ring" />
      <p>Cargando sistema...</p>
    </div>
  );

  const totalActivos   = empleadosRich.filter(e=>(e.estado||"activo")==="activo").length;
  const totalInactivos = empleadosRich.filter(e=>(e.estado||"activo")==="inactivo").length;

  // ─── Encabezado ordenable — clic para alternar asc/desc ───────────────────
  const SortableTh = ({ campo, children, ...rest }) => (
    <th className="emp-th emp-th--sortable" scope="col" {...rest}
      aria-sort={orden.campo===campo ? (orden.dir===1?"ascending":"descending") : "none"}>
      <button type="button" className="emp-th-sort-btn" onClick={()=>toggleOrden(campo)}>
        {children}
        <span className="emp-th-sort-icon">
          {orden.campo===campo
            ? (orden.dir===1 ? <FiChevronUp/> : <FiChevronDown/>)
            : <FiChevronDown style={{opacity:0.25}}/>}
        </span>
      </button>
    </th>
  );

  // ─── Badge de estado (activo/inactivo) ─────────────────────────────────────
  const EstadoBadge = ({ estado }) => (
    <span className={`emp-chip emp-chip--${estado==="activo"?"green":"red"}`}>
      {estado==="activo" ? "Activo" : "Inactivo"}
    </span>
  );

  // ─── Columna expediente (solo privilegiados) ──────────────────────────────
  const ExpCol = ({ item }) => {
    if (!isPrivileged) return null;
    const nombre = `${item.Nombre||""} ${item.ApelPaterno||""}`.trim();
    return (
      <td className="emp-td emp-td--center" style={{width:64}}>
        <button className="emp-folder-btn"
          aria-label={`Ver expediente de ${nombre}`}
          title={`Ver expediente de ${nombre}`}
          onClick={() => setExpEmpleado(item)}>
          <CiFolderOn aria-hidden="true" />
        </button>
      </td>
    );
  };

  return (
    <section className="empleados">

      {expEmpleado && (
        <ExpedienteModal
          empleado={expEmpleado}
          rhItem={getRH(getId(expEmpleado))}
          clinItem={getClin(getId(expEmpleado))}
          pcItem={getPC(getId(expEmpleado))}
          edItem={getEd(getId(expEmpleado))}
          onClose={() => setExpEmpleado(null)}
        />
      )}

      <div className="hr-page-header">
        <div>
          <h2 className="hr-title">Empleados / RH</h2>
          <p className="hr-subtitle">Directorio del personal — identidad, posición, relación laboral y expediente</p>
        </div>
      </div>

      <div className="emp-kpi-grid">
        {/* Los 4 recuadros son filtros, no solo números — pedido explícito:
            "quiero que sirvan como acciones... si hay 4 inactivos, al darle
            click quiero saber quiénes son". */}
        <button type="button" className="emp-kpi emp-kpi--clickable"
          aria-pressed={!verInactivos && !deptoFiltro}
          onClick={() => { setVerInactivos(false); setDeptoFiltro(""); setPagina(0); }}>
          <span className="emp-kpi-icon"><FiUsers/></span>
          <span className="emp-kpi-val">{empleadosRich.length}</span>
          <span className="emp-kpi-lbl">Total registrados</span>
        </button>
        <button type="button" className="emp-kpi emp-kpi--clickable"
          aria-pressed={!verInactivos}
          onClick={() => { setVerInactivos(false); setPagina(0); }}>
          <span className="emp-kpi-icon emp-kpi-icon--success"><FiUserCheck/></span>
          <span className="emp-kpi-val">{totalActivos}</span>
          <span className="emp-kpi-lbl">Activos</span>
        </button>
        <button type="button" className="emp-kpi emp-kpi--clickable"
          aria-pressed={verInactivos}
          onClick={() => { setVerInactivos(true); setPagina(0); }}>
          <span className="emp-kpi-icon emp-kpi-icon--danger"><FiUserX/></span>
          <span className="emp-kpi-val">{totalInactivos}</span>
          <span className="emp-kpi-lbl">Inactivos</span>
        </button>
        <button type="button" className="emp-kpi emp-kpi--clickable"
          onClick={() => deptoFiltroRef.current?.focus()}>
          <span className="emp-kpi-icon emp-kpi-icon--accent2"><FiGrid/></span>
          <span className="emp-kpi-val">{departamentos.length}</span>
          <span className="emp-kpi-lbl">Departamentos</span>
        </button>
      </div>

      <div className="CRUDS">

        {/* Toolbar */}
        <div className="emp-toolbar">
          {isPrivileged && (
            <button className="btn-emp btn-emp--primary" onClick={()=>{setFormEmp(EMP_INIT);setFormDir(DIR_INIT);setFormDC(DC_INIT);setFormUser(USER_INIT);setWaIgual(true);setAltaError("");setAltaCampos({});setModal("empleado");}}>
              <FaPlus />
            </button>
          )}
          <div className="emp-search-wrap">
            <CiSearch className="emp-search-icon" />
            <input type="text" className="emp-search-input" placeholder="Buscar por nombre..."
              value={filtro} onChange={e=>{setFiltro(e.target.value);setPagina(0);}} />
            {filtro && <button className="emp-search-clear" onClick={()=>setFiltro("")}><FiX /></button>}
          </div>
          {departamentos.length > 0 && (
            <select ref={deptoFiltroRef} className="emp-depto-filter" value={deptoFiltro}
              onChange={e=>{setDeptoFiltro(e.target.value);setPagina(0);}}
              aria-label="Filtrar por departamento">
              <option value="">Todos los departamentos</option>
              {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          <button className="btn-emp btn-emp--excel" onClick={exportarExcel} aria-label="Exportar a Excel" data-tooltip="Exportar a Excel" data-tooltip-pos="bottom"><FaFileExcel /></button>
          {["RH", "SUPER_ADMIN"].includes(authService.getRole()) && (
            <IconButton icon={FiUploadCloud} tone="add" label="Carga masiva desde Excel" tooltipPos="bottom" onClick={() => navigate("/carga-masiva")} />
          )}
        </div>

        {/* Tabs */}
        <div className="emp-tabs" role="tablist" aria-label="Vistas del directorio de empleados">
          {TABS.map(t => (
            <button key={t.id}
              role="tab"
              aria-selected={activeTab===t.id}
              className={`emp-tab${activeTab===t.id?" emp-tab--active":""}`}
              onClick={()=>cambiarTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="emp-table-wrap">
          {pageData.length === 0 ? (
            <div className="emp-empty">
              <CiBoxList className="emp-empty-icon" />
              <p>No se encontraron registros.</p>
            </div>
          ) : (
            <table className="emp-table">
              <caption className="sr-only">
                Directorio de empleados — vista {TABS.find(t=>t.id===activeTab)?.label}.
                La primera columna identifica al empleado con foto, nombre y puesto.
              </caption>
              <thead>
                <tr>
                  {/* ── Identidad: completa en General; solo avatar (con hover-card) en las demás ── */}
                  <th className={`emp-th emp-th--identity${activeTab!==1?" emp-th--identity-compact":""}`} scope="col">
                    {activeTab===1 ? "Empleado" : <span className="sr-only">Empleado</span>}
                  </th>

                  {activeTab===1 && <>
                    <th className="emp-th" scope="col">Jefe inmediato</th>
                    <SortableTh campo="departamento">Departamento</SortableTh>
                    <th className="emp-th" scope="col">Relación laboral</th>
                    <th className="emp-th" scope="col">Contrato</th>
                    <SortableTh campo="antiguedad">Antigüedad</SortableTh>
                    <SortableTh campo="estado">Estado</SortableTh>
                  </>}

                  {activeTab===2 && <>
                    <th className="emp-th" scope="col">Cargo</th>
                    <th className="emp-th" scope="col">Fecha de nacimiento</th>
                    <th className="emp-th" scope="col">Departamento</th>
                  </>}

                  {activeTab===3 && <>
                    <th className="emp-th" scope="col">Domicilio</th>
                    <th className="emp-th" scope="col">Municipio</th>
                    <th className="emp-th" scope="col">Ciudad / Estado</th>
                    <th className="emp-th" scope="col">C.P.</th>
                    <th className="emp-th" scope="col">País</th>
                  </>}

                  {activeTab===4 && <>
                    <th className="emp-th" scope="col">Medios de contacto</th>
                    {conRedes && <th className="emp-th" scope="col">Redes sociales</th>}
                  </>}

                  {/* ── Col expediente: solo privilegiados ── */}
                  {isPrivileged && (
                    <th className="emp-th emp-th--center" scope="col" style={{width:64}}>
                      <span className="sr-only">Expediente</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageData.map((item, idx) => {
                  const id   = getId(item);
                  const dc   = getDC(id);
                  const redes= getRedes(id);

                  return (
                    <tr key={id||idx} className="emp-row">

                      {/* Identidad — completa en General, compacta (avatar + hover-card) en el resto */}
                      <IdentityCell item={item} compact={activeTab!==1} />

                      {/* Tab 1 — General */}
                      {activeTab===1 && <>
                        <td className="emp-td">
                          <span className={item._jefe?"":"emp-dim"}>{item._jefe||"—"}</span>
                        </td>
                        <td className="emp-td">
                          {item._departamento
                            ? <span className="emp-chip">{item._departamento}</span>
                            : <span className="emp-dim">—</span>}
                        </td>
                        <td className="emp-td">
                          {!item._tiene_rh
                            ? <span className="emp-dim">Sin RH</span>
                            : item._relacion_laboral === "prestador_servicios"
                              ? <span className="emp-chip">Prestador de servicios</span>
                              : <span className="emp-chip">Nómina</span>}
                        </td>
                        <td className="emp-td">
                          <ContratoChip firmado={item._contrato_firmado} tipo={item._tipo_contrato}/>
                        </td>
                        <td className="emp-td">
                          <span className={item._antiguedad?"":"emp-dim"}>{item._antiguedad||"—"}</span>
                        </td>
                        <td className="emp-td">
                          <EstadoBadge estado={item._estado} />
                        </td>
                      </>}

                      {/* Tab 2 — Datos Básicos */}
                      {activeTab===2 && <>
                        <td className="emp-td">
                          <span className={item.Cargo?"":"emp-dim"}>{item.Cargo||"—"}</span>
                        </td>
                        <td className="emp-td emp-td--num">
                          <span className="emp-dim">{item.FecNacimiento||"—"}</span>
                        </td>
                        <td className="emp-td">
                          {item._departamento
                            ? <span className="emp-chip">{item._departamento}</span>
                            : <span className="emp-dim">—</span>}
                        </td>
                      </>}

                      {/* Tab 3 — Direcciones */}
                      {activeTab===3 && <DireccionCell empleadoId={id} />}

                      {/* Tab 4 — Contactos */}
                      {activeTab===4 && <>
                        <td className="emp-td"><ContactoIcons dc={dc}/></td>
                        {conRedes && (
                          <td className="emp-td">
                            <div className="emp-social-row">
                              {redes.length===0
                                ? <span className="emp-dim">Sin redes</span>
                                : redes.map((r,i)=><RedSocialLink key={i} red={r}/>)}
                            </div>
                          </td>
                        )}
                      </>}

                      {/* Col expediente — siempre al final si privilegiado */}
                      <ExpCol item={item} />

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalPags>1 && (
          <div className="emp-pagination">
            <button className="emp-pag-btn" onClick={()=>setPagina(p=>Math.max(0,p-1))} disabled={pagina===0}><FaChevronLeft/></button>
            <span className="emp-pag-info">
              Página <strong>{pagina+1}</strong> de <strong>{totalPags}</strong>
              <span style={{marginLeft:8,color:"var(--hr-hint)"}}>· {sorted.length} registros</span>
            </span>
            <button className="emp-pag-btn" onClick={()=>setPagina(p=>Math.min(totalPags-1,p+1))} disabled={pagina+1>=totalPags}><FaChevronRight/></button>
          </div>
        )}

        {/* Toggle */}
        <div className="emp-toggle-bar">
          <button className={`emp-toggle-btn${verInactivos?" emp-toggle-btn--on":""}`}
            onClick={()=>{setVerInactivos(v=>!v);setPagina(0);}}>
            {verInactivos
              ? <><FiUsers style={{marginRight:6}}/>Ver activos ({totalActivos})</>
              : <><FaUserSlash style={{marginRight:6}}/>Ver inactivos ({totalInactivos})</>}
          </button>
        </div>

      </div>

      {/* ── Alta de empleado en 3 pasos (pop-up del sistema: se desplaza
          dentro si la ventana es chica y muestra los errores por campo) ── */}
      <SysModal abierto={modal==="empleado"} onClose={()=>setModal(null)} ancho={720}
        titulo="Nuevo empleado" subtitulo="Paso 1 de 3 · Datos personales"
        onGuardar={paso1} guardando={guardando} error={altaError}
        labelGuardar="Siguiente: ubicación y contacto" iconGuardar={FiArrowRight}
        puedeGuardar={!!(formEmp.Nombre?.trim() && formEmp.ApelPaterno?.trim())}>
        <div className="field-grid">
          {[
            {label:"Nombre",field:"Nombre"},
            {label:"Apellido paterno",field:"ApelPaterno"},
            {label:"Apellido materno",field:"ApelMaterno"},
            {label:"Fecha de nacimiento",field:"FecNacimiento",type:"date"},
          ].map(({label,field,type="text"})=>(
            <div key={field} className="field-row">
              <label className="field-label" htmlFor={`alta-${field}`}>{label}</label>
              <input id={`alta-${field}`} className="field-input" type={type} value={formEmp[field]||""}
                onChange={e=>setFormEmp(p=>({...p,[field]:e.target.value}))}/>
            </div>
          ))}
          <div className="field-row field-span-2">
            <span className="field-label">Fotografía</span>
            <button type="button" className="perfil-baja-btn" onClick={openFilePicker}>
              <CiFileOn aria-hidden="true"/>{filesContent.length>0?`${filesContent.length} imagen(es)`:"Seleccionar imagen"}
            </button>
            {filesContent[0]&&<img src={filesContent[0].content} alt="Vista previa" className="emp-foto-preview mt-2"/>}
          </div>
        </div>
      </SysModal>

      <SysModal abierto={modal==="direccion"} onClose={()=>setModal(null)} ancho={720}
        titulo="Ubicación y contacto" subtitulo="Paso 2 de 3 · Los campos con * son obligatorios para tu empresa."
        onGuardar={paso2} guardando={guardando} error={altaError}
        labelGuardar="Siguiente: credenciales" iconGuardar={FiArrowRight}>
        <div className="field-grid">
          {CAMPOS_DIRECCION.filter(c => reglaDir(c.field) !== "oculto").map(({label,field,span})=>(
            <div key={field} className={`field-row${span ? " field-span-2" : ""}${altaCampos[field] ? " field-row--error" : ""}`}>
              <label className="field-label" htmlFor={`alta-${field}`}>{label}{reglaDir(field)==="obligatorio" ? " *" : ""}</label>
              <input id={`alta-${field}`} className="field-input" value={formDir[field]||""}
                placeholder={field==="NumExterior" ? "Número o S/N" : undefined} inputMode={field==="CodigoP" ? "numeric" : undefined}
                maxLength={field==="CodigoP" ? 5 : undefined}
                onChange={e=>{ setFormDir(p=>({...p,[field]:e.target.value})); setAltaCampos(c=>({...c,[field]:undefined})); }}/>
              {altaCampos[field] && <span className="field-error">{altaCampos[field]}</span>}
            </div>
          ))}
          <div className={`field-row${altaCampos.TelCelular ? " field-row--error" : ""}`}>
            <label className="field-label" htmlFor="alta-cel">Celular</label>
            <input id="alta-cel" className="field-input" type="tel" placeholder="55 1234 5678" maxLength={12}
              value={formDC.TelCelular||""} onChange={e=>{ const v=formatTel(e.target.value); setFormDC(p=>({...p,TelCelular:v, ...(waIgual ? {IdWhatsApp:v} : {})})); }}/>
            {altaCampos.TelCelular && <span className="field-error">{altaCampos.TelCelular}</span>}
          </div>
          <div className={`field-row${altaCampos.TelFijo ? " field-row--error" : ""}`}>
            <label className="field-label" htmlFor="alta-fijo">Teléfono fijo (opcional)</label>
            <input id="alta-fijo" className="field-input" type="tel" maxLength={12}
              value={formDC.TelFijo||""} onChange={e=>setFormDC(p=>({...p,TelFijo:formatTel(e.target.value)}))}/>
            {altaCampos.TelFijo && <span className="field-error">{altaCampos.TelFijo}</span>}
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="alta-wa">WhatsApp</label>
            <input id="alta-wa" className="field-input" type="tel" maxLength={12} disabled={waIgual}
              value={formDC.IdWhatsApp||""} onChange={e=>setFormDC(p=>({...p,IdWhatsApp:formatTel(e.target.value)}))}/>
            <label className="nom-check" style={{ marginTop: 6 }}>
              <input type="checkbox" checked={waIgual} onChange={e=>{ setWaIgual(e.target.checked); if (e.target.checked) setFormDC(p=>({...p,IdWhatsApp:p.TelCelular})); }}/>
              Es el mismo que el celular
            </label>
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="alta-correo">Correo de trabajo</label>
            <input id="alta-correo" className="field-input" type="email" placeholder="nombre@empresa.com" value={formDC.ListaCorreos||""}
              onChange={e=>setFormDC(p=>({...p,ListaCorreos:e.target.value}))}/>
            <span className="field-hint">Con este correo entrará al sistema.</span>
          </div>
        </div>
      </SysModal>

      <SysModal abierto={modal==="usuario"} onClose={()=>setModal(null)} ancho={520}
        titulo="Acceso al sistema" subtitulo="Paso 3 de 3 · El sistema genera una contraseña temporal que el empleado cambia al entrar."
        onGuardar={paso3} guardando={guardando} error={altaError}
        labelGuardar="Completar registro" iconGuardar={FiCheck}
        puedeGuardar={!!(formUser.user && formUser.email)}>
        <div className="field-grid">
          <div className="field-row field-span-2">
            <label className="field-label" htmlFor="alta-user">Nombre de usuario</label>
            <input id="alta-user" className="field-input" placeholder="nombre.usuario" value={formUser.user}
              onChange={e=>setFormUser(p=>({...p,user:e.target.value.trim().toLowerCase()}))}/>
          </div>
          <div className="field-row field-span-2">
            <label className="field-label" htmlFor="alta-email">Correo electrónico</label>
            <input id="alta-email" className="field-input" type="email" placeholder="nombre@empresa.com" value={formUser.email}
              onChange={e=>setFormUser(p=>({...p,email:e.target.value.trim()}))}/>
            {formUser.email && formUser.email === formDC.ListaCorreos && <span className="field-hint">Tomado del paso anterior.</span>}
          </div>
        </div>
      </SysModal>

    </section>
  );
}

export default Empleados;