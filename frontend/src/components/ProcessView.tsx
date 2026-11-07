import { useState, useMemo } from "react";
import type { Process, Brand, OperatingRule, ValidationReport } from "../types";
import { LayersIcon } from "./Icons";

interface ProcessViewProps {
  processes: Process[];
  brands: Brand[];
  rules: OperatingRule[];
  report: ValidationReport | null;
  yearMonth: { y: number; m: number };
}

export function ProcessView({
  processes,
  brands,
  rules,
  report,
  yearMonth,
}: ProcessViewProps) {
  const [selectedProcessId, setSelectedProcessId] = useState<number>(processes[0]?.id || 1);

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  const daysInMonth = useMemo(() => {
    const total = new Date(yearMonth.y, yearMonth.m, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i + 1;
      const d = new Date(yearMonth.y, yearMonth.m - 1, dayNum);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dateStr = `${yearMonth.y}-${String(yearMonth.m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      return { dayNum, dayName: dayNames[d.getDay()], isWeekend, dateStr };
    });
  }, [yearMonth]);

  const covMap = useMemo(() => {
    const map = new Map<string, any>();
    if (report?.coverage) {
      for (const c of report.coverage) {
        map.set(`${c.rule_id}|${c.date}`, c);
      }
    }
    return map;
  }, [report]);

  const activeProcess = processes.find((p) => p.id === selectedProcessId) || processes[0];
  const processRules = rules.filter((r) => r.process_id === activeProcess?.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Process Selector Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {processes.map((proc) => {
          const rulesCount = rules.filter((r) => r.process_id === proc.id).length;
          const isSelected = proc.id === activeProcess?.id;

          return (
            <div
              key={proc.id}
              onClick={() => setSelectedProcessId(proc.id)}
              className="entity-card"
              style={{
                cursor: "pointer",
                borderColor: isSelected ? "var(--primary)" : "var(--border-subtle)",
                background: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
                boxShadow: isSelected ? "0 0 15px var(--primary-glow)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: isSelected ? "var(--primary)" : "var(--bg-surface-hover)",
                    color: isSelected ? "#fff" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LayersIcon size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "1.05rem" }}>{proc.name}</h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{proc.description}</span>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem", fontSize: "0.775rem", color: "var(--text-muted)" }}>
                Active in <strong style={{ color: "var(--text-primary)" }}>{rulesCount}</strong> client brands
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Process Cross-Brand Coverage Matrix */}
      {activeProcess && (
        <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LayersIcon size={20} color="var(--primary)" />
              {activeProcess.name} ({activeProcess.description}) — Cross-Brand Staffing Matrix
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Monitoring daily shift staffing levels against minimum client commitments for each brand.
            </p>
          </div>

          <div className="table-wrapper">
            <table className="roster-table">
              <thead>
                <tr>
                  <th className="sticky-col">Brand</th>
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
                {processRules.map((rule) => {
                  const brandName = brandMap.get(rule.brand_id) || `Brand #${rule.brand_id}`;

                  return (
                    <tr key={rule.id}>
                      <td className="sticky-col">
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{brandName}</span>
                          <span style={{ fontSize: "0.675rem", color: "var(--text-muted)" }}>
                            Target: {rule.min_coverage} staff
                          </span>
                        </div>
                      </td>
                      {daysInMonth.map((d) => {
                        const cov = covMap.get(`${rule.id}|${d.dateStr}`);
                        if (!cov) {
                          return (
                            <td key={d.dayNum} className={d.isWeekend ? "weekend-cell" : ""}>
                              <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>–</span>
                            </td>
                          );
                        }

                        const isMet = cov.working >= cov.required;

                        return (
                          <td key={d.dayNum} className={d.isWeekend ? "weekend-cell" : ""}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0.2rem 0.4rem",
                                borderRadius: "4px",
                                fontSize: "0.725rem",
                                fontWeight: 700,
                                background: isMet ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.25)",
                                color: isMet ? "#34d399" : "#f87171",
                                border: `1px solid ${isMet ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.5)"}`,
                              }}
                            >
                              {cov.working}/{cov.required}
                            </div>
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
    </div>
  );
}
