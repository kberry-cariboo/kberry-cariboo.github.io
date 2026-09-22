// Did this change look like anything?
//
// tests/layout-sweep.mjs asks whether the layout is *broken* — overflow, clipped
// content, tap targets under the floor. It passes happily on a change that moves
// every number three pixels left, or drains the colour out of half the app,
// because neither is a broken layout. A refactor that is supposed to change
// nothing needs the opposite instrument: one that reports what moved, however
// harmlessly, so the diff can be looked at rather than assumed.
//
// That is what this is. It renders the same screens twice — once before a change
// and once after — and compares them pixel for pixel.
//
//   node tests/visual-diff.mjs capture /tmp/before     # on the old code
//   ...make the change, node build.js...
//   node tests/visual-diff.mjs capture /tmp/after
//   node tests/visual-diff.mjs compare /tmp/before /tmp/after
//
// There is a second, sharper mode for changes to the cascade itself —
// reordering rules, introducing @layer, retiring !important — where the
// question is not "does it look the same" but "does every element still
// resolve to the same value". Pixels answer that only where the difference
// happens to be visible; computed styles answer it everywhere.
//
//   node tests/visual-diff.mjs styles /tmp/before-styles
//   node tests/visual-diff.mjs compare-styles /tmp/before-styles /tmp/after-styles
//
// compare prints one line per screen that moved, worst first, and writes a diff
// image for each — changed pixels in magenta over a dimmed copy of the new
// screen, so the eye lands on them immediately.
//
// The comparison runs inside Chromium rather than in Node: decoding a PNG needs
// a decoder, the browser has one, and the alternative is a dependency this repo
// does not otherwise have.
//
// Exit code is 0 unless --max-changed is given and some screen exceeds it, which
// is what makes it usable as a gate on a refactor that claims to be invisible.
import { createServer } from 'http';
import { readFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_LIB, 'playwright'];
  try { candidates.push(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')); } catch {}
  for (const c of candidates.filter(Boolean)) {
    try { return await import(c); } catch {}
  }
  throw new Error('playwright not found — npm i -D playwright, or set PLAYWRIGHT_LIB');
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8751;

// The same routes layout-sweep walks. Kept as its own list rather than imported
// because that file does not export one, and a silent divergence here would
// mean a screen nobody is watching.
const ROUTES = [
  'today', 'flow/list', 'flow/calendar', 'flow/curve', 'flow/entries', 'envelopes',
  'plan/goals', 'plan/strategy', 'plan/debt', 'plan/insights',
  'alerts', 'help', 'you',
  'you/accounts', 'you/years', 'you/categories', 'you/money', 'you/holidays',
  'you/appearance', 'you/threshold', 'you/notifications', 'you/household',
  'you/backup', 'you/sync', 'you/templates', 'you/activity', 'you/ai', 'you/security',
  'you/danger', 'you/reset',
];

// A phone, a tablet, a desktop, and both themes on the two that matter. Fewer
// passes than layout-sweep: this measures appearance, and appearance at 320 and
// at 393 differs by the width of the column rather than by anything a refactor
// would break differently.
const PASSES = [
  { name: 'phone', width: 393, height: 852, touch: true },
  { name: 'tablet', width: 768, height: 1024, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'phone-dark', width: 393, height: 852, touch: true, dark: true },
  { name: 'desktop-dark', width: 1440, height: 900, touch: false, dark: true },
];

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-');

function serve() {
  const server = createServer((req, res) => {
    try {
      const p = req.url.split('?')[0].split('#')[0];
      const file = p === '/' || p === '/index.html' ? 'index.html' : p.slice(1);
      const type = file.endsWith('.html') ? 'text/html'
        : file.endsWith('.js') ? 'text/javascript'
        : file.endsWith('.json') ? 'application/json'
        : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      res.end(readFileSync(join(ROOT, file)));
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((r) => server.listen(PORT, '127.0.0.1', () => r(server)));
}

// Shoot until it stops moving.
//
// A fixed delay is a guess, and the guess is wrong for whichever screen
// re-measures a chart late or finishes a transition slowly — which shows up
// later as a screen that "changed" when nothing changed at all. This takes
// shots until two in a row are byte-identical, and only then keeps one.
async function settle(page, file, { tries = 8, gap = 200 } = {}) {
  let prev = null;
  for (let i = 0; i < tries; i++) {
    const shot = await page.screenshot({ fullPage: true });
    if (prev && prev.equals(shot)) {
      const { writeFileSync } = await import('fs');
      writeFileSync(file, shot);
      return true;
    }
    prev = shot;
    await page.waitForTimeout(gap);
  }
  // Never settled. Keep the last one and say so — a screen that will not hold
  // still is worth knowing about rather than silently comparing.
  const { writeFileSync } = await import('fs');
  writeFileSync(file, prev);
  console.log(`  (unsettled after ${tries} shots: ${file.split('/').pop()})`);
  return false;
}

async function capture(outDir, { only = null, passOnly = null } = {}) {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const { chromium } = await loadPlaywright();
  const { mkStub } = await import(pathToFileURL(join(ROOT, 'tests/household-fixture.mjs')).href);
  const server = await serve();
  const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  let browser;
  try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }

  const routes = only ? ROUTES.filter((r) => only.some((o) => r.includes(o) || slug(r).includes(o))) : ROUTES;
  const passes = passOnly ? PASSES.filter((p) => passOnly.includes(p.name)) : PASSES;
  if (!routes.length) throw new Error('--only matched no routes');
  if (!passes.length) throw new Error('--pass matched no passes');

  let n = 0;
  for (const pass of passes) {
    const ctx = await browser.newContext({
      viewport: { width: pass.width, height: pass.height },
      hasTouch: !!pass.touch, isMobile: !!pass.touch,
      colorScheme: pass.dark ? 'dark' : 'light',
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    await ctx.addInitScript(mkStub(!!pass.dark, true));
    await ctx.addInitScript(`try{localStorage.setItem('cf_darkMode', ${JSON.stringify(JSON.stringify(!!pass.dark))})}catch(e){}`);
    const page = await ctx.newPage();
    // The clock is pinned so "today" cannot move between the two captures and
    // report every dated screen as changed.
    await page.clock.setFixedTime(new Date('2026-09-22T12:00:00'));
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:${PORT}/index.html#/${route}`, { waitUntil: 'load' });
      await page.waitForTimeout(600);
      const nudge = page.getByRole('button', { name: 'Remind me later' });
      if (await nudge.count()) await nudge.click().catch(() => {});
      // Three sources of difference that are not the change being measured:
      // a focus ring on whatever the route focused, a hover state under
      // wherever the pointer happens to be, and a native <select> popup left
      // open — that last one moved 10% of the pixels on you/money between two
      // captures of identical code.
      await page.keyboard.press('Escape').catch(() => {});
      await page.mouse.move(0, 0).catch(() => {});
      await page.evaluate(() => {
        try { document.activeElement && document.activeElement.blur(); } catch {}
        try { window.scrollTo(0, 0); } catch {}
      });
      const file = join(outDir, `${pass.name}__${slug(route)}.png`);
      await settle(page, file);
      n++;
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(`visual-diff: captured ${n} screens (${passes.length} passes × ${routes.length} routes) into ${outDir}`);
}

// Pixel comparison, in the browser.
//
// Passed to page.evaluate as a function rather than as a source string: a
// string is evaluated as an expression, which hands back the function itself
// and never calls it — every screen then compares as "undefined" and the run
// reports nothing wrong with anything.
async function diffInPage(args) {
  const load = (src) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
  const [a, b] = await Promise.all([load(args.a), load(args.b)]);
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const draw = (img) => {
    const c = new OffscreenCanvas(w, h);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.clearRect(0, 0, w, h);
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, w, h).data;
  };
  const pa = draw(a), pb = draw(b);
  // A page that got taller is a real change, and the pixels that exist in one
  // image and not the other are part of it — hence the union canvas above
  // rather than comparing only the overlap.
  const sizeChanged = a.width !== b.width || a.height !== b.height;
  let changed = 0;
  const hits = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < pa.length; i += 4, p++) {
    const d = Math.max(
      Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]),
      Math.abs(pa[i + 2] - pb[i + 2]), Math.abs(pa[i + 3] - pb[i + 3]));
    if (d > args.tol) { changed++; hits[p] = 1; }
  }
  const res = {
    fraction: changed / (w * h),
    changed, total: w * h, sizeChanged,
    dims: [a.width, a.height, b.width, b.height],
    png: null,
  };
  // The image is only worth building when there is something to look at, and
  // base64 of a tall screenshot is not cheap.
  if (changed > 0) {
    const out = new OffscreenCanvas(w, h);
    const octx = out.getContext('2d');
    octx.drawImage(b, 0, 0);
    octx.fillStyle = 'rgba(255,255,255,0.72)';
    octx.fillRect(0, 0, w, h);
    const id = octx.getImageData(0, 0, w, h);
    for (let p = 0, i = 0; p < hits.length; p++, i += 4) {
      if (hits[p]) { id.data[i] = 255; id.data[i + 1] = 0; id.data[i + 2] = 190; id.data[i + 3] = 255; }
    }
    octx.putImageData(id, 0, 0);
    const blob = await out.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK));
    res.png = btoa(bin);
  }
  return res;
}

async function compare(dirA, dirB, { tol = 12, maxChanged = null, diffDir = null } = {}) {
  const names = readdirSync(dirB).filter((f) => f.endsWith('.png')).sort();
  const missing = names.filter((f) => !existsSync(join(dirA, f)));
  const gone = readdirSync(dirA).filter((f) => f.endsWith('.png') && !existsSync(join(dirB, f)));
  const out = diffDir || join(dirB, '_diff');
  mkdirSync(out, { recursive: true });

  const { chromium } = await loadPlaywright();
  const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  let browser;
  try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }
  const page = await (await browser.newContext()).newPage();
  await page.goto('about:blank');

  const b64 = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');
  const rows = [];
  for (const name of names) {
    if (missing.includes(name)) continue;
    const r = await page.evaluate(diffInPage, { a: b64(join(dirA, name)), b: b64(join(dirB, name)), tol });
    if (r.changed > 0 && r.png) {
      const { writeFileSync } = await import('fs');
      writeFileSync(join(out, name), Buffer.from(r.png, 'base64'));
    }
    rows.push({ name, ...r });
  }
  await browser.close();

  rows.sort((x, y) => y.fraction - x.fraction);
  const moved = rows.filter((r) => r.changed > 0);
  console.log(`visual-diff: ${rows.length} screens compared, ${moved.length} changed\n`);
  for (const r of moved) {
    const pct = (r.fraction * 100).toFixed(3).padStart(7);
    const size = r.sizeChanged ? `  size ${r.dims[0]}×${r.dims[1]} → ${r.dims[2]}×${r.dims[3]}` : '';
    console.log(`${pct}%  ${r.name}${size}`);
  }
  if (missing.length) console.log(`\nnew screens (no "before"): ${missing.join(', ')}`);
  if (gone.length) console.log(`\nscreens that vanished: ${gone.join(', ')}`);
  if (moved.length) console.log(`\ndiff images in ${out} — changed pixels in magenta`);

  if (maxChanged != null) {
    const over = moved.filter((r) => r.fraction * 100 > maxChanged);
    if (over.length) {
      console.log(`\n${over.length} screen(s) over the ${maxChanged}% ceiling`);
      process.exit(1);
    }
  }
  return rows;
}


// ── Computed styles ──────────────────────────────────────────────────────────
// The properties a stylesheet refactor can plausibly move. Not every property:
// a full dump is 340-odd per element and the diff drowns in things no rule in
// this file sets.
const WATCHED = [
  'display', 'position', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'rowGap', 'columnGap', 'flexDirection', 'flexWrap', 'flexBasis', 'alignItems',
  'justifyContent', 'gridTemplateColumns', 'gridTemplateRows',
  'fontSize', 'fontWeight', 'lineHeight', 'fontFamily', 'letterSpacing',
  'textAlign', 'whiteSpace', 'textOverflow', 'overflowX', 'overflowY',
  'color', 'backgroundColor', 'borderTopWidth', 'borderBottomWidth',
  'borderLeftWidth', 'borderRightWidth', 'borderTopColor', 'borderTopLeftRadius',
  'borderBottomLeftRadius', 'boxShadow', 'opacity', 'visibility', 'zIndex',
  'transform', 'top', 'right', 'bottom', 'left',
];

// A stable identity for an element across two runs of the same page. The DOM
// order is deterministic for a fixed fixture and a fixed clock, so the path of
// child indices is stable and does not depend on class names — which a
// refactor may legitimately change.
const DUMP = (watched) => {
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n.parentElement; n = n.parentElement) {
      parts.push([...n.parentElement.children].indexOf(n));
    }
    return parts.reverse().join('/');
  };
  const out = {};
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    out[path(el) + '|' + tag + (cls ? '.' + cls : '')] = watched.map((p) => cs[p]).join('\u0001');
  });
  return out;
};

async function captureStyles(outDir, { only = null, passOnly = null } = {}) {
  const { writeFileSync, mkdirSync: mk } = await import('fs');
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mk(outDir, { recursive: true });
  const { chromium } = await loadPlaywright();
  const { mkStub } = await import(pathToFileURL(join(ROOT, 'tests/household-fixture.mjs')).href);
  const server = await serve();
  const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  let browser;
  try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }

  const routes = only ? ROUTES.filter((r) => only.some((o) => r.includes(o) || slug(r).includes(o))) : ROUTES;
  const passes = passOnly ? PASSES.filter((p) => passOnly.includes(p.name)) : PASSES;
  let n = 0;
  for (const pass of passes) {
    const ctx = await browser.newContext({
      viewport: { width: pass.width, height: pass.height },
      hasTouch: !!pass.touch, isMobile: !!pass.touch,
      colorScheme: pass.dark ? 'dark' : 'light',
      deviceScaleFactor: 1, reducedMotion: 'reduce',
    });
    await ctx.addInitScript(mkStub(!!pass.dark, true));
    await ctx.addInitScript(`try{localStorage.setItem('cf_darkMode', ${JSON.stringify(JSON.stringify(!!pass.dark))})}catch(e){}`);
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-09-22T12:00:00'));
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:${PORT}/index.html#/${route}`, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      const nudge = page.getByRole('button', { name: 'Remind me later' });
      if (await nudge.count()) await nudge.click().catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
      await page.mouse.move(0, 0).catch(() => {});
      await page.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch {} });
      await page.waitForTimeout(250);
      const dump = await page.evaluate(DUMP, WATCHED);
      writeFileSync(join(outDir, `${pass.name}__${slug(route)}.json`), JSON.stringify(dump));
      n++;
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(`visual-diff: dumped computed styles for ${n} screens into ${outDir}`);
}

async function compareStyles(dirA, dirB) {
  const names = readdirSync(dirB).filter((f) => f.endsWith('.json')).sort();
  const byProp = new Map();
  let elements = 0, changed = 0, screensChanged = 0;
  const perScreen = [];
  for (const name of names) {
    if (!existsSync(join(dirA, name))) continue;
    const a = JSON.parse(readFileSync(join(dirA, name), 'utf8'));
    const b = JSON.parse(readFileSync(join(dirB, name), 'utf8'));
    let hits = 0;
    for (const k of Object.keys(b)) {
      if (!(k in a)) continue;
      elements++;
      if (a[k] === b[k]) continue;
      const pa = a[k].split('\u0001'), pb = b[k].split('\u0001');
      for (let i = 0; i < WATCHED.length; i++) {
        if (pa[i] === pb[i]) continue;
        hits++; changed++;
        const key = `${WATCHED[i]}: ${pa[i]} -> ${pb[i]}`;
        if (!byProp.has(key)) byProp.set(key, { n: 0, where: `${name} ${k.split('|')[1]}` });
        byProp.get(key).n++;
      }
    }
    if (hits) { screensChanged++; perScreen.push({ name, hits }); }
  }
  perScreen.sort((x, y) => y.hits - x.hits);
  console.log(`visual-diff: ${elements} element/screen pairs compared, ${changed} property differences on ${screensChanged} screens\n`);
  const rows = [...byProp.entries()].sort((x, y) => y[1].n - x[1].n);
  for (const [k, v] of rows.slice(0, 40)) {
    console.log(`${String(v.n).padStart(6)}  ${k}`);
    console.log(`        e.g. ${v.where}`);
  }
  if (rows.length > 40) console.log(`\n... and ${rows.length - 40} more kinds of difference`);
  return { changed, rows };
}

const [cmd, ...rest] = process.argv.slice(2);
const flag = (n, d) => {
  const i = rest.indexOf('--' + n);
  return i >= 0 ? rest[i + 1] : d;
};
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')));

if (cmd === 'capture') {
  if (!positional[0]) { console.error('usage: visual-diff.mjs capture <dir>'); process.exit(2); }
  await capture(positional[0], {
    only: flag('only', null) ? String(flag('only')).split(',').map((x) => x.trim()).filter(Boolean) : null,
    passOnly: flag('pass', null) ? String(flag('pass')).split(',').map((x) => x.trim()).filter(Boolean) : null,
  });
} else if (cmd === 'styles') {
  if (!positional[0]) { console.error('usage: visual-diff.mjs styles <dir>'); process.exit(2); }
  await captureStyles(positional[0], {
    only: flag('only', null) ? String(flag('only')).split(',').map((x) => x.trim()).filter(Boolean) : null,
    passOnly: flag('pass', null) ? String(flag('pass')).split(',').map((x) => x.trim()).filter(Boolean) : null,
  });
} else if (cmd === 'compare-styles') {
  if (!positional[1]) { console.error('usage: visual-diff.mjs compare-styles <before> <after>'); process.exit(2); }
  await compareStyles(positional[0], positional[1]);
} else if (cmd === 'compare') {
  if (!positional[1]) { console.error('usage: visual-diff.mjs compare <before> <after> [--tol N] [--max-changed PCT]'); process.exit(2); }
  await compare(positional[0], positional[1], {
    tol: Number(flag('tol', 12)),
    maxChanged: flag('max-changed', null) == null ? null : Number(flag('max-changed')),
    diffDir: flag('diff-dir', null),
  });
} else {
  console.error('usage:\n  visual-diff.mjs capture <dir> [--only today,envelopes] [--pass phone,desktop]\n  visual-diff.mjs compare <before> <after> [--tol N] [--max-changed PCT]\n  visual-diff.mjs styles <dir> [--only ...] [--pass ...]\n  visual-diff.mjs compare-styles <before> <after>');
  process.exit(2);
}
