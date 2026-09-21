// The Help page against the information architecture it describes.
//
// Help copy is data in src/components/help.js — English in one place rather
// than threaded through createElement calls — which is what makes it easy to
// edit and easy to forget. The IA underneath it moves: Budget became Flow,
// Budget vs Actual became Envelopes and was promoted out of the Flow lenses,
// Monthly became List, Forecast became Curve. Each of those left the page
// describing an app that no longer existed, and nothing failed.
//
// So this is the binding. It reads the route tables in src/lib/app-data.js
// and the shortcut handler in src/App.js as the source of truth, and asserts
// the prose agrees with them. It is deliberately cheap — no browser, no
// build — so it can run on every change rather than only in CI.
//
//   node tests/help-ia.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const helpSrc = read('src/components/help.js');
const appData = read('src/lib/app-data.js');
const appSrc = read('src/App.js');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};
const J = (v) => JSON.stringify(v);

// ── What the app says its destinations are ───────────────────────────────────
const arr = (name, src) => {
  const m = src.match(new RegExp(name + '\\s*=\\s*\\[([^\\]]*)\\]'));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null;
};
const routeTabs = arr('ROUTE_TABS', appData);
const flowSubs = arr('ROUTE_FLOW_SUBS', appData);
const planSubs = arr('ROUTE_PLAN_SUBS', appData);

// The Help sections, in the order the page renders them.
const sectionTitles = [...helpSrc.matchAll(/^\s{6}title: "([^"]+)"/gm)].map((m) => m[1]);
// Everything the prose says, with the JS scaffolding stripped out.
const prose = [...helpSrc.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join(' ');

check('the route tables are still readable from app-data.js',
  !!(routeTabs && flowSubs && planSubs), J({ routeTabs, flowSubs, planSubs }));

// ── Every destination is documented ──────────────────────────────────────────
{
  // "alerts" is a panel reached from a banner, not a place you navigate to,
  // and "help" is this page itself — neither needs a section of its own.
  const needSection = { today: 'Today', flow: 'Flow', envelopes: 'Envelopes', plan: 'Plan', you: 'You' };
  const missing = Object.entries(needSection)
    .filter(([tab]) => routeTabs.includes(tab))
    .filter(([, word]) => !sectionTitles.some((t) => t.includes(word)))
    .map(([tab]) => tab);
  check('every navigable destination has a Help section naming it',
    missing.length === 0, 'undocumented: ' + J(missing) + ' — sections are ' + J(sectionTitles));
}

// ── The Flow lens list matches ROUTE_FLOW_SUBS ───────────────────────────────
{
  // The Flow section promises a number of lenses in words and then lists them.
  // Both have to agree with the route table — the "four lenses / five listed"
  // bug was exactly this going unchecked.
  const words = { 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' };
  const expected = words[flowSubs.length];
  check('the Flow section counts its lenses the way ROUTE_FLOW_SUBS does',
    new RegExp(expected + ' lenses', 'i').test(prose),
    'ROUTE_FLOW_SUBS has ' + flowSubs.length + ' (' + J(flowSubs) + '), so the prose should say "' + expected + ' lenses"');

  // Each lens is named in the prose, by the label the pill carries.
  const label = { list: 'List', calendar: 'Calendar', curve: 'Curve', entries: 'Entries' };
  const unnamed = flowSubs.filter((f) => label[f] && !prose.includes('"' + label[f]) && !prose.includes(label[f]));
  check('every Flow lens is named somewhere in the Help prose',
    unnamed.length === 0, 'not mentioned: ' + J(unnamed));
}

// ── Retired names stay retired ───────────────────────────────────────────────
{
  // The renames that have already bitten. Each pattern matches the retired
  // name used as a proper noun for a place, not the ordinary English word:
  // "Monthly on the 12th" and "Monthly summary" are fine, "the Monthly grid"
  // is not.
  const retired = [
    [/the Forecast(?:'|’)?s? [“"]?vs Target/, 'the "vs Target" column is on the Curve lens now'],
    [/The Forecast [“"]vs Target/, 'heading still names the Forecast lens; it is Curve'],
    [/in the Forecast\b/, 'the Forecast lens is called Curve'],
    [/the Monthly grid/, 'the Monthly lens is called List'],
    [/Monthly, Calendar and Forecast/, 'the ledgers are List, Calendar and Curve'],
    [/out of Budget vs Actual/, 'Budget vs Actual is called Envelopes'],
    [/the Budget tab/, 'the Budget tab is called Flow'],
    [/the Budget month/, 'the Budget tab is called Flow'],
    [/Budget → Budget vs Actual/, 'that destination is Envelopes'],
    [/Settings is the last item in the bottom bar/, 'Settings is in the avatar menu; the bottom bar has no Settings item'],
  ];
  const found = retired.filter(([re]) => re.test(prose)).map(([re, why]) => String(re) + ' — ' + why);
  check('no retired destination or lens name survives in the Help prose',
    found.length === 0, found.join('\n     '));
}

// ── The shortcut table matches the handler ───────────────────────────────────
{
  // Every destination reachable by a letter should be listed, and every letter
  // listed should exist in the handler. Envelopes was reachable only by digit
  // while every other destination had a letter.
  const handled = [...appSrc.matchAll(/case "([a-z])":\s*\n\s*case "[A-Z]":\s*\n\s*setTab\("(\w+)"\)/g)]
    .map((m) => [m[1].toUpperCase(), m[2]]);
  // The shortcuts are spread over several rows — the destination letters on
  // one, the lens jumps (F, R) on another — so gather every letter the table
  // names anywhere, not just the first row that looks like a list.
  const keysBlock = helpSrc.match(/keys: \[([\s\S]*?)\n\s*\] \}/);
  const row = keysBlock && keysBlock[1].match(/\["([A-Z](?: \/ [A-Z])+)"/);
  check('the Help shortcut table is still findable', !!keysBlock && !!row, J(keysBlock && keysBlock[1].slice(0, 80)));
  if (keysBlock) {
    const listed = [...keysBlock[1].matchAll(/\["([^"]+)"/g)]
      .flatMap((m) => m[1].split(/\s*\/\s*/))
      .map((x) => x.trim());
    const missing = handled.filter(([k]) => !listed.includes(k)).map(([k, t]) => k + '→' + t);
    check('every letter the handler maps to a destination is in the Help table',
      missing.length === 0, 'handler has ' + J(handled) + ', table lists ' + J(listed) + ', missing ' + J(missing));

    // The digit shortcuts are the tab bar in order.
    const tabKeys = appSrc.match(/TAB_KEYS = \{([^}]*)\}/);
    const digits = tabKeys ? [...tabKeys[1].matchAll(/"(\d)": "(\w+)"/g)].map((m) => m[2]) : [];
    check('the digit shortcuts cover the tab bar, Envelopes included',
      digits.includes('envelopes') && digits.length >= 4, J(digits));
  }
}

// ── Plan sub-destinations ────────────────────────────────────────────────────
{
  const label = { goals: 'goal', strategy: 'strategy', debt: 'Debt', insights: 'Insights' };
  const unnamed = planSubs.filter((f) => label[f] && !new RegExp(label[f], 'i').test(prose));
  check('every Plan destination is named in the Help prose', unnamed.length === 0, J(unnamed));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
