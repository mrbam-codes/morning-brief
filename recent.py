"""Print the headlines from the last 3 briefs before a date, so a run can avoid repeats.

Usage: python3 recent.py YYYY-MM-DD
Prints headlines and sources' names only, never links: addresses taken from a
file make a routine's WebFetch stall for 5 minutes waiting for approval.
"""
import json, os, sys

day = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
dates = json.load(open(os.path.join(here, "briefs", "index.json")))
earlier = sorted(d for d in dates if d < day)[-3:]
if not earlier:
    print("No earlier briefs.")
for d in reversed(earlier):
    try:
        b = json.load(open(os.path.join(here, "briefs", d + ".json")))
    except (OSError, ValueError):
        print(d + ": could not read")
        continue
    items = list(b.get("posters", [])) + list(b.get("stories", []))
    for t in b.get("themes", []):
        items += t.get("stories", [])
    items += b.get("chatter", [])
    print(d + ":")
    for s in items:
        name = (s.get("source") or s.get("original") or {}).get("name", "")
        print("- [" + s.get("tag", "") + "] " + s.get("headline", "") + (" (" + name + ")" if name else ""))
# Plan 16: build titles from the last 7 briefs, so a build is never repeated. Titles only, never links.
week = sorted(d for d in dates if d < day)[-7:]
print("Builds in the last 7 briefs (do not repeat any):")
seen_builds = 0
for d in reversed(week):
    try:
        b = json.load(open(os.path.join(here, "briefs", d + ".json")))
    except (OSError, ValueError):
        continue
    for x in b.get("builds") or []:
        if isinstance(x, dict) and x.get("what"):
            print("- " + d + ": " + str(x["what"]))
            seen_builds += 1
if not seen_builds:
    print("- none")
