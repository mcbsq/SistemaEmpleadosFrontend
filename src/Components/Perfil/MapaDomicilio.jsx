// Mapa del domicilio — mapa embebido de Google, siempre visible y en vivo.
//
// No usa la API de Google ni una llave: con la dirección capturada se arma
// la búsqueda y se pasa al mapa embebido (el mismo de "Compartir → Insertar
// mapa" en Google Maps). En cuanto hay código postal el mapa ya se centra en
// esa zona; cada dato que se agrega (colonia, calle, número…) afina la
// ubicación y el zoom.
//
// Si el domicilio tiene coordenadas guardadas (lat/lng), se muestran esas.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiMaximize2, FiExternalLink } from "react-icons/fi";
import IconButton from "../IconButton";

const ESPERA_MS = 600; // mientras se escribe, actualizar al hacer pausa

// ─── Qué tan precisa puede ser la ubicación con los datos capturados ─────
const NIVELES = [
  { nivel: 0, zoom: 5,  texto: "Agrega el código postal para ubicar el domicilio" },
  { nivel: 1, zoom: 10, texto: "Ubicación aproximada por municipio / estado" },
  { nivel: 2, zoom: 14, texto: "Ubicación aproximada por código postal" },
  { nivel: 3, zoom: 15, texto: "Ubicación por colonia" },
  { nivel: 4, zoom: 17, texto: "Ubicación por calle" },
  { nivel: 5, zoom: 18, texto: "Ubicación por calle y número" },
];

const limpio = (v) => String(v ?? "").trim();
const numeroValido = (n) => limpio(n) && !/^s\/?n$/i.test(limpio(n));

export function consultaDireccion(d = {}) {
  const cp = limpio(d.CodigoP).replace(/\D/g, "");
  const cpCompleto = cp.length === 5;
  const calle = limpio(d.Calle);
  const colonia = limpio(d.Colonia);
  const municipio = limpio(d.Municipio);
  const estado = limpio(d.Ciudad);

  let nivel = 0;
  if (municipio || estado) nivel = 1;
  if (cpCompleto) nivel = 2;
  if (colonia && (cpCompleto || municipio)) nivel = 3;
  if (calle && nivel >= 2) nivel = 4;
  if (calle && numeroValido(d.NumExterior) && nivel >= 2) nivel = 5;

  const partes = [
    calle && `${calle}${numeroValido(d.NumExterior) ? ` ${limpio(d.NumExterior)}` : ""}`,
    colonia, cpCompleto && `C.P. ${cp}`, municipio, estado, "México",
  ].filter(Boolean);
  return { ...NIVELES[nivel], query: nivel ? partes.join(", ") : "" };
}

function useDebounce(valor, ms) {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}

const tieneCoords = (lat, lng) => lat != null && lng != null && lat !== "" && lng !== "";

// La búsqueda que recibe Google: coordenadas guardadas o la dirección.
function busqueda(consulta, lat, lng) {
  if (tieneCoords(lat, lng)) return { q: `${lat},${lng}`, zoom: 17 };
  return { q: consulta.query || "México", zoom: consulta.zoom };
}

function Mapa({ consulta, lat, lng, alto }) {
  const { q, zoom } = busqueda(consulta, lat, lng);
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&hl=es&output=embed`;
  const nivel = tieneCoords(lat, lng) ? 5 : consulta.nivel;
  return (
    <div className="mapa-vivo">
      <iframe key={src} title="Mapa del domicilio" className="mapa-vivo-canvas" style={{ height: alto, border: 0 }}
        src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <p className="mapa-vivo-nivel" role="status">
        <span className="mapa-vivo-barras" aria-hidden="true">{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= nivel ? "on" : ""} />)}</span>
        {tieneCoords(lat, lng) ? "Ubicación guardada" : consulta.texto}
      </p>
    </div>
  );
}

// ─── Pantalla completa ────────────────────────────────────────────────────
function MapaPantallaCompleta({ titulo, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", h); };
  }, [onClose]);
  return createPortal(
    <div className="mapa-fs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mapa-fs-card">
        <div className="mapa-fs-header">
          <div className="mapa-fs-title">{titulo}</div>
          <button className="mapa-fs-close" onClick={onClose} title="Cerrar (Esc)" aria-label="Cerrar mapa"><FiX /></button>
        </div>
        <div className="mapa-fs-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─── Export: mapa siempre visible junto al formulario ─────────────────────
export default function MapaDomicilio({ direccion, lat, lng }) {
  // Lo que se escribe se refleja al hacer una pausa breve, no en cada tecla.
  const consulta = consultaDireccion(useDebounce(direccion || {}, ESPERA_MS));
  const [grande, setGrande] = useState(false);
  const titulo = [direccion?.Calle, direccion?.NumExterior, direccion?.Colonia].filter(Boolean).join(", ") || "Domicilio";
  const { q } = busqueda(consulta, lat, lng);

  return (
    <>
      <div className="mapa-vivo-wrap">
        <div className="mapa-vivo-acciones">
          {(consulta.query || tieneCoords(lat, lng)) && (
            <IconButton icon={FiExternalLink} size="sm" label="Abrir en Google Maps" tooltipPos="left"
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, "_blank", "noopener")} />
          )}
          <IconButton icon={FiMaximize2} size="sm" label="Ver mapa en grande" tooltipPos="left" onClick={() => setGrande(true)} />
        </div>
        {!grande && <Mapa consulta={consulta} lat={lat} lng={lng} alto={280} />}
      </div>
      {grande && (
        <MapaPantallaCompleta titulo={titulo} onClose={() => setGrande(false)}>
          <Mapa consulta={consulta} lat={lat} lng={lng} alto="calc(100% - 34px)" />
        </MapaPantallaCompleta>
      )}
    </>
  );
}
