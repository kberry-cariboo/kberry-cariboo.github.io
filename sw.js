// CashFlow service worker. Built to sw.js at the repo root by build.js, which
// substitutes v190-e0a1d4e786c2 with the CF_VERSION constant in bootstrap-head.js
// so the cache name and the app bundle always bump together.
//
// This has to be a real same-origin file: it used to be registered from a
// blob: URL, which every browser rejects ("The URL protocol of the script
// ('blob:...') is not supported"), so the registration silently failed and
// offline caching never actually worked. A registered worker is also the only
// way to receive Web Push — push events are delivered to the worker, not to a
// page — and on Android it's the only way to show a notification at all
// (Chrome for Android does not implement the `new Notification()` constructor).
const CACHE = 'cf-v190-e0a1d4e786c2';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // `cache: 'reload'` — bypass the HTTP cache on the way out. A plain
      // c.add() is an ordinary fetch, so it can be answered from the HTTP
      // cache with the build this worker is replacing, and then the new
      // worker precaches the old page and serves it to every navigation until
      // the *next* deploy. GitHub Pages sends max-age=600 on HTML, so that is
      // a ten-minute window on every release, and it only became visible once
      // navigations started being served from this cache rather than the
      // network.
      .then((c) => fetch(new Request(self.registration.scope, { cache: 'reload' }))
        .then((r) => { if (r.ok) return c.put(self.registration.scope, r); }))
      // Precaching is an optimisation, not a precondition: a worker that
      // cannot reach the network still has to install, or the app never gets
      // an updated worker while offline and never picks one up later.
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((cs) => cs.forEach((c) => c.postMessage({ type: 'CF_SW_ACTIVATED', cache: CACHE })))
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Everything below reads and writes through `caches.open(CACHE)` rather than
  // the global `caches.match()`. That distinction is load-bearing: the global
  // form searches *every* cache in the origin, so a stale entry left behind by
  // an older version can be served by a newer worker that has already deleted
  // that cache. And one does get left behind — an outgoing worker's background
  // revalidation can land its `caches.open(CACHE).put(...)` after the incoming
  // worker's activate has swept the old caches, which silently recreates the
  // old cache with one entry in it. Scoped to its own cache, a worker can only
  // ever serve what it put there itself; the resurrected cache is inert and the
  // next activate sweeps it.
  //
  // Clone eagerly, before the response is handed back: `r.clone()` has to
  // happen while the body is still unread, not inside a later `.then`.
  const keep = (req, res) => {
    if (!res || !res.ok) return Promise.resolve();
    const copy = res.clone();
    return caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  };

  // Tell every open window which build the network just handed back. The page
  // compares it against the one it is running and reloads if they differ — see
  // bootstrap-head.js.
  //
  // This is the mechanism that actually delivers an update, and it belongs
  // here rather than in the install/activate lifecycle because it does not
  // depend on that lifecycle working. A new worker can install and then sit in
  // `waiting` — observed, intermittently, when the old worker is still
  // finishing requests — and then activate, clients.claim and controllerchange
  // never fire at all. The controllerchange handler stays as a second route,
  // but the update no longer rides on it: the *outgoing* worker does the
  // revalidation and the reporting, so it works whatever the incoming one does.
  const announce = (res) => res.clone().text().then((body) => {
    const m = body.match(/CF_VERSION\s*=\s*'([^']+)'/);
    if (!m) return;
    return self.clients.matchAll({ type: 'window' })
      .then((cs) => cs.forEach((c) => c.postMessage({ type: 'CF_BUILD', version: m[1] })));
  }).catch(() => {});

  // Navigations: serve the cached page, refresh it behind you.
  //
  // This used to be network-first with `cache: 'no-store'`, which made the
  // cache an offline fallback and nothing else — every launch re-downloaded
  // the whole app. Measured: 387 KB gzipped, which on a 1.6 Mbps connection is
  // the better part of two seconds before anything can start, on every launch
  // rather than only the first.
  //
  // Serving the cached copy first does mean a launch immediately after a
  // deploy starts on the previous build. It corrects itself within that same
  // launch: the request below still goes out, a changed sw.js installs and
  // activates (skipWaiting + clients.claim), and the controllerchange handler
  // in bootstrap-head.js reloads the open app onto the new bundle. That
  // machinery already existed — this only stops the page waiting on the
  // network to find out there was nothing new.
  //
  // `cache: 'no-store'` stays on the background request: without it the HTTP
  // cache can answer, and then a deploy would go unnoticed until it expired.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        // install() caches the registration scope ("/", or "/repo/"), so a
        // request for "/index.html" — the same page, spelled out — misses on an
        // exact match. Fall back to the scope entry, which is the app shell this
        // is serving either way. Without this the offline fallback missed too.
        c.match(e.request)
          .then((hit) => hit || c.match(self.registration.scope))
          .then((cached) => {
            const fresh = fetch(e.request, { cache: 'no-store' })
              // Cache it before saying anything: the page's response to the
              // announcement is to reload, and that reload is served from this
              // cache. Announcing first would race it onto the old copy.
              // Only worth reading the body back when there was something
              // cached to be out of date in the first place: on a first visit
              // this response *is* the page being loaded.
              .then((r) => keep(e.request, r).then(() => cached ? announce(r) : null).then(() => r))
              .catch(() => cached);
            // Nothing cached yet (a first visit, or a fresh cache after an
            // activate) — there is nothing to be fast with, so wait for the
            // network.
            return cached || fresh;
          })
      )
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(e.request).then((cached) => {
      const fresh = fetch(e.request)
        .then((r) => keep(e.request, r).then(() => r))
        .catch(() => cached);
      return cached || fresh;
    }))
  );
});

// Web Push. The payload is the JSON object the send-notifications Edge
// Function encrypts (see supabase/functions/send-notifications/index.ts):
// { title, body, tag, url }. Android renders this as an ordinary system
// notification in the shade, with the app closed and the browser not running.
//
// userVisibleOnly:true is a hard condition of the subscription — a push that
// resolves without calling showNotification() gets the browser's own
// "This site has been updated in the background" notification instead, and
// repeated offences can revoke the permission. So every branch below shows
// something, including the malformed-payload fallback.
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (err) {
    data = {};
  }
  const title = data.title || 'CashFlow';
  const opts = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: data.tag || 'cf-push',
    // Same tag replaces an older notification rather than stacking a second
    // copy; renotify makes that replacement buzz again instead of updating
    // silently, which is what you want for "this is today's alert".
    renotify: true,
    data: { url: data.url || './' }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        // Match on origin rather than the full href: an already-open app on a
        // different tab/hash should be focused and navigated, not duplicated.
        if (new URL(c.url).origin === new URL(target).origin && 'focus' in c) {
          if ('navigate' in c && c.url !== target) return c.navigate(target).then((n) => (n || c).focus());
          return c.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
