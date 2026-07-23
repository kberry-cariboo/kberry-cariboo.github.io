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
async function test(name, fn) {
  const errBefore = pageErrors.length;
  try {
    await fn();
    const newErrs = pageErrors.slice(errBefore);
    if (newErrs.length) results.push({ name, ok: false, detail: 'JS error: ' + newErrs[0] });
    else results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, detail: String(e.message || e).split('\n')[0].slice(0, 160) });
    try { if (lastPage) await lastPage.screenshot({ path: join(ROOT, 'tests', 'fail-' + name.split(' ')[0] + '.png') }); } catch {}
  }
}

const V = { timeout: 6000 };

// ── A. Built-in self-test suite ─────────────────────────────────────────────
await test('A1 built-in self-test suite passes', async () => {
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '?selftest', { waitUntil: 'load' });
  const status = await page.getByText(/checks passed/, V).textContent();
  const m = status.match(/(\d+)\/(\d+)/);
  if (!m || m[1] !== m[2]) throw new Error('self-test: ' + status);
  await ctx.close();
});

// ── B. Desktop light ────────────────────────────────────────────────────────
{
  const { ctx, page } = await ctxPage();
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await test('B1 dashboard renders KPIs + charts', async () => {
    for (const t of ['Balance today', 'Annual Income', 'Running Balance', 'Income vs Expenses', 'Top Expense Categories', 'Budget vs Actual']) {
      await page.getByText(t, { exact: false }).first().waitFor(V);
    }
  });

  await test('B2 running-balance chart toggles area/line/bar', async () => {
    const card = page.locator('.cf-card', { hasText: 'Running Balance' }).first();
    for (const mode of ['Line', 'Bar', 'Area']) {
      await card.getByRole('button', { name: mode, exact: true }).click();
      await page.waitForTimeout(300);
      if (await card.locator('svg path, svg rect').count() === 0) throw new Error(mode + ' view has no marks');
    }
  });

  await test('B3 line-chart hover shows tooltip', async () => {
    const card = page.locator('.cf-card', { hasText: 'Running Balance' }).first();
    await card.getByRole('button', { name: 'Line', exact: true }).click();
    const svg = card.locator('svg').first();
    const box = await svg.boundingBox();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.waitForTimeout(400);
    await card.getByText('Balance', { exact: false }).first().waitFor(V); // tooltip row
  });

  await test('B4 income/expense line view has direct end labels', async () => {
    const card = page.locator('.cf-card', { hasText: 'Income vs Expenses' }).first();
    await card.getByRole('button', { name: 'Line', exact: true }).click();
    await page.waitForTimeout(300);
    await card.locator('svg text', { hasText: 'Expenses' }).first().waitFor(V);
  });

  await test('B5 top-categories pie renders slices + labels', async () => {
    const card = page.locator('.cf-card', { hasText: 'Top Expense Categories' }).first();
    await card.getByRole('button', { name: 'Pie', exact: true }).click();
    await page.waitForTimeout(400);
    if (await card.locator('svg path').count() < 3) throw new Error('pie has <3 slices');
  });

  await test('B6 income sources grouped by entry description', async () => {
    const card = page.locator('.cf-card', { hasText: 'Income Sources' }).first();
    await card.getByText('Salary — Acme Corp').waitFor(V);
    await card.getByText('Freelance design').waitFor(V);
  });

  await test('B7 monthly summary heatmap/table toggle', async () => {
    await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
    await page.waitForTimeout(300);
    const cells = await page.locator('.cf-card table td').count();
    if (cells < 12) throw new Error('heat view has ' + cells + ' cells');
    await page.getByRole('button', { name: 'Table', exact: true }).click();
    await page.getByText('Annual Total', { exact: false }).first().waitFor(V);
  });

  await test('B8 budget month navigation updates ledger', async () => {
    await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^Mar$/ }).click();
    await page.waitForTimeout(400);
    await page.getByText('Mar 1–14', { exact: false }).waitFor(V).catch(() => page.getByText('MAR 1', { exact: false }).first().waitFor(V));
  });

  await test('B9 occurrence edit modal opens and closes', async () => {
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

  await test('B10 mark-occurrence-paid checkbox toggles', async () => {
    const cb = page.locator('table [role="checkbox"], table button[aria-checked]').first();
    const before = await cb.getAttribute('aria-checked');
    await cb.click();
    await page.waitForTimeout(300);
    const after = await cb.getAttribute('aria-checked');
    if (before === after) throw new Error('aria-checked did not toggle');
  });

  await test('B11 BvA view shows spent/budget rows with over labels', async () => {
    await page.goto(BASE + '#/budget/bva', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByText('Budget vs Actual', { exact: false }).first().waitFor(V);
    await page.getByText('over', { exact: false }).first().waitFor(V);
  });

  await test('B12 forecast horizon toggle 30/90 days', async () => {
    await page.goto(BASE + '#/budget/forecast', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '30 days' }).click();
    await page.waitForTimeout(300);
    await page.getByText('30-Day Forecast', { exact: false }).waitFor(V);
    await page.getByRole('button', { name: '90 days' }).click();
    await page.getByText('90-Day Forecast', { exact: false }).waitFor(V);
  });

  await test('B13 add entry end-to-end (desktop form)', async () => {
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

  await test('B14 entries search filters rows', async () => {
    await page.getByPlaceholder(/Search/).first().fill('Rent');
    await page.waitForTimeout(400);
    await page.getByText('Rent', { exact: true }).first().waitFor(V);
    if (await page.getByText('Groceries', { exact: true }).count() > 0) throw new Error('search did not filter');
    await page.getByPlaceholder(/Search/).first().fill('');
  });

  await test('B15 plan: goal modal opens', async () => {
    await page.goto(BASE + '#/plan', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '+ Add Goal' }).click();
    await page.locator('.modal-card, .fab-panel').first().waitFor(V);
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await page.waitForTimeout(400);
    if (await page.locator('.modal-overlay').count() > 0) throw new Error('goal modal did not close');
  });

  await test('B16 settings: add category', async () => {
    await page.goto(BASE + '#/settings', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByPlaceholder('New category name').fill('QA Category');
    await page.getByRole('button', { name: '+ Add', exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.getByText('QA Category', { exact: false }).first().waitFor(V);
  });

  await test('B17 settings: dark-mode toggle flips theme live', async () => {
    const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    await page.getByRole('switch', { name: 'Dark Mode' }).click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    if (before === after) throw new Error('--bg unchanged: ' + before);
    await page.getByRole('switch', { name: 'Dark Mode' }).click(); // restore
  });

  await test('B18 AI tab renders without key', async () => {
    await page.goto(BASE + '#/ai', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.getByText('AI Financial Assessment', { exact: false }).waitFor(V);
  });

  await ctx.close();
}

// ── C. Desktop dark spot-checks ─────────────────────────────────────────────
await test('C1 dark: active month pill visibly styled (not surface color)', async () => {
  const { ctx, page } = await ctxPage({ dark: true });
  await page.goto(BASE + '#/budget/monthly', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const active = page.locator('.month-picker button[data-active="true"]').first();
  const bg = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (bg === bodyBg) throw new Error('active pill blends into background: ' + bg);
  await ctx.close();
});

await test('C2 dark: charts render with theme colors', async () => {
  const { ctx, page } = await ctxPage({ dark: true });
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const n = await page.locator('.cf-card svg').count();
  if (n < 3) throw new Error('expected ≥3 chart svgs, got ' + n);
  await ctx.close();
});

// ── D. Mobile ───────────────────────────────────────────────────────────────
{
  const { ctx, page } = await ctxPage({ touch: true });
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  await test('D1 bottom nav navigates between tabs', async () => {
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Budget' }).tap();
    await page.waitForTimeout(600);
    await page.getByText('Opening Balance', { exact: false }).first().waitFor(V);
    const cur = await page.locator('.cf-bottomnav button[aria-current="page"]').getAttribute('aria-label');
    if (cur !== 'Budget') throw new Error('aria-current on ' + cur);
  });

  await test('D2 mobile ledger cards show signed amounts', async () => {
    await page.getByText('-$1,650.00', { exact: false }).first().waitFor(V);
  });

  await test('D3 swipe-tip "Got it" dismisses', async () => {
    const btn = page.getByRole('button', { name: 'Got it' });
    if (await btn.count() === 0) return; // already dismissed — fine
    await btn.tap();
    await page.waitForTimeout(300);
    if (await btn.count() > 0) throw new Error('tip still visible');
  });

  await test('D4 top-right Add button opens entry form on mobile', async () => {
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Budget' }).tap({ force: true });
    await page.waitForTimeout(400);
    await page.locator('.exportbar-add-btn').first().tap({ force: true });
    await page.getByPlaceholder('e.g. Mortgage payment').waitFor(V);
    await page.getByRole('button', { name: 'Cancel' }).first().tap({ force: true });
    await page.waitForTimeout(300);
    if (await page.locator('.modal-overlay').count() > 0) throw new Error('add-entry modal did not close');
  });

  await test('D5 mobile settings hides biometric on unsupported device', async () => {
    await page.locator('.cf-bottomnav').getByRole('button', { name: 'Settings' }).tap();
    await page.waitForTimeout(800);
    await page.getByText('Auto-lock when in background', { exact: false }).waitFor(V);
    // headless chromium: no platform authenticator → toggle must be absent
    if (await page.getByText('Unlock with fingerprint / face').count() > 0) throw new Error('biometric toggle shown without authenticator');
  });

  await ctx.close();
}

await test('D6 mobile dark: active nav item is highlighted, not dimmed', async () => {
  const { ctx, page } = await ctxPage({ touch: true, dark: true });
  await page.goto(BASE + '#/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const activeColor = await page.locator('.cf-bottomnav button[aria-current="page"]').evaluate((el) => getComputedStyle(el).color);
  const inactiveColor = await page.locator('.cf-bottomnav button:not([aria-current])').first().evaluate((el) => getComputedStyle(el).color);
  const lum = (c) => { const m = c.match(/\d+/g); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  if (lum(activeColor) <= lum(inactiveColor)) throw new Error(`active ${activeColor} darker than inactive ${inactiveColor}`);
  await ctx.close();
});

// ── E. Auth surfaces ────────────────────────────────────────────────────────
await test('E1 login screen renders when signed out', async () => {
  const { ctx, page } = await ctxPage({ loggedIn: false });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.getByText('Sign in to your account', V).waitFor(V);
  await page.getByPlaceholder('your@email.com').waitFor(V);
  await ctx.close();
});

await test('E2 create-account mode switches', async () => {
  const { ctx, page } = await ctxPage({ loggedIn: false });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.getByText('Create account', { exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Create account/ }).first().waitFor(V);
  await ctx.close();
});

// ── F. Money schema migration (schema v8: dollars -> cents) ────────────────
// Every other test's fixture payload declares schemaVersion: 999, so it's
// taken as already-cents and never exercises the upgrade path. This test
// simulates a real existing household's save from before this migration
// shipped — no schemaVersion field, amounts still dollar-scale — the exact
// shape applyPayload's centsifyHouseholdPayload (household-sync.js) must
// catch and convert on load.
await test('F1 loading a pre-v8 cloud payload (dollar-scale, no schemaVersion) upgrades to cents on display', async () => {
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

await browser.close();
server.close();

// ── Report ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
for (const r of results) {
  console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? '  → ' + r.detail : ''));
  r.ok ? pass++ : fail++;
}
console.log(`\n${pass}/${results.length} passed, ${fail} failed`);
if (pageErrors.length) console.log('total page errors seen: ' + pageErrors.length);
process.exit(fail ? 1 : 0);
