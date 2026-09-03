// CashFlow Budget — layout sweep.
//
// Usage:  node tests/layout-sweep.mjs
// Needs:  the same Playwright + chromium tests/regression.mjs needs, and a
//         built index.html (run `node build.js` first).
//
// The named suite next door asserts specific things about specific screens: it
// goes where a test author thought to send it. This one goes everywhere and
// asserts the handful of things that must hold on *every* screen at *every*
// width — no sideways scroll, nothing off the edge, nothing clipped, every
// touch target big enough, no two visible controls answering to the same name,
// no errors in the console.
//
// It exists because that is how the Alerts centre shipped 32px tap targets.
// The touch-target test only ran at 393px, where the finding's sentence wraps
// onto a second line and the button clears 44px by accident; rotate the phone
// and it doesn't. Nothing was wrong with that test — it was just never sent to
// #/alerts, and never at a width where the defect shows. A sweep does not
// depend on anyone thinking to send it.
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import { FIXTURE_YEAR, mkStub } from './household-fixture.mjs';

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_LIB, 'playwright'];
  try { candidates.push(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')); } catch {}
  for (const c of candidates.filter(Boolean)) {
    try { return await import(c); } catch {}
  }
  throw new Error('playwright not found — npm i -D playwright, or set PLAYWRIGHT_LIB');
}
const { chromium } = await loadPlaywright();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8750; // one above the regression suite's, so the two can run at once
const server = createServer((req, res) => {
  try {
    const path = req.url.split('?')[0].split('#')[0];
    const file = path === '/' || path === '/index.html' ? 'index.html' : path.slice(1);
    const body = readFileSync(join(ROOT, file));
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript'
      : file.endsWith('.json') ? 'application/json' : file.endsWith('.woff2') ? 'font/woff2'
      : file.endsWith('.png') ? 'image/png' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + PORT + '/index.html';

// Pinned, like the regression suite's fixture clock, so a sweep is the same
// sweep tomorrow. CF_FAKE_TODAY moves it, for walking the fixture year.
const FAKE_TODAY = new Date(process.env.CF_FAKE_TODAY
  ? (process.env.CF_FAKE_TODAY.includes('T') ? process.env.CF_FAKE_TODAY : process.env.CF_FAKE_TODAY + 'T12:00:00')
  : '2026-09-03T12:00:00');
if (isNaN(FAKE_TODAY)) throw new Error('CF_FAKE_TODAY is not a date: ' + process.env.CF_FAKE_TODAY);
// Same guard the regression suite carries, for the same reason: outside the
// fixture's budget year every screen is empty, and a sweep over thirty empty
// screens reports nothing because there is nothing on them to be wrong.
if (FAKE_TODAY.getFullYear() !== FIXTURE_YEAR) {
  console.error(`\nThe fixture household is a ${FIXTURE_YEAR} one, and this sweep is dated `
    + `${FAKE_TODAY.toDateString()}. Every screen would be empty, so a clean sweep would mean nothing.\n\n`
    + `Roll the household forward: FIXTURE_YEAR in tests/household-fixture.mjs.\n`);
  process.exit(1);
}

// Every destination the app publishes, including the seventeen Settings pages
// — each of those is a route precisely so it can be linked to and gone back
// from, which makes each of them a screen that can be wrong on its own.
const ROUTES = [
  'today', 'flow/list', 'flow/calendar', 'flow/curve', 'flow/entries', 'envelopes',
  'plan/goals', 'plan/strategy', 'plan/debt', 'plan/insights',
  'alerts', 'help', 'you',
  'you/accounts', 'you/years', 'you/categories', 'you/money', 'you/holidays',
  'you/appearance', 'you/threshold', 'you/notifications', 'you/household',
  'you/backup', 'you/sync', 'you/templates', 'you/activity', 'you/ai', 'you/security',
  'you/danger', 'you/reset',
];

// Widths chosen for what changes at them rather than for which phones exist:
// 320 is the narrowest screen still sold, 393 an ordinary phone, 740x360 that
// same phone rotated (which the app treats as a phone by height), 768 the
// breakpoint itself — a touch device on the *wide* side of it, which is where
// a control carrying a sentence stops wrapping — and 1440 a desktop. Dark mode
// re-runs the two most-used widths: it is a different palette, not a different
// layout, so it needs coverage rather than a second full sweep.
const PASSES = [
  { name: '320×568 phone', width: 320, height: 568, touch: true },
  { name: '393×852 phone', width: 393, height: 852, touch: true },
  { name: '740×360 phone rotated', width: 740, height: 360, touch: true },
  { name: '768×1024 tablet', width: 768, height: 1024, touch: true },
  { name: '1440×900 desktop', width: 1440, height: 900, touch: false },
  { name: '393×852 phone, dark', width: 393, height: 852, touch: true, dark: true },
  { name: '1440×900 desktop, dark', width: 1440, height: 900, touch: false, dark: true },
];

// Everything measured in one pass over the rendered page, because a second
// pass is a second chance for the layout to have settled differently.
const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { docOverflow: null, overflowers: [], offLeft: [], clipped: [], smallTargets: [], dupes: [] };

  // Two things are off-screen or clipped on purpose and always will be: the
  // skip link parks at -9999px until it is focused, and a view's heading is a
  // 1px box that exists for screen readers.
  const byDesign = (el) => el.classList.contains('skip-link')
    || el.classList.contains('cf-visually-hidden')
    || el.closest('.cf-visually-hidden') != null;

  const desc = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 36);
    return el.tagName.toLowerCase() + id + cls + (txt ? ' «' + txt + '»' : '');
  };

  // A wide table inside an overflow-x container is not an overflow — it is a
  // table you scroll. Only something with no scroller between it and the page
  // is actually hanging off the edge.
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowX + ' ' + s.overflow)) return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    if (byDesign(el)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Leaves only: a parent that overflows does so because a child does, and
    // reporting both buries the one you can act on.
    const leaf = el.children.length === 0;
    if (leaf && r.right > vw + 1 && !inScroller(el)) out.overflowers.push(desc(el) + ' right=' + Math.round(r.right) + ' vw=' + vw);
    if (leaf && r.left < -1 && !inScroller(el)) out.offLeft.push(desc(el) + ' left=' + Math.round(r.left));
    if (leaf && (el.textContent || '').trim() && s.overflow !== 'visible'
      && s.textOverflow !== 'ellipsis' && !/(auto|scroll)/.test(s.overflowX)
      && el.scrollWidth > el.clientWidth + 2) {
      out.clipped.push(desc(el) + ' ' + el.scrollWidth + '>' + el.clientWidth);
    }
  }

  // A tap target is the border box grown by any absolutely-positioned
  // pseudo-element hanging outside it — the padded-halo pattern the app uses
  // to keep a control visually small without shrinking its hit area. Same
  // measurement the regression suite's touch-target test makes; it is here
  // too because that one visits eight screens and this one visits thirty.
  const halo = (el) => {
    let dx = 0, dy = 0;
    for (const pe of ['::after', '::before']) {
      const s = getComputedStyle(el, pe);
      if (s.content === 'none' || s.position !== 'absolute') continue;
      const px = (v) => (v.endsWith('px') ? -parseFloat(v) : 0);
      dx = Math.max(dx, px(s.left) + px(s.right));
      dy = Math.max(dy, px(s.top) + px(s.bottom));
    }
    return [Math.max(0, dx), Math.max(0, dy)];
  };
  // WCAG 2.5.5 exempts a link inside a sentence, and the exemption is
  // load-bearing: a 44px inline-block in a paragraph inflates every line box
  // it touches.
  const INLINE_EXEMPT = ['link-primary', 'ai-settings-link', 'strat-suggest-btn'];

  const named = new Map();
  const accName = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ');
  // A repeated name is only ambiguous if nothing around it says which one you
  // are on. A named role="group" is what says so — it is announced on entry —
  // so two "Line" buttons in two differently-named groups are two distinct
  // controls, and two in the same group are not.
  const groupOf = (el) => {
    const g = el.closest('[role="group"]');
    return g ? (g.getAttribute('aria-label') || g.getAttribute('aria-labelledby') || '') : '';
  };

  for (const el of document.querySelectorAll('button, a[href], select, input, [role="button"], [role="checkbox"], [role="switch"], [role="tab"]')) {
    if (byDesign(el)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || !el.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    if (!INLINE_EXEMPT.some((c) => el.classList.contains(c))) {
      const [hx, hy] = halo(el);
      const w = Math.round(r.width + hx), h = Math.round(r.height + hy);
      if (w < 44 || h < 44) out.smallTargets.push(desc(el) + ' ' + w + 'x' + h);
    }

    const n = accName(el);
    if (!n) continue;
    const key = el.tagName + ' «' + n + '»' + (groupOf(el) ? ' in ' + groupOf(el) : '');
    named.set(key, (named.get(key) || 0) + 1);
  }
  for (const [k, n] of named) if (n > 1) out.dupes.push(k + ' ×' + n);
  return out;
})()`;

const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
let browser;
try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }

// One finding per (pass, route, kind), so a stylesheet mistake that touches
// every screen reads as the one mistake it is rather than as thirty failures.
const findings = [];
const record = (pass, route, kind, items) => {
  if (items.length) findings.push({ pass, route, kind, items });
};

for (const p of PASSES) {
  const ctx = await browser.newContext({
    viewport: { width: p.width, height: p.height },
    hasTouch: !!p.touch, isMobile: !!p.touch,
    colorScheme: p.dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(FAKE_TODAY);
  await page.addInitScript(mkStub(!!p.dark, true));
  await page.addInitScript(`try{localStorage.setItem('cf_darkMode', ${JSON.stringify(JSON.stringify(!!p.dark))})}catch(e){}`);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

  for (const route of ROUTES) {
    errs.length = 0;
    try {
      await page.goto(BASE + '#/' + route, { waitUntil: 'load' });
      await page.waitForTimeout(1000);
      // The backup nudge is a legitimate panel, but it is the same panel on
      // every route — leave it up and one finding about it becomes thirty.
      const nudge = page.getByRole('button', { name: 'Remind me later' });
      if (await nudge.count() > 0) await nudge.first().click().catch(() => {});
      await page.waitForTimeout(250);

      const r = await page.evaluate(AUDIT);
      record(p.name, route, 'sideways scroll', r.docOverflow ? ['document scrollWidth ' + r.docOverflow] : []);
      record(p.name, route, 'off the right edge', r.overflowers.slice(0, 5));
      record(p.name, route, 'off the left edge', r.offLeft.slice(0, 5));
      record(p.name, route, 'clipped text', r.clipped.slice(0, 5));
      if (p.touch) record(p.name, route, 'under the 44px touch floor', r.smallTargets.slice(0, 5));
      record(p.name, route, 'two visible controls, one name', r.dupes.slice(0, 5));
      record(p.name, route, 'errors', errs.slice(0, 3));
    } catch (e) {
      record(p.name, route, 'did not render', [String(e.message || e).split('\n')[0].slice(0, 140)]);
    }
  }
  await ctx.close();
}
await browser.close();
server.close();

const loads = PASSES.length * ROUTES.length;
if (!findings.length) {
  console.log(`layout-sweep: ${ROUTES.length} routes × ${PASSES.length} passes (${loads} screens) — nothing to report`);
  process.exit(0);
}
for (const f of findings) {
  console.log(`\nFAIL ${f.pass}  #/${f.route}  — ${f.kind}`);
  for (const i of f.items) console.log('   ' + i);
}
console.log(`\n${findings.length} finding(s) across ${loads} screens`);
process.exit(1);
