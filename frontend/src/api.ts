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

export function getApiBase(): string {
  const custom = typeof window !== "undefined" ? localStorage.getItem("backend_url") : null;
  let raw = (custom || import.meta.env.VITE_API_URL || "http://localhost:8000").trim();
  raw = raw.replace(/\/+$/, "");
  if (raw.endsWith("/api")) {
    return raw;
  }
  return `${raw}/api`;
}

export function setBackendUrl(url: string) {
  const trimmed = url.trim();
  if (trimmed) {
    localStorage.setItem("backend_url", trimmed);
  } else {
    localStorage.removeItem("backend_url");
  }
}

export const API_BASE = getApiBase();

export function getAdminToken(): string {
  const t = localStorage.getItem("admin_token") || localStorage.getItem("admin");
  return t && t.trim() !== "" ? t.trim() : "change-me";
}

export function setAdminToken(token: string) {
  const val = token && token.trim() !== "" ? token.trim() : "change-me";
  localStorage.setItem("admin_token", val);
  localStorage.setItem("admin", val);
}

export async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getAdminToken();
  const base = getApiBase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-admin-token": token,
  };

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${base}${cleanPath}`, {
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
  getExportUrl: (rosterId: number) => `${getApiBase()}/rosters/${rosterId}/export.csv`,
};
