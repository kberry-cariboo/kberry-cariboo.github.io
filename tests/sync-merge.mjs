// Three-way, row-by-row merge of household fields (src/lib/sync-merge.ts).
//
// What two members editing at once keep: each side's changes to different
// rows, both sides' additions, either side's deletions — and a clash, with
// nothing thrown away, only when both changed the same row differently.
//
//   node tests/sync-merge.mjs
import { loadSrc } from './load-src.mjs';

const { mergeField, mergeFields, canonical, sameRow, describeClashes } = loadSrc(['src/lib/sync-merge.ts']);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (v) => JSON.stringify(v);

const rent = { id: 'e1', desc: 'Rent', type: 'expense', amount: 100000, category: 'Housing', startDate: '2026-01-01' };
const phone = { id: 'e2', desc: 'Phone', type: 'expense', amount: 6000, category: 'Bills', startDate: '2026-01-05' };
const base = [rent, phone];

{
  const local = [{ ...rent, amount: 110000 }, phone];
  const remote = [rent, { ...phone, amount: 6500 }];
  const r = mergeField('entries', base, local, remote);
  check('different entries edited on each side: both edits kept',
    !r.clashes.length && r.value.find((e) => e.id === 'e1').amount === 110000 && r.value.find((e) => e.id === 'e2').amount === 6500, show(r));
}
{
  const gym = { id: 'e3', desc: 'Gym', type: 'expense', amount: 4000, category: 'Health', startDate: '2026-01-10' };
  const car = { id: 'e4', desc: 'Car', type: 'expense', amount: 30000, category: 'Transport', startDate: '2026-01-15' };
  const r = mergeField('entries', base, [...base, gym], [...base, car]);
  check('an entry added on each side: both kept, theirs first then ours',
    !r.clashes.length && eq(r.value.map((e) => e.id), ['e1', 'e2', 'e4', 'e3']), show(r.value.map((e) => e.id)));
}
{
  const r = mergeField('entries', base, [rent], base);
  check('an entry deleted here and untouched there stays deleted', !r.clashes.length && eq(r.value.map((e) => e.id), ['e1']), show(r));
}
{
  const r = mergeField('entries', base, base, [phone]);
  check('an entry deleted there and untouched here is deleted', !r.clashes.length && eq(r.value.map((e) => e.id), ['e2']), show(r));
}
{
  const r = mergeField('entries', base, [{ ...rent, amount: 1 }, phone], [{ ...rent, amount: 2 }, phone]);
  check('the same entry changed differently: a clash naming it, and ours kept meanwhile',
    eq(r.clashes, ['e1']) && r.value.find((e) => e.id === 'e1').amount === 1, show(r));
}
{
  const r = mergeField('entries', base, [{ ...rent, amount: 1 }, { ...phone, amount: 9 }], [{ ...rent, amount: 2 }, phone], 'remote');
  check('onClash "remote": the clashing row is theirs, our other change is still kept',
    eq(r.clashes, ['e1']) && r.value.find((e) => e.id === 'e1').amount === 2 && r.value.find((e) => e.id === 'e2').amount === 9, show(r));
}
{
  const r = mergeField('entries', base, [{ ...rent, amount: 7 }, phone], [{ ...rent, amount: 7 }, phone]);
  check('the same change made on both sides is not a clash', !r.clashes.length && r.value[0].amount === 7, show(r));
}
{
  const r = mergeField('entries', base, [phone], [{ ...rent, amount: 2 }, phone]);
  check('deleted here, edited there: a clash', eq(r.clashes, ['e1']), show(r));
}
{
  // What the server hands back is not byte-for-byte what the client sent: an
  // unset end date comes back null instead of "", timestamps in another
  // format, keys in another order. None of that is a change.
  const sent = { ...rent, recurEnd: '', notes: '', _savedAt: '2026-03-01T10:00:00.000Z' };
  const back = { _savedAt: '2026-03-01T10:00:00+00:00', startDate: '2026-01-01', recurEnd: null, category: 'Housing', amount: 100000, type: 'expense', desc: 'Rent', id: 'e1' };
  check('the server\'s spelling of an unchanged row is the same row', sameRow(sent, back), show([canonical(sent), canonical(back)]));
  const r = mergeField('entries', [sent], [{ ...sent, amount: 5 }], [back]);
  check('...so editing it here is not a clash', !r.clashes.length && r.value[0].amount === 5, show(r));
}
{
  const b = { 2026: { 'e1-2026-0-1': { amount: 1 }, 'e2-2026-0-5': { skipped: true } } };
  const l = { 2026: { 'e1-2026-0-1': { amount: 1, notes: 'here' }, 'e2-2026-0-5': { skipped: true } } };
  const r = { 2026: { 'e1-2026-0-1': { amount: 1 }, 'e2-2026-0-5': { skipped: true }, 'e1-2026-1-1': { amount: 9 } }, 2027: { 'e1-2027-0-1': { amount: 3 } } };
  const m = mergeField('overridesByYr', b, l, r);
  check('overrides merge per occurrence, across years',
    !m.clashes.length && m.value[2026]['e1-2026-0-1'].notes === 'here' && m.value[2026]['e1-2026-1-1'].amount === 9 && m.value[2027]['e1-2027-0-1'].amount === 3, show(m));
  const c = mergeField('overridesByYr', b, { 2026: { ...b[2026], 'e1-2026-0-1': { amount: 5 } } }, { 2026: { ...b[2026], 'e1-2026-0-1': { amount: 6 } } });
  check('the same occurrence overridden differently: a clash naming year and occurrence', eq(c.clashes, ['2026/e1-2026-0-1']), show(c));
  const d = mergeField('overridesByYr', b, { 2026: { 'e2-2026-0-5': { skipped: true } } }, b);
  check('an override reverted here stays reverted', !d.clashes.length && !('e1-2026-0-1' in d.value[2026]), show(d));
}
{
  const withImg = { 2026: { 'e1-2026-0-1': { amount: 1, attachment: 'data:image/png;base64,AAA', _savedAt: '2026-03-02T00:00:00.000Z' } } };
  const stripped = { 2026: { 'e1-2026-0-1': { amount: 1, _savedAt: '2026-03-02T00:00:00.000Z' } } };
  check('a receipt image alone does not make an override different', sameRow(withImg[2026]['e1-2026-0-1'], stripped[2026]['e1-2026-0-1']));
}
{
  const m = mergeField('completed', { a: true }, { a: true, b: true }, { a: true, c: true });
  check('paid ticks from both sides are kept', !m.clashes.length && m.value.b === true && m.value.c === true, show(m));
}
{
  const m = mergeField('categories', ['Housing', 'Food', 'Fun'], ['Housing', 'Food', 'Fun', 'Pets'], ['Housing', 'Fun', 'Kids']);
  check('categories: additions from both kept, a removal from either honoured',
    eq(m.value, ['Housing', 'Fun', 'Kids', 'Pets']) && !m.clashes.length, show(m));
}
{
  const a1 = { id: 'a1', at: '2026-03-01T10:00:00.000Z', kind: 'entry', what: 'x' };
  const a2 = { id: 'a2', at: '2026-03-01T11:00:00.000Z', kind: 'entry', what: 'y' };
  const a3 = { id: 'a3', at: '2026-03-01T12:00:00.000Z', kind: 'goal', what: 'z' };
  const m = mergeField('activity', [a1], [a2, a1], [a3, a1]);
  check('the activity log is the union of both, newest first', !m.clashes.length && eq(m.value.map((x) => x.id), ['a3', 'a2', 'a1']), show(m));
}
{
  const m = mergeField('currency', 'CAD', 'USD', 'CAD');
  check('a setting changed only here is kept', m.value === 'USD' && !m.clashes.length);
  const c = mergeField('currency', 'CAD', 'USD', 'EUR');
  check('a setting changed differently on both sides is a clash', eq(c.clashes, ['currency']) && c.value === 'USD', show(c));
}
{
  const out = mergeFields(['entries', 'goals'], { entries: base, goals: [] }, { entries: [{ ...rent, amount: 1 }, phone], goals: [] },
    { entries: base, goals: [{ id: 'g1', name: 'Roof', target: 1, saved: 0, monthly: 0 }] });
  check('mergeFields: each named field merged, no clashes', !Object.keys(out.clashes).length && out.merged.entries[0].amount === 1 && out.merged.goals.length === 1, show(out));
}
{
  let threw = false;
  try { mergeField('noSuchField', 1, 2, 3); } catch (e) { threw = true; }
  check('a field with no merge rule is an error, not a guess', threw);
}

{
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const uuid = '0f8b2c1e-4a5d-4b6e-9c7f-1a2b3c4d5e6f';
  const names = describeClashes(
    { entries: ['e1'], overridesByYr: ['2026/' + uuid + '-2026-2-1'], currency: ['currency'], budgetTargets: ['Groceries'] },
    { entries: [rent, { ...phone, id: uuid, desc: 'Car loan' }] }, MONTHS);
  check('clashes are named as a person would name them',
    eq(names, ['Entry “Rent”', '“Car loan” on Mar 1, 2026', 'Currency', 'Envelope “Groceries”']), show(names));
}
{
  const names = describeClashes({ entries: ['e1', 'gone'] }, { entries: [] }, [], { entries: [rent] });
  check('a row deleted here is named from their copy, and one neither has is still listed',
    eq(names, ['Entry “Rent”', 'An entry']), show(names));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
