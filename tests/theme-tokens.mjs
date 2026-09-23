// Two declarations of one palette, which have to agree.
//
// The colours live in src/styles.css now: :root carries the light set, and
// :root[data-theme="dark"] carries the dark one. That is what the app paints
// with, and moving it there is what let the print rules override a token by
// ordinary cascade instead of !important on every line.
//
// src/lib/app-data.ts still holds LIGHT and DARK as plain objects, for the one
// job CSS cannot do: chipDot() computes a readable ink for a category chip
// against the surface behind it, and readableInk() needs a real colour, not a
// var() it cannot resolve. So the mirror stays, and this is the join.
//
// It exists because the failure is silent. A token edited in the stylesheet
// and not in the mirror does not throw, does not look wrong on the page, and
// shows up only as a category dot whose contrast was computed against a
// surface that has not existed since the edit.
//
// Deliberately needs no browser: it reads both files as text.
//
//   node tests/theme-tokens.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

// ── The JavaScript mirror ────────────────────────────────────────────────────
// Both are plain object literals of string values, closed by a brace at the
// declaration's own indentation.
const appData = read('src/lib/app-data.ts');
const jsPalette = (name) => {
  const i = appData.indexOf(`const ${name} = {`);
  if (i < 0) throw new Error(`${name} not found in app-data.js — has it been renamed?`);
  const open = appData.indexOf('{', i);
  const end = appData.indexOf('\n  };', open);
  if (end < 0) throw new Error(`${name} does not close where expected`);
  return new Function('return ' + appData.slice(open, end + 4))();
};
const LIGHT = jsPalette('LIGHT');
const DARK = jsPalette('DARK');

// ── The stylesheet ───────────────────────────────────────────────────────────
const css = read('src/styles.css');
// Slice a selector's own block, not the first closing brace after it — a
// nested @media would end it early and the test would silently read half a
// palette.
const blockAt = (src, i) => {
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(i, j);
  }
  throw new Error('unterminated block at ' + i);
};
// Every block for this selector, unioned. A selector legitimately appears more
// than once — :root carries the fonts near the top and the palette below it —
// and reading only the first one would have reported the whole palette missing
// while the stylesheet was perfectly correct. Which is what it did.
const tokensIn = (selector) => {
  const out = {};
  // Print deliberately redeclares the palette; that is an override, not a
  // declaration of what the app paints with.
  const printAt = css.indexOf('@media print{');
  const scope = printAt < 0 ? css : css.slice(0, printAt);
  let from = 0, found = 0;
  for (;;) {
    const i = scope.indexOf(selector + '{', from);
    if (i < 0) break;
    found++;
    for (const m of blockAt(scope, i).matchAll(/--([A-Za-z][\w-]*)\s*:\s*([^;]+);/g)) {
      out[m[1]] = m[2].trim();
    }
    from = i + selector.length;
  }
  if (!found) throw new Error(`no ${selector} block in styles.css`);
  return out;
};
// The light set sits alongside the font and gutter variables in :root, so only
// the keys the palette declares are compared.
const cssLight = tokensIn(':root');
const cssDark = tokensIn(':root[data-theme="dark"]');

check('both palettes are readable from their files',
  Object.keys(LIGHT).length > 0 && Object.keys(cssLight).length > 0 && Object.keys(cssDark).length > 0,
  JSON.stringify({ js: Object.keys(LIGHT).length, cssLight: Object.keys(cssLight).length, cssDark: Object.keys(cssDark).length }));

// ── Light ────────────────────────────────────────────────────────────────────
{
  const missing = Object.keys(LIGHT).filter((k) => cssLight[k] === undefined);
  check('every light token in the mirror is declared in :root',
    missing.length === 0, 'missing from styles.css: ' + missing.join(', '));
  const differs = Object.keys(LIGHT)
    .filter((k) => cssLight[k] !== undefined && cssLight[k] !== LIGHT[k])
    .map((k) => `--${k}: css ${cssLight[k]} vs js ${LIGHT[k]}`);
  check('every light token has the same value in both',
    differs.length === 0, differs.join('\n     '));
}

// ── Dark ─────────────────────────────────────────────────────────────────────
{
  // A token identical in both themes is declared once, in :root, and inherited
  // — repeating it under [data-theme="dark"] would be noise. So the dark block
  // is expected to carry exactly the keys whose value actually changes.
  const shouldDiffer = Object.keys(DARK).filter((k) => DARK[k] !== LIGHT[k]);
  const sameInBoth = Object.keys(DARK).filter((k) => DARK[k] === LIGHT[k]);

  const missing = shouldDiffer.filter((k) => cssDark[k] === undefined);
  check('every dark token that differs from light is declared under [data-theme="dark"]',
    missing.length === 0, 'missing: ' + missing.join(', '));

  const differs = shouldDiffer
    .filter((k) => cssDark[k] !== undefined && cssDark[k] !== DARK[k])
    .map((k) => `--${k}: css ${cssDark[k]} vs js ${DARK[k]}`);
  check('every dark token has the same value in both',
    differs.length === 0, differs.join('\n     '));

  const redundant = sameInBoth.filter((k) => cssDark[k] !== undefined);
  check('a token the two themes share is not repeated in the dark block',
    redundant.length === 0, 'repeated needlessly: ' + redundant.join(', '));
}

// ── The two dark palettes have to be the same palette ────────────────────────
// Dark is declared twice: once under :root[data-theme="dark"] for a reader who
// chose it, and once under :root:not([data-theme]) inside a
// prefers-color-scheme query for a reader who did not. The second is the one
// most people actually get, and until now nothing read it — the checks above
// look at :root and the explicit dark block only. A token could drift there
// and every test would still pass.
//
// It is not hypothetical. Tokenising the app's literal colours rewrote
// --shadowSm in the system-preference block and not in the explicit one; the
// value was identical so nothing looked wrong, and nothing was watching.
{
  const auto = tokensIn(':root:not([data-theme])');
  check('the system-preference dark block is readable', Object.keys(auto).length > 0,
    'no :root:not([data-theme]) block found — has the prefers-color-scheme query moved?');
  const differ = Object.keys({ ...auto, ...cssDark })
    .filter((k) => auto[k] !== cssDark[k])
    .map((k) => `--${k}: prefers-color-scheme "${auto[k]}" vs [data-theme=dark] "${cssDark[k]}"`);
  check('both declarations of the dark palette say the same thing',
    differ.length === 0, differ.join('\n     '));
}

// ── Neither side has tokens the other has never heard of ─────────────────────
{
  const strays = Object.keys(cssDark).filter((k) => DARK[k] === undefined);
  check('the dark block declares nothing the mirror does not know about',
    strays.length === 0, 'in css only: ' + strays.join(', '));
}

// ── The print override ───────────────────────────────────────────────────────
{
  // A stored dark preference sets [data-theme="dark"], which outranks a bare
  // :root. If the print rules forget that selector the tokens quietly keep
  // their dark values and the page prints white on near-black.
  const printAt = css.indexOf('@media print{');
  const printCss = printAt < 0 ? '' : css.slice(printAt);
  check('the print rules override the dark selector, not just :root',
    /:root\s*,\s*:root\[data-theme="dark"\]\s*\{/.test(printCss),
    'the print block must match [data-theme="dark"] or a dark session prints dark');
  // The reason this file exists at all: those rules needed !important on every
  // token while the live values were inline styles on <html>.
  const printTokens = printCss.slice(0, printCss.indexOf('}'));
  check('the print tokens no longer need !important',
    !printTokens.includes('!important'), printTokens.slice(0, 200));
}

// ── The boot splash ──────────────────────────────────────────────────────────
{
  // The splash paints before React exists, so its colours used to be written
  // into the shell by hand. body kept that hardcoded value for the whole
  // session — .app-scroll paints over it, so what was left showing was the
  // overscroll band, deep pine under a cream page and a lighter green under a
  // near-black one. Both wrong, and neither visible without pulling the page.
  const shell = read('index.template.html');
  const bootStyle = shell.slice(shell.indexOf('<style>'), shell.indexOf('</style>'));
  const hexes = [...bootStyle.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  check('the boot styles name no colour of their own',
    hexes.length === 0,
    'hardcoded in the shell, so it cannot follow the theme: ' + hexes.join(', '));
  check('the splash and the page take their colours from the tokens',
    /#boot\{[^}]*background:var\(--headerBg\)/s.test(bootStyle)
      && /body\{[^}]*background:var\(--bg\)/.test(bootStyle),
    bootStyle.slice(0, 260));
}

// ── Every token resolves to something ────────────────────────────────────────
// A custom property that refers to itself — directly (`--a:var(--a)`) or round
// a loop (`--a:var(--b)`, `--b:var(--a)`) — is invalid at computed-value time,
// and so is var() of a name nothing declares. Neither throws: every rule that
// reads one quietly falls back to inherited ink. That is how the six
// --on-dark-* tokens shipped as `--on-dark-30:var(--on-dark-30)` and painted the
// footer, the sign-in tagline and the header search near-black on dark green,
// while every check above passed — they compare values as text and never ask
// whether a value leads anywhere.
{
  const sheets = css + '\n' + read('index.template.html');
  const refsOf = (v) => [...v.matchAll(/var\(\s*--([A-Za-z][\w-]*)/g)].map((m) => m[1]);
  // Every declaration of every name, from every block: a name's references
  // are the union across themes and media queries, since any of them can be
  // the one that applies.
  const graph = new Map();
  for (const m of sheets.matchAll(/(?:^|[{;\s])--([A-Za-z][\w-]*)\s*:\s*([^;}]+)/g)) {
    if (!graph.has(m[1])) graph.set(m[1], new Set());
    refsOf(m[2]).forEach((r) => graph.get(m[1]).add(r));
  }
  check('the stylesheets declare custom properties at all', graph.size > 50, 'found ' + graph.size);

  const cycles = [];
  const state = new Map(); // 1 = on the current path, 2 = finished
  const visit = (n, path) => {
    if (state.get(n) === 2 || !graph.has(n)) return;
    if (state.get(n) === 1) {
      cycles.push(path.slice(path.indexOf(n)).concat(n).map((x) => '--' + x).join(' → '));
      return;
    }
    state.set(n, 1);
    for (const r of graph.get(n)) visit(r, path.concat(n));
    state.set(n, 2);
  };
  for (const n of graph.keys()) visit(n, []);
  check('no custom property refers to itself, directly or round a loop',
    cycles.length === 0, cycles.join('\n     '));

  // var(--x, fallback) is allowed to name something undeclared — that is what
  // the fallback is for — so only references without one are held to this.
  const undeclared = new Set();
  for (const m of sheets.matchAll(/var\(\s*--([A-Za-z][\w-]*)\s*\)/g)) {
    if (!graph.has(m[1])) undeclared.add('--' + m[1]);
  }
  check('every var() without a fallback names a declared custom property',
    undeclared.size === 0, [...undeclared].join(', '));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
