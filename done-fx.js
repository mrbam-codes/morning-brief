/* done-fx.js: what plays when a card is marked Done (plan 2a, chosen on 10 Nov 2026).
   Three animations take turns: Event Horizon, Decrypt and Laser Chase. Laser Chase stars
   Kimchi and Charlee, drawn in the Sticker style (never photos).
   Ported from the approved mock-up (done-animations.html, kept outside this repository).
   API: DoneFX.play(card, chip, colour, onChipShow, onFinish) returns true if it plays.
   It returns false under reduced motion or with no canvas, and the page files the card instantly.
   Every animation has a guaranteed end: a timer files the card even if frames stall, and the
   card is put back exactly as it was (text, transforms, visibility) so "put back" still works. */
(function(){
'use strict';
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ORDER=['horizon','decrypt','laser'];
let turn=Math.floor(Math.random()*ORDER.length),busy=null,fxc=null,x=null,W=0,H=0;
const el=(t,c,s)=>{const e=document.createElement(t);if(c)e.className=c;if(s!=null)e.textContent=s;return e};
function canvas(){if(!fxc){fxc=document.createElement('canvas');fxc.id='donefx';fxc.setAttribute('aria-hidden','true');
    fxc.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:70';document.body.append(fxc);x=fxc.getContext('2d')}
  if(!x)return false;const d=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;fxc.width=W*d;fxc.height=H*d;x.setTransform(d,0,0,d,0,0);return true}
(function style(){const s=document.createElement('style');s.textContent=".cd.glitch h3,.cd.glitch p{text-shadow:2px 0 #ff2e6e,-2px 0 #16b8f0;font-family:'IBM Plex Mono',ui-monospace,monospace}.strips{position:fixed;pointer-events:none;z-index:69}.chip.pop{animation:dfxpop .4s cubic-bezier(.2,1.6,.4,1)}@keyframes dfxpop{from{transform:scale(1.7);filter:brightness(2.4)}to{transform:none;filter:none}}";document.head.append(s)})();

/*SHARED*/
const clear=()=>x.clearRect(0,0,W,H);
const ease=u=>u*u*(3-2*u);
function ring(c,u,col){if(u<0||u>1)return;x.save();x.globalCompositeOperation='lighter';x.globalAlpha=1-u;x.strokeStyle=col;x.lineWidth=3*(1-u)+.6;x.beginPath();x.arc(c.x,c.y,8+u*46,0,7);x.stroke();x.restore()}
function streak(a,b,u,col){if(u<0||u>1.25)return;const h=Math.min(1,u),tl=Math.max(0,u-.35),L=(p,k)=>p[0]+(p[1]-p[0])*k;
  x.save();x.globalCompositeOperation='lighter';x.lineCap='round';x.shadowColor=col;x.shadowBlur=18;x.strokeStyle=col;x.lineWidth=5;x.beginPath();x.moveTo(L([a.x,b.x],tl),L([a.y,b.y],tl));x.lineTo(L([a.x,b.x],h),L([a.y,b.y],h));x.stroke();
  x.strokeStyle='#fff';x.lineWidth=2;x.stroke();x.restore()}

/*CATS*/
const ART='sticker';/* Sticker style, chosen on 10 Nov 2026 */
const PAL={sticker:{K:{body:'#f3efe8',pt:'#7b7f99',wh:'#ffffff',eye:'#4fc3ff'},C:{body:'#9a6336',pt:'#2b1a10',wh:'#fff6e6',eye:'#b6ff5c'}}
           };
const cl=v=>Math.max(0,Math.min(1,v));
function spline(pts,u){const m=pts.length-1,s=Math.max(0,Math.min(.9999,u))*m,i=Math.floor(s),f=s-i,p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(m,i+2)];
  const cr=k=>.5*(2*p1[k]+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f*f+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f*f*f);return[cr(0),cr(1)]}
/* k: 'K' Kimchi or 'C' Charlee. X,Y: where the feet stand. o: pose sit|run|flop|hang, flip, ph, eyes open|half|closed, sw, a */
function drawCat(g,k,X,Y,s,o){o=o||{};const neon=ART==='neon',p=PAL[ART][k],INK='#160a2c',DARK='#0b0620',big=k==='C';
  g.save();g.translate(X,Y);g.scale(o.flip?-s:s,s);g.lineJoin='round';g.lineCap='round';g.globalAlpha=o.a==null?1:o.a;
  if(neon){g.shadowColor=p.body;g.shadowBlur=7}
  const F=col=>{if(neon){g.fillStyle=DARK;g.fill();g.strokeStyle=col;g.lineWidth=1.4;g.stroke()}else{g.fillStyle=col;g.fill();g.strokeStyle=INK;g.lineWidth=.9;g.stroke()}};
  const E=(x0,y0,rx,ry,col,rot)=>{g.beginPath();g.ellipse(x0,y0,rx,ry,rot||0,0,7);F(col)};
  const tail=(x0,y0,cx,cy,x1,y1)=>{const w=big?12:6.5;for(const[lw,col]of[[w+2.4,neon?p.pt:INK],[w,neon?DARK:(big?p.body:p.pt)]]){g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(cx,cy,x1,y1);g.strokeStyle=col;g.lineWidth=lw;g.stroke()}
    if(big&&!neon){g.strokeStyle=p.pt;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x1+.1,y1+.1);g.stroke()}};
  const leg=(x0,y0,len,an)=>{g.save();g.translate(x0,y0);g.rotate(an);g.beginPath();g.rect(-3.2,0,6.4,len);F(big?p.body:p.pt);E(0,len,4.2,3,p.wh);g.restore()};
  const head=(hx,hy,eyes,tilt)=>{g.save();g.translate(hx,hy);g.rotate(tilt||0);const eh=big?22:21.5;
    for(const q of[-1,1]){g.beginPath();g.moveTo(q*12.5,-3);g.lineTo(q*10.5,-eh);g.lineTo(q*2,-10);g.closePath();F(big?p.body:p.pt);if(big){g.beginPath();g.moveTo(q*10.5,-eh);g.lineTo(q*11.2,-eh+6);g.lineTo(q*7.8,-eh+4);g.closePath();g.fillStyle=p.pt;g.fill();g.strokeStyle=p.pt;g.lineWidth=1.2;g.beginPath();g.moveTo(q*10.5,-eh);g.lineTo(q*11.6,-eh-4.5);g.stroke()}}
    if(big)for(const q of[-1,1]){g.beginPath();g.moveTo(q*13,-4);g.lineTo(q*22.5,3.5);g.lineTo(q*16.5,5);g.lineTo(q*20.5,10.5);g.lineTo(q*10,11);g.closePath();F(p.body)}
    E(0,0,big?17:16.6,big?13.5:13.2,p.body);
    if(big){E(0,7.6,6.4,4.6,p.wh);g.strokeStyle=p.pt;g.lineWidth=1.5;g.beginPath();for(const i of[-3.4,0,3.4]){g.moveTo(i,-12.6);g.lineTo(i*1.25,-8)}for(const q of[-1,1]){g.moveTo(q*16.2,-3.4);g.lineTo(q*12.6,-3);g.moveTo(q*16.4,-.4);g.lineTo(q*12.8,-.6)}g.stroke()}
    else{E(0,.9,13.2,11.3,p.pt);g.save();g.shadowBlur=0;g.globalAlpha*=.35;g.fillStyle=INK;g.beginPath();g.ellipse(0,5.4,5.2,4.2,0,0,7);g.fill();g.restore()}
    const lid=big?p.pt:p.body;
    for(const q of[-1,1]){const ex=q*6.4,ey=1.2;g.save();g.shadowColor=p.eye;g.shadowBlur=6;
      if(eyes==='closed'){g.strokeStyle=lid;g.lineWidth=1.3;g.lineWidth=1.5;g.beginPath();g.arc(ex,ey+2,3.3,1.18*Math.PI,1.82*Math.PI);g.stroke()}
      else if(eyes==='half'){g.fillStyle=p.eye;g.beginPath();g.ellipse(ex,ey,4.3,4.2,0,0,Math.PI);g.fill();g.shadowBlur=0;g.fillStyle=INK;g.beginPath();g.ellipse(ex,ey,2.6,3.1,0,0,Math.PI);g.fill();g.strokeStyle=lid;g.lineWidth=1.6;g.beginPath();g.moveTo(ex-4.6,ey);g.lineTo(ex+4.6,ey);g.stroke()}
      else{g.fillStyle=p.eye;g.beginPath();g.ellipse(ex,ey,4.7,3.8,-q*.24,0,7);g.fill();g.shadowBlur=0;g.strokeStyle=INK;g.lineWidth=.8;g.stroke();g.fillStyle=INK;g.beginPath();g.ellipse(ex,ey,1.9,3.3,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(ex-1.5,ey-1.3,1.15,0,7);g.fill();if(big){g.strokeStyle=INK;g.lineWidth=1;g.beginPath();g.moveTo(ex+q*4.3,ey-1.4);g.lineTo(ex+q*6.6,ey-3.2);g.stroke()}}
      g.restore()}
    g.fillStyle=big?'#e98a96':'#8d6f86';g.beginPath();g.moveTo(-1.4,5.6);g.lineTo(1.4,5.6);g.lineTo(0,7.1);g.closePath();g.fill();{g.save();g.shadowBlur=0;g.strokeStyle=neon?p.pt:(big?INK:p.body);g.lineWidth=.8;g.beginPath();g.moveTo(0,7.1);g.quadraticCurveTo(-1.2,9.6,-3.2,8.3);g.moveTo(0,7.1);g.quadraticCurveTo(1.2,9.6,3.2,8.3);g.stroke();g.restore()}
    g.save();g.shadowBlur=0;g.globalAlpha*=.85;g.strokeStyle=p.wh;g.lineWidth=.7;g.beginPath();for(const q of[-1,1])for(const j of(big?[-1,0,1]:[-.6,.6])){g.moveTo(q*7,8);g.lineTo(q*(big?26:21),7+j*4.2)}g.stroke();g.restore();
    g.restore()};
  const ruff=(cx,cy,rx,ry,col)=>{g.beginPath();for(let i=0;i<=14;i++){const a=Math.PI*i/14,k=i%2?1.2:.9;g.lineTo(cx+rx*k*Math.cos(a),cy+ry*k*Math.sin(a))}g.closePath();F(col||p.wh)};
  const ph=o.ph||0,wag=Math.sin(ph*.8)*4,pose=o.pose||'sit';
  if(pose==='run'){const sw=Math.sin(ph)*.75;g.translate(0,-Math.abs(Math.cos(ph))*2.5);
    tail(-20,-22,-38,-24,-40,(big?-50:-40)+wag);leg(-15,-13,12,-sw);leg(13,-13,12,sw);
    E(0,-21,big?25:23,big?15:12.5,p.body);if(big)ruff(17,-27,9,12);
    leg(-11,-13,12,sw);leg(17,-13,12,-sw);head(22,-36,o.eyes||'open')}
  else if(pose==='flop'){tail(-24,-8,-40,-14,-48,-4+wag*.3);E(0,-10,28,big?12:10,p.body);if(big)ruff(20,-13,9,8.5);E(27,-2.5,4.5,3,p.wh);E(15,-2,4.5,3,p.wh);head(23,-17,o.eyes||'closed',.18)}
  else if(pose==='hang'){tail(-22,-8,-32,-2,-29,13+wag*.5);leg(-14,-4,11,.12);E(0,-9,24,10,p.body);leg(11,-4,17,o.sw||0);head(23,-15,o.eyes||'open',.3)}
  else{const bh=big?44:40;tail(10,-5,big?38:32,-4,big?27:23,-bh+2+wag);E(-9.5,-7,7.5,7,p.body);E(9.5,-7,7.5,7,p.body);
    g.beginPath();g.moveTo(-12,-3);g.bezierCurveTo(-16,-14,-12,-bh+10,-7,-bh+4);g.lineTo(7,-bh+4);g.bezierCurveTo(12,-bh+10,16,-14,12,-3);g.closePath();F(p.body);
    leg(-4.4,-17,14.5,0);leg(4.4,-17,14.5,0);ruff(0,-bh+6,big?14.5:11.5,big?19:13,big?p.wh:p.body);head(0,-bh-8,o.eyes||'open')}
  g.restore()}
/*FX*/
const FX={
horizon(o){const{r,c,col,card}=o,O={x:r.cx,y:r.cy};
  const ps=Array.from({length:180},()=>({a:Math.random()*6.283,r:40+Math.random()*160,w:2+Math.random()*3,k:Math.random()}));
  card.animate([{transform:'none',filter:'none'},{transform:'rotate(40deg) scale(.82,.9)',offset:.35},{transform:'rotate(520deg) scale(0)',filter:'blur(2px) brightness(1.6)'}],{duration:820,delay:120,easing:'cubic-bezier(.55,0,.9,.35)',fill:'forwards'});
  return{dur:1.55,chipAt:1.2,doneAt:1.32,draw(t){clear();
    const grow=ease(Math.min(1,t/.3)),shut=t>.92?Math.max(0,1-(t-.92)/.1):1,R=60*grow*shut,life=Math.min(1,t/.95);
    if(R>.5){x.save();x.translate(O.x,O.y);x.rotate(-.35);x.scale(1,.42);x.globalCompositeOperation='lighter';x.globalAlpha=.85;
      for(const p of ps){const rr=R*.55+p.r*Math.pow(1-life,1.6)*grow,an=p.a+t*p.w*(1+(1-Math.min(1,rr/200))*3);x.fillStyle=p.k<.3?'#fff':col;x.beginPath();x.arc(Math.cos(an)*rr,Math.sin(an)*rr,1.6+p.k*1.8,0,7);x.fill()}
      x.restore();x.globalAlpha=1;x.globalCompositeOperation='source-over';
      x.shadowColor=col;x.shadowBlur=30;x.fillStyle='#000';x.beginPath();x.arc(O.x,O.y,R*.5,0,7);x.fill();x.shadowBlur=0;
      x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();x.arc(O.x,O.y,R*.5+1,0,7);x.stroke()}
    if(t>.95&&t<1.2){const u=(t-.95)/.25,g=x.createRadialGradient(O.x,O.y,0,O.x,O.y,24+u*170);g.addColorStop(0,'rgba(255,255,255,'+(1-u)+')');g.addColorStop(.4,col);g.addColorStop(1,'rgba(0,0,0,0)');x.save();x.globalCompositeOperation='lighter';x.globalAlpha=1-u;x.fillStyle=g;x.fillRect(0,0,W,H);x.restore()}
    streak(O,c,(t-.98)/.22,col);ring(c,(t-1.2)/.32,col)}}},

decrypt(o){const{r,c,col,card}=o,G='01<>/#$%&{}[]ABCDEF',O={x:r.cx,y:r.cy};
  const els=[...card.querySelectorAll('h3,p,.k span')],orig=els.map(e=>e.textContent);let made=false;const hex='0x'+(4096+Math.random()*60000|0).toString(16).toUpperCase();
  card.classList.add('glitch');o.undo=()=>{els.forEach((e,i)=>{e.textContent=orig[i]});card.classList.remove('glitch')};
  return{dur:1.5,chipAt:1.2,doneAt:1.32,draw(t){clear();
    if(t<.34){els.forEach((e,i)=>{const s=orig[i],cut=Math.floor(s.length*(1-t/.34));e.textContent=s.slice(0,cut)+[...s.slice(cut)].map(ch=>ch===' '?' ':G[Math.random()*G.length|0]).join('')})}
    else if(!made){made=true;const box=el('div','strips'),N=11;box.setAttribute('aria-hidden','true');box.style.cssText='left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px';o.box=box;
      for(let i=0;i<N;i++){const s=card.cloneNode(true);s.classList.remove('in','glitch','flash');s.style.cssText+=';position:absolute;left:0;top:0;width:100%;height:100%;margin:0;visibility:visible';s.style.clipPath='inset('+(i*100/N)+'% 0 '+(100-(i+1)*100/N)+'% 0)';const j=m=>'translateX('+(Math.random()-.5)*m+'px)';
        s.animate([{transform:'none'},{transform:j(70),offset:.3},{transform:j(150),filter:'hue-rotate(90deg)',offset:.6},{transform:j(30)}],{duration:380,easing:'steps(6,end)',fill:'forwards'});box.append(s)}
      document.body.append(box);card.style.visibility='hidden';
      box.animate([{transform:'scale(1,1)',filter:'brightness(1)'},{transform:'scale(1,.012)',filter:'brightness(4)',offset:.6},{transform:'scale(0,.012)',filter:'brightness(6)'}],{duration:330,delay:400,easing:'cubic-bezier(.7,0,.3,1)',fill:'forwards'})}
    if(t>.8&&t<1.2&&(t*18|0)%3){x.textAlign='center';x.font='600 12px "IBM Plex Mono",monospace';x.fillStyle=col;x.fillText('FILED · '+hex,r.cx,r.cy-22)}
    if(t>1.02&&t<1.12){x.fillStyle='#fff';x.beginPath();x.arc(O.x,O.y,3,0,7);x.fill()}
    streak(O,c,(t-1.04)/.18,col);ring(c,(t-1.2)/.3,col)}}},

laser(o){const{r,c,col,card}=o,tr=[];
  const pts=[[r.cx,r.cy],[r.x+r.w-18,r.y+26],[r.x+22,r.y+r.h*.45],[r.x+r.w-30,r.y+r.h-24],[r.x+40,r.y+r.h+10],[c.x,c.y]];
  card.animate([{transform:'none',filter:'none'},{transform:'scale(.02)',filter:'brightness(3)'}],{duration:200,easing:'ease-in',fill:'forwards'});o.timer=setTimeout(()=>{card.style.visibility='hidden'},200);
  const feet=u=>{const p=spline(pts,u),q=spline(pts,Math.min(1,u+.02));return{x:p[0],y:p[1]+16,fl:q[0]<p[0]}};
  return{dur:1.9,chipAt:1.2,doneAt:1.32,draw(t){clear();const fade=cl((1.9-t)/.3),u=cl((t-.2)/1),d=spline(pts,u),on=t>.18&&u<1;
    if(on){tr.push(d);if(tr.length>14)tr.shift()}else tr.shift();
    x.save();x.globalCompositeOperation='lighter';x.lineCap='round';x.shadowColor=col;x.shadowBlur=14;x.strokeStyle=col;
    for(let i=1;i<tr.length;i++){x.globalAlpha=i/tr.length*.8;x.lineWidth=1+i/tr.length*4;x.beginPath();x.moveTo(tr[i-1][0],tr[i-1][1]);x.lineTo(tr[i][0],tr[i][1]);x.stroke()}
    if(on){x.globalAlpha=1;x.fillStyle=col;x.beginPath();x.arc(d[0],d[1],7,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(d[0],d[1],3.5,0,7);x.fill()}x.restore();
    const uc=Math.min(.55,cl((t-.42)/1.5)),fc=feet(uc),stop=uc>=.55;
    const uk=cl((t-.34)/1),fk=feet(uk),land=uk>=1;
    drawCat(x,'K',land?Math.min(W-26,c.x+34):fk.x,land?Math.min(H-4,c.y+20):fk.y,1.2,{pose:land?'sit':'run',flip:fk.fl,ph:t*22,a:fade});
    /* Charlee runs her own lane, below and to the left of Kimchi, and is drawn last so neither cat hides the other */
    drawCat(x,'C',Math.max(64,Math.min(W-64,fc.x-56)),Math.min(H-8,fc.y+46),1.25,{pose:stop?'sit':'run',flip:!stop&&fc.fl,ph:t*16,a:fade});
    ring(c,(t-1.2)/.4,col)}}},
};

function play(card,chip,col,onChip,onFinish){
  if(REDUCE||busy||!card||!chip||!card.animate||!canvas())return false;
  const name=DoneFX.next||ORDER[turn++%ORDER.length];DoneFX.next=null;DoneFX.last=name;
  const a=card.getBoundingClientRect(),b=chip.getBoundingClientRect();
  const r={x:a.left,y:a.top,w:a.width,h:a.height};r.cx=r.x+r.w/2;r.cy=r.y+r.h/2;
  const o={card,r,col,n:1,c:{x:b.left+b.width/2,y:b.top+b.height/2}};
  let e;try{e=FX[name](o)}catch(err){return false}
  busy=e;let shown=false,ended=false;const t0=performance.now();
  const undo=()=>{clearTimeout(o.timer);try{o.undo&&o.undo()}catch(err){}if(o.box)o.box.remove();(card.getAnimations?card.getAnimations():[]).forEach(an=>an.cancel());card.style.visibility='';card.style.clipPath=''};
  const show=()=>{if(!shown){shown=true;try{onChip&&onChip()}catch(err){}}};
  const end=()=>{if(ended)return;ended=true;show();undo();try{onFinish&&onFinish()}catch(err){}};
  setTimeout(end,e.doneAt*1000+700);            /* guaranteed end state if frames stall */
  const tick=now=>{if(busy!==e)return;const t=(now-t0)/1000;x.globalAlpha=1;x.shadowBlur=0;x.globalCompositeOperation='source-over';
    try{e.draw(t)}catch(err){}
    if(t>=e.chipAt)show();if(t>=e.doneAt)end();
    if(t<e.dur)requestAnimationFrame(tick);else{x.globalCompositeOperation='source-over';clear();busy=null}};
  setTimeout(()=>{if(busy===e&&performance.now()-t0>e.dur*1000+1500){clear();busy=null}},e.dur*1000+1600);
  requestAnimationFrame(tick);return true}

window.DoneFX={play,drawCat,ORDER,next:null,last:null};
})();
