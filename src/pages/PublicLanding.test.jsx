import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PublicLanding from "./PublicLanding";

test("offers company registration and existing account access", () => {
  render(<MemoryRouter><PublicLanding /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /gestiona a tu equipo/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /crear mi empresa/i })).toHaveAttribute("href", "/registro");
  expect(screen.getByRole("link", { name: /ya tengo una cuenta/i })).toHaveAttribute("href", "/Login");
});
