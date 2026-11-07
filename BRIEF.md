# How to write a brief

Each brief is one JSON file at `briefs/YYYY-MM-DD.json`. The page design is fixed in `index.html`. Do not edit `index.html`, `check.py`, `course.md` or this file.

## Fields

- `date`: `YYYY-MM-DD`
- `dayLabel`: `Saturday 7 November 2026`
- `type`: `daily` or `sunday`
- `verdict`: the day in one line, up to 90 characters
- `posters`: 1 to 3 top stories, each shown as a giant full-colour screen
- `stories`: the other stories, shown as cards (daily)
- `themes`: Sunday only, exactly 3 of `{ "title": "...", "stories": [...] }`, used instead of `stories`
- `lesson`: see below

## A story

`tag` (`AI`, `Tech` or `Cyber`), `headline`, `summary` (up to 170 characters), `soWhat` (starts `Work:`, `Build:` or `Curious:`, up to 90 characters), and `source` as `{ "name", "date", "url" }`. The `date` is short, such as `6 Nov`, and the `url` must be the exact article.

A poster also has `big`: a short number of up to 7 characters, such as `-12%` or `2,000+`, or an empty string when the story has no number. Poster headlines are up to 34 characters and read best in very few words. With no number, the headline carries the whole screen, so write something like `The agent got out`. Pick posters for impact, and use a mix of tags where you can.

## The lesson

`n`, `tag`, `title` (up to 42 characters), `idea` (one sentence), `steps` (3 to 6), `analogy`, `breaks` (where the analogy fails), `why`, `diagrams`, and `quiz` (see below).

Each diagram is `{ "alt", "svg" }`. It shows the real mechanism, not decorative boxes.

- Start with `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 190" font-family="Arial,sans-serif">`. Taller is fine: `0 0 320 260`.
- It sits on a pink-to-blue gradient, so draw in white with no background. Use thick and thin lines, opacity and size to show meaning.
- Text is 14px or larger. A character is about 0.55 of the font size wide, so measure every label and keep it inside the 320 width.
- No scripts, no images and no external links.

## Daily and Sunday

- Daily: up to 7 stories in all, about a 1-minute lesson, one diagram, five quiz questions. Aim for 5, but never add a story from outside the time window to reach a number. Three fresh stories beat five padded ones.
- Sunday: 10 stories in all, under 3 themes, about a 4-minute lesson, two diagrams, five quiz questions, and an `interview` question.

## Check it

Run `python3 check.py YYYY-MM-DD`. It must print `PASSED`. It also adds the date to `briefs/index.json`.

## The short read (tap a card to open it)

Every story, poster or card, also has `read`: `{ "what", "how", "why", "take" }`, each up to 700 characters, so the reader never has to open the source site.

- `what`: what happened, with the key numbers copied from the source.
- `how`: how it works or happened, plain English first, technical term in brackets.
- `why`: why it matters and who is affected.
- `take`: Claude's own view, marked as opinion. Separate fact from vendor claims, say what is unproven, and say what to watch next.

## The quiz, glossary, build idea and interview round

Always five quiz questions, multiple choice, each `{ "kind", "tag", "n", "q", "options", "answer", "why" }`.

- `kind`: `lesson` (today's lesson), `recap` (an earlier lesson from course.md, for spaced revision) or `news` (one of today's stories).
- Daily: 2 lesson, 2 recap, 1 news. On lesson 1 there is nothing earlier, so use 4 lesson and 1 news. Sunday: 1 lesson, 3 recap, 1 news.
- `n` is the lesson number (lesson and recap questions only). `tag` is AI, Tech or Cyber. `answer` is the position 0 to 3 of the right option. Vary the positions. Options up to 80 characters, `q` up to 150, `why` up to 190 and it must teach, not just repeat the answer.
- Recap questions must be true to the lesson title in course.md. Make them test understanding, not recall of a phrase. News questions must be answerable from the short read.

`terms`: 3 to 6 of `{ "term", "plain" }`, new terms met today, plain English first. They feed the Glossary page.

`build`: `{ "title", "idea", "first" }`. One real thing a non-coder could build with an AI assistant, tied to the lesson, with the first step to take.

`interview` (required on Sunday, optional other days): `{ "tag", "scenario", "options", "answer", "why" }` with 3 or 4 options. A scenario in a consultant's voice, such as a client asking something. Right answer is the one a calibrated expert would give.

The page keeps scores, streaks, badges and the review queue on the reader's phone, so none of that is stored in this repository.

## Verification rule (standing)

Open the original source for every claim before using it: the company's own post, the research paper, the advisory, the court filing or the regulator's page, not only the news article about it. Where the claim comes from a company, say so and look for independent confirmation. If the original cannot be opened, say that in the story's `take` and do not state the claim as fact.
