"""Real-network smoke check of the publisher's Commons lookup (plan 21). Run: python3 tests/test_commons_live.py

Asks the real Commons API (and only it, plus the image host) about two known files through
.github/assemble.py's own resolve() and grab(), so a change on Wikimedia's side shows up here.
Prints COMMONS OK or the misses. Needs the network; every other photo test is offline.
On a Mac whose Python has no certificate store, run it with SSL_CERT_FILE=/etc/ssl/cert.pem.
"""
import importlib.util, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("assemble", ROOT / ".github" / "assemble.py")
A = importlib.util.module_from_spec(spec)
spec.loader.exec_module(A)
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


CASES = [("https://commons.wikimedia.org/wiki/File:NVIDIA_Headquarters.jpg", "CC BY-SA 4.0", "Coolcaesar, Wikimedia Commons"),
         ("https://commons.wikimedia.org/wiki/File:Maersk_container_ship_002.JPG", "CC BY-SA 3.0", "Yennen-Gas, Wikimedia Commons")]
for page, lic, credit in CASES:
    r = A.resolve(page)
    name = page.rsplit(":", 1)[-1]
    if not isinstance(r, dict):
        need(False, f"{name}: resolved ({r})")
        continue
    need(r["licence"] == lic, f"{name}: licence {r['licence']!r}, expected {lic!r}")
    need(r["credit"] == credit, f"{name}: credit {r['credit']!r}, expected {credit!r}")
    need(A.COMMONS_SRC.match(r["src"]) is not None and "/960px-" in r["src"], f"{name}: a 960px image address on an allowed host ({r['src']})")
    data = A.grab(r["src"], A.PHOTO_HOSTS)
    need(bool(data) and data[:3] == b"\xff\xd8\xff", f"{name}: the image downloads as a JPEG under 1.5MB ({len(data or b'')} bytes)")
r = A.resolve("https://commons.wikimedia.org/wiki/File:Morning_brief_no_such_file_zz.jpg")
need(r == "no such file", f"a file that does not exist is refused ({r})")
print("COMMONS OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
