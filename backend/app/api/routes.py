import os, io, csv, enum, datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Header, Response
from pydantic import BaseModel
from sqlalchemy import Date, Enum
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database.session import get_db
from app import models as M
from app.services import roster_service as svc
from app.scheduler.constraints import month_days

router = APIRouter()

def admin(x_admin_token: str = Header(default="")):
    # Auth is open for assessment/demo — no token enforcement
    pass

def to_dict(o):
    out = {}
    for c in o.__table__.columns:
        v = getattr(o, c.name)
        out[c.name] = v.value if isinstance(v, enum.Enum) else v.isoformat() if isinstance(v, (dt.date, dt.datetime)) else v
    return out

def coerce(Model, p):
    out = {}
    for c in Model.__table__.columns:
        if c.name in p and c.name != "id":
            v = p[c.name]
            if v is not None:
                if isinstance(c.type, Date): v = dt.date.fromisoformat(v)
                elif isinstance(c.type, Enum): v = c.type.enum_class(v)
            out[c.name] = v
    return out

def save(db, o):
    try:
        db.add(o); db.commit(); db.refresh(o); return to_dict(o)
    except IntegrityError:
        db.rollback(); raise HTTPException(409, "Duplicate value or record is in use")

def crud(name, Model):
    @router.get(f"/{name}")
    def list_(db: Session = Depends(get_db)):
        return [to_dict(o) for o in db.query(Model).order_by(Model.id)]

    @router.post(f"/{name}", dependencies=[Depends(admin)])
    def create(payload: dict, db: Session = Depends(get_db)):
        return save(db, Model(**coerce(Model, payload)))

    @router.patch(f"/{name}/{{oid}}", dependencies=[Depends(admin)])
    def patch(oid: int, payload: dict, db: Session = Depends(get_db)):
        o = db.get(Model, oid)
        if not o: raise HTTPException(404)
        for k, v in coerce(Model, payload).items(): setattr(o, k, v)
        return save(db, o)

    @router.delete(f"/{name}/{{oid}}", dependencies=[Depends(admin)])
    def delete(oid: int, db: Session = Depends(get_db)):
        o = db.get(Model, oid)
        if not o: raise HTTPException(404)
        try: db.delete(o); db.commit()
        except IntegrityError: db.rollback(); raise HTTPException(409, "Record is in use; deactivate it instead")
        return {"ok": True}

for n, Mo in [("employees", M.Employee), ("pods", M.Pod), ("brands", M.Brand), ("processes", M.Process),
              ("assignments", M.Assignment), ("rules", M.OperatingRule), ("leaves", M.Leave), ("holidays", M.PublicHoliday)]:
    crud(n, Mo)

class GenIn(BaseModel): year: int; month: int; time_limit: int = 20
class EditIn(BaseModel): employee_id: int; date: dt.date; status: str; preview: bool = False
class ImpactIn(BaseModel): employee_id: int; dates: list[dt.date]; type: str = "leave"

def get_roster(db, rid):
    r = db.get(M.Roster, rid)
    if not r: raise HTTPException(404, "Roster not found")
    return r

@router.post("/rosters/generate", dependencies=[Depends(admin)])
def generate(b: GenIn, db: Session = Depends(get_db)):
    return svc.generate(db, b.year, b.month, b.time_limit)

@router.get("/rosters")
def rosters(year: int, month: int, db: Session = Depends(get_db)):
    q = db.query(M.Roster).filter_by(year=year, month=month).order_by(M.Roster.version.desc())
    return [to_dict(r) for r in q]

@router.get("/rosters/{rid}")
def roster(rid: int, db: Session = Depends(get_db)):
    r = get_roster(db, rid)
    return {**to_dict(r), "entries": [to_dict(e) for e in r.entries]}

@router.get("/rosters/{rid}/validate")
def validate_(rid: int, db: Session = Depends(get_db)):
    return svc.validate_roster(db, get_roster(db, rid))

@router.post("/rosters/{rid}/edit", dependencies=[Depends(admin)])
def edit(rid: int, b: EditIn, db: Session = Depends(get_db)):
    try: return svc.edit(db, get_roster(db, rid), b.employee_id, b.date, b.status, b.preview)
    except ValueError: raise HTTPException(422, "status must be work/weekly_off/leave/comp_off/holiday")

@router.post("/rosters/{rid}/impact")
def impact(rid: int, b: ImpactIn, db: Session = Depends(get_db)):
    return svc.impact(db, get_roster(db, rid), b.employee_id, b.dates, b.type)

@router.post("/rosters/{rid}/publish", dependencies=[Depends(admin)])
def publish(rid: int, db: Session = Depends(get_db)):
    r = get_roster(db, rid); rep = svc.validate_roster(db, r)
    if not rep["valid"]:
        raise HTTPException(409, f"Cannot publish: {sum(i['severity']=='critical' for i in rep['issues'])} critical issue(s) remain")
    r.status = M.RosterStatus.PUBLISHED; db.commit()
    return to_dict(r)

@router.get("/rosters/{rid}/export.csv")
def export(rid: int, db: Session = Depends(get_db)):
    r = get_roster(db, rid)
    pods = {p.id: p.name for p in db.query(M.Pod)}
    grid = {(e.employee_id, e.date): e.status.value for e in r.entries}
    code = {"work": "W", "weekly_off": "OFF", "leave": "L", "comp_off": "CO", "holiday": "H"}
    days = month_days(r.year, r.month)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["Employee", "Pod"] + [d.isoformat() for d in days])
    for e in db.query(M.Employee).filter_by(active=True):
        w.writerow([e.name, pods.get(e.pod_id, "")] + [code.get(grid.get((e.id, d)), "") for d in days])
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=roster_{r.year}_{r.month:02d}.csv"})
