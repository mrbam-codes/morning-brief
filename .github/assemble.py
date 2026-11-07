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
SITE = "https://mrbam-codes.github.io/morning-brief/"
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

final = sorted((m.group(1) for f in os.listdir(os.path.join(OUT, "briefs")) if (m := DATED.match("briefs/" + f))), reverse=True)
open(os.path.join(OUT, "briefs", "index.json"), "w").write(json.dumps(final))
say("Dates published: " + ", ".join(final[:5]) + (" ..." if len(final) > 5 else ""))

if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
        f.write("\n".join("- " + s for s in summary) + "\n")
if failed_newest:
    print("Newest brief failed its check: not publishing.")
    sys.exit(1)
