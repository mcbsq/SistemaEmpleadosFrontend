// utils/gradiente.js — colores del fondo animado (AmbientBackground) y de la
// portada del perfil. Cada empresa puede elegir los suyos en Configuración →
// Identidad → Fondo animado (se guardan en org.branding.gradiente).
export const PRESETS_GRADIENTE = [
  { id: "azul-verde", nombre: "Azul y verde", colores: ["#06122e", "#1d4ed8", "#2563eb", "#0d9488"] },
  { id: "oceano",     nombre: "Océano",       colores: ["#031525", "#0369a1", "#0ea5e9", "#14b8a6"] },
  { id: "violeta",    nombre: "Violeta",      colores: ["#140726", "#6d28d9", "#4f46e5", "#db2777"] },
  { id: "atardecer",  nombre: "Atardecer",    colores: ["#1c0a0a", "#c2410c", "#e11d48", "#7c3aed"] },
  { id: "bosque",     nombre: "Bosque",       colores: ["#04140c", "#166534", "#0f766e", "#65a30d"] },
  { id: "grafito",    nombre: "Grafito",      colores: ["#0a0a0f", "#334155", "#1e293b", "#475569"] },
];

const HEX = /^#[0-9a-f]{6}$/i;
const PREDETERMINADO = PRESETS_GRADIENTE[0].colores;

// Para el tema claro se aclaran los mismos colores (mezcla con blanco), así
// la marca se mantiene pero el texto oscuro sigue siendo legible.
const aclarar = (hex, k = 0.72) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * k));
  return `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`;
};

export function coloresGradiente(orgConfig, theme = "dark") {
  const elegidos = orgConfig?.branding?.gradiente;
  const base = Array.isArray(elegidos) && elegidos.length >= 2 && elegidos.every(c => HEX.test(c)) ? elegidos : PREDETERMINADO;
  return theme === "light" ? base.map(c => aclarar(c)) : base;
}
