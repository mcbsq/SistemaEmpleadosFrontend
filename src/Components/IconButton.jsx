// src/Components/IconButton.jsx
// Botón de solo ícono para las acciones repetidas del sistema — agregar (+),
// editar (lápiz), guardar (disquete), cancelar (X), eliminar. El texto de la
// acción vive en el tooltip (hover o foco con teclado) y en aria-label, así
// que la interfaz queda limpia sin perder claridad ni accesibilidad.
import React from "react";
import { FiPlus, FiEdit2, FiSave, FiX, FiTrash2, FiLoader, FiArrowRight, FiArrowLeft, FiCheck, FiRefreshCw, FiDownload, FiCopy } from "react-icons/fi";

const PRESETS = {
  agregar:  { icon: FiPlus,   tone: "add" },
  editar:   { icon: FiEdit2,  tone: "edit" },
  guardar:  { icon: FiSave,   tone: "save" },
  cancelar: { icon: FiX,      tone: "neutral" },
  eliminar: { icon: FiTrash2, tone: "danger" },
  siguiente:  { icon: FiArrowRight, tone: "save" },
  anterior:   { icon: FiArrowLeft,  tone: "neutral" },
  volver:     { icon: FiArrowLeft,  tone: "neutral" },
  confirmar:  { icon: FiCheck,      tone: "save" },
  cerrar:     { icon: FiX,          tone: "neutral" },
  refrescar:  { icon: FiRefreshCw,  tone: "neutral" },
  descargar:  { icon: FiDownload,   tone: "neutral" },
  copiar:     { icon: FiCopy,       tone: "neutral" },
};

export default function IconButton({
  accion, icon, label, tone, size = "md", busy = false, tooltipPos = "top",
  className = "", type = "button", disabled, ...rest
}) {
  const preset = PRESETS[accion] || {};
  const Icon = icon || preset.icon || FiPlus;
  const t = tone || preset.tone || "neutral";
  return (
    <button
      type={type}
      className={`icon-btn icon-btn--${t} icon-btn--${size} ${className}`.trim()}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-pos={tooltipPos}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      {...rest}
    >
      {busy ? <FiLoader className="spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
    </button>
  );
}
