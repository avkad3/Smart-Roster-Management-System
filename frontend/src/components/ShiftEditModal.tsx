import { useState } from "react";
import { XIcon, CheckCircleIcon, AlertCircleIcon, LockIcon } from "./Icons";
import type { EntryStatus, ValidationReport } from "../types";
import { api } from "../api";

interface ShiftEditModalProps {
  rosterId: number;
  employeeId: number;
  employeeName: string;
  date: string;
  currentStatus: EntryStatus;
  isLocked: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShiftEditModal({
  rosterId,
  employeeId,
  employeeName,
  date,
  currentStatus,
  isLocked,
  onClose,
  onSuccess,
}: ShiftEditModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<EntryStatus>(currentStatus);
  const [previewResult, setPreviewResult] = useState<ValidationReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const statusOptions: { value: EntryStatus; label: string; desc: string; color: string }[] = [
    { value: "work", label: "Work (W)", desc: "Employee is actively on duty", color: "var(--success)" },
    { value: "weekly_off", label: "Weekly Off (OFF)", desc: "Scheduled weekly rest day", color: "var(--text-muted)" },
    { value: "leave", label: "Planned Leave (L)", desc: "Approved paid or unpaid leave", color: "var(--warning)" },
    { value: "comp_off", label: "Compensatory Off (CO)", desc: "Comp-off credited for extra hours", color: "var(--info)" },
    { value: "holiday", label: "Public Holiday (H)", desc: "National or regional holiday off", color: "var(--purple)" },
  ];

  const handlePreview = async () => {
    setIsChecking(true);
    setErrorMessage("");
    try {
      const rep = await api.editShift(rosterId, employeeId, date, selectedStatus, true);
      setPreviewResult(rep);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to preview validation");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage("");
    try {
      await api.editShift(rosterId, employeeId, date, selectedStatus, false);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save shift modification");
    } finally {
      setIsSaving(false);
    }
  };

  const criticals = previewResult?.issues.filter((i) => i.severity === "critical") ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: "1.1rem" }}>Modify Shift Assignment</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {employeeName} • {date} {isLocked && "(Currently Manually Locked)"}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          {errorMessage && (
            <div style={{ padding: "0.75rem", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-md)", color: "#f87171", fontSize: "0.85rem" }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Select New Shift Status:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
              {statusOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    setSelectedStatus(opt.value);
                    setPreviewResult(null);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${selectedStatus === opt.value ? opt.color : "var(--border-strong)"}`,
                    background: selectedStatus === opt.value ? "var(--bg-surface-hover)" : "var(--bg-surface)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: opt.color, fontSize: "0.9rem" }}>{opt.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{opt.desc}</div>
                  </div>
                  {selectedStatus === opt.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Validation Impact Preview Box */}
          {previewResult && (
            <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: criticals.length > 0 ? "var(--danger-bg)" : "var(--success-bg)", border: `1px solid ${criticals.length > 0 ? "var(--danger-border)" : "var(--success-border)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem", color: criticals.length > 0 ? "#f87171" : "#34d399", marginBottom: "0.5rem" }}>
                {criticals.length > 0 ? (
                  <>
                    <AlertCircleIcon size={16} /> Warning: {criticals.length} Critical Issue(s) will be created!
                  </>
                ) : (
                  <>
                    <CheckCircleIcon size={16} /> Validation Passed: Roster remains fully compliant
                  </>
                )}
              </div>
              {criticals.length > 0 && (
                <ul style={{ fontSize: "0.775rem", color: "#fca5a5", paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {criticals.slice(0, 3).map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                  {criticals.length > 3 && <li>...and {criticals.length - 3} more issue(s)</li>}
                </ul>
              )}
            </div>
          )}

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <LockIcon size={13} color="#38bdf8" />
            <span>
              Manual modifications are permanently locked and will be protected during subsequent roster regenerations.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handlePreview} disabled={isChecking || isSaving}>
            {isChecking ? "Checking..." : "Preview Impact"}
          </button>
          <button
            className={`btn btn-sm ${criticals.length > 0 ? "btn-danger" : "btn-primary"}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : criticals.length > 0 ? "Apply Anyway" : "Apply & Lock Shift"}
          </button>
        </div>
      </div>
    </div>
  );
}
