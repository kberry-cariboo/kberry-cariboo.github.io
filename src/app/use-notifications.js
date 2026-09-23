  // Notifications, both layers: the foreground once-a-day alerts while the
  // app is open, and Web Push (subscription upkeep plus publishing the 90-day
  // schedule the Edge Function sends from). Moved out of App as is.
  function useNotifications({ household, yearFlows, completed, alertThresh, activeYear, activeFlow, navLowInfo, todayKey }) {
    const [notifyEnabled, setNotifyEnabled] = useLS("cf_notify_enabled", false);
    // Sourced only from Notification.requestPermission()'s resolved value,
    // never re-read from the Notification.permission property afterward —
    // some browsers (observed under CDP-driven permission grants) don't
    // keep that property perfectly in sync with the promise's result in
    // the same tick, which showed the Settings toggle as "granted" while
    // the status text still read the stale "denied" default.
    const [notifPerm, setNotifPerm] = useState(() => {
      try {
        return typeof Notification !== "undefined" ? Notification.permission : "unsupported";
      } catch (e) {
        return "unsupported";
      }
    });
    // Notifications come from two places, and both go through the service
    // worker registration (see src/lib/push.js for why the `new Notification()`
    // constructor is never used — it doesn't exist on Android):
    //
    //   foreground — the effect below, fired while the app is open. Instant,
    //                needs no server, works even without push configured.
    //   background — Web Push. The app publishes a rolling 90-day schedule of
    //                upcoming alerts to Supabase; a cron'd Edge Function sends
    //                the ones due today to each subscribed device. This is what
    //                reaches the phone with the app and browser both closed.
    const [notifyHour, setNotifyHour] = useLS("cf_notify_hour", DEFAULT_NOTIFY_HOUR);
    const [pushState, setPushState] = useState({ status: "idle", detail: "" });
    const enableNotifications = async () => {
      try {
        if (typeof Notification === "undefined") return;
        const perm = await requestNotificationPermission();
        setNotifPerm(perm);
        setNotifyEnabled(perm === "granted");
        if (perm !== "granted") return;
        setPushState({ status: "working", detail: "" });
        const res = await subscribeToPush(notifyHour);
        setPushState(res.ok ? { status: "subscribed", detail: "" } : { status: "unavailable", detail: res.reason || "" });
      } catch (e) {
        setNotifyEnabled(false);
        setPushState({ status: "unavailable", detail: e.message || "" });
      }
    };
    const disableNotifications = async () => {
      setNotifyEnabled(false);
      setPushState({ status: "idle", detail: "" });
      await unsubscribeFromPush();
    };
    // Push endpoints get rotated by the push service, and a reinstalled PWA
    // subscribes afresh — re-registering on launch (and whenever the delivery
    // hour changes) keeps the server's row pointing at this device.
    useEffect(() => {
      if (!notifyEnabled || notifPerm !== "granted" || !household) return;
      let live = true;
      refreshPushSubscription(notifyHour).then((res) => {
        if (!live) return;
        setPushState(res.ok ? { status: "subscribed", detail: "" } : { status: "unavailable", detail: res.reason || "" });
      });
      return () => {
        live = false;
      };
    }, [notifyEnabled, notifPerm, household, notifyHour]);
    // Republish the schedule whenever the underlying money changes. Debounced
    // because entry edits arrive in bursts while typing.
    useEffect(() => {
      if (!notifyEnabled || !household || !supabaseClient) return;
      const id = setTimeout(() => {
        try {
          const rows = buildNotificationSchedule({ yearFlows, completed, alertThreshold: alertThresh });
          publishNotificationSchedule(rows);
        } catch (e) {
          // A schedule we couldn't build isn't worth breaking the app over —
          // the previous rows stay in place until the next successful publish.
        }
      }, 2500);
      return () => clearTimeout(id);
    }, [notifyEnabled, household, yearFlows, completed, alertThresh]);
    useEffect(() => {
      if (!notifyEnabled) return;
      if (typeof Notification === "undefined" || notifPerm !== "granted") return;
      if ((/* @__PURE__ */ new Date()).getFullYear() !== activeYear) return;
      // Once per day per alert, and it has to be localStorage: sessionStorage
      // is scoped to the tab session, which an installed PWA tears down every
      // time it's closed. On mobile that made "once per day" mean "once per
      // app launch" — reopening the app re-fired the same low-balance and
      // bills-due notifications all day long.
      //
      // The stored value is todayKey, so a stale entry from a previous day
      // simply doesn't match and the alert fires once more; there's nothing to
      // expire or clean up. Storage throws outright in some privacy modes, so
      // treat an unreadable store as "already notified" rather than
      // re-notifying on every render.
      const seen = (k) => {
        try {
          return localStorage.getItem(k) === todayKey;
        } catch (e) {
          return true;
        }
      };
      const markSeen = (k) => {
        safeStorage.set(k, todayKey);
      };
      if (navLowInfo && !seen("cf_notified_lowbal")) {
        showLocalNotification("Low balance forecast", {
          body: `Balance forecast to dip to ${fmt(navLowInfo.min)} around ${MONTHS[navLowInfo.month]} ${navLowInfo.day}.`,
          tag: "cf-lowbal"
        });
        markSeen("cf_notified_lowbal");
      }
      // A single notification covering everything due today, itemised in the
      // body — same wording the push schedule uses (billDigestMessage), so a
      // bill reads the same whether the app was open or closed when it landed.
      const today = startOfToday();
      const dueToday = activeFlow.filter((ev) => ev.type === "expense" && ev.month === today.getMonth() && ev.day === today.getDate() && !completed[ev.id]);
      if (dueToday.length > 0 && !seen("cf_notified_duetoday")) {
        const msg = billDigestMessage(dueToday.map((ev) => ({ id: ev.id, desc: ev.desc, cents: ev.amount })));
        showLocalNotification(msg.title, { body: msg.body, tag: "cf-bills-due" });
        markSeen("cf_notified_duetoday");
      }
    }, [notifyEnabled, notifPerm, navLowInfo, activeFlow, completed, activeYear, todayKey]);
  return { notifyEnabled, setNotifyEnabled, notifPerm, notifyHour, setNotifyHour, pushState, enableNotifications, disableNotifications };
  }
