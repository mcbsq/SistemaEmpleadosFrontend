// src/Components/CargaMasiva.jsx
// Fase 2 — alta de toda una plantilla de una sola vez desde Excel.
//   1. Descargar la plantilla (trae las áreas de la empresa en una lista).
//   2. Subir el archivo → vista previa: qué filas se crean, cuáles actualizan
//      y cuáles tienen errores (con el motivo exacto y la fila de Excel).
//   3. Importar SOLO las filas válidas. Las que fallan se descargan en un
//      Excel para corregirlas y volver a subirlas; las cuentas creadas (con su
//      contraseña temporal) también se pueden descargar para entregarlas.
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  FiUploadCloud, FiDownload, FiFileText, FiCheckCircle, FiAlertTriangle, FiAlertCircle,
  FiUserPlus, FiRefreshCw, FiKey, FiArrowLeft, FiUsers,
} from "react-icons/fi";
import IconButton from "./IconButton";
import { importacionService } from "../services/importacionService";
import "./CargaMasiva.css";

const ESTADOS = {
  ok:    { label: "Lista",       tono: "success", icon: FiCheckCircle },
  aviso: { label: "Con aviso",   tono: "warning", icon: FiAlertTriangle },
  error: { label: "Con errores", tono: "danger",  icon: FiAlertCircle },
};

const leerComoBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(new Error("No se pudo leer el archivo."));
  r.readAsDataURL(file);
});

const descargarXlsx = (filas, nombre, hoja) => {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  XLSX.writeFile(wb, nombre);
};

function Paso({ n, titulo, activo, hecho, children }) {
  return (
    <section className={`cm-paso${activo ? " is-activo" : ""}${hecho ? " is-hecho" : ""}`}>
      <header className="cm-paso-head">
        <span className="cm-paso-num">{hecho ? <FiCheckCircle aria-hidden="true" /> : n}</span>
        <h3>{titulo}</h3>
      </header>
      {children && <div className="cm-paso-body">{children}</div>}
    </section>
  );
}

export default function CargaMasiva() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);        // { nombre, b64 }
  const [crearCuentas, setCrearCuentas] = useState(false);
  const [validacion, setValidacion] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState("");        // "plantilla" | "validando" | "importando"
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [arrastrando, setArrastrando] = useState(false);

  const plantilla = async () => {
    setCargando("plantilla"); setError("");
    try { await importacionService.descargarPlantilla(); }
    catch (e) { setError(e.message); }
    finally { setCargando(""); }
  };

  const validarArchivo = async (file, conCuentas = crearCuentas) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { setError("Sube el archivo en formato Excel (.xlsx), a partir de la plantilla."); return; }
    setError(""); setResultado(null); setValidacion(null); setCargando("validando");
    try {
      const b64 = await leerComoBase64(file);
      setArchivo({ nombre: file.name, b64, file });
      setValidacion(await importacionService.validar(b64, conCuentas));
      setFiltro("todas");
    } catch (e) {
      setArchivo(null);
      setError(e.message || "No se pudo revisar el archivo.");
    } finally {
      setCargando("");
    }
  };

  const cambiarCuentas = (v) => {
    setCrearCuentas(v);
    if (archivo) validarArchivo(archivo.file, v);   // cambia qué se valida (correos duplicados)
  };

  const importar = async () => {
    setCargando("importando"); setError("");
    try {
      setResultado(await importacionService.confirmar(archivo.b64, crearCuentas));
    } catch (e) {
      setError(e.message || "No se pudo importar.");
    } finally {
      setCargando("");
    }
  };

  const reiniciar = () => { setArchivo(null); setValidacion(null); setResultado(null); setError(""); };

  const filas = useMemo(() => validacion?.filas || [], [validacion]);
  const visibles = useMemo(() => filas.filter(f => filtro === "todas" || f.estado === filtro), [filas, filtro]);
  const r = validacion?.resumen;
  const aImportar = r ? r.crear + r.actualizar : 0;

  const descargarErrores = (lista) => descargarXlsx(
    lista.map(f => ({
      "Fila en tu Excel": f.fila, "Número de empleado": f.numero_empleado, "Nombre": f.nombre,
      "Qué corregir": f.errores.map(e => e.mensaje).join(" · "),
    })), "filas-con-error.xlsx", "Corregir");

  const descargarCuentas = () => descargarXlsx(
    resultado.cuentas.map(c => ({
      Nombre: c.nombre, Usuario: c.usuario, Correo: c.email,
      "Contraseña temporal": c.email_enviado ? "(enviada por correo)" : (c.temp_password || ""),
    })), "cuentas-creadas.xlsx", "Cuentas");

  return (
    <div className="cm-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiUploadCloud style={{ marginRight: 8, verticalAlign: "-3px" }} />Carga masiva de empleados</h2>
          <p className="hr-subtitle">Da de alta o actualiza a toda tu plantilla desde un solo Excel.</p>
        </div>
        <IconButton icon={FiArrowLeft} label="Volver a Empleados" tooltipPos="left" onClick={() => navigate("/empleados")} />
      </div>

      {error && <p className="cm-error" role="alert"><FiAlertCircle aria-hidden="true" />{error}</p>}

      {resultado ? (
        <section className="cm-resultado">
          <FiCheckCircle className="cm-resultado-icon" aria-hidden="true" />
          <h3>Importación terminada</h3>
          <div className="cm-cifras">
            <div><strong>{resultado.creados}</strong><span>altas nuevas</span></div>
            <div><strong>{resultado.actualizados}</strong><span>actualizados</span></div>
            <div className={resultado.omitidos ? "is-mal" : ""}><strong>{resultado.omitidos}</strong><span>con errores (no se guardaron)</span></div>
            {crearCuentas && <div><strong>{resultado.cuentas.length}</strong><span>cuentas de acceso</span></div>}
          </div>
          {resultado.errores_cuentas.length > 0 && (
            <p className="cm-error"><FiAlertTriangle aria-hidden="true" />
              {resultado.errores_cuentas.length} cuentas no se pudieron crear: {resultado.errores_cuentas.slice(0, 3).map(e => `${e.nombre} (${e.error})`).join("; ")}
            </p>
          )}
          <div className="cm-acciones">
            {resultado.cuentas.length > 0 && (
              <IconButton icon={FiKey} size="lg" label="Descargar cuentas y contraseñas" onClick={descargarCuentas} />
            )}
            {resultado.filas_con_error.length > 0 && (
              <IconButton accion="descargar" size="lg" label="Descargar filas por corregir" onClick={() => descargarErrores(resultado.filas_con_error)} />
            )}
            <IconButton icon={FiUsers} tone="save" size="lg" label="Ver empleados" onClick={() => navigate("/empleados")} />
            <IconButton icon={FiUploadCloud} size="lg" label="Subir otro archivo" onClick={reiniciar} />
          </div>
          {resultado.cuentas.some(c => c.temp_password) && (
            <p className="cm-nota">Las contraseñas temporales solo se muestran ahora. Descárgalas y entrégalas; cada persona la cambia en su primer acceso.</p>
          )}
        </section>
      ) : (
        <div className="cm-pasos">
          <Paso n={1} titulo="Descarga la plantilla y llénala" activo={!archivo} hecho={!!archivo}>
            <p className="cm-texto">Una fila por persona. Obligatorios: número de empleado, nombre y apellido paterno. Si un número de empleado ya existe, esa fila lo <strong>actualiza</strong> y las celdas vacías no borran nada.</p>
            <button type="button" className="cm-btn" onClick={plantilla} disabled={cargando === "plantilla"}>
              <FiDownload aria-hidden="true" />{cargando === "plantilla" ? "Descargando…" : "Descargar plantilla"}
            </button>
          </Paso>

          <Paso n={2} titulo="Sube el archivo" activo={!validacion} hecho={!!validacion}>
            <button type="button"
              className={`cm-drop${arrastrando ? " is-drop" : ""}${archivo ? " is-lleno" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={e => { e.preventDefault(); setArrastrando(false); validarArchivo(e.dataTransfer.files?.[0]); }}>
              {cargando === "validando" ? (
                <><span className="cm-spinner" aria-hidden="true" /><span>Revisando cada fila…</span></>
              ) : archivo ? (
                <><FiFileText aria-hidden="true" /><span className="cm-drop-nombre">{archivo.nombre}</span><span className="cm-drop-sub">Clic para elegir otro</span></>
              ) : (
                <><FiUploadCloud aria-hidden="true" /><span>Arrastra aquí tu Excel o haz clic para elegirlo</span><span className="cm-drop-sub">.xlsx · máximo 5 MB</span></>
              )}
            </button>
            <input ref={inputRef} type="file" accept=".xlsx" hidden onChange={e => { validarArchivo(e.target.files?.[0]); e.target.value = ""; }} />
            <label className="ap-switch cm-switch">
              <span>
                <span className="ap-switch__titulo"><FiKey aria-hidden="true" />Crear cuentas de acceso</span>
                <span className="ap-opcion__desc">A las altas nuevas que tengan correo de trabajo. Podrás descargar sus contraseñas temporales al terminar.</span>
              </span>
              <input type="checkbox" role="switch" checked={crearCuentas} onChange={e => cambiarCuentas(e.target.checked)} />
              <span className="ap-switch__track" aria-hidden="true"><span className="ap-switch__thumb" /></span>
            </label>
          </Paso>

          {validacion && (
            <Paso n={3} titulo="Revisa y confirma" activo>
              <div className="cm-cifras">
                <div><strong>{r.total}</strong><span>filas en el archivo</span></div>
                <div className="is-bien"><strong>{r.crear}</strong><span>altas nuevas</span></div>
                <div><strong>{r.actualizar}</strong><span>se actualizan</span></div>
                <div className={r.con_errores ? "is-mal" : ""}><strong>{r.con_errores}</strong><span>con errores</span></div>
              </div>

              <div className="rc-filtros">
                <div className="rc-chips" role="group" aria-label="Filtrar filas">
                  {[["todas", "Todas", r.total], ["error", "Con errores", r.con_errores], ["aviso", "Con aviso", r.con_avisos], ["ok", "Listas", r.total - r.con_errores - r.con_avisos]]
                    .map(([k, label, n]) => (
                      <button key={k} type="button" className={`rc-chip${filtro === k ? " is-on" : ""}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
                        {label}<span>{n}</span>
                      </button>
                    ))}
                </div>
                {r.con_errores > 0 && (
                  <button type="button" className="link-btn" onClick={() => descargarErrores(filas.filter(f => f.estado === "error"))}>
                    Descargar lo que hay que corregir
                  </button>
                )}
              </div>

              <div className="cm-filas mo-stagger">
                {visibles.slice(0, 300).map(f => {
                  const est = ESTADOS[f.estado];
                  return (
                    <article key={f.fila} className={`cm-fila cm-fila--${est.tono}`}>
                      <span className="cm-fila-num" title="Fila en tu Excel">Fila {f.fila}</span>
                      <div className="cm-fila-main">
                        <div className="cm-fila-head">
                          <strong>{f.nombre || "Sin nombre"}</strong>
                          {f.numero_empleado && <span className="cm-fila-id">#{f.numero_empleado}</span>}
                          <span className={`rc-badge rc-badge--${est.tono}`}><est.icon aria-hidden="true" /> {est.label}</span>
                          {f.estado !== "error" && (
                            <span className="cm-accion">{f.accion === "crear" ? <><FiUserPlus aria-hidden="true" />Alta nueva</> : <><FiRefreshCw aria-hidden="true" />Actualiza</>}</span>
                          )}
                        </div>
                        {[...f.errores, ...f.avisos].length > 0 && (
                          <ul className="cm-motivos">
                            {f.errores.map((e, i) => <li key={`e${i}`} className="is-error">{e.mensaje}</li>)}
                            {f.avisos.map((e, i) => <li key={`a${i}`}>{e.mensaje}</li>)}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
                {visibles.length > 300 && <p className="rc-empty">Y {visibles.length - 300} filas más.</p>}
              </div>

              <div className="cm-confirmar">
                <p>{aImportar
                  ? <>Se guardarán <strong>{aImportar}</strong> {aImportar === 1 ? "persona" : "personas"}{r.con_errores ? <> · las <strong>{r.con_errores}</strong> con errores se omiten</> : null}.</>
                  : "No hay filas válidas para importar. Corrige el archivo y vuelve a subirlo."}</p>
                <IconButton accion="guardar" size="lg" label={`Importar ${aImportar} ${aImportar === 1 ? "persona" : "personas"}`}
                  tooltipPos="left" disabled={!aImportar} busy={cargando === "importando"} onClick={importar} />
              </div>
            </Paso>
          )}
        </div>
      )}
    </div>
  );
}
