  const CategoriesContext = createContext({ categories: [], categoryColors: {} });
  // Who is in the household, and which one is looking. Read by anything that
  // wants to attribute a change to a person — an entry's author, an
  // occurrence override's — without four layers of prop drilling to reach it.
  // Empty in the signed-out and single-member cases, which is what makes
  // memberName() return "" and every consumer render nothing.
  // `logActivity(kind, what)` rides along here rather than being threaded
  // through props: the mutations worth logging are spread across Budget, Plan
  // and Settings, and prop-drilling a recorder into all three is how half of
  // them end up not calling it. The default is a no-op so a component rendered
  // outside a provider (the self-test harness, a screenshot run) still works.
  const HouseholdContext = createContext({ members: [], sessionUser: null, accounts: [], logActivity: () => {
  } });
  const { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } = Recharts;
  const LOGO_SRC = "data:image/png;base64,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";
  const DEFAULT_ALERT_THRESHOLD = 150000;
  const APP_VERSION = CF_VERSION;
  let _lastStorageErrorToastAt = 0;
  function notifyStorageWriteFailure(err) {
    const now = Date.now();
    if (now - _lastStorageErrorToastAt < 5e3) return;
    _lastStorageErrorToastAt = now;
    const isQuota = err && (err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014 || /quota/i.test(err.message || ""));
    toast(
      isQuota ? "Couldn't save \u2014 your browser's storage is full. Export a backup, then clear old data (Settings \u2192 Data Backup & Restore)." : "Couldn't save your changes. Please try again, or export a backup from Settings.",
      "error"
    );
  }
  function useLS(key, init) {
    const [val, setVal] = useState(() => {
      try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : typeof init === "function" ? init() : init;
      } catch (e) {
        return typeof init === "function" ? init() : init;
      }
    });
    const set = useCallback((v) => {
      setVal((prev) => {
        const next = typeof v === "function" ? v(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch (err) {
          notifyStorageWriteFailure(err);
        }
        return next;
      });
    }, [key]);
    return [val, set];
  }
  function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
      try {
        return window.matchMedia(query).matches;
      } catch (e) {
        return false;
      }
    });
    useEffect(() => {
      let mq;
      try {
        mq = window.matchMedia(query);
      } catch (e) {
        return;
      }
      const onChange = () => setMatches(mq.matches);
      onChange();
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else mq.addListener(onChange);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", onChange);
        else mq.removeListener(onChange);
      };
    }, [query]);
    return matches;
  }
  const useIsMobile = () => useMediaQuery("(max-width: 768px)");
  const useIsPhone = () => useMediaQuery("(max-width: 480px)");
  const useIsCoarsePointer = () => useMediaQuery("(pointer: coarse)");
  // Text colours here are pinned to WCAG AA (4.5:1) against the surfaces they
  // actually render on — an audit found 295 failing nodes concentrated in a
  // handful of these tokens. greenDk/red/textLt are deliberately darker than
  // the original brand values (#27AE73 / #E85D4A / #66798C, which measured
  // 2.84, 3.11 and 4.09) because they're used for small text on white and on
  // the pale tints. If you brighten them back, re-run the contrast audit.
  const LIGHT = {
    // Deep pine carries the chrome and every interactive fill. It replaces the
    // brand navy: the palette's whole job here is that colour means state, so
    // the one non-state colour has to be unmistakably "the app", not "a number".
    navy: "#14413A",
    navyMid: "#1A5049",
    navyLt: "#226059",
    // A cool ledger green-grey rather than the old warm cream — it is the
    // paper the ink sits on, and it keeps the state colours honest.
    bg: "#F5F7F4",
    bgCard: "#FFFFFF",
    green: "#2C7657",
    greenDk: "#1F6B4C",
    greenLt: "#E7F3EC",
    red: "#B3372B",
    redLt: "#FBEBE8",
    amber: "#C98A2E",
    amberInk: "#8A5714",
    amberLt: "#FBF1E1",
    text: "#131A17",
    textMid: "#4E5B54",
    textLt: "#5C6862",
    border: "#DDE3DE",
    // `stripe` used to be byte-identical to `bg`, which made inactive sub-tab
    // pills invisible in light mode (mobile audit §4.2). It is its own tone now.
    stripe: "#EDF1EC",
    pastBg: "#EDF0EB",
    headerBg: "#14413A",
    headerText: "#F2F6F2",
    inputBg: "#F5F7F4",
    doneBg: "#E7F3EC",
    // A ledger is ruled, not stacked — the elevation comes from hairlines, so
    // the shadows are barely there and exist only to lift genuine overlays.
    shadowSm: "0 1px 2px rgba(10,20,16,0.04)",
    shadowMd: "0 2px 6px rgba(10,20,16,0.06)",
    shadowLg: "0 6px 24px rgba(10,20,16,0.10)",
    shadowXl: "0 18px 48px rgba(10,20,16,0.16)",
    // Transfers are the only thing this blue marks. It is a state, like the
    // others, not a general-purpose accent.
    accent: "#31607F",
    accentLt: "#E9EFF5",
    chipKeep: "100%",
    primary: "#14413A",
    primaryInk: "#14413A",
    coral: "#FF9B8C"
  };
  const DARK = {
    navy: "#0A1210",
    navyMid: "#121A17",
    navyLt: "#1E2B27",
    bg: "#0E1412",
    bgCard: "#161E1B",
    green: "#4FB183",
    greenDk: "#4FB183",
    greenLt: "#12271E",
    red: "#E07767",
    redLt: "#2B1512",
    amber: "#D2963F",
    amberInk: "#D2963F",
    amberLt: "#2A1F0F",
    text: "#E4EBE6",
    textMid: "#9AA9A1",
    textLt: "#8A968F",
    border: "#26312D",
    stripe: "#1D2622",
    pastBg: "#131A17",
    headerBg: "#0A1210",
    headerText: "#F2F6F2",
    inputBg: "#121A17",
    doneBg: "#12271E",
    shadowSm: "0 1px 2px rgba(0,0,0,0.35)",
    shadowMd: "0 2px 6px rgba(0,0,0,0.45)",
    shadowLg: "0 6px 24px rgba(0,0,0,0.5)",
    shadowXl: "0 18px 48px rgba(0,0,0,0.6)",
    accent: "#7FA8CB",
    accentLt: "#17232B",
    chipKeep: "60%",
    // --primary paints (fills, borders, icons — 3:1 under 1.4.11);
    // --primaryInk colours text, which needs the full 4.5:1.
    primary: "#3E8C7C",
    primaryInk: "#78B7A6",
    coral: "#FF9B8C"
  };
  // Contrast utilities (WCAG 2.1 relative luminance / ratio). Used to keep
  // category chips readable: a chip's text is its category hue drawn on a 13%
  // tint of that same hue, which for mid-tone hues (olive, orange, pink) lands
  // around 3:1 — well under AA. A fixed "mix toward white by N%" can't fix
  // that, because the right amount depends on the hue and on whether the
  // surface underneath is light or dark. So compute it per hue instead, which
  // also covers the arbitrary colours users pick for their own categories.
  const _srgbToLin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    return Number.isFinite(n) && full.length === 6
      ? [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      : [0, 0, 0];
  }
  const rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  function relLuminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => _srgbToLin(v / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrastRatio(a, b) {
    const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  // Nudge `hue` toward black or white (whichever direction the surface calls
  // for) until it clears `target` against `bg`. Returns the hue unchanged when
  // it already passes, so brand colours that are fine stay exactly as chosen.
  function readableInk(hue, bg, target = 4.5) {
    if (contrastRatio(hue, bg) >= target) return hue;
    const [r, g, b] = hexToRgb(hue);
    const towardWhite = relLuminance(bg) < 0.18;
    for (let k = 1; k <= 100; k++) {
      const t = k / 100;
      const c = towardWhite
        ? rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
        : rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
      if (contrastRatio(c, bg) >= target) return c;
    }
    return towardWhite ? "#FFFFFF" : "#000000";
  }
  // Category identity is a dot beside the name, not text on a tint, so what
  // has to be legible is a solid fill rather than a hue on its own 13% wash.
  // 3:1 is the non-text threshold (WCAG 1.4.11); the name beside it carries
  // the meaning at full text contrast, so the dot only has to be *visible* —
  // a pale olive or yellow at 1.4:1 on white was a dot you couldn't find.
  //
  // Cached per (hue, surface), and the surface is passed in rather than read
  // from module state: a module variable can't trigger a React re-render, so
  // dots drawn before a theme switch would keep ink computed for the old one.
  // It arrives through CategoriesContext, which re-renders every one of them.
  const _chipDotCache = /* @__PURE__ */ new Map();
  function chipDot(hue, surface) {
    const surf = surface || "#FFFFFF";
    const key = hue + "|" + surf;
    let v = _chipDotCache.get(key);
    if (v === void 0) {
      v = readableInk(hue, surf, 3);
      _chipDotCache.set(key, v);
    }
    return v;
  }
  const YEAR_COLORS = ["#2F5496", "#E85D4A", "#27AE73", "#F5A623", "#8E44AD", "#16A085"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function compressReceiptImage(file, cb) {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      const b64 = cv.toDataURL("image/jpeg", 0.6);
      URL.revokeObjectURL(img.src);
      if (b64.length > 3e5) {
        toast("Image too large even after compression \u2014 try a smaller photo.", "error");
        cb(null);
        return;
      }
      cb(b64);
    };
    img.onerror = () => {
      // Revoke on both paths — this was the one createObjectURL in the app
      // with no matching revoke, so every rejected photo leaked its blob for
      // the life of the page.
      URL.revokeObjectURL(img.src);
      toast("Could not read that image \u2014 try a different photo.", "error");
      cb(null);
    };
    img.src = URL.createObjectURL(file);
  }
  // Receipts are strictly per-occurrence. Legacy data (old backups, old
  // localStorage) may still carry an entry-level `attachment`; this moves each
  // one onto the entry's start-date occurrence so the image survives.
  function moveEntryAttachmentsToOverrides(entries, overridesByYr) {
    let moved = 0;
    const ovs = {};
    Object.keys(overridesByYr || {}).forEach((y) => {
      ovs[y] = __spreadValues({}, overridesByYr[y] || {});
    });
    const cleaned = (entries || []).map((e) => {
      if (!e || !e.attachment) return e;
      const d = parseDate(e.startDate);
      if (!d || isNaN(d)) return e;
      const year = d.getFullYear();
      const occId = `${e.id}-${year}-${d.getMonth()}-${d.getDate()}`;
      ovs[year] = ovs[year] || {};
      const existing = ovs[year][occId] || {};
      if (existing.attachment === void 0) {
        ovs[year][occId] = __spreadProps(__spreadValues({}, existing), { attachment: e.attachment });
      }
      moved++;
      const copy = __spreadValues({}, e);
      delete copy.attachment;
      return copy;
    });
    return { entries: cleaned, overridesByYr: ovs, moved };
  }
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DEFAULT_CATEGORIES = [
    "Income",
    "Housing",
    "Insurance",
    "Transportation",
    "Food",
    "Utilities",
    "Subscriptions",
    "Debt / Credit",
    "Savings / RRSP",
    "Medical",
    "Education",
    "Personal",
    "Farm / Animals",
    "Gifts / Events",
    "Other"
  ];
  // Validated categorical palette (OKLab lightness band, chroma floor, adjacent
  // CVD separation, 3:1 contrast on white — all pass). The old set had three
  // near-identical greens and two colors that read as gray. Hue families kept.
  const DEFAULT_CATEGORY_COLORS = {
    "Income": "#217F4C",
    "Housing": "#2F6FB8",
    "Insurance": "#5E70C4",
    "Transportation": "#C06722",
    "Food": "#6B8E23",
    "Utilities": "#0E9483",
    "Subscriptions": "#7E3FBF",
    "Debt / Credit": "#B03A30",
    "Savings / RRSP": "#1189B5",
    "Medical": "#A8309F",
    "Education": "#4348B8",
    "Personal": "#C22F6E",
    "Farm / Animals": "#96551C",
    "Gifts / Events": "#8E4585",
    "Other": "#8F8A26"
  };
  const DEFAULT_ENTRIES_COLS = ["desc", "type", "amount", "startDate", "schedule", "until", "category", "notes"];
  const DEFAULT_BUDGET_COLS = ["desc", "category", "income", "expense", "balance"];
  const BUDGET_COL_LABELS = { desc: "Description", category: "Category", income: "Income", expense: "Expense", balance: "Balance" };
  const ENTRIES_COL_LABELS = {
    desc: "Description",
    type: "Type",
    amount: "Amount",
    startDate: "Date",
    schedule: "Schedule",
    until: "Until",
    category: "Category",
    notes: "Notes",
    actions: ""
  };
  // ── Destinations ────────────────────────────────────────────────────────
  // Four places you go, one action you take, and everything about *you* behind
  // the avatar. The five Budget sub-views became four lenses over one timeline
  // (see ROUTE_FLOW_SUBS): they are lenses rather than tabs because the month,
  // the account, the filters and the search all survive a switch between them,
  // which four separate tabs could never do.
  const ROUTE_TABS = ["today", "flow", "envelopes", "plan", "you", "alerts", "help"];
  // "daily" is still accepted so an old bookmark or a remembered sub-tab
  // resolves rather than silently falling back to Monthly; BudgetView forwards
  // it to calendar, the view that replaced it.
  const ROUTE_FLOW_SUBS = ["list", "calendar", "curve", "entries"];
  const ROUTE_PLAN_SUBS = ["goals", "strategy", "debt", "insights"];
  // Every route the app has ever published, pointed at where it lives now.
  // Bookmarks, shared links and home-screen shortcuts outlive an information
  // architecture, and a link that silently lands on the home screen is worse
  // than one that errors — you cannot tell it went wrong.
  const LEGACY_ROUTES = {
    "dashboard": "today",
    "budget": "flow/list",
    "budget/monthly": "flow/list",
    "budget/daily": "flow/list",
    "budget/calendar": "flow/calendar",
    "budget/forecast": "flow/curve",
    "budget/entries": "flow/entries",
    "budget/bva": "envelopes",
    "ai": "plan/insights",
    "settings": "you"
  };
  // The per-device sub-tab memory predates the lenses, so a device that last
  // sat on "monthly" has to be told where that went — otherwise it falls back
  // to the default and quietly loses the view the user left open.
  const LEGACY_FLOW_SUBS = { monthly: "list", daily: "list", forecast: "curve", bva: "list", calendar: "calendar", entries: "entries" };
  // The name of a view, in one place. Two things read it: the visually-hidden
  // <h1> at the top of <main>, so a screen-reader user navigating by heading
  // can tell which of the twelve destinations they landed on; and
  // document.title, so browser history, bookmarks and the tab strip say
  // something other than "CashFlow Budget" twelve times over.
  //
  // The strings are the ones already on the nav buttons and sub-tab pills —
  // a heading that renamed the view it names would be worse than none.
  const APP_NAME = "CashFlow Budget";
  const VIEW_NAMES = {
    today: "Today",
    envelopes: "Envelopes",
    you: "You",
    alerts: "Alerts",
    help: "Help",
    "flow/list": "Flow \u00b7 List",
    "flow/calendar": "Flow \u00b7 Calendar",
    "flow/curve": "Flow \u00b7 Curve",
    "flow/entries": "Flow \u00b7 Entries",
    "plan/debt": "Plan \u00b7 Debts",
    "plan/strategy": "Plan \u00b7 Payoff",
    "plan/goals": "Plan \u00b7 Goals",
    "plan/insights": "Plan \u00b7 Insights"
  };
  function viewName(tab, flowSub, planSub) {
    const sub = tab === "flow" ? flowSub : tab === "plan" ? planSub : null;
    return VIEW_NAMES[sub ? `${tab}/${sub}` : tab] || VIEW_NAMES.today;
  }
  function viewDocTitle(tab, flowSub, planSub) {
    return `${viewName(tab, flowSub, planSub)} \u2014 ${APP_NAME}`;
  }
  // How each kind of logged change is labelled in the Activity list. The kind
  // is stored rather than the label so the wording can be changed without
  // rewriting history.
  // ── Accounts ────────────────────────────────────────────────────────────
  // A household's money lives in more than one place: a chequing account, a
  // savings account, a credit card. Every entry belongs to one of them, and a
  // transfer moves money from one to another — which is what finally gives the
  // transfer type something coherent to mean.
  //
  // Every household has at least one. A household that predates accounts gets
  // exactly one, holding everything it already had, so nothing it can see
  // changes until it adds a second (see migrateHouseholdPayload).
  // DEFAULT_ACCOUNT_ID/_NAME live in migrate.js, which is where the guarantee
  // that every household has exactly one account is enforced — and which has
  // to be readable on its own, without the rest of the bundle, by
  // tests/payload-migration.mjs.
  // What an account is, which decides only how it is described and sorted —
  // never how its balance is computed. A credit card is an ordinary account
  // whose balance is usually below zero; treating it as a special negative
  // thing would mean two arithmetics in an app that has carefully kept one.
  const ACCOUNT_KINDS = [
    { id: "chequing", label: "Chequing" },
    { id: "savings", label: "Savings" },
    { id: "credit", label: "Credit card" },
    { id: "cash", label: "Cash" },
    { id: "other", label: "Other" }
  ];
  const accountById = (accounts, id) => (accounts || []).find((a) => a.id === id) || null;
  const accountName = (accounts, id) => {
    const a = accountById(accounts, id);
    return a ? a.name : id === DEFAULT_ACCOUNT_ID ? DEFAULT_ACCOUNT_NAME : "Unknown account";
  };
  // accountIdOf and isInterAccountTransfer live in dates.js: expandEntries
  // needs them, and dates.js is evaluated on its own by tests/year-copy.mjs.
  // How the year's opening balance is split between accounts.
  //
  // There is one editable total — the budget year's opening balance, in
  // Settings, exactly where it has always been — and each account beyond the
  // first says how much of it is sitting there. The first account takes the
  // remainder, so the shares always sum to the total and there is nothing to
  // reconcile. Saying "my savings account opened the year with $10,000" moves
  // $10,000 of the household's opening balance into savings; it does not
  // conjure $10,000, which is what a second independently-editable total
  // would have done.
  //
  // A household with one account never sees any of this: its single account
  // holds the whole opening balance and there is nothing to fill in.
  function accountOpenings(accounts, combinedOpening) {
    const list = Array.isArray(accounts) && accounts.length ? accounts : [{ id: DEFAULT_ACCOUNT_ID }];
    const out = {};
    let allocated = 0;
    list.slice(1).forEach((a) => {
      const v = Number.isFinite(a.opening) ? a.opening : 0;
      out[a.id] = v;
      allocated += v;
    });
    out[list[0].id] = roundMoney((Number(combinedOpening) || 0) - allocated);
    return out;
  }
  const ACTIVITY_LABELS = {
    entry: "Entry",
    override: "Date",
    target: "Target",
    goal: "Goal",
    debt: "Debt",
    year: "Year",
    account: "Account"
  };
  function parseTabHash() {
    let raw = "";
    try {
      raw = (location.hash || "").replace(/^#\/?/, "");
    } catch (e) {
      // A malformed or inaccessible hash just means no deep link; the
      // default view is correct.
    }
    // Retired routes are rewritten before anything is read out of them, so a
    // three-year-old bookmark lands where the view actually is.
    const mapped = LEGACY_ROUTES[raw] || LEGACY_ROUTES[raw.split("/")[0]];
    // `redirected` matters to the caller: a hash that already names its view
    // must not be re-pushed (that is what the hash-sync guard is for), but one
    // the table rewrote *has* to be, or the address bar keeps showing a route
    // the app no longer has.
    if (mapped) raw = mapped;
    const [t, s] = raw.split("/");
    return {
      tab: ROUTE_TABS.includes(t) ? t : null,
      flowSub: ROUTE_FLOW_SUBS.includes(s) ? s : null,
      planSub: ROUTE_PLAN_SUBS.includes(s) ? s : null,
      redirected: !!mapped
    };
  }
  function haptic() {
    try {
      navigator.vibrate && navigator.vibrate(8);
    } catch (err) {
      // A malformed or inaccessible hash just means no deep link; the
      // default view is correct.
    }
  }
  // The app's one CSS prefers-reduced-motion rule clamps every
  // animation-duration/transition-duration to ~0, which already covers all
  // CSS-driven motion (spinners, modal slide-ins, toasts). It can't reach
  // Element.scrollIntoView({behavior:"smooth"}) — that's a browser-native
  // scroll animation, not a CSS animation/transition — so every call site
  // that requests smooth scrolling checks this first and falls back to an
  // instant jump.
  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  }
  // Autofocus is a desktop nicety and a mobile liability: on touch it raises
  // the software keyboard while the bottom sheet is still animating up, and
  // on iOS — where the keyboard doesn't resize the layout viewport the sheet
  // is positioned against — it lands on top of the sheet's own action row.
  // The user can still tap the field; they just aren't forced into it.
  // Read at render time rather than through a hook so it can be dropped into
  // an element's props without restructuring the component.
  // Roving tabindex for a set of mutually exclusive options — the month strip,
  // the Budget/Plan sub-tabs, the top tabs, the year pills.
  //
  // Each of those used to put every option in the tab order, so reaching the
  // first row of data on Budget → Monthly took 32 Tab presses, 21 of them
  // spent walking past twelve months, five sub-tabs and four tabs. The
  // convention for this is one stop for the group and arrow keys inside it,
  // which is also what a screen reader user expects from something announced
  // as a group of pressed/unpressed buttons.
  //
  // Returns the props for the container. Children opt in with
  // `tabIndex: isActive ? 0 : -1` so the one stop always lands on the current
  // selection — the group is re-entered where it was left.
  function useRovingTabs(itemSelector = "button") {
    const onKeyDown = (e) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      const box = e.currentTarget;
      if (!keys.includes(e.key) || !box) return;
      const items = [...box.querySelectorAll(itemSelector)]
        .filter((el) => el.offsetParent !== null && !el.disabled);
      if (items.length < 2) return;
      const at = items.indexOf(document.activeElement);
      if (at < 0) return;
      e.preventDefault();
      // The app has a global window-level ArrowLeft/Right shortcut for
      // stepping the month. Without this the same press would both move
      // focus and change the month.
      e.stopPropagation();
      const next = e.key === "Home" ? 0
        : e.key === "End" ? items.length - 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (at - 1 + items.length) % items.length
        : (at + 1) % items.length;
      items[next].focus();
    };
    return { onKeyDown };
  }
  function autoFocusOnDesktop() {
    try {
      return !(window.matchMedia && window.matchMedia("(pointer:coarse)").matches);
    } catch (e) {
      return true;
    }
  }
  function simulateDebtStrategy(debts, extra, order) {
    try {
      let ds = debts.filter((d2) => d2.bal > 0 && d2.pmt > 0).map((d2) => __spreadValues({}, d2));
      if (!ds.length) return null;
      const sortFn = order === "avalanche" ? (a, b) => b.rate - a.rate || a.bal - b.bal : (a, b) => a.bal - b.bal || b.rate - a.rate;
      let months = 0, totalInterest = 0;
      const payoffOrder = [];
      // Total-balance-remaining series, sampled once per month (month 0 is the
      // starting balance) — feeds the Avalanche-vs-Snowball comparison chart.
      const timeline = [roundMoney(ds.reduce((s, d2) => s + d2.bal, 0))];
      while (ds.length && months < 600) {
        months++;
        ds.forEach((d2) => {
          const i = d2.bal * (d2.rate / 100 / 12);
          d2.bal += i;
          totalInterest += i;
        });
        let freed = extra;
        ds.forEach((d2) => {
          const pay = Math.min(d2.pmt, d2.bal);
          d2.bal -= pay;
        });
        ds.sort(sortFn);
        if (ds[0] && freed > 0) {
          const pay = Math.min(freed, ds[0].bal);
          ds[0].bal -= pay;
        }
        ds = ds.filter((d2) => {
          if (d2.bal <= 5e-3) {
            payoffOrder.push(d2.label);
            extra += d2.pmt;
            return false;
          }
          return true;
        });
        timeline.push(roundMoney(ds.reduce((s, d2) => s + d2.bal, 0)));
      }
      if (months >= 600) return null;
      const d = /* @__PURE__ */ new Date();
      d.setMonth(d.getMonth() + months);
      return {
        months,
        totalInterest: roundMoney(totalInterest),
        debtFreeDate: MONTHS[d.getMonth()] + " " + d.getFullYear(),
        payoffOrder,
        timeline
      };
    } catch (err) {
      console.error("simulateDebtStrategy failed, hiding Payoff Strategy card", err);
      return null;
    }
  }
  // One search predicate for every view: description, category, notes, and
  // amount (with >N / <N / exact operators). Empty query matches everything.
  function eventMatchesSearch(ev, q) {
    if (!q) return true;
    const amtMatch = matchesAmountQuery(q, ev.amount);
    if (amtMatch !== null) return amtMatch;
    return (ev.desc || "").toLowerCase().includes(q) || (ev.category || "").toLowerCase().includes(q) || (ev.notes || "").toLowerCase().includes(q);
  }
  // `amount` is cents; the query text (typed by the user) is always dollars,
  // so compare against the dollar form rather than converting the parsed
  // threshold — that also keeps the digit-substring fallback working against
  // a normal-looking "1234.56" string instead of a decimal-point-free cents
  // integer.
  function matchesAmountQuery(q, amount) {
    const s = (q || "").trim();
    const dollarAmount = centsToDollars(amount);
    if (/^>\s*[\d.]+$/.test(s)) return dollarAmount > parseFloat(s.slice(1));
    if (/^<\s*[\d.]+$/.test(s)) return dollarAmount < parseFloat(s.slice(1));
    if (/^[\d.]+$/.test(s)) {
      const n = parseFloat(s);
      return !isNaN(n) && (Math.abs(dollarAmount - n) < 5e-3 || String(dollarAmount).includes(s));
    }
    return null;
  }
  // Fallback palette for custom categories — same validated set, in an order
  // whose neighbours stay separable under CVD simulation.
  const CAT_PALETTE = [
    "#217F4C",
    "#2F6FB8",
    "#C06722",
    "#4348B8",
    "#0E9483",
    "#B03A30",
    "#1189B5",
    "#7E3FBF",
    "#6B8E23",
    "#C22F6E",
    "#5E70C4",
    "#96551C",
    "#A8309F",
    "#8F8A26",
    "#8E4585"
  ];
