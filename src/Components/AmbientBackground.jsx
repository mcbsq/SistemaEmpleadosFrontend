// src/Components/AmbientBackground.jsx
// Fondo vivo de todo el sistema: un gradiente de malla (WebGL) entre azules y
// verdes que se mueve muy despacio — la misma técnica del hero de Bristol,
// llevada a la pantalla completa. Las tarjetas de vidrio (backdrop-filter)
// dejan pasar su color, así que todo el sistema "respira" con él.
//
// Cuidado con el costo: el shader se dibuja a resolución limitada
// (maxPixelCount) y se detiene cuando la pestaña no está visible. Con
// "reducir movimiento" (sistema operativo o Ajustes → Preferencias) se usa
// un gradiente CSS estático, sin WebGL.
import React, { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import { useTheme } from "../context/ThemeContext";
import { useOrg } from "../context/OrgContext";
import { coloresGradiente } from "../utils/gradiente";
import "./AmbientBackground.css";


export default function AmbientBackground({ intensidad = "normal" }) {
  const { theme, reducedMotion } = useTheme();
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const { orgConfig } = useOrg();
  const paleta = coloresGradiente(orgConfig, theme);

  return (
    <div className={`ambient-bg ambient-bg--${theme} ambient-bg--${intensidad}`} aria-hidden="true">
      {reducedMotion ? (
        <div className="ambient-bg__static" style={{ background: `linear-gradient(135deg, ${paleta.join(", ")})` }} />
      ) : (
        <MeshGradient
          className="ambient-bg__mesh"
          colors={paleta}
          speed={visible ? 0.12 : 0}
          distortion={0.75}
          swirl={0.35}
          grainMixer={0}
          grainOverlay={theme === "dark" ? 0.035 : 0.02}
          maxPixelCount={1280 * 800}
          minPixelRatio={1}
          fit="cover"
        />
      )}
      <div className="ambient-bg__veil" />
    </div>
  );
}
