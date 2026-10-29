// Mapa del domicilio — Google Maps, siempre visible y en tiempo real.
//
// En cuanto hay código postal el mapa ya se centra en esa zona; cada dato
// que se agrega (colonia, calle, número…) afina la ubicación y el zoom. Con
// REACT_APP_GOOGLE_MAPS_API_KEY se usa la Maps JavaScript API (geocodificación
// precisa + pin arrastrable en edición). Sin llave se usa el mapa embebido de
// Google, que también se mueve en vivo pero no permite arrastrar el pin.
//
// lat/lng guardados = ubicación fijada a mano (pin arrastrado). Si no hay,
// el pin sale de la dirección. "Volver a la dirección" borra el ajuste manual.
import React, { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { FiX, FiMaximize2, FiCrosshair } from "react-icons/fi";
import IconButton from "../IconButton";

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
const CENTRO_MX = { lat: 23.6345, lng: -102.5528 };
const ESPERA_MS = 550; // mientras se escribe, geocodificar al hacer pausa

// ─── Qué tan precisa puede ser la ubicación con los datos capturados ─────
const NIVELES = [
  { nivel: 0, zoom: 5,  texto: "Agrega el código postal para ubicar el domicilio" },
  { nivel: 1, zoom: 9,  texto: "Ubicación aproximada por municipio / estado" },
  { nivel: 2, zoom: 14, texto: "Ubicación aproximada por código postal" },
  { nivel: 3, zoom: 15, texto: "Ubicación por colonia" },
  { nivel: 4, zoom: 17, texto: "Ubicación por calle" },
  { nivel: 5, zoom: 18, texto: "Ubicación exacta (calle y número)" },
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
  return { ...NIVELES[nivel], query: nivel ? partes.join(", ") : "", cp: cpCompleto ? cp : "" };
}

// ─── Carga única del script de Google Maps ─────────────────────────────────
let promesaGoogle = null;
function cargarGoogleMaps() {
  if (window.google?.maps?.Geocoder) return Promise.resolve(window.google.maps);
  if (promesaGoogle) return promesaGoogle;
  promesaGoogle = new Promise((resolve, reject) => {
    window.__cibercomMapsListo = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&language=es&region=MX&loading=async&callback=__cibercomMapsListo`;
    s.async = true;
    s.onerror = () => { promesaGoogle = null; reject(new Error("No se pudo cargar Google Maps")); };
    document.head.appendChild(s);
  });
  return promesaGoogle;
}

// Geocodificación con caché: la misma consulta no vuelve a Google.
const cacheGeo = new Map();
async function geocodificar(maps, { query, cp }) {
  const clave = `${query}|${cp}`;
  if (cacheGeo.has(clave)) return cacheGeo.get(clave);
  const geocoder = new maps.Geocoder();
  const peticion = { address: query, region: "MX", componentRestrictions: { country: "MX", ...(cp ? { postalCode: cp } : {}) } };
  let r = await geocoder.geocode(peticion).catch(() => null);
  // Si el CP no casa con la calle escrita (CP mal capturado), sin restricción.
  if (!r?.results?.length && cp) r = await geocoder.geocode({ address: query, region: "MX", componentRestrictions: { country: "MX" } }).catch(() => null);
  const res = r?.results?.[0];
  const geo = res ? {
    lat: res.geometry.location.lat(), lng: res.geometry.location.lng(),
    viewport: res.geometry.viewport, exacto: res.geometry.location_type === "ROOFTOP",
    formato: res.formatted_address,
  } : null;
  cacheGeo.set(clave, geo);
  return geo;
}

function useDebounce(valor, ms) {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}

const PIN_SVG = (color) => ({
  path: "M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.8.4.3 1 .3 1.4 0C13 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5, scale: 1.7,
});

// ─── Mapa con Maps JavaScript API ─────────────────────────────────────────
function MapaGoogle({ consulta, lat, lng, isEditing, onCoordsChange, alto }) {
  const contRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | sin_ubicacion | error
  const [detalle, setDetalle] = useState("");
  const manual = lat != null && lng != null && lat !== "" && lng !== "";

  // Montar el mapa una sola vez.
  useEffect(() => {
    let vivo = true;
    cargarGoogleMaps().then(maps => {
      if (!vivo || !contRef.current) return;
      mapRef.current = new maps.Map(contRef.current, {
        center: CENTRO_MX, zoom: 5, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, clickableIcons: false, gestureHandling: "cooperative",
      });
      markerRef.current = new maps.Marker({ map: null, icon: PIN_SVG("#5B8AF0") });
      setEstado("ok");
    }).catch(() => vivo && setEstado("error"));
    return () => { vivo = false; };
  }, []);

  // Pin arrastrable solo en edición; soltarlo fija la ubicación a mano.
  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    m.setDraggable(!!isEditing);
    const l = isEditing ? m.addListener("dragend", e => onCoordsChange?.(e.latLng.lat(), e.latLng.lng())) : null;
    return () => l?.remove();
  }, [isEditing, onCoordsChange, estado]);

  // Mover el mapa: ubicación manual, o la de la dirección (en vivo).
  useEffect(() => {
    if (estado === "error" || !mapRef.current) return;
    const maps = window.google.maps, map = mapRef.current, m = markerRef.current;
    let vigente = true;
    (async () => {
      if (manual) {
        const pos = { lat: Number(lat), lng: Number(lng) };
        m.setPosition(pos); m.setMap(map);
        map.panTo(pos); map.setZoom(Math.max(map.getZoom(), 17));
        setDetalle("Ubicación ajustada a mano");
        return;
      }
      if (!consulta.query) {
        m.setMap(null); map.panTo(CENTRO_MX); map.setZoom(5);
        setDetalle(consulta.texto);
        return;
      }
      const geo = await geocodificar(maps, consulta);
      if (!vigente) return;
      if (!geo) { m.setMap(null); setDetalle("No encontramos esta dirección; revisa el código postal"); return; }
      m.setPosition({ lat: geo.lat, lng: geo.lng });
      m.setMap(map);
      // El viewport de Google ya trae el encuadre ideal para el tipo de lugar
      // (CP = zona amplia, número = cuadra); solo se limita el zoom máximo.
      if (geo.viewport && consulta.nivel < 5) map.fitBounds(geo.viewport);
      else { map.panTo({ lat: geo.lat, lng: geo.lng }); map.setZoom(consulta.zoom); }
      setDetalle(consulta.nivel >= 5 && !geo.exacto ? "Ubicación aproximada de la calle y número" : consulta.texto);
    })();
    return () => { vigente = false; };
  }, [consulta, manual, lat, lng, estado]);

  if (estado === "error") return <MapaEmbebido consulta={consulta} lat={lat} lng={lng} alto={alto} aviso="No se pudo cargar Google Maps; se muestra el mapa básico." />;

  return (
    <div className="mapa-vivo">
      <div ref={contRef} className="mapa-vivo-canvas" style={{ height: alto }} />
      {estado === "cargando" && <div className="mapa-vivo-cargando"><div className="mapa-loading-dot" /> Cargando mapa…</div>}
      <p className="mapa-vivo-nivel" role="status" data-nivel={manual ? 5 : consulta.nivel}>
        <span className="mapa-vivo-barras" aria-hidden="true">{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= (manual ? 5 : consulta.nivel) ? "on" : ""} />)}</span>
        {detalle}
        {isEditing && estado === "ok" && (manual || consulta.query) && <span className="mapa-vivo-hint"> · Arrastra el pin si no queda exacto</span>}
      </p>
    </div>
  );
}

// ─── Sin llave: mapa embebido de Google (también en vivo) ──────────────────
function MapaEmbebido({ consulta, lat, lng, alto, aviso }) {
  const manual = lat != null && lng != null && lat !== "" && lng !== "";
  const q = manual ? `${lat},${lng}` : (consulta.query || "México");
  const zoom = manual ? 17 : consulta.zoom;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&hl=es&output=embed`;
  return (
    <div className="mapa-vivo">
      <iframe key={src} title="Mapa del domicilio" className="mapa-vivo-canvas" style={{ height: alto, border: 0 }}
        src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <p className="mapa-vivo-nivel" role="status">
        <span className="mapa-vivo-barras" aria-hidden="true">{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= (manual ? 5 : consulta.nivel) ? "on" : ""} />)}</span>
        {aviso || (manual ? "Ubicación ajustada a mano" : consulta.texto)}
      </p>
    </div>
  );
}

function Mapa(props) {
  return API_KEY ? <MapaGoogle {...props} /> : <MapaEmbebido {...props} />;
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

// ─── Export: mapa siempre visible bajo/junto al formulario ────────────────
export default function MapaDomicilio({ direccion, lat, lng, isEditing = false, onCoordsChange }) {
  // Lo que se escribe se refleja al hacer una pausa breve, no en cada tecla.
  const dirEstable = useDebounce(direccion || {}, ESPERA_MS);
  const base = consultaDireccion(dirEstable);
  // Objeto estable mientras la consulta no cambie (evita re-geocodificar).
  const consulta = useMemo(() => base, [base.query, base.cp, base.nivel]); // eslint-disable-line react-hooks/exhaustive-deps
  const [grande, setGrande] = useState(false);
  const manual = lat != null && lng != null && lat !== "" && lng !== "";
  const titulo = [direccion?.Calle, direccion?.NumExterior, direccion?.Colonia].filter(Boolean).join(", ") || "Domicilio";

  const acciones = (
    <div className="mapa-vivo-acciones">
      {isEditing && manual && API_KEY && (
        <IconButton icon={FiCrosshair} size="sm" label="Volver a la ubicación de la dirección" tooltipPos="left"
          onClick={() => onCoordsChange?.(null, null)} />
      )}
      <IconButton icon={FiMaximize2} size="sm" label="Ver mapa en grande" tooltipPos="left" onClick={() => setGrande(true)} />
    </div>
  );

  return (
    <>
      <div className="mapa-vivo-wrap">
        {acciones}
        {!grande && <Mapa consulta={consulta} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} alto={280} />}
      </div>
      {grande && (
        <MapaPantallaCompleta titulo={titulo} onClose={() => setGrande(false)}>
          <Mapa consulta={consulta} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} alto="calc(100% - 34px)" />
        </MapaPantallaCompleta>
      )}
    </>
  );
}
