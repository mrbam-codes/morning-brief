"""Built in the wild and Just launched test (plan 16). Run from the repository: python3 tests/test_builds.py [DATE]

Takes the published brief for DATE (default 2026-11-11) from origin/briefs, copies the site to a
temporary folder, and proves:
- the brief with neither key prints exactly what the checker at 8daa907 printed (before plan 16);
- before BUILDS_FROM, builds and launched are refused, even as empty lists;
- with BUILDS_FROM moved to DATE in the copy only (as tests/test_trust.py does for TRUST_FROM),
  good builds and launches pass, empty lists pass, and each broken copy FAILS with its message;
- recent.py prints the build titles of the last 7 briefs, and never a link.
Prints BUILDS OK or the misses.
"""
import copy, datetime, json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
date = sys.argv[1] if len(sys.argv) > 1 else "2026-11-11"
day = datetime.date.fromisoformat(date)
yday = day - datetime.timedelta(days=1)
old = day - datetime.timedelta(days=20)


def git(*a):
    return subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True, check=True).stdout


real = json.loads(git("show", f"origin/briefs:briefs/{date}.json"))
OLD_CHECKER = git("show", "8daa907:check.py")
GATE = 'BUILDS_FROM = "2026-11-14"'


def run(b, live=True, earlier=None, checker=None):
    """live=True moves BUILDS_FROM to DATE in the copy, as on go-live day. earlier: {date: brief} put before it."""
    earlier = earlier or {}
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        for f in ROOT.iterdir():
            if f.name in {".git", "briefs", "tests", ".github", ".claude"}:
                continue
            (shutil.copytree if f.is_dir() else shutil.copy)(f, t / f.name)
        (t / "briefs").mkdir()
        for d, eb in earlier.items():
            (t / "briefs" / f"{d}.json").write_text(json.dumps(eb, ensure_ascii=False))
        (t / "briefs" / "index.json").write_text(json.dumps(sorted(earlier)))
        (t / "briefs" / f"{date}.json").write_text(json.dumps(b, ensure_ascii=False))
        ck = checker if checker is not None else (t / "check.py").read_text()
        if checker is None and live:
            assert ck.count(GATE) == 1, "BUILDS_FROM line not found once in check.py"
            ck = ck.replace(GATE, f'BUILDS_FROM = "{date}"')
        (t / "check.py").write_text(ck)
        r = subprocess.run([sys.executable, "-I", str(t / "check.py"), date], capture_output=True, text=True, timeout=180)
        return r.stdout + r.stderr


SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" font-family="Arial,sans-serif" fill="#fff">'
       '<rect x="10" y="20" width="120" height="60" rx="10" fill="none" stroke="#fff" stroke-width="3"/>'
       '<rect x="190" y="20" width="120" height="60" rx="10" fill="none" stroke="#fff" stroke-width="3"/>'
       '<line x1="130" y1="50" x2="190" y2="50" stroke="#fff" stroke-width="4"/>'
       '<text x="70" y="56" font-size="15" text-anchor="middle">Sensor</text>'
       '<text x="250" y="56" font-size="15" text-anchor="middle">Agent</text>'
       '<text x="160" y="130" font-size="16" text-anchor="middle">reads, decides, acts</text></svg>')
BUILDS = [
    {"what": "An old car unlocked from a phone, worked out with Claude Code", "who": "@maker_test",
     "reach": "48,000 views at the time of writing", "label": "CAR HACK",
     "steps": ["A cheap adapter listens to the car's own network (CAN bus).",
               "Claude Code works out which message does what.",
               "A small phone app sends the unlock message."],
     "tools": ["Claude Code", "Raspberry Pi", "CAN adapter"],
     "proof": "Shown working", "proof_note": "The video shows the doors unlocking from the phone.",
     "level": "A weekend", "level_note": "Needs a car you own and a £20 adapter.",
     "first_step": "Ask Claude Code to explain what a CAN bus is and how to read one safely.",
     "links": {"post": "https://x.com/maker_test/status/1", "video": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
     "video": "dQw4w9WgXcQ",
     "source": {"name": "YouTube, the maker's own video", "date": f"{yday.day} {yday:%b}", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}},
    {"what": "A plant that texts you when it is thirsty", "who": "@grower.test", "label": "PLANT BOT",
     "steps": ["A soil sensor reads how wet the pot is.", "An agent decides when to send a text."],
     "tools": ["Cursor", "ESP32 board"],
     "proof": "Code published", "level": "An evening", "level_note": "About £10 of parts.",
     "first_step": "Ask an assistant to write the code that reads one sensor.",
     "links": {"code": "https://github.com/grower-test/plant-bot"},
     "diagram": SVG,
     "source": {"name": "GitHub, the public code", "date": f"{day.day} {day:%b}", "url": "https://github.com/grower-test/plant-bot"}},
    {"what": "A home heating schedule run by a chat agent", "who": "@warm_home", "label": "HEAT AGENT",
     "steps": ["The agent reads the weather forecast.", "It sets the heating times for tomorrow."],
     "tools": ["ChatGPT"],
     "proof": "Claim only", "proof_note": "Only the post: no video or code behind it.",
     "level": "A serious project", "level_note": "Touches mains-powered kit, so needs care.",
     "first_step": "Read how your thermostat's app lets other tools change it.",
     "links": {"post": "https://x.com/warm_home/status/2"},
     "photo": {"src": "https://upload.wikimedia.org/wikipedia/commons/a/ab/Thermostat.jpg",
               "page": "https://commons.wikimedia.org/wiki/File:Thermostat.jpg",
               "credit": "Test Author, Wikimedia Commons", "licence": "CC BY-SA 4.0", "alt": "A wall thermostat."}},
]
LAUNCHED = [
    {"company": "Anthropic", "what": "Whiteboards, a shared canvas inside its office tools", "claim": True,
     "source": {"name": "Anthropic newsroom", "url": "https://www.anthropic.com/news/test"}, "tag": "AI"},
    {"company": "Test Security Ltd", "what": "A free scanner for leaked passwords", "claim": True,
     "source": {"name": "Test Security blog", "url": "https://blog.testsecurity.example/launch"}, "tag": "Cyber"},
]
good = copy.deepcopy(real)
good["builds"], good["launched"] = copy.deepcopy(BUILDS), copy.deepcopy(LAUNCHED)
good.setdefault("evidence", {"searches": 20, "kept": 5, "rejected": []}).update(build_searches=5, builds_kept=3)


def broke(fn, base=None):
    b = copy.deepcopy(base or good); fn(b); return b


B = lambda b, i=0: b["builds"][i]
earlier_day = (day - datetime.timedelta(days=3)).isoformat()
earlier_brief = {"date": earlier_day, "builds": [copy.deepcopy(BUILDS[1])]}
CASES = [
    # (name, change, expected message, earlier briefs, live)
    ("five builds", lambda b: b["builds"].extend(copy.deepcopy(BUILDS[:2])), "a list of 0 to 4 builds"),
    ("builds not a list", lambda b: b.update(builds={"what": "x"}), "a list of 0 to 4 builds"),
    ("two Claim only builds", lambda b: B(b, 1).update(proof="Claim only"), "2 are Claim only; at most 1 a day"),
    ("a made-up proof word", lambda b: B(b).update(proof="Seen working"), "proof must be exactly one of"),
    ("a made-up level", lambda b: B(b).update(level="A day"), "level must be exactly one of"),
    ("one step", lambda b: B(b).update(steps=["Only one."]), "needs 2 to 4 steps"),
    ("five steps", lambda b: B(b).update(steps=["One.", "Two.", "Three.", "Four.", "Five."]), "needs 2 to 4 steps"),
    ("a step too long", lambda b: B(b)["steps"].__setitem__(0, "x" * 111), "build 1 step 1: 111 characters, limit 110"),
    ("no tools", lambda b: B(b).update(tools=[]), "needs 1 to 5 tools"),
    ("six tools", lambda b: B(b).update(tools=["a", "b", "c", "d", "e", "f"]), "needs 1 to 5 tools"),
    ("a tool name too long", lambda b: B(b)["tools"].__setitem__(0, "A very long tool name xy"), "tool 1: 24 characters, limit 22"),
    ("a label too long", lambda b: B(b).update(label="CARTRIDGE ONE"), "label: 13 characters, limit 12"),
    ("a what line too long", lambda b: B(b).update(what="w" * 71), "what: 71 characters, limit 70"),
    ("no what line", lambda b: B(b).pop("what"), "build 1 what: missing text"),
    ("an em dash", lambda b: B(b)["steps"].__setitem__(1, "Claude Code — works it out."), "build 1 step 2: contains an em dash"),
    ("a launch with an em dash", lambda b: b["launched"][0].update(what="Whiteboards — a canvas"), "launch 1 what: contains an em dash"),
    ("a handle with no @", lambda b: B(b).update(who="maker_test"), "who must be a public handle starting @"),
    ("a real name, not a handle", lambda b: B(b).update(who="@Jane Smith"), "who must be a public handle starting @"),
    ("views without at the time of writing", lambda b: B(b).update(reach="48,000 views"), "must say \"at the time of writing\""),
    ("a reach too long", lambda b: B(b).update(reach="x" * 61), "reach: 61 characters, limit 60"),
    ("a video address instead of a code", lambda b: B(b).update(video="https://youtu.be/dQw4w9WgXcQ"), "11-character YouTube video code"),
    ("a video code one short", lambda b: B(b).update(video="dQw4w9WgXc"), "11-character YouTube video code"),
    ("a video code with a quote in it", lambda b: B(b).update(video='dQw4w9Wg"Xc'), "11-character YouTube video code"),
    ("an http link", lambda b: B(b)["links"].update(post="http://x.com/maker_test/status/1"), "links.post: must be a web address starting https://"),
    ("no links", lambda b: B(b).update(links={}), "links needs at least one of post, video or code"),
    ("an unknown link", lambda b: B(b)["links"].update(shop="https://shop.example/"), "only post, video and code are allowed"),
    ("two visuals", lambda b: B(b).update(diagram=SVG), "one visual at most"),
    ("Shown working with no video", lambda b: (B(b).pop("video"), B(b)["links"].pop("video")), "Shown working needs a video"),
    ("Code published with no code", lambda b: B(b, 1)["links"].update(code="", post="https://x.com/grower/status/3"), "Code published needs links.code"),
    ("no source on a confirmed build", lambda b: B(b).pop("source"), "needs a source naming the page you opened"),
    ("the post as its own source", lambda b: B(b)["source"].update(url="https://x.com/maker_test/status/1"), "cannot confirm a build"),
    ("a source older than 7 days", lambda b: B(b)["source"].update(date=f"{old.day} {old:%b}"), "more than 7 days before this brief"),
    ("a source with no date", lambda b: B(b)["source"].pop("date"), "build 1 source date: missing text"),
    ("a diagram with a script", lambda b: B(b, 1).update(diagram=SVG.replace("</svg>", "<script>alert(1)</script></svg>")), "build 2 diagram: must not contain <script"),
    ("a diagram that is not SVG", lambda b: B(b, 1).update(diagram=SVG[:-12]), "build 2 diagram: not valid SVG"),
    ("a diagram with a web address", lambda b: B(b, 1).update(diagram=SVG.replace("</svg>", '<text x="10" y="190" font-size="14">https://evil.test</text></svg>')), "build 2 diagram: no web addresses"),
    ("a diagram with tiny labels", lambda b: B(b, 1).update(diagram=SVG.replace('font-size="16"', 'font-size="9"')), "below 14"),
    ("a photo not on Commons or Unsplash", lambda b: B(b, 2)["photo"].update(src="https://maker.example/me.jpg"), "build 3 photo: src must be"),
    ("a photo with no free licence", lambda b: B(b, 2)["photo"].update(licence="All rights reserved"), "build 3 photo: licence must be one of"),
    ("no level note", lambda b: B(b).pop("level_note"), "build 1 level_note: missing text"),
    ("no first step", lambda b: B(b).pop("first_step"), "build 1 first_step: missing text"),
    ("two builds the same", lambda b: B(b, 2).update(what=B(b)["what"]), "two builds have the same what line"),
    ("a broken build_searches count", lambda b: b["evidence"].update(build_searches="lots"), "evidence build_searches"),
    ("four launches", lambda b: b["launched"].extend(copy.deepcopy(LAUNCHED)), "a list of 0 to 3 launches"),
    ("a launch not marked as the company's claim", lambda b: b["launched"][0].update(claim=False), "claim must be true"),
    ("a launch claim written as a word", lambda b: b["launched"][0].update(claim="true"), "claim must be true"),
    ("a launch with a made-up tag", lambda b: b["launched"][0].update(tag="Science"), "launch 1: tag must be AI, Tech or Cyber"),
    ("a launch with an http source", lambda b: b["launched"][0]["source"].update(url="http://www.anthropic.com/news/test"), "launch 1: source url must be https"),
    ("a launch resting on an X post only", lambda b: b["launched"][0]["source"].update(url="https://x.com/anthropic/status/9"), "is lead only in sources.json"),
    ("a company name too long", lambda b: b["launched"][1].update(company="c" * 41), "launch 2 company: 41 characters, limit 40"),
    ("a launch with no source", lambda b: b["launched"][1].pop("source"), "launch 2: needs a source with name and url"),
]
SPECIAL = [
    ("a build repeated from 3 days before", lambda b: None, "same build as the " + earlier_day + " brief. Never repeat a build", {earlier_day: earlier_brief}, True),
    ("builds before BUILDS_FROM", lambda b: b.pop("launched"), "builds: not allowed in editions dated before 2026-11-14", {}, False),
    ("launched before BUILDS_FROM", lambda b: b.pop("builds"), "launched: not allowed in editions dated before 2026-11-14", {}, False),
    ("an empty builds list before BUILDS_FROM", lambda b: (b.pop("launched"), b.update(builds=[])), "builds: not allowed in editions dated before", {}, False),
]

misses = []


def first_line(o):
    return o.strip().splitlines()[-1] if o.strip() else o


# 1. Neither key: exactly what the checker printed before plan 16, before and after go-live.
before = run(real, checker=OLD_CHECKER)
for label, live in (("before BUILDS_FROM", False), ("after BUILDS_FROM", True)):
    now = run(real, live=live)
    ok = now == before and now.strip().endswith("PASSED")
    print(("  same    " if ok else "  CHANGED ") + f"brief with neither key, {label}: {first_line(now)}")
    if not ok:
        misses.append(f"neither key, {label}: before plan 16 printed {before!r}, now {now!r}")
# 2. Good builds and launches, and empty lists, pass once live.
for label, b in (("good builds and launches", good), ("empty builds and launched lists", broke(lambda b: b.update(builds=[], launched=[])))):
    o = run(b)
    ok = o.strip().endswith("PASSED")
    print(("  passes  " if ok else "  FAILED  ") + label)
    if not ok:
        misses.append(f"{label} did not pass:\n{o[:800]}")
# 3. Each rule fails with its message.
for name, fn, want, *rest in CASES + SPECIAL:
    earlier, live = (rest + [{}, True])[:2] if rest else ({}, True)
    o = run(broke(fn), live=live, earlier=earlier)
    ok = o.startswith("FAILED") and want in o
    print(("  caught  " if ok else "  MISSED  ") + name)
    if not ok:
        misses.append(f"{name}: expected FAILED with {want!r}, got:\n{o[:600]}")
# 4. recent.py prints build titles from the last 7 briefs, never links, after its usual output.
with tempfile.TemporaryDirectory() as t:
    t = pathlib.Path(t)
    shutil.copy(ROOT / "recent.py", t / "recent.py")
    (t / "briefs").mkdir()
    ds = [(day - datetime.timedelta(days=k)).isoformat() for k in range(9, 0, -1)]
    for k, d in enumerate(ds):
        bb = {"date": d, "posters": [{"tag": "AI", "headline": f"Headline {d}", "source": {"name": "Test", "url": "https://example.org/a"}}]}
        if k in (0, 3, 8):
            bb["builds"] = [dict(copy.deepcopy(BUILDS[0]), what=f"Build title {d}")]
        (t / "briefs" / f"{d}.json").write_text(json.dumps(bb))
    (t / "briefs" / "index.json").write_text(json.dumps(ds))
    o = subprocess.run([sys.executable, "-I", str(t / "recent.py"), date], capture_output=True, text=True).stdout
    head = o.find("Builds in the last 7 briefs")
    checks = [
        ("recent.py still prints the last 3 headlines first", head > 0 and all(f"Headline {d}" in o[:head] for d in ds[-3:])),
        ("recent.py prints build titles from the last 7 briefs", f"Build title {ds[3]}" in o and f"Build title {ds[8]}" in o),
        ("recent.py leaves out builds older than 7 briefs", f"Build title {ds[0]}" not in o),
        ("recent.py prints no links", "http" not in o),
    ]
    for name, ok in checks:
        print(("  ok      " if ok else "  WRONG   ") + name)
        if not ok:
            misses.append(f"{name}:\n{o}")
if misses:
    print("BUILDS FAILED"); print("\n".join(misses)); sys.exit(1)
print(f"BUILDS OK: neither key unchanged, good builds pass, {len(CASES) + len(SPECIAL)} broken briefs fail, recent.py prints titles")
