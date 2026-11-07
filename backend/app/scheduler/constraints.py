import calendar
from datetime import date

def month_days(y, m):
    return [date(y, m, i) for i in range(1, calendar.monthrange(y, m)[1] + 1)]

def required(rule, d, holidays):
    """Staff required by this brand+process rule on day d (0 = closed)."""
    if d.weekday() not in rule["days"]:
        return 0
    if d in holidays and rule["policy"] == "off":
        return 0
    return int(rule["over"].get(str(d.weekday()), rule["min"]))