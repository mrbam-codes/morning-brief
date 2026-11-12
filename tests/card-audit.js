/* Share card and Move my progress audit, loaded only into a test copy of index.html by tests/test_card.py. Never shipped.
   The phase comes from the page address: #card (flip both ways, both animations, the settled QR), #reduced, #copy, #paste=<code>. */
(function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const send=R=>{parent.postMessage({audit:JSON.stringify(R)},'*');setTimeout(()=>fetch('done'),100)};
const rect=e=>{const r=e.getBoundingClientRect();return{x:+r.left.toFixed(2),y:+r.top.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),r:+r.right.toFixed(2),b:+r.bottom.toFixed(2)}};
async function until(f,ms){const t0=performance.now();while(!f()){if(performance.now()-t0>ms)return null;await sleep(10)}return performance.now()-t0}
/* everything inside a face stays inside it, and no line of text is cut off sideways */
function clipped(face){const F=face.getBoundingClientRect(),bad=[];face.querySelectorAll('*').forEach(e=>{if(e.closest('svg,.kpod,.kscene'))return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
  if(r.left<F.left-.5||r.right>F.right+.5||r.top<F.top-.5||r.bottom>F.bottom+.5)bad.push((e.className||e.tagName)+' outside the card');
  const own=[...e.childNodes].some(t=>t.nodeType===3&&t.textContent.trim());if(own&&!e.matches('.bar')&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow!=='visible')bad.push((e.className||e.tagName)+' text cut off')});return bad}
/* the settled code: every module read back from the canvas pixels, pure black or pure white, nothing on top, nothing faded */
function qrCheck(st){const Q=window.MBQR,cv=st.querySelector('.qr'),n=Q.size+8,css=cv.getBoundingClientRect(),px=cv.width,c=cv.getContext('2d'),d=c.getImageData(0,0,px,px).data,mod=css.width/n;
  let wrong=0,grey=0;for(let i=0;i<d.length;i+=4){const v=d[i];if(!((v===0||v===255)&&d[i+1]===v&&d[i+2]===v&&d[i+3]===255))grey++}
  for(let r=0;r<n;r++)for(let k=0;k<n;k++){const want=r>=4&&k>=4&&r<n-4&&k<n-4&&Q.rows[r-4][k-4]==='1',x=Math.floor((k+.5)*px/n),y=Math.floor((r+.5)*px/n),v=d[(y*px+x)*4];if((v===0)!==want)wrong++}
  let over=0,checked=0;for(let r=0;r<n;r+=3)for(let k=0;k<n;k+=3){const e=document.elementFromPoint(css.left+(k+.5)*mod,css.top+(r+.5)*mod);checked++;if(e!==cv)over++}
  let op=1,filt=[];for(let e=cv;e&&e.nodeType===1;e=e.parentElement){const cs=getComputedStyle(e);op*=+cs.opacity;if(cs.filter!=='none')filt.push(e.className);if(cs.mixBlendMode!=='normal')filt.push(e.className+' blend')}
  const qa=st.querySelector('.qa'),fx=st.querySelector('.cf-fx'),bg=st.querySelector('.cf-bg');
  return{modules:n,cssSize:+css.width.toFixed(2),modulePx:+mod.toFixed(3),wholePx:Math.abs(mod-Math.round(mod))<1e-6,backing:px,wrong,grey,checked,over,opacity:op,filters:filt,
    qaHidden:getComputedStyle(qa).visibility==='hidden',fxEmpty:fx.width===0&&bg.width===0,extras:st.querySelectorAll('.cf-fly,.cf-ghost').length,a3d:st.classList.contains('a3d'),anims:st.getAnimations({subtree:true}).filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations!==Infinity).length}}
async function turnAndWatch(st,how){const R={from:st.dataset.side};let tEnd=null;const mo=new MutationObserver(()=>{if(st.dataset.side!=='anim'&&tEnd===null)tEnd=performance.now()});mo.observe(st,{attributes:true,attributeFilter:['data-side']});const t0=performance.now();
  if(how==='key'){st.focus();st.dispatchEvent(new KeyboardEvent('keydown',{key:R.from==='front'?'Enter':' ',bubbles:true}))}else st.click();
  await sleep(16);R.sideSoon=st.dataset.side;await sleep(104);R.fly=!!st.querySelector('.cf-fly');R.ghosts=st.querySelectorAll('.cf-ghost').length;R.qaShown=getComputedStyle(st.querySelector('.qa')).visibility==='visible';
  await sleep(500);R.midSide=st.dataset.side;R.fxDrawn=st.querySelector('.cf-fx').width>0;R.bgDrawn=st.querySelector('.cf-bg').width>0;
  await until(()=>st.dataset.side!=='anim',4000);await sleep(20);mo.disconnect();R.ms=tEnd===null?null:Math.round(tEnd-t0);R.to=st.dataset.side;
  await sleep(150);R.label=st.getAttribute('aria-label');R.shipIn=(st.querySelector('.ship')||{}).closest?(st.querySelector('.ship').closest('.slot')?'slot':st.querySelector('.ship').closest('.cfront')?'front':'other'):'none';
  R.slotText=st.querySelector('.slot').innerText.trim();R.frontVis=getComputedStyle(st.querySelector('.cfront')).visibility;R.backVis=getComputedStyle(st.querySelector('.cback')).visibility;
  if(R.to==='back'){st.querySelector('.qr').scrollIntoView({block:'center'});await sleep(50);R.qr=qrCheck(st);R.backClip=clipped(st.querySelector('.cback'))}
  return R}
async function card(reduced){const R={width:innerWidth,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches};
  MBScores.share();await sleep(900);
  const st=document.querySelector('.cflip'),fr=st.querySelector('.cfront'),bk=st.querySelector('.cback'),ov=document.querySelector('.cc-over');
  R.stage=rect(st);R.front=rect(fr);R.back=rect(bk);R.role=st.getAttribute('role');R.tabindex=st.getAttribute('tabindex');R.label=st.getAttribute('aria-label');
  R.overflowX=document.documentElement.scrollWidth>innerWidth+1||ov.scrollWidth>ov.clientWidth+1;R.frontText=fr.textContent;R.backText=bk.textContent;
  R.frontClip=clipped(fr);R.pilot=!!fr.querySelector('.kpod .kscene');R.pilotName=(fr.querySelector('.ship .tag')||{}).textContent;
  R.turns=[];
  if(reduced){for(let i=0;i<2;i++)R.turns.push(await turnAndWatch(st,'click'))}
  else{for(let i=0;i<4;i++){R.turns.push(await turnAndWatch(st,'click'));R.overflowDuring=R.overflowDuring||ov.scrollWidth>ov.clientWidth+1}
    R.turns.push(await turnAndWatch(st,'key'));R.turns.push(await turnAndWatch(st,'key'))}
  /* a name with HTML in it shows as text */
  const nm=document.getElementById('ccName');nm.value='<b>x</b>';nm.dispatchEvent(new Event('input'));await sleep(300);
  R.nameAsText=document.querySelector('.cfront').innerText.includes('<b>x</b>');R.afterRename=document.querySelector('.cflip').dataset.side;
  /* close and open again: the other cat flies, and the next turn to the back is the other animation (the counter lives for the whole visit) */
  document.querySelector('.cc-over [data-close]').click();await sleep(200);MBScores.share();await sleep(900);
  const s2=document.querySelector('.cflip');R.second={pilotName:(s2.querySelector('.ship .tag')||{}).textContent,pilot:!!s2.querySelector('.kpod canvas'),turn:await turnAndWatch(s2,'click')};
  R.second.back=await turnAndWatch(s2,'click');R.second.tractor=await turnAndWatch(s2,'click');
  const pc=s2.querySelector('.slot .kpod canvas');R.second.pilotDrawn=!!pc&&[...pc.getContext('2d').getImageData(0,0,pc.width,pc.height).data].some((v,i)=>i%4===0&&v>0);
  return R}
/* plan 22: Move my progress lives in the My scores sheet that the score badge opens */
const moveBlock=async()=>{let mv=document.querySelector('.cc-over .cc-move');if(!mv){document.querySelector('.cc-badge').click();await until(()=>document.querySelector('.cc-over .cc-move'),3000);await sleep(300);mv=document.querySelector('.cc-over .cc-move')}return mv};
async function copy(){const R={};const mv=await moveBlock();R.found=!!mv;if(!mv)return R;
  R.inSheet=!!mv.closest('.cc-over .cc-sheet');R.onPage=document.querySelectorAll('#app .gcard.move').length;
  const [cp]=mv.querySelectorAll('.mv-row button');cp.click();await until(()=>mv.querySelector('.mv-code').value,3000);await sleep(200);
  R.code=mv.querySelector('.mv-code').value;R.boxShown=!mv.querySelector('.mv-code').hidden;R.status=mv.querySelector('.mv-status').textContent;
  R.points=MBScores&&JSON.parse(localStorage.getItem('mb-v1')).points;R.badge=document.querySelector('.cc-badge').getAttribute('aria-label');return R}
async function paste(code){const R={};const mv=await moveBlock(),[,ps]=mv.querySelectorAll('.mv-row button');
  const before=localStorage.getItem('mb-v1');R.before=JSON.parse(before||'null');R.badgeBefore=document.querySelector('.cc-badge').getAttribute('aria-label');
  ps.click();await sleep(50);const inp=mv.querySelector('.mv-in'),use=mv.querySelector('.mv-paste button');R.pasteShown=!mv.querySelector('.mv-paste').hidden;
  const tryCode=async c=>{inp.value=c;use.click();await sleep(400);return{status:mv.querySelector('.mv-status').textContent,asked:!mv.querySelector('.mv-ask').hidden}};
  R.bad=[];for(const c of ['rubbish','<img src=x onerror=alert(1)>',code.slice(0,-3),'MEP'+code.slice(2)])R.bad.push(await tryCode(c));
  R.unchangedAfterBad=localStorage.getItem('mb-v1')===before;R.imgs=document.querySelectorAll('.move img').length;
  const a=await tryCode(code);R.ask=mv.querySelector('.mv-ask').innerText;R.asked=a.asked;R.goodStatus=a.status;
  const [yes,no]=mv.querySelectorAll('.mv-ask button');if(!no)return R;no.click();await sleep(100);R.afterCancel=mv.querySelector('.mv-status').textContent;R.unchangedAfterCancel=localStorage.getItem('mb-v1')===before;
  ps.click();await tryCode(code);mv.querySelectorAll('.mv-ask button')[0].click();await sleep(300);
  /* after Yes the sheet opens again with the new numbers, and the message shows there */
  await until(()=>{const s=document.querySelector('.cc-over .cc-move .mv-status');return s&&s.textContent},3000);
  R.after=JSON.parse(localStorage.getItem('mb-v1'));R.status=document.querySelector('.cc-over .cc-move .mv-status').textContent;R.badgeAfter=document.querySelector('.cc-badge').getAttribute('aria-label');
  R.quizText=document.querySelector('.gcard.quiz').innerText;return R}
async function run(){await sleep(1500);const h=decodeURIComponent(location.hash.slice(1)),R={phase:h.split('=')[0]};
  if(h==='card')Object.assign(R,await card(false));
  else if(h==='reduced')Object.assign(R,await card(true));
  else if(h==='copy')Object.assign(R,await copy());
  else if(h.startsWith('paste='))Object.assign(R,await paste(h.slice(6)));
  else if(h.startsWith('mid=')){/* for screenshots only: complete N-1 turns, then start turn N and stop the page T ms in */const[n,t]=h.slice(4).split(',').map(Number);MBScores.share();await sleep(900);const st=document.querySelector('.cflip');
    for(let i=0;i<n-1;i++){st.click();await sleep(50);await until(()=>st.dataset.side!=='anim',4000);await sleep(100)}st.click();await sleep(t);fetch('done');return}
  else if(h.startsWith('shot=')){/* for screenshots only: open the card and turn it N times */MBScores.share();await sleep(900);const st=document.querySelector('.cflip');
    for(let i=0;i<+h.slice(5);i++){st.click();await sleep(50);await until(()=>st.dataset.side!=='anim',4000);await sleep(100)}
    const q=st.querySelector('.qr');q.scrollIntoView({block:'center'});await sleep(400);const r=q.getBoundingClientRect();fetch('done?side='+st.dataset.side+'&qr='+[r.left,r.top,r.width].join(','));return}
  send(R)}
addEventListener('load',()=>{run().catch(e=>send({crash:String(e&&e.stack||e)}))});
})();
