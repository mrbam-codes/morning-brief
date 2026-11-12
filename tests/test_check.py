"""Checker test. Run: python3 tests/test_check.py GOOD_BRIEF.json [DATE]
Copies the site to a temporary folder, then proves that the good brief PASSES and that
each deliberately broken copy FAILS with the expected message. Prints CHECKER OK or the misses.
The date is always the good brief's own date. A broken copy identical to the good brief is a
miss ("mutation changed nothing"), so a case can never pass by luck of the day's content.
The label cases move LABELS_FROM in the copy only (as tests/test_builds.py does for BUILDS_FROM):
to the brief's date to prove the new refusals, and to the day after to prove older editions still pass.
"""
import copy, datetime, json, pathlib, re, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
good = json.loads(open(sys.argv[1], encoding="utf-8").read())
date = good["date"]
GATE = 'LABELS_FROM = "2026-11-13"'


def run(b, labels_from=None):
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        for f in ROOT.iterdir():
            if f.name in {".git", "briefs", "tests"}:
                continue
            (shutil.copytree if f.is_dir() else shutil.copy)(f, t / f.name)
        (t / "briefs").mkdir()
        (t / "briefs" / "index.json").write_text("[]")
        (t / "briefs" / f"{date}.json").write_text(json.dumps(b, ensure_ascii=False))
        if labels_from:
            ck = (t / "check.py").read_text()
            assert ck.count(GATE) == 1, "LABELS_FROM line not found once in check.py"
            (t / "check.py").write_text(ck.replace(GATE, f'LABELS_FROM = "{labels_from}"'))
        r = subprocess.run([sys.executable, "-I", str(t / "check.py"), date], capture_output=True, text=True, timeout=180)
        return r.stdout + r.stderr


def broke(fn):
    b = copy.deepcopy(good); fn(b); return b


L = lambda b: b["lessons"]


def add(svg_bit):
    """Put svg_bit at the end of lesson 1's diagram, whatever the day's drawing holds."""
    return lambda b: L(b)[0]["diagram"].update(svg=L(b)[0]["diagram"]["svg"].replace("</svg>", svg_bit + "</svg>"))


PLAIN = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 150"><rect x="10" y="20" width="90" height="60" fill="none" stroke="#111"/>'
         '<text x="20" y="55" font-size="12">before</text><text x="130" y="55" font-size="12">then</text><text x="230" y="55" font-size="12">after</text></svg>')


def S(b):
    """The first story with a drawing. A day with none gets a plain one, so these cases always test something."""
    its = (b.get("posters") or []) + (b.get("stories") or [])
    for s in its:
        if s.get("drawing"):
            return s
    its[0].update(drawing=PLAIN, drawingAlt="Three labels in a row: before, then, after.")
    return its[0]


def draw(svg_bit):
    """Put svg_bit at the end of a story drawing."""
    return lambda b: (lambda s: s.update(drawing=s["drawing"].replace("</svg>", svg_bit + "</svg>")))(S(b))


def wide(b):
    s = S(b)
    s.update(drawing=re.sub(r'viewBox="[^"]*"', 'viewBox="0 0 1000 600"', s["drawing"], count=1))


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
    ("diagram label too small", add('<text x="10" y="190" font-size="9">tiny words</text>'), "below 14"),
    ("diagram label runs off the edge", lambda b: L(b)[0]["diagram"].update(svg=L(b)[0]["diagram"]["svg"].replace("</svg>", '<text x="200" y="190" font-size="16">A label far too long to fit</text></svg>')), "runs outside the 320 width"),
    ("diagram is decorative (no shapes)", lambda b: L(b)[0]["diagram"].update(svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><text x="10" y="30" font-size="16">a</text><text x="10" y="60" font-size="16">b</text><text x="10" y="90" font-size="16">c</text></svg>'), "needs at least 3 shapes"),
    ("quiz one short", lambda b: b["quiz"].pop(), "quiz needs"),
    ("quiz missing a lesson question", lambda b: b["quiz"][0].update(n=b["quiz"][1]["n"]), "exactly one lesson question for each"),
    ("no fun fact", lambda b: b.pop("fact"), "fact text: missing text"),
    ("em dash", lambda b: L(b)[0].update(idea="A test — idea."), "em dash"),
]
# Plan 21: the short Commons photo form, on a story and on the fun fact. None means the copy must PASS.
COMMONS = "https://commons.wikimedia.org/wiki/File:NVIDIA_Headquarters.jpg"
P0 = lambda b: ((b.get("posters") or []) + (b.get("stories") or []))[0]
EV = lambda b: b.setdefault("evidence", {"searches": 10, "kept": 3, "rejected": []})
CASES += [
    ("short Commons photo on a story passes", lambda b: P0(b).update(photo={"page": COMMONS, "alt": "Test: a headquarters building."}), None),
    ("short photo with an Unsplash page", lambda b: P0(b).update(photo={"page": "https://unsplash.com/photos/abc", "alt": "Test."}), "page must be a Commons file page"),
    ("short photo with a built file address", lambda b: P0(b).update(photo={"page": "https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg", "alt": "Test."}), "page must be a Commons file page"),
    ("short photo with no alt", lambda b: P0(b).update(photo={"page": COMMONS}), "photo alt: missing text"),
    ("short photo with an extra field", lambda b: P0(b).update(photo={"page": COMMONS, "alt": "Test.", "width": 960}), "the short form has only page and alt"),
    ("photo between the two forms", lambda b: P0(b).update(photo={"page": COMMONS, "alt": "Test.", "credit": "Someone, Wikimedia Commons"}), "use the short form (page and alt only) or the full form"),
    ("short Commons photo on the fun fact passes", lambda b: b["fact"].update(photo={"page": COMMONS, "alt": "Test: a headquarters building."}), None),
    ("fun fact photo between the two forms", lambda b: b["fact"].update(photo={"page": COMMONS, "alt": "Test.", "licence": "CC BY 4.0"}), "fact photo: use the short form"),
    ("fun fact photo not an object", lambda b: b["fact"].update(photo=COMMONS), "fact photo: must be an object"),
    ("fun fact full Unsplash photo passes", lambda b: b["fact"].update(photo={"src": "https://images.unsplash.com/photo-1?w=960&q=70&fm=jpg", "page": "https://unsplash.com/photos/abc", "credit": "Test, Unsplash", "licence": "Unsplash Licence", "alt": "Test."}), None),
    ("photo counts in evidence pass", lambda b: EV(b).update(photo_searches=6, photos_kept=3), None),
    ("photo count not a whole number", lambda b: EV(b).update(photo_searches=2.5), "evidence photo_searches: a whole number"),
    ("photos kept below 0", lambda b: EV(b).update(photos_kept=-1), "evidence photos_kept: a whole number"),
    ("publisher's source hash in a brief", lambda b: b.update(source_sha256="0" * 64), "source_sha256: written only by the publishing step"),
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
# Label-size gaps (audit 11 Nov): (name, mutation, expected message or None to PASS, LABELS_FROM in the copy).
LIVE = date
BEFORE = (datetime.date.fromisoformat(date) + datetime.timedelta(days=1)).isoformat()
STYLE = add('<text x="10" y="190" style="font-size:6px">tiny words</text>')
LABEL_CASES = [
    ("label sized with style", STYLE, "no style attributes", LIVE),
    ("small tspan inside a 14 label", add('<text x="10" y="190" font-size="14">ok <tspan font-size="6">tiny words</tspan></text>'), "on a <tspan> is not allowed", LIVE),
    ("label shrunk by scale", add('<g transform="scale(0.3)"><text x="10" y="190" font-size="14">tiny words</text></g>'), "can shrink labels", LIVE),
    ("label shrunk by matrix", add('<g transform="matrix(0.3 0 0 0.3 0 0)"><text x="10" y="190" font-size="14">tiny words</text></g>'), "can shrink labels", LIVE),
    ("label shrunk by an svg inside the svg", add('<svg viewBox="0 0 3200 2000" width="320" height="200"><text x="10" y="190" font-size="14">tiny words</text></svg>'), "no svg inside the svg", LIVE),
    ("translate and rotate still pass", add('<g transform="translate(5,0) rotate(-10 20 190)"><text x="10" y="190" font-size="14">turned</text></g>'), None, LIVE),
    ("an edition before LABELS_FROM is not re-judged", STYLE, None, BEFORE),
    ("lesson label squeezed with textLength", add('<text x="10" y="190" font-size="14" textLength="20">tiny words</text>'), "no textLength or lengthAdjust", LIVE),
    ("drawing label sized with style", draw('<text x="10" y="140" style="font-size:5px">tiny words</text>'), "drawing: no style attributes", LIVE),
    ("drawing with a style block", draw('<style>text{font-size:5px}</style>'), "drawing: no <style>", LIVE),
    ("drawing shrunk by scale", draw('<g transform="scale(0.3)"><text x="10" y="140" font-size="12">tiny words</text></g>'), "drawing: transform", LIVE),
    ("drawing shrunk by an svg inside the svg", draw('<svg viewBox="0 0 3400 1500" width="340" height="150"><text x="10" y="140" font-size="12">tiny words</text></svg>'), "drawing: no svg inside the svg", LIVE),
    ("drawing shrunk by a wide viewBox", wide, "viewBox must be 320 to 360 wide", LIVE),
    ("drawing label squeezed with textLength", draw('<text x="10" y="140" font-size="12" textLength="20">tiny words</text>'), "drawing: no textLength or lengthAdjust", LIVE),
    ("drawing with translate and rotate still passes", draw('<g transform="translate(5,0) rotate(-10 20 140)"><text x="10" y="140" font-size="12">turned</text></g>'), None, LIVE),
    ("a drawing in an edition before LABELS_FROM is not re-judged", wide, None, BEFORE),
]
misses = []
out = run(good)
print(f"good brief {date}:", out.strip().splitlines()[0] if out.strip() else out)
if not out.strip().startswith("PASSED"):
    misses.append("good brief did not pass:\n" + out)
for name, fn, want, gate in [(n, f, w, None) for n, f, w in CASES] + LABEL_CASES:
    b = broke(fn)
    if b == good:
        print("  MISSED  " + name)
        misses.append(f"{name}: mutation changed nothing, so this case proves nothing on {date}")
        continue
    o = run(b, gate)
    ok = (o.startswith("FAILED") and want in o) if want else o.startswith("PASSED")
    print(("  caught  " if want and ok else "  passes  " if ok else "  MISSED  ") + name)
    if not ok:
        misses.append(f"{name}: expected {'FAILED with ' + repr(want) if want else 'PASSED'}, got:\n{o[:600]}")
if misses:
    print("CHECKER FAILED"); print("\n".join(misses)); sys.exit(1)
print(f"CHECKER OK: good brief passes, {len(CASES) + len(LABEL_CASES)} cases, 0 misses")
