// Regenerates the Help page's screenshots from the real app.
//
//   node build.js && node scripts/gen-help-shots.mjs
//
// The images are committed (images/help/*.png) rather than built on demand:
// `node build.js` must stay dependency-free, and a screenshot only changes when
// the UI it shows changes. Run this when it does — tests/help-shots.mjs fails if
// the Help page names a file that isn't there, or if a file here is unused, so a
// stale or missing shot can't go unnoticed for long.
//
// Every shot is captured from the shipped bundle driving the same fictional
// household the regression suite uses, so nothing here is mocked-up artwork and
// nothing carries real data. Element-scoped, not full-page: a screenshot of one
// control is still readable at the width Help renders it.
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'images', 'help');
const PORT = 8781;

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_LIB, 'playwright'];
  try { candidates.push(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')); } catch {}
  for (const c of candidates.filter(Boolean)) {
    try { return await import(c); } catch {}
  }
  throw new Error('playwright not found — npm i -D playwright, or set PLAYWRIGHT_LIB');
}
const { chromium } = await loadPlaywright();

const server = createServer((req, res) => {
  try {
    const p = req.url.split(/[#?]/)[0];
    const file = p === '/' ? 'index.html' : p.slice(1);
    res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : 'text/html' });
    res.end(readFileSync(join(ROOT, file)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/index.html`;

// The regression suite's fixture household, reused rather than reinvented: one
// set of fictional data to keep current, and the screenshots then show the same
// figures the tests assert on.
const suite = readFileSync(join(ROOT, 'tests/regression.mjs'), 'utf8');
const { mkStub } = await import('data:text/javascript,' + encodeURIComponent(
  suite.slice(suite.indexOf('const E = (id, desc'), suite.indexOf('const exe =')) + '\nexport { mkStub };'
));

// Retina: the Help page renders these at half their pixel width, so text in a
// screenshot stays as sharp as the text around it.
const SCALE = 2;

// name → { hash, at (selector to capture), prepare?, width?, maxHeight? }
// `prepare` drives the app into the state worth photographing. `maxHeight`
// crops a long list or table to its first few rows: the point of the picture is
// what the thing looks like, and a full year of rows is both unreadable at the
// width Help renders it and several hundred kilobytes.
const SHOTS = [
  { name: 'settings-years', hash: '#/settings', at: '#sec-years',
    prepare: async (page) => { await page.locator('#sec-years').scrollIntoViewIfNeeded(); } },
  { name: 'entry-form', hash: '#/budget/entries', at: '.modal-card',
    prepare: async (page) => {
      await page.getByRole('button', { name: '+ Add Entry' }).first().click();
      await page.getByPlaceholder('e.g. Mortgage payment').fill('Hydro & gas');
      await page.locator('input[inputmode="decimal"]').first().fill('185');
      // Typing leaves a focus ring on the last field touched, which in a
      // screenshot looks like part of the design rather than a cursor.
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.waitForTimeout(200);
    } },
  { name: 'budget-toolbar', hash: '#/budget', at: '.budget-toolbar-row, .forecast-exportbar-row', width: 560 },
  { name: 'budget-grid', hash: '#/budget', at: '.forecast-table, .entries-table', maxHeight: 320 },
  { name: 'row-menu', hash: '#/budget', at: '.ctx-menu-desktop',
    prepare: async (page) => {
      await page.locator('.forecast-table tbody tr .row-menu-btn').first().click();
      await page.waitForTimeout(300);
    } },
  { name: 'bva', hash: '#/budget/bva', at: '.cf-card', maxHeight: 300 },
  { name: 'dashboard-kpis', hash: '#/dashboard', at: '.kpi-grid-4' },
  { name: 'dashboard-upcoming', hash: '#/dashboard', at: '.cf-card',
    prepare: async (page) => { await page.getByText('UPCOMING', { exact: false }).first().scrollIntoViewIfNeeded(); },
    pick: (page) => page.locator('.cf-card', { hasText: 'UPCOMING' }).first(), maxHeight: 260 },
  { name: 'plan-goals', hash: '#/plan/goals', at: '.cf-card' },
  { name: 'settings-backup', hash: '#/settings', at: '#sec-backup',
    prepare: async (page) => { await page.locator('#sec-backup').scrollIntoViewIfNeeded(); } },
];

let browser;
try { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' }); }
catch { browser = await chromium.launch(); }

mkdirSync(OUT, { recursive: true });
const written = [];
// CSS pixel size of each shot, so the Help page can reserve the right box before
// a lazily-loaded image arrives and nothing jumps as the reader scrolls.
const sizes = {};
for (const shot of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: shot.width || 980, height: 900 },
    deviceScaleFactor: SCALE,
    colorScheme: 'light',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(9000);
  await page.addInitScript(mkStub(false, true));
  // Transient chrome that would date the image or cover it: the backup nudge
  // fires on a 30-day-old export, the swipe coach on first touch.
  await page.addInitScript(`try{
    localStorage.setItem('cf_last_backup', String(Date.now()));
    localStorage.setItem('cf_swipe_tip_seen', '1');
  }catch(e){}`);
  await page.goto(BASE + shot.hash, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  if (shot.prepare) await shot.prepare(page);
  await page.waitForTimeout(400);
  const target = shot.pick ? shot.pick(page) : page.locator(shot.at).first();
  if (await target.count() === 0) throw new Error(`${shot.name}: nothing matched ${shot.at}`);
  const path = join(OUT, shot.name + '.png');
  let box = await target.boundingBox();
  if (shot.maxHeight) {
    // Element screenshots can't be clipped directly, so clip the page to the
    // element's box with the height capped.
    if (!box) throw new Error(`${shot.name}: the target has no box to clip`);
    box = { ...box, height: Math.min(box.height, shot.maxHeight) };
    await page.screenshot({ path, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  } else {
    await target.screenshot({ path });
  }
  written.push(shot.name + '.png');
  sizes[shot.name] = { w: Math.round(box.width), h: Math.round(box.height) };
  console.log(`${shot.name.padEnd(20)} ${String(statSync(path).size).padStart(7)} B`);
  await ctx.close();
}

// A renamed or dropped shot leaves its old file behind, which then ships and is
// never looked at again. Sweep them.
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.png') && !written.includes(f)) {
    unlinkSync(join(OUT, f));
    console.log(`removed stale ${f}`);
  }
}

// Written rather than hand-maintained: a shot that changes shape updates its own
// dimensions, and tests/help-shots.mjs checks this file, the PNGs and the Help
// page's references all still name the same set.
const manifest = `  // GENERATED by scripts/gen-help-shots.mjs — do not edit by hand.
  // Intrinsic CSS size of each Help screenshot, used to reserve its box before
  // the lazily-loaded image arrives. Re-run the script after changing a shot.
  const HELP_SHOTS = ${JSON.stringify(sizes, null, 2).split('\n').map((l, i) => (i ? '  ' + l : l)).join('\n')};
`;
writeFileSync(join(ROOT, 'src', 'lib', 'help-shots.js'), manifest);

await browser.close();
server.close();
const total = written.reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
console.log(`\n${written.length} shots, ${(total / 1024).toFixed(0)} KB total`);
console.log('wrote src/lib/help-shots.js');
