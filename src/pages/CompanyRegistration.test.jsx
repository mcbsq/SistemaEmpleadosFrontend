import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import CompanyRegistration from "./CompanyRegistration";

test("requires company name before registration", () => {
  render(<MemoryRouter><CompanyRegistration /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /crear empresa/i }));
  expect(screen.getByRole("alert")).toHaveTextContent(/nombre de la empresa/i);
});
