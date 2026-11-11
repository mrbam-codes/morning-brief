"""Progress code test (plan 14). Run from the repository: python3 tests/test_progress.py

Runs keep.js and scorecard.js in Node and checks the Move my progress code:
- a full saved state round-trips exactly, and a fresh one does too;
- refused, with a plain message: empty, rubbish, another brief's code, a cut-short or changed code,
  a code far too long, and codes whose check is good but whose contents are not saved progress
  (wrong types, missing parts, a too-long name, an unknown pilot, a too-big state);
- a name holding HTML is only ever text (the state is data, never run or put on the page as HTML).
Prints PROGRESS OK or the misses.
"""
import json, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
misses = []


def need(ok, msg):
    print(("ok    " if ok else "MISS  ") + msg)
    if not ok:
        misses.append(msg)


JS = r"""
const fs=require('fs');globalThis.window=globalThis;globalThis.document={readyState:'loading'};globalThis.addEventListener=()=>{};
globalThis.matchMedia=()=>({matches:false});
eval(fs.readFileSync(process.argv[1],'utf8'));eval(fs.readFileSync(process.argv[2],'utf8'));
const C=MBScores.code;
const day=(s,t,p)=>({score:s,total:t,points:p,at:1762800000000});
const FULL={days:{'2026-11-09':day(4,5,60),'2026-11-10':day(5,5,70),'2026-11-10-interview':day(1,1,15)},tags:{AI:[3,4],Tech:[2,3],Cyber:[4,4]},
  lessons:{'1':{tag:'AI',c:1,t:1}},course:{'12':{tag:'Tech',c:0,t:1}},points:145,badges:{first:'2026-11-09'},
  review:[{q:'Which one?',options:['a','b','c','d'],answer:2,tag:'AI',id:'2026-11-10-1',course:true,box:0,due:'2026-11-11'}],
  prog:{'2026-11-11':[1,0]},sound:true,v2:1,bonus:15,read:{'2026-11-10':{news:['s1']}},kimchi:{'2026-11-10':1762800000000},
  name:'Sam',pilot:'charlee',cleared:true,interviewWin:true,rescored:1,note:'Ünïcødé ✓ £5'};
const FRESH={days:{},tags:{AI:[0,0],Tech:[0,0],Cyber:[0,0]},lessons:{},points:0,badges:{},review:[],prog:{},sound:true};
const bad=async(c)=>{try{await C.read(c);return 'accepted'}catch(e){return e.message}};
(async()=>{const r=[];
 const code=await C.make(FULL);
 r.push(['code starts with the brief prefix MB.1',/^MB\.1[zj]\./.test(code)]);
 const back=await C.read(code);r.push(['full state round-trips exactly',JSON.stringify(back.s)===JSON.stringify(FULL)]);
 r.push(['fresh state round-trips',JSON.stringify((await C.read(await C.make(FRESH))).s)===JSON.stringify(FRESH)]);
 r.push(['spaces and line breaks from a paste are ignored',JSON.stringify((await C.read('  '+code.slice(0,30)+'\n'+code.slice(30)+'\n')).s)===JSON.stringify(FULL)]);
 r.push(['the code is accepted by the Progress sheet restore too (same format)',JSON.stringify((await Keep.read('MB',code)).s)===JSON.stringify(FULL)]);
 const msgs=[];
 const refuse=async(name,c,re)=>{const m=await bad(c);msgs.push(m);r.push([name+' refused ('+m+')',m!=='accepted'&&(!re||re.test(m))])};
 await refuse('empty','',/Paste a progress code first/);
 await refuse('rubbish','hello there',/not a progress code/);
 await refuse('script text','<script>alert(1)</script>',/not a progress code/);
 await refuse('another brief\'s code',(await Keep.make('MEP',FULL)),/different brief/);
 await refuse('cut short',code.slice(0,-12)+code.slice(-8),/incomplete or changed/);
 const mid=code.length>>1;await refuse('one changed letter',code.slice(0,mid)+(code[mid]==='A'?'B':'A')+code.slice(mid+1),/incomplete or changed/);
 await refuse('far too long','MB.1z.'+'A'.repeat(70000)+'.0000000',/too long/);
 const shape=async(name,s)=>refuse(name,await Keep.make('MB',s),/does not hold progress/);
 const mod=f=>{const s=JSON.parse(JSON.stringify(FULL));f(s);return s};
 await shape('not an object',[1,2,3]);
 await shape('no days',mod(s=>delete s.days));
 await shape('no tags',mod(s=>delete s.tags));
 await shape('a missing topic',mod(s=>delete s.tags.Cyber));
 await shape('score as text',mod(s=>s.days['2026-11-10'].score='5'));
 await shape('score above total',mod(s=>s.days['2026-11-10'].score=9));
 await shape('negative points',mod(s=>s.points=-5));
 await shape('points as text',mod(s=>s.points='lots'));
 await shape('topic count not a pair',mod(s=>s.tags.AI=[1,2,3]));
 await shape('review item without options',mod(s=>delete s.review[0].options));
 await shape('review answer out of range',mod(s=>s.review[0].answer=7));
 await shape('badges as a list',mod(s=>s.badges=['first']));
 await shape('sound as text',mod(s=>s.sound='yes'));
 await shape('name too long',mod(s=>s.name='x'.repeat(40)));
 await shape('unknown pilot',mod(s=>s.pilot='dog'));
 await shape('state over the size limit',mod(s=>s.read={big:'x'.repeat(1100000)}));
 r.push(['every refusal is a plain sentence',msgs.every(m=>/^[A-Z][^<>{}]*\.$/.test(m))]);
 const html=mod(s=>s.name='<img src=x>');r.push(['a name holding HTML is accepted as data (tests/test_card.py checks the card shows it as text)',C.valid(html)]);
 console.log(JSON.stringify(r))})().catch(e=>{console.log(JSON.stringify([['crashed: '+e.stack,false]]))});
"""

node = shutil.which("node")
if not node:
    need(False, "Node is needed for the progress code test")
else:
    out = subprocess.run([node, "-e", JS, str(ROOT / "keep.js"), str(ROOT / "scorecard.js")], capture_output=True, text=True, timeout=120)
    try:
        for name, ok in json.loads(out.stdout.strip().splitlines()[-1]):
            need(ok, "progress code: " + name)
    except Exception:
        need(False, "progress code test ran: " + (out.stdout + out.stderr)[-600:])

sc = (ROOT / "scorecard.js").read_text(encoding="utf-8")
body = sc[sc.index("function moveBox()"):sc.index("window.MBScores =")]
need("innerHTML" not in body and "eval(" not in sc and "new Function" not in sc, "Move my progress builds its controls with text only: no innerHTML, no eval")
need("navigator.clipboard" in body and "out.select()" in body, "Copy code uses the clipboard inside the click, with a selectable box as the fallback")
idx = (ROOT / "index.html").read_text(encoding="utf-8")
need(idx.index("MBScores.moveBox()") < idx.index("drawQuiz();m2.append(qc);"), "Move my progress sits above the quiz")

print("PROGRESS OK" if not misses else "MISSES: " + str(len(misses)))
sys.exit(1 if misses else 0)
