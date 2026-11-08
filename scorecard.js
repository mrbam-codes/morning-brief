/* Morning brief: score badge (top right), My scores panel and the Terminal x Neon
   share card. Scoring itself is ScoreCore (scorecore.js); the page passes in its
   saved state through MBScores.init. Nothing leaves this browser. */
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
    var chips = td ? (td.perfect ? '<span class="p">PERFECT ' + m.tdRaw.score + '/' + m.tdRaw.total + '</span>' : '<span>' + m.tdRaw.score + '/' + m.tdRaw.total + ' CORRECT</span>') : '<span>NO QUIZ YET TODAY</span>';
    chips += '<span>×' + mult + ' STREAK</span>' + (td && td.perfect ? '<span>+20 BONUS</span>' : '');
    var name = (m.S.name || 'anonymous').toLowerCase().slice(0, 16);
    return '<div class="card e" style="--p:' + Math.round(rk.toTop * 100) + '%" aria-label="Share card: ' + rk.name + ', ' + pts + ' points today">' +
      '<canvas data-net></canvas><div class="hd"><span>' + esc(cfg.label) + ' // DAY ' + cfg.day() + '</span><span>v1</span></div>' +
      '<div>&gt; whoami<br>' + esc(name) + ' <span class="ok">AUTH OK</span></div><div class="lbl">&gt; status --today</div>' +
      '<div class="mid"><div class="ring"><div><b>' + rk.name.toUpperCase() + '</b><span>RANK ' + rk.index + '/' + rk.of + '</span></div></div><div class="big">' + pts + '<small>POINTS TODAY</small></div></div>' +
      '<div class="chips">' + chips + '</div><div class="lbl">&gt; rank --next</div>' +
      '<div class="bar">[' + bar + '] ' + fmt(m.S.points) + (rk.next ? '/' + fmt(rk.ceil) : '') + '</div>' +
      '<div class="lbl">' + (rk.next ? fmt(rk.toNext) + ' pts to ' + rk.next.toUpperCase() : 'TOP RANK: ' + rk.name.toUpperCase()) + '</div>' +
      '<div class="row"><span>STREAK</span><span>' + m.run + (m.run === 1 ? ' DAY' : ' DAYS') + ' 🔥</span></div>' +
      '<div class="row"><span>QUIZZES</span><span>' + Object.keys(m.R.day).length + '</span></div>' +
      '<div class="foot"><span>&gt; _<span class="cur"></span></span><span>' + esc(cfg.foot) + '</span></div></div>';
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
  function share() {
    var m = stats();
    var sheet = el('<div class="cc-sheet" style="max-width:400px" aria-labelledby="ccShareH"><div class="cc-top"><h3 id="ccShareH">Your share card</h3><button class="cc-x" data-close aria-label="Close">×</button></div>' +
      '<label class="cc-name">First name on the card (kept on this device only)<input id="ccName" maxlength="16" autocomplete="given-name" value="' + esc(m.S.name || '') + '" placeholder="Leave blank for anonymous"></label>' +
      '<div data-card>' + cardHTML(m) + '</div><p class="cc-note">Take a screenshot to share it. It shows your first name, rank, score and streak, and nothing else.</p></div>');
    overlay(sheet, function () {
      net(sheet.querySelector('canvas'));
      sheet.querySelector('#ccName').addEventListener('input', function (e) { var S = cfg.state(); S.name = e.target.value.trim().slice(0, 16); cfg.save(); sheet.querySelector('[data-card]').innerHTML = cardHTML(stats()); net(sheet.querySelector('canvas')); });
    });
  }
  window.MBScores = { init: function (c) { cfg = c; paint(false); }, paint: paint, panel: panel, share: share };
})();
