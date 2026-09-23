// The vendored libraries are checked in, minified, and shipped inline in every
// page load — and nothing reviewed a change to them, because a diff of a
// minified bundle is unreadable. src/vendor/SHA256SUMS pins each file; this
// fails if one no longer matches, so replacing a bundle has to be a deliberate
// act (regenerate it by the recipe in the README, then update the sums in the
// same commit) rather than something that slips through inside a larger diff.
//
//   node tests/vendor-hashes.mjs
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'vendor');
const pinned = Object.fromEntries(readFileSync(join(DIR, 'SHA256SUMS'), 'utf8').trim().split('\n')
  .map((l) => l.trim().split(/\s+/)).map(([h, f]) => [f, h]));
// The third-party bundles. mini-recharts.js is written in this repository and
// reviewed like any other source file, so it is deliberately not pinned.
const PACKAGED = ['react-bundle.js', 'supabase-client.js'];
const files = readdirSync(DIR).filter((f) => f.endsWith('.js'));
const problems = [];
for (const f of PACKAGED) if (!pinned[f]) problems.push(`${f} is not listed in SHA256SUMS`);
for (const f of Object.keys(pinned)) {
  if (!files.includes(f)) { problems.push(`SHA256SUMS lists ${f}, which is not there`); continue; }
  const got = createHash('sha256').update(readFileSync(join(DIR, f))).digest('hex');
  if (pinned[f] !== got) problems.push(`${f} has changed (pinned ${pinned[f].slice(0, 12)}…, now ${got.slice(0, 12)}…)`);
}
if (problems.length) {
  console.error('FAIL vendor-hashes:\n  ' + problems.join('\n  ')
    + '\n  If the change is intended: cd src/vendor && sha256sum react-bundle.js supabase-client.js > SHA256SUMS, and update the README table.');
  process.exit(1);
}
console.log(`PASS vendor-hashes: the ${Object.keys(pinned).length} packaged vendor bundles match their pinned SHA-256`);
