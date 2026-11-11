"""First-visit tour test (plan 17). Run from the repository: python3 tests/test_tour.py [OUT_DIR]

Makes two test editions with tests/fixture.py (news from the newest brief on origin/briefs), one with a
`builds` list and one without, stages a throwaway site with tests/stage.sh, then runs tests/tour-audit.js
in headless Chrome, which drives the page inside a 390 by 844 frame (headless Chrome will not open a window
narrower than 500 pixels), normally and with reduced motion, with every address except this computer
blocked. The run is in real time, because the flights need real frames. Asserts:
- a first visit shows the tour once the brief has drawn, as a dialog with a live region; a second visit does not;
- the seven stops have the script's headings and text, word for word; a day with no builds skips that stop and
  the counter reads "1 of 6"; stop 3 shows the 4 subject chips, stop 7 the home-screen card;
- on every stop, measured at 390 pixels: the card never overlaps the ring, "Skip tour" or the bar, sits fully on
  screen, needs no scrolling and clips no text; the ring lights the right part; no sideways scroll;
- the docks alternate (middle, top, bottom, top...) except where the turn's dock would cover the part; stops 2
  and 3 (one ring) always move the card; in motion each move is a flight (a transform animation and a trail),
  with reduced motion there is no transform animation at all;
- a fast double tap on Next lands on stop 3 with nothing left in flight;
- Skip, finishing and Escape set mb-tour-v1; the Tour button replays; focus goes back to the Tour button;
  Tab stays on the tour's buttons; focus stays on Next after each move;
- saved progress under mb-v1 is byte-identical after the tour, and the cat is the one last on the share card;
- with storage blocked the tour still runs and nothing throws; the tour waits while a sheet is open;
- the quiz block is still last on the page; no console errors.
Prints TOUR OK or the misses. Leaves the staged site in OUT_DIR/site.
"""
import functools, html, http.server, json, pathlib, re, shutil, subprocess, sys, tempfile, threading

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


SCRIPT = [
    ("Welcome aboard", "Ten minutes a day to understand AI (artificial intelligence), technology and cyber security, starting from zero. Every term is explained. The aim: follow the news, judge the claims and start building things yourself."),
    ("Learn", "Aim: one idea at a time, in plain English, with a diagram. You get: after each 3 minute lesson you can explain it to someone else."),
    ("How the lessons are made", "A planned course of 577 lessons in 11 subject areas, such as AI from first principles, Cyber foundations, Building with AI, and Law, policy and geopolitics. Each morning an AI writes the day’s lessons from sources it opens that day, and an automatic checker refuses anything that breaks the rules."),
    ("Today", "Aim: the few stories that matter, not the noise. You get: what happened, why it matters to you, and a link to the source."),
    ("Built in the wild", "Aim: real things people made with AI, each rated by the proof behind it. You get: ideas you could copy, and a first step to try."),
    ("Quiz", "Aim: make today stick. You get: a streak, points and a rank, plus review questions that bring back earlier lessons."),
    ("Your kit", "Progress tracks your streak. Review replays past questions. Glossary explains every term. Add the page to your home screen and I will see you tomorrow. The Tour button replays this."),
]
LIT = {"Learn": "learn", "How the lessons are made": "learn", "Today": "today", "Built in the wild": "builds", "Quiz": "quiz", "Your kit": "bar"}
CHIPS = ["AI from first principles", "Cyber foundations", "Building with AI", "Law, policy and geopolitics"]
BUILDS = [{"what": f"Test build {i} (test)", "who": "@sample_builder", "label": f"BUILD {i}", "steps": ["First test step.", "Second test step."],
           "tools": ["Claude Code"], "proof": "Shown working", "proof_note": "Test proof note.", "level": "An evening", "level_note": "Test.",
           "first_step": "A test first step.", "links": {"post": "https://example.org/post"}} for i in range(1, 4)]
WITH, WITHOUT = "2026-11-12", "2026-11-13"

dates = sorted((p[7:17] for p in git("ls-tree", "--name-only", "origin/briefs", "briefs/").split() if p[7:11].isdigit()), reverse=True)
work = pathlib.Path(tempfile.mkdtemp())
(work / "news.json").write_text(git("show", f"origin/briefs:briefs/{dates[0]}.json"), encoding="utf-8")
files = []
for d, bl in ((WITH, BUILDS), (WITHOUT, None)):
    f = work / f"{d}.json"
    subprocess.run([sys.executable, str(here / "fixture.py"), str(work / "news.json"), d, str(f)], check=True, capture_output=True)
    b = json.loads(f.read_text(encoding="utf-8"))
    b.pop("builds", None)
    if bl:
        b["builds"] = bl
    f.write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")
    files.append(str(f))
site = out / "site"
subprocess.run(["sh", str(here / "stage.sh"), str(site), *files], check=True, capture_output=True)

idx = (site / "index.html").read_text(encoding="utf-8")
# the test copy loads tour-pre.js first: it records errors and, with &block=1, makes storage throw as a locked-down browser does
(site / "tour-test.html").write_text(idx.replace('<script src="motion.js"></script>', '<script src="tour-pre.js"></script>\n<script src="motion.js"></script>', 1), encoding="utf-8")
(site / "tour-pre.js").write_text(
    "window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));addEventListener('unhandledrejection',e=>__errs.push('rejection: '+String(e.reason)));"
    "const ce=console.error;console.error=function(){__errs.push([].map.call(arguments,String).join(' '));return ce.apply(console,arguments)};"
    "if(/[?&]block=1/.test(location.search))Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('The operation is insecure.','SecurityError')}});")
shutil.copy(here / "tour-audit.js", site / "tour-audit.js")
# Chrome dumps the page at the frame page's load event, so the page holds an image the server answers only when the audit is done
(site / "tour-frame.html").write_text('<!doctype html><meta charset="utf-8"><body><script src="tour-audit.js"></script><img src="hold" alt=""></body>')
HOLD = threading.Event()
GIF = bytes.fromhex("47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b")


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        route = self.path.split("?")[0]
        if route in ("/hold", "/done"):
            if route == "/hold":
                HOLD.wait(150)
            else:
                HOLD.set()
            self.send_response(200); self.send_header("Content-Type", "image/gif"); self.send_header("Content-Length", str(len(GIF))); self.end_headers(); self.wfile.write(GIF)
            return
        super().do_GET()


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"


def audit(extra):
    HOLD.clear()
    prof = tempfile.mkdtemp()
    args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=500,900", "--hide-scrollbars",
            "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", *extra, "--dump-dom", f"{base}/tour-frame.html?builds={WITH}&plain={WITHOUT}"]
    dom = subprocess.run(args, capture_output=True, text=True, timeout=240).stdout
    m = re.search(r'<pre id="audit">(.*?)</pre>', dom, re.S)
    return json.loads(html.unescape(m.group(1))) if m else {"crash": "audit did not report"}


def check_stops(tag, stops, want):
    heads = [s["head"] for s in stops]
    need(heads == [h for h, _ in want], f"{tag}: the stops are {[h for h, _ in want]} ({heads})")
    for s, (h, t) in zip(stops, want):
        need(s["text"].startswith(h + " " + t), f"{tag}: '{h}' says the script word for word ({s['text'][:70]!r}...)")
    n = len(want)
    need([s["count"] for s in stops] == [f"{i} of {n}" for i in range(1, n + 1)], f"{tag}: the counter reads 1 of {n} to {n} of {n} ({[s['count'] for s in stops]})")
    for s in stops:
        g = f"{tag} '{s['head']}'"
        need(s["cardRing"] == 0 and s["cardSkip"] == 0 and s["cardBar"] == 0, f"{g}: the card overlaps neither the ring, Skip tour nor the bar (areas {s['cardRing']}, {s['cardSkip']}, {s['cardBar']}; card {s['card']}, ring {s['ring']})")
        need(s["inView"] and not s["scrollable"] and not s["clipped"], f"{g}: the card is fully on screen and no text is cut off (card {s['card']}, clipped {s['clipped']}, scrolls {s['scrollable']})")
        need(s["scrollW"] <= 390, f"{g}: no sideways scroll ({s['scrollW']})")
        need(s["live"].startswith("Step " + s["count"].split(" ")[0] + " of ") and s["label"].startswith("Step "), f"{g}: the step has a screen-reader label and live text")
        need(s["focusNext"], f"{g}: focus is on Next after the move")
        if s["head"] in LIT:
            need(s["ringOn"] and s["lit"] == LIT[s["head"]], f"{g}: the ring lights the {LIT[s['head']]} part ({s['lit']}, ring {s['ring']})")
        else:
            need(not s["ringOn"] and s["dock"] == "mid", f"{g}: no ring, card in the middle")
    docks = [s["dock"] for s in stops]
    print(f"      {tag}: docks {docks}, turns {[s['pref'] for s in stops]}")
    need(all(s["dock"] == s["pref"] or s["why"] == "clear" for s in stops), f"{tag}: a dock other than the turn's is used only when the turn's dock would cover the part")
    need(docks[1] == "top" and docks[2] == "bottom" and stops[1]["card"]["y"] != stops[2]["card"]["y"], f"{tag}: stops 2 and 3 share the Learn ring and the card still moves, top then bottom")
    need(sum(1 for a, b in zip(docks[1:], docks[2:]) if a != b) >= len(docks) - 3, f"{tag}: the card changes dock on almost every stop ({docks})")
    k = next(s for s in stops if s["head"] == "How the lessons are made")
    need(k["chips"] == CHIPS, f"{tag}: stop 3 shows the 4 subject chips ({k['chips']})")
    last = stops[-1]
    need(last["home"] and "Add to Home Screen" in last["text"] and "Install app" in last["text"] and last["next"] == "Start reading", f"{tag}: the last stop lights the top bar and shows the home-screen card")


try:
    for mode, extra in (("motion", []), ("reduced", ["--force-prefers-reduced-motion"])):
        R = audit(extra)
        (out / f"tour-{mode}.json").write_text(json.dumps(R, indent=1, ensure_ascii=False))
        if "crash" in R:
            need(False, f"{mode}: audit crashed: {R['crash']}"); continue
        A, B, P, E, F, G = R["first"], R["second"], R["plain"], R["skip"], R["blocked"], R["sheet"]
        need(R["reduce"] == (mode == "reduced"), f"{mode}: reduced motion is {'on' if mode == 'reduced' else 'off'}")
        need(A["loaded"] and A["openedAt"] and A["flagBefore"] is None, f"{mode}: a first visit shows the tour, and nothing is marked seen until it ends")
        need(A["dialog"] and A["dialog"]["role"] == "dialog" and A["dialog"]["modal"] == "true" and A["dialog"]["live"] == "polite", f"{mode}: the tour is a dialog with a live region ({A['dialog']})")
        need(A["tourBtn"] and A["navOrder"][:4] == ["Progress", "Review", "Glossary", "Tour"], f"{mode}: a Tour button sits beside Progress, Review and Glossary ({A['navOrder']})")
        check_stops(f"{mode} with builds", A["stops"], SCRIPT)
        check_stops(f"{mode} no builds", P["stops"], [s for s in SCRIPT if s[0] != "Built in the wild"])
        need(A["stops"][0]["name"] == "Charlee" and P["stops"][0]["name"] == "Kimchi", f"{mode}: the cat is the one last on the share card: Charlee when saved, else Kimchi ({A['stops'][0]['name']}, {P['stops'][0]['name']})")
        need(set(A.get("tabs") or ["x"]) <= {"tr-skip", "tr-next"}, f"{mode}: Tab stays on the tour's buttons ({A.get('tabs')})")
        fl = A["flights"]
        if mode == "motion":
            need(all(x["transformAnims"] >= 1 and x["trails"] >= 1 for x in fl), f"{mode}: every move is a flight with a trail ({fl})")
            need(all(x["textOff"] for x in fl), f"{mode}: the old text fades out on take-off")
        else:
            need(all(x["transformAnims"] == 0 and x["trails"] == 0 for x in fl), f"{mode}: no transform animation and no trail with reduced motion ({fl})")
        need(A["closed"] and A["flag"] == "1" and A["focus"], f"{mode}: finishing closes the tour, sets mb-tour-v1 and puts focus on the Tour button")
        need(A["seedKept"] and A["same"] and B["same"], f"{mode}: saved progress under mb-v1 is byte-identical after the tour and the replay")
        need(A["quiz"] and A["quiz"]["after"] in ([], ["gcard"]) and A["quiz"]["afterMain"] == ["footer"] and A["quizAfter"] == A["quiz"], f"{mode}: the quiz block is still last ({A['quiz']})")
        need(P["quiz"] and P["quiz"]["afterMain"] == ["footer"], f"{mode}: the quiz block is last on the day with no builds")
        need(B["loaded"] and not B["open"], f"{mode}: a second visit shows no tour")
        need(B["replay"] and B["replayCount"] == "1 of 7", f"{mode}: the Tour button replays it from the start ({B['replayCount']})")
        need(B["escClosed"] and B["focus"] and B["flag"] == "1", f"{mode}: Escape closes it, keeps it marked seen and puts focus on the Tour button")
        need(P["flag"] == "1", f"{mode}: finishing on the day with no builds sets the flag")
        need(E["landedOn"]["head"] == "How the lessons are made" and E["landedOn"]["count"] == "3 of 7" and not E["stillFlying"] and E["landedOn"]["cardRing"] == 0, f"{mode}: a fast double tap on Next lands on stop 3 with nothing in flight ({E['landedOn']['count']})")
        need(E["closed"] and E["flag"] == "1" and "Tap Tour" in (E["toast"] or ""), f"{mode}: Skip closes the tour, sets the flag and says how to replay it")
        need(F["blockedReally"] and F["open"] and F["closed"] and F["quiz"] and not F["errors"], f"{mode}: with storage blocked the tour runs and closes and nothing throws ({F['errors']})")
        need(G["sheet"] and not G["openUnderSheet"] and G["openAfter"], f"{mode}: the tour waits while a sheet is open and starts once it closes")
        errs = A["errors"] + B["errors"] + P["errors"] + E["errors"] + G["errors"]
        need(not errs, f"{mode}: no console errors ({errs[:3]})")
finally:
    srv.shutdown()
    for f in ("tour-test.html", "tour-pre.js", "tour-audit.js", "tour-frame.html"):
        (site / f).unlink(missing_ok=True)
print("staged site kept at", site)
print("TOUR OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
