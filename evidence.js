/* evidence.js: "How this brief was made" (plan 2).
   The SAME file sits in the Morning brief, Mise en Place and the Red Brief: change all three together.
   It reads the day's brief and the source register (sources.json, a fixed file) and shows:
   - how many sources sit behind the day's stories, by tier (worked out here, on the phone);
   - the morning run's own search counts and what it rejected, when the brief carries "evidence".
   The tier rule matches check.py: a web address matches its own domain and every sub-domain,
   and the longest match wins. Nothing is sent anywhere. */
(function(){
'use strict';
var TIERS=['original','secondary','lead'];
function host(u){var m=/^https?:\/\/([^\/:?#]+)/i.exec(String(u||''));var h=m?m[1].toLowerCase():'';return h.indexOf('www.')===0?h.slice(4):h}
function tierOf(reg,u){var h=host(u),best=null,len=-1;if(!h)return 'unlisted';
  TIERS.forEach(function(t){(reg.tiers[t]||[]).forEach(function(d){if((h===d||h.slice(-d.length-1)==='.'+d)&&d.length>len){best=t;len=d.length}})});return best||'unlisted'}
/* every {url} found under a "source" or "sources" key, once each */
function sources(b){var seen={},out=[];
  (function walk(o,k){if(Array.isArray(o)){o.forEach(function(v){walk(v,k)});return}
    if(!o||typeof o!=='object')return;
    if((k==='source'||k==='sources')&&typeof o.url==='string'){if(!seen[o.url]){seen[o.url]=1;out.push(o)}return}
    Object.keys(o).forEach(function(j){if(j!=='evidence')walk(o[j],j)})})(b,null);
  return out}
function node(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function plural(n,one,many){return n+' '+(n===1?one:many)}

/* mount(parent, brief, {cls, heading}) adds the block; it never throws */
function mount(parent,b,o){o=o||{};
  var box=node('section',o.cls||'evidence');box.setAttribute('aria-label','How this brief was made');
  box.append(node(o.heading||'h3',null,'How this brief was made'));
  var mix=node('p',null,'Checking the sources…');box.append(mix);
  var ev=b&&b.evidence;
  if(ev&&typeof ev==='object'){
    var bits=[];if(typeof ev.searches==='number')bits.push(plural(ev.searches,'search','searches')+' run');
    if(typeof ev.kept==='number')bits.push(plural(ev.kept,'story','stories')+' kept');
    var rj=Array.isArray(ev.rejected)?ev.rejected:[];bits.push(plural(rj.length,'lead','leads')+' rejected');
    box.append(node('p',null,'This morning’s run: '+bits.join(', ')+'.'));
    if(rj.length){var ul=node('ul');rj.slice(0,8).forEach(function(r){ul.append(node('li',null,String(r.what||'')+(r.why?': '+r.why:'')))});box.append(ul)}
    if(ev.note)box.append(node('p',null,String(ev.note)))}
  box.append(node('p','meta','Tiers come from the source register in this site’s code. A lead-only source, such as a social post or a rumour site, can point to a story, but from 11 November 2026 it cannot be a story’s only source.'));
  parent.append(box);
  fetch('sources.json').then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(reg){
    var n={original:0,secondary:0,lead:0,unlisted:0},list=sources(b);list.forEach(function(s){n[tierOf(reg,s.url)]++});
    var parts=[];if(n.original)parts.push(n.original+' original reporting');if(n.secondary)parts.push(n.secondary+' good secondary');
    if(n.lead)parts.push(n.lead+' lead only');if(n.unlisted)parts.push(n.unlisted+' not yet rated');
    mix.textContent=list.length?plural(list.length,'source','sources')+' behind today’s brief: '+parts.join(', ')+'.':'No linked sources today.'},
  function(){mix.textContent=plural(sources(b).length,'source','sources')+' behind today’s brief. The register could not be loaded, so they are not rated.'});
  return box}

window.Evidence={mount:mount,tierOf:tierOf,sources:sources,host:host};
})();
