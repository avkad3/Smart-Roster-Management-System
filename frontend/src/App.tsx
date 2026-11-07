import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "./types";
import { api, getApiBase, setBackendUrl } from "./api";
import { Navbar } from "./components/Navbar";
import { StatCards } from "./components/StatCards";
import { CompanyView } from "./components/CompanyView";
import { PodView } from "./components/PodView";
import { BrandView } from "./components/BrandView";
import { ProcessView } from "./components/ProcessView";
import { EmployeeView } from "./components/EmployeeView";
import { WhatIfLab } from "./components/WhatIfLab";
import { ConflictsDrawer } from "./components/ConflictsDrawer";
import { MasterDataView } from "./components/MasterDataView";

export default function App() {
  const [yearMonth, setYearMonth] = useState({ y: 2026, m: 11 });
  const [activeTab, setActiveTab] = useState<string>("company");
  const [conflictsFilter, setConflictsFilter] = useState<"all" | "critical" | "warning">("all");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rules, setRules] = useState<OperatingRule[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);

  const [roster, setRoster] = useState<Roster | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);

  const [isBusy, setIsBusy] = useState(false);
  const [notification, setNotification] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [
        empsData,
        podsData,
        brandsData,
        procsData,
        asgsData,
        rulesData,
        leavesData,
        holidaysData,
      ] = await Promise.all([
        api.getEmployees(),
        api.getPods(),
        api.getBrands(),
        api.getProcesses(),
        api.getAssignments(),
        api.getRules(),
        api.getLeaves(),
        api.getHolidays(),
      ]);

      setEmployees(empsData);
      setPods(podsData);
      setBrands(brandsData);
      setProcesses(procsData);
      setAssignments(asgsData);
      setRules(rulesData);
      setLeaves(leavesData);
      setHolidays(holidaysData);

      // Load roster for current month
      const rosterList = await api.getRosters(yearMonth.y, yearMonth.m);
      if (rosterList.length > 0) {
        const fullRoster = await api.getRoster(rosterList[0].id);
        const valReport = await api.validateRoster(rosterList[0].id);
        setRoster(fullRoster);
        setReport(valReport);
      } else {
        setRoster(null);
        setReport(null);
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        text: `Failed to connect to backend (${err.message}) at ${getApiBase()}.`,
      });
    }
  }, [yearMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateRoster = async () => {
    setIsBusy(true);
    setNotification(null);
    try {
      const res = await api.generateRoster(yearMonth.y, yearMonth.m);
      await loadData();
      if (res.valid) {
        setNotification({
          type: "success",
          text: "✓ Roster generated and validated! All operational coverage rules and employee rest constraints satisfied.",
        });
      } else {
        setNotification({
          type: "info",
          text: `Roster generated with ${res.issues.length} issue(s). Check the Conflicts & Audit tab to review.`,
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        text: `Generation failed: ${err.message}`,
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePublishRoster = async () => {
    if (!roster) return;
    setIsBusy(true);
    try {
      await api.publishRoster(roster.id);
      await loadData();
      setNotification({
        type: "success",
        text: "✓ Roster successfully published! Operational teams have been notified.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        text: `Publishing failed: ${err.message}`,
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleNavigateConflicts = (filter?: "critical" | "warning") => {
    setConflictsFilter(filter || "all");
    setActiveTab("conflicts");
  };

  const singleResourceCount = useMemo(() => {
    // 80% single-resource dedicated brands calculation
    return brands.filter((b) => {
      const asgs = assignments.filter((a) => a.brand_id === b.id);
      const uniqueEmps = new Set(asgs.map((a) => a.employee_id));
      return uniqueEmps.size <= 2;
    }).length;
  }, [brands, assignments]);

  const canPublish = !!roster && !!report && report.valid && roster.status !== "published";
  const exportUrl = roster ? api.getExportUrl(roster.id) : null;
  const workDays = report?.work_days ?? {};

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Fixed Navigation Bar */}
      <Navbar
        yearMonth={yearMonth}
        onYearMonthChange={setYearMonth}
        status={roster ? roster.status : "none"}
        isBusy={isBusy}
        canPublish={canPublish}
        onGenerate={handleGenerateRoster}
        onPublish={handlePublishRoster}
        exportUrl={exportUrl}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="app-container">
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.875rem",
              background:
                notification.type === "success"
                  ? "var(--success-bg)"
                  : notification.type === "error"
                  ? "var(--danger-bg)"
                  : "var(--info-bg)",
              border: `1px solid ${
                notification.type === "success"
                  ? "var(--success-border)"
                  : notification.type === "error"
                  ? "var(--danger-border)"
                  : "var(--info-border)"
              }`,
              color:
                notification.type === "success"
                  ? "#34d399"
                  : notification.type === "error"
                  ? "#f87171"
                  : "#38bdf8",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span>{notification.text}</span>
              {notification.type === "error" && (
                <button
                  onClick={() => {
                    const current = getApiBase().replace(/\/api$/, "");
                    const input = window.prompt("Enter your live Backend URL (e.g. https://smart-roster-backend.onrender.com):", current);
                    if (input !== null) {
                      setBackendUrl(input);
                      window.location.reload();
                    }
                  }}
                  className="btn btn-sm"
                  style={{
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.75rem",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Configure Backend URL ⚙
                </button>
              )}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="btn btn-ghost btn-sm"
              style={{ color: "inherit", padding: "0.15rem 0.4rem" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Executive Metric Cards */}
        <StatCards
          report={report}
          totalEmployees={employees.filter((e) => e.active).length}
          totalBrands={brands.filter((b) => b.active).length}
          singleResourceCount={singleResourceCount}
          onNavigateConflicts={handleNavigateConflicts}
        />

        {/* Tab 1: Company-Wide View */}
        {activeTab === "company" && (
          <CompanyView
            roster={roster}
            employees={employees}
            pods={pods}
            brands={brands}
            processes={processes}
            assignments={assignments}
            yearMonth={yearMonth}
            workDays={workDays}
            onRefresh={loadData}
          />
        )}

        {/* Tab 2: Pod-Wise View */}
        {activeTab === "pods" && (
          <PodView
            roster={roster}
            employees={employees}
            pods={pods}
            yearMonth={yearMonth}
            workDays={workDays}
            onRefresh={loadData}
          />
        )}

        {/* Tab 3: Brand-Wise View */}
        {activeTab === "brands" && (
          <BrandView
            brands={brands}
            employees={employees}
            processes={processes}
            assignments={assignments}
            rules={rules}
            report={report}
            yearMonth={yearMonth}
          />
        )}

        {/* Tab 4: Process-Wise View */}
        {activeTab === "processes" && (
          <ProcessView
            processes={processes}
            brands={brands}
            rules={rules}
            report={report}
            yearMonth={yearMonth}
          />
        )}

        {/* Tab 5: Employee-Wise Individual Schedule Card */}
        {activeTab === "employee" && (
          <EmployeeView
            roster={roster}
            employees={employees}
            pods={pods}
            brands={brands}
            processes={processes}
            assignments={assignments}
            report={report}
            yearMonth={yearMonth}
            onRefresh={loadData}
          />
        )}

        {/* Tab 6: What-If Scenario Lab & Change Management */}
        {activeTab === "what-if" && (
          <WhatIfLab
            roster={roster}
            employees={employees}
            pods={pods}
            brands={brands}
            processes={processes}
            assignments={assignments}
            yearMonth={yearMonth}
            onRegenerated={loadData}
          />
        )}

        {/* Tab 7: Conflicts & Audit Diagnostic Center */}
        {activeTab === "conflicts" && (
          <ConflictsDrawer report={report} initialFilter={conflictsFilter} />
        )}

        {/* Tab 8: Master Data Management (Employees, Brands, Pods, Rules, etc.) */}
        {activeTab === "master" && (
          <MasterDataView
            employees={employees}
            pods={pods}
            brands={brands}
            processes={processes}
            assignments={assignments}
            rules={rules}
            leaves={leaves}
            holidays={holidays}
            onRefresh={loadData}
          />
        )}
      </main>
    </div>
  );
}
