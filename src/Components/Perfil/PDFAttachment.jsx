import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePDF(raw) {
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return { dataUrl: first.content || first, name: first.name || "documento.pdf" };
  }
  if (typeof raw === "string") {
    if (raw.startsWith("data:")) return { dataUrl: raw, name: "documento.pdf" };
    return { dataUrl: `data:application/pdf;base64,${raw}`, name: "documento.pdf" };
  }
  if (raw?.content) return { dataUrl: raw.content, name: raw.name || "documento.pdf" };
  return null;
}

function fileSizeLabel(dataUrl) {
  try {
    const base64 = dataUrl.split(",")[1] || dataUrl;
    const bytes  = Math.round((base64.length * 3) / 4);
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch { return "PDF"; }
}

// ─── PDFViewer montado en document.body via portal ────────────────────────────
function PDFViewer({ pdf, onClose, label }) {
  const [loading, setLoading] = useState(true);

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
    a.href = pdf.dataUrl; a.download = pdf.name; a.click();
  };

  return createPortal(
    <div
      className="pdf-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="pdf-window">

        {/* Barra título estilo macOS */}
        <div className="pdf-titlebar">
          <span className="pdf-title">{pdf.name}</span>
          <div className="pdf-toolbar-actions">
            <button className="pdf-action-btn" onClick={handleDownload}>⬇ Descargar</button>
            <button className="pdf-close-btn" onClick={onClose} title="Cerrar">✕</button>
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
    </div>,
    document.body   // ← montado fuera de cualquier contenedor
  );
}

// ─── PDFAttachment — badge + visor ───────────────────────────────────────────
export function PDFAttachment({ raw, label = "Documento adjunto" }) {
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
        <PDFViewer pdf={pdf} label={label} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export default PDFAttachment;