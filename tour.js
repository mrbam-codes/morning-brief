/* tour.js: the first-visit tour (plan 17), ported from the approved mock-up, direction 1 "Flight school"
   (morning-brief-directions/first-visit-tour.html). The page dims, a neon ring lights one real part of the
   page at a time, and the pilot cat in its ship sits on a card beside it: a heading, an Aim line, a You get
   line and a "1 of 7" counter. Skip tour and Next are on screen at every stop.
   Rules:
   - Each stop finds its part by a data-tour hook in the page (learn, today, builds, quiz, bar), never by
     position. A part that is not on the page that day (for example no builds) is skipped, and the counter
     total drops to match.
   - It starts once, after the day's brief has drawn (index.html calls MBTour.ready() at the end of render),
     and never on top of a sheet, the score panel or share card, or Move my progress while it is in use.
   - Seen is stored under its own key, mb-tour-v1, apart from the streak and points in mb-v1, which this file
     never reads or writes. Skip, Escape and finishing all set it. Every storage call is guarded: if the
     browser blocks storage, the tour simply shows again and nothing breaks.
   - The ring goes round the part's main block (the swipe row of a deck, the arcade cabinet), found inside the
     hooked part.
   - The card (cat plus speech card) is fixed to the screen and flies between two docks, top and bottom, inside
     the safe areas and above the bar with Skip tour: stop 1 in the middle, then top, bottom, top, and so on.
     The lit-up part wins: if the turn's dock would cover it, the other dock is used (except on two stops that
     share a part, where the card must still move). The ring is always cut back to what the card leaves clear,
     so the card never covers the ring.
   - The flight is about 600 ms along a curve, banking, with a short neon trail, transform and opacity only.
     Next during a flight lands it at once and goes on, so taps never queue. The new text is announced once,
     on landing, and focus stays on Next.
   - The cat is the one now flying the share card's ship (MBScores.pilotNow). The ship comes from
     scorecard.js and the cat from kimchi.js or charlee.js, all unchanged.
   - Escape closes, Tab stays on the tour's own buttons, and focus goes back to the Tour button.
     With reduced motion there is no flight, pulsing or bobbing, only plain fades.
   Text goes in with textContent only. To reuse this on another page, only STOPS changes. */
(function(){
'use strict';
var KEY='mb-tour-v1',FADE=220,GAP=10,PAD=6;
var STOPS=[
  {head:'Welcome aboard',text:'Ten minutes a day to understand AI (artificial intelligence), technology and cyber security, starting from zero. Every term is explained. The aim: follow the news, judge the claims and start building things yourself.'},
  {hook:'learn',need:'.cd',ring:'.deck',head:'Learn',aim:'one idea at a time, in plain English, with a diagram.',get:'after each 3 minute lesson you can explain it to someone else.'},
  {hook:'learn',need:'.cd',ring:'.deck',head:'How the lessons are made',text:'A planned course of 577 lessons in 11 subject areas, such as AI from first principles, Cyber foundations, Building with AI, and Law, policy and geopolitics. Each morning an AI writes the day’s lessons from sources it opens that day, and an automatic checker refuses anything that breaks the rules.',
    chips:[['AI from first principles','#ff8fb3'],['Cyber foundations','#b9a3ff'],['Building with AI','#3dffa2'],['Law, policy and geopolitics','#ffe600']]},
  {hook:'today',ring:'.deck',head:'Today',aim:'the few stories that matter, not the noise.',get:'what happened, why it matters to you, and a link to the source.'},
  {hook:'builds',ring:'.bw-cab',head:'Built in the wild',aim:'real things people made with AI, each rated by the proof behind it.',get:'ideas you could copy, and a first step to try.'},
  {hook:'quiz',head:'Quiz',aim:'make today stick.',get:'a streak, points and a rank, plus review questions that bring back earlier lessons.'},
  {hook:'bar',head:'Your kit',text:'Progress tracks your streak. Review replays past questions. Glossary explains every term. Add the page to your home screen and I will see you tomorrow. The Tour button replays this.',home:true}
];
var NS='http://www.w3.org/2000/svg';
var reduce=function(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)};
function seen(){try{return window.localStorage.getItem(KEY)!==null}catch(e){return false}}
function mark(){try{window.localStorage.setItem(KEY,'1')}catch(e){}}
function el(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
/* a stop's part, or null when it is not on the page today */
function part(s){if(!s.hook)return null;var n=document.querySelector('[data-tour="'+s.hook+'"]');
  if(!n||!n.getClientRects().length)return null;if(s.need&&!n.querySelector(s.need))return null;return n}
/* a full-screen sheet, the score panel or the share card is open */
function covered(){return !!document.querySelector('.sheet,.cc-over')}
/* Move my progress is being used: typing in it, or its paste box or question is open */
function moving(){var a=document.activeElement;if(a&&a.closest&&a.closest('.move'))return true;
  return !!document.querySelector('.move .mv-paste:not([hidden]),.move .mv-ask:not([hidden])')}
function tourBtn(){return document.querySelector('[data-tour-btn]')}
/* the two home-screen icons, drawn with DOM calls */
function icon(kind){var s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');
  if(kind==='share'){s.setAttribute('fill','none');s.setAttribute('stroke','#00f0ff');s.setAttribute('stroke-width','2.2');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');
    ['M12 3v12M7 8l5-5 5 5','M5 12v8h14v-8'].forEach(function(d){var p=document.createElementNS(NS,'path');p.setAttribute('d',d);s.append(p)})}
  else{s.setAttribute('fill','#00f0ff');[5,12,19].forEach(function(y){var c=document.createElementNS(NS,'circle');c.setAttribute('cx','12');c.setAttribute('cy',String(y));c.setAttribute('r','2.2');s.append(c)})}
  var w=el('span','hm-ic');w.setAttribute('aria-hidden','true');w.append(s);return w}
function homeBox(){var b=el('div','tr-home');b.append(el('p','hm-h','Add to home screen'));
  var row=function(kind,who,a,b2){var r=el('div','hm-row'),t=el('span');t.append(el('b',null,who+': '),a,el('b',null,b2),'.');r.append(icon(kind),t);return r};
  b.append(row('share','iPhone','tap Share, then ','Add to Home Screen'),row('menu','Android','tap the menu, then ','Install app'));return b}

var T=null,toastT=0;
function toast(msg){var t=document.querySelector('.tr-toast');if(!t){t=el('p','tr-toast');t.setAttribute('role','status');document.body.append(t)}
  t.textContent=msg;setTimeout(function(){t.classList.add('on')},20);clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on')},2800)}

function run(stops){
  var n=stops.length,rm=reduce(),cat=window.MBScores&&MBScores.pilotNow?MBScores.pilotNow():'kimchi';
  var ov=el('div','tr');ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Tour of the page, '+n+' steps. Press Escape to close it.');
  var safe=el('div','tr-safe'),blk=[0,1,2,3].map(function(){return el('div','tr-blk')}),ring=el('div','tr-ring');
  var card=el('div','tr-card');card.setAttribute('role','group');
  var top=el('div','tr-top'),ship=el('div','tr-ship');ship.setAttribute('aria-hidden','true');
  if(window.MBScores&&MBScores.shipHTML)ship.innerHTML=MBScores.shipHTML(cat,'PILOT','-tour');/* fixed markup from scorecard.js, no outside data */
  var who=el('div','tr-who'),count=el('span','tr-count');who.append(el('span','tr-name',cat==='charlee'?'Charlee':'Kimchi'),count);top.append(ship,who);
  var body=el('div','tr-body');card.append(top,body);
  var live=el('p','tr-vh');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');
  var bar=el('div','tr-bar'),skip=el('button','tr-skip','Skip tour'),back=el('button','tr-back','\u2190'),dots=el('div','tr-dots'),next=el('button','tr-next','Next');
  skip.type=back.type=next.type='button';back.setAttribute('aria-label','Back to the previous step');back.hidden=true;dots.setAttribute('aria-hidden','true');for(var k=0;k<n;k++)dots.append(el('i'));bar.append(skip,back,dots,next);
  ov.append(safe);blk.forEach(function(b){ov.append(b)});ov.append(ring,card,bar,live);
  document.body.append(ov);
  if(ship.firstChild&&MBScores.mountPilot)try{MBScores.mountPilot(ship,cat)}catch(e){}
  /* cur: the stop on screen; tgt: its part; ringEl: what the ring goes round; dock: where the card sits (mid, top or bottom);
     pos: the card's landed corner; fl: the flight in progress; shown: the card has landed and the ring may light */
  var cur=-1,tgt=null,ringEl=null,dock='mid',pos=null,fl=null,shown=false,tok=0,dead=false,ro=null,iv=0,mo=null;

  /* one stop's text, built apart so the card can be measured before it flies */
  function build(s,i){var box=el('div'),said=[s.head+'.'];box.append(el('h2','tr-h',s.head));
    if(s.text){box.append(el('p','tr-p',s.text));said.push(s.text)}
    if(s.aim){var a=el('p','tr-p'),g=el('p','tr-p');a.append(el('b',null,'Aim:'),' '+s.aim);g.append(el('b',null,'You get:'),' '+s.get);box.append(a,g);said.push('Aim: '+s.aim,'You get: '+s.get)}
    if(s.chips){var c=el('div','tr-chips');c.setAttribute('aria-hidden','true');s.chips.forEach(function(x){var t=el('span',null,x[0]);t.style.setProperty('--c',x[1]);c.append(t)});box.append(c)}
    if(s.home){box.append(homeBox());said.push('To add it to your home screen: on an iPhone, tap Share, then Add to Home Screen. On Android, tap the menu, then Install app.')}
    return{i:i,s:s,box:box,said:'Step '+(i+1)+' of '+n+'. '+said.join(' ')}}
  function apply(nb){body.textContent='';while(nb.box.firstChild)body.append(nb.box.firstChild);
    count.textContent=(nb.i+1)+' of '+n;card.setAttribute('aria-label','Step '+(nb.i+1)+' of '+n+': '+nb.s.head);
    [].forEach.call(dots.children,function(d,j){d.className=j<nb.i?'ok':j===nb.i?'on':''});next.textContent=nb.i===n-1?'Start reading':'Next';
    var hadFocus=document.activeElement===back;back.hidden=nb.i===0;if(back.hidden&&hadFocus)try{next.focus({preventScroll:true})}catch(e){}}   /* no Back on the first stop */
  function measure(nb){var m=card.cloneNode(true),mb=m.querySelector('.tr-body');mb.textContent='';mb.append(nb.box.cloneNode(true));
    m.style.visibility='hidden';m.style.transform='none';m.classList.remove('on');ov.append(m);var h=m.offsetHeight;m.remove();return h}
  /* the free band between the top safe area and the bar (which sits above the home-screen bar) */
  function band(){return{T:safe.offsetHeight+8,B:window.innerHeight-bar.offsetHeight-4}}
  function dockY(d,ch,b){return d==='top'?b.T:d==='bottom'?b.B-ch:b.T+Math.max(0,(b.B-b.T-ch)/2)}
  function tf(p,a,sc){return 'translate('+Math.round(p[0])+'px,'+Math.round(p[1])+'px)'+(a?' rotate('+a.toFixed(2)+'deg)':'')+(sc&&sc!==1?' scale('+sc.toFixed(3)+')':'')}
  function set(e,x,y,w,h){e.style.left=Math.round(x)+'px';e.style.top=Math.round(y)+'px';e.style.width=Math.max(0,Math.round(w))+'px';e.style.height=Math.max(0,Math.round(h))+'px'}
  function dim(){var W=document.documentElement.clientWidth,H=window.innerHeight;set(blk[0],0,0,W,H);set(blk[1],0,0,0,0);set(blk[2],0,0,0,0);set(blk[3],0,0,0,0)}
  /* where the card lands and where the page scrolls to. Stop 1 sits in the middle, then the docks take turns:
     top, bottom, top. The part wins: if the turn's dock would cover it, the other dock is used, except that two stops
     on the same part always swap docks so the card visibly moves; then the ring keeps to what is clear. */
  function plan(i,re,ch,samePart){var pref=i===0?'mid':i%2?'top':'bottom';if(!re)return{dock:pref,pref:pref,want:null};
    var b=band(),r=re.getBoundingClientRect(),docTop=window.scrollY+r.top-PAD,th=r.height+2*PAD,max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    if(pref==='mid')pref='top';
    var want=function(d){var a=d==='top'?b.T+ch+GAP:b.T,z=d==='top'?b.B:b.B-ch-GAP,rh=z-a,off=th<rh?(rh-th)/2:0;return Math.max(0,Math.min(max,Math.round(docTop-(a+off))))};
    var over=function(d,w){var t=Math.max(b.T,docTop-w),bt=Math.min(b.B,docTop-w+th),z0=d==='top'?b.T:b.B-ch-GAP,z1=d==='top'?b.T+ch+GAP:b.B;return Math.max(0,Math.min(bt,z1)-Math.max(t,z0))};
    var d=pref,w=want(d),o=d==='top'?'bottom':'top';
    var why='';if(over(d,w)>0&&!samePart){var w2=want(o);if(over(o,w2)===0){d=o;w=w2;why='clear'}}
    return{dock:d,pref:i===0?'mid':pref,want:w,why:why}}
  function place(){if(dead)return;if(hold())return;if(fl)return;
    var W=document.documentElement.clientWidth,H=window.innerHeight,b=band(),R=null;
    card.style.maxHeight=Math.max(120,b.B-b.T)+'px';var cw=card.offsetWidth,ch=card.offsetHeight;
    pos=[(W-cw)/2,dockY(dock,ch,b)];card.style.transform=tf(pos);
    if(shown&&ringEl&&ringEl.isConnected){var r=ringEl.getBoundingClientRect(),x1=Math.max(3,r.left-PAD),x2=Math.min(W-3,r.right+PAD),y1=Math.max(b.T,r.top-PAD),y2=Math.min(b.B,r.bottom+PAD);
      if(dock==='top')y1=Math.max(y1,pos[1]+ch+GAP);else if(dock==='bottom')y2=Math.min(y2,pos[1]-GAP);
      if(y2-y1>=24&&x2-x1>=24)R=[x1,y1,x2,y2]}
    if(R){set(blk[0],0,0,W,R[1]);set(blk[1],0,R[3],W,H-R[3]);set(blk[2],0,R[1],R[0],R[3]-R[1]);set(blk[3],R[2],R[1],W-R[2],R[3]-R[1]);set(ring,R[0],R[1],R[2]-R[0],R[3]-R[1])}
    else dim();
    ring.classList.toggle('on',!!R)}
  /* the flight: about 600 ms along a curve, banking towards where it is going, with a short neon trail; transform
     and opacity only. The old text fades on take-off and the new text is put in while it is out of sight.
     Reduced motion: no flight, the card fades out and back in at the new dock. fin() lands it at once. */
  function fly(from,to,swap,land){var done=false,swapped=false,anims=[],trails=[],t1=0;
    var doSwap=function(){if(!swapped){swapped=true;swap()}};
    var fin=function(){if(done)return;done=true;clearTimeout(t1);doSwap();anims.forEach(function(a){try{a.cancel()}catch(e){}});trails.forEach(function(t){t.remove()});
      card.style.transform=tf(to);body.classList.remove('off');card.classList.add('on');fl=null;land()};
    fl={fin:fin};
    if(rm||!card.animate){card.classList.remove('on');t1=setTimeout(function(){doSwap();card.style.transform=tf(to);t1=setTimeout(fin,30)},230);return}
    body.classList.add('off');t1=setTimeout(doSwap,150);setTimeout(fin,750);   /* lands even if the browser never finishes the animation */
    var dx=to[0]-from[0],dy=to[1]-from[1],dist=Math.hypot(dx,dy),side=(cur%2?1:-1)*Math.min(34,18+dist*.05),
      cx=(from[0]+to[0])/2+(dist>4?-dy/dist:1)*side,cy=(from[1]+to[1])/2+(dist>4?dx/dist:0)*side-(dist>4?0:40),
      bank=Math.max(-7,Math.min(7,dy/40)),kf=[],tk=[],sx=70,sy=45;
    for(var k=0;k<=10;k++){var t=k/10,u=1-t,x=u*u*from[0]+2*u*t*cx+t*t*to[0],y=u*u*from[1]+2*u*t*cy+t*t*to[1],s=Math.sin(Math.PI*t);
      kf.push({transform:tf([x,y],bank*s,1-.05*s)});tk.push({transform:'translate('+Math.round(x+sx)+'px,'+Math.round(y+sy)+'px) rotate('+(Math.atan2(dy||1,dx||0)*57.3+180).toFixed(1)+'deg)',opacity:k===0||k===10?0:.9*s})}
    card.style.transform=tf(to);
    var a=card.animate(kf,{duration:600,easing:'ease-in-out'});anims.push(a);a.onfinish=fin;
    [70,140,210].forEach(function(d,j){var tr=el('i','tr-trail');ov.insertBefore(tr,card);trails.push(tr);
      anims.push(tr.animate(tk,{duration:600,delay:d,easing:'ease-in-out',fill:'both'}));tr.style.opacity=String(.8-j*.2)})}
  /* scroll the page to the next part while the card flies; both are fixed to the screen, so nothing drifts */
  function scroll(t,want,cb){if(want==null||Math.abs(want-window.scrollY)<2)return cb();
    try{window.scrollTo({top:want,behavior:rm?'auto':'smooth'})}catch(e){window.scrollTo(0,want)}
    var t0=Date.now(),last=-1,still=0;
    (function wait(){if(t!==tok||dead)return;var y=window.scrollY;still=Math.abs(y-last)<.5?still+1:0;last=y;
      if(Math.abs(y-want)<1||still>=8||Date.now()-t0>1200){if(Math.abs(window.scrollY-want)>=1)window.scrollTo(0,want);cb()}else setTimeout(wait,30)})()}
  function go(i,bk){if(dead)return;tok++;var t=tok;if(fl)fl.fin();                  /* a tap mid-flight lands it at once; taps never queue */
    while(i>0&&i<n&&stops[i].hook&&!part(stops[i]))i+=bk?-1:1;if(i<0)i=0;                                /* a part that has gone since the start is skipped */
    if(i>=n)return end('done');
    var s=stops[i],nt=part(s),re=nt?(s.ring&&nt.querySelector(s.ring))||nt:null,nb=build(s,i),ch=measure(nb);
    var pl=plan(i,re,ch,!!nt&&nt===tgt),b=band(),W=document.documentElement.clientWidth,cw=card.offsetWidth,to=[(W-cw)/2,dockY(pl.dock,ch,b)],from=pos;
    cur=i;tgt=nt;ringEl=re;dock=pl.dock;shown=false;card.dataset.dock=pl.dock;card.dataset.pref=pl.pref;card.dataset.why=pl.why||'';ring.classList.remove('on');dim();
    if(ro){ro.disconnect();if(re)ro.observe(re);ro.observe(card)}
    var left=2,land=function(){if(--left||t!==tok||dead)return;shown=true;place();live.textContent=nb.said};  /* announced once, on landing */
    scroll(t,pl.want,land);
    if(!from){apply(nb);pos=to;card.style.transform=tf(to);card.style.transition='none';card.classList.add('on');void card.offsetWidth;card.style.transition='';land()}  /* the first card is there at once, as in the mock-up */
    else{pos=to;fly(from,to,function(){apply(nb)},land)}}
  function end(how){if(dead)return;tok++;if(fl)fl.fin();dead=true;mark();T=null;
    document.removeEventListener('keydown',key);window.removeEventListener('scroll',place);window.removeEventListener('resize',place);clearInterval(iv);if(ro)ro.disconnect();
    if(mo)mo.disconnect();ov.classList.add('out');setTimeout(function(){ov.remove()},280);
    toast(how==='done'?'Tour done. Tap Tour at the top to see it again.':'Tour skipped. Tap Tour at the top to see it again.');
    var b=tourBtn();if(b)try{b.focus({preventScroll:true})}catch(e){}}
  function key(e){if(dead||covered())return;
    if(e.key==='Escape'){e.preventDefault();end('skip');return}
    if(e.key==='Tab'){var L=[skip,back,next].filter(function(b){return !b.hidden}),k=L.indexOf(document.activeElement);e.preventDefault();
      L[k<0?(e.shiftKey?L.length-1:0):(k+(e.shiftKey?-1:1)+L.length)%L.length].focus({preventScroll:true})}}
  skip.onclick=function(){end('skip')};
  next.onclick=function(){if(!dead)go(cur+1)};
  back.onclick=function(){if(!dead&&cur>0)go(cur-1,true)};
  document.addEventListener('keydown',key);
  window.addEventListener('scroll',place,{passive:true});window.addEventListener('resize',place);
  if('ResizeObserver' in window)ro=new ResizeObserver(function(){place()});
  /* hide and pause the tour while something opens on top of it, so it costs nothing there */
  var hold=function(){var h=covered();ov.classList.toggle('hold',h);return h};
  if('MutationObserver' in window){mo=new MutationObserver(function(){if(!hold())place()});mo.observe(document.body,{childList:true})}
  iv=setInterval(place,500);                                        /* the page can still shift under the ring (photos, fonts) */
  dim();try{next.focus({preventScroll:true})}catch(e){}
  go(0);
  return{end:end,step:function(){return cur},total:n,flying:function(){return !!fl}}}

function start(){if(T)return;var stops=STOPS.filter(function(s){return !s.hook||part(s)});if(stops.length)T=run(stops)}
var waiting=false;
/* called by the page once the brief has drawn: on a first visit, start as soon as nothing else is on screen */
function ready(){if(waiting||T||seen())return;waiting=true;
  setTimeout(function again(){if(T||seen()){waiting=false;return}
    if(document.hidden||covered()||moving()){setTimeout(again,1000);return}
    waiting=false;start()},700)}
/* the Tour button in the top bar; index.html makes a fresh one each time it redraws the bar */
function button(){var b=el('button','tour-btn','Tour');b.type='button';b.setAttribute('data-tour-btn','');b.setAttribute('aria-label','Tour: how this page works');b.onclick=start;return b}
window.MBTour={ready:ready,start:start,button:button,isOpen:function(){return !!T},KEY:KEY};
})();
