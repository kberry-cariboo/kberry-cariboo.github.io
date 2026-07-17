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
      const cats = readJSON("cf_categories", []);
      if (Array.isArray(cats) && Array.isArray(entries)) {
        const used = entries.map((e) => e.category).filter(Boolean);
        const merged = [.../* @__PURE__ */ new Set([...cats, ...used])].sort((a, b) => a.localeCompare(b));
        write("cf_categories", merged);
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
        const correct = localStorage.getItem("cf_budgettargets");
        const typo = localStorage.getItem("cf_budgtargets");
        if (!correct && typo) {
          localStorage.setItem("cf_budgtargets", typo);
          localStorage.removeItem("cf_budgettargets");
        }
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
    accentLt: "#EAF1FE"
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
    accentLt: "#1A2942"
  };
  const YEAR_COLORS = ["#2F5496", "#E85D4A", "#27AE73", "#F5A623", "#8E44AD", "#16A085"];
  const GLOBAL_STYLES = `
        @font-face{font-family:'Inter';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'Inter';font-style:normal;font-weight:500;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'Inter';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'Inter';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/inter-var.woff2') format('woff2');}
        @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/plexmono-400.woff2') format('woff2');}
        @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/plexmono-600.woff2') format('woff2');}
        @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/plexmono-700.woff2') format('woff2');}
        *{box-sizing:border-box;} html{scrollbar-gutter:stable;-webkit-text-size-adjust:100%;text-size-adjust:100%;}
        /* \u2500\u2500 Shared form primitives (replaces 4 near-duplicate inline lbl/inp objects) \u2500\u2500 */
        .field-label{font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:var(--textMid);
          text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:6px;}
        .field-input{font-family:Inter,sans-serif;font-size:13px;padding:9px 12px;
          border:1.5px solid var(--border);border-radius:8px;
          background:var(--inputBg);color:var(--text);outline:none;width:100%;box-sizing:border-box;}
        .field-input:focus{border-color:var(--navy);}
        .field-input.field-error{border-color:var(--red);background:rgba(232,93,74,0.08);}
        .field-input--mono{font-family:'IBM Plex Mono',monospace;}
        .field-error-text{font-family:Inter,sans-serif;font-size:11px;color:var(--red);margin-top:4px;}
        .field-hint-text{font-family:Inter,sans-serif;font-size:10px;color:var(--textLt);margin-top:4px;}

        /* \u2500\u2500 Shared component classes (replaces repeated inline styles) \u2500\u2500 */
        .cf-card{background:var(--bgCard);border-radius:14px;border:1px solid var(--border);
          box-shadow:var(--shadowSm);padding:20px 24px;transition:box-shadow 0.2s ease, transform 0.2s ease;}
        .cf-card--flush{padding:0;overflow:hidden;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2000;
          display:flex;align-items:center;justify-content:center;padding:16px;}
        .skip-link{position:absolute;left:-9999px;top:0;z-index:3000;
          background:var(--navy);color:#fff;padding:10px 18px;border-radius:0 0 8px 0;
          font-family:Inter,sans-serif;font-size:13px;font-weight:600;text-decoration:none;}
        .skip-link:focus{left:0;}
        /* Typography */
        .cf-text-ui{font-family:Inter,sans-serif;}
        .cf-text-mono{font-family:'IBM Plex Mono',monospace;}
        .cf-text-mono-13{font-family:'IBM Plex Mono',monospace;font-size:13px;}
        .cf-section-title-text{margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--textLt);}
        .cf-text-label{font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:var(--textMid);
          letter-spacing:0.06em;text-transform:uppercase;}
        /* Buttons */
        .cf-btn{font-family:Inter,sans-serif;font-size:13px;font-weight:600;padding:9px 18px;
          border-radius:8px;border:none;cursor:pointer;transition:filter 0.15s;}
        .cf-btn--primary{background:var(--navy);color:#fff;}
        .cf-btn--secondary{background:transparent;color:var(--textMid);border:1px solid var(--border);}
        .cf-btn--danger{background:var(--redLt);color:var(--red);border:1px solid var(--redLt);}
        .cf-btn:disabled{cursor:not-allowed;background:var(--border);color:var(--textMid);}
        .cf-btn--compact{font-size:11px;font-weight:600;padding:4px 10px;border-radius:5px;}
        .cf-btn--sm{font-size:11px;padding:6px 12px;}
        /* Layout helpers */
        .cf-row{display:flex;align-items:center;}
        .cf-row-between{display:flex;align-items:center;justify-content:space-between;}
        .cf-col{display:flex;flex-direction:column;}
        .cf-gap-8{gap:8px;}
        .cf-gap-12{gap:12px;}
        body{margin:0;background:var(--bg);scrollbar-gutter:stable;
          -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        /* Stray horizontal overflow must never widen the mobile layout viewport —
           that zooms the page out and scales/displaces position:fixed chrome
           (bottom nav). Wide content belongs in an .hscroll container. */
        html,body{overflow-x:hidden;overflow-x:clip;}
        /* ── Mobile app-shell scrolling ─────────────────────────────────────
           On touch devices the page body must never scroll: a scrolling body
           collapses/expands the browser's URL bar, and position:fixed chrome
           (the bottom nav) shifts with that animation. Instead the app root
           (.app-scroll) is a fixed-height internal scroller — the browser bar
           never moves, so neither does the nav. Desktop keeps normal body
           scrolling for keyboard/scroll-wheel ergonomics. */
        @media (pointer:coarse){
          html,body{height:100%;overflow:hidden;}
          .app-scroll{height:100vh;height:100dvh;overflow-y:auto;overflow-x:clip;
            -webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;}
        }
        @media print{html,body{height:auto;overflow:visible;}.app-scroll{height:auto!important;overflow:visible!important;}}
        .settings-page-pills{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
        .settings-page-pills::-webkit-scrollbar{display:none;}
        /* \u2500\u2500 Modern interaction polish (pointer devices) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media (hover:hover) and (pointer:fine){
          /* Cards lift subtly on hover for depth */
          .cf-card:hover{box-shadow:var(--shadowMd);}
          /* All buttons get a gentle press/hover feel */
          button{transition:filter 0.15s ease, transform 0.08s ease, box-shadow 0.15s ease, background 0.15s ease;}
          button:not(:disabled):hover{filter:brightness(1.06);}
          button:not(:disabled):active{transform:translateY(0.5px) scale(0.985);}
          /* Interactive rows highlight on hover */
          .reg-table tbody tr:hover,
          .hscroll table tbody tr:hover{background:var(--accentLt)!important;}
          /* Nav tabs + pills subtle hover */
          .tab-bar button:hover,.budget-subtab-pill:hover{filter:brightness(1.04);}
        }
        /* Accessible focus ring \u2014 keyboard only, consistent everywhere */
        :focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px;}
        button:focus:not(:focus-visible){outline:none;}
        /* Text inputs/selects get a visible focus ring on ANY focus (mouse or keyboard) \u2014
           they have outline:none inline, so this restores feedback for pointer users. */
        input:focus,select:focus,textarea:focus{
          outline:2px solid var(--accent)!important;outline-offset:1px;
          border-color:var(--accent)!important;
        }
        /* \u2500\u2500 UI polish \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        /* Bottom navigation: touch devices only */
        .cf-bottomnav{display:none;position:fixed;left:0;right:0;bottom:0;z-index:1400;
          background:var(--bgCard);border-top:1px solid var(--border);
          padding-bottom:env(safe-area-inset-bottom);
          box-shadow:0 -2px 12px rgba(28,43,58,0.06);}
        @media (pointer:coarse){
          .cf-bottomnav{display:flex;}
          .tab-bar{display:none!important;}
          .content-area{padding-bottom:calc(64px + env(safe-area-inset-bottom))!important;}
          .content-area.content-area--fab{padding-bottom:calc(132px + env(safe-area-inset-bottom))!important;}
          .cf-fab{bottom:calc(66px + env(safe-area-inset-bottom))!important;}
          .cf-quickfab{bottom:calc(66px + env(safe-area-inset-bottom))!important;}
          .reg-bulkbar{bottom:calc(72px + env(safe-area-inset-bottom))!important;}
          .cf-quickfab-panel{bottom:calc(128px + env(safe-area-inset-bottom))!important;max-height:70vh!important;}
        }
        /* FAB: touch devices only, thumb-reach primary action */
        .cf-fab{display:none;position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));
          width:56px;height:56px;border-radius:50%;background:var(--navy);color:#fff;
          font-size:28px;font-weight:400;line-height:1;border:none;cursor:pointer;
          box-shadow:0 6px 20px rgba(0,0,0,0.28);z-index:1500;}
        @media (pointer:coarse){.cf-fab{display:flex;align-items:center;justify-content:center;}}
        /* Camera capture: touch devices only \u2014 desktop shows gallery picker alone */
        .attach-camera{display:none!important;}
        @media (pointer:coarse){.attach-camera{display:inline-flex!important;}}
        html{-webkit-tap-highlight-color:transparent;}
        /* Touch/no-hover devices: simple press feedback (hover handled by the pointer:fine block above) */
        @media not (hover:hover){
          button:active:not(:disabled){transform:scale(0.97);}
        }
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
        input[type=number]{-moz-appearance:textfield;appearance:textfield;}
        .modal-card{overscroll-behavior:contain;}
        tr{transition:background 0.12s ease;}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}}
        input,select,button,textarea{font-family:Inter,sans-serif;}

        /* \u2500\u2500 Typography tokens \u2014 apply to all data content \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        /* Primary data text (descriptions, labels, names) */
        .tx  {font-family:Inter,sans-serif;font-size:13px;color:var(--text);}
        /* Secondary / metadata (categories, dates, schedule) */
        .txm {font-family:Inter,sans-serif;font-size:13px;color:var(--textMid);}
        /* Muted (notes, hints, historical, inactive) */
        .txl {font-family:Inter,sans-serif;font-size:13px;color:var(--textLt);}
        /* Monospace numbers (amounts, balances) */
        .mno {font-family:'IBM Plex Mono',monospace;font-size:13px;}
        /* Small caps section label (uppercase, letter-spaced) \u2014 intentionally 11px */
        .lbl {font-family:Inter,sans-serif;font-size:11px;font-weight:700;
              text-transform:uppercase;letter-spacing:0.1em;color:var(--textLt);}
        /* Hint / help text below fields \u2014 intentionally 11px */
        .hint{font-family:Inter,sans-serif;font-size:11px;color:var(--textLt);}

        /* Table header cells \u2014 standardized */
        .th  {font-family:Inter,sans-serif;font-size:11px;font-weight:700;
              text-transform:uppercase;letter-spacing:0.08em;color:#fff;padding:10px 14px;}
        /* Standard data table body cell */
        .td  {font-family:Inter,sans-serif;font-size:13px;color:var(--text);padding:9px 14px;}
        /* Mono table body cell (amounts) */
        .tdm {font-family:'IBM Plex Mono',monospace;font-size:13px;padding:9px 14px;text-align:right;}
        .reg-table tr:hover td span[style*="opacity:0"]{opacity:1!important;}
        /* \u2500\u2500 Budget Monthly grid columns \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
           Desktop: fixed layout + explicit widths so columns never shift
           between months. Mobile overrides live in the \u2264480px block below. */
        .budget-monthly-table{table-layout:fixed;}
        .budget-monthly-table .budget-col-day{width:38px;}
        .budget-monthly-table .budget-col-desc{width:auto;max-width:0;}
        .budget-monthly-table .budget-col-category{width:120px;}
        .budget-monthly-table .budget-col-income{width:105px;}
        .budget-monthly-table .budget-col-expense{width:105px;}
        .budget-monthly-table .budget-col-balance{width:120px;}
        @media(max-width:700px){span[style*="opacity:0"]{opacity:1!important;}}
        @keyframes slideUp{from{transform:translate(-50%,20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
        @media(max-width:768px){
          .search-box input{width:100%!important;flex:1;}
          /* Hide header search on mobile \u2014 saves space for essential controls */
          .header-search{display:none!important;}
          /* Hide year pills on mobile \u2014 managed in Settings */
          .year-pills-mobile{display:none!important;}
        }
        @media(max-width:768px){.help-btn{display:none!important;}}
        @media print{[data-noprint]{display:none!important;}body{background:#fff!important;}.content-area{padding:0!important;}}

        /* \u2500\u2500 Mobile layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media(max-width:768px){
          /* Prevent iOS/Android auto-zoom on input focus (fires when font-size < 16px).
             Targets the entry/CSV form panels and search boxes. Narrow tabular inputs
             (monthly-amounts grid, budget targets) keep their compact size. */
          .fab-panel input:not([type=checkbox]), .fab-panel select,
          .search-box input, .header-search input { font-size: 16px !important; }
          /* Bottom-sheet modals \u2014 slide up from bottom edge */
          .modal-overlay{align-items:flex-end!important;}
          .modal-card{
            border-radius:20px 20px 0 0!important;
            width:100%!important;max-width:100%!important;
            padding-bottom:calc(24px + env(safe-area-inset-bottom))!important;
            max-height:92vh!important;overflow-y:auto!important;
          }

          /* Entry form: stack 3-col row on tablet */
          .entry-form-row2{grid-template-columns:1fr!important;}
          /* Register: switch to cards on mobile \u2014 table hidden */
          .reg-cards{display:block!important;}
          /* Prevent focus zoom on Android/iOS: inputs must render \u226516px */
          input,select,textarea{font-size:16px!important;}
          .wm-arrow{width:44px!important;height:44px!important;line-height:42px!important;font-size:16px!important;}
          .reg-table-wrap{display:none!important;}
          /* Header: single fixed row \u2014 never wraps */
          .header-inner{flex-wrap:nowrap!important;height:56px!important;padding:0 12px!important;gap:8px;}
          .logo-area img{height:23px!important;}
          .year-pills{gap:3px!important;flex-wrap:wrap;}
          /* Tab bar: scrollable, no scrollbar visible */
          .tab-bar{gap:0!important;overflow-x:auto;-webkit-overflow-scrolling:touch;
            padding-bottom:0!important;scrollbar-width:none;}
          .tab-bar::-webkit-scrollbar{display:none;}
          .tab-bar button{padding:10px 10px!important;font-size:11px!important;white-space:nowrap;}
          /* Content padding */
          .content-area{padding:12px 8px!important;margin-top:0!important;}
          /* Kill any residual navy gap between tab-bar and content on mobile */
          .tab-bar-outer{padding-bottom:0!important;overflow:hidden!important;}
          /* KPI grids: 2-column on tablet/mobile */
          .kpi-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important;}
          .kpi-grid-4{grid-template-columns:repeat(2,1fr)!important;gap:8px!important;}
          /* Dashboard: charts stack, no overflow */
          .chart-grid{grid-template-columns:1fr!important;gap:10px!important;}
          /* Dashboard wrapper: no overflow */
          .dash-wrap{overflow:hidden!important;max-width:100%!important;}
          /* Month picker: tighter, arrows hidden (month pills are tappable) */
          .month-picker{gap:4px!important;flex-wrap:nowrap!important;overflow-x:auto!important;
            -webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;
            padding-bottom:4px!important;margin-left:-6px!important;margin-right:-6px!important;
            padding-left:6px!important;padding-right:6px!important;}
          .month-picker::-webkit-scrollbar{display:none!important;}
          .glance-grid{gap:6px!important;}
          .bp-daily{display:none!important;}
          .ef-save-template{display:none!important;}
          .budget-subtab-pill .bp-label-full{display:none!important;}
          .budget-subtab-pill{width:40px!important;height:40px!important;padding:0!important;
            display:inline-flex!important;align-items:center!important;justify-content:center!important;
            flex-shrink:0!important;font-size:16px!important;}
          .budget-subtabs{margin-left:-4px!important;margin-right:-4px!important;padding-left:4px!important;padding-right:4px!important;}
          .year-openbal{flex-basis:100%!important;order:5;}
          .year-openbal input{flex:1 1 auto!important;width:auto!important;}
          .glance-grid [style*="IBM Plex Mono"]{font-size:14px!important;}
          .month-picker button{padding:4px 6px!important;font-size:10px!important;}
          .month-nav-arrow{display:none!important;}
          .month-today-pill{display:none!important;}
          /* Budget monthly table: hide category */
          .budget-col-cat{display:none!important;}
          /* Forecast table: hide category, tighten padding */
          .forecast-table td,.forecast-table th{padding:7px 8px!important;font-size:11px!important;}
          .forecast-col-cat{display:none!important;}
          .forecast-desc-cell{max-width:180px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}
          /* Daily view: hide category label, shrink balance column */
          .daily-card{grid-template-columns:44px 1fr 88px!important;}
          .daily-cat{display:none!important;}
          /* Register: keep all columns, scroll horizontally */
          .reg-table{font-size:12px!important;}
          .reg-table td,.reg-table th{padding:8px 10px!important;}
          /* Action buttons: always visible, touch-friendly */
          .reg-actions{white-space:nowrap;}
          .reg-actions div{display:flex!important;gap:4px!important;}
          .reg-actions button{padding:6px 8px!important;font-size:12px!important;}
          /* Monthly amounts: 3 columns on mobile instead of 12 */
          .monthly-amounts-grid{grid-template-columns:repeat(3,1fr)!important;}
          /* FAB quick-add panel: near full-width, centered above FAB */
          .fab-panel{left:12px!important;right:12px!important;bottom:84px!important;
            width:auto!important;padding:16px!important;maxHeight:78vh!important;}
          /* Budget: hide daily toggle, add button; show mobile-only label */
          /* Register: hide add/import buttons \u2014 FAB handles these on mobile */
        }
        @media(max-width:480px){
          /* Phones (S25 Ultra ~480px CSS viewport): tightest layout */
          .kpi-grid{grid-template-columns:1fr 1fr!important;gap:6px!important;}
          .kpi-grid-4{grid-template-columns:1fr 1fr!important;gap:6px!important;}
          .monthly-amounts-grid{grid-template-columns:repeat(2,1fr)!important;}
          .month-picker button{padding:3px 5px!important;font-size:9px!important;}
          /* Hide \u2039 \u203A arrows on mobile \u2014 month buttons are tappable directly */
          .month-nav-arrow{display:none!important;}
          .month-today-pill{display:none!important;}
          .daily-card{grid-template-columns:36px 1fr 76px!important;}
          .daily-balance{min-width:72px!important;}
          .content-area{padding:10px 6px!important;margin-top:0!important;}
          .tab-bar-outer{padding-left:8px!important;padding-right:8px!important;padding-bottom:0!important;overflow:hidden!important;}
          .tab-bar{margin:0!important;padding:0!important;}
          .tab-bar button{padding:10px 8px!important;font-size:10px!important;}
          /* Cards: tighter padding on phone */
          [style*="padding:"20px 24px""]{padding:14px 12px!important;}
          /* Budget: description cell \u2014 ellipsis on overflow, no wrap */
          .budget-desc-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:none;}
          /* Budget Monthly grid on phone: keep every column (Category, Income, Expense,
             Balance) visible \u2014 matching Entries \u2014 by giving the table real intrinsic width
             so the .hscroll wrapper's overflow-x:auto produces a genuine horizontal swipe,
             the same way it always worked before. Nothing is hidden; Description gets a
             sensible minimum width instead of being crushed to nothing. */
          .budget-monthly-table{table-layout:fixed;min-width:640px!important;}
          .budget-monthly-table .budget-col-checkbox{width:26px!important;}
          .budget-monthly-table .budget-col-day{width:26px!important;}
          .budget-monthly-table .budget-col-desc{width:150px!important;max-width:150px!important;}
          /* Category is hidden at the 768px breakpoint above; bring it back here
             so the phone layout actually has all 7 columns the min-width assumes —
             otherwise the table is left with ~170px of unlabeled blank space. */
          .budget-monthly-table .budget-col-cat{display:table-cell!important;}
          .budget-monthly-table .budget-col-category{width:90px!important;}
          .budget-monthly-table .budget-col-income{width:85px!important;}
          .budget-monthly-table .budget-col-expense{width:85px!important;}
          .budget-monthly-table .budget-col-balance{width:95px!important;}
          /* BvA row \u2014 keep chip + amounts on one line on mobile */
          .bva-row{flex-wrap:nowrap!important;}
          .bva-amounts{flex-wrap:nowrap!important;}
          /* Hide / $target on mobile \u2014 it's already visible in the input field */
          .bva-target{display:none!important;}
          /* Forecast: description cell \u2014 truncate on mobile */
          .forecast-desc-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px!important;}
          /* Register filters: stack on phone */
          .reg-col-cat,.reg-col-sched,.reg-col-until,.reg-col-notes{display:none!important;}
          /* Register filter row: stack on phone */
          .reg-filter-row{flex-wrap:wrap!important;gap:6px!important;}
          /* Forecast confidence column: hide on phone to save width */
          .forecast-conf-col{display:none!important;}
        }


        /* \u2500\u2500 Bottom-sheet modals on mobile \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .modal-card{background:var(--bgCard);border-radius:14px;box-shadow:var(--shadowXl);animation:slideUp 0.2s ease-out;}

        /* \u2500\u2500 Two-column dashboard at \u22651400px \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        @media(min-width:1400px){
          .content-area{max-width:1400px!important;padding:28px 40px!important;}
        }

        /* \u2500\u2500 Register table: card view on mobile \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        /* Register: table on desktop, cards on mobile */
        .reg-cards{display:none;}
        /* Budget sub-tab labels: full text on desktop; icon-only, uniform size on mobile */
        /* \u2500\u2500 Unified scroll utility \u2014 every grid scrolls like the register \u2500\u2500
           hidden scrollbar (all engines) + vertical scrollport + horizontal overflow;
           direct-child thead cells stick to the top while scrolling. */
        .hscroll{display:block;max-height:72vh;overflow-y:auto;overflow-x:auto;
          scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
        .hscroll::-webkit-scrollbar{display:none;}
        .hscroll>table>thead>tr>th{position:sticky;top:0;z-index:5;background:var(--navy);}
        /* Stripe-headed tables (e.g. income sources) keep their stripe when sticky */
        .hscroll>table>thead>tr[data-stripe="1"]>th{background:var(--stripe);}
        /* Register wrap is now just an alias of the shared utility */
        .reg-table-wrap{display:block;max-height:72vh;overflow-y:auto;overflow-x:auto;
          scrollbar-width:none;-ms-overflow-style:none;}
        .reg-table-wrap::-webkit-scrollbar{display:none;}
        .reg-table thead .reg-th{position:sticky;top:0;z-index:5;}
        /* Register desc: fill available space, truncate */
        .reg-desc-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        /* Budget totals row sticky */
        .budget-totals-row{box-shadow:0 -2px 8px rgba(0,0,0,0.12);}

        /* \u2500\u2500 44px minimum tap targets \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
        .reg-actions button{min-height:36px;min-width:36px;}

        /* AI report: two-column card grid on wide screens */
        .ai-report-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;margin-bottom:16px;}
        @media(max-width:900px){.ai-report-grid{grid-template-columns:1fr;}}

        /* Keyboard shortcut hint in search placeholder */
        #global-search::placeholder{color:var(--textLt);}


`;
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
  const DEFAULT_CATEGORY_COLORS = {
    "Income": "#29AE29",
    "Housing": "#3985D0",
    "Insurance": "#5A626E",
    "Transportation": "#D08539",
    "Food": "#85D039",
    "Utilities": "#39D085",
    "Subscriptions": "#8539D0",
    "Debt / Credit": "#AE2929",
    "Savings / RRSP": "#29AEAE",
    "Medical": "#AE29AE",
    "Education": "#2929AE",
    "Personal": "#D03985",
    "Farm / Animals": "#785032",
    "Gifts / Events": "#963C6E",
    "Other": "#AEAE29"
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
  const fmt = (n, showSign = false) => {
    if (n === void 0 || n === null || isNaN(n)) return "\u2014";
    const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n < 0) return `($${abs})`;
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
  const ROUTE_TABS = ["dashboard", "budget", "plan", "ai", "settings"];
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
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6 }
    },
    "\u2B07 CSV"
  ), onPrint && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onPrint,
      title: "Print / Save as PDF",
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6 }
    },
    "\u{1F5A8} PDF"
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
        const effD = ov.day !== void 0 ? Math.min(Math.max(1, ov.day), daysInMonth(m, year)) : d;
        const effDate = effD !== d ? new Date(year, m, effD) : date;
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
          month: m,
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
  const CAT_PALETTE = [
    "#2F5496",
    "#E85D4A",
    "#27AE73",
    "#F5A623",
    "#8E44AD",
    "#16A085",
    "#D35400",
    "#2980B9",
    "#C0392B",
    "#27AE60",
    "#7F8C8D",
    "#F39C12",
    "#1ABC9C",
    "#9B59B6",
    "#34495E"
  ];
