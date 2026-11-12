/* Fun fact photo audit, loaded only into a test copy of index.html by tests/test_fact_photo_page.py. Never shipped. */
(function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const loaded=im=>new Promise(r=>{if(im.complete)r(im.naturalWidth>0);else{im.onload=()=>r(true);im.onerror=()=>r(false);setTimeout(()=>r(im.naturalWidth>0),3000)}});
const box=e=>{const r=e.getBoundingClientRect();return{left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),height:Math.round(r.height)}};
const top=()=>[...document.querySelectorAll('.sheet')].pop();
async function hero(sh){const im=sh&&sh.querySelector('.shero img'),a=sh&&sh.querySelector('.shero figcaption a');
  return im?{src:im.getAttribute('src'),loaded:await loaded(im),box:box(im),cap:a&&a.textContent,href:a&&a.getAttribute('href'),target:a&&a.getAttribute('target'),rel:a&&a.getAttribute('rel'),capBox:a&&box(a)}:null}
async function run(){await sleep(1800);const R={};
  R.width=innerWidth;R.errorShown=document.querySelectorAll('.err').length>0;
  const fc=document.querySelector('.cd.fact');R.factCard=!!fc;
  if(fc){fc.scrollIntoView({block:'nearest',inline:'nearest'});await sleep(800);
    const f=fc.querySelector('figure.ph'),im=f&&f.querySelector('img');R.card=box(fc);
    R.cardPhoto=im?{src:im.getAttribute('src'),alt:im.alt,loaded:await loaded(im),box:box(im),title:f.title}:null;
    await sleep(300);R.cardPhotoAfter=!!fc.querySelector('figure.ph');
    fc.querySelector('.go').click();await sleep(700);const sh=top();
    R.sheet=sh?{scrollWidth:sh.scrollWidth,clientWidth:sh.clientWidth,label:(sh.querySelector('.bar strong')||{}).textContent}:null;
    R.factHero=await hero(sh);await sleep(200);R.factHeroAfter=!!(sh&&sh.querySelector('.shero'));
    history.back();await sleep(600)}
  /* the first news card with a photo: its opened story must show the photo and the drawing */
  const sc=[...document.querySelectorAll('#deck-news .cd')].find(c=>c.querySelector('figure.ph'));R.storyCard=!!sc;
  if(sc){sc.scrollIntoView({block:'nearest',inline:'nearest'});await sleep(500);const ci=sc.querySelector('figure.ph img');R.storyCardPhoto=ci?{src:ci.getAttribute('src'),loaded:await loaded(ci)}:null;
    sc.querySelector('.go').click();await sleep(700);const sh=top();R.storyHero=await hero(sh);
    const d=sh&&sh.querySelector('img.sdraw');R.storyDrawing=d?{loaded:await loaded(d),box:box(d),afterHero:!!(sh.querySelector('.shero')&&(sh.querySelector('.shero').compareDocumentPosition(d)&Node.DOCUMENT_POSITION_FOLLOWING))}:null;
    history.back();await sleep(600)}
  R.scrollWidth=document.documentElement.scrollWidth;R.overflowX=R.scrollWidth>innerWidth+1;
  R.outside=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>!u.startsWith(location.origin)&&!u.startsWith('data:'));
  R.imgs=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>u.includes('/briefs/img/')).map(u=>u.replace(location.origin,''));
  parent.postMessage({audit:JSON.stringify(R)},'*')}
addEventListener('load',()=>{try{localStorage.clear()}catch(e){}run().catch(e=>{parent.postMessage({audit:JSON.stringify({crash:String(e&&e.stack||e)})},'*')})});
})();
