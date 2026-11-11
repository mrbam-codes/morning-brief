/* Morning brief: score badge (top right), My scores panel, the Terminal x Neon
   share card (which flips over to a QR code from qr.js) and Move my progress.
   Scoring itself is ScoreCore (scorecore.js); the page passes in its saved state
   through MBScores.init. Nothing leaves this browser. */
(function () {
  'use strict';
  var cfg = null, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('en-GB'); }
  function stats() {
    var S = cfg.state(), t = cfg.today(), R = ScoreCore.rescore(S.days, cfg.mode), rk = ScoreCore.rank(S.points, cfg.ranks);
    var pv = ScoreCore.preview(S.days, t, cfg.mode), dd = S.days[t] ? R.day[t] : null;
    return { S: S, t: t, R: R, rk: rk, pv: pv, td: dd, tdRaw: S.days[t], run: ScoreCore.run(S.days, t, cfg.mode), best: ScoreCore.best(S.days, cfg.mode) };
  }
  var badge = null;
  function paint(bump) {
    if (!badge) { badge = el('<button class="cc-badge" type="button"><span class="rg"><span></span></span><span class="pill"></span></button>'); badge.addEventListener('click', panel); document.body.appendChild(badge); }
    var m = stats();
    badge.querySelector('.rg').style.setProperty('--p', Math.round(m.rk.toTop * 100) + '%');
    badge.querySelector('.rg span').textContent = '🔥' + m.run;
    badge.querySelector('.pill').textContent = fmt(m.S.points) + ' pts';
    badge.setAttribute('aria-label', 'My scores: ' + fmt(m.S.points) + ' points, rank ' + m.rk.name + ', ' + m.run + '-day streak');
    if (bump && !reduce) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
  }
  var lastFocus = null;
  function overlay(inner, onOpen) {
    lastFocus = document.activeElement;
    var o = el('<div class="cc-over" role="dialog" aria-modal="true"></div>'); o.appendChild(inner);
    function close() { o.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
    function key(e) { if (e.key === 'Escape') close(); }
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    inner.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', key); document.body.appendChild(o); document.body.style.overflow = 'hidden';
    var f = inner.querySelector('[data-close]'); if (f) f.focus();
    if (onOpen) onOpen(o, close);
  }
  function panel() {
    var m = stats(), rk = m.rk, pct = rk.next ? Math.round(100 * (m.S.points - rk.floor) / (rk.ceil - rk.floor)) : 100;
    var acc = m.R.asked ? Math.round(100 * m.R.right / m.R.asked) + '%' : '–', strip = '', first = Object.keys(m.S.days).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort()[0] || m.t;
    for (var i = 27; i >= 0; i--) {
      var d = new Date(ScoreCore.parse(m.t)); d.setDate(d.getDate() - i); var k = ScoreCore.iso(d), x = m.R.day[k];
      var c = x ? (x.perfect ? 'p' : 'd') : (i && k > first ? 'm' : ''); if (!i) c += ' t';
      strip += '<i class="' + c + '" title="' + k + (x ? ': ' + x.points + ' pts' : '') + '"></i>';
    }
    var note = m.S.rescored ? '<p class="cc-note">Scores now use the new rules: 10 a right answer, 20 for a perfect day, and a streak multiplier. Every day you finished still counts.</p>' : '';
    if (m.S.rescored) { delete m.S.rescored; cfg.save(); }
    var sheet = el('<div class="cc-sheet" aria-labelledby="ccPanelH">' +
      '<div class="cc-top"><h3 id="ccPanelH">My scores</h3><button class="cc-x" data-close aria-label="Close">×</button></div>' +
      '<div class="cc-hero"><div class="rg" style="--p:' + Math.round(rk.toTop * 100) + '%"><b>' + rk.name.toUpperCase() + '</b></div>' +
      '<div><div class="tot">' + fmt(m.S.points) + '</div><small>total points · rank ' + rk.index + ' of ' + rk.of + '</small><small>' + (rk.next ? fmt(rk.toNext) + ' to ' + rk.next : 'Top rank reached') + '</small></div></div>' +
      '<div class="cc-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' + note +
      '<div class="cc-stats"><div><b>' + m.run + '🔥</b><span>Day streak</span></div><div><b>×' + m.pv.mult + '</b><span>Multiplier</span></div><div><b>' + m.best + '</b><span>Best streak</span></div>' +
      '<div><b>' + m.R.perfects + '</b><span>Perfect days</span></div><div><b>' + acc + '</b><span>Correct</span></div><div><b>' + Object.keys(m.R.day).length + '</b><span>Quizzes</span></div></div>' +
      (m.pv.dropped && !m.td ? '<p class="cc-note">You missed a day, so today\'s multiplier is one step lower. Finish today\'s quiz to climb back.</p>' : '') +
      '<div style="display:grid;gap:8px"><div class="cc-tag">The last four weeks</div><div class="cc-strip">' + strip + '</div>' +
      '<div class="cc-key"><span><i style="background:#2a7a4c"></i>done</span><span><i style="background:#ff3df2"></i>perfect</span><span><i style="border:1px dashed #ff6f91"></i>missed</span><span><i style="outline:2px solid #3de6ff"></i>today</span></div></div>' +
      '<div class="cc-row"><button class="cc-btn" data-share>Show my share card</button><button class="cc-btn ghost" data-prog>Badges and progress</button></div></div>');
    overlay(sheet, function (o, close) {
      sheet.querySelector('[data-share]').addEventListener('click', function () { close(); share(); });
      sheet.querySelector('[data-prog]').addEventListener('click', function () { close(); cfg.openProgress && cfg.openProgress(); });
    });
  }
  function cardHTML(m) {
    var rk = m.rk, td = m.td, pts = td ? td.points : 0, mult = td ? td.mult : m.pv.mult;
    var filled = rk.next ? Math.round(15 * (m.S.points - rk.floor) / (rk.ceil - rk.floor)) : 15, bar = '█'.repeat(filled) + '░'.repeat(15 - filled);
    /* the headline is today's quiz score, the one figure a stranger understands; points sit in a chip */
    var big = td ? m.tdRaw.score + '/' + m.tdRaw.total : '–', bigLbl = td ? 'QUIZ TODAY' : 'QUIZ NOT DONE YET';
    var chips = (td ? (td.perfect ? '<span class="p">PERFECT</span>' : '') + '<span>+' + pts + ' PTS TODAY</span>' : '') + '<span>×' + mult + ' MULTIPLIER</span>';
    var acc = m.R.asked ? Math.round(100 * m.R.right / m.R.asked) + '%' : '–';
    var DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], when = whenOf(m.t);
    var first = Object.keys(m.S.days).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort()[0] || m.t, week = '';
    for (var i = 6; i >= 0; i--) {
      var d = new Date(ScoreCore.parse(m.t)); d.setDate(d.getDate() - i); var k = ScoreCore.iso(d), x = m.R.day[k];
      week += '<i class="' + (x ? (x.perfect ? 'p' : 'd') : (i && k > first ? 'm' : '')) + (i ? '' : ' t') + '">' + DAY[d.getDay()] + '</i>';
    }
    var name = (m.S.name || 'anonymous').toLowerCase().slice(0, 16);
    return '<div class="sharecard e cfront" style="--p:' + Math.round(rk.toTop * 100) + '%" aria-label="Share card: ' + rk.name + ', ' + (td ? big + ' in today\'s quiz, ' : '') + pts + ' points today">' +
      '<canvas data-net></canvas><div class="hd"><span>' + esc(cfg.label) + ' // DAY ' + cfg.day() + '</span><span>' + when + '</span></div>' +
      '<div>&gt; whoami<br>' + esc(name) + ' <span class="ok">AUTH OK</span></div><div class="lbl">&gt; status --today</div>' +
      '<div class="mid"><div class="ring"><div><b>' + rk.name.toUpperCase() + '</b><span>RANK ' + rk.index + '/' + rk.of + '</span></div></div><div class="sbig' + (big.length > 4 ? ' xs' : big.length > 2 ? ' sm' : '') + '">' + big + '<small>' + bigLbl + '</small></div></div>' +
      '<div class="chips">' + chips + '</div><div class="lbl">&gt; rank --next</div>' +
      '<div class="bar">[' + bar + '] ' + fmt(m.S.points) + (rk.next ? '/' + fmt(rk.ceil) : '') + '</div>' +
      '<div class="lbl">' + (rk.next ? fmt(rk.toNext) + ' pts to ' + rk.next.toUpperCase() : 'TOP RANK: ' + rk.name.toUpperCase()) + '</div>' +
      '<div class="row"><span>STREAK</span><span>' + m.run + (m.run === 1 ? ' DAY' : ' DAYS') + ' 🔥</span></div>' +
      '<div class="row"><span>CORRECT, ALL TIME</span><span>' + acc + '</span></div>' +
      '<div class="lbl">&gt; log --week</div><div class="wk">' + week + '</div>' +
      '<div class="wkey"><span><i class="d"></i>done</span><span><i class="p"></i>perfect</span><span><i class="m"></i>missed</span></div>' +
      shipHTML(who, 'CO-PILOT', '') +
      '<div class="foot"><span>&gt; ' + (flippable() ? 'TAP TO FLIP' : '_') + '<span class="cur"></span></span><span>' + esc(cfg.foot) + '</span></div></div>';
  }
  /* the pilot's ship, drawn once here for the share card and the first-visit tour (tour.js); sfx keeps the gradient ids apart */
  function shipHTML(cat, label, sfx) {
    return '<div class="ship" aria-hidden="true"><div class="ship-in">' +'<svg class="ship-svg" viewBox="0 0 200 120"><defs><linearGradient id="shipb' + sfx + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a5e"/><stop offset="1" stop-color="#120a33"/></linearGradient>' +'<linearGradient id="shipf' + sfx + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3df2" stop-opacity="0"/><stop offset=".5" stop-color="#ff3df2"/><stop offset="1" stop-color="#ffe66d"/></linearGradient></defs>' +'<g class="flame"><path d="M14 66 L46 58 L46 78 Z" fill="url(#shipf' + sfx + ')"/><path d="M24 68 L46 63 L46 73 Z" fill="#fff" opacity=".8"/></g>' +'<path d="M46 52 Q90 30 150 52 Q182 64 150 80 Q90 98 46 84 Z" fill="url(#shipb' + sfx + ')" stroke="#3de6ff" stroke-width="2.5"/>' +'<path d="M70 84 L58 104 L84 92 Z M110 88 L118 108 L128 90 Z" fill="#120a33" stroke="#ff3df2" stroke-width="2"/>' +'<circle cx="60" cy="68" r="4" fill="#ffe66d"/><circle cx="162" cy="68" r="3" fill="#3de6ff"/>' +'<path d="M58 76 L150 76" stroke="#3de6ff" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="4 5"/></svg>' +'<div class="dome"><div class="kpod"></div></div><div class="tag">' + (cat === 'charlee' ? 'CHARLEE' : 'KIMCHI') + ' // ' + label + '</div></div></div>';
  }
  function whenOf(t) { return +t.slice(8) + ' ' + ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][+t.slice(5, 7) - 1]; }
  /* the card turns over to a QR code only when qr.js has loaded and the page passed its address */
  function flippable() { return !!(cfg.url && window.MBQR && MBQR.rows && MBQR.rows.length); }
  /* the back of the card: the QR code that opens the brief, and the address as text. Both come from qr.js. */
  function backHTML(m) {
    return '<div class="sharecard e cback"><canvas data-net></canvas><div class="hd"><span>&gt; share --qr</span><span>' + whenOf(m.t) + '</span></div>' +
      '<div class="slot"></div><div class="scan">SCAN TO OPEN TODAY\'S BRIEF</div>' +
      '<div class="qrbox"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br bq"></i>' +
      '<canvas class="qr" role="img" aria-label="QR code that opens ' + esc(cfg.url) + '"></canvas><canvas class="qa" aria-hidden="true"></canvas></div>' +
      '<div class="addr">' + esc(cfg.url) + '</div>' +
      '<div class="foot"><span>&gt; TAP TO FLIP BACK<span class="cur"></span></span><span>' + esc(cfg.foot) + '</span></div></div>';
  }
  function stageHTML(m) {
    return '<div class="cflip" data-side="front" role="button" tabindex="0"><canvas class="cf-bg" aria-hidden="true"></canvas>' +
      '<div class="cf-in">' + cardHTML(m) + backHTML(m) + '</div><canvas class="cf-fx" aria-hidden="true"></canvas></div>';
  }
  function net(cv) {
    var ctx = cv.getContext('2d'), W, H, pts = [];
    var r = cv.getBoundingClientRect(); W = cv.width = Math.max(1, r.width * devicePixelRatio); H = cv.height = Math.max(1, r.height * devicePixelRatio);
    pts = Array.from({ length: 30 }, function () { return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4 }; });
    (function draw() {
      if (!cv.isConnected) return;
      if (!document.hidden) {
        ctx.clearRect(0, 0, W, H); var dd = W * .28;
        pts.forEach(function (p) { if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; } });
        for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) { var a = pts[i], b = pts[j], dist = Math.hypot(a.x - b.x, a.y - b.y); if (dist < dd) { ctx.strokeStyle = 'rgba(61,230,255,' + (.35 * (1 - dist / dd)) + ')'; ctx.lineWidth = devicePixelRatio; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
        pts.forEach(function (p) { ctx.fillStyle = 'rgba(255,61,242,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * devicePixelRatio, 0, 7); ctx.fill(); });
      }
      if (!reduce) requestAnimationFrame(draw);
    })();
  }
  /* Kimchi and Charlee take turns flying the ship: each time the share card opens, the other cat is at the controls.
     The pixel-art style suits the terminal; one cat at a time. If Charlee's file is missing, Kimchi flies. */
  var who = 'kimchi';
  function pilot(root, cat) {
    var pod = root.querySelector('.kpod'), dome = root.querySelector('.dome');
    if (pod && (cat || who) === 'charlee') { requestAnimationFrame(function () { if (window.KIMCHI) KIMCHI.stop(); CHARLEE.cameo(pod, Math.round(dome.getBoundingClientRect().width * 1.25) || 90); }); return; }
    if (!pod || !window.KIMCHI) { if (dome) dome.classList.add('empty'); return; }
    requestAnimationFrame(function () { var w = Math.round(dome.getBoundingClientRect().width * 1.25) || 90; KIMCHI.cameo(pod, 's08', w); });
  }
  /* ---- The flip (plan 14). Tap the card, or press Enter or Space on it, to turn it over to a QR code.
     Going to the back, the two approved animations take turns: Tractor Beam first, then Warp Jump.
     Going back to the front is a quick plain turn. With reduced motion both ways are an instant swap.
     Ported from the approved mock-up (morning-brief-directions/card-flip.html, directions 1 and 2),
     with the real pilot (Kimchi or Charlee) flying the ship instead of the mock-up's stand-in faces.
     Once settled, the QR is black on pure white, whole-pixel modules, with nothing drawn over it. ---- */
  var flips = 0, MG = 24, TERM = '&gt; warp --to brief<b>JUMP COMPLETE</b>';
  function clamp(v, a, b) { a = a || 0; b = b == null ? 1 : b; return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function dpr() { return Math.min(3, window.devicePixelRatio || 1); }
  function tf(x, y, rot, sc) { return 'translate(' + x + 'px,' + y + 'px) rotate(' + rot + 'deg) scale(' + sc + ')'; }
  function at(e, S) { var r = e.getBoundingClientRect(), s = S.stage.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; }
  function clr(c) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, c.canvas.width, c.canvas.height); c.restore(); }
  function ctxFor(S, cv) {
    var D = dpr(), w = S.W + 2 * MG, h = S.H + 2 * MG; cv.width = Math.round(w * D); cv.height = Math.round(h * D); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var c = cv.getContext('2d'); c.setTransform(D, 0, 0, D, MG * D, MG * D); return c;
  }
  function timeline(dur, fn) {
    return new Promise(function (res, rej) {
      var t0 = performance.now(), last = t0;
      /* a drawing error ends the animation and the card still settles, so it can never stick mid-turn */
      function f(now) { var ms = Math.min(dur, now - t0), dt = Math.min(50, Math.max(0, now - last)); last = now; try { fn(ms, dt); } catch (e) { rej(e); return; } if (ms < dur) requestAnimationFrame(f); else res(); }
      requestAnimationFrame(f);
    });
  }
  function A(S, e, kf, o) { var a = e.animate(kf, Object.assign({ fill: 'both' }, o)); S.anims.push(a); return a; }
  function go(S) { S.stage.dataset.side = 'anim'; S.stage.classList.add('a3d'); }
  function dark(S, r, c) { return r >= 0 && c >= 0 && r < S.N && c < S.N && MBQR.rows[r].charCodeAt(c) === 49; }
  function cells(S) { var out = []; for (var r = 0; r < S.N; r++) for (var c = 0; c < S.N; c++) if (dark(S, r, c)) out.push([r, c]); return out; }
  /* the settled code: 4-module white margin, module edges on whole device pixels, no smoothing */
  function drawQR(S) {
    var D = dpr(), px = Math.round(S.qs * D), c, e = function (i) { return Math.round(i * S.mod * D); };
    S.qr.width = px; S.qr.height = px; c = S.qr.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#fff'; c.fillRect(0, 0, px, px); c.fillStyle = '#000';
    cells(S).forEach(function (p) { c.fillRect(e(4 + p[1]), e(4 + p[0]), e(5 + p[1]) - e(4 + p[1]), e(5 + p[0]) - e(4 + p[0])); });
  }
  function qaOn(S) { S.qr.style.visibility = 'hidden'; S.qa.style.visibility = 'visible'; clr(S.qac); }
  function qaOff(S) { S.qr.style.visibility = ''; S.qa.style.visibility = ''; clr(S.qac); }
  function home(S) { if (S.ship && S.ship.parentNode !== S.front) S.front.insertBefore(S.ship, S.front.querySelector('.foot')); }
  /* 1. Tractor Beam: the pilot flies the ship over to the back and beams the code down, row by row */
  function beam(S, c, E, P, rows, a, ms) {
    var n = S.N + 8, QS = S.qs, yb = P.y + rows * S.mod, xl = P.x - 10, xr = P.x + QS + 10, h = yb - E.y;
    c.save(); c.globalCompositeOperation = 'lighter';
    var g = c.createLinearGradient(0, E.y, 0, yb); g.addColorStop(0, 'rgba(170,250,255,' + .5 * a + ')'); g.addColorStop(1, 'rgba(61,230,255,' + .13 * a + ')');
    c.fillStyle = g; c.beginPath(); c.moveTo(E.x - 9, E.y); c.lineTo(E.x + 9, E.y); c.lineTo(xr, yb); c.lineTo(xl, yb); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(200,255,255,' + .75 * a + ')'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(E.x - 9, E.y); c.lineTo(xl, yb); c.moveTo(E.x + 9, E.y); c.lineTo(xr, yb); c.stroke();
    if (h > 12) for (var k = 0; k < 6; k++) { var f = (ms * .0018 + k / 6) % 1, y = E.y + f * h, x0 = lerp(E.x - 9, xl, f), x1 = lerp(E.x + 9, xr, f); c.fillStyle = 'rgba(210,255,255,' + .2 * a * (1 - f * .6) + ')'; c.fillRect(x0, y, x1 - x0, 2); }
    var rg = c.createRadialGradient(E.x, E.y, 0, E.x, E.y, 26); rg.addColorStop(0, 'rgba(255,255,255,' + .9 * a + ')'); rg.addColorStop(.35, 'rgba(61,230,255,' + .6 * a + ')'); rg.addColorStop(1, 'rgba(61,230,255,0)');
    c.fillStyle = rg; c.fillRect(E.x - 26, E.y - 26, 52, 52);
    if (rows < n) { c.fillStyle = 'rgba(61,230,255,' + .35 * a + ')'; c.fillRect(xl, yb - 5, xr - xl, 10); c.fillStyle = 'rgba(255,255,255,' + .95 * a + ')'; c.fillRect(xl, yb - 1, xr - xl, 2); }
    c.restore();
  }
  function holo(S, rows) {
    var q = S.qac, n = S.N + 8, M = S.mod, QS = S.qs, full = Math.floor(rows), fl = .82 + Math.random() * .18;
    clr(q);
    for (var rr = 0; rr <= Math.min(n - 1, full); rr++) {
      var age = rows - rr; if (age <= 0) continue;
      var a = clamp(age / 2.5) * fl, jit = age < 3 ? (Math.random() - .5) * 12 * (1 - age / 3) : 0, y = rr * M;
      q.globalAlpha = a; q.fillStyle = 'rgba(61,230,255,.13)'; q.fillRect(jit, y, QS, M);
      q.fillStyle = age < 1.2 ? '#eaffff' : '#3de6ff';
      for (var cc = 0; cc < n; cc++) if (dark(S, rr - 4, cc - 4)) q.fillRect(cc * M + jit + .4, y + .4, M - .8, M - .8);
    }
    q.globalAlpha = 1; q.fillStyle = 'rgba(5,2,18,.35)'; var hh = Math.min(QS, (full + 1) * M); for (var yy = 0; yy < hh; yy += 3) q.fillRect(0, yy, QS, 1);
  }
  function tractor(S) {
    var ship = S.ship, a = at(ship, S);
    S.slot.textContent = ''; S.slot.appendChild(ship); var b = at(ship, S), P = at(S.qr, S);
    var fly = el('<div class="e cf-fly" aria-hidden="true"></div>'); S.stage.appendChild(fly); S.extra.push(fly); fly.appendChild(ship);
    fly.style.transformOrigin = (a.x + a.w / 2) + 'px ' + (a.y + a.h / 2) + 'px';
    go(S); qaOn(S);
    A(S, S.flip, [{ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' }, { transform: 'rotateX(16deg) rotateY(75deg) scale(.84)', offset: .42 }, { transform: 'rotateX(-5deg) rotateY(165deg) scale(.97)', offset: .82 }, { transform: 'rotateX(0deg) rotateY(180deg) scale(1)' }], { duration: 720, easing: 'cubic-bezier(.5,0,.3,1)' });
    A(S, fly, [{ transform: tf(0, 0, 0, 1) }, { transform: tf(-70, -70, -16, 1.22), offset: .38 }, { transform: tf(b.x + 36 - a.x, b.y - 34 - a.y, 9, 1.08), offset: .74 }, { transform: tf(b.x - a.x, b.y - a.y, 0, 1) }], { duration: 820, easing: 'ease-in-out' });
    var c = ctxFor(S, S.fx), E = { x: b.x + b.w * .5, y: b.y + b.h * .8 }, n = S.N + 8, hard = false;
    return timeline(1600, function (ms) {
      clr(c);
      var rows = clamp((ms - 780) / 600) * n, ba = ms < 720 ? 0 : ms < 820 ? (ms - 720) / 100 : ms < 1380 ? 1 : Math.max(0, 1 - (ms - 1380) / 150);
      if (ms < 1380) { if (ms >= 780) holo(S, rows); }
      else {
        if (!hard) { hard = true; qaOff(S); } /* the hologram hardens: the real black-on-white code shows under a fading flash */
        var k = (ms - 1380) / 220;
        c.fillStyle = 'rgba(255,255,255,' + Math.pow(1 - k, 2) * .95 + ')'; c.fillRect(P.x, P.y, S.qs, S.qs);
        var g = 4 + k * 30; c.strokeStyle = 'rgba(61,230,255,' + (1 - k) + ')'; c.lineWidth = 2; c.strokeRect(P.x - g, P.y - g, S.qs + 2 * g, S.qs + 2 * g);
      }
      if (ba > 0) beam(S, c, E, P, ms < 1380 ? Math.max(rows, 1.5) : n, ba, ms);
    });
  }
  /* 2. Warp Jump: the card spins through a star tunnel and the code's squares streak in and lock */
  function stars(n) { return Array.from({ length: n }, function () { return { x: rnd(-1.2, 1.2), y: rnd(-1.2, 1.2), z: rnd(.05, 1.25), c: Math.random() < .18 ? '255,61,242' : Math.random() < .35 ? '61,230,255' : '255,255,255' }; }); }
  function warp(S, c, st, v, dt, alpha) {
    var cx = S.W / 2, cy = S.H / 2, F = 150, chroma = v > .0022;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    st.forEach(function (s) {
      s.z -= v * dt;
      if (s.z <= .04) { s.z = 1.25; s.x = rnd(-1.2, 1.2); s.y = rnd(-1.2, 1.2); return; }
      var zt = Math.min(1.3, s.z + v * 70 + .004), x1 = cx + s.x / s.z * F, y1 = cy + s.y / s.z * F, x0 = cx + s.x / zt * F, y0 = cy + s.y / zt * F;
      var lw = clamp(.7 / s.z, .6, 3), a = alpha * clamp(1.3 - s.z, .15, 1);
      if (chroma) {
        c.lineWidth = lw; c.strokeStyle = 'rgba(255,61,242,' + a * .7 + ')'; c.beginPath(); c.moveTo(x0 - 2, y0); c.lineTo(x1 - 2, y1); c.stroke();
        c.strokeStyle = 'rgba(61,230,255,' + a * .7 + ')'; c.beginPath(); c.moveTo(x0 + 2, y0); c.lineTo(x1 + 2, y1); c.stroke();
      }
      c.lineWidth = lw; c.strokeStyle = 'rgba(' + s.c + ',' + a + ')'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    });
    c.restore();
  }
  function warpJump(S) {
    S.slot.innerHTML = '<div class="term">' + TERM + '</div>';
    var P = at(S.qr, S), M = S.mod, QS = S.qs, q = S.qac, cx = P.x + QS / 2, cy = P.y + QS / 2;
    go(S); qaOn(S);
    var kf = [{ transform: 'translateZ(0px) rotateY(0deg) scale(1)' }, { transform: 'translateZ(-80px) rotateY(270deg) scale(.78)', offset: .5 }, { transform: 'translateZ(0px) rotateY(540deg) scale(1)' }], o = { duration: 860, delay: 60, easing: 'cubic-bezier(.65,0,.25,1)' };
    A(S, S.flip, kf, o);
    ['g3', 'g1', 'g2'].forEach(function (g, i) {
      var d = el('<div class="cf-ghost ' + g + '" aria-hidden="true"></div>'); S.stage.appendChild(d); S.extra.push(d);
      var k = kf.map(function (x) { return Object.assign({}, x); }); k[0].opacity = 0; k[1].opacity = g === 'g3' ? .5 : .85; k[k.length - 1].opacity = 0;
      A(S, d, k, Object.assign({}, o, { delay: o.delay + 40 + i * 40 }));
    });
    var bg = ctxFor(S, S.bg), c = ctxFor(S, S.fx), st = stars(240), locked = false, br = S.back.querySelectorAll('.qrbox .br');
    var parts = cells(S).map(function (p) {
      var tx = P.x + (4 + p[1]) * M, ty = P.y + (4 + p[0]) * M, d = Math.hypot(tx - cx, ty - cy) / 160, an = rnd(0, 6.283), rad = rnd(240, 480), ta = 900 + d * 300 + rnd(0, 150);
      return { tx: tx, ty: ty, sx: tx + Math.cos(an) * rad, sy: ty + Math.sin(an) * rad * 1.3, ta: ta, ts: ta - rnd(260, 380), mx: (4 + p[1]) * M, my: (4 + p[0]) * M };
    });
    return timeline(1500, function (ms, dt) {
      clr(bg); clr(c);
      var v = ms < 600 ? .0003 + .0042 * Math.pow(ms / 600, 2) : ms < 950 ? .0045 : .0003 + .0042 * Math.pow(1 - clamp((ms - 950) / 450), 2);
      warp(S, bg, st, v, dt, ms < 1150 ? 1 : 1 - clamp((ms - 1150) / 350));
      if (ms > 860 && ms < 1060) { var k0 = (ms - 860) / 200, gr = c.createRadialGradient(S.W / 2, S.H / 2, 0, S.W / 2, S.H / 2, 380); gr.addColorStop(0, 'rgba(220,250,255,' + .5 * (1 - k0) + ')'); gr.addColorStop(1, 'rgba(61,230,255,0)'); c.fillStyle = gr; c.fillRect(-MG, -MG, S.W + 2 * MG, S.H + 2 * MG); }
      if (ms < 1380) {
        clr(q); q.globalAlpha = clamp((ms - 880) / 140); q.fillStyle = '#fff'; q.fillRect(0, 0, QS, QS); q.globalAlpha = 1; q.fillStyle = '#000';
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        parts.forEach(function (p) {
          if (ms < p.ts) return;
          if (ms < p.ta) {
            var k = (ms - p.ts) / (p.ta - p.ts), e = k * k * k, k1 = Math.max(0, k - .1), e0 = k1 * k1 * k1;
            c.strokeStyle = 'rgba(160,245,255,' + (.35 + .65 * k) + ')'; c.lineWidth = 1 + k * 2; c.beginPath(); c.moveTo(lerp(p.sx, p.tx, e0) + M / 2, lerp(p.sy, p.ty, e0) + M / 2); c.lineTo(lerp(p.sx, p.tx, e) + M / 2, lerp(p.sy, p.ty, e) + M / 2); c.stroke();
          } else { q.fillRect(p.mx, p.my, M, M); var k2 = (ms - p.ta) / 150; if (k2 < 1) { var g = 1 + k2 * 7; c.strokeStyle = 'rgba(61,230,255,' + (1 - k2) + ')'; c.lineWidth = 1.5; c.strokeRect(p.tx - g, p.ty - g, M + 2 * g, M + 2 * g); } }
        });
        c.restore();
      } else {
        if (!locked) { locked = true; qaOff(S); br.forEach(function (b) { A(S, b, [{ transform: 'scale(1.6)', opacity: .3 }, { transform: 'scale(1)', opacity: 1 }], { duration: 120, easing: 'cubic-bezier(.2,1.4,.4,1)' }); }); }
        var k3 = (ms - 1380) / 120, g2 = 14 - k3 * 10; c.strokeStyle = 'rgba(255,255,255,' + (1 - k3) + ')'; c.lineWidth = 2; c.strokeRect(P.x - g2, P.y - g2, QS + 2 * g2, QS + 2 * g2);
      }
    });
  }
  /* back to the front: a quick plain turn */
  function turnFront(S) {
    home(S); go(S);
    A(S, S.flip, [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: 400, easing: 'cubic-bezier(.4,0,.2,1)' });
    return timeline(400, function () {});
  }
  function settle(S, side) {
    S.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); S.anims = [];
    if (side === 'back' && S.mode === 'tractor') { S.slot.textContent = ''; S.slot.appendChild(S.ship); }
    else { home(S); if (side === 'back') S.slot.innerHTML = '<div class="term">' + TERM + '</div>'; }
    S.extra.forEach(function (e) { e.remove(); }); S.extra = [];
    S.stage.classList.remove('a3d'); S.flip.style.cssText = '';
    [S.fx, S.bg].forEach(function (c) { c.width = 0; c.height = 0; c.style.width = '0px'; c.style.height = '0px'; });
    qaOff(S);
    S.side = side; S.stage.dataset.side = side; if (side === 'back') align(S);
    S.stage.setAttribute('aria-label', side === 'front' ? S.label + '. Press to turn the card over to a QR code.' : 'Back of the share card: a QR code that opens ' + cfg.url + '. Press to turn the card back.');
  }
  function turn(S) {
    if (S.busy || !S.stage.isConnected) return;
    var side = S.side === 'front' ? 'back' : 'front';
    if (side === 'back') S.mode = flips++ % 2 ? 'warp' : 'tractor';
    S.busy = true;
    new Promise(function (res) { res(reduce ? 0 : side === 'front' ? turnFront(S) : S.mode === 'tractor' ? tractor(S) : warpJump(S)); })
      .catch(function (e) { if (window.console) console.error(e); })
      .then(function () { settle(S, side); S.busy = false; });
  }
  /* nudge the code by under a pixel so its edges land on whole screen pixels: a code half a pixel off shows a grey seam */
  var live = null;
  function align(S) {
    var box = S.qr.parentNode, D = window.devicePixelRatio || 1; box.style.left = box.style.top = '0px';
    var r = S.qr.getBoundingClientRect(), fx = r.left * D - Math.round(r.left * D), fy = r.top * D - Math.round(r.top * D);
    box.style.left = (-fx / D) + 'px'; box.style.top = (-fy / D) + 'px';
  }
  addEventListener('resize', function () { if (live && live.side === 'back' && live.stage.isConnected) align(live); });
  function flipSetup(stage) {
    var Q = window.MBQR, front = stage.querySelector('.cfront');
    var S = { stage: stage, flip: stage.querySelector('.cf-in'), front: front, back: stage.querySelector('.cback'), slot: stage.querySelector('.slot'), ship: front.querySelector('.ship'),
      fx: stage.querySelector('.cf-fx'), bg: stage.querySelector('.cf-bg'), qr: stage.querySelector('.qr'), qa: stage.querySelector('.qa'),
      N: Q.size, side: 'front', busy: false, anims: [], extra: [], label: front.getAttribute('aria-label') || 'Share card' };
    S.W = stage.clientWidth; S.H = stage.clientHeight;
    /* whole-pixel module size: the code plus its 4-module margin fits the card and is never wider than 246 pixels */
    var room = Math.floor(S.W * .89) - 20; S.mod = Math.max(1, Math.floor(Math.min(246, room) / (S.N + 8))); S.qs = S.mod * (S.N + 8);
    var box = stage.querySelector('.qrbox'); box.style.width = box.style.height = (S.qs + 20) + 'px';
    [S.qr, S.qa].forEach(function (c) { c.style.width = c.style.height = S.qs + 'px'; });
    drawQR(S);
    var D = dpr(); S.qa.width = S.qa.height = Math.round(S.qs * D); S.qac = S.qa.getContext('2d'); S.qac.setTransform(D, 0, 0, D, 0, 0);
    settle(S, 'front'); live = S;
    stage.addEventListener('click', function () { turn(S); });
    stage.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) turn(S); } });
  }
  function showCard(sheet) {
    var box = sheet.querySelector('[data-card]'), m = stats();
    box.innerHTML = flippable() ? stageHTML(m) : cardHTML(m);
    box.querySelectorAll('canvas[data-net]').forEach(net); pilot(box);
    var st = box.querySelector('.cflip'); if (st) flipSetup(st);
  }
  function share() {
    var m = stats();
    who = m.S.pilot === 'kimchi' && window.CHARLEE ? 'charlee' : 'kimchi'; m.S.pilot = who; cfg.save();
    var sheet = el('<div class="cc-sheet" style="max-width:400px" aria-labelledby="ccShareH"><div class="cc-top"><h3 id="ccShareH">Your share card</h3><button class="cc-x" data-close aria-label="Close">×</button></div>' +
      '<label class="cc-name">First name on the card (kept on this device only)<input id="ccName" maxlength="16" autocomplete="given-name" value="' + esc(m.S.name || '') + '" placeholder="Leave blank for anonymous"></label>' +
      '<div data-card></div><p class="cc-note">Take a screenshot to share it. It shows your first name, rank, score and streak, and nothing else.' + (flippable() ? ' Tap the card to turn it over to a QR code that opens the brief.' : '') + '</p></div>');
    overlay(sheet, function () {
      showCard(sheet);
      sheet.querySelector('#ccName').addEventListener('input', function (e) { var S = cfg.state(); S.name = e.target.value.trim().slice(0, 16); cfg.save(); showCard(sheet); });
    });
  }

  /* ---- Move my progress (plan 14). Progress lives in this browser only, under one web address.
     Copy code gives the same code as the Progress sheet's backup (keep.js: MB.1z.<data>.<check>);
     Paste code takes one back. A pasted code is never run and never put on the page as HTML:
     it must carry this brief's prefix and an unbroken check, decode, parse, stay under a size
     limit and have exactly the shape and types of saved progress, or nothing changes. ---- */
  var CODE_MAX = 60000, STATE_MAX = 1000000, ISO = /^\d{4}-\d{2}-\d{2}$/;
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function isInt(n) { return typeof n === 'number' && n >= 0 && n <= 1e9 && Math.floor(n) === n; }
  function isNum(n) { return typeof n === 'number' && isFinite(n) && n >= 0; }
  function opt(v, test) { return v == null || test(v); }
  function validState(s) {
    try { if (!isObj(s) || JSON.stringify(s).length > STATE_MAX) return false; } catch (e) { return false; }
    if (!isObj(s.days) || !isObj(s.tags) || !opt(s.points, isNum)) return false;
    var ok = Object.keys(s.days).every(function (k) { var d = s.days[k]; return k.length <= 40 && isObj(d) && isInt(d.score) && isInt(d.total) && d.score <= d.total && opt(d.points, isNum) && opt(d.at, isNum); });
    ok = ok && ['AI', 'Tech', 'Cyber'].every(function (t) { return Object.prototype.hasOwnProperty.call(s.tags, t); }) &&
      Object.keys(s.tags).every(function (t) { var v = s.tags[t]; return Array.isArray(v) && v.length === 2 && isInt(v[0]) && isInt(v[1]); });
    ok = ok && ['lessons', 'course', 'badges', 'prog', 'read', 'kimchi'].every(function (k) { return opt(s[k], isObj); });
    ok = ok && opt(s.review, function (r) { return Array.isArray(r) && r.every(function (x) { return isObj(x) && typeof x.q === 'string' && typeof x.tag === 'string' && Array.isArray(x.options) && x.options.every(function (o) { return typeof o === 'string'; }) && isInt(x.answer) && x.answer < x.options.length && isInt(x.box) && typeof x.due === 'string' && ISO.test(x.due); }); });
    /* yes-or-no flags: the page writes true, or 1 for rescored */
    ok = ok && ['sound', 'cleared', 'interviewWin', 'rescored'].every(function (k) { return opt(s[k], function (v) { return typeof v === 'boolean' || v === 0 || v === 1; }); });
    ok = ok && ['bonus', 'v2'].every(function (k) { return opt(s[k], isNum); });
    return ok && opt(s.name, function (v) { return typeof v === 'string' && v.length <= 16; }) && opt(s.pilot, function (v) { return v === 'kimchi' || v === 'charlee'; });
  }
  function codeError(msg) { var e = new Error(msg); e.keep = true; return e; }
  function makeCode(state) { return window.Keep ? Keep.make('MB', state) : Promise.reject(codeError('Progress codes are not available on this page.')); }
  function readCode(text) {
    var t = String(text == null ? '' : text);
    if (t.length > CODE_MAX) return Promise.reject(codeError('That code is far too long to be a progress code.'));
    if (!window.Keep) return Promise.reject(codeError('Progress codes are not available on this page.'));
    return Keep.read('MB', t).then(function (r) {
      if (!validState(r.s)) throw codeError('That code does not hold progress for this brief. Nothing was changed.');
      return r;
    }, function (e) { throw e && e.keep ? codeError(e.message.replace('backup code', 'progress code')) : codeError('That code did not work. Nothing was changed.'); });
  }
  function describe(s) {
    var n = Object.keys(s.days || {}).filter(function (k) { return ISO.test(k); }).length;
    return fmt(s.points || 0) + ' points from ' + n + (n === 1 ? ' quiz day' : ' quiz days');
  }
  function node(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function moveBox() {
    var box = node('section', 'gcard move'), st = node('p', 'mv-status'), out = node('textarea', 'mv-code'), inp = node('textarea', 'mv-in');
    box.setAttribute('aria-label', 'Move my progress');
    box.append(node('span', 'lab', 'Move my progress'), node('h2', null, 'Keep your streak on a new address or phone'),
      node('p', null, 'Your streak and points are saved in this browser only. Copy your code here, then paste it on the new page. The code is never sent anywhere.'));
    var row = node('div', 'mv-row'), cp = node('button', 'btn', 'Copy code'), ps = node('button', 'btn alt', 'Paste code');
    cp.type = ps.type = 'button'; row.append(cp, ps); box.append(row);
    out.readOnly = true; out.rows = 3; out.hidden = true; out.setAttribute('aria-label', 'Your progress code');
    var pa = node('div', 'mv-paste'); pa.hidden = true;
    inp.rows = 3; inp.placeholder = 'Paste a progress code here'; inp.setAttribute('aria-label', 'Progress code to paste in'); inp.setAttribute('spellcheck', 'false');
    var use = node('button', 'btn', 'Use this code'); use.type = 'button'; pa.append(inp, use);
    var ask = node('div', 'mv-ask'); ask.hidden = true;
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    box.append(out, pa, ask, st);
    function say(t) { st.textContent = t; }
    cp.addEventListener('click', function () {
      var made = makeCode(cfg.state()), copied;
      /* the clipboard is written inside the click, so phones allow it; the code also shows below to copy by hand */
      try {
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) copied = navigator.clipboard.write([new ClipboardItem({ 'text/plain': made.then(function (c) { return new Blob([c], { type: 'text/plain' }); }) })]);
        else if (navigator.clipboard && navigator.clipboard.writeText) copied = made.then(function (c) { return navigator.clipboard.writeText(c); });
        else copied = Promise.reject(0);
      } catch (e) { copied = Promise.reject(e); }
      copied = copied.then(function () { return true; }, function () { return false; });
      made.then(function (code) {
        out.value = code; out.hidden = false;
        return copied;
      }).then(function (ok) {
        say(ok ? 'Copied. Keep it somewhere safe, such as your notes app, then paste it on the new page. It holds ' + describe(cfg.state()) + '.'
          : 'Select the code above and copy it. It holds ' + describe(cfg.state()) + '.');
        if (!ok) { out.focus(); out.select(); }
      }, function () { say('Could not make a code in this browser.'); });
    });
    ps.addEventListener('click', function () { pa.hidden = false; ask.hidden = true; say(''); inp.focus(); });
    use.addEventListener('click', function () {
      ask.hidden = true; ask.textContent = '';
      readCode(inp.value).then(function (r) {
        var now = cfg.state(), had = Object.keys(now.days || {}).length || now.points;
        ask.append(node('p', null, had ? 'This replaces the progress in this browser (' + describe(now) + ') with the progress in the code (' + describe(r.s) + ').'
          : 'This loads the progress in the code (' + describe(r.s) + ').'));
        var yes = node('button', 'btn', had ? 'Yes, replace it' : 'Yes, load it'), no = node('button', 'btn alt', 'Cancel');
        yes.type = no.type = 'button';
        yes.addEventListener('click', function () { ask.hidden = true; ask.textContent = ''; inp.value = ''; pa.hidden = true; cfg.replace(r.s); paint(true); say('Done. This browser now has ' + describe(cfg.state()) + '.'); });
        no.addEventListener('click', function () { ask.hidden = true; ask.textContent = ''; say('Nothing changed.'); });
        ask.append(yes, no); ask.hidden = false; say('');
      }, function (e) { say(e && e.keep ? e.message : 'That code did not work. Nothing was changed.'); });
    });
    return box;
  }
  /* the cat now in the share card's ship (Kimchi until the card has been opened); read only, never saved. Used by tour.js. */
  function pilotNow() { var S = cfg && cfg.state(); return S && S.pilot === 'charlee' && window.CHARLEE ? 'charlee' : 'kimchi'; }
  window.MBScores = { init: function (c) { cfg = c; paint(false); }, paint: paint, panel: panel, share: share, moveBox: moveBox,
    pilotNow: pilotNow, shipHTML: shipHTML, mountPilot: pilot,
    code: { make: makeCode, read: readCode, valid: validState } };
})();
