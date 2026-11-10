"""Page test at phone width. Run: python3 tests/test_page.py SITE_DIR DATE [OUT_DIR]
SITE_DIR is a built copy of the site with briefs. Loads the page in headless Chrome at 390px,
normally and with reduced motion, runs tests/audit.js inside it, saves screenshots, and asserts:
no sideways scroll, Radar card present, every lesson card rendered, 4.5:1 text contrast,
no endless animation under reduced motion, a lesson sheet with its diagram, and Done filing a card.
"""
import functools, http.server, json, pathlib, re, shutil, subprocess, sys, tempfile, threading, html

site, date = pathlib.Path(sys.argv[1]), sys.argv[2]
out_dir = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else pathlib.Path(tempfile.mkdtemp())
here = pathlib.Path(__file__).resolve().parent
chrome = shutil.which("google-chrome") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
idx = (site / "index.html").read_text(encoding="utf-8")
(site / "audit-test.html").write_text(idx.replace("</body>", '<script src="audit.js"></script></body>'), encoding="utf-8")
# Headless Chrome will not open a window narrower than 500px, so the page runs inside a 390px frame.
(site / "frame-test.js").write_text("addEventListener('message',e=>{if(e.data&&e.data.audit){const p=document.createElement('pre');p.id='audit';p.textContent=e.data.audit;document.body.append(p)}});"
    "const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;f.src=decodeURIComponent(location.search.slice(1));document.body.style.margin=0;document.body.append(f);"
    "if(location.hash)setTimeout(()=>{const t=f.contentDocument.getElementById(location.hash.slice(1));if(t)f.contentWindow.scrollTo(0,t.offsetTop-10)},2500);")
(site / "frame-test.html").write_text('<!doctype html><meta charset="utf-8"><body><script src="frame-test.js"></script></body>')
shutil.copy(here / "audit.js", site / "audit.js")
course = json.loads((site / "course.json").read_text())
want_lessons = len(next(d for d in course["days"] if d["date"] == date)["lessons"]) if date >= "2026-11-11" else 1


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"
fails, results = [], {}
try:
    for mode, extra in (("motion", []), ("reduced", ["--force-prefers-reduced-motion"])):
        prof = tempfile.mkdtemp()
        args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=390,844", "--hide-scrollbars", *extra]
        dom = subprocess.run(args + ["--virtual-time-budget=15000", "--dump-dom", f"{base}/frame-test.html?audit-test.html%3Fd%3D{date}"], capture_output=True, text=True, timeout=120).stdout
        m = re.search(r'<pre id="audit">(.*?)</pre>', dom, re.S)
        if not m:
            fails.append(f"{mode}: audit did not report"); continue
        R = json.loads(html.unescape(m.group(1)))
        results[mode] = R
        if "crash" in R:
            fails.append(f"{mode}: audit crashed: {R['crash']}"); continue
        for part in ("", "deck-news", "deck-learn"):
            subprocess.run(args + ["--virtual-time-budget=5000", f"--screenshot={out_dir}/{date}-{mode}-390{'-' + part if part else ''}.png", f"{base}/frame-test.html?index.html%3Fd%3D{date}{'#' + part if part else ''}"], capture_output=True, timeout=120)
        need = lambda c, msg: c or fails.append(f"{mode}: {msg}")
        need(R["width"] == 390, f"viewport is {R['width']}px, not 390")
        need(not R["overflowX"], f"page scrolls sideways ({R['scrollWidth']}px)")
        need(not R["wide"], f"elements stick out past 390px: {R['wide']}")
        need(R["radar"] == 1 and R["blips"] == R["newsCards"] + 1, f"Radar card {R['radar']}, blips {R['blips']} for {R['newsCards']} stories plus Learn")
        need(R["lessonCards"] == want_lessons, f"{R['lessonCards']} lesson cards, expected {want_lessons}")
        need(R["learnBlip"], "no Learn blip on the Radar")
        need(R.get("decks") and not [d for d in R["decks"] if d["bad"]], f"cards in a deck are not the same size: {[(d['id'], d['bad']) for d in R.get('decks') or [] if d['bad']]}")
        need(not R["errorShown"], "page showed its error message")
        need(not R["contrastPage"]["bad"], f"text below contrast: {R['contrastPage']['bad']}")
        need(R.get("contrastSheet") and not R["contrastSheet"]["bad"], f"lesson sheet text below contrast: {(R.get('contrastSheet') or {}).get('bad')}")
        need(R.get("diagramLoaded"), "lesson diagram did not load in the sheet")
        ad = R.get("afterDone") or {}
        need(ad.get("cardHidden") and len(ad.get("chips", [])) == 1 and ad.get("sheetsOpen") == 0, f"Done did not file the card to the rail: {ad}")
        need((R.get("afterPutBack") or {}).get("cardHidden") is False, "tapping the rail chip did not put the card back")
        if mode == "reduced":
            need(R["reduce"], "reduced motion was not applied")
            need(not R["running"], f"endless animations still running with reduced motion: {R['running']}")
finally:
    srv.shutdown()
    for f in ("audit-test.html", "audit.js", "frame-test.html", "frame-test.js"):
        (site / f).unlink(missing_ok=True)
(out_dir / f"{date}-audit.json").write_text(json.dumps(results, indent=1, ensure_ascii=False))
for mode, R in results.items():
    if "crash" not in R:
        print(f"{mode}: {R['contrastPage']['checked']} text elements checked for contrast, {len(R['contrastPage']['bad'])} below; news cards {R['newsCards']}, learn cards {R['learnCards']}, lesson cards {R['lessonCards']}, counters {R['counters']}")
print("screenshots and audit in", out_dir)
if fails:
    print("PAGE FAILED"); print("\n".join("- " + f for f in fails)); sys.exit(1)
print(f"PAGE OK: {date} at 390px, motion and reduced motion")
