  // Hoisted out of PlanView's render body — an inline component
  // definition creates a new type each render and forces React to remount.
  // The screen exists to compare two strategies, and it used to stack them as
  // two cards — so on a phone you could never see both at once, which is the
  // one thing it is for. One table instead: the rows are the questions, the
  // columns are the answers, and the better answer in each row is marked.
  //
  // The payoff order was a 10px sentence of arrows wrapping to four lines. It
  // is a numbered list now, for the chosen strategy only, because that is the
  // form an ordered list of nine things has always wanted.
  const StratCompare = ({ av, sn, base, pick, onPick }) => {
    const better = (a, b, lowerWins = true) => a === b ? null : (lowerWins ? a < b : a > b);
    const rows = [
      { label: "Debt-free", a: av.debtFreeDate, b: sn.debtFreeDate, win: better(av.months, sn.months) },
      { label: "Total interest", a: fmt(av.totalInterest), b: fmt(sn.totalInterest),
        win: better(av.totalInterest, sn.totalInterest) },
      { label: "Months to clear", a: av.months, b: sn.months, win: better(av.months, sn.months) }
    ];
    // What each strategy is worth against paying the minimums. A strategy can
    // be *worse* than the baseline — snowball often is — so these read as a
    // signed comparison rather than as "saved": "-1 months" saved is not a
    // sentence, and a negative saving is a cost the reader should see said
    // plainly.
    const lessMore = (d, unit) => {
      if (d === 0) return "same";
      const n = Math.abs(d);
      const word = unit === "months" ? (n === 1 ? "month" : "months") : "";
      return n + (word ? " " + word : "") + (d > 0 ? " less" : " more");
    };
    if (base && base.totalInterest !== av.totalInterest) {
      rows.push({ label: "Interest vs minimums",
        a: fmt(Math.abs(base.totalInterest - av.totalInterest)) + (base.totalInterest > av.totalInterest ? " less" : " more"),
        b: fmt(Math.abs(base.totalInterest - sn.totalInterest)) + (base.totalInterest > sn.totalInterest ? " less" : " more"),
        win: better(av.totalInterest, sn.totalInterest) });
    }
    if (base && (base.months !== av.months || base.months !== sn.months)) {
      rows.push({ label: "Time vs minimums", a: lessMore(base.months - av.months, "months"),
        b: lessMore(base.months - sn.months, "months"), win: better(av.months, sn.months) });
    }
    const chosen = pick === "snowball" ? sn : av;
    return /* @__PURE__ */ React.createElement(React.Fragment, null,
      /* @__PURE__ */ React.createElement("table", { className: "strat-table" },
        /* @__PURE__ */ React.createElement("caption", { className: "cf-visually-hidden" },
          "Avalanche compared with Snowball"),
        /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null,
          /* @__PURE__ */ React.createElement("td", null),
          /* @__PURE__ */ React.createElement("th", { scope: "col" },
            /* @__PURE__ */ React.createElement(Icon, { name: "mountain", size: 13 }), " Avalanche"),
          /* @__PURE__ */ React.createElement("th", { scope: "col" },
            /* @__PURE__ */ React.createElement(Icon, { name: "snowflake", size: 13 }), " Snowball"))),
        /* @__PURE__ */ React.createElement("tbody", null, rows.map((r) =>
          /* @__PURE__ */ React.createElement("tr", { key: r.label },
            /* @__PURE__ */ React.createElement("th", { scope: "row" }, r.label),
            /* @__PURE__ */ React.createElement("td", { "data-win": r.win === true ? "true" : void 0 }, r.a),
            /* @__PURE__ */ React.createElement("td", { "data-win": r.win === false ? "true" : void 0 }, r.b))))),
      /* @__PURE__ */ React.createElement("div", { className: "strat-order-head" },
        /* @__PURE__ */ React.createElement("span", { className: "lbl" }, "Payoff order"),
        /* @__PURE__ */ React.createElement(PillToggle, {
          size: "sm", value: pick, onChange: onPick,
          options: [{ id: "avalanche", label: "Avalanche" }, { id: "snowball", label: "Snowball" }]
        })),
      /* @__PURE__ */ React.createElement("ol", { className: "strat-order-list" },
        chosen.payoffOrder.map((n, k) => /* @__PURE__ */ React.createElement("li", { key: n + k },
          /* @__PURE__ */ React.createElement("span", { className: "strat-order-n" }, k + 1),
          /* @__PURE__ */ React.createElement("span", { className: "strat-order-name" }, n)))));
  };

  function PlanView({ flow, openBal, entries = [], setEntries = () => {
  }, goals = [], setGoals = () => {
  }, categories = [], alertThreshold = DEFAULT_ALERT_THRESHOLD, activeYear = (/* @__PURE__ */ new Date()).getFullYear(), debtData = {}, setDebtData = () => {
  }, globalSearch = "", yearConfigs = [], setActiveYear = () => {
  }, setDeletedCopyIds = () => {
  }, planSub = "debt", setPlanSub = () => {
  } }) {
    const gq = (globalSearch || "").trim().toLowerCase();
    const activeGoals = goals.filter((g) => !g.archived);
    const archivedGoalsCount = goals.length - activeGoals.length;
    const goalsFiltered = gq ? activeGoals.filter((g) => (g.name || "").toLowerCase().includes(gq)) : activeGoals;
    const { logActivity } = useContext(HouseholdContext);
    const [debtExtra, setDebtExtra] = useLS("cf_debt_extra", "100");
    // Which payoff order is on screen. Device-local: it is a reading
    // preference, not a decision the household has made.
    const [stratPick, setStratPick] = useLS("cf_debt_strategy", "avalanche");
    const [showDebtPicker, setShowDebtPicker] = useState(false);
    const [debtSimExcluded, setDebtSimExcluded] = useLS("cf_debt_sim_excluded", []);
    const [debtCtx, setDebtCtx] = useState(null);
    const [showDebtForm, setShowDebtForm] = useState(false);
    const [debtFormData, setDebtFormData] = useState({ label: "", balance: "", rate: "", payment: "", editKey: null });
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [goalForm, setGoalForm] = useState(null);
    const [goalErrors, setGoalErrors] = useState({});
    const [goalCtx, setGoalCtx] = useState(null);
    const [showFundForm, setShowFundForm] = useState(false);
    const [fundForm, setFundForm] = useState(null);
    const [confirmGoalDelete, setConfirmGoalDelete] = useState(null);
    // Escape closes, the backdrop doesn't — the bargain every other overlay in
    // the app strikes, and the four dialogs on this screen were the ones that
    // never struck it. The goal form, the funding form, the debt form and the
    // debt picker all opened over what you were reading with no keyboard way
    // out: a person who reaches for Escape (or an external keyboard on a
    // tablet) had to find Cancel with the pointer.
    //
    // One handler rather than four, because the state is all here and only one
    // of them is ever on screen. The delete confirmation is the exception: it
    // carries its own handler (ConfirmDialog), and it opens over the goal form
    // — so bail out while it is up rather than dismissing both with one press.
    useEffect(() => {
      if (confirmGoalDelete) return void 0;
      if (!showDebtPicker && !showFundForm && !showGoalForm && !showDebtForm) return void 0;
      const h = (e) => {
        if (e.key !== "Escape") return;
        if (showDebtPicker) setShowDebtPicker(false);
        else if (showFundForm) setShowFundForm(false);
        else if (showGoalForm) setShowGoalForm(false);
        else if (showDebtForm) setShowDebtForm(false);
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [confirmGoalDelete, showDebtPicker, showFundForm, showGoalForm, showDebtForm]);
    const saveGoal = () => {
      const errs = {};
      const name = (goalForm.name || "").trim();
      const target = dollarsToCents(goalForm.target);
      const saved = dollarsToCents(goalForm.saved);
      const monthly = dollarsToCents(goalForm.monthly);
      if (!name) errs.name = "Name is required.";
      if (isNaN(target) || target <= 0) errs.target = "Enter a target above $0.";
      if (saved < 0) errs.saved = "Cannot be negative.";
      if (monthly < 0) errs.monthly = "Cannot be negative.";
      if (goalForm.targetDate && isNaN((/* @__PURE__ */ new Date(goalForm.targetDate + "T00:00:00")).getTime())) errs.targetDate = "Invalid date.";
      if (goalForm.payoutEntry && !goalForm.targetDate) errs.targetDate = "Target date is required for a payout expense.";
      setGoalErrors(errs);
      if (Object.keys(errs).length) return;
      haptic();
      if (goalForm.id) {
        const g0 = goals.find((g) => g.id === goalForm.id);
        if (g0 == null ? void 0 : g0.payoutEntryId) {
          setEntries((prev) => prev.map((e) => e.id === g0.payoutEntryId ? __spreadProps(__spreadValues({}, e), { desc: `Goal payout: ${name}`, amount: target, startDate: goalForm.targetDate || e.startDate }) : e));
        }
        setGoals((prev) => prev.map((g) => g.id === goalForm.id ? __spreadProps(__spreadValues({}, g), { name, target, saved, monthly, targetDate: goalForm.targetDate || "" }) : g));
        logActivity("goal", `Edited the goal ${name} \u2014 ${fmt(saved)} of ${fmt(target)}`);
      } else {
        const id = genId();
        let entryId = null;
        if (goalForm.linkEntry && monthly > 0) {
          entryId = genId();
          const today = /* @__PURE__ */ new Date();
          const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
          setEntries((prev) => [...prev, {
            id: entryId,
            desc: `Goal: ${name}`,
            type: "expense",
            amount: monthly,
            startDate,
            repeats: true,
            recurEvery: 1,
            recurUnit: "month",
            recurDays: [],
            recurEnd: goalForm.targetDate || "",
            category: "Savings / RRSP",
            notes: "Savings goal contribution"
          }]);
        }
        let payoutEntryId = null;
        if (goalForm.payoutEntry && goalForm.targetDate) {
          payoutEntryId = genId();
          setEntries((prev) => [...prev, {
            id: payoutEntryId,
            desc: `Goal payout: ${name}`,
            type: "expense",
            amount: target,
            startDate: goalForm.targetDate,
            repeats: false,
            recurEvery: 1,
            recurUnit: "month",
            recurDays: [],
            recurEnd: "",
            category: "Savings / RRSP",
            notes: "Planned goal spending"
          }]);
        }
        setGoals((prev) => [...prev, { id, name, target, saved, monthly, targetDate: goalForm.targetDate || "", entryId, payoutEntryId, createdAt: (/* @__PURE__ */ new Date()).toISOString() }]);
        logActivity("goal", `Added the goal ${name} \u2014 ${fmt(target)}`);
      }
      toast(goalForm.id ? "Goal updated" : "Goal added");
      setShowGoalForm(false);
      setGoalForm(null);
    };
    const applyFunds = () => {
      const amt = dollarsToCents(fundForm.amount);
      if (amt <= 0) return;
      haptic();
      setGoals((prev) => prev.map((g) => g.id === fundForm.goal.id ? __spreadProps(__spreadValues({}, g), { saved: roundMoney(g.saved + amt) }) : g));
      toast(`Added ${fmt(amt)} to ${fundForm.goal.name}`);
      setShowFundForm(false);
      setFundForm(null);
    };
    const archiveGoal = (goal) => {
      logActivity("goal", `Archived the goal ${goal.name}`);
      setGoals((prev) => prev.map((g) => g.id === goal.id ? __spreadProps(__spreadValues({}, g), { archived: true }) : g));
      toast(`"${goal.name}" archived`);
    };
    const restoreArchivedGoals = () => {
      setGoals((prev) => prev.map((g) => g.archived ? __spreadProps(__spreadValues({}, g), { archived: false }) : g));
    };
    // The year badge is rendered by App.js *above* the sub-tabs, matching
    // Budget — it used to live here, which put the same two elements in the
    // opposite order one tap apart.
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, (() => {
      const openGoalForm = (g) => {
        setGoalForm(g ? __spreadProps(__spreadValues({}, g), { target: String(centsToDollars(g.target)), saved: String(centsToDollars(g.saved)), monthly: String(centsToDollars(g.monthly)) }) : { id: null, name: "", target: "", saved: "0", monthly: "", targetDate: "", linkEntry: true, payoutEntry: true });
        setGoalErrors({});
        setShowGoalForm(true);
      };
      return /* @__PURE__ */ React.createElement(Card, { className: "mb-20" + (planSub === "goals" ? "" : " cf-hidden") }, /* @__PURE__ */ React.createElement("div", { className: "goal-header-row", style: { marginBottom: goals.length ? 14 : 0 } }, /* @__PURE__ */ React.createElement(SectionTitle, { className: "mb-0" }, "Savings Goals"), goals.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, archivedGoalsCount > 0 && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: restoreArchivedGoals,
          className: "debt-restore-btn"
        },
        "Restore ",
        archivedGoalsCount,
        " archived"
      ), /* @__PURE__ */ React.createElement(
        ExportBar,
        {
          onCSV: () => downloadCSV(
            "CashFlow_Goals.csv",
            activeGoals.map((g) => [g.name, centsToDollars(g.target), centsToDollars(g.saved), centsToDollars(g.monthly), g.targetDate || "", g.target > 0 ? Math.round(g.saved / g.target * 100) : 0]),
            ["Goal", "Target", "Saved", "Monthly", "Target Date", "% Funded"]
          ),
          onPrint: () => printView("CashFlow Savings Goals")
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => openGoalForm(null),
          className: "cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap"
        },
        "+ Add"
      ))), goals.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, /* @__PURE__ */ React.createElement(EmptyState, {
        icon: /* @__PURE__ */ React.createElement(Icon, { name: "target", size: 26, className: "c-textLt" }),
        message: "Save toward big expenses \u2014 property taxes, vacations, emergency fund.",
        actionLabel: "+ Add Goal",
        onAction: () => openGoalForm(null)
      })) : /* @__PURE__ */ React.createElement(React.Fragment, null, gq && /* @__PURE__ */ React.createElement("div", { className: "notice notice--sm mb-12", "data-tone": "warn", role: "status" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering goals by "', globalSearch, '" \u2014 ', goalsFiltered.length, " match", goalsFiltered.length !== 1 ? "es" : ""), goalsFiltered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, gq ? "No goals match your search." : "All goals are archived.") : /* @__PURE__ */ React.createElement("div", { className: "goal-list" }, goalsFiltered.map((g) => {
        const pct = g.target > 0 ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0;
        const remaining = Math.max(0, g.target - g.saved);
        let projLabel = null, onTrack = null;
        if (remaining <= 0) {
          projLabel = "Funded";
          onTrack = true;
        } else if (g.monthly > 0) {
          const m = Math.ceil(remaining / g.monthly);
          const d = /* @__PURE__ */ new Date();
          d.setMonth(d.getMonth() + m);
          projLabel = MONTHS[d.getMonth()] + " " + d.getFullYear();
          if (g.targetDate) {
            const t = /* @__PURE__ */ new Date(g.targetDate + "T00:00:00");
            onTrack = d <= new Date(t.getFullYear(), t.getMonth() + 1, 0);
          }
        }
        let neededMonthly = null;
        if (remaining > 0 && onTrack === false && g.targetDate) {
          const t = /* @__PURE__ */ new Date(g.targetDate + "T00:00:00");
          const now = /* @__PURE__ */ new Date();
          const monthsLeft = (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth());
          if (monthsLeft > 0) neededMonthly = Math.ceil(remaining / monthsLeft);
        }
        const barColor = remaining <= 0 ? "var(--greenDk)" : onTrack === false ? "var(--amberInk)" : "var(--text)";
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: g.id,
            onContextMenu: (e) => {
              e.preventDefault();
              setGoalCtx({ x: e.clientX, y: e.clientY, goal: g });
            },
            className: "goal-row-cursor"
          },
          /* @__PURE__ */ React.createElement("div", { className: "goal-title-row" }, /* @__PURE__ */ React.createElement("span", { className: "tx-sb goal-name", title: g.name }, g.name), /* @__PURE__ */ React.createElement("div", { className: "goal-amounts-row" }, /* @__PURE__ */ React.createElement("span", { className: "goal-amounts-text" }, fmt(g.saved), " ", /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, "of"), " ", fmt(g.target), /* @__PURE__ */ React.createElement("span", { className: "goal-pct", style: { color: barColor } }, pct, "%")), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: (e) => {
                e.stopPropagation();
                setGoalCtx({ x: e.clientX, y: e.clientY, goal: g });
              },
              "aria-label": `${g.name} actions`,
              className: "cf-checkbtn row-menu-btn"
            },
            "⋮"
          ))),
          /* @__PURE__ */ React.createElement("div", { className: "progress-track-8" }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: pct + "%", borderRadius: 4, background: barColor, transition: "width 0.3s ease" } })),
          /* @__PURE__ */ React.createElement("div", { className: "goal-footer-row" }, /* @__PURE__ */ React.createElement("span", null, g.monthly > 0 ? fmt(g.monthly) + "/mo" : "No monthly funding set", g.targetDate && /* @__PURE__ */ React.createElement("span", { className: "goal-target-date" }, " \u00B7 by ", (() => {
            const t = /* @__PURE__ */ new Date(g.targetDate + "T00:00:00");
            return MONTHS[t.getMonth()] + " " + t.getFullYear();
          })())), projLabel && /* @__PURE__ */ React.createElement("span", { style: { color: remaining <= 0 ? "var(--greenDk)" : onTrack === false ? "var(--amberInk)" : "var(--textLt)", fontWeight: onTrack === false || remaining <= 0 ? 700 : 400 } }, remaining <= 0 ? "\u2713 Funded" : onTrack === false ? neededMonthly ? `\u26A0 Need ${fmt(neededMonthly)}/mo by target` : "\u26A0 Projected " + projLabel : "On track \u2014 " + projLabel))
        );
      }))), goalCtx && /* @__PURE__ */ React.createElement(
        ContextMenu,
        {
          x: goalCtx.x,
          y: goalCtx.y,
          onClose: () => setGoalCtx(null),
          items: [
            { icon: "\u270E", label: "Edit goal", action: () => openGoalForm(goalCtx.goal) },
            { icon: "\uFF0B", label: "Add funds", action: () => {
              setFundForm({ goal: goalCtx.goal, amount: "" });
              setShowFundForm(true);
            } },
            "---",
            { icon: /* @__PURE__ */ React.createElement(Icon, { name: "eye-off", size: 15 }), label: "Archive goal", action: () => archiveGoal(goalCtx.goal) },
            { icon: "\u2715", label: "Delete goal", action: () => setConfirmGoalDelete(goalCtx.goal), danger: true }
          ]
        }
      ), showGoalForm && goalForm && /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-overlay",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Goal form"
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "modal-card goalform-modal-card",
            onClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: () => {
            setShowGoalForm(false);
            setGoalForm(null);
          } }),
          /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg" }, goalForm.id ? "Edit Goal" : "Add Goal"),
          (() => {
            const lblCls = "field-label";
            const inpCls = (err) => "field-input" + (err ? " field-error" : "");
            const errTxt = (k) => goalErrors[k] && /* @__PURE__ */ React.createElement("div", { className: "field-error-text" }, goalErrors[k]);
            return /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "goal-name" }, "Goal name", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
              "input",
              {
                id: "goal-name",
                autoFocus: autoFocusOnDesktop(),
                className: inpCls(goalErrors.name),
                value: goalForm.name,
                placeholder: "e.g. Property Taxes",
                onChange: (e) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { name: e.target.value }))
              }
            ), errTxt("name")), /* @__PURE__ */ React.createElement("div", { className: "entry-form-row2-12" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "goal-target" }, "Target $", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
              MoneyInput,
              {
                id: "goal-target",
                className: inpCls(goalErrors.target),
                value: goalForm.target,
                onChange: (v) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { target: v }))
              }
            ), errTxt("target")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "goal-saved" }, "Saved so far $"), /* @__PURE__ */ React.createElement(
              MoneyInput,
              {
                id: "goal-saved",
                className: inpCls(goalErrors.saved),
                value: goalForm.saved,
                onChange: (v) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { saved: v }))
              }
            ), errTxt("saved"))), /* @__PURE__ */ React.createElement("div", { className: "entry-form-row2-12" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "goal-monthly" }, "Monthly funding $"), /* @__PURE__ */ React.createElement(
              MoneyInput,
              {
                id: "goal-monthly",
                className: inpCls(goalErrors.monthly),
                value: goalForm.monthly,
                onChange: (v) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { monthly: v }))
              }
            ), errTxt("monthly")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "goal-target-date" }, "Target date", goalForm.payoutEntry && /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
              "input",
              {
                id: "goal-target-date",
                type: "date",
                className: inpCls(goalErrors.targetDate),
                value: goalForm.targetDate,
                onChange: (e) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { targetDate: e.target.value }))
              }
            ), errTxt("targetDate"))), !goalForm.id && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "goal-checkbox-label" }, /* @__PURE__ */ React.createElement(
              "input",
              {
                type: "checkbox",
                checked: goalForm.linkEntry,
                onChange: (e) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { linkEntry: e.target.checked })),
                className: "checkbox-16"
              }
            ), "Add monthly contribution to my budget as a recurring entry"), /* @__PURE__ */ React.createElement("div", { className: "checkbox-help-row" }, /* @__PURE__ */ React.createElement("label", { className: "goal-checkbox-label" }, /* @__PURE__ */ React.createElement(
              "input",
              {
                type: "checkbox",
                checked: goalForm.payoutEntry,
                onChange: (e) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { payoutEntry: e.target.checked })),
                className: "checkbox-16"
              }
            ), "Add the payout as a one-time expense on the target date"), /* @__PURE__ */ React.createElement(HelpTip, { label: "Add the payout as an expense", text: "Models the spending in your forecast: on the target date the saved-up amount leaves the budget as a one-time expense, so the running balance shows the purchase actually happening." }))));
          })(),
          /* @__PURE__ */ React.createElement("div", { className: "oem-footer-row" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setShowGoalForm(false),
              className: "cf-btn cf-btn--secondary"
            },
            "Cancel"
          ), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: saveGoal,
              className: "cf-btn cf-btn--primary fw-700 btn-pad-24"
            },
            "Save"
          ))
        )
      ), showFundForm && fundForm && /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-overlay",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Add funds"
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "modal-card modal-card-360",
            onClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: () => {
            setShowFundForm(false);
            setFundForm(null);
          } }),
          /* @__PURE__ */ React.createElement("div", { className: "fundform-title" }, "Add funds"),
          /* @__PURE__ */ React.createElement("div", { className: "fundform-subtitle" }, fundForm.goal.name),
          /* @__PURE__ */ React.createElement(
            MoneyInput,
            {
              autoFocus: autoFocusOnDesktop(),
              value: fundForm.amount,
              placeholder: "Amount",
              onChange: (v) => setFundForm((f) => __spreadProps(__spreadValues({}, f), { amount: v })),
              onKeyDown: (e) => {
                if (e.key === "Enter") applyFunds();
              },
              className: "moneyinput-lg"
            }
          ),
          /* @__PURE__ */ React.createElement("div", { className: "modal-btn-row-18" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setShowFundForm(false),
              className: "cf-btn cf-btn--secondary"
            },
            "Cancel"
          ), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: applyFunds,
              className: "cf-btn cf-btn--primary fw-700 btn-pad-24"
            },
            "Add"
          ))
        )
      ), confirmGoalDelete && /* @__PURE__ */ React.createElement(
        ConfirmDialog,
        {
          title: "Delete goal?",
          message: `"${confirmGoalDelete.name}" will be removed.${confirmGoalDelete.entryId || confirmGoalDelete.payoutEntryId ? " Its linked budget entries (contribution/payout) will also be deleted." : ""}`,
          onCancel: () => setConfirmGoalDelete(null),
          onConfirm: () => {
            const rm = [confirmGoalDelete.entryId, confirmGoalDelete.payoutEntryId].filter(Boolean);
            if (rm.length) {
              const removedCopyFroms = entries.filter((e) => rm.includes(e.id) && e.copiedFrom !== void 0).map((e) => e.copiedFrom);
              if (removedCopyFroms.length) setDeletedCopyIds((prev) => {
                const next = __spreadValues({}, prev);
                removedCopyFroms.forEach((id) => {
                  next[id] = true;
                });
                return next;
              });
              setEntries((prev) => prev.filter((e) => !rm.includes(e.id)));
            }
            setGoals((prev) => prev.filter((g) => g.id !== confirmGoalDelete.id));
            setConfirmGoalDelete(null);
          }
        }
      ));
    })(), (() => {
      const debtKeywords = [
        "debt",
        "credit",
        "loan",
        "mortgage",
        "line of credit",
        "cc-",
        "visa",
        "amex",
        "mastercard",
        "car payment",
        "truck payment",
        "trailer payment",
        "scotialine",
        "loc",
        "vehicle",
        "tractor"
      ];
      const autoGroups = {};
      flow.filter((ev) => ev.type === "expense" && debtKeywords.some(
        (k) => ev.desc.toLowerCase().includes(k) || ev.category.toLowerCase().includes(k)
      )).forEach((ev) => {
        autoGroups[ev.desc] = (autoGroups[ev.desc] || []).concat(ev);
      });
      const manualKeys = Object.keys(debtData).filter((k) => {
        var _a;
        return k.startsWith("manual_") && !((_a = debtData[k]) == null ? void 0 : _a.hidden);
      });
      // Recurring series get their monthly-equivalent from the recurrence rule
      // itself (periods/year * amount, annualized) rather than from summing
      // this calendar year's actual occurrences — a series that started or
      // ends mid-year only has a partial year's worth in `evs`, and dividing
      // that partial total by 12 understated the true monthly payment (e.g. a
      // bi-weekly payment starting in June only has ~13 of its 26 yearly
      // occurrences this year). One-off (non-repeating) matches keep the old
      // sum-and-divide behavior, which is the correct spread for those.
      //
      // A single description can also cover more than one underlying entry
      // (e.g. a "Mortgage" 1st-of-month entry and a separate "Mortgage"
      // 15th-of-month entry, both monthly) — `evs` mixes both entries'
      // occurrences together. Using only evs[0]'s recurrence rule would have
      // seen just one of the two entries and missed the other payment
      // entirely, so each distinct entryId is annualized separately and the
      // per-entry contributions are summed.
      const toMonthlyFromEvs = (evs) => {
        if (!evs || !evs.length) return 0;
        const byEntry = {};
        evs.forEach((ev) => {
          const eid = ev.entryId != null ? ev.entryId : ev.id;
          (byEntry[eid] || (byEntry[eid] = [])).push(ev);
        });
        const total = Object.values(byEntry).reduce((sum, occs) => {
          const ev = occs[0];
          if (ev.repeats) {
            const every = ev.recurEvery || 1;
            // expandEntries' semimonth branch always emits exactly 2
            // occurrences/month (24/yr) — it never reads recurEvery — so
            // dividing by `every` here (as every other unit correctly does)
            // silently halved this to 12/yr for any semimonth entry that
            // happened to carry a stale/leftover recurEvery of 2.
            const ppy = { day: 365 / every, week: 52 / every, month: 12 / every, monthend: 12 / every, monthweekday: 12 / every, year: 1 / every, semimonth: 24 }[ev.recurUnit || "month"] ?? 12;
            return sum + (ev.amount || 0) * (ppy / 12);
          }
          return sum + occs.reduce((s, e) => s + (e.amount || 0), 0) / 12;
        }, 0);
        return roundMoney(total);
      };
      const autoRows = Object.entries(autoGroups).filter(([desc]) => {
        var _a;
        return !((_a = debtData[desc.replace(/[^a-zA-Z0-9]/g, "_")]) == null ? void 0 : _a.hidden);
      }).map(([desc, evs]) => {
        var _a;
        return {
          key: desc.replace(/[^a-zA-Z0-9]/g, "_"),
          label: desc,
          monthlyPmt: toMonthlyFromEvs(evs),
          annualTotal: roundMoney(evs.reduce((s, ev) => s + (ev.amount || 0), 0)),
          timesPerYear: evs.length,
          perOccurrence: ((_a = evs[0]) == null ? void 0 : _a.amount) || 0,
          recurDesc: (() => {
            const ev = evs[0];
            if (!ev) return "";
            const count = evs.length;
            // Multiple distinct entries sharing one description (e.g. separate
            // 1st-of-month and 15th-of-month entries both called "Mortgage")
            // don't share a single recurrence rule to describe — fall back to
            // the combined occurrence count instead of evs[0]'s own pattern.
            const distinctEntries = new Set(evs.map((e2) => e2.entryId != null ? e2.entryId : e2.id)).size;
            if (distinctEntries === 1) {
              const u = ev.recurUnit || "month";
              const e = ev.recurEvery || 1;
              if (u === "semimonth") return `2\xD7/mo`;
              if (u === "monthend" || u === "monthweekday") return `Monthly`;
              if (u === "week" && e === 2) return "Bi-weekly";
              if (u === "week") return `Every ${e} wk`;
              if (u === "month") return e === 1 ? "Monthly" : `Every ${e} mo`;
              if (u === "year") return "Yearly";
            }
            if (count === 24) return "2\xD7/mo";
            if (count === 26) return "Bi-weekly";
            return `${count}\xD7/yr`;
          })(),
          isAuto: true
        };
      });
      const manualRows = manualKeys.map((k) => {
        var _a, _b;
        return {
          key: k,
          label: ((_a = debtData[k]) == null ? void 0 : _a.label) || "",
          monthlyPmt: parseFloat((_b = debtData[k]) == null ? void 0 : _b.payment) || 0,
          isAuto: false
        };
      });
      const allRows = [...autoRows, ...manualRows].filter((r) => {
        if (r.isAuto) return true;
        const d = debtData[r.key] || {};
        return r.label && r.label.trim() || parseFloat(d.balance) > 0 || parseFloat(d.rate) > 0 || parseFloat(d.payment) > 0;
      });
      const allRowsFiltered = gq ? allRows.filter((r) => (r.label || "").toLowerCase().includes(gq)) : allRows;
      // Amortised month by month, the same way simulateDebtStrategy does it,
      // because the two have to agree: the interest was `pmt * m - bal`, which
      // charges the whole of the final month's payment even though that
      // payment only ever clears what is left. On $4,000 at 19.9% paying $300
      // the tracker printed $800 of "Total Interest Remaining" against the
      // $558.33 the Payoff Strategy screen simulated for the same debt — a
      // 43% overstatement, on the number the screen exists to tell you.
      const calcPayoff = (bal, rate, pmt) => {
        if (!bal || !pmt) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        const r = rate / 100 / 12;
        if (r > 0 && pmt <= bal * r) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        let left = bal, accrued = 0, m = 0;
        while (left > 5e-3 && m < 600) {
          m++;
          const i = left * r;
          left += i;
          accrued += i;
          left -= Math.min(pmt, left);
        }
        if (m >= 600) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        const interest = r > 0 ? roundMoney(accrued) : null;
        const d = /* @__PURE__ */ new Date();
        d.setMonth(d.getMonth() + m);
        return { monthsLeft: m, totalInterest: interest, payoffDate: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
      };
      const debtKpiTotals = allRows.reduce((acc, r) => {
        const d = debtData[r.key] || {};
        const bal = parseFloat(d.balance) || 0;
        const rate = parseFloat(d.rate) || 0;
        const pmt = r.isAuto ? r.monthlyPmt : parseFloat(d.payment) || 0;
        const { totalInterest, payoffDate } = calcPayoff(bal, rate, pmt);
        acc.balance += bal;
        acc.payment += pmt;
        if (totalInterest != null) acc.interest += totalInterest;
        if (payoffDate) {
          const dt = new Date(payoffDate);
          if (!acc.latestPayoffDt || dt > acc.latestPayoffDt) {
            acc.latestPayoffDt = dt;
            acc.latestPayoff = payoffDate;
          }
        }
        return acc;
      }, { balance: 0, payment: 0, interest: 0, latestPayoffDt: null, latestPayoff: null });
      const addManualRow = () => {
        setDebtFormData({ label: "", balance: "", rate: "", payment: "", editKey: null });
        setShowDebtForm(true);
      };
      const editDebtRow = (key, autoLabel = "") => {
        const v = debtData[key] || {};
        setDebtFormData({ label: v.label || (autoLabel || key.replace(/_/g, " ")), balance: v.balance ? String(centsToDollars(Number(v.balance))) : "", rate: v.rate || "", payment: v.payment ? String(centsToDollars(Number(v.payment))) : "", editKey: key });
        setShowDebtForm(true);
      };
      const saveDebtForm = () => {
        if (!debtFormData.label.trim()) return;
        const balN = parseFloat(debtFormData.balance);
        const rateN = parseFloat(debtFormData.rate);
        const pmtN = parseFloat(debtFormData.payment);
        const { editKey } = debtFormData;
        // Balance/payment are entered in dollars but stored in cents — the
        // same at-rest convention schema v8 established for every other
        // money field (entries, goals, budget targets); rate is a percentage,
        // not money, and is stored as-is.
        const formVals = {
          label: debtFormData.label.trim(),
          balance: isNaN(balN) || balN < 0 ? "" : String(dollarsToCents(balN)),
          rate: isNaN(rateN) || rateN < 0 ? "" : String(rateN),
          payment: isNaN(pmtN) || pmtN < 0 ? "" : String(dollarsToCents(pmtN))
        };
        if (editKey) {
          setDebtData((p) => __spreadProps(__spreadValues({}, p), { [editKey]: __spreadValues(__spreadValues({}, p[editKey]), formVals) }));
          logActivity("debt", `Updated the debt ${debtFormData.label || editKey}`);
        } else {
          const id = "manual_" + genId();
          setDebtData((p) => __spreadProps(__spreadValues({}, p), { [id]: formVals }));
          logActivity("debt", `Added the debt ${debtFormData.label || "Untitled"}`);
        }
        setShowDebtForm(false);
        setDebtFormData({ label: "", balance: "", rate: "", payment: "", editKey: null });
      };
      const removeRow = (key, isAuto) => {
        if (isAuto) {
          setDebtData((p) => __spreadProps(__spreadValues({}, p), { [key]: __spreadProps(__spreadValues({}, p[key]), { hidden: true }) }));
        } else {
          setDebtData((p) => {
            const n = __spreadValues({}, p);
            delete n[key];
            return n;
          });
        }
      };
      const restoreHidden = () => {
        setDebtData((p) => {
          const n = __spreadValues({}, p);
          Object.keys(n).forEach((k) => {
            if (n[k].hidden) delete n[k].hidden;
          });
          return n;
        });
      };
      const hiddenCount = Object.values(debtData).filter((v) => v.hidden).length;
      return /* @__PURE__ */ React.createElement(React.Fragment, null, planSub === "strategy" && (() => {
        const simDebtsAll = allRows.map((row) => {
          var _a, _b;
          return {
            key: row.key,
            label: row.label,
            bal: parseFloat((_a = debtData[row.key]) == null ? void 0 : _a.balance) || 0,
            rate: parseFloat((_b = debtData[row.key]) == null ? void 0 : _b.rate) || 0,
            pmt: row.monthlyPmt
          };
        }).filter((d) => d.bal > 0 && d.pmt > 0);
        if (simDebtsAll.length < 1) return /* @__PURE__ */ React.createElement(Card, { className: "mt-16" }, /* @__PURE__ */ React.createElement(SectionTitle, { className: "mb-12" }, "Payoff Strategy"), /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, /* @__PURE__ */ React.createElement(EmptyState, {
          icon: /* @__PURE__ */ React.createElement(Icon, { name: "mountain", size: 26, className: "c-textLt" }),
          message: "Add a balance and payment for at least one debt in Debt Payoff to see Avalanche vs Snowball strategies here.",
          actionLabel: "Go to Debt Payoff",
          onAction: () => setPlanSub("debt")
        })));
        const toggleSimDebt = (key) => {
          setDebtSimExcluded((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
        };
        // Nine checkboxes as chips cost about 500px of a phone screen to say
        // "all of them", which is the answer almost every time — and the names
        // that matter most ("CC-Scotia Infinite Visa") were the ones the chips
        // truncated. One line states the answer; changing it is a sheet, where
        // the full names fit and All / None are one tap.
        const includedCount = simDebtsAll.length - simDebtsAll.filter((d) => debtSimExcluded.includes(d.key)).length;
        const checklist = simDebtsAll.length > 1 && /* @__PURE__ */ React.createElement(
          "div", { className: "strat-include-row" },
          /* @__PURE__ */ React.createElement("span", { className: "strat-include-text" },
            includedCount === simDebtsAll.length
              ? `All ${simDebtsAll.length} debts included`
              : `${includedCount} of ${simDebtsAll.length} debts included`),
          /* @__PURE__ */ React.createElement("button", {
            type: "button", className: "cf-btn cf-btn--secondary cf-btn--xs",
            onClick: () => setShowDebtPicker(true),
            "aria-haspopup": "dialog"
          }, "Change"));
        const debtPicker = showDebtPicker && /* @__PURE__ */ React.createElement(
          "div", { className: "modal-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Debts in the simulation" },
          /* @__PURE__ */ React.createElement("div", { className: "modal-card entries-mobilefilters-card" },
            /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: () => setShowDebtPicker(false) }),
            /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg" }, "Debts in the simulation"),
            /* @__PURE__ */ React.createElement("div", { className: "strat-picker-actions" },
              /* @__PURE__ */ React.createElement("button", {
                className: "cf-btn cf-btn--secondary cf-btn--xs",
                onClick: () => setDebtSimExcluded([])
              }, "All"),
              /* @__PURE__ */ React.createElement("button", {
                className: "cf-btn cf-btn--secondary cf-btn--xs",
                onClick: () => setDebtSimExcluded(simDebtsAll.map((d) => d.key))
              }, "None")),
            /* @__PURE__ */ React.createElement("div", { className: "strat-picker-list" },
              simDebtsAll.map((d) => /* @__PURE__ */ React.createElement(
                "label", { key: d.key, className: "strat-picker-item" },
                /* @__PURE__ */ React.createElement("input", {
                  type: "checkbox",
                  checked: !debtSimExcluded.includes(d.key),
                  onChange: () => toggleSimDebt(d.key)
                }),
                /* @__PURE__ */ React.createElement("span", { className: "strat-picker-name" }, d.label),
                /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 strat-picker-bal" }, fmt(d.bal))))),
            /* @__PURE__ */ React.createElement("div", { className: "customize-done-row" },
              /* @__PURE__ */ React.createElement("button", {
                onClick: () => setShowDebtPicker(false),
                className: "cf-btn cf-btn--primary fw-700 btn-pad-24"
              }, "Done"))));
        // debtExtra is entered/displayed in dollars; simDebts' bal/pmt are
        // cents, so this needs the same conversion before it's mixed in.
        const extraDollars = Math.max(0, parseFloat(debtExtra) || 0);
        const extra = dollarsToCents(extraDollars);
        const sliderMax = Math.max(2e3, Math.ceil(extraDollars / 100) * 100);
        const extraControl = /* @__PURE__ */ React.createElement("label", { className: "strat-extra-label" }, "Extra $/month", /* @__PURE__ */ React.createElement("input", {
          type: "range",
          min: 0,
          max: sliderMax,
          step: 25,
          value: extraDollars,
          onChange: (e) => setDebtExtra(e.target.value),
          className: "strat-extra-slider",
          "aria-label": "Extra monthly payment slider"
        }), /* @__PURE__ */ React.createElement(
          MoneyInput,
          {
            value: debtExtra,
            onChange: (v) => setDebtExtra(v),
            className: "strat-extra-input cf-text-mono-13"
          }
        ));
        const simDebts = simDebtsAll.filter((d) => !debtSimExcluded.includes(d.key));
        if (simDebts.length < 1) return /* @__PURE__ */ React.createElement(Card, { className: "mt-16" }, /* @__PURE__ */ React.createElement(SectionTitle, { action: extraControl, className: "goal-header-row mb-12" }, "Payoff Strategy"), checklist, /* @__PURE__ */ React.createElement("div", { className: "strat-error" }, "All debts are excluded from the simulation \u2014 include at least one above to see a strategy."));
        const av = simulateDebtStrategy(simDebts, extra, "avalanche");
        const sn = simulateDebtStrategy(simDebts, extra, "snowball");
        const base = simulateDebtStrategy(simDebts, 0, "avalanche");
        if (!av || !sn) {
          const minExtraCents = Math.max(0, ...simDebts.map((d) => d.bal * (d.rate / 100 / 12) - d.pmt));
          const suggested = Math.ceil(centsToDollars(minExtraCents)) + 1;
          return /* @__PURE__ */ React.createElement(Card, { className: "mt-16" }, /* @__PURE__ */ React.createElement(SectionTitle, { action: extraControl, className: "goal-header-row mb-12" }, "Payoff Strategy"), checklist, /* @__PURE__ */ React.createElement("div", { className: "strat-error" }, "\u26A0 Payments don't cover interest on at least one debt \u2014 payoff never completes.", minExtraCents > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, " Try at least ", /* @__PURE__ */ React.createElement(
            "button",
            {
              className: "strat-suggest-btn",
              onClick: () => setDebtExtra(String(suggested))
            },
            moneySymbol(),
            suggested,
            "/mo extra"
          ), ".")));
        }
        const maxLen = Math.max(av.timeline.length, sn.timeline.length);
        const chartData = Array.from({ length: maxLen }, (_, i) => ({
          month: i,
          Avalanche: i < av.timeline.length ? av.timeline[i] : 0,
          Snowball: i < sn.timeline.length ? sn.timeline[i] : 0
        }));
        // The same helper the Alerts centre reads, so the sentence here and
        // the one there cannot drift apart.
        const strategyFinding = debtStrategyFinding(simDebts, extra);
        const deltaCallout = strategyFinding && /* @__PURE__ */ React.createElement(
          "div",
          { className: "notice notice--sm", "data-tone": strategyFinding.tone, role: "status" },
          /* @__PURE__ */ React.createElement(Icon, { name: strategyFinding.icon, size: 14 }),
          /* @__PURE__ */ React.createElement("span", { className: "notice-msg" }, strategyFinding.text)
        );
        return /* @__PURE__ */ React.createElement(Card, { className: "mt-16" }, /* @__PURE__ */ React.createElement(SectionTitle, { action: extraControl, className: "goal-header-row mb-12" }, "Payoff Strategy"), checklist, debtPicker, deltaCallout, /* @__PURE__ */ React.createElement(StratCompare, { av, sn, base, pick: stratPick, onPick: setStratPick }), /* @__PURE__ */ React.createElement("div", { className: "strat-chart-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "strat-chart-label" }, "Total balance remaining over time"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 220 }, /* @__PURE__ */ React.createElement(LineChart, { data: chartData, ariaLabel: `Line chart of the total debt balance falling to zero over ${chartData.length} months, one line per strategy: Avalanche clears it in ${av.months} months paying ${fmt(av.totalInterest)} of interest, Snowball in ${sn.months} months paying ${fmt(sn.totalInterest)}. The two cards above give the same figures.`, margin: { top: 4, right: 4, bottom: 34, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "Avalanche", name: "Avalanche", stroke: "var(--primary)", strokeWidth: 2.5, dot: { r: 2 }, activeDot: { r: 5 } }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "Snowball", name: "Snowball", stroke: "var(--amberInk)", strokeWidth: 2.5, strokeDasharray: "6 4", dot: { r: 2 }, activeDot: { r: 5 } }))))), /* @__PURE__ */ React.createElement("div", { className: "strat-footnote-row" }, /* @__PURE__ */ React.createElement(ExportBar, {
          onCSV: () => downloadCSV(
            "CashFlow_PayoffStrategy.csv",
            [
              ["Avalanche", av.debtFreeDate, centsToDollars(av.totalInterest), av.months, av.payoffOrder.join(" -> ")],
              ["Snowball", sn.debtFreeDate, centsToDollars(sn.totalInterest), sn.months, sn.payoffOrder.join(" -> ")]
            ],
            ["Strategy", "Debt-Free Date", "Total Interest", "Months", "Payoff Order"]
          ),
          onPrint: () => printView("CashFlow Payoff Strategy")
        })));
      })(), planSub === "debt" && debtCtx && /* @__PURE__ */ React.createElement(
        ContextMenu,
        {
          x: debtCtx.x,
          y: debtCtx.y,
          onClose: () => setDebtCtx(null),
          items: [
            { icon: "\u270E", label: "Edit entry", action: () => editDebtRow(debtCtx.key, debtCtx.label) },
            "---",
            {
              icon: debtCtx.isAuto ? /* @__PURE__ */ React.createElement(Icon, { name: "eye", size: 15 }) : "\u2715",
              label: debtCtx.isAuto ? "Hide from tracker" : "Remove entry",
              action: () => removeRow(debtCtx.key, debtCtx.isAuto),
              danger: true
            }
          ]
        }
      ), planSub === "debt" && showDebtForm && /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-overlay",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Debt form"
        },
        /* @__PURE__ */ React.createElement("div", { className: "modal-card oem-card" }, /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: () => setShowDebtForm(false) }), /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg" }, debtFormData.editKey ? "Edit Debt" : "Add Debt"), /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "debt-desc" }, "Description", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "debt-desc",
            autoFocus: autoFocusOnDesktop(),
            placeholder: "e.g. Personal Loan",
            value: debtFormData.label,
            onChange: (e) => setDebtFormData((p) => __spreadProps(__spreadValues({}, p), { label: e.target.value })),
            onKeyDown: (e) => e.key === "Enter" && saveDebtForm(),
            className: "field-input"
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "grid-2-12" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "debt-balance" }, "Current Balance $"), /* @__PURE__ */ React.createElement(
          MoneyInput,
          {
            id: "debt-balance",
            placeholder: "e.g. 10000",
            value: debtFormData.balance,
            className: "field-input",
            onChange: (v) => setDebtFormData((p) => __spreadProps(__spreadValues({}, p), { balance: v }))
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "debt-rate" }, "Interest Rate %"), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "debt-rate",
            type: "number",
            inputMode: "decimal",
            placeholder: "e.g. 5.9",
            value: debtFormData.rate,
            className: "field-input",
            onChange: (e) => setDebtFormData((p) => __spreadProps(__spreadValues({}, p), { rate: e.target.value }))
          }
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(FieldLabel, { htmlFor: "debt-payment", helpLabel: "Monthly Payment", help: "Leave blank for a debt that is already in your budget \u2014 its payment is read from the matching entry. Fill it in for a debt you pay from somewhere else, or the payoff date can't be worked out." }, "Monthly Payment $ ", /* @__PURE__ */ React.createElement("span", { className: "debtform-optional" }, "(optional)")), /* @__PURE__ */ React.createElement(
          MoneyInput,
          {
            id: "debt-payment",
            placeholder: "e.g. 500",
            value: debtFormData.payment,
            className: "field-input",
            onChange: (v) => setDebtFormData((p) => __spreadProps(__spreadValues({}, p), { payment: v }))
          }
        ), (() => {
          // Auto-detection only catches a payment whose description/category
          // happens to contain a debt-ish keyword (loan, mortgage, visa…) —
          // anything else (e.g. "Costco Mastercard") is silently missed. This
          // lets a user fill the payment from any recurring expense directly,
          // without depending on that guess.
          const recurExpenses = entries.filter((e) => e.type === "expense" && e.repeats);
          if (!recurExpenses.length) return null;
          const entryToMonthly = (e) => {
            const every = e.recurEvery || 1;
            const ppy = { day: 365 / every, week: 52 / every, month: 12 / every, monthend: 12 / every, monthweekday: 12 / every, year: 1 / every, semimonth: 24 }[e.recurUnit || "month"] ?? 12;
            return roundMoney((e.amount || 0) * (ppy / 12));
          };
          // Group by description so multiple entries sharing one name (e.g.
          // separate 1st-of-month and 15th-of-month "Mortgage" entries)
          // autofill their combined monthly total — selecting just one of
          // several same-named entries previously loaded only its own share
          // of the payment, same bug the Debt Payoff Tracker's own monthly
          // total had.
          const groupedByDesc = {};
          recurExpenses.forEach((e) => {
            const k = e.desc || "";
            (groupedByDesc[k] || (groupedByDesc[k] = [])).push(e);
          });
          const recurGroups = Object.entries(groupedByDesc).map(([desc, evs]) => ({
            desc,
            monthly: roundMoney(evs.reduce((s, e) => s + entryToMonthly(e), 0))
          })).sort((a, b) => a.desc.localeCompare(b.desc));
          return /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("div", { className: "debtform-hint mb-6" }, "Or autofill from a recurring expense:"), /* @__PURE__ */ React.createElement(
            "select",
            {
              "aria-label": "Autofill payment from a recurring expense",
              value: "",
              className: "field-input",
              onChange: (e) => {
                const grp = recurGroups.find((g) => g.desc === e.target.value);
                if (grp) setDebtFormData((p) => __spreadProps(__spreadValues({}, p), { payment: String(centsToDollars(grp.monthly)) }));
              }
            },
            /* @__PURE__ */ React.createElement("option", { value: "" }, "— choose an entry —"),
            recurGroups.map((g) => /* @__PURE__ */ React.createElement("option", { key: g.desc, value: g.desc }, g.desc, " (", fmt(g.monthly), "/mo)"))
          ));
        })())), /* @__PURE__ */ React.createElement("div", { className: "oem-footer-row" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setShowDebtForm(false),
            className: "cf-btn cf-btn--secondary"
          },
          "Cancel"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: saveDebtForm,
            disabled: !debtFormData.label.trim(),
            className: "cf-btn cf-btn--primary btn-pad-24"
          },
          debtFormData.editKey ? "Save Changes" : "Add Debt"
        )))
      ), /* @__PURE__ */ React.createElement(Card, { className: "mb-20 mt-16" + (planSub === "debt" ? "" : " cf-hidden") }, /* @__PURE__ */ React.createElement("div", { className: "goal-header-row", style: {
        marginBottom: 12
      } }, /* @__PURE__ */ React.createElement(SectionTitle, { className: "mb-0" }, "Debt Payoff Tracker")), allRows.length > 0 && (debtKpiTotals.balance > 0 ? /* @__PURE__ */ React.createElement("div", { className: "kpi-grid mt-16" }, /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Balance", value: fmt(debtKpiTotals.balance), color: "var(--red)" }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Monthly Payment", value: fmt(debtKpiTotals.payment) }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Interest Remaining", value: fmt(debtKpiTotals.interest) }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Debt-Free By", value: debtKpiTotals.latestPayoff || "\u2014", color: debtKpiTotals.latestPayoff ? "var(--greenDk)" : void 0 })) : /* @__PURE__ */ React.createElement("div", { className: "debt-needs-balance mt-16" }, /* @__PURE__ */ React.createElement(Icon, { name: "credit-card", size: 16 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, allRows.length === 1 ? "One payment found, no balance yet" : `${allRows.length} payments found, no balances yet`), /* @__PURE__ */ React.createElement("div", { className: "hint mt-2" }, "Add what's still owed and the interest rate below, and this fills in with a payoff date, the total interest ahead of you, and what an extra payment would save.")))), allRows.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "budget-toolbar-row budget-toolbar-row--end" }, /* @__PURE__ */ React.createElement(
        ExportBar,
        {
          onCSV: () => downloadCSV(
            "CashFlow_Debts.csv",
            allRows.map(({ key, label, monthlyPmt, isAuto }) => {
              var _a, _b, _c;
              const bal = parseFloat((_a = debtData[key]) == null ? void 0 : _a.balance) || 0;
              const rate = parseFloat((_b = debtData[key]) == null ? void 0 : _b.rate) || 0;
              const pmt = isAuto ? monthlyPmt : parseFloat((_c = debtData[key]) == null ? void 0 : _c.payment) || 0;
              const { totalInterest, payoffDate } = calcPayoff(bal, rate, pmt);
              return [label, centsToDollars(bal), rate, centsToDollars(pmt), payoffDate || "", totalInterest != null ? centsToDollars(totalInterest) : ""];
            }),
            ["Debt", "Balance", "Rate %", "Monthly Payment", "Payoff Date", "Total Interest"]
          ),
          onPrint: () => printView("CashFlow Debt Payoff Tracker")
        }
      ), hiddenCount > 0 && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: restoreHidden,
          className: "debt-restore-btn"
        },
        "Restore ",
        hiddenCount,
        " hidden"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: addManualRow,
          className: "cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap"
        },
        "+ Add"
      )), allRows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, /* @__PURE__ */ React.createElement(EmptyState, {
        icon: /* @__PURE__ */ React.createElement(Icon, { name: "credit-card", size: 26, className: "c-textLt" }),
        message: "No debt entries detected \u2014 debts matching your budget entries show up here automatically, or add one manually.",
        actionLabel: "+ Add Debt",
        onAction: addManualRow
      })) : /* @__PURE__ */ React.createElement(React.Fragment, null, gq && /* @__PURE__ */ React.createElement("div", { className: "notice notice--sm mb-10", "data-tone": "warn", role: "status" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering debts by "', globalSearch, '" \u2014 ', allRowsFiltered.length, " match", allRowsFiltered.length !== 1 ? "es" : ""), allRowsFiltered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, "No debts match your search.") : /* @__PURE__ */ React.createElement("div", { className: "debt-list" }, allRowsFiltered.map(({ key, label, monthlyPmt, isAuto, perOccurrence, recurDesc, timesPerYear }) => {
        var _a, _b, _c, _d;
        const bal = parseFloat((_a = debtData[key]) == null ? void 0 : _a.balance) || 0;
        const rate = parseFloat((_b = debtData[key]) == null ? void 0 : _b.rate) || 0;
        const pmt = isAuto ? monthlyPmt : parseFloat((_c = debtData[key]) == null ? void 0 : _c.payment) || 0;
        const { monthsLeft, totalInterest, payoffDate } = calcPayoff(bal, rate, pmt);
        const payoffTrend = monthsLeft > 1 ? projectPayoffBalances(bal, rate, pmt, monthsLeft) : null;
        // One flat row, not a card in a card in a page. The balance used to
        // be printed twice — once beside the sparkline, once again in a
        // three-column stat grid below it — and the three nested boxes cost
        // 96px of a 390px screen, which is why a name like "CC-Scotia Line of
        // Credit" wrapped to three lines. Everything that was in the grid is
        // one meta line now, and the burn-down gets the width it was always
        // trying to show.
        const facts = [
          rate > 0 ? rate + "%" : null,
          pmt > 0 ? fmt(pmt) + "/mo" : null,
          isAuto && recurDesc && timesPerYear > 12 ? fmt(perOccurrence) + " " + recurDesc : null,
          totalInterest != null && totalInterest > 0 ? "+" + fmt(totalInterest) + " interest" : null
        ].filter(Boolean);
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key,
            onContextMenu: (e) => {
              e.preventDefault();
              setDebtCtx({ x: e.clientX, y: e.clientY, key, label, isAuto });
            },
            className: "debt-item"
          },
          /* @__PURE__ */ React.createElement("div", { className: "debt-item-head" },
            /* @__PURE__ */ React.createElement("span", { className: "debt-item-name" }, label),
            bal > 0 && /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 debt-item-bal" }, fmt(bal)),
            /* @__PURE__ */ React.createElement("button", {
              onClick: (e) => {
                e.stopPropagation();
                setDebtCtx({ x: e.clientX, y: e.clientY, key, label, isAuto });
              },
              className: "cf-checkbtn row-menu-btn debt-item-menu",
              "aria-label": label + " actions",
              title: label + " actions"
            }, "\u22EE")),
          (facts.length > 0 || payoffDate) && /* @__PURE__ */ React.createElement("div", { className: "debt-item-meta" },
            facts.join(" \u00B7 "),
            payoffDate && /* @__PURE__ */ React.createElement("span", { className: "debt-item-paid" },
              facts.length ? " \u00B7 " : "", "\u2713 paid off ", payoffDate)),
          payoffTrend && /* @__PURE__ */ React.createElement("div", {
            className: "debt-item-trend", title: "Projected balance decline to payoff"
          }, /* @__PURE__ */ React.createElement(Sparkline, {
            data: payoffTrend, color: "var(--red)", height: 22, width: 240, responsive: true, area: true
          }))
        );
      })))));
    })());
  }
