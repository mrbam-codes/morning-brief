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
    need(str(src.get("url", "")).startswith("https://"), f"{where}: source url must be https")
    r = s.get("read") or {}
    need(isinstance(r, dict) and r, f"{where}: needs a read with what, how, why and take")
    for k in ("what", "how", "why", "take"):
        text(f"{where} read.{k}", r.get(k), 700)
    if poster and s.get("big"):
        need(len(str(s.get("headline", "")).split()) >= 3, f"{where}: headline must say what happened in at least 3 words")
        text(f"{where} big", s["big"], LIMITS["big"])


def check(date):
    b = json.loads((ROOT / "briefs" / f"{date}.json").read_text())
    need(b.get("date") == date, "date does not match the filename")
    need("sample" not in b, "remove the sample flag")
    text("dayLabel", b.get("dayLabel"))
    day = datetime.date.fromisoformat(date)
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
    need(total <= (12 if sunday else 7), f"{total} stories is too many for this day")
    heads = [str(s.get("headline", "")).strip().lower() for s in posters + stories]
    need(len(heads) == len(set(heads)), "two stories have the same headline")
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
    need(kinds.count("lesson") == (1 if b.get("type") == "sunday" else (2 if "recap" in kinds else 4)),
         "quiz lesson questions: Sunday 1, daily 2 (4 on the first day, with no recap)")
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
    terms = b.get("terms") or []
    need(3 <= len(terms) <= 6, "terms: 3 to 6 glossary terms")
    for t in terms:
        text("term", t.get("term"), 40)
        text("term meaning", t.get("plain"), 150)
    bd = b.get("build") or {}
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
    need('class="lesson"' in out, "page did not render the lesson")
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
