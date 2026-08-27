// Reloading a household from the cloud.
//
// Every one of these cases ends with somebody's data on the floor if it is
// wrong, and none of them are reachable by clicking around: they need a server
// that can be told to fail, to conflict, or to have moved on since this device
// last looked. So the Supabase client is replaced with a scriptable one and the
// rest — useHouseholdData, the payload migration, the markers, the divergence
// modal — is the shipped code path.
//
// The other half of this path is the SQL. supabase/schema-test.sql covers what
// load_household() actually returns; this file covers what the client does with
// it. The seam between them is where the worst bug lived: a household migrated
// from the legacy blob came back with no schemaVersion, and case 2 below is why
// that mattered — the client reads an absent stamp as pre-v8 dollars and
// multiplies every amount by 100.
//
//   node tests/cloud-sync.mjs
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_LIB, 'playwright'];
  try { candidates.push(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')); } catch {}
  for (const c of candidates.filter(Boolean)) {
    try { return await import(c); } catch {}
  }
  throw new Error('playwright not found — npm i -D playwright, or set PLAYWRIGHT_LIB');
}
const { chromium } = await loadPlaywright();
const PORT = 8772;
const server = createServer((req,res)=>{try{const p=req.url.split(/[#?]/)[0];const f=p==='/'?'index.html':p.slice(1);res.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'text/html'});res.end(readFileSync(join(ROOT,f)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const BASE = `http://127.0.0.1:${PORT}/index.html`;

const ENTRY = (id, desc, amount, startDate) => ({ id, desc, type:'expense', amount, category:'Housing',
  repeats:false, recurEvery:1, recurUnit:'month', recurDays:[], recurEnd:'', startDate, notes:'' });

const PAYLOAD = {
  schemaVersion: 9, savedAt: '2026-08-01T10:00:00Z',
  entries: [ENTRY('e1','Rent',165000,'2026-01-01')],
  overridesByYr: {}, yearConfigs: [{ year:2026, openingBalance:1250000 }],
  categories: ['Housing','Income'], categoryColors: { Housing:'#4A90D9' },
  activeYear: 2026, alertThreshold: 50000, darkMode: false, goals: [],
  budgetTargets: {}, templates: [], completed: {}, debtData: {}, deletedCopyIds: {}, holidays: {},
  dashHidden: {}, dashOrder: [], forecastHorizon: 90, colOrder: [],
  regFilter: 'all', regFilterCats: [], regFilterScheds: [], regFilterStatus: [],
};

// `script` is evaluated in the page; it may reassign window.__cf.* to change
// how the fake server behaves partway through a test.
const mkStub = (payload, opts = {}) => `
(() => {
  window.__cf = {
    payload: ${JSON.stringify(payload)},
    receipts: ${JSON.stringify(opts.receipts || [])},
    loadFails: ${!!opts.loadFails},
    saveError: ${JSON.stringify(opts.saveError || null)},
    loads: 0, saves: [],
  };
  const session = { user: { id:'u1', email:'demo@example.com' }, access_token:'t' };
  const members = [{ user_id:'u1', full_name:'Demo', disabled:false, role:'owner', joined_at:'2026-01-01T00:00:00Z' }];
  const resolved = (data, error) => Promise.resolve({ data, error: error || null });
  function chain(table){const c={};for(const m of ['select','eq','limit','order','update','insert','delete','neq','in']){c[m]=()=>{if(m==='order')return resolved(table==='household_members'?members:[]);return c;};}
    c.maybeSingle=()=>resolved(table==='household_members'?{household_id:'hh1'}:{id:'hh1',name:'Demo Household'});c.single=c.maybeSingle;c.then=(r,j)=>resolved(null).then(r,j);return c;}
  const client = {
    auth:{ getSession:()=>resolved({session}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}), signOut:()=>resolved(null) },
    from:(t)=>chain(t),
    rpc:(name, args) => {
      if (name === 'load_household') {
        window.__cf.loads++;
        if (window.__cf.loadFails) return resolved(null, { message: 'network down' });
        return resolved({ data: window.__cf.payload, receipts: window.__cf.receipts });
      }
      if (name === 'save_household') {
        window.__cf.saves.push(JSON.parse(JSON.stringify(args)));
        if (window.__cf.saveError) return resolved(null, { message: window.__cf.saveError });
        const at = new Date(Date.now() + window.__cf.saves.length * 1000).toISOString();
        window.__cf.payload = Object.assign({}, args.p_data, { savedAt: at });
        return resolved(at);
      }
      return resolved(null);
    },
    channel:()=>{const ch={on:()=>ch,subscribe:()=>({unsubscribe(){}})};return ch;}, removeChannel(){},
  };
  Object.defineProperty(window,'supabase',{get:()=>({createClient:()=>client}),set:()=>{}});
})();`;

let browser;
try { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' }); }
catch { browser = await chromium.launch(); }
const results = [];
const check = (n, ok, d = '') => { results.push({ n, ok }); console.log((ok ? '  PASS ' : '  FAIL ') + n + (ok ? '' : '\n         ↳ ' + d)); };

async function open({ payload = PAYLOAD, opts = {}, seed = null, hash = '#/settings' } = {}) {
  const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  await page.addInitScript(mkStub(payload, opts));
  if (seed) await page.addInitScript(`(() => { const s = ${JSON.stringify(seed)}; for (const k of Object.keys(s)) { try { localStorage.setItem(k, s[k]); } catch(e){} } })();`);
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,200)));
  await page.goto(BASE + hash, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  return { ctx, page, errs };
}
const ls = (page, k) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return localStorage.getItem(k); } }, k);

console.log('\n── 1. A normal load applies the cloud payload ──');
{
  const { ctx, page, errs } = await open({ seed: { cf_entries: JSON.stringify([ENTRY('local','Stale local',999,'2026-05-05')]) } });
  const e = await ls(page, 'cf_entries');
  check('the cloud copy replaces stale local entries', e.length === 1 && e[0].id === 'e1', JSON.stringify(e));
  check('amounts are applied at face value', e[0].amount === 165000, String(e[0].amount));
  check('opening balance applied', (await ls(page,'cf_years'))[0].openingBalance === 1250000, JSON.stringify(await ls(page,'cf_years')));
  check('the agreed savedAt is recorded', await page.evaluate(()=>localStorage.getItem('cf_last_synced_at')) === '2026-08-01T10:00:00Z', await page.evaluate(()=>localStorage.getItem('cf_last_synced_at')));
  check('no unsaved marker after a clean load', await page.evaluate(()=>localStorage.getItem('cf_unsaved_since')) === null, 'marker present');
  check('no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

console.log('\n── 2. A payload with no schemaVersion ──');
{
  const p = JSON.parse(JSON.stringify(PAYLOAD)); delete p.schemaVersion;
  const { ctx, page } = await open({ payload: p });
  const e = await ls(page, 'cf_entries');
  check('is treated as pre-v8 dollars and converted (×100)', e[0].amount === 16500000,
    `rent came back as ${e[0].amount}. This is correct ONLY if the payload really is pre-v8; the server must never omit the stamp for cents data.`);
  await ctx.close();
}

console.log('\n── 3. Unsaved local work, cloud unchanged ──');
{
  const { ctx, page } = await open({ seed: {
    cf_unsaved_since: '2026-08-02T09:00:00Z',
    cf_last_synced_at: '2026-08-01T10:00:00Z',
    cf_entries: JSON.stringify([ENTRY('mine','Offline edit',4200,'2026-06-06')]),
  }});
  const saves = await page.evaluate(()=>window.__cf.saves.length);
  check('the local copy is pushed, not overwritten', saves >= 1, `saves=${saves}`);
  const e = await ls(page,'cf_entries');
  check('the offline edit survives', e.some(x=>x.id==='mine'), JSON.stringify(e.map(x=>x.id)));
  check('the unsaved marker is cleared once it lands', await page.evaluate(()=>localStorage.getItem('cf_unsaved_since')) === null, 'still marked unsaved');
  await ctx.close();
}

console.log('\n── 4. Unsaved local work AND the cloud moved on ──');
{
  const { ctx, page } = await open({ seed: {
    cf_unsaved_since: '2026-08-02T09:00:00Z',
    cf_last_synced_at: '2026-07-01T00:00:00Z',
    cf_entries: JSON.stringify([ENTRY('mine','Offline edit',4200,'2026-06-06')]),
  }});
  const modal = await page.locator('[aria-labelledby="sync-divergence-title"]').count();
  check('the user is asked which version to keep', modal === 1, 'no divergence modal');
  const e = await ls(page,'cf_entries');
  check('local state is untouched while they decide', e.length === 1 && e[0].id === 'mine', JSON.stringify(e.map(x=>x.id)));
  check('nothing was pushed behind their back', await page.evaluate(()=>window.__cf.saves.length) === 0, 'a save went out');
  // Choose the cloud copy.
  await page.getByRole('button', { name: /cloud/i }).first().click();
  await page.waitForTimeout(900);
  const after = await ls(page,'cf_entries');
  check('choosing the cloud copy applies it', after.length === 1 && after[0].id === 'e1', JSON.stringify(after.map(x=>x.id)));
  check('and clears the unsaved marker', await page.evaluate(()=>localStorage.getItem('cf_unsaved_since')) === null, 'still marked');
  await ctx.close();
}

console.log('\n── 5. The load fails ──');
{
  const { ctx, page } = await open({ opts: { loadFails: true }, seed: {
    cf_entries: JSON.stringify([ENTRY('local','Local only',1000,'2026-03-03')]),
  }});
  const e = await ls(page,'cf_entries');
  check('local data is kept, not blanked', e.length === 1 && e[0].id === 'local', JSON.stringify(e));
  check('nothing is pushed over the household', await page.evaluate(()=>window.__cf.saves.length) === 0, 'saved after a failed load');
  // An edit made while autosave is disabled must be remembered.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('cf:quickadd')));
  await page.waitForTimeout(500);
  await page.getByPlaceholder('e.g. Mortgage payment').fill('Made while offline');
  await page.locator('input[inputmode="decimal"]').first().fill('12.34');
  await page.getByRole('combobox').nth(1).selectOption({ index: 1 }).catch(()=>{});
  await page.getByRole('button', { name: /Save Entry/i }).click().catch(()=>{});
  await page.waitForTimeout(800);
  check('an edit made while autosave is off is marked unsaved',
    await page.evaluate(()=>!!localStorage.getItem('cf_unsaved_since')), 'the edit would vanish on the next load');
  await ctx.close();
}

console.log('\n── 6. Another device saved first (CONFLICT) ──');
{
  const { ctx, page } = await open();
  await page.evaluate(() => { window.__cf.saveError = 'CONFLICT: household data changed since you last loaded it.'; });
  await page.evaluate(() => { window.__cf.payload = Object.assign({}, window.__cf.payload, { savedAt: '2026-08-05T12:00:00Z', alertThreshold: 77700 }); });
  const before = await page.evaluate(()=>window.__cf.loads);
  // Make an edit to trigger the debounced autosave.
  await page.locator('#sec-alerts input[type=number], input[type=number]').first().fill('900');
  await page.waitForTimeout(4000);
  check('a conflicting save triggers a reload instead of clobbering', await page.evaluate(()=>window.__cf.loads) > before,
    `loads before=${before} after=${await page.evaluate(()=>window.__cf.loads)}`);
  check("the other device's value is what remains", (await ls(page,'cf_alertThresh')) === 77700, String(await ls(page,'cf_alertThresh')));
  await ctx.close();
}

console.log('\n── 7. Receipts ──');
{
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const p = JSON.parse(JSON.stringify(PAYLOAD));
  p.overridesByYr = { 2026: { 'e1-2026-0-1': { amount: 170000 } } };
  const { ctx, page } = await open({ payload: p, opts: { receipts: [{ ownerKey:'override:2026:e1-2026-0-1', b64: PNG, mime:'image/png' }] } });
  const ovs = await ls(page, 'cf_overrides');
  const att = ((ovs['2026']||{})['e1-2026-0-1']||{}).attachment;
  check('a receipt is re-attached to its occurrence on load', typeof att === 'string' && att.startsWith('data:image/png;base64,'), String(att).slice(0,40));
  check('the override itself survives', ((ovs['2026']||{})['e1-2026-0-1']||{}).amount === 170000, JSON.stringify(ovs));
  await ctx.close();
}

// Loading is not editing. cf_apply_household_payload aside, the client used to
// push the cloud's own copy straight back at it on every launch: loadData sets
// `initialized` synchronously while the setters it just called land a render
// later, so the render carrying the loaded values looked exactly like a local
// edit and scheduled a save. That advanced savedAt for every other device, and
// made "the save quotes the savedAt it loaded with" below a race — the
// spurious save landed first whenever the machine was slow enough.
console.log('\n── 9. A load on its own never saves ──');
{
  const { ctx, page } = await open({});
  // Well past the 2s autosave debounce.
  await page.waitForTimeout(5000);
  const saves = await page.evaluate(() => window.__cf.saves);
  check('an untouched household is not written back', saves.length === 0, `${saves.length} save(s): ` + saves.map((s) => s.p_expected_saved_at).join(', '));
  check('the agreed savedAt is still the one loaded', await page.evaluate(() => localStorage.getItem('cf_last_synced_at')) === '2026-08-01T10:00:00Z', await page.evaluate(() => localStorage.getItem('cf_last_synced_at')));
  // ...and a real edit still saves, quoting that same savedAt.
  await page.locator('input[type=number]').first().fill('850');
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => window.__cf.saves);
  check('a real edit still saves', after.length === 1, `${after.length} save(s)`);
  check('and quotes the savedAt it loaded with', after.length === 1 && after[0].p_expected_saved_at === '2026-08-01T10:00:00Z', after.length ? String(after[0].p_expected_saved_at) : 'no save');
  await ctx.close();
}

console.log('\n── 8. The saved payload never carries receipt images ──');
{
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const p = JSON.parse(JSON.stringify(PAYLOAD));
  p.overridesByYr = { 2026: { 'e1-2026-0-1': { amount: 170000 } } };
  const { ctx, page } = await open({ payload: p, opts: { receipts: [{ ownerKey:'override:2026:e1-2026-0-1', b64: PNG, mime:'image/png' }] } });
  await page.locator('input[type=number]').first().fill('850');
  await page.waitForTimeout(4000);
  const saves = await page.evaluate(()=>window.__cf.saves);
  const last = saves[saves.length-1];
  check('a save happened', !!last, 'no save captured');
  if (last) {
    const raw = JSON.stringify(last.p_data);
    check('no base64 image is in the save payload', !raw.includes('data:image/'), 'the payload carries an inline image');
    check('the save quotes the savedAt it loaded with', last.p_expected_saved_at === '2026-08-01T10:00:00Z', String(last.p_expected_saved_at));
    check('and stamps the current schema version', last.p_data.schemaVersion === 9, String(last.p_data.schemaVersion));
  }
  await ctx.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
if (failed) {
  console.log('\nFailed:');
  for (const r of results.filter((x) => !x.ok)) console.log('  • ' + r.n);
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
