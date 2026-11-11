/* Built in the wild audit, loaded only into a test copy of index.html by tests/test_builds_page.py. Never shipped. */
(function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const loaded=im=>new Promise(r=>{if(im.complete)r(im.naturalWidth>0);else{im.onload=()=>r(true);im.onerror=()=>r(false)}});
const FOLLOWS=(a,b)=>!!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));
const frames=()=>[...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src'));
/* anything that would load from YouTube (links the reader taps are fine; a src attribute is not) */
const ytAttrs=()=>[...document.querySelectorAll('[src]')].filter(e=>/youtube|youtu\.be|ytimg/i.test(e.getAttribute('src')||'')).length;
async function run(){await sleep(1800);const R={};
  R.width=innerWidth;R.scrollWidth=document.documentElement.scrollWidth;R.overflowX=R.scrollWidth>innerWidth+1;
  R.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  R.running=document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations===Infinity).map(a=>a.animationName||'anim').slice(0,10);
  R.errorShown=document.querySelectorAll('.err').length>0;
  const sec=document.getElementById('builds');R.section=!!sec;R.bwNodes=document.querySelectorAll('[class^="bw"],[class*=" bw"]').length;
  R.framesAtLoad=frames().length;R.youtubeAtLoad=ytAttrs();
  R.outside=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>!u.startsWith(location.origin)&&!u.startsWith('data:'));
  /* the quiz block is last: nothing after the quiz in its main except the interview round, nothing after that main but the footer */
  const quiz=document.querySelector('.gcard.quiz'),app=document.getElementById('app');
  if(quiz){const m=quiz.parentElement,k=[...m.children];R.afterQuiz=k.slice(k.indexOf(quiz)+1).map(e=>e.className);const a=[...app.children];R.afterQuizMain=a.slice(a.indexOf(m)+1).map(e=>e.tagName.toLowerCase())}
  R.wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!e.closest('.deck,.rail,.bw-carts')}).slice(0,8).map(e=>e.tagName+'.'+e.className);
  if(sec){
    const news=document.getElementById('deck-news'),learn=document.getElementById('deck-learn'),chat=[...document.querySelectorAll('.xfeed,.card.chat')].pop();
    R.order={afterNews:FOLLOWS(news,sec),afterLearn:FOLLOWS(learn,sec),afterChat:chat?FOLLOWS(chat,sec):null,beforeQuiz:FOLLOWS(sec,quiz)};
    const carts=[...sec.querySelectorAll('.bw-cart')],row=sec.querySelector('.bw-carts');R.carts=carts.length;
    R.row={scrollWidth:row.scrollWidth,clientWidth:row.clientWidth,overflowX:getComputedStyle(row).overflowX,right:Math.round(row.getBoundingClientRect().right)};
    R.firstPressed=carts[0]&&carts[0].getAttribute('aria-pressed');
    R.builds=[];
    for(let i=0;i<carts.length;i++){carts[i].scrollIntoView({block:'nearest',inline:'nearest'});carts[i].click();await sleep(1400);
      const scr=sec.querySelector('.bw-scr'),B={i,pressed:carts.map(c=>c.getAttribute('aria-pressed')).join(',')};
      B.tile4=[...sec.querySelectorAll('.bw-hud div')].map(d=>[d.querySelector('b').textContent,d.querySelector('span').textContent])[3];
      B.title=sec.querySelector('.bw-b h3').textContent;B.tagsInText=sec.querySelectorAll('.bw-b h3 *, .bw-b li *, .bw-cart em *').length;
      B.links=[...sec.querySelectorAll('.bw-b .bw-lk a')].map(a=>a.getAttribute('href'));B.outLinks=[...sec.querySelectorAll('.bw-scr a,.bw-cap a')].map(a=>[a.textContent,a.getAttribute('href')]);
      B.allHrefs=[...sec.querySelectorAll('a')].map(a=>a.getAttribute('href'));
      B.play=!!scr.querySelector('.bw-play');B.frames=frames();B.titleScreen=!!scr.querySelector('.bw-title');
      const dg=scr.querySelector('.bw-dg img');B.diagram=dg?{src:dg.getAttribute('src').slice(0,40),loaded:await loaded(dg)}:null;
      B.markerAsText=document.body.innerText.includes('DIAGRAM-MARKER')||[...document.querySelectorAll('svg text')].some(t=>t.textContent.includes('DIAGRAM-MARKER'));
      const ph=scr.querySelector('.bw-ph img');B.photo=ph?{src:ph.getAttribute('src'),loaded:await loaded(ph)}:null;B.cap=sec.querySelector('.bw-cap').textContent;
      /* layout size, not the on-screen box: headless virtual time freezes CSS animations at their first frame (the screen switches on from 2% height) */
      B.small=[...sec.querySelectorAll('button,a')].filter(e=>e.offsetParent).map(e=>({t:(e.textContent.trim()||e.getAttribute('aria-label')||'').slice(0,24),w:e.offsetWidth,h:e.offsetHeight})).filter(x=>x.w<44||x.h<44);
      B.wide=[...sec.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!e.closest('.bw-carts')}).slice(0,5).map(e=>e.tagName+'.'+e.className);
      if(B.play){B.framesBeforeTap=frames().length;B.youtubeBeforeTap=ytAttrs();scr.querySelector('.bw-play').click();await sleep(150);const f=document.querySelector('iframe');
        B.framesAfterTap=frames();B.sandbox=f&&f.getAttribute('sandbox');B.stop=!!sec.querySelector('.bw-stop');
        const st=sec.querySelector('.bw-stop');if(st){const r=st.getBoundingClientRect();B.stopSize=[Math.round(r.width),Math.round(r.height)];st.click();await sleep(50);B.framesAfterStop=frames().length;B.focusAfterStop=document.activeElement&&document.activeElement.className}
        /* play again, then switch cartridge: the frame must go */
        const p2=scr.querySelector('.bw-play');if(p2){p2.click();await sleep(100)}B.framesReplay=frames().length;
        const other=carts[(i+1)%carts.length];if(other!==carts[i]){other.click();await sleep(30);B.framesAfterSwitch=frames().length;carts[i].click();await sleep(1400)}}
      R.builds.push(B)}
    /* keyboard: focus the first cartridge, press the right arrow */
    carts[0].click();await sleep(1400);carts[0].focus();carts[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await sleep(50);
    R.keyboard={focused:document.activeElement===carts[1],pressed:carts[1]&&carts[1].getAttribute('aria-pressed')};
    R.scrollWidthEnd=document.documentElement.scrollWidth}
  parent.postMessage({audit:JSON.stringify(R)},'*')}
addEventListener('load',()=>{try{localStorage.clear()}catch(e){}run().catch(e=>{parent.postMessage({audit:JSON.stringify({crash:String(e&&e.stack||e)})},'*')})});
})();
