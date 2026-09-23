import { genId, safeStorage, useCallback, useEffect, useMemo, useRef, useState } from "./lib/runtime.js";
import { todayStr } from "./lib/dates.js";
import { getBiometricCredId } from "./lib/biometric.js";
import { ACTIVITY_LIMIT, sbChangePassword, useHousehold, useHouseholdData, useHouseholdState, useMemberPrefs } from "./lib/household-sync.js";
import { APP_VERSION, CategoriesContext, DARK, HouseholdContext, LIGHT, LOGO_SRC, YEAR_COLORS, haptic, lowBalanceEpisodes, prefersReducedMotion, useLS, useRovingTabs, viewName } from "./lib/app-data.js";
import { aiProbeProxy } from "./lib/ai.js";
import { MobileYearBadge } from "./components/primitives.js";
import { AddEntryModal } from "./components/forms.js";
import { EntriesView } from "./components/entries.js";
import { AccountFilter, BottomNav, HouseholdOnboardingView, Icon, NoticeStack, SyncDivergenceModal } from "./components/misc-ui.js";
import { BudgetView } from "./components/budget.js";
import { AIInsightsView, ForecastView } from "./components/forecast-plan.js";
import { PlanView } from "./components/plan.js";
import { DashboardView } from "./components/dashboard.js";
import { HelpView } from "./components/help.js";
import { AlertsPanel, ErrorBoundary, SettingsView } from "./components/settings.js";
import { BudgetSubTabs, FeedbackToast, LockScreen, LoginView, PlanSubTabs, SelfTestView, UndoToast, toast } from "./components/auth-misc.js";
import { LOCK_KEY, useIdleLock } from "./app/use-idle-lock.js";
import { useRoute } from "./app/use-route.js";
import { useDialogFocus } from "./app/use-dialog-focus.js";
import { useOnlineStatus } from "./app/use-online-status.js";
import { usePullToRefresh } from "./app/use-pull-to-refresh.js";
import { useInstallPrompt } from "./app/use-install-prompt.js";
import { useFlows } from "./app/use-flows.js";
import { useKeyboardShortcuts } from "./app/use-keyboard-shortcuts.js";
import { useNotifications } from "./app/use-notifications.js";
import { useBackupNudge } from "./app/use-backup-nudge.js";
import { useThemeAndFormat } from "./app/use-theme-and-format.js";
import { useGlobalSearch } from "./app/use-global-search.js";
import { useUndoStack } from "./app/use-undo-stack.js";
import { useLowBalance } from "./app/use-low-balance.js";
import { useBudgetActions } from "./app/use-budget-actions.js";
import { useGoalRollovers } from "./app/use-goal-rollovers.js";
import { useAppNotices } from "./app/use-app-notices.js";
  export function App() {
    if (typeof location !== "undefined" && location.search.includes("selftest")) return <><SelfTestView /></>;
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
    const [budgetMonth, setBudgetMonth] = useLS("cf_budgetMonth", (new Date()).getMonth());
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
        at: (new Date()).toISOString(),
        by: sessionUser?.id || void 0,
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
      const me = (members || []).find((m) => m.user_id === sessionUser?.id);
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
      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
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
      return <><LoginView /></>;
    }
    if (membershipLoading) {
      return null;
    }
    if (!household) {
      return <>
        <HouseholdOnboardingView
          email={session.user.email}
          createHousehold={createHousehold}
          joinHousehold={joinHousehold}
          signOut={signOut}
        />
      </>;
    }
    if (locked) {
      return <>
        <LockScreen
          sessionUser={sessionUser}
          onUnlock={() => {
        safeStorage.set(LOCK_KEY, String(Date.now()), "session");
        setLocked(false);
      }}
          onSignOut={logout}
        />
      </>;
    }
    return <HouseholdContext.Provider value={householdCtx}>
      <CategoriesContext.Provider
        value={{ categories, categoryColors, chipSurface: (sessionUser && darkMode ? DARK : LIGHT).bgCard }}
      >
        <div className="app-scroll">
          <SyncDivergenceModal
            divergence={houseDivergence}
            onKeepLocal={keepLocalChanges}
            onUseCloud={discardLocalChanges}
          />
          <AddEntryModal
            show={showQuickAdd}
            onClose={() => setShowQuickAdd(false)}
            onSave={addEntry}
            categories={categories}
            apiKey={aiApiKey}
            isOffline={isOffline}
            templates={templates}
            setTemplates={setTemplates}
          />
          <a href="#main-content" className="skip-link" data-noprint={true}>Skip to content</a>
          <header className="tab-bar-outer" data-noprint={true}>
            <div className="header-inner">
              <div className="logo-area">
                <img src={LOGO_SRC} alt="CashFlow" className="header-logo-img" />
                {(tab === "flow" || tab === "envelopes" || tab === "plan") && <MobileYearBadge
                  year={activeYear}
                  years={sortedConfigs.map((yc) => yc.year)}
                  onSelect={setActiveYear}
                  inHeader={true}
                />}
                <div
                  className="year-pills"
                  role="group"
                  aria-label="Budget year"
                  onKeyDown={yearRoving.onKeyDown}
                >
                  {sortedConfigs.map((yc, i) => <div key={yc.year} className="cf-row">
                    <button
                      onClick={() => setActiveYear(yc.year)}
                      aria-pressed={activeYear === yc.year}
                      tabIndex={activeYear === yc.year ? 0 : -1}
                      aria-label={`Budget year ${yc.year}`}
                      className="cf-text-mono-13 year-pill-btn"
                      style={{
      background: activeYear === yc.year ? YEAR_COLORS[i % YEAR_COLORS.length] : "rgba(255,255,255,0.1)"
    }}
                    >
                      {yc.year}
                    </button>
                  </div>)}
                </div>
              </div>
              <div className="cf-row cf-gap-8 shrink-0">
                {isOffline && <div
                  className="offline-chip"
                  role="status"
                  title={houseUnsaved ? "You're offline. Changes are saved on this device and will sync when you reconnect." : "You're offline. Changes are saved on this device."}
                >
                  <span className="offline-chip-dot" aria-hidden="true" />
                  <span className="offline-chip-text">Offline</span>
                  {houseUnsaved && <span className="offline-chip-more">— changes pending</span>}
                </div>}
                <div className="header-search">
                  <Icon name="search" size={14} className="header-search-icon" />
                  <input
                    id="global-search"
                    // Names its scope rather than leaving the magnifier to imply one. What
                    // it searches depends on where you are: Plan and Entries filter in
                    // place, everything else lands on the Budget month that matches.
                    aria-label={searchScopeLabel}
                    placeholder={searchScopeLabel}
                    title={searchScopeLabel}
                    autoComplete="off"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="header-search-input"
                  />
                  {globalSearch && <button
                    aria-label="Clear search"
                    onClick={() => setGlobalSearch("")}
                    className="header-search-clear"
                  >
                    ✕
                  </button>}
                </div>
                {(() => {
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
      return <button
        aria-label={label}
        onClick={() => setTab((prev) => prev === "alerts" ? "today" : "alerts")}
        title={label}
        className="alert-bell-btn"
        style={{
            background: tab === "alerts" ? "rgba(255,255,255,0.15)" : "transparent",
            borderColor: color,
            color
          }}
      >
        <Icon name="bell" size={17} />
        <span className="alert-bell-badge" style={{ background: color }}>{count > 9 ? "9+" : count}</span>
      </button>;
    })()}
                {(() => {
      const initials = (sessionUser?.fullName || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      return <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="User menu"
          aria-expanded={menuOpen}
          title={`Signed in as ${sessionUser?.fullName || ""}`}
          className="user-avatar-btn"
          // Settings, Alerts and Help are reached from this menu rather than
          // from the tab bar, so while you are in one of them the bar shows
          // nothing selected. The avatar is where they live; it is what
          // should look current.
          data-here={tab === "you" || tab === "alerts" || tab === "help" ? "1" : void 0}
          style={{ background: menuOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" }}
        >
          {initials}
        </button>
        {menuOpen && <>
          <div onClick={() => setMenuOpen(false)} className="user-menu-backdrop" />
          <div className="user-menu-panel">
            <div className="user-menu-header">
              <div className="user-menu-name">
                {sessionUser?.fullName || ""}
              </div>
              <div className="user-menu-email">
                {sessionUser?.email || ""}
              </div>
            </div>
            {[
        { label: "Settings", icon: "settings", action: () => {
          setMenuOpen(false);
          setTab("you");
        } },
        { label: "Edit Profile", icon: "user", action: () => {
          setPf({ fullName: sessionUser?.fullName || "", email: sessionUser?.email || "" });
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
      ].map((item) => <button
        key={item.label}
        onClick={item.action}
        className="cf-menu-item cf-menu-item--bordered"
      >
        <Icon name={item.icon} size={16} />
        {item.label}
      </button>)}
            <button
              onClick={() => {
            setMenuOpen(false);
            logout();
          }}
              aria-label="Sign out"
              className="cf-menu-item cf-menu-item--danger"
            >
              <Icon name="log-out" size={16} />
              Sign out
            </button>
          </div>
        </>}
        {profileForm === "profile" && <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
        >
          <div className="modal-card profile-modal-card">
            <div className="cf-modal-title">Edit Profile</div>
            {[{ label: "Full Name", key: "fullName", type: "text" }].map(({ label, key, type }) => <div
              key={key}
              className="mb-14"
            >
              <label className="field-label" htmlFor={"pf-" + key}>{label}</label>
              <input
                id={"pf-" + key}
                type={type}
                className="field-input"
                value={pf[key]}
                onChange={(e) => setPf((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>)}
            <div className="form-note-text">
              {"Email: "}
              {sessionUser?.email}
              {" (sign-in email can't be changed here)"}
            </div>
            {pfErr && <div role="alert" className="form-err-text">{pfErr}</div>}
            {pfOk && <div role="status" className="form-ok-text">{pfOk}</div>}
            <div className="cf-row cf-gap-10 justify-end mt-6">
              <button onClick={() => setProfileForm(null)} className="cf-btn cf-btn--secondary">
                Cancel
              </button>
              <button
                onClick={async () => {
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
      }}
                className="cf-btn cf-btn--primary fw-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>}
        {profileForm === "password" && <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Change password"
        >
          <div className="modal-card profile-modal-card">
            <div className="cf-modal-title">Change Password</div>
            {[
        { label: "Current password", key: "current", val: pwf.current },
        { label: "New password (min 8 chars)", key: "next", val: pwf.next },
        { label: "Confirm new password", key: "confirm", val: pwf.confirm }
      ].map(({ label, key, val }) => <div key={key} className="mb-14">
        <label className="field-label" htmlFor={"pwf-" + key}>{label}</label>
        <input
          id={"pwf-" + key}
          type="password"
          autoComplete={key === "current" ? "current-password" : "new-password"}
          className="field-input"
          value={val}
          onChange={(e) => setPwf((p) => ({ ...p, [key]: e.target.value }))}
        />
      </div>)}
            {pfErr && <div role="alert" className="form-err-text">{pfErr}</div>}
            {pfOk && <div role="status" className="form-ok-text">{pfOk}</div>}
            <div className="cf-row cf-gap-10 justify-end mt-6">
              <button onClick={() => setProfileForm(null)} className="cf-btn cf-btn--secondary">
                Cancel
              </button>
              <button
                onClick={async () => {
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
      }}
                className="cf-btn cf-btn--primary fw-700"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>}
      </div>;
    })()}
              </div>
            </div>
            <nav className="cf-page tab-bar" aria-label="Primary" data-noprint={true}>
              {tabs.map((t) => <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : void 0}
                className="tab-bar-btn"
                style={{
      borderBottom: tab === t.id ? "3px solid var(--amber)" : "3px solid transparent",
      color: tab === t.id ? "#fff" : "rgba(255,255,255,0.55)"
    }}
              >
                {t.label}
                {t.id === "today" && activeFlow.filter((ev) => {
      const today = new Date();
      const n = new Date(today);
      n.setDate(today.getDate() + 30);
      return ev.date >= today && ev.date <= n && ev.balance < alertThresh;
    }).length > 0 && <span className="tab-alert-dot" style={{ background: "var(--red)" }}>!</span>}
                {t.id === "flow" && globalSearch && <span
                  aria-label="Search active"
                  className="tab-search-dot"
                  style={{ color: "var(--amber)" }}
                >
                  <Icon name="search" size={11} />
                </span>}
              </button>)}
            </nav>
          </header>
          {(pullProgress > 0 || pullActive) && <div
            className="ptr-indicator"
            style={{
      opacity: Math.max(pullProgress, pullActive ? 1 : 0)
    }}
          >
            <span className={"ptr-spinner" + (pullActive ? " ptr-spinner--on" : "")}>↻</span>
            {pullActive ? "Syncing\u2026" : "Pull down to sync"}
          </div>}
          <BottomNav
            tab={tab}
            setTab={setTab}
            lowAlert={navLowAlert}
            onCompose={() => window.dispatchEvent(new CustomEvent("cf:quickadd"))}
          />
          <FeedbackToast />
          <main id="main-content" tabIndex={-1} className="cf-page content-area">
            <h1 className="cf-visually-hidden">{viewName(tab, flowSub, planSub)}</h1>
            <NoticeStack notices={appNotices} />
            <ErrorBoundary>
              {tab === "today" &&<DashboardView
                flow={activeFlow}
                openBal={activeOpenBal}
                yearFlows={yearFlows}
                // Every budget year, in whatever account view the page is in. Today's
                // "next 7 days" needs it: a week that starts in December ends in
                // January, and activeFlow is one year, so the January half was simply
                // not in the array to be found.
                viewFlows={viewFlows}
                yearConfigs={sortedConfigs}
                alertThreshold={alertThresh}
                activeYear={activeYear}
                budgetTargets={budgetTargets}
                categories={categories}
                categoryColors={categoryColors}
                users={members}
                sessionUser={sessionUser}
                entries={entries}
                // The drifted-bills panel compares each entry's amount against the
                // actuals recorded on its occurrences, which live here.
                overridesByYr={overridesByYr}
                assets={assets}
                applyDriftFix={applyDriftFix}
                setYearConfigs={setYearConfigs}
                addEntry={addEntry}
                setTab={setTab}
                setEntries={setEntries}
                completed={completed}
                toggleComplete={toggleComplete}
                dashHidden={dashHidden}
                setDashHidden={setDashHidden}
                dashOrder={dashOrder}
                setDashOrder={setDashOrder}
                debtData={debtData}
                apiKey={aiApiKey}
                isOffline={isOffline}
              />}
              {(tab === "flow" || tab === "envelopes") && <>
                {tab === "flow" && <BudgetSubTabs value={flowSub} onChange={setFlowSub} />}
                <AccountFilter accounts={accounts} value={activeAccount} onChange={setAccountFilter} />
                {(tab === "envelopes" || flowSub === "list" || flowSub === "calendar") && <BudgetView
                  flow={activeFlow}
                  prevYearFlow={prevYearFlow}
                  prevYearConfigured={prevYearConfigured}
                  openBal={activeOpenBal}
                  entries={entries}
                  setOverride={setOverride}
                  clearOverride={clearOverride}
                  categories={categories}
                  categoryColors={categoryColors}
                  setEntries={setEntries}
                  saveEntryEdit={saveEntryEdit}
                  addEntry={addEntry}
                  pushUndo={pushUndo}
                  apiKey={aiApiKey}
                  isOffline={isOffline}
                  flowSub={flowSub}
                  setFlowSub={setFlowSub}
                  showEnvelopes={tab === "envelopes"}
                  monthIdx={budgetMonth}
                  setMonthIdx={setBudgetMonth}
                  alertThreshold={alertThresh}
                  globalSearch={globalSearch}
                  templates={templates}
                  setTemplates={setTemplates}
                  budgetTargets={budgetTargets}
                  setBudgetTargets={setBudgetTargets}
                  completed={completed}
                  toggleComplete={toggleComplete}
                  markOccurrencesPaid={markOccurrencesPaid}
                  activeYear={activeYear}
                  budgetColOrder={budgetColOrder}
                  setBudgetColOrder={setBudgetColOrder}
                  onDeleted={(e) => pushUndoEntryDelete(e)}
                  onAddNextYear={activeYear === latestYear ? addNextYearInline : null}
                  skippedOccurrences={skippedOccurrences}
                />}
                {tab === "flow" && flowSub === "curve" && <ForecastView
                  apiKey={aiApiKey}
                  isOffline={isOffline}
                  yearFlows={yearFlows}
                  yearConfigs={sortedConfigs}
                  openBalByYear={activeOpenBal}
                  alertThreshold={alertThresh}
                  globalSearch={globalSearch}
                  budgetTargets={budgetTargets}
                  horizon={forecastHorizon}
                  setHorizon={setForecastHorizon}
                  categories={categories}
                  categoryColors={categoryColors}
                  addEntry={addEntry}
                  templates={templates}
                  setTemplates={setTemplates}
                  completed={completed}
                  toggleComplete={toggleComplete}
                  entries={entries}
                  scenarioOn={scenarioOn}
                  setScenarioOn={setScenarioOn}
                  scenarioAdj={scenarioAdj}
                  setScenarioAdj={setScenarioAdj}
                  scenarioFlows={scenarioFlows}
                />}
                {tab === "flow" && flowSub === "entries" && <EntriesView
                  entries={entries}
                  setEntries={setEntries}
                  saveEntryEdit={saveEntryEdit}
                  addEntry={addEntry}
                  categories={categories}
                  categoryColors={categoryColors}
                  activeYear={activeYear}
                  apiKey={aiApiKey}
                  isOffline={isOffline}
                  onDeleted={(e) => pushUndoEntryDelete(e)}
                  templates={templates}
                  setTemplates={setTemplates}
                  globalSearch={globalSearch}
                  setGlobalSearch={setGlobalSearch}
                  pushUndo={pushUndo}
                  // Declared as a prop here since the view was written, but never
                  // actually passed — which is why CSV import could only compare a
                  // statement row against one-time entries.
                  allYearFlows={yearFlows}
                  colOrder={colOrder}
                  setColOrder={setColOrder}
                  filter={entriesFilter}
                  setFilter={setEntriesFilter}
                  filterCats={entriesFilterCats}
                  setFilterCats={setEntriesFilterCats}
                  filterScheds={entriesFilterScheds}
                  setFilterScheds={setEntriesFilterScheds}
                  filterStatus={entriesFilterStatus}
                  setFilterStatus={setEntriesFilterStatus}
                />}
              </>}
              {tab === "alerts" && <AlertsPanel
                flow={activeFlow}
                alertThreshold={alertThresh}
                setTab={setTab}
                findings={appFindings}
                gotoForecast={() => {
      setTab("flow");
      setFlowSub("curve");
    }}
              />}
              {tab === "plan" && <>
                <PlanSubTabs value={planSub} onChange={setPlanSub} />
                <PlanView
                  flow={activeFlow}
                  openBal={activeOpenBal}
                  entries={entries}
                  setEntries={setEntries}
                  assets={assets}
                  setAssets={setAssets}
                  goals={goals}
                  setGoals={setGoals}
                  categories={categories}
                  alertThreshold={alertThresh}
                  activeYear={activeYear}
                  debtData={debtData}
                  setDebtData={setDebtData}
                  globalSearch={globalSearch}
                  yearConfigs={sortedConfigs}
                  setActiveYear={setActiveYear}
                  setDeletedCopyIds={setDeletedCopyIds}
                  planSub={planSub}
                  setPlanSub={setPlanSub}
                  debtExtra={debtExtra}
                  setDebtExtra={setDebtExtra}
                  debtSimExcluded={debtSimExcluded}
                  setDebtSimExcluded={setDebtSimExcluded}
                />
              </>}
              {tab === "plan" && planSub === "insights" && <AIInsightsView
                flow={activeFlow}
                openBal={activeOpenBal}
                yearConfigs={sortedConfigs}
                budgetTargets={budgetTargets}
                activeYear={activeYear}
                categories={categories}
                apiKey={aiApiKey}
                goals={goals}
                debtData={debtData}
                isOffline={isOffline}
                setTab={setTab}
              />}
              {tab === "help" && <HelpView />}
              {tab === "you" && <SettingsView
                youSub={youSub}
                setYouSub={setYouSub}
                categories={categories}
                activity={activity}
                accounts={accounts}
                setAccounts={setAccounts}
                holidays={holidays}
                setHolidays={setHolidays}
                isOffline={isOffline}
                houseValues={houseValues}
                houseSetters={houseSetters}
                pushUndo={pushUndo}
                currency={currency}
                setCurrency={setCurrency}
                locale={locale}
                setLocale={setLocale}
                holidayRegionCode={holidayRegionCode}
                setHolidayRegionCode={setHolidayRegionCode}
                setCategories={setCategories}
                categoryColors={categoryColors}
                setCategoryColors={setCategoryColors}
                alertThreshold={alertThresh}
                setAlertThreshold={setAlertThresh}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                notifyEnabled={notifyEnabled}
                setNotifyEnabled={setNotifyEnabled}
                enableNotifications={enableNotifications}
                disableNotifications={disableNotifications}
                notifPerm={notifPerm}
                notifyHour={notifyHour}
                setNotifyHour={setNotifyHour}
                pushState={pushState}
                yearConfigs={yearConfigs}
                setYearConfigs={setYearConfigs}
                activeYear={activeYear}
                setActiveYear={setActiveYear}
                overridesByYr={overridesByYr}
                setOverridesByYr={setOverridesByYr}
                entries={entries}
                setEntries={setEntries}
                completed={completed}
                setCompleted={setCompleted}
                goals={goals}
                setGoals={setGoals}
                debtData={debtData}
                setDebtData={setDebtData}
                deletedCopyIds={deletedCopyIds}
                setDeletedCopyIds={setDeletedCopyIds}
                installPrompt={installPrompt}
                triggerInstall={doInstall}
                lockTimeout={lockTimeout}
                setLockTimeout={setLockTimeout}
                templates={templates}
                setTemplates={setTemplates}
                activeFlow={activeFlow}
                budgetTargets={budgetTargets}
                setBudgetTargets={setBudgetTargets}
                sessionUser={sessionUser}
                logout={logout}
                aiApiKey={aiApiKey}
                setAiApiKey={setAiApiKey}
                sbConfigured={sbConfigured}
                houseStatus={houseStatus}
                houseMsg={houseMsg}
                houseUnsaved={houseUnsaved}
                houseSave={houseSave}
                houseLoad={houseLoad}
                household={household}
                members={members}
                createInvite={createInvite}
                setMemberDisabled={setMemberDisabled}
                setMemberRole={setMemberRole}
                updateMemberName={updateMemberName}
                leaveHousehold={leaveHousehold}
                removeMember={removeMember}
                deleteMyAccount={deleteMyAccount}
              />}
            </ErrorBoundary>
          </main>
          {undoStack.length > 0 && <UndoToast
            label={undoStack[undoStack.length - 1].label}
            count={undoStack.length}
            onUndo={() => {
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
        }}
            onDismiss={clearUndo}
          />}
          <footer className="app-footer" data-noprint={true}>
            <a href="privacy.html" className="cf-footer-link">Privacy</a>
            <span className="footer-sep" aria-hidden="true">|</span>
            <a href="terms.html" className="cf-footer-link">Terms of Use</a>
            <span className="footer-sep" aria-hidden="true">|</span>
            {// The build number was in the Settings header and again at the foot of
    // Help. It is not a setting — it is the thing you read out when something
    // is wrong — so it belongs where the other every-page small print already
    // is, reachable from any view rather than from two particular ones.
    <span className="build-version-tag">{"Build "}{APP_VERSION}</span>
}
          </footer>
        </div>
      </CategoriesContext.Provider>
    </HouseholdContext.Provider>;
  }
  export const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(<App />);
