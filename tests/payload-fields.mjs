// Two pairs of declarations that have to agree, and cannot derive from each
// other. Both are checked by reading the source as text — no browser, no
// database — so they run on every push.
//
// Do the client and the database agree on what a save carries?
//
// A household field is declared twice, once on each side of the wire:
//
//   HOUSEHOLD_FIELDS   in src/lib/household-sync.js  — the client's table
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
import { readFileSync } from 'fs';
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

const clientBlock = between(read('src/lib/household-sync.js'), 'const HOUSEHOLD_FIELDS = [', '\n  ];', 'HOUSEHOLD_FIELDS in src/lib/household-sync.js');
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
{
  const appData = read('src/lib/app-data.js');
  const labelsBlock = appData.match(/const ACTIVITY_LABELS = \{([\s\S]*?)\};/);
  if (!labelsBlock) {
    problems.push('ACTIVITY_LABELS could not be found in src/lib/app-data.js — has it been renamed?');
  } else {
    const labelled = new Set([...labelsBlock[1].matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]));
    const logged = new Set();
    for (const f of ['src/App.js', 'src/components/settings.js', 'src/components/plan.js',
                     'src/components/budget.js', 'src/components/entries.js',
                     'src/components/forms.js', 'src/components/dashboard.js',
                     'src/components/misc-ui.js', 'src/components/forecast-plan.js',
                     'src/components/csv-import.js', 'src/components/auth-misc.js',
                     'src/components/plan-dashboard-shared.js', 'src/components/primitives.js',
                     'src/components/help.js', 'src/lib/year-copy.js']) {
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
  console.log(`PASS payload-fields: the client and the schema agree on all ${clientKeys.length} household fields,`
    + ' and every kind the activity log records has a name');
} else {
  console.error(`FAIL payload-fields: ${problems.length} disagreement(s) between declarations that have to match\n`);
  for (const p of problems) console.error('  ' + p);
  process.exitCode = 1;
}
