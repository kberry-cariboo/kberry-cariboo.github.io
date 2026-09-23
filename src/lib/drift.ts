  // What a recurring bill actually costs, against what the entry still says.
  //
  // The app already records the real figure: "Actual Amount Paid" on an
  // occurrence updates the running balance and the Envelopes totals without
  // touching the plan, which is exactly right for one month and quietly wrong
  // over six. An entry that says $110 while the last six payments averaged
  // $141 makes every projection past today too optimistic, and nothing in the
  // app ever noticed — the information was all there, unread.
  //
  // So this reads it. Pure functions over plain data: entries and the
  // per-occurrence overrides, in, findings out. No React, no storage, no
  // clock — the caller says which years to look at.
  //
  // Money is integer cents here as everywhere else.

  // An occurrence override records two different kinds of "not the plan":
  // `actualAmount` is what was really paid (reconciliation after the fact) and
  // `amount` is a one-off different figure set in advance. Both mean "this
  // date was not the entry's amount", so both count as evidence — a bill the
  // user keeps hand-editing upward has drifted just as surely as one they keep
  // reconciling upward.
  export const driftActualOf = (ov) => {
    if (!ov || ov.skipped) return void 0;
    if (ov.actualAmount !== void 0) return ov.actualAmount;
    if (ov.amount !== void 0) return ov.amount;
    return void 0;
  };
  // Override keys are `${entryId}-${year}-${month}-${day}`, and an entry id can
  // itself contain a dash, so the tail is matched rather than the whole key
  // split on "-".
  export const DRIFT_KEY_TAIL = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  export function driftSamplesFor(entry, overridesByYr) {
    const out = [];
    const prefix = entry.id + "-";
    Object.keys(overridesByYr || {}).forEach((year) => {
      const ovs = overridesByYr[year] || {};
      Object.keys(ovs).forEach((key) => {
        if (key.indexOf(prefix) !== 0) return;
        const m = DRIFT_KEY_TAIL.exec(key.slice(prefix.length));
        if (!m) return;
        const actual = driftActualOf(ovs[key]);
        if (actual === void 0 || !Number.isFinite(actual)) return;
        out.push({ year: +m[1], month: +m[2], day: +m[3], actual });
      });
    });
    // Oldest first, so "the most recent N" is a slice off the end.
    return out.sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);
  }
  // The middle figure, not the average: one forgotten annual top-up or a
  // double payment should not drag the suggestion with it. An even-length run
  // takes the mean of the middle two, rounded to the cent.
  export function driftMedian(values) {
    if (!values.length) return 0;
    const v = [...values].sort((a, b) => a - b);
    const mid = v.length >> 1;
    return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
  }
  export const DRIFT_DEFAULTS = {
    // Three payments is the fewest that can show a pattern rather than a
    // coincidence.
    minSamples: 3,
    // Only the recent run matters: a bill that rose eighteen months ago and
    // has been steady since has already drifted, and the old figures would
    // drag the suggestion back toward a number nobody pays any more.
    window: 6,
    // Ignore anything under a tenth, and under five dollars in absolute terms
    // — a $2 swing on a $600 mortgage is noise, and so is 15% of $3.
    tolerance: 0.1,
    minAbsCents: 500,
    // Two thirds of the run has to lean the same way. A bill that alternates
    // high and low around the planned figure is variable, not drifted, and
    // telling someone to "update" it to the middle of its own swing is noise.
    agreement: 2 / 3,
  };
  // One entry's finding, or null when it has not drifted. Exposed separately
  // so the reasoning is testable a case at a time.
  export function driftForEntry(entry, overridesByYr, opts: Partial<typeof DRIFT_DEFAULTS> & { asOf?: string } = {}) {
    const o = { ...DRIFT_DEFAULTS, ...opts };
    // A one-time entry has no plan to drift from, and a zero amount has no
    // percentage to be off by.
    if (!entry || !entry.repeats) return null;
    // An entry that has already finished cannot be corrected: changing its
    // amount moves no future occurrence, so reporting it is an instruction the
    // user cannot usefully follow. This matters more than it sounds, because
    // accepting a suggestion *creates* such an entry — the edit path splits
    // the old definition off at the end of last month and starts a new one
    // carrying the new figure. Without this, the bill you just corrected
    // would stay on the list, still citing the actuals that are now the
    // historical entry's own.
    if (o.asOf && entry.recurEnd && entry.recurEnd < o.asOf) return null;
    const planned = entry.amount;
    if (!Number.isFinite(planned) || planned <= 0) return null;

    const all = driftSamplesFor(entry, overridesByYr);
    if (all.length < o.minSamples) return null;
    const recent = all.slice(-o.window);
    const values = recent.map((s) => s.actual);
    const suggested = driftMedian(values);
    const delta = suggested - planned;
    if (delta === 0) return null;

    const threshold = Math.max(o.minAbsCents, Math.round(planned * o.tolerance));
    if (Math.abs(delta) < threshold) return null;

    // Do the samples agree on the direction the median moved?
    const leaning = values.filter((v) => (delta > 0 ? v > planned : v < planned)).length;
    if (leaning / values.length < o.agreement) return null;

    return {
      entryId: entry.id,
      desc: entry.desc,
      category: entry.category,
      type: entry.type,
      planned,
      suggested,
      delta,
      direction: delta > 0 ? "up" : "down",
      samples: values.length,
      observed: all.length,
      low: Math.min(...values),
      high: Math.max(...values),
      // Signed fraction of the planned amount, for wording like "+28%".
      pct: delta / planned,
      since: recent[0],
      latest: recent[recent.length - 1],
    };
  }
  // Every drifted entry, worst first. "Worst" is the absolute cash difference
  // rather than the percentage: a mortgage $90 out matters more than a
  // subscription 40% out at $4, and the list exists to be acted on from the
  // top.
  export function findAmountDrift(entries, overridesByYr, opts: Partial<typeof DRIFT_DEFAULTS> & { asOf?: string } = {}) {
    return (entries || [])
      .map((e) => driftForEntry(e, overridesByYr, opts))
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }
