  // Net worth: what you own, less what you owe.
  //
  // The app already knew two thirds of this and never said it. Debts carry
  // balances (Plan → Debts), and the projection knows what is in the accounts
  // on any given day — but there was nowhere to record the house, the car or
  // the RRSP, so the one number people actually mean by "how am I doing" could
  // not be formed.
  //
  // An asset is deliberately a flat record rather than anything cleverer: a
  // name, a kind, a value and the date that value was last confirmed. No
  // growth rates, no valuations, no history. A figure you typed in March is a
  // figure from March, and the honest thing is to say so rather than to
  // project it forward and present a guess as a measurement.
  //
  // Pure functions over plain data. Money is integer cents, as everywhere.

  const ASSET_KINDS = [
    { id: "property", label: "Property" },
    { id: "vehicle", label: "Vehicle" },
    { id: "investment", label: "Investments" },
    { id: "savings", label: "Savings" },
    { id: "other", label: "Other" }
  ];
  const ASSET_KIND_IDS = ASSET_KINDS.map((k) => k.id);
  const assetKindLabel = (id) => {
    const k = ASSET_KINDS.find((x) => x.id === id);
    return k ? k.label : "Other";
  };
  // Values arrive from a form and from the sync, so they can be a string, a
  // number, or missing. Anything that is not a finite number is nothing —
  // never NaN, which would poison every total it touches.
  const assetValueOf = (a) => {
    const n = typeof a === "number" ? a : parseFloat(a && a.value);
    return Number.isFinite(n) ? n : 0;
  };
  function assetsTotal(assets) {
    return (Array.isArray(assets) ? assets : []).reduce((s, a) => s + assetValueOf(a), 0);
  }
  // Debts are stored keyed by id, with balances as cents in a string, and a
  // `hidden` flag for the ones auto-detected from entries that the user has
  // said are not debts. A hidden debt is not counted here for the same reason
  // it is not simulated: the user has said it is not one.
  function debtsTotal(debtData) {
    return Object.keys(debtData || {}).reduce((s, key) => {
      const d = debtData[key] || {};
      if (d.hidden) return s;
      const bal = parseFloat(d.balance);
      return Number.isFinite(bal) && bal > 0 ? s + bal : s;
    }, 0);
  }
  // An asset nobody has touched in a long time is not wrong, but the total it
  // feeds should not be presented as current without saying when it was last
  // confirmed. A year is the threshold: annual is about how often people
  // actually revisit a house or a pension valuation.
  const ASSET_STALE_DAYS = 365;
  function staleAssets(assets, asOf, staleDays = ASSET_STALE_DAYS) {
    if (!asOf) return [];
    const now = parseDate(asOf);
    if (!now) return [];
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - staleDays);
    const cutoffStr = localDateStr(cutoff);
    return (Array.isArray(assets) ? assets : []).filter((a) => a && a.asOf && a.asOf < cutoffStr);
  }
  // The whole picture, in one pass.
  //
  // `cash` is the projected balance across the accounts as of today, which the
  // app is already computing for Today's "Balance today" tile — passed in
  // rather than recomputed, so the two can never disagree. It is signed: a
  // household running below zero has less than nothing in the bank, and net
  // worth should say so.
  function netWorthSummary({ assets = [], debtData = {}, cash = 0, asOf = "", staleDays = ASSET_STALE_DAYS } = {}) {
    const owned = assetsTotal(assets);
    const owed = debtsTotal(debtData);
    const cashCents = Number.isFinite(cash) ? cash : 0;
    const byKind = ASSET_KIND_IDS.map((id) => {
      const rows = (Array.isArray(assets) ? assets : []).filter((a) => (a && a.kind) === id
        || (id === "other" && a && !ASSET_KIND_IDS.includes(a.kind)));
      return { kind: id, label: assetKindLabel(id), total: assetsTotal(rows), count: rows.length };
    }).filter((k) => k.count > 0);
    return {
      assets: owned,
      debts: owed,
      cash: cashCents,
      // What you own — the things plus the money — less what you owe.
      total: owned + cashCents - owed,
      byKind,
      stale: staleAssets(assets, asOf, staleDays),
      // Nothing recorded at all is a different state from a net worth of zero,
      // and the UI needs to tell them apart to know whether to show an empty
      // state or a figure.
      empty: (Array.isArray(assets) ? assets : []).length === 0 && owed === 0
    };
  }
