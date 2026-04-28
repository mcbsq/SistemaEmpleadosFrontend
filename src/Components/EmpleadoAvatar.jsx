import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CiFolderOn } from "react-icons/ci";

/**
 * EmpleadoAvatar
 * ──────────────────────────────────────────────────────────────
 * Props:
 *   empleadoId   string   — _id del empleado (para navegar al perfil)
 *   nombre       string   — Nombre completo (para tooltip y fallback)
 *   fotografias  array    — Fotografias[] tal como llega del backend
 *   foto         string   — URL directa (alternativa a fotografias[0])
 *   showSecret   bool     — true si el usuario tiene rol privilegiado
 *   onEdit       func     — callback para abrir modal de edición
 *   onDelete     func     — callback para confirmar borrado
 *   size         number   — diámetro del avatar en px (default 38)
 */
const EmpleadoAvatar = ({
  empleadoId,
  nombre      = "",
  fotografias = [],
  foto        = null,
  showSecret  = false,
  onEdit,
  onDelete,
  size        = 38,
}) => {
  const navigate    = useNavigate();
  const [tip, setTip]     = useState(false);
  const [secret, setSecret] = useState(false);
  const tipRef      = useRef(null);
  const secretRef   = useRef(null);

  // ── Resolver URL de imagen ────────────────────────────────────────────────
  // Prioridad: prop `foto` → fotografias[0] → fallback inicial
  const resolveImg = () => {
    if (foto) return foto;
    if (Array.isArray(fotografias) && fotografias.length > 0) {
      const first = fotografias[0];
      // Puede ser string directo o un objeto {content: "data:..."}
      if (typeof first === "string" && first.length > 0) return first;
      if (typeof first === "object" && first?.content)   return first.content;
    }
    return null;
  };
  const imgSrc = resolveImg();

  // ── Inicial fallback ──────────────────────────────────────────────────────
  const inicial    = (nombre.trim()[0] || "?").toUpperCase();
  const colors     = ["av-a", "av-b", "av-c", "av-d", "av-e"];
  const colorClass = colors[inicial.charCodeAt(0) % colors.length];

  // ── ID corto visible ──────────────────────────────────────────────────────
  const shortId = empleadoId ? empleadoId.slice(-8) : "—";

  // ── Cerrar secret al click fuera ──────────────────────────────────────────
  useEffect(() => {
    if (!secret) return;
    const handler = (e) => {
      if (secretRef.current && !secretRef.current.contains(e.target)) {
        setSecret(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [secret]);

  return (
    <div className="ea-wrap">
      {/* ── Foto con tooltip ──────────────────────────────────────────────── */}
      <div
        className="ea-photo-wrap"
        style={{ width: size, height: size }}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        onClick={() => empleadoId && navigate(`/Perfil/${empleadoId}`)}
        title=""
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={nombre}
            className="ea-photo"
            style={{ width: size, height: size }}
            onError={(e) => {
              // Si la URL falla, ocultar img y mostrar placeholder
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        {/* Placeholder siempre presente — se muestra si img falla o no hay foto */}
        <div
          className={`ea-placeholder ${colorClass}`}
          style={{
            width:   size,
            height:  size,
            fontSize: size * 0.4,
            display: imgSrc ? "none" : "flex",
          }}
        >
          {inicial}
        </div>

        {/* Tooltip */}
        {tip && (
          <div className="ea-tooltip" ref={tipRef}>
            <span className="ea-tip-name">{nombre || "—"}</span>
            <span className="ea-tip-id">ID: {shortId}</span>
          </div>
        )}
      </div>

      {/* ── Ícono SECRET (solo roles privilegiados) ───────────────────────── */}
      {showSecret && (
        <div className="ea-secret-wrap" ref={secretRef}>
          <button
            className="ea-secret-btn"
            title="Acciones protegidas"
            onClick={(e) => { e.stopPropagation(); setSecret(s => !s); }}
          >
            <CiFolderOn className="ea-secret-icon" />
            <span className="ea-secret-label">SECRET</span>
          </button>

          {secret && (
            <div className="ea-secret-menu">
              <div className="ea-secret-header">
                <CiFolderOn style={{ marginRight: 5 }} />
                Acceso restringido
              </div>
              {onEdit && (
                <button
                  className="ea-secret-action ea-secret-action--edit"
                  onClick={(e) => { e.stopPropagation(); setSecret(false); onEdit(); }}
                >
                  ✏️ Editar empleado
                </button>
              )}
              {onDelete && (
                <button
                  className="ea-secret-action ea-secret-action--delete"
                  onClick={(e) => { e.stopPropagation(); setSecret(false); onDelete(); }}
                >
                  🗑 Eliminar empleado
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmpleadoAvatar;