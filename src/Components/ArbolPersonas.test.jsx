import { render, screen } from "@testing-library/react";
import ArbolPersonas, { armarArbol } from "./ArbolPersonas";

const p = (id, jefe = "", extra = {}) => ({ _id: id, Nombre: id, ApelPaterno: "", JefeInmediato_id: jefe, ...extra });

test("cuelga a cada persona de su jefe y deja aparte a quien no tiene jefe ni equipo", () => {
  const { raices, sinJerarquia } = armarArbol([p("Dir"), p("Ger", "Dir"), p("Dev", "Ger"), p("Admin")]);
  expect(raices.map(r => r.Nombre)).toEqual(["Dir"]);
  expect(raices[0].hijos[0].Nombre).toBe("Ger");
  expect(raices[0].hijos[0].hijos[0].Nombre).toBe("Dev");
  expect(sinJerarquia.map(r => r.Nombre)).toEqual(["Admin"]);
});

test("un ciclo de jefes no hace desaparecer a nadie", () => {
  const { raices, sinJerarquia } = armarArbol([p("A", "B"), p("B", "A")]);
  const nombres = [];
  const recorrer = n => { nombres.push(n.Nombre); n.hijos.forEach(recorrer); };
  [...raices, ...sinJerarquia].forEach(recorrer);
  expect(nombres.sort()).toEqual(["A", "B"]);
});

test("pinta las tarjetas y abre el perfil al tocarlas", () => {
  const abrir = jest.fn();
  const { raices } = armarArbol([p("Dir", "", { Puesto: "Director" }), p("Dev", "Dir")]);
  render(<ArbolPersonas raices={raices} destacadoId="Dev" onAbrir={abrir} />);
  screen.getByTitle("Dir — Ver perfil").click();
  expect(abrir).toHaveBeenCalledWith("Dir");
  expect(screen.getByText("Director")).toBeTruthy();
});
