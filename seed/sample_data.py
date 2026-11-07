import sys, pathlib, random, datetime as dt
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from app.database.session import Base, engine, SessionLocal
from app import models as M

NAMES = ("Rahul Sharma,Priya Nair,Amit Verma,Sneha Iyer,Karan Mehta,Anjali Desai,Vikram Singh,Neha Kulkarni,Rohan Patil,"
         "Pooja Joshi,Arjun Reddy,Divya Menon,Sanjay Gupta,Kavya Rao,Manish Tiwari,Ritu Agarwal,Nikhil Shah,Meera Pillai,"
         "Suresh Naidu,Isha Kapoor,Varun Bhatt,Tanvi Chopra,Harsh Vora,Simran Kaur,Deepak Yadav,Shreya Ghosh,Abhishek Jain,"
         "Lakshmi Iyer,Farhan Qureshi,Aditi Bose,Gaurav Malhotra").split(",")
BRANDS = ("Aurora Skincare,Brewmate Coffee,Cobalt Footwear,Desi Threads,EcoNest Home,FitFuel Nutrition,GlowLeaf Beauty,"
          "Honeycomb Snacks,Indigo Denim,Jaipur Jewels,Kiwi Kids,Lumen Lighting,Mango Mobiles,Nimbus Luggage,Orchid Organics,"
          "Pixel Pets,Quill Stationery,Rustic Rugs,Saffron Spices,Tango Toys").split(",")
ALL, SIX, D = [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5], dt.date
CAL = [(ALL, M.HolidayPolicy.WORK),   # 365 days incl. Sundays + holidays
       (ALL, M.HolidayPolicy.OFF),    # daily, holidays off
       (SIX, M.HolidayPolicy.OFF)]    # Sundays + holidays off

def main():
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    db, rnd, names = SessionLocal(), random.Random(7), iter(NAMES)
    pods = [M.Pod(name=n) for n in ("Alpha", "Bravo", "Charlie", "Delta")]
    P = {n: M.Process(name=n, description=d) for n, d in (("CS", "Customer Support"), ("ACC", "Abandoned Cart Conversion"),
         ("NDR", "Non-Delivery Report"), ("Retention", "Customer Retention"))}
    brands = [M.Brand(name=n) for n in BRANDS]
    db.add_all(pods + list(P.values()) + brands); db.flush()

    def emp(pod):
        n = next(names); a, b = n.lower().split()
        e = M.Employee(name=n, email=f"{a}.{b}@demo.datastraw.in", pod_id=pod.id, weekly_off_days=rnd.choice([[], [], [6], [5, 6]]))
        db.add(e); db.flush(); return e
    def rule(b, p, cal, mn=1, over=None):
        db.add(M.OperatingRule(brand_id=b.id, process_id=p.id, operating_days=cal[0], holiday_policy=cal[1],
                               min_coverage=mn, coverage_overrides=over or {}))
    def assign(e, b, p): db.add(M.Assignment(employee_id=e.id, brand_id=b.id, process_id=p.id))

    owners, pairs = [], [[] for _ in range(4)]
    for i in range(16):                                   # 16 single-resource brands (80%)
        b, o = brands[i], emp(pods[i // 4]); owners.append(o)
        for j, pn in enumerate(["CS", "ACC", "NDR"][: 2 + i % 2]):
            rule(b, P[pn], CAL[i % 3] if j == 0 else CAL[2]); assign(o, b, P[pn]); pairs[i // 4].append((b, P[pn]))
    floaters = []
    for k in range(4):                                    # one floater/backup per pod
        f = emp(pods[k]); floaters.append(f)
        for b, p in pairs[k]: assign(f, b, p)

    multi = []
    for k in range(4):                                    # 4 multi-resource brands
        b, pod = brands[16 + k], pods[k]
        if k < 3:                                         # 3 people, overlapping processes
            x, y, z = emp(pod), emp(pod), emp(pod); multi.append((x, y, z))
            rule(b, P["CS"], CAL[0], over={"5": 2} if k == 0 else None); rule(b, P["ACC"], CAL[1]); rule(b, P["NDR"], CAL[2])
            for e, ps in ((x, ("CS", "ACC")), (y, ("CS", "NDR")), (z, ("ACC", "NDR"))):
                for pn in ps: assign(e, b, P[pn])
        else:                                             # 2 people
            x, y = emp(pod), emp(pod); multi.append((x, y))
            rule(b, P["CS"], CAL[0], over={"5": 2}); rule(b, P["Retention"], CAL[2])
            assign(x, b, P["CS"]); assign(x, b, P["Retention"]); assign(y, b, P["CS"])
    for k in range(4): pods[k].lead_id = multi[k][0].id

    for d, n in ((D(2026, 11, 8), "Diwali"), (D(2026, 11, 26), "Regional Festival"), (D(2026, 12, 25), "Christmas")):
        db.add(M.PublicHoliday(date=d, name=n))
    L = lambda e, d, t=M.LeaveType.LEAVE: db.add(M.Leave(employee_id=e.id, date=d, type=t))
    for d in (12, 13): L(owners[0], D(2026, 11, d))       # single-resource 365-day owner away -> floater covers
    L(owners[5], D(2026, 11, 20), M.LeaveType.COMP_OFF)
    for d in (16, 17, 18): L(owners[9], D(2026, 11, d))
    L(multi[0][1], D(2026, 11, 24)); L(floaters[2], D(2026, 11, 3))
    for d in (7, 8): L(owners[1], D(2026, 12, d))
    L(owners[2], D(2026, 12, 24))
    db.commit(); print("Seeded: 31 employees, 20 brands, 4 pods")

if __name__ == "__main__":
    main()