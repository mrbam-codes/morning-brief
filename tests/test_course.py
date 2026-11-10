"""Course data test. Run: python3 tests/test_course.py   (prints COURSE OK or the problems)

Every date from 11 Nov 2026 to 21 Apr 2027 appears once, in order, with its lessons:
3 on weekdays and 5 on Saturdays and Sundays. No lesson is missing or repeated.
"""
import datetime, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
START, END, TOTAL = datetime.date(2026, 11, 11), datetime.date(2027, 4, 21), 577
# Lessons 1 to 568 end on Sun 18 Apr, which holds the 4 left over, then the 9 capstones
# run 3 a day over Mon 19 to Wed 21 Apr. Sun 18 Apr is the one weekend day without 5.
FOUR_AT_WEEKEND = {"2027-04-18"}
c = json.loads(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "course.json").read_text(encoding="utf-8"))
bad = []
days = c["days"]
want = [START + datetime.timedelta(i) for i in range((END - START).days + 1)]
got = [d["date"] for d in days]
missing = sorted({x.isoformat() for x in want} - set(got))
extra = sorted(set(got) - {x.isoformat() for x in want})
dupes = sorted({x for x in got if got.count(x) > 1})
if missing: bad.append(f"dates missing: {missing}")
if extra: bad.append(f"dates outside the course: {extra}")
if dupes: bad.append(f"dates repeated: {dupes}")
if got != sorted(got): bad.append("dates are not in order")
for i, d in enumerate(days):
    if d.get("day") != i + 1: bad.append(f"{d['date']}: day number {d.get('day')}, expected {i + 1}")
    wk = datetime.date.fromisoformat(d["date"]).weekday() >= 5
    need = 3 if not wk else (4 if d["date"] in FOUR_AT_WEEKEND else 5)
    if len(d["lessons"]) != need: bad.append(f"{d['date']}: {len(d['lessons'])} lessons, expected {need}")
    if not (d.get("fact") or {}).get("fact"): bad.append(f"{d['date']}: no fun fact")
    for l in d["lessons"]:
        for k in ("n", "tag", "area", "module", "title", "outcome", "visual"):
            if not l.get(k): bad.append(f"{d['date']} lesson {l.get('n')}: missing {k}")
        if l.get("tag") not in {"AI", "Tech", "Cyber"}: bad.append(f"lesson {l.get('n')}: bad tag")
L = [l for d in days for l in d["lessons"]]
ns = [l["n"] for l in L]
if ns != list(range(1, TOTAL + 1)): bad.append("lesson numbers are not 1 to 577 in order, each once")
titles = [l["title"].strip().lower() for l in L]
if len(set(titles)) != len(titles): bad.append("a lesson title is repeated: " + str(sorted({t for t in titles if titles.count(t) > 1})))
ids = [l["id"] for l in L if "id" in l]
if len(set(ids)) != len(ids): bad.append("a lesson id is repeated")
if c.get("lessons") != TOTAL or len(L) != TOTAL: bad.append(f"{len(L)} lessons, expected {TOTAL}")
if sum(1 for d in days if d.get("try")) != 23: bad.append("expected 23 Try it exercises")
if bad:
    print("COURSE FAILED"); print("\n".join("- " + b for b in bad)); sys.exit(1)
print(f"COURSE OK: {len(days)} days, {len(L)} lessons, {START} to {END}, {sum(1 for d in days if d.get('try'))} Try it days")
