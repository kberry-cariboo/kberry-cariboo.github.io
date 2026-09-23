#!/usr/bin/env node
// Runs a group of test suites, one after another, and exits non-zero if any
// failed — so "is everything green" is one command and one exit code rather
// than a list in the README to copy from. The groups mirror what
// .github/workflows/build.yml runs.
//
//   node scripts/test.mjs fast      browser-free, no database (seconds)
//   node scripts/test.mjs browser   the Playwright suites (~30 min)
//   node scripts/test.mjs sql       needs CF_TEST_PG=1 and PG* pointing at a
//                                   throwaway Postgres with schema.sql loaded
//   node scripts/test.mjs all       all three
//
// Each suite's own output is kept to its last lines unless it fails, when it
// is printed whole — a green run is a summary, a red one is the evidence.
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = (file, ...flags) => ({ name: file, cmd: process.execPath, args: [...flags, join('tests', file)] });
const psql = (file) => ({ name: file, cmd: 'psql', args: ['-v', 'ON_ERROR_STOP=1', '-q', '-f', file] });

const GROUPS = {
  fast: [
    node('payload-fields.mjs'), node('payload-migration.mjs'), node('year-copy.mjs'), node('dates.mjs'),
    node('theme-tokens.mjs'), node('breakpoints.mjs'), node('contrast.mjs'), node('motion.mjs'),
    node('networth.mjs'), node('cat-detail.mjs'), node('sinking.mjs'), node('anomaly.mjs'),
    node('drift.mjs'), node('help-ia.mjs'), node('help-shots.mjs'),
    node('ai-proxy.mjs', '--experimental-strip-types'), node('vendor-hashes.mjs'), node('sync-merge.mjs'),
  ],
  sql: [
    psql('supabase/schema-test.sql'), psql('tests/viewer-role.sql'), psql('tests/invite-flow.sql'),
    psql('tests/member-prefs.sql'), psql('tests/receipts.sql'), psql('tests/ai-quota.sql'), psql('tests/member-lifecycle.sql'), psql('tests/field-versions.sql'),
    node('payload-roundtrip.mjs'), node('sync-sql.mjs'),
  ],
  browser: [
    node('cloud-sync.mjs'), node('regression.mjs'), node('layout-sweep.mjs'),
    node('focus-ring.mjs'), node('settings-sweep.mjs'),
  ],
};
GROUPS.all = [...GROUPS.fast, ...GROUPS.sql, ...GROUPS.browser];

const group = process.argv[2] || 'fast';
if (!GROUPS[group]) {
  console.error(`unknown group "${group}" — one of: ${Object.keys(GROUPS).join(', ')}`);
  process.exit(2);
}
if ((group === 'sql' || group === 'all') && !process.env.CF_TEST_PG) {
  // The SQL suites skip themselves without it, and a skip reads as a pass.
  console.error('the sql group needs CF_TEST_PG=1 and PG* set; see README "Making a change"');
  process.exit(2);
}

const failed = [];
const t0 = Date.now();
for (const s of GROUPS[group]) {
  const t = Date.now();
  const r = spawnSync(s.cmd, s.args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  const ok = r.status === 0;
  const secs = ((Date.now() - t) / 1000).toFixed(0).padStart(4);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${secs}s  ${s.name}  ${ok ? out.split('\n').filter(Boolean).pop() || '' : ''}`.trimEnd());
  if (!ok) {
    failed.push(s.name);
    console.log(out.split('\n').map((l) => '       ' + l).join('\n'));
  }
}
const mins = ((Date.now() - t0) / 60000).toFixed(1);
console.log(`\n${group}: ${GROUPS[group].length - failed.length}/${GROUPS[group].length} suites passed in ${mins} min`
  + (failed.length ? ` — failed: ${failed.join(', ')}` : ''));
process.exit(failed.length ? 1 : 0);
