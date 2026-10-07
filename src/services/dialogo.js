// src/services/dialogo.js
// Confirmaciones y avisos con el pop-up del sistema, en lugar de
// window.confirm / window.alert (el navegador muestra "sitio.vercel.app
// dice…" con su propio diseño). Uso:
//   if (!(await confirmar("¿Eliminar la vacante?"))) return;
//   await avisar({ titulo: "Listo", mensaje: "…", copiable: "abc123" });
let host = null;

export function registrarHost(fn) { host = fn; return () => { if (host === fn) host = null; }; }

function abrir(tipo, opciones) {
  const o = typeof opciones === "string" ? { mensaje: opciones } : (opciones || {});
  if (!host) {
    // Sin host montado (no debería pasar): no bloquear el flujo.
    return Promise.resolve(tipo === "confirmar" ? window.confirm(o.mensaje) : undefined); // eslint-disable-line no-alert
  }
  return new Promise(resolve => host({ tipo, ...o, resolve }));
}

export const confirmar = (opciones) => abrir("confirmar", opciones);
export const avisar = (opciones) => abrir("avisar", opciones);
