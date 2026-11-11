"""Share card flip and Move my progress test at phone width (plan 14).
Run: python3 tests/test_card.py SITE_DIR [OUT_DIR]   (SITE_DIR is a staged copy, as for tests/test_page.py)

Headless Chrome will not open a window narrower than 500px, so the page runs inside a 390px frame
(the same kit as tests/test_page.py) and tests/card-audit.js reports from inside it. Asserts:
- the card is 324 by 576 at 390px, nothing sticks out or is cut off, no sideways scroll, even mid-turn;
- the front has the TAP TO FLIP hint and no address; the back has the QR, the address and TAP TO FLIP BACK;
- tapping turns it over and back; Tractor Beam and Warp Jump take turns going to the back, each within
  1.6 seconds, and the turn back to the front is quick; Enter and Space turn it from the keyboard;
- once settled, the QR read back from the canvas pixels equals qr.js, pure black on pure white,
  whole-pixel modules no wider than 246px with the margin, nothing on top of it, nothing faded or tinted;
- with reduced motion both ways are an instant swap;
- Move my progress: Copy code gives a code; in an empty browser, bad codes are refused and change nothing,
  Cancel changes nothing, and Yes loads the same days, points and topics;
- no console errors anywhere.
"""
import functools, http.server, json, pathlib, re, shutil, struct, subprocess, sys, tempfile, threading, html, urllib.parse, zlib

site = pathlib.Path(sys.argv[1])
out_dir = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path(tempfile.mkdtemp())
out_dir.mkdir(parents=True, exist_ok=True)
here = pathlib.Path(__file__).resolve().parent
chrome = shutil.which("google-chrome") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
idx = (site / "index.html").read_text(encoding="utf-8")
(site / "card-test.html").write_text(idx.replace("</body>", '<script src="card-audit.js"></script></body>'), encoding="utf-8")
shutil.copy(here / "card-audit.js", site / "card-audit.js")
# ?seed=1 puts three finished quiz days into this browser first; the page address (with its #phase) follows the first &
(site / "card-frame.js").write_text(
    "addEventListener('message',e=>{if(e.data&&e.data.audit){const p=document.createElement('pre');p.id='audit';p.textContent=e.data.audit;document.body.append(p)}});"
    "const q=location.search.slice(1),i=q.indexOf('&'),seed=q.slice(0,i)==='seed=1',page=decodeURIComponent(q.slice(i+1));"
    "if(seed){const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),days={};"
    "[[1,4,5],[2,5,5],[3,3,5]].forEach(([n,s,t])=>{const d=new Date();d.setDate(d.getDate()-n);days[ds(d)]={score:s,total:t,points:0,at:Date.now()}});"
    "localStorage.setItem('mb-v1',JSON.stringify({days,tags:{AI:[5,6],Tech:[4,5],Cyber:[3,4]},lessons:{},points:0,badges:{},review:[],prog:{},sound:false,name:'tester'}))}"
    "const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;f.src=page;document.body.style.margin=0;document.body.append(f);")
# The animations need real frames, and headless Chrome's virtual time stops them, so the run is in real time.
# Chrome dumps the page or takes the screenshot at the frame page's load event, so the frame page holds an image
# that the server answers only when the audit says it has finished (or after 90 seconds).
(site / "card-frame.html").write_text('<!doctype html><meta charset="utf-8"><body><script src="card-frame.js"></script><img src="hold" alt=""></body>')
HOLD, DONE = threading.Event(), {}
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
                DONE.clear(); DONE.update(urllib.parse.parse_qsl(urllib.parse.urlsplit(self.path).query)); HOLD.set()
            self.send_response(200); self.send_header("Content-Type", "image/gif"); self.send_header("Content-Length", str(len(GIF))); self.end_headers(); self.wfile.write(GIF)
            return
        super().do_GET()


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"
fails, results, consoles = [], {}, []
need = lambda c, msg: c or fails.append(msg)
ERR = re.compile(r"Uncaught|Refused|Failed to load|Error|error|violat", re.S)


def chrome_run(phase, seed, reduced=False, shot=None, scale=1):
    prof = tempfile.mkdtemp()
    HOLD.clear()
    args = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={prof}", "--window-size=390,844", "--hide-scrollbars",
            "--enable-logging=stderr", "--v=0"]
    if reduced:
        args.append("--force-prefers-reduced-motion")
    if scale != 1:
        args.append(f"--force-device-scale-factor={scale}")
    url = f"{base}/card-frame.html?seed={1 if seed else 0}&" + "card-test.html%23" + phase.replace("=", "%3D")
    p = subprocess.run(args + ([f"--screenshot={shot}"] if shot else ["--dump-dom"]) + [url], capture_output=True, text=True, timeout=180)
    lines = [l for l in p.stderr.splitlines() if "CONSOLE" in l]
    consoles.extend((phase[:12], l.split("] ", 1)[-1][:300]) for l in lines)
    if shot:
        return dict(DONE)
    m = re.search(r'<pre id="audit">(.*?)</pre>', p.stdout, re.S)
    return json.loads(html.unescape(m.group(1))) if m else {"crash": "audit did not report"}


try:
    for name, phase, seed, red in (("card", "card", True, False), ("reduced", "reduced", True, True), ("copy", "copy", True, False)):
        results[name] = chrome_run(phase, seed, red)
    code = (results["copy"] or {}).get("code") or ""
    results["paste"] = chrome_run("paste=" + code, False)
    for n, ph in (("front", "shot=0"), ("back-tractor", "shot=1"), ("back-warp", "shot=3"), ("mid-tractor", "mid=1,1000"), ("mid-warp", "mid=3,700")):
        results["shot-" + n] = chrome_run(ph, True, shot=str(out_dir / f"card-390-{n}.png"))
    # a phone screen has 3 device pixels to each page pixel: check the settled code there too
    results["shot-back-tractor-3x"] = chrome_run("shot=1", True, shot=str(out_dir / "card-390-back-tractor-3x.png"), scale=3)
finally:
    srv.shutdown()
    for f in ("card-test.html", "card-audit.js", "card-frame.html", "card-frame.js"):
        (site / f).unlink(missing_ok=True)
(out_dir / "card-audit.json").write_text(json.dumps(results, indent=1, ensure_ascii=False))

Qd = json.loads(re.search(r"window\.MBQR=(\{.*\});", (site / "qr.js").read_text(encoding="utf-8"), re.S).group(1))
for mode in ("card", "reduced"):
    R = results.get(mode) or {}
    if "crash" in R:
        fails.append(f"{mode}: audit crashed: {R['crash']}"); continue
    need(R["width"] == 390, f"{mode}: viewport is {R['width']}px, not 390")
    need(R["reduce"] == (mode == "reduced"), f"{mode}: reduced motion setting is {R['reduce']}")
    need(round(R["stage"]["w"]) == 324 and round(R["stage"]["h"]) == 576 and R["front"]["w"] == R["stage"]["w"] and R["front"]["h"] == R["stage"]["h"], f"{mode}: card is {R['stage']['w']} by {R['stage']['h']}, not 324 by 576")
    need(R["back"] == R["front"], f"{mode}: back face is not the same size and place as the front: {R['back']} vs {R['front']}")
    need(not R["overflowX"] and not R.get("overflowDuring"), f"{mode}: sideways scroll (settled {R['overflowX']}, mid-turn {R.get('overflowDuring')})")
    need(not R["frontClip"], f"{mode}: front clipped: {R['frontClip']}")
    need(R["role"] == "button" and R["tabindex"] == "0" and "Press to turn the card over" in (R["label"] or ""), f"{mode}: card is not a labelled button: {R['role']} {R['tabindex']} {R['label']}")
    need("TAP TO FLIP" in R["frontText"] and Qd["label"] not in R["frontText"], f"{mode}: front should say TAP TO FLIP and not show the address")
    need(R["pilot"], f"{mode}: the real pilot art is not in the ship ({R['pilotName']})")
    for t in R["turns"]:
        need(t["to"] != t["from"] and t["to"] in ("front", "back"), f"{mode}: a turn from {t['from']} ended on {t['to']}")
        if t["to"] == "back":
            q = t["qr"]
            need(not t["backClip"], f"{mode}: back clipped: {t['backClip']}")
            need(q["wrong"] == 0 and q["grey"] == 0, f"{mode}: settled QR pixels: {q['wrong']} modules wrong, {q['grey']} pixels not pure black or white")
            need(q["modules"] == Qd["size"] + 8 and q["wholePx"] and q["cssSize"] <= 246, f"{mode}: QR is {q['cssSize']}px with {q['modulePx']}px modules (want whole pixels, at most 246px)")
            need(q["over"] == 0 and q["opacity"] == 1 and not q["filters"] and q["qaHidden"] and q["fxEmpty"] and q["extras"] == 0 and not q["a3d"] and q["anims"] == 0,
                 f"{mode}: something is on or over the settled QR: {q}")
            need(Qd["label"] in t["label"] and "Press to turn the card back" in t["label"], f"{mode}: back label: {t['label']}")
            need(t["frontVis"] == "hidden" and t["backVis"] == "visible", f"{mode}: on the back, front is {t['frontVis']} and back is {t['backVis']}")
        else:
            need(t["shipIn"] == "front" and t["frontVis"] == "visible" and t["backVis"] == "hidden", f"{mode}: back on the front, ship is in {t['shipIn']}, front {t['frontVis']}, back {t['backVis']}")
    need("SCAN TO OPEN TODAY'S BRIEF" in R["backText"] and Qd["label"] in R["backText"] and "TAP TO FLIP BACK" in R["backText"] and "share --qr" in R["backText"], f"{mode}: back text: {R['backText']!r}")
    need(R["nameAsText"], f"{mode}: a name holding HTML was not shown as plain text")
    T = R["turns"]
    if mode == "card":
        need(len(T) == 6, f"card: {len(T)} turns recorded")
        backs = [t for t in T if t["to"] == "back"]
        kinds = ["tractor" if t["fly"] else "warp" if t["ghosts"] else "?" for t in backs]
        need(kinds == ["tractor", "warp", "tractor"], f"card: animations to the back went {kinds}, expected tractor, warp, tractor")
        need(all(t["qaShown"] and t["fxDrawn"] for t in backs), "card: an animation to the back did not draw")
        need(all(t["bgDrawn"] for t in backs if not t["fly"]), "card: Warp Jump did not draw its star tunnel")
        need([t["shipIn"] for t in backs] == ["slot", "front", "slot"] and "JUMP COMPLETE" in backs[1]["slotText"], f"card: ship after each back turn: {[t['shipIn'] for t in backs]}, Warp slot {backs[1]['slotText']!r}")
        need(all(t["sideSoon"] == "anim" for t in T), "card: a turn did not start animating at once")
        need(all(t["ms"] is not None and t["ms"] <= 1600 + 50 for t in backs), f"card: animations to the back took {[t['ms'] for t in backs]} ms (limit 1.6 s, plus 50 ms for the first frame and the settle)")
        fronts = [t for t in T if t["to"] == "front"]
        need(all(t["ms"] is not None and t["ms"] <= 400 + 50 and not t["fly"] and not t["ghosts"] for t in fronts), f"card: turns to the front took {[t['ms'] for t in fronts]} ms, or were not plain")
        need(T[4]["from"] == "front" and T[4]["to"] == "back" and T[5]["to"] == "front", "card: Enter then Space did not turn the card over and back")
        S2 = R.get("second") or {}
        need(S2.get("pilotName", "").startswith("CHARLEE") and S2.get("pilot") and S2.get("turn", {}).get("ghosts") and S2.get("turn", {}).get("to") == "back",
             f"card: second opening should have Charlee flying and Warp Jump next: {S2.get('pilotName')} {(S2.get('turn') or {}).get('ghosts')}")
        need((S2.get("tractor") or {}).get("fly") and (S2.get("tractor") or {}).get("shipIn") == "slot" and S2.get("pilotDrawn") and not (S2.get("tractor") or {}).get("backClip"),
             f"card: Charlee did not fly the ship to the back in Tractor Beam: {(S2.get('tractor') or {}).get('shipIn')} drawn {S2.get('pilotDrawn')}")
    else:
        need(len(T) == 2 and all(t["sideSoon"] == t["to"] for t in T) and not any(t["fly"] or t["ghosts"] or t["fxDrawn"] for t in T), f"reduced: turns were not an instant swap: {[(t['sideSoon'], t['to'], t['fly'], t['ghosts']) for t in T]}")

C, P = results.get("copy") or {}, results.get("paste") or {}
if "crash" in C or "crash" in P:
    fails.append(f"move: audit crashed: {C.get('crash') or P.get('crash')}")
else:
    need(C.get("found") and C.get("aboveQuiz"), "move: Move my progress is missing or not above the quiz")
    need(re.fullmatch(r"MB\.1[zj]\.[A-Za-z0-9_-]+\.[0-9a-z]{7}", C.get("code") or "") is not None and C.get("boxShown"), f"move: Copy code gave {C.get('code')!r}")
    need(all(b["status"] and not b["asked"] for b in P.get("bad", [])) and P.get("unchangedAfterBad") and P.get("imgs") == 0, f"move: bad codes: {P.get('bad')}, unchanged {P.get('unchangedAfterBad')}")
    need(P.get("asked") and P.get("goodStatus") == "" and "loads the progress in the code" in (P.get("ask") or "") and P.get("unchangedAfterCancel") and P.get("afterCancel") == "Nothing changed.", f"move: confirm and Cancel: {P.get('ask')!r} {P.get('afterCancel')!r} status {P.get('goodStatus')!r}")
    dst = P.get("after") or {}
    need(P.get("before") is None or not (P.get("before") or {}).get("days"), "move: the paste browser was not empty to begin with")
    need(bool(dst.get("days")) and dst.get("points", 0) > 0 and len(dst["days"]) == 3, f"move: after Yes the browser holds {dst.get('points')} points over {len(dst.get('days') or {})} days")
    need(C.get("points") == dst.get("points"), f"move: points copied {C.get('points')} but loaded {dst.get('points')}")
    need(C.get("badge") == P.get("badgeAfter"), f"move: score badge after loading is {P.get('badgeAfter')!r}, expected {C.get('badge')!r}")



def png(path):
    """Pixels of a screenshot (8-bit RGB or RGBA, not interlaced) as rows of (r, g, b)."""
    d = pathlib.Path(path).read_bytes(); i, idat = 8, b""
    while i < len(d):
        n, kind = struct.unpack(">I4s", d[i:i + 8]); body = d[i + 8:i + 8 + n]; i += 12 + n
        if kind == b"IHDR":
            w, h, depth, ctype, _, _, lace = struct.unpack(">IIBBBBB", body)
        elif kind == b"IDAT":
            idat += body
    assert depth == 8 and ctype in (2, 6) and not lace, (depth, ctype, lace)
    bpp, raw, rows, prev = (3 if ctype == 2 else 4), zlib.decompress(idat), [], None
    stride = w * bpp
    for y in range(h):
        f, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        up = prev or bytearray(stride)
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0; b = up[x]; c = up[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append([tuple(line[x:x + 3]) for x in range(0, stride, bpp)]); prev = line
    return rows


# What the screen really shows (the composited screenshot, not just the canvas): every pixel of the settled code
# is pure black or pure white and every module matches qr.js, so no glow, tint, scanline or fade sits on top of it.
for n, sc in (("back-tractor", 1), ("back-warp", 1), ("back-tractor-3x", 3)):
    info = results.get("shot-" + n) or {}
    if info.get("side") != "back" or "qr" not in info:
        fails.append(f"screen {n}: the screenshot run did not settle on the back ({info})"); continue
    x0, y0, size = (float(v) * sc for v in info["qr"].split(","))
    shot, mods = png(out_dir / f"card-390-{n}.png"), Qd["size"] + 8
    # within one layout unit (1/64 of a page pixel), the finest step a browser can place a box at; the pixel check below is the proof
    need(abs(x0 - round(x0)) <= sc / 64 and abs(y0 - round(y0)) <= sc / 64 and size == int(size), f"screen {n}: the code does not sit on whole device pixels ({info['qr']} at {sc}x)")
    x0, y0 = round(x0), round(y0)
    x0, y0, size, mp = int(x0), int(y0), int(size), int(size) // mods
    impure = sum(1 for y in range(y0, y0 + size) for x in range(x0, x0 + size) if shot[y][x] not in ((0, 0, 0), (255, 255, 255)))
    wrong = sum(1 for r in range(mods) for k in range(mods)
                if (shot[y0 + r * mp + mp // 2][x0 + k * mp + mp // 2] == (0, 0, 0)) != (4 <= r < mods - 4 and 4 <= k < mods - 4 and Qd["rows"][r - 4][k - 4] == "1"))
    need(impure == 0 and wrong == 0, f"screen {n}: on screen the code has {impure} pixels that are not pure black or white and {wrong} wrong modules")
    print(f"screen {n}: code at {x0},{y0}, {size}px, {mods} modules of {mp}px; {impure} impure pixels, {wrong} wrong modules")

errs = [c for c in consoles if ERR.search(c[1])]
need(not errs, "console errors: " + json.dumps(errs, ensure_ascii=False)[:1500])
for mode in ("card", "reduced"):
    R = results.get(mode) or {}
    if "turns" in R:
        print(mode + ": " + "; ".join(f"{t['from']}->{t['to']} {'tractor' if t['fly'] else 'warp' if t['ghosts'] else 'plain'} {t['ms']}ms" for t in R["turns"]))
        q = next((t["qr"] for t in R["turns"] if t.get("qr")), None)
        if q:
            print(f"  settled QR: {q['modules']} modules of {q['modulePx']}px = {q['cssSize']}px, backing {q['backing']}px, {q['wrong']} wrong, {q['grey']} grey pixels, {q['checked']} points probed, {q['over']} covered")
if P and "after" in P:
    print(f"move: code {len(C.get('code', ''))} characters; copy status {C.get('status')!r}; loaded {P['after'].get('points')} points, badge {P.get('badgeAfter')!r}")
print(f"console lines seen: {len(consoles)}, errors: {len(errs)}")
for c in consoles:
    print("  console", c[0] + ":", c[1][:200])
print("screenshots and audit in", out_dir)
if fails:
    print("CARD FAILED"); print("\n".join("- " + f for f in fails)); sys.exit(1)
print("CARD OK: flip, QR and Move my progress at 390px, motion and reduced motion")
