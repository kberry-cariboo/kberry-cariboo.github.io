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
const server = createServer((req, res) => {
  try {
    const path = req.url.split('?')[0].split('#')[0];
    const file = path === '/' || path === '/index.html' ? 'index.html' : path.slice(1);
    const body = readFileSync(join(ROOT, file));
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

async function ctxPage({ touch = false, dark = false, loggedIn = true } = {}) {
  const ctx = await browser.newContext({
    viewport: touch ? { width: 393, height: 852 } : { width: 1440, height: 900 },
    hasTouch: touch, isMobile: touch, colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  lastPage = page;
  await page.addInitScript(mkStub(dark, loggedIn));
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
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/budget/bva', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByText('Budget vs Actual', { exact: false }).first().waitFor(V);
    await page.getByText('over', { exact: false }).first().waitFor(V);
  });

  await test('budget forecast: the horizon toggle switches between 30 and 90 days', async () => {
    await page.goto(BASE + '#/budget/forecast', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '30 days' }).click();
    await page.waitForTimeout(300);
    await page.getByText('30-Day Forecast', { exact: false }).waitFor(V);
    await page.getByRole('button', { name: '90 days' }).click();
    await page.getByText('90-Day Forecast', { exact: false }).waitFor(V);
  });

  await test('entries: adding an entry from the desktop form saves it and lists it', async () => {
    await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/ai', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByText('AI Financial Assessment', { exact: false }).waitFor(V);
  });

  await test('budget monthly: skipping an occurrence hides it and restoring brings it back', async () => {
    await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const incomeBefore = await page.locator('.kpi-tile', { hasText: 'Annual Income' }).locator('.kpi-spark-value').innerText();

    await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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

    await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
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
  // Every balance in the app is projected from the year's opening figure; the
  // Help page is explicit that marking an occurrence paid is a tick-off, not a
  // reconciliation. Nothing measured the projection against reality, and the
  // only correction available rewrote the whole year.
  await test('dashboard: reconciling to the bank adjusts today without touching income or expenses', async () => {
    await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const row = page.locator('.forecast-table tbody tr').filter({ hasText: 'Rent' }).first();
    await row.locator('td').nth(2).click();
    await page.waitForTimeout(500);
    const amount = page.locator('.modal-card input[inputmode="decimal"]').first();
    await amount.fill('1751');
    await page.getByRole('button', { name: /^Save/ }).first().click();
    await page.waitForTimeout(600);

    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /Audit/i }).first().click();
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
    // asserts on, and leaving Settings on Audit meant the next test to open
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
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/budget/bva', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const housingRowBefore = page.locator('.bva-row', { hasText: 'Housing' }).first();
    const actualBeforeCents = parseMoney(await housingRowBefore.locator('.bva-actual-amt').innerText());

    await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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

    await page.goto(BASE + '#/budget/bva', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const housingRowAfter = page.locator('.bva-row', { hasText: 'Housing' }).first();
    const actualAfterCents = parseMoney(await housingRowAfter.locator('.bva-actual-amt').innerText());
    if (actualAfterCents - actualBeforeCents !== 5000) {
      throw new Error(`BvA actual did not pick up the $50 reconciliation: before=${actualBeforeCents} after=${actualAfterCents}`);
    }

    // Reset back to the scheduled amount so later tests see the original fixture.
    await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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
    await step('goto', () => page.goto(BASE + '#/settings', { waitUntil: 'load' }));
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
    await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.locator('.user-avatar-btn').click();
    await page.getByRole('button', { name: 'Help' }).click();
    await page.locator('#help-shortcuts').waitFor(V);
    const sections = await page.locator('.help-page .cf-card').count();
    if (sections < 8) throw new Error('help page rendered only ' + sections + ' sections');
    // The shortcuts moved out of their modal into this page — the modal is
    // gone, so "?" has to land here instead.
    await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('.skip-link').click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll('.tab-bar-btn')[1].click());
    await page.waitForTimeout(500);
    const hash = await page.evaluate(() => location.hash);
    if (!hash.startsWith('#/budget')) throw new Error('hash stuck at "' + hash + '" after switching to Budget');
  });

  await test('dashboard: Customize closes on Escape, like every other dialog', async () => {
    await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
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
  await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const active = page.locator('.month-picker button[data-active="true"]').first();
  const bg = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (bg === bodyBg) throw new Error('active pill blends into background: ' + bg);
  await ctx.close();
});

await test('dark mode: charts render with theme colours', async () => {
  const { ctx, page } = await ctxPage({ dark: true });
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const n = await page.locator('.cf-card svg').count();
  if (n < 3) throw new Error('expected ≥3 chart svgs, got ' + n);
  await ctx.close();
});

// ── Mobile ───────────────────────────────────────────────────────────────
{
  const { ctx, page } = await ctxPage({ touch: true });
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await test('mobile: the bottom nav switches tabs', async () => {
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Budget' }).tap();
    await page.waitForTimeout(600);
    await page.getByText('Opening Balance', { exact: false }).first().waitFor(V);
    const cur = await page.locator('.cf-bottomnav button[aria-current="page"]').getAttribute('aria-label');
    if (cur !== 'Budget') throw new Error('aria-current on ' + cur);
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
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Budget' }).tap({ force: true });
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
      await page.locator('.cf-bottomnav').getByRole('button', { name: tab === 'dashboard' ? 'Dashboard' : 'Budget' }).tap({ force: true });
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
    for (const [tab, label] of [['dashboard', 'Dashboard'], ['budget', 'Budget'], ['plan', 'Plan'], ['settings', 'Settings']]) {
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
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Settings' }).tap({ force: true });
    await page.waitForTimeout(700);
    const tips = page.locator('.helptip-btn');
    const n = await tips.count();
    if (n === 0) throw new Error('no help tips on Settings');
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
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Settings' }).tap();
    await page.waitForTimeout(800);
    await page.getByText('Auto-lock when in background', { exact: false }).waitFor(V);
    // headless chromium: no platform authenticator → toggle must be absent
    if (await page.getByText('Unlock with fingerprint / face').count() > 0) throw new Error('biometric toggle shown without authenticator');
  });

  await ctx.close();
}

await test('mobile dark mode: the active nav item is highlighted, not dimmed', async () => {
  const { ctx, page } = await ctxPage({ touch: true, dark: true });
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const activeColor = await page.locator('.cf-bottomnav button[aria-current="page"]').evaluate((el) => getComputedStyle(el).color);
  const inactiveColor = await page.locator('.cf-bottomnav button:not([aria-current])').first().evaluate((el) => getComputedStyle(el).color);
  const lum = (c) => { const m = c.match(/\d+/g); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  if (lum(activeColor) <= lum(inactiveColor)) throw new Error(`active ${activeColor} darker than inactive ${inactiveColor}`);
  await ctx.close();
});

await test('mobile: the Daily subtab is hidden, since Monthly cards already read day by day', async () => {
  const { ctx, page } = await ctxPage({ touch: true });
  await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  if (await page.locator('.bp-daily').isVisible().catch(() => false)) {
    throw new Error('Daily subtab is visible on a mobile viewport');
  }
  await page.getByRole('button', { name: 'Monthly' }).waitFor(V);
  await ctx.close();
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
  await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
  await page.getByText('Old Format Rent', { exact: false }).first().waitFor(V);
  await page.getByText('-$1,234.56', { exact: false }).first().waitFor(V);
  const wrongScale = await page.getByText('$123,456', { exact: false }).count();
  if (wrongScale > 0) throw new Error('pre-v8 payload was not upgraded — rendered 100x too large');
  await ctx.close();
});

// ── Field-level help ────────────────────────────────────────────────────────
await test('help tips: a field explains itself on hover instead of in permanent body copy', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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

  await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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
  await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const entryRow = page.locator('tr', { hasText: 'Ken - Payroll (15th)' }).first();
  if (!(await entryRow.innerText()).includes('2026-01-15')) throw new Error("the recurring entry's date was rewritten: " + await entryRow.innerText());
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

  await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
  await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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
  await page.goto(BASE + '#/settings', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await section.scrollIntoViewIfNeeded();
  await section.locator('.holiday-row', { hasText: 'QA Company Shutdown' }).getByRole('button', { name: /Remove/ }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).last().click();
  await page.waitForTimeout(400);
  if (await section.locator('.holiday-row', { hasText: 'QA Company Shutdown' }).count() > 0) throw new Error('the holiday was not removed');
  await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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

  await page.goto(BASE + '#/settings', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const section = page.locator('#sec-holidays');
  await section.scrollIntoViewIfNeeded();
  // Nothing is fetched until asked — an automatic refresh would overwrite
  // hand-corrected dates and sync that to the whole household.
  if ((await page.evaluate(() => window.__holidayFetches || [])).length !== 0) {
    throw new Error('the app fetched holidays without being asked');
  }
  await section.getByRole('button', { name: /Fetch 2026 from canada-holidays\.ca/ }).click();
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

  await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
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

  await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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

  await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/budget', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: '+ Add 2027' }).click();
    await page.waitForTimeout(900);
    // Delete the 2027 copy the way a user would — the row menu in Entries,
    // which is what records the tombstone in the first place.
    await page.goto(BASE + '#/budget/entries', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
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
    if (json.schemaVersion !== 9) throw new Error('schemaVersion ' + json.schemaVersion);
    if (isNaN(Date.parse(json.exportedAt))) throw new Error('exportedAt ' + json.exportedAt);
    // Every field HOUSEHOLD_FIELDS marks `backup: true`. Update this list in
    // the same commit that changes that flag — the point is that dropping a
    // field from the backup has to be a decision, not a side effect.
    for (const k of ['entries', 'overridesByYr', 'yearConfigs', 'categories', 'categoryColors',
      'activeYear', 'alertThreshold', 'darkMode', 'goals', 'budgetTargets', 'templates',
      'completed', 'debtData', 'deletedCopyIds', 'holidays']) {
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
