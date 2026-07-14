import React, { useEffect, useState, useCallback, useMemo } from "react";
import "./Empleados.css";
import { Link } from "react-router-dom";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import {
  CiFacebook, CiLinkedin, CiYoutube,
  CiUser, CiSearch, CiFileOn, CiBoxList, CiFolderOn
} from "react-icons/ci";
import {
  FaInstagram, FaTiktok, FaPlus,
  FaChevronLeft, FaChevronRight, FaFileExcel, FaGithub,
  FaUserSlash, FaUsers, FaWhatsapp, FaTelegram, FaEnvelope,
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
const DIR_INIT  = { Calle:"", NumExterior:"", NumInterior:"", Manzana:"", Lote:"", Municipio:"", Ciudad:"", CodigoP:"", Pais:"México" };
const DC_INIT   = { TelFijo:"", TelCelular:"", IdWhatsApp:"", IdTelegram:"", ListaCorreos:"" };

const getId = (item) => item?._id?.$oid || item?._id || "";

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
      ? tipo==="digital" ? "Digital ✓" : tipo==="autografa" ? "Autógrafa ✓" : "Firmado ✓"
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
    dc.ListaCorreos && { href:`mailto:${dc.ListaCorreos}`,                                          icon:<FaEnvelope />, cls:"mail", title:dc.ListaCorreos },
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
    familia:     !!pcItem,
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
        Completar en el perfil →
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
            {!pcItem ? <EmptySection texto="Sin contacto de emergencia registrado." /> :
              <div className="exp-grid-3">
                <Field label="Nombre"      value={pcItem?.nombreContacto} />
                <Field label="Parentesco"  value={pcItem?.parenstesco} />
                <Field label="Teléfono"    value={pcItem?.telefonoContacto} />
                <Field label="Correo"      value={pcItem?.correoContacto} />
                <Field label="Dirección"   value={pcItem?.direccionContacto} />
              </div>}
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
        <button className="exp-close-action" onClick={onClose}>Cerrar</button>
      </div>

    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
function Empleados() {

  const isPrivileged = authService.isAdmin();

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

  // ─── Registro ─────────────────────────────────────────────────────────────
  const [formEmp,  setFormEmp]  = useState(EMP_INIT);
  const [formUser, setFormUser] = useState(USER_INIT);
  const [formDir,  setFormDir]  = useState(DIR_INIT);
  const [formDC,   setFormDC]   = useState(DC_INIT);

  const { openFilePicker, filesContent } = useFilePicker({ readAs:"DataURL", accept:"image/*", multiple:true });

  // ─── Carga ────────────────────────────────────────────────────────────────
  const cargarTodo = useCallback(async () => {
    try {
      const [emp,dc,rs,rh,pc,ed,clin] = await Promise.all([
        empleadoService.getAll(),
        contactoService.getDatos().catch(()=>[]),
        contactoService.getRedes().catch(()=>[]),
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
  }, []);

  useEffect(()=>{ cargarTodo(); }, [cargarTodo]);

  // ─── Lookups ──────────────────────────────────────────────────────────────
  // datoscontacto guarda el vínculo como `EmpleadoId`; el resto usa `empleado_id`.
  const byEmpId = (arr, id) => arr.find(x => {
    const raw = x.empleado_id ?? x.EmpleadoId;
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
      _departamento:     rh?.Departamento     || emp.depto_id || "",
      _contrato_firmado: rh?.contrato_firmado ?? false,
      _tipo_contrato:    rh?.tipo_contrato    || "",
    };
  }), [empleados, getRH]);

  const porEstado = useMemo(() =>
    empleadosRich.filter(e => {
      const st = (e.estado||"activo").toLowerCase();
      return verInactivos ? st==="inactivo" : st==="activo";
    }),
  [empleadosRich, verInactivos]);

  const filtered = useMemo(() => {
    if (!filtro.trim()) return porEstado;
    const q = filtro.toLowerCase();
    return porEstado.filter(e =>
      (e.Nombre||"").toLowerCase().includes(q) ||
      (e.ApelPaterno||"").toLowerCase().includes(q)
    );
  }, [porEstado, filtro]);

  const totalPags = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageData  = filtered.slice(pagina*ITEMS_PER_PAGE, (pagina+1)*ITEMS_PER_PAGE);
  const cambiarTab = id => { setActiveTab(id); setPagina(0); setFiltro(""); };

  // ─── Excel ────────────────────────────────────────────────────────────────
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(empleadosRich.map(e=>({
      Nombre:e.Nombre, Paterno:e.ApelPaterno, Materno:e.ApelMaterno,
      Puesto:e._puesto, Jefe:e._jefe, Depto:e._departamento,
      Estado:e.estado||"activo",
      Contrato:e._contrato_firmado?`Firmado(${e._tipo_contrato})`:"Pendiente",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Empleados");
    XLSX.writeFile(wb,"Reporte_Empleados_Cibercom.xlsx");
  };

  // ─── Registro 3 pasos ─────────────────────────────────────────────────────
  const paso1 = async () => {
    if (!formEmp.Nombre||!formEmp.ApelPaterno) return;
    setGuardando(true);
    try {
      const res = await empleadoService.create({...formEmp, Fotografias:filesContent.map(f=>f.content), depto_id:"Sin Asignar", Cargo:"Personal"});
      setFormEmp(p=>({...p,_id:getId(res)}));
      setModal("usuario");
    } finally { setGuardando(false); }
  };

  const paso2 = async () => {
    if (!formUser.user||!formUser.password||!formUser.email) return;
    setGuardando(true);
    try {
      const res = await usuarioService.create({...formUser, role:"USER", empleado_id:formEmp._id});
      if (res?.email_sent) {
        window.alert(
          `La contraseña temporal se envió por correo a ${formUser.email}.\n` +
          "El empleado deberá cambiarla en su primer inicio de sesión."
        );
      } else if (res?.temp_password) {
        // Sin SMTP configurado: la contraseña la genera el sistema de identidad
        // y se muestra una sola vez para entregarla en mano.
        window.alert(
          `Contraseña temporal para ${formUser.user}:\n\n${res.temp_password}\n\n` +
          "Entrégala al empleado. Deberá cambiarla en su primer inicio de sesión."
        );
      }
      setModal("direccion");
    } finally { setGuardando(false); }
  };

  const paso3 = async () => {
    setGuardando(true);
    try {
      await Promise.all([
        direccionService.create({...formDir, empleado_id:formEmp._id}),
        contactoService.createDatos({...formDC, empleado_id:formEmp._id}),
      ]);
      setModal(null); setFormEmp(EMP_INIT); cargarTodo();
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

      <div className="CRUDS">

        {/* Toolbar */}
        <div className="emp-toolbar">
          {isPrivileged && (
            <button className="btn-emp btn-emp--primary" onClick={()=>{setFormEmp(EMP_INIT);setModal("empleado");}}>
              <FaPlus />
            </button>
          )}
          <div className="emp-search-wrap">
            <CiSearch className="emp-search-icon" />
            <input type="text" className="emp-search-input" placeholder="Buscar por nombre..."
              value={filtro} onChange={e=>{setFiltro(e.target.value);setPagina(0);}} />
            {filtro && <button className="emp-search-clear" onClick={()=>setFiltro("")}>✕</button>}
          </div>
          <button className="btn-emp btn-emp--excel" onClick={exportarExcel}><FaFileExcel /></button>
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
                    <th className="emp-th" scope="col">Departamento</th>
                    <th className="emp-th" scope="col">Contrato</th>
                    <th className="emp-th" scope="col">Ingreso</th>
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
                    <th className="emp-th" scope="col">Redes sociales</th>
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
                          <ContratoChip firmado={item._contrato_firmado} tipo={item._tipo_contrato}/>
                        </td>
                        <td className="emp-td emp-td--num">
                          <span className="emp-dim">{item.FecIngreso||item.FecNacimiento||"—"}</span>
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
                        <td className="emp-td">
                          <div className="emp-social-row">
                            {redes.length===0
                              ? <span className="emp-dim">Sin redes</span>
                              : redes.map((r,i)=><RedSocialLink key={i} red={r}/>)}
                          </div>
                        </td>
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
              <span style={{marginLeft:8,color:"var(--hr-hint)"}}>· {filtered.length} registros</span>
            </span>
            <button className="emp-pag-btn" onClick={()=>setPagina(p=>Math.min(totalPags-1,p+1))} disabled={pagina+1>=totalPags}><FaChevronRight/></button>
          </div>
        )}

        {/* Toggle */}
        <div className="emp-toggle-bar">
          <button className={`emp-toggle-btn${verInactivos?" emp-toggle-btn--on":""}`}
            onClick={()=>{setVerInactivos(v=>!v);setPagina(0);}}>
            {verInactivos
              ? <><FaUsers style={{marginRight:6}}/>Ver activos ({totalActivos})</>
              : <><FaUserSlash style={{marginRight:6}}/>Ver inactivos ({totalInactivos})</>}
          </button>
        </div>

      </div>

      {/* ── Modales de registro ── */}
      <Modal isOpen={modal==="empleado"} toggle={()=>setModal(null)} size="lg" centered>
        <ModalHeader toggle={()=>setModal(null)}>
          Nuevo empleado <span className="modal-step-badge">Paso 1 de 3</span>
        </ModalHeader>
        <ModalBody>
          <div className="row g-3">
            {[
              {label:"Nombre",field:"Nombre",col:"col-md-4"},
              {label:"Apellido paterno",field:"ApelPaterno",col:"col-md-4"},
              {label:"Apellido materno",field:"ApelMaterno",col:"col-md-4"},
              {label:"Fecha nacimiento",field:"FecNacimiento",col:"col-md-6",type:"date"},
            ].map(({label,field,col,type="text"})=>(
              <div key={field} className={col}>
                <label className="form-label">{label}</label>
                <input className="form-control" type={type} value={formEmp[field]||""}
                  onChange={e=>setFormEmp(p=>({...p,[field]:e.target.value}))}/>
              </div>
            ))}
            <div className="col-md-6">
              <label className="form-label">Fotografía</label>
              <button className="btn btn-outline-info w-100" onClick={openFilePicker}>
                <CiFileOn style={{marginRight:6}}/>
                {filesContent.length>0?`${filesContent.length} imagen(es)`:"Seleccionar imagen"}
              </button>
              {filesContent[0]&&<img src={filesContent[0].content} alt="preview" className="emp-foto-preview mt-2"/>}
            </div>
          </div>
        </ModalBody>
        <div className="modal-footer border-0 pt-4">
          <button className="btn btn-primary w-100" onClick={paso1} disabled={guardando||!formEmp.Nombre}>
            {guardando?"Guardando...":"Continuar → Paso 2"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={modal==="usuario"} centered>
        <ModalHeader>Credenciales <span className="modal-step-badge">Paso 2 de 3</span></ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label className="form-label">Nombre de usuario</label>
            <input className="form-control" placeholder="nombre.usuario" value={formUser.user}
              onChange={e=>setFormUser(p=>({...p,user:e.target.value}))}/>
          </div>
          <div className="mb-3">
            <label className="form-label">Correo electrónico</label>
            <input className="form-control" type="email" placeholder="nombre@empresa.com" value={formUser.email}
              onChange={e=>setFormUser(p=>({...p,email:e.target.value}))}/>
          </div>
          <div>
            <label className="form-label">Contraseña temporal</label>
            <input className="form-control" type="password" value={formUser.password}
              onChange={e=>setFormUser(p=>({...p,password:e.target.value}))}/>
          </div>
        </ModalBody>
        <div className="modal-footer border-0 pt-4">
          <button className="btn btn-primary w-100" onClick={paso2} disabled={guardando||!formUser.user||!formUser.email}>
            {guardando?"Validando...":"Continuar → Paso 3"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={modal==="direccion"} size="lg" centered>
        <ModalHeader>Ubicación y contacto <span className="modal-step-badge">Paso 3 de 3</span></ModalHeader>
        <ModalBody>
          <div className="row g-3">
            {[
              {label:"Calle",col:"col-8",field:"Calle"},
              {label:"Núm. ext.",col:"col-2",field:"NumExterior"},
              {label:"Núm. int.",col:"col-2",field:"NumInterior"},
              {label:"Manzana",col:"col-3",field:"Manzana"},
              {label:"Lote",col:"col-3",field:"Lote"},
              {label:"Municipio",col:"col-6",field:"Municipio"},
              {label:"Ciudad / Estado",col:"col-6",field:"Ciudad"},
              {label:"Código postal",col:"col-3",field:"CodigoP"},
              {label:"País",col:"col-3",field:"Pais"},
            ].map(({label,col,field})=>(
              <div key={field} className={col}>
                <label className="form-label">{label}</label>
                <input className="form-control" value={formDir[field]||""} onChange={e=>setFormDir(p=>({...p,[field]:e.target.value}))}/>
              </div>
            ))}
            <div className="col-md-6">
              <label className="form-label">Celular</label>
              <input className="form-control" type="tel" placeholder="55 1234 5678" maxLength={12}
                value={formDC.TelCelular||""} onChange={e=>setFormDC(p=>({...p,TelCelular:formatTel(e.target.value)}))}/>
            </div>
            <div className="col-md-6">
              <label className="form-label">Correo</label>
              <input className="form-control" type="email" value={formDC.ListaCorreos||""}
                onChange={e=>setFormDC(p=>({...p,ListaCorreos:e.target.value}))}/>
            </div>
          </div>
        </ModalBody>
        <div className="modal-footer border-0 pt-4">
          <button className="btn btn-primary w-100" onClick={paso3} disabled={guardando}>
            {guardando?"Finalizando...":"Completar registro"}
          </button>
        </div>
      </Modal>

    </section>
  );
}

export default Empleados;