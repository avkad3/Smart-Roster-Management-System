import { useState } from "react";
import {
  CalendarIcon,
  RefreshCwIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LockIcon,
  UsersIcon,
  BuildingIcon,
  LayersIcon,
  UserCheckIcon,
  SparklesIcon,
  SlidersIcon,
} from "./Icons";
import { setAdminToken, getAdminToken } from "../api";

interface NavbarProps {
  yearMonth: { y: number; m: number };
  onYearMonthChange: (ym: { y: number; m: number }) => void;
  status: "draft" | "validated" | "published" | "none";
  isBusy: boolean;
  canPublish: boolean;
  onGenerate: () => void;
  onPublish: () => void;
  exportUrl: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navbar({
  yearMonth,
  onYearMonthChange,
  status,
  isBusy,
  canPublish,
  onGenerate,
  onPublish,
  exportUrl,
  activeTab,
  onTabChange,
}: NavbarProps) {
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [token, setToken] = useState(getAdminToken());

  const handlePrevMonth = () => {
    let { y, m } = yearMonth;
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
    onYearMonthChange({ y, m });
  };

  const handleNextMonth = () => {
    let { y, m } = yearMonth;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    onYearMonthChange({ y, m });
  };

  const monthString = `${yearMonth.y}-${String(yearMonth.m).padStart(2, "0")}`;

  const tabs = [
    { id: "company", label: "Company View", icon: CalendarIcon },
    { id: "pods", label: "Pod-Wise", icon: UsersIcon },
    { id: "brands", label: "Brand-Wise", icon: BuildingIcon },
    { id: "processes", label: "Process-Wise", icon: LayersIcon },
    { id: "employee", label: "Employee Card", icon: UserCheckIcon },
    { id: "what-if", label: "What-If Simulator", icon: SparklesIcon },
    { id: "conflicts", label: "Conflicts & Audit", icon: AlertTriangleIcon },
    { id: "master", label: "Master Data", icon: SlidersIcon },
  ];

  return (
    <header className="top-nav-container">
      {/* Tier 1: Branding, Context & Global Action Controls */}
      <div className="top-nav-main">
        <div className="top-nav-left">
          <div className="brand-badge">
            <div className="brand-icon-box">
              <CalendarIcon size={20} />
            </div>
            <div>
              <div className="brand-title">
                Smart Roster Management System
                <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                  v2.0
                </span>
              </div>
              <div className="brand-subtitle">D2C Operations Scheduling Engine</div>
            </div>
          </div>

          {/* Month Picker Control */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--bg-main)", padding: "0.2rem 0.45rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <button onClick={handlePrevMonth} className="btn btn-ghost btn-sm" style={{ padding: "0.15rem 0.4rem" }} title="Previous Month">
              ‹
            </button>
            <input
              type="month"
              className="input-field"
              style={{ padding: "0.15rem 0.4rem", fontSize: "0.825rem", border: "none", background: "transparent" }}
              value={monthString}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                if (y && m) onYearMonthChange({ y, m });
              }}
            />
            <button onClick={handleNextMonth} className="btn btn-ghost btn-sm" style={{ padding: "0.15rem 0.4rem" }} title="Next Month">
              ›
            </button>
          </div>

          {/* Roster Status Pill */}
          <div>
            {status === "published" && (
              <span className="badge badge-published">
                <CheckCircleIcon size={12} /> Published
              </span>
            )}
            {status === "validated" && (
              <span className="badge badge-validated">
                <CheckCircleIcon size={12} /> Validated (Draft)
              </span>
            )}
            {status === "draft" && (
              <span className="badge badge-draft">
                <AlertTriangleIcon size={12} /> Draft (Has Gaps)
              </span>
            )}
            {status === "none" && (
              <span className="badge" style={{ background: "rgba(100,116,139,0.2)", color: "#94a3b8" }}>
                No Roster
              </span>
            )}
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="top-nav-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={onGenerate}
            disabled={isBusy}
            title="Auto-generate or regenerate the monthly roster adhering to all constraints"
          >
            <RefreshCwIcon size={13} className={isBusy ? "animate-pulse" : ""} />
            {isBusy ? "Optimizing…" : "Generate Roster"}
          </button>

          <button
            className="btn btn-success btn-sm"
            onClick={onPublish}
            disabled={isBusy || !canPublish}
            title={canPublish ? "Publish this validated roster" : "Must have 0 critical conflicts to publish"}
          >
            <CheckCircleIcon size={13} />
            Publish
          </button>

          {exportUrl && (
            <a href={exportUrl} className="btn btn-secondary btn-sm" download title="Download CSV roster">
              <DownloadIcon size={13} />
              CSV
            </a>
          )}

          {/* Admin Token Toggle */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowTokenInput(!showTokenInput)}
            title="Admin Security Token"
          >
            <LockIcon size={13} />
          </button>

          {showTokenInput && (
            <div style={{ position: "absolute", top: "54px", right: "20px", background: "var(--bg-surface-elevated)", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)", zIndex: 100, boxShadow: "var(--shadow-lg)", display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                placeholder="Admin Token"
                className="input-field"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setAdminToken(e.target.value);
                }}
              />
              <button className="btn btn-sm btn-secondary" onClick={() => setShowTokenInput(false)}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Dedicated Navigation Tabs Bar */}
      <div className="top-nav-sub">
        <div className="nav-tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`nav-tab-btn ${activeTab === t.id ? "active" : ""}`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
