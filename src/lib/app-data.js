  const CategoriesContext = createContext({ categories: [], categoryColors: {} });
  const { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } = Recharts;
  const LOGO_SRC = "data:image/png;base64,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";
  const SCHEMA_VERSION = 7;
  const DEFAULT_ALERT_THRESHOLD = 1500;
  const APP_VERSION = CF_VERSION;
  function migrateData() {
    let storedVersion = 0;
    try {
      storedVersion = parseInt(localStorage.getItem("cf_schema_version") || "0");
    } catch (e) {
    }
    if (storedVersion >= SCHEMA_VERSION) return;
    // Fresh install: nothing to migrate — just stamp the schema version.
    // Running the steps anyway persists empty arrays (cf_categories = []),
    // which shadows the useLS defaults forever: a new user would get an empty
    // category list and couldn't fill the entry form's required Category field.
    let isFresh = false;
    try {
      isFresh = storedVersion === 0 && localStorage.getItem("cf_entries") == null && localStorage.getItem("cf_categories") == null;
    } catch (e) {
    }
    if (isFresh) {
      try {
        localStorage.setItem("cf_schema_version", String(SCHEMA_VERSION));
      } catch (e) {
      }
      return;
    }
    const readJSON = (key, fallback) => {
      try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
      } catch (e) {
        return fallback;
      }
    };
    const write = (key, val) => {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
      }
    };
    if (storedVersion < 1) {
      const entries = readJSON("cf_entries", null);
      if (Array.isArray(entries)) {
        let uid = Date.now();
        const fixed = entries.map((e) => ({
          id: e.id != null ? e.id : ++uid,
          desc: typeof e.desc === "string" ? e.desc : "Untitled",
          type: e.type === "income" ? "income" : "expense",
          amount: isFinite(Number(e.amount)) ? Math.abs(Number(e.amount)) : 0,
          startDate: typeof e.startDate === "string" && e.startDate ? e.startDate : localDateStr(/* @__PURE__ */ new Date()),
          repeats: !!e.repeats,
          recurEvery: parseInt(e.recurEvery) > 0 ? parseInt(e.recurEvery) : 1,
          recurUnit: ["day", "week", "month", "year", "semimonth"].includes(e.recurUnit) ? e.recurUnit : "month",
          recurDays: Array.isArray(e.recurDays) ? e.recurDays : [],
          recurEnd: typeof e.recurEnd === "string" ? e.recurEnd : "",
          category: typeof e.category === "string" && e.category ? e.category : "Uncategorized",
          notes: typeof e.notes === "string" ? e.notes : "",
          monthlyAmounts: e.monthlyAmounts != null ? e.monthlyAmounts : null
        }));
        write("cf_entries", fixed);
      }
    }
    if (storedVersion < 2) {
      const entries = readJSON("cf_entries", []);
      const cats = readJSON("cf_categories", null);
      if (Array.isArray(entries) && (Array.isArray(cats) || entries.length > 0)) {
        const used = entries.map((e) => e.category).filter(Boolean);
        const merged = [.../* @__PURE__ */ new Set([...cats || [], ...used])].sort((a, b) => a.localeCompare(b));
        // never persist an empty list over the useLS default
        if (merged.length > 0) write("cf_categories", merged);
      }
    }
    if (storedVersion < 3) {
      const entries = readJSON("cf_entries", []);
      if (Array.isArray(entries)) {
        const fixed = entries.map((e) => __spreadProps(__spreadValues({}, e), {
          monthlyAmounts: e.monthlyAmounts != null ? e.monthlyAmounts : null
        }));
        write("cf_entries", fixed);
      }
      const ovr = readJSON("cf_overrides", {});
      if (ovr && typeof ovr === "object") {
        const cleaned = {};
        Object.keys(ovr).forEach((year) => {
          cleaned[year] = {};
          const yearOvr = ovr[year] || {};
          Object.keys(yearOvr).forEach((evId) => {
            var _a;
            const o = yearOvr[evId] || {};
            cleaned[year][evId] = {
              amount: isFinite(Number(o.amount)) ? Number(o.amount) : void 0,
              notes: typeof o.notes === "string" ? o.notes : void 0,
              _savedAt: (_a = o._savedAt) != null ? _a : null,
              _history: Array.isArray(o._history) ? o._history : []
            };
            Object.keys(cleaned[year][evId]).forEach((k) => {
              if (cleaned[year][evId][k] === void 0) delete cleaned[year][evId][k];
            });
          });
        });
        write("cf_overrides", cleaned);
      }
    }
    if (storedVersion < 4) {
      try {
        // The live key is the historically typo'd "cf_budgtargets"; rescue any
        // data stored under the correctly-spelled key without clobbering the
        // live key if it already has data.
        const correct = localStorage.getItem("cf_budgettargets");
        const typo = localStorage.getItem("cf_budgtargets");
        if (correct && !typo) {
          localStorage.setItem("cf_budgtargets", correct);
        }
        if (correct) localStorage.removeItem("cf_budgettargets");
        const targets = readJSON("cf_budgtargets", null);
        if (targets && typeof targets !== "object") {
          write("cf_budgtargets", {});
        }
      } catch (e) {
      }
    }
    if (storedVersion < 6) {
      // GitHub Gist sync was removed — clear its stored credentials/state.
      try {
        localStorage.removeItem("cf_gist_token");
        localStorage.removeItem("cf_gist_id");
        localStorage.removeItem("cf_last_snapshot");
      } catch (e) {
      }
    }
    if (storedVersion < 7) {
      // Receipts are per-occurrence only now: move any entry-level attachment
      // onto the entry's start-date occurrence so the image is kept.
      const entries = readJSON("cf_entries", null);
      if (Array.isArray(entries) && entries.some((e) => e && e.attachment)) {
        const ovr = readJSON("cf_overrides", {});
        const res = moveEntryAttachmentsToOverrides(entries, ovr && typeof ovr === "object" ? ovr : {});
        write("cf_entries", res.entries);
        write("cf_overrides", res.overridesByYr);
      }
    }
    try {
      localStorage.setItem("cf_schema_version", String(SCHEMA_VERSION));
    } catch (e) {
    }
  }
  migrateData();
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

  // ── Biometric unlock (WebAuthn platform authenticator) ──────────────
  // This is a *local device unlock*, not a replacement for Supabase auth:
  // there's no relying-party server to verify the assertion against, so a
  // successful ceremony only proves "the same fingerprint/face that
  // registered this device is present right now." It gates re-entry after
  // the auto-lock timeout; it never signs anyone in or out of Supabase.
  function b64urlEncode(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function randomChallenge() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return arr;
  }
  async function isBiometricAvailable() {
    try {
      if (!window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }
  function getBiometricCredId(userId) {
    try {
      return localStorage.getItem("cf_webauthn_" + userId);
    } catch (e) {
      return null;
    }
  }
  async function registerBiometric(userId, email, fullName) {
    const cred = await navigator.credentials.create({
      publicKey: {
        rp: { name: "CashFlow" },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: fullName || email
        },
        challenge: randomChallenge(),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 6e4,
        attestation: "none"
      }
    });
    if (!cred) throw new Error("No credential returned.");
    const credId = b64urlEncode(cred.rawId);
    try {
      localStorage.setItem("cf_webauthn_" + userId, credId);
    } catch (e) {
    }
    return credId;
  }
  function clearBiometric(userId) {
    try {
      localStorage.removeItem("cf_webauthn_" + userId);
    } catch (e) {
    }
  }
  async function verifyBiometric(userId) {
    const credId = getBiometricCredId(userId);
    if (!credId) throw new Error("No biometric unlock set up on this device.");
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ id: b64urlDecode(credId), type: "public-key" }],
        userVerification: "required",
        timeout: 6e4
      }
    });
    if (!assertion) throw new Error("Verification failed.");
    return true;
  }
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
      if (d && !isNaN(d)) {
        const year = d.getFullYear();
        const occId = `${e.id}-${year}-${d.getMonth()}-${d.getDate()}`;
        ovs[year] = ovs[year] || {};
        const existing = ovs[year][occId] || {};
        if (existing.attachment === void 0) {
          ovs[year][occId] = __spreadProps(__spreadValues({}, existing), { attachment: e.attachment });
        }
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
  const roundMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  // One negative-number convention app-wide: a minus sign, never parentheses
  // (parens + red was double-encoding, and mixed with signed amounts elsewhere).
  const fmt = (n, showSign = false) => {
    if (n === void 0 || n === null || isNaN(n)) return "\u2014";
    const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n < 0) return `-$${abs}`;
    if (showSign && n > 0) return `+$${abs}`;
    return `$${abs}`;
  };
  const fmtAxisK = (v) => (v < 0 ? "-$" : "$") + (Math.abs(v) / 1e3).toFixed(0) + "k";
  const isLeapYear = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const daysInMonth = (m, y) => MONTH_DAYS[m] + (m === 1 && isLeapYear(y) ? 1 : 0);
  function parseDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function humanShortDate(str) {
    const d = parseDate(str);
    if (!d || isNaN(d)) return str;
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
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
  function todayStr() {
    const t = /* @__PURE__ */ new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function isArchived(e, year) {
    const yr = year || (/* @__PURE__ */ new Date()).getFullYear();
    const yearStart = `${yr}-01-01`;
    const yearEnd = `${yr}-12-31`;
    if (!e.repeats) {
      return e.startDate < yearStart || e.startDate > yearEnd;
    }
    if (e.startDate > yearEnd) return true;
    if (!e.recurEnd) return false;
    return e.recurEnd < yearStart;
  }
  function downloadCSV(filename, rows, headers) {
    const esc = (v) => {
      const s = v === null || v === void 0 ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function printView(title) {
    const prev = document.title;
    document.title = title;
    window.print();
    document.title = prev;
  }
  const ExportBar = ({ onCSV, onPrint, style = {} }) => /* @__PURE__ */ React.createElement("div", { "data-noprint": true, style: __spreadValues({ display: "flex", gap: 6 }, style) }, onCSV && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCSV,
      title: "Export to CSV",
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 12 }),
    "CSV"
  ), onPrint && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onPrint,
      title: "Print / Save as PDF",
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "printer", size: 12 }),
    "PDF"
  ));
  function expandEntries(entries, year, overrides = {}) {
    const events = [];
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    entries.forEach((e) => {
      const startD = parseDate(e.startDate) || new Date(year, 0, 1);
      const endD = e.repeats ? e.recurEnd ? parseDate(e.recurEnd) : new Date(9999, 11, 31) : startD;
      const every = Math.max(1, e.recurEvery || 1);
      const unit = e.recurUnit || "month";
      const wdays = e.recurDays || [];
      if (startD > yearEnd || endD < yearStart) return;
      const amtForMonth = (m) => {
        var _a;
        return ((_a = e.monthlyAmounts) == null ? void 0 : _a[m]) !== void 0 ? e.monthlyAmounts[m] : e.amount;
      };
      const addEv = (date) => {
        if (date.getFullYear() !== year) return;
        if (date < startD || date > endD) return;
        const m = date.getMonth(), d = date.getDate();
        const eid = `${e.id}-${year}-${m}-${d}`;
        const ov = overrides[eid] || {};
        const effM = ov.month !== void 0 ? Math.min(Math.max(0, ov.month), 11) : m;
        const effD = Math.min(Math.max(1, ov.day !== void 0 ? ov.day : d), daysInMonth(effM, year));
        const effDate = effM !== m || effD !== d ? new Date(year, effM, effD) : date;
        events.push({
          id: eid,
          entryId: e.id,
          desc: ov.desc !== void 0 ? ov.desc : e.desc,
          type: e.type,
          amount: ov.amount !== void 0 ? ov.amount : amtForMonth(m),
          category: e.category,
          notes: ov.notes !== void 0 ? ov.notes : e.notes || "",
          attachment: ov.attachment !== void 0 ? ov.attachment : null,
          isOverride: Object.keys(ov).length > 0,
          month: effM,
          day: effD,
          date: effDate,
          // Recurrence metadata — needed for monthly-equivalent calculations
          recurUnit: e.recurUnit || "month",
          recurEvery: e.recurEvery || 1,
          repeats: e.repeats || false
        });
      };
      if (!e.repeats) {
        addEv(new Date(startD));
        return;
      }
      if (unit === "semimonth") {
        const anchor = startD.getDate();
        const second = anchor <= 14 ? anchor + 14 : anchor - 14;
        for (let mi = 0; mi < 12; mi++) {
          const d1 = Math.min(anchor, daysInMonth(mi, year));
          const d2 = Math.min(second, daysInMonth(mi, year));
          addEv(new Date(year, mi, d1));
          addEv(new Date(year, mi, d2));
        }
      } else if (unit === "day") {
        let cur = new Date(startD);
        while (cur < yearStart) cur.setDate(cur.getDate() + every);
        cur.setDate(cur.getDate() - every);
        while (cur <= yearEnd) {
          if (cur >= yearStart) addEv(new Date(cur));
          cur.setDate(cur.getDate() + every);
        }
      } else if (unit === "week") {
        let cur = new Date(startD);
        while (cur < yearStart) cur.setDate(cur.getDate() + every * 7);
        cur.setDate(cur.getDate() - every * 7);
        while (cur <= yearEnd) {
          if (cur >= yearStart) {
            if (every === 1 && wdays.length > 1) {
              for (const wd of wdays) {
                const diff = (wd - cur.getDay() + 7) % 7;
                const c2 = new Date(cur);
                c2.setDate(c2.getDate() + diff);
                addEv(c2);
              }
            } else addEv(new Date(cur));
          }
          cur.setDate(cur.getDate() + every * 7);
        }
      } else if (unit === "month") {
        const anchorDay = startD.getDate();
        for (let mi = 0; mi < 12; mi++) {
          const startMi = startD.getFullYear() < year ? 0 : startD.getFullYear() === year ? startD.getMonth() : 999;
          if (mi < startMi) continue;
          const totalMo = (year - startD.getFullYear()) * 12 + mi - startD.getMonth();
          if (totalMo < 0 || totalMo % every !== 0) continue;
          addEv(new Date(year, mi, Math.min(anchorDay, daysInMonth(mi, year))));
        }
      } else if (unit === "year") {
        const sy = startD.getFullYear();
        if (year >= sy && (year - sy) % every === 0) {
          const mi = startD.getMonth();
          addEv(new Date(year, mi, Math.min(startD.getDate(), daysInMonth(mi, year))));
        }
      }
    });
    events.sort((a, b) => {
      const d = a.date - b.date;
      if (d !== 0) return d;
      if (a.type === "income" && b.type !== "income") return -1;
      if (b.type === "income" && a.type !== "income") return 1;
      return 0;
    });
    return events;
  }
  // Editing a recurring entry must never rewrite history: occurrences before
  // the current month keep the values they were actually shown with. When an
  // edited recurring entry already has occurrences before the 1st of the
  // current month (and still runs into it or beyond), the edit is applied as
  // a split: the original entry keeps its old values and is ended the day
  // before the new segment starts, and a new entry carries the edited values
  // forward. The new segment's start date is the edited pattern's first
  // occurrence on/after the 1st of the current month, so recurrence chains
  // (e.g. biweekly paydays) continue unbroken. For month/semi-month/year
  // patterns anchored on the 29th–31st, months too short for the anchor are
  // covered by the old entry and the boundary lands on the next full
  // occurrence, so the anchor day isn't permanently clamped by the split.
  // Returns { entries, newId, splitDate } — newId is null when the edit was
  // applied in place (no history to protect, or nothing value-affecting
  // changed).
  function splitEntryEditFromCurrentMonth(entries, editedId, data, now = new Date()) {
    const old = entries.find((e) => e.id === editedId);
    const inPlace = () => ({ entries: entries.map((e) => e.id === editedId ? __spreadProps(__spreadValues({}, data), { id: editedId }) : e), newId: null, splitDate: null });
    if (!old) return { entries, newId: null, splitDate: null };
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = localDateStr(monthStart);
    const oldStart = parseDate(old.startDate);
    if (!old.repeats || !oldStart || oldStart >= monthStart) return inPlace();
    // Already ended before this month: the user is deliberately editing a
    // historical record — apply exactly as asked.
    if (old.recurEnd && old.recurEnd < monthStartStr) return inPlace();
    const shape = (e) => JSON.stringify({
      desc: e.desc,
      type: e.type,
      amount: e.amount,
      category: e.category,
      notes: e.notes || "",
      repeats: !!e.repeats,
      recurEvery: e.recurEvery || 1,
      recurUnit: e.recurUnit || "month",
      recurDays: e.recurDays || [],
      startDate: e.startDate,
      monthlyAmounts: e.monthlyAmounts || null
    });
    // Only recurEnd (or nothing) changed: an explicit end date is date-scoped
    // intent, not a retroactive value change — apply in place.
    if (shape(old) === shape(data)) return inPlace();
    let newStartD = null;
    if (data.repeats) {
      const probe = __spreadProps(__spreadValues({}, data), { id: 0 });
      const anchorD = parseDate(data.startDate);
      const anchorDay = anchorD ? anchorD.getDate() : 1;
      const unit = data.recurUnit || "month";
      const semiSecond = anchorDay <= 14 ? anchorDay + 14 : anchorDay - 14;
      const dayOk = (ev) => unit === "month" || unit === "year" ? ev.day === anchorDay : unit === "semimonth" ? ev.day === anchorDay || ev.day === semiSecond : true;
      for (let yr = now.getFullYear(); yr <= now.getFullYear() + 10 && !newStartD; yr++) {
        const hit = expandEntries([probe], yr, {}).find((ev) => ev.date >= monthStart && dayOk(ev));
        if (hit) newStartD = hit.date;
      }
      // The edited pattern has no occurrence from this month on (e.g. its end
      // date is in the past): nothing forward-looking exists to split for.
      if (!newStartD) return inPlace();
    }
    const boundary = data.repeats ? newStartD : monthStart;
    const endD = new Date(boundary);
    endD.setDate(endD.getDate() - 1);
    const newId = Date.now();
    const next = entries.map((e) => e.id === editedId ? __spreadProps(__spreadValues({}, old), { recurEnd: localDateStr(endD) }) : e);
    next.push(__spreadProps(__spreadValues({}, data), { id: newId, startDate: data.repeats ? localDateStr(newStartD) : data.startDate }));
    return { entries: next, newId, splitDate: localDateStr(boundary) };
  }
  // After a split, occurrence-keyed data (overrides, mark-paid flags) dated
  // on/after the split boundary belongs to the new segment; earlier keys stay
  // with the original. Remapped keys whose dates the new pattern doesn't
  // generate simply never match anything — inert, not harmful.
  function remapOccurrenceKeys(obj, oldId, newId, fromDateStr) {
    const out = {};
    const re = new RegExp(`^${oldId}-(\\d+)-(\\d+)-(\\d+)$`);
    Object.keys(obj || {}).forEach((k) => {
      const m = k.match(re);
      if (m) {
        const dStr = `${m[1]}-${String(+m[2] + 1).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        if (dStr >= fromDateStr) {
          out[`${newId}-${m[1]}-${m[2]}-${m[3]}`] = obj[k];
          return;
        }
      }
      out[k] = obj[k];
    });
    return out;
  }
  function computeFlow(events, openBal) {
    let bal = openBal;
    return events.map((ev) => {
      bal += ev.type === "income" ? ev.amount : -ev.amount;
      return __spreadProps(__spreadValues({}, ev), { balance: Math.round(bal * 100) / 100 });
    });
  }
  function getMonthSummaries(flow, openBal) {
    return MONTHS.map((m, i) => {
      const evs = flow.filter((ev) => ev.month === i);
      const prev = flow.filter((ev) => ev.month < i);
      const open = prev.length > 0 ? prev[prev.length - 1].balance : openBal;
      const income = evs.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expense = evs.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const close = evs.length > 0 ? evs[evs.length - 1].balance : open;
      return { month: m, monthIdx: i, income, expense, surplus: income - expense, open, close };
    });
  }
  function getCurrentBalance(flow, openBal, year) {
    const today = /* @__PURE__ */ new Date();
    if (today.getFullYear() < year) return openBal;
    if (today.getFullYear() > year) {
      return flow.length > 0 ? flow[flow.length - 1].balance : openBal;
    }
    const past = flow.filter((ev) => ev.date <= today);
    return past.length > 0 ? past[past.length - 1].balance : openBal;
  }
  function haptic() {
    try {
      navigator.vibrate && navigator.vibrate(8);
    } catch (err) {
    }
  }
  function fmtVarRange(monthlyAmounts) {
    try {
      const vals = (Array.isArray(monthlyAmounts) ? monthlyAmounts : Object.values(monthlyAmounts || {})).map(Number).filter((v) => !isNaN(v));
      if (!vals.length) return "Variable";
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const k = (v) => v >= 1e3 ? "$" + (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1) + "k" : "$" + Math.round(v);
      return mn === mx ? "\u2248 " + k(mn) : k(mn) + "\u2013" + k(mx);
    } catch (err) {
      return "Variable";
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
        totalInterest: Math.round(totalInterest * 100) / 100,
        debtFreeDate: MONTHS[d.getMonth()] + " " + d.getFullYear(),
        payoffOrder
      };
    } catch (err) {
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
  function matchesAmountQuery(q, amount) {
    const s = (q || "").trim();
    if (/^>\s*[\d.]+$/.test(s)) return amount > parseFloat(s.slice(1));
    if (/^<\s*[\d.]+$/.test(s)) return amount < parseFloat(s.slice(1));
    if (/^[\d.]+$/.test(s)) {
      const n = parseFloat(s);
      return !isNaN(n) && (Math.abs(amount - n) < 5e-3 || String(amount).includes(s));
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
