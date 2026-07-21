  function ShortcutsHelp({ onClose }) {
    const shortcuts = [
      ["1\u20135", "Switch tabs (in order)"],
      ["D / B / P / A / S", "Dashboard \xB7 Budget \xB7 Plan \xB7 AI \xB7 Settings"],
      ["F / R", "Budget \u2192 Forecast \xB7 Entries"],
      ["N", "Quick add entry"],
      ["/", "Focus search"],
      ["\u2190  \u2192", "Previous / next month (Budget)"],
      ["Esc", "Clear search / close"],
      ["?", "Show this help"]
    ];
    return /* @__PURE__ */ React.createElement("div", { onClick: onClose, className: "shortcuts-backdrop" }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), className: "shortcuts-card" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "shortcuts-title" }, "Keyboard Shortcuts"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": "Close", title: "Close", className: "shortcuts-close" }, "\u2715")), shortcuts.map(([key, desc]) => /* @__PURE__ */ React.createElement("div", { key, className: "shortcut-row" }, /* @__PURE__ */ React.createElement("span", { className: "txm" }, desc), /* @__PURE__ */ React.createElement("kbd", { className: "cf-text-mono-13 shortcut-kbd" }, key))), /* @__PURE__ */ React.createElement("div", { className: "shortcuts-footer" }, "Shortcuts work when not typing in a field")));
  }
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
    if (!t) return null;
    const dismiss = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      setQueue((prev) => prev.slice(1));
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "status",
        onClick: dismiss,
        className: "feedback-toast",
        style: { background: t.kind === "error" ? "var(--red)" : "var(--primary)" }
      },
      /* @__PURE__ */ React.createElement("span", null, t.kind === "error" ? "\u26A0" : "\u2713"),
      t.message,
      queue.length > 1 && /* @__PURE__ */ React.createElement("span", { className: "toast-count-badge" }, "+", queue.length - 1)
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
        }
      } else {
        try {
          localStorage.removeItem("cf_saved_email");
        } catch (err) {
        }
      }
    };
    const attemptLogin = async () => {
      const e = email.trim().toLowerCase();
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
    if (!configured) {
      return /* @__PURE__ */ React.createElement("div", { className: "household-onboard-wrap text-center" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "login-notconfigured-logo" }), /* @__PURE__ */ React.createElement("div", { className: "login-notconfigured-title" }, "Supabase isn't configured yet"), /* @__PURE__ */ React.createElement("div", { className: "login-notconfigured-desc" }, "Create a free project at supabase.com, run supabase/schema.sql in its SQL editor, then paste your project URL and anon key into src/lib/supabase-config.js and rebuild."));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "household-onboard-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "household-onboard-inner" }, /* @__PURE__ */ React.createElement("div", { className: "login-header" }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", className: "household-onboard-logo" }), /* @__PURE__ */ React.createElement("div", { className: "household-onboard-email" }, "Personal budget & cash flow tracker")), /* @__PURE__ */ React.createElement("div", { className: "household-onboard-card" }, /* @__PURE__ */ React.createElement("div", { className: "household-onboard-title" }, mode === "signin" ? "Sign in to your account" : "Create your account"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-6 justify-center mb-20" }, /* @__PURE__ */ React.createElement(
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
    )), /* @__PURE__ */ React.createElement("div", { className: "mb-16" }, /* @__PURE__ */ React.createElement("label", { className: "auth-field-label" }, "Email address"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        autoComplete: "email",
        value: email,
        onChange: (e) => {
          setEmail(e.target.value);
          setError("");
        },
        onKeyDown: (e) => {
          var _a;
          return e.key === "Enter" && ((_a = document.getElementById("pw-input")) == null ? void 0 : _a.focus());
        },
        placeholder: "your@email.com",
        className: "auth-input"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "auth-field-label" }, "Password"), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
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
    ))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 mb-20" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        id: "remember-chk",
        checked: remember,
        onChange: (e) => setRemember(e.target.checked),
        className: "remember-checkbox"
      }
    ), /* @__PURE__ */ React.createElement("label", { htmlFor: "remember-chk", className: "remember-label" }, "Remember my email")), error && /* @__PURE__ */ React.createElement("div", { className: "cf-error-banner mb-16", role: "alert" }, error), info && /* @__PURE__ */ React.createElement("div", { className: "cf-info-banner mb-16", role: "status" }, info), /* @__PURE__ */ React.createElement(
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
      loading ? mode === "signin" ? "Signing in\u2026" : "Creating account\u2026" : mode === "signin" ? "Sign in" : "Create account"
    )), /* @__PURE__ */ React.createElement("div", { className: "login-footer-note" }, "Your data is stored in your own Supabase project.", /* @__PURE__ */ React.createElement("br", null), "Family members can join your household with an invite code after signing in.")));
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
      t("Service worker supported", () => "serviceWorker" in navigator);
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
      t("multi-select filter math ([]=all)", () => {
        const items = [{ cat: "A" }, { cat: "B" }, { cat: "C" }];
        const apply = (sel) => items.filter((x) => !sel.length || sel.includes(x.cat)).length;
        return apply([]) === 3 && apply(["A"]) === 1 && apply(["A", "C"]) === 2;
      });
      t("amount search: >, <, exact", () => matchesAmountQuery(">500", 600) === true && matchesAmountQuery(">500", 400) === false && matchesAmountQuery("<100", 50) === true && matchesAmountQuery("49.50", 49.5) === true && matchesAmountQuery("rent", 100) === null);
      t("fmtVarRange equal/range/empty", () => fmtVarRange([100, 100]) === "\u2248 $100" && fmtVarRange([1200, 2400]) === "$1.2k\u2013$2.4k" && fmtVarRange([]) === "Variable");
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
              }
            }, 0);
          }
        });
      };
      const noop = () => {
      };
      renderCheck("EntryForm", React.createElement(EntryForm, { initial: null, onSave: noop, onCancel: noop, categories: ["Housing"] }));
      renderCheck("OccurrenceEditModal", React.createElement(OccurrenceEditModal, { ev: { id: "x", desc: "T", amount: 10, month: 0, day: 1, notes: "", isOverride: false, repeats: true }, orig: { desc: "T" }, onSave: noop, onCancel: noop, onReset: null }));
      renderCheck("UndoToast", React.createElement(UndoToast, { entry: { desc: "Test" }, count: 2, onUndo: noop, onDismiss: noop }));
      renderCheck("ReceiptLightbox", React.createElement(ReceiptLightbox, { src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", onClose: noop }));
      renderCheck("ContextMenu", React.createElement(ContextMenu, { x: 10, y: 10, items: [{ icon: "\u270E", label: "Edit", action: noop }], onClose: noop }));
      renderCheck("RegisterView (empty)", React.createElement(RegisterView, { entries: [], setEntries: noop, addEntry: noop, categories: ["A"], activeYear: 2026 }));
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
      return out;
    }, []);
    const passed = results.filter((r) => r.ok).length;
    return /* @__PURE__ */ React.createElement("div", { className: "selftest-wrap" }, /* @__PURE__ */ React.createElement("h2", { className: "selftest-h2" }, "CashFlow Self-Test"), /* @__PURE__ */ React.createElement("div", { className: "selftest-count", style: { color: passed === results.length ? "var(--greenDk)" : "var(--red)" } }, passed, "/", results.length, " checks passed"), results.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "selftest-row" }, /* @__PURE__ */ React.createElement("span", { className: "selftest-mark", style: { color: r.ok ? "var(--greenDk)" : "var(--red)" } }, r.ok ? "\u2713" : "\u2717"), /* @__PURE__ */ React.createElement("span", { className: "c-text flex-1" }, r.name), r.detail && !r.ok && /* @__PURE__ */ React.createElement("span", { className: "selftest-detail" }, r.detail))), /* @__PURE__ */ React.createElement("a", { href: location.pathname, className: "selftest-back-link" }, "\u2190 Back to app"));
  }
  function BudgetSubTabs({ value, onChange }) {
    const ref = useRef(null);
    useEffect(() => {
      const el = ref.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const btn = el.querySelector('[data-active="true"]');
      if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, [value]);
    const tabs = [
      { id: "monthly", label: "Monthly", icon: "grid" },
      { id: "daily", label: "Daily", icon: "day", cls: "bp-daily" },
      { id: "bva", label: "Budget vs Actual", icon: "scale" },
      { id: "forecast", label: "Forecast", icon: "trending-up" },
      { id: "entries", label: "Entries", icon: "file-list" }
    ];
    return /* @__PURE__ */ React.createElement("div", { ref, className: "budget-subtabs hscroll budget-subtabs-row" }, tabs.map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.id,
        "data-active": value === s.id,
        className: "budget-subtab-pill budget-subtab-btn" + (s.cls ? " " + s.cls : ""),
        onClick: () => {
          haptic();
          onChange(s.id);
        },
        "aria-label": s.label,
        title: s.label,
        style: {
          background: value === s.id ? "var(--primary)" : "var(--stripe)",
          color: value === s.id ? "#fff" : "var(--textMid)"
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: s.icon, size: 15, style: { verticalAlign: "middle", flexShrink: 0 } }),
      /* @__PURE__ */ React.createElement("span", { className: "bp-label-full" }, " ", s.label)
    )));
  }
