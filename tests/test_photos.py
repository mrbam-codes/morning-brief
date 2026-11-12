"""Publisher photo test (plan 21), no network. Run from the repository: python3 tests/test_photos.py

Loads .github/assemble.py as a module and replaces the Commons API, the live site and the image
download with fakes. Asserts:
- an allowed licence is published with src, credit and licence filled in, and its image saved;
- a non-commercial licence, a ported licence, a PNG, a narrow file, a missing file, an API error,
  a missing author and a failed image download each drop the photo, and the deploy carries on;
- a full-form (Unsplash) photo is untouched, and the fun fact photo goes the same way as a story's;
- numbering after drops: image k is the k-th photo the page's own tagPhotos numbers (run in node);
- the published copy carries source_sha256 of the accepted bytes, and a brief's own value is overwritten;
- a second deploy reuses the live copy (no API call) and reuses each live image by its src even when
  its number has changed;
- main(): a brief whose sha256 matches the live copy's source_sha256 is accepted without check.py,
  and the same brief with no match is checked (and refused).
Prints PHOTOS OK or the misses.
"""
import hashlib, importlib.util, json, os, pathlib, re, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("assemble", ROOT / ".github" / "assemble.py")
A = importlib.util.module_from_spec(spec)
spec.loader.exec_module(A)
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


C = "https://commons.wikimedia.org/wiki/File:"
THUMB = "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/{0}/960px-{0}?utm_source=commons.wikimedia.org"
LONG = "A very long author name " * 6


def info(name, lic="CC BY-SA 4.0", mime="image/jpeg", width=4000, artist='<a href="//commons.wikimedia.org/wiki/User:T">Test Author</a>'):
    meta = {"LicenseShortName": {"value": lic}}
    if artist is not None:
        meta["Artist"] = {"value": artist}
    return {"query": {"pages": [{"ns": 6, "title": "File:" + name, "imageinfo": [
        {"mime": mime, "width": width, "thumburl": THUMB.format(name), "extmetadata": meta}]}]}}


FILES = {
    "Good_one.jpg": info("Good_one.jpg"),
    "Non_commercial.jpg": info("Non_commercial.jpg", lic="CC BY-NC-SA 4.0"),
    "Ported.jpg": info("Ported.jpg", lic="CC BY-SA 3.0 de"),
    "Drawing.png": info("Drawing.png", mime="image/png"),
    "Narrow.jpg": info("Narrow.jpg", width=640),
    "Nobody.jpg": info("Nobody.jpg", artist=None),
    "Old_portrait.jpg": info("Old_portrait.jpg", lic="Public domain", artist=None),
    "Long_author.jpg": info("Long_author.jpg", artist="<span>" + LONG + "&amp; friends</span>"),
    "No_download.jpg": info("No_download.jpg"),
    "Fact_photo.jpg": info("Fact_photo.jpg", lic="CC BY 4.0", artist="Ada <b>Example</b>"),
}
calls = []


def fake_api(params):
    t = params["titles"].replace(" ", "_")[5:]
    calls.append(t)
    if t == "Api_error.jpg":
        raise OSError("fake API down")
    return FILES.get(t) or {"query": {"pages": [{"ns": 6, "title": "File:" + t, "missing": True}]}}


LIVE = {}


def fake_grab(url, hosts):
    host = re.match(r"https://([^/]+)", url).group(1)
    if host not in hosts:
        return None
    if host == "nyoom.uk":
        return LIVE.get(url)
    if "No_download" in url:
        raise OSError("fake download failure")
    return b"\xff\xd8\xff" + url.encode()


A.grab = fake_grab
A.published = lambda d: LIVE.get(f"brief:{d}")


def story(i, photo=None):
    s = {"tag": "AI", "headline": f"Story {i}", "summary": "x", "soWhat": "x", "source": {"name": "x", "url": "https://example.org", "date": "20 Nov"}}
    if photo is not None:
        s["photo"] = photo
    return s


short = lambda name: {"page": C + name, "alt": "Test photo of " + name}
UNSPLASH = {"src": "https://images.unsplash.com/photo-1?w=960&q=70&fm=jpg", "page": "https://unsplash.com/photos/abc",
            "credit": "Test, Unsplash", "licence": "Unsplash Licence", "alt": "Test ship."}
order = ["Good_one.jpg", "Non_commercial.jpg", "Ported.jpg", "Drawing.png", "Narrow.jpg", "Missing.jpg", "Api_error.jpg",
         "Nobody.jpg", "No_download.jpg", "Old_portrait.jpg", "Long_author.jpg"]
DATE = "2026-11-20"
brief = {"date": DATE, "posters": [story(0, short("Good_one.jpg"))],
         "stories": [story(i + 1, short(n)) for i, n in enumerate(order[1:])] + [story(99, dict(UNSPLASH))],
         "fact": {"text": "x", "source": {"name": "x", "url": "https://example.org"}, "photo": short("Fact_photo.jpg")},
         "builds": [{"what": "x", "photo": short("Missing.jpg")}],
         "source_sha256": "f" * 64}
raw = json.dumps(brief, ensure_ascii=False).encode()


def stage(b_bytes):
    out = pathlib.Path(tempfile.mkdtemp())
    (out / "briefs").mkdir()
    (out / "briefs" / f"{DATE}.json").write_bytes(b_bytes)
    (out / "briefs" / "index.json").write_text("[]")
    return out


def tag_photos(path):
    """The page's own tagPhotos, run in node on the published copy: returns the src of each numbered photo."""
    idx = (ROOT / "index.html").read_text(encoding="utf-8")
    fn = re.search(r"^function tagPhotos\(b\)\{.*$", idx, re.M).group(0)
    js = fn + ";const b=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));tagPhotos(b);const r=[];" \
         "const w=o=>{if(Array.isArray(o))o.forEach(w);else if(o&&typeof o==='object'){if(o._pk!=null)r[o._pk]=o.photo.src;Object.keys(o).forEach(k=>{if(k!=='photo')w(o[k])})}};w(b);console.log(JSON.stringify(r))"
    return json.loads(subprocess.run(["node", "-e", js, str(path)], capture_output=True, text=True, check=True).stdout)


# ---------- first deploy: nothing on the live site yet ----------
out = stage(raw)
dropped = A.add_photos(str(out), api=fake_api)
pub = json.loads((out / "briefs" / f"{DATE}.json").read_text(encoding="utf-8"))
items = pub["posters"] + pub["stories"]
good = items[0].get("photo") or {}
need(good.get("src") == "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Good_one.jpg/960px-Good_one.jpg"
     and good.get("credit") == "Test Author, Wikimedia Commons" and good.get("licence") == "CC BY-SA 4.0"
     and good.get("page") == C + "Good_one.jpg" and good.get("alt"), f"an allowed licence is published with src (no query), credit and licence ({good})")
names = {s["headline"]: s for s in items}
by = {n: names[f"Story {i + 1}"] for i, n in enumerate(order[1:])}
for i, n in enumerate(order[1:]):
    s = names[f"Story {i + 1}"]
    want_kept = n in ("Old_portrait.jpg", "Long_author.jpg")
    need(("photo" in s) == want_kept, f"{n}: {'published' if want_kept else 'dropped'} ({s.get('photo', {}).get('licence', 'no photo')})")
need(by["Old_portrait.jpg"]["photo"]["credit"] == "Unknown author, Wikimedia Commons", "a public domain file with no author is credited to Unknown author")
cr = by["Long_author.jpg"]["photo"]["credit"]
need(len(cr) <= 80 and cr.endswith(", Wikimedia Commons") and "<" not in cr and "&amp;" not in cr, f"a long HTML author is stripped and cut to 80 characters ({cr!r}, {len(cr)})")
need(names["Story 99"]["photo"] == UNSPLASH, "a full-form Unsplash photo is untouched")
fp = pub["fact"].get("photo") or {}
need(fp.get("credit") == "Ada Example, Wikimedia Commons" and fp.get("licence") == "CC BY 4.0" and fp.get("src", "").endswith("960px-Fact_photo.jpg"), f"the fun fact photo is resolved the same way ({fp})")
need("photo" not in pub["builds"][0], "a missing Commons file on a build is dropped")
reasons = " | ".join(dropped)
for frag in ("licence not allowed (CC BY-NC-SA 4.0)", "licence not allowed (CC BY-SA 3.0 de)", "not a JPEG (image/png)", "too narrow (640px)",
             "no such file", "lookup failed (OSError)", "no author to credit", "image could not be fetched"):
    need(frag in reasons, f"the deploy summary gives the reason: {frag}")
need(pub["source_sha256"] == hashlib.sha256(raw).hexdigest(), "the published copy carries source_sha256 of the accepted bytes, not the brief's own value")
srcs = tag_photos(out / "briefs" / f"{DATE}.json")
saved = sorted(p.name for p in (out / "briefs" / "img").iterdir())
need(saved == [f"{DATE}-{k}.jpg" for k in range(len(srcs))], f"one image per numbered photo, numbered from 0 with no gaps ({saved}, {len(srcs)} numbered)")
need(all((out / "briefs" / "img" / f"{DATE}-{k}.jpg").read_bytes() == b"\xff\xd8\xff" + s.encode() for k, s in enumerate(srcs)),
     "image k is the k-th photo the page's tagPhotos numbers, after the drops")
need(len(srcs) == 5, f"5 photos survive: good, public domain, long author, Unsplash, fun fact ({len(srcs)})")
first_calls = len(calls)

# ---------- second deploy: the live site holds the first deploy's output ----------
LIVE[f"brief:{DATE}"] = (out / "briefs" / f"{DATE}.json").read_bytes()
for p in (out / "briefs" / "img").iterdir():
    LIVE[f"https://nyoom.uk/briefs/img/{p.name}"] = b"\xff\xd8\xffLIVE" + p.name.encode()
live_srcs = srcs
# the writer removed the first story's photo since, so every later photo moves up one number
b2 = json.loads(raw)
del b2["posters"][0]["photo"]
raw2 = json.dumps(b2, ensure_ascii=False).encode()
out2 = stage(raw2)
calls.clear()
A._parsed.clear()
A.add_photos(str(out2), api=fake_api)
pub2 = json.loads((out2 / "briefs" / f"{DATE}.json").read_text(encoding="utf-8"))
need(set(calls) == set(order[1:]) - {"Old_portrait.jpg", "Long_author.jpg"} | {"Missing.jpg"},
     f"the API is asked only about photos the live copy has not published ({sorted(set(calls))})")
need(not any(c in calls for c in ("Old_portrait.jpg", "Long_author.jpg", "Fact_photo.jpg")), "published Commons photos are reused, not looked up again")
srcs2 = tag_photos(out2 / "briefs" / f"{DATE}.json")
need(len(srcs2) == 4, f"4 photos now ({len(srcs2)})")
ok = all((out2 / "briefs" / "img" / f"{DATE}-{k}.jpg").read_bytes() == b"\xff\xd8\xffLIVE" + f"{DATE}-{live_srcs.index(s)}.jpg".encode() for k, s in enumerate(srcs2))
need(ok, "each image is reused from the live file holding the same src, not the live file with the same number")
need(pub2["fact"]["photo"] == pub["fact"]["photo"], "the reused fun fact photo matches the first deploy")

# ---------- main(): the source_sha256 trust path ----------
repo = pathlib.Path(tempfile.mkdtemp())
tracked = subprocess.run(["git", "-C", str(ROOT), "ls-files"], capture_output=True, text=True, check=True).stdout.split()
for p in tracked:
    if (ROOT / p).is_file():
        (repo / p).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / p, repo / p)
g = lambda *a: subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@example.org", *a], capture_output=True, text=True, check=True)
g("init", "-q", "-b", "main"); g("add", "-A"); g("commit", "-q", "-m", "main")
g("checkout", "-q", "-b", "src")
JUNK = "2099-01-01"   # newest, and fails check.py (it is no real brief)
(repo / "briefs" / f"{JUNK}.json").write_text(json.dumps({"date": JUNK, "fact": {"photo": short("Good_one.jpg")}}))
g("add", "-A"); g("commit", "-q", "-m", "src"); g("checkout", "-q", "main")
blob = (subprocess.run(["git", "-C", str(repo), "show", f"src:briefs/{JUNK}.json"], capture_output=True, check=True).stdout)
here = os.getcwd()


def run_main(live):
    A.summary.clear(); A._parsed.clear(); LIVE.clear(); calls.clear()
    if live is not None:
        LIVE[f"brief:{JUNK}"] = json.dumps(live).encode()
    site = repo / "_site"
    os.chdir(repo)
    try:
        A.main("src", str(site))
        code = 0
    except SystemExit as x:
        code = x.code
    finally:
        os.chdir(here)
    return code, site, list(A.summary)


A.commons_api = fake_api
code, site, said = run_main({"date": JUNK, "source_sha256": hashlib.sha256(blob).hexdigest()})
need(code == 0 and (site / "briefs" / f"{JUNK}.json").exists() and not any("Checked" in s or "REJECTED" in s for s in said),
     f"a brief matching the live copy's source_sha256 is accepted without a fresh check ({code}, {said[:3]})")
pj = json.loads((site / "briefs" / f"{JUNK}.json").read_text())
need(pj["fact"].get("photo", {}).get("licence") == "CC BY-SA 4.0" and "Good_one.jpg" in calls, "and its photo is resolved on the way out")
code, site, said = run_main({"date": JUNK, "source_sha256": "0" * 64})
need(code == 1 and any(s.startswith(f"REJECTED briefs/{JUNK}.json") for s in said), f"with no match the brief is checked, and refused ({code})")
code, site, said = run_main(None)
need(code == 1, "with no live copy the brief is checked, and refused")
print("PHOTOS OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
