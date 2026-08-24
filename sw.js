// CashFlow service worker. Built to sw.js at the repo root by build.js, which
// substitutes v184-a3d5fa318306 with the CF_VERSION constant in bootstrap-head.js
// so the cache name and the app bundle always bump together.
//
// This has to be a real same-origin file: it used to be registered from a
// blob: URL, which every browser rejects ("The URL protocol of the script
// ('blob:...') is not supported"), so the registration silently failed and
// offline caching never actually worked. A registered worker is also the only
// way to receive Web Push — push events are delivered to the worker, not to a
// page — and on Android it's the only way to show a notification at all
// (Chrome for Android does not implement the `new Notification()` constructor).
const CACHE = 'cf-v184-a3d5fa318306';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add(self.registration.scope))
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
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then((r) => {
          if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fresh = fetch(e.request)
        .then((r) => {
          if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
          return r;
        })
        .catch(() => cached);
      return cached || fresh;
    })
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
