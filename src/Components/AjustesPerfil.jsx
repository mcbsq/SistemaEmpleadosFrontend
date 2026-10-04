// src/Components/AjustesPerfil.jsx
// "Ajustes de perfil" — lo que cada persona decide sobre SÍ MISMA, en un solo
// lugar y a un clic desde cualquier pantalla (avatar de la barra lateral o
// botón del propio perfil), como en una red social:
//   Perfil       → foto, nombre con el que te conocen, frase de presentación
//   Seguridad    → cambiar contraseña
//   Preferencias → tema claro/oscuro y animaciones
// El nombre legal, puesto, sueldo, etc. NO están aquí: son de RH.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiX, FiUser, FiLock, FiSliders, FiCamera, FiCheck, FiEye, FiEyeOff,
  FiMoon, FiSun, FiZap, FiAlertCircle, FiUploadCloud,
} from "react-icons/fi";
import { authService } from "../services/authService";
import { perfilService, ABRIR_AJUSTES, PERFIL_ACTUALIZADO } from "../services/perfilService";
import { useTheme } from "../context/ThemeContext";
import IconButton from "./IconButton";
import "./AjustesPerfil.css";

const SECCIONES = [
  { id: "perfil",       label: "Perfil",       icon: FiUser },
  { id: "seguridad",    label: "Seguridad",    icon: FiLock },
  { id: "preferencias", label: "Preferencias", icon: FiSliders },
];

const EASE = [0.16, 1, 0.3, 1];

// Recorta al centro en cuadrado y reduce a 512 px: una foto de celular de
// 4 MB queda en ~60 KB, carga al instante en el carrusel y el organigrama.
function prepararFoto(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      reject(new Error("Usa una imagen JPG, PNG o WebP."));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const destino = Math.min(512, lado);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = destino;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, destino, destino);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    img.src = url;
  });
}

const Avatar = ({ src, nombre, size = 112 }) => (
  <span className="ap-avatar" style={{ width: size, height: size }}>
    {src ? <img src={src} alt="" /> : <span className="ap-avatar__inicial">{(nombre || "?").trim()[0]?.toUpperCase()}</span>}
  </span>
);

// ── Sección: Perfil ─────────────────────────────────────────────────────────
function SeccionPerfil({ empleadoId, onGuardado }) {
  const [cargando, setCargando] = useState(true);
  const [legal, setLegal] = useState("");
  const [foto, setFoto] = useState(null);
  const [fotoOriginal, setFotoOriginal] = useState(null);
  const [nombre, setNombre] = useState("");
  const [titular, setTitular] = useState("");
  const [inicial, setInicial] = useState({ nombre: "", titular: "" });
  const [estado, setEstado] = useState(null); // guardando | ok | error
  const [error, setError] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!empleadoId) { setCargando(false); return; }
    perfilService.getPublico(empleadoId).then(p => {
      const f = p.Fotografias?.[0] || null;
      setFoto(f); setFotoOriginal(f);
      setLegal(`${p.Nombre || ""} ${p.ApelPaterno || ""}`.trim());
      setNombre(p.NombrePreferido || ""); setTitular(p.Titular || "");
      setInicial({ nombre: p.NombrePreferido || "", titular: p.Titular || "" });
    }).catch(() => setError("No se pudo cargar tu perfil.")).finally(() => setCargando(false));
  }, [empleadoId]);

  const elegir = async (file) => {
    if (!file) return;
    setError("");
    try { setFoto(await prepararFoto(file)); }
    catch (e) { setError(e.message); }
  };

  const hayCambios = foto !== fotoOriginal || nombre.trim() !== inicial.nombre || titular.trim() !== inicial.titular;

  const guardar = async () => {
    setEstado("guardando"); setError("");
    const datos = { NombrePreferido: nombre, Titular: titular };
    if (foto !== fotoOriginal) datos.Fotografia = foto || "";
    try {
      await perfilService.updateAjustes(empleadoId, datos);
      setFotoOriginal(foto);
      setInicial({ nombre: nombre.trim(), titular: titular.trim() });
      setEstado("ok");
      onGuardado?.();
      window.dispatchEvent(new CustomEvent(PERFIL_ACTUALIZADO, { detail: { empleadoId } }));
      setTimeout(() => setEstado(s => (s === "ok" ? null : s)), 2200);
    } catch (e) {
      setEstado("error");
      setError(e.campos ? Object.values(e.campos)[0] : (e.message || "No se pudo guardar."));
    }
  };

  if (!empleadoId) return (
    <p className="ap-aviso"><FiAlertCircle aria-hidden="true" />Tu cuenta no está ligada a un expediente de empleado, así que no tiene foto ni perfil público. Puedes cambiar tu contraseña y tus preferencias.</p>
  );
  if (cargando) return (
    <div className="ap-perfil">
      <div className="ap-foto"><span className="mo-skeleton" style={{ width: 112, height: 112, borderRadius: "50%" }} /></div>
      <div className="mo-skeleton" style={{ height: 44 }} /><div className="mo-skeleton" style={{ height: 44 }} />
    </div>
  );

  return (
    <div className="ap-perfil">
      <div
        className={`ap-foto${arrastrando ? " ap-foto--drop" : ""}`}
        onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={e => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files?.[0]); }}
      >
        <motion.div key={foto || "sin-foto"} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45, ease: EASE }}>
          <Avatar src={foto} nombre={nombre || legal} />
        </motion.div>
        <div className="ap-foto__acciones">
          <IconButton icon={FiCamera} tone="edit" label={foto ? "Cambiar foto" : "Subir foto"} onClick={() => inputRef.current?.click()} />
          {foto && <IconButton accion="eliminar" label="Quitar foto" onClick={() => setFoto(null)} />}
          <span className="ap-hint"><FiUploadCloud aria-hidden="true" />O arrastra una imagen aquí. Se recorta en cuadrado.</span>
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <label className="ap-field">
        <span className="ap-field__label">Nombre para mostrar</span>
        <input type="text" value={nombre} maxLength={60} placeholder={legal || "¿Cómo te dicen?"} onChange={e => setNombre(e.target.value)} />
        <span className="ap-hint">Así te verán tus compañeros. Tu nombre legal{legal ? ` (${legal})` : ""} lo administra RH.</span>
      </label>

      <label className="ap-field">
        <span className="ap-field__label">Sobre ti, en una línea</span>
        <input type="text" value={titular} maxLength={120} placeholder="Ej. Desarrollo frontend · fan del café" onChange={e => setTitular(e.target.value)} />
        <span className="ap-hint ap-hint--split"><span>Aparece debajo de tu nombre.</span><span className="ap-count">{titular.length}/120</span></span>
      </label>

      {error && <p className="ap-error" role="alert"><FiAlertCircle aria-hidden="true" />{error}</p>}

      <div className="ap-footer">
        <AnimatePresence>
          {estado === "ok" && (
            <motion.span className="ap-ok" role="status" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <FiCheck aria-hidden="true" />Guardado
            </motion.span>
          )}
        </AnimatePresence>
        <IconButton accion="guardar" size="lg" label="Guardar cambios" tooltipPos="left"
          disabled={!hayCambios} busy={estado === "guardando"} onClick={guardar} />
      </div>
    </div>
  );
}

// ── Sección: Seguridad ──────────────────────────────────────────────────────
function CampoClave({ label, value, onChange, autoComplete }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="ap-field">
      <span className="ap-field__label">{label}</span>
      <span className="ap-clave">
        <input type={ver ? "text" : "password"} value={value} autoComplete={autoComplete} onChange={e => onChange(e.target.value)} />
        <button type="button" className="ap-clave__ojo" onClick={() => setVer(v => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>
          {ver ? <FiEyeOff /> : <FiEye />}
        </button>
      </span>
    </label>
  );
}

function SeccionSeguridad() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirma, setConfirma] = useState("");
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState("");

  const reglas = [
    { ok: nueva.length >= 12, texto: "Al menos 12 caracteres" },
    { ok: /[A-Za-z]/.test(nueva) && /\d/.test(nueva), texto: "Letras y números" },
    { ok: nueva.length > 0 && nueva === confirma, texto: "Las dos contraseñas coinciden" },
    { ok: nueva.length > 0 && nueva !== actual, texto: "Distinta a la actual" },
  ];
  const valida = actual && reglas.every(r => r.ok);

  const guardar = async (e) => {
    e.preventDefault();
    if (!valida) return;
    setEstado("guardando"); setError("");
    try {
      await authService.changePassword(actual, nueva);
      setEstado("ok"); setActual(""); setNueva(""); setConfirma("");
    } catch (err) {
      setEstado("error"); setError(err.message || "No se pudo cambiar la contraseña.");
    }
  };

  return (
    <form className="ap-seguridad" onSubmit={guardar}>
      <CampoClave label="Contraseña actual" value={actual} onChange={setActual} autoComplete="current-password" />
      <CampoClave label="Nueva contraseña" value={nueva} onChange={setNueva} autoComplete="new-password" />
      <CampoClave label="Repite la nueva contraseña" value={confirma} onChange={setConfirma} autoComplete="new-password" />
      <ul className="ap-reglas" aria-label="Requisitos de la contraseña">
        {reglas.map(r => (
          <li key={r.texto} className={r.ok ? "is-ok" : ""}>
            <span className="ap-reglas__dot">{r.ok && <FiCheck aria-hidden="true" />}</span>{r.texto}
          </li>
        ))}
      </ul>
      {error && <p className="ap-error" role="alert"><FiAlertCircle aria-hidden="true" />{error}</p>}
      {estado === "ok" && <p className="ap-ok ap-ok--block" role="status"><FiCheck aria-hidden="true" />Listo. Usa tu nueva contraseña la próxima vez que entres.</p>}
      <div className="ap-footer">
        <IconButton accion="guardar" type="submit" size="lg" label="Cambiar contraseña" tooltipPos="left"
          disabled={!valida} busy={estado === "guardando"} />
      </div>
    </form>
  );
}

// ── Sección: Preferencias ───────────────────────────────────────────────────
function Opcion({ activa, onClick, icon: Icon, titulo, desc, children }) {
  return (
    <button type="button" className={`ap-opcion${activa ? " ap-opcion--activa" : ""}`} aria-pressed={activa} onClick={onClick}>
      {children}
      <span className="ap-opcion__titulo"><Icon aria-hidden="true" />{titulo}</span>
      <span className="ap-opcion__desc">{desc}</span>
      {activa && <motion.span layoutId="ap-opcion-check" className="ap-opcion__check"><FiCheck /></motion.span>}
    </button>
  );
}

function SeccionPreferencias() {
  const { theme, setTheme, motion: mov, setMotion } = useTheme();
  return (
    <div className="ap-prefs">
      <p className="ap-grupo">Tema</p>
      <div className="ap-opciones">
        <Opcion activa={theme === "dark"} onClick={() => setTheme("dark")} icon={FiMoon} titulo="Oscuro" desc="Descansa la vista en ambientes con poca luz.">
          <span className="ap-preview ap-preview--dark"><i /><i /><i /></span>
        </Opcion>
        <Opcion activa={theme === "light"} onClick={() => setTheme("light")} icon={FiSun} titulo="Claro" desc="Más contraste en oficinas iluminadas.">
          <span className="ap-preview ap-preview--light"><i /><i /><i /></span>
        </Opcion>
      </div>
      <p className="ap-grupo">Animaciones</p>
      <label className="ap-switch">
        <span>
          <span className="ap-switch__titulo"><FiZap aria-hidden="true" />Animaciones completas</span>
          <span className="ap-opcion__desc">Fondo en movimiento y transiciones. Apágalas si te marean o tu equipo va lento.</span>
        </span>
        <input type="checkbox" role="switch" checked={mov === "full"} onChange={e => setMotion(e.target.checked ? "full" : "reduced")} />
        <span className="ap-switch__track" aria-hidden="true"><span className="ap-switch__thumb" /></span>
      </label>
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
export default function AjustesPerfil() {
  const [abierto, setAbierto] = useState(false);
  const [seccion, setSeccion] = useState("perfil");
  const dialogRef = useRef(null);
  const volverA = useRef(null);
  const empleadoId = authService.getEmpleadoId();

  useEffect(() => {
    const abrir = (e) => {
      volverA.current = document.activeElement;
      setSeccion(e.detail?.seccion || "perfil");
      setAbierto(true);
    };
    window.addEventListener(ABRIR_AJUSTES, abrir);
    return () => window.removeEventListener(ABRIR_AJUSTES, abrir);
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setTimeout(() => volverA.current?.focus?.(), 50);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll("button, input, [href], select, textarea");
        const lista = [...f].filter(el => !el.disabled && el.offsetParent !== null);
        if (!lista.length) return;
        const [primero, ultimo] = [lista[0], lista[lista.length - 1]];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => dialogRef.current?.querySelector(".ap-nav button[aria-current='page']")?.focus(), 60);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [abierto, cerrar]);

  const actual = SECCIONES.find(s => s.id === seccion);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div className="ap-overlay" onMouseDown={e => e.target === e.currentTarget && cerrar()}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <motion.div ref={dialogRef} className="ap-dialog" role="dialog" aria-modal="true" aria-labelledby="ap-titulo"
            initial={{ opacity: 0, y: 28, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            exit={{ opacity: 0, y: 16, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease: EASE }}>
            <aside className="ap-side">
              <h2 id="ap-titulo" className="ap-titulo">Ajustes</h2>
              <nav className="ap-nav" aria-label="Secciones de ajustes">
                {SECCIONES.map(s => (
                  <button key={s.id} type="button" aria-current={seccion === s.id ? "page" : undefined}
                    className={seccion === s.id ? "is-activa" : ""} onClick={() => setSeccion(s.id)}>
                    {seccion === s.id && <motion.span layoutId="ap-nav-pill" className="ap-nav__pill" transition={{ duration: 0.4, ease: EASE }} />}
                    <s.icon aria-hidden="true" /><span>{s.label}</span>
                  </button>
                ))}
              </nav>
            </aside>
            <section className="ap-main">
              <header className="ap-main__head">
                <h3>{actual.label}</h3>
                <button type="button" className="ap-cerrar" onClick={cerrar} aria-label="Cerrar ajustes"><FiX /></button>
              </header>
              <AnimatePresence mode="wait">
                <motion.div key={seccion} className="ap-main__body"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, ease: EASE }}>
                  {seccion === "perfil" && <SeccionPerfil empleadoId={empleadoId} />}
                  {seccion === "seguridad" && <SeccionSeguridad />}
                  {seccion === "preferencias" && <SeccionPreferencias />}
                </motion.div>
              </AnimatePresence>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
