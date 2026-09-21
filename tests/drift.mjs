// Recurring bills whose real cost has moved away from what the entry says.
//
// The whole feature is a judgement call about when to speak: too eager and it
// nags about every variable bill, too shy and the forecast stays wrong. The
// thresholds are the feature, so they are what this pins down — including the
// cases where it must stay silent, which are the ones that make it usable.
//
//   node tests/drift.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const load = new Function(`
  ${read('src/lib/drift.js')}
  return { findAmountDrift, driftForEntry, driftSamplesFor, driftMedian };
`);
const { findAmountDrift, driftForEntry, driftSamplesFor, driftMedian } = load();

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

const entry = (extra = {}) => ({
  id: 'hydro', desc: 'Hydro', type: 'expense', category: 'Utilities',
  amount: 11000, repeats: true, ...extra,
});
// Overrides for one entry, one per month of 2026, from a list of actuals.
const actuals = (list, id = 'hydro', year = 2026, field = 'actualAmount') => {
  const ovs = {};
  list.forEach((v, i) => { ovs[`${id}-${year}-${i}-15`] = { [field]: v }; });
  return { [year]: ovs };
};

// ── The median, not the mean ─────────────────────────────────────────────────
{
  check('median: the middle of an odd run', driftMedian([100, 300, 200]) === 200, J(driftMedian([100, 300, 200])));
  check('median: the mean of the middle two on an even run',
    driftMedian([100, 200, 300, 500]) === 250, J(driftMedian([100, 200, 300, 500])));
  // The reason it is the median: one freak month must not move the suggestion.
  const withFreak = driftMedian([14000, 14200, 13800, 14100, 98000]);
  check('median: one freak month does not drag the suggestion',
    withFreak === 14100, J(withFreak));
}

// ── Reading the samples back ─────────────────────────────────────────────────
{
  const ovs = actuals([14000, 14200, 13800]);
  const s = driftSamplesFor(entry(), ovs);
  check('samples: every recorded actual is found, oldest first',
    s.length === 3 && s[0].month === 0 && s[2].month === 2, J(s));
}
{
  // An entry id containing a dash must not be mis-parsed — the key is
  // `${id}-${year}-${month}-${day}`, and splitting on "-" would break it.
  const ovs = actuals([14000, 14200, 13800], 'hydro-bc');
  const s = driftSamplesFor(entry({ id: 'hydro-bc' }), ovs);
  check('samples: an entry id with a dash in it still matches its own keys',
    s.length === 3, J(s));
  // ...and must not swallow another entry's keys.
  const mixed = { 2026: { ...actuals([1, 2, 3], 'hydro')[2026], ...actuals([9, 9, 9], 'hydro-bc')[2026] } };
  check('samples: a shorter id does not swallow a longer one that starts the same way',
    driftSamplesFor(entry({ id: 'hydro' }), mixed).length === 3, J(driftSamplesFor(entry({ id: 'hydro' }), mixed)));
}
{
  // A skipped month is not evidence about price.
  const ovs = { 2026: { 'hydro-2026-0-15': { actualAmount: 14000, skipped: true },
                        'hydro-2026-1-15': { actualAmount: 14200 } } };
  check('samples: a skipped occurrence is not a price observation',
    driftSamplesFor(entry(), ovs).length === 1, J(driftSamplesFor(entry(), ovs)));
}
{
  // A hand-edited planned amount counts too: it is the same statement about
  // what the bill really is, made in advance rather than after the fact.
  const s = driftSamplesFor(entry(), actuals([14000, 14200, 13800], 'hydro', 2026, 'amount'));
  check('samples: a one-off edited amount counts as evidence, like an actual',
    s.length === 3, J(s));
}

// ── When it speaks ───────────────────────────────────────────────────────────
{
  // The motivating case: $110 planned, ~$141 actual, six months running.
  const d = driftForEntry(entry(), actuals([14000, 14200, 13800, 14100, 14300, 14050]));
  check('drift: a bill running consistently high is reported, with the median as the suggestion',
    d && d.direction === 'up' && d.suggested === 14075 && d.planned === 11000, J(d && [d.direction, d.suggested]));
  check('drift: the finding carries the spread it was drawn from',
    d && d.low === 13800 && d.high === 14300 && d.samples === 6, J(d && [d.low, d.high, d.samples]));
  check('drift: the percentage is signed against the planned figure',
    d && Math.round(d.pct * 100) === 28, J(d && d.pct));
}
{
  // Downward drift is just as useful — an overstated bill makes the forecast
  // needlessly gloomy.
  const d = driftForEntry(entry({ amount: 20000 }), actuals([14000, 14200, 13800]));
  check('drift: a bill running consistently low is reported as down',
    d && d.direction === 'down' && d.delta < 0, J(d && [d.direction, d.delta]));
}
{
  // Only the recent window counts: an old, settled rise should not be averaged
  // back down by figures nobody pays any more.
  const d = driftForEntry(entry({ amount: 11000 }),
    actuals([11000, 11000, 11000, 14000, 14100, 14000, 14050, 14000]));
  check('drift: only the recent window is used, so an old settled rise is not diluted',
    d && d.suggested >= 14000 && d.samples === 6, J(d && [d.suggested, d.samples, d.observed]));
  check('drift: the finding still says how many observations exist in total',
    d && d.observed === 8, J(d && d.observed));
}

// ── When it stays quiet ──────────────────────────────────────────────────────
{
  check('quiet: two payments are a coincidence, not a pattern',
    driftForEntry(entry(), actuals([14000, 14200])) === null);
  check('quiet: a one-time entry has no plan to drift from',
    driftForEntry(entry({ repeats: false }), actuals([14000, 14200, 13800])) === null);
  check('quiet: an entry with no amount has no percentage to be off by',
    driftForEntry(entry({ amount: 0 }), actuals([14000, 14200, 13800])) === null);
  check('quiet: a bill paid exactly as scheduled has not drifted',
    driftForEntry(entry(), actuals([11000, 11000, 11000])) === null);
}
{
  // Accepting a suggestion splits the entry: the old definition is ended at
  // last month and a new one carries the new figure. The ended half still owns
  // the actuals, so without this it would be reported for ever.
  const ended = entry({ recurEnd: '2026-08-31' });
  check('quiet: an entry that has already finished cannot be corrected',
    driftForEntry(ended, actuals([14000, 14200, 13800]), { asOf: '2026-09-21' }) === null);
  check('quiet: ...but the same entry is still reported before it ends',
    driftForEntry(ended, actuals([14000, 14200, 13800]), { asOf: '2026-06-01' }) !== null);
  check('quiet: with no asOf given, nothing is filtered on age',
    driftForEntry(ended, actuals([14000, 14200, 13800])) !== null);
}
{
  // A tenth is the floor, so a mortgage a few dollars out stays quiet.
  const d = driftForEntry(entry({ amount: 165000 }), actuals([166000, 166200, 165900]));
  check('quiet: a 0.6% wobble on a large bill is noise',
    d === null, J(d));
}
{
  // ...and so is a large percentage of a trivial amount.
  const d = driftForEntry(entry({ amount: 300 }), actuals([600, 650, 620]));
  check('quiet: a big percentage of a tiny amount is still only three dollars',
    d === null, J(d));
}
{
  // The case that would make the feature unusable: a genuinely variable bill
  // that swings either side of its planned figure is variable, not drifted.
  const d = driftForEntry(entry(), actuals([6000, 16000, 5500, 16500, 6200, 17000]));
  check('quiet: a bill that swings both ways is variable, not drifted',
    d === null, J(d));
}

// ── The list ─────────────────────────────────────────────────────────────────
{
  const entries = [
    entry({ id: 'sub', desc: 'Streaming', amount: 1000 }),
    entry({ id: 'mort', desc: 'Mortgage', amount: 165000 }),
  ];
  // $10 -> $20 is only a tenner, but it clears both gates; $1,650 -> $1,740 is
  // ninety dollars and still under the tolerance, because a tenth of a
  // mortgage is a lot of money.
  const ovs = {
    2026: {
      ...actuals([2000, 2000, 2000], 'sub')[2026],        // +$10, 100%
      ...actuals([174000, 174000, 174000], 'mort')[2026], // +$90, 5.5%
    },
  };
  const ovs2 = {
    2026: {
      ...actuals([2000, 2000, 2000], 'sub')[2026],
      ...actuals([184000, 184000, 184000], 'mort')[2026], // +$190, 11.5%
    },
  };
  check('list: a 5.5% move on a mortgage is under the tolerance and is not listed',
    findAmountDrift(entries, ovs).map((d) => d.entryId).join() === 'sub', J(findAmountDrift(entries, ovs).map((d) => d.entryId)));
  const found = findAmountDrift(entries, ovs2);
  check('list: findings are ordered by cash difference, not percentage',
    found.map((d) => d.entryId).join() === 'mort,sub', J(found.map((d) => [d.entryId, d.delta])));
}
{
  check('list: nothing recorded means nothing to report',
    findAmountDrift([entry()], {}).length === 0);
  check('list: no entries at all does not throw',
    findAmountDrift(null, null).length === 0);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
