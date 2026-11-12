/* Scoring parity driver (plan 23), loaded only by tests/test_warp_parity.py. Never shipped.
   Runs in a harness page on the same origin as two staged copies of the site: old/ (the page before
   Warp Run, commit 7f7b53d) and new/ (this one). For every case it seeds the same saved state, opens the
   edition in a 390px frame, answers the same pattern, and reads back everything the page saved. Then it
   plays practice (the old replay; the new practice refuel and the whole-quiz replay) and reads it again. */
(function(){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms){const t0=performance.now();let v;while(!(v=f())){if(performance.now()-t0>ms)return null;await sleep(15)}return v}
const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const back=(date,n)=>{const[y,m,d]=date.split('-').map(Number);return ds(new Date(y,m-1,d-n))};
/* a browser that has finished the k days before the edition, with some history to carry along */
function seed(date,k){const days={};for(let i=k;i>=1;i--)days[back(date,i)]={score:4,total:5,points:0,at:1762800000000+i};
  return JSON.stringify({days,tags:{AI:[5,6],Tech:[4,5],Cyber:[3,4]},lessons:{},points:0,badges:{first:back(date,k||1)},review:[],prog:{},sound:false,v2:1,bonus:0})}
let F=null;
async function open(ver,date){if(F)F.remove();F=document.createElement('iframe');F.width=390;F.height=844;F.style.border=0;F.src=ver+'/index.html?d='+date;document.body.append(F);
  await until(()=>F.contentDocument&&F.contentDocument.querySelector('.gcard.quiz'),15000);await sleep(150);return F.contentDocument}
const store=()=>localStorage.getItem('mb-v1');
/* old page: the quiz runs in a sheet (play() in index.html) */
async function oldAnswer(D,picks,stopAt,from){for(let i=from||0;i<picks.length;i++){if(stopAt!=null&&i>=stopAt)return null;
    const sh=await until(()=>{const s=[...D.querySelectorAll('.sheet')].pop();return s&&s.querySelectorAll('.qcard .opt:not(:disabled)').length?s:null},5000);if(!sh)throw new Error('old: no question '+i);
    sh.querySelectorAll('.qcard .opt')[picks[i]].click();const nx=await until(()=>sh.querySelector('.qcard .btn'),3000);nx.click()}
  const sh=[...D.querySelectorAll('.sheet')].pop();const p=await until(()=>sh.querySelector('.pts'),3000);return p?p.textContent:null}
async function oldPlay(D,picks,stopAt,from){D.querySelector('.gcard.quiz .btn').click();return oldAnswer(D,picks,stopAt,from)}
/* new page: Warp Run inside the quiz section */
async function newAnswer(D,picks,stopAt,from){const root=D.querySelector('.gcard.quiz .wr');for(let i=from||0;i<picks.length;i++){if(stopAt!=null&&i>=stopAt)return null;
    const b=await until(()=>{const o=root.querySelectorAll('.w-opt');return o.length&&!o[0].disabled?o:null},6000);if(!b)throw new Error('new: no question '+i);
    b[picks[i]].click();const nx=await until(()=>root.querySelector('[data-act=next]'),4000);if(!nx)throw new Error('new: no next '+i);nx.click()}}
async function newPlay(D,picks,stopAt,from){const root=D.querySelector('.gcard.quiz .wr');(await until(()=>root.querySelector('[data-act=start]'),5000)).click();await newAnswer(D,picks,stopAt,from);
  if(stopAt!=null)return null;const m=await until(()=>root.querySelector('.w-fin .w-math'),5000);return m?m.textContent:null}
async function newPractice(D,items){const root=D.querySelector('.gcard.quiz .wr'),log=[];
  for(let guard=0;guard<6;guard++){const pb=root.querySelector('[data-act=practise]');if(!pb)break;pb.click();
    for(let g=0;g<10;g++){const o=await until(()=>{const x=root.querySelectorAll('.w-opt');return x.length&&!x[0].disabled?x:null},3000);if(!o)break;
      const q=root.querySelector('.w-q').textContent,it=items.find(x=>x.q===q);o[it.answer].click();const nx=await until(()=>root.querySelector('[data-act=next]'),3000);if(!nx)break;nx.click();
      await sleep(30);if(root.querySelector('.w-fin'))break}log.push(root.dataset.ending)}
  const ag=await until(()=>root.querySelector('[data-act=again]'),3000);if(ag){ag.click();const wrong=items.map(it=>(it.answer+1)%4);await newAnswer(D,wrong);await until(()=>root.querySelector('.w-fin'),4000);log.push('replay '+root.dataset.ending)}
  return log}
async function oldPractice(D,items){[...D.querySelectorAll('.sheet')].forEach(()=>history.back&&F.contentWindow.history.back());await sleep(300);
  const b=D.querySelector('.gcard.quiz .btn');const label=b.textContent;b.click();await oldAnswer(D,items.map(it=>it.answer));return label}
async function run(){const C=JSON.parse(decodeURIComponent(location.hash.slice(1))),out=[];
  for(const c of C.cases){const row={id:c.id};
    for(const ver of ['old','new']){try{localStorage.clear();localStorage.setItem('mb-tour-v1','1');localStorage.setItem('mb-v1',seed(c.date,c.streak));
        let D=await open(ver,c.date),math;
        if(c.resumeAt!=null){if(ver==='old')await oldPlay(D,c.picks,c.resumeAt);else await newPlay(D,c.picks,c.resumeAt);row[ver+'Mid']=store();D=await open(ver,c.date);
          row[ver+'ResumeLabel']=ver==='old'?D.querySelector('.gcard.quiz .btn').textContent:(await until(()=>D.querySelector('[data-act=start]'),4000)).textContent;
          math=ver==='old'?await oldPlay(D,c.picks,null,c.resumeAt):await newPlay(D,c.picks,null,c.resumeAt)}
        else math=ver==='old'?await oldPlay(D,c.picks):await newPlay(D,c.picks);
        row[ver+'Math']=math;row[ver+'After']=store();
        if(ver==='new'){row.cls=D.querySelector('.gcard.quiz').className;row.newEnding=D.querySelector('.gcard.quiz .wr').dataset.ending;row.newPoints=D.querySelector('.gcard.quiz .wr').dataset.points;row.badge=(D.querySelector('.cc-badge')||{}).getAttribute&&D.querySelector('.cc-badge').getAttribute('aria-label')}
        const items=c.items;row[ver+'Practice']=ver==='old'?await oldPractice(D,items):await newPractice(D,items);await sleep(200);row[ver+'AfterPractice']=store();
        if(ver==='new'){D=await open(ver,c.date);await sleep(300);const r=D.querySelector('.gcard.quiz .wr');row.reopen={ending:r.dataset.ending,head:(r.querySelector('.w-fin h2')||{}).textContent,text:r.innerText};row.newAfterReopen=store()}
        row[ver+'Errs']=(F.contentWindow.__wpErrs||[]).slice(0,5)}
      catch(e){row[ver+'Crash']=String(e&&e.stack||e)}}
    out.push(row)}
  if(F)F.remove();const p=document.createElement('pre');p.id='audit';p.textContent=JSON.stringify(out);document.body.append(p);fetch('done')}
(()=>run().catch(e=>{const p=document.createElement('pre');p.id='audit';p.textContent=JSON.stringify({crash:String(e&&e.stack||e)});document.body.append(p);fetch('done')}))();
})();
