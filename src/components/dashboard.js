  // Hoisted out of DashboardView's render body — an inline component
  // definition creates a new type each render and forces React to remount.
  const GlanceTile = ({ title, children }) => /* @__PURE__ */ React.createElement("div", { className: "glance-tile" }, /* @__PURE__ */ React.createElement("div", { className: "glance-tile-title" }, title), children);
  // "What changed this month" — the smallest useful AI surface in the app.
  // Everything it reports is computed here from the same flow the rest of the
  // dashboard draws; the model is only asked to say which of the differences
  // matter and why, never to do the arithmetic.
  function MonthlyBriefCard({ flow, activeYear, categories = [], apiKey = "", isOffline = false }) {
    const [brief, setBrief] = useState(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const now = /* @__PURE__ */ new Date();
    const thisMonth = now.getFullYear() === activeYear ? now.getMonth() : 11;
    const CACHE_KEY = `cf_ai_brief_${activeYear}_${thisMonth}`;
    useEffect(() => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.brief) setBrief(parsed.brief);
          else setBrief(null);
        } else setBrief(null);
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    }, [CACHE_KEY]);
    // Both months' totals, plus per-category movement. Categories with no
    // activity in either month are dropped so the prompt carries signal
    // instead of a wall of zeroes.
    const delta = useMemo(() => {
      if (thisMonth < 1) return null;
      const prevMonth = thisMonth - 1;
      const totals = (mi, type) => flow.filter((ev) => ev.month === mi && ev.type === type).reduce((sum, ev) => sum + ev.amount, 0);
      const byCat = (mi) => {
        const o = {};
        flow.filter((ev) => ev.month === mi && ev.type === "expense").forEach((ev) => {
          o[ev.category] = (o[ev.category] || 0) + ev.amount;
        });
        return o;
      };
      const currCats = byCat(thisMonth), prevCats = byCat(prevMonth);
      const cats = [.../* @__PURE__ */ new Set([...Object.keys(currCats), ...Object.keys(prevCats)])].map((cat) => ({
        cat,
        now: currCats[cat] || 0,
        before: prevCats[cat] || 0,
        change: (currCats[cat] || 0) - (prevCats[cat] || 0)
      })).filter((c) => c.now || c.before).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
      return {
        prevMonth,
        income: { now: totals(thisMonth, "income"), before: totals(prevMonth, "income") },
        expense: { now: totals(thisMonth, "expense"), before: totals(prevMonth, "expense") },
        cats
      };
    }, [flow, thisMonth]);
    const run = async () => {
      if (!delta) return;
      setBusy(true);
      setErr("");
      try {
        const line = (label, d) => `${label}: ${fmt(d.now)} this month vs ${fmt(d.before)} last month (${d.now - d.before >= 0 ? "+" : ""}${fmt(d.now - d.before, true)})`;
        const catLines = delta.cats.map((c) => `  ${c.cat}: ${fmt(c.now)} vs ${fmt(c.before)} (${c.change >= 0 ? "+" : ""}${fmt(c.change, true)})`).join("\n");
        const { data } = await callClaude({
          system: "You explain month-to-month changes in a household budget. Be concrete and brief. Never restate a number without saying what it means.",
          messages: [{ role: "user", content: `${MONTHS[thisMonth]} ${activeYear} compared with ${MONTHS[delta.prevMonth]}.\n\n${line("Income", delta.income)}\n${line("Expenses", delta.expense)}\n\nExpense categories (this month vs last):\n${catLines}\n\nSay what actually changed and whether it matters. Skip anything that moved trivially.` }],
          schema: {
            type: "object",
            properties: {
              headline: { type: "string", description: "One sentence, under 15 words, on the month's main change." },
              bullets: { type: "array", description: "2-4 short observations, each naming a category and a dollar change.", items: { type: "string" } }
            },
            required: ["headline", "bullets"],
            additionalProperties: false
          },
          maxTokens: 1500,
          effort: "low",
          apiKey
        });
        setBrief(data);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ brief: data }));
        } catch (e) {
          notifyStorageWriteFailure(e);
        }
      } catch (e) {
        setErr(aiErrorMessage(e));
      } finally {
        setBusy(false);
      }
    };
    if (!delta) return null;
    // mb-16 like every other full-width widget: .cf-card carries no margin of
    // its own, so the gap before whatever renders next is each widget's own
    // job. Without it this card sat flush against the Monthly Summary heading.
    return /* @__PURE__ */ React.createElement(Card, { className: "mb-16" },
      /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-12" },
        /* @__PURE__ */ React.createElement(SectionTitle, { style: { marginBottom: 0 } }, "What changed in ", MONTHS[thisMonth]),
        /* @__PURE__ */ React.createElement("button", {
          onClick: run,
          disabled: busy || isOffline || !aiCanRun(apiKey),
          title: isOffline ? "You're offline — this needs a connection." : !aiCanRun(apiKey) ? "Add an Anthropic API key in Settings → General, or deploy the ai-proxy Edge Function." : void 0,
          className: "cf-btn cf-btn--secondary cf-btn--tiny"
        }, busy ? "Thinking…" : brief ? "Refresh" : "✦ Summarise")
      ),
      err && /* @__PURE__ */ React.createElement("div", { className: "field-error-text mb-8" }, err),
      brief ? /* @__PURE__ */ React.createElement(React.Fragment, null,
        /* @__PURE__ */ React.createElement("div", { className: "txm mb-8", style: { fontWeight: 600 } }, brief.headline),
        (brief.bullets || []).map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ai-bullet-row", style: { marginBottom: 6 } },
          /* @__PURE__ */ React.createElement("div", { className: "ai-bullet-dot", style: { width: 6, height: 6, background: "var(--navyLt)", marginTop: 7 } }),
          /* @__PURE__ */ React.createElement("div", { className: "ai-item-text" }, b)
        ))
      ) : /* @__PURE__ */ React.createElement("div", { className: "txl" }, "Compare ", MONTHS[thisMonth], " with ", MONTHS[delta.prevMonth], " and have Claude pick out what moved.")
    );
  }
  function DashboardView({ apiKey = "", isOffline = false, flow, openBal, yearFlows, yearConfigs, alertThreshold, activeYear, budgetTargets = {}, categories = [], categoryColors = {}, users = [], sessionUser = null, entries = [], toggleComplete = () => {
  }, setYearConfigs = () => {
  }, addEntry = () => {
  }, setTab = () => {
  }, setEntries = () => {
  }, completed = {}, dashHidden = {}, setDashHidden = () => {
  }, dashOrder = [], setDashOrder = () => {
  }, debtData = {} }) {
    var _a;
    const isMobile = useIsMobile();
    const [showCustomize, setShowCustomize] = useState(false);
    // Device-local, not synced: whether you want the analysis open is a
    // property of the screen you are reading on, not of the household.
    const [dashMore, setDashMore] = useLS("cf_dash_more", false);
    // Every other dismissible dialog in the app closes on Escape — the
    // confirm dialogs, the occurrence editor, the context menus, the receipt
    // lightbox. Customize was the exception, and it has nothing to lose by
    // closing: each toggle applies as you make it, so Done is a way out, not
    // a commit.
    useEffect(() => {
      if (!showCustomize) return;
      const h = (e) => {
        if (e.key === "Escape") setShowCustomize(false);
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [showCustomize]);
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
    const [showReconcile, setShowReconcile] = useState(false);
    // Posts the difference between the projected balance and the real one as a
    // dated one-time transfer. See ReconcileModal for why a transfer and not
    // an income/expense entry.
    const recordReconcile = ({ actualCents, diff }) => {
      const today = todayStr();
      addEntry({
        desc: RECONCILE_DESC,
        type: "transfer",
        transferDirection: diff > 0 ? "in" : "out",
        amount: Math.abs(diff),
        category: reconcileCategory(categories),
        notes: `Reconciled to a bank balance of ${fmt(actualCents)} on ${today}.`,
        startDate: today,
        repeats: false,
        recurEvery: 1,
        recurUnit: "month",
        recurDays: [],
        recurEnd: "",
        monthlyAmounts: null
      });
      setShowReconcile(false);
      toast(`Adjustment of ${fmt(diff, true)} recorded — today's balance now matches your bank.`);
    };
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
    const totalIncome = summaries.reduce((s, m) => s + m.income, 0);
    const totalExpense = summaries.reduce((s, m) => s + m.expense, 0);
    const totalTransfersIn = summaries.reduce((s, m) => s + m.transfersIn, 0);
    const totalTransfersOut = summaries.reduce((s, m) => s + m.transfersOut, 0);
    // Sum of the monthly surpluses, each of which is that month's balance
    // movement — so this telescopes to (year-end close − opening balance) and
    // matches the Closing Balance column it is printed under. It used to be
    // totalIncome − totalExpense, which leaves transfers out (they are not
    // income or expense — see getMonthSummaries) and so reported a year-end
    // net that missed every transfer: twelve $500 monthly transfers went
    // $6,000 unaccounted for between the Annual Total row and the balance
    // directly above it.
    const netSurplus = summaries.reduce((s, m) => s + m.surplus, 0);
    // Whether to spend a column on transfers. Zero for the vast majority of
    // households, and the tables stay exactly as they were for them.
    const hasTransfers = totalTransfersIn > 0 || totalTransfersOut > 0;
    // Both Monthly Summary renderings (heatmap and table) share this, so the
    // sticky last-column rule can key off the array length instead of a
    // hardcoded index that a new column would silently break.
    const summaryCols = hasTransfers
      ? ["Month", "Income", "Expenses", "Transfers", "Surplus / Shortfall", "Closing Balance"]
      : ["Month", "Income", "Expenses", "Surplus / Shortfall", "Closing Balance"];
    const netTransfers = totalTransfersIn - totalTransfersOut;
    const lowestBal = summaries.length ? Math.min(...summaries.map((m) => m.close)) : 0;
    const lowestMon = (_a = summaries.find((m) => m.close === lowestBal)) == null ? void 0 : _a.month;
    // One-sentence summaries of what each chart shows, attached to the SVGs as
    // aria-labels. A chart is a picture: without a description it is either
    // silence or, worse, a screen reader spelling out every tick and data
    // label in turn. Each one names the shape and the extreme, then points at
    // the Monthly Summary table below, which carries the same figures cell by
    // cell for anyone who wants the detail.
    const SEE_TABLE = " The same figures are in the Monthly Summary table below.";
    const chartAlts = useMemo(() => {
      if (!summaries.length) return {};
      const span = `${summaries[0].month} to ${summaries[summaries.length - 1].month} ${activeYear}`;
      const short = summaries.filter((m) => m.surplus < 0).length;
      const worst = summaries.reduce((a, m) => m.surplus < a.surplus ? m : a, summaries[0]);
      const best = summaries.reduce((a, m) => m.surplus > a.surplus ? m : a, summaries[0]);
      const share = (rows, total) => rows.slice(0, 3).map(([n, v]) => `${n} ${fmt(v)}${total > 0 ? ` (${Math.round(v / total * 100)}%)` : ""}`).join(", ");
      return {
        balance: `Line chart of the closing balance for each month, ${span}. It opens at ${fmt(summaries[0].close)} and ends at ${fmt(summaries[summaries.length - 1].close)}, with its low of ${fmt(lowestBal)} in ${lowestMon}.` + SEE_TABLE,
        surplus: `Chart of surplus or shortfall for each month, ${span}. ${short} of ${summaries.length} months spend more than they take in. Best month ${best.month} at ${fmt(best.surplus, true)}, worst ${worst.month} at ${fmt(worst.surplus, true)}.` + SEE_TABLE,
        incExp: `Chart comparing income against expenses for each month, ${span}. Income totals ${fmt(totalIncome)} against ${fmt(totalExpense)} of expenses, a net of ${fmt(netSurplus, true)}.` + SEE_TABLE,
        cats: catTotals.length ? `Breakdown of ${fmt(totalExpense)} of expenses across ${catTotals.length} categories. Largest: ${share(catTotals, totalExpense)}.` : "",
        inc: incTotals.length ? `Breakdown of ${fmt(totalIncome)} of income across ${incTotals.length} sources. Largest: ${share(incTotals, totalIncome)}.` : ""
      };
    }, [summaries, activeYear, lowestBal, lowestMon, catTotals, incTotals, totalIncome, totalExpense, netSurplus]);
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
    // ── The runway ──────────────────────────────────────────────────────
    // The tiles answer "where am I now" and "how bad does it get"; between
    // them sat the question neither could show — *when*. A low point 40 days
    // out reads the same as one tomorrow, and a single dip reads the same as
    // three lean weeks. This is the projection drawn as one continuous strip,
    // a day per segment, tinted by the same railTone rule the ledger uses, so
    // "am I all right?" is answered by shape before any figure is read.
    const runway = useMemo(() => {
      try {
        const now = /* @__PURE__ */ new Date();
        const isCurrentYear = now.getFullYear() === activeYear;
        const todayM = isCurrentYear ? now.getMonth() : 0, todayD = isCurrentYear ? now.getDate() : 1;
        const start = new Date(activeYear, todayM, todayD);
        // The last event on a day sets that day's closing balance; a quiet day
        // carries the one before it, which is what makes the strip continuous
        // rather than a scatter of the days something happened.
        const closeByOffset = /* @__PURE__ */ new Map();
        flow.forEach((ev) => {
          const off = Math.round((new Date(activeYear, ev.month, ev.day) - start) / 864e5);
          if (off >= 0 && off <= RUNWAY_DAYS) closeByOffset.set(off, ev.balance);
        });
        let bal = getCurrentBalance(flow, openBal, activeYear);
        const days = [];
        for (let i = 0; i <= RUNWAY_DAYS; i++) {
          if (closeByOffset.has(i)) bal = closeByOffset.get(i);
          days.push({ balance: bal, date: new Date(start.getTime() + i * 864e5) });
        }
        const under = days.filter((d) => d.balance < alertThreshold).length;
        const negative = days.filter((d) => d.balance < 0).length;
        const low = days.reduce((lo, d) => d.balance < lo.balance ? d : lo, days[0]);
        return { days, under, negative, low, start, end: days[days.length - 1].date };
      } catch (err) {
        console.error("dashboard runway computation failed, hiding the strip", err);
        return null;
      }
    }, [flow, openBal, activeYear, alertThreshold]);
    // Order is the default reading order of Today, and the first
    // DASH_STACK_SIZE of them are what it opens on: what is happening to my
    // money, what do I owe, what changed. Everything from "insight" down is
    // analysis — true, useful, and not what you unlock your phone for.
    const DASH_WIDGET_DEFS = [
      { id: "runway", label: "Runway \u2014 next 90 days", size: "full" },
      { id: "balanceToday", label: "Balance today", size: "third" },
      { id: "nextLow", label: "Next low point", size: "third" },
      { id: "dueMonth", label: "Due rest of month", size: "third" },
      { id: "upcoming", label: "Upcoming this week", size: "full" },
      { id: "endingSoon", label: "Ending-soon chips", size: "full" },
      { id: "monthlyBrief", label: "What changed this month (AI)", size: "full" },
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
    // Eight panels: the runway, the three at-a-glance figures on one row, this
    // week, ending soon, what changed, the year. On a 390px phone that is
    // roughly two screens — long enough to be a briefing, short enough to end.
    const DASH_STACK_SIZE = 8;
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
    // Colour is reserved for state. A balance that is simply fine is ordinary
    // text — it only takes a colour when it has something to say (amber under
    // the alert threshold, red overdrawn). Eleven of the fourteen balance
    // readouts already did this; the three that painted a healthy balance
    // green made the genuinely alarming ones harder to pick out.
    const WIDGET_RENDER = {
      runway: () => runway && /* @__PURE__ */ React.createElement(Card, { className: "runway-card" },
        /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Next 90 days"),
        /* @__PURE__ */ React.createElement("div", {
          className: "runway-bar",
          role: "img",
          // The strip is a picture of a number, so it says the number: a
          // reader who cannot see the colour still gets the low point, the
          // date it falls on and how much of the horizon is under water.
          "aria-label": "Projected balance for the next 90 days. Low point " + fmt(runway.low.balance)
            + " on " + MONTHS[runway.low.date.getMonth()] + " " + runway.low.date.getDate() + ". "
            + (runway.negative > 0
              ? runway.negative + (runway.negative === 1 ? " day" : " days") + " projected overdrawn."
              : runway.under > 0
                ? runway.under + (runway.under === 1 ? " day" : " days") + " below your " + fmt(alertThreshold) + " alert threshold."
                : "Every day stays above your " + fmt(alertThreshold) + " alert threshold.")
        }, runway.days.map((d, i) => /* @__PURE__ */ React.createElement("i", {
          key: i,
          className: "runway-seg",
          style: { background: railTone(d.balance, alertThreshold) }
        }))),
        /* @__PURE__ */ React.createElement("div", { className: "runway-scale" },
          /* @__PURE__ */ React.createElement("span", null, "Today"),
          /* @__PURE__ */ React.createElement("span", null, MONTHS[runway.days[45].date.getMonth()], " ", runway.days[45].date.getDate()),
          /* @__PURE__ */ React.createElement("span", null, MONTHS[runway.end.getMonth()], " ", runway.end.getDate())),
        /* @__PURE__ */ React.createElement("div", { className: "runway-note" },
          runway.negative > 0
            ? /* @__PURE__ */ React.createElement("span", { className: "runway-note-bad" }, "Projected overdrawn on ", runway.negative, runway.negative === 1 ? " day" : " days")
            : runway.under > 0
              ? /* @__PURE__ */ React.createElement("span", { className: "runway-note-warn" }, runway.under, runway.under === 1 ? " day" : " days", " below your ", fmt(alertThreshold), " threshold")
              : /* @__PURE__ */ React.createElement("span", null, "Above your ", fmt(alertThreshold), " threshold the whole way"))),
      balanceToday: () => /* @__PURE__ */ React.createElement(GlanceTile, { title: "Balance today" }, /* @__PURE__ */ React.createElement("div", { className: "glance-value", style: {
        color: !glance ? "var(--textLt)" : glance.balanceNow < 0 ? "var(--red)" : glance.balanceNow < alertThreshold ? "var(--amberInk)" : "var(--text)"
      } }, glance ? fmt(glance.balanceNow) : "\u2014"), glance && addEntry && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "glance-action",
          onClick: () => setShowReconcile(true),
          title: "Compare this against your real bank balance and record the difference"
        },
        "Reconcile\u2026"
      )),
      nextLow: () => /* @__PURE__ */ React.createElement(GlanceTile, { title: "Next low point" }, glance && glance.low ? /* @__PURE__ */ React.createElement("div", { className: "glance-value", style: {
        color: glance.low.balance < 0 ? "var(--red)" : glance.low.balance < alertThreshold ? "var(--amberInk)" : "var(--text)"
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
          border: `1px solid ${e.type === "expense" ? "var(--greenDk)" : "var(--amberInk)"}33`
        } }, /* @__PURE__ */ React.createElement("span", { style: { color: e.type === "expense" ? "var(--greenDk)" : "var(--amberInk)", display: "inline-flex" } }, e.type === "expense" ? /* @__PURE__ */ React.createElement(Icon, { name: "party", size: 15 }) : /* @__PURE__ */ React.createElement(Icon, { name: "alert-triangle", size: 15 })), /* @__PURE__ */ React.createElement("span", { className: "c-text" }, /* @__PURE__ */ React.createElement("strong", null, e.desc), " ends ", e.endLabel, e.monthly > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: e.type === "expense" ? "var(--greenDk)" : "var(--amberInk)", fontWeight: 700 } }, e.type === "expense" ? " \u2014 frees " : " \u2014 reduces income ", fmt(e.monthly), "/mo")))));
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
          const signed = signedAmount(ev);
          const isInc = signed >= 0;
          const isPaid = !!completed[ev.id];
          const balColor = ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amberInk)" : "var(--text)";
          const amtColor = isPaid ? "var(--textLt)" : ev.type === "transfer" ? "var(--accent)" : isInc ? "var(--greenDk)" : "var(--text)";
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
            // The same row this week's occurrences get everywhere else, rail
            // and all — this list used to draw its own, without one.
            return /* @__PURE__ */ React.createElement(LedgerRow, {
              key: ev.id,
              ev,
              alertThreshold,
              paid: isPaid,
              dateLabel: label,
              onTogglePaid: toggleComplete,
              categories,
              categoryColors
            });
          }
          return /* @__PURE__ */ React.createElement("div", { key: ev.id, style: { opacity: isPaid ? 0.6 : 1 } }, /* @__PURE__ */ React.createElement("div", { className: "upcoming-desktop-row" }, /* @__PURE__ */ React.createElement("div", { className: "upcoming-desktop-left" }, paidBtn, /* @__PURE__ */ React.createElement("span", { className: "upcoming-desktop-date" }, label, ev.depositShifted && /* @__PURE__ */ React.createElement(HelpTip, { icon: "↤", variant: "mark", label: "Deposit date", text: depositShiftNote(ev) })), /* @__PURE__ */ React.createElement("span", { className: "upcoming-desktop-desc", style: {
            textDecoration: isPaid ? "line-through" : "none"
          } }, ev.desc),/* @__PURE__ */ React.createElement(CatChip, { category: ev.category, className: "text-9" })), /* @__PURE__ */ React.createElement("div", { className: "upcoming-desktop-amts" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
            color: amtColor
          } }, isInc ? "+" : "-", fmt(ev.amount)), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
            color: balColor
          } }, fmt(ev.balance)))), barDiv);
        })));
      })()),
      monthlyBrief: () => /* @__PURE__ */ React.createElement(MonthlyBriefCard, { flow, activeYear, categories, apiKey, isOffline }),
      insight: () => {
        if (!insight) return null;
        const above = insight.pct > 0;
        const inline = Math.abs(insight.pct) < 2;
        const showDriver = !inline && insight.driver && (above ? insight.driverDelta > 0 : insight.driverDelta < 0);
        return /* @__PURE__ */ React.createElement("div", { "data-widget": "insight", className: "insight-banner", style: {
          borderLeft: "3px solid " + (inline ? "var(--border)" : above ? "var(--amberInk)" : "var(--greenDk)")
        } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "c-text" }, insight.month, " spending"), inline ? ` is in line with your ${insight.n}-month average.` : ` is ${Math.abs(insight.pct)}% ${above ? "above" : "below"} your ${insight.n}-month average`, !inline && showDriver ? ` — ${above ? "driven by" : "biggest drop:"} ${insight.driver} (${insight.driverDelta > 0 ? "+" : "-"}${fmt(Math.abs(insight.driverDelta))}).` : inline ? "" : "."));
      },
      kpis: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "kpi-grid-4" }, /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Annual Income"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: "var(--greenDk)" } }, fmt(totalIncome)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.income), height: 28, width: 64 }))), /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Annual Expenses"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: "var(--text)" } }, fmt(totalExpense)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.expense), height: 28, width: 64 }))), /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Net Surplus/Deficit"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: netSurplus >= 0 ? "var(--greenDk)" : "var(--red)" } }, fmt(netSurplus, true)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.surplus), height: 28, width: 64 })), netSurplus < 0 && /* @__PURE__ */ React.createElement("div", { className: "kpi-warn-note" }, "\u26A0 Spending exceeds income")), /* @__PURE__ */ React.createElement(Card, { className: "kpi-tile" }, /* @__PURE__ */ React.createElement("div", { className: "lbl mb-5" }, "Lowest Balance"), /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-spark-value", style: { color: lowestBal < 0 ? "var(--red)" : lowestBal < alertThreshold ? "var(--amberInk)" : "var(--text)" } }, fmt(lowestBal)), /* @__PURE__ */ React.createElement(Sparkline, { data: summaries.map((m) => m.close), height: 28, width: 64 })), /* @__PURE__ */ React.createElement("div", { className: "kpi-sub-note" }, "In ", lowestMon)))),
      balanceChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(
        ChartToggle,
        {
          value: balView,
          onChange: setBalView,
          options: [{ id: "area", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-area", size: 15 }), label: "Area" }, { id: "line", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-line", size: 15 }), label: "Line" }, { id: "bar", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-bar", size: 15 }), label: "Bar" }]
        }
      ) }, "Running Balance"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, balView === "bar" ? /* @__PURE__ */ React.createElement(BarChart, { data: summaries, ariaLabel: chartAlts.balance, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--red)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(Bar, { dataKey: "close", name: "Balance", radius: [4, 4, 0, 0] }, summaries.map((m, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: m.close < 0 ? "var(--red)" : m.close < alertThreshold ? "var(--amberInk)" : "var(--text)" })))) : balView === "line" ? /* @__PURE__ */ React.createElement(LineChart, { data: summaries, ariaLabel: chartAlts.balance, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--red)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "close", name: "Balance", stroke: "var(--text)", strokeWidth: 2.5, dot: { r: 4, fill: "var(--text)" }, activeDot: { r: 6 } })) : /* @__PURE__ */ React.createElement(AreaChart, { data: summaries, ariaLabel: chartAlts.balance, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--red)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(Area, { type: "monotone", dataKey: "close", name: "Balance", stroke: "var(--text)", strokeWidth: 2.5, fill: "var(--text)", fillOpacity: 0.12, dot: { r: 4, fill: "var(--text)" } })))))),
      surplusChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(
        ChartToggle,
        {
          value: surplusView,
          onChange: setSurplusView,
          options: [{ id: "bar", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-bar", size: 15 }), label: "Bar" }, { id: "line", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-line", size: 15 }), label: "Line" }]
        }
      ) }, "Surplus / Shortfall"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, surplusView === "line" ? /* @__PURE__ */ React.createElement(LineChart, { data: summaries, ariaLabel: chartAlts.surplus, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--textLt)", strokeDasharray: "4 4" }), /* @__PURE__ */ React.createElement(
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
      )) : /* @__PURE__ */ React.createElement(BarChart, { data: summaries, ariaLabel: chartAlts.surplus, margin: { top: 4, right: 4, bottom: 0, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--textLt)" }), /* @__PURE__ */ React.createElement(Bar, { dataKey: "surplus", name: "Surplus", radius: [4, 4, 0, 0] }, summaries.map((m, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)" })))))))),
      incExpChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(
        ChartToggle,
        {
          value: incExpView,
          onChange: setIncExpView,
          options: [{ id: "grouped", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-grouped", size: 15 }), label: "Grouped" }, { id: "stacked", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-stacked", size: 15 }), label: "Stacked" }, { id: "line", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-line", size: 15 }), label: "Line" }]
        }
      ) }, "Income vs Expenses"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, incExpView === "line" ? /* @__PURE__ */ React.createElement(LineChart, { data: summaries, ariaLabel: chartAlts.incExp, margin: { top: 4, right: 4, bottom: 34, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "income", name: "Income", stroke: "var(--greenDk)", strokeWidth: 2.5, dot: { r: 3 }, activeDot: { r: 5 }, endLabel: true }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "expense", name: "Expenses", stroke: "var(--red)", strokeWidth: 2.5, dot: { r: 3 }, activeDot: { r: 5 }, strokeDasharray: "6 4", endLabel: true })) : /* @__PURE__ */ React.createElement(
        BarChart,
        {
          data: summaries,
          ariaLabel: chartAlts.incExp,
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
      topCatsChart: () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(ChartToggle, { options: [{ id: "bar", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-bar", size: 15 }), label: "Bars" }, { id: "pie", icon: /* @__PURE__ */ React.createElement(Icon, { name: "chart-pie", size: 15 }), label: "Pie" }], value: catView, onChange: setCatView }) }, "Top Expense Categories"), catView === "bar" && /* @__PURE__ */ React.createElement("div", { className: "dash-cat-bar-wrap", tabIndex: 0, role: "group", "aria-label": "Top expense categories, scrollable" }, catTotals.map(([cat, total], i) => {
        const pct = total / totalExpense * 100;
        return /* @__PURE__ */ React.createElement("div", { key: cat }, /* @__PURE__ */ React.createElement("div", { className: "label-amt-row" }, /* @__PURE__ */ React.createElement("span", { className: "tx" }, cat), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 amt-mid-600" }, fmt(total))), /* @__PURE__ */ React.createElement("div", { className: "progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "progress-fill", style: {
          width: `${pct}%`,
          background: getCatColor(cat, categories, categoryColors)
        } })));
      })), catView === "pie" && /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, /* @__PURE__ */ React.createElement(PieChart, { ariaLabel: chartAlts.cats }, /* @__PURE__ */ React.createElement(
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
      })), incView === "pie" && /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, /* @__PURE__ */ React.createElement(PieChart, { ariaLabel: chartAlts.inc }, /* @__PURE__ */ React.createElement(
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
          const color = !over ? "var(--greenDk)" : diff <= 5000 ? "var(--amberInk)" : "var(--red)";
          const pct = target > 0 ? Math.min(actual / target * 100, 100) : 0;
          return { cat: c, actual, target, diff, over, color, pct };
        });
        const totalActual = roundMoney(rows.reduce((s, r) => s + r.actual, 0));
        const totalTarget = roundMoney(rows.reduce((s, r) => s + r.target, 0));
        const tDiff = roundMoney((totalActual - totalTarget));
        const tOver = totalTarget > 0 && tDiff > 0;
        const tColor = !tOver ? "var(--greenDk)" : tDiff <= 5000 ? "var(--amberInk)" : "var(--red)";
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bva-rows-wrap", tabIndex: 0, role: "group", "aria-label": "Budget vs actual by category, scrollable" }, rows.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.cat }, /* @__PURE__ */ React.createElement("div", { className: "dash-bva-row-hdr" }, /* @__PURE__ */ React.createElement(CatChip, { category: r.cat, categories, categoryColors, className: "text-9" }), /* @__PURE__ */ React.createElement("div", { className: "dash-bva-amounts" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
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
        // Same recurrence-rule annualization as the Debt Payoff Tracker's own
        // monthly total (see toMonthlyFromEvs in PlanView) — grouped by the
        // underlying entry so a description covered by more than one entry
        // sums each entry's own contribution instead of just the first found.
        const autoMonthly = (key) => {
          const evs = autoAllEvs[key] || [];
          if (!evs.length) return 0;
          const byEntry = {};
          evs.forEach((ev) => {
            const eid = ev.entryId != null ? ev.entryId : ev.id;
            (byEntry[eid] || (byEntry[eid] = [])).push(ev);
          });
          const total = Object.values(byEntry).reduce((sum, occs) => {
            const ev = occs[0];
            if (ev.repeats) {
              const every = ev.recurEvery || 1;
              const ppy = { day: 365 / every, week: 52 / every, month: 12 / every, monthend: 12 / every, monthweekday: 12 / every, year: 1 / every, semimonth: 24 }[ev.recurUnit || "month"] ?? 12;
              return sum + (ev.amount || 0) * (ppy / 12);
            }
            return sum + occs.reduce((s, e) => s + (e.amount || 0), 0) / 12;
          }, 0);
          return roundMoney(total);
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
            background: pct > 50 ? "var(--red)" : pct > 25 ? "var(--amberInk)" : "var(--greenDk)"
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
        summaryView === "heat" && /* @__PURE__ */ React.createElement(Card, { className: "card-flat" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll", tabIndex: 0, role: "region", "aria-label": "Monthly summary heatmap" }, /* @__PURE__ */ React.createElement("table", { className: "dash-table-wide" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, summaryCols.map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: "dash-th-16", style: {
          textAlign: i === 0 ? "left" : "right",
          position: i === summaryCols.length - 1 ? "sticky" : "static",
          right: i === summaryCols.length - 1 ? 0 : "auto",
          background: i === summaryCols.length - 1 ? "var(--navy)" : "transparent",
          boxShadow: i === summaryCols.length - 1 ? "-6px 0 8px -6px rgba(0,0,0,0.25)" : "none"
        } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, summaries.map((m, i) => {
          const maxInc = Math.max(...summaries.map((s) => s.income), 1);
          const maxExp = Math.max(...summaries.map((s) => s.expense), 1);
          const maxAbs = Math.max(...summaries.map((s) => Math.abs(s.surplus)), 1);
          const maxBal = Math.max(...summaries.map((s) => Math.abs(s.close)), 1);
          const heatInc = `rgba(39,174,115,${0.1 + 0.7 * (m.income / maxInc)})`;
          const heatExp = `rgba(232,93,74,${0.1 + 0.7 * (m.expense / maxExp)})`;
          const heatSur = m.surplus >= 0 ? `rgba(39,174,115,${0.1 + 0.7 * (m.surplus / maxAbs)})` : `rgba(232,93,74,${0.1 + 0.7 * (Math.abs(m.surplus) / maxAbs)})`;
          const heatBal = m.close >= 0 ? `rgba(47,84,150,${0.1 + 0.5 * (m.close / maxBal)})` : `rgba(232,93,74,${0.15 + 0.6 * (Math.abs(m.close) / maxBal)})`;
          return /* @__PURE__ */ React.createElement("tr", { key: m.month, className: "dash-table-row" }, /* @__PURE__ */ React.createElement("td", { className: "dash-td-13" }, m.month), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 heat-inc-td", style: { background: heatInc } }, fmt(m.income)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 heat-exp-td", style: { background: heatExp } }, fmt(m.expense)), hasTransfers && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 c-text" }, m.transfersIn || m.transfersOut ? fmt(m.transfersIn - m.transfersOut, true) : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 fw-700", style: { background: heatSur, color: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)" } }, fmt(m.surplus, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-heat-bal-td", style: { background: heatBal, color: m.close < 0 ? "var(--red)" : m.close < alertThreshold ? "var(--amberInk)" : "var(--text)" } }, fmt(m.close)));
        }))))),
        summaryView === "table" && /* @__PURE__ */ React.createElement(Card, { className: "card-flat" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll", tabIndex: 0, role: "region", "aria-label": "Monthly summary table" }, /* @__PURE__ */ React.createElement("table", { className: "dash-table-wide" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, summaryCols.map((h, i) => /* @__PURE__ */ React.createElement("th", { key: h, className: "dash-th-16", style: {
          textAlign: i === 0 ? "left" : "right",
          position: i === summaryCols.length - 1 ? "sticky" : "static",
          right: i === summaryCols.length - 1 ? 0 : "auto",
          background: i === summaryCols.length - 1 ? "var(--navy)" : "transparent",
          boxShadow: i === summaryCols.length - 1 ? "-6px 0 8px -6px rgba(0,0,0,0.25)" : "none"
        } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, summaries.map((m, i) => /* @__PURE__ */ React.createElement("tr", { key: m.month, className: "dash-table-row", style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" } }, /* @__PURE__ */ React.createElement("td", { className: "dash-td-13" }, m.month), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 c-text" }, fmt(m.income)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 c-text" }, fmt(m.expense)), hasTransfers && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 c-text" }, m.transfersIn || m.transfersOut ? fmt(m.transfersIn - m.transfersOut, true) : "\u2014"), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-amt-td-16 fw-700", style: {
          color: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)",
          background: m.surplus < 0 ? "var(--redLt)" : "transparent"
        } }, fmt(m.surplus, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-table-bal-td", style: {
          color: m.close < 0 ? "var(--red)" : m.close < alertThreshold ? "var(--amberInk)" : "var(--text)",
          background: m.close < 0 ? "var(--redLt)" : m.close < alertThreshold ? "var(--amberLt)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)"
        } }, fmt(m.close)))), /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, /* @__PURE__ */ React.createElement("td", { className: "dash-annual-total-label" }, "Annual Total"), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-annual-total-amt" }, fmt(totalIncome)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-annual-total-amt" }, fmt(totalExpense)), hasTransfers && /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-annual-total-amt" }, fmt(netTransfers, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 dash-total-amt-td", style: { color: netSurplus >= 0 ? "var(--green)" : "var(--coral)" } }, fmt(netSurplus, true)), /* @__PURE__ */ React.createElement("td", { className: "dash-total-spacer-td" }))))))
      ),
      yoy: () => /* @__PURE__ */ React.createElement(React.Fragment, null, showYoY ? /* @__PURE__ */ React.createElement(Card, { className: "mb-16" }, /* @__PURE__ */ React.createElement(SectionTitle, { action: /* @__PURE__ */ React.createElement(PillToggle, { options: yoyMetrics, value: yoyMetric, onChange: setYoyMetric, size: "sm" }) }, "Year-over-Year Comparison"), /* @__PURE__ */ React.createElement("div", { className: "pb-28" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: DASH_CHART_H }, /* @__PURE__ */ React.createElement(LineChart, { data: yoyData, ariaLabel: `Line chart comparing ${(yoyMetrics.find((m) => m.id === yoyMetric) || {}).label} month by month across ${yearConfigs.map((y) => y.year).join(", ")}. The Annual Comparison table below carries the same figures.`, margin: { top: 4, right: 8, bottom: 34, left: 4 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--border)" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "month", tick: DASH_AXIS_TICK_X, tickMargin: 4 }), /* @__PURE__ */ React.createElement(YAxis, { tickFormatter: fmtAxisK, tick: DASH_AXIS_TICK_Y, tickMargin: 6, width: 44 }), /* @__PURE__ */ React.createElement(Tooltip, { content: ChartTip }), /* @__PURE__ */ React.createElement(Legend, { wrapperStyle: { fontSize: 12 } }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 0, stroke: "var(--textLt)", strokeDasharray: "4 4" }), yearConfigs.map((yc, yi) => /* @__PURE__ */ React.createElement(
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
      const mk = (e) => ({ id: genId(), notes: "", repeats: false, recurEvery: 1, recurUnit: "month", recurDays: [], recurEnd: "", sample: true, ...e });
      setEntries((prev) => [...prev, ...[
        mk({ desc: "(Sample) Paycheque", type: "income", amount: 235000, category: "Income", repeats: true, recurUnit: "semimonth", startDate: `${y}-01-05` }),
        mk({ desc: "(Sample) Rent", type: "expense", amount: 140000, category: "Housing", repeats: true, startDate: `${y}-01-01` }),
        mk({ desc: "(Sample) Groceries", type: "expense", amount: 55000, category: "Food", repeats: true, startDate: `${y}-01-08` }),
        mk({ desc: "(Sample) Hydro & Internet", type: "expense", amount: 21000, category: "Utilities", repeats: true, startDate: `${y}-01-15` }),
        mk({ desc: "(Sample) Streaming", type: "expense", amount: 3200, category: "Subscriptions", repeats: true, startDate: `${y}-01-20` }),
        mk({ desc: "(Sample) Fuel", type: "expense", amount: 26000, category: "Transportation", repeats: true, startDate: `${y}-01-12` })
      ]]);
    };
    const stepBadge = (n, done) => /* @__PURE__ */ React.createElement("span", { "aria-hidden": true, className: "step-badge", style: { background: done ? "var(--greenLt)" : "var(--stripe)", border: `1.5px solid ${done ? "var(--greenDk)" : "var(--border)"}`, color: done ? "var(--greenDk)" : "var(--textMid)" } }, done ? "✓" : n);
    const quickAdd = () => window.dispatchEvent(new CustomEvent("cf:quickadd"));
    const firstRunPanel = entries.length === 0 && /* @__PURE__ */ React.createElement(Card, { className: "firstrun-card" }, /* @__PURE__ */ React.createElement("div", { className: "firstrun-title" }, "Welcome — let's map out your cash flow"), /* @__PURE__ */ React.createElement("div", { className: "firstrun-subtitle" }, "Three quick steps and this dashboard comes to life."), /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, stepBadge(1, openBal !== 0), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-text" }, /* @__PURE__ */ React.createElement("strong", null, "Set your opening balance"), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-hint" }, "What's in the account today?")), /* @__PURE__ */ React.createElement("span", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("input", { type: "number", inputMode: "decimal", placeholder: "e.g. 2500", value: obDraft, onChange: (e) => setObDraft(e.target.value), "aria-label": "Opening balance", className: "field-input field-input--mono firstrun-ob-input", onKeyDown: (e) => {
      if (e.key === "Enter" && obDraft !== "") {
        setYearConfigs((prev) => prev.map((yc) => yc.year === activeYear ? { ...yc, openingBalance: dollarsToCents(obDraft) } : yc));
      }
    } }), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary cf-btn--md", disabled: obDraft === "", onClick: () => setYearConfigs((prev) => prev.map((yc) => yc.year === activeYear ? { ...yc, openingBalance: dollarsToCents(obDraft) } : yc)) }, openBal !== 0 ? "Update" : "Set"))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, stepBadge(2, false), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-text" }, /* @__PURE__ */ React.createElement("strong", null, "Add your income"), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-hint" }, "Paycheques and anything else that comes in, with how often")), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--primary cf-btn--md", onClick: quickAdd }, "+ Add income")), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-12 cf-wrap" }, stepBadge(3, false), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-text" }, /* @__PURE__ */ React.createElement("strong", null, "Add your bills"), /* @__PURE__ */ React.createElement("span", { className: "firstrun-step-hint" }, "Rent, utilities, loans — recurring entries fill the whole year")), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--primary cf-btn--md", onClick: quickAdd }, "+ Add bills"))), /* @__PURE__ */ React.createElement("div", { className: "firstrun-footer" }, /* @__PURE__ */ React.createElement("span", { className: "firstrun-footer-text" }, "Just looking around? Load clearly-marked fictional data — one tap removes it again."), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary cf-btn--md", onClick: loadSampleData }, "Load sample data")));
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page dash-wrap dash-page" }, showReconcile && /* @__PURE__ */ React.createElement(ReconcileModal, {
      projected: glance ? glance.balanceNow : openBal,
      categories,
      lastReconciled: lastReconciledDate(entries),
      onCancel: () => setShowReconcile(false),
      onConfirm: recordReconcile
    }), firstRunPanel,
    // The shared-view toggle stays here: it changes *what* you are reading, so
    // it belongs above the reading. Customize changes the page itself and now
    // sits at its foot — see .dash-foot.
    /* @__PURE__ */ React.createElement("div", { className: "dash-toolbar", "data-noprint": true }, showCustomize && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Customize dashboard"
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-card customize-modal-card",
          onClick: (e) => e.stopPropagation()
        },
        /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: () => setShowCustomize(false) }),
        /* @__PURE__ */ React.createElement("div", { className: "customize-title" }, "Customize Dashboard"),
        /* @__PURE__ */ React.createElement("div", { className: "customize-note" }, "Today opens on everything above the line. The rest is one tap below it \u2014 move a panel across to change what you land on."),
        /* @__PURE__ */ React.createElement("div", { className: "customize-list" }, dashOrderEff.map((id, idx) => {
          const w = DASH_WIDGET_DEFS.find((x) => x.id === id);
          if (!w) return null;
          // The fold falls after the DASH_STACK_SIZE-th *shown* panel, so
          // hiding one pulls the next one up across the line — which is what
          // the reader sees happen on Today.
          const shownBefore = dashOrderEff.slice(0, idx + 1).filter((x) => !dashHidden[x]).length;
          const foldAfter = !dashHidden[id] && shownBefore === DASH_STACK_SIZE;
          const move = (dir) => {
            haptic();
            const next = [...dashOrderEff];
            const j = idx + dir;
            if (j < 0 || j >= next.length) return;
            [next[idx], next[j]] = [next[j], next[idx]];
            setDashOrder(next);
          };
          const item = /* @__PURE__ */ React.createElement("div", { key: id, className: "customize-item", style: {
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
          if (!foldAfter) return item;
          return /* @__PURE__ */ React.createElement(React.Fragment, { key: id + "_fold" }, item,
            /* @__PURE__ */ React.createElement("div", { className: "customize-fold" },
              /* @__PURE__ */ React.createElement("span", null, "below the fold")));
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
    ), users.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "dash-customize-row", "data-noprint": true }, React.createElement(PillToggle, { options: [{ id: false, label: "My entries" }, { id: true, label: "All users" }], value: sharedView, onChange: setSharedView, size: "sm" }))), (() => {
      const GLANCE_IDS = ["balanceToday", "nextLow", "dueMonth"];
      const visible = dashOrderEff.filter((id) => !dashHidden[id] && !(GLANCE_IDS.includes(id) && (!glance || entries.length === 0)));
      const sizeOf = (id) => (DASH_WIDGET_DEFS.find((w) => w.id === id) || {}).size || "full";
      // Rows, not widgets: thirds pack three across and halves two, so laying
      // out first and cutting afterwards is the only way to split the page
      // without slicing a row down the middle.
      const rows = [];
      let i = 0;
      while (i < visible.length) {
        const id = visible[i], sz = sizeOf(id);
        if (sz === "third") {
          const run = [id];
          while (run.length < 3 && i + run.length < visible.length && sizeOf(visible[i + run.length]) === "third") run.push(visible[i + run.length]);
          rows.push({ n: run.length, el: /* @__PURE__ */ React.createElement("div", { key: run.join("_"), className: "glance-grid", style: { gridTemplateColumns: `repeat(${run.length},1fr)` } }, run.map((rid) => /* @__PURE__ */ React.createElement(React.Fragment, { key: rid }, WIDGET_RENDER[rid]()))) });
          i += run.length;
        } else if (sz !== "full" && i + 1 < visible.length && sizeOf(visible[i + 1]) !== "full" && sizeOf(visible[i + 1]) !== "third") {
          const id2 = visible[i + 1], sz2 = sizeOf(id2);
          const cols = sz === "wide" && sz2 === "narrow" ? "3fr 2fr" : sz === "narrow" && sz2 === "wide" ? "2fr 3fr" : "1fr 1fr";
          rows.push({ n: 2, el: /* @__PURE__ */ React.createElement("div", { key: id + "_" + id2, className: "chart-grid", style: { gridTemplateColumns: cols } }, WIDGET_RENDER[id](), WIDGET_RENDER[id2]()) });
          i += 2;
        } else if (sz !== "full") {
          rows.push({ n: 1, el: /* @__PURE__ */ React.createElement("div", { key: id, className: "chart-grid" }, WIDGET_RENDER[id]()) });
          i += 1;
        } else {
          rows.push({ n: 1, el: /* @__PURE__ */ React.createElement(React.Fragment, { key: id }, WIDGET_RENDER[id]()) });
          i += 1;
        }
      }
      // Today used to open as all eighteen panels at once: eight screens of
      // charts you have to scroll past to reach the ones that tell you what to
      // do. It leads with a stack now — runway, the three at-a-glance figures,
      // this week, ending soon, what changed, the year — and the analysis sits
      // one tap below it.
      //
      // The rule is positional on purpose, so it stays the user's: Today shows
      // your first DASH_STACK_SIZE panels, whichever those are. Reordering in
      // Customize is what moves a panel above or below the line, and the sheet
      // draws the line so you can see where it falls.
      let cut = 0, taken = 0;
      while (cut < rows.length && taken < DASH_STACK_SIZE) { taken += rows[cut].n; cut++; }
      const lead = rows.slice(0, cut).map((r) => r.el);
      const tail = rows.slice(cut);
      const n = tail.reduce((a, r) => a + r.n, 0);
      const more = !tail.length ? null : /* @__PURE__ */ React.createElement("div", { className: "dash-more" },
        /* @__PURE__ */ React.createElement("button", {
          className: "dash-more-btn",
          onClick: () => { haptic(); setDashMore(!dashMore); },
          "aria-expanded": dashMore ? "true" : "false"
        }, /* @__PURE__ */ React.createElement("span", { className: "dash-more-chev", "aria-hidden": "true" }, dashMore ? "\u2303" : "\u2304"),
           dashMore ? "Hide the rest" : `More on ${activeYear} \u2014 ${n} more panel${n === 1 ? "" : "s"}`));
      // The foot of Today: what else there is, and the way to change what is
      // on it. Both are things you reach for having read the page, not before.
      const foot = /* @__PURE__ */ React.createElement("div", { key: "dash-foot", className: "dash-foot dash-customize-row", "data-noprint": true },
        more,
        entries.length > 0 && /* @__PURE__ */ React.createElement("button", {
          className: "dash-foot-customize",
          onClick: () => setShowCustomize(true)
        }, "\u2699 Customize"));
      return [...lead, foot,
        dashMore && tail.length ? /* @__PURE__ */ React.createElement("div", { key: "dash-more-body", className: "dash-more-body" }, tail.map((r) => r.el)) : null];
    })());
  }
