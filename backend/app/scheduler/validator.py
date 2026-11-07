from .constraints import month_days, required

def validate(inp, work):
    """Independent of the solver: any roster (generated or hand-edited) must pass this."""
    days = month_days(inp["year"], inp["month"])
    emps, hol, leaves = inp["employees"], inp["holidays"], inp["leaves"]
    issues, coverage = [], []
    nm = lambda e: emps[e]["name"] if e in emps else f"#{e}"

    def add(sev, code, msg, e=None, d=None, rule=None):
        issues.append(dict(severity=sev, code=code, message=msg, employee_id=e, rule_id=rule,
                           date=d.isoformat() if d else None))

    for (e, d) in sorted(work):
        if e not in emps or not emps[e]["active"]:
            add("critical", "INACTIVE_EMPLOYEE", f"{nm(e)} is inactive but rostered on {d:%d %b}", e, d)
        elif (e, d) in leaves:
            add("critical", "LEAVE_CONFLICT", f"{nm(e)} is rostered on {d:%a %d %b} but has approved {leaves[(e, d)].replace('_', ' ')}", e, d)
    eff = {k for k in work if k[0] in emps and emps[k[0]]["active"] and k not in leaves}

    for r in inp["rules"]:
        for d in days:
            req = required(r, d, hol)
            if req <= 0: continue
            on = [e for e in r["eligible"] if (e, d) in eff]
            coverage.append(dict(rule_id=r["id"], date=d.isoformat(), required=req, working=len(on)))
            if len(on) >= req: continue
            onleave = [nm(e) for e in r["eligible"] if (e, d) in leaves]
            off = [nm(e) for e in r["eligible"] if (e, d) not in leaves and (e, d) not in eff]
            backups = [nm(e) for e, c in emps.items() if c["active"] and e not in r["eligible"]
                       and r["process"] in c["processes"] and (e, d) not in leaves and (e, d) not in eff]
            msg = f"{r['label']} needs {req} on {d:%a %d %b} but only {len(on)} working."
            if not r["eligible"]: msg += " No employee is assigned to this process."
            if onleave: msg += f" On leave: {', '.join(onleave)}."
            if off: msg += f" Off/unscheduled: {', '.join(off)}."
            msg += (f" Possible backups (trained on this process for other brands, needs manager approval): {', '.join(backups[:4])}."
                    if backups else " No trained backup exists: add an assignment or change the coverage requirement.")
            add("critical", "COVERAGE_GAP", msg, None, d, r["id"])

    for e, c in emps.items():
        if not c["active"]: continue
        w = [1 if (e, d) in eff else 0 for d in days]
        if c["offs"] > 0:
            bad = next((i for i in range(len(w) - 6) if sum(w[i:i + 7]) > 7 - c["offs"]), None)
            if bad is not None:
                add("critical", "WEEKLY_OFF_MISSING", f"{nm(e)} has no weekly off in the 7 days from {days[bad]:%d %b}", e, days[bad])
        run = 0
        for i, v in enumerate(w):
            run = run + 1 if v else 0
            if run > c["max_consec"]:
                add("critical", "MAX_CONSECUTIVE", f"{nm(e)} works more than {c['max_consec']} days in a row (ending {days[i]:%d %b})", e, days[i]); break
        pref = [d for d in days if (e, d) in eff and d.weekday() in c["pref_off"]]
        if pref:
            add("warning", "PREFERENCE", f"{nm(e)} works {len(pref)} preferred-off day(s), e.g. {pref[0]:%a %d %b}", e, pref[0])

    issues.sort(key=lambda i: i["severity"] != "critical")
    return dict(valid=not any(i["severity"] == "critical" for i in issues), issues=issues, coverage=coverage,
                work_days={e: sum(1 for d in days if (e, d) in eff) for e in emps})