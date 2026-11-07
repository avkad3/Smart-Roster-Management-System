import { useState, useMemo } from "react";
import type { Employee, Pod, Brand, Process, Assignment, Roster, ValidationReport, EntryStatus } from "../types";
import { AlertTriangleIcon } from "./Icons";
import { ShiftEditModal } from "./ShiftEditModal";

interface EmployeeViewProps {
  roster: Roster | null;
  employees: Employee[];
  pods: Pod[];
  brands: Brand[];
  processes: Process[];
  assignments: Assignment[];
  report: ValidationReport | null;
  yearMonth: { y: number; m: number };
  onRefresh: () => void;
}

export function EmployeeView({
  roster,
  employees,
  pods,
  brands,
  processes,
  assignments,
  report,
  yearMonth,
  onRefresh,
}: EmployeeViewProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<number>(employees[0]?.id || 1);

  const [editModalData, setEditModalData] = useState<{
    employeeId: number;
    employeeName: string;
    date: string;
    currentStatus: EntryStatus;
    isLocked: boolean;
  } | null>(null);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const podMap = useMemo(() => new Map(pods.map((p) => [p.id, p])), [pods]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p.name])), [processes]);

  const selectedEmployee = empMap.get(selectedEmpId) || employees[0];
  const pod = selectedEmployee?.pod_id ? podMap.get(selectedEmployee.pod_id) : null;

  // Days in month
  const daysInMonth = useMemo(() => {
    const total = new Date(yearMonth.y, yearMonth.m, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i + 1;
      const d = new Date(yearMonth.y, yearMonth.m - 1, dayNum);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dateStr = `${yearMonth.y}-${String(yearMonth.m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      return { dayNum, dayName: dayNames[d.getDay()], isWeekend, dateStr, dayOfWeek: d.getDay() };
    });
  }, [yearMonth]);

  // Employee's assignments
  const empAssignments = useMemo(() => {
    if (!selectedEmployee) return [];
    return assignments.filter((a) => a.employee_id === selectedEmployee.id);
  }, [selectedEmployee, assignments]);

  // Employee's roster entries
  const empEntries = useMemo(() => {
    const map = new Map<string, any>();
    if (roster?.entries && selectedEmployee) {
      for (const e of roster.entries) {
        if (e.employee_id === selectedEmployee.id) {
          map.set(e.date, e);
        }
      }
    }
    return map;
  }, [roster, selectedEmployee]);

  // Stats calculation
  const counts = useMemo(() => {
    let work = 0;
    let off = 0;
    let leave = 0;
    let comp = 0;
    let holiday = 0;

    for (const d of daysInMonth) {
      const entry = empEntries.get(d.dateStr);
      if (entry) {
        if (entry.status === "work") work++;
        else if (entry.status === "weekly_off") off++;
        else if (entry.status === "leave") leave++;
        else if (entry.status === "comp_off") comp++;
        else if (entry.status === "holiday") holiday++;
      }
    }
    return { work, off, leave, comp, holiday };
  }, [daysInMonth, empEntries]);

  // Employee-specific issues from validation report
  const empIssues = useMemo(() => {
    if (!report || !selectedEmployee) return [];
    return report.issues.filter((i) => i.employee_id === selectedEmployee.id);
  }, [report, selectedEmployee]);

  const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Employee Selector Bar */}
      <div className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            Select Employee:
          </label>
          <select
            className="select-field"
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(Number(e.target.value))}
            style={{ width: "260px" }}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.pod_id ? `Pod ${podMap.get(emp.pod_id)?.name}` : "No Pod"})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {selectedEmployee && (
            <span className="badge badge-published">
              {selectedEmployee.active ? "Active Employee" : "Inactive"}
            </span>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {/* Profile Card */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  boxShadow: "0 4px 12px var(--primary-glow)",
                }}
              >
                {selectedEmployee.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: "1.3rem" }}>{selectedEmployee.name}</h3>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>{selectedEmployee.email}</p>
                <div style={{ marginTop: "4px" }}>
                  <span className="badge badge-validated">Pod: {pod?.name || "Unassigned"}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Weekly Offs per Week:</span>
                <strong style={{ color: "var(--text-primary)" }}>{selectedEmployee.weekly_offs_per_week} off / week</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Preferred Off Days:</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {selectedEmployee.weekly_off_days && selectedEmployee.weekly_off_days.length > 0
                    ? selectedEmployee.weekly_off_days.map((d) => weekdayNames[d]).join(", ")
                    : "No specific preference"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Max Consecutive Working Days:</span>
                <strong style={{ color: "var(--text-primary)" }}>{selectedEmployee.max_consecutive_days} days max</strong>
              </div>
            </div>

            {/* Assigned Brands & Processes */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                ASSIGNED CLIENT RESPONSIBILITIES ({empAssignments.length}):
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {empAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    style={{
                      padding: "0.4rem 0.6rem",
                      borderRadius: "6px",
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.775rem",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{brandMap.get(asg.brand_id)}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>{procMap.get(asg.process_id)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Conflict Alerts */}
            {empIssues.length > 0 && (
              <div style={{ padding: "0.85rem", borderRadius: "var(--radius-md)", background: "var(--warning-bg)", border: "1px solid var(--warning-border)" }}>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <AlertTriangleIcon size={14} /> Schedule Notes / Preference Warnings:
                </div>
                <ul style={{ fontSize: "0.75rem", color: "#fef08a", marginTop: "0.4rem", paddingLeft: "1.2rem" }}>
                  {empIssues.map((issue, idx) => (
                    <li key={idx}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Monthly Shift Timeline Card */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem" }}>Monthly Breakdown & Timeline</h3>

            {/* Breakdown Pills */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.75rem" }}>
              <div style={{ padding: "0.6rem", borderRadius: "var(--radius-md)", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#34d399" }}>{counts.work}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Working Days</div>
              </div>

              <div style={{ padding: "0.6rem", borderRadius: "var(--radius-md)", background: "rgba(100,116,139,0.15)", border: "1px solid rgba(100,116,139,0.3)", textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#94a3b8" }}>{counts.off}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Weekly Offs</div>
              </div>

              <div style={{ padding: "0.6rem", borderRadius: "var(--radius-md)", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fbbf24" }}>{counts.leave}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Leaves</div>
              </div>

              <div style={{ padding: "0.6rem", borderRadius: "var(--radius-md)", background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#38bdf8" }}>{counts.comp}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Comp-offs</div>
              </div>

              <div style={{ padding: "0.6rem", borderRadius: "var(--radius-md)", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", textAlign: "center" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#c084fc" }}>{counts.holiday}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Public Holidays</div>
              </div>
            </div>

            {/* Daily Calendar Matrix */}
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Click any calendar day to adjust shift or approve leave:
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.4rem" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", paddingBottom: "0.2rem" }}>
                  {day}
                </div>
              ))}

              {daysInMonth.map((d) => {
                const entry = empEntries.get(d.dateStr);
                const status = entry?.status;
                const isLocked = entry?.locked ?? false;

                const bgColors: Record<string, string> = {
                  work: "rgba(16,185,129,0.2)",
                  weekly_off: "rgba(100,116,139,0.2)",
                  leave: "rgba(245,158,11,0.2)",
                  comp_off: "rgba(14,165,233,0.2)",
                  holiday: "rgba(168,85,247,0.2)",
                };

                const textColors: Record<string, string> = {
                  work: "#34d399",
                  weekly_off: "#94a3b8",
                  leave: "#fbbf24",
                  comp_off: "#38bdf8",
                  holiday: "#c084fc",
                };

                return (
                  <div
                    key={d.dayNum}
                    onClick={() =>
                      status &&
                      setEditModalData({
                        employeeId: selectedEmployee.id,
                        employeeName: selectedEmployee.name,
                        date: d.dateStr,
                        currentStatus: status,
                        isLocked,
                      })
                    }
                    style={{
                      background: status ? bgColors[status] : "var(--bg-main)",
                      border: `1px solid ${status ? textColors[status] + "44" : "var(--border-subtle)"}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "0.4rem 0.2rem",
                      textAlign: "center",
                      cursor: status ? "pointer" : "default",
                      position: "relative",
                      transition: "transform 0.1s ease",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: d.isWeekend ? "#f87171" : "var(--text-primary)" }}>
                      {d.dayNum}
                    </div>
                    <div style={{ fontSize: "0.625rem", fontWeight: 700, color: status ? textColors[status] : "var(--text-muted)", marginTop: "2px" }}>
                      {status ? status.toUpperCase().slice(0, 3) : "–"}
                    </div>
                    {isLocked && <div className="locked-indicator" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editModalData && roster && (
        <ShiftEditModal
          rosterId={roster.id}
          employeeId={editModalData.employeeId}
          employeeName={editModalData.employeeName}
          date={editModalData.date}
          currentStatus={editModalData.currentStatus}
          isLocked={editModalData.isLocked}
          onClose={() => setEditModalData(null)}
          onSuccess={() => {
            setEditModalData(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
