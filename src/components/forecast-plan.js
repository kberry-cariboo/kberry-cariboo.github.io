  function ForecastView({ yearFlows, yearConfigs, openBalByYear, alertThreshold = DEFAULT_ALERT_THRESHOLD, globalSearch = "", budgetTargets = {}, horizon = 90, setHorizon = () => {
  }, categories = [], categoryColors = {}, addEntry = null, templates = [], setTemplates = null }) {
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
    const dangerDays = futureEvents.filter((ev) => ev.balance < alertThreshold);
    const lowestBalance = futureEvents.length ? Math.min(...futureEvents.map((e) => e.balance)) : null;
    const searchedEvents = futureEvents.filter((ev) => eventMatchesSearch(ev, gq2));
    const pgInfo = isMobile ? cumulativeRows(searchedEvents, mobileLoaded, pgSize) : paginateRows(searchedEvents, pgPage, pgSize);
    useInfiniteScroll(isMobile && pgInfo.hasMore, () => setMobileLoaded((l) => l + 1));
    const pagedEvents = pgInfo.rows;
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "forecast-header-row" }, /* @__PURE__ */ React.createElement("span", { className: "forecast-label" }, horizon, "-Day Forecast"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 cf-wrap" }, /* @__PURE__ */ React.createElement(PillToggle, { options: horizons.map((h) => ({ id: h, label: h + " days" })), value: horizon, onChange: setHorizon }))), /* @__PURE__ */ React.createElement("div", { className: "txm" }, "Rolling cash flow from today"), gq2 && /* @__PURE__ */ React.createElement("div", { className: "search-filter-banner" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering forecast by "', globalSearch, '" \u2014 ', futureEvents.length, " match", futureEvents.length !== 1 ? "es" : "")), dangerDays.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "forecast-danger-banner" }, /* @__PURE__ */ React.createElement("div", { className: "forecast-danger-title" }, "\u26A0 ", dangerDays.length, " event", dangerDays.length > 1 ? "s" : "", " within ", horizon, " days where balance drops below ", fmt(alertThreshold)), /* @__PURE__ */ React.createElement("div", { className: "txm" }, "Lowest projected balance in next ", horizon, " days: ", /* @__PURE__ */ React.createElement("strong", { className: "forecast-lowest-value", style: { color: lowestBalance < 0 ? "var(--red)" : "var(--amber)" } }, fmt(lowestBalance)))), /* @__PURE__ */ React.createElement("div", { className: "forecast-exportbar-row" }, /* @__PURE__ */ React.createElement(
      ExportBar,
      {
        onAdd: addEntry ? () => setShowAddEntry(true) : null,
        onCSV: futureEvents.length === 0 ? null : () => {
          const rows = searchedEvents.map((ev) => {
            const dateStr = `${MONTHS[ev.month]} ${ev.day}, ${ev.year}`;
            return [dateStr, ev.desc, ev.category, ev.type === "income" ? centsToDollars(ev.amount) : "", ev.type === "expense" ? centsToDollars(ev.amount) : "", centsToDollars(ev.balance)];
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
        templates,
        setTemplates
      }
    ), futureEvents.length === 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("p", { className: "forecast-empty-text" }, "No upcoming events in the next ", horizon, " days.")), futureEvents.length > 0 && /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll hscroll--paged", tabIndex: 0, role: "region", "aria-label": "Forecast table" }, /* @__PURE__ */ React.createElement("table", { className: "forecast-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, (isMobile ? ["Date", "Description", "Amount", "Balance"] : ["Date", "Description", "Category", "In", "Out", "Balance", "Confidence"]).map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: (h === "Category" ? "forecast-col-cat " : "") + (h === "Confidence" ? "forecast-conf-col " : "") + "forecast-th", style: {
      textAlign: i >= (isMobile ? 2 : 3) ? "right" : "left"
    } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, pagedEvents.map((ev, i) => {
      const dateStr = `${MONTHS[ev.month]} ${ev.day}${ev.year !== today.getFullYear() ? ` '${String(ev.year).slice(2)}` : ""}`;
      return /* @__PURE__ */ React.createElement("tr", { key: ev.id, className: "forecast-tr", style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" } }, /* @__PURE__ */ React.createElement("td", { className: "forecast-td-date" }, dateStr), /* @__PURE__ */ React.createElement("td", { className: "forecast-desc-cell", style: { maxWidth: isMobile ? 140 : 180 } }, ev.desc), !isMobile && /* @__PURE__ */ React.createElement("td", { className: "forecast-col-cat" }, /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors })), !isMobile && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 forecast-td-income" }, ev.type === "income" ? fmt(ev.amount) : ""), !isMobile && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 forecast-td-expense" }, ev.type === "expense" ? fmt(ev.amount) : ""), isMobile && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 forecast-td-amount-mobile", style: { color: ev.type === "income" ? "var(--greenDk)" : "var(--text)" } }, fmt(ev.type === "income" ? ev.amount : -ev.amount, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 forecast-td-balance", style: {
        color: ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amber)" : "var(--text)",
        background: ev.balance < 0 ? "var(--redLt)" : ev.balance < alertThreshold ? "var(--amberLt)" : "transparent"
      } }, fmt(ev.balance)), !isMobile && (() => {
        const m = ev.month;
        const cat = ev.category;
        const yr = ev.year;
        const target = (budgetTargets[`${yr}:${m}`] || {})[cat] || 0;
        const isIncome = ev.type === "income";
        if (isIncome) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, /* @__PURE__ */ React.createElement("span", { className: "c-textLt", title: "Scheduled income" }, "\u2713"));
        if (!target) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, "\u2014");
        const pct = Math.round(ev.amount / target * 100);
        const conf = pct <= 100 ? 100 : pct <= 120 ? 75 : pct <= 150 ? 50 : 25;
        if (conf === 100) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, /* @__PURE__ */ React.createElement("span", { className: "c-textLt", title: "Within budget target" }, "\u2713"));
        const color = conf >= 50 ? "var(--amber)" : "var(--red)";
        return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col" }, /* @__PURE__ */ React.createElement("span", { className: "forecast-conf-pct", style: { color }, title: "Amount exceeds the monthly budget target" }, conf, "%"));
      })());
    })))), /* @__PURE__ */ React.createElement(GridPagination, { pageInfo: pgInfo, setPage: setPgPage, pageSize: pgSize, setPageSize: changePageSize, label: "events", isMobile })));
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
      /* @__PURE__ */ React.createElement("div", { key: "s0" }, /* @__PURE__ */ React.createElement("div", { className: "wizard-step-icon wizard-icon--primary" }, /* @__PURE__ */ React.createElement(Icon, { name: "banknote", size: 34 })), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-title" }, "Welcome to CashFlow!"), /* @__PURE__ */ React.createElement("div", { className: "wizard-step-subtitle wizard-step-subtitle--lh" }, "Let's set up your budget in 3 quick steps. First, what's your current bank balance?"), /* @__PURE__ */ React.createElement("div", { className: "wizard-amount-row" }, /* @__PURE__ */ React.createElement("span", { className: "wizard-dollar-lg" }, "$"), /* @__PURE__ */ React.createElement(
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
      ), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "c-textMid" }, "$"), /* @__PURE__ */ React.createElement(
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
      ), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "c-textMid" }, "$"), /* @__PURE__ */ React.createElement(
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
  function AIInsightsView({ flow, openBal, yearConfigs, budgetTargets, activeYear, categories = [], apiKey = "", goals = [], debtData = {}, setTab = () => {
  } }) {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [rawText, setRawText] = useState("");
    const [err, setErr] = useState("");
    const [lastRun, setLastRun] = useState(null);
    const CACHE_KEY = `cf_ai_report_${activeYear}`;
    useEffect(() => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { text, ts } = JSON.parse(cached);
          if (text) {
            setRawText(text);
            setReport(parseReport(text));
            setLastRun(new Date(ts));
          }
        }
      } catch (e) {
      }
    }, [activeYear]);
    const saveReport = (text) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ text, ts: (/* @__PURE__ */ new Date()).toISOString() }));
      } catch (e) {
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
        if (e.type === "expense") expenseCats[e.category] = (expenseCats[e.category] || 0) + e.amount;
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
    const parseReport = (text) => {
      const sections = [];
      const lines = text.split("\n");
      let current = null;
      lines.forEach((line) => {
        const h2 = line.match(/^##\s+(.+)/);
        const h3 = line.match(/^###\s+(.+)/);
        if (h2) {
          if (current) sections.push(current);
          current = { title: h2[1], level: 2, items: [] };
        } else if (h3) {
          if (current) sections.push(current);
          current = { title: h3[1], level: 3, items: [] };
        } else if (current) {
          current.items.push(line);
        } else if (line.trim()) {
          if (!sections.length) sections.push({ title: "Overview", level: 2, items: [] });
          sections[0].items.push(line);
        }
      });
      if (current) sections.push(current);
      return sections.filter((s) => s.items.some((l) => l.trim()));
    };
    const runAssessment = async () => {
      var _a, _b, _c;
      if (!apiKey.trim()) {
        setErr("No API key configured. Please add your Anthropic API key in Settings \u2192 General.");
        return;
      }
      setLoading(true);
      setErr("");
      setReport(null);
      setRawText("");
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

Provide your assessment using these EXACT section headers, in this order (markdown ## format):
## Executive Summary
## Priority Action Items
## Cash Flow & Risk
## Budget Performance
## Spending Analysis
## Debt Management
## Income Analysis
## Savings Goals

Keep it tight and scannable \u2014 this renders on a dashboard, not in a letter:
- 2-4 bullets (- ) per section, one short sentence each (under ~18 words), every bullet anchored to a specific dollar amount or category from the data.
- No preamble, no restating the data tables, no generic advice, no hedging filler ("consider", "you may want to").
- Savings Goals: one bullet per goal \u2014 percent funded, on/off track for its target date, and the exact monthly adjustment if off track.
- Priority Action Items: exactly the top 5 as a numbered list, one line each, with a concrete dollar target where possible.
- Finish with "Score: N/10" and one sentence of justification.`;
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey.trim(),
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: "claude-sonnet-5",
            max_tokens: 1200,
            // This report is a short, structured dashboard blurb on a tight
            // token budget — thinking would spend from max_tokens, so keep it off.
            thinking: { type: "disabled" },
            system: "You are a certified financial planner specialising in personal budgeting and cash flow management. Be blunt and brief: short, numbers-first bullets, no filler. Format responses in clean Markdown.",
            messages: [{ role: "user", content: prompt }]
          })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(((_b = e == null ? void 0 : e.error) == null ? void 0 : _b.message) || `API error ${res.status}`);
        }
        const data = await res.json();
        if (data.stop_reason === "refusal") {
          throw new Error("The model declined to analyse this data. Try again, or adjust your entries.");
        }
        const text = ((_c = data.content) == null ? void 0 : _c.filter((b) => b.type === "text").map((b) => b.text || "").join("")) || "";
        if (data.stop_reason === "max_tokens") {
          console.warn("AI report truncated at max_tokens");
        }
        setRawText(text);
        setReport(parseReport(text));
        setLastRun(/* @__PURE__ */ new Date());
        saveReport(text);
      } catch (e) {
        setErr(`Analysis failed: ${e.message}. Check your API key and internet connection.`);
      } finally {
        setLoading(false);
      }
    };
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
      "Spending Analysis": "var(--amber)",
      "Debt Management": "var(--red)",
      "Savings Goals": "var(--greenDk)",
      "Budget Performance": "var(--primary)",
      "Cash Flow & Risk": "var(--amber)",
      "Priority Action Items": "var(--greenDk)"
    };
    // Sections render most-actionable-first regardless of the order the model
    // produced (older cached reports predate the ordered prompt).
    const SECTION_ORDER = ["Executive Summary", "Priority Action Items", "Cash Flow & Risk", "Budget Performance", "Spending Analysis", "Debt Management", "Income Analysis", "Savings Goals"];
    const orderedReport = useMemo(() => {
      if (!report) return null;
      const rank = (t) => {
        const i = SECTION_ORDER.indexOf(t);
        return i < 0 ? 99 : i;
      };
      return [...report].sort((a, b) => rank(a.title) - rank(b.title));
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
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement(Card, { className: "mb-20" }, /* @__PURE__ */ React.createElement("div", { className: "ai-header-row" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "ai-title" }, "\u2726 AI Financial Assessment \u2014 ", activeYear), /* @__PURE__ */ React.createElement("div", { className: "ai-subtitle" }, "Claude reviews your ", activeYear, " budget data and provides personalised suggestions on spending, debt, cash flow and financial health. Requires an Anthropic API key.")), lastRun && /* @__PURE__ */ React.createElement("div", { className: "ai-lastrun" }, "Last run: ", lastRun.toLocaleTimeString())), !apiKey.trim() && /* @__PURE__ */ React.createElement("div", { className: "ai-noapikey-banner" }, /* @__PURE__ */ React.createElement("span", { className: "alert-banner-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "key", size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "txm" }, "No API key configured. Add your Anthropic API key in", " ", /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTab("settings"),
        className: "ai-settings-link"
      },
      "Settings \u2192 General"
    ), ".")), apiKey.trim() && /* @__PURE__ */ React.createElement("div", { className: "ai-disclaimer-row" }, /* @__PURE__ */ React.createElement("span", { className: "ai-disclaimer-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "key", size: 12 })), /* @__PURE__ */ React.createElement("span", null, "Running this sends your budget data and API key straight to Anthropic from your browser.")), /* @__PURE__ */ React.createElement("div", { className: "ai-actionrow" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: runAssessment,
        disabled: loading || !apiKey.trim(),
        className: "ai-generate-btn",
        style: {
          cursor: loading || !apiKey.trim() ? "not-allowed" : "pointer",
          background: loading || !apiKey.trim() ? "var(--border)" : "var(--primary)",
          color: loading || !apiKey.trim() ? "var(--textMid)" : "#fff"
        }
      },
      loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "ai-spinner" }, "\u27F3"), " Analysing your finances\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2726"), " Generate AI Assessment")
    ), report && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setReport(null);
          setRawText("");
          setLastRun(null);
          try {
            localStorage.removeItem(CACHE_KEY);
          } catch (e) {
          }
        },
        className: "cf-btn cf-btn--secondary cf-btn--wide"
      },
      "Clear"
    )), err && /* @__PURE__ */ React.createElement("div", { className: "ai-error-banner", role: "alert" }, "\u26A0 ", err)), loading && /* @__PURE__ */ React.createElement("div", { className: "ai-skeleton-wrap" }, ["Executive Summary", "Income Analysis", "Spending Analysis", "Debt Management", "Priority Action Items"].map((s) => /* @__PURE__ */ React.createElement(Card, { key: s }, /* @__PURE__ */ React.createElement("div", { className: "ai-skeleton-title" }), [80, 100, 65, 90].map((w, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ai-skeleton-line", style: {
      width: `${w}%`
    } }))))), report && !loading && /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
      const match = rawText.match(/\b([1-9]|10)\s*\/\s*10\b|\bscore[:\s]+([1-9]|10)\b/i);
      if (!match) return null;
      const score = parseInt(match[1] || match[2]);
      const color = score >= 7 ? "var(--greenDk)" : score >= 4 ? "var(--amber)" : "var(--red)";
      return /* @__PURE__ */ React.createElement("div", { className: "ai-score-badge", style: {
        border: `2px solid ${color}`,
        boxShadow: `0 0 0 4px ${color}22`
      } }, /* @__PURE__ */ React.createElement("div", { className: "ai-score-number", style: { color } }, score, /* @__PURE__ */ React.createElement("span", { className: "ai-score-outof" }, "/10")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "ai-score-label" }, "Financial Health Score"), /* @__PURE__ */ React.createElement("div", { className: "txm" }, score >= 8 ? "Strong financial position \u2014 keep building on this foundation." : score >= 6 ? "Good foundation with clear areas for improvement." : score >= 4 ? "Several areas need attention \u2014 see action items below." : "Significant financial stress detected \u2014 prioritise the action items.")));
    })(), vizCtx && /* @__PURE__ */ React.createElement("div", { className: "kpi-grid-4" }, /* @__PURE__ */ React.createElement(KpiCard, { label: "Savings Rate", value: vizCtx.savingsRatePct + "%", color: vizCtx.savingsRatePct >= 0 ? "var(--greenDk)" : "var(--red)", sub: vizCtx.reportingWindow }), /* @__PURE__ */ React.createElement(KpiCard, { label: "YTD Surplus", value: fmt(vizCtx.totalSurplus, true), color: vizCtx.totalSurplus >= 0 ? "var(--greenDk)" : "var(--red)", sub: `${fmt(vizCtx.totalIncome)} in \u00B7 ${fmt(vizCtx.totalExpenses)} out` }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Lowest Balance", value: fmt(vizCtx.lowestBalance), color: vizCtx.lowestBalance < 0 ? "var(--red)" : "var(--text)", sub: "this period" }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Closing Balance", value: fmt(vizCtx.closingBalance), color: "var(--text)", sub: "current month" })), /* @__PURE__ */ React.createElement("div", { className: "ai-report-grid" }, (orderedReport || report).map((section, si) => /* @__PURE__ */ React.createElement(Card, { key: si, className: "ai-section-card", style: { gridColumn: section.title === "Executive Summary" || section.title === "Priority Action Items" ? "1 / -1" : "auto" } }, /* @__PURE__ */ React.createElement("div", { className: "ai-section-header" }, /* @__PURE__ */ React.createElement("span", { style: { color: sectionColor[section.title] || "var(--primary)" } }, /* @__PURE__ */ React.createElement(Icon, { name: sectionIcon[section.title] || "clipboard", size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "ai-section-title", style: {
      color: sectionColor[section.title] || "var(--primary)"
    } }, section.title)), sectionViz(section.title), section.items.map((line, li) => {
      const raw = line.trim();
      if (!raw) return null;
      if (/^[-*_]{3,}$/.test(raw)) return /* @__PURE__ */ React.createElement("hr", { key: li, className: "ai-hr" });
      if (/^#{1,3}\s+/.test(raw)) {
        const txt = raw.replace(/^#{1,3}\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
        return /* @__PURE__ */ React.createElement("div", { key: li, className: "ai-item-heading" }, txt);
      }
      const isBold = raw.match(/^\*\*(.+)\*\*$/);
      const isNumbered = raw.match(/^\d+\.\s+/);
      const isBullet = raw.match(/^[-*]\s+/);
      const text = raw.replace(/^\*\*|\*\*$/g, "").replace(/^(\d+\.|[-*])\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
      if (isBold) return /* @__PURE__ */ React.createElement("div", { key: li, className: "ai-item-bold" }, text);
      if (isNumbered) return /* @__PURE__ */ React.createElement("div", { key: li, className: "ai-numbered-row" }, /* @__PURE__ */ React.createElement("div", { className: "ai-numbered-badge" }, raw.match(/^(\d+)\./)[1]), /* @__PURE__ */ React.createElement("div", { className: "ai-item-text" }, /* @__PURE__ */ React.createElement(BoldText, { text })));
      if (isBullet) {
        const isIndented = line.match(/^\s{2,}/);
        const isWarning = /(over budget|exceeded|shortfall|risk|concern|warning|negative|debt|shortfall|danger|critical|problem|unsustainable)/i.test(text);
        const isPositive = /(well|strong|excellent|good|under budget|saving|positive|recommendation)/i.test(text);
        const dot = isWarning ? "var(--amber)" : isPositive ? "var(--greenDk)" : "var(--navyLt)";
        return /* @__PURE__ */ React.createElement("div", { key: li, className: "ai-bullet-row", style: {
          marginBottom: isIndented ? 4 : 8,
          paddingLeft: isIndented ? 16 : 0
        } }, /* @__PURE__ */ React.createElement("div", { className: "ai-bullet-dot", style: {
          width: isIndented ? 4 : 6,
          height: isIndented ? 4 : 6,
          background: isIndented ? "var(--border)" : dot,
          marginTop: isIndented ? 8 : 7
        } }), /* @__PURE__ */ React.createElement("div", { className: "ai-item-text" }, /* @__PURE__ */ React.createElement(BoldText, { text })));
      }
      const plain = raw.replace(/\*([^*]+)\*/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
      return /* @__PURE__ */ React.createElement("div", { key: li, className: "ai-plain-text" }, /* @__PURE__ */ React.createElement(BoldText, { text: plain }));
    })))), /* @__PURE__ */ React.createElement("div", { className: "ai-footer-disclaimer" }, "AI assessment generated by Claude. This is not professional financial advice. Always consult a certified financial planner for major decisions.")), !report && !loading && !err && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { className: "ai-empty-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "ai-empty-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "sparkle", size: 40 })), /* @__PURE__ */ React.createElement("div", { className: "ai-empty-title" }, "Ready to analyse your finances"), /* @__PURE__ */ React.createElement("div", { className: "ai-empty-desc" }, "Enter your Anthropic API key above and click ", /* @__PURE__ */ React.createElement("strong", null, "Generate AI Assessment"), ". Claude will review your income, expenses, debt obligations, budget performance and cash flow for ", activeYear, " and provide personalised recommendations."), /* @__PURE__ */ React.createElement("div", { className: "ai-empty-feature-grid" }, [
      { icon: "chart-bar", label: "Executive Summary" },
      { icon: "banknote", label: "Income Analysis" },
      { icon: "chart-down", label: "Spending Analysis" },
      { icon: "credit-card", label: "Debt Management" },
      { icon: "target", label: "Budget vs Actual" },
      { icon: "check-circle", label: "Priority Actions" }
    ].map(({ icon, label }) => /* @__PURE__ */ React.createElement("div", { key: label, className: "ai-feature-card" }, /* @__PURE__ */ React.createElement("div", { className: "ai-feature-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "ai-feature-label" }, label)))))));
  }
