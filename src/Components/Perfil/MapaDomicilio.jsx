import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

let leafletLoaded = false;

function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoaded) {
    return new Promise(res => {
      const t = setInterval(() => { if (window.L) { clearInterval(t); res(window.L); } }, 50);
    });
  }
  leafletLoaded = true;
  return new Promise((resolve, reject) => {
    const link  = document.createElement("link");
    link.rel    = "stylesheet";
    link.href   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script    = document.createElement("script");
    script.src      = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload   = () => resolve(window.L);
    script.onerror  = () => reject(new Error("No se pudo cargar Leaflet"));
    document.head.appendChild(script);
  });
}

async function geocodificar(direccion) {
  const { Calle="", NumExterior="", Municipio="", Ciudad="" } = direccion;
  const query = [Calle, NumExterior, Municipio, Ciudad, "México"].filter(Boolean).join(", ");
  if (!query.trim()) return null;
  try {
    const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res  = await fetch(url, { headers: { "Accept-Language":"es", "User-Agent":"CibercomHR/1.0" } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    const fb  = [Municipio, Ciudad, "México"].filter(Boolean).join(", ");
    const r2  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fb)}&format=json&limit=1`, { headers: { "Accept-Language":"es", "User-Agent":"CibercomHR/1.0" } });
    const d2  = await r2.json();
    return d2.length > 0 ? { lat: parseFloat(d2[0].lat), lng: parseFloat(d2[0].lon) } : null;
  } catch { return null; }
}

// ─── Mapa inline (el que se renderiza dentro del popup) ───────────────────────
function MapaInline({ direccion, lat, lng, isEditing, onCoordsChange }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const [status, setStatus] = useState("idle");
  const [coords, setCoords] = useState(lat && lng ? { lat, lng } : null);

  const label = [direccion?.Calle, direccion?.NumExterior, direccion?.Municipio]
    .filter(Boolean).join(", ");

  const initMap = useCallback(async (clat, clng) => {
    if (!containerRef.current) return;
    const L = await ensureLeaflet();
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,   // permitir scroll dentro del popup grande
    }).setView([clat, clng], 16);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:var(--hr-accent,#5B8AF0);border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
      iconSize: [32, 32], iconAnchor: [16, 32], className: "",
    });

    const marker = L.marker([clat, clng], { icon, draggable: isEditing }).addTo(map);
    if (label) marker.bindPopup(`<strong style="font-size:13px">${label}</strong>`).openPopup();

    if (isEditing) {
      marker.on("dragend", (e) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        setCoords({ lat: newLat, lng: newLng });
        onCoordsChange?.(newLat, newLng);
      });
    }

    // Forzar resize después de montar — necesario cuando el contenedor
    // cambia de tamaño al abrirse el modal
    setTimeout(() => map.invalidateSize(), 100);
  }, [isEditing, label, onCoordsChange]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      let clat = lat, clng = lng;
      if (!clat || !clng) {
        const geo = await geocodificar(direccion || {});
        if (cancelled) return;
        if (!geo) { setStatus("error"); return; }
        clat = geo.lat; clng = geo.lng;
        setCoords({ lat: clat, lng: clng });
        onCoordsChange?.(clat, clng);
      }
      await initMap(clat, clng);
      if (!cancelled) setStatus("ok");
    }
    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (coords && status === "ok") initMap(coords.lat, coords.lng);
  }, [isEditing]); // eslint-disable-line

  const sinDir = !direccion?.Calle && !direccion?.Municipio && !direccion?.Ciudad;
  if (sinDir && !lat && !lng) return (
    <div className="mapa-empty">Sin dirección registrada</div>
  );

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {status === "loading" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--hr-glass-bg)", borderRadius:12, zIndex:10 }}>
          <div className="mapa-loading">
            <div className="mapa-loading-dot" />
            Cargando mapa…
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="mapa-error">
          No se pudo ubicar la dirección en el mapa.
          {isEditing && <span style={{ color:"var(--hr-accent-2)", marginLeft:6 }}>Puedes arrastrar el pin manualmente.</span>}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          height: "100%",
          borderRadius: 0,
          overflow: "hidden",
          opacity: status === "loading" ? 0 : 1,
          transition: "opacity 0.3s",
        }}
      />
      {isEditing && status === "ok" && (
        <p className="mapa-drag-hint">Arrastra el pin para ajustar la ubicación exacta</p>
      )}
      {coords && (
        <p className="mapa-coords">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
      )}
    </div>
  );
}

// ─── Popup fullscreen montado en document.body via portal ─────────────────────
function MapaPopupFullscreen({ direccion, lat, lng, isEditing, onCoordsChange, onClose }) {
  const label = [direccion?.Calle, direccion?.NumExterior, direccion?.Municipio]
    .filter(Boolean).join(", ");

  // Bloquear scroll del body mientras el popup está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="mapa-fs-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="mapa-fs-card">

        {/* Header */}
        <div className="mapa-fs-header">
          <div className="mapa-fs-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {label || "Domicilio del empleado"}
          </div>
          <button className="mapa-fs-close" onClick={onClose} title="Cerrar (Esc)">✕</button>
        </div>

        {/* Mapa ocupa todo el espacio restante */}
        <div className="mapa-fs-body">
          <MapaInline
            direccion={direccion}
            lat={lat}
            lng={lng}
            isEditing={isEditing}
            onCoordsChange={onCoordsChange}
          />
        </div>

      </div>
    </div>,
    document.body
  );
}

// ─── Botón que dispara el popup ───────────────────────────────────────────────
function MapaPopup({ direccion, lat, lng, isEditing, onCoordsChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn-ghost"
        onClick={() => setOpen(true)}
        style={{ display:"flex", alignItems:"center", gap:6, width:"100%", justifyContent:"center" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        Ver en mapa
      </button>

      {open && (
        <MapaPopupFullscreen
          direccion={direccion}
          lat={lat}
          lng={lng}
          isEditing={isEditing}
          onCoordsChange={onCoordsChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function MapaDomicilio({ direccion, lat, lng, isEditing=false, onCoordsChange, mode="popup" }) {
  if (mode === "inline") {
    return <MapaInline direccion={direccion} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} />;
  }
  return <MapaPopup direccion={direccion} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} />;
}