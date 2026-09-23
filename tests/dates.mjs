// The schedule engine: turning entry definitions into dated occurrences.
//
// This is the app's most load-bearing arithmetic — every balance, total,
// forecast and Envelopes figure is computed over whatever expandEntries
// returns — and until now it had no suite of its own. tests/year-copy.mjs
// loads dates.js and leans on expandEntries incidentally, but it asserts
// about year copying, so a broken "last Tuesday" or a mis-clamped 31st would
// not necessarily fail anything.
//
// The rules encoded here are the ones the Help page promises users, plus the
// ones dates.js's own comments call out as traps. Every date is written down
// explicitly: nothing here reads the clock, so this suite cannot start failing
// because it became September (see the README's note on the browser fixture).
//
//   node tests/dates.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadSrc } from './load-src.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// dates.js is a fragment of the app's one shared scope, not a module — same
// loading trick tests/year-copy.mjs uses, and deliberately over the real
// source so a change to the engine fails here rather than in production.
// MONTH_DAYS/WEEKDAYS/MONTHS live in app-data.js, which pulls React; they are
// plain tables, so they are restated rather than dragging the UI in.
const noHook = () => { throw new Error('the schedule engine must not need React'); };
// The source is ES modules; loadSrc bundles these (and what they import) and
// runs them against the stand-ins passed here.
const load = (React, localStorage, window) => loadSrc(['src/lib/dates.ts'], { React, localStorage, window });
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const {
  expandEntries, nthWeekdayInMonth, priorBankingDay, isPayrollDeposit,
  isLeapYear, daysInMonth, localDateStr, computeFlow, monthlyEquivalent, buildYearFlows,
} = load(new Proxy({}, { get: () => noHook }), localStorage, { matchMedia: () => ({ matches: false }) });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

// An entry, with the fields expandEntries reads and nothing else.
const entry = (extra = {}) => ({
  id: 'e1', desc: 'Rent', type: 'expense', category: 'Housing', amount: 165000,
  repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '',
  startDate: '2026-01-01', notes: '', ...extra,
});
// The dates an entry produces in a year, as YYYY-MM-DD, in order.
const dates = (e, year = 2026, overrides = {}) =>
  expandEntries([e], year, overrides).map((ev) => localDateStr(ev.date)).sort();

// ── The calendar underneath ──────────────────────────────────────────────────
{
  check('leap years: 2024 yes, 2025 no, 2100 no, 2000 yes',
    isLeapYear(2024) && !isLeapYear(2025) && !isLeapYear(2100) && isLeapYear(2000),
    J([isLeapYear(2024), isLeapYear(2025), isLeapYear(2100), isLeapYear(2000)]));
  check('February is 28 days in 2026 and 29 in 2028',
    daysInMonth(1, 2026) === 28 && daysInMonth(1, 2028) === 29,
    J([daysInMonth(1, 2026), daysInMonth(1, 2028)]));
}

// ── nth weekday ──────────────────────────────────────────────────────────────
{
  // "The third Friday" and "the last Tuesday" are what the entry form offers.
  const thirdFri = nthWeekdayInMonth(2026, 0, 5, 3);
  check('nth weekday: the third Friday of January 2026 is the 16th',
    localDateStr(thirdFri) === '2026-01-16', localDateStr(thirdFri));

  // "Last" and "fourth" are separate choices precisely because they differ in
  // the long months — the Help page says so, so it is worth pinning.
  const fourthFri = nthWeekdayInMonth(2026, 0, 5, 4);
  const lastFri = nthWeekdayInMonth(2026, 0, 5, -1);
  check('nth weekday: "last" and "fourth" differ in a month with five Fridays',
    localDateStr(fourthFri) === '2026-01-23' && localDateStr(lastFri) === '2026-01-30',
    J([localDateStr(fourthFri), localDateStr(lastFri)]));

  // February 2026 has four Fridays. A "fifth Friday" entry must produce
  // nothing there rather than sliding into March.
  check('nth weekday: a fifth Friday that does not exist returns null, not March',
    nthWeekdayInMonth(2026, 1, 5, 5) === null, J(nthWeekdayInMonth(2026, 1, 5, 5)));
  check('nth weekday: a fifth Friday that does exist is found',
    localDateStr(nthWeekdayInMonth(2026, 0, 5, 5)) === '2026-01-30',
    localDateStr(nthWeekdayInMonth(2026, 0, 5, 5)));
}

// ── Monthly, and the three ways a month can be anchored ──────────────────────
{
  const d = dates(entry({ startDate: '2026-01-12' }));
  check('monthly: one definition fills the year on the same day number',
    d.length === 12 && d[0] === '2026-01-12' && d[11] === '2026-12-12', J(d.slice(0, 2).concat(d.slice(-1))));
}
{
  // A monthly entry anchored on the 31st clamps into the short months and
  // comes back out again — it does not stick at 28.
  const d = dates(entry({ startDate: '2026-01-31' }));
  check('monthly: a 31st anchor clamps into short months and returns in long ones',
    d[1] === '2026-02-28' && d[2] === '2026-03-31' && d[3] === '2026-04-30', J(d.slice(0, 4)));
}
{
  // The distinction dates.js's own comment calls out: an entry *created* in
  // February keeps the 28th all year, which is why "last day" has to be a
  // recorded intent rather than something inferred from the start date.
  const created = dates(entry({ startDate: '2026-02-28' }));
  check('monthly: an entry created on 28 Feb stays on the 28th, it is not "month end"',
    created[1] === '2026-03-28' && created[2] === '2026-04-28', J(created.slice(0, 3)));

  const monthend = dates(entry({ startDate: '2026-02-28', recurUnit: 'monthend' }));
  check('month end: the last day whatever its length — 28 Feb, 31 Mar, 30 Apr',
    monthend[0] === '2026-02-28' && monthend[1] === '2026-03-31' && monthend[2] === '2026-04-30',
    J(monthend.slice(0, 3)));
}
{
  // recurNth/recurDays[0] drive "the third Friday" as a repeating schedule.
  const d = dates(entry({ startDate: '2026-01-16', recurUnit: 'monthweekday', recurNth: 3, recurDays: [5] }));
  const allFridays = d.every((s) => new Date(s + 'T00:00:00').getDay() === 5);
  check('month/weekday: "the third Friday" lands on a Friday in all twelve months',
    d.length === 12 && allFridays && d[0] === '2026-01-16', J([d.length, d[0], allFridays]));
}
{
  // A "fifth Friday" schedule simply misses the months that have four.
  const d = dates(entry({ startDate: '2026-01-30', recurUnit: 'monthweekday', recurNth: 5, recurDays: [5] }));
  check('month/weekday: a fifth-Friday schedule occurs only in the months that have one',
    d.length === 4 && d.join() === '2026-01-30,2026-05-29,2026-07-31,2026-10-30', J(d));
}
{
  // every: 2 is "every second month", counted from the start month.
  const d = dates(entry({ startDate: '2026-01-10', recurEvery: 2 }));
  check('monthly: every second month is six occurrences, not twelve',
    d.length === 6 && d.join() === '2026-01-10,2026-03-10,2026-05-10,2026-07-10,2026-09-10,2026-11-10', J(d));
}

// ── Semi-monthly ─────────────────────────────────────────────────────────────
{
  const d = dates(entry({ startDate: '2026-01-01', recurUnit: 'semimonth', type: 'income' }));
  check('semi-monthly: a 1st anchor pays on the 1st and the 15th, 24 times',
    d.length === 24 && d[0] === '2026-01-01' && d[1] === '2026-01-15', J([d.length, d[0], d[1]]));
}
{
  // An anchor past the 14th pairs downward instead of running off the month.
  // The first month is short one: the paired 6th precedes the 20 January start
  // date, and an occurrence before the entry begins is correctly not emitted.
  const d = dates(entry({ startDate: '2026-01-20', recurUnit: 'semimonth', type: 'income' }));
  check('semi-monthly: a 20th anchor pairs with the 6th, not the 34th',
    d[0] === '2026-01-20' && d[1] === '2026-02-06' && d[2] === '2026-02-20', J(d.slice(0, 3)));
  check('semi-monthly: the pair date before the start date is not back-filled',
    d.includes('2026-01-06') === false && d.length === 23, J([d.length, d[0]]));
}

// ── Weekly ───────────────────────────────────────────────────────────────────
{
  // "Every Monday and Thursday" is one entry, not two.
  const d = dates(entry({ startDate: '2026-01-01', recurUnit: 'week', recurDays: [1, 4] }));
  const onlyMonThu = d.every((s) => [1, 4].includes(new Date(s + 'T00:00:00').getDay()));
  check('weekly: "every Monday and Thursday" is one entry landing only on those days',
    onlyMonThu && d.length > 100, J([d.length, d.slice(0, 3)]));
}
{
  // "Every second Friday" — every: 2 with a single weekday.
  const d = dates(entry({ startDate: '2026-01-02', recurUnit: 'week', recurEvery: 2, type: 'income' }));
  const allFri = d.every((s) => new Date(s + 'T00:00:00').getDay() === 5);
  const fortnightly = d.length >= 26 && d.length <= 27;
  check('weekly: "every second Friday" is fortnightly and always a Friday',
    allFri && fortnightly, J([d.length, d.slice(0, 3)]));
}

// ── Ends on ──────────────────────────────────────────────────────────────────
{
  // A loan with payments left stops generating after the last one.
  const d = dates(entry({ startDate: '2026-01-15', recurEnd: '2026-09-15' }));
  check('ends on: a schedule that finishes in September stops there',
    d.length === 9 && d[d.length - 1] === '2026-09-15', J(d));
}
{
  // A one-time entry is a single date, and only in its own year.
  const d = dates(entry({ repeats: false, startDate: '2026-04-03' }));
  check('one-time: a single date, once', d.length === 1 && d[0] === '2026-04-03', J(d));
  check('one-time: nothing leaks into the next year', dates(entry({ repeats: false, startDate: '2026-04-03' }), 2027).length === 0);
}

// ── Payroll landing on a closed day ──────────────────────────────────────────
{
  // 15 August 2026 really is a Saturday — the Help page's own example.
  const ev = expandEntries([entry({
    desc: 'Ken - Payroll (15th)', type: 'income', amount: 250000, startDate: '2026-08-15',
  })], 2026).find((x) => x.month === 7);
  check('payroll: a Saturday payday reports the deposit on the Friday before',
    ev && ev.depositShifted === true && localDateStr(ev.depositDate) === '2026-08-14',
    J(ev && [localDateStr(ev.date), localDateStr(ev.depositDate), ev.depositShifted]));
  check('payroll: the occurrence itself does not move off the payday',
    ev && localDateStr(ev.date) === '2026-08-15', J(ev && localDateStr(ev.date)));
}
{
  // The guess comes from the description, and an entry can overrule it either
  // way — that is what the "Deposit date" setting is.
  const salary = { ...entry({ desc: 'Salary', type: 'income' }), bankingDay: true };
  const gig = { ...entry({ desc: 'Payroll', type: 'income' }), bankingDay: false };
  check('payroll: bankingDay:true opts a description the regex misses into the rule',
    isPayrollDeposit(salary, 'Salary') === true);
  check('payroll: bankingDay:false opts a payroll-named entry out of it',
    isPayrollDeposit(gig, 'Payroll') === false);
  check('payroll: a repeating expense is never treated as a deposit',
    isPayrollDeposit(entry({ desc: 'Payroll services' }), 'Payroll services') === false);
}
{
  // Canada Day 2026 is a Wednesday, so a payday on Thursday 2 July is a normal
  // banking day and must not shift — the rule steps back over closures only.
  const thu = priorBankingDay(new Date(2026, 6, 2));
  check('banking day: an ordinary weekday is returned untouched',
    localDateStr(thu) === '2026-07-02', localDateStr(thu));
  // A Wednesday holiday pushes back to the Tuesday.
  const canadaDay = priorBankingDay(new Date(2026, 6, 1));
  check('banking day: Canada Day steps back to the previous working day',
    localDateStr(canadaDay) === '2026-06-30', localDateStr(canadaDay));
}

// ── Overrides on a single date ───────────────────────────────────────────────
{
  const e = entry({ startDate: '2026-01-12' });
  const key = 'e1-2026-2-12'; // March, zero-indexed month, as expandEntries keys it
  check('override: a skipped occurrence leaves the event stream entirely',
    dates(e, 2026, { [key]: { skipped: true } }).length === 11);
  check('override: a moved occurrence appears on the new date only',
    dates(e, 2026, { [key]: { day: 20 } }).includes('2026-03-20') === true &&
    dates(e, 2026, { [key]: { day: 20 } }).includes('2026-03-12') === false);

  const withActual = expandEntries([e], 2026, { [key]: { actualAmount: 170000 } }).find((x) => x.month === 2);
  check('override: an actual amount drives the event while the plan is kept alongside',
    withActual && withActual.amount === 170000 && withActual.plannedAmount === 165000,
    J(withActual && [withActual.amount, withActual.plannedAmount]));
}

// ── The running balance over the result ──────────────────────────────────────
{
  const pay = entry({ id: 'i', desc: 'Pay', type: 'income', amount: 300000, startDate: '2026-01-01' });
  const rent = entry({ id: 'r', desc: 'Rent', type: 'expense', amount: 165000, startDate: '2026-01-02' });
  const flow = computeFlow(expandEntries([pay, rent], 2026), 100000);
  const last = flow[flow.length - 1];
  // Twelve months of +3000 and -1650 on a 1000 opening.
  check('flow: the running balance is the opening plus every event so far',
    last.balance === 100000 + 12 * (300000 - 165000), J(last && last.balance));
}

// Every occurrence carries who added its entry — the dashboard's "My entries"
// filter reads ev.userId, and it was never set, so the filter kept everything.
{
  const e = { id: 'u1', desc: 'x', type: 'expense', category: 'c', amount: 1000, repeats: true,
    recurUnit: 'month', recurEvery: 1, startDate: '2026-01-01', userId: 'member-a' };
  const evs = expandEntries([e], 2026, {});
  check('expandEntries: every occurrence carries the entry\'s userId',
    evs.length === 12 && evs.every((ev) => ev.userId === 'member-a'), J(evs.map((ev) => ev.userId)));
}

// computeFlow's two modes. `owned` writes balances onto events the caller
// hands over (the year and scenario flows, straight from expandEntries);
// without it, events are copied — which the account view relies on, since it
// passes a filtered view of events the year flow still holds.
{
  const es = [
    { id: 'a', desc: 'pay', type: 'income', category: 'c', amount: 300000, repeats: true, recurUnit: 'week', recurEvery: 2, startDate: '2026-01-02' },
    { id: 'b', desc: 'rent', type: 'expense', category: 'c', amount: 165000, repeats: true, recurUnit: 'month', recurEvery: 1, startDate: '2026-01-01' },
  ];
  const copied = computeFlow(expandEntries(es, 2026, {}), 50000);
  const owned = computeFlow(expandEntries(es, 2026, {}), 50000, { owned: true });
  check('computeFlow: owned and copying modes give identical balances',
    copied.length === owned.length && copied.every((ev, i) => ev.balance === owned[i].balance && ev.id === owned[i].id),
    J(owned.slice(0, 3).map((e) => e.balance)) + ' vs ' + J(copied.slice(0, 3).map((e) => e.balance)));
  const shared = expandEntries(es, 2026, {});
  const before = J(shared);
  computeFlow(shared.filter((ev) => ev.type === 'expense'), 0);
  check('computeFlow: the copying mode never writes onto the events it is given', J(shared) === before);
}

// buildYearFlows: each year opens on the previous year's close; only the
// first uses its own configured opening balance.
{
  const e = { id: 'r', desc: 'rent', type: 'expense', category: 'c', amount: 10000, repeats: true, recurUnit: 'month', recurEvery: 1, startDate: '2026-01-01' };
  const f = buildYearFlows([e], [{ year: 2027, openingBalance: 999 }, { year: 2026, openingBalance: 500000 }], {});
  const close26 = f[2026][f[2026].length - 1].balance;
  check('buildYearFlows: the second year opens on the first year\'s close, not its own opening balance',
    close26 === 500000 - 12 * 10000 && f[2027][0].balance === close26 - 10000, `${close26} → ${f[2027][0].balance}`);
}

// ── monthlyEquivalent ────────────────────────────────────────────────────────
// What an entry costs in an ordinary month, from its schedule. Today's "ends
// soon — frees $X/mo" used to divide the year's occurrences by twelve, which
// made a nine-month $385 car loan free $288.75.
{
  const me = (unit, every, amount, extra = {}) =>
    monthlyEquivalent({ repeats: true, recurUnit: unit, recurEvery: every, amount, ...extra });
  check('monthlyEquivalent: a monthly entry is its own amount, however many months it runs',
    monthlyEquivalent({ repeats: true, recurUnit: 'month', amount: 38500, startDate: '2026-01-18', recurEnd: '2026-09-18' }) === 38500);
  check('monthlyEquivalent: every two weeks is 26 a year over 12 months',
    me('week', 2, 325000) === Math.round(325000 * 26 / 12), String(me('week', 2, 325000)));
  check('monthlyEquivalent: a weekly entry on two weekdays counts both',
    me('week', 1, 5000, { recurDays: [1, 3] }) === Math.round(5000 * 52 / 12 * 2), String(me('week', 1, 5000, { recurDays: [1, 3] })));
  check('monthlyEquivalent: semi-monthly is twice a month', me('semimonth', 1, 50000) === 100000);
  check('monthlyEquivalent: yearly is a twelfth', me('year', 1, 120000) === 10000);
  check('monthlyEquivalent: every third month is a third', me('month', 3, 30000) === 10000);
  check('monthlyEquivalent: a one-off is just its amount',
    monthlyEquivalent({ repeats: false, amount: 95000 }) === 95000);
  // Agrees with the schedule engine for entries that run the whole year.
  for (const [unit, every] of [['month', 1], ['semimonth', 1], ['monthend', 1]]) {
    const e = { id: 'x', desc: 'x', type: 'expense', category: 'c', amount: 12000, repeats: true,
      recurUnit: unit, recurEvery: every, startDate: '2026-01-01' };
    const year = expandEntries([e], 2026, {}).reduce((s, ev) => s + ev.amount, 0);
    check(`monthlyEquivalent: ${unit} agrees with a full year of expandEntries ÷ 12`,
      monthlyEquivalent(e) === Math.round(year / 12), `${monthlyEquivalent(e)} vs ${year / 12}`);
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
