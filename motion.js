/* The 13 opening animations. startHero(canvas,brief) picks one per day and feeds it that day's stories. */
(function(){
const COL={AI:[255,46,110],Tech:[255,230,0],Cyber:[124,77,255]};
const rgb=(c,a=1)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const INK='#0b0620',TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let STORIES=[['AI','Today']],DAY='',ISO='',seed=20261107;
const N=()=>STORIES.length,TAGC=t=>STORIES.filter(s=>s[0]===t).length;
const col=i=>COL[STORIES[i%STORIES.length][0]];
const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const pickTag=()=>STORIES[Math.floor(rnd()*STORIES.length)][0];
const DESIGNS=[
{name:'Ink Tide',world:'Living simulation',note:'Three inks share the frame in proportion to the day. A cyber-heavy morning runs violet.',make(x,W,H){
  const P=[...Array(Math.round(W*H/70))].map(()=>({x:rnd()*W,y:rnd()*H,c:COL[pickTag()],l:rnd()*160}));
  x.fillStyle=INK;x.fillRect(0,0,W,H);
  return t=>{
    x.globalCompositeOperation='source-over';x.fillStyle='rgba(11,6,32,.09)';x.fillRect(0,0,W,H);
    x.globalCompositeOperation='lighter';x.lineWidth=1.7;
    P.forEach(p=>{const a=Math.sin(p.x*.0075+t*.14)*2.1+Math.cos(p.y*.0085-t*.1)*2.1+Math.sin((p.x+p.y)*.0035+t*.06)*2.4;
      const nx=p.x+Math.cos(a)*1.25,ny=p.y+Math.sin(a)*1.25;
      x.strokeStyle=rgb(p.c,.62);x.beginPath();x.moveTo(p.x,p.y);x.lineTo(nx,ny);x.stroke();
      p.x=nx;p.y=ny;if(--p.l<0||nx<0||ny<0||nx>W||ny>H){p.x=rnd()*W;p.y=rnd()*H;p.l=90+rnd()*150}});
    x.globalCompositeOperation='source-over'}}},
{name:'Swarm Mind',world:'Living simulation',note:'Every story leads its own flock. The bigger the day, the busier the sky.',make(x,W,H){
  const L=STORIES.map((s,i)=>({i,a:rnd()*TAU,b:rnd()*TAU,x:W/2,y:H/2,c:col(i)}));
  const B=[];L.forEach(l=>{for(let n=0;n<30;n++)B.push({l,x:rnd()*W,y:rnd()*H,vx:0,vy:0})});
  return t=>{
    x.fillStyle='rgba(11,6,32,.26)';x.fillRect(0,0,W,H);
    L.forEach((l,k)=>{l.x=W/2+Math.sin(t*.32+l.a+k)*W*.4;l.y=H*.42+Math.cos(t*.25+l.b)*H*.36;
      const g=x.createRadialGradient(l.x,l.y,0,l.x,l.y,34);g.addColorStop(0,rgb(l.c,.5));g.addColorStop(1,rgb(l.c,0));x.fillStyle=g;x.fillRect(l.x-34,l.y-34,68,68)});
    B.forEach((b,i)=>{let sx=0,sy=0;for(let j=0;j<B.length;j+=5){const o=B[(i+j)%B.length],dx=b.x-o.x,dy=b.y-o.y,d=dx*dx+dy*dy;if(d>1&&d<420){sx+=dx/d;sy+=dy/d}}
      b.vx+=(b.l.x-b.x)*.0016+sx*.55+Math.sin(t+i)*.012;b.vy+=(b.l.y-b.y)*.0016+sy*.55+Math.cos(t*1.2+i)*.012;
      const sp=Math.hypot(b.vx,b.vy)||1,m=Math.min(sp,3.1);b.vx=b.vx/sp*m;b.vy=b.vy/sp*m;b.x+=b.vx;b.y+=b.vy;
      const a=Math.atan2(b.vy,b.vx);x.fillStyle=rgb(b.l.c,.95);x.beginPath();x.moveTo(b.x+Math.cos(a)*5.5,b.y+Math.sin(a)*5.5);x.lineTo(b.x+Math.cos(a+2.5)*3.2,b.y+Math.sin(a+2.5)*3.2);x.lineTo(b.x+Math.cos(a-2.5)*3.2,b.y+Math.sin(a-2.5)*3.2);x.fill()})}}},
{name:'Cell Bloom',world:'Living simulation',note:'One living cell per story. They swell, split and merge with neighbours on the same topic.',make(x,W,H){
  const w=96,h=120,o=document.createElement('canvas');o.width=w;o.height=h;const c=o.getContext('2d'),im=c.createImageData(w,h);
  const C=STORIES.map((s,i)=>({cx:.5+.34*Math.cos(i/7*TAU),cy:.43+.3*Math.sin(i/7*TAU),c:col(i),p:rnd()*TAU}));
  x.imageSmoothingEnabled=true;
  return t=>{
    const B=[];C.forEach((k,i)=>{const s=(Math.sin(t*.42+k.p)+1)/2,cx=k.cx*w+Math.sin(t*.2+i)*8,cy=k.cy*h+Math.cos(t*.17+i)*8,r=4.2+s*2.6;
      for(let n=0;n<3;n++){const a=n/3*TAU+t*.3+i;B.push([cx+Math.cos(a)*s*12,cy+Math.sin(a)*s*12,r-s*.8,k.c])}});
    let q=0;for(let py=0;py<h;py++)for(let px=0;px<w;px++){let f=0,R=0,G=0,Bl=0;
      for(let n=0;n<B.length;n++){const b=B[n],dx=px-b[0],dy=py-b[1],v=b[2]*b[2]/(dx*dx+dy*dy+.5);f+=v;R+=b[3][0]*v;G+=b[3][1]*v;Bl+=b[3][2]*v}
      R/=f;G/=f;Bl/=f;const rim=f>1&&f<1.22?1.6:f>=1.22?clamp(.62+(f-1.22)*.12,.62,1):clamp(f*f*.34,0,.34);
      const d=im.data;d[q++]=clamp(R*rim+(f<1?11*(1-rim):0),0,255);d[q++]=clamp(G*rim+(f<1?6*(1-rim):0),0,255);d[q++]=clamp(Bl*rim+(f<1?32*(1-rim):0),0,255);d[q++]=255}
    c.putImageData(im,0,0);x.drawImage(o,0,0,W,H)}}},
{name:'Signal Globe',world:'3D',note:'Stories arc around a turning world, with one pulse for each story and the colour showing the topic.',make(x,W,H){
  const P=[],n=5200;for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=i*2.39996,lat=Math.asin(y),lon=a%TAU;
    if(Math.sin(lat*3.1+1.2)+Math.cos(lon*2+Math.sin(lat*4))+Math.sin(lon*5+lat*2)*.45>-.35)P.push([Math.cos(a)*r,y,Math.sin(a)*r])}
  const pt=()=>{const a=rnd()*TAU,y=rnd()*1.4-.7,r=Math.sqrt(1-y*y);return[Math.cos(a)*r,y,Math.sin(a)*r]};
  const A=STORIES.map((s,i)=>({a:pt(),b:pt(),c:col(i),o:i/7}));
  const R=Math.min(W*.43,H*.38),cx=W/2,cy=H*.4;
  return t=>{
    x.fillStyle=INK;x.fillRect(0,0,W,H);
    const ry=t*.2,cs=Math.cos(ry),sn=Math.sin(ry),tl=.32,ct=Math.cos(tl),st=Math.sin(tl);
    const pr=p=>{const X=p[0]*cs+p[2]*sn,Z=-p[0]*sn+p[2]*cs,Y=p[1]*ct-Z*st,Z2=p[1]*st+Z*ct;return[cx+X*R,cy-Y*R,Z2]};
    const g=x.createRadialGradient(cx,cy,R*.7,cx,cy,R*1.38);g.addColorStop(0,'rgba(124,77,255,.22)');g.addColorStop(1,'rgba(124,77,255,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
    P.forEach(p=>{const q=pr(p);if(q[2]<-.02)return;x.fillStyle=`rgba(201,184,255,${.28+q[2]*.72})`;const s=1.2+q[2]*1.4;x.fillRect(q[0],q[1],s,s)});
    A.forEach(a=>{const lift=.3,pts=[];for(let i=0;i<=40;i++){const u=i/40,m=[0,1,2].map(k=>a.a[k]*(1-u)+a.b[k]*u),l=Math.hypot(...m)||1,h=1+Math.sin(u*Math.PI)*lift;pts.push(pr(m.map(v=>v/l*h)))}
      x.lineWidth=1.4;x.strokeStyle=rgb(a.c,.34);x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();
      const u=(t*.2+a.o)%1,head=Math.floor(u*40);x.lineWidth=2.6;x.strokeStyle=rgb(a.c,1);x.beginPath();for(let i=Math.max(0,head-6);i<=head;i++){const p=pts[i];i===Math.max(0,head-6)?x.moveTo(p[0],p[1]):x.lineTo(p[0],p[1])}x.stroke();
      const p=pts[head];x.fillStyle='#fff';x.beginPath();x.arc(p[0],p[1],2.8,0,TAU);x.fill()})}}},
{name:'Story Galaxy',world:'3D',note:'One spiral arm per topic, sized by that day\'s count. Each bright star is a story.',make(x,W,H){
  const T=[['AI',3],['Cyber',3],['Tech',1]],S=[];T.forEach((k,a)=>{const n=350+k[1]*560;for(let i=0;i<n;i++){const r=Math.pow(rnd(),.62),th=a/3*TAU+r*5.6+(rnd()-.5)*.62/(r+.34);S.push({r,th,y:(rnd()-.5)*.1*(1.15-r),c:COL[k[0]],s:rnd()})}});
  const K=STORIES.map((s,i)=>({r:.26+i*.1,th:i*2.1+.5,c:col(i)}));
  const R=W*.72,cx=W/2,cy=H*.38;
  return t=>{
    x.globalCompositeOperation='source-over';x.fillStyle='rgba(11,6,32,.5)';x.fillRect(0,0,W,H);x.globalCompositeOperation='lighter';
    const tl=.86+Math.sin(t*.12)*.18,ct=Math.cos(tl),st=Math.sin(tl);
    const pr=(r,th,y)=>{const X=Math.cos(th)*r,Z=Math.sin(th)*r,Y=y*ct-Z*st,Z2=y*st+Z*ct,f=1/(1.6-Z2*.5);return[cx+X*R*f,cy-Y*R*f,f]};
    S.forEach(p=>{const a=p.th+t*.17/(p.r+.26),q=pr(p.r,a,p.y),s=(.7+p.s*1.1)*q[2]*1.25;x.fillStyle=rgb(p.c,.58);x.fillRect(q[0],q[1],s,s)});
    const g=x.createRadialGradient(cx,cy,0,cx,cy,W*.26);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.25,'rgba(255,190,220,.28)');g.addColorStop(1,'rgba(124,77,255,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
    K.forEach((k,i)=>{const q=pr(k.r,k.th+t*.17/(k.r+.26),0),s=10+Math.sin(t*1.6+i)*3,gg=x.createRadialGradient(q[0],q[1],0,q[0],q[1],s*2.4);gg.addColorStop(0,'rgba(255,255,255,1)');gg.addColorStop(.28,rgb(k.c,.85));gg.addColorStop(1,rgb(k.c,0));x.fillStyle=gg;x.fillRect(q[0]-s*2.4,q[1]-s*2.4,s*4.8,s*4.8)});
    x.globalCompositeOperation='source-over'}}},
{name:'Headline Melt',world:'Giant type',note:'The day\'s lead headline forms in huge letters, then melts and pours away before reforming.',make(x,W,H){
  const o=document.createElement('canvas'),d=2;o.width=W*d;o.height=H*d;const c=o.getContext('2d');
  const draw=()=>{c.clearRect(0,0,o.width,o.height);c.fillStyle=rgb(COL.AI);c.textAlign='left';c.textBaseline='alphabetic';let y=H*.235*d;
    ['THE','AGENT','GOT OUT'].forEach(l=>{c.font=`400 100px Anton,Impact,sans-serif`;const s=100*(W-34)*d/c.measureText(l).width,z=Math.min(s,H*.27*d);c.font=`400 ${z}px Anton,Impact,sans-serif`;c.fillText(l,17*d,y);y+=z*1.03;if(l==='THE')c.fillStyle='#fff';if(l==='AGENT')c.fillStyle=rgb(COL.Tech)})};
  draw();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);
  const N=Math.ceil(W/2.5),D=[...Array(N)].map((_,i)=>.25+Math.pow(Math.abs(Math.sin(i*.37)*Math.cos(i*.113+1)),2.2)*1.55+rnd()*.14);
  return t=>{
    x.fillStyle=INK;x.fillRect(0,0,W,H);const ph=t%10,m=ph<2.4?0:ph<7?Math.pow((ph-2.4)/4.6,2.4):1-Math.pow((ph-7)/3,.5)*1;
    const melt=clamp(m,0,1);
    for(let i=0;i<N;i++){const px=i*2.5,dy=melt*D[i]*H*.9;x.drawImage(o,px*d,0,2.5*d+1,o.height,px,dy,2.6,H+dy*.55)}}}},
{name:'Neural Firestorm',world:'Machines and signals',note:'Each story fires into a network, and the signal spreads. More stories means a brighter storm.',make(x,W,H){
  const N=[...Array(84)].map(()=>({x:rnd()*W,y:rnd()*H*.86,e:[],f:0,c:[201,184,255]}));
  N.forEach((a,i)=>{N.map((b,j)=>[Math.hypot(a.x-b.x,a.y-b.y),j]).sort((p,q)=>p[0]-q[0]).slice(1,5).forEach(k=>a.e.push(k[1]))});
  let P=[],last=0,k=0;
  return (t,dt)=>{
    x.fillStyle='rgba(11,6,32,.3)';x.fillRect(0,0,W,H);
    if(t-last>.34){last=t;const n=Math.floor(rnd()*N.length);N[n].f=1;N[n].c=col(k);N[n].e.forEach(e=>P.push({a:n,b:e,u:0,c:col(k),g:0}));k++}
    x.lineWidth=.9;x.strokeStyle='rgba(124,77,255,.3)';x.beginPath();N.forEach(a=>a.e.forEach(e=>{x.moveTo(a.x,a.y);x.lineTo(N[e].x,N[e].y)}));x.stroke();
    const nx=[];P.forEach(p=>{p.u+=.045;const a=N[p.a],b=N[p.b];
      if(p.u>=1){b.f=1;b.c=p.c;if(p.g<6&&P.length+nx.length<220)b.e.forEach(e=>{if(e!==p.a&&rnd()<.62)nx.push({a:p.b,b:e,u:0,c:p.c,g:p.g+1})})}else{nx.push(p);
        x.lineWidth=2.6;x.strokeStyle=rgb(p.c,1);x.beginPath();const u0=Math.max(0,p.u-.28);x.moveTo(a.x+(b.x-a.x)*u0,a.y+(b.y-a.y)*u0);x.lineTo(a.x+(b.x-a.x)*p.u,a.y+(b.y-a.y)*p.u);x.stroke()}});P=nx;
    N.forEach(a=>{a.f*=.93;x.fillStyle=a.f>.05?rgb(a.c,.35+a.f*.65):'rgba(201,184,255,.42)';const r=2.2+a.f*8;x.beginPath();x.arc(a.x,a.y,r,0,TAU);x.fill()})}}},
{name:'Radar Room',world:'Machines and signals',note:'A control-room sweep finds the day\'s stories. Cyber stories show as red threats.',make(x,W,H){
  const RED=[255,59,59],cx=W/2,cy=H*.4,R=Math.min(W*.46,H*.37);
  const B=STORIES.map((s,i)=>({a:(i*2.4+.4)%TAU,r:.28+((i*37)%60)/100,c:s[0]==='Cyber'?RED:COL[s[0]],t:s[0],g:0,n:i+1}));
  return t=>{
    x.fillStyle=INK;x.fillRect(0,0,W,H);const sw=(t*.85)%TAU;
    x.strokeStyle='rgba(124,77,255,.42)';x.lineWidth=1;[.25,.5,.75,1].forEach(k=>{x.beginPath();x.arc(cx,cy,R*k,0,TAU);x.stroke()});
    for(let i=0;i<12;i++){const a=i/12*TAU;x.beginPath();x.moveTo(cx+Math.cos(a)*R*.05,cy+Math.sin(a)*R*.05);x.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);x.stroke()}
    for(let i=0;i<46;i++){const a0=sw-i*.028,a1=a0-.03;x.fillStyle=`rgba(22,184,240,${.34*(1-i/46)})`;x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,R,a1,a0);x.fill()}
    x.strokeStyle='#16b8f0';x.lineWidth=2;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(sw)*R,cy+Math.sin(sw)*R);x.stroke();
    B.forEach(b=>{let d=(sw-b.a)%TAU;if(d<0)d+=TAU;b.g=Math.max(0,1-d/5.2);const X=cx+Math.cos(b.a)*b.r*R,Y=cy+Math.sin(b.a)*b.r*R;
      x.fillStyle=rgb(b.c,.28+b.g*.72);x.beginPath();x.arc(X,Y,4+b.g*3,0,TAU);x.fill();
      x.strokeStyle=rgb(b.c,b.g*.75);x.lineWidth=1.3;x.beginPath();x.arc(X,Y,7+(1-b.g)*22,0,TAU);x.stroke();
      x.fillStyle=`rgba(255,255,255,${.3+b.g*.7})`;x.font='700 10px "Space Mono",monospace';x.fillText(b.t.toUpperCase()+' 0'+b.n,X+11,Y+3)});
    x.fillStyle='#16b8f0';x.font='700 11px "Space Mono",monospace';x.fillText('SCAN '+DAY,14,22);x.textAlign='right';x.fillText(STORIES.length+(STORIES.length===1?' CONTACT':' CONTACTS'),W-14,22);x.textAlign='left'}}},
{name:'Pixel Quest',world:'Retro game',note:'A small robot plays itself through a world built from the day. Each treasure is a story, in its topic colour.',make(x,W,H){
  const w=108,h=135,o=document.createElement('canvas');o.width=w;o.height=h;const c=o.getContext('2d');
  const BOT=['..1..1..','..1221..','.222222.','.2c22c2.','.222222.','..3333..','.333333.','.3.33.3.','..3..3..'];
  const pal={1:'#ffe600',2:'#fff',c:'#0b0620',3:'#16b8f0'};
  const put=(s,X,Y,alt)=>s.forEach((r,j)=>{let line=r;if(alt&&j===8)line='.3....3.';[...line].forEach((k,i)=>{if(k!=='.'){c.fillStyle=pal[k];c.fillRect(X+i,Y+j,1,1)}})});
  const ST=[...Array(40)].map(()=>[rnd()*w,rnd()*72,rnd()]);x.imageSmoothingEnabled=false;
  const G=78,gap=58;
  return t=>{
    const wx=t*30;c.fillStyle='#120a33';c.fillRect(0,0,w,h);
    ST.forEach(s=>{c.fillStyle=`rgba(255,255,255,${.25+s[2]*.6})`;c.fillRect((s[0]-wx*.06*(s[2]+.3)%w+w)%w,s[1],1,1)});
    c.fillStyle='#ff2e6e';c.fillRect(74,10,14,14);c.fillStyle='#120a33';c.fillRect(74,14,14,1);c.fillRect(74,18,14,2);
    for(let i=-2;i<w+18;i+=2){const px=i+wx*.2,hh=12+Math.floor(Math.abs(Math.sin(Math.floor(px/9)*1.7))*19);c.fillStyle='#2a1a6e';c.fillRect(i,G-hh,2,hh)}
    for(let i=-2;i<w+8;i+=2){const px=i+wx*.5,hh=7+Math.floor(Math.abs(Math.sin(Math.floor(px/14)*2.3))*11);c.fillStyle='#3d2a9a';c.fillRect(i,G-hh,2,hh)}
    for(let i=0;i<w;i++){const px=Math.floor(i+wx);c.fillStyle=(Math.floor(px/8)%2)?'#7c4dff':'#6239e0';c.fillRect(i,G,1,3);c.fillStyle='#1f1252';c.fillRect(i,G+3,1,h-G-3)}
    const hx=26,n0=Math.floor((wx+hx)/gap)-1;let hy=0,score=0;
    for(let n=n0;n<n0+5;n++){const ox=n*gap+30,sx=ox-wx,k=(n%N()+N())%N(),cc=rgb(col(k));
      c.fillStyle='#ffffff';for(let j=0;j<5;j++)c.fillRect(sx+j,G-1-j,9-j*2,1);
      const got=hx+4>sx+4;const bob=Math.sin(t*5+n)*1.2;
      if(!got){c.fillStyle=cc;c.fillRect(sx+1,G-27+bob,7,7);c.fillStyle='#fff';c.fillRect(sx+2,G-26+bob,2,2)}
      else if(hx-sx<30){const u=(hx-sx)/30;c.fillStyle=cc;for(let a=0;a<6;a++)c.fillRect(sx+4+Math.cos(a)*u*14,G-24-u*14+Math.sin(a)*u*12,1,1)}
      const d=(hx+4)-(sx+4);if(d>-17&&d<17){const u=(d+17)/34;hy=Math.max(hy,4*u*(1-u)*23)}}
    score=((Math.floor((wx+hx)/gap)%N())+N())%N()+1;
    put(BOT,hx,Math.round(G-9-hy),Math.floor(t*9)%2===0&&hy<1);
    x.drawImage(o,0,0,W,H);
    x.fillStyle='#fff';x.font='700 13px "Space Mono",monospace';x.fillText('STORIES '+score+'/'+N(),14,24);x.textAlign='right';x.fillText('LEVEL '+DAY,W-14,24);x.textAlign='left'}}},
{name:'Grid Runner',world:'Futuristic game',note:'A neon craft races towards a low sun and through a gate for every story of the day.',make(x,W,H){
  const hz=H*.42,ST=[...Array(90)].map(()=>[rnd()*W,rnd()*hz*.92,rnd()]);
  const gate=(z,c,i)=>{const f=1/(z*7+.16),y=hz+(H*.92-hz)*f,wd=W*.6*f,ht=H*.33*f,cx=W/2+Math.sin(i*1.3)*W*.14*f;x.lineWidth=Math.max(1,6*f);x.strokeStyle=rgb(c,clamp(1.2-z,0,1));x.strokeRect(cx-wd,y-ht,wd*2,ht);x.lineWidth=Math.max(1,2*f);x.strokeStyle='rgba(255,255,255,'+clamp(1-z,0,.9)+')';x.strokeRect(cx-wd,y-ht,wd*2,ht)};
  return t=>{
    const sky=x.createLinearGradient(0,0,0,hz);sky.addColorStop(0,'#0b0620');sky.addColorStop(1,'#3a0f5e');x.fillStyle=sky;x.fillRect(0,0,W,hz);
    ST.forEach(s=>{x.fillStyle=`rgba(255,255,255,${.3+s[2]*.7*Math.abs(Math.sin(t+s[0]))})`;x.fillRect(s[0],s[1],1.4,1.4)});
    const r=W*.24,sx=W/2,sy=hz-r*.34,g=x.createLinearGradient(0,sy-r,0,sy+r);g.addColorStop(0,'#ffe600');g.addColorStop(.6,'#ff2e6e');g.addColorStop(1,'#7c4dff');x.fillStyle=g;x.beginPath();x.arc(sx,sy,r,0,TAU);x.fill();
    x.fillStyle='#3a0f5e';for(let i=0;i<6;i++){const yy=sy-r*.05+i*r*.19;x.fillRect(sx-r,yy,r*2,2+i*1.3)}
    x.fillStyle='#0b0620';x.fillRect(0,hz,W,H-hz);
    x.lineWidth=1.2;x.strokeStyle='rgba(22,184,240,.8)';x.beginPath();for(let i=-11;i<=11;i++){x.moveTo(W/2+i*W*.045,hz);x.lineTo(W/2+i*W*.55,H)}x.stroke();
    for(let i=0;i<14;i++){const u=(i+(t*1.5)%1)/14,y=hz+(H-hz)*u*u;x.strokeStyle=`rgba(22,184,240,${clamp(u*1.5,.08,.8)})`;x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke()}
    const G=[];for(let i=0;i<N();i++)G.push({z:1-((t*.13+i/N())%1),i});G.sort((a,b)=>b.z-a.z).forEach(q=>{if(q.z>.04)gate(q.z,col(q.i),q.i)});
    const cx=W/2+Math.sin(t*.8)*W*.13,cy=H*.66+Math.sin(t*1.7)*5,tilt=Math.cos(t*.8)*.26;
    x.save();x.translate(cx,cy);x.rotate(tilt);
    x.fillStyle='rgba(255,46,110,.9)';x.beginPath();x.moveTo(-9,10);x.lineTo(0,24+Math.sin(t*22)*7);x.lineTo(9,10);x.fill();
    x.fillStyle='#fff';x.beginPath();x.moveTo(0,-20);x.lineTo(30,12);x.lineTo(0,5);x.lineTo(-30,12);x.closePath();x.fill();
    x.fillStyle='#16b8f0';x.beginPath();x.moveTo(0,-11);x.lineTo(6,2);x.lineTo(-6,2);x.fill();x.restore()}}}
];

const NEW=[
{name:'Orbital Command',world:'Space mission control',note:'Every story orbits as a satellite. Cyber stories flash red warnings and draw a tracking line.',make(x,W,H){
  const ST=[...Array(150)].map(()=>[rnd()*W,rnd()*H,rnd()]),pl={x:W*.5,y:H*.42,r:W*.2};
  const S=STORIES.map((s,i)=>({a:rnd()*TAU,rx:W*(.27+i*.033),ry:H*(.07+i*.024),sp:.62-i*.055,c:col(i),t:s[0],n:i+1}));
  const tilt=-.42,pos=s=>{const X=Math.cos(s.a)*s.rx,Y=Math.sin(s.a)*s.ry;return[pl.x+X*Math.cos(tilt)-Y*Math.sin(tilt),pl.y+X*Math.sin(tilt)+Y*Math.cos(tilt),Math.sin(s.a)]};
  return (t,dt)=>{
    x.fillStyle=INK;x.fillRect(0,0,W,H);ST.forEach(s=>{x.fillStyle=`rgba(255,255,255,${.2+s[2]*.7})`;x.fillRect(s[0],s[1],1.3,1.3)});
    S.forEach(s=>s.a+=s.sp*dt);
    const orbit=(s,front)=>{x.lineWidth=1;x.strokeStyle=rgb(s.c,front?.55:.22);x.beginPath();x.ellipse(pl.x,pl.y,s.rx,s.ry,tilt,front?0:Math.PI,front?Math.PI:TAU);x.stroke()};
    const sat=s=>{const p=pos(s),k=s.t==='Cyber',w=k&&Math.sin(t*5+s.n)>0;x.save();x.translate(p[0],p[1]);x.rotate(s.a);x.fillStyle=rgb(s.c);x.fillRect(-4,-4,8,8);x.fillStyle='#16b8f0';x.fillRect(-13,-2,7,4);x.fillRect(6,-2,7,4);x.restore();
      if(k){x.strokeStyle=`rgba(255,59,59,${w?.95:.3})`;x.lineWidth=1.5;x.beginPath();x.arc(p[0],p[1],14+Math.sin(t*5)*2,0,TAU);x.stroke();x.setLineDash([4,4]);x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(pl.x,pl.y);x.stroke();x.setLineDash([])}
      x.fillStyle='#fff';x.font='700 9px "Space Mono",monospace';x.fillText('SAT-0'+s.n+' '+s.t.toUpperCase(),p[0]+15,p[1]+3)};
    S.forEach(s=>orbit(s,false));S.filter(s=>pos(s)[2]<0).forEach(sat);
    const halo=x.createRadialGradient(pl.x,pl.y,pl.r*.9,pl.x,pl.y,pl.r*1.55);halo.addColorStop(0,'rgba(22,184,240,.5)');halo.addColorStop(1,'rgba(22,184,240,0)');x.fillStyle=halo;x.fillRect(0,0,W,H);
    const g=x.createRadialGradient(pl.x-pl.r*.4,pl.y-pl.r*.4,pl.r*.1,pl.x,pl.y,pl.r);g.addColorStop(0,'#5fd4ff');g.addColorStop(.45,'#1f5fd0');g.addColorStop(1,'#0d0a33');x.fillStyle=g;x.beginPath();x.arc(pl.x,pl.y,pl.r,0,TAU);x.fill();
    x.save();x.beginPath();x.arc(pl.x,pl.y,pl.r,0,TAU);x.clip();x.strokeStyle='rgba(255,255,255,.2)';x.lineWidth=2;for(let i=0;i<7;i++){x.beginPath();for(let a=0;a<=30;a++){const X=pl.x-pl.r+a/30*pl.r*2,Y=pl.y-pl.r+i*pl.r*.33+Math.sin(a*.5+t*.3+i)*5;a?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke()}x.restore();
    S.forEach(s=>orbit(s,true));S.filter(s=>pos(s)[2]>=0).forEach(sat);
    x.fillStyle='#16b8f0';x.font='700 11px "Space Mono",monospace';x.fillText('MISSION '+DAY,12,20);x.textAlign='right';x.fillStyle='#ff3b3b';x.fillText(TAGC('Cyber')?TAGC('Cyber')+(TAGC('Cyber')===1?' THREAT':' THREATS'):'ALL CLEAR',W-12,20);x.textAlign='left'}}},
{name:'Rain City',world:'Cyberpunk street',note:'Neon billboards scroll the day\'s real headlines through the rain, one sign per story.',make(x,W,H){
  const L=W*2,layer=(top,tone,win)=>{const o=document.createElement('canvas');o.width=L;o.height=H;const c=o.getContext('2d');let px=0;while(px<L){const bw=34+rnd()*62,bh=H*(top+rnd()*.3);c.fillStyle=tone;c.fillRect(px,H-bh,bw,bh);for(let yy=H-bh+6;yy<H;yy+=9)for(let xx=px+5;xx<px+bw-5;xx+=8)if(rnd()<win){c.fillStyle=['#ffe600','#16b8f0','#ff2e6e','#c9b8ff'][Math.floor(rnd()*4)];c.globalAlpha=.32+rnd()*.5;c.fillRect(xx,yy,3,4);c.globalAlpha=1}px+=bw+rnd()*7}return o};
  const A=layer(.5,'#1a1050',.22),C=layer(.34,'#0e0830',.34);const R=[...Array(170)].map(()=>[rnd()*W,rnd()*H,7+rnd()*11]);
  const SG=STORIES.map((s,i)=>({c:col(i),h:s[1].toUpperCase(),o:i*W*.62,y:H*(.09+((i*3)%5)*.085),w:W*.56}));
  return (t,dt)=>{
    const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1c0a4a');g.addColorStop(.6,'#5a1460');g.addColorStop(1,'#0b0620');x.fillStyle=g;x.fillRect(0,0,W,H);
    const a=(t*7)%L,c=(t*26)%L;x.drawImage(A,-a,0);x.drawImage(A,L-a,0);
    SG.forEach((s,i)=>{const sx=((s.o-t*26)%(W*4.4)+W*4.4)%(W*4.4)-W*.8;if(sx>W||sx<-s.w)return;const fl=Math.sin(t*23+i)>.96?.5:1;x.globalAlpha=fl;x.fillStyle='#000';x.fillRect(sx,s.y,s.w,34);x.lineWidth=3;x.strokeStyle=rgb(s.c);x.strokeRect(sx,s.y,s.w,34);
      x.save();x.beginPath();x.rect(sx+4,s.y+2,s.w-8,30);x.clip();x.fillStyle=rgb(s.c);x.font='400 21px Anton,Impact,sans-serif';const tw=x.measureText(s.h).width;x.fillText(s.h,sx+s.w-((t*42+i*60)%(tw+s.w)),s.y+26);x.restore();x.globalAlpha=1;
      const gl=x.createRadialGradient(sx+s.w/2,s.y+17,0,sx+s.w/2,s.y+17,s.w*.8);gl.addColorStop(0,rgb(s.c,.2));gl.addColorStop(1,rgb(s.c,0));x.fillStyle=gl;x.fillRect(sx-s.w*.4,s.y-s.w*.6,s.w*1.8,s.w*1.3)});
    x.drawImage(C,-c,0);x.drawImage(C,L-c,0);
    x.strokeStyle='rgba(201,220,255,.42)';x.lineWidth=1;x.beginPath();R.forEach(r=>{r[1]+=r[2]*.9;r[0]-=1.2;if(r[1]>H){r[1]=-12;r[0]=rnd()*W*1.2}if(r[0]<0)r[0]+=W;x.moveTo(r[0],r[1]);x.lineTo(r[0]-2,r[1]+r[2])});x.stroke()}}},
{name:'Event Horizon',world:'Wilder: black hole',note:'The day\'s headlines spiral into a black hole, stretching as they fall. The disc glows in the day\'s topic mix.',make(x,W,H){
  const cx=W/2,cy=H*.38,Rh=W*.14,ST=[...Array(170)].map(()=>[rnd()*TAU,Math.pow(rnd(),.6)*H*.8,rnd()]);
  const D=[...Array(2800)].map(()=>({r:Rh*1.45+Math.pow(rnd(),1.5)*W*.46,a:rnd()*TAU,c:COL[pickTag()],s:rnd()}));
  const WD=STORIES.map((s,i)=>({w:s[1].split(' ').slice(-1)[0].toUpperCase(),o:i/N(),c:col(i)}));
  const draw=(p,front)=>{const Y=Math.sin(p.a)*p.r*.26;if((Y>=0)!==front)return;const X=Math.cos(p.a)*p.r,dop=1+Math.cos(p.a+.6)*.75;x.fillStyle=rgb(p.c,clamp(.2+dop*.32,0,1));const s=(.9+p.s)*dop;x.fillRect(cx+X,cy+Y,s,s)};
  return (t,dt)=>{
    x.globalCompositeOperation='source-over';x.fillStyle='rgba(5,3,16,.42)';x.fillRect(0,0,W,H);
    ST.forEach(s=>{const a=s[0]+t*.012,r=s[1]+Rh*2.2/(s[1]/Rh+.5);x.fillStyle=`rgba(255,255,255,${.2+s[2]*.6})`;x.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*r,1.2,1.2)});
    x.globalCompositeOperation='lighter';D.forEach(p=>{p.a+=dt*5.2/Math.pow(p.r/Rh,1.4);draw(p,false)});
    const up=x.createRadialGradient(cx,cy,Rh*.9,cx,cy,Rh*1.75);up.addColorStop(0,'rgba(255,170,90,0)');up.addColorStop(.28,'rgba(255,200,150,.95)');up.addColorStop(.55,'rgba(255,46,110,.5)');up.addColorStop(1,'rgba(124,77,255,0)');x.fillStyle=up;x.fillRect(cx-Rh*2,cy-Rh*2,Rh*4,Rh*4);
    x.globalCompositeOperation='source-over';x.fillStyle='#000';x.beginPath();x.arc(cx,cy,Rh*1.02,0,TAU);x.fill();
    x.lineWidth=2.4;x.strokeStyle='rgba(255,240,220,.95)';x.stroke();
    WD.forEach((w,i)=>{const u=(t*.075+w.o)%1,r=W*.62*Math.pow(1-u,1.5)+Rh*.92,a=u*8.5+i*.9,X=cx+Math.cos(a)*r,Y=cy+Math.sin(a)*r*.62,k=clamp(1-u,0,1);if(r<Rh*1.05&&Math.sin(a)<0)return;x.save();x.translate(X,Y);x.rotate(a+1.57);x.scale(.5+k*.9,(.5+k*.9)*(1+u*.8));x.globalAlpha=clamp(k*2.4,0,1);x.font='400 25px Anton,Impact,sans-serif';x.textAlign='center';x.fillStyle=rgb(w.c);x.fillText(w.w,0,0);x.restore();x.globalAlpha=1;x.textAlign='left'});
    x.globalCompositeOperation='lighter';D.forEach(p=>draw(p,true));x.globalCompositeOperation='source-over'}}},
{name:'Abyss Leviathan',world:'Wilder: deep-sea creature',note:'A vast glowing creature glides through the deep, with one light on its body for each story.',make(x,W,H){
  const N=112,S=[...Array(N)].map((_,i)=>({x:W/2,y:-i*4,a:0})),SN=[...Array(130)].map(()=>[rnd()*W,rnd()*H,.2+rnd()*.6,rnd()]);
  const seg=H*.0078;
  return (t,dt)=>{
    x.fillStyle='rgba(2,6,24,.5)';x.fillRect(0,0,W,H);
    for(let i=0;i<4;i++){const g=x.createLinearGradient(0,0,0,H*.8),bx=W*(.15+i*.25)+Math.sin(t*.2+i)*22;g.addColorStop(0,'rgba(22,184,240,.06)');g.addColorStop(1,'rgba(22,184,240,0)');x.fillStyle=g;x.beginPath();x.moveTo(bx-16,0);x.lineTo(bx+16,0);x.lineTo(bx+70,H*.8);x.lineTo(bx-70,H*.8);x.fill()}
    SN.forEach(s=>{s[1]+=s[2]*.6;s[0]+=Math.sin(t+s[3]*9)*.15;if(s[1]>H)s[1]=0;x.fillStyle=`rgba(190,235,255,${.15+s[3]*.45})`;x.fillRect(s[0],s[1],1.5,1.5)});
    S[0].x=W/2+Math.sin(t*.47)*W*.4+Math.sin(t*1.1)*W*.05;S[0].y=H*.34+Math.sin(t*.73)*H*.25;
    for(let i=1;i<N;i++){const a=S[i-1],b=S[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;b.x=a.x+dx/d*seg;b.y=a.y+dy/d*seg;b.a=Math.atan2(dy,dx)}S[0].a=S[1].a;
    const wid=i=>{const u=i/N;return W*.085*Math.pow(Math.sin(Math.PI*Math.pow(u,.62)),1.1)+1.5};
    for(let i=N-1;i>0;i--){const s=S[i],w=wid(i),n=s.a+1.57,cx=Math.cos(n),cy=Math.sin(n);x.lineWidth=seg*1.5;x.strokeStyle=`rgba(12,44,92,${.95})`;x.beginPath();x.moveTo(s.x+cx*w,s.y+cy*w);x.lineTo(s.x-cx*w,s.y-cy*w);x.stroke();
      if(i%3===0){x.lineWidth=1;x.strokeStyle=`rgba(90,230,255,${.3+.5*Math.sin(i*.22-t*2.4)**2})`;x.beginPath();x.moveTo(s.x+cx*w,s.y+cy*w);x.lineTo(s.x+cx*(w+5+wid(i)*.45),s.y+cy*(w+5+wid(i)*.45));x.moveTo(s.x-cx*w,s.y-cy*w);x.lineTo(s.x-cx*(w+5+wid(i)*.45),s.y-cy*(w+5+wid(i)*.45));x.stroke()}}
    x.lineWidth=2;x.strokeStyle='rgba(90,230,255,.85)';[1,-1].forEach(k=>{x.beginPath();for(let i=1;i<N;i++){const s=S[i],w=wid(i)*k,n=s.a+1.57,X=s.x+Math.cos(n)*w,Y=s.y+Math.sin(n)*w;i>1?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke()});
    STORIES.forEach((st,i)=>{const s=S[10+i*13],c=col(i),p=.6+.4*Math.sin(t*2.2-i*.8),r=W*.052*p+4,g=x.createRadialGradient(s.x,s.y,0,s.x,s.y,r*2.6);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,rgb(c,.95));g.addColorStop(1,rgb(c,0));x.fillStyle=g;x.fillRect(s.x-r*2.6,s.y-r*2.6,r*5.2,r*5.2)});
    const h=S[0],a=h.a+Math.PI,hx=h.x+Math.cos(a)*W*.03,hy=h.y+Math.sin(a)*W*.03;x.fillStyle='#ffe600';[1,-1].forEach(k=>{const n=a+1.57*k;x.beginPath();x.arc(hx+Math.cos(n)*W*.03,hy+Math.sin(n)*W*.03,3.6,0,TAU);x.fill()});
    x.strokeStyle='rgba(255,230,0,.8)';x.lineWidth=1.3;x.beginPath();x.moveTo(hx,hy);const ax=hx+Math.cos(a)*W*.12,ay=hy+Math.sin(a)*W*.12-14;x.quadraticCurveTo(hx+Math.cos(a)*W*.08,hy+Math.sin(a)*W*.08-24,ax,ay);x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(ax,ay,4,0,TAU);x.fill()}}}
];


/* New and reworked opening animations (9 Nov 2026 review). Same interface as motion.js: make(x,W,H) returns f(t,dt). Pasted inside motion.js's closure, so it uses COL, rgb, INK, TAU, clamp, STORIES, DAY, ISO, N, TAGC, col, rnd. */
const LAB=[
/* ---------- HACKER DEN (replaces Black Box) ---------- */
{name:'Hacker Den',world:'Hacker room',note:'A hacker works three screens at once. Each story is a target on the globe; when one is breached the room flares in its topic colour.',make(x,W,H){
  const sw=200,sh=128,mk=()=>{const c=document.createElement('canvas');c.width=sw*2;c.height=sh*2;const g=c.getContext('2d');g.scale(2,2);return[c,g]};
  const [cL,gL]=mk(),[cC,gC]=mk(),[cR,gR]=mk();
  const lines=[];STORIES.forEach((s,i)=>{lines.push('$ breach --'+s[0].toLowerCase()+' --id '+(i+1));lines.push('  '+s[1]);lines.push('  ok '+(100+Math.floor(rnd()*900))+'ms  key '+Math.floor(rnd()*65535).toString(16))});
  const globe=[...Array(260)].map(()=>{const u=rnd()*2-1,a=rnd()*TAU,r=Math.sqrt(1-u*u);return[r*Math.cos(a),u,r*Math.sin(a)]});
  const tg=STORIES.map((s,i)=>{const u=rnd()*1.3-.65,a=i/N()*TAU,r=Math.sqrt(1-u*u);return{p:[r*Math.cos(a),u,r*Math.sin(a)],c:col(i)}});
  const dust=[...Array(70)].map(()=>[rnd()*W,rnd()*H,rnd()]);
  const BEAT=3.4;let cur=-1,flash=0,bits=[],shake=0;
  const hx=n=>{const v=Math.abs(Math.sin(n*12.9898)*43758.5453)%1;return Math.floor(v*256).toString(16).padStart(2,'0').toUpperCase()};
  const trap=(cv,x0,x1,hL,hR,cy)=>{const n=30;for(let s=0;s<n;s++){const u=s/n,X=x0+(x1-x0)*u,h=hL+(hR-hL)*(u+.5/n);x.drawImage(cv,u*cv.width,0,cv.width/n+1,cv.height,X,cy-h/2,(x1-x0)/n+.8,h)}
    x.lineJoin='round';x.lineWidth=6;x.strokeStyle='#120d22';x.beginPath();x.moveTo(x0,cy-hL/2);x.lineTo(x1,cy-hR/2);x.lineTo(x1,cy+hR/2);x.lineTo(x0,cy+hL/2);x.closePath();x.stroke();x.lineWidth=1;x.strokeStyle='rgba(201,184,255,.35)';x.stroke()};
  return (t,dt)=>{
    const k=Math.floor(t/BEAT)%N(),ph=(t%BEAT)/BEAT;if(k!==cur){cur=k;flash=1;shake=6}flash*=.94;shake*=.85;
    const C=col(cur),hot=ph>.78;
    if(hot&&rnd()<.5)for(let i=0;i<2;i++)bits.push({x:W*.5+(rnd()-.5)*W*.3,y:H*.2+(rnd()-.5)*H*.1,vx:(rnd()-.5)*1.2,vy:1.2+rnd()*1.6,l:1});
    /* left screen: terminal */
    gL.fillStyle='#01090b';gL.fillRect(0,0,sw,sh);gL.font='700 7.4px "Space Mono",monospace';
    const tot=lines.length,sc=t*1.7;
    for(let j=0;j<15;j++){const li=Math.floor(sc)+j-14;if(li<0)continue;const L=lines[li%tot],y=9+j*8.6-(sc%1)*8.6;gL.fillStyle=L[0]==='$'?'#4dff9a':L.startsWith('  ok')?'rgba(77,255,154,.5)':'#e6fff1';gL.fillText(L.slice(0,47),5,y)}
    gL.fillStyle='#4dff9a';if(Math.floor(t*3)%2)gL.fillRect(5,sh-9,5,7);
    /* centre screen: globe and target */
    gC.fillStyle='#06020f';gC.fillRect(0,0,sw,sh);const R=sh*.37,gx=sw/2,gy=sh*.54,ry=t*.45,cs=Math.cos(ry),sn=Math.sin(ry);
    const P=p=>{const X=p[0]*cs+p[2]*sn,Z=-p[0]*sn+p[2]*cs;return[gx+X*R,gy-p[1]*R,Z]};
    const gg=gC.createRadialGradient(gx,gy,0,gx,gy,R*1.3);gg.addColorStop(0,rgb(C,.18+flash*.3));gg.addColorStop(1,'rgba(0,0,0,0)');gC.fillStyle=gg;gC.fillRect(0,0,sw,sh);
    globe.forEach(p=>{const q=P(p);gC.fillStyle=`rgba(201,184,255,${q[2]>0?.6:.1})`;gC.fillRect(q[0],q[1],1.3,1.3)});
    gC.lineWidth=.6;gC.strokeStyle='rgba(201,184,255,.3)';gC.beginPath();gC.arc(gx,gy,R,0,TAU);gC.stroke();gC.beginPath();gC.ellipse(gx,gy,R,R*.28,0,0,TAU);gC.stroke();
    tg.forEach((o,i)=>{const q=P(o.p);if(q[2]<-.1)return;const on=i===cur;gC.fillStyle=rgb(o.c,on?1:.75);gC.beginPath();gC.arc(q[0],q[1],on?3.2:1.9,0,TAU);gC.fill();
      if(on){gC.lineWidth=1;gC.strokeStyle=rgb(o.c,1-ph);gC.beginPath();gC.arc(q[0],q[1],4+ph*16,0,TAU);gC.stroke();gC.strokeStyle=rgb(o.c,.9);gC.setLineDash([3,3]);gC.lineDashOffset=-t*20;gC.beginPath();gC.moveTo(sw/2,sh);gC.quadraticCurveTo(q[0],sh*.4,q[0],q[1]);gC.stroke();gC.setLineDash([])}});
    gC.font='700 7.5px "Space Mono",monospace';gC.fillStyle='#fff';gC.fillText('TARGET '+(cur+1)+'/'+N()+' · '+STORIES[cur][0].toUpperCase(),6,11);gC.fillStyle='rgba(255,255,255,.55)';gC.fillText(STORIES[cur][1].slice(0,44),6,21);
    gC.fillStyle='rgba(255,255,255,.14)';gC.fillRect(6,sh-10,sw-12,4);gC.fillStyle=rgb(C);gC.fillRect(6,sh-10,(sw-12)*Math.min(1,ph/.78),4);
    if(hot){gC.fillStyle='rgba(6,2,15,.55)';gC.fillRect(0,sh*.42,sw,22);gC.fillStyle=Math.floor(t*12)%2?'#fff':rgb(C);gC.font='700 15px "Space Mono",monospace';gC.textAlign='center';gC.fillText('ACCESS GRANTED',sw/2,sh*.42+16);gC.textAlign='left'}
    /* right screen: hex dump and topic bars */
    gR.fillStyle='#0a020c';gR.fillRect(0,0,sw,sh);gR.font='700 7px "Space Mono",monospace';const row=Math.floor(t*7);
    for(let r=0;r<13;r++){let s='';for(let q=0;q<5;q++)s+=hx((row+r)*7+q)+' ';gR.fillStyle=r===12?rgb(C):`rgba(255,46,110,${.18+.04*r})`;gR.fillText(s,5,10+r*8.6)}
    ['AI','Tech','Cyber'].forEach((g,i)=>{const h=(sh-30)*clamp(TAGC(g)/Math.max(1,N())*1.6,.1,1)*(.85+.15*Math.sin(t*5+i*2));gR.fillStyle=rgb(COL[g],.9);gR.fillRect(sw-58+i*18,sh-16-h,12,h);gR.fillStyle='#fff';gR.fillText(g==='Cyber'?'CY':g.slice(0,2).toUpperCase(),sw-59+i*18,sh-5)});
    let wv='';gR.strokeStyle='rgba(255,230,0,.7)';gR.lineWidth=1;gR.beginPath();for(let i=0;i<70;i++){const X=5+i,Y=sh-14+Math.sin(i*.4+t*9)*Math.sin(t*1.3+i*.05)*6;i?gR.lineTo(X,Y):gR.moveTo(X,Y)}gR.stroke();
    [gL,gC,gR].forEach(g=>{g.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<sh;i+=2)g.fillRect(0,i,sw,.8)});
    /* room */
    x.save();if(shake>.3)x.translate((rnd()-.5)*shake,(rnd()-.5)*shake);
    x.fillStyle='#030109';x.fillRect(-10,-10,W+20,H+20);
    const mW=W*.58,mH=mW*sh/sw,cy=H*.19;
    x.globalCompositeOperation='lighter';
    [[W*.1,'77,255,154'],[W*.5,C.join(',')],[W*.9,'255,46,110']].forEach(([gx2,c],i)=>{const r=W*(i===1?.75:.5),g=x.createRadialGradient(gx2,cy,0,gx2,cy,r);g.addColorStop(0,`rgba(${c},${i===1?.22+flash*.35:.14})`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(gx2-r,cy-r,r*2,r*2)});
    x.globalCompositeOperation='source-over';
    x.strokeStyle='rgba(10,8,20,.9)';x.lineWidth=2;[[W*.12,0],[W*.3,1],[W*.66,2],[W*.86,1]].forEach(([cx2,s])=>{x.beginPath();x.moveTo(cx2,cy+mH*.45);x.bezierCurveTo(cx2+s*6,H*.45,cx2-10,H*.5,cx2+4,H*.62);x.stroke()});
    trap(cL,-W*.2,W*.2,mH*.72,mH*.95,cy+6);trap(cR,W*.8,W*1.2,mH*.95,mH*.72,cy+6);trap(cC,W*.5-mW/2,W*.5+mW/2,mH,mH,cy);
    x.fillStyle='#120d22';x.fillRect(W*.47,cy+mH/2,W*.06,H*.05);
    const dy=cy+mH/2+H*.035,dg=x.createLinearGradient(0,dy,0,H*.48);dg.addColorStop(0,rgb(C,.35+flash*.3));dg.addColorStop(.12,'#140f26');dg.addColorStop(1,'#06040e');x.fillStyle=dg;x.beginPath();x.moveTo(-10,dy);x.lineTo(W+10,dy);x.lineTo(W+10,H*.48);x.lineTo(-10,H*.48);x.fill();x.fillStyle=rgb(C,.9);x.fillRect(0,dy-1,W,2);
    const kg=x.createRadialGradient(W/2,dy+H*.035,0,W/2,dy+H*.035,W*.32);kg.addColorStop(0,rgb(C,.6));kg.addColorStop(1,rgb(C,0));x.fillStyle=kg;x.fillRect(0,dy-H*.05,W,H*.15);
    for(let i=0;i<14;i++){x.fillStyle=Math.sin(t*20+i*3)>.6?'#fff':rgb(C,.7);x.fillRect(W*.3+i*W*.03,dy+H*.03,W*.022,3)}
    for(let r=0;r<2;r++)for(let i=0;i<22;i++){const X=r?W-14:8,Y=dy+16+i*7,on=Math.sin(t*(3+i%5)+i*7+r*3)>.2;x.fillStyle=on?(i%4?'rgba(77,255,154,.9)':rgb(C)):'rgba(40,30,70,.8)';x.fillRect(X,Y,6,2)}
    /* hacker silhouette from behind */
    const bob=Math.sin(t*1.3)*1.5,tw=Math.sin(t*15)*.6,hx0=W/2+Math.sin(t*.5)*3,hy=H*.37+bob,hr=W*.052;
    [-1,1].forEach(k=>{x.fillStyle='#030110';x.beginPath();x.moveTo(W/2+k*W*.2,H*.5);x.quadraticCurveTo(W/2+k*W*.24,H*.45,W/2+k*W*.15,dy+H*.035);x.lineTo(W/2+k*W*.1,dy+H*.035);x.quadraticCurveTo(W/2+k*W*.15,H*.46,W/2+k*W*.13,H*.52);x.fill();x.strokeStyle=k<0?'rgba(77,255,154,.5)':'rgba(255,46,110,.5)';x.lineWidth=1.2;x.beginPath();x.moveTo(W/2+k*W*.2,H*.5);x.quadraticCurveTo(W/2+k*W*.24,H*.45,W/2+k*W*.15,dy+H*.035);x.stroke()});
    const hood=x.createLinearGradient(0,hy-hr,0,H*.66);hood.addColorStop(0,rgb(C,.22+flash*.2));hood.addColorStop(.25,'#0b0620');hood.addColorStop(1,'#010006');
    x.fillStyle=hood;x.beginPath();x.moveTo(W*.27,H*.66);x.bezierCurveTo(W*.28,H*.5+tw,W*.36,H*.44,hx0-hr*1.1,hy+hr*.7);x.lineTo(hx0+hr*1.1,hy+hr*.7);x.bezierCurveTo(W*.64,H*.44,W*.72,H*.5-tw,W*.73,H*.66);x.closePath();x.fill();
    x.beginPath();x.ellipse(hx0,hy,hr*1.18,hr*1.3,0,0,TAU);x.fill();
    x.lineWidth=2.2;x.strokeStyle=rgb(C,.75+flash*.25);x.beginPath();x.ellipse(hx0,hy,hr*1.18,hr*1.3,0,Math.PI*1.08,Math.PI*1.92);x.stroke();x.fillStyle='#07050f';[-1,1].forEach(k=>{x.beginPath();x.ellipse(hx0+k*hr*1.15,hy+hr*.1,hr*.32,hr*.5,0,0,TAU);x.fill();x.strokeStyle=rgb(C,.9);x.lineWidth=1.4;x.stroke()});x.strokeStyle='#07050f';x.lineWidth=4;x.beginPath();x.ellipse(hx0,hy,hr*1.2,hr*1.32,0,Math.PI*1.1,Math.PI*1.9);x.stroke();
    x.lineWidth=1.6;x.strokeStyle='rgba(77,255,154,.55)';x.beginPath();x.moveTo(hx0-hr*1.15,hy+hr*.5);x.bezierCurveTo(W*.36,H*.44,W*.28,H*.5+tw,W*.27,H*.64);x.stroke();
    x.strokeStyle='rgba(255,46,110,.55)';x.beginPath();x.moveTo(hx0+hr*1.15,hy+hr*.5);x.bezierCurveTo(W*.64,H*.44,W*.72,H*.5-tw,W*.73,H*.64);x.stroke();
    x.strokeStyle='rgba(201,184,255,.25)';x.lineWidth=1;x.beginPath();x.moveTo(hx0,hy+hr*1.3);x.lineTo(hx0,H*.62);x.stroke();
    /* floating holo cards with the next stories */
    x.globalCompositeOperation='lighter';for(let q=0;q<3;q++){const si=(cur+q+1)%N(),c2=col(si),side=q===1?1:-1,X=W/2+side*W*(q===2?.3:.29)-(q===2?0:0),Y=H*(.4+(q===2?.08:0))+Math.sin(t*1.2+q*2)*5,cw2=W*.3,chh=H*.055;
      x.save();x.translate(X,Y);x.transform(1,side*-.08,0,1,0,0);x.fillStyle=rgb(c2,.1);x.fillRect(-cw2/2,-chh/2,cw2,chh);x.strokeStyle=rgb(c2,.75);x.lineWidth=1;x.strokeRect(-cw2/2,-chh/2,cw2,chh);
      x.fillStyle=rgb(c2,.95);x.font='700 8px "Space Mono",monospace';x.fillText('NEXT · '+STORIES[si][0].toUpperCase(),-cw2/2+5,-chh/2+11);x.fillStyle='rgba(255,255,255,.8)';x.font='700 9px "Space Grotesk",sans-serif';x.fillText(STORIES[si][1].slice(0,26),-cw2/2+5,-chh/2+24);x.restore()}
    x.globalCompositeOperation='source-over';
    /* data bits pour from the screen to the keyboard */
    x.globalCompositeOperation='lighter';
    bits=bits.filter(b=>(b.l-=.012)>0);bits.forEach(b=>{b.x+=b.vx;b.y+=b.vy;x.fillStyle=rgb(C,b.l);x.font='700 9px "Space Mono",monospace';x.fillText(rnd()<.5?'1':'0',b.x,b.y)});
    dust.forEach(d=>{d[1]-=.15+d[2]*.2;d[0]+=Math.sin(t+d[2]*9)*.2;if(d[1]<0)d[1]=H*.6;x.fillStyle=`rgba(201,184,255,${.08+d[2]*.2})`;x.fillRect(d[0],d[1],1.4,1.4)});
    if(flash>.4){x.fillStyle=rgb(C,(flash-.4)*.25);x.fillRect(0,0,W,H)}
    x.globalCompositeOperation='source-over';
    if(flash>.6){const gy2=rnd()*H*.4,gh=6+rnd()*20;{const pr=x.canvas.width/W;x.drawImage(x.canvas,0,gy2*pr,x.canvas.width,gh*pr,(rnd()-.5)*18,gy2,W,gh)}}
    const v=x.createRadialGradient(W/2,H*.28,W*.35,W/2,H*.35,H*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.8)');x.fillStyle=v;x.fillRect(0,0,W,H);
    x.restore()}}},

/* ---------- NEON PINBALL v2 ---------- */
{name:'Neon Pinball',world:'Arcade machine',note:'A self-playing table where each story is a bumper. Hits flare, ring out and score, the display scrolls the story you just hit, and every twelfth hit is a jackpot.',make(x,W,H){
  const top=H*.13,F=H*.6,L=10,R=W-10;
  const B=STORIES.map((s,i)=>{const a=i/N()*TAU-1.2,r=i%2?.22:.33;return{x:W/2+Math.cos(a)*W*r,y:H*.32+Math.sin(a)*H*.1,r:W*.05,c:col(i),f:0,i}});
  const b={x:W*.8,y:F-40,vx:-3,vy:-9};let score=48100,hits=0,jack=0,last=0,fl=0,fr=0,lc=[255,255,255];const tr=[],pops=[],rings=[],sparks=[];
  const lane=[0,0,0],lx=[W*.32,W*.5,W*.68];
  const panel=document.createElement('canvas');
  return (t,dt)=>{
    /* physics */
    for(let s=0;s<2;s++){b.vy+=.09;b.x+=b.vx*.5;b.y+=b.vy*.5;
      if(b.x<L+8){b.x=L+8;b.vx=Math.abs(b.vx)}if(b.x>R-8){b.x=R-8;b.vx=-Math.abs(b.vx)}if(b.y<top+8){b.y=top+8;b.vy=Math.abs(b.vy)}
      lx.forEach((X,i)=>{if(Math.abs(b.x-X)<10&&b.y<top+40)lane[i]=1});
      B.forEach(k=>{const dx=b.x-k.x,dy=b.y-k.y,d=Math.hypot(dx,dy)||1;if(d<k.r+6){const nx=dx/d,ny=dy/d;b.x=k.x+nx*(k.r+6.5);b.y=k.y+ny*(k.r+6.5);const dot=b.vx*nx+b.vy*ny;b.vx=(b.vx-2*dot*nx)+nx*1.6;b.vy=(b.vy-2*dot*ny)+ny*1.6;
        if(k.f<.6){k.f=1;score+=500;hits++;last=k.i;lc=k.c;pops.push({x:k.x,y:k.y-k.r,l:1,s:'+500',c:k.c});rings.push({x:k.x,y:k.y,r:k.r,l:1,c:k.c});for(let q=0;q<10;q++)sparks.push({x:b.x,y:b.y,vx:(rnd()-.5)*6,vy:(rnd()-.5)*6,l:1,c:k.c});if(hits%12===0){jack=1.6;score+=25000}}}});
      if(b.y>F-10){b.y=F-10;b.vy=-(8.6+rnd()*2.6);b.vx=(W/2-b.x)*.02+(rnd()-.5)*4.8;b.x<W/2?fl=1:fr=1}
      const sp=Math.hypot(b.vx,b.vy);if(sp>10){b.vx*=10/sp;b.vy*=10/sp}}
    tr.push([b.x,b.y]);if(tr.length>22)tr.shift();jack=Math.max(0,jack-dt);
    /* playfield */
    const pg=x.createLinearGradient(0,top,0,F);pg.addColorStop(0,'#12052e');pg.addColorStop(1,'#05010f');x.fillStyle=pg;x.fillRect(0,0,W,H);
    x.save();x.beginPath();x.rect(L,top,R-L,F-top+20);x.clip();
    x.globalAlpha=.08;x.strokeStyle='#c9b8ff';x.lineWidth=14;for(let i=-10;i<20;i++){x.beginPath();x.moveTo(i*40,top);x.lineTo(i*40+H*.5,F+20);x.stroke()}x.globalAlpha=1;
    const art=x.createRadialGradient(W/2,H*.32,0,W/2,H*.32,W*.45);art.addColorStop(0,rgb(lc,.22+(B[last]?B[last].f*.2:0)));art.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=art;x.fillRect(0,0,W,H);
    x.lineWidth=1.5;x.strokeStyle='rgba(201,184,255,.18)';x.beginPath();x.arc(W/2,H*.32,W*.42,0,TAU);x.stroke();x.beginPath();x.arc(W/2,H*.32,W*.14,0,TAU);x.stroke();
    x.restore();
    /* chasing lights round the rail */
    const per=2*(R-L)+2*(F+20-top),nL=54;for(let i=0;i<nL;i++){let d=i/nL*per,X,Y;if(d<R-L){X=L+d;Y=top}else if((d-=R-L)<F+20-top){X=R;Y=top+d}else if((d-=F+20-top)<R-L){X=R-d;Y=F+20}else{d-=R-L;X=L;Y=F+20-d}
      const on=((i-Math.floor(t*14))%6+6)%6<2||jack>0&&Math.floor(t*10)%2;const c=jack>0?COL[['AI','Tech','Cyber'][i%3]]:on?[255,230,0]:[60,40,110];x.fillStyle=rgb(c,on?1:.7);x.beginPath();x.arc(X,Y,on?2.6:1.8,0,TAU);x.fill()}
    /* top lanes */
    lx.forEach((X,i)=>{lane[i]*=.985;x.strokeStyle='rgba(201,184,255,.5)';x.lineWidth=2;x.beginPath();x.moveTo(X-12,top+4);x.lineTo(X-12,top+38);x.moveTo(X+12,top+4);x.lineTo(X+12,top+38);x.stroke();x.fillStyle=lane[i]>.3?'#ffe600':'rgba(255,230,0,.2)';x.beginPath();x.arc(X,top+48,4,0,TAU);x.fill()});
    /* slingshots */
    [[1,W*.14],[-1,W*.86]].forEach(([d,X])=>{x.fillStyle='rgba(22,184,240,.18)';x.strokeStyle='#16b8f0';x.lineWidth=2.5;x.beginPath();x.moveTo(X,F-90);x.lineTo(X,F-38);x.lineTo(X+d*W*.12,F-24);x.closePath();x.fill();x.stroke()});
    /* bumpers */
    x.globalCompositeOperation='lighter';
    rings.forEach(r=>{r.l-=.03;r.r+=2.4;x.strokeStyle=rgb(r.c,Math.max(0,r.l));x.lineWidth=3;x.beginPath();x.arc(r.x,r.y,r.r,0,TAU);x.stroke()});
    B.forEach(k=>{const g=x.createRadialGradient(k.x,k.y,0,k.x,k.y,k.r*2.8);g.addColorStop(0,rgb(k.c,.5+k.f*.5));g.addColorStop(1,rgb(k.c,0));x.fillStyle=g;x.fillRect(k.x-k.r*2.8,k.y-k.r*2.8,k.r*5.6,k.r*5.6)});
    x.globalCompositeOperation='source-over';
    B.forEach(k=>{k.f*=.92;x.fillStyle='#0d0720';x.beginPath();x.arc(k.x,k.y+4,k.r,0,TAU);x.fill();x.lineWidth=3.5;x.strokeStyle=k.f>.25?'#fff':rgb(k.c);x.beginPath();x.arc(k.x,k.y,k.r,0,TAU);x.stroke();
      const cg=x.createRadialGradient(k.x-k.r*.25,k.y-k.r*.3,0,k.x,k.y,k.r*.75);cg.addColorStop(0,'#fff');cg.addColorStop(.35,rgb(k.c));cg.addColorStop(1,rgb(k.c,.3));x.fillStyle=cg;x.beginPath();x.arc(k.x,k.y,k.r*(.62+k.f*.2),0,TAU);x.fill();
      x.fillStyle=INK;x.font='700 '+Math.round(k.r*.42)+'px "Space Mono",monospace';x.textAlign='center';x.fillText(STORIES[k.i][0].toUpperCase(),k.x,k.y+k.r*.15);x.textAlign='left'});
    /* flippers */
    fl*=.8;fr*=.8;[[W*.2,1,fl],[W*.8,-1,fr]].forEach(([px,d,f])=>{const a=(.42-f*.85),len=W*.23,tx=px+d*Math.cos(a)*len,ty=F-6+Math.sin(a)*len*.9;
      x.save();x.shadowColor='#ffe600';x.shadowBlur=14;x.fillStyle='#ffe600';x.beginPath();x.arc(px,F-6,9,0,TAU);x.fill();x.beginPath();x.arc(tx,ty,4,0,TAU);x.fill();
      const ang=Math.atan2(ty-(F-6),tx-px),nx=Math.cos(ang+1.57),ny=Math.sin(ang+1.57);x.beginPath();x.moveTo(px+nx*9,F-6+ny*9);x.lineTo(tx+nx*4,ty+ny*4);x.lineTo(tx-nx*4,ty-ny*4);x.lineTo(px-nx*9,F-6-ny*9);x.fill();x.restore()});
    /* ball and trail */
    x.globalCompositeOperation='lighter';
    for(let i=1;i<tr.length;i++){x.strokeStyle=rgb(lc,i/tr.length*.7);x.lineWidth=i/tr.length*10;x.lineCap='round';x.beginPath();x.moveTo(tr[i-1][0],tr[i-1][1]);x.lineTo(tr[i][0],tr[i][1]);x.stroke()}
    sparks.splice(0,Math.max(0,sparks.length-80));for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vy+=.15;s.l-=.035;if(s.l<=0){sparks.splice(i,1);continue}x.fillStyle=rgb(s.c,s.l);x.fillRect(s.x,s.y,2.5,2.5)}
    const hg=x.createRadialGradient(b.x,b.y,0,b.x,b.y,22);hg.addColorStop(0,rgb(lc,.6));hg.addColorStop(1,rgb(lc,0));x.fillStyle=hg;x.fillRect(b.x-22,b.y-22,44,44);
    x.globalCompositeOperation='source-over';
    const bg=x.createRadialGradient(b.x-2,b.y-2,0,b.x,b.y,7);bg.addColorStop(0,'#fff');bg.addColorStop(.6,'#cfd6e6');bg.addColorStop(1,'#59607a');x.fillStyle=bg;x.beginPath();x.arc(b.x,b.y,6.5,0,TAU);x.fill();
    for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.l-=.02;p.y-=.7;if(p.l<=0){pops.splice(i,1);continue}x.fillStyle=rgb(p.c,p.l);x.font='400 18px Anton,Impact,sans-serif';x.textAlign='center';x.fillText(p.s,p.x,p.y);x.textAlign='left'}
    /* dot-matrix display */
    const ph=top-16,py=8;x.fillStyle='#0a0400';x.fillRect(L,py,R-L,ph);x.strokeStyle='#3a1d00';x.lineWidth=2;x.strokeRect(L,py,R-L,ph);
    x.save();x.beginPath();x.rect(L+2,py+2,R-L-4,ph-4);x.clip();x.fillStyle=jack>0&&Math.floor(t*8)%2?'#fff':'#ff9a1f';x.shadowColor='#ff7a00';x.shadowBlur=8;
    if(jack>0){x.font='400 '+Math.round(ph*.62)+'px Anton,Impact,sans-serif';x.textAlign='center';x.fillText('JACKPOT  +25,000',W/2,py+ph*.74);x.textAlign='left'}
    else{x.font='400 '+Math.round(ph*.42)+'px Anton,Impact,sans-serif';x.fillText(String(score).replace(/\B(?=(\d{3})+(?!\d))/g,','),L+10,py+ph*.48);
      x.font='700 '+Math.round(ph*.24)+'px "Space Mono",monospace';const msg=(STORIES[last][0].toUpperCase()+' · '+STORIES[last][1]+'   ').repeat(2),mw=x.measureText(msg).width/2,off=(t*50)%mw;x.fillText(msg,L+10-off,py+ph*.84)}
    x.shadowBlur=0;x.fillStyle='rgba(10,4,0,.55)';for(let i=L;i<R;i+=3)x.fillRect(i,py,1,ph);for(let j=py;j<py+ph;j+=3)x.fillRect(L,j,R-L,1);x.restore()}}},

/* ---------- TITAN DUEL v2 ---------- */
{name:'Titan Duel',world:'Fighting game',note:'AI and Cyber fight as armoured mechs over a neon city. Health comes off with every hit, every third blow is a beam, and the round ends in a knockout.',make(x,W,H){
  const floor=H*.56,U=W/390*1.15;
  const sky=[...Array(26)].map((_,i)=>({x:i/26*W*1.1-W*.05,w:W*(.04+rnd()*.05),h:H*(.06+rnd()*.2),win:[...Array(14)].map(()=>rnd()<.35)}));
  const limb=(c,pts,w)=>{x.lineCap='round';x.lineJoin='round';x.lineWidth=w+6;x.strokeStyle=rgb(c,.25);x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();x.lineWidth=w;x.strokeStyle='#1a1036';x.stroke();x.lineWidth=w*.45;x.strokeStyle=rgb(c);x.stroke();pts.forEach(p=>{x.fillStyle='#fff';x.beginPath();x.arc(p[0],p[1],w*.36,0,TAU);x.fill()})};
  const mech=(cx,d,c,p,rec,t,beam)=>{const bob=Math.sin(t*3+d)*3*U,cxx=cx-d*rec*26*U,hip=[cxx,floor-78*U+bob],ch=[cxx+d*9*U,floor-134*U+bob];
    const fl=.6+.4*Math.sin(t*40+d);const tg=x.createLinearGradient(0,ch[1]+10*U,0,ch[1]+50*U);tg.addColorStop(0,'rgba(255,255,255,.9)');tg.addColorStop(.3,rgb(c,.8));tg.addColorStop(1,rgb(c,0));x.fillStyle=tg;x.beginPath();x.moveTo(ch[0]-d*24*U,ch[1]+4*U);x.lineTo(ch[0]-d*34*U,ch[1]+4*U);x.lineTo(ch[0]-d*29*U,ch[1]+(30+fl*24)*U);x.fill();
    limb(c,[hip,[cxx-d*20*U,floor-40*U+bob/2],[cxx-d*26*U,floor]],13*U);limb(c,[hip,[cxx+d*23*U,floor-40*U+bob/2],[cxx+d*20*U,floor]],13*U);
    x.fillStyle='#1a1036';[[cxx-d*26*U],[cxx+d*20*U]].forEach(([fx])=>{x.fillRect(fx-12*U,floor-5*U,24*U,6*U)});
    limb(c,[[ch[0]-d*12*U,ch[1]],[ch[0]-d*30*U,ch[1]+26*U],[ch[0]-d*12*U,ch[1]+40*U]],10*U);
    const tor=x.createLinearGradient(ch[0]-30*U,0,ch[0]+30*U,0);tor.addColorStop(0,'#0e0824');tor.addColorStop(.5,'#2a1c52');tor.addColorStop(1,'#0e0824');
    x.fillStyle=tor;x.lineWidth=2.5;x.strokeStyle=rgb(c);x.beginPath();x.moveTo(cxx-d*18*U,hip[1]);x.lineTo(ch[0]-d*32*U,ch[1]-12*U);x.lineTo(ch[0]-d*8*U,ch[1]-18*U);x.lineTo(ch[0]+d*28*U,ch[1]-12*U);x.lineTo(ch[0]+d*20*U,ch[1]+22*U);x.lineTo(cxx+d*18*U,hip[1]);x.closePath();x.fill();x.stroke();
    x.strokeStyle=rgb(c,.5);x.lineWidth=1;x.beginPath();x.moveTo(ch[0]-d*20*U,ch[1]+30*U);x.lineTo(ch[0]+d*14*U,ch[1]+30*U);x.moveTo(ch[0]-d*16*U,ch[1]+38*U);x.lineTo(ch[0]+d*12*U,ch[1]+38*U);x.stroke();
    const core=1+.25*Math.sin(t*6)+(beam?1.2:0),cg=x.createRadialGradient(ch[0],ch[1]+10*U,0,ch[0],ch[1]+10*U,22*U*core);cg.addColorStop(0,'#fff');cg.addColorStop(.25,rgb(c));cg.addColorStop(1,rgb(c,0));x.fillStyle=cg;x.beginPath();x.arc(ch[0],ch[1]+10*U,22*U*core,0,TAU);x.fill();
    x.fillStyle='#2a1c52';x.strokeStyle=rgb(c);x.lineWidth=2;x.beginPath();x.moveTo(ch[0]+d*14*U,ch[1]-16*U);x.quadraticCurveTo(ch[0]+d*40*U,ch[1]-26*U,ch[0]+d*38*U,ch[1]+2*U);x.lineTo(ch[0]+d*16*U,ch[1]+4*U);x.closePath();x.fill();x.stroke();
    x.fillStyle='#120a2a';x.strokeStyle=rgb(c);x.beginPath();x.moveTo(ch[0]-10*U,ch[1]-16*U);x.lineTo(ch[0]-8*U,ch[1]-38*U);x.lineTo(ch[0]+12*U,ch[1]-40*U);x.lineTo(ch[0]+14*U,ch[1]-16*U);x.closePath();x.fill();x.stroke();
    x.fillStyle='#ffe600';x.shadowColor='#ffe600';x.shadowBlur=12;x.fillRect(ch[0]+(d>0?0:-12)*U,ch[1]-31*U,12*U,4*U);x.shadowBlur=0;
    x.strokeStyle=rgb(c);x.lineWidth=1.5;x.beginPath();x.moveTo(ch[0]-d*4*U,ch[1]-40*U);x.lineTo(ch[0]-d*12*U,ch[1]-56*U);x.stroke();x.fillStyle=rgb(c);x.beginPath();x.arc(ch[0]-d*12*U,ch[1]-56*U,2.5*U,0,TAU);x.fill();
    const ex=ch[0]+d*(26+p*20)*U,ey=ch[1]+(16-p*8)*U,fx=ch[0]+d*(30+p*92)*U,fy=ch[1]+(36-p*26)*U;limb(c,[[ch[0]+d*18*U,ch[1]],[ex,ey],[fx,fy]],11*U);
    x.fillStyle='#fff';x.beginPath();x.arc(fx,fy,7*U,0,TAU);x.fill();return{fist:[fx,fy],core:[ch[0],ch[1]+10*U]}};
  let spk=[],sh=0,lastE=-1,hA=1,hB=1,ko=0,koWho='',pops=[],combo=0,flash=0;
  const scene=(t,pa,pb,ra,rb,beamA,beamB)=>{const a=mech(W*.25,1,COL.AI,pa,ra,t,beamA),b=mech(W*.75,-1,COL.Cyber,pb,rb,t+1,beamB);return[a,b]};
  return (t,dt)=>{
    const e=Math.floor(t*1.05),ip=(t*1.05)%1,atk=e%2===0,beam=e%3===2,p=beam?0:Math.max(0,Math.sin(ip*Math.PI))**3;
    if(ko>0)ko-=dt;else if(e!==lastE&&ip>.46){lastE=e;combo++;const big=beam?.26:.12;atk?hB-=big:hA-=big;sh=beam?16:9;flash=beam?1:.35;
      const who=atk?'AI':'CYBER';pops.push({s:beam?'MEGA BEAM':combo>1?'COMBO x'+combo:'HIT!',x:atk?W*.66:W*.34,y:H*.12,l:1,c:atk?COL.AI:COL.Cyber});
      if(hA<=.02||hB<=.02){ko=2.2;koWho=hA<=.02?'CYBER':'AI';combo=0}}
    if(ko<=0&&(hA<=.02||hB<=.02)){hA=1;hB=1}
    const ox=sh?(rnd()-.5)*sh:0,oy=sh?(rnd()-.5)*sh:0;sh*=.84;if(sh<.4)sh=0;flash*=.88;
    x.save();x.translate(ox,oy);
    const g=x.createLinearGradient(0,0,0,floor);g.addColorStop(0,'#07031a');g.addColorStop(.7,'#3a0f5e');g.addColorStop(1,'#ff2e6e');x.fillStyle=g;x.fillRect(-20,-20,W+40,floor+20);
    const sy=floor-H*.17,sr=W*.22,sg=x.createLinearGradient(0,sy-sr,0,sy+sr);sg.addColorStop(0,'#ffe600');sg.addColorStop(1,'#ff2e6e');x.fillStyle=sg;x.beginPath();x.arc(W/2,sy,sr,0,TAU);x.fill();
    x.fillStyle='#3a0f5e';for(let i=0;i<7;i++){const yy=sy+i*sr*.16,hh=1+i*1.6;x.fillRect(W/2-sr,yy,sr*2,hh)}
    [-1,1].forEach(d=>{const a=-1.57+d*.4+Math.sin(t*.6+d)*.35;x.fillStyle='rgba(201,184,255,.07)';x.beginPath();x.moveTo(W/2+d*W*.38,floor);x.lineTo(W/2+d*W*.38+Math.cos(a-.05)*H,floor+Math.sin(a-.05)*H);x.lineTo(W/2+d*W*.38+Math.cos(a+.05)*H,floor+Math.sin(a+.05)*H);x.fill()});
    sky.forEach(s=>{x.fillStyle='#0a0520';x.fillRect(s.x,floor-s.h,s.w,s.h);s.win.forEach((on,i)=>{if(on){x.fillStyle=i%3?'rgba(255,230,0,.55)':'rgba(22,184,240,.6)';x.fillRect(s.x+3+(i%2)*s.w*.45,floor-s.h+6+Math.floor(i/2)*8,s.w*.3,3)}})});
    x.fillStyle='#07031a';x.fillRect(-20,floor,W+40,H);
    x.save();x.beginPath();x.rect(-20,floor,W+40,H);x.clip();x.translate(0,2*floor);x.scale(1,-1);x.globalAlpha=.22;scene(t,atk?p:0,atk?0:p,atk?0:p*.7,atk?p*.7:0,false,false);x.restore();
    x.strokeStyle='rgba(22,184,240,.45)';x.lineWidth=1;for(let i=-12;i<=12;i++){x.beginPath();x.moveTo(W/2+i*W*.06,floor);x.lineTo(W/2+i*W*.32,H);x.stroke()}
    for(let j=0;j<8;j++){const yy=floor+Math.pow(((j+t*1.5)%8)/8,2)*(H-floor);x.beginPath();x.moveTo(-20,yy);x.lineTo(W+20,yy);x.stroke()}
    const bA=beam&&atk&&ip>.25&&ip<.75,bB=beam&&!atk&&ip>.25&&ip<.75;
    const [A,Bm]=scene(t,atk?p:0,atk?0:p,atk?0:p*.7,atk?p*.7:0,bA,bB);
    if(bA||bB){const s=bA?A.core:Bm.core,e2=bA?Bm.core:A.core,c=bA?COL.AI:COL.Cyber;x.globalCompositeOperation='lighter';
      [[22,.25],[11,.6],[4,1]].forEach(([w,a])=>{x.strokeStyle=w===4?`rgba(255,255,255,${a})`:rgb(c,a);x.lineWidth=w*U;x.beginPath();x.moveTo(s[0],s[1]);x.lineTo(e2[0],e2[1]);x.stroke()});
      x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();x.moveTo(s[0],s[1]);for(let i=1;i<=12;i++){const u=i/12;x.lineTo(s[0]+(e2[0]-s[0])*u,s[1]+(e2[1]-s[1])*u+(rnd()-.5)*18*U)}x.stroke();x.globalCompositeOperation='source-over'}
    if(sh>8&&spk.length<200){const q=atk?(beam?Bm.core:A.fist):(beam?A.core:Bm.fist);for(let i=0;i<26;i++)spk.push([q[0],q[1],(rnd()-.5)*10,(rnd()-.7)*10,1])}
    x.globalCompositeOperation='lighter';spk=spk.filter(s=>(s[4]-=.035)>0);spk.forEach(s=>{s[0]+=s[2];s[1]+=s[3];s[3]+=.25;x.fillStyle=`rgba(255,230,0,${s[4]})`;x.fillRect(s[0],s[1],3,3)});x.globalCompositeOperation='source-over';
    x.restore();
    if(flash>.05){x.fillStyle=`rgba(255,255,255,${flash*.35})`;x.fillRect(0,0,W,H)}
    /* HUD */
    const bw=W*.38,bh=14;[[12,1,hA,COL.AI],[W-12,-1,hB,COL.Cyber]].forEach(([x0,d,h,c])=>{x.save();x.translate(x0,40);x.scale(d,1);x.fillStyle='#000';x.beginPath();x.moveTo(0,0);x.lineTo(bw,0);x.lineTo(bw-8,bh);x.lineTo(0,bh);x.fill();
      const hg=x.createLinearGradient(0,0,bw,0);hg.addColorStop(0,'#fff');hg.addColorStop(.1,rgb(c));hg.addColorStop(1,rgb(c,.7));x.fillStyle=hg;x.beginPath();x.moveTo(bw*(1-Math.max(0,h)),0);x.lineTo(bw,0);x.lineTo(bw-8,bh);x.lineTo(bw*(1-Math.max(0,h)),bh);x.fill();x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.moveTo(0,0);x.lineTo(bw,0);x.lineTo(bw-8,bh);x.lineTo(0,bh);x.closePath();x.stroke();x.restore()});
    x.fillStyle='#fff';x.font='400 20px Anton,Impact,sans-serif';x.fillText('AI · '+TAGC('AI'),12,32);x.textAlign='right';x.fillText(TAGC('Cyber')+' · CYBER',W-12,32);
    x.textAlign='center';x.fillStyle='#ffe600';x.font='400 28px Anton,Impact,sans-serif';x.fillText(DAY.slice(0,2),W/2,54);
    for(let i=pops.length-1;i>=0;i--){const q=pops[i];q.l-=.022;if(q.l<=0){pops.splice(i,1);continue}const s=1+(1-q.l)*.4;x.save();x.translate(q.x,q.y+(1-q.l)*-20+40);x.scale(s,s);x.font='italic 400 26px Anton,Impact,sans-serif';x.lineWidth=5;x.strokeStyle='#000';x.strokeText(q.s,0,0);x.fillStyle=rgb(q.c,q.l);x.fillText(q.s,0,0);x.restore()}
    if(ko>0){const s=1+Math.max(0,ko-1.8)*2.5;x.save();x.translate(W/2,H*.3);x.scale(s,s);x.font='italic 400 '+Math.round(W*.28)+'px Anton,Impact,sans-serif';x.lineWidth=10;x.strokeStyle='#000';x.strokeText('K.O.',0,0);const kg=x.createLinearGradient(0,-W*.2,0,0);kg.addColorStop(0,'#fff');kg.addColorStop(1,'#ffe600');x.fillStyle=kg;x.fillText('K.O.',0,0);x.font='400 20px Anton,Impact,sans-serif';x.fillStyle='#fff';x.fillText(koWho+' WINS',0,30);x.restore()}
    x.textAlign='left'}}},

/* ---------- NEON RAID (replaces Data Heist) ---------- */
{name:'Neon Raid',world:'Space shooter',note:'A neon fighter clears the day wave by wave. Each wave is one story in its topic colour, and every fourth is a boss that fires rings of light.',make(x,W,H){
  const stars=[...Array(150)].map(()=>[rnd()*W,rnd()*H,.3+rnd()*1.8]);
  const neb=[...Array(5)].map(()=>({x:rnd()*W,y:rnd()*H,r:W*(.35+rnd()*.4),c:COL[STORIES[Math.floor(rnd()*N())][0]]}));
  const ship={x:W/2,y:H*.5};let foes=[],shots=[],eb=[],parts=[],rings=[],pops=[],score=0,wave=0,boss=null,fire=0,cur=0,flash=0,banner=0;
  const spawn=()=>{cur=wave%N();wave++;banner=2.2;const c=col(cur),tag=STORIES[cur][0];
    if(wave%4===0){boss={x:W/2,y:-70,ty:H*.18,hp:46,max:46,c,tag,cd:1};return}
    for(let k=0;k<10;k++)foes.push({x:W*(.12+(k%5)*.19),y:-30-k*14,ty:H*(.11+Math.floor(k/5)*.1+(k%2)*.03),c,tag,hp:4,ph:rnd()*TAU,f:0})};
  const shape=(X,Y,r,tag,rot)=>{x.beginPath();const n=tag==='AI'?3:tag==='Tech'?4:6;for(let i=0;i<=n;i++){const a=rot+i/n*TAU-Math.PI/2;i?x.lineTo(X+Math.cos(a)*r,Y+Math.sin(a)*r):x.moveTo(X+Math.cos(a)*r,Y+Math.sin(a)*r)}};
  const boom=(X,Y,c,n,sp)=>{for(let i=0;i<n;i++){const a=rnd()*TAU,s=rnd()*sp;parts.push({x:X,y:Y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,c})}rings.push({x:X,y:Y,r:4,l:1,c})};
  return (t,dt)=>{
    if(foes.length<4&&!boss&&(!foes.length||banner<1.2))spawn();banner=Math.max(0,banner-dt);flash*=.9;
    x.fillStyle='#03010a';x.fillRect(0,0,W,H);
    x.globalCompositeOperation='lighter';
    neb.forEach(n=>{n.y+=.15;if(n.y-n.r>H)n.y=-n.r;const g=x.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);g.addColorStop(0,rgb(n.c,.22));g.addColorStop(1,rgb(n.c,0));x.fillStyle=g;x.fillRect(n.x-n.r,n.y-n.r,n.r*2,n.r*2)});
    stars.forEach(s=>{s[1]+=s[2]*1.6;if(s[1]>H){s[1]=0;s[0]=rnd()*W}x.fillStyle=`rgba(220,230,255,${.25+s[2]*.35})`;x.fillRect(s[0],s[1],1.2,s[2]*3)});
    /* ship */
    let tx=W/2;const tgt=boss||foes.reduce((a,f)=>!a||Math.abs(f.x-ship.x)<Math.abs(a.x-ship.x)?f:a,null);if(tgt)tx=tgt.x;
    ship.x+=(tx+Math.sin(t*2.3)*W*.08-ship.x)*.05;ship.y=H*.5+Math.sin(t*1.7)*H*.025;
    fire-=dt;if(fire<=0){fire=.085;shots.push({x:ship.x-11,y:ship.y-14},{x:ship.x+11,y:ship.y-14})}
    shots.forEach(s=>s.y-=11);shots=shots.filter(s=>s.y>-20);
    x.lineCap='round';shots.forEach(s=>{x.strokeStyle='rgba(22,184,240,.5)';x.lineWidth=5;x.beginPath();x.moveTo(s.x,s.y);x.lineTo(s.x,s.y+16);x.stroke();x.strokeStyle='#fff';x.lineWidth=1.6;x.stroke()});
    /* foes */
    foes.forEach(f=>{f.y+=(f.ty-f.y)*.04;f.x+=Math.sin(t*1.4+f.ph)*.8;f.f*=.85;
      shots.forEach(s=>{if(!s.d&&Math.abs(s.x-f.x)<18&&Math.abs(s.y-f.y)<18){s.d=1;f.hp--;f.f=1;parts.push({x:s.x,y:s.y,vx:(rnd()-.5)*3,vy:-rnd()*3,l:.7,c:[255,255,255]})}});
      const g=x.createRadialGradient(f.x,f.y,0,f.x,f.y,40);g.addColorStop(0,rgb(f.c,.5+f.f*.5));g.addColorStop(1,rgb(f.c,0));x.fillStyle=g;x.fillRect(f.x-40,f.y-40,80,80);
      shape(f.x,f.y,17,f.tag,t*1.5+f.ph);x.lineWidth=3;x.strokeStyle=f.f>.3?'#fff':rgb(f.c);x.stroke();shape(f.x,f.y,7,f.tag,-t*2);x.fillStyle='#fff';x.fill()});
    shots=shots.filter(s=>!s.d);
    foes=foes.filter(f=>{if(f.hp<=0){boom(f.x,f.y,f.c,26,5);score+=100;pops.push({x:f.x,y:f.y,s:'+100',l:1,c:f.c});return false}return true});
    /* boss */
    if(boss){const b=boss;b.y+=(b.ty-b.y)*.03;b.x=W/2+Math.sin(t*.7)*W*.22;b.cd-=dt;
      if(b.cd<=0&&b.y>b.ty-20){b.cd=.55;const off=t*1.7;for(let i=0;i<18;i++){const a=off+i/18*TAU;eb.push({x:b.x,y:b.y,vx:Math.cos(a)*2.4,vy:Math.sin(a)*2.4,c:b.c})}}
      shots.forEach(s=>{if(!s.d&&Math.hypot(s.x-b.x,s.y-b.y)<36){s.d=1;b.hp--;parts.push({x:s.x,y:s.y,vx:(rnd()-.5)*4,vy:-rnd()*3,l:.8,c:b.c})}});shots=shots.filter(s=>!s.d);
      const g=x.createRadialGradient(b.x,b.y,0,b.x,b.y,110);g.addColorStop(0,rgb(b.c,.55));g.addColorStop(1,rgb(b.c,0));x.fillStyle=g;x.fillRect(b.x-110,b.y-110,220,220);
      for(let r=0;r<3;r++){shape(b.x,b.y,44-r*12,b.tag,t*(r%2?-1:1)*(.8+r*.5));x.lineWidth=3-r*.6;x.strokeStyle=r===1?'#fff':rgb(b.c);x.stroke()}
      for(let i=0;i<6;i++){const a=t*1.2+i/6*TAU;x.fillStyle=rgb(b.c);x.beginPath();x.arc(b.x+Math.cos(a)*56,b.y+Math.sin(a)*20,4,0,TAU);x.fill()}
      x.fillStyle='#fff';x.beginPath();x.arc(b.x,b.y,7+Math.sin(t*9)*2,0,TAU);x.fill();
      if(b.hp<=0){boom(b.x,b.y,b.c,90,9);boom(b.x,b.y,[255,255,255],30,4);rings.push({x:b.x,y:b.y,r:10,l:1.4,c:b.c});score+=5000;pops.push({x:b.x,y:b.y,s:'+5,000',l:1.3,c:b.c});flash=1;boss=null;eb=[]}}
    eb.forEach(e=>{e.x+=e.vx;e.y+=e.vy});eb=eb.filter(e=>e.x>-10&&e.x<W+10&&e.y>-10&&e.y<H+10);
    eb.forEach(e=>{const g=x.createRadialGradient(e.x,e.y,0,e.x,e.y,8);g.addColorStop(0,'#fff');g.addColorStop(.35,rgb(e.c,.9));g.addColorStop(1,rgb(e.c,0));x.fillStyle=g;x.fillRect(e.x-8,e.y-8,16,16)});
    parts=parts.filter(p=>(p.l-=.022)>0);parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.97;p.vy*=.97;x.fillStyle=rgb(p.c,p.l);x.fillRect(p.x,p.y,2.6,2.6)});
    rings=rings.filter(r=>(r.l-=.03)>0);rings.forEach(r=>{r.r+=4.5;x.strokeStyle=rgb(r.c,Math.min(1,r.l));x.lineWidth=3;x.beginPath();x.arc(r.x,r.y,r.r,0,TAU);x.stroke()});
    /* player ship */
    const fl=.7+.3*Math.sin(t*50),eg=x.createLinearGradient(0,ship.y+8,0,ship.y+40*fl);eg.addColorStop(0,'rgba(255,255,255,.95)');eg.addColorStop(.3,'rgba(22,184,240,.8)');eg.addColorStop(1,'rgba(22,184,240,0)');x.fillStyle=eg;x.beginPath();x.moveTo(ship.x-6,ship.y+8);x.lineTo(ship.x+6,ship.y+8);x.lineTo(ship.x,ship.y+40*fl);x.fill();
    const sg=x.createRadialGradient(ship.x,ship.y,0,ship.x,ship.y,40);sg.addColorStop(0,'rgba(22,184,240,.35)');sg.addColorStop(1,'rgba(22,184,240,0)');x.fillStyle=sg;x.fillRect(ship.x-40,ship.y-40,80,80);
    x.globalCompositeOperation='source-over';
    x.fillStyle='#0b0620';x.strokeStyle='#16b8f0';x.lineWidth=2;x.beginPath();x.moveTo(ship.x,ship.y-22);x.lineTo(ship.x+8,ship.y-4);x.lineTo(ship.x+22,ship.y+8);x.lineTo(ship.x+7,ship.y+10);x.lineTo(ship.x,ship.y+5);x.lineTo(ship.x-7,ship.y+10);x.lineTo(ship.x-22,ship.y+8);x.lineTo(ship.x-8,ship.y-4);x.closePath();x.fill();x.stroke();
    x.fillStyle='#fff';x.beginPath();x.ellipse(ship.x,ship.y-6,3,6,0,0,TAU);x.fill();x.fillStyle='#ff2e6e';x.fillRect(ship.x-21,ship.y+6,4,3);x.fillRect(ship.x+17,ship.y+6,4,3);
    for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.l-=.02;p.y-=.6;if(p.l<=0){pops.splice(i,1);continue}x.font='400 17px Anton,Impact,sans-serif';x.textAlign='center';x.fillStyle=rgb(p.c,Math.min(1,p.l));x.fillText(p.s,p.x,p.y);x.textAlign='left'}
    if(flash>.05){x.fillStyle=`rgba(255,255,255,${flash*.4})`;x.fillRect(0,0,W,H)}
    /* HUD */
    x.font='400 22px Anton,Impact,sans-serif';x.fillStyle='#fff';x.fillText(String(score).padStart(6,'0'),12,30);x.textAlign='right';x.fillStyle='#ffe600';x.fillText('WAVE '+wave,W-12,30);x.textAlign='left';
    if(boss){x.fillStyle='rgba(255,255,255,.15)';x.fillRect(12,40,W-24,6);x.fillStyle=rgb(boss.c);x.fillRect(12,40,(W-24)*Math.max(0,boss.hp/boss.max),6)}
    if(banner>0){const a=Math.min(1,banner*2,(2.2-banner)*4);x.globalAlpha=a;x.fillStyle='rgba(3,1,10,.7)';x.fillRect(0,H*.28,W,46);x.fillStyle=rgb(col(cur));x.fillRect(0,H*.28,4,46);
      x.font='700 11px "Space Mono",monospace';x.fillStyle=rgb(col(cur));x.fillText((wave%4===0?'BOSS · ':'WAVE '+wave+' · ')+STORIES[cur][0].toUpperCase(),14,H*.28+17);x.font='700 15px "Space Grotesk",sans-serif';x.fillStyle='#fff';x.fillText(STORIES[cur][1].slice(0,38),14,H*.28+36);x.globalAlpha=1}}}},

/* ---------- REACTOR CORE (replaces Transit Lines) ---------- */
{name:'Reactor Core',world:'Neon machine',note:'A plasma reactor powered by the day. Each story is a charging cell; when it fills, lightning arcs into the core, and every few seconds the whole reactor surges.',make(x,W,H){
  const cx=W/2,top=H*.03,bot=H*.6,cw=W*.15,cy=H*.3;
  const cells=STORIES.map((s,i)=>{const a=-Math.PI/2+(i+.5)/N()*TAU;return{a,c:col(i),tag:s[0],i,ch:rnd(),f:0}});
  const rings=[0,1,2,3].map(i=>({y:H*(.1+i*.12),rx:W*(.3-i*.02),sp:(i%2?-1:1)*(.5+i*.15),c:COL[['AI','Tech','Cyber','AI'][i]]}));
  const pl=[...Array(70)].map(()=>({y:rnd(),x:rnd()-.5,s:.003+rnd()*.007}));let arcs=[],surge=0,nextS=4,wave=[];
  const bolt=(x0,y0,x1,y1,c,w)=>{const pts=[[x0,y0]];for(let i=1;i<10;i++){const u=i/10;pts.push([x0+(x1-x0)*u+(rnd()-.5)*18,y0+(y1-y0)*u+(rnd()-.5)*18])}pts.push([x1,y1]);[[w*4,.18],[w*1.8,.5],[w*.7,1]].forEach(([lw,a],k)=>{x.strokeStyle=k===2?`rgba(255,255,255,${a})`:rgb(c,a);x.lineWidth=lw;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()})};
  const ringHalf=(r,front,t)=>{const ry=r.rx*.2,a0=front?0:Math.PI,sp=1+surge*3;x.lineWidth=2;x.strokeStyle=rgb(r.c,front?.8:.35);x.beginPath();x.ellipse(cx,r.y,r.rx,ry,0,a0,a0+Math.PI);x.stroke();
    for(let i=0;i<16;i++){const a=(i/16*TAU+t*r.sp*sp)%TAU,aa=a<0?a+TAU:a,isF=aa<Math.PI;if(isF!==front)continue;const X=cx+Math.cos(aa)*r.rx,Y=r.y+Math.sin(aa)*ry,g=x.createRadialGradient(X,Y,0,X,Y,9);g.addColorStop(0,'#fff');g.addColorStop(.3,rgb(r.c));g.addColorStop(1,rgb(r.c,0));x.fillStyle=g;x.fillRect(X-9,Y-9,18,18)}};
  return (t,dt)=>{
    nextS-=dt;if(nextS<=0){nextS=5;surge=1;wave.push({r:cw,l:1});cells.forEach(c=>{arcs.push({c,l:1})})}surge*=.96;
    const mix=STORIES.map((s,i)=>col(i)),cc=mix[Math.floor(t*.6)%mix.length];
    x.fillStyle='#04020c';x.fillRect(0,0,W,H);
    x.globalCompositeOperation='lighter';const hg=x.createRadialGradient(cx,cy,0,cx,cy,W*(.8+surge*.4));hg.addColorStop(0,rgb(cc,.25+surge*.35));hg.addColorStop(1,rgb(cc,0));x.fillStyle=hg;x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';
    x.strokeStyle='rgba(124,77,255,.25)';x.lineWidth=1;for(let i=-10;i<=10;i++){x.beginPath();x.moveTo(cx+i*W*.05,bot);x.lineTo(cx+i*W*.25,H);x.stroke()}for(let j=0;j<6;j++){const yy=bot+Math.pow(j/6,1.8)*(H-bot);x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke()}
    x.globalCompositeOperation='lighter';rings.forEach(r=>ringHalf(r,false,t));x.globalCompositeOperation='source-over';
    /* column */
    const mg=x.createLinearGradient(cx-cw,0,cx+cw,0);mg.addColorStop(0,'#0c0820');mg.addColorStop(.35,'#3a2f60');mg.addColorStop(.5,'#6b5ca0');mg.addColorStop(.65,'#3a2f60');mg.addColorStop(1,'#0c0820');x.fillStyle=mg;x.fillRect(cx-cw,top,cw*2,bot-top);
    const gt=H*.12,gb=H*.5;const pg=x.createLinearGradient(0,gt,0,gb);mix.forEach((c,i)=>pg.addColorStop(((i/mix.length)+t*.08)%1,rgb(c,.95)));x.fillStyle='#000';x.fillRect(cx-cw*.72,gt,cw*1.44,gb-gt);
    x.globalCompositeOperation='lighter';x.fillStyle=pg;x.globalAlpha=.55+surge*.45;x.fillRect(cx-cw*.72,gt,cw*1.44,gb-gt);x.globalAlpha=1;
    const cg=x.createLinearGradient(cx-cw*.72,0,cx+cw*.72,0);cg.addColorStop(0,'rgba(255,255,255,0)');cg.addColorStop(.5,`rgba(255,255,255,${.55+surge*.4})`);cg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=cg;x.fillRect(cx-cw*.72,gt,cw*1.44,gb-gt);
    pl.forEach(p=>{p.y-=p.s*(1+surge*4);if(p.y<0)p.y=1;const X=cx+p.x*cw*1.3+Math.sin(t*3+p.y*20)*3,Y=gt+p.y*(gb-gt);x.fillStyle='rgba(255,255,255,.8)';x.fillRect(X,Y,2,2)});
    x.globalCompositeOperation='source-over';
    x.fillStyle='#1d1638';[gt-10,gb].forEach(y=>{x.fillRect(cx-cw*1.15,y,cw*2.3,10)});x.strokeStyle='rgba(201,184,255,.5)';x.lineWidth=1;[gt-10,gb].forEach(y=>x.strokeRect(cx-cw*1.15,y,cw*2.3,10));
    for(let i=0;i<6;i++){x.fillStyle=Math.sin(t*4+i)>0?'#ffe600':'#3a2f60';x.fillRect(cx-cw*.9+i*cw*.36,gt-7,cw*.2,4)}
    x.globalCompositeOperation='lighter';rings.forEach(r=>ringHalf(r,true,t));
    /* cells and arcs */
    const R=W*.41,RY=H*.2;cells.forEach(c=>{c.ch+=dt*(.18+.05*(c.i%3));c.f*=.9;const X=cx+Math.cos(c.a)*R,Y=cy+Math.sin(c.a)*RY;c.X=X;c.Y=Y;if(c.ch>=1){c.ch=0;c.f=1;arcs.push({c,l:1})}});
    arcs=arcs.filter(a=>(a.l-=.08)>0);arcs.forEach(a=>bolt(a.c.X,a.c.Y,cx+(rnd()-.5)*cw,cy+(rnd()-.5)*H*.15,a.c.c,2.2*a.l+.5));
    if(rnd()<.25+surge){const c=cells[Math.floor(rnd()*cells.length)];bolt(cx-cw*.6+rnd()*cw*1.2,gt+rnd()*(gb-gt),cx+(rnd()-.5)*cw*2.6,gt+rnd()*(gb-gt),c.c,.8)}
    cells.forEach(c=>{const X=c.X,Y=c.Y,g=x.createRadialGradient(X,Y,0,X,Y,30+c.f*30);g.addColorStop(0,rgb(c.c,.6+c.f*.4));g.addColorStop(1,rgb(c.c,0));x.fillStyle=g;x.fillRect(X-60,Y-60,120,120)});
    x.globalCompositeOperation='source-over';
    cells.forEach(c=>{const X=c.X,Y=c.Y,w=W*.07,h=w*1.5;x.fillStyle='#0e0a20';x.strokeStyle=rgb(c.c);x.lineWidth=2;x.beginPath();x.roundRect?x.roundRect(X-w/2,Y-h/2,w,h,5):x.rect(X-w/2,Y-h/2,w,h);x.fill();x.stroke();
      const fh=(h-6)*c.ch;x.fillStyle=rgb(c.c,.85);x.fillRect(X-w/2+3,Y+h/2-3-fh,w-6,fh);x.fillStyle='#fff';x.fillRect(X-w/2+3,Y+h/2-3-fh,w-6,1.5);
      x.font='700 9px "Space Mono",monospace';x.textAlign='center';x.fillStyle='#fff';x.fillText(c.tag.toUpperCase(),X,Y-h/2-5);x.textAlign='left'});
    x.globalCompositeOperation='lighter';wave=wave.filter(w=>(w.l-=.02)>0);wave.forEach(w=>{w.r+=W*.025;x.strokeStyle=rgb(cc,w.l);x.lineWidth=4*w.l;x.beginPath();x.ellipse(cx,cy,w.r,w.r*.45,0,0,TAU);x.stroke()});
    if(surge>.5){x.fillStyle=rgb(cc,(surge-.5)*.3);x.fillRect(0,0,W,H)}x.globalCompositeOperation='source-over';
    x.font='700 10px "Space Mono",monospace';x.fillStyle='rgba(255,255,255,.7)';x.fillText('CORE OUTPUT',12,22);x.font='400 26px Anton,Impact,sans-serif';x.fillStyle='#fff';x.fillText(N()+' STORIES',12,48);
    x.textAlign='right';x.font='700 10px "Space Mono",monospace';['AI','Tech','Cyber'].forEach((g,i)=>{x.fillStyle=rgb(COL[g]);x.fillText(g.toUpperCase()+' '+TAGC(g),W-12,22+i*14)});x.textAlign='left';
    if(surge>.3){x.font='400 '+Math.round(W*.1)+'px Anton,Impact,sans-serif';x.textAlign='center';x.fillStyle=`rgba(255,255,255,${surge})`;x.fillText('SURGE',cx,H*.05+W*.1);x.textAlign='left'}}}},

/* ---------- STAR WHALE (Leviathan sibling 1) ---------- */
{name:'Star Whale',world:'Cosmic creature',note:'A colossal whale swims through a nebula, glowing like the Leviathan. Each story is a light on its flank, and a shoal of stars follows it.',make(x,W,H){
  const NS=100,seg=W*.0105,S=[...Array(NS)].map((_,i)=>({x:W*1.2+i*seg,y:H*.3,a:0}));
  const stars=[...Array(160)].map(()=>[rnd()*W,rnd()*H,rnd()]),krill=[...Array(120)].map(()=>({x:rnd()*W,y:rnd()*H,vx:0,vy:0,c:rnd()}));
  const neb=[[.2,.2,'124,77,255'],[.8,.4,'22,184,240'],[.5,.15,'255,46,110']];
  const wid=u=>{const m=W*.105;return(u<.3?m*Math.pow(u/.3,.42):m*Math.pow(1-(u-.3)/.7,1.15))+1.5};let lastX=1e9;
  return (t,dt)=>{
    x.fillStyle='rgba(3,2,14,.55)';x.fillRect(0,0,W,H);
    x.globalCompositeOperation='lighter';
    neb.forEach(([nx,ny,c],i)=>{const X=W*nx+Math.sin(t*.1+i)*20,Y=H*ny,r=W*.7,g=x.createRadialGradient(X,Y,0,X,Y,r);g.addColorStop(0,`rgba(${c},.05)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(X-r,Y-r,r*2,r*2)});
    stars.forEach(s=>{const tw=.3+.7*Math.abs(Math.sin(t*.8+s[2]*20));x.fillStyle=`rgba(230,235,255,${tw*(.2+s[2]*.5)})`;x.fillRect(s[0],s[1],1.3,1.3)});
    for(let i=0;i<3;i++){const bx=W*(.2+i*.3)+Math.sin(t*.15+i)*30,g=x.createLinearGradient(0,0,0,H*.7);g.addColorStop(0,'rgba(201,184,255,.07)');g.addColorStop(1,'rgba(201,184,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(bx-10,0);x.lineTo(bx+10,0);x.lineTo(bx+90,H*.7);x.lineTo(bx-90,H*.7);x.fill()}
    /* head path: slow figure of eight across the frame */
    S[0].x=W*.85-((t*W*.075)%(W*2.4));S[0].y=H*.3+Math.sin(t*.35)*H*.08+Math.sin(t*1.1)*H*.008;if(S[0].x>lastX+W){S.forEach((q,i)=>{q.x=S[0].x+i*seg;q.y=S[0].y})}lastX=S[0].x;
    for(let i=1;i<NS;i++){const a=S[i-1],b=S[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;b.x=a.x+dx/d*seg;b.y=a.y+dy/d*seg;b.a=Math.atan2(dy,dx)}S[0].a=S[1].a;
    const sw=Math.sin(t*1.6);for(let i=NS*.55|0;i<NS;i++){const u=(i-NS*.55)/(NS*.45),n=S[i].a+1.57;S[i].x+=Math.cos(n)*sw*u*u*6;S[i].y+=Math.sin(n)*sw*u*u*6}
    /* krill follow the whale */
    const tail=S[NS*.4|0];krill.forEach(k=>{k.vx+=(tail.x-k.x)*.0006+(rnd()-.5)*.25;k.vy+=(tail.y-k.y)*.0006+(rnd()-.5)*.25;k.vx*=.97;k.vy*=.97;k.x+=k.vx;k.y+=k.vy;x.fillStyle=k.c<.5?'rgba(120,240,255,.6)':'rgba(201,184,255,.5)';x.fillRect(k.x,k.y,1.6,1.6)});
    x.globalCompositeOperation='source-over';
    const side=k=>S.map((s,i)=>{const w=wid(i/NS)*k,n=s.a+1.57;return[s.x+Math.cos(n)*w,s.y+Math.sin(n)*w]});const top=side(1),btm=side(-1);
    /* pectoral fin */
    const fs=S[20],fw=wid(20/NS),fn=fs.a-1.57,fa=fs.a+Math.PI*.82+Math.sin(t*1.3)*.35,fl=W*.2;const f0=[fs.x+Math.cos(fn)*fw*.7,fs.y+Math.sin(fn)*fw*.7];
    x.fillStyle='#0d1a4a';x.strokeStyle='rgba(120,240,255,.8)';x.lineWidth=1.5;x.beginPath();x.moveTo(f0[0],f0[1]);x.quadraticCurveTo(f0[0]+Math.cos(fa-.25)*fl*.6,f0[1]+Math.sin(fa-.25)*fl*.6,f0[0]+Math.cos(fa)*fl,f0[1]+Math.sin(fa)*fl);x.quadraticCurveTo(f0[0]+Math.cos(fa+.3)*fl*.5,f0[1]+Math.sin(fa+.3)*fl*.5,f0[0]+Math.cos(fs.a)*fw*.8,f0[1]+Math.sin(fs.a)*fw*.8);x.fill();x.stroke();
    /* body */
    const g=x.createLinearGradient(S[0].x,S[0].y-W*.12,S[0].x,S[0].y+W*.12);g.addColorStop(0,'#16245e');g.addColorStop(.6,'#0a1238');g.addColorStop(1,'#1b2f70');
    x.fillStyle=g;x.beginPath();top.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));for(let i=NS-1;i>=0;i--)x.lineTo(btm[i][0],btm[i][1]);x.closePath();x.fill();
    /* fluke */
    const e=S[NS-1],ea=e.a,fk=W*.12,fsw=Math.sin(t*1.6+.6)*.3;[1,-1].forEach(k=>{const n=ea+k*1.57;x.fillStyle='#0d1a4a';x.beginPath();x.moveTo(e.x,e.y);x.quadraticCurveTo(e.x+Math.cos(n)*fk*.5,e.y+Math.sin(n)*fk*.5,e.x+Math.cos(n+k*.0)*fk+Math.cos(ea)*fk*.5,e.y+Math.sin(n)*fk+Math.sin(ea)*fk*.5+fsw*fk);x.quadraticCurveTo(e.x+Math.cos(ea)*fk*.35,e.y+Math.sin(ea)*fk*.35,e.x,e.y);x.fill();x.strokeStyle='rgba(120,240,255,.8)';x.lineWidth=1.5;x.stroke()});
    x.globalCompositeOperation='lighter';
    /* throat grooves on the belly side */
    x.lineWidth=1;for(let k=1;k<=5;k++){x.strokeStyle=`rgba(120,240,255,${.18+.25*Math.sin(t*2-k)**2})`;x.beginPath();for(let i=3;i<34;i++){const s=S[i],w=wid(i/NS)*(-1+k*.11),n=s.a+1.57,X=s.x+Math.cos(n)*w,Y=s.y+Math.sin(n)*w;i>3?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke()}
    /* outline and travelling glow */
    x.lineWidth=2;x.strokeStyle='rgba(120,240,255,.85)';[top,btm].forEach(L=>{x.beginPath();L.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()});
    for(let i=4;i<NS-4;i+=2){const s=S[i],w=wid(i/NS)*.45,n=s.a+1.57,pu=Math.sin(i*.25-t*3)**8;if(pu<.05)continue;x.fillStyle=`rgba(120,240,255,${pu*.8})`;x.beginPath();x.arc(s.x+Math.cos(n)*w,s.y+Math.sin(n)*w,1.6+pu*1.4,0,TAU);x.fill()}
    /* story lights on the flank */
    STORIES.forEach((st,i)=>{const j=Math.round(NS*(.2+i/Math.max(1,N()-1)*.45)),s=S[j],w=wid(j/NS)*.15,n=s.a+1.57,X=s.x+Math.cos(n)*w,Y=s.y+Math.sin(n)*w,c=col(i),p=.6+.4*Math.sin(t*2.2-i*.8),r=W*.022*p+3,gg=x.createRadialGradient(X,Y,0,X,Y,r*2.6);gg.addColorStop(0,'rgba(255,255,255,1)');gg.addColorStop(.25,rgb(c,.95));gg.addColorStop(1,rgb(c,0));x.fillStyle=gg;x.fillRect(X-r*2.6,Y-r*2.6,r*5.2,r*5.2)});
    const h=S[2],hn=h.a+1.57,eX=h.x+Math.cos(h.a)*-W*.0+Math.cos(hn)*wid(.03)*.2,eY=h.y+Math.sin(hn)*wid(.03)*.2;x.fillStyle='#fff';x.beginPath();x.arc(eX,eY,2.4,0,TAU);x.fill();
    x.globalCompositeOperation='source-over'}}},

/* ---------- ABYSS BLOOM (Leviathan sibling 2) ---------- */
{name:'Abyss Bloom',world:'Deep-sea creature',note:'A giant jellyfish pulses through the deep, in the Leviathan\'s waters. Each story is a long tentacle in its topic colour, with light running down it.',make(x,W,H){
  const NT=STORIES.length,TL=28,thin=16,TH=20;
  const bell={x:W/2,y:H*.27,vy:0};
  const mkT=(n,len)=>[...Array(n)].map(()=>({p:[...Array(len)].map((_,j)=>({x:W/2,y:H*.29+j*8,px:W/2,py:H*.29+j*8}))}));
  const T=mkT(NT,TL),Th=mkT(thin,TH),snow=[...Array(110)].map(()=>[rnd()*W,rnd()*H,.2+rnd()*.6,rnd()]);
  const minis=[...Array(5)].map((_,i)=>({x:rnd()*W,y:rnd()*H,s:.4+rnd()*.4,c:col(i),ph:rnd()*TAU}));
  const hist=[];const HL=80;
  /* calm flow: each point follows where the bell was a moment ago, plus one slow travelling wave, so tentacles trail and drift instead of whipping */
  const step=(L,ox,oy,segL,amp,t,k)=>{for(let j=0;j<L.p.length;j++){const h=hist[Math.min(hist.length-1,j*2)]||hist[0],f=j/(L.p.length-1),q=L.p[j];
    q.x=h[0]+ox*(1-f*.35)+Math.sin(t*.85-j*.21+k)*amp*f*(.35+f)+Math.sin(t*.47-j*.11+k*2.3)*amp*.55*f;q.y=h[1]+oy+j*segL*(1-.07*Math.sin(t*.7+k-j*.05))}};
  return (t,dt)=>{
    const cyc=(t%3.6)/3.6,con=cyc<.28?Math.sin(cyc/.28*Math.PI/2):Math.cos((cyc-.28)/.72*Math.PI/2),R=W*.25*(1-con*.13),Hb=R*(.78+con*.13);
    bell.y=H*.27-Math.sin(t*TAU/3.6-.6)*H*.02;bell.x=W/2+Math.sin(t*.21)*W*.13;hist.unshift([bell.x,bell.y]);if(hist.length>HL)hist.pop();
    x.fillStyle='rgba(2,6,24,.55)';x.fillRect(0,0,W,H);
    x.globalCompositeOperation='lighter';
    for(let i=0;i<4;i++){const g=x.createLinearGradient(0,0,0,H*.8),bx=W*(.12+i*.26)+Math.sin(t*.2+i)*22;g.addColorStop(0,'rgba(22,184,240,.07)');g.addColorStop(1,'rgba(22,184,240,0)');x.fillStyle=g;x.beginPath();x.moveTo(bx-16,0);x.lineTo(bx+16,0);x.lineTo(bx+70,H*.8);x.lineTo(bx-70,H*.8);x.fill()}
    snow.forEach(s=>{s[1]+=s[2]*.5;s[0]+=Math.sin(t+s[3]*9)*.15;if(s[1]>H)s[1]=0;x.fillStyle=`rgba(190,235,255,${.12+s[3]*.4})`;x.fillRect(s[0],s[1],1.5,1.5)});
    minis.forEach(m=>{m.y-=.35*m.s;m.x+=Math.sin(t*.5+m.ph)*.3;if(m.y<-40){m.y=H+20;m.x=rnd()*W}const r=W*.035*m.s*(1+.1*Math.sin(t*2.4+m.ph)),g=x.createRadialGradient(m.x,m.y,0,m.x,m.y,r*2.2);g.addColorStop(0,rgb(m.c,.35));g.addColorStop(1,rgb(m.c,0));x.fillStyle=g;x.fillRect(m.x-r*2.2,m.y-r*2.2,r*4.4,r*4.4);
      x.strokeStyle=rgb(m.c,.5);x.lineWidth=1;x.beginPath();x.ellipse(m.x,m.y,r,r*.7,0,Math.PI,TAU);x.stroke();for(let k=-2;k<=2;k++){x.beginPath();x.moveTo(m.x+k*r*.35,m.y);x.quadraticCurveTo(m.x+k*r*.35+Math.sin(t*2+k)*4,m.y+r*1.5,m.x+k*r*.4,m.y+r*3);x.stroke()}});
    /* tentacles hang from the rim */
    const rimY=bell.y+Hb*.08;
    Th.forEach((L,k)=>{const u=k/(thin-1)*2-1;step(L,u*R*.92,Hb*.08-Math.abs(u)*2,7,16,t,k);x.strokeStyle='rgba(170,240,255,.28)';x.lineWidth=1;x.beginPath();L.p.forEach((q,j)=>j?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke()});
    T.forEach((L,k)=>{const u=NT>1?(k/(NT-1)*1.3-.65):0,c=col(k);step(L,u*R*.7,Hb*.08,9.5,30,t,k*1.7);
      x.lineCap='round';[[7,.12],[3,.45],[1.2,.95]].forEach(([w,a])=>{x.strokeStyle=rgb(c,a);x.lineWidth=w;x.beginPath();L.p.forEach((q,j)=>j?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke()});
      const pj=((t*4.5+k*5)%(TL+6));if(pj<TL){const q=L.p[Math.floor(pj)],g=x.createRadialGradient(q.x,q.y,0,q.x,q.y,10);g.addColorStop(0,'#fff');g.addColorStop(.3,rgb(c));g.addColorStop(1,rgb(c,0));x.fillStyle=g;x.fillRect(q.x-10,q.y-10,20,20)}});
    /* bell */
    const bg=x.createRadialGradient(bell.x,bell.y-Hb*.4,0,bell.x,bell.y,R*1.2);bg.addColorStop(0,'rgba(255,255,255,.22)');bg.addColorStop(.35,'rgba(120,200,255,.16)');bg.addColorStop(1,'rgba(124,77,255,.08)');
    x.fillStyle=bg;x.beginPath();x.moveTo(bell.x-R,rimY);x.bezierCurveTo(bell.x-R,bell.y-Hb*1.15,bell.x+R,bell.y-Hb*1.15,bell.x+R,rimY);
    for(let i=12;i>=0;i--){const u=i/12,X=bell.x-R+u*2*R,Y=rimY+Math.sin(u*Math.PI*6+t*1.4)*2*(1-con);x.lineTo(X,Y)}x.closePath();x.fill();
    x.strokeStyle='rgba(170,240,255,.75)';x.lineWidth=2;x.stroke();
    const gl=x.createRadialGradient(bell.x,bell.y-Hb*.35,0,bell.x,bell.y-Hb*.35,R*.9);gl.addColorStop(0,rgb(col(0),.3));gl.addColorStop(1,rgb(col(0),0));x.fillStyle=gl;x.fillRect(bell.x-R,bell.y-Hb*1.3,R*2,Hb*1.6);
    for(let k=0;k<4;k++){const a=k/4*TAU+t*.15,X=bell.x+Math.cos(a)*R*.32,Y=bell.y-Hb*.4+Math.sin(a)*Hb*.16,c=col(k+1),g=x.createRadialGradient(X,Y,0,X,Y,R*.22);g.addColorStop(0,rgb(c,.55));g.addColorStop(1,rgb(c,0));x.fillStyle=g;x.beginPath();x.arc(X,Y,R*.22,0,TAU);x.fill()}
    for(let i=0;i<=20;i++){const u=i/20,X=bell.x-R+u*2*R,Y=rimY+Math.sin(u*Math.PI*6+t*1.4)*2*(1-con),on=Math.sin(u*12-t*1.8)>.3;x.fillStyle=on?'#fff':'rgba(170,240,255,.5)';x.beginPath();x.arc(X,Y,on?2.2:1.4,0,TAU);x.fill()}
    x.globalCompositeOperation='source-over'}}},
{name:'Abyss Serpent',world:'Deep-sea snake game',note:'The Leviathan as a hatchling, playing snake. It starts small with one light inside, hunts the day\'s stories through the deep, and grows longer with every light it swallows.',make(x,W,H){
  const SN=[...Array(120)].map(()=>[rnd()*W,rnd()*H,.2+rnd()*.6,rnd()]),seg=H*.0078,X0=W*.1,X1=W*.9,Y0=H*.1,Y1=H*.56;
  const BASE=18,PER=13,NS=()=>STORIES.length;
  let hx=W*.5,hy=H*.33,ang=-.4,len=BASE,eaten=0,food=null,hold=0,parts=[],rings=[],pulses=[],hist=[];
  for(let i=0;i<BASE+2;i++)hist.push([hx+Math.cos(ang+Math.PI)*seg*i,hy+Math.sin(ang+Math.PI)*seg*i]);
  const place=()=>{let fx,fy,tries=0;do{fx=X0+rnd()*(X1-X0);fy=Y0+rnd()*(Y1-Y0);tries++}while(Math.hypot(fx-hx,fy-hy)<W*.3&&tries<20);food={x:fx,y:fy,i:eaten,born:0}};
  place();
  return (t,dt)=>{
    dt=Math.min(dt||1/60,.05);
    x.fillStyle='rgba(2,6,24,.5)';x.fillRect(0,0,W,H);
    for(let i=0;i<4;i++){const g=x.createLinearGradient(0,0,0,H*.8),bx=W*(.15+i*.25)+Math.sin(t*.2+i)*22;g.addColorStop(0,'rgba(22,184,240,.06)');g.addColorStop(1,'rgba(22,184,240,0)');x.fillStyle=g;x.beginPath();x.moveTo(bx-16,0);x.lineTo(bx+16,0);x.lineTo(bx+70,H*.8);x.lineTo(bx-70,H*.8);x.fill()}
    SN.forEach(s=>{s[1]+=s[2]*.6;s[0]+=Math.sin(t+s[3]*9)*.15;if(s[1]>H)s[1]=0;x.fillStyle=`rgba(190,235,255,${.15+s[3]*.45})`;x.fillRect(s[0],s[1],1.5,1.5)});
    /* steer: hunt the light, with a lazy wander so it swims rather than beelines */
    let tx=food?food.x:W/2+Math.cos(t*.6)*W*.3,ty=food?food.y:H*.33+Math.sin(t*.9)*H*.14;
    if(hx<X0||hx>X1||hy<Y0||hy>Y1){tx=W/2;ty=H*.33}
    let want=Math.atan2(ty-hy,tx-hx)+Math.sin(t*1.1)*.35,da=((want-ang+Math.PI*3)%TAU)-Math.PI;
    ang+=clamp(da,-1.9*dt,1.9*dt);const sp=W*(.17+.03*Math.min(eaten,8)/8);hx+=Math.cos(ang)*sp*dt;hy+=Math.sin(ang)*sp*dt;
    /* body: fixed-spacing trail of where the head has been */
    let lx=hist[0][0],ly=hist[0][1],d=Math.hypot(hx-lx,hy-ly);while(d>=seg){lx+=(hx-lx)/d*seg;ly+=(hy-ly)/d*seg;hist.unshift([lx,ly]);d=Math.hypot(hx-lx,hy-ly)}
    const tl=BASE+eaten*PER;len+=(tl-len)*Math.min(1,dt*(tl>len?2.2:1.4));const N=Math.max(4,Math.floor(len));while(hist.length>N+2)hist.pop();while(hist.length<N+2)hist.push(hist[hist.length-1]);
    const B=[[hx,hy],...hist.slice(0,N)];const n=B.length,grow=Math.min(1,.45+eaten/Math.max(NS(),1)*.55);
    const wid=i=>{const u=i/(n-1);return W*.075*grow*Math.pow(Math.sin(Math.PI*Math.pow(Math.max(u,.02),.62)),1.1)+1.2};
    const A=i=>{const a=B[Math.max(0,i-1)],b=B[Math.min(n-1,i+1)];return Math.atan2(b[1]-a[1],b[0]-a[0])};
    /* food: the next story, a pulsing light */
    if(food){food.born+=dt;const c=col(food.i),p=.75+.25*Math.sin(t*4),r=W*.03*p*Math.min(1,food.born*2),g=x.createRadialGradient(food.x,food.y,0,food.x,food.y,r*3.2);g.addColorStop(0,'#fff');g.addColorStop(.22,rgb(c,.95));g.addColorStop(1,rgb(c,0));x.fillStyle=g;x.fillRect(food.x-r*3.2,food.y-r*3.2,r*6.4,r*6.4);
      x.strokeStyle=rgb(c,.35+.25*Math.sin(t*4));x.lineWidth=1;x.beginPath();x.arc(food.x,food.y,r*2+((t*18)%14),0,TAU);x.stroke();
      x.font=`700 ${Math.round(W*.026)}px "Space Mono",monospace`;x.textAlign='center';x.fillStyle=rgb(c,.85);x.fillText(STORIES[food.i%NS()][0].toUpperCase(),food.x,food.y-r*2.6);
      if(Math.hypot(food.x-hx,food.y-hy)<W*.045+W*.02*grow){eaten++;rings.push({x:food.x,y:food.y,r:4,c});for(let k=0;k<26;k++){const a=rnd()*TAU,v=W*(.05+rnd()*.25);parts.push({x:food.x,y:food.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,c})}pulses.push({p:0,c});food=null;if(eaten>=NS())hold=3.2;else place()}}
    else if(hold>0){hold-=dt;if(hold<=0){rings.push({x:hx,y:hy,r:6,c:[90,230,255]});eaten=0;place()}}
    /* draw body, Leviathan style: dark ribs, cyan fins, cyan outline */
    for(let i=n-1;i>0;i--){const s=B[i],w=wid(i),a=A(i)+1.57,cx=Math.cos(a),cy=Math.sin(a);x.lineWidth=seg*1.6;x.strokeStyle='rgba(12,44,92,.95)';x.beginPath();x.moveTo(s[0]+cx*w,s[1]+cy*w);x.lineTo(s[0]-cx*w,s[1]-cy*w);x.stroke();
      if(i%3===0){const f=w+4+w*.45;x.lineWidth=1;x.strokeStyle=`rgba(90,230,255,${.3+.5*Math.sin(i*.22-t*2.4)**2})`;x.beginPath();x.moveTo(s[0]+cx*w,s[1]+cy*w);x.lineTo(s[0]+cx*f,s[1]+cy*f);x.moveTo(s[0]-cx*w,s[1]-cy*w);x.lineTo(s[0]-cx*f,s[1]-cy*f);x.stroke()}}
    x.lineWidth=2;x.strokeStyle='rgba(90,230,255,.85)';[1,-1].forEach(k=>{x.beginPath();for(let i=1;i<n;i++){const s=B[i],w=wid(i)*k,a=A(i)+1.57,X=s[0]+Math.cos(a)*w,Y=s[1]+Math.sin(a)*w;i>1?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke()});
    /* swallow pulse travels from head to tail */
    x.globalCompositeOperation='lighter';
    pulses=pulses.filter(q=>{q.p+=dt*.9;const i=Math.floor(q.p*(n-1));if(i>=n-1)return false;const s=B[i],r=wid(i)*1.2+4,g=x.createRadialGradient(s[0],s[1],0,s[0],s[1],r);g.addColorStop(0,rgb(q.c,.55));g.addColorStop(1,rgb(q.c,0));x.fillStyle=g;x.fillRect(s[0]-r,s[1]-r,r*2,r*2);return true});
    /* lights inside: one it was born with, plus one per story eaten */
    const lights=[[[200,245,255],-1],...[...Array(eaten)].map((_,k)=>[col(k),k])];
    lights.forEach(([c,k],j)=>{const i=Math.min(n-2,Math.round((j+.7)/(lights.length+.4)*(n-1)*.92)),s=B[i],p=.65+.35*Math.sin(t*2.2-j*.8),r=(W*.012+wid(i)*.3)*p+2.5,g=x.createRadialGradient(s[0],s[1],0,s[0],s[1],r*2.2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,rgb(c,.9));g.addColorStop(1,rgb(c,0));x.fillStyle=g;x.fillRect(s[0]-r*2.2,s[1]-r*2.2,r*4.4,r*4.4)});
    parts=parts.filter(q=>{q.l-=dt*1.4;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.96;q.vy*=.96;if(q.l<=0)return false;x.fillStyle=rgb(q.c,q.l);x.fillRect(q.x-1.5,q.y-1.5,3,3);return true});
    rings=rings.filter(q=>{q.r+=W*.35*dt;const a=1-q.r/(W*.3);if(a<=0)return false;x.strokeStyle=rgb(q.c,a);x.lineWidth=2.5;x.beginPath();x.arc(q.x,q.y,q.r,0,TAU);x.stroke();return true});
    x.globalCompositeOperation='source-over';
    /* head: eyes and a lure, as on the Leviathan */
    const a=ang,sc=.55+.45*grow,ex=hx-Math.cos(a)*W*.02*sc,ey=hy-Math.sin(a)*W*.02*sc;x.fillStyle='#ffe600';[1,-1].forEach(k=>{const m=a+1.57*k;x.beginPath();x.arc(ex+Math.cos(m)*W*.026*sc,ey+Math.sin(m)*W*.026*sc,3.2*sc+.6,0,TAU);x.fill()});
    const lx2=hx+Math.cos(a)*W*.09*sc,ly2=hy+Math.sin(a)*W*.09*sc-12*sc;x.strokeStyle='rgba(255,230,0,.8)';x.lineWidth=1.3;x.beginPath();x.moveTo(ex,ey);x.quadraticCurveTo(hx+Math.cos(a)*W*.05*sc,hy+Math.sin(a)*W*.05*sc-20*sc,lx2,ly2);x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(lx2,ly2,3.5*sc+.5,0,TAU);x.fill();
    /* tally */
    x.font=`700 ${Math.round(W*.03)}px "Space Mono",monospace`;x.textAlign='left';x.fillStyle='rgba(170,240,255,.75)';x.fillText(`SWALLOWED ${eaten} OF ${NS()}`,W*.05,H*.06);
    if(hold>0){x.textAlign='center';x.font=`900 ${Math.round(W*.07)}px "Archivo",sans-serif`;x.fillStyle=`rgba(170,240,255,${Math.min(1,hold)})`;x.fillText('THE DAY, SWALLOWED',W/2,H*.08+W*.07)}}}}
];
/* the 15-day rotation, one opening per day from 8 Nov 2026 */
const ORDER=['Radar Room','Pixel Quest','Abyss Leviathan','Grid Runner','Neon Raid','Neon Pinball','Abyss Serpent','Orbital Command','Hacker Den','Rain City','Abyss Bloom','Event Horizon','Titan Duel','Reactor Core','Star Whale'];
const POOL=[...DESIGNS,...NEW,...LAB];
const ALL=ORDER.map(n=>POOL.find(d=>d.name===n));
const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
let stop=null;
const pool=b=>{const s=[...(b.posters||[]),...(b.stories||[])];(b.themes||[]).forEach(t=>s.push(...(t.stories||[])));s.push(...(b.chatter||[]));const r=s.filter(x=>COL[x.tag]).map(x=>[x.tag,x.headline]).slice(0,8);return r.length?r:[['AI','Today']]};
const dayIndex=date=>{const[y,m,d]=date.split('-').map(Number);const n=Math.round((Date.UTC(y,m-1,d)-Date.UTC(2026,10,8))/864e5);return((n%ALL.length)+ALL.length)%ALL.length};
window.HERO_NAMES=ALL.map(d=>d.name);
window.heroForDate=dayIndex;
window.startHero=function(c,b,force){
  if(stop)stop();
  STORIES=pool(b);ISO=b.date;const p=b.date.split('-');DAY=p[2]+' '+MONTHS[+p[1]-1];seed=parseInt(p.join(''),10);
  const D=ALL[force==null?dayIndex(b.date):force];
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r=c.getBoundingClientRect(),W=r.width,H=r.height,d=Math.min(devicePixelRatio||1,2);
  c.width=Math.round(W*d);c.height=Math.round(H*d);const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);
  const f=D.make(x,W,H);let t=2,raf=0,on=true,last=performance.now();
  for(let i=0;i<(still?90:24);i++){t+=1/60;f(t,1/60)}
  /* off screen the loop stops altogether (no ticking), and starts again when the art comes back */
  const loop=n=>{const dt=Math.max(0,Math.min((n-last)/1000,.05));last=n;if(on){t+=dt;f(t,dt);raf=requestAnimationFrame(loop)}else raf=0};
  if(!still)raf=requestAnimationFrame(loop);
  const io=new IntersectionObserver(e=>{on=e[0].isIntersecting;last=performance.now();if(on&&!still&&!raf)raf=requestAnimationFrame(loop)},{threshold:.05});io.observe(c);
  stop=()=>{cancelAnimationFrame(raf);io.disconnect()};
  if(document.fonts&&document.fonts.ready&&!still)document.fonts.ready.then(()=>{});
  return D.name};
})();
