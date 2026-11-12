"""Scoring parity for Warp Run (plan 23). Run from the repository: python3 tests/test_warp_parity.py OUT_DIR

The non-negotiable: the new quiz scores, saves and keeps the streak exactly as the page did before it.
Stages two copies of the site side by side: old/ (commit 7f7b53d, the quiz in a sheet) and new/ (this
working tree, Warp Run), with the published briefs plus a 7-question weekend fixture (14 November).
For the 12 November edition and the weekend fixture, with starting streaks of 0, 4 and 9 days, and for
all right, all wrong and two mixed patterns (plus a quiz left half way and resumed), it drives both
pages in headless Chrome with the same answers and asserts:
- everything the page saved (points, streak days, the day's result, topics, lessons, review queue,
  badges, progress) is identical between old and new, byte for byte once the "at" timestamps are removed;
- the finish shows the same points sum line ("4 right × 10, × 1.5 streak = +60 points");
- practice afterwards (old: Practise again; new: the practice refuel and the whole-quiz replay) changes
  none of it, byte for byte, timestamps included;
- reopening the finished quiz shows the ending for the saved score and saves nothing;
- the ending matches the score (5 of 5: home with a full tank; home needs all but one cell);
- no errors in either page.
Prints WARP PARITY OK or the misses.
"""
import functools, html, http.server, json, pathlib, re, shutil, subprocess, sys, tempfile, threading, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
here = ROOT / "tests"
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(tempfile.mkdtemp())
out.mkdir(parents=True, exist_ok=True)
chrome = shutil.which("google-chrome") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OLD = "7f7b53d"
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


def git(*a):
    return subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True, check=True).stdout


# ---------- two copies of the site, same briefs ----------
work = pathlib.Path(tempfile.mkdtemp())
(work / "news.json").write_text(git("show", "origin/briefs:briefs/2026-11-12.json"), encoding="utf-8")
WEEKEND = "2026-11-14"
subprocess.run([sys.executable, str(here / "fixture.py"), str(work / "news.json"), WEEKEND, str(work / f"{WEEKEND}.json")], check=True, capture_output=True)
base_dir = out / "parity-site"
shutil.rmtree(base_dir, ignore_errors=True)
subprocess.run(["sh", str(here / "stage.sh"), str(base_dir / "new"), str(work / f"{WEEKEND}.json")], check=True, capture_output=True)
(base_dir / "old").mkdir()
arc = subprocess.run(["git", "-C", str(ROOT), "archive", OLD], capture_output=True, check=True).stdout
subprocess.run(["tar", "-x", "-C", str(base_dir / "old")], input=arc, check=True)
shutil.rmtree(base_dir / "old" / "tests")
shutil.copytree(base_dir / "new" / "briefs", base_dir / "old" / "briefs", dirs_exist_ok=True)
ERRS = ("window.__wpErrs=[];addEventListener('error',e=>{if(e instanceof ErrorEvent)__wpErrs.push('error: '+e.message)},true);"
        "addEventListener('unhandledrejection',e=>__wpErrs.push('rejection: '+(e.reason&&e.reason.message||e.reason)));"
        "document.addEventListener('securitypolicyviolation',e=>__wpErrs.push('policy: '+e.violatedDirective+' '+e.blockedURI));"
        "(()=>{const ce=console.error;console.error=function(...a){__wpErrs.push('console: '+a.map(String).join(' ').slice(0,200));return ce.apply(console,a)}})();")
for v in ("old", "new"):
    f = base_dir / v / "index.html"
    s = f.read_text(encoding="utf-8")
    assert s.count('<script src="motion.js"></script>') == 1
    f.write_text(s.replace('<script src="motion.js"></script>', '<script src="wp-errs.js"></script>\n<script src="motion.js"></script>', 1), encoding="utf-8")
    (base_dir / v / "wp-errs.js").write_text(ERRS)
    (base_dir / v / "sw.js").write_text("")  # no service worker in the test copies: every load comes from disk
shutil.copy(here / "warp-parity.js", base_dir / "warp-parity.js")
(base_dir / "harness.html").write_text('<!doctype html><meta charset="utf-8"><body style="margin:0"><img src="hold" alt=""><script src="warp-parity.js"></script></body>')
old_idx = (base_dir / "old" / "index.html").read_text(encoding="utf-8")
need("warp.js" not in old_idx and "warp.js" in (base_dir / "new" / "index.html").read_text(encoding="utf-8"), "old/ is the page before Warp Run and new/ has it")

# ---------- cases ----------
editions = {d: json.loads((base_dir / "new" / "briefs" / f"{d}.json").read_text(encoding="utf-8")) for d in ("2026-11-12", WEEKEND)}
cases = []
for d, b in editions.items():
    q = b["quiz"]
    n = len(q)
    right = [it["answer"] for it in q]
    wrong = [(it["answer"] + 1) % 4 for it in q]
    mixA = [right[i] if i % 2 == 0 else wrong[i] for i in range(n)]
    mixB = [wrong[i] if i in (0, n - 2) else right[i] for i in range(n)]
    for name, picks in (("all right", right), ("all wrong", wrong), ("mixed A", mixA), ("mixed B", mixB)):
        for k in (0, 4, 9):
            cases.append({"id": f"{d} {name} streak {k}", "date": d, "streak": k, "picks": picks, "items": q})
    cases.append({"id": f"{d} resumed after 2, streak 4", "date": d, "streak": 4, "picks": mixB, "items": q, "resumeAt": 2})
need(len(editions["2026-11-12"]["quiz"]) == 5 and len(editions[WEEKEND]["quiz"]) == 7, "the 12 November quiz has 5 questions and the weekend fixture 7")

HOLD = threading.Event()
GIF = bytes.fromhex("47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b")


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        route = self.path.split("?")[0]
        if route in ("/hold", "/done"):
            if route == "/hold":
                HOLD.wait(900)
            else:
                HOLD.set()
            self.send_response(200); self.send_header("Content-Type", "image/gif"); self.send_header("Content-Length", str(len(GIF))); self.end_headers(); self.wfile.write(GIF)
            return
        super().do_GET()


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(base_dir)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_port}/harness.html#" + urllib.parse.quote(json.dumps({"cases": cases}), safe="")
try:
    prof = tempfile.mkdtemp()
    p = subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=500,900", "--hide-scrollbars",
                        "--force-prefers-reduced-motion", "--autoplay-policy=no-user-gesture-required",
                        "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", "--dump-dom", url], capture_output=True, text=True, timeout=900)
finally:
    srv.shutdown()
m = re.search(r'<pre id="audit">(.*?)</pre>', p.stdout, re.S)
rows = json.loads(html.unescape(m.group(1))) if m else {"crash": "harness did not report: " + p.stderr[-800:]}
(out / "warp-parity.json").write_text(json.dumps(rows, indent=1, ensure_ascii=False))
if isinstance(rows, dict):
    need(False, f"the harness ran ({rows.get('crash')})")
    rows = []


def strip(s):
    """the saved state with the 'at' timestamps taken out, keys in the page's own order"""
    o = json.loads(s)
    for d in o.get("days", {}).values():
        d.pop("at", None)
    return json.dumps(o, ensure_ascii=False)


need(len(rows) == len(cases), f"every case ran ({len(rows)} of {len(cases)})")
for c, r in zip(cases, rows):
    t = r["id"]
    if r.get("oldCrash") or r.get("newCrash"):
        need(False, f"{t}: both pages played through (old {r.get('oldCrash')}, new {r.get('newCrash')})"); continue
    need(strip(r["oldAfter"]) == strip(r["newAfter"]), f"{t}: saved state identical, old and new")
    if "resumeAt" in c:
        need(r["oldMid"] == r["newMid"] and json.loads(r["newMid"])["prog"].get(c["date"]) == c["picks"][:2], f"{t}: the half-way save is identical ({json.loads(r['newMid'])['prog']})")
        need(r["oldResumeLabel"] == "Resume quiz" and r["newResumeLabel"] == "Resume quiz", f"{t}: both pages offer Resume quiz ({r['oldResumeLabel']!r}, {r['newResumeLabel']!r})")
    need(r["oldMath"] == r["newMath"] and r["newMath"], f"{t}: the same points sum line ({r['newMath']!r})")
    need(r["newAfterPractice"] == r["newAfter"], f"{t}: practice on the new page changes nothing saved ({r['newPractice']})")
    need(r["oldAfterPractice"] == r["oldAfter"], f"{t}: practice on the old page changed nothing either ({r['oldPractice']!r})")
    S = json.loads(r["newAfter"])
    day = S["days"][c["date"]]
    n, right = len(c["items"]), sum(1 for i, it in enumerate(c["items"]) if c["picks"][i] == it["answer"])
    home = n - 1
    want = "full" if right == n else "last" if right >= home else "sight" if right == home - 1 and right > 0 else "stop" if right else "tow"
    need(day["score"] == right and day["total"] == n and r["newEnding"] == want and str(day["points"]) == r["newPoints"], f"{t}: {right} of {n} saved, ending {r['newEnding']} (want {want}), {day['points']} points shown")
    need(r["reopen"]["ending"] == want and f"+{day['points']} points" in r["reopen"]["text"] and r["newAfterReopen"] == r["newAfter"], f"{t}: reopened, it shows the {want} ending and saves nothing")
    need(r.get("cls") == "gcard quiz", f"{t}: the quiz section's class is still exactly gcard quiz (check.py needs it)")
    need(not r.get("oldErrs") and not r.get("newErrs"), f"{t}: no errors ({r.get('oldErrs')}, {r.get('newErrs')})")
# a spot check that the cases really differ: streak 9 all right earns the x2 day
spot = next((r for r in rows if r["id"] == "2026-11-12 all right streak 9"), None)
need(spot and spot["newMath"] == "5 right × 10 + 20 perfect, × 2 streak = +140 points", f"12 November, all right from a 9-day streak: +140 points ({spot and spot['newMath']!r})")
print("details in", out / "warp-parity.json")
print("WARP PARITY OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
