"""Built in the wild test (plan 15, gate A). Run from the repository: python3 tests/test_builds.py [OUT_DIR]

Makes test editions with tests/fixture.py (news from the newest brief on origin/briefs), adds a
`builds` list to some of them, stages a throwaway site with tests/stage.sh, then loads each edition in
headless Chrome inside a 390px frame (the kit from tests/test_page.py), normally and with reduced
motion, with every address except this computer blocked. tests/builds-audit.js reports from inside.
Asserts:
- no `builds`, or an empty list, means no section at all;
- 3 builds render 3 cartridges; 4 builds scroll sideways inside their own row, never the page;
- a bad video code gives no play button and no frame; a good one gives no frame until play is tapped,
  then one frame at https://www.youtube-nocookie.com/embed/<code>, gone on Stop or on a new cartridge;
- a link that does not start with https:// is not rendered;
- a diagram is an <img> with a data: address and its markup never becomes part of the page;
- text that looks like HTML shows as text; tap targets are at least 44px; arrow keys move cartridges;
- the fourth stat tile reads Video: Yes, Visual: Diagram, Visual: Photo or Visual: None;
- the section sits after the news and X, before the quiz, and the quiz block is still last;
- nothing is fetched from outside, no sideways scroll, no endless animation with reduced motion.
Then runs tests/test_page.py on the 3-build edition, so the whole-page audit (contrast, decks,
lessons) covers the new section too. Leaves the staged site in OUT_DIR/site so you can open it.
Prints BUILDS OK or the misses. Never publish a fixture.
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


GOOD = "M7lc1UVf-VE"      # an 11-character code in the right shape; nothing is fetched in this test
DIAGRAM = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" font-family="Arial,sans-serif" fill="#fff">'
           '<rect x="10" y="20" width="120" height="60" rx="10" fill="none" stroke="#fff" stroke-width="3"/>'
           '<rect x="190" y="20" width="120" height="60" rx="10" fill="none" stroke="#fff" stroke-width="3"/>'
           '<line x1="130" y1="50" x2="190" y2="50" stroke="#fff" stroke-width="4"/>'
           '<text x="160" y="140" font-size="16" text-anchor="middle">DIAGRAM-MARKER</text></svg>')


def build(label, **kw):
    b = {"what": f"Test build: {label} (test)", "who": "@sample_builder", "label": label,
         "steps": ["First test step.", "Second test step.", "Third test step."],
         "tools": ["Claude Code", "Test tool"], "proof": "Shown working", "proof_note": "Test proof note.",
         "level": "An evening", "level_note": "Test level note.", "first_step": "A test first step.",
         "links": {"post": "https://example.org/post"}}
    b.update(kw)
    return b


THREE = [
    build("VIDEO RIG", video=GOOD, reach="1K views on X at the time of writing (test)",
          links={"post": "https://example.org/post", "video": "https://www.youtube.com/watch?v=" + GOOD, "code": "https://example.org/code"}),
    build("DIAGRAM", diagram=DIAGRAM, diagram_alt="Test diagram: two boxes and a line.", proof="Code published", level="A weekend",
          links={"post": "javascript:alert(1)", "video": "http://example.org/plain", "code": "https://example.org/code2"}),
    build("<b>TAGS</b>", what="<img src=x onerror=alert(1)> <b>bold</b> (test)", proof="Claim only", level="A serious project",
          steps=["<i>step</i> one.", "Step two."], links={"post": "//example.org/no-scheme", "code": " https://example.org/space"}),
]
FOUR = [
    build("BAD CODE", video="M7lc1UVf-V/", links={"post": "https://example.org/p", "video": "https://www.youtube.com/watch?v=x"}),
    build("PHOTO", photo={"src": "https://upload.wikimedia.org/wikipedia/commons/a/a0/Test.jpg", "page": "https://commons.wikimedia.org/wiki/File:Test.jpg",
                          "credit": "Test credit", "licence": "CC BY 4.0", "alt": "Test photo."}),
    build("GOOD CODE", video=GOOD),
    build("NO LINK", video="M7lc1UVf-VEX", links={}),
]
CASES = {"2026-11-12": THREE, "2026-11-13": None, "2026-11-14": FOUR, "2026-11-16": []}

dates = sorted((p[7:17] for p in git("ls-tree", "--name-only", "origin/briefs", "briefs/").split() if p[7:11].isdigit()), reverse=True)
work = pathlib.Path(tempfile.mkdtemp())
(work / "news.json").write_text(git("show", f"origin/briefs:briefs/{dates[0]}.json"), encoding="utf-8")
files = []
for d, bl in CASES.items():
    f = work / f"{d}.json"
    subprocess.run([sys.executable, str(here / "fixture.py"), str(work / "news.json"), d, str(f)], check=True, capture_output=True)
    if bl is not None:
        b = json.loads(f.read_text(encoding="utf-8"))
        b["builds"] = bl
        f.write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")
    files.append(str(f))
site = out / "site"
subprocess.run(["sh", str(here / "stage.sh"), str(site), *files], check=True, capture_output=True)
# the photo build is the only photo in its edition (fixture.py drops story photos), so the page asks for photo 0
img = site / "briefs" / "img"
img.mkdir(parents=True, exist_ok=True)
jpg = img / "2026-11-14-0.jpg"
if shutil.which("sips"):
    subprocess.run(["sips", "-s", "format", "jpeg", str(ROOT / "icons" / "icon-192.png"), "--out", str(jpg)], capture_output=True)
have_jpg = jpg.exists()

idx = (site / "index.html").read_text(encoding="utf-8")
(site / "builds-test.html").write_text(idx.replace("</body>", '<script src="builds-audit.js"></script></body>'), encoding="utf-8")
(site / "frame-test.js").write_text("addEventListener('message',e=>{if(e.data&&e.data.audit){const p=document.createElement('pre');p.id='audit';p.textContent=e.data.audit;document.body.append(p)}});"
    "const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;f.src=decodeURIComponent(location.search.slice(1));document.body.style.margin=0;document.body.append(f);")
(site / "frame-test.html").write_text('<!doctype html><meta charset="utf-8"><body><script src="frame-test.js"></script></body>')
shutil.copy(here / "builds-audit.js", site / "builds-audit.js")


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"


def audit(date, extra):
    prof = tempfile.mkdtemp()
    args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=390,844", "--hide-scrollbars",
            "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1", *extra, "--virtual-time-budget=40000", "--dump-dom",
            f"{base}/frame-test.html?builds-test.html%3Fd%3D{date}"]
    dom = subprocess.run(args, capture_output=True, text=True, timeout=180).stdout
    m = re.search(r'<pre id="audit">(.*?)</pre>', dom, re.S)
    return json.loads(html.unescape(m.group(1))) if m else {"crash": "audit did not report"}


try:
    for mode, extra in (("motion", []), ("reduced", ["--force-prefers-reduced-motion"])):
        for date, bl in CASES.items():
            R = audit(date, extra)
            tag = f"{mode} {date}"
            (out / f"{date}-{mode}-builds.json").write_text(json.dumps(R, indent=1, ensure_ascii=False))
            if "crash" in R:
                need(False, f"{tag}: audit crashed: {R['crash']}"); continue
            need(not R["overflowX"] and not R["wide"], f"{tag}: no sideways page scroll at 390px (scroll width {R['scrollWidth']}, sticking out: {R['wide']})")
            need(not R["errorShown"], f"{tag}: page shows no error")
            need(not R["outside"] and R["framesAtLoad"] == 0 and R["youtubeAtLoad"] == 0, f"{tag}: nothing fetched from outside and no frame at load ({R['outside']})")
            need(R.get("afterQuiz") in ([], ["gcard"]) and R.get("afterQuizMain") == ["footer"], f"{tag}: the quiz block is still last (after quiz: {R.get('afterQuiz')}, then {R.get('afterQuizMain')})")
            if mode == "reduced":
                need(R["reduce"] and not R["running"], f"{tag}: no endless animation with reduced motion ({R['running']})")
            if not bl:
                need(not R["section"] and R["bwNodes"] == 0, f"{tag}: {'no builds list' if bl is None else 'an empty builds list'} shows no section")
                continue
            need(R["section"] and R["carts"] == len(bl), f"{tag}: {len(bl)} builds render {R.get('carts')} cartridges")
            o = R["order"]
            need(o["afterNews"] and o["afterLearn"] and o["afterChat"] in (True, None) and o["beforeQuiz"], f"{tag}: section after the news, Learn and X, before the quiz ({o})")
            need(R["keyboard"]["focused"] and R["keyboard"]["pressed"] == "true", f"{tag}: the right arrow moves to and loads the next cartridge")
            need(R["scrollWidthEnd"] <= 391, f"{tag}: still no sideways scroll after every cartridge was loaded ({R['scrollWidthEnd']})")
            B = R["builds"]
            need(all(not x["small"] for x in B), f"{tag}: every button and link is at least 44px ({[x['small'] for x in B if x['small']]})")
            need(all(not x["wide"] for x in B), f"{tag}: nothing in the section sticks out ({[x['wide'] for x in B if x['wide']]})")
            need(all(h.startswith("https://") for x in B for h in x["allHrefs"]), f"{tag}: every link starts with https:// ({[h for x in B for h in x['allHrefs'] if not h.startswith('https://')]})")
            need(all(x["pressed"].split(",")[x["i"]] == "true" and x["pressed"].count("true") == 1 for x in B), f"{tag}: tapping a cartridge marks it, and only it, as loaded")
            if bl is THREE:
                v, dg, tx = B
                need(v["tile4"] == ["Video", "Yes"] and dg["tile4"] == ["Visual", "Diagram"] and tx["tile4"] == ["Visual", "None"], f"{tag}: fourth tile reads Video: Yes, Visual: Diagram, Visual: None ({v['tile4']}, {dg['tile4']}, {tx['tile4']})")
                need(v["play"] and v["framesBeforeTap"] == 0 and v["youtubeBeforeTap"] == 0, f"{tag}: a good video code shows a drawn poster with play, and no frame before the tap")
                need(v.get("framesAfterTap") == [f"https://www.youtube-nocookie.com/embed/{GOOD}?autoplay=1&rel=0&playsinline=1"], f"{tag}: tapping play makes one youtube-nocookie frame for that code ({v.get('framesAfterTap')})")
                need(v.get("sandbox") and "allow-top-navigation" not in v["sandbox"], f"{tag}: the frame is sandboxed and cannot move the page ({v.get('sandbox')})")
                need(v.get("stop") and v.get("framesAfterStop") == 0 and v.get("focusAfterStop") == "bw-play", f"{tag}: Stop removes the frame and puts focus back on play")
                need(v.get("framesReplay") == 1 and v.get("framesAfterSwitch") == 0, f"{tag}: switching cartridge removes the frame ({v.get('framesReplay')}, {v.get('framesAfterSwitch')})")
                need(v["links"] == ["https://example.org/post", "https://www.youtube.com/watch?v=" + GOOD, "https://example.org/code"], f"{tag}: post, video and code links all shown when https ({v['links']})")
                need(dg["diagram"] and dg["diagram"]["src"].startswith("data:image/svg+xml;charset=utf-8,") and dg["diagram"]["loaded"], f"{tag}: the diagram is an img with a data: address and it loads ({dg['diagram']})")
                need(not dg["markerAsText"], f"{tag}: the diagram's markup is never part of the page")
                need(dg["links"] == ["https://example.org/code2"], f"{tag}: javascript: and http:// links are not rendered ({dg['links']})")
                need(tx["links"] == [], f"{tag}: a link with no scheme, or with a leading space, is not rendered ({tx['links']})")
                need(tx["title"] == "<img src=x onerror=alert(1)> <b>bold</b> (test)" and tx["tagsInText"] == 0, f"{tag}: text that looks like HTML shows as text")
                need(tx["titleScreen"] and not tx["play"] and not tx["frames"], f"{tag}: a build with no visual shows the drawn title screen")
            if bl is FOUR:
                bad, ph, good, nov = B
                need(R["row"]["overflowX"] == "auto" and R["row"]["scrollWidth"] > R["row"]["clientWidth"] and R["row"]["right"] <= 390, f"{tag}: 4 cartridges scroll sideways inside their row ({R['row']})")
                need(not bad["play"] and not bad["frames"] and bad["outLinks"] == [["Watch on YouTube ↗", "https://www.youtube.com/watch?v=x"]], f"{tag}: a bad video code gives no play and no frame, only Watch on YouTube ({bad['outLinks']})")
                need(bad["tile4"] == ["Video", "Link only"] and nov["tile4"] == ["Video", "None"] and not nov["play"] and not nov["outLinks"], f"{tag}: bad code tiles read Video: Link only, or Video: None with no link ({bad['tile4']}, {nov['tile4']})")
                need(good["play"] and good.get("framesAfterTap") and good.get("framesAfterSwitch") == 0, f"{tag}: a good code in a 4-build row plays and is removed on switch")
                need(ph["tile4"] == ["Visual", "Photo"] and ph["cap"].startswith("Photo: Test credit, CC BY 4.0"), f"{tag}: the photo build reads Visual: Photo and shows its credit ({ph['cap']!r})")
                if have_jpg:
                    need(ph["photo"] and ph["photo"]["src"] == "briefs/img/2026-11-14-0.jpg" and ph["photo"]["loaded"], f"{tag}: the photo goes through the story-photo path ({ph['photo']})")
                else:
                    print("skip  no sips here, so the photo file was not made; the photo path was not checked")
finally:
    srv.shutdown()
    for f in ("builds-test.html", "builds-audit.js", "frame-test.html", "frame-test.js"):
        (site / f).unlink(missing_ok=True)

# the whole-page audit on the 3-build edition (contrast, decks, lessons, Done)
pg = subprocess.run([sys.executable, str(here / "test_page.py"), str(site), "2026-11-12", str(out)], capture_output=True, text=True, timeout=900)
print("\n".join("      " + l for l in pg.stdout.strip().splitlines()[-4:]))
need(pg.returncode == 0, "tests/test_page.py passes on the 3-build edition")
print("staged site kept at", site)
print("BUILDS OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
