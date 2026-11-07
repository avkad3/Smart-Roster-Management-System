import { useState, useMemo } from "react";
import type { Employee, Pod, Brand, Process, Assignment, Roster, EntryStatus } from "../types";
import { SearchIcon, LockIcon } from "./Icons";
import { ShiftEditModal } from "./ShiftEditModal";

interface CompanyViewProps {
  roster: Roster | null;
  employees: Employee[];
  pods: Pod[];
  brands: Brand[];
  processes: Process[];
  assignments: Assignment[];
  yearMonth: { y: number; m: number };
  workDays: Record<number, number>;
  onRefresh: () => void;
}

export function CompanyView({
  roster,
  employees,
  pods,
  brands,
  processes,
  assignments,
  yearMonth,
  workDays,
  onRefresh,
}: CompanyViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPod, setSelectedPod] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");

  const [editModalData, setEditModalData] = useState<{
    employeeId: number;
    employeeName: string;
    date: string;
    currentStatus: EntryStatus;
    isLocked: boolean;
  } | null>(null);

  // Month days array
  const daysInMonth = useMemo(() => {
    const total = new Date(yearMonth.y, yearMonth.m, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i + 1;
      const d = new Date(yearMonth.y, yearMonth.m - 1, dayNum);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayStr = `${yearMonth.y}-${String(yearMonth.m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      return {
        dayNum,
        dayName: dayNames[d.getDay()],
        isWeekend,
        dateStr: dayStr,
      };
    });
  }, [yearMonth]);

  // Fast entry lookup: `${employee_id}|${date}` -> RosterEntry
  const entryMap = useMemo(() => {
    const map = new Map<string, any>();
    if (roster?.entries) {
      for (const e of roster.entries) {
        map.set(`${e.employee_id}|${e.date}`, e);
      }
    }
    return map;
  }, [roster]);

  // Pod map
  const podMap = useMemo(() => new Map(pods.map((p) => [p.id, p.name])), [pods]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (!e.active) return false;
      if (searchTerm && !e.name.toLowerCase().includes(searchTerm.toLowerCase()) && !e.email.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (selectedPod && String(e.pod_id) !== selectedPod) return false;
      if (selectedBrand) {
        const hasBrand = assignments.some((a) => a.employee_id === e.id && String(a.brand_id) === selectedBrand);
        if (!hasBrand) return false;
      }
      if (selectedProcess) {
        const hasProcess = assignments.some(
          (a) =>
            a.employee_id === e.id &&
            String(a.process_id) === selectedProcess &&
            (!selectedBrand || String(a.brand_id) === selectedBrand)
        );
        if (!hasProcess) return false;
      }
      return true;
    });
  }, [employees, searchTerm, selectedPod, selectedBrand, selectedProcess, assignments]);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Filter and Legend Bar */}
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          {/* Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <SearchIcon size={15} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search employee..."
                className="input-field"
                style={{ paddingLeft: "32px", width: "190px" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select className="select-field" value={selectedPod} onChange={(e) => setSelectedPod(e.target.value)}>
              <option value="">All Pods</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>
                  Pod {p.name}
                </option>
              ))}
            </select>

            <select className="select-field" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select className="select-field" value={selectedProcess} onChange={(e) => setSelectedProcess(e.target.value)}>
              <option value="">All Processes</option>
              {processes.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </select>

            {(searchTerm || selectedPod || selectedBrand || selectedProcess) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedPod("");
                  setSelectedBrand("");
                  setSelectedProcess("");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Shift Code Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.75rem" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Legend:</span>
            <span className="shift-pill shift-work" style={{ width: "auto", padding: "0.15rem 0.5rem", cursor: "default" }}>
              W = Work
            </span>
            <span className="shift-pill shift-off" style={{ width: "auto", padding: "0.15rem 0.5rem", cursor: "default" }}>
              OFF = Off
            </span>
            <span className="shift-pill shift-leave" style={{ width: "auto", padding: "0.15rem 0.5rem", cursor: "default" }}>
              L = Leave
            </span>
            <span className="shift-pill shift-comp_off" style={{ width: "auto", padding: "0.15rem 0.5rem", cursor: "default" }}>
              CO = Comp-off
            </span>
            <span className="shift-pill shift-holiday" style={{ width: "auto", padding: "0.15rem 0.5rem", cursor: "default" }}>
              H = Holiday
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", color: "#38bdf8" }}>
              <LockIcon size={12} /> = Locked Edit
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-wrapper" style={{ maxHeight: "72vh" }}>
        <table className="roster-table">
          <thead>
            <tr>
              <th className="sticky-col">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Employee / Pod</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    {filteredEmployees.length} staff
                  </span>
                </div>
              </th>
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
            {filteredEmployees.map((emp) => {
              const podName = emp.pod_id ? podMap.get(emp.pod_id) : "Unassigned";
              const totalDaysWorked = workDays[emp.id] ?? 0;

              return (
                <tr key={emp.id}>
                  <td className="sticky-col">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-strong)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--primary)",
                        }}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: "0.825rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {emp.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span style={{ fontSize: "0.675rem", color: "var(--text-muted)" }}>
                            Pod {podName}
                          </span>
                          <span style={{ fontSize: "0.675rem", color: "var(--primary)", fontWeight: 600 }}>
                            • {totalDaysWorked}d
                          </span>
                        </div>
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
                            title={`${emp.name} on ${d.dateStr}: ${status.toUpperCase()} (Click to edit)`}
                          >
                            {statusShort[status] || status}
                            {isLocked && <div className="locked-indicator" />}
                          </div>
                        ) : (
                          <div
                            className="shift-empty"
                            onClick={() =>
                              roster &&
                              setEditModalData({
                                employeeId: emp.id,
                                employeeName: emp.name,
                                date: d.dateStr,
                                currentStatus: "work",
                                isLocked: false,
                              })
                            }
                            style={{ cursor: roster ? "pointer" : "default" }}
                          >
                            –
                          </div>
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

      {filteredEmployees.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          No employees match the selected criteria.
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
