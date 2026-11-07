export interface Employee {
  id: number;
  name: string;
  email: string;
  pod_id: number | null;
  active: boolean;
  weekly_off_days: number[]; // 0=Mon, 6=Sun
  weekly_offs_per_week: number;
  max_consecutive_days: number;
}

export interface Pod {
  id: number;
  name: string;
  lead_id: number | null;
}

export interface Brand {
  id: number;
  name: string;
  active: boolean;
}

export interface Process {
  id: number;
  name: string;
  description: string;
}

export interface Assignment {
  id: number;
  employee_id: number;
  brand_id: number;
  process_id: number;
}

export interface OperatingRule {
  id: number;
  brand_id: number;
  process_id: number;
  operating_days: number[];
  holiday_policy: "work" | "off";
  min_coverage: number;
  coverage_overrides: Record<string, number>;
}

export interface Leave {
  id: number;
  employee_id: number;
  date: string;
  type: "leave" | "comp_off" | "unavailable";
  approved: boolean;
}

export interface PublicHoliday {
  id: number;
  date: string;
  name: string;
}

export type EntryStatus = "work" | "weekly_off" | "leave" | "comp_off" | "holiday";

export interface RosterEntry {
  id: number;
  roster_id: number;
  employee_id: number;
  date: string; // YYYY-MM-DD
  status: EntryStatus;
  locked: boolean;
}

export interface Roster {
  id: number;
  year: number;
  month: number;
  version: number;
  status: "draft" | "validated" | "published";
  created_at: string;
  entries: RosterEntry[];
}

export interface Issue {
  severity: "critical" | "warning";
  code: string;
  message: string;
  employee_id: number | null;
  rule_id: number | null;
  date: string | null;
}

export interface CoverageItem {
  rule_id: number;
  date: string;
  required: number;
  working: number;
}

export interface ValidationReport {
  valid: boolean;
  issues: Issue[];
  coverage: CoverageItem[];
  work_days: Record<number, number>;
}

export interface ImpactResult {
  new_issues: Issue[];
  valid_after: boolean;
}
