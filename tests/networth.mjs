// Net worth: what you own, less what you owe.
//
// The arithmetic is simple and the edge cases are not. Values arrive from a
// form and from the cloud, so they can be strings, missing or nonsense; debt
// balances are cents in a string with a flag for the ones the user has said
// are not debts at all; and a household running below zero has to come out
// below zero rather than quietly clamped.
//
//   node tests/networth.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadSrc } from './load-src.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// networth.js reads parseDate/localDateStr from dates.js for the staleness
// check, so the real ones are loaded rather than stubbed.
const noHook = () => { throw new Error('net worth must not need React'); };
// The source is ES modules; loadSrc bundles these (and what they import) and
// runs them against the stand-ins passed here.
const load = (React, localStorage, window) => loadSrc(['src/lib/dates.js', 'src/lib/networth.js'], { React, localStorage, window });
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const { netWorthSummary, assetsTotal, debtsTotal, staleAssets, ASSET_KINDS } =
  load(new Proxy({}, { get: () => noHook }), localStorage, { matchMedia: () => ({ matches: false }) });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

const asset = (extra = {}) => ({ id: 'a1', name: 'House', kind: 'property', value: 65000000, asOf: '2026-09-01', ...extra });
// Debts are stored the way Plan → Debts writes them: cents, in a string.
const debt = (balance, extra = {}) => ({ balance: String(balance), rate: '4.5', payment: '150000', ...extra });

// ── Totals ───────────────────────────────────────────────────────────────────
{
  check('assets: an empty register totals nothing', assetsTotal([]) === 0);
  check('assets: values add up', assetsTotal([asset(), asset({ id: 'a2', value: 1500000 })]) === 66500000);
  // Everything downstream sums these, so one bad row must not poison the total.
  check('assets: a missing or unparseable value counts as nothing, never NaN',
    assetsTotal([asset({ value: undefined }), asset({ id: 'x', value: 'abc' }), asset({ id: 'y', value: 100 })]) === 100,
    J(assetsTotal([asset({ value: undefined }), asset({ id: 'x', value: 'abc' })])));
  check('assets: a value that arrived from the form as a string still counts',
    assetsTotal([asset({ value: '2500' })]) === 2500);
  check('assets: a rubbish argument does not throw', assetsTotal(null) === 0 && assetsTotal(undefined) === 0);
}
{
  check('debts: balances are read out of their strings',
    debtsTotal({ car: debt(1850000), card: debt(320000) }) === 2170000,
    J(debtsTotal({ car: debt(1850000), card: debt(320000) })));
  // A debt the user has hidden is one they have said is not a debt. It is not
  // simulated on the payoff chart and it is not counted here either.
  check('debts: a hidden debt is not counted',
    debtsTotal({ car: debt(1850000), notReally: debt(500000, { hidden: true }) }) === 1850000);
  check('debts: a blank or negative balance is ignored',
    debtsTotal({ a: debt(''), b: debt(-500), c: debt(1000) }) === 1000);
  check('debts: no debts at all is zero, not NaN', debtsTotal({}) === 0 && debtsTotal(null) === 0);
}

// ── The summary ──────────────────────────────────────────────────────────────
{
  const s = netWorthSummary({
    assets: [asset(), asset({ id: 'a2', kind: 'vehicle', name: 'Truck', value: 2800000 })],
    debtData: { mortgage: debt(41000000), truck: debt(1900000) },
    cash: 1250000,
    asOf: '2026-09-21',
  });
  // 650,000 + 28,000 owned, 12,500 in the bank, 410,000 + 19,000 owed.
  check('summary: owned plus cash, less owed',
    s.total === 65000000 + 2800000 + 1250000 - 41000000 - 1900000, J([s.assets, s.cash, s.debts, s.total]));
  check('summary: the three parts are reported as well as the total',
    s.assets === 67800000 && s.debts === 42900000 && s.cash === 1250000, J([s.assets, s.debts, s.cash]));
  check('summary: assets are grouped by kind, and empty kinds are left out',
    s.byKind.map((k) => k.kind).join() === 'property,vehicle', J(s.byKind));
  check('summary: each group carries its own total and count',
    s.byKind[0].total === 65000000 && s.byKind[0].count === 1, J(s.byKind[0]));
}
{
  // Overdrawn, and owing more than everything is worth. The number has to be
  // allowed to be bad — this is the case a net worth figure exists for.
  const s = netWorthSummary({ assets: [asset({ value: 500000 })], debtData: { card: debt(900000) }, cash: -25000 });
  check('summary: a negative net worth comes out negative',
    s.total === 500000 - 25000 - 900000 && s.total < 0, J(s.total));
}
{
  const s = netWorthSummary({ assets: [], debtData: {}, cash: 500000 });
  check('summary: cash alone is still a net worth', s.total === 500000, J(s.total));
  check('summary: nothing recorded is flagged as empty, separately from totalling zero',
    netWorthSummary({}).empty === true && s.empty === true, J([netWorthSummary({}).empty, s.empty]));
  check('summary: a household with only debts is not empty',
    netWorthSummary({ debtData: { c: debt(100) } }).empty === false);
  check('summary: called with nothing at all, it does not throw',
    netWorthSummary().total === 0);
}
{
  // An unrecognised kind — from an older or newer client — is still counted,
  // under Other rather than silently dropped from the total.
  const s = netWorthSummary({ assets: [asset({ kind: 'crypto', value: 100000 })] });
  check('summary: an unknown kind is grouped under Other and still counted',
    s.total === 100000 && s.byKind.length === 1 && s.byKind[0].kind === 'other', J(s.byKind));
}

// ── Staleness ────────────────────────────────────────────────────────────────
{
  const assets = [
    asset({ id: 'fresh', asOf: '2026-08-01' }),
    asset({ id: 'old', asOf: '2024-01-15' }),
    asset({ id: 'undated', asOf: '' }),
  ];
  const stale = staleAssets(assets, '2026-09-21');
  check('stale: a figure older than a year is flagged',
    stale.length === 1 && stale[0].id === 'old', J(stale.map((a) => a.id)));
  check('stale: an undated asset is not flagged — there is nothing to be stale',
    !stale.some((a) => a.id === 'undated'));
  check('stale: without a date to compare against, nothing is flagged',
    staleAssets(assets, '').length === 0);
  check('stale: the window is adjustable',
    staleAssets(assets, '2026-09-21', 30).length === 2, J(staleAssets(assets, '2026-09-21', 30).map((a) => a.id)));
  check('stale: the summary carries the same list',
    netWorthSummary({ assets, asOf: '2026-09-21' }).stale.length === 1);
}

// ── The kinds themselves ─────────────────────────────────────────────────────
{
  check('kinds: every kind has an id and a label',
    ASSET_KINDS.length > 0 && ASSET_KINDS.every((k) => k.id && k.label), J(ASSET_KINDS));
  check('kinds: "other" exists, because it is the fallback for anything unknown',
    ASSET_KINDS.some((k) => k.id === 'other'));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
