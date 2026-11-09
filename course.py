#!/usr/bin/env python3
"""Print today's course work for the routine. Usage: python3 course.py YYYY-MM-DD

Shows today's lessons from course.json (fixed: never choose your own), the fun fact,
any Try it exercise, and the 2 earlier lessons for today's review questions.
Course addresses are printed for reference only: search for a source and open it
from your own search results, never fetch these addresses directly.
"""
import datetime, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
c = json.loads((ROOT / "course.json").read_text(encoding="utf-8"))
date = sys.argv[1]
datetime.date.fromisoformat(date)
days = c["days"]
i = next((k for k, d in enumerate(days) if d["date"] == date), None)
if i is None:
    print(f"NO COURSE DAY for {date} (the course runs {c['start']} to {c['end']}). Stop and report this.")
    sys.exit(1)
d = days[i]
print(f"COURSE DAY {d['day']} of {len(days)}, {date}, {len(d['lessons'])} lessons, quiz {len(d['lessons']) + 2} questions")
for l in d["lessons"]:
    print(f"\nLESSON n={l['n']} tag={l['tag']} level={l.get('level', 'core')}")
    print(f"  title: {l['title']}")
    print(f"  area: {l['area']} / {l['module']}")
    print(f"  outcome: {l['outcome']}")
    print(f"  visual to draw: {l['visual']}")
    if l.get("uses"):
        print(f"  pulls together: {l['uses']}")
    if l.get("source"):
        print(f"  source (search for it, do not fetch directly): {l['source']}")
    if l.get("verify"):
        print(f"  VERIFY NOTE (act on it and fill `verified`): {l['verify']}")
f = d.get("fact") or {}
print(f"\nFUN FACT (check it today and cite the page you open): {f.get('fact', '')}")
if f.get("source"):
    print(f"  starting source (search for it): {f['source']}")
for t in d.get("try") or []:
    print(f"\nTRY IT DAY. title (copy exactly): {t['title']}")
    print(f"  task: {t['task']}")
    print(f"  needs: {t.get('needs', '')}")
if i == 0:
    print("\nREVIEW: none today (lesson 1). Use 2 news questions instead.")
    sys.exit(0)
# Spaced review: one lesson from 1 or 3 days ago, one from 7, 14 or 30 days ago (or the earliest day).
picks = []
for offs in ((1, 3), (7, 14, 30)):
    off = offs[d["day"] % len(offs)]
    k = max(0, i - off)
    lessons = days[k]["lessons"]
    for j in range(len(lessons)):
        l = lessons[(d["day"] + j) % len(lessons)]
        if l["n"] not in {p["n"] for p in picks}:
            picks.append(l); break
print("\nREVIEW (2 questions, kind \"review\", with this n and this exact title):")
for l in picks:
    print(f"  n={l['n']} tag={l['tag']} title: {l['title']}")
    print(f"    outcome: {l['outcome']}")
