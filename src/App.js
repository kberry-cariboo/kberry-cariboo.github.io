  function App() {
    var _a;
    if (typeof location !== "undefined" && location.search.includes("selftest")) return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SelfTestView, null));
    const {
      configured: sbConfigured,
      session,
      authLoading,
      household,
      members,
      membershipLoading,
      createHousehold,
      joinHousehold,
      createInvite,
      setMemberDisabled,
      updateMemberName,
      updateMyName,
      signOut
    } = useHousehold();
    const sessionUser = useMemo(() => {
      if (!session) return null;
      const me = members.find((m) => m.user_id === session.user.id);
      return {
        id: session.user.id,
        email: session.user.email,
        fullName: (me && me.full_name) || session.user.email,
        disabled: (me && me.disabled) || false
      };
    }, [session, members]);
    const logout = () => {
      signOut();
    };
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
    const LOCK_KEY = "cf_last_active_at";
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
        try {
          sessionStorage.setItem(LOCK_KEY, String(Date.now()));
        } catch (e) {
          // Storage can throw outright in private/partitioned modes.
          // Nothing here is essential to the current interaction, so a
          // failure is genuinely ignorable — real save failures surface via
          // notifyStorageWriteFailure.
        }
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
        try {
          sessionStorage.removeItem(LOCK_KEY);
        } catch (e) {
          // Storage can throw outright in private/partitioned modes.
          // Nothing here is essential to the current interaction, so a
          // failure is genuinely ignorable — real save failures surface via
          // notifyStorageWriteFailure.
        }
      }
    }, [authLoading, session]);
    // Every household-synced field's state at once, created from the single
    // table in household-sync.js (storage key, default, guard, backup and
    // autosave behaviour all live there, next to each other).
    //
    // The names destructured below are local convenience only: the sync reads
    // houseValues/houseSetters, so a field nobody destructures here still
    // saves, loads, exports and clears correctly — and a misspelt one is a
    // ReferenceError at first use rather than a field that quietly never
    // leaves the device.
    const { values: houseValues, setters: houseSetters } = useHouseholdState();
    const {
      entries,
      overridesByYr,
      yearConfigs,
      categories,
      categoryColors,
      activeYear,
      alertThreshold: alertThresh,
      darkMode,
      forecastHorizon,
      goals,
      dashHidden,
      dashOrder,
      colOrder,
      // The Entries filters keep their "regFilter*" payload names for
      // compatibility (see the table); only these bindings are renamed.
      regFilter: entriesFilter,
      regFilterCats: entriesFilterCats,
      regFilterScheds: entriesFilterScheds,
      regFilterStatus: entriesFilterStatus,
      budgetTargets,
      templates,
      completed,
      debtData,
      deletedCopyIds,
      holidays,
      currency,
      locale,
      holidayRegion: holidayRegionCode,
      activity,
      accounts
    } = houseValues;
    const {
      entries: setEntries,
      overridesByYr: setOverridesByYr,
      yearConfigs: setYearConfigs,
      categories: setCategories,
      categoryColors: setCategoryColors,
      activeYear: setActiveYear,
      alertThreshold: setAlertThresh,
      darkMode: setDarkMode,
      forecastHorizon: setForecastHorizon,
      goals: setGoals,
      dashHidden: setDashHidden,
      dashOrder: setDashOrder,
      colOrder: setColOrder,
      regFilter: setEntriesFilter,
      regFilterCats: setEntriesFilterCats,
      regFilterScheds: setEntriesFilterScheds,
      regFilterStatus: setEntriesFilterStatus,
      budgetTargets: setBudgetTargets,
      templates: setTemplates,
      completed: setCompleted,
      debtData: setDebtData,
      deletedCopyIds: setDeletedCopyIds,
      holidays: setHolidays,
      currency: setCurrency,
      locale: setLocale,
      holidayRegion: setHolidayRegionCode,
      activity: setActivity,
      accounts: setAccounts
    } = houseSetters;
    // Deliberately not a household field: a personal API credential, never
    // synced to the household and never written into a backup file.
    const [aiApiKey, setAiApiKey] = useLS("cf_ai_key", "");
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
    const [tab, setTab] = useState(() => {
      const fromHash = parseTabHash().tab;
      if (fromHash) return fromHash;
      try {
        return sessionStorage.getItem("cf_tab") || "today";
      } catch (e) {
        return "today";
      }
    });
    useEffect(() => {
      try {
        sessionStorage.setItem("cf_tab", tab);
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    }, [tab]);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    // The Plan screen owns this; the Alerts centre only reads it, so its
    // finding is computed against the same extra payment you set there.
    const [debtExtraForFindings] = useLS("cf_debt_extra", "100");
    const [flowSubRaw, setFlowSub] = useLS("cf_budget_subtab", "list");
    // The key keeps its old name on purpose: renaming a storage key silently
    // resets every existing device on upgrade. Only the value vocabulary moved.
    const flowSub = ROUTE_FLOW_SUBS.includes(flowSubRaw) ? flowSubRaw : (LEGACY_FLOW_SUBS[flowSubRaw] || "list");
    const [planSub, setPlanSub] = useLS("cf_plan_subtab", "goals");
    const hashSyncGuard = useRef(false);
    const hashInitialized = useRef(false);
    useEffect(() => {
      const fromHash = parseTabHash();
      if (fromHash.flowSub) setFlowSub(fromHash.flowSub);
      if (fromHash.planSub) setPlanSub(fromHash.planSub);
    }, []);
    useEffect(() => {
      if (hashSyncGuard.current) {
        hashSyncGuard.current = false;
        return;
      }
      let newHash;
      try {
        newHash = "#/" + tab + (tab === "flow" && flowSub ? "/" + flowSub : "") + (tab === "plan" && planSub ? "/" + planSub : "");
        if (location.hash !== newHash) {
          // First sync on a hashless load replaces the entry instead of
          // pushing — otherwise the first Back press appears to do nothing.
          if (!hashInitialized.current && !location.hash) history.replaceState(null, "", newHash);
          else history.pushState(null, "", newHash);
        }
        hashInitialized.current = true;
      } catch (e) {
        // A malformed or inaccessible hash just means no deep link; the
        // default view is correct.
      }
    }, [tab, flowSub, planSub]);
    // Name the view in the one place the browser reads: the tab strip, the
    // history entry and the bookmark. Every one of them used to say
    // "CashFlow Budget", which made a back button through six views
    // indistinguishable from a back button through one.
    //
    // printView() swaps the title and puts it back, so this deliberately
    // does not reset it on unmount — it would race the restore.
    const docTitle = viewDocTitle(tab, flowSub, planSub);
    useEffect(() => {
      try {
        document.title = docTitle;
      } catch (e) {
        // A document that won't take a title is not worth failing a render
        // over; the view still renders under whatever title it has.
      }
    }, [docTitle]);
    useEffect(() => {
      const onPopState = () => {
        const parsed = parseTabHash();
        // Not every hash is a route: the skip link is "#main-content", and
        // in-page anchors elsewhere are their own element ids. Claiming the
        // sync guard for one of those swallowed the *next* real tab change's
        // hash write, which left the URL stuck on "#main-content" — a stale
        // deep link and a Back button pointing at the wrong view.
        if (!parsed.tab) return;
        // A retired route is rewritten here rather than left to the sync
        // effect below, because that effect only runs when one of the setters
        // actually changes something — and "#/budget/monthly" while you are
        // already on the List lens changes nothing, so the address bar would
        // keep showing a route the app no longer has. replaceState, not push:
        // Back should return to wherever you came from, not to the dead link.
        if (parsed.redirected) {
          try {
            const canonical = "#/" + parsed.tab
              + (parsed.tab === "flow" && parsed.flowSub ? "/" + parsed.flowSub : "")
              + (parsed.tab === "plan" && parsed.planSub ? "/" + parsed.planSub : "");
            if (location.hash !== canonical) history.replaceState(null, "", canonical);
          } catch (e) {
            // An inaccessible history just means the old hash stays in the
            // address bar; the view underneath it is still the right one.
          }
        }
        hashSyncGuard.current = true;
        // The guard is normally consumed by the sync effect below — but that
        // effect only re-runs when one of these setters actually changes
        // something, and a hash naming the view you are already on doesn't.
        // Drop it on the next tick so a no-op navigation can't leave it armed
        // for the next real one. (Clearing early is harmless: the effect
        // still checks location.hash before it pushes anything.)
        setTimeout(() => {
          hashSyncGuard.current = false;
        }, 0);
        setTab(parsed.tab);
        if (parsed.tab === "flow" && parsed.flowSub) setFlowSub(parsed.flowSub);
        if (parsed.tab === "plan" && parsed.planSub) setPlanSub(parsed.planSub);
      };
      window.addEventListener("popstate", onPopState);
      // popstate doesn't fire for an ordinary in-page link to "#/help" or for
      // a hash typed into the address bar — only Back/Forward reach it. The
      // Help page is linked to as a plain <a href="#/help"> from the copy it
      // replaced, so the same handler runs on hashchange too.
      window.addEventListener("hashchange", onPopState);
      return () => {
        window.removeEventListener("popstate", onPopState);
        window.removeEventListener("hashchange", onPopState);
      };
    }, []);
    useEffect(() => {
      if (tab === "register") {
        setTab("flow");
        setFlowSub("entries");
      } else if (tab === "forecast") {
        setTab("flow");
        setFlowSub("curve");
      }
    }, []);
    // Switching views keeps the old scroll offset (the app root is one shared
    // scroller), so a scrolled dashboard dumped users mid-list on the next tab.
    const scrollResetReady = useRef(false);
    useEffect(() => {
      if (!scrollResetReady.current) {
        scrollResetReady.current = true;
        return;
      }
      try {
        const sc = document.querySelector(".app-scroll");
        if (sc) sc.scrollTop = 0;
        window.scrollTo(0, 0);
      } catch (e) {
        // Scroll/focus restoration is cosmetic; failing it must not break
        // navigation.
      }
    }, [tab, flowSub, planSub]);
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
    // Probe for the ai-proxy Edge Function once, here rather than in each
    // feature. aiCanRun() reads a module-level flag that only the probe sets,
    // so a component that never probes sees "no AI configured" and disables
    // its button even when the function is deployed — the CSV modal and the
    // entry form would each have had to probe on mount to avoid that. Doing it
    // at the root means one probe per load, and the setState is what re-renders
    // the tree so every button re-reads the flag once the answer is in.
    const [, setAiProxyReady] = useState(false);
    useEffect(() => {
      let live = true;
      aiProbeProxy().then((ok) => {
        if (live) setAiProxyReady(ok);
      });
      return () => {
        live = false;
      };
    }, [session]);
    const [showBackupNudge, setShowBackupNudge] = useState(false);
    useEffect(() => {
      try {
        const last = localStorage.getItem("cf_last_backup");
        const daysSince = last ? Math.floor((Date.now() - parseInt(last)) / 864e5) : 999;
        if (daysSince >= 30) setTimeout(() => setShowBackupNudge(true), 5e3);
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    }, []);
    const dismissBackup = (doExport = false) => {
      setShowBackupNudge(false);
      try {
        localStorage.setItem("cf_last_backup", String(Date.now()));
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
      if (doExport) {
        // Same full field set (and schemaVersion stamp) as Settings' Export
        // Backup — a partial payload here would restore with fields silently
        // missing, and an unstamped one gets misread as pre-v8 dollar-scale
        // data and re-centsified (100x-inflated) on import.
        const data = { entries, overridesByYr, yearConfigs, categories, categoryColors, budgetTargets, templates, completed, goals, debtData, deletedCopyIds, activeYear, alertThreshold: alertThresh, darkMode, schemaVersion: SCHEMA_VERSION, exportedAt: (/* @__PURE__ */ new Date()).toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(`CashFlow_Backup_${todayStr()}.json`, blob);
      }
    };
    // Not household fields: which month the Budget tab is showing and how its
    // columns are ordered are per-device view preferences.
    const [budgetMonth, setBudgetMonth] = useLS("cf_budgetMonth", (/* @__PURE__ */ new Date()).getMonth());
    const [budgetColOrder, setBudgetColOrder] = useLS("cf_budget_col_order", DEFAULT_BUDGET_COLS);
    // fmt() reads module state, so React has no idea its output changed when
    // the currency does. This is the one re-render that has to be forced.
    const [, setMoneyTick] = useState(0);
    useEffect(() => {
      setMoneyTick((t) => t + 1);
    }, [locale, currency]);
    const [globalSearch, setGlobalSearch] = useState("");
    const prevSearchRef = useRef("");
    useEffect(() => {
      const had = !!prevSearchRef.current;
      prevSearchRef.current = globalSearch;
      if (!globalSearch || had) return;
      // Plan and Entries filter their own lists in place — don't yank the
      // user off the thing they are already searching the moment they type.
      if (tab === "plan") return;
      if (tab === "flow" && flowSub === "entries") return;
      // Starting a search shows results in the Budget monthly view (which
      // jumps to the most recent matching month), not the Entries list.
      setTab("flow");
      setFlowSub("list");
    }, [globalSearch, tab, flowSub]);
    // What the header search will actually search, from where the user is.
    const searchScopeLabel = useMemo(() => {
      if (tab === "plan") return "Search goals and debts";
      if (tab === "flow" && flowSub === "entries") return `Search ${activeYear} entries`;
      return `Search ${activeYear}`;
    }, [tab, flowSub, activeYear]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileForm, setProfileForm] = useState(null);
    useEffect(() => {
      if (!profileForm && !menuOpen) return;
      const h = (e) => {
        if (e.key === "Escape") {
          setProfileForm(null);
          setMenuOpen(false);
        }
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [profileForm, menuOpen]);
    const [pf, setPf] = useState({ fullName: "", email: "" });
    const [pwf, setPwf] = useState({ current: "", next: "", confirm: "" });
    const [pfErr, setPfErr] = useState("");
    const [pfOk, setPfOk] = useState("");
    const [pullProgress, setPullProgress] = useState(0);
    const [pullActive, setPullActive] = useState(false);
    const ptrRef = useRef({ startY: 0, active: false });
    const houseLoadRef = useRef(null);
    const [undoStack, setUndoStack] = useState([]);
    // An undoable action is a label for the toast plus the function that puts
    // things back.
    //
    // The stack used to hold the deleted *entry*, and App knew how to restore
    // one — which meant entry deletion was the only action that could ever
    // offer undo. Everything else destructive (removing a category, removing
    // a budget year, "Reset Targets to Actuals", restoring a backup over your
    // data) committed immediately with no way back, having taught the user
    // through the one case that destructive things here are recoverable.
    // Holding the revert instead puts that knowledge with the caller, which
    // is the only place that knows what it just changed.
    const pushUndo = useCallback((label, revert) => {
      setUndoStack((prev) => [...prev.slice(-9), { label, revert }]);
    }, []);
    // One line in the household's "what changed" log. Newest first, capped at
    // ACTIVITY_LIMIT.
    //
    // Records the author's id, never their name: names are editable in
    // Settings, and a stored copy would go stale the moment someone corrected
    // theirs. Every reader resolves it against the current member list, the
    // same way occurrence overrides already do.
    //
    // The summary is composed at the call site rather than reconstructed from
    // ids at read time, because the thing it describes may not exist any more
    // — "Rent deleted" has to keep reading correctly after the entry is gone,
    // which is exactly when someone wants to know about it.
    const logActivity = useCallback((kind, what) => {
      if (!what) return;
      setActivity((prev) => [{
        id: genId(),
        at: (/* @__PURE__ */ new Date()).toISOString(),
        by: (sessionUser == null ? void 0 : sessionUser.id) || void 0,
        kind,
        what
      }, ...Array.isArray(prev) ? prev : []].slice(0, ACTIVITY_LIMIT));
    }, [setActivity, sessionUser]);
    // A description short enough for a log line, without cutting a word in half
    // when it already fits.
    const householdCtx = useMemo(() => ({ members, sessionUser, accounts, logActivity }), [members, sessionUser, accounts, logActivity]);
    const logDesc = (d) => {
      const t = String(d == null ? "" : d).trim() || "Entry";
      return t.length > 40 ? t.slice(0, 39) + "\u2026" : t;
    };
    // The global shortcut handler mounts once; without this it would close
    // over an empty stack forever.
    const undoStackRef = useRef([]);
    useEffect(() => {
      undoStackRef.current = undoStack;
    }, [undoStack]);
    const undoLast = useCallback(() => {
      setUndoStack((prev) => {
        if (!prev.length) return prev;
        return prev.slice(0, -1);
      });
    }, []);
    // Deleting an entry, expressed in those terms. The copy-provenance
    // bookkeeping is part of the delete (so a deleted copy doesn't come back
    // on the next year roll-forward) and part of the undo, so both live here
    // rather than at the two call sites.
    const pushUndoEntryDelete = useCallback((e) => {
      logActivity("entry", `Deleted ${logDesc(e.desc)} \u2014 ${fmt(signedAmount(e), true)}`);
      if (e.copiedFrom !== void 0) setDeletedCopyIds((prev) => __spreadProps(__spreadValues({}, prev), { [e.copiedFrom]: true }));
      const shortDesc = String(e.desc || "Entry").slice(0, 30) + (String(e.desc || "").length > 30 ? "\u2026" : "");
      pushUndo(`"${shortDesc}" deleted`, () => {
        setEntries((prev) => [...prev, e]);
        if (e.copiedFrom !== void 0) setDeletedCopyIds((prev) => {
          if (!(e.copiedFrom in prev)) return prev;
          const next = __spreadValues({}, prev);
          delete next[e.copiedFrom];
          return next;
        });
      });
    }, [pushUndo, setDeletedCopyIds, setEntries, logActivity]);
    const C = darkMode ? DARK : LIGHT;
    useLayoutEffect(() => {
      const theme = sessionUser ? C : LIGHT;
      Object.entries(theme).forEach(([k, v]) => {
        document.documentElement.style.setProperty(`--${k}`, v);
      });
      // Keep native UI (selects, date pickers, scrollbars, autofill) on the
      // same scheme as the theme — CSS variables can't reach those.
      document.documentElement.style.colorScheme = theme === DARK ? "dark" : "light";
    }, [darkMode, sessionUser, C]);
    // Holiday lookups inside expandEntries are synchronous and reach through a
    // module-level reference rather than a prop — it's called from a dozen
    // places that have no access to this state (settings year-copy, the debt
    // scan, the split-edit probe). Pushing the current list in here, in the
    // same memo that consumes it, is what keeps that reference honest: the
    // flows can never be built against a stale list, which an effect running
    // after render would allow for one paint.
    // Currency and number format reach fmt() the same way holidays reach
    // expandEntries: through a module-level registry, because both are read
    // from synchronous helpers called in dozens of places that have no access
    // to React state. Done in a layout effect so the first paint after a
    // change is already formatted correctly.
    useLayoutEffect(() => {
      setMoneyFormat(locale, currency);
    }, [locale, currency]);
    const yearFlows = useMemo(() => {
      setStoredHolidays(holidays);
      // Same reasoning as setStoredHolidays directly above: pushed in from the
      // memo that consumes it, so the flows can never be built against the
      // previous region's computed dates for one paint.
      setHolidayRegion(holidayRegionCode);
      const flows = {};
      let carry = null;
      const sorted = [...yearConfigs].sort((a, b) => a.year - b.year);
      sorted.forEach((yc, i) => {
        const openBal = i === 0 ? yc.openingBalance : carry != null ? carry : yc.openingBalance;
        const ovs = overridesByYr[yc.year] || {};
        const events = expandEntries(entries, yc.year, ovs);
        const flow = computeFlow(events, openBal);
        flows[yc.year] = flow;
        carry = flow.length > 0 ? flow[flow.length - 1].balance : openBal;
      });
      return flows;
    }, [entries, yearConfigs, overridesByYr, holidays, holidayRegionCode]);
    // ── What-if ──────────────────────────────────────────────────────────
    // A scenario is a set of adjustments over the entries you already have —
    // drop this one, change that one's amount — not a second budget. That is
    // what makes it cheap: the same expandEntries/computeFlow the real year
    // goes through, run a second time over an adjusted entry list, so a
    // scenario can never disagree with the budget about how a schedule works.
    //
    // Deliberately device-local rather than a synced household field. A
    // half-finished "what if I quit my job" appearing on a partner's phone is
    // not a feature, and nothing downstream of it is a record of anything.
    const [scenarioOn, setScenarioOn] = useLS("cf_scenario_on", false);
    const [scenarioAdj, setScenarioAdj] = useLS("cf_scenario_adj", {});
    const scenarioActive = scenarioOn && Object.keys(scenarioAdj || {}).length > 0;
    const scenarioEntries = useMemo(() => {
      if (!scenarioActive) return entries;
      return entries.reduce((out, e) => {
        const adj = scenarioAdj[e.id];
        if (!adj) out.push(e);
        else if (adj.drop) return out;
        else out.push(__spreadProps(__spreadValues({}, e), { amount: Number.isFinite(adj.amount) ? adj.amount : e.amount }));
        return out;
      }, []);
    }, [entries, scenarioAdj, scenarioActive]);
    const scenarioFlows = useMemo(() => {
      if (!scenarioActive) return null;
      const flows = {};
      let carry = null;
      const sorted = [...yearConfigs].sort((a, b) => a.year - b.year);
      sorted.forEach((yc, i) => {
        const openBal = i === 0 ? yc.openingBalance : carry != null ? carry : yc.openingBalance;
        const events = expandEntries(scenarioEntries, yc.year, overridesByYr[yc.year] || {});
        const flow = computeFlow(events, openBal);
        flows[yc.year] = flow;
        carry = flow.length > 0 ? flow[flow.length - 1].balance : openBal;
      });
      return flows;
    }, [scenarioEntries, yearConfigs, overridesByYr, scenarioActive]);
    const sortedConfigs = [...yearConfigs].sort((a, b) => a.year - b.year);
    const yearRoving = useRovingTabs(".year-pill-btn");
    const openBalOf = (flowsByYear, firstOpening) => {
      var _a2, _b, _c, _d;
      const idx = sortedConfigs.findIndex((yc) => yc.year === activeYear);
      if (idx <= 0) return firstOpening !== void 0 ? firstOpening : (_b = (_a2 = yearConfigs.find((yc) => yc.year === activeYear)) == null ? void 0 : _a2.openingBalance) != null ? _b : 0;
      const prevFlow = flowsByYear[sortedConfigs[idx - 1].year];
      if ((prevFlow == null ? void 0 : prevFlow.length) > 0) return prevFlow[prevFlow.length - 1].balance;
      return firstOpening !== void 0 ? firstOpening : (_d = (_c = yearConfigs.find((yc) => yc.year === activeYear)) == null ? void 0 : _c.openingBalance) != null ? _d : 0;
    };
    // ── The account filter ───────────────────────────────────────────────
    // Combined is the default and always available: every view shows the
    // household's whole position unless you narrow it. Narrowing recomputes
    // the running balance from that account's own share of the opening
    // balance, over only its own events — which is why nothing downstream of
    // here needs to know accounts exist. It receives a flow and an opening
    // balance, exactly as it always did; they are just a narrower pair.
    //
    // Device-local: which account you are looking at is a view, not a fact
    // about the household, and syncing it would move a partner's screen.
    const [accountFilter, setAccountFilter] = useLS("cf_account_filter", "");
    // A filter naming an account that has since been deleted would silently
    // show an empty budget, which reads as data loss. Fall back to combined.
    const activeAccount = accountFilter && accounts.some((a) => a.id === accountFilter) ? accountFilter : "";
    const accountYearFlows = useMemo(() => {
      if (!activeAccount) return null;
      const first = sortedConfigs[0];
      const openings = accountOpenings(accounts, first ? first.openingBalance : 0);
      const out = {};
      let carry = openings[activeAccount] || 0;
      sortedConfigs.forEach((yc) => {
        const evs = (yearFlows[yc.year] || []).filter((ev) => accountIdOf(ev) === activeAccount);
        const flow = computeFlow(evs, carry);
        out[yc.year] = flow;
        carry = flow.length ? flow[flow.length - 1].balance : carry;
      });
      return out;
    }, [activeAccount, accounts, sortedConfigs, yearFlows]);
    const viewFlows = accountYearFlows || yearFlows;
    const activeFlow = viewFlows[activeYear] || [];
    const activeOpenBal = useMemo(() => {
      if (!activeAccount) return openBalOf(yearFlows);
      const first = sortedConfigs[0];
      return openBalOf(viewFlows, accountOpenings(accounts, first ? first.openingBalance : 0)[activeAccount] || 0);
      // openBalOf closes over sortedConfigs/activeYear/yearConfigs, all of
      // which are listed below so the memo cannot go stale on any of them.
    }, [activeAccount, accounts, sortedConfigs, activeYear, yearConfigs, yearFlows, viewFlows]);
    const prevYearConfigured = yearConfigs.some((yc) => Number(yc.year) === Number(activeYear) - 1);
    const prevYearFlow = prevYearConfigured ? yearFlows[activeYear - 1] || [] : [];
    // Skipped occurrences never appear in activeFlow (expandEntries drops
    // them before they reach it) — this is the one place that reads
    // overridesByYr directly to surface them so a skip can be found and
    // undone later. `(.+)` matches greedily so a UUID entry id (which itself
    // contains hyphens) doesn't get mis-split by the year/month/day suffix.
    const skippedOccurrences = useMemo(() => {
      const yOvs = overridesByYr[activeYear] || {};
      const re = new RegExp(`^(.+)-${activeYear}-(\\d+)-(\\d+)$`);
      const out = [];
      Object.keys(yOvs).forEach((occId) => {
        const ov = yOvs[occId];
        if (!ov || !ov.skipped) return;
        const m = occId.match(re);
        if (!m) return;
        const entry = entries.find((e) => String(e.id) === m[1]);
        if (!entry) return;
        out.push({ occId, entryId: entry.id, desc: entry.desc, category: entry.category, month: parseInt(m[2], 10), day: parseInt(m[3], 10) });
      });
      return out.sort((a, b) => a.month - b.month || a.day - b.day);
    }, [overridesByYr, activeYear, entries]);
    const addEntry = (data) => {
      const entry = __spreadProps(__spreadValues({}, data), { id: genId(), userId: (sessionUser == null ? void 0 : sessionUser.id) || 1 });
      setEntries((prev) => [...prev, entry]);
      if (entry.type === "expense") {
        setBudgetTargets((prev) => {
          const next = __spreadValues({}, prev);
          (yearConfigs.length ? yearConfigs : [{ year: activeYear }]).forEach((yc) => {
            const occ = expandEntries([entry], yc.year, {});
            occ.filter((ev) => ev.type === "expense").forEach((ev) => {
              const key = `${yc.year}:${ev.month}`;
              const month = __spreadValues({}, next[key] || {});
              month[ev.category] = roundMoney(((month[ev.category] || 0) + ev.amount));
              next[key] = month;
            });
          });
          return next;
        });
      }
      logActivity("entry", `Added ${logDesc(entry.desc)} \u2014 ${fmt(signedAmount(entry), true)}`);
      return entry;
    };
    // Single save path for entry edits: recurring entries with history are
    // split at the current month (past occurrences keep their old values) and
    // occurrence-keyed data from the split onward follows the new segment.
    const saveEntryEdit = (editedId, data) => {
      const res = splitEntryEditFromCurrentMonth(entries, editedId, data);
      setEntries(res.entries);
      // Name what changed, not just that something did — "Rent edited" is the
      // log line people complain about. The amount is the one people notice.
      const before = entries.find((e) => e.id === editedId);
      const renamed = before && before.desc !== data.desc;
      const repriced = before && before.amount !== data.amount;
      logActivity("entry", `Edited ${logDesc(before ? before.desc : data.desc)}` + (renamed ? ` \u2014 renamed to ${logDesc(data.desc)}` : "") + (repriced ? ` \u2014 ${fmt(before.amount)} \u2192 ${fmt(data.amount)}` : ""));
      if (res.newId) {
        setOverridesByYr((prev) => {
          const next = {};
          Object.keys(prev).forEach((y) => {
            next[y] = remapOccurrenceKeys(prev[y], editedId, res.newId, res.splitDate);
          });
          return next;
        });
        setCompleted((prev) => remapOccurrenceKeys(prev, editedId, res.newId, res.splitDate));
        setGoals((prev) => prev.map((g) => g.entryId === editedId ? __spreadProps(__spreadValues({}, g), { entryId: res.newId }) : g));
      }
    };
    const {
      status: houseStatus,
      msg: houseMsg,
      saveData: houseSave,
      loadData: houseLoad,
      unsaved: houseUnsaved,
      divergence: houseDivergence,
      keepLocalChanges,
      discardLocalChanges
    } = useHouseholdData({
      household,
      values: houseValues,
      setters: houseSetters
    });
    useEffect(() => {
      houseLoadRef.current = houseLoad;
    }, [houseLoad]);
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
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showInstall, setShowInstall] = useState(false);
    useEffect(() => {
      const handler = (e) => {
        e.preventDefault();
        setInstallPrompt(e);
        setShowInstall(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      const done = () => {
        setInstallPrompt(null);
        setShowInstall(false);
      };
      window.addEventListener("appinstalled", done);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        window.removeEventListener("appinstalled", done);
      };
    }, []);
    const doInstall = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallPrompt(null);
        setShowInstall(false);
      }
    };
    useEffect(() => {
      var _a2;
      const mq = (_a2 = window.matchMedia) == null ? void 0 : _a2.call(window, "(prefers-color-scheme: dark)");
      if (!mq) return;
      const handler = (e) => {
        const stored = localStorage.getItem("cf_darkMode");
        if (stored === null) setDarkMode(e.matches);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);
    useEffect(() => {
      // Adding an entry is the app's most common act and it should not cost
      // you your place. This used to jump to Flow → Entries and open the form
      // there, so composing from Today or a Plan sheet meant losing the view
      // you were reading and having to navigate back. The form is a modal
      // already — it opens over whatever you are on.
      const h = () => setShowQuickAdd(true);
      window.addEventListener("cf:quickadd", h);
      return () => window.removeEventListener("cf:quickadd", h);
    }, []);
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
        if (document.querySelector(".modal-overlay")) return;
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
    const navLowInfo = useMemo(() => {
      try {
        const now = /* @__PURE__ */ new Date();
        if (now.getFullYear() !== activeYear || !activeFlow.length) return null;
        const tm = now.getMonth(), td = now.getDate();
        const end = new Date(activeYear, tm, td);
        end.setDate(end.getDate() + 60);
        let min = null, minEv = null;
        activeFlow.forEach((ev) => {
          if (ev.month < tm || ev.month === tm && ev.day < td) return;
          const d = new Date(activeYear, ev.month, ev.day);
          if (d > end) return;
          if (min === null || ev.balance < min) {
            min = ev.balance;
            minEv = ev;
          }
        });
        return min !== null && min < alertThresh ? { min, month: minEv.month, day: minEv.day } : null;
      } catch (err) {
        return null;
      }
    }, [activeFlow, activeYear, alertThresh]);
    const navLowAlert = !!navLowInfo;
    const [lowBannerSnooze, setLowBannerSnooze] = useLS("cf_lowbal_snooze", "");
    // The calendar day *here*, not in UTC. toISOString() was returning the UTC
    // date, which west of Greenwich rolls over in the afternoon — from 5pm
    // local (4pm in winter) every key gated on this already pointed at
    // tomorrow. That silently un-snoozed the low-balance banner and reset the
    // once-a-day notification guards, so the same bills could announce
    // themselves twice in one evening. todayStr() is the local-date helper the
    // rest of the date code already uses.
    const todayKey = todayStr();
    const showLowBanner = navLowInfo && lowBannerSnooze !== todayKey;
    // Every transient notice the app can raise, gathered in one list so they
    // share a shape, a scale and a collapse rule. Order here is irrelevant —
    // NoticeStack sorts by severity — but each entry carries a `plain` string
    // because that is what the collapsed summary shows.
    // Findings, as opposed to warnings: the things the app has worked out that
    // you would want told. The Alerts centre lists every one, so it is the
    // place you can go to see everything the app has to say — the screens that
    // compute them still show them in context, from these same helpers.
    const appFindings = useMemo(() => {
      const simDebts = Object.entries(debtData || {})
        .map(([key, v]) => ({
          key,
          bal: parseFloat(v && v.balance) || 0,
          rate: parseFloat(v && v.rate) || 0,
          pmt: parseFloat(v && v.payment) || 0
        }))
        .filter((d) => d.bal > 0 && d.pmt > 0 && !(debtData[d.key] || {}).hidden);
      const extra = Math.round((parseFloat(debtExtraForFindings) || 0) * 100);
      return [
        spendingInsightFinding(computeSpendingInsight(activeFlow, activeYear)),
        debtStrategyFinding(simDebts, extra)
      ].filter(Boolean);
    }, [activeFlow, activeYear, debtData, debtExtraForFindings]);
    const appNotices = useMemo(() => {
      const out = [];
      if (showLowBanner) {
        const under = navLowInfo.min < 0
          ? " \u2014 below zero." : ` \u2014 under your $${centsToDollars(alertThresh)} alert threshold.`;
        out.push({
          id: "lowbal", tone: navLowInfo.min < 0 ? "critical" : "warn", icon: "alert-triangle",
          plain: `Balance dips to ${fmt(navLowInfo.min)} on ${MONTHS[navLowInfo.month]} ${navLowInfo.day}`,
          msg: React.createElement(React.Fragment, null,
            "Heads-up: your balance is forecast to dip to ",
            React.createElement("strong", { className: "cf-text-mono-13" }, fmt(navLowInfo.min)),
            " around ", MONTHS[navLowInfo.month], " ", navLowInfo.day, under),
          actions: [
            { label: "View alerts", onClick: () => setTab("alerts") },
            { label: "Dismiss", ariaLabel: "Dismiss for today", onClick: () => setLowBannerSnooze(todayKey) }
          ]
        });
      }
      if (showBackupNudge) {
        out.push({
          id: "backup", tone: "warn", icon: "save",
          plain: "A backup is 30+ days overdue",
          msg: React.createElement(React.Fragment, null,
            React.createElement("strong", null, "Time for a backup."),
            " It's been 30+ days since your last data export."),
          actions: [
            { label: "Remind me later", onClick: () => dismissBackup(false) },
            { label: "\u2193 Export backup", onClick: () => dismissBackup(true), primary: true }
          ]
        });
      }
      if (entries.some((e) => e.sample)) {
        out.push({
          id: "sample", tone: "info", icon: "info",
          plain: "You're exploring sample data",
          msg: React.createElement(React.Fragment, null,
            "You're exploring ", React.createElement("strong", { className: "c-text" }, "sample data"),
            " \u2014 every entry is fictional and marked \u201C(Sample)\u201D."),
          actions: [{ label: "Remove sample data", onClick: () => setEntries((prev) => prev.filter((e) => !e.sample)) }]
        });
      }
      return out;
    }, [showLowBanner, navLowInfo, alertThresh, todayKey, showBackupNudge, entries]);
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
        try {
          localStorage.setItem(k, todayKey);
        } catch (e) {
          // Storage can throw outright in private/partitioned modes.
          // Nothing here is essential to the current interaction, so a
          // failure is genuinely ignorable — real save failures surface via
          // notifyStorageWriteFailure.
        }
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
    const setOverride = (eventId, patch) => {
      // A single date changed. The Audit page has always shown these; the feed
      // shows them alongside everything else, which is how anyone finds out
      // that "the rent looks wrong" was somebody moving one month's payment.
      const parts = String(eventId).split("-");
      const src = entries.find((e) => String(e.id) === parts[0]);
      const when = parts.length >= 3 ? `${MONTHS[parseInt(parts[parts.length - 2], 10)] || "?"} ${parts[parts.length - 1]}` : "";
      logActivity("override", (patch && patch.skipped ? "Skipped " : "Changed ") + logDesc(src ? src.desc : "an occurrence") + (when ? ` on ${when}` : "") + (patch && patch.amount !== void 0 ? ` \u2014 ${fmt(patch.amount)}` : ""));
      setOverridesByYr((prev) => {
        const yOvs = __spreadValues({}, prev[activeYear] || {});
        const existing = yOvs[eventId] || {};
        const history = [...existing._history || [], { ts: (/* @__PURE__ */ new Date()).toISOString(), by: existing._by, prev: __spreadValues({}, existing) }].slice(-10);
        // Who made this edit, so a shared budget can answer "who moved the
        // rent?". The id is stamped rather than the name: names are editable
        // in Settings, and a stored copy would go stale the moment someone
        // corrected theirs. Every reader resolves it against the member list.
        yOvs[eventId] = __spreadProps(__spreadValues(__spreadValues({}, existing), patch), { _savedAt: (/* @__PURE__ */ new Date()).toISOString(), _by: (sessionUser == null ? void 0 : sessionUser.id) || void 0, _history: history });
        return __spreadProps(__spreadValues({}, prev), { [activeYear]: yOvs });
      });
    };
    const clearOverride = (eventId) => {
      const parts = String(eventId).split("-");
      const src = entries.find((e) => String(e.id) === parts[0]);
      const when = parts.length >= 3 ? `${MONTHS[parseInt(parts[parts.length - 2], 10)] || "?"} ${parts[parts.length - 1]}` : "";
      logActivity("override", `Reverted ${logDesc(src ? src.desc : "an occurrence")}${when ? ` on ${when}` : ""} to its usual value`);
      setOverridesByYr((prev) => {
        const yOvs = __spreadValues({}, prev[activeYear] || {});
        delete yOvs[eventId];
        return __spreadProps(__spreadValues({}, prev), { [activeYear]: yOvs });
      });
    };
    const markOccurrencesPaid = (occIds) => {
      if (!Array.isArray(occIds) || !occIds.length) return;
      setCompleted((prev) => {
        const next = __spreadValues({}, prev);
        occIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
    };
    const toggleComplete = (occId) => {
      setCompleted((prev) => {
        const next = __spreadValues({}, prev);
        if (next[occId]) delete next[occId];
        else next[occId] = true;
        return next;
      });
    };
    const latestYear = yearConfigs.length ? Math.max(...yearConfigs.map((yc) => yc.year)) : activeYear;
    // The "+ Add <year>" pill at the end of the Budget month picker. It used to
    // copy budget targets and stop there, so rolling into next year from the
    // grid in December — the obvious place to do it — silently produced a
    // thinner year than the identically-named button in Settings: no one-time
    // entries, no carried-over occurrence edits, no amount pattern. Same
    // routine for both doors now (src/lib/year-copy.js); only the wording
    // differs, and here it has to fit in a toast.
    const addNextYearInline = () => {
      const y = latestYear + 1;
      if (yearConfigs.find((yc) => yc.year === y)) return;
      const plan = planYearRollforward({ entries, overridesByYr, budgetTargets, fromYear: latestYear, toYear: y, deletedCopyIds });
      applyYearRollforward(plan, y, { setEntries, setOverridesByYr, setBudgetTargets });
      setYearConfigs((prev) => [...prev, { year: y, openingBalance: 0 }].sort((a, b) => a.year - b.year));
      setActiveYear(y);
      setBudgetMonth(0);
      const parts = yearRollforwardParts(plan.counts, latestYear);
      toast(parts.length ? `Year ${y} added — ${parts.join(", ")}.` : `Year ${y} added — recurring entries carry forward automatically.`);
    };
    const tabs = [
      { id: "today", label: "Today" },
      { id: "flow", label: "Flow" },
      { id: "envelopes", label: "Envelopes" },
      { id: "plan", label: "Plan" }
    ];
    if (authLoading) {
      return null;
    }
    if (!session) {
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(LoginView, null));
    }
    if (membershipLoading) {
      return null;
    }
    if (!household) {
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(HouseholdOnboardingView, { email: session.user.email, createHousehold, joinHousehold, signOut }));
    }
    if (locked) {
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(LockScreen, { sessionUser, onUnlock: () => {
        try {
          sessionStorage.setItem(LOCK_KEY, String(Date.now()));
        } catch (e) {
          // Storage can throw outright in private/partitioned modes.
          // Nothing here is essential to the current interaction, so a
          // failure is genuinely ignorable — real save failures surface via
          // notifyStorageWriteFailure.
        }
        setLocked(false);
      }, onSignOut: logout }));
    }
    return /* @__PURE__ */ React.createElement(HouseholdContext.Provider, { value: householdCtx }, React.createElement(CategoriesContext.Provider, { value: { categories, categoryColors, chipSurface: (sessionUser ? C : LIGHT).bgCard } }, React.createElement("div", { className: "app-scroll" }, /* @__PURE__ */ React.createElement(SyncDivergenceModal, { divergence: houseDivergence, onKeepLocal: keepLocalChanges, onUseCloud: discardLocalChanges }), /* @__PURE__ */ React.createElement(AddEntryModal, {
      show: showQuickAdd,
      onClose: () => setShowQuickAdd(false),
      onSave: addEntry,
      categories,
      apiKey: aiApiKey,
      isOffline,
      templates,
      setTemplates
    }), /* @__PURE__ */ React.createElement("a", { href: "#main-content", className: "skip-link", "data-noprint": true }, "Skip to content"), /* @__PURE__ */ React.createElement("div", { className: "tab-bar-outer", "data-noprint": true }, /* @__PURE__ */ React.createElement("div", { className: "header-inner" }, /* @__PURE__ */ React.createElement("div", { className: "logo-area" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "header-logo-img" }), (tab === "flow" || tab === "envelopes" || tab === "plan") && /* @__PURE__ */ React.createElement(MobileYearBadge, { year: activeYear, years: sortedConfigs.map((yc) => yc.year), onSelect: setActiveYear, inHeader: true }), /* @__PURE__ */ React.createElement("div", { className: "year-pills", role: "group", "aria-label": "Budget year", onKeyDown: yearRoving.onKeyDown }, sortedConfigs.map((yc, i) => /* @__PURE__ */ React.createElement("div", { key: yc.year, className: "cf-row" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveYear(yc.year), "aria-pressed": activeYear === yc.year, tabIndex: activeYear === yc.year ? 0 : -1, "aria-label": `Budget year ${yc.year}`, className: "cf-text-mono-13 year-pill-btn", style: {
      background: activeYear === yc.year ? YEAR_COLORS[i % YEAR_COLORS.length] : "rgba(255,255,255,0.1)"
    } }, yc.year))))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 shrink-0" }, isOffline && /* @__PURE__ */ React.createElement("div", { className: "offline-chip", role: "status", title: houseUnsaved ? "You're offline. Changes are saved on this device and will sync when you reconnect." : "You're offline. Changes are saved on this device." }, /* @__PURE__ */ React.createElement("span", { className: "offline-chip-dot", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("span", { className: "offline-chip-text" }, "Offline"), houseUnsaved && /* @__PURE__ */ React.createElement("span", { className: "offline-chip-more" }, "— changes pending")), /* @__PURE__ */ React.createElement("div", { className: "header-search" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 14, className: "header-search-icon" }), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "global-search",
        // Names its scope rather than leaving the magnifier to imply one. What
        // it searches depends on where you are: Plan and Entries filter in
        // place, everything else lands on the Budget month that matches.
        "aria-label": searchScopeLabel,
        placeholder: searchScopeLabel,
        title: searchScopeLabel,
        autoComplete: "off",
        value: globalSearch,
        onChange: (e) => setGlobalSearch(e.target.value),
        className: "header-search-input"
      }
    ), globalSearch && /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Clear search",
        onClick: () => setGlobalSearch(""),
        className: "header-search-clear"
      },
      "\u2715"
    )), (() => {
      const today2 = /* @__PURE__ */ new Date();
      const n90 = new Date(today2);
      n90.setDate(today2.getDate() + 90);
      const upcoming = activeFlow.filter((ev) => ev.date >= today2 && ev.date <= n90 && ev.balance < alertThresh);
      const critical = upcoming.filter((ev) => ev.balance < 0);
      const warning = upcoming.filter((ev) => ev.balance >= 0);
      const hasCritical = critical.length > 0;
      const hasWarning = warning.length > 0;
      if (!hasCritical && !hasWarning) return null;
      const count = hasCritical ? upcoming.length : warning.length;
      const color = hasCritical ? "var(--red)" : "var(--amberInk)";
      const label = hasCritical ? hasWarning ? `${critical.length} critical, ${warning.length} warning alert${upcoming.length > 1 ? "s" : ""}` : `${critical.length} critical alert${critical.length > 1 ? "s" : ""}` : `${warning.length} warning alert${warning.length > 1 ? "s" : ""}`;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": label,
          onClick: () => setTab((prev) => prev === "alerts" ? "today" : "alerts"),
          title: label,
          className: "alert-bell-btn",
          style: {
            background: tab === "alerts" ? "rgba(255,255,255,0.15)" : "transparent",
            borderColor: color,
            color
          }
        },
        /* @__PURE__ */ React.createElement(Icon, { name: "bell", size: 17 }),
        /* @__PURE__ */ React.createElement("span", { className: "alert-bell-badge", style: { background: color } }, count > 9 ? "9+" : count)
      );
    })(), (() => {
      const initials = ((sessionUser == null ? void 0 : sessionUser.fullName) || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      return /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setMenuOpen((v) => !v),
          "aria-label": "User menu",
          "aria-expanded": menuOpen,
          title: `Signed in as ${(sessionUser == null ? void 0 : sessionUser.fullName) || ""}`,
          className: "user-avatar-btn",
          style: { background: menuOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" }
        },
        initials
      ), menuOpen && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: () => setMenuOpen(false),
          className: "user-menu-backdrop"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "user-menu-panel" }, /* @__PURE__ */ React.createElement("div", { className: "user-menu-header" }, /* @__PURE__ */ React.createElement("div", { className: "user-menu-name" }, (sessionUser == null ? void 0 : sessionUser.fullName) || ""), /* @__PURE__ */ React.createElement("div", { className: "user-menu-email" }, (sessionUser == null ? void 0 : sessionUser.email) || "")), [
        { label: "Settings", icon: "settings", action: () => {
          setMenuOpen(false);
          setTab("you");
        } },
        { label: "Edit Profile", icon: "user", action: () => {
          setPf({ fullName: (sessionUser == null ? void 0 : sessionUser.fullName) || "", email: (sessionUser == null ? void 0 : sessionUser.email) || "" });
          setPfErr("");
          setPfOk("");
          setProfileForm("profile");
        } },
        { label: "Change Password", icon: "key", action: () => {
          setPwf({ current: "", next: "", confirm: "" });
          setPfErr("");
          setPfOk("");
          setProfileForm("password");
        } },
        ...isCoarsePointer && bioAvailable && !(sessionUser && getBiometricCredId(sessionUser.id)) ? [{ label: "Set Up Fingerprint / Face Unlock", icon: "lock", action: () => {
          setMenuOpen(false);
          setTab("you");
          setTimeout(() => {
            const el = document.getElementById("sec-security");
            if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
          }, 150);
        } }] : [],
        { label: "Help", icon: "help", action: () => {
          setMenuOpen(false);
          setTab("help");
        } },
        ...showInstall ? [{ label: "Install App", icon: "download", action: () => {
          setMenuOpen(false);
          doInstall();
        } }] : []
      ].map((item) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: item.label,
          onClick: item.action,
          className: "cf-menu-item cf-menu-item--bordered"
        },
        /* @__PURE__ */ React.createElement(Icon, { name: item.icon, size: 16 }),
        item.label
      )), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setMenuOpen(false);
            logout();
          },
          "aria-label": "Sign out",
          className: "cf-menu-item cf-menu-item--danger"
        },
        /* @__PURE__ */ React.createElement(Icon, { name: "log-out", size: 16 }),
        "Sign out"
      ))), profileForm === "profile" && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Edit profile" }, /* @__PURE__ */ React.createElement("div", { className: "modal-card profile-modal-card" }, /* @__PURE__ */ React.createElement("div", { className: "cf-modal-title" }, "Edit Profile"), [{ label: "Full Name", key: "fullName", type: "text" }].map(({ label, key, type }) => /* @__PURE__ */ React.createElement("div", { key, className: "mb-14" }, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "pf-" + key }, label), /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "pf-" + key,
          type,
          className: "field-input",
          value: pf[key],
          onChange: (e) => setPf((p) => __spreadProps(__spreadValues({}, p), { [key]: e.target.value }))
        }
      ))),/* @__PURE__ */ React.createElement("div", { className: "form-note-text" }, "Email: ", sessionUser == null ? void 0 : sessionUser.email, " (sign-in email can't be changed here)"), pfErr && React.createElement("div", { role: "alert", className: "form-err-text" }, pfErr), pfOk && React.createElement("div", { role: "status", className: "form-ok-text" }, pfOk), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 justify-end mt-6" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setProfileForm(null),
          className: "cf-btn cf-btn--secondary"
        },
        "Cancel"
      ), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
        const nm = pf.fullName.trim();
        if (!nm) {
          setPfErr("Name is required.");
          return;
        }
        try {
          await updateMyName(nm);
          setPfOk("Profile updated.");
          setTimeout(() => setProfileForm(null), 900);
        } catch (err) {
          setPfErr(err.message || "Couldn't update your profile.");
        }
      }, className: "cf-btn cf-btn--primary fw-700" }, "Save")))), profileForm === "password" && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Change password" }, /* @__PURE__ */ React.createElement("div", { className: "modal-card profile-modal-card" }, /* @__PURE__ */ React.createElement("div", { className: "cf-modal-title" }, "Change Password"), [
        { label: "Current password", key: "current", val: pwf.current },
        { label: "New password (min 8 chars)", key: "next", val: pwf.next },
        { label: "Confirm new password", key: "confirm", val: pwf.confirm }
      ].map(({ label, key, val }) => /* @__PURE__ */ React.createElement("div", { key, className: "mb-14" }, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "pwf-" + key }, label), /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "pwf-" + key,
          type: "password",
          autoComplete: key === "current" ? "current-password" : "new-password",
          className: "field-input",
          value: val,
          onChange: (e) => setPwf((p) => __spreadProps(__spreadValues({}, p), { [key]: e.target.value }))
        }
      ))),pfErr && React.createElement("div", { role: "alert", className: "form-err-text" }, pfErr), pfOk && React.createElement("div", { role: "status", className: "form-ok-text" }, pfOk), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 justify-end mt-6" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setProfileForm(null),
          className: "cf-btn cf-btn--secondary"
        },
        "Cancel"
      ), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
        if (!pwf.current || !pwf.next || !pwf.confirm) {
          setPfErr("All fields required.");
          return;
        }
        if (pwf.next.length < 8) {
          setPfErr("New password must be at least 8 characters.");
          return;
        }
        if (pwf.next !== pwf.confirm) {
          setPfErr("New passwords don't match.");
          return;
        }
        setPfErr("");
        try {
          await sbChangePassword(sessionUser.email, pwf.current, pwf.next);
          setPfOk("Password changed successfully.");
          setTimeout(() => setProfileForm(null), 900);
        } catch (err) {
          setPfErr(err.message || "Couldn't change your password.");
        }
      }, className: "cf-btn cf-btn--primary fw-700" }, "Change Password")))));
    })())), /* @__PURE__ */ React.createElement("nav", { className: "cf-page tab-bar", "aria-label": "Primary", "data-noprint": true }, tabs.map((t) => /* @__PURE__ */ React.createElement("button", { key: t.id, onClick: () => setTab(t.id), "aria-current": tab === t.id ? "page" : void 0, className: "tab-bar-btn", style: {
      borderBottom: tab === t.id ? "3px solid var(--amber)" : "3px solid transparent",
      color: tab === t.id ? "#fff" : "rgba(255,255,255,0.55)"
    } }, t.label, t.id === "today" && activeFlow.filter((ev) => {
      const today = /* @__PURE__ */ new Date();
      const n = new Date(today);
      n.setDate(today.getDate() + 30);
      return ev.date >= today && ev.date <= n && ev.balance < alertThresh;
    }).length > 0 && /* @__PURE__ */ React.createElement("span", { className: "tab-alert-dot", style: { background: C.red } }, "!"), t.id === "flow" && globalSearch && /* @__PURE__ */ React.createElement("span", { "aria-label": "Search active", className: "tab-search-dot", style: { color: C.amber } }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 11 })))))), (pullProgress > 0 || pullActive) && /* @__PURE__ */ React.createElement("div", { className: "ptr-indicator", style: {
      opacity: Math.max(pullProgress, pullActive ? 1 : 0)
    } }, /* @__PURE__ */ React.createElement("span", { className: "ptr-spinner", style: {
      animation: pullActive ? "spin 0.8s linear infinite" : "none"
    } }, "\u21BB"), pullActive ? "Syncing\u2026" : "Pull down to sync"), /* @__PURE__ */ React.createElement(BottomNav, { tab, setTab, lowAlert: navLowAlert, onCompose: () => window.dispatchEvent(new CustomEvent("cf:quickadd")) }), /* @__PURE__ */ React.createElement(FeedbackToast, null), /* @__PURE__ */ React.createElement("main", { id: "main-content", tabIndex: -1, className: "cf-page content-area" }, /* @__PURE__ */ React.createElement("h1", { className: "cf-visually-hidden" }, viewName(tab, flowSub, planSub)), /* @__PURE__ */ React.createElement(NoticeStack, { notices: appNotices }), /* @__PURE__ */ React.createElement(ErrorBoundary, null, tab === "today" &&/* @__PURE__ */ React.createElement(
      DashboardView,
      {
        flow: activeFlow,
        openBal: activeOpenBal,
        yearFlows,
        yearConfigs: sortedConfigs,
        alertThreshold: alertThresh,
        activeYear,
        budgetTargets,
        categories,
        categoryColors,
        users: members,
        sessionUser,
        entries,
        setYearConfigs,
        addEntry,
        setTab,
        setEntries,
        completed,
        toggleComplete,
        dashHidden,
        setDashHidden,
        dashOrder,
        setDashOrder,
        debtData,
        apiKey: aiApiKey,
        isOffline
      }
    ), (tab === "flow" || tab === "envelopes") && /* @__PURE__ */ React.createElement(React.Fragment, null, tab === "flow" && /* @__PURE__ */ React.createElement(BudgetSubTabs, { value: flowSub, onChange: setFlowSub }), /* @__PURE__ */ React.createElement(AccountFilter, { accounts, value: activeAccount, onChange: setAccountFilter }), (tab === "envelopes" || flowSub === "list" || flowSub === "calendar") && /* @__PURE__ */ React.createElement(
      BudgetView,
      {
        flow: activeFlow,
        prevYearFlow,
        prevYearConfigured,
        openBal: activeOpenBal,
        entries,
        setOverride,
        clearOverride,
        categories,
        categoryColors,
        setEntries,
        saveEntryEdit,
        addEntry,
        pushUndo,
        apiKey: aiApiKey,
        isOffline,
        flowSub,
        setFlowSub,
        showEnvelopes: tab === "envelopes",
        monthIdx: budgetMonth,
        setMonthIdx: setBudgetMonth,
        alertThreshold: alertThresh,
        globalSearch,
        templates,
        setTemplates,
        budgetTargets,
        setBudgetTargets,
        completed,
        toggleComplete,
        markOccurrencesPaid,
        activeYear,
        budgetColOrder,
        setBudgetColOrder,
        onDeleted: (e) => pushUndoEntryDelete(e),
        onAddNextYear: activeYear === latestYear ? addNextYearInline : null,
        skippedOccurrences
      }
    ), tab === "flow" && flowSub === "curve" && /* @__PURE__ */ React.createElement(ForecastView, { apiKey: aiApiKey, isOffline, yearFlows, yearConfigs: sortedConfigs, openBalByYear: activeOpenBal, alertThreshold: alertThresh, globalSearch, budgetTargets, horizon: forecastHorizon, setHorizon: setForecastHorizon, categories, categoryColors, addEntry, templates, setTemplates, completed, toggleComplete, entries, scenarioOn, setScenarioOn, scenarioAdj, setScenarioAdj, scenarioFlows }), tab === "flow" && flowSub === "entries" && /* @__PURE__ */ React.createElement(
      EntriesView,
      {
        entries,
        setEntries,
        saveEntryEdit,
        addEntry,
        categories,
        categoryColors,
        activeYear,
        apiKey: aiApiKey,
        isOffline,
        onDeleted: (e) => pushUndoEntryDelete(e),
        templates,
        setTemplates,
        globalSearch,
        setGlobalSearch,
        pushUndo,
        // Declared as a prop here since the view was written, but never
        // actually passed — which is why CSV import could only compare a
        // statement row against one-time entries.
        allYearFlows: yearFlows,
        colOrder,
        setColOrder,
        filter: entriesFilter,
        setFilter: setEntriesFilter,
        filterCats: entriesFilterCats,
        setFilterCats: setEntriesFilterCats,
        filterScheds: entriesFilterScheds,
        setFilterScheds: setEntriesFilterScheds,
        filterStatus: entriesFilterStatus,
        setFilterStatus: setEntriesFilterStatus
      }
    )), tab === "alerts" && /* @__PURE__ */ React.createElement(AlertsPanel, { flow: activeFlow, alertThreshold: alertThresh, setTab, findings: appFindings, gotoForecast: () => {
      setTab("flow");
      setFlowSub("curve");
    } }), tab === "plan" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(PlanSubTabs, { value: planSub, onChange: setPlanSub }), /* @__PURE__ */ React.createElement(
      PlanView,
      {
        flow: activeFlow,
        openBal: activeOpenBal,
        entries,
        setEntries,
        goals,
        setGoals,
        categories,
        alertThreshold: alertThresh,
        activeYear,
        debtData,
        setDebtData,
        globalSearch,
        yearConfigs: sortedConfigs,
        setActiveYear,
        setDeletedCopyIds,
        planSub,
        setPlanSub
      }
    )), tab === "plan" && planSub === "insights" && /* @__PURE__ */ React.createElement(AIInsightsView, { flow: activeFlow, openBal: activeOpenBal, yearConfigs: sortedConfigs, budgetTargets, activeYear, categories, apiKey: aiApiKey, goals, debtData, isOffline, setTab }), tab === "help" && /* @__PURE__ */ React.createElement(HelpView, null), tab === "you" && /* @__PURE__ */ React.createElement(
      SettingsView,
      {
        categories,
        activity,
        accounts,
        setAccounts,
        holidays,
        setHolidays,
        isOffline,
        houseValues,
        houseSetters,
        pushUndo,
        currency,
        setCurrency,
        locale,
        setLocale,
        holidayRegionCode,
        setHolidayRegionCode,
        setCategories,
        categoryColors,
        setCategoryColors,
        alertThreshold: alertThresh,
        setAlertThreshold: setAlertThresh,
        darkMode,
        setDarkMode,
        notifyEnabled,
        setNotifyEnabled,
        enableNotifications,
        disableNotifications,
        notifPerm,
        notifyHour,
        setNotifyHour,
        pushState,
        yearConfigs,
        setYearConfigs,
        activeYear,
        setActiveYear,
        overridesByYr,
        setOverridesByYr,
        entries,
        setEntries,
        completed,
        setCompleted,
        goals,
        setGoals,
        debtData,
        setDebtData,
        deletedCopyIds,
        setDeletedCopyIds,
        installPrompt,
        triggerInstall: doInstall,
        lockTimeout,
        setLockTimeout,
        templates,
        setTemplates,
        activeFlow,
        budgetTargets,
        setBudgetTargets,
        sessionUser,
        logout,
        aiApiKey,
        setAiApiKey,
        sbConfigured,
        houseStatus,
        houseMsg,
        houseUnsaved,
        houseSave,
        houseLoad,
        household,
        members,
        createInvite,
        setMemberDisabled,
        updateMemberName
      }
    ))), undoStack.length > 0 && /* @__PURE__ */ React.createElement(
      UndoToast,
      {
        label: undoStack[undoStack.length - 1].label,
        count: undoStack.length,
        onUndo: () => {
          haptic();
          const top = undoStack[undoStack.length - 1];
          try {
            top.revert();
          } catch (err) {
            // A revert that throws must still leave the stack consistent —
            // leaving the entry on it would offer the same broken undo again.
            toast("Couldn't undo that.", "error");
          }
          undoLast();
        },
        onDismiss: () => setUndoStack([])
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "app-footer", "data-noprint": true }, /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "privacy.html",
        className: "cf-footer-link"
      },
      "Privacy"
    ), /* @__PURE__ */ React.createElement("span", { className: "footer-sep", "aria-hidden": "true" }, "|"), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "terms.html",
        className: "cf-footer-link"
      },
      "Terms of Use"
    )))));
  }
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, null));
