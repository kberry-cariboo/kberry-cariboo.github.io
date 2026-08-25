// Rolling one budget year into the next.
//
// This is the app's most-reported problem area, and the reasons are structural:
// the operation reaches four different stores (entries, per-occurrence
// overrides, budget targets, deleted-copy tombstones), it has to be safe to run
// twice, and it has to distinguish work the sync did from work the user did in
// the target year — while three separate buttons trigger it.
//
// So the logic lives in src/lib/year-copy.js as pure functions over plain data,
// and this drives them directly: no browser, no React, no localStorage. The
// three buttons are covered in tests/regression.mjs; what is checked here is
// what they all delegate to.
//
//   node tests/year-copy.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// year-copy.js is a fragment of the app's one shared scope, not a module. Give
// it the real modules it reads from — deliberately the real source, so a change
// to expandEntries that breaks year copy fails here rather than in production.
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const noHook = () => { throw new Error('year copy must not need React'); };
const load = new Function('React', 'localStorage', 'window', `
  ${read('src/lib/runtime.js')}
  ${read('src/lib/migrate.js')}
  ${read('src/lib/holidays.js')}
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  ${read('src/lib/dates.js')}
  ${read('src/lib/year-copy.js')}
  return { syncSingleEntriesToYear, copyOccurrenceOverridesToYear, mirrorRecurringAmountsToYear,
           planYearRollforward, applyYearRollforward, yearRollforwardParts, expandEntries };
`);
const {
  syncSingleEntriesToYear, copyOccurrenceOverridesToYear, mirrorRecurringAmountsToYear,
  planYearRollforward, applyYearRollforward, expandEntries,
} = load(new Proxy({}, { get: () => noHook }), localStorage, { matchMedia: () => ({ matches: false }) });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

const one = (id, desc, startDate, amount, extra = {}) => ({ id, desc, type: 'expense', category: 'Housing',
  amount, repeats: false, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate, notes: '', ...extra });
const rec = (id, desc, startDate, amount, extra = {}) => ({ id, desc, type: 'expense', category: 'Housing',
  amount, repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate, notes: '', ...extra });

// Stands in for the three buttons: runs a plan against plain objects the way
// applyYearRollforward runs it against setState.
function roll(state, fromYear, toYear) {
  const plan = planYearRollforward({
    entries: state.entries, overridesByYr: state.overridesByYr || {},
    budgetTargets: state.budgetTargets || {}, fromYear, toYear,
    deletedCopyIds: state.deletedCopyIds || {},
  });
  const next = { ...state, overridesByYr: { ...(state.overridesByYr || {}) }, budgetTargets: { ...(state.budgetTargets || {}) } };
  applyYearRollforward(plan, toYear, {
    setEntries: (fn) => { next.entries = fn(state.entries); },
    setOverridesByYr: (fn) => { next.overridesByYr = fn(state.overridesByYr || {}); },
    setBudgetTargets: (fn) => { next.budgetTargets = fn(state.budgetTargets || {}); },
  });
  return { plan, next };
}

// ── One-time entries ─────────────────────────────────────────────────────────
{
  const entries = [one('a', 'Vet', '2026-08-12', 24000), one('b', 'Insurance', '2026-03-01', 50000)];
  const r = syncSingleEntriesToYear(entries, 2026, 2027, {}, {});
  check('singles: both are cloned onto the same month and day', r.clones.map((c) => c.startDate).sort().join() === '2027-03-01,2027-08-12', J(r.clones.map((c) => c.startDate)));
  check('singles: clones get fresh ids and record where they came from',
    r.clones.every((c) => c.id !== 'a' && c.id !== 'b' && ['a', 'b'].includes(c.copiedFrom)), J(r.clones.map((c) => [c.id, c.copiedFrom])));
  check('singles: a first run updates nothing', r.updates.length === 0, J(r.updates));
}
{
  // Running it again is the normal case, not the exception: the Copy button
  // exists to be pressed repeatedly as the source year fills in.
  let entries = [one('a', 'Vet', '2026-08-12', 24000)];
  const first = syncSingleEntriesToYear(entries, 2026, 2027, {}, {});
  entries = [...entries, ...first.clones];
  const second = syncSingleEntriesToYear(entries, 2026, 2027, {}, {});
  check('singles: a second run is a no-op', second.clones.length === 0 && second.updates.length === 0, J(second));
}
{
  const entries = [one('a', 'Vet', '2026-08-12', 24000)];
  const fromOvs = { 'a-2026-7-12': { amount: 31000, desc: 'Vet — emergency', notes: 'x-ray', month: 8, day: 3 } };
  const c = syncSingleEntriesToYear(entries, 2026, 2027, fromOvs, {}).clones[0];
  check('singles: a source-year occurrence edit is baked into the clone',
    c.startDate === '2027-09-03' && c.amount === 31000 && c.desc === 'Vet — emergency' && c.notes === 'x-ray',
    J({ startDate: c.startDate, amount: c.amount, desc: c.desc, notes: c.notes }));
}
{
  const src = one('a', 'Vet', '2026-08-12', 24000);
  const copy = { ...one('c', 'Vet', '2027-08-12', 24000), copiedFrom: 'a' };
  const edit = { 'a-2026-7-12': { amount: 31000 } };
  const occEdited = syncSingleEntriesToYear([src, copy], 2026, 2027, edit, { 'c-2027-7-12': { amount: 9900, _savedAt: 'x' } });
  check('singles: a copy the user edited in the target year is left alone', occEdited.updates.length === 0 && occEdited.clones.length === 0, J(occEdited));
  const handEdited = syncSingleEntriesToYear([src, { ...copy, amount: 27500 }], 2026, 2027, edit, {});
  check('singles: an amount the user set by hand is not overwritten', ((handEdited.updates[0] || {}).patch || {}).amount === undefined, J(handEdited.updates));
  const stale = syncSingleEntriesToYear([src, copy], 2026, 2027, edit, {});
  check('singles: a stale copy still holding the old value is refreshed', (stale.updates[0] || {}).patch.amount === 31000, J(stale.updates));
  const mine = one('m', 'Something I added', '2027-05-05', 1000);
  const own = syncSingleEntriesToYear([src, mine], 2026, 2027, {}, {});
  check('singles: an unrelated target-year entry is never re-dated', !own.updates.some((u) => u.id === 'm'), J(own.updates));
}
{
  // A copy the user renamed is theirs now: it must stop being paired, and the
  // source must clone afresh rather than dragging the rename back.
  const src = one('a', 'Vet', '2026-08-12', 24000);
  const renamed = one('c', 'Dog dentist', '2027-08-12', 24000);
  const r = syncSingleEntriesToYear([src, renamed], 2026, 2027, {}, {});
  check('singles: a renamed legacy copy is no longer treated as a copy',
    r.clones.length === 1 && !r.updates.some((u) => u.id === 'c'), J(r));
}
{
  const leap = syncSingleEntriesToYear([one('a', 'Leap', '2028-02-29', 5000)], 2028, 2029, {}, {});
  check('singles: Feb 29 clamps to Feb 28 in a common year', leap.clones[0].startDate === '2029-02-28', leap.clones[0].startDate);
  const jan = syncSingleEntriesToYear([one('b', 'Jan', '2027-01-31', 5000)], 2027, 2028, {}, {});
  check('singles: Jan 31 survives into a leap year', jan.clones[0].startDate === '2028-01-31', jan.clones[0].startDate);
}
{
  const entries = [one('a', 'Vet', '2026-08-12', 24000)];
  check('singles: a copy the user deleted is not resurrected',
    syncSingleEntriesToYear(entries, 2026, 2027, {}, {}, { a: true }).clones.length === 0, 'tombstone ignored');
  check('singles: without the tombstone it clones (sanity)',
    syncSingleEntriesToYear(entries, 2026, 2027, {}, {}, {}).clones.length === 1, 'fixture is wrong');
}
{
  const t = { ...one('t', 'To savings', '2026-06-01', 20000), type: 'transfer', transferDirection: 'out' };
  const c = syncSingleEntriesToYear([t], 2026, 2027, {}, {}).clones[0];
  check('singles: a transfer keeps its type and direction', c.type === 'transfer' && c.transferDirection === 'out', J({ type: c.type, dir: c.transferDirection }));
}

// ── Occurrence overrides ─────────────────────────────────────────────────────
{
  const bill = rec('h', 'Hydro', '2026-01-15', 18000);
  const fromOvs = { 'h-2026-2-15': { desc: 'Hydro (estimated)', amount: 22000, notes: 'meter read', _savedAt: '2026-03-15T00:00:00Z' } };
  const adds = copyOccurrenceOverridesToYear([bill], fromOvs, 2026, 2027, {});
  check('overrides: the edit lands on the same month and day next year', !!adds['h-2027-2-15'], J(Object.keys(adds)));
  check('overrides: user-facing fields come across', adds['h-2027-2-15'].amount === 22000 && adds['h-2027-2-15'].desc === 'Hydro (estimated)', J(adds['h-2027-2-15']));
  // _savedAt is the ownership marker. A copy that carried it would look like
  // the user's own edit and freeze, so later source-year changes could never
  // reach it.
  check('overrides: the copy stays sync-owned (no _savedAt)', adds['h-2027-2-15']._savedAt === undefined, J(adds['h-2027-2-15']));
  check('overrides: an override the user made in the target year is never touched',
    copyOccurrenceOverridesToYear([bill], fromOvs, 2026, 2027, { 'h-2027-2-15': { amount: 999, _savedAt: 'mine' } })['h-2027-2-15'] === undefined, 'clobbered a user override');
  const r = copyOccurrenceOverridesToYear([bill], { 'h-2026-2-15': { amount: 1, attachment: 'data:image/png;base64,AAA', _history: [1] } }, 2026, 2027, {});
  check('overrides: receipts and edit history stay in their own year',
    r['h-2027-2-15'].attachment === undefined && r['h-2027-2-15']._history === undefined, J(r['h-2027-2-15']));
}

// ── Recurring amount pattern ─────────────────────────────────────────────────
{
  const pay = { id: 'p', desc: 'Salary', type: 'income', category: 'Income', amount: 250000, repeats: true,
    recurEvery: 2, recurUnit: 'week', recurDays: [], recurEnd: '', startDate: '2026-01-02', notes: '' };
  const src = expandEntries([pay], 2026, {});
  const fromOvs = {};
  src.slice(0, 3).forEach((ev, i) => { fromOvs[ev.id] = { amount: 230000 + i * 5000 }; });
  const adds = mirrorRecurringAmountsToYear([pay], fromOvs, 2026, 2027, {}, {});
  const tgt = expandEntries([pay], 2027, {});
  check('amounts: the first paydays mirror the source year, occurrence by occurrence',
    J(tgt.slice(0, 3).map((ev) => (adds[ev.id] || {}).amount)) === J([230000, 235000, 240000]),
    J(tgt.slice(0, 3).map((ev) => (adds[ev.id] || {}).amount)));
  check('amounts: no override is written where the amount already matches',
    tgt.slice(3).every((ev) => adds[ev.id] === undefined), 'wrote redundant overrides');
  check('amounts: an extra occurrence in the longer year repeats the last source amount',
    tgt.length <= src.length || adds[tgt[tgt.length - 1].id] === undefined || adds[tgt[tgt.length - 1].id].amount === src[src.length - 1].amount,
    J(adds[tgt[tgt.length - 1].id]));
}
{
  // Nth-occurrence alignment breaks if the two years expand to different
  // shapes, and expandEntries drops a skipped occurrence entirely. Skipping one
  // month in the source year used to shift every later month onto its
  // neighbour's amount — a whole year of wrong budget figures, with nothing
  // said. Each month here carries a distinct amount so a shift is visible.
  const bill = rec('h', 'Hydro', '2026-01-15', 18000);
  const src = expandEntries([bill], 2026, {});
  const fromOvs = {};
  src.forEach((ev, i) => { fromOvs[ev.id] = { amount: 10000 + i * 1000 }; });
  const tgt = expandEntries([bill], 2027, {});
  const clean = mirrorRecurringAmountsToYear([bill], fromOvs, 2026, 2027, {}, {});
  check('amounts: with no skips, March mirrors March', (clean[tgt[2].id] || {}).amount === 12000, J(clean[tgt[2].id]));
  const skipped = { ...fromOvs, [src[2].id]: { ...fromOvs[src[2].id], skipped: true } };
  const after = mirrorRecurringAmountsToYear([bill], skipped, 2026, 2027, {}, {});
  check('amounts: a skipped source month does not shift every later month',
    (after[tgt[2].id] || {}).amount === 12000,
    `2027-03 mirrored ${J((after[tgt[2].id] || {}).amount)}; want 12000 (2026-03). 13000 means it took April's.`);
  // No override is written where the occurrence already shows the right
  // number, so compare the effective amount rather than the override.
  const effective = (adds, ev) => (adds[ev.id] || {}).amount !== undefined ? adds[ev.id].amount : ev.amount;
  check('amounts: months after the skip stay lined up',
    tgt.slice(3, 12).every((ev, i) => effective(after, ev) === 13000 + i * 1000),
    J(tgt.slice(3, 12).map((ev) => effective(after, ev))));
  check('amounts: a skipped month is not itself carried forward as skipped',
    copyOccurrenceOverridesToYear([bill], skipped, 2026, 2027, {})[tgt[2].id].skipped === undefined, 'the skip travelled to the new year');
}
{
  const loan = rec('l', 'Car loan', '2026-01-18', 38500, { recurEnd: '2026-09-18' });
  check('amounts: an entry that ended in the source year gets no target-year occurrences',
    expandEntries([loan], 2027, {}).length === 0 && Object.keys(mirrorRecurringAmountsToYear([loan], {}, 2026, 2027, {}, {})).length === 0, 'resurrected an ended entry');
}
{
  // Payroll landing on a weekend is shown as depositing on the previous banking
  // day. That is display-only: if it ever moved the occurrence itself the two
  // years would expand differently and the mirror would drift.
  const pay = { id: 'p', desc: 'Payroll', type: 'income', category: 'Income', amount: 250000, repeats: true,
    recurEvery: 1, recurUnit: 'semimonth', recurDays: [], recurEnd: '', startDate: '2026-01-15', notes: '' };
  check('amounts: a deposit-date shift does not move the occurrence',
    expandEntries([pay], 2026, {}).every((ev) => ev.month === new Date(ev.date).getMonth()), 'an occurrence moved off its own date');
}
{
  // Nobody creates their entries on 1 January. An entry added part-way through
  // the source year has fewer occurrences in it than in the next full year, and
  // counting straight through put every month of the new year out of phase by
  // however many occurrences were missing — a payroll entry added in March had
  // 2027's January mirroring 2026's March, and March mirroring May.
  const pay = { id: 'p', desc: 'Salary', type: 'income', category: 'Income', amount: 250000, repeats: true,
    recurEvery: 2, recurUnit: 'week', recurDays: [], recurEnd: '', startDate: '2026-03-06', notes: '' };
  const src = expandEntries([pay], 2026, {});
  const fromOvs = {};
  src.forEach((ev, i) => { fromOvs[ev.id] = { amount: 200000 + i * 1000 }; });
  const adds = mirrorRecurringAmountsToYear([pay], fromOvs, 2026, 2027, {}, {});
  const tgt = expandEntries([pay], 2027, {});
  const amountOn = (month, k = 0) => {
    const ev = tgt.filter((e) => e.month === month)[k];
    return ev && ((adds[ev.id] || {}).amount !== undefined ? adds[ev.id].amount : ev.amount);
  };
  const srcOn = (month, k = 0) => {
    const ev = src.filter((e) => e.month === month)[k];
    return ev && fromOvs[ev.id].amount;
  };
  check('amounts: an entry added mid-year still mirrors March onto March',
    amountOn(2) === srcOn(2), `2027-03 got ${amountOn(2)}, 2026-03 was ${srcOn(2)}`);
  check('amounts: …and June onto June, not two months adrift',
    amountOn(5) === srcOn(5), `2027-06 got ${amountOn(5)}, 2026-06 was ${srcOn(5)}`);
  check('amounts: …and December onto December',
    amountOn(11) === srcOn(11), `2027-12 got ${amountOn(11)}, 2026-12 was ${srcOn(11)}`);
  check('amounts: months with no source occurrence borrow the nearest one that has',
    amountOn(0) === srcOn(2), `2027-01 got ${amountOn(0)}, want the earliest known ${srcOn(2)}`);
}

// ── The whole roll-forward, as all three buttons run it ──────────────────────
{
  const state = {
    entries: [one('v', 'Vet', '2026-08-12', 24000), rec('h', 'Hydro', '2026-01-15', 18000)],
    overridesByYr: { 2026: { 'h-2026-2-15': { amount: 22000, _savedAt: 'x' } } },
    budgetTargets: { '2026:0': { Housing: 165000 }, '2026:1': { Housing: 165000 } },
  };
  const { plan, next } = roll(state, 2026, 2027);
  check('roll: budget targets are carried forward', plan.counts.targets === 2, J(plan.counts));
  check('roll: one-time entries are cloned', plan.counts.clones === 1, J(plan.counts));
  check('roll: modified occurrences are carried over', plan.counts.overrides === 1, J(plan.counts));
  check('roll: the plan reports itself as changed', plan.changed === true, J(plan.counts));
  check('roll: the new year has the cloned entry', next.entries.some((e) => e.startDate === '2027-08-12' && e.copiedFrom === 'v'), J(next.entries.map((e) => e.startDate)));
  check('roll: overrides are merged under the target year only',
    !!next.overridesByYr['2027'] && J(next.overridesByYr['2026']) === J(state.overridesByYr[2026]), J(Object.keys(next.overridesByYr)));
  const again = roll(next, 2026, 2027);
  check('roll: running it a second time reports nothing to change', again.plan.changed === false, J(again.plan.counts));
  check('roll: and adds no entries', again.next.entries.length === next.entries.length, `${again.next.entries.length} vs ${next.entries.length}`);
}
{
  // Year after year after year. Each roll takes its source from the year before,
  // so provenance has to chain rather than all point back at the original.
  let state = { entries: [one('v', 'Vet', '2026-08-12', 24000)], overridesByYr: {}, budgetTargets: {} };
  state = roll(state, 2026, 2027).next;
  state = roll(state, 2027, 2028).next;
  state = roll(state, 2028, 2029).next;
  const dates = state.entries.map((e) => e.startDate).sort();
  check('roll: three years of rolling forward makes exactly one copy per year',
    J(dates) === J(['2026-08-12', '2027-08-12', '2028-08-12', '2029-08-12']), J(dates));
  const y2028 = state.entries.find((e) => e.startDate === '2028-08-12');
  const y2027 = state.entries.find((e) => e.startDate === '2027-08-12');
  check('roll: each copy points at the year before it, not at the original', y2028.copiedFrom === y2027.id, `${y2028.copiedFrom} vs ${y2027.id}`);
}
{
  // The tombstone is keyed by source entry, not by year, and the "+ Add year"
  // button used not to pass it at all: deleting an unwanted copy, removing the
  // year and adding it back brought the copy straight back.
  const state = { entries: [one('v', 'Vet', '2026-08-12', 24000)], overridesByYr: {}, budgetTargets: {}, deletedCopyIds: { v: true } };
  const { plan } = roll(state, 2026, 2027);
  check('roll: a deleted copy stays deleted through a fresh year add', plan.counts.clones === 0, J(plan.counts));
}
{
  const empty = roll({ entries: [], overridesByYr: {}, budgetTargets: {} }, 2026, 2027);
  check('roll: an empty year rolls forward to nothing, without throwing', empty.plan.changed === false && empty.next.entries.length === 0, J(empty.plan.counts));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
