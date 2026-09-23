  // Idle-lock and launch-lock, with the biometric capability the lock screen
  // offers. Moved out of App as is; LOCK_KEY is module-level so the lock
  // screen's unlock (still rendered by App) stamps the same marker.
  const LOCK_KEY = "cf_last_active_at";
  function useIdleLock({ sessionUser, session, authLoading }) {
    const [lockTimeout, setLockTimeout] = useLS("cf_lock_timeout", 15);
    // Biometric setup is only offered on touch devices; the menu shortcut also
    // disappears once a credential is registered (managed from Settings after that).
    const isCoarsePointer = useIsCoarsePointer();
    const [bioAvailable, setBioAvailable] = useState(false);
    useEffect(() => {
      let live = true;
      isBiometricAvailable().then((v) => {
        if (live) setBioAvailable(v);
      });
      return () => {
        live = false;
      };
    }, []);
    // "Fingerprint sign-on": when enabled, the app starts locked and the lock
    // screen immediately prompts for the device biometric (fingerprint / face).
    // The Supabase session persists underneath — this gates the UI on-device.
    //
    // The idle-timeout auto-lock below needs the same "start locked" treatment
    // — and needs a marker that survives a reload without being erased by the
    // reload itself. A first attempt stamped a "went hidden at" timestamp on
    // visibilitychange and checked it on the next visible/boot; that failed
    // because a reload *also* fires visibilitychange→hidden on the outgoing
    // page (browsers rely on this to flush analytics before unload), which
    // overwrote the genuinely-stale timestamp with a fresh "now" moments
    // before the new page could ever read it — silently re-opening the exact
    // bypass this is meant to close. Tracking "last confirmed active" instead
    // — stamped only while visible, never touched on hide/unload — sidesteps
    // that: a reload during real activity reads a fresh stamp (correctly
    // stays unlocked), while a reload after the tab sat hidden past the
    // timeout reads a stale one (correctly locks), regardless of how the
    // reload itself fires visibility events.
    //
    // This marker lives in sessionStorage, not localStorage. localStorage is
    // shared by every tab of the origin — with the marker there, an open,
    // actively-used second tab keeps re-stamping it every 20s, so reloading
    // a *different*, genuinely-idle tab that's already showing the lock
    // screen would read that other tab's fresh stamp and boot straight back
    // into the unlocked app, bypassing the password prompt entirely.
    // sessionStorage is per-tab (isolated from every other tab) while still
    // surviving a same-tab reload/hard-refresh, which is exactly the "last
    // active" marker needs: reload-proof, but not cross-tab-forgeable.
    const [locked, setLocked] = useState(() => {
      try {
        if (localStorage.getItem("cf_lock_on_launch") === "1") return true;
        if (lockTimeout) {
          const at = parseInt(sessionStorage.getItem(LOCK_KEY) || "0", 10);
          if (at && Date.now() - at > lockTimeout * 6e4) return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });
    useEffect(() => {
      if (!lockTimeout || !sessionUser || locked) return;
      const stamp = () => {
        safeStorage.set(LOCK_KEY, String(Date.now()), "session");
      };
      stamp();
      // Re-stamp periodically while visible so elapsed *hidden* time is what
      // accumulates toward the timeout, not elapsed wall-clock time since
      // the tab was last (re)focused — a long-running, continuously visible
      // tab must never lock itself out just for staying open.
      const iv = setInterval(() => {
        if (document.visibilityState === "visible") stamp();
      }, 2e4);
      const onVis = () => {
        if (document.visibilityState !== "visible") return;
        try {
          const at = parseInt(sessionStorage.getItem(LOCK_KEY) || "0", 10);
          if (at && Date.now() - at > lockTimeout * 6e4) setLocked(true);
          else stamp();
        } catch (err) {
          // Storage can throw outright in private/partitioned modes.
          // Nothing here is essential to the current interaction, so a
          // failure is genuinely ignorable — real save failures surface via
          // notifyStorageWriteFailure.
        }
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        document.removeEventListener("visibilitychange", onVis);
        clearInterval(iv);
      };
    }, [lockTimeout, sessionUser, locked]);
    useEffect(() => {
      // Clear the lock only on a real signed-out state — during startup the
      // session is still loading and the launch lock must survive until the
      // lock screen can prompt for the fingerprint.
      if (!authLoading && !session) {
        setLocked(false);
        safeStorage.remove(LOCK_KEY, "session");
      }
    }, [authLoading, session]);
    return { locked, setLocked, lockTimeout, setLockTimeout, bioAvailable, isCoarsePointer };
  }
