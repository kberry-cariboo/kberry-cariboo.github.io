// A focus ring you can actually see, on every surface it can land on.
//
// Usage:  node tests/focus-ring.mjs           (needs a built index.html)
//         node tests/focus-ring.mjs --list    (print every ring measured)
//
// tests/contrast.mjs reads the stylesheet and does the arithmetic on every
// background/colour pair it can resolve. It cannot do this one, for a reason
// worth writing down: a focus ring's contrast is against whatever the element
// happens to be sitting on, and no rule in the file says what that is. The
// year pills are styled in one place and painted onto the navy header two
// hundred lines away; nothing textual connects them.
//
// So this asks the browser instead. It walks every route, tabs to every
// focusable control, and reads the outline colour the cascade actually
// produced together with the first opaque background behind it — then applies
// the 3:1 that WCAG 1.4.11 asks of a focus indicator.
//
// It was written after two rings failed that floor in the shipped app:
//   * the help tip's ring was --navy, which in dark mode is #0A1210 on a
//     #0E1412 page — 1.02:1, an invisible ring on a control that appears on
//     most Settings screens;
//   * the global ring was --accent, which is 6.3:1 on the page and 1.68:1 on
//     the navy header, where the year pills, the search field, the clear
//     button, the alert bell, the avatar and every tab live. In light mode a
//     keyboard user could not see where they were in the app's own chrome.
//
// Neither is visible in a screenshot diff — an unfocused page looks right —
// and neither breaks a layout, so the sweep next door passes over both.
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
const PORT = 8752;
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

const FAKE_TODAY = new Date(`${FIXTURE_YEAR}-09-03T12:00:00`);
const LIST = process.argv.includes('--list');

// The routes that carry the app's dark chrome plus a spread of ordinary
// pages. This does not need all thirty: a ring's contrast depends on the
// surface, and the surfaces repeat.
const ROUTES = ['today', 'flow/list', 'flow/entries', 'flow/calendar', 'envelopes',
  'plan/goals', 'plan/insights', 'alerts', 'help', 'you', 'you/categories', 'you/household'];

// WCAG 2.1 SC 1.4.11: a focus indicator is a non-text contrast case, floor 3:1.
const FLOOR = 3;

// Read the ring the cascade actually produced, and what is behind it. Runs in
// the page because only the browser knows which rules won.
const MEASURE = `(() => {
  const out = [];
  const parse = (c) => {
    const m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({            // fg composited onto an opaque bg
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  // The ring is drawn outside the element, so what it sits on is the nearest
  // ancestor that paints — not the element's own background.
  const behind = (el) => {
    const page = parse(getComputedStyle(document.documentElement).backgroundColor)
      || { r: 255, g: 255, b: 255, a: 1 };
    let acc = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const c = parse(getComputedStyle(p).backgroundColor);
      if (!c || c.a === 0) continue;
      acc = acc ? over(acc, c) : c;
      if (acc.a === 1) return acc;
    }
    return acc ? over(acc, page) : page;
  };
  const desc = (el) => {
    const cls = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
    return el.tagName.toLowerCase() + cls + (txt ? ' «' + txt + '»' : '');
  };

  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),'
    + 'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const seen = new Set();
  for (const el of document.querySelectorAll(FOCUSABLE)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const s0 = getComputedStyle(el);
    if (s0.display === 'none' || s0.visibility === 'hidden') continue;
    // The skip link is off-screen until focused, and moves when it is.
    if (el.classList.contains('skip-link')) continue;
    const key = desc(el);
    if (seen.has(key)) continue;          // one row per distinct control
    seen.add(key);

    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;
    const s = getComputedStyle(el);
    // :focus-visible only matches a keyboard focus. focus() from script does
    // match it in Chromium when the element was not pointer-focused, which is
    // what we want; if the ring is genuinely absent, say so rather than guess.
    // A control may hand its ring to an ancestor: the category colour swatch
    // is an invisible input lying on a coloured dot, and the dot is the thing
    // worth ringing. What matters is that focus is shown somewhere, on a
    // surface the app controls — so look up as well as at.
    let ringed = el;
    const visible = (n) => {
      const cs = getComputedStyle(n);
      return cs.outlineStyle !== 'none' && (parseFloat(cs.outlineWidth) || 0) > 0;
    };
    if (!visible(el)) {
      ringed = null;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (visible(p)) { ringed = p; break; }
      }
    }
    if (!ringed) {
      out.push({ el: key, ring: null, ratio: null, radius: s.borderRadius });
      continue;
    }
    const rs = getComputedStyle(ringed);
    const ring = parse(rs.outlineColor);
    const bg = behind(ringed);
    if (!ring || !bg) continue;
    out.push({
      el: key,
      ring: rs.outlineColor + (ringed === el ? '' : ' (on ' + desc(ringed) + ')'),
      bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(',') + ')',
      ratio: Math.round(ratio(ring.a === 1 ? ring : over(ring, bg), bg) * 100) / 100,
      radius: s.borderRadius,
      restRadius: el.dataset.cfRestRadius || null,
    });
    el.blur();
  }
  return out;
})()`;

// Focus must not reshape the thing it rings. Read every control's resting
// border-radius first, so a rule that rounds an element on focus shows up as
// a change rather than as a number nobody can judge.
const REST_RADII = `(() => {
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),'
    + 'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const out = {};
  for (const el of document.querySelectorAll(FOCUSABLE)) {
    const cls = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
    const key = el.tagName.toLowerCase() + cls + (txt ? ' «' + txt + '»' : '');
    if (!(key in out)) out[key] = getComputedStyle(el).borderRadius;
  }
  return out;
})()`;

let exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
let browser;
try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }

const dim = [];      // rings under the floor
const missing = [];  // focusable, but no ring at all
const reshaped = []; // focus changed the control's shape
const measured = [];

for (const dark of [false, true]) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(FAKE_TODAY);
  await page.addInitScript(mkStub(dark, true));
  await page.addInitScript(`try{localStorage.setItem('cf_darkMode', ${JSON.stringify(JSON.stringify(dark))})}catch(e){}`);
  const theme = dark ? 'dark' : 'light';

  for (const route of ROUTES) {
    await page.goto(BASE + '#/' + route, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.first().click().catch(() => {});
    await page.waitForTimeout(200);
    // :focus-visible follows the last input modality, and dismissing the nudge
    // is a click — after which a scripted focus() draws no ring at all and
    // every control on the route reads as unringed. A keypress puts the page
    // back in keyboard mode, which is the mode this test is about.
    await page.keyboard.press('Tab');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());

    const rest = await page.evaluate(REST_RADII);
    for (const row of await page.evaluate(MEASURE)) {
      measured.push({ theme, route, ...row });
      const where = `${theme} ${route}  ${row.el}`;
      if (row.ratio === null) { missing.push(where); continue; }
      if (row.ratio < FLOOR) {
        dim.push(`${where}\n       ring ${row.ring} on ${row.bg} = ${row.ratio}:1`);
      }
      if (rest[row.el] && rest[row.el] !== row.radius) {
        reshaped.push(`${where}\n       border-radius ${rest[row.el]} → ${row.radius} while focused`);
      }
    }
  }
  await ctx.close();
}
await browser.close();
server.close();

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

if (LIST) {
  for (const m of measured) console.log(`${m.theme} ${m.route}  ${m.el}  ${m.ratio}:1  ${m.ring} on ${m.bg}`);
}

const uniq = (a) => [...new Set(a)];
check('there are focusable controls to measure', measured.length >= 200, `measured ${measured.length}`);
check('every focusable control gets a ring at all',
  missing.length === 0, uniq(missing).slice(0, 12).join('\n     '));
check(`every focus ring clears ${FLOOR}:1 against what it sits on, in both themes`,
  dim.length === 0, uniq(dim).slice(0, 12).join('\n     ')
  + `\n     (${measured.length} rings measured across ${ROUTES.length} routes × 2 themes)`);
check('focusing a control does not change its shape',
  reshaped.length === 0, uniq(reshaped).slice(0, 12).join('\n     ')
  + '\n     A ring is drawn outside the element and follows the radius it already'
  + '\n     has; setting border-radius in a :focus rule squares off round controls.');

const worst = measured.filter((m) => m.ratio != null).sort((a, b) => a.ratio - b.ratio)[0];
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`
  + `  — ${measured.length} rings measured, weakest ${worst ? worst.ratio + ':1 (' + worst.theme + ' ' + worst.el + ')' : 'n/a'}`);
process.exit(failed ? 1 : 0);
