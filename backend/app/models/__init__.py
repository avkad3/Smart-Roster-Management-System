import enum
import datetime as dt
from sqlalchemy import ForeignKey, String, Boolean, Integer, Date, DateTime, Enum, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base

class RosterStatus(str, enum.Enum): DRAFT = "draft"; VALIDATED = "validated"; PUBLISHED = "published"
class LeaveType(str, enum.Enum): LEAVE = "leave"; COMP_OFF = "comp_off"; UNAVAILABLE = "unavailable"
class HolidayPolicy(str, enum.Enum): WORK = "work"; OFF = "off"
class EntryStatus(str, enum.Enum):
    WORK = "work"; WEEKLY_OFF = "weekly_off"; LEAVE = "leave"; COMP_OFF = "comp_off"; HOLIDAY = "holiday"

class Pod(Base):
    __tablename__ = "pods"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", use_alter=True, name="fk_pod_lead"), nullable=True)

class Employee(Base):
    __tablename__ = "employees"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True)
    pod_id: Mapped[int | None] = mapped_column(ForeignKey("pods.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_off_days: Mapped[list] = mapped_column(JSON, default=list)  # preferred off weekdays, 0=Mon
    weekly_offs_per_week: Mapped[int] = mapped_column(Integer, default=1)
    max_consecutive_days: Mapped[int] = mapped_column(Integer, default=6)

class Brand(Base):
    __tablename__ = "brands"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Process(Base):
    __tablename__ = "processes"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")

class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (UniqueConstraint("employee_id", "brand_id", "process_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"))
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id"))

class OperatingRule(Base):
    __tablename__ = "operating_rules"
    __table_args__ = (UniqueConstraint("brand_id", "process_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"))
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id"))
    operating_days: Mapped[list] = mapped_column(JSON, default=lambda: [0, 1, 2, 3, 4, 5, 6])
    holiday_policy: Mapped[HolidayPolicy] = mapped_column(Enum(HolidayPolicy), default=HolidayPolicy.OFF)
    min_coverage: Mapped[int] = mapped_column(Integer, default=1)
    coverage_overrides: Mapped[dict] = mapped_column(JSON, default=dict)  # {"5": 2} = Saturdays need 2

class Leave(Base):
    __tablename__ = "leaves"
    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    date: Mapped[dt.date] = mapped_column(Date)
    type: Mapped[LeaveType] = mapped_column(Enum(LeaveType), default=LeaveType.LEAVE)
    approved: Mapped[bool] = mapped_column(Boolean, default=True)

class PublicHoliday(Base):
    __tablename__ = "public_holidays"
    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[dt.date] = mapped_column(Date, unique=True)
    name: Mapped[str] = mapped_column(String(120))

class Roster(Base):
    __tablename__ = "rosters"
    __table_args__ = (UniqueConstraint("year", "month", "version"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[RosterStatus] = mapped_column(Enum(RosterStatus), default=RosterStatus.DRAFT)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    entries = relationship("RosterEntry", cascade="all, delete-orphan")

class RosterEntry(Base):
    __tablename__ = "roster_entries"
    __table_args__ = (UniqueConstraint("roster_id", "employee_id", "date"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    roster_id: Mapped[int] = mapped_column(ForeignKey("rosters.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    date: Mapped[dt.date] = mapped_column(Date)
    status: Mapped[EntryStatus] = mapped_column(Enum(EntryStatus))
    locked: Mapped[bool] = mapped_column(Boolean, default=False)

class ScheduleChange(Base):
    __tablename__ = "schedule_changes"
    id: Mapped[int] = mapped_column(primary_key=True)
    roster_id: Mapped[int] = mapped_column(ForeignKey("rosters.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    date: Mapped[dt.date] = mapped_column(Date)
    old_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20))
    changed_by: Mapped[str] = mapped_column(String(80), default="admin")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)