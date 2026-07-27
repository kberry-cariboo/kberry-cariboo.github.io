  // Shared between PlanView (plan.js) and DashboardView (dashboard.js) —
  // chart-tick styling and the debt-payoff amortization projection used by
  // both PlanView's Debt Payoff Tracker and DashboardView's Debt Snapshot
  // widget. Hoisted to consts/plain functions (not defined inside either
  // view) so they aren't recreated as new object/function identities on
  // every render — DASH_AXIS_TICK_X/Y in particular used to be recreated at
  // each of DashboardView's ~6 chart call sites.
  const DASH_AXIS_TICK_X = { fontFamily: "Inter", fontSize: 11, fill: "var(--textMid)" };
  const DASH_AXIS_TICK_Y = { fontFamily: "'IBM Plex Mono'", fontSize: 11, fill: "var(--textMid)" };
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
