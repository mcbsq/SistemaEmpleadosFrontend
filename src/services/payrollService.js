import { apiFetch } from "./apiConfig";

export const payrollService = { list(filters={}) { const query=new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==""&&v!=null)); return apiFetch(`/payrolls?${query}`); } };
