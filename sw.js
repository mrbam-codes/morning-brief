/* sw.js: lets the page open with no signal (plan 1).
   Same logic in the Morning brief and Mise en Place; only APP and FIXED differ.
   Rules:
   - Only the fixed files below are ever cached. Nothing under briefs/ (the day's
     content and photos) is cached here, so a phone can never show an old brief
     as today's.
   - Every fixed file is fetched from the network first. The cached copy is used
     only when the network fails (no signal).
   - The cache name includes this page's own address, because several briefs
     share one web origin and must not delete each other's caches.
   Change VERSION when FIXED changes. tests/test_keep.py checks FIXED. */
const APP='morning-brief',VERSION='21';
const FIXED=[
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'keep.js',
  'evidence.js',
  'sieve.js',
  'warp.js',
  'sources.json',
  'motion.js',
  'scorecore.js',
  'kimchi.js',
  'charlee.js',
  'qr.js',
  'scorecard.js',
  'done-fx.js',
  'builds.js',
  'tour.js',
  'course.json',
  'fonts/Anton-400-latin-ext.woff2',
  'fonts/Anton-400-latin.woff2',
  'fonts/IBMPlexMono-500-latin-ext.woff2',
  'fonts/IBMPlexMono-500-latin.woff2',
  'fonts/IBMPlexMono-600-latin-ext.woff2',
  'fonts/IBMPlexMono-600-latin.woff2',
  'fonts/Orbitron-900-latin.woff2',
  'fonts/SpaceGrotesk-400-latin-ext.woff2',
  'fonts/SpaceGrotesk-400-latin.woff2',
  'fonts/SpaceGrotesk-500-latin-ext.woff2',
  'fonts/SpaceGrotesk-500-latin.woff2',
  'fonts/SpaceGrotesk-700-latin-ext.woff2',
  'fonts/SpaceGrotesk-700-latin.woff2',
  'fonts/VT323-400-latin-ext.woff2',
  'fonts/VT323-400-latin.woff2',
  'fonts/fonts.css'
];
const SCOPE=self.registration.scope,CACHE='fixed|'+SCOPE+'|'+VERSION;
const key=u=>{let p=new URL(u).pathname,s=new URL(SCOPE).pathname;p=p.startsWith(s)?p.slice(s.length):null;return p===''?'index.html':p};

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FIXED.map(f=>fetch(new Request(f,{cache:'reload'})).then(r=>{if(r.ok)return c.put(f,r)}).catch(()=>0)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('fixed|'+SCOPE+'|')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const k=key(r.url);
  if(k===null||new URL(r.url).origin!==location.origin)return;        /* another site or another brief: leave it alone */
  if(k.startsWith('briefs/'))return;                                    /* the day's content: network only, never cached here */
  const nav=r.mode==='navigate'&&(k==='index.html'||k==='');
  const f=nav?'index.html':k;if(!FIXED.includes(f))return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok&&res.type==='basic'){const copy=res.clone();caches.open(CACHE).then(c=>c.put(f,copy)).catch(()=>0)}
    return res},()=>caches.open(CACHE).then(c=>c.match(f)).then(hit=>hit||Response.error())));
});
