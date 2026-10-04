import React, { createContext, useContext, useEffect, useState } from "react";

// Preferencias visuales del usuario (Ajustes de perfil → Preferencias):
//   theme  → "dark" | "light"
//   motion → "full" | "reduced"  — quien se marea o usa un equipo lento puede
//            apagar las animaciones del sistema; además se respeta siempre el
//            "reducir movimiento" del sistema operativo.
// Se guardan en localStorage: son de este navegador, no de la cuenta.
const ThemeContext = createContext();

const leer = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };

const mediaReduce = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function ThemeProvider({ children }) {
  const [theme, setTheme]   = useState(() => leer("cibercom-theme", "dark"));
  const [motion, setMotion] = useState(() => leer("cibercom-motion", "full"));
  const [sistemaReduce, setSistemaReduce] = useState(mediaReduce);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    guardar("cibercom-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion", motion);
    guardar("cibercom-motion", motion);
  }, [motion]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setSistemaReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));
  const reducedMotion = motion === "reduced" || sistemaReduce;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, motion, setMotion, reducedMotion }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
