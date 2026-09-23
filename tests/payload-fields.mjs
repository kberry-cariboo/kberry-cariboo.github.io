// Two pairs of declarations that have to agree, and cannot derive from each
// other. Both are checked by reading the source as text — no browser, no
// database — so they run on every push.
//
// Do the client and the database agree on what a save carries?
//
// A household field is declared twice, once on each side of the wire:
//
//   HOUSEHOLD_FIELDS   in src/lib/household-sync.ts  — the client's table
//   cf_payload_keys()  in supabase/schema.sql        — the schema's list
//
// Everything else on the client derives from the first (state, payload,
// autosave, backup), and cf_apply_household_payload refuses a payload key that
// isn't in the second. Neither can derive from the other — one is JavaScript
// shipped to a browser, the other is SQL run by hand against Supabase — so this
// test is the join between them.
//
// It exists because a field missing from the SQL side used to fail silently:
// cf_apply_household_payload wrote the columns it knew about and ignored the
// rest, so the save succeeded, the app looked right, and the next load handed
// back a copy that never had the field. Holidays shipped that way.
//
// Deliberately needs no database and no browser — it reads both files as text —
// so it runs in CI on every push, which is what makes the mismatch impossible
// to ship rather than merely detectable.
//
//   node tests/payload-fields.mjs
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Both sides are plain literals, so slicing the file to the literal and pulling
// the strings out of it is exact. Anything that makes these regexes miss (the
// table stops being a literal, the SQL list moves) fails loudly below as "found
// no fields", never quietly as "they match".
const between = (src, startMarker, endMarker, what) => {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error(`could not find ${what} (looked for ${JSON.stringify(startMarker)})`);
  const j = src.indexOf(endMarker, i + startMarker.length);
  if (j < 0) throw new Error(`could not find the end of ${what}`);
  return src.slice(i + startMarker.length, j);
};

const clientBlock = between(read('src/lib/household-sync.ts'), 'const HOUSEHOLD_FIELDS = [', '\n  ] satisfies', 'HOUSEHOLD_FIELDS in src/lib/household-sync.ts');
const clientKeys = [...clientBlock.matchAll(/\{\s*key:\s*"([^"]+)"/g)].map((m) => m[1]);

const sqlBlock = between(read('supabase/schema.sql'), 'create or replace function cf_payload_keys()', '$$;', 'cf_payload_keys() in supabase/schema.sql');
const sqlKeys = [...sqlBlock.matchAll(/'([A-Za-z_][A-Za-z0-9_]*)'/g)].map((m) => m[1]);

const problems = [];
if (clientKeys.length < 5) problems.push(`found only ${clientKeys.length} field(s) in HOUSEHOLD_FIELDS — the parser above is out of date`);
if (sqlKeys.length < 5) problems.push(`found only ${sqlKeys.length} key(s) in cf_payload_keys() — the parser above is out of date`);

const dupes = (a) => [...new Set(a.filter((x, i) => a.indexOf(x) !== i))];
for (const [label, keys] of [['HOUSEHOLD_FIELDS', clientKeys], ['cf_payload_keys()', sqlKeys]]) {
  const d = dupes(keys);
  if (d.length) problems.push(`${label} lists ${d.join(', ')} more than once`);
}

const missingFromSql = clientKeys.filter((k) => !sqlKeys.includes(k));
const missingFromClient = sqlKeys.filter((k) => !clientKeys.includes(k));
if (missingFromSql.length) {
  problems.push(
    `the app saves ${missingFromSql.join(', ')} but the schema has nowhere to put it.\n` +
    '      Add a column (or table) for it in supabase/schema.sql, handle it in\n' +
    '      cf_apply_household_payload and load_household, and add it to cf_payload_keys().\n' +
    '      Until then every save from an updated client will be rejected.'
  );
}
if (missingFromClient.length) {
  problems.push(
    `the schema expects ${missingFromClient.join(', ')} but no field in HOUSEHOLD_FIELDS produces it.\n` +
    '      Either add the row to HOUSEHOLD_FIELDS or drop the key from cf_payload_keys().'
  );
}

// ── Every kind of change the activity log records has a name ────────────────
//
// logActivity(kind, what) files a record under a short kind, and the Activity
// page looks that kind up in ACTIVITY_LABELS to print a chip. A kind with no
// label falls back to the raw string, so the page shows "category" where every
// other row says "Entry" or "Goal" — small, but it is the same hand-kept-list
// mistake that has bitten this codebase three times over (the autosave
// dependency array, the unsaved-marker list, and the payload keys above), and
// it costs nothing to close.
// Each member's own preferences are a second pair of declarations with the
// same failure mode: MEMBER_PREF_FIELDS on the client, cf_member_pref_keys() in
// the schema. save_my_preferences refuses a key the database doesn't list, so a
// client ahead of its database would fail every preference save. And no key may
// be both: a field in both lists would sync to the household *and* per member,
// and which copy won would depend on load order.
{
  const prefBlock = between(read('src/lib/household-sync.ts'), 'const MEMBER_PREF_FIELDS = [', '\n  ] satisfies', 'MEMBER_PREF_FIELDS in src/lib/household-sync.ts');
  const prefKeys = [...prefBlock.matchAll(/\{\s*key:\s*"([^"]+)"/g)].map((m) => m[1]);
  const sqlPrefBlock = between(read('supabase/schema.sql'), 'create or replace function cf_member_pref_keys()', '$$;', 'cf_member_pref_keys() in supabase/schema.sql');
  const sqlPrefKeys = [...sqlPrefBlock.matchAll(/'([A-Za-z_][A-Za-z0-9_]*)'/g)].map((m) => m[1]);
  if (prefKeys.length < 5) problems.push(`found only ${prefKeys.length} field(s) in MEMBER_PREF_FIELDS — the parser above is out of date`);
  const onlyClient = prefKeys.filter((k) => !sqlPrefKeys.includes(k));
  const onlySql = sqlPrefKeys.filter((k) => !prefKeys.includes(k));
  if (onlyClient.length) problems.push(`MEMBER_PREF_FIELDS has ${onlyClient.join(', ')} but cf_member_pref_keys() does not — every preference save would be refused`);
  if (onlySql.length) problems.push(`cf_member_pref_keys() lists ${onlySql.join(', ')} but no row of MEMBER_PREF_FIELDS produces it`);
  const both = prefKeys.filter((k) => clientKeys.includes(k));
  if (both.length) problems.push(`${both.join(', ')} is declared both per household and per member`);
  // The retired list is what lets a tab from before the split keep saving.
  const retired = between(read('supabase/schema.sql'), 'create or replace function cf_payload_retired_keys()', '$$;', 'cf_payload_retired_keys()');
  const notRetired = prefKeys.filter((k) => !retired.includes(`'${k}'`));
  if (notRetired.length) problems.push(`${notRetired.join(', ')} moved to member preferences but is not in cf_payload_retired_keys(), so an older tab's household save would be refused`);
}

{
  const appData = read('src/lib/app-data.ts');
  const labelsBlock = appData.match(/const ACTIVITY_LABELS = \{([\s\S]*?)\};/);
  if (!labelsBlock) {
    problems.push('ACTIVITY_LABELS could not be found in src/lib/app-data.ts — has it been renamed?');
  } else {
    const labelled = new Set([...labelsBlock[1].matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]));
    const logged = new Set();
    // App.js and every hook it is composed from: a logActivity call can live in any of them.
    for (const f of ['src/App.tsx', ...readdirSync(join(ROOT, 'src/app')).filter((n) => /\.tsx?$/.test(n)).map((n) => 'src/app/' + n), 'src/components/settings.tsx', 'src/components/plan.tsx',
                     'src/components/budget.tsx', 'src/components/entries.tsx',
                     'src/components/forms.tsx', 'src/components/dashboard.tsx',
                     'src/components/misc-ui.tsx', 'src/components/forecast-plan.tsx',
                     'src/components/csv-import.tsx', 'src/components/auth-misc.tsx',
                     'src/components/plan-dashboard-shared.ts', 'src/components/primitives.tsx',
                     'src/components/help.tsx', 'src/lib/year-copy.ts']) {
      for (const m of read(f).matchAll(/logActivity\(\s*["'](\w+)["']/g)) logged.add(m[1]);
    }
    const unnamed = [...logged].filter((k) => !labelled.has(k)).sort();
    if (unnamed.length) {
      problems.push(
        `the activity log records ${unnamed.join(', ')} but ACTIVITY_LABELS has no name for ` +
        `${unnamed.length === 1 ? 'it' : 'them'}, so the Activity page would print the raw kind.`
      );
    }
  }
}

if (!problems.length) {
  console.log(`PASS payload-fields: the client and the schema agree on all ${clientKeys.length} household fields and every member preference,`
    + ' and every kind the activity log records has a name');
} else {
  console.error(`FAIL payload-fields: ${problems.length} disagreement(s) between declarations that have to match\n`);
  for (const p of problems) console.error('  ' + p);
  process.exitCode = 1;
}
