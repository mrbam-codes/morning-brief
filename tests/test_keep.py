"""Plan 1 test: offline cache list and backup code. Run from the repository: python3 tests/test_keep.py

The SAME file sits in the Morning brief and Mise en Place. It checks that:
- sw.js caches every fixed file the page loads, nothing under briefs/, and only files that exist;
- the manifest and its icons are present and the page links them;
- the Content Security Policy allows the manifest and the service worker;
- the backup code round-trips, is refused by the other brief, is refused when cut short or changed,
  and old plain codes still restore (runs keep.js in Node).
Prints KEEP OK or the misses.
"""
import json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


sw = (ROOT / "sw.js").read_text()
fixed = re.findall(r"'([^']+)'", sw[sw.index("const FIXED=["):sw.index("];", sw.index("const FIXED=["))])
tracked = set(subprocess.run(["git", "-C", str(ROOT), "ls-files"], capture_output=True, text=True).stdout.split())
here = {str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts}
need(all(f in here for f in fixed), "every cached file exists: " + ", ".join(f for f in fixed if f not in here) if not all(f in here for f in fixed) else "every cached file exists")
need(not any(f.startswith("briefs/") for f in fixed), "nothing under briefs/ is cached")
idx = (ROOT / "index.html").read_text()
loaded = set(re.findall(r'<script src="([^"]+)"', idx)) | set(re.findall(r'<link rel="(?:stylesheet|manifest|apple-touch-icon)" href="([^"]+)"', idx))
fonts = {"fonts/" + f for f in re.findall(r"url\(([^)]+\.woff2)\)", (ROOT / "fonts" / "fonts.css").read_text())}
need(loaded <= set(fixed), "every script, stylesheet, manifest and icon the page loads is cached: missing " + str(sorted(loaded - set(fixed))))
need(fonts <= set(fixed), "every font is cached: missing " + str(sorted(fonts - set(fixed))))
need({"index.html", "course.json", "sources.json", "evidence.js", "keep.js"} <= set(fixed), "index, course, source register, evidence and keep files are cached")
man = json.loads((ROOT / "manifest.webmanifest").read_text())
need(man.get("display") == "standalone" and man.get("start_url") == "./" and man.get("scope") == "./", "manifest: standalone, start and scope are this folder")
need(all((ROOT / i["src"]).exists() for i in man["icons"]) and {"192x192", "512x512"} <= {i["sizes"] for i in man["icons"]}, "manifest icons exist at 192 and 512")
need('rel="apple-touch-icon"' in idx and (ROOT / "icons" / "apple-touch-icon.png").exists(), "iPhone home-screen icon linked")
csp = re.search(r'Content-Security-Policy" content="([^"]+)"', idx).group(1)
need("manifest-src 'self'" in csp and "worker-src 'self'" in csp, "Content Security Policy allows the manifest and the service worker")
need("keep.js" in idx and "Keep.mount" in (idx + (ROOT / "app.js").read_text() if (ROOT / "app.js").exists() else idx), "the Progress sheet uses keep.js for Back up and Restore")
need("btoa(unescape" not in idx + ((ROOT / "app.js").read_text() if (ROOT / "app.js").exists() else ""), "the old plain backup code maker is gone")

node = shutil.which("node")
if not node:
    need(False, "Node is needed for the backup code test")
else:
    js = r"""
const fs=require('fs');globalThis.window=globalThis;globalThis.document={readyState:'loading'};globalThis.addEventListener=()=>{};
eval(fs.readFileSync(process.argv[1],'utf8'));
const S={days:{'2026-11-09':{score:4,total:5,points:60},'2026-11-10':{score:5,total:5,points:70}},tags:{AI:[3,4]},points:130,note:'Ünïcødé ✓ £5'};
(async()=>{const r=[];const code=await Keep.make('MB',S);r.push(['shape',/^MB\.1[zj]\.[A-Za-z0-9_-]+\.[0-9a-z]{7}$/.test(code)]);
 r.push(['compressed',code.split('.')[1]==='1z']);
 const back=await Keep.read('MB',code);r.push(['round trip',JSON.stringify(back.s)===JSON.stringify(S)&&/^\d{4}-\d{2}-\d{2}$/.test(back.at)]);
 r.push(['spaces and line breaks ignored',JSON.stringify((await Keep.read('MB',code.slice(0,20)+'\n  '+code.slice(20))).s)===JSON.stringify(S)]);
 const bad=async(c,app)=>{try{await Keep.read(app||'MB',c);return 'accepted'}catch(e){return e.message}};
 r.push(['other brief refused',(await bad(code,'MEP'))==='That code is from a different brief.']);
 r.push(['cut short refused',/incomplete or changed/.test(await bad(code.slice(0,-12)+code.slice(-8)))]);
 const mid=code.length>>1,flip=code.slice(0,mid)+(code[mid]==='A'?'B':'A')+code.slice(mid+1);r.push(['one changed letter refused',/incomplete or changed/.test(await bad(flip))]);
 r.push(['rubbish refused',(await bad('hello there'))==='That is not a backup code.']);
 r.push(['empty refused',(await bad(''))==='Paste a backup code first.']);
 const legacy=Buffer.from(unescape(encodeURIComponent(JSON.stringify(S))),'binary').toString('base64');
 const L=await Keep.read('MB',legacy);r.push(['old plain code restores',L.old===true&&JSON.stringify(L.s)===JSON.stringify(S)]);
 console.log(JSON.stringify(r))})().catch(e=>{console.log(JSON.stringify([['crashed: '+e.message,false]]))});
"""
    out = subprocess.run([node, "-e", js, str(ROOT / "keep.js")], capture_output=True, text=True, timeout=60)
    try:
        for name, ok in json.loads(out.stdout.strip().splitlines()[-1]):
            need(ok, "backup code: " + name)
    except Exception:
        need(False, "backup code test ran: " + (out.stdout + out.stderr)[-400:])

print("KEEP OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
