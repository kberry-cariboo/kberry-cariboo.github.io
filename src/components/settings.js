  function AlertsPanel({ flow, alertThreshold, setTab }) {
    const today = /* @__PURE__ */ new Date();
    const next90 = new Date(today);
    next90.setDate(today.getDate() + 90);
    const alerts = flow.filter((ev) => ev.date >= today && ev.date <= next90 && ev.balance < alertThreshold).sort((a, b) => a.date - b.date);
    const critical = alerts.filter((a) => a.balance < 0);
    const warning = alerts.filter((a) => a.balance >= 0);
    const renderAlertRow = (ev, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          window.__cfGoBudgetSub ? window.__cfGoBudgetSub("forecast") : setTab("budget");
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 6,
          cursor: "pointer",
          width: "100%",
          font: "inherit",
          textAlign: "left",
          background: ev.balance < 0 ? "var(--redLt)" : "var(--amberLt)",
          border: `1px solid ${ev.balance < 0 ? "var(--red)" : "var(--amber)"}`,
          transition: "opacity 0.15s"
        },
        onMouseEnter: (e) => e.currentTarget.style.opacity = "0.8",
        onMouseLeave: (e) => e.currentTarget.style.opacity = "1"
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18 } }, ev.balance < 0 ? "\u{1F6A8}" : "\u26A0\uFE0F"),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" } }, ev.desc), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginTop: 2 } }, MONTHS[ev.month], " ", ev.day, " \xB7 ", ev.category)),
      /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 14,
        fontWeight: 700,
        color: ev.balance < 0 ? "var(--red)" : "var(--amber)"
      } }, fmt(ev.balance)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--textLt)", marginTop: 2 } }, "projected balance")),
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--textLt)" } }, "\u2192 Forecast")
    );
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24 } }, "\u{1F514}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "var(--text)" } }, "Notifications"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginTop: 2 } }, "Balance alerts within the next 90 days \xB7 Threshold: ", fmt(alertThreshold)))), alerts.length === 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "32px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\u2705"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 } }, "All clear!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)" } }, "No balance alerts in the next 90 days."))), critical.length > 0 && /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--red)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: 10
    } }, "\u{1F6A8} Critical \u2014 Balance goes negative"), critical.map((ev, i) => renderAlertRow(ev, i))), warning.length > 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--amber)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: 10
    } }, "\u26A0 Warning \u2014 Balance below threshold"), warning.map((ev, i) => renderAlertRow(ev, i))));
  }
  function SettingsView({ categories, setCategories, categoryColors = {}, setCategoryColors = () => {
  }, alertThreshold, setAlertThreshold, darkMode, setDarkMode, yearConfigs, setYearConfigs, activeYear, setActiveYear, overridesByYr, setOverridesByYr, entries, setEntries, completed = {}, setCompleted = () => {
  }, goals = [], setGoals = () => {
  }, installPrompt = null, triggerInstall = () => {
  }, lockTimeout = 15, setLockTimeout = () => {
  }, templates = [], setTemplates, activeFlow = [], budgetTargets = {}, setBudgetTargets = () => {
  }, sessionUser = null, logout = () => {
  }, aiApiKey = "", setAiApiKey, sbConfigured = true, houseStatus = "idle", houseMsg = "", houseSave = () => {
  }, houseLoad = () => {
  }, household = null, members = [], createInvite = () => {
  }, setMemberDisabled = () => {
  }, updateMemberName = async () => {
  } }) {
    setAiApiKey = setAiApiKey || (() => {
    });
    const [newCat, setNewCat] = useState("");
    const [newCatColor, setNewCatColor] = useState(null);
    const [editIdx, setEditIdx] = useState(null);
    const [editVal, setEditVal] = useState("");
    const [editColor, setEditColor] = useState(null);
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [colorPickerFor, setColorPickerFor] = useState(null);
    const [newYear, setNewYear] = useState("");
    const [yearMsg, setYearMsg] = useState("");
    const [confirmWipe, setConfirmWipe] = useState(false);
    const [settingsPage, setSettingsPage] = useState("general");
    const [confirmTgtReset, setConfirmTgtReset] = useState(false);
    const [showAiKey, setShowAiKey] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    const [inviteBusy, setInviteBusy] = useState(false);
    const [memberMsg, setMemberMsg] = useState("");
    const [editMemberId, setEditMemberId] = useState(null);
    const [editMemberVal, setEditMemberVal] = useState("");
    const [memberBusy, setMemberBusy] = useState(false);
    const saveMemberName = async (userId) => {
      const name = editMemberVal.trim();
      if (!name) {
        setMemberMsg("Name can't be empty.");
        return;
      }
      setMemberBusy(true);
      setMemberMsg("");
      try {
        await updateMemberName(userId, name);
        setEditMemberId(null);
      } catch (e) {
        setMemberMsg(e.message || "Couldn't rename this member.");
      }
      setMemberBusy(false);
    };
    const [tgtResetMsg, setTgtResetMsg] = useState("");
    const [historyOpen, setHistoryOpen] = useState({});
    const [bioSupported, setBioSupported] = useState(false);
    // Biometric unlock is a phone/tablet feature: offer setup only on coarse-pointer
    // devices. If it's already enabled (e.g. legacy desktop setup), keep the block
    // visible so it can still be turned off.
    const isCoarse = useIsCoarsePointer();
    const [bioEnabled, setBioEnabled] = useState(() => !!(sessionUser && getBiometricCredId(sessionUser.id)));
    const [bioBusy, setBioBusy] = useState(false);
    const [bioMsg, setBioMsg] = useState("");
    useEffect(() => {
      let live = true;
      isBiometricAvailable().then((v) => {
        if (live) setBioSupported(v);
      });
      return () => {
        live = false;
      };
    }, []);
    const [lockOnLaunch, setLockOnLaunch] = useState(() => {
      try {
        return localStorage.getItem("cf_lock_on_launch") === "1";
      } catch (e) {
        return false;
      }
    });
    const toggleLockOnLaunch = (v) => {
      setLockOnLaunch(v);
      try {
        if (v) localStorage.setItem("cf_lock_on_launch", "1");
        else localStorage.removeItem("cf_lock_on_launch");
      } catch (e) {
      }
    };
    const toggleBiometric = async () => {
      if (!sessionUser || bioBusy) return;
      setBioMsg("");
      if (bioEnabled) {
        clearBiometric(sessionUser.id);
        setBioEnabled(false);
        toggleLockOnLaunch(false);
        return;
      }
      setBioBusy(true);
      try {
        await registerBiometric(sessionUser.id, sessionUser.email, sessionUser.fullName);
        setBioEnabled(true);
      } catch (e) {
        setBioMsg(e.name === "NotAllowedError" ? "Cancelled — nothing was changed." : e.message || "Couldn't set up fingerprint / face unlock on this device.");
      } finally {
        setBioBusy(false);
      }
    };
    const sortedYears = [...yearConfigs].sort((a, b) => a.year - b.year);
    const addYear = () => {
      const y = parseInt(newYear);
      if (!y || y < 1900 || y > 2200) {
        setYearMsg("Enter a valid year between 1900 and 2200.");
        return;
      }
      if (yearConfigs.find((yc) => yc.year === y)) {
        setYearMsg(`Year ${y} already exists.`);
        return;
      }
      // Adding a year never touches existing years' data. Ongoing recurring
      // entries flow into the new year automatically via expandEntries; the
      // only thing seeded is a copy of the previous year's budget targets.
      // (Entries used to have their end dates cleared here, which retroactively
      // resurrected ended entries in earlier years — that was a data bug.)
      const prevYear = y - 1;
      let copiedTargets = 0;
      setBudgetTargets((prev) => {
        const next = __spreadValues({}, prev);
        for (let m = 0; m < 12; m++) {
          const prevKey = `${prevYear}:${m}`;
          const newKey = `${y}:${m}`;
          if (prev[prevKey] && !prev[newKey]) {
            next[newKey] = __spreadValues({}, prev[prevKey]);
            copiedTargets++;
          }
        }
        return next;
      });
      setYearConfigs((prev) => [...prev, { year: y, openingBalance: 0 }].sort((a, b) => a.year - b.year));
      setActiveYear(y);
      setNewYear("");
      const parts = [`Year ${y} added — ${prevYear} is untouched.`];
      if (copiedTargets > 0) parts.push(`${copiedTargets} monthly budget targets copied from ${prevYear}.`);
      parts.push(`Recurring entries without an end date carry forward automatically.`);
      setYearMsg(parts.join(" "));
    };
    const delYear = (yr) => {
      var _a;
      if (yearConfigs.length <= 1) {
        setYearMsg("Cannot delete the only year.");
        return;
      }
      setYearConfigs((prev) => prev.filter((yc) => yc.year !== yr));
      setOverridesByYr((prev) => {
        const n = __spreadValues({}, prev);
        delete n[yr];
        return n;
      });
      if (activeYear === yr) setActiveYear(((_a = sortedYears.find((yc) => yc.year !== yr)) == null ? void 0 : _a.year) || sortedYears[0].year);
      setYearMsg(`Year ${yr} removed.`);
    };
    const updateOpenBal = (yr, val) => setYearConfigs((prev) => prev.map((yc) => yc.year === yr ? __spreadProps(__spreadValues({}, yc), { openingBalance: val }) : yc));
    const [catMsg, setCatMsg] = useState("");
    const addCat = () => {
      const v = newCat.trim();
      if (!v) {
        setCatMsg("Enter a category name.");
        return;
      }
      if (categories.some((c) => c.toLowerCase() === v.toLowerCase())) {
        setCatMsg(`"${v}" already exists.`);
        return;
      }
      setCategories((p) => [...p, v]);
      if (newCatColor) setCategoryColors((p) => __spreadProps(__spreadValues({}, p), { [v]: newCatColor }));
      setNewCat("");
      setNewCatColor(null);
      setCatMsg("");
    };
    const delCat = (i) => {
      const name = categories[i];
      setCategories((p) => p.filter((_, j) => j !== i));
      setCategoryColors((p) => {
        if (!p[name]) return p;
        const n = __spreadValues({}, p);
        delete n[name];
        return n;
      });
    };
    const saveEdit = () => {
      const v = editVal.trim();
      if (!v || editIdx === null) return;
      const oldName = categories[editIdx];
      setCategories((p) => p.map((c, i) => i === editIdx ? v : c));
      setCategoryColors((p) => {
        const n = __spreadValues({}, p);
        const color = editColor !== null ? editColor : n[oldName];
        if (oldName !== v) delete n[oldName];
        if (color) n[v] = color;
        else delete n[v];
        return n;
      });
      setEditIdx(null);
      setEditVal("");
      setEditColor(null);
    };
    const onDragStart = (i) => {
      setDragIdx(i);
    };
    const onDragOver = (e, i) => {
      e.preventDefault();
      setDragOverIdx(i);
    };
    const onDrop = (i) => {
      if (dragIdx === null || dragIdx === i) return;
      const arr = [...categories];
      const [item] = arr.splice(dragIdx, 1);
      arr.splice(i, 0, item);
      setCategories(arr);
      setDragIdx(null);
      setDragOverIdx(null);
    };
    const inp = {
      fontSize: 13,
      padding: "8px 12px",
      border: "1px solid var(--border)",
      borderRadius: 6,
      background: "var(--inputBg)",
      color: "var(--text)",
      outline: "none"
    };
    const lbl = {
      fontSize: 11,
      fontWeight: 700,
      color: "var(--textMid)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      display: "block",
      marginBottom: 8
    };
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: 4,
      padding: "4px",
      background: "var(--border)",
      borderRadius: 12,
      width: "fit-content",
      maxWidth: "100%",
      overflowX: "auto"
    }, className: "settings-page-pills" }, [
      { id: "general", label: "\u2699  General" },
      { id: "household", label: "\u{1F46A} Household" },
      { id: "templates", label: "\u{1F4CB} Templates" },
      { id: "audit", label: "\u{1F550} Audit" }
    ].map(({ id, label }) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: id,
        onClick: () => setSettingsPage(id),
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "8px 20px",
          borderRadius: 9,
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "all 0.15s",
          background: settingsPage === id ? "var(--bgCard)" : "transparent",
          color: settingsPage === id ? "var(--text)" : "var(--textMid)",
          boxShadow: settingsPage === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
        }
      },
      label
    ))), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "var(--textLt)" } }, "Build ", APP_VERSION)), settingsPage === "general" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: 6,
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      paddingBottom: 14,
      marginBottom: 6
    } }, [
      ["sec-ai-key", "AI Key"],
      ["sec-alert", "Alert Threshold"],
      ["sec-appearance", "Appearance"],
      ["sec-years", "Budget Years"],
      ["sec-backup", "Backup"],
      ["sec-categories", "Categories"],
      ["sec-security", "Security"],
      ["sec-danger", "Danger Zone"]
    ].map(([anchorId, label]) => /* @__PURE__ */ React.createElement(
      "a",
      {
        key: anchorId,
        href: `#${anchorId}`,
        onClick: (e) => {
          e.preventDefault();
          const el = document.getElementById(anchorId);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "6px 12px",
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--bgCard)",
          color: "var(--textMid)",
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0
        }
      },
      label
    ))), /* @__PURE__ */ React.createElement(Card, { id: "sec-ai-key", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "AI Insights \u2014 Anthropic API Key"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 12, lineHeight: 1.5 } }, "Required for the AI Insights tab. Your key is saved with your household's data in Supabase (so it's shared across your own devices and household members) and sent directly to Anthropic from your browser when you run a report \u2014 never to any third party. Anyone able to run script in this page could read it, same as any other browser-side API key. Get a key at", " ", /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "https://console.anthropic.com",
        target: "_blank",
        rel: "noopener noreferrer",
        style: { color: "var(--primary)" }
      },
      "console.anthropic.com"
    ), "."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: showAiKey ? "text" : "password",
        "aria-label": "Anthropic API Key",
        value: aiApiKey,
        onChange: (e) => setAiApiKey(e.target.value),
        placeholder: "sk-ant-api03-...",
        className: "cf-text-mono-13",
        style: {
          flex: 1,
          minWidth: 220,
          padding: "8px 12px",
          border: "1.5px solid var(--border)",
          borderRadius: 8,
          background: "var(--inputBg)",
          color: "var(--text)",
          outline: "none"
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAiKey((v) => !v),
        className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "8px 14px", whiteSpace: "nowrap" }
      },
      showAiKey ? "Hide" : "Show"
    ), aiApiKey.trim() && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setAiApiKey(""),
        style: {
          fontSize: 12,
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          cursor: "pointer",
          background: "transparent",
          color: "var(--red)",
          whiteSpace: "nowrap"
        }
      },
      "Clear key"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 6, marginTop: 10, fontSize: 11, color: "var(--textLt)" } }, /* @__PURE__ */ React.createElement("span", null, "🔑"), /* @__PURE__ */ React.createElement("span", null, "Stored with your household data and sent straight from your browser to Anthropic — anyone who can run script on this page can read it."))), /* @__PURE__ */ React.createElement(Card, { id: "sec-alert", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Alert Threshold"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("label", { style: lbl, htmlFor: "alert-threshold" }, "Warn when balance drops below"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, color: "var(--textMid)" } }, "$"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "alert-threshold",
        type: "number",
        inputMode: "decimal",
        step: "100",
        min: "0",
        style: __spreadProps(__spreadValues({}, inp), { width: 120 }),
        value: alertThreshold,
        onChange: (e) => setAlertThreshold(roundMoney(Math.max(0, parseFloat(e.target.value) || 0)))
      }
    ))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginTop: 8 } }, "Used everywhere in the app: Dashboard alerts, Forecast warnings, and Budget balance colouring.")), /* @__PURE__ */ React.createElement(Card, { id: "sec-appearance", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Appearance"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement(Toggle, { value: darkMode, onChange: setDarkMode, label: "Dark Mode" }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "var(--textLt)" } }, darkMode ? "Dark theme active" : "Light theme active"))), /* @__PURE__ */ React.createElement(Card, { id: "sec-years", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Budget Years"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14 } }, "Add or remove years. Opening balance for the first year is set here; subsequent years carry forward automatically."), sortedYears.map((yc) => {
      var _a;
      return /* @__PURE__ */ React.createElement("div", { key: yc.year, className: "year-row", style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        flexWrap: "wrap",
        rowGap: 8,
        borderRadius: 8,
        marginBottom: 6,
        background: activeYear === yc.year ? "var(--stripe)" : "var(--bg)",
        border: `1px solid ${activeYear === yc.year ? "var(--primary)" : "var(--border)"}`
      } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "var(--text)", minWidth: 52 } }, yc.year), sortedYears[0].year === yc.year && /* @__PURE__ */ React.createElement("div", { className: "year-openbal", style: { display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "var(--textMid)", whiteSpace: "nowrap" } }, "Opening balance"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "var(--textMid)" } }, "$"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          step: "0.01",
          className: "cf-text-mono-13",
          style: {
            padding: "4px 8px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none",
            width: 120,
            maxWidth: "100%",
            minWidth: 0,
            flex: "0 1 120px"
          },
          value: yc.openingBalance,
          onChange: (e) => updateOpenBal(yc.year, roundMoney(parseFloat(e.target.value) || 0))
        }
      )), sortedYears[0].year !== yc.year && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "var(--textLt)", flex: 1 } }, "Carries forward from ", (_a = sortedYears[sortedYears.indexOf(yc) - 1]) == null ? void 0 : _a.year), /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveYear(yc.year), style: {
        fontSize: 11,
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        cursor: "pointer",
        background: activeYear === yc.year ? "var(--primary)" : "transparent",
        color: activeYear === yc.year ? "#fff" : "var(--textMid)"
      } }, activeYear === yc.year ? "Active" : "Switch"), (() => {
        const nextY = yc.year + 1;
        const hasNext = yearConfigs.some((y) => y.year === nextY);
        const hasTargets = Object.keys(budgetTargets || {}).some((k) => k.startsWith(yc.year + ":"));
        return hasNext && hasTargets && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              let n = 0;
              setBudgetTargets((prev) => {
                const nx = __spreadValues({}, prev);
                for (let m = 0; m < 12; m++) {
                  const pk = `${yc.year}:${m}`;
                  const nk = `${nextY}:${m}`;
                  if (prev[pk] && Object.keys(prev[pk]).length) {
                    nx[nk] = __spreadValues({}, prev[pk]);
                    n++;
                  }
                }
                return nx;
              });
              setYearMsg(`\u2705 Copied monthly targets from ${yc.year} \u2192 ${nextY}.`);
            },
            title: `Copy ${yc.year} budget targets to ${nextY}`,
            style: {
              fontSize: 11,
              color: "var(--primary)",
              background: "none",
              border: "1px solid var(--primary)",
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap"
            }
          },
          "Copy \u2192",
          nextY
        );
      })(), /* @__PURE__ */ React.createElement("button", { onClick: () => delYear(yc.year), className: "cf-btn cf-btn--danger", style: { fontSize: 11, padding: "4px 10px", borderRadius: 6 } }, "Remove"));
    }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        inputMode: "decimal",
        placeholder: "e.g. 2027",
        value: newYear,
        className: "cf-text-mono-13",
        onChange: (e) => setNewYear(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && addYear(),
        style: {
          padding: "7px 10px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--inputBg)",
          color: "var(--text)",
          outline: "none",
          width: 120
        }
      }
    ), /* @__PURE__ */ React.createElement("button", { onClick: addYear, className: "cf-btn cf-btn--primary", style: { fontSize: 12, padding: "7px 16px", borderRadius: 6 } }, "+ Add Year")), yearMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginTop: 8 } }, yearMsg)), /* @__PURE__ */ React.createElement(Card, { id: "sec-backup", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Data Backup & Restore"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 16 } }, "Back up all your data to a JSON file and restore it any time. Your existing data will be replaced on restore."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const data = { entries, overridesByYr, yearConfigs, categories, categoryColors, budgetTargets, templates, completed, goals, activeYear, alertThreshold, darkMode, schemaVersion: SCHEMA_VERSION, exportedAt: (/* @__PURE__ */ new Date()).toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `CashFlow_Backup_${localDateStr(/* @__PURE__ */ new Date())}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, className: "cf-btn cf-btn--primary", style: { fontSize: 13, fontWeight: 600, padding: "9px 20px", display: "flex", alignItems: "center", gap: 8 } }, "\u2B07 Export Backup"), /* @__PURE__ */ React.createElement("label", { className: "cf-btn cf-btn--secondary", style: { padding: "9px 20px", display: "flex", alignItems: "center", gap: 8 } }, "\u2B06 Import Backup", /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".json", style: { display: "none" }, onChange: (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          const fixed = moveEntryAttachmentsToOverrides(
            Array.isArray(d.entries) ? d.entries : [],
            d.overridesByYr && typeof d.overridesByYr === "object" ? d.overridesByYr : {}
          );
          if (d.entries) setEntries(fixed.entries);
          if (d.overridesByYr || fixed.moved) setOverridesByYr(fixed.overridesByYr);
          if (d.yearConfigs) setYearConfigs(d.yearConfigs);
          if (d.categories) setCategories(d.categories);
          if (d.categoryColors && typeof d.categoryColors === "object") setCategoryColors(d.categoryColors);
          if (d.budgetTargets && typeof d.budgetTargets === "object") setBudgetTargets(d.budgetTargets);
          if (Array.isArray(d.templates)) setTemplates(d.templates);
          if (d.completed && typeof d.completed === "object") setCompleted(d.completed);
          if (Array.isArray(d.goals)) setGoals(d.goals);
          if (d.activeYear) setActiveYear(d.activeYear);
          if (d.alertThreshold != null) setAlertThreshold(d.alertThreshold);
          if (d.darkMode != null) setDarkMode(d.darkMode);
          setYearMsg("\u2705 Backup restored successfully!");
        } catch (err) {
          setYearMsg("\u274C Could not read backup file. Make sure it's a valid CashFlow backup.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    } }))), yearMsg && /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 12,
      marginTop: 10,
      color: yearMsg.startsWith("\u2705") ? "var(--greenDk)" : yearMsg.startsWith("\u274C") ? "var(--red)" : "var(--textMid)"
    } }, yearMsg)), sbConfigured && household && /* @__PURE__ */ React.createElement(Card, { id: "sec-sync", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "\u2601 Supabase \u2014 Auto Sync"), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 8,
      background: houseStatus === "error" ? "var(--redLt)" : "rgba(39,174,115,0.08)",
      border: `1px solid ${houseStatus === "error" ? "var(--red)" : "rgba(39,174,115,0.25)"}`
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20 } }, houseStatus === "error" ? "\u2717" : houseStatus === "syncing" ? "\u27f3" : "\u2601"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" } }, "Auto-sync active"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 2 } }, "Changes save automatically to your household's Supabase project")), houseMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: houseStatus === "error" ? "var(--red)" : "var(--greenDk)" } }, houseMsg)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 12 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => houseSave(false),
        disabled: houseStatus === "syncing",
        className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "7px 14px", borderRadius: 6 }
      },
      "\u2b06 Save Now"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => houseLoad(),
        disabled: houseStatus === "syncing",
        className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "7px 14px", borderRadius: 6 }
      },
      "\u2b07 Reload from Cloud"
    ))), /* @__PURE__ */ React.createElement(Card, { id: "sec-categories", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Manage Categories"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14 } }, "Drag to reorder. Changes apply to all new entries. Existing entries keep their category name."), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, categories.map((cat, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: cat,
        draggable: true,
        onDragStart: () => onDragStart(i),
        onDragOver: (e) => onDragOver(e, i),
        onDrop: () => onDrop(i),
        style: {
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 8,
          marginBottom: 6,
          cursor: "grab",
          background: dragOverIdx === i ? "var(--stripe)" : "var(--bg)",
          border: "1px solid var(--border)",
          transition: "background 0.1s"
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)", fontSize: 14, cursor: "grab" } }, "\u283F"),
      editIdx === i ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { title: "Category color", style: {
        position: "relative",
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        cursor: "pointer",
        background: editColor !== null ? editColor : getCatColor(cat, categories, categoryColors),
        border: "2px solid var(--bgCard)",
        boxShadow: "0 0 0 1px var(--border)"
      } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          value: editColor !== null ? editColor : getCatColor(cat, categories, categoryColors),
          onChange: (e) => setEditColor(e.target.value),
          style: { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", padding: 0, border: "none" }
        }
      )), /* @__PURE__ */ React.createElement(
        "input",
        {
          style: __spreadProps(__spreadValues({}, inp), { flex: 1 }),
          value: editVal,
          onChange: (e) => setEditVal(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && saveEdit(),
          autoFocus: true
        }
      ), /* @__PURE__ */ React.createElement("button", { onClick: saveEdit, className: "cf-btn cf-btn--compact cf-btn--primary" }, "Save"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setEditIdx(null);
        setEditColor(null);
      }, className: "cf-btn cf-btn--compact cf-btn--secondary" }, "Cancel")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { title: "Change color", style: {
        position: "relative",
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        cursor: "pointer",
        background: getCatColor(cat, categories, categoryColors),
        border: "2px solid var(--bgCard)",
        boxShadow: "0 0 0 1px var(--border)"
      } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          value: getCatColor(cat, categories, categoryColors),
          onChange: (e) => setCategoryColors((p) => __spreadProps(__spreadValues({}, p), { [cat]: e.target.value })),
          style: { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", padding: 0, border: "none" }
        }
      )), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "var(--text)", flex: 1 } }, cat), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center", marginLeft: "auto", flexShrink: 0 } }, categoryColors[cat] && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setCategoryColors((p) => {
            const n = __spreadValues({}, p);
            delete n[cat];
            return n;
          }),
          title: "Reset to automatic color",
          style: {
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 5,
            border: "1px solid var(--border)",
            cursor: "pointer",
            background: "transparent",
            color: "var(--textLt)"
          }
        },
        "Reset"
      ), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setEditIdx(i);
        setEditVal(cat);
        setEditColor(null);
      }, className: "cf-btn cf-btn--compact cf-btn--secondary" }, "Edit"), /* @__PURE__ */ React.createElement("button", { onClick: () => delCat(i), className: "cf-btn cf-btn--compact cf-btn--danger" }, "Remove")))
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("label", { title: "Pick a color (optional \u2014 auto-assigned if left default)", style: {
      position: "relative",
      width: 22,
      height: 22,
      borderRadius: "50%",
      flexShrink: 0,
      cursor: "pointer",
      background: newCatColor || "var(--border)",
      border: "2px solid var(--bgCard)",
      boxShadow: "0 0 0 1px var(--border)"
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "color",
        value: newCatColor || "#888888",
        onChange: (e) => setNewCatColor(e.target.value),
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", padding: 0, border: "none" }
      }
    )), /* @__PURE__ */ React.createElement(
      "input",
      {
        style: __spreadProps(__spreadValues({}, inp), { flex: 1 }),
        value: newCat,
        "aria-label": "New category name",
        placeholder: "New category name\u2026",
        onChange: (e) => {
          setNewCat(e.target.value);
          if (catMsg) setCatMsg("");
        },
        onKeyDown: (e) => e.key === "Enter" && addCat()
      }
    ), /* @__PURE__ */ React.createElement("button", { onClick: addCat, className: "cf-btn cf-btn--primary", style: {
      fontSize: 13,
      fontWeight: 600,
      padding: "8px 18px"
    } }, "+ Add")), catMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--red)", marginTop: 8 } }, catMsg)), /* @__PURE__ */ React.createElement(Card, { id: "sec-security", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Security"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("label", { htmlFor: "auto-lock-select", style: { fontSize: 13, color: "var(--text)" } }, "Auto-lock when in background"), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: "auto-lock-select",
        value: lockTimeout,
        onChange: (e) => setLockTimeout(parseInt(e.target.value, 10)),
        style: {
          fontSize: 13,
          padding: "7px 10px",
          borderRadius: 8,
          border: "1.5px solid var(--border)",
          background: "var(--inputBg)",
          color: "var(--text)",
          outline: "none"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: 0 }, "Off"),
      /* @__PURE__ */ React.createElement("option", { value: 5 }, "After 5 minutes"),
      /* @__PURE__ */ React.createElement("option", { value: 15 }, "After 15 minutes"),
      /* @__PURE__ */ React.createElement("option", { value: 30 }, "After 30 minutes")
    )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 8 } }, bioEnabled ? "Locks the screen if the app stays hidden or backgrounded longer than the selected time — unlock with your fingerprint / face or your password." : "Locks the screen if the app stays hidden or backgrounded longer than the selected time — unlock with your password."), sessionUser && (bioEnabled || bioSupported && isCoarse) && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement(Toggle, { value: bioEnabled, onChange: toggleBiometric, label: "Unlock with fingerprint / face" }), bioBusy && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--textLt)" } }, "Follow your device's prompt…")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 8 } }, "Uses your device's screen-lock biometric (fingerprint on Samsung / Android, Face ID or Touch ID on Apple). Registered on this device only — you'll set it up again on any other device or browser you sign in from."), bioEnabled && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Toggle, { value: lockOnLaunch, onChange: toggleLockOnLaunch, label: "Require fingerprint sign-on when the app opens" }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 6 } }, "Every time you open the app on this device it starts locked and asks for your fingerprint right away — you stay signed in underneath, so there's no password to retype.")), bioMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--red)", marginTop: 6 } }, bioMsg))), /* @__PURE__ */ React.createElement(Card, { id: "sec-reset", style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Target Budget Reset \u2014 ", activeYear), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Set every category's monthly budget target equal to the actual expenses scheduled for that month in ", activeYear, ". This overwrites all existing targets for ", activeYear, " with a plan that matches your current entries \u2014 a useful starting point you can then fine-tune."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmTgtReset(true),
        style: {
          fontSize: 13,
          fontWeight: 600,
          padding: "9px 20px",
          borderRadius: 8,
          border: "1px solid var(--primary)",
          cursor: "pointer",
          background: "var(--primary)",
          color: "#fff"
        }
      },
      "\u21BA Reset Targets to Actuals"
    ), tgtResetMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--greenDk)", marginTop: 10 } }, tgtResetMsg), confirmTgtReset && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: `Reset all ${activeYear} targets?`,
        message: `This replaces every monthly budget target for ${activeYear} with the actual expense totals per category for each month. Existing targets for ${activeYear} will be overwritten. Other years are unaffected.`,
        confirmLabel: "Reset Targets",
        onConfirm: () => {
          const byMonthCat = {};
          (activeFlow || []).filter((ev) => ev.type === "expense").forEach((ev) => {
            const key = `${activeYear}:${ev.month}`;
            if (!byMonthCat[key]) byMonthCat[key] = {};
            byMonthCat[key][ev.category] = (byMonthCat[key][ev.category] || 0) + ev.amount;
          });
          setBudgetTargets((prev) => {
            const next = __spreadValues({}, prev);
            Object.keys(next).forEach((k) => {
              if (k.startsWith(activeYear + ":")) delete next[k];
            });
            Object.keys(byMonthCat).forEach((key) => {
              const cats = {};
              Object.keys(byMonthCat[key]).forEach((c) => {
                cats[c] = Math.round(byMonthCat[key][c] * 100) / 100;
              });
              next[key] = cats;
            });
            return next;
          });
          const monthsSet = Object.keys(byMonthCat).length;
          setTgtResetMsg(`Targets for ${activeYear} reset from actuals across ${monthsSet} month${monthsSet !== 1 ? "s" : ""}.`);
          setConfirmTgtReset(false);
        },
        onCancel: () => setConfirmTgtReset(false)
      }
    )), /* @__PURE__ */ React.createElement(Card, { id: "sec-danger", style: { marginBottom: 20, border: "1px solid var(--redLt)" } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Danger Zone"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Clear this device's local cache \u2014 entries, overrides, categories, templates, budget targets, years, and local preferences. ", household ? "Your data in Supabase is not affected \u2014 the app will reload it from the cloud right after." : "Export a backup first if you might need this data again.", " This cannot be undone locally."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmWipe(true),
        className: "cf-btn cf-btn--danger", style: { padding: "9px 20px", border: "1px solid var(--red)" }
      },
      "\u{1F5D1} Reset Local Cache"
    ), confirmWipe && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: "Reset local cache?",
        message: household ? "This clears entries, overrides, categories, templates, budget targets, and saved years cached on this device, then reloads them fresh from Supabase. Your cloud data is not deleted." : "This will permanently delete all entries, overrides, categories, templates, budget targets, and saved years from this device. This cannot be undone.",
        confirmLabel: "Reset Everything",
        onConfirm: () => {
          try {
            Object.keys(localStorage).filter((k) => k.startsWith("cf_")).forEach((k) => localStorage.removeItem(k));
          } catch (e) {
          }
          window.location.reload();
        },
        onCancel: () => setConfirmWipe(false)
      }
    ))), settingsPage === "household" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Household Members"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Everyone listed here signs in with their own email and password and shares this budget."), members.map((m) => {
      const isEditing = editMemberId === m.user_id;
      return /* @__PURE__ */ React.createElement("div", { key: m.user_id, style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap"
      } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 160 } }, isEditing ? /* @__PURE__ */ React.createElement(
        "input",
        {
          autoFocus: true,
          "aria-label": "Member name",
          className: "field-input",
          style: { maxWidth: 260 },
          value: editMemberVal,
          onChange: (e) => setEditMemberVal(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") saveMemberName(m.user_id);
            if (e.key === "Escape") setEditMemberId(null);
          }
        }
      ) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" } }, m.full_name || "(no name)", " ", (sessionUser == null ? void 0 : sessionUser.id) === m.user_id && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)", fontWeight: 400 } }, "(You)")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 2 } }, m.role === "owner" ? "Owner" : "Member", m.disabled ? " \xB7 Disabled" : "")), isEditing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => saveMemberName(m.user_id),
          disabled: memberBusy,
          className: "cf-btn cf-btn--primary", style: { fontSize: 11, padding: "5px 14px", borderRadius: 6 }
        },
        memberBusy ? "Saving\u2026" : "Save"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setEditMemberId(null),
          disabled: memberBusy,
          className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "5px 12px", borderRadius: 6 }
        },
        "Cancel"
      )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setMemberMsg("");
            setEditMemberId(m.user_id);
            setEditMemberVal(m.full_name || "");
          },
          className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "5px 12px", borderRadius: 6 }
        },
        "\u270E Edit"
      ), (sessionUser == null ? void 0 : sessionUser.id) !== m.user_id && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: async () => {
            setMemberMsg("");
            try {
              await setMemberDisabled(m.user_id, !m.disabled);
            } catch (e) {
              setMemberMsg(e.message || "Only the household owner can do this.");
            }
          },
          className: m.disabled ? "cf-btn cf-btn--primary" : "cf-btn cf-btn--danger", style: { fontSize: 11, padding: "5px 12px", borderRadius: 6 }
        },
        m.disabled ? "Enable" : "Disable"
      )));
    }), memberMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--red)", marginTop: 10 } }, memberMsg)), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Invite a family member"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Generate a one-time code. Share it with them, then have them sign up and enter it on the “Join with invite code” screen."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          setInviteBusy(true);
          try {
            const code = await createInvite();
            setInviteCode(code);
          } catch (e) {
            setMemberMsg(e.message || "Couldn't create an invite code.");
          }
          setInviteBusy(false);
        },
        disabled: inviteBusy,
        className: "cf-btn cf-btn--primary", style: { fontSize: 13, fontWeight: 600, padding: "9px 20px" }
      },
      inviteBusy ? "Generating…" : "Generate invite code"
    ), inviteCode && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 14,
      fontFamily: "'IBM Plex Mono',monospace",
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textAlign: "center",
      padding: "14px",
      borderRadius: 8,
      background: "var(--stripe)",
      border: "1px solid var(--border)",
      color: "var(--text)"
    } }, inviteCode))), settingsPage === "templates" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Entry Templates"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14 } }, 'Templates let you quickly fill the entry form with common entries. Save templates from the entry form using "Save as template".'), (templates || []).length === 0 && /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 13,
      color: "var(--textLt)",
      fontStyle: "italic"
    } }, "No templates saved yet. Use the entry form to create one."), (templates || []).map((t, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      borderBottom: "1px solid var(--border)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" } }, t.desc), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 2 } }, t.type === "income" ? "+" : "-", fmt(t.amount), " \xB7 ", t.category, t.repeats && /* @__PURE__ */ React.createElement("span", null, " \xB7 Recurring"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTemplates((prev) => prev.filter((_, j) => j !== i)),
        className: "cf-btn cf-btn--danger", style: { fontSize: 11, padding: "4px 10px", borderRadius: 6 }
      },
      "Remove"
    ))))), settingsPage === "audit" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Recent Edits \u2014 ", activeYear), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14 } }, "Per-date overrides you've made to recurring entries. Reverting restores the originally scheduled amount and notes for that date."), (() => {
      const ovrs = overridesByYr[activeYear] || {};
      const rows = Object.entries(ovrs).filter(([, o]) => o && o._savedAt).sort((a, b) => (b[1]._savedAt || "").localeCompare(a[1]._savedAt || "")).slice(0, 20);
      if (rows.length === 0) {
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", fontStyle: "italic" } }, "No edits yet. Click any row in the Budget view to edit a single date \u2014 it'll appear here.");
      }
      return rows.map(([eventId, ov]) => {
        const parts = eventId.split("-");
        const entry = entries.find((e) => String(e.id) === parts[0]);
        const month = parseInt(parts[parts.length - 2]);
        const day = parseInt(parts[parts.length - 1]);
        const dateLabel = entry && !isNaN(month) && !isNaN(day) ? `${MONTHS[month]} ${day}` : eventId;
        const hist = ov._history || [];
        const isOpen = !!historyOpen[eventId];
        return /* @__PURE__ */ React.createElement("div", { key: eventId, style: { padding: "10px 0", borderBottom: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 160 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" } }, entry ? entry.desc : "Unknown entry", " \xB7 ", dateLabel), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 2 } }, ov.amount !== void 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, "Amount \u2192 ", fmt(ov.amount), " "), ov.notes && /* @__PURE__ */ React.createElement(React.Fragment, null, '\xB7 Note: "', ov.notes, '" '), "\xB7 Saved ", new Date(ov._savedAt).toLocaleString())), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, hist.length > 0 && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setHistoryOpen((p) => __spreadProps(__spreadValues({}, p), { [eventId]: !p[eventId] })),
            className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 10px", borderRadius: 6 }
          },
          isOpen ? "Hide" : "History",
          " (",
          hist.length,
          ")"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setOverridesByYr((prev) => {
              const yOvs = __spreadValues({}, prev[activeYear] || {});
              delete yOvs[eventId];
              return __spreadProps(__spreadValues({}, prev), { [activeYear]: yOvs });
            }),
            style: {
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--amberLt)",
              cursor: "pointer",
              background: "var(--amberLt)",
              color: "var(--amber)"
            },
            title: "Restore the originally scheduled values for this date"
          },
          "\u21BA Revert"
        ))), isOpen && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--border)" } }, [...hist].reverse().map((h, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: "var(--textLt)", marginBottom: 4 } }, new Date(h.ts).toLocaleString(), " \u2014 previous value:", " ", h.prev && h.prev.amount !== void 0 ? fmt(h.prev.amount) : "(scheduled default)", h.prev && h.prev.notes ? ` \xB7 "${h.prev.notes}"` : ""))));
      });
    })())));
  }
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { err: null };
    }
    static getDerivedStateFromError(e) {
      return { err: e };
    }
    componentDidCatch(e, info) {
      console.error("CashFlow render error:", e, info);
    }
    render() {
      if (this.state.err) {
        return /* @__PURE__ */ React.createElement("div", { style: { padding: "40px 32px", maxWidth: 560, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#E85D4A", fontSize: 18, fontWeight: 700, marginBottom: 12 } }, "\u26A0 Something went wrong"), /* @__PURE__ */ React.createElement("pre", { style: {
          background: "#f8f8f8",
          border: "1px solid #eee",
          borderRadius: 6,
          padding: 14,
          fontSize: 11,
          overflow: "auto",
          color: "#555",
          whiteSpace: "pre-wrap"
        } }, this.state.err.message, "\n\n", this.state.err.stack), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => this.setState({ err: null }),
            style: {
              marginTop: 16,
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "#1C2B3A",
              color: "#fff"
            }
          },
          "Try Again"
        ));
      }
      return this.props.children;
    }
  }
