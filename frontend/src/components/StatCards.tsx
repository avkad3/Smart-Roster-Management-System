import {
  UsersIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  BuildingIcon,
} from "./Icons";
import type { ValidationReport } from "../types";

interface StatCardsProps {
  report: ValidationReport | null;
  totalEmployees: number;
  totalBrands: number;
  singleResourceCount: number;
  onNavigateConflicts: (filter?: "critical" | "warning") => void;
}

export function StatCards({
  report,
  totalEmployees,
  totalBrands,
  singleResourceCount,
  onNavigateConflicts,
}: StatCardsProps) {
  const critCount = report?.issues.filter((i) => i.severity === "critical").length ?? 0;
  const warnCount = report?.issues.filter((i) => i.severity !== "critical").length ?? 0;
  const cov = report?.coverage ?? [];
  const okCov = cov.filter((c) => c.working >= c.required).length;
  const covPct = cov.length > 0 ? Math.round((100 * okCov) / cov.length) : null;

  return (
    <div className="stats-grid">
      {/* Total Employees */}
      <div className="stat-card">
        <div className="stat-header">
          <span>Active Team</span>
          <UsersIcon size={16} color="var(--primary)" />
        </div>
        <div className="stat-value">
          {totalEmployees}
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
            staff members
          </span>
        </div>
        <div className="stat-sub">Across 4 operational pods with designated leads</div>
      </div>

      {/* Coverage Satisfaction */}
      <div className="stat-card">
        <div className="stat-header">
          <span>Coverage Health</span>
          <ShieldCheckIcon size={16} color={covPct === 100 ? "var(--success)" : "var(--warning)"} />
        </div>
        <div className="stat-value">
          {covPct !== null ? `${covPct}%` : "–"}
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {cov.length ? `${okCov} / ${cov.length} slots` : "No roster"}
          </span>
        </div>
        {covPct !== null && (
          <div style={{ width: "100%", height: "6px", background: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden", marginTop: "4px" }}>
            <div
              style={{
                width: `${covPct}%`,
                height: "100%",
                background: covPct === 100 ? "var(--success)" : covPct > 80 ? "var(--warning)" : "var(--danger)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}
      </div>

      {/* Critical Conflicts */}
      <div
        className="stat-card"
        style={{ cursor: "pointer", borderLeft: critCount > 0 ? "4px solid var(--danger)" : undefined }}
        onClick={() => onNavigateConflicts("critical")}
        title="Click to view critical issues"
      >
        <div className="stat-header">
          <span>Critical Gaps</span>
          <AlertCircleIcon size={16} color={critCount > 0 ? "var(--danger)" : "var(--success)"} />
        </div>
        <div className="stat-value" style={{ color: critCount > 0 ? "#f87171" : "var(--text-primary)" }}>
          {critCount}
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
            blocking issues
          </span>
        </div>
        <div className="stat-sub">
          {critCount === 0 ? "All mandatory constraints satisfied ✓" : "Requires manager resolution"}
        </div>
      </div>

      {/* Preference Warnings */}
      <div
        className="stat-card"
        style={{ cursor: "pointer", borderLeft: warnCount > 0 ? "4px solid var(--warning)" : undefined }}
        onClick={() => onNavigateConflicts("warning")}
        title="Click to view preference warnings"
      >
        <div className="stat-header">
          <span>Preference Alerts</span>
          <AlertTriangleIcon size={16} color="var(--warning)" />
        </div>
        <div className="stat-value" style={{ color: warnCount > 0 ? "#fbbf24" : "var(--text-primary)" }}>
          {warnCount}
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
            soft conflicts
          </span>
        </div>
        <div className="stat-sub">Preferred weekly off or soft constraints overridden</div>
      </div>

      {/* Brand Portfolio Distribution */}
      <div className="stat-card">
        <div className="stat-header">
          <span>Brands Architecture</span>
          <BuildingIcon size={16} color="var(--purple)" />
        </div>
        <div className="stat-value">
          {totalBrands}
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
            D2C accounts
          </span>
        </div>
        <div className="stat-sub">
          {singleResourceCount} Dedicated 80% • {totalBrands - singleResourceCount} Multi-Resource 20%
        </div>
      </div>
    </div>
  );
}
