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
  const HouseholdContext = createContext({ members: [], sessionUser: null, logActivity: () => {
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
    navy: "#1C2B3A",
    navyMid: "#243447",
    navyLt: "#2D4057",
    bg: "#F7F4EF",
    bgCard: "#FFFFFF",
    green: "#2ECC8A",
    greenDk: "#1B7950",
    greenLt: "#EAFBF3",
    red: "#B34739",
    redLt: "#FFF0EE",
    amber: "#F5A623",
    // Amber is legible as a fill or border but not as text: #F5A623 on white
    // measures 2.02:1. Fills and borders keep the gold; text uses this darker
    // ink so "over budget" / "today" markers are actually readable.
    amberInk: "#8E6014",
    amberLt: "#FFF8EC",
    text: "#1C2B3A",
    textMid: "#586878",
    textLt: "#5B6C7D",
    border: "#E8E4DD",
    stripe: "#F7F4EF",
    // Rows for dates already past. This used to be conveyed with opacity:0.7
    // on the whole row, which dragged every colour in it below WCAG AA — the
    // day column measured 2.97:1 and the green amounts 2.75:1. Fading the
    // *surface* instead of the content keeps the "already happened" cue while
    // the text stays at full strength.
    pastBg: "#EFEBE4",
    headerBg: "#1C2B3A",
    headerText: "#ffffff",
    inputBg: "#F7F4EF",
    doneBg: "#EAFBF3",
    shadowSm: "0 1px 3px rgba(28,43,58,0.06), 0 1px 2px rgba(28,43,58,0.04)",
    shadowMd: "0 4px 12px rgba(28,43,58,0.08), 0 2px 4px rgba(28,43,58,0.04)",
    shadowLg: "0 12px 32px rgba(28,43,58,0.12), 0 4px 8px rgba(28,43,58,0.06)",
    shadowXl: "0 24px 60px rgba(28,43,58,0.18)",
    accent: "#2F6FED",
    accentLt: "#EAF1FE",
    // Chip text = category hue mixed toward white by (100% - chipKeep).
    // Light surfaces keep the full hue; dark surfaces lighten it so deep
    // hues (indigo, dark red) stay readable on dark cards.
    chipKeep: "100%",
    // Interactive fills (active pills, primary buttons, FAB). Same as the brand
    // navy in light mode; dark mode needs its own value because there the navy
    // doubles as a surface color and active states would vanish into it.
    primary: "#1C2B3A",
    // Navy on light surfaces is already ~12:1 as text; the token exists so
    // .link-primary can use one name across both themes.
    primaryInk: "#1C2B3A",
    // Negative amounts rendered ON navy surfaces (totals rows) — --red is too
    // dark against navy, so those cells use this lighter coral.
    coral: "#FF8A7A"
  };
  const DARK = {
    navy: "#0F1923",
    navyMid: "#162230",
    navyLt: "#1E3045",
    bg: "#111921",
    bgCard: "#1A2535",
    green: "#2ECC8A",
    greenDk: "#27AE73",
    greenLt: "#16291F",
    red: "#E8705F",
    redLt: "#2A1515",
    amber: "#F5A623",
    // On dark surfaces the gold already clears AA (7.6:1 on the card), so the
    // ink token is the same colour — it exists to keep the call sites uniform.
    amberInk: "#F5A623",
    amberLt: "#2A2010",
    text: "#E8EDF2",
    textMid: "#8FA3B8",
    textLt: "#7F97AF",
    border: "#243447",
    stripe: "#1E2D3E",
    pastBg: "#151E2A",
    headerBg: "#0F1923",
    headerText: "#ffffff",
    inputBg: "#162230",
    doneBg: "#16291F",
    shadowSm: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
    shadowMd: "0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)",
    shadowLg: "0 12px 32px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)",
    shadowXl: "0 24px 60px rgba(0,0,0,0.6)",
    accent: "#5B8DEF",
    accentLt: "#1A2942",
    primary: "#4E729C",
    // `primary` doubles as an interactive fill here, so it can't just be
    // lightened — that would wash out active pills and buttons. Links rendered
    // *in* that colour need their own value (#4E729C on a card is 3.09:1, and
    // 3.55:1 on the page bg — under AA on every dark surface).
    //
    // So the split is: --primary paints things (fills, borders, accent-color,
    // icons — all non-text, which only need 3:1 under 1.4.11), --primaryInk
    // colours text. Any new `color:var(--primary)` on a text node is a dark-mode
    // AA violation waiting to happen; use --primaryInk. In light mode the two
    // are the same navy, so the swap is invisible there.
    primaryInk: "#7C97B6",
    chipKeep: "60%",
    coral: "#FF8A7A"
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
  function blendOver(fg, bg, alpha) {
    const f = hexToRgb(fg), b = hexToRgb(bg);
    return rgbToHex(f[0] * alpha + b[0] * (1 - alpha), f[1] * alpha + b[1] * (1 - alpha), f[2] * alpha + b[2] * (1 - alpha));
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
  // Chip ink, cached per (hue, surface). The surface is passed in rather than
  // read from module state: a module variable can't trigger a React re-render,
  // so chips rendered before a theme switch kept their old ink and dark mode
  // ended up *worse* than before this was computed at all (~2.5:1). It comes
  // through CategoriesContext so a theme change re-renders every chip.
  //
  // Chip background is `hue + "22"` — the hue at 13.3% over the surface. The
  // 5.2 target (rather than 4.5) is headroom: chips also sit on stripes,
  // selected rows and past-row tints, which are a little different from the
  // card colour this is computed against.
  const _chipInkCache = /* @__PURE__ */ new Map();
  function chipInk(hue, surface) {
    const surf = surface || "#FFFFFF";
    const key = hue + "|" + surf;
    let v = _chipInkCache.get(key);
    if (v === void 0) {
      v = readableInk(hue, blendOver(hue, surf, 0x22 / 255), 5.6);
      _chipInkCache.set(key, v);
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
  const ROUTE_TABS = ["dashboard", "budget", "plan", "ai", "settings", "alerts", "help"];
  // "daily" is still accepted so an old bookmark or a remembered sub-tab
  // resolves rather than silently falling back to Monthly; BudgetView forwards
  // it to calendar, the view that replaced it.
  const ROUTE_BUDGET_SUBS = ["monthly", "calendar", "daily", "bva", "forecast", "entries"];
  const ROUTE_PLAN_SUBS = ["goals", "strategy", "debt"];
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
    dashboard: "Dashboard",
    ai: "AI Insights",
    settings: "Settings",
    alerts: "Alerts",
    help: "Help",
    "budget/monthly": "Budget \u00b7 Monthly",
    "budget/calendar": "Budget \u00b7 Calendar",
    "budget/bva": "Budget \u00b7 Budget vs Actual",
    "budget/forecast": "Budget \u00b7 Forecast",
    "budget/entries": "Budget \u00b7 Entries",
    "plan/debt": "Plan \u00b7 Debt Payoff",
    "plan/strategy": "Plan \u00b7 Payoff Strategy",
    "plan/goals": "Plan \u00b7 Savings Goals"
  };
  function viewName(tab, budgetSub, planSub) {
    const sub = tab === "budget" ? budgetSub : tab === "plan" ? planSub : null;
    return VIEW_NAMES[sub ? `${tab}/${sub}` : tab] || VIEW_NAMES.dashboard;
  }
  function viewDocTitle(tab, budgetSub, planSub) {
    return `${viewName(tab, budgetSub, planSub)} \u2014 ${APP_NAME}`;
  }
  // How each kind of logged change is labelled in the Activity list. The kind
  // is stored rather than the label so the wording can be changed without
  // rewriting history.
  const ACTIVITY_LABELS = {
    entry: "Entry",
    override: "Date",
    target: "Target",
    goal: "Goal",
    debt: "Debt",
    year: "Year"
  };
  function parseTabHash() {
    let raw = "";
    try {
      raw = (location.hash || "").replace(/^#\/?/, "");
    } catch (e) {
      // A malformed or inaccessible hash just means no deep link; the
      // default view is correct.
    }
    const [t, s] = raw.split("/");
    return {
      tab: ROUTE_TABS.includes(t) ? t : null,
      budgetSub: ROUTE_BUDGET_SUBS.includes(s) ? s : null,
      planSub: ROUTE_PLAN_SUBS.includes(s) ? s : null
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
