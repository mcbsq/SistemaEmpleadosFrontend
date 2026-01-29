import React, { useEffect, useState, useCallback } from "react";
import "./Empleados.css";
import { Link } from "react-router-dom";
import { Modal, ModalHeader, ModalBody, ModalFooter, Table } from "reactstrap";
import { CiFacebook, CiLinkedin, CiYoutube, CiEdit, CiTrash, CiUser, CiSearch, CiFileOn, CiBoxList } from "react-icons/ci";
import { FaInstagram, FaTiktok, FaPlus, FaChevronLeft, FaChevronRight, FaFileExcel } from "react-icons/fa";
import { useFilePicker } from "use-file-picker";
import * as XLSX from "xlsx";

// Importación de servicios
import { empleadoService } from "../services/empleadoService";
import { contactoService } from "../services/contactoService";
import { educacionService } from "../services/educacionService";
import { usuarioService } from "../services/usuarioService";
import { direccionService } from "../services/direccionService";

function Empleados() {
  // --- ESTADOS DE DATOS ---
  const [empleados, setEmpleados] = useState([]);
  const [datoscontacto, setdatoscontacto] = useState([]);
  const [personascontacto, setpersonascontacto] = useState([]);
  const [redsocial, setredsocial] = useState([]);
  const [educacion, seteducacion] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  // --- ESTADOS DE UI ---
  const [activeTab, setActiveTab] = useState(1);
  const [globalFilter, setglobalFilter] = useState("");
  const [globalpage, setglobalpage] = useState(0);
  const [globalnumber, setglobalnumber] = useState(1);
  const [datosCargados, setDatosCargados] = useState(false);
  const [modalTitulo, setModalTitulo] = useState("Agregar");
  const [messageRegistro, setMessageRegistro] = useState("");

  // --- ESTADOS DE TODOS LOS MODALES ---
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalAgregarUsuario, setModalAgregarUsuario] = useState(false);
  const [modalAgregarDireccion, setModalAgregarDireccion] = useState(false);
  const [modalAgregarDC, setModalAgregarDC] = useState(false);
  const [modalAgregarPC, setModalAgregarPC] = useState(false);
  const [modalAgregarRS, setModalAgregarRS] = useState(false);
  const [ModalAgregarExperiencia, setModalAgregarExperiencia] = useState(false);
  const [ModalAgregarEducacion, setModalAgregarEducacion] = useState(false);
  const [ModalAgregarHabilidades, setModalAgregarHabilidades] = useState(false);

  // --- FORMULARIOS ---
  const [formEmpleado, setFormEmpleado] = useState({ _id: "", Nombre: "", ApelPaterno: "", ApelMaterno: "", FecNacimiento: "", Fotografias: [] });
  const [formUsuario, setFormUsuario] = useState({ user: "", password: "" });
  const [formDatosContacto, setFormDatosContacto] = useState({ TelFijo: "", TelCelular: "", IdWhatsApp: "", IdTelegram: "", ListaCorreos: "" });
  const [formDireccion, setFormDireccion] = useState({ Calle: "", NumExterior: "", NumInterior: "", Manzana: "", Lote: "", Municipio: "", Ciudad: "", CodigoP: "", Pais: "" });
  const [formcontacto, setformcontacto] = useState({ TelFijo: "", TelCelular: "", IdWhatsApp: "", IdTelegram: "", ListaCorreos: "" });
  const [formperscontacto, setformperscontacto] = useState({ parenstesco: "", nombreContacto: "", telefonoContacto: "", correoContacto: "", direccionContacto: "" });
  const [formRS, setformRS] = useState([]);
  const [formEducacion, setformEducacion] = useState({ Educacion: [] });
  const [formExperiencia, setformExperiencia] = useState({ Experiencia: [] });
  const [formHabilidades, setFormHabilidades] = useState({ Habilidades: { Programacion: [] } });

  const { openFilePicker, filesContent } = useFilePicker({ readAs: "DataURL", accept: "image/*", multiple: true });

  const RedSocialOptions = [
    { label: "Facebook", value: <CiFacebook /> },
    { label: "Instagram", value: <FaInstagram /> },
    { label: "Linkedin", value: <CiLinkedin /> },
    { label: "Youtube", value: <CiYoutube /> },
    { label: "tiktok", value: <FaTiktok /> },
  ];

  const cargarTodo = useCallback(async () => {
    try {
      const [emp, dc, pc, rs, ed] = await Promise.all([
        empleadoService.getAll(),
        contactoService.getDatos(),
        contactoService.getPersonas(),
        contactoService.getRedes(),
        educacionService.getAll()
      ]);
      setEmpleados(Array.isArray(emp) ? emp : []);
      setdatoscontacto(Array.isArray(dc) ? dc : []);
      setpersonascontacto(Array.isArray(pc) ? pc : []);
      setredsocial(Array.isArray(rs) ? rs : []);
      seteducacion(Array.isArray(ed) ? ed : []);
      setDatosCargados(true);
      console.log("Carga completa. Empleados detectados:", emp.length);
    } catch (error) { 
      console.error("Error crítico en cargarTodo:", error); 
      setDatosCargados(true); 
    }
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  // --- NAVEGACIÓN ---
  const handleNextPage = () => { setglobalpage(prev => prev + 5); setglobalnumber(prev => prev + 1); };
  const handlePrevPage = () => { setglobalpage(prev => Math.max(0, prev - 5)); setglobalnumber(prev => Math.max(1, prev - 1)); };

  // --- ACCIONES ---
  const handleEliminarEmpleado = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este empleado y todos sus datos asociados?")) {
      await empleadoService.deleteFull(id);
      cargarTodo();
    }
  };

  const ejecutarGuardarEmpleado = async () => {
    const data = { ...formEmpleado, Fotografias: filesContent.map(f => f.content) };
    const res = await empleadoService.create(data);
    const newId = res._id?.$oid || res._id;
    setFormEmpleado({ ...formEmpleado, _id: newId });
    setModalAgregar(false);
    setModalAgregarUsuario(true);
  };

  const ejecutarGuardarUsuario = async () => {
    await usuarioService.create({ ...formUsuario, empleado_id: formEmpleado._id });
    setModalAgregarUsuario(false);
    setModalAgregarDireccion(true);
  };

  const ejecutarGuardarDireccionYContacto = async () => {
    await direccionService.create({ ...formDireccion, empleado_id: formEmpleado._id });
    await contactoService.createDatos({ ...formDatosContacto, empleado_id: formEmpleado._id });
    setModalAgregarDireccion(false);
    cargarTodo();
  };

  const renderTableData = () => {
    let source = [];
    const tab = Number(activeTab);
    
    if (tab === 1) source = empleados;
    else if (tab === 2) source = datoscontacto;
    else if (tab === 3) source = personascontacto;
    else if (tab === 5) source = redsocial;
    else if (tab === 7) source = educacion; 
    else if (tab === 8) source = educacion;
    else if (tab === 9) source = educacion;

    if (!source || !Array.isArray(source)) return [];

    const filtered = source.filter((item) => {
      if (!globalFilter || globalFilter.trim() === "") return true;
      const target = (item.Nombre || item.NombreCompleto || item.nombre || "").toString().toLowerCase();
      return target.includes(globalFilter.toLowerCase().trim());
    });

    return filtered.slice(globalpage, globalpage + 5);
  };

  if (!datosCargados) return <div className="loading"><span className="span1"></span></div>;

  return (
    <section className="empleados">
      <div className="CRUDS">
        <div className="Agregar-Emp">
          <button className="btn btn-primary" onClick={() => { setModalTitulo("Agregar Empleado"); setModalAgregar(true); }}>
            <FaPlus />
          </button>
          <div className="search-container" style={{ position: "relative", flex: 1 }}>
            <CiSearch style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", color: "#6e6e73", fontSize: "1.2rem" }} />
            <input 
              type="text" 
              className="inputEmpleados" 
              placeholder="Buscar por nombre o apellido..." 
              value={globalFilter} 
              onChange={(e) => setglobalFilter(e.target.value)} 
              style={{ paddingLeft: "55px" }}
            />
          </div>
          <button className="btn btn-info" onClick={() => {
            const ws = XLSX.utils.json_to_sheet(empleados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Empleados");
            XLSX.writeFile(wb, "Reporte_Empleados_Cibercom.xlsx");
          }}>
            <FaFileExcel />
          </button>
        </div>

        <div className="tabs">
          {["General", "Contacto", "Familia", "Clínico", "Redes", "RH", "Experiencia", "Educación", "Skills"].map((name, i) => (
            <button 
              key={i} 
              className={activeTab === i + 1 ? "active" : ""} 
              onClick={() => { setActiveTab(i + 1); setglobalpage(0); setglobalnumber(1); }}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="tab-content">
          <Table responsive className="table table-hover align-middle">
            <thead>
              {Number(activeTab) === 1 && <tr><th>Nombre</th><th>Apellidos</th><th>Nacimiento</th><th>Foto</th><th className="text-center">Acciones</th></tr>}
              {Number(activeTab) === 2 && <tr><th>Nombre Completo</th><th>Tel. Fijo</th><th>Celular</th><th>WhatsApp</th><th>Correos</th><th className="text-center">Acciones</th></tr>}
              {Number(activeTab) === 3 && <tr><th>Empleado</th><th>Parentesco</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th className="text-center">Acciones</th></tr>}
              {Number(activeTab) === 5 && <tr><th>Nombre</th><th>Redes Sociales</th><th className="text-center">Acciones</th></tr>}
              {Number(activeTab) === 7 && <tr><th>Nombre</th><th>Empresa/Puesto</th><th>Fecha</th><th>Descripción</th><th className="text-center">Acciones</th></tr>}
              {Number(activeTab) === 8 && <tr><th>Nombre</th><th>Institución</th><th>Fecha</th><th>Título Obtenido</th><th className="text-center">Acciones</th></tr>}
              {Number(activeTab) === 9 && <tr><th>Nombre</th><th>Habilidad Técnica</th><th>Nivel (%)</th><th className="text-center">Acciones</th></tr>}
            </thead>
            <tbody>
              {renderTableData().map((item, idx) => {
                const recordId = item._id?.$oid || item._id;
                const empIdRef = item.empleado_id?.$oid || item.empleado_id || item.EmpleadoId || recordId;
                const currentTab = Number(activeTab);

                return (
                  <tr key={recordId || idx}>
                    {currentTab === 1 && (
                      <>
                        <td data-label="Nombre">{item.Nombre || item.nombre}</td>
                        <td data-label="Apellidos">{`${item.ApelPaterno || item.apelPaterno || ""} ${item.ApelMaterno || item.apelMaterno || ""}`}</td>
                        <td data-label="Nacimiento">{item.FecNacimiento || item.fecNacimiento}</td>
                        <td data-label="Foto">
                          {(item.Fotografias || item.fotografias)?.[0] ? (
                            <img src={(item.Fotografias || item.fotografias)[0]} alt="user" />
                          ) : <div className="no-photo" style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "#6e6e73", border: "1px solid var(--glass-border)" }}>N/A</div>}
                        </td>
                        <td className="text-center">
                          <button className="btn btn-info" onClick={() => { setFormEmpleado(item); setModalTitulo("Editar Empleado"); setModalAgregar(true); }}><CiEdit /></button>
                          <button className="btn btn-danger" onClick={() => handleEliminarEmpleado(recordId)}><CiTrash /></button>
                          <Link to={`/Perfil/${recordId}`} className="btn btn-primary"><CiUser /></Link>
                        </td>
                      </>
                    )}

                    {currentTab === 2 && (
                      <>
                        <td data-label="Nombre">{item.NombreCompleto || item.nombreCompleto}</td>
                        <td data-label="Tel. Fijo">{item.TelFijo || item.telFijo || "N/A"}</td>
                        <td data-label="Celular">{item.TelCelular || item.telCelular}</td>
                        <td data-label="WhatsApp">{item.IdWhatsApp || item.idWhatsApp}</td>
                        <td data-label="Correos">{item.ListaCorreos || item.listaCorreos}</td>
                        <td className="text-center">
                          <button className="btn btn-info" onClick={() => { setformcontacto(item); setModalAgregarDC(true); }}><CiEdit /></button>
                          <Link to={`/Perfil/${empIdRef}`} className="btn btn-primary"><CiUser /></Link>
                        </td>
                      </>
                    )}

                    {currentTab === 3 && (
                      <>
                        <td data-label="Empleado">{item.NombreCompleto || item.nombreCompleto}</td>
                        <td data-label="Parentesco">{item.parenstesco || item.Parentesco}</td>
                        <td data-label="Contacto">{item.nombreContacto || item.NombreContacto}</td>
                        <td data-label="Teléfono">{item.telefonoContacto || item.TelefonoContacto}</td>
                        <td data-label="Correo">{item.correoContacto || item.CorreoContacto}</td>
                        <td className="text-center">
                          <button className="btn btn-info" onClick={() => { setformperscontacto(item); setModalAgregarPC(true); }}><CiEdit /></button>
                          <Link to={`/Perfil/${empIdRef}`} className="btn btn-primary"><CiUser /></Link>
                        </td>
                      </>
                    )}

                    {currentTab === 5 && (
                      <>
                        <td data-label="Nombre">{item.NombreCompleto || item.nombreCompleto}</td>
                        <td data-label="Redes">
                          <div className="d-flex flex-wrap gap-2">
                            {(item.RedesSociales || item.redes_sociales)?.map((r, i) => (
                              <span key={i} className="badge bg-dark border border-secondary p-2 d-flex align-items-center gap-1" style={{ borderRadius: "10px", fontWeight: "400" }}>
                                {RedSocialOptions.find(o => o.label.toLowerCase() === (r.redSocialSeleccionada || r.red_social || "").toLowerCase())?.value}
                                {r.NombreRedSocial || r.nombre_usuario}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center">
                          <button className="btn btn-info" onClick={() => { setformRS(item.RedesSociales || item.redes_sociales); setModalAgregarRS(true); }}><CiEdit /></button>
                          <Link to={`/Perfil/${empIdRef}`} className="btn btn-primary"><CiUser /></Link>
                        </td>
                      </>
                    )}

                    {currentTab === 7 && (
                      <>
                        <td data-label="Nombre">{item.NombreCompleto || item.nombreCompleto}</td>
                        <td data-label="Puesto">{(item.Experiencia || item.experiencia)?.map((e, i) => <div key={i} className="fw-bold">{e.Titulo || e.titulo}</div>)}</td>
                        <td data-label="Fecha">{(item.Experiencia || item.experiencia)?.map((e, i) => <div key={i}>{e.Fecha || e.fecha}</div>)}</td>
                        <td data-label="Descripción">{(item.Experiencia || item.experiencia)?.map((e, i) => <div key={i} className="text-muted small text-truncate" style={{maxWidth: "150px"}}>{e.Descripcion || e.descripcion}</div>)}</td>
                        <td className="text-center">
                          <button className="btn btn-info" onClick={() => { setformExperiencia(item); setModalAgregarExperiencia(true); }}><CiEdit /></button>
                          <Link to={`/Perfil/${empIdRef}`} className="btn btn-primary"><CiUser /></Link>
                        </td>
                      </>
                    )}

                    {currentTab === 8 && (
                      <>
                        <td data-label="Nombre">{item.NombreCompleto || item.nombreCompleto}</td>
                        <td data-label="Institución">{(item.Educacion || item.educacion)?.map((e, i) => <div key={i}>{e.Institucion || e.institucion}</div>)}</td>
                        <td data-label="Fecha">{(item.Educacion || item.educacion)?.map((e, i) => <div key={i}>{e.Fecha || e.fecha}</div>)}</td>
                        <td data-label="Título">{(item.Educacion || item.educacion)?.map((e, i) => <div key={i} className="fw-bold">{e.Titulo || e.titulo}</div>)}</td>
                        <td className="text-center">
                          <button className="btn btn-info" onClick={() => { setformEducacion(item); setModalAgregarEducacion(true); }}><CiEdit /></button>
                          <Link to={`/Perfil/${empIdRef}`} className="btn btn-primary"><CiUser /></Link>
                        </td>
                      </>
                    )}

                    {currentTab === 9 && (
                      <>
                        <td data-label="Nombre">{item.NombreCompleto || item.nombreCompleto}</td>
                        <td data-label="Skill">{(item.Habilidades?.Programacion || item.habilidades?.programacion)?.map((h, i) => <div key={i}>{h.Titulo || h.titulo}</div>)}</td>
                        <td data-label="Nivel">{(item.Habilidades?.Programacion || item.habilidades?.programacion)?.map((h, i) => (
                          <div key={i} className="progress mt-1" style={{height: "6px", background: "rgba(255,255,255,0.05)"}}>
                            <div className="progress-bar" role="progressbar" style={{width: `${h.Porcentaje || h.porcentaje}%`, background: "var(--accent-blue)"}}></div>
                          </div>
                        ))}</td>
                        <td className="text-center">
                          <button className="btn btn-info" onClick={() => { setFormHabilidades(item); setModalAgregarHabilidades(true); }}><CiEdit /></button>
                          <Link to={`/Perfil/${empIdRef}`} className="btn btn-primary"><CiUser /></Link>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
          
          {renderTableData().length === 0 && (
            <div className="alert alert-dark text-center py-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed var(--glass-border)", borderRadius: "20px", color: "#6e6e73" }}>
              <CiBoxList style={{ fontSize: "2rem", marginBottom: "10px" }} /><br />
              No se encontraron registros en esta base de datos.
            </div>
          )}

          <div className="navegacion-emp">
            <button className="btn-nav" onClick={handlePrevPage} disabled={globalpage === 0} style={{ background: "none", border: "1px solid var(--glass-border)", color: "#fff", borderRadius: "50%", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: globalpage === 0 ? 0.3 : 1 }}>
              <FaChevronLeft />
            </button>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "1.5px" }}>
              Panel {globalnumber}
            </span>
            <button className="btn-nav" onClick={handleNextPage} style={{ background: "none", border: "1px solid var(--glass-border)", color: "#fff", borderRadius: "50%", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* --- BLOQUE DE MODALES (CRISTAL LÍQUIDO) --- */}
      
      {/* 1. AGREGAR/EDITAR EMPLEADO */}
      <Modal isOpen={modalAgregar} toggle={() => setModalAgregar(false)} size="lg" centered>
        <ModalHeader toggle={() => setModalAgregar(false)}>
          <span style={{ color: "#fff", fontWeight: "700", letterSpacing: "1px" }}>{modalTitulo}</span>
        </ModalHeader>
        <ModalBody>
          <div className="row g-4">
            <div className="col-md-4">
              <label className="form-label small text-muted text-uppercase">Nombre</label>
              <input className="form-control" type="text" value={formEmpleado.Nombre} onChange={e => setFormEmpleado({...formEmpleado, Nombre: e.target.value})} />
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted text-uppercase">Apellido Paterno</label>
              <input className="form-control" type="text" value={formEmpleado.ApelPaterno} onChange={e => setFormEmpleado({...formEmpleado, ApelPaterno: e.target.value})} />
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted text-uppercase">Apellido Materno</label>
              <input className="form-control" type="text" value={formEmpleado.ApelMaterno} onChange={e => setFormEmpleado({...formEmpleado, ApelMaterno: e.target.value})} />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted text-uppercase">Fecha de Nacimiento</label>
              <input className="form-control" type="date" value={formEmpleado.FecNacimiento} onChange={e => setFormEmpleado({...formEmpleado, FecNacimiento: e.target.value})} />
            </div>
            <div className="col-md-6">
              <label className="form-label d-block small text-muted text-uppercase">Fotografía de Perfil</label>
              <button className="btn btn-outline-info w-100" onClick={() => openFilePicker()} style={{ borderRadius: "15px", padding: "10px" }}>
                <CiFileOn className="me-2" /> {filesContent.length > 0 ? `${filesContent.length} Imagen(es)` : "Cargar Archivo"}
              </button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" style={{ height: "50px" }} onClick={ejecutarGuardarEmpleado}>Continuar al paso 2</button>
        </ModalFooter>
      </Modal>

      {/* 2. CREDENCIALES USUARIO */}
      <Modal isOpen={modalAgregarUsuario} toggle={() => setModalAgregarUsuario(false)} centered>
        <ModalHeader>Credenciales de Acceso</ModalHeader>
        <ModalBody>
          <div className="mb-4">
            <label className="form-label small text-muted text-uppercase">Usuario ID</label>
            <input className="form-control" value={formUsuario.user} onChange={e => setFormUsuario({...formUsuario, user: e.target.value})} placeholder="ej: nombre.usuario" />
          </div>
          <div className="mb-2">
            <label className="form-label small text-muted text-uppercase">Password Temporal</label>
            <input className="form-control" type="password" value={formUsuario.password} onChange={e => setFormUsuario({...formUsuario, password: e.target.value})} />
          </div>
        </ModalBody>
        <ModalFooter><button className="btn btn-primary w-100" onClick={ejecutarGuardarUsuario}>Validar y Continuar</button></ModalFooter>
      </Modal>

      {/* 3. DIRECCIÓN Y CONTACTO */}
      <Modal isOpen={modalAgregarDireccion} toggle={() => setModalAgregarDireccion(false)} size="lg" centered>
        <ModalHeader>Localización Geográfica</ModalHeader>
        <ModalBody>
          <div className="row g-3">
            <div className="col-8"><label className="small text-muted text-uppercase">Calle</label><input className="form-control" value={formDireccion.Calle} onChange={e => setFormDireccion({...formDireccion, Calle: e.target.value})} /></div>
            <div className="col-2"><label className="small text-muted text-uppercase">Num. Ext</label><input className="form-control" value={formDireccion.NumExterior} onChange={e => setFormDireccion({...formDireccion, NumExterior: e.target.value})} /></div>
            <div className="col-2"><label className="small text-muted text-uppercase">Num. Int</label><input className="form-control" value={formDireccion.NumInterior} onChange={e => setFormDireccion({...formDireccion, NumInterior: e.target.value})} /></div>
            <div className="col-6"><label className="small text-muted text-uppercase">Municipio / Delegación</label><input className="form-control" value={formDireccion.Municipio} onChange={e => setFormDireccion({...formDireccion, Municipio: e.target.value})} /></div>
            <div className="col-6"><label className="small text-muted text-uppercase">Teléfono Móvil</label><input className="form-control" value={formDatosContacto.TelCelular} onChange={e => setFormDatosContacto({...formDatosContacto, TelCelular: e.target.value})} /></div>
          </div>
        </ModalBody>
        <ModalFooter><button className="btn btn-primary w-100" style={{ height: "50px" }} onClick={ejecutarGuardarDireccionYContacto}>Finalizar Configuración</button></ModalFooter>
      </Modal>

      {/* 4. EDITAR CONTACTO (DC) */}
      <Modal isOpen={modalAgregarDC} toggle={() => setModalAgregarDC(false)} centered>
        <ModalHeader>Ajustes de Contacto</ModalHeader>
        <ModalBody>
          <label className="small text-muted text-uppercase">ID WhatsApp</label>
          <input className="form-control mb-4" value={formcontacto.IdWhatsApp} onChange={e => setformcontacto({...formcontacto, IdWhatsApp: e.target.value})} />
          <label className="small text-muted text-uppercase">Email de Enlace</label>
          <input className="form-control" value={formcontacto.ListaCorreos} onChange={e => setformcontacto({...formcontacto, ListaCorreos: e.target.value})} />
        </ModalBody>
        <ModalFooter><button className="btn btn-primary w-100" onClick={async () => { await contactoService.updateDatos(formcontacto._id, formcontacto); setModalAgregarDC(false); cargarTodo(); }}>Actualizar Nodo</button></ModalFooter>
      </Modal>

      {/* 5. EDITAR PERSONA DE CONTACTO (PC) */}
      <Modal isOpen={modalAgregarPC} toggle={() => setModalAgregarPC(false)} centered>
        <ModalHeader>Enlace de Emergencia</ModalHeader>
        <ModalBody>
          <label className="small text-muted text-uppercase">Nombre del Enlace</label>
          <input className="form-control mb-4" value={formperscontacto.nombreContacto} onChange={e => setformperscontacto({...formperscontacto, nombreContacto: e.target.value})} />
          <label className="small text-muted text-uppercase">Canal Telefónico</label>
          <input className="form-control" value={formperscontacto.telefonoContacto} onChange={e => setformperscontacto({...formperscontacto, telefonoContacto: e.target.value})} />
        </ModalBody>
        <ModalFooter><button className="btn btn-primary w-100" onClick={async () => { await contactoService.updatePersona(formperscontacto._id, formperscontacto); setModalAgregarPC(false); cargarTodo(); }}>Confirmar Enlace</button></ModalFooter>
      </Modal>

      {/* 6. EDITAR REDES (RS) */}
      <Modal isOpen={modalAgregarRS} toggle={() => setModalAgregarRS(false)} centered>
        <ModalHeader>Ecosistema Digital</ModalHeader>
        <ModalBody>
          {formRS.map((red, index) => (
            <div key={index} className="mb-3">
              <label className="small text-muted text-uppercase">{red.redSocialSeleccionada || red.red_social}</label>
              <input className="form-control" value={red.NombreRedSocial || red.nombre_usuario} onChange={e => {
                const u = [...formRS]; u[index].NombreRedSocial = e.target.value; setformRS(u);
              }} />
            </div>
          ))}
        </ModalBody>
        <ModalFooter><button className="btn btn-primary w-100" onClick={() => setModalAgregarRS(false)}>Cerrar Panel</button></ModalFooter>
      </Modal>

      {/* 7. EXPERIENCIA / EDUCACIÓN / SKILLS */}
      <Modal isOpen={ModalAgregarExperiencia || ModalAgregarEducacion || ModalAgregarHabilidades} toggle={() => { setModalAgregarExperiencia(false); setModalAgregarEducacion(false); setModalAgregarHabilidades(false); }} size="lg" centered>
        <ModalHeader>Módulo Curricular</ModalHeader>
        <ModalBody style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {ModalAgregarExperiencia && formExperiencia.Experiencia?.map((exp, i) => (
            <div key={i} className="mb-4 p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "25px" }}>
              <input className="form-control mb-3 fw-bold" placeholder="Cargo / Compañía" value={exp.Titulo} onChange={e => { const u = [...formExperiencia.Experiencia]; u[i].Titulo = e.target.value; setformExperiencia({...formExperiencia, Experiencia: u}); }} />
              <textarea className="form-control mb-3" rows="3" placeholder="Descripción de actividades" value={exp.Descripcion} onChange={e => { const u = [...formExperiencia.Experiencia]; u[i].Descripcion = e.target.value; setformExperiencia({...formExperiencia, Experiencia: u}); }} />
              <input className="form-control" type="text" placeholder="Periodo Cronológico" value={exp.Fecha} onChange={e => { const u = [...formExperiencia.Experiencia]; u[i].Fecha = e.target.value; setformExperiencia({...formExperiencia, Experiencia: u}); }} />
            </div>
          ))}

          {ModalAgregarEducacion && formEducacion.Educacion?.map((ed, i) => (
            <div key={i} className="mb-4 p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "25px" }}>
              <input className="form-control mb-3 fw-bold" placeholder="Grado Académico" value={ed.Titulo} onChange={e => { const u = [...formEducacion.Educacion]; u[i].Titulo = e.target.value; setformEducacion({...formEducacion, Educacion: u}); }} />
              <input className="form-control mb-3" placeholder="Centro de Estudios" value={ed.Institucion} onChange={e => { const u = [...formEducacion.Educacion]; u[i].Institucion = e.target.value; setformEducacion({...formEducacion, Educacion: u}); }} />
              <input className="form-control" placeholder="Año de Finalización" value={ed.Fecha} onChange={e => { const u = [...formEducacion.Educacion]; u[i].Fecha = e.target.value; setformEducacion({...formEducacion, Educacion: u}); }} />
            </div>
          ))}

          {ModalAgregarHabilidades && formHabilidades.Habilidades?.Programacion?.map((hab, i) => (
            <div key={i} className="row g-3 mb-3 align-items-center">
              <div className="col-8"><input className="form-control" value={hab.Titulo} onChange={e => { const u = {...formHabilidades}; u.Habilidades.Programacion[i].Titulo = e.target.value; setFormHabilidades(u); }} /></div>
              <div className="col-4"><input className="form-control text-center" type="number" value={hab.Porcentaje} onChange={e => { const u = {...formHabilidades}; u.Habilidades.Programacion[i].Porcentaje = e.target.value; setFormHabilidades(u); }} /></div>
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary w-100" style={{ height: "50px" }} onClick={async () => { 
            const dataToUpdate = ModalAgregarExperiencia ? formExperiencia : (ModalAgregarEducacion ? formEducacion : formHabilidades);
            await educacionService.update(dataToUpdate.empleado_id || dataToUpdate._id, dataToUpdate); 
            setModalAgregarExperiencia(false); setModalAgregarEducacion(false); setModalAgregarHabilidades(false); 
            cargarTodo(); 
          }}>Sincronizar Datos</button>
        </ModalFooter>
      </Modal>

    </section>
  );
}

export default Empleados;