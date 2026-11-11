"""Just launched test (plan 15, Part E). Run from the repository: python3 tests/test_launched.py [OUT_DIR]

Makes test editions with tests/fixture.py (news from the newest brief on origin/briefs), the way
tests/test_builds_page.py does, adds a `launched` list to some of them (and builds to two), stages a throwaway
site with tests/stage.sh, then runs tests/launched-audit.js in headless Chrome. The audit drives each edition in
a 390 by 844 frame (headless Chrome will not open a window narrower than 500 pixels), normally and with reduced
motion, with every address except this computer blocked. Asserts:
- an empty `launched` list, and no field at all, draw no section and no empty heading;
- 1 and 3 launches draw that many rows, in order: tag chip, company in bold, what launched, the label
  "Company's own claim", then the source name; the heading and the one-line note are exact;
- a link is drawn only for an https:// address, opens in a new tab with rel="noopener noreferrer"; any other
  address shows the name as plain text; text holding <script> shows as text;
- a 90-character `what` and a 40-character company at 390 pixels: no sideways scroll, nothing clipped;
- the strip sits straight after the Today deck and before Built in the wild; the quiz block is still last;
- the tour neither rings nor counts the strip (7 stops with builds, 6 without); nothing fetched from outside;
  no console errors.
Then runs tests/test_page.py on the 3-launch edition, so the whole-page audit (contrast, decks) covers the strip.
Prints LAUNCHED OK or the misses. Never publish a fixture.
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


def launch(company, what, name, url, tag="AI"):
    return {"company": company, "what": what, "claim": True, "source": {"name": name, "url": url}, "tag": tag}


def build(label):
    return {"what": f"Test build: {label} (test)", "who": "@sample_builder", "label": label, "steps": ["First test step.", "Second test step."],
            "tools": ["Claude Code"], "proof": "Shown working", "proof_note": "Test proof note.", "level": "An evening", "level_note": "Test.",
            "first_step": "A test first step.", "links": {"post": "https://example.org/post"}}


LONG_CO = "Northwind Sample Robotics Test Company 1"                       # 40 characters
LONG_WHAT = "A sample agent toolkit for testing that runs long tasks on a laptop and reports back(test)"  # 90 characters
assert len(LONG_CO) == 40 and len(LONG_WHAT) == 90
ONE = [launch("Sample Labs (test)", "A test model that answers questions about spreadsheets", "Sample Labs blog: test model", "https://example.org/launch-1")]
THREE = [
    launch(LONG_CO, LONG_WHAT, "Northwind newsroom: test toolkit", "https://example.org/launch-2", "Tech"),
    launch("<script>alert(1)</script>", "Text with <script>alert(2)</script> inside (test)", "<b>Bold</b> blog (test)", "http://example.org/plain", "Cyber"),
    launch("Third Sample Co (test)", "A test release with no https link", "Third Sample newsroom", "javascript:alert(3)", "AI"),
]
# date: (launched, builds); None means the field is left out
CASES = {"2026-11-14": ([], None), "2026-11-15": (None, None), "2026-11-16": (ONE, [build("ONE")]), "2026-11-17": (THREE, [build("TWO"), build("THREE")])}

dates = sorted((p[7:17] for p in git("ls-tree", "--name-only", "origin/briefs", "briefs/").split() if p[7:11].isdigit()), reverse=True)
work = pathlib.Path(tempfile.mkdtemp())
(work / "news.json").write_text(git("show", f"origin/briefs:briefs/{dates[0]}.json"), encoding="utf-8")
files = []
for d, (ln, bl) in CASES.items():
    f = work / f"{d}.json"
    subprocess.run([sys.executable, str(here / "fixture.py"), str(work / "news.json"), d, str(f)], check=True, capture_output=True)
    b = json.loads(f.read_text(encoding="utf-8"))
    b.pop("launched", None); b.pop("builds", None)
    if ln is not None:
        b["launched"] = ln
    if bl:
        b["builds"] = bl
    f.write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")
    files.append(str(f))
site = out / "site"
subprocess.run(["sh", str(here / "stage.sh"), str(site), *files], check=True, capture_output=True)
idx = (site / "index.html").read_text(encoding="utf-8")
(site / "launched-test.html").write_text(idx.replace('<script src="motion.js"></script>', '<script src="launched-pre.js"></script>\n<script src="motion.js"></script>', 1), encoding="utf-8")
(site / "launched-pre.js").write_text("window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));"
                                      "const ce=console.error;console.error=function(){__errs.push([].map.call(arguments,String).join(' '));return ce.apply(console,arguments)};")
shutil.copy(here / "launched-audit.js", site / "launched-audit.js")
(site / "launched-frame.html").write_text('<!doctype html><meta charset="utf-8"><body><script src="launched-audit.js"></script><img src="hold" alt=""></body>')
HOLD = threading.Event()
GIF = bytes.fromhex("47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b")


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        route = self.path.split("?")[0]
        if route in ("/hold", "/done"):
            HOLD.wait(120) if route == "/hold" else HOLD.set()
            self.send_response(200); self.send_header("Content-Type", "image/gif"); self.send_header("Content-Length", str(len(GIF))); self.end_headers(); self.wfile.write(GIF)
            return
        super().do_GET()


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"


def audit(extra):
    HOLD.clear()
    args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={tempfile.mkdtemp()}", "--window-size=500,900", "--hide-scrollbars",
            "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", *extra, "--dump-dom", f"{base}/launched-frame.html?dates={','.join(CASES)}"]
    dom = subprocess.run(args, capture_output=True, text=True, timeout=240).stdout
    m = re.search(r'<pre id="audit">(.*?)</pre>', dom, re.S)
    return json.loads(html.unescape(m.group(1))) if m else {"crash": "audit did not report"}


NOTE = "Fresh from the companies themselves. Not checked independently."
CLAIM = "Company's own claim"
try:
    for mode, extra in (("motion", []), ("reduced", ["--force-prefers-reduced-motion"])):
        R = audit(extra)
        (out / f"launched-{mode}.json").write_text(json.dumps(R, indent=1, ensure_ascii=False))
        if "crash" in R:
            need(False, f"{mode}: audit crashed: {R['crash']}"); continue
        need(R["reduce"] == (mode == "reduced"), f"{mode}: reduced motion is {'on' if mode == 'reduced' else 'off'}")
        for E in R["editions"]:
            d, (ln, bl) = E["date"], CASES[E["date"]]
            tag = f"{mode} {d}"
            need(E["scrollW"] <= 390, f"{tag}: no sideways scroll at 390px ({E['scrollW']})")
            need(not E["outside"], f"{tag}: nothing fetched from outside ({E['outside']})")
            need(E.get("afterQuiz") in ([], ["gcard"]) and E.get("afterQuizMain") == ["footer"], f"{tag}: the quiz block is still last ({E.get('afterQuiz')}, {E.get('afterQuizMain')})")
            need(not E["errors"], f"{tag}: no console errors ({E['errors'][:3]})")
            if not ln:
                need(not E["section"] and E["jlNodes"] == 0, f"{tag}: {'an empty launched list' if ln == [] else 'no launched field'} draws no section and no heading")
                continue
            need(E["section"] and len(E["rows"]) == len(ln), f"{tag}: {len(ln)} launches draw {len(E.get('rows') or [])} rows")
            need(E["heading"] == "Just launched" and E["note"] == NOTE, f"{tag}: heading and note read exactly ({E['heading']!r}, {E['note']!r})")
            o = E["order"]
            need(o["afterToday"] and o["nextToToday"] and o["beforeBuilds"] is True and o["beforeQuiz"], f"{tag}: straight after the Today deck, before Built in the wild and the quiz ({o})")
            need(E["tourHook"] is None and E["tourCount"] == "1 of 7", f"{tag}: the tour neither rings nor counts the strip (hook {E['tourHook']}, {E['tourCount']})")
            need(E["scripts"] == 0, f"{tag}: no script, image or frame inside the strip")
            need(not E["clipped"], f"{tag}: nothing in the strip is clipped or sticks out ({E['clipped']})")
            for i, (row, want) in enumerate(zip(E["rows"], ln)):
                g = f"{tag} row {i + 1}"
                need(row["company"] == want["company"] and row["companyBold"] and row["what"] == want["what"] and row["tag"] == want["tag"], f"{g}: tag, company in bold and what, as text and in order ({row['company']!r})")
                need(row["claim"] == CLAIM, f"{g}: the label reads exactly {CLAIM!r} ({row['claim']!r})")
                need(row["order"] == ["pill", "jl-co", "jl-what", "jl-claim", "jl-src"], f"{g}: chip, company, what, claim label, source, in that order ({row['order']})")
                https = want["source"]["url"].startswith("https://")
                if https:
                    need(row["href"] == want["source"]["url"] and row["target"] == "_blank" and row["rel"] == "noopener noreferrer" and row["src"] == want["source"]["name"] + " ↗",
                         f"{g}: the source is a link that opens in a new tab with noopener noreferrer ({row['href']}, {row['rel']})")
                    need(row["linkH"] >= 44, f"{g}: the link is at least 44px tall ({row['linkH']})")
                else:
                    need(row["href"] is None and row["src"] == want["source"]["name"], f"{g}: an address that is not https:// shows the name as plain text ({want['source']['url']}, {row['href']})")
            if ln is THREE:
                need("<script>alert(1)</script>" in E["text"] and "<b>Bold</b> blog (test)" in E["text"], f"{tag}: text holding <script> or <b> shows as text")
finally:
    srv.shutdown()
    for f in ("launched-test.html", "launched-pre.js", "launched-audit.js", "launched-frame.html"):
        (site / f).unlink(missing_ok=True)

# the whole-page audit on the 3-launch edition (contrast, decks, lessons, Done)
pg = subprocess.run([sys.executable, str(here / "test_page.py"), str(site), "2026-11-17", str(out)], capture_output=True, text=True, timeout=900)
print("\n".join("      " + l for l in pg.stdout.strip().splitlines()[-4:]))
need(pg.returncode == 0, "tests/test_page.py passes on the 3-launch edition")
print("staged site kept at", site)
print("LAUNCHED OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
