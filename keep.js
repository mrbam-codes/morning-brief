/* keep.js: keep progress safe (plan 1).
   The SAME file sits in the Morning brief and Mise en Place: change both together.
   - Backup code: progress is turned into a short code the reader copies and keeps.
     Nothing is ever sent anywhere; the code only lives where the reader pastes it.
     Format: APP.<version><z|j>.<payload>.<check>
       APP      MB or MEP, so a code from one brief is refused by the other
       z or j   z = compressed (deflate), j = plain JSON
       payload  base64url of {at:'YYYY-MM-DD', s:<saved progress>}
       check    checksum of everything before it, so a cut-off paste is refused
     Old plain base64 codes (before this file) still restore.
   - Registers sw.js, which caches the fixed files only (never briefs/). */
(function(){
'use strict';
var VER=1;
var canZip=typeof CompressionStream==='function'&&typeof DecompressionStream==='function';

function b64u(bytes){var s='';for(var i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(t){t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';var s=atob(t),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b}
/* FNV-1a, 32 bit, written in base 36 and padded to 7 characters */
function check(str){var h=0x811c9dc5;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return ('000000'+h.toString(36)).slice(-7)}
function pipe(bytes,Stream){return new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate'))).arrayBuffer().then(function(a){return new Uint8Array(a)})}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

function make(app,state){
  var raw=new TextEncoder().encode(JSON.stringify({at:today(),s:state}));
  var zipped=canZip?pipe(raw,CompressionStream).catch(function(){return null}):Promise.resolve(null);
  return zipped.then(function(z){var body=app+'.'+VER+(z?'z':'j')+'.'+b64u(z||raw);return body+'.'+check(body)})}

function fail(msg){var e=new Error(msg);e.keep=true;throw e}
function read(app,code){
  return Promise.resolve().then(function(){
    var t=String(code||'').replace(/\s+/g,'');
    if(!t)fail('Paste a backup code first.');
    var m=/^([A-Z]+)\.(\d+)([zj])\.([A-Za-z0-9_-]+)\.([0-9a-z]{7})$/.exec(t);
    if(!m){
      /* an old plain code from before this file */
      if(/^[A-Za-z0-9+/]+={0,2}$/.test(t)){var o=null;try{o=JSON.parse(decodeURIComponent(escape(atob(t))))}catch(e){}
        if(o&&typeof o==='object')return{at:null,s:o,old:true}}
      if(/^[A-Z]+\./.test(t))fail('That code is incomplete or changed. Copy it again in full.');
      fail('That is not a backup code.')}
    if(m[1]!==app)fail('That code is from a different brief.');
    if(check(t.slice(0,t.lastIndexOf('.')))!==m[5])fail('That code is incomplete or changed. Copy it again in full.');
    if(+m[2]>VER)fail('That code was made by a newer version of this page. Reload the page and try again.');
    var bytes;try{bytes=unb64u(m[4])}catch(e){fail('That code is incomplete or changed. Copy it again in full.')}
    var open=m[3]==='z'?(canZip?pipe(bytes,DecompressionStream):fail('This browser cannot open this code. Update it and try again.')):Promise.resolve(bytes);
    return open.then(function(b){var p;try{p=JSON.parse(new TextDecoder().decode(b))}catch(e){fail('That code is incomplete or changed. Copy it again in full.')}
      if(!p||typeof p!=='object'||!p.s||typeof p.s!=='object')fail('That code holds no progress.');
      return{at:typeof p.at==='string'?p.at:null,s:p.s,old:false}},function(e){if(e&&e.keep)throw e;fail('That code is incomplete or changed. Copy it again in full.')})})}

function node(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function nice(d){if(!d)return 'an older backup';var p=d.split('-').map(Number),m=['January','February','March','April','May','June','July','August','September','October','November','December'];return p[2]+' '+m[p[1]-1]+' '+p[0]}

/* The Back up / Restore panel. o = {app, get(), valid(s), describe(s), apply(s)} */
function mount(bd,o){
  var box=node('section','keep');box.setAttribute('aria-label','Back up my progress');
  box.append(node('h3',null,'Back up my progress'),
    node('p','meta','Your progress lives only on this phone. Make a code and keep it somewhere safe, such as your notes app or an email to yourself. On a new or wiped phone, paste it into Restore. The code is never sent anywhere.'));
  var mk=node('button','btn','Make my backup code');mk.type='button';
  var out=node('textarea','keep-code');out.readOnly=true;out.rows=3;out.hidden=true;out.setAttribute('aria-label','Your backup code');
  var st=node('p','meta keep-status');st.setAttribute('role','status');st.setAttribute('aria-live','polite');
  mk.onclick=function(){mk.disabled=true;make(o.app,o.get()).then(function(code){out.value=code;out.hidden=false;out.focus();out.select();
      var done=function(ok){mk.disabled=false;mk.textContent='Make a new code';st.textContent=(ok?'Copied. ':'Select the code above and copy it. ')+'It holds '+o.describe(o.get())+'. Make a new one now and then.'};
      try{navigator.clipboard.writeText(code).then(function(){done(true)},function(){done(false)})}catch(e){done(false)}},
    function(){mk.disabled=false;st.textContent='Could not make a code on this phone.'})};
  box.append(mk,out);
  box.append(node('h3',null,'Restore'));
  var inp=node('textarea','keep-in');inp.rows=3;inp.placeholder='Paste a backup code here';inp.setAttribute('aria-label','Backup code to restore');
  var rs=node('button','btn alt','Restore from code');rs.type='button';
  var ask=node('div','keep-ask');ask.hidden=true;
  rs.onclick=function(){ask.hidden=true;ask.textContent='';
    read(o.app,inp.value).then(function(r){
      if(!o.valid(r.s))fail(r.old?'That is a backup from a different brief.':'That code holds no progress for this brief.');
      ask.append(node('p',null,'This replaces the progress on this phone ('+o.describe(o.get())+') with the backup from '+nice(r.at)+' ('+o.describe(r.s)+').'));
      var yes=node('button','btn','Yes, replace it'),no=node('button','btn alt','Cancel');yes.type=no.type='button';
      yes.onclick=function(){o.apply(r.s);st.textContent='Restored.'};no.onclick=function(){ask.hidden=true;ask.textContent='';st.textContent='Nothing changed.'};
      ask.append(yes,no);ask.hidden=false;st.textContent=''},
    function(e){st.textContent=e&&e.keep?e.message:'That code did not work.'})};
  box.append(inp,rs,ask,st);bd.append(box);return box}

/* offline: cache the fixed files (sw.js decides what) */
function register(){if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  navigator.serviceWorker.register('sw.js').catch(function(){})}
if(document.readyState==='complete')register();else addEventListener('load',register);

window.Keep={make:make,read:read,mount:mount,check:check,canZip:canZip};
})();
