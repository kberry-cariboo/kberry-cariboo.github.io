// End-to-end sync check: the real app, in a real browser, talking to the real
// save_household / load_household functions in a real Postgres. The only
// stand-in is Supabase auth (there is no auth server here, so the session and
// the household lookup are faked); everything below that is the shipped code
// path — the client builds its payload, the SQL in supabase/schema.sql takes it
// apart into rows, and the app reads it back.
//
// Why this exists: a payload field with no table behind it fails *silently*.
// cf_apply_household_payload ignores keys it has no column for, so a field can
// look completely wired on the client — in the payload, in the synced-field
// list, visible in the UI — and reach the database as nothing at all. That is
// exactly what happened to holidays. tests/regression.mjs can't catch it: its
// Supabase stub accepts any payload it is handed.
//
// Opt-in, because it needs a throwaway Postgres. It skips (exit 0) when one
// isn't configured, so it's safe to run anywhere:
//
//   createdb cf_scratch
//   psql -d cf_scratch -f supabase/schema.sql       # plus the auth shim, see
//                                                   # supabase/schema-test.sql
//   CF_TEST_PG=1 PGDATABASE=cf_scratch node tests/sync-sql.mjs
//
// PGHOST/PGPORT/PGUSER/PGDATABASE are read from the environment as usual.
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFileSync, execSync } from 'child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8765;
const UID = '11111111-1111-1111-1111-111111111111';
const HID = '22222222-2222-2222-2222-222222222222';

if (!process.env.CF_TEST_PG) {
  console.log('sync-sql: skipped (set CF_TEST_PG=1 and point PG* at a scratch database to run it)');
  process.exit(0);
}

// The JWT claim goes through PGOPTIONS so each statement is a lone SELECT — a
// leading `set` makes psql print "SET" ahead of the JSON.
const psql = (sql, asUser) => execFileSync('psql', ['-t', '-A', '-c', sql], {
  encoding: 'utf8',
  env: Object.assign({}, process.env, asUser ? { PGOPTIONS: `-c request.jwt.claim.sub=${asUser}` } : {}),
}).trim();

try {
  psql('select 1;');
} catch (e) {
  console.log('sync-sql: skipped (no reachable database: ' + String(e.message || e).split('\n')[0] + ')');
  process.exit(0);
}

const fail = (msg) => { console.error('FAIL ' + msg); process.exitCode = 1; };
const pass = (msg) => console.log('PASS ' + msg);

// A household to write into, cleaned up at the end.
psql(`insert into auth.users (id, email) values ('${UID}','sync-sql@example.invalid') on conflict (id) do nothing;`);
psql(`insert into households (id, name) values ('${HID}','sync-sql') on conflict (id) do nothing;`);
psql(`insert into household_members (household_id, user_id, full_name, role) values ('${HID}','${UID}','Sync Test','owner') on conflict (household_id, user_id) do nothing;`);
psql(`delete from holidays where household_id = '${HID}'; delete from holiday_years where household_id = '${HID}'; delete from household_settings where household_id = '${HID}';`);

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/rpc/')) {
    const name = req.url.slice(5);
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const reply = (payload) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      try {
        const args = JSON.parse(body || '{}');
        if (name === 'load_household') return reply({ data: JSON.parse(psql('select load_household()::text;', UID)), error: null });
        if (name === 'save_household') {
          const expected = args.p_expected_saved_at ? `'${args.p_expected_saved_at}'::timestamptz` : 'null';
          const data = psql(`select save_household($cfp$${JSON.stringify(args.p_data || {})}$cfp$::jsonb, ${expected})::text;`, UID);
          return reply({ data, error: null });
        }
        return reply({ data: null, error: null });
      } catch (e) {
        const msg = String(e.stderr || e.message || e);
        return reply({ data: null, error: { message: /CONFLICT/.test(msg) ? 'CONFLICT: household data changed since you last loaded it.' : msg.slice(0, 200) } });
      }
    });
    return;
  }
  try {
    const p = req.url.split('?')[0].split('#')[0];
    const f = p === '/' || p === '/index.html' ? 'index.html' : p.slice(1);
    res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
    res.end(readFileSync(join(ROOT, f)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + PORT + '/index.html';

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_LIB, 'playwright'];
  try { candidates.push(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')); } catch {}
  for (const c of candidates.filter(Boolean)) {
    try { return await import(c); } catch {}
  }
  throw new Error('playwright not found — npm i -D playwright, or set PLAYWRIGHT_LIB');
}
const { chromium } = await loadPlaywright();

const stub = `
(() => {
  const session = { user: { id: '${UID}', email: 'sync-sql@example.invalid' }, access_token: 'demo' };
  const members = [{ user_id: '${UID}', full_name: 'Sync Test', disabled: false, role: 'owner', joined_at: '2026-01-01T00:00:00Z' }];
  const resolved = (d) => Promise.resolve({ data: d, error: null });
  function chain(t) {
    const c = {};
    for (const m of ['select','eq','limit','order','update','insert','delete','neq','in']) {
      c[m] = () => { if (m === 'order') return resolved(t === 'household_members' ? members : []); return c; };
    }
    c.maybeSingle = () => resolved(t === 'household_members' ? { household_id: '${HID}' } : { id: '${HID}', name: 'sync-sql' });
    c.single = c.maybeSingle;
    c.then = (r, j) => resolved(null).then(r, j);
    return c;
  }
  const fc = {
    auth: { getSession: () => resolved({ session }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: () => resolved(null) },
    from: (t) => chain(t),
    // The only interesting line: RPCs go over the wire to the real functions.
    rpc: (name, args) => fetch('/rpc/' + name, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(args || {}) }).then((r) => r.json()),
    channel: () => { const ch = { on: () => ch, subscribe: () => ({ unsubscribe(){} }) }; return ch; },
    removeChannel(){},
  };
  Object.defineProperty(window, 'supabase', { get: () => ({ createClient: () => fc }), set: () => {} });
})();`;

const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
let browser;
try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
await page.addInitScript(stub);

const year = new Date().getFullYear();
await page.goto(BASE + '#/settings', { waitUntil: 'load' });
await page.waitForTimeout(2500);

const section = page.locator('#sec-holidays');
await section.scrollIntoViewIfNeeded();
await section.getByRole('button', { name: '+ Add holiday' }).click();
await page.locator('#holiday-date').fill(`${year}-08-17`);
await page.locator('#holiday-name').fill('Sync SQL Shutdown');
await section.getByRole('button', { name: 'Add holiday' }).click();
await page.waitForTimeout(6000); // 2s debounce plus the round trip

// 1. The edit is rows in Postgres, not a blob and not just localStorage.
const rows = Number(psql(`select count(*) from holidays where household_id = '${HID}';`));
if (rows < 10) fail(`expected the year's holidays as rows, found ${rows}`);
else pass(`${rows} rows in the holidays table`);

const manual = psql(`select name || '|' || source from holidays where household_id = '${HID}' and holiday_date = date '${year}-08-17';`);
if (manual !== 'Sync SQL Shutdown|manual') fail('the hand-added holiday did not land as a manual row: ' + JSON.stringify(manual));
else pass('the hand-added holiday is a row, marked manual');

const years = psql(`select string_agg(year::text, ',' order by year) from holiday_years where household_id = '${HID}';`);
if (years !== String(year)) fail(`holiday_years should hold ${year}, holds ${JSON.stringify(years)}`);
else pass('the year is marked as the household\'s');

// 2. One row per holiday. A holiday that slid off a weekend is listed on the
//    day it is observed and nowhere else.
const dupes = psql(`select coalesce(string_agg(base, ', '), '') from (
  select regexp_replace(name, ' \\(observed\\)$', '') as base
  from holidays where household_id = '${HID}'
  group by 1 having count(*) > 1) d;`);
if (dupes) fail('a holiday is listed on more than one date: ' + dupes);
else pass('no holiday appears twice');

// 3. It comes back from the database, not from this device.
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.goto(BASE + '#/settings', { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.locator('#sec-holidays').scrollIntoViewIfNeeded();
const shown = await page.locator('#sec-holidays').innerText();
if (!/Sync SQL Shutdown/.test(shown)) fail('the holiday did not come back from the database after local storage was cleared');
else pass('reloaded from the database with local storage cleared');
if ((shown.match(/Boxing Day/g) || []).length > 1) fail('Boxing Day is listed more than once in the UI');

if (pageErrors.length) fail('page errors: ' + pageErrors[0]);

// Clean up after ourselves — the household cascade takes the rows with it.
psql(`delete from households where id = '${HID}'; delete from auth.users where id = '${UID}';`);
await browser.close();
server.close();
console.log(process.exitCode ? '\nsync-sql: FAILED' : '\nsync-sql: all checks passed');
