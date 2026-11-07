import { useState, useMemo } from "react";
import type { Employee, Pod, Brand, Process, Assignment, Roster, ImpactResult } from "../types";
import { SparklesIcon, AlertCircleIcon, CheckCircleIcon } from "./Icons";
import { api } from "../api";

interface WhatIfLabProps {
  roster: Roster | null;
  employees: Employee[];
  pods: Pod[];
  brands: Brand[];
  processes: Process[];
  assignments: Assignment[];
  yearMonth: { y: number; m: number };
  onRegenerated: () => void;
}

export function WhatIfLab({
  roster,
  employees,
  pods,
  brands,
  processes,
  assignments,
  yearMonth,
  onRegenerated,
}: WhatIfLabProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [leaveType, setLeaveType] = useState<string>("leave");

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const podMap = useMemo(() => new Map(pods.map((p) => [p.id, p])), [pods]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p.name])), [processes]);

  // Generate date array between startDate and endDate
  const getDateRange = () => {
    if (!startDate) return [];
    const from = new Date(startDate);
    const to = new Date(endDate || startDate);
    const dates: string[] = [];
    for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  };

  const handleSimulate = async () => {
    if (!roster) {
      setActionMessage("Please generate a roster first before running simulations.");
      return;
    }
    if (!selectedEmpId || !startDate) {
      setActionMessage("Please select an employee and at least a start date.");
      return;
    }

    setIsSimulating(true);
    setActionMessage("");
    setImpactResult(null);

    try {
      const dates = getDateRange();
      const res = await api.simulateImpact(roster.id, Number(selectedEmpId), dates, leaveType);
      setImpactResult(res);
    } catch (err: any) {
      setActionMessage(err.message || "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyAndRegenerate = async () => {
    if (!selectedEmpId || !startDate) return;
    setIsApplying(true);
    setActionMessage("");

    try {
      const dates = getDateRange();
      for (const d of dates) {
        await api.createRecord("leaves", {
          employee_id: Number(selectedEmpId),
          date: d,
          type: leaveType,
          approved: true,
        });
      }
      const regenRes = await api.generateRoster(yearMonth.y, yearMonth.m);
      setActionMessage(
        regenRes.valid
          ? "✓ Leave approved and roster successfully re-balanced with zero gaps!"
          : "⚠ Leave approved and roster regenerated. Some coverage gaps require attention."
      );
      setImpactResult(null);
      onRegenerated();
    } catch (err: any) {
      setActionMessage(err.message || "Failed to approve and regenerate");
    } finally {
      setIsApplying(false);
    }
  };

  // Quick preset scenario loaders
  const loadScenario = (type: "single_owner" | "multi_team") => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dStr1 = `${yearMonth.y}-${pad(yearMonth.m)}-12`;
    const dStr2 = `${yearMonth.y}-${pad(yearMonth.m)}-13`;

    if (type === "single_owner") {
      // Find a single resource brand owner
      const firstEmp = employees[0];
      if (firstEmp) {
        setSelectedEmpId(String(firstEmp.id));
        setStartDate(dStr1);
        setEndDate(dStr2);
        setLeaveType("leave");
        setImpactResult(null);
      }
    } else {
      // Find another employee
      const emp = employees[employees.length - 2] || employees[1];
      if (emp) {
        setSelectedEmpId(String(emp.id));
        setStartDate(dStr1);
        setEndDate(dStr1);
        setLeaveType("comp_off");
        setImpactResult(null);
      }
    }
  };

  const selectedEmp = selectedEmpId ? empMap.get(Number(selectedEmpId)) : null;
  const empAssignments = selectedEmp ? assignments.filter((a) => a.employee_id === selectedEmp.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Intro Header */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <SparklesIcon size={20} color="var(--primary)" />
              What-If Availability & Change Scenario Lab
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Test employee leave requests and emergency absences to simulate downstream impact on brand coverage <em>before</em> committing any changes.
            </p>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => loadScenario("single_owner")}>
              Load Scenario: 365-Day Dedicated Owner Leave
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => loadScenario("multi_team")}>
              Load Scenario: Multi-Staff Leave
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div style={{ padding: "0.85rem 1.25rem", borderRadius: "var(--radius-md)", background: "var(--info-bg)", border: "1px solid var(--info-border)", color: "#38bdf8", fontSize: "0.875rem" }}>
          {actionMessage}
        </div>
      )}

      {/* Configuration Card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ fontSize: "1rem" }}>1. Configure Simulated Change</h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                Select Employee:
              </label>
              <select
                className="select-field"
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  setImpactResult(null);
                }}
                style={{ width: "100%" }}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} (Pod {e.pod_id ? podMap.get(e.pod_id)?.name : "None"})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Start Date:
                </label>
                <input
                  type="date"
                  className="input-field"
                  style={{ width: "100%" }}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setImpactResult(null);
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  End Date (Optional):
                </label>
                <input
                  type="date"
                  className="input-field"
                  style={{ width: "100%" }}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setImpactResult(null);
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                Absence Type:
              </label>
              <select
                className="select-field"
                value={leaveType}
                onChange={(e) => {
                  setLeaveType(e.target.value);
                  setImpactResult(null);
                }}
                style={{ width: "100%" }}
              >
                <option value="leave">Planned Annual / Casual Leave</option>
                <option value="comp_off">Compensatory Off</option>
                <option value="unavailable">Unplanned Medical / Emergency</option>
              </select>
            </div>

            {selectedEmp && (
              <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--bg-main)", border: "1px solid var(--border-subtle)", fontSize: "0.775rem" }}>
                <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                  Impacted Client Brands for {selectedEmp.name}:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {empAssignments.map((a) => (
                    <span key={a.id} className="badge badge-draft">
                      {brandMap.get(a.brand_id)} ({procMap.get(a.process_id)})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSimulate}
              disabled={isSimulating || !selectedEmpId || !startDate}
              style={{ marginTop: "0.5rem" }}
            >
              {isSimulating ? "Simulating Impact..." : "Simulate Impact on Coverage"}
            </button>
          </div>
        </div>

        {/* Impact Diff Report */}
        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ fontSize: "1rem" }}>2. Simulation Impact Analysis</h4>

          {!impactResult && !isSimulating && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "220px", color: "var(--text-muted)", textAlign: "center" }}>
              <SparklesIcon size={32} style={{ marginBottom: "0.75rem", opacity: 0.5 }} />
              <p>Configure parameters on the left and click "Simulate Impact"</p>
              <span style={{ fontSize: "0.75rem" }}>Evaluates coverage integrity across all brands in real time.</span>
            </div>
          )}

          {isSimulating && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "220px" }}>
              <span className="animate-pulse" style={{ color: "var(--primary)", fontWeight: 600 }}>
                Crunching constraints across operational calendars...
              </span>
            </div>
          )}

          {impactResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Outcome Banner */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  background: impactResult.new_issues.length === 0 ? "var(--success-bg)" : "var(--danger-bg)",
                  border: `1px solid ${impactResult.new_issues.length === 0 ? "var(--success-border)" : "var(--danger-border)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: impactResult.new_issues.length === 0 ? "#34d399" : "#f87171" }}>
                  {impactResult.new_issues.length === 0 ? (
                    <>
                      <CheckCircleIcon size={18} /> Zero Coverage Gaps Created!
                    </>
                  ) : (
                    <>
                      <AlertCircleIcon size={18} /> {impactResult.new_issues.length} New Coverage Conflict(s) Detected!
                    </>
                  )}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-primary)", marginTop: "0.25rem" }}>
                  {impactResult.new_issues.length === 0
                    ? "Existing pod floaters and redundant staff absorb this absence without breaching any client SLA."
                    : "This employee's absence leaves brands uncovered. Review the gaps and suggested backup resources below."}
                </p>
              </div>

              {/* List of New Issues */}
              {impactResult.new_issues.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "240px", overflowY: "auto" }}>
                  {impactResult.new_issues.map((issue, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-main)",
                        border: "1px solid var(--danger-border)",
                        fontSize: "0.775rem",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#f87171", marginBottom: "0.25rem" }}>
                        {issue.code} • Date: {issue.date}
                      </div>
                      <div style={{ color: "var(--text-primary)" }}>{issue.message}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Approve & Apply Action */}
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Ready to commit? This will record approved leave and re-solve the monthly roster.
                </span>
                <button
                  className="btn btn-success"
                  onClick={handleApplyAndRegenerate}
                  disabled={isApplying}
                >
                  {isApplying ? "Regenerating Roster..." : "Approve & Auto-Regenerate"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
