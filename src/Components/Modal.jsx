// src/Components/Modal.jsx
// Ventana emergente única del sistema para crear o editar un registro
// (habilidad, experiencia, contacto, vacante, ciclo…). La isla de la pantalla
// solo MUESTRA; todo lo que se captura pasa aquí, y al guardar el registro
// aparece en su isla. Escape o clic afuera cierran; el foco queda atrapado
// dentro mientras está abierta y regresa al botón que la abrió.
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";
import IconButton from "./IconButton";
import "./Modal.css";

const EASE = [0.16, 1, 0.3, 1];

export default function Modal({
  abierto, onClose, titulo, subtitulo, children, onGuardar, guardando = false,
  labelGuardar = "Guardar", iconGuardar, puedeGuardar = true, ancho = 560, error,
}) {
  const ref = useRef(null);
  const volverA = useRef(null);
  const cerrarRef = useRef(onClose);
  cerrarRef.current = onClose;

  useEffect(() => {
    if (!abierto) return;
    volverA.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); cerrarRef.current?.(); }
      if (e.key === "Tab" && ref.current) {
        const lista = [...ref.current.querySelectorAll("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])")]
          .filter(el => !el.disabled && el.offsetParent !== null);
        if (!lista.length) return;
        const primero = lista[0], ultimo = lista[lista.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const primero = ref.current?.querySelector(".mdl-body input, .mdl-body select, .mdl-body textarea, .mdl-body button");
      (primero || ref.current)?.focus();
    }, 80);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      setTimeout(() => volverA.current?.focus?.(), 30);
    };
  }, [abierto]);

  const enviar = (e) => { e.preventDefault(); if (puedeGuardar && !guardando) onGuardar?.(); };

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div className="mdl-overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <motion.form ref={ref} className="mdl-dialog" role="dialog" aria-modal="true" aria-label={titulo}
            tabIndex={-1} onSubmit={enviar} style={{ width: `min(${ancho}px, 100%)` }}
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.4, ease: EASE }}>
            <header className="mdl-head">
              <div className="mdl-head-text">
                <h3 className="mdl-title">{titulo}</h3>
                {subtitulo && <p className="mdl-sub">{subtitulo}</p>}
              </div>
              <button type="button" className="mdl-close" onClick={onClose} aria-label="Cerrar"><FiX /></button>
            </header>
            <div className="mdl-body">{children}</div>
            {(onGuardar || error) && (
              <footer className="mdl-foot">
                {error ? <p className="field-error" role="alert">{error}</p> : <span />}
                {onGuardar && (
                  <div className="icon-btn-group">
                    <IconButton accion="cancelar" label="Cancelar" onClick={onClose} />
                    <IconButton accion="guardar" type="submit" icon={iconGuardar} size="lg" label={labelGuardar}
                      busy={guardando} disabled={!puedeGuardar} tooltipPos="left" />
                  </div>
                )}
              </footer>
            )}
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
