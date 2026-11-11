"""Build the site folder: main's files plus checked briefs from another branch.

Usage (from a checkout of main): python3 -I .github/assemble.py SRC_REF OUT_DIR

Trust rule: page code comes only from main. From SRC_REF it takes only files
named briefs/YYYY-MM-DD.json. A file is accepted if it matches main's copy, or
matches the copy already published on the live site, or passes main's
check.py. If the newest brief fails, the build fails, so nothing deploys and
the morning run reports it. Older failures are skipped with a warning.
"""
import json, os, re, shutil, subprocess, sys, tempfile, urllib.request

SRC, OUT = sys.argv[1], sys.argv[2]
SITE = "https://nyoom.uk/"
DATED = re.compile(r"^briefs/(\d{4}-\d{2}-\d{2})\.json$")
summary = []

def git(*a, text=True):
    return subprocess.run(["git", *a], capture_output=True, text=text, check=False)

def say(line):
    print(line)
    summary.append(line)

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

def published(date):
    try:
        with urllib.request.urlopen(SITE + "briefs/" + date + ".json", timeout=20) as r:
            return r.read()
    except Exception:
        return None

# ---------- news photos ----------
# The routine cannot download images, so this trusted step does. It accepts
# only JPEGs from Wikimedia Commons or Unsplash (checked by their bytes),
# 1.5MB at most, and saves them beside the edition. A photo that fails is
# skipped: the story shows without it and the edition still publishes.
import concurrent.futures, urllib.parse
PHOTO_HOSTS = {"upload.wikimedia.org", "thumb.wikimedia.org", "images.unsplash.com"}
UA = {"User-Agent": "MorningBriefPublisher/1.0 (https://nyoom.uk/)"}
MAX_PHOTO = 1_500_000


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


def photo_jobs(out_dir, keep_days=120):
    jobs = []
    for f in sorted(os.listdir(os.path.join(out_dir, "briefs")), reverse=True)[: keep_days + 2]:
        m = DATED.match("briefs/" + f)
        if not m:
            continue
        try:
            b = json.load(open(os.path.join(out_dir, "briefs", f), encoding="utf-8"))
        except ValueError:
            continue
        found = []

        def walk(o):
            if isinstance(o, list):
                for x in o:
                    walk(x)
            elif isinstance(o, dict):
                ph = o.get("photo")
                if isinstance(ph, dict) and isinstance(ph.get("src"), str):
                    found.append(ph["src"])
                for k, v in o.items():
                    if k != "photo":
                        walk(v)
        walk(b)
        jobs += [(m.group(1), k, u) for k, u in enumerate(found)]
    return jobs


def fetch_photo(out_dir, job):
    date, k, src = job
    name = f"briefs/img/{date}-{k}.jpg"
    site_host = urllib.parse.urlparse(SITE).hostname
    for url, hosts in ((SITE + name, {site_host}), (src, PHOTO_HOSTS)):
        try:
            data = grab(url, hosts)
        except Exception:
            data = None
        if data:
            dest = os.path.join(out_dir, name)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            open(dest, "wb").write(data)
            return name, "kept" if url.startswith(SITE) else "fetched"
    return name, "skipped"


def add_photos(out_dir):
    jobs = photo_jobs(out_dir)
    with concurrent.futures.ThreadPoolExecutor(6) as ex:
        res = list(ex.map(lambda j: fetch_photo(out_dir, j), jobs))
    for kind in ("fetched", "kept", "skipped"):
        names = [n for n, r in res if r == kind]
        if names:
            say(f"Photos {kind}: {len(names)}" + (" (" + ", ".join(names[:6]) + ")" if kind != "kept" else ""))

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
    if published(d) == blob:
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

add_photos(OUT)
final = sorted((m.group(1) for f in os.listdir(os.path.join(OUT, "briefs")) if (m := DATED.match("briefs/" + f))), reverse=True)
open(os.path.join(OUT, "briefs", "index.json"), "w").write(json.dumps(final))
say("Dates published: " + ", ".join(final[:5]) + (" ..." if len(final) > 5 else ""))

if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
        f.write("\n".join("- " + s for s in summary) + "\n")
if failed_newest:
    print("Newest brief failed its check: not publishing.")
    sys.exit(1)
