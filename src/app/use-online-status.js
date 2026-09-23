  // Whether the browser says it is offline. Moved out of App as is.
  function useOnlineStatus() {
    // Going offline used to change nothing on screen. The sync layer already
    // handles it correctly — it skips the save and retries on reconnect (see
    // the `online` listener in household-sync.js) — but a phone with no signal
    // looked exactly like a phone that had just saved, which is the wrong
    // thing to be unsure about in a budget app. `unsaved` is the same marker
    // the Settings sync card reads, so the chip and that card can't disagree.
    const [isOffline, setIsOffline] = useState(() => {
      try {
        return navigator.onLine === false;
      } catch (e) {
        // Some browsers don't expose onLine at all — assume online rather
        // than showing a permanent offline chip we can't clear.
        return false;
      }
    });
    useEffect(() => {
      const goOff = () => setIsOffline(true);
      const goOn = () => setIsOffline(false);
      window.addEventListener("offline", goOff);
      window.addEventListener("online", goOn);
      return () => {
        window.removeEventListener("offline", goOff);
        window.removeEventListener("online", goOn);
      };
    }, []);
  return isOffline;
  }
