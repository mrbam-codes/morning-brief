"""Address test (plan 14, the move to nyoom.uk). Run from the repository: python3 tests/test_address.py

- No tracked file still names the old github.io address, except published editions under briefs/
  (old documents, left as they were). The old address is spelt in two parts below so this file
  does not match itself.
- The publisher (.github/assemble.py), the 09:00 edition watch (.github/workflows/watch.yml) and
  the QR code (qr.js) all use the one address in tools/build_qr.py.
Prints ADDRESS OK or the misses.
"""
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.dont_write_bytecode = True  # no __pycache__ left in tools/
sys.path.insert(0, str(ROOT / "tools"))
import build_qr  # noqa: E402

OLD = "github.io" + "/morning-brief"
ALLOWED = ("briefs/",)  # published editions: old documents, never rewritten
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


tracked = subprocess.run(["git", "-C", str(ROOT), "ls-files"], capture_output=True, text=True, check=True).stdout.split("\n")
hits = []
for f in filter(None, tracked):
    if f.startswith(ALLOWED):
        continue
    p = ROOT / f
    try:
        text = p.read_text(encoding="utf-8")
    except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError):
        continue
    hits += [f"{f}:{i}" for i, line in enumerate(text.splitlines(), 1) if OLD in line]
need(not hits, "no tracked file outside briefs/ names the old address" + (": " + ", ".join(hits) if hits else ""))

site = build_qr.SITE
need(re.fullmatch(r"https://[a-z0-9.-]+/", site) is not None, f"the address constant is a plain https address ending in / ({site})")
asm = (ROOT / ".github" / "assemble.py").read_text(encoding="utf-8")
need(f'SITE = "{site}"' in asm, "the publisher's SITE is the address constant")
need(f'MorningBriefPublisher/1.0 ({site})' in asm, "the publisher names the address when it fetches photos")
idx = (ROOT / "index.html").read_text(encoding="utf-8")
preview = re.findall(r'<meta (?:property="og:(?:url|image)"|name="twitter:image") content="([^"]*)">', idx)
need(len(preview) == 3 and all(u.startswith(site) for u in preview), f"the link preview tags in index.html use the address constant ({preview})")
watch = (ROOT / ".github" / "workflows" / "watch.yml").read_text(encoding="utf-8")
need(f"SITE: {site}\n" in watch, "the 09:00 edition watch checks the address constant")
qr = json.loads(re.search(r"window\.MBQR=(\{.*\});", (ROOT / "qr.js").read_text(encoding="utf-8"), re.S).group(1))
need(qr["url"] == site and qr["label"] == build_qr.label(site), f"qr.js holds the address constant ({qr['url']}, printed as {qr['label']})")

print("ADDRESS OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
