import { useEffect, useRef, useState } from "../lib/runtime.js";
  // Pull down at the top of the page to reload the household from the cloud.
  // `loadRef` holds the current load function (it changes identity with the
  // household, and the gesture handlers mount once). Moved out of App as is.
  export function usePullToRefresh(houseLoadRef) {
    const [pullProgress, setPullProgress] = useState(0);
    const [pullActive, setPullActive] = useState(false);
    const ptrRef = useRef({ startY: 0, active: false });
    // `progress` is mirrored into a ref because the end-of-gesture handler
    // needs to read the latest value. Reading it from state instead put
    // pullProgress in this effect's dependency list, and since every
    // touchmove sets it, the effect tore down and re-added three window
    // listeners on every frame of the gesture — the hottest path on the
    // device with the least CPU to spare. The effect now mounts once.
    const pullProgressRef = useRef(0);
    useEffect(() => {
      const setProgress = (v) => {
        pullProgressRef.current = v;
        setPullProgress(v);
      };
      const onStart = (e) => {
        const sc = document.querySelector(".app-scroll");
        if (window.scrollY > 10 || sc && sc.scrollTop > 10) return;
        if (document.querySelector(".modal-overlay")) return;
        ptrRef.current = { startY: e.touches[0].clientY, active: true };
      };
      const onMove = (e) => {
        if (!ptrRef.current.active) return;
        const dy = e.touches[0].clientY - ptrRef.current.startY;
        if (dy > 0) setProgress(Math.min(1, dy / 80));
      };
      const onEnd = () => {
        if (!ptrRef.current.active) return;
        ptrRef.current.active = false;
        if (pullProgressRef.current >= 1) {
          setPullActive(true);
          setTimeout(() => setPullActive(false), 2500);
          try {
            if (houseLoadRef.current) houseLoadRef.current();
          } catch (e) {
            // A reload failure is already reported through the sync status;
            // this guard only stops a throw escaping the event handler.
          }
        }
        setProgress(0);
      };
      window.addEventListener("touchstart", onStart, { passive: true });
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
      return () => {
        window.removeEventListener("touchstart", onStart);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
    }, []);
  return { pullProgress, pullActive };
  }
