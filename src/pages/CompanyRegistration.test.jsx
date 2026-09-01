import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CompanyRegistration from "./CompanyRegistration";

test("requires company name before registration", async () => {
  render(<MemoryRouter><CompanyRegistration /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: /crear empresa/i }));
  expect(screen.getByRole("alert")).toHaveTextContent(/nombre de la empresa/i);
});
