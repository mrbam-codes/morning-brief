/* ScoreCore: the shared daily-quiz scoring rules, re-scored from history.
   Rules (agreed with Adam, 8 Nov 2026): 10 points per correct first try, +20 for a
   perfect day, streak multiplier x1.5 at 5 days in a row and x2 at 10 (the cap), a
   missed day drops the multiplier one step (never straight to zero).
   Counted days: 'all' (every day) or 'weekdays' (weekends never count or break).
   Everything is recomputed from the saved history, so a caught-up day or a rule
   change re-scores cleanly and nobody's finished days are lost.
   Pure functions, no DOM. Copied unchanged into each brief; source of truth is
   ~/ClaudeCode/work-course/scorecore.js. */
var ScoreCore = (function () {
  'use strict';
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function counts(d, mode) { var w = d.getDay(); return mode === 'weekdays' ? (w !== 0 && w !== 6) : true; }
  function countedBetween(a, b, mode) { var n = 0, d = parse(a); d.setDate(d.getDate() + 1); var e = parse(b); while (d < e) { if (counts(d, mode)) n++; d.setDate(d.getDate() + 1); } return n; }
  function multFor(c) { return c >= 10 ? 2 : c >= 5 ? 1.5 : 1; }
  function stepOf(c) { return c >= 10 ? 2 : c >= 5 ? 1 : 0; }
  var FLOOR = [0, 4, 9];
  function advance(c, last, date, mode) {
    if (!counts(parse(date), mode)) return { c: c, last: last, dropped: 0 };
    if (!last) return { c: 1, last: date, dropped: 0 };
    var missed = countedBetween(last, date, mode);
    if (missed === 0) return { c: c + 1, last: date, dropped: 0 };
    var st = Math.max(0, stepOf(c) - missed);
    return { c: FLOOR[st] + 1, last: date, dropped: stepOf(c) - st };
  }
  /* days: {"YYYY-MM-DD": {score, total}}; returns per-day points and totals */
  function rescore(days, mode) {
    var keys = Object.keys(days).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort();
    var c = 0, last = null, total = 0, perfects = 0, right = 0, asked = 0, out = {};
    keys.forEach(function (k) {
      var d = days[k], a = advance(c, last, k, mode); c = a.c; last = a.last;
      var mult = multFor(c), base = (d.score | 0) * 10, perfect = d.total >= 3 && d.score === d.total, bonus = perfect ? 20 : 0;
      var pts = Math.round((base + bonus) * mult);
      out[k] = { points: pts, mult: mult, base: base, bonus: bonus, perfect: perfect, dropped: a.dropped, counter: c };
      total += pts; if (perfect) perfects++; right += d.score | 0; asked += d.total | 0;
    });
    return { day: out, total: total, counter: c, last: last, perfects: perfects, right: right, asked: asked };
  }
  /* the multiplier today's quiz would earn, and whether a miss has dropped it */
  function preview(days, today, mode) {
    var r = rescore(days, mode);
    if (days[today]) return { mult: r.day[today].mult, dropped: 0, done: true };
    var a = advance(r.counter, r.last, today, mode);
    return { mult: multFor(a.c), dropped: a.dropped, done: false };
  }
  /* literal days in a row ending today (or yesterday if today is not done yet) */
  function run(days, today, mode) {
    var d = parse(today), n = 0, guard = 0;
    if (!days[iso(d)]) d.setDate(d.getDate() - 1);
    while (guard++ < 3700) {
      var k = iso(d);
      if (days[k]) n++;
      else if (counts(d, mode)) break;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  function best(days, mode) {
    var keys = Object.keys(days).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort(), b = 0, cur = 0, last = null;
    keys.forEach(function (k) { if (!counts(parse(k), mode)) return; cur = last && countedBetween(last, k, mode) === 0 ? cur + 1 : 1; last = k; b = Math.max(b, cur); });
    return b;
  }
  function rank(total, ranks) {
    var i = 0; ranks.forEach(function (r, j) { if (total >= r[1]) i = j; });
    var nx = ranks[i + 1] || null, top = ranks[ranks.length - 1][1];
    return { name: ranks[i][0], index: i + 1, of: ranks.length, next: nx ? nx[0] : null, toNext: nx ? nx[1] - total : 0, floor: ranks[i][1], ceil: nx ? nx[1] : ranks[i][1], toTop: Math.min(1, total / top) };
  }
  return { rescore: rescore, preview: preview, run: run, best: best, rank: rank, multFor: multFor, parse: parse, iso: iso };
})();
if (typeof module !== 'undefined') module.exports = ScoreCore;
