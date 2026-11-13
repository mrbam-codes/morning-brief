"""Warp Run page test at true phone width (plan 23). Run from the repository: python3 tests/test_warp_page.py OUT_DIR

Headless Chrome will not open a window narrower than 500px, so the page runs inside a 390px frame and
tests/warp-audit.js reports from inside it, in real time. The site is staged with every published edition
plus three test editions: a 7-question weekend quiz (14 November), and an edition with no quiz (13 November).
Asserts, by answering (not jumping):
- all five endings, with motion by tapping and with reduced motion by keyboard (keys A to D, focus moves
  to the next button): the gauge is right after every answer (lit cells, FUEL n/5, its spoken label), the
  ending matches the score, the points sum line shows, the progress save matches the picks, and the
  result is saved with the progress cleared;
- no sideways scroll, no clipped or overlapping text, no text under 12px, every button at least 44px,
  and the score badge never covers the gauge or the ending headline;
- the practice refuel: each missed one put right charges a cell, a miss in practice shows "cells to go",
  reaching home plays the coda, and nothing saved changes (points, streak, badge);
- the 7-question quiz: 7 cells, HOME after cell 6, 6 right gets home, 5 right docks at the moon;
- an older edition from the list plays and saves under its own date;
- a finished quiz reopened shows its ending and points without re-awarding; its whole-quiz replay is practice;
- the drawing runs only on screen with the page visible, and nothing loops under reduced motion;
- an edition with no quiz keeps the old card; the Review button still plays its sheet;
- the quiz is still the last section; no console errors in any run.
Screenshots of each ending (and the practice coda) are saved in OUT_DIR.
Prints WARP PAGE OK or the misses.
"""
import concurrent.futures, functools, html, http.server, json, os, pathlib, re, shutil, subprocess, sys, tempfile, threading, time, urllib.parse, uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
here = ROOT / "tests"
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(tempfile.mkdtemp())
out.mkdir(parents=True, exist_ok=True)
chrome = shutil.which("google-chrome") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


def git(*a):
    return subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True, check=True).stdout


work = pathlib.Path(tempfile.mkdtemp())
(work / "news.json").write_text(git("show", "origin/briefs:briefs/2026-11-12.json"), encoding="utf-8")
WEEKEND, NOQUIZ = "2026-11-14", "2026-11-13"
subprocess.run([sys.executable, str(here / "fixture.py"), str(work / "news.json"), WEEKEND, str(work / f"{WEEKEND}.json")], check=True, capture_output=True)
nq = json.loads((work / "news.json").read_text(encoding="utf-8"))
nq.pop("quiz", None); nq["date"] = NOQUIZ
(work / f"{NOQUIZ}.json").write_text(json.dumps(nq, ensure_ascii=False), encoding="utf-8")
site = out / "site"
subprocess.run(["sh", str(here / "stage.sh"), str(site), str(work / f"{WEEKEND}.json"), str(work / f"{NOQUIZ}.json")], check=True, capture_output=True)
idx = (site / "index.html").read_text(encoding="utf-8")
assert idx.count('<script src="motion.js"></script>') == 1 and idx.count("</body>") == 1
test = idx.replace('<script src="motion.js"></script>', '<script src="wp-errs.js"></script>\n<script src="motion.js"></script>', 1)
(site / "warp-test.html").write_text(test.replace("</body>", '<script src="warp-audit.js"></script></body>', 1), encoding="utf-8")
# the one-word revert: a copy of warp.js with HOME_ART set to 'house', and a test page that loads it (phases with house=1)
wj = (site / "warp.js").read_text(encoding="utf-8")
assert wj.count("var HOME_ART='bed'") == 1 and test.count('<script src="warp.js"></script>') == 1
(site / "warp-house.js").write_text(wj.replace("var HOME_ART='bed'", "var HOME_ART='house'", 1), encoding="utf-8")
(site / "warp-test-house.html").write_text(test.replace('<script src="warp.js"></script>', '<script src="warp-house.js"></script>', 1).replace("</body>", '<script src="warp-audit.js"></script></body>', 1), encoding="utf-8")
shutil.copy(here / "warp-audit.js", site / "warp-audit.js")
(site / "wp-errs.js").write_text(
    "window.__wpErrs=[];addEventListener('error',e=>{if(e instanceof ErrorEvent)__wpErrs.push('error: '+e.message)},true);"
    "addEventListener('unhandledrejection',e=>__wpErrs.push('rejection: '+(e.reason&&e.reason.message||e.reason)));"
    "document.addEventListener('securitypolicyviolation',e=>__wpErrs.push('policy: '+e.violatedDirective+' '+e.blockedURI));"
    "(()=>{const ce=console.error;console.error=function(...a){__wpErrs.push('console: '+a.map(String).join(' ').slice(0,200));return ce.apply(console,a)}})();")
# seeds, set in the frame before the page loads: streak4 (4 days done before the edition), done3 (and the
# edition itself finished 3 of 5), review (a missed question due today); the tour is always marked as seen
(site / "wp-frame.js").write_text(
    "addEventListener('message',e=>{if(e.data&&e.data.audit){const p=document.createElement('pre');p.id='audit';p.textContent=e.data.audit;document.body.append(p)}});"
    "const Q=new URLSearchParams(location.search),seed=Q.get('seed'),page=Q.get('page'),date=new URLSearchParams(page.split('#')[0].split('?')[1]||'').get('d');"
    "const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');"
    "const back=n=>{const[y,m,d]=date.split('-').map(Number);return ds(new Date(y,m-1,d-n))};"
    "localStorage.clear();if(seed!=='none'){const days={};for(let i=4;i>=1;i--)days[back(i)]={score:4,total:5,points:0,at:1762800000000};"
    "if(seed==='done3')days[date]={score:3,total:5,points:0,at:1762900000000};"
    "const prog=seed==='prog1'?{[date]:[0]}:{};"
    "const S={days,tags:{AI:[5,6],Tech:[4,5],Cyber:[3,4]},lessons:{},points:0,badges:{},review:[],prog,sound:false,v2:1,bonus:0};"
    "if(seed==='review')S.review=[{q:'Which is a test review question?',options:['This one','Not this','Nor this','Nor that'],answer:0,why:'Test reason.',tag:'Tech',kind:'lesson',n:1,id:'2026-11-01-0',box:0,due:ds(new Date())}];"
    "localStorage.setItem('mb-v1',JSON.stringify(S))}"
    "try{localStorage.setItem('mb-tour-v1','1')}catch(e){}"
    "const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;f.src=page;document.body.style.margin=0;document.body.append(f);")
T0 = time.time()
GIF = bytes.fromhex("47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b")
HOLDS = {}
LOCK = threading.Lock()


def hold(i):
    with LOCK:
        return HOLDS.setdefault(i, threading.Event())


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        route, _, q = self.path.partition("?")
        if route in ("/hold", "/done"):
            i = urllib.parse.parse_qs(q).get("id", [""])[0]
            if os.environ.get("WARP_DEBUG"):
                print(round(time.time() - T0, 1), route, i, flush=True)
            if route == "/hold":
                hold(i).wait(800)
            else:
                hold(i).set()
            self.send_response(200); self.send_header("Content-Type", "image/gif"); self.send_header("Content-Length", str(len(GIF))); self.end_headers(); self.wfile.write(GIF)
            return
        super().do_GET()


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"
ERR = re.compile(r"Uncaught|Refused|Failed to load|Error|error|violat")
consoles = []


def run(date, phase, seed="streak4", reduced=False, shot=None):
    rid = uuid.uuid4().hex[:10]
    (site / f"wp-frame-{rid}.html").write_text(f'<!doctype html><meta charset="utf-8"><body><script src="wp-frame.js"></script><img src="hold?id={rid}" alt=""></body>')
    prof = tempfile.mkdtemp()
    args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=390,844", "--hide-scrollbars",
            "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", "--enable-logging=stderr", "--v=0"]
    if reduced:
        args.append("--force-prefers-reduced-motion")
    url = f"{base}/wp-frame-{rid}.html?id={rid}&seed={seed}&page=" + urllib.parse.quote(f"{'warp-test-house.html' if 'house=1' in phase else 'warp-test.html'}?d={date}#{phase}", safe="")
    p = subprocess.run(args + ([f"--screenshot={shot}"] if shot else ["--dump-dom"]) + [url], capture_output=True, text=True, timeout=900)
    (site / f"wp-frame-{rid}.html").unlink(missing_ok=True)
    for l in p.stderr.splitlines():
        if "CONSOLE" in l:
            msg = l.split("] ", 1)[-1][:300]
            if "briefs/img/" in msg or "willReadFrequently" in msg:
                continue
            consoles.append((date + " " + phase[:24], msg))
    if shot:
        return None
    m = re.search(r'<pre id="audit">(.*?)</pre>', p.stdout, re.S)
    return json.loads(html.unescape(m.group(1))) if m else {"crash": "audit did not report"}


D = "2026-11-12"
quiz = {d: json.loads((site / "briefs" / f"{d}.json").read_text(encoding="utf-8")) for d in (D, WEEKEND, "2026-11-10")}
WANT = {5: "full", 4: "last", 3: "sight", 2: "stop", 1: "stop", 0: "tow"}
HEAD = {"full": "Home with a full tank", "last": "Just made it home", "sight": "Home is in sight", "stop": "Overnight at the fuel stop", "tow": "A friendly tow for the night"}
jobs = {
    # motion, tapping: all five endings
    "motion full": (D, "play=rrrrr", "streak4", False), "motion last": (D, "play=rrrrw", "streak4", False),
    "motion sight": (D, "play=rwrwr&prac=1", "streak4", False), "motion stop": (D, "play=wrwwr&prac=1", "streak4", False),
    "motion tow": (D, "play=wwwww&prac=mix", "none", False),
    # reduced motion, by keyboard
    "reduced full": (D, "play=rrrrr&kb=1", "streak4", True), "reduced last": (D, "play=wrrrr&kb=1", "streak4", True),
    "reduced sight": (D, "play=rrwwr&kb=1&prac=1", "streak4", True), "reduced stop": (D, "play=wwwwr&kb=1&prac=mix", "streak4", True),
    "reduced tow": (D, "play=wwwww&kb=1&prac=1", "streak4", True),
    # the weekend quiz and an older edition
    "weekend 6 of 7": (WEEKEND, "play=rrrrrrw", "streak4", False), "weekend 5 of 7": (WEEKEND, "play=rrrrrww&kb=1&prac=1", "streak4", True),
    "older edition": ("2026-11-10", "play=rrwrr", "streak4", False), "kimchi day": ("2026-11-11", "play=rrrrr", "streak4", False),
    # reopened, review, no quiz
    "reopen motion": (D, "reopen", "done3", False), "reopen reduced": (D, "reopen", "done3", True),
    "review": (D, "review", "review", True), "noquiz": (NOQUIZ, "noquiz", "streak4", False),
    # HOME_ART='house' still draws the house, with its own words
    "house full": (D, "play=rrrrr&house=1", "streak4", False), "house last": (D, "play=rrrrw&house=1", "streak4", True),
    "house sight": (D, "play=rwrwr&prac=1&house=1", "streak4", False),
    # a notched phone: the badge 47px lower must still clear the scene, gauge and headline; resuming after 1 answer
    "inset sight": (D, "play=rwrwr&inset=1", "streak4", False), "resume one": (D, "intro", "prog1", True),
    # the design audit of 13 Nov 2026: targets, small text, sheets, badge chip, footer, older edition, missing edition
    "probe": (D, "probe", "streak4", False), "probe older": ("2026-11-10", "probe", "streak4", True), "missing edition": ("2026-01-01", "fail", "streak4", True),
}
ONLY = [k for k in os.environ.get("WARP_ONLY", "").split(",") if k]  # for debugging: run only these jobs, no screenshots
if ONLY:
    jobs = {k: v for k, v in jobs.items() if k in ONLY}
if os.environ.get("WARP_SHOTS"):  # for looking at the art: screenshots only
    jobs = {}
shots = {"bed-full": "play=rrrrr&shot=1", "bed-last": "play=rrrrw&shot=1", "bed-sight": "play=rwrwr&shot=1", "stop": "play=wrwwr&shot=1", "tow": "play=wwwww&shot=1", "house-full": "play=rrrrr&house=1&shot=1"}
results = {}
try:
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(int(os.environ.get("WARP_WORKERS", "3"))) as ex:
        fut = {ex.submit(run, *v): k for k, v in jobs.items()}
        sfut = [] if ONLY else [ex.submit(run, D, ph, "streak4", False, str(out / f"warp-390-{k}.png")) for k, ph in shots.items()]
        sfut += [] if ONLY else [ex.submit(run, D, "play=rwrwr&prac=1&shot2=1", "streak4", False, str(out / "warp-390-bed-practice-home.png")),
                 ex.submit(run, D, "play=rwrwr&kb=1&shot=1", "streak4", True, str(out / "warp-390-bed-sight-reduced.png")),
                 ex.submit(run, D, "play=wwwww&kb=1&shot=1", "streak4", True, str(out / "warp-390-tow-reduced.png")),
                 ex.submit(run, D, "play=rwrwr&introshot=1", "streak4", False, str(out / "warp-390-intro.png")),
                 ex.submit(run, D, "play=rwrwr&qshot=2", "streak4", False, str(out / "warp-390-question.png")),
                 ex.submit(run, D, "play=rwrwr&ashot=1", "streak4", False, str(out / "warp-390-after-answer.png")),
                 ex.submit(run, WEEKEND, "play=rrrrrrw&shot=1", "streak4", False, str(out / "warp-390-weekend-last.png"))]
        for f in concurrent.futures.as_completed(fut):
            results[fut[f]] = f.result()
        for f in sfut:
            f.result()
    print(f"{len(jobs)} runs in {round(time.time() - t0)} s")
finally:
    srv.shutdown()
(out / "warp-audit.json").write_text(json.dumps(results, indent=1, ensure_ascii=False))

for name in jobs:
    R, (date, phase, seed, red) = results.get(name, {"crash": "did not run"}), jobs[name]
    t = name
    if "crash" in R:
        need(False, f"{t}: audit ran ({R['crash'][:300]}; {R.get('errs')})"); continue
    if R.get("phase") == "play":
        pat = phase.split("&")[0][5:]
        n, right = len(pat), pat.count("r")
        home = n - 1
        want = "full" if right == n else "last" if right >= home else "sight" if right == home - 1 and right > 0 else "stop" if right else "tow"
        need(R["found"], f"{t}: the quiz is Warp Run, inside a section whose class is still exactly gcard quiz")
        st = R["start"]
        need(st["cellsN"] == n and st["gauge"]["n"] == n and st["gauge"]["fnum"] == f"FUEL 0/{n}" and st["homeAt"]["home"] == home and st["homeAt"]["between"], f"{t}: {n} cells, HOME after cell {home} ({st['homeAt']}, {st['gauge']['fnum']})")
        need(f"{n} charge rings between the cats and home" in st["text"] and f"{home} cells get" in st["text"] and "Launch" in st["text"], f"{t}: the start reads as mocked")
        need(st["last"], f"{t}: the quiz is still the last section")
        cat = "Kimchi" if date == "2026-11-11" else "Charlee"
        need(st["pilot"] == f"Pilot: {cat}" and st["cat"] > 0 and st["catW"] > 20, f"{t}: {cat} flies today, the real cat art is in the ship ({st['pilot']}, {st['cat']} nodes, {st['catW']}px)")
        need(st["launch"] and st["launch"]["bottom"] <= st["vh"], f"{t}: Launch is on screen ({st['launch']})")
        need(all(s["lastOpt"]["bottom"] <= 844 for s in R["steps"]), f"{t}: each question and all its answers fit one screen ({[s['lastOpt']['bottom'] for s in R['steps']]})")
        need(all(s["next"] and 0 <= s["next"]["top"] and s["next"]["bottom"] <= 844 for s in R["steps"]), f"{t}: the next button is on screen after every answer ({[s['next'] for s in R['steps']]})")
        need(all(s["stageH"] == 120 and s["shownOpts"] == (1 if s["ok"] else 2) for s in R["steps"]), f"{t}: compact scene while answering; only the right and picked answers stay ({[(s['stageH'], s['shownOpts']) for s in R['steps']]})")
        need(all(not s["stageOver"] and not s["afterOver"] for s in R["steps"]), f"{t}: the badge never covers the scene or gauge while answering")
        need(not st["issues"] and not st["tiny"] and not st["small"], f"{t}: start: no clipped or overlapping text, nothing under 12px, buttons 44px ({st['issues']}, {st['tiny']}, {st['small']})")
        if not red:
            need(R["liveOn"] and not R["liveOff"] and R["liveBack"] and not R["liveHidden"] and R["liveShown"], f"{t}: the drawing runs only on screen with the page visible ({R['liveOn']}, {R['liveOff']}, {R['liveBack']}, {R['liveHidden']}, {R['liveShown']})")
        bad = [s for s in R["steps"] if s["g"]["cells"] != s["want"] or s["g"]["on"] != s["want"] or s["g"]["fnum"] != f"FUEL {s['want']}/{n}" or s["g"]["aria"] != f"Fuel: {s['want']} of {n} cells charged. Home needs {home}."]
        need(len(R["steps"]) == n and not bad, f"{t}: the gauge is right after every answer ({[(s['i'], s['g']['fnum'], s['want']) for s in bad][:3]})")
        need(all(("Ring charged" in s["live"]) == s["ok"] and ("Not quite" in s["live"]) != s["ok"] for s in R["steps"]), f"{t}: every result is announced ({[s['live'][:30] for s in R['steps']][:2]})")
        need(all(s["gaugeClear"] for s in R["steps"]), f"{t}: the score badge never covers the gauge while answering")
        need(all(not s["issues"] and not s["tiny"] for s in R["steps"]), f"{t}: answered questions: no clipped or overlapping text, nothing under 12px ({[s['issues'] or s['tiny'] for s in R['steps'] if s['issues'] or s['tiny']][:2]})")
        need([len(s["saved"] or []) for s in R["steps"][:-1]] == list(range(1, n)), f"{t}: each answer is saved as progress, as before ({[s['saved'] for s in R['steps']][:3]})")
        if "kb=1" in phase:
            need(R.get("kbFocusable") and all(s["focusNext"] for s in R["steps"]), f"{t}: keys answer, options are focusable buttons and focus moves to the next button")
        E = R["end"]
        need(E["ending"] == want and E["head"] == HEAD[want] and E["big"] == f"{right}/{n}", f"{t}: {right} of {n} gives the {want} ending ({E['ending']}, {E['head']!r}, {E['big']})")
        need(E["saved"] and E["saved"]["score"] == right and E["saved"]["total"] == n and E["progGone"] and E["pts"] == f"+{E['saved']['points']} points" and str(E["saved"]["points"]) == E["points"], f"{t}: saved {E['saved']}, progress cleared, {E['pts']} shown")
        need(re.fullmatch(rf"{right} right × 10( \+ 20 perfect)?(, × [\d.]+ streak)? = \+{E['saved']['points']} points", E["math"] or "") is not None, f"{t}: the points sum line shows ({E['math']!r})")
        need(E["gauge"]["cells"] == right and E["gauge"]["on"] == right and E["pointsInBadge"], f"{t}: ending gauge {E['gauge']['fnum']} and the badge has the new total ({E['badge']})")
        need(E["stageH"] == 220 and not E["overScene"] and E["math2"]["bottom"] <= 844 and (not E["prac"] or E["prac"]["bottom"] <= 844), f"{t}: ending: full scene, badge clear of scene, gauge and headline, points line and practise button on screen ({E['math2']}, {E['prac']})")
        need(E["headClear"] and E["gaugeClear"] and E["focusHead"], f"{t}: the badge covers neither the gauge nor the headline; focus on the headline")
        need(not E["issues"] and not E["tiny"] and not E["small"], f"{t}: ending: no clipped or overlapping text, nothing under 12px, buttons 44px ({E['issues']}, {E['tiny']}, {E['small']})")
        need(E["head"] in E["live"] and f"{right} out of {n}" in E["live"], f"{t}: the ending is announced ({E['live']!r})")
        need(("Practise the missed ones" in E["buttons"]) == (right < home) and "Play the whole quiz again (practice)" in E["buttons"], f"{t}: practice offered only short of home ({E['buttons']})")
        if want in ("full", "last", "sight"):
            art = "house" if "house=1" in phase else "bed"
            need(E.get("drawn") == art, f"{t}: home is drawn as the {art} ({E.get('drawn')})")
            words = {("bed", "full"): "the cat bed is warm and waiting", ("bed", "last"): "right beside the cat bed", ("bed", "sight"): "the night light by the cat bed",
                     ("house", "full"): "the whole sky lights up for the crew", ("house", "last"): "right outside the door", ("house", "sight"): "close enough to see the porch light"}[(art, want)]
            gone = ("porch", "door") if art == "bed" else ("cat bed",)
            need(words in E["lines"] and not any(g in E["lines"] for g in gone), f"{t}: the {art} words ({E['lines']!r})")
        if red:
            need(not E["endless"], f"{t}: nothing loops under reduced motion ({E['endless']})")
        if "prac" in phase:
            P = R.get("prac") or {}
            need(P.get("same") and P.get("badgeSame"), f"{t}: practice changes nothing saved, the badge is unchanged")
            need(P.get("ending") == "coda" and "Home after practice" in (P.get("coda") or "") and f"Today’s score stays {right}/{n}" in (P.get("coda") or ""), f"{t}: the practice refuel reaches home ({P.get('log')}, {P.get('coda')!r})")
            need(all(x.endswith("/np") for x in P.get("log", []) if x[:1] in "rw" and "/" in x), f"{t}: every practice question says no points")
            if "prac=mix" in phase:
                need(any("practice-short" in x for x in P.get("log", [])) and any("to go" in x for x in P.get("log", [])), f"{t}: a miss in practice shows cells to go and Practise the rest ({P.get('log')})")
            need(P.get("drawn") == ("house" if "house=1" in phase else "bed"), f"{t}: home after practice is drawn as the {'house' if 'house=1' in phase else 'bed'} ({P.get('drawn')})")
            need(not P.get("issues") and not P.get("tiny"), f"{t}: practice coda text fits ({P.get('issues')}, {P.get('tiny')})")
        need(R["scrollWidth"] <= 390 and E["scrollWidth"] <= 390, f"{t}: no sideways scroll ({R['scrollWidth']})")
        need(not R["errs"], f"{t}: no errors in the page ({R['errs']})")
    elif R.get("phase") == "reopen":
        need(R["ending"] == "sight" and R["head"] == "Home is in sight" and "Today’s quiz · finished" in R["text"] and "3/5" in R["text"], f"{t}: a finished 3 of 5 reopens on its ending ({R['ending']}, {R['head']!r})")
        need(R["same"] and R["sameAfterReplay"] and R["badge"] == R["badgeAfter"], f"{t}: reopening and replaying saves nothing and awards nothing ({R['badge']})")
        need(re.search(r"\+\d+ points earned\. Replays are for practice", R["text"]) is not None and R["gauge"]["cells"] == 3, f"{t}: it shows the points earned and 3 cells")
        need(R["again"] and "no points" in (R.get("replayKick") or "") and "Practice run: not scored" in (R.get("replayText") or "") and R.get("replayEnd") == "full", f"{t}: the whole quiz again is practice ({R.get('replayKick')!r})")
        need(not R["issues"] and not R["tiny"] and not R["small"] and R["scrollWidth"] <= 390 and not R["errs"], f"{t}: text fits, no errors ({R['issues']}, {R['tiny']}, {R['small']}, {R['errs']})")
    elif R.get("phase") == "review":
        need(R.get("button") and R.get("sheet") == "Review" and R.get("why") and not R.get("errs"), f"{t}: the Review button still plays its own sheet ({R.get('sheet')}, {R.get('errs')})")
    elif R.get("phase") == "intro":
        need("You are 1 question in" in (R.get("text") or "") and "Resume quiz" in R["text"], f"{t}: one answer in reads 'You are 1 question in' ({(R.get('text') or '')[:60]!r})")
    elif R.get("phase") == "noquiz":
        need(R.get("found") and not R.get("warp") and R.get("cls") == "gcard quiz" and "0 questions" in (R.get("text") or "") and not R.get("errs"), f"{t}: an edition with no quiz keeps the old card ({R.get('text')!r})")
older = results.get("older edition", {})
if "older edition" in jobs:
    need((older.get("end") or {}).get("saved", {}).get("score") == 4, "the older edition saves under its own date")
errors = [c for c in consoles if ERR.search(c[1])]
need(not errors, f"no console errors in any run ({errors[:4]})")
for k in ([] if ONLY else list(shots) + ["bed-practice-home", "bed-sight-reduced", "tow-reduced", "weekend-last", "intro", "question", "after-answer"]):
    f = out / f"warp-390-{k}.png"
    need(f.exists() and f.stat().st_size > 20000, f"screenshot {f.name}")
for f in ("warp-test.html", "warp-test-house.html", "warp-house.js", "warp-audit.js", "wp-errs.js", "wp-frame.js"):
    (site / f).unlink(missing_ok=True)
print("screenshots and audit in", out)
print("WARP PAGE OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
