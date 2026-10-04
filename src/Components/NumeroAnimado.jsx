// src/Components/NumeroAnimado.jsx
// Los KPIs "cuentan" hasta su valor cuando aparecen en pantalla. Si el valor
// no es un número (ej. "—" o "12%") se muestra tal cual, sin animar el texto.
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function NumeroAnimado({ value, duracion = 1100 }) {
  const { reducedMotion } = useTheme() || {};
  const objetivo = typeof value === "number" ? value : (/^\d+$/.test(String(value ?? "")) ? Number(value) : null);
  const [actual, setActual] = useState(objetivo === null || reducedMotion ? value : 0);
  const ref = useRef(null);

  useEffect(() => {
    if (objetivo === null || reducedMotion) { setActual(value); return; }
    const el = ref.current;
    let raf, inicio;
    const animar = () => {
      const paso = (t) => {
        if (!inicio) inicio = t;
        const p = Math.min((t - inicio) / duracion, 1);
        setActual(Math.round((1 - Math.pow(1 - p, 4)) * objetivo));
        if (p < 1) raf = requestAnimationFrame(paso);
      };
      raf = requestAnimationFrame(paso);
    };
    if (!el || typeof IntersectionObserver === "undefined") { animar(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); animar(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [objetivo, value, duracion, reducedMotion]);

  return <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>{actual}</span>;
}
