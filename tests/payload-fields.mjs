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

if (!problems.length) {
  console.log(`PASS payload-fields: the client and the schema agree on all ${clientKeys.length} household fields`);
} else {
  console.error(`FAIL payload-fields: ${problems.length} mismatch(es) between the client and the schema\n`);
  for (const p of problems) console.error('  ' + p);
  process.exitCode = 1;
}
