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
    if poster and s.get("big"):
        text(f"{where} big", s["big"], LIMITS["big"])


def check(date):
    b = json.loads((ROOT / "briefs" / f"{date}.json").read_text())
    need(b.get("date") == date, "date does not match the filename")
    need("sample" not in b, "remove the sample flag")
    text("dayLabel", b.get("dayLabel"))
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
    if len(posters) + len(stories) >= 3:
        need(tags == TAGS, f"need all of AI, Tech and Cyber, found {sorted(map(str, tags))}")
    l = b.get("lesson") or {}
    need(1 <= int(l.get("n") or 0) <= 90, "lesson number must be 1 to 90")
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
    need(l.get("quiz"), "lesson needs a quiz")
    for q in l.get("quiz") or []:
        text("quiz question", q.get("q"))
        text("quiz answer", q.get("a"))


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
    check(date)
    if not problems:
        render(date)
    if problems:
        index_path.write_text(original)
        print("FAILED")
        print("\n".join(f"- {p}" for p in problems))
        sys.exit(1)
    print("PASSED")


main()
