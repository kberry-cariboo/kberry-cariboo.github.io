  function MoneyInput(_a) {
    var _b = _a, { value, onChange, style, inputRef } = _b, rest = __objRest(_b, ["value", "onChange", "style", "inputRef"]);
    const [focused, setFocused] = useState(false);
    const display = (() => {
      if (focused) return value;
      const n = parseFloat(value);
      if (value === "" || value == null || isNaN(n)) return value != null ? value : "";
      return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    })();
    return /* @__PURE__ */ React.createElement(
      "input",
      __spreadProps(__spreadValues({}, rest), {
        ref: inputRef,
        type: "text",
        inputMode: "decimal",
        value: display,
        onFocus: (e) => {
          setFocused(true);
          rest.onFocus && rest.onFocus(e);
        },
        onBlur: (e) => {
          setFocused(false);
          rest.onBlur && rest.onBlur(e);
        },
        onChange: (e) => {
          const raw = e.target.value.replace(/,/g, "");
          if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) onChange(raw);
        },
        style
      })
    );
  }
  function toast(message, kind = "success") {
    try {
      window.dispatchEvent(new CustomEvent("cf:toast", { detail: { message, kind } }));
    } catch (err) {
      // Toasts are advisory. If the event can't be dispatched the user
      // simply doesn't see a confirmation.
    }
  }
  // Small FIFO queue (max 3) so a save-error toast can't be silently
  // overwritten by a routine success toast landing a moment later — each
  // queued message gets its own dwell time before the next one shows.
  // Errors dwell longer and are never dropped to make room; if the queue is
  // full, the oldest non-error message is bumped first.
  function FeedbackToast() {
    const [queue, setQueue] = useState([]);
    const timer = useRef(null);
    useEffect(() => {
      const h = (e) => {
        setQueue((prev) => {
          const next = [...prev, e.detail];
          if (next.length > 3) {
            const idx = next.findIndex((x) => x.kind !== "error");
            next.splice(idx >= 0 ? idx : 0, 1);
          }
          return next;
        });
      };
      window.addEventListener("cf:toast", h);
      return () => window.removeEventListener("cf:toast", h);
    }, []);
    useEffect(() => {
      if (!queue.length || timer.current) return;
      const dur = queue[0].kind === "error" ? 4500 : 3200;
      timer.current = setTimeout(() => {
        timer.current = null;
        setQueue((prev) => prev.slice(1));
      }, dur);
    }, [queue]);
    useEffect(() => () => {
      if (timer.current) clearTimeout(timer.current);
    }, []);
    const t = queue[0];
    const dismiss = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      setQueue((prev) => prev.slice(1));
    };
    // The live-region container stays mounted (even with nothing to show) so
    // screen readers pick up the change reliably \u2014 a role="status" element
    // that's inserted into the DOM already carrying its text (the old
    // `if (!t) return null` here unmounted and remounted a fresh node per
    // toast) is easy for assistive tech to miss, since live-region
    // announcements are triggered by content changing inside an
    // already-present node, not by the node itself appearing.
    return /* @__PURE__ */ React.createElement(
      "div",
      { role: "status", "aria-live": "polite" },
      t && /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: dismiss,
          className: "feedback-toast",
          style: { background: t.kind === "error" ? "var(--red)" : "var(--primary)" }
        },
        /* @__PURE__ */ React.createElement("span", null, t.kind === "error" ? "\u26A0" : "\u2713"),
        t.message,
        queue.length > 1 && /* @__PURE__ */ React.createElement("span", { className: "toast-count-badge" }, "+", queue.length - 1)
      )
    );
  }
  function UndoToast({ entry, count = 1, onUndo, onDismiss }) {
    const [secs, setSecs] = useState(5);
    // Restart the countdown when a further delete lands while the toast is
    // still up — the newest deletion gets the full undo window.
    useEffect(() => {
      setSecs(5);
      const iv = setInterval(() => setSecs((s) => {
        if (s <= 1) {
          clearInterval(iv);
          onDismiss();
          return 0;
        }
        return s - 1;
      }), 1e3);
      return () => clearInterval(iv);
    }, [entry, count]);
    return /* @__PURE__ */ React.createElement("div", { className: "undo-toast" }, /* @__PURE__ */ React.createElement("span", null, '"', entry.desc.slice(0, 30), entry.desc.length > 30 ? "\u2026" : "", '" deleted', count > 1 ? ` (+${count - 1} more)` : ""), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onUndo,
        className: "undo-btn"
      },
      "\u21A9 Undo"
    ), /* @__PURE__ */ React.createElement("span", { className: "undo-countdown" }, secs, "s"));
  }
  function LoginView() {
    const configured = isSupabaseConfigured();
    const [mode, setMode] = useState("signin");
    const [email, setEmail] = useState(() => {
      try {
        return localStorage.getItem("cf_saved_email") || "";
      } catch (e) {
        return "";
      }
    });
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(() => {
      try {
        return !!localStorage.getItem("cf_saved_email");
      } catch (e) {
        return false;
      }
    });
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const rememberEmail = (e) => {
      if (remember) {
        try {
          localStorage.setItem("cf_saved_email", e);
        } catch (err) {
          // Storage can throw outright in private/partitioned modes.
          // Nothing here is essential to the current interaction, so a
          // failure is genuinely ignorable — real save failures surface via
          // notifyStorageWriteFailure.
        }
      } else {
        try {
          localStorage.removeItem("cf_saved_email");
        } catch (err) {
          // Storage can throw outright in private/partitioned modes.
          // Nothing here is essential to the current interaction, so a
          // failure is genuinely ignorable — real save failures surface via
          // notifyStorageWriteFailure.
        }
      }
    };
    const attemptLogin = async () => {
      const e = email.trim().toLowerCase();
      if (mode === "forgot") {
        if (!e) {
          setError("Please enter your email address.");
          return;
        }
        setLoading(true);
        setError("");
        setInfo("");
        try {
          await sbResetPassword(e);
          // Same message regardless of whether the address has an account —
          // Supabase itself doesn't reveal that either, so echoing it back
          // here would just be an account-enumeration leak with extra steps.
          setInfo("If an account exists for that email, a password reset link has been sent.");
        } catch (err) {
          setError(err.message || "Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
        return;
      }
      if (!e || !password) {
        setError("Please enter your email and password.");
        return;
      }
      if (mode === "signup" && password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      setLoading(true);
      setError("");
      setInfo("");
      try {
        if (mode === "signin") {
          await sbSignIn(e, password);
          rememberEmail(e);
        } else {
          await sbSignUp(e, password);
          rememberEmail(e);
          setInfo("Account created! If your project requires email confirmation, check your inbox, then sign in below.");
          setMode("signin");
          setPassword("");
        }
      } catch (err) {
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    const goToForgot = () => {
      setMode("forgot");
      setPassword("");
      setError("");
      setInfo("");
    };
    const backToSignIn = () => {
      setMode("signin");
      setError("");
      setInfo("");
    };
    if (!configured) {
      return /* @__PURE__ */ React.createElement("div", { className: "household-onboard-wrap text-center" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "login-notconfigured-logo" }), /* @__PURE__ */ React.createElement("div", { className: "login-notconfigured-title" }, "Supabase isn't configured yet"), /* @__PURE__ */ React.createElement("div", { className: "login-notconfigured-desc" }, "Create a free project at supabase.com, run supabase/schema.sql in its SQL editor, then paste your project URL and anon key into src/lib/supabase-config.js and rebuild."));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "household-onboard-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "household-onboard-inner" }, /* @__PURE__ */ React.createElement("div", { className: "login-header" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "household-onboard-logo" }), /* @__PURE__ */ React.createElement("div", { className: "household-onboard-email" }, "Personal budget & cash flow tracker")), /* @__PURE__ */ React.createElement("div", { className: "household-onboard-card" }, /* @__PURE__ */ React.createElement("div", { className: "household-onboard-title" }, mode === "signin" ? "Sign in to your account" : mode === "signup" ? "Create your account" : "Reset your password"), mode !== "forgot" && /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-6 justify-center mb-20" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("signin");
          setError("");
          setInfo("");
        },
        className: "household-mode-btn",
        style: {
          background: mode === "signin" ? "var(--stripe)" : "transparent",
          color: mode === "signin" ? "var(--text)" : "var(--textLt)"
        }
      },
      "Sign in"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("signup");
          setError("");
          setInfo("");
        },
        className: "household-mode-btn",
        style: {
          background: mode === "signup" ? "var(--stripe)" : "transparent",
          color: mode === "signup" ? "var(--text)" : "var(--textLt)"
        }
      },
      "Create account"
    )), mode === "forgot" && /* @__PURE__ */ React.createElement("div", { className: "household-onboard-subtitle mb-16" }, "Enter the email on your account and we'll send you a link to reset your password."), /* @__PURE__ */ React.createElement("div", { className: "mb-16" }, /* @__PURE__ */ React.createElement("label", { className: "auth-field-label" }, "Email address"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        autoComplete: "email",
        autoFocus: mode === "forgot",
        value: email,
        onChange: (e) => {
          setEmail(e.target.value);
          setError("");
        },
        onKeyDown: (e) => {
          var _a;
          if (mode === "forgot") {
            if (e.key === "Enter") attemptLogin();
            return;
          }
          return e.key === "Enter" && ((_a = document.getElementById("pw-input")) == null ? void 0 : _a.focus());
        },
        placeholder: "your@email.com",
        className: "auth-input"
      }
    )), mode !== "forgot" && /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "auth-field-label" }, "Password"), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "pw-input",
        type: showPw ? "text" : "password",
        autoComplete: mode === "signin" ? "current-password" : "new-password",
        value: password,
        onChange: (e) => {
          setPassword(e.target.value);
          setError("");
        },
        onKeyDown: (e) => e.key === "Enter" && attemptLogin(),
        placeholder: mode === "signin" ? "Enter your password" : "At least 8 characters",
        className: "auth-input auth-input--pw"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowPw((v) => !v),
        "aria-label": showPw ? "Hide password" : "Show password",
        className: "auth-pw-toggle"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: showPw ? "eye-off" : "eye", size: 17 })
    ))), mode === "signin" && /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: goToForgot, className: "ai-settings-link" }, "Forgot password?")), mode !== "forgot" && /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 mb-20" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        id: "remember-chk",
        checked: remember,
        onChange: (e) => setRemember(e.target.checked),
        className: "remember-checkbox"
      }
    ), /* @__PURE__ */ React.createElement("label", { htmlFor: "remember-chk", className: "remember-label" }, "Remember my email")), error && /* @__PURE__ */ React.createElement("div", { className: "cf-error-banner mb-16", role: "alert" }, error), /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite" }, info && /* @__PURE__ */ React.createElement("div", { className: "cf-info-banner mb-16" }, info)), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: attemptLogin,
        disabled: loading,
        className: "auth-submit-btn",
        style: {
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1
        }
      },
      loading ? mode === "signin" ? "Signing in\u2026" : mode === "signup" ? "Creating account\u2026" : "Sending reset link\u2026" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"
    ), mode === "forgot" && /* @__PURE__ */ React.createElement("div", { className: "mt-14 text-center" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: backToSignIn, className: "ai-settings-link" }, "\u2190 Back to sign in"))), mode !== "forgot" && /* @__PURE__ */ React.createElement("div", { className: "login-footer-note" }, "Your data is stored in your own Supabase project.", /* @__PURE__ */ React.createElement("br", null), "Family members can join your household with an invite code after signing in.")));
  }
  function LockScreen({ sessionUser, onUnlock, onSignOut }) {
    const [hasBiometric] = useState(() => !!getBiometricCredId(sessionUser.id));
    const [mode, setMode] = useState(() => hasBiometric ? "biometric" : "password");
    const [checking, setChecking] = useState(false);
    const [bioError, setBioError] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [pwError, setPwError] = useState("");
    const [loading, setLoading] = useState(false);
    const triedOnMount = useRef(false);
    const tryBiometric = async () => {
      setChecking(true);
      setBioError("");
      try {
        await verifyBiometric(sessionUser.id);
        onUnlock();
      } catch (e) {
        setBioError("Couldn't verify — try again, or use your password.");
      } finally {
        setChecking(false);
      }
    };
    useEffect(() => {
      if (hasBiometric && !triedOnMount.current) {
        triedOnMount.current = true;
        tryBiometric();
      }
    }, []);
    const unlockWithPassword = async () => {
      if (!password) {
        setPwError("Enter your password.");
        return;
      }
      setLoading(true);
      setPwError("");
      try {
        await sbSignIn(sessionUser.email, password);
        onUnlock();
      } catch (e) {
        setPwError(e.message || "That password didn't work.");
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "lockscreen-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "lockscreen-inner" }, /* @__PURE__ */ React.createElement("div", { className: "household-onboard-header" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "lockscreen-logo" }), /* @__PURE__ */ React.createElement("div", { className: "lockscreen-welcome" }, "Welcome back", sessionUser.fullName ? `, ${sessionUser.fullName.split(" ")[0]}` : ""), /* @__PURE__ */ React.createElement("div", { className: "household-onboard-email" }, "This device locked after being idle.")), /* @__PURE__ */ React.createElement("div", { className: "lockscreen-card" }, mode === "biometric" ? /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("div", { className: "lockscreen-bio-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "lock", size: 28 })), bioError && /* @__PURE__ */ React.createElement("div", { className: "cf-error-banner mb-14", role: "alert" }, bioError), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: tryBiometric,
        disabled: checking,
        className: "lockscreen-primary-btn",
        style: {
          cursor: checking ? "wait" : "pointer",
          opacity: checking ? 0.7 : 1,
          marginBottom: 10
        }
      },
      checking ? "Checking…" : "Unlock with fingerprint / face"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("password");
          setBioError("");
        },
        className: "lockscreen-secondary-btn"
      },
      "Use password instead"
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "auth-field-label" }, "Password"), /* @__PURE__ */ React.createElement("div", { className: "relative mb-14" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: showPw ? "text" : "password",
        autoFocus: true,
        autoComplete: "current-password",
        value: password,
        onChange: (e) => {
          setPassword(e.target.value);
          setPwError("");
        },
        onKeyDown: (e) => e.key === "Enter" && unlockWithPassword(),
        placeholder: "Enter your password",
        className: "auth-input auth-input--pw"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowPw((v) => !v),
        "aria-label": showPw ? "Hide password" : "Show password",
        className: "auth-pw-toggle"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: showPw ? "eye-off" : "eye", size: 17 })
    )), pwError && /* @__PURE__ */ React.createElement("div", { className: "cf-error-banner mb-14", role: "alert" }, pwError), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: unlockWithPassword,
        disabled: loading,
        className: "lockscreen-primary-btn",
        style: {
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          marginBottom: hasBiometric ? 10 : 0
        }
      },
      loading ? "Unlocking…" : "Unlock"
    ), hasBiometric && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("biometric");
          setPwError("");
        },
        className: "lockscreen-secondary-btn"
      },
      "Use fingerprint / face instead"
    ))), /* @__PURE__ */ React.createElement("div", { className: "household-signout-wrap" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onSignOut,
        className: "household-signout-btn"
      },
      "Not you? Sign out"
    ))));
  }
  function SelfTestView() {
    const results = useMemo(() => {
      const out = [];
      const t = (name, fn) => {
        try {
          const v = fn();
          out.push({ name, ok: !!v, detail: v === true ? "" : String(v) });
        } catch (e) {
          out.push({ name, ok: false, detail: e.message });
        }
      };
      const entry = { id: 1, desc: "T", type: "expense", amount: 100, repeats: true, recurEvery: 1, recurUnit: "month", startDate: "2026-01-15", recurEnd: "" };
      const evs = expandEntries([entry], 2026, {});
      t("expandEntries monthly = 12 events", () => evs.length === 12);
      t("expandEntries carries recurUnit", () => evs[0].recurUnit === "month");
      const semi = __spreadProps(__spreadValues({}, entry), { id: 2, recurUnit: "semimonth", startDate: "2026-01-01" });
      t("semimonthly = 24 events", () => expandEntries([semi], 2026, {}).length === 24);
      const biw = __spreadProps(__spreadValues({}, entry), { id: 3, recurUnit: "week", recurEvery: 2, startDate: "2026-01-02" });
      const bevs = expandEntries([biw], 2026, {});
      t("bi-weekly \u2248 26 events", () => bevs.length >= 25 && bevs.length <= 27);
      const sums = getMonthSummaries(computeFlow(evs, 1e3), 1e3);
      t("getMonthSummaries 12 months", () => sums.length === 12);
      t("Jan close = open - expense", () => Math.abs(sums[0].close - (1e3 - 100)) < 0.01);
      const ov = {};
      ov[evs[0].id] = { amount: 250 };
      const evs2 = expandEntries([entry], 2026, ov);
      t("override changes amount", () => evs2[0].amount === 250 && evs2[0].isOverride === true);
      // Per-day keys (banner snooze, once-a-day notification guards) must roll
      // over at local midnight. toISOString() rolls over at 00:00 UTC, which
      // west of Greenwich is mid-afternoon the day before.
      t("todayStr() is the local date, not the UTC one", () => {
        const now = /* @__PURE__ */ new Date();
        const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        return todayStr() === expected;
      });
      t("todayStr() matches localDateStr for an evening instant", () => {
        // 22:30 local on any date: still today locally, already tomorrow in UTC
        // for every timezone west of UTC+01:30.
        const d = new Date(2026, 2, 10, 22, 30, 0);
        const viaUtc = d.toISOString().slice(0, 10);
        const local = localDateStr(d);
        // Only assert the divergence where it actually exists; east of
        // Greenwich the two legitimately agree at this hour.
        return d.getTimezoneOffset() > 90 ? local === "2026-03-10" && viaUtc !== local : local === "2026-03-10";
      });
      t("localStorage roundtrip", () => {
        localStorage.setItem("cf_selftest", "x");
        const v = localStorage.getItem("cf_selftest") === "x";
        localStorage.removeItem("cf_selftest");
        return v;
      });
      t("sessionStorage roundtrip", () => {
        sessionStorage.setItem("cf_st", "y");
        const v = sessionStorage.getItem("cf_st") === "y";
        sessionStorage.removeItem("cf_st");
        return v;
      });
      t("React present (v" + (typeof React !== "undefined" && React.version || "?") + ")", () => typeof React !== "undefined" && !!React.useState && !!ReactDOM.createRoot);
      t("Recharts present", () => typeof window.Recharts !== "undefined");
      t("Service worker API present", () => "serviceWorker" in navigator);
      t("navigator.onLine readable", () => typeof navigator.onLine === "boolean");
      t("canvas (attachments) supported", () => {
        const c = document.createElement("canvas");
        return !!c.getContext("2d");
      });
      t("Sync payload round-trip keeps all fields", () => {
        const payload = {
          entries: [entry],
          overridesByYr: {},
          yearConfigs: [],
          categories: ["A"],
          categoryColors: { A: "#123456" },
          budgetTargets: {},
          templates: [],
          completed: {},
          activeYear: 2026,
          alertThreshold: 500,
          darkMode: false,
          forecastHorizon: 60,
          colOrder: ["desc"],
          regFilter: "all",
          regFilterCats: [],
          regFilterScheds: [],
          regFilterStatus: [],
          goals: [{ id: 1, name: "G", target: 100, saved: 25, monthly: 10 }],
          dashHidden: {},
          dashOrder: [],
          schemaVersion: SCHEMA_VERSION,
          savedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        const rt = JSON.parse(JSON.stringify(payload));
        return Object.keys(payload).every((k) => k in rt) && rt.schemaVersion === SCHEMA_VERSION && rt.goals[0].saved === 25;
      });
      t("receipts are per-occurrence only", () => {
        const ent = __spreadProps(__spreadValues({}, entry), { id: 9, attachment: "base64LEGACY" });
        const evsA = expandEntries([ent], 2026, {});
        const ovA = {};
        ovA[evsA[0].id] = { attachment: "base64OVERRIDE" };
        const evsB = expandEntries([ent], 2026, ovA);
        return evsA[0].attachment === null && evsB[0].attachment === "base64OVERRIDE" && evsB[1].attachment === null;
      });
      t("legacy entry attachment migrates to start-date occurrence", () => {
        const ent = { id: 9, desc: "T", type: "expense", amount: 5, repeats: true, recurUnit: "month", recurEvery: 1, startDate: "2026-01-15", attachment: "base64LEGACY" };
        const res = moveEntryAttachmentsToOverrides([ent], {});
        const ov = res.overridesByYr[2026] && res.overridesByYr[2026]["9-2026-0-15"];
        return res.moved === 1 && res.entries[0].attachment === void 0 && !!ov && ov.attachment === "base64LEGACY";
      });
      // Payroll deposit dates. 2026: the 15th is a Sunday in Feb/Mar/Nov and a
      // Saturday in Aug; Aug 1 is a Saturday; Jan 1 2028 is a Saturday.
      const payroll = { id: 20, desc: "Ken - Payroll (15th)", type: "income", amount: 25e4, category: "Income", repeats: true, recurEvery: 1, recurUnit: "month", startDate: "2026-01-15", recurEnd: "" };
      const payEvs = expandEntries([payroll], 2026, {});
      const onMonth = (evs, mi) => evs.find((ev) => ev.month === mi);
      const depStr = (ev) => ev.depositDate ? localDateStr(ev.depositDate) : null;
      t("the occurrence stays on the payday, whatever day that is", () => {
        // The whole point: nothing moves. Twelve occurrences, all on the 15th,
        // so no month's income total can shift because of a weekend.
        return payEvs.length === 12 && payEvs.every((ev) => ev.day === 15) && payEvs.every((ev, i) => ev.month === i);
      });
      t("a Saturday payday is deposited the Friday before", () => {
        const aug = onMonth(payEvs, 7);
        return aug.depositShifted === true && depStr(aug) === "2026-08-14";
      });
      t("a Sunday payday is deposited the Friday before", () => {
        const feb = onMonth(payEvs, 1);
        return feb.depositShifted === true && depStr(feb) === "2026-02-13";
      });
      t("a weekday payday deposits on the day itself", () => {
        const jan = onMonth(payEvs, 0);
        return jan.depositShifted === false && depStr(jan) === "2026-01-15";
      });
      t("a payday on a stat holiday is deposited the last banking day before it", () => {
        // Canada Day 2026 is a Wednesday — a working day but not a banking one.
        const canadaDay = __spreadProps(__spreadValues({}, payroll), { id: 21, startDate: "2026-01-01" });
        const jul = onMonth(expandEntries([canadaDay], 2026, {}), 6);
        return jul.day === 1 && jul.depositShifted === true && depStr(jul) === "2026-06-30";
      });
      t("a payday on a holiday Monday steps back past the weekend too", () => {
        // BC Day 2026 is Monday 3 August: back past Sun and Sat to Fri Jul 31.
        const bcDay = __spreadProps(__spreadValues({}, payroll), { id: 22, startDate: "2026-08-03", recurUnit: "year" });
        const aug = expandEntries([bcDay], 2026, {})[0];
        return aug.day === 3 && depStr(aug) === "2026-07-31";
      });
      t("an optional BC holiday counts (Boxing Day)", () => {
        const boxing = __spreadProps(__spreadValues({}, payroll), { id: 23, startDate: "2026-12-28", recurUnit: "year" });
        // 26 Dec 2026 is a Saturday, so Boxing Day is observed Mon 28 Dec and
        // Christmas Day is Fri 25 Dec: the last banking day is Thu 24 Dec.
        const dec = expandEntries([boxing], 2026, {})[0];
        return dec.day === 28 && depStr(dec) === "2026-12-24";
      });
      t("the deposit date may fall in the previous month or year", () => {
        // Nothing moves, so this is just a label — no month's totals change.
        const firstOfMonth = __spreadProps(__spreadValues({}, payroll), { id: 24, desc: "Ken - Payroll (1st)", startDate: "2026-01-01" });
        const aug = onMonth(expandEntries([firstOfMonth], 2026, {}), 7);
        const nyd = __spreadProps(__spreadValues({}, payroll), { id: 25, desc: "Ken - Payroll (1st)", startDate: "2028-01-01" });
        const jan = expandEntries([nyd], 2028, {})[0];
        return aug.month === 7 && aug.day === 1 && depStr(aug) === "2026-07-31" && jan.month === 0 && jan.day === 1 && depStr(jan) === "2027-12-31";
      });
      t("the entry itself keeps its payday", () => payroll.startDate === "2026-01-15" && expandEntries([payroll], 2026, {}).length === 12);
      t("occurrence keys are unchanged by the deposit rule", () => {
        const aug = onMonth(payEvs, 7);
        if (aug.id !== "20-2026-7-15") return aug.id;
        const ov = {};
        ov[aug.id] = { amount: 3e5 };
        const again = onMonth(expandEntries([payroll], 2026, ov), 7);
        return again.amount === 3e5 && again.day === 15 && again.depositShifted === true;
      });
      t("the rule is income-only, payroll-only and repeating-only", () => {
        const rentOn15th = __spreadProps(__spreadValues({}, payroll), { id: 26, desc: "Rent", type: "expense" });
        const payrollExpense = __spreadProps(__spreadValues({}, payroll), { id: 27, desc: "Payroll remittance", type: "expense" });
        const onceOff = __spreadProps(__spreadValues({}, payroll), { id: 28, repeats: false, startDate: "2026-08-15" });
        return onMonth(expandEntries([rentOn15th], 2026, {}), 7).depositShifted === false && onMonth(expandEntries([payrollExpense], 2026, {}), 7).depositShifted === false && expandEntries([onceOff], 2026, {})[0].depositShifted === false;
      });
      t('"Mel - Payroll" and "PAY ROLL" both read as payroll', () => {
        const mel = __spreadProps(__spreadValues({}, payroll), { id: 29, desc: "Mel - Payroll" });
        const spaced = __spreadProps(__spreadValues({}, payroll), { id: 30, desc: "PAY ROLL \u2014 Ken" });
        return onMonth(expandEntries([mel], 2026, {}), 7).depositShifted === true && onMonth(expandEntries([spaced], 2026, {}), 7).depositShifted === true;
      });
      t("moving an occurrence by hand re-reads the deposit date from where you put it", () => {
        const ov = {};
        ov["20-2026-7-15"] = { day: 17 };
        const aug = onMonth(expandEntries([payroll], 2026, ov), 7);
        return aug.day === 17 && aug.depositShifted === false;
      });
      t("BC holiday rules: the computed dates for 2026", () => {
        const h = computeBCHolidays(2026);
        const on = (d) => (h[d] || {}).name || "\u2014";
        return on("2026-02-16") === "Family Day" && on("2026-04-03") === "Good Friday" && on("2026-05-18") === "Victoria Day" && on("2026-08-03") === "British Columbia Day" && on("2026-09-30") === "National Day for Truth and Reconciliation" && on("2026-10-12") === "Thanksgiving" && on("2026-12-25") === "Christmas Day";
      });
      t("optional BC holidays are included and flagged", () => {
        const h = computeBCHolidays(2026);
        return h["2026-04-06"] && h["2026-04-06"].optional === true && h["2026-12-26"] && h["2026-12-26"].optional === true && h["2026-07-01"].optional === false;
      });
      t("a holiday on a weekend is also registered on the day it's observed", () => {
        // 1 Jan 2028 is a Saturday, observed Monday the 3rd.
        const h = computeBCHolidays(2028);
        return !!h["2028-01-01"] && /observed/.test((h["2028-01-03"] || {}).name || "");
      });
      t("a bad holiday payload is ignored rather than believed", () => {
        return parseHolidayPayload({ province: { holidays: [] } }, 2026) === null && parseHolidayPayload(null, 2026) === null && parseHolidayPayload({ holidays: [{ date: "not-a-date" }] }, 2026) === null;
      });
      t("a holiday payload is read into dates, names and optional flags", () => {
        const parsed = parseHolidayPayload({ province: { holidays: [
          { date: "2026-07-01", observedDate: "2026-07-01", nameEn: "Canada Day", optional: 0 },
          { date: "2026-12-26", observedDate: "2026-12-28", nameEn: "Boxing Day", optional: 1 },
          { date: "2025-12-25", nameEn: "Wrong year", optional: 0 }
        ] } }, 2026);
        return parsed["2026-07-01"].name === "Canada Day" && parsed["2026-12-28"].optional === true && parsed["2025-12-25"] === void 0;
      });
      // These run against the same module-level registry the live budget reads,
      // so each one puts it back before returning.
      const withStoredHolidays = (stored, fn) => {
        const before = getStoredHolidays();
        try {
          setStoredHolidays(stored);
          return fn();
        } finally {
          setStoredHolidays(before);
        }
      };
      t("a stored year replaces the computed one outright", () => withStoredHolidays(
        { 2026: { "2026-03-17": { name: "QA Day", optional: false, source: "manual" } } },
        () => {
          const rows = holidayRowsForYear(2026);
          // One date, theirs — not merged on top of the thirteen built-in ones,
          // or removing a holiday would be impossible to express.
          return rows.length === 1 && rows[0].name === "QA Day" && rows[0].source === "manual" && isYearStored(2026) === true && holidaysForYear(2026)["2026-07-01"] === void 0;
        }
      ));
      t("a year with nothing stored falls back to the BC rules", () => withStoredHolidays({}, () => {
        const rows = holidayRowsForYear(2026);
        return rows.length > 10 && rows.every((r) => r.source === "computed") && isYearStored(2026) === false;
      }));
      t("an emptied year stays empty instead of reverting to the rules", () => withStoredHolidays(
        // What Settings writes when the last row is removed, and what the
        // database sends back for a year whose holiday_years row has no
        // holidays rows.
        { 2026: {} },
        () => holidayRowsForYear(2026).length === 0 && isYearStored(2026) === true
      ));
      t("a year saved by an older build with a tombstone key still reads as empty", () => withStoredHolidays(
        { 2026: { _none: true } },
        () => holidayRowsForYear(2026).length === 0 && isYearStored(2026) === true
      ));
      t("fetching keeps hand-made dates and replaces published ones", () => {
        const existing = {
          "2026-07-01": { name: "Canada Day", optional: false, source: "published" },
          "2026-09-15": { name: "Ours", optional: false, source: "manual" },
          "2026-11-11": { name: "Remembrance Day", optional: false, source: "published" }
        };
        const fetched = {
          "2026-07-01": { name: "Canada Day (renamed)", optional: false },
          "2026-12-25": { name: "Christmas Day", optional: false }
        };
        const res = mergeFetchedHolidays(existing, fetched);
        return res.days["2026-09-15"].source === "manual" && res.days["2026-07-01"].name === "Canada Day (renamed)" && res.days["2026-11-11"] === void 0 && res.added === 1 && res.updated === 1 && res.removed === 1 && res.kept === 1;
      });
      t("a fetch never overwrites a date the user set by hand", () => {
        const res = mergeFetchedHolidays(
          { "2026-07-01": { name: "Our own July 1", optional: false, source: "manual" } },
          { "2026-07-01": { name: "Canada Day", optional: false } }
        );
        return res.days["2026-07-01"].name === "Our own July 1" && res.kept === 1;
      });
      t("editing an unstored year starts from the built-in dates", () => withStoredHolidays({}, () => {
        const seeded = holidayYearForEditing(2026);
        // Materialised from the rules, so adding one date can't silently drop
        // the other twelve.
        return Object.keys(seeded).length > 10 && seeded["2026-07-01"].name === "Canada Day" && seeded["2026-07-01"].source === "computed";
      }));
      t("reading with an explicit list leaves the shared one alone", () => withStoredHolidays(
        { 2026: { "2026-06-06": { name: "Live", optional: false, source: "manual" } } },
        () => {
          // What Settings does while showing a year. If this leaked, a panel
          // rendered with a fixture would silently become what the budget uses.
          holidayRowsForYear(2026, { 2026: { "2026-01-02": { name: "Fixture", optional: false, source: "manual" } } });
          holidayYearForEditing(2026, {});
          return holidaysForYear(2026)["2026-06-06"].name === "Live";
        }
      ));
      t("editing an empty stored year starts from empty, not from the rules", () => withStoredHolidays(
        { 2026: {} },
        () => Object.keys(holidayYearForEditing(2026)).length === 0
      ));
      t("editing a payroll entry splits on the payday", () => {
        const res = splitEntryEditFromCurrentMonth([payroll], 20, __spreadProps(__spreadValues({}, payroll), { amount: 26e4 }), new Date(2026, 7, 10));
        if (!res.newId) return "no split";
        const seg = res.entries.find((e) => e.id === res.newId);
        return seg.startDate === "2026-08-15" && res.entries[0].recurEnd === "2026-08-14";
      });
      t("multi-select filter math ([]=all)", () => {
        const items = [{ cat: "A" }, { cat: "B" }, { cat: "C" }];
        const apply = (sel) => items.filter((x) => !sel.length || sel.includes(x.cat)).length;
        return apply([]) === 3 && apply(["A"]) === 1 && apply(["A", "C"]) === 2;
      });
      t("amount search: >, <, exact (amounts are cents)", () => matchesAmountQuery(">500", 6e4) === true && matchesAmountQuery(">500", 4e4) === false && matchesAmountQuery("<100", 5e3) === true && matchesAmountQuery("49.50", 4950) === true && matchesAmountQuery("rent", 1e4) === null);
      t("fmtVarRange equal/range/empty (amounts are cents)", () => fmtVarRange([1e4, 1e4]) === "\u2248 $100" && fmtVarRange([12e4, 24e4]) === "$1.2k\u2013$2.4k" && fmtVarRange([]) === "Variable");
      t("debt sim: avalanche \u2264 snowball interest", () => {
        const debts = [{ label: "HighRate", bal: 5e3, rate: 22, pmt: 150 }, { label: "LowRate", bal: 2e3, rate: 5, pmt: 100 }];
        const av = simulateDebtStrategy(debts, 100, "avalanche");
        const sn = simulateDebtStrategy(debts, 100, "snowball");
        return !!av && !!sn && av.totalInterest <= sn.totalInterest && av.months > 0 && av.payoffOrder.length === 2;
      });
      const renderCheck = (label, el) => {
        t("renders: " + label, () => {
          const host = document.createElement("div");
          const root2 = ReactDOM.createRoot(host);
          try {
            if (ReactDOM.flushSync) ReactDOM.flushSync(() => root2.render(el));
            else root2.render(el);
            return true;
          } finally {
            setTimeout(() => {
              try {
                root2.unmount();
              } catch (e) {
                // Teardown of a throwaway test root — a failure here can't
                // affect the app.
              }
            }, 0);
          }
        });
      };
      const noop = () => {
      };
      renderCheck("EntryForm", React.createElement(EntryForm, { initial: null, onSave: noop, onCancel: noop, categories: ["Housing"] }));
      renderCheck("OccurrenceEditModal", React.createElement(OccurrenceEditModal, { ev: { id: "x", desc: "T", amount: 10, month: 0, day: 1, notes: "", isOverride: false, repeats: true }, orig: { desc: "T" }, onSave: noop, onCancel: noop, onReset: null }));
      renderCheck("HelpTip", React.createElement(HelpTip, { label: "Field", text: "Help copy." }));
      renderCheck("HolidaySettings", React.createElement(HolidaySettings, { holidays: {}, setHolidays: noop, years: [2026], activeYear: 2026 }));
      renderCheck("UndoToast", React.createElement(UndoToast, { entry: { desc: "Test" }, count: 2, onUndo: noop, onDismiss: noop }));
      renderCheck("ReceiptLightbox", React.createElement(ReceiptLightbox, { src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", onClose: noop }));
      renderCheck("ContextMenu", React.createElement(ContextMenu, { x: 10, y: 10, items: [{ icon: "\u270E", label: "Edit", action: noop }], onClose: noop }));
      renderCheck("EntriesView (empty)", React.createElement(EntriesView, { entries: [], setEntries: noop, addEntry: noop, categories: ["A"], activeYear: 2026 }));
      renderCheck("BudgetView (empty)", React.createElement(BudgetView, { flow: [], openBal: 0, entries: [], setOverride: noop, clearOverride: noop, categories: ["A"], setEntries: noop, addEntry: noop, view: "monthly", setView: noop, monthIdx: 0, setMonthIdx: noop }));
      renderCheck("ForecastView (empty)", React.createElement(ForecastView, { yearFlows: {}, yearConfigs: [], openBalByYear: {} }));
      renderCheck("DashboardView (empty)", React.createElement(DashboardView, { flow: [], openBal: 0, yearFlows: {}, yearConfigs: [], alertThreshold: 500, activeYear: 2026 }));
      renderCheck("PlanView (empty)", React.createElement(PlanView, { flow: [], openBal: 0, entries: [], goals: [], categories: ["A"], alertThreshold: 500, activeYear: 2026 }));
      renderCheck("BottomNav", React.createElement(BottomNav, { tab: "dashboard", setTab: noop }));
      t("goal progress math (pct, projection)", () => {
        const g = { target: 3600, saved: 900, monthly: 300 };
        const pct = Math.min(100, Math.round(g.saved / g.target * 100));
        const monthsLeft = Math.ceil((g.target - g.saved) / g.monthly);
        return pct === 25 && monthsLeft === 9;
      });
      t("debt sim: diverging payments \u2192 null", () => simulateDebtStrategy([{ label: "X", bal: 1e4, rate: 50, pmt: 10 }], 0, "avalanche") === null);
      // Notification schedule \u2014 the rows the Edge Function sends as push.
      // These are the only place the "what gets said, and when" decision is
      // made, so they're worth pinning down.
      const schedNow = new Date(2026, 2, 10);
      const schedFlow = {
        2026: [
          { id: "a-2026-2-10", type: "expense", month: 2, day: 10, amount: 5e3, desc: "Rent", balance: 1e5 },
          { id: "b-2026-2-10", type: "expense", month: 2, day: 10, amount: 2e3, desc: "Hydro", balance: 98e3 },
          { id: "c-2026-2-20", type: "expense", month: 2, day: 20, amount: 1e3, desc: "Phone", balance: 100 }
        ]
      };
      t("schedule: one row per day, bills itemised inside it", () => {
        const rows = buildNotificationSchedule({ yearFlows: schedFlow, alertThreshold: 0, now: schedNow });
        const today = rows.filter((r) => r.kind === "bills_due" && r.for_date === "2026-03-10");
        return today.length === 1 && today[0].items.length === 2 && today[0].body.split("\n").length === 2;
      });
      t("schedule: digest titles the count and total", () => {
        const rows = buildNotificationSchedule({ yearFlows: schedFlow, alertThreshold: 0, now: schedNow });
        const today = rows.find((r) => r.kind === "bills_due" && r.for_date === "2026-03-10");
        return today.title === `2 bills due today \xB7 ${fmt(7e3)}` && today.body.indexOf(`Rent \u2014 ${fmt(5e3)}`) === 0;
      });
      t("schedule: a lone bill is named, not counted", () => {
        const rows = buildNotificationSchedule({ yearFlows: schedFlow, alertThreshold: 0, now: schedNow });
        const later = rows.find((r) => r.kind === "bills_due" && r.for_date === "2026-03-20");
        return later.title === "Phone is due today" && later.body === fmt(1e3);
      });
      t("schedule: bills already marked paid are dropped", () => {
        const rows = buildNotificationSchedule({ yearFlows: schedFlow, completed: { "a-2026-2-10": true }, alertThreshold: 0, now: schedNow });
        const today = rows.find((r) => r.kind === "bills_due" && r.for_date === "2026-03-10");
        return today.items.length === 1 && today.title === "Hydro is due today";
      });
      t("schedule: separate days stay separate notifications", () => {
        const rows = buildNotificationSchedule({ yearFlows: schedFlow, alertThreshold: 0, now: schedNow });
        const dates = rows.filter((r) => r.kind === "bills_due").map((r) => r.for_date);
        return dates.length === 2 && dates.indexOf("2026-03-10") >= 0 && dates.indexOf("2026-03-20") >= 0;
      });
      t("schedule: low-balance warning lands 3 days before the dip", () => {
        const rows = buildNotificationSchedule({ yearFlows: schedFlow, alertThreshold: 5e4, now: schedNow });
        const low = rows.filter((r) => r.kind === "low_balance");
        return low.length === 1 && low[0].for_date === "2026-03-17" && low[0].occurrence_id === "";
      });
      t("schedule: nothing scheduled beyond the horizon", () => {
        const far = { 2026: [{ id: "z-2026-11-25", type: "expense", month: 11, day: 25, amount: 100, desc: "Far", balance: 1e5 }] };
        return buildNotificationSchedule({ yearFlows: far, alertThreshold: 0, now: schedNow }).length === 0;
      });
      return out;
    }, []);
    // "serviceWorker" in navigator only proves the browser has the API — it was
    // true for the whole time registration was silently failing against a
    // blob: URL, so it reported green while offline caching and push were both
    // dead. These checks await the real registration instead, and can't be part
    // of the synchronous memo above.
    const [swResults, setSwResults] = useState([]);
    useEffect(() => {
      let live = true;
      const add = (rs) => {
        if (live) setSwResults(rs);
      };
      if (!("serviceWorker" in navigator)) {
        add([{ name: "Service worker registered", ok: false, detail: "not supported in this browser" }]);
        return () => {
          live = false;
        };
      }
      Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timed out after 10s")), 1e4))
      ]).then((reg) => {
        add([
          { name: "Service worker registered + active", ok: !!reg.active, detail: reg.scope },
          { name: "showNotification available (Android's only path)", ok: typeof reg.showNotification === "function", detail: "" },
          { name: "Push subscriptions supported", ok: !!reg.pushManager, detail: "" },
          // An install with no VAPID key is a valid configuration (foreground
          // notifications only), so an empty key passes. A key that's present
          // but malformed is a real fault — it means someone intended
          // background push and it silently won't work.
          {
            name: "Push server key valid (or intentionally unset)",
            ok: !VAPID_PUBLIC_KEY || vapidKeyLooksValid(VAPID_PUBLIC_KEY),
            detail: VAPID_PUBLIC_KEY && !vapidKeyLooksValid(VAPID_PUBLIC_KEY)
              ? "VAPID_PUBLIC_KEY is not an 87-char base64url P-256 point — re-run scripts/gen-vapid-keys.js"
              : ""
          }
        ]);
      }).catch((e) => {
        add([{ name: "Service worker registered + active", ok: false, detail: e.message }]);
      });
      return () => {
        live = false;
      };
    }, []);
    const allResults = results.concat(swResults);
    const passed = allResults.filter((r) => r.ok).length;
    return /* @__PURE__ */ React.createElement("div", { className: "selftest-wrap" }, /* @__PURE__ */ React.createElement("h2", { className: "selftest-h2" }, "CashFlow Self-Test"), /* @__PURE__ */ React.createElement("div", { className: "selftest-count", style: { color: passed === allResults.length ? "var(--greenDk)" : "var(--red)" } }, passed, "/", allResults.length, " checks passed"), allResults.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "selftest-row" }, /* @__PURE__ */ React.createElement("span", { className: "selftest-mark", style: { color: r.ok ? "var(--greenDk)" : "var(--red)" } }, r.ok ? "\u2713" : "\u2717"), /* @__PURE__ */ React.createElement("span", { className: "c-text flex-1" }, r.name), r.detail && !r.ok && /* @__PURE__ */ React.createElement("span", { className: "selftest-detail" }, r.detail))), /* @__PURE__ */ React.createElement("a", { href: location.pathname, className: "selftest-back-link" }, "\u2190 Back to app"));
  }
  function BudgetSubTabs({ value, onChange }) {
    const ref = useRef(null);
    const roving = useRovingTabs();
    useEffect(() => {
      const el = ref.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const btn = el.querySelector('[data-active="true"]');
      if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
    }, [value]);
    const tabs = [
      { id: "monthly", label: "Monthly", short: "Monthly", icon: "grid" },
      { id: "daily", label: "Daily", short: "Daily", icon: "day", cls: "bp-daily" },
      { id: "bva", label: "Budget vs Actual", short: "vs Actual", icon: "scale" },
      { id: "forecast", label: "Forecast", short: "Forecast", icon: "trending-up" },
      { id: "entries", label: "Entries", short: "Entries", icon: "file-list" }
    ];
    return /* @__PURE__ */ React.createElement("div", { ref, role: "group", "aria-label": "Sub-views", onKeyDown: roving.onKeyDown, className: "budget-subtabs budget-subtabs-row" }, tabs.map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.id,
        "data-active": value === s.id,
        // data-active styles the pill; aria-pressed is what actually tells a
        // screen reader which sub-tab is showing. Matches the month pills.
        "aria-pressed": value === s.id,
        // One tab stop for the strip; arrow keys move within it.
        tabIndex: value === s.id ? 0 : -1,
        className: "budget-subtab-pill budget-subtab-btn" + (s.cls ? " " + s.cls : ""),
        onClick: () => {
          haptic();
          onChange(s.id);
        },
        "aria-label": s.label,
        title: s.label,
        style: {
          // --stripe is byte-identical to --bg in the light theme, so an
          // inactive pill with border:none had no visible container at all —
          // on mobile, where the labels were hidden too, the tabs read as
          // loose glyphs floating on the page. --border is the same inactive
          // surface .cf-pill already uses everywhere else.
          background: value === s.id ? "var(--primary)" : "var(--border)",
          color: value === s.id ? "#fff" : "var(--textMid)"
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: s.icon, size: 15, style: { verticalAlign: "middle", flexShrink: 0 } }),
      /* @__PURE__ */ React.createElement("span", { className: "bp-label-full" }, " ", s.label),
      /* @__PURE__ */ React.createElement("span", { className: "bp-label-short" }, s.short || s.label)
    )));
  }
  function PlanSubTabs({ value, onChange }) {
    const ref = useRef(null);
    const roving = useRovingTabs();
    useEffect(() => {
      const el = ref.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const btn = el.querySelector('[data-active="true"]');
      if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
    }, [value]);
    const tabs = [
      { id: "debt", label: "Debt Payoff", short: "Debt", icon: "credit-card" },
      { id: "strategy", label: "Payoff Strategy", short: "Strategy", icon: "mountain" },
      { id: "goals", label: "Savings Goals", short: "Goals", icon: "target" }
    ];
    return /* @__PURE__ */ React.createElement("div", { ref, role: "group", "aria-label": "Sub-views", onKeyDown: roving.onKeyDown, className: "budget-subtabs budget-subtabs-row" }, tabs.map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.id,
        "data-active": value === s.id,
        // data-active styles the pill; aria-pressed is what actually tells a
        // screen reader which sub-tab is showing. Matches the month pills.
        "aria-pressed": value === s.id,
        // One tab stop for the strip; arrow keys move within it.
        tabIndex: value === s.id ? 0 : -1,
        className: "budget-subtab-pill budget-subtab-btn",
        onClick: () => {
          haptic();
          onChange(s.id);
        },
        "aria-label": s.label,
        title: s.label,
        style: {
          // --stripe is byte-identical to --bg in the light theme, so an
          // inactive pill with border:none had no visible container at all —
          // on mobile, where the labels were hidden too, the tabs read as
          // loose glyphs floating on the page. --border is the same inactive
          // surface .cf-pill already uses everywhere else.
          background: value === s.id ? "var(--primary)" : "var(--border)",
          color: value === s.id ? "#fff" : "var(--textMid)"
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: s.icon, size: 15, style: { verticalAlign: "middle", flexShrink: 0 } }),
      /* @__PURE__ */ React.createElement("span", { className: "bp-label-full" }, " ", s.label),
      /* @__PURE__ */ React.createElement("span", { className: "bp-label-short" }, s.short || s.label)
    )));
  }
