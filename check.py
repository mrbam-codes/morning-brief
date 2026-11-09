#!/usr/bin/env python3
"""Check one brief before it is published. Usage: python3 check.py 2026-11-07

Stops with a list of problems if the brief would break the page. If it passes,
adds the date to briefs/index.json. Chrome is used to prove the page renders.
"""
import datetime
import functools
import http.server
import json
import pathlib
import shutil
import subprocess
import sys
import threading
from xml.etree import ElementTree
import re
ET = ElementTree

ROOT = pathlib.Path(__file__).parent.resolve()
TAGS = {"AI", "Tech", "Cyber"}
LIMITS = {"verdict": 90, "big": 7, "poster_headline": 34, "card_headline": 70,
          "summary": 170, "soWhat": 90, "title": 42, "idea": 150, "step": 90}
problems = []


def need(cond, msg):
    if not cond:
        problems.append(msg)


def text(where, value, limit=None):
    need(isinstance(value, str) and value.strip(), f"{where}: missing text")
    if isinstance(value, str):
        need("—" not in value, f"{where}: contains an em dash")
        if limit:
            need(len(value) <= limit, f"{where}: {len(value)} characters, limit {limit}")


PHOTO_SRC = re.compile(r"^https://(upload|thumb)\.wikimedia\.org/wikipedia/commons/[^\s?#\"'<>]+\.jpe?g$|^https://images\.unsplash\.com/photo-[A-Za-z0-9-]+\?[^\s#\"'<>]*fm=jpg[^\s#\"'<>]*$", re.I)
PHOTO_PAGE = re.compile(r"^https://commons\.wikimedia\.org/wiki/File:[^\s\"'<>]+$|^https://unsplash\.com/photos/[^\s\"'<>]+$")
LICENCES = {"CC0", "Public domain", "CC BY 2.0", "CC BY 2.5", "CC BY 3.0", "CC BY 4.0",
            "CC BY-SA 2.0", "CC BY-SA 2.5", "CC BY-SA 3.0", "CC BY-SA 4.0", "Unsplash Licence"}


def media(where, s):
    ph = s.get("photo")
    if ph is not None:
        src, page, lic = str(ph.get("src", "")), str(ph.get("page", "")), ph.get("licence")
        need(PHOTO_SRC.match(src) is not None, f"{where} photo: src must be a .jpg on upload.wikimedia.org or thumb.wikimedia.org, or an images.unsplash.com photo with fm=jpg")
        need(PHOTO_PAGE.match(page) is not None, f"{where} photo: page must be the photo's own Commons file page or unsplash.com/photos page")
        need(lic in LICENCES, f"{where} photo: licence must be one of {sorted(LICENCES)}")
        need(("unsplash.com" in src) == (lic == "Unsplash Licence") == ("unsplash.com" in page), f"{where} photo: Unsplash photos use the Unsplash Licence; Commons photos use their Commons licence")
        text(f"{where} photo credit", ph.get("credit"), 80)
        text(f"{where} photo alt", ph.get("alt"), 200)
    fg = s.get("figure")
    if fg is not None:
        text(f"{where} figure value", fg.get("value"), 10)
        text(f"{where} figure label", fg.get("label"), 30)
    d = s.get("drawing")
    if d is not None:
        low = str(d).lower()
        need(str(d).lstrip().startswith("<svg") and 'xmlns="http://www.w3.org/2000/svg"' in str(d), f"{where} drawing: must be one inline svg with the svg xmlns")
        for bad in ("<script", "<image", "<foreignobject", "<use", "href", "javascript:", "data:"):
            need(bad not in low, f"{where} drawing: must not contain {bad}")
        need(low.count("http") == low.count("http://www.w3.org/2000/svg"), f"{where} drawing: no web addresses")
        try:
            root = ET.fromstring(d)
            need(sum(1 for e in root.iter() if e.tag.endswith("text") and (e.text or "").strip()) >= 3, f"{where} drawing: needs at least 3 text labels")
            for e in root.iter():
                fs = e.get("font-size")
                if fs:
                    need(re.fullmatch(r"\d+(\.\d+)?(px)?", fs.strip()) is not None and float(re.sub("px", "", fs)) >= 11, f"{where} drawing: font-size {fs} is below 11")
        except ET.ParseError:
            need(False, f"{where} drawing: not valid SVG")
        text(f"{where} drawingAlt", s.get("drawingAlt"), 200)


# Rules added on 9 Nov 2026 (source age, no repeats, Sunday cap, recap count)
# apply from that edition on, so older published briefs are never re-judged
# by them and dropped from the site.
NEW_RULES = "2026-11-09"
MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}
EDITION = {}


def fresh(where, value):
    """A story's source must be from the last 2 days (8 on Sunday, which covers the week)."""
    day = EDITION.get("day")
    if not day or day.isoformat() < NEW_RULES:
        return
    m = re.fullmatch(r"\s*(\d{1,2}) ([A-Za-z]{3})[a-z]*\.?(?: (\d{4}))?\s*", str(value or ""))
    if not day or not m or m.group(2).lower() not in MONTHS:
        need(False, f"{where}: source date must look like 8 Nov 2026")
        return
    try:
        y = int(m.group(3) or day.year)
        d = datetime.date(y, MONTHS[m.group(2).lower()], int(m.group(1)))
        if not m.group(3) and d > day + datetime.timedelta(days=1):
            d = d.replace(year=y - 1)
    except ValueError:
        need(False, f"{where}: source date {value!r} is not a real date")
        return
    limit = 8 if day.weekday() == 6 else 2
    need(-1 <= (day - d).days <= limit, f"{where}: source is dated {value}, more than {limit} days before this brief")


def all_stories(b):
    items = list(b.get("posters") or []) + list(b.get("stories") or [])
    for t in b.get("themes") or []:
        items += t.get("stories") or []
    return items


def norm(h):
    return re.sub(r"[^a-z0-9]+", " ", str(h).lower()).strip()


def story(where, s, poster):
    need(s.get("tag") in TAGS, f"{where}: tag must be AI, Tech or Cyber")
    text(f"{where} headline", s.get("headline"),
         LIMITS["poster_headline" if poster else "card_headline"])
    text(f"{where} summary", s.get("summary"), LIMITS["summary"])
    text(f"{where} soWhat", s.get("soWhat"), LIMITS["soWhat"])
    need(str(s.get("soWhat", "")).split(":")[0] in {"Work", "Build", "Curious"},
         f"{where}: soWhat must start with Work:, Build: or Curious:")
    src = s.get("source") or {}
    text(f"{where} source name", src.get("name"))
    text(f"{where} source date", src.get("date"))
    fresh(where, src.get("date"))
    need(str(src.get("url", "")).startswith("https://"), f"{where}: source url must be https")
    r = s.get("read") or {}
    need(isinstance(r, dict) and r, f"{where}: needs a read with what, how, why and take")
    for k in ("what", "how", "why", "take"):
        text(f"{where} read.{k}", r.get(k), 700)
    media(where, s)
    if poster and s.get("big"):
        need(len(str(s.get("headline", "")).split()) >= 3, f"{where}: headline must say what happened in at least 3 words")
        text(f"{where} big", s["big"], LIMITS["big"])


# ---------- the 577-lesson course (editions from 16 Nov 2026) ----------
COURSE_START = "2026-11-16"
_COURSE = {}


def course():
    if not _COURSE:
        _COURSE.update(json.loads((ROOT / "course.json").read_text(encoding="utf-8")))
    return _COURSE


def course_day(date):
    return next((d for d in course().get("days", []) if d["date"] == date), None)


SVG_BAD = ("<script", "<image", "<foreignobject", "<use", "<a ", "<a>", "href", "javascript:", "data:", "<style", "@import", "url(")


def diagram(where, d):
    """A lesson diagram: one safe inline svg whose labels are readable and fit inside it."""
    if not isinstance(d, dict):
        need(False, f"{where}: needs a diagram with alt and svg")
        return
    text(f"{where} diagram alt", d.get("alt"), 300)
    svg = str(d.get("svg", ""))
    low = svg.lower()
    need(svg.lstrip().startswith("<svg") and 'xmlns="http://www.w3.org/2000/svg"' in svg, f"{where} diagram: must be one inline svg with the svg xmlns")
    for bad in SVG_BAD:
        need(bad not in low, f"{where} diagram: must not contain {bad.strip()}")
    need(low.count("http") == low.count("http://www.w3.org/2000/svg"), f"{where} diagram: no web addresses")
    need(len(svg) <= 12000, f"{where} diagram: {len(svg)} characters, limit 12000")
    try:
        root = ET.fromstring(svg)
    except ET.ParseError:
        need(False, f"{where} diagram: not valid SVG")
        return
    vb = (root.get("viewBox") or "").replace(",", " ").split()
    try:
        x0, y0, W, H = map(float, vb)
    except ValueError:
        need(False, f"{where} diagram: needs a viewBox of four numbers")
        return
    need(W == 320, f"{where} diagram: viewBox must be 320 wide")
    need(160 <= H <= 420, f"{where} diagram: viewBox height must be 160 to 420")
    shapes = sum(1 for e in root.iter() if e.tag.split("}")[-1] in {"rect", "circle", "ellipse", "line", "path", "polyline", "polygon"})
    need(shapes >= 3, f"{where} diagram: needs at least 3 shapes, so it shows a mechanism")
    labels = 0
    parents = {c: p for p in root.iter() for c in p}

    def inherited(e, k):
        while e is not None:
            if e.get(k):
                return e.get(k)
            e = parents.get(e)
        return None

    def moved(e):
        while e is not None:
            if e.get("transform"):
                return True
            e = parents.get(e)
        return False

    for e in root.iter():
        if e.tag.split("}")[-1] != "text":
            continue
        words = "".join(e.itertext()).strip()
        if not words:
            continue
        labels += 1
        fs = inherited(e, "font-size") or "16"
        if re.fullmatch(r"\d+(\.\d+)?(px)?", fs.strip()) is None:
            need(False, f"{where} diagram: font-size {fs!r} must be a plain number")
            continue
        size = float(fs.replace("px", ""))
        need(size >= 14, f"{where} diagram: label {words[:30]!r} is {fs}, below 14")
        try:
            x = float(e.get("x", "0").split()[0])
        except ValueError:
            continue
        if moved(e):
            continue
        w = len(words) * 0.55 * size
        anchor = inherited(e, "text-anchor") or "start"
        left = x - w / 2 if anchor == "middle" else x - w if anchor == "end" else x
        need(left >= x0 - 2 and left + w <= x0 + W + 2, f"{where} diagram: label {words[:30]!r} runs outside the 320 width (about {w:.0f} wide at x {x:g})")
    need(labels >= 3, f"{where} diagram: needs at least 3 text labels")


def check_learn(b, day, date):
    cd = course_day(date)
    need(cd is not None, f"no course day in course.json for {date}")
    if cd is None:
        return
    need("lesson" not in b, "from 16 Nov use lessons (a list), not lesson")
    want = cd["lessons"]
    got = b.get("lessons") or []
    need([l.get("n") for l in got] == [l["n"] for l in want],
         f"lessons must be today's from course.json, in order: {[l['n'] for l in want]}, got {[l.get('n') for l in got]}")
    for i, (l, c) in enumerate(zip(got, want)):
        w = f"lesson {c['n']}"
        need(l.get("title") == c["title"], f"{w}: title must be exactly {c['title']!r}")
        need(l.get("tag") == c["tag"], f"{w}: tag must be {c['tag']}")
        text(f"{w} idea", l.get("idea"), 160)
        for k in ("analogy", "breaks", "why"):
            text(f"{w} {k}", l.get(k), 500)
        steps = l.get("steps") or []
        need(3 <= len(steps) <= 6, f"{w}: needs 3 to 6 steps")
        for j, s in enumerate(steps):
            text(f"{w} step {j + 1}", s, 110)
        need("diagrams" not in l, f"{w}: use one diagram, not diagrams")
        diagram(w, l.get("diagram"))
        if c.get("verify"):
            v = l.get("verified") or {}
            need(isinstance(v, dict) and v, f"{w}: course.json says {c['verify']!r}. Add verified with what you did and the source you checked")
            if isinstance(v, dict) and v:
                text(f"{w} verified note", v.get("note"), 300)
                src = v.get("source") or {}
                text(f"{w} verified source name", src.get("name"))
                need(str(src.get("url", "")).startswith("https://"), f"{w}: verified source url must be https")
    fact = b.get("fact") or {}
    text("fact text", fact.get("text"), 260)
    fs = fact.get("source") or {}
    text("fact source name", fs.get("name"))
    need(str(fs.get("url", "")).startswith("https://"), "fact: source url must be https")
    if cd.get("try"):
        t = b.get("try") or {}
        need(t.get("title") == cd["try"][0]["title"], f"try: today is a Try it day. title must be exactly {cd['try'][0]['title']!r}")
        text("try task", t.get("task"), 300)
        st = t.get("steps") or []
        need(3 <= len(st) <= 6, "try: needs 3 to 6 steps")
        for j, s in enumerate(st):
            text(f"try step {j + 1}", s, 160)
    else:
        need("try" not in b, "try: only on the Try it days in course.json")
    # Quiz: one question per lesson, plus 2 reviews of earlier lessons (2 news questions on day 1).
    quiz = b.get("quiz") or []
    n_today = [c["n"] for c in want]
    need(len(quiz) == len(want) + 2, f"quiz needs {len(want) + 2} questions: one per lesson plus 2 reviews")
    kinds = [q.get("kind") for q in quiz]
    need(sorted(q.get("n") for q in quiz if q.get("kind") == "lesson") == n_today, f"quiz: exactly one lesson question for each of lessons {n_today}")
    first_day = n_today[0] == 1
    extra = "news" if first_day else "review"
    need(kinds.count(extra) == 2 and kinds.count("lesson") == len(want), f"quiz kinds: {len(want)} lesson and 2 {extra}")
    titles = {l["n"]: l["title"] for d in course()["days"] for l in d["lessons"]}
    for i, q in enumerate(quiz):
        w = f"quiz {i + 1}"
        need(q.get("kind") in {"lesson", "review", "news"}, f"{w}: kind must be lesson, review or news")
        need(q.get("tag") in TAGS, f"{w}: tag")
        text(f"{w} question", q.get("q"), 150)
        opts = q.get("options") or []
        need(len(opts) == 4 and len(set(opts)) == 4, f"{w}: needs 4 different options")
        for o in opts:
            text(f"{w} option", o, 80)
        need(isinstance(q.get("answer"), int) and 0 <= q["answer"] <= 3, f"{w}: answer must be 0 to 3")
        text(f"{w} why", q.get("why"), 190)
        if q.get("kind") == "review":
            need(isinstance(q.get("n"), int) and 1 <= q["n"] < n_today[0], f"{w}: review n must be an earlier course lesson (1 to {n_today[0] - 1})")
            need(q.get("title") == titles.get(q.get("n")), f"{w}: review title must be lesson {q.get('n')}'s title from course.json")
    need(len({q.get("answer") for q in quiz}) > 1, "quiz answers must not all be the same position")


def check_v1_lesson(b, day, date):
    """The 90-lesson course (editions before 16 Nov 2026)."""
    l = b.get("lesson") or {}
    need(l.get("n") == (day - datetime.date(2026, 11, 7)).days % 90 + 1, "lesson number is wrong for this date")
    need(l.get("tag") in TAGS, "lesson tag")
    text("lesson title", l.get("title"), LIMITS["title"])
    text("lesson idea", l.get("idea"), LIMITS["idea"])
    for k in ("analogy", "breaks", "why"):
        text(f"lesson {k}", l.get(k))
    need(3 <= len(l.get("steps") or []) <= 6, "lesson needs 3 to 6 steps")
    for i, s in enumerate(l.get("steps") or []):
        text(f"lesson step {i + 1}", s, LIMITS["step"])
    need(l.get("diagrams"), "lesson needs a diagram")
    for d in l.get("diagrams") or []:
        text("diagram alt", d.get("alt"))
        svg = d.get("svg", "")
        need(svg.lstrip().startswith("<svg") and 'xmlns="http://www.w3.org/2000/svg"' in svg
             and "viewBox" in svg, "diagram must be an svg with xmlns and viewBox")
        need("<script" not in svg.lower(), "diagram must not contain script")
        try:
            root = ElementTree.fromstring(svg)
            need(len(list(root)) >= 3, "diagram looks empty")
            need(not any(k.endswith("href") for e in root.iter() for k in e.attrib)
                 and not any(e.tag.endswith("image") for e in root.iter()), "diagram must not load anything from outside")
        except ElementTree.ParseError:
            need(False, "diagram is not valid SVG")
    quiz = l.get("quiz") or []
    need(len(quiz) == 5, "lesson needs exactly 5 quiz questions")
    kinds = [q.get("kind") for q in quiz]
    need(kinds.count("news") == 1, "quiz needs exactly 1 news question")
    first = date == "2026-11-07"
    need(kinds.count("lesson") == (1 if b.get("type") == "sunday" else (4 if first else 2)),
         "quiz lesson questions: Sunday 1, daily 2 (4 on the first day, with no recap)")
    need(date < NEW_RULES or kinds.count("recap") == (0 if first else 3 if b.get("type") == "sunday" else 2),
         "quiz recap questions: Sunday 3, daily 2 (none on the first day)")
    for i, q in enumerate(quiz):
        w = f"quiz {i + 1}"
        need(q.get("kind") in {"lesson", "recap", "news"}, f"{w}: kind must be lesson, recap or news")
        need(q.get("tag") in TAGS, f"{w}: tag")
        text(f"{w} question", q.get("q"), 150)
        opts = q.get("options") or []
        need(len(opts) == 4 and len(set(opts)) == 4, f"{w}: needs 4 different options")
        for o in opts:
            text(f"{w} option", o, 80)
        need(isinstance(q.get("answer"), int) and 0 <= q["answer"] <= 3, f"{w}: answer must be 0 to 3")
        text(f"{w} why", q.get("why"), 190)
        if q.get("kind") in {"lesson", "recap"}:
            need(isinstance(q.get("n"), int) and 1 <= q["n"] <= 90, f"{w}: n must be a lesson number")
        if q.get("kind") == "lesson":
            need(q.get("n") == l.get("n"), f"{w}: lesson question n must be today's lesson")
        if q.get("kind") == "recap":
            need(q.get("n") != l.get("n"), f"{w}: recap must be an earlier lesson")
    answers = [q.get("answer") for q in quiz]
    need(len(set(answers)) > 1, "quiz answers must not all be the same position")


def check(date):
    b = json.loads((ROOT / "briefs" / f"{date}.json").read_text())
    need(b.get("date") == date, "date does not match the filename")
    need("sample" not in b, "remove the sample flag")
    text("dayLabel", b.get("dayLabel"))
    day = datetime.date.fromisoformat(date)
    EDITION["day"] = day
    need(b.get("dayLabel") == f"{day:%A} {day.day} {day:%B %Y}", "dayLabel does not match the date")
    sunday = day.weekday() == 6
    need(b.get("type") == ("sunday" if sunday else "daily"), "type must match the day of the week")
    need(bool(b.get("themes")) == sunday, "themes are required on Sunday and only on Sunday")
    text("verdict", b.get("verdict"), LIMITS["verdict"])
    posters, stories = b.get("posters") or [], list(b.get("stories") or [])
    need(1 <= len(posters) <= 3, "use 1 to 3 posters")
    themes = b.get("themes")
    if themes:
        need(len(themes) == 3, "Sunday needs 3 themes")
        for t in themes:
            text("theme title", t.get("title"), 40)
            stories += t.get("stories") or []
    for i, s in enumerate(posters):
        story(f"poster {i + 1}", s, True)
    for i, s in enumerate(stories):
        story(f"story {i + 1}", s, False)
    tags = {s.get("tag") for s in posters + stories}
    if tags != TAGS:
        print(f"NOTE: no story today for {sorted(TAGS - tags)}. Say so in the verdict.")
    total = len(posters) + len(stories)
    new = date >= NEW_RULES
    need(total <= (10 if sunday and new else 12 if sunday else 7), f"{total} stories is too many for this day (Sunday 10, other days 7)")
    # No repeats (BRIEF.md step 0): the same headline or the same article as one
    # of the last 3 briefs. Sunday themes may revisit a story with what is new,
    # so on Sunday only the posters are held to the article rule.
    try:
        earlier = sorted(d for d in json.loads((ROOT / "briefs" / "index.json").read_text()) if d < date)[-3:] if new else []
    except (OSError, ValueError):
        earlier = []
    seen_heads, seen_urls = {}, {}
    for d in earlier:
        try:
            old_b = json.loads((ROOT / "briefs" / f"{d}.json").read_text())
        except (OSError, ValueError):
            continue
        for s in all_stories(old_b):
            seen_heads.setdefault(norm(s.get("headline")), d)
            seen_urls.setdefault(str((s.get("source") or {}).get("url", "")).rstrip("/"), d)
    for i, s in enumerate(all_stories(b)):
        h, u = norm(s.get("headline")), str((s.get("source") or {}).get("url", "")).rstrip("/")
        need(h not in seen_heads, f"story {i + 1}: same headline as the {seen_heads.get(h)} brief. Leave it out, or say what is new")
        if not sunday or i < len(posters):
            need(not u or u not in seen_urls, f"story {i + 1}: same article as the {seen_urls.get(u)} brief. Leave it out unless there is a new development with its own source")
    heads = [str(s.get("headline", "")).strip().lower() for s in posters + stories]
    need(len(heads) == len(set(heads)), "two stories have the same headline")
    if date >= COURSE_START:
        check_learn(b, day, date)
    else:
        check_v1_lesson(b, day, date)
    terms = b.get("terms") or []
    hi = 8 if date >= COURSE_START else 6
    need(3 <= len(terms) <= hi, f"terms: 3 to {hi} glossary terms")
    for t in terms:
        text("term", t.get("term"), 40)
        text("term meaning", t.get("plain"), 150)
    bd = b.get("build")
    # From 16 Nov a Try it day may leave out the build idea: the exercise takes its place.
    if bd is not None or not (date >= COURSE_START and (course_day(date) or {}).get("try")):
        bd = bd or {}
        text("build title", bd.get("title"), 50)
        text("build idea", bd.get("idea"), 230)
        text("build first", bd.get("first"), 230)
    chatter = b.get("chatter") or []
    need(len(chatter) <= 8, "chatter: at most 8 items")
    need(sum(1 for x in chatter if x.get("via") != "X") <= 3, "chatter: at most 3 forum items")
    for x in chatter:
        if x.get("via") == "X":
            need(x.get("group") in {"Company", "Independent"}, "X item: group must be Company or Independent")
            need(str(x.get("handle", "")).startswith("@"), "X item: handle must start with @")
            need(str((x.get("thread") or {}).get("url", "")).startswith("https://x.com/"), "X item: thread url must be on x.com")
    for i, x in enumerate(chatter):
        w = f"chatter {i + 1}"
        need(x.get("tag") in TAGS, f"{w}: tag")
        text(f"{w} headline", x.get("headline"), 70)
        text(f"{w} summary", x.get("summary"), 190)
        text(f"{w} insight", x.get("insight"), 260)
        text(f"{w} dissent", x.get("dissent"), 260)
        need(x.get("trust") in {"Confirmed", "Plausible", "Unverified"}, f"{w}: trust must be Confirmed, Plausible or Unverified")
        text(f"{w} trustNote", x.get("trustNote"), 260)
        th = x.get("thread") or {}
        text(f"{w} thread name", th.get("name"))
        text(f"{w} thread date", th.get("date"))
        need(str(th.get("url", "")).startswith("https://"), f"{w}: thread url must be https")
        need("reddit.com" not in str(th.get("url", "")), f"{w}: Reddit cannot be opened here, so cite only threads you read")
        if x.get("original"):
            need(str(x["original"].get("url", "")).startswith("https://"), f"{w}: original url must be https")
            text(f"{w} original name", x["original"].get("name"))
    iv = b.get("interview")
    need(bool(iv) or b.get("type") != "sunday", "Sunday needs an interview question")
    if iv:
        need(iv.get("tag") in TAGS, "interview tag")
        text("interview scenario", iv.get("scenario"), 260)
        opts = iv.get("options") or []
        need(3 <= len(opts) <= 4, "interview needs 3 or 4 options")
        for o in opts:
            text("interview option", o, 120)
        need(isinstance(iv.get("answer"), int) and 0 <= iv["answer"] < len(opts), "interview answer index")
        text("interview why", iv.get("why"), 220)


def render(date):
    chrome = next(filter(None, map(shutil.which, ["google-chrome", "chromium"])), None) \
        or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/index.html?d={date}"
    try:
        out = subprocess.run(
            [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--window-size=375,812",
             "--virtual-time-budget=4000", "--dump-dom", url],
            capture_output=True, text=True, timeout=60).stdout
    finally:
        server.shutdown()
    need('class="verdict"' in out, "page did not render the verdict")
    need('class="gcard quiz"' in out, "page did not render the quiz card")
    if date >= COURSE_START:
        need(out.count('class="cd learn-card lesson"') == len((course_day(date) or {}).get("lessons", [])), "page did not render every lesson card")
        need('class="cd radar-card"' in out, "page did not render the Radar card")
    else:
        need('class="cd learn-card lesson"' in out, "page did not render the lesson")
    need('class="err"' not in out, "page showed its error message")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    date = sys.argv[1]
    datetime.date.fromisoformat(date)
    index_path = ROOT / "briefs" / "index.json"
    dates = json.loads(index_path.read_text())
    dates = sorted(set(dates) | {date}, reverse=True)
    original = index_path.read_text()
    index_path.write_text(json.dumps(dates))
    try:
        check(date)
    except Exception as e:
        need(False, f"brief could not be read: {e}")
    if not problems:
        render(date)
    if problems:
        index_path.write_text(original)
        print("FAILED")
        print("\n".join(f"- {p}" for p in problems))
        sys.exit(1)
    print("PASSED")


main()
