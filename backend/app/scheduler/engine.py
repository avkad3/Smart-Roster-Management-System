from ortools.sat.python import cp_model
from .constraints import month_days, required

def solve(inp, locked=None, time_limit=20):
    """Strict solve; if infeasible, a relaxed solve (coverage slack) gives a best-effort roster
    whose gaps the validator reports. Status is 'infeasible' in that case, never 'feasible'."""
    locked = locked or {}
    res = _run(inp, locked, time_limit, relax=False)
    if res["status"] == "infeasible":
        res = _run(inp, locked, time_limit, relax=True)
        res["status"] = "infeasible"
    return res

def _run(inp, locked, limit, relax):
    days = month_days(inp["year"], inp["month"]); n = len(days)
    emps, rules, hol, leaves = inp["employees"], inp["rules"], inp["holidays"], inp["leaves"]
    m = cp_model.CpModel()
    x = {(e, d): m.NewBoolVar(f"x{e}_{d.day}") for e in emps for d in days}

    need = {e: set() for e in emps}  # days on which any of the employee's rules operate
    for r in rules:
        for d in days:
            if required(r, d, hol) > 0:
                for e in r["eligible"]:
                    if e in need: need[e].add(d)

    for (e, d), v in x.items():
        if not emps[e]["active"] or (e, d) in leaves: m.Add(v == 0)      # leave is never worked
        elif (e, d) in locked: m.Add(v == int(locked[(e, d)]))           # manual edits survive
        elif d not in need[e]: m.Add(v == 0)                             # nothing to cover -> off

    slack = []
    for r in rules:
        for d in days:
            req = required(r, d, hol)
            if req <= 0: continue
            terms = [x[e, d] for e in r["eligible"] if e in emps]
            if relax:
                s = m.NewIntVar(0, req, f"s{r['id']}_{d.day}"); slack.append(s)
                m.Add(sum(terms) + s >= req)
            else:
                if not terms: return {"status": "infeasible", "work": set()}
                m.Add(sum(terms) >= req)                                 # mandatory coverage

    for e, c in emps.items():
        if c["offs"] > 0 and n >= 7:                                     # weekly off in every 7-day window
            for i in range(n - 6):
                m.Add(sum(x[e, days[j]] for j in range(i, i + 7)) <= 7 - c["offs"])
        k = c["max_consec"]
        for i in range(n - k):
            m.Add(sum(x[e, days[j]] for j in range(i, i + k + 1)) <= k)

    obj = [3 * x[e, d] for e, c in emps.items() for d in days if d.weekday() in c["pref_off"]]
    act = [e for e in emps if emps[e]["active"] and need[e]]
    if act:                                                              # fairness: minimise spread
        hi, lo = m.NewIntVar(0, n, "hi"), m.NewIntVar(0, n, "lo")
        for e in act:
            t = sum(x[e, d] for d in days); m.Add(hi >= t); m.Add(lo <= t)
        obj.append(2 * (hi - lo))
    m.Minimize((1000 * sum(slack) if relax else 0) + sum(obj))

    s = cp_model.CpSolver(); s.parameters.max_time_in_seconds = limit; s.parameters.num_workers = 4
    st = s.Solve(m)
    name = {cp_model.OPTIMAL: "feasible", cp_model.FEASIBLE: "feasible", cp_model.INFEASIBLE: "infeasible"}.get(st, "unknown")
    work = {k for k, v in x.items() if s.Value(v)} if name == "feasible" else set()
    return {"status": name, "work": work}