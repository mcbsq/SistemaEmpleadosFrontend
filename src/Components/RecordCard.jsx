// src/Components/RecordCard.jsx
// Tarjeta de registro del sistema (vacaciones, recibos, solicitudes, nómina,
// expedientes…): distintivo de color a la izquierda, título + estado, una
// línea de datos y acciones como íconos — el mismo lenguaje que las tarjetas
// de alumnos de Bristol.
import React from "react";

export const RecordCard = ({ tile, tono = "accent", titulo, badge, meta, acciones, resaltada, onClick }) => (
  <article className={`rc-card rc-card--${tono}${resaltada ? " rc-card--resaltada" : ""}${onClick ? " rc-card--click" : ""}`}
    onClick={onClick} tabIndex={onClick ? 0 : undefined} role={onClick ? "button" : undefined}
    onKeyDown={onClick ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }) : undefined}>
    <div className="rc-tile" aria-hidden="true">{tile}</div>
    <div className="rc-body">
      <div className="rc-head">
        <p className="rc-title" title={typeof titulo === "string" ? titulo : undefined}>{titulo}</p>
        {badge}
      </div>
      {meta && <div className="rc-meta">{meta}</div>}
    </div>
    {acciones && <div className="rc-actions" onClick={e => e.stopPropagation()}>{acciones}</div>}
  </article>
);
