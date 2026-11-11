/* Just launched audit (plan 15, Part E), loaded only by tests/test_launched.py into its frame page. Never shipped.
   Runs in the PARENT page and drives a 390 by 844 frame of a test copy of index.html (which records errors), one edition at a time (?dates=A,B,C).
   The tour is marked seen first so it stays out of the way, except for one replay that counts its stops.
   Reports JSON in <pre id="audit">, then asks the test server for /done so Chrome dumps the page. */
(function(){
const dates=(new URLSearchParams(location.search).get('dates')||'').split(',');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms){const t0=Date.now();while(!f()){if(Date.now()-t0>ms)return false;await sleep(25)}return true}
const send=R=>{const p=document.createElement('pre');p.id='audit';p.textContent=JSON.stringify(R);document.body.append(p);setTimeout(()=>fetch('done'),100)};
const FOLLOWS=(a,b)=>!!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));
const f=document.createElement('iframe');f.width=390;f.height=844;f.style.border=0;document.body.style.margin=0;document.body.append(f);
async function one(date){localStorage.clear();localStorage.setItem('mb-tour-v1','1');
  f.src='about:blank';await sleep(50);f.src='launched-test.html?d='+date;await new Promise(r=>f.onload=r);const W=f.contentWindow,D=f.contentDocument;
  await until(()=>D.querySelector('.gcard.quiz'),8000);await sleep(1200);
  const R={date},sec=D.getElementById('launched');R.section=!!sec;R.jlNodes=D.querySelectorAll('[class^="jl"],[class*=" jl"]').length;
  R.scrollW=D.documentElement.scrollWidth;
  R.outside=W.performance.getEntriesByType('resource').map(e=>e.name).filter(u=>!u.startsWith(W.location.origin)&&!u.startsWith('data:'));
  const quiz=D.querySelector('.gcard.quiz'),app=D.getElementById('app');
  if(quiz){const m=quiz.parentElement,k=[...m.children],a=[...app.children];R.afterQuiz=k.slice(k.indexOf(quiz)+1).map(e=>e.className);R.afterQuizMain=a.slice(a.indexOf(m)+1).map(e=>e.tagName.toLowerCase())}
  if(sec){const today=D.getElementById('deck-news'),builds=D.getElementById('builds');
    R.order={afterToday:FOLLOWS(today,sec),nextToToday:today.nextElementSibling===sec,beforeBuilds:builds?FOLLOWS(sec,builds):null,beforeQuiz:FOLLOWS(sec,quiz)};
    R.heading=sec.querySelector('h2').textContent;R.note=sec.querySelector('.jl-note').textContent;R.tourHook=sec.closest('[data-tour]')?sec.closest('[data-tour]').dataset.tour:null;
    R.rows=[...sec.querySelectorAll('.jl-row')].map(li=>{const a=li.querySelector('a');return{tag:(li.querySelector('.pill')||{}).textContent||null,company:li.querySelector('.jl-co').textContent,
      companyBold:li.querySelector('.jl-co').tagName==='B',what:li.querySelector('.jl-what').textContent,claim:li.querySelector('.jl-claim').textContent,src:(li.querySelector('.jl-src')||{}).textContent||null,
      href:a?a.getAttribute('href'):null,target:a?a.target:null,rel:a?a.rel:null,linkH:a?Math.round(a.getBoundingClientRect().height):null,
      order:[...li.querySelectorAll('.pill,.jl-co,.jl-what,.jl-claim,.jl-src')].map(e=>e.className.split(' ')[0])}});
    R.scripts=sec.querySelectorAll('script,img,iframe').length;R.text=sec.innerText;
    const S=sec.getBoundingClientRect();R.clipped=[...sec.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width)return false;
      return r.left<S.left-.5||r.right>S.right+.5||r.right>390.5||e.scrollWidth>e.clientWidth+1}).map(e=>e.className||e.tagName);
    /* the tour does not ring or count the strip */
    W.MBTour.start();await sleep(200);R.tourCount=(D.querySelector('.tr-count')||{}).textContent;const sk=D.querySelector('.tr-skip');if(sk)sk.click();await sleep(300)}
  R.errors=(W.__errs||[]).slice();return R}
(async()=>{const out=[];for(const d of dates)out.push(await one(d));send({reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,editions:out})})().catch(e=>send({crash:String(e&&e.stack||e)}));
})();
