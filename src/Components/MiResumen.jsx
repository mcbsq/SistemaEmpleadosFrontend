// src/Components/MiResumen.jsx
// "Mi resumen" — la analítica de un EMPLEADO es la suya, no la de la empresa
// (saber cuánta gente hay por área no le sirve de nada). Cada tarjeta responde
// una pregunta que sí se hace y lleva a donde puede actuar:
//   ¿Cuántos días de vacaciones me quedan?  ¿Cuánto llevo en la empresa?
//   ¿Tengo una evaluación pendiente?        ¿Qué me contestó RH?
//   ¿Ya está mi último recibo?              ¿Qué me falta llenar en mi perfil?
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSun, FiAward, FiInbox, FiFileText, FiUserCheck, FiClock, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import NumeroAnimado from "./NumeroAnimado";
import { authService } from "../services/authService";
import { apiFetch } from "../services/apiConfig";
import "./MiResumen.css";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const intentar = (p) => p.catch(() => null);

function antiguedad(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || "");
  if (!m) return null;
  const ingreso = new Date(+m[1], +m[2] - 1, +m[3]);
  const hoy = new Date();
  let meses = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + hoy.getMonth() - ingreso.getMonth();
  if (hoy.getDate() < ingreso.getDate()) meses -= 1;
  let prox = new Date(hoy.getFullYear(), ingreso.getMonth(), ingreso.getDate());
  if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, ingreso.getMonth(), ingreso.getDate());
  return { anios: Math.floor(meses / 12), meses: meses % 12, faltan: Math.ceil((prox - hoy) / 86400000) };
}

function Tarjeta({ icon: Icon, titulo, valor, sufijo, detalle, tono = "accent", onClick, accion }) {
  return (
    <button type="button" className={`mr-card mr-card--${tono}`} onClick={onClick}>
      <span className="mr-card-icon"><Icon aria-hidden="true" /></span>
      <span className="mr-card-titulo">{titulo}</span>
      <span className="mr-card-valor">{typeof valor === "number" ? <NumeroAnimado value={valor} /> : valor}{sufijo && <small>{sufijo}</small>}</span>
      {detalle && <span className="mr-card-detalle">{detalle}</span>}
      {accion && <span className="mr-card-accion">{accion}<FiArrowRight aria-hidden="true" /></span>}
    </button>
  );
}

export default function MiResumen() {
  const navigate = useNavigate();
  const id = authService.getEmpleadoId();
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!id) { setD({}); return; }
    Promise.all([
      intentar(apiFetch(`/vacaciones/balance/${id}`)),
      intentar(apiFetch(`/rh/${id}`)),
      intentar(apiFetch(`/desempeno/empleado/${id}/activa`)),
      intentar(apiFetch("/solicitudes-rh/mias")),
      intentar(apiFetch(`/documentosfinancieros/empleado/${id}`)),
      intentar(apiFetch(`/datoscontacto/empleado/${id}`)),
      intentar(apiFetch(`/personascontacto/empleado/${id}`)),
      intentar(apiFetch(`/direccion/empleado/${id}`)),
      intentar(apiFetch(`/expedienteclinico/empleado/${id}`)),
    ]).then(([bal, rh, evalua, sols, docs, dc, pc, dir, clin]) => {
      // Lo que SOLO el empleado puede llenar (lo de RH no cuenta en su contra).
      const faltan = [];
      if (!dc?.TelCelular) faltan.push({ txt: "Tu celular", tab: "personal" });
      if (!(Array.isArray(pc?.Contactos) && pc.Contactos.length)) faltan.push({ txt: "Un contacto de emergencia", tab: "personal" });
      if (!dir?.Calle) faltan.push({ txt: "Tu domicilio", tab: "personal" });
      if (!clin?.tipoSangre) faltan.push({ txt: "Tu tipo de sangre", tab: "salud" });
      setD({ bal, rh, evalua, sols: Array.isArray(sols) ? sols : [], docs: Array.isArray(docs) ? docs : [], faltan });
    });
  }, [id]);

  if (!id) return (
    <div className="mr-root"><p className="rc-empty">Tu cuenta no tiene expediente de empleado, así que no hay un resumen personal que mostrar.</p></div>
  );
  if (!d) return (
    <div className="mr-root"><div className="mr-grid">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="mo-skeleton" style={{ height: 150, borderRadius: 20 }} />)}</div></div>
  );

  const ant = antiguedad(d.rh?.FechaIngreso);
  const abiertas = d.sols.filter(s => ["abierta", "en_proceso"].includes(s.estado)).length;
  const conRespuesta = d.sols.filter(s => s.respuestas?.length).length;
  const recibos = d.docs.filter(x => /^\d{4}-\d{2}$/.test(x.periodo || "")).sort((a, b) => b.periodo.localeCompare(a.periodo));
  const ultimo = recibos[0];
  const ev = d.evalua && !d.evalua.error ? d.evalua : null;
  const evPendiente = ev && !ev.autoevaluacion?.completada;
  const totalPerfil = 4;
  const pctPerfil = Math.round(100 * (totalPerfil - d.faltan.length) / totalPerfil);
  const perfil = (tab) => navigate(`/Perfil/${id}?tab=${tab}`);

  return (
    <div className="mr-root">
      <header className="mr-head">
        <h2 className="hr-title">Mi resumen</h2>
        <p className="hr-subtitle">Lo tuyo, de un vistazo.</p>
      </header>
      <div className="mr-grid mo-stagger">
        <Tarjeta icon={FiSun} titulo="Vacaciones disponibles" tono="accent"
          valor={d.bal?.dias_disponibles ?? "—"} sufijo={d.bal?.dias_disponibles != null ? " días" : ""}
          detalle={d.bal?.dias_totales_anio != null ? `Usaste ${d.bal.dias_usados_anio} de ${d.bal.dias_totales_anio} este año` : "RH aún no registra tu fecha de ingreso"}
          accion="Ver mis vacaciones" onClick={() => perfil("vacaciones")} />
        <Tarjeta icon={FiClock} titulo="En la empresa" tono="success"
          valor={ant ? (ant.anios ? ant.anios : ant.meses) : "—"} sufijo={ant ? (ant.anios ? (ant.anios === 1 ? " año" : " años") : (ant.meses === 1 ? " mes" : " meses")) : ""}
          detalle={ant ? (ant.faltan <= 1 ? "¡Tu aniversario es hoy o mañana!" : `Faltan ${ant.faltan} días para tu aniversario`) : "Sin fecha de ingreso registrada"}
          accion="Ver información laboral" onClick={() => perfil("laboral")} />
        <Tarjeta icon={FiAward} titulo="Mi evaluación" tono={evPendiente ? "warning" : "accent"}
          valor={ev ? (evPendiente ? "Pendiente" : "Enviada") : "Sin ciclo"}
          detalle={ev ? `${ev.ciclo_nombre || "Ciclo en curso"}${ev.evaluacion_jefe?.completada ? ` · tu jefe te calificó ${ev.evaluacion_jefe.puntaje}/5` : ""}` : "No hay un ciclo de evaluación abierto"}
          accion={ev ? (evPendiente ? "Hacer mi autoevaluación" : "Ver mi evaluación") : undefined} onClick={() => navigate("/desempeno")} />
        <Tarjeta icon={FiInbox} titulo="Mis solicitudes a RH" tono={abiertas ? "warning" : "accent"}
          valor={abiertas} sufijo={abiertas === 1 ? " abierta" : " abiertas"}
          detalle={d.sols.length ? `${conRespuesta} con respuesta de RH · ${d.sols.length} en total` : "No has escrito a RH"}
          accion="Ver mis solicitudes" onClick={() => perfil("solicitudes")} />
        <Tarjeta icon={FiFileText} titulo="Último recibo" tono="accent"
          valor={ultimo ? MESES[Number(ultimo.periodo.slice(5, 7)) - 1] : "—"} sufijo={ultimo ? ` ${ultimo.periodo.slice(0, 4)}` : ""}
          detalle={recibos.length ? `${recibos.filter(x => x.periodo.startsWith(String(new Date().getFullYear()))).length} recibos este año` : "Aún no tienes recibos"}
          accion="Ver mis recibos" onClick={() => perfil("documentos")} />
        <Tarjeta icon={d.faltan.length ? FiUserCheck : FiCheckCircle} titulo="Mi perfil" tono={d.faltan.length ? "warning" : "success"}
          valor={pctPerfil} sufijo="%"
          detalle={d.faltan.length ? `Falta: ${d.faltan.map(f => f.txt.toLowerCase()).join(", ")}` : "Tienes todo lo que te toca llenar"}
          accion={d.faltan.length ? "Completar ahora" : "Ver mi perfil"} onClick={() => perfil(d.faltan[0]?.tab || "resumen")} />
      </div>
    </div>
  );
}
