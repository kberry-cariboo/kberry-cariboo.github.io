// Motion that stops when the reader asks it to.
//
// The app honours `prefers-reduced-motion` in one place: a blanket rule that
// clamps every animation-duration and transition-duration to ~0. That covers
// all CSS-driven motion, which is nearly all of it — and it is why six
// components that each carried a `transition:none` opt-out of their own were
// carrying dead weight.
//
// The blanket has exactly two blind spots, and both of them had a live bug in
// them when this file was written:
//
//   * An inline style outranks it. A goal's progress bar set
//     `transition:"width 0.3s ease"` in React props, so it animated for a
//     reader who had asked the whole system not to — and, being a raw 0.3s,
//     it was also the one duration in the app outside the token set.
//   * A native smooth scroll is not a CSS animation, so nothing in the
//     stylesheet can reach it. Those call sites check the media query
//     themselves.
//
// Neither is visible in a screenshot and neither breaks a layout, so nothing
// else here would catch them coming back.
//
//   node tests/motion.mjs
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const cssBody = stripComments(css);

// ── The blanket ──────────────────────────────────────────────────────────────
const queries = [...cssBody.matchAll(/@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g)]
  .map((m) => cssBody.slice(m.index, cssBody.indexOf('}', m.index + m[0].length) + 1));

check('there is exactly one prefers-reduced-motion rule in the stylesheet',
  queries.length === 1,
  `found ${queries.length}:\n     ` + queries.join('\n     ')
  + '\n     A per-component opt-out is dead next to the blanket, and a list of'
  + '\n     named selectors invites the next component to be left off it.');

const blanket = queries[0] || '';
check('it applies to every element, not to a named selector',
  /\{\s*\*\s*,\s*\*::before\s*,\s*\*::after\s*\{/.test(blanket),
  blanket);
check('it clamps animation and transition duration to the instant token',
  /animation-duration\s*:\s*var\(--dur-instant\)/.test(blanket)
  && /transition-duration\s*:\s*var\(--dur-instant\)/.test(blanket),
  blanket);

// The blanket is a `*` selector inside a media query, so anything in a later
// cascade layer beats it. Only `app`, `overrides` and `responsive` may hold
// motion; the layers above them are for rules that have to win.
const LATE_LAYERS = ['late', 'utilities', 'layout'];
const lateMotion = [];
for (const layer of LATE_LAYERS) {
  const at = cssBody.indexOf(`@layer ${layer} {`);
  if (at < 0) continue;
  let depth = 0;
  let end = at;
  for (let i = cssBody.indexOf('{', at); i < cssBody.length; i++) {
    if (cssBody[i] === '{') depth++;
    else if (cssBody[i] === '}' && --depth === 0) { end = i; break; }
  }
  const block = cssBody.slice(at, end);
  for (const m of block.matchAll(/(?:^|[;{])\s*(transition|animation)[\w-]*\s*:/g)) {
    lateMotion.push(`${layer}: ${block.slice(Math.max(0, m.index - 60), m.index + 40).trim()}`);
  }
}
check('no layer above `responsive` declares motion the blanket could not undo',
  lateMotion.length === 0, lateMotion.join('\n     '));

// ── Durations come from the token set ────────────────────────────────────────
const rawDurations = [...cssBody.matchAll(/(?:^|[;{])\s*((?:transition|animation)[\w-]*\s*:[^;{}]+)/g)]
  .map((m) => m[1].trim())
  .filter((d) => /[0-9](?:\.[0-9]+)?m?s(?![\w-])/.test(d.replace(/var\(--[\w-]+\)/g, '')));
check('every duration in the stylesheet comes from a --dur token',
  rawDurations.length === 0,
  rawDurations.join('\n     ')
  + '\n     A literal duration is a number nobody can retime from one place.');

// ── The blind spots ──────────────────────────────────────────────────────────
const jsFiles = [];
const walk = (dir) => {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    // src/vendor holds minified third-party bundles — React and the Supabase
    // client. They are not ours to restyle, and a minified file is one long
    // line in which almost any pattern eventually appears: widening the
    // inline-motion check to accept an expression made React's bundle match
    // it on the first try.
    if (e.isDirectory()) { if (e.name !== 'vendor') walk(join(dir, e.name)); }
    else if (e.name.endsWith('.js')) jsFiles.push(join(dir, e.name));
  }
};
walk('src');

const inlineMotion = [];
const unguardedScroll = [];
for (const rel of jsFiles) {
  const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'))
    .split('\n').map((l) => l.replace(/\/\/.*$/, ''));
  src.forEach((line, i) => {
    // `transition:` / `animation:` as an object key — a React style prop.
    // The value may be any expression, not just a quoted literal. The first
    // version of this required a quote after the colon and so walked straight
    // past `animation: pullActive ? "spin 0.8s linear infinite" : "none"` —
    // an inline animation with a raw duration, which is the exact pair of
    // defects this file was written for.
    if (/(?:^|[{,\s])(transition|animation)(?:Duration|Delay|Property|Name|Timing[\w]*)?\s*:\s*\S/.test(line)
        && !/^\s*(transition|animation)[\w-]*\s*:/.test(line)) {
      inlineMotion.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
    }
    if (/["']smooth["']/.test(line) && !/prefersReducedMotion\s*\(\s*\)/.test(line)) {
      unguardedScroll.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
    }
  });
}

check('no component sets transition or animation in an inline style',
  inlineMotion.length === 0,
  inlineMotion.join('\n     ')
  + '\n     An inline style outranks the blanket, so this animates for a reader'
  + '\n     who asked it not to. Put it in the stylesheet on a --dur token.');

check('every smooth scroll asks prefers-reduced-motion first',
  unguardedScroll.length === 0,
  unguardedScroll.join('\n     ')
  + '\n     A native smooth scroll is not a CSS animation; the blanket cannot'
  + '\n     see it, so the call site has to.');

// A guard that is never called is not a guard. This is the function those call
// sites use; if it is renamed or dropped, the check above passes vacuously.
const appData = readFileSync(join(ROOT, 'src/lib/app-data.js'), 'utf8');
check('the reduced-motion guard reads the media query it claims to',
  /function prefersReducedMotion\(\)[\s\S]{0,300}matchMedia\([^)]*prefers-reduced-motion:\s*reduce/.test(appData),
  'src/lib/app-data.js no longer defines prefersReducedMotion() over matchMedia');

const smoothSites = jsFiles.reduce((n, rel) =>
  n + (stripComments(readFileSync(join(ROOT, rel), 'utf8')).match(/["']smooth["']/g) || []).length, 0);
check('there are smooth-scroll call sites to guard', smoothSites >= 5,
  `found ${smoothSites}`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`
  + `  — 1 blanket rule, ${smoothSites} guarded scroll sites, ${jsFiles.length} source files read`);
process.exit(failed ? 1 : 0);
