  function AlertsPanel({ flow, alertThreshold, setTab, gotoForecast = () => {
  } }) {
    const today = /* @__PURE__ */ new Date();
    const next90 = new Date(today);
    next90.setDate(today.getDate() + 90);
    const alerts = flow.filter((ev) => ev.date >= today && ev.date <= next90 && ev.balance < alertThreshold).sort((a, b) => a.date - b.date);
    const critical = alerts.filter((a) => a.balance < 0);
    const warning = alerts.filter((a) => a.balance >= 0);
    const renderAlertRow = (ev) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: ev.id,
        type: "button",
        onClick: gotoForecast,
        className: "alert-row",
        style: {
          background: ev.balance < 0 ? "var(--redLt)" : "var(--amberLt)",
          border: `1px solid ${ev.balance < 0 ? "var(--red)" : "var(--amber)"}`
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "alert-row-icon", style: { color: ev.balance < 0 ? "var(--red)" : "var(--amber)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 18 })),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, ev.desc), /* @__PURE__ */ React.createElement("div", { className: "txm mt-2" }, MONTHS[ev.month], " ", ev.day, " \xB7 ", ev.category)),
      /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("div", { className: "alert-row-balance", style: {
        color: ev.balance < 0 ? "var(--red)" : "var(--amber)"
      } }, fmt(ev.balance)), /* @__PURE__ */ React.createElement("div", { className: "caption-10" }, "projected balance")),
      /* @__PURE__ */ React.createElement("span", { className: "alert-row-cta" }, "\u2192 Forecast")
    );
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement("div", { className: "settings-header-row" }, /* @__PURE__ */ React.createElement("div", { className: "c-textMid" }, /* @__PURE__ */ React.createElement(Icon, { name: "bell", size: 24 })), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "settings-header-title" }, "Notifications"), /* @__PURE__ */ React.createElement("div", { className: "txm mt-2" }, "Balance alerts within the next 90 days \xB7 Threshold: ", fmt(alertThreshold))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTab("dashboard"),
        className: "cf-btn cf-btn--secondary cf-btn--md"
      },
      "← Back"
    )), alerts.length === 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { className: "alerts-empty-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "alerts-empty-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "check-circle", size: 40 })), /* @__PURE__ */ React.createElement("div", { className: "alerts-empty-title" }, "All clear!"), /* @__PURE__ */ React.createElement("div", { className: "txl" }, "No balance alerts in the next 90 days."))), critical.length > 0 && /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "alert-section-label", style: {
      color: "var(--red)"
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 13 }), "Critical \u2014 Balance goes negative"), critical.map((ev) => renderAlertRow(ev))), warning.length > 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { className: "alert-section-label", style: {
      color: "var(--amber)"
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 13 }), "Warning \u2014 Balance below threshold"), warning.map((ev) => renderAlertRow(ev))));
  }
  // One-time (non-repeating) entries exist only in the year of their startDate,
  // so carrying them into another year means cloning them onto the same
  // month/day, with any per-occurrence edit made in the source year (moved
  // date, changed amount/description/notes) baked in so the copy reflects
  // what the user actually sees, not the original saved values.
  //
  // Copies can also go stale: a copy made before an edit (or by an older app
  // version that ignored edits) keeps the outdated date/amount forever, and a
  // date-only dedupe would then re-clone the entry as a duplicate. So this is
  // a sync, not a blind copy: source and target singles are paired by
  // desc + type + category (positionally, in date order, when there are
  // several of the same name). Paired copies the user hasn't edited in the
  // target year are UPDATED to the source's effective date/amount/notes;
  // paired copies with their own target-year edits are left entirely alone;
  // unpaired source entries are cloned. Returns { clones, updates } where
  // updates is [{ id, startDate, amount, notes }] to apply to existing
  // entries. Re-running converges: a second pass changes nothing.
  // Pairing a source entry with its copy uses provenance first: every clone is
  // stamped with copiedFrom = the source entry's id, making later syncs exact.
  // Copies that predate the stamp fall back to matching by desc + type +
  // category + month/day (the source's effective or original date, so both
  // accurate and stale legacy copies are found) — and get stamped on the way,
  // so a copy the user renamed or moved to an unrelated date simply stops
  // being treated as a copy. A target-year entry that pairs with nothing —
  // e.g. one the user added themselves — is never touched or re-dated.
  //
  // Updates are per-field: a field is only changed when it still holds the
  // source's original value (a stale copy), never when the user has set it to
  // something of their own — so editing a copy through the entry form keeps
  // that edit, and a copy with its own occurrence edit is skipped entirely.
  function syncSingleEntriesToYear(entries, fromYear, toYear, fromOvs = {}, toOvs = {}, deletedCopyIds = {}) {
    const srcs = [];
    const tgts = [];
    entries.forEach((e) => {
      if (e.repeats || !e.startDate) return;
      if (e.startDate.startsWith(`${fromYear}-`)) {
        const [, mm, dd] = e.startDate.split("-").map(Number);
        const ov = fromOvs[`${e.id}-${fromYear}-${mm - 1}-${dd}`] || {};
        const effM = ov.month !== void 0 ? Math.min(Math.max(0, ov.month), 11) : mm - 1;
        const effD = Math.min(Math.max(1, ov.day !== void 0 ? ov.day : dd), daysInMonth(effM, toYear));
        srcs.push({
          e,
          desc: ov.desc !== void 0 ? ov.desc : e.desc,
          amount: ov.amount !== void 0 ? ov.amount : e.amount,
          notes: ov.notes !== void 0 ? ov.notes : e.notes || "",
          effMD: `${String(effM + 1).padStart(2, "0")}-${String(effD).padStart(2, "0")}`,
          rawMD: e.startDate.slice(5)
        });
      } else if (e.startDate.startsWith(`${toYear}-`)) {
        const [, tm, td] = e.startDate.split("-").map(Number);
        tgts.push({ e, edited: !!toOvs[`${e.id}-${toYear}-${tm - 1}-${td}`] });
      }
    });
    const claimed = new Set();
    const pairOf = {};
    const tgtByProv = {};
    tgts.forEach((t) => {
      if (t.e.copiedFrom !== void 0 && tgtByProv[t.e.copiedFrom] === void 0) tgtByProv[t.e.copiedFrom] = t;
    });
    srcs.forEach((s) => {
      const t = tgtByProv[s.e.id];
      if (t && !claimed.has(t.e.id)) {
        claimed.add(t.e.id);
        pairOf[s.e.id] = t;
      }
    });
    // Legacy fallback: unstamped copies matched by identity + date (effective
    // date first so accurate copies win, then the raw date to catch stale ones).
    ["effMD", "rawMD"].forEach((dateField) => {
      srcs.forEach((s) => {
        if (pairOf[s.e.id]) return;
        const t = tgts.find(
          (t2) => !claimed.has(t2.e.id) && t2.e.copiedFrom === void 0 && t2.e.type === s.e.type && t2.e.category === s.e.category && (t2.e.desc === s.desc || t2.e.desc === s.e.desc) && t2.e.startDate.slice(5) === s[dateField]
        );
        if (t) {
          claimed.add(t.e.id);
          pairOf[s.e.id] = t;
        }
      });
    });
    const clones = [];
    const updates = [];
    let idBase = Date.now();
    srcs.forEach((s) => {
      const t = pairOf[s.e.id];
      if (!t) {
        // The user deliberately deleted a previous copy of this source entry —
        // don't resurrect it just because it's "missing" from the target year.
        if (deletedCopyIds[s.e.id]) return;
        clones.push(__spreadProps(__spreadValues({}, s.e), { id: idBase++, desc: s.desc, amount: s.amount, notes: s.notes, startDate: `${toYear}-${s.effMD}`, copiedFrom: s.e.id }));
        return;
      }
      // The user edited this copy's occurrence in the target year — theirs wins.
      if (t.edited) return;
      const desired = { startDate: `${toYear}-${s.effMD}`, amount: s.amount, notes: s.notes };
      const original = { startDate: `${toYear}-${s.rawMD}`, amount: s.e.amount, notes: s.e.notes || "" };
      const patch = {};
      ["startDate", "amount", "notes"].forEach((f) => {
        const cur = f === "notes" ? t.e.notes || "" : t.e[f];
        if (cur !== desired[f] && cur === original[f]) patch[f] = desired[f];
      });
      if (t.e.copiedFrom !== s.e.id) patch.copiedFrom = s.e.id;
      if (Object.keys(patch).length) updates.push({ id: t.e.id, patch });
    });
    return { clones, updates };
  }
  // Per-occurrence edits (overridesByYr) are keyed by entry + calendar date,
  // so a modified recurring occurrence silently reverts to its base values in
  // a newly added year. This maps the source year's overrides onto target-year
  // occurrences that fall on the same month/day (monthly, semi-monthly and
  // yearly recurrences; daily/weekly occurrences land on different dates so
  // nothing matches and they're skipped). Only user-facing edit fields are
  // carried — receipts and edit history stay in their own year — and existing
  // target-year overrides are never touched.
  // Overrides the user creates through the occurrence editor are stamped with
  // _savedAt; overrides written by this sync are not. That stamp is the
  // ownership marker: user-stamped target overrides are never touched, while
  // sync-written ones may be refreshed on a later run so source-year edits
  // made after the target year was created still flow forward.
  function copyOccurrenceOverridesToYear(entries, fromOvs, fromYear, toYear, existingToOvs = {}) {
    const valid = new Set(expandEntries(entries, toYear, {}).map((ev) => ev.id));
    const added = {};
    Object.keys(fromOvs || {}).forEach((key) => {
      const m = key.match(new RegExp(`^(.+)-${fromYear}-(\\d+)-(\\d+)$`));
      if (!m) return;
      const newKey = `${m[1]}-${toYear}-${m[2]}-${m[3]}`;
      if (!valid.has(newKey)) return;
      const existing = existingToOvs[newKey];
      if (existing && existing._savedAt !== void 0) return;
      const copy = {};
      let changed = false;
      ["desc", "amount", "notes", "month", "day"].forEach((f) => {
        if (fromOvs[key][f] === void 0) return;
        copy[f] = fromOvs[key][f];
        if (!existing || existing[f] !== copy[f]) changed = true;
      });
      if (!Object.keys(copy).length || !changed) return;
      added[newKey] = existing ? __spreadValues(__spreadValues({}, existing), copy) : copy;
    });
    return added;
  }
  // Recurring amounts often vary WITHIN a year (net pay starts lower in
  // January and rises once CPP/EI max out, then resets the next January), so
  // no single amount can represent an entry. Rule for carrying amounts into a
  // new year: mirror the source year's amount profile occurrence-by-occurrence
  // — the target year's Nth occurrence gets the effective amount (base +
  // occurrence edits) of the source year's Nth occurrence, and the dates still
  // come purely from the recurrence pattern. If the target year has more
  // occurrences (e.g. 27 biweekly paydays vs 26), the extras repeat the final
  // source amount. Overrides are only written where the mirrored amount
  // differs from what the occurrence would show anyway; user-made overrides
  // in the target year (stamped _savedAt) are never touched.
  function mirrorRecurringAmountsToYear(entries, fromOvs, fromYear, toYear, existingToOvs = {}, plannedAdds = {}) {
    const recurring = entries.filter((e) => e.repeats);
    if (!recurring.length) return {};
    const srcAmts = {};
    expandEntries(recurring, fromYear, fromOvs).forEach((ev) => {
      (srcAmts[ev.entryId] = srcAmts[ev.entryId] || []).push(ev.amount);
    });
    const added = {};
    const idxByEntry = {};
    expandEntries(recurring, toYear, {}).forEach((ev) => {
      const src = srcAmts[ev.entryId];
      const i = idxByEntry[ev.entryId] = (idxByEntry[ev.entryId] || 0) + 1;
      if (!src || !src.length) return;
      const srcAmt = src[Math.min(i - 1, src.length - 1)];
      if (plannedAdds[ev.id]) return;
      const existing = existingToOvs[ev.id];
      if (existing) {
        // _savedAt marks a user-made override — protected. Sync-written ones
        // may be refreshed so later source-year edits still mirror forward.
        if (existing._savedAt !== void 0 || existing.amount === srcAmt) return;
        added[ev.id] = __spreadProps(__spreadValues({}, existing), { amount: srcAmt });
      } else {
        if (srcAmt === ev.amount) return;
        added[ev.id] = { amount: srcAmt };
      }
    });
    return added;
  }
  function SettingsView({ categories, setCategories, categoryColors = {}, setCategoryColors = () => {
  }, alertThreshold, setAlertThreshold, darkMode, setDarkMode, yearConfigs, setYearConfigs, activeYear, setActiveYear, overridesByYr, setOverridesByYr, entries, setEntries, completed = {}, setCompleted = () => {
  }, goals = [], setGoals = () => {
  }, debtData = {}, setDebtData = () => {
  }, deletedCopyIds = {}, setDeletedCopyIds = () => {
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
    const [confirmDelYear, setConfirmDelYear] = useState(null);
    const [confirmCopyYear, setConfirmCopyYear] = useState(null);
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
    const nextYear = (yearConfigs.length ? Math.max(...yearConfigs.map((yc) => yc.year)) : (/* @__PURE__ */ new Date()).getFullYear()) + 1;
    const addYear = () => {
      const y = nextYear;
      if (yearConfigs.find((yc) => yc.year === y)) {
        setYearMsg(`Year ${y} already exists.`);
        return;
      }
      // Adding a year never touches existing years' data. Ongoing recurring
      // entries flow into the new year automatically via expandEntries; the
      // new year is seeded with a copy of the previous year's budget targets
      // and clones of its one-time entries (shifted to the same month/day).
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
      const prevOvs = overridesByYr[prevYear] || {};
      const { clones: singleClones, updates: singleUpdates } = syncSingleEntriesToYear(entries, prevYear, y, prevOvs, overridesByYr[y] || {});
      if (singleClones.length || singleUpdates.length) setEntries((prev) => [
        ...prev.map((e) => {
          const u = singleUpdates.find((x) => x.id === e.id);
          return u ? __spreadValues(__spreadValues({}, e), u.patch) : e;
        }),
        ...singleClones
      ]);
      const ovAdds = copyOccurrenceOverridesToYear(entries, prevOvs, prevYear, y, overridesByYr[y] || {});
      const amtAdds = mirrorRecurringAmountsToYear(entries, prevOvs, prevYear, y, overridesByYr[y] || {}, ovAdds);
      const ovCount = Object.keys(ovAdds).length;
      const amtCount = Object.keys(amtAdds).length;
      if (ovCount || amtCount) setOverridesByYr((prev) => __spreadProps(__spreadValues({}, prev), { [y]: __spreadValues(__spreadValues(__spreadValues({}, prev[y] || {}), ovAdds), amtAdds) }));
      setYearConfigs((prev) => [...prev, { year: y, openingBalance: 0 }].sort((a, b) => a.year - b.year));
      setActiveYear(y);
      const parts = [`Year ${y} added — ${prevYear} is untouched.`];
      if (copiedTargets > 0) parts.push(`${copiedTargets} monthly budget targets copied from ${prevYear}.`);
      if (singleClones.length > 0) parts.push(`${singleClones.length} one-time entr${singleClones.length === 1 ? "y" : "ies"} copied from ${prevYear}.`);
      if (ovCount > 0) parts.push(`${ovCount} modified occurrence${ovCount === 1 ? "" : "s"} carried over.`);
      if (amtCount > 0) parts.push(`${prevYear}'s amount pattern mirrored onto ${amtCount} occurrence${amtCount === 1 ? "" : "s"}.`);
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
    // Keyboard/touch alternative to drag-reordering.
    const moveCat = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= categories.length) return;
      const arr = [...categories];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      setCategories(arr);
    };
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement("div", { className: "settings-toprow" }, /* @__PURE__ */ React.createElement("div", {
      className: "settings-page-pills"
    }, [
      { id: "general", icon: "settings", label: "General" },
      { id: "household", icon: "users", label: "Household" },
      { id: "templates", icon: "clipboard", label: "Templates" },
      { id: "audit", icon: "clock", label: "Audit" }
    ].map(({ id, icon, label }) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: id,
        onClick: () => setSettingsPage(id),
        className: "settings-pill-btn",
        style: {
          background: settingsPage === id ? "var(--bgCard)" : "transparent",
          color: settingsPage === id ? "var(--text)" : "var(--textMid)",
          boxShadow: settingsPage === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 14 }),
      label
    ))), /* @__PURE__ */ React.createElement("span", { className: "build-version-tag" }, "Build ", APP_VERSION)), settingsPage === "general" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "settings-quicklinks" }, [
      // Order matches the sections as they appear down the page.
      ["sec-ai-key", "AI Key"],
      ["sec-alert", "Alert Threshold"],
      ["sec-appearance", "Appearance"],
      ["sec-years", "Budget Years"],
      ["sec-backup", "Backup"],
      ...sbConfigured && household ? [["sec-sync", "Sync"]] : [],
      ["sec-categories", "Categories"],
      ["sec-security", "Security"],
      ["sec-reset", "Target Reset"],
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
        className: "quicklink-pill"
      },
      label
    ))), /* @__PURE__ */ React.createElement(Card, { id: "sec-ai-key", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "AI Insights \u2014 Anthropic API Key"), /* @__PURE__ */ React.createElement("div", { className: "txl lh-15 mb-12" }, "Required for the AI Insights tab. Your key is saved with your household's data in Supabase (so it's shared across your own devices and household members) and sent directly to Anthropic from your browser when you run a report \u2014 never to any third party. Anyone able to run script in this page could read it, same as any other browser-side API key. Get a key at", " ", /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "https://console.anthropic.com",
        target: "_blank",
        rel: "noopener noreferrer",
        className: "link-primary"
      },
      "console.anthropic.com"
    ), "."), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 cf-wrap" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: showAiKey ? "text" : "password",
        "aria-label": "Anthropic API Key",
        value: aiApiKey,
        onChange: (e) => setAiApiKey(e.target.value),
        placeholder: "sk-ant-api03-...",
        className: "cf-text-mono-13 ai-key-input"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAiKey((v) => !v),
        className: "cf-btn cf-btn--secondary cf-btn--showhide"
      },
      showAiKey ? "Hide" : "Show"
    ), aiApiKey.trim() && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setAiApiKey(""),
        className: "clear-key-btn"
      },
      "Clear key"
    )), /* @__PURE__ */ React.createElement("div", { className: "key-disclaimer-row" }, /* @__PURE__ */ React.createElement("span", { className: "ai-disclaimer-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "key", size: 12 })), /* @__PURE__ */ React.createElement("span", null, "Stored with your household data and sent straight from your browser to Anthropic — anyone who can run script on this page can read it."))), /* @__PURE__ */ React.createElement(Card, { id: "sec-alert", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Alert Threshold"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12" }, /* @__PURE__ */ React.createElement("label", { className: "settings-label", htmlFor: "alert-threshold" }, "Warn when balance drops below"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "dollar-md" }, "$"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "alert-threshold",
        type: "number",
        inputMode: "decimal",
        step: "100",
        min: "0",
        className: "settings-input w-120",
        value: centsToDollars(alertThreshold),
        onChange: (e) => setAlertThreshold(Math.max(0, dollarsToCents(e.target.value)))
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "txl mt-8" }, "Used everywhere in the app: Dashboard alerts, Forecast warnings, and Budget balance colouring.")), /* @__PURE__ */ React.createElement(Card, { id: "sec-appearance", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Appearance"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-16" }, /* @__PURE__ */ React.createElement(Toggle, { value: darkMode, onChange: setDarkMode, label: "Dark Mode" }), /* @__PURE__ */ React.createElement("span", { className: "txl" }, darkMode ? "Dark theme active" : "Light theme active"))), /* @__PURE__ */ React.createElement(Card, { id: "sec-years", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Budget Years"), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14" }, `Years must be added in sequence — only ${nextYear} can be added next. Opening balance for the first year is set here; subsequent years carry forward automatically.`), sortedYears.map((yc) => {
      var _a;
      return /* @__PURE__ */ React.createElement("div", { key: yc.year, className: "year-row", style: {
        background: activeYear === yc.year ? "var(--stripe)" : "var(--bg)",
        border: `1px solid ${activeYear === yc.year ? "var(--primary)" : "var(--border)"}`
      } }, /* @__PURE__ */ React.createElement("span", { className: "year-number" }, yc.year), sortedYears[0].year === yc.year && /* @__PURE__ */ React.createElement("div", { className: "year-openbal" }, /* @__PURE__ */ React.createElement("span", { className: "openbal-label" }, "Opening balance"), /* @__PURE__ */ React.createElement("span", { className: "txm" }, "$"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          step: "0.01",
          className: "cf-text-mono-13 openbal-input",
          value: centsToDollars(yc.openingBalance),
          onChange: (e) => updateOpenBal(yc.year, dollarsToCents(e.target.value))
        }
      )), sortedYears[0].year !== yc.year && /* @__PURE__ */ React.createElement("span", { className: "txl flex-1" }, "Carries forward from ", (_a = sortedYears[sortedYears.indexOf(yc) - 1]) == null ? void 0 : _a.year), /* @__PURE__ */ React.createElement("button", { onClick: () => setActiveYear(yc.year), className: "cf-checkbtn year-active-btn", style: {
        background: activeYear === yc.year ? "var(--primary)" : "transparent",
        color: activeYear === yc.year ? "#fff" : "var(--textMid)"
      } }, activeYear === yc.year ? "Active" : "Switch"), (() => {
        const nextY = yc.year + 1;
        const hasNext = yearConfigs.some((y) => y.year === nextY);
        const hasTargets = Object.keys(budgetTargets || {}).some((k) => k.startsWith(yc.year + ":"));
        const hasSingles = entries.some((e) => !e.repeats && (e.startDate || "").startsWith(yc.year + "-"));
        const hasOvs = Object.keys(overridesByYr[yc.year] || {}).length > 0;
        const runCopy = () => {
              // Compare-and-sync rather than blind copy: anything added to this
              // year after the next year was created gets carried forward, but
              // values already set on the next year are never overwritten.
              let addedTargets = 0;
              const nx = __spreadValues({}, budgetTargets);
              for (let m = 0; m < 12; m++) {
                const pk = `${yc.year}:${m}`;
                const nk = `${nextY}:${m}`;
                if (!budgetTargets[pk] || !Object.keys(budgetTargets[pk]).length) continue;
                const merged = __spreadValues({}, budgetTargets[nk] || {});
                let changed = false;
                Object.keys(budgetTargets[pk]).forEach((cat) => {
                  if (merged[cat] === void 0) {
                    merged[cat] = budgetTargets[pk][cat];
                    addedTargets++;
                    changed = true;
                  }
                });
                if (changed) nx[nk] = merged;
              }
              if (addedTargets) setBudgetTargets(nx);
              const srcOvs = overridesByYr[yc.year] || {};
              const { clones: singleClones, updates: singleUpdates } = syncSingleEntriesToYear(entries, yc.year, nextY, srcOvs, overridesByYr[nextY] || {}, deletedCopyIds);
              if (singleClones.length || singleUpdates.length) setEntries((prev) => [
                ...prev.map((e) => {
                  const u = singleUpdates.find((x) => x.id === e.id);
                  return u ? __spreadValues(__spreadValues({}, e), u.patch) : e;
                }),
                ...singleClones
              ]);
              const ovAdds = copyOccurrenceOverridesToYear(entries, srcOvs, yc.year, nextY, overridesByYr[nextY] || {});
              const amtAdds = mirrorRecurringAmountsToYear(entries, srcOvs, yc.year, nextY, overridesByYr[nextY] || {}, ovAdds);
              const ovCount = Object.keys(ovAdds).length;
              const amtCount = Object.keys(amtAdds).length;
              if (ovCount || amtCount) setOverridesByYr((prev) => __spreadProps(__spreadValues({}, prev), { [nextY]: __spreadValues(__spreadValues(__spreadValues({}, prev[nextY] || {}), ovAdds), amtAdds) }));
              const parts = [];
              if (addedTargets) parts.push(`${addedTargets} budget target${addedTargets === 1 ? "" : "s"} added`);
              if (singleClones.length) parts.push(`${singleClones.length} one-time entr${singleClones.length === 1 ? "y" : "ies"} copied`);
              const visibleUpdates = singleUpdates.filter((u) => u.patch.startDate !== void 0 || u.patch.amount !== void 0 || u.patch.notes !== void 0).length;
              if (visibleUpdates) parts.push(`${visibleUpdates} one-time entr${visibleUpdates === 1 ? "y" : "ies"} updated to match ${yc.year}`);
              if (ovCount) parts.push(`${ovCount} modified occurrence${ovCount === 1 ? "" : "s"} carried over`);
              if (amtCount) parts.push(`${yc.year}'s amount pattern mirrored onto ${amtCount} occurrence${amtCount === 1 ? "" : "s"}`);
              setYearMsg(parts.length ? `\u2705 ${yc.year} \u2192 ${nextY}: ${parts.join(", ")}. Anything you edited in ${nextY} was left alone.` : `\u2705 ${nextY} already matches ${yc.year} \u2014 nothing to change.`);
        };
        return hasNext && (hasTargets || hasSingles || hasOvs) && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setConfirmCopyYear({ year: yc.year, nextY, run: runCopy }),
            title: `Sync ${yc.year} into ${nextY} \u2014 adds missing budget targets and one-time entries, updates unedited copies, never touches anything edited in ${nextY}`,
            className: "copy-year-btn"
          },
          "Copy \u2192",
          nextY
        );
      })(), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (yearConfigs.length <= 1) {
          setYearMsg("Cannot delete the only year.");
          return;
        }
        setConfirmDelYear(yc.year);
      }, className: "cf-btn cf-btn--danger cf-btn--yearremove" }, "Remove"));
    }), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 mt-12" }, /* @__PURE__ */ React.createElement("button", { onClick: addYear, className: "cf-btn cf-btn--primary cf-btn--md" }, `+ Add ${nextYear}`)), yearMsg && /* @__PURE__ */ React.createElement("div", { role: "status", className: "txm mt-8" }, yearMsg), confirmDelYear !== null && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: `Remove budget year ${confirmDelYear}?`,
        message: `Budget year ${confirmDelYear} will be removed from the app, along with any per-occurrence edits made in ${confirmDelYear}. Entries and budget targets are not deleted.`,
        confirmLabel: "Remove Year",
        onConfirm: () => {
          delYear(confirmDelYear);
          setConfirmDelYear(null);
        },
        onCancel: () => setConfirmDelYear(null)
      }
    ), confirmCopyYear !== null && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: `Copy ${confirmCopyYear.year} into ${confirmCopyYear.nextY}?`,
        message: `Missing budget targets and one-time entries from ${confirmCopyYear.year} will be added to ${confirmCopyYear.nextY}, and unedited copies will be updated to match. Anything you've already edited in ${confirmCopyYear.nextY} is left alone.`,
        confirmLabel: "Copy",
        confirmVariant: "primary",
        onConfirm: () => {
          confirmCopyYear.run();
          setConfirmCopyYear(null);
        },
        onCancel: () => setConfirmCopyYear(null)
      }
    )), /* @__PURE__ */ React.createElement(Card, { id: "sec-backup", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Data Backup & Restore"), /* @__PURE__ */ React.createElement("div", { className: "txl mb-16" }, "Back up all your data to a JSON file and restore it any time. Your existing data will be replaced on restore."), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 cf-wrap" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const data = { entries, overridesByYr, yearConfigs, categories, categoryColors, budgetTargets, templates, completed, goals, debtData, deletedCopyIds, activeYear, alertThreshold, darkMode, schemaVersion: SCHEMA_VERSION, exportedAt: (/* @__PURE__ */ new Date()).toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `CashFlow_Backup_${localDateStr(/* @__PURE__ */ new Date())}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, className: "cf-btn cf-btn--primary cf-btn--iconrow" }, /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 14 }), "Export Backup"), /* @__PURE__ */ React.createElement("label", { className: "cf-btn cf-btn--secondary cf-btn--iconrow" }, /* @__PURE__ */ React.createElement(Icon, { name: "upload", size: 14 }), "Import Backup", /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".json", className: "hidden", onChange: (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          // A backup exported before schema v8 (round-9 AR5) still has
          // dollar-scale amounts — upgrade it the same way a stale cloud
          // payload gets upgraded on load, so an old backup can't silently
          // restore 100x-wrong figures.
          const d = (parsed.schemaVersion || 0) < SCHEMA_VERSION ? centsifyHouseholdPayload(parsed) : parsed;
          const fixed = moveEntryAttachmentsToOverrides(
            Array.isArray(d.entries) ? d.entries : [],
            d.overridesByYr && typeof d.overridesByYr === "object" ? d.overridesByYr : {}
          );
          if (Array.isArray(d.entries)) setEntries(fixed.entries);
          if (d.overridesByYr || fixed.moved) setOverridesByYr(fixed.overridesByYr);
          if (Array.isArray(d.yearConfigs)) setYearConfigs(d.yearConfigs);
          if (Array.isArray(d.categories)) setCategories(d.categories);
          if (d.categoryColors && typeof d.categoryColors === "object") setCategoryColors(d.categoryColors);
          if (d.budgetTargets && typeof d.budgetTargets === "object") setBudgetTargets(d.budgetTargets);
          if (Array.isArray(d.templates)) setTemplates(d.templates);
          if (d.completed && typeof d.completed === "object") setCompleted(d.completed);
          if (Array.isArray(d.goals)) setGoals(d.goals);
          if (d.debtData && typeof d.debtData === "object") setDebtData(d.debtData);
          if (d.deletedCopyIds && typeof d.deletedCopyIds === "object") setDeletedCopyIds(d.deletedCopyIds);
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
    } }))), yearMsg && /* @__PURE__ */ React.createElement("div", { role: "status", className: "backup-msg", style: {
      color: yearMsg.startsWith("\u2705") ? "var(--greenDk)" : yearMsg.startsWith("\u274C") ? "var(--red)" : "var(--textMid)"
    } }, yearMsg)), sbConfigured && household && /* @__PURE__ */ React.createElement(Card, { id: "sec-sync", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "\u2601 Supabase \u2014 Auto Sync"), /* @__PURE__ */ React.createElement("div", { role: "status", className: "sync-status-row", style: {
      background: houseStatus === "error" ? "var(--redLt)" : "rgba(39,174,115,0.08)",
      border: `1px solid ${houseStatus === "error" ? "var(--red)" : "rgba(39,174,115,0.25)"}`
    } }, /* @__PURE__ */ React.createElement("div", { className: "sync-icon" }, houseStatus === "error" ? "\u2717" : houseStatus === "syncing" ? "\u27f3" : "\u2601"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, "Auto-sync active"), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, "Changes save automatically to your household's Supabase project")), houseMsg && /* @__PURE__ */ React.createElement("div", { className: "sync-msg", style: { color: houseStatus === "error" ? "var(--red)" : "var(--greenDk)" } }, houseMsg)), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 mt-12" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => houseSave(false),
        disabled: houseStatus === "syncing",
        className: "cf-btn cf-btn--secondary cf-btn--md cf-btn--iconrow-sm"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "upload", size: 12 }),
      "Save Now"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => houseLoad(),
        disabled: houseStatus === "syncing",
        className: "cf-btn cf-btn--secondary cf-btn--md cf-btn--iconrow-sm"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 12 }),
      "Reload from Cloud"
    ))), /* @__PURE__ */ React.createElement(Card, { id: "sec-categories", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Manage Categories"), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14" }, "Drag to reorder. Changes apply to all new entries. Existing entries keep their category name."), /* @__PURE__ */ React.createElement("div", { className: "mb-16" }, categories.map((cat, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: cat,
        draggable: true,
        onDragStart: () => onDragStart(i),
        onDragOver: (e) => onDragOver(e, i),
        onDrop: () => onDrop(i),
        className: "cat-row",
        style: {
          background: dragOverIdx === i ? "var(--stripe)" : "var(--bg)"
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "drag-handle" }, "\u283F"),
      editIdx === i ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { title: "Category color", className: "color-swatch", style: {
        background: editColor !== null ? editColor : getCatColor(cat, categories, categoryColors)
      } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          value: editColor !== null ? editColor : getCatColor(cat, categories, categoryColors),
          onChange: (e) => setEditColor(e.target.value),
          className: "color-swatch-input"
        }
      )), /* @__PURE__ */ React.createElement(
        "input",
        {
          className: "settings-input flex-1",
          value: editVal,
          onChange: (e) => setEditVal(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && saveEdit(),
          autoFocus: true
        }
      ), /* @__PURE__ */ React.createElement("button", { onClick: saveEdit, className: "cf-btn cf-btn--compact cf-btn--primary" }, "Save"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setEditIdx(null);
        setEditColor(null);
      }, className: "cf-btn cf-btn--compact cf-btn--secondary" }, "Cancel")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { title: "Change color", className: "color-swatch", style: {
        background: getCatColor(cat, categories, categoryColors)
      } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          value: getCatColor(cat, categories, categoryColors),
          onChange: (e) => setCategoryColors((p) => __spreadProps(__spreadValues({}, p), { [cat]: e.target.value })),
          className: "color-swatch-input"
        }
      )), /* @__PURE__ */ React.createElement("span", { className: "tx flex-1" }, cat), /* @__PURE__ */ React.createElement("div", { className: "cat-actions-row" }, /* @__PURE__ */ React.createElement("button", { "aria-label": `Move ${cat} up`, className: "wm-arrow", disabled: i === 0, style: { opacity: i === 0 ? 0.3 : 1 }, onClick: () => moveCat(i, -1) }, "↑"), /* @__PURE__ */ React.createElement("button", { "aria-label": `Move ${cat} down`, className: "wm-arrow", disabled: i === categories.length - 1, style: { opacity: i === categories.length - 1 ? 0.3 : 1 }, onClick: () => moveCat(i, 1) }, "↓"), categoryColors[cat] && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setCategoryColors((p) => {
            const n = __spreadValues({}, p);
            delete n[cat];
            return n;
          }),
          title: "Reset to automatic color",
          className: "cf-checkbtn reset-color-btn"
        },
        "Reset"
      ), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setEditIdx(i);
        setEditVal(cat);
        setEditColor(null);
      }, className: "cf-btn cf-btn--compact cf-btn--secondary" }, "Edit"), /* @__PURE__ */ React.createElement("button", { onClick: () => delCat(i), className: "cf-btn cf-btn--compact cf-btn--danger" }, "Remove")))
    ))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("label", { title: "Pick a color (optional \u2014 auto-assigned if left default)", className: "color-swatch", style: {
      background: newCatColor || "var(--border)"
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "color",
        value: newCatColor || "#888888",
        onChange: (e) => setNewCatColor(e.target.value),
        className: "color-swatch-input"
      }
    )), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "settings-input flex-1",
        value: newCat,
        "aria-label": "New category name",
        placeholder: "New category name\u2026",
        onChange: (e) => {
          setNewCat(e.target.value);
          if (catMsg) setCatMsg("");
        },
        onKeyDown: (e) => e.key === "Enter" && addCat()
      }
    ), /* @__PURE__ */ React.createElement("button", { onClick: addCat, className: "cf-btn cf-btn--primary" }, "+ Add")), catMsg && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "error-text-mt8" }, catMsg)), /* @__PURE__ */ React.createElement(Card, { id: "sec-security", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Security"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "auto-lock-select", className: "tx" }, "Auto-lock when in background"), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: "auto-lock-select",
        value: lockTimeout,
        onChange: (e) => setLockTimeout(parseInt(e.target.value, 10)),
        className: "autolock-select"
      },
      /* @__PURE__ */ React.createElement("option", { value: 0 }, "Off"),
      /* @__PURE__ */ React.createElement("option", { value: 5 }, "After 5 minutes"),
      /* @__PURE__ */ React.createElement("option", { value: 15 }, "After 15 minutes"),
      /* @__PURE__ */ React.createElement("option", { value: 30 }, "After 30 minutes")
    )), /* @__PURE__ */ React.createElement("div", { className: "hint mt-8" }, bioEnabled ? "Locks the screen if the app stays hidden or backgrounded longer than the selected time — unlock with your fingerprint / face or your password." : "Locks the screen if the app stays hidden or backgrounded longer than the selected time — unlock with your password."), sessionUser && (bioEnabled || bioSupported && isCoarse) && /* @__PURE__ */ React.createElement("div", { className: "bio-section" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-16" }, /* @__PURE__ */ React.createElement(Toggle, { value: bioEnabled, onChange: toggleBiometric, label: "Unlock with fingerprint / face" }), bioBusy && /* @__PURE__ */ React.createElement("span", { className: "bio-busy-text" }, "Follow your device's prompt…")), /* @__PURE__ */ React.createElement("div", { className: "hint mt-8" }, "Uses your device's screen-lock biometric (fingerprint on Samsung / Android, Face ID or Touch ID on Apple). Registered on this device only — you'll set it up again on any other device or browser you sign in from."), bioEnabled && /* @__PURE__ */ React.createElement("div", { className: "mt-14" }, /* @__PURE__ */ React.createElement(Toggle, { value: lockOnLaunch, onChange: toggleLockOnLaunch, label: "Require fingerprint sign-on when the app opens" }), /* @__PURE__ */ React.createElement("div", { className: "hint mt-6" }, "Every time you open the app on this device it starts locked and asks for your fingerprint right away — you stay signed in underneath, so there's no password to retype.")), bioMsg && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "error-text-mt6" }, bioMsg))), /* @__PURE__ */ React.createElement(Card, { id: "sec-reset", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Target Budget Reset \u2014 ", activeYear), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14 lh-15" }, "Set every category's monthly budget target equal to the actual expenses scheduled for that month in ", activeYear, ". This overwrites all existing targets for ", activeYear, " with a plan that matches your current entries \u2014 a useful starting point you can then fine-tune."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmTgtReset(true),
        className: "reset-targets-btn"
      },
      "\u21BA Reset Targets to Actuals"
    ), tgtResetMsg && /* @__PURE__ */ React.createElement("div", { role: "status", className: "success-text-mt10" }, tgtResetMsg), confirmTgtReset && /* @__PURE__ */ React.createElement(
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
                cats[c] = roundMoney(byMonthCat[key][c]);
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
    )), /* @__PURE__ */ React.createElement(Card, { id: "sec-danger", className: "danger-card" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Danger Zone"), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14 lh-15" }, "Clear this device's local cache \u2014 entries, overrides, categories, templates, budget targets, years, and local preferences. ", household ? "Your data in Supabase is not affected \u2014 the app will reload it from the cloud right after." : "Export a backup first if you might need this data again.", " This cannot be undone locally."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmWipe(true),
        className: "cf-btn cf-btn--danger cf-btn--dangerwide"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "trash", size: 13 }),
      "Reset Local Cache"
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
    ))), settingsPage === "household" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Household Members"), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14 lh-15" }, "Everyone listed here signs in with their own email and password and shares this budget."), members.map((m) => {
      const isEditing = editMemberId === m.user_id;
      return /* @__PURE__ */ React.createElement("div", { key: m.user_id, className: "member-row" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1-minw160" }, isEditing ? /* @__PURE__ */ React.createElement(
        "input",
        {
          autoFocus: true,
          "aria-label": "Member name",
          className: "field-input member-edit-input",
          value: editMemberVal,
          onChange: (e) => setEditMemberVal(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") saveMemberName(m.user_id);
            if (e.key === "Escape") setEditMemberId(null);
          }
        }
      ) : /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, m.full_name || "(no name)", " ", (sessionUser == null ? void 0 : sessionUser.id) === m.user_id && /* @__PURE__ */ React.createElement("span", { className: "you-tag" }, "(You)")), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, m.role === "owner" ? "Owner" : "Member", m.disabled ? " \u00b7 Disabled" : "")), isEditing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => saveMemberName(m.user_id),
          disabled: memberBusy,
          className: "cf-btn cf-btn--primary cf-btn--xs"
        },
        memberBusy ? "Saving\u2026" : "Save"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setEditMemberId(null),
          disabled: memberBusy,
          className: "cf-btn cf-btn--secondary cf-btn--xs"
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
          className: "cf-btn cf-btn--secondary cf-btn--xs"
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
          className: (m.disabled ? "cf-btn cf-btn--primary" : "cf-btn cf-btn--danger") + " cf-btn--xs"
        },
        m.disabled ? "Enable" : "Disable"
      )));
    }), memberMsg && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "error-text-mt10" }, memberMsg)), /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Invite a family member"), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14 lh-15" }, "Generate a one-time code. Share it with them, then have them sign up and enter it on the “Join with invite code” screen."), /* @__PURE__ */ React.createElement(
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
        className: "cf-btn cf-btn--primary"
      },
      inviteBusy ? "Generating…" : "Generate invite code"
    ), inviteCode && /* @__PURE__ */ React.createElement("div", { className: "invite-code-display" }, inviteCode))), settingsPage === "templates" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Entry Templates"), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14" }, 'Templates let you quickly fill the entry form with common entries. Save templates from the entry form using "Save as template".'), (templates || []).length === 0 && /* @__PURE__ */ React.createElement("div", { className: "italic-hint" }, "No templates saved yet. Use the entry form to create one."), (templates || []).map((t, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "template-row" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, t.desc), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, t.type === "income" ? "+" : "-", fmt(t.amount), " \u00b7 ", t.category, t.repeats && /* @__PURE__ */ React.createElement("span", null, " \u00b7 Recurring"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTemplates((prev) => prev.filter((_, j) => j !== i)),
        className: "cf-btn cf-btn--danger cf-btn--yearremove"
      },
      "Remove"
    ))))), settingsPage === "audit" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Recent Edits \u2014 ", activeYear), /* @__PURE__ */ React.createElement("div", { className: "txl mb-14" }, "Per-date overrides you've made to recurring entries. Reverting restores the originally scheduled amount and notes for that date."), (() => {
      const ovrs = overridesByYr[activeYear] || {};
      const rows = Object.entries(ovrs).filter(([, o]) => o && o._savedAt).sort((a, b) => (b[1]._savedAt || "").localeCompare(a[1]._savedAt || "")).slice(0, 20);
      if (rows.length === 0) {
        return /* @__PURE__ */ React.createElement("div", { className: "italic-hint" }, "No edits yet. Click any row in the Budget view to edit a single date \u2014 it'll appear here.");
      }
      return rows.map(([eventId, ov]) => {
        const parts = eventId.split("-");
        const entry = entries.find((e) => String(e.id) === parts[0]);
        const month = parseInt(parts[parts.length - 2]);
        const day = parseInt(parts[parts.length - 1]);
        const dateLabel = entry && !isNaN(month) && !isNaN(day) ? `${MONTHS[month]} ${day}` : eventId;
        const hist = ov._history || [];
        const isOpen = !!historyOpen[eventId];
        return /* @__PURE__ */ React.createElement("div", { key: eventId, className: "audit-entry" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between cf-gap-10 cf-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1-minw160" }, /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, entry ? entry.desc : "Unknown entry", " \xB7 ", dateLabel), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, ov.amount !== void 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, "Amount \u2192 ", fmt(ov.amount), " "), ov.notes && /* @__PURE__ */ React.createElement(React.Fragment, null, '\xB7 Note: "', ov.notes, '" '), "\xB7 Saved ", new Date(ov._savedAt).toLocaleString())), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-6" }, hist.length > 0 && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setHistoryOpen((p) => __spreadProps(__spreadValues({}, p), { [eventId]: !p[eventId] })),
            className: "cf-btn cf-btn--secondary cf-btn--micro"
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
            className: "revert-btn",
            title: "Restore the originally scheduled values for this date"
          },
          "\u21BA Revert"
        ))), isOpen && /* @__PURE__ */ React.createElement("div", { className: "history-list" }, [...hist].reverse().map((h, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "history-item-text" }, new Date(h.ts).toLocaleString(), " \u2014 previous value:", " ", h.prev && h.prev.amount !== void 0 ? fmt(h.prev.amount) : "(scheduled default)", h.prev && h.prev.notes ? ` \xB7 "${h.prev.notes}"` : ""))));
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
        return /* @__PURE__ */ React.createElement("div", { className: "errorboundary-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "errorboundary-title" }, "\u26A0 Something went wrong"), /* @__PURE__ */ React.createElement("pre", { className: "errorboundary-pre" }, this.state.err.message, "\n\n", this.state.err.stack), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => this.setState({ err: null }),
            className: "errorboundary-retry-btn"
          },
          "Try Again"
        ));
      }
      return this.props.children;
    }
  }
