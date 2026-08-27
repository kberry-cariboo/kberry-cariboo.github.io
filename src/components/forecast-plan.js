  function ForecastView({ apiKey = "", isOffline = false, yearFlows, yearConfigs, openBalByYear, alertThreshold = DEFAULT_ALERT_THRESHOLD, globalSearch = "", budgetTargets = {}, horizon = 90, setHorizon = () => {
  }, categories = [], categoryColors = {}, addEntry = null, templates = [], setTemplates = null, completed = {}, toggleComplete = () => {
  } }) {
    const isMobile = useIsMobile();
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [pgPage, setPgPage] = useState(0);
    const [pgSize, setPgSize] = useState(20);
    const [mobileLoaded, setMobileLoaded] = useState(1);
    const changePageSize = (v) => {
      setPgSize(v);
      setPgPage(0);
      setMobileLoaded(1);
    };
    // Snapshot once: a fresh Date each render changes the memo dependency's
    // identity and would recompute futureEvents on every render.
    const today = useMemo(() => /* @__PURE__ */ new Date(), []);
    const horizons = [30, 60, 90];
    const gq2 = (globalSearch || "").toLowerCase();
    const futureEvents = useMemo(() => {
      const end = new Date(today);
      end.setDate(end.getDate() + horizon);
      const all = [];
      yearConfigs.forEach((yc) => {
        const flow = yearFlows[yc.year] || [];
        flow.forEach((ev) => {
          if (ev.date >= today && ev.date <= end) all.push(__spreadProps(__spreadValues({}, ev), { year: yc.year }));
        });
      });
      return all.sort((a, b) => a.date - b.date);
    }, [yearFlows, yearConfigs, horizon, today]);
    // Running month-to-date outflow per category, keyed by occurrence id, so
    // the "vs target" column can compare a month's spending against a month's
    // target.
    //
    // The column used to divide a *single* occurrence's amount by the whole
    // month's target and print the result as a "confidence" percentage. Two
    // separate problems: the units didn't match — a bi-weekly $260 grocery
    // against a $560 monthly Food target scored a reassuring ✓ even though
    // the second one blows it — and no reading of "confidence" describes a
    // budget ratio, so a row over its target looked like a forecast the app
    // wasn't sure about.
    //
    // Accumulated across the whole year's flow rather than futureEvents,
    // because a September occurrence has to count what September already
    // spent before today, which is behind the forecast window.
    const catMtdById = useMemo(() => {
      const out = {};
      yearConfigs.forEach((yc) => {
        const running = {};
        (yearFlows[yc.year] || []).forEach((ev) => {
          // Expenses only, matching what Budget vs Actual counts. Transfers
          // sit outside the target system by design (see the Help page and
          // getMonthSummaries), so counting one here would judge a row
          // against a target Budget vs Actual will never show it against.
          if (ev.type !== "expense") return;
          const key = `${ev.month}:${ev.category}`;
          running[key] = (running[key] || 0) + ev.amount;
          out[ev.id] = running[key];
        });
      });
      return out;
    }, [yearFlows, yearConfigs]);
    const dangerDays = futureEvents.filter((ev) => ev.balance < alertThreshold);
    const lowestBalance = futureEvents.length ? Math.min(...futureEvents.map((e) => e.balance)) : null;
    const searchedEvents = futureEvents.filter((ev) => eventMatchesSearch(ev, gq2));
    const pgInfo = isMobile ? cumulativeRows(searchedEvents, mobileLoaded, pgSize) : paginateRows(searchedEvents, pgPage, pgSize);
    useInfiniteScroll(isMobile && pgInfo.hasMore, () => setMobileLoaded((l) => l + 1));
    const pagedEvents = pgInfo.rows;
    // Mobile presentation matches Budget → Monthly and Entries: the same card,
    // the same paid checkbox, the same category chip. Forecast used to be the
    // one list in the Budget tab that stayed a table on a phone, which meant a
    // row you could tick off in Monthly went inert two taps away, and the
    // description column was hard-capped at 130px while the balance column had
    // slack. Editing still isn't offered here — Forecast projects across year
    // boundaries and the override machinery is year-scoped — so a row opens
    // nothing; the checkbox is the whole interaction.
    const renderForecastCards = () => /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, pagedEvents.map((ev) => {
      const dateStr = fmtDate(ev.date, today.getFullYear());
      const isDone = !!completed[ev.id];
      const signed = signedAmount(ev);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: ev.id,
          className: "budget-card-row",
          style: {
            background: isDone ? "var(--doneBg)" : "var(--bgCard)",
            boxShadow: isDone ? "inset 3px 0 0 0 var(--greenDk)" : "inset 3px 0 0 0 transparent"
          }
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              haptic();
              toggleComplete(ev.id);
            },
            role: "checkbox",
            "aria-checked": isDone,
            "aria-label": (isDone ? "Mark unpaid: " : "Mark paid: ") + ev.desc,
            title: isDone ? "Paid — tap to mark unpaid" : "Mark paid",
            className: "cf-checkbtn budget-card-checkbtn",
            style: {
              border: isDone ? "none" : "1.5px solid var(--border)",
              background: isDone ? "var(--greenDk)" : "transparent"
            }
          },
          isDone ? "✓" : ""
        ),
        /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "card-top-row" }, /* @__PURE__ */ React.createElement("span", {
          className: "tx card-desc-span",
          title: ev.desc,
          style: {
            color: isDone ? "var(--textLt)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none"
          }
        }, ev.desc), /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, style: { fontSize: 9, flexShrink: 0 } })), /* @__PURE__ */ React.createElement("div", { className: "card-bottom-row", style: { justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { className: "txl" }, dateStr, ev.depositShifted && /* @__PURE__ */ React.createElement(HelpTip, { icon: "↤", variant: "mark", label: "Deposit date", text: depositShiftNote(ev) })), /* @__PURE__ */ React.createElement("span", { className: "amounts-row-baseline" }, /* @__PURE__ */ React.createElement("span", { className: "mno card-signed-amt", style: {
          textDecoration: isDone ? "line-through" : "none",
          color: isDone ? "var(--textLt)" : ev.type === "transfer" ? "var(--accent)" : signed >= 0 ? "var(--greenDk)" : "var(--text)"
        } }, fmt(signed, true)), /* @__PURE__ */ React.createElement("span", { className: "mno card-balance-amt", style: {
          textDecoration: isDone ? "line-through" : "none",
          color: isDone ? "var(--textLt)" : ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amberInk)" : "var(--text)"
        } }, fmt(ev.balance)))))
      );
    }), /* @__PURE__ */ React.createElement(GridPagination, { pageInfo: pgInfo, setPage: setPgPage, pageSize: pgSize, setPageSize: changePageSize, label: "events", isMobile: true }));
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "forecast-header-row" }, /* @__PURE__ */ React.createElement("span", { className: "forecast-label" }, horizon, "-Day Forecast"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 cf-wrap" }, /* @__PURE__ */ React.createElement(PillToggle, { options: horizons.map((h) => ({ id: h, label: h + " days" })), value: horizon, onChange: setHorizon }))), /* @__PURE__ */ React.createElement("div", { className: "txm" }, "Rolling cash flow from today"), gq2 && /* @__PURE__ */ React.createElement("div", { className: "search-filter-banner" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering forecast by "', globalSearch, '" \u2014 ', futureEvents.length, " match", futureEvents.length !== 1 ? "es" : "")), dangerDays.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "forecast-danger-banner" }, /* @__PURE__ */ React.createElement("div", { className: "forecast-danger-title" }, "\u26A0 ", dangerDays.length, " event", dangerDays.length > 1 ? "s" : "", " within ", horizon, " days where balance drops below ", fmt(alertThreshold)), /* @__PURE__ */ React.createElement("div", { className: "txm" }, "Lowest projected balance in next ", horizon, " days: ", /* @__PURE__ */ React.createElement("strong", { className: "forecast-lowest-value", style: { color: lowestBalance < 0 ? "var(--red)" : "var(--amberInk)" } }, fmt(lowestBalance)))), /* @__PURE__ */ React.createElement("div", { className: "forecast-exportbar-row" }, /* @__PURE__ */ React.createElement(
      ExportBar,
      {
        onAdd: addEntry ? () => setShowAddEntry(true) : null,
        onCSV: futureEvents.length === 0 ? null : () => {
          const rows = searchedEvents.map((ev) => {
            const dateStr = fmtDate(ev.date, null);
            return [dateStr, ev.desc, ev.category, isInflowEvent(ev) ? centsToDollars(ev.amount) : "", isOutflowEvent(ev) ? centsToDollars(ev.amount) : "", centsToDollars(ev.balance)];
          });
          downloadCSV(`CashFlow_Forecast_${horizon}day.csv`, rows, ["Date", "Description", "Category", "In", "Out", "Balance"]);
        },
        onPrint: futureEvents.length === 0 ? null : () => printView(`CashFlow Forecast - ${horizon} Days`)
      }
    )), /* @__PURE__ */ React.createElement(
      AddEntryModal,
      {
        show: showAddEntry,
        onClose: () => setShowAddEntry(false),
        onSave: addEntry || (() => {}),
        categories,
        apiKey,
        isOffline,
        templates,
        setTemplates
      }
    ), futureEvents.length === 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("p", { className: "forecast-empty-text" }, "No upcoming events in the next ", horizon, " days.")), futureEvents.length > 0 && (isMobile ? renderForecastCards() : /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll hscroll--paged", tabIndex: 0, role: "region", "aria-label": "Forecast table" }, /* @__PURE__ */ React.createElement("table", { className: "forecast-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, ["Date", "Description", "Category", "In", "Out", "Balance", "vs Target"].map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: (h === "Category" ? "forecast-col-cat " : "") + (h === "vs Target" ? "forecast-conf-col " : "") + "forecast-th", style: {
      textAlign: i >= 3 ? "right" : "left"
    } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, pagedEvents.map((ev, i) => {
      const dateStr = fmtDate(ev.date, today.getFullYear());
      return /* @__PURE__ */ React.createElement("tr", { key: ev.id, className: "forecast-tr", style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" } }, /* @__PURE__ */ React.createElement("td", { className: "forecast-td-date" }, dateStr, ev.depositShifted && /* @__PURE__ */ React.createElement(HelpTip, { icon: "↤", variant: "mark", label: "Deposit date", text: depositShiftNote(ev) })), /* @__PURE__ */ React.createElement("td", { className: "forecast-desc-cell", style: { maxWidth: 180 } }, ev.desc), /* @__PURE__ */ React.createElement("td", { className: "forecast-col-cat" }, /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors })), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 forecast-td-income" }, isInflowEvent(ev) ? fmt(ev.amount) : ""), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 forecast-td-expense" }, isOutflowEvent(ev) ? fmt(ev.amount) : ""), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 forecast-td-balance", style: {
        color: ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amberInk)" : "var(--text)",
        background: ev.balance < 0 ? "var(--redLt)" : ev.balance < alertThreshold ? "var(--amberLt)" : "transparent"
      } }, fmt(ev.balance)), (() => {
        const m = ev.month;
        const cat = ev.category;
        const yr = ev.year;
        const target = (budgetTargets[`${yr}:${m}`] || {})[cat] || 0;
        if (ev.type !== "expense") return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, /* @__PURE__ */ React.createElement("span", { className: "c-textLt", title: isInflowEvent(ev) ? "Money in — budget targets cover spending only" : "Transfers sit outside the budget target system" }, "\u2014"));
        if (!target) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, /* @__PURE__ */ React.createElement("span", { className: "c-textLt", title: `No monthly budget target set for ${cat}` }, "\u2014"));
        // Where this occurrence leaves the category's month, not what this one
        // occurrence is worth on its own — see catMtdById.
        const mtd = catMtdById[ev.id] != null ? catMtdById[ev.id] : ev.amount;
        const pct = Math.round(mtd / target * 100);
        if (pct <= 100) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, /* @__PURE__ */ React.createElement("span", { className: "c-textLt", title: `${cat} in ${MONTHS[m]}: ${fmt(mtd)} of the ${fmt(target)} target` }, "\u2713"));
        const color = pct <= 120 ? "var(--amberInk)" : "var(--red)";
        return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, /* @__PURE__ */ React.createElement("span", { className: "forecast-conf-pct", style: { color }, title: `${cat} in ${MONTHS[m]}: ${fmt(mtd)} of the ${fmt(target)} target` }, pct, "%"));
      })());
    })))), /* @__PURE__ */ React.createElement("div", { className: "forecast-legend" }, "vs Target \u2014 how far this occurrence leaves its category\u2019s spending against that month\u2019s budget target. ", /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, "\u2713"), " within target \u00b7 ", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--amberInk)", fontWeight: 600 } }, "101\u2013120%"), " slightly over \u00b7 ", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--red)", fontWeight: 600 } }, "over 120%"), " well over \u00b7 ", /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, "\u2014"), " money in, or no target set"), /* @__PURE__ */ React.createElement(GridPagination, { pageInfo: pgInfo, setPage: setPgPage, pageSize: pgSize, setPageSize: changePageSize, label: "events", isMobile: false }))));
  }
  function OnboardingWizard({ yearConfigs, setYearConfigs, addEntry, categories, setTab }) {
    const [step, setStep] = useState(0);
    const [openBal, setOpenBal] = useState("");
    const [income, setIncome] = useState({ desc: "", amount: "", category: "Income" });
    const [expense, setExpense] = useState({ desc: "", amount: "", category: categories[0] || "" });
    const [done, setDone] = useState(false);
    if (done) return null;
    const steps = [
      // Step 0: Opening balance
      /* @__PURE__ */ React.createElement("div", { key: "s0" }, /* @__PURE__ */ React.createElement("div", { className: "wizard-step-icon wizard-icon--primary" }, /* @__PURE__ */ React.createElement(Icon, { name: "banknote", size: 34 })), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-title" }, "Welcome to CashFlow!"), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-subtitle wizard-step-subtitle--lh" }, "Let's set up your budget in 3 quick steps. First, what's your current bank balance?"), /* @__PURE__ */ React.createElement("div", { className: "wizard-amount-row" }, /* @__PURE__ */ React.createElement("span", { className: "wizard-dollar-lg" }, moneySymbol()), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          placeholder: "e.g. 5000.00",
          value: openBal,
          onChange: (e) => setOpenBal(e.target.value),
          autoFocus: true,
          className: "wizard-openbal-input"
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "wizard-btn-row" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
        const v = dollarsToCents(openBal);
        setYearConfigs((prev) => prev.map((yc, i) => i === 0 ? __spreadProps(__spreadValues({}, yc), { openingBalance: v }) : yc));
        setStep(1);
      }, className: "cf-btn cf-btn--primary wizard-next-btn" }, "Next \u2192"), /* @__PURE__ */ React.createElement("button", { onClick: () => setDone(true), className: "cf-btn cf-btn--secondary cf-btn--wide" }, "Skip"))),
      // Step 1: First income
      /* @__PURE__ */ React.createElement("div", { key: "s1" }, /* @__PURE__ */ React.createElement("div", { className: "wizard-step-icon wizard-icon--green" }, /* @__PURE__ */ React.createElement(Icon, { name: "banknote", size: 34 })), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-title" }, "Add your first income"), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-subtitle" }, `What's your main source of income? (e.g. "Payroll")`), /* @__PURE__ */ React.createElement("div", { className: "wizard-field-stack" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          placeholder: "Description e.g. Payroll",
          value: income.desc,
          autoFocus: true,
          onChange: (e) => setIncome((p) => __spreadProps(__spreadValues({}, p), { desc: e.target.value })),
          className: "wizard-text-input"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "c-textMid" }, moneySymbol()), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          placeholder: "Amount",
          value: income.amount,
          className: "cf-text-mono-13 wizard-amount-input",
          onChange: (e) => setIncome((p) => __spreadProps(__spreadValues({}, p), { amount: e.target.value }))
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "wizard-btn-row" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep(0), className: "cf-btn cf-btn--secondary cf-btn--wide" }, "\u2190 Back"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (income.desc.trim() && income.amount) {
          addEntry({
            desc: income.desc.trim(),
            type: "income",
            amount: dollarsToCents(income.amount),
            category: income.category,
            repeats: true,
            recurEvery: 1,
            recurUnit: "semimonth",
            recurDays: [],
            recurEnd: "",
            startDate: (/* @__PURE__ */ new Date()).getFullYear() + "-01-01",
            notes: "Added during setup"
          });
        }
        setStep(2);
      }, className: "cf-btn cf-btn--primary wizard-next-btn" }, income.desc.trim() && income.amount ? "Next \u2192" : "Skip \u2192"))),
      // Step 2: First expense
      /* @__PURE__ */ React.createElement("div", { key: "s2" }, /* @__PURE__ */ React.createElement("div", { className: "wizard-step-icon wizard-icon--red" }, /* @__PURE__ */ React.createElement(Icon, { name: "credit-card", size: 34 })), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-title" }, "Add your first expense"), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-subtitle" }, `What's a recurring expense? (e.g. "Mortgage", "Rent")`), /* @__PURE__ */ React.createElement("div", { className: "wizard-field-stack" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          placeholder: "Description e.g. Mortgage",
          value: expense.desc,
          autoFocus: true,
          onChange: (e) => setExpense((p) => __spreadProps(__spreadValues({}, p), { desc: e.target.value })),
          className: "wizard-text-input"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "c-textMid" }, moneySymbol()), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          placeholder: "Monthly amount",
          value: expense.amount,
          className: "cf-text-mono-13 wizard-amount-input",
          onChange: (e) => setExpense((p) => __spreadProps(__spreadValues({}, p), { amount: e.target.value }))
        }
      )), /* @__PURE__ */ React.createElement(
        "select",
        {
          value: expense.category,
          onChange: (e) => setExpense((p) => __spreadProps(__spreadValues({}, p), { category: e.target.value })),
          className: "wizard-text-input"
        },
        categories.filter((c) => c !== "Income").map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))
      )), /* @__PURE__ */ React.createElement("div", { className: "wizard-btn-row" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep(1), className: "cf-btn cf-btn--secondary cf-btn--wide" }, "\u2190 Back"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (expense.desc.trim() && expense.amount) {
          addEntry({
            desc: expense.desc.trim(),
            type: "expense",
            amount: dollarsToCents(expense.amount),
            category: expense.category,
            repeats: true,
            recurEvery: 1,
            recurUnit: "month",
            recurDays: [],
            recurEnd: "",
            startDate: (/* @__PURE__ */ new Date()).getFullYear() + "-01-01",
            notes: "Added during setup"
          });
        }
        setDone(true);
        setTab("budget");
      }, className: "wizard-finish-btn" }, expense.desc.trim() && expense.amount ? "Finish \u2713" : "Skip & Finish")))
    ];
    return /* @__PURE__ */ React.createElement(Card, { className: "wizard-card" }, /* @__PURE__ */ React.createElement("div", { className: "wizard-dots-row" }, [0, 1, 2].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "wizard-dot", style: {
      background: i <= step ? "var(--primary)" : "var(--border)"
    } }))), steps[step]);
  }
  function AlertBanner({ flow, openBal, alertThreshold }) {
    const today = /* @__PURE__ */ new Date();
    const next30 = new Date(today);
    next30.setDate(today.getDate() + 30);
    const alerts = flow.filter((ev) => ev.date >= today && ev.date <= next30 && ev.balance < alertThreshold);
    if (!alerts.length) return null;
    const worst = alerts.reduce((a, b) => a.balance < b.balance ? a : b);
    return /* @__PURE__ */ React.createElement("div", { className: "alert-banner-wrap", "data-noprint": true }, /* @__PURE__ */ React.createElement("div", { className: "alert-banner-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 24 })), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "alert-banner-title" }, alerts.length, " upcoming event", alerts.length > 1 ? "s" : "", " drop below $", centsToDollars(alertThreshold).toLocaleString(), " in the next 30 days"), /* @__PURE__ */ React.createElement("div", { className: "alert-banner-sub" }, "Lowest: ", /* @__PURE__ */ React.createElement("strong", { className: "alert-banner-strong" }, fmt(worst.balance)), " ", "on ", MONTHS[worst.month], " ", worst.day, " \xB7 ", worst.desc)));
  }
  function BoldText({ text = "" }) {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return React.createElement(React.Fragment, null, ...parts.map(
      (p, i) => i % 2 === 1 ? React.createElement("strong", { key: i }, p) : p
    ));
  }
  // Hoisted out of AIInsightsView (was remounted every parent render).
  const VizRow = ({ label, fillPct, fillColor, value, sub, rowTitle }) => /* @__PURE__ */ React.createElement("div", { title: rowTitle || void 0, className: "vizrow-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "vizrow-toprow" }, /* @__PURE__ */ React.createElement("span", { className: "txm vizrow-label" }, label), /* @__PURE__ */ React.createElement("span", { className: "mno vizrow-value" }, value, sub && /* @__PURE__ */ React.createElement("span", { className: "vizrow-sub" }, " ", sub))), /* @__PURE__ */ React.createElement("div", { className: "vizrow-track" }, /* @__PURE__ */ React.createElement("div", { className: "vizrow-fill", style: { width: Math.max(3, Math.min(100, fillPct)) + "%", background: fillColor } })));
  function AIInsightsView({ flow, openBal, yearConfigs, budgetTargets, activeYear, categories = [], apiKey = "", goals = [], debtData = {}, isOffline = false, setTab = () => {
  } }) {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [err, setErr] = useState("");
    const [truncated, setTruncated] = useState(false);
    const [lastRun, setLastRun] = useState(null);
    const [proxyReady, setProxyReady] = useState(false);
    // v2 because the cached shape changed: reports used to be markdown text
    // that got re-parsed on load, and are now the structured object the model
    // returns. An old v1 entry can't be rendered by the current code, so it
    // gets a new key rather than a migration — the report is a cache, and the
    // cost of a miss is one button press.
    const CACHE_KEY = `cf_ai_report_v2_${activeYear}`;
    useEffect(() => {
      let alive = true;
      aiProbeProxy().then((ok) => {
        if (alive) setProxyReady(ok);
      });
      return () => {
        alive = false;
      };
    }, []);
    useEffect(() => {
      try {
        localStorage.removeItem(`cf_ai_report_${activeYear}`);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { report: saved, ts } = JSON.parse(cached);
          if (saved && typeof saved === "object") {
            setReport(saved);
            setLastRun(new Date(ts));
          }
        }
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    }, [activeYear]);
    const saveReport = (saved) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ report: saved, ts: (/* @__PURE__ */ new Date()).toISOString() }));
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    };
    const buildContext = () => {
      var _a;
      const now = /* @__PURE__ */ new Date();
      const summaries = getMonthSummaries(flow, openBal);
      const currentMonth = now.getFullYear() === activeYear ? now.getMonth() : 11;
      // Goals and debt-tracker data come in as props (single source of truth
      // in App state) rather than re-reading localStorage, which went stale
      // when household sync updated them mid-session.
      const debtTrackerData = debtData && typeof debtData === "object" ? debtData : {};
      // This context is used two ways: as vizCtx, feeding the on-screen KPI
      // tiles/charts via fmt() (which expects cents, like everywhere else in
      // the app), and serialized into the AI prompt text below, which needs
      // plain dollars. So buildContext's return stays in cents — the
      // prompt-building code down in runAssessment is the one place that
      // converts, right where the numbers get interpolated into text.
      const savingsGoals = (Array.isArray(goals) ? goals : []).filter((x) => !x.archived).map((x) => ({
        name: x.name,
        target: roundMoney(x.target),
        saved: roundMoney(x.saved),
        monthly: roundMoney(x.monthly),
        targetDate: x.targetDate || null,
        pct: x.target > 0 ? Math.round(x.saved / x.target * 100) : 0
      }));
      const ytdMonths = summaries.slice(0, currentMonth + 1).map((m) => ({
        month: m.month,
        income: m.income,
        expenses: m.expense,
        surplus: m.surplus,
        closingBalance: m.close
      }));
      const expenseCats = {}, incomeCats = {};
      flow.filter((e) => e.month <= currentMonth).forEach((e) => {
        // Classified by flow direction, not by type, so these two add up to
        // the totalIncome/totalExpenses printed above them in the same
        // prompt — those come from getMonthSummaries, which counts an
        // "out"-direction transfer as money leaving. Excluding transfers here
        // (on the reasoning that they only move between the user's own
        // accounts) would hand the model a category breakdown that doesn't
        // reconcile with its own headline totals; and the reasoning doesn't
        // hold anyway while the app tracks a single account, where a transfer
        // out leaves and never comes back.
        if (isOutflowEvent(e)) expenseCats[e.category] = (expenseCats[e.category] || 0) + e.amount;
        else incomeCats[e.category] = (incomeCats[e.category] || 0) + e.amount;
      });
      const bvaRows = [];
      const targetByCat = {};
      for (let m = 0; m <= currentMonth; m++) {
        const t = budgetTargets[`${activeYear}:${m}`] || {};
        Object.entries(t).forEach(([cat, amt]) => {
          targetByCat[cat] = (targetByCat[cat] || 0) + (Number(amt) || 0);
        });
      }
      Object.entries(targetByCat).forEach(([cat, tgt]) => {
        const act = roundMoney(expenseCats[cat] || 0);
        const t = roundMoney(tgt);
        bvaRows.push({ category: cat, actual: act, target: t, variance: roundMoney(act - t) });
      });
      bvaRows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
      const debtKeywords = ["debt", "credit", "loan", "mortgage", "line of credit", "lease", "cc-", "visa", "amex", "mastercard", "car payment", "truck payment", "trailer payment", "child support"];
      const debtItems = Object.entries(expenseCats).filter(
        ([c]) => debtKeywords.some((k) => c.toLowerCase().includes(k))
      ).sort((a, b) => b[1] - a[1]);
      const totalIncome = ytdMonths.reduce((s, m) => s + m.income, 0);
      const totalExp = ytdMonths.reduce((s, m) => s + m.expenses, 0);
      const totalSurplus = ytdMonths.reduce((s, m) => s + m.surplus, 0);
      const avgMonthly = ytdMonths.length ? totalExp / ytdMonths.length : 0;
      const savingsRate = totalIncome > 0 ? (totalIncome - totalExp) / totalIncome * 100 : 0;
      const closingBal = ((_a = summaries[currentMonth]) == null ? void 0 : _a.close) || openBal;
      const lowestBal = Math.min(...summaries.slice(0, currentMonth + 1).map((m) => m.close));
      return {
        year: activeYear,
        savingsGoals,
        reportingWindow: `January\u2013${MONTHS[currentMonth]} ${activeYear} (${currentMonth + 1} months)`,
        openingBalance: roundMoney(openBal),
        closingBalance: roundMoney(closingBal),
        totalIncome: roundMoney(totalIncome),
        totalExpenses: roundMoney(totalExp),
        totalSurplus: roundMoney(totalSurplus),
        avgMonthlyExpense: roundMoney(avgMonthly),
        savingsRatePct: Math.round(savingsRate * 10) / 10,
        lowestBalance: roundMoney(lowestBal),
        monthlyBreakdown: ytdMonths,
        topExpenseCategories: Object.entries(expenseCats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([cat, amt]) => ({
          category: cat,
          total: roundMoney(amt),
          pctOfExpenses: totalExp > 0 ? Math.round(amt / totalExp * 1e3) / 10 : 0
        })),
        incomeCategories: Object.entries(incomeCats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ category: cat, total: roundMoney(amt) })),
        debtObligations: debtItems.map(([cat, amt]) => ({ category: cat, ytdPaid: roundMoney(amt) })),
        budgetVsActual: bvaRows.slice(0, 15),
        hasBudgetTargets: Object.keys(targetByCat).length > 0,
        // Debt tracker data (balances + rates user has entered)
        debtTrackerItems: Object.entries(debtTrackerData).filter(([, v]) => !v.hidden && parseFloat(v.balance) > 0).map(([k, v]) => ({
          name: v.label || k.replace("manual_", "").replace(/_/g, " "),
          balance: roundMoney(parseFloat(v.balance || 0)),
          rate: parseFloat(v.rate || 0),
          monthlyPayment: roundMoney(parseFloat(v.payment || 0))
        }))
      };
    };
    // One entry per section of the report. This list is the single source of
    // truth for three things that used to be maintained separately and could
    // drift: the JSON schema the model must fill, the order sections render
    // in, and their on-screen titles.
    //
    // It replaces splitting the reply on `##` headers. That approach had the
    // model responsible for the document's structure as well as its content —
    // a renamed header produced an unstyled section, a dropped one vanished
    // silently, and the order had to be re-imposed afterwards because cached
    // reports predated the ordering instruction. A schema makes the shape the
    // API's job instead: every key arrives, spelled correctly, every time.
    const AI_SECTIONS = [
      { key: "executive_summary", title: "Executive Summary", wide: true, numbered: false, prompt: "2-4 bullets summarising the overall position." },
      { key: "priority_actions", title: "Priority Action Items", wide: true, numbered: true, prompt: "Exactly the top 5 actions, most important first, each with a concrete dollar target where possible." },
      { key: "cash_flow_risk", title: "Cash Flow & Risk", wide: false, numbered: false, prompt: "2-4 bullets on cash flow timing and the risk of running low." },
      { key: "budget_performance", title: "Budget Performance", wide: false, numbered: false, prompt: "2-4 bullets on actual spending against budget targets." },
      { key: "spending_analysis", title: "Spending Analysis", wide: false, numbered: false, prompt: "2-4 bullets on where the money goes and what stands out." },
      { key: "debt_management", title: "Debt Management", wide: false, numbered: false, prompt: "2-4 bullets on debt balances, rates and payoff priority." },
      { key: "income_analysis", title: "Income Analysis", wide: false, numbered: false, prompt: "2-4 bullets on income sources, stability and concentration." },
      { key: "savings_goals", title: "Savings Goals", wide: false, numbered: false, prompt: "One bullet per goal: percent funded, on or off track for its target date, and the exact monthly adjustment if off track." }
    ];
    const AI_REPORT_SCHEMA = (() => {
      const properties = {
        score: { type: "integer", description: "Overall financial health from 1 (severe distress) to 10 (excellent)." },
        score_rationale: { type: "string", description: "One sentence justifying the score." }
      };
      AI_SECTIONS.forEach((s) => {
        properties[s.key] = { type: "array", description: s.prompt, items: { type: "string" } };
      });
      return {
        type: "object",
        properties,
        required: ["score", "score_rationale"].concat(AI_SECTIONS.map((s) => s.key)),
        additionalProperties: false
      };
    })();
    const runAssessment = async () => {
      var _a;
      if (!aiCanRun(apiKey)) {
        setErr("No API key configured. Please add your Anthropic API key in Settings \u2192 General.");
        return;
      }
      setLoading(true);
      setErr("");
      setReport(null);
      setTruncated(false);
      const ctx = buildContext();
      const prompt = `You are a certified financial planner reviewing a personal budget for ${ctx.year}. Analyse the financial data below and provide a comprehensive, actionable assessment. Be specific \u2014 reference actual dollar amounts and category names from the data.

FINANCIAL DATA (${ctx.reportingWindow}):
Opening Balance: $${centsToDollars(ctx.openingBalance).toLocaleString()}
Closing Balance: $${centsToDollars(ctx.closingBalance).toLocaleString()}
Total Income: $${centsToDollars(ctx.totalIncome).toLocaleString()}
Total Expenses: $${centsToDollars(ctx.totalExpenses).toLocaleString()}
Net Surplus/Shortfall: $${centsToDollars(ctx.totalSurplus).toLocaleString()} (${ctx.totalSurplus >= 0 ? "+" : ""}${ctx.savingsRatePct}% savings rate)
Lowest Balance This Period: $${centsToDollars(ctx.lowestBalance).toLocaleString()}
Average Monthly Expenses: $${centsToDollars(ctx.avgMonthlyExpense).toLocaleString()}

MONTHLY BREAKDOWN:
${ctx.monthlyBreakdown.map((m) => `  ${m.month}: Income $${centsToDollars(m.income).toLocaleString()}, Expenses $${centsToDollars(m.expenses).toLocaleString()}, ${m.surplus >= 0 ? "Surplus" : "Shortfall"} $${Math.abs(centsToDollars(m.surplus)).toLocaleString()}, Balance $${centsToDollars(m.closingBalance).toLocaleString()}`).join("\n")}

TOP EXPENSE CATEGORIES (YTD):
${ctx.topExpenseCategories.map((c) => `  ${c.category}: $${centsToDollars(c.total).toLocaleString()} (${c.pctOfExpenses}% of expenses)`).join("\n")}

INCOME SOURCES:
${ctx.incomeCategories.map((c) => `  ${c.category}: $${centsToDollars(c.total).toLocaleString()}`).join("\n")}

${ctx.debtObligations.length ? `DEBT / CREDIT OBLIGATIONS (YTD paid):
${ctx.debtObligations.map((d) => `  ${d.category}: $${centsToDollars(d.ytdPaid).toLocaleString()}`).join("\n")}` : "No debt categories identified."}

${((_a = ctx.debtTrackerItems) == null ? void 0 : _a.length) ? `DEBT TRACKER (user-entered balances & rates):
${ctx.debtTrackerItems.map((d) => `  ${d.name}: Balance $${centsToDollars(d.balance).toLocaleString()}, Rate ${d.rate}%, Payment $${centsToDollars(d.monthlyPayment).toLocaleString()}/mo`).join("\n")}` : "No debt balances entered in tracker yet."}

${ctx.hasBudgetTargets ? `BUDGET VS ACTUAL (top variances):
${ctx.budgetVsActual.map((r) => `  ${r.category}: Actual $${centsToDollars(r.actual).toLocaleString()} vs Target $${centsToDollars(r.target).toLocaleString()} (${r.variance >= 0 ? "over" : "under"} by $${Math.abs(centsToDollars(r.variance)).toLocaleString()})`).join("\n")}` : "No budget targets have been set yet."}

Fill every field of the response schema. Rules:
- Each bullet is one short sentence (under ~18 words), anchored to a specific dollar amount or category from the data above.
- No preamble, no restating the data tables, no generic advice, no hedging filler ("consider", "you may want to").
- Plain text only in every string: no markdown, no leading bullet characters, no numbering.`;
      try {
        const { data, truncated: cut } = await callClaude({
          system: "You are a certified financial planner specialising in personal budgeting and cash flow management. Be blunt and brief: short, numbers-first bullets, no filler.",
          messages: [{ role: "user", content: prompt }],
          schema: AI_REPORT_SCHEMA,
          // Adaptive thinking draws on the same budget as the visible answer,
          // so this has to cover both. The old 1200 was sized for a
          // thinking-off model and would truncate the report itself now.
          maxTokens: 4e3,
          effort: "high",
          apiKey
        });
        setReport(data);
        setTruncated(cut);
        setLastRun(/* @__PURE__ */ new Date());
        saveReport(data);
      } catch (e) {
        setErr(aiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    const slugifySection = (t) => "ai-sec-" + t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const sectionIcon = {
      "Executive Summary": "chart-bar",
      "Income Analysis": "banknote",
      "Spending Analysis": "chart-down",
      "Debt Management": "credit-card",
      "Savings Goals": "target",
      "Budget Performance": "target",
      "Cash Flow & Risk": "alert-triangle",
      "Priority Action Items": "check-circle"
    };
    const sectionColor = {
      "Executive Summary": "var(--primary)",
      "Income Analysis": "var(--greenDk)",
      "Spending Analysis": "var(--amberInk)",
      "Debt Management": "var(--red)",
      "Savings Goals": "var(--greenDk)",
      "Budget Performance": "var(--primary)",
      "Cash Flow & Risk": "var(--amberInk)",
      "Priority Action Items": "var(--greenDk)"
    };
    // AI_SECTIONS already fixes the order, so there is nothing to re-sort: the
    // model fills named fields and can't return them out of sequence. Sections
    // it had nothing to say about are dropped rather than rendered as an empty
    // card.
    const reportSections = useMemo(() => {
      if (!report) return null;
      return AI_SECTIONS.map((s) => ({
        key: s.key,
        title: s.title,
        wide: s.wide,
        numbered: s.numbered,
        items: (Array.isArray(report[s.key]) ? report[s.key] : []).filter((t) => t && String(t).trim())
      })).filter((s) => s.items.length);
    }, [report]);
    // The same numbers the model was given, used to draw charts next to its
    // bullets — the visual carries the data, the text carries the judgement.
    const vizCtx = useMemo(() => {
      try {
        return report ? buildContext() : null;
      } catch (e) {
        return null;
      }
    }, [report, flow, openBal, budgetTargets, activeYear, goals, debtData]);
    const sectionViz = (t) => {
      const c = vizCtx;
      if (!c) return null;
      const wrap = (kids) => /* @__PURE__ */ React.createElement("div", { className: "mb-14" }, kids);
      if (t === "Spending Analysis" && c.topExpenseCategories.length) {
        const rows = c.topExpenseCategories.slice(0, 5);
        const max = rows[0].total || 1;
        return wrap(rows.map((r) => /* @__PURE__ */ React.createElement(VizRow, { key: r.category, label: r.category, fillPct: r.total / max * 100, fillColor: "var(--accent)", value: fmt(r.total), sub: r.pctOfExpenses + "%", rowTitle: `${r.category}: ${fmt(r.total)} (${r.pctOfExpenses}% of expenses)` })));
      }
      if (t === "Income Analysis" && c.incomeCategories.length) {
        const rows = c.incomeCategories.slice(0, 5);
        const max = rows[0].total || 1;
        return wrap(rows.map((r) => /* @__PURE__ */ React.createElement(VizRow, { key: r.category, label: r.category, fillPct: r.total / max * 100, fillColor: "var(--greenDk)", value: fmt(r.total), rowTitle: `${r.category}: ${fmt(r.total)} YTD` })));
      }
      if (t === "Budget Performance" && c.budgetVsActual.length) {
        const rows = c.budgetVsActual.slice(0, 5);
        return wrap(rows.map((r) => /* @__PURE__ */ React.createElement(VizRow, { key: r.category, label: r.category, fillPct: r.target > 0 ? r.actual / r.target * 100 : 100, fillColor: r.variance > 0 ? "var(--red)" : "var(--greenDk)", value: fmt(r.actual), sub: `/ ${fmt(r.target)} \u00B7 ${r.variance > 0 ? "over" : "under"} by ${fmt(Math.abs(r.variance))}`, rowTitle: `${r.category}: actual ${fmt(r.actual)} vs target ${fmt(r.target)}` })));
      }
      if (t === "Debt Management" && (c.debtTrackerItems.length || c.debtObligations.length)) {
        if (c.debtTrackerItems.length) {
          const max = Math.max(...c.debtTrackerItems.map((d) => d.balance), 1);
          return wrap(c.debtTrackerItems.map((d) => /* @__PURE__ */ React.createElement(VizRow, { key: d.name, label: d.name + (d.rate ? ` \u00B7 ${d.rate}%` : ""), fillPct: d.balance / max * 100, fillColor: "var(--accent)", value: fmt(d.balance), sub: d.monthlyPayment ? `\u00B7 ${fmt(d.monthlyPayment)}/mo` : "", rowTitle: `${d.name}: balance ${fmt(d.balance)} at ${d.rate}%` })));
        }
        const max = Math.max(...c.debtObligations.map((d) => d.ytdPaid), 1);
        return wrap(c.debtObligations.slice(0, 5).map((d) => /* @__PURE__ */ React.createElement(VizRow, { key: d.category, label: d.category, fillPct: d.ytdPaid / max * 100, fillColor: "var(--accent)", value: fmt(d.ytdPaid), sub: "paid YTD", rowTitle: `${d.category}: ${fmt(d.ytdPaid)} paid YTD` })));
      }
      if (t === "Savings Goals" && c.savingsGoals.length) {
        return wrap(c.savingsGoals.map((g) => /* @__PURE__ */ React.createElement(VizRow, { key: g.name, label: g.name, fillPct: g.pct, fillColor: "var(--greenDk)", value: g.pct + "%", sub: `${fmt(g.saved)} / ${fmt(g.target)}`, rowTitle: `${g.name}: ${fmt(g.saved)} of ${fmt(g.target)} (${g.pct}%)` })));
      }
      if (t === "Cash Flow & Risk" && c.monthlyBreakdown.length) {
        const maxAbs = Math.max(...c.monthlyBreakdown.map((m) => Math.abs(m.surplus)), 1);
        return /* @__PURE__ */ React.createElement("div", { className: "mb-14" }, /* @__PURE__ */ React.createElement("div", { className: "cashflow-chart-label" }, "Monthly surplus (above line) / shortfall (below line)"), /* @__PURE__ */ React.createElement("div", { className: "cashflow-bars-row" }, c.monthlyBreakdown.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.month, title: `${m.month}: ${fmt(m.surplus, true)}`, className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "cashflow-bar-container" }, /* @__PURE__ */ React.createElement("div", { className: "cashflow-zero-line" }), /* @__PURE__ */ React.createElement("div", { className: "cashflow-bar", style: { background: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)", height: Math.max(2, Math.round(Math.abs(m.surplus) / maxAbs * 26)), bottom: m.surplus >= 0 ? "50%" : "auto", top: m.surplus < 0 ? "50%" : "auto" } })), /* @__PURE__ */ React.createElement("div", { className: "cashflow-month-label" }, m.month[0])))));
      }
      return null;
    };
    // Three separate reasons the button can't run, each worth its own message:
    // no transport configured at all, no network, or a run already in flight.
    // Previously only the key was checked, so an offline tap failed with
    // "check your API key and internet connection" after a pointless round
    // trip.
    const canRun = aiCanRun(apiKey);
    const disabled = loading || !canRun || isOffline;
    const blockedReason = isOffline ? "You're offline — generating an assessment needs a connection." : !canRun ? "AI features aren't set up yet." : "";
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" },
      /* @__PURE__ */ React.createElement(Card, { className: "mb-20" },
        /* @__PURE__ */ React.createElement("div", { className: "ai-header-row" },
          /* @__PURE__ */ React.createElement("div", null,
            /* @__PURE__ */ React.createElement("div", { className: "ai-title" }, "✦ AI Financial Assessment — ", activeYear),
            /* @__PURE__ */ React.createElement("div", { className: "ai-subtitle" }, "Claude reviews your ", activeYear, " budget data and provides personalised suggestions on spending, debt, cash flow and financial health.")
          ),
          lastRun && /* @__PURE__ */ React.createElement("div", { className: "ai-lastrun" }, "Last run: ", lastRun.toLocaleTimeString())
        ),
        blockedReason && /* @__PURE__ */ React.createElement("div", { className: "ai-noapikey-banner", role: "status" },
          /* @__PURE__ */ React.createElement("span", { className: "alert-banner-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: isOffline ? "alert-triangle" : "key", size: 18 })),
          /* @__PURE__ */ React.createElement("div", { className: "txm" }, blockedReason, !canRun && !isOffline && /* @__PURE__ */ React.createElement(React.Fragment, null, " Add your Anthropic API key in", " ",
            /* @__PURE__ */ React.createElement("button", { onClick: () => setTab("settings"), className: "ai-settings-link" }, "Settings → General"),
            ", or deploy the ai-proxy Edge Function so this household shares one server-side key."
          ))
        ),
        canRun && /* @__PURE__ */ React.createElement("div", { className: "ai-disclaimer-row" },
          /* @__PURE__ */ React.createElement("span", { className: "ai-disclaimer-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "key", size: 12 })),
          /* @__PURE__ */ React.createElement("span", null, proxyReady ? "Running this sends your budget data to Claude through your project's ai-proxy function. Your API key stays on the server." : "Running this sends your budget data and API key straight to Anthropic from this browser.")
        ),
        /* @__PURE__ */ React.createElement("div", { className: "ai-actionrow" },
          /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: runAssessment,
              disabled,
              title: blockedReason || void 0,
              className: "ai-generate-btn",
              style: {
                cursor: disabled ? "not-allowed" : "pointer",
                background: disabled ? "var(--border)" : "var(--primary)",
                color: disabled ? "var(--textMid)" : "#fff"
              }
            },
            loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "ai-spinner" }, "⟳"), " Analysing your finances…") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "✦"), " Generate AI Assessment")
          ),
          report && /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => {
                setReport(null);
                setTruncated(false);
                setLastRun(null);
                try {
                  localStorage.removeItem(CACHE_KEY);
                } catch (e) {
                  // Storage can throw outright in private/partitioned modes.
                  // Nothing here is essential to the current interaction, so a
                  // failure is genuinely ignorable — real save failures surface
                  // via notifyStorageWriteFailure.
                }
              },
              className: "cf-btn cf-btn--secondary cf-btn--wide"
            },
            "Clear"
          )
        ),

        err && /* @__PURE__ */ React.createElement("div", { className: "ai-error-banner", role: "alert" }, "⚠ ", err),
        truncated && /* @__PURE__ */ React.createElement("div", { className: "ai-error-banner", role: "status" }, "⚠ Claude ran out of room before finishing this report — some sections may be short. Re-run to try again.")
      ),
      loading && /* @__PURE__ */ React.createElement("div", { className: "ai-skeleton-wrap" }, AI_SECTIONS.slice(0, 5).map((s) => /* @__PURE__ */ React.createElement(Card, { key: s.key }, /* @__PURE__ */ React.createElement("div", { className: "ai-skeleton-title" }), [80, 100, 65, 90].map((w, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ai-skeleton-line", style: { width: `${w}%` } }))))),
      reportSections && !loading && /* @__PURE__ */ React.createElement(React.Fragment, null,
        /* @__PURE__ */ React.createElement("div", { className: "settings-quicklinks ai-quicklinks" }, reportSections.map((section) => {
          const anchorId = slugifySection(section.title);
          return /* @__PURE__ */ React.createElement(
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
            section.title
          );
        })),
        // The score is a field on the response now, not something scraped back
        // out of the prose with a regex that had to guess between "8/10" and
        // "Score: 8".
        Number.isFinite(report.score) && (() => {
          const score = Math.max(1, Math.min(10, Math.round(report.score)));
          const color = score >= 7 ? "var(--greenDk)" : score >= 4 ? "var(--amberInk)" : "var(--red)";
          return /* @__PURE__ */ React.createElement("div", { className: "ai-score-badge", style: { border: `2px solid ${color}`, boxShadow: `0 0 0 4px ${color}22` } },
            /* @__PURE__ */ React.createElement("div", { className: "ai-score-number", style: { color } }, score, /* @__PURE__ */ React.createElement("span", { className: "ai-score-outof" }, "/10")),
            /* @__PURE__ */ React.createElement("div", null,
              /* @__PURE__ */ React.createElement("div", { className: "ai-score-label" }, "Financial Health Score"),
              /* @__PURE__ */ React.createElement("div", { className: "txm" }, report.score_rationale || (score >= 8 ? "Strong financial position — keep building on this foundation." : score >= 6 ? "Good foundation with clear areas for improvement." : score >= 4 ? "Several areas need attention — see action items below." : "Significant financial stress detected — prioritise the action items."))
            )
          );
        })(),
        vizCtx && /* @__PURE__ */ React.createElement("div", { className: "kpi-grid-4" },
          /* @__PURE__ */ React.createElement(KpiCard, { label: "Savings Rate", value: vizCtx.savingsRatePct + "%", color: vizCtx.savingsRatePct >= 0 ? "var(--greenDk)" : "var(--red)", sub: vizCtx.reportingWindow }),
          /* @__PURE__ */ React.createElement(KpiCard, { label: "YTD Surplus", value: fmt(vizCtx.totalSurplus, true), color: vizCtx.totalSurplus >= 0 ? "var(--greenDk)" : "var(--red)", sub: `${fmt(vizCtx.totalIncome)} in · ${fmt(vizCtx.totalExpenses)} out` }),
          /* @__PURE__ */ React.createElement(KpiCard, { label: "Lowest Balance", value: fmt(vizCtx.lowestBalance), color: vizCtx.lowestBalance < 0 ? "var(--red)" : "var(--text)", sub: "this period" }),
          /* @__PURE__ */ React.createElement(KpiCard, { label: "Closing Balance", value: fmt(vizCtx.closingBalance), color: "var(--text)", sub: "current month" })
        ),
        /* @__PURE__ */ React.createElement("div", { className: "ai-report-grid" }, reportSections.map((section) => /* @__PURE__ */ React.createElement(
          Card,
          { key: section.key, id: slugifySection(section.title), className: "ai-section-card", style: { gridColumn: section.wide ? "1 / -1" : "auto" } },
          /* @__PURE__ */ React.createElement("div", { className: "ai-section-header" },
            /* @__PURE__ */ React.createElement("span", { style: { color: sectionColor[section.title] || "var(--primary)" } }, /* @__PURE__ */ React.createElement(Icon, { name: sectionIcon[section.title] || "clipboard", size: 20 })),
            /* @__PURE__ */ React.createElement("div", { className: "ai-section-title", style: { color: sectionColor[section.title] || "var(--primary)" } }, section.title)
          ),
          sectionViz(section.title),
          // Items are plain sentences from a schema-constrained reply, so the
          // markdown handling this used to do — stripping **bold**, spotting
          // "1." and "- " prefixes, detecting indentation — has nothing left to
          // parse. Numbering comes from the section definition instead of from
          // characters the model happened to emit.
          section.items.map((text, li) => section.numbered ? /* @__PURE__ */ React.createElement("div", { key: li, className: "ai-numbered-row" },
            /* @__PURE__ */ React.createElement("div", { className: "ai-numbered-badge" }, li + 1),
            /* @__PURE__ */ React.createElement("div", { className: "ai-item-text" }, /* @__PURE__ */ React.createElement(BoldText, { text }))
          ) : (() => {
            const isWarning = /(over budget|exceeded|shortfall|risk|concern|warning|negative|debt|danger|critical|problem|unsustainable)/i.test(text);
            const isPositive = /(well|strong|excellent|good|under budget|saving|positive|recommendation)/i.test(text);
            return /* @__PURE__ */ React.createElement("div", { key: li, className: "ai-bullet-row", style: { marginBottom: 8 } },
              /* @__PURE__ */ React.createElement("div", { className: "ai-bullet-dot", style: { width: 6, height: 6, background: isWarning ? "var(--amberInk)" : isPositive ? "var(--greenDk)" : "var(--navyLt)", marginTop: 7 } }),
              /* @__PURE__ */ React.createElement("div", { className: "ai-item-text" }, /* @__PURE__ */ React.createElement(BoldText, { text }))
            );
          })())
        ))),
        /* @__PURE__ */ React.createElement("div", { className: "ai-footer-disclaimer" }, "AI assessment generated by Claude. This is not professional financial advice. Always consult a certified financial planner for major decisions.")
      ),
      !report && !loading && !err && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { className: "ai-empty-wrap" },
        /* @__PURE__ */ React.createElement("div", { className: "ai-empty-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "sparkle", size: 40 })),
        /* @__PURE__ */ React.createElement("div", { className: "ai-empty-title" }, canRun ? "Ready to analyse your finances" : "What an assessment covers"),
        /* @__PURE__ */ React.createElement("div", { className: "ai-empty-desc" }, canRun ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Click ", /* @__PURE__ */ React.createElement("strong", null, "Generate AI Assessment"), ". Claude will review") : "Once AI is set up, Claude will review", " your income, expenses, debt obligations, budget performance and cash flow for ", activeYear, " and provide personalised recommendations."),
        /* @__PURE__ */ React.createElement("div", { className: "ai-empty-feature-grid" }, [
          { icon: "chart-bar", label: "Executive Summary" },
          { icon: "banknote", label: "Income Analysis" },
          { icon: "chart-down", label: "Spending Analysis" },
          { icon: "credit-card", label: "Debt Management" },
          { icon: "target", label: "Budget vs Actual" },
          { icon: "check-circle", label: "Priority Actions" }
        ].map(({ icon, label }) => /* @__PURE__ */ React.createElement("div", { key: label, className: "ai-feature-card" },
          /* @__PURE__ */ React.createElement("div", { className: "ai-feature-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 20 })),
          /* @__PURE__ */ React.createElement("div", { className: "ai-feature-label" }, label)
        )))
      ))
    );
  }
