// What a category's total is made of.
//
// The grouping is the part with judgement in it: two entries can share a
// description and must not be added together, while one entry's occurrences
// must be, even when a per-date edit renamed one of them. Both of those are
// easy to get backwards and neither is visible on screen until someone
// notices a total that does not reconcile.
//
//   node tests/cat-detail.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadSrc } from './load-src.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// The source is ES modules; loadSrc bundles these (and what they import) and
// runs them against the stand-ins passed here.
const load = () => loadSrc(['src/lib/cat-detail.ts'], {});
const { categoryDetail } = load();

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

const ev = (extra = {}) => ({
  id: 'x', entryId: 'e1', desc: 'Rent', type: 'expense', category: 'Housing',
  amount: 165000, month: 0, day: 1, ...extra,
});

// ── Grouping ─────────────────────────────────────────────────────────────────
{
  const flow = [
    ev({ id: 'a', month: 0 }), ev({ id: 'b', month: 1 }), ev({ id: 'c', month: 2 }),
    ev({ id: 'd', entryId: 'e2', desc: 'Hydro', category: 'Housing', amount: 11000, month: 0 }),
  ];
  const d = categoryDetail(flow, 'Housing');
  check('one line per thing being paid, not per payment',
    d.rows.length === 2, J(d.rows.map((r) => [r.desc, r.count])));
  check('the line carries its count and its total',
    d.rows[0].desc === 'Rent' && d.rows[0].count === 3 && d.rows[0].total === 495000, J(d.rows[0]));
  check('ordered by what costs most',
    d.rows.map((r) => r.desc).join() === 'Rent,Hydro', J(d.rows.map((r) => r.desc)));
  check('the category total is the sum of its lines',
    d.total === 495000 + 11000 && d.count === 4, J([d.total, d.count]));
}
{
  // Two different entries can share a description — the car policy and the
  // house policy are both "Insurance" and are not one line.
  const flow = [
    ev({ id: 'a', entryId: 'car', desc: 'Insurance', category: 'Insurance', amount: 9000 }),
    ev({ id: 'b', entryId: 'house', desc: 'Insurance', category: 'Insurance', amount: 12000 }),
  ];
  const d = categoryDetail(flow, 'Insurance');
  check('two entries sharing a description stay two lines',
    d.rows.length === 2, J(d.rows.map((r) => [r.desc, r.total])));
}
{
  // ...while one entry's occurrences stay one line even when a per-date edit
  // renamed one of them.
  const flow = [
    ev({ id: 'a', desc: 'Groceries', category: 'Food', amount: 26000, month: 0 }),
    ev({ id: 'b', desc: 'Groceries (big shop)', category: 'Food', amount: 41000, month: 1 }),
  ];
  const d = categoryDetail(flow, 'Food');
  check('one entry stays one line even if a date was renamed',
    d.rows.length === 1 && d.rows[0].count === 2 && d.rows[0].total === 67000, J(d.rows));
}
{
  // An event with no entryId at all — older data, or something hand-made —
  // groups by description rather than collapsing everything into one line.
  const flow = [
    ev({ id: 'a', entryId: undefined, desc: 'One off', amount: 5000 }),
    ev({ id: 'b', entryId: undefined, desc: 'Another', amount: 6000 }),
  ];
  const d = categoryDetail(flow, 'Housing');
  check('events with no entry id group by description, not into one heap',
    d.rows.length === 2, J(d.rows.map((r) => r.desc)));
}

// ── The occurrences under a line ─────────────────────────────────────────────
{
  const flow = [
    ev({ id: 'c', month: 5, day: 1 }), ev({ id: 'a', month: 0, day: 1 }), ev({ id: 'b', month: 2, day: 1 }),
  ];
  const d = categoryDetail(flow, 'Housing');
  check('occurrences read as a history: date order, not the order they arrived',
    d.rows[0].occurrences.map((o) => o.month).join() === '0,2,5',
    J(d.rows[0].occurrences.map((o) => o.month)));
  check('every payment is there, not just the first few',
    d.rows[0].occurrences.length === 3);
}
{
  // A per-date override is why a line is often not simply amount x count, so
  // it is marked.
  const flow = [
    ev({ id: 'a', month: 0 }),
    ev({ id: 'b', month: 1, amount: 170000, plannedAmount: 165000 }),
  ];
  const d = categoryDetail(flow, 'Housing');
  const marked = d.rows[0].occurrences.filter((o) => o.edited);
  check('an occurrence that differs from what was planned is marked as edited',
    marked.length === 1 && marked[0].amount === 170000, J(d.rows[0].occurrences));
  check('one that matches its plan is not marked',
    d.rows[0].occurrences.filter((o) => !o.edited).length === 1);
}

// ── What it leaves out ───────────────────────────────────────────────────────
{
  const flow = [
    ev({ id: 'a' }),
    ev({ id: 'b', type: 'income', amount: 300000 }),
    ev({ id: 'c', type: 'transfer', amount: 50000 }),
    ev({ id: 'd', category: 'Food', amount: 26000 }),
  ];
  const d = categoryDetail(flow, 'Housing');
  check('income and transfers are not expenses and are not counted',
    d.count === 1 && d.total === 165000, J([d.count, d.total]));
  check('another category is another category',
    categoryDetail(flow, 'Food').total === 26000);
}
{
  const d = categoryDetail([], 'Housing');
  check('a category with nothing in it is empty rather than broken',
    d.rows.length === 0 && d.total === 0 && d.count === 0, J(d));
  check('rubbish in does not throw',
    categoryDetail(null, 'Housing').rows.length === 0 && categoryDetail(undefined, undefined).total === 0);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
