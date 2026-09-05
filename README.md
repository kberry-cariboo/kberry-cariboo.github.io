# CashFlow Budget

Personal cash flow and budget tracker, deployed as a single static `index.html` on GitHub Pages — no server, no external runtime dependencies.

## Source layout

`index.html` at the repo root is a **generated file** — don't hand-edit it. The actual source lives in:

```
index.template.html       HTML shell (head, manifest links, boot spinner) with
                           __REACT_BUNDLE__ / __MINI_RECHARTS__ / __APP_CODE__
                           placeholders
src/vendor/                Minified React + ReactDOM bundle, a small hand-rolled
                            chart library (not the real Recharts package), and
                            the official @supabase/supabase-js UMD bundle
src/bootstrap-head.js      Service worker registration + error boundary setup
src/bootstrap-tail.js      Closes the bootstrap wrapper
src/sw.js                   Service worker source — caching + Web Push handlers
src/lib/                    Shared constants, formatting/date helpers, hooks,
                            Supabase config, notification/push helpers, the
                            household auth/sync hooks, and `ai.js` — the single
                            call path every AI feature goes through
src/components/            UI components, grouped by area (forms, register,
                            budget, plan/dashboard, settings, auth, etc.).
                            `help.js` is the user documentation — the app's
                            explanatory copy lives there, as data, rather
                            than inline beside the controls it describes
src/App.js                  The root App component + ReactDOM.render call
```

`build.js` produces **two** files at the repo root: `index.html` and `sw.js`.
The service worker can't be inlined — a worker has to be fetched from a real
same-origin URL — so it's built separately. Its cache name is
`cf-<CF_VERSION>-<hash>`, where the hash is of the built `index.html`: that's
what makes `sw.js` differ between builds, which is in turn the only signal a
browser has that there's an update to install. Deriving it from content means
you can't ship a change that installed apps never pick up. Both files are
generated; don't hand-edit either.

The worker serves navigations **cache-first with background revalidation**: a
launch paints the cached shell immediately and the network request goes out
behind it. Before, navigations were network-first with `cache: 'no-store'`,
which made the cache an offline fallback and nothing else — every launch
re-downloaded the whole app (387 KB gzipped), not just the first.

That makes the background request the thing that delivers an update, so it
reports what it found: when the revalidated page carries a different
`CF_VERSION`, the worker caches it and then posts `{type:'CF_BUILD', version}`
to every open window, and `src/bootstrap-head.js` reloads onto it. The
comparison is what makes it loop-proof — it reloads only when the build on the
wire differs from the build in the document, so the reloaded page has nothing
left to react to.

**Deliberately not routed through `activate`/`controllerchange`.** A new worker
can install and then sit in `waiting` while the outgoing one finishes its
requests, and then `activate`, `clients.claim()` and `controllerchange` never
fire at all — observed intermittently, and the reason an earlier version of
this was flaky. The announcement comes from the *outgoing* worker, so it works
whatever the incoming one does. The `controllerchange` handler stays as a
second route.

Two related traps this depends on avoiding, both of which have bitten:

- The worker reads and writes through `caches.open(CACHE)`, never the global
  `caches.match()`. The global form searches *every* cache in the origin, so a
  new worker can serve a stale entry from a cache it has already deleted — an
  outgoing worker's revalidation can land its `put` after the sweep and quietly
  recreate the old cache.
- `install` precaches with `cache: 'reload'`. A plain `cache.add()` is an
  ordinary fetch and can be answered from the HTTP cache with the build being
  replaced, so the new worker would precache the old page. GitHub Pages sends
  `max-age=600` on HTML, which makes that a ten-minute window on every release.

`tests/regression.mjs` asserts both halves: that a repeat launch pulls zero
bytes, and that a simulated deploy reaches a client that already has one cached.

`build.js` concatenates all of the above (in the fixed order it defines) into `index.html`. Everything still runs as one big shared-scope script — there's no bundler, no JSX, no import/export; components are plain `React.createElement` calls in the same style the whole app already uses. Splitting into files exists purely so changes are reviewable and diffable instead of hand-editing a single ~760KB file.

## Making a change

```bash
# edit files under src/, then:
node build.js                 # rebuilds index.html + sw.js
node scripts/lint-bundle.js   # restitches .eslint-bundle.js from src/
npx --yes eslint@10 "src/lib/**/*.js" "src/components/**/*.js" src/App.js \
  build.js .eslint-bundle.js  # what CI runs
node tests/regression.mjs     # the browser suite
node tests/layout-sweep.mjs   # every route at every width
```

### Tests that quietly depend on what day it is

The browser fixture is a **2026** household — `FIXTURE_YEAR` in
`tests/household-fixture.mjs`, which both browser suites import and which is
the only place the year is written down. So "today" walks across it and
eventually off the end of it. Twice CI has gone red overnight on behaviour that
was still correct — a payday marker that is deliberately not drawn on past
occurrences, and an alert card naming the crossing date it had actually
computed. Both were found by CI rather than here.

`CF_FAKE_TODAY` pins every page's `Date`, so the suite can be walked forward and
asked what breaks before the calendar gets to do it:

```bash
CF_FAKE_TODAY=2026-12-20 node tests/regression.mjs
```

Tests that assert fixed strings about the fixture pin their own clock and
override this, which is the point: they are not date-dependent and have nothing
to contribute to a sweep. Anything new that derives a date of its own should
read `FAKE_TODAY` rather than `new Date()`, or the sweep reports a mismatch it
created itself.

The sweep is only meaningful **inside the fixture's budget year**. Past it the
household has no entries left to project — an empty forecast, no ledger rows,
no second curve — so both browser suites stop at the door rather than reporting
that as nine regressions. It is the signal to roll the fixture year forward,
not a defect in the app.

The 90-day forecast is what runs out first, and it runs out before the year
does. The four tests that read those ninety days now take a household with next
year in it as well (`spansYearEnd` in the fixture module — the app's forecast
reads every budget year, not just the active one, and a household in its second
year has both), which is what a real household looks like by December anyway.
The rest of the suite keeps the single-year fixture.

Past the end of the year there is nothing left to do but roll it. Both browser
suites refuse to start when "today" is outside `FIXTURE_YEAR` and say so in one
line, rather than letting you read nine failures that all mean "there is no
data". Rolling it is that one constant — but check the suite still passes
afterwards: several tests turn on which *weekday* a date falls on (a payday
landing on a Saturday, a statutory holiday landing on a Monday). Those carry
their own fixtures and pin their own clocks, so they do not move with
`FIXTURE_YEAR`, and the shared household's paydays land differently in a
different year.

### What the browser suite covers

`tests/regression.mjs` is the named suite: one test per behaviour, each saying
in its own name what it is protecting. When adding a feature, add a test that
drives it the way a person would — through the controls, not through the state
behind them.

The list of what to cover is not a matter of taste: the Help page in
`src/components/help.js` *is* the app's statement of what it does, and a feature
described there with no test behind it is a gap. That is how ten of them were
found at once — templates, duplicating an entry, the schedule picker, "Ends on",
rollover, resetting an occurrence, the PDF button, "Reset Targets to Actuals",
receipts and renaming a category, none of which any test had ever driven. One of
the ten was broken.

Two selector traps are worth knowing before writing a new one, because each has
cost an hour:

- `input[type=text]` matches nothing here. The attribute is absent and `text`
  is only the DOM default, so use the class (`input.settings-input`) or the
  role.
- A class like `.row-menu-btn` matches the phone *and* desktop copies of a row,
  one of which is `display:none` at any width. `.first()` therefore hits an
  element that cannot be clicked. Prefer the accessible name — the app labels
  these properly (`Edit Utilities budget target`) — or `.locator('visible=true')`.

### The layout sweep

`tests/regression.mjs` goes where a test author thought to send it.
`tests/layout-sweep.mjs` goes everywhere: all thirty routes — the seventeen
Settings pages included — at five widths plus two of them again in dark mode,
210 screens in about four and a half minutes. On each one it asserts only the
things that have to be true of *every* screen:

- the page does not scroll sideways, and nothing hangs off either edge
  (outside a container that scrolls on purpose)
- no text is clipped by its own box without an ellipsis
- on a touch viewport, every control clears 44px — measured through the
  padded-halo pattern, so a 15px button with a 15px `::after` counts as 45
- no two *visible* controls answer to the same accessible name, unless they
  sit in differently-named `role="group"`s
- nothing throws, and nothing reaches the console as an error

It found the Alerts centre shipping 32px tap targets: the touch-target test in
the named suite only ran at 393px, where the finding's sentence wraps onto a
second line and clears 44px by accident, and it had never been sent to
`#/alerts` at all. Nothing was wrong with that test. A sweep just doesn't
depend on anyone having thought of the case.

It shares the fixture household with the named suite —
`tests/household-fixture.mjs`, which is where the two of them would otherwise
have drifted apart.

That is not everything CI runs. Seven more suites go with it, and two of them
need a database:

```bash
for t in payload-fields payload-migration year-copy cloud-sync help-shots layout-sweep; do
  node "tests/$t.mjs"
done
```

`tests/payload-roundtrip.mjs` and `tests/sync-sql.mjs` drive the real SQL in
`supabase/schema.sql`. **Run them on the same Postgres major as production** —
this project's Supabase is on 17, and CI's service container matches it. A
local scratch database on another major still catches most things, but a
version-sensitive difference in the schema would slip through. Both suites now
**print the major they just ran against**, and say so plainly when it isn't the
one production runs — a green line that doesn't mention a version is a green
line that gets believed further than it should be. Both **exit 0 with a "skipped" line** when `CF_TEST_PG`
is unset, so a run that never touched them looks exactly like a run that passed
them — which is how a stale selector in `sync-sql.mjs` reached CI green-looking
from here. Point them at a throwaway Postgres before you believe a green local
run:

```bash
# initdb refuses to run as root; the CI job runs as an unprivileged user too
su postgres -s /bin/bash -c 'initdb -D /tmp/cfpg/data -U postgres'
su postgres -s /bin/bash -c "pg_ctl -D /tmp/cfpg/data -o '-p 5439 -k /tmp/cfpg' start"
export PGHOST=/tmp/cfpg PGPORT=5439 PGUSER=postgres PGDATABASE=cf_scratch
createdb cf_scratch
# schema.sql expects a Supabase project; the auth shim CI uses is quoted in
# .github/workflows/build.yml, above the "Load the schema" step
psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql -v ON_ERROR_STOP=1 -f supabase/schema-test.sql
CF_TEST_PG=1 node tests/payload-roundtrip.mjs
CF_TEST_PG=1 node tests/sync-sql.mjs
```

Playwright is resolved from a local install, `PLAYWRIGHT_LIB`, or the global
npm root. **CI pins the version** (`playwright@1.62.1` in
`.github/workflows/build.yml`); it used to install whatever npm had published
that morning, which is how a suite passing locally on 1.56.1 threw on the
runner when `page.accessibility` was removed upstream. Your global install can
still be a different version from the pin, so before bumping it — or when a
browser test fails in CI and not here — run the suite against the pinned one:

```bash
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y >/dev/null
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.62.1
cd -   # back to the repo
PLAYWRIGHT_LIB=/tmp/pw/node_modules/playwright/index.mjs \
  CHROMIUM_PATH=/opt/pw-browsers/chromium node tests/regression.mjs
```

`CHROMIUM_PATH` points a Playwright build at a browser it did not download
itself; every browser suite honours it, and without it a pinned Playwright
looks for a chromium revision that isn't there.

Both lint arguments matter. `no-unused-vars` and `no-undef` are off for the
per-file pass — every `src/` file references things defined in its siblings,
which only resolve once `build.js` concatenates them — so those two rules run
against the stitched `.eslint-bundle.js` instead. A plain `npx eslint .` passes
without checking them, and will happily miss a dead declaration that fails CI.

Serve the repo root with any static file server to check your change before
committing. (Opening `index.html` from the filesystem still works for most of
the app, but the service worker — and therefore offline caching and
notifications — needs a real `http://` or `https://` origin.)

### Help screenshots

The Help page's screenshots live in `images/help/` and are committed, not built
— `node build.js` stays dependency-free, and a shot only changes when the UI in
it changes. They are captured from the shipped bundle driving the same fictional
household the regression suite uses, so nothing there is mocked-up artwork and
nothing carries real data.

```bash
node build.js && node scripts/gen-help-shots.mjs
```

That rewrites every PNG, sweeps any left behind by a rename, and regenerates
`src/lib/help-shots.js` (the sizes the page reserves space with). Run it after
changing any screen a shot covers; `node tests/help-shots.mjs` fails if the Help
page names a file that isn't there, if a file is unused, or if the manifest has
drifted. Add or remove a shot by editing the `SHOTS` list at the top of the
script and the matching `{ shot: [...] }` block in `src/components/help.js`.

The images are ordinary same-origin files, fetched lazily when the Help page is
opened and then runtime-cached by the service worker like everything else — so
they work offline after one visit, and they cost nothing to anyone who never
opens Help.

### Updating the vendored libraries

`src/vendor/` is checked in rather than installed, so there's no manifest saying
where those files came from. What's in there now:

| file | package | version |
| --- | --- | --- |
| `react-bundle.js` | `react` + `react-dom` | 19.2.8 |
| `supabase-client.js` | `@supabase/supabase-js` | 2.112.4 |
| `mini-recharts.js` | — | hand-written, no upstream |

Keep that table current when you regenerate one — a minified bundle is a poor
place to look up a version. Both packaged files are reproducible from npm with
the recipes below; afterwards run `node build.js` and `node tests/regression.mjs`.
Two cases there are what actually catch a bad bundle: the "self-test" case
renders real components against React, and the "vendor" case loads the Supabase
file on its own and checks the API surface the app calls (every other test
replaces `window.supabase` with a stub, so nothing else would notice).

```bash
# src/vendor/react-bundle.js — React + ReactDOM, minified into window.React /
# window.ReactDOM. The entry pulls react-dom/client (not react-dom): that's why
# ReactDOM.createRoot exists but ReactDOM.flushSync is absent, which the
# self-test harness in src/components/auth-misc.js feature-detects around.
npm install react@<version> react-dom@<version> esbuild
printf 'import React from "react";\nimport ReactDOM from "react-dom/client";\nwindow.React = React;\nwindow.ReactDOM = ReactDOM;\n' > entry.js
npx esbuild entry.js --bundle --minify --format=iife --legal-comments=eof \
  --define:process.env.NODE_ENV='"production"' --outfile=src/vendor/react-bundle.js

# src/vendor/supabase-client.js — a verbatim copy of the published UMD build.
npm pack @supabase/supabase-js@<version>
tar xzf supabase-supabase-js-<version>.tgz package/dist/umd/supabase.js
cp package/dist/umd/supabase.js src/vendor/supabase-client.js
```

`src/vendor/mini-recharts.js` is hand-written, not a copy of the Recharts
package — there's no upstream version to track.

A GitHub Actions workflow (`.github/workflows/build.yml`) rebuilds the generated files automatically:
- On pull requests, it **fails the check** if `index.html` or `sw.js` don't match what `node build.js` produces from `src/` — run the build locally and commit the result before merging.
- On pushes to `main`, it rebuilds and commits them back automatically if they're out of sync, so GitHub Pages (serving straight from the branch root) always reflects `src/`.

## Supabase setup

CashFlow requires a Supabase project for authentication and data storage. To run
your own instance:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor in your project and run the entire contents of
   `supabase/schema.sql` — it creates the household tables plus the normalized
   budget tables (`entries`, `entry_overrides`, `categories`, `year_configs`,
   `budget_targets`, `templates`, `completed_occurrences`, `goals`,
   `holidays`, `holiday_years`, `household_settings`, and `receipts`), the
   push-notification tables
   (`push_subscriptions`, `notification_schedule`, `notification_sends`), Row
   Level Security policies, and the RPC functions the app talks to
   (`load_household`/`save_household`/`put_receipt`/`delete_receipt`,
   `save_push_subscription`/`delete_push_subscription`/
   `save_notification_schedule`, plus the household lifecycle RPCs).
3. In your project's API settings, copy the **Project URL** and **anon public key**.
4. Paste them into `src/lib/supabase-config.js` (`SUPABASE_URL` / `SUPABASE_ANON_KEY`)
   and run `node build.js`. The anon key is safe to ship in client-side code — Row
   Level Security in `supabase/schema.sql` is the actual access boundary, not the key.
5. Sign up in the app with your email and password, then either **create a
   household** (you become its owner) or **join one** with an invite code from
   another member.

### Data model & migration from the old blob store

Budget data is stored in **normalized tables** — one row per entry, override,
category, budget target, goal, and so on — rather than the single JSONB blob the
app used before. Row ids for entries and goals are **client-generated opaque
text** (`crypto.randomUUID()`, or plain millisecond numbers in households
created before that): the columns are `text`, and `load_household` hands a
digits-only id back as a JSON number so ids stored elsewhere as numbers keep
matching. Receipt photos are stored as **binary blobs (`bytea`) in the
`receipts` table**, keyed to the specific dated occurrence they belong to — each
instance of a repeating entry has its own independent receipt — so they no
longer ride along inside every sync payload. (Legacy entry-level receipts are
re-keyed onto the entry's start-date occurrence by the migration.) All reads/writes go through the
`load_household`/`save_household` RPCs, which keep each save atomic.

What is *not* synced is a short and deliberate list: the browser-held AI key (a
personal credential, never in the household payload and never in a backup),
the per-device notification and app-lock settings, the AI report caches, and
where you happen to be looking — the month, the lens, the account filter, the
scenario sandbox, which payoff order is highlighted. Everything the household
*owns* is in `HOUSEHOLD_FIELDS`, and `tests/payload-fields.mjs` fails if that
table and `cf_payload_keys()` in the schema disagree.

A synced field must have exactly one piece of state. `useLS` is per-hook
`useState` over a localStorage key, so a second `useLS` on a key that
`useHouseholdState` already owns is a second copy the payload never sees
change — which is what the Budget grid's column order and the payoff
simulator's extra payment were before they moved into the table.

**Nothing is stored as JSON.** Every value in the database is a column or a
row — including the ones that looked like documents. The activity log is
`activity_log`, one row per record. Each occurrence override's edit history is
`entry_override_history`, one row per previous value (which also ended a
quadratic-growth bug: every history element used to carry a spread of the whole
override *including its own history*, so each edit stored the last edit's log
inside itself). The three `{ id: true }` maps — hidden dashboard panels,
deleted-copy tombstones, per-category rollover flags — are `text[]` columns
beside the `col_order` and `reg_filter_*` arrays that were always shaped that
way. The bills itemised inside a digest notification are
`notification_schedule_items`.

The old columns are kept through one deploy as the pre-migration backup, and
nothing reads or writes them. **`supabase/drop-legacy-json.sql` removes them**,
and refuses to run if any household still has something in a blob with nothing
in its new home. It is a separate file on purpose: every statement in it is
irreversible, so it is yours to run once a deploy has proved the migration.

Debts are rows in `debts`, keyed by the client's own map key, with the balance,
the interest rate and the monthly payment as typed columns. They were the last
thing the household owns that was still a JSONB blob (`household_settings.debt_data`)
— untyped, unqueryable, and holding the figures as *strings* of cents beside
`numeric(14,2)` columns carrying the same unit everywhere else. Every column is
nullable on purpose: the tracker distinguishes "not filled in yet" from zero (a
debt with a payment and no balance is the state it renders as "payments found,
no balances yet"), and `load_household` strips nulls back out, so a record
round-trips as exactly the fields it was saved with. The old column is kept as
the pre-migration backup and is no longer written; a one-shot backfill guarded
by `household_settings.debts_migrated_at` unpacks it, and the marker rather
than "this household has no debt rows" is what stops a re-run of `schema.sql`
handing back a debt the user has since deleted.

Statutory holidays (which decide when payroll landing on a closed day is
actually deposited) are rows too: one per date in `holidays`, plus a
`holiday_years` row per year the household has taken over from the built-in
rules for its region (`holidayRegion`, any Canadian province or territory,
defaulting to British Columbia) — that second table is what distinguishes "this household
deleted every holiday in 2027" from "nobody has touched 2027". You →
Statutory Holidays is the UI over them, and `supabase/schema-test.sql` round-trips
the pair against a scratch database.

`tests/payload-fields.mjs` needs nothing at all and runs in CI. Two further
tests cover the database itself; both need a throwaway Postgres
(`CF_TEST_PG=1` plus `PG*` pointing at it) and skip cleanly without one:

- `tests/payload-roundtrip.mjs` saves a payload exercising every documented
  feature through the real SQL, loads it back, and diffs the two field by field.
- `tests/sync-sql.mjs` runs the real app in a browser against a real Postgres,
  with only Supabase auth stubbed, so the client's payload passes through
  `save_household` and comes back out of `load_household`.

On the client, a piece of household data is declared exactly once: a row in
`HOUSEHOLD_FIELDS` in `src/lib/household-sync.js`. That row carries the
localStorage key and default it loads with, the guard that vets a value arriving
from the cloud or a backup file, whether editing it schedules a save, and
whether it belongs in an export — and `useHouseholdState()` builds the React
state from the table, so there is no second list to keep in step. Adding a field
used to mean editing ten hand-maintained lists, and missing any one of them
failed silently; holidays shipped missing two.

The schema declares the same set of top-level fields in `cf_payload_keys()`, and
`tests/payload-fields.mjs` fails if that list and `HOUSEHOLD_FIELDS` ever
disagree. It reads both files as text — no database, no browser — so it runs in
CI on every push, which is what makes the mismatch impossible to ship rather
than merely detectable. `cf_apply_household_payload` enforces the same list at
runtime: a payload carrying a key it has no column for is **refused**, not
quietly stripped, so a site updated ahead of its database fails the save (and
the edit stays on the device as unsaved work) instead of writing a copy with
half the fields missing. Keys the schema has deliberately retired are listed in
`cf_payload_retired_keys()` and stay tolerated, so an older browser tab keeps
saving.

That covers **top-level** fields. Fields *inside* an entry or an override —
`transferDirection`, `copiedFrom`, `recurNth`, `bankingDay`, `accountId`, `toAccountId`,
`skipped`, `actualAmount`, `month` — have no
equivalent declaration, so they are still only covered by the round-trip test:
**run it whenever you add a field to the sync payload, and add the field to its
fixture.** Before it existed, `cf_apply_household_payload` wrote the columns it
knew about and ignored the rest, so a field with no column behind it failed
silently: the save succeeded, the app looked right, and the next load replaced
the user's work with a copy that never had it. The regression suite cannot catch
this — its Supabase stub accepts any payload it is handed. Six features were
lost that way (transfers, skipped occurrences, reconciled actual amounts,
occurrences moved to another month, copy provenance, and the per-category
rollover flags).

**Re-run `supabase/schema.sql` before deploying a client that adds a field.**
An inner field has no runtime guard behind it — `cf_apply_household_payload`
refuses an unknown *top-level* key, but a field inside an entry that the
database has no column for is silently dropped, and the next load hands the
user back a copy that never had it. The two recurrence units added most
recently make this concrete: against an un-upgraded database, `recurUnit`
fails the old `check` and is coerced to `'month'`, so "the third Friday"
quietly becomes "the 16th" and `recurNth` vanishes. Run the SQL first and the
whole class of problem doesn't arise.

If you're upgrading an existing project, just re-run `supabase/schema.sql`: a
migration block at the end automatically copies each household's old
`household_data` blob into the new tables (extracting inline base64 receipt
images into `receipts`) the first time it runs. The legacy `household_data`
table is left untouched as a backup — verify your data in the app, then drop it
whenever you like. The earlier GitHub Gist sync/backup feature has been removed
entirely; use **You → Backup** for local JSON export/import.

## AI features

Five places in the app call Claude:

| Where | What it does |
| --- | --- |
| **Plan → Insights** | Full assessment of the year: cash flow, budget performance, debt, goals, and a 1–10 health score. |
| **Today → What changed this month** | Compares this month with last and says which movements matter. |
| **Flow → Entries → Import CSV → Suggest categories** | Classifies the description column against your own category list, per row. |
| **Occurrence editor → Read receipt** | Reads an attached receipt photo for merchant, date and total. |
| **Add → Describe it** | Turns "hydro $180 every second Tuesday" into a filled-in entry form. |

Nothing is ever written on the model's say-so: every feature fills in fields
you then confirm, and the assessment is a report. All five go through
`callClaude` in `src/lib/ai.js`, which has two transports.

### Transport 1: the `ai-proxy` Edge Function (recommended)

The key lives in Supabase secrets and never reaches the browser. One deployment
serves every device and household member, and the function is the single place
to add a quota or an audit log later.

```bash
supabase functions deploy ai-proxy
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Deploy it **without** `--no-verify-jwt` (unlike `send-notifications`): the JWT
check is what stops the function being an open relay to your Anthropic account.
It only answers signed-in household members, rebuilds each request from an
allowlist — so a caller can't choose its own model or ask for a 128k-token
reply on your bill — and caps request size.

The app probes for it once per page load and prefers it automatically. When
it's deployed, no one needs to enter a key at all.

### Transport 2: a browser-held key (fallback)

Paste a key into **You → General**. It is stored in that device's
`localStorage` and sent straight from the browser to Anthropic. It is
deliberately **not** synced to Supabase — `household_settings` is readable by
every member, so syncing it would hand your key (and your bill) to everyone you
share a budget with. Enter it per device.

This transport necessarily exposes the key to anything that can run script on
the page, which is why the proxy exists. It stays supported so the AI features
work without a Supabase deployment, and without a household account at all.

If neither is configured, the AI features disable themselves and say why.

## Notifications

Two independent layers:

**Foreground** works out of the box, no setup. While the app is open it raises
a single alert per day listing every bill due that day, plus a warning when the
forecast balance is heading below your threshold. Turn it on in
**You → Notifications**.

**Background (Web Push)** is what reaches your phone with the app and browser
both closed — Android renders these as ordinary system notifications. It needs
a one-time setup, because a push has to be *sent* by something, and a static
site can't send anything:

1. **Generate a VAPID key pair** (no dependencies, nothing leaves your machine):

   ```bash
   node scripts/gen-vapid-keys.js
   ```

2. **Publish the public half** — paste it into `src/lib/supabase-config.js` as
   `VAPID_PUBLIC_KEY` and run `node build.js`. It ships to every browser by
   design; it is not a secret. Leaving it empty is a supported configuration:
   background push simply stays off and Settings says so.

3. **Deploy the sender**:

   ```bash
   supabase functions deploy send-notifications --no-verify-jwt
   supabase secrets set VAPID_PUBLIC_KEY=<public>
   supabase secrets set VAPID_PRIVATE_KEY=<private>     # never commit this
   supabase secrets set VAPID_SUBJECT=mailto:you@example.com
   supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
   ```

   `--no-verify-jwt` lets pg_cron call it without a user session; `CRON_SECRET`
   is what actually keeps it private.

4. **Schedule it** — store the same `CRON_SECRET` in Supabase Vault, then run
   `supabase/push-cron.sql` in the SQL editor:

   ```sql
   select vault.create_secret('<your CRON_SECRET>', 'cf_cron_secret');
   ```

   The secret is deliberately *not* written into `push-cron.sql` — this
   repository is public, so the cron job reads it from Vault at call time
   instead. The script refuses to schedule anything if the Vault secret is
   missing. It then runs hourly (every hour is somebody's 8am — delivery time
   is per-device).

5. **Install the app to your home screen** on the phone and enable notifications
   in Settings. Android delivers to installed PWAs far more reliably than to a
   browser tab.

### How the scheduling works

The app owns all the money math. Whenever your budget changes it publishes a
rolling 90-day list of "on this date, say this" rows to `notification_schedule`
— one row per day that has bills due, with that day's bills itemised in the
row's `items`, so a busy day is one notification rather than eight;
the Edge Function only looks up today's rows for each device's timezone and
sends them. That avoids a second, drifting copy of the recurrence/override
logic in Deno — see the comment on `buildNotificationSchedule` in
`src/lib/push.js`.

The consequence worth knowing: **the schedule only extends 90 days from the last
time you opened the app.** Open it once a quarter and you'll never notice; leave
it untouched for longer and background alerts stop until you next open it. The
one thing that isn't precomputed is whether a bill has since been marked paid —
the function re-checks `completed_occurrences` at send time, drops those bills
from the day's list, and re-words the message around what's left (skipping the
notification entirely if everything due that day is settled).

## Fonts, icons, manifest

- `fonts/*.woff2` — self-hosted Inter and IBM Plex Mono (latin subset), so the installed PWA has real fonts offline.
- `icon-192.png` / `icon-512.png` — generated from the app's own logo mark on its navy brand color.
- `manifest.json` — real PWA manifest (not a data: URI).

If you change the logo, regenerate these deliberately — they aren't produced by `build.js`.
