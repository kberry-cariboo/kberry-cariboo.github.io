  // Focus management for every dialog the app renders: return focus to what
  // opened it, and keep Tab inside the topmost one. Moved out of App as is.
  function useDialogFocus() {
    // Dialogs already move focus in (autoFocus / the trap below) and Escape
    // already closes every one of them, but on close focus fell to <body> —
    // so a keyboard user was returned to the very top of the tab order, ~32
    // stops from where they had been. Remembering the trigger is the missing
    // half of the contract.
    //
    // Done once here with a MutationObserver rather than in each of the
    // fifteen modal call sites: they are rendered inline by nine different
    // components with no shared wrapper, and a rule that lives in one place
    // covers the ones that don't exist yet. The stack handles a dialog opened
    // from inside another (a confirm over the entry form).
    useEffect(() => {
      const OVERLAY = ".modal-overlay,.ctx-menu-desktop,.ctx-menu-backdrop";
      // The trigger has to be recorded as focus moves, not when the overlay
      // appears: MutationObserver runs as a microtask after the commit, by
      // which point the dialog's own autoFocus has already claimed
      // activeElement and the trigger is gone. Tracking the last thing
      // focused *outside* any overlay is immune to that ordering — focus
      // landing inside a dialog never overwrites it.
      let lastOutside = null;
      const onFocusIn = (e) => {
        const el = e.target;
        if (el && el.closest && el !== document.body && !el.closest(OVERLAY)) lastOutside = el;
      };
      document.addEventListener("focusin", onFocusIn);
      let open = document.querySelectorAll(OVERLAY).length;
      const obs = new MutationObserver(() => {
        const now = document.querySelectorAll(OVERLAY).length;
        if (now < open) {
          // Only take focus back if the dialog still owns it — if something
          // else has claimed focus since, leave it alone.
          const stray = !document.activeElement || document.activeElement === document.body;
          if (lastOutside && stray && document.contains(lastOutside)) {
            try {
              lastOutside.focus({ preventScroll: true });
            } catch (e) {
              // A trigger that has since unmounted or become unfocusable is
              // not worth breaking the close on.
            }
          }
        }
        open = now;
      });
      obs.observe(document.body, { childList: true, subtree: true });
      return () => {
        obs.disconnect();
        document.removeEventListener("focusin", onFocusIn);
      };
    }, []);
    useEffect(() => {
      const trap = (e) => {
        if (e.key !== "Tab") return;
        try {
          const overlays = document.querySelectorAll(".modal-overlay");
          if (!overlays || !overlays.length) return;
          const modal = overlays[overlays.length - 1];
          const focusables = modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
          if (!focusables.length) {
            e.preventDefault();
            return;
          }
          const first = focusables[0], last = focusables[focusables.length - 1];
          if (!modal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        } catch (err) {
          // Scroll/focus restoration is cosmetic; failing it must not break
          // navigation.
        }
      };
      document.addEventListener("keydown", trap, true);
      return () => document.removeEventListener("keydown", trap, true);
    }, []);
  }
