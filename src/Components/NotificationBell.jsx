// src/Components/NotificationBell.jsx
// Centro de notificaciones DENTRO del sistema — complementa (no reemplaza)
// los correos que ya mandan módulos como vacaciones. Poll simple cada 30s;
// no hay websockets en este backend, así que esto es "casi tiempo real".
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiBell, FiX } from "react-icons/fi";
import { apiFetch } from "../services/apiConfig";
import "./NotificationBell.css";

const POLL_MS = 30000;

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  return `hace ${Math.floor(hr / 24)} d`;
}

function NotificationBell({ align = "right" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const cargarConteo = useCallback(async () => {
    const data = await apiFetch("/notificaciones/no-leidas/count").catch(() => null);
    if (data && typeof data.count === "number") setCount(data.count);
  }, []);

  const cargarLista = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/notificaciones").catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarConteo();
    const id = setInterval(cargarConteo, POLL_MS);
    return () => clearInterval(id);
  }, [cargarConteo]);

  useEffect(() => {
    if (open) cargarLista();
  }, [open, cargarLista]);

  // El panel ahora vive en un portal (ver render), así que "clic afuera" ya lo
  // resuelve el overlay de pantalla completa — no hace falta un listener global.

  const handleClickItem = async (notif) => {
    if (!notif.leida) {
      await apiFetch(`/notificaciones/${notif._id}/leer`, { method: "PATCH" }).catch(() => null);
      setItems(prev => prev.map(n => n._id === notif._id ? { ...n, leida: true } : n));
      setCount(c => Math.max(0, c - 1));
    }
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const handleMarcarTodas = async () => {
    await apiFetch("/notificaciones/leer-todas", { method: "PATCH" }).catch(() => null);
    setItems(prev => prev.map(n => ({ ...n, leida: true })));
    setCount(0);
  };

  return (
    <div className={`nb-wrap nb-wrap--${align}`} ref={wrapRef}>
      <button className="nb-bell-btn" onClick={() => setOpen(p => !p)} aria-label="Notificaciones">
        <span className="nb-bell-icon"><FiBell /></span>
        {count > 0 && <span className="nb-badge">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && createPortal(
        <>
          <div className="nb-overlay" onClick={() => setOpen(false)} />
          <div className="nb-panel">
            <div className="nb-panel-header">
              <span>Notificaciones</span>
              {count > 0 && (
                <button className="nb-mark-all" onClick={handleMarcarTodas}>Marcar todas leídas</button>
              )}
              <button className="nb-close-btn" onClick={() => setOpen(false)} aria-label="Cerrar">
                <FiX />
              </button>
            </div>
            <div className="nb-panel-body">
              {loading ? (
                <div className="nb-empty">Cargando…</div>
              ) : items.length === 0 ? (
                <div className="nb-empty">Sin notificaciones</div>
              ) : (
                items.map(n => (
                  <button
                    key={n._id}
                    className={`nb-item ${n.leida ? "" : "nb-item--unread"}`}
                    onClick={() => handleClickItem(n)}
                  >
                    <span className="nb-item-title">{n.titulo}</span>
                    <span className="nb-item-msg">{n.mensaje}</span>
                    <span className="nb-item-time">{timeAgo(n.creado_en)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default NotificationBell;
