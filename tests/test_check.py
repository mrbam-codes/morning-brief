"""Checker test. Run: python3 tests/test_check.py GOOD_BRIEF.json [DATE]
Copies the site to a temporary folder, then proves that the good brief PASSES and that
each deliberately broken copy FAILS with the expected message. Prints CHECKER OK or the misses.
"""
import copy, json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
good = json.loads(open(sys.argv[1], encoding="utf-8").read())
date = good["date"]


def run(b):
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        for f in ROOT.iterdir():
            if f.name in {".git", "briefs", "tests"}:
                continue
            (shutil.copytree if f.is_dir() else shutil.copy)(f, t / f.name)
        (t / "briefs").mkdir()
        (t / "briefs" / "index.json").write_text("[]")
        (t / "briefs" / f"{date}.json").write_text(json.dumps(b, ensure_ascii=False))
        r = subprocess.run([sys.executable, "-I", str(t / "check.py"), date], capture_output=True, text=True, timeout=180)
        return r.stdout + r.stderr


def broke(fn):
    b = copy.deepcopy(good); fn(b); return b


L = lambda b: b["lessons"]
CASES = [
    ("a lesson missing", lambda b: L(b).pop(), "lessons must be today's from course.json"),
    ("lessons in the wrong order", lambda b: L(b).reverse(), "lessons must be today's from course.json"),
    ("a lesson from another day", lambda b: L(b)[0].update(n=L(b)[0]["n"] + 40), "lessons must be today's from course.json"),
    ("a changed title", lambda b: L(b)[1].update(title=L(b)[1]["title"] + " (new)"), "title must be exactly"),
    ("the old single lesson field", lambda b: b.update(lesson={}), "use lessons (a list), not lesson"),
    ("no diagram", lambda b: L(b)[0].pop("diagram"), "needs a diagram"),
    ("diagram is not SVG", lambda b: L(b)[0]["diagram"].update(svg="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 200\"><rect"), "not valid SVG"),
    ("diagram has a script", lambda b: L(b)[0]["diagram"].update(svg=L(b)[0]["diagram"]["svg"].replace("</svg>", "<script>alert(1)</script></svg>")), "must not contain <script"),
    ("diagram loads a web address", lambda b: L(b)[0]["diagram"].update(svg=L(b)[0]["diagram"]["svg"].replace("</svg>", '<a href="https://x.test"><text x="5" y="190" font-size="14">go</text></a></svg>')), "must not contain"),
    ("diagram label too small", lambda b: L(b)[0]["diagram"].update(svg=L(b)[0]["diagram"]["svg"].replace('font-size="15"', 'font-size="9"', 1)), "below 14"),
    ("diagram label runs off the edge", lambda b: L(b)[0]["diagram"].update(svg=L(b)[0]["diagram"]["svg"].replace("</svg>", '<text x="200" y="190" font-size="16">A label far too long to fit</text></svg>')), "runs outside the 320 width"),
    ("diagram is decorative (no shapes)", lambda b: L(b)[0]["diagram"].update(svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><text x="10" y="30" font-size="16">a</text><text x="10" y="60" font-size="16">b</text><text x="10" y="90" font-size="16">c</text></svg>'), "needs at least 3 shapes"),
    ("quiz one short", lambda b: b["quiz"].pop(), "quiz needs"),
    ("quiz missing a lesson question", lambda b: b["quiz"][0].update(n=b["quiz"][1]["n"]), "exactly one lesson question for each"),
    ("no fun fact", lambda b: b.pop("fact"), "fact text: missing text"),
    ("em dash", lambda b: L(b)[0].update(idea="A test — idea."), "em dash"),
]
if date != "2026-11-11":
    CASES += [
        ("review of a future lesson", lambda b: [q.update(n=L(b)[-1]["n"] + 5) for q in b["quiz"] if q["kind"] == "review"][:1], "review n must be an earlier course lesson"),
        ("review with the wrong title", lambda b: [q.update(title="Made up") for q in b["quiz"] if q["kind"] == "review"][:1], "review title must be"),
    ]
course = json.loads((ROOT / "course.json").read_text(encoding="utf-8"))
cd = next(d for d in course["days"] if d["date"] == date)
if any(l.get("verify") for l in cd["lessons"]):
    i = next(i for i, l in enumerate(cd["lessons"]) if l.get("verify"))
    CASES.append(("verify note ignored", lambda b: L(b)[i].pop("verified"), "course.json says"))
if cd.get("try"):
    CASES.append(("Try it missing", lambda b: b.pop("try"), "today is a Try it day"))
else:
    CASES.append(("Try it on the wrong day", lambda b: b.update(try_={}) or b.update({"try": {"title": "x"}}), "only on the Try it days"))
misses = []
out = run(good)
print(f"good brief {date}:", out.strip().splitlines()[0] if out.strip() else out)
if not out.strip().startswith("PASSED"):
    misses.append("good brief did not pass:\n" + out)
for name, fn, want in CASES:
    o = run(broke(fn))
    ok = o.startswith("FAILED") and want in o
    print(("  caught  " if ok else "  MISSED  ") + name)
    if not ok:
        misses.append(f"{name}: expected FAILED with {want!r}, got:\n{o[:600]}")
if misses:
    print("CHECKER FAILED"); print("\n".join(misses)); sys.exit(1)
print(f"CHECKER OK: good brief passes, {len(CASES)} broken briefs fail")
