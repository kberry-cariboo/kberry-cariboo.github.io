// Goals that come round again.
//
// The roll runs unattended, reaches goals and entries at once, and must be
// safe to run on every load — which is the same set of hazards year-copy.mjs
// exists for, and the reason this drives the functions directly rather than
// through the UI.
//
//   node tests/sinking.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadSrc } from './load-src.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const noHook = () => { throw new Error('the roll must not need React'); };
// The source is ES modules; loadSrc bundles these (and what they import) and
// runs them against the stand-ins passed here.
const load = (React, localStorage, window) => loadSrc(['src/lib/dates.js', 'src/lib/sinking.js'], { React, localStorage, window });
const { addMonthsClamped, planGoalRollover, planGoalRollovers, applyGoalRollovers } =
  load(new Proxy({}, { get: () => noHook }),
    { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    { matchMedia: () => ({ matches: false }) });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

const goal = (extra = {}) => ({
  id: 'g1', name: 'Car insurance', target: 120000, saved: 120000, monthly: 10000,
  targetDate: '2026-08-01', repeatMonths: 12, entryId: 'c1', payoutEntryId: 'p1', ...extra,
});
const contrib = (extra = {}) => ({
  id: 'c1', desc: 'Goal: Car insurance', type: 'expense', amount: 10000,
  startDate: '2025-09-01', repeats: true, recurUnit: 'month', recurEvery: 1,
  recurEnd: '2026-08-01', category: 'Savings / RRSP', notes: '', ...extra,
});
const payout = (extra = {}) => ({
  id: 'p1', desc: 'Goal payout: Car insurance', type: 'expense', amount: 120000,
  startDate: '2026-08-01', repeats: false, category: 'Savings / RRSP', notes: '', ...extra,
});
// Drive a plan against plain arrays, the way the app drives it against state.
function roll(goals, entries, today) {
  const plan = planGoalRollovers(goals, entries, today);
  const next = { goals, entries };
  applyGoalRollovers(plan, {
    setGoals: (fn) => { next.goals = fn(goals); },
    setEntries: (fn) => { next.entries = fn(entries); },
    newId: (() => { let n = 0; return () => 'new' + (++n); })(),
  });
  return { plan, next };
}

// ── The date arithmetic ──────────────────────────────────────────────────────
{
  check('dates: a year on is the same day next year',
    addMonthsClamped('2026-08-01', 12) === '2027-08-01', addMonthsClamped('2026-08-01', 12));
  check('dates: quarterly steps three months',
    addMonthsClamped('2026-01-15', 3) === '2026-04-15', addMonthsClamped('2026-01-15', 3));
  // 31 August plus six months has no 31st to land on.
  check('dates: a day that does not exist in the target month clamps into it',
    addMonthsClamped('2026-08-31', 6) === '2027-02-28', addMonthsClamped('2026-08-31', 6));
  check('dates: and lands on the 29th when that February has one',
    addMonthsClamped('2027-08-31', 6) === '2028-02-29', addMonthsClamped('2027-08-31', 6));
  check('dates: rubbish in, nothing out', addMonthsClamped('', 12) === '' && addMonthsClamped('2026-08-01', NaN) === '');
}

// ── When a goal rolls ────────────────────────────────────────────────────────
{
  const r = planGoalRollover(goal(), '2026-08-02');
  check('roll: a repeating goal whose date has passed moves to the next one',
    r && r.to === '2027-08-01' && r.cycles === 1, J(r));
  check('roll: the fund is spent, so what is saved goes back to nothing',
    r && r.saved === 0, J(r && r.saved));
}
{
  // Over-saved by $200: that is the household's money and it carries.
  const r = planGoalRollover(goal({ saved: 140000 }), '2026-08-02');
  check('roll: money over the target carries into the next cycle',
    r && r.saved === 20000, J(r && r.saved));
}
{
  // Under-saved: the fund did not make it, and the next cycle starts empty
  // rather than in debt to itself.
  const r = planGoalRollover(goal({ saved: 40000 }), '2026-08-02');
  check('roll: an underfunded cycle starts the next one at nothing, not below it',
    r && r.saved === 0, J(r && r.saved));
}
{
  // Two years unopened. The answer is not "one step along" but the next date
  // that is actually still ahead: August 2028 has been and gone as well.
  const r = planGoalRollover(goal(), '2028-09-01');
  check('roll: an app left unopened catches up every missed cycle at once',
    r && r.to === '2029-08-01' && r.cycles === 3, J(r));
  check('roll: and the date it lands on is in the future, not merely later',
    r && r.to > '2028-09-01', J(r && r.to));
}
{
  check('roll: a goal repeating quarterly steps a quarter',
    planGoalRollover(goal({ repeatMonths: 3 }), '2026-08-02').to === '2026-11-01',
    J(planGoalRollover(goal({ repeatMonths: 3 }), '2026-08-02')));
}

// ── When it does not ─────────────────────────────────────────────────────────
{
  check('quiet: a goal that does not repeat is untouched, as before',
    planGoalRollover(goal({ repeatMonths: 0 }), '2027-01-01') === null);
  check('quiet: a repeating goal whose date is still ahead waits',
    planGoalRollover(goal(), '2026-07-31') === null);
  check('quiet: a goal with no date cannot roll',
    planGoalRollover(goal({ targetDate: '' }), '2027-01-01') === null);
  check('quiet: no today, no roll', planGoalRollover(goal(), '') === null);
  // Running it again the same day must do nothing — it runs on every load.
  const once = roll([goal()], [contrib(), payout()], '2026-08-02');
  const twice = roll(once.next.goals, once.next.entries, '2026-08-02');
  check('quiet: a second run on the same day is a no-op',
    twice.plan.changed === false, J(twice.plan.rolls));
}

// ── What the roll drags with it ──────────────────────────────────────────────
{
  const { plan, next } = roll([goal()], [contrib(), payout()], '2026-08-02');
  const c = next.entries.find((e) => e.id === 'c1');
  check('entries: the contribution entry is extended, or the saving stops dead',
    c.recurEnd === '2027-08-01', J(c.recurEnd));

  const fresh = next.entries.filter((e) => e.id.startsWith('new'));
  check('entries: a payout is written for the new date, so the forecast shows it',
    fresh.length === 1 && fresh[0].startDate === '2027-08-01' && fresh[0].amount === 120000,
    J(fresh));
  check('entries: the old payout stays where it is',
    next.entries.some((e) => e.id === 'p1' && e.startDate === '2026-08-01'),
    J(next.entries.map((e) => [e.id, e.startDate])));
  check('goals: the goal points at the new payout',
    next.goals[0].payoutEntryId === fresh[0].id, J(next.goals[0]));
  check('goals: and carries the new date and balance',
    next.goals[0].targetDate === '2027-08-01' && next.goals[0].saved === 0, J(next.goals[0]));
  check('plan: it reports what it did', plan.rolls.length === 1 && plan.changed === true);
}
{
  // A goal with no linked entries still rolls; there is simply nothing to drag.
  const { next } = roll([goal({ entryId: null, payoutEntryId: null })], [], '2026-08-02');
  check('entries: a goal with nothing linked rolls on its own',
    next.goals[0].targetDate === '2027-08-01' && next.entries.length === 0, J(next));
}
{
  // A contribution entry with no end date is already running; nothing to fix.
  const { next } = roll([goal()], [contrib({ recurEnd: '' }), payout()], '2026-08-02');
  check('entries: an open-ended contribution is left alone',
    next.entries.find((e) => e.id === 'c1').recurEnd === '', J(next.entries[0]));
}
{
  check('plan: nothing due means nothing to do',
    planGoalRollovers([goal()], [contrib()], '2026-01-01').changed === false);
  check('plan: rubbish in does not throw',
    planGoalRollovers(null, null, '2026-08-02').changed === false);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
