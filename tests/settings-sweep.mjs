// Every settings page, and every control on it, actually operated.
//
// Usage:  node tests/settings-sweep.mjs            (needs a built index.html)
//         node tests/settings-sweep.mjs --only ai,sync
//         node tests/settings-sweep.mjs --list     (print what it found)
//
// The seventeen settings pages are the least-visited screens in the app and
// the least covered: the layout sweep goes to all of them but only measures
// whether anything overflows, and the named suite visits a handful. Neither
// presses anything. A settings toggle that flips on screen and forgets by the
// next visit looks completely correct in a screenshot.
//
// So this goes to each page in a context of its own — a mutation on one page
// must not decide what the next page sees — and for every control it finds:
//
//   switches   flipped, checked, flipped back, and checked again
//   selects    moved to another option and checked
//   inputs     typed into and checked, then put back
//   "+ Add…"   pressed, and something has to open
//
// and for switches and selects it then reloads the page and asserts the new
// value survived, because "it changed on screen" and "it was saved" are
// different claims and only the second one matters here.
//
// Buttons are not pressed at random. Settings is where Delete, Reset, Sign
// out and Revoke live, and a sweep that presses everything would be a sweep
// that empties the household. Only names on the allowlist below are pressed;
// everything else is reported as present and enabled, which is the part a
// sweep can honestly check.
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
const PORT = 8753;
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

const PAGES = ['years', 'accounts', 'categories', 'money', 'holidays', 'appearance',
  'threshold', 'notifications', 'household', 'backup', 'sync', 'templates',
  'activity', 'ai', 'security', 'danger', 'reset'];

// The add forms are not all in Settings. These are the other screens that
// offer one — a ledger entry, a goal, a debt, an envelope target — and they
// get the same treatment: press it, fill what it opens, and a row has to
// appear. Listed by route, because the route is how a reader reaches the form
// and which form is on screen.
const OTHER = ['flow/list', 'flow/entries', 'envelopes', 'plan/goals', 'plan/debt', 'today'];
const isSetting = (r) => PAGES.includes(r);
const hrefFor = (r) => (isSetting(r) ? '#/you/' + r : '#/' + r);
// A settings page renders inside .set-detail; on the other screens the page
// is the whole of main.
const scopeFor = (r) => (isSetting(r) ? '.set-detail' : 'main');

// Pressing these is safe and is the point: each should open a form, a sheet
// or a picker. Anything not matched here is checked for presence only.
// The name has to be short as well as matching: Today's disabled AI panel
// carries a whole sentence beginning "Add an Anthropic API key in Settings →
// General…", which is a message explaining why the button is off, not a
// button called Add.
const PRESSABLE = /^(\+ ?add\b|add (a|an|another)\b|import|customi[sz]e|manage|edit\b|show|view|choose|pick|set up|create)/i;
const isPressable = (name) => name.length <= 30 && PRESSABLE.test(name);
// …except these, which are pressable by name but destructive or leave the app.
const NEVER = /(delete|remove|reset|revoke|sign out|log out|disconnect|wipe|erase|clear all|export|download|leave household|unlink)/i;
// Buttons whose whole job shows in their own label — press, and the label has
// to change.
const SELF_LABEL = /^(show|hide)$/i;

// Everything the sweep looks at and operates lives inside the open page.
let CURRENT = PAGES[0];
const SCOPE = () => scopeFor(CURRENT);

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only')) || '').split('=')[1]
  || (args.includes('--only') ? args[args.indexOf('--only') + 1] : '');
const LIST = args.includes('--list');
const ALL = [...PAGES, ...OTHER];
const routes = only ? ALL.filter((p) => only.split(',').includes(p)) : ALL;

// What is on the page, and what each control is called. Runs in the page.
const SURVEY = (SEL) => {
  // The page's own container, not all of <main>. Scoped to main, a page that
  // rendered nothing at all still read as full of text and controls, because
  // the settings index and the page heading live out there too — a mutation
  // that blanked the Appearance page went unnoticed until this line changed.
  const root = document.querySelector(SEL) || document.querySelector('main') || document.body;
  const name = (el) => (el.getAttribute('aria-label')
    || (el.labels && el.labels[0] && el.labels[0].textContent)
    || el.getAttribute('placeholder') || el.getAttribute('title')
    || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const out = { switches: [], selects: [], inputs: [], buttons: [], text: '' };
  out.text = (root.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  [...root.querySelectorAll('[role="switch"]')].filter(visible).forEach((el, i) => {
    out.switches.push({ i, name: name(el), checked: el.getAttribute('aria-checked') });
  });
  [...root.querySelectorAll('select')].filter(visible).forEach((el, i) => {
    out.selects.push({ i, name: name(el), value: el.value,
      options: [...el.options].map((o) => o.value).slice(0, 12), disabled: el.disabled });
  });
  [...root.querySelectorAll('input')].filter(visible).forEach((el, i) => {
    out.inputs.push({ i, name: name(el), type: el.type, value: el.value, disabled: el.disabled });
  });
  [...root.querySelectorAll('button')].filter(visible).forEach((el, i) => {
    out.buttons.push({ i, name: name(el), disabled: el.disabled });
  });
  return out;
};

// Controls are surveyed once and operated one at a time, and every operation
// can change the page under the ones that follow — an inline form replaces
// the button that opened it, a saved row shifts everything below it. Pressing
// an nth() captured before all that presses whatever now happens to sit
// there. So a button is found again by the name it had when it was surveyed,
// and the index is only the fallback.
async function pressByName(page, name, i) {
  const text = name.slice(0, 40);
  // :visible matters. Plan renders its other sub-tabs' markup while hiding
  // it, so "+ Add" matched three buttons, first() picked a hidden one, and
  // the click sat waiting thirty seconds for it to appear — reported as a
  // button that does nothing. The survey only ever lists visible controls;
  // this has to agree with it.
  const byText = page.locator(SCOPE() + ' button:visible').filter({ hasText: text });
  if (await byText.count() > 0) { await byText.first().click({ timeout: 4000 }).catch(() => {}); return true; }
  const byAria = page.getByRole('button', { name, exact: true }).locator('visible=true');
  if (await byAria.count() > 0) { await byAria.first().click({ timeout: 4000 }).catch(() => {}); return true; }
  await page.locator(SCOPE() + ' button:visible').nth(i).click({ timeout: 4000 }).catch(() => {});
  return false;
}

let exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
let browser;
try { browser = await chromium.launch({ executablePath: exe }); } catch { browser = await chromium.launch(); }

const findings = [];
const note = (page, kind, detail) => findings.push({ page, kind, detail });
let pressed = 0, flipped = 0, moved = 0, typed = 0, seen = 0;

for (const route of routes) {
  CURRENT = route;
  // Notifications are permission-gated: without this the toggle refuses to
  // turn on, correctly, and the sweep learns nothing about what happens when
  // it can. Granted here so the on-path is the one being tested.
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['notifications'],
    origin: BASE,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  await page.clock.setFixedTime(FAKE_TODAY);
  // The shared stub answers load_household from a frozen payload, so a
  // setting the app saves is gone again on the next load and every synced
  // toggle reads as "forgets". That is the stub, not the app. This records
  // what was saved and hands it back — persistence becomes a real question
  // rather than one the fixture has already answered no to.
  // The backup nudge appears five seconds after load, on top of the page, and
  // swallows whatever click comes next — Plan → Debt's "+ Add" timed out
  // waiting for it to go away and was reported as a dead button. Dating the
  // last backup to now means it is not due and never appears.
  await page.addInitScript(`try{localStorage.setItem('cf_last_backup', String(Date.now()))}catch(e){}`);
  await page.addInitScript(mkStub(false, true).replace(
    "rpc: (name) => name === 'load_household' ? resolved({ data: payload, receipts: [] }) : resolved(null),",
    `rpc: (name, args) => {
      window.__cfSaves = window.__cfSaves || [];
      if (name === 'load_household') {
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('__cfSaved') || 'null'); } catch (e) {}
        return resolved({ data: Object.assign({}, payload, saved || {}), receipts: [] });
      }
      window.__cfSaves.push(name);
      const body = args && (args.p_payload || args.payload || args.p_data);
      if (body && typeof body === 'object') {
        try {
          const prev = JSON.parse(sessionStorage.getItem('__cfSaved') || '{}');
          sessionStorage.setItem('__cfSaved', JSON.stringify(Object.assign(prev, body)));
        } catch (e) {}
      }
      return resolved(null);
    },`));
  // Chromium says this whenever a page asks about push, because a Playwright
  // context is incognito and the Push API is not available there. It is the
  // browser describing itself, not the app failing — and the notifications
  // toggle flips either way, which is the part this sweep is about.
  const NOT_OURS = /does not support the Push API in incognito/i;
  const errs = [];
  page.on('pageerror', (e) => { const t = String(e).slice(0, 140); if (!NOT_OURS.test(t)) errs.push(t); });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text().slice(0, 140);
    if (!NOT_OURS.test(t)) errs.push('console: ' + t);
  });

  try {
    await page.goto(BASE + hrefFor(route), { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const nudge = page.getByRole('button', { name: 'Remind me later' });
    if (await nudge.count() > 0) await nudge.first().click().catch(() => {});
    await page.waitForTimeout(250);

    const found = await page.evaluate(SURVEY, SCOPE());
    if (LIST) {
      console.log(`\n${hrefFor(route)}`);
      for (const k of ['switches', 'selects', 'inputs', 'buttons']) {
        for (const c of found[k]) console.log(`   ${k.slice(0, -1).padEnd(7)} ${c.name}${c.disabled ? '  [disabled]' : ''}`);
      }
    }
    const controls = found.switches.length + found.selects.length + found.inputs.length + found.buttons.length;
    seen += controls;

    // A settings page with nothing on it and nothing to say is the failure
    // this whole file is looking for.
    if (found.text.length < 12 && controls === 0) {
      note(route, 'renders nothing', `the page is empty: "${found.text}"`);
    }
    if (errs.length) note(route, 'errors on load', errs.slice(0, 2).join(' | '));

    // ── Switches: flip, check, flip back, check ─────────────────────────────
    for (const sw of found.switches) {
      const el = page.locator(SCOPE() + ' [role="switch"]').nth(sw.i);
      const before = await el.getAttribute('aria-checked');
      await el.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(250);
      const after = await el.getAttribute('aria-checked');
      if (before === after) {
        // A control that refuses *and explains why* is working — a browser
        // permission the reader has denied is not the app's failure. Anything
        // else is a dead switch, and it has to be reported as one: the first
        // version of this accepted any nearby text as an explanation, so a
        // toggle wired to nothing was excused by the status line beside it
        // that still read "Light theme active".
        const REFUSAL = /blocked|denied|not supported|unavailable|unsupported|permission|turn(ed)? off in your browser/i;
        const said = await page.evaluate(() => {
          const els = [...document.querySelectorAll(
            '.set-detail [role="alert"], .set-detail [class*="notice"], .set-detail [class*="txl"]')];
          return els.map((e) => (e.textContent || '').trim()).join(' | ').slice(0, 120);
        });
        const explained = REFUSAL.test(said);
        note(route, explained ? 'switch refuses, and says why' : 'switch does not flip',
          `"${sw.name}" stayed ${before}${said ? ' — page says: ' + said : ' — and the page says nothing'}`);
        continue;
      }
      flipped++;
      // Saved, not merely rendered.
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(900);
      const kept = await page.locator(SCOPE() + ' [role="switch"]').nth(sw.i).getAttribute('aria-checked').catch(() => null);
      if (kept !== after) {
        note(route, 'switch forgets', `"${sw.name}" was set to ${after} and came back ${kept}`);
      }
      await page.locator(SCOPE() + ' [role="switch"]').nth(sw.i).click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(200);
    }

    // ── Selects: move to another option, check, reload, check ───────────────
    for (const sel of found.selects) {
      if (sel.disabled || sel.options.length < 2) continue;
      const other = sel.options.find((o) => o !== sel.value);
      if (other === undefined) continue;
      const el = page.locator(SCOPE() + ' select').nth(sel.i);
      await el.selectOption(other).catch(() => {});
      await page.waitForTimeout(250);
      const now = await el.inputValue().catch(() => null);
      if (now !== other) { note(route, 'select does not move', `"${sel.name}" would not take ${other} (stayed ${now})`); continue; }
      moved++;
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(900);
      const kept = await page.locator(SCOPE() + ' select').nth(sel.i).inputValue().catch(() => null);
      if (kept !== other) note(route, 'select forgets', `"${sel.name}" was set to ${other} and came back ${kept}`);
      await page.locator(SCOPE() + ' select').nth(sel.i).selectOption(sel.value).catch(() => {});
      await page.waitForTimeout(200);
    }

    // ── Inputs: type, check it took, put it back ────────────────────────────
    for (const inp of found.inputs) {
      if (inp.disabled || ['checkbox', 'radio', 'file', 'color', 'range'].includes(inp.type)) continue;
      const el = page.locator(SCOPE() + ' input').nth(inp.i);
      const probe = inp.type === 'number' ? '123' : inp.type === 'date' ? `${FIXTURE_YEAR}-06-15` : 'QA probe';
      await el.fill(probe).catch(() => {});
      await page.waitForTimeout(200);
      const now = await el.inputValue().catch(() => null);
      if (now !== probe && now !== String(Number(probe))) {
        note(route, 'input rejects typing', `"${inp.name}" (${inp.type}) took "${now}" for "${probe}"`);
      } else typed++;
      await el.fill(inp.value).catch(() => {});
      await page.waitForTimeout(150);
    }

    // ── "+ Add…": press it, fill what it opens, and a row has to appear ────
    //
    // Pressing and checking that "something opened" is not enough, and the
    // first version of this proved it: it pressed Categories' "+ Add" with an
    // empty name field, got the validation message the field is supposed to
    // give, and reported the button as doing nothing. What a reader wants to
    // know is whether they can add a category — so fill it in and look for
    // the row.
    for (const btn of found.buttons) {
      if (SELF_LABEL.test(btn.name)) {
        // Show/Hide reveals a field rather than opening a form. It has one
        // job and it is visible in the button's own label.
        const el = page.locator(SCOPE() + ' button').nth(btn.i);
        const before = (await el.innerText().catch(() => '')).trim();
        await el.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(300);
        const after = (await el.innerText().catch(() => '')).trim();
        if (before === after) note(route, 'reveal button does nothing', `"${btn.name}" still says "${after}"`);
        else { pressed++; await el.click().catch(() => {}); }
        continue;
      }
      if (!isPressable(btn.name) || NEVER.test(btn.name)) continue;
      if (btn.disabled) { note(route, 'add button disabled', `"${btn.name}"`); continue; }

      // Not every add form is a modal. Several open in place — the button
      // disappears and a set of fields takes its spot — so a form that opened
      // shows up as more inputs on the page, not as an overlay. Counting only
      // modals and rows reported three working forms as dead buttons.
      const shape = () => page.evaluate(() => ({
        modals: document.querySelectorAll('.modal-overlay').length,
        inputs: [...document.querySelectorAll('main input, main textarea, main select, .modal-overlay input, .modal-overlay textarea, .modal-overlay select')]
          .filter((e) => e.offsetParent !== null).length,
        rows: document.querySelectorAll('main [class*="-row"], main li, main tr, main [class*="-item"]').length,
        alert: (document.querySelector('main [role="alert"], .modal-overlay [role="alert"]') || {}).textContent || '',
        // A new row is not the only evidence a form saved. Adding a holiday
        // on a date the household already has replaces that day rather than
        // adding a line — the form worked perfectly and the row count did not
        // move. The app says "Holiday added"; that is the evidence.
        toast: (document.querySelector('.feedback-toast, .undo-toast') || {}).textContent || '',
      }));
      const before = await shape();
      await pressByName(page, btn.name, btn.i);
      await page.waitForTimeout(500);
      let mid = await shape();

      // An empty submit that explains itself is a working form, not a dead
      // button — but it still has to work once it is filled in.
      const validated = mid.alert && mid.alert !== before.alert;

      // Fill whatever it opened: the modal if there is one, otherwise the
      // empty field sitting beside the button.
      const scope = mid.modals > before.modals ? '.modal-overlay' : 'main';
      const openedInline = mid.inputs > before.inputs;
      const filled = await page.evaluate(({ scope, year }) => {
        const els = [...document.querySelectorAll(scope + ' input, ' + scope + ' textarea')]
          .filter((e) => !e.disabled && !['checkbox', 'radio', 'file', 'color', 'range', 'hidden'].includes(e.type));
        let n = 0;
        for (const e of els) {
          if (e.value) continue;                       // leave what is already set
          const v = e.type === 'number' ? '12'
            : e.type === 'date' ? year + '-06-15'
            : 'QA sweep ' + Math.random().toString(36).slice(2, 7);
          const setter = Object.getOwnPropertyDescriptor(
            e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
          setter.call(e, v);
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          n++;
        }
        return n;
      }, { scope, year: FIXTURE_YEAR });
      await page.waitForTimeout(300);

      if (filled > 0) {
        // Submit: the modal's primary action, or the same button again for an
        // inline field.
        const save = page.locator(scope + ' button:visible').filter({ hasText: /^(save|add|create|\+ ?add)\b/i });
        if (await save.count() > 0) await save.last().click({ timeout: 4000 }).catch(() => {});
        else await pressByName(page, btn.name, btn.i);
        await page.waitForTimeout(600);
      }
      const after = await shape();

      const opened = mid.modals > before.modals || openedInline;
      const added = after.rows > before.rows || (after.toast && after.toast !== before.toast);
      if (!opened && !added && !validated) {
        note(route, 'add button does nothing', `"${btn.name}" opened no form, added no row and said nothing`);
      } else if (opened && !added && !after.alert) {
        note(route, 'add form saves nothing', `"${btn.name}" opened a form; filling it in added no row`);
      } else if (filled > 0 && !added && after.alert) {
        note(route, 'add form rejects a filled-in form', `"${btn.name}": ${after.alert.trim().slice(0, 90)}`);
      } else pressed++;

      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
      const cancel = page.getByRole('button', { name: /^(cancel|close|done)$/i });
      if (await cancel.count() > 0) await cancel.first().click().catch(() => {});
      await page.waitForTimeout(200);
    }
    if (errs.length) note(route, 'errors while operating', errs.slice(0, 3).join(' | '));
  } catch (e) {
    note(route, 'did not survive the sweep', String(e.message || e).split('\n')[0].slice(0, 160));
  }
  await ctx.close();
}
await browser.close();
server.close();

console.log(`\nsettings-sweep: ${routes.length} pages, ${seen} controls — `
  + `${flipped} switches flipped, ${moved} selects moved, ${typed} inputs typed, ${pressed} forms opened`);
if (!findings.length) {
  console.log('nothing to report');
  process.exit(0);
}
const byPage = new Map();
for (const f of findings) {
  if (!byPage.has(f.page)) byPage.set(f.page, []);
  byPage.get(f.page).push(f);
}
console.log(`\n${findings.length} findings:`);
for (const [p, list] of byPage) {
  console.log(`\n  ${hrefFor(p)}`);
  for (const f of list) console.log(`    • ${f.kind}: ${f.detail}`);
}
process.exit(1);
