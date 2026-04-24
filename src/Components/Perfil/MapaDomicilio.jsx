import React, { useEffect, useRef, useState, useCallback } from "react";

// ─── Carga dinámica de Leaflet ────────────────────────────────────────────────
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
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload  = () => resolve(window.L);
    script.onerror = () => reject(new Error("No se pudo cargar Leaflet"));
    document.head.appendChild(script);
  });
}

// ─── Geocodificación Nominatim (OpenStreetMap, sin API key) ───────────────────
async function geocodificar(direccion) {
  const { Calle = "", NumExterior = "", Municipio = "", Ciudad = "" } = direccion;
  const query = [Calle, NumExterior, Municipio, Ciudad, "México"].filter(Boolean).join(", ");
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res  = await fetch(url, { headers: { "Accept-Language": "es", "User-Agent": "CibercomHR/1.0" } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    const fallbackQ = [Municipio, Ciudad, "México"].filter(Boolean).join(", ");
    const res2  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQ)}&format=json&limit=1`, { headers: { "Accept-Language": "es", "User-Agent": "CibercomHR/1.0" } });
    const data2 = await res2.json();
    return data2.length > 0 ? { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) } : null;
  } catch {
    return null;
  }
}

// ─── Mapa inline ──────────────────────────────────────────────────────────────
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

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([clat, clng], 15);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (coords && status === "ok") initMap(coords.lat, coords.lng);
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const sinDireccion = !direccion?.Calle && !direccion?.Municipio && !direccion?.Ciudad;
  if (sinDireccion && !lat && !lng) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "var(--hr-muted)", fontSize: "0.85rem" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display: "block", margin: "0 auto 8px" }}>
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Sin dirección registrada
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--hr-glass-bg)", borderRadius: 12, zIndex: 10, fontSize: "0.8rem", color: "var(--hr-muted)" }}>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 14, height: 14, border: "2px solid var(--hr-border)", borderTopColor: "var(--hr-accent-2)", borderRadius: "50%", animation: "hr-spin 0.9s linear infinite", flexShrink: 0 }} />
            Cargando mapa…
          </span>
        </div>
      )}
      {status === "error" && (
        <div style={{ padding: "16px", textAlign: "center", color: "var(--hr-muted)", fontSize: "0.82rem", background: "rgba(232,107,95,0.06)", border: "1px solid rgba(232,107,95,0.18)", borderRadius: 12 }}>
          No se pudo ubicar la dirección en el mapa.
          {isEditing && <span style={{ color: "var(--hr-accent-2)", marginLeft: 6 }}>Puedes arrastrar el pin manualmente.</span>}
        </div>
      )}
      <div ref={containerRef} style={{ height: 240, borderRadius: 12, overflow: "hidden", border: "1px solid var(--hr-glass-border)", opacity: status === "loading" ? 0 : 1, transition: "opacity 0.3s" }} />
      {isEditing && status === "ok" && (
        <p style={{ fontSize: "0.72rem", color: "var(--hr-muted)", marginTop: 6, textAlign: "center" }}>
          Arrastra el pin para ajustar la ubicación exacta
        </p>
      )}
      {coords && (
        <p style={{ fontSize: "0.68rem", color: "var(--hr-hint, #555)", marginTop: 4, textAlign: "right" }}>
          {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}

// ─── Mapa popup ───────────────────────────────────────────────────────────────
function MapaPopup({ direccion, lat, lng, isEditing, onCoordsChange }) {
  const [open, setOpen] = useState(false);
  const label = [direccion?.Calle, direccion?.NumExterior, direccion?.Municipio].filter(Boolean).join(", ");

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Ver en mapa
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 8500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={{ width: "100%", maxWidth: 620, background: "var(--hr-bg, #0d0d10)", border: "1px solid var(--hr-glass-border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--hr-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--hr-text)" }}>
                📍 {label || "Domicilio del empleado"}
              </span>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--hr-border)", borderRadius: 8, color: "var(--hr-muted)", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem" }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              <MapaInline direccion={direccion} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function MapaDomicilio({ direccion, lat, lng, isEditing = false, onCoordsChange, mode = "popup" }) {
  if (mode === "inline") {
    return <MapaInline direccion={direccion} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} />;
  }
  return <MapaPopup direccion={direccion} lat={lat} lng={lng} isEditing={isEditing} onCoordsChange={onCoordsChange} />;
}