"""One-off: turn the approved course (mb-course/course.json) into the repo's course.json.
Adds a course number n (1 to 577, in teaching order) and a tag (AI, Tech or Cyber) to every lesson.
Usage: python3 tests/build_course.py /path/to/mb-course/course.json
"""
import json, sys, pathlib
TAG = {"AI from first principles": "AI", "Building with AI": "AI", "AI industry and economics": "AI",
       "Cyber foundations": "Cyber", "Attack and defence": "Cyber", "Securing AI": "Cyber"}
src = json.load(open(sys.argv[1]))
n = 0
for d in src["days"]:
    for l in d["lessons"]:
        n += 1
        l["n"] = n
        l["tag"] = TAG.get(l["area"], "Tech")
        l.setdefault("verify", "")
        l.setdefault("source", "")
        l.pop("absorb", None)
out = {"start": src["days"][0]["date"], "end": src["days"][-1]["date"], "lessons": n,
       "phases": src["phases"], "days": src["days"]}
p = pathlib.Path(__file__).resolve().parent.parent / "course.json"
p.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("wrote", p, n, "lessons")
