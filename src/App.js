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
      setMemberRole,
      updateMemberName,
      updateMyName,
      leaveHousehold,
      removeMember,
      deleteMyAccount,
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
    const { locked, setLocked, lockTimeout, setLockTimeout, bioAvailable, isCoarsePointer } = useIdleLock({ sessionUser, session, authLoading });
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
      assets,
      goals,
      debtExtra,
      debtSimExcluded,
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
      assets: setAssets,
      goals: setGoals,
      debtExtra: setDebtExtra,
      debtSimExcluded: setDebtSimExcluded,
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
    // How this member likes to look at the household — theme, forecast window,
    // column orders, dashboard layout, Entries filters. Their own row on the
    // server, following them to every device they sign in on and to no one
    // else's (see MEMBER_PREF_FIELDS in household-sync.js).
    const { values: prefValues, setters: prefSetters } = useMemberPrefs(household);
    const {
      darkMode,
      forecastHorizon,
      dashHidden,
      dashOrder,
      colOrder,
      budgetColOrder,
      // The Entries filters keep their "regFilter*" names for compatibility
      // (see the table); only these bindings are renamed.
      regFilter: entriesFilter,
      regFilterCats: entriesFilterCats,
      regFilterScheds: entriesFilterScheds,
      regFilterStatus: entriesFilterStatus
    } = prefValues;
    const {
      darkMode: setDarkMode,
      forecastHorizon: setForecastHorizon,
      dashHidden: setDashHidden,
      dashOrder: setDashOrder,
      colOrder: setColOrder,
      budgetColOrder: setBudgetColOrder,
      regFilter: setEntriesFilter,
      regFilterCats: setEntriesFilterCats,
      regFilterScheds: setEntriesFilterScheds,
      regFilterStatus: setEntriesFilterStatus
    } = prefSetters;
    // Deliberately not a household field: a personal API credential, never
    // synced to the household and never written into a backup file.
    const [aiApiKey, setAiApiKey] = useLS("cf_ai_key", "");
    const { tab, setTab, flowSub, setFlowSub, planSub, setPlanSub, youSub, setYouSub } = useRoute();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    useDialogFocus();
    const isOffline = useOnlineStatus();
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
      // household too: the proxy answers members only, so a probe made before
      // joining one has to be asked again after.
    }, [session, household]);
    const { showBackupNudge, dismissBackup } = useBackupNudge(houseValues);
    // Not household fields: which month the Budget tab is showing and how its
    // columns are ordered are per-device view preferences.
    const [budgetMonth, setBudgetMonth] = useLS("cf_budgetMonth", (/* @__PURE__ */ new Date()).getMonth());
    const { globalSearch, setGlobalSearch, searchScopeLabel } = useGlobalSearch({ tab, flowSub, activeYear, setTab, setFlowSub });
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
    const houseLoadRef = useRef(null);
    const { undoStack, pushUndo, undoStackRef, undoLast, clearUndo } = useUndoStack();
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
    // Whether this account may change anything. The server is the boundary —
    // save_household refuses a viewer outright — and this is so the interface
    // does not offer what would then be refused. A member whose row has not
    // loaded yet is treated as a writer: the alternative is flashing a
    // view-only interface at every owner on every cold start, and a wrong
    // guess here costs nothing because the server still decides.
    const myRole = useMemo(() => {
      const me = (members || []).find((m) => m.user_id === (sessionUser == null ? void 0 : sessionUser.id));
      return me ? me.role || "member" : null;
    }, [members, sessionUser]);
    const canWrite = myRole !== "viewer";
    const householdCtx = useMemo(() => ({ members, sessionUser, accounts, logActivity, canWrite, myRole }), [members, sessionUser, accounts, logActivity, canWrite, myRole]);
    const { pushUndoEntryDelete, addEntry, saveEntryEdit, applyDriftFix, setOverride, clearOverride, markOccurrencesPaid, toggleComplete, latestYear, addNextYearInline } = useBudgetActions({ entries, setEntries, overridesByYr, setOverridesByYr, setCompleted, setGoals, deletedCopyIds, setDeletedCopyIds, budgetTargets, setBudgetTargets, yearConfigs, setYearConfigs, activeYear, setActiveYear, setBudgetMonth, sessionUser, logActivity, pushUndo });
    useThemeAndFormat({ darkMode, sessionUser, locale, currency });
    const yearRoving = useRovingTabs(".year-pill-btn");
    const { yearFlows, scenarioOn, setScenarioOn, scenarioAdj, setScenarioAdj, scenarioFlows, sortedConfigs, setAccountFilter, activeAccount, viewFlows, activeFlow, activeOpenBal, prevYearConfigured, prevYearFlow } = useFlows({ entries, yearConfigs, overridesByYr, holidays, holidayRegionCode, accounts, activeYear });
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
    const { pullProgress, pullActive } = usePullToRefresh(houseLoadRef);
    const { installPrompt, showInstall, doInstall } = useInstallPrompt();
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
    useKeyboardShortcuts({ setTab, setFlowSub, setPlanSub, setBudgetMonth, setGlobalSearch, undoStackRef, undoLast, tab });
    const { navLowInfo, navLowAlert, lowBannerKey, showLowBanner, setLowBannerDismissed } = useLowBalance({ activeFlow, viewFlows, activeYear, alertThresh });
    // The calendar day *here*, not in UTC. toISOString() was returning the UTC
    // date, which west of Greenwich rolls over in the afternoon — from 5pm
    // local (4pm in winter) every key gated on this already pointed at
    // tomorrow. That reset the once-a-day notification guards below, so the
    // same bills could announce themselves twice in one evening. (It un-
    // snoozed the low-balance banner too, back when that was a date; it is an
    // identity now and no longer cares what day it is.) todayStr() is the
    // local-date helper the rest of the date code already uses.
    const todayKey = todayStr();
    useGoalRollovers({ goals, entries, setGoals, setEntries, logActivity });
    const { appFindings, appNotices } = useAppNotices({ activeFlow, activeYear, debtData, debtExtra, canWrite, showLowBanner, tab, navLowInfo, alertThresh, lowBannerKey, setLowBannerDismissed, setTab, showBackupNudge, dismissBackup, entries, setEntries, yearConfigs, setActiveYear, setYouSub });
    const { notifyEnabled, setNotifyEnabled, notifPerm, notifyHour, setNotifyHour, pushState, enableNotifications, disableNotifications } = useNotifications({ household, yearFlows, completed, alertThresh, activeYear, activeFlow, navLowInfo, todayKey });
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
        safeStorage.set(LOCK_KEY, String(Date.now()), "session");
        setLocked(false);
      }, onSignOut: logout }));
    }
    return /* @__PURE__ */ React.createElement(HouseholdContext.Provider, { value: householdCtx }, React.createElement(CategoriesContext.Provider, { value: { categories, categoryColors, chipSurface: (sessionUser && darkMode ? DARK : LIGHT).bgCard } }, React.createElement("div", { className: "app-scroll" }, /* @__PURE__ */ React.createElement(SyncDivergenceModal, { divergence: houseDivergence, onKeepLocal: keepLocalChanges, onUseCloud: discardLocalChanges }), /* @__PURE__ */ React.createElement(AddEntryModal, {
      show: showQuickAdd,
      onClose: () => setShowQuickAdd(false),
      onSave: addEntry,
      categories,
      apiKey: aiApiKey,
      isOffline,
      templates,
      setTemplates
    }), /* @__PURE__ */ React.createElement("a", { href: "#main-content", className: "skip-link", "data-noprint": true }, "Skip to content"), /* @__PURE__ */ React.createElement("header", { className: "tab-bar-outer", "data-noprint": true }, /* @__PURE__ */ React.createElement("div", { className: "header-inner" }, /* @__PURE__ */ React.createElement("div", { className: "logo-area" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "header-logo-img" }), (tab === "flow" || tab === "envelopes" || tab === "plan") && /* @__PURE__ */ React.createElement(MobileYearBadge, { year: activeYear, years: sortedConfigs.map((yc) => yc.year), onSelect: setActiveYear, inHeader: true }), /* @__PURE__ */ React.createElement("div", { className: "year-pills", role: "group", "aria-label": "Budget year", onKeyDown: yearRoving.onKeyDown }, sortedConfigs.map((yc, i) => /* @__PURE__ */ React.createElement("div", { key: yc.year, className: "cf-row" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveYear(yc.year), "aria-pressed": activeYear === yc.year, tabIndex: activeYear === yc.year ? 0 : -1, "aria-label": `Budget year ${yc.year}`, className: "cf-text-mono-13 year-pill-btn", style: {
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
      // Episodes, not events — the same count the alerts page shows. Counting
      // events made the badge read "9+" for a single dip, because a household
      // that goes under stays under and every entry after the crossing was
      // counted as another alert.
      const episodes = lowBalanceEpisodes(activeFlow, alertThresh);
      if (!episodes.length) return null;
      const critical = episodes.filter((e) => e.tone === "critical");
      const warning = episodes.filter((e) => e.tone !== "critical");
      const hasCritical = critical.length > 0;
      const count = episodes.length;
      const color = hasCritical ? "var(--red)" : "var(--amberInk)";
      const label = hasCritical
        ? warning.length
          ? `${critical.length} critical, ${warning.length} warning alert${count > 1 ? "s" : ""}`
          : `${critical.length} critical alert${critical.length > 1 ? "s" : ""}`
        : `${warning.length} warning alert${warning.length > 1 ? "s" : ""}`;
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
          // Settings, Alerts and Help are reached from this menu rather than
          // from the tab bar, so while you are in one of them the bar shows
          // nothing selected. The avatar is where they live; it is what
          // should look current.
          "data-here": tab === "you" || tab === "alerts" || tab === "help" ? "1" : void 0,
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
    }).length > 0 && /* @__PURE__ */ React.createElement("span", { className: "tab-alert-dot", style: { background: "var(--red)" } }, "!"), t.id === "flow" && globalSearch && /* @__PURE__ */ React.createElement("span", { "aria-label": "Search active", className: "tab-search-dot", style: { color: "var(--amber)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 11 })))))), (pullProgress > 0 || pullActive) && /* @__PURE__ */ React.createElement("div", { className: "ptr-indicator", style: {
      opacity: Math.max(pullProgress, pullActive ? 1 : 0)
    } }, /* @__PURE__ */ React.createElement("span", { className: "ptr-spinner" + (pullActive ? " ptr-spinner--on" : "") }, "\u21BB"), pullActive ? "Syncing\u2026" : "Pull down to sync"), /* @__PURE__ */ React.createElement(BottomNav, { tab, setTab, lowAlert: navLowAlert, onCompose: () => window.dispatchEvent(new CustomEvent("cf:quickadd")) }), /* @__PURE__ */ React.createElement(FeedbackToast, null), /* @__PURE__ */ React.createElement("main", { id: "main-content", tabIndex: -1, className: "cf-page content-area" }, /* @__PURE__ */ React.createElement("h1", { className: "cf-visually-hidden" }, viewName(tab, flowSub, planSub)), /* @__PURE__ */ React.createElement(NoticeStack, { notices: appNotices }), /* @__PURE__ */ React.createElement(ErrorBoundary, null, tab === "today" &&/* @__PURE__ */ React.createElement(
      DashboardView,
      {
        flow: activeFlow,
        openBal: activeOpenBal,
        yearFlows,
        // Every budget year, in whatever account view the page is in. Today's
        // "next 7 days" needs it: a week that starts in December ends in
        // January, and activeFlow is one year, so the January half was simply
        // not in the array to be found.
        viewFlows,
        yearConfigs: sortedConfigs,
        alertThreshold: alertThresh,
        activeYear,
        budgetTargets,
        categories,
        categoryColors,
        users: members,
        sessionUser,
        entries,
        // The drifted-bills panel compares each entry's amount against the
        // actuals recorded on its occurrences, which live here.
        overridesByYr,
        assets,
        applyDriftFix,
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
        assets,
        setAssets,
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
        setPlanSub,
        debtExtra,
        setDebtExtra,
        debtSimExcluded,
        setDebtSimExcluded
      }
    )), tab === "plan" && planSub === "insights" && /* @__PURE__ */ React.createElement(AIInsightsView, { flow: activeFlow, openBal: activeOpenBal, yearConfigs: sortedConfigs, budgetTargets, activeYear, categories, apiKey: aiApiKey, goals, debtData, isOffline, setTab }), tab === "help" && /* @__PURE__ */ React.createElement(HelpView, null), tab === "you" && /* @__PURE__ */ React.createElement(
      SettingsView,
      {
        youSub,
        setYouSub,
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
        setMemberRole,
        updateMemberName,
        leaveHousehold,
        removeMember,
        deleteMyAccount
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
        onDismiss: clearUndo
      }
    ), /* @__PURE__ */ React.createElement("footer", { className: "app-footer", "data-noprint": true }, /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement("span", { className: "footer-sep", "aria-hidden": "true" }, "|"),
    // The build number was in the Settings header and again at the foot of
    // Help. It is not a setting — it is the thing you read out when something
    // is wrong — so it belongs where the other every-page small print already
    // is, reachable from any view rather than from two particular ones.
    /* @__PURE__ */ React.createElement("span", { className: "build-version-tag" }, "Build ", APP_VERSION)))));
  }
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, null));
