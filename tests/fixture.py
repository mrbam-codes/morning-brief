"""Make a test brief for a course date, for the checker tests and the page checks only.
Usage: python3 tests/fixture.py NEWS_JSON [NEWS_JSON...] DATE OUT_JSON

News comes from real past briefs (headlines tagged "(test)"); lessons, diagrams, fact and quiz
are placeholders shaped exactly as BRIEF.md asks. Never publish a fixture.
"""
import datetime, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
*news, date, out = sys.argv[1:]
day = datetime.date.fromisoformat(date)
course = json.loads((ROOT / "course.json").read_text(encoding="utf-8"))
cd = next(d for d in course["days"] if d["date"] == date)
titles = {l["n"]: (l["title"], l["tag"]) for d in course["days"] for l in d["lessons"]}
stories = []
for p in news:
    b = json.loads(open(p, encoding="utf-8").read())
    stories += list(b.get("posters") or []) + list(b.get("stories") or []) + [s for t in b.get("themes") or [] for s in t.get("stories") or []]
sunday = day.weekday() == 6
stories = stories[: (10 if sunday else 7)]
short = f"{day.day} {day:%b}"
for i, s in enumerate(stories):
    s["source"]["date"] = short if i % 2 == 0 else f"{(day - datetime.timedelta(1)).day} {(day - datetime.timedelta(1)):%b}"
    s.pop("photo", None)


def svg(label):
    a, b2 = label[:14], "mechanism"
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" font-family="Arial,sans-serif" fill="#fff">'
            '<rect x="10" y="20" width="120" height="60" rx="10" fill="none" stroke="#fff" stroke-width="3"/>'
            '<rect x="190" y="20" width="120" height="60" rx="10" fill="none" stroke="#fff" stroke-width="3"/>'
            '<line x1="130" y1="50" x2="190" y2="50" stroke="#fff" stroke-width="4"/>'
            '<path d="M180 42 L190 50 L180 58" fill="none" stroke="#fff" stroke-width="4"/>'
            f'<text x="70" y="56" font-size="15" text-anchor="middle">Input</text>'
            f'<text x="250" y="56" font-size="15" text-anchor="middle">Output</text>'
            f'<text x="160" y="130" font-size="16" text-anchor="middle">{b2}</text>'
            f'<text x="160" y="160" font-size="14" text-anchor="middle" opacity=".8">{a.replace("&", "and").replace("<", "")}</text></svg>')


lessons = []
for l in cd["lessons"]:
    x = {"n": l["n"], "tag": l["tag"], "title": l["title"],
         "idea": "Test idea in one sentence for this lesson.",
         "steps": ["First step of the mechanism.", "Second step of the mechanism.", "Third step of the mechanism."],
         "analogy": "A test analogy.", "breaks": "Where the test analogy fails.", "why": "Why this matters, in test words.",
         "diagram": {"alt": "Test diagram: input, arrow, output.", "svg": svg(l["title"])}}
    if l.get("verify"):
        x["verified"] = {"note": "Test note: what was checked.", "source": {"name": "Test source", "url": "https://example.org/"}}
    lessons.append(x)
first = cd["lessons"][0]["n"]
quiz = []
for k, l in enumerate(cd["lessons"]):
    quiz.append({"kind": "lesson", "tag": l["tag"], "n": l["n"], "q": f"Test question on lesson {l['n']}?",
                 "options": ["Option one", "Option two", "Option three", "Option four"], "answer": k % 4, "why": "Test reason that teaches."})
for k in range(2):
    if first == 1:
        quiz.append({"kind": "news", "tag": stories[k]["tag"], "q": "Test news question?", "options": ["One", "Two", "Three", "Four"], "answer": (k + 1) % 4, "why": "Test reason."})
    else:
        n = max(1, first - 1 - k * 2)
        quiz.append({"kind": "review", "tag": titles[n][1], "n": n, "title": titles[n][0], "q": f"Test review of lesson {n}?",
                     "options": ["Alpha", "Beta", "Gamma", "Delta"], "answer": (k + 2) % 4, "why": "Test reason that teaches."})
b = {"date": date, "dayLabel": f"{day:%A} {day.day} {day:%B %Y}", "type": "sunday" if sunday else "daily",
     "verdict": "Test edition: a rehearsal of the new course layout.",
     "posters": stories[:1], "lessons": lessons, "quiz": quiz,
     "fact": {"text": "Test fun fact text.", "source": {"name": "Test source", "url": "https://example.org/fact"}},
     "terms": [{"term": "Test term " + str(i), "plain": "A plain meaning."} for i in range(3)],
     "build": {"title": "Test build", "idea": "A test build idea.", "first": "A test first step."}}
if sunday:
    rest = stories[1:]
    b["themes"] = [{"title": f"Test theme {i + 1}", "stories": rest[i::3]} for i in range(3)]
    b["interview"] = {"tag": "AI", "scenario": "A client asks a test question.", "options": ["One", "Two", "Three"], "answer": 1, "why": "Test reason."}
else:
    b["stories"] = stories[1:]
if cd.get("try"):
    b["try"] = {"title": cd["try"][0]["title"], "task": cd["try"][0]["task"], "needs": cd["try"][0].get("needs", ""),
                "steps": ["Open Claude Code.", "Give it the task.", "Check the result."]}
for s in [*b["posters"], *(b.get("stories") or []), *[x for t in b.get("themes") or [] for x in t["stories"]]]:
    s["headline"] = (s["headline"][:28] + " (test)") if s in b["posters"] else s["headline"] + " (test)"
open(out, "w", encoding="utf-8").write(json.dumps(b, ensure_ascii=False, indent=1))
print("wrote", out)
