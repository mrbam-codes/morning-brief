/* Warp Run page audit (plan 23), loaded only into a test copy of index.html by tests/test_warp_page.py.
   Never shipped. The phase comes from the page address:
   #play=<r and w per question>&kb=1&prac=1&shot=1 answers the quiz (kb: by keyboard keys, focus checked),
   checks the gauge after every answer, the ending, and (prac) the practice refuel; shot stops on the ending
   for a screenshot. #reopen checks a finished quiz shown again; #review checks the Review button still
   plays its sheet; #noquiz checks an edition with no quiz keeps the old card. */
(function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const send=R=>{R.ms=Math.round(performance.now());parent.postMessage({audit:JSON.stringify(R)},'*');let id='';try{id=new URLSearchParams(parent.location.search).get('id')||''}catch(e){}setTimeout(()=>fetch('done?id='+id),100)};
async function until(f,ms){const t0=performance.now();let v;while(!(v=f())){if(performance.now()-t0>ms)return null;await sleep(20)}return v}
const hit=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
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
const tiny=(root,skip)=>{const out=[],w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(!n.textContent.trim())continue;const p=n.parentElement;if(skip&&p.closest(skip))continue;if(!p.getClientRects().length)continue;const fs=parseFloat(getComputedStyle(p).fontSize);if(fs<12)out.push(n.textContent.trim().slice(0,20)+' '+fs+'px')}return out.slice(0,8)};
const small=root=>[...root.querySelectorAll('button')].filter(e=>e.offsetParent).map(e=>({t:e.textContent.trim().slice(0,24),w:e.offsetWidth,h:e.offsetHeight})).filter(x=>x.w<44||x.h<44);
const endless=root=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.target&&root.contains(a.effect.target)&&a.effect.getTiming().iterations===Infinity).map(a=>a.animationName||'anim').slice(0,10);
function settle(root){document.getAnimations().forEach(a=>{const t=a.effect&&a.effect.target;if(t&&root.contains(t)&&a.effect.getTiming().iterations!==Infinity)try{a.finish()}catch(e){}})}
/* screenshots: put the quiz at the top, wait for any smooth scroll to finish, and put it there again */
async function steady(root,rm){root.scrollIntoView({block:'start',behavior:'instant'});await sleep(rm?150:900);root.scrollIntoView({block:'start',behavior:'instant'});await sleep(300)}
const rb=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom)}};
/* the badge counts only while it can be seen */
const badgeShown=()=>{const b=document.querySelector('.cc-badge');if(!b)return null;const cs=getComputedStyle(b);return cs.visibility!=='hidden'&&+cs.opacity>.05&&cs.display!=='none'?b:null};
const overBadge=e=>{const b=badgeShown();return !!(b&&e&&hit(b.getBoundingClientRect(),e.getBoundingClientRect()))};
const errs=()=>(window.__wpErrs||[]).slice(0,10);
const store=()=>localStorage.getItem('mb-v1');
const badgeR=()=>{const b=badgeShown();return b?b.getBoundingClientRect():null};
const clear=e=>{const b=badgeR();return !!e&&(!b||!hit(e.getBoundingClientRect(),b))};
const key=k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
const gauge=root=>{const c=root.querySelector('.cells');return{cells:+c.dataset.cells,on:root.querySelectorAll('.cell.on').length,n:root.querySelectorAll('.cell').length,fnum:root.querySelector('.f-top b').textContent,aria:c.getAttribute('aria-label')}};
const homeAt=root=>{const cs=[...root.querySelectorAll('.cell')],hm=root.querySelector('.hm').getBoundingClientRect(),H=+root.dataset.home,a=cs[H-1].getBoundingClientRect(),b=cs[H]?cs[H].getBoundingClientRect():null,x=hm.left+hm.width/2;return{home:H,between:x>a.right-1&&(!b||x<b.left+1)}};

async function answer(root,k,kb,R){const opts=await until(()=>{const o=root.querySelectorAll('.w-opt');return o.length&&!o[0].disabled?o:null},8000);if(!opts)throw new Error('no question');
  if(kb){R.kbFocusable=R.kbFocusable!==false&&[...opts].every(o=>o.tagName==='BUTTON'&&o.tabIndex>=0);key('abcd'[k])}else opts[k].click();
  return until(()=>root.querySelector('[data-act=next]'),5000)}

async function play(o){const R={phase:'play',pattern:o.play,kb:!!o.kb,steps:[]},host=document.querySelector('.gcard.quiz'),root=host&&host.querySelector('.wr');R.found=!!root&&host.className==='gcard quiz';if(!R.found)return R;
  R.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;R.width=innerWidth;
  root.scrollIntoView({block:'start'});await sleep(700);
  R.start={pilot:root.querySelector('.w-pil').textContent,cat:(root.querySelector('.ship .kpod')||{childElementCount:0}).childElementCount,catW:Math.round((root.querySelector('.ship .kpod')||{offsetWidth:0}).offsetWidth),issues:textIssues(root,'.w-sr'),tiny:tiny(root,'.w-sr'),small:small(root),text:root.querySelector('.w-body').innerText,gauge:gauge(root),homeAt:homeAt(root),cellsN:+root.dataset.cells,last:host.parentElement.lastElementChild===host||[...host.parentElement.children].slice([...host.parentElement.children].indexOf(host)+1).every(e=>e.classList.contains('gcard')&&!e.classList.contains('quiz'))};
  if(!R.reduce){R.liveOn=root.classList.contains('live');scrollTo(0,0);await sleep(400);R.liveOff=root.classList.contains('live');root.scrollIntoView({block:'start'});await sleep(400);R.liveBack=root.classList.contains('live');
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await sleep(200);R.liveHidden=root.classList.contains('live');
    delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));await sleep(200);R.liveShown=root.classList.contains('live')}
  /* a notched phone: the badge sits 47px lower */
  if(o.inset){const st=document.createElement('style');st.textContent='.cc-badge{top:59px!important}';document.head.append(st);await sleep(100)}
  R.start.launch=rb(root.querySelector('[data-act=start]'));R.start.vh=innerHeight;
  if(o.introshot){await sleep(300);return R}
  root.querySelector('[data-act=start]').click();
  const pat=o.play.split(''),N=pat.length;let right=0;const before=store();
  for(let i=0;i<N;i++){const opts=await until(()=>{const x=root.querySelectorAll('.w-opt');return x.length&&!x[0].disabled?x:null},8000);if(!opts)throw new Error('no question '+i);
    if(o.qshot!=null&&+o.qshot===i){await sleep(R.reduce?100:1200);return R}
    await sleep(R.reduce?80:900);const vis=[...opts].filter(x=>!x.hidden),qb=rb(vis[vis.length-1]),stageOver=overBadge(root.querySelector('.w-stage'))||overBadge(root.querySelector('.fuel')),stageH=Math.round(root.querySelector('.w-stage').getBoundingClientRect().height);
    const ans=+opts[0].closest('.w-body').dataset.answer;/* the test copy marks the answer */const ok=pat[i]==='r',k=ok?ans:(ans+1)%4;if(ok)right++;
    const nx=await answer(root,k,o.kb,R);if(!nx)throw new Error('no next '+i);
    await until(()=>+root.querySelector('.cells').dataset.cells===right,3000);await sleep(R.reduce?50:350);settle(root);
    const g=gauge(root),st={i,ok,want:right,g,focusNext:document.activeElement===nx,live:root.querySelector('.w-sr').textContent,gaugeClear:clear(root.querySelector('.fuel')),issues:textIssues(root,'.w-sr,.w-ov'),tiny:tiny(root,'.w-sr')};
    st.saved=JSON.parse(store()).prog[root.dataset.key]||null;st.lastOpt=qb;st.stageOver=stageOver;st.stageH=stageH;await sleep(R.reduce?50:500);st.next=rb(nx);st.shownOpts=[...root.querySelectorAll('.w-opt')].filter(x=>!x.hidden&&x.offsetParent).length;st.afterOver=overBadge(root.querySelector('.fuel'));R.steps.push(st);
    if(o.ashot!=null&&+o.ashot===i){await sleep(R.reduce?100:700);return R}
    if(o.kb&&document.activeElement===nx)nx.click();else nx.click()}
  const fin=await until(()=>root.querySelector('.w-fin h2'),6000);if(!fin)throw new Error('no ending');
  await sleep(R.reduce?200:2600);settle(root);
  const S=JSON.parse(store()),key=root.dataset.key;
  R.end={ending:root.dataset.ending,score:root.dataset.score,points:root.dataset.points,head:fin.textContent,kick:root.querySelector('.w-fin .kick').textContent,
    big:root.querySelector('.w-score b').textContent,pts:root.querySelector('.w-score span').textContent,math:(root.querySelector('.w-math')||{}).textContent,lines:root.querySelector('.w-fin .lines').textContent,
    gauge:gauge(root),status:root.querySelector('.f-status').textContent,issues:textIssues(root,'.w-sr,.w-ov'),tiny:tiny(root,'.w-sr'),small:small(root),
    headClear:clear(fin),gaugeClear:clear(root.querySelector('.fuel')),focusHead:document.activeElement===fin,live:root.querySelector('.w-sr').textContent,
    saved:S.days[key],progGone:!(key in S.prog),badge:document.querySelector('.cc-badge').getAttribute('aria-label'),buttons:[...root.querySelectorAll('.w-fin button')].map(b=>b.textContent),
    drawn:root.dataset.drawn||null,endless:R.reduce?endless(root):null,scrollWidth:document.documentElement.scrollWidth};
  R.end.prac=rb(root.querySelector('[data-act=practise]'));R.end.overScene=overBadge(root.querySelector('.w-stage'))||overBadge(root.querySelector('.fuel'))||overBadge(fin);R.end.math2=rb(root.querySelector('.w-math'));R.end.stageH=Math.round(root.querySelector('.w-stage').getBoundingClientRect().height);
  R.end.pointsInBadge=new RegExp(Number(S.points).toLocaleString('en-GB')+' points').test(R.end.badge);
  if(o.shot){await steady(root,R.reduce);return R}
  if(o.prac){const after=store(),log=[];
    for(let guard=0;guard<6;guard++){const pb=root.querySelector('[data-act=practise]');if(!pb)break;pb.click();log.push('start '+(+root.querySelector('.cells').dataset.cells));
      for(let g=0;g<10;g++){const x=await until(()=>{const y=root.querySelectorAll('.w-opt');return y.length&&!y[0].disabled?y:null},5000);if(!x)break;
        const ans=+root.querySelector('.w-body').dataset.answer,pr=o.prac==='mix'&&guard===0&&g<2?(ans+1)%4:ans,c0=+root.querySelector('.cells').dataset.cells;
        const nx=await answer(root,pr,o.kb,R);await until(()=>+root.querySelector('.cells').dataset.cells===c0+(pr===ans?1:0),3000);log.push((pr===ans?'r':'w')+(+root.querySelector('.cells').dataset.cells)+'/'+(root.querySelector('.kick').textContent.includes('no points')?'np':'PTS'));
        nx.click();await sleep(60);if(root.querySelector('.w-fin'))break}
      await sleep(R.reduce?100:400);log.push('end '+root.dataset.ending+' '+(root.querySelector('.w-fin h2,.coda b')||{}).textContent)}
    await sleep(R.reduce?200:1800);settle(root);
    const coda=root.querySelector('.coda');R.prac={log,drawn:root.dataset.drawn||null,coda:coda?coda.textContent:null,ending:root.dataset.ending,same:store()===after,gauge:gauge(root),issues:textIssues(root,'.w-sr,.w-ov'),tiny:tiny(root,'.w-sr'),badge:document.querySelector('.cc-badge').getAttribute('aria-label')};
    R.prac.badgeSame=R.prac.badge===R.end.badge;
    if(o.shot2)await steady(root,R.reduce)}
  R.errs=errs();R.scrollWidth=document.documentElement.scrollWidth;R.untouchedBefore=before!==null;return R}

async function reopen(){const R={phase:'reopen'},root=await until(()=>document.querySelector('.gcard.quiz .wr'),8000);const before=store();
  root.scrollIntoView({block:'start'});await sleep(1500);settle(root);
  const fin=root.querySelector('.w-fin h2');R.ending=root.dataset.ending;R.head=fin&&fin.textContent;R.text=root.textContent;R.gauge=gauge(root);
  R.same=store()===before;R.issues=textIssues(root,'.w-sr,.w-ov');R.tiny=tiny(root,'.w-sr');R.small=small(root);R.badge=document.querySelector('.cc-badge').getAttribute('aria-label');
  /* the whole quiz again is practice: answer it all right, nothing saved changes */
  const ag=root.querySelector('[data-act=again]');R.again=!!ag;if(ag){ag.click();for(let i=0;i<+root.dataset.cells;i++){const x=await until(()=>{const y=root.querySelectorAll('.w-opt');return y.length&&!y[0].disabled?y:null},6000);if(!x)break;
      R.replayKick=root.querySelector('.kick').textContent;const nx=await answer(root,+root.querySelector('.w-body').dataset.answer,false,R);nx.click()}
    await until(()=>root.querySelector('.w-fin'),6000);await sleep(300);R.replayEnd=root.dataset.ending;R.replayText=root.querySelector('.w-fin').textContent}
  R.sameAfterReplay=store()===before;R.badgeAfter=document.querySelector('.cc-badge').getAttribute('aria-label');R.errs=errs();R.scrollWidth=document.documentElement.scrollWidth;return R}
async function review(){const R={phase:'review'};await until(()=>document.querySelector('.gcard.quiz'),8000);await sleep(300);
  const rb=[...document.querySelectorAll('.nav button')].find(b=>/^Review/.test(b.textContent));R.button=!!rb;if(!rb)return R;rb.click();
  const sh=await until(()=>[...document.querySelectorAll('.sheet')].pop(),3000);R.sheet=sh&&(sh.querySelector('.bar strong')||{}).textContent;const o=sh&&sh.querySelector('.qcard .opt');if(o){o.click();R.why=!!sh.querySelector('.why')}
  R.errs=errs();return R}
async function introPhase(){const R={phase:'intro'},root=await until(()=>document.querySelector('.gcard.quiz .wr'),8000);R.text=root.querySelector('.w-body').textContent;R.errs=errs();return R}
/* the audit of 13 Nov 2026: targets, small text, sheets, the badge chip, dead ends, footer, loops (plan 23 audit fixes) */
const TARGETS=['.nav button','.sheet .close','.cc-x','button.cue','footer a','.sheet .orig','.enl'];
const tgt=sel=>[...document.querySelectorAll(sel)].filter(e=>e.offsetParent&&!e.closest('[hidden]')).map(e=>({sel,t:(e.textContent.trim()||e.getAttribute('aria-label')||'').slice(0,26),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.h<44||x.w<44);
const shot=cv=>{try{return cv.toDataURL().length+':'+cv.toDataURL().slice(-60)}catch(e){return 'x'}};
async function probe(){const R={phase:'probe'};const app=document.getElementById('app');await sleep(500);
  R.tinyMain=tiny(app,'.w-sr,.sr,[aria-hidden="true"]');R.tinyMainN=R.tinyMain.length;
  const s0=[];TARGETS.forEach(x=>s0.push(...tgt(x)));R.smallMain=s0;
  const sb=[...document.querySelectorAll('.nav button')].find(b=>/^Sound/.test(b.textContent));R.sound=sb&&{t:sb.textContent,p:sb.getAttribute('aria-pressed')};
  R.footer=[...document.querySelectorAll('footer a')].map(a=>({t:a.textContent,cur:a.getAttribute('aria-current')}));
  R.oldChip=(document.querySelector('.oldchip')||{}).textContent||null;
  const qc=document.querySelector('.gcard.quiz');R.quizCard=!!qc;
  /* the badge chip once the page has scrolled */
  const pill=document.querySelector('.cc-badge .pill');R.chipFont=pill&&getComputedStyle(pill).fontSize;scrollTo(0,900);await sleep(600);R.chipScrolled=pill&&{op:getComputedStyle(pill).opacity,pe:getComputedStyle(document.querySelector('.cc-badge')).pointerEvents};scrollTo(0,0);await sleep(400);R.chipTop=pill&&getComputedStyle(pill).opacity;
  /* the radar keeps painting under a full-screen sheet? */
  const rc=document.querySelector('.rc canvas,.radar canvas,canvas.rcv');R.radar=!!rc;
  /* a lesson sheet: its name, the page behind inert, focus inside, and focus back on close */
  if(rc){rc.scrollIntoView({block:'center'});await sleep(500);const a0=shot(rc);await sleep(500);R.radarBefore=a0===shot(rc)?'still':'painting'}
  const go=document.querySelector('.cd.learn-card.lcard .go');if(go){go.focus();go.click();await sleep(500);const sh=[...document.querySelectorAll('.sheet')].pop();
    R.sheet={label:sh.getAttribute('aria-label')||(sh.getAttribute('aria-labelledby')&&document.getElementById(sh.getAttribute('aria-labelledby'))||{}).textContent||null,inert:!!app.inert,focusIn:sh.contains(document.activeElement)};
    const s1=[];TARGETS.forEach(x=>s1.push(...tgt(x)));R.smallSheet=s1;
    if(rc){rc.scrollIntoView&&0;const a1=shot(rc);await sleep(600);R.radarUnderSheet=a1===shot(rc)?'still':'painting'}
    history.back();await sleep(500);R.sheet.back=document.activeElement===go;R.sheet.inertAfter=!!app.inert}
  /* My scores */
  if(window.MBScores){MBScores.panel();await sleep(600);const ov=document.querySelector('.cc-over');const lb=ov.getAttribute('aria-labelledby');
    R.scores={label:ov.getAttribute('aria-label')||(lb&&(document.getElementById(lb)||{}).textContent)||null,inert:!!app.inert,tiny:tiny(ov),small:[...ov.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>({t:b.textContent.trim().slice(0,20)||b.getAttribute('aria-label'),w:Math.round(b.offsetWidth),h:Math.round(b.offsetHeight)})).filter(x=>x.w<44||x.h<44)};
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await sleep(300);R.scores.inertAfter=!!app.inert}
  /* Progress: locked badges */
  if(window.openProgress){openProgress();await sleep(600);const lk=document.querySelector('.bd.lock');if(lk){const cs=getComputedStyle(lk);R.lock={op:cs.opacity,color:cs.color}}history.back();await sleep(400)}
  R.errs=errs();return R}
async function fail(){const R={phase:'fail'};await sleep(2500);const app=document.getElementById('app');R.text=app.innerText.slice(0,300);R.buttons=[...app.querySelectorAll('a,button')].map(b=>b.textContent.trim()).filter(Boolean).slice(0,6);return R}
async function noquiz(){const R={phase:'noquiz'},q=await until(()=>document.querySelector('.gcard.quiz'),8000);await sleep(300);R.found=!!q;R.warp=!!(q&&q.querySelector('.wr'));R.cls=q&&q.className;R.text=q&&q.innerText;R.errs=errs();return R}

async function run(){window.__t0=Math.round(performance.now());const h=decodeURIComponent(location.hash.slice(1)),o=Object.fromEntries(h.split('&').map(x=>{const i=x.indexOf('=');return i<0?[x,1]:[x.slice(0,i),x.slice(i+1)]}));
  if(o.fail){send(await fail());return}
  await until(()=>document.querySelector('.gcard.quiz'),8000);await sleep(1200);
  try{const d=new URLSearchParams(location.search).get('d'),b=await fetch('briefs/'+d+'.json').then(r=>r.json());window.__wpItems=b.quiz||(b.lesson&&b.lesson.quiz)||[]}catch(e){window.__wpItems=[]}
  /* the test copy marks each question's answer on the body so the audit can pick right or wrong */
  const q=document.querySelector('.gcard.quiz .wr');if(q){q.dataset.key=new URLSearchParams(location.search).get('d');
    new MutationObserver(()=>{const b=q.querySelector('.w-body'),t=q.querySelector('.w-q');if(b&&t&&window.__wpItems){const it=__wpItems.find(x=>x.q===t.textContent);if(it&&b.dataset.answer!==String(it.answer))b.dataset.answer=it.answer}}).observe(q,{childList:true,subtree:true})}
  const R=o.play!=null?await play(o):o.reopen?await reopen():o.review?await review():o.noquiz?await noquiz():o.intro?await introPhase():o.probe?await probe():o.fail?await fail():{crash:'no phase'};
  send(R)}
addEventListener('load',()=>{run().catch(e=>send({crash:String(e&&e.stack||e),errs:errs()}))});
})();
