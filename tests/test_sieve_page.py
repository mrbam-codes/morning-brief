"""Sieve proof card and Move my progress page test at true phone width (plan 22).
Run from the repository: python3 tests/test_sieve_page.py OUT_DIR

Headless Chrome will not open a window narrower than 500px, so the page runs inside a 390px frame and
tests/sieve-audit.js reports from inside it, in real time (the drawing needs real frames). It stages the
site with every published edition from origin/briefs plus two test editions: one with the largest counts
check.py allows (8 rejected leads at full length, build and photo counts, no note) and one with no
rejected leads. Asserts, with motion and with reduced motion, for every edition:
- the closed card is under 170px tall, shows exactly the edition's counts, and has no clipped, overlapping
  or off-screen text; no sideways scroll; no console errors; the old panel and Move card are gone;
- an edition with no evidence block shows its sources only and no drawing;
- the drawing runs only on screen with the page visible, and is a painted still picture with reduced motion;
- the card is a button with aria-expanded and aria-controls; the closed timeline is inert; opening shows
  every figure (searches, kept, sources by tier, build and photo counts) and every rejected lead with its
  reason and the note, with no clipped or overlapping text and tap targets of at least 44px; Show less
  closes it and puts focus back on the card.
Move my progress: the My scores sheet shows Copy code and Paste code, Copy gives a code, Paste in the
sheet loads it and the sheet reopens with the new total; an empty browser shows the "Got a code?" prompt
under the headline, clear of the score badge, whose Paste it loads the code and whose Not now hides it;
a browser with saved progress never shows the prompt.
Screenshots of the closed and opened card, the prompt and the sheet are saved in OUT_DIR.
Prints SIEVE PAGE OK or the misses.
"""
import functools, html, http.server, json, pathlib, re, shutil, subprocess, sys, tempfile, threading, urllib.parse

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


# ---------- editions: every published one, plus two test editions ----------
dates = sorted((p[7:17] for p in git("ls-tree", "--name-only", "origin/briefs", "briefs/").split() if p[7:11].isdigit()))
work = pathlib.Path(tempfile.mkdtemp())
(work / "news.json").write_text(git("show", f"origin/briefs:briefs/{dates[-1]}.json"), encoding="utf-8")
BIG, NONE = "2026-11-20", "2026-11-21"
LONG_WHAT = ("Build: " + "A very long rejected lead title that keeps going " * 3)[:90]
LONG_WHY = ("A very long reason that explains in plain words why the lead was turned away at the gate " * 2)[:120]
fixtures = {
    BIG: {"searches": 300, "kept": 300, "build_searches": 300, "builds_kept": 12, "photo_searches": 25, "photos_kept": 3,
          "rejected": [{"what": LONG_WHAT[:-1] + str(i), "why": LONG_WHY[:-1] + str(i)} for i in range(8)]},
    NONE: {"searches": 1, "kept": 0, "rejected": [], "note": "A short test note with no rejected leads."},
}
files = []
for d, ev in fixtures.items():
    f = work / f"{d}.json"
    subprocess.run([sys.executable, str(here / "fixture.py"), str(work / "news.json"), d, str(f)], check=True, capture_output=True)
    b = json.loads(f.read_text(encoding="utf-8"))
    b["evidence"] = ev
    f.write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")
    files.append(str(f))
site = out / "site"
subprocess.run(["sh", str(here / "stage.sh"), str(site), *files], check=True, capture_output=True)
editions = {d: json.loads((site / "briefs" / f"{d}.json").read_text(encoding="utf-8")) for d in dates + list(fixtures)}
register = json.loads((ROOT / "sources.json").read_text(encoding="utf-8"))


def sources(b):
    """evidence.js's sources(): every {url} under a source or sources key, once each, skipping evidence."""
    seen, got = set(), []

    def walk(o, k):
        if isinstance(o, list):
            for v in o:
                walk(v, k)
        elif isinstance(o, dict):
            if k in ("source", "sources") and isinstance(o.get("url"), str):
                if o["url"] not in seen:
                    seen.add(o["url"]); got.append(o)
                return
            for j, v in o.items():
                if j != "evidence":
                    walk(v, j)
    walk(b, None)
    return got


def tier(u):
    m = re.match(r"^https?://([^/:?#]+)", u or "", re.I)
    h = m.group(1).lower() if m else ""
    h = h[4:] if h.startswith("www.") else h
    best, ln = "unlisted", -1
    for t in ("original", "secondary", "lead"):
        for d in register["tiers"].get(t, []):
            if (h == d or h.endswith("." + d)) and len(d) > ln:
                best, ln = t, len(d)
    return best


def pl(n, one, many):
    return one if n == 1 else many


def expect(b):
    ev = b.get("evidence") if isinstance(b.get("evidence"), dict) else None
    src = sources(b)
    tiles, words = [], []
    if ev:
        if isinstance(ev.get("searches"), int):
            tiles.append([str(ev["searches"]), pl(ev["searches"], "search", "searches")])
        rj = ev.get("rejected") or []
        tiles.append([str(len(rj)), "rejected"])
        if isinstance(ev.get("kept"), int):
            tiles.append([str(ev["kept"]), "kept"])
        words += [r["what"] for r in rj] + [r["why"] for r in rj if r.get("why")]
        if ev.get("note"):
            words.append(ev["note"].strip())
        for k in ("build_searches", "builds_kept", "photo_searches", "photos_kept"):
            if isinstance(ev.get(k), int):
                words.append(str(ev[k]))
        if isinstance(ev.get("builds_kept"), int):
            words.append(f"{ev['builds_kept']} {pl(ev['builds_kept'], 'build', 'builds')} kept")
        if isinstance(ev.get("photos_kept"), int):
            words.append(f"{ev['photos_kept']} {pl(ev['photos_kept'], 'photo', 'photos')} kept")
        if isinstance(ev.get("build_searches"), int) and isinstance(ev.get("builds_kept"), int):
            words.append(f"Found in {ev['build_searches']} build searches.")
        if isinstance(ev.get("photo_searches"), int) and isinstance(ev.get("photos_kept"), int):
            words.append(f"Found in {ev['photo_searches']} photo searches.")
    tiles.append([str(len(src)), pl(len(src), "source", "sources")])
    n = {t: 0 for t in ("original", "secondary", "lead", "unlisted")}
    for s in src:
        n[tier(s["url"])] += 1
    parts = [f"{n[k]} {w}" for k, w in (("original", "original reporting"), ("secondary", "good secondary"), ("lead", "lead only"), ("unlisted", "not yet rated")) if n[k]]
    if src:
        words.append(", ".join(parts) + ".")
    words += [s["name"] for s in src if s.get("name")]
    return ev, tiles, words


# ---------- the test copy and the 390px frame (real time; the frame holds its load event until the audit is done) ----------
idx = (site / "index.html").read_text(encoding="utf-8")
assert idx.count('<script src="motion.js"></script>') == 1 and idx.count("</body>") == 1
test = idx.replace('<script src="motion.js"></script>', '<script src="sieve-errs.js"></script>\n<script src="motion.js"></script>', 1)
(site / "sieve-test.html").write_text(test.replace("</body>", '<script src="sieve-audit.js"></script></body>', 1), encoding="utf-8")
shutil.copy(here / "sieve-audit.js", site / "sieve-audit.js")
# in-page errors from the start: script errors, rejected promises, policy refusals and console.error
(site / "sieve-errs.js").write_text(
    "window.__svErrs=[];addEventListener('error',e=>{if(e instanceof ErrorEvent)__svErrs.push('error: '+e.message)},true);"
    "addEventListener('unhandledrejection',e=>__svErrs.push('rejection: '+(e.reason&&e.reason.message||e.reason)));"
    "document.addEventListener('securitypolicyviolation',e=>__svErrs.push('policy: '+e.violatedDirective+' '+e.blockedURI));"
    "(()=>{const ce=console.error;console.error=function(...a){__svErrs.push('console: '+a.map(String).join(' ').slice(0,200));return ce.apply(console,a)}})();")
(site / "sieve-frame.js").write_text(
    "addEventListener('message',e=>{if(e.data&&e.data.audit){const p=document.createElement('pre');p.id='audit';p.textContent=e.data.audit;document.body.append(p)}});"
    "const q=location.search.slice(1),i=q.indexOf('&'),seed=q.slice(0,i)==='seed=1',page=decodeURIComponent(q.slice(i+1));"
    "if(seed){const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),days={};"
    "[[1,4,5],[2,5,5],[3,3,5]].forEach(([n,s,t])=>{const d=new Date();d.setDate(d.getDate()-n);days[ds(d)]={score:s,total:t,points:0,at:Date.now()}});"
    "localStorage.setItem('mb-v1',JSON.stringify({days,tags:{AI:[5,6],Tech:[4,5],Cyber:[3,4]},lessons:{},points:0,badges:{},review:[],prog:{},sound:false,name:'tester'}))}"
    "try{localStorage.setItem('mb-tour-v1','1')}catch(e){}"
    "const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;f.src=page;document.body.style.margin=0;document.body.append(f);")
(site / "sieve-frame.html").write_text('<!doctype html><meta charset="utf-8"><body><script src="sieve-frame.js"></script><img src="hold" alt=""></body>')
HOLD = threading.Event()
GIF = bytes.fromhex("47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b")


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        route = self.path.split("?")[0]
        if route in ("/hold", "/done"):
            if route == "/hold":
                HOLD.wait(90)
            else:
                HOLD.set()
            self.send_response(200); self.send_header("Content-Type", "image/gif"); self.send_header("Content-Length", str(len(GIF))); self.end_headers(); self.wfile.write(GIF)
            return
        super().do_GET()


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"
ERR = re.compile(r"Uncaught|Refused|Failed to load|Error|error|violat")
consoles = []


def run(page, phase, seed, reduced=False, shot=None):
    prof = tempfile.mkdtemp()
    HOLD.clear()
    args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=390,844", "--hide-scrollbars",
            "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", "--enable-logging=stderr", "--v=0"]
    if reduced:
        args.append("--force-prefers-reduced-motion")
    url = f"{base}/sieve-frame.html?seed={1 if seed else 0}&" + urllib.parse.quote(f"sieve-test.html?{page}#{phase}", safe="")
    p = subprocess.run(args + ([f"--screenshot={shot}"] if shot else ["--dump-dom"]) + [url], capture_output=True, text=True, timeout=180)
    for l in p.stderr.splitlines():
        if "CONSOLE" in l:
            msg = l.split("] ", 1)[-1][:300]
            # the staged site has no news photos (the publisher fetches them), so their 404s are expected
            if "briefs/img/" in msg or "willReadFrequently" in msg:
                continue
            consoles.append((page + " " + phase[:10], msg))
    if shot:
        return None
    m = re.search(r'<pre id="audit">(.*?)</pre>', p.stdout, re.S)
    return json.loads(html.unescape(m.group(1))) if m else {"crash": "audit did not report"}


results = {}
try:
    for mode, red in (("motion", False), ("reduced", True)):
        for d, b in editions.items():
            R = results[f"{mode} {d}"] = run(f"d={d}", "sieve", True, red)
            tag = f"{mode} {d}"
            if "crash" in R or not R.get("found"):
                need(False, f"{tag}: audit crashed or no card: {R.get('crash')}"); continue
            ev, tiles, words = expect(b)
            need(R["closed"]["h"] < 170, f"{tag}: closed card is {R['closed']['h']}px tall (under 170)")
            need(R["tiles"] == tiles, f"{tag}: closed card shows exactly {tiles} ({R['tiles']})")
            need(not R["closed"]["issues"], f"{tag}: closed card text is not clipped, overlapping or off screen ({R['closed']['issues']})")
            need(R["scrollWidth"] <= R["width"] and not R["wide"], f"{tag}: no sideways scroll at {R['width']}px ({R['scrollWidth']}, {R['wide']})")
            need(not R["errs"], f"{tag}: no errors in the page ({R['errs']})")
            need(R["beforeQuiz"] and R["oldPanel"] == 0 and R["oldMove"] == 0, f"{tag}: card sits above the quiz; the old panel and Move card are gone")
            need(R["isButton"] and R["controls"] and R["closed"]["expanded"] == "false" and R["closed"]["inert"], f"{tag}: a button with aria-controls, closed and inert to start")
            need(R["open"]["expanded"] == "true" and not R["open"]["inert"] and "Hide" in R["open"]["label"], f"{tag}: opening sets aria-expanded and the label says Hide")
            need(R["after"]["expanded"] == "false" and R["after"]["inert"] and R["after"]["focusBack"], f"{tag}: Show less closes it and puts focus back on the card")
            text = R["open"]["text"]
            missing = [w for w in words if w not in text]
            need(not missing, f"{tag}: opened card holds every figure, lead, reason and source ({len(words)} checked; missing {missing[:4]})")
            need(not R["open"]["issues"], f"{tag}: opened card text is not clipped, overlapping or off screen ({R['open']['issues']})")
            need(not R["open"]["small"], f"{tag}: every button in the card is at least 44px ({R['open']['small']})")
            need("what the tiers mean" in text.lower() and "not yet rated" in text.lower() and "from 11 November 2026" in text, f"{tag}: opened card explains the tiers")
            if ev:
                need(R["canvas"] and R["painted"] > 0 and R["old"] is None, f"{tag}: the sieve drawing is there and painted ({R.get('painted')} pixels)")
                if red:
                    need(R["onScreen"] == R["offScreen"] == R["backOn"] == "still" and not R["liveClass"] and not R["endless"], f"{tag}: reduced motion: a still picture, nothing endless ({R['onScreen']}, {R['endless']})")
                else:
                    need(R["onScreen"] == "running" and R["offScreen"] == "still" and R["backOn"] == "running", f"{tag}: runs on screen, pauses off screen ({R['onScreen']}, {R['offScreen']}, {R['backOn']})")
                    need(R["pageHidden"] == "still" and R["pageShown"] == "running", f"{tag}: pauses while the page is hidden ({R['pageHidden']}, {R['pageShown']})")
            else:
                need(not R["canvas"] and R["old"] and "sources only" in R["old"], f"{tag}: no evidence block: sources only, no drawing ({R['old']!r})")
            if d == "2026-11-12":
                need(R["tiles"] == [["30", "searches"], ["8", "rejected"], ["6", "kept"], ["7", "sources"]], f"{tag}: 12 November reads 30 searches, 8 rejected, 6 kept, 7 sources")
                need("3 original reporting, 1 good secondary, 1 lead only, 2 not yet rated." in text, f"{tag}: 12 November tiers read 3, 1, 1 and 2")
            if d == BIG:
                need(R["tiles"][0][0] == R["tiles"][2][0] == "300", f"{tag}: 3-digit counts fit the closed card")
    # Move my progress
    C = results["copy"] = run("", "copy", True)
    need(not C.get("prompt"), "a browser with saved progress shows no Paste prompt")
    need(C.get("move") and C.get("buttons") == ["Copy code", "Paste code"], f"the My scores sheet shows Copy code and Paste code ({C.get('buttons')})")
    need(re.fullmatch(r"MB\.1[zj]\.[A-Za-z0-9_-]+\.[0-9a-z]{7}", C.get("code") or "") is not None and C.get("boxShown") and "It holds" in (C.get("status") or ""), f"Copy code gives a code and says what it holds ({C.get('status')!r})")
    need(not C.get("issues") and not C.get("issuesAfter") and not C.get("small") and C.get("scrollWidth", 999) <= 390, f"the sheet's Move block fits at 390px with 44px buttons ({C.get('issues')}, {C.get('issuesAfter')}, {C.get('small')})")
    need(not C.get("errs"), f"no errors in the sheet ({C.get('errs')})")
    CR = results["copy reduced"] = run("", "copy", True, True)
    need(CR.get("buttons") == ["Copy code", "Paste code"] and (CR.get("code") or "").startswith("MB.") and not CR.get("errs"), "with reduced motion the sheet's Copy code works too")
    code = C.get("code") or "MB.none"
    F = results["fresh"] = run("", "fresh=" + code, False)
    need(F.get("prompt") and F.get("storedDays") == 0, "an empty browser shows the Paste prompt")
    need(F.get("afterHero") and F.get("beforeToday"), "the prompt sits under the headline, above the Today deck")
    need(F.get("buttons") == ["Paste it", "Not now"] and "Got a progress code? Paste it" in (F.get("text") or ""), f"the prompt reads as mocked ({F.get('buttons')})")
    need(F.get("clearAtTop") and F.get("clearScrolledTo") and F.get("clearWhileTyping"), f"the score badge never covers the prompt ({F.get('box')}, {F.get('boxScrolled')}, badge {F.get('badge')})")
    need(not F.get("issues") and not F.get("issuesPaste") and not F.get("issuesAsk") and not F.get("small") and not F.get("smallPaste"), f"prompt text fits, buttons 44px ({F.get('issues')}, {F.get('issuesPaste')}, {F.get('issuesAsk')}, {F.get('small')}, {F.get('smallPaste')})")
    need(F.get("pasteShown") and F.get("focused") and F.get("bad", {}).get("status") and not F.get("bad", {}).get("asked") and F.get("unchangedAfterBad"), "Paste it opens the box; a bad code is refused and changes nothing")
    need(F.get("asked") and "loads the progress in the code" in (F.get("ask") or ""), f"a good code asks first ({F.get('ask')!r})")
    need((F.get("after") or {}).get("days") == 3 and (F.get("after") or {}).get("points", 0) > 0 and (F.get("status") or "").startswith("Done.") and F.get("rowHidden"), f"Yes loads it and the prompt says Done ({F.get('after')}, {F.get('status')!r})")
    need(F.get("sheetButtons") == ["Copy code", "Paste code"] and not F.get("errs"), f"the sheet shows both buttons afterwards; no errors ({F.get('errs')})")
    L = results["later"] = run("", "later", False)
    need(L.get("prompt") and L.get("hasNotNow") and L.get("goneAfter") and not L.get("errs"), "Not now hides the prompt")
    P = results["sheetpaste"] = run("", "sheetpaste=" + code, False)
    need(P.get("pasteShown") and P.get("asked") and P.get("reopened") and (P.get("status") or "").startswith("Done.") and P.get("days") == 3, f"Paste code in the sheet loads the code and the sheet reopens ({P.get('status')!r})")
    need(P.get("total") == f"{P.get('points', -1):,}" and not P.get("errs"), f"the reopened sheet shows the loaded total ({P.get('total')} vs {P.get('points')})")
    for name, page, phase, seed in (("closed", "d=2026-11-12", "shot=closed", True), ("open", "d=2026-11-12", "shot=open", True),
                                    ("prompt", "", "shot=prompt", False), ("sheet", "", "shot=sheet", True)):
        run(page, phase, seed, shot=str(out / f"sieve-390-{name}.png"))
finally:
    srv.shutdown()
    for f in ("sieve-test.html", "sieve-audit.js", "sieve-errs.js", "sieve-frame.html", "sieve-frame.js"):
        (site / f).unlink(missing_ok=True)
(out / "sieve-audit.json").write_text(json.dumps(results, indent=1, ensure_ascii=False))
errors = [c for c in consoles if ERR.search(c[1])]
need(not errors, f"no console errors in any run ({errors[:4]})")
print("screenshots and audit in", out)
print("SIEVE PAGE OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
