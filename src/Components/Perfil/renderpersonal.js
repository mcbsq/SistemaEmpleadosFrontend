import React, { useState, useEffect, useCallback } from "react";
import { confirmar } from "../../services/dialogo";
import IconButton from "../IconButton";
import { RecordCard } from "../RecordCard";
import { abrirContactoRH } from "../../services/solicitudesRhService";
import Modal from "../Modal";
import TextareaAutosize from "react-textarea-autosize";
import { useFilePicker } from "use-file-picker";
import { FileAmountLimitValidator, FileSizeValidator } from "use-file-picker/validators";
import { CiFacebook, CiLinkedin, CiYoutube } from "react-icons/ci";
import { FaInstagram, FaTiktok, FaGithub } from "react-icons/fa";
import { FiX, FiPaperclip, FiFileText, FiCalendar, FiGift, FiLock, FiAlertCircle, FiStar, FiHelpCircle, FiSend, FiCheck, FiPhone, FiMessageCircle, FiMail, FiMapPin, FiBookOpen, FiBriefcase, FiDollarSign } from "react-icons/fi";
import { authService } from "../../services/authService";
import { documentosFinancierosService } from "../../services/documentosFinancierosService";
import { vacacionesService } from "../../services/vacacionesService";
import { prestamoService } from "../../services/prestamoService";
import { conexionesExternasService } from "../../services/conexionesExternasService";
import { PDFAttachment, PDFViewer, normalizePDF } from "./PDFAttachment";
import MapaDomicilio from "./MapaDomicilio";
import { API_URL, sessionHeaders, apiFetch } from "../../services/apiConfig";
import { catalogodeptoService } from "../../services/catalogodeptoService";

// Descarga un .ics autenticado (fetch + blob, ya que un <a href> normal no
// puede llevar el header Authorization).
async function descargarIcs(path, filename) {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: sessionHeaders() });
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

// Un campo del perfil. En lectura, el valor largo se corta con "…" y el texto
// completo queda en el tooltip (title) para que nunca desborde la tarjeta.
// `error` marca el input y explica qué está mal; `hint` orienta sin regañar.
export const Field = ({ label, value, isEditing, onChange, type = "text", placeholder = "", error, hint, maxLength, inputMode, mono }) => {
  const id = React.useId();
  return (
    <div className={`field-row${error ? " field-row--error" : ""}`}>
      <label className="field-label" htmlFor={isEditing ? id : undefined}>{label}</label>
      {isEditing ? (
        <input id={id} type={type} className={`field-input${mono ? " field-input--mono" : ""}`} value={value || ""}
          placeholder={placeholder || label} maxLength={maxLength} inputMode={inputMode}
          aria-invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined}
          onChange={e => onChange(e.target.value)} />
      ) : (
        <span className={`field-value${mono ? " field-value--mono" : ""}`} title={value ? String(value) : undefined}>
          {value || <em className="field-empty">Sin datos</em>}
        </span>
      )}
      {isEditing && (error || hint) && (
        <span id={`${id}-msg`} className={error ? "field-error" : "field-hint"} role={error ? "alert" : undefined}>
          {error && <FiAlertCircle aria-hidden="true" />}{error || hint}
        </span>
      )}
    </div>
  );
};

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
      <p className="description-text">{descripcion || <em className="field-empty">Aún no hay descripción.</em>}</p>
    )}
  </div>
);

// Un correo marcado "principal" (radio) — igual que RedesSocialesRenderer:
// agregar/quitar filas libremente, nunca un solo campo de texto.
export const InfoPersonalRenderer = ({ isEditing, datoscontacto, handleInputChangedatoscontacto, errores = {} }) => {
  const dc = datoscontacto ?? {};
  const soloDigitos = (t) => String(t || "").replace(/\D/g, "");
  // WhatsApp suele ser el mismo número que el celular: se marca en vez de reescribirlo.
  const waIgual = !!dc.telefonoC && soloDigitos(dc.IDwhatsapp) === soloDigitos(dc.telefonoC);
  const cambiarCelular = (v) => {
    handleInputChangedatoscontacto("telefonoC", v);
    if (waIgual) handleInputChangedatoscontacto("IDwhatsapp", v);
  };
  const correos = dc.correos?.length ? dc.correos : [];
  const setCorreos = (next) => handleInputChangedatoscontacto("correos", next);
  const addCorreo    = () => setCorreos([...correos, { email: "", principal: correos.length === 0 }]);
  const removeCorreo = (i) => {
    const restantes = correos.filter((_, idx) => idx !== i);
    if (correos[i]?.principal && restantes.length) restantes[0] = { ...restantes[0], principal: true };
    setCorreos(restantes);
  };
  const updateCorreo   = (i, val) => { const up = [...correos]; up[i] = { ...up[i], email: val }; setCorreos(up); };
  const setPrincipal   = (i) => setCorreos(correos.map((c, idx) => ({ ...c, principal: idx === i })));

  return (
    <div className="section-inner">
      <h3 className="section-title">Datos de contacto</h3>
      <div className="field-grid">
        <Field label="Celular"  value={dc.telefonoC}  isEditing={isEditing} onChange={cambiarCelular}  type="tel" error={errores.TelCelular} />
        <Field label="Fijo"     value={dc.telefonoF}  isEditing={isEditing} onChange={v => handleInputChangedatoscontacto("telefonoF", v)}  type="tel" error={errores.TelFijo}
          hint={isEditing ? "Opcional; no puede ser el mismo que el celular." : undefined} />
        <div className="field-row">
          <Field label="WhatsApp" value={dc.IDwhatsapp} isEditing={isEditing && !waIgual} onChange={v => handleInputChangedatoscontacto("IDwhatsapp", v)} type="tel" error={errores.IdWhatsApp} />
          {isEditing && (
            <label className="nom-check">
              <input type="checkbox" checked={waIgual} disabled={!dc.telefonoC}
                onChange={e => handleInputChangedatoscontacto("IDwhatsapp", e.target.checked ? dc.telefonoC : "")} />
              Es el mismo que el celular
            </label>
          )}
        </div>
        <Field label="Telegram" value={dc.IDtelegram} isEditing={isEditing} onChange={v => handleInputChangedatoscontacto("IDtelegram", v)} />
      </div>

      <div className="field-row">
        <span className="field-label">Correos</span>
        {errores.ListaCorreos && <span className="field-error" role="alert">{errores.ListaCorreos}</span>}
        {isEditing ? (
          <div className="correo-edit-list">
            {correos.map((c, i) => (
              <div key={i} className="correo-edit-row">
                <button type="button" className="correo-star" aria-pressed={!!c.principal} onClick={() => setPrincipal(i)}
                  aria-label={c.principal ? `${c.email || "Este correo"} es tu correo principal` : `Marcar ${c.email || "este correo"} como principal`}
                  data-tooltip={c.principal ? "Correo principal" : "Marcar como principal"} data-tooltip-pos="right">
                  <FiStar aria-hidden="true" />
                </button>
                <input type="email" className="field-input" placeholder="correo@ejemplo.com" value={c.email}
                  aria-label={`Correo ${i + 1}`} onChange={e => updateCorreo(i, e.target.value)} />
                <IconButton accion="eliminar" size="sm" label={`Quitar ${c.email || "este correo"}`} tooltipPos="left" onClick={() => removeCorreo(i)} />
              </div>
            ))}
            <IconButton accion="agregar" size="sm" label="Agregar correo" onClick={addCorreo} tooltipPos="right" />
          </div>
        ) : (
          <span className="field-value correo-lista">
            {correos.filter(c => c.email).length === 0
              ? <em className="field-empty">Sin datos</em>
              : correos.filter(c => c.email).map((c, i) => (
                  <span key={i} title={c.email}>
                    <span>{c.email}</span>
                    {c.principal && correos.length > 1 && <FiStar aria-label="principal" />}
                  </span>
                ))
            }
          </span>
        )}
      </div>
    </div>
  );
};

// N contactos de emergencia: tarjetas en la isla, captura en pop-up.
export const PersonasContactoRenderer = ({ personalcontactos, puedeEditar, onSave, opcionesParentesco = [] }) => {
  const contactos = personalcontactos ?? [];
  const VACIO = { nombreContacto: "", parenstesco: "", telefonoContacto: "", correoContacto: "", direccionContacto: "", whatsappContacto: "", telegramContacto: "", facebookContacto: "" };
  const ed = useEditorLista(contactos, onSave, VACIO);
  const iniciales = (n = "") => n.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "?";
  const d = ed.editor?.draft;
  return (
    <div className="section-inner">
      <div className="rc-section-head">
        <h3 className="section-title">Contactos de emergencia</h3>
        {puedeEditar && <IconButton accion="agregar" label="Agregar contacto de emergencia" tooltipPos="left" onClick={() => ed.abrir()} />}
      </div>
      {contactos.length === 0 ? (
        <p className="rc-empty">{puedeEditar ? "Agrega al menos a una persona a quien llamar en una emergencia." : "Sin contactos registrados."}</p>
      ) : (
        <div className="ec-list mo-stagger">
          {contactos.map((p, i) => (
            <RecordCard key={i} tono="accent"
              tile={<span className="rc-tile-big">{iniciales(p.nombreContacto)}</span>}
              titulo={p.nombreContacto || "Sin nombre"}
              badge={p.parenstesco && <span className="rc-badge ec-badge">{p.parenstesco}</span>}
              meta={<>
                {p.telefonoContacto && <a className="ec-link" href={`tel:${p.telefonoContacto}`}><FiPhone aria-hidden="true" />{p.telefonoContacto}</a>}
                {p.whatsappContacto && <a className="ec-link" href={`https://wa.me/${String(p.whatsappContacto).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><FiMessageCircle aria-hidden="true" />WhatsApp</a>}
                {p.correoContacto && <a className="ec-link rc-meta-trunc" href={`mailto:${p.correoContacto}`} title={p.correoContacto}><FiMail aria-hidden="true" />{p.correoContacto}</a>}
                {p.direccionContacto && <span className="rc-meta-trunc" title={p.direccionContacto}><FiMapPin aria-hidden="true" /> {p.direccionContacto}</span>}
              </>}
              acciones={puedeEditar && <AccionesTarjeta nombre={p.nombreContacto || "contacto"} onEditar={() => ed.abrir(i)} onEliminar={() => ed.eliminar(i, p.nombreContacto)} />}
            />
          ))}
        </div>
      )}
      <Modal abierto={!!ed.editor} onClose={ed.cerrar} titulo={ed.editor?.indice === null ? "Agregar contacto de emergencia" : "Editar contacto de emergencia"}
        onGuardar={ed.guardar} guardando={ed.guardando} error={ed.error}
        puedeGuardar={!!(d?.nombreContacto?.trim() && (d?.telefonoContacto?.trim() || d?.whatsappContacto?.trim()))}>
        {d && (
          <div className="field-grid">
            <Field label="Nombre" value={d.nombreContacto} isEditing onChange={v => ed.setCampo("nombreContacto", v)} />
            <SelectField label="Parentesco" value={d.parenstesco} isEditing options={opcionesParentesco} onChange={v => ed.setCampo("parenstesco", v)} />
            <Field label="Teléfono" value={d.telefonoContacto} isEditing type="tel" onChange={v => ed.setCampo("telefonoContacto", v)} hint="Teléfono o WhatsApp es obligatorio" />
            <Field label="WhatsApp" value={d.whatsappContacto} isEditing type="tel" onChange={v => ed.setCampo("whatsappContacto", v)} />
            <Field label="Correo" value={d.correoContacto} isEditing type="email" onChange={v => ed.setCampo("correoContacto", v)} />
            <Field label="Dirección" value={d.direccionContacto} isEditing onChange={v => ed.setCampo("direccionContacto", v)} />
          </div>
        )}
      </Modal>
    </div>
  );
};

const CAMPOS_DOMICILIO = [
  { field: "Calle", label: "Calle", span: true },
  { field: "NumExterior", label: "Núm. exterior", placeholder: "Número o S/N" },
  { field: "NumInterior", label: "Núm. interior" },
  { field: "Colonia", label: "Colonia" },
  { field: "CodigoP", label: "Código postal", inputMode: "numeric", maxLength: 5 },
  { field: "Manzana", label: "Manzana" },
  { field: "Lote", label: "Lote" },
  { field: "Municipio", label: "Municipio / alcaldía" },
  { field: "Ciudad", label: "Estado" },
];
const REGLAS_DOMICILIO = {
  Calle: "obligatorio", NumExterior: "obligatorio", NumInterior: "opcional", Colonia: "obligatorio",
  Manzana: "opcional", Lote: "opcional", Municipio: "obligatorio", Ciudad: "obligatorio", CodigoP: "obligatorio",
};

export const DireccionRenderer = ({ isEditing, direccion = {}, onDireccionChange, lat, lng, onCoordsChange, errores = {}, reglas = {} }) => {
  const upd = (f, v) => onDireccionChange?.(f, v);
  const regla = (f) => ({ ...REGLAS_DOMICILIO, ...reglas })[f] || "opcional";
  // Un campo oculto por la empresa igual se muestra si ya tiene dato.
  const visibles = CAMPOS_DOMICILIO.filter(c => regla(c.field) !== "oculto" || direccion[c.field]);
  return (
    <div className="section-inner">
      <h3 className="section-title">Domicilio</h3>
      <div className="dir-layout">
        <div className="field-grid">
          {visibles.map(c => {
            const campo = (
              <Field key={c.field} label={`${c.label}${isEditing && regla(c.field) === "obligatorio" ? " *" : ""}`} value={direccion[c.field]}
                isEditing={isEditing} onChange={v => upd(c.field, c.field === "CodigoP" ? v.replace(/\D/g, "") : v)}
                placeholder={c.placeholder} inputMode={c.inputMode} maxLength={c.maxLength} error={errores[c.field]} />
            );
            return c.span ? <div key={c.field} className="field-span-2">{campo}</div> : campo;
          })}
        </div>
        <div className="dir-mapa">
          <MapaDomicilio direccion={direccion} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} mode="popup" />
        </div>
      </div>
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
              <IconButton accion="eliminar" size="sm" label="Quitar red" tooltipPos="left" onClick={()=>remove(i)} />
            </div>
          ))}
          <IconButton accion="agregar" label="Agregar red social" onClick={add} tooltipPos="right" />
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

// ── Hook común: editar una lista en un pop-up y guardarla al confirmar ─────
// draft = copia del elemento en edición; indice = posición (null = nuevo).
function useEditorLista(items, onSave, vacio) {
  const [editor, setEditor] = useState(null); // { indice, draft }
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const abrir = (indice = null) => { setError(""); setEditor({ indice, draft: indice === null ? { ...vacio } : { ...items[indice] } }); };
  const cerrar = () => { if (!guardando) setEditor(null); };
  const setCampo = (campo, valor) => setEditor(e => ({ ...e, draft: { ...e.draft, [campo]: valor } }));
  const persistir = async (lista) => {
    setGuardando(true); setError("");
    try { await onSave(lista); setEditor(null); return true; }
    catch (e) { setError(e.message || "No se pudo guardar. Intenta de nuevo."); return false; }
    finally { setGuardando(false); }
  };
  const guardar = () => {
    const lista = [...items];
    if (editor.indice === null) lista.unshift(editor.draft); else lista[editor.indice] = editor.draft;
    return persistir(lista);
  };
  const eliminar = async (i, nombre) => {
    if (!(await confirmar(`¿Quitar ${nombre || "este registro"}?`))) return;
    persistir(items.filter((_, idx) => idx !== i));
  };
  return { editor, abrir, cerrar, setCampo, guardar, eliminar, guardando, error };
}

const AccionesTarjeta = ({ nombre, onEditar, onEliminar }) => (
  <>
    <IconButton accion="editar" size="sm" label={`Editar ${nombre}`} tooltipPos="left" onClick={onEditar} />
    <IconButton accion="eliminar" size="sm" label={`Quitar ${nombre}`} tooltipPos="left" onClick={onEliminar} />
  </>
);

// ── Experiencia y educación: tarjetas con año, título y descripción ─────────
const TimelineRenderer = ({ title, singular, labelTitulo, placeholderTitulo, icono: Icono, items = [], puedeEditar, onSave }) => {
  const ed = useEditorLista(items, onSave, { year: new Date().getFullYear().toString(), title: "", description: "" });
  const ordenados = items.map((it, i) => ({ it, i })).sort((a, b) => String(b.it.year || "").localeCompare(String(a.it.year || "")));
  return (
    <div className="section-inner">
      <div className="rc-section-head">
        <h3 className="section-title">{title}</h3>
        {puedeEditar && <IconButton accion="agregar" label={`Agregar ${singular}`} tooltipPos="left" onClick={() => ed.abrir()} />}
      </div>
      {items.length === 0 ? (
        <p className="rc-empty">{puedeEditar ? `Aún no hay registros. Usa + para agregar ${singular}.` : "Aún no hay registros."}</p>
      ) : (
        <div className="ec-list mo-stagger">
          {ordenados.map(({ it, i }) => (
            <RecordCard key={i} tono="accent"
              tile={it.year ? <span className="rc-tile-big rc-tile-year">{it.year}</span> : <Icono />}
              titulo={it.title || "Sin título"}
              meta={it.description && <span className="rc-desc">{it.description}</span>}
              acciones={puedeEditar && <AccionesTarjeta nombre={it.title || singular} onEditar={() => ed.abrir(i)} onEliminar={() => ed.eliminar(i, it.title)} />}
            />
          ))}
        </div>
      )}
      <Modal abierto={!!ed.editor} onClose={ed.cerrar} titulo={ed.editor?.indice === null ? `Agregar ${singular}` : `Editar ${singular}`}
        onGuardar={ed.guardar} guardando={ed.guardando} error={ed.error} puedeGuardar={!!ed.editor?.draft.title?.trim()}>
        {ed.editor && (
          <>
            <div className="field-grid field-grid--año">
              <Field label="Año" value={ed.editor.draft.year} isEditing type="number" inputMode="numeric" onChange={v => ed.setCampo("year", v)} />
              <Field label={labelTitulo} value={ed.editor.draft.title} isEditing placeholder={placeholderTitulo} onChange={v => ed.setCampo("title", v)} />
            </div>
            <div className="field-row">
              <label className="field-label" htmlFor="tl-desc">Descripción</label>
              <TextareaAutosize id="tl-desc" className="field-textarea" minRows={3} value={ed.editor.draft.description || ""}
                placeholder="Lo más importante, en pocas líneas" onChange={e => ed.setCampo("description", e.target.value)} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export const EducationSectionRenderer = ({ educationItems, puedeEditar, onSave }) => (
  <TimelineRenderer title="Educación" singular="estudio" labelTitulo="Título o carrera" placeholderTitulo="Ej. Ing. en Sistemas · UV"
    icono={FiBookOpen} items={educationItems} puedeEditar={puedeEditar} onSave={onSave} />
);
export const ExperienceSectionRenderer = ({ experienceItems, puedeEditar, onSave }) => (
  <TimelineRenderer title="Experiencia laboral" singular="experiencia" labelTitulo="Puesto y empresa" placeholderTitulo="Ej. Desarrollador · Cibercom"
    icono={FiBriefcase} items={experienceItems} puedeEditar={puedeEditar} onSave={onSave} />
);

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
        onClick={() => setAbierto(o => !o)} onBlur={() => setTimeout(() => setAbierto(false), 150)}><FiHelpCircle aria-hidden="true" /></button>
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

export const SkillSectionRenderer = ({ habilidades = [], puedeEditar, onSave }) => {
  const ed = useEditorLista(habilidades, onSave, { skillName: "", porcentaje: 50 });
  const [catalogo, setCatalogo] = useState(false);
  const d = ed.editor?.draft;
  const esOtra = d && (d.skillName === "__otra__" || (d.skillName && !DEFINICIONES_POR_NOMBRE[d.skillName]));
  const nombreValido = d && d.skillName && d.skillName !== "__otra__";
  return (
    <div className="section-inner">
      <div className="rc-section-head">
        <h3 className="section-title">Habilidades</h3>
        {puedeEditar && <IconButton accion="agregar" label="Agregar habilidad" tooltipPos="left" onClick={() => ed.abrir()} />}
      </div>
      {habilidades.length === 0 ? (
        <p className="rc-empty">{puedeEditar ? "Usa + para agregar tus habilidades." : "Sin habilidades registradas."}</p>
      ) : (
        <div className="skills-list mo-stagger">
          {habilidades.map((h, i) => (
            <div key={i} className="skill-item skill-item--card">
              <div className="skill-header">
                <span className="skill-name" title={h.skillName}>{h.skillName}</span>
                <AyudaHabilidad nombre={h.skillName} />
                <span className="skill-pct">{h.porcentaje}%</span>
              </div>
              <div className="skill-bar-row">
                <div className="skill-bar-track"><div className="skill-bar-fill" style={{ width: `${h.porcentaje}%` }} /></div>
                {puedeEditar && (
                  <span className="skill-acciones">
                    <AccionesTarjeta nombre={h.skillName} onEditar={() => ed.abrir(i)} onEliminar={() => ed.eliminar(i, h.skillName)} />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {catalogo && <CatalogoHabilidadesModal onClose={() => setCatalogo(false)} onElegir={(nombre) => ed.setCampo("skillName", nombre)} />}
      <Modal abierto={!!ed.editor} onClose={ed.cerrar} titulo={ed.editor?.indice === null ? "Agregar habilidad" : "Editar habilidad"}
        subtitulo="Califícala de 0 a 100; no tienen que sumar 100 entre todas."
        onGuardar={ed.guardar} guardando={ed.guardando} error={ed.error} puedeGuardar={!!nombreValido}>
        {d && (
          <>
            <div className="field-row">
              <span className="field-label">Habilidad</span>
              <div className="skill-edit-top">
                <select className="field-input skill-select" value={esOtra && d.skillName !== "__otra__" ? d.skillName : d.skillName}
                  aria-label="Habilidad" onChange={e => ed.setCampo("skillName", e.target.value)}>
                  <option value="">Elige una habilidad…</option>
                  {Object.entries(HABILIDADES_CATALOGO).map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                      {items.map(it => <option key={it.nombre} value={it.nombre} title={it.definicion}>{it.nombre}</option>)}
                    </optgroup>
                  ))}
                  <optgroup label="Otra">
                    <option value={esOtra && d.skillName !== "__otra__" ? d.skillName : "__otra__"}>
                      {esOtra && d.skillName !== "__otra__" ? d.skillName : "Escribir otra habilidad…"}
                    </option>
                  </optgroup>
                </select>
                <IconButton icon={FiHelpCircle} label="Ver qué significa cada habilidad" tooltipPos="left" onClick={() => setCatalogo(true)} />
              </div>
              {DEFINICIONES_POR_NOMBRE[d.skillName] && <span className="field-hint">{DEFINICIONES_POR_NOMBRE[d.skillName]}</span>}
            </div>
            {esOtra && (
              <Field label="Nombre de la habilidad" value={d.skillName === "__otra__" ? "" : d.skillName} isEditing
                onChange={v => ed.setCampo("skillName", v || "__otra__")} />
            )}
            <div className="field-row">
              <span className="field-label">Nivel</span>
              <div className="skill-edit-nivel">
                <input type="range" min="0" max="100" step="5" value={d.porcentaje} aria-label="Nivel"
                  onChange={e => ed.setCampo("porcentaje", Number(e.target.value))} className="skill-range" style={{ "--pct": `${d.porcentaje}%` }} />
                <span className="skill-pct">{d.porcentaje}%</span>
              </div>
            </div>
          </>
        )}
      </Modal>
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
              <IconButton accion="eliminar" size="sm" label={`Quitar ${k}`} tooltipPos="left" onClick={() => eliminar(k)} />
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
          <IconButton accion="agregar" label="Agregar campo" onClick={agregar} disabled={!nuevoNombre.trim()} tooltipPos="left" />
        </div>
      )}
    </div>
  );
};

// ── Antigüedad a partir de la fecha de ingreso (AAAA-MM-DD) ─────────────────
export function calcularAntiguedad(fechaIngreso) {
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
}

// Régimen de la relación laboral. "asimilados" cobra por recibo de nómina
// timbrado por la empresa (igual que nómina); solo "honorarios" factura.
// El valor guardado de honorarios sigue siendo "prestador_servicios" para no
// romper empleados existentes.
export const REGIMENES = [
  { value: "nomina",              label: "Nómina (asalariado)" },
  { value: "asimilados",          label: "Asimilados a salarios" },
  { value: "prestador_servicios", label: "Honorarios (emite factura CFDI)" },
];
const regimenLabel = (v) => (REGIMENES.find(r => r.value === v) || REGIMENES[0]).label;

const TIPOS_CONTRATO = [
  { value: "",          label: "Sin contrato registrado" },
  { value: "digital",   label: "Firmado digitalmente" },
  { value: "autografa", label: "Firmado en papel" },
  { value: "pendiente", label: "Pendiente de firma" },
];

// Nota fija para lo que el empleado ve pero no edita: explica POR QUÉ no
// puede cambiarlo y qué hacer si está mal, en vez de solo mostrar un candado.
export const LockNote = ({ children = "Lo administra Recursos Humanos.", seccion }) => (
  <p className="lock-note"><FiLock aria-hidden="true" />
    <span>{children}
      {seccion && <button type="button" className="link-btn" onClick={() => abrirContactoRH({ tipo: "correccion", seccion })}>¿Algo está mal? Avísale a RH</button>}
    </span>
  </p>
);

// Área y puesto: se eligen del catálogo de Configuración → Áreas (nada de
// texto libre). Solo RH/Administración, y solo con el modo de edición global
// del perfil; se guarda junto con el resto de la ficha laboral (PUT /rh).
const PuestoArea = ({ isEditing, area, puesto, handleRHChange, errores = {} }) => {
  const [catalogo, setCatalogo] = useState(null);
  useEffect(() => {
    if (!isEditing || catalogo) return;
    catalogodeptoService.getAll()
      .then(d => setCatalogo((Array.isArray(d) ? d : []).map(a => ({ nombre: a.NombreDepto, puestos: a.Puestos || [] }))))
      .catch(() => setCatalogo([]));
  }, [isEditing, catalogo]);

  if (!isEditing) {
    return (<>
      <div className="field-row">
        <span className="field-label">Área</span>
        <span className="field-value" title={area || ""}>{area || <em className="field-empty">Sin asignar</em>}</span>
      </div>
      <div className="field-row">
        <span className="field-label">Puesto</span>
        <span className="field-value" title={puesto || ""}>{puesto || <em className="field-empty">Sin asignar</em>}</span>
      </div>
    </>);
  }

  const lista = catalogo || [];
  const delArea = lista.find(a => a.nombre === area);
  const puestos = delArea?.puestos || [];
  // Un valor viejo capturado a mano (fuera del catálogo) se sigue mostrando
  // como opción para no borrarlo sin querer; al cambiarlo ya solo hay catálogo.
  const fueraArea = area && !delArea;
  const fueraPuesto = puesto && !puestos.includes(puesto);
  return (<>
    <div className="field-row">
      <label className="field-label" htmlFor="rl-area">Área</label>
      <select id="rl-area" className="field-input" value={area || ""} disabled={!catalogo}
        onChange={e => { handleRHChange("Departamento", e.target.value); handleRHChange("Puesto", ""); }}>
        <option value="">{catalogo ? "Elige un área" : "Cargando…"}</option>
        {fueraArea && <option value={area}>{area} (fuera del catálogo)</option>}
        {lista.map(a => <option key={a.nombre} value={a.nombre}>{a.nombre}</option>)}
      </select>
      {errores.Departamento && <span className="field-error">{errores.Departamento}</span>}
    </div>
    <div className="field-row">
      <label className="field-label" htmlFor="rl-puesto">Puesto</label>
      <select id="rl-puesto" className="field-input" value={puesto || ""} disabled={!area}
        onChange={e => handleRHChange("Puesto", e.target.value)}>
        <option value="">{!area ? "Primero elige el área" : puestos.length ? "Elige un puesto" : "Esta área aún no tiene puestos"}</option>
        {fueraPuesto && <option value={puesto}>{puesto} (fuera del catálogo)</option>}
        {puestos.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {errores.Puesto
        ? <span className="field-error">{errores.Puesto}</span>
        : area && !puestos.length && catalogo && <span className="field-hint">Agrégalos en Configuración → Áreas.</span>}
    </div>
  </>);
};

const FieldGroup = ({ titulo, children }) => (
  <div className="field-group">
    <p className="field-group-title">{titulo}</p>
    <div className="horario-grid">{children}</div>
  </div>
);

export const LaboralRenderer = ({ isEditing, puedeEditar, esPropio, RH, handleRHChange, listaEmpleados = [], openRHPicker, empleadoEncontrado, errores = {}, nssClinico = "" }) => {
  const h = RH?.HorarioLaboral ?? {};
  const jefeSeleccionado = listaEmpleados.find(e => e._id === RH?.JefeInmediato_id);
  const nombreJefe = jefeSeleccionado
    ? `${jefeSeleccionado.Nombre} ${jefeSeleccionado.ApelPaterno}`
    : RH?.JefeInmediato || "";
  const pdfResuelto = resolveRawPDF(RH?.ExpedienteDigitalPDF);
  const antiguedad = calcularAntiguedad(RH?.FechaIngreso);
  const contrato = TIPOS_CONTRATO.find(t => t.value === (RH?.tipo_contrato || "")) || TIPOS_CONTRATO[0];
  const upper = (campo) => (v) => handleRHChange(campo, v.toUpperCase());

  return (
    <div className="section-inner">
      <h3 className="section-title">Información laboral</h3>
      {!puedeEditar && <LockNote seccion={esPropio ? "laboral" : undefined} />}

      {antiguedad?.esAniversarioHoy && (
        <div className="rl-aniversario" role="status">
          <FiGift aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Hoy cumple {antiguedad.anios} {antiguedad.anios === 1 ? "año" : "años"} en la empresa
        </div>
      )}

      <FieldGroup titulo="Puesto">
        <PuestoArea isEditing={isEditing} area={RH?.Departamento} puesto={RH?.Puesto}
          handleRHChange={handleRHChange} errores={errores} />
        <div className="field-row">
          <span className="field-label">Jefe inmediato</span>
          {isEditing ? (
            <select className="field-input" value={RH?.JefeInmediato_id || ""} onChange={e => {
              const emp = listaEmpleados.find(x => x._id === e.target.value);
              handleRHChange("JefeInmediato_id", e.target.value);
              handleRHChange("JefeInmediato", emp ? `${emp.Nombre} ${emp.ApelPaterno}` : "");
            }}>
              <option value="">Sin jefe asignado</option>
              {listaEmpleados.filter(e => e._id !== empleadoEncontrado?._id).map(e => (
                <option key={e._id} value={e._id}>{e.Nombre} {e.ApelPaterno}{e.Puesto ? ` · ${e.Puesto}` : ""}</option>
              ))}
            </select>
          ) : <span className="field-value" title={nombreJefe}>{nombreJefe || <em className="field-empty">Sin asignar</em>}</span>}
        </div>
        <Field label="Fecha de ingreso" value={RH?.FechaIngreso} isEditing={isEditing} onChange={v => handleRHChange("FechaIngreso", v)} type="date" />
        <div className="field-row">
          <span className="field-label">Antigüedad</span>
          <span className="field-value">
            {antiguedad ? `${antiguedad.anios} ${antiguedad.anios === 1 ? "año" : "años"}` : <em className="field-empty">Falta la fecha de ingreso</em>}
          </span>
        </div>
        <Field label="Núm. de empleado" value={RH?.NumeroEmpleado} isEditing={isEditing} onChange={v => handleRHChange("NumeroEmpleado", v)} />
        <div className="field-row">
          <span className="field-label">Régimen</span>
          {isEditing ? (
            <select className="field-input" value={RH?.TipoRelacionLaboral || "nomina"} onChange={e => handleRHChange("TipoRelacionLaboral", e.target.value)}>
              {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          ) : <span className="field-value">{regimenLabel(RH?.TipoRelacionLaboral)}</span>}
        </div>
        <div className="field-row">
          <span className="field-label">Contrato</span>
          {isEditing ? (
            <select className="field-input" value={RH?.tipo_contrato || ""} onChange={e => handleRHChange("tipo_contrato", e.target.value)}>
              {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          ) : <span className="field-value">{contrato.label}</span>}
        </div>
      </FieldGroup>

      <FieldGroup titulo="Horario">
        <Field label="Entrada" value={h.HoraEntrada} isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.HoraEntrada", v)} type="time" />
        <Field label="Salida" value={h.HoraSalida} isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.HoraSalida", v)} type="time" />
        <Field label="Tiempo de comida" value={h.TiempoComida} isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.TiempoComida", v)} placeholder="Ej. 1 hora" />
        <Field label="Días laborales" value={h.DiasTrabajados} isEditing={isEditing} onChange={v => handleRHChange("HorarioLaboral.DiasTrabajados", v)} placeholder="Ej. Lunes a viernes" />
      </FieldGroup>

      <FieldGroup titulo="Identificación oficial">
        <Field label="CURP" value={RH?.CURP} isEditing={isEditing} onChange={upper("CURP")} placeholder="18 caracteres" maxLength={18} error={errores.CURP} mono />
        <Field label="RFC" value={RH?.RFC} isEditing={isEditing} onChange={upper("RFC")} placeholder="13 caracteres, con homoclave" maxLength={13} error={errores.RFC} mono />
        <Field label="NSS (IMSS)" value={RH?.NSS || (isEditing ? "" : nssClinico)} isEditing={isEditing} onChange={v => handleRHChange("NSS", v.replace(/\D/g, ""))} placeholder="11 dígitos" maxLength={11} inputMode="numeric" error={errores.NSS} mono />
        <Field label="Nacionalidad" value={RH?.Nacionalidad} isEditing={isEditing} onChange={v => handleRHChange("Nacionalidad", v)} />
        <Field label="Estado civil" value={RH?.EstadoCivil} isEditing={isEditing} onChange={v => handleRHChange("EstadoCivil", v)} />
      </FieldGroup>

      <CustomFieldsBlock
        campos={RH?.CamposPersonalizados || {}}
        isEditing={isEditing}
        onChange={campos => handleRHChange("CamposPersonalizados", campos)}
      />

      {isEditing && (
        <button className="btn-ghost" onClick={openRHPicker}>
          <FiPaperclip aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {pdfResuelto ? "Reemplazar expediente digital" : "Subir expediente digital (PDF)"}
        </button>
      )}
      {pdfResuelto && <PDFAttachment raw={pdfResuelto} label="Expediente digital RH" />}
    </div>
  );
};

// ── Compensación ────────────────────────────────────────────────────────────
// RH captura el SALARIO DIARIO (base legal en México). De él salen:
//   - mensual  = diario × 30.4 (365/12)
//   - SDI      = diario × factor de integración; el factor mínimo de ley es
//                1 + (15 días de aguinaldo + días de vacaciones × 25% de
//                prima) / 365, con los días de vacaciones según antigüedad
//                (art. 76 LFT, reforma 2023). Si la empresa da prestaciones
//                superiores, RH ajusta el SDI a mano.
const DIAS_MES = 30.4;
function diasVacacionesLFT(anios) {
  const a = Math.max(1, anios || 0);
  if (a <= 5) return 10 + a * 2;            // 12, 14, 16, 18, 20
  return 22 + Math.floor((a - 6) / 5) * 2;   // 6–10: 22, 11–15: 24, …
}
export function sdiSugerido(diario, anios) {
  const d = Number(diario) || 0;
  if (!d) return "";
  const factor = 1 + (15 + diasVacacionesLFT(anios) * 0.25) / 365;
  return (Math.round(d * factor * 100) / 100).toFixed(2);
}
const dinero = (v) => {
  const n = Number(v);
  return n > 0 ? `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
};

const MoneyValue = ({ label, value, nota }) => (
  <div className="field-row">
    <span className="field-label">{label}</span>
    <span className="field-value field-value--num">{dinero(value) || <em className="field-empty">Sin registrar</em>}</span>
    {nota && <span className="field-hint">{nota}</span>}
  </div>
);

// Periodicidad de pago de cada empleado y los días que cubre cada periodo.
export const PERIODICIDADES = [
  { id: "semanal",    label: "Semanal",    dias: 7 },
  { id: "catorcenal", label: "Catorcenal", dias: 14 },
  { id: "quincenal",  label: "Quincenal",  dias: DIAS_MES / 2 },
  { id: "mensual",    label: "Mensual",    dias: DIAS_MES },
];

// Banco que corresponde a la CLABE capturada (lo dice el backend).
function useBancoDeClabe(clabe) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!/^\d{18}$/.test(clabe || "")) { setInfo(null); return undefined; }
    let vivo = true;
    apiFetch(`/bancos?clabe=${clabe}`).then(r => vivo && setInfo(r)).catch(() => vivo && setInfo(null));
    return () => { vivo = false; };
  }, [clabe]);
  return info;
}

export const CompensacionRenderer = ({ isEditing, puedeEditar, esPropio, RH, handleRHChange, errores = {}, empleadoId, mostrarPrestamos }) => {
  const esHonorarios = RH?.TipoRelacionLaboral === "prestador_servicios";
  const anios = calcularAntiguedad(RH?.FechaIngreso)?.anios ?? 0;
  const mensualCalc = Number(RH?.SalarioDiario) > 0 ? (Number(RH.SalarioDiario) * DIAS_MES).toFixed(2) : "";
  const sugerido = sdiSugerido(RH?.SalarioDiario, anios);
  const periodicidad = PERIODICIDADES.find(p => p.id === (RH?.PeriodicidadPago || "quincenal")) || PERIODICIDADES[2];
  const sdiManual = !!RH?.SDI_manual;
  const bancoClabe = useBancoDeClabe(RH?.CLABE);

  const cambiarDiario = (v) => {
    const limpio = v.replace(/[^\d.]/g, "");
    handleRHChange("SalarioDiario", limpio);
    handleRHChange("Salario", Number(limpio) > 0 ? (Number(limpio) * DIAS_MES).toFixed(2) : "");
  };

  return (
    <div className="section-inner">
      <h3 className="section-title">Compensación</h3>
      {!puedeEditar && <LockNote seccion={esPropio ? "compensacion" : undefined}>{esPropio ? "Lo define RH. Solo tú, RH y nómina pueden verlo." : "Lo define Recursos Humanos."}</LockNote>}

      <FieldGroup titulo={esHonorarios ? "Honorarios" : "Salario"}>
        {esHonorarios ? (
          isEditing
            ? <Field label="Monto acordado por servicio" value={RH?.Salario} isEditing onChange={v => handleRHChange("Salario", v.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0.00" />
            : <MoneyValue label="Monto acordado por servicio" value={RH?.Salario} />
        ) : isEditing ? (
          <>
            <Field label="Salario diario" value={RH?.SalarioDiario} isEditing onChange={cambiarDiario} inputMode="decimal" placeholder="0.00"
              hint="Base de cálculo. El mensual se calcula solo." />
            <MoneyValue label="Salario mensual" value={mensualCalc || RH?.Salario} nota="Diario × 30.4" />
            <div className="field-row">
              <label className="field-label" htmlFor="campo-periodicidad">Periodicidad de pago</label>
              <select id="campo-periodicidad" className="field-input" value={periodicidad.id} onChange={e => handleRHChange("PeriodicidadPago", e.target.value)}>
                {PERIODICIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              {errores.PeriodicidadPago && <span className="field-error">{errores.PeriodicidadPago}</span>}
            </div>
            <div className="field-row">
              <span className="field-label">Salario diario integrado (SDI)</span>
              {sdiManual ? (
                <input id="campo-sdi" aria-label="Salario diario integrado" className="field-input field-input--num" inputMode="decimal" value={RH?.SalarioDiarioIntegrado || ""} placeholder={sugerido || "0.00"}
                  onChange={e => handleRHChange("SalarioDiarioIntegrado", e.target.value.replace(/[^\d.]/g, ""))} />
              ) : (
                <span className="field-value field-value--num">{dinero(RH?.SalarioDiarioIntegrado) || (sugerido ? `≈ $${sugerido}` : <em className="field-empty">Captura el salario diario</em>)}</span>
              )}
              <span className="field-hint">
                {sdiManual ? "Fijado a mano." : "Se calcula al guardar: diario × factor de integración (aguinaldo, vacaciones por antigüedad y prima vacacional de la empresa)."}
              </span>
              {errores.SalarioDiarioIntegrado && <span className="field-error">{errores.SalarioDiarioIntegrado}</span>}
              <label className="nom-check">
                <input type="checkbox" checked={sdiManual} onChange={e => handleRHChange("SDI_manual", e.target.checked)} />
                Fijar el SDI a mano (prestaciones superiores a la ley)
              </label>
            </div>
            {sdiManual && (
              <Field label="Motivo del SDI manual" value={RH?.SDI_motivo} isEditing onChange={v => handleRHChange("SDI_motivo", v)}
                placeholder="Ej. 30 días de aguinaldo por contrato" error={errores.SDI_motivo} />
            )}
          </>
        ) : (
          <>
            <MoneyValue label="Salario diario" value={RH?.SalarioDiario} />
            <MoneyValue label="Salario mensual" value={RH?.Salario} />
            <MoneyValue label={`Salario ${periodicidad.label.toLowerCase()} (periodicidad de pago)`}
              value={Number(RH?.SalarioDiario) > 0 ? Number(RH.SalarioDiario) * periodicidad.dias : Number(RH?.Salario) * periodicidad.dias / DIAS_MES} />
            <MoneyValue label="Salario diario integrado (SDI)" value={RH?.SalarioDiarioIntegrado}
              nota={RH?.SDI_manual ? `Fijado a mano: ${RH.SDI_motivo || "sin motivo"}` : RH?.SDI_factor ? `Factor de integración ${RH.SDI_factor}` : undefined} />
          </>
        )}
      </FieldGroup>

      <FieldGroup titulo="Datos bancarios">
        <Field label="Banco" value={RH?.Banco} isEditing={isEditing} onChange={v => handleRHChange("Banco", v)} placeholder="Ej. BBVA" error={errores.Banco}
          hint={isEditing && bancoClabe?.banco && !RH?.Banco ? `Según la CLABE: ${bancoClabe.banco}` : undefined} />
        <Field label="CLABE" value={RH?.CLABE} isEditing={isEditing} onChange={v => handleRHChange("CLABE", v.replace(/\D/g, ""))} placeholder="18 dígitos" maxLength={18} inputMode="numeric"
          error={errores.CLABE || (isEditing ? bancoClabe?.error : undefined)}
          hint={isEditing && bancoClabe && !bancoClabe.error ? (bancoClabe.banco ? `CLABE válida de ${bancoClabe.banco}` : "CLABE válida") : undefined} mono />
        <Field label="Número de cuenta" value={RH?.CuentaBancaria} isEditing={isEditing} onChange={v => handleRHChange("CuentaBancaria", v.replace(/\D/g, ""))} maxLength={18} inputMode="numeric" error={errores.CuentaBancaria} mono />
      </FieldGroup>

      {mostrarPrestamos && (
        <>
          <div className="section-divider" />
          <PrestamosRenderer empleadoId={empleadoId} puedeVer modoEdicion={isEditing} />
        </>
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
      <IconButton icon={FiFileText} tone="edit" size="lg" label="Exportar CV como PDF" tooltipPos="right" onClick={handlePrint} />
    </div>
  );
};
// ── FinancialSectionRenderer — nómina o CFDI según TipoRelacionLaboral ───────
// Autónomo: carga y guarda directo contra la API (no pasa por el flujo de
// "Guardar cambios" del resto del perfil, cada documento se sube al vuelo).
const MESES = [
  "01","02","03","04","05","06","07","08","09","10","11","12",
];

const formatPeriodoLargo = (p) => {
  if (!p || !/^\d{4}-\d{2}$/.test(p)) return p || "—";
  const [y, m] = p.split("-");
  const nombres = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${nombres[Number(m) - 1] || m} ${y}`;
};

// eslint-disable-next-line no-unused-vars
const formatPeriodo = (p) => {
  if (!p || !/^\d{4}-\d{2}$/.test(p)) return p || "—";
  const [y, m] = p.split("-");
  const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const idx = MESES.indexOf(m);
  return idx >= 0 ? `${nombres[idx]} ${y}` : p;
};

// Tarjetas cortas agrupadas por año, con filtro por año y mes. El Spotlight
// puede mandar aquí con ?periodo=AAAA-MM: se filtra a ese mes y la tarjeta se
// resalta.
export const FinancialSectionRenderer = ({ empleadoId, tipoRelacionLaboral, isOwnProfile, periodoInicial, modoEdicion = false }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const [monto, setMonto] = useState("");
  const [anio, setAnio] = useState(() => (periodoInicial ? periodoInicial.slice(0, 4) : "todos"));
  const [mes, setMes] = useState(() => (periodoInicial ? periodoInicial.slice(5, 7) : "todos"));
  const [viendo, setViendo] = useState(null);

  // Llegar desde el Spotlight con otro ?periodo= estando ya en esta pestaña.
  useEffect(() => {
    if (!periodoInicial) return;
    setAnio(periodoInicial.slice(0, 4)); setMes(periodoInicial.slice(5, 7));
  }, [periodoInicial]);

  const isAdmin = authService.isAdmin();
  const isContador = authService.getRole() === "CONTADOR";
  const esNomina = tipoRelacionLaboral !== "prestador_servicios";
  // Quién sube: nómina → RH o contador; facturas → el propio empleado (o RH).
  const puedeSubir = esNomina ? (isAdmin || isContador) : (isOwnProfile || isAdmin);
  const puedeVer = isOwnProfile || isAdmin || isContador;

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
    if (!periodo || filesContent.length === 0) { setError("Elige el mes y adjunta el PDF."); return; }
    setError(""); setSubiendo(true);
    try {
      await documentosFinancierosService.create({
        empleado_id: empleadoId, tipo: esNomina ? "nomina" : "cfdi", periodo,
        monto: monto || undefined, archivo_pdf: filesContent[0].content, nombre_archivo: filesContent[0].name,
      });
      setPeriodo(""); setMonto(""); clear(); setMostrarForm(false);
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo subir el documento.");
    } finally {
      setSubiendo(false);
    }
  };

  const marcarPagado = async (docId) => {
    try { await documentosFinancierosService.updateEstado(docId, "pagado"); cargar(); }
    catch (e) { setError(e.message || "No se pudo actualizar el estado."); }
  };
  const eliminar = async (d) => {
    if (!(await confirmar(`¿Eliminar el documento de ${formatPeriodoLargo(d.periodo)}?`))) return;
    try { await documentosFinancierosService.delete(d._id); cargar(); }
    catch (e) { setError(e.message || "No se pudo eliminar el documento."); }
  };

  if (!puedeVer) return null;

  const anios = [...new Set(docs.map(d => String(d.periodo || "").slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);
  const filtrados = docs
    .filter(d => anio === "todos" || String(d.periodo).startsWith(anio))
    .filter(d => mes === "todos" || String(d.periodo).slice(5, 7) === mes)
    .sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)));
  const porAnio = filtrados.reduce((acc, d) => { const y = String(d.periodo).slice(0, 4) || "—"; (acc[y] = acc[y] || []).push(d); return acc; }, {});
  const titulo = esNomina ? "Recibos de nómina" : "Facturas (CFDI)";

  return (
    <div className="section-inner">
      {viendo && <PDFViewer pdf={{ ...normalizePDF(viendo.archivo_pdf), name: viendo.nombre_archivo || "documento.pdf" }}
        label={`${titulo} · ${formatPeriodoLargo(viendo.periodo)}`} onClose={() => setViendo(null)} />}

      <div className="rc-section-head">
        <h3 className="section-title">{titulo}</h3>
        {puedeSubir && modoEdicion && !mostrarForm && (
          <IconButton accion="agregar" label={esNomina ? "Subir recibo de nómina" : "Subir factura"} onClick={() => setMostrarForm(true)} tooltipPos="left" />
        )}
      </div>

      <Modal abierto={mostrarForm} onClose={() => { setMostrarForm(false); setError(""); clear(); }}
        titulo={esNomina ? "Subir recibo de nómina" : "Subir factura"} onGuardar={subir} guardando={subiendo}
        labelGuardar="Guardar documento" error={error} puedeGuardar={!!(periodo && filesContent.length)}>
        <>
          <div className="horario-grid">
            <div className="field-row">
              <label className="field-label" htmlFor="doc-periodo">Mes</label>
              <input id="doc-periodo" className="field-input" type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
            </div>
            {!esNomina && (
              <div className="field-row">
                <label className="field-label" htmlFor="doc-monto">Monto (opcional)</label>
                <input id="doc-monto" className="field-input" type="text" inputMode="decimal" value={monto} placeholder="Ej. 12500.00" onChange={e => setMonto(e.target.value)} />
              </div>
            )}
          </div>
          <button type="button" className="rc-file" onClick={openFilePicker}>
            <FiPaperclip aria-hidden="true" />
            <span>{filesContent.length > 0 ? filesContent[0].name : "Elegir PDF (máx. 8 MB)"}</span>
          </button>
        </>
      </Modal>

      {loading ? (
        <div className="rc-grid rc-grid--docs">{[0, 1, 2, 3].map(i => <div key={i} className="mo-skeleton" style={{ height: 84, borderRadius: 16 }} />)}</div>
      ) : docs.length === 0 ? (
        <p className="rc-empty">{esNomina ? "Aún no hay recibos de nómina." : "Aún no has subido facturas."}</p>
      ) : (
        <>
          <div className="rc-filtros">
            <div className="rc-chips" role="group" aria-label="Filtrar por año">
              {["todos", ...anios].map(y => (
                <button key={y} type="button" className={`rc-chip${anio === y ? " is-on" : ""}`} aria-pressed={anio === y} onClick={() => setAnio(y)}>
                  {y === "todos" ? "Todos" : y}
                </button>
              ))}
            </div>
            <select className="rc-select" value={mes} onChange={e => setMes(e.target.value)} aria-label="Filtrar por mes">
              <option value="todos">Todos los meses</option>
              {MESES.map((m, i) => <option key={m} value={m}>{MESES_LARGO[i][0].toUpperCase() + MESES_LARGO[i].slice(1)}</option>)}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <p className="rc-empty">No hay documentos con ese filtro.</p>
          ) : Object.keys(porAnio).sort((a, b) => b - a).map(y => (
            <section key={y} className="rc-year">
              <h4 className="rc-year-title">{y}<span>{porAnio[y].length}</span></h4>
              <div className="rc-grid rc-grid--docs mo-stagger">
                {porAnio[y].map(d => {
                  const mIdx = Number(String(d.periodo).slice(5, 7)) - 1;
                  const pagado = d.estado === "pagado";
                  return (
                    <RecordCard key={d._id} tono={esNomina ? "accent" : (pagado ? "success" : "warning")}
                      resaltada={periodoInicial && d.periodo === periodoInicial}
                      onClick={() => setViendo(d)}
                      tile={<FiFileText />}
                      titulo={MESES_LARGO[mIdx] ? MESES_LARGO[mIdx][0].toUpperCase() + MESES_LARGO[mIdx].slice(1) : d.periodo}
                      badge={!esNomina && <span className={`rc-badge rc-badge--${pagado ? "success" : "warning"}`}>{pagado ? "Pagada" : "Pendiente"}</span>}
                      meta={<>{d.monto && <span>${Number(d.monto).toLocaleString("es-MX")}</span>}<span className="rc-meta-trunc" title={d.nombre_archivo}>{d.nombre_archivo || "PDF"}</span></>}
                      acciones={<>
                        {modoEdicion && isAdmin && !esNomina && !pagado && (
                          <IconButton icon={FiCheck} size="sm" tone="edit" label="Marcar como pagada" tooltipPos="left" onClick={() => marcarPagado(d._id)} />
                        )}
                        {modoEdicion && (isAdmin || (isOwnProfile && !esNomina && !pagado)) && (
                          <IconButton accion="eliminar" size="sm" label="Eliminar documento" tooltipPos="left" onClick={() => eliminar(d)} />
                        )}
                      </>}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </>
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

// ── Tarjetas de registro (vacaciones, recibos) ──────────────────────────────
// Mismo lenguaje que las tarjetas de alumnos de Bristol (RecordCard): un
// distintivo de color a la izquierda, título + estado, una línea de datos y
// las acciones como íconos a la derecha. Cortas y escaneables, en cuadrícula,
// en vez de filas que cruzan toda la pantalla.
const MESES_LARGO = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MESES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

const parseFecha = (f) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f || "");
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
};
const rangoLegible = (ini, fin) => {
  const a = parseFecha(ini), b = parseFecha(fin);
  if (!a || !b) return `${ini || ""} – ${fin || ""}`;
  if (a.y === b.y && a.m === b.m) return a.d === b.d ? `${a.d} ${MESES_CORTO[a.m]} ${a.y}` : `${a.d}–${b.d} ${MESES_CORTO[a.m]} ${a.y}`;
  if (a.y === b.y) return `${a.d} ${MESES_CORTO[a.m]} – ${b.d} ${MESES_CORTO[b.m]} ${a.y}`;
  return `${a.d} ${MESES_CORTO[a.m]} ${a.y} – ${b.d} ${MESES_CORTO[b.m]} ${b.y}`;
};

export { RecordCard };

const ESTADO_VAC = {
  pendiente: { label: "Pendiente", tono: "warning" },
  aprobada:  { label: "Aprobada",  tono: "success" },
  rechazada: { label: "Rechazada", tono: "danger" },
};
// Doble visto bueno: qué falta para que una solicitud pendiente quede aprobada.
const faltan = (sol) => {
  if (sol.estado !== "pendiente" || !sol.aprobaciones) return "";
  return [["jefe", "jefe directo"], ["rh", "RH"]]
    .filter(([k]) => sol.aprobaciones[k]?.estado === "pendiente").map(([, t]) => t).join(" y ");
};

// ── VacacionesRenderer — saldo, solicitudes en tarjetas, nueva solicitud ────
export const VacacionesRenderer = ({ empleadoId, isOwnProfile, puedeVer = isOwnProfile, modoEdicion = false }) => {
  const [balance, setBalance] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [fInicio, setFInicio] = useState("");
  const [fFin, setFFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("todas");

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
    if (!fInicio || !fFin) { setError("Elige la fecha de inicio y de fin."); return; }
    if (fFin < fInicio) { setError("La fecha de fin no puede ser antes del inicio."); return; }
    setError(""); setEnviando(true);
    try {
      await vacacionesService.crear({ fecha_inicio: fInicio, fecha_fin: fFin, motivo });
      setFInicio(""); setFFin(""); setMotivo(""); setMostrarForm(false);
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo enviar la solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  if (!puedeVer) return null;

  const ordenadas = [...solicitudes].sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)));
  const conteo = ordenadas.reduce((acc, s) => { acc[s.estado] = (acc[s.estado] || 0) + 1; return acc; }, {});
  const visibles = filtro === "todas" ? ordenadas : ordenadas.filter(s => s.estado === filtro);
  const porAnio = visibles.reduce((acc, s) => {
    const y = parseFecha(s.fecha_inicio)?.y || "Sin fecha";
    (acc[y] = acc[y] || []).push(s); return acc;
  }, {});

  return (
    <div className="section-inner">
      <div className="rc-section-head">
        <h3 className="section-title">Vacaciones</h3>
        {isOwnProfile && modoEdicion && !mostrarForm && (
          <IconButton accion="agregar" label="Solicitar vacaciones" onClick={() => setMostrarForm(true)} tooltipPos="left" />
        )}
      </div>

      {loading ? (
        <div className="rc-grid">{[0, 1, 2].map(i => <div key={i} className="mo-skeleton" style={{ height: 84, borderRadius: 16 }} />)}</div>
      ) : (
        <>
          {balance && balance.antiguedad_anios !== null ? (
            <div className="rc-stats">
              <div className="rc-stat rc-stat--accent"><span className="rc-stat-num">{balance.dias_disponibles}</span><span className="rc-stat-lbl">Días disponibles</span></div>
              <div className="rc-stat"><span className="rc-stat-num">{balance.dias_usados_anio}</span><span className="rc-stat-lbl">Usados este año</span></div>
              <div className="rc-stat"><span className="rc-stat-num">{balance.dias_totales_anio}</span><span className="rc-stat-lbl">Le tocan este año</span></div>
            </div>
          ) : (
            <p className="field-hint" style={{ marginBottom: 14 }}>{balance?.mensaje || "Falta la fecha de ingreso para calcular el saldo; RH la registra."}</p>
          )}

          <Modal abierto={mostrarForm} onClose={() => { setMostrarForm(false); setError(""); }} titulo="Solicitar vacaciones"
            subtitulo={balance?.dias_disponibles != null ? `Tienes ${balance.dias_disponibles} días disponibles.` : undefined}
            onGuardar={solicitar} guardando={enviando} labelGuardar="Enviar solicitud" iconGuardar={FiSend} error={error}
            puedeGuardar={!!(fInicio && fFin)}>
            <>
              <div className="horario-grid">
                <div className="field-row">
                  <label className="field-label" htmlFor="vac-del">Del</label>
                  <input id="vac-del" className="field-input" type="date" value={fInicio} onChange={e => setFInicio(e.target.value)} />
                </div>
                <div className="field-row">
                  <label className="field-label" htmlFor="vac-al">Al</label>
                  <input id="vac-al" className="field-input" type="date" min={fInicio || undefined} value={fFin} onChange={e => setFFin(e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <label className="field-label" htmlFor="vac-motivo">Motivo (opcional)</label>
                <input id="vac-motivo" className="field-input" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. viaje familiar" />
              </div>
            </>
          </Modal>

          {ordenadas.length > 0 && (
            <div className="rc-chips" role="group" aria-label="Filtrar solicitudes">
              {["todas", "pendiente", "aprobada", "rechazada"].filter(k => k === "todas" || conteo[k]).map(k => (
                <button key={k} type="button" className={`rc-chip${filtro === k ? " is-on" : ""}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
                  {k === "todas" ? "Todas" : ESTADO_VAC[k].label}<span>{k === "todas" ? ordenadas.length : conteo[k]}</span>
                </button>
              ))}
            </div>
          )}

          {ordenadas.length === 0 ? (
            <p className="rc-empty">{isOwnProfile ? "Aún no has pedido vacaciones. Para solicitarlas, toca el lápiz de editar y luego +." : "Sin solicitudes de vacaciones."}</p>
          ) : Object.keys(porAnio).sort((a, b) => b - a).map(y => (
            <section key={y} className="rc-year">
              <h4 className="rc-year-title">{y}</h4>
              <div className="rc-grid mo-stagger">
                {porAnio[y].map(s => {
                  const ini = parseFecha(s.fecha_inicio);
                  const est = ESTADO_VAC[s.estado] || { label: s.estado, tono: "accent" };
                  return (
                    <RecordCard key={s._id} tono={est.tono}
                      tile={<><span className="rc-tile-big">{ini?.d ?? "—"}</span><span className="rc-tile-small">{ini ? MESES_CORTO[ini.m] : ""}</span></>}
                      titulo={rangoLegible(s.fecha_inicio, s.fecha_fin)}
                      badge={<span className={`rc-badge rc-badge--${est.tono}`}>{est.label}</span>}
                      meta={<><span>{s.dias_solicitados} {Number(s.dias_solicitados) === 1 ? "día" : "días"}</span>{faltan(s) ? <span>Falta: {faltan(s)}</span> : s.motivo && <span className="rc-meta-trunc" title={s.motivo}>{s.motivo}</span>}</>}
                      acciones={s.estado === "aprobada" && (
                        <IconButton icon={FiCalendar} size="sm" label="Agregar a mi calendario" tooltipPos="left"
                          onClick={() => descargarIcs(`/vacaciones/${s._id}/ics`, `vacaciones-${s.fecha_inicio}.ics`)} />
                      )}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
};

// ── PrestamosRenderer — backend ya existía, solo faltaba esta UI ────────────
export const PrestamosRenderer = ({ empleadoId, puedeVer, modoEdicion = false }) => {
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

  const pesos = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="section-inner">
      <div className="rc-section-head">
        <h3 className="section-title">Préstamos</h3>
        {isAdmin && modoEdicion && <IconButton accion="agregar" label="Registrar préstamo" tooltipPos="left" onClick={() => { setError(""); setMostrarForm(true); }} />}
      </div>

      {loading ? (
        <div className="rc-grid">{[0, 1].map(i => <div key={i} className="mo-skeleton" style={{ height: 84, borderRadius: 16 }} />)}</div>
      ) : prestamos.length === 0 ? (
        <p className="rc-empty">Sin préstamos registrados.</p>
      ) : (
        <div className="rc-grid mo-stagger">
          {prestamos.map(p => {
            const liquidado = Number(p.MontoPendiente) <= 0;
            return (
              <RecordCard key={p._id} tono={liquidado ? "success" : "warning"} tile={<FiDollarSign />}
                titulo={pesos(p.MontoPrestamo)}
                badge={<span className={`rc-badge rc-badge--${liquidado ? "success" : "warning"}`}>{liquidado ? "Liquidado" : "Activo"}</span>}
                meta={<>
                  <span>{p.PlazoMeses} meses · {pesos(p.CuotaMensual)}/mes</span>
                  <span>Pendiente {pesos(p.MontoPendiente)}</span>
                  <span>{p.PagosRealizados} pagos</span>
                </>}
              />
            );
          })}
        </div>
      )}

      <Modal abierto={mostrarForm} onClose={() => setMostrarForm(false)} titulo="Registrar préstamo"
        subtitulo={Number(monto) && Number(plazo) ? `Cuota estimada: ${pesos((Number(monto) * (1 + (Number(tasa) || 0) / 100)) / Number(plazo))} al mes` : undefined}
        onGuardar={crear} guardando={guardando} labelGuardar="Guardar préstamo" error={error} puedeGuardar={!!(Number(monto) && Number(plazo))}>
        <div className="field-grid">
          <Field label="Monto" value={monto} isEditing inputMode="decimal" placeholder="10000" onChange={v => setMonto(v.replace(/[^\d.]/g, ""))} />
          <Field label="Interés anual (%)" value={tasa} isEditing inputMode="decimal" onChange={v => setTasa(v.replace(/[^\d.]/g, ""))} />
          <Field label="Plazo (meses)" value={plazo} isEditing inputMode="numeric" onChange={v => setPlazo(v.replace(/\D/g, ""))} />
          <Field label="Método de pago" value={metodo} isEditing onChange={setMetodo} />
        </div>
      </Modal>
    </div>
  );
};
