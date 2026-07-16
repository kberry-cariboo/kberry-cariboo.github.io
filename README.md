# CashFlow Budget

Personal cash flow and budget tracker, deployed as a single static `index.html` on GitHub Pages — no server, no external runtime dependencies.

## Source layout

`index.html` at the repo root is a **generated file** — don't hand-edit it. The actual source lives in:

```
index.template.html       HTML shell (head, manifest links, boot spinner) with
                           __REACT_BUNDLE__ / __MINI_RECHARTS__ / __APP_CODE__
                           placeholders
src/vendor/                Minified React + ReactDOM bundle, and a small
                            hand-rolled chart library (not the real Recharts
                            package) used for the app's charts
src/bootstrap-head.js      Service worker registration + error boundary setup
src/bootstrap-tail.js      Closes the bootstrap wrapper
src/lib/                    Shared constants, formatting/date helpers, hooks
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

## Fonts, icons, manifest

- `fonts/*.woff2` — self-hosted Inter and IBM Plex Mono (latin subset), so the installed PWA has real fonts offline.
- `icon-192.png` / `icon-512.png` — generated from the app's own logo mark on its navy brand color.
- `manifest.json` — real PWA manifest (not a data: URI).

If you change the logo, regenerate these deliberately — they aren't produced by `build.js`.
