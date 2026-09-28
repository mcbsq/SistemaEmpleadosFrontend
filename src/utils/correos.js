// src/utils/correos.js
// ListaCorreos pasó de un string único a una lista [{email, principal}] —
// pero sigue siendo el mismo campo de Mongo, y empleados antiguos aún
// tienen ahí un string suelto. Este helper acepta ambos formatos para que
// cada pantalla que solo necesita "el correo para mostrar" no tenga que
// reimplementar esa lógica ni romperse con datos viejos.
export function correoPrincipal(listaCorreos) {
  if (!listaCorreos) return "";
  if (typeof listaCorreos === "string") return listaCorreos;
  if (Array.isArray(listaCorreos)) {
    const principal = listaCorreos.find(c => c?.principal) || listaCorreos[0];
    return principal?.email || "";
  }
  return "";
}
