// Does a payload get migrated exactly once, no matter which version it came from?
//
// migrateHouseholdPayload (src/lib/migrate.js) upgrades a payload arriving from
// outside this device's localStorage: a household load from Supabase, or a
// backup file being restored in Settings. It is the one migration path with no
// durable "already done" marker behind it — migrateData stamps
// cf_schema_version, but a payload carries only the version it was written at,
// and the same payload can be handed to this function on every load.
//
// That makes over-migration the failure mode to guard. It has happened: every
// conversion in the function used to run unconditionally, with the callers
// gating the whole call on `payloadVersion < SCHEMA_VERSION`. That is only ever
// correct while SCHEMA_VERSION equals the version that introduced the last
// conversion, so v9 broke it — a v8 payload is already in cents, but 8 < 9 sent
// it through the v8 dollars->cents pass a second time and multiplied every
// amount by 100. A restored backup showed $1,650.00 rent as $165,000.00, and
// the next SCHEMA_VERSION bump would have done the same to every v9 payload
// alive, cloud data included.
//
// So this checks the property rather than one case: for every source version,
// money is converted if and only if that version predates the step that
// converts it. Extend BY_VERSION whenever a migration step is added.
//
// Runs standalone — no browser, no database:  node tests/payload-migration.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src/lib/migrate.js'), 'utf8');
const runtime = readFileSync(join(ROOT, 'src/lib/runtime.js'), 'utf8');

// migrate.js is a fragment of the app's single shared scope, not a module. Give
// it the real runtime.js (the esbuild spread helpers and genId it leans on),
// stub the two app helpers migrateData needs but this function doesn't, and hand
// back what the test asserts against. Deliberately the real source rather than a
// copy: a migration step added to migrate.js and not to BY_VERSION below should
// fail here, not pass against a stale duplicate.
const load = new Function('React', 'localStorage', `
  ${runtime}
  const localDateStr = () => '2026-01-01';
  const moveEntryAttachmentsToOverrides = (e, o) => ({ entries: e, overridesByYr: o, moved: false });
  ${src}
  return { migrateHouseholdPayload, SCHEMA_VERSION };
`);
const noHook = () => { throw new Error('payload migration must not need React'); };
// migrate.js runs migrateData() at module scope. It has nothing to do here, but
// it needs somewhere to look: an empty store makes it take the fresh-install
// path and return immediately, instead of logging a storage failure per field.
const store = new Map();
const fakeStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const { migrateHouseholdPayload, SCHEMA_VERSION } = load(new Proxy({}, { get: () => noHook }), fakeStorage);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

// $1,650.00 and a 19.99% card at $4,500.00 owing, written the two ways the app
// has stored them.
const dollars = {
  entries: [{ id: 'e1', desc: 'Rent', amount: 1650, monthlyAmounts: [1650, 1650] }],
  overridesByYr: { 2026: { 'e1-2026-3-1': { amount: 1700 } } },
  yearConfigs: [{ year: 2026, openingBalance: 12500 }],
  budgetTargets: { '2026:0': { Housing: 1650 } },
  goals: [{ id: 'g1', target: 10000, saved: 2500, monthly: 500 }],
  templates: [{ desc: 'Hydro', amount: 185, monthlyAmounts: [185] }],
  alertThreshold: 500,
  debtData: { visa: { balance: '4500', rate: '19.99', payment: '200' } },
};
const cents = {
  entries: [{ id: 'e1', desc: 'Rent', amount: 165000, monthlyAmounts: [165000, 165000] }],
  overridesByYr: { 2026: { 'e1-2026-3-1': { amount: 170000 } } },
  yearConfigs: [{ year: 2026, openingBalance: 1250000 }],
  budgetTargets: { '2026:0': { Housing: 165000 } },
  goals: [{ id: 'g1', target: 1000000, saved: 250000, monthly: 50000 }],
  templates: [{ desc: 'Hydro', amount: 18500, monthlyAmounts: [18500] }],
  alertThreshold: 50000,
  debtData: { visa: { balance: '450000', rate: '19.99', payment: '20000' } },
};
const MONEY = ['entries', 'overridesByYr', 'yearConfigs', 'budgetTargets', 'goals', 'templates', 'alertThreshold'];

// What a payload written at each version already holds, and so what it must
// come back as. v8 moved everything but the debt tracker to cents; v9 finished
// the job. Anything at or past a step must come out of that step untouched.
const BY_VERSION = {
  0: { money: 'dollars', debt: 'dollars' },
  7: { money: 'dollars', debt: 'dollars' },
  8: { money: 'cents', debt: 'dollars' },
  9: { money: 'cents', debt: 'cents' },
};

const pick = (scale, keys) => keys.reduce((o, k) => (o[k] = (scale === 'cents' ? cents : dollars)[k], o), {});
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const [version, held] of Object.entries(BY_VERSION)) {
  const input = Object.assign({}, pick(held.money, MONEY), pick(held.debt, ['debtData']), { schemaVersion: Number(version) });
  const out = migrateHouseholdPayload(input, Number(version));
  for (const k of MONEY) {
    check(`v${version}: ${k} ends in cents`, eq(out[k], cents[k]),
      `got ${JSON.stringify(out[k])}\n     want ${JSON.stringify(cents[k])}`);
  }
  check(`v${version}: debtData ends in cents`, eq(out.debtData, cents.debtData),
    `got ${JSON.stringify(out.debtData)}\n     want ${JSON.stringify(cents.debtData)}`);
  check(`v${version}: the interest rate is a percentage and is left alone`, out.debtData.visa.rate === '19.99', out.debtData.visa.rate);
}

// The property that actually broke: migrating an already-current payload is a
// no-op, and stays a no-op after the next SCHEMA_VERSION bump. A `from` above
// every gate stands in for "SCHEMA_VERSION has moved on and this payload has
// not" — the exact case the old outer gate got wrong.
const current = Object.assign({}, cents, { schemaVersion: SCHEMA_VERSION });
check('a payload at the current version is returned unchanged',
  eq(migrateHouseholdPayload(current, SCHEMA_VERSION), current),
  JSON.stringify(migrateHouseholdPayload(current, SCHEMA_VERSION)));
check('migrating twice gives the same result as migrating once',
  eq(migrateHouseholdPayload(migrateHouseholdPayload(dollars, 0), SCHEMA_VERSION), migrateHouseholdPayload(dollars, 0)),
  'the conversion is not idempotent across a re-run');
for (const future of [SCHEMA_VERSION + 1, SCHEMA_VERSION + 5]) {
  check(`a v${SCHEMA_VERSION} payload survives a bump to v${future}`,
    eq(migrateHouseholdPayload(current, SCHEMA_VERSION), current),
    'amounts changed when SCHEMA_VERSION moved past the payload');
}

check('a null payload is passed through', migrateHouseholdPayload(null, 0) === null);
check('an empty payload is passed through', eq(migrateHouseholdPayload({}, 0), {}));
check('a payload with no money fields is passed through', eq(migrateHouseholdPayload({ categories: ['a'] }, 0), { categories: ['a'] }));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
