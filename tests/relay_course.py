"""Re-lay the 577-lesson course to start on Wednesday 11 November 2026 (plan 9).
Run once: python3 tests/relay_course.py   (rewrites course.json, prints RELAY OK or stops)

The lessons keep their order and are poured into the new calendar, not shifted:
3 a day on weekdays and 5 on Saturdays and Sundays. The ordinary lessons end on the
day the last of them fits (that day may hold fewer), then the 9 capstones run 3 a day.
Each day's phase is the phase of its first lesson. Fun facts stay in day order (any
left over at the end are dropped). Each Try it stays on its own calendar date.
It refuses to run on a course that does not start on 16 November 2026, so it cannot run twice.
"""
import datetime, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = ROOT / "course.json"
OLD_START, NEW_START = "2026-11-16", "2026-11-11"
# Two Try it exercises name a lesson by a title that is not in the course; these are the nearest lessons.
NEEDS_ALIAS = {"Tokens: how models read": "Tokenisation: cutting text into pieces",
               "HTTP requests and responses": "HTTP: how browsers and servers talk"}

raw = PATH.read_text(encoding="utf-8")
c = json.loads(raw)
assert json.dumps(c, indent=1, ensure_ascii=False) + "\n" == raw, "course.json does not round-trip byte for byte"
assert c["start"] == OLD_START, f"course starts {c['start']}, not {OLD_START}: already re-laid, stopping"
old = c["days"]

lessons = [l for d in old for l in d["lessons"]]
assert [l["n"] for l in lessons] == list(range(1, c["lessons"] + 1)), "old lessons are not 1 to 577 in order"
phase_of = {l["n"]: d["phase"] for d in old for l in d["lessons"]}
caps = [l for l in lessons if l["area"] == "Capstone"]
assert [l["n"] for l in caps] == list(range(569, 578)), "capstones are not the last 9 lessons"
ordinary = lessons[:-len(caps)]
facts = [d["fact"] for d in old]
tries = {d["date"]: d["try"] for d in old if "try" in d}

days, day, k = [], datetime.date.fromisoformat(NEW_START), 0
while k < len(ordinary):
    take = 5 if day.weekday() >= 5 else 3
    days.append(ordinary[k:k + take]); k += take; day += datetime.timedelta(1)
for k in range(0, len(caps), 3):
    days.append(caps[k:k + 3])
assert len(days) <= len(facts), "more days than fun facts"

start = datetime.date.fromisoformat(NEW_START)
new = []
for i, ls in enumerate(days):
    date = (start + datetime.timedelta(i)).isoformat()
    d = {"day": i + 1, "date": date, "phase": phase_of[ls[0]["n"]], "lessons": ls, "fact": facts[i]}
    if date in tries:
        d["try"] = tries.pop(date)
    new.append(d)
assert not tries, f"Try it dates outside the new course: {sorted(tries)}"

c["start"], c["end"], c["days"] = new[0]["date"], new[-1]["date"], new

# ---------- assertions ----------
L = [l for d in new for l in d["lessons"]]
assert [l["n"] for l in L] == list(range(1, 578)) and len(L) == c["lessons"] == 577, "lessons not 1 to 577 in order, each once"
assert L == lessons, "a lesson's content changed"
dates = [d["date"] for d in new]
want = [(start + datetime.timedelta(i)).isoformat() for i in range(len(new))]
assert dates == want and len(set(dates)) == len(dates), "a date is missing or repeated"
assert all(d["fact"].get("fact") for d in new), "a day has no fun fact"
assert [d["fact"] for d in new] == facts[:len(new)], "fun facts are not in day order"
old_try = [(d["date"], d["try"]) for d in old if "try" in d]
new_try = [(d["date"], d["try"]) for d in new if "try" in d]
assert len(new_try) == 23 and new_try == old_try, "Try it exercises moved or changed"
when_new = {l["n"]: d["date"] for d in new for l in d["lessons"]}
when_old = {l["n"]: d["date"] for d in old for l in d["lessons"]}
by_title = {l["title"]: l["n"] for l in L}
late = []
for date, ts in new_try:
    for t in ts:
        n = by_title[NEEDS_ALIAS.get(t["needs"], t["needs"])]
        assert when_new[n] <= when_old[n], f"lesson {n} is taught later than before"
        if when_new[n] > date:
            late.append(f"Try it on {date} needs lesson {n}, taught {when_new[n]} (before: {when_old[n]})")
ph = [d["phase"] for d in new]
assert ph == sorted(ph) and set(ph) == {1, 2, 3, 4}, "phases are not 1 to 4 in order"
for d in new:
    wk = datetime.date.fromisoformat(d["date"]).weekday() >= 5
    if d["lessons"][0]["area"] == "Capstone":
        assert len(d["lessons"]) == 3
    elif d is not new[len(new) - len(caps) // 3 - 1]:
        assert len(d["lessons"]) == (5 if wk else 3), f"{d['date']}: wrong lesson count"

out = json.dumps(c, indent=1, ensure_ascii=False) + "\n"
PATH.write_text(out, encoding="utf-8")
mixed = [f"{d['date']} (lessons {d['lessons'][0]['n']} to {d['lessons'][-1]['n']}, phase {d['phase']})"
         for d in new if len({phase_of[l['n']] for l in d['lessons']}) > 1]
last = new[len(new) - len(caps) // 3 - 1]
print(f"RELAY OK: {len(new)} days, {len(L)} lessons, {c['start']} to {c['end']}; "
      f"last ordinary day {last['date']} holds {len(last['lessons'])}; 23 Try it days kept on their dates; "
      f"{len(facts) - len(new)} fun fact(s) dropped")
print("Days that mix two phases (phase of first lesson used): " + ("; ".join(mixed) or "none"))
print("Try it exercises whose lesson still comes after them: " + ("; ".join(late) or "none"))
