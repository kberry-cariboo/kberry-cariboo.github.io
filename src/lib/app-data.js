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
  function parseTabHash() {
    let raw = "";
    try {
      raw = (location.hash || "").replace(/^#\/?/, "");
    } catch (e) {
    }
    const [t, s] = raw.split("/");
    return {
      tab: ROUTE_TABS.includes(t) ? t : null,
      budgetSub: ROUTE_BUDGET_SUBS.includes(s) ? s : null
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
      }
      if (months >= 600) return null;
      const d = /* @__PURE__ */ new Date();
      d.setMonth(d.getMonth() + months);
      return {
        months,
        totalInterest: roundMoney(totalInterest),
        debtFreeDate: MONTHS[d.getMonth()] + " " + d.getFullYear(),
        payoffOrder
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
