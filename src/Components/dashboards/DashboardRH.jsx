// src/Components/dashboards/DashboardRH.jsx
// Panel de Recursos Humanos: lo que RH tiene que ATENDER hoy, no solo números.
//   Por atender      → solicitudes de empleados y vacaciones por aprobar.
//   Expedientes      → quién no tiene lo que nómina/IMSS necesitan (CURP, NSS…).
//   Esta semana      → quién está fuera, cumpleaños y aniversarios.
// Cada KPI y cada fila llevan al lugar donde se resuelve.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers, FiUserPlus, FiInbox, FiSun, FiUserX, FiClipboard, FiGift, FiAward, FiArrowRight, FiRefreshCw,
} from "react-icons/fi";
import NumeroAnimado from "../NumeroAnimado";
import IconButton from "../IconButton";
import Modal from "../Modal";
import { RecordCard } from "../RecordCard";
import { panelRhService } from "../../services/panelRhService";
import "./DashboardRH.css";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const corta = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : "";
};
const iniciales = (n = "") => n.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "?";

function Kpi({ icon: Icon, valor, etiqueta, tono = "accent", onClick, sufijo }) {
  return (
    <button type="button" className={`rhp-kpi rhp-kpi--${tono}`} onClick={onClick} disabled={!onClick}>
      <span className="rhp-kpi-icon"><Icon aria-hidden="true" /></span>
      <span className="rhp-kpi-num"><NumeroAnimado value={valor} />{sufijo}</span>
      <span className="rhp-kpi-lbl">{etiqueta}</span>
    </button>
  );
}

// Isla compacta: muestra solo lo más urgente (3) y el resto vive en un pop-up,
// para que las tres islas midan lo mismo sin importar cuántos registros haya.
const VISIBLES = 3;
function Bloque({ titulo, icono: Icon, items, render, vacio, resumen, subtituloModal }) {
  const [abierto, setAbierto] = useState(false);
  const total = items.length;
  return (
    <section className="rhp-bloque">
      <header className="rhp-bloque-head">
        <h3><Icon aria-hidden="true" />{titulo}</h3>
        {total > 0 && <span className="rhp-total">{total}</span>}
      </header>
      {resumen}
      {total === 0 ? <p className="rc-empty">{vacio}</p> : (
        <div className="rhp-lista mo-stagger">{items.slice(0, VISIBLES).map(render)}</div>
      )}
      {total > VISIBLES && (
        <button type="button" className="rhp-ver-todos" onClick={() => setAbierto(true)}>
          Ver {total === VISIBLES + 1 ? "1 más" : `los ${total}`}<FiArrowRight aria-hidden="true" />
        </button>
      )}
      <Modal abierto={abierto} onClose={() => setAbierto(false)} titulo={titulo} subtitulo={subtituloModal} ancho={640}>
        <div className="rhp-lista">{items.map(render)}</div>
      </Modal>
    </section>
  );
}

export default function DashboardRH() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null); // { titulo, subtitulo, items, render }

  const cargar = () => {
    setError("");
    panelRhService.get().then(setData).catch(e => setError(e.message || "No se pudo cargar el panel."));
  };
  useEffect(cargar, []);

  if (error) return (
    <div className="rhp-root"><p className="rc-empty" style={{ display: "flex", alignItems: "center", gap: 12 }}>{error} <IconButton accion="refrescar" label="Reintentar" onClick={cargar} /></p></div>
  );
  if (!data) return (
    <div className="rhp-root">
      <div className="rhp-kpis">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="mo-skeleton" style={{ height: 112, borderRadius: 18 }} />)}</div>
    </div>
  );

  const k = data.kpis;
  const porAtender = k.solicitudes_pendientes + k.vacaciones_por_aprobar;
  const semana = [
    ...data.fuera.map(f => ({ ...f, tipo: "fuera" })),
    ...data.eventos,
  ];
  const porAtenderItems = [
    ...data.solicitudes.map(x => ({ ...x, _tipo: "solicitud" })),
    ...data.vacaciones_por_aprobar.map(x => ({ ...x, _tipo: "vacaciones" })),
  ];
  const renderPorAtender = (s, i) => s._tipo === "solicitud" ? (
    <RecordCard key={`s${s._id}`} tono={s.estado === "abierta" ? "warning" : "accent"} onClick={() => navigate("/solicitudes")}
      tile={<span className="rc-tile-big">{iniciales(s.nombre)}</span>} titulo={s.nombre}
      badge={<span className={`rc-badge rc-badge--${s.estado === "abierta" ? "warning" : "success"}`}>{s.estado === "abierta" ? "Nueva" : "En proceso"}</span>}
      meta={<span className="rc-meta-trunc">{s.asunto}</span>} />
  ) : (
    <RecordCard key={`v${i}`} tono="warning" onClick={() => navigate("/vacaciones")}
      tile={<FiSun />} titulo={s.nombre} badge={<span className="rc-badge rc-badge--warning">Vacaciones</span>}
      meta={<span>{corta(s.fecha_inicio)} – {corta(s.fecha_fin)} · {s.dias} {Number(s.dias) === 1 ? "día" : "días"}</span>} />
  );
  const renderIncompleto = (p) => (
    <RecordCard key={p.empleado_id} tono={p.faltan.length > 3 ? "danger" : "warning"}
      onClick={() => navigate(`/Perfil/${p.empleado_id}?tab=laboral`)}
      tile={<span className="rc-tile-big">{iniciales(p.nombre)}</span>} titulo={p.nombre}
      meta={<span className="rhp-faltan">Falta: {p.faltan.slice(0, 3).join(", ")}{p.faltan.length > 3 ? ` y ${p.faltan.length - 3} más` : ""}</span>} />
  );
  const renderSemana = (e, i) => (
    <RecordCard key={i} tono={e.tipo === "fuera" ? "accent" : "success"} onClick={() => navigate(`/Perfil/${e.empleado_id}`)}
      tile={e.tipo === "fuera" ? <FiSun /> : e.tipo === "cumpleanos" ? <FiGift /> : <FiAward />}
      titulo={e.nombre}
      badge={e.tipo === "fuera" && e.hoy && <span className="rc-badge rc-badge--warning">Hoy</span>}
      meta={<span>{e.tipo === "fuera" ? `De vacaciones ${corta(e.fecha_inicio)} – ${corta(e.fecha_fin)}`
        : e.tipo === "cumpleanos" ? `Cumpleaños · ${corta(e.fecha)}`
        : `${e.anios} ${e.anios === 1 ? "año" : "años"} en la empresa · ${corta(e.fecha)}`}</span>} />
  );
  const hoy = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="rhp-root">
      <header className="rhp-head">
        <div>
          <p className="rhp-sub">{hoy.charAt(0).toUpperCase() + hoy.slice(1)} · {porAtender ? `${porAtender} ${porAtender === 1 ? "pendiente" : "pendientes"} por atender` : "Todo al día"}</p>
        </div>
        <IconButton icon={FiRefreshCw} label="Actualizar" tooltipPos="left" onClick={() => { setData(null); cargar(); }} />
      </header>

      <div className="rhp-kpis mo-stagger">
        <Kpi icon={FiUsers} valor={k.plantilla} etiqueta="Plantilla activa" onClick={() => navigate("/empleados")} />
        <Kpi icon={FiUserPlus} valor={k.altas_mes} etiqueta="Altas este mes" tono="success" />
        <Kpi icon={FiInbox} valor={k.solicitudes_pendientes} etiqueta="Solicitudes por atender" tono={k.solicitudes_pendientes ? "warning" : "accent"}
          onClick={() => setDetalle({ titulo: "Solicitudes por atender", items: porAtenderItems.filter(x => x._tipo === "solicitud"), render: renderPorAtender })} />
        <Kpi icon={FiSun} valor={k.vacaciones_por_aprobar} etiqueta="Vacaciones por aprobar" tono={k.vacaciones_por_aprobar ? "warning" : "accent"}
          onClick={() => setDetalle({ titulo: "Vacaciones por aprobar", items: porAtenderItems.filter(x => x._tipo === "vacaciones"), render: renderPorAtender })} />
        <Kpi icon={FiUserX} valor={k.fuera_hoy} etiqueta="Fuera hoy"
          onClick={() => setDetalle({ titulo: "Fuera hoy", items: data.fuera.filter(f => f.hoy).map(f => ({ ...f, tipo: "fuera" })), render: renderSemana })} />
        <Kpi icon={FiClipboard} valor={k.expedientes_completos_pct} sufijo="%" etiqueta="Expedientes al día"
          onClick={() => setDetalle({ titulo: "Expedientes por completar", subtitulo: "Toca una persona para completar su expediente.", items: data.incompletos, render: renderIncompleto })}
          tono={k.expedientes_completos_pct >= 90 ? "success" : k.expedientes_completos_pct >= 60 ? "warning" : "danger"} />
      </div>

      <Modal abierto={!!detalle} onClose={() => setDetalle(null)} titulo={detalle?.titulo || ""} subtitulo={detalle?.subtitulo} ancho={640}>
        {detalle && (detalle.items.length
          ? <div className="rhp-lista">{detalle.items.map(detalle.render)}</div>
          : <p className="rc-empty">Nada por aquí.</p>)}
      </Modal>

      <div className="rhp-grid">
        <Bloque titulo="Por atender" icono={FiInbox} items={porAtenderItems} render={renderPorAtender}
          vacio="Nada pendiente. Las solicitudes y vacaciones nuevas aparecerán aquí."
          subtituloModal="Solicitudes de empleados y vacaciones por aprobar." />
        <Bloque titulo="Expedientes por completar" icono={FiClipboard} items={data.incompletos} render={renderIncompleto}
          vacio="Todos los expedientes activos tienen lo necesario para nómina e IMSS."
          subtituloModal="Lo que le falta a cada persona para nómina e IMSS. Toca una para completar su expediente."
          resumen={(
            <div className="rhp-barra" role="img" aria-label={`${k.expedientes_completos_pct}% de expedientes completos`}>
              <div className="rhp-barra-track"><div className="rhp-barra-fill" style={{ width: `${k.expedientes_completos_pct}%` }} /></div>
              <span>{k.plantilla - k.expedientes_incompletos} de {k.plantilla} completos</span>
            </div>
          )} />
        <Bloque titulo="Esta semana" icono={FiGift} items={semana} render={renderSemana}
          vacio="Sin ausencias, cumpleaños ni aniversarios en los próximos 7 días." />
      </div>
    </div>
  );
}
