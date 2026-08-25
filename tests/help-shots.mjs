// Do the Help page, the images folder and the size manifest still agree?
//
// The screenshots are committed rather than generated at build time, which is
// the right trade — `node build.js` stays dependency-free and a shot only
// changes when the UI in it changes — but it means three things can drift
// apart: what src/components/help.js asks for, what is actually in
// images/help/, and the dimensions src/lib/help-shots.js reserves space with.
// Every one of those drifts fails quietly. A renamed shot is a broken image on
// a documentation page nobody is looking at while they're happy; a stale
// dimension is a page that jumps as the reader scrolls.
//
// Fix any failure here by re-running the generator:
//
//   node build.js && node scripts/gen-help-shots.mjs
//
// Runs anywhere — no browser, no database:  node tests/help-shots.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

const help = readFileSync(join(ROOT, 'src/components/help.js'), 'utf8');
const manifestSrc = readFileSync(join(ROOT, 'src/lib/help-shots.js'), 'utf8');
const dir = join(ROOT, 'images', 'help');

// Referenced by the Help page: { shot: ["name", "caption"] }
const referenced = [...help.matchAll(/\{\s*shot:\s*\[\s*"([^"]+)"\s*,\s*"([^"]*)"/g)]
  .map((m) => ({ name: m[1], caption: m[2] }));
const onDisk = existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''))
  : [];
const manifest = JSON.parse(manifestSrc.slice(manifestSrc.indexOf('{'), manifestSrc.lastIndexOf('}') + 1));

check('the Help page references at least one screenshot', referenced.length > 0, 'no { shot: [...] } blocks found');

const missing = referenced.filter((r) => !onDisk.includes(r.name)).map((r) => r.name);
check('every screenshot the Help page names exists', missing.length === 0,
  'images/help/ has no file for: ' + missing.join(', '));

const orphans = onDisk.filter((f) => !referenced.some((r) => r.name === f));
check('no screenshot in images/help/ is unused', orphans.length === 0,
  'nothing references: ' + orphans.join(', ') + ' — delete them, or add them to the Help page');

const unmeasured = referenced.filter((r) => !manifest[r.name]).map((r) => r.name);
check('every screenshot has its size in the manifest', unmeasured.length === 0,
  'src/lib/help-shots.js is missing: ' + unmeasured.join(', '));

const stale = Object.keys(manifest).filter((k) => !referenced.some((r) => r.name === k));
check('the manifest lists nothing that is gone', stale.length === 0, 'left over: ' + stale.join(', '));

const badSize = Object.entries(manifest)
  .filter(([, v]) => !(v && Number.isFinite(v.w) && Number.isFinite(v.h) && v.w > 0 && v.h > 0))
  .map(([k]) => k);
check('every manifest entry has a real width and height', badSize.length === 0, badSize.join(', '));

// The captions are the accessible description — the img itself is decorative,
// so an empty caption leaves the picture with no text alternative at all.
const captionless = referenced.filter((r) => r.caption.trim().length < 10).map((r) => r.name);
check('every screenshot has a caption worth reading', captionless.length === 0,
  'too short or empty: ' + captionless.join(', '));

// A screenshot heavy enough to be worth noticing on a phone connection. These
// are lazily loaded and runtime-cached by the service worker, so this is a
// nudge rather than a hard budget — crop the shot (maxHeight in the generator)
// rather than shipping a full year of table rows.
const heavy = onDisk
  .map((n) => ({ n, kb: statSync(join(dir, n + '.png')).size / 1024 }))
  .filter((f) => f.kb > 150);
check('no single screenshot is over 150 KB', heavy.length === 0,
  heavy.map((f) => `${f.n} is ${f.kb.toFixed(0)} KB`).join(', '));

const totalKb = onDisk.reduce((n, f) => n + statSync(join(dir, f + '.png')).size, 0) / 1024;
check('the whole set stays under 1 MB', totalKb < 1024, `${totalKb.toFixed(0)} KB across ${onDisk.length} files`);

console.log(`\n${referenced.length} screenshots, ${totalKb.toFixed(0)} KB total`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
