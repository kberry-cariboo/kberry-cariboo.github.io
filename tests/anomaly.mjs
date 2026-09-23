// Categories spending unlike themselves.
//
// As with drifted bills, the feature is mostly a judgement about when to stay
// quiet. Month-to-month category spending is noisy, and a panel that remarks
// on every wobble is one people stop reading — so the silent cases are what
// most of this pins down.
//
//   node tests/anomaly.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadSrc } from './load-src.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// categoryAnomalyFindings formats money, so format.js comes along.
const noHook = () => { throw new Error('anomaly detection must not need React'); };
// The source is ES modules; loadSrc bundles these (and what they import) and
// runs them against the stand-ins passed here.
const load = (React, localStorage, window) => loadSrc(['src/lib/anomaly.js'], { React, localStorage, window });
const { categoryAnomalies, categoryAnomalyFindings, anomalyMonthTotals } =
  load(new Proxy({}, { get: () => noHook }),
    { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    { matchMedia: () => ({ matches: false }) });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

// A flow of expense events: month -> category -> amount, one event each.
const flowOf = (spec) => {
  const out = [];
  Object.entries(spec).forEach(([month, cats]) => {
    Object.entries(cats).forEach(([category, amount]) => {
      out.push({ month: Number(month), type: 'expense', category, amount });
    });
  });
  return out;
};
// The same amount every month for months 0..n-1.
const steady = (category, amount, n = 6) => {
  const spec = {};
  for (let m = 0; m < n; m++) spec[m] = { [category]: amount };
  return spec;
};

// ── Reading a month ──────────────────────────────────────────────────────────
{
  const flow = flowOf({ 0: { Food: 5000, Fuel: 3000 }, 1: { Food: 6000 } });
  check('totals: expenses are summed per category, per month',
    anomalyMonthTotals(flow, 0).Food === 5000 && anomalyMonthTotals(flow, 0).Fuel === 3000,
    J(anomalyMonthTotals(flow, 0)));
  check('totals: a month with nothing in it totals nothing',
    Object.keys(anomalyMonthTotals(flow, 5)).length === 0);
  // Income and transfers are not spending.
  const mixed = [...flow, { month: 0, type: 'income', category: 'Food', amount: 99999 },
                          { month: 0, type: 'transfer', category: 'Food', amount: 88888 }];
  check('totals: only expenses count',
    anomalyMonthTotals(mixed, 0).Food === 5000, J(anomalyMonthTotals(mixed, 0)));
}

// ── When it speaks ───────────────────────────────────────────────────────────
{
  // Six months of $200 groceries, then $400.
  const flow = flowOf({ ...steady('Food', 20000), 6: { Food: 40000 } });
  const a = categoryAnomalies(flow, 6);
  check('anomaly: a category well above its own average is reported',
    a.length === 1 && a[0].category === 'Food' && a[0].direction === 'up', J(a));
  check('anomaly: it carries the figure it is being judged against',
    a[0].avg === 20000 && a[0].current === 40000 && a[0].delta === 20000, J(a[0]));
  check('anomaly: the percentage is against that average',
    Math.round(a[0].pct * 100) === 100, J(a[0].pct));
}
{
  // Spending far below usual is worth knowing too — a missed bill looks
  // exactly like thrift, and only the person can tell which it was.
  const flow = flowOf({ ...steady('Insurance', 20000), 6: { Insurance: 0 } });
  const a = categoryAnomalies(flow, 6);
  check('anomaly: a category well below its own average is reported as down',
    a.length === 1 && a[0].direction === 'down' && a[0].delta === -20000, J(a));
}
{
  // Two categories moving at once is exactly the case the single-driver
  // insight could not report.
  const flow = flowOf({
    ...steady('Food', 20000), ...steady('Fuel', 15000),
    6: { Food: 40000, Fuel: 1000 },
  });
  const spec = {};
  for (let m = 0; m < 6; m++) spec[m] = { Food: 20000, Fuel: 15000 };
  spec[6] = { Food: 40000, Fuel: 1000 };
  const a = categoryAnomalies(flowOf(spec), 6);
  check('anomaly: both movers are reported, not just the biggest',
    a.length === 2 && a.map((x) => x.category).sort().join() === 'Food,Fuel', J(a.map((x) => x.category)));
  check('anomaly: ordered by cash difference',
    Math.abs(a[0].delta) >= Math.abs(a[1].delta), J(a.map((x) => x.delta)));
}

// ── When it stays quiet ──────────────────────────────────────────────────────
{
  const flow = flowOf({ ...steady('Food', 20000), 6: { Food: 21000 } });
  check('quiet: a 5% wobble is not news', categoryAnomalies(flow, 6).length === 0,
    J(categoryAnomalies(flow, 6)));
}
{
  // A category used twice in six months has no usual amount.
  const flow = flowOf({ 0: { Gifts: 20000 }, 3: { Gifts: 20000 }, 6: { Gifts: 60000 } });
  check('quiet: a category used in two of six months has no average to depart from',
    categoryAnomalies(flow, 6).length === 0, J(categoryAnomalies(flow, 6)));
}
{
  // Doubling a trivial category is still trivial.
  const flow = flowOf({ ...steady('Apps', 600), 6: { Apps: 1800 } });
  check('quiet: a category too small to matter stays quiet whatever it does',
    categoryAnomalies(flow, 6).length === 0, J(categoryAnomalies(flow, 6)));
}
{
  const flow = flowOf({ 0: { Food: 20000 } });
  check('quiet: January has no history behind it', categoryAnomalies(flow, 0).length === 0);
  check('quiet: a flow that is not a flow does not throw',
    categoryAnomalies(null, 6).length === 0 && categoryAnomalies([], 6).length === 0);
  check('quiet: a month that is not a month does not throw',
    categoryAnomalies(flow, undefined).length === 0 && categoryAnomalies(flow, -1).length === 0);
}
{
  // Only the months before the one being judged are the baseline — including
  // the current month would drag the average toward the very figure being
  // tested and mute the signal.
  const flow = flowOf({ ...steady('Food', 20000), 6: { Food: 40000 }, 7: { Food: 20000 } });
  const a = categoryAnomalies(flow, 6);
  check('anomaly: the month being judged is not part of its own baseline',
    a.length === 1 && a[0].avg === 20000, J(a[0] && a[0].avg));
}

// ── The two noise patterns that made this unusable ───────────────────────────
{
  // A biweekly bill lands three times in some months and twice in others.
  // That is a ~50% swing and it is simply what that bill looks like; both
  // states are far from the mean and neither is news. Found on the real
  // fixture, where biweekly groceries fired every other month.
  const spec = {};
  [520, 780, 520, 520, 780, 520].forEach((v, m) => { spec[m] = { Food: v }; });
  spec[6] = { Food: 52000 / 100 };
  const twice = flowOf({ ...Object.fromEntries(Object.entries(spec).slice(0, 6)
    .map(([m, c]) => [m, { Food: c.Food * 100 }])), 6: { Food: 52000 } });
  check('quiet: a biweekly bill\'s two-payment month is not an anomaly',
    categoryAnomalies(twice, 6).length === 0, J(categoryAnomalies(twice, 6)));
  const thrice = flowOf({ ...Object.fromEntries(Object.entries(spec).slice(0, 6)
    .map(([m, c]) => [m, { Food: c.Food * 100 }])), 6: { Food: 78000 } });
  check('quiet: nor is its three-payment month',
    categoryAnomalies(thrice, 6).length === 0, J(categoryAnomalies(thrice, 6)));
}
{
  // One holiday in the baseline lifts the average, and every ordinary month
  // after it reads as "below average" for ever. Also found on the fixture.
  const flow = flowOf({
    0: { Personal: 30000 }, 1: { Personal: 30000 }, 2: { Personal: 210000 },
    3: { Personal: 30000 }, 4: { Personal: 30000 }, 5: { Personal: 30000 },
    6: { Personal: 30000 },
  });
  check('quiet: one spike in the baseline does not make every later month unusual',
    categoryAnomalies(flow, 6).length === 0, J(categoryAnomalies(flow, 6)));
}
{
  // What must still fire: a genuine step change, above everything before it.
  const flow = flowOf({ ...steady('Food', 20000), 6: { Food: 60000 } });
  check('anomaly: a month above everything before it is still reported',
    categoryAnomalies(flow, 6).length === 1, J(categoryAnomalies(flow, 6)));
  // And a gradual climb, where the newest figure tops every earlier one.
  const climb = flowOf({ 0: { Fuel: 20000 }, 1: { Fuel: 21000 }, 2: { Fuel: 22000 },
                         3: { Fuel: 23000 }, 4: { Fuel: 24000 }, 5: { Fuel: 25000 },
                         6: { Fuel: 40000 } });
  check('anomaly: a climb that keeps going is reported',
    categoryAnomalies(climb, 6).length === 1, J(categoryAnomalies(climb, 6)));
}

// ── The wording ──────────────────────────────────────────────────────────────
{
  const flow = flowOf({ ...steady('Food', 20000), 6: { Food: 40000 } });
  const f = categoryAnomalyFindings(categoryAnomalies(flow, 6), 'July');
  check('findings: one line per anomaly, naming the category and the month',
    f.length === 1 && /Food/.test(f[0].text) && /July/.test(f[0].text), J(f));
  check('findings: it says how far off and what from',
    /above/.test(f[0].text) && /average/.test(f[0].text), f[0] && f[0].text);
  // Spending less is not good news: a missed bill looks like thrift.
  const down = categoryAnomalyFindings(
    categoryAnomalies(flowOf({ ...steady('Food', 20000), 6: { Food: 0 } }), 6), 'July');
  check('findings: neither direction is dressed up as good news',
    down[0].tone !== 'good' && f[0].tone !== 'good', J([f[0].tone, down[0].tone]));
  check('findings: the list is capped so the panel cannot become a wall',
    categoryAnomalyFindings(new Array(20).fill({ category: 'X', delta: 1, avg: 1, months: 6, direction: 'up' }), 'July').length === 3);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
