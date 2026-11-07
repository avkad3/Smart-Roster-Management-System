import { useState, useMemo } from "react";
import type { Employee, Pod, Roster, EntryStatus } from "../types";
import { ShiftEditModal } from "./ShiftEditModal";

interface PodViewProps {
  roster: Roster | null;
  employees: Employee[];
  pods: Pod[];
  yearMonth: { y: number; m: number };
  workDays: Record<number, number>;
  onRefresh: () => void;
}

export function PodView({
  roster,
  employees,
  pods,
  yearMonth,
  workDays,
  onRefresh,
}: PodViewProps) {
  const [activePodId, setActivePodId] = useState<number>(pods[0]?.id || 1);

  const [editModalData, setEditModalData] = useState<{
    employeeId: number;
    employeeName: string;
    date: string;
    currentStatus: EntryStatus;
    isLocked: boolean;
  } | null>(null);

  const daysInMonth = useMemo(() => {
    const total = new Date(yearMonth.y, yearMonth.m, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i + 1;
      const d = new Date(yearMonth.y, yearMonth.m - 1, dayNum);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayStr = `${yearMonth.y}-${String(yearMonth.m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      return { dayNum, dayName: dayNames[d.getDay()], isWeekend, dateStr: dayStr };
    });
  }, [yearMonth]);

  const entryMap = useMemo(() => {
    const map = new Map<string, any>();
    if (roster?.entries) {
      for (const e of roster.entries) {
        map.set(`${e.employee_id}|${e.date}`, e);
      }
    }
    return map;
  }, [roster]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Selected pod data
  const currentPod = pods.find((p) => p.id === activePodId) || pods[0];
  const podLead = currentPod?.lead_id ? empMap.get(currentPod.lead_id) : null;
  const podEmployees = employees.filter((e) => e.pod_id === currentPod?.id && e.active);

  const statusShort: Record<string, string> = {
    work: "W",
    weekly_off: "OFF",
    leave: "L",
    comp_off: "CO",
    holiday: "H",
  };

  const statusClass: Record<string, string> = {
    work: "shift-work",
    weekly_off: "shift-off",
    leave: "shift-leave",
    comp_off: "shift-comp_off",
    holiday: "shift-holiday",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Pod Selector Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        {pods.map((p) => {
          const lead = p.lead_id ? empMap.get(p.lead_id) : null;
          const members = employees.filter((e) => e.pod_id === p.id && e.active);
          const isSelected = p.id === currentPod?.id;

          return (
            <div
              key={p.id}
              onClick={() => setActivePodId(p.id)}
              className="entity-card"
              style={{
                cursor: "pointer",
                borderColor: isSelected ? "var(--primary)" : "var(--border-subtle)",
                background: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
                boxShadow: isSelected ? "0 0 15px var(--primary-glow)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: isSelected ? "var(--primary)" : "var(--bg-surface-hover)",
                      color: isSelected ? "#fff" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "1rem" }}>Pod {p.name}</h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {members.length} team members
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="badge badge-published" style={{ fontSize: "0.65rem" }}>
                    Active
                  </span>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.775rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Pod Lead:</span>
                <span style={{ fontWeight: 600, color: lead ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {lead ? lead.name : "Unassigned"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Pod Schedule Section */}
      {currentPod && (
        <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                Pod {currentPod.name} Operational Roster
                <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)", background: "rgba(99,102,241,0.15)", color: "var(--primary)" }}>
                  Lead: {podLead?.name || "None"}
                </span>
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Showing schedules for all {podEmployees.length} employees under Pod {currentPod.name}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Click any cell to edit schedule</span>
            </div>
          </div>

          <div className="table-wrapper" style={{ maxHeight: "60vh" }}>
            <table className="roster-table">
              <thead>
                <tr>
                  <th className="sticky-col">Employee Role</th>
                  {daysInMonth.map((d) => (
                    <th key={d.dayNum} className={d.isWeekend ? "weekend-cell" : ""}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{d.dayNum}</div>
                      <div style={{ fontSize: "0.65rem", color: d.isWeekend ? "#f87171" : "var(--text-muted)" }}>
                        {d.dayName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {podEmployees.map((emp) => {
                  const isLead = emp.id === currentPod.lead_id;
                  const totalDays = workDays[emp.id] ?? 0;

                  return (
                    <tr key={emp.id}>
                      <td className="sticky-col">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.825rem" }}>{emp.name}</span>
                              {isLead && (
                                <span className="badge badge-validated" style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem" }}>
                                  LEAD
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.675rem", color: "var(--primary)" }}>
                              {totalDays} days rostered
                            </span>
                          </div>
                        </div>
                      </td>
                      {daysInMonth.map((d) => {
                        const entry = entryMap.get(`${emp.id}|${d.dateStr}`);
                        const status = entry?.status;
                        const isLocked = entry?.locked ?? false;

                        return (
                          <td key={d.dayNum} className={d.isWeekend ? "weekend-cell" : ""}>
                            {status ? (
                              <div
                                className={`shift-pill ${statusClass[status] || ""}`}
                                onClick={() =>
                                  setEditModalData({
                                    employeeId: emp.id,
                                    employeeName: emp.name,
                                    date: d.dateStr,
                                    currentStatus: status,
                                    isLocked,
                                  })
                                }
                                title={`${emp.name} on ${d.dateStr}: ${status.toUpperCase()}`}
                              >
                                {statusShort[status] || status}
                                {isLocked && <div className="locked-indicator" />}
                              </div>
                            ) : (
                              <div className="shift-empty">–</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
