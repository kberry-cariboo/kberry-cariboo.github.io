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
src/lib/                    Shared constants, formatting/date helpers, hooks,
                            Supabase config, and the household auth/sync hooks
src/components/            UI components, grouped by area (forms, register,
                            budget, plan/dashboard, settings, auth, etc.)
src/App.js                  The root App component + ReactDOM.render call
```

`build.js` concatenates all of the above (in the fixed order it defines) into `index.html`. Everything still runs as one big shared-scope script — there's no bundler, no JSX, no import/export; components are plain `React.createElement` calls in the same style the whole app already uses. Splitting into files exists purely so changes are reviewable and diffable instead of hand-editing a single ~760KB file.

## Making a change

```bash
# edit files under src/, then:
node build.js        # rebuilds index.html
```

Open `index.html` directly in a browser (or serve the repo root with any static file server) to check your change before committing.

A GitHub Actions workflow (`.github/workflows/build.yml`) rebuilds `index.html` automatically:
- On pull requests, it **fails the check** if `index.html` doesn't match what `node build.js` produces from `src/` — run the build locally and commit the result before merging.
- On pushes to `main`, it rebuilds and commits `index.html` back automatically if it's out of sync, so GitHub Pages (serving `index.html` straight from the branch root) always reflects `src/`.

## Supabase setup

CashFlow requires a Supabase project for authentication and data storage. To run
your own instance:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor in your project and run the entire contents of
   `supabase/schema.sql` — it creates the household tables plus the normalized
   budget tables (`entries`, `entry_overrides`, `categories`, `year_configs`,
   `budget_targets`, `templates`, `completed_occurrences`, `goals`,
   `household_settings`, and `receipts`), Row Level Security policies, and the
   RPC functions the app talks to (`load_household`/`save_household`/
   `put_receipt`/`delete_receipt` plus the household lifecycle RPCs).
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

If you're upgrading an existing project, just re-run `supabase/schema.sql`: a
migration block at the end automatically copies each household's old
`household_data` blob into the new tables (extracting inline base64 receipt
images into `receipts`) the first time it runs. The legacy `household_data`
table is left untouched as a backup — verify your data in the app, then drop it
whenever you like. The earlier GitHub Gist sync/backup feature has been removed
entirely; use **Settings → Backup** for local JSON export/import.

## Fonts, icons, manifest

- `fonts/*.woff2` — self-hosted Inter and IBM Plex Mono (latin subset), so the installed PWA has real fonts offline.
- `icon-192.png` / `icon-512.png` — generated from the app's own logo mark on its navy brand color.
- `manifest.json` — real PWA manifest (not a data: URI).

If you change the logo, regenerate these deliberately — they aren't produced by `build.js`.
