import datetime as dt
from app.scheduler.engine import solve
from app.scheduler.validator import validate

def mk(emps, rules, leaves=None):
    return dict(year=2026, month=11, rules=rules, leaves=leaves or {}, holidays=set(),
                employees={i: dict(name=f"E{i}", active=True, offs=1, max_consec=6, pref_off=[], processes={1}) for i in emps})
def rule(elig): return dict(id=1, brand=1, process=1, label="B - CS", days=list(range(7)), policy="work", min=1, over={}, eligible=elig)

def test_single_resource_365_is_infeasible_and_explained():
    i = mk([1], [rule([1])]); r = solve(i)
    rep = validate(i, r["work"])
    assert r["status"] == "infeasible" and not rep["valid"]
    assert any(x["code"] == "COVERAGE_GAP" for x in rep["issues"])

def test_backup_makes_roster_valid():
    i = mk([1, 2], [rule([1, 2])]); r = solve(i)
    assert r["status"] == "feasible" and validate(i, r["work"])["valid"]

def test_leave_never_worked():
    day = dt.date(2026, 11, 5); i = mk([1, 2], [rule([1, 2])], {(1, day): "leave"}); r = solve(i)
    assert (1, day) not in r["work"] and validate(i, r["work"])["valid"]

def test_validator_catches_manual_leave_conflict():
    day = dt.date(2026, 11, 5); i = mk([1, 2], [rule([1, 2])], {(1, day): "leave"})
    rep = validate(i, {(1, day)})
    assert any(x["code"] == "LEAVE_CONFLICT" for x in rep["issues"])