  const CategoriesContext = createContext({ categories: [], categoryColors: {} });
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
  const LIGHT = {
    navy: "#1C2B3A",
    navyMid: "#243447",
    navyLt: "#2D4057",
    bg: "#F7F4EF",
    bgCard: "#FFFFFF",
    green: "#2ECC8A",
    greenDk: "#27AE73",
    greenLt: "#EAFBF3",
    red: "#E85D4A",
    redLt: "#FFF0EE",
    amber: "#F5A623",
    amberLt: "#FFF8EC",
    text: "#1C2B3A",
    textMid: "#5A6A7A",
    textLt: "#66798C",
    border: "#E8E4DD",
    stripe: "#F7F4EF",
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
    red: "#E85D4A",
    redLt: "#2A1515",
    amber: "#F5A623",
    amberLt: "#2A2010",
    text: "#E8EDF2",
    textMid: "#8FA3B8",
    textLt: "#7A93AC",
    border: "#243447",
    stripe: "#1E2D3E",
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
    chipKeep: "60%",
    coral: "#FF8A7A"
  };
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
      if (b64.length > 3e5) {
        toast("Image too large even after compression \u2014 try a smaller photo.", "error");
        cb(null);
        return;
      }
      cb(b64);
    };
    img.onerror = () => {
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
  const DEFAULT_REG_COLS = ["desc", "type", "amount", "startDate", "schedule", "until", "category", "notes"];
  const DEFAULT_BUDGET_COLS = ["desc", "category", "income", "expense", "balance"];
  const BUDGET_COL_LABELS = { desc: "Description", category: "Category", income: "Income", expense: "Expense", balance: "Balance" };
  const REG_COL_LABELS = {
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
  const ROUTE_TABS = ["dashboard", "budget", "plan", "ai", "settings", "alerts"];
  const ROUTE_BUDGET_SUBS = ["monthly", "daily", "bva", "forecast", "entries"];
  const ROUTE_PLAN_SUBS = ["goals", "strategy", "debt"];
  function parseTabHash() {
    let raw = "";
    try {
      raw = (location.hash || "").replace(/^#\/?/, "");
    } catch (e) {
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
