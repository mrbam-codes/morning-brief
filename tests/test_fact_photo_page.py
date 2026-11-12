"""Fun fact photo page test (plan 21). Run from the repository: python3 tests/test_fact_photo_page.py [OUT_DIR]

Makes test editions with tests/fixture.py, gives them photos in the form the publisher writes
(src, page, credit, licence, alt), stages a throwaway site with tests/stage.sh, and loads each in
headless Chrome inside a true 390px frame (headless Chrome will not open a window under 500px),
with every address except this computer blocked. tests/fact-photo-audit.js reports from inside.
Asserts:
- the fun fact card shows its photo (briefs/img/DATE-1.jpg: the poster's photo is 0), inside the
  card at 390px, with the credit as its tooltip; the opened fact shows the photo and the credit line
  "Photo: credit, licence" linking to the Commons page in a new tab;
- a story with a photo and a drawing shows both when opened, the photo first;
- a short-form fact photo the publisher has not resolved (no src) shows nothing and fetches nothing;
- a fact photo whose file is missing is removed, card and opened fact, with no error;
- no sideways page scroll and nothing fetched from outside.
Prints FACT PHOTO OK or the misses. Never publish a fixture.
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


PAGE = "https://commons.wikimedia.org/wiki/File:Test_fact.jpg"
FACT = {"page": PAGE, "alt": "Test: the machine the fact is about.", "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Test_fact.jpg/960px-Test_fact.jpg",
        "credit": "Test Author, Wikimedia Commons", "licence": "CC BY-SA 4.0"}
STORY = {"page": "https://commons.wikimedia.org/wiki/File:Test_story.jpg", "alt": "Test: a building.", "credit": "Story Author, Wikimedia Commons",
         "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Test_story.jpg/960px-Test_story.jpg", "licence": "CC BY 4.0"}
DRAW = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 140"><rect x="10" y="20" width="90" height="60" fill="none" stroke="#111"/>'
        '<text x="20" y="110" font-size="13">before</text><text x="130" y="110" font-size="13">then</text><text x="230" y="110" font-size="13">after</text></svg>')
CASES = {"2026-11-12": "resolved", "2026-11-13": "short", "2026-11-14": "missing"}

dates = sorted((p[7:17] for p in git("ls-tree", "--name-only", "origin/briefs", "briefs/").split() if p[7:11].isdigit()), reverse=True)
work = pathlib.Path(tempfile.mkdtemp())
(work / "news.json").write_text(git("show", f"origin/briefs:briefs/{dates[0]}.json"), encoding="utf-8")
files = []
for d, kind in CASES.items():
    f = work / f"{d}.json"
    subprocess.run([sys.executable, str(here / "fixture.py"), str(work / "news.json"), d, str(f)], check=True, capture_output=True)
    b = json.loads(f.read_text(encoding="utf-8"))
    b["posters"][0].update(photo=dict(STORY), drawing=DRAW, drawingAlt="Test drawing: before, then, after.")
    b["fact"]["photo"] = {"page": PAGE, "alt": FACT["alt"]} if kind == "short" else dict(FACT)
    f.write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")
    files.append(str(f))
site = out / "site"
subprocess.run(["sh", str(here / "stage.sh"), str(site), *files], check=True, capture_output=True)
img = site / "briefs" / "img"
img.mkdir(parents=True, exist_ok=True)
for name in ("2026-11-12-0.jpg", "2026-11-12-1.jpg", "2026-11-13-0.jpg", "2026-11-14-0.jpg"):   # 2026-11-14-1.jpg is missing on purpose
    subprocess.run(["sips", "-s", "format", "jpeg", "-z", "300", "960", str(ROOT / "icons" / "icon-192.png"), "--out", str(img / name)], capture_output=True)
need(all((img / n).exists() for n in ("2026-11-12-0.jpg", "2026-11-12-1.jpg")), "test photos made (needs sips, which every Mac has)")

idx = (site / "index.html").read_text(encoding="utf-8")
(site / "fact-test.html").write_text(idx.replace("</body>", '<script src="fact-photo-audit.js"></script></body>'), encoding="utf-8")
(site / "frame-test.js").write_text("addEventListener('message',e=>{if(e.data&&e.data.audit){const p=document.createElement('pre');p.id='audit';p.textContent=e.data.audit;document.body.append(p)}});"
    "const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;f.src=decodeURIComponent(location.search.slice(1));document.body.style.margin=0;document.body.append(f);")
(site / "frame-test.html").write_text('<!doctype html><meta charset="utf-8"><body><script src="frame-test.js"></script></body>')
shutil.copy(here / "fact-photo-audit.js", site / "fact-photo-audit.js")


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"


def audit(date):
    prof = tempfile.mkdtemp()
    args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=390,844", "--hide-scrollbars",
            "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", "--virtual-time-budget=30000", "--dump-dom",
            f"{base}/frame-test.html?fact-test.html%3Fd%3D{date}"]
    dom = subprocess.run(args, capture_output=True, text=True, timeout=180).stdout
    m = re.search(r'<pre id="audit">(.*?)</pre>', dom, re.S)
    return json.loads(html.unescape(m.group(1))) if m else {"crash": "audit did not report"}


try:
    for date, kind in CASES.items():
        R = audit(date)
        (out / f"{date}-fact-photo.json").write_text(json.dumps(R, indent=1, ensure_ascii=False))
        t = f"{date} ({kind})"
        if "crash" in R:
            need(False, f"{t}: audit crashed: {R['crash']}")
            continue
        need(R["width"] == 390, f"{t}: the page ran at a true 390px ({R['width']})")
        need(not R["overflowX"] and not R["errorShown"], f"{t}: no sideways page scroll and no error ({R['scrollWidth']})")
        need(not R["outside"], f"{t}: nothing fetched from outside ({R['outside']})")
        need(R["factCard"], f"{t}: the fun fact card is there")
        need(R.get("storyHero") and R["storyHero"]["loaded"] and R.get("storyDrawing") and R["storyDrawing"]["loaded"] and R["storyDrawing"]["afterHero"],
             f"{t}: an opened story with a photo and a drawing shows both, photo first ({R.get('storyHero')}, {R.get('storyDrawing')})")
        need(R.get("storyCardPhoto") and R["storyCardPhoto"]["src"] == f"briefs/img/{date}-0.jpg", f"{t}: the story card shows its photo ({R.get('storyCardPhoto')})")
        if kind == "resolved":
            p, c = R.get("cardPhoto") or {}, R.get("card") or {}
            need(p.get("src") == f"briefs/img/{date}-1.jpg" and p.get("loaded"), f"{t}: the fact card shows photo 1 ({p})")
            need(p and p["box"]["width"] <= c["width"] + 1 and c["width"] <= 390 and p["box"]["left"] >= c["left"] - 1 and p["box"]["right"] <= c["right"] + 1,
                 f"{t}: the fact photo sits inside its card at 390px (photo {p.get('box')}, card {c})")
            need(p.get("title") == "Photo: Test Author, Wikimedia Commons, CC BY-SA 4.0" and p.get("alt") == FACT["alt"], f"{t}: the card photo has the credit tooltip and alt ({p.get('title')!r})")
            h = R.get("factHero") or {}
            need(h.get("loaded") and h.get("src") == f"briefs/img/{date}-1.jpg" and h["box"]["right"] <= 390, f"{t}: the opened fact shows the photo inside 390px ({h.get('box')})")
            need(h.get("cap") == "Photo: Test Author, Wikimedia Commons, CC BY-SA 4.0 ↗" and h.get("href") == PAGE, f"{t}: the credit line reads Photo: credit, licence and links to the Commons page ({h.get('cap')!r})")
            need(h.get("target") == "_blank" and set((h.get("rel") or "").split()) >= {"noopener", "noreferrer"}, f"{t}: the credit opens a new tab with rel noopener noreferrer")
            need(R["sheet"] and R["sheet"]["scrollWidth"] <= R["sheet"]["clientWidth"] + 1, f"{t}: the opened fact has no sideways scroll ({R['sheet']})")
        elif kind == "short":
            need(R.get("cardPhoto") is None and R.get("factHero") is None, f"{t}: an unresolved short-form fact photo shows nothing")
            need(sorted(set(R["imgs"])) == [f"/briefs/img/{date}-0.jpg"], f"{t}: and asks for no image but the story's ({sorted(set(R['imgs']))})")
        else:
            need(not R["cardPhotoAfter"] and not R["factHeroAfter"], f"{t}: a missing fact photo file is removed from the card and the opened fact")
finally:
    srv.shutdown()
    for f in ("fact-test.html", "fact-photo-audit.js", "frame-test.html", "frame-test.js"):
        (site / f).unlink(missing_ok=True)
print("staged site kept at", site)
print("FACT PHOTO OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
