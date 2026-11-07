import { useState, useMemo } from "react";
import type { ValidationReport, Issue } from "../types";
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, SearchIcon } from "./Icons";

interface ConflictsDrawerProps {
  report: ValidationReport | null;
  initialFilter?: "all" | "critical" | "warning";
}

export function ConflictsDrawer({ report, initialFilter = "all" }: ConflictsDrawerProps) {
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning">(initialFilter);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const issues: Issue[] = report?.issues ?? [];

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity !== "critical").length;

  // Available unique codes
  const uniqueCodes = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.code)));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (severityFilter === "critical" && issue.severity !== "critical") return false;
      if (severityFilter === "warning" && issue.severity === "critical") return false;
      if (selectedCode && issue.code !== selectedCode) return false;
      if (searchTerm && !issue.message.toLowerCase().includes(searchTerm.toLowerCase()) && !issue.code.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [issues, severityFilter, selectedCode, searchTerm]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircleIcon size={20} color="var(--primary)" />
              Conflict Detection & Audit Diagnostic Center
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Comprehensive validation engine separating hard constraints (mandatory client SLAs) from soft constraints (employee off-day preferences).
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                background: "var(--danger-bg)",
                border: "1px solid var(--danger-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertCircleIcon size={16} color="#f87171" />
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f87171" }}>{criticalCount}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>CRITICAL GAPS</div>
              </div>
            </div>

            <div
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                background: "var(--warning-bg)",
                border: "1px solid var(--warning-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertTriangleIcon size={16} color="#fbbf24" />
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fbbf24" }}>{warningCount}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>PREFERENCE ALERTS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className={`btn btn-sm ${severityFilter === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSeverityFilter("all")}
            >
              All Issues ({issues.length})
            </button>
            <button
              className={`btn btn-sm ${severityFilter === "critical" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSeverityFilter("critical")}
            >
              Critical Hard Constraints ({criticalCount})
            </button>
            <button
              className={`btn btn-sm ${severityFilter === "warning" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSeverityFilter("warning")}
            >
              Preference Warnings ({warningCount})
            </button>

            {uniqueCodes.length > 0 && (
              <select
                className="select-field"
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
              >
                <option value="">All Categories</option>
                {uniqueCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <SearchIcon size={14} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search issues..."
              className="input-field"
              style={{ paddingLeft: "30px", width: "220px", fontSize: "0.8rem" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredIssues.map((issue, idx) => {
          const isCrit = issue.severity === "critical";

          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: "1rem 1.25rem",
                borderLeft: `4px solid ${isCrit ? "var(--danger)" : "var(--warning)"}`,
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className={`badge ${isCrit ? "badge-critical" : "badge-warning"}`}>
                    {isCrit ? "MANDATORY CONSTRAINT" : "PREFERENCE WARNING"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: isCrit ? "#fca5a5" : "#fef08a",
                      background: "var(--bg-main)",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                    }}
                  >
                    {issue.code}
                  </span>
                </div>

                {issue.date && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Date: {issue.date}
                  </span>
                )}
              </div>

              <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", marginTop: "0.25rem" }}>
                {issue.message}
              </div>

              {/* Actionable Recommendation */}
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--bg-main)", padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid var(--border-subtle)", marginTop: "0.25rem" }}>
                <strong style={{ color: "var(--text-secondary)" }}>Engine Recommendation: </strong>
                {issue.code === "COVERAGE_GAP" && "Assign an available floater from the same pod or adjust client calendar rules."}
                {issue.code === "LEAVE_CONFLICT" && "Employee is rostered while on approved leave. Re-toggle shift to Leave or Off."}
                {issue.code === "MAX_CONSECUTIVE" && "Insert a weekly off to prevent employee burnout beyond maximum consecutive days."}
                {issue.code === "WEEKLY_OFF_MISSING" && "Ensure at least 1 mandatory rest day per 7-day rolling window."}
                {issue.code === "PREFERENCE" && "Soft constraint: consider swapping off day if client coverage allows."}
              </div>
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <CheckCircleIcon size={36} color="var(--success)" style={{ marginBottom: "0.5rem" }} />
            <h4 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>Zero Conflicts Found!</h4>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {issues.length === 0
                ? "This monthly roster satisfies all client coverage rules, leave constraints, and rest day policies."
                : "No issues match the selected filters."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
