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
/* Home is drawn as the cats' bed ('bed'). 'house' brings back the first three home endings (full, last, sight), their
   drawing and their words, exactly; the fuel stop and the tow are the new Night Depot scenes either way. */
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
 full:{kick:'Ending · home with a full tank',head:'Home with a full tank',lines:function(P,O){return BED?'Every ring charged. '+P+' lands to fireworks and hops out. '+O+' is waiting for a nose boop, then it is the cat bed for both.':'Every ring charged. '+P+' lands with a spare cell in the tank, and the whole sky lights up for the crew.'}},
 last:{kick:'Ending · home on the last cell',head:'Just made it home',lines:function(P,O,n){return n+' rings charged: exactly enough. The engine coughs on the final approach, then '+P+(BED?' touches down right beside the cat bed, where '+O+' is waiting.':' touches down right outside the door.')}},
 sight:{kick:'Ending · one cell short',head:'Home is in sight',lines:function(P,O,n){return plural(n,'ring','rings')+' charged, one cell short. '+P+' docks at the lookout moon for the night, close enough to see '+(BED?O+' waving from the cat bed':'the porch light')+'. Tomorrow starts with a fresh tank.'}},
 stop:{kick:'Ending · overnight stop',head:'Overnight at the fuel stop',lines:function(P,O,n){return plural(n,'ring','rings')+' charged: enough to reach the all-night fuel stop. '+P+' joins the queue and calls '+O+' to say goodnight. A full tank by morning.'}},
 tow:{kick:'Ending · a friendly tow',head:'A friendly tow for the night',lines:function(P,O){return 'No rings charged today, and that happens to every pilot. '+O+' drives out in the tow tug to fetch '+P+', who naps all the way to the depot. The rings are back tomorrow.'}}};

/* particles for the charge and the landing; nothing with reduced motion */
function FX(cv){var ctx=cv.getContext('2d'),P=[],on=false,W=0,H=0;
  function fit(){var r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(Math.abs(r.width-W)<1&&Math.abs(r.height-H)<1)return;W=r.width;H=r.height;cv.width=Math.max(1,W*d);cv.height=Math.max(1,H*d);ctx.setTransform(d,0,0,d,0,0)}
  function step(){if(!cv.isConnected){P=[];on=false;return}ctx.clearRect(0,0,W,H);P=P.filter(function(p){return p.life>0});P.forEach(function(p){p.vx*=p.drag;p.vy=p.vy*p.drag+p.g;p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;ctx.globalAlpha=Math.max(0,Math.min(1,p.life));ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s/2,0,7);ctx.fill()});ctx.globalAlpha=1;if(P.length)requestAnimationFrame(step);else{on=false;ctx.clearRect(0,0,W,H)}}
  return{burst:function(x,y,n,o){o=o||{};if(reduce()||document.hidden)return;fit();var cols=o.colors||['#ff2e6e','#ffe600','#7c4dff','#16b8f0','#3ddc97'];for(var k=0;k<n;k++){var a=Math.random()*Math.PI*2,sp=(o.speed||6)*(.3+Math.random());P.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp+(o.vy||0),g:o.g!=null?o.g:.12,drag:o.drag||.97,life:1,decay:o.decay||(.012+Math.random()*.012),s:(o.size||5)*(.6+Math.random()*.8),c:cols[k%cols.length]})}if(!on){on=true;requestAnimationFrame(step)}}}}

/* ---------- The Night Depot endings (plan 23), ported from direction A of the approved mock-up
   (morning-brief-directions/warp-scenes.html). Each scene draws a 358 by 220 world (centred when the
   stage is wider) for time t in seconds and returns where the real ship (HTML, with the real pilot in
   its dome) should be: {x, y, w, rot, flame, out}. out: the pilot has hopped out, so the dome is empty.
   The cats out of the ship are small canvas cats: Kimchi a blue/lilac point Birman, Charlee a Maine Coon.
   Pure drawing: no layout reads, no timers, no storage. ---------- */
/* OX: how far the world extends left and right of the 358px strip on a wider stage; TOP: the band opened above it when
   a narrower stage shrinks the world to fit (both in world units); FW: the full width in world units */
var DW=358,DH=220,DPI=Math.PI,DTAU=DPI*2,OX=0,TOP=0,FW=DW;
var DC={cyan:'#3de6ff',mag:'#ff3df2',green:'#3ddc97',amber:'#ffb347',yellow:'#ffe600',lilac:'#c9b8ff',ink:'#0b0620'};
var DDISP="Anton,Impact,'Arial Narrow',sans-serif",DMONO="'IBM Plex Mono',ui-monospace,Menlo,monospace",DSANS="'Space Grotesk',system-ui,sans-serif";
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function cl(x,a,b){return x<a?a:x>b?b:x}
function seg(t,a,b){return cl((t-a)/(b-a),0,1)}
function lerp(a,b,p){return a+(b-a)*p}
function eo(x){x=cl(x,0,1);return 1-Math.pow(1-x,3)}
function eio(x){x=cl(x,0,1);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2}
function dsurf(cx,cy,r,x){return cy-Math.sqrt(Math.max(0,r*r-(x-cx)*(x-cx)))}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
/* the sky fills the whole stage, even when it is wider than the 358px world */
function dsky(c,a,b){var g=c.createLinearGradient(0,0,0,DH);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(-OX,-TOP,FW,DH+TOP)}
function glow(c,col,b){c.shadowColor=col;c.shadowBlur=b}
function ng(c){c.shadowBlur=0}
function circ(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,DTAU);c.fill()}
function ell(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,DTAU);c.fill()}
function txt(c,s,x,y,font,col,al,g){c.font=font;c.textAlign=al||'center';c.textBaseline='alphabetic';c.fillStyle=col;if(g)glow(c,col,g);c.fillText(s,x,y);ng(c)}
function radial(c,x,y,r,col,a){var g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
var SCACHE={};function starsOf(seed,n){if(!SCACHE[seed]){var r=rng(seed),a=[];for(var i=0;i<n;i++)a.push({x:r()*DW,y:r()*DH,z:.3+r()*.7,p:r()*6.3});SCACHE[seed]=a}return SCACHE[seed]}
/* on a wide stage the stars and the skyline repeat across the full width */
function tiles(){var k=Math.ceil(OX/DW),a=[];for(var i=-k;i<=k;i++)a.push(i*DW);return a}
function dstars(c,seed,n,t,dx,rm,ymax){tiles().forEach(function(T){dstars1(c,seed,n,t,dx,rm,ymax,T)})}
function dstars1(c,seed,n,t,dx,rm,ymax,T){starsOf(seed,n).forEach(function(s){if(ymax&&s.y>ymax)return;var x=T+((s.x-dx*s.z)%DW+DW)%DW,tw=rm?1:.55+.45*Math.sin(t*1.7+s.p*3);c.globalAlpha=(.25+.6*s.z)*tw;c.fillStyle='#dce6ff';var z=s.z*1.8;c.fillRect(x,s.y,z,z)});c.globalAlpha=1}
function heart(c,x,y,s,col,a){c.save();c.globalAlpha=a==null?1:a;c.translate(x,y);c.scale(s,s);c.fillStyle=col;glow(c,col,10);c.beginPath();c.moveTo(0,4);c.bezierCurveTo(-7,-1,-6,-8,0,-4);c.bezierCurveTo(6,-8,7,-1,0,4);c.fill();ng(c);c.restore()}
function zzz(c,x,y,t,rm){for(var i=0;i<3;i++){var p=rm?.2+i*.28:(t*.45+i/3)%1,a=rm?1-i*.22:Math.sin(DPI*p);c.globalAlpha=a;txt(c,'z',x+p*14+Math.sin(p*6)*2,y-p*28,'700 '+Math.round(12+p*5)+'px '+DMONO,DC.lilac,'left')}c.globalAlpha=1}
function puff(c,x,y,p,col){c.globalAlpha=(1-p)*.55;circ(c,x-p*10,y-p*16,4+p*8,col||'#c8c0e0');c.globalAlpha=1}
/* a firework: a bright flash, then a ring of big dots with a soft halo under each (no blur per dot) */
function firework(c,x,y,p,col,n){n=n||14;if(p<=0||p>=1)return;var r=8+48*eo(p),a0=1-p,d=2.2+1.2*(1-p);if(p<.2)radial(c,x,y,26,'rgba(255,255,255,A)',(1-p/.2)*.9);
  for(var i=0;i<n;i++){var a=i/n*DTAU,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r+p*p*18;c.globalAlpha=a0*.28;circ(c,xx,yy,d*2.6,col);c.globalAlpha=a0;circ(c,xx,yy,d,col);c.globalAlpha=a0*.7;circ(c,x+Math.cos(a)*r*.7,y+Math.sin(a)*r*.7+p*p*12,1.6,'#fff')}c.globalAlpha=1}

/* ---------- the two cats, out of the ship ---------- */
var CP={charlee:{f:'#9a6236',d:'#4f2c16',w:'#f6efe4',tail:'#8a5530',eye:'#b9dc4c',ear:'#e9a19c',head:'#9a6236'},
        kimchi:{f:'#f0e5d3',d:'#5b6b8e',w:'#ffffff',tail:'#5b6b8e',eye:'#62b6ff',ear:'#c9a6c4',head:'#f0e5d3'}};
function face(c,x,y,r,k,sleep,tilt){var P=CP[k],ch=k==='charlee';c.save();c.translate(x,y);c.rotate(tilt||0);
  [-1,1].forEach(function(s){c.fillStyle=ch?P.f:P.d;c.beginPath();c.moveTo(s*r*.98,-r*.2);c.lineTo(s*r*.78,-r*1.28);c.lineTo(s*r*.12,-r*.8);c.closePath();c.fill();
    c.fillStyle=P.ear;c.beginPath();c.moveTo(s*r*.82,-r*.38);c.lineTo(s*r*.72,-r*1.02);c.lineTo(s*r*.32,-r*.78);c.closePath();c.fill();
    if(ch){c.strokeStyle=P.d;c.lineWidth=Math.max(1,r*.09);c.beginPath();c.moveTo(s*r*.78,-r*1.28);c.lineTo(s*r*.8,-r*1.55);c.stroke()}});
  ell(c,0,0,r,r*.9,P.head);
  if(ch){c.strokeStyle=P.d;c.lineWidth=Math.max(1,r*.12);c.lineCap='round';[[-.32,-.78,-.22,-.45],[0,-.86,0,-.5],[.32,-.78,.22,-.45]].forEach(function(a){c.beginPath();c.moveTo(a[0]*r,a[1]*r);c.lineTo(a[2]*r,a[3]*r);c.stroke()});
    c.fillStyle=P.w;c.beginPath();c.ellipse(-r*.2,r*.38,r*.3,r*.24,0,0,DTAU);c.ellipse(r*.2,r*.38,r*.3,r*.24,0,0,DTAU);c.fill();ell(c,0,r*.66,r*.32,r*.2,P.w)}
  else{c.globalAlpha=.95;ell(c,0,r*.22,r*.62,r*.55,P.d);c.globalAlpha=1;ell(c,0,r*.5,r*.3,r*.2,'#7d8cad')}
  if(sleep){c.strokeStyle='#1a1030';c.lineWidth=Math.max(1.1,r*.11);c.lineCap='round';[-1,1].forEach(function(s){c.beginPath();c.arc(s*r*.38,-r*.02,r*.18,.15*DPI,.85*DPI);c.stroke()})}
  else[-1,1].forEach(function(s){ell(c,s*r*.38,-r*.04,r*.2,r*.22,P.eye);ell(c,s*r*.38,-r*.02,r*.07,r*.17,'#120a1e');circ(c,s*r*.38+r*.06,-r*.12,r*.05,'#fff')});
  c.fillStyle='#ff8fa8';c.beginPath();c.moveTo(-r*.1,r*.22);c.lineTo(r*.1,r*.22);c.lineTo(0,r*.34);c.closePath();c.fill();c.restore()}
function ctail(c,ch,P,pts,lw){c.lineCap='round';c.strokeStyle=P.tail;c.lineWidth=lw;c.beginPath();c.moveTo(pts[0],pts[1]);c.quadraticCurveTo(pts[2],pts[3],pts[4],pts[5]);c.stroke();
  if(ch){c.strokeStyle=CP.charlee.d;c.setLineDash([3,5]);c.stroke();c.setLineDash([])}}
function ruff(c,ch,P,sx){c.save();c.scale(sx,sx);c.fillStyle=ch?P.w:'#fbf6ec';c.beginPath();c.moveTo(-1,-27);c.lineTo(4,-25);c.lineTo(9,-25);c.lineTo(8,-20);c.lineTo(12,-16);c.lineTo(8,-12);c.lineTo(10,-7);c.lineTo(3,-3);c.quadraticCurveTo(-2,-14,-1,-27);c.fill();c.restore()}
function stripes(c,P,a){c.strokeStyle=P.d;c.lineWidth=2.2;c.lineCap='round';a.forEach(function(s){c.beginPath();c.moveTo(s[0],s[1]);c.lineTo(s[2],s[3]);c.stroke()})}
/* pose: sit, walk or curl (asleep); o.dir 1 faces right, -1 left */
function catV(c,x,y,s,k,pose,o){var P=CP[k],ch=k==='charlee',t=o.t||0,rm=o.rm;c.save();c.translate(x,y);c.scale(s*(o.dir||1),s);c.lineJoin='round';
  if(pose==='sit'){var sw=rm?0:Math.sin(t*2)*3;ctail(c,ch,P,[-9,-5,-27,-2+sw,-21,-21+sw],ch?8:6);ell(c,-2,-14,12,14,P.f);
    if(ch)stripes(c,P,[[-10,-22,-6,-18],[-12,-14,-7,-11],[-11,-6,-6,-5]]);ruff(c,ch,P,ch?1:.85);
    c.fillStyle=P.f;rr(c,1,-11,4,11,2);c.fill();rr(c,6,-11,4,11,2);c.fill();ell(c,3,-1,3,1.8,P.w);ell(c,8,-1,3,1.8,P.w);
    if(o.wave){var a=rm?.3:Math.sin(t*9)*.45;c.save();c.translate(8,-19);c.rotate(-2.1+a);c.fillStyle=P.f;rr(c,0,-2,13,4.4,2.2);c.fill();ell(c,13,0,3.2,2.8,P.w);c.restore()}
    face(c,5,-32,10,k,o.sleep,o.tilt||0)}
  else if(pose==='walk'){var ph=rm?0:t*11;ctail(c,ch,P,[-13,-16,-25,-20,-20,-36],ch?8:6);
    [[-10,0],[-6,DPI],[6,DPI],[10,0]].forEach(function(l){var a=Math.sin(ph+l[1])*.45;c.strokeStyle=P.f;c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(l[0],-12);c.lineTo(l[0]+Math.sin(a)*7,-1);c.stroke();ell(c,l[0]+Math.sin(a)*7,-1,2.6,1.6,P.w)});
    ell(c,0,-15,15,9,P.f);if(ch)stripes(c,P,[[-8,-22,-7,-14],[-2,-23,-1,-15],[4,-23,4,-16]]);ell(c,11,-15,6,8,ch?P.w:'#fbf6ec');face(c,16,-25,9,k,false,0)}
  else{var br=rm?1:1+.035*Math.sin(t*1.7);c.save();c.translate(0,-1);c.scale(1,br);ell(c,0,-8,17,9,P.f);if(ch)stripes(c,P,[[-10,-15,-11,-5],[-4,-17,-5,-6],[2,-17,1,-7]]);c.restore();
    c.strokeStyle=P.tail;c.lineWidth=ch?7:5;c.lineCap='round';c.beginPath();c.moveTo(-16,-4);c.quadraticCurveTo(-4,4,13,-1);c.stroke();if(ch){c.setLineDash([3,5]);c.strokeStyle=P.d;c.stroke();c.setLineDash([])}
    face(c,10,-12,8,k,true,.3)}
  c.restore()}

/* ---------- the cat bed (home): back and front, so cats can sit in it ---------- */
function bedBack(c,x,y,s,gl){if(gl)radial(c,x,y-8*s,80*s,'rgba(255,179,71,A)',gl*.38);
  ell(c,x,y-1*s,37*s,13*s,'#6a1f6e');ell(c,x,y-6*s,36*s,14*s,'#c13fa6');var g=c.createRadialGradient(x,y-9*s,2,x,y-6*s,30*s);g.addColorStop(0,'#fff0d8');g.addColorStop(1,'#f3b98a');c.fillStyle=g;c.beginPath();c.ellipse(x,y-6*s,28*s,9*s,0,0,DTAU);c.fill()}
function bedFront(c,x,y,s){c.fillStyle='#e05cc4';c.beginPath();c.ellipse(x,y-6*s,36*s,14*s,0,0,DPI);c.ellipse(x,y-6*s,28*s,9*s,0,DPI,0,true);c.fill();
  c.strokeStyle='#ff9ae8';c.lineWidth=1.6;glow(c,DC.mag,8);c.beginPath();c.ellipse(x,y-6*s,36*s,14*s,0,.05*DPI,.95*DPI);c.stroke();ng(c);
  c.strokeStyle='#ffffff44';c.lineWidth=1;c.beginPath();c.ellipse(x,y-4*s,32*s,10*s,0,.25*DPI,.75*DPI);c.stroke()}

/* the greeting: the pilot hops out, the home cat comes to meet them, nose boop under a heart, then both curl up in the bed */
var GA={bx:262,by:172,s:.92,bs:.9,t0:2.6,hx:106,hy:120,gx:150};
function greet(c,t,rm,G,pilot,home){var u=G.s,tau=t-G.t0,bx=G.bx,by=G.by,C1=bx-46*u,K1=bx-18*u,iC=bx-17*u,iK=bx+17*u,inb=[],out=[];
  function at(x,y,k,pose,dir,ex,inBed){var o={t:t,rm:rm,dir:dir};for(var e in ex)o[e]=ex[e];(inBed?inb:out).push([x,y,k,pose,o])}
  var lean=tau>1.8&&tau<3?Math.sin(DPI*seg(tau,1.85,2.9))*3*u:0;
  if(tau<.3)at(bx+4*u,by-4*u,home,'sit',-1,{wave:tau>-1.6},1);
  else if(tau<1.1){var p=eio(seg(tau,.3,1.1));at(lerp(bx+4*u,K1,p),by-4*u*(1-p)-Math.sin(DPI*seg(tau,.3,.75))*12*u,home,'walk',-1,{},p<.25)}
  else if(tau<3)at(K1-lean,by,home,'sit',-1,{tilt:lean>0?-.15:0},0);
  else if(tau<4){var q=eio(seg(tau,3,4));at(lerp(K1,iK,q),by-4*u*q-Math.sin(DPI*q)*10*u,home,'walk',1,{},q>.7)}
  else at(iK,by-4*u,home,'curl',-1,{},1);
  if(tau>=0){if(tau<.6){var h=seg(tau,0,.6);at(lerp(G.hx,G.gx,h),lerp(G.hy,by,h)-Math.sin(DPI*h)*22*u,pilot,'walk',1,{},0)}
    else if(tau<1.8)at(lerp(G.gx,C1,eio(seg(tau,.6,1.8))),by,pilot,'walk',1,{},0);
    else if(tau<3)at(C1+lean,by,pilot,'sit',1,{tilt:lean>0?.15:0},0);
    else if(tau<4){var r2=eio(seg(tau,3,4));at(lerp(C1,iC,r2),by-4*u*r2-Math.sin(DPI*r2)*12*u,pilot,'walk',1,{},r2>.7)}
    else at(iC,by-4*u,pilot,'curl',1,{},1)}
  bedBack(c,G.bx,G.by,G.bs,1);inb.forEach(function(a){catV(c,a[0],a[1],G.s,a[2],a[3],a[4])});bedFront(c,G.bx,G.by,G.bs);out.forEach(function(a){catV(c,a[0],a[1],G.s,a[2],a[3],a[4])});
  if(tau>2.1&&tau<3.8){var hp=seg(tau,2.1,3.8);heart(c,(C1+K1)/2,by-44*u-hp*26,1.3+hp*.5,'#ff5fa8',1-hp*hp)}
  if(tau>4.4&&!rm){for(var i=0;i<2;i++){var f=((tau-4.4)*.35+i*.5)%1;heart(c,bx-6+i*12+Math.sin(f*8)*4,by-24*u-f*40,.8,'#ff8ac4',Math.sin(DPI*f)*.85)}}}

/* ---------- odd little ships at the fuel stop (all face left) ---------- */
function teapot(c,x,y,s,t,o){c.save();c.translate(x,y);c.scale(o.flip?-s:s,s);
  var ug=c.createRadialGradient(0,20,1,0,20,26);ug.addColorStop(0,'rgba(61,230,255,.45)');ug.addColorStop(1,'rgba(61,230,255,0)');c.fillStyle=ug;c.fillRect(-28,8,56,26);
  c.fillStyle='#24164f';c.strokeStyle=DC.cyan;c.lineWidth=1.5;c.beginPath();c.ellipse(0,14,24,4.5,0,0,DTAU);c.fill();c.stroke();
  c.strokeStyle='#e0812a';c.lineWidth=4;c.beginPath();c.arc(16,-1,8,-1.3,1.3);c.stroke();
  c.fillStyle='#ffb347';c.beginPath();c.moveTo(-12,-3);c.quadraticCurveTo(-22,-3,-27,-13);c.lineTo(-23,-15);c.quadraticCurveTo(-19,-7,-10,5);c.closePath();c.fill();
  var g=c.createLinearGradient(0,-14,0,12);g.addColorStop(0,'#ffd08a');g.addColorStop(1,'#e0712a');c.fillStyle=g;c.beginPath();c.ellipse(0,0,17,13,0,0,DTAU);c.fill();
  c.fillStyle=DC.mag;c.fillRect(-15,4,30,2.5);ell(c,0,-12,9,3,'#e0712a');glow(c,DC.yellow,8);circ(c,0,-16,2.6,DC.yellow);ng(c);
  circ(c,-4,-2,5.5,'#bfe6ff');c.fillStyle=DC.green;c.beginPath();c.arc(-4,1,3.6,DPI,0);c.fill();c.fillStyle=DC.ink;c.fillRect(-6,-1,1.3,1.3);c.fillRect(-3,-1,1.3,1.3);
  if(!o.rm){var p=(t*.8)%1;c.globalAlpha=(1-p)*.5;circ(c,-27-p*4,-16-p*12,2+p*3,'#fff');c.globalAlpha=1}c.restore()}
function snail(c,x,y,s,t,o){c.save();c.translate(x,y);c.scale(o.flip?-s:s,s);
  c.fillStyle='#14463a';c.strokeStyle=DC.green;c.lineWidth=1.5;rr(c,-30,5,58,10,5);c.fill();c.stroke();
  c.fillStyle='#bfe6ff';rr(c,-30,-6,14,12,4);c.fill();circ(c,-24,0,2.4,'#ffb347');
  c.strokeStyle='#7fffd0';c.lineWidth=1.5;c.beginPath();c.moveTo(-24,-6);c.lineTo(-30,-19);c.moveTo(-20,-6);c.lineTo(-21,-21);c.stroke();var bl=o.rm?1:.5+.5*Math.sin(t*5);glow(c,DC.yellow,8*bl);circ(c,-30,-19,2.2,DC.yellow);circ(c,-21,-21,2.2,DC.yellow);ng(c);
  var g=c.createRadialGradient(4,-10,2,6,-6,16);g.addColorStop(0,'#ff9af4');g.addColorStop(1,'#8a1e94');circ(c,6,-6,15,g);
  c.strokeStyle='#ffd1f7';c.lineWidth=2;c.beginPath();for(var a=0;a<4.4*DPI;a+=.2){var r=1+a*.95,xx=6+Math.cos(a)*r,yy=-6+Math.sin(a)*r;if(a)c.lineTo(xx,yy);else c.moveTo(xx,yy)}c.stroke();
  for(var i=0;i<4;i++){c.fillStyle=((i+((o.rm?0:t*4)|0))%2)?DC.green:'#1c6b55';c.fillRect(-16+i*10,9,5,2)}c.restore()}
function robot(c,x,y,s,t,o){c.save();c.translate(x,y);c.scale(o.flip?-s:s,s);
  if(!o.rm){var f=.7+.3*Math.sin(t*30);c.fillStyle='rgba(61,230,255,.7)';c.beginPath();c.moveTo(-5,12);c.lineTo(5,12);c.lineTo(0,12+10*f);c.closePath();c.fill()}
  c.fillStyle='#ffb347';rr(c,8,-6,13,12,2);c.fill();c.strokeStyle='#7a4a10';c.lineWidth=1;c.beginPath();c.moveTo(14.5,-6);c.lineTo(14.5,6);c.moveTo(8,0);c.lineTo(21,0);c.stroke();
  c.fillStyle='#1d2a5a';c.strokeStyle=DC.cyan;c.lineWidth=1.6;rr(c,-14,-16,28,28,7);c.fill();c.stroke();
  c.fillStyle=DC.ink;rr(c,-12,-11,22,9,4);c.fill();var bl=o.rm||(t%3.1)>.15;c.fillStyle=DC.cyan;glow(c,DC.cyan,6);if(bl){c.fillRect(-9,-8,4,3);c.fillRect(-1,-8,4,3)}else{c.fillRect(-9,-7,4,1);c.fillRect(-1,-7,4,1)}ng(c);
  c.strokeStyle=DC.lilac;c.beginPath();c.moveTo(0,-16);c.lineTo(-2,-24);c.stroke();circ(c,-2,-25,2.4,DC.mag);c.restore()}
function scooter(c,x,y,s,t,o){c.save();c.translate(x,y);c.scale(o.flip?-s:s,s);
  c.fillStyle=DC.green;rr(c,-18,8,36,6,3);c.fill();c.fillStyle='#1a5a44';c.beginPath();c.moveTo(14,8);c.lineTo(22,-2);c.lineTo(20,9);c.fill();
  circ(c,0,-2,13,'rgba(61,230,255,.16)');c.strokeStyle=DC.cyan;c.lineWidth=1.6;c.beginPath();c.arc(0,-2,13,0,DTAU);c.stroke();
  ell(c,1,4,7,6,'#ff7ad9');circ(c,1,-3,5.5,'#ff9ae0');c.fillStyle=DC.ink;c.fillRect(-2,-4,1.4,1.6);c.fillRect(2,-4,1.4,1.6);
  c.fillStyle='rgba(255,255,255,.4)';c.beginPath();c.ellipse(-5,-8,4,2.4,-.6,0,DTAU);c.fill();c.restore()}
var VEH=[teapot,snail,robot,scooter];

/* ---------- the tow tug (faces right), with the home cat at the wheel ---------- */
function tug(c,x,y,s,t,o){var rm=o.rm;c.save();c.translate(x,y);c.scale(s,s);
  var hg=c.createLinearGradient(46,0,140,0);hg.addColorStop(0,'rgba(255,240,180,.35)');hg.addColorStop(1,'rgba(255,240,180,0)');c.fillStyle=hg;c.beginPath();c.moveTo(46,-2);c.lineTo(150,-26);c.lineTo(150,30);c.closePath();c.fill();
  var f=rm?1:.75+.25*Math.sin(t*31);c.fillStyle='rgba(61,230,255,.85)';c.beginPath();c.moveTo(-50,4);c.lineTo(-50-18*f,9);c.lineTo(-50,14);c.closePath();c.fill();
  var g=c.createLinearGradient(0,-16,0,24);g.addColorStop(0,'#ffd38a');g.addColorStop(1,'#d9771f');c.fillStyle=g;rr(c,-50,-14,98,36,14);c.fill();
  c.save();rr(c,-50,-14,98,36,14);c.clip();c.fillStyle='#2a1406';c.fillRect(-50,14,98,8);c.fillStyle=DC.yellow;for(var i=-50;i<50;i+=10){c.beginPath();c.moveTo(i,22);c.lineTo(i+5,14);c.lineTo(i+10,14);c.lineTo(i+5,22);c.closePath();c.fill()}c.restore();
  c.fillStyle='#e8892a';rr(c,-6,-38,44,28,11);c.fill();var wg=c.createLinearGradient(0,-34,0,-14);wg.addColorStop(0,'#d8f2ff');wg.addColorStop(1,'#7fb6e0');c.fillStyle=wg;rr(c,0,-33,32,19,8);c.fill();
  c.save();rr(c,0,-33,32,19,8);c.clip();face(c,16,-20,9,o.home,false,-.1);
  if(o.wave){var a=rm?.3:Math.sin(t*8)*.5;c.save();c.translate(24,-15);c.rotate(-1.2+a);c.fillStyle=CP[o.home].f;rr(c,0,-2,10,4.2,2);c.fill();ell(c,10,0,3,2.6,'#fff');c.restore()}c.restore();
  var bl=rm?1:(Math.sin(t*6)+1)/2;if(!rm){c.save();c.translate(16,-41);c.rotate(t*3);c.fillStyle='rgba(255,230,0,.22)';c.beginPath();c.moveTo(0,0);c.arc(0,0,30,-.25,.25);c.closePath();c.fill();c.beginPath();c.moveTo(0,0);c.arc(0,0,30,DPI-.25,DPI+.25);c.closePath();c.fill();c.restore()}
  glow(c,DC.yellow,14*bl);c.fillStyle='rgba(255,230,0,'+(.5+.5*bl)+')';c.beginPath();c.arc(16,-40,5,DPI,0);c.fill();ng(c);
  txt(c,'TOW',-28,10,'400 17px '+DDISP,'#3a1a04','left');glow(c,'#fff6c0',12);circ(c,45,2,4,'#fff8d0');ng(c);
  c.strokeStyle=DC.yellow;c.lineWidth=2.5;glow(c,DC.yellow,8);c.beginPath();c.arc(-50,4,8,DPI*.55,DPI*1.45);c.stroke();ng(c);c.restore()}

/* a far neighbourhood on the horizon */
var SKYA=(function(){var r=rng(7),a=[],x=0;while(x<DW){var w=14+r()*22,h=12+r()*40,wins=[];for(var j=0;j<6;j++)wins.push([x+3+r()*(w-6),176-h+4+r()*(h-8),r()<.5?DC.amber:DC.cyan,r()*6]);a.push({x:x,w:w,h:h,wins:wins});x+=w+2}return a})();
function skyline(c,t,rm,gy){tiles().forEach(function(T){c.save();c.translate(T,0);skyline1(c,t,rm,gy);c.restore()})}
function skyline1(c,t,rm,gy){SKYA.forEach(function(b){c.fillStyle='#170d40';c.fillRect(b.x,gy-b.h,b.w,b.h);c.fillStyle='#2a1a5e';c.fillRect(b.x,gy-b.h,b.w,1.5);b.wins.forEach(function(w){c.globalAlpha=rm?.5:.25+.35*(Math.sin(t*.7+w[3])>0?1:.3);c.fillStyle=w[2];c.fillRect(w[0],w[1]-(176-gy),2,2)})});c.globalAlpha=1}

/* ---------- the five endings. P: {pilot, home} ---------- */
function garden(c,t,rm,full){dsky(c,full?'#1a0b45':'#1c0a38',full?'#43207f':'#5a2448');dstars(c,11,60,t,0,rm,150);
  if(full){for(var j=0;j<3;j++){c.save();c.globalAlpha=.2;c.strokeStyle=[DC.green,DC.cyan,DC.mag][j];c.lineWidth=14;c.beginPath();for(var x=-OX;x<=DW+OX;x+=10){var y=34+j*16+Math.sin(x/40+(rm?0:t*.9)+j)*10;if(x>-OX)c.lineTo(x,y);else c.moveTo(x,y)}c.stroke();c.restore()}}
  else radial(c,40,150,120,'rgba(255,140,90,A)',.22);
  c.save();c.translate(0,-6);skyline(c,t,rm,168);c.restore();
  var g=c.createLinearGradient(0,160,0,DH);g.addColorStop(0,full?'#1e7a68':'#5a2a5e');g.addColorStop(1,'#0c1f30');c.fillStyle=g;c.beginPath();c.moveTo(-OX,DH);c.lineTo(-OX,172);c.lineTo(0,172);c.quadraticCurveTo(179,150,DW,172);c.lineTo(FW-OX,172);c.lineTo(FW-OX,DH);c.closePath();c.fill();
  c.strokeStyle=full?DC.green:'#ff9ae0';c.lineWidth=2;glow(c,c.strokeStyle,10);c.beginPath();c.moveTo(0,172);c.quadraticCurveTo(179,150,DW,172);c.stroke();ng(c);
  /* bunting over the bed */
  c.strokeStyle='#4a3a7e';c.lineWidth=3;c.beginPath();c.moveTo(204,166);c.lineTo(204,100);c.moveTo(322,170);c.lineTo(322,96);c.stroke();
  c.strokeStyle='#ffffff55';c.lineWidth=1;c.beginPath();c.moveTo(204,102);c.quadraticCurveTo(263,132,322,98);c.stroke();
  for(var i=0;i<9;i++){var p=(i+.5)/9,bx=lerp(204,322,p),by=(1-p)*(1-p)*102+2*(1-p)*p*132+p*p*98;var col=full?[DC.mag,DC.yellow,DC.cyan,DC.green][(i+((rm?0:t*3)|0))%4]:'#ffcf7a';var on=full||rm||Math.sin(t*1.3+i)>-.7;c.globalAlpha=on?1:.35;
    c.fillStyle=col;glow(c,col,10);c.beginPath();c.moveTo(bx-4,by+1);c.lineTo(bx+4,by+1);c.lineTo(bx,by+9);c.closePath();c.fill();ng(c)}c.globalAlpha=1}
function dFull(c,t,rm,P){garden(c,t,rm,1);
  /* neighbours cheer from their porches, clear of the score badge's corner */
  var ch=rm?0:Math.abs(Math.sin(t*4))*4;teapot(c,342,124-ch,.6,t,{rm:rm});robot(c,30,62-(rm?0:Math.abs(Math.sin(t*4+1))*4),.75,t,{rm:rm,flip:1});
  if(!rm){for(var i=0;i<4;i++){var T=t-1.2-i*.9,ph=((T%3.6)+3.6)%3.6/1.4;if(T>0&&ph<1)firework(c,[90,236,166,40][i],[40,34,58,100][i],ph,[DC.mag,DC.cyan,DC.yellow,DC.green][i],18)}}
  else{firework(c,90,40,.45,DC.mag,18);firework(c,236,36,.55,DC.cyan,18)}
  var p=eo(seg(t,0,2.3)),sx=lerp(-60-OX,96,p),sy=lerp(36,150,p)+(rm?0:Math.sin(t*2)*1.5*(1-p));
  greet(c,t,rm,GA,P.pilot,P.home);
  if(!rm){for(var k=0;k<14;k++){var q=((t*.25+k/14)%1),xx=(k*53)%DW+Math.sin(q*10+k)*6;c.globalAlpha=Math.sin(DPI*q)*.9;c.fillStyle=[DC.mag,DC.yellow,DC.cyan,DC.green][k%4];c.fillRect(xx,q*170,3,5)}c.globalAlpha=1}
  return{x:sx,y:sy,w:100,rot:lerp(.25,0,p),flame:1-seg(t,1.8,2.4),out:t>=GA.t0}}
function dLast(c,t,rm,P){garden(c,t,rm,0);
  radial(c,GA.bx,150,70,'rgba(255,200,120,A)',.25);c.fillStyle='#4a3a7e';c.fillRect(330,128,3,42);glow(c,'#ffcf7a',16);circ(c,331,126,5,'#ffcf7a');ng(c);
  var p=eio(seg(t,0,2.4)),jx=rm?0:(t<2.4?Math.sin(t*23)*2:0),sx=lerp(-60-OX,96,p)+jx,sy=lerp(70,150,p)-(rm?0:Math.max(0,Math.sin(seg(t,2.3,2.8)*DPI))*6);
  for(var i=0;i<5;i++){var pt=t-i*.45;if(pt>0&&pt<2.6&&!rm){var q=((t-pt)%2.2)/2.2;puff(c,lerp(-60,96,eio(seg(pt,0,2.4)))-50,lerp(70,150,eio(seg(pt,0,2.4)))+4,q)}}
  if(t>2.4&&t<4.2&&!rm){puff(c,40,154,seg(t,2.4,4.2),'#b0a8c8');puff(c,52,150,seg(t,2.7,4.2),'#b0a8c8')}
  greet(c,t,rm,GA,P.pilot,P.home);
  return{x:sx,y:sy,w:100,rot:0,flame:t<2.3&&!rm&&(t*7|0)%3?.7:0,out:t>=GA.t0}}
/* the lookout moon: drawn mirrored, so home sits top left, clear of the score badge */
function dSight(c,t,rm,P){c.save();c.translate(DW,0);c.scale(-1,1);dsky(c,'#0b0a2e','#221552');dstars(c,13,70,t,0,rm);
  radial(c,300,62,70,'rgba(61,220,151,A)',.25);var g=c.createRadialGradient(290,52,4,300,62,34);g.addColorStop(0,'#7dffc8');g.addColorStop(1,'#127a6a');circ(c,300,62,34,g);
  bedBack(c,300,34,.46,1);catV(c,302,31,.5,P.home,'sit',{t:t,rm:rm,dir:-1,wave:t>3.6||rm});bedFront(c,300,34,.46);
  c.fillStyle='#4a3a7e';c.fillRect(322,14,2,16);var lb=rm||Math.sin(t*2.4)>-.3;glow(c,'#ffcf7a',lb?14:0);circ(c,323,13,3.2,lb?'#ffe2a0':'#6b5a3a');ng(c);
  var mx=118,my=330,mr=170;var mg=c.createRadialGradient(80,200,10,mx,my,mr);mg.addColorStop(0,'#b8b0dc');mg.addColorStop(1,'#3a3260');c.fillStyle=mg;c.beginPath();c.arc(mx,my,mr,0,DTAU);c.fill();
  [[-80,8],[-30,12],[40,6],[70,10]].forEach(function(z){ell(c,mx+z[0],dsurf(mx,my,mr,mx+z[0])+z[1]+5,z[1]*1.4,z[1]*.6,'#5a5288')});
  c.fillStyle='#c9b8ff';c.fillRect(24,128,3,34);var bb=rm||Math.sin(t*3)>0;glow(c,DC.yellow,bb?12:0);circ(c,25.5,126,4,bb?DC.yellow:'#6b5a00');ng(c);
  var p=eo(seg(t,0,2)),sx=lerp(-60-OX,78,p),sy=lerp(60,dsurf(mx,my,mr,78)-20,p);
  var cx=192,cy=dsurf(mx,my,mr,192)+2;
  if(t>=2.2||rm){var h=rm?1:seg(t,2.2,3.4),wx=lerp(118,cx,eio(h)),pose=h<1?'walk':'sit';catV(c,wx,(h<1?dsurf(mx,my,mr,wx)+2:cy),.8,P.pilot,pose,{t:t,rm:rm,dir:1,tilt:-.25})}
  if(t>3.4||rm){c.save();c.setLineDash([4,6]);c.strokeStyle='#ffe60099';c.lineWidth=2;c.beginPath();c.moveTo(cx+12,cy-44);c.quadraticCurveTo(250,64,284,30);c.stroke();c.restore();
    var hp=rm?.5:((t-3.4)*.32)%1,bx=(1-hp)*(1-hp)*286+2*(1-hp)*hp*250+hp*hp*(cx+12),by=(1-hp)*(1-hp)*34+2*(1-hp)*hp*60+hp*hp*(cy-44);heart(c,bx,by,1.1,'#ff6fb5',Math.sin(DPI*hp)*.9+(rm?.1:0))}
  c.restore();
  return{x:DW-sx,y:sy,w:92,rot:0,flame:1-seg(t,1.4,2),out:t>=2.2||rm,flip:1}}
function dStop(c,t,rm,P){dsky(c,'#0a0524','#211052');dstars(c,17,60,t,0,rm,120);circ(c,128,26,9,'#3a2f6e');c.strokeStyle='#6a5aa8';c.lineWidth=1.5;c.beginPath();c.ellipse(128,26,16,4,-.3,0,DTAU);c.stroke();
  for(var i=0;i<6;i++){var x=((i*67+(rm?0:t*18))%420)-30;c.fillStyle='#ff3df2aa';c.fillRect(x,100,4,1.5);var x2=420-((i*83+(rm?0:t*12))%420)-30;c.fillStyle='#3de6ffaa';c.fillRect(x2,108,3,1.5)}
  var gy=176;skyline(c,t,rm,gy);c.fillStyle='#140a33';c.fillRect(-OX,gy,FW,DH-gy);c.fillStyle='#3a2a6e';c.fillRect(-OX,gy,FW,2);
  for(var lx=150;lx<DW;lx+=22){var on=rm||(((lx/22|0)+(t*6|0))%3===0);c.fillStyle=on?DC.cyan:'#1a4a5a';c.fillRect(lx,gy+8,8,2)}
  var cg=c.createLinearGradient(0,78,0,gy);cg.addColorStop(0,'rgba(255,190,110,.28)');cg.addColorStop(1,'rgba(255,190,110,0)');c.fillStyle=cg;c.beginPath();c.moveTo(144,78);c.lineTo(292,78);c.lineTo(312,gy);c.lineTo(128,gy);c.closePath();c.fill();
  c.fillStyle='#3a2a6e';c.fillRect(142,78,4,gy-78);c.fillRect(288,78,4,gy-78);
  /* the queue: two ships fuelling at the pumps, two waiting; every 4.2s the front one leaves and the rest shuffle up */
  var Pd=4.2,cyc=Math.floor(t/Pd),u=(t%Pd)/Pd;if(rm){cyc=1;u=.35}var SX=[200,272,338,404],PX=[160,234];
  PX.forEach(function(px){c.fillStyle='#2a1a5e';c.strokeStyle=DC.mag;c.lineWidth=1.5;rr(c,px-7,132,14,44,3);c.fill();c.stroke();c.fillStyle=DC.ink;rr(c,px-5,138,10,16,2);c.fill();var f=seg(u,0,.6);c.fillStyle=DC.green;glow(c,DC.green,6);c.fillRect(px-4,153-14*f,8,14*f);ng(c)});
  var mv=eio(seg(u,.72,1)),hop=Math.sin(DPI*mv)*6;
  for(var k=0;k<4;k++){var vt=VEH[((cyc+k)%4+4)%4],vx,vy;if(k===0){if(u>.62)continue;vx=SX[0];vy=150}else{vx=lerp(SX[k],SX[k-1],mv);vy=150-hop}
    vy+=rm?0:Math.sin(t*2.2+k)*1.5;
    if(k<2&&!(k===1&&mv>0)){var px2=PX[k],ex=vx-22,ey=vy+2;c.strokeStyle='#ff3df2';c.lineWidth=2.5;c.beginPath();c.moveTo(px2+7,142);c.quadraticCurveTo((px2+ex)/2+4,172,ex,ey);c.stroke();
      for(var d=0;d<3;d++){var q=rm?(d+.5)/3:(t*1.4+d/3)%1,qx=(1-q)*(1-q)*(px2+7)+2*(1-q)*q*((px2+ex)/2+4)+q*q*ex,qy=(1-q)*(1-q)*142+2*(1-q)*q*172+q*q*ey;glow(c,DC.green,8);circ(c,qx,qy,2,'#b8ffe0');ng(c)}}
    vt(c,vx,vy,1,t,{rm:rm})}
  if(u>.62&&!rm){var dp=seg(u,.62,1),dv=VEH[(cyc%4+4)%4],dx=200-30*dp,dy=150-175*dp*dp;c.fillStyle='rgba(61,230,255,.6)';c.beginPath();c.moveTo(dx-6,dy+16);c.lineTo(dx+6,dy+16);c.lineTo(dx,dy+30+10*dp);c.closePath();c.fill();dv(c,dx,dy,1,t,{rm:rm})}
  c.fillStyle='#2a1a5e';c.fillRect(136,58,162,20);c.fillStyle=DC.mag;glow(c,DC.mag,10);c.fillRect(136,57,162,2);ng(c);txt(c,'OPEN ALL NIGHT',217,72,'600 12px '+DMONO,DC.cyan);
  var fl=rm||!((t*5|0)%23===0);fuelSign(c,fl);
  /* the noodle stall, below the badge's corner */
  c.fillStyle='#2a0d2a';c.strokeStyle=DC.amber;c.lineWidth=1.5;glow(c,DC.amber,10);rr(c,306,84,46,38,12);c.fill();c.stroke();ng(c);
  c.fillStyle=DC.amber;c.beginPath();c.arc(329,106,10,0,DPI);c.closePath();c.fill();c.strokeStyle='#fff3d0';c.lineWidth=1.5;c.beginPath();c.moveTo(335,91);c.lineTo(327,104);c.moveTo(340,93);c.lineTo(331,104);c.stroke();
  for(var s2=0;s2<3;s2++){var sp=rm?.4:(t*.6+s2/3)%1;c.globalAlpha=Math.sin(DPI*sp)*.8;c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.moveTo(321+s2*7,96-sp*4);c.quadraticCurveTo(317+s2*7,91-sp*8,321+s2*7,86-sp*10);c.stroke()}c.globalAlpha=1;
  txt(c,'NOODLES',329,80,'600 12px '+DMONO,DC.amber);
  /* the now-serving board ticks along with the queue */
  c.strokeStyle='#4a3a7e';c.lineWidth=1;c.beginPath();c.moveTo(30,0);c.lineTo(30,14);c.moveTo(90,0);c.lineTo(90,14);c.stroke();c.fillStyle=DC.ink;c.strokeStyle='#ffb34799';c.lineWidth=1.5;rr(c,12,14,96,46,7);c.fill();c.stroke();
  txt(c,'NOW SERVING',60,30,'600 12px '+DMONO,DC.amber);txt(c,'No. '+(41+cyc+(u>.75?1:0)),60,54,'400 22px '+DDISP,DC.yellow,null,8);
  /* the cats' bay: a lamp, a pool of light, and a goodnight call home */
  c.fillStyle='#3a2a6e';c.fillRect(14,70,4,gy-70);c.fillRect(14,70,58,3);c.fillStyle='#5a4a9e';rr(c,58,72,18,6,3);c.fill();
  var bl=rm?1:seg(t,2.2,3.2);c.globalAlpha=bl;var lg=c.createLinearGradient(0,80,0,gy);lg.addColorStop(0,'rgba(255,200,120,.32)');lg.addColorStop(1,'rgba(255,200,120,.06)');c.fillStyle=lg;c.beginPath();c.moveTo(60,78);c.lineTo(74,78);c.lineTo(124,gy);c.lineTo(22,gy);c.closePath();c.fill();c.globalAlpha=1;
  var p=eo(seg(t,0,2.4)),sx=lerp(-70-OX,72,p),sy=lerp(70,150,p)+(rm?0:Math.sin(t*1.6));
  if(t>2.8||rm){var hs=rm?1:eo(seg(t,2.8,3.3)),asleep=t>5.4||rm;
    for(var a=0;a<3;a++){var ap=rm?.6:(t*.8+a/3)%1;c.globalAlpha=(1-ap)*hs;c.strokeStyle=DC.cyan;c.lineWidth=1.5;c.beginPath();c.arc(104,128,8+ap*14,-.9,.1);c.stroke()}c.globalAlpha=1;
    c.save();c.translate(141,108);c.scale(hs,hs);c.fillStyle='#0b1a3a';c.strokeStyle=DC.cyan;c.lineWidth=1.5;glow(c,DC.cyan,10);rr(c,-24,-17,48,34,6);c.fill();c.stroke();ng(c);
    c.save();rr(c,-22,-15,44,30,5);c.clip();c.fillStyle='#2a3a6a';c.fillRect(-22,-15,44,30);bedBack(c,0,16,.4,0);face(c,0,3,10,P.home,asleep,0);
    if(!asleep){var wv=Math.sin(t*8)*.5;c.save();c.translate(9,9);c.rotate(-1.5+wv);c.fillStyle=CP[P.home].f;rr(c,0,-2,9,4,2);c.fill();c.restore()}c.restore();c.restore();
    if(hs>.9)txt(c,'HOME',141,89,'600 12px '+DMONO,DC.cyan)}
  if(t>5.4||rm)zzz(c,sx+10,sy-38,t,rm);
  return{x:sx,y:sy,w:96,rot:lerp(.15,0,p),flame:1-seg(t,1.8,2.4),out:false}}
function dTow(c,t,rm,P){dsky(c,'#0a0524','#1a0f40');var d=t<2.6?8*t:t<3.6?20.8+8*(t-2.6)+26*(t-2.6)*(t-2.6):54.8+60*(t-3.6);if(rm)d=200;
  radial(c,60,40,110,'rgba(255,61,242,A)',.12);dstars(c,19,70,t,d*.25,rm);
  /* the depot ahead, lit by the tug's headlight */
  c.fillStyle='#24164f';c.fillRect(306,118,44,16);c.fillRect(316,110,24,8);for(var w=0;w<5;w++){c.fillStyle=(rm||Math.sin(t*1.3+w)>-.4)?DC.amber:'#5a3a10';c.fillRect(310+w*8,123,4,4)}glow(c,DC.cyan,8);c.fillStyle=DC.cyan;c.fillRect(306,134,44,2);ng(c);txt(c,'DEPOT',328,150,'600 12px '+DMONO,DC.cyan);
  for(var b=0;b<6;b++){var bx=((b*96-d*.9)%(96*4)+96*4)%(96*4)-20,on=rm||Math.sin(t*4+b)>0;c.fillStyle='#3a2a6e';c.fillRect(bx,166,3,14);glow(c,DC.cyan,on?10:0);circ(c,bx+1.5,165,3,on?DC.cyan:'#1a4a5a');ng(c)}
  var tp=rm?1:eo(seg(t,.8,2.2)),tx=lerp(430+OX,236,tp),ty=lerp(30,104,tp)+(rm?0:Math.sin(t*1.4)*2);
  var sx=104+(rm?0:Math.sin(t*1.1)*2),sy=136+(rm?0:Math.sin(t*1.4+.6)*3),rot=t<2.2&&!rm?-.1+Math.sin(t*1.5)*.08:-.08;
  if(t<1&&!rm){for(var i=0;i<3;i++)puff(c,sx-46,sy,((t+i*.33)%1),'#9a92b8')}
  if(tp>=1&&(t>2.2||rm)){c.save();var bg=c.createLinearGradient(tx-50,0,sx+30,0);bg.addColorStop(0,'rgba(255,230,0,.32)');bg.addColorStop(1,'rgba(255,230,0,.08)');c.fillStyle=bg;c.beginPath();c.moveTo(tx-50,ty-4);c.lineTo(sx+52,sy-40);c.lineTo(sx+52,sy+30);c.lineTo(tx-50,ty+12);c.closePath();c.fill();
    c.strokeStyle='rgba(255,230,0,.55)';c.lineWidth=1.2;c.beginPath();c.moveTo(tx-50,ty-4);c.lineTo(sx+52,sy-40);c.moveTo(tx-50,ty+12);c.lineTo(sx+52,sy+30);c.stroke();
    for(var r=0;r<4;r++){var rp=rm?r/4:(t*.9+r/4)%1,rx=lerp(sx+50,tx-50,rp),rh=lerp(34,8,rp);c.globalAlpha=(1-rp)*.7;c.strokeStyle=DC.yellow;c.lineWidth=2;c.beginPath();c.ellipse(rx,lerp(sy-5,ty+4,rp),4,rh,0,0,DTAU);c.stroke()}c.restore();c.globalAlpha=1}
  if(t>2.2&&t<2.8&&!rm){var lp=seg(t,2.2,2.8);c.globalAlpha=1-lp;c.strokeStyle=DC.yellow;c.lineWidth=3;c.beginPath();c.arc(sx+10,sy-6,20+lp*40,0,DTAU);c.stroke();c.globalAlpha=1}
  tug(c,tx,ty,1,t,{rm:rm,home:P.home,wave:t>2.6||rm});
  if(t>3||rm)zzz(c,sx+8,sy-38,t,rm);
  if(t>2.8||rm){c.globalAlpha=rm?1:seg(t,2.8,3.2);c.font='600 13px '+DSANS;var s='Got you. Nap time.',tw=c.measureText(s).width+18,bx2=226;c.fillStyle='#fff';rr(c,bx2-tw,34,tw,24,10);c.fill();c.beginPath();c.moveTo(bx2-10,58);c.lineTo(bx2+2,70);c.lineTo(bx2-26,58);c.fill();txt(c,s,bx2-tw/2,50,'600 13px '+DSANS,'#1a1030');
    txt(c,P.home==='charlee'?'CHARLEE':'KIMCHI',bx2-tw+4,28,'600 12px '+DMONO,DC.lilac,'left');c.globalAlpha=1}
  for(var k=0;k<9;k++){var dx=DW-(((k*53+d*2.4)%(DW+60))+60)+60,dy=(k*37)%150+12,ln=4+(t<2.6?2:40*seg(t,2.6,3.6));c.globalAlpha=.35;c.fillStyle='#dce6ff';c.fillRect(dx,dy,ln,1.3)}c.globalAlpha=1;
  return{x:sx,y:sy,w:104,rot:rot,flame:0,out:false}}
/* the FUEL lettering's glow is blurred once into a small offscreen canvas, not every frame */
var FUELC=null;
function fuelSign(c,lit){var ok=typeof document!=='undefined'&&(!document.fonts||document.fonts.check('34px Anton'));
  if(!ok){txt(c,'FUEL',217,50,'400 34px '+DDISP,lit?DC.mag:'#5a2050',null,lit?20:0);return}
  if(!FUELC){FUELC=[1,0].map(function(on){var k=document.createElement('canvas'),x;k.width=240;k.height=120;x=k.getContext('2d');x.scale(2,2);txt(x,'FUEL',60,46,'400 34px '+DDISP,on?DC.mag:'#5a2050',null,on?20:0);return k})}
  c.drawImage(FUELC[lit?0:1],217-60,50-46,120,60)}
var DEPOT={full:dFull,last:dLast,sight:dSight,stop:dStop,tow:dTow};
/* the still frame for reduced motion: the end state of each scene (cats together, queue in place) */
var STILL={full:GA.t0+2.4,last:GA.t0+2.4,sight:6,stop:7,tow:7};
/* draw ending k at time t on a stage w wide; returns the ship state */
/* a stage narrower than 358px scales the world down to fit, anchored to the ground, and the sky fills the band above;
   a wider one centres it and the world reaches out to both edges. The ship placement comes back in stage pixels. */
function depot(c,k,t,rm,P,w){var z=Math.min(1,w/DW);OX=Math.max(0,(w/z-DW)/2);TOP=DH*(1-z)/z;FW=w/z;c.save();c.translate(OX*z,DH*(1-z));c.scale(z,z);var st;try{st=DEPOT[k](c,t,rm,P)}finally{c.restore();c.shadowBlur=0;c.globalAlpha=1}
  return{x:(st.x+OX)*z,y:DH*(1-z)+st.y*z,w:st.w*z,rot:st.rot,flame:st.flame,out:st.out,flip:st.flip,z:z}}

/* host: the page's quiz section (its class stays exactly "gcard quiz", which check.py looks for); the run is drawn
   in a .wr box inside it. o: items, titles {n: title}, cat, saved(), resume(), each(picks),
   finish(picks) -> the page's result, after(), dayLine() -> {points, math, streak, mult}, maxPoints(), progress() */
function mount(host,o){
  host.textContent='';host.dataset.warp='1';var root=h('div','wr');host.append(root);
  var items=o.items,N=items.length,HOME=HOMEOF(N),cat=o.cat==='charlee'&&window.CHARLEE?'charlee':'kimchi';
  var P=NAME[cat],O=NAME[cat==='kimchi'?'charlee':'kimchi'],PAIR={pilot:cat,home:cat==='kimchi'?'charlee':'kimchi'},covered=false,tok=0,busy=false,keyPick=null,onScreen=false;
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
  /* a header at the top of the start screen, so the card reads as the quiz at a glance (13 Nov 2026); it steps aside once a run starts */
  var whd=h('div','w-hd'),whs=h('span','w-hds');whd.append(h('span','w-hdt','Today’s quiz'),whs);
  root.append(whd,stage,fuel,body,live);
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
    ship.classList.remove('out');if(S.end){ship.classList.toggle('off',S.end.k==='tow'||S.end.p>=1);ship.classList.toggle('sput',!!S.end.jit&&S.end.p<1)}else ship.classList.remove('off','sput')}
  /* the Night Depot endings place the real ship themselves; out: the pilot has hopped out, the dome is empty */
  function placeD(st){var sc=st.w/112;ship.style.transform='translate('+(st.x-56).toFixed(1)+'px,'+(st.y-33.5).toFixed(1)+'px) rotate('+(st.rot*57.3).toFixed(2)+'deg) scale('+(st.flip?-sc:sc).toFixed(3)+','+sc.toFixed(3)+')';
    ship.classList.remove('boost','sput');ship.classList.toggle('off',st.flame<.3);ship.classList.toggle('out',!!st.out)}
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
  function draw(now){var dt=Math.min(3,(now-last)/16.7);last=now;ctx.clearRect(0,0,W,H);
    if(S.end&&S.end.depot){var rm=reduce(),k=S.end.k;if(!S.end.broken){try{var st=depot(ctx,k,rm?STILL[k]:Math.max(0,(now-S.end.t0)/1000),rm,PAIR,W);root.dataset.fit=st.z;placeD(st);return}catch(e){S.end.broken=true;console.error(e)}}
      ctx.clearRect(0,0,W,H);sky('#070418','#1a0b45');drawStars(0,0,true);return}
    var sp=shipPos(now);
    if(S.end)scene(now);else{sky('#070418','#1a0b45');drawStars(sp.warp,dt,false);if(S.ring)drawRing(now);drawShield(sp)}
    place(sp)}
  /* the loop runs only while the quiz is on screen, the page is visible and motion is allowed; otherwise one still */
  var looping=false;
  function running(){return onScreen&&!covered&&!document.hidden&&!reduce()&&root.isConnected}
  function loop(now){if(!running()){looping=false;return}try{draw(now)}catch(e){console.error(e)}requestAnimationFrame(loop)}
  function sync(){root.classList.toggle('live',running());if(running()){if(!looping){looping=true;last=performance.now();requestAnimationFrame(loop)}}else if(root.isConnected)draw(performance.now())}
  function redraw(){if(!looping)try{draw(performance.now())}catch(e){console.error(e)}}
  fit();
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){es.forEach(function(e){onScreen=e.isIntersecting});if(onScreen&&stale)pilotIn();if(onScreen&&S.end&&S.end.depot&&!S.end.seen){S.end.seen=true;S.end.t0=performance.now()}sync()},{threshold:0}).observe(stage);else{onScreen=true;sync()}
  document.addEventListener('visibilitychange',sync);try{var mq=matchMedia('(prefers-reduced-motion: reduce)');if(mq.addEventListener)mq.addEventListener('change',sync)}catch(e){}
  if('ResizeObserver' in window){var ro=new ResizeObserver(function(){if(!root.isConnected){ro.disconnect();return}fit();redraw()});ro.observe(stage)}
  function pilotIn(){stale=false;try{if(window.MBScores&&MBScores.mountPilot)MBScores.mountPilot(ship,cat)}catch(e){}}
  /* one Kimchi runs at a time: the tour, the share card or the story he hides in stop this one. When that
     overlay closes, he gets back in the ship (now, or when the quiz is next on screen) */
  /* the loop also stops while a sheet or My scores covers the page */
  var stale=false;
  if('MutationObserver' in window)new MutationObserver(function(ms){if(!root.isConnected)return;var was=covered;covered=!!document.querySelector('.sheet,.cc-over');
    if(cat==='kimchi'){var gone=ms.some(function(m){return [].some.call(m.removedNodes,function(n){return n.nodeType===1&&/(^| )(sheet|cc-over|tr)( |$)/.test(n.className||'')})});
      if(gone&&!document.querySelector('.sheet,.cc-over,.tr')){stale=true;if(onScreen)pilotIn()}}
    if(was!==covered)sync()}).observe(document.body,{childList:true});
  /* during a run the scene is compact and the badge steps aside, so a question and its answers fit one screen */
  function setRun(on){root.classList.remove('at-intro');root.classList.toggle('compact',on);document.body.classList.toggle('wr-run',on);fit()}
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
  function reset(){root.classList.remove('at-intro');tok++;keyPick=null;S.ring=null;S.anim=null;S.end=null;ov.textContent='';ov.className='w-ov';body.textContent='';delete root.dataset.ending;cells.classList.remove('party');cl.forEach(function(c){c.classList.remove('low','charge')})}
  function intro(){reset();setRun(false);busy=false;root.classList.add('at-intro');whs.textContent=plural(N,'question','questions')+' · up to '+o.maxPoints()+' points';var resume=o.resume().slice(0,N),done=resume.length;
    var right=resume.filter(function(k,j){return k===items[j].answer}).length;setCells(right);status(done?N-done:null);
    var ul=h('ul','w-les'),rv=[];items.forEach(function(it){if(it.kind==='review'||it.kind==='recap'){if(it.n&&rv.indexOf(it.n)<0)rv.push(it.n);return}
      var li=h('li',null,it.tag+' · '+(it.kind==='news'?'news':it.n?'lesson '+it.n+(o.titles&&o.titles[it.n]?': '+o.titles[it.n]:''):'question'));li.style.setProperty('--c',TAGC[it.tag]||'#c9b8ff');ul.append(li)});
    if(rv.length){var r=h('li',null,'Revision: '+(rv.length===1?'lesson '+rv[0]:'lessons '+rv.slice(0,-1).join(', ')+' and '+rv[rv.length-1]));r.style.setProperty('--c','#c9b8ff');ul.append(r)}
    var b=btn(done?'Resume quiz':'Launch','','start',function(){launch(resume)});
    ul.setAttribute('aria-label','What the questions cover');body.append(h('h2','w-q',done?'You are '+plural(done,'question','questions')+' in':N+' charge rings between the cats and home'),
      h('p','w-sub',done?'Pick up where you left off. '+plural(right,'cell is','cells are')+' already charged.':'Each right answer flies the ship through a ring and charges a fuel cell. '+HOME+' cells get '+P+' home. Up to '+o.maxPoints()+' points today.'),b,h('span','w-lesh','What the questions cover'),ul);
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
  function endScene(k){var now=performance.now();
    /* the Night Depot scenes: every ending with the cat bed as home; the fuel stop and tow in either case */
    if(BED||k==='stop'||k==='tow'){S.end={k:k,t0:now,depot:true,p:1,seen:onScreen};root.dataset.scene=k;if(BED&&k!=='stop'&&k!=='tow')root.dataset.drawn='bed';redraw();return}
    var F={full:{x:W-(BED?140:104),y:0,s:.8,rot:-4},last:{x:W-(BED?140:104),y:0,s:.8,rot:6,jit:1},sight:{x:W*.68,y:0,s:.72,rot:0,flip:1},stop:{x:W*.3,y:H-44-30,s:.78,rot:0},tow:{x:W*.36,y:H*.58,s:.8,rot:-12}}[k];
    if(k==='full'||k==='last')F.y=surf(W-80,H*.74,70,F.x)-24;if(k==='sight')F.y=surf(W*.62,H+112,170,W*.68)-22;
    S.end=Object.assign({k:k,t0:now,dur:k==='tow'?2600:1900,x0:k==='tow'?40:k==='sight'?W+70:-70,y0:k==='tow'?H*.6:H*.4,s0:1,p:reduce()?1:0},F);redraw()}
  function streakRow(sk,mult){var r=h('div','streak'+(sk>0?' flame-on':'')),f=h('span');f.innerHTML=FLAME;r.append(f);if(sk>0||mult<=1)r.append(h('b',null,sk>0?sk+'-day streak':'No streak yet'));r.append(mult>1?h('span','chip','×'+mult+' multiplier on'):h('span','chip off','×1.5 from day 5'));return r}
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
  function celebrate(k){if(BED)return;if(k==='full')later(function(){for(var j=0;j<12;j++)later(function(){fx.burst(30+Math.random()*(W-60),30+Math.random()*80,44,{speed:5,g:.06})},j*280)},T(1500));
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
      c.append(hd,h('p',null,P+' refuels on the rings you put right and flies home'+(BED?', where '+O+' is waiting by the cat bed. ':'. ')+(sv?'Today’s score stays '+sv.score+'/'+sv.total+' and +'+sv.points+' points: practice adds none.':'Practice adds no points.')));f.append(c);
      stat.textContent='';stat.append(h('b',null,'Home with '+S.cells+' of '+N+' cells. '),'Practice cells count for the story only.');say('Home after practice.');f.append(againBtn());body.append(f);toTop(root);focusEl(hd);
      if(!BED)later(function(){for(var j=0;j<5;j++)later(function(){fx.burst(30+Math.random()*(W-60),30+Math.random()*80,36,{speed:5,g:.06})},j*300)},T(1500))}
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
