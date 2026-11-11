/* First-visit tour audit (plan 17), loaded only by tests/test_tour.py into its frame page. Never shipped.
   This runs in the PARENT page and drives a 390 by 844 frame of a test copy of index.html (same origin, so
   it shares the frame's storage and can read its page). Each scenario loads the frame afresh.
   Query: ?builds=DATE&plain=DATE (an edition with builds and one without). Reports JSON in <pre id="audit">,
   then asks the test server for /done so Chrome dumps the page. */
(function(){
const q=new URLSearchParams(location.search),BUILDS=q.get('builds'),PLAIN=q.get('plain');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms){const t0=Date.now();while(!f()){if(Date.now()-t0>ms)return false;await sleep(25)}return true}
const send=R=>{const p=document.createElement('pre');p.id='audit';p.textContent=JSON.stringify(R);document.body.append(p);setTimeout(()=>fetch('done'),100)};
const box=e=>{const r=e.getBoundingClientRect();return{x:+r.left.toFixed(1),y:+r.top.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}};
const meet=(a,b)=>Math.max(0,Math.min(a.r,b.r)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.y,b.y));
const SEED={days:{'2026-11-01':{score:3,total:4,points:30,at:1}},tags:{AI:[3,4],Tech:[1,2],Cyber:[2,2]},lessons:{},points:30,badges:{first:'2026-11-01'},review:[],prog:{},sound:false,v2:1,bonus:0,pilot:'charlee',name:'tester',read:{'2026-11-01':{news:['s1']}},kimchi:{'2026-11-01':1}};
const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;document.body.style.margin=0;document.body.append(f);
let W,D;
async function load(date,extra){f.src='about:blank';await sleep(50);f.src='tour-test.html?d='+date+(extra||'');
  await new Promise(r=>f.onload=r);W=f.contentWindow;D=f.contentDocument;
  await until(()=>D.querySelector('[data-tour=quiz]'),8000);return !!D.querySelector('[data-tour=quiz]')}
const open=()=>!!(W.MBTour&&W.MBTour.isOpen()&&D.querySelector('.tr'));
const card=()=>D.querySelector('.tr-card');
/* landed: no flight, the card is showing at its dock and its text is visible */
const landed=()=>{const c=card();return c&&c.classList.contains('on')&&!D.querySelector('.tr-body.off')&&!D.querySelector('.tr-trail')&&!c.getAnimations().length&&D.querySelector('.tr-vh').textContent.startsWith('Step '+D.querySelector('.tr-count').textContent.split(' ')[0]+' ')};
function measure(){const c=card(),ring=D.querySelector('.tr-ring'),ringOn=ring.classList.contains('on'),rb=box(ring),cb=box(c),sk=box(D.querySelector('.tr-skip')),bar=box(D.querySelector('.tr-bar'));
  const txt=[...c.querySelectorAll('*')].filter(e=>!e.closest('svg,.kpod,.kscene')&&[...e.childNodes].some(t=>t.nodeType===3&&t.textContent.trim()));
  const clipped=txt.filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).display!=='inline'||r.left<cb.x-.5||r.right>cb.r+.5||r.top<cb.y-.5||r.bottom>cb.b+.5}).map(e=>e.className||e.tagName);
  const hook=c.dataset&&D.querySelector('.tr-h').textContent;
  return{head:hook,count:D.querySelector('.tr-count').textContent,dock:c.dataset.dock,pref:c.dataset.pref,why:c.dataset.why,text:D.querySelector('.tr-body').innerText.replace(/\s+/g,' ').trim(),
    live:D.querySelector('.tr-vh').textContent,label:c.getAttribute('aria-label'),ringOn,ring:ringOn?rb:null,card:cb,skip:sk,bar,
    cardRing:ringOn?meet(cb,rb):0,cardSkip:meet(cb,sk),cardBar:meet(cb,bar),inView:cb.x>=0&&cb.r<=390.5&&cb.y>=0&&cb.b<=844.5,
    scrollable:c.scrollHeight>c.clientHeight+1,clipped,scrollW:D.documentElement.scrollWidth,next:D.querySelector('.tr-next').textContent,
    focusNext:D.activeElement===D.querySelector('.tr-next'),chips:[...c.querySelectorAll('.tr-chips span')].map(s=>s.textContent),
    home:!!c.querySelector('.tr-home'),name:c.querySelector('.tr-name').textContent,
    lit:ringOn?(()=>{const e=D.elementFromPoint((rb.x+rb.r)/2,Math.min(rb.b-8,rb.y+40));const p=e&&e.closest('[data-tour]');return p?p.dataset.tour:null})():null}}
/* go through every stop with Next, measuring each once it has landed; in motion, check a flight happens */
async function walk(R){R.stops=[];R.flights=[];
  for(let i=0;i<9&&open();i++){await until(landed,4000);R.stops.push(measure());
    /* Tab three times from Next: focus must stay on the tour's own buttons */
    if(i===1){const seenF=[];for(let k=0;k<3;k++){D.dispatchEvent(new W.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));seenF.push(D.activeElement.className)}R.tabs=seenF;D.querySelector('.tr-next').focus()}
    const was=card().getBoundingClientRect().top;D.querySelector('.tr-next').click();await sleep(120);
    if(!open())break;
    const anims=[...D.querySelectorAll('.tr-card,.tr-trail')].flatMap(e=>e.getAnimations()).map(a=>{const k=a.effect&&a.effect.getKeyframes?a.effect.getKeyframes():[];return k.some(x=>x.transform&&x.transform!=='none')});
    R.flights.push({transformAnims:anims.filter(Boolean).length,trails:D.querySelectorAll('.tr-trail').length,textOff:!!D.querySelector('.tr-body.off'),fromTop:+was.toFixed(1)})}
  return R}
const quizLast=()=>{const quiz=D.querySelector('.gcard.quiz'),app=D.getElementById('app');if(!quiz)return null;const m=quiz.parentElement,k=[...m.children],a=[...app.children];
  return{after:k.slice(k.indexOf(quiz)+1).map(e=>e.className),afterMain:a.slice(a.indexOf(m)+1).map(e=>e.tagName.toLowerCase())}};
const errs=()=>(W.__errs||[]).slice();
async function run(){const R={reduce:matchMedia('(prefers-reduced-motion: reduce)').matches};
  /* A: first visit on a day with builds, with saved progress and Charlee last at the controls */
  localStorage.clear();localStorage.setItem('mb-v1',JSON.stringify(SEED));
  let A=R.first={loaded:await load(BUILDS)};A.openedAt=await until(open,6000);A.flagBefore=localStorage.getItem('mb-tour-v1');
  A.saved0=localStorage.getItem('mb-v1');A.seedKept=(()=>{try{const s=JSON.parse(A.saved0);return s.points===30&&s.pilot==='charlee'&&JSON.stringify(s.days)===JSON.stringify(SEED.days)}catch(e){return false}})();
  A.dialog=D.querySelector('.tr')&&{role:D.querySelector('.tr').getAttribute('role'),modal:D.querySelector('.tr').getAttribute('aria-modal'),label:D.querySelector('.tr').getAttribute('aria-label'),live:D.querySelector('.tr-vh').getAttribute('aria-live')};
  A.quiz=quizLast();A.tourBtn=!!D.querySelector('.nav [data-tour-btn]');A.navOrder=[...D.querySelectorAll('.nav button')].map(b=>b.textContent);
  await walk(A);await sleep(500);
  A.closed=!open()&&!D.querySelector('.tr');A.flag=localStorage.getItem('mb-tour-v1');A.focus=D.activeElement&&D.activeElement.hasAttribute('data-tour-btn');
  A.saved1=localStorage.getItem('mb-v1');A.same=A.saved0===A.saved1;A.errors=errs();A.quizAfter=quizLast();
  /* B: second visit, flag set: no tour. C: replay with the Tour button, then Escape */
  let B=R.second={loaded:await load(BUILDS)};await sleep(3000);B.open=open();
  const tb=D.querySelector('[data-tour-btn]');tb.focus();tb.click();await sleep(200);B.replay=open();await until(landed,4000);B.replayCount=D.querySelector('.tr-count')&&D.querySelector('.tr-count').textContent;
  D.dispatchEvent(new W.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await sleep(400);
  B.escClosed=!open()&&!D.querySelector('.tr');B.focus=D.activeElement&&D.activeElement.hasAttribute('data-tour-btn');B.flag=localStorage.getItem('mb-tour-v1');B.same=localStorage.getItem('mb-v1')===A.saved1;B.errors=errs();
  /* D: a day with no builds, fresh browser: that stop is skipped and the counter total drops */
  localStorage.clear();let P=R.plain={loaded:await load(PLAIN)};P.openedAt=await until(open,6000);await walk(P);P.flag=localStorage.getItem('mb-tour-v1');P.errors=errs();P.quiz=quizLast();
  /* E: fast double tap on Next from stop 1 lands on stop 3; then Skip sets the flag */
  localStorage.clear();let E=R.skip={loaded:await load(BUILDS)};await until(open,6000);await until(landed,4000);
  const nx=D.querySelector('.tr-next');nx.click();await sleep(40);nx.click();await sleep(30);E.flyingRightAfter=!!D.querySelector('.tr-trail')||card().getAnimations().length>0;
  await until(landed,4000);await sleep(400);E.landedOn=measure();E.stillFlying=!!D.querySelector('.tr-trail')||card().getAnimations().length>0;
  D.querySelector('.tr-skip').click();await sleep(400);E.closed=!open()&&!D.querySelector('.tr');E.flag=localStorage.getItem('mb-tour-v1');E.toast=(D.querySelector('.tr-toast')||{}).textContent;E.errors=errs();
  /* F: storage blocked: the page and the tour still work, nothing throws */
  localStorage.clear();let F=R.blocked={loaded:await load(BUILDS,'&block=1')};F.blockedReally=(()=>{try{W.localStorage.getItem('x');return false}catch(e){return true}})();
  F.open=await until(open,6000);await until(landed,4000);D.querySelector('.tr-next').click();await sleep(900);D.querySelector('.tr-skip').click();await sleep(400);
  F.closed=!open();F.errors=errs();F.quiz=quizLast();
  /* G: the tour waits while a sheet is open on a first visit, then starts once it is closed */
  localStorage.clear();let G=R.sheet={};f.src='tour-test.html?d='+PLAIN;await new Promise(r=>f.onload=r);W=f.contentWindow;D=f.contentDocument;
  await until(()=>D.querySelector('.cd.lcard .go'),8000);D.querySelector('.cd.lcard .go').click();await sleep(2500);G.sheet=!!D.querySelector('.sheet');G.openUnderSheet=open();
  W.history.back();await sleep(2500);G.openAfter=open();G.name=open()&&card().querySelector('.tr-name').textContent;G.errors=errs();
  if(open())W.MBTour&&D.querySelector('.tr-skip').click();
  send(R)}
run().catch(e=>send({crash:String(e&&e.stack||e)}));
})();
