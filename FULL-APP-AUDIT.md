# Full Application Audit — CashFlow Budget

September 2026, against `main` at `22815e8` (build `v190`).

The audit covers four things: defects, architecture, UI and usability, and new features. It builds on the three earlier UI audits (`MOBILE-UI-AUDIT.md`, `MOBILE-UI-AUDIT-2.md`, `DESKTOP-UI-AUDIT.md`) and doesn't repeat what they already fixed.

**How it was done.** I read all of the application source, the SQL schema, both Edge Functions, the service worker and the build. I then ran the app against the shared test household at 393 px and 1440 px, in light and dark mode. I checked each suspected defect before listing it:

- Service-worker caching: a Playwright harness.
- Privilege checks: a scratch Postgres 16 with the CI auth shim.
- Colour tokens: computed styles in a real browser.

Every browser-free suite and the lint pass are green on `main`. Several of the defects below got past them anyway, and §2.7 explains why.

Severity scale:
- **S1**: broken for users, or a security issue.
- **S2**: wrong output or data at risk.
- **S3**: an inconsistency or papercut.

---

## 0. The ten things to do first

| # | What | Sev | Where |
|---|---|---|---|
| 1 | Every `--on-dark-*` colour token refers to itself, so it's invalid. The sign-in tagline, footer, header search, chart tooltips and avatar ring all render near-black on dark green. | S1 | `src/styles.css:237-239` |
| 2 | A **view-only member can mint an invite that grants full write access** | S1 | `supabase/schema.sql:2274` |
| 3 | The service worker caches **Supabase API reads**, so member lists, roles and "am I in a household" are always one response stale | S1 | `src/sw.js:132` |
| 4 | Any account at all can use `ai-proxy` to spend your Anthropic credit, because sign-up is open and household membership is never checked | S1 | `supabase/functions/ai-proxy/index.ts:94` |
| 5 | The backup-nudge "Export backup" writes an **incomplete backup**, missing accounts, holidays, currency and six more fields | S2 | `src/App.js:554` |
| 6 | The "Car loan ends — frees $288.75/mo" figure for a $385/mo loan is wrong | S2 | `src/components/dashboard.js:700` |
| 7 | Receipt images are stored inside `cf_overrides` in `localStorage`, where the ~5 MB quota runs out quickly | S2 | `src/lib/household-sync.js:74` |
| 8 | Device preferences are synced to the whole household (dark mode, Entries filters, column order). One partner's phone changes the other's. | S2 | `src/lib/household-sync.js:82-130` |
| 9 | Envelopes call scheduled money "spent", and adding an entry quietly raises the target to match. The feature ends up grading itself. | S2 | `src/App.js:863`, `src/components/budget.js:1129` |
| 10 | There's no build step, types or modules: 20k lines of hand-maintained esbuild output in one shared scope | Arch | whole `src/` |

---

## 1. Bugs and defects

### 1.1 S1: the whole `--on-dark-*` token family is invalid (regression from yesterday)

`src/styles.css:237-239`:

```css
--on-dark-08:var(--on-dark-08); --on-dark-16:var(--on-dark-16);
--on-dark-30:var(--on-dark-30); --on-dark-45:var(--on-dark-45);
--on-dark-60:var(--on-dark-60); --on-dark-85:var(--on-dark-85);
```

Commit `eafab5b` ("Every colour the app paints with now has a name") replaced `rgba(255,255,255,0.x)` literals with token names. It also rewrote the tokens' own definitions, so each one now refers to itself. A self-referential custom property is *guaranteed-invalid*, and every declaration using it falls back to its inherited value.

In a browser, the footer computes to `rgb(19,26,23)` on `#14413A`, about 1.6:1. The token is used 29 times. What you can see:

- **Sign-in screen:** the tagline "Personal budget & cash flow tracker" and the note under the form are near-black on dark green. This is the first screen a new user sees.
- **App footer:** Privacy, Terms and the build tag are effectively invisible.
- **Header search:** the background, border and icon vanish, which is why the desktop search field is barely visible.
- **Chart tooltips:** the label, series name and percentage lose their ink.
- Also affected: the avatar ring, the undo-toast countdown, the "not configured" copy and the close buttons on dark sheets.

**Fix:** restore the literal values (`rgba(255,255,255,.08/.16/.30/.45/.60/.85)`). **Test gap:** `tests/theme-tokens.mjs` and `tests/contrast.mjs` read tokens as text and never resolve them. A one-line check that fails on any `--x: var(--x)`, plus a computed-style probe of the footer, would have caught this.

### 1.2 S1: a view-only member can grant themselves write access

`create_invite()` (`supabase/schema.sql:2284`) only requires that the caller isn't disabled. `join_household()` inserts the new member with the column default, `role = 'member'`, which is a writer.

I reproduced it on Postgres with the CI auth shim:

```
Alice  owner
Bob    viewer   ← demoted by Alice
Bob-alt member  ← Bob's second account, joined with Bob's invite: can write
```

**Fix:** have `create_invite` require `is_household_owner(hid)`, or at least `is_household_writer(hid)`. Give `household_invites` a `role` column, set by the owner and capped at the inviter's own role, and have `join_household` use it. Add this case to `tests/viewer-role.sql`.

Related: `join_household` redeems a code with a separate `update ... where code = ...` and no `used_by is null` guard or row lock. Two concurrent redemptions can both succeed. Use `update ... where code = $1 and used_by is null returning household_id`.

### 1.3 S1: the service worker caches cross-origin API GETs

The non-navigation branch of `src/sw.js:132` answers **every** GET cache-first and revalidates behind it. That includes cross-origin requests to `*.supabase.co/rest/v1/...`.

A harness against a counting endpoint showed the first fetch returning `call 1`, and the second also returning `call 1` while the server had already served `call 2`. Every read is one response behind. The consequences:

- `refreshMembership` (`src/lib/household-sync.js:258`) reads `household_members` and `households` by GET. After an owner disables a member or changes a role, the list refreshes to the **previous** state.
- A new user's "which household am I in?" lookup is cached as *none*. After they join, the refresh returns the cached "none", and the app can keep showing the onboarding screen until the next reload.
- The holiday API (`src/lib/holidays.js:245`) is cached for the lifetime of a build.

**Fix:** only handle same-origin requests (`if (new URL(e.request.url).origin !== self.location.origin) return;`) and let the network own everything else. If some external responses should be cached, list them explicitly.

### 1.4 S1: `ai-proxy` is a relay for anyone who can sign up

The function checks that a JWT belongs to *some* user (`index.ts:94`). It never checks household membership, and there's no rate limit. The app's sign-in screen offers "Create account" to anyone, so anyone can create an account and use your Anthropic key. The README says "It only answers signed-in household members", which isn't true.

**Fix:** call `is_household_member(cf_my_household())` through an RPC first, or query `household_members`. Add a per-user daily counter, which the code already sketches as a comment. Consider turning off open sign-up in Supabase Auth and relying on invites.

### 1.5 S2: the backup nudge exports a partial backup

`dismissBackup(true)` (`src/App.js:554`) builds the export by hand. Its comment claims it's the "same full field set as Settings' Export Backup", but the list is missing `assets`, `accounts`, `holidays`, `holidayRegion`, `currency`, `locale`, `activity`, `debtExtra` and `debtSimExcluded`.

When that file is restored:
- entries still point at `accountId`s that no longer exist,
- the currency goes back to the default,
- the holiday overrides and net-worth assets are gone.

**Fix:** build it from `HOUSEHOLD_BACKUP_FIELDS` the way `settings.js:1117` does, and put that in one shared `buildBackup()` helper.

### 1.6 S2: the "frees $X/mo" figure divides by twelve

`src/components/dashboard.js:700` computes `monthly` as *this year's total of the entry ÷ 12*. The car loan runs nine months at $385, so the card reads "frees $288.75/mo". Any entry that starts or ends mid-year is understated, and a bi-weekly one is off as well.

**Fix:** use the entry's own monthly equivalent (amount × occurrences per month, from `recurUnit`/`recurEvery`). The drift and anomaly code already reason about this.

### 1.7 S2: receipts are stored in `localStorage`

`overridesByYr` is a `useLS` field (`cf_overrides`) and still carries each receipt's `attachment` data URL. The payload strips it, but the local copy doesn't. A few dozen photos will hit the ~5 MB origin quota. After that, **every** field's write fails, because they share the quota, and the only feedback is `notifyStorageWriteFailure`. `load_household` also returns every receipt, base64-encoded, on every load.

**Fix:** keep receipts out of React state and `localStorage`. Store them in IndexedDB locally, and move the server copy from `bytea` to Supabase Storage with signed URLs, loaded when an occurrence is opened.

### 1.8 S2: per-device view preferences are synced to everyone

`HOUSEHOLD_FIELDS` includes `darkMode`, `forecastHorizon`, `dashHidden`, `dashOrder`, `colOrder`, `budgetColOrder` and the four `regFilter*` fields. If you switch to dark mode, or filter Entries to "Unpaid", your partner's device changes on its next load. The README says the opposite ("where you happen to be looking … is not synced"), and the account filter was made device-local for exactly this reason.

**Fix:** move these to plain `useLS`, keep the payload keys in `cf_payload_retired_keys()` so older tabs keep saving, and add a "System" option to Appearance.

### 1.9 S2: Envelopes grade themselves

- `addEntry` (`src/App.js:863`) adds every new expense's scheduled amount to that category's budget target, for every configured year. Deleting the entry doesn't take it back out.
- The Envelopes view compares *scheduled* expenses against those targets and labels the result "spent" and "Fully spent" (`budget.js:1129`). On 3 September the fixture shows Food "$520 spent" while most of that month's groceries haven't happened yet.

The net effect is that nearly every envelope reads "Fully spent" and the feature can't tell you anything. **Fix:** see §3.3. Show *spent so far* (completed and past occurrences, including `actualAmount`) separately from *still scheduled*, and ask before touching a target.

### 1.10 S3: smaller defects

| Defect | Where |
|---|---|
| The low-balance banner hard-codes `$` ("under your $500 alert threshold") and ignores the currency setting | `src/App.js:1266` |
| The entry form's label reads "Amount ($)" whatever the currency | `src/components/forms.js:264` |
| The AI assessment prompt hard-codes `$` and `toLocaleString()` with no locale | `src/components/forecast-plan.js:640-664` |
| The restore confirmation says "This cannot be undone", then offers Undo | `src/components/settings.js:1163` / `1217` |
| Ctrl/⌘+Z's comment says it never fires under a modal, but the modal guard comes *after* it, so it undoes behind an open form | `src/App.js:1054` vs `1066` |
| The low-balance scan (`navLowInfo`) stops at 31 Dec, so a January dip is never flagged in late November or December | `src/App.js:1144` |
| `addEntry` falls back to `userId: 1` when signed out, a number in a field that otherwise holds UUIDs | `src/App.js:864` |
| The boot splash uses `Inter` and `IBM Plex Mono`, which aren't shipped (the app uses Schibsted Grotesk and Spline Sans Mono), plus a 💰 emoji instead of the brand mark | `index.template.html:29,35,46` |
| ~~The desktop header stops about 15 px short of the right edge~~ **Retracted:** that strip is html's stable scrollbar gutter, which a real browser fills with the scrollbar; headless screenshots leave it blank. The redundant `body` declaration was removed anyway. | `index.template.html:28-29` |
| `tests/layout-sweep.mjs` never visits `plan/networth`, although it's a published route | `tests/layout-sweep.mjs` ROUTES |
| README drift: it names Inter/IBM Plex, quotes "387 KB gzipped" (the bundle is now 511 KB), and says `ai-proxy` answers "household members" only | `README.md:44,574,671` |
| 24 list renders use the array index as `key` | `src/components/*.js` |

---

## 2. Architecture: best practices and consistency

### 2.1 The source is compiled output being edited by hand

Every file under `src/` has esbuild fingerprints: `/* @__PURE__ */`, `__spreadValues`, `var _a; (_a = x) == null ? void 0 : _a.y`, and `React.createElement` nested twelve deep on one 3,000-character line (`budget.js:490`, `budget.js:817`). There are no modules. `build.js` concatenates 31 files into one scope, so:

- `no-undef` and `no-unused-vars` only work on a stitched copy (`scripts/lint-bundle.js`),
- load order is a hard-coded list,
- `genId` has to live in `runtime.js` because `migrate.js` runs at load time.

**Recommendation (the biggest structural lever).** Switch to ES modules and JSX, with Vite or esbuild as the bundler and TypeScript (or `// @ts-check` with JSDoc to start). You can keep shipping one self-contained `index.html` with `vite-plugin-singlefile`, so GitHub Pages and the service-worker design don't change. Migrate a file at a time. esbuild can already turn the current output back into readable JSX, and the 174-test browser suite is a strong safety net.

What you get:
- a real import graph, so the lint shim goes away,
- types on the money model: cents vs dollars is currently only a comment, and `debtData` still holds *strings of cents*,
- readable diffs, and tree-shaking.

### 2.2 `App.js` is a 2,000-line god component

`App` holds routing, the idle lock, biometrics, service-worker and install prompts, keyboard shortcuts, pull-to-refresh, notification scheduling, undo, the activity log, the what-if scenario, account filtering, year flows, alert findings and notices. It destructures 32 fields and 32 setters by hand, and every screen re-renders on every edit.

Split it by concern:
- **Routing:** a small hash router in `useRoute()`. Today the hash is built and parsed in three places (`App.js:320`, `347`, and `parseTabHash`).
- **Data:** a `HouseholdProvider` context with selectors, or a small store such as Zustand, so a view subscribes only to what it reads.
- **Derived money:** a `useFlows()` hook. `yearFlows`, `scenarioFlows` and `accountYearFlows` currently repeat the carry-forward loop three times.
- **Chrome:** `useIdleLock`, `useKeyboardShortcuts`, `usePullToRefresh` and `useInstallPrompt` as separate hooks.

### 2.3 Sync is one whole-household document at a time

Every edit re-sends the entire household through `save_household`, guarded by a single `updated_at`. Two members editing different things at once trigger a CONFLICT, and the loser gets "Please redo your last change". Nothing is pushed between devices: other members' edits only show up after a reload or pull-to-refresh.

**Recommendation (staged):**
1. Send **changed rows only**. The tables are already normalised: diff against `syncedSig` per collection and upsert or delete rows, each with its own `updated_at`.
2. Resolve conflicts **per row** (last writer wins per entry, or a field-level merge). Keep the existing divergence UI only for real same-row clashes.
3. Add a **Supabase Realtime** subscription on the household's tables so a partner's edit appears within seconds.
4. Longer term, a local-first store (IndexedDB) replaces `localStorage` as the working copy. It fixes §1.7 and the quota ceiling as well.

### 2.4 State storage is inconsistent

| Kind of state | Where it lives now | Where it belongs |
|---|---|---|
| Household data | `useLS` + payload | IndexedDB + server rows |
| Device preferences (theme, filters, column order) | **payload** (§1.8) | `useLS` |
| Receipts | React state + `localStorage` (§1.7) | IndexedDB / Storage |
| Session UI (tab, lock marker) | `sessionStorage` | fine as is |
| Idle-lock timeout, AI key | `localStorage` | fine; AI key should get a CSP (§2.6) |

Adopt one rule: *if it describes the household it syncs, and if it describes this screen it doesn't*. Enforce it in `HOUSEHOLD_FIELDS` with a `scope: "household" | "device"` column.

### 2.5 The schema and client disagree

- Debts: the database has typed `numeric` columns (README), but the client stores `balance`/`payment` as **strings of cents** and runs `parseFloat` 18 times in `plan.js`. Normalise to integer cents at the edge.
- Nested fields inside entries and overrides are only protected by the round-trip test (README §"Data model"). Generate a JSON Schema (or TypeScript types) from one declaration and validate in both `cf_apply_household_payload` and the client.
- There's no **leave household**, **remove member** or **delete my account** path. Members can only be disabled, and `privacy.html` tells users to delete their account themselves, which the app can't do. PIPEDA and GDPR expect a working deletion path.

### 2.6 Security hardening

- Add a **Content-Security-Policy** `<meta>`. The page holds a browser-side Anthropic key and a Supabase session in `localStorage`, and a CSP is the cheapest defence against injected script: `default-src 'self'; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://canada-holidays.ca; img-src 'self' data: blob:; script-src 'self' 'sha256-…'`. `build.js` can hash the inline blocks.
- On `ai-proxy`: add `Access-Control-Allow-Origin: *` → your Pages origin, the membership check (§1.4), and a quota.
- Treat the supabase-js UMD (218 KB) as a supply-chain dependency: record its SHA-256 in the README table and check it in CI.

### 2.7 Tests: large, but blind in two places

The suite is unusually thorough: 174 browser tests, a layout sweep, SQL round-trips and three Postgres layouts. All three S1 regressions above still got through, for structural reasons:

1. **Nothing resolves CSS at runtime for colour.** The contrast test reads the palette as text, and `theme-tokens` compares names. A computed-style contrast sweep inside `layout-sweep.mjs` (sampling text nodes against their effective background) would have caught §1.1 on every screen.
2. **Every browser test stubs `window.supabase`**, so the service worker never sees a real cross-origin response (§1.3), and role and permission paths are only tested as SQL files covering the paths someone thought of (§1.2).
3. `tests/regression.mjs` is one 7,279-line file that takes 20 minutes. Split it by feature and run the shards in parallel (a CI matrix), so a failure points at a feature.
4. There's no `package.json`. A minimal one with `"scripts": {"build", "lint", "test:fast", "test:browser"}` and pinned `devDependencies` (Playwright 1.63, ESLint 10) would replace the README's copy-paste recipes and make `npx` reproducible.

### 2.8 Performance

- The bundle is 1.88 MB raw and **511 KB gzipped**, and every screen and all 3,650 lines of CSS load up front. Once §2.1 is done, lazy-load Help, Settings, CSV import, the Plan tab and the chart library. Keep Today plus the entry form in the first chunk.
- `expandEntries` → `computeFlow` runs for every configured year on every edit, and again for the scenario and account views. Memoise per year on `(entries, overrides[year])` and pass it through a Web Worker once households get large.
- The cache-first service worker is good. Also consider `navigationPreload` for first visits.

### 2.9 Consistency papercuts

- Three names for one area: routes say `flow`, storage keys say `budget` (`cf_budget_subtab`), and payload keys say `reg` (`regFilter`). This is documented, but each new contributor has to learn it.
- Try/catch comment boilerplate ("Storage can throw outright in private/partitioned modes…") appears about 40 times. A `safeStorage.get/set` helper removes most of it.
- Two component vocabularies: `.cf-btn--primary` beside ad-hoc classes such as `btn-pad-24`, `mno-700-green` and `cf-text-mono-13`. Pick one design-system layer (§3.1).
- Inline `style={{…}}` colour logic still sits beside tokenised classes, for example `budget.js:490` and `dashboard.js:708`.

---

## 3. UI modernisation and usability

The foundations are good: tokens, focus rings, reduced motion, 44 px targets, landmarks, and hash routes for every screen. The opportunities are hierarchy, information density and making the app feel alive. They're grouped from largest to smallest.

### 3.1 A design-system pass

- **Type scale and weight.** In Envelopes, the **category name is 10 px grey and the amount is 16 px bold**, which is backwards: the name is what you scan for. The same inversion shows in the desktop Upcoming list, where the category chip is smaller than the date. Use a 4-step scale (12/14/16/20 plus a 28–32 display size for balances) and make the *thing* primary and the *number* secondary in lists.
- **Numbers.** Monospace for every amount makes the ledger read like a terminal. Use the sans face with `font-variant-numeric: tabular-nums` for alignment, and keep mono only for the build tag. It's calmer and still aligned.
- **Colour.** The palette is dark green plus greys, and the charts are grey fills (`Next 90 days`, `Projected balance`). Put the brand green in data: a gradient area fill under the balance line, coral only below the threshold, and a green/coral split on income and expense.
- **Components.** Replace native `<select>`s for Type, Category and Schedule with a **segmented control** (Income / Expense / Transfer) and a **searchable combobox** showing category colour dots. Replace `mm/dd/yyyy` date inputs with a date field that follows `locale` (en-CA shows `yyyy-mm-dd`).
- **Elevation.** Cards currently rely on 1 px borders. Use one soft shadow token and a 12–16 px radius throughout, with fewer nested borders.

### 3.2 Today: make it a real home screen

- **Hero balance.** "Balance today $40,685.00" is the same size as every other tile. Make it the hero (32 px), with a small trend delta ("+$3,090 this month") and the 90-day sparkline directly underneath.
- **The 90-day strip is a flat grey block.** Its y-axis starts at 0 while the balance moves between $40k and $44k, so it carries no information. Scale the domain to the data (with padding), shade the band below the alert threshold, and mark paydays and big bills with dots you can tap.
- **Upcoming on desktop** is centred inside a full-width card, leaving a large empty left gutter. Left-align it, or use a two-column layout with Upcoming beside the Alerts/Findings column at ≥1200 px.
- Show a **"Safe to spend until payday"** figure: balance minus scheduled bills before the next income, minus the threshold. It's the one number most people open a budgeting app for, and all the data is already computed.
- The "mark paid" circles have no visible affordance until you learn them. Add a **swipe-to-pay** (the mobile redesign in `design/` already sketches it), plus a short "Paid ✓" confirmation with undo.

### 3.3 Envelopes

- Show a **two-tone progress bar**: solid for spent so far, hatched for still scheduled, with a marker for "today" in the month. Change the labels to "$240 spent · $280 scheduled · $40 free".
- Stop auto-raising targets (§1.9). Offer **"Set targets from this month's plan"** as an explicit action instead.
- Tap an envelope to open its payments. This already exists (commit `c3ddd46`), so make it visible with a chevron.
- Add **"Move money"** between envelopes for YNAB-style rebalancing.

### 3.4 Flow

- **Mobile chrome.** Before the first row come sub-tabs, a month strip, the swipe tip, a surplus card and an opening-balance row, about 330 px. Merge the month strip into the header (`‹ Sep 2026 ›`, swipe to change), collapse the tip into first-run onboarding, and make the surplus row sticky and compact.
- **The month strip** doesn't show the year and clips "May" at the edge. Include the year when it differs from today's, and snap-scroll the selected month to centre.
- **Entries table (desktop):**
  - The Type column repeats the Income/Expense pills and the sign on the amount. Drop the column and let colour plus sign carry it.
  - Replace "Every 1wk" / "Every 2wk" with "Weekly" / "Every 2 weeks".
  - Six filter controls sit in one row. Use a single **filter bar with chips** (`Category: Utilities ×`) and a "More filters" popover.
  - The column-drag handle (`⠿`) sits on every header. Show it on hover only.
- **Calendar.** Add daily net and balance on each cell, and a heat tint for heavy days.
- **Curve.** Auto-scale the y-axis (as in §3.2), label the low point outside the plot, and add **drag-to-compare** across two dates.

### 3.5 Entry form

- Put **"Describe it"** (the natural-language fill) first and make it prominent: a single field with a sparkle button, which expands to the structured fields. That's the modern pattern, and the feature already exists.
- Add a larger **amount keypad** on mobile. `inputMode: "decimal"` is already set; a big calculator-style pad with `+`/`−` makes splitting a bill quick.
- Put the category pick first and remember the last category per description (`Hydro` → Utilities).
- **"Repeats"** is a toggle that opens a second screen. Use inline chips instead: *Once · Weekly · Every 2 weeks · Monthly · Custom…*, with a plain-language preview ("Every second Tuesday, next: Sep 8").
- The footer puts **Template, Cancel and Save** side by side. Move Template into an overflow menu, because three competing buttons slow the main action down.

### 3.6 Navigation and shell

- **Desktop:** the 1120 px max-width leaves about 320 px empty at 1440 px. Use a **left sidebar** at ≥1280 px (Today, Flow, Envelopes, Plan, Alerts, Settings, plus a year switcher and account filter), which frees the header for search and sync status.
- **Search** is a faint pill on dark green (and invisible right now, §1.1). Make it a **⌘K command palette**: jump to screens, find entries, "add expense…", "switch year…". The shortcut system and route table are already in place.
- **Sync status:** add a small persistent indicator (✓ saved / ↻ syncing / ⚠ offline) beside the avatar, so the state is always visible rather than only in Settings and toasts.
- **Settings** is already a clean list; add a search field at the top once it has more than 17 pages.
- The **avatar "DU"** menu hides profile, household and sign-out. Show the member's name and household on desktop.

### 3.7 Sign-in and onboarding

- Fix the contrast (§1.1).
- Add **magic-link** and **passkey** sign-in (Supabase supports both). The app already uses WebAuthn for its lock screen, so passkeys are a natural step.
- First-run: a three-step setup (opening balance → income → the three biggest bills) that ends on a Today screen with real data. The current path is either create an empty household or load sample data.

### 3.8 Micro-polish (no change is too small)

- Show all amounts as `−$55.00` with a true minus sign (U+2212), not a hyphen.
- The "Reconcile…" link under the balance looks like body text. Make it a small outline button.
- "Upcoming — next 7" → "Next 7 days".
- Add a ▲/▼ on the "Next low point" tile relative to today.
- Toasts: stack them at the bottom-centre on desktop, above the FAB on mobile, and show at most 3.
- Empty states such as Plan → Goals are functional. Add a one-line example ("Emergency fund — $6,000 by June") and a *Suggest a goal* button that uses the existing AI transport.
- The build tag in the footer can link to a **What's new** sheet generated from the commit titles, which are already written as user-facing sentences.
- Add `theme-color` for both schemes in the `<meta>` (`media="(prefers-color-scheme: dark)"`) so the browser chrome doesn't flash on launch.
- Web app manifest: add `id`, `shortcuts` ("Add entry", "Today", "Envelopes"), `screenshots` (for the richer Android install sheet), and `share_target` (see §4).

---

## 4. New features

Ranked by value to a household budgeting app, given what already exists:

| # | Feature | Why now | Size |
|---|---|---|---|
| 1 | **Bank import via open-banking** (Flinks or Plaid in Canada), or at least an **OFX/QFX importer** beside the CSV one | Reconciling actuals by hand is the biggest chore; the drift and anomaly engines get much better with real transactions | L |
| 2 | **Real-time household sync** (Realtime channel) plus a **"who's viewing" presence** dot | Removes the conflict/redo toast; partners see edits live | M |
| 3 | **Safe-to-spend** and **payday view** (§3.2) | The single most useful number, and all the data already exists | S |
| 4 | **Receipt inbox**: Android share-target and email-in, AI-read into a draft occurrence | The receipt OCR already exists; this makes capture effortless | M |
| 5 | **Subscriptions audit**: detect recurring small debits, show the annual cost, flag price rises | The drift detector already does the maths | S |
| 6 | **Bill calendar export** (ICS feed per household) | Puts bills in the calendar people already use; notifications only reach one device each | S |
| 7 | **Split and shared expenses** between members ("who paid, who owes") | Natural for a multi-member household | M |
| 8 | **Goals v2**: auto-fund from surplus, projected completion on the curve, celebratory milestones | Goals are currently static | M |
| 9 | **Tax helpers (Canada)**: RRSP/TFSA/FHSA room tracker, tax-deductible tagging, a year-end summary PDF | The categories already include RRSP; strong local fit | M |
| 10 | **Ask your budget**: a chat panel over the household's data through `ai-proxy` ("Can we afford a $2k trip in March?"), answering with the what-if engine | The scenario engine and AI transport both exist | M |
| 11 | **Multi-currency accounts** (a USD account with an FX rate) | The currency setting is per household today | M |
| 12 | **Leave / remove member / delete account** (§2.5) | A compliance gap as well as a feature | S |
| 13 | **Widgets**: an Android home-screen widget via a TWA, or a PWA widget (Chromium's experimental API), showing the balance and next bill | Glanceable, the way Today is meant to be | M |
| 14 | **Audit trail per entry**: activity log entries link to the thing they changed, with a "restore this version" button | The activity log and override history already exist | S |
| 15 | **Offline-first conflict merge UI**: a side-by-side of local and cloud per changed row, instead of keep-mine/keep-theirs for the whole household | Pairs with §2.3 | M |

---

## 5. Outcome: the four S1s (build v191)

| Item | Fix | Test that now guards it |
|---|---|---|
| §1.1 `--on-dark-*` tokens | Literal values restored in `src/styles.css` | `tests/theme-tokens.mjs` fails on any custom-property cycle, and on `var()` of an undeclared name with no fallback. `tests/regression.mjs` "text on the dark chrome is lighter than the chrome" asks the browser what it painted, signed out and in. |
| §1.2 viewer invites | `create_invite()` requires a writer. `join_household()` claims the code in one guarded `update … where used_by is null`, and refuses a code whose inviter is no longer a writer. `supabase/fix-invite.sql` carries the same check. Settings disables the button for viewers and says why. | `tests/viewer-role.sql` (14 checks, up from 9), plus the browser test "a view-only member cannot generate an invite code" |
| §1.3 service worker | Cross-origin requests bypass the worker entirely | `tests/regression.mjs` "cross-origin reads (the Supabase API) always reach the network" (three reads must come back 1, 2, 3, and nothing cross-origin may be cached) |
| §1.4 `ai-proxy` | Logic moved to `handler.ts` (dependency-injected). `index.ts` checks, as the caller under RLS, for an active membership row. Non-members get 403, and the probe too. The client doesn't cache a 403 probe and re-probes when the household changes. | `tests/ai-proxy.mjs` (10 checks, runs under Node type-stripping, wired into CI) |

Each new test was run against the pre-fix code and failed there. **Deploy note:** the SQL and the Edge Function aren't deployed by the site. Re-run `supabase/schema.sql` (or just the two functions) and `supabase functions deploy ai-proxy`.

Still open from §1.4: a per-user rate limit on the proxy.

### Batch 2 (build v192)

- **§1.5** Both backup buttons now call one `buildHouseholdBackup()`, built from the field table. Test: "the 30-day reminder exports the same fields as Settings".
- **§1.6** The new `monthlyEquivalent(entry)` in `dates.js` works from the schedule. The car loan now reads "frees $385.00/mo". Covered by 10 new checks in `tests/dates.mjs` (including agreement with `expandEntries`) and a pinned-clock browser test.
- **§1.10:**
  - The low-balance banner, the entry form's amount label and the AI assessment prompt now use the currency formatter.
  - The restore dialog's copy now matches the Undo it offers.
  - Ctrl/⌘+Z is inert under an open dialog (browser test added).
  - The low-balance scan reads into next year and names it (browser test added).
  - The boot splash uses the shipped fonts and the app icon.
  - `plan/networth` is in the layout sweep (217 screens, clean).
  - README drift fixed.
  - The header "gap" finding is retracted (see its row above).

## 6. Suggested order

1. **Today (hotfix):** §1.1 tokens, §1.3 service worker, §1.2 invite role, §1.4 proxy membership. Bump `CF_VERSION`. Add the self-reference lint and a computed-contrast probe.
2. **This week:** §1.5–§1.10 and the README drift. Move device preferences out of the payload (§1.8).
3. **Next:** the build migration (§2.1: ESM, JSX, TypeScript, Vite single-file), then split `App.js` (§2.2).
4. **Then:** row-level sync plus Realtime (§2.3), receipts to Storage and IndexedDB (§1.7), a CSP (§2.6).
5. **UI program:** the design-system pass (§3.1), Today and Envelopes (§3.2–3.3), then the sidebar and command palette (§3.6).
6. **Features:** safe-to-spend, subscriptions audit, ICS feed (small wins); then bank import and household sharing features.
