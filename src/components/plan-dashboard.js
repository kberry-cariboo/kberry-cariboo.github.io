  // Hoisted out of PlanView/DashboardView render bodies — inline component
  // definitions create a new type each render and force React to remount.
  // DASH_AXIS_TICK_X/Y are hoisted the same way: they were previously
  // recreated as new object literals on every DashboardView render at each
  // of its ~6 chart call sites.
  const DASH_AXIS_TICK_X = { fontFamily: "Inter", fontSize: 11, fill: "var(--textMid)" };
  const DASH_AXIS_TICK_Y = { fontFamily: "'IBM Plex Mono'", fontSize: 11, fill: "var(--textMid)" };
  const StratCard = ({ title, icon, sub, r, base }) => /* @__PURE__ */ React.createElement("div", { className: "strat-card" }, /* @__PURE__ */ React.createElement("div", { className: "strat-card-title" }, /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 14 }), title), /* @__PURE__ */ React.createElement("div", { className: "strat-card-sub" }, sub), /* @__PURE__ */ React.createElement("div", { className: "strat-card-row" }, /* @__PURE__ */ React.createElement("span", { className: "txm-11" }, "Debt-free"), /* @__PURE__ */ React.createElement("span", { className: "strat-value" }, r.debtFreeDate)), /* @__PURE__ */ React.createElement("div", { className: "strat-card-row" }, /* @__PURE__ */ React.createElement("span", { className: "txm-11" }, "Total interest"), /* @__PURE__ */ React.createElement("span", { className: "strat-value-neutral" }, fmt(r.totalInterest))), base && base.totalInterest > r.totalInterest && /* @__PURE__ */ React.createElement("div", { className: "strat-card-row-tight" }, /* @__PURE__ */ React.createElement("span", { className: "txm-11" }, "Interest saved"), /* @__PURE__ */ React.createElement("span", { className: "strat-value" }, fmt(base.totalInterest - r.totalInterest))), /* @__PURE__ */ React.createElement("div", { className: "strat-order" }, "Order: ", r.payoffOrder.map((n, i) => i + 1 + ". " + n).join("  →  ")));
  const GlanceTile = ({ title, children }) => /* @__PURE__ */ React.createElement("div", { className: "glance-tile" }, /* @__PURE__ */ React.createElement("div", { className: "glance-tile-title" }, title), children);
  // Projected balance trajectory for a debt payoff sparkline — same
  // amortization step (accrue interest, then apply payment capped at the
  // remaining balance) used by both PlanView's Debt Payoff Tracker and
  // DashboardView's Debt Snapshot widget.
  const projectPayoffBalances = (bal, rate, pmt, months) => {
    const r = rate / 100 / 12;
    const points = [bal];
    let b = bal;
    const steps = Math.min(months, 240);
    for (let i = 0; i < steps && b > 0; i++) {
      b = roundMoney(b + b * r - Math.min(pmt, b + b * r));
      points.push(Math.max(0, b));
    }
    return points;
  };
  function PlanView({ flow, openBal, entries = [], setEntries = () => {
  }, goals = [], setGoals = () => {
  }, categories = [], alertThreshold = DEFAULT_ALERT_THRESHOLD, activeYear = (/* @__PURE__ */ new Date()).getFullYear(), debtData = {}, setDebtData = () => {
  }, globalSearch = "", yearConfigs = [], setActiveYear = () => {
  }, setDeletedCopyIds = () => {
  } }) {
    const gq = (globalSearch || "").trim().toLowerCase();
    const activeGoals = goals.filter((g) => !g.archived);
    const archivedGoalsCount = goals.length - activeGoals.length;
    const goalsFiltered = gq ? activeGoals.filter((g) => (g.name || "").toLowerCase().includes(gq)) : activeGoals;
    const [debtExtra, setDebtExtra] = useLS("cf_debt_extra", "100");
    const [budgetCtx, setBudgetCtx] = useState(null);
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
      } else {
        const id = Date.now();
        let entryId = null;
        if (goalForm.linkEntry && monthly > 0) {
          entryId = id + 1;
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
            category: "Savings",
            notes: "Savings goal contribution"
          }]);
        }
        let payoutEntryId = null;
        if (goalForm.payoutEntry && goalForm.targetDate) {
          payoutEntryId = id + 2;
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
            category: "Savings",
            notes: "Planned goal spending"
          }]);
        }
        setGoals((prev) => [...prev, { id, name, target, saved, monthly, targetDate: goalForm.targetDate || "", entryId, payoutEntryId, createdAt: (/* @__PURE__ */ new Date()).toISOString() }]);
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
      setGoals((prev) => prev.map((g) => g.id === goal.id ? __spreadProps(__spreadValues({}, g), { archived: true }) : g));
      toast(`"${goal.name}" archived`);
    };
    const restoreArchivedGoals = () => {
      setGoals((prev) => prev.map((g) => g.archived ? __spreadProps(__spreadValues({}, g), { archived: false }) : g));
    };
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement(MobileYearBadge, { year: activeYear, years: yearConfigs.map((yc) => yc.year), onSelect: setActiveYear }), (() => {
      const openGoalForm = (g) => {
        setGoalForm(g ? __spreadProps(__spreadValues({}, g), { target: String(centsToDollars(g.target)), saved: String(centsToDollars(g.saved)), monthly: String(centsToDollars(g.monthly)) }) : { id: null, name: "", target: "", saved: "0", monthly: "", targetDate: "", linkEntry: true, payoutEntry: true });
        setGoalErrors({});
        setShowGoalForm(true);
      };
      return /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement("div", { className: "goal-header-row", style: { marginBottom: goals.length ? 14 : 0 } }, /* @__PURE__ */ React.createElement(SectionTitle, { className: "mb-0" }, "Savings Goals"), goals.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, archivedGoalsCount > 0 && /* @__PURE__ */ React.createElement(
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
          className: "cf-btn cf-btn--primary goal-add-btn"
        },
        "+ Add"
      ))), goals.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, /* @__PURE__ */ React.createElement(EmptyState, {
        icon: /* @__PURE__ */ React.createElement(Icon, { name: "target", size: 26, className: "c-textLt" }),
        message: "Save toward big expenses \u2014 property taxes, vacations, emergency fund.",
        actionLabel: "+ Add Goal",
        onAction: () => openGoalForm(null)
      })) : /* @__PURE__ */ React.createElement(React.Fragment, null, gq && /* @__PURE__ */ React.createElement("div", { className: "search-filter-banner mb-12" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering goals by "', globalSearch, '" \u2014 ', goalsFiltered.length, " match", goalsFiltered.length !== 1 ? "es" : ""), goalsFiltered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, gq ? "No goals match your search." : "All goals are archived.") : /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, goalsFiltered.map((g) => {
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
        const barColor = remaining <= 0 ? "var(--greenDk)" : onTrack === false ? "var(--amber)" : "var(--text)";
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
          /* @__PURE__ */ React.createElement("div", { className: "goal-title-row" }, /* @__PURE__ */ React.createElement("span", { className: "tx-sb" }, g.name, g.targetDate && /* @__PURE__ */ React.createElement("span", { className: "goal-target-date" }, "by ", (() => {
            const t = /* @__PURE__ */ new Date(g.targetDate + "T00:00:00");
            return MONTHS[t.getMonth()] + " " + t.getFullYear();
          })())), /* @__PURE__ */ React.createElement("div", { className: "goal-amounts-row" }, /* @__PURE__ */ React.createElement("span", { className: "goal-amounts-text" }, fmt(g.saved), " ", /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, "of"), " ", fmt(g.target), /* @__PURE__ */ React.createElement("span", { className: "goal-pct", style: { color: barColor } }, pct, "%")), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: (e) => {
                e.stopPropagation();
                setGoalCtx({ x: e.clientX, y: e.clientY, goal: g });
              },
              "aria-label": `${g.name} actions`,
              className: "goal-menu-btn"
            },
            "⋮"
          ))),
          /* @__PURE__ */ React.createElement("div", { className: "progress-track-8" }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: pct + "%", borderRadius: 4, background: barColor, transition: "width 0.3s ease" } })),
          /* @__PURE__ */ React.createElement("div", { className: "goal-footer-row" }, /* @__PURE__ */ React.createElement("span", null, g.monthly > 0 ? fmt(g.monthly) + "/mo" : "No monthly funding set"), projLabel && /* @__PURE__ */ React.createElement("span", { style: { color: remaining <= 0 ? "var(--greenDk)" : onTrack === false ? "var(--amber)" : "var(--textLt)", fontWeight: onTrack === false || remaining <= 0 ? 700 : 400 } }, remaining <= 0 ? "\u2713 Funded" : onTrack === false ? neededMonthly ? `\u26A0 Need ${fmt(neededMonthly)}/mo by target` : "\u26A0 Projected " + projLabel : "On track \u2014 " + projLabel))
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
          "aria-label": "Goal form",
          onClick: (e) => {
            if (e.target === e.currentTarget) setShowGoalForm(false);
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "modal-card goalform-modal-card",
            onClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg" }, goalForm.id ? "Edit Goal" : "Add Goal"),
          (() => {
            const lblCls = "field-label";
            const inpCls = (err) => "field-input" + (err ? " field-error" : "");
            const errTxt = (k) => goalErrors[k] && /* @__PURE__ */ React.createElement("div", { className: "field-error-text" }, goalErrors[k]);
            return /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "goal-name" }, "Goal name", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
              "input",
              {
                id: "goal-name",
                autoFocus: true,
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
            ), "Add monthly contribution to my budget as a recurring entry"), /* @__PURE__ */ React.createElement("label", { className: "goal-checkbox-label" }, /* @__PURE__ */ React.createElement(
              "input",
              {
                type: "checkbox",
                checked: goalForm.payoutEntry,
                onChange: (e) => setGoalForm((f) => __spreadProps(__spreadValues({}, f), { payoutEntry: e.target.checked })),
                className: "checkbox-16"
              }
            ), "Add the payout as a one-time expense on the target date (models the spending in your forecast)")));
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
          "aria-label": "Add funds",
          onClick: (e) => {
            if (e.target === e.currentTarget) setShowFundForm(false);
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "modal-card modal-card-360",
            onClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement("div", { className: "fundform-title" }, "Add funds"),
          /* @__PURE__ */ React.createElement("div", { className: "fundform-subtitle" }, fundForm.goal.name),
          /* @__PURE__ */ React.createElement(
            MoneyInput,
            {
              autoFocus: true,
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
      const toMonthlyFromEvs = (evs) => {
        if (!evs || !evs.length) return 0;
        const annual = evs.reduce((s, ev) => s + (ev.amount || 0), 0);
        return roundMoney(annual / 12);
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
            const u = ev.recurUnit || "month";
            const e = ev.recurEvery || 1;
            if (u === "semimonth") return `2\xD7/mo`;
            if (u === "week" && e === 2) return "Bi-weekly";
            if (u === "week") return `Every ${e} wk`;
            if (u === "month") return e === 1 ? "Monthly" : `Every ${e} mo`;
            if (u === "year") return "Yearly";
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
      const calcPayoff = (bal, rate, pmt) => {
        if (!bal || !pmt) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        const r = rate / 100 / 12;
        if (r > 0 && pmt <= bal * r) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        const m = r > 0 ? Math.ceil(Math.log(pmt / (pmt - bal * r)) / Math.log(1 + r)) : Math.ceil(bal / pmt);
        const interest = r > 0 ? roundMoney((pmt * m - bal)) : null;
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
        } else {
          const id = "manual_" + Date.now();
          setDebtData((p) => __spreadProps(__spreadValues({}, p), { [id]: formVals }));
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
      return /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
        const simDebts = allRows.map((row) => {
          var _a, _b;
          return {
            label: row.label,
            bal: parseFloat((_a = debtData[row.key]) == null ? void 0 : _a.balance) || 0,
            rate: parseFloat((_b = debtData[row.key]) == null ? void 0 : _b.rate) || 0,
            pmt: row.monthlyPmt
          };
        }).filter((d) => d.bal > 0 && d.pmt > 0);
        if (simDebts.length < 1) return null;
        // debtExtra is entered/displayed in dollars; simDebts' bal/pmt are
        // cents, so this needs the same conversion before it's mixed in.
        const extra = dollarsToCents(Math.max(0, parseFloat(debtExtra) || 0));
        const av = simulateDebtStrategy(simDebts, extra, "avalanche");
        const sn = simulateDebtStrategy(simDebts, extra, "snowball");
        const base = simulateDebtStrategy(simDebts, 0, "avalanche");
        if (!av || !sn) return /* @__PURE__ */ React.createElement(Card, { className: "mt-16" }, /* @__PURE__ */ React.createElement("div", { className: "strat-error" }, "\u26A0 Payments don't cover interest on at least one debt \u2014 payoff never completes. Increase payments to see strategies."));
        return /* @__PURE__ */ React.createElement(Card, { className: "mt-16" }, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement("label", { className: "strat-extra-label" }, "Extra $/month", /* @__PURE__ */ React.createElement(
          MoneyInput,
          {
            value: debtExtra,
            onChange: (v) => setDebtExtra(v),
            className: "strat-extra-input cf-text-mono-13"
          }
        )) }, "Payoff Strategy"), /* @__PURE__ */ React.createElement("div", { className: "strat-cards-row" }, /* @__PURE__ */ React.createElement(StratCard, { title: "Avalanche", icon: "mountain", sub: "Highest interest rate first \u2014 mathematically optimal", r: av, base }), /* @__PURE__ */ React.createElement(StratCard, { title: "Snowball", icon: "snowflake", sub: "Smallest balance first \u2014 quick wins for motivation", r: sn, base })), /* @__PURE__ */ React.createElement("div", { className: "strat-footnote" }, "Includes debts with a balance and payment entered. Freed-up payments roll into the next debt automatically."));
      })(), debtCtx && /* @__PURE__ */ React.createElement(
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
      ), showDebtForm && /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-overlay",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Debt form",
          onClick: (e) => {
            if (e.target === e.currentTarget) setShowDebtForm(false);
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "modal-card oem-card" }, /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg" }, debtFormData.editKey ? "Edit Debt" : "Add Debt"), /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "debt-desc" }, "Description", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "debt-desc",
            autoFocus: true,
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
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "debt-payment" }, "Monthly Payment $ ", /* @__PURE__ */ React.createElement("span", { className: "debtform-optional" }, "(optional)")), /* @__PURE__ */ React.createElement(
          MoneyInput,
          {
            id: "debt-payment",
            placeholder: "e.g. 500",
            value: debtFormData.payment,
            className: "field-input",
            onChange: (v) => setDebtFormData((p) => __spreadProps(__spreadValues({}, p), { payment: v }))
          }
        ), /* @__PURE__ */ React.createElement("div", { className: "debtform-hint" }, "Leave blank for auto-detected debts from your budget entries."), (() => {
          // Auto-detection only catches a payment whose description/category
          // happens to contain a debt-ish keyword (loan, mortgage, visa…) —
          // anything else (e.g. "Costco Mastercard") is silently missed. This
          // lets a user fill the payment from any recurring expense directly,
          // without depending on that guess.
          const recurExpenses = entries.filter((e) => e.type === "expense" && e.repeats).sort((a, b) => (a.desc || "").localeCompare(b.desc || ""));
          if (!recurExpenses.length) return null;
          const entryToMonthly = (e) => {
            const every = e.recurEvery || 1;
            const ppy = { day: 365 / every, week: 52 / every, month: 12 / every, year: 1 / every, semimonth: 24 / every }[e.recurUnit || "month"] ?? 12;
            return roundMoney((e.amount || 0) * (ppy / 12));
          };
          return /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("div", { className: "debtform-hint mb-6" }, "Or autofill from a recurring expense:"), /* @__PURE__ */ React.createElement(
            "select",
            {
              "aria-label": "Autofill payment from a recurring expense",
              value: "",
              className: "field-input",
              onChange: (e) => {
                const ent = recurExpenses.find((x) => String(x.id) === e.target.value);
                if (ent) setDebtFormData((p) => __spreadProps(__spreadValues({}, p), { payment: String(centsToDollars(entryToMonthly(ent))) }));
              }
            },
            /* @__PURE__ */ React.createElement("option", { value: "" }, "— choose an entry —"),
            recurExpenses.map((e) => /* @__PURE__ */ React.createElement("option", { key: e.id, value: e.id }, e.desc, " (", fmt(entryToMonthly(e)), "/mo)"))
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
      ), /* @__PURE__ */ React.createElement(Card, { className: "mb-20 mt-16" }, /* @__PURE__ */ React.createElement("div", { className: "goal-header-row", style: {
        marginBottom: 12
      } }, /* @__PURE__ */ React.createElement(SectionTitle, { className: "mb-0" }, "Debt Payoff Tracker")), allRows.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "kpi-grid mt-16" }, /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Balance", value: fmt(debtKpiTotals.balance), color: "var(--red)" }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Monthly Payment", value: fmt(debtKpiTotals.payment) }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Interest Remaining", value: fmt(debtKpiTotals.interest) }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Debt-Free By", value: debtKpiTotals.latestPayoff || "\u2014", color: debtKpiTotals.latestPayoff ? "var(--greenDk)" : void 0 })), allRows.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "budget-toolbar-row budget-toolbar-row--end" }, /* @__PURE__ */ React.createElement(
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
          className: "cf-btn cf-btn--primary goal-add-btn"
        },
        "+ Add"
      )), allRows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, /* @__PURE__ */ React.createElement(EmptyState, {
        icon: /* @__PURE__ */ React.createElement(Icon, { name: "credit-card", size: 26, className: "c-textLt" }),
        message: "No debt entries detected \u2014 debts matching your budget entries show up here automatically, or add one manually.",
        actionLabel: "+ Add Debt",
        onAction: addManualRow
      })) : /* @__PURE__ */ React.createElement(React.Fragment, null, gq && /* @__PURE__ */ React.createElement("div", { className: "search-filter-banner mb-10" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering debts by "', globalSearch, '" \u2014 ', allRowsFiltered.length, " match", allRowsFiltered.length !== 1 ? "es" : ""), allRowsFiltered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "goal-empty-wrap" }, "No debts match your search.") : /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-10" }, allRowsFiltered.map(({ key, label, monthlyPmt, isAuto, perOccurrence, recurDesc, timesPerYear }) => {
        var _a, _b, _c, _d;
        const bal = parseFloat((_a = debtData[key]) == null ? void 0 : _a.balance) || 0;
        const rate = parseFloat((_b = debtData[key]) == null ? void 0 : _b.rate) || 0;
        const pmt = isAuto ? monthlyPmt : parseFloat((_c = debtData[key]) == null ? void 0 : _c.payment) || 0;
        const { monthsLeft, totalInterest, payoffDate } = calcPayoff(bal, rate, pmt);
        const payoffTrend = monthsLeft > 1 ? projectPayoffBalances(bal, rate, pmt, monthsLeft) : null;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key,
            onContextMenu: (e) => {
              e.preventDefault();
              setDebtCtx({ x: e.clientX, y: e.clientY, key, label, isAuto });
            },
            className: "debt-row"
          },
          /* @__PURE__ */ React.createElement("div", { className: "debt-row-top" }, /* @__PURE__ */ React.createElement("div", { className: "debt-row-name-col" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "tx-sb" }, label), payoffDate && /* @__PURE__ */ React.createElement("span", { className: "debt-row-paid" }, "\u2713 Paid off ", payoffDate)), /* @__PURE__ */ React.createElement("div", { className: "debt-row-meta" }, isAuto && recurDesc ? timesPerYear > 12 && /* @__PURE__ */ React.createElement("span", null, fmt(perOccurrence), " ", recurDesc) : isAuto && /* @__PURE__ */ React.createElement("span", null, fmt(pmt), "/mo (from budget)"))), bal > 0 && /* @__PURE__ */ React.createElement("div", { className: "debt-row-bal-wrap" }, payoffTrend && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 2 }, title: "Projected balance decline to payoff" }, /* @__PURE__ */ React.createElement(Sparkline, { data: payoffTrend, color: "var(--red)", height: 22, width: 56 })), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 debt-row-bal-amt" }, fmt(bal)), totalInterest != null && /* @__PURE__ */ React.createElement("div", { className: "debt-row-interest" }, "+", fmt(totalInterest), " interest"))),
          (bal > 0 || rate > 0 || isAuto && recurDesc) && /* @__PURE__ */ React.createElement("div", { className: "debt-stats-row" }, isAuto && recurDesc && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "debt-stat-label" }, "Monthly"), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 c-text" }, fmt(pmt))), bal > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "debt-stat-label" }, "Balance"), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 c-text" }, fmt(bal))), rate > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "debt-stat-label" }, "Rate"), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 c-text" }, rate, "%")), !isAuto && ((_d = debtData[key]) == null ? void 0 : _d.payment) && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "debt-stat-label" }, "Payment"), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 c-text" }, fmt(parseFloat(debtData[key].payment)), "/mo")))
        );
      })))));
    })());
  }
  function DashboardView({ flow, openBal, yearFlows, yearConfigs, alertThreshold, activeYear, budgetTargets = {}, categories = [], categoryColors = {}, users = [], sessionUser = null, entries = [], toggleComplete = () => {
  }, setYearConfigs = () => {
  }, addEntry = () => {
  }, setTab = () => {
  }, setEntries = () => {
  }, completed = {}, dashHidden = {}, setDashHidden = () => {
  }, dashOrder = [], setDashOrder = () => {
  }, debtData = {} }) {
    var _a;
    const isMobile = useIsMobile();
    const isPhone = useIsPhone();
    const [showCustomize, setShowCustomize] = useState(false);
    const [obDraft, setObDraft] = useState("");
    useEffect(() => {
      if (dashHidden.charts || dashHidden.incomeRow) {
        setDashHidden((prev) => {
          const next = __spreadValues({}, prev);
          if (next.charts) {
            next.balanceChart = 1;
            next.surplusChart = 1;
            next.incExpChart = 1;
            next.topCatsChart = 1;
            delete next.charts;
          }
          if (next.incomeRow) {
            next.incomeSources = 1;
            next.bvaYear = 1;
            delete next.incomeRow;
          }
          return next;
        });
      }
    }, []);
    const DASH_CHART_H = 220;
    const [yoyMetric, setYoyMetric] = useState("surplus");
    const [catView, setCatView] = useState("bar");
    const [balView, setBalView] = useState("area");
    const [surplusView, setSurplusView] = useState("bar");
    const [incExpView, setIncExpView] = useState("grouped");
    const [summaryView, setSummaryView] = useState("table");
    const [incView, setIncView] = useState("bar");
    const [sharedView, setSharedView] = useState(false);
    const effectiveFlow = useMemo(() => {
      if (sharedView || !sessionUser) return flow;
      return flow.filter((e) => !e.userId || e.userId === sessionUser.id);
    }, [flow, sharedView, sessionUser]);
    const summaries = useMemo(() => getMonthSummaries(effectiveFlow, openBal), [effectiveFlow, openBal]);
    const catTotals = useMemo(() => {
      const map = {};
      effectiveFlow.filter((e) => e.type === "expense").forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [effectiveFlow]);
    // Income groups by entry description, not category — most income shares one
    // "Income" category, which collapsed this widget into a single useless bar.
    const incTotals = useMemo(() => {
      const map = {};
      effectiveFlow.filter((e) => e.type === "income").forEach((e) => {
        const key = e.desc || e.category || "Income";
        map[key] = (map[key] || 0) + e.amount;
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [effectiveFlow]);
    const catPieData = useMemo(() => catTotals.map(([name, value]) => ({ name, value })), [catTotals]);
    const incPieData = useMemo(() => incTotals.map(([name, value]) => ({ name, value })), [incTotals]);
    const savingsRate = useMemo(() => summaries.map((m) => ({
      month: m.month,
      rate: m.income > 0 ? Math.round((m.income - m.expense) / m.income * 100) : 0,
      surplus: m.surplus,
      income: m.income
    })), [summaries]);
    const totalIncome = summaries.reduce((s, m) => s + m.income, 0);
    const totalExpense = summaries.reduce((s, m) => s + m.expense, 0);
    const netSurplus = totalIncome - totalExpense;
    const lowestBal = summaries.length ? Math.min(...summaries.map((m) => m.close)) : 0;
    const lowestMon = (_a = summaries.find((m) => m.close === lowestBal)) == null ? void 0 : _a.month;
    const showYoY = yearConfigs.length >= 2;
    const yoyMetrics = [{ id: "income", label: "Income" }, { id: "expense", label: "Expenses" }, { id: "surplus", label: "Surplus" }, { id: "close", label: "Balance" }];
    const YCOLS = ["#2F5496", "#E85D4A", "#27AE73", "#F5A623"];
    const yoyData = MONTHS.map((m, mi) => {
      const row = { month: m };
      yearConfigs.forEach((yc, yi) => {
        const f = yearFlows[yc.year];
        if (!f) return;
        const sums = getMonthSummaries(f, yc.openingBalance);
        row[yc.year] = sums[mi][yoyMetric];
      });
      return row;
    });
    const annualRows = yearConfigs.map((yc, yi) => {
      const f = yearFlows[yc.year];
      if (!f) return null;
      const sums = getMonthSummaries(f, yc.openingBalance);
      const inc = sums.reduce((s, m) => s + m.income, 0), exp = sums.reduce((s, m) => s + m.expense, 0);
      return { year: yc.year, income: inc, expense: exp, surplus: inc - exp, close: sums[11].close, color: YCOLS[yi % YCOLS.length] };
    }).filter(Boolean);
    const glance = useMemo(() => {
      try {
        const now = /* @__PURE__ */ new Date();
        const isCurrentYear = now.getFullYear() === activeYear;
        const todayM = isCurrentYear ? now.getMonth() : 0, todayD = isCurrentYear ? now.getDate() : 1;
        const balanceNow = getCurrentBalance(flow, openBal, activeYear);
        const future = flow.filter((ev) => ev.month > todayM || ev.month === todayM && ev.day >= todayD);
        let low = null;
        const end = new Date(activeYear, todayM, todayD);
        end.setDate(end.getDate() + 60);
        future.forEach((ev) => {
          const d = new Date(activeYear, ev.month, ev.day);
          if (d > end) return;
          if (low === null || ev.balance < low.balance) low = { balance: ev.balance, month: ev.month, day: ev.day, date: d };
        });
        const daysToLow = low ? Math.max(0, Math.round((low.date - new Date(activeYear, todayM, todayD)) / 864e5)) : null;
        const due = flow.filter((ev) => ev.type === "expense" && ev.month === todayM && ev.day >= todayD && !completed[ev.id]).reduce((s, ev) => s + ev.amount, 0);
        const dueCount = flow.filter((ev) => ev.type === "expense" && ev.month === todayM && ev.day >= todayD && !completed[ev.id]).length;
        return { balanceNow, low, daysToLow, due: roundMoney(due), dueCount, month: MONTHS[todayM] };
      } catch (err) {
        console.error("dashboard glance computation failed, hiding Balance/Due/Low-point tiles", err);
        return null;
      }
    }, [flow, openBal, activeYear, completed]);
    const DASH_WIDGET_DEFS = [
      { id: "balanceToday", label: "Balance today", size: "third" },
      { id: "nextLow", label: "Next low point", size: "third" },
      { id: "dueMonth", label: "Due rest of month", size: "third" },
      { id: "endingSoon", label: "Ending-soon chips", size: "full" },
      { id: "upcoming", label: "Upcoming this week", size: "full" },
      { id: "kpis", label: "KPI tiles", size: "full" },
      { id: "insight", label: "Spending insight", size: "full" },
      { id: "balanceChart", label: "Balance chart", size: "half" },
      { id: "surplusChart", label: "Monthly surplus chart", size: "half" },
      { id: "incExpChart", label: "Income vs Expenses chart", size: "wide" },
      { id: "topCatsChart", label: "Top expense categories", size: "narrow" },
      { id: "incomeSources", label: "Income sources", size: "half" },
      { id: "bvaYear", label: "Budget vs Actual (year)", size: "half" },
      { id: "debtSnap", label: "Debt snapshot", size: "full" },
      { id: "summary", label: "Monthly summary table", size: "full" },
      { id: "yoy", label: "Year-over-Year comparison", size: "full" }
    ];
    const DASH_ORDER_DEFAULT = DASH_WIDGET_DEFS.map((w) => w.id);
    const dashOrderEff = useMemo(() => {
      const stored = Array.isArray(dashOrder) ? dashOrder.filter((id) => DASH_ORDER_DEFAULT.includes(id)) : [];
      const merged = [...stored];
      DASH_ORDER_DEFAULT.forEach((id, defIdx) => {
        if (!merged.includes(id)) merged.splice(Math.min(defIdx, merged.length), 0, id);
      });
      return merged;
    }, [dashOrder]);
    const insight = useMemo(() => {
      try {
        const now = /* @__PURE__ */ new Date();
        if (now.getFullYear() !== activeYear) return null;
        const cm = now.getMonth();
        if (cm === 0) return null;
        const lookback = [];
        for (let i = Math.max(0, cm - 6); i < cm; i++) lookback.push(i);
        const monthExp = (mi) => flow.filter((ev) => ev.month === mi && ev.type === "expense").reduce((s, ev) => s + ev.amount, 0);
        const avg = lookback.reduce((s, mi) => s + monthExp(mi), 0) / lookback.length;
        if (!avg) return null;
        const curr = monthExp(cm);
        const pct = Math.round((curr - avg) / avg * 100);
        const catMonth = (mi) => {
          const o = {};
          flow.forEach((ev) => {
            if (ev.month === mi && ev.type === "expense") o[ev.category] = (o[ev.category] || 0) + ev.amount;
          });
          return o;
        };
        const currCats = catMonth(cm);
        const avgCats = {};
        lookback.forEach((mi) => {
          const o = catMonth(mi);
          Object.keys(o).forEach((c) => avgCats[c] = (avgCats[c] || 0) + o[c]);
        });
        Object.keys(avgCats).forEach((c) => avgCats[c] /= lookback.length);
        let driver = null, driverDelta = 0;
        (/* @__PURE__ */ new Set([...Object.keys(currCats), ...Object.keys(avgCats)])).forEach((c) => {
          const d = (currCats[c] || 0) - (avgCats[c] || 0);
          if (Math.abs(d) > Math.abs(driverDelta)) {
            driver = c;
            driverDelta = d;
          }
        });
        return { month: MONTHS[cm], pct, driver, driverDelta, n: lookback.length };
      } catch (e) {
        console.error("dashboard spending-insight computation failed, hiding the Spending Insight card", e);
        return null;
      }
    }, [flow, activeYear]);
    const WIDGET_RENDER = {
      balanceToday: () => /* @__PURE__ */ React.createElement(GlanceTile, { title: "Balance today" }, /* @__PURE__ */ React.createElement("div", { className: "glance-value", style: {
        color: !glance ? "var(--textLt)" : glance.balanceNow < 0 ? "var(--red)" : glance.balanceNow < alertThreshold ? "var(--amber)" : "var(--greenDk)"
      } }, glance ? fmt(glance.balanceNow) : "\u2014")),
      nextLow: () => /* @__PURE__ */ React.createElement(GlanceTile, { title: "Next low point" }, glance && glance.low ? /* @__PURE__ */ React.createElement("div", { className: "glance-value", style: {
        color: glance.low.balance < 0 ? "var(--red)" : glance.low.balance < alertThreshold ? "var(--amber)" : "var(--greenDk)"
      } }, fmt(glance.low.balance), /* @__PURE__ */ React.createElement("span", { className: "glance-value-sub" }, glance.daysToLow === 0 ? "today" : `in ${glance.daysToLow}d`)) : /* @__PURE__ */ React.createElement("div", { className: "txl" }, "\u2014")),
      dueMonth: () => /* @__PURE__ */ React.createElement(GlanceTile, { title: "Due rest of " + (glance ? glance.month : "month") }, glance ? /* @__PURE__ */ React.createElement("div", { className: "glance-value c-text" }, fmt(glance.due), /* @__PURE__ */ React.createElement("span", { className: "glance-value-sub" }, glance.dueCount, " item", glance.dueCount !== 1 ? "s" : "")) : /* @__PURE__ */ React.createElement("div", { className: "txl" }, "\u2014")),
      endingSoon: () => /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
        const today = startOfToday();
        const horizon = new Date(today);
        horizon.setDate(horizon.getDate() + 60);
        const ending = entries.filter((e) => {
          if (!e.repeats || !e.recurEnd) return false;
          const d = /* @__PURE__ */ new Date(e.recurEnd + "T00:00:00");
          return d >= today && d <= horizon;
        }).map((e) => {
          const evs = flow.filter((ev) => ev.entryId === e.id);
          const monthly = evs.length ? roundMoney(evs.reduce((s, ev) => s + (ev.amount || 0), 0) / 12) : e.amount;
          const d = /* @__PURE__ */ new Date(e.recurEnd + "T00:00:00");
          return __spreadProps(__spreadValues({}, e), { monthly, endLabel: MONTHS[d.getMonth()] + " " + d.getDate() });
        }).sort((a, b) => a.recurEnd.localeCompare(b.recurEnd)).slice(0, 4);
        if (!ending.length) return null;
        return /* @__PURE__ */ React.createElement("div", { className: "ending-soon-row" }, ending.map((e) => /* @__PURE__ */ React.createElement("div", { key: e.id, className: "ending-soon-chip", style: {
          background: e.type === "expense" ? "var(--greenLt)" : "var(--amberLt)",
          border: `1px solid ${e.type === "expense" ? "var(--greenDk)" : "var(--amber)"}33`
        } }, /* @__PURE__ */ React.createElement("span", { style: { color: e.type === "expense" ? "var(--greenDk)" : "var(--amber)", display: "inline-flex" } }, e.type === "expense" ? /* @__PURE__ */ React.createElement(Icon, { name: "party", size: 15 }) : /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 15 })), /* @__PURE__ */ React.createElement("span", { className: "c-text" }, /* @__PURE__ */ React.createElement("strong", null, e.desc), " ends ", e.endLabel, e.monthly > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: e.type === "expense" ? "var(--greenDk)" : "var(--amber)", fontWeight: 700 } }, e.type === "expense" ? " \u2014 frees " : " \u2014 reduces income ", fmt(e.monthly), "/mo")))));
      })()),
      upcoming: () => /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
        const today = startOfToday();
        const in7 = new Date(today);
        in7.setDate(today.getDate() + 7);
        const upcoming = flow.filter((ev) => ev.date >= today && ev.date <= in7 && !completed[ev.id]).sort((a, b) => a.date - b.date).slice(0, 6);
        if (upcoming.length === 0) return null;
        return /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "upcoming-header-row" }, /* @__PURE__ */ React.createElement("span", { className: "upcoming-hdr-label" }, "Upcoming \u2014 Next 7 Days"), /* @__PURE__ */ React.createElement("span", { className: "upcoming-count" }, upcoming.length, " event", upcoming.length !== 1 ? "s" : "")), /* @__PURE__ */ React.createElement("div", { className: "upcoming-list" }, upcoming.map((ev) => {
          const d = ev.date;
          const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const isInc = ev.type === "income";
          const isPaid = !!completed[ev.id];
          const balColor = ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amber)" : "var(--text)";
          const amtColor = isPaid ? "var(--textLt)" : isInc ? "var(--greenDk)" : "var(--text)";
          const barDiv = null;
          const paidBtn = /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: () => toggleComplete(ev.id),
              title: isPaid ? "Mark as not paid" : "Mark as paid",
              "aria-label": (isPaid ? "Mark as not paid: " : "Mark as paid: ") + ev.desc,
              "aria-pressed": isPaid,
              className: "cf-checkbtn paid-btn",
              style: {
                border: isPaid ? "1.5px solid var(--greenDk)" : "1.5px solid var(--border)",
                background: isPaid ? "var(--greenLt)" : "transparent"
              }
            },
            isPaid ? "\u2713" : ""
          );
          if (isMobile) {
            return /* @__PURE__ */ React.createElement("div", { key: ev.id, className: "upcoming-item-mobile", style: { opacity: isPaid ? 0.6 : 1 } }, /* @__PURE__ */ React.createElement("div", { className: "upcoming-mobile-top" }, paidBtn, /* @__PURE__ */ React.createElement("span", { className: "upcoming-mobile-desc", style: {
              textDecoration: isPaid ? "line-through" : "none"
            } }, ev.desc),/* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, style: { fontSize: 9, flexShrink: 0 } })), /* @__PURE__ */ React.createElement("div", { className: "upcoming-mobile-bottom" }, /* @__PURE__ */ React.createElement("span", { className: "upcoming-mobile-date" }, label), /* @__PURE__ */ React.createElement("span", { className: "upcoming-mobile-amts" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: { color: amtColor } }, isInc ? "+" : "-", fmt(ev.amount)), !isPhone && /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: { color: balColor } }, fmt(ev.balance)))), barDiv);
          }
          return /* @__PURE__ */ React.createElement("div", { key: ev.id, style: { opacity: isPaid ? 0.6 : 1 } }, /* @__PURE__ */ React.createElement("div", { className: "upcoming-desktop-row" }, /* @__PURE__ */ React.createElement("div", { className: "upcoming-desktop-left" }, paidBtn, /* @__PURE__ */ React.createElement("span", { className: "upcoming-desktop-date" }, label), /* @__PURE__ */ React.createElement("span", { className: "upcoming-desktop-desc", style: {
            textDecoration: isPaid ? "line-through" : "none"
          } }, ev.desc),/* @__PURE__ */ React.createElement(CatChip, { category: ev.category, className: "text-9" })), /* @__PURE__ */ React.createElement("div", { className: "upcoming-desktop-amts" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
            color: amtColor
          } }, isInc ? "+" : "-", fmt(ev.amount)), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
            color: balColor
          } }, fmt(ev.balance)))), barDiv);
        })));
      })()),
      insight: () => {
        if (!insight) return null;
        const above = insight.pct > 0;
        const inline = Math.abs(insight.pct) < 2;
        const showDriver = !inline && insight.driver && (above ? insight.driverDelta > 0 : insight.driverDelta < 0);
        return /* @__PURE__ */ React.createElement("div", { "data-widget": "insight", className: "insight-banner", style: {
          borderLeft: "3px solid " + (inline ? "var(--border)" : above ? "var(--amber)" : "var(--greenDk)")
        } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "c-text" }, insight.month, " spending"), inline ? ` is in line with your ${insight.n}-month average.` : ` is ${Math.abs(insight.pct)}% ${above ? "above" : "below"} your ${insight.n}-month average`, !inline && showDriver ? ` — ${above ? "driven by" : "biggest drop:"} ${insight.driver} (${insight.driverDelta > 0 ? "+" : "-"}${fmt(Math.abs(insight.driverDelta))}).` : inline ? "" : "."));
      },
      kpis: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kpi-grid-4" }, /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Annual Income"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: "var(--greenDk)" } }, fmt(totalIncome)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.income), height: 28, width: 64 }))), /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Annual Expenses"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: "var(--text)" } }, fmt(totalExpense)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.expense), height: 28, width: 64 }))), /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Net Surplus/Deficit"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: netSurplus >= 0 ? "var(--greenDk)" : "var(--red)" } }, fmt(netSurplus, true)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.surplus), height: 28, width: 64 })), netSurplus < 0 && /* @__PURE__ */ React.createElement("div", { className: "kpi-warn-note" }, "\u26A0 Spending exceeds income")), /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Lowest Balance"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: lowestBal < 0 ? "var(--red)" : lowestBal < alertThreshold ? "var(--amber)" : "var(--greenDk)" } }, fmt(lowestBal)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.close), height: 28, width: 64 })), /* @__PURE__ */ React.createElement("div", { className: "kpi-sub-note" }, "In ", lowestMon)))),
      balanceChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(
        ChartToggle,
        {
          value: balView,
          onChange: setBalView,
          options: [{ id: "area", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-area", size: 15 }), label: "Area" }, { id: "line", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-line", size: 15 }), label: "Line" }, { id: "bar", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-bar", size: 15 }), label: "Bar" }]
        }
      ) }, "Running Balance"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, balView === "bar" ? /* @__PURE__ */ React.createElement(BarChart, { data: summaries, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--red)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(Bar, { dataKey: "close", name: "Balance", radius: [4, 4, 0, 0] }, summaries.map((m, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: m.close < 0 ? "var(--red)" : m.close < alertThreshold ? "var(--amber)" : "var(--text)" })))) : balView === "line" ? /* @__PURE__ */ React.createElement(LineChart, { data: summaries, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--red)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "close", name: "Balance", stroke: "var(--text)", strokeWidth: 2.5, dot: { r: 4, fill: "var(--text)" }, activeDot: { r: 6 } })) : /* @__PURE__ */ React.createElement(AreaChart, { data: summaries, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--red)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(Area, { type: "monotone", dataKey: "close", name: "Balance", stroke: "var(--text)", strokeWidth: 2.5, fill: "var(--text)", fillOpacity: 0.12, dot: { r: 4, fill: "var(--text)" } })))))),
      surplusChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(
        ChartToggle,
        {
          value: surplusView,
          onChange: setSurplusView,
          options: [{ id: "bar", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-bar", size: 15 }), label: "Bar" }, { id: "line", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-line", size: 15 }), label: "Line" }]
        }
      ) }, "Surplus / Shortfall"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, surplusView === "line" ? /* @__PURE__ */ React.createElement(LineChart, { data: summaries, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--textLt)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(
        Line,
        {
          type: "monotone",
          dataKey: "surplus",
          name: "Surplus",
          stroke: "var(--greenDk)",
          strokeWidth: 2.5,
          dot: ({ cx, cy, payload }) => /* @__PURE__ */ React.createElement("circle", { key: cx, cx, cy, r: 4, fill: payload.surplus >= 0 ? "var(--greenDk)" : "var(--red)", stroke: "none" }),
          activeDot: { r: 6 }
        }
      )) : /* @__PURE__ */ React.createElement(BarChart, { data: summaries, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--textLt)" }), /* @__PURE__ */ React.createElement(Bar, { dataKey: "surplus", name: "Surplus", radius: [4, 4, 0, 0] }, summaries.map((m, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)" })))))))),
      incExpChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(
        ChartToggle,
        {
          value: incExpView,
          onChange: setIncExpView,
          options: [{ id: "grouped", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-grouped", size: 15 }), label: "Grouped" }, { id: "stacked", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-stacked", size: 15 }), label: "Stacked" }, { id: "line", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-line", size: 15 }), label: "Line" }]
        }
      ) }, "Income vs Expenses"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, incExpView === "line" ? /* @__PURE__ */ React.createElement(LineChart, { data: summaries, margin: { top: 4, right: 4, bottom: 34, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "income", name: "Income", stroke: "var(--greenDk)", strokeWidth: 2.5, dot: { r: 3 }, activeDot: { r: 5 }, endLabel: true }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "expense", name: "Expenses", stroke: "var(--red)", strokeWidth: 2.5, dot: { r: 3 }, activeDot: { r: 5 }, strokeDasharray: "6 4", endLabel: true })) : /* @__PURE__ */ React.createElement(
        BarChart,
        {
          data: summaries,
          margin: { top: 4, right: 4, bottom: 34, left: 4 },
          barCategoryGap: incExpView === "stacked" ? "20%" : "10%"
        },
        /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }),
        /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }),
        /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }),
        /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }),
        /* @__PURE__ */ React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }),
        /* @__PURE__ */ React.createElement(Bar, { dataKey: "income", name: "Income", fill: "var(--greenDk)", radius: incExpView === "stacked" ? [0, 0, 0, 0] : [3, 3, 0, 0], stackId: incExpView === "stacked" ? "a" : void 0 }),
        /* @__PURE__ */ React.createElement(Bar, { dataKey: "expense", name: "Expenses", fill: "var(--red)", radius: [3, 3, 0, 0], stackId: incExpView === "stacked" ? "a" : void 0 })
      ))))),
      topCatsChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(ChartToggle, { options: [{ id: "bar", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-bar", size: 15 }), label: "Bars" }, { id: "pie", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-pie", size: 15 }), label: "Pie" }], value: catView, onChange: setCatView }) }, "Top Expense Categories"), catView === "bar" && /* @__PURE__ */ React.createElement("div", { className: "dash-cat-bar-wrap" }, catTotals.map(([cat, total], i) => {
        const pct = total / totalExpense * 100;
        return /* @__PURE__ */ React.createElement("div", { key: cat }, /* @__PURE__ */ React.createElement("div", { className: "label-amt-row" }, /* @__PURE__ */ React.createElement("span", { className: "tx" }, cat), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 amt-mid-600" }, fmt(total))), /* @__PURE__ */ React.createElement("div", { className: "progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "progress-fill", style: {
          width: `${pct}%`,
          background: getCatColor(cat, categories, categoryColors)
        } })));
      })), catView === "pie" && /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, /* @__PURE__ */ React.createElement(PieChart, null, /* @__PURE__ */ React.createElement(
        Pie,
        {
          data: catPieData,
          cx: "50%",
          cy: "50%",
          outerRadius: 80,
          dataKey: "value",
          nameKey: "name",
          label: ({ name, percent }) => name + " " + (percent * 100).toFixed(0) + "%",
          labelLine: false
        },
        catTotals.map(([cat], i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: getCatColor(cat, categories, categoryColors) }))
      ), /* @__PURE__ */ React.createElement(Tooltip, { formatter: (v) => fmt(v), contentStyle: { fontSize: 12, background: "var(--navy)", border: "none", borderRadius: 8, color: "#fff" } })))), catView === "table" && /* @__PURE__ */ React.createElement("table", { className: "dash-cat-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "dash-cat-table-hdr-row" }, ["Category", "Amount", "% of Spend"].map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: "dash-cat-th", style: {
        textAlign: i === 0 ? "left" : "right"
      } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, catTotals.map(([cat, total], i) => /* @__PURE__ */ React.createElement("tr", { key: cat, className: "dash-cat-tr" }, /* @__PURE__ */ React.createElement("td", { className: "dash-cat-td" }, /* @__PURE__ */ React.createElement("div", { className: "dash-cat-dot", style: { background: getCatColor(cat, categories, categoryColors) } }), /* @__PURE__ */ React.createElement("span", { className: "tx" }, cat)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-cat-amt-td" }, fmt(total)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-cat-pct-td" }, totalExpense > 0 ? (total / totalExpense * 100).toFixed(1) : 0, "%"))))))),
      incomeSources: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(
        ChartToggle,
        {
          value: incView,
          onChange: setIncView,
          options: [{ id: "bar", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-bar", size: 15 }), label: "Bars" }, { id: "pie", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-pie", size: 15 }), label: "Pie" }]
        }
      ) }, "Income Sources"), incView === "bar" && /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-8 mt-4" }, incTotals.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "debt-empty-wrap" }, "No income entries"), incTotals.map(([cat, total], i) => {
        const pct = totalIncome > 0 ? total / totalIncome * 100 : 0;
        return /* @__PURE__ */ React.createElement("div", { key: cat }, /* @__PURE__ */ React.createElement("div", { className: "label-amt-row" }, /* @__PURE__ */ React.createElement("span", { className: "tx" }, cat), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 amt-mid-600" }, fmt(total))), /* @__PURE__ */ React.createElement("div", { className: "progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "progress-fill", style: { width: `${pct}%`, background: CAT_PALETTE[i % CAT_PALETTE.length] } })));
      })), incView === "pie" && /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, /* @__PURE__ */ React.createElement(PieChart, null, /* @__PURE__ */ React.createElement(
        Pie,
        {
          data: incPieData,
          cx: "50%",
          cy: "50%",
          outerRadius: 75,
          dataKey: "value",
          nameKey: "name",
          label: ({ name, percent }) => percent >= 0.08 ? name + " " + (percent * 100).toFixed(0) + "%" : "",
          labelLine: true
        },
        incTotals.map((_, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: CAT_PALETTE[i % CAT_PALETTE.length] }))
      ), /* @__PURE__ */ React.createElement(Tooltip, { formatter: (v) => fmt(v), contentStyle: { fontSize: 12, background: "var(--navy)", border: "none", borderRadius: 8, color: "#fff" } })))))),
      bvaYear: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, null, "Budget vs Actual \u2014 ", activeYear), (() => {
        const _now = /* @__PURE__ */ new Date();
        const _lm = _now.getFullYear() > activeYear ? 11 : _now.getFullYear() === activeYear ? _now.getMonth() : -1;
        return _lm >= 0 ? /* @__PURE__ */ React.createElement("div", { className: "bva-subtitle" }, MONTHS[0], "\u2013", MONTHS[_lm], " ", activeYear, " \xB7 year-to-date \xB7 ", /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono text-10" }, "spent / budget")) : null;
      })(), (() => {
        const now = /* @__PURE__ */ new Date();
        const isCurrentYear = now.getFullYear() === activeYear;
        const isPastYear = now.getFullYear() > activeYear;
        const lastMonth = isPastYear ? 11 : isCurrentYear ? now.getMonth() : -1;
        const actualByCat = {};
        flow.filter((e) => e.type === "expense" && e.month <= lastMonth).forEach((e) => {
          actualByCat[e.category] = (actualByCat[e.category] || 0) + e.amount;
        });
        const targetByCat = {};
        Object.keys(budgetTargets).forEach((key) => {
          if (!key.startsWith(activeYear + ":")) return;
          const mIdx = parseInt(key.split(":")[1]);
          if (isNaN(mIdx) || mIdx > lastMonth) return;
          const monthTargets = budgetTargets[key] || {};
          Object.keys(monthTargets).forEach((cat) => {
            targetByCat[cat] = (targetByCat[cat] || 0) + (Number(monthTargets[cat]) || 0);
          });
        });
        const cats = [.../* @__PURE__ */ new Set([...Object.keys(targetByCat), ...Object.keys(actualByCat)])].filter((c) => targetByCat[c] > 0).sort((a, b) => (actualByCat[b] || 0) - (actualByCat[a] || 0));
        if (cats.length === 0) {
          return /* @__PURE__ */ React.createElement("div", { className: "bva-empty-state" }, /* @__PURE__ */ React.createElement("div", { className: "bva-empty-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "target", size: 26 })), /* @__PURE__ */ React.createElement("div", { className: "bva-empty-title" }, "No budget targets set yet"), /* @__PURE__ */ React.createElement("div", { className: "bva-empty-body" }, 'Set monthly category targets in the Budget tab under "Budget vs Actual" to track your spending against plan here.'));
        }
        const rows = cats.map((c) => {
          const actual = roundMoney((actualByCat[c] || 0));
          const target = roundMoney((targetByCat[c] || 0));
          const diff = roundMoney((actual - target));
          const over = target > 0 && diff > 0;
          const color = !over ? "var(--greenDk)" : diff <= 5000 ? "var(--amber)" : "var(--red)";
          const pct = target > 0 ? Math.min(actual / target * 100, 100) : 0;
          return { cat: c, actual, target, diff, over, color, pct };
        });
        const totalActual = roundMoney(rows.reduce((s, r) => s + r.actual, 0));
        const totalTarget = roundMoney(rows.reduce((s, r) => s + r.target, 0));
        const tDiff = roundMoney((totalActual - totalTarget));
        const tOver = totalTarget > 0 && tDiff > 0;
        const tColor = !tOver ? "var(--greenDk)" : tDiff <= 5000 ? "var(--amber)" : "var(--red)";
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bva-rows-wrap" }, rows.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.cat }, /* @__PURE__ */ React.createElement("div", { className: "dash-bva-row-hdr" }, /* @__PURE__ */ React.createElement(CatChip, { category: r.cat, categories, categoryColors, className: "text-9" }), /* @__PURE__ */ React.createElement("div", { className: "dash-bva-amounts" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
          color: r.over ? r.color : "var(--text)"
        } }, fmt(r.actual)), r.target > 0 && /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 c-textMid" }, "/ ", fmt(r.target)), r.over && /* @__PURE__ */ React.createElement("span", { className: "over-note", style: { color: r.color } }, fmt(r.diff) + " over"))), r.target > 0 && /* @__PURE__ */ React.createElement("div", { className: "progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "bva-progress-fill", style: {
          width: `${r.pct}%`,
          background: r.color
        } }))))), /* @__PURE__ */ React.createElement("div", { className: "bva-totals-row" }, /* @__PURE__ */ React.createElement("span", { className: "bva-total-label" }, "Total"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 fw-700", style: {
          color: tOver ? tColor : "var(--text)"
        } }, fmt(totalActual)), totalTarget > 0 && /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 c-textMid" }, "/ ", fmt(totalTarget)), tOver && /* @__PURE__ */ React.createElement("span", { className: "over-note", style: { color: tColor } }, fmt(tDiff) + " over"))));
      })())),
      debtSnap: () => /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
        const dData = debtData && typeof debtData === "object" ? debtData : {};
        const toMo = (ev) => {
          var _a2;
          if (!ev) return 0;
          const amt = ev.amount || 0, every = ev.recurEvery || 1;
          const ppy = (_a2 = { day: 365 / every, week: 52 / every, month: 12 / every, year: 1 / every, semimonth: 24 / every }[ev.recurUnit || "month"]) != null ? _a2 : 12;
          return roundMoney(amt * (ppy / 12));
        };
        const dkw = [
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
        const autoAllEvs = {};
        flow.filter((ev) => ev.type === "expense" && dkw.some((k) => ev.desc.toLowerCase().includes(k) || ev.category.toLowerCase().includes(k))).forEach((ev) => {
          const k = ev.desc.replace(/[^a-zA-Z0-9]/g, "_");
          (autoAllEvs[k] || (autoAllEvs[k] = [])).push(ev);
        });
        const autoMonthly = (key) => {
          const evs = autoAllEvs[key] || [];
          if (!evs.length) return 0;
          return roundMoney(evs.reduce((s, ev) => s + (ev.amount || 0), 0) / 12);
        };
        const configuredDebts = Object.entries(dData).filter(([, v]) => !v.hidden && parseFloat(v.balance) > 0);
        if (configuredDebts.length === 0) return null;
        const totalBalance = configuredDebts.reduce((s, [, v]) => s + parseFloat(v.balance || 0), 0);
        return /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "debtsnap-header-row" }, /* @__PURE__ */ React.createElement(SectionTitle, null, "Debt Snapshot"), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 debt-row-bal-amt" }, "Total: ", fmt(totalBalance))), /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-10" }, configuredDebts.map(([key, v]) => {
          const bal = parseFloat(v.balance) || 0;
          const rate = parseFloat(v.rate) || 0;
          const isManual = key.startsWith("manual_");
          const label = isManual ? v.label || "Unnamed debt" : key.replace(/_/g, " ");
          const pmt = !isManual ? autoMonthly(key) : parseFloat(v.payment) || 0;
          const r = rate / 100 / 12;
          const monthsLeft = bal > 0 && pmt > 0 && !(r > 0 && pmt <= bal * r) ? r > 0 ? Math.ceil(Math.log(pmt / (pmt - bal * r)) / Math.log(1 + r)) : Math.ceil(bal / pmt) : null;
          const totalInterest = monthsLeft && r > 0 ? roundMoney((pmt * monthsLeft - bal)) : null;
          const payoffDate = monthsLeft ? (() => {
            const d = /* @__PURE__ */ new Date();
            d.setMonth(d.getMonth() + monthsLeft);
            return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
          })() : null;
          const pct = totalBalance > 0 ? Math.round(bal / totalBalance * 100) : 0;
          const payoffTrend = monthsLeft > 1 ? projectPayoffBalances(bal, rate, pmt, monthsLeft) : null;
          return /* @__PURE__ */ React.createElement("div", { key }, /* @__PURE__ */ React.createElement("div", { className: "debtsnap-row-top" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "tx" }, label), rate > 0 && /* @__PURE__ */ React.createElement("span", { className: "debtsnap-apr-badge" }, rate, "% APR")), /* @__PURE__ */ React.createElement("div", { className: "debtsnap-amounts" }, payoffTrend && /* @__PURE__ */ React.createElement("span", { title: "Projected balance decline to payoff", style: { display: "inline-flex", verticalAlign: "middle", marginRight: 2 } }, /* @__PURE__ */ React.createElement(Sparkline, { data: payoffTrend, color: "var(--red)", height: 18, width: 44 })), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 debt-row-bal-amt" }, fmt(bal)), payoffDate && /* @__PURE__ */ React.createElement("span", { className: "debtsnap-payoff" }, "\u2713 ", payoffDate), totalInterest != null && /* @__PURE__ */ React.createElement("span", { className: "text-10 c-textLt" }, "+", fmt(totalInterest), " int."))), /* @__PURE__ */ React.createElement("div", { className: "progress-track--clip" }, /* @__PURE__ */ React.createElement("div", { className: "debtsnap-progress-fill", style: {
            width: `${pct}%`,
            background: pct > 50 ? "var(--red)" : pct > 25 ? "var(--amber)" : "var(--greenDk)"
          } })), pmt > 0 && (() => {
            var _a2;
            const evs = autoAllEvs[key] || [];
            const perOcc = ((_a2 = evs[0]) == null ? void 0 : _a2.amount) || 0;
            const timesYr = evs.length;
            const label2 = timesYr === 26 ? "bi-weekly" : timesYr === 24 ? "2\xD7/mo" : timesYr === 12 ? "monthly" : timesYr > 0 ? `${timesYr}\xD7/yr` : "";
            return /* @__PURE__ */ React.createElement("div", { className: "debtsnap-freq-note" }, perOcc && label2 ? /* @__PURE__ */ React.createElement(React.Fragment, null, fmt(perOcc), " ", label2, " \xB7 ") : "", fmt(pmt), "/mo");
          })());
        })));
      })()),
      summary: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionTitle, { className: "mb-12" }, "Monthly Summary"), /* @__PURE__ */ React.createElement("div", { className: "summary-toolbar-row" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10" }, /* @__PURE__ */ React.createElement(
          ChartToggle,
          {
            value: summaryView,
            onChange: setSummaryView,
            options: [{ id: "table", icon: /* @__PURE__ */ React.createElement(Icon, { name: "file-list", size: 15 }), label: "Table" }, { id: "heat", icon: /* @__PURE__ */ React.createElement(Icon, { name: "grid", size: 15 }), label: "Heatmap" }]
          }
        )), /* @__PURE__ */ React.createElement(
          ExportBar,
          {
            onCSV: () => downloadCSV(
              `CashFlow_Monthly_Summary_${activeYear}.csv`,
              summaries.map((m) => [m.month, centsToDollars(m.income), centsToDollars(m.expense), centsToDollars(m.surplus), centsToDollars(m.close)]),
              ["Month", "Income", "Expenses", "Surplus", "Closing Balance"]
            ),
            onPrint: () => printView(`CashFlow Monthly Summary ${activeYear}`)
          }
        )),
        summaryView === "heat" && /* @__PURE__ */ React.createElement(Card, { className: "card-flat" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll", tabIndex: 0, role: "region", "aria-label": "Monthly summary heatmap" }, /* @__PURE__ */ React.createElement("table", { className: "dash-table-wide" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, ["Month", "Income", "Expenses", "Surplus / Shortfall", "Closing Balance"].map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: "dash-th-16", style: {
          textAlign: i === 0 ? "left" : "right",
          position: i === 4 ? "sticky" : "static",
          right: i === 4 ? 0 : "auto",
          background: i === 4 ? "var(--navy)" : "transparent",
          boxShadow: i === 4 ? "-6px 0 8px -6px rgba(0,0,0,0.25)" : "none"
        } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, summaries.map((m, i) => {
          const maxInc = Math.max(...summaries.map((s) => s.income), 1);
          const maxExp = Math.max(...summaries.map((s) => s.expense), 1);
          const maxAbs = Math.max(...summaries.map((s) => Math.abs(s.surplus)), 1);
          const maxBal = Math.max(...summaries.map((s) => Math.abs(s.close)), 1);
          const heatInc = `rgba(39,174,115,${0.1 + 0.7 * (m.income / maxInc)})`;
          const heatExp = `rgba(232,93,74,${0.1 + 0.7 * (m.expense / maxExp)})`;
          const heatSur = m.surplus >= 0 ? `rgba(39,174,115,${0.1 + 0.7 * (m.surplus / maxAbs)})` : `rgba(232,93,74,${0.1 + 0.7 * (Math.abs(m.surplus) / maxAbs)})`;
          const heatBal = m.close >= 0 ? `rgba(47,84,150,${0.1 + 0.5 * (m.close / maxBal)})` : `rgba(232,93,74,${0.15 + 0.6 * (Math.abs(m.close) / maxBal)})`;
          return /* @__PURE__ */ React.createElement("tr", { key: m.month, className: "dash-table-row" }, /* @__PURE__ */ React.createElement("td", { className: "dash-td-13" }, m.month), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 heat-inc-td", style: { background: heatInc } }, fmt(m.income)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 heat-exp-td", style: { background: heatExp } }, fmt(m.expense)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 fw-700", style: { background: heatSur, color: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)" } }, fmt(m.surplus, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-heat-bal-td", style: { background: heatBal, color: m.close < 0 ? "var(--red)" : m.close < alertThreshold ? "var(--amber)" : "var(--text)" } }, fmt(m.close)));
        }))))),
        summaryView === "table" && /* @__PURE__ */ React.createElement(Card, { className: "card-flat" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll", tabIndex: 0, role: "region", "aria-label": "Monthly summary table" }, /* @__PURE__ */ React.createElement("table", { className: "dash-table-wide" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, ["Month", "Income", "Expenses", "Surplus / Shortfall", "Closing Balance"].map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: "dash-th-16", style: {
          textAlign: i === 0 ? "left" : "right",
          position: i === 4 ? "sticky" : "static",
          right: i === 4 ? 0 : "auto",
          background: i === 4 ? "var(--navy)" : "transparent",
          boxShadow: i === 4 ? "-6px 0 8px -6px rgba(0,0,0,0.25)" : "none"
        } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, summaries.map((m, i) => /* @__PURE__ */ React.createElement("tr", { key: m.month, className: "dash-table-row", style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" } }, /* @__PURE__ */ React.createElement("td", { className: "dash-td-13" }, m.month), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 c-text" }, fmt(m.income)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 c-text" }, fmt(m.expense)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 fw-700", style: {
          color: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)",
          background: m.surplus < 0 ? "var(--redLt)" : "transparent"
        } }, fmt(m.surplus, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-table-bal-td", style: {
          color: m.close < 0 ? "var(--red)" : m.close < alertThreshold ? "var(--amber)" : "var(--text)",
          background: m.close < 0 ? "var(--redLt)" : m.close < alertThreshold ? "var(--amberLt)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)"
        } }, fmt(m.close)))), /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, /* @__PURE__ */ React.createElement("td", { className: "dash-annual-total-label" }, "Annual Total"), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-annual-total-amt" }, fmt(totalIncome)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-annual-total-amt" }, fmt(totalExpense)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-total-amt-td", style: { color: netSurplus >= 0 ? "var(--green)" : "var(--coral)" } }, fmt(netSurplus, true)), /* @__PURE__ */ React.createElement("td", { className: "dash-total-spacer-td" }))))))
      ),
      yoy: () => /* @__PURE__ */ React.createElement(React.Fragment, null, showYoY ? /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(PillToggle, { options: yoyMetrics, value: yoyMetric, onChange: setYoyMetric, size: "sm" }) }, "Year-over-Year Comparison"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, /* @__PURE__ */ React.createElement(LineChart, { data: yoyData, margin: { top: 4, right: 8, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--textLt)", strokeDasharray: "4 4" }), yearConfigs.map((yc, yi) => /* @__PURE__ */ React.createElement(
        Line,
        {
          key: yc.year,
          type: "monotone",
          dataKey: yc.year,
          name: String(yc.year),
          stroke: YCOLS[yi % YCOLS.length],
          strokeWidth: 2.5,
          dot: { r: 3 },
          activeDot: { r: 5 }
        }
      ))))), /* @__PURE__ */ React.createElement("div", { className: "hscroll mt-16", tabIndex: 0, role: "region", "aria-label": "Annual comparison table" }, /* @__PURE__ */ React.createElement("table", { className: "table-collapse" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, ["Year", "Income", "Expenses", "Net Surplus", "Year-End Balance", "vs Prior Year"].map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: "dash-th-14", style: {
        textAlign: i === 0 ? "left" : "right"
      } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, annualRows.map((row, i) => {
        const prev = annualRows[i - 1];
        const delta = prev ? row.surplus - prev.surplus : null;
        return /* @__PURE__ */ React.createElement("tr", { key: row.year, className: "dash-table-row", style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" } }, /* @__PURE__ */ React.createElement("td", { className: "dash-td-14" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("div", { className: "dash-year-dot", style: { background: row.color } }), /* @__PURE__ */ React.createElement("span", { className: "dash-year-label" }, row.year))), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-14 c-greenDk" }, fmt(row.income)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-14 c-text" }, fmt(row.expense)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-14 fw-700", style: { color: row.surplus >= 0 ? "var(--greenDk)" : "var(--red)" } }, fmt(row.surplus, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-14 fw-700", style: { color: row.close < 0 ? "var(--red)" : "var(--text)" } }, fmt(row.close)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-14 fw-600", style: { color: delta === null ? "#aaa" : delta >= 0 ? "var(--greenDk)" : "var(--red)" } }, delta === null ? "\u2014" : fmt(delta, true)));
      }))))) : /* @__PURE__ */ React.createElement("div", { className: "yoy-empty-wrap" }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 14, style: { color: "var(--textLt)", flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", { className: "txl" }, "Add a second year to unlock the Year-over-Year comparison.")))
    };
    const loadSampleData = () => {
      const y = activeYear;
      const base = Date.now();
      const mk = (i, e) => ({ id: base + i, notes: "", repeats: false, recurEvery: 1, recurUnit: "month", recurDays: [], recurEnd: "", sample: true, ...e });
      setEntries((prev) => [...prev, ...[
        mk(0, { desc: "(Sample) Paycheque", type: "income", amount: 235000, category: "Income", repeats: true, recurUnit: "semimonth", startDate: `${y}-01-05` }),
        mk(1, { desc: "(Sample) Rent", type: "expense", amount: 140000, category: "Housing", repeats: true, startDate: `${y}-01-01` }),
        mk(2, { desc: "(Sample) Groceries", type: "expense", amount: 55000, category: "Food", repeats: true, startDate: `${y}-01-08` }),
        mk(3, { desc: "(Sample) Hydro & Internet", type: "expense", amount: 21000, category: "Utilities", repeats: true, startDate: `${y}-01-15` }),
        mk(4, { desc: "(Sample) Streaming", type: "expense", amount: 3200, category: "Subscriptions", repeats: true, startDate: `${y}-01-20` }),
        mk(5, { desc: "(Sample) Fuel", type: "expense", amount: 26000, category: "Transportation", repeats: true, startDate: `${y}-01-12` })
      ]]);
    };
    const hasSample = entries.some((e) => e.sample);
    const removeSampleData = () => setEntries((prev) => prev.filter((e) => !e.sample));
    const stepBadge = (n, done) => /* @__PURE__ */ React.createElement("span", { "aria-hidden": true, className: "step-badge", style: { background: done ? "var(--greenLt)" : "var(--stripe)", border: `1.5px solid ${done ? "var(--greenDk)" : "var(--border)"}`, color: done ? "var(--greenDk)" : "var(--textMid)" } }, done ? "✓" : n);
    const quickAdd = () => window.dispatchEvent(new CustomEvent("cf:quickadd"));
    const firstRunPanel = entries.length === 0 && /* @__PURE__ */ React.createElement(Card, { className: "firstrun-card" }, /* @__PURE__ */ React.createElement("div", { className: "firstrun-title" }, "Welcome — let's map out your cash flow"), /* @__PURE__ */ React.createElement("div", { className: "firstrun-subtitle" }, "Three quick steps and this dashboard comes to life."), /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, stepBadge(1, openBal !== 0), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-text" }, /* @__PURE__ */ React.createElement("strong", null, "Set your opening balance"), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-hint" }, "What's in the account today?")), /* @__PURE__ */ React.createElement("span", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("input", { type: "number", inputMode: "decimal", placeholder: "e.g. 2500", value: obDraft, onChange: (e) => setObDraft(e.target.value), "aria-label": "Opening balance", className: "field-input field-input--mono firstrun-ob-input", onKeyDown: (e) => {
      if (e.key === "Enter" && obDraft !== "") {
        setYearConfigs((prev) => prev.map((yc) => yc.year === activeYear ? { ...yc, openingBalance: dollarsToCents(obDraft) } : yc));
      }
    } }), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary cf-btn--md", disabled: obDraft === "", onClick: () => setYearConfigs((prev) => prev.map((yc) => yc.year === activeYear ? { ...yc, openingBalance: dollarsToCents(obDraft) } : yc)) }, openBal !== 0 ? "Update" : "Set"))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, stepBadge(2, false), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-text" }, /* @__PURE__ */ React.createElement("strong", null, "Add your income"), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-hint" }, "Paycheques and anything else that comes in, with how often")), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--primary cf-btn--md", onClick: quickAdd }, "+ Add income")), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, stepBadge(3, false), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-text" }, /* @__PURE__ */ React.createElement("strong", null, "Add your bills"), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-hint" }, "Rent, utilities, loans — recurring entries fill the whole year")), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--primary cf-btn--md", onClick: quickAdd }, "+ Add bills"))), /* @__PURE__ */ React.createElement("div", { className: "firstrun-footer" }, /* @__PURE__ */ React.createElement("span", { className: "firstrun-footer-text" }, "Just looking around? Load clearly-marked fictional data — one tap removes it again."), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary cf-btn--md", onClick: loadSampleData }, "Load sample data")));
    const sampleBanner = hasSample && /* @__PURE__ */ React.createElement("div", { role: "status", className: "sample-banner", "data-noprint": true }, /* @__PURE__ */ React.createElement("span", { className: "sample-banner-text" }, "You're exploring ", /* @__PURE__ */ React.createElement("strong", { className: "c-text" }, "sample data"), " — every entry is fictional and marked “(Sample)”."), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary cf-btn--xs", onClick: removeSampleData }, "Remove sample data"));
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page dash-wrap dash-page" }, firstRunPanel, sampleBanner, entries.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "dash-customize-row", "data-noprint": true }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowCustomize(true),
        className: "cf-btn cf-btn--secondary cf-btn--xs"
      },
      "\u2699 Customize"
    )), showCustomize && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Customize dashboard",
        onClick: (e) => {
          if (e.target === e.currentTarget) setShowCustomize(false);
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-card customize-modal-card",
          onClick: (e) => e.stopPropagation()
        },
        /* @__PURE__ */ React.createElement("div", { className: "customize-title" }, "Customize Dashboard"),
        /* @__PURE__ */ React.createElement("div", { className: "customize-subtitle" }, "Show, hide, and reorder each widget individually. Your layout syncs across devices."),
        /* @__PURE__ */ React.createElement("div", { className: "customize-list" }, dashOrderEff.map((id, idx) => {
          const w = DASH_WIDGET_DEFS.find((x) => x.id === id);
          if (!w) return null;
          const move = (dir) => {
            haptic();
            const next = [...dashOrderEff];
            const j = idx + dir;
            if (j < 0 || j >= next.length) return;
            [next[idx], next[j]] = [next[j], next[idx]];
            setDashOrder(next);
          };
          return /* @__PURE__ */ React.createElement("div", { key: id, className: "customize-item", style: {
            background: dashHidden[id] ? "transparent" : "var(--stripe)"
          } }, /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "checkbox",
              checked: !dashHidden[id],
              onChange: (e) => setDashHidden((prev) => __spreadProps(__spreadValues({}, prev), { [id]: !e.target.checked })),
              className: "customize-checkbox"
            }
          ), /* @__PURE__ */ React.createElement("span", { className: "customize-label", style: { opacity: dashHidden[id] ? 0.5 : 1 } }, w.label), /* @__PURE__ */ React.createElement("button", { "aria-label": "Move up", className: "wm-arrow", style: { opacity: idx === 0 ? 0.3 : 1 }, disabled: idx === 0, onClick: () => move(-1) }, "\u2191"), /* @__PURE__ */ React.createElement("button", { "aria-label": "Move down", className: "wm-arrow", style: { opacity: idx === dashOrderEff.length - 1 ? 0.3 : 1 }, disabled: idx === dashOrderEff.length - 1, onClick: () => move(1) }, "\u2193"));
        })),
        /* @__PURE__ */ React.createElement("div", { className: "customize-done-row" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setShowCustomize(false),
            className: "cf-btn cf-btn--primary fw-700 btn-pad-24"
          },
          "Done"
        ))
      )
    ), entries.length === 0 && /* @__PURE__ */ React.createElement(
      OnboardingWizard,
      {
        yearConfigs,
        setYearConfigs,
        addEntry,
        categories,
        setTab
      }
    ), users.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "dash-customize-row", "data-noprint": true }, React.createElement(PillToggle, { options: [{ id: false, label: "My entries" }, { id: true, label: "All users" }], value: sharedView, onChange: setSharedView, size: "sm" })), /* @__PURE__ */ React.createElement(AlertBanner, { flow, openBal, alertThreshold }), (() => {
      const GLANCE_IDS = ["balanceToday", "nextLow", "dueMonth"];
      const visible = dashOrderEff.filter((id) => !dashHidden[id] && !(GLANCE_IDS.includes(id) && (!glance || entries.length === 0)));
      const out = [];
      let i = 0;
      const sizeOf = (id) => (DASH_WIDGET_DEFS.find((w) => w.id === id) || {}).size || "full";
      while (i < visible.length) {
        const id = visible[i], sz = sizeOf(id);
        if (sz === "third") {
          const run = [id];
          while (run.length < 3 && i + run.length < visible.length && sizeOf(visible[i + run.length]) === "third") run.push(visible[i + run.length]);
          out.push(/* @__PURE__ */ React.createElement("div", { key: run.join("_"), className: "glance-grid", style: { gridTemplateColumns: `repeat(${run.length},1fr)` } }, run.map((rid) => /* @__PURE__ */ React.createElement(React.Fragment, { key: rid }, WIDGET_RENDER[rid]()))));
          i += run.length;
        } else if (sz !== "full" && i + 1 < visible.length && sizeOf(visible[i + 1]) !== "full" && sizeOf(visible[i + 1]) !== "third") {
          const id2 = visible[i + 1], sz2 = sizeOf(id2);
          const cols = sz === "wide" && sz2 === "narrow" ? "3fr 2fr" : sz === "narrow" && sz2 === "wide" ? "2fr 3fr" : "1fr 1fr";
          out.push(/* @__PURE__ */ React.createElement("div", { key: id + "_" + id2, className: "chart-grid", style: { gridTemplateColumns: cols } }, WIDGET_RENDER[id](), WIDGET_RENDER[id2]()));
          i += 2;
        } else if (sz !== "full") {
          out.push(/* @__PURE__ */ React.createElement("div", { key: id, className: "chart-grid" }, WIDGET_RENDER[id]()));
          i += 1;
        } else {
          out.push(/* @__PURE__ */ React.createElement(React.Fragment, { key: id }, WIDGET_RENDER[id]()));
          i += 1;
        }
      }
      return out;
    })());
  }
