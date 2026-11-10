"""Keep the Content Security Policy hash in index.html in step with its inline script.

Run `python3 csp.py` after ANY edit to the inline <script> in index.html.
Without it the browser refuses to run the script and the page goes blank.
`python3 csp.py --check` only reports, and exits 1 if the hash is stale.
"""
import base64, hashlib, re, sys

PATH = "index.html"
s = open(PATH, encoding="utf-8").read()
m = re.search(r"<script>(.*?)</script>", s, re.S)
h = "'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode("utf-8")).digest()).decode() + "'"
policy = ("default-src 'none'; script-src 'self' " + h + "; "
          "style-src 'self' 'unsafe-inline'; "
          "font-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; "
          "media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'")
tag = '<meta http-equiv="Content-Security-Policy" content="' + policy + '">'
cur = re.search(r'<meta http-equiv="Content-Security-Policy"[^>]*>', s)
if "--check" in sys.argv:
    ok = bool(cur) and cur.group(0) == tag
    print("CSP OK" if ok else "CSP STALE: run python3 csp.py")
    sys.exit(0 if ok else 1)
s = s.replace(cur.group(0), tag) if cur else s.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + tag + "\n", 1)
open(PATH, "w", encoding="utf-8").write(s)
print("CSP updated", h)
