import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import PublicLanding from "./PublicLanding";

// "Crear mi empresa" ya no lleva a /registro: abre un formulario de contacto
// (Observaciones Empleados 2026-09-03, punto 2). Cibercom da de alta a mano.
test("ofrece solicitar una empresa nueva y entrar con una cuenta existente", () => {
  render(<MemoryRouter><PublicLanding /></MemoryRouter>);
  expect(screen.getByRole("heading", { level: 1, name: /gestiona a tu equipo/i })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /ya tengo una cuenta/i })[0]).toHaveAttribute("href", "/Login");

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: /crear mi empresa/i })[0]);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
