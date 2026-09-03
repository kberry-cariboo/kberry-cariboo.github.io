// Does every field the app saves actually come back?
//
// cf_apply_household_payload used to write the columns it knew about and ignore
// everything else in the payload. A field with no column behind it therefore
// failed *silently*: the save succeeded, the app looked right, and the next load
// replaced the user's work with a copy that never had it. Six features were
// being lost that way — transfers, skipped occurrences, reconciled actual
// amounts, occurrences moved to another month, copy provenance, and the
// per-category rollover flags — and none of them broke a single test, because
// tests/regression.mjs stubs Supabase and accepts any payload it is handed.
//
// Top-level keys are now declared on both sides and checked by
// tests/payload-fields.mjs, and the schema refuses one it can't store. The five
// entry/override fields in that list were never top-level keys, though — they
// live inside an entry or an override object, where there is nothing to declare
// them against. This test remains their only cover.
//
// So this test doesn't check behaviour. It saves a payload exercising every
// documented feature through the real SQL, loads it back, and compares the two
// field by field. Anything the schema quietly drops shows up as a diff.
//
// Add to the fixture whenever you add a field to the sync payload.
//
// Opt-in, like tests/sync-sql.mjs — it needs a throwaway Postgres and skips
// without one:
//
//   createdb cf_scratch
//   psql -d cf_scratch -f supabase/schema.sql    # plus the auth shim, see
//                                                # supabase/schema-test.sql
//   CF_TEST_PG=1 PGDATABASE=cf_scratch node tests/payload-roundtrip.mjs
import { execFileSync } from 'child_process';
import { reportServerMajor } from './pg-version.mjs';

// Its own user, not the one tests/sync-sql.mjs uses. They shared 1111… and
// the teardown below deletes it, which auth.users refuses while the *other*
// suite's household_settings still names it as updated_by — so running the two
// against one scratch database, in the order the README gives, failed at the
// last statement of a suite that had otherwise passed. CI never saw it: it
// gets a fresh container every run, and runs them in the one order that works.
const UID = '44444444-4444-4444-8444-444444444444';
const HID = '33333333-3333-4333-8333-333333333333';

if (!process.env.CF_TEST_PG) {
  console.log('payload-roundtrip: skipped (set CF_TEST_PG=1 and point PG* at a scratch database to run it)');
  process.exit(0);
}
const psql = (sql, asUser) => execFileSync('psql', ['-t', '-A', '-c', sql], {
  encoding: 'utf8',
  maxBuffer: 1 << 26,
  env: Object.assign({}, process.env, asUser ? { PGOPTIONS: `-c request.jwt.claim.sub=${asUser}` } : {}),
}).trim();
try {
  psql('select 1;');
} catch (e) {
  console.log('payload-roundtrip: skipped (no reachable database: ' + String(e.message || e).split('\n')[0] + ')');
  process.exit(0);
}

reportServerMajor(psql, 'payload-roundtrip');

// One of everything the app can save.
const payload = {
  entries: [
    { id: 'e-expense', desc: 'Rent', type: 'expense', amount: 165000, category: 'Housing', repeats: true,
      recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-01', notes: 'monthly rent' },
    { id: 'e-income', desc: 'Ken - Payroll (15th)', type: 'income', amount: 250000, category: 'Income', repeats: true,
      recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-15', notes: '' },
    // A transfer is neither income nor expense and carries a direction: stored
    // as an expense it flips sign in the running balance.
    { id: 'e-transfer', desc: 'Move to savings', type: 'transfer', transferDirection: 'in', amount: 50000,
      category: 'Savings / RRSP', repeats: false, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '',
      startDate: '2026-03-02', notes: '' },
    { id: 'e-weekly', desc: 'Groceries', type: 'expense', amount: 26000, category: 'Food', repeats: true,
      recurEvery: 2, recurUnit: 'week', recurDays: [1, 4], recurEnd: '2026-11-30', startDate: '2026-01-05', notes: '' },
    { id: 'e-varying', desc: 'Hydro', type: 'expense', amount: 18500, category: 'Utilities', repeats: true,
      recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-12', notes: '',
      monthlyAmounts: [21000, 21000, 19000, 17000, 15000, 14000, 14000, 14000, 15000, 17000, 19000, 21000] },
    { id: 'e-copy', desc: 'Vet checkup', type: 'expense', amount: 24000, category: 'Farm / Animals', repeats: false,
      recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-08-12', notes: '',
      copiedFrom: 'e-expense' },
    // The two schedules whose day of the month is not the start date's: the
    // last day, and the nth named weekday. recurNth is the field with no
    // column behind it until schema.sql is re-run, which is exactly the shape
    // of failure this test exists to catch.
    { id: 'e-monthend', desc: 'Card payment', type: 'expense', amount: 42000, category: 'Debt / Credit', repeats: true,
      recurEvery: 1, recurUnit: 'monthend', recurDays: [], recurEnd: '', startDate: '2026-02-28', notes: '' },
    { id: 'e-nthweekday', desc: 'Cleaner', type: 'expense', amount: 12000, category: 'Personal', repeats: true,
      recurEvery: 1, recurUnit: 'monthweekday', recurDays: [5], recurNth: -1, recurEnd: '', startDate: '2026-01-30', notes: '' },
    // Both settings of the per-entry banking-day rule, because the field is a
    // tri-state and `false` is the value a column-less round-trip would turn
    // back into "unset" without anyone noticing.
    { id: 'e-bank-yes', desc: 'Salary', type: 'income', amount: 320000, category: 'Income', repeats: true,
      recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-15', notes: '',
      bankingDay: true },
    { id: 'e-bank-no', desc: 'Rent from tenant', type: 'income', amount: 90000, category: 'Income', repeats: true,
      recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-01', notes: '',
      bankingDay: false },
    // A transfer between two accounts: one entry, two account references, and
    // the only entry in this fixture that is not filed under the default.
    { id: 'e-xfer', desc: 'To savings', type: 'transfer', transferDirection: 'out', amount: 50000,
      category: 'Savings / RRSP', repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [],
      recurEnd: '', startDate: '2026-01-20', notes: '',
      accountId: 'acct-main', toAccountId: 'acct-sav' },
  ],
  accounts: [
    { id: 'acct-main', name: 'Chequing', kind: 'chequing', opening: 0 },
    { id: 'acct-sav', name: 'Savings', kind: 'savings', opening: 500000 },
    // A credit card is an ordinary account whose balance runs below zero —
    // there is no second arithmetic for it, and nothing here should treat it
    // as anything other than a row.
    { id: 'acct-visa', name: 'Visa', kind: 'credit', opening: -120000 },
  ],
  overridesByYr: {
    2026: {
      // Two previous values, oldest first — rows in entry_override_history
      // now. The first has no author (a household of one) and only an amount;
      // the second is a fuller snapshot. Neither carries the nested `_history`
      // the client used to spread into `prev`, which is the one thing the
      // normalization deliberately does not keep.
      'e-expense-2026-2-1': { amount: 170000, notes: 'rent went up', _savedAt: '2026-03-01T10:00:00.000Z',
        _by: UID,
        _history: [
          { ts: '2026-02-01T09:00:00.000Z', prev: { amount: 165000 } },
          { ts: '2026-02-15T09:30:00.000Z', by: UID,
            prev: { desc: 'Rent', amount: 167500, notes: 'first increase',
                    _savedAt: '2026-02-01T09:00:00.000Z', _by: UID } },
        ] },
      'e-expense-2026-3-1': { skipped: true },
      'e-expense-2026-4-1': { actualAmount: 171050 },
      'e-expense-2026-5-1': { day: 3, month: 6 },
      'e-income-2026-7-15': { desc: 'Payroll + bonus', amount: 300000 },
    },
  },
  completed: { 'e-expense-2026-0-1': true, 'e-income-2026-0-15': true },
  goals: [{ id: 'g-roof', name: 'New roof', target: 500000, saved: 125000, monthly: 25000,
            targetDate: '2027-06-01', entryId: 'e-expense', payoutEntryId: null,
            createdAt: '2026-01-02T00:00:00.000Z' }],
  categories: ['Housing', 'Income', 'Food', 'Utilities', 'Savings / RRSP', 'Farm / Animals'],
  categoryColors: { Housing: '#2F6FED', Income: '#1FA97A' },
  yearConfigs: [{ year: 2026, openingBalance: 500000 }, { year: 2027, openingBalance: 0 }],
  budgetTargets: { '2026:0': { Housing: 165000, Food: 56000 }, '2026:1': { Housing: 165000 },
                   _rollover: { Food: true } },
  templates: [{ desc: 'Gym', type: 'expense', amount: 5500, category: 'Personal', repeats: true,
                recurEvery: 1, recurUnit: 'month', recurDays: [], notes: 'tpl' }],
  // Three shapes, because a debt is a row in `debts` now and the columns are
  // nullable so that "not filled in yet" survives as something other than
  // zero: one fully filled in, one with a payment and no balance (the state
  // the tracker renders as "payments found, no balances yet"), and one hidden.
  // A record must come back as exactly the fields it was saved with — no
  // empty label, no null payment it never had.
  // The activity log — rows in activity_log now, not a jsonb array. Newest
  // first, which is the order the client keeps and the Activity page reads.
  // One record has no `by`, which is what a household of one logs, and it has
  // to come back without the key rather than with a null.
  activity: [
    { id: 'a2', at: '2026-08-01T10:05:00.000Z', by: UID, kind: 'entry', what: 'Added Rent — -$1,650.00' },
    { id: 'a1', at: '2026-08-01T10:00:00.000Z', kind: 'goal', what: 'Added the goal Roof' },
  ],
  // Three settings that used to be the device's alone.
  budgetColOrder: ['category', 'desc', 'income', 'expense', 'balance'],
  debtExtra: '250',
  debtSimExcluded: ['manual_visa'],
  debtData: {
    Car_loan: { balance: 1200000, rate: 5.9, hidden: false },
    manual_visa: { label: 'Visa', balance: 450000, rate: 19.99, payment: 30000, hidden: false },
    manual_partial: { label: 'Line of credit', payment: 25000 },
  },
  deletedCopyIds: { 'e-old': true },
  holidays: { 2026: { '2026-07-01': { name: 'Canada Day', optional: false, source: 'computed' } } },
  dashHidden: { charts: true },
  dashOrder: ['kpis', 'upcoming'],
  colOrder: ['desc', 'category', 'income', 'expense', 'balance'],
  regFilter: 'all', regFilterCats: ['Housing'], regFilterScheds: ['recurring'], regFilterStatus: ['unpaid'],
  activeYear: 2026, alertThreshold: 50000, darkMode: true, forecastHorizon: 60,
  schemaVersion: 8,
};

psql(`delete from households where id='${HID}';
      insert into auth.users (id, email) values ('${UID}','roundtrip@example.invalid') on conflict (id) do nothing;
      insert into households (id, name) values ('${HID}','payload-roundtrip');
      insert into household_members (household_id, user_id, full_name, role) values ('${HID}','${UID}','RT','owner');`);
psql(`select cf_apply_household_payload('${HID}'::uuid, $cfp$${JSON.stringify(payload)}$cfp$::jsonb);`);
const back = JSON.parse(psql("select (load_household()->'data')::text;", UID));

// Order-insensitive: object key order and array order carry no meaning in the
// payload, and timestamps may come back in a different (equivalent) format.
const canon = (v) => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {});
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})$/.test(v)) {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return v;
};
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const show = (v) => { const s = JSON.stringify(canon(v)); return s === undefined ? '(absent)' : s.length > 180 ? s.slice(0, 180) + '…' : s; };

const issues = [];
const check = (label, sent, got) => { if (!same(sent, got)) issues.push({ label, sent: show(sent), got: show(got) }); };

for (const e of payload.entries) {
  const g = (back.entries || []).find((x) => String(x.id) === e.id);
  if (!g) { issues.push({ label: `entry ${e.id}`, sent: 'present', got: '(DROPPED ENTIRELY)' }); continue; }
  for (const k of Object.keys(e)) check(`entry ${e.id}.${k}`, e[k], g[k]);
}
for (const [occ, ov] of Object.entries(payload.overridesByYr[2026])) {
  const g = ((back.overridesByYr || {})['2026'] || {})[occ];
  if (!g) { issues.push({ label: `override ${occ}`, sent: show(ov), got: '(DROPPED ENTIRELY)' }); continue; }
  for (const k of Object.keys(ov)) check(`override ${occ}.${k}`, ov[k], g[k]);
}
for (const k of ['completed', 'goals', 'categories', 'categoryColors', 'yearConfigs', 'budgetTargets',
                 'templates', 'debtData', 'deletedCopyIds', 'holidays', 'dashHidden', 'dashOrder',
                 'colOrder', 'regFilter', 'regFilterCats', 'regFilterScheds', 'regFilterStatus',
                 'activeYear', 'alertThreshold', 'darkMode', 'forecastHorizon',
                 'budgetColOrder', 'debtExtra', 'debtSimExcluded', 'activity']) {
  check(k, payload[k], back[k]);
}

// The round trip above would pass just as well if debtData were still a jsonb
// blob — it is the same bytes in and out either way. What makes it normalized
// is that the figures are rows with typed columns, so check that directly, and
// check that the legacy column it used to live in is no longer the thing being
// written.
{
  const rows = psql(`select count(*) from debts where household_id='${HID}';`);
  if (rows !== '3') issues.push({ label: 'debts table', sent: '3 rows', got: rows + ' rows' });
  const visa = psql(`select label || '|' || balance || '|' || rate || '|' || payment
                     from debts where household_id='${HID}' and key='manual_visa';`);
  if (visa !== 'Visa|450000.00|19.990000|30000.00') {
    issues.push({ label: 'debts columns are typed', sent: 'Visa|450000.00|19.990000|30000.00', got: visa });
  }
  // The partly-filled one keeps its blanks as nulls rather than zeros: a debt
  // with a $0 balance and a debt with no balance yet are different states.
  const partial = psql(`select coalesce(balance::text,'NULL') || '|' || coalesce(hidden::text,'NULL')
                        from debts where household_id='${HID}' and key='manual_partial';`);
  if (partial !== 'NULL|NULL') issues.push({ label: 'unfilled debt fields stay null', sent: 'NULL|NULL', got: partial });
  // The legacy blobs, while they are still there. supabase/drop-legacy-json.sql
  // removes them once a deploy has proved the migration, and after that these
  // checks have nothing to look at — which is the success case, not a skip
  // worth failing over.
  const hasCol = (t, c) => psql(`select count(*) from information_schema.columns
                                 where table_schema='public' and table_name='${t}' and column_name='${c}';`) === '1';
  if (hasCol('household_settings', 'debt_data')) {
    const blobs = psql(`select activity::text || ' ' || dash_hidden::text || ' ' || deleted_copy_ids::text
                             || ' ' || rollover::text || ' ' || debt_data::text
                        from household_settings where household_id='${HID}';`);
    if (blobs !== '[] {} {} {} {}') {
      issues.push({ label: 'the legacy settings blobs are no longer written', sent: '[] {} {} {} {}', got: blobs });
    }
  }
  if (hasCol('entry_overrides', 'history')) {
    const histBlob = psql(`select history::text from entry_overrides where household_id='${HID}' and occurrence_id='e-expense-2026-2-1';`);
    if (histBlob !== '[]') issues.push({ label: 'the legacy history blob is no longer written', sent: '[]', got: histBlob });
  }
  // Whatever the legacy columns are doing, there must be no jsonb column
  // anywhere that the app actually writes.
  const liveJson = psql(`select coalesce(string_agg(table_name || '.' || column_name, ', ' order by table_name), '(none)')
                         from information_schema.columns
                         where table_schema = 'public' and data_type = 'jsonb'
                           and (table_name, column_name) not in (
                             ('household_data','data'), ('household_settings','activity'),
                             ('household_settings','debt_data'), ('household_settings','dash_hidden'),
                             ('household_settings','deleted_copy_ids'), ('household_settings','rollover'),
                             ('entry_overrides','history'));`);
  if (liveJson !== '(none)') {
    issues.push({ label: 'a live column stores JSON', sent: '(none)', got: liveJson });
  }
  const acts = psql(`select count(*) from activity_log where household_id='${HID}';`);
  if (acts !== '2') issues.push({ label: 'activity_log rows', sent: '2', got: acts });
  const solo = psql(`select coalesce(by_user::text,'NULL') from activity_log where household_id='${HID}' and id='a1';`);
  if (solo !== 'NULL') issues.push({ label: 'an activity record with no author stores null', sent: 'NULL', got: solo });
  const sets = psql(`select array_to_string(dash_hidden_ids,',') || '|' || array_to_string(deleted_copy_id_list,',') || '|' || array_to_string(rollover_categories,',')
                     from household_settings where household_id='${HID}';`);
  if (!/\|/.test(sets)) issues.push({ label: 'the id sets are text[] columns', sent: 'arrays', got: sets });
}

// households first: household_settings and household_members hang off it, and
// auth.users cannot go while anything still points at it.
psql(`delete from households where id='${HID}'; delete from auth.users where id='${UID}';`);

if (!issues.length) {
  console.log('PASS payload-roundtrip: every field came back intact');
} else {
  console.error(`FAIL payload-roundtrip: ${issues.length} field(s) did not survive the round trip\n`);
  for (const i of issues) console.error(`  ${i.label}\n      sent: ${i.sent}\n      got : ${i.got}`);
  process.exitCode = 1;
}
