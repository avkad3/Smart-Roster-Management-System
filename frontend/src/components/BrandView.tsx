import { useState, useMemo } from "react";
import type { Brand, Employee, Process, Assignment, OperatingRule, ValidationReport } from "../types";
import { BuildingIcon, SearchIcon } from "./Icons";

interface BrandViewProps {
  brands: Brand[];
  employees: Employee[];
  processes: Process[];
  assignments: Assignment[];
  rules: OperatingRule[];
  report: ValidationReport | null;
  yearMonth: { y: number; m: number };
}

export function BrandView({
  brands,
  employees,
  processes,
  assignments,
  rules,
  report,
  yearMonth,
}: BrandViewProps) {
  const [filterType, setFilterType] = useState<"all" | "single" | "multi">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);

  // Days in month
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

  // Fast coverage lookup: `${rule_id}|${date}` -> CoverageItem
  const covMap = useMemo(() => {
    const map = new Map<string, any>();
    if (report?.coverage) {
      for (const c of report.coverage) {
        map.set(`${c.rule_id}|${c.date}`, c);
      }
    }
    return map;
  }, [report]);

  // Map each brand to its assigned employees and rules
  const brandDetails = useMemo(() => {
    return brands.map((b) => {
      const brandAssignments = assignments.filter((a) => a.brand_id === b.id);
      const assignedEmpIds = Array.from(new Set(brandAssignments.map((a) => a.employee_id)));
      const assignedEmps = assignedEmpIds.map((id) => empMap.get(id)!).filter(Boolean);
      const brandRules = rules.filter((r) => r.brand_id === b.id);

      // Single vs Multi resource determination
      // Dedicated owner: usually 1 primary dedicated employee (plus possibly pod floaters)
      const isSingleResource = assignedEmpIds.length <= 2; // primary owner (+ optional pod floater)

      return {
        brand: b,
        employees: assignedEmps,
        assignments: brandAssignments,
        rules: brandRules,
        isSingleResource,
      };
    });
  }, [brands, assignments, rules, empMap]);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    return brandDetails.filter((bd) => {
      if (searchTerm && !bd.brand.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterType === "single" && !bd.isSingleResource) return false;
      if (filterType === "multi" && bd.isSingleResource) return false;
      return true;
    });
  }, [brandDetails, searchTerm, filterType]);

  const activeBrandDetail = selectedBrandId
    ? brandDetails.find((bd) => bd.brand.id === selectedBrandId) ?? filteredBrands[0]
    : filteredBrands[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Controls & Category Filter */}
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              className={`btn btn-sm ${filterType === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterType("all")}
            >
              All Brands ({brands.length})
            </button>
            <button
              className={`btn btn-sm ${filterType === "single" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterType("single")}
            >
              80% Single-Resource Dedicated (16)
            </button>
            <button
              className={`btn btn-sm ${filterType === "multi" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterType("multi")}
            >
              20% Multi-Resource Teams (4)
            </button>
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <SearchIcon size={15} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search brand..."
              className="input-field"
              style={{ paddingLeft: "32px", width: "220px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Brand Cards Grid */}
      <div className="cards-grid">
        {filteredBrands.map((bd) => {
          const isSelected = activeBrandDetail?.brand.id === bd.brand.id;
          return (
            <div
              key={bd.brand.id}
              onClick={() => setSelectedBrandId(bd.brand.id)}
              className="entity-card"
              style={{
                cursor: "pointer",
                borderColor: isSelected ? "var(--primary)" : "var(--border-subtle)",
                background: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
                boxShadow: isSelected ? "0 0 15px var(--primary-glow)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{bd.brand.name}</h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {bd.rules.length} operational process rules
                  </span>
                </div>
                {bd.isSingleResource ? (
                  <span className="badge" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
                    Dedicated 80%
                  </span>
                ) : (
                  <span className="badge" style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                    Multi-Team 20%
                  </span>
                )}
              </div>

              {/* Assigned Staff Preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.775rem" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 600 }}>ASSIGNED STAFF:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {bd.employees.map((e) => (
                    <span
                      key={e.id}
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        background: "var(--bg-main)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.725rem",
                      }}
                    >
                      {e.name}
                    </span>
                  ))}
                  {bd.employees.length === 0 && <span style={{ color: "#f87171" }}>No staff assigned!</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Brand Daily Process Coverage Matrix */}
      {activeBrandDetail && (
        <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BuildingIcon size={20} color="var(--primary)" />
                {activeBrandDetail.brand.name} — Monthly Coverage Requirements
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Showing required vs actual working staff for every active process rule across all days of the month.
              </p>
            </div>
            <div>
              {activeBrandDetail.isSingleResource ? (
                <span className="badge badge-published">Dedicated Single Employee Managed</span>
              ) : (
                <span className="badge badge-validated">Shared Multi-Employee Process Allocation</span>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="roster-table">
              <thead>
                <tr>
                  <th className="sticky-col">Process / Calendar Rule</th>
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
                {activeBrandDetail.rules.map((rule) => {
                  const proc = procMap.get(rule.process_id);
                  const is365 = rule.operating_days.length === 7 && rule.holiday_policy === "work";
                  const isSunOff = !rule.operating_days.includes(6);

                  return (
                    <tr key={rule.id}>
                      <td className="sticky-col">
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                            {proc?.name || `Process #${rule.process_id}`}
                          </span>
                          <span style={{ fontSize: "0.675rem", color: "var(--text-muted)" }}>
                            {is365 ? "365 Days (incl. Sun & Hol)" : isSunOff ? "Mon-Sat (Sun & Hol Off)" : "Daily (Holidays Off)"}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "var(--primary)" }}>
                            Min Required: {rule.min_coverage}
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
                              title={`${activeBrandDetail.brand.name} - ${proc?.name} on ${d.dateStr}: Working ${cov.working} / Required ${cov.required}`}
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
