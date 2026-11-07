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

`n`, `tag`, `title` (up to 42 characters), `idea` (one sentence), `steps` (3 to 6), `analogy`, `breaks` (where the analogy fails), `why`, `diagrams`, and `quiz` as a list of `{ "q", "a" }`.

Each diagram is `{ "alt", "svg" }`. It shows the real mechanism, not decorative boxes.

- Start with `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 190" font-family="Arial,sans-serif">`. Taller is fine: `0 0 320 260`.
- It sits on a pink-to-blue gradient, so draw in white with no background. Use thick and thin lines, opacity and size to show meaning.
- Text is 14px or larger. A character is about 0.55 of the font size wide, so measure every label and keep it inside the 320 width.
- No scripts, no images and no external links.

## Daily and Sunday

- Daily: 5 to 7 stories in all, about a 1-minute lesson, one diagram, one quiz question.
- Sunday: 10 stories in all, under 3 themes, about a 4-minute lesson, two diagrams, and five quiz questions: one on today's lesson and four on the previous 6 lessons.

## Check it

Run `python3 check.py YYYY-MM-DD`. It must print `PASSED`. It also adds the date to `briefs/index.json`.
