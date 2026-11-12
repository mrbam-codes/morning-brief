/* sieve.js: "How this brief was made" as the Sieve card (plan 22), from the approved mock-up, direction 1
   (morning-brief-directions/how-made-card.html). Morning brief only: evidence.js stays the shared file and
   this one borrows its source and tier rules (Evidence.sources, Evidence.tierOf), so the tiers match check.py.
   Closed, it is one small card: a live sieve drawing (dots stream in as searches, pink ones bounce off the
   gate, green ones settle) and the exact counts under it. Tapped, it opens a timeline with every figure:
   searches, each rejected lead and its reason, stories kept, build and photo counts when the edition has
   them, the sources by tier, the note and what the tiers mean.
   Rules:
   - The drawing is decoration; the numbers are page text and are always exact, with or without motion.
     The dots stand for the counts in proportion only.
   - The drawing runs only while the card is on screen and the page is visible. With reduced motion it is a
     still picture.
   - An edition with no evidence block (before 11 November 2026) shows its sources only, and no drawing.
   - The card is a real button (aria-expanded); the closed timeline is inert. Text goes in with textContent
     only. Nothing is sent anywhere, and it never throws into the page. */
(function(){
'use strict';
var TIERS=['original','secondary','lead','unlisted'];
var T={
  original:{name:'Original reporting',col:'#3dffa2',def:'The outlet did the reporting itself, or it is the organisation speaking about its own work, such as a lab’s blog or a regulator.'},
  secondary:{name:'Good secondary',col:'#3de6ff',def:'Good outlets that mostly rewrite or reprint other people’s reporting. Fine as a source, but the brief cites the original when it is open to read.'},
  lead:{name:'Lead only',col:'#ffe600',def:'Social posts, forums, press-release wires, aggregators and rumour sites. They can point to a story but cannot be its only source.'},
  unlisted:{name:'Not yet rated',col:'#c3bddc',def:'An outlet not yet in the register. It is allowed, and shown as unrated until it turns up often enough to be given a tier.'}
};
var META='Tiers come from the source register in this site’s code. A lead-only source, such as a social post or a rumour site, can point to a story, but from 11 November 2026 it cannot be a story’s only source.';
var made=0;
function el(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function whole(v){return typeof v==='number'&&isFinite(v)&&v>=0&&Math.floor(v)===v}
function fmt(n){return Number(n).toLocaleString('en-GB')}
function pl(n,one,many){return n===1?one:many}
function reduce(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}
function onReduceChange(fn){try{var q=matchMedia('(prefers-reduced-motion: reduce)');if(q.addEventListener)q.addEventListener('change',fn)}catch(e){}}

/* one stop on the timeline: a glowing dot, a big number (or none) and its label, then the detail */
function stage(i,col,sym,num,label,body){var s=el('div','sv-st');s.style.setProperty('--c',col);s.style.setProperty('--i',i);
  var dot=el('span','sv-dot',sym);dot.setAttribute('aria-hidden','true');var w=el('div'),h=el('h3');
  if(num!=null)h.append(el('b',null,num),' ');h.append(el('span',null,label));w.append(h);body.forEach(function(n){if(n)w.append(n)});s.append(dot,w);return s}

/* a count pair such as builds: the kept number leads, the searches go in the line under it */
function pair(ev,sKey,kKey,thing,things,searchWord){var s=ev[sKey],k=ev[kKey];if(!whole(s)&&!whole(k))return null;
  if(whole(k))return{num:fmt(k),label:pl(k,thing,things)+' kept',line:whole(s)?'Found in '+fmt(s)+' '+pl(s,searchWord+' search',searchWord+' searches')+'.':null};
  return{num:fmt(s),label:pl(s,searchWord+' search',searchWord+' searches')+' run',line:null}}

function mount(parent,b){
  var root=el('section','gcard sieve');
  try{build(root,b)}catch(e){if(window.console)console.error(e);root.textContent='';root.className='gcard';root.append(el('h2',null,'How this brief was made'),el('p',null,'This panel could not be drawn.'))}
  parent.append(root);
  try{if(root._start)root._start()}catch(e){if(window.console)console.error(e)}
  return root}

function build(root,b){
  var ev=b&&b.evidence&&typeof b.evidence==='object'&&!Array.isArray(b.evidence)?b.evidence:null;
  var list=window.Evidence?Evidence.sources(b||{}):[];
  var rj=ev&&Array.isArray(ev.rejected)?ev.rejected.filter(function(r){return r&&typeof r==='object'}):[];
  var searches=ev&&whole(ev.searches)?ev.searches:null,kept=ev&&whole(ev.kept)?ev.kept:null,note=ev&&typeof ev.note==='string'&&ev.note.trim()?ev.note.trim():'';
  var id='sv-x'+(++made);
  root.setAttribute('aria-label','How this brief was made');

  /* ---- the closed card ---- */
  var btn=el('button','sv-card');btn.type='button';btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls',id);
  var top=el('span','sv-top'),cue=el('span','sv-cue','See the proof'),ar=el('i',null,'▾');ar.setAttribute('aria-hidden','true');cue.append(ar);
  top.append(el('span','sv-kick','How this brief was made'),cue);btn.append(top);
  var cv=null;if(ev){cv=el('canvas','sv-cv');cv.setAttribute('aria-hidden','true');btn.append(cv)}
  var nums=el('span','sv-nums'),said=[];
  function tile(cls,n,one,many){var s=el('span',cls);s.append(el('b',null,fmt(n)),el('em',null,pl(n,one,many)));nums.append(s);said.push(fmt(n)+' '+pl(n,one,many))}
  if(searches!=null)tile('',searches,'search','searches');
  if(ev)tile('r',rj.length,'rejected','rejected');
  if(kept!=null)tile('g',kept,'kept','kept');
  tile('s',list.length,'source','sources');
  nums.style.setProperty('--n',String(nums.children.length));btn.append(nums);
  if(!ev)btn.append(el('span','sv-old','This edition came before the morning run kept its search counts, so it shows its sources only.'));
  btn.setAttribute('aria-label','How this brief was made: '+said.join(', ')+'. Show the full proof');

  /* ---- the timeline ---- */
  var xp=el('div','sv-xp'),inner=el('div'),box=el('div','sv-in');xp.id=id;xp.setAttribute('role','region');xp.setAttribute('aria-label','How this brief was made, in full');
  var st=el('div','sv-stages'),i=0;
  if(searches!=null)st.append(stage(i++,'#c9b8ff','⌕',fmt(searches),pl(searches,'search run','searches run'),[el('p',null,'This morning’s run searched the web for AI, technology and cyber security news. The dots in the sieve stand for these searches.')]));
  if(ev){var body=[];
    if(rj.length){body.push(el('p',null,'Turned away at the gate, each with its reason:'));var ol=el('ol');
      rj.forEach(function(r){var li=el('li');li.append(el('strong',null,String(r.what||'')));if(r.why)li.append(el('span',null,String(r.why)));ol.append(li)});body.push(ol)}
    else body.push(el('p',null,'No leads were turned away today.'));
    st.append(stage(i++,'#ff6b95','✕',fmt(rj.length),pl(rj.length,'lead rejected','leads rejected'),body))}
  if(kept!=null)st.append(stage(i++,'#3dffa2','✓',fmt(kept),pl(kept,'story kept','stories kept'),[el('p',null,'These made it through the sieve and into today’s brief.')]));
  [ev&&pair(ev,'build_searches','builds_kept','build','builds','build'),ev&&pair(ev,'photo_searches','photos_kept','photo','photos','photo')].forEach(function(p,k){
    if(p)st.append(stage(i++,k?'#ff9dd8':'#16b8f0',k?'▣':'▲',p.num,p.label,[p.line?el('p',null,p.line):null]))});
  var mix=el('p',null,list.length?'Checking the sources…':'No linked sources today.'),bar=el('div','sv-bar'),groups=el('div','sv-groups');bar.setAttribute('aria-hidden','true');
  st.append(stage(i++,'#3de6ff','◆',fmt(list.length),pl(list.length,'source behind today’s brief','sources behind today’s brief'),[mix,bar,groups]));
  if(note)st.append(stage(i++,'#ffe600','i',null,'A note from this morning’s run',[el('p',null,note)]));
  var key=el('div','sv-key'),dl=el('dl');TIERS.forEach(function(t){var d=el('div');d.style.setProperty('--c',T[t].col);d.append(el('dt',null,T[t].name),el('dd',null,T[t].def));dl.append(d)});
  key.append(el('span','sv-kick','What the tiers mean'),dl,el('p','sv-meta',META));
  var less=el('button','sv-less','Show less ▴');less.type='button';
  box.append(st,key,less);inner.append(box);xp.append(inner);root.append(btn,xp);

  function setOpen(o){root.classList.toggle('open',o);btn.setAttribute('aria-expanded',String(o));inner.inert=!o;cue.firstChild.nodeValue=o?'Hide the proof':'See the proof';
    btn.setAttribute('aria-label','How this brief was made: '+said.join(', ')+(o?'. Hide the full proof':'. Show the full proof'))}
  btn.addEventListener('click',function(){setOpen(!root.classList.contains('open'))});
  less.addEventListener('click',function(){setOpen(false);btn.focus()});
  setOpen(false);

  /* sources by tier, once the register loads */
  function tiersOf(reg){var by={original:[],secondary:[],lead:[],unlisted:[]};list.forEach(function(s){var t=reg?Evidence.tierOf(reg,s.url):'unlisted';(by[t]||by.unlisted).push(s)});return by}
  function names(by,rated){groups.textContent='';bar.textContent='';
    TIERS.forEach(function(t){by[t].forEach(function(){var x=el('i');x.style.setProperty('--c',T[t].col);bar.append(x)});if(!by[t].length)return;
      var g=el('div','sv-grp');g.style.setProperty('--c',rated?T[t].col:'#c3bddc');g.append(el('h4',null,rated?by[t].length+' · '+T[t].name:'Not rated today'));
      var ul=el('ul');by[t].forEach(function(s){ul.append(el('li',null,String(s.name||(window.Evidence?Evidence.host(s.url):s.url)||'')))});g.append(ul);groups.append(g)})}
  if(list.length&&window.fetch)fetch('sources.json').then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(reg){
    var by=tiersOf(reg),parts=[];if(by.original.length)parts.push(by.original.length+' original reporting');if(by.secondary.length)parts.push(by.secondary.length+' good secondary');
    if(by.lead.length)parts.push(by.lead.length+' lead only');if(by.unlisted.length)parts.push(by.unlisted.length+' not yet rated');
    mix.textContent=parts.join(', ')+'.';names(by,true)},
  function(){mix.textContent='The register could not be loaded, so they are not rated.';names(tiersOf(null),false)});

  if(cv)root._start=function(){sieve(root,cv,searches||0,rj.length,kept||0)};
}

/* ---- the drawing ---- */
function fitCanvas(cv){var r=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return null;
  cv.width=Math.round(w*r);cv.height=Math.round(h*r);var x=cv.getContext('2d');x.setTransform(r,0,0,r,0,0);return{x:x,w:w,h:h}}
/* where dots of each kind fall in one cycle: rejected and kept spread evenly through the searches, in proportion */
function kinds(searches,rejected,kept){var n=Math.max(1,Math.min(40,searches||Math.max(rejected+kept,1)));
  var base=Math.max(searches,rejected+kept,1),nr=rejected?Math.max(1,Math.round(rejected*n/base)):0,nk=kept?Math.max(1,Math.round(kept*n/base)):0;
  nk=Math.min(nk,8);nr=Math.min(nr,n-nk);var K=[];for(var j=0;j<n;j++)K.push('p');
  function put(c,m,off){for(var q=0;q<m;q++){var at=Math.floor((q+off)*n/m)%n;while(K[at]!=='p')at=(at+1)%n;K[at]=c}}
  put('r',nr,.2);put('k',nk,.6);return K}
function sieve(root,cv,searches,rejected,kept){
  var K=kinds(searches,rejected,kept),N=K.length,CYC=7,GAP=Math.min(.13,3.9/N),slots=K.filter(function(k){return k==='k'}).length;
  var g=null,P=[],R=[],t0=0,n=0,bin=0,flash=0,fcol='#3de6ff',raf=0,last=0,seen=false;
  function gx(w){return w*.6}
  function slot(s){return{x:g.w-10-(s%4)*9,y:g.h/2-7+Math.floor(s/4)*14}}
  function spawn(){var k=K[n%N];n++;P.push({x:-4,y:5+Math.random()*(g.h-10),vx:95+Math.random()*35,vy:0,k:k,s:'in',a:1,h:[]})}
  function reset(){P=[];R=[];t0=0;n=0;bin=0}
  function step(dt){t0+=dt;var cyc=t0%CYC,want=Math.floor(t0/CYC)*N+Math.min(N,Math.floor(cyc/GAP)+1);while(n<want)spawn();
    if(cyc>=6.3&&bin){P.forEach(function(p){if(p.s==='rest')p.s='go'});bin=0}
    var G=gx(g.w),mid=g.h/2;flash=Math.max(0,flash-dt*3);
    P.forEach(function(p){p.h.push(p.x,p.y);if(p.h.length>16)p.h.splice(0,2);
      if(p.s==='in'){p.x+=p.vx*dt;p.y+=(mid-p.y)*dt*.9*(p.x/G);
        if(p.x>=G-3){if(p.k==='p')p.s='fade';else if(p.k==='r'){p.s='bounce';p.vx=-(40+Math.random()*40);p.vy=-50+Math.random()*100;flash=1;fcol='#ff6b95';R.push({x:G,y:p.y,r:2,a:1})}
          else{p.s='thru';p.slot=bin++;flash=1;fcol='#3dffa2'}}}
      else if(p.s==='fade'){p.x+=p.vx*dt*.25;p.a-=dt*2.4}
      else if(p.s==='bounce'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=140*dt;if(p.y>g.h-3){p.y=g.h-3;p.vy*=-.5}if(p.y<3){p.y=3;p.vy*=-.5}p.a-=dt*.7}
      else if(p.s==='thru'||p.s==='rest'){var t=slot(p.slot);p.x+=(t.x-p.x)*Math.min(1,dt*4);p.y+=(t.y-p.y)*Math.min(1,dt*4);if(Math.abs(t.x-p.x)<.5)p.s='rest'}
      else if(p.s==='go')p.a-=dt*2.5});
    R.forEach(function(r){r.r+=dt*40;r.a-=dt*2});R=R.filter(function(r){return r.a>0});
    P=P.filter(function(p){return p.a>0&&p.x<g.w+8&&p.x>-10})}
  function rgb(p){return p.s==='in'||p.s==='fade'?'201,184,255':p.k==='r'?'255,107,149':'61,255,162'}
  function draw(){var x=g.x,G=gx(g.w);x.clearRect(0,0,g.w,g.h);
    x.strokeStyle='rgba(201,184,255,.18)';x.lineWidth=1;x.beginPath();x.moveTo(0,1);x.lineTo(G,6);x.moveTo(0,g.h-1);x.lineTo(G,g.h-6);x.stroke();
    x.save();x.shadowColor=flash?fcol:'#3de6ff';x.shadowBlur=8+flash*14;x.strokeStyle=flash?fcol:'#3de6ff';x.lineWidth=2;x.setLineDash([3,3]);x.beginPath();x.moveTo(G,4);x.lineTo(G,g.h-4);x.stroke();x.restore();
    x.strokeStyle='rgba(61,255,162,.4)';x.lineWidth=1;for(var s=0;s<slots;s++){var q=slot(s);x.beginPath();x.arc(q.x,q.y,4,0,7);x.stroke()}
    R.forEach(function(r){x.strokeStyle='rgba(255,107,149,'+Math.max(0,r.a)+')';x.lineWidth=1.5;x.beginPath();x.arc(r.x,r.y,r.r,0,7);x.stroke()});
    P.forEach(function(p){if(p.h&&p.h.length>3&&p.s!=='rest'){var c=rgb(p);x.lineWidth=p.k==='p'?1.2:2;x.lineCap='round';
      for(var j=2;j<p.h.length;j+=2){x.strokeStyle='rgba('+c+','+(Math.max(0,p.a)*j/p.h.length*.55)+')';x.beginPath();x.moveTo(p.h[j-2],p.h[j-1]);x.lineTo(p.h[j],p.h[j+1]);x.stroke()}}});
    P.forEach(function(p){var c=rgb(p);x.save();x.globalAlpha=Math.max(0,p.a)*(p.s==='in'||p.s==='fade'?.75:1);x.fillStyle='rgb('+c+')';
      if(p.k!=='p'&&p.s!=='in'){x.shadowColor='rgb('+c+')';x.shadowBlur=8}x.beginPath();x.arc(p.x,p.y,p.k==='p'||p.s==='in'?2:2.8,0,7);x.fill();x.restore()})}
  /* the still picture: a stream of searches, the rejected ones stacked at the gate, the kept ones in the bin */
  function still(){if(!g)return;P=[];R=[];var G=gx(g.w),nr=K.filter(function(k){return k==='r'}).length;
    for(var j=0;j<12;j++)P.push({x:8+j*(G-24)/12,y:g.h/2+Math.sin(j*1.7)*(g.h/2-8)*(1-j/14),k:'p',s:'in',a:1});
    for(j=0;j<nr;j++)P.push({x:G-14-(j%4)*10,y:6+j*(g.h-12)/Math.max(1,nr-1),k:'r',s:'bounce',a:1});
    for(var s=0;s<slots;s++){var q=slot(s);P.push({x:q.x,y:q.y,k:'k',s:'rest',a:1})}flash=0;draw()}
  function frame(t){var dt=Math.min(.05,(t-(last||t))/1000);last=t;step(dt);draw();raf=requestAnimationFrame(frame)}
  /* each run starts from an empty sieve, so the dots of the still picture never move */
  function sync(){var go=seen&&!document.hidden&&!reduce()&&!!g,was=!!raf;cancelAnimationFrame(raf);raf=0;last=0;
    root.classList.toggle('live',go);root.dataset.sieve=go?'running':'still';if(go){if(!was)reset();raf=requestAnimationFrame(frame)}else still()}
  /* the card is drawn before it is on the page, so the canvas is measured once it has a size */
  function fit(){var ng=fitCanvas(cv);if(!ng)return false;g=ng;reset();return true}
  root.dataset.sieve='still';fit();if(g)still();
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){es.forEach(function(e){seen=e.isIntersecting});sync()},{threshold:0}).observe(cv);else{seen=true;sync()}
  document.addEventListener('visibilitychange',sync);onReduceChange(sync);
  if('ResizeObserver' in window)new ResizeObserver(function(){if(!fit())return;if(raf)return;sync()}).observe(cv);
  else requestAnimationFrame(function(){if(!g&&fit())sync()});
}

window.Sieve={mount:mount,kinds:kinds};
})();
