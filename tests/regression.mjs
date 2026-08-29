// CashFlow Budget — full UI regression suite.
//
// Usage:  node tests/regression.mjs
// Needs:  Playwright (with a chromium) resolvable from PLAYWRIGHT_LIB, a local
//         install, or the global npm root. Serves the repo's index.html itself.
//         Run `node build.js` first so index.html matches src/.
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
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
const { chromium } = await loadPlaywright();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8749;
// The service-worker test needs to watch what actually leaves the server and to
// stand in a second build, so the server keeps a log and an override table.
const requestLog = [];
const serverOverride = new Map();
const server = createServer((req, res) => {
  try {
    const path = req.url.split('?')[0].split('#')[0];
    requestLog.push(path);
    const file = path === '/' || path === '/index.html' ? 'index.html' : path.slice(1);
    const body = serverOverride.has(path) ? Buffer.from(serverOverride.get(path)) : readFileSync(join(ROOT, file));
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const BASE = 'http://127.0.0.1:' + PORT + '/index.html';

// Fictional demo data (self-contained). Money is stored as integer cents
// (schema v8) — `amount` args below are dollars, multiplied by 100 so the
// fixtures read naturally while matching the app's on-disk representation.
const E = (id, desc, type, amount, category, opts = {}) => ({
  id, desc, type, amount: Math.round(amount * 100), category,
  repeats: opts.once ? false : true,
  recurUnit: opts.unit || 'month',
  recurEvery: opts.every || 1,
  startDate: opts.start || '2026-01-05',
  ...(opts.recurEnd ? { recurEnd: opts.recurEnd } : {}),
  notes: opts.notes || ''
});
const entries = [
  E(1, 'Salary — Acme Corp', 'income', 3250, 'Income', { start: '2026-01-02', unit: 'week', every: 2 }),
  E(2, 'Freelance design', 'income', 850, 'Income', { start: '2026-01-20' }),
  E(3, 'Tax refund', 'income', 950, 'Income', { once: true, start: '2026-04-14' }),
  E(4, 'Rent', 'expense', 1650, 'Housing', { start: '2026-01-01' }),
  E(5, 'Groceries', 'expense', 260, 'Food', { start: '2026-01-04', unit: 'week', every: 2 }),
  E(6, 'Car insurance', 'expense', 210, 'Insurance', { start: '2026-01-15' }),
  E(7, 'Hydro & gas', 'expense', 185, 'Utilities', { start: '2026-01-12' }),
  E(8, 'Internet', 'expense', 95, 'Utilities', { start: '2026-01-08' }),
  E(9, 'Streaming bundle', 'expense', 45, 'Subscriptions', { start: '2026-01-10' }),
  E(10, 'Fuel', 'expense', 80, 'Transportation', { start: '2026-01-06', unit: 'week', every: 1 }),
  E(11, 'Dining out', 'expense', 120, 'Personal', { start: '2026-01-09', unit: 'week', every: 2 }),
  E(12, 'Gym membership', 'expense', 55, 'Personal', { start: '2026-01-03' }),
  E(13, 'Car loan', 'expense', 385, 'Debt / Credit', { start: '2026-01-18', recurEnd: '2026-09-18' }),
  E(14, 'RRSP contribution', 'expense', 400, 'Savings / RRSP', { start: '2026-01-25' }),
  E(15, 'Phone plan', 'expense', 75, 'Subscriptions', { start: '2026-01-11' }),
  E(16, 'Summer vacation', 'expense', 1800, 'Personal', { once: true, start: '2026-07-24' }),
  E(17, 'Vet checkup', 'expense', 240, 'Farm / Animals', { once: true, start: '2026-08-12' }),
];
const monthTargets = {
  Housing: 165000, Food: 56000, Insurance: 21000, Utilities: 29000, Subscriptions: 12500,
  Transportation: 34000, Personal: 32000, 'Debt / Credit': 38500, 'Savings / RRSP': 40000
};
const entriesMatch = 'const entries = ' + JSON.stringify(entries) + ';';
const eMatch = '';
const targetsMatch = 'const monthTargets = ' + JSON.stringify(monthTargets) + ';';
const btMatch = "const budgetTargets = {}; for (let m = 0; m <= 11; m++) budgetTargets['2026:' + m] = { ...monthTargets };";

const mkStub = (dark, loggedIn = true) => `
(() => {
  ${eMatch}
  ${entriesMatch}
  ${targetsMatch}
  ${btMatch}
  const session = ${loggedIn} ? { user: { id: 'u-demo', email: 'demo@example.com' }, access_token: 'demo' } : null;
  const payload = { entries, overridesByYr: {}, yearConfigs: [{ year: 2026, openingBalance: 1250000 }], budgetTargets, templates: [], completed: {}, activeYear: 2026, alertThreshold: 50000, darkMode: ${dark}, goals: [], dashHidden: {}, dashOrder: [], schemaVersion: 999 };
  const members = [{ user_id: 'u-demo', full_name: 'Demo User', disabled: false, role: 'owner', joined_at: '2026-01-01T00:00:00Z' }];
  const resolved = (data) => Promise.resolve({ data, error: null });
  function chain(table) {
    const c = {};
    for (const m of ['select','eq','limit','order','update','insert','delete','neq','in']) {
      c[m] = () => { if (m === 'order') return resolved(table === 'household_members' ? members : []); return c; };
    }
    c.maybeSingle = () => resolved(table === 'household_members' ? { household_id: 'hh-demo' } : { id: 'hh-demo', name: 'Demo Household' });
    c.single = c.maybeSingle;
    c.then = (res, rej) => resolved(null).then(res, rej);
    return c;
  }
  const fakeClient = {
    auth: { getSession: () => resolved({ session }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: () => resolved(null) },
    from: (t) => chain(t),
    rpc: (name) => name === 'load_household' ? resolved({ data: payload, receipts: [] }) : resolved(null),
    channel: () => { const ch = { on: () => ch, subscribe: () => ({ unsubscribe(){} }) }; return ch; },
    removeChannel(){},
  };
  const fake = { createClient: () => fakeClient };
  Object.defineProperty(window, 'supabase', { get: () => fake, set: () => {} });
})();
`;

const exe = process.env.CHROMIUM_PATH || (readFileSync ? '/opt/pw-browsers/chromium' : null);
let browser;
try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }
const results = [];
let pageErrors = [];

// `stub` rewrites the fixture script before it is injected — for the handful of
// tests that need data the shared fixture doesn't carry (a mid-horizon expense
// big enough to dip the forecast, a few savings goals). Everything else takes
// the fixture as it is.
async function ctxPage({ touch = false, dark = false, loggedIn = true, stub = (x) => x } = {}) {
  const ctx = await browser.newContext({
    viewport: touch ? { width: 393, height: 852 } : { width: 1440, height: 900 },
    hasTouch: touch, isMobile: touch, colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  lastPage = page;
  await page.addInitScript(stub(mkStub(dark, loggedIn)));
  await page.addInitScript(`try{localStorage.setItem('cf_darkMode', ${JSON.stringify(JSON.stringify(dark))})}catch(e){}`);
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  return { ctx, page };
}

let lastPage = null;
// Tests are named, not numbered: a failing line has to say what broke without
// anyone having to open this file to decode it, and the same goes for the
// screenshot a failure leaves behind — hence the slug rather than the old
// first-word (i.e. the test code) filename.
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
async function test(name, fn) {
  const errBefore = pageErrors.length;
  try {
    await fn();
    const newErrs = pageErrors.slice(errBefore);
    if (newErrs.length) results.push({ name, ok: false, detail: 'JS error: ' + newErrs[0] });
    else results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, detail: String(e.message || e).split('\n')[0].slice(0, 160) });
    try { if (lastPage) await lastPage.screenshot({ path: join(ROOT, 'tests', 'fail-' + slug(name) + '.png') }); } catch {}
  }
}

const V = { timeout: 6000 };

// ── The app's own in-page self-tests ─────────────────────────────────────────────
await test('self-test: the app\'s own in-page check suite passes', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '?selftest', { waitUntil: 'load' });
  const status = await page.getByText(/checks passed/, V).textContent();
  const m = status.match(/(\d+)\/(\d+)/);
  if (!m || m[1] !== m[2]) throw new Error('self-test: ' + status);
  await ctx.close();
});

// ── Desktop, light theme ────────────────────────────────────────────────────────
{
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await test('dashboard: KPI tiles and charts render', async () => {
    for (const t of ['Balance today', 'Annual Income', 'Running Balance', 'Income vs Expenses', 'Top Expense Categories', 'Budget vs Actual']) {
      await page.getByText(t, { exact: false }).first().waitFor(V);
    }
  });

  await test('dashboard: the running-balance chart switches between area, line and bar', async () => {
    const card = page.locator('.cf-card', { hasText: 'Running Balance' }).first();
    for (const mode of ['Line', 'Bar', 'Area']) {
      await card.getByRole('button', { name: mode, exact: true }).click();
      await page.waitForTimeout(300);
      if (await card.locator('svg path, svg rect').count() === 0) throw new Error(mode + ' view has no marks');
    }
  });

  await test('dashboard: hovering the running-balance line shows a tooltip', async () => {
    const card = page.locator('.cf-card', { hasText: 'Running Balance' }).first();
    await card.getByRole('button', { name: 'Line', exact: true }).click();
    const svg = card.locator('svg').first();
    const box = await svg.boundingBox();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.waitForTimeout(400);
    await card.getByText('Balance', { exact: false }).first().waitFor(V); // tooltip row
  });

  await test('dashboard: the income-vs-expenses line view labels each series at its end', async () => {
    const card = page.locator('.cf-card', { hasText: 'Income vs Expenses' }).first();
    await card.getByRole('button', { name: 'Line', exact: true }).click();
    await page.waitForTimeout(300);
    await card.locator('svg text', { hasText: 'Expenses' }).first().waitFor(V);
  });

  await test('dashboard: the top-expense-categories pie renders its slices', async () => {
    const card = page.locator('.cf-card', { hasText: 'Top Expense Categories' }).first();
    await card.getByRole('button', { name: 'Pie', exact: true }).click();
    await page.waitForTimeout(400);
    if (await card.locator('svg path').count() < 3) throw new Error('pie has <3 slices');
  });

  await test('dashboard: income sources are grouped by entry description', async () => {
    const card = page.locator('.cf-card', { hasText: 'Income Sources' }).first();
    await card.getByText('Salary — Acme Corp').waitFor(V);
    await card.getByText('Freelance design').waitFor(V);
  });

  await test('dashboard: the monthly summary switches between heatmap and table', async () => {
    await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
    await page.waitForTimeout(300);
    const cells = await page.locator('.cf-card table td').count();
    if (cells < 12) throw new Error('heat view has ' + cells + ' cells');
    await page.getByRole('button', { name: 'Table', exact: true }).click();
    await page.getByText('Annual Total', { exact: false }).first().waitFor(V);
  });

  await test('budget monthly: changing the month reloads the ledger', async () => {
    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^Mar$/ }).click();
    await page.waitForTimeout(400);
    await page.getByText('Mar 1–14', { exact: false }).waitFor(V).catch(() => page.getByText('MAR 1', { exact: false }).first().waitFor(V));
  });

  await test('budget monthly: the occurrence edit modal opens and closes', async () => {
    await page.getByRole('button', { name: /^Jul$/ }).click();
    await page.waitForTimeout(400);
    await page.getByText('Rent', { exact: true }).first().click();
    await page.locator('.modal-card').waitFor(V);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await page.locator('.modal-card').count() > 0) {
      await page.locator('.modal-card').getByRole('button', { name: /Cancel/ }).click();
    }
  });

  await test('budget monthly: the mark-paid checkbox toggles', async () => {
    const cb = page.locator('table [role="checkbox"], table button[aria-checked]').first();
    const before = await cb.getAttribute('aria-checked');
    await cb.click();
    await page.waitForTimeout(300);
    const after = await cb.getAttribute('aria-checked');
    if (before === after) throw new Error('aria-checked did not toggle');
  });

  await test('budget vs actual: rows show spent against budget and flag overspend', async () => {
    await page.goto(BASE + '#/envelopes', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByText('Budget vs Actual', { exact: false }).first().waitFor(V);
    await page.getByText('over', { exact: false }).first().waitFor(V);
  });

  await test('budget forecast: the horizon toggle switches between 30 and 90 days', async () => {
    await page.goto(BASE + '#/flow/curve', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '30 days' }).click();
    await page.waitForTimeout(300);
    await page.getByText('30-Day Forecast', { exact: false }).waitFor(V);
    await page.getByRole('button', { name: '90 days' }).click();
    await page.getByText('90-Day Forecast', { exact: false }).waitFor(V);
  });

  await test('entries: adding an entry from the desktop form saves it and lists it', async () => {
    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '+ Add Entry' }).first().click();
    await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
    await page.getByPlaceholder('e.g. Mortgage payment').fill('QA Regression Entry');
    await page.getByPlaceholder('0.00').first().fill('123.45');
    await page.locator('#ef-category').selectOption({ label: 'Housing' });
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    await page.getByRole('button', { name: 'Save Entry' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Save Entry' }).click();
    await page.waitForTimeout(600);
    if (await page.getByRole('button', { name: 'Save Entry' }).count() > 0) throw new Error('form did not close (validation?)');
    await page.getByText('QA Regression Entry').first().waitFor(V);
    await page.getByText('-$123.45', { exact: false }).first().waitFor(V);
  });

  await test('entries: the search box filters the rows', async () => {
    await page.locator('#global-search').fill('Rent');
    await page.waitForTimeout(400);
    await page.getByText('Rent', { exact: true }).first().waitFor(V);
    if (await page.getByText('Groceries', { exact: true }).count() > 0) throw new Error('search did not filter');
    await page.locator('#global-search').fill('');
  });

  await test('plan goals: the add-goal modal opens and closes', async () => {
    await page.goto(BASE + '#/plan/goals', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '+ Add Goal' }).click();
    await page.locator('.modal-card').first().waitFor(V);
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await page.waitForTimeout(400);
    if (await page.locator('.modal-overlay').count() > 0) throw new Error('goal modal did not close');
  });

  await test('settings: adding a category lists it', async () => {
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByPlaceholder('New category name').fill('QA Category');
    await page.getByRole('button', { name: '+ Add', exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.getByText('QA Category', { exact: false }).first().waitFor(V);
  });

  await test('settings: the dark-mode toggle flips the theme live', async () => {
    const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    await page.getByRole('switch', { name: 'Dark Mode' }).click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    if (before === after) throw new Error('--bg unchanged: ' + before);
    await page.getByRole('switch', { name: 'Dark Mode' }).click(); // restore
  });

  await test('ai insights: the tab renders without an API key configured', async () => {
    await page.goto(BASE + '#/plan/insights', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByText('AI Financial Assessment', { exact: false }).waitFor(V);
  });

  await test('budget monthly: skipping an occurrence hides it and restoring brings it back', async () => {
    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /^Jul$/ }).click();
    await page.waitForTimeout(400);
    await page.getByText('Rent', { exact: true }).first().click();
    await page.locator('.modal-card').waitFor(V);
    await page.getByRole('button', { name: /Skip this date/ }).click();
    await page.waitForTimeout(300);
    if (await page.getByText('Rent', { exact: true }).count() > 0) {
      throw new Error('skipped occurrence still visible in the grid');
    }
    await page.getByText('skipped in Jul', { exact: false }).waitFor(V);
    await page.getByRole('button', { name: /Restore/ }).click();
    await page.waitForTimeout(300);
    await page.getByText('Rent', { exact: true }).first().waitFor(V);
  });

  await test('entries: CSV import uploads, auto-maps columns, previews and adds the rows', async () => {
    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Import CSV' }).click();
    await page.locator('.modal-card').waitFor(V);
    const csv = 'Date,Description,Amount\n2026-07-09,CSV Coffee Shop,-4.53\n2026-07-10,CSV Paycheck,1000.01\n';
    await page.locator('input[type=file]').setInputFiles({
      name: 'transactions.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
    });
    await page.getByText('2 rows. Confirm which columns', { exact: false }).waitFor(V);
    const previewBtn = page.getByRole('button', { name: /Preview/ });
    if (await previewBtn.isDisabled()) throw new Error('columns were not auto-mapped from the CSV header row');
    await previewBtn.click();
    await page.getByText('2 of 2 rows will be imported', { exact: false }).waitFor(V);
    await page.getByText('CSV Coffee Shop', { exact: false }).waitFor(V);
    await page.getByText('CSV Paycheck', { exact: false }).waitFor(V);
    await page.getByRole('button', { name: /Import 2 entries/ }).click();
    await page.waitForTimeout(400);
    await page.locator('.modal-overlay').count().then((n) => {
      if (n > 0) throw new Error('import modal did not close after importing');
    });
    await page.locator('#global-search').fill('CSV Coffee Shop');
    await page.waitForTimeout(300);
    await page.getByText('CSV Coffee Shop', { exact: false }).first().waitFor(V);
  });

  await test('entries: a transfer nets into the balance and stays out of income totals', async () => {
    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const incomeBefore = await page.locator('.kpi-tile', { hasText: 'Annual Income' }).locator('.kpi-spark-value').innerText();

    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.locator('#global-search').fill('');
    await page.getByRole('button', { name: '+ Add Entry' }).first().click();
    await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
    await page.getByPlaceholder('e.g. Mortgage payment').fill('QA Transfer In');
    await page.locator('#ef-type').selectOption({ value: 'transfer' });
    await page.getByLabel('Transfer direction').selectOption({ value: 'in' });
    await page.getByPlaceholder('0.00').first().fill('50.00');
    await page.locator('#ef-category').selectOption({ label: 'Housing' });
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    await page.getByRole('button', { name: 'Save Entry' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Save Entry' }).click();
    await page.waitForTimeout(600);
    if (await page.getByRole('button', { name: 'Save Entry' }).count() > 0) throw new Error('form did not close (validation?)');

    // Show every row before looking for it: by this point in the run the
    // earlier tests have pushed the entry count past the 20-row page size, and
    // a row dated today sorts onto page 2 where waitFor never sees it. (The
    // global search box isn't the way to find it — typing in it deliberately
    // jumps to Budget → Monthly, which is a different table with different
    // columns.)
    await page.getByLabel('Rows per page').first().selectOption('all');
    await page.waitForTimeout(400);
    await page.getByText('QA Transfer In').first().waitFor(V);
    const row = page.locator('tr', { hasText: 'QA Transfer In' }).first();
    const rowText = await row.innerText();
    if (!rowText.includes('+$50.00')) throw new Error('transfer-in row did not show +$50.00: ' + rowText);

    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const incomeAfter = await page.locator('.kpi-tile', { hasText: 'Annual Income' }).locator('.kpi-spark-value').innerText();
    if (incomeBefore !== incomeAfter) throw new Error(`transfer leaked into Annual Income: ${incomeBefore} -> ${incomeAfter}`);
  });

  // The guard the transfer bug got past. The case above pins down what a
  // transfer must *not* do (count as income); this one pins down what every
  // total must do regardless of the mix of types in the month — agree with
  // the balance printed beside it.
  //
  // Before this existed, "Surplus / Shortfall" was income minus expenses,
  // which silently excluded transfers while the running balance included
  // them. Each month with a transfer reported a surplus that contradicted its
  // own Closing Balance, and the Annual Total was out by the year's transfers
  // — $6,000 on a $500/month savings transfer — with nothing on screen
  // indicating which figure to believe. Reading the numbers off the rendered
  // table (rather than calling getMonthSummaries directly) is deliberate: the
  // defect was in what the user saw, and a unit test on the helper would not
  // have caught the grid footer or the annual row.
  // The app used to call the same destination two names depending on the
  // width you were at ("Home"/"Dashboard" was fixed earlier; "Budget vs
  // Actual"/"vs Actual" and "AI Insights"/"AI" are these), and put Settings in
  // the bottom nav on a phone but the avatar menu on a desktop — two
  // information architectures rather than two layouts.
  await test('navigation: the same destinations, named the same way, at every width', async () => {
    const names = async (p) => p.evaluate(() => {
      const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && el.getClientRects().length > 0; };
      const nav = [...document.querySelectorAll('nav')].filter(vis)[0];
      // The centre compose button is an action, not a destination — the phone
      // nav carries it and the desktop tab strip does not, and that is the
      // design rather than a drift between widths.
      return [...nav.querySelectorAll('button,a')].filter(vis)
        .filter((b) => !b.classList.contains('bottomnav-compose'))
        .map((b) => b.innerText.trim().replace(/^✦\s*/, ''));
    });
    const subs = async (p) => p.evaluate(() => [...document.querySelectorAll('.budget-subtab-pill')]
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => el.innerText.trim()));

    const wide = await ctxPage();
    await wide.page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await wide.page.waitForTimeout(900);
    const wideNav = await names(wide.page), wideSubs = await subs(wide.page);

    const narrow = await ctxPage({ touch: true });
    await narrow.page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await narrow.page.waitForTimeout(900);
    const narrowNav = await names(narrow.page), narrowSubs = await subs(narrow.page);

    if (JSON.stringify(wideNav) !== JSON.stringify(narrowNav)) {
      throw new Error(`primary nav differs by width:\n  wide:   ${wideNav.join(' / ')}\n  narrow: ${narrowNav.join(' / ')}`);
    }
    const expected = ['Today', 'Flow', 'Envelopes', 'Plan'];
    if (JSON.stringify(wideNav) !== JSON.stringify(expected)) {
      throw new Error('primary destinations are ' + wideNav.join(' / ') + ', expected ' + expected.join(' / '));
    }
    for (const { page } of [wide, narrow]) {
      await page.locator('.user-avatar-btn').click();
      await page.waitForTimeout(300);
      const inMenu = await page.evaluate(() => [...document.querySelectorAll('.user-menu-panel button')].map((b) => b.innerText.trim()));
      if (!inMenu.includes('Settings')) throw new Error('Settings is not reachable from the avatar: ' + inMenu.join(' / '));
      await page.keyboard.press('Escape');
    }
    // Exact equality, not a subset. Daily used to be hidden on a phone, so the
    // narrow set was legitimately shorter; Calendar, which replaced it, renders
    // at both widths, so there is no longer any reason for the two to differ —
    // in membership or in wording. The wording half is the one that keeps
    // biting: an abbreviated "vs Actual" on a phone beside "Budget vs Actual"
    // on a desktop is two names for one destination.
    if (JSON.stringify(wideSubs) !== JSON.stringify(narrowSubs)) {
      throw new Error(`Budget sub-tabs differ by width:\n  wide:   ${wideSubs.join(' / ')}\n  narrow: ${narrowSubs.join(' / ')}`);
    }
    await wide.ctx.close();
    await narrow.ctx.close();
  });

  // Entries had no bulk selection at all, while the Monthly grid — where it
  // matters less — has had row checkboxes since it was written.
  await test('entries: several rows can be recategorised at once, with one undo', async () => {
    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    const rows = page.locator('.entries-table tbody tr');
    const catOf = (i) => rows.nth(i).locator('.entries-col-cat, .entries-col-category').first().innerText();
    const before0 = await catOf(0), before1 = await catOf(1);

    await rows.nth(0).locator('input[type=checkbox]').check();
    await rows.nth(1).locator('input[type=checkbox]').check();
    await page.waitForTimeout(250);
    if (!/2 selected/.test(await page.locator('.budget-bulkbar').innerText())) throw new Error('bulk bar does not show the count');

    await page.locator('.entries-bulk-cat').selectOption('Medical');
    await page.waitForTimeout(500);
    if (!/Medical/.test(await catOf(0)) || !/Medical/.test(await catOf(1))) throw new Error('bulk recategorise did not apply to both rows');

    // One undo for the whole selection, not one per row.
    const toast = await page.locator('.undo-toast').innerText();
    if (!/2 entries/.test(toast)) throw new Error('undo toast does not cover the selection: ' + toast);
    await page.locator('.undo-btn').click();
    await page.waitForTimeout(500);
    if (await catOf(0) !== before0 || await catOf(1) !== before1) throw new Error('undo did not restore both categories');
  });

  // Currency and number format were hardcoded to en-CA and a bare "$" in
  // fmt(), which is the single function every amount in the app goes through.
  await test('settings: changing currency and number format rewrites every amount', async () => {
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    await page.locator('#set-currency').selectOption('EUR');
    await page.locator('#set-locale').selectOption('de-DE');
    await page.waitForTimeout(500);

    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const kpi = await page.locator('.kpi-tile', { hasText: 'Annual Income' }).locator('.kpi-spark-value').innerText();
    // German grouping puts points where en-CA puts commas, and the symbol
    // changes with the currency.
    if (!kpi.includes('€')) throw new Error('currency symbol did not change: ' + kpi);
    if (!/\d\.\d{3},\d{2}/.test(kpi)) throw new Error('number format did not change: ' + kpi);
    // Chart axes format money too, through the same module state.
    const ticks = await page.evaluate(() => [...document.querySelectorAll('svg text')].map((t) => t.textContent).join(' '));
    if (!ticks.includes('€')) throw new Error('chart axis still using the old symbol: ' + ticks.slice(0, 120));

    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.locator('#set-currency').selectOption('CAD');
    await page.locator('#set-locale').selectOption('en-CA');
    await page.waitForTimeout(500);
  });

  // The statutory holidays that decide when a payday lands were British
  // Columbia's, with no way to pick another province.
  await test('settings: the holiday region changes which dates are computed', async () => {
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const list = () => page.locator('#sec-holidays').innerText();
    const bc = await list();
    if (!/British Columbia Day/.test(bc)) throw new Error('BC list missing BC Day');

    await page.locator('#holiday-region').selectOption('QC');
    await page.waitForTimeout(700);
    const qc = await list();
    if (!/St-Jean-Baptiste Day/.test(qc)) throw new Error('Quebec list missing St-Jean-Baptiste: ' + qc.slice(0, 200));
    if (/Family Day/.test(qc)) throw new Error('Quebec should have no Family Day');
    if (!/Canada Day/.test(qc)) throw new Error('Quebec lost a national holiday');

    await page.locator('#holiday-region').selectOption('BC');
    await page.waitForTimeout(700);
    if (!/British Columbia Day/.test(await list())) throw new Error('switching back did not restore BC');
  });

  // Every balance in the app is projected from the year's opening figure; the
  // Help page is explicit that marking an occurrence paid is a tick-off, not a
  // reconciliation. Nothing measured the projection against reality, and the
  // only correction available rewrote the whole year.
  await test('dashboard: reconciling to the bank adjusts today without touching income or expenses', async () => {
    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});

    const money = (t) => Math.round(parseFloat(String(t).replace(/[^0-9.-]/g, '')) * 100);
    const tile = (name) => page.locator('.kpi-tile', { hasText: name }).locator('.kpi-spark-value').innerText();
    const balanceText = () => page.locator('.glance-tile', { hasText: 'Balance today' }).locator('.glance-value').innerText();

    const incomeBefore = await tile('Annual Income');
    const expenseBefore = await tile('Annual Expenses');
    const projected = money(await balanceText());
    const target = projected - 27985;

    await page.getByRole('button', { name: /Reconcile/ }).click();
    await page.locator('#rec-actual').waitFor(V);
    await page.locator('#rec-actual').fill((target / 100).toFixed(2));
    await page.getByRole('button', { name: 'Record adjustment' }).click();
    await page.waitForTimeout(800);

    const after = money(await balanceText());
    if (after !== target) throw new Error(`balance did not match the bank figure: wanted ${target}, got ${after}`);

    // The adjustment is a transfer precisely so it stays out of these two —
    // it is not earnings and not spending, and putting it in either would
    // distort a category and Budget vs Actual along with it.
    if (await tile('Annual Income') !== incomeBefore) throw new Error('reconciliation leaked into Annual Income');
    if (await tile('Annual Expenses') !== expenseBefore) throw new Error('reconciliation leaked into Annual Expenses');

    // Leave the fixture as it was found — the suite shares one session.
    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.getByLabel('Rows per page').first().selectOption('all');
    await page.waitForTimeout(400);
    const row = page.locator('tr', { hasText: 'Balance adjustment' }).first();
    await row.locator('button').last().click();
    await page.waitForTimeout(400);
    await page.getByText('Delete', { exact: false }).last().click();
    await page.waitForTimeout(300);
    const confirmDel = page.locator('.modal-overlay').getByRole('button', { name: /^Delete$/ });
    if (await confirmDel.count() > 0) await confirmDel.first().click();
    await page.waitForTimeout(500);
  });

  // A shared budget generates "who changed this?", and nothing answered it:
  // entries have carried a userId since they were first synced and overrides
  // carried a timestamp, but neither was ever displayed.
  await test('household: an occurrence edit records who made it', async () => {
    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const row = page.locator('.forecast-table tbody tr').filter({ hasText: 'Rent' }).first();
    await row.locator('td').nth(2).click();
    await page.waitForTimeout(500);
    const amount = page.locator('.modal-card input[inputmode="decimal"]').first();
    await amount.fill('1751');
    await page.getByRole('button', { name: /^Save/ }).first().click();
    await page.waitForTimeout(600);

    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /Activity/i }).first().click();
    await page.waitForTimeout(600);
    const entry = await page.locator('.audit-entry').first().innerText();
    if (!/Saved/.test(entry)) throw new Error('audit row has no save stamp: ' + entry);
    // The fixture household has a single member, and naming yourself on every
    // row you touched is noise — so the *absence* of a "by" here is correct,
    // and what this pins down is that the stamp is recorded and rendered
    // without throwing.
    if (/\bby\s*$/.test(entry)) throw new Error('dangling "by" with no name: ' + entry);

    // Put back everything this touched. The suite shares one page session, so
    // both the override and the Settings sub-page are state later cases read:
    // leaving the override in place moved the Rent figures a downstream test
    // asserts on, and leaving Settings on Activity meant the next test to open
    // Settings found no category list at all.
    await page.locator('.audit-entry').first().getByRole('button', { name: /Revert/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /General/i }).first().click();
    await page.waitForTimeout(400);
  });

  // Undo used to exist for exactly one action (deleting an entry) while the
  // more destructive ones — a category, a budget year, a year of targets,
  // restoring a backup over your data — committed with no way back. This
  // covers the one that is easiest to press by accident and hardest to
  // reconstruct by hand.
  await test('settings: removing a category can be undone, colour and position included', async () => {
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    const names = () => page.evaluate(() => [...document.querySelectorAll('#sec-categories .cat-row')]
      .map((r) => r.innerText.replace(/\s+/g, ' ').replace(/[⠿↑↓]|Reset|Edit|Remove/g, '').trim()));
    const swatches = () => page.evaluate(() => [...document.querySelectorAll('#sec-categories .cat-row')]
      .map((r) => { const d = r.querySelector('[style*="background"]'); return d ? getComputedStyle(d).backgroundColor : ''; }));

    const before = await names(), colorsBefore = await swatches();
    if (before.length < 2) throw new Error('expected a category list, got ' + JSON.stringify(before));

    await page.locator('#sec-categories .cat-row').first().locator('button', { hasText: /^Remove$/ }).click();
    await page.waitForTimeout(400);
    const afterDelete = await names();
    if (afterDelete.length !== before.length - 1) throw new Error(`remove did not drop a row: ${before.length} -> ${afterDelete.length}`);

    const toast = await page.locator('.undo-toast').innerText();
    if (!toast.includes(before[0])) throw new Error(`toast does not name the removed category: ${toast}`);

    await page.locator('.undo-btn').click();
    await page.waitForTimeout(400);
    const afterUndo = await names(), colorsAfter = await swatches();
    if (JSON.stringify(afterUndo) !== JSON.stringify(before)) {
      throw new Error(`undo did not restore the list in order: ${JSON.stringify(before)} vs ${JSON.stringify(afterUndo)}`);
    }
    // The colour lives in a separate map from the name, so restoring only the
    // name would bring the category back grey.
    if (JSON.stringify(colorsAfter) !== JSON.stringify(colorsBefore)) {
      throw new Error('undo restored the names but not the colours');
    }
  });

  await test('dashboard: every monthly summary row reconciles with the balance beside it', async () => {
    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const grid = await page.evaluate(() => {
      const money = (t) => {
        const m = (t || '').replace(/[^0-9.+-]/g, '');
        return m === '' ? null : Math.round(parseFloat(m) * 100);
      };
      const table = [...document.querySelectorAll('table')].find((t) => /Closing Balance/i.test(t.textContent));
      if (!table) return null;
      const head = [...table.querySelectorAll('thead th')].map((h) => h.textContent.trim());
      const rows = [...table.querySelectorAll('tbody tr')].map((r) => [...r.children].map((c) => c.textContent.trim()));
      return { head, rows: rows.map((cells) => cells.map((c, i) => (i === 0 ? c : money(c)))) };
    });
    if (!grid) throw new Error('monthly summary table not found');
    const iInc = grid.head.findIndex((h) => /^Income/i.test(h));
    const iExp = grid.head.findIndex((h) => /^Expenses/i.test(h));
    const iTra = grid.head.findIndex((h) => /^Transfers/i.test(h));
    const iSur = grid.head.findIndex((h) => /Surplus/i.test(h));
    const iBal = grid.head.findIndex((h) => /Closing/i.test(h));
    if (iInc < 0 || iExp < 0 || iSur < 0 || iBal < 0) throw new Error('unexpected summary columns: ' + grid.head.join(' | '));

    const months = grid.rows.filter((r) => r[iBal] !== null);
    if (months.length !== 12) throw new Error('expected 12 month rows, got ' + months.length);

    // 1. Each row's stated surplus is the movement its own balance made.
    let prevClose = null;
    for (const r of months) {
      if (prevClose !== null) {
        const moved = r[iBal] - prevClose;
        if (moved !== r[iSur]) {
          throw new Error(`${r[0]}: balance moved ${moved} but the row says surplus ${r[iSur]}`);
        }
      }
      prevClose = r[iBal];
      // 2. And it is explained by the activity columns actually on screen.
      const explained = r[iInc] - r[iExp] + (iTra >= 0 ? (r[iTra] || 0) : 0);
      if (explained !== r[iSur]) {
        throw new Error(`${r[0]}: columns give ${explained} but the row says surplus ${r[iSur]}`);
      }
    }

    // 3. The Annual Total row is the sum of the months, not a re-derivation
    //    that can drift from them.
    const total = grid.rows.find((r) => /Annual/i.test(r[0]));
    if (!total) throw new Error('Annual Total row not found');
    const sum = (i) => months.reduce((a, r) => a + (r[i] || 0), 0);
    for (const [label, i] of [['income', iInc], ['expenses', iExp], ['surplus', iSur]]) {
      if (total[i] !== sum(i)) throw new Error(`Annual ${label}: row says ${total[i]}, months sum to ${sum(i)}`);
    }
  });

  await test('budget monthly: an actual amount paid updates the ledger, balance and BvA without touching the plan', async () => {
    // Read the Housing actual as a starting baseline rather than assuming
    // it's exactly Rent's $1,650 — earlier tests in this shared session
    // (B13, B21) add their own one-off "QA ..." entries dated today under
    // the Housing category, so the true total varies with suite order.
    const parseMoney = (s) => Math.round(parseFloat(s.replace(/[^0-9.-]/g, '')) * 100);
    const dismissBackupNudge = async () => {
      const nudge = page.getByRole('button', { name: 'Remind me later' });
      if (await nudge.count() > 0) await nudge.click().catch(() => {});
    };
    await page.goto(BASE + '#/envelopes', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const housingRowBefore = page.locator('.bva-row', { hasText: 'Housing' }).first();
    const actualBeforeCents = parseMoney(await housingRowBefore.locator('.bva-actual-amt').innerText());

    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /^Jul$/ }).click();
    await page.waitForTimeout(400);
    await dismissBackupNudge();
    await page.getByText('Rent', { exact: true }).first().click();
    await page.locator('.modal-card').waitFor(V);
    // exact: the field's help icon is named "Help: Actual Amount Paid", which a
    // substring match picks up alongside the input itself.
    await page.getByLabel('Actual Amount Paid', { exact: true }).fill('1700.00');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(400);

    // Scheduled Amount ($1,650, i.e. the plan) is untouched, but the ledger
    // now shows the reconciled actual ($1,700) with a variance marker — which
    // means the row's text is now "Rent✎", not "Rent", so later re-lookups
    // use a substring match on the <tr> instead of the earlier exact one.
    const rentRow = page.locator('tr', { hasText: 'Rent' }).filter({ hasText: '✎' }).first();
    const rowText = await rentRow.innerText();
    if (!rowText.includes('1,700.00')) throw new Error('reconciled actual not shown in ledger row: ' + rowText);

    await dismissBackupNudge();
    await rentRow.click();
    await page.locator('.modal-card').waitFor(V);
    const scheduledAmount = await page.locator('#oem-amount').inputValue();
    if (scheduledAmount !== '1650') throw new Error('scheduled Amount field was overwritten by the actual: ' + scheduledAmount);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.goto(BASE + '#/envelopes', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const housingRowAfter = page.locator('.bva-row', { hasText: 'Housing' }).first();
    const actualAfterCents = parseMoney(await housingRowAfter.locator('.bva-actual-amt').innerText());
    if (actualAfterCents - actualBeforeCents !== 5000) {
      throw new Error(`BvA actual did not pick up the $50 reconciliation: before=${actualBeforeCents} after=${actualAfterCents}`);
    }

    // Reset back to the scheduled amount so later tests see the original fixture.
    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /^Jul$/ }).click();
    await page.waitForTimeout(400);
    await dismissBackupNudge();
    await page.locator('tr', { hasText: 'Rent' }).filter({ hasText: '✎' }).first().click();
    await page.locator('.modal-card').waitFor(V);
    await page.getByRole('button', { name: /Reset entry/ }).click();
    await page.waitForTimeout(300);
  });

  await test('settings: the notifications toggle requests browser permission and reveals delivery options', async () => {
    // grantPermissions(['notifications']) needs the Notification API to
    // actually exist in this browser build — some headless Chromium builds
    // (e.g. the one CI downloads fresh, vs. a pinned local build) don't
    // expose it, and the app already handles that by showing a "not
    // supported" message instead of a broken toggle (see notifSupported in
    // settings.js). So branch on which case we're in rather than assuming.
    const step = async (label, fn) => {
      try {
        return await fn();
      } catch (e) {
        throw new Error(`[${label}] ` + String(e.message || e).split('\n')[0].slice(0, 90));
      }
    };
    await step('grant', () => ctx.grantPermissions(['notifications']).catch(() => {}));
    await step('goto', () => page.goto(BASE + '#/you', { waitUntil: 'load' }));
    // This test is only about the Settings toggle's permission-request flow.
    // App.js has its own separate effect that fires a *real* Notification
    // for low-balance/due-bill conditions once notifyEnabled flips on, and
    // this suite's shared fixture (accumulated by earlier B* tests) can
    // easily have one of those conditions true by now. Pre-marking both as
    // "already notified today" keeps that unrelated effect from ever
    // constructing a real Notification here, so this test can't be
    // confounded by however slow/flaky real notification delivery is in a
    // given headless browser. (addInitScript wouldn't apply here since this
    // goto is a same-document hash navigation, not a fresh document load.)
    await page.evaluate(() => {
      try {
        const d = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        sessionStorage.setItem('cf_notified_lowbal', d);
        sessionStorage.setItem('cf_notified_duebills', d);
        sessionStorage.setItem('cf_notified_duetoday', d);
      } catch (e) {
      }
    });
    await page.waitForTimeout(800);
    await step('heading', () => page.locator('#sec-notifications').first().waitFor(V));
    const notifSupported = await page.evaluate(() => typeof Notification !== 'undefined');
    if (!notifSupported) {
      await step('unsupported-msg', () => page.getByText("doesn't support notifications", { exact: false }).first().waitFor(V));
      return;
    }
    const toggle = page.getByRole('switch', { name: 'Enable notifications' });
    await step('toggle-visible', () => toggle.waitFor(V));
    if (await toggle.getAttribute('aria-checked') !== 'false') throw new Error('expected notifications to start off');
    await step('click-on', () => toggle.click());
    await page.waitForTimeout(400);
    if (await toggle.getAttribute('aria-checked') !== 'true') throw new Error('toggle did not turn on once permission was granted');
    await step('on-text', async () => {
      try {
        await page.getByText('On', { exact: true }).first().waitFor(V);
      } catch (e) {
        const secText = await page.locator('#sec-notifications').innerText().catch(() => 'ERR');
        throw new Error('label mismatch, sec=' + JSON.stringify(secText.slice(0, 60)));
      }
    });
    // Turning it on reveals the background-delivery controls: the per-device
    // alert time, and a line saying whether alerts can reach a closed app.
    await step('delivery-time', () => page.locator('#notify-hour-select').waitFor(V));
    await step('push-status', async () => {
      const txt = await page.locator('#sec-notifications').innerText();
      if (!/while the app is open|background delivery/i.test(txt)) {
        throw new Error('no background-delivery status, sec=' + JSON.stringify(txt.slice(0, 120)));
      }
    });
    await step('click-off', () => toggle.click());
    await page.waitForTimeout(200);
    if (await toggle.getAttribute('aria-checked') !== 'false') throw new Error('toggle did not turn back off');
    if (await page.locator('#notify-hour-select').count() !== 0) throw new Error('delivery time still shown after turning notifications off');
  });

  await test('modals: a backdrop click keeps the dialog open, only X and Cancel close it', async () => {
    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '+ Add Entry' }).first().click();
    await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
    await page.getByPlaceholder('e.g. Mortgage payment').fill('QA Backdrop Click Test');

    // Click the backdrop itself, well clear of the centered modal-card.
    await page.locator('.modal-overlay').first().click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
    if (await page.getByPlaceholder('e.g. Mortgage payment').count() === 0) {
      throw new Error('modal closed on backdrop click — should only close via X/Cancel');
    }
    const stillThere = await page.getByPlaceholder('e.g. Mortgage payment').inputValue();
    if (stillThere !== 'QA Backdrop Click Test') throw new Error('form contents were lost: ' + stillThere);

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);
    if (await page.getByPlaceholder('e.g. Mortgage payment').count() > 0) {
      throw new Error('modal did not close via Cancel button');
    }
  });

  await test('help: the account menu opens the docs and "?" jumps to the shortcuts', async () => {
    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.locator('.user-avatar-btn').click();
    await page.getByRole('button', { name: 'Help' }).click();
    await page.locator('#help-shortcuts').waitFor(V);
    const sections = await page.locator('.help-page .cf-card').count();
    if (sections < 8) throw new Error('help page rendered only ' + sections + ' sections');
    // The shortcuts moved out of their modal into this page — the modal is
    // gone, so "?" has to land here instead.
    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.keyboard.press('?');
    await page.locator('#help-shortcuts').waitFor(V);
    const keys = await page.locator('#help-shortcuts .shortcut-kbd').allInnerTexts();
    if (!keys.includes('N') || !keys.includes('?')) throw new Error('shortcut list incomplete: ' + keys.join(','));
    if (await page.locator('.shortcuts-card').count() > 0) throw new Error('the old shortcuts modal is still being rendered');
  });

  await test('routing: a non-route hash does not swallow the next real navigation', async () => {
    // The router listens for hashchange so plain links into #/help work. Hashes
    // that aren't routes — the skip link's #main-content, in-page anchors —
    // reach the same handler, and claiming the sync guard for one of those
    // used to leave the URL stuck on it through the next tab change.
    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('.skip-link').click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll('.tab-bar-btn')[1].click());
    await page.waitForTimeout(500);
    const hash = await page.evaluate(() => location.hash);
    if (!hash.startsWith('#/flow/list')) throw new Error('hash stuck at "' + hash + '" after switching to Budget');
  });

  await test('dashboard: Customize closes on Escape, like every other dialog', async () => {
    await page.goto(BASE + '#/today', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Customize/i }).first().click();
    await page.locator('.customize-modal-card').waitFor(V);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    if (await page.locator('.customize-modal-card').count() > 0) {
      await page.getByRole('button', { name: 'Done' }).click();
      throw new Error('Customize stayed open after Escape');
    }
  });

  await ctx.close();
}

// ── Desktop, dark theme spot-checks ─────────────────────────────────────────────
await test('dark mode: the active month pill stays visibly styled', async () => {
  const { ctx, page } = await ctxPage({ dark: true });
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const active = page.locator('.month-picker button[data-active="true"]').first();
  const bg = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (bg === bodyBg) throw new Error('active pill blends into background: ' + bg);
  await ctx.close();
});

await test('dark mode: charts render with theme colours', async () => {
  const { ctx, page } = await ctxPage({ dark: true });
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const n = await page.locator('.cf-card svg').count();
  if (n < 3) throw new Error('expected ≥3 chart svgs, got ' + n);
  await ctx.close();
});

// ── Mobile ───────────────────────────────────────────────────────────────
{
  const { ctx, page } = await ctxPage({ touch: true });
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await test('mobile: the bottom nav switches tabs', async () => {
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Flow' }).tap();
    await page.waitForTimeout(600);
    await page.getByText('Opening Balance', { exact: false }).first().waitFor(V);
    const cur = await page.locator('.cf-bottomnav button[aria-current="page"]').getAttribute('aria-label');
    if (cur !== 'Flow') throw new Error('aria-current on ' + cur);
  });

  await test('mobile: ledger cards show signed amounts', async () => {
    await page.getByText('-$1,650.00', { exact: false }).first().waitFor(V);
  });

  await test('mobile: the swipe tip dismisses with "Got it"', async () => {
    const btn = page.getByRole('button', { name: 'Got it' });
    if (await btn.count() === 0) return; // already dismissed — fine
    await btn.tap();
    await page.waitForTimeout(300);
    if (await btn.count() > 0) throw new Error('tip still visible');
  });

  await test('mobile: the top-right Add button opens the entry form', async () => {
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Flow' }).tap({ force: true });
    await page.waitForTimeout(400);
    await page.locator('button[title="Add Entry"]').first().tap({ force: true });
    await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
    await page.getByRole('button', { name: 'Cancel' }).first().tap({ force: true });
    await page.waitForTimeout(300);
    if (await page.locator('.modal-overlay').count() > 0) throw new Error('add-entry modal did not close');
  });

  // The quick-add FAB was removed once every grid grew its own "+ Add" button
  // in the export toolbar — two ways to do the same thing, one of them parked
  // permanently over the balance column. This guards the removal: an add
  // affordance that floats over the content is a regression, not a feature.
  await test('mobile: nothing floats over the content offering to add an entry', async () => {
    for (const tab of ['dashboard', 'budget']) {
      await page.locator('.cf-bottomnav').getByRole('button', { name: tab === 'today' ? 'Today' : 'Flow' }).tap({ force: true });
      await page.waitForTimeout(500);
      if (await page.locator('.cf-fab').count() > 0) throw new Error('floating add button back on ' + tab);
    }
  });

  // Every phone width used to be draggable ~60px sideways onto blank page,
  // because two *closed* help bubbles in Settings still counted toward the
  // scroll container's overflow. Checked on every tab, since the same class of
  // bug (a grid track floored at min-content, a row that can't wrap) has now
  // produced it three times in three different places.
  await test('mobile: no tab scrolls sideways onto blank page', async () => {
    for (const [tab, label] of [['today', 'Today'], ['flow', 'Flow'], ['envelopes', 'Envelopes'], ['plan', 'Plan']]) {
      await page.locator('.cf-bottomnav').getByRole('button', { name: label }).tap({ force: true });
      await page.waitForTimeout(600);
      const slop = await page.evaluate(() => {
        const sc = document.querySelector('.app-scroll');
        const doc = document.documentElement;
        return Math.max(sc ? sc.scrollWidth - sc.clientWidth : 0, doc.scrollWidth - doc.clientWidth);
      });
      if (slop > 1) throw new Error(tab + ' overflows by ' + slop + 'px');
    }
  });

  // A help bubble is up to 272px wide and hangs off a 15px control, so on a
  // 393px screen neither edge alignment fits — it has to slide until both ends
  // are on screen. It used to run off the right edge, taking the last line of
  // the explanation with it.
  await test('mobile: an opened help tip stays inside the viewport', async () => {
    // Settings is behind the avatar now, not in the bottom nav, so this is
    // also the check that the only route into it works on a phone.
    await page.locator('.user-avatar-btn').tap({ force: true });
    await page.waitForTimeout(300);
    await page.locator('.user-menu-panel button', { hasText: 'Settings' }).first().tap({ force: true });
    await page.waitForTimeout(700);
    const tips = page.locator('.helptip-btn');
    const n = await tips.count();
    if (n === 0) throw new Error('no help tips on You');
    for (let i = 0; i < n; i++) {
      const btn = tips.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await btn.evaluate((el) => el.click());
      await page.waitForTimeout(250);
      const box = await page.evaluate(() => {
        const b = document.querySelector('.helptip-bubble.is-open');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { left: r.left, right: r.right, vw: document.documentElement.clientWidth };
      });
      if (!box) throw new Error('tip ' + i + ' did not open');
      if (box.left < -1 || box.right > box.vw + 1) throw new Error(`tip ${i} spans ${Math.round(box.left)}–${Math.round(box.right)} in a ${box.vw}px viewport`);
      await btn.evaluate((el) => el.click());
      await page.waitForTimeout(150);
    }
  });

  await test('mobile: settings hides biometric unlock on a device with no authenticator', async () => {
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.getByText('Auto-lock when in background', { exact: false }).waitFor(V);
    // headless chromium: no platform authenticator → toggle must be absent
    if (await page.getByText('Unlock with fingerprint / face').count() > 0) throw new Error('biometric toggle shown without authenticator');
  });

  await ctx.close();
}

await test('mobile dark mode: the active nav item is highlighted, not dimmed', async () => {
  const { ctx, page } = await ctxPage({ touch: true, dark: true });
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const activeColor = await page.locator('.cf-bottomnav button[aria-current="page"]').evaluate((el) => getComputedStyle(el).color);
  const inactiveColor = await page.locator('.cf-bottomnav button:not([aria-current])').first().evaluate((el) => getComputedStyle(el).color);
  const lum = (c) => { const m = c.match(/\d+/g); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  if (lum(activeColor) <= lum(inactiveColor)) throw new Error(`active ${activeColor} darker than inactive ${inactiveColor}`);
  await ctx.close();
});

// Daily was cut from a phone because it restated the ledger one row per day.
// Calendar does not restate anything, so it renders at both widths.
await test('mobile: the Calendar lens renders on a phone, unlike the Daily view it replaced', async () => {
  const { ctx, page } = await ctxPage({ touch: true });
  await page.goto(BASE + '#/flow/calendar', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Calendar' }).waitFor(V);
  if (await page.locator('.cal-grid').count() !== 1) throw new Error('no calendar grid at phone width');
  // The phone cell trades the event lines for a dot per event; both are the
  // same day, so the grid is the same 7 columns either way.
  const cols = await page.locator('.cal-row').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  if (cols !== 7) throw new Error(`calendar has ${cols} columns on a phone, not 7`);
  if (await page.locator('.cal-dots').first().isVisible() !== true) throw new Error('phone cells show no event dots');
  await ctx.close();
});

// A keyboard shortcut renders nothing, so a rename can retire the route it
// points at and leave no visible trace: the digit map still said "budget" and
// "settings" long after those tabs became Flow and You, and pressing 2 wrote a
// dead hash and dropped you on Today. Every shortcut is asserted to land on a
// route the router actually has.
await test('keyboard: every tab shortcut lands on a real destination', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const moves = [
    ['1', '#/today'], ['2', '#/flow/list'], ['3', '#/envelopes'], ['4', '#/plan/'],
    ['d', '#/today'], ['b', '#/flow/'], ['p', '#/plan/'], ['a', '#/plan/insights'],
    ['s', '#/you'], ['f', '#/flow/curve'], ['r', '#/flow/entries']
  ];
  const wrong = [];
  for (const [key, prefix] of moves) {
    await page.keyboard.press(key);
    await page.waitForTimeout(350);
    const hash = await page.evaluate(() => location.hash);
    if (!hash.startsWith(prefix)) wrong.push(`${key} -> ${hash}, expected ${prefix}*`);
  }
  await ctx.close();
  if (wrong.length) throw new Error(wrong.join('; '));
});

// Bookmarks, shared links and home-screen shortcuts outlive an information
// architecture. Every route the app has ever published is in LEGACY_ROUTES,
// and a link that quietly lands on the home screen is worse than one that
// errors, because nothing tells you it went wrong — so each mapping is
// asserted rather than assumed.
await test('every retired route still lands where its view moved to', async () => {
  const { ctx, page } = await ctxPage();
  const moves = [
    ['#/dashboard', '#/today'],
    ['#/budget', '#/flow/list'],
    ['#/budget/monthly', '#/flow/list'],
    ['#/budget/daily', '#/flow/list'],
    ['#/budget/calendar', '#/flow/calendar'],
    ['#/budget/forecast', '#/flow/curve'],
    ['#/budget/entries', '#/flow/entries'],
    ['#/budget/bva', '#/envelopes'],
    ['#/ai', '#/plan/insights'],
    ['#/settings', '#/you']
  ];
  const wrong = [];
  for (const [from, to] of moves) {
    await page.goto(BASE + from, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const hash = await page.evaluate(() => location.hash);
    if (hash !== to) wrong.push(`cold load ${from} -> ${hash}, expected ${to}`);
  }
  // Now the same list without reloading between them: an old link tapped while
  // the app is already open, which is the commoner case and the one that broke.
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  for (const [from, to] of moves) {
    await page.evaluate((h) => { location.hash = h.slice(1); }, from);
    await page.waitForTimeout(400);
    const hash = await page.evaluate(() => location.hash);
    if (hash !== to) wrong.push(`in-app ${from} -> ${hash}, expected ${to}`);
  }
  await ctx.close();
  if (wrong.length) throw new Error(wrong.join('; '));
});

// ── Auth surfaces ────────────────────────────────────────────────────────
await test('auth: the login screen renders when signed out', async () => {
  const { ctx, page } = await ctxPage({ loggedIn: false });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.getByText('Sign in to your account', V).waitFor(V);
  await page.getByPlaceholder('your@email.com').waitFor(V);
  await ctx.close();
});

await test('auth: the login screen switches to create-account mode', async () => {
  const { ctx, page } = await ctxPage({ loggedIn: false });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.getByText('Create account', { exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Create account/ }).first().waitFor(V);
  await ctx.close();
});

// ── Money schema migration (schema v8: dollars -> cents) ────────────────
// Every other test's fixture payload declares schemaVersion: 999, so it's
// taken as already-cents and never exercises the upgrade path. This test
// simulates a real existing household's save from before this migration
// shipped — no schemaVersion field, amounts still dollar-scale — the exact
// shape applyPayload's migrateHouseholdPayload (household-sync.js) must
// catch and convert on load.
await test('migration: a pre-v8 dollar-scale cloud payload is upgraded to cents on display', async () => {
  const oldPayload = {
    entries: [{ id: 1, desc: 'Old Format Rent', type: 'expense', amount: 1234.56, category: 'Housing', repeats: false, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-05', notes: '' }],
    overridesByYr: {}, yearConfigs: [{ year: 2026, openingBalance: 5000 }], budgetTargets: {}, templates: [],
    completed: {}, activeYear: 2026, alertThreshold: 500, darkMode: false, goals: [], dashHidden: {}, dashOrder: []
    // schemaVersion intentionally omitted
  };
  const members = [{ user_id: 'u-demo', full_name: 'Demo User', disabled: false, role: 'owner', joined_at: '2026-01-01T00:00:00Z' }];
  const stub = `
  (() => {
    const session = { user: { id: 'u-demo', email: 'demo@example.com' }, access_token: 'demo' };
    const payload = ${JSON.stringify(oldPayload)};
    const members = ${JSON.stringify(members)};
    const resolved = (data) => Promise.resolve({ data, error: null });
    function chain(table) {
      const c = {};
      for (const m of ['select','eq','limit','order','update','insert','delete','neq','in']) {
        c[m] = () => { if (m === 'order') return resolved(table === 'household_members' ? members : []); return c; };
      }
      c.maybeSingle = () => resolved(table === 'household_members' ? { household_id: 'hh-demo' } : { id: 'hh-demo', name: 'Demo Household' });
      c.single = c.maybeSingle;
      c.then = (res, rej) => resolved(null).then(res, rej);
      return c;
    }
    const fakeClient = {
      auth: {
        getSession: () => resolved({ session }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
        signOut: () => resolved(null),
      },
      from: (t) => chain(t),
      rpc: (name) => name === 'load_household' ? resolved({ data: payload, receipts: [] }) : resolved(null),
      channel: () => { const ch = { on: () => ch, subscribe: () => ({ unsubscribe(){} }) }; return ch; },
      removeChannel(){},
    };
    const fake = { createClient: () => fakeClient };
    Object.defineProperty(window, 'supabase', { get: () => fake, set: () => {} });
  })();
  `;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.addInitScript(stub);
  await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
  await page.getByText('Old Format Rent', { exact: false }).first().waitFor(V);
  await page.getByText('-$1,234.56', { exact: false }).first().waitFor(V);
  const wrongScale = await page.getByText('$123,456', { exact: false }).count();
  if (wrongScale > 0) throw new Error('pre-v8 payload was not upgraded — rendered 100x too large');
  await ctx.close();
});

// ── Field-level help ────────────────────────────────────────────────────────
await test('help tips: a field explains itself on hover instead of in permanent body copy', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '+ Add Entry' }).first().click();
  await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
  await page.getByRole('switch', { name: 'Repeats' }).click();
  await page.waitForTimeout(300);

  const tip = page.getByRole('button', { name: 'Help: Until' });
  await tip.waitFor(V);
  const bubble = page.locator('#' + (await tip.getAttribute('aria-describedby')));
  if (await bubble.isVisible()) throw new Error('the help bubble is showing before anyone asked for it');
  // The copy it replaced must not also still be sitting under the field.
  const form = page.locator('.modal-card').first();
  if ((await form.innerText()).includes('Leave blank to recur indefinitely')) {
    throw new Error('the old inline hint is still rendered as body copy');
  }

  await tip.hover();
  await page.waitForTimeout(250);
  if (!(await bubble.isVisible())) throw new Error('hovering the help icon did not open the bubble');
  if (!/Leave blank to recur indefinitely/.test(await bubble.innerText())) {
    throw new Error('bubble does not carry the field help: ' + (await bubble.innerText()).slice(0, 80));
  }
  if (await tip.getAttribute('aria-expanded') !== 'true') throw new Error('aria-expanded stayed false while open');

  // Keyboard: focus opens it, Escape closes it — and Escape must not take the
  // form down with it.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await tip.focus();
  await page.waitForTimeout(200);
  if (!(await bubble.isVisible())) throw new Error('focusing the help icon did not open the bubble');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  if (await bubble.isVisible()) throw new Error('Escape did not close the bubble');
  if (await page.getByPlaceholder('e.g. Mortgage payment').count() === 0) {
    throw new Error('Escape closed the whole entry form, losing what was typed');
  }
  await page.getByRole('button', { name: 'Cancel' }).first().click();
  await ctx.close();
});

// ── Weekend payroll deposits ─────────────────────────────────────────────
// Its own fixture rather than an addition to the shared one: this needs a
// payroll entry on a date whose weekday matters (Aug 15 2026 is a Saturday),
// and dropping one into the shared payload would move every balance the B*
// tests read. The date maths itself is pinned by the built-in self-tests
// (A1); what this checks is that the ledger renders the adjusted date, the
// row explains itself, and the entry definition is left on the real payday.
await test('payroll: a payday on a weekend or a stat holiday stays put and is marked with its deposit date', async () => {
  const payload = {
    entries: [
      { id: 1, desc: 'Ken - Payroll (15th)', type: 'income', amount: 250000, category: 'Income', repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-15', notes: '' },
      { id: 2, desc: 'Rent', type: 'expense', amount: 165000, category: 'Housing', repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-05', notes: '' },
      { id: 3, desc: 'Mel - Payroll (1st)', type: 'income', amount: 180000, category: 'Income', repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-01', notes: '' },
    ],
    overridesByYr: {}, yearConfigs: [{ year: 2026, openingBalance: 500000 }], budgetTargets: {}, templates: [],
    completed: {}, activeYear: 2026, alertThreshold: 50000, darkMode: false, goals: [], dashHidden: {}, dashOrder: [],
    schemaVersion: 999,
  };
  const stub = `
  (() => {
    const session = { user: { id: 'u-demo', email: 'demo@example.com' }, access_token: 'demo' };
    const payload = ${JSON.stringify(payload)};
    const members = [{ user_id: 'u-demo', full_name: 'Demo User', disabled: false, role: 'owner', joined_at: '2026-01-01T00:00:00Z' }];
    const resolved = (data) => Promise.resolve({ data, error: null });
    function chain(table) {
      const c = {};
      for (const m of ['select','eq','limit','order','update','insert','delete','neq','in']) {
        c[m] = () => { if (m === 'order') return resolved(table === 'household_members' ? members : []); return c; };
      }
      c.maybeSingle = () => resolved(table === 'household_members' ? { household_id: 'hh-demo' } : { id: 'hh-demo', name: 'Demo Household' });
      c.single = c.maybeSingle;
      c.then = (res, rej) => resolved(null).then(res, rej);
      return c;
    }
    const fakeClient = {
      auth: { getSession: () => resolved({ session }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: () => resolved(null) },
      from: (t) => chain(t),
      rpc: (name) => name === 'load_household' ? resolved({ data: payload, receipts: [] }) : resolved(null),
      channel: () => { const ch = { on: () => ch, subscribe: () => ({ unsubscribe(){} }) }; return ch; },
      removeChannel(){},
    };
    Object.defineProperty(window, 'supabase', { get: () => ({ createClient: () => fakeClient }), set: () => {} });
  })();
  `;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.addInitScript(stub);

  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^Aug$/ }).click();
  await page.waitForTimeout(500);

  // The row stays on the payday — moving it would drag the money into
  // another month's totals, which is the whole reason it doesn't move.
  const payRow = page.locator('tr', { hasText: 'Ken - Payroll (15th)' }).first();
  const dayCell = payRow.locator('.budget-day-cell');
  const dayText = (await dayCell.innerText()).trim();
  if (!dayText.startsWith('15')) throw new Error('the payday moved off the 15th: day cell reads ' + JSON.stringify(dayText));
  // Both paycheques are still counted in August, which is the point of not
  // moving them: $2,500 on the 15th + $1,800 on the 1st.
  const totalsRow = page.locator('tr', { hasText: /monthly totals/i }).first();
  const totals = await totalsRow.innerText();
  if (!totals.includes('4,300')) throw new Error("August's income total changed: " + totals.replace(/\s+/g, ' '));

  // ...and the marker beside it says when the money actually lands.
  const mark = dayCell.locator('.helptip-btn--mark');
  if (await mark.count() === 0) throw new Error('no deposit-date marker on a payday that falls on a Saturday');
  const bubble = page.locator('#' + (await mark.getAttribute('aria-describedby')));
  if (await bubble.isVisible()) throw new Error('the marker bubble is open before anyone asked');
  await mark.hover();
  await page.waitForTimeout(250);
  const why = await bubble.innerText();
  if (!/Fri Aug 14/.test(why)) throw new Error('marker does not name the deposit date: ' + why);
  if (!/weekend/i.test(why)) throw new Error('marker does not say why: ' + why);

  // September's 15th is a Tuesday — no marker at all.
  await page.getByRole('button', { name: /^Sep$/ }).click();
  await page.waitForTimeout(500);
  const sepRow = page.locator('tr', { hasText: 'Ken - Payroll (15th)' }).first();
  if (!(await sepRow.locator('.budget-day-cell').innerText()).trim().startsWith('15')) throw new Error('a weekday payday moved off the 15th');
  if (await sepRow.locator('.helptip-btn--mark').count() > 0) throw new Error('a weekday payday got a deposit marker');

  // A BC statutory holiday counts the same as a weekend: Canada Day 2026 is a
  // Wednesday, so a 1 July payday is in the account on Tuesday 30 June.
  await page.getByRole('button', { name: /^Jul$/ }).click();
  await page.waitForTimeout(500);
  const holRow = page.locator('tr', { hasText: 'Mel - Payroll (1st)' }).first();
  if (!(await holRow.locator('.budget-day-cell').innerText()).trim().startsWith('1')) throw new Error('the Canada Day payday moved off the 1st');
  const holMark = holRow.locator('.helptip-btn--mark');
  if (await holMark.count() === 0) throw new Error('no marker on a payday that falls on Canada Day');
  await holMark.hover();
  await page.waitForTimeout(250);
  const holWhy = await page.locator('#' + (await holMark.getAttribute('aria-describedby'))).innerText();
  if (!/Canada Day/.test(holWhy) || !/Tue Jun 30/.test(holWhy)) throw new Error('marker does not name the holiday and the deposit date: ' + holWhy);

  // The entry itself still pays on the 15th — only the marker moved.
  await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const entryRow = page.locator('tr', { hasText: 'Ken - Payroll (15th)' }).first();
  if (!/Jan 15,? 2026/.test(await entryRow.innerText())) throw new Error("the recurring entry's date was rewritten: " + await entryRow.innerText());
  await ctx.close();
});

// ── Statutory holidays in Settings ──────────────────────────────────────────
// One fixture, two tests: the holiday list is household data now, so what
// matters is that Settings can see and change it and that a change reaches the
// budget. The API is stubbed — the real one is a third party, and a suite that
// depends on it fails for reasons that have nothing to do with this code.
const holidayFixture = () => {
  const payload = {
    entries: [
      { id: 1, desc: 'Ken - Payroll (15th)', type: 'income', amount: 250000, category: 'Income', repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-15', notes: '' },
    ],
    overridesByYr: {}, yearConfigs: [{ year: 2026, openingBalance: 500000 }], budgetTargets: {}, templates: [],
    completed: {}, activeYear: 2026, alertThreshold: 50000, darkMode: false, goals: [], dashHidden: {}, dashOrder: [],
    schemaVersion: 999,
  };
  return `
  (() => {
    const session = { user: { id: 'u-demo', email: 'demo@example.com' }, access_token: 'demo' };
    const payload = ${JSON.stringify(payload)};
    const members = [{ user_id: 'u-demo', full_name: 'Demo User', disabled: false, role: 'owner', joined_at: '2026-01-01T00:00:00Z' }];
    const resolved = (data) => Promise.resolve({ data, error: null });
    function chain(table) {
      const c = {};
      for (const m of ['select','eq','limit','order','update','insert','delete','neq','in']) {
        c[m] = () => { if (m === 'order') return resolved(table === 'household_members' ? members : []); return c; };
      }
      c.maybeSingle = () => resolved(table === 'household_members' ? { household_id: 'hh-demo' } : { id: 'hh-demo', name: 'Demo Household' });
      c.single = c.maybeSingle;
      c.then = (res, rej) => resolved(null).then(res, rej);
      return c;
    }
    const fakeClient = {
      auth: { getSession: () => resolved({ session }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: () => resolved(null) },
      from: (t) => chain(t),
      rpc: (name) => name === 'load_household' ? resolved({ data: payload, receipts: [] }) : resolved(null),
      channel: () => { const ch = { on: () => ch, subscribe: () => ({ unsubscribe(){} }) }; return ch; },
      removeChannel(){},
    };
    Object.defineProperty(window, 'supabase', { get: () => ({ createClient: () => fakeClient }), set: () => {} });

    // Stand in for canada-holidays.ca. 15 Sep 2026 is an ordinary Tuesday by
    // every rule the app knows, so a marker on it can only have come from here.
    window.__holidayFetches = [];
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.includes('canada-holidays.ca')) {
        window.__holidayFetches.push(url);
        const year = Number((url.match(/year=(\\d{4})/) || [])[1]);
        const holidays = year === 2026
          ? [{ id: 99, date: '2026-09-15', observedDate: '2026-09-15', nameEn: 'Test Proclaimed Holiday', optional: 0 }]
          : [];
        return Promise.resolve(new Response(JSON.stringify({ province: { id: 'BC', holidays } }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }
      return realFetch(input, init);
    };
  })();
  `;
};

await test('holidays: Settings lists the BC dates the app is using, and a manual one reaches the budget', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.addInitScript(holidayFixture());

  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const section = page.locator('#sec-holidays');
  await section.scrollIntoViewIfNeeded();
  const rowCount = await section.locator('.holiday-row').count();
  if (rowCount < 12) throw new Error('expected the BC list, got ' + rowCount + ' rows');
  if (!(await section.innerText()).includes('Canada Day')) throw new Error('Canada Day is missing from the list');
  if (!(await section.innerText()).includes('built-in')) throw new Error('an untouched year should say it is using the built-in rules');
  // BC's optional holidays are in the list and labelled as such.
  const boxing = section.locator('.holiday-row', { hasText: 'Boxing Day' }).first();
  if (await boxing.locator('.holiday-chip--optional').count() === 0) throw new Error('Boxing Day is not marked optional');

  // Add one by hand on a date the rules would never produce: 16 Sep 2026 is a
  // Wednesday, so the 15th (a Tuesday payday) becomes the last banking day
  // before it only if this holiday actually took effect... and 15 Sep is the
  // payday itself, so mark the 15th and expect the deposit on the 14th.
  await section.getByRole('button', { name: '+ Add holiday' }).click();
  await page.locator('#holiday-date').fill('2026-09-15');
  await page.locator('#holiday-name').fill('QA Company Shutdown');
  await section.getByRole('button', { name: 'Add holiday' }).click();
  await page.waitForTimeout(400);
  const added = section.locator('.holiday-row', { hasText: 'QA Company Shutdown' }).first();
  await added.waitFor(V);
  if (await added.locator('.holiday-chip--manual').count() === 0) throw new Error('a hand-added holiday is not labelled as one');
  if (!(await section.innerText()).includes('saved in your household')) throw new Error('the year did not become household-stored after an edit');

  // It reaches the budget: the September payday is now marked.
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Sep$/ }).click();
  await page.waitForTimeout(500);
  const row = page.locator('tr', { hasText: 'Ken - Payroll (15th)' }).first();
  const mark = row.locator('.helptip-btn--mark');
  if (await mark.count() === 0) throw new Error('the manual holiday never reached the budget');
  await mark.hover();
  await page.waitForTimeout(250);
  const why = await page.locator('#' + (await mark.getAttribute('aria-describedby'))).innerText();
  if (!/QA Company Shutdown/.test(why)) throw new Error('marker does not name the manual holiday: ' + why);
  if (!/Mon Sep 14/.test(why)) throw new Error('deposit date not worked out from the manual holiday: ' + why);

  // Removing it puts the payday back to depositing on the day.
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await section.scrollIntoViewIfNeeded();
  await section.locator('.holiday-row', { hasText: 'QA Company Shutdown' }).getByRole('button', { name: /Remove/ }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).last().click();
  await page.waitForTimeout(400);
  if (await section.locator('.holiday-row', { hasText: 'QA Company Shutdown' }).count() > 0) throw new Error('the holiday was not removed');
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Sep$/ }).click();
  await page.waitForTimeout(500);
  if (await page.locator('tr', { hasText: 'Ken - Payroll (15th)' }).first().locator('.helptip-btn--mark').count() > 0) {
    throw new Error('the marker survived removing the holiday');
  }
  await ctx.close();
});

await test('holidays: fetching a year on demand replaces the list and re-marks the budget', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.addInitScript(holidayFixture());

  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const section = page.locator('#sec-holidays');
  await section.scrollIntoViewIfNeeded();
  // Nothing is fetched until asked — an automatic refresh would overwrite
  // hand-corrected dates and sync that to the whole household.
  if ((await page.evaluate(() => window.__holidayFetches || [])).length !== 0) {
    throw new Error('the app fetched holidays without being asked');
  }
  await section.getByRole('button', { name: /Fetch 2026 for BC from canada-holidays\.ca/ }).click();
  await page.getByRole('button', { name: 'Fetch', exact: true }).click();
  await page.waitForTimeout(700);
  const asked = await page.evaluate(() => window.__holidayFetches || []);
  if (!asked.some((u) => /year=2026/.test(u) && /optional=true/.test(u))) {
    throw new Error('fetch did not ask for 2026 including optional holidays: ' + JSON.stringify(asked));
  }
  if (!/1 dates for 2026|dates for 2026/.test(await section.innerText())) throw new Error('no result reported after fetching');
  const fetched = section.locator('.holiday-row', { hasText: 'Test Proclaimed Holiday' }).first();
  await fetched.waitFor(V);
  if (await fetched.locator('.holiday-chip--published').count() === 0) throw new Error('a fetched date is not labelled published');
  // The published list replaces the computed one outright.
  if ((await section.innerText()).includes('Canada Day')) throw new Error('the computed list survived a fetch that did not include it');

  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Sep$/ }).click();
  await page.waitForTimeout(500);
  const mark = page.locator('tr', { hasText: 'Ken - Payroll (15th)' }).first().locator('.helptip-btn--mark');
  if (await mark.count() === 0) throw new Error('the fetched holiday never reached the budget');
  await mark.hover();
  await page.waitForTimeout(250);
  const why = await page.locator('#' + (await mark.getAttribute('aria-describedby'))).innerText();
  if (!/Test Proclaimed Holiday/.test(why)) throw new Error('marker does not name the fetched holiday: ' + why);
  await ctx.close();
});

// ── Vendored libraries ──────────────────────────────────────────────────────
await test('vendor: the Supabase client bundle exposes the API the app calls', async () => {
  // Every other test replaces window.supabase with a stub, so a broken or
  // mis-regenerated vendor file would sail straight through the suite. This
  // one loads the file on its own — no app, no network — and checks the shape
  // the app actually depends on. (The React bundle has the equivalent already:
  // the in-page self-tests render real components against it.)
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ path: join(ROOT, 'src', 'vendor', 'supabase-client.js') });

  const shape = await page.evaluate(() => {
    const sb = window.supabase;
    if (!sb || typeof sb.createClient !== 'function') return { loaded: false };
    // A syntactically valid URL and a dummy key: constructing a client makes no
    // request, so this never touches a real project.
    const c = sb.createClient('https://example.supabase.co', 'not-a-real-key');
    const table = c.from('entries');
    // Two levels, matching how the app chains them:
    //   from(t).select(...).eq(...).limit(...).maybeSingle()
    const filter = table.select('*');
    return {
      loaded: true,
      auth: ['getSession', 'onAuthStateChange', 'signOut', 'signInWithPassword', 'resetPasswordForEmail']
        .filter((m) => !c.auth || typeof c.auth[m] !== 'function'),
      table: ['select', 'insert', 'update', 'delete', 'upsert']
        .filter((m) => typeof table[m] !== 'function'),
      filter: ['eq', 'neq', 'in', 'limit', 'order', 'maybeSingle', 'single', 'then']
        .filter((m) => typeof filter[m] !== 'function'),
      rpc: typeof c.rpc === 'function',
      channel: typeof c.channel === 'function' && typeof c.removeChannel === 'function',
    };
  });

  if (!shape.loaded) throw new Error('the vendored bundle did not define window.supabase.createClient');
  if (shape.auth.length) throw new Error('auth methods missing from the client: ' + shape.auth.join(', '));
  if (shape.table.length) throw new Error('table-builder methods missing: ' + shape.table.join(', '));
  if (shape.filter.length) throw new Error('filter-builder methods missing: ' + shape.filter.join(', '));
  if (!shape.rpc) throw new Error('client.rpc is missing — every load and save goes through it');
  if (!shape.channel) throw new Error('client.channel/removeChannel are missing');
  await ctx.close();
});

// ── Sync ────────────────────────────────────────────────────────────────────
// A stateful stand-in for the backend: save_household stores the payload and
// bumps savedAt, load_household returns whatever was saved last, and the
// conflict check behaves like the SQL — a save quoting a savedAt that no
// longer matches is rejected. `saveDelay` makes the request slow enough to
// still be in the air while the next edit is made, which is the whole point.
const syncFixture = (saveDelay = 0) => {
  const seed = {
    entries: [{ id: 1, desc: 'Seed Rent', type: 'expense', amount: 165000, category: 'Housing', repeats: true, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-05', notes: '' }],
    overridesByYr: {}, yearConfigs: [{ year: 2026, openingBalance: 500000 }], budgetTargets: {}, templates: [],
    completed: {}, activeYear: 2026, alertThreshold: 50000, darkMode: false, goals: [], dashHidden: {}, dashOrder: [],
    schemaVersion: 999, savedAt: '2026-08-14T00:00:00.000Z',
  };
  return `
  (() => {
    const session = { user: { id: 'u-demo', email: 'demo@example.com' }, access_token: 'demo' };
    const members = [{ user_id: 'u-demo', full_name: 'Demo User', disabled: false, role: 'owner', joined_at: '2026-01-01T00:00:00Z' }];
    const store = { data: ${JSON.stringify(seed)} };
    window.__saves = [];
    window.__conflicts = 0;
    const resolved = (data) => Promise.resolve({ data, error: null });
    function chain(table) {
      const c = {};
      for (const m of ['select','eq','limit','order','update','insert','delete','neq','in']) {
        c[m] = () => { if (m === 'order') return resolved(table === 'household_members' ? members : []); return c; };
      }
      c.maybeSingle = () => resolved(table === 'household_members' ? { household_id: 'hh-demo' } : { id: 'hh-demo', name: 'Demo Household' });
      c.single = c.maybeSingle;
      c.then = (res, rej) => resolved(null).then(res, rej);
      return c;
    }
    const fakeClient = {
      auth: { getSession: () => resolved({ session }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: () => resolved(null) },
      from: (t) => chain(t),
      rpc: (name, args) => {
        if (name === 'load_household') return resolved({ data: JSON.parse(JSON.stringify(store.data)), receipts: [] });
        if (name === 'save_household') {
          const expected = args && args.p_expected_saved_at;
          const payload = (args && args.p_data) || {};
          const commit = () => {
            if (expected && expected !== store.data.savedAt) {
              window.__conflicts++;
              return { data: null, error: { message: 'CONFLICT: household data changed since you last loaded it.' } };
            }
            const savedAt = new Date().toISOString();
            store.data = Object.assign({}, payload, { savedAt });
            window.__saves.push({ entries: (payload.entries || []).length, holidays: payload.holidays || null });
            return { data: savedAt, error: null };
          };
          return ${saveDelay} ? new Promise((res) => setTimeout(() => res(commit()), ${saveDelay})) : Promise.resolve(commit());
        }
        return resolved(null);
      },
      channel: () => { const ch = { on: () => ch, subscribe: () => ({ unsubscribe(){} }) }; return ch; },
      removeChannel(){},
    };
    Object.defineProperty(window, 'supabase', { get: () => ({ createClient: () => fakeClient }), set: () => {} });
  })();
  `;
};

const addEntryVia = async (page, desc, amount) => {
  await page.getByRole('button', { name: '+ Add Entry' }).first().click();
  await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
  await page.getByPlaceholder('e.g. Mortgage payment').fill(desc);
  await page.getByPlaceholder('0.00').first().fill(amount);
  await page.locator('#ef-category').selectOption({ label: 'Housing' });
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  await page.getByRole('button', { name: 'Save Entry' }).click();
  await page.waitForTimeout(400);
};

await test('sync: an entry added while a save is still in flight is not swallowed by a self-inflicted conflict', async () => {
  // The bug this pins: two overlapping saves both quote the savedAt they
  // loaded with, the second loses its own conflict check, and the CONFLICT
  // branch recovers by reloading — throwing away the newer entry a few
  // seconds after it was added, blaming another device for it.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.addInitScript(syncFixture(4000));

  await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await addEntryVia(page, 'QA First Entry', '42.00');
  // 2s debounce + a slow request: the first save is now in the air.
  await page.waitForTimeout(2600);
  await addEntryVia(page, 'QA Second Entry', '7.00');

  // Long enough for both saves to have run to completion.
  await page.waitForTimeout(12000);
  if (await page.getByText('QA Second Entry').count() === 0) {
    throw new Error('the entry added during the in-flight save was removed again');
  }
  if (await page.getByText('QA First Entry').count() === 0) throw new Error('the first entry disappeared');
  const conflicts = await page.evaluate(() => window.__conflicts);
  if (conflicts > 0) throw new Error(conflicts + ' conflict(s) against a single device — saves are racing each other');
  const saves = await page.evaluate(() => window.__saves);
  if (!saves.length || saves[saves.length - 1].entries !== 3) {
    throw new Error('the server never ended up with all three entries: ' + JSON.stringify(saves));
  }
  await ctx.close();
});

await test('sync: editing a holiday schedules a save of its own', async () => {
  // Holidays reach the server through the same payload as everything else, so
  // they need to be in the autosave effect's dependency list — a field left
  // out of it is only ever saved as a passenger on somebody else's edit.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.addInitScript(syncFixture(0));

  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const section = page.locator('#sec-holidays');
  await section.scrollIntoViewIfNeeded();
  await section.getByRole('button', { name: '+ Add holiday' }).click();
  await page.locator('#holiday-date').fill('2026-09-15');
  await page.locator('#holiday-name').fill('QA Shutdown');
  await section.getByRole('button', { name: 'Add holiday' }).click();

  // Nothing else is touched — if holidays aren't watched, no save ever fires.
  await page.waitForTimeout(4000);
  const saves = await page.evaluate(() => window.__saves);
  const withHoliday = saves.filter((s) => s.holidays && s.holidays['2026'] && s.holidays['2026']['2026-09-15']);
  if (!withHoliday.length) {
    throw new Error('adding a holiday never reached the server: ' + JSON.stringify(saves));
  }
  if (withHoliday[0].holidays['2026']['2026-09-15'].name !== 'QA Shutdown') {
    throw new Error('the saved holiday lost its name: ' + JSON.stringify(withHoliday[0]));
  }
  await ctx.close();
});

// ── Rolling into the next budget year ────────────────────────────────────────
// The mechanics are covered without a browser in tests/year-copy.mjs. What
// these check is the part that file can't: that all three buttons which offer
// to roll the year forward actually run it, and run the same one. They used to
// differ — the pill at the end of the Budget month picker copied budget targets
// and nothing else, so December (when a user would most naturally reach for it)
// was the worst time to use it.
{
  const yearState = (page) => page.evaluate(() => {
    const g = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
    const entries = g('cf_entries') || [];
    const targets = g('cf_budgtargets') || {};
    return {
      years: (g('cf_years') || []).map((y) => y.year).sort(),
      copies: entries.filter((e) => e.copiedFrom !== undefined).map((e) => e.startDate).sort(),
      singles2027: entries.filter((e) => !e.repeats && (e.startDate || '').startsWith('2027-')).map((e) => e.desc).sort(),
      targetMonths2027: Object.keys(targets).filter((k) => k.startsWith('2027:')).length,
      overrides2027: Object.keys((g('cf_overrides') || {})['2027'] || {}).length,
    };
  });
  // The fixture's one-time entries: Tax refund (Apr), Summer vacation (Jul),
  // Vet checkup (Aug). Named here so a fixture change fails loudly.
  const SINGLES = ['Summer vacation', 'Tax refund', 'Vet checkup'];

  await test('year copy: Settings "+ Add" creates the year and carries the work forward', async () => {
    const { ctx, page } = await ctxPage();
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: '+ Add 2027' }).click();
    await page.waitForTimeout(900);
    const s = await yearState(page);
    if (JSON.stringify(s.years) !== JSON.stringify([2026, 2027])) throw new Error('years: ' + JSON.stringify(s.years));
    if (JSON.stringify(s.singles2027) !== JSON.stringify(SINGLES)) throw new Error('one-time entries in 2027: ' + JSON.stringify(s.singles2027));
    if (s.copies.length !== 3) throw new Error('copies not stamped with provenance: ' + JSON.stringify(s.copies));
    if (s.targetMonths2027 !== 12) throw new Error('budget target months copied: ' + s.targetMonths2027);
    await ctx.close();
  });

  // Same button, different door. This is the one that was doing less.
  await test('year copy: the Budget grid\'s "+ Add" pill does exactly what Settings does', async () => {
    const { ctx, page } = await ctxPage();
    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    // The pill only appears once the month picker is late in the year.
    await page.locator('.month-picker').getByRole('button', { name: 'Dec', exact: true }).click();
    await page.waitForTimeout(500);
    const pill = page.locator('.month-nextyear-pill');
    if (await pill.count() === 0) throw new Error('no "+ Add 2027" pill on December');
    await pill.click();
    await page.waitForTimeout(1000);
    const s = await yearState(page);
    if (JSON.stringify(s.years) !== JSON.stringify([2026, 2027])) throw new Error('years: ' + JSON.stringify(s.years));
    if (JSON.stringify(s.singles2027) !== JSON.stringify(SINGLES)) throw new Error('one-time entries did not come with the year: ' + JSON.stringify(s.singles2027));
    if (s.copies.length !== 3) throw new Error('copies not stamped with provenance: ' + JSON.stringify(s.copies));
    if (s.targetMonths2027 !== 12) throw new Error('budget target months copied: ' + s.targetMonths2027);
    await ctx.close();
  });

  await test('year copy: "Copy →" is safe to press twice', async () => {
    const { ctx, page } = await ctxPage();
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: '+ Add 2027' }).click();
    await page.waitForTimeout(900);
    const before = await yearState(page);
    // Now the Copy button exists for 2026 → 2027. Pressing it changes nothing,
    // because "+ Add" already ran the same routine.
    const copy = page.getByRole('button', { name: /^Copy .*2027$/ });
    if (await copy.count() === 0) throw new Error('no Copy button for 2026 → 2027');
    await copy.click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.waitForTimeout(900);
    const after = await yearState(page);
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      throw new Error('a second run changed things:\n  before ' + JSON.stringify(before) + '\n  after  ' + JSON.stringify(after));
    }
    const msg = await page.locator('#sec-years').getByText(/already matches|→ 2027/).first().textContent().catch(() => '');
    if (!/already matches/i.test(msg || '')) throw new Error('expected "already matches", got: ' + msg);
    await ctx.close();
  });

  // The tombstone that stops a deliberately-deleted copy coming back on the
  // next run. It is keyed by source entry rather than by year, and the
  // "+ Add" path used not to pass it at all.
  await test('year copy: a copy the user deletes does not come back on the next copy', async () => {
    const { ctx, page } = await ctxPage();
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: '+ Add 2027' }).click();
    await page.waitForTimeout(900);
    // Delete the 2027 copy the way a user would — the row menu in Entries,
    // which is what records the tombstone in the first place.
    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.getByPlaceholder(/search/i).first().fill('Vet checkup');
    await page.waitForTimeout(600);
    const rows = page.locator('.entries-table tbody tr', { hasText: '2027' });
    if (await rows.count() === 0) throw new Error('no 2027 "Vet checkup" row to delete');
    await rows.first().locator('.row-menu-btn').click();
    await page.waitForTimeout(300);
    await page.getByText('Delete entry', { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForTimeout(700);
    const tomb = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cf_deleted_copy_ids') || '{}')).length);
    if (tomb !== 1) throw new Error('deleting a copy recorded ' + tomb + ' tombstones, expected 1');
    // Now re-run the copy. The entry is "missing" from 2027, but deliberately.
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const copy = page.getByRole('button', { name: /^Copy .*2027$/ });
    if (await copy.count() === 0) throw new Error('no Copy button after the delete');
    await copy.click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.waitForTimeout(900);
    const s = await yearState(page);
    if (s.singles2027.includes('Vet checkup')) throw new Error('the deleted copy was resurrected: ' + JSON.stringify(s.singles2027));
    if (s.singles2027.length !== 2) throw new Error('the other copies should still be there: ' + JSON.stringify(s.singles2027));
    await ctx.close();
  });
}

// ── Backup & restore ─────────────────────────────────────────────────────────
// Settings names local export as the only backup path and the app nudges for
// one every 30 days, so this is the last copy of a household's data when a
// sync goes wrong. The round trip is asserted field by field rather than
// "a file appeared": the export list is derived from HOUSEHOLD_FIELDS, so a
// field that stops being marked `backup: true` disappears from the file
// silently, and a restore that quietly keeps the current value looks exactly
// like a restore that worked.
{
  // downloadBlob hands the bytes to an <a download>, which a headless browser
  // will not write anywhere useful — capture the Blob on its way past instead.
  const CAPTURE_DOWNLOADS = `
  (() => {
    const real = URL.createObjectURL.bind(URL);
    window.__downloads = [];
    URL.createObjectURL = (blob) => {
      const r = new FileReader();
      r.onload = () => window.__downloads.push({ text: r.result, type: blob.type });
      r.readAsText(blob);
      return real(blob);
    };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) { window.__lastDownloadName = this.download; return; }
      return click.apply(this, arguments);
    };
  })();
  `;
  const openSettings = async () => {
    const { ctx, page } = await ctxPage();
    await page.addInitScript(CAPTURE_DOWNLOADS);
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    return { ctx, page };
  };
  const exportBackup = async (page) => {
    await page.evaluate(() => { window.__downloads = []; });
    await page.getByRole('button', { name: 'Export Backup' }).click();
    await page.waitForTimeout(700);
    const d = await page.evaluate(() => window.__downloads[0] || null);
    if (!d) throw new Error('Export Backup produced no file');
    return { json: JSON.parse(d.text), type: d.type, name: await page.evaluate(() => window.__lastDownloadName) };
  };
  const pickFile = async (page, body, fileName = 'CashFlow_Backup_2026-08-25.json') => {
    await page.setInputFiles('input[type=file][accept=".json"]', {
      name: fileName, mimeType: 'application/json',
      buffer: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
    });
    await page.waitForTimeout(500);
  };
  const confirmRestore = async (page) => {
    const btn = page.getByRole('button', { name: 'Restore', exact: true });
    if (await btn.count() === 0) return false;
    await btn.click();
    await page.waitForTimeout(800);
    return true;
  };
  const stored = (page) => page.evaluate(() => {
    const g = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
    return { entries: g('cf_entries'), overrides: g('cf_overrides'), years: g('cf_years'),
      categories: g('cf_categories'), targets: g('cf_budgtargets'), goals: g('cf_goals'),
      debt: g('cf_debt_data'), holidays: g('cf_holidays'), thresh: g('cf_alertThresh') };
  });

  await test('backup: the export carries every field the app stores', async () => {
    const { ctx, page } = await openSettings();
    const { json, type, name } = await exportBackup(page);
    if (type !== 'application/json') throw new Error('blob type ' + type);
    if (!/^CashFlow_Backup_\d{4}-\d{2}-\d{2}\.json$/.test(name || '')) throw new Error('filename ' + name);
    if (json.schemaVersion !== 10) throw new Error('schemaVersion ' + json.schemaVersion);
    if (isNaN(Date.parse(json.exportedAt))) throw new Error('exportedAt ' + json.exportedAt);
    // Every field HOUSEHOLD_FIELDS marks `backup: true`. Update this list in
    // the same commit that changes that flag — the point is that dropping a
    // field from the backup has to be a decision, not a side effect.
    for (const k of ['entries', 'overridesByYr', 'yearConfigs', 'categories', 'categoryColors',
      'activeYear', 'alertThreshold', 'darkMode', 'goals', 'budgetTargets', 'templates',
      'completed', 'debtData', 'deletedCopyIds', 'holidays', 'activity', 'accounts']) {
      if (!(k in json)) throw new Error('missing from the export: ' + k);
    }
    if (!json.entries.length) throw new Error('exported an empty entry list');
    if (await page.evaluate(() => !localStorage.getItem('cf_last_backup'))) throw new Error('cf_last_backup not stamped, so the 30-day nudge will not clear');
    await ctx.close();
  });

  await test('backup: exporting then restoring puts every value back', async () => {
    const { ctx, page } = await openSettings();
    const { json } = await exportBackup(page);
    // Compared against the file, not against localStorage before the export: a
    // field still sitting at its useLS default has no localStorage row yet, so
    // "what was on disk" and "what the app was using" legitimately differ. What
    // the file says is the contract.
    await page.evaluate(() => {
      localStorage.setItem('cf_entries', '[]');
      localStorage.setItem('cf_goals', '[]');
      localStorage.setItem('cf_alertThresh', '1');
      localStorage.setItem('cf_categories', '["Wiped"]');
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1400);
    await pickFile(page, json);
    if (!await confirmRestore(page)) throw new Error('no confirm dialog for a valid backup');
    const after = await stored(page);
    const asFiled = {
      entries: json.entries, overrides: json.overridesByYr, years: json.yearConfigs,
      categories: json.categories, targets: json.budgetTargets, goals: json.goals,
      debt: json.debtData, holidays: json.holidays, thresh: json.alertThreshold,
    };
    for (const k of Object.keys(asFiled)) {
      if (JSON.stringify(after[k]) !== JSON.stringify(asFiled[k])) {
        throw new Error(`${k} did not come back: stored ${JSON.stringify(after[k]).slice(0, 80)} vs filed ${JSON.stringify(asFiled[k]).slice(0, 80)}`);
      }
    }
    await ctx.close();
  });

  // The dialog says the file replaces the current data and cannot be undone.
  // A field the file does not carry used to be left alone, so restoring a
  // backup taken before a goal existed left that goal in place — the user is
  // handed a blend of two points in time and told it is the backup.
  await test('backup: restoring replaces data the file omits instead of keeping it', async () => {
    const { ctx, page } = await openSettings();
    if (!(await stored(page)).goals) throw new Error('fixture has no goals to lose');
    await pickFile(page, { schemaVersion: 9, exportedAt: '2026-08-25T00:00:00Z', entries: [] });
    if (!await confirmRestore(page)) throw new Error('no confirm dialog');
    const after = await stored(page);
    if (after.entries.length) throw new Error('entries not replaced');
    if (after.goals && after.goals.length) throw new Error('goals survived: ' + JSON.stringify(after.goals));
    if (Object.keys(after.targets || {}).length) throw new Error('budget targets survived');
    if (Object.keys(after.holidays || {}).length) throw new Error('holidays survived');
    await ctx.close();
  });

  // "Backup restored successfully!" over a file that restored nothing is worse
  // than an error: the user stops looking for their data.
  await test('backup: a file that is not a CashFlow backup is refused, not celebrated', async () => {
    const { ctx, page } = await openSettings();
    const before = await stored(page);
    await pickFile(page, 'not json at all', 'notes.json');
    let msg = await page.locator('.backup-msg').first().textContent().catch(() => '');
    if (!/could not read/i.test(msg || '')) throw new Error('unparseable file said: ' + msg);
    await pickFile(page, { totals: 42, rows: [] }, 'some-other-app.json');
    if (await confirmRestore(page)) throw new Error('offered to restore a foreign JSON file');
    msg = await page.locator('.backup-msg').first().textContent().catch(() => '');
    if (/restored successfully/i.test(msg || '')) throw new Error('reported success for a foreign file');
    if (!/isn.t a CashFlow backup/i.test(msg || '')) throw new Error('unhelpful message: ' + msg);
    const after = await stored(page);
    if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error('a rejected file still changed stored data');
    await ctx.close();
  });

  // Money is cents from v8 and debt figures from v9. A v8 file is already in
  // cents everywhere but debtData: running the v8 pass over it again turned
  // $1,650.00 rent into $165,000.00, and said nothing.
  await test('backup: a v8 backup restores at face value, with only its debt figures converted', async () => {
    const { ctx, page } = await openSettings();
    const { json } = await exportBackup(page);
    const v8 = JSON.parse(JSON.stringify(json));
    v8.schemaVersion = 8;
    v8.debtData = { visa: { balance: '4500', rate: '19.99', payment: '200' } };
    const rent = json.entries.find((e) => e.desc === 'Rent');
    if (!rent) throw new Error('fixture lost its Rent entry');
    await pickFile(page, v8);
    if (!await confirmRestore(page)) throw new Error('no confirm dialog');
    const after = await stored(page);
    const back = after.entries.find((e) => e.desc === 'Rent');
    if (back.amount !== rent.amount) throw new Error(`rent restored as ${back.amount}, backed up as ${rent.amount}`);
    if (after.years[0].openingBalance !== json.yearConfigs[0].openingBalance) throw new Error('opening balance changed scale');
    if (after.thresh !== json.alertThreshold) throw new Error('alert threshold changed scale');
    if (after.debt.visa.balance !== '450000') throw new Error('v8 debt dollars not converted: ' + after.debt.visa.balance);
    if (after.debt.visa.rate !== '19.99') throw new Error('interest rate was treated as money: ' + after.debt.visa.rate);
    await ctx.close();
  });

  await test('backup: a pre-v8 backup with no version stamp is converted to cents', async () => {
    const { ctx, page } = await openSettings();
    await pickFile(page, {
      exportedAt: '2026-01-01T00:00:00Z',
      entries: [{ id: 'legacy', desc: 'Old Rent', type: 'expense', amount: 1650, category: 'Housing',
        repeats: false, recurEvery: 1, recurUnit: 'month', recurDays: [], recurEnd: '', startDate: '2026-01-01', notes: '' }],
      yearConfigs: [{ year: 2026, openingBalance: 12500 }],
      alertThreshold: 500,
    });
    if (!await confirmRestore(page)) throw new Error('no confirm dialog');
    const after = await stored(page);
    if (after.entries[0].amount !== 165000) throw new Error('legacy dollars not converted: ' + after.entries[0].amount);
    if (after.years[0].openingBalance !== 1250000) throw new Error('legacy opening balance not converted');
    if (after.thresh !== 50000) throw new Error('legacy threshold not converted: ' + after.thresh);
    await ctx.close();
  });
}


// ── Usability & layout ───────────────────────────────────────────────────────

// The Forecast is the one view whose whole job is "where is this heading", and
// it answered with a paginated table: three pages for a 90-day horizon, the low
// point unmarked even though the Dashboard puts it in a tile.
await test('forecast: a balance curve marks the low point and the alert threshold', async () => {
  // A one-off expense far enough out to dip the curve and let it recover, so
  // the low point is genuinely ahead rather than being today's opening balance
  // (which the chart deliberately does not mark — a low on day one is just
  // today's balance, and a marker on it draws a line down the y axis).
  const when = new Date(); when.setDate(when.getDate() + 20);
  const roof = JSON.stringify([{ id: 9901, desc: 'Roof repair', type: 'expense', amount: 3800000,
    category: 'Housing', repeats: false, recurUnit: 'month', recurEvery: 1,
    startDate: when.toISOString().slice(0, 10), notes: '' }]);
  const { ctx, page } = await ctxPage({ stub: (t) => t.replace('const payload = {', `entries.push(...${roof}); const payload = {`) });
  await page.goto(BASE + '#/flow/curve', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const svg = page.locator('svg[role="img"]').first();
  if (await svg.count() !== 1) throw new Error('the forecast renders no chart');
  const alt = await svg.getAttribute('aria-label');
  if (!/projected balance/i.test(alt || '')) throw new Error('chart has no useful description: ' + alt);
  const marks = await svg.evaluate((el) => [...el.querySelectorAll('text')].map((t) => t.textContent));
  if (!marks.some((t) => /^Alert /.test(t))) throw new Error('no alert-threshold reference line: ' + marks.join(' | '));
  if (!marks.some((t) => /^Low .*\d/.test(t))) throw new Error('the low point is not marked: ' + marks.join(' | '));
  if (!/dipping to a low of/.test(alt)) throw new Error('the description does not name the low point: ' + alt);
  // Month boundaries are named; the other ~87 days are not, or the axis would
  // be a smear.
  const ticks = marks.filter((t) => /^[A-Z][a-z]{2} \d+$/.test(t));
  if (ticks.length < 2 || ticks.length > 8) throw new Error(`x axis prints ${ticks.length} date labels across 90 days: ${ticks.join(' ')}`);
  await ctx.close();
});

// A rolling window cut into pages stops rolling the moment you have to press
// Next, and the run-up to the low point is as likely to straddle a break as not.
await test('forecast: the ledger scrolls rather than paginating', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/flow/curve', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  if (await page.locator('[aria-label="Next page"]').count() !== 0) throw new Error('the forecast still paginates');
  const before = await page.locator('.forecast-tr').count();
  if (before === 0) throw new Error('no forecast rows rendered');
  const info = await page.locator('.grid-pagination-info').first().innerText();
  if (!/of \d+ events/.test(info)) throw new Error('no running count of events: ' + info);
  await ctx.close();
});

// The month laid out as a month, which is the shape the question comes in.
await test('calendar: the month is a grid, with a running balance and the low days marked', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/flow/calendar', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const cells = page.locator('.cal-cell:not(.cal-cell--blank)');
  const n = await cells.count();
  if (n < 28 || n > 31) throw new Error(`calendar rendered ${n} day cells`);
  // Every day carries a balance, including the quiet ones — the carry is what
  // makes the grid a running balance rather than a scatter of busy days.
  const withBalance = await page.locator('.cal-cell:not(.cal-cell--blank) .cal-bal').count();
  if (withBalance !== n) throw new Error(`${withBalance} of ${n} days show a balance`);
  const label = await cells.first().getAttribute('aria-label');
  if (!/balance /.test(label || '')) throw new Error('a day cell says nothing to a screen reader: ' + label);
  // Picking a day opens what is on it, with the same card the other views use.
  const busy = page.locator('.cal-cell:not(.cal-cell--quiet):not(.cal-cell--blank)').first();
  await busy.click();
  await page.locator('.cal-day-hdr').waitFor(V);
  if (await page.locator('.cal-day-hdr + .budget-card-row, .cal-day-hdr ~ .budget-card-row').count() === 0) {
    throw new Error('opening a day showed none of its events');
  }
  await ctx.close();
});

// Every page said "CashFlow Budget" and no page had an h1 at all, so a screen
// reader navigating by heading had no way to confirm where it had landed and
// six history entries read identically.
await test('a11y: each view names itself in a heading and in the document title', async () => {
  const { ctx, page } = await ctxPage();
  const seen = new Set();
  for (const [route, expected] of [
    ['#/today', 'Today'],
    ['#/flow/calendar', 'Flow · Calendar'],
    ['#/flow/entries', 'Flow · Entries'],
    ['#/flow/curve', 'Flow · Curve'],
    ['#/plan/goals', 'Plan · Goals'],
    ['#/you', 'You'],
  ]) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const h1s = await page.locator('h1').allInnerTexts();
    if (h1s.length !== 1) throw new Error(`${route} has ${h1s.length} h1 elements, not 1`);
    if (h1s[0] !== expected) throw new Error(`${route} heading is "${h1s[0]}", expected "${expected}"`);
    const title = await page.title();
    if (title !== expected + ' — CashFlow Budget') throw new Error(`${route} title is "${title}"`);
    if (seen.has(title)) throw new Error(`two views share the title "${title}"`);
    seen.add(title);
  }
  await ctx.close();
});

// The charts were the conspicuous gap in an otherwise well-labelled app: three
// SVGs wider than 200px with no role, no name and no title element.
await test('a11y: every chart is either described or hidden, never bare', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const bare = await page.$$eval('svg', (els) => els
    .filter((e) => e.getAttribute('aria-hidden') !== 'true' && e.getAttribute('role') !== 'img')
    .map((e) => e.parentElement && e.parentElement.className));
  if (bare.length) throw new Error(`${bare.length} chart SVG(s) exposed with no description: ${bare.join(', ')}`);
  const described = await page.$$eval('svg[role="img"]', (els) => els.map((e) => e.getAttribute('aria-label')));
  if (described.length < 3) throw new Error(`only ${described.length} described charts on the dashboard`);
  for (const d of described) {
    if (!d || d.length < 40) throw new Error('a chart description says nothing useful: ' + d);
    // A description that only names the chart type is no better than none; each
    // one has to carry the figures a sighted reader takes from the picture.
    if (!/\$/.test(d)) throw new Error('a chart description carries no figures: ' + d);
  }
  await ctx.close();
});

// The nudge is right — a static site with a 30-day export reminder is exactly
// right — but as a fixed bottom-right card it sat on top of the numbers it
// exists to protect.
await test('backup nudge: it sits in the page, not on top of the data', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/envelopes', { waitUntil: 'load' });
  // The nudge fires five seconds after load.
  await page.waitForTimeout(6500);
  const nudge = page.locator('.backup-nudge');
  await nudge.waitFor(V);
  const pos = await nudge.evaluate((el) => getComputedStyle(el).position);
  if (pos === 'fixed' || pos === 'absolute') throw new Error(`the nudge is ${pos}, so it floats over the page`);
  // Nothing of the page is underneath it: sample its box and check every hit
  // is the nudge itself.
  const covered = await page.evaluate(() => {
    const n = document.querySelector('.backup-nudge');
    const r = n.getBoundingClientRect();
    const hits = new Set();
    for (let x = r.left + 4; x < r.right - 4; x += 40) {
      for (let y = r.top + 4; y < r.bottom - 4; y += 10) {
        const el = document.elementFromPoint(x, y);
        if (el && !n.contains(el)) hits.add(el.tagName + '.' + el.className);
      }
    }
    return [...hits];
  });
  if (covered.length) throw new Error('the nudge covers: ' + covered.join(', '));
  await ctx.close();
});

// A card was as tall as its neighbour rather than as tall as its content, so a
// short chart beside a dense one rendered as a large empty area in a stretched
// card; and lists of small cards ran the full width of a 1440px page one per
// row, leaving 400-500px of empty page below the last.
await test('wide screens: cards size to their content, and card lists use the width', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const align = await page.locator('.chart-grid').first().evaluate((el) => getComputedStyle(el).alignItems);
  if (align !== 'start') throw new Error(`paired dashboard cards are ${align}, so the shorter one stretches`);

  await ctx.close();

  // Measured on what actually renders, not on the computed grid-template: a
  // display:none grid reports its unresolved template, which counts tokens
  // rather than columns and would pass at any width.
  const goals = JSON.stringify([
    { id: 'g1', name: 'Emergency fund', target: 1000000, saved: 420000, monthly: 50000, targetDate: '2027-06-01' },
    { id: 'g2', name: 'Kitchen reno', target: 1800000, saved: 230000, monthly: 60000, targetDate: '2028-01-01' },
    { id: 'g3', name: 'Trip to Japan', target: 700000, saved: 610000, monthly: 30000, targetDate: '2026-12-01' },
    { id: 'g4', name: 'New laptop', target: 300000, saved: 90000, monthly: 20000, targetDate: '2027-02-01' },
  ]);
  const withGoals = (t) => t.replace('goals: [],', `goals: ${goals},`);
  const rowsOf = async (p) => p.locator('.cf-cardgrid').first().evaluate((el) =>
    new Set([...el.children].map((c) => Math.round(c.getBoundingClientRect().top))).size);

  const wide = await ctxPage({ stub: withGoals });
  await wide.page.goto(BASE + '#/plan/goals', { waitUntil: 'load' });
  await wide.page.waitForTimeout(1300);
  const wideRows = await rowsOf(wide.page);
  if (wideRows !== 2) throw new Error(`four goal cards fill ${wideRows} rows at 1440px, expected 2 side-by-side pairs`);
  await wide.ctx.close();

  const narrow = await ctxPage({ touch: true, stub: withGoals });
  await narrow.page.goto(BASE + '#/plan/goals', { waitUntil: 'load' });
  await narrow.page.waitForTimeout(1300);
  const narrowRows = await rowsOf(narrow.page);
  if (narrowRows !== 4) throw new Error(`four goal cards fill ${narrowRows} rows on a phone, expected one each`);
  await narrow.ctx.close();
});


// ── The printed-numbers invariant ────────────────────────────────────────────
// The suite had a shaped hole: plenty of tests over what the app computes, none
// over whether the figures it *prints* agree with each other. That is exactly
// how D-01 shipped and stayed — a surplus that silently disagreed with the two
// balances printed beside it, on screen, in every month, for as long as the
// view existed, with a green suite the whole time.
//
// So: one invariant, asserted against rendered text only, over a fixture that
// carries transfers in both directions — the case that broke.
await test('invariant: every printed surplus agrees with the balances printed beside it', async () => {
  const transfers = JSON.stringify([
    { id: 801, desc: 'To savings', type: 'transfer', transferDirection: 'out', amount: 50000,
      category: 'Savings / RRSP', repeats: true, recurUnit: 'month', recurEvery: 1, startDate: '2026-01-20', notes: '' },
    { id: 802, desc: 'From savings', type: 'transfer', transferDirection: 'in', amount: 120000,
      category: 'Savings / RRSP', repeats: false, recurUnit: 'month', recurEvery: 1, startDate: '2026-07-05', notes: '' },
  ]);
  const { ctx, page } = await ctxPage({ stub: (t) => t.replace('const payload = {', `entries.push(...${transfers}); const payload = {`) });
  // Cents, from whatever the cell says. Everything is compared as integers —
  // the app stores cents, so a penny of drift is a real disagreement, not a
  // rounding artefact to be tolerated with an epsilon.
  const cents = (s) => {
    const neg = /-/.test(s);
    const n = Math.round(parseFloat((s || '').replace(/[^0-9.]/g, '') || '0') * 100);
    return neg ? -n : n;
  };
  const OPENING = 1250000;

  // ── The Dashboard's Monthly Summary ───────────────────────────────────────
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  const table = await page.evaluate(() => {
    const tb = [...document.querySelectorAll('table')].find((t) =>
      [...t.querySelectorAll('thead th')].some((h) => /Surplus/.test(h.textContent)));
    if (!tb) return null;
    return {
      head: [...tb.querySelectorAll('thead th')].map((h) => h.textContent.trim()),
      rows: [...tb.querySelectorAll('tbody tr')].map((r) => [...r.querySelectorAll('td,th')].map((c) => c.textContent.trim())),
    };
  });
  if (!table) throw new Error('no Monthly Summary table on the dashboard');
  const col = (name) => {
    const i = table.head.findIndex((h) => h.startsWith(name));
    if (i < 0) throw new Error(`no "${name}" column: ${table.head.join(' | ')}`);
    return i;
  };
  const [cM, cIn, cEx, cTr, cSur, cCl] = [col('Month'), col('Income'), col('Expenses'), col('Transfers'), col('Surplus'), col('Closing')];
  const months = table.rows.filter((r) => !/Annual/i.test(r[cM]));
  if (months.length !== 12) throw new Error(`summary has ${months.length} month rows`);

  let prevClose = OPENING;
  let sumIn = 0, sumEx = 0, sumTr = 0, sumSur = 0;
  for (const r of months) {
    const inc = cents(r[cIn]), exp = cents(r[cEx]), tr = cents(r[cTr]);
    const sur = cents(r[cSur]), close = cents(r[cCl]);
    // The row has to add up on its own terms. Transfers are neither income nor
    // expense — that is the documented rule — so a surplus that ignores them is
    // a surplus that disagrees with the balance in the next cell along.
    if (inc - exp + tr !== sur) {
      throw new Error(`${r[cM]}: income ${r[cIn]} − expenses ${r[cEx]} + transfers ${r[cTr]} = ${(inc - exp + tr) / 100}, but the row prints ${r[cSur]}`);
    }
    // And the surplus has to be the movement between the two balances the app
    // prints either side of it.
    if (close - prevClose !== sur) {
      throw new Error(`${r[cM]}: balance moved ${(close - prevClose) / 100} but the row prints a surplus of ${r[cSur]}`);
    }
    prevClose = close;
    sumIn += inc; sumEx += exp; sumTr += tr; sumSur += sur;
  }
  if (sumSur !== prevClose - OPENING) {
    throw new Error(`the twelve surpluses total ${sumSur / 100}, but the year moved ${(prevClose - OPENING) / 100}`);
  }
  const annual = table.rows.find((r) => /Annual/i.test(r[cM]));
  if (annual) {
    for (const [label, got, want] of [
      ['income', cents(annual[cIn]), sumIn], ['expenses', cents(annual[cEx]), sumEx],
      ['transfers', cents(annual[cTr]), sumTr], ['surplus', cents(annual[cSur]), sumSur],
    ]) {
      if (got !== want) throw new Error(`the Annual Total row prints ${got / 100} of ${label}, but its twelve months add to ${want / 100}`);
    }
  }
  // The fixture has to actually exercise the case that broke, or the invariant
  // above is being asserted over a year with no transfers in it.
  if (sumTr === 0) throw new Error('the fixture carries no transfers, so this proves nothing');

  // ── Budget → Monthly, every month ─────────────────────────────────────────
  // Same invariant one level down: the running balance printed against each row
  // has to be the previous one plus that row's own In and Out, and the totals
  // bar has to be the sum of the column above it.
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  for (const mon of ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) {
    await page.locator('.month-picker button', { hasText: new RegExp('^' + mon + '$') }).first().click();
    await page.waitForTimeout(350);
    // Every row, not just the first page of them.
    const sizeSel = page.locator('.grid-pagination-size select').first();
    if (await sizeSel.count()) await sizeSel.selectOption('all');
    await page.waitForTimeout(350);
    const grid = await page.evaluate(() => {
      const open = document.querySelector('.openbal-row');
      const totals = document.querySelector('.budget-totals-row');
      const rows = [...document.querySelectorAll('tbody tr')]
        .filter((r) => r !== open && r !== totals && r.querySelector('.budget-col-balance'))
        .map((r) => ({
          desc: (r.querySelector('.budget-col-desc') || {}).textContent || '',
          inc: (r.querySelector('.budget-col-income') || {}).textContent || '',
          exp: (r.querySelector('.budget-col-expense') || {}).textContent || '',
          bal: (r.querySelector('.budget-col-balance') || {}).textContent || '',
        }));
      const cellsOf = (row) => row ? [...row.querySelectorAll('td')].map((c) => c.textContent.trim()).filter(Boolean) : [];
      return { opening: cellsOf(open), totals: cellsOf(totals), rows };
    });
    if (!grid.rows.length) continue;
    const opening = cents(grid.opening[grid.opening.length - 1]);
    let running = opening, tIn = 0, tOut = 0;
    for (const r of grid.rows) {
      const inc = cents(r.inc), exp = cents(r.exp);
      running += inc - exp;
      tIn += inc; tOut += exp;
      if (running !== cents(r.bal)) {
        throw new Error(`${mon} "${r.desc.trim()}": in ${r.inc || '—'} out ${r.exp || '—'} leaves ${running / 100}, but the row prints ${r.bal}`);
      }
    }
    // "Monthly Totals", then In, Out, and the net.
    const [, tin, tout, tnet] = grid.totals;
    if (cents(tin) !== tIn) throw new Error(`${mon}: the totals bar prints ${tin} of income, the column adds to ${tIn / 100}`);
    if (cents(tout) !== tOut) throw new Error(`${mon}: the totals bar prints ${tout} of expenses, the column adds to ${tOut / 100}`);
    if (cents(tnet) !== tIn - tOut) throw new Error(`${mon}: the totals bar prints a net of ${tnet}, but ${tin} − ${tout} is ${(tIn - tOut) / 100}`);
    if (opening + cents(tnet) !== running) {
      throw new Error(`${mon}: opening ${grid.opening[grid.opening.length - 1]} plus the printed net ${tnet} is not the last printed balance ${running / 100}`);
    }
  }
  await ctx.close();
});


// ── Service worker ───────────────────────────────────────────────────────────
// Navigations used to be network-first with `cache: 'no-store'`, which made the
// cache an offline fallback and nothing else: every launch re-downloaded the
// whole app — 1.5 MB uncompressed, 387 KB gzipped — before anything could
// start. Serving the cached shell first is only safe because a deploy still
// reaches the user, so both halves are asserted here: the fast path, and the
// update path that keeps it honest.
await test('service worker: a repeat launch is served from cache, and a deploy still lands', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(mkStub(false, true));
  await page.goto(BASE, { waitUntil: 'load' });
  // Wait for install + activate; the worker precaches the shell on install.
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  await page.waitForTimeout(1200);

  // A repeat launch: the document comes out of the cache, not the network.
  await page.goto('about:blank');
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const transferred = await page.evaluate(() => performance.getEntriesByType('navigation')[0].transferSize);
  if (transferred !== 0) throw new Error(`a repeat launch still pulled ${transferred} bytes over the network`);

  // ...but the worker still asks, every time, or a deploy would go unnoticed.
  const before = requestLog.length;
  await page.goto('about:blank');
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const asked = requestLog.slice(before).filter((p) => p === '/' || p === '/index.html');
  if (!asked.length) throw new Error('the worker served from cache without revalidating — a deploy would never be noticed');

  // Now deploy: a different page, behind a worker with a different cache name.
  // The real build derives that name from a hash of the page, so any change to
  // the app changes the worker too; this mimics that by hand.
  const realSw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const realHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
  // The marker is the build tag, not the <title>: the app rewrites the title
  // from the route on every render, so a title marker is erased by the very
  // build you are trying to detect.
  serverOverride.set('/sw.js', realSw.replace(/const CACHE = '[^']+'/, "const CACHE = 'cf-deploy-test'"));
  const nextHtml = realHtml.replace(/const CF_VERSION='[^']+'/, "const CF_VERSION='v-deploy-test'");
  if (nextHtml === realHtml) throw new Error('could not stamp a new build tag into the page');
  serverOverride.set('/', nextHtml);
  serverOverride.set('/index.html', nextHtml);
  try {
    await page.goto('about:blank');
    await page.goto(BASE, { waitUntil: 'load' });
    // The launch may well start on the cached build — that is the whole point.
    // What has to happen is that it does not stay there: the new worker
    // installs, activates, and the controllerchange handler in
    // bootstrap-head.js reloads the app onto the new bundle.
    await page.waitForFunction(() => typeof CF_VERSION !== 'undefined' && CF_VERSION === 'v-deploy-test', null, { timeout: 40000 })
      .catch(() => { throw new Error('the app never picked up the new build — a deploy would strand every installed client on the old one'); });
  } finally {
    serverOverride.clear();
  }
  await ctx.close();
});


// ── Worth building ───────────────────────────────────────────────────────────

// The banking-day rule was inferred from the description and nothing else, so
// a direct deposit called "Salary" behaved differently from one called
// "Payroll" for no reason a user could see. The description heuristic stays as
// the default; this is the per-entry answer that overrides it.
await test('deposit dates: an entry can opt in or out of the banking-day rule', async () => {
  // "Acme deposit" is not payroll to the description heuristic — that is the
  // point. It is monthly from Saturday 15 August 2026, so every occurrence
  // lands on a day the banks are shut, and before this setting existed none of
  // them could ever be marked however obviously they were a direct deposit.
  const deposits = JSON.stringify([{ id: 9101, desc: 'Acme deposit', type: 'income', amount: 250000,
    category: 'Income', repeats: true, recurUnit: 'month', recurEvery: 1, recurDays: [],
    recurEnd: '', startDate: '2026-08-15', notes: '' }]);
  const { ctx, page } = await ctxPage({ stub: (t) => t.replace('const payload = {', `entries.push(...${deposits}); const payload = {`) });
  const marksOnIt = async () => {
    await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    return page.locator('tbody tr', { hasText: 'Acme deposit' }).first().locator('.helptip-btn--mark').count();
  };
  const setRule = async (value) => {
    await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
    await page.waitForTimeout(1100);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    await page.locator('tbody tr', { hasText: 'Acme deposit' }).first().locator('.row-menu-btn').click();
    await page.getByText('Edit entry').first().click();
    await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
    const sel = page.locator('#ef-banking-day');
    if (await sel.count() !== 1) throw new Error('repeating income has no deposit-date control');
    const opts = await sel.locator('option').allTextContents();
    if (opts.length !== 3) throw new Error('deposit-date control offers ' + opts.length + ' choices: ' + opts.join(' / '));
    await sel.selectOption(value);
    await page.getByRole('button', { name: 'Save Entry' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Save Entry' }).click();
    await page.waitForTimeout(900);
  };

  // Left to the description heuristic, nothing is marked: "Acme deposit" does
  // not read as payroll.
  if (await marksOnIt() !== 0) throw new Error('a non-payroll description was shifted without being asked');
  await setRule('yes');
  if (await marksOnIt() === 0) throw new Error('opting in marked no deposit date on a Saturday payday');
  await setRule('no');
  if (await marksOnIt() !== 0) throw new Error('opting out still marked a deposit date');
  await ctx.close();
});

// A shared budget that appears to edit itself. The Audit page could only ever
// show occurrence overrides — one kind of change out of seven — so an entry
// somebody added, a target somebody moved and a goal somebody archived all
// happened silently.
await test('activity: what changed, who changed it, across every kind of change', async () => {
  const { ctx, page } = await ctxPage();
  const feed = async () => {
    await page.goto(BASE + '#/you', { waitUntil: 'load' });
    await page.waitForTimeout(1100);
    await page.getByRole('button', { name: 'Activity' }).click();
    await page.waitForTimeout(500);
    return page.$$eval('.activity-row', (rs) => rs.map((r) => r.innerText.replace(/\s+/g, ' ')));
  };
  if ((await feed()).length !== 0) throw new Error('the feed is not empty on a fresh household');

  // An entry.
  await page.goto(BASE + '#/flow/entries', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  await page.getByRole('button', { name: '+ Add Entry' }).first().click();
  await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
  await page.getByPlaceholder('e.g. Mortgage payment').fill('Window cleaner');
  await page.getByPlaceholder('0.00').first().fill('45');
  await page.locator('#ef-category').selectOption({ label: 'Housing' });
  await page.getByRole('button', { name: 'Save Entry' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Save Entry' }).click();
  await page.waitForTimeout(800);

  // A budget target.
  await page.goto(BASE + '#/envelopes', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '+ Add' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('.modal-card select').first().selectOption({ index: 1 });
  await page.locator('.modal-card input[type=number]').first().fill('250');
  await page.getByRole('button', { name: 'Add Line' }).click();
  await page.waitForTimeout(800);

  const rows = await feed();
  if (rows.length < 2) throw new Error('the feed recorded ' + rows.length + ' of 2 changes: ' + rows.join(' | '));
  const joined = rows.join(' | ');
  if (!/ENTRY Added Window cleaner/.test(joined)) throw new Error('no entry line: ' + joined);
  if (!/TARGET Set the .* target/.test(joined)) throw new Error('no target line: ' + joined);
  // Every line carries an author id and a timestamp. Asserted against what is
  // stored, not what is printed: memberName deliberately renders nothing when
  // the author is you, and the fixture household has one member — so a text
  // check here would pass on a record with no author at all, which is the
  // exact thing this is for.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cf_activity') || '[]'));
  if (stored.length !== rows.length) throw new Error(`${stored.length} records stored against ${rows.length} rows shown`);
  for (const a of stored) {
    if (!a.by) throw new Error('a change was recorded with no author: ' + JSON.stringify(a));
    if (!a.at || Number.isNaN(Date.parse(a.at))) throw new Error('a change has no usable timestamp: ' + JSON.stringify(a));
    if (!a.kind || !a.what) throw new Error('a change says nothing about itself: ' + JSON.stringify(a));
  }
  // Newest first, so "what changed while I was away" is the top of the list.
  if (stored.length > 1 && Date.parse(stored[0].at) < Date.parse(stored[1].at)) {
    throw new Error('the feed is in oldest-first order');
  }
  await ctx.close();
});

// The app could project a year and rank debt strategies, but not answer the one
// question a low-balance warning provokes: what would I have to change?
await test('what-if: a scenario draws a second curve and says what it is worth', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/flow/curve', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  const dashedBefore = await page.$$eval('svg[role=img] path[stroke-dasharray]', (p) => p.length);
  await page.getByRole('switch', { name: 'Try a change' }).click();
  await page.waitForTimeout(600);
  const listed = await page.locator('.scenario-row').count();
  if (listed === 0) throw new Error('no recurring entries offered to vary');
  // Only recurring entries: a one-time expense is a decision already made on a
  // date, not something to ask "what if I dropped this" about.
  const names = await page.locator('.scenario-desc').allTextContents();
  if (names.includes('Summer vacation')) throw new Error('a one-time entry is offered as a scenario knob');

  // Dropping the largest expense has to move both numbers the right way.
  const rent = page.locator('.scenario-row', { hasText: 'Rent' }).first();
  await rent.getByRole('button', { name: 'Drop' }).click();
  await page.waitForTimeout(900);
  const summary = (await page.locator('.scenario-summary').innerText()).replace(/\s+/g, ' ');
  if (!/would end \+\$/.test(summary)) throw new Error('dropping the rent did not improve the end balance: ' + summary);
  if (!/low point moves to/.test(summary)) throw new Error('no low-point comparison: ' + summary);
  const dashedAfter = await page.$$eval('svg[role=img] path[stroke-dasharray]', (p) => p.length);
  if (dashedAfter <= dashedBefore) throw new Error('the chart drew no second curve');
  const alt = await page.locator('svg[role=img]').getAttribute('aria-label');
  if (!/dashed line shows the what-if/.test(alt || '')) throw new Error('the scenario is invisible to a screen reader: ' + alt);

  // A scenario is a question, not an edit: the budget behind it is untouched.
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  if (await page.getByText('Rent').count() === 0) throw new Error('the scenario deleted the real entry');
  await ctx.close();
});

// Reconcile already posted the adjustment; what it could not say was whether
// that gap was a bad week or a year of small drift.
await test('reconcile: the adjustment is reported as drift over the time since the last one', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/today', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  const open = async () => {
    await page.getByRole('button', { name: /Reconcile/i }).first().click();
    await page.locator('#rec-actual').waitFor(V);
  };
  // First time round there is nothing to measure against, so no drift line —
  // an invented rate over an unknown period would be worse than silence.
  await open();
  await page.locator('#rec-actual').fill('40000');
  await page.waitForTimeout(400);
  if (await page.locator('.reconcile-drift').count() !== 0) {
    throw new Error('drift reported with no previous reconciliation to measure from');
  }
  await page.getByRole('button', { name: 'Record adjustment' }).click();
  await page.waitForTimeout(900);
  // Now there is. The adjustment just recorded is dated today, so the second
  // one spans zero days and still has nothing to divide by — which is the
  // same case, and has to stay silent rather than divide by zero.
  await open();
  await page.locator('#rec-actual').fill('39000');
  await page.waitForTimeout(400);
  const lastLine = await page.locator('.oem-editedby').innerText();
  if (!/Last reconciled/.test(lastLine)) throw new Error('the modal does not say when it was last reconciled: ' + lastLine);
  if (!/0 days ago|day/.test(lastLine)) throw new Error('no elapsed time on the last-reconciled line: ' + lastLine);
  const drift = await page.locator('.reconcile-drift').count();
  if (drift !== 0) throw new Error('a same-day reconciliation reported a drift rate');
  await ctx.close();
});


// ── Accounts ─────────────────────────────────────────────────────────────────

// The whole app assumed one pot of money, which is why the transfer type had
// nothing coherent to mean: "out of this account" had no other account to be
// out of. A household that predates accounts has to see nothing change.
await test('accounts: a household that predates them gets one, and nothing it can see changes', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  // Asserted through the UI, not localStorage: a field still sitting at its
  // default has no storage row yet, so an absent row means "the default", not
  // "no accounts".
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  const names = await page.$$eval('#sec-accounts .account-name', (els) => els.map((e) => e.value));
  if (names.length !== 1 || names[0] !== 'Chequing') throw new Error('accounts are ' + JSON.stringify(names));
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  // Nothing is stamped onto the entries: "unset" already means the default
  // account, so rewriting several hundred entries to say so would be churn.
  const stamped = await page.evaluate(() => (JSON.parse(localStorage.getItem('cf_entries') || '[]')).filter((e) => e.accountId).length);
  if (stamped !== 0) throw new Error(stamped + ' entries were rewritten with an accountId they did not need');
  // One account means no filter and no per-row account tag: both would name
  // the only place the money could be.
  if (await page.locator('#account-filter-select').count() !== 0) throw new Error('the account filter shows with a single account');
  if (await page.locator('.row-account-tag').count() !== 0) throw new Error('rows are tagged with the only account there is');
  await ctx.close();
});

// The property that lets "combined" stay the default and still be right: an
// internal transfer is two equal and opposite movements, so it changes each
// account's balance and leaves the household's alone.
await test('accounts: a transfer moves money between two accounts and nets to nothing overall', async () => {
  const accts = JSON.stringify([
    { id: 'acct-main', name: 'Chequing', kind: 'chequing' },
    { id: 'acct-sav', name: 'Savings', kind: 'savings', opening: 500000 },
  ]);
  const xfer = JSON.stringify([{ id: 7001, desc: 'To savings', type: 'transfer', transferDirection: 'out',
    amount: 40000, category: 'Savings / RRSP', repeats: true, recurUnit: 'month', recurEvery: 1,
    recurDays: [], recurEnd: '', startDate: '2026-01-20', notes: '',
    accountId: 'acct-main', toAccountId: 'acct-sav' }]);
  const cents = (s) => { const neg = /-/.test(s); const n = Math.round(parseFloat((s || '').replace(/[^0-9.]/g, '') || '0') * 100); return neg ? -n : n; };
  // January, because the Monthly view's "Opening Balance" is the month's, not
  // the year's — by August an account has absorbed seven months of movement
  // and no longer opens on the share it was configured with.
  const toJanuary = async (page) => {
    await page.locator('.month-picker button', { hasText: /^Jan$/ }).first().click();
    await page.waitForTimeout(600);
  };
  const read = async (page) => ({
    opening: cents(await page.locator('.openbal-row').innerText()),
    closing: cents(await page.locator('.budget-col-balance').nth(-2).innerText()),
    net: cents((await page.locator('.budget-totals-row').innerText()).trim().split(/\s+/).pop()),
  });

  // Baseline: the same household with no transfer at all.
  const plain = await ctxPage({ stub: (t) => t.replace('goals: [],', `goals: [], accounts: ${accts},`) });
  await plain.page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await plain.page.waitForTimeout(1400);
  const nudge0 = plain.page.getByRole('button', { name: 'Remind me later' });
  if (await nudge0.count() > 0) await nudge0.click().catch(() => {});
  await toJanuary(plain.page);
  const before = await read(plain.page);
  await plain.ctx.close();

  const { ctx, page } = await ctxPage({ stub: (t) => t
    .replace('const payload = {', `entries.push(...${xfer}); const payload = {`)
    .replace('goals: [],', `goals: [], accounts: ${accts},`) });
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  await toJanuary(page);

  // Combined: the transfer appears twice — leaving one account, arriving in
  // the other — and the month's net movement is exactly what it was without it.
  const legs = await page.locator('tbody tr', { hasText: 'To savings' }).count();
  if (legs !== 2) throw new Error(`an internal transfer produced ${legs} rows, expected both legs`);
  const combined = await read(page);
  if (combined.net !== before.net) {
    throw new Error(`an internal transfer moved the household's net by ${(combined.net - before.net) / 100}`);
  }
  if (combined.opening !== before.opening) throw new Error('the combined opening balance changed');

  // Narrowed: each account carries its own share of the opening balance and
  // only its own side of the transfer.
  const per = {};
  for (const name of ['Chequing', 'Savings']) {
    await page.locator('#account-filter-select').selectOption({ label: name });
    await page.waitForTimeout(800);
    await toJanuary(page);
    per[name] = await read(page);
    const rows = await page.locator('tbody tr', { hasText: 'To savings' }).count();
    if (rows !== 1) throw new Error(`${name} shows ${rows} sides of the transfer, expected exactly one`);
  }
  if (per.Chequing.opening + per.Savings.opening !== combined.opening) {
    throw new Error(`the account openings (${per.Chequing.opening} + ${per.Savings.opening}) do not add to the household's ${combined.opening}`);
  }
  if (per.Savings.opening !== 500000) throw new Error('savings did not get the opening share it was given: ' + per.Savings.opening);
  // The transfer is money out of one and into the other, in equal measure.
  if (per.Chequing.net + per.Savings.net !== combined.net) {
    throw new Error(`the accounts' net movements do not add to the household's`);
  }
  if (per.Savings.net !== 40000) throw new Error('savings did not receive the transfer: ' + per.Savings.net);
  await ctx.close();
});

// A credit card is an ordinary account whose balance runs below zero. There is
// one arithmetic in this app and it has been kept carefully; a second one for
// liabilities would be the thing that breaks it.
await test('accounts: a credit card is an ordinary account that runs negative', async () => {
  const accts = JSON.stringify([
    { id: 'acct-main', name: 'Chequing', kind: 'chequing' },
    { id: 'acct-visa', name: 'Visa', kind: 'credit', opening: -120000 },
  ]);
  const card = JSON.stringify([{ id: 7101, desc: 'Card groceries', type: 'expense', amount: 20000,
    category: 'Food', repeats: true, recurUnit: 'month', recurEvery: 1, recurDays: [],
    recurEnd: '', startDate: '2026-01-06', notes: '', accountId: 'acct-visa' }]);
  const { ctx, page } = await ctxPage({ stub: (t) => t
    .replace('const payload = {', `entries.push(...${card}); const payload = {`)
    .replace('goals: [],', `goals: [], accounts: ${accts},`) });
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  await page.locator('#account-filter-select').selectOption({ label: 'Visa' });
  await page.waitForTimeout(900);
  // January: by August the card has absorbed seven months of purchases.
  await page.locator('.month-picker button', { hasText: /^Jan$/ }).first().click();
  await page.waitForTimeout(700);
  const opening = (await page.locator('.openbal-row').innerText()).replace(/\s+/g, ' ');
  if (!/-\$1,200\.00/.test(opening)) throw new Error('the card did not open where it was told to: ' + opening);
  // Spending on it takes the balance further below zero, exactly as spending
  // from a chequing account takes it towards zero. Same arithmetic.
  const balances = await page.locator('.budget-col-balance').allInnerTexts();
  if (!balances.some((b) => /-\$1,[34]\d\d\.00/.test(b))) {
    throw new Error('a card purchase did not deepen the balance: ' + balances.join(' | '));
  }
  await ctx.close();
});

// Removing an account must not remove the money filed under it.
await test('accounts: removing one re-homes its entries rather than deleting them', async () => {
  const accts = JSON.stringify([
    { id: 'acct-main', name: 'Chequing', kind: 'chequing' },
    { id: 'acct-sav', name: 'Savings', kind: 'savings', opening: 0 },
  ]);
  const saved = JSON.stringify([{ id: 7201, desc: 'Interest', type: 'income', amount: 500,
    category: 'Income', repeats: true, recurUnit: 'month', recurEvery: 1, recurDays: [],
    recurEnd: '', startDate: '2026-01-28', notes: '', accountId: 'acct-sav' }]);
  const { ctx, page } = await ctxPage({ stub: (t) => t
    .replace('const payload = {', `entries.push(...${saved}); const payload = {`)
    .replace('goals: [],', `goals: [], accounts: ${accts},`) });
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  await page.locator('#sec-accounts button[aria-label="Remove Savings"]').click();
  await page.waitForTimeout(400);
  const warning = await page.locator('.modal-card').innerText();
  if (!/1 entry moves/.test(warning)) throw new Error('the dialog does not say what happens to the entries: ' + warning.replace(/\s+/g, ' '));
  // Scoped to the dialog: "Remove" also matches the "Remove Savings" button
  // behind the overlay, which is exactly the one that cannot be clicked.
  await page.locator('.confirm-dialog-card button.cf-btn--danger-solid').click();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('cf_accounts') || '[]'),
    interest: (JSON.parse(localStorage.getItem('cf_entries') || '[]')).find((e) => e.desc === 'Interest'),
  }));
  if (after.accounts.length !== 1) throw new Error('the account was not removed');
  if (!after.interest) throw new Error('removing an account deleted an entry filed under it');
  if (after.interest.accountId) throw new Error('the entry still points at an account that is gone: ' + after.interest.accountId);
  await ctx.close();
});


// ── The four flows that carry data between builds ────────────────────────────
// Add/copy year, export, restore and cloud sync all move a whole household
// between shapes, so every field added anywhere else has to be carried by all
// four. The failure mode is silent: the save succeeds, the app looks right, and
// the field is simply gone next time. These pin the fields added most recently
// — the ones with no history of being carried.

await test('carry-through: adding a year keeps the newest entry fields on the copies', async () => {
  const extra = JSON.stringify([
    // One-time, so the year roll actually clones it rather than letting the
    // recurrence span the boundary on its own.
    { id: 8003, desc: 'Card groceries', type: 'expense', amount: 20000, category: 'Food',
      repeats: false, recurUnit: 'month', recurEvery: 1, recurDays: [], recurEnd: '',
      startDate: '2026-03-06', notes: '', accountId: 'acct-visa', bankingDay: false },
  ]);
  const accts = JSON.stringify([
    { id: 'acct-main', name: 'Chequing', kind: 'chequing' },
    { id: 'acct-visa', name: 'Visa', kind: 'credit', opening: -120000 },
  ]);
  const { ctx, page } = await ctxPage({ stub: (t) => t
    .replace('const payload = {', `entries.push(...${extra}); const payload = {`)
    .replace('goals: [],', `goals: [], accounts: ${accts},`) });
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  // Named after the year it adds; "+ Add" alone is the category button and
  // "+ Add account" is the Accounts card.
  await page.getByRole('button', { name: '+ Add 2027' }).click();
  await page.waitForTimeout(1800);
  const copy = await page.evaluate(() => (JSON.parse(localStorage.getItem('cf_entries') || '[]'))
    .find((e) => String(e.copiedFrom) === '8003'));
  if (!copy) throw new Error('the one-time entry was not copied into the new year');
  if (copy.accountId !== 'acct-visa') throw new Error('the copy lost its account: ' + JSON.stringify(copy.accountId));
  if (copy.bankingDay !== false) throw new Error('the copy lost its deposit-date setting: ' + JSON.stringify(copy.bankingDay));

  // And each account's new year opens exactly where its old one closed —
  // the carry is per account, not just for the household total.
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const cents = (s2) => { const neg = /-/.test(s2); const n = Math.round(parseFloat((s2 || '').replace(/[^0-9.]/g, '') || '0') * 100); return neg ? -n : n; };
  const at = async (year, acct, month) => {
    await page.getByRole('button', { name: 'Budget year ' + year }).click();
    await page.waitForTimeout(700);
    await page.locator('#account-filter-select').selectOption({ label: acct });
    await page.waitForTimeout(700);
    await page.locator('.month-picker button', { hasText: new RegExp('^' + month + '$') }).first().click();
    await page.waitForTimeout(700);
  };
  for (const acct of ['Chequing', 'Visa']) {
    await at(2026, acct, 'Dec');
    const bals = (await page.locator('.budget-col-balance').allInnerTexts()).filter((b) => /\$/.test(b));
    const open26 = cents(await page.locator('.openbal-row').innerText());
    const close26 = bals.length > 1 ? cents(bals[bals.length - 2]) : open26;
    await at(2027, acct, 'Jan');
    const open27 = cents(await page.locator('.openbal-row').innerText());
    if (open27 !== close26) {
      throw new Error(`${acct}: 2026 closed at ${close26 / 100} but 2027 opens at ${open27 / 100}`);
    }
  }
  await ctx.close();
});

await test('carry-through: a backup round-trips accounts, activity and the entry fields', async () => {
  const extra = JSON.stringify([
    { id: 8001, desc: 'To savings', type: 'transfer', transferDirection: 'out', amount: 40000,
      category: 'Savings / RRSP', repeats: true, recurUnit: 'month', recurEvery: 1, recurDays: [],
      recurEnd: '', startDate: '2026-01-20', notes: '', accountId: 'acct-main', toAccountId: 'acct-sav' },
    { id: 8002, desc: 'Acme deposit', type: 'income', amount: 250000, category: 'Income', repeats: true,
      recurUnit: 'month', recurEvery: 1, recurDays: [], recurEnd: '', startDate: '2026-08-15',
      notes: '', bankingDay: true },
  ]);
  const accts = JSON.stringify([
    { id: 'acct-main', name: 'Chequing', kind: 'chequing' },
    { id: 'acct-sav', name: 'Savings', kind: 'savings', opening: 500000 },
  ]);
  const capture = `(() => {
    window.__downloads = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = (b) => { try { b.text().then((t) => window.__downloads.push(t)); } catch (e) {} return orig ? orig.call(URL, b) : 'blob:stub'; };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) return; return click.apply(this, arguments); };
  })();`;
  const { ctx, page } = await ctxPage({ stub: (t) => t
    .replace('const payload = {', `entries.push(...${extra}); const payload = {`)
    .replace('goals: [],', `goals: [], accounts: ${accts},`) });
  await page.addInitScript(capture);
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  await page.getByRole('button', { name: 'Export Backup' }).click();
  await page.waitForTimeout(900);
  const raw = await page.evaluate(() => window.__downloads[0] || null);
  if (!raw) throw new Error('Export Backup produced no file');
  const json = JSON.parse(raw);
  if (!Array.isArray(json.accounts) || json.accounts.length !== 2) throw new Error('accounts missing from the export: ' + JSON.stringify(json.accounts));
  if (!Array.isArray(json.activity)) throw new Error('activity missing from the export');
  const xf = json.entries.find((e) => String(e.id) === '8001');
  if (!xf || xf.accountId !== 'acct-main' || xf.toAccountId !== 'acct-sav') throw new Error('the export lost the account references: ' + JSON.stringify(xf));
  if (!json.entries.some((e) => e.bankingDay === true)) throw new Error('the export lost bankingDay');

  // Wipe, restore, and check it all comes back.
  await page.evaluate(() => {
    localStorage.setItem('cf_entries', '[]');
    localStorage.setItem('cf_accounts', JSON.stringify([{ id: 'x', name: 'Wrong', kind: 'other' }]));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const nudge2 = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge2.count() > 0) await nudge2.click().catch(() => {});
  await page.setInputFiles('input[type=file][accept=".json"]', {
    name: 'CashFlow_Backup_2026-08-25.json', mimeType: 'application/json', buffer: Buffer.from(raw),
  });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Restore', exact: true }).last().click();
  await page.waitForTimeout(1600);
  const back = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('cf_accounts') || '[]'),
    entries: JSON.parse(localStorage.getItem('cf_entries') || '[]'),
  }));
  if (JSON.stringify(back.accounts) !== JSON.stringify(json.accounts)) throw new Error('accounts did not come back: ' + JSON.stringify(back.accounts));
  const rxf = back.entries.find((e) => String(e.id) === '8001');
  if (!rxf || rxf.accountId !== 'acct-main' || rxf.toAccountId !== 'acct-sav') throw new Error('the restore lost the account references: ' + JSON.stringify(rxf));
  if (!back.entries.some((e) => e.bankingDay === true)) throw new Error('the restore lost bankingDay');
  await ctx.close();
});

// A backup taken before accounts existed carries no accounts key. Restore
// *replaces*, so the field falls to its default — and the default has to be
// one account, never none: a household with zero accounts is the single state
// the rest of the app cannot render.
await test('carry-through: restoring a backup that predates accounts leaves exactly one', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  await page.setInputFiles('input[type=file][accept=".json"]', {
    name: 'CashFlow_Backup_2026-08-01.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      schemaVersion: 9, exportedAt: '2026-08-01T00:00:00Z',
      entries: [{ id: 1, desc: 'Rent', type: 'expense', amount: 165000, category: 'Housing', repeats: true,
        recurUnit: 'month', recurEvery: 1, recurDays: [], recurEnd: '', startDate: '2026-01-01', notes: '' }],
      yearConfigs: [{ year: 2026, openingBalance: 1000000 }],
      overridesByYr: {}, categories: ['Housing'], goals: [], budgetTargets: {},
    })),
  });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Restore', exact: true }).last().click();
  await page.waitForTimeout(1700);
  const accounts = await page.evaluate(() => JSON.parse(localStorage.getItem('cf_accounts') || 'null'));
  if (!Array.isArray(accounts) || accounts.length !== 1) throw new Error('accounts after restore: ' + JSON.stringify(accounts));
  if (accounts[0].id !== 'acct-main') throw new Error('the wrong account survived: ' + JSON.stringify(accounts));
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  if (await page.locator('.budget-totals-row').count() !== 1) throw new Error('the restored household renders no budget');
  if (await page.locator('#account-filter-select').count() !== 0) throw new Error('a filter appeared for a single account');
  await ctx.close();
});

// A household with zero accounts is the one state the rest of the app cannot
// render — every entry would point at an account that is not there. An absent
// accounts key is safe (restore falls back to the default, a cloud load leaves
// what the device has); an explicitly empty array is the case that needs a
// guard of its own, and it can arrive from either.
await test('accounts: a payload carrying an empty account list never leaves a household with none', async () => {
  const { ctx, page } = await ctxPage({ stub: (t) => t.replace('goals: [],', 'goals: [], accounts: [],') });
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  if (pageErrors.length) throw new Error('the empty list threw: ' + pageErrors[0]);
  if (await page.locator('.budget-totals-row').count() !== 1) throw new Error('an empty account list left no budget to render');
  // ...and the same through a restore.
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.setInputFiles('input[type=file][accept=".json"]', {
    name: 'CashFlow_Backup_2026-08-25.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      schemaVersion: 10, exportedAt: '2026-08-25T00:00:00Z', accounts: [],
      entries: [{ id: 1, desc: 'Rent', type: 'expense', amount: 165000, category: 'Housing', repeats: true,
        recurUnit: 'month', recurEvery: 1, recurDays: [], recurEnd: '', startDate: '2026-01-01', notes: '' }],
      yearConfigs: [{ year: 2026, openingBalance: 1000000 }], overridesByYr: {}, categories: ['Housing'],
    })),
  });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Restore', exact: true }).last().click();
  await page.waitForTimeout(1700);
  const accounts = await page.evaluate(() => JSON.parse(localStorage.getItem('cf_accounts') || 'null'));
  if (!Array.isArray(accounts) || accounts.length !== 1) throw new Error('after restoring an empty list: ' + JSON.stringify(accounts));
  await ctx.close();
});

// The filter is device-local, so signing into a different household — or an
// account deleted on another device — can leave it naming an id that is gone.
// Showing an empty budget for that would read as data loss.
await test('accounts: a filter naming an account that is gone falls back to combined', async () => {
  const accts = JSON.stringify([
    { id: 'acct-main', name: 'Chequing', kind: 'chequing' },
    { id: 'acct-sav', name: 'Savings', kind: 'savings', opening: 500000 },
  ]);
  const { ctx, page } = await ctxPage({ stub: (t) => t.replace('goals: [],', `goals: [], accounts: ${accts},`) });
  await page.addInitScript('try{localStorage.setItem("cf_account_filter", JSON.stringify("acct-gone"))}catch(e){}');
  await page.goto(BASE + '#/flow/list', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});
  const sel = await page.locator('#account-filter-select').inputValue();
  if (sel !== '') throw new Error('the filter settled on a missing account: "' + sel + '"');
  if (await page.locator('tbody tr').count() < 4) throw new Error('the budget came back empty');
  await ctx.close();
});

// The feed advertised a "Year" kind it never emitted, and account changes went
// unrecorded — both of which are exactly the "the budget edited itself"
// complaint the feed exists to answer.
await test('activity: budget years and accounts are recorded too', async () => {
  const { ctx, page } = await ctxPage();
  const feed = () => page.evaluate(() => JSON.parse(localStorage.getItem('cf_activity') || '[]'));
  await page.goto(BASE + '#/you', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const nudge = page.getByRole('button', { name: 'Remind me later' });
  if (await nudge.count() > 0) await nudge.click().catch(() => {});

  await page.getByRole('button', { name: '+ Add 2027' }).click();
  await page.waitForTimeout(1200);
  if (!(await feed()).some((a) => a.kind === 'year' && /Added budget year 2027/.test(a.what))) {
    throw new Error('adding a budget year was not recorded');
  }
  await page.getByRole('button', { name: '+ Add account' }).click();
  await page.waitForTimeout(700);
  if (!(await feed()).some((a) => a.kind === 'account' && /Added an account/.test(a.what))) {
    throw new Error('adding an account was not recorded');
  }
  // A rename is one line, on blur — not one per keystroke.
  const before = (await feed()).length;
  const name = page.locator('#sec-accounts .account-name').nth(1);
  await name.fill('Rainy day');
  await name.blur();
  await page.waitForTimeout(700);
  const afterRename = await feed();
  if (afterRename.length !== before + 1) throw new Error(`${afterRename.length - before} lines written for one rename`);
  if (!afterRename.some((a) => a.kind === 'account' && /Rainy day/.test(a.what))) throw new Error('the rename says nothing useful: ' + JSON.stringify(afterRename[0]));

  await page.locator('#sec-accounts button[aria-label="Remove Rainy day"]').click();
  await page.waitForTimeout(400);
  await page.locator('.confirm-dialog-card button.cf-btn--danger-solid').click();
  await page.waitForTimeout(900);
  if (!(await feed()).some((a) => a.kind === 'account' && /Removed the account Rainy day/.test(a.what))) {
    throw new Error('removing an account was not recorded');
  }
  await ctx.close();
});

// ── The phone layout ────────────────────────────────────────────────────────
// Three properties the mobile pass fixed, each of which had drifted quietly
// because nothing measured it: a control small enough to miss with a thumb, a
// toolbar whose buttons came from two different type scales, and a section
// heading that had ended up right-aligned. All three are measured on what
// actually renders at 393px, across every view — the defects were spread
// thinly over many screens rather than concentrated in one.
await test('phone: every control is big enough to hit', async () => {
  const { ctx, page } = await ctxPage({ touch: true, stub: (t) => t
    .replace('goals: [],', 'goals: ' + JSON.stringify([
      { id: 'g1', name: 'Emergency fund', target: 1000000, saved: 420000, monthly: 50000, targetDate: '2027-06-01' },
    ]) + ', accounts: ' + JSON.stringify([
      { id: 'acct-main', name: 'Chequing', kind: 'chequing' },
      { id: 'acct-sav', name: 'Savings', kind: 'savings', opening: 500000 },
    ]) + ',') });
  const small = [];
  for (const [route, label] of [['#/today', 'Today'], ['#/flow/list', 'Monthly'],
    ['#/envelopes', 'BvA'], ['#/flow/curve', 'Forecast'], ['#/flow/entries', 'Entries'],
    ['#/plan/debt', 'Debt'], ['#/plan/goals', 'Goals'], ['#/you', 'You']]) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    await page.waitForTimeout(250);
    const found = await page.evaluate(() => {
      // A tap target is the border box grown by any absolutely-positioned
      // pseudo-element hanging outside it — the padded-halo pattern the app
      // uses to keep a control visually small without shrinking its hit area.
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
      const out = [];
      document.querySelectorAll('main button, main a[href], main select, .cf-bottomnav button').forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) return;
        // A link inside a sentence is exempt (WCAG 2.5.5) and a halo there
        // would cover the field under it.
        if (el.classList.contains('link-primary')) return;
        const r = el.getBoundingClientRect();
        const [hx, hy] = halo(el);
        const w = Math.round(r.width + hx), h = Math.round(r.height + hy);
        if (w < 44 || h < 44) out.push((el.className || el.tagName) + ' ' + w + 'x' + h);
      });
      return out;
    });
    found.forEach((f) => small.push(label + ': ' + f));
  }
  await ctx.close();
  if (small.length) throw new Error(small.length + ' controls under 44px — ' + small.slice(0, 4).join('; '));
});

await test('phone: a toolbar\'s buttons are all the same size', async () => {
  const { ctx, page } = await ctxPage({ touch: true, stub: (t) => t.replace('goals: [],', 'goals: ' + JSON.stringify([
    { id: 'g1', name: 'Emergency fund', target: 1000000, saved: 420000, monthly: 50000, targetDate: '2027-06-01' },
  ]) + ',') });
  const off = [];
  let seen = 0;
  for (const [route, label] of [['#/today', 'Today'], ['#/flow/list', 'Monthly'],
    ['#/flow/calendar', 'Calendar'], ['#/flow/curve', 'Forecast'], ['#/plan/debt', 'Debt'], ['#/plan/goals', 'Goals']]) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.click().catch(() => {});
    await page.waitForTimeout(250);
    // Found through the CSV button rather than through a class name, so the
    // test measures the toolbar as it renders and not the markup that
    // happens to describe it today.
    const boxes = await page.evaluate(() => {
      const bars = new Set([...document.querySelectorAll('main button')]
        .filter((b) => b.textContent.trim() === 'CSV').map((b) => b.parentElement));
      return [...bars].map((bar) => [...bar.querySelectorAll('button')].map((b) => {
        const s = getComputedStyle(b);
        return s.fontSize + ' / ' + s.paddingTop + ' ' + s.paddingLeft;
      }));
    });
    seen += boxes.length;
    boxes.forEach((sizes) => {
      if (new Set(sizes).size > 1) off.push(label + ': ' + [...new Set(sizes)].join(' vs '));
    });
  }
  await ctx.close();
  if (seen < 6) throw new Error(`only ${seen} export toolbars found across six views — the selector has gone stale`);
  if (off.length) throw new Error('mixed button sizes in one toolbar — ' + off.join('; '));
});

await test('phone: a section heading reads from the left, whatever else is in its row', async () => {
  const { ctx, page } = await ctxPage({ touch: true });
  await page.goto(BASE + '#/plan/debt', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  // The Debt Payoff header carries no controls, so its title used to be the
  // last child of the header row and inherited the row's right alignment.
  const gap = await page.evaluate(() => {
    const title = [...document.querySelectorAll('h2')].find((h) => /Debt Payoff Tracker/i.test(h.textContent));
    if (!title) return null;
    const card = title.closest('.cf-card');
    const cs = getComputedStyle(card);
    return Math.round(title.getBoundingClientRect().left - (card.getBoundingClientRect().left + parseFloat(cs.paddingLeft)));
  });
  await ctx.close();
  if (gap === null) throw new Error('no Debt Payoff heading rendered');
  if (gap > 2) throw new Error(`the heading starts ${gap}px in from the card's text edge, so it is not left-aligned`);
});

await browser.close();
server.close();

// ── Report ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
for (const r of results) {
  console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? '  → ' + r.detail : ''));
  r.ok ? pass++ : fail++;
}
console.log(`\n${pass}/${results.length} passed, ${fail} failed`);
// Repeat the failures under the count: on a full run the PASS lines scroll the
// interesting ones off the top of a CI log, and "1 failed" on its own says
// nothing about what broke.
if (fail) {
  console.log('\nFailed:');
  for (const r of results.filter((x) => !x.ok)) console.log('  • ' + r.name + (r.detail ? '\n      ' + r.detail : ''));
}
if (pageErrors.length) console.log('total page errors seen: ' + pageErrors.length);
process.exit(fail ? 1 : 0);
