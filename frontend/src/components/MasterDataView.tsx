import { useState, useMemo } from "react";
import type { Employee, Pod, Brand, Process, Assignment, OperatingRule, Leave, PublicHoliday } from "../types";
import { PlusIcon, TrashIcon, SearchIcon, XIcon } from "./Icons";
import { api } from "../api";

interface MasterDataViewProps {
  employees: Employee[];
  pods: Pod[];
  brands: Brand[];
  processes: Process[];
  assignments: Assignment[];
  rules: OperatingRule[];
  leaves: Leave[];
  holidays: PublicHoliday[];
  onRefresh: () => void;
}

export function MasterDataView({
  employees,
  pods,
  brands,
  processes,
  assignments,
  rules,
  leaves,
  holidays,
  onRefresh,
}: MasterDataViewProps) {
  const [activeEntity, setActiveEntity] = useState<
    "employees" | "brands" | "pods" | "processes" | "assignments" | "rules" | "leaves" | "holidays"
  >("employees");

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Form states for adding new records
  const [empForm, setEmpForm] = useState({ name: "", email: "", pod_id: "", weekly_offs: 1, max_consec: 6 });
  const [brandForm, setBrandForm] = useState({ name: "" });
  const [processForm, setProcessForm] = useState({ name: "", description: "" });
  const [podForm, setPodForm] = useState({ name: "", lead_id: "" });
  const [asgForm, setAsgForm] = useState({ employee_id: "", brand_id: "", process_id: "" });
  const [ruleForm, setRuleForm] = useState({
    brand_id: "",
    process_id: "",
    cal_type: "365",
    min_coverage: 1,
  });
  const [leaveForm, setLeaveForm] = useState({ employee_id: "", date: "", type: "leave" });
  const [holidayForm, setHolidayForm] = useState({ date: "", name: "" });

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
  const podMap = useMemo(() => new Map(pods.map((p) => [p.id, p.name])), [pods]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p.name])), [processes]);

  const handleDelete = async (entity: string, id: number) => {
    if (!confirm(`Are you sure you want to delete this ${entity.slice(0, -1)}?`)) return;
    setIsBusy(true);
    setStatusMessage("");
    try {
      await api.deleteRecord(entity, id);
      setStatusMessage(`Record #${id} successfully removed.`);
      onRefresh();
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to delete record");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeactivate = async (empId: number) => {
    setIsBusy(true);
    try {
      await api.updateRecord("employees", empId, { active: false });
      setStatusMessage("Employee deactivated.");
      onRefresh();
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to update employee");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setStatusMessage("");

    try {
      if (activeEntity === "employees") {
        await api.createRecord("employees", {
          name: empForm.name,
          email: empForm.email,
          pod_id: empForm.pod_id ? Number(empForm.pod_id) : null,
          weekly_offs_per_week: Number(empForm.weekly_offs),
          max_consecutive_days: Number(empForm.max_consec),
          weekly_off_days: [],
          active: true,
        });
      } else if (activeEntity === "brands") {
        await api.createRecord("brands", { name: brandForm.name, active: true });
      } else if (activeEntity === "pods") {
        await api.createRecord("pods", {
          name: podForm.name,
          lead_id: podForm.lead_id ? Number(podForm.lead_id) : null,
        });
      } else if (activeEntity === "processes") {
        await api.createRecord("processes", {
          name: processForm.name,
          description: processForm.description,
        });
      } else if (activeEntity === "assignments") {
        await api.createRecord("assignments", {
          employee_id: Number(asgForm.employee_id),
          brand_id: Number(asgForm.brand_id),
          process_id: Number(asgForm.process_id),
        });
      } else if (activeEntity === "rules") {
        let opDays = [0, 1, 2, 3, 4, 5, 6];
        let holPolicy = "work";
        if (ruleForm.cal_type === "daily_hol_off") {
          holPolicy = "off";
        } else if (ruleForm.cal_type === "mon_sat") {
          opDays = [0, 1, 2, 3, 4, 5];
          holPolicy = "off";
        }
        await api.createRecord("rules", {
          brand_id: Number(ruleForm.brand_id),
          process_id: Number(ruleForm.process_id),
          operating_days: opDays,
          holiday_policy: holPolicy,
          min_coverage: Number(ruleForm.min_coverage),
          coverage_overrides: {},
        });
      } else if (activeEntity === "leaves") {
        await api.createRecord("leaves", {
          employee_id: Number(leaveForm.employee_id),
          date: leaveForm.date,
          type: leaveForm.type,
          approved: true,
        });
      } else if (activeEntity === "holidays") {
        await api.createRecord("holidays", {
          date: holidayForm.date,
          name: holidayForm.name,
        });
      }

      setStatusMessage("New record created successfully.");
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to create record");
    } finally {
      setIsBusy(false);
    }
  };

  const tabs: { id: typeof activeEntity; label: string; count: number }[] = [
    { id: "employees", label: "Employees", count: employees.length },
    { id: "brands", label: "Brands", count: brands.length },
    { id: "pods", label: "Pods", count: pods.length },
    { id: "processes", label: "Processes", count: processes.length },
    { id: "assignments", label: "Assignments", count: assignments.length },
    { id: "rules", label: "Operating Rules", count: rules.length },
    { id: "leaves", label: "Leaves & Comp-Offs", count: leaves.length },
    { id: "holidays", label: "Public Holidays", count: holidays.length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Sub Tabs */}
      <div className="glass-panel" style={{ padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveEntity(t.id);
                setSearchTerm("");
              }}
              className={`btn btn-sm ${activeEntity === t.id ? "btn-primary" : "btn-secondary"}`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setIsAddModalOpen(true)}>
          <PlusIcon size={14} /> Add {activeEntity.slice(0, -1)}
        </button>
      </div>

      {statusMessage && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "var(--info-bg)", border: "1px solid var(--info-border)", color: "#38bdf8", fontSize: "0.85rem" }}>
          {statusMessage}
        </div>
      )}

      {/* Main Table for Active Entity */}
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h4 style={{ textTransform: "capitalize" }}>Master {activeEntity} Database</h4>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <SearchIcon size={14} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder={`Search ${activeEntity}...`}
              className="input-field"
              style={{ paddingLeft: "30px", width: "200px", fontSize: "0.8rem" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper" style={{ maxHeight: "65vh" }}>
          <table className="roster-table" style={{ textAlign: "left" }}>
            <thead>
              <tr>
                {activeEntity === "employees" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Name / Email</th>
                    <th>Pod</th>
                    <th>Status</th>
                    <th>Weekly Offs</th>
                    <th>Max Consec.</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
                {activeEntity === "brands" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Brand Name</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
                {activeEntity === "pods" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Pod Name</th>
                    <th>Designated Lead</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
                {activeEntity === "processes" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Process Code</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
                {activeEntity === "assignments" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Employee</th>
                    <th>Client Brand</th>
                    <th>Process</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
                {activeEntity === "rules" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Client Brand</th>
                    <th>Process</th>
                    <th>Operating Days</th>
                    <th>Holiday Policy</th>
                    <th>Min Staff</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
                {activeEntity === "leaves" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Employee</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
                {activeEntity === "holidays" && (
                  <>
                    <th style={{ textAlign: "left", paddingLeft: "1rem" }}>Date</th>
                    <th>Holiday Name</th>
                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeEntity === "employees" &&
                employees
                  .filter((e) => !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((e) => (
                    <tr key={e.id}>
                      <td style={{ paddingLeft: "1rem" }}>
                        <div style={{ fontWeight: 600 }}>{e.name}</div>
                        <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{e.email}</div>
                      </td>
                      <td>{e.pod_id ? `Pod ${podMap.get(e.pod_id)}` : "Unassigned"}</td>
                      <td>
                        <span className={`badge ${e.active ? "badge-published" : "badge-draft"}`}>
                          {e.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{e.weekly_offs_per_week} off / wk</td>
                      <td>{e.max_consecutive_days} days max</td>
                      <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                        {e.active && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--warning)" }}
                            onClick={() => handleDeactivate(e.id)}
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--danger)" }}
                          onClick={() => handleDelete("employees", e.id)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

              {activeEntity === "brands" &&
                brands
                  .filter((b) => !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((b) => (
                    <tr key={b.id}>
                      <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{b.name}</td>
                      <td>
                        <span className={`badge ${b.active ? "badge-published" : "badge-draft"}`}>
                          {b.active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--danger)" }}
                          onClick={() => handleDelete("brands", b.id)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

              {activeEntity === "pods" &&
                pods.map((p) => (
                  <tr key={p.id}>
                    <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>Pod {p.name}</td>
                    <td>{p.lead_id ? empMap.get(p.lead_id) : "Unassigned"}</td>
                    <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete("pods", p.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

              {activeEntity === "processes" &&
                processes.map((pr) => (
                  <tr key={pr.id}>
                    <td style={{ paddingLeft: "1rem", fontWeight: 700, color: "var(--primary)" }}>{pr.name}</td>
                    <td>{pr.description}</td>
                    <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete("processes", pr.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

              {activeEntity === "assignments" &&
                assignments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{empMap.get(a.employee_id)}</td>
                    <td>{brandMap.get(a.brand_id)}</td>
                    <td>
                      <span className="badge badge-draft">{procMap.get(a.process_id)}</span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete("assignments", a.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

              {activeEntity === "rules" &&
                rules.map((r) => (
                  <tr key={r.id}>
                    <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{brandMap.get(r.brand_id)}</td>
                    <td>
                      <span className="badge badge-draft">{procMap.get(r.process_id)}</span>
                    </td>
                    <td>{r.operating_days.length === 7 ? "365 Days / All Week" : "Mon - Sat (Sundays Off)"}</td>
                    <td>
                      <span className="badge badge-validated">
                        {r.holiday_policy === "work" ? "Must Work Holidays" : "Holidays Off"}
                      </span>
                    </td>
                    <td>{r.min_coverage} staff</td>
                    <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete("rules", r.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

              {activeEntity === "leaves" &&
                leaves.map((l) => (
                  <tr key={l.id}>
                    <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{empMap.get(l.employee_id)}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{l.date}</td>
                    <td>
                      <span className="badge badge-warning">{l.type.toUpperCase()}</span>
                    </td>
                    <td>
                      <span className="badge badge-published">Approved</span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete("leaves", l.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

              {activeEntity === "holidays" &&
                holidays.map((h) => (
                  <tr key={h.id}>
                    <td style={{ paddingLeft: "1rem", fontFamily: "var(--font-mono)" }}>{h.date}</td>
                    <td style={{ fontWeight: 600 }}>{h.name}</td>
                    <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete("holidays", h.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guided Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ textTransform: "capitalize" }}>Add New {activeEntity.slice(0, -1)}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {activeEntity === "employees" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Full Name:
                      </label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        style={{ width: "100%" }}
                        value={empForm.name}
                        onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Email:
                      </label>
                      <input
                        type="email"
                        required
                        className="input-field"
                        style={{ width: "100%" }}
                        value={empForm.email}
                        onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Assigned Pod:
                      </label>
                      <select
                        className="select-field"
                        style={{ width: "100%" }}
                        value={empForm.pod_id}
                        onChange={(e) => setEmpForm({ ...empForm, pod_id: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {pods.map((p) => (
                          <option key={p.id} value={p.id}>
                            Pod {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {activeEntity === "brands" && (
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                      Brand Name:
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      style={{ width: "100%" }}
                      value={brandForm.name}
                      onChange={(e) => setBrandForm({ name: e.target.value })}
                    />
                  </div>
                )}

                {activeEntity === "pods" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Pod Name:
                      </label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        style={{ width: "100%" }}
                        value={podForm.name}
                        onChange={(e) => setPodForm({ ...podForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Pod Lead (Optional):
                      </label>
                      <select
                        className="select-field"
                        style={{ width: "100%" }}
                        value={podForm.lead_id}
                        onChange={(e) => setPodForm({ ...podForm, lead_id: e.target.value })}
                      >
                        <option value="">None</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {activeEntity === "processes" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Process Code:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CS, ACC, NDR, Retention"
                        className="input-field"
                        style={{ width: "100%" }}
                        value={processForm.name}
                        onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Description:
                      </label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        style={{ width: "100%" }}
                        value={processForm.description}
                        onChange={(e) => setProcessForm({ ...processForm, description: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {activeEntity === "assignments" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Employee:
                      </label>
                      <select
                        required
                        className="select-field"
                        style={{ width: "100%" }}
                        value={asgForm.employee_id}
                        onChange={(e) => setAsgForm({ ...asgForm, employee_id: e.target.value })}
                      >
                        <option value="">-- Choose Employee --</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Brand:
                      </label>
                      <select
                        required
                        className="select-field"
                        style={{ width: "100%" }}
                        value={asgForm.brand_id}
                        onChange={(e) => setAsgForm({ ...asgForm, brand_id: e.target.value })}
                      >
                        <option value="">-- Choose Brand --</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Process:
                      </label>
                      <select
                        required
                        className="select-field"
                        style={{ width: "100%" }}
                        value={asgForm.process_id}
                        onChange={(e) => setAsgForm({ ...asgForm, process_id: e.target.value })}
                      >
                        <option value="">-- Choose Process --</option>
                        {processes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {activeEntity === "rules" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Brand:
                      </label>
                      <select
                        required
                        className="select-field"
                        style={{ width: "100%" }}
                        value={ruleForm.brand_id}
                        onChange={(e) => setRuleForm({ ...ruleForm, brand_id: e.target.value })}
                      >
                        <option value="">-- Choose Brand --</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Process:
                      </label>
                      <select
                        required
                        className="select-field"
                        style={{ width: "100%" }}
                        value={ruleForm.process_id}
                        onChange={(e) => setRuleForm({ ...ruleForm, process_id: e.target.value })}
                      >
                        <option value="">-- Choose Process --</option>
                        {processes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Operating Calendar Rule:
                      </label>
                      <select
                        className="select-field"
                        style={{ width: "100%" }}
                        value={ruleForm.cal_type}
                        onChange={(e) => setRuleForm({ ...ruleForm, cal_type: e.target.value })}
                      >
                        <option value="365">365-day operations (Sundays & Holidays included)</option>
                        <option value="daily_hol_off">Daily operations (Public Holidays off)</option>
                        <option value="mon_sat">Mon-Sat operations (Sundays & Holidays off)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Minimum Coverage Required:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="input-field"
                        style={{ width: "100%" }}
                        value={ruleForm.min_coverage}
                        onChange={(e) => setRuleForm({ ...ruleForm, min_coverage: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}

                {activeEntity === "leaves" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Employee:
                      </label>
                      <select
                        required
                        className="select-field"
                        style={{ width: "100%" }}
                        value={leaveForm.employee_id}
                        onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                      >
                        <option value="">-- Choose Employee --</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Date:
                      </label>
                      <input
                        type="date"
                        required
                        className="input-field"
                        style={{ width: "100%" }}
                        value={leaveForm.date}
                        onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Leave Type:
                      </label>
                      <select
                        className="select-field"
                        style={{ width: "100%" }}
                        value={leaveForm.type}
                        onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                      >
                        <option value="leave">Planned Annual / Casual Leave</option>
                        <option value="comp_off">Compensatory Off</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                  </>
                )}

                {activeEntity === "holidays" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Holiday Date:
                      </label>
                      <input
                        type="date"
                        required
                        className="input-field"
                        style={{ width: "100%" }}
                        value={holidayForm.date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                        Holiday Name:
                      </label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        style={{ width: "100%" }}
                        value={holidayForm.name}
                        onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isBusy}>
                  {isBusy ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
