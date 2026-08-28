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
          border: `1px solid ${ev.balance < 0 ? "var(--red)" : "var(--amberInk)"}`
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "alert-row-icon", style: { color: ev.balance < 0 ? "var(--red)" : "var(--amberInk)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 18 })),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, ev.desc), /* @__PURE__ */ React.createElement("div", { className: "txm mt-2" }, MONTHS[ev.month], " ", ev.day, " \xB7 ", ev.category)),
      /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("div", { className: "alert-row-balance", style: {
        color: ev.balance < 0 ? "var(--red)" : "var(--amberInk)"
      } }, fmt(ev.balance)), /* @__PURE__ */ React.createElement("div", { className: "caption-10" }, "projected balance")),
      /* @__PURE__ */ React.createElement("span", { className: "alert-row-cta" }, "\u2192 Forecast")
    );
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page settings-page" }, /* @__PURE__ */ React.createElement("div", { className: "settings-header-row" }, /* @__PURE__ */ React.createElement("div", { className: "c-textMid" }, /* @__PURE__ */ React.createElement(Icon, { name: "bell", size: 24 })), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "settings-header-title" }, "Notifications"), /* @__PURE__ */ React.createElement("div", { className: "txm mt-2" }, "Balance alerts within the next 90 days \xB7 Threshold: ", fmt(alertThreshold))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTab("dashboard"),
        className: "cf-btn cf-btn--secondary cf-btn--md"
      },
      "← Back"
    )), alerts.length === 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { className: "alerts-empty-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "alerts-empty-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "check-circle", size: 40 })), /* @__PURE__ */ React.createElement("div", { className: "alerts-empty-title" }, "All clear!"), /* @__PURE__ */ React.createElement("div", { className: "txl" }, "No balance alerts in the next 90 days."))), critical.length > 0 && /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "alert-section-label", style: {
      color: "var(--red)"
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 13 }), "Critical \u2014 Balance goes negative"), critical.map((ev) => renderAlertRow(ev))), warning.length > 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { className: "alert-section-label", style: {
      color: "var(--amberInk)"
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 13 }), "Warning \u2014 Balance below threshold"), warning.map((ev) => renderAlertRow(ev))));
  }
  // Delivery hour choices for background push. Labelled in 12-hour form
  // because that's how the alert time reads on the phone that receives it.
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`
  }));

  // One line of plain English about whether alerts can reach a closed app.
  // The distinction matters: "notifications are on" means something quite
  // different when they can only fire in a foreground tab.
  function pushStatusLine(pushState) {
    const detail = (pushState && pushState.detail) || "";
    switch (pushState && pushState.status) {
      case "subscribed":
        return "This device is registered for background delivery — alerts arrive even when the app and browser are closed.";
      case "working":
        return "Registering this device…";
      case "unavailable":
        if (detail === "no-vapid-key") return "Background delivery isn't set up for this deployment, so alerts only appear while the app is open. (Add a VAPID public key — see the README.)";
        if (detail === "bad-vapid-key") return "The configured VAPID public key isn't valid — it must be the 87-character key printed by scripts/gen-vapid-keys.js. Alerts will only appear while the app is open until it's fixed.";
        if (detail === "unsupported" || detail === "no-service-worker") return "This browser can't do background delivery, so alerts only appear while the app is open.";
        if (detail === "no-supabase") return "Background delivery needs the cloud sync connection, so alerts only appear while the app is open.";
        return "Couldn't register this device for background delivery — alerts will only appear while the app is open.";
      default:
        return "Alerts appear while the app is open.";
    }
  }

  // Settings → Statutory Holidays. Exists so the dates driving the payroll
  // deposit marker are visible and correctable rather than an invisible rule:
  // this is the one place that answers "what does the app think a holiday is?".
  //
  // A year is shown from whatever holidaysForYear resolves — the household's
  // stored list if it has one, the computed rules if not — and the first edit
  // to an unstored year materialises the rules into the store so nothing is
  // lost. Rows say where they came from, because "built-in" and "I typed this"
  // are different kinds of trust.
  function HolidaySettings({ holidays = {}, setHolidays, years = [], activeYear, isOffline = false, holidayRegionCode = DEFAULT_HOLIDAY_REGION, setHolidayRegionCode = () => {
  } }) {
    const [year, setYear] = useState(() => (years.includes(activeYear) ? activeYear : years[0] || (/* @__PURE__ */ new Date()).getFullYear()));
    const [form, setForm] = useState(null);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const [fetchMsg, setFetchMsg] = useState("");
    const [confirmFetch, setConfirmFetch] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    // Read straight from the prop rather than the module registry: the same
    // resolution the budget uses (stored year, else the computed rules), with
    // no render-time write into shared state.
    const rows = holidayRowsForYear(year, holidays);
    const stored = isYearStored(year, holidays);
    const manualCount = rows.filter((r) => r.source === "manual").length;
    const writeYear = (days) => {
      setHolidays((prev) => __spreadProps(__spreadValues({}, prev), { [year]: days }));
    };
    const startAdd = () => {
      setErr("");
      setForm({ mode: "add", date: `${year}-01-01`, name: "", optional: false, original: null });
    };
    const startEdit = (row) => {
      setErr("");
      setForm({ mode: "edit", date: row.date, name: row.name, optional: row.optional, original: row.date });
    };
    const saveForm = () => {
      const name = (form.name || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setErr("Pick a date.");
      if (Number(form.date.slice(0, 4)) !== Number(year)) return setErr(`That date isn't in ${year}. Switch year first, or pick a date in ${year}.`);
      if (!name) return setErr("Give it a name — it's what the deposit marker says.");
      const days = holidayYearForEditing(year, holidays);
      if (form.original && form.original !== form.date) delete days[form.original];
      days[form.date] = { name, optional: !!form.optional, source: "manual" };
      writeYear(days);
      setForm(null);
      setErr("");
      toast(form.mode === "add" ? "Holiday added" : "Holiday updated");
    };
    const removeDate = (date) => {
      const days = holidayYearForEditing(year, holidays);
      delete days[date];
      // Left as an empty object rather than removed: an absent year falls back
      // to the computed rules, which is the opposite of what deleting the last
      // row asks for. (Stored as a holiday_years row with no holidays rows.)
      writeYear(days);
      toast("Holiday removed");
    };
    const runFetch = async () => {
      setConfirmFetch(false);
      setBusy(true);
      setFetchMsg("");
      try {
        const fetched = await fetchHolidayYear(year, holidayRegionCode);
        const res = mergeFetchedHolidays(stored ? holidayYearForEditing(year, holidays) : {}, fetched);
        writeYear(res.days);
        const bits = [`${Object.keys(res.days).length} dates for ${year}`];
        if (res.added) bits.push(`${res.added} new`);
        if (res.updated) bits.push(`${res.updated} changed`);
        if (res.removed) bits.push(`${res.removed} no longer listed`);
        if (res.kept) bits.push(`${res.kept} of your own kept`);
        setFetchMsg("\u2705 " + bits.join(" \u00b7 "));
      } catch (e) {
        setFetchMsg("\u274c " + (e.message || "Couldn't fetch the holiday list."));
      }
      setBusy(false);
    };
    const sourceChip = (source) => {
      const label = source === "manual" ? "Added here" : source === "published" ? "Published" : "Built-in";
      return /* @__PURE__ */ React.createElement("span", { className: "holiday-chip holiday-chip--" + source }, label);
    };
    const weekdayOf = (dateStr) => WEEKDAYS[(parseDate(dateStr) || /* @__PURE__ */ new Date()).getDay()];
    return /* @__PURE__ */ React.createElement(
      Card,
      { id: "sec-holidays", className: "mb-20" },
      /* @__PURE__ */ React.createElement(SectionTitle, { help: "Payroll that falls on one of these is marked in the budget with the day it is actually deposited — the last banking day before. The list starts from British Columbia's rules, including the two the province lists as optional; fetch a year to replace it with the published dates, or add and edit dates yourself." }, "Statutory Holidays"),
      /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 cf-wrap mb-12" }, years.map((y) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: y,
          onClick: () => {
            setYear(y);
            setForm(null);
            setFetchMsg("");
            setErr("");
          },
          className: "holiday-year-pill",
          "aria-pressed": y === year,
          "data-active": y === year
        },
        y
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 cf-wrap mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "txm", htmlFor: "holiday-region" }, "Province or territory"), /* @__PURE__ */ React.createElement("select", {
        id: "holiday-region",
        className: "field-input settings-input",
        style: { flex: "0 1 240px" },
        value: holidayRegionCode,
        onChange: (e) => setHolidayRegionCode(e.target.value)
      }, HOLIDAY_REGIONS.map((r) => /* @__PURE__ */ React.createElement("option", { key: r.code, value: r.code }, r.name)))),
      /* @__PURE__ */ React.createElement("div", { className: "txl mb-12" }, rows.length, " date", rows.length === 1 ? "" : "s", " for ", year, " \u00b7 ", stored ? `saved in your household${manualCount ? `, ${manualCount} added here` : ""}` : `computed from ${holidayRegion(holidayRegionCode).name}'s general rules`),
      !stored && /* @__PURE__ */ React.createElement("div", { className: "italic-hint mb-12" }, "The built-in list is worked out from the province's usual rules, so it can differ from a given year's published one \u2014 rules change and one-off days get proclaimed. Fetch below replaces it with what canada-holidays.ca lists, and every date can be edited or removed by hand."),
      rows.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "italic-hint mb-12" }, "No holidays for ", year, ". Payroll on a weekday will be treated as deposited that day."),
      rows.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "holiday-list mb-12" }, rows.map((row) => /* @__PURE__ */ React.createElement(
        "div",
        { key: row.date, className: "holiday-row" },
        /* @__PURE__ */ React.createElement("div", { className: "holiday-date cf-text-mono-13" }, row.date, /* @__PURE__ */ React.createElement("span", { className: "holiday-weekday" }, weekdayOf(row.date))),
        /* @__PURE__ */ React.createElement("div", { className: "holiday-name" }, row.name, row.optional && /* @__PURE__ */ React.createElement("span", { className: "holiday-chip holiday-chip--optional" }, "Optional")),
        sourceChip(row.source),
        /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-6" }, /* @__PURE__ */ React.createElement(
          "button",
          { onClick: () => startEdit(row), className: "cf-btn cf-btn--secondary cf-btn--tiny", "aria-label": `Edit ${row.name}` },
          "Edit"
        ), /* @__PURE__ */ React.createElement(
          "button",
          { onClick: () => setConfirmDelete(row), className: "holiday-remove-btn", "aria-label": `Remove ${row.name}` },
          "Remove"
        ))
      ))),
      form && /* @__PURE__ */ React.createElement(
        "div",
        { className: "holiday-form mb-12" },
        /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 cf-wrap" },
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(FieldLabel, { htmlFor: "holiday-date" }, "Date"), /* @__PURE__ */ React.createElement("input", {
            id: "holiday-date",
            type: "date",
            className: "field-input",
            value: form.date,
            onChange: (e) => {
              setForm((f) => __spreadProps(__spreadValues({}, f), { date: e.target.value }));
              setErr("");
            }
          })),
          /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement(FieldLabel, { htmlFor: "holiday-name" }, "Name"), /* @__PURE__ */ React.createElement("input", {
            id: "holiday-name",
            className: "field-input",
            placeholder: "e.g. Family Day",
            value: form.name,
            onChange: (e) => {
              setForm((f) => __spreadProps(__spreadValues({}, f), { name: e.target.value }));
              setErr("");
            },
            onKeyDown: (e) => {
              if (e.key === "Enter") saveForm();
            }
          }))
        ),
        /* @__PURE__ */ React.createElement("div", { className: "checkbox-help-row mt-10" }, /* @__PURE__ */ React.createElement("label", { className: "goal-checkbox-label" }, /* @__PURE__ */ React.createElement("input", {
          type: "checkbox",
          className: "checkbox-16",
          checked: !!form.optional,
          onChange: (e) => setForm((f) => __spreadProps(__spreadValues({}, f), { optional: e.target.checked }))
        }), "Optional holiday"), /* @__PURE__ */ React.createElement(HelpTip, { label: "Optional holiday", text: "BC lists Easter Monday and Boxing Day as optional — not every employer or bank observes them. They still count for the deposit date here; the label is so you can tell them apart." })),
        err && /* @__PURE__ */ React.createElement("div", { className: "field-error-text mt-8", role: "alert" }, err),
        /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 mt-12" }, /* @__PURE__ */ React.createElement(
          "button",
          { onClick: saveForm, className: "cf-btn cf-btn--primary cf-btn--md" },
          form.mode === "add" ? "Add holiday" : "Save holiday"
        ), /* @__PURE__ */ React.createElement(
          "button",
          { onClick: () => {
            setForm(null);
            setErr("");
          }, className: "cf-btn cf-btn--secondary cf-btn--md" },
          "Cancel"
        ))
      ),
      /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 cf-wrap" },
        !form && /* @__PURE__ */ React.createElement("button", { onClick: startAdd, className: "cf-btn cf-btn--secondary cf-btn--md" }, "+ Add holiday"),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setConfirmFetch(true),
            disabled: busy || isOffline,
            title: isOffline ? "You're offline — fetching the published list needs a connection." : void 0,
            className: "cf-btn cf-btn--secondary cf-btn--md"
          },
          busy ? "Fetching\u2026" : `Fetch ${year} for ${holidayRegion(holidayRegionCode).code} from canada-holidays.ca`
        ),
        stored && /* @__PURE__ */ React.createElement("button", { onClick: () => setConfirmReset(true), className: "cf-btn cf-btn--secondary cf-btn--md" }, "Reset to built-in")
      ),
      /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite" }, fetchMsg && /* @__PURE__ */ React.createElement("div", { className: "backup-msg", style: { color: fetchMsg.startsWith("\u2705") ? "var(--greenDk)" : "var(--red)" } }, fetchMsg)),
      confirmFetch && /* @__PURE__ */ React.createElement(ConfirmDialog, {
        title: `Fetch ${year} holidays?`,
        message: `Replaces the published dates for ${year} with what canada-holidays.ca lists for ${holidayRegion(holidayRegionCode).name}, including its optional holidays.${manualCount ? ` The ${manualCount} date${manualCount === 1 ? "" : "s"} you added here are kept.` : ""} Published dates you removed earlier will come back.`,
        confirmLabel: "Fetch",
        confirmVariant: "primary",
        onConfirm: runFetch,
        onCancel: () => setConfirmFetch(false)
      }),
      confirmReset && /* @__PURE__ */ React.createElement(ConfirmDialog, {
        title: `Reset ${year} to the built-in rules?`,
        message: `Drops your stored list for ${year}, including anything added or edited by hand, and goes back to the dates the app works out from British Columbia's rules.`,
        confirmLabel: "Reset",
        onConfirm: () => {
          setHolidays((prev) => {
            const next = __spreadValues({}, prev);
            delete next[year];
            delete next[String(year)];
            return next;
          });
          setConfirmReset(false);
          setFetchMsg("");
          toast(`${year} reset to the built-in holidays`);
        },
        onCancel: () => setConfirmReset(false)
      }),
      confirmDelete && /* @__PURE__ */ React.createElement(ConfirmDialog, {
        title: "Remove this holiday?",
        message: `${confirmDelete.name} on ${confirmDelete.date} stops counting as a closed day, so payroll dated then will show as deposited that day.`,
        confirmLabel: "Remove",
        onConfirm: () => {
          removeDate(confirmDelete.date);
          setConfirmDelete(null);
        },
        onCancel: () => setConfirmDelete(null)
      })
    );
  }
  function SettingsView({ categories, setCategories, categoryColors = {}, setCategoryColors = () => {
  }, alertThreshold, setAlertThreshold, darkMode, setDarkMode, notifyEnabled = false, setNotifyEnabled = () => {
  }, enableNotifications = async () => {
  }, disableNotifications = async () => {
  }, notifPerm = "unsupported", notifyHour = 8, setNotifyHour = () => {
  }, pushState = { status: "idle", detail: "" }, yearConfigs, setYearConfigs, activeYear, setActiveYear, overridesByYr, setOverridesByYr, entries, setEntries, completed = {}, setCompleted = () => {
  }, goals = [], setGoals = () => {
  }, debtData = {}, setDebtData = () => {
  }, deletedCopyIds = {}, setDeletedCopyIds = () => {
  }, installPrompt = null, triggerInstall = () => {
  }, lockTimeout = 15, setLockTimeout = () => {
  }, templates = [], setTemplates, activeFlow = [], activity = [], accounts = [], setAccounts = () => {
  }, pushUndo = () => {
  }, budgetTargets = {}, setBudgetTargets = () => {
  }, sessionUser = null, logout = () => {
  }, aiApiKey = "", setAiApiKey, sbConfigured = true, houseStatus = "idle", houseMsg = "", houseUnsaved = false, houseSave = () => {
  }, houseLoad = () => {
  }, household = null, members = [], createInvite = () => {
  }, setMemberDisabled = () => {
  }, updateMemberName = async () => {
  }, holidays = {}, setHolidays = () => {
  }, isOffline = false, houseValues = {}, houseSetters = {}, currency = DEFAULT_CURRENCY, setCurrency = () => {
  }, locale = DEFAULT_LOCALE, setLocale = () => {
  }, holidayRegionCode = DEFAULT_HOLIDAY_REGION, setHolidayRegionCode = () => {
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
    const [yearMsg, setYearMsg] = useState("");
    const [pendingRestore, setPendingRestore] = useState(null);
    const [confirmWipe, setConfirmWipe] = useState(false);
    const [settingsPage, setSettingsPage] = useState("general");
    const [removingAccount, setRemovingAccount] = useState(null);
    // What each account opens the first budget year with. Derived, never
    // stored for the first account: it takes the remainder, so the shares can
    // never drift from the one opening balance the user actually sets.
    const openingShares = useMemo(() => {
      const first = [...yearConfigs].sort((a, b) => a.year - b.year)[0];
      return accountOpenings(accounts, first ? first.openingBalance : 0);
    }, [accounts, yearConfigs]);
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
    const notifSupported = typeof Notification !== "undefined";
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
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
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
      // Same routine the Copy button and the Budget grid's "+ Add" pill run —
      // see src/lib/year-copy.js. deletedCopyIds included: the tombstones are
      // keyed by source entry, not by year, so a copy the user deleted before
      // removing and re-adding this year must not come back with it.
      const plan = planYearRollforward({ entries, overridesByYr, budgetTargets, fromYear: prevYear, toYear: y, deletedCopyIds });
      applyYearRollforward(plan, y, { setEntries, setOverridesByYr, setBudgetTargets });
      setYearConfigs((prev) => [...prev, { year: y, openingBalance: 0 }].sort((a, b) => a.year - b.year));
      setActiveYear(y);
      const parts = yearRollforwardParts(plan.counts, prevYear);
      setYearMsg(`Year ${y} added — ${prevYear} is untouched.${parts.length ? ` ${parts.join(", ")}.` : ""} Recurring entries without an end date carry forward automatically.`);
    };
    const delYear = (yr) => {
      var _a;
      if (yearConfigs.length <= 1) {
        setYearMsg("Cannot delete the only year.");
        return;
      }
      const prevConfigs = yearConfigs, prevOverrides = overridesByYr, prevActive = activeYear;
      setYearConfigs((prev) => prev.filter((yc) => yc.year !== yr));
      setOverridesByYr((prev) => {
        const n = __spreadValues({}, prev);
        delete n[yr];
        return n;
      });
      if (activeYear === yr) setActiveYear(((_a = sortedYears.find((yc) => yc.year !== yr)) == null ? void 0 : _a.year) || sortedYears[0].year);
      setYearMsg(`Year ${yr} removed.`);
      // The year's per-occurrence edits go with it, and they are not
      // recoverable from anywhere else — which is exactly why this one needs
      // an undo more than the entry delete that already had one.
      pushUndo(`Budget year ${yr} removed`, () => {
        setYearConfigs(prevConfigs);
        setOverridesByYr(prevOverrides);
        setActiveYear(prevActive);
        setYearMsg("");
      });
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
      // Snapshot both lists before touching either: a category's colour is
      // stored separately from its name, so restoring only the name brings it
      // back grey.
      const prevCats = categories, prevColors = categoryColors;
      setCategories((p) => p.filter((_, j) => j !== i));
      setCategoryColors((p) => {
        if (!p[name]) return p;
        const n = __spreadValues({}, p);
        delete n[name];
        return n;
      });
      pushUndo(`Category "${name}" removed`, () => {
        setCategories(prevCats);
        setCategoryColors(prevColors);
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
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page settings-page" }, /* @__PURE__ */ React.createElement("div", { className: "settings-toprow" }, /* @__PURE__ */ React.createElement("div", {
      className: "settings-page-pills"
    }, [
      { id: "general", icon: "settings", label: "General" },
      { id: "household", icon: "users", label: "Household" },
      { id: "templates", icon: "clipboard", label: "Templates" },
      { id: "audit", icon: "clock", label: "Activity" }
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
    ))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12" }, /* @__PURE__ */ React.createElement("a", { href: "#/help", className: "settings-help-link" }, /* @__PURE__ */ React.createElement(Icon, { name: "help", size: 14 }), "Help"), /* @__PURE__ */ React.createElement("span", { className: "build-version-tag" }, "Build ", APP_VERSION))), settingsPage === "general" && /* @__PURE__ */ React.createElement("div", { className: "settings-cards" }, /* @__PURE__ */ React.createElement("div", { className: "settings-quicklinks" }, [
      // Order matches the sections as they appear down the page, which is
      // alphabetical by heading — so the strip is also the index you would
      // scan for a setting whose name you know.
      ["sec-accounts", "Accounts"],
      ["sec-ai-key", "AI Key"],
      ["sec-alert", "Alert Threshold"],
      ["sec-appearance", "Appearance"],
      ["sec-years", "Budget Years"],
      ["sec-money", "Currency & Format"],
      ["sec-backup", "Data Backup"],
      ["sec-categories", "Manage Categories"],
      ["sec-notifications", "Notifications"],
      ["sec-security", "Security"],
      ["sec-holidays", "Statutory Holidays"],
      ...sbConfigured && household ? [["sec-sync", "Supabase Sync"]] : [],
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
          if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        },
        className: "quicklink-pill"
      },
      label
    ))), /* @__PURE__ */ React.createElement(Card, { id: "sec-accounts", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, { help: "Where the household\u2019s money lives. A credit card is an ordinary account here \u2014 its balance simply runs below zero. Every view shows all of them added together unless you narrow it with the Account picker above the budget." }, "Accounts"), /* @__PURE__ */ React.createElement("div", { className: "mb-14" }, accounts.map((a, i) => /* @__PURE__ */ React.createElement("div", { key: a.id, className: "account-row" }, /* @__PURE__ */ React.createElement("input", {
      "aria-label": `Name of account ${i + 1}`,
      className: "field-input account-name",
      value: a.name,
      onChange: (e) => setAccounts((prev) => prev.map((x) => x.id === a.id ? __spreadProps(__spreadValues({}, x), { name: e.target.value }) : x))
    }), /* @__PURE__ */ React.createElement("select", {
      "aria-label": `Kind of ${a.name}`,
      className: "field-input account-kind",
      value: a.kind || "chequing",
      onChange: (e) => setAccounts((prev) => prev.map((x) => x.id === a.id ? __spreadProps(__spreadValues({}, x), { kind: e.target.value }) : x))
    }, ACCOUNT_KINDS.map((k) => /* @__PURE__ */ React.createElement("option", { key: k.id, value: k.id }, k.label))), i === 0 ? /* @__PURE__ */ React.createElement("span", { className: "txl account-opening-note" }, "Opens with the rest \u2014 ", /* @__PURE__ */ React.createElement("strong", { className: "cf-text-mono-13" }, fmt(openingShares[a.id] || 0))) : /* @__PURE__ */ React.createElement("span", { className: "cf-row cf-gap-6" }, /* @__PURE__ */ React.createElement("span", { className: "dollar-sm" }, moneySymbol()), /* @__PURE__ */ React.createElement("input", {
      type: "number",
      inputMode: "decimal",
      step: "0.01",
      "aria-label": `Opening balance of ${a.name}`,
      className: "field-input field-input--mono account-opening",
      value: centsToDollars(Number.isFinite(a.opening) ? a.opening : 0),
      onChange: (e) => setAccounts((prev) => prev.map((x) => x.id === a.id ? __spreadProps(__spreadValues({}, x), { opening: dollarsToCents(e.target.value) }) : x))
    })), accounts.length > 1 && i > 0 && /* @__PURE__ */ React.createElement("button", {
      className: "cf-btn cf-btn--secondary cf-btn--micro",
      onClick: () => setRemovingAccount(a),
      "aria-label": `Remove ${a.name}`
    }, "Remove")))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 cf-wrap" }, /* @__PURE__ */ React.createElement("button", {
      className: "cf-btn cf-btn--secondary",
      onClick: () => setAccounts((prev) => [...prev, { id: genId(), name: "New account", kind: "savings", opening: 0 }])
    }, "+ Add account")), /* @__PURE__ */ React.createElement("div", { className: "hint mt-10" }, "The first account holds whatever is left of the budget year\u2019s opening balance once the others are accounted for, so the shares always add up to the one figure you set under Budget Years."), removingAccount && /* @__PURE__ */ React.createElement(ConfirmDialog, {
      title: `Remove ${removingAccount.name}?`,
      message: (() => {
        const n = entries.filter((e) => accountIdOf(e) === removingAccount.id).length;
        const t = entries.filter((e) => e.toAccountId === removingAccount.id).length;
        return n + t === 0 ? "Nothing is filed under this account, so removing it changes no figures." : `${n + t} ${n + t === 1 ? "entry moves" : "entries move"} back to ${accountName(accounts, (accounts[0] || {}).id)}. No entry is deleted and no amount changes \u2014 they simply stop being separated out.`;
      })(),
      confirmLabel: "Remove",
      onCancel: () => setRemovingAccount(null),
      onConfirm: () => {
        // Entries are re-homed rather than deleted: an account is a label on
        // money, and removing the label must not remove the money.
        setEntries((prev) => prev.map((e) => {
          if (accountIdOf(e) !== removingAccount.id && e.toAccountId !== removingAccount.id) return e;
          const next = __spreadValues({}, e);
          if (accountIdOf(e) === removingAccount.id) delete next.accountId;
          if (e.toAccountId === removingAccount.id) delete next.toAccountId;
          return next;
        }));
        setAccounts((prev) => prev.filter((x) => x.id !== removingAccount.id));
        setRemovingAccount(null);
      }
    })), /* @__PURE__ */ React.createElement(Card, { id: "sec-ai-key", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "AI Insights \u2014 Anthropic API Key"), /* @__PURE__ */ React.createElement("div", { className: "txl lh-15 mb-12" }, "Get a key at", " ", /* @__PURE__ */ React.createElement(
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
    )), /* @__PURE__ */ React.createElement("div", { className: "key-disclaimer-row" }, /* @__PURE__ */ React.createElement("span", { className: "ai-disclaimer-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "key", size: 12 })), /* @__PURE__ */ React.createElement("span", null, "Stored on this device only and sent straight from your browser to Anthropic — anyone who can run script on this page can read it."))), /* @__PURE__ */ React.createElement(Card, { id: "sec-alert", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Alert Threshold"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12" }, /* @__PURE__ */ React.createElement("label", { className: "settings-label", htmlFor: "alert-threshold" }, "Warn when balance drops below"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "dollar-md" }, moneySymbol()), /* @__PURE__ */ React.createElement(
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
    )))), /* @__PURE__ */ React.createElement(Card, { id: "sec-appearance", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Appearance"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-16" }, /* @__PURE__ */ React.createElement(Toggle, { value: darkMode, onChange: setDarkMode, label: "Dark Mode" }), /* @__PURE__ */ React.createElement("span", { className: "txl" }, darkMode ? "Dark theme active" : "Light theme active"))), /* @__PURE__ */ React.createElement(Card, { id: "sec-years", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Budget Years"), sortedYears.map((yc) => {
      var _a;
      return /* @__PURE__ */ React.createElement("div", { key: yc.year, className: "year-row", style: {
        background: activeYear === yc.year ? "var(--stripe)" : "var(--bg)",
        border: `1px solid ${activeYear === yc.year ? "var(--primary)" : "var(--border)"}`
      } }, /* @__PURE__ */ React.createElement("span", { className: "year-number" }, yc.year), sortedYears[0].year === yc.year && /* @__PURE__ */ React.createElement("div", { className: "year-openbal" }, /* @__PURE__ */ React.createElement("span", { className: "openbal-label" }, "Opening balance"), /* @__PURE__ */ React.createElement("span", { className: "txm" }, moneySymbol()), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          step: "0.01",
          className: "cf-text-mono-13 openbal-input",
          // "Opening balance" next to it is a span, not a label — name the
          // field per-year so it's unambiguous when several years are listed.
          "aria-label": `Opening balance for ${yc.year}`,
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
          const plan = planYearRollforward({ entries, overridesByYr, budgetTargets, fromYear: yc.year, toYear: nextY, deletedCopyIds });
          applyYearRollforward(plan, nextY, { setEntries, setOverridesByYr, setBudgetTargets });
          const parts = yearRollforwardParts(plan.counts, yc.year);
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
    }), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 mt-12" }, /* @__PURE__ */ React.createElement("button", { onClick: addYear, className: "cf-btn cf-btn--primary cf-btn--md" }, `+ Add ${nextYear}`)), /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite" }, yearMsg && /* @__PURE__ */ React.createElement("div", { className: "txm mt-8" }, yearMsg)), confirmDelYear !== null && /* @__PURE__ */ React.createElement(
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
    )), /* @__PURE__ */ React.createElement(Card, { id: "sec-money", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, { help: "Changes how every amount in the app is written \u2014 the symbol, and where the thousands and decimal separators go. It does not convert anything: the numbers you have entered stay the numbers they are." }, "Currency & Format"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-16 cf-wrap" },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "set-currency" }, "Currency"), /* @__PURE__ */ React.createElement("select", {
        id: "set-currency",
        className: "field-input settings-input",
        style: { minWidth: 220 },
        value: currency,
        onChange: (e) => setCurrency(e.target.value)
      }, CURRENCIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.code, value: c.code }, `${c.code} \u2014 ${c.name}`)))),
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "set-locale" }, "Number format"), /* @__PURE__ */ React.createElement("select", {
        id: "set-locale",
        className: "field-input settings-input",
        style: { minWidth: 220 },
        value: locale,
        onChange: (e) => setLocale(e.target.value)
      }, NUMBER_LOCALES.map((l) => /* @__PURE__ */ React.createElement("option", { key: l.code, value: l.code }, l.name))))
    ), /* @__PURE__ */ React.createElement("div", { className: "hint mt-10" }, "One thousand two hundred and change looks like ", /* @__PURE__ */ React.createElement("strong", { className: "cf-text-mono-13" }, fmt(123456)), " \u00b7 a negative is ", /* @__PURE__ */ React.createElement("strong", { className: "cf-text-mono-13" }, fmt(-123456))), /* @__PURE__ */ React.createElement("div", { className: "hint mt-6" }, "Only currencies with two decimal places are listed. Amounts are stored as whole cents throughout the app, so a currency with none (yen) or three (dinar) would need more than a formatting change.")), /* @__PURE__ */ React.createElement(Card, { id: "sec-backup", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Data Backup & Restore"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 cf-wrap" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      // Built from the household-field table, so a new field is in the backup
      // the moment it is marked `backup: true` — this list used to be written
      // out by hand and drifted from what the app actually stores.
      const data = HOUSEHOLD_BACKUP_FIELDS.reduce((acc, f) => {
        acc[f.key] = houseValues[f.key];
        return acc;
      }, { schemaVersion: SCHEMA_VERSION, exportedAt: (/* @__PURE__ */ new Date()).toISOString() });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      if (downloadBlob(`CashFlow_Backup_${localDateStr(/* @__PURE__ */ new Date())}.json`, blob)) {
        try {
          localStorage.setItem("cf_last_backup", String(Date.now()));
        } catch (e) {
          // The nudge re-appearing is a far smaller problem than a failed
          // export, and the export itself already succeeded.
        }
      }
    }, className: "cf-btn cf-btn--primary cf-btn--iconrow" }, /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 14 }), "Export Backup"), /* @__PURE__ */ React.createElement("label", { className: "cf-btn cf-btn--secondary cf-btn--iconrow" }, /* @__PURE__ */ React.createElement(Icon, { name: "upload", size: 14 }), "Import Backup", /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".json", className: "hidden", onChange: (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          // Parsing is not recognition. Any .json at all used to reach the
          // confirm dialog, and confirming one from some other app restored
          // nothing while reporting "Backup restored successfully!" — the user
          // is then told their data is back when it never moved. A real backup
          // carries the export stamp, or (before that stamp existed) at least
          // one of the fields we know how to restore.
          const looksLikeBackup = parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed.exportedAt !== void 0 || parsed.schemaVersion !== void 0 || HOUSEHOLD_BACKUP_FIELDS.some((f) => f.key in parsed));
          if (!looksLikeBackup) {
            setYearMsg("\u274C That file isn't a CashFlow backup. Choose a CashFlow_Backup_*.json file exported from Settings.");
            return;
          }
          setYearMsg("");
          setPendingRestore({ parsed, fileName: file.name });
        } catch (err) {
          setYearMsg("\u274C Could not read backup file. Make sure it's a valid CashFlow backup.");
        }
      };
      reader.onerror = () => setYearMsg("\u274C Couldn't read that file off this device. Try again.");
      reader.readAsText(file);
      e.target.value = "";
    } }))), /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite" }, yearMsg && /* @__PURE__ */ React.createElement("div", { className: "backup-msg", style: {
      color: yearMsg.startsWith("\u2705") ? "var(--greenDk)" : yearMsg.startsWith("\u274C") ? "var(--red)" : "var(--textMid)"
    } }, yearMsg))), pendingRestore && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: "Restore backup?",
        message: `Restoring "${pendingRestore.fileName}" replaces everything this app stores for your household \u2014 entries, overrides, budget targets, goals, categories, debts and the rest \u2014 with what's in this file. Anything the file doesn't carry goes back to its default. This cannot be undone.`,
        confirmLabel: "Restore",
        confirmVariant: "danger",
        onCancel: () => setPendingRestore(null),
        onConfirm: () => {
          // Everything the restore is about to replace, captured before it
          // does. This is the most destructive action in the app — the dialog
          // says so — and until now it was also the only one with no way back
          // short of having exported a backup first, which is precisely the
          // habit someone restoring a backup has just discovered they lack.
          const beforeRestore = HOUSEHOLD_BACKUP_FIELDS.reduce((acc, f) => {
            acc[f.key] = houseValues[f.key];
            return acc;
          }, {});
          try {
            const parsed = pendingRestore.parsed;
            // An old backup can predate any of the storage migrations — before
            // schema v8 its amounts are dollars, before v9 its debt figures
            // are — so it goes through the same upgrade a stale cloud payload
            // gets on load, keyed on the version stamped in the file itself.
            const d = migrateHouseholdPayload(parsed, parsed.schemaVersion || 0);
            const fixed = moveEntryAttachmentsToOverrides(
              Array.isArray(d.entries) ? d.entries : [],
              d.overridesByYr && typeof d.overridesByYr === "object" ? d.overridesByYr : {}
            );
            // Restore *replaces*, which is what the confirm dialog promises and
            // what "this cannot be undone" implies. So a field the file doesn't
            // carry is reset to its default rather than left alone: restoring a
            // backup taken before a goal existed used to leave that goal in
            // place, silently blending two points in time and handing the user
            // a state that was never backed up. A backup from an older build
            // legitimately lacks fields added since — resetting those is the
            // correct reading of "restore to this file".
            //
            // Entries and overrides go in first and by hand: legacy backups
            // carry receipt images on the entry, which moveEntryAttachmentsToOverrides
            // above has just re-keyed onto the occurrences they belong to.
            setEntries(fixed.entries);
            setOverridesByYr(fixed.overridesByYr);
            // The rest is the table again, vetted by the same guards a payload
            // from the cloud goes through — a guard that rejects the file's
            // value (missing, or the wrong type) falls through to the default.
            HOUSEHOLD_BACKUP_FIELDS.forEach((f) => {
              if (f.key === "entries" || f.key === "overridesByYr") return;
              const set = houseSetters[f.key];
              if (!set) return;
              let applied = false;
              houseApply(f)(d[f.key], (v) => {
                applied = true;
                set(v);
              });
              if (!applied) set(f.initial());
            });
            setYearMsg("\u2705 Backup restored successfully!");
            pushUndo(`Restored "${pendingRestore.fileName}"`, () => {
              HOUSEHOLD_BACKUP_FIELDS.forEach((f) => {
                const set = houseSetters[f.key];
                if (set) set(beforeRestore[f.key]);
              });
              setYearMsg("");
            });
          } catch (err) {
            setYearMsg("\u274C Could not read backup file. Make sure it's a valid CashFlow backup.");
          }
          setPendingRestore(null);
        }
      }
    ), /* @__PURE__ */ React.createElement(Card, { id: "sec-categories", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, { help: (isCoarse ? "Use the arrows to reorder." : "Drag to reorder.") + " Renaming applies to new entries; entries you already have keep the category name they were saved with." }, "Manage Categories"), /* @__PURE__ */ React.createElement("div", { className: "mb-16" }, categories.map((cat, i) => /* @__PURE__ */ React.createElement(
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
          // Eleven of these on the General page, all announced as an unnamed
          // "color picker" — the visible label is the swatch itself.
          "aria-label": `Colour for ${cat}`,
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
          "aria-label": `Colour for ${cat}`,
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
        "aria-label": "Colour for the new category",
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
    ), /* @__PURE__ */ React.createElement("button", { onClick: addCat, className: "cf-btn cf-btn--primary cf-btn--md" }, "+ Add")), catMsg && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "error-text-mt8" }, catMsg)), /* @__PURE__ */ React.createElement(Card, { id: "sec-notifications", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Notifications"), !notifSupported ? /* @__PURE__ */ React.createElement("div", { className: "txl" }, "Your browser doesn't support notifications.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-16" }, /* @__PURE__ */ React.createElement(Toggle, { value: notifyEnabled, onChange: (v) => {
      if (v) enableNotifications();
      else disableNotifications();
    }, label: "Enable notifications" }), /* @__PURE__ */ React.createElement("span", { className: "txl" }, notifPerm === "denied" ? "Blocked by your browser" : notifyEnabled ? "On" : "Off")), notifPerm === "denied" && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "error-text-mt6" }, "Notifications are blocked for this site. Enable them in your browser's site settings, then toggle this back on."), notifyEnabled && notifPerm === "granted" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap mt-14" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "notify-hour-select", className: "tx" }, "Daily alert time"), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: "notify-hour-select",
        value: notifyHour,
        onChange: (e) => setNotifyHour(parseInt(e.target.value, 10)),
        className: "autolock-select"
      },
      HOUR_OPTIONS.map((h) => /* @__PURE__ */ React.createElement("option", { key: h.value, value: h.value }, h.label))
    )), /* @__PURE__ */ React.createElement("div", { className: "txl mt-8" }, pushStatusLine(pushState)), pushState.status === "unavailable" && pushState.detail && /* @__PURE__ */ React.createElement("div", { className: "txl mt-4" }, pushState.detail)))), /* @__PURE__ */ React.createElement(Card, { id: "sec-security", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Security"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "auto-lock-select", className: "tx" }, "Auto-lock when in background"), /* @__PURE__ */ React.createElement(
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
    )), sessionUser && (bioEnabled || bioSupported && isCoarse) && /* @__PURE__ */ React.createElement("div", { className: "bio-section" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-16" }, /* @__PURE__ */ React.createElement(Toggle, { value: bioEnabled, onChange: toggleBiometric, label: "Unlock with fingerprint / face" }), bioBusy && /* @__PURE__ */ React.createElement("span", { className: "bio-busy-text" }, "Follow your device's prompt…")), bioEnabled && /* @__PURE__ */ React.createElement("div", { className: "mt-14" }, /* @__PURE__ */ React.createElement(Toggle, { value: lockOnLaunch, onChange: toggleLockOnLaunch, label: "Require fingerprint sign-on when the app opens" })), bioMsg && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "error-text-mt6" }, bioMsg))), /* @__PURE__ */ React.createElement(HolidaySettings, {
          holidayRegionCode,
          setHolidayRegionCode,
      holidays,
      setHolidays,
      isOffline,
      activeYear,
      years: [...new Set([...(yearConfigs || []).map((yc) => Number(yc.year)), (/* @__PURE__ */ new Date()).getFullYear()])].sort()
    }), sbConfigured && household && /* @__PURE__ */ React.createElement(Card, { id: "sec-sync", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "\u2601 Supabase \u2014 Auto Sync"), houseUnsaved && /* @__PURE__ */ React.createElement("div", { role: "status", className: "error-text-mt6 mb-8" }, "This device has changes that haven't reached the cloud yet. They're kept safely on this device and will sync automatically when the connection is back \u2014 they won't be overwritten in the meantime."), /* @__PURE__ */ React.createElement("div", { role: "status", className: "sync-status-row", style: {
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
    ))), /* @__PURE__ */ React.createElement(Card, { id: "sec-reset", className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Target Budget Reset \u2014 ", activeYear), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmTgtReset(true),
        className: "reset-targets-btn"
      },
      "\u21BA Reset Targets to Actuals"
    ), /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite" }, tgtResetMsg && /* @__PURE__ */ React.createElement("div", { className: "success-text-mt10" }, tgtResetMsg)), confirmTgtReset && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: `Reset all ${activeYear} targets?`,
        message: `This replaces every monthly budget target for ${activeYear} with the actual expense totals per category for each month. Existing targets for ${activeYear} will be overwritten. Other years are unaffected.`,
        confirmLabel: "Reset Targets",
        onConfirm: () => {
          const prevTargets = budgetTargets;
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
          // A year of hand-set targets is overwritten in one press, and the
          // confirm dialog is the only thing between the button and the loss.
          pushUndo(`${activeYear} targets reset from actuals`, () => {
            setBudgetTargets(prevTargets);
            setTgtResetMsg("");
          });
        },
        onCancel: () => setConfirmTgtReset(false)
      }
    )), /* @__PURE__ */ React.createElement(Card, { id: "sec-danger", className: "danger-card" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Danger Zone"), /* @__PURE__ */ React.createElement(
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
            // Storage can throw outright in private/partitioned modes.
            // Nothing here is essential to the current interaction, so a
            // failure is genuinely ignorable — real save failures surface
            // via notifyStorageWriteFailure.
          }
          window.location.reload();
        },
        onCancel: () => setConfirmWipe(false)
      }
    ))), settingsPage === "household" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, { help: "Everyone listed here signs in with their own email and password and shares this budget." }, "Household Members"), members.map((m) => {
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
    }), memberMsg && /* @__PURE__ */ React.createElement("div", { role: "alert", className: "error-text-mt10" }, memberMsg)), /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, { help: "Generate a one-time code. Share it with them, then have them sign up and enter it on the “Join with invite code” screen." }, "Invite a family member"), /* @__PURE__ */ React.createElement(
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
    ), inviteCode && /* @__PURE__ */ React.createElement("div", { className: "invite-code-display" }, inviteCode))), settingsPage === "templates" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Entry Templates"), (templates || []).length === 0 && /* @__PURE__ */ React.createElement("div", { className: "italic-hint" }, "No templates saved yet. Use the entry form to create one."), (templates || []).map((t, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "template-row" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, t.desc), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, isInflowEvent(t) ? "+" : "-", fmt(t.amount), " \u00b7 ", t.category, t.repeats && /* @__PURE__ */ React.createElement("span", null, " \u00b7 Recurring"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTemplates((prev) => prev.filter((_, j) => j !== i)),
        className: "cf-btn cf-btn--danger cf-btn--yearremove"
      },
      "Remove"
    ))))), settingsPage === "audit" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, { help: "Everything anyone in the household has changed, newest first \u2014 entries, single dates, budget targets, goals and debts. Kept for the last 200 changes." }, "Activity"), (activity || []).length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "italic-hint" }, "Nothing yet. Every change anyone makes to the budget shows up here, with who made it.") : (activity || []).map((a) => {
      const who = memberName(a.by, members, { selfId: sessionUser && sessionUser.id });
      return /* @__PURE__ */ React.createElement("div", { key: a.id, className: "activity-row" }, /* @__PURE__ */ React.createElement("span", { className: "activity-kind activity-kind--" + a.kind }, ACTIVITY_LABELS[a.kind] || a.kind), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "tx" }, a.what), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, new Date(a.at).toLocaleString(), who ? ` \u00b7 ${who}` : "")));
    })), /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, { help: "Single dates you have edited in the Budget grid, with the value each one had before. Revert puts an occurrence back to what its entry says." }, "Edited dates \u2014 ", activeYear), (() => {
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
        return /* @__PURE__ */ React.createElement("div", { key: eventId, className: "audit-entry" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between cf-gap-10 cf-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1-minw160" }, /* @__PURE__ */ React.createElement("div", { className: "tx-sb" }, entry ? entry.desc : "Unknown entry", " \xB7 ", dateLabel), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, ov.amount !== void 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, "Amount \u2192 ", fmt(ov.amount), " "), ov.notes && /* @__PURE__ */ React.createElement(React.Fragment, null, '\xB7 Note: "', ov.notes, '" '), "\xB7 Saved ", new Date(ov._savedAt).toLocaleString(), (() => {
          const who = memberName(ov._by, members, { selfId: sessionUser && sessionUser.id });
          return who ? ` \xB7 by ${who}` : "";
        })())), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-6" }, hist.length > 0 && /* @__PURE__ */ React.createElement(
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
        ))), isOpen && /* @__PURE__ */ React.createElement("div", { className: "history-list" }, [...hist].reverse().map((h, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "history-item-text" }, new Date(h.ts).toLocaleString(), (() => {
          const who = memberName(h.by, members, { selfId: sessionUser && sessionUser.id });
          return who ? ` (${who})` : "";
        })(), " \u2014 previous value:", " ", h.prev && h.prev.amount !== void 0 ? fmt(h.prev.amount) : "(scheduled default)", h.prev && h.prev.notes ? ` \xB7 "${h.prev.notes}"` : ""))));
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
