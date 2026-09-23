  // The app-wide keyboard shortcuts: tab digits and letters, "/" for search,
  // arrows for the month, Escape, and Ctrl/⌘+Z for the undo toast — never
  // while typing, never under a dialog. Moved out of App as is.
  function useKeyboardShortcuts({ setTab, setFlowSub, setPlanSub, setBudgetMonth, setGlobalSearch, undoStackRef, undoLast, tab }) {
    // Single global shortcut handler — digits, letters, arrows, and search
    // share one guard set: never while typing, never under an open modal or
    // panel (the letter shortcuts used to fire behind confirm dialogs).
    useEffect(() => {
      const TAB_KEYS = { "1": "today", "2": "flow", "3": "envelopes", "4": "plan" };
      const handler = (e) => {
        var _a2, _b;
        const tag = (((_a2 = e.target) == null ? void 0 : _a2.tagName) || "").toLowerCase();
        const isInput = tag === "input" || tag === "textarea" || tag === "select" || ((_b = e.target) == null ? void 0 : _b.isContentEditable);
        if (isInput) return;
        if (e.key === "Escape") {
          setGlobalSearch("");
          return;
        }
        // Nothing below runs under an open dialog. Undo used to sit above
        // this line despite its comment, so Ctrl+Z reverted the last action
        // behind a form the user was still looking at.
        if (document.querySelector(".modal-overlay")) return;
        // Undo the last undoable action. Guarded the same way the letter
        // shortcuts are (never while typing, never under a modal), and it only
        // does anything while the toast is up — this is the toast's button
        // under a keyboard, not a general document history.
        if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
          if (!undoStackRef.current.length) return;
          e.preventDefault();
          const top = undoStackRef.current[undoStackRef.current.length - 1];
          try {
            top.revert();
          } catch (err) {
            toast("Couldn't undo that.", "error");
          }
          undoLast();
          return;
        }
        if (TAB_KEYS[e.key]) {
          e.preventDefault();
          setTab(TAB_KEYS[e.key]);
          return;
        }
        if (e.key === "/") {
          e.preventDefault();
          const el = document.getElementById("global-search");
          if (el) {
            el.focus();
            el.select();
          }
          return;
        }
        switch (e.key) {
          case "d":
          case "D":
            setTab("today");
            break;
          case "f":
          case "F":
            setTab("flow");
            setFlowSub("curve");
            break;
          case "b":
          case "B":
            setTab("flow");
            break;
          case "r":
          case "R":
            setTab("flow");
            setFlowSub("entries");
            break;
          case "e":
          case "E":
            setTab("envelopes");
            break;
          case "p":
          case "P":
            setTab("plan");
            break;
          case "a":
          case "A":
            setTab("plan");
            setPlanSub("insights");
            break;
          case "s":
          case "S":
            setTab("you");
            break;
          case "n":
          case "N":
            window.dispatchEvent(new CustomEvent("cf:quickadd"));
            break;
          case "?":
            // The shortcuts used to be a modal of their own. They're a
            // section of the Help page now, so "?" routes there and jumps
            // to it once the page has rendered.
            setTab("help");
            setTimeout(() => {
              const el = document.getElementById("help-shortcuts");
              if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
            }, 150);
            break;
          case "ArrowLeft":
            if (tab === "flow" || tab === "envelopes") setBudgetMonth((v) => Math.max(0, v - 1));
            break;
          case "ArrowRight":
            if (tab === "flow" || tab === "envelopes") setBudgetMonth((v) => Math.min(11, v + 1));
            break;
          default:
            break;
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [tab]);
  }
