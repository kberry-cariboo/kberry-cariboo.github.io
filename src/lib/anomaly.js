  // Categories spending unlike themselves.
  //
  // computeSpendingInsight already compares the month's total against its
  // trailing average and names the single biggest mover. That answers "is this
  // month heavy?" and, roughly, "because of what?" — but only ever about one
  // category, and only about the one that moved most in dollars. A month that
  // is normal overall because groceries doubled while the holiday fund went
  // untouched reads as unremarkable, and the two facts worth knowing are both
  // inside it.
  //
  // So this asks the question per category instead: is this one spending
  // unlike its own recent self? No AI, no API key, no model — it is arithmetic
  // over the events the app already has, which means it works for the people
  // who never configure AI access, which is most of them.
  //
  // Pure functions over the flow array. Money is integer cents.

  const ANOMALY_DEFAULTS = {
    // How many months of history to average over. Six is long enough for a
    // quarterly bill to appear twice and short enough that last winter's
    // heating is not still being held against this April.
    lookback: 6,
    // A category has to have been used in at least this many of those months
    // before it has a "usual" to depart from. Without it, a category first
    // used last month reads as infinitely above its average.
    minMonths: 3,
    // Month-to-month category spending is genuinely noisy — far noisier than a
    // recurring bill's amount, which is why this is looser than drift's tenth.
    tolerance: 0.25,
    // And a floor in cash, so a 40% swing on a $6 subscription stays quiet.
    minAbsCents: 2500,
    // Categories smaller than this have no signal worth reporting at all.
    minBaselineCents: 2000,
  };

  // Expense totals per category for one month of the flow.
  function anomalyMonthTotals(flow, month) {
    const out = {};
    (flow || []).forEach((ev) => {
      if (!ev || ev.month !== month || ev.type !== "expense") return;
      const cat = ev.category || "Uncategorised";
      out[cat] = (out[cat] || 0) + (ev.amount || 0);
    });
    return out;
  }

  // Every category spending unlike its own recent self, worst first.
  //
  // `month` is the month being judged, zero-indexed, and the comparison runs
  // over the months before it — so January has nothing to say and returns
  // nothing, rather than comparing itself against an empty history.
  function categoryAnomalies(flow, month, opts = {}) {
    const o = { ...ANOMALY_DEFAULTS, ...opts };
    if (!Array.isArray(flow) || !Number.isFinite(month) || month <= 0) return [];
    const from = Math.max(0, month - o.lookback);
    const history = [];
    for (let m = from; m < month; m++) history.push(anomalyMonthTotals(flow, m));
    if (!history.length) return [];
    const current = anomalyMonthTotals(flow, month);

    const cats = new Set();
    history.forEach((h) => Object.keys(h).forEach((c) => cats.add(c)));
    Object.keys(current).forEach((c) => cats.add(c));

    const out = [];
    cats.forEach((cat) => {
      // Months the category was actually used. A category used in two of six
      // months has no usual amount, however much it cost on those two.
      const used = history.filter((h) => (h[cat] || 0) > 0).length;
      if (used < o.minMonths) return;
      // The average includes the months it was not used, because "did this
      // month cost more than this category normally costs" is a question about
      // every month, not only the ones with a bill in them.
      const avg = Math.round(history.reduce((s, h) => s + (h[cat] || 0), 0) / history.length);
      if (avg < o.minBaselineCents) return;
      const now = current[cat] || 0;
      const delta = now - avg;
      const threshold = Math.max(o.minAbsCents, Math.round(avg * o.tolerance));
      if (Math.abs(delta) < threshold) return;

      // Being far from the average is not the same as being unusual, and on
      // real data the difference is most of the signal. A biweekly grocery
      // shop lands three times in some months and twice in others, a ~50%
      // swing that is simply what that bill looks like; one summer holiday in
      // the baseline drags the average up and makes every ordinary month
      // afterwards read as "below average". Both are true statements about
      // the mean and neither is worth saying.
      //
      // So the month also has to leave the range the category has actually
      // occupied: more than it has ever been over the lookback, or less. A
      // gradual climb still qualifies, because the newest figure is above
      // every earlier one. A category oscillating between two normal states
      // never does.
      const seen = history.map((h) => h[cat] || 0);
      const hi = Math.max(...seen), lo = Math.min(...seen);
      if (delta > 0 && now <= hi) return;
      if (delta < 0 && now >= lo) return;
      out.push({
        category: cat,
        current: now,
        avg,
        delta,
        direction: delta > 0 ? "up" : "down",
        pct: delta / avg,
        months: history.length,
        used,
        low: lo,
        high: hi,
      });
    });
    // Cash difference, not percentage: $300 more on groceries matters more
    // than double on a $30 category, and the list is read from the top.
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  // One line per anomaly, in the shape the Alerts centre renders. Kept beside
  // the arithmetic so the wording and the thresholds stay in one file.
  function categoryAnomalyFindings(anomalies, monthName, limit = 3) {
    return (anomalies || []).slice(0, limit).map((a) => ({
      id: "cat-anomaly-" + a.category,
      // Spending less than usual is not good news by itself — a missed bill
      // looks exactly like thrift — so neither direction is coloured as good.
      tone: a.direction === "up" ? "warn" : "info",
      icon: a.direction === "up" ? "trending-up" : "chart-down",
      route: "envelopes",
      text: `${a.category} in ${monthName} is ${fmt(Math.abs(a.delta))} ${a.direction === "up" ? "above" : "below"} `
        + `its ${a.months}-month average of ${fmt(a.avg)}.`,
    }));
  }
