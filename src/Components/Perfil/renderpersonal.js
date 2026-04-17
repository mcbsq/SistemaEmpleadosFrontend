import React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { CiFacebook, CiLinkedin, CiYoutube } from "react-icons/ci";
import { FaInstagram, FaTiktok, FaGithub } from "react-icons/fa";
import { authService } from "../../services/authService";
import { PDFAttachment } from "./PDFAttachment";

// ─── Catálogo de redes sociales ───────────────────────────────────────────────
const REDES_CONFIG = [
  { label: "Facebook",  icon: <CiFacebook /> },
  { label: "Instagram", icon: <FaInstagram /> },
  { label: "LinkedIn",  icon: <CiLinkedin /> },
  { label: "YouTube",   icon: <CiYoutube /> },
  { label: "TikTok",    icon: <FaTiktok /> },
  { label: "GitHub",    icon: <FaGithub /> },
];

// ─── Campo genérico ───────────────────────────────────────────────────────────
const Field = ({ label, value, isEditing, onChange, type = "text", placeholder = "" }) => (
  <div className="field-row">
    <span className="field-label">{label}</span>
    {isEditing ? (
      <input
        type={type}
        className="field-input"
        value={value || ""}
        placeholder={placeholder || label}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <span className="field-value">{value || <em className="field-empty">Sin datos</em>}</span>
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
// DESCRIPCIÓN
// ════════════════════════════════════════════════════════════════════════════════
export const DescriptionRenderer = ({ isEditing, descripcion, setDescripcion }) => (
  <div className="section-inner">
    <h3 className="section-title">Descripción</h3>
    {isEditing ? (
      <TextareaAutosize
        className="field-textarea"
        value={descripcion ?? ""}
        placeholder="Cuéntanos sobre ti..."
        onChange={(e) => setDescripcion(e.target.value)}
      />
    ) : (
      <p className="description-text">{descripcion || "Sin descripción disponible."}</p>
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
// INFO PERSONAL / DATOS DE CONTACTO
// ════════════════════════════════════════════════════════════════════════════════
export const InfoPersonalRenderer = ({ isEditing, datoscontacto, handleInputChangedatoscontacto }) => {
  const dc = datoscontacto ?? {};
  return (
    <div className="section-inner">
      <h3 className="section-title">Datos de Contacto</h3>
      <Field label="Teléfono celular" value={dc.telefonoC}  isEditing={isEditing} onChange={v => handleInputChangedatoscontacto("telefonoC", v)}  type="tel" />
      <Field label="Teléfono fijo"    value={dc.telefonoF}  isEditing={isEditing} onChange={v => handleInputChangedatoscontacto("telefonoF", v)}  type="tel" />
      <Field label="WhatsApp"         value={dc.IDwhatsapp} isEditing={isEditing} onChange={v => handleInputChangedatoscontacto("IDwhatsapp", v)} />
      <Field label="Telegram"         value={dc.IDtelegram} isEditing={isEditing} onChange={v => handleInputChangedatoscontacto("IDtelegram", v)} />
      <Field label="Correo"           value={dc.correo}     isEditing={isEditing} onChange={v => handleInputChangedatoscontacto("correo", v)}     type="email" />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// CONTACTO DE EMERGENCIA
// ════════════════════════════════════════════════════════════════════════════════
export const PersonasContactoRenderer = ({ isEditing, personalcontacto, handlePersonalContactoChange }) => {
  const p = personalcontacto ?? {};
  return (
    <div className="section-inner">
      <h3 className="section-title">Contacto de Emergencia</h3>
      <Field label="Nombre"      value={p.nombreContacto}    isEditing={isEditing} onChange={v => handlePersonalContactoChange("nombreContacto", v)} />
      <Field label="Parentesco"  value={p.parenstesco}       isEditing={isEditing} onChange={v => handlePersonalContactoChange("parenstesco", v)} />
      <Field label="Teléfono"    value={p.telefonoContacto}  isEditing={isEditing} onChange={v => handlePersonalContactoChange("telefonoContacto", v)} type="tel" />
      <Field label="Correo"      value={p.correoContacto}    isEditing={isEditing} onChange={v => handlePersonalContactoChange("correoContacto", v)} type="email" />
      <Field label="Dirección"   value={p.direccionContacto} isEditing={isEditing} onChange={v => handlePersonalContactoChange("direccionContacto", v)} />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// REDES SOCIALES
// ════════════════════════════════════════════════════════════════════════════════
export const RedesSocialesRenderer = ({ isEditing, redesSociales = [], setRedesSociales }) => {
  const add    = () => setRedesSociales([...redesSociales, { redSocialSeleccionada: "", NombreRedSocial: "", URLRedSocial: "" }]);
  const remove = (i) => setRedesSociales(redesSociales.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const up = [...redesSociales];
    up[i] = { ...up[i], [field]: val };
    setRedesSociales(up);
  };

  return (
    <div className="section-inner">
      <h3 className="section-title">Redes Sociales</h3>
      {isEditing ? (
        <div className="redes-edit-list">
          {redesSociales.map((s, i) => (
            <div key={i} className="redes-edit-row">
              <select
                className="field-input field-input--sm"
                value={s.redSocialSeleccionada}
                onChange={e => update(i, "redSocialSeleccionada", e.target.value)}
              >
                <option value="">Red social</option>
                {REDES_CONFIG.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
              </select>
              <input
                className="field-input"
                placeholder="Usuario o URL"
                value={s.NombreRedSocial}
                onChange={e => update(i, "NombreRedSocial", e.target.value)}
              />
              <button className="btn-icon btn-icon--danger" onClick={() => remove(i)}>✕</button>
            </div>
          ))}
          <button className="btn-ghost" onClick={add}>+ Agregar red</button>
        </div>
      ) : (
        <div className="redes-view-list">
          {redesSociales.length === 0
            ? <em className="field-empty">Sin redes registradas</em>
            : redesSociales.map((s, i) => (
              <div key={i} className="red-item">
                <span className="red-icon">
                  {REDES_CONFIG.find(r => r.label === s.redSocialSeleccionada)?.icon}
                </span>
                <span className="red-label">{s.redSocialSeleccionada}</span>
                <span className="red-user">@{s.NombreRedSocial}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// TIMELINE base compartida
// ════════════════════════════════════════════════════════════════════════════════
const TimelineRenderer = ({ title, items = [], isEditing, setItems }) => {
  const update = (i, field, val) => {
    const up = [...items];
    up[i] = { ...up[i], [field]: val };
    setItems(up);
  };
  const add    = () => setItems([...items, { year: new Date().getFullYear().toString(), title: "", description: "" }]);
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <div className="section-inner">
      <h3 className="section-title">{title}</h3>
      <div className="timeline">
        {items.length === 0 && !isEditing && <em className="field-empty">Sin registros.</em>}
        {items.map((item, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-body">
              {isEditing ? (
                <>
                  <input type="number" className="field-input field-input--year" value={item.year || ""} placeholder="Año" onChange={e => update(i, "year", e.target.value)} />
                  <input className="field-input" value={item.title || ""} placeholder="Título" onChange={e => update(i, "title", e.target.value)} />
                  <TextareaAutosize className="field-textarea" value={item.description || ""} placeholder="Descripción" onChange={e => update(i, "description", e.target.value)} />
                  <button className="btn-icon btn-icon--danger" onClick={() => remove(i)}>✕ Eliminar</button>
                </>
              ) : (
                <>
                  <span className="timeline-year">{item.year}</span>
                  <h4 className="timeline-title">{item.title}</h4>
                  <p className="timeline-desc">{item.description}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {isEditing && <button className="btn-ghost" onClick={add}>+ Agregar entrada</button>}
    </div>
  );
};

export const EducationSectionRenderer  = (props) => <TimelineRenderer title="Educación"           {...props} items={props.educationItems}  setItems={props.setEducationItems} />;
export const ExperienceSectionRenderer = (props) => <TimelineRenderer title="Experiencia Laboral" {...props} items={props.experienceItems} setItems={props.setExperienceItems} />;

// ════════════════════════════════════════════════════════════════════════════════
// HABILIDADES
// ════════════════════════════════════════════════════════════════════════════════
export const SkillSectionRenderer = ({ isEditing, habilidades = [], setHabilidades }) => {
  const update = (i, field, val) => { const up = [...habilidades]; up[i] = { ...up[i], [field]: val }; setHabilidades(up); };
  const add    = () => setHabilidades([...habilidades, { skillName: "", porcentaje: 50 }]);
  const remove = (i) => setHabilidades(habilidades.filter((_, idx) => idx !== i));

  return (
    <div className="section-inner">
      <h3 className="section-title">Habilidades</h3>
      <div className="skills-list">
        {habilidades.map((h, i) => (
          <div key={i} className="skill-item">
            {isEditing ? (
              <div className="skill-edit-row">
                <input className="field-input" placeholder="Habilidad" value={h.skillName} onChange={e => update(i, "skillName", e.target.value)} />
                <input type="range" min="0" max="100" value={h.porcentaje} onChange={e => update(i, "porcentaje", e.target.value)} className="skill-range" />
                <span className="skill-pct">{h.porcentaje}%</span>
                <button className="btn-icon btn-icon--danger" onClick={() => remove(i)}>✕</button>
              </div>
            ) : (
              <>
                <div className="skill-header">
                  <span className="skill-name">{h.skillName}</span>
                  <span className="skill-pct">{h.porcentaje}%</span>
                </div>
                <div className="skill-bar-track">
                  <div className="skill-bar-fill" style={{ width: `${h.porcentaje}%` }} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {isEditing && <button className="btn-ghost" onClick={add}>+ Agregar habilidad</button>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// RH — solo SUPER_ADMIN puede editar el jefe y puesto
// ════════════════════════════════════════════════════════════════════════════════
export const RHSectionRenderer = ({
  isEditing,
  RH,
  handleRHChange,
  listaEmpleados = [],
  openRHPicker,
  empleadoEncontrado,
}) => {
  const h            = RH?.HorarioLaboral ?? {};
  const isSuperAdmin = authService.isSuperAdmin();

  const jefeSeleccionado = listaEmpleados.find(e => e._id === RH?.JefeInmediato_id);
  const nombreJefe = jefeSeleccionado
    ? `${jefeSeleccionado.Nombre} ${jefeSeleccionado.ApelPaterno}`
    : RH?.JefeInmediato || "Sin asignar";

  return (
    <div className="section-inner">
      <h3 className="section-title">Recursos Humanos</h3>

      {/* Puesto */}
      <div className="field-row">
        <span className="field-label">Puesto</span>
        {isEditing && isSuperAdmin ? (
          <input
            className="field-input"
            value={RH?.Puesto || ""}
            placeholder="Ej: Desarrollador Frontend"
            onChange={e => handleRHChange("Puesto", e.target.value)}
          />
        ) : (
          <span className="field-value">{RH?.Puesto || <em className="field-empty">Sin asignar</em>}</span>
        )}
      </div>

      {/* Jefe inmediato */}
      <div className="field-row">
        <span className="field-label">
          Jefe inmediato
          {!isSuperAdmin && <span className="field-readonly-hint"> · solo RH puede modificar</span>}
        </span>
        {isEditing && isSuperAdmin ? (
          <select
            className="field-input"
            value={RH?.JefeInmediato_id || ""}
            onChange={e => {
              const emp = listaEmpleados.find(x => x._id === e.target.value);
              handleRHChange("JefeInmediato_id", e.target.value);
              handleRHChange("JefeInmediato", emp ? `${emp.Nombre} ${emp.ApelPaterno}` : "");
            }}
          >
            <option value="">— Sin jefe asignado —</option>
            {listaEmpleados
              .filter(e => e._id !== empleadoEncontrado?._id)
              .map(e => (
                <option key={e._id} value={e._id}>
                  {e.Nombre} {e.ApelPaterno}{e.Puesto ? ` · ${e.Puesto}` : ""}
                </option>
              ))
            }
          </select>
        ) : (
          <span className="field-value">{nombreJefe}</span>
        )}
      </div>

      {/* Horario */}
      <div className="rh-horario">
        <p className="field-label" style={{ marginBottom: 8 }}>Horario laboral</p>
        <div className="horario-grid">
          <Field label="Entrada"         value={h.HoraEntrada}    isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.HoraEntrada", v)}    type="time" />
          <Field label="Salida"          value={h.HoraSalida}     isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.HoraSalida", v)}     type="time" />
          <Field label="Tiempo comida"   value={h.TiempoComida}   isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.TiempoComida", v)} />
          <Field label="Días trabajados" value={h.DiasTrabajados} isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.DiasTrabajados", v)} />
        </div>
      </div>

      {/* Subir PDF — solo en edición */}
      {isEditing && isSuperAdmin && (
        <button className="btn-ghost" onClick={openRHPicker}>
          📎 Subir expediente digital (PDF)
        </button>
      )}

      {/* Vista previa del PDF — visible siempre que exista el archivo */}
      {RH?.ExpedienteDigitalPDF && (
        <PDFAttachment
          raw={RH.ExpedienteDigitalPDF}
          label="Expediente digital RH"
        />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// EXPEDIENTE CLÍNICO
// ════════════════════════════════════════════════════════════════════════════════
export const ExpedienteClinicoRenderer = ({ isEditing, expedienteclinico, setexpedienteclinico, openFilePicker }) => {
  const c   = expedienteclinico ?? {};
  const upd = (f, v) => setexpedienteclinico({ ...c, [f]: v });
  const tiposSangre = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  return (
    <div className="section-inner">
      <h3 className="section-title">Expediente Clínico</h3>

      <div className="field-row">
        <span className="field-label">Tipo de sangre</span>
        {isEditing ? (
          <select className="field-input" value={c.tipoSangre || ""} onChange={e => upd("tipoSangre", e.target.value)}>
            <option value="">Seleccionar</option>
            {tiposSangre.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <span className="field-value">{c.tipoSangre || <em className="field-empty">Sin registrar</em>}</span>
        )}
      </div>

      <Field label="NSS"              value={c.NumeroSeguroSocial}  isEditing={isEditing} onChange={v => upd("NumeroSeguroSocial", v)} />
      <Field label="Padecimientos"    value={c.Padecimientos}       isEditing={isEditing} onChange={v => upd("Padecimientos", v)} />
      <Field label="Seguro de gastos" value={c.Datossegurodegastos} isEditing={isEditing} onChange={v => upd("Datossegurodegastos", v)} />

      {/* Subir PDF — solo en edición */}
      {isEditing && (
        <button className="btn-ghost" onClick={openFilePicker}>
          📎 Adjuntar póliza de seguro (PDF)
        </button>
      )}

      {/* Vista previa del PDF — visible siempre que exista el archivo */}
      {c.PDFSegurodegastosmedicos && (
        <PDFAttachment
          raw={c.PDFSegurodegastosmedicos}
          label="Póliza de seguro de gastos médicos"
        />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// PROYECTOS
// ════════════════════════════════════════════════════════════════════════════════
const ESTADO_COLORS = {
  "Activo":  { bg: "#E6F1FB", color: "#185FA5" },
  "Pausado": { bg: "#FAEEDA", color: "#854F0B" },
  "Cerrado": { bg: "#EAF3DE", color: "#3B6D11" },
};

export const ProyectosRenderer = ({ proyectos = [] }) => (
  <div className="section-inner">
    <h3 className="section-title">Proyectos asignados</h3>
    {proyectos.length === 0
      ? <em className="field-empty">Sin proyectos asignados.</em>
      : (
        <div className="proyectos-list">
          {proyectos.map(p => {
            const est = ESTADO_COLORS[p.estado] || ESTADO_COLORS["Activo"];
            return (
              <div key={p.id} className="proyecto-item">
                <div className="proyecto-header">
                  <span className="proyecto-nombre">{p.nombre}</span>
                  <span className="proyecto-estado" style={{ background: est.bg, color: est.color }}>{p.estado}</span>
                </div>
                <div className="proyecto-avance-track">
                  <div className="proyecto-avance-fill" style={{ width: `${p.avance}%`, background: p.avance === 100 ? "#639922" : "#0071e3" }} />
                </div>
                <div className="proyecto-meta">
                  <span>{p.avance}% completado</span>
                  <span>Entrega: {p.entrega}</span>
                </div>
              </div>
            );
          })}
        </div>
      )
    }
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
// CV EXPORTABLE
// ════════════════════════════════════════════════════════════════════════════════
export const CVExportRenderer = ({ empleado, rh, descripcion, educationItems = [], experienciaItems = [], habilidades = [] }) => {
  const handlePrint = () => {
    const cvWindow = window.open("", "_blank");
    const nombre = `${empleado?.Nombre || ""} ${empleado?.ApelPaterno || ""}`.trim();
    cvWindow.document.write(`<!DOCTYPE html><html><head><title>CV — ${nombre}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:800px;margin:0 auto}
        h1{font-size:28px;margin-bottom:4px} .puesto{color:#0071e3;font-size:16px;margin-bottom:20px}
        .desc{color:#555;margin-bottom:24px} h2{font-size:16px;border-bottom:2px solid #0071e3;padding-bottom:4px;margin-top:28px;color:#0071e3}
        .item{margin:12px 0} .item-year{font-size:12px;color:#888} .item-title{font-weight:bold} .item-desc{font-size:13px;color:#444}
        .skill-row{display:flex;align-items:center;gap:12px;margin:6px 0} .skill-name{width:160px;font-size:13px}
        .skill-bar{flex:1;height:8px;background:#eee;border-radius:4px} .skill-fill{height:100%;background:#0071e3;border-radius:4px}
        @media print{body{padding:20px}}
      </style></head><body>
      <h1>${nombre}</h1>
      <div class="puesto">${rh?.Puesto || "Sin puesto"}</div>
      <div class="desc">${descripcion || ""}</div>
      ${educationItems.length ? `<h2>Educación</h2>${educationItems.map(i => `<div class="item"><div class="item-year">${i.year}</div><div class="item-title">${i.title}</div><div class="item-desc">${i.description}</div></div>`).join("")}` : ""}
      ${experienciaItems.length ? `<h2>Experiencia</h2>${experienciaItems.map(i => `<div class="item"><div class="item-year">${i.year}</div><div class="item-title">${i.title}</div><div class="item-desc">${i.description}</div></div>`).join("")}` : ""}
      ${habilidades.length ? `<h2>Habilidades</h2>${habilidades.map(h => `<div class="skill-row"><span class="skill-name">${h.skillName}</span><div class="skill-bar"><div class="skill-fill" style="width:${h.porcentaje}%"></div></div><span>${h.porcentaje}%</span></div>`).join("")}` : ""}
      </body></html>`);
    cvWindow.document.close();
    cvWindow.print();
  };

  return (
    <div className="section-inner">
      <h3 className="section-title">CV / Portafolio</h3>
      <p className="description-text">Genera un CV con tu información actual — educación, experiencia y habilidades.</p>
      <button className="btn-ghost btn-ghost--accent" onClick={handlePrint}>📄 Exportar CV como PDF</button>
    </div>
  );
};