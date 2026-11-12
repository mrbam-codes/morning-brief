/* Sieve card and Move my progress audit (plan 22), loaded only into a test copy of index.html by
   tests/test_sieve_page.py. Never shipped. The phase comes from the page address:
   #sieve (the proof card closed, paused, opened and closed again), #copy (the My scores sheet and Copy code),
   #fresh=<code> (the Paste prompt in an empty browser, then loading a code), #later (Not now),
   #sheetpaste=<code> (Paste code inside the sheet), #shot=closed|open|prompt|sheet (screenshots only). */
(function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const send=R=>{parent.postMessage({audit:JSON.stringify(R)},'*');setTimeout(()=>fetch('done'),100)};
async function until(f,ms){const t0=performance.now();while(!f()){if(performance.now()-t0>ms)return false;await sleep(20)}return true}
const box=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}};
const hit=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
const FOLLOWS=(a,b)=>!!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));
/* every line of text inside root: inside root, on screen sideways, not cut by a clipping box, not on top of other text */
function textIssues(root,skip){const C=root.getBoundingClientRect(),boxes=[],bad=[];
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){if(!n.textContent.trim())continue;const p=n.parentElement;if(skip&&p.closest(skip))continue;if(p.closest('[hidden]')||!p.getClientRects().length)continue;
    const cs=getComputedStyle(p);if(cs.visibility==='hidden'||+cs.opacity<.05)continue;
    const rg=document.createRange();rg.selectNodeContents(n);const t=n.textContent.trim().slice(0,32);
    [...rg.getClientRects()].forEach(r=>{if(r.width<1||r.height<1)return;
      if(r.left<C.left-.5||r.right>C.right+.5||r.top<C.top-.5||r.bottom>C.bottom+.5)bad.push('outside: '+t);
      if(r.left<-.5||r.right>innerWidth+.5)bad.push('off screen sideways: '+t);
      for(let a=p;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);if(s.overflowX==='visible'&&s.overflowY==='visible')continue;
        const A=a.getBoundingClientRect();if(r.left<A.left-.5||r.right>A.right+.5||r.top<A.top-.5||r.bottom>A.bottom+.5){bad.push('cut by '+(a.className||a.tagName)+': '+t);break}}
      boxes.push({r,t,n})})}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(boxes[i].n!==boxes[j].n&&hit(boxes[i].r,boxes[j].r))bad.push('overlap: '+boxes[i].t+' / '+boxes[j].t);
  return [...new Set(bad)].slice(0,12)}
const small=root=>[...root.querySelectorAll('button,a,textarea')].filter(e=>e.offsetParent&&!e.closest('[hidden]')).map(e=>({t:(e.textContent.trim()||e.getAttribute('aria-label')||e.tagName).slice(0,24),w:e.offsetWidth,h:e.offsetHeight})).filter(x=>x.w<44||x.h<44);
const painted=cv=>{try{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let k=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)k++;return k}catch(e){return -1}};
const endless=()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations===Infinity).map(a=>a.animationName||'anim').slice(0,10);
function settle(root){document.getAnimations().forEach(a=>{const t=a.effect&&a.effect.target;if(t&&root.contains(t)&&a.effect.getTiming().iterations!==Infinity)try{a.finish()}catch(e){}})}
const errs=()=>(window.__svErrs||[]).slice(0,10);

async function sieve(){const R={};const card=document.querySelector('.sieve');R.found=!!card;if(!card)return R;
  const btn=card.querySelector('.sv-card'),xp=card.querySelector('.sv-xp'),cv=card.querySelector('.sv-cv');
  R.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  R.isButton=btn.tagName==='BUTTON'&&btn.type==='button';R.controls=btn.getAttribute('aria-controls')===xp.id&&!!xp.id;R.label=btn.getAttribute('aria-label');
  R.closed={expanded:btn.getAttribute('aria-expanded'),inert:xp.firstElementChild.inert};
  /* the order: after everything there is to read, just above the quiz */
  const quiz=document.querySelector('.gcard.quiz');R.beforeQuiz=FOLLOWS(card,quiz);R.oldPanel=document.querySelectorAll('.gcard.evidence').length;R.oldMove=document.querySelectorAll('.gcard.move').length;
  card.scrollIntoView({block:'center'});await sleep(900);
  R.closed.h=box(card).h;R.closed.issues=textIssues(card,'.sv-xp');
  R.tiles=[...card.querySelectorAll('.sv-nums>span')].map(s=>[s.querySelector('b').textContent,s.querySelector('em').textContent]);
  R.old=(card.querySelector('.sv-old')||{}).textContent||null;
  R.canvas=!!cv;if(cv)R.painted=painted(cv);
  R.onScreen=card.dataset.sieve||null;
  if(cv){scrollTo(0,0);await sleep(900);R.offScreen=card.dataset.sieve;
    card.scrollIntoView({block:'center'});await sleep(900);R.backOn=card.dataset.sieve;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await sleep(200);R.pageHidden=card.dataset.sieve;
    delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));await sleep(300);R.pageShown=card.dataset.sieve;
    R.liveClass=card.classList.contains('live')}
  R.endlessClosed=endless();
  btn.click();await sleep(R.reduce?300:2600);settle(card);await sleep(100);
  R.open={expanded:btn.getAttribute('aria-expanded'),inert:xp.firstElementChild.inert,h:box(card).h,label:btn.getAttribute('aria-label')};
  R.open.text=xp.innerText;R.open.cardText=card.innerText;R.open.issues=textIssues(card);R.open.small=small(card);
  R.open.stages=[...card.querySelectorAll('.sv-st h3')].map(h=>h.textContent);
  R.open.groups=[...card.querySelectorAll('.sv-grp h4')].map(h=>h.textContent);
  R.scrollWidth=document.documentElement.scrollWidth;R.width=innerWidth;
  R.wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!e.closest('.deck,.rail,.bw-carts')}).slice(0,8).map(e=>e.tagName+'.'+e.className);
  const less=card.querySelector('.sv-less');less.click();await sleep(R.reduce?200:900);
  R.after={expanded:btn.getAttribute('aria-expanded'),inert:xp.firstElementChild.inert,focusBack:document.activeElement===btn};
  R.endless=endless();R.errs=errs();return R}

const sheet=()=>document.querySelector('.cc-over .cc-sheet');
async function openSheet(){document.querySelector('.cc-badge').click();await until(sheet,3000);await sleep(400);return sheet()}
async function copy(){const R={};R.prompt=!!document.querySelector('.mv-got');const sh=await openSheet();R.sheet=!!sh;if(!sh)return R;
  const mv=sh.querySelector('.cc-move');R.move=!!mv;if(!mv)return R;
  mv.scrollIntoView({block:'end'});await sleep(300);
  R.buttons=[...mv.querySelectorAll('.mv-row button')].map(b=>b.textContent);R.heading=(mv.querySelector('h4')||{}).textContent;
  R.issues=textIssues(mv);R.small=small(mv);R.scrollWidth=document.documentElement.scrollWidth;
  const [cp]=mv.querySelectorAll('.mv-row button');cp.click();await until(()=>mv.querySelector('.mv-code').value,4000);await sleep(300);
  R.code=mv.querySelector('.mv-code').value;R.boxShown=!mv.querySelector('.mv-code').hidden;R.status=mv.querySelector('.mv-status').textContent;
  R.points=JSON.parse(localStorage.getItem('mb-v1')).points;R.issuesAfter=textIssues(mv);R.errs=errs();return R}
async function useCode(scope,code){const inp=scope.querySelector('.mv-in'),use=scope.querySelector('.mv-paste button');inp.value=code;use.click();
  await until(()=>!scope.querySelector('.mv-ask').hidden||scope.querySelector('.mv-status').textContent,4000);await sleep(200);
  const ask=scope.querySelector('.mv-ask');return{asked:!ask.hidden,ask:ask.innerText,status:scope.querySelector('.mv-status').textContent}}
async function fresh(code){const R={};const g=document.querySelector('.mv-got');R.prompt=!!g;R.stored=localStorage.getItem('mb-v1');R.storedDays=Object.keys((JSON.parse(R.stored||'null')||{}).days||{}).length;if(!g)return R;
  const hero=document.querySelector('header.hero'),deck=document.getElementById('deck-news'),badge=document.querySelector('.cc-badge');
  R.afterHero=FOLLOWS(hero,g);R.beforeToday=FOLLOWS(g,deck);R.text=g.innerText;R.buttons=[...g.querySelectorAll('.mv-row button')].map(b=>b.textContent);
  scrollTo(0,0);await sleep(200);R.clearAtTop=!hit(g.getBoundingClientRect(),badge.getBoundingClientRect());R.box=box(g);R.badge=box(badge);
  g.scrollIntoView({block:'start'});await sleep(400);R.clearScrolledTo=!hit(g.getBoundingClientRect(),badge.getBoundingClientRect());R.boxScrolled=box(g);
  R.issues=textIssues(g);R.small=small(g);
  const [ps]=g.querySelectorAll('.mv-row button');ps.click();await sleep(400);const inp=g.querySelector('.mv-in');
  R.pasteShown=!g.querySelector('.mv-paste').hidden;R.focused=document.activeElement===inp;R.clearWhileTyping=!hit(inp.getBoundingClientRect(),badge.getBoundingClientRect());
  R.issuesPaste=textIssues(g);R.smallPaste=small(g);
  const bad=await useCode(g,'rubbish');R.bad=bad;R.unchangedAfterBad=localStorage.getItem('mb-v1')===R.stored;
  const a=await useCode(g,code);R.asked=a.asked;R.ask=a.ask;R.issuesAsk=textIssues(g);
  const [yes]=g.querySelectorAll('.mv-ask button');if(!yes)return R;yes.click();await sleep(500);
  const s=JSON.parse(localStorage.getItem('mb-v1')||'null')||{};R.after={days:Object.keys(s.days||{}).length,points:s.points};
  R.status=g.querySelector('.mv-status').textContent;R.rowHidden=g.querySelector('.mv-row').hidden;R.badgeAfter=badge.getAttribute('aria-label');
  const sh=await openSheet();R.sheetButtons=sh?[...sh.querySelectorAll('.cc-move .mv-row button')].map(b=>b.textContent):[];R.errs=errs();return R}
async function later(){const R={};const g=document.querySelector('.mv-got');R.prompt=!!g;if(!g)return R;
  const no=[...g.querySelectorAll('.mv-row button')].find(b=>b.textContent==='Not now');R.hasNotNow=!!no;if(no)no.click();await sleep(200);
  R.goneAfter=!document.querySelector('.mv-got');R.errs=errs();return R}
async function sheetpaste(code){const R={};R.prompt=!!document.querySelector('.mv-got');const sh=await openSheet();if(!sh)return R;
  const mv=sh.querySelector('.cc-move'),[,ps]=mv.querySelectorAll('.mv-row button');ps.click();await sleep(200);R.pasteShown=!mv.querySelector('.mv-paste').hidden;
  const a=await useCode(mv,code);R.asked=a.asked;R.ask=a.ask;const [yes]=mv.querySelectorAll('.mv-ask button');if(!yes)return R;
  yes.click();await sleep(400);await until(()=>{const s=sheet();return s&&s.querySelector('.mv-status').textContent},3000);
  const s2=sheet();R.reopened=!!s2&&s2!==sh;R.status=s2?s2.querySelector('.mv-status').textContent:'';R.total=s2?s2.querySelector('.cc-hero .tot').textContent:'';
  const st=JSON.parse(localStorage.getItem('mb-v1')||'null')||{};R.points=st.points;R.days=Object.keys(st.days||{}).length;R.errs=errs();return R}
async function shot(kind){const card=document.querySelector('.sieve');
  if(kind==='closed'){card.scrollIntoView({block:'center'});await sleep(1500)}
  else if(kind==='open'){card.querySelector('.sv-card').click();await sleep(2600);settle(card);card.scrollIntoView({block:'start'});await sleep(400)}
  else if(kind==='prompt'){const g=document.querySelector('.mv-got');if(g){g.scrollIntoView({block:'start'});await sleep(500)}}
  else if(kind==='sheet'){const sh=await openSheet();if(sh){sh.querySelector('.cc-move').scrollIntoView({block:'end'});await sleep(400)}}
  fetch('done')}

async function run(){await until(()=>document.querySelector('.gcard.quiz'),8000);await sleep(1200);const h=decodeURIComponent(location.hash.slice(1)),R={phase:h.split('=')[0]};
  if(h.startsWith('shot=')){await shot(h.slice(5));return}
  if(h==='sieve')Object.assign(R,await sieve());
  else if(h==='copy')Object.assign(R,await copy());
  else if(h.startsWith('fresh='))Object.assign(R,await fresh(h.slice(6)));
  else if(h==='later')Object.assign(R,await later());
  else if(h.startsWith('sheetpaste='))Object.assign(R,await sheetpaste(h.slice(11)));
  send(R)}
run().catch(e=>send({crash:String(e&&e.stack||e)}));
})();
