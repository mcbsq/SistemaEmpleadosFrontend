import React, { useState, useEffect, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator, FileSizeValidator } from "use-file-picker/validators";
import { CiFacebook, CiLinkedin, CiYoutube } from "react-icons/ci";
import { FaInstagram, FaTiktok, FaGithub } from "react-icons/fa";
import { FiX, FiPaperclip, FiFileText, FiCalendar, FiGift } from "react-icons/fi";
import { authService } from "../../services/authService";
import { documentosFinancierosService } from "../../services/documentosFinancierosService";
import { vacacionesService } from "../../services/vacacionesService";
import { prestamoService } from "../../services/prestamoService";
import { conexionesExternasService } from "../../services/conexionesExternasService";
import { PDFAttachment } from "./PDFAttachment";
import MapaDomicilio from "./MapaDomicilio";
import { API_URL } from "../../services/apiConfig";

// Descarga un .ics autenticado (fetch + blob, ya que un <a href> normal no
// puede llevar el header Authorization).
async function descargarIcs(path, filename) {
  try {
    const token = sessionStorage.getItem("access_token");
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch { /* silencioso — botón secundario, no crítico */ }
}

const REDES_CONFIG = [
  { label: "Facebook",  icon: <CiFacebook /> },
  { label: "Instagram", icon: <FaInstagram /> },
  { label: "LinkedIn",  icon: <CiLinkedin /> },
  { label: "YouTube",   icon: <CiYoutube /> },
  { label: "TikTok",    icon: <FaTiktok /> },
  { label: "GitHub",    icon: <FaGithub /> },
];

const Field = ({ label, value, isEditing, onChange, type = "text", placeholder = "" }) => (
  <div className="field-row">
    <span className="field-label">{label}</span>
    {isEditing ? (
      <input type={type} className="field-input" value={value || ""} placeholder={placeholder || label}
        onChange={e => onChange(e.target.value)} />
    ) : (
      <span className="field-value">{value || <em className="field-empty">Sin datos</em>}</span>
    )}
  </div>
);

const SelectField = ({ label, value, isEditing, onChange, options = [] }) => (
  <div className="field-row">
    <span className="field-label">{label}</span>
    {isEditing ? (
      <select className="field-input" value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ appearance: "none", cursor: "pointer" }}>
        <option value="">Seleccionar…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <span className="field-value">{value || <em className="field-empty">Sin datos</em>}</span>
    )}
  </div>
);

// ─── Helper: normaliza el PDF a string data URL para mostrarlo ────────────────
// Acepta: string base64, data URL, array use-file-picker, objeto {content}
function resolveRawPDF(raw) {
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return first?.content || (typeof first === "string" ? first : null);
  }
  if (typeof raw === "string" && raw.length > 0) {
    if (raw.startsWith("data:")) return raw;
    return `data:application/pdf;base64,${raw}`;
  }
  if (raw?.content) return raw.content;
  return null;
}

export const DescriptionRenderer = ({ isEditing, descripcion, setDescripcion }) => (
  <div className="section-inner">
    <h3 className="section-title">Descripción</h3>
    {isEditing ? (
      <TextareaAutosize className="field-textarea" value={descripcion ?? ""} placeholder="Cuéntanos sobre ti…"
        onChange={e => setDescripcion(e.target.value)} />
    ) : (
      <p className="description-text">{descripcion || "Sin descripción disponible."}</p>
    )}
  </div>
);

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

export const PersonasContactoRenderer = ({ isEditing, personalcontacto, handlePersonalContactoChange, opcionesParentesco = [] }) => {
  const p = personalcontacto ?? {};
  return (
    <div className="section-inner">
      <h3 className="section-title">Contacto de Emergencia</h3>
      <Field label="Nombre"    value={p.nombreContacto}    isEditing={isEditing} onChange={v => handlePersonalContactoChange("nombreContacto", v)} />
      <SelectField label="Parentesco" value={p.parenstesco} isEditing={isEditing} options={opcionesParentesco} onChange={v => handlePersonalContactoChange("parenstesco", v)} />
      <Field label="Teléfono"  value={p.telefonoContacto}  isEditing={isEditing} onChange={v => handlePersonalContactoChange("telefonoContacto", v)} type="tel" />
      <Field label="Correo"    value={p.correoContacto}    isEditing={isEditing} onChange={v => handlePersonalContactoChange("correoContacto", v)}   type="email" />
      <Field label="Dirección" value={p.direccionContacto} isEditing={isEditing} onChange={v => handlePersonalContactoChange("direccionContacto", v)} />
    </div>
  );
};

export const DireccionRenderer = ({ isEditing, direccion = {}, onDireccionChange, lat, lng, onCoordsChange }) => {
  const upd = (f, v) => onDireccionChange?.(f, v);
  return (
    <div className="section-inner">
      <h3 className="section-title">Domicilio</h3>
      <Field label="Calle"           value={direccion.Calle}       isEditing={isEditing} onChange={v => upd("Calle", v)} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <Field label="Núm. Ext." value={direccion.NumExterior} isEditing={isEditing} onChange={v => upd("NumExterior", v)} />
        <Field label="Núm. Int." value={direccion.NumInterior} isEditing={isEditing} onChange={v => upd("NumInterior", v)} />
      </div>
      <Field label="Municipio"       value={direccion.Municipio}   isEditing={isEditing} onChange={v => upd("Municipio", v)} />
      <Field label="Ciudad / Estado" value={direccion.Ciudad}      isEditing={isEditing} onChange={v => upd("Ciudad", v)} />
      <Field label="Código Postal"   value={direccion.CodigoP}     isEditing={isEditing} onChange={v => upd("CodigoP", v)} />
      <div style={{ height:1, background:"var(--hr-border)", margin:"16px 0" }} />
      <MapaDomicilio direccion={direccion} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} mode="popup" />
    </div>
  );
};

export const RedesSocialesRenderer = ({ isEditing, redesSociales = [], setRedesSociales }) => {
  const add    = () => setRedesSociales([...redesSociales, { redSocialSeleccionada:"", NombreRedSocial:"", URLRedSocial:"" }]);
  const remove = (i) => setRedesSociales(redesSociales.filter((_,idx) => idx!==i));
  const update = (i, field, val) => { const up=[...redesSociales]; up[i]={...up[i],[field]:val}; setRedesSociales(up); };
  return (
    <div className="section-inner">
      <h3 className="section-title">Redes Sociales</h3>
      {isEditing ? (
        <div className="redes-edit-list">
          {redesSociales.map((s,i) => (
            <div key={i} className="redes-edit-row">
              <select className="field-input field-input--sm" value={s.redSocialSeleccionada} onChange={e=>update(i,"redSocialSeleccionada",e.target.value)}>
                <option value="">Red social</option>
                {REDES_CONFIG.map(r=><option key={r.label} value={r.label}>{r.label}</option>)}
              </select>
              <input className="field-input" placeholder="Usuario o URL" value={s.NombreRedSocial} onChange={e=>update(i,"NombreRedSocial",e.target.value)} />
              <button className="btn-icon btn-icon--danger" onClick={()=>remove(i)}><FiX /></button>
            </div>
          ))}
          <button className="btn-ghost" onClick={add}>+ Agregar red</button>
        </div>
      ) : (
        <div className="redes-view-list">
          {redesSociales.length===0
            ? <em className="field-empty">Sin redes registradas</em>
            : redesSociales.map((s,i)=>(
              <div key={i} className="red-item">
                <span className="red-icon">{REDES_CONFIG.find(r=>r.label===s.redSocialSeleccionada)?.icon}</span>
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

const TimelineRenderer = ({ title, items=[], isEditing, setItems }) => {
  const update = (i,field,val)=>{ const up=[...items]; up[i]={...up[i],[field]:val}; setItems(up); };
  const add    = ()=>setItems([...items,{year:new Date().getFullYear().toString(),title:"",description:""}]);
  const remove = (i)=>setItems(items.filter((_,idx)=>idx!==i));
  return (
    <div className="section-inner">
      <h3 className="section-title">{title}</h3>
      <div className="timeline">
        {items.length===0 && !isEditing && <em className="field-empty">Sin registros.</em>}
        {items.map((item,i)=>(
          <div key={i} className="timeline-item">
            <div className="timeline-dot"/>
            <div className="timeline-body">
              {isEditing ? (
                <>
                  <input type="number" className="field-input field-input--year" value={item.year||""} placeholder="Año" onChange={e=>update(i,"year",e.target.value)} />
                  <input className="field-input" value={item.title||""} placeholder="Título" onChange={e=>update(i,"title",e.target.value)} />
                  <TextareaAutosize className="field-textarea" value={item.description||""} placeholder="Descripción" onChange={e=>update(i,"description",e.target.value)} />
                  <button className="btn-icon btn-icon--danger" onClick={()=>remove(i)}><FiX style={{verticalAlign:"-2px",marginRight:4}}/>Eliminar</button>
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

// ── Catálogo de habilidades — tomado del documento de RH (Protal360, ago
// 2026): 6 categorías, cada una con su definición para el tooltip de ayuda
// ("?" junto a cada habilidad, pedido explícito del cliente). Cada habilidad
// se califica 0-100 de forma independiente — no es un reparto que sume 100.
export const HABILIDADES_CATALOGO = {
  "Habilidades Blandas (Soft Skills)": [
    { nombre: "Comunicación", definicion: "Saber expresar ideas claramente (oral y escrita), escuchar activamente y negociar." },
    { nombre: "Inteligencia emocional", definicion: "Reconocer, entender y gestionar las propias emociones y las de los demás." },
    { nombre: "Empatía", definicion: "Ponerse en el lugar del otro y comprender sus sentimientos." },
    { nombre: "Trabajo en equipo", definicion: "Colaborar, cooperar y contribuir a un objetivo común." },
    { nombre: "Liderazgo", definicion: "Inspirar, guiar y motivar a otras personas hacia una meta." },
    { nombre: "Resolución de conflictos", definicion: "Mediar y encontrar soluciones en situaciones de desacuerdo." },
    { nombre: "Adaptabilidad / Flexibilidad", definicion: "Ajustarse fácilmente a cambios, nuevas condiciones o imprevistos." },
    { nombre: "Resiliencia", definicion: "Capacidad para superar adversidades, fracasos o situaciones de estrés." },
    { nombre: "Pensamiento crítico", definicion: "Analizar información objetivamente para formar un juicio razonado." },
    { nombre: "Creatividad", definicion: "Generar ideas originales y encontrar soluciones innovadoras." },
    { nombre: "Toma de decisiones", definicion: "Elegir la mejor opción entre varias alternativas evaluando riesgos." },
    { nombre: "Sentido del humor", definicion: "Usar el humor de manera constructiva para aliviar tensiones y conectar con otros." },
  ],
  "Habilidades Duras (Hard Skills)": [
    { nombre: "Idiomas", definicion: "Hablar, leer y escribir en otros idiomas (inglés, francés, mandarín, etc.)." },
    { nombre: "Programación y desarrollo", definicion: "Lenguajes como Python, Java, C++, HTML/CSS, o manejo de bases de datos (SQL)." },
    { nombre: "Manejo de software", definicion: "Office (Excel, Word, PowerPoint), herramientas de diseño (Photoshop, Illustrator), edición de video o CAD." },
    { nombre: "Análisis de datos", definicion: "Estadística, manejo de hojas de cálculo avanzadas, Power BI, Tableau o R." },
    { nombre: "Marketing digital", definicion: "SEO/SEM, gestión de redes sociales, email marketing y analítica web." },
    { nombre: "Finanzas y contabilidad", definicion: "Gestión presupuestaria, análisis de balances, cálculo de impuestos o inversiones." },
    { nombre: "Conocimientos jurídicos", definicion: "Manejo de leyes, contratos y normativas específicas." },
    { nombre: "Habilidades médicas o de salud", definicion: "Primeros auxilios, enfermería, diagnóstico, cirugía." },
    { nombre: "Logística", definicion: "Encontrar la mejor eficacia para la entrega de mercancías y abastecimientos para producción." },
  ],
  "Habilidades Cognitivas (De pensamiento)": [
    { nombre: "Memoria", definicion: "Capacidad para retener y recordar información (a corto, medio y largo plazo)." },
    { nombre: "Atención y concentración", definicion: "Mantener el foco en una tarea ignorando distracciones." },
    { nombre: "Razonamiento lógico", definicion: "Establecer relaciones causa-efecto y resolver problemas paso a paso." },
    { nombre: "Velocidad de procesamiento", definicion: "Captar y reaccionar rápidamente ante estímulos." },
    { nombre: "Percepción espacial", definicion: "Visualizar y manipular objetos en la mente (útil para arquitectura o cirugía)." },
    { nombre: "Flexibilidad cognitiva", definicion: "Cambiar de un pensamiento a otro y adaptar la estrategia mental según el contexto." },
  ],
  "Habilidades Físicas o Motoras": [
    { nombre: "Coordinación óculo-manual", definicion: "Sincronizar la vista con las manos (escribir, coser, manejar herramientas)." },
    { nombre: "Destreza manual / Motricidad fina", definicion: "Realizar movimientos precisos con los dedos (joyería, relojería, cirugía)." },
    { nombre: "Resistencia física", definicion: "Capacidad para mantener un esfuerzo prolongado (caminar largas distancias, cargar peso)." },
  ],
  "Habilidades para la Vida Diaria": [
    { nombre: "Gestión del tiempo", definicion: "Planificar y priorizar tareas para ser eficiente." },
    { nombre: "Organización y planificación", definicion: "Mantener el orden en espacios físicos y en agendas." },
    { nombre: "Manejo del dinero", definicion: "Hacer presupuestos, ahorrar y evitar deudas." },
    { nombre: "Capacidad de aprender por uno mismo", definicion: "Buscar información y adquirir conocimientos sin un profesor (autoaprendizaje)." },
  ],
  "Habilidades Interpersonales Avanzadas": [
    { nombre: "Asertividad", definicion: "Decir lo que piensas y sientes sin agredir ni someterse." },
    { nombre: "Persuasión", definicion: "Capacidad para convencer a otros de tu punto de vista." },
    { nombre: "Mentoría / Coaching", definicion: "Enseñar y guiar a otros para que desarrollen su potencial." },
    { nombre: "Networking", definicion: "Construir y mantener relaciones profesionales y sociales." },
    { nombre: "Servicio al cliente", definicion: "Atender, asesorar y resolver dudas de otras personas con paciencia y eficacia." },
  ],
};
const DEFINICIONES_POR_NOMBRE = Object.values(HABILIDADES_CATALOGO).flat()
  .reduce((acc, h) => { acc[h.nombre] = h.definicion; return acc; }, {});

function AyudaHabilidad({ nombre }) {
  const [abierto, setAbierto] = React.useState(false);
  const definicion = DEFINICIONES_POR_NOMBRE[nombre];
  if (!definicion) return null;
  return (
    <span className="skill-help-wrap">
      <button type="button" className="skill-help-btn" aria-label={`Qué significa ${nombre}`}
        onClick={() => setAbierto(o => !o)} onBlur={() => setTimeout(() => setAbierto(false), 150)}>?</button>
      {abierto && (
        <span className="skill-help-bubble" role="tooltip">
          <strong>{nombre}</strong> — {definicion}
        </span>
      )}
    </span>
  );
}

// ── Catálogo completo con definiciones — para consultar ANTES de elegir, no
// solo después de haberla seteado. Pedido explícito: alguien que no sabe a
// qué se refiere una habilidad necesita esa info mientras todavía está
// decidiendo cuál escoger, no solo una vez que ya quedó guardada.
function CatalogoHabilidadesModal({ onClose, onElegir }) {
  return (
    <div className="nb-overlay" onClick={onClose}>
      <div className="nb-panel skill-catalogo-panel" onClick={e => e.stopPropagation()}>
        <div className="nb-panel-header">
          <span>Catálogo de habilidades</span>
          <button className="nb-close-btn" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </div>
        <div className="skill-catalogo-body">
          <p className="description-text" style={{ marginBottom: 12 }}>
            Qué significa cada habilidad, antes de elegirla.
          </p>
          {Object.entries(HABILIDADES_CATALOGO).map(([cat, items]) => (
            <div key={cat} className="skill-catalogo-cat">
              <p className="skill-catalogo-cat-titulo">{cat}</p>
              {items.map(it => (
                <button type="button" key={it.nombre} className="skill-catalogo-item"
                  onClick={() => { if (onElegir) onElegir(it.nombre); onClose(); }}>
                  <span className="skill-catalogo-item-nombre">{it.nombre}</span>
                  <span className="skill-catalogo-item-def">{it.definicion}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const SkillSectionRenderer = ({ isEditing, habilidades=[], setHabilidades }) => {
  const update = (i,f,v)=>{ const up=[...habilidades]; up[i]={...up[i],[f]:v}; setHabilidades(up); };
  const add    = ()=>setHabilidades([...habilidades,{skillName:"",porcentaje:50}]);
  const remove = (i)=>setHabilidades(habilidades.filter((_,idx)=>idx!==i));
  const [catalogoParaFila, setCatalogoParaFila] = useState(null);
  return (
    <div className="section-inner">
      <h3 className="section-title">Habilidades</h3>
      <p className="description-text">Cada habilidad se califica de 0 a 100 de forma independiente — no es necesario que sumen 100%.</p>
      {catalogoParaFila !== null && (
        <CatalogoHabilidadesModal
          onClose={() => setCatalogoParaFila(null)}
          onElegir={(nombre) => update(catalogoParaFila, "skillName", nombre)}
        />
      )}
      <div className="skills-list">
        {habilidades.map((h,i)=>(
          <div key={i} className="skill-item">
            {isEditing ? (
              <div className="skill-edit-row">
                {/* "?" ANTES de elegir — para quien no sabe a qué se refiere
                    una habilidad mientras todavía está decidiendo cuál
                    escoger, no solo después de haberla guardado. */}
                <button type="button" className="skill-help-btn" title="Ver qué significa cada habilidad antes de elegir"
                  aria-label="Ver catálogo de habilidades con definiciones"
                  onClick={() => setCatalogoParaFila(i)}>?</button>
                <select className="field-input" value={h.skillName}
                  onChange={e=>update(i,"skillName",e.target.value)} style={{flex:1}}>
                  <option value="">Selecciona una habilidad…</option>
                  {Object.entries(HABILIDADES_CATALOGO).map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                      {items.map(it => <option key={it.nombre} value={it.nombre} title={it.definicion}>{it.nombre}</option>)}
                    </optgroup>
                  ))}
                  <optgroup label="Otra">
                    <option value={h.skillName && !DEFINICIONES_POR_NOMBRE[h.skillName] ? h.skillName : "__otra__"}>
                      {h.skillName && !DEFINICIONES_POR_NOMBRE[h.skillName] ? h.skillName : "Escribir otra habilidad…"}
                    </option>
                  </optgroup>
                </select>
                {h.skillName === "__otra__" || (h.skillName && !DEFINICIONES_POR_NOMBRE[h.skillName]) ? (
                  <input className="field-input" placeholder="Nombre de la habilidad" style={{flex:1}}
                    value={h.skillName === "__otra__" ? "" : h.skillName}
                    onChange={e=>update(i,"skillName",e.target.value)} />
                ) : null}
                <input type="range" min="0" max="100" value={h.porcentaje} onChange={e=>update(i,"porcentaje",e.target.value)} className="skill-range" />
                <span className="skill-pct">{h.porcentaje}%</span>
                <AyudaHabilidad nombre={h.skillName} />
                <button className="btn-icon btn-icon--danger" onClick={()=>remove(i)}><FiX /></button>
              </div>
            ) : (
              <>
                <div className="skill-header">
                  <span className="skill-name">{h.skillName}<AyudaHabilidad nombre={h.skillName} /></span>
                  <span className="skill-pct">{h.porcentaje}%</span>
                </div>
                <div className="skill-bar-track"><div className="skill-bar-fill" style={{width:`${h.porcentaje}%`}}/></div>
              </>
            )}
          </div>
        ))}
      </div>
      {isEditing && <button className="btn-ghost" onClick={add}>+ Agregar habilidad</button>}
    </div>
  );
};

// ── Campos personalizados del expediente RH ─────────────────────────────────
// Pares nombre→valor libres: el admin documenta cualquier dato del empleado
// (talla de uniforme, número de gafete, licencias, lo que necesite) sin pedir
// cambios de código. Se guardan en rh.CamposPersonalizados.
const CustomFieldsBlock = ({ campos, isEditing, onChange }) => {
  const [nuevoNombre, setNuevoNombre] = React.useState("");
  const entradas = Object.entries(campos || {});

  const setValor = (k, v) => onChange({ ...campos, [k]: v });
  const eliminar = (k) => {
    const c = { ...campos };
    delete c[k];
    onChange(c);
  };
  const agregar = () => {
    const k = nuevoNombre.trim();
    if (!k || campos[k] !== undefined) return;
    onChange({ ...campos, [k]: "" });
    setNuevoNombre("");
  };

  if (!isEditing && entradas.length === 0) return null;

  return (
    <div className="rh-horario">
      <p className="field-label" style={{marginBottom:8}}>Información adicional</p>

      {entradas.length === 0 && !isEditing ? null : entradas.map(([k, v]) => (
        <div className="field-row" key={k}>
          <span className="field-label">{k}</span>
          {isEditing ? (
            <span style={{display:"flex", gap:8, alignItems:"center", flex:1}}>
              <input className="field-input" value={v}
                onChange={e => setValor(k, e.target.value)}
                aria-label={`Valor de ${k}`} />
              <button type="button" className="btn-ghost" style={{padding:"4px 10px"}}
                onClick={() => eliminar(k)} aria-label={`Eliminar campo ${k}`}><FiX /></button>
            </span>
          ) : (
            <span className="field-value">{v || <em className="field-empty">Sin valor</em>}</span>
          )}
        </div>
      ))}

      {isEditing && (
        <div className="field-row" style={{alignItems:"center", gap:8}}>
          <input className="field-input" value={nuevoNombre}
            placeholder="Nombre del nuevo campo (ej. Núm. de gafete)"
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregar()}
            aria-label="Nombre del nuevo campo personalizado" />
          <button type="button" className="btn-ghost" onClick={agregar}
            disabled={!nuevoNombre.trim()}>+ Agregar campo</button>
        </div>
      )}
    </div>
  );
};

export const RHSectionRenderer = ({ isEditing, RH, handleRHChange, listaEmpleados=[], openRHPicker, empleadoEncontrado }) => {
  const h            = RH?.HorarioLaboral ?? {};
  const isSuperAdmin = authService.isSuperAdmin();
  const jefeSeleccionado = listaEmpleados.find(e => e._id === RH?.JefeInmediato_id);
  const nombreJefe = jefeSeleccionado
    ? `${jefeSeleccionado.Nombre} ${jefeSeleccionado.ApelPaterno}`
    : RH?.JefeInmediato || "Sin asignar";

  // ── FIX: resolver el PDF independientemente del formato en que llegue ──────
  // Puede ser: string base64, data URL, array use-file-picker, objeto {content}
  // resolveRawPDF lo normaliza a un string usable por PDFAttachment
  const pdfResuelto = resolveRawPDF(RH?.ExpedienteDigitalPDF);

  return (
    <div className="section-inner">
      <h3 className="section-title">Recursos Humanos</h3>

      <div className="field-row">
        <span className="field-label">Puesto</span>
        {isEditing && isSuperAdmin
          ? <input className="field-input" value={RH?.Puesto||""} placeholder="Ej: Desarrollador Frontend" onChange={e=>handleRHChange("Puesto",e.target.value)} />
          : <span className="field-value">{RH?.Puesto||<em className="field-empty">Sin asignar</em>}</span>
        }
      </div>

      <div className="field-row">
        <span className="field-label">
          Jefe inmediato
          {!isSuperAdmin && <span className="field-readonly-hint"> · solo RH puede modificar</span>}
        </span>
        {isEditing && isSuperAdmin ? (
          <select className="field-input" value={RH?.JefeInmediato_id||""} onChange={e=>{
            const emp = listaEmpleados.find(x=>x._id===e.target.value);
            handleRHChange("JefeInmediato_id", e.target.value);
            handleRHChange("JefeInmediato", emp ? `${emp.Nombre} ${emp.ApelPaterno}` : "");
          }}>
            <option value="">— Sin jefe asignado —</option>
            {listaEmpleados.filter(e=>e._id!==empleadoEncontrado?._id).map(e=>(
              <option key={e._id} value={e._id}>{e.Nombre} {e.ApelPaterno}{e.Puesto?` · ${e.Puesto}`:""}</option>
            ))}
          </select>
        ) : <span className="field-value">{nombreJefe}</span>}
      </div>

      <div className="rh-horario">
        <p className="field-label" style={{marginBottom:8}}>Horario laboral</p>
        <div className="horario-grid">
          <Field label="Entrada"         value={h.HoraEntrada}    isEditing={isEditing} onChange={v=>handleRHChange("HorarioLaboral.HoraEntrada",v)}    type="time" />
          <Field label="Salida"          value={h.HoraSalida}     isEditing={isEditing} onChange={v=>handleRHChange("HorarioLaboral.HoraSalida",v)}     type="time" />
          <Field label="Tiempo comida"   value={h.TiempoComida}   isEditing={isEditing} onChange={v=>handleRHChange("HorarioLaboral.TiempoComida",v)} />
          <Field label="Días trabajados" value={h.DiasTrabajados} isEditing={isEditing} onChange={v=>handleRHChange("HorarioLaboral.DiasTrabajados",v)} />
        </div>
      </div>

      {/* ── Información laboral estándar (paridad con HRIS del mercado) ── */}
      <div className="rh-horario">
        <p className="field-label" style={{marginBottom:8}}>Información laboral</p>
        <div className="horario-grid">
          <Field label="Fecha de ingreso"  value={RH?.FechaIngreso}   isEditing={isEditing && isSuperAdmin} onChange={v=>handleRHChange("FechaIngreso",v)}   type="date" />
          <Field label="Núm. de empleado"  value={RH?.NumeroEmpleado} isEditing={isEditing && isSuperAdmin} onChange={v=>handleRHChange("NumeroEmpleado",v)} />
          <Field label="CURP"              value={RH?.CURP}           isEditing={isEditing && isSuperAdmin} onChange={v=>handleRHChange("CURP",v)} placeholder="18 caracteres" />
          <Field label="RFC"               value={RH?.RFC}            isEditing={isEditing && isSuperAdmin} onChange={v=>handleRHChange("RFC",v)} placeholder="Con homoclave" />
          <Field label="Estado civil"      value={RH?.EstadoCivil}    isEditing={isEditing && isSuperAdmin} onChange={v=>handleRHChange("EstadoCivil",v)} />
          <Field label="Nacionalidad"      value={RH?.Nacionalidad}   isEditing={isEditing && isSuperAdmin} onChange={v=>handleRHChange("Nacionalidad",v)} />
          {isSuperAdmin && (
            <Field label="Salario" value={RH?.Salario} isEditing={isEditing && isSuperAdmin} onChange={v=>handleRHChange("Salario",v)} placeholder="Mensual bruto" />
          )}
          {isSuperAdmin && (
            <div className="field-row">
              <span className="field-label">
                Relación laboral
                <span className="field-readonly-hint"> · define su sección financiera</span>
              </span>
              {isEditing ? (
                <select className="field-input" style={{ appearance: "none", cursor: "pointer" }}
                  value={RH?.TipoRelacionLaboral || "nomina"}
                  onChange={e => handleRHChange("TipoRelacionLaboral", e.target.value)}>
                  <option value="nomina">Nómina</option>
                  <option value="prestador_servicios">Prestador de servicios (CFDI)</option>
                </select>
              ) : (
                <span className="field-value">
                  {RH?.TipoRelacionLaboral === "prestador_servicios" ? "Prestador de servicios (CFDI)" : "Nómina"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Campos personalizados: el admin agrega la información que guste ── */}
      <CustomFieldsBlock
        campos={RH?.CamposPersonalizados || {}}
        isEditing={isEditing && isSuperAdmin}
        onChange={campos => handleRHChange("CamposPersonalizados", campos)}
      />

      {/* Botón subir PDF — solo en modo edición y superadmin */}
      {isEditing && isSuperAdmin && (
        <button className="btn-ghost" onClick={openRHPicker}>
          <FiPaperclip style={{verticalAlign:"-2px",marginRight:4}}/>{pdfResuelto ? "Reemplazar expediente digital" : "Subir expediente digital (PDF)"}
        </button>
      )}

      {/* ── FIX: pasar el PDF ya resuelto como string, no el raw ── */}
      {pdfResuelto && (
        <PDFAttachment raw={pdfResuelto} label="Expediente digital RH" />
      )}
    </div>
  );
};

export const ExpedienteClinicoRenderer = ({ isEditing, expedienteclinico, setexpedienteclinico, openFilePicker }) => {
  const c   = expedienteclinico ?? {};
  const upd = (f,v) => setexpedienteclinico({...c,[f]:v});
  const tiposSangre = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

  const pdfResuelto = resolveRawPDF(c.PDFSegurodegastosmedicos);

  return (
    <div className="section-inner">
      <h3 className="section-title">Expediente Clínico</h3>
      <div className="field-row">
        <span className="field-label">Tipo de sangre</span>
        {isEditing
          ? <select className="field-input" value={c.tipoSangre||""} onChange={e=>upd("tipoSangre",e.target.value)} style={{appearance:"none"}}>
              <option value="">Seleccionar</option>
              {tiposSangre.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          : <span className="field-value">{c.tipoSangre||<em className="field-empty">Sin registrar</em>}</span>
        }
      </div>
      <Field label="NSS"              value={c.NumeroSeguroSocial}  isEditing={isEditing} onChange={v=>upd("NumeroSeguroSocial",v)} />
      <Field label="Padecimientos"    value={c.Padecimientos}       isEditing={isEditing} onChange={v=>upd("Padecimientos",v)} />
      <Field label="Seguro de gastos" value={c.Datossegurodegastos} isEditing={isEditing} onChange={v=>upd("Datossegurodegastos",v)} />

      {isEditing && (
        <button className="btn-ghost" onClick={openFilePicker}>
          <FiPaperclip style={{verticalAlign:"-2px",marginRight:4}}/>{pdfResuelto ? "Reemplazar póliza de seguro" : "Adjuntar póliza de seguro (PDF)"}
        </button>
      )}

      {/* ── FIX: mismo patrón que RH ── */}
      {pdfResuelto && (
        <PDFAttachment raw={pdfResuelto} label="Póliza de seguro de gastos médicos" />
      )}
    </div>
  );
};

// Formato institucional Cibercom — dos columnas separadas por una línea
// vertical: izquierda = Perfil/Especialidades/Know How/Inglés/Contacto,
// derecha = nombre, resumen, habilidades como bullets y experiencia como
// "Logros". Replica la plantilla que RH ya usa en documentos reales (ver
// referencia compartida), solo que aquí se llena con los datos del empleado.
const esc = (s = "") => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

export const CVExportRenderer = ({ empleado, rh, descripcion, educationItems=[], experienciaItems=[], habilidades=[] }) => {
  const handlePrint = () => {
    const cvWindow = window.open("","_blank");
    const nombre = `${empleado?.Nombre||""} ${empleado?.ApelPaterno||""} ${empleado?.ApelMaterno||""}`.trim();
    const puesto = rh?.Puesto || "Sin puesto asignado";

    // Especialidades = las mejor calificadas (≥70%); Know How = el resto —
    // mismo criterio visual que la plantilla institucional (dos listas cortas).
    const ordenadas   = [...habilidades].sort((a,b) => (b.porcentaje||0) - (a.porcentaje||0));
    const especialidades = ordenadas.filter(h => (h.porcentaje||0) >= 70).slice(0, 8);
    const knowHow         = ordenadas.filter(h => !especialidades.includes(h)).slice(0, 10);
    const ingles = habilidades.find(h => /ingl[eé]s/i.test(h.skillName || ""));

    const bullet = (arr) => arr.map(h => `<li>${esc(h.skillName)}</li>`).join("");

    cvWindow.document.write(`<!DOCTYPE html><html><head><title>CV — ${esc(nombre)}</title>
      <style>
        @page { margin: 30px; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #222; margin: 0; }
        .cv-wrap { display: flex; min-height: 100vh; }
        .cv-side {
          width: 30%; padding: 32px 22px; border-right: 1.5px solid #7a1f3d;
          display: flex; flex-direction: column; gap: 22px;
        }
        .cv-brand { font-weight: 800; font-size: 15px; color: #444; line-height: 1.1; margin-bottom: 4px; }
        .cv-side h4 {
          font-size: 12px; letter-spacing: 1px; text-transform: uppercase;
          color: #7a1f3d; margin: 0 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;
        }
        .cv-side p, .cv-side li { font-size: 12.5px; color: #333; margin: 0 0 4px; }
        .cv-side ul { list-style: none; padding: 0; margin: 0; }
        .cv-side ul li { font-weight: 600; margin-bottom: 6px; }
        .cv-main { width: 70%; padding: 32px 36px; }
        .cv-main-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
        .cv-main-header img { height: 42px; }
        .cv-name { font-size: 24px; font-weight: 800; color: #222; letter-spacing: 0.5px; margin: 0; }
        .cv-resumen { font-size: 13px; color: #444; margin: 14px 0 22px; line-height: 1.5; }
        .cv-main h3 {
          font-size: 15px; color: #7a1f3d; margin: 24px 0 10px;
          border-bottom: 2px solid #7a1f3d; padding-bottom: 4px;
        }
        .cv-main ul.bullets { margin: 0; padding-left: 18px; }
        .cv-main ul.bullets li { font-size: 13px; color: #333; margin-bottom: 6px; }
        .cv-item { margin-bottom: 12px; }
        .cv-item-title { font-weight: 700; font-size: 13px; color: #222; }
        .cv-item-meta  { font-size: 11px; color: #888; margin-bottom: 3px; }
        .cv-item-desc  { font-size: 12.5px; color: #444; }
        .cv-empty { font-size: 12px; color: #999; font-style: italic; }
        @media print { .cv-side { border-right: 1.5px solid #7a1f3d; } }
      </style></head><body>
      <div class="cv-wrap">
        <div class="cv-side">
          <div class="cv-brand">Capital<br/>Humano</div>
          <div>
            <h4>Perfil</h4>
            <p style="font-weight:700">${esc(puesto)}</p>
          </div>
          ${especialidades.length ? `<div><h4>Especialidades</h4><ul>${bullet(especialidades)}</ul></div>` : ""}
          ${knowHow.length ? `<div><h4>Know How</h4><ul>${bullet(knowHow)}</ul></div>` : ""}
          ${ingles ? `<div><h4>Inglés</h4><p>${esc(ingles.skillName)} — ${ingles.porcentaje}%</p></div>` : ""}
        </div>
        <div class="cv-main">
          <div class="cv-main-header">
            <div>
              <p class="cv-name">${esc(nombre).toUpperCase()}</p>
            </div>
            <img src="${window.location.origin}/logo192.png" alt="Logo" />
          </div>
          <p class="cv-resumen">${esc(descripcion) || "Sin descripción de perfil registrada."}</p>

          <h3>Habilidades</h3>
          ${habilidades.length
            ? `<ul class="bullets">${habilidades.map(h => `<li>${esc(h.skillName)} — ${h.porcentaje}%</li>`).join("")}</ul>`
            : `<p class="cv-empty">Sin habilidades registradas.</p>`}

          <h3>Expertise</h3>
          ${experienciaItems.length
            ? experienciaItems.map(i => `<div class="cv-item"><div class="cv-item-title">${esc(i.title)}</div><div class="cv-item-meta">${esc(i.year||"")}</div><div class="cv-item-desc">${esc(i.description||"")}</div></div>`).join("")
            : `<p class="cv-empty">Sin experiencia registrada.</p>`}

          <h3>Educación</h3>
          ${educationItems.length
            ? educationItems.map(i => `<div class="cv-item"><div class="cv-item-title">${esc(i.title)}</div><div class="cv-item-meta">${esc(i.year||"")}</div><div class="cv-item-desc">${esc(i.description||"")}</div></div>`).join("")
            : `<p class="cv-empty">Sin educación registrada.</p>`}
        </div>
      </div>
      </body></html>`);
    cvWindow.document.close();
    cvWindow.print();
  };
  return (
    <div className="section-inner">
      <h3 className="section-title">CV / Portafolio</h3>
      <p className="description-text">Genera un CV con el formato institucional — educación, experiencia y habilidades.</p>
      <button className="btn-ghost btn-ghost--accent" onClick={handlePrint}><FiFileText style={{verticalAlign:"-2px",marginRight:4}}/>Exportar CV como PDF</button>
    </div>
  );
};
// ── FinancialSectionRenderer — nómina o CFDI según TipoRelacionLaboral ───────
// Autónomo: carga y guarda directo contra la API (no pasa por el flujo de
// "Guardar cambios" del resto del perfil, cada documento se sube al vuelo).
const MESES = [
  "01","02","03","04","05","06","07","08","09","10","11","12",
];

const formatPeriodo = (p) => {
  if (!p || !/^\d{4}-\d{2}$/.test(p)) return p || "—";
  const [y, m] = p.split("-");
  const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const idx = MESES.indexOf(m);
  return idx >= 0 ? `${nombres[idx]} ${y}` : p;
};

export const FinancialSectionRenderer = ({ empleadoId, tipoRelacionLaboral, isOwnProfile }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const [monto, setMonto] = useState("");

  const isAdmin = authService.isAdmin();
  const isContador = authService.getRole() === "CONTADOR";
  const esNomina = tipoRelacionLaboral !== "prestador_servicios";
  // Quién puede SUBIR: nómina -> admin o contador; CFDI -> el propio empleado (o admin, en su nombre).
  const puedeSubir = esNomina ? (isAdmin || isContador) : (isOwnProfile || isAdmin);
  // Nadie ve esta sección si no es su propio perfil, admin, o tiene acceso financiero.
  const puedeVer = isOwnProfile || isAdmin || authService.getRole() === "CONTADOR";

  const { openFilePicker, filesContent, clear } = useFilePicker({
    readAs: "DataURL", accept: "application/pdf", multiple: false,
    validators: [new FileAmountLimitValidator({ max: 1 }), new FileSizeValidator({ maxFileSize: 8 * 1024 * 1024 })],
  });

  const cargar = useCallback(() => {
    if (!empleadoId || !puedeVer) { setLoading(false); return; }
    setLoading(true);
    const tipoEsperado = esNomina ? "nomina" : "cfdi";
    documentosFinancierosService.getByEmpleado(empleadoId)
      .then(d => setDocs(Array.isArray(d) ? d.filter(x => x.tipo === tipoEsperado) : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId, esNomina]);

  useEffect(() => { cargar(); }, [cargar]);

  const subir = async () => {
    if (!periodo || filesContent.length === 0) {
      setError("Selecciona el periodo (AAAA-MM) y adjunta el PDF.");
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      await documentosFinancierosService.create({
        empleado_id: empleadoId,
        tipo: esNomina ? "nomina" : "cfdi",
        periodo,
        monto: monto || undefined,
        archivo_pdf: filesContent[0].content,
        nombre_archivo: filesContent[0].name,
      });
      setPeriodo(""); setMonto(""); clear();
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo subir el documento.");
    } finally {
      setSubiendo(false);
    }
  };

  const marcarPagado = async (docId) => {
    try {
      await documentosFinancierosService.updateEstado(docId, "pagado");
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo actualizar el estado.");
    }
  };

  const eliminar = async (docId) => {
    try {
      await documentosFinancierosService.delete(docId);
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo eliminar el documento.");
    }
  };

  if (!puedeVer) return null;

  return (
    <div className="section-inner">
      <h3 className="section-title">{esNomina ? "Recibos de nómina" : "Facturas (CFDI)"}</h3>

      {loading ? (
        <p className="emp-dim">Cargando documentos…</p>
      ) : docs.length === 0 ? (
        <p className="emp-dim">
          {esNomina ? "Aún no hay recibos de nómina registrados." : "Aún no has subido ninguna factura."}
        </p>
      ) : (
        <div className="fin-doc-list">
          {docs.map(d => (
            <div key={d._id} className="fin-doc-row">
              <span className="fin-doc-periodo">{formatPeriodo(d.periodo)}</span>
              {!esNomina && (
                <span className={`fin-doc-estado fin-doc-estado--${d.estado}`}>
                  {d.estado === "pagado" ? "Pagado" : "Pendiente"}
                </span>
              )}
              {d.monto && <span className="emp-dim">${d.monto}</span>}
              <PDFAttachment raw={d.archivo_pdf} label={d.nombre_archivo} />
              {isAdmin && !esNomina && d.estado === "pendiente" && (
                <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => marcarPagado(d._id)}>
                  Marcar pagado
                </button>
              )}
              {(isAdmin || (isOwnProfile && !esNomina && d.estado === "pendiente")) && (
                <button className="btn-ghost" style={{ padding: "4px 10px" }}
                  aria-label={`Eliminar documento ${formatPeriodo(d.periodo)}`}
                  onClick={() => eliminar(d._id)}><FiX /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {puedeSubir && (
        <div className="rh-horario" style={{ marginTop: 14 }}>
          <p className="field-label" style={{ marginBottom: 8 }}>
            {esNomina ? "Subir recibo de nómina" : "Subir factura CFDI"}
          </p>
          <div className="horario-grid">
            <div className="field-row">
              <span className="field-label">Periodo</span>
              <input className="field-input" type="month" value={periodo}
                onChange={e => setPeriodo(e.target.value)} />
            </div>
            {!esNomina && (
              <div className="field-row">
                <span className="field-label">Monto (opcional)</span>
                <input className="field-input" type="text" value={monto}
                  placeholder="Ej. 12500.00" onChange={e => setMonto(e.target.value)} />
              </div>
            )}
          </div>
          <button className="btn-ghost" onClick={openFilePicker} style={{ marginTop: 8 }}>
            <FiPaperclip style={{verticalAlign:"-2px",marginRight:4}}/>{filesContent.length > 0 ? filesContent[0].name : "Seleccionar PDF"}
          </button>
          {error && <p style={{ color: "var(--hr-danger, #e86b5f)", fontSize: "0.82rem", marginTop: 6 }}>{error}</p>}
          <button className="btn-ghost btn-ghost--accent" style={{ marginTop: 10 }}
            disabled={subiendo} onClick={subir}>
            {subiendo ? "Subiendo…" : "Guardar documento"}
          </button>
        </div>
      )}
    </div>
  );
};

// ── NominaExternaRenderer — nómina generada en OTRO sistema, consumida en
// vivo vía la conexión externa configurada por el SUPER_ADMIN (Integraciones).
// No se guarda copia local: cada vez que se abre esta sección se vuelve a
// consultar el sistema externo.
export const NominaExternaRenderer = ({ empleadoId }) => {
  const [estado, setEstado] = useState(undefined);

  useEffect(() => {
    if (!empleadoId) { setEstado(null); return; }
    let vivo = true;
    conexionesExternasService.getNominaExterna(empleadoId)
      .then(d => { if (vivo) setEstado(d); })
      .catch(() => { if (vivo) setEstado(null); });
    return () => { vivo = false; };
  }, [empleadoId]);

  // Sin conexión de tipo "nómina" configurada en esta empresa: no mostrar
  // nada (no es un error, simplemente no aplica).
  if (estado === undefined || estado === null || estado.configurada === false) return null;

  return (
    <div className="section-inner">
      <h3 className="section-title">Nómina (sistema externo)</h3>
      {estado.error ? (
        <p className="emp-dim">{estado.error}</p>
      ) : estado.datos ? (
        <>
          <p className="description-text" style={{ marginBottom: 10 }}>Datos en vivo desde "{estado.fuente}" — no se guarda copia aquí.</p>
          <div className="fin-doc-list">
            {Object.entries(estado.datos).map(([campo, valor]) => (
              <div key={campo} className="fin-doc-row">
                <span className="field-label" style={{ minWidth: 140 }}>{campo}</span>
                <span className="field-value">{typeof valor === "object" ? JSON.stringify(valor) : String(valor)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="emp-dim">Cargando…</p>
      )}
    </div>
  );
};

// ── RelacionLaboralHeader — antigüedad, aniversario y salario ────────────────
// Vive fuera del velo "sensible" salvo el salario, que se oculta si no hay
// permiso. La antigüedad/aniversario no es información sensible y siempre
// se muestra: es parte de "conocer a tu gente", no un dato financiero.
export const RelacionLaboralHeader = ({ RH, puedeVerSalario, empleadoId }) => {
  const fechaIngreso = RH?.FechaIngreso;
  const tipo = RH?.TipoRelacionLaboral || "nomina";

  const antiguedad = (() => {
    if (!fechaIngreso) return null;
    const ingreso = new Date(fechaIngreso + "T00:00:00");
    if (isNaN(ingreso.getTime())) return null;
    const hoy = new Date();
    let anios = hoy.getFullYear() - ingreso.getFullYear();
    const cumplioEsteAnio = (hoy.getMonth() > ingreso.getMonth())
      || (hoy.getMonth() === ingreso.getMonth() && hoy.getDate() >= ingreso.getDate());
    if (!cumplioEsteAnio) anios -= 1;
    const esAniversarioHoy = hoy.getMonth() === ingreso.getMonth() && hoy.getDate() === ingreso.getDate() && anios >= 1;
    return { anios: Math.max(anios, 0), esAniversarioHoy };
  })();

  const salario = Number(RH?.Salario) || 0;

  return (
    <div className="section-inner">
      <h3 className="section-title">Relación laboral</h3>

      {antiguedad && antiguedad.esAniversarioHoy && (
        <div className="rl-aniversario" role="status">
          <FiGift style={{verticalAlign:"-2px",marginRight:6}}/>¡Hoy cumple {antiguedad.anios} {antiguedad.anios === 1 ? "año" : "años"} en la empresa!
        </div>
      )}

      <div className="horario-grid">
        <div className="field-row">
          <span className="field-label">Antigüedad</span>
          <span className="field-value">
            {antiguedad
              ? `${antiguedad.anios} ${antiguedad.anios === 1 ? "año" : "años"}`
              : <em className="field-empty">Sin fecha de ingreso</em>}
          </span>
        </div>
        <div className="field-row">
          <span className="field-label">Tipo de relación</span>
          <span className="field-value">
            {tipo === "prestador_servicios" ? "Prestador de servicios" : "Nómina"}
          </span>
        </div>
        {puedeVerSalario && salario > 0 && tipo !== "prestador_servicios" && (
          <>
            <div className="field-row">
              <span className="field-label">Sueldo mensual</span>
              <span className="field-value">${salario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="field-row">
              <span className="field-label">Sueldo quincenal</span>
              <span className="field-value">${(salario / 2).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
        {puedeVerSalario && salario > 0 && tipo === "prestador_servicios" && (
          <div className="field-row">
            <span className="field-label">Monto acordado por servicio</span>
            <span className="field-value">${salario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {puedeVerSalario && salario === 0 && (
          <div className="field-row">
            <span className="field-label">{tipo === "prestador_servicios" ? "Monto acordado" : "Sueldo"}</span>
            <span className="field-value"><em className="field-empty">Sin registrar</em></span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── VacacionesRenderer — balance, solicitud y bitácora ───────────────────────
export const VacacionesRenderer = ({ empleadoId, isOwnProfile, esAprobador }) => {
  const [balance, setBalance] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fInicio, setFInicio] = useState("");
  const [fFin, setFFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const puedeVer = isOwnProfile || authService.isAdmin() || esAprobador;

  const cargar = useCallback(() => {
    if (!empleadoId || !puedeVer) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      vacacionesService.getBalance(empleadoId).catch(() => null),
      vacacionesService.getByEmpleado(empleadoId).catch(() => []),
    ]).then(([b, s]) => {
      setBalance(b);
      setSolicitudes(Array.isArray(s) ? s : []);
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const solicitar = async () => {
    if (!fInicio || !fFin) { setError("Selecciona fecha de inicio y fin."); return; }
    setError(""); setEnviando(true);
    try {
      await vacacionesService.crear({ fecha_inicio: fInicio, fecha_fin: fFin, motivo });
      setFInicio(""); setFFin(""); setMotivo("");
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo enviar la solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  if (!puedeVer) return null;

  const ESTADO_LABEL = { pendiente: "Pendiente", aprobada: "Aprobada", rechazada: "Rechazada" };

  return (
    <div className="section-inner">
      <h3 className="section-title">Vacaciones</h3>

      {loading ? (
        <p className="emp-dim">Cargando…</p>
      ) : !balance || balance.antiguedad_anios === null ? (
        <p className="emp-dim">{balance?.mensaje || "Sin información suficiente para calcular el balance."}</p>
      ) : (
        <div className="rl-vac-balance">
          <div className="rl-vac-stat"><span className="rl-vac-num">{balance.dias_disponibles}</span><span className="rl-vac-lbl">Disponibles</span></div>
          <div className="rl-vac-stat"><span className="rl-vac-num">{balance.dias_usados_anio}</span><span className="rl-vac-lbl">Usados este año</span></div>
          <div className="rl-vac-stat"><span className="rl-vac-num">{balance.dias_totales_anio}</span><span className="rl-vac-lbl">Total del año</span></div>
        </div>
      )}

      {solicitudes.length > 0 && (
        <div className="fin-doc-list" style={{ marginTop: 14 }}>
          {solicitudes.map(s => (
            <div key={s._id} className="fin-doc-row">
              <span className="fin-doc-periodo">{s.fecha_inicio} → {s.fecha_fin}</span>
              <span className="emp-dim">{s.dias_solicitados} días</span>
              <span className={`fin-doc-estado fin-doc-estado--${s.estado === "aprobada" ? "pagado" : s.estado === "rechazada" ? "" : "pendiente"}`}
                style={s.estado === "rechazada" ? { background: "var(--critical-soft, #f5e3e1)", color: "var(--hr-danger,#b5453a)" } : undefined}>
                {ESTADO_LABEL[s.estado] || s.estado}
              </span>
              {s.motivo && <span className="emp-dim">· {s.motivo}</span>}
              {s.estado === "aprobada" && (
                <button
                  className="btn-ghost"
                  style={{ marginLeft: "auto" }}
                  onClick={() => descargarIcs(`/vacaciones/${s._id}/ics`, `vacaciones-${s._id}.ics`)}
                >
                  <FiCalendar style={{verticalAlign:"-2px",marginRight:4}}/>.ics
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwnProfile && (
        <div className="rh-horario" style={{ marginTop: 14 }}>
          <p className="field-label" style={{ marginBottom: 8 }}>Solicitar vacaciones</p>
          <div className="horario-grid">
            <div className="field-row">
              <span className="field-label">Del</span>
              <input className="field-input" type="date" value={fInicio} onChange={e => setFInicio(e.target.value)} />
            </div>
            <div className="field-row">
              <span className="field-label">Al</span>
              <input className="field-input" type="date" value={fFin} onChange={e => setFFin(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <span className="field-label">Motivo (opcional)</span>
            <input className="field-input" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. viaje familiar" />
          </div>
          {error && <p style={{ color: "var(--hr-danger, #e86b5f)", fontSize: "0.82rem", marginTop: 4 }}>{error}</p>}
          <button className="btn-ghost btn-ghost--accent" style={{ marginTop: 8 }} disabled={enviando} onClick={solicitar}>
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      )}
    </div>
  );
};

// ── PrestamosRenderer — backend ya existía, solo faltaba esta UI ────────────
export const PrestamosRenderer = ({ empleadoId, isOwnProfile }) => {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto, setMonto] = useState("");
  const [tasa, setTasa] = useState("0");
  const [plazo, setPlazo] = useState("12");
  const [metodo, setMetodo] = useState("Descuento vía nómina");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = authService.isAdmin();
  const puedeVer = isOwnProfile || isAdmin;

  const cargar = useCallback(() => {
    if (!empleadoId || !puedeVer) { setLoading(false); return; }
    setLoading(true);
    prestamoService.getByEmpleado(empleadoId)
      .then(d => setPrestamos(Array.isArray(d) ? d : []))
      .catch(() => setPrestamos([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    const montoNum = Number(monto);
    const tasaNum = Number(tasa) || 0;
    const plazoNum = Number(plazo);
    if (!montoNum || !plazoNum) { setError("Monto y plazo son obligatorios."); return; }
    setError(""); setGuardando(true);
    try {
      const hoy = new Date();
      const vencimiento = new Date(hoy); vencimiento.setMonth(vencimiento.getMonth() + plazoNum);
      const cuota = (montoNum * (1 + tasaNum / 100)) / plazoNum;
      await prestamoService.create({
        empleado_id: empleadoId,
        MontoPrestamo: montoNum,
        TasaInteres: tasaNum,
        FecSolicitud: hoy.toISOString().slice(0, 10),
        FecAprobacion: hoy.toISOString().slice(0, 10),
        FecVencimiento: vencimiento.toISOString().slice(0, 10),
        PlazoMeses: plazoNum,
        MontoPendiente: montoNum,
        PagosRealizados: 0,
        CuotaMensual: Math.round(cuota * 100) / 100,
        MetodoPago: metodo,
      });
      setMonto(""); setTasa("0"); setPlazo("12"); setMostrarForm(false);
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo registrar el préstamo.");
    } finally {
      setGuardando(false);
    }
  };

  if (!puedeVer) return null;

  return (
    <div className="section-inner">
      <h3 className="section-title">Préstamos</h3>

      {loading ? (
        <p className="emp-dim">Cargando…</p>
      ) : prestamos.length === 0 ? (
        <p className="emp-dim">Sin préstamos registrados.</p>
      ) : (
        <div className="fin-doc-list">
          {prestamos.map(p => (
            <div key={p._id} className="fin-doc-row">
              <span className="fin-doc-periodo">${Number(p.MontoPrestamo).toLocaleString("es-MX")}</span>
              <span className="emp-dim">{p.PlazoMeses} meses · ${Number(p.CuotaMensual).toLocaleString("es-MX", { minimumFractionDigits: 2 })}/mes</span>
              <span className="emp-dim">Pendiente: ${Number(p.MontoPendiente).toLocaleString("es-MX")}</span>
              <span className="emp-dim">{p.PagosRealizados} pagos realizados</span>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: 14 }}>
          {!mostrarForm ? (
            <button className="btn-ghost" onClick={() => setMostrarForm(true)}>+ Registrar préstamo</button>
          ) : (
            <div className="rh-horario">
              <div className="horario-grid">
                <div className="field-row">
                  <span className="field-label">Monto</span>
                  <input className="field-input" type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="10000" />
                </div>
                <div className="field-row">
                  <span className="field-label">Tasa de interés anual (%)</span>
                  <input className="field-input" type="number" value={tasa} onChange={e => setTasa(e.target.value)} />
                </div>
                <div className="field-row">
                  <span className="field-label">Plazo (meses)</span>
                  <input className="field-input" type="number" value={plazo} onChange={e => setPlazo(e.target.value)} />
                </div>
                <div className="field-row">
                  <span className="field-label">Método de pago</span>
                  <input className="field-input" value={metodo} onChange={e => setMetodo(e.target.value)} />
                </div>
              </div>
              {error && <p style={{ color: "var(--hr-danger, #e86b5f)", fontSize: "0.82rem" }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn-ghost btn-ghost--accent" disabled={guardando} onClick={crear}>
                  {guardando ? "Guardando…" : "Guardar préstamo"}
                </button>
                <button className="btn-ghost" onClick={() => setMostrarForm(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
