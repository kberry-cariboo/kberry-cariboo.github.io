  function ForecastView({ yearFlows, yearConfigs, openBalByYear, alertThreshold = DEFAULT_ALERT_THRESHOLD, globalSearch = "", budgetTargets = {}, horizon = 90, setHorizon = () => {
  }, categories = [], categoryColors = {} }) {
    const isMobile = useIsMobile();
    const today = /* @__PURE__ */ new Date();
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
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--textLt)"
    } }, horizon, "-Day Forecast"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(PillToggle, { options: horizons.map((h) => ({ id: h, label: h + " days" })), value: horizon, onChange: setHorizon }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)" } }, "Rolling cash flow from today"), gq2 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--amber)", padding: "6px 10px", background: "var(--amberLt)", borderRadius: 6, border: "1px solid var(--amber)", marginTop: 8 } }, '\u{1F50D} Filtering forecast by "', globalSearch, '" \u2014 ', futureEvents.length, " match", futureEvents.length !== 1 ? "es" : "")), dangerDays.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "var(--amberLt)", border: "1px solid var(--amber)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--amber)", marginBottom: 4 } }, "\u26A0 ", dangerDays.length, " event", dangerDays.length > 1 ? "s" : "", " within ", horizon, " days where balance drops below ", fmt(alertThreshold)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)" } }, "Lowest projected balance in next ", horizon, " days: ", /* @__PURE__ */ React.createElement("strong", { style: { fontFamily: "'IBM Plex Mono',monospace", color: lowestBalance < 0 ? "var(--red)" : "var(--amber)" } }, fmt(lowestBalance)))), futureEvents.length === 0 && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("p", { style: { textAlign: "center", color: "var(--textLt)" } }, "No upcoming events in the next ", horizon, " days.")), futureEvents.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 8 } }, /* @__PURE__ */ React.createElement(
      ExportBar,
      {
        onCSV: () => {
          const rows = futureEvents.filter((ev) => eventMatchesSearch(ev, gq2)).map((ev) => {
            const dateStr = `${MONTHS[ev.month]} ${ev.day}, ${ev.year}`;
            return [dateStr, ev.desc, ev.category, ev.type === "income" ? ev.amount : "", ev.type === "expense" ? ev.amount : "", ev.balance];
          });
          downloadCSV(`CashFlow_Forecast_${horizon}day.csv`, rows, ["Date", "Description", "Category", "In", "Out", "Balance"]);
        },
        onPrint: () => printView(`CashFlow Forecast - ${horizon} Days`)
      }
    )), /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll", style: { WebkitOverflowScrolling: "touch" } }, /* @__PURE__ */ React.createElement("table", { className: "forecast-table", style: { width: "100%", borderCollapse: "collapse", minWidth: 360 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "var(--navy)" } }, (isMobile ? ["Date", "Description", "Amount", "Balance"] : ["Date", "Description", "Category", "In", "Out", "Balance", "Confidence"]).map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: (h === "Category" ? "forecast-col-cat " : "") + (h === "Confidence" ? "forecast-conf-col " : ""), style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#fff",
      padding: "10px 14px",
      textAlign: i >= (isMobile ? 2 : 3) ? "right" : "left",
      letterSpacing: "0.08em",
      textTransform: "uppercase"
    } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, futureEvents.filter((ev) => eventMatchesSearch(ev, gq2)).map((ev, i) => {
      const dateStr = `${MONTHS[ev.month]} ${ev.day}${ev.year !== today.getFullYear() ? ` '${String(ev.year).slice(2)}` : ""}`;
      return /* @__PURE__ */ React.createElement("tr", { key: ev.id, style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)", borderBottom: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement("td", { style: { fontSize: 13, padding: "8px 14px", color: "var(--text)", whiteSpace: "nowrap" } }, dateStr), /* @__PURE__ */ React.createElement("td", { className: "forecast-desc-cell", style: { fontSize: 13, padding: "8px 14px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 140 : 180 } }, ev.desc), !isMobile && /* @__PURE__ */ React.createElement("td", { className: "forecast-col-cat", style: { padding: "8px 14px" } }, /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors })), !isMobile && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13", style: { padding: "8px 14px", textAlign: "right", color: "var(--greenDk)", fontWeight: 600 } }, ev.type === "income" ? fmt(ev.amount) : ""), !isMobile && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13", style: { padding: "8px 14px", textAlign: "right", color: "var(--text)", fontWeight: 600 } }, ev.type === "expense" ? fmt(ev.amount) : ""), isMobile && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13", style: { padding: "8px 14px", textAlign: "right", color: ev.type === "income" ? "var(--greenDk)" : "var(--text)", fontWeight: 600 } }, fmt(ev.type === "income" ? ev.amount : -ev.amount, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13", style: {
        padding: "8px 14px",
        textAlign: "right",
        fontWeight: 700,
        color: ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amber)" : "var(--text)",
        background: ev.balance < 0 ? "var(--redLt)" : ev.balance < alertThreshold ? "var(--amberLt)" : "transparent"
      } }, fmt(ev.balance)), !isMobile && (() => {
        const m = ev.month;
        const cat = ev.category;
        const yr = ev.year;
        const target = (budgetTargets[`${yr}:${m}`] || {})[cat] || 0;
        const isIncome = ev.type === "income";
        if (isIncome) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col", style: { fontSize: 13, padding: "8px 8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)" }, title: "Scheduled income" }, "\u2713"));
        if (!target) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col", style: { fontSize: 13, padding: "8px 8px", textAlign: "center", color: "var(--textLt)" } }, "\u2014");
        const pct = Math.round(ev.amount / target * 100);
        const conf = pct <= 100 ? 100 : pct <= 120 ? 75 : pct <= 150 ? 50 : 25;
        if (conf === 100) return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col", style: { fontSize: 13, padding: "8px 8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)" }, title: "Within budget target" }, "\u2713"));
        const color = conf >= 50 ? "var(--amber)" : "var(--red)";
        return /* @__PURE__ */ React.createElement("td", { className: "forecast-conf-col", style: { fontSize: 13, padding: "8px 8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color, fontWeight: 600 }, title: "Amount exceeds the monthly budget target" }, conf, "%"));
      })());
    })))))));
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
      /* @__PURE__ */ React.createElement("div", { key: "s0" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, textAlign: "center", marginBottom: 12 } }, "\u{1F4B0}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 8 } }, "Welcome to CashFlow!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", textAlign: "center", marginBottom: 20, lineHeight: 1.5 } }, "Let's set up your budget in 3 quick steps. First, what's your current bank balance?"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18, color: "var(--textMid)" } }, "$"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          placeholder: "e.g. 5000.00",
          value: openBal,
          onChange: (e) => setOpenBal(e.target.value),
          autoFocus: true,
          style: {
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: 16,
            padding: "10px 14px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none",
            width: 180
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
        const v = roundMoney(parseFloat(openBal) || 0);
        setYearConfigs((prev) => prev.map((yc, i) => i === 0 ? __spreadProps(__spreadValues({}, yc), { openingBalance: v }) : yc));
        setStep(1);
      }, className: "cf-btn cf-btn--primary", style: { fontSize: 13, fontWeight: 700, padding: "10px 28px" } }, "Next \u2192"), /* @__PURE__ */ React.createElement("button", { onClick: () => setDone(true), className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "10px 18px" } }, "Skip"))),
      // Step 1: First income
      /* @__PURE__ */ React.createElement("div", { key: "s1" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, textAlign: "center", marginBottom: 12 } }, "\u{1F4B5}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 8 } }, "Add your first income"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", textAlign: "center", marginBottom: 20 } }, `What's your main source of income? (e.g. "Payroll")`), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 280, margin: "0 auto 20px" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          placeholder: "Description e.g. Payroll",
          value: income.desc,
          autoFocus: true,
          onChange: (e) => setIncome((p) => __spreadProps(__spreadValues({}, p), { desc: e.target.value })),
          style: {
            fontSize: 13,
            padding: "9px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none"
          }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textMid)" } }, "$"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          placeholder: "Amount",
          value: income.amount,
          className: "cf-text-mono-13",
          onChange: (e) => setIncome((p) => __spreadProps(__spreadValues({}, p), { amount: e.target.value })),
          style: {
            flex: 1,
            padding: "9px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none"
          }
        }
      ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep(0), className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "10px 18px" } }, "\u2190 Back"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (income.desc.trim() && income.amount) {
          addEntry({
            desc: income.desc.trim(),
            type: "income",
            amount: roundMoney(parseFloat(income.amount) || 0),
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
      }, className: "cf-btn cf-btn--primary", style: { fontSize: 13, fontWeight: 700, padding: "10px 28px" } }, income.desc.trim() && income.amount ? "Next \u2192" : "Skip \u2192"))),
      // Step 2: First expense
      /* @__PURE__ */ React.createElement("div", { key: "s2" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, textAlign: "center", marginBottom: 12 } }, "\u{1F4B3}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 8 } }, "Add your first expense"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", textAlign: "center", marginBottom: 20 } }, `What's a recurring expense? (e.g. "Mortgage", "Rent")`), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 280, margin: "0 auto 20px" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          placeholder: "Description e.g. Mortgage",
          value: expense.desc,
          autoFocus: true,
          onChange: (e) => setExpense((p) => __spreadProps(__spreadValues({}, p), { desc: e.target.value })),
          style: {
            fontSize: 13,
            padding: "9px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none"
          }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textMid)" } }, "$"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          placeholder: "Monthly amount",
          value: expense.amount,
          className: "cf-text-mono-13",
          onChange: (e) => setExpense((p) => __spreadProps(__spreadValues({}, p), { amount: e.target.value })),
          style: {
            flex: 1,
            padding: "9px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none"
          }
        }
      )), /* @__PURE__ */ React.createElement(
        "select",
        {
          value: expense.category,
          onChange: (e) => setExpense((p) => __spreadProps(__spreadValues({}, p), { category: e.target.value })),
          style: {
            fontSize: 13,
            padding: "9px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            background: "var(--inputBg)",
            color: "var(--text)",
            outline: "none"
          }
        },
        categories.filter((c) => c !== "Income").map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))
      )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep(1), className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "10px 18px" } }, "\u2190 Back"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        if (expense.desc.trim() && expense.amount) {
          addEntry({
            desc: expense.desc.trim(),
            type: "expense",
            amount: roundMoney(parseFloat(expense.amount) || 0),
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
      }, style: {
        fontSize: 13,
        fontWeight: 700,
        padding: "10px 28px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        background: "var(--greenDk)",
        color: "#fff"
      } }, expense.desc.trim() && expense.amount ? "Finish \u2713" : "Skip & Finish")))
    ];
    return /* @__PURE__ */ React.createElement(Card, { style: { maxWidth: 480, margin: "0 auto 24px", border: "2px solid var(--primary)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 } }, [0, 1, 2].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: i <= step ? "var(--primary)" : "var(--border)",
      transition: "background 0.2s"
    } }))), steps[step]);
  }
  function AlertBanner({ flow, openBal, alertThreshold }) {
    const today = /* @__PURE__ */ new Date();
    const next30 = new Date(today);
    next30.setDate(today.getDate() + 30);
    const alerts = flow.filter((ev) => ev.date >= today && ev.date <= next30 && ev.balance < alertThreshold);
    if (!alerts.length) return null;
    const worst = alerts.reduce((a, b) => a.balance < b.balance ? a : b);
    return /* @__PURE__ */ React.createElement("div", { style: { background: "var(--redLt)", border: "1px solid var(--red)", borderRadius: 10, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24 } }, "\u{1F6A8}"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--red)" } }, alerts.length, " upcoming event", alerts.length > 1 ? "s" : "", " drop below $", alertThreshold.toLocaleString(), " in the next 30 days"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginTop: 2 } }, "Lowest: ", /* @__PURE__ */ React.createElement("strong", { style: { fontFamily: "'IBM Plex Mono',monospace", color: "var(--red)" } }, fmt(worst.balance)), " ", "on ", MONTHS[worst.month], " ", worst.day, " \xB7 ", worst.desc)));
  }
  function BoldText({ text = "" }) {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return React.createElement(React.Fragment, null, ...parts.map(
      (p, i) => i % 2 === 1 ? React.createElement("strong", { key: i }, p) : p
    ));
  }
  function AIInsightsView({ flow, openBal, yearConfigs, budgetTargets, activeYear, categories = [], apiKey = "" }) {
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
      let debtTrackerData = {};
      try {
        const raw = localStorage.getItem("cf_debt_data");
        if (raw) debtTrackerData = JSON.parse(raw);
      } catch (e) {
      }
      let savingsGoals = [];
      try {
        const raw = localStorage.getItem("cf_goals");
        if (raw) {
          const g = JSON.parse(raw);
          if (Array.isArray(g)) savingsGoals = g.map((x) => ({
            name: x.name,
            target: x.target,
            saved: x.saved,
            monthly: x.monthly,
            targetDate: x.targetDate || null,
            pct: x.target > 0 ? Math.round(x.saved / x.target * 100) : 0
          }));
        }
      } catch (e) {
      }
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
        const act = Math.round((expenseCats[cat] || 0) * 100) / 100;
        const t = Math.round(tgt * 100) / 100;
        bvaRows.push({ category: cat, actual: act, target: t, variance: Math.round((act - t) * 100) / 100 });
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
        openingBalance: Math.round(openBal * 100) / 100,
        closingBalance: Math.round(closingBal * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExp * 100) / 100,
        totalSurplus: Math.round(totalSurplus * 100) / 100,
        avgMonthlyExpense: Math.round(avgMonthly * 100) / 100,
        savingsRatePct: Math.round(savingsRate * 10) / 10,
        lowestBalance: Math.round(lowestBal * 100) / 100,
        monthlyBreakdown: ytdMonths,
        topExpenseCategories: Object.entries(expenseCats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([cat, amt]) => ({
          category: cat,
          total: Math.round(amt * 100) / 100,
          pctOfExpenses: totalExp > 0 ? Math.round(amt / totalExp * 1e3) / 10 : 0
        })),
        incomeCategories: Object.entries(incomeCats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ category: cat, total: Math.round(amt * 100) / 100 })),
        debtObligations: debtItems.map(([cat, amt]) => ({ category: cat, ytdPaid: Math.round(amt * 100) / 100 })),
        budgetVsActual: bvaRows.slice(0, 15),
        hasBudgetTargets: Object.keys(targetByCat).length > 0,
        // Debt tracker data (balances + rates user has entered)
        debtTrackerItems: Object.entries(debtTrackerData).filter(([, v]) => !v.hidden && parseFloat(v.balance) > 0).map(([k, v]) => ({
          name: v.label || k.replace("manual_", "").replace(/_/g, " "),
          balance: Math.round(parseFloat(v.balance || 0) * 100) / 100,
          rate: parseFloat(v.rate || 0),
          monthlyPayment: Math.round(parseFloat(v.payment || 0) * 100) / 100
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
Opening Balance: $${ctx.openingBalance.toLocaleString()}
Closing Balance: $${ctx.closingBalance.toLocaleString()}
Total Income: $${ctx.totalIncome.toLocaleString()}
Total Expenses: $${ctx.totalExpenses.toLocaleString()}
Net Surplus/Shortfall: $${ctx.totalSurplus.toLocaleString()} (${ctx.totalSurplus >= 0 ? "+" : ""}${ctx.savingsRatePct}% savings rate)
Lowest Balance This Period: $${ctx.lowestBalance.toLocaleString()}
Average Monthly Expenses: $${ctx.avgMonthlyExpense.toLocaleString()}

MONTHLY BREAKDOWN:
${ctx.monthlyBreakdown.map((m) => `  ${m.month}: Income $${m.income.toLocaleString()}, Expenses $${m.expenses.toLocaleString()}, ${m.surplus >= 0 ? "Surplus" : "Shortfall"} $${Math.abs(m.surplus).toLocaleString()}, Balance $${m.closingBalance.toLocaleString()}`).join("\n")}

TOP EXPENSE CATEGORIES (YTD):
${ctx.topExpenseCategories.map((c) => `  ${c.category}: $${c.total.toLocaleString()} (${c.pctOfExpenses}% of expenses)`).join("\n")}

INCOME SOURCES:
${ctx.incomeCategories.map((c) => `  ${c.category}: $${c.total.toLocaleString()}`).join("\n")}

${ctx.debtObligations.length ? `DEBT / CREDIT OBLIGATIONS (YTD paid):
${ctx.debtObligations.map((d) => `  ${d.category}: $${d.ytdPaid.toLocaleString()}`).join("\n")}` : "No debt categories identified."}

${((_a = ctx.debtTrackerItems) == null ? void 0 : _a.length) ? `DEBT TRACKER (user-entered balances & rates):
${ctx.debtTrackerItems.map((d) => `  ${d.name}: Balance $${d.balance.toLocaleString()}, Rate ${d.rate}%, Payment $${d.monthlyPayment}/mo`).join("\n")}` : "No debt balances entered in tracker yet."}

${ctx.hasBudgetTargets ? `BUDGET VS ACTUAL (top variances):
${ctx.budgetVsActual.map((r) => `  ${r.category}: Actual $${r.actual.toLocaleString()} vs Target $${r.target.toLocaleString()} (${r.variance >= 0 ? "over" : "under"} by $${Math.abs(r.variance).toLocaleString()})`).join("\n")}` : "No budget targets have been set yet."}

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
      "Executive Summary": "\u{1F4CA}",
      "Income Analysis": "\u{1F4B0}",
      "Spending Analysis": "\u{1F4C9}",
      "Debt Management": "\u{1F4B3}",
      "Savings Goals": "\u{1F3AF}",
      "Budget Performance": "\u{1F3AF}",
      "Cash Flow & Risk": "\u26A0\uFE0F",
      "Priority Action Items": "\u2705"
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
    }, [report, flow, openBal, budgetTargets, activeYear]);
    const VizRow = ({ label, fillPct, fillColor, value, sub, rowTitle }) => /* @__PURE__ */ React.createElement("div", { title: rowTitle || void 0, style: { marginBottom: 9 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 3 } }, /* @__PURE__ */ React.createElement("span", { className: "txm", style: { fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 } }, label), /* @__PURE__ */ React.createElement("span", { className: "mno", style: { fontSize: 12, whiteSpace: "nowrap" } }, value, sub && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)", fontFamily: "Inter,sans-serif", fontSize: 11 } }, " ", sub))), /* @__PURE__ */ React.createElement("div", { style: { height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { width: Math.max(3, Math.min(100, fillPct)) + "%", height: "100%", borderRadius: 4, background: fillColor } })));
    const sectionViz = (t) => {
      const c = vizCtx;
      if (!c) return null;
      const wrap = (kids) => /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, kids);
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
        return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginBottom: 6 } }, "Monthly surplus (above line) / shortfall (below line)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3 } }, c.monthlyBreakdown.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.month, title: `${m.month}: ${fmt(m.surplus, true)}`, style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", height: 56 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: 0, right: 0, top: "50%", borderTop: "1px solid var(--border)" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: "18%", right: "18%", borderRadius: 2, background: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)", height: Math.max(2, Math.round(Math.abs(m.surplus) / maxAbs * 26)), bottom: m.surplus >= 0 ? "50%" : "auto", top: m.surplus < 0 ? "50%" : "auto" } })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, textAlign: "center", color: "var(--textLt)", marginTop: 2 } }, m.month[0])))));
      }
      return null;
    };
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 } }, "\u2726 AI Financial Assessment \u2014 ", activeYear), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", lineHeight: 1.5 } }, "Claude reviews your ", activeYear, " budget data and provides personalised suggestions on spending, debt, cash flow and financial health. Requires an Anthropic API key.")), lastRun && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", whiteSpace: "nowrap", marginTop: 4 } }, "Last run: ", lastRun.toLocaleTimeString())), !apiKey.trim() && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 16,
      padding: "12px 16px",
      background: "rgba(232,93,74,0.07)",
      borderRadius: 10,
      border: "1px solid rgba(232,93,74,0.2)",
      display: "flex",
      alignItems: "center",
      gap: 12
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18 } }, "\u{1F511}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)" } }, "No API key configured. Add your Anthropic API key in", " ", /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => window.__cfSetTab && window.__cfSetTab("settings"),
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: "var(--primary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline"
        }
      },
      "Settings \u2192 General"
    ), ".")), apiKey.trim() && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 12, display: "flex", alignItems: "flex-start", gap: 6 } }, /* @__PURE__ */ React.createElement("span", null, "🔑"), /* @__PURE__ */ React.createElement("span", null, "Running this sends your budget data and API key straight to Anthropic from your browser.")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: runAssessment,
        disabled: loading || !apiKey.trim(),
        style: {
          fontSize: 14,
          fontWeight: 700,
          padding: "12px 28px",
          borderRadius: 10,
          border: "none",
          cursor: loading || !apiKey.trim() ? "not-allowed" : "pointer",
          background: loading || !apiKey.trim() ? "var(--border)" : "var(--primary)",
          color: loading || !apiKey.trim() ? "var(--textMid)" : "#fff",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      },
      loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: {
        display: "inline-block",
        animation: "spin 1s linear infinite",
        fontStyle: "normal"
      } }, "\u27F3"), " Analysing your finances\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2726"), " Generate AI Assessment")
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
        className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "10px 18px" }
      },
      "Clear"
    )), err && /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 13,
      color: "var(--red)",
      marginTop: 10,
      padding: "10px 14px",
      background: "rgba(232,93,74,0.08)",
      borderRadius: 8,
      border: "1px solid rgba(232,93,74,0.25)"
    } }, "\u26A0 ", err)), loading && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, ["Executive Summary", "Income Analysis", "Spending Analysis", "Debt Management", "Priority Action Items"].map((s) => /* @__PURE__ */ React.createElement(Card, { key: s }, /* @__PURE__ */ React.createElement("div", { style: { height: 18, background: "var(--border)", borderRadius: 6, width: "40%", marginBottom: 16 } }), [80, 100, 65, 90].map((w, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      height: 12,
      background: "var(--stripe)",
      borderRadius: 4,
      width: `${w}%`,
      marginBottom: 10,
      animation: "pulse 1.5s ease-in-out infinite"
    } })))), /* @__PURE__ */ React.createElement("style", null, `@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.9}}`)), report && !loading && /* @__PURE__ */ React.createElement(React.Fragment, null, (() => {
      const match = rawText.match(/\b([1-9]|10)\s*\/\s*10\b|\bscore[:\s]+([1-9]|10)\b/i);
      if (!match) return null;
      const score = parseInt(match[1] || match[2]);
      const color = score >= 7 ? "var(--greenDk)" : score >= 4 ? "var(--amber)" : "var(--red)";
      return /* @__PURE__ */ React.createElement("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        marginBottom: 16,
        background: "var(--bgCard)",
        borderRadius: 12,
        border: `2px solid ${color}`,
        boxShadow: `0 0 0 4px ${color}22`
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 32,
        fontWeight: 700,
        color,
        lineHeight: 1
      } }, score, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, color: "var(--textLt)" } }, "/10")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--text)" } }, "Financial Health Score"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)" } }, score >= 8 ? "Strong financial position \u2014 keep building on this foundation." : score >= 6 ? "Good foundation with clear areas for improvement." : score >= 4 ? "Several areas need attention \u2014 see action items below." : "Significant financial stress detected \u2014 prioritise the action items.")));
    })(), vizCtx && /* @__PURE__ */ React.createElement("div", { className: "kpi-grid-4", style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 } }, /* @__PURE__ */ React.createElement(KpiCard, { label: "Savings Rate", value: vizCtx.savingsRatePct + "%", color: vizCtx.savingsRatePct >= 0 ? "var(--greenDk)" : "var(--red)", sub: vizCtx.reportingWindow }), /* @__PURE__ */ React.createElement(KpiCard, { label: "YTD Surplus", value: fmt(vizCtx.totalSurplus, true), color: vizCtx.totalSurplus >= 0 ? "var(--greenDk)" : "var(--red)", sub: `${fmt(vizCtx.totalIncome)} in \u00B7 ${fmt(vizCtx.totalExpenses)} out` }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Lowest Balance", value: fmt(vizCtx.lowestBalance), color: vizCtx.lowestBalance < 0 ? "var(--red)" : "var(--text)", sub: "this period" }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Closing Balance", value: fmt(vizCtx.closingBalance), color: "var(--text)", sub: "current month" })), /* @__PURE__ */ React.createElement("div", { className: "ai-report-grid" }, (orderedReport || report).map((section, si) => /* @__PURE__ */ React.createElement(Card, { key: si, style: { marginBottom: 0, gridColumn: section.title === "Executive Summary" || section.title === "Priority Action Items" ? "1 / -1" : "auto" } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
      paddingBottom: 12,
      borderBottom: "1px solid var(--border)"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20 } }, sectionIcon[section.title] || "\u{1F4CB}"), /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 15,
      fontWeight: 700,
      color: sectionColor[section.title] || "var(--primary)"
    } }, section.title)), sectionViz(section.title), section.items.map((line, li) => {
      const raw = line.trim();
      if (!raw) return null;
      if (/^[-*_]{3,}$/.test(raw)) return /* @__PURE__ */ React.createElement("hr", { key: li, style: { border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" } });
      if (/^#{1,3}\s+/.test(raw)) {
        const txt = raw.replace(/^#{1,3}\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
        return /* @__PURE__ */ React.createElement("div", { key: li, style: {
          fontSize: 13,
          fontWeight: 700,
          color: "var(--textMid)",
          marginBottom: 6,
          marginTop: 10
        } }, txt);
      }
      const isBold = raw.match(/^\*\*(.+)\*\*$/);
      const isNumbered = raw.match(/^\d+\.\s+/);
      const isBullet = raw.match(/^[-*]\s+/);
      const text = raw.replace(/^\*\*|\*\*$/g, "").replace(/^(\d+\.|[-*])\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
      if (isBold) return /* @__PURE__ */ React.createElement("div", { key: li, style: {
        fontSize: 13,
        fontWeight: 700,
        color: "var(--text)",
        marginBottom: 8,
        marginTop: 8
      } }, text);
      if (isNumbered) return /* @__PURE__ */ React.createElement("div", { key: li, style: { display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: {
        minWidth: 22,
        height: 22,
        borderRadius: "50%",
        background: "var(--primary)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 2
      } }, raw.match(/^(\d+)\./)[1]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--text)", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement(BoldText, { text })));
      if (isBullet) {
        const isIndented = line.match(/^\s{2,}/);
        const isWarning = /(over budget|exceeded|shortfall|risk|concern|warning|negative|debt|shortfall|danger|critical|problem|unsustainable)/i.test(text);
        const isPositive = /(well|strong|excellent|good|under budget|saving|positive|recommendation)/i.test(text);
        const dot = isWarning ? "var(--amber)" : isPositive ? "var(--greenDk)" : "var(--navyLt)";
        return /* @__PURE__ */ React.createElement("div", { key: li, style: {
          display: "flex",
          gap: 10,
          marginBottom: isIndented ? 4 : 8,
          alignItems: "flex-start",
          paddingLeft: isIndented ? 16 : 0
        } }, /* @__PURE__ */ React.createElement("div", { style: {
          width: isIndented ? 4 : 6,
          height: isIndented ? 4 : 6,
          borderRadius: "50%",
          background: isIndented ? "var(--border)" : dot,
          flexShrink: 0,
          marginTop: isIndented ? 8 : 7
        } }), /* @__PURE__ */ React.createElement("div", { style: {
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.6
        } }, /* @__PURE__ */ React.createElement(BoldText, { text })));
      }
      const plain = raw.replace(/\*([^*]+)\*/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
      return /* @__PURE__ */ React.createElement("div", { key: li, style: {
        fontSize: 13,
        color: "var(--textMid)",
        lineHeight: 1.6,
        marginBottom: 6
      } }, /* @__PURE__ */ React.createElement(BoldText, { text: plain }));
    })))), /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 11,
      color: "var(--textLt)",
      textAlign: "center",
      padding: "12px 0 4px",
      lineHeight: 1.5
    } }, "AI assessment generated by Claude. This is not professional financial advice. Always consult a certified financial planner for major decisions.")), !report && !loading && !err && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\u2726"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 } }, "Ready to analyse your finances"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto", marginBottom: 24 } }, "Enter your Anthropic API key above and click ", /* @__PURE__ */ React.createElement("strong", null, "Generate AI Assessment"), ". Claude will review your income, expenses, debt obligations, budget performance and cash flow for ", activeYear, " and provide personalised recommendations."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, maxWidth: 600, margin: "0 auto" } }, [
      { icon: "\u{1F4CA}", label: "Executive Summary" },
      { icon: "\u{1F4B0}", label: "Income Analysis" },
      { icon: "\u{1F4C9}", label: "Spending Analysis" },
      { icon: "\u{1F4B3}", label: "Debt Management" },
      { icon: "\u{1F3AF}", label: "Budget vs Actual" },
      { icon: "\u2705", label: "Priority Actions" }
    ].map(({ icon, label }) => /* @__PURE__ */ React.createElement("div", { key: label, style: {
      padding: "14px 12px",
      background: "var(--bg)",
      borderRadius: 10,
      border: "1px solid var(--border)",
      textAlign: "center"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, marginBottom: 6 } }, icon), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: "var(--textMid)" } }, label)))))));
  }
