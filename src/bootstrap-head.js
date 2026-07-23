const CF_VERSION='v176';
if('serviceWorker'in navigator){const sw=`const CACHE='cf-${CF_VERSION}';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.add(self.registration.scope)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>clients.claim()).then(()=>self.clients.matchAll({type:'window'})).then(cs=>cs.forEach(c=>c.postMessage({type:'CF_SW_ACTIVATED',cache:CACHE}))));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{const fresh=fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>cached);return cached||fresh;}));
});`;
try{
  const b=new Blob([sw],{type:'text/javascript'});
  navigator.serviceWorker.register(URL.createObjectURL(b)).then(reg=>{
    reg.update().catch(()=>{});
    let refreshed=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(refreshed) return; refreshed=true; window.location.reload();
    });
  }).catch(()=>{});
}catch(e){}}
function showError(t,m){
  // Built with real DOM nodes + textContent (not innerHTML) since `m` is a
  // caught exception's message/stack — it can embed text this app didn't
  // author (e.g. from synced data that broke rendering) and must never be
  // parsed as HTML.
  const root=document.getElementById('root');
  root.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='font-family:sans-serif;padding:40px 20px;max-width:540px;margin:0 auto';
  const title=document.createElement('div');
  title.style.cssText='color:#E85D4A;font-size:18px;font-weight:700;margin-bottom:10px';
  title.textContent='⚠ '+t;
  const pre=document.createElement('pre');
  pre.style.cssText='background:#f8f8f8;border:1px solid #eee;border-radius:6px;padding:12px;font-size:10px;overflow-x:auto;color:#555;white-space:pre-wrap';
  pre.textContent=m;
  const hint=document.createElement('p');
  hint.style.cssText='color:#888;font-size:12px;margin-top:14px';
  hint.textContent='Hard-refresh: Ctrl+Shift+R / Cmd+Shift+R';
  wrap.appendChild(title);wrap.appendChild(pre);wrap.appendChild(hint);
  root.appendChild(wrap);
}
document.addEventListener('DOMContentLoaded',function(){
  if(typeof React==='undefined'||typeof ReactDOM==='undefined'){showError('React failed to initialize','Inline React bundle did not load.');return;}
  if(typeof window.Recharts==='undefined'){showError('Chart library failed','Inline Recharts failed to init.');return;}
  try{ (() => {
