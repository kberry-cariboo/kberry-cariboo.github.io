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

`build.js` concatenates all of the above (in the fixed order it defines) into `index.html`. Everything still runs as one big shared-scope script — there's no bundler, no JSX, no import/export; components are plain `React.createElement` calls in the same style the whole app already uses. Splitting into files exists purely so changes are reviewable and diffable instead of hand-editing a single ~760KB file.

## Making a change

```bash
# edit files under src/, then:
node build.js        # rebuilds index.html + sw.js
```

Serve the repo root with any static file server to check your change before
committing. (Opening `index.html` from the filesystem still works for most of
the app, but the service worker — and therefore offline caching and
notifications — needs a real `http://` or `https://` origin.)

### Updating the vendored libraries

`src/vendor/` is checked in rather than installed, so there's no manifest saying
where those files came from. Both are reproducible from npm — regenerate them
with the recipes below, then run `node build.js` and `node tests/regression.mjs`
(the "self-test" case runs the app's own React render checks, which is what
actually catches a bad bundle).

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
app used before. Receipt photos are stored as **binary blobs (`bytea`) in the
`receipts` table**, keyed to the specific dated occurrence they belong to — each
instance of a repeating entry has its own independent receipt — so they no
longer ride along inside every sync payload. (Legacy entry-level receipts are
re-keyed onto the entry's start-date occurrence by the migration.) All reads/writes go through the
`load_household`/`save_household` RPCs, which keep each save atomic.

Statutory holidays (which decide when payroll landing on a closed day is
actually deposited) are rows too: one per date in `holidays`, plus a
`holiday_years` row per year the household has taken over from the built-in
British Columbia rules — that second table is what distinguishes "this household
deleted every holiday in 2027" from "nobody has touched 2027". Settings →
Statutory Holidays is the UI over them, and `supabase/schema-test.sql` round-trips
the pair against a scratch database.

`tests/sync-sql.mjs` goes further: it runs the real app in a browser against a
real Postgres, with only Supabase auth stubbed, so the client's payload actually
passes through `save_household` and comes back out of `load_household`. It is
opt-in (`CF_TEST_PG=1` plus `PG*` pointing at a scratch database) and skips
otherwise. Worth running after touching the sync payload: a field with no column
behind it fails silently, since `cf_apply_household_payload` ignores keys it
doesn't recognise — the regression suite's stub accepts anything it is handed
and cannot catch that.

If you're upgrading an existing project, just re-run `supabase/schema.sql`: a
migration block at the end automatically copies each household's old
`household_data` blob into the new tables (extracting inline base64 receipt
images into `receipts`) the first time it runs. The legacy `household_data`
table is left untouched as a backup — verify your data in the app, then drop it
whenever you like. The earlier GitHub Gist sync/backup feature has been removed
entirely; use **Settings → Backup** for local JSON export/import.

## AI features

Five places in the app call Claude:

| Where | What it does |
| --- | --- |
| **AI Insights** tab | Full assessment of the year: cash flow, budget performance, debt, goals, and a 1–10 health score. |
| **Dashboard → What changed this month** | Compares this month with last and says which movements matter. |
| **Import CSV → Suggest categories** | Classifies the description column against your own category list, per row. |
| **Occurrence editor → Read receipt** | Reads an attached receipt photo for merchant, date and total. |
| **Add entry → Describe it** | Turns "hydro $180 every second Tuesday" into a filled-in entry form. |

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

Paste a key into **Settings → General**. It is stored in that device's
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
**Settings → Notifications**.

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
