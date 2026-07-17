  function App() {
    var _a;
    if (typeof location !== "undefined" && location.search.includes("selftest")) return /* @__PURE__ */ React.createElement(SelfTestView, null);
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
    useEffect(() => {
      if (!lockTimeout || !sessionUser) return;
      const KEY = "cf_hidden_at";
      const onVis = () => {
        try {
          if (document.visibilityState === "hidden") {
            sessionStorage.setItem(KEY, String(Date.now()));
          } else {
            const at = parseInt(sessionStorage.getItem(KEY) || "0", 10);
            sessionStorage.removeItem(KEY);
            if (at && Date.now() - at > lockTimeout * 6e4) logout();
          }
        } catch (err) {
        }
      };
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }, [lockTimeout, sessionUser]);
    const [entries, setEntries] = useLS("cf_entries", []);
    const [overridesByYr, setOverridesByYr] = useLS("cf_overrides", {});
    const [yearConfigs, setYearConfigs] = useLS("cf_years", [{ year: 2026, openingBalance: 19005.69 }]);
    const [activeYear, setActiveYear] = useLS("cf_activeYear", 2026);
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
    const hashSyncGuard = useRef(false);
    useEffect(() => {
      const fromHash = parseTabHash().budgetSub;
      if (fromHash) setBudgetSub(fromHash);
    }, []);
    useEffect(() => {
      if (hashSyncGuard.current) {
        hashSyncGuard.current = false;
        return;
      }
      let newHash;
      try {
        newHash = "#/" + tab + (tab === "budget" && budgetSub ? "/" + budgetSub : "");
        if (location.hash !== newHash) history.pushState(null, "", newHash);
      } catch (e) {
      }
    }, [tab, budgetSub]);
    useEffect(() => {
      const onPopState = () => {
        const parsed = parseTabHash();
        hashSyncGuard.current = true;
        if (parsed.tab) setTab(parsed.tab);
        if (parsed.tab === "budget" && parsed.budgetSub) setBudgetSub(parsed.budgetSub);
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
    useEffect(() => {
      window.__cfGoBudgetSub = (s) => {
        setTab("budget");
        setBudgetSub(s);
      };
      return () => {
        delete window.__cfGoBudgetSub;
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
      }
    };
    const searchRef = useRef(null);
    useEffect(() => {
      const TAB_KEYS = { "1": "dashboard", "2": "budget", "3": "plan", "4": "ai", "5": "settings" };
      const handler = (e) => {
        var _a2, _b;
        const tag = (((_a2 = e.target) == null ? void 0 : _a2.tagName) || "").toLowerCase();
        const isInput = tag === "input" || tag === "textarea" || tag === "select" || ((_b = e.target) == null ? void 0 : _b.isContentEditable);
        if (!isInput && TAB_KEYS[e.key] && !document.querySelector(".modal-overlay")) {
          e.preventDefault();
          setTab(TAB_KEYS[e.key]);
          return;
        }
        if (!isInput && e.key === "/" && !document.querySelector(".modal-overlay")) {
          e.preventDefault();
          const el = document.getElementById("global-search");
          if (el) {
            el.focus();
            el.select();
          }
          return;
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, []);
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
    const [fabOpen, setFabOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileForm, setProfileForm] = useState(null);
    const [pf, setPf] = useState({ fullName: "", email: "" });
    const [pwf, setPwf] = useState({ current: "", next: "", confirm: "" });
    const [pfErr, setPfErr] = useState("");
    const [pfOk, setPfOk] = useState("");
    const [pullProgress, setPullProgress] = useState(0);
    const [pullActive, setPullActive] = useState(false);
    const ptrRef = useRef({ startY: 0, active: false });
    const gistLoadRef = useRef(null);
    useEffect(() => {
      window.__cfSetTab = setTab;
      return () => {
        delete window.__cfSetTab;
      };
    }, [setTab]);
    const [undoStack, setUndoStack] = useState([]);
    const pushUndo = (e) => setUndoStack((prev) => [...prev.slice(-9), e]);
    const [showHelp, setShowHelp] = useState(false);
    const C = darkMode ? DARK : LIGHT;
    useLayoutEffect(() => {
      const theme = sessionUser ? C : LIGHT;
      Object.entries(theme).forEach(([k, v]) => {
        document.documentElement.style.setProperty(`--${k}`, v);
      });
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
              month[ev.category] = Math.round(((month[ev.category] || 0) + ev.amount) * 100) / 100;
              next[key] = month;
            });
          });
          return next;
        });
      }
      return entry;
    };
    const currentBalance = useMemo(() => getCurrentBalance(activeFlow, activeOpenBal, activeYear), [activeFlow, activeOpenBal, activeYear]);
    const {
      status: gistStatus,
      msg: gistMsg,
      saveData: gistSave,
      loadData: gistLoad,
      createGist: gistCreate,
      listSnapshots,
      restoreSnapshot,
      downloadBackup,
      conflict: gistConflict,
      resolveConflict
    } = useGistSync({
      entries,
      setEntries,
      overridesByYr,
      setOverridesByYr,
      yearConfigs,
      setYearConfigs,
      categories,
      setCategories,
      categoryColors,
      setCategoryColors,
      activeYear,
      setActiveYear,
      alertThreshold: alertThresh,
      setAlertThreshold: setAlertThresh,
      darkMode,
      setDarkMode,
      forecastHorizon,
      setForecastHorizon,
      colOrder,
      setColOrder,
      regFilter,
      setRegFilter,
      regFilterCats,
      setRegFilterCats,
      regFilterScheds,
      setRegFilterScheds,
      regFilterStatus,
      setRegFilterStatus,
      aiApiKey,
      setAiApiKey,
      users: members.map((m) => ({ id: m.user_id, fullName: m.full_name, email: m.user_id === (sessionUser == null ? void 0 : sessionUser.id) ? sessionUser.email : "", disabled: m.disabled })),
      setUsers: () => {
      },
      budgetTargets,
      setBudgetTargets,
      templates,
      setTemplates,
      completed,
      setCompleted,
      goals,
      setGoals,
      dashHidden,
      setDashHidden,
      dashOrder,
      setDashOrder
    });
    const {
      status: houseStatus,
      msg: houseMsg,
      saveData: houseSave,
      loadData: houseLoad
    } = useHouseholdData({
      household,
      entries,
      setEntries,
      overridesByYr,
      setOverridesByYr,
      yearConfigs,
      setYearConfigs,
      categories,
      setCategories,
      categoryColors,
      setCategoryColors,
      activeYear,
      setActiveYear,
      alertThreshold: alertThresh,
      setAlertThreshold: setAlertThresh,
      darkMode,
      setDarkMode,
      forecastHorizon,
      setForecastHorizon,
      colOrder,
      setColOrder,
      regFilter,
      setRegFilter,
      regFilterCats,
      setRegFilterCats,
      regFilterScheds,
      setRegFilterScheds,
      regFilterStatus,
      setRegFilterStatus,
      aiApiKey,
      setAiApiKey,
      budgetTargets,
      setBudgetTargets,
      templates,
      setTemplates,
      completed,
      setCompleted,
      goals,
      setGoals,
      dashHidden,
      setDashHidden,
      dashOrder,
      setDashOrder
    });
    const gistToken = () => localStorage.getItem("cf_gist_token") || "";
    useEffect(() => {
      gistLoadRef.current = houseLoad;
    }, [houseLoad]);
    useEffect(() => {
      const onStart = (e) => {
        if (window.scrollY > 10) return;
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
            if (gistLoadRef.current) gistLoadRef.current();
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
      const h = () => setFabOpen(true);
      window.addEventListener("cf:quickadd", h);
      return () => window.removeEventListener("cf:quickadd", h);
    }, []);
    useEffect(() => {
      const handler = (e) => {
        var _a2;
        const tag = (_a2 = document.activeElement) == null ? void 0 : _a2.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
          case "Escape":
            setGlobalSearch("");
            setShowHelp(false);
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
    const navLowAlert = useMemo(() => {
      try {
        const now = /* @__PURE__ */ new Date();
        if (now.getFullYear() !== activeYear || !activeFlow.length) return false;
        const tm = now.getMonth(), td = now.getDate();
        const end = new Date(activeYear, tm, td);
        end.setDate(end.getDate() + 60);
        let min = null;
        activeFlow.forEach((ev) => {
          if (ev.month < tm || ev.month === tm && ev.day < td) return;
          const d = new Date(activeYear, ev.month, ev.day);
          if (d > end) return;
          if (min === null || ev.balance < min) min = ev.balance;
        });
        return min !== null && min < alertThresh;
      } catch (err) {
        return false;
      }
    }, [activeFlow, activeYear, alertThresh]);
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
    const tabs = [
      { id: "dashboard", label: "Dashboard" },
      { id: "budget", label: "Budget" },
      { id: "plan", label: "Plan" },
      { id: "ai", label: "\u2726 AI Insights" },
      { id: "settings", label: "Settings" }
    ];
    if (authLoading) {
      return null;
    }
    if (!session) {
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(LoginView, null));
    }
    if (membershipLoading) {
      return null;
    }
    if (!household) {
      return /* @__PURE__ */ React.createElement(HouseholdOnboardingView, { email: session.user.email, createHousehold, joinHousehold, signOut });
    }
    return /* @__PURE__ */ React.createElement(CategoriesContext.Provider, { value: { categories, categoryColors } }, React.createElement("div", { style: { background: "var(--bg)", minHeight: "100vh", color: "var(--text)", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("style", null, GLOBAL_STYLES), /* @__PURE__ */ React.createElement("a", { href: "#main-content", className: "skip-link" }, "Skip to content"), /* @__PURE__ */ React.createElement("div", { className: "tab-bar-outer", style: { background: "var(--headerBg)", padding: "0 24px", paddingBottom: 0, lineHeight: 0, fontSize: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "header-inner", style: { maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, fontSize: "initial", lineHeight: "initial" } }, /* @__PURE__ */ React.createElement("div", { className: "logo-area", style: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexShrink: 0 } }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", style: { height: 33, objectFit: "contain", display: "block", imageRendering: "auto", flexShrink: 0 } }), /* @__PURE__ */ React.createElement("div", { className: "year-pills-mobile", style: { display: "flex", gap: 4, alignItems: "center" } }, sortedConfigs.map((yc, i) => /* @__PURE__ */ React.createElement("div", { key: yc.year, style: { display: "flex", alignItems: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveYear(yc.year), className: "cf-text-mono-13", style: {
      fontWeight: 700,
      padding: "4px 12px",
      borderRadius: "16px",
      border: "none",
      cursor: "pointer",
      background: activeYear === yc.year ? YEAR_COLORS[i % YEAR_COLORS.length] : "rgba(255,255,255,0.1)",
      color: "#fff",
      transition: "all 0.15s"
    } }, yc.year))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "header-search", style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(255,255,255,0.08)",
      borderRadius: 20,
      padding: "5px 12px",
      border: "1px solid rgba(255,255,255,0.12)"
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 14, style: { color: "rgba(255,255,255,0.4)", flexShrink: 0 } }), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "global-search",
        "aria-label": "Search",
        placeholder: "Search\u2026",
        autoComplete: "off",
        value: globalSearch,
        onChange: (e) => setGlobalSearch(e.target.value),
        style: {
          fontSize: 13,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#fff",
          width: 130,
          caretColor: "var(--amber)"
        }
      }
    ), globalSearch && /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Clear search",
        onClick: () => setGlobalSearch(""),
        style: {
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
          padding: 0,
          lineHeight: 1
        }
      },
      "\u2715"
    )), gistToken() && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => gistSave(false),
        disabled: gistStatus === "syncing",
        title: gistStatus === "syncing" ? "Saving to Gist\u2026" : gistStatus === "error" ? `Gist error: ${gistMsg || ""}` : `Save to Gist${gistMsg ? ` \u2014 ${gistMsg}` : ""}`,
        "aria-label": "Save to Gist",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 12px",
          height: 36,
          minWidth: 40,
          justifyContent: "center",
          borderRadius: 8,
          cursor: gistStatus === "syncing" ? "wait" : "pointer",
          fontSize: 12,
          fontWeight: 600,
          border: "1px solid",
          flexShrink: 0,
          borderColor: gistStatus === "error" ? "var(--red)" : gistStatus === "syncing" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.25)",
          background: gistStatus === "ok" ? "rgba(39,174,115,0.15)" : gistStatus === "error" ? "rgba(232,93,74,0.15)" : "rgba(255,255,255,0.07)",
          color: gistStatus === "error" ? "var(--red)" : gistStatus === "ok" ? "var(--green)" : "rgba(255,255,255,0.7)",
          transition: "all 0.15s"
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15 } }, gistStatus === "syncing" ? "\u27F3" : gistStatus === "error" ? "\u2717" : "\u2601"),
      /* @__PURE__ */ React.createElement("span", { className: "help-btn" }, "Save")
    ), (() => {
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
          style: {
            position: "relative",
            background: tab === "alerts" ? "rgba(255,255,255,0.15)" : "transparent",
            border: "1px solid",
            borderColor: color,
            borderRadius: 8,
            width: 36,
            height: 36,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
            fontSize: 17,
            transition: "all 0.15s"
          }
        },
        "\u{1F514}",
        /* @__PURE__ */ React.createElement("span", { style: {
          position: "absolute",
          top: -5,
          right: -5,
          background: color,
          color: "#fff",
          borderRadius: "50%",
          width: 16,
          height: 16,
          fontSize: 9,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1
        } }, count > 9 ? "9+" : count)
      );
    })(), (() => {
      const initials = ((sessionUser == null ? void 0 : sessionUser.fullName) || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      return /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setMenuOpen((v) => !v),
          "aria-label": "User menu",
          title: `Signed in as ${(sessionUser == null ? void 0 : sessionUser.fullName) || ""}`,
          style: {
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: menuOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
            transition: "background 0.15s"
          }
        },
        initials
      ), menuOpen && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: () => setMenuOpen(false),
          style: { position: "fixed", inset: 0, zIndex: 1400 }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: {
        position: "fixed",
        top: 58,
        // just below the 64px header
        right: 12,
        // 12px from right edge of viewport
        zIndex: 1500,
        background: "var(--bgCard)",
        borderRadius: 12,
        boxShadow: "var(--shadowXl)",
        border: "1px solid var(--border)",
        width: "min(240px, calc(100vw - 24px))",
        // never wider than screen
        overflow: "hidden"
      } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--text)" } }, (sessionUser == null ? void 0 : sessionUser.fullName) || ""), /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 11,
        color: "var(--textLt)",
        marginTop: 2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      } }, (sessionUser == null ? void 0 : sessionUser.email) || "")), [
        { label: "Edit Profile", icon: "\u{1F464}", action: () => {
          setPf({ fullName: (sessionUser == null ? void 0 : sessionUser.fullName) || "", email: (sessionUser == null ? void 0 : sessionUser.email) || "" });
          setPfErr("");
          setPfOk("");
          setProfileForm("profile");
        } },
        { label: "Change Password", icon: "\u{1F511}", action: () => {
          setPwf({ current: "", next: "", confirm: "" });
          setPfErr("");
          setPfOk("");
          setProfileForm("password");
        } },
        { label: "Settings", icon: "\u2699", action: () => {
          setMenuOpen(false);
          setTab("settings");
        } },
        { label: "Keyboard Shortcuts", icon: "\u2328", action: () => {
          setMenuOpen(false);
          setShowHelp(true);
        } },
        ...showInstall ? [{ label: "Install App", icon: "\u2B07", action: () => {
          setMenuOpen(false);
          doInstall();
        } }] : []
      ].map((item) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: item.label,
          onClick: item.action,
          style: {
            width: "100%",
            textAlign: "left",
            padding: "12px 16px",
            fontSize: 13,
            color: "var(--text)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid var(--border)"
          },
          onMouseEnter: (e) => e.currentTarget.style.background = "var(--stripe)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
        },
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15 } }, item.icon),
        item.label
      )), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setMenuOpen(false);
            logout();
          },
          "aria-label": "Sign out",
          style: {
            width: "100%",
            textAlign: "left",
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--red)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10
          },
          onMouseEnter: (e) => e.currentTarget.style.background = "var(--redLt)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
        },
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15 } }, "\u{1F6AA}"),
        "Sign out"
      ))), profileForm === "profile" && /* @__PURE__ */ React.createElement("div", { style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 2e3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        background: "var(--bgCard)",
        borderRadius: 16,
        padding: 28,
        maxWidth: 400,
        width: "100%",
        boxShadow: "var(--shadowXl)"
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 16,
        fontWeight: 700,
        color: "var(--text)",
        marginBottom: 20
      } }, "Edit Profile"), [{ label: "Full Name", key: "fullName", type: "text" }].map(({ label, key, type }) => /* @__PURE__ */ React.createElement("div", { key, style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("label", { style: {
        display: "block",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--textMid)",
        marginBottom: 5
      } }, label), /* @__PURE__ */ React.createElement(
        "input",
        {
          type,
          value: pf[key],
          onChange: (e) => setPf((p) => __spreadProps(__spreadValues({}, p), { [key]: e.target.value })),
          style: {
            width: "100%",
            fontSize: 13,
            padding: "8px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none",
            boxSizing: "border-box"
          }
        }
      ))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--textLt)", marginBottom: 14 } }, "Email: ", sessionUser == null ? void 0 : sessionUser.email, " (sign-in email can't be changed here)"), pfErr && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--red)", fontSize: 12, marginBottom: 10 } }, pfErr), pfOk && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--greenDk)", fontSize: 12, marginBottom: 10 } }, pfOk), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setProfileForm(null),
          className: "cf-btn cf-btn--secondary", style: { padding: "8px 18px" }
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
      }, className: "cf-btn cf-btn--primary", style: { fontWeight: 700, padding: "8px 18px" } }, "Save")))), profileForm === "password" && /* @__PURE__ */ React.createElement("div", { style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 2e3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        background: "var(--bgCard)",
        borderRadius: 16,
        padding: 28,
        maxWidth: 400,
        width: "100%",
        boxShadow: "var(--shadowXl)"
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 16,
        fontWeight: 700,
        color: "var(--text)",
        marginBottom: 20
      } }, "Change Password"), [
        { label: "Current password", key: "current", val: pwf.current },
        { label: "New password (min 8 chars)", key: "next", val: pwf.next },
        { label: "Confirm new password", key: "confirm", val: pwf.confirm }
      ].map(({ label, key, val }) => /* @__PURE__ */ React.createElement("div", { key, style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("label", { style: {
        display: "block",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--textMid)",
        marginBottom: 5
      } }, label), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "password",
          value: val,
          onChange: (e) => setPwf((p) => __spreadProps(__spreadValues({}, p), { [key]: e.target.value })),
          style: {
            width: "100%",
            fontSize: 13,
            padding: "8px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none",
            boxSizing: "border-box"
          }
        }
      ))), pfErr && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--red)", fontSize: 12, marginBottom: 10 } }, pfErr), pfOk && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--greenDk)", fontSize: 12, marginBottom: 10 } }, pfOk), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setProfileForm(null),
          className: "cf-btn cf-btn--secondary", style: { padding: "8px 18px" }
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
          const { error: verifyErr } = await supabaseClient.auth.signInWithPassword({ email: sessionUser.email, password: pwf.current });
          if (verifyErr) {
            setPfErr("Current password is incorrect.");
            return;
          }
          const { error: updateErr } = await supabaseClient.auth.updateUser({ password: pwf.next });
          if (updateErr) throw updateErr;
          setPfOk("Password changed successfully.");
          setTimeout(() => setProfileForm(null), 900);
        } catch (err) {
          setPfErr(err.message || "Couldn't change your password.");
        }
      }, className: "cf-btn cf-btn--primary", style: { fontWeight: 700, padding: "8px 18px" } }, "Change Password")))));
    })())), /* @__PURE__ */ React.createElement("nav", { className: "tab-bar", "aria-label": "Primary", style: { maxWidth: 1160, margin: "0 auto", display: "flex", gap: 2, fontSize: "initial", lineHeight: "initial" } }, tabs.map((t) => /* @__PURE__ */ React.createElement("button", { key: t.id, onClick: () => setTab(t.id), style: {
      fontSize: 13,
      fontWeight: 600,
      padding: "12px 18px",
      border: "none",
      cursor: "pointer",
      borderBottom: tab === t.id ? "3px solid var(--amber)" : "3px solid transparent",
      background: "transparent",
      color: tab === t.id ? "#fff" : "rgba(255,255,255,0.55)",
      transition: "color 0.15s,border-color 0.15s"
    } }, t.label, t.id === "dashboard" && activeFlow.filter((ev) => {
      const today = /* @__PURE__ */ new Date();
      const n = new Date(today);
      n.setDate(today.getDate() + 30);
      return ev.date >= today && ev.date <= n && ev.balance < alertThresh;
    }).length > 0 && /* @__PURE__ */ React.createElement("span", { style: {
      marginLeft: 6,
      background: C.red,
      color: "#fff",
      borderRadius: 10,
      padding: "1px 6px",
      fontSize: 10,
      fontWeight: 700
    } }, "!"), t.id === "budget" && globalSearch && /* @__PURE__ */ React.createElement("span", { style: {
      marginLeft: 5,
      background: C.amber,
      color: C.navy,
      borderRadius: 10,
      padding: "1px 5px",
      fontSize: 9,
      fontWeight: 700
    } }, "\u{1F50D}"))))), showBackupNudge && /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      bottom: 80,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 3e3,
      background: "var(--bgCard)",
      border: "1px solid var(--amber)",
      borderRadius: 14,
      padding: "16px 20px",
      maxWidth: 340,
      width: "calc(100vw - 32px)",
      boxShadow: "var(--shadowLg)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 } }, "\u{1F4BE} Time for a backup"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginBottom: 14, lineHeight: 1.5 } }, "It's been 30+ days since your last data export. Save a backup to protect your budget data."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => dismissBackup(false),
        className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "7px 14px", borderRadius: 7 }
      },
      "Remind me later"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => dismissBackup(true),
        className: "cf-btn cf-btn--primary", style: { fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 7 }
      },
      "\u2193 Export backup"
    ))), (pullProgress > 0 || pullActive) && /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      top: 52,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 3e3,
      background: "var(--navy)",
      color: "#fff",
      borderRadius: 20,
      padding: "6px 16px 6px 12px",
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      gap: 8,
      opacity: Math.max(pullProgress, pullActive ? 1 : 0),
      transition: "opacity 0.2s",
      pointerEvents: "none",
      boxShadow: "var(--shadowLg)"
    } }, /* @__PURE__ */ React.createElement("span", { style: {
      display: "inline-block",
      animation: pullActive ? "spin 0.8s linear infinite" : "none",
      fontSize: 14
    } }, "\u21BB"), pullActive ? "Syncing\u2026" : "Pull down to sync"), /* @__PURE__ */ React.createElement(BottomNav, { tab, setTab, lowAlert: navLowAlert }), /* @__PURE__ */ React.createElement(FeedbackToast, null), /* @__PURE__ */ React.createElement("main", { id: "main-content", tabIndex: -1, className: "content-area" + (tab === "budget" ? " content-area--fab" : ""), style: { padding: "28px 24px", maxWidth: 1160, width: "100%", margin: "0 auto", marginTop: 0, outline: "none" } }, /* @__PURE__ */ React.createElement(ErrorBoundary, null, tab === "dashboard" && /* @__PURE__ */ React.createElement(
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
        dashHidden,
        setDashHidden,
        dashOrder,
        setDashOrder
      }
    ), tab === "budget" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(BudgetSubTabs, { value: budgetSub, onChange: setBudgetSub }), (budgetSub === "monthly" || budgetSub === "daily" || budgetSub === "bva") && /* @__PURE__ */ React.createElement(
      BudgetView,
      {
        flow: activeFlow,
        openBal: activeOpenBal,
        entries,
        setOverride,
        clearOverride,
        categories,
        categoryColors,
        setEntries,
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
        setBudgetColOrder
      }
    ), budgetSub === "forecast" && /* @__PURE__ */ React.createElement(ForecastView, { yearFlows, yearConfigs: sortedConfigs, openBalByYear: activeOpenBal, alertThreshold: alertThresh, globalSearch, budgetTargets, horizon: forecastHorizon, setHorizon: setForecastHorizon, categories, categoryColors }), budgetSub === "entries" && /* @__PURE__ */ React.createElement(
      RegisterView,
      {
        entries,
        setEntries,
        addEntry,
        categories,
        categoryColors,
        setCategories,
        activeYear,
        onDeleted: (e) => pushUndo(e),
        templates,
        setTemplates,
        globalSearch,
        colOrder,
        setColOrder,
        flow: activeFlow,
        completed,
        markOccurrencesPaid,
        filter: regFilter,
        setFilter: setRegFilter,
        filterCats: regFilterCats,
        setFilterCats: setRegFilterCats,
        filterScheds: regFilterScheds,
        setFilterScheds: setRegFilterScheds,
        filterStatus: regFilterStatus,
        setFilterStatus: setRegFilterStatus
      }
    )), tab === "alerts" && /* @__PURE__ */ React.createElement(AlertsPanel, { flow: activeFlow, alertThreshold: alertThresh, setTab }), tab === "plan" && /* @__PURE__ */ React.createElement(
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
        activeYear
      }
    ), tab === "ai" && /* @__PURE__ */ React.createElement(AIInsightsView, { flow: activeFlow, openBal: activeOpenBal, yearConfigs: sortedConfigs, budgetTargets, activeYear, categories, apiKey: aiApiKey }), tab === "settings" && /* @__PURE__ */ React.createElement(
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
        gistStatus,
        gistMsg,
        gistSave,
        gistLoad,
        gistCreate,
        listSnapshots,
        restoreSnapshot,
        downloadBackup,
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
        setMemberDisabled
      }
    ))), showHelp && /* @__PURE__ */ React.createElement(ShortcutsHelp, { onClose: () => setShowHelp(false) }), gistConflict && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 3500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "modal-card", style: { padding: "26px 24px", width: "min(440px,calc(100vw - 32px))" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 10 } }, "\u26A0 Sync Conflict"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", lineHeight: 1.6, marginBottom: 14 } }, "Another device saved to the Gist ", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--text)" } }, new Date(gistConflict.remoteSavedAt).toLocaleString()), " \u2014 after this device last synced."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--textMid)", background: "var(--stripe)", borderRadius: 8, padding: "10px 14px", marginBottom: 18 } }, "Remote: ", gistConflict.remoteEntries, " entries \xB7 This device: ", gistConflict.localEntries, " entries"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => resolveConflict(false),
        className: "cf-btn cf-btn--primary",
        style: { fontSize: 13, fontWeight: 700, padding: "11px" }
      },
      "\u2B07 Load their version (recommended)"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => resolveConflict(true),
        style: { fontSize: 13, padding: "11px", borderRadius: 8, border: "1px solid var(--red)", cursor: "pointer", background: "transparent", color: "var(--red)" }
      },
      "\u2B06 Overwrite with my version"
    )))), undoStack.length > 0 && /* @__PURE__ */ React.createElement(
      UndoToast,
      {
        entry: undoStack[undoStack.length - 1],
        count: undoStack.length,
        onUndo: () => {
          haptic();
          const e = undoStack[undoStack.length - 1];
          setEntries((prev) => [...prev, e]);
          setUndoStack((prev) => prev.slice(0, -1));
        },
        onDismiss: () => setUndoStack([])
      }
    ), /* @__PURE__ */ React.createElement("div", { style: {
      textAlign: "center",
      padding: "18px 16px 28px",
      fontSize: 11,
      color: "rgba(255,255,255,0.25)",
      background: "var(--headerBg)",
      marginTop: "auto"
    } }, /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "privacy.html",
        style: {
          color: "rgba(255,255,255,0.4)",
          textDecoration: "none",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          paddingBottom: 1
        },
        onMouseEnter: (e) => e.target.style.color = "rgba(255,255,255,0.7)",
        onMouseLeave: (e) => e.target.style.color = "rgba(255,255,255,0.4)"
      },
      "Privacy"
    ), /* @__PURE__ */ React.createElement("span", { style: { margin: "0 10px" } }, "|"), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "terms.html",
        style: {
          color: "rgba(255,255,255,0.4)",
          textDecoration: "none",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          paddingBottom: 1
        },
        onMouseEnter: (e) => e.target.style.color = "rgba(255,255,255,0.7)",
        onMouseLeave: (e) => e.target.style.color = "rgba(255,255,255,0.4)"
      },
      "Terms of Use"
    )), tab === "budget" && /* @__PURE__ */ React.createElement(
      QuickAddFAB,
      {
        categories,
        templates,
        setTemplates,
        open: fabOpen,
        setOpen: setFabOpen,
        onSave: (data) => {
          addEntry(data);
          setFabOpen(false);
        },
        onImportCSV: () => {
          if (budgetSub === "entries") {
            window.__regOpenCSV && window.__regOpenCSV();
          } else {
            setBudgetSub("entries");
            setTimeout(() => {
              window.__regOpenCSV && window.__regOpenCSV();
            }, 0);
          }
        }
      }
    )));
  }
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, null));
