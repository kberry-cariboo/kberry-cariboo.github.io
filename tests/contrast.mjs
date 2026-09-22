// Text you can actually read, in both themes.
//
// This exists because of a bug that was invisible for as long as it existed.
// 54 rules said `color:#fff`, which is correct on the app's navy chrome and on
// its primary green, and wrong on two surfaces that dark mode makes *lighter*:
// --red becomes #E07767 there and --greenDk becomes #4FB183, so that a negative
// amount and a paid marker stay legible as text on a dark page. Put white on
// top of them and you get 3.0:1 and 2.6:1 against a 4.5:1 floor.
//
// Nothing caught it. The palette test checks the two declarations of the
// palette agree with each other, not that any pairing of them can be read. The
// layout sweep checks nothing overflows. A screenshot of a dark page shows a
// red button with white text on it, which is what it is supposed to look like.
//
// So this reads the stylesheet, finds every rule that sets a background and a
// colour from the palette, resolves both in each theme and does the arithmetic.
//
//   node tests/contrast.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

// ── The palette, per theme ───────────────────────────────────────────────────
const blockAt = (src, i) => {
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(i, j);
  }
  throw new Error('unterminated block');
};
const tokensIn = (selector) => {
  const out = {};
  const printAt = css.indexOf('@media print{');
  const scope = printAt < 0 ? css : css.slice(0, printAt);
  for (let from = 0; ;) {
    const i = scope.indexOf(selector + '{', from);
    if (i < 0) break;
    for (const m of blockAt(scope, i).matchAll(/--([A-Za-z][\w-]*)\s*:\s*([^;]+);/g)) {
      out[m[1]] = m[2].trim();
    }
    from = i + selector.length;
  }
  return out;
};
const LIGHT = tokensIn(':root');
const DARK = { ...LIGHT, ...tokensIn(':root[data-theme="dark"]') };

// Resolve a value to a hex, following var() chains. Anything that is not a
// flat colour — a gradient, a color-mix, a translucent rgba — is skipped
// rather than guessed at: this test reports only what it is sure of.
function resolve(value, palette, depth = 0) {
  if (!value || depth > 6) return null;
  const v = value.trim();
  const m = v.match(/^var\(\s*--([\w-]+)\s*\)$/);
  if (m) return resolve(palette[m[1]], palette, depth + 1);
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return '#' + v.slice(1).split('').map((c) => c + c).join('').toUpperCase();
  }
  return null;
}

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// ── Every rule that paints text on a background of its own ───────────────────
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const body = noComments.slice(0, noComments.indexOf('@media print{') >= 0
  ? noComments.indexOf('@media print{') : undefined);

const pairs = [];
for (const m of body.matchAll(/([^{}]*)\{([^{}]+)\}/g)) {
  const sel = m[1].replace(/\s+/g, ' ').trim().replace(/^[}{]+/, '').trim();
  if (!sel || sel.startsWith('@') || sel.startsWith(':root')) continue;
  const decls = m[2];
  const bg = decls.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/);
  const fg = decls.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
  if (!bg || !fg) continue;
  pairs.push({ sel, bg: bg[1].trim(), fg: fg[1].trim() });
}

check('the stylesheet has background/colour pairs to check',
  pairs.length >= 10, `found ${pairs.length}`);

// 4.5:1 is the AA floor for body text. Large text is allowed 3:1, but the
// pairings here are buttons, chips and table headers — small, bold, and read
// at a glance, which is the case the floor exists for.
const FLOOR = 4.5;
const failures = [];
let checked = 0;
for (const { sel, bg, fg } of pairs) {
  for (const [theme, palette] of [['light', LIGHT], ['dark', DARK]]) {
    const b = resolve(bg, palette);
    const f = resolve(fg, palette);
    if (!b || !f) continue;
    checked++;
    const r = ratio(b, f);
    if (r < FLOOR) {
      failures.push(`${sel} in ${theme}: ${f} on ${b} is ${r.toFixed(2)}:1`);
    }
  }
}

check('there are resolvable pairs in both themes', checked >= 20, `resolved ${checked}`);
check(`every resolvable text/background pair clears ${FLOOR}:1 in both themes`,
  failures.length === 0,
  failures.join('\n     ') + `\n     (${checked} pairs resolved and measured)`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`
  + `  — ${checked} colour pairs measured across both themes`);
process.exit(failed ? 1 : 0);
