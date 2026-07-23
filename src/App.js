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
        }
      }
    }, [authLoading, session]);
    const [entries, setEntries] = useLS("cf_entries", []);
    const [overridesByYr, setOverridesByYr] = useLS("cf_overrides", {});
    const [yearConfigs, setYearConfigs] = useLS("cf_years", [{ year: (/* @__PURE__ */ new Date()).getFullYear(), openingBalance: 0 }]);
    // Default must track the cf_years default — a hardcoded year left fresh
    // installs pointed at an empty year once the calendar rolled over.
    const [activeYear, setActiveYear] = useLS("cf_activeYear", () => (/* @__PURE__ */ new Date()).getFullYear());
    const [debtData, setDebtData] = useLS("cf_debt_data", {});
    // Tombstones for the year-copy sync: source-entry id -> true, recorded
    // whenever the user deletes a one-time entry that was itself a copy
    // (entry.copiedFrom set). Without this, re-running "Copy year -> year+1"
    // has no way to tell "never copied" apart from "copied, then the user
    // deliberately deleted it" — both just look like the target entry is
    // missing — and would resurrect the deleted copy on the next sync.
    const [deletedCopyIds, setDeletedCopyIds] = useLS("cf_deleted_copy_ids", {});
    const [goals, setGoals] = useLS("cf_goals", []);
    const [dashHidden, setDashHidden] = useLS("cf_dash_hidden", {});
    const [dashOrder, setDashOrder] = useLS("cf_dash_order", []);
    const [darkMode, setDarkMode] = useLS("cf_darkMode", () => {
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch (e) {
        return false;
      }
    });
    const [aiApiKey, setAiApiKey] = useLS("cf_ai_key", "");
    const [alertThresh, setAlertThresh] = useLS("cf_alertThresh", DEFAULT_ALERT_THRESHOLD);
    const [categories, setCategories] = useLS("cf_categories", DEFAULT_CATEGORIES);
    const [categoryColors, setCategoryColors] = useLS("cf_category_colors", DEFAULT_CATEGORY_COLORS);
    const [templates, setTemplates] = useLS("cf_templates", []);
    const [budgetTargets, setBudgetTargets] = useLS("cf_budgtargets", {});
    const [completed, setCompleted] = useLS("cf_completed", {});
    const [tab, setTab] = useState(() => {
      const fromHash = parseTabHash().tab;
      if (fromHash) return fromHash;
      try {
        return sessionStorage.getItem("cf_tab") || "dashboard";
      } catch (e) {
        return "dashboard";
      }
    });
    useEffect(() => {
      try {
        sessionStorage.setItem("cf_tab", tab);
      } catch (e) {
      }
    }, [tab]);
    const [budgetSub, setBudgetSub] = useLS("cf_budget_subtab", "monthly");
    const [planSub, setPlanSub] = useLS("cf_plan_subtab", "debt");
    const hashSyncGuard = useRef(false);
    const hashInitialized = useRef(false);
    useEffect(() => {
      const fromHash = parseTabHash();
      if (fromHash.budgetSub) setBudgetSub(fromHash.budgetSub);
      if (fromHash.planSub) setPlanSub(fromHash.planSub);
    }, []);
    useEffect(() => {
      if (hashSyncGuard.current) {
        hashSyncGuard.current = false;
        return;
      }
      let newHash;
      try {
        newHash = "#/" + tab + (tab === "budget" && budgetSub ? "/" + budgetSub : "") + (tab === "plan" && planSub ? "/" + planSub : "");
        if (location.hash !== newHash) {
          // First sync on a hashless load replaces the entry instead of
          // pushing — otherwise the first Back press appears to do nothing.
          if (!hashInitialized.current && !location.hash) history.replaceState(null, "", newHash);
          else history.pushState(null, "", newHash);
        }
        hashInitialized.current = true;
      } catch (e) {
      }
    }, [tab, budgetSub, planSub]);
    useEffect(() => {
      const onPopState = () => {
        const parsed = parseTabHash();
        hashSyncGuard.current = true;
        if (parsed.tab) setTab(parsed.tab);
        if (parsed.tab === "budget" && parsed.budgetSub) setBudgetSub(parsed.budgetSub);
        if (parsed.tab === "plan" && parsed.planSub) setPlanSub(parsed.planSub);
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }, []);
    useEffect(() => {
      if (budgetSub === "grid") setBudgetSub("monthly");
      if (tab === "register") {
        setTab("budget");
        setBudgetSub("entries");
      } else if (tab === "forecast") {
        setTab("budget");
        setBudgetSub("forecast");
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
      }
    }, [tab, budgetSub, planSub]);
    useEffect(() => {
      const trap = (e) => {
        if (e.key !== "Tab") return;
        try {
          // .fab-panel surfaces (mobile quick-add) share the modal contract.
          const overlays = document.querySelectorAll(".modal-overlay,.fab-panel");
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
        }
      };
      document.addEventListener("keydown", trap, true);
      return () => document.removeEventListener("keydown", trap, true);
    }, []);
    const [showBackupNudge, setShowBackupNudge] = useState(false);
    useEffect(() => {
      try {
        const last = localStorage.getItem("cf_last_backup");
        const daysSince = last ? Math.floor((Date.now() - parseInt(last)) / 864e5) : 999;
        if (daysSince >= 30) setTimeout(() => setShowBackupNudge(true), 5e3);
      } catch (e) {
      }
    }, []);
    const dismissBackup = (doExport = false) => {
      setShowBackupNudge(false);
      try {
        localStorage.setItem("cf_last_backup", String(Date.now()));
      } catch (e) {
      }
      if (doExport) {
        const blob = new Blob([JSON.stringify({ entries, budgetTargets, yearConfigs, categories, templates, activeYear }, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `CashFlow_Backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    };
    const searchRef = useRef(null);
    const [budgetView, setBudgetView] = useLS("cf_budgetView", "monthly");
    const [budgetMonth, setBudgetMonth] = useLS("cf_budgetMonth", (/* @__PURE__ */ new Date()).getMonth());
    const [forecastHorizon, setForecastHorizon] = useLS("cf_forecastHorizon", 90);
    const [colOrder, setColOrder] = useLS("cf_col_order", DEFAULT_REG_COLS);
    const [budgetColOrder, setBudgetColOrder] = useLS("cf_budget_col_order", DEFAULT_BUDGET_COLS);
    const [regFilter, setRegFilter] = useLS("cf_reg_filter", "all");
    const [regFilterCats, setRegFilterCats] = useLS("cf_reg_filter_cats", []);
    const [regFilterScheds, setRegFilterScheds] = useLS("cf_reg_filter_scheds", []);
    const [regFilterStatus, setRegFilterStatus] = useLS("cf_reg_filter_status", []);
    const [globalSearch, setGlobalSearch] = useState("");
    const prevSearchRef = useRef("");
    useEffect(() => {
      const had = !!prevSearchRef.current;
      prevSearchRef.current = globalSearch;
      if (!globalSearch || had) return;
      // Plan filters its own goals/debts in place — don't yank the user off
      // it the moment they start typing.
      if (tab === "plan") return;
      // Starting a search shows results in the Budget monthly view (which
      // jumps to the most recent matching month), not the Entries register.
      setTab("budget");
      setBudgetSub("monthly");
    }, [globalSearch, tab]);
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
    const pushUndo = (e) => {
      setUndoStack((prev) => [...prev.slice(-9), e]);
      if (e.copiedFrom !== void 0) setDeletedCopyIds((prev) => __spreadProps(__spreadValues({}, prev), { [e.copiedFrom]: true }));
    };
    const [showHelp, setShowHelp] = useState(false);
    const C = darkMode ? DARK : LIGHT;
    useLayoutEffect(() => {
      const theme = sessionUser ? C : LIGHT;
      Object.entries(theme).forEach(([k, v]) => {
        document.documentElement.style.setProperty(`--${k}`, v);
      });
      // Keep native UI (selects, date pickers, scrollbars, autofill) on the
      // same scheme as the theme — CSS variables can't reach those.
      document.documentElement.style.colorScheme = theme === DARK ? "dark" : "light";
    }, [darkMode, sessionUser]);
    const yearFlows = useMemo(() => {
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
    }, [entries, yearConfigs, overridesByYr]);
    const sortedConfigs = [...yearConfigs].sort((a, b) => a.year - b.year);
    const isFirstYear = ((_a = sortedConfigs[0]) == null ? void 0 : _a.year) === activeYear;
    const activeOpenBal = useMemo(() => {
      var _a2, _b, _c, _d;
      const idx = sortedConfigs.findIndex((yc) => yc.year === activeYear);
      if (idx <= 0) return (_b = (_a2 = yearConfigs.find((yc) => yc.year === activeYear)) == null ? void 0 : _a2.openingBalance) != null ? _b : 0;
      const prevFlow = yearFlows[sortedConfigs[idx - 1].year];
      return (prevFlow == null ? void 0 : prevFlow.length) > 0 ? prevFlow[prevFlow.length - 1].balance : (_d = (_c = yearConfigs.find((yc) => yc.year === activeYear)) == null ? void 0 : _c.openingBalance) != null ? _d : 0;
    }, [sortedConfigs, activeYear, yearFlows, yearConfigs]);
    const activeFlow = yearFlows[activeYear] || [];
    const prevYearConfigured = yearConfigs.some((yc) => Number(yc.year) === Number(activeYear) - 1);
    const prevYearFlow = prevYearConfigured ? yearFlows[activeYear - 1] || [] : [];
    const addEntry = (data) => {
      const entry = __spreadProps(__spreadValues({}, data), { id: Date.now(), userId: (sessionUser == null ? void 0 : sessionUser.id) || 1 });
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
      return entry;
    };
    // Single save path for entry edits: recurring entries with history are
    // split at the current month (past occurrences keep their old values) and
    // occurrence-keyed data from the split onward follows the new segment.
    const saveEntryEdit = (editedId, data) => {
      const res = splitEntryEditFromCurrentMonth(entries, editedId, data);
      setEntries(res.entries);
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
    const currentBalance = useMemo(() => getCurrentBalance(activeFlow, activeOpenBal, activeYear), [activeFlow, activeOpenBal, activeYear]);
    // Rebuilt fresh every render (cheap — plain values, no computation), so
    // buildPayload/applyPayload can never close over a stale field.
    const houseValues = {
      entries,
      overridesByYr,
      yearConfigs,
      categories,
      categoryColors,
      activeYear,
      alertThreshold: alertThresh,
      darkMode,
      forecastHorizon,
      colOrder,
      regFilter,
      regFilterCats,
      regFilterScheds,
      regFilterStatus,
      aiApiKey,
      budgetTargets,
      templates,
      completed,
      goals,
      dashHidden,
      dashOrder,
      debtData,
      deletedCopyIds
    };
    // Every setter here is permanently stable (useLS's setter never changes
    // identity), so this only needs to be built once — memoizing it keeps
    // applyPayload/loadData stable too, matching the pre-consolidation
    // behavior where the household-load effect only re-ran when `household`
    // itself changed, not on every render. Keys match houseValues' bare field
    // names (not the setXxx names) — useHouseholdData indexes both objects
    // by the same HOUSEHOLD_SYNCED_FIELDS key.
    const houseSetters = useMemo(() => ({
      entries: setEntries,
      overridesByYr: setOverridesByYr,
      yearConfigs: setYearConfigs,
      categories: setCategories,
      categoryColors: setCategoryColors,
      activeYear: setActiveYear,
      alertThreshold: setAlertThresh,
      darkMode: setDarkMode,
      forecastHorizon: setForecastHorizon,
      colOrder: setColOrder,
      regFilter: setRegFilter,
      regFilterCats: setRegFilterCats,
      regFilterScheds: setRegFilterScheds,
      regFilterStatus: setRegFilterStatus,
      aiApiKey: setAiApiKey,
      budgetTargets: setBudgetTargets,
      templates: setTemplates,
      completed: setCompleted,
      goals: setGoals,
      dashHidden: setDashHidden,
      dashOrder: setDashOrder,
      debtData: setDebtData,
      deletedCopyIds: setDeletedCopyIds
    }), []);
    const {
      status: houseStatus,
      msg: houseMsg,
      saveData: houseSave,
      loadData: houseLoad
    } = useHouseholdData({
      household,
      values: houseValues,
      setters: houseSetters
    });
    useEffect(() => {
      houseLoadRef.current = houseLoad;
    }, [houseLoad]);
    useEffect(() => {
      const onStart = (e) => {
        const sc = document.querySelector(".app-scroll");
        if (window.scrollY > 10 || sc && sc.scrollTop > 10) return;
        if (document.querySelector(".modal-overlay")) return;
        ptrRef.current = { startY: e.touches[0].clientY, active: true };
      };
      const onMove = (e) => {
        if (!ptrRef.current.active) return;
        const dy = e.touches[0].clientY - ptrRef.current.startY;
        if (dy > 0) setPullProgress(Math.min(1, dy / 80));
      };
      const onEnd = () => {
        if (!ptrRef.current.active) return;
        ptrRef.current.active = false;
        if (pullProgress >= 1) {
          setPullActive(true);
          setTimeout(() => setPullActive(false), 2500);
          try {
            if (houseLoadRef.current) houseLoadRef.current();
          } catch (e) {
          }
        }
        setPullProgress(0);
      };
      window.addEventListener("touchstart", onStart, { passive: true });
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
      return () => {
        window.removeEventListener("touchstart", onStart);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
    }, [pullProgress]);
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
      const h = () => {
        // Jump to Entries and open its own "Add Entry" form.
        setTab("budget");
        setBudgetSub("entries");
        setTimeout(() => window.dispatchEvent(new CustomEvent("cf:reg-open-new")), 50);
      };
      window.addEventListener("cf:quickadd", h);
      return () => window.removeEventListener("cf:quickadd", h);
    }, []);
    // Single global shortcut handler — digits, letters, arrows, and search
    // share one guard set: never while typing, never under an open modal or
    // panel (the letter shortcuts used to fire behind confirm dialogs).
    useEffect(() => {
      const TAB_KEYS = { "1": "dashboard", "2": "budget", "3": "plan", "4": "ai", "5": "settings" };
      const handler = (e) => {
        var _a2, _b;
        const tag = (((_a2 = e.target) == null ? void 0 : _a2.tagName) || "").toLowerCase();
        const isInput = tag === "input" || tag === "textarea" || tag === "select" || ((_b = e.target) == null ? void 0 : _b.isContentEditable);
        if (isInput) return;
        if (e.key === "Escape") {
          setGlobalSearch("");
          setShowHelp(false);
          return;
        }
        if (document.querySelector(".modal-overlay,.fab-panel")) return;
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
            setTab("dashboard");
            break;
          case "f":
          case "F":
            setTab("budget");
            setBudgetSub("forecast");
            break;
          case "b":
          case "B":
            setTab("budget");
            break;
          case "r":
          case "R":
            setTab("budget");
            setBudgetSub("entries");
            break;
          case "p":
          case "P":
            setTab("plan");
            break;
          case "a":
          case "A":
            setTab("ai");
            break;
          case "s":
          case "S":
            setTab("settings");
            break;
          case "n":
          case "N":
            window.dispatchEvent(new CustomEvent("cf:quickadd"));
            break;
          case "?":
            setShowHelp((v) => !v);
            break;
          case "ArrowLeft":
            if (tab === "budget") setBudgetMonth((v) => Math.max(0, v - 1));
            break;
          case "ArrowRight":
            if (tab === "budget") setBudgetMonth((v) => Math.min(11, v + 1));
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
    const todayKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const showLowBanner = navLowInfo && lowBannerSnooze !== todayKey;
    const setOverride = (eventId, patch) => {
      setOverridesByYr((prev) => {
        const yOvs = __spreadValues({}, prev[activeYear] || {});
        const existing = yOvs[eventId] || {};
        const history = [...existing._history || [], { ts: (/* @__PURE__ */ new Date()).toISOString(), prev: __spreadValues({}, existing) }].slice(-10);
        yOvs[eventId] = __spreadProps(__spreadValues(__spreadValues({}, existing), patch), { _savedAt: (/* @__PURE__ */ new Date()).toISOString(), _history: history });
        return __spreadProps(__spreadValues({}, prev), { [activeYear]: yOvs });
      });
    };
    const clearOverride = (eventId) => {
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
    const updateOpenBal = (val) => setYearConfigs((prev) => prev.map((yc) => yc.year === activeYear ? __spreadProps(__spreadValues({}, yc), { openingBalance: val }) : yc));
    const latestYear = yearConfigs.length ? Math.max(...yearConfigs.map((yc) => yc.year)) : activeYear;
    const addNextYearInline = () => {
      const y = latestYear + 1;
      if (yearConfigs.find((yc) => yc.year === y)) return;
      setBudgetTargets((prev) => {
        const next = __spreadValues({}, prev);
        for (let m = 0; m < 12; m++) {
          const prevKey = `${latestYear}:${m}`;
          const newKey = `${y}:${m}`;
          if (prev[prevKey] && !prev[newKey]) next[newKey] = __spreadValues({}, prev[prevKey]);
        }
        return next;
      });
      setYearConfigs((prev) => [...prev, { year: y, openingBalance: 0 }].sort((a, b) => a.year - b.year));
      setActiveYear(y);
      setBudgetMonth(0);
      toast(`Year ${y} added — recurring entries carry forward automatically.`);
    };
    const tabs = [
      { id: "dashboard", label: "Dashboard" },
      { id: "budget", label: "Budget" },
      { id: "plan", label: "Plan" },
      { id: "ai", label: "\u2726 AI Insights" }
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
        }
        setLocked(false);
      }, onSignOut: logout }));
    }
    return /* @__PURE__ */ React.createElement(CategoriesContext.Provider, { value: { categories, categoryColors } }, React.createElement("div", { className: "app-scroll" }, /* @__PURE__ */ React.createElement("a", { href: "#main-content", className: "skip-link", "data-noprint": true }, "Skip to content"), /* @__PURE__ */ React.createElement("div", { className: "tab-bar-outer", "data-noprint": true }, /* @__PURE__ */ React.createElement("div", { className: "header-inner" }, /* @__PURE__ */ React.createElement("div", { className: "logo-area" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "header-logo-img" }), /* @__PURE__ */ React.createElement("div", { className: "year-pills" }, sortedConfigs.map((yc, i) => /* @__PURE__ */ React.createElement("div", { key: yc.year, className: "cf-row" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveYear(yc.year), className: "cf-text-mono-13 year-pill-btn", style: {
      background: activeYear === yc.year ? YEAR_COLORS[i % YEAR_COLORS.length] : "rgba(255,255,255,0.1)"
    } }, yc.year))))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "header-search" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 14, className: "header-search-icon" }), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "global-search",
        "aria-label": "Search",
        placeholder: "Search\u2026 try >100",
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
      const color = hasCritical ? "var(--red)" : "var(--amber)";
      const label = hasCritical ? hasWarning ? `${critical.length} critical, ${warning.length} warning alert${upcoming.length > 1 ? "s" : ""}` : `${critical.length} critical alert${critical.length > 1 ? "s" : ""}` : `${warning.length} warning alert${warning.length > 1 ? "s" : ""}`;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": label,
          onClick: () => setTab((prev) => prev === "alerts" ? "dashboard" : "alerts"),
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
        { label: "Settings", icon: "settings", action: () => {
          setMenuOpen(false);
          setTab("settings");
        } },
        ...isCoarsePointer && bioAvailable && !(sessionUser && getBiometricCredId(sessionUser.id)) ? [{ label: "Set Up Fingerprint / Face Unlock", icon: "lock", action: () => {
          setMenuOpen(false);
          setTab("settings");
          setTimeout(() => {
            const el = document.getElementById("sec-security");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        } }] : [],
        ...isCoarsePointer ? [] : [{ label: "Keyboard Shortcuts", icon: "keyboard", action: () => {
          setMenuOpen(false);
          setShowHelp(true);
        } }],
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
    } }, t.label, t.id === "dashboard" && activeFlow.filter((ev) => {
      const today = /* @__PURE__ */ new Date();
      const n = new Date(today);
      n.setDate(today.getDate() + 30);
      return ev.date >= today && ev.date <= n && ev.balance < alertThresh;
    }).length > 0 && /* @__PURE__ */ React.createElement("span", { className: "tab-alert-dot", style: { background: C.red } }, "!"), t.id === "budget" && globalSearch && /* @__PURE__ */ React.createElement("span", { "aria-label": "Search active", className: "tab-search-dot", style: { color: C.amber } }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 11 })))))), showBackupNudge && /* @__PURE__ */ React.createElement("div", { className: "backup-nudge" }, /* @__PURE__ */ React.createElement("div", { className: "backup-nudge-title" }, /* @__PURE__ */ React.createElement(Icon, { name: "save", size: 15 }), "Time for a backup"), /* @__PURE__ */ React.createElement("div", { className: "backup-nudge-msg" }, "It's been 30+ days since your last data export. Save a backup to protect your budget data."), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 justify-end" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => dismissBackup(false),
        className: "cf-btn cf-btn--secondary cf-btn--md"
      },
      "Remind me later"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => dismissBackup(true),
        className: "cf-btn cf-btn--primary cf-btn--md fw-700"
      },
      "\u2193 Export backup"
    ))), (pullProgress > 0 || pullActive) && /* @__PURE__ */ React.createElement("div", { className: "ptr-indicator", style: {
      opacity: Math.max(pullProgress, pullActive ? 1 : 0)
    } }, /* @__PURE__ */ React.createElement("span", { className: "ptr-spinner", style: {
      animation: pullActive ? "spin 0.8s linear infinite" : "none"
    } }, "\u21BB"), pullActive ? "Syncing\u2026" : "Pull down to sync"), /* @__PURE__ */ React.createElement(BottomNav, { tab, setTab, lowAlert: navLowAlert }), /* @__PURE__ */ React.createElement(FeedbackToast, null), /* @__PURE__ */ React.createElement("main", { id: "main-content", tabIndex: -1, className: "cf-page content-area" }, showLowBanner && /* @__PURE__ */ React.createElement("div", { role: "status", className: "cf-page low-balance-banner", "data-noprint": true, style: {
      background: navLowInfo.min < 0 ? "var(--redLt)" : "var(--amberLt)",
      border: `1px solid ${navLowInfo.min < 0 ? "var(--red)" : "var(--amber)"}55`
    } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": true }, "⚠"), /* @__PURE__ */ React.createElement("span", { className: "low-balance-msg" }, "Heads-up: your balance is forecast to dip to ", /* @__PURE__ */ React.createElement("strong", { className: "cf-text-mono-13" }, fmt(navLowInfo.min)), " around ", MONTHS[navLowInfo.month], " ", navLowInfo.day, navLowInfo.min < 0 ? " — below zero." : ` — under your $${centsToDollars(alertThresh)} alert threshold.`), /* @__PURE__ */ React.createElement("span", { className: "cf-row cf-gap-8 shrink-0" }, /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary cf-btn--tiny", onClick: () => setTab("alerts") }, "View alerts"), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary cf-btn--tiny", onClick: () => setLowBannerSnooze(todayKey), "aria-label": "Dismiss for today" }, "Dismiss"))), /* @__PURE__ */ React.createElement(ErrorBoundary, null, tab === "dashboard" &&/* @__PURE__ */ React.createElement(
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
        debtData
      }
    ), tab === "budget" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MobileYearBadge, { year: activeYear, years: sortedConfigs.map((yc) => yc.year), onSelect: setActiveYear }), /* @__PURE__ */ React.createElement(BudgetSubTabs, { value: budgetSub, onChange: setBudgetSub }), (budgetSub === "monthly" || budgetSub === "daily" || budgetSub === "bva") && /* @__PURE__ */ React.createElement(
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
        budgetSub,
        setBudgetSub,
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
        onDeleted: (e) => pushUndo(e),
        onAddNextYear: activeYear === latestYear ? addNextYearInline : null
      }
    ), budgetSub === "forecast" && /* @__PURE__ */ React.createElement(ForecastView, { yearFlows, yearConfigs: sortedConfigs, openBalByYear: activeOpenBal, alertThreshold: alertThresh, globalSearch, budgetTargets, horizon: forecastHorizon, setHorizon: setForecastHorizon, categories, categoryColors, addEntry, templates, setTemplates }), budgetSub === "entries" && /* @__PURE__ */ React.createElement(
      RegisterView,
      {
        entries,
        setEntries,
        saveEntryEdit,
        addEntry,
        categories,
        categoryColors,
        activeYear,
        onDeleted: (e) => pushUndo(e),
        templates,
        setTemplates,
        globalSearch,
        colOrder,
        setColOrder,
        filter: regFilter,
        setFilter: setRegFilter,
        filterCats: regFilterCats,
        setFilterCats: setRegFilterCats,
        filterScheds: regFilterScheds,
        setFilterScheds: setRegFilterScheds,
        filterStatus: regFilterStatus,
        setFilterStatus: setRegFilterStatus
      }
    )), tab === "alerts" && /* @__PURE__ */ React.createElement(AlertsPanel, { flow: activeFlow, alertThreshold: alertThresh, setTab, gotoForecast: () => {
      setTab("budget");
      setBudgetSub("forecast");
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
        planSub
      }
    )), tab === "ai" && /* @__PURE__ */ React.createElement(AIInsightsView, { flow: activeFlow, openBal: activeOpenBal, yearConfigs: sortedConfigs, budgetTargets, activeYear, categories, apiKey: aiApiKey, goals, debtData, setTab }), tab === "settings" && /* @__PURE__ */ React.createElement(
      SettingsView,
      {
        categories,
        setCategories,
        categoryColors,
        setCategoryColors,
        alertThreshold: alertThresh,
        setAlertThreshold: setAlertThresh,
        darkMode,
        setDarkMode,
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
        houseSave,
        houseLoad,
        household,
        members,
        createInvite,
        setMemberDisabled,
        updateMemberName
      }
    ))), showHelp && /* @__PURE__ */ React.createElement(ShortcutsHelp, { onClose: () => setShowHelp(false) }), undoStack.length > 0 && /* @__PURE__ */ React.createElement(
      UndoToast,
      {
        entry: undoStack[undoStack.length - 1],
        count: undoStack.length,
        onUndo: () => {
          haptic();
          const e = undoStack[undoStack.length - 1];
          setEntries((prev) => [...prev, e]);
          setUndoStack((prev) => prev.slice(0, -1));
          if (e.copiedFrom !== void 0) setDeletedCopyIds((prev) => {
            if (!(e.copiedFrom in prev)) return prev;
            const next = __spreadValues({}, prev);
            delete next[e.copiedFrom];
            return next;
          });
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
    ), /* @__PURE__ */ React.createElement("span", { className: "footer-sep" }, "|"), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "terms.html",
        className: "cf-footer-link"
      },
      "Terms of Use"
    ))));
  }
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, null));
