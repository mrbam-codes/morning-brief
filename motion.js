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

const KEEP=['Neural Firestorm','Radar Room','Pixel Quest','Grid Runner'];
const NEW=[
{name:'Data Heist',world:'Retro stealth game',note:'A pixel hacker dodges torch-beam guards and cracks one vault per story, in its topic colour.',make(x,W,H){
  const M=['#############','#.....#.....#','#.###.#.###.#','#.#.......#.#','#.#.##.##.#.#','#.....#.....#','###.#.#.#.###','#...#...#...#','#.###.#.###.#','#.....#.....#','#.##.###.##.#','#...........#','#############'];
  const w=120,h=150,T=8,ox=8,oy=8,o=document.createElement('canvas');o.width=w;o.height=h;const c=o.getContext('2d');x.imageSmoothingEnabled=false;
  const path=(a,b)=>{const k=p=>p[0]+','+p[1],q=[a],pr={[k(a)]:null};while(q.length){const p=q.shift();if(p[0]===b[0]&&p[1]===b[1])break;[[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{const n=[p[0]+d[0],p[1]+d[1]];if(M[n[1]][n[0]]==='.'&&!(k(n) in pr)){pr[k(n)]=p;q.push(n)}})}const r=[];let p=b;while(p){r.unshift(p);p=pr[k(p)]}return r};
  const V=[[1,1],[11,1],[5,3],[11,5],[1,7],[11,9],[6,11],[9,7]].slice(0,N()).map((p,i)=>({p,c:col(i),open:0}));
  const G=[{a:[1,5],b:[5,5]},{a:[7,5],b:[11,5]},{a:[1,11],b:[11,11]}].map(g=>({...g,r:path(g.a,g.b),u:0,d:1}));
  const hero={r:path([3,9],V[0].p),u:0,v:0,score:0};
  const at=(r,u)=>{const i=Math.min(Math.floor(u),r.length-1),j=Math.min(i+1,r.length-1),f=u-i;return[r[i][0]+(r[j][0]-r[i][0])*f,r[i][1]+(r[j][1]-r[i][1])*f,r[j][0]-r[i][0],r[j][1]-r[i][1]]};
  return (t,dt)=>{
    c.fillStyle='#0d0728';c.fillRect(0,0,w,h);
    M.forEach((r,j)=>[...r].forEach((k,i)=>{if(k==='#'){c.fillStyle='#3d2a9a';c.fillRect(ox+i*T,oy+j*T,T,T);c.fillStyle='#7c4dff';c.fillRect(ox+i*T,oy+j*T,T,1)}else{c.fillStyle=(i+j)%2?'#160c3a':'#120a33';c.fillRect(ox+i*T,oy+j*T,T,T)}}));
    V.forEach(v=>{const X=ox+v.p[0]*T+1,Y=oy+v.p[1]*T+1;c.fillStyle=rgb(v.c,v.open>0?.28:1);c.fillRect(X,Y,6,6);c.fillStyle=v.open>0?'#fff':'#0b0620';c.fillRect(X+2,Y+2,2,2);if(v.open>0){v.open-=dt;c.fillStyle=rgb(v.c,clamp(v.open/2,0,.5));c.fillRect(X-3,Y-3,12,12)}});
    G.forEach(g=>{g.u+=g.d*dt*2.2;if(g.u>=g.r.length-1){g.u=g.r.length-1;g.d=-1}if(g.u<=0){g.u=0;g.d=1}const p=at(g.r,g.u),X=ox+p[0]*T+4,Y=oy+p[1]*T+4,dx=g.d*(p[2]||1),dy=g.d*p[3];
      c.fillStyle='rgba(255,230,0,.3)';c.beginPath();c.moveTo(X,Y);c.lineTo(X+dx*26-dy*10,Y+dy*26-dx*10);c.lineTo(X+dx*26+dy*10,Y+dy*26+dx*10);c.fill();
      c.fillStyle='#ff3b3b';c.fillRect(X-2,Y-3,5,6);c.fillStyle='#fff';c.fillRect(X-1,Y-2,3,1)});
    hero.u+=dt*3.4;if(hero.u>=hero.r.length-1){V[hero.v].open=3;hero.score=hero.v+1;const n=(hero.v+1)%N(),last=hero.r[hero.r.length-1];hero.r=path(last,V[n].p);hero.v=n;hero.u=0}
    const p=at(hero.r,hero.u),X=Math.round(ox+p[0]*T+2),Y=Math.round(oy+p[1]*T+1);c.fillStyle='#16b8f0';c.fillRect(X,Y+2,5,4);c.fillStyle='#fff';c.fillRect(X+1,Y,3,2);c.fillStyle='#ff2e6e';c.fillRect(X+Math.floor(t*6)%2*3,Y+6,2,1);
    x.drawImage(o,0,0,W,H);x.fillStyle='#fff';x.font='700 11px "Space Mono",monospace';x.textAlign='right';x.fillText('VAULTS '+hero.score+'/'+N(),W-10,H*.8);x.textAlign='left'}}},
{name:'Neon Pinball',world:'Arcade machine',note:'A self-playing table where each story is a bumper. Topic colours flare with every hit.',make(x,W,H){
  const F=H*.66,B=STORIES.map((s,i)=>{const a=i/N()*TAU-1.2,r=i%2?.27:.37;return{x:W/2+Math.cos(a)*W*r,y:H*.3+Math.sin(a)*H*.2,r:W*.062,c:col(i),f:0}});
  const b={x:W*.8,y:F-30,vx:-3,vy:-9};let score=48100,fl=0,fr=0;const tr=[];
  return (t,dt)=>{
    x.fillStyle='rgba(11,6,32,.4)';x.fillRect(0,0,W,H);
    for(let s=0;s<2;s++){b.vy+=.09;b.x+=b.vx*.5;b.y+=b.vy*.5;
      if(b.x<14){b.x=14;b.vx=Math.abs(b.vx)}if(b.x>W-14){b.x=W-14;b.vx=-Math.abs(b.vx)}if(b.y<14){b.y=14;b.vy=Math.abs(b.vy)}
      B.forEach(k=>{const dx=b.x-k.x,dy=b.y-k.y,d=Math.hypot(dx,dy)||1;if(d<k.r+6){const nx=dx/d,ny=dy/d;b.x=k.x+nx*(k.r+6.5);b.y=k.y+ny*(k.r+6.5);const dot=b.vx*nx+b.vy*ny;b.vx=(b.vx-2*dot*nx)+nx*1.6;b.vy=(b.vy-2*dot*ny)+ny*1.6;k.f=1;score+=500}});
      if(b.y>F-8){b.y=F-8;b.vy=-(8.5+rnd()*2.6);b.vx=(W/2-b.x)*.018+(rnd()-.5)*4.6;b.x<W/2?fl=1:fr=1}
      const sp=Math.hypot(b.vx,b.vy);if(sp>10){b.vx*=10/sp;b.vy*=10/sp}}
    tr.push([b.x,b.y]);if(tr.length>16)tr.shift();
    x.lineCap='round';x.lineWidth=3;x.strokeStyle='#16b8f0';x.strokeRect(8,8,W-16,F+16);x.lineWidth=1;x.strokeStyle='#fff';x.strokeRect(8,8,W-16,F+16);
    B.forEach(k=>{k.f*=.9;const g=x.createRadialGradient(k.x,k.y,0,k.x,k.y,k.r*2.4);g.addColorStop(0,rgb(k.c,.55+k.f*.45));g.addColorStop(1,rgb(k.c,0));x.fillStyle=g;x.fillRect(k.x-k.r*2.4,k.y-k.r*2.4,k.r*4.8,k.r*4.8);
      x.fillStyle=INK;x.beginPath();x.arc(k.x,k.y,k.r,0,TAU);x.fill();x.lineWidth=3;x.strokeStyle=k.f>.2?'#fff':rgb(k.c);x.stroke();x.fillStyle=rgb(k.c);x.beginPath();x.arc(k.x,k.y,k.r*(.32+k.f*.45),0,TAU);x.fill()});
    fl*=.8;fr*=.8;[[W*.26,1,fl],[W*.74,-1,fr]].forEach(f=>{const a=(.42-f[2]*.9)*f[1];x.lineWidth=8;x.strokeStyle='#ffe600';x.beginPath();x.moveTo(f[0]-f[1]*W*.2,F-12-(-1)*0);x.lineTo(f[0]-f[1]*W*.2+f[1]*Math.cos(a*f[1])*W*.22,F-12+Math.sin(a*f[1])*W*.22);x.stroke()});
    tr.forEach((p,i)=>{x.fillStyle=`rgba(255,255,255,${i/20})`;x.beginPath();x.arc(p[0],p[1],2+i/5,0,TAU);x.fill()});
    x.fillStyle='#fff';x.beginPath();x.arc(b.x,b.y,6,0,TAU);x.fill();
    x.font='400 28px Anton,Impact,sans-serif';x.fillStyle='#ffe600';x.textAlign='center';x.fillText(String(score).padStart(7,'0'),W/2,44);x.textAlign='left'}}},
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
{name:'Transit Lines',world:'Animated subway map',note:'AI, Tech and Cyber become lines. Stories are stations, and trains run between them.',make(x,W,H){
  const P=(a)=>a.map(p=>[p[0]*W,p[1]*H]);
  const sl={AI:[[.2,.1],[.6,.42],[.82,.5]],Cyber:[[.17,.62],[.5,.3],[.84,.08]],Tech:[[.2,.32],[.43,.45],[.78,.58]]};
  const lab=k=>STORIES.filter(s=>s[0]===k).slice(0,3).map((s,i)=>[sl[k][i][0],sl[k][i][1],s[1].toUpperCase().split(' ').slice(0,3).join(' ').slice(0,20)]);
  const LN=[{k:'AI',p:P([[.08,.1],[.36,.1],[.6,.34],[.6,.5],[.94,.5]]),s:lab('AI')},{k:'Cyber',p:P([[.08,.62],[.28,.62],[.5,.4],[.5,.22],[.72,.08],[.94,.08]]),s:lab('Cyber')},{k:'Tech',p:P([[.08,.32],[.3,.32],[.56,.58],[.94,.58]]),s:lab('Tech')}];
  LN.forEach(l=>{l.d=[0];for(let i=1;i<l.p.length;i++)l.d[i]=l.d[i-1]+Math.hypot(l.p[i][0]-l.p[i-1][0],l.p[i][1]-l.p[i-1][1]);l.L=l.d[l.d.length-1];l.c=COL[l.k]});
  const at=(l,d)=>{for(let i=1;i<l.p.length;i++)if(d<=l.d[i]){const u=(d-l.d[i-1])/(l.d[i]-l.d[i-1]);return[l.p[i-1][0]+(l.p[i][0]-l.p[i-1][0])*u,l.p[i-1][1]+(l.p[i][1]-l.p[i-1][1])*u]}return l.p[l.p.length-1]};
  return t=>{
    x.fillStyle=INK;x.fillRect(0,0,W,H);x.strokeStyle='rgba(124,77,255,.1)';x.lineWidth=1;for(let i=0;i<W;i+=22){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}for(let i=0;i<H;i+=22){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke()}
    x.lineJoin='round';x.lineCap='round';
    LN.forEach(l=>{x.lineWidth=8;x.strokeStyle=rgb(l.c);x.beginPath();l.p.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()});
    x.font='700 9.5px "Space Mono",monospace';
    LN.forEach(l=>l.s.forEach((s,i)=>{const X=s[0]*W,Y=s[1]*H,pu=(Math.sin(t*2+i+X)+1)/2;x.strokeStyle=rgb(l.c,.5*(1-pu));x.lineWidth=2;x.beginPath();x.arc(X,Y,9+pu*12,0,TAU);x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(X,Y,7,0,TAU);x.fill();x.lineWidth=3;x.strokeStyle=INK;x.stroke();x.fillStyle='#fff';const tx=clamp(X-34,6,W-124);x.fillText(s[2],tx,Y+(s[1]<.2?22:-14))}));
    LN.forEach((l,n)=>{for(let k=0;k<2;k++){const u=((t*.095+k/2+n*.22)%1),e=u<.5?u*2:2-u*2,d=(e*e*(3-2*e))*l.L,p=at(l,d);x.fillStyle='#fff';x.beginPath();x.arc(p[0],p[1],5,0,TAU);x.fill();x.fillStyle=INK;x.beginPath();x.arc(p[0],p[1],2,0,TAU);x.fill()}});
    x.fillStyle='#fff';x.font='400 16px Anton,Impact,sans-serif';[['AI',.08,.075],['CYBER',.08,.59],['TECH',.08,.295]].forEach(l=>x.fillText(l[0],l[1]*W,l[2]*H-5))}}},
{name:'Black Box',world:'Green-screen terminal',note:'The day\'s stories type themselves onto an old terminal, with glitches and a mission readout.',make(x,W,H){
  const cw=7.6,max=Math.floor((W-26)/cw),LS=['MORNING BRIEF // OPERATOR TERMINAL','DATE '+ISO+'  STATUS '+(N()<5?'QUIET':'ACTIVE'),'SCANNING AI ... TECH ... CYBER ...','']
  .concat(STORIES.map((s,i)=>`[${i+1}] ${s[0].toUpperCase().padEnd(5)} ${s[1].toUpperCase()}`.slice(0,max))).concat(['',N()+' RECORDS DECRYPTED','THREAT LEVEL: '+(TAGC('Cyber')>=3?'ELEVATED':'GUARDED'),'AWAITING OPERATOR_']);
  const total=LS.reduce((a,l)=>a+l.length+3,0);
  return t=>{
    x.fillStyle='#02100a';x.fillRect(0,0,W,H);const ch=(t*58)%(total+70);let left=ch,y=34;
    x.font='700 12.5px "Space Mono",monospace';x.fillStyle='#4dff9a';
    for(const l of LS){if(left<=0)break;const n=Math.min(l.length,Math.floor(left));x.fillText(l.slice(0,n),13,y);if(left<l.length&&Math.floor(t*4)%2===0)x.fillRect(13+n*cw,y-10,7,12);left-=l.length+3;y+=20}
    if(Math.sin(t*2.7)+Math.sin(t*7.1)>1.5){const gy=rnd()*H,gh=8+rnd()*30;x.drawImage(x.canvas,0,gy*2,x.canvas.width,gh*2,(rnd()-.5)*22,gy,W,gh);x.fillStyle='rgba(255,46,110,.14)';x.fillRect(0,gy,W,gh)}
    x.fillStyle='rgba(0,0,0,.24)';for(let i=0;i<H;i+=3)x.fillRect(0,i,W,1);
    const bar=(t*42)%(H+90)-45,g=x.createLinearGradient(0,bar-45,0,bar+45);g.addColorStop(0,'rgba(77,255,154,0)');g.addColorStop(.5,'rgba(77,255,154,.1)');g.addColorStop(1,'rgba(77,255,154,0)');x.fillStyle=g;x.fillRect(0,bar-45,W,90);
    const v=x.createRadialGradient(W/2,H/2,W*.42,W/2,H/2,H*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.72)');x.fillStyle=v;x.fillRect(0,0,W,H)}}},
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
{name:'Titan Duel',world:'Wilder: fighting game',note:'AI and Cyber fight as giant mechs. Their health and score come from the day\'s story count.',make(x,W,H){
  const floor=H*.63,U=W/390*1.22;
  const limb=(c,pts,w)=>{x.lineCap='round';x.lineJoin='round';x.lineWidth=w+5;x.strokeStyle=rgb(c,.28);x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();x.lineWidth=w;x.strokeStyle=rgb(c);x.stroke();x.lineWidth=1.4;x.strokeStyle='#fff';x.stroke();pts.forEach(p=>{x.fillStyle='#fff';x.beginPath();x.arc(p[0],p[1],w*.42,0,TAU);x.fill()})};
  const mech=(cx,d,c,p,rec,t)=>{const bob=Math.sin(t*3+d)*3*U,cxx=cx-d*rec*26*U,hip=[cxx,floor-74*U+bob],ch=[cxx+d*9*U,floor-128*U+bob];
    limb(c,[hip,[cxx-d*20*U,floor-40*U+bob/2],[cxx-d*26*U,floor]],11*U);limb(c,[hip,[cxx+d*23*U,floor-40*U+bob/2],[cxx+d*20*U,floor]],11*U);
    limb(c,[[ch[0]-d*12*U,ch[1]],[ch[0]-d*30*U,ch[1]+26*U],[ch[0]-d*12*U,ch[1]+40*U]],9*U);
    x.fillStyle=INK;x.lineWidth=3;x.strokeStyle=rgb(c);x.beginPath();x.moveTo(cxx-d*20*U,hip[1]);x.lineTo(ch[0]-d*30*U,ch[1]-10*U);x.lineTo(ch[0]+d*26*U,ch[1]-10*U);x.lineTo(cxx+d*20*U,hip[1]);x.closePath();x.fill();x.stroke();
    x.fillStyle=rgb(c);x.beginPath();x.arc(ch[0],ch[1]+14*U,8*U,0,TAU);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(ch[0],ch[1]+14*U,3.4*U,0,TAU);x.fill();
    x.fillStyle=INK;x.strokeRect(ch[0]-10*U,ch[1]-32*U,22*U,22*U);x.fillRect(ch[0]-10*U,ch[1]-32*U,22*U,22*U);x.fillStyle='#ffe600';x.fillRect(ch[0]+(d>0?1:-9)*U,ch[1]-25*U,9*U,4*U);
    const ex=ch[0]+d*(26+p*20)*U,ey=ch[1]+(16-p*8)*U,fx=ch[0]+d*(30+p*92)*U,fy=ch[1]+(36-p*26)*U;limb(c,[[ch[0]+d*18*U,ch[1]],[ex,ey],[fx,fy]],10*U);return[fx,fy]};
  let spk=[],last=0,sh=0;
  return (t,dt)=>{
    const ph=t%6,bl=ph<2.8?0:1,ip=(t*1.05)%1,p=Math.max(0,Math.sin(ip*Math.PI))**3,hit=ip>.46&&ip<.5;
    const ox=sh?(rnd()-.5)*sh:0,oy=sh?(rnd()-.5)*sh:0;sh*=.82;if(sh<.4)sh=0;x.save();x.translate(ox,oy);
    const g=x.createLinearGradient(0,0,0,floor);g.addColorStop(0,'#0b0620');g.addColorStop(1,'#3a0f5e');x.fillStyle=g;x.fillRect(-20,-20,W+40,H+40);
    x.strokeStyle='rgba(22,184,240,.4)';x.lineWidth=1;for(let i=-12;i<=12;i++){x.beginPath();x.moveTo(W/2+i*W*.06,floor);x.lineTo(W/2+i*W*.3,H);x.stroke()}x.fillStyle='rgba(0,0,0,.45)';x.fillRect(-20,floor,W+40,H);
    const atk=Math.floor(t*1.05)%2===0;
    const a=mech(W*.24,1,COL.AI,atk?p:0,atk?0:p*.7,t),b=mech(W*.76,-1,COL.Cyber,atk?0:p,atk?p*.7:0,t+1);
    if(hit&&t-last>.3){last=t;sh=9;const q=atk?a:b;for(let i=0;i<22;i++)spk.push([q[0],q[1],(rnd()-.5)*8,(rnd()-.7)*8,1])}
    spk=spk.filter(s=>(s[4]-=.04)>0);spk.forEach(s=>{s[0]+=s[2];s[1]+=s[3];s[3]+=.2;x.fillStyle=`rgba(255,230,0,${s[4]})`;x.fillRect(s[0],s[1],3,3)});
    x.restore();
    const hA=.42+.5*((Math.sin(t*.37)+1)/2),hB=.42+.5*((Math.cos(t*.41)+1)/2),bw=W*.36;
    x.fillStyle='#000';x.fillRect(12,36,bw,12);x.fillRect(W-12-bw,36,bw,12);x.fillStyle=rgb(COL.AI);x.fillRect(12+bw*(1-hA),36,bw*hA,12);x.fillStyle=rgb(COL.Cyber);x.fillRect(W-12-bw,36,bw*hB,12);x.lineWidth=2;x.strokeStyle='#fff';x.strokeRect(12,36,bw,12);x.strokeRect(W-12-bw,36,bw,12);
    x.fillStyle='#fff';x.font='400 20px Anton,Impact,sans-serif';x.fillText('AI  '+TAGC('AI'),12,28);x.textAlign='right';x.fillText(TAGC('Cyber')+'  CYBER',W-12,28);x.textAlign='center';x.fillStyle='#ffe600';x.font='400 26px Anton,Impact,sans-serif';x.fillText(DAY.slice(0,2),W/2,48);x.textAlign='left'}}},
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


const ALL=[...DESIGNS.filter(d=>KEEP.includes(d.name)),...NEW];
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
  if(!still){const loop=n=>{const dt=Math.min((n-last)/1000,.05);last=n;if(on){t+=dt;f(t,dt)}raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop)}
  const io=new IntersectionObserver(e=>{on=e[0].isIntersecting;last=performance.now()},{threshold:.05});io.observe(c);
  stop=()=>{cancelAnimationFrame(raf);io.disconnect()};
  if(document.fonts&&document.fonts.ready&&!still)document.fonts.ready.then(()=>{});
  return D.name};
})();
