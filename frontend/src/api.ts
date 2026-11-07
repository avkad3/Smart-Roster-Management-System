import type {
  Employee,
  Pod,
  Brand,
  Process,
  Assignment,
  OperatingRule,
  Leave,
  PublicHoliday,
  Roster,
  ValidationReport,
  ImpactResult,
  EntryStatus,
} from "./types";

export const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

export function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "change-me";
}

export function setAdminToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["x-admin-token"] = token;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      typeof errorData.detail === "string"
        ? errorData.detail
        : JSON.stringify(errorData.detail ?? res.statusText);
    throw new Error(message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Reference data
  getEmployees: () => request<Employee[]>("/employees"),
  getPods: () => request<Pod[]>("/pods"),
  getBrands: () => request<Brand[]>("/brands"),
  getProcesses: () => request<Process[]>("/processes"),
  getAssignments: () => request<Assignment[]>("/assignments"),
  getRules: () => request<OperatingRule[]>("/rules"),
  getLeaves: () => request<Leave[]>("/leaves"),
  getHolidays: () => request<PublicHoliday[]>("/holidays"),

  // Crud generic
  createRecord: (entity: string, data: any) => request<any>(`/${entity}`, "POST", data),
  updateRecord: (entity: string, id: number, data: any) => request<any>(`/${entity}/${id}`, "PATCH", data),
  deleteRecord: (entity: string, id: number) => request<{ ok: boolean }>(`/${entity}/${id}`, "DELETE"),

  // Roster endpoints
  getRosters: (year: number, month: number) => request<Roster[]>(`/rosters?year=${year}&month=${month}`),
  getRoster: (id: number) => request<Roster>(`/rosters/${id}`),
  generateRoster: (year: number, month: number, time_limit = 20) =>
    request<{ roster_id: number; status: string; valid: boolean; issues: any[] }>("/rosters/generate", "POST", {
      year,
      month,
      time_limit,
    }),
  validateRoster: (id: number) => request<ValidationReport>(`/rosters/${id}/validate`),
  publishRoster: (id: number) => request<Roster>(`/rosters/${id}/publish`, "POST"),
  editShift: (rosterId: number, employeeId: number, date: string, status: EntryStatus, preview = false) =>
    request<ValidationReport>(`/rosters/${rosterId}/edit`, "POST", {
      employee_id: employeeId,
      date,
      status,
      preview,
    }),
  simulateImpact: (rosterId: number, employeeId: number, dates: string[], type: string) =>
    request<ImpactResult>(`/rosters/${rosterId}/impact`, "POST", {
      employee_id: employeeId,
      dates,
      type,
    }),
  getExportUrl: (rosterId: number) => `${API_BASE}/rosters/${rosterId}/export.csv`,
};
