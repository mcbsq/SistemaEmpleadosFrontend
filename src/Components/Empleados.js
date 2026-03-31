import React, { useEffect, useState, useCallback, useMemo } from "react";
import "./Empleados.css";
import { Link } from "react-router-dom";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import {
  CiFacebook, CiLinkedin, CiYoutube,
  CiEdit, CiTrash, CiUser, CiSearch, CiFileOn, CiBoxList
} from "react-icons/ci";
import {
  FaInstagram, FaTiktok, FaPlus,
  FaChevronLeft, FaChevronRight, FaFileExcel, FaGithub
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

// ─── Constantes ───────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 6;

const TABS = [
  { id: 1, label: "General"     },
  { id: 2, label: "Contacto"    },
  { id: 3, label: "Familia"     },
  { id: 4, label: "Clínico"     },
  { id: 5, label: "Redes"       },
  { id: 6, label: "RH"          },
  { id: 7, label: "Experiencia" },
  { id: 8, label: "Educación"   },
  { id: 9, label: "Skills"      },
];

const REDES_ICONS = {
  facebook:  <CiFacebook />,
  instagram: <FaInstagram />,
  linkedin:  <CiLinkedin />,
  youtube:   <CiYoutube />,
  tiktok:    <FaTiktok />,
  github:    <FaGithub />,
};

const TIPOS_SANGRE = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

const EMP_INIT   = { _id:"", Nombre:"", ApelPaterno:"", ApelMaterno:"", FecNacimiento:"" };
const USER_INIT  = { user:"", password:"" };
const DIR_INIT   = { Calle:"", NumExterior:"", NumInterior:"", Municipio:"", Ciudad:"", CodigoP:"" };
const DC_INIT    = { TelFijo:"", TelCelular:"", IdWhatsApp:"", IdTelegram:"", ListaCorreos:"" };
const PC_INIT    = { parenstesco:"", nombreContacto:"", telefonoContacto:"", correoContacto:"", direccionContacto:"" };
const CLIN_INIT  = { empleado_id:"", tipoSangre:"", Padecimientos:"", NumeroSeguroSocial:"", Segurodegastosmedicos:"" };
const RH_INIT_F  = { empleado_id:"", Puesto:"", JefeInmediato:"", HorarioLaboral:{ HoraEntrada:"", HoraSalida:"", TiempoComida:"", DiasTrabajados:"" } };

const getId = (item) => item?._id?.$oid || item?._id || "";

// ─── Componente Avatar ────────────────────────────────────────────────────────
const Avatar = ({ nombre = "", foto = null, sub = "" }) => {
  const inicial = nombre.trim()[0]?.toUpperCase() || "?";
  // Colores basados en inicial para variedad visual
  const colors = ["av-a","av-b","av-c","av-d","av-e"];
  const colorClass = colors[inicial.charCodeAt(0) % colors.length];
  return (
    <div className="emp-cell-avatar">
      {foto
        ? <img src={foto} alt={nombre} onError={e => { e.target.style.display="none"; }} />
        : <div className={`emp-avatar-ph ${colorClass}`}>{inicial}</div>
      }
      <div className="emp-cell-name">
        <span className="emp-name">{nombre}</span>
        {sub && <span className="emp-apel">{sub}</span>}
      </div>
    </div>
  );
};

// ─── Componente StatusDot ─────────────────────────────────────────────────────
const StatusDot = ({ activo = true }) => (
  <span className={`emp-status-dot emp-status-dot--${activo ? "on" : "off"}`}>
    {activo ? "Activo" : "Inactivo"}
  </span>
);

// ─── Componente Acciones ──────────────────────────────────────────────────────
const Actions = ({ empId, onEdit, showDelete, onDelete }) => (
  <div className="emp-actions">
    <button className="emp-btn emp-btn--edit" title="Editar" onClick={onEdit}>
      <CiEdit />
    </button>
    {showDelete && (
      <button className="emp-btn emp-btn--delete" title="Eliminar" onClick={onDelete}>
        <CiTrash />
      </button>
    )}
    <Link to={`/Perfil/${empId}`} className="emp-btn emp-btn--profile" title="Ver perfil">
      <CiUser />
    </Link>
  </div>
);

// ─── Modal confirmar eliminación ──────────────────────────────────────────────
const ConfirmDeleteModal = ({ empleado, onConfirm, onCancel, loading }) => (
  <Modal isOpen={!!empleado} toggle={onCancel} centered>
    <ModalBody className="confirm-delete-body">
      <span className="confirm-delete-icon">⚠</span>
      <h3>Eliminar empleado</h3>
      <p>
        ¿Estás seguro de eliminar a{" "}
        <strong>{empleado?.Nombre} {empleado?.ApelPaterno}</strong>?
        Esta acción elimina todos sus datos asociados y no se puede deshacer.
      </p>
      <div className="confirm-delete-actions">
        <button className="btn-confirm-cancel" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        <button className="btn-confirm-delete" onClick={onConfirm} disabled={loading}>
          {loading ? "Eliminando..." : "Sí, eliminar"}
        </button>
      </div>
    </ModalBody>
  </Modal>
);

// ════════════════════════════════════════════════════════════════════════════════
function Empleados() {

  // ─── Data ─────────────────────────────────────────────────────────────────
  const [empleados,     setEmpleados]     = useState([]);
  const [datosContacto, setDatosContacto] = useState([]);
  const [persContacto,  setPersContacto]  = useState([]);
  const [redesSocial,   setRedesSocial]   = useState([]);
  const [educacion,     setEducacion]     = useState([]);
  const [clinico,       setClinico]       = useState([]);
  const [rhData,        setRhData]        = useState([]);
  const [cargado,       setCargado]       = useState(false);

  // ─── UI ───────────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState(1);
  const [filtro,      setFiltro]      = useState("");
  const [pagina,      setPagina]      = useState(0);
  const [modal,       setModal]       = useState(null);   // string | null
  const [guardando,   setGuardando]   = useState(false);
  const [empEliminar, setEmpEliminar] = useState(null);
  const [eliminando,  setEliminando]  = useState(false);

  // ─── Formularios ──────────────────────────────────────────────────────────
  const [formEmp,   setFormEmp]   = useState(EMP_INIT);
  const [formUser,  setFormUser]  = useState(USER_INIT);
  const [formDir,   setFormDir]   = useState(DIR_INIT);
  const [formDC,    setFormDC]    = useState(DC_INIT);
  const [formPC,    setFormPC]    = useState(PC_INIT);
  const [formRS,    setFormRS]    = useState([]);
  const [formEd,    setFormEd]    = useState({ empleado_id:"", Educacion:[] });
  const [formExp,   setFormExp]   = useState({ empleado_id:"", Experiencia:[] });
  const [formSkill, setFormSkill] = useState({ empleado_id:"", Habilidades:{ Programacion:[] } });
  const [formClin,  setFormClin]  = useState(CLIN_INIT);
  const [formRH,    setFormRH]    = useState(RH_INIT_F);

  const { openFilePicker, filesContent } = useFilePicker({
    readAs:"DataURL", accept:"image/*", multiple:true,
  });

  // ─── Carga ────────────────────────────────────────────────────────────────
  const cargarTodo = useCallback(async () => {
    try {
      const [emp, dc, pc, rs, ed, clin, rh] = await Promise.all([
        empleadoService.getAll(),
        contactoService.getDatos(),
        contactoService.getPersonas(),
        contactoService.getRedes(),
        educacionService.getAll(),
        clinicoService.getAll().catch(() => []),
        rhService.getAll().catch(() => []),
      ]);
      setEmpleados(Array.isArray(emp)  ? emp  : []);
      setDatosContacto(Array.isArray(dc)   ? dc   : []);
      setPersContacto(Array.isArray(pc)   ? pc   : []);
      setRedesSocial(Array.isArray(rs)   ? rs   : []);
      setEducacion(Array.isArray(ed)   ? ed   : []);
      setClinico(Array.isArray(clin) ? clin : []);
      setRhData(Array.isArray(rh)   ? rh   : []);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setCargado(true);
    }
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  // ─── Cruzar empleados con su puesto (para tab General) ───────────────────
  // Una sola pasada en memo para no recalcular en cada render
  const empleadosConPuesto = useMemo(() => {
    return empleados.map(emp => {
      const id  = getId(emp);
      const rh  = rhData.find(r => {
        const rid = r.empleado_id?.$oid || r.empleado_id || "";
        return rid === id;
      });
      return { ...emp, _puesto: rh?.Puesto || "", _jefe: rh?.JefeInmediato || "" };
    });
  }, [empleados, rhData]);

  // ─── Source por tab ───────────────────────────────────────────────────────
  const getSource = useCallback(() => ({
    1: empleadosConPuesto,
    2: datosContacto,
    3: persContacto,
    4: clinico,
    5: redesSocial,
    6: rhData,
    7: educacion,
    8: educacion,
    9: educacion,
  }[activeTab] ?? []), [activeTab, empleadosConPuesto, datosContacto, persContacto, clinico, redesSocial, rhData, educacion]);

  // ─── Filtrado y paginación ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const src = getSource();
    if (!filtro.trim()) return src;
    const q = filtro.toLowerCase();
    return src.filter(item => {
      const n = (item.Nombre || item.NombreCompleto || item.nombre || "").toLowerCase();
      const a = (item.ApelPaterno || "").toLowerCase();
      return n.includes(q) || a.includes(q);
    });
  }, [getSource, filtro]);

  const totalPags = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageData  = filtered.slice(pagina * ITEMS_PER_PAGE, (pagina + 1) * ITEMS_PER_PAGE);

  const cambiarTab = (id) => { setActiveTab(id); setPagina(0); setFiltro(""); };

  // ─── Eliminación ──────────────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!empEliminar) return;
    setEliminando(true);
    try {
      await empleadoService.deleteFull(getId(empEliminar));
      setEmpEliminar(null);
      cargarTodo();
    } finally {
      setEliminando(false);
    }
  };

  // ─── Exportar Excel ───────────────────────────────────────────────────────
  const exportarExcel = () => {
    const data = empleadosConPuesto.map(e => ({
      Nombre:      e.Nombre,
      Paterno:     e.ApelPaterno,
      Materno:     e.ApelMaterno,
      Nacimiento:  e.FecNacimiento,
      Puesto:      e._puesto,
      JefeInmediato: e._jefe,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empleados");
    XLSX.writeFile(wb, "Reporte_Empleados_Cibercom.xlsx");
  };

  // ─── Flujo registro ───────────────────────────────────────────────────────
  const paso1 = async () => {
    if (!formEmp.Nombre || !formEmp.ApelPaterno) return;
    setGuardando(true);
    try {
      const res   = await empleadoService.create({
        ...formEmp,
        Fotografias: filesContent.map(f => f.content),
        depto_id: "Sin Asignar", Cargo: "Personal",
      });
      setFormEmp(p => ({ ...p, _id: getId(res) }));
      setModal("usuario");
    } finally { setGuardando(false); }
  };

  const paso2 = async () => {
    if (!formUser.user || !formUser.password) return;
    setGuardando(true);
    try {
      await usuarioService.create({ ...formUser, role:"USER", empleado_id: formEmp._id });
      setModal("direccion");
    } finally { setGuardando(false); }
  };

  const paso3 = async () => {
    setGuardando(true);
    try {
      await Promise.all([
        direccionService.create({ ...formDir, empleado_id: formEmp._id }),
        contactoService.createDatos({ ...formDC, empleado_id: formEmp._id }),
      ]);
      setModal(null);
      setFormEmp(EMP_INIT);
      cargarTodo();
    } finally { setGuardando(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (!cargado) return (
    <div className="empleados-loading">
      <div className="emp-loading-ring" />
      <p>Cargando sistema...</p>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="empleados">

      <ConfirmDeleteModal
        empleado={empEliminar}
        onConfirm={handleEliminar}
        onCancel={() => setEmpEliminar(null)}
        loading={eliminando}
      />

      <div className="CRUDS">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="emp-toolbar">
          <button
            className="btn-emp btn-emp--primary"
            title="Agregar empleado"
            onClick={() => { setFormEmp(EMP_INIT); setModal("empleado"); }}
          >
            <FaPlus />
          </button>

          <div className="emp-search-wrap">
            <CiSearch className="emp-search-icon" />
            <input
              type="text"
              className="emp-search-input"
              placeholder="Buscar por nombre..."
              value={filtro}
              onChange={e => { setFiltro(e.target.value); setPagina(0); }}
            />
            {filtro && (
              <button className="emp-search-clear" onClick={() => setFiltro("")}>✕</button>
            )}
          </div>

          <button className="btn-emp btn-emp--excel" title="Exportar Excel" onClick={exportarExcel}>
            <FaFileExcel />
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="emp-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`emp-tab${activeTab === t.id ? " emp-tab--active" : ""}`}
              onClick={() => cambiarTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tabla ─────────────────────────────────────────────────────── */}
        <div className="emp-table-wrap">
          {pageData.length === 0 ? (
            <div className="emp-empty">
              <CiBoxList className="emp-empty-icon" />
              <p>No se encontraron registros.</p>
            </div>
          ) : (
            <table className="emp-table">
              <thead>
                <tr>
                  {activeTab === 1 && <>
                    <th>Empleado</th>
                    <th>Puesto</th>
                    <th>Jefe inmediato</th>
                    <th>Estado</th>
                    <th>Ingreso</th>
                    <th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 2 && <>
                    <th>Empleado</th><th>Celular</th><th>WhatsApp</th><th>Correo</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 3 && <>
                    <th>Empleado</th><th>Contacto</th><th>Parentesco</th><th>Teléfono</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 4 && <>
                    <th>Empleado</th><th>Sangre</th><th>NSS</th><th>Padecimientos</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 5 && <>
                    <th>Empleado</th><th>Redes</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 6 && <>
                    <th>Empleado</th><th>Puesto</th><th>Jefe</th><th>Horario</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 7 && <>
                    <th>Empleado</th><th>Experiencia laboral</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 8 && <>
                    <th>Empleado</th><th>Educación</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                  {activeTab === 9 && <>
                    <th>Empleado</th><th>Habilidades</th><th style={{textAlign:"center"}}>Acciones</th>
                  </>}
                </tr>
              </thead>

              <tbody>
                {pageData.map((item, idx) => {
                  const id    = getId(item);
                  const empId = item.empleado_id?.$oid || item.empleado_id || item.EmpleadoId || id;
                  const nombre = item.Nombre || item.NombreCompleto || item.nombre || "—";
                  const apel   = `${item.ApelPaterno || ""} ${item.ApelMaterno || ""}`.trim();
                  const foto   = item.Fotografias?.[0] || item.Fotografia || null;

                  return (
                    <tr key={id || idx}>

                      {/* ── TAB 1: General ── */}
                      {activeTab === 1 && <>
                        <td>
                          <Avatar
                            nombre={`${nombre} ${apel}`}
                            foto={foto}
                            sub={`ID: ${id.slice(-8)}`}
                          />
                        </td>
                        <td>
                          {item._puesto
                            ? <span className="emp-chip emp-chip--blue">{item._puesto}</span>
                            : <span className="emp-chip">Sin asignar</span>
                          }
                        </td>
                        <td>
                          <span style={{fontSize:"0.84rem", color: item._jefe ? "var(--e-text)" : "var(--e-muted)"}}>
                            {item._jefe || "—"}
                          </span>
                        </td>
                        <td><StatusDot activo={true} /></td>
                        <td>
                          <span style={{fontSize:"0.8rem", color:"var(--e-muted)"}}>
                            {item.FecNacimiento || "—"}
                          </span>
                        </td>
                        <td>
                          <Actions
                            empId={id}
                            onEdit={() => { setFormEmp(item); setModal("empleado"); }}
                            showDelete
                            onDelete={() => setEmpEliminar(item)}
                          />
                        </td>
                      </>}

                      {/* ── TAB 2: Contacto ── */}
                      {activeTab === 2 && <>
                        <td><span className="emp-name">{nombre}</span></td>
                        <td>{item.TelCelular || "—"}</td>
                        <td>{item.IdWhatsApp  || "—"}</td>
                        <td><span className="emp-text-truncate">{item.ListaCorreos || "—"}</span></td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormDC({ ...DC_INIT, ...item, empleado_id: empId }); setModal("contacto"); }}
                          />
                        </td>
                      </>}

                      {/* ── TAB 3: Familia ── */}
                      {activeTab === 3 && <>
                        <td><span className="emp-name">{nombre}</span></td>
                        <td>{item.nombreContacto || "—"}</td>
                        <td>
                          {item.parenstesco
                            ? <span className="emp-chip emp-chip--cyan">{item.parenstesco}</span>
                            : "—"
                          }
                        </td>
                        <td>{item.telefonoContacto || "—"}</td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormPC({ ...PC_INIT, ...item, empleado_id: empId }); setModal("familia"); }}
                          />
                        </td>
                      </>}

                      {/* ── TAB 4: Clínico ── */}
                      {activeTab === 4 && <>
                        <td><span className="emp-name">{nombre}</span></td>
                        <td>
                          {item.tipoSangre
                            ? <span className="emp-chip emp-chip--red">{item.tipoSangre}</span>
                            : "—"
                          }
                        </td>
                        <td>{item.NumeroSeguroSocial || "—"}</td>
                        <td>
                          <span className="emp-text-truncate" style={{color:"var(--e-muted)", fontSize:"0.8rem"}}>
                            {item.Padecimientos || "—"}
                          </span>
                        </td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormClin({ ...CLIN_INIT, ...item, empleado_id: empId }); setModal("clinico"); }}
                          />
                        </td>
                      </>}

                      {/* ── TAB 5: Redes ── */}
                      {activeTab === 5 && <>
                        <td><span className="emp-name">{nombre}</span></td>
                        <td>
                          <div className="emp-redes">
                            {(item.RedesSociales || []).length === 0
                              ? <span style={{color:"var(--e-muted)", fontSize:"0.8rem"}}>Sin redes</span>
                              : (item.RedesSociales || []).map((r, i) => {
                                  const key = (r.redSocialSeleccionada || "").toLowerCase();
                                  return (
                                    <span key={i} className="emp-red-chip">
                                      {REDES_ICONS[key] || null}
                                      {r.NombreRedSocial}
                                    </span>
                                  );
                                })
                            }
                          </div>
                        </td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormRS(item.RedesSociales || []); setModal("redes"); }}
                          />
                        </td>
                      </>}

                      {/* ── TAB 6: RH ── */}
                      {activeTab === 6 && <>
                        <td>
                          <Avatar nombre={nombre} sub={apel} />
                        </td>
                        <td>
                          {item.Puesto
                            ? <span className="emp-chip emp-chip--blue">{item.Puesto}</span>
                            : <span style={{color:"var(--e-muted)", fontSize:"0.8rem"}}>—</span>
                          }
                        </td>
                        <td>
                          <span style={{fontSize:"0.84rem", color: item.JefeInmediato ? "var(--e-text)" : "var(--e-muted)"}}>
                            {item.JefeInmediato || "—"}
                          </span>
                        </td>
                        <td>
                          {item.HorarioLaboral?.HoraEntrada
                            ? <span className="emp-chip">{item.HorarioLaboral.HoraEntrada} – {item.HorarioLaboral.HoraSalida}</span>
                            : <span style={{color:"var(--e-muted)", fontSize:"0.8rem"}}>—</span>
                          }
                        </td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormRH({ ...RH_INIT_F, ...item, empleado_id: empId }); setModal("rh"); }}
                          />
                        </td>
                      </>}

                      {/* ── TAB 7: Experiencia ── */}
                      {activeTab === 7 && <>
                        <td><span className="emp-name">{nombre}</span></td>
                        <td>
                          <div className="emp-timeline-preview">
                            {(item.Experiencia || []).length === 0
                              ? <span style={{color:"var(--e-muted)",fontSize:"0.8rem"}}>Sin registros</span>
                              : <>
                                  {(item.Experiencia || []).slice(0,2).map((e,i) => (
                                    <div key={i} className="emp-timeline-item">
                                      <span className="emp-tl-title">{e.Titulo || e.titulo}</span>
                                      <span className="emp-tl-date">{e.Fecha || e.fecha}</span>
                                    </div>
                                  ))}
                                  {(item.Experiencia||[]).length > 2 &&
                                    <span className="emp-more">+{item.Experiencia.length - 2} más</span>
                                  }
                                </>
                            }
                          </div>
                        </td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormExp({ empleado_id: empId, Experiencia: item.Experiencia || [] }); setModal("experiencia"); }}
                          />
                        </td>
                      </>}

                      {/* ── TAB 8: Educación ── */}
                      {activeTab === 8 && <>
                        <td><span className="emp-name">{nombre}</span></td>
                        <td>
                          <div className="emp-timeline-preview">
                            {(item.Educacion || []).length === 0
                              ? <span style={{color:"var(--e-muted)",fontSize:"0.8rem"}}>Sin registros</span>
                              : <>
                                  {(item.Educacion || []).slice(0,2).map((e,i) => (
                                    <div key={i} className="emp-timeline-item">
                                      <span className="emp-tl-title">{e.Titulo || e.titulo}</span>
                                      <span className="emp-tl-date">{e.Fecha || e.fecha}</span>
                                    </div>
                                  ))}
                                  {(item.Educacion||[]).length > 2 &&
                                    <span className="emp-more">+{item.Educacion.length - 2} más</span>
                                  }
                                </>
                            }
                          </div>
                        </td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormEd({ empleado_id: empId, Educacion: item.Educacion || [] }); setModal("educacion"); }}
                          />
                        </td>
                      </>}

                      {/* ── TAB 9: Skills ── */}
                      {activeTab === 9 && <>
                        <td><span className="emp-name">{nombre}</span></td>
                        <td>
                          <div className="emp-skills-preview">
                            {(item.Habilidades?.Programacion || []).length === 0
                              ? <span style={{color:"var(--e-muted)",fontSize:"0.8rem"}}>Sin habilidades</span>
                              : (item.Habilidades.Programacion || []).map((h,i) => (
                                  <div key={i} className="emp-skill-row">
                                    <span className="emp-skill-name">{h.Titulo || h.titulo}</span>
                                    <div className="emp-skill-bar-track">
                                      <div className="emp-skill-bar-fill" style={{width:`${h.Porcentaje||h.porcentaje||0}%`}} />
                                    </div>
                                    <span className="emp-skill-pct">{h.Porcentaje||h.porcentaje||0}%</span>
                                  </div>
                                ))
                            }
                          </div>
                        </td>
                        <td>
                          <Actions
                            empId={empId}
                            onEdit={() => { setFormSkill({ empleado_id: empId, Habilidades: item.Habilidades || { Programacion:[] } }); setModal("skills"); }}
                          />
                        </td>
                      </>}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Paginación ────────────────────────────────────────────────── */}
        {totalPags > 1 && (
          <div className="emp-pagination">
            <button
              className="emp-pag-btn"
              onClick={() => setPagina(p => Math.max(0, p-1))}
              disabled={pagina === 0}
            >
              <FaChevronLeft />
            </button>
            <span className="emp-pag-info">
              Página <strong>{pagina+1}</strong> de <strong>{totalPags}</strong>
              <span style={{marginLeft:8, color:"var(--e-hint)"}}>· {filtered.length} registros</span>
            </span>
            <button
              className="emp-pag-btn"
              onClick={() => setPagina(p => Math.min(totalPags-1, p+1))}
              disabled={pagina+1 >= totalPags}
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODALES
      ══════════════════════════════════════════════════════════════════ */}

      {/* 1 — Empleado */}
      <Modal isOpen={modal==="empleado"} toggle={() => setModal(null)} size="lg" centered>
        <ModalHeader toggle={() => setModal(null)}>
          {formEmp._id ? "Editar empleado" : <>Nuevo empleado <span className="modal-step-badge">Paso 1 de 3</span></>}
        </ModalHeader>
        <ModalBody>
          <div className="row g-3">
            {[
              { label:"Nombre",           field:"Nombre",        col:"col-md-4" },
              { label:"Apellido paterno", field:"ApelPaterno",   col:"col-md-4" },
              { label:"Apellido materno", field:"ApelMaterno",   col:"col-md-4" },
              { label:"Fecha nacimiento", field:"FecNacimiento", col:"col-md-6", type:"date" },
            ].map(({ label, field, col, type="text" }) => (
              <div key={field} className={col}>
                <label className="form-label">{label}</label>
                <input
                  className="form-control" type={type}
                  value={formEmp[field] || ""}
                  onChange={e => setFormEmp(p => ({ ...p, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div className="col-md-6">
              <label className="form-label">Fotografía</label>
              <button className="btn btn-outline-info w-100" onClick={openFilePicker}>
                <CiFileOn style={{marginRight:6}} />
                {filesContent.length > 0 ? `${filesContent.length} imagen(es) seleccionada(s)` : "Seleccionar imagen"}
              </button>
              {filesContent[0] && (
                <img src={filesContent[0].content} alt="preview" className="emp-foto-preview mt-2" />
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" onClick={paso1} disabled={guardando || !formEmp.Nombre}>
            {guardando ? "Guardando..." : "Continuar → Paso 2"}
          </button>
        </ModalFooter>
      </Modal>

      {/* 2 — Usuario */}
      <Modal isOpen={modal==="usuario"} centered>
        <ModalHeader>
          Credenciales <span className="modal-step-badge">Paso 2 de 3</span>
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label className="form-label">Nombre de usuario</label>
            <input className="form-control" placeholder="nombre.usuario" value={formUser.user} onChange={e => setFormUser(p => ({...p, user: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Contraseña temporal</label>
            <input className="form-control" type="password" value={formUser.password} onChange={e => setFormUser(p => ({...p, password: e.target.value}))} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" onClick={paso2} disabled={guardando || !formUser.user}>
            {guardando ? "Validando..." : "Continuar → Paso 3"}
          </button>
        </ModalFooter>
      </Modal>

      {/* 3 — Dirección y contacto */}
      <Modal isOpen={modal==="direccion"} size="lg" centered>
        <ModalHeader>
          Ubicación y contacto <span className="modal-step-badge">Paso 3 de 3</span>
        </ModalHeader>
        <ModalBody>
          <div className="row g-3">
            {[
              { label:"Calle",         field:"Calle",       col:"col-8" },
              { label:"Núm. ext.",     field:"NumExterior", col:"col-2" },
              { label:"Núm. int.",     field:"NumInterior", col:"col-2" },
              { label:"Municipio",     field:"Municipio",   col:"col-6" },
              { label:"Ciudad",        field:"Ciudad",      col:"col-6" },
              { label:"Código postal", field:"CodigoP",     col:"col-4" },
            ].map(({ label, field, col }) => (
              <div key={field} className={col}>
                <label className="form-label">{label}</label>
                <input className="form-control" value={formDir[field]||""} onChange={e => setFormDir(p => ({...p, [field]: e.target.value}))} />
              </div>
            ))}
            <div className="col-md-6">
              <label className="form-label">Teléfono celular</label>
              <input className="form-control" type="tel" value={formDC.TelCelular} onChange={e => setFormDC(p => ({...p, TelCelular: e.target.value}))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Correo electrónico</label>
              <input className="form-control" type="email" value={formDC.ListaCorreos} onChange={e => setFormDC(p => ({...p, ListaCorreos: e.target.value}))} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" onClick={paso3} disabled={guardando}>
            {guardando ? "Finalizando..." : "Completar registro"}
          </button>
        </ModalFooter>
      </Modal>

      {/* 4 — Editar contacto */}
      <Modal isOpen={modal==="contacto"} toggle={() => setModal(null)} centered>
        <ModalHeader toggle={() => setModal(null)}>Editar datos de contacto</ModalHeader>
        <ModalBody>
          {[
            { label:"Teléfono fijo", field:"TelFijo",      type:"tel"   },
            { label:"Celular",       field:"TelCelular",   type:"tel"   },
            { label:"WhatsApp",      field:"IdWhatsApp"               },
            { label:"Telegram",      field:"IdTelegram"               },
            { label:"Correo",        field:"ListaCorreos", type:"email" },
          ].map(({ label, field, type="text" }) => (
            <div key={field} className="mb-3">
              <label className="form-label">{label}</label>
              <input className="form-control" type={type} value={formDC[field]||""} onChange={e => setFormDC(p => ({...p, [field]: e.target.value}))} />
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" disabled={guardando} onClick={async () => {
            setGuardando(true);
            try { await contactoService.updateDatos(formDC.empleado_id || formDC._id, formDC); setModal(null); cargarTodo(); }
            finally { setGuardando(false); }
          }}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
        </ModalFooter>
      </Modal>

      {/* 5 — Editar familia */}
      <Modal isOpen={modal==="familia"} toggle={() => setModal(null)} centered>
        <ModalHeader toggle={() => setModal(null)}>Contacto de emergencia</ModalHeader>
        <ModalBody>
          {[
            { label:"Nombre",     field:"nombreContacto"               },
            { label:"Parentesco", field:"parenstesco"                  },
            { label:"Teléfono",   field:"telefonoContacto", type:"tel"   },
            { label:"Correo",     field:"correoContacto",  type:"email" },
            { label:"Dirección",  field:"direccionContacto"            },
          ].map(({ label, field, type="text" }) => (
            <div key={field} className="mb-3">
              <label className="form-label">{label}</label>
              <input className="form-control" type={type} value={formPC[field]||""} onChange={e => setFormPC(p => ({...p, [field]: e.target.value}))} />
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" disabled={guardando} onClick={async () => {
            setGuardando(true);
            try { await contactoService.updateDatos(formPC.empleado_id || formPC._id, formPC); setModal(null); cargarTodo(); }
            finally { setGuardando(false); }
          }}>{guardando ? "Guardando..." : "Guardar"}</button>
        </ModalFooter>
      </Modal>

      {/* 6 — Editar clínico */}
      <Modal isOpen={modal==="clinico"} toggle={() => setModal(null)} centered>
        <ModalHeader toggle={() => setModal(null)}>Expediente clínico</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label className="form-label">Tipo de sangre</label>
            <select className="form-control" value={formClin.tipoSangre||""} onChange={e => setFormClin(p => ({...p, tipoSangre: e.target.value}))}>
              <option value="">Seleccionar</option>
              {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {[
            { label:"NSS",              field:"NumeroSeguroSocial"    },
            { label:"Padecimientos",    field:"Padecimientos"         },
            { label:"Seguro de gastos", field:"Segurodegastosmedicos" },
          ].map(({ label, field }) => (
            <div key={field} className="mb-3">
              <label className="form-label">{label}</label>
              <input className="form-control" value={formClin[field]||""} onChange={e => setFormClin(p => ({...p, [field]: e.target.value}))} />
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" disabled={guardando} onClick={async () => {
            setGuardando(true);
            try { await clinicoService.update(formClin.empleado_id, formClin); setModal(null); cargarTodo(); }
            finally { setGuardando(false); }
          }}>{guardando ? "Guardando..." : "Guardar"}</button>
        </ModalFooter>
      </Modal>

      {/* 7 — Editar RH */}
      <Modal isOpen={modal==="rh"} toggle={() => setModal(null)} centered>
        <ModalHeader toggle={() => setModal(null)}>Datos de RH</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label className="form-label">Puesto</label>
            <input className="form-control" value={formRH.Puesto||""} onChange={e => setFormRH(p => ({...p, Puesto: e.target.value}))} />
          </div>
          <div className="mb-3">
            <label className="form-label">Jefe inmediato</label>
            <input className="form-control" value={formRH.JefeInmediato||""} onChange={e => setFormRH(p => ({...p, JefeInmediato: e.target.value}))} />
          </div>
          <div className="row g-3">
            {[
              { label:"Hora entrada",   field:"HoraEntrada",   type:"time" },
              { label:"Hora salida",    field:"HoraSalida",    type:"time" },
              { label:"Tiempo comida",  field:"TiempoComida"             },
              { label:"Días trabajados",field:"DiasTrabajados"           },
            ].map(({ label, field, type="text" }) => (
              <div key={field} className="col-6">
                <label className="form-label">{label}</label>
                <input className="form-control" type={type}
                  value={formRH.HorarioLaboral?.[field]||""}
                  onChange={e => setFormRH(p => ({...p, HorarioLaboral: {...p.HorarioLaboral, [field]: e.target.value}}))}
                />
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" disabled={guardando} onClick={async () => {
            setGuardando(true);
            try { await rhService.update(formRH.empleado_id, formRH); setModal(null); cargarTodo(); }
            finally { setGuardando(false); }
          }}>{guardando ? "Guardando..." : "Guardar"}</button>
        </ModalFooter>
      </Modal>

      {/* 8,9,10 — Experiencia / Educación / Skills */}
      {["experiencia","educacion","skills"].map(tipo => (
        <Modal key={tipo} isOpen={modal===tipo} toggle={() => setModal(null)} size="lg" centered>
          <ModalHeader toggle={() => setModal(null)}>
            {{ experiencia:"Experiencia laboral", educacion:"Educación", skills:"Habilidades" }[tipo]}
          </ModalHeader>
          <ModalBody style={{maxHeight:"60vh", overflowY:"auto"}}>

            {tipo==="experiencia" && (formExp.Experiencia||[]).map((exp,i) => (
              <div key={i} className="emp-modal-card">
                <label className="form-label">Cargo / Empresa</label>
                <input className="form-control mb-2" value={exp.Titulo||""} onChange={e => { const u=[...formExp.Experiencia]; u[i].Titulo=e.target.value; setFormExp(p=>({...p,Experiencia:u})); }} />
                <label className="form-label">Descripción</label>
                <textarea className="form-control mb-2" rows="2" value={exp.Descripcion||""} onChange={e => { const u=[...formExp.Experiencia]; u[i].Descripcion=e.target.value; setFormExp(p=>({...p,Experiencia:u})); }} />
                <label className="form-label">Periodo</label>
                <input className="form-control" value={exp.Fecha||""} onChange={e => { const u=[...formExp.Experiencia]; u[i].Fecha=e.target.value; setFormExp(p=>({...p,Experiencia:u})); }} />
              </div>
            ))}

            {tipo==="educacion" && (formEd.Educacion||[]).map((ed,i) => (
              <div key={i} className="emp-modal-card">
                <label className="form-label">Título obtenido</label>
                <input className="form-control mb-2" value={ed.Titulo||""} onChange={e => { const u=[...formEd.Educacion]; u[i].Titulo=e.target.value; setFormEd(p=>({...p,Educacion:u})); }} />
                <label className="form-label">Institución</label>
                <input className="form-control mb-2" value={ed.Institucion||""} onChange={e => { const u=[...formEd.Educacion]; u[i].Institucion=e.target.value; setFormEd(p=>({...p,Educacion:u})); }} />
                <label className="form-label">Año</label>
                <input className="form-control" value={ed.Fecha||""} onChange={e => { const u=[...formEd.Educacion]; u[i].Fecha=e.target.value; setFormEd(p=>({...p,Educacion:u})); }} />
              </div>
            ))}

            {tipo==="skills" && (formSkill.Habilidades?.Programacion||[]).map((h,i) => (
              <div key={i} className="row g-2 align-items-center mb-3">
                <div className="col-6">
                  <input className="form-control" placeholder="Habilidad" value={h.Titulo||""} onChange={e => { const u={...formSkill}; u.Habilidades.Programacion[i].Titulo=e.target.value; setFormSkill(u); }} />
                </div>
                <div className="col-3">
                  <input className="form-control text-center" type="number" min="0" max="100" placeholder="%" value={h.Porcentaje||""} onChange={e => { const u={...formSkill}; u.Habilidades.Programacion[i].Porcentaje=e.target.value; setFormSkill(u); }} />
                </div>
                <div className="col-3">
                  <div className="emp-skill-bar-track">
                    <div className="emp-skill-bar-fill" style={{width:`${h.Porcentaje||0}%`}} />
                  </div>
                </div>
              </div>
            ))}
          </ModalBody>
          <ModalFooter>
            <button className="btn btn-primary w-100" disabled={guardando} onClick={async () => {
              setGuardando(true);
              try {
                const payload = tipo==="experiencia" ? formExp : tipo==="educacion" ? formEd : formSkill;
                await educacionService.update(payload.empleado_id, payload);
                setModal(null); cargarTodo();
              } finally { setGuardando(false); }
            }}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
          </ModalFooter>
        </Modal>
      ))}

    </section>
  );
}

export default Empleados;