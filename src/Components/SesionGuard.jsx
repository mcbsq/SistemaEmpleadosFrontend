// src/Components/SesionGuard.jsx
// Sesión deslizante (pruebas TST, oct 2026). Antes el token duraba
// `sessionMinutes` fijos y, al vencer, la siguiente acción mandaba al login
// sin aviso — a media alta de empleado. Ahora:
//   • Mientras haya actividad (teclado, mouse, toque), el token se renueva
//     solo antes de vencer (POST /refresh).
//   • Sin actividad, 2 minutos antes de vencer aparece un aviso con
//     "Seguir conectado".
//   • Si vence, se vuelve al login con un mensaje que explica por qué.
// Así `sessionMinutes` (Configuración) es tiempo de INACTIVIDAD.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiClock } from "react-icons/fi";
import Modal from "./Modal";
import { API_URL, sessionHeaders } from "../services/apiConfig";

const AVISO_SEG = 120;
const EVENTOS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];

function payload(token) {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return null; }
}

export function cerrarPorInactividad(texto = "Tu sesión se cerró por inactividad. Vuelve a entrar.") {
  const slug = sessionStorage.getItem("entry_org_slug");
  sessionStorage.clear();
  try { sessionStorage.setItem("aviso_login", texto); } catch { /* sin storage */ }
  window.location.href = slug ? `/${slug}` : "/Login";
}

export default function SesionGuard() {
  const ultimaActividad = useRef(Date.now());
  const renovando = useRef(false);
  const [restante, setRestante] = useState(null); // segundos, solo cuando hay aviso

  const renovar = useCallback(async () => {
    if (renovando.current) return;
    renovando.current = true;
    try {
      const res = await fetch(`${API_URL}/refresh`, { method: "POST", headers: { "Content-Type": "application/json", ...sessionHeaders() } });
      if (res.status === 401) { cerrarPorInactividad("Tu sesión ya no es válida. Vuelve a entrar."); return; }
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) sessionStorage.setItem("access_token", data.access_token);
        setRestante(null);
      }
    } catch { /* sin red: se reintenta en el siguiente ciclo */ }
    finally { renovando.current = false; }
  }, []);

  useEffect(() => {
    const marcar = () => { ultimaActividad.current = Date.now(); };
    EVENTOS.forEach(e => window.addEventListener(e, marcar, { passive: true }));
    const revisar = () => {
      const token = sessionStorage.getItem("access_token");
      const p = token && payload(token);
      if (!p?.exp) return;
      const ahora = Date.now() / 1000;
      const quedan = p.exp - ahora;
      const vida = p.iat ? p.exp - p.iat : 1800;
      if (quedan <= 0) { cerrarPorInactividad(); return; }
      const activo = Date.now() - ultimaActividad.current < Math.min(vida / 2, 300) * 1000;
      if (activo && quedan < Math.min(vida / 2, 300)) { renovar(); return; }
      setRestante(quedan <= AVISO_SEG ? Math.ceil(quedan) : null);
    };
    revisar();
    const t = setInterval(revisar, 1000);
    return () => { clearInterval(t); EVENTOS.forEach(e => window.removeEventListener(e, marcar)); };
  }, [renovar]);

  const mm = restante != null ? `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}` : "";
  return (
    <Modal abierto={restante != null} onClose={renovar} titulo="¿Sigues ahí?" ancho={440}
      subtitulo={`Por seguridad, tu sesión se cerrará en ${mm} si no hay actividad.`}
      onGuardar={renovar} labelGuardar="Seguir conectado" iconGuardar={FiClock}>
      <p className="vp-sub" style={{ margin: 0 }}>Lo que estés capturando se conserva si continúas ahora.</p>
    </Modal>
  );
}
