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
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1160, width: "100%", margin: "0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24 } }, "\u{1F514}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "var(--text)" } }, "Notifications"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginTop: 2 } }, "Balance alerts within the next 90 days \xB7 Threshold: ", fmt(alertThreshold)))), alerts.length === 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "32px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\u2705"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 } }, "All clear!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)" } }, "No balance alerts in the next 90 days."))), critical.length > 0 && /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: {
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
  function GistSettingsPanel({ gistStatus, gistMsg, gistSave, gistLoad, gistCreate, listSnapshots = null, restoreSnapshot = null, downloadBackup = null }) {
    const [snaps, setSnaps] = useState(null);
    const [snapsBusy, setSnapsBusy] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState(null);
    const refreshSnaps = async () => {
      if (!listSnapshots) return;
      setSnapsBusy(true);
      try {
        setSnaps(await listSnapshots());
      } catch (e) {
        setSnaps([]);
      }
      setSnapsBusy(false);
    };
    const [tok, setTok] = useState(() => localStorage.getItem("cf_gist_token") || "");
    const [gid, setGid] = useState(() => localStorage.getItem("cf_gist_id") || "");
    const [editing, setEditing] = useState(false);
    const [tmpTok, setTmpTok] = useState("");
    const [tmpGid, setTmpGid] = useState("");
    const isConfigured = !!(tok && gid);
    const iStyle = {
      fontSize: 12,
      padding: "7px 10px",
      border: "1px solid var(--border)",
      borderRadius: 6,
      background: "var(--inputBg)",
      color: "var(--text)",
      outline: "none",
      width: "100%"
    };
    const btnSt = (bg, disabled) => ({
      fontSize: 12,
      fontWeight: 600,
      padding: "7px 16px",
      borderRadius: 6,
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: bg,
      color: "#fff",
      opacity: disabled ? 0.6 : 1
    });
    const disconnect = () => {
      localStorage.removeItem("cf_gist_token");
      localStorage.removeItem("cf_gist_id");
      setTok("");
      setGid("");
      setEditing(false);
    };
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
      padding: "10px 14px",
      borderRadius: 8,
      background: isConfigured ? "rgba(39,174,115,0.08)" : "var(--stripe)",
      border: `1px solid ${isConfigured ? "rgba(39,174,115,0.25)" : "var(--border)"}`
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20 } }, isConfigured ? "\u2601" : "\u2699"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" } }, isConfigured ? "Auto-sync active" : "Not configured"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 2 } }, isConfigured ? `Gist ID: ${gid.slice(0, 8)}\u2026 \xB7 Changes save automatically` : "Enter your GitHub token to enable auto-save across devices")), gistMsg && /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 11,
      textAlign: "right",
      maxWidth: 160,
      color: gistStatus === "error" ? "var(--red)" : gistStatus === "syncing" ? "var(--amber)" : "var(--greenDk)"
    } }, gistMsg)), isConfigured && !editing && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => gistSave(false),
        disabled: gistStatus === "syncing",
        style: btnSt("var(--greenDk)", gistStatus === "syncing")
      },
      "\u2B06 Save Now"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => gistLoad(),
        disabled: gistStatus === "syncing",
        style: btnSt("var(--navyMid)", gistStatus === "syncing")
      },
      "\u2B07 Load from Gist"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setTmpTok(tok);
          setTmpGid(gid);
          setEditing(true);
        },
        className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "7px 14px", borderRadius: 6 }
      },
      "Edit Token"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: disconnect,
        className: "cf-btn cf-btn--danger", style: { fontSize: 12, padding: "7px 14px", borderRadius: 6 }
      },
      "Disconnect"
    )), (!isConfigured || editing) && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 13,
      color: "var(--textLt)",
      lineHeight: 1.6,
      padding: "8px 12px",
      background: "var(--stripe)",
      borderRadius: 6
    } }, "1. Go to ", /* @__PURE__ */ React.createElement("strong", null, "github.com \u2192 Settings \u2192 Developer settings \u2192 Personal access tokens \u2192 Tokens (classic)"), /* @__PURE__ */ React.createElement("br", null), "2. Click ", /* @__PURE__ */ React.createElement("strong", null, "Generate new token"), ", tick ", /* @__PURE__ */ React.createElement("strong", null, "gist"), ", copy the token", /* @__PURE__ */ React.createElement("br", null), "3. Paste below and click Connect"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "gist-token", style: { fontSize: 11, color: "var(--textLt)", marginBottom: 4, display: "block" } }, "GitHub Personal Access Token *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "gist-token",
        style: iStyle,
        type: "password",
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
        value: tmpTok,
        onChange: (e) => setTmpTok(e.target.value)
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "gist-id", style: { fontSize: 11, color: "var(--textLt)", marginBottom: 4, display: "block" } }, "Gist ID ", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--amber)" } }, "\u2014 leave blank to auto-create on first connect")), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "gist-id",
        style: iStyle,
        type: "text",
        placeholder: "Auto-created on first connect",
        value: tmpGid,
        onChange: (e) => setTmpGid(e.target.value)
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        disabled: !tmpTok.trim() || gistStatus === "syncing",
        style: __spreadProps(__spreadValues({}, btnSt("var(--navy)", !tmpTok.trim() || gistStatus === "syncing")), { flex: 1 }),
        onClick: async () => {
          const t = tmpTok.trim();
          if (!t) return;
          try {
            localStorage.setItem("cf_gist_token", t);
            if (tmpGid.trim()) {
              localStorage.setItem("cf_gist_id", tmpGid.trim());
              setTok(t);
              setGid(tmpGid.trim());
              setEditing(false);
            } else {
              const newId = await gistCreate(t);
              if (newId) {
                setTok(t);
                setGid(newId);
                setEditing(false);
              }
            }
          } catch (err) {
            toast("Couldn't save your Gist connection \u2014 your browser storage may be full.", "error");
          }
        }
      },
      tmpGid.trim() ? "Connect" : "Connect & Create Gist"
    ), editing && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setEditing(false),
        className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "8px 14px", borderRadius: 6 }
      },
      "Cancel"
    ))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--text)" } }, "\u{1F4BE} Backups"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, downloadBackup && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: downloadBackup,
        style: {
          fontSize: 11,
          fontWeight: 600,
          padding: "5px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          cursor: "pointer",
          background: "transparent",
          color: "var(--navy)"
        }
      },
      "\u2B07 Download backup"
    ), listSnapshots && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: refreshSnaps,
        disabled: snapsBusy,
        style: {
          fontSize: 11,
          fontWeight: 600,
          padding: "5px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          cursor: snapsBusy ? "wait" : "pointer",
          background: "transparent",
          color: "var(--textMid)"
        }
      },
      snapsBusy ? "\u27F3 Loading\u2026" : snaps === null ? "View snapshots" : "\u21BB Refresh"
    ))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginBottom: snaps && snaps.length ? 10 : 0 } }, "Snapshots are kept automatically in your Gist (last 3, rotated every 6 hours and before any overwrite)."), snaps !== null && (snaps.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--textLt)" } }, "No snapshots yet \u2014 they'll appear after your next few saves.") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, snaps.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.n, style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      background: "var(--stripe)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "8px 12px",
      flexWrap: "wrap"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--text)" } }, /* @__PURE__ */ React.createElement("strong", null, "Snapshot ", s.n), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)", marginLeft: 8 } }, s.savedAt ? new Date(s.savedAt).toLocaleString() : "unknown date", " \xB7 ", s.entries, " entries", s.goals ? ` \xB7 ${s.goals} goals` : "")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmRestore(s),
        style: {
          fontSize: 11,
          fontWeight: 700,
          padding: "5px 14px",
          borderRadius: 6,
          border: "1px solid var(--amber)",
          cursor: "pointer",
          background: "transparent",
          color: "var(--amber)"
        }
      },
      "Restore"
    ))))), confirmRestore && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: `Restore snapshot ${confirmRestore.n}?`,
        confirmLabel: "Restore",
        message: `Your data will be replaced with the snapshot from ${confirmRestore.savedAt ? new Date(confirmRestore.savedAt).toLocaleString() : "an earlier save"}. Your current data is preserved as Snapshot 1, so this can be undone.`,
        onCancel: () => setConfirmRestore(null),
        onConfirm: async () => {
          const n = confirmRestore.n;
          setConfirmRestore(null);
          if (restoreSnapshot) {
            await restoreSnapshot(n);
            refreshSnaps();
          }
        }
      }
    )));
  }
  function GistMigrationPanel({ household, onImported }) {
    const [status, setStatus] = useState("idle");
    const [preview, setPreview] = useState(null);
    const [msg, setMsg] = useState("");
    const hasGist = !!(localStorage.getItem("cf_gist_token") && localStorage.getItem("cf_gist_id"));
    if (!hasGist || !household) return null;
    const fetchPreview = async () => {
      setStatus("fetching");
      setMsg("");
      try {
        const tok = localStorage.getItem("cf_gist_token");
        const gid = localStorage.getItem("cf_gist_id");
        const r = await fetch(`https://api.github.com/gists/${gid}`, { headers: { Authorization: `token ${tok}`, Accept: "application/vnd.github+json" } });
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        const d = await r.json();
        const file = d.files && d.files["CashFlow_Data.json"];
        if (!file || !file.content) throw new Error("No CashFlow_Data.json file found in your Gist.");
        setPreview(JSON.parse(file.content));
        setStatus("preview");
      } catch (e) {
        setStatus("error");
        setMsg(e.message);
      }
    };
    const doImport = async () => {
      if (!preview) return;
      setStatus("importing");
      setMsg("");
      try {
        const legacyProfiles = {};
        (preview.users || []).forEach((u) => {
          if (u && u.id) legacyProfiles[u.id] = u.fullName || "";
        });
        const payload = __spreadValues({}, preview);
        delete payload.users;
        payload.legacyProfiles = legacyProfiles;
        payload.schemaVersion = SCHEMA_VERSION;
        payload.savedAt = (/* @__PURE__ */ new Date()).toISOString();
        const { error } = await supabaseClient.from("household_data").update({
          data: payload,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("household_id", household.id);
        if (error) throw error;
        const { data: check, error: checkErr } = await supabaseClient.from("household_data").select("data").eq("household_id", household.id).maybeSingle();
        if (checkErr) throw checkErr;
        const importedCount = ((check && check.data && check.data.entries) || []).length;
        const expectedCount = (preview.entries || []).length;
        if (importedCount !== expectedCount) throw new Error(`Verification failed: expected ${expectedCount} entries, found ${importedCount} after import. Your Gist is untouched — nothing was lost.`);
        await onImported();
        setStatus("done");
        setMsg(`Imported ${importedCount} entries successfully. Your Gist was not modified.`);
      } catch (e) {
        setStatus("error");
        setMsg(e.message);
      }
    };
    return /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20, border: "1px solid var(--amber)" } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "☁ Import your existing Gist data"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "We found a GitHub Gist connection saved on this device. You can import its data into your new Supabase household — this only adds data, it never modifies or deletes your Gist, and you can re-run it any time."), status === "idle" && /* @__PURE__ */ React.createElement("button", { onClick: fetchPreview, className: "cf-btn cf-btn--primary", style: { fontSize: 13, fontWeight: 600, padding: "9px 20px" } }, "Check my Gist"), status === "fetching" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)" } }, "Checking your Gist…"), status === "preview" && preview && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 12,
      color: "var(--textMid)",
      background: "var(--stripe)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 14
    } }, "Found ", (preview.entries || []).length, " entries \xB7 ", (preview.categories || []).length, " categories \xB7 last saved ", preview.savedAt ? new Date(preview.savedAt).toLocaleString() : "unknown date"), /* @__PURE__ */ React.createElement("button", { onClick: doImport, className: "cf-btn cf-btn--primary", style: { fontSize: 13, fontWeight: 600, padding: "9px 20px" } }, "Import into household")), status === "importing" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)" } }, "Importing…"), status === "done" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--greenDk)", fontWeight: 600 } }, "✓ ", msg), status === "error" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--red)", marginBottom: 8 } }, "❌ ", msg), /* @__PURE__ */ React.createElement("button", { onClick: fetchPreview, className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "7px 14px" } }, "Retry")));
  }
  function SettingsView({ categories, setCategories, categoryColors = {}, setCategoryColors = () => {
  }, alertThreshold, setAlertThreshold, darkMode, setDarkMode, yearConfigs, setYearConfigs, activeYear, setActiveYear, overridesByYr, setOverridesByYr, entries, setEntries, gistStatus, gistMsg, gistSave, gistLoad, gistCreate, listSnapshots = null, restoreSnapshot = null, downloadBackup = null, installPrompt = null, triggerInstall = () => {
  }, lockTimeout = 15, setLockTimeout = () => {
  }, templates = [], setTemplates, activeFlow = [], budgetTargets = {}, setBudgetTargets = () => {
  }, sessionUser = null, logout = () => {
  }, aiApiKey = "", setAiApiKey, sbConfigured = true, houseStatus = "idle", houseMsg = "", houseSave = () => {
  }, houseLoad = () => {
  }, household = null, members = [], createInvite = () => {
  }, setMemberDisabled = () => {
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
    const [tgtResetMsg, setTgtResetMsg] = useState("");
    const [historyOpen, setHistoryOpen] = useState({});
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
      const prevYear = y - 1;
      const prevYearEnd = `${prevYear}-12-31`;
      let extendedCount = 0;
      setEntries((prev) => prev.map((e) => {
        if (e.repeats && e.recurEnd && e.recurEnd <= prevYearEnd && e.recurEnd >= prevYear + "-01-01") {
          extendedCount++;
          return __spreadProps(__spreadValues({}, e), { recurEnd: "" });
        }
        return e;
      }));
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
      const parts = [`Year ${y} added.`];
      if (extendedCount > 0) parts.push(`${extendedCount} recurring entr${extendedCount === 1 ? "y" : "ies"} extended.`);
      if (copiedTargets > 0) parts.push(`${copiedTargets} budget targets copied from ${prevYear}.`);
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
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1160, width: "100%", margin: "0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: 4,
      padding: "4px",
      background: "var(--border)",
      borderRadius: 12,
      width: "fit-content"
    } }, [
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
          transition: "all 0.15s",
          background: settingsPage === id ? "var(--bgCard)" : "transparent",
          color: settingsPage === id ? "var(--text)" : "var(--textMid)",
          boxShadow: settingsPage === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
        }
      },
      label
    ))), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "var(--textLt)" } }, "Build ", APP_VERSION)), settingsPage === "general" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "AI Insights \u2014 Anthropic API Key"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 12, lineHeight: 1.5 } }, "Required for the AI Insights tab. Your key is stored only in your browser's local storage and sent directly to Anthropic \u2014 never to any third party. Get a key at", " ", /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "https://console.anthropic.com",
        target: "_blank",
        rel: "noopener noreferrer",
        style: { color: "var(--navy)" }
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
    ))), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Alert Threshold"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("label", { style: lbl, htmlFor: "alert-threshold" }, "Warn when balance drops below"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, color: "var(--textMid)" } }, "$"), /* @__PURE__ */ React.createElement(
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
    ))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginTop: 8 } }, "Used everywhere in the app: Dashboard alerts, Forecast warnings, and Budget balance colouring.")), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Appearance"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement(Toggle, { value: darkMode, onChange: setDarkMode, label: "Dark Mode" }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "var(--textLt)" } }, darkMode ? "Dark theme active" : "Light theme active"))), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Budget Years"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14 } }, "Add or remove years. Opening balance for the first year is set here; subsequent years carry forward automatically."), sortedYears.map((yc) => {
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
        border: `1px solid ${activeYear === yc.year ? "var(--navy)" : "var(--border)"}`
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
        background: activeYear === yc.year ? "var(--navy)" : "transparent",
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
              color: "var(--navy)",
              background: "none",
              border: "1px solid var(--navy)",
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
    ), /* @__PURE__ */ React.createElement("button", { onClick: addYear, className: "cf-btn cf-btn--primary", style: { fontSize: 12, padding: "7px 16px", borderRadius: 6 } }, "+ Add Year")), yearMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginTop: 8 } }, yearMsg)), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Data Backup & Restore"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 16 } }, "Back up all your data to a JSON file and restore it any time. Your existing data will be replaced on restore."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const data = { entries, overridesByYr, yearConfigs, categories, activeYear, alertThreshold, darkMode, exportedAt: (/* @__PURE__ */ new Date()).toISOString() };
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
          if (d.entries) setEntries(d.entries);
          if (d.overridesByYr) setOverridesByYr(d.overridesByYr);
          if (d.yearConfigs) setYearConfigs(d.yearConfigs);
          if (d.categories) setCategories(d.categories);
          if (d.categoryColors && typeof d.categoryColors === "object") setCategoryColors(d.categoryColors);
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
    } }, yearMsg)), sbConfigured && household && /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "\u2601 Supabase \u2014 Auto Sync"), /* @__PURE__ */ React.createElement("div", { style: {
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
    ))), /* @__PURE__ */ React.createElement(GistMigrationPanel, { household, onImported: houseLoad }), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "GitHub Gist \u2014 Manual Backup"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--textLt)", marginBottom: 12 } }, "No longer auto-syncs \u2014 use this as an independent manual backup, or to move data between devices."), /* @__PURE__ */ React.createElement(
      GistSettingsPanel,
      {
        gistStatus,
        gistMsg,
        gistSave,
        gistLoad,
        gistCreate,
        listSnapshots,
        restoreSnapshot,
        downloadBackup
      }
    ), (() => {
      let bytes = 0, count = 0;
      try {
        entries.forEach((e) => {
          if (e.attachment) {
            bytes += e.attachment.length;
            count++;
          }
        });
        Object.values(overridesByYr || {}).forEach((yr) => Object.values(yr || {}).forEach((o) => {
          if (o && o.attachment) {
            bytes += o.attachment.length;
            count++;
          }
        }));
      } catch (e) {
      }
      if (count === 0) return null;
      const kb = Math.round(bytes / 1024);
      const warn = kb >= 500;
      const pct = Math.min(100, Math.round(kb / 1024 * 100));
      return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text)" } }, "\u{1F4CE} Receipt storage \u2014 ", count, " attachment", count !== 1 ? "s" : ""), /* @__PURE__ */ React.createElement("span", { style: {
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 12,
        fontWeight: 700,
        color: warn ? "var(--amber)" : "var(--textMid)"
      } }, kb, " KB / ~1 MB")), /* @__PURE__ */ React.createElement("div", { style: { height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
        height: "100%",
        width: pct + "%",
        borderRadius: 3,
        background: warn ? "var(--amber)" : "var(--greenDk)",
        transition: "width 0.3s ease"
      } })), warn && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--amber)", marginTop: 6 } }, "Approaching the sync payload limit \u2014 consider removing receipts from older entries."));
    })()), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Manage Categories"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14 } }, "Drag to reorder. Changes apply to all new entries. Existing entries keep their category name."), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, categories.map((cat, i) => /* @__PURE__ */ React.createElement(
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
      )), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "var(--text)", flex: 1 } }, cat), categoryColors[cat] && /* @__PURE__ */ React.createElement(
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
      }, className: "cf-btn cf-btn--compact cf-btn--secondary" }, "Edit"), /* @__PURE__ */ React.createElement("button", { onClick: () => delCat(i), className: "cf-btn cf-btn--compact cf-btn--danger" }, "Remove"))
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
    } }, "+ Add")), catMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--red)", marginTop: 8 } }, catMsg)), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Security"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("label", { htmlFor: "auto-lock-select", style: { fontSize: 13, color: "var(--text)" } }, "Auto-lock when in background"), /* @__PURE__ */ React.createElement(
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
    )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 8 } }, "Signs you out if the app stays hidden or backgrounded longer than the selected time.")), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Target Budget Reset \u2014 ", activeYear), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Set every category's monthly budget target equal to the actual expenses scheduled for that month in ", activeYear, ". This overwrites all existing targets for ", activeYear, " with a plan that matches your current entries \u2014 a useful starting point you can then fine-tune."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmTgtReset(true),
        style: {
          fontSize: 13,
          fontWeight: 600,
          padding: "9px 20px",
          borderRadius: 8,
          border: "1px solid var(--navy)",
          cursor: "pointer",
          background: "var(--navy)",
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
    )), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20, border: "1px solid var(--redLt)" } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Danger Zone"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Clear this device's local cache \u2014 entries, overrides, categories, templates, budget targets, years, and local preferences. ", household ? "Your data in Supabase is not affected \u2014 the app will reload it from the cloud right after." : "Export a backup first if you might need this data again.", " This cannot be undone locally."), /* @__PURE__ */ React.createElement(
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
    ))), settingsPage === "household" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Household Members"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Everyone listed here signs in with their own email and password and shares this budget."), members.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.user_id, style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 0",
      borderBottom: "1px solid var(--border)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" } }, m.full_name || "(no name)", " ", (sessionUser == null ? void 0 : sessionUser.id) === m.user_id && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)", fontWeight: 400 } }, "(You)")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 2 } }, m.role === "owner" ? "Owner" : "Member", m.disabled ? " \xB7 Disabled" : "")), (sessionUser == null ? void 0 : sessionUser.id) !== m.user_id && /* @__PURE__ */ React.createElement(
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
    ))), memberMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--red)", marginTop: 10 } }, memberMsg)), /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Invite a family member"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 14, lineHeight: 1.5 } }, "Generate a one-time code. Share it with them, then have them sign up and enter it on the “Join with invite code” screen."), /* @__PURE__ */ React.createElement(
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
  function useGistSync({
    entries,
    setEntries,
    overridesByYr,
    setOverridesByYr,
    yearConfigs,
    budgetTargets,
    setBudgetTargets,
    templates,
    setTemplates,
    completed,
    setCompleted,
    goals = [],
    setGoals = () => {
    },
    dashHidden = {},
    setDashHidden = () => {
    },
    dashOrder = [],
    setDashOrder = () => {
    },
    setYearConfigs,
    categories,
    setCategories,
    categoryColors = {},
    setCategoryColors = () => {
    },
    activeYear,
    setActiveYear,
    alertThreshold,
    setAlertThreshold,
    darkMode,
    setDarkMode,
    forecastHorizon = 90,
    setForecastHorizon = () => {
    },
    colOrder = [],
    setColOrder = () => {
    },
    regFilter = "all",
    setRegFilter = () => {
    },
    regFilterCats = [],
    setRegFilterCats = () => {
    },
    regFilterScheds = [],
    setRegFilterScheds = () => {
    },
    regFilterStatus = [],
    setRegFilterStatus = () => {
    },
    aiApiKey = "",
    setAiApiKey,
    users = [],
    setUsers
  }) {
    const FILE = "CashFlow_Data.json";
    const [status, setStatus] = useState("idle");
    const [conflict, setConflict] = useState(null);
    const lastSyncedAt = useRef(null);
    const [msg, setMsg] = useState("");
    const pendingSync = useRef(false);
    useEffect(() => {
      const onOnline = () => {
        if (pendingSync.current) {
          pendingSync.current = false;
          setMsg("Back online \u2014 syncing\u2026");
          setTimeout(() => saveData(true), 1e3);
        }
      };
      window.addEventListener("online", onOnline);
      return () => window.removeEventListener("online", onOnline);
    }, []);
    const listSnapshots = useCallback(async () => {
      try {
        const tok = token(), gid = gistId();
        if (!tok || !gid) return [];
        const r = await fetch(`https://api.github.com/gists/${gid}`, { headers: hdrs(tok) });
        if (!r.ok) return [];
        const d = await r.json();
        return [1, 2, 3].map((n) => {
          var _a;
          const f = (_a = d.files) == null ? void 0 : _a[`CashFlow_Snapshot_${n}.json`];
          if (!(f == null ? void 0 : f.content)) return null;
          try {
            const pl = JSON.parse(f.content);
            return { n, savedAt: pl.savedAt || null, entries: (pl.entries || []).length, goals: (pl.goals || []).length };
          } catch (e) {
            return null;
          }
        }).filter(Boolean);
      } catch (e) {
        return [];
      }
    }, []);
    const restoreSnapshot = useCallback(async (n) => {
      var _a, _b, _c, _d;
      try {
        const tok = token(), gid = gistId();
        if (!tok || !gid) return false;
        setStatus("syncing");
        setMsg(`Restoring snapshot ${n}\u2026`);
        const r = await fetch(`https://api.github.com/gists/${gid}`, { headers: hdrs(tok) });
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        const d = await r.json();
        const snap = (_b = (_a = d.files) == null ? void 0 : _a[`CashFlow_Snapshot_${n}.json`]) == null ? void 0 : _b.content;
        if (!snap) throw new Error("Snapshot not found");
        const cur = (_d = (_c = d.files) == null ? void 0 : _c[FILE]) == null ? void 0 : _d.content;
        const files = { [FILE]: { content: snap } };
        if (cur) files["CashFlow_Snapshot_1.json"] = { content: cur };
        const w = await fetch(`https://api.github.com/gists/${gid}`, {
          method: "PATCH",
          headers: hdrs(tok),
          body: JSON.stringify({ files })
        });
        if (!w.ok) throw new Error(`GitHub ${w.status}`);
        await loadData();
        setMsg(`Snapshot ${n} restored.`);
        toast(`Snapshot ${n} restored`);
        return true;
      } catch (e) {
        setStatus("error");
        setMsg("Restore failed: " + e.message);
        toast("Restore failed: " + e.message, "error");
        return false;
      }
    }, []);
    const downloadBackup = useCallback(() => {
      try {
        const payload = JSON.stringify({
          entries,
          overridesByYr,
          yearConfigs,
          categories,
          categoryColors,
          budgetTargets,
          templates,
          completed,
          activeYear,
          alertThreshold,
          darkMode,
          forecastHorizon,
          users,
          colOrder,
          regFilter,
          regFilterCats,
          regFilterScheds,
          regFilterStatus,
          goals,
          dashHidden,
          dashOrder,
          schemaVersion: SCHEMA_VERSION,
          savedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `CashFlow_Backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 100);
        toast("Backup downloaded");
      } catch (e) {
        toast("Backup failed: " + e.message, "error");
      }
    }, [
      entries,
      overridesByYr,
      yearConfigs,
      categories,
      categoryColors,
      budgetTargets,
      templates,
      completed,
      activeYear,
      alertThreshold,
      darkMode,
      forecastHorizon,
      users,
      colOrder,
      regFilter,
      regFilterCats,
      regFilterScheds,
      regFilterStatus,
      goals,
      dashHidden,
      dashOrder
    ]);
    const token = () => localStorage.getItem("cf_gist_token") || "";
    const gistId = () => localStorage.getItem("cf_gist_id") || "";
    const hdrs = (tok) => ({
      "Authorization": `token ${tok}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    });
    const saveData = useCallback(async (silent = false, force = false) => {
      var _a, _b, _c, _d;
      const tok = token().trim();
      const gid = gistId().trim();
      if (!tok || !gid) return;
      if (!silent) {
        setStatus("syncing");
        setMsg("Saving\u2026");
      } else setStatus("syncing");
      try {
        const aiReports = {};
        try {
          Object.keys(localStorage).filter((k) => k.startsWith("cf_ai_report_")).forEach((k) => {
            try {
              const v = localStorage.getItem(k);
              if (v) aiReports[k.replace("cf_ai_report_", "")] = JSON.parse(v);
            } catch (e) {
            }
          });
        } catch (e) {
        }
        let remoteFiles = null;
        try {
          const chk = await fetch(`https://api.github.com/gists/${gid}`, { headers: hdrs(tok) });
          if (chk.ok) {
            const cd = await chk.json();
            remoteFiles = cd.files || null;
          }
        } catch (e) {
        }
        if (!force && remoteFiles) {
          try {
            const remoteRaw = (_a = remoteFiles[FILE]) == null ? void 0 : _a.content;
            if (remoteRaw) {
              const remote = JSON.parse(remoteRaw);
              if (remote.savedAt && lastSyncedAt.current && remote.savedAt > lastSyncedAt.current) {
                setConflict({
                  remoteSavedAt: remote.savedAt,
                  remoteEntries: (remote.entries || []).length,
                  localEntries: entries.length,
                  remoteData: remote
                });
                setStatus("error");
                setMsg("\u26A0 Sync conflict \u2014 another device saved newer data.");
                return;
              }
            }
          } catch (e) {
          }
        }
        const snapFiles = {};
        try {
          const SNAP_MS = 6 * 60 * 60 * 1e3;
          const lastSnap = parseInt(localStorage.getItem("cf_last_snapshot") || "0", 10);
          const due = force || Date.now() - lastSnap > SNAP_MS;
          if (due && remoteFiles && ((_b = remoteFiles[FILE]) == null ? void 0 : _b.content)) {
            snapFiles["CashFlow_Snapshot_1.json"] = { content: remoteFiles[FILE].content };
            if ((_c = remoteFiles["CashFlow_Snapshot_1.json"]) == null ? void 0 : _c.content)
              snapFiles["CashFlow_Snapshot_2.json"] = { content: remoteFiles["CashFlow_Snapshot_1.json"].content };
            if ((_d = remoteFiles["CashFlow_Snapshot_2.json"]) == null ? void 0 : _d.content)
              snapFiles["CashFlow_Snapshot_3.json"] = { content: remoteFiles["CashFlow_Snapshot_2.json"].content };
            try {
              localStorage.setItem("cf_last_snapshot", String(Date.now()));
            } catch (e) {
            }
          }
        } catch (e) {
        }
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const payload = JSON.stringify({
          entries,
          overridesByYr,
          yearConfigs,
          categories,
          categoryColors,
          budgetTargets,
          templates,
          completed,
          activeYear,
          alertThreshold,
          darkMode,
          forecastHorizon,
          aiReports,
          users,
          colOrder,
          regFilter,
          regFilterCats,
          regFilterScheds,
          regFilterStatus,
          goals,
          dashHidden,
          dashOrder,
          schemaVersion: SCHEMA_VERSION,
          savedAt: nowIso
        }, null, 2);
        const r = await fetch(`https://api.github.com/gists/${gid}`, {
          method: "PATCH",
          headers: hdrs(tok),
          body: JSON.stringify({ files: __spreadValues({ [FILE]: { content: payload } }, snapFiles) })
        });
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        lastSyncedAt.current = nowIso;
        setConflict(null);
        setStatus("ok");
        if (!silent) haptic();
        setMsg("Auto-saved " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
      } catch (e) {
        if (!navigator.onLine) {
          pendingSync.current = true;
          setStatus("error");
          setMsg("\u{1F4F6} Offline \u2014 will sync when reconnected.");
        } else {
          setStatus("error");
          setMsg("\u274C " + e.message);
        }
      }
    }, [
      entries,
      overridesByYr,
      yearConfigs,
      categories,
      categoryColors,
      budgetTargets,
      templates,
      completed,
      activeYear,
      alertThreshold,
      darkMode,
      forecastHorizon,
      users,
      colOrder,
      regFilter,
      regFilterCats,
      regFilterScheds,
      regFilterStatus,
      goals,
      dashHidden,
      dashOrder
    ]);
    const loadData = useCallback(async () => {
      var _a, _b;
      const tok = token().trim();
      const gid = gistId().trim();
      if (!tok || !gid) return false;
      setStatus("syncing");
      setMsg("Loading from Gist\u2026");
      try {
        const r = await fetch(`https://api.github.com/gists/${gid}`, { headers: hdrs(tok) });
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        const data = await r.json();
        const raw = (_b = (_a = data.files) == null ? void 0 : _a[FILE]) == null ? void 0 : _b.content;
        if (!raw) throw new Error("File not found in Gist");
        const d = JSON.parse(raw);
        if (d.entries) setEntries(d.entries);
        if (d.overridesByYr) setOverridesByYr(d.overridesByYr);
        if (d.yearConfigs) setYearConfigs(d.yearConfigs);
        if (d.categories) setCategories(d.categories);
        if (d.categoryColors && typeof d.categoryColors === "object") setCategoryColors(d.categoryColors);
        if (d.activeYear) setActiveYear(d.activeYear);
        if (d.alertThreshold != null) setAlertThreshold(d.alertThreshold);
        if (d.darkMode != null) setDarkMode(d.darkMode);
        if (d.forecastHorizon != null) setForecastHorizon(d.forecastHorizon);
        if (Array.isArray(d.goals)) setGoals(d.goals);
        if (d.dashHidden && typeof d.dashHidden === "object") setDashHidden(d.dashHidden);
        if (Array.isArray(d.dashOrder)) setDashOrder(d.dashOrder);
        if (Array.isArray(d.colOrder) && d.colOrder.length > 1) setColOrder(d.colOrder.filter((c) => c !== "actions"));
        if (d.savedAt) lastSyncedAt.current = d.savedAt;
        if (d.regFilter) setRegFilter(d.regFilter);
        if (Array.isArray(d.regFilterCats)) setRegFilterCats(d.regFilterCats);
        if (Array.isArray(d.regFilterScheds)) setRegFilterScheds(d.regFilterScheds);
        if (Array.isArray(d.regFilterStatus)) setRegFilterStatus(d.regFilterStatus);
        if (d.budgetTargets) setBudgetTargets(d.budgetTargets);
        if (d.templates) setTemplates(d.templates);
        if (d.completed) setCompleted(d.completed);
        if (d.users && Array.isArray(d.users) && setUsers) {
          setUsers((prev) => {
            const merged = [...prev];
            (d.users || []).forEach((u) => {
              if (!merged.find((x) => x.id === u.id)) merged.push(u);
              else {
                const idx = merged.findIndex((x) => x.id === u.id);
                if (idx >= 0) merged[idx] = __spreadValues(__spreadValues({}, merged[idx]), u);
              }
            });
            return merged;
          });
        }
        if (d.aiReports && typeof d.aiReports === "object") {
          try {
            Object.entries(d.aiReports).forEach(([year, report]) => {
              localStorage.setItem(`cf_ai_report_${year}`, JSON.stringify(report));
            });
          } catch (e) {
          }
        }
        setStatus("ok");
        setMsg("Loaded " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
        return true;
      } catch (e) {
        setStatus("error");
        setMsg("\u274C " + e.message);
        return false;
      }
    }, []);
    const createGist = useCallback(async (tok) => {
      setStatus("syncing");
      setMsg("Creating Gist\u2026");
      try {
        const aiReports = {};
        try {
          Object.keys(localStorage).filter((k) => k.startsWith("cf_ai_report_")).forEach((k) => {
            try {
              const v = localStorage.getItem(k);
              if (v) aiReports[k.replace("cf_ai_report_", "")] = JSON.parse(v);
            } catch (e) {
            }
          });
        } catch (e) {
        }
        const payload = JSON.stringify({
          entries,
          overridesByYr,
          yearConfigs,
          categories,
          categoryColors,
          budgetTargets,
          templates,
          completed,
          activeYear,
          alertThreshold,
          darkMode,
          forecastHorizon,
          aiReports,
          users,
          colOrder,
          regFilter,
          regFilterCats,
          regFilterScheds,
          regFilterStatus,
          schemaVersion: SCHEMA_VERSION,
          savedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, null, 2);
        const r = await fetch("https://api.github.com/gists", {
          method: "POST",
          headers: hdrs(tok),
          body: JSON.stringify({
            description: "CashFlow Budget Data",
            public: false,
            files: { [FILE]: { content: payload } }
          })
        });
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        const data = await r.json();
        localStorage.setItem("cf_gist_id", data.id);
        setStatus("ok");
        setMsg("Gist created \u2713 Auto-save is now active.");
        return data.id;
      } catch (e) {
        setStatus("error");
        setMsg("\u274C " + e.message);
        return null;
      }
    }, [
      entries,
      overridesByYr,
      yearConfigs,
      categories,
      categoryColors,
      budgetTargets,
      templates,
      completed,
      activeYear,
      alertThreshold,
      darkMode,
      forecastHorizon,
      users,
      colOrder,
      regFilter,
      regFilterCats,
      regFilterScheds,
      regFilterStatus,
      goals,
      dashHidden,
      dashOrder
    ]);
    return { status, msg, saveData, loadData, createGist, listSnapshots, restoreSnapshot, downloadBackup, conflict, resolveConflict: (keepMine) => {
      if (keepMine) {
        setConflict(null);
        saveData(false, true);
      } else if (conflict == null ? void 0 : conflict.remoteData) {
        setConflict(null);
        loadData();
      } else setConflict(null);
    } };
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
