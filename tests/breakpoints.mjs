// One ladder of widths, and nothing off it.
//
// The stylesheet had ten: 360, 480, 560, 640, 768, 769, 900, 1000, 1200 and
// 1400. Some of those are real — a phone, the tablet boundary, a wide desktop
// — and some were whatever the width happened to be on the day a component
// stopped fitting. There was no principled reason the net-worth parts went
// single-column at 640 while the scenario rows wrapped at 560; both are the
// same instruction ("stack this when it is narrow") at two arbitrary widths.
//
// The cost is not tidiness. It is that a reader at 600px crosses three
// different "narrow" thresholds on the way down, and a contributor adding a
// rule has no way to know which of the ten to use.
//
// So the ladder below is the whole set, each step with a reason, and this
// fails if the stylesheet uses a width that is not on it. Media queries cannot
// read a custom property — there is no var() in a media condition — so the
// names cannot live in the CSS itself. This is the next best thing: the names
// live here, and drift is impossible rather than merely discouraged.
//
//   node tests/breakpoints.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');

// The ladder. `max` is the width the step applies at and below; `min` is the
// complement, used by the handful of rules that are easier to state upwards.
export const BREAKPOINTS = [
  { name: 'xs', max: 360, why: 'the narrowest screen still sold' },
  { name: 'sm', max: 480, why: 'an ordinary phone held upright' },
  { name: 'md', max: 640, why: 'where a two-column row stops fitting side by side' },
  { name: 'lg', max: 768, min: 769, why: 'the phone/desktop boundary — the one useIsMobile() reads' },
  { name: 'xl', min: 1000, why: 'enough width for a table to stop being a list' },
  { name: '2xl', min: 1200, why: 'two panels side by side' },
  { name: '3xl', min: 1400, why: 'a wider gutter rather than a wider measure' },
];

const allowedMax = new Set(BREAKPOINTS.filter((b) => b.max).map((b) => b.max));
const allowedMin = new Set(BREAKPOINTS.filter((b) => b.min).map((b) => b.min));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

// Every @media condition in the file, with the line it sits on so a failure
// says where to look rather than what to grep for.
const conditions = [];
{
  const lines = css.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/@media([^{]*)\{/g)) {
      conditions.push({ cond: m[1].trim(), line: i + 1 });
    }
  });
}
check('the stylesheet has media queries to check at all', conditions.length > 10,
  `found ${conditions.length}`);

// ── Every width used is on the ladder ────────────────────────────────────────
{
  const strays = [];
  for (const { cond, line } of conditions) {
    for (const m of cond.matchAll(/\((max|min)-width\s*:\s*(\d+)px\)/g)) {
      const kind = m[1], px = Number(m[2]);
      const ok = kind === 'max' ? allowedMax.has(px) : allowedMin.has(px);
      if (!ok) strays.push(`line ${line}: ${kind}-width:${px}px`);
    }
  }
  check('every media width is a step on the ladder', strays.length === 0,
    strays.join('\n     ') + '\n     ladder: '
      + BREAKPOINTS.map((b) => `${b.name}=${b.max ? 'max ' + b.max : ''}${b.min ? 'min ' + b.min : ''}`).join(', '));
}

// ── And every step on the ladder is actually used ────────────────────────────
// A ladder with aspirational rungs is a list of widths somebody once meant to
// use. If a step stops earning its place it should come off the ladder, not
// sit here being documented.
{
  const used = new Set();
  for (const { cond } of conditions) {
    for (const m of cond.matchAll(/\((max|min)-width\s*:\s*(\d+)px\)/g)) {
      used.add(`${m[1]}:${m[2]}`);
    }
  }
  const dead = BREAKPOINTS.filter((b) => {
    const hasMax = b.max && used.has(`max:${b.max}`);
    const hasMin = b.min && used.has(`min:${b.min}`);
    return !hasMax && !hasMin;
  }).map((b) => b.name);
  check('every step on the ladder is used by at least one rule', dead.length === 0,
    'declared but never used: ' + dead.join(', '));
}

// ── The height and capability queries are left alone on purpose ──────────────
// A short viewport is a phone in landscape, and pointer/hover/reduced-motion
// are about the input device, not the layout. They are not widths and do not
// belong on a width ladder; this asserts they still exist so that a later
// tidy-up does not fold them in.
{
  const others = conditions.filter(({ cond }) =>
    /max-height|pointer:|hover:|prefers-|print/.test(cond));
  check('device and preference queries are still separate from the width ladder',
    others.length > 5, `found ${others.length}`);
}

// ── The ladder is written down where a contributor will look ─────────────────
{
  check('styles.css points at this file for the ladder',
    /tests\/breakpoints\.mjs/.test(css),
    'the stylesheet should name this file where the breakpoints are introduced');
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
