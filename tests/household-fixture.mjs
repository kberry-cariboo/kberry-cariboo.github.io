// The fictional household every browser suite drives.
//
// It lived inside tests/regression.mjs until a second browser suite
// (tests/layout-sweep.mjs) needed the same household. Copying it would have
// been the start of two fixtures drifting apart — one of them getting a new
// field, the other quietly testing a household the app no longer stores — so
// it moved out here instead and both suites import it.
//
// `mkStub(dark, loggedIn)` returns the script injected before the page loads:
// a fake Supabase client that answers load_household with this payload and
// nothing else. Its *text* is part of its contract — regression.mjs rewrites
// substrings of it ('goals: [],', 'const payload = {') to give a single test
// data the shared household doesn't carry — so edit it as prose, not just as
// code.

// The one knob. Every date in this household, the budget year it is filed
// under and the year its targets are keyed by all come off it, so rolling the
// fixture forward is this line and nothing else. tests/regression.mjs and
// tests/layout-sweep.mjs both refuse to run when "today" is outside it, with
// a message that says to change this — a household whose year has passed
// reports nine failures that all mean "there is no data", and that is a
// miserable thing to debug from the failures alone.
//
// Keep it a year whose *weekdays* the suite has been checked against: several
// tests assert behaviour that depends on which day of the week a date falls
// on (a payday landing on a Saturday, a statutory holiday landing on a
// Monday). Those tests carry their own fixtures and pin their own clocks, so
// they do not move with this — but the shared household's paydays do.
export const FIXTURE_YEAR = 2026;
const Y = FIXTURE_YEAR;

// Fictional demo data (self-contained). Money is stored as integer cents
// (schema v8) — `amount` args below are dollars, multiplied by 100 so the
// fixtures read naturally while matching the app's on-disk representation.
const E = (id, desc, type, amount, category, opts = {}) => ({
  id, desc, type, amount: Math.round(amount * 100), category,
  repeats: opts.once ? false : true,
  recurUnit: opts.unit || 'month',
  recurEvery: opts.every || 1,
  startDate: opts.start || `${Y}-01-05`,
  ...(opts.recurEnd ? { recurEnd: opts.recurEnd } : {}),
  notes: opts.notes || ''
});
const entries = [
  E(1, 'Salary — Acme Corp', 'income', 3250, 'Income', { start: `${Y}-01-02`, unit: 'week', every: 2 }),
  E(2, 'Freelance design', 'income', 850, 'Income', { start: `${Y}-01-20` }),
  E(3, 'Tax refund', 'income', 950, 'Income', { once: true, start: `${Y}-04-14` }),
  E(4, 'Rent', 'expense', 1650, 'Housing', { start: `${Y}-01-01` }),
  E(5, 'Groceries', 'expense', 260, 'Food', { start: `${Y}-01-04`, unit: 'week', every: 2 }),
  E(6, 'Car insurance', 'expense', 210, 'Insurance', { start: `${Y}-01-15` }),
  E(7, 'Hydro & gas', 'expense', 185, 'Utilities', { start: `${Y}-01-12` }),
  E(8, 'Internet', 'expense', 95, 'Utilities', { start: `${Y}-01-08` }),
  E(9, 'Streaming bundle', 'expense', 45, 'Subscriptions', { start: `${Y}-01-10` }),
  E(10, 'Fuel', 'expense', 80, 'Transportation', { start: `${Y}-01-06`, unit: 'week', every: 1 }),
  E(11, 'Dining out', 'expense', 120, 'Personal', { start: `${Y}-01-09`, unit: 'week', every: 2 }),
  E(12, 'Gym membership', 'expense', 55, 'Personal', { start: `${Y}-01-03` }),
  E(13, 'Car loan', 'expense', 385, 'Debt / Credit', { start: `${Y}-01-18`, recurEnd: `${Y}-09-18` }),
  E(14, 'RRSP contribution', 'expense', 400, 'Savings / RRSP', { start: `${Y}-01-25` }),
  E(15, 'Phone plan', 'expense', 75, 'Subscriptions', { start: `${Y}-01-11` }),
  E(16, 'Summer vacation', 'expense', 1800, 'Personal', { once: true, start: `${Y}-07-24` }),
  E(17, 'Vet checkup', 'expense', 240, 'Farm / Animals', { once: true, start: `${Y}-08-12` }),
];
const monthTargets = {
  Housing: 165000, Food: 56000, Insurance: 21000, Utilities: 29000, Subscriptions: 12500,
  Transportation: 34000, Personal: 32000, 'Debt / Credit': 38500, 'Savings / RRSP': 40000
};
const entriesMatch = 'const entries = ' + JSON.stringify(entries) + ';';
const eMatch = '';
const targetsMatch = 'const monthTargets = ' + JSON.stringify(monthTargets) + ';';
const btMatch = `const budgetTargets = {}; for (let m = 0; m <= 11; m++) budgetTargets['${Y}:' + m] = { ...monthTargets };`;

const mkStub = (dark, loggedIn = true) => `
(() => {
  ${eMatch}
  ${entriesMatch}
  ${targetsMatch}
  ${btMatch}
  const session = ${loggedIn} ? { user: { id: 'u-demo', email: 'demo@example.com' }, access_token: 'demo' } : null;
  const payload = { entries, overridesByYr: {}, yearConfigs: [{ year: ${Y}, openingBalance: 1250000 }], budgetTargets, templates: [], completed: {}, activeYear: ${Y}, alertThreshold: 50000, darkMode: ${dark}, goals: [], dashHidden: {}, dashOrder: [], schemaVersion: 999 };
  const members = [{ user_id: 'u-demo', full_name: 'Demo User', disabled: false, role: 'owner', joined_at: '${Y}-01-01T00:00:00Z' }];
  const resolved = (data) => Promise.resolve({ data, error: null });
  function chain(table) {
    const c = {};
    for (const m of ['select','eq','limit','order','update','insert','delete','neq','in']) {
      c[m] = () => { if (m === 'order') return resolved(table === 'household_members' ? members : []); return c; };
    }
    c.maybeSingle = () => resolved(table === 'household_members' ? { household_id: 'hh-demo' } : { id: 'hh-demo', name: 'Demo Household' });
    c.single = c.maybeSingle;
    c.then = (res, rej) => resolved(null).then(res, rej);
    return c;
  }
  const fakeClient = {
    auth: { getSession: () => resolved({ session }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: () => resolved(null) },
    from: (t) => chain(t),
    rpc: (name) => name === 'load_household' ? resolved({ data: payload, receipts: [] }) : resolved(null),
    channel: () => { const ch = { on: () => ch, subscribe: () => ({ unsubscribe(){} }) }; return ch; },
    removeChannel(){},
  };
  const fake = { createClient: () => fakeClient };
  Object.defineProperty(window, 'supabase', { get: () => fake, set: () => {} });
})();
`;

// A stub transform that gives the household next year as well as this one.
//
// The forecast is a rolling ninety days and the household is one budget year,
// so the last quarter of December has less and less to draw: at the 31st the
// curve, its ledger and the what-if scenario are all empty, and the four tests
// that read them fail on a household that simply ended. That is not a defect
// in any of them — it is a one-year fixture meeting a ninety-day window.
//
// A household that has been used for more than a year has next year in it
// (the app offers "+ Add 2027" for exactly this), and the forecast reads every
// budget year rather than just the active one. So the tests about the ninety
// days ahead get a household with somewhere for those days to be. Everything
// else keeps the single-year fixture, where a second year would only be noise.
const spansYearEnd = (t) => t.replace(
  `yearConfigs: [{ year: ${Y}, openingBalance: 1250000 }]`,
  `yearConfigs: [{ year: ${Y}, openingBalance: 1250000 }, { year: ${Y + 1}, openingBalance: 1250000 }]`
);

export { E, entries, monthTargets, mkStub, spansYearEnd };
