import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import PayrollTable from "./PayrollTable";
import { payrollService } from "../services/payrollService";

jest.mock("../services/payrollService", () => ({ payrollService: { list: jest.fn() } }));

test("shows the unconfigured payroll integration state", async () => {
  payrollService.list.mockResolvedValue({ configured: false, items: [], page: 1, page_size: 25, total: 0 });
  render(<MemoryRouter><PayrollTable /></MemoryRouter>);
  expect(await screen.findByText(/integración de nómina aún no está configurada/i)).toBeInTheDocument();
});
