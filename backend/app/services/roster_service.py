from app import models as M
from app.scheduler.engine import solve
from app.scheduler.validator import validate
from app.scheduler.constraints import month_days

def build_input(db, year, month, extra_leaves=None):
    days = month_days(year, month)
    asg = db.query(M.Assignment).all()
    procs_of, elig = {}, {}
    for a in asg:
        procs_of.setdefault(a.employee_id, set()).add(a.process_id)
        elig.setdefault((a.brand_id, a.process_id), []).append(a.employee_id)
    emps = {e.id: dict(name=e.name, active=e.active, offs=e.weekly_off_days and e.weekly_offs_per_week or e.weekly_offs_per_week,
                       max_consec=e.max_consecutive_days, pref_off=e.weekly_off_days or [], pod=e.pod_id,
                       processes=procs_of.get(e.id, set())) for e in db.query(M.Employee)}
    brands = {b.id: b for b in db.query(M.Brand)}
    procs = {p.id: p.name for p in db.query(M.Process)}
    rules = [dict(id=r.id, brand=r.brand_id, process=r.process_id, label=f"{brands[r.brand_id].name} – {procs[r.process_id]}",
                  days=r.operating_days, policy=r.holiday_policy.value, min=r.min_coverage, over=r.coverage_overrides or {},
                  eligible=elig.get((r.brand_id, r.process_id), []))
             for r in db.query(M.OperatingRule) if brands[r.brand_id].active]
    leaves = {(l.employee_id, l.date): l.type.value for l in db.query(M.Leave)
              .filter(M.Leave.approved == True, M.Leave.date >= days[0], M.Leave.date <= days[-1])}  # noqa: E712
    leaves.update(extra_leaves or {})
    hol = {h.date for h in db.query(M.PublicHoliday).filter(M.PublicHoliday.date >= days[0], M.PublicHoliday.date <= days[-1])}
    return dict(year=year, month=month, employees=emps, rules=rules, leaves=leaves, holidays=hol)

def status_for(inp, e, d, working):
    if working: return M.EntryStatus.WORK
    lv = inp["leaves"].get((e, d))
    if lv: return M.EntryStatus.COMP_OFF if lv == "comp_off" else M.EntryStatus.LEAVE
    return M.EntryStatus.HOLIDAY if d in inp["holidays"] else M.EntryStatus.WEEKLY_OFF

def work_set(db, roster):
    return {(en.employee_id, en.date) for en in db.query(M.RosterEntry)
            .filter_by(roster_id=roster.id, status=M.EntryStatus.WORK)}

def generate(db, year, month, time_limit=20):
    inp = build_input(db, year, month)
    roster = db.query(M.Roster).filter_by(year=year, month=month).order_by(M.Roster.version.desc()).first()
    if not roster:
        roster = M.Roster(year=year, month=month); db.add(roster); db.flush()
    locked = {(en.employee_id, en.date): en.status == M.EntryStatus.WORK
              for en in db.query(M.RosterEntry).filter_by(roster_id=roster.id, locked=True)}
    res = solve(inp, locked, time_limit)
    if res["status"] == "unknown":
        roster.status = M.RosterStatus.DRAFT; db.commit()
        return dict(roster_id=roster.id, status="unknown", valid=False, issues=[dict(
            severity="critical", code="SOLVER_TIMEOUT", employee_id=None, rule_id=None, date=None,
            message="Solver hit its time limit without a result; no roster produced. Increase time_limit or relax constraints.")])
    db.query(M.RosterEntry).filter_by(roster_id=roster.id, locked=False).delete()
    db.flush()
    for e, c in inp["employees"].items():
        if not c["active"]: continue
        for d in month_days(year, month):
            if (e, d) not in locked:
                db.add(M.RosterEntry(roster_id=roster.id, employee_id=e, date=d,
                                     status=status_for(inp, e, d, (e, d) in res["work"])))
    db.flush()
    report = validate(inp, work_set(db, roster))
    ok = report["valid"] and res["status"] == "feasible"
    roster.status = M.RosterStatus.VALIDATED if ok else M.RosterStatus.DRAFT
    db.commit()
    return dict(roster_id=roster.id, status=res["status"], valid=ok, issues=report["issues"])

def validate_roster(db, roster):
    return validate(build_input(db, roster.year, roster.month), work_set(db, roster))

def edit(db, roster, emp_id, day, status, preview):
    st = M.EntryStatus(status)
    inp = build_input(db, roster.year, roster.month)
    new = work_set(db, roster)
    (new.add if st == M.EntryStatus.WORK else new.discard)((emp_id, day))
    report = validate(inp, new)
    if preview: return report
    en = db.query(M.RosterEntry).filter_by(roster_id=roster.id, employee_id=emp_id, date=day).first()
    old = en.status.value if en else None
    if en: en.status, en.locked = st, True
    else: db.add(M.RosterEntry(roster_id=roster.id, employee_id=emp_id, date=day, status=st, locked=True))
    db.add(M.ScheduleChange(roster_id=roster.id, employee_id=emp_id, date=day, old_status=old, new_status=status))
    roster.status = M.RosterStatus.VALIDATED if report["valid"] else M.RosterStatus.DRAFT
    db.commit()
    return report

def impact(db, roster, emp_id, dates, ltype):
    """What-if: would this leave break the CURRENT roster? Nothing is saved."""
    work = work_set(db, roster)
    base = validate(build_input(db, roster.year, roster.month), work)
    after = validate(build_input(db, roster.year, roster.month, {(emp_id, d): ltype for d in dates}), work)
    key = lambda i: (i["code"], i["employee_id"], i["date"], i["rule_id"])
    seen = {key(i) for i in base["issues"]}
    return dict(new_issues=[i for i in after["issues"] if key(i) not in seen], valid_after=after["valid"])