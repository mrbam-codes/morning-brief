/* Page audit, loaded only into a test copy of index.html by tests/test_page.py. Never shipped. */
(function(){
const P=s=>{const m=s&&s.match(/rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/);if(!m)return null;
  if(m[1]){const v=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return[v[0],v[1],v[2],v[3]==null?1:v[3]]}
  const v=m[2].split(/[ \/]+/).filter(Boolean).map(Number);return[v[0]*255,v[1]*255,v[2]*255,v[3]==null?1:v[3]]};
const lum=c=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const mix=(a,b)=>{const t=a[3];return[a[0]*t+b[0]*(1-t),a[1]*t+b[1]*(1-t),a[2]*t+b[2]*(1-t),1]};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
function bgs(e){/* every candidate background behind e: solid colours and each gradient stop, composited down to the page */
  let layers=[];for(let n=e;n&&n.nodeType===1;n=n.parentElement){const cs=getComputedStyle(n);if(n!==e){const pb=getComputedStyle(n,'::before'),pc=P(pb.backgroundColor);if(pb.content!=='none'&&pc&&pc[3]>=1&&pb.position==='absolute'){layers.push({stops:[pc]});break}}const c=P(cs.backgroundColor);const stops=(cs.backgroundImage.match(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g)||[]).map(P);
    if(stops.length)layers.push({stops});if(c&&c[3]>0)layers.push({stops:[c]});if(c&&c[3]>=1&&!stops.length)break}
  let out=[[11,6,32,1]];for(let i=layers.length-1;i>=0;i--){const nx=[];layers[i].stops.forEach(s=>out.forEach(o=>nx.push(mix(s,o))));out=nx.slice(0,40)}return out}
function contrast(root){const bad=[],seen=new Set();let n=0;
  root.querySelectorAll('*').forEach(e=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;
    const own=[...e.childNodes].some(t=>t.nodeType===3&&t.textContent.trim());if(!own)return;if(e.closest('canvas,svg,.e,.sharecard'))return;
    const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0)return;const fg=P(cs.color);if(!fg)return;n++;
    const op=[...function*(x){for(;x;x=x.parentElement)yield +getComputedStyle(x).opacity}(e)].reduce((a,b)=>a*b,1);
    const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700,need=(size>=24||(size>=18.66&&bold))?3:4.5;
    const worst=Math.min(...bgs(e).map(b=>ratio(mix([fg[0],fg[1],fg[2],fg[3]*op],b),b)));
    if(worst<need){const k=e.className+'|'+cs.color;if(!seen.has(k)){seen.add(k);bad.push({el:e.tagName.toLowerCase()+'.'+String(e.className).replace(/ /g,'.'),text:e.textContent.trim().slice(0,40),color:cs.color,ratio:+worst.toFixed(2),need})}}});
  return{checked:n,bad}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){const R={};await sleep(1800);
  R.width=innerWidth;R.scrollWidth=document.documentElement.scrollWidth;R.overflowX=R.scrollWidth>innerWidth+1;
  R.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  R.radar=document.querySelectorAll('.cd.radar-card').length;R.blips=document.querySelectorAll('.rc .blip').length;
  R.newsCards=document.querySelectorAll('#deck-news .deck>.cd:not(.radar-card)').length;R.learnCards=document.querySelectorAll('#deck-learn .deck>.cd').length;
  R.lessonCards=document.querySelectorAll('.cd.learn-card.lesson').length;
  R.counters=[...document.querySelectorAll('.cd .k .no')].map(x=>x.textContent);
  R.wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!e.closest('.deck,.rail')}).slice(0,8).map(e=>e.tagName+'.'+e.className);
  R.contrastPage=contrast(document.body);
  R.running=document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations===Infinity).map(a=>a.animationName||'anim').slice(0,10);
  R.text={hero:(document.querySelector('.hero .verdict')||{}).innerText,news:document.querySelector('#deck-news').innerText,learn:document.querySelector('#deck-learn').innerText,quiz:(document.querySelector('.gcard.quiz')||{}).innerText};
  /* open the first lesson, read the sheet, then press Done and check the card files to the rail */
  const go=document.querySelector('.cd.learn-card.lesson .go');if(go){go.click();await sleep(300);const sh=document.querySelector('.sheet:last-of-type');R.lessonSheet=sh?sh.innerText:null;R.contrastSheet=sh?contrast(sh):null;
    R.diagramImgs=sh?sh.querySelectorAll('.lart img').length:0;const im=sh&&sh.querySelector('.lart img');R.diagramLoaded=im?(await new Promise(r=>{if(im.complete)r(im.naturalWidth>0);else{im.onload=()=>r(true);im.onerror=()=>r(false)}})):false;
    const dn=sh&&sh.querySelector('.donebar .dn');if(dn){dn.click();await sleep(1400);const id=go.closest('.cd').dataset.id;R.afterDone={cardHidden:go.closest('.cd').hidden,chips:[...document.querySelectorAll('#deck-learn .rail .chip')].map(c=>c.textContent),saved:JSON.parse(localStorage.getItem('mb-v1')||'{}').read,sheetsOpen:document.querySelectorAll('.sheet').length};
      const ch=document.querySelector('#deck-learn .rail .chip');if(ch){ch.click();await sleep(200);R.afterPutBack={cardHidden:go.closest('.cd').hidden,chips:document.querySelectorAll('#deck-learn .rail .chip').length}}}}
  /* tap the Learn blip */
  const lb=[...document.querySelectorAll('.rc .blip')].find(b=>/Learn deck/.test(b.getAttribute('aria-label')));R.learnBlip=!!lb;
  const errs=document.querySelectorAll('.err').length;R.errorShown=errs>0;
  parent.postMessage({audit:JSON.stringify(R)},'*')}
addEventListener('load',()=>{try{localStorage.clear()}catch(e){}run().catch(e=>{parent.postMessage({audit:JSON.stringify({crash:String(e&&e.stack||e)})},'*')})});
})();
