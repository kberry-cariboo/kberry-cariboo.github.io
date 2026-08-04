// Bumping this invalidates the service worker's cache. build.js reads the
// literal out of this line to stamp the generated sw.js, so the worker and the
// bundle it caches can never disagree about which version they are.
//
// BUMP THIS WITH EVERY USER-VISIBLE CHANGE. It isn't decoration: it's the only
// signal an installed PWA gets that there's anything new. Leave it alone and
// the generated sw.js is byte-identical, so the browser sees no new worker,
// never runs the install/activate cycle, and never fires the controllerchange
// that reloads the open app — users sit on the old bundle indefinitely. (This
// is exactly what happened across the notification work: four rounds of
// changes all shipped under v177, and the app kept showing the old Settings
// copy after the new one was live.)
const CF_VERSION='v179';
if('serviceWorker'in navigator){
try{
  const hadController=!!navigator.serviceWorker.controller;
  // A real same-origin script, not a blob: URL — see the header comment in
  // src/sw.js. Registered relative to the document so the worker's scope is
  // the app root whether that's a user site (/) or a project page (/repo/).
  navigator.serviceWorker.register('sw.js').then(reg=>{
    reg.update().catch(()=>{});
    let refreshed=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      // The first-ever install also fires controllerchange (no controller -> controlled) —
      // that's not an update, so only reload when a controller already existed before this.
      if(!hadController) return;
      if(refreshed) return; refreshed=true; window.location.reload();
    });
  }).catch((err)=>{
    // This is the catch that hid a real bug for months: registration was
    // failing outright (blob: URL) and nothing said so, which silently cost
    // offline caching and made push impossible. Never swallow it again.
    console.warn('CashFlow: service worker registration failed — offline caching and notifications are unavailable.', err);
  });
}catch(e){
  console.warn('CashFlow: could not register a service worker.', e);
}}
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
