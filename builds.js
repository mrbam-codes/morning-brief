/* builds.js: the "Built in the wild" section (plan 15, gate A).
   Ported from the approved mock-up, direction 1 "Cartridge select": an arcade screen at the top,
   a row of game cartridges below (one per build), tap a cartridge to load that build into the
   screen, and its breakdown appears under the screen.
   It renders the optional top-level `builds` list of the day's brief (0 to 4). No list, or an
   empty one, means no section at all, so old editions look exactly as they did.
   Every field is untrusted:
   - text goes in with textContent only (no innerHTML anywhere in this file);
   - a link is shown only if it starts with https://;
   - a video is only an 11-character YouTube code, tested before any address is built, and the
     frame is made only when the reader taps play (nothing is fetched from YouTube before that);
   - a diagram is only ever an <img> with a data: address, never put into the page as markup;
   - a photo goes through the page's own story-photo code (pimg), with its credit shown. */
(function(){
'use strict';
const VID=/^[A-Za-z0-9_-]{11}$/,HTTPS=/^https:\/\/\S+$/;
const PROOF={'Shown working':'ok','Code published':'code','Claim only':'warn'};
const CC=['#ffe600','#00f0ff','#ff7aa5','#3dffa2'];
const NS='http://www.w3.org/2000/svg';
const reduce=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const str=v=>typeof v==='string'?v.trim():'';
const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n};
const httpsOnly=u=>typeof u==='string'&&HTTPS.test(u)?u:null;
const out=(u,t,cls)=>{const a=el('a',cls||null,t);a.href=u;a.target='_blank';a.rel='noopener';return a};
const restart=(n,c)=>{n.classList.remove(c);void n.offsetWidth;n.classList.add(c)};
/* small fixed icons, drawn with DOM calls (not markup strings) */
const ICON={ok:[['M2.5 8.5l3.5 3.5 7.5-8']],code:[['M5.5 3.5L1.8 8l3.7 4.5M10.5 3.5L14.2 8l-3.7 4.5']],
  warn:[['M8 1.6L15.2 14.4H.8z'],['M8 6v4.2'],['M7 12.2a1 1 0 1 0 2 0a1 1 0 1 0-2 0',1]],play:[['M5 2.5v11l9-5.5z',1]]};
function ic(name,cls){const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 16 16');s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');s.setAttribute('class',cls||'bw-ic');
  ICON[name].forEach(([d,fill])=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',d);
    if(fill)p.setAttribute('fill','currentColor');else{p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','2.2');p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round')}s.append(p)});
  return s}
/* one build from the day's file, reduced to safe, known fields */
function clean(x){if(!x||typeof x!=='object'||Array.isArray(x))return null;const what=str(x.what);if(!what)return null;
  const L=x.links&&typeof x.links==='object'?x.links:{},links={};['post','video','code'].forEach(k=>{const u=httpsOnly(L[k]);if(u)links[k]=u});
  const list=v=>(Array.isArray(v)?v:[]).map(str).filter(Boolean),proof=str(x.proof),code=str(x.video),dg=str(x.diagram);
  const kind=x.video!=null&&x.video!==''?'video':/^<svg[\s>]/.test(dg)?'diagram':x.photo&&typeof x.photo==='object'&&typeof x.photo.src==='string'?'photo':'none';
  return{src:x,what,who:str(x.who),reach:str(x.reach),steps:list(x.steps).slice(0,4),tools:list(x.tools).slice(0,8),
    proof:PROOF[proof]?proof:'Not rated',pk:PROOF[proof]||'warn',proofNote:str(x.proof_note),
    level:str(x.level),levelNote:str(x.level_note),first:str(x.first_step),links,
    label:Array.from(str(x.label)||what).slice(0,14).join(''),kind,code:VID.test(code)?code:null,diagram:dg,diagramAlt:str(x.diagram_alt)}}
function mount(app,b,pimg){
  const list=(Array.isArray(b&&b.builds)?b.builds:[]).slice(0,4).map(clean).filter(Boolean);
  if(!list.length)return null;
  list.forEach((x,i)=>{x.n=i+1});
  const sec=el('section','bw');sec.id='builds';sec.setAttribute('aria-labelledby','bw-title');
  const cab=el('div','bw-cab'),mq=el('h2','bw-marq','Built in the wild');mq.id='bw-title';
  const crt=el('div','bw-crt'),scr=el('div','bw-scr'),cap=el('div','bw-cap'),hud=el('div','bw-hud');crt.append(scr);hud.setAttribute('role','group');hud.setAttribute('aria-label','Build stats');
  cab.append(mq,crt,cap,hud);
  const many=list.length>3,slot=el('p','bw-slot','Insert a cartridge'+(many?' · swipe for more':''));
  const carts=el('div','bw-carts'+(many?' bw-scroll':''));carts.setAttribute('role','group');carts.setAttribute('aria-label','Builds: pick one to load it');
  const brk=el('div','bw-b');brk.setAttribute('aria-live','polite');
  sec.append(cab,slot,carts,brk);
  let cur=-1,timer=0;
  const btns=list.map((x,i)=>{const c=el('button','bw-cart');c.type='button';c.style.setProperty('--c',CC[i]);c.setAttribute('aria-pressed','false');c.setAttribute('aria-label','Load build '+x.n+': '+x.what);
    const lb=el('span','bw-cart-l');lb.append(el('b',null,'0'+x.n),el('em',null,x.label),el('small',null,x.level));c.append(el('span','bw-cart-b'),lb);
    c.onclick=()=>load(i,true);carts.append(c);return c});
  /* arrow keys, Home and End move between cartridges; Enter and Space work as on any button */
  carts.addEventListener('keydown',e=>{const i=btns.indexOf(document.activeElement);if(i<0)return;const n=btns.length;
    const j={ArrowRight:(i+1)%n,ArrowDown:(i+1)%n,ArrowLeft:(i-1+n)%n,ArrowUp:(i-1+n)%n,Home:0,End:n-1}[e.key];if(j==null)return;e.preventDefault();btns[j].focus();load(j,true)});
  function tile(k,v,cls,icon){const d=el('div'),s=el('span',cls||null);if(icon)s.append(ic(icon));s.append(v);d.append(el('b',null,k),s);hud.append(d)}
  function drawHud(x){hud.textContent='';tile('Proof',x.proof,'h-'+x.pk,x.pk);tile('Level',x.level||'Not given');tile('Tools',String(x.tools.length));
    if(x.kind==='video')tile('Video',x.code?'Yes':x.links.video?'Link only':'None');else tile('Visual',{diagram:'Diagram',photo:'Photo',none:'None'}[x.kind])}
  function drawBreakdown(x){brk.textContent='';brk.append(el('h3',null,x.what));
    if(x.who||x.reach){const by=el('p','bw-by');if(x.who)by.append(el('b',null,x.who));if(x.reach)by.append((x.who?' · ':'')+x.reach);brk.append(by)}
    const h4=t=>brk.append(el('h4',null,t));
    if(x.steps.length){h4('How it works');const ol=el('ol','bw-steps');x.steps.forEach(s=>ol.append(el('li',null,s)));brk.append(ol)}
    if(x.tools.length){h4('Tools used');const ch=el('div','bw-chips');x.tools.forEach(t=>ch.append(el('span','bw-chip',t)));brk.append(ch)}
    h4('Proof');const pp=el('p'),pf=el('span','bw-pf bw-pf-'+x.pk);pf.append(ic(x.pk),x.proof);pp.append(pf);brk.append(pp);if(x.proofNote)brk.append(el('p','bw-note',x.proofNote));
    if(x.level||x.first){h4('Could you build it?');if(x.level)brk.append(el('p','bw-lvl',x.level));if(x.levelNote)brk.append(el('p','bw-note',x.levelNote));
      if(x.first){const p=el('p','bw-first');p.append(el('b',null,'First step: '),x.first);brk.append(p)}}
    const L=[['post','The post'],['video','The video'],['code','The code']].filter(([k])=>x.links[k]);
    if(L.length){const lk=el('div','bw-lk');L.forEach(([k,t])=>lk.append(out(x.links[k],t+' ↗')));brk.append(lk)}}
  function title(c,x){const t=el('div','bw-title');t.append(el('b',null,x.label),el('span',null,'No video for this build. Its breakdown is below.'));c.append(t)}
  function credit(ph){const t='Photo: '+str(ph.credit)+(str(ph.licence)?', '+str(ph.licence):''),u=httpsOnly(ph.page);cap.append(u?out(u,t+' ↗','bw-credit'):el('span','bw-credit',t))}
  function poster(c,x){const p=el('div','bw-vp');p.append(el('span','bw-vp-k','Video'));
    if(x.code){const bt=el('button','bw-play');bt.type='button';bt.setAttribute('aria-label','Play the video: '+x.what);const ci=el('span','bw-play-c');ci.append(ic('play','bw-play-i'));bt.append(ci,el('span','bw-vp-t',x.label));p.append(bt);
      p.onclick=()=>play(c,x)}
    else{const m=el('div','bw-vp-off');m.append(el('span','bw-vp-t',x.label));const u=x.links.video;
      if(u)m.append(out(u,(/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(u)?'Watch on YouTube':'Watch the video')+' ↗','bw-vp-out'));else m.append(el('span','bw-vp-n','This video cannot play here.'));p.append(m)}
    c.append(p)}
  /* the only place a frame is made: after a tap, from a code that passed the 11-character test */
  function play(c,x){if(!VID.test(x.code||''))return;c.textContent='';crt.classList.add('on');
    const f=document.createElement('iframe');f.className='bw-yt';f.title='Video: '+x.what;f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');f.allowFullscreen=true;
    f.referrerPolicy='strict-origin-when-cross-origin';f.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox');
    f.src='https://www.youtube-nocookie.com/embed/'+x.code+'?autoplay=1&rel=0&playsinline=1';c.append(f);
    cap.textContent='';const st=el('button','bw-stop','Stop video');st.type='button';st.onclick=()=>{drawScreen(x,false);const pb=scr.querySelector('.bw-play');if(pb)pb.focus({preventScroll:true})};cap.append(st)}
  function drawScreen(x,boot){scr.textContent='';cap.textContent='';crt.classList.remove('on');const c=el('div','bw-scr-c'+(boot?' boot':''));scr.append(c);
    if(x.kind==='video')poster(c,x);
    else if(x.kind==='diagram'){const f=el('figure','bw-dg'),im=document.createElement('img');im.alt=x.diagramAlt||'Diagram: '+x.what;im.decoding='async';im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x.diagram);f.append(im);c.append(f)}
    else if(x.kind==='photo'){title(c,x);const f=typeof pimg==='function'?pimg(x.src,'bw-ph'):null;if(f){c.append(f);credit(x.src.photo)}}
    else title(c,x);
    c.append(el('span','bw-ch','Channel 0'+x.n))}
  function load(i,user){if(i===cur)return;cur=i;const x=list[i];
    btns.forEach((c,j)=>{c.setAttribute('aria-pressed',j===i?'true':'false');c.classList.remove('ins')});
    drawHud(x);drawBreakdown(x);clearTimeout(timer);
    if(user&&many){const c=btns[i];if(c.offsetLeft<carts.scrollLeft||c.offsetLeft+c.offsetWidth>carts.scrollLeft+carts.clientWidth)carts.scrollTo({left:c.offsetLeft-8,behavior:reduce()?'auto':'smooth'})}
    if(user&&!reduce()){restart(btns[i],'ins');restart(brk,'fresh');scr.textContent='';cap.textContent='';crt.classList.remove('on');
      const ld=el('div','bw-load'),bar=el('span','bw-ldbar');bar.append(el('i'));ld.append(el('span',null,'Loading 0'+x.n),bar);scr.append(ld);
      timer=setTimeout(()=>drawScreen(x,true),700)}
    else drawScreen(x,false)}
  load(0,false);app.append(sec);return sec}
window.Builds={mount,clean,VID};
})();
