"""Build the site folder: main's files plus checked briefs from another branch.

Usage (from a checkout of main): python3 -I .github/assemble.py SRC_REF OUT_DIR

Trust rule: page code comes only from main. From SRC_REF it takes only files
named briefs/YYYY-MM-DD.json. A file is accepted if it matches main's copy, or
matches the copy already published on the live site (byte for byte, or by the
source_sha256 this script wrote into it), or passes main's check.py. If the
newest brief fails, the build fails, so nothing deploys and the morning run
reports it. Older failures are skipped with a warning.

Photos: a brief may name a Wikimedia Commons file page with only page and alt.
This script asks the Commons API for that file's licence, author and image,
publishes it only if every check passes, and writes src, credit and licence
into the published copy. A photo that fails any step is left out; it never
fails a deploy.
"""
import concurrent.futures, hashlib, html, json, os, re, shutil, subprocess, sys, tempfile
import urllib.error, urllib.parse, urllib.request

SITE = "https://nyoom.uk/"
DATED = re.compile(r"^briefs/(\d{4}-\d{2}-\d{2})\.json$")
summary = []

def git(*a, text=True):
    return subprocess.run(["git", *a], capture_output=True, text=text, check=False)

def say(line):
    print(line)
    summary.append(line)

_live = {}

def published(date):
    """The live site's copy of one edition (fetched once per run), or None."""
    if date not in _live:
        try:
            with urllib.request.urlopen(SITE + "briefs/" + date + ".json", timeout=20) as r:
                _live[date] = r.read()
        except Exception:
            _live[date] = None
    return _live[date]

_parsed = {}

def live_json(date):
    if date not in _parsed:
        try:
            b = json.loads(published(date) or b"null")
        except ValueError:
            b = None
        _parsed[date] = b if isinstance(b, dict) else None
    return _parsed[date]

def sha(data):
    return hashlib.sha256(data).hexdigest()

# ---------- news photos ----------
# The routine cannot download images, so this trusted step does. It accepts
# only JPEGs from Wikimedia Commons or Unsplash (checked by their bytes),
# 1.5MB at most, and saves them beside the edition. A full-form photo that
# fails is skipped: the story shows without it and the edition still
# publishes. A Commons short-form photo (page and alt only) is looked up
# through the Commons API and is dropped from the published copy if any step
# fails, so the page and this script always number the same photos.
#
# Cache: the live site's copy of each edition already holds the resolved src,
# credit and licence of every Commons photo it published, keyed by page. Those
# are reused (after the same checks), so a deploy only asks the API about
# photos it has not published before. Image bytes are reused from the live
# site when the live copy has the same src, whatever its number there.
PHOTO_HOSTS = {"upload.wikimedia.org", "thumb.wikimedia.org", "images.unsplash.com"}
UA = {"User-Agent": "MorningBriefPublisher/1.0 (https://nyoom.uk/)"}
MAX_PHOTO = 1_500_000
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
COMMONS_PAGE = re.compile(r"^https://commons\.wikimedia\.org/wiki/(File:[^\s\"'<>?#/]+)$")
COMMONS_SRC = re.compile(r"^https://(upload|thumb)\.wikimedia\.org/wikipedia/commons/[^\s?#\"'<>]+\.jpe?g$", re.I)
COMMONS_HOSTS = {"upload.wikimedia.org", "thumb.wikimedia.org"}
# check.py's LICENCES, less the Unsplash Licence. Matched exactly: anything else is refused.
COMMONS_LICENCES = {"CC0", "Public domain", "CC BY 2.0", "CC BY 2.5", "CC BY 3.0", "CC BY 4.0",
                    "CC BY-SA 2.0", "CC BY-SA 2.5", "CC BY-SA 3.0", "CC BY-SA 4.0"}
MIN_WIDTH = 960
CREDIT_TAIL = ", Wikimedia Commons"
SOURCE_KEY = "source_sha256"


class SameHost(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlparse(newurl).hostname not in PHOTO_HOSTS:
            raise urllib.error.HTTPError(newurl, code, "redirect to another host refused", headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def grab(url, hosts):
    u = urllib.parse.urlparse(url)
    if u.scheme != "https" or u.hostname not in hosts:
        return None
    opener = urllib.request.build_opener(SameHost)
    with opener.open(urllib.request.Request(url, headers=UA), timeout=25) as r:
        data = r.read(MAX_PHOTO + 1)
    if len(data) > MAX_PHOTO or not data.startswith(b"\xff\xd8\xff"):
        return None
    return data


def commons_api(params):
    """One Commons API request. Tests replace this with a fake."""
    url = COMMONS_API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return json.loads(r.read(400_000))


def plain(s):
    """Commons metadata is HTML: keep the words only, with no em or en dashes."""
    s = html.unescape(re.sub(r"<[^>]*>", " ", str(s or "")))
    return re.sub(r"\s+", " ", s.replace("—", "-").replace("–", "-")).strip()


def short_form(ph):
    return isinstance(ph, dict) and "src" not in ph and COMMONS_PAGE.match(str(ph.get("page", ""))) is not None


def resolve(page, api=None):
    """Ask Commons about one file page. Returns {src, credit, licence}, or the reason it was refused."""
    m = COMMONS_PAGE.match(page)
    if not m:
        return "not a Commons file page"
    title = urllib.parse.unquote(m.group(1))
    data = (api or commons_api)({"action": "query", "format": "json", "formatversion": "2", "redirects": "1",
                                 "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size",
                                 "iiurlwidth": str(MIN_WIDTH), "iiextmetadatafilter": "LicenseShortName|Artist|NonFree"})
    pages = ((data or {}).get("query") or {}).get("pages") or []
    if len(pages) != 1 or pages[0].get("missing") or pages[0].get("invalid"):
        return "no such file"
    ii = (pages[0].get("imageinfo") or [{}])[0] or {}
    if ii.get("mime") != "image/jpeg":
        return f"not a JPEG ({ii.get('mime')})"
    meta = ii.get("extmetadata") or {}
    val = lambda k: plain((meta.get(k) or {}).get("value"))
    lic = val("LicenseShortName")
    if lic not in COMMONS_LICENCES:
        return f"licence not allowed ({lic or 'none'})"
    if val("NonFree").lower() in ("true", "1", "yes"):
        return "marked non-free"
    if not isinstance(ii.get("width"), int) or ii["width"] < MIN_WIDTH:
        return f"too narrow ({ii.get('width')}px)"
    u = urllib.parse.urlparse(str(ii.get("thumburl") or ""))
    src = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, "", "", ""))
    if u.hostname not in COMMONS_HOSTS or not COMMONS_SRC.match(src):
        return "image address not allowed"
    author = val("Artist") or ("Unknown author" if lic in ("CC0", "Public domain") else "")
    if not author:
        return "no author to credit"
    room = 80 - len(CREDIT_TAIL)
    if len(author) > room:
        author = author[: room - 1].rstrip(" ,;") + "…"
    return {"src": src, "credit": author + CREDIT_TAIL, "licence": lic}


def holders(o, found=None):
    """Every object holding a photo object, in the page's tagPhotos order."""
    found = [] if found is None else found
    if isinstance(o, list):
        for x in o:
            holders(x, found)
    elif isinstance(o, dict):
        if isinstance(o.get("photo"), dict):
            found.append(o)
        for k, v in o.items():
            if k != "photo":
                holders(v, found)
    return found


def numbered(b):
    """The photos the page numbers (tagPhotos counts those with a string src)."""
    return [h["photo"] for h in holders(b) if isinstance(h["photo"].get("src"), str)]


def live_cache(date):
    """Commons photos the live site already resolved for this edition, by page, re-checked."""
    b, got = live_json(date), {}
    for ph in numbered(b) if b else []:
        src, cr, lic = ph.get("src"), ph.get("credit"), ph.get("licence")
        if (COMMONS_PAGE.match(str(ph.get("page", ""))) and COMMONS_SRC.match(str(src)) and lic in COMMONS_LICENCES
                and isinstance(cr, str) and cr.endswith(CREDIT_TAIL) and len(cr) <= 80):
            got[ph["page"]] = {"src": src, "credit": cr, "licence": lic}
    return got


def photo_bytes(date, src):
    """Reuse the live site's file for this src if it published one, else fetch from the photo host."""
    b = live_json(date)
    srcs = [ph["src"] for ph in numbered(b)] if b else []
    tries = []
    if src in srcs:
        tries.append((f"{SITE}briefs/img/{date}-{srcs.index(src)}.jpg", {urllib.parse.urlparse(SITE).hostname}, "kept"))
    tries.append((src, PHOTO_HOSTS, "fetched"))
    for url, hosts, how in tries:
        try:
            data = grab(url, hosts)
        except Exception:
            data = None
        if data:
            return data, how
    return None, "skipped"


def add_photos(out_dir, keep_days=120, api=None):
    eds = []
    for f in sorted(os.listdir(os.path.join(out_dir, "briefs")), reverse=True)[: keep_days + 2]:
        m = DATED.match("briefs/" + f)
        if not m:
            continue
        path = os.path.join(out_dir, "briefs", f)
        raw = open(path, "rb").read()
        try:
            b = json.loads(raw)
        except ValueError:
            continue
        if isinstance(b, dict):
            # source_sha256 is only ever written here, from the bytes accepted above (check.py refuses it in a brief).
            eds.append({"date": m.group(1), "path": path, "raw": raw, "b": b, "new": set(), "changed": SOURCE_KEY in b})
    asked = reused = 0
    dropped = []
    # 1. Commons short-form photos: from the live copy if already published there, else from the API.
    for e in eds:
        hs = [h for h in holders(e["b"]) if short_form(h["photo"])]
        cache = live_cache(e["date"]) if hs else {}
        for h in hs:
            page = h["photo"]["page"]
            got = cache.get(page)
            if got:
                reused += 1
            else:
                asked += 1
                try:
                    got = resolve(page, api)
                except Exception as x:
                    got = f"lookup failed ({type(x).__name__})"
            e["changed"] = True
            if isinstance(got, dict):
                h["photo"].update(got)
                e["new"].add(id(h["photo"]))
            else:
                del h["photo"]
                dropped.append(f"{e['date']} {urllib.parse.unquote(page.rsplit('/', 1)[-1])}: {got}")
    # 2. Image bytes for every numbered photo.
    jobs = [(e, ph) for e in eds for ph in numbered(e["b"])]
    with concurrent.futures.ThreadPoolExecutor(6) as ex:
        res = list(ex.map(lambda j: photo_bytes(j[0]["date"], j[1]["src"]), jobs))
    got = {id(ph): r for (e, ph), r in zip(jobs, res)}
    # 3. Drop resolved Commons photos with no image, then number and save what is left.
    names = {"fetched": [], "kept": [], "skipped": []}
    for e in eds:
        for h in holders(e["b"]):
            ph = h["photo"]
            if id(ph) in e["new"] and not got[id(ph)][0]:
                del h["photo"]
                e["changed"] = True
                dropped.append(f"{e['date']} {urllib.parse.unquote(ph['page'].rsplit('/', 1)[-1])}: image could not be fetched")
        for k, ph in enumerate(numbered(e["b"])):
            data, how = got[id(ph)]
            name = f"briefs/img/{e['date']}-{k}.jpg"
            names[how].append(name)
            if data:
                dest = os.path.join(out_dir, name)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                open(dest, "wb").write(data)
        if e["changed"]:
            e["b"][SOURCE_KEY] = sha(e["raw"])
            open(e["path"], "w", encoding="utf-8").write(json.dumps(e["b"], ensure_ascii=False, indent=1))
    for kind in ("fetched", "kept", "skipped"):
        if names[kind]:
            say(f"Photos {kind}: {len(names[kind])}" + (" (" + ", ".join(names[kind][:6]) + ")" if kind != "kept" else ""))
    if asked or reused:
        say(f"Commons photos: {asked} looked up, {reused} reused from the live site")
    if dropped:
        say(f"Photos left out: {len(dropped)} (" + "; ".join(dropped[:6]) + ")")
    return dropped


# ---------- link preview ----------
# The cats take turns flying the link preview, one each day: Kimchi on even
# days of the year, Charlee on odd ones, counted from the newest published
# edition. index.html carries Kimchi as the default; this swaps the published
# copy only if every tag it expects is there, so any surprise leaves the
# default in place. It never fails a deploy.
OG_DEFAULT = "kimchi"
OG_ALT = {
    "kimchi": "Kimchi the cat pilots a neon spaceship beside the words Morning brief",
    "charlee": "Charlee the cat pilots a neon spaceship beside the words Morning brief",
}


def og_cat(date):
    """Which cat flies the link preview on this edition's date."""
    import datetime
    return "kimchi" if datetime.date.fromisoformat(date).timetuple().tm_yday % 2 == 0 else "charlee"


def set_link_preview(out_dir, date):
    """Point the published index.html's picture and alt text at the day's cat. Returns the cat."""
    path = os.path.join(out_dir, "index.html")
    s = open(path, "rb").read().decode("utf-8")
    cat = og_cat(date)
    swaps = [(f"{SITE}og/{OG_DEFAULT}.png", f"{SITE}og/{cat}.png"),
             (f'content="{OG_ALT[OG_DEFAULT]}"', f'content="{OG_ALT[cat]}"')]
    for old, _ in swaps:
        if s.count(old) != 2:
            raise ValueError(f"expected 2 of {old!r}, found {s.count(old)}")
    if cat != OG_DEFAULT:
        for old, new in swaps:
            s = s.replace(old, new)
        open(path, "wb").write(s.encode("utf-8"))
    return cat


def main(SRC, OUT):
    tracked = [p for p in git("ls-files").stdout.splitlines() if p and not p.startswith(".github/")]
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    for p in tracked:
        os.makedirs(os.path.join(OUT, os.path.dirname(p)), exist_ok=True)
        shutil.copyfile(p, os.path.join(OUT, p))

    have_src = git("rev-parse", "--verify", "-q", SRC).returncode == 0
    src_files = git("ls-tree", "-r", "--name-only", SRC).stdout.splitlines() if have_src else []
    if not have_src:
        say("No source branch yet: publishing main only.")

    ignored = []
    for p in src_files:
        if p.startswith("briefs/") and (DATED.match(p) or p == "briefs/index.json"):
            continue
        main_blob = git("rev-parse", "-q", "--verify", "HEAD:" + p).stdout.strip()
        src_blob = git("rev-parse", "-q", "--verify", SRC + ":" + p).stdout.strip()
        if main_blob != src_blob:
            ignored.append(p)
    for p in ignored:
        say("IGNORED (not a brief file, main's version used): " + p)

    dates = sorted({m.group(1) for p in src_files if (m := DATED.match(p))}, reverse=True)
    work = tempfile.mkdtemp()
    for p in tracked:
        os.makedirs(os.path.join(work, os.path.dirname(p)), exist_ok=True)
        shutil.copyfile(p, os.path.join(work, p))
    index_orig = open(os.path.join(work, "briefs", "index.json"), "rb").read()

    failed_newest = False
    for n, d in enumerate(dates):
        path = "briefs/" + d + ".json"
        blob = git("show", SRC + ":" + path, text=False).stdout
        if os.path.exists(path) and open(path, "rb").read() == blob:
            continue
        live = live_json(d)
        if published(d) == blob or (live and live.get(SOURCE_KEY) == sha(blob)):
            # Published before, unchanged since. Photos are re-resolved from the live copy by add_photos.
            open(os.path.join(OUT, path), "wb").write(blob)
            continue
        open(os.path.join(work, "briefs", "index.json"), "wb").write(index_orig)
        open(os.path.join(work, path), "wb").write(blob)
        r = subprocess.run([sys.executable, "-I", os.path.join(work, "check.py"), d], capture_output=True, text=True, timeout=180)
        os.remove(os.path.join(work, path))
        if "PASSED" in r.stdout.splitlines()[-1:]:
            open(os.path.join(OUT, path), "wb").write(blob)
            say("Checked and added: " + path)
        else:
            say("REJECTED " + path + ": " + (r.stdout + r.stderr).strip()[-600:])
            if n == 0:
                failed_newest = True

    try:
        add_photos(OUT)
    except Exception as x:
        say(f"Photos step failed ({type(x).__name__}: {x}); publishing without new photos")
    final = sorted((m.group(1) for f in os.listdir(os.path.join(OUT, "briefs")) if (m := DATED.match("briefs/" + f))), reverse=True)
    open(os.path.join(OUT, "briefs", "index.json"), "w").write(json.dumps(final))
    say("Dates published: " + ", ".join(final[:5]) + (" ..." if len(final) > 5 else ""))
    try:
        if final:
            say(f"Link preview: {set_link_preview(OUT, final[0])} for {final[0]}")
    except Exception as x:
        say(f"Link preview step failed ({type(x).__name__}: {x}); default picture kept")

    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write("\n".join("- " + s for s in summary) + "\n")
    if failed_newest:
        print("Newest brief failed its check: not publishing.")
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
