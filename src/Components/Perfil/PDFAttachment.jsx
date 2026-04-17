// PDFPreview.jsx — componente de vista previa estilo macOS Quick Look
// Se integra en renderpersonal.js reemplazando los badges de "📄 adjunto"

import React, { useState, useEffect, useRef } from "react";

// ─── Estilos inline para no depender de Personal.css ─────────────────────────
const styles = `
.pdf-badge-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 9px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--hr-text, #e2e2e2);
  transition: all 0.18s ease;
  font-family: inherit;
  width: 100%;
  text-align: left;
}
.pdf-badge-btn:hover {
  background: rgba(91,138,240,0.12);
  border-color: rgba(91,138,240,0.35);
  color: var(--hr-accent, #5B8AF0);
  transform: translateY(-1px);
}
.pdf-badge-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}
.pdf-badge-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.pdf-badge-hint {
  font-size: 0.72rem;
  opacity: 0.5;
}

/* ── Overlay backdrop ────────────────────────────────────────── */
.pdf-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: pdfFadeIn 0.2s ease both;
}
@keyframes pdfFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Ventana Quick Look ───────────────────────────────────────── */
.pdf-window {
  position: relative;
  width: min(820px, 92vw);
  height: min(88vh, 740px);
  background: #1c1c1e;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.08),
    0 32px 80px rgba(0,0,0,0.6),
    0 8px 24px rgba(0,0,0,0.4);
  animation: pdfSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes pdfSlideUp {
  from { transform: scale(0.94) translateY(20px); opacity: 0; }
  to   { transform: scale(1)    translateY(0);    opacity: 1; }
}

/* ── Barra de título estilo macOS ────────────────────────────── */
.pdf-titlebar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  user-select: none;
}
.pdf-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  transition: filter 0.15s;
}
.pdf-dot:hover { filter: brightness(1.3); }
.pdf-dot--close  { background: #ff5f57; }
.pdf-dot--min    { background: #febc2e; }
.pdf-dot--max    { background: #28c840; }
.pdf-title {
  flex: 1;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  margin-left: -36px; /* compensar dots */
}
.pdf-toolbar-actions {
  display: flex;
  gap: 6px;
}
.pdf-action-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  color: rgba(255,255,255,0.75);
  font-size: 0.78rem;
  padding: 5px 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 5px;
}
.pdf-action-btn:hover {
  background: rgba(91,138,240,0.2);
  border-color: rgba(91,138,240,0.4);
  color: #5B8AF0;
}

/* ── Cuerpo — iframe ─────────────────────────────────────────── */
.pdf-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #2a2a2c;
}
.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* ── Estado vacío ────────────────────────────────────────────── */
.pdf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: rgba(255,255,255,0.3);
}
.pdf-empty-icon { font-size: 4rem; opacity: 0.4; }
.pdf-empty-text { font-size: 0.95rem; }

/* ── Barra inferior ──────────────────────────────────────────── */
.pdf-footer {
  padding: 10px 16px;
  background: rgba(0,0,0,0.3);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
  flex-shrink: 0;
}

/* ── Spinner de carga ────────────────────────────────────────── */
.pdf-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #2a2a2c;
  color: rgba(255,255,255,0.4);
  font-size: 0.85rem;
}
.pdf-spinner {
  width: 32px; height: 32px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #5B8AF0;
  border-radius: 50%;
  animation: pdfSpin 0.8s linear infinite;
}
@keyframes pdfSpin { to { transform: rotate(360deg); } }
`;

// ─── Inyectar estilos una sola vez ────────────────────────────────────────────
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const tag = document.createElement("style");
  tag.textContent = styles;
  document.head.appendChild(tag);
  stylesInjected = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// El PDF puede llegar como:
//   · string base64 puro (sin prefijo)
//   · "data:application/pdf;base64,..." (data URL)
//   · array de objetos {content: "data:...", name: "..."}  (use-file-picker)
function normalizePDF(raw) {
  if (!raw) return null;

  // Array de use-file-picker
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return {
      dataUrl: first.content || first,
      name:    first.name || "documento.pdf",
    };
  }

  // String data URL
  if (typeof raw === "string") {
    if (raw.startsWith("data:")) {
      return { dataUrl: raw, name: "documento.pdf" };
    }
    // base64 puro — agregar prefijo
    return {
      dataUrl: `data:application/pdf;base64,${raw}`,
      name:    "documento.pdf",
    };
  }

  // Objeto {content, name}
  if (raw?.content) {
    return { dataUrl: raw.content, name: raw.name || "documento.pdf" };
  }

  return null;
}

function fileSizeLabel(dataUrl) {
  try {
    const base64 = dataUrl.split(",")[1] || dataUrl;
    const bytes  = Math.round((base64.length * 3) / 4);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return "PDF";
  }
}

// ─── PDFViewer — ventana Quick Look ──────────────────────────────────────────
function PDFViewer({ pdf, onClose, label }) {
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href     = pdf.dataUrl;
    a.download = pdf.name;
    a.click();
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div className="pdf-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="pdf-window">

        {/* Barra título macOS */}
        <div className="pdf-titlebar">
          <div className="pdf-dot pdf-dot--close"  onClick={onClose}   title="Cerrar" />
          <div className="pdf-dot pdf-dot--min"    title="Minimizar"   onClick={onClose} />
          <div className="pdf-dot pdf-dot--max"    title="Pantalla completa" />
          <span className="pdf-title">{pdf.name}</span>
          <div className="pdf-toolbar-actions">
            <button className="pdf-action-btn" onClick={handleDownload}>
              ⬇ Descargar
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="pdf-body">
          {loading && (
            <div className="pdf-loading">
              <div className="pdf-spinner" />
              <span>Cargando documento...</span>
            </div>
          )}
          <iframe
            className="pdf-iframe"
            src={pdf.dataUrl}
            title={label || "Documento PDF"}
            onLoad={() => setLoading(false)}
            style={{ opacity: loading ? 0 : 1, transition: "opacity 0.3s" }}
          />
        </div>

        {/* Pie */}
        <div className="pdf-footer">
          <span>{label || "Documento"}</span>
          <span>{fileSizeLabel(pdf.dataUrl)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── PDFAttachment — badge + visor ────────────────────────────────────────────
// Uso:
//   <PDFAttachment raw={expediente.PDFSegurodegastosmedicos} label="Póliza de seguro" />
export function PDFAttachment({ raw, label = "Documento adjunto" }) {
  injectStyles();
  const [open, setOpen] = useState(false);
  const pdf = normalizePDF(raw);

  if (!pdf) return null;

  return (
    <>
      <button className="pdf-badge-btn" onClick={() => setOpen(true)}>
        <span className="pdf-badge-icon">📄</span>
        <span className="pdf-badge-name">{pdf.name}</span>
        <span className="pdf-badge-hint">Vista previa</span>
      </button>

      {open && (
        <PDFViewer
          pdf={pdf}
          label={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default PDFAttachment;