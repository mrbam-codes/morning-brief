"""Trust rules test (plan 2). Run from the repository: python3 tests/test_trust.py [DATE]

The SAME file sits in the Morning brief, Mise en Place and the Red Brief; the CONFIG
block below picks the right cases. It copies the site to a temporary folder with the
published briefs from origin/briefs, switches the trust rules on for DATE (default: the
newest brief) in that copy only, then:
- runs the checker on the real brief and prints what it says;
- seeds a story whose only source is lead only, and expects a refusal;
- seeds a stale story, and expects a refusal;
- seeds a story with a lead-only source plus a better one (where items can have several), and expects no refusal;
- seeds a broken evidence block, and expects a refusal;
- (Morning brief) seeds a quiz whose right answers are all the longest option, and expects a refusal.
Mise en Place's privacy guard needs a secret salt that is not on this Mac, so its
"privacy guard" line is expected and ignored here; GitHub runs the full check.
Prints TRUST OK or the misses.
"""
import copy, json, pathlib, shutil, subprocess, sys, tempfile, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
NAME = ROOT.name
CONFIG = {
    "morning-brief": dict(items=lambda b: (b.get("posters") or []) + (b.get("stories") or []), stale="more than 2 days before", fmt="{d} {m}", quiz=True),
    "lfc-brief": dict(items=lambda b: (b.get("posters") or []) + (b.get("stories") or []), stale="more than 3 days before", fmt="{d} {m}", quiz=False),
    "mise-en-place": dict(items=lambda b: b.get("news") or [], stale="more than 7 days before", fmt="{d} {m} {y}", quiz=False, multi=lambda b: b.get("lessons") or []),
}
cfg = CONFIG.get(NAME) or CONFIG["mise-en-place"]   # the Mise en Place worktree folder has another name


def git(*a):
    return subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True, check=True).stdout


dates = sorted((p[7:17] for p in git("ls-tree", "--name-only", "origin/briefs", "briefs/").split() if p[7:11].isdigit()), reverse=True)
date = sys.argv[1] if len(sys.argv) > 1 else dates[0]
good = json.loads(git("show", f"origin/briefs:briefs/{date}.json"))


def run(b):
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        for f in ROOT.iterdir():
            if f.name in {".git", "briefs", "tests", ".github", ".claude"}:
                continue
            (shutil.copytree if f.is_dir() else shutil.copy)(f, t / f.name)
        (t / "briefs").mkdir()
        for d in dates:
            if d <= date:
                (t / "briefs" / f"{d}.json").write_text(git("show", f"origin/briefs:briefs/{d}.json"))
        (t / "briefs" / "index.json").write_text(json.dumps([d for d in dates if d < date]))
        (t / "briefs" / f"{date}.json").write_text(json.dumps(b, ensure_ascii=False))
        ck = (t / "check.py").read_text()
        a = 'TRUST_FROM = "2026-11-11"'
        assert ck.count(a) == 1, "TRUST_FROM line not found once in check.py"
        (t / "check.py").write_text(ck.replace(a, f'TRUST_FROM = "{date}"'))
        r = subprocess.run([sys.executable, "-I", str(t / "check.py"), date], capture_output=True, text=True, timeout=240)
        return r.stdout + r.stderr


def problems(out):
    return [l for l in out.splitlines() if l.startswith("- ") and "privacy guard" not in l]


def broke(fn):
    b = copy.deepcopy(good); fn(b); return b


day = datetime.date.fromisoformat(date)
old = day - datetime.timedelta(days=40)
stale_date = cfg["fmt"].format(d=old.day, m=old.strftime("%b"), y=old.year)
first = lambda b: cfg["items"](b)[0]
CASES = [
    ("a story whose only source is lead only", lambda b: first(b)["source"].update(url="https://x.com/someone/status/1"), "is lead only in sources.json", True),
    ("a lead-only source on a sub-domain", lambda b: first(b)["source"].update(url="https://old.reddit.com/r/x/comments/1"), "is lead only in sources.json", True),
    ("a stale story", lambda b: first(b)["source"].update(date=stale_date), cfg["stale"], True),
    ("a broken evidence block", lambda b: b.update(evidence={"searches": "many", "kept": 3, "rejected": []}), "evidence searches", True),
    ("a good evidence block", lambda b: b.update(evidence={"searches": 24, "kept": 6, "rejected": [{"what": "A rumour site's transfer story", "why": "Lead only, no original report found"}]}), "evidence", False),
]
if cfg.get("multi"):
    def mixed(b):
        cfg["multi"](b)[0]["sources"] = [{"name": "A post", "url": "https://x.com/someone/status/1"}, {"name": "GOV.UK", "url": "https://www.gov.uk/guidance/x"}]
    def lead_only(b):
        cfg["multi"](b)[0]["sources"] = [{"name": "A post", "url": "https://x.com/someone/status/1"}, {"name": "A review", "url": "https://www.tripadvisor.co.uk/x"}]
    CASES += [("a lesson with a lead-only and an official source", mixed, "is lead only", False),
              ("a lesson whose sources are all lead only", lead_only, "is lead only in sources.json", True)]
if cfg["quiz"]:
    def longest(b):
        qs = (b.get("lesson") or {}).get("quiz") if "lesson" in b else b.get("quiz")
        for q in qs:
            q["options"] = ["No", "No way", "Not this", "The right answer, written much longer than the rest"]
            q["answer"] = 3
        qs[0]["answer"] = 0; qs[0]["options"] = ["The right answer, written much longer than the rest", "No", "No way", "Not this"]
    CASES.append(("right answers that are the longest option", longest, "longest option", True))

out = run(good)
real = problems(out)
print(f"{NAME} {date}, real brief with the trust rules on: " + ("no problems" if not real else f"{len(real)} problem(s)"))
for l in real:
    print("   " + l)
misses = []
for name, fn, msg, want in CASES:
    got = [l for l in problems(run(broke(fn))) if l not in real]
    hit = any(msg in l for l in got)
    print(("REFUSED  " if hit else "accepted ") + name + (": " + next(l for l in got if msg in l)[2:] if hit else ""))
    if hit != want:
        misses.append(name)
print("TRUST OK" if not misses else "MISSES: " + ", ".join(misses))
sys.exit(1 if misses else 0)
