import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Tenants from "./Tenants";
import { tenantsService } from "../services/tenantsService";

jest.mock("../services/tenantsService", () => ({
  tenantsService: { getAll: jest.fn(), createManual: jest.fn(), deliverAccess: jest.fn() },
}));

test("permite preparar una empresa vacía y muestra su liga", async () => {
  tenantsService.getAll.mockResolvedValue([]);
  tenantsService.createManual.mockResolvedValue({
    org_id: "herramientas-y-moldes-industriales",
    login_url: "https://cibercomrh.com/herramientas-y-moldes-industriales",
  });
  render(<Tenants />);

  fireEvent.change(await screen.findByLabelText("Nombre de la empresa"), {
    target: { value: "Herramientas y moldes industriales" },
  });
  fireEvent.change(screen.getByLabelText("Slug"), {
    target: { value: "herramientas-y-moldes-industriales" },
  });
  fireEvent.change(screen.getByLabelText("Persona de contacto"), {
    target: { value: "Blanca Mendoza" },
  });
  fireEvent.change(screen.getByLabelText("Correo de contacto"), {
    target: { value: "bianca@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preparar empresa" }));

  await waitFor(() => expect(tenantsService.createManual).toHaveBeenCalledWith({
    nombre: "Herramientas y moldes industriales",
    org_id: "herramientas-y-moldes-industriales",
    contacto_nombre: "Blanca Mendoza",
    contacto_email: "bianca@example.com",
  }));
  expect(await screen.findByText("https://cibercomrh.com/herramientas-y-moldes-industriales")).toBeTruthy();
});

test("envía a la primera administradora las credenciales generadas en AEGIS", async () => {
  tenantsService.getAll.mockResolvedValue([]);
  tenantsService.createManual.mockResolvedValue({
    org_id: "mi-empresa", login_url: "https://cibercomrh.com/mi-empresa",
  });
  tenantsService.deliverAccess.mockResolvedValue({ email_sent: true });
  render(<Tenants />);

  fireEvent.change(await screen.findByLabelText("Nombre de la empresa"), { target: { value: "Mi empresa" } });
  fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "mi-empresa" } });
  fireEvent.change(screen.getByLabelText("Persona de contacto"), { target: { value: "Blanca" } });
  fireEvent.change(screen.getByLabelText("Correo de contacto"), { target: { value: "admin@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Preparar empresa" }));

  fireEvent.change(await screen.findByLabelText("Usuario AEGIS"), { target: { value: "admin@example.com" } });
  fireEvent.change(screen.getByLabelText("Contraseña temporal"), { target: { value: "temporal-aegis" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar credenciales" }));

  await waitFor(() => expect(tenantsService.deliverAccess).toHaveBeenCalledWith("mi-empresa", {
    usuario: "admin@example.com", temp_password: "temporal-aegis",
  }));
  expect(await screen.findByText("Credenciales enviadas por correo.")).toBeTruthy();
});
