  // Notifications — foreground (shown by the page while it's open) and
  // background Web Push (delivered by the browser's push service with the app
  // closed, rendered by Android as an ordinary system notification).
  //
  // Everything here goes through the service worker registration, never the
  // `new Notification()` constructor: Chrome for Android doesn't implement that
  // constructor at all (it throws "Illegal constructor"), so the constructor
  // form only ever worked on desktop. registration.showNotification() works on
  // both.
  const NOTIFY_HORIZON_DAYS = 90;
  const DEFAULT_NOTIFY_HOUR = 8;

  function pushSupported() {
    try {
      return "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
    } catch (e) {
      return false;
    }
  }

  // Base64url (what VAPID keys and the spec's examples use) -> Uint8Array,
  // which is the only form applicationServerKey accepts.
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  // A VAPID application server key is an uncompressed P-256 point: 65 bytes
  // (0x04 || X || Y), which is 87 base64url characters. Checking here turns a
  // mistyped or half-pasted key into a clear message in Settings, instead of
  // an opaque "applicationServerKey is not valid" from deep inside subscribe()
  // — or worse, a key that decodes to *something* and fails only at send time.
  function vapidKeyLooksValid(key) {
    if (!key) return false;
    if (!/^[A-Za-z0-9\-_]+=*$/.test(key)) return false;
    try {
      return urlBase64ToUint8Array(key).length === 65;
    } catch (e) {
      return false;
    }
  }

  function bufferToBase64Url(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // navigator.serviceWorker.ready never rejects and never resolves if no
  // worker is registered, so every caller needs a timeout or it hangs forever.
  function swRegistration(timeoutMs = 8e3) {
    if (!("serviceWorker" in navigator)) return Promise.resolve(null);
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise((res) => setTimeout(() => res(null), timeoutMs))
    ]).catch(() => null);
  }

  async function showLocalNotification(title, opts) {
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
      const reg = await swRegistration();
      if (!reg) return false;
      await reg.showNotification(title, Object.assign({ icon: "icon-192.png", badge: "icon-192.png" }, opts));
      return true;
    } catch (e) {
      return false;
    }
  }

  async function requestNotificationPermission() {
    if (typeof Notification === "undefined") return "unsupported";
    // Trust the resolved value rather than re-reading Notification.permission —
    // the property isn't always updated in the same tick (see the notifPerm
    // comment in App.js).
    return await Notification.requestPermission();
  }

  function deviceTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (e) {
      return "UTC";
    }
  }

  // Subscribe this device/browser to Web Push and record it server-side, so the
  // Edge Function has somewhere to send to. Returns { ok, reason }.
  async function subscribeToPush(notifyHour = DEFAULT_NOTIFY_HOUR) {
    if (!pushSupported()) return { ok: false, reason: "unsupported" };
    if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "no-vapid-key" };
    if (!vapidKeyLooksValid(VAPID_PUBLIC_KEY)) return { ok: false, reason: "bad-vapid-key" };
    if (!supabaseClient) return { ok: false, reason: "no-supabase" };
    const reg = await swRegistration();
    if (!reg || !reg.pushManager) return { ok: false, reason: "no-service-worker" };
    let sub = null;
    try {
      sub = await reg.pushManager.getSubscription();
      // A subscription made against a different application server key can't
      // receive our pushes — drop it and make a fresh one rather than silently
      // keeping a dead endpoint.
      if (sub) {
        const existing = sub.options && sub.options.applicationServerKey
          ? bufferToBase64Url(sub.options.applicationServerKey)
          : null;
        if (existing && existing !== VAPID_PUBLIC_KEY.replace(/=+$/, "")) {
          await sub.unsubscribe().catch(() => {
          });
          sub = null;
        }
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          // Required by Chrome: every push must result in a visible
          // notification. The service worker's push handler always shows one.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }
    } catch (e) {
      return { ok: false, reason: e.message || "subscribe-failed" };
    }
    const json = sub.toJSON();
    const { error } = await supabaseClient.rpc("save_push_subscription", {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys && json.keys.p256dh,
      p_auth: json.keys && json.keys.auth,
      p_timezone: deviceTimeZone(),
      p_notify_hour: notifyHour
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, endpoint: json.endpoint };
  }

  async function unsubscribeFromPush() {
    try {
      const reg = await swRegistration();
      if (!reg || !reg.pushManager) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {
      });
      // Delete server-side after unsubscribing, not before: if the RPC fails we
      // still want the browser-side subscription gone, and a stale row is
      // harmless (the push service returns 410 and the function prunes it).
      if (supabaseClient) await supabaseClient.rpc("delete_push_subscription", { p_endpoint: endpoint });
    } catch (e) {
      // Best effort — the toggle is already off locally.
    }
  }

  // Re-register the current subscription. Push services rotate endpoints, and
  // the `pushsubscriptionchange` event can't reach our RPCs (the worker has no
  // Supabase session), so the app repairs its own row on every launch instead.
  async function refreshPushSubscription(notifyHour) {
    if (!pushSupported()) return { ok: false, reason: "unsupported" };
    if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "no-vapid-key" };
    if (!vapidKeyLooksValid(VAPID_PUBLIC_KEY)) return { ok: false, reason: "bad-vapid-key" };
    if (!supabaseClient) return { ok: false, reason: "no-supabase" };
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return { ok: false, reason: "not-granted" };
    }
    return await subscribeToPush(notifyHour);
  }

  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Precompute the alerts worth sending over the next NOTIFY_HORIZON_DAYS.
  //
  // Why precompute on the client instead of recomputing server-side: the money
  // model (recurrence expansion, per-occurrence overrides, skips, split
  // entries, planned-vs-actual amounts, carry-forward opening balances) lives
  // in expandEntries/computeFlow and is genuinely intricate. Porting it to the
  // Edge Function would mean a second implementation to keep in step with
  // every future change to the first, with no shared-module mechanism between
  // the browser bundle and Deno to keep them honest. Instead the app publishes
  // a flat list of "on this date, say this" rows whenever its data changes,
  // and the function only has to look up today's rows and send them.
  //
  // The tradeoff is staleness: the schedule extends 90 days out and is
  // refreshed on every save, so it only runs dry if the app isn't opened for
  // three months. The one thing that genuinely can't be precomputed is whether
  // a bill has since been marked paid — the Edge Function re-checks that
  // against completed_occurrences at send time.
  function buildNotificationSchedule({ yearFlows = {}, completed = {}, alertThreshold = 0, horizonDays = NOTIFY_HORIZON_DAYS, now = /* @__PURE__ */ new Date() }) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(today);
    end.setDate(end.getDate() + horizonDays);
    const inWindow = [];
    Object.keys(yearFlows).forEach((year) => {
      (yearFlows[year] || []).forEach((ev) => {
        const d = new Date(Number(year), ev.month, ev.day);
        if (d < today || d > end) return;
        inWindow.push({ ev, date: d });
      });
    });
    inWindow.sort((a, b) => a.date - b.date);

    const rows = [];

    // 1. One row per bill, on the day it's due — not one digest per day and
    //    not a weekly roll-up. Each becomes its own notification naming the
    //    bill and its amount, so the notification shade reads as a to-do list
    //    you can dismiss item by item as you pay them.
    //
    //    occurrence_id is what makes these individually addressable: it keys
    //    the row, tags the notification (so several on the same day stack
    //    instead of replacing each other), and lets the sender skip a bill
    //    that's been marked paid since the schedule was written.
    inWindow.forEach(({ ev, date }) => {
      if (ev.type !== "expense") return;
      if (completed[ev.id]) return;
      rows.push({
        for_date: ymd(date),
        kind: "bill_due",
        occurrence_id: ev.id,
        title: `${ev.desc} is due today`,
        body: ev.category ? `${fmt(ev.amount)} · ${ev.category}` : fmt(ev.amount),
        url: "./#budget"
      });
    });

    // 2. Low-balance warning, sent three days ahead of the dip so there's time
    //    to do something about it. Only the first dip in the window is worth a
    //    notification — after that the user knows.
    const dip = inWindow.find(({ ev }) => ev.balance < alertThreshold);
    if (dip) {
      const warnAt = new Date(dip.date);
      warnAt.setDate(warnAt.getDate() - 3);
      if (warnAt < today) warnAt.setTime(today.getTime());
      rows.push({
        for_date: ymd(warnAt),
        kind: "low_balance",
        // Not tied to a single occurrence — empty string rather than null so
        // it still participates in the (date, kind, occurrence) primary key.
        occurrence_id: "",
        title: "Low balance ahead",
        body: `Balance is forecast to dip to ${fmt(dip.ev.balance)} on ${humanShortDate(ymd(dip.date))}, below your ${fmt(alertThreshold)} threshold.`,
        url: "./#dashboard"
      });
    }

    return rows;
  }

  // Replaces the household's whole schedule in one call — simpler and more
  // robust than diffing, since the rows are cheap and fully derived.
  async function publishNotificationSchedule(rows) {
    if (!supabaseClient) return { ok: false, reason: "no-supabase" };
    const { error } = await supabaseClient.rpc("save_notification_schedule", { p_rows: rows });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, count: rows.length };
  }
