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
    return /* @__PURE__ */ React.createElement("div", { onClick: onClose, style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 2e3,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: {
      background: "var(--bgCard)",
      borderRadius: 16,
      padding: 24,
      maxWidth: 380,
      width: "100%",
      boxShadow: "var(--shadowXl)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--text)" } }, "Keyboard Shortcuts"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": "Close", title: "Close", style: {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: 20,
      color: "var(--textLt)"
    } }, "\u2715")), shortcuts.map(([key, desc]) => /* @__PURE__ */ React.createElement("div", { key, style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "7px 0",
      borderBottom: "1px solid var(--border)"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "var(--textMid)" } }, desc), /* @__PURE__ */ React.createElement("kbd", { className: "cf-text-mono-13", style: {
      fontWeight: 600,
      padding: "3px 10px",
      borderRadius: 6,
      background: "var(--stripe)",
      border: "1px solid var(--border)",
      color: "var(--text)"
    } }, key))), /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 11,
      color: "var(--textLt)",
      marginTop: 14,
      textAlign: "center"
    } }, "Shortcuts work when not typing in a field")));
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
  function FeedbackToast() {
    const [t, setT] = useState(null);
    const timer = useRef(null);
    useEffect(() => {
      const h = (e) => {
        setT(e.detail);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setT(null), 3200);
      };
      window.addEventListener("cf:toast", h);
      return () => {
        window.removeEventListener("cf:toast", h);
        if (timer.current) clearTimeout(timer.current);
      };
    }, []);
    if (!t) return null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "status",
        onClick: () => setT(null),
        style: {
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(84px + env(safe-area-inset-bottom))",
          zIndex: 3e3,
          cursor: "pointer",
          background: t.kind === "error" ? "var(--red)" : "var(--navy)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 20px",
          borderRadius: 24,
          boxShadow: "var(--shadowLg)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "calc(100vw - 40px)"
        }
      },
      /* @__PURE__ */ React.createElement("span", null, t.kind === "error" ? "\u26A0" : "\u2713"),
      t.message
    );
  }
  function UndoToast({ entry, count = 1, onUndo, onDismiss }) {
    const [secs, setSecs] = useState(5);
    useEffect(() => {
      const iv = setInterval(() => setSecs((s) => {
        if (s <= 1) {
          clearInterval(iv);
          onDismiss();
          return 0;
        }
        return s - 1;
      }), 1e3);
      return () => clearInterval(iv);
    }, []);
    return /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      bottom: "calc(80px + env(safe-area-inset-bottom))",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 2500,
      background: "var(--navy)",
      color: "#fff",
      borderRadius: 12,
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      boxShadow: "var(--shadowLg)",
      fontSize: 13,
      whiteSpace: "nowrap",
      animation: "slideUp 0.25s ease-out"
    } }, /* @__PURE__ */ React.createElement("span", null, '"', entry.desc.slice(0, 30), entry.desc.length > 30 ? "\u2026" : "", '" deleted', count > 1 ? ` (+${count - 1} more)` : ""), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onUndo,
        style: {
          fontSize: 12,
          fontWeight: 700,
          padding: "5px 14px",
          borderRadius: 8,
          border: "2px solid rgba(255,255,255,0.4)",
          cursor: "pointer",
          background: "transparent",
          color: "#fff"
        }
      },
      "\u21A9 Undo"
    ), /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "IBM Plex Mono,monospace",
      fontSize: 11,
      color: "rgba(255,255,255,0.5)",
      minWidth: 12
    } }, secs, "s"));
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
          const { error: err } = await supabaseClient.auth.signInWithPassword({ email: e, password });
          if (err) throw err;
          rememberEmail(e);
        } else {
          const { error: err } = await supabaseClient.auth.signUp({ email: e, password, options: { emailRedirectTo: location.origin + location.pathname } });
          if (err) throw err;
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
      return /* @__PURE__ */ React.createElement("div", { style: {
        minHeight: "100vh",
        background: "var(--headerBg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter,sans-serif",
        textAlign: "center"
      } }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", style: { height: 48, marginBottom: 20 } }), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 8 } }, "Supabase isn't configured yet"), /* @__PURE__ */ React.createElement("div", { style: { color: "rgba(255,255,255,0.55)", fontSize: 13, maxWidth: 360, lineHeight: 1.6 } }, "Create a free project at supabase.com, run supabase/schema.sql in its SQL editor, then paste your project URL and anon key into src/lib/supabase-config.js and rebuild."));
    }
    return /* @__PURE__ */ React.createElement("div", { style: {
      minHeight: "100vh",
      background: "var(--headerBg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "Inter,sans-serif"
    } }, /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 420 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 36 } }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", style: { height: 48, marginBottom: 10 } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 } }, "Personal budget & cash flow tracker")), /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--bgCard)",
      borderRadius: 16,
      padding: 32,
      boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      border: "1px solid var(--border)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 8, textAlign: "center" } }, mode === "signin" ? "Sign in to your account" : "Create your account"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("signin");
          setError("");
          setInfo("");
        },
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
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
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: mode === "signup" ? "var(--stripe)" : "transparent",
          color: mode === "signup" ? "var(--text)" : "var(--textLt)"
        }
      },
      "Create account"
    )), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("label", { style: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "var(--textMid)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 6
    } }, "Email address"), /* @__PURE__ */ React.createElement(
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
        style: {
          width: "100%",
          fontFamily: "Inter,sans-serif",
          fontSize: 15,
          padding: "10px 14px",
          border: "1.5px solid var(--border)",
          borderRadius: 8,
          background: "var(--inputBg)",
          color: "var(--text)",
          outline: "none",
          boxSizing: "border-box"
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("label", { style: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "var(--textMid)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 6
    } }, "Password"), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
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
        style: {
          width: "100%",
          fontFamily: "Inter,sans-serif",
          fontSize: 15,
          padding: "10px 44px 10px 14px",
          border: "1.5px solid var(--border)",
          borderRadius: 8,
          background: "var(--inputBg)",
          color: "var(--text)",
          outline: "none",
          boxSizing: "border-box"
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowPw((v) => !v),
        "aria-label": showPw ? "Hide password" : "Show password",
        style: {
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--textLt)",
          fontSize: 16,
          padding: 4
        }
      },
      showPw ? "\u{1F648}" : "\u{1F441}"
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 20 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        id: "remember-chk",
        checked: remember,
        onChange: (e) => setRemember(e.target.checked),
        style: { width: 15, height: 15, cursor: "pointer", accentColor: "var(--navy)" }
      }
    ), /* @__PURE__ */ React.createElement("label", { htmlFor: "remember-chk", style: {
      fontFamily: "Inter,sans-serif",
      fontSize: 13,
      color: "var(--textMid)",
      cursor: "pointer"
    } }, "Remember my email")), error && /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--redLt)",
      border: "1px solid var(--red)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 13,
      color: "var(--red)",
      fontWeight: 500
    } }, error), info && /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--greenLt)",
      border: "1px solid var(--green)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 13,
      color: "var(--greenDk)",
      fontWeight: 500
    } }, info), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: attemptLogin,
        disabled: loading,
        style: {
          width: "100%",
          fontFamily: "Inter,sans-serif",
          fontSize: 15,
          fontWeight: 700,
          padding: "12px",
          borderRadius: 8,
          border: "none",
          cursor: loading ? "wait" : "pointer",
          background: "var(--navy)",
          color: "#fff",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 0.15s"
        }
      },
      loading ? mode === "signin" ? "Signing in\u2026" : "Creating account\u2026" : mode === "signin" ? "Sign in" : "Create account"
    )), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 20, fontSize: 11, color: "rgba(255,255,255,0.3)" } }, "Your data is stored in your own Supabase project.", /* @__PURE__ */ React.createElement("br", null), "Family members can join your household with an invite code after signing in.")));
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
        const { error: err } = await supabaseClient.auth.signInWithPassword({ email: sessionUser.email, password });
        if (err) throw err;
        onUnlock();
      } catch (e) {
        setPwError(e.message || "That password didn't work.");
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      inset: 0,
      zIndex: 5e3,
      background: "var(--headerBg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "Inter,sans-serif"
    } }, /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 380 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 28 } }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", style: { height: 44, marginBottom: 16 } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#fff" } }, "Welcome back", sessionUser.fullName ? `, ${sessionUser.fullName.split(" ")[0]}` : ""), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 } }, "This device locked after being idle.")), /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--bgCard)",
      borderRadius: 16,
      padding: 28,
      boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      border: "1px solid var(--border)"
    } }, mode === "biometric" ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "var(--accentLt)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 28,
      margin: "0 auto 16px"
    } }, "🔓"), bioError && /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--redLt)",
      border: "1px solid var(--red)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 14,
      fontSize: 13,
      color: "var(--red)"
    } }, bioError), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: tryBiometric,
        disabled: checking,
        style: {
          width: "100%",
          fontSize: 15,
          fontWeight: 700,
          padding: "12px",
          borderRadius: 8,
          border: "none",
          cursor: checking ? "wait" : "pointer",
          background: "var(--navy)",
          color: "#fff",
          opacity: checking ? 0.7 : 1,
          marginBottom: 10
        }
      },
      checking ? "Checking…" : "Unlock with Face ID / Touch ID"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("password");
          setBioError("");
        },
        style: {
          width: "100%",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px",
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "var(--textMid)",
          cursor: "pointer"
        }
      },
      "Use password instead"
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { style: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "var(--textMid)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 6
    } }, "Password"), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", marginBottom: 14 } }, /* @__PURE__ */ React.createElement(
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
        style: {
          width: "100%",
          fontFamily: "Inter,sans-serif",
          fontSize: 15,
          padding: "10px 44px 10px 14px",
          border: "1.5px solid var(--border)",
          borderRadius: 8,
          background: "var(--inputBg)",
          color: "var(--text)",
          outline: "none",
          boxSizing: "border-box"
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowPw((v) => !v),
        "aria-label": showPw ? "Hide password" : "Show password",
        style: {
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--textLt)",
          fontSize: 16,
          padding: 4
        }
      },
      showPw ? "🙈" : "👁"
    )), pwError && /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--redLt)",
      border: "1px solid var(--red)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 14,
      fontSize: 13,
      color: "var(--red)"
    } }, pwError), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: unlockWithPassword,
        disabled: loading,
        style: {
          width: "100%",
          fontSize: 15,
          fontWeight: 700,
          padding: "12px",
          borderRadius: 8,
          border: "none",
          cursor: loading ? "wait" : "pointer",
          background: "var(--navy)",
          color: "#fff",
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
        style: {
          width: "100%",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px",
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "var(--textMid)",
          cursor: "pointer"
        }
      },
      "Use Face ID / Touch ID instead"
    ))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 20 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onSignOut,
        style: {
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline"
        }
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
      const sums = getMonthSummaries(evs, 1e3);
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
      t("override attachment wins over base", () => {
        const ent = __spreadProps(__spreadValues({}, entry), { id: 9, attachment: "base64BASE" });
        const evsA = expandEntries([ent], 2026, {});
        const ovA = {};
        ovA[evsA[0].id] = { attachment: "base64OVERRIDE" };
        const evsB = expandEntries([ent], 2026, ovA);
        return evsA[0].attachment === "base64BASE" && evsB[0].attachment === "base64OVERRIDE" && evsB[1].attachment === "base64BASE";
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
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 640, margin: "40px auto", padding: "0 20px" } }, /* @__PURE__ */ React.createElement("h2", { style: { color: "var(--text)", fontSize: 18, marginBottom: 6 } }, "CashFlow Self-Test"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: passed === results.length ? "var(--greenDk)" : "var(--red)", marginBottom: 18, fontWeight: 700 } }, passed, "/", results.length, " checks passed"), results.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 } }, /* @__PURE__ */ React.createElement("span", { style: { color: r.ok ? "var(--greenDk)" : "var(--red)", fontWeight: 700, width: 18 } }, r.ok ? "\u2713" : "\u2717"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text)", flex: 1 } }, r.name), r.detail && !r.ok && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)", fontSize: 11 } }, r.detail))), /* @__PURE__ */ React.createElement("a", { href: location.pathname, style: { display: "inline-block", marginTop: 20, fontSize: 13, color: "var(--navy)" } }, "\u2190 Back to app"));
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
    return /* @__PURE__ */ React.createElement("div", { ref, className: "budget-subtabs hscroll", style: {
      display: "flex",
      gap: 8,
      marginBottom: 16,
      maxWidth: 1160,
      margin: "0 auto 16px",
      flexWrap: "nowrap",
      WebkitOverflowScrolling: "touch"
    } }, tabs.map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.id,
        "data-active": value === s.id,
        className: "budget-subtab-pill" + (s.cls ? " " + s.cls : ""),
        onClick: () => {
          haptic();
          onChange(s.id);
        },
        "aria-label": s.label,
        title: s.label,
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "7px 14px",
          borderRadius: 20,
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          background: value === s.id ? "var(--navy)" : "var(--stripe)",
          color: value === s.id ? "#fff" : "var(--textMid)"
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: s.icon, size: 15, style: { verticalAlign: "middle", flexShrink: 0 } }),
      /* @__PURE__ */ React.createElement("span", { className: "bp-label-full" }, " ", s.label)
    )));
  }
