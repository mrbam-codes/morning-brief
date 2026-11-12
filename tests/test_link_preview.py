"""Link preview test, no network. Run from the repository: python3 tests/test_link_preview.py

Asserts:
- index.html carries every Open Graph and Twitter card tag exactly once, with the full picture address;
- og/kimchi.png and og/charlee.png are tracked, are PNG, 1200 by 630 and under 600 KB;
- .github/assemble.py's set_link_preview gives Kimchi on an even day of the year and Charlee on an
  odd day, with the matching alt text, and leaves the file untouched when a tag is missing;
- main() publishes an index.html with every tag once and the day's cat, and when the tags are not
  as expected it keeps the default picture and still finishes the deploy.
Prints LINK PREVIEW OK or the misses.
"""
import importlib.util, os, pathlib, shutil, struct, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("assemble", ROOT / ".github" / "assemble.py")
A = importlib.util.module_from_spec(spec)
spec.loader.exec_module(A)
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


SITE = "https://nyoom.uk/"
DESC = "Daily AI, technology and cyber security news in a few minutes, with short lessons and a quiz."
TAGS = [
    f'<meta name="description" content="{DESC}">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Morning brief">',
    '<meta property="og:title" content="Morning brief">',
    f'<meta property="og:description" content="{DESC}">',
    f'<meta property="og:url" content="{SITE}">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:type" content="image/png">',
    '<meta name="twitter:card" content="summary_large_image">',
]


def cat_tags(cat):
    alt = A.OG_ALT[cat]
    return [f'<meta property="og:image" content="{SITE}og/{cat}.png">',
            f'<meta property="og:image:alt" content="{alt}">',
            f'<meta name="twitter:image" content="{SITE}og/{cat}.png">',
            f'<meta name="twitter:image:alt" content="{alt}">']


def has_all_once(html, cat, where):
    head = html.split("</head>", 1)[0]
    for t in TAGS + cat_tags(cat):
        need(head.count(t) == 1 and html.count(t) == 1, f"{where}: once in the head: {t[:90]}")
    other = "charlee" if cat == "kimchi" else "kimchi"
    need(f"og/{other}.png" not in html and A.OG_ALT[other] not in html, f"{where}: nothing left of {other}")


# ---------- the source page ----------
src = (ROOT / "index.html").read_text(encoding="utf-8")
has_all_once(src, "kimchi", "index.html")
need(A.SITE == SITE, "the publisher's SITE is the address the tags use")
need("—" not in DESC and "Adam" not in src.split("</head>", 1)[0], "the description has no em dash and the head names no person")

# ---------- the pictures ----------
tracked = set(subprocess.run(["git", "-C", str(ROOT), "ls-files", "og"], capture_output=True, text=True).stdout.split())
for cat in ("kimchi", "charlee"):
    p = ROOT / "og" / f"{cat}.png"
    data = p.read_bytes() if p.exists() else b""
    ok_png = data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR"
    w, h = struct.unpack(">II", data[16:24]) if ok_png else (0, 0)
    need(f"og/{cat}.png" in tracked, f"og/{cat}.png is tracked, so the publisher copies it")
    need(ok_png and (w, h) == (1200, 630) and len(data) < 600_000, f"og/{cat}.png is a PNG, 1200 by 630, under 600 KB ({w} by {h}, {len(data)} bytes)")

# ---------- the swap ----------
need(A.og_cat("2026-11-12") == "kimchi" and A.og_cat("2026-11-13") == "charlee", "day 316 is Kimchi, day 317 is Charlee")
need(A.og_cat("2024-12-31") == "kimchi" and A.og_cat("2026-01-01") == "charlee", "leap-year day 366 is Kimchi, 1 January is Charlee")
tmp = pathlib.Path(tempfile.mkdtemp())
for date, cat in (("2026-11-12", "kimchi"), ("2026-11-13", "charlee")):
    (tmp / "index.html").write_text(src, encoding="utf-8")
    got = A.set_link_preview(str(tmp), date)
    out = (tmp / "index.html").read_text(encoding="utf-8")
    need(got == cat, f"{date} gives {cat} ({got})")
    has_all_once(out, cat, f"{date} swap")
    need(len(out) - len(src) == 2 * (len(A.OG_ALT[cat]) - len(A.OG_ALT["kimchi"]) + len(cat) - len("kimchi")),
         f"{date}: nothing else in the file changed")
for name, broken in (("og:image missing", src.replace(f'<meta property="og:image" content="{SITE}og/kimchi.png">\n', "", 1)),
                     ("alt missing", src.replace(f'<meta name="twitter:image:alt" content="{A.OG_ALT["kimchi"]}">\n', "", 1))):
    need(broken != src, f"the {name} case really removes a tag")
    (tmp / "index.html").write_text(broken, encoding="utf-8")
    try:
        A.set_link_preview(str(tmp), "2026-11-13")
        raised = False
    except ValueError:
        raised = True
    need(raised and (tmp / "index.html").read_text(encoding="utf-8") == broken, f"{name}: refuses and leaves the file as it was")

# ---------- main(): published copy, and a failure never stops a deploy ----------
A.published = lambda date: None          # no live site
A.grab = lambda url, hosts: None         # no image downloads
here = os.getcwd()


def run_main(edit=None):
    repo = pathlib.Path(tempfile.mkdtemp())
    for p in subprocess.run(["git", "-C", str(ROOT), "ls-files"], capture_output=True, text=True, check=True).stdout.split():
        if (ROOT / p).is_file():
            (repo / p).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / p, repo / p)
    for p in ("og/kimchi.png", "og/charlee.png", "index.html"):   # the working copies under test
        shutil.copyfile(ROOT / p, repo / p)
    if edit:
        (repo / "index.html").write_text(edit((repo / "index.html").read_text(encoding="utf-8")), encoding="utf-8")
    g = lambda *a: subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@example.org", *a], capture_output=True, text=True, check=True)
    g("init", "-q", "-b", "main"); g("add", "-A"); g("commit", "-q", "-m", "main")
    A.summary.clear(); A._parsed.clear(); A._live.clear()
    os.chdir(repo)
    try:
        A.main("no-such-branch", str(repo / "_site"))
        code = 0
    except SystemExit as x:
        code = x.code
    finally:
        os.chdir(here)
    return code, repo / "_site", list(A.summary)


code, site, said = run_main()
newest = sorted(p.stem for p in (site / "briefs").glob("????-??-??.json"))[-1]
want = A.og_cat(newest)
served = (site / "index.html").read_text(encoding="utf-8")
need(code == 0 and any(s == f"Link preview: {want} for {newest}" for s in said), f"the deploy finishes and reports {want} for {newest} ({code}, {said[-2:]})")
has_all_once(served, want, "served index.html")
need((site / "og" / "kimchi.png").read_bytes() == (ROOT / "og" / "kimchi.png").read_bytes()
     and (site / "og" / "charlee.png").read_bytes() == (ROOT / "og" / "charlee.png").read_bytes(), "both pictures are published byte for byte")

drop = f'<meta name="twitter:image" content="{SITE}og/kimchi.png">\n'
code, site, said = run_main(lambda s: s.replace(drop, "", 1))
served = (site / "index.html").read_text(encoding="utf-8")
need(code == 0 and any(s.startswith("Link preview step failed") for s in said), f"a missing tag is reported and the deploy still finishes ({code})")
need(f"{SITE}og/kimchi.png" in served and "og/charlee.png" not in served, "and the published copy keeps the default picture")

print("LINK PREVIEW OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
