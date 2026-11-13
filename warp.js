/* warp.js: Today's quiz as Warp Run (plan 23), from the approved mock-up
   (morning-brief-directions/quiz-warp-run.html). Kimchi and Charlee fly their ship through one charge ring
   per question. A right answer flies through the ring and charges a fuel cell; a wrong one is a kind detour
   with no cell, and the "why" in the ship's log does the teaching. The score picks one of five endings.
   Rules:
   - Scoring is the page's, untouched. This file never adds points, saves progress or works out a score: it
     hands every pick to the page (o.each, the same save as before) and the finished picks to the page's own
     finishDay (o.finish), then shows what the page returns. Fuel is display only.
   - Practice (the missed ones, or the whole quiz again once today is done) calls nothing on the page, so it
     is never scored and never touches the streak, exactly like a replay before.
   - Cells: one per question (5 on weekdays, 7 at weekends). Home needs all but one of them (4 of 5, 6 of 7);
     one cell short docks at the lookout moon; 1 or more right but further short is the fuel stop; 0 is a tow.
   - The pilot swaps daily (from the edition's day number). Ship and cat art come from scorecard.js
     (MBScores.shipHTML and mountPilot); the cat files are never touched.
   - The drawing runs only while the quiz is on screen and the page is visible. With reduced motion every
     scene is a still picture, there is no countdown, and everything still plays. Answers are real buttons
     (also keys A to D or 1 to 4), results go to a polite live region. No sound, no outside requests. Text
     goes in with textContent only. */
(function(){
'use strict';
/* Home is drawn as the cats' bed ('bed'). 'house' brings back the first house, its drawing and its words, exactly. */
var HOME_ART='bed',BED=HOME_ART!=='house';
var L='ABCD',TAGC={AI:'#ff2e6e',Tech:'#ffe600',Cyber:'#9a7bff'},NAME={kimchi:'Kimchi',charlee:'Charlee'};
var MONO="'IBM Plex Mono',ui-monospace,Menlo,monospace",DISP="Anton,Impact,'Arial Narrow',sans-serif";
var FLAME='<svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1c2 7 9 10 9 18a9 9 0 0 1-18 0c0-5 3-7 4-11 1 3 2 4 4 5-1-4 0-8 1-12z" fill="#ff7a1a"/><path d="M12 14c1 4 5 5 5 9a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 1-1-2 0-3 0-4z" fill="#ffe600"/></svg>';
function h(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function reduce(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}
function plural(n,one,many){return n+' '+(n===1?one:many)}
function ease(p){return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2}
function focusEl(e){try{e.focus({preventScroll:true})}catch(x){e.focus()}}
/* scroll so the element sits clear of the floating score badge (top right, about 84px tall) */
/* the line nothing should sit above: just under the floating score badge, read from where it really is (it sits
   lower on a notched phone), or just under the safe area when the badge is hidden during a run */
var insetEl=null;
function insetTop(){if(!insetEl){insetEl=document.createElement('div');insetEl.setAttribute('aria-hidden','true');insetEl.style.cssText='position:fixed;left:0;top:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';document.body.append(insetEl)}return insetEl.getBoundingClientRect().height}
function safeTop(){var b=document.querySelector('.cc-badge');if(b&&!document.body.classList.contains('wr-run')){var r=b.getBoundingClientRect();if(r.height)return Math.round(r.bottom)+8}return Math.round(insetTop())+8}
function toTop(e,always){var r=e.getBoundingClientRect(),s=safeTop();if(always?Math.abs(r.top-s)>4:(r.top<s-4||r.top>innerHeight*.5))scrollBy({top:r.top-s,behavior:reduce()?'auto':'smooth'})}
/* bring the next button into view, but never scroll the fuel gauge up under the badge: the scene may go, the gauge stays */
function scrollNear(e,keep){var r=e.getBoundingClientRect();if(r.bottom<=innerHeight)return;var d=r.bottom-innerHeight+12;if(keep)d=Math.min(d,keep.getBoundingClientRect().top-safeTop());if(d>0)scrollBy({top:d,behavior:reduce()?'auto':'smooth'})}
var HOMEOF=function(n){return n>=3?n-1:n};
function endFor(n,total){var H=HOMEOF(total);return n>=total?'full':n>=H?'last':n===H-1&&n>0?'sight':n>=1?'stop':'tow'}
var ENDS={
 full:{kick:'Ending · home with a full tank',head:'Home with a full tank',lines:function(P){return BED?'Every ring charged. '+P+' lands with a spare cell in the tank, the whole sky lights up, and the cat bed is warm and waiting.':'Every ring charged. '+P+' lands with a spare cell in the tank, and the whole sky lights up for the crew.'}},
 last:{kick:'Ending · home on the last cell',head:'Just made it home',lines:function(P,O,n){return n+' rings charged: exactly enough. The engine coughs on the final approach, then '+P+(BED?' touches down right beside the cat bed.':' touches down right outside the door.')}},
 sight:{kick:'Ending · one cell short',head:'Home is in sight',lines:function(P,O,n){return plural(n,'ring','rings')+' charged, one cell short. '+P+' docks at the lookout moon for the night, close enough to see '+(BED?'the night light by the cat bed':'the porch light')+'. Tomorrow starts with a fresh tank.'}},
 stop:{kick:'Ending · overnight stop',head:'Overnight at the fuel stop',lines:function(P,O,n){return plural(n,'ring','rings')+' charged: enough to reach the all-night fuel stop. Warm milk, a soft bunk, and a full tank waiting for tomorrow’s run.'}},
 tow:{kick:'Ending · a friendly tow',head:'A friendly tow for the night',lines:function(P,O){return 'No rings charged today, and that happens to every pilot. The tow tug hooks on and hums '+P+' and '+O+' to the depot, both asleep in the back. The rings are back tomorrow.'}}};

/* particles for the charge and the landing; nothing with reduced motion */
function FX(cv){var ctx=cv.getContext('2d'),P=[],on=false,W=0,H=0;
  function fit(){var r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(Math.abs(r.width-W)<1&&Math.abs(r.height-H)<1)return;W=r.width;H=r.height;cv.width=Math.max(1,W*d);cv.height=Math.max(1,H*d);ctx.setTransform(d,0,0,d,0,0)}
  function step(){if(!cv.isConnected){P=[];on=false;return}ctx.clearRect(0,0,W,H);P=P.filter(function(p){return p.life>0});P.forEach(function(p){p.vx*=p.drag;p.vy=p.vy*p.drag+p.g;p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;ctx.globalAlpha=Math.max(0,Math.min(1,p.life));ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s/2,0,7);ctx.fill()});ctx.globalAlpha=1;if(P.length)requestAnimationFrame(step);else{on=false;ctx.clearRect(0,0,W,H)}}
  return{burst:function(x,y,n,o){o=o||{};if(reduce()||document.hidden)return;fit();var cols=o.colors||['#ff2e6e','#ffe600','#7c4dff','#16b8f0','#3ddc97'];for(var k=0;k<n;k++){var a=Math.random()*Math.PI*2,sp=(o.speed||6)*(.3+Math.random());P.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp+(o.vy||0),g:o.g!=null?o.g:.12,drag:o.drag||.97,life:1,decay:o.decay||(.012+Math.random()*.012),s:(o.size||5)*(.6+Math.random()*.8),c:cols[k%cols.length]})}if(!on){on=true;requestAnimationFrame(step)}}}}

/* host: the page's quiz section (its class stays exactly "gcard quiz", which check.py looks for); the run is drawn
   in a .wr box inside it. o: items, titles {n: title}, cat, saved(), resume(), each(picks),
   finish(picks) -> the page's result, after(), dayLine() -> {points, math, streak, mult}, maxPoints(), progress() */
function mount(host,o){
  host.textContent='';host.dataset.warp='1';var root=h('div','wr');host.append(root);
  var items=o.items,N=items.length,HOME=HOMEOF(N),cat=o.cat==='charlee'&&window.CHARLEE?'charlee':'kimchi';
  var P=NAME[cat],O=NAME[cat==='kimchi'?'charlee':'kimchi'],tok=0,busy=false,keyPick=null,onScreen=false;
  root.dataset.cells=N;root.dataset.home=HOME;
  var later=function(fn,ms){var t=tok;return setTimeout(function(){if(t===tok&&root.isConnected)fn()},ms)};
  var T=function(ms){return reduce()?0:ms};
  var stage=h('div','w-stage'),cv=h('canvas'),fxc=h('canvas','fxc'),ov=h('div','w-ov'),pil=h('span','w-pil','Pilot: '+P);
  cv.setAttribute('aria-hidden','true');fxc.setAttribute('aria-hidden','true');ov.setAttribute('aria-hidden','true');
  var sw=h('div');sw.innerHTML=window.MBScores&&MBScores.shipHTML?MBScores.shipHTML(cat,'PILOT','-warp'):'';var ship=sw.firstChild||h('div','ship');
  stage.append(cv,ship,fxc,ov,pil);
  var fuel=h('div','fuel'),ftop=h('div','f-top'),fnum=h('b',null,'FUEL 0/'+N),cells=h('div','cells'),stat=h('p','f-status');
  ftop.append(fnum,h('span',null,'Home needs '+HOME+' cells'));
  var G=N>5?6:8,cl=[];for(var j=0;j<N;j++){var c0=h('i','cell');cells.append(c0);cl.push(c0)}
  cells.style.gridTemplateColumns='repeat('+N+',minmax(0,1fr))';cells.style.gap=G+'px';
  var hm=h('i','hm');hm.style.left='calc((100% - '+((N-1)*G)+'px) * '+(HOME/N)+' + '+((HOME-1)*G+G/2-1)+'px)';hm.append(h('span',null,'HOME'));cells.append(hm);
  cells.setAttribute('role','img');fuel.append(ftop,cells,stat);
  var body=h('div','w-body'),live=h('p','w-sr');live.setAttribute('aria-live','polite');
  root.append(stage,fuel,body,live);
  var fx=FX(fxc),ctx=cv.getContext('2d'),W=330,H=220;
  function fit(){var r=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=Math.max(200,r.width);H=r.height||220;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0)}
  var stars=[];for(var s0=0;s0<110;s0++)stars.push({x:Math.random(),y:Math.random(),z:.2+Math.random()*.8});
  var S={anim:null,ring:null,end:null,cells:0},last=performance.now();
  function say(t){live.textContent='';setTimeout(function(){live.textContent=t},40)}
  function go(k,dur){S.anim=reduce()?null:{k:k,t0:performance.now(),dur:dur}}
  function setCells(n,flash){S.cells=n;cells.dataset.cells=n;fnum.textContent='FUEL '+n+'/'+N;
    cl.forEach(function(c,k){c.classList.toggle('on',k<n);if(flash&&k===n-1&&!reduce()){c.classList.remove('charge');void c.offsetWidth;c.classList.add('charge')}});
    cells.setAttribute('aria-label','Fuel: '+n+' of '+N+' cells charged. Home needs '+HOME+'.')}
  function status(left){var n=S.cells,need=HOME-n;stat.textContent='';
    if(left==null){stat.append('Charge '+HOME+' of the '+N+' rings to get home.');return}
    if(need<=0)stat.append(h('b',null,'Home is in the tank. '),n<N?'Every extra cell is a bigger welcome.':'Full tank.');
    else if(need>left)stat.append(h('b',null,n+' charged. '),'Home is out of reach today, but every cell still takes you further.');
    else stat.append(h('b',null,n+' charged. '),need+' more for home, '+plural(left,'ring','rings')+' left.')}
  /* the real ship is HTML laid over the canvas */
  function shipPos(now){var x=84,y=H*.44,warp=0,shield=0,sc=1,rot=0,a=S.anim,rm=reduce();if(!rm)y+=Math.sin(now/600)*3;
    if(S.end){var E=S.end,p=rm?1:Math.min(1,(now-E.t0)/E.dur),e=ease(p);x=E.x0+(E.x-E.x0)*e;y=E.y0+(E.y-E.y0)*e;sc=E.s0+(E.s-E.s0)*e;rot=E.rot*e;if(E.jit&&p<1&&!rm)y+=Math.sin(now/40)*2;E.p=p;
      if(E.k==='tow'&&!rm)y+=Math.sin(now/700)*3;return{x:x,y:y,warp:0,shield:0,s:sc,rot:rot,flip:!!E.flip}}
    if(a){var q=Math.min(1,(now-a.t0)/a.dur);
      if(a.k==='launch'){x=-70+154*ease(q);warp=(1-q)*.8}
      else if(a.k==='boost'){warp=Math.sin(Math.PI*q);x=q<.5?84+(W+100-84)*ease(q/.5):-90+174*ease((q-.5)/.5)}
      else if(a.k==='detour'){var gx=S.ring?S.ring.tx:W-90;shield=q<.75?1:(1-q)/.25;if(q<.55){var u=q/.55;x=84+(gx+64-84)*ease(u);y-=Math.sin(u*Math.PI)*58*H/220}else if(q<.8)x=gx+64+(W+100-gx-64)*((q-.55)/.25);else x=-90+174*ease((q-.8)/.2)}
      if(q>=1)S.anim=null}
    return{x:x,y:y,warp:warp,shield:shield,s:sc,rot:rot}}
  function place(sp){ship.style.transform='translate('+(sp.x-56).toFixed(1)+'px,'+(sp.y-33.5).toFixed(1)+'px) rotate('+sp.rot+'deg) scale('+(sp.flip?-sp.s:sp.s)+','+sp.s+')';ship.classList.toggle('boost',sp.warp>.25);
    if(S.end){ship.classList.toggle('off',S.end.k==='tow'||S.end.p>=1);ship.classList.toggle('sput',!!S.end.jit&&S.end.p<1)}else ship.classList.remove('off','sput')}
  function drawShield(sp){if(sp.shield<=0)return;ctx.save();ctx.globalAlpha=sp.shield*.75;ctx.strokeStyle='#7fd8ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(sp.x,sp.y-4,64,42,0,0,7);ctx.stroke();ctx.globalAlpha=sp.shield*.12;ctx.fillStyle='#7fd8ff';ctx.fill();ctx.restore()}
  function drawRing(now){var R=S.ring,rm=reduce(),p=rm?1:Math.min(1,(now-R.t0)/700),gx=R.tx+(W+40-R.tx)*(1-ease(p)),cy=H*.44,col=R.c,ry=Math.min(62,H*.4),rx=16,al=1,lw=3+(rm?0:Math.sin(now/220)*1.2);
    if(R.state==='clear'){var q=rm?1:Math.max(0,Math.min(1,(now-R.t1)/700));col='#3ddc97';ry=62+q*70;rx=16+q*26;al=1-q;lw=4+q*8}else if(R.state==='detour'){col='#ffb347';lw=3;al=.7}
    if(al<=.01)return;ctx.save();ctx.globalAlpha=al;ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.shadowColor=col;ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(gx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();
    if(R.state==='wait'){ctx.fillStyle='#fff';for(var k=0;k<4;k++){var a=(rm?0:now/350)+k*Math.PI/2;ctx.beginPath();ctx.arc(gx+Math.cos(a)*rx,cy+Math.sin(a)*ry,2.6,0,7);ctx.fill()}}
    ctx.shadowBlur=0;ctx.fillStyle=col;ctx.font='600 12px '+MONO;ctx.textAlign='center';ctx.fillText('RING '+R.n,gx,cy+ry+18);ctx.restore()}
  function sky(top,bot){var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bot);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
  function drawStars(w,dt,still){var rm=reduce();stars.forEach(function(s){if(!rm&&!still){s.x-=(.0016+w*.035)*s.z*dt;if(s.x<0){s.x+=1;s.y=Math.random()}}var X=s.x*W,Y=s.y*H;ctx.fillStyle=ctx.strokeStyle='rgba(220,230,255,'+(.3+s.z*.6)+')';if(w>.05){ctx.lineWidth=s.z*1.6;ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X+w*80*s.z,Y);ctx.stroke()}else ctx.fillRect(X,Y,s.z*2,s.z*2)})}
  /* scenery for the endings */
  /* the cats' bed: a round cushioned bed with a neon rim, a cyan blanket and a little night light behind it.
     Drawn upright on the ground at (x,y), tilted by rot to sit on a curved planet. */
  function bed(x,y,sc,rot,lit){ctx.save();ctx.translate(x,y);ctx.rotate(rot||0);ctx.scale(sc,sc);
    ctx.fillStyle='#8a7fb0';ctx.fillRect(25,-42,3,24);ctx.fillStyle=lit;ctx.shadowColor=lit;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(26.5,-44,5.5,0,7);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#a8287f';ctx.beginPath();ctx.ellipse(0,-18,31,14,0,0,7);ctx.fill();
    ctx.fillStyle='#2a1660';ctx.beginPath();ctx.ellipse(0,-19,24,9.5,0,0,7);ctx.fill();
    ctx.fillStyle='#d9ccff';ctx.beginPath();ctx.ellipse(0,-17.5,21,7.5,0,0,7);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-18,-25,13,7,3.5);else ctx.rect(-18,-25,13,7);ctx.fill();
    ctx.fillStyle='#3de6ff';ctx.beginPath();ctx.moveTo(-2,-21);ctx.quadraticCurveTo(9,-24,21,-19);ctx.lineTo(18,-11.5);ctx.quadraticCurveTo(7,-10,-4,-12.5);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#bff7ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(1,-17);ctx.quadraticCurveTo(9,-18.5,17,-16);ctx.stroke();
    ctx.shadowColor='#ff3df2';ctx.shadowBlur=14;ctx.fillStyle='#ff3df2';ctx.beginPath();ctx.moveTo(31,-18);ctx.lineTo(29,-5);ctx.ellipse(0,-5,29,7,0,0,Math.PI,false);ctx.lineTo(-31,-18);ctx.ellipse(0,-18,31,14,0,Math.PI,0,true);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#ffd1fb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-18,31,14,0,.15,Math.PI-.15);ctx.stroke();
    ctx.fillStyle='#5a0f52';ctx.beginPath();ctx.ellipse(0,-2.5,3.8,3,0,0,7);ctx.fill();[[-4.6,-7.4],[0,-9.2],[4.6,-7.4]].forEach(function(t){ctx.beginPath();ctx.arc(t[0],t[1],1.8,0,7);ctx.fill()});
    ctx.restore();root.dataset.drawn='bed'}
  function house(x,y,sc,lit){root.dataset.drawn='house';ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.fillStyle='#2a1a5e';ctx.fillRect(-13,-16,26,16);ctx.fillStyle='#ff3df2';ctx.beginPath();ctx.moveTo(-16,-16);ctx.lineTo(0,-29);ctx.lineTo(16,-16);ctx.closePath();ctx.fill();ctx.fillStyle=lit;ctx.shadowColor=lit;ctx.shadowBlur=14;ctx.fillRect(-9,-12,7,7);ctx.fillRect(3,-12,6,12);ctx.restore()}
  function planet(cx,cy,r,c1,c2,glow){ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=30;var g=ctx.createRadialGradient(cx-r*.3,cy-r*.35,r*.1,cx,cy,r);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();ctx.restore()}
  function surf(cx,cy,r,x){return cy-Math.sqrt(Math.max(0,r*r-(x-cx)*(x-cx)))}
  function scene(now){var E=S.end,k=E.k,rm=reduce(),t=rm?0:now,j;
    if(k==='full'||k==='last'){var full=k==='full';sky(full?'#1a0b45':'#2a0f3a',full?'#3a1670':'#5a2340');drawStars(0,0,true);
      if(full){for(j=0;j<3;j++){ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle=['#3ddc97','#3de6ff','#ff3df2'][j];ctx.lineWidth=16;ctx.beginPath();for(var x=0;x<=W;x+=10){var y=40+j*18+Math.sin(x/40+t/900+j)*10;if(x)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.stroke();ctx.restore()}}
      else{ctx.fillStyle='#ffb86b33';ctx.beginPath();ctx.arc(40,H-10,70,0,7);ctx.fill()}
      var cx=W-80,cy=H*.74,r=70;planet(cx,cy,r,full?'#7dffc8':'#ffb86b',full?'#127a6a':'#6b2a5e',full?'#3ddc97':'#ff9a6b');if(BED){var bx=cx+10;bed(bx,surf(cx,cy,r,bx)+3,1,0,full?'#ffe600':'#ffd28a')}else house(cx+40,surf(cx,cy,r,cx+40)+3,1,full?'#ffe600':'#ffd28a');
      if(!full&&E.p>=1){ctx.fillStyle='rgba(220,220,240,.35)';for(j=0;j<3;j++){ctx.beginPath();ctx.arc(E.x-50-j*10+(t/60)%6,E.y+14-j*7,6+j*2,0,7);ctx.fill()}}}
    else if(k==='sight'){sky('#0b0a2e','#1f1450');drawStars(0,0,true);var hx=48,hy=50;if(BED){planet(hx,hy,24,'#7dffc8','#127a6a','#3ddc97');bed(hx,hy-24+3,.62,0,'#ffe600')}else{planet(hx,hy,22,'#7dffc8','#127a6a','#3ddc97');house(hx+4,surf(hx,hy,22,hx+4)+2,.55,'#ffe600')}
      var mx=W*.62,my=H+112,mr=170;planet(mx,my,mr,'#8f86b8','#3a3260','#c9b8ff');ctx.fillStyle='#2a2450';[[-60,8],[30,14],[-10,4]].forEach(function(z){ctx.beginPath();ctx.arc(mx+z[0],surf(mx,my,mr,mx+z[0])+z[1]+4,z[1],0,7);ctx.fill()});
      var bx=mx-78,by=surf(mx,my,mr,bx);ctx.fillStyle='#c9b8ff';ctx.fillRect(bx-2,by-34,4,34);ctx.fillStyle=(rm||Math.sin(t/300)>0)?'#ffe600':'#6b5a00';ctx.beginPath();ctx.arc(bx,by-37,5,0,7);ctx.fill();
      var sx=E.x-40,sy=E.y-18;ctx.save();ctx.setLineDash([5,6]);ctx.strokeStyle='#ffe60099';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(hx+26,hy+8);ctx.stroke();ctx.restore();
      var lx=(sx+hx+26)/2+10,ly=(sy+hy+8)/2-16;ctx.font='600 12px '+MONO;ctx.textAlign='center';var tw=ctx.measureText('1 CELL SHORT').width+12;ctx.fillStyle='#0b0620e6';ctx.fillRect(lx-tw/2,ly-11,tw,17);ctx.fillStyle='#ffe600';ctx.fillText('1 CELL SHORT',lx,ly+2)}
    else if(k==='stop'){sky('#12082e','#2a0d4f');drawStars(0,0,true);var gy=H-44;ctx.fillStyle='#1d1240';ctx.fillRect(0,gy,W,44);ctx.fillStyle='#3a2a6e';ctx.fillRect(0,gy,W,3);
      for(var x2=10;x2<W;x2+=34){ctx.fillStyle=(rm||((x2/34|0)+(t/400|0))%2)?'#3de6ff':'#1a5a6a';ctx.fillRect(x2,gy+12,10,3)}
      var b2=W-148,bw=124;ctx.fillStyle='#2a1a5e';ctx.fillRect(b2,gy-62,bw,62);ctx.fillStyle='#ffd28a';ctx.shadowColor='#ffd28a';ctx.shadowBlur=10;for(j=0;j<3;j++)ctx.fillRect(b2+12+j*38,gy-44,24,18);ctx.shadowBlur=0;
      var lit=rm||Math.sin(t/260)>-.6;ctx.font='400 26px '+DISP;ctx.textAlign='center';ctx.fillStyle=lit?'#ff3df2':'#5a2050';ctx.shadowColor='#ff3df2';ctx.shadowBlur=lit?18:0;ctx.fillText('FUEL',b2+bw/2,gy-72);ctx.shadowBlur=0;
      ctx.font='600 12px '+MONO;ctx.fillStyle='#3de6ff';ctx.fillText('OPEN ALL NIGHT',b2+bw/2,gy-8);
      ctx.strokeStyle='#3de6ff66';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(E.x,gy+6,48,7,0,0,7);ctx.stroke();
      if(E.p>=1&&!rm){ctx.font='700 14px '+MONO;ctx.fillStyle='#c9b8ff';ctx.textAlign='left';var z=(t/700)%1;ctx.globalAlpha=1-z;ctx.fillText('z',E.x+6,E.y-40-z*16);ctx.globalAlpha=1}}
    else if(k==='tow'){sky('#0d0726','#1a0f40');drawStars(0,0,true);var tp=rm?1:Math.min(1,(now-E.t0)/1600),tx=W+80+(W*.78-W-80)*ease(tp),ty=H*.36+(rm?0:Math.sin(now/700)*3);
      if(tp>=1){ctx.save();ctx.fillStyle='rgba(255,230,0,.10)';ctx.beginPath();ctx.moveTo(tx-26,ty+4);ctx.lineTo(E.x+30,E.y-34);ctx.lineTo(E.x+30,E.y+30);ctx.lineTo(tx-26,ty+18);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffe600';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx-30,ty+12);ctx.quadraticCurveTo((tx+E.x)/2,ty+40,E.x+44,E.y);ctx.stroke();ctx.restore()}
      ctx.fillStyle='#ffb347';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(tx-32,ty-6,64,30,10);else ctx.rect(tx-32,ty-6,64,30);ctx.fill();ctx.fillStyle='#3a2410';ctx.fillRect(tx-20,ty+2,16,10);ctx.fillStyle='#bfe6ff';ctx.fillRect(tx+2,ty+1,18,12);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(tx+11,ty+7,1.6,0,7);ctx.fill();var bl=rm?1:(Math.sin(now/180)+1)/2;ctx.fillStyle='rgba(255,230,0,'+(.4+.6*bl)+')';ctx.shadowColor='#ffe600';ctx.shadowBlur=16*bl;ctx.beginPath();ctx.arc(tx,ty-10,5,0,7);ctx.fill();ctx.shadowBlur=0;
      ctx.font='600 12px '+MONO;ctx.fillStyle='#ffe600';ctx.textAlign='center';ctx.fillText('TOW',tx,ty+40);
      if(!rm){ctx.font='700 14px '+MONO;ctx.fillStyle='#c9b8ff';var zz=(now/800)%1;ctx.globalAlpha=1-zz;ctx.fillText('z',E.x+4,E.y-38-zz*16);ctx.globalAlpha=1}}}
  function draw(now){var dt=Math.min(3,(now-last)/16.7);last=now;ctx.clearRect(0,0,W,H);var sp=shipPos(now);
    if(S.end)scene(now);else{sky('#070418','#1a0b45');drawStars(sp.warp,dt,false);if(S.ring)drawRing(now);drawShield(sp)}
    place(sp)}
  /* the loop runs only while the quiz is on screen, the page is visible and motion is allowed; otherwise one still */
  var looping=false;
  function running(){return onScreen&&!document.hidden&&!reduce()&&root.isConnected}
  function loop(now){if(!running()){looping=false;return}draw(now);requestAnimationFrame(loop)}
  function sync(){root.classList.toggle('live',running());if(running()){if(!looping){looping=true;last=performance.now();requestAnimationFrame(loop)}}else if(root.isConnected)draw(performance.now())}
  function redraw(){if(!looping)draw(performance.now())}
  fit();
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){es.forEach(function(e){onScreen=e.isIntersecting});if(onScreen&&stale)pilotIn();sync()},{threshold:0}).observe(stage);else{onScreen=true;sync()}
  document.addEventListener('visibilitychange',sync);try{var mq=matchMedia('(prefers-reduced-motion: reduce)');if(mq.addEventListener)mq.addEventListener('change',sync)}catch(e){}
  if('ResizeObserver' in window){var ro=new ResizeObserver(function(){if(!root.isConnected){ro.disconnect();return}fit();redraw()});ro.observe(stage)}
  function pilotIn(){stale=false;try{if(window.MBScores&&MBScores.mountPilot)MBScores.mountPilot(ship,cat)}catch(e){}}
  /* one Kimchi runs at a time: the tour, the share card or the story he hides in stop this one. When that
     overlay closes, he gets back in the ship (now, or when the quiz is next on screen) */
  var stale=false;
  if(cat==='kimchi'&&'MutationObserver' in window)new MutationObserver(function(ms){if(!root.isConnected)return;var gone=ms.some(function(m){return [].some.call(m.removedNodes,function(n){return n.nodeType===1&&/(^| )(sheet|cc-over|tr)( |$)/.test(n.className||'')})});
    if(gone&&!document.querySelector('.sheet,.cc-over,.tr')){stale=true;if(onScreen)pilotIn()}}).observe(document.body,{childList:true});
  /* during a run the scene is compact and the badge steps aside, so a question and its answers fit one screen */
  function setRun(on){root.classList.toggle('compact',on);document.body.classList.toggle('wr-run',on);fit()}
  pilotIn();
  function ovShow(a,b,cls){ov.className='w-ov';ov.textContent='';ov.append(h('b','slam'+(cls?' '+cls:''),a));if(b){var y=h('span','slam',b);y.style.animationDelay='.12s';ov.append(y)}}
  function ovHide(ms){later(function(){ov.classList.add('fade');later(function(){ov.textContent='';ov.className='w-ov'},T(500))},T(ms))}
  function orb(toCell,done){if(reduce()||!root.animate){done();return}var R=root.getBoundingClientRect(),c=toCell.getBoundingClientRect(),x0=S.ring.tx,y0=H*.44,x1=c.left-R.left+c.width/2,y1=c.top-R.top+c.height/2;
    var b=h('i','orb');b.setAttribute('aria-hidden','true');root.append(b);var a=b.animate([{transform:'translate('+x0+'px,'+y0+'px) scale(1.6)'},{transform:'translate('+((x0+x1)/2+40)+'px,'+(Math.min(y0,y1)-10)+'px) scale(1.2)',offset:.45},{transform:'translate('+x1+'px,'+y1+'px) scale(.7)'}],{duration:750,easing:'cubic-bezier(.4,0,.6,1)'});
    var fin=false,f=function(){if(fin)return;fin=true;b.remove();done()};a.onfinish=f;later(f,1200)}
  function btn(txt,cls,act,fn){var b=h('button','btnx'+(cls?' '+cls:''),txt);b.type='button';b.dataset.act=act;b.addEventListener('click',fn);return b}
  function kindLine(it){return it.kind==='review'||it.kind==='recap'?'revision':it.kind==='news'?'news':it.n?'lesson '+it.n:''}
  function subLine(it){var t=it.n&&o.titles?o.titles[it.n]:null;if(it.kind==='review'||it.kind==='recap'){var r=it.title||t;return it.n?'Revision of lesson '+it.n+(r?': '+r:''):'Revision'}if(it.kind==='news')return 'From today’s news';return it.n?'Lesson '+it.n+(t?': '+t:''):''}

  /* one run: the quiz itself, a practice replay of the whole quiz, or practice on the missed ones */
  var run=null;
  function reset(){tok++;keyPick=null;S.ring=null;S.anim=null;S.end=null;ov.textContent='';ov.className='w-ov';body.textContent='';delete root.dataset.ending;cells.classList.remove('party');cl.forEach(function(c){c.classList.remove('low','charge')})}
  function intro(){reset();setRun(false);busy=false;var resume=o.resume().slice(0,N),done=resume.length;
    var right=resume.filter(function(k,j){return k===items[j].answer}).length;setCells(right);status(done?N-done:null);
    var ul=h('ul','w-les'),rv=[];items.forEach(function(it){if(it.kind==='review'||it.kind==='recap'){if(it.n&&rv.indexOf(it.n)<0)rv.push(it.n);return}
      var li=h('li',null,it.tag+' · '+(it.kind==='news'?'news':it.n?'lesson '+it.n+(o.titles&&o.titles[it.n]?': '+o.titles[it.n]:''):'question'));li.style.setProperty('--c',TAGC[it.tag]||'#c9b8ff');ul.append(li)});
    if(rv.length){var r=h('li',null,'Revision: '+(rv.length===1?'lesson '+rv[0]:'lessons '+rv.slice(0,-1).join(', ')+' and '+rv[rv.length-1]));r.style.setProperty('--c','#c9b8ff');ul.append(r)}
    var b=btn(done?'Resume quiz':'Launch','','start',function(){launch(resume)});
    body.append(h('span','kick','Today’s quiz'),h('h2','w-q',done?'You are '+plural(done,'question','questions')+' in':N+' charge rings between the cats and home'),
      h('p','w-sub',done?'Pick up where you left off. '+plural(right,'cell is','cells are')+' already charged.':'Each right answer flies the ship through a ring and charges a fuel cell. '+HOME+' cells get '+P+' home. Up to '+o.maxPoints()+' points today.'),b,ul);
    redraw()}
  function launch(resume){var b=body.querySelector('[data-act=start]');if(b)b.disabled=true;busy=true;setRun(true);toTop(root,true);
    var picks=resume.slice(),right=0,missed=[];picks.forEach(function(k,j){if(k===items[j].answer)right++;else missed.push(items[j])});
    run={mode:'quiz',items:items,i:picks.length,picks:picks,right:right,missed:missed,locked:true};
    go('launch',900);if(reduce()){begin();return}
    ['3','2','1'].forEach(function(n,j){later(function(){ovShow(n,null,'cd')},j*380)});later(function(){ovShow('GO');ovHide(250);begin()},3*380)}
  function begin(){if(run.i>=run.items.length){next(true);return}keyPick=pick;question()}
  function question(){var it=run.items[run.i],i=run.i,n=run.items.length,pr=run.mode!=='quiz';run.locked=false;
    S.ring={n:i+1,tx:W-86,c:TAGC[it.tag]||'#c9b8ff',state:'wait',t0:performance.now()};status(n-i);redraw();
    body.textContent='';var q=h('h2','w-q',it.q);q.tabIndex=-1;var list=h('div','w-opts');run.res=h('div');
    var kick=run.mode==='missed'?'Practice · missed '+(i+1)+' of '+n+' · no points':(run.mode==='replay'?'Practice · ring ':'Ring ')+(i+1)+' of '+n+' · '+it.tag+(kindLine(it)?' · '+kindLine(it):'')+(run.mode==='replay'?' · no points':'');
    var sub=subLine(it);body.append(h('span','kick',kick));if(sub)body.append(h('p','w-sub',sub));body.append(q,list,run.res);
    run.bs=it.options.map(function(t,k){var b=h('button','w-opt');b.type='button';b.dataset.k=k;b.append(h('b','ol',L[k]),h('span','ot',t));b.addEventListener('click',function(){pick(k)});list.append(b);return b});
    toTop(root,true);focusEl(q)}
  function pick(k){if(!run||run.locked||!run.bs)return;var it=run.items[run.i];if(k<0||k>=it.options.length)return;run.locked=true;var ok=k===it.answer,pr=run.mode!=='quiz';
    run.bs.forEach(function(b,j){b.disabled=true;var tg=b.querySelector('.ot');if(j===it.answer){b.classList.add('ok');tg.append(h('em','otag',k===j?'Your pick: right':'Right answer'))}else if(j===k){b.classList.add('no');tg.append(h('em','otag','Your pick'))}else b.hidden=true});
    if(ok){run.right++;run.bs[k].classList.add('hit')}else run.missed.push(it);
    if(run.mode==='quiz'){run.picks[run.i]=k;o.each(run.picks.slice())}
    var nowCells=Math.min(N,S.cells+(ok?1:0));
    say((ok?'Right. Ring charged: fuel '+nowCells+' of '+N+'.'+(pr?'':' Plus 10 points.'):'Not quite. The answer is '+L[it.answer]+': '+it.options[it.answer]+'. No charge this time.')+' '+it.why);
    var R=S.ring;
    if(ok){R.state='clear';R.t1=performance.now()+300;go('boost',1300);ovShow('CHARGED',pr?'+1 cell · practice, no points':'+1 cell · +10 points');ovHide(1200);
      var target=cl[Math.min(N-1,S.cells)],left=run.items.length-run.i-1;
      if(reduce()){setCells(nowCells,false);status(left)}
      else later(function(){fx.burst(R.tx,H*.44,46,{speed:7,g:.04,colors:['#3ddc97','#ffe600','#3de6ff','#ffffff']});orb(target,function(){setCells(nowCells,true);status(left)})},380)}
    else{R.state='detour';go('detour',1600);ovShow('DETOUR','No charge this time','soft');ovHide(1300);status(run.items.length-run.i-1)}
    redraw();
    later(function(){var lg=h('div','w-log in'+(ok?'':' no'));lg.append(h('span','kick',ok?'Ship’s log · ring charged':'Ship’s log · course corrected'),h('p',null,(ok?(pr?'Right. ':'Correct, +10 points. '):'Not quite: the answer is '+L[it.answer]+'. ')+it.why));
      var lastQ=run.i+1>=run.items.length,nx=btn(lastQ?(run.mode==='missed'?'See where the fuel gets you →':run.mode==='replay'?'Land and see the practice score →':'Land and see my score →'):'Fly to ring '+(run.i+2)+' →','','next',function(){next(false)});
      run.res.append(lg,nx);focusEl(nx);scrollNear(nx,fuel)},T(ok?1250:650))}
  function next(skip){if(!skip)run.i++;if(run.i<run.items.length){question();return}keyPick=null;S.ring=null;
    if(run.mode==='missed')coda();else if(run.mode==='replay')ending(null);else finish()}
  function endScene(k){var now=performance.now(),F={full:{x:W-(BED?140:104),y:0,s:.8,rot:-4},last:{x:W-(BED?140:104),y:0,s:.8,rot:6,jit:1},sight:{x:W*.68,y:0,s:.72,rot:0,flip:1},stop:{x:W*.3,y:H-44-30,s:.78,rot:0},tow:{x:W*.36,y:H*.58,s:.8,rot:-12}}[k];
    if(k==='full'||k==='last')F.y=surf(W-80,H*.74,70,F.x)-24;if(k==='sight')F.y=surf(W*.62,H+112,170,W*.68)-22;
    S.end=Object.assign({k:k,t0:now,dur:k==='tow'?2600:1900,x0:k==='tow'?40:k==='sight'?W+70:-70,y0:k==='tow'?H*.6:H*.4,s0:1,p:reduce()?1:0},F);redraw()}
  function streakRow(sk,mult){var r=h('div','streak'+(sk>0?' flame-on':'')),f=h('span');f.innerHTML=FLAME;r.append(f,h('b',null,sk>0?sk+'-day streak':'No streak yet'));r.append(mult>1?h('span','chip','×'+mult+' multiplier on'):h('span','chip off','×1.5 from day 5'));return r}
  function revise(list,scored){if(!list.length)return null;var d=h('div','rvbox');d.append(h('span','rk','To revise'));list.forEach(function(m){var r=h('div','rv');r.append(h('b',null,m.q),h('p',null,'Answer: '+m.options[m.answer]+'. '+m.why));d.append(r)});if(scored)d.append(h('p','rn','Missed questions come back in Review over the next days.'));return d}
  function pracBox(missed,score){if(!missed.length||S.cells>=HOME)return null;var pb=h('div','prac');pb.append(h('span','lab','Practice refuel · no points'),h('p',null,'Each missed one you put right charges a cell. Reach '+HOME+' and '+P+' flies home tonight.'));
    pb.append(btn('Practise the missed ones','cy','practise',function(){practise(missed,score)}));return pb}
  /* the missed questions, folded shut behind one row so the ending stays short */
  function fold(rv,n){if(!rv)return null;var d=h('div','rvfold'),b=btn('See the ones you missed ('+n+')','alt','missed',function(){var open=rv.hidden;rv.hidden=!open;b.setAttribute('aria-expanded',String(open));b.textContent=open?'Hide the ones you missed':'See the ones you missed ('+n+')'});
    rv.id='wrv'+(++fold.n);rv.hidden=true;b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls',rv.id);d.append(b,rv);return d}
  fold.n=0;
  function againBtn(){return btn('Play the whole quiz again (practice)','alt','again',replay)}
  /* the scored finish: the page saves and scores (finishDay), this shows what it returns */
  function finish(){busy=true;setRun(false);var res=o.finish(run.picks.slice())||{},right=run.right,k=endFor(right,N),E=ENDS[k],pts=res.gained,dl=o.dayLine()||{};
    var score={right:right,total:N,points:pts};root.dataset.score=right;root.dataset.points=pts;showEnd(k,right);
    var f=h('div','w-fin e-'+k),hd=h('h2',null,E.head);hd.tabIndex=-1;var sc=h('div','w-score'),pe=h('span',null,'+'+(reduce()?pts:0)+' points');sc.append(h('b',null,right+'/'+N),pe);
    f.append(h('span','kick',E.kick),hd,sc,h('p','w-math',res.math||('+'+pts+' points')));var pb=pracBox(run.missed,score);if(pb)f.append(pb);
    f.append(h('p','lines',E.lines(P,O,right)),streakRow(dl.streak,dl.mult));
    (res.badges||[]).forEach(function(n){f.append(h('p','w-new','New badge: '+n))});if(res.lvUp)f.append(h('p','w-new','Level up: '+res.lvUp+'!'));
    var rv=fold(revise(run.missed,true),run.missed.length);if(rv)f.append(rv);
    f.append(againBtn(),btn('See my progress','alt','progress',function(){o.progress()}));
    body.textContent='';body.append(f);toTop(root);focusEl(hd);say(E.head+'. '+right+' out of '+N+'. Plus '+pts+' points.');
    countUp(pe,pts);celebrate(k);
    try{o.after()}catch(e){console.error(e)}}
  function countUp(e,to){if(reduce()){e.textContent='+'+to+' points';return}var t=tok,t0=performance.now();(function s(n){if(t!==tok)return;var p=Math.min(1,(n-t0)/1400),q=1-Math.pow(1-p,3);e.textContent='+'+Math.round(to*q)+' points';if(p<1)requestAnimationFrame(s);else e.textContent='+'+to+' points'})(t0);later(function(){e.textContent='+'+to+' points'},1600)}
  function celebrate(k){if(k==='full')later(function(){for(var j=0;j<12;j++)later(function(){fx.burst(30+Math.random()*(W-60),30+Math.random()*80,44,{speed:5,g:.06})},j*280)},T(1500));
    if(k==='last')later(function(){fx.burst(W-104,H*.4,24,{speed:3,g:.05,colors:['#ffd28a','#ffffff']})},T(1900))}
  function showEnd(k,right){root.dataset.ending=k;setCells(right);endScene(k);stat.textContent='';stat.append(h('b',null,'Landed with '+right+' of '+N+' cells'),right>=HOME?'. Enough for home.':', '+(HOME-right)+' short of home.');
    cells.classList.toggle('party',k==='full');if(cl[HOME-1])cl[HOME-1].classList.toggle('low',k==='last')}
  /* a practice replay of the whole quiz ends here (score null), and so does a reopened finished quiz */
  function ending(saved){busy=!saved;setRun(false);var sv=saved||o.saved(),right=saved?saved.score:run.right,k=endFor(right,N),E=ENDS[k],dl=o.dayLine()||{},f=h('div','w-fin e-'+k),hd=h('h2',null,E.head);hd.tabIndex=-1;
    showEnd(k,right);root.dataset.score=right;
    f.append(h('span','kick',saved?'Today’s quiz · finished':'Practice run: not scored'),hd);
    var sc=h('div','w-score');sc.append(h('b',null,right+'/'+N),h('span',null,saved?'+'+saved.points+' points':'Practice, no points'));f.append(sc);
    if(saved){if(dl.math)f.append(h('p','w-math',dl.math));f.append(h('p','lines',E.lines(P,O,right)),streakRow(dl.streak,dl.mult),h('p','w-math','+'+saved.points+' points earned. Replays are for practice and do not change your score.'))}
    else{if(sv)f.append(h('p','w-math','Today’s score stays '+sv.score+'/'+sv.total+' and +'+sv.points+' points.'));var pb=pracBox(run.missed,null);if(pb)f.append(pb);f.append(h('p','lines',E.lines(P,O,right)));var rv=fold(revise(run.missed,false),run.missed.length);if(rv)f.append(rv)}
    f.append(againBtn(),btn('See my progress','alt','progress',function(){o.progress()}));
    body.textContent='';body.append(f);
    if(!saved){toTop(root);focusEl(hd);say('Practice run: '+right+' out of '+N+'. '+E.head+'. No points.')}
    else redraw()}
  function replay(){reset();busy=true;setRun(true);setCells(0);status(null);run={mode:'replay',items:items,i:0,picks:[],right:0,missed:[],locked:true};go('launch',900);keyPick=pick;question()}
  function practise(missed){var base=S.cells;tok++;setRun(true);S.end=null;delete root.dataset.ending;cells.classList.remove('party');cl.forEach(function(c){c.classList.remove('low')});
    run={mode:'missed',items:missed.slice(),i:0,picks:[],right:0,missed:[],locked:true,base:base};busy=true;keyPick=pick;question()}
  function coda(){var f=h('div','w-fin');body.textContent='';setRun(false);
    if(S.cells>=HOME){endScene(S.cells>=N?'full':'last');root.dataset.ending='coda';var c=h('div','coda in'),hd=h('b',null,'Home after practice');hd.tabIndex=-1;var sv=o.saved();
      c.append(hd,h('p',null,P+' refuels on the rings you put right and flies home. '+(sv?'Today’s score stays '+sv.score+'/'+sv.total+' and +'+sv.points+' points: practice adds none.':'Practice adds no points.')));f.append(c);
      stat.textContent='';stat.append(h('b',null,'Home with '+S.cells+' of '+N+' cells. '),'Practice cells count for the story only.');say('Home after practice.');f.append(againBtn());body.append(f);toTop(root);focusEl(hd);
      later(function(){for(var j=0;j<5;j++)later(function(){fx.burst(30+Math.random()*(W-60),30+Math.random()*80,36,{speed:5,g:.06})},j*300)},T(1500))}
    else{root.dataset.ending='practice-short';var need=HOME-S.cells,hd2=h('h2',null,plural(need,'cell','cells')+' to go');hd2.tabIndex=-1;f.append(h('span','kick','Practice · no points'),hd2,h('p','lines','Nice work: '+S.cells+' of '+N+' cells now. Try the ones still missed to get '+P+' home tonight.'));
      if(run.missed.length){var still=run.missed.slice();f.append(btn('Practise the rest','cy','practise',function(){practise(still)}))}f.append(againBtn());body.append(f);toTop(root);focusEl(hd2);say(plural(need,'cell','cells')+' to go.');redraw()}}
  /* keys A to D or 1 to 4 answer, only while a question is waiting, the quiz is on screen and nothing sits on top */
  document.addEventListener('keydown',function(e){if(!keyPick||!root.isConnected||!onScreen||e.ctrlKey||e.metaKey||e.altKey)return;var a=document.activeElement;if(a&&/SELECT|INPUT|TEXTAREA/.test(a.tagName))return;
    if(document.querySelector('.sheet,.cc-over'))return;var i='abcd'.indexOf((e.key||'').toLowerCase()),j='1234'.indexOf(e.key),k=i>=0?i:j;if(k>=0&&run&&!run.locked){e.preventDefault();keyPick(k)}});
  function show(){var sv=o.saved();if(sv&&N){reset();setCells(sv.score);ending(sv)}else intro()}
  show();
  /* the page calls this after saving or loading a progress code: redraw from saved state unless a run is on */
  return{sync:function(){if(!busy)show()}}}
window.Warp={mount:mount,homeFor:HOMEOF,endFor:endFor};
})();
