#!/usr/bin/env node
// Rebuilds index.html from the split source in src/ + index.template.html.
// The deployed app stays a single self-contained HTML file (no server-side
// includes, no CDN dependencies) — this script is the only thing that knows
// how to reassemble it, so `src/` is what you actually edit and review.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const APP_MODULES = [
  "src/lib/runtime.js",
  "src/lib/supabase-config.js",
  "src/lib/migrate.js",
  "src/lib/dates.js",
  "src/lib/format.js",
  "src/lib/biometric.js",
  "src/lib/household-sync.js",
  "src/lib/push.js",
  "src/lib/app-data.js",
  "src/components/primitives.js",
  "src/components/forms.js",
  "src/components/csv-import.js",
  "src/components/entries.js",
  "src/components/misc-ui.js",
  "src/components/budget.js",
  "src/components/forecast-plan.js",
  "src/components/plan-dashboard-shared.js",
  "src/components/plan.js",
  "src/components/dashboard.js",
  "src/components/settings.js",
  "src/components/auth-misc.js",
  "src/App.js",
];

// The service worker can't be inlined into index.html — it has to be fetched
// from a real same-origin URL — so it's the one build output besides
// index.html. Its cache name is stamped from bootstrap-head.js's CF_VERSION so
// bumping the app version also invalidates the worker's cache.
function buildServiceWorker() {
  const bootstrap = read("src/bootstrap-head.js");
  const m = bootstrap.match(/const CF_VERSION\s*=\s*'([^']+)'/);
  if (!m) {
    console.error("build.js: couldn't find CF_VERSION in src/bootstrap-head.js");
    process.exit(1);
  }
  const sw = read("src/sw.js").replace(/__CF_VERSION__/g, () => m[1]);
  fs.writeFileSync(path.join(ROOT, "sw.js"), sw);
  console.log(`build.js: wrote sw.js (${sw.length.toLocaleString()} bytes, cache cf-${m[1]})`);
}

function build() {
  const template = read("index.template.html");
  const globalStyles = read("src/styles.css");
  const reactBundle = read("src/vendor/react-bundle.js");
  const miniRecharts = read("src/vendor/mini-recharts.js");
  const supabaseClient = read("src/vendor/supabase-client.js");

  const appCode =
    read("src/bootstrap-head.js") +
    APP_MODULES.map(read).join("") +
    read("src/bootstrap-tail.js");

  // Sanity check: the reassembled app code must be syntactically valid on
  // its own before we ever write it into index.html.
  try {
    new Function(appCode);
  } catch (err) {
    console.error("build.js: reassembled app code failed to parse:", err.message);
    process.exit(1);
  }

  const output = template
    .replace("__GLOBAL_STYLES__", () => globalStyles)
    .replace("__REACT_BUNDLE__", () => reactBundle)
    .replace("__MINI_RECHARTS__", () => miniRecharts)
    .replace("__SUPABASE_CLIENT__", () => supabaseClient)
    .replace("__APP_CODE__", () => appCode);

  fs.writeFileSync(path.join(ROOT, "index.html"), output);
  console.log(`build.js: wrote index.html (${output.length.toLocaleString()} bytes)`);

  buildServiceWorker();
}

module.exports = { APP_MODULES, ROOT, read };
// Only build when run directly (`node build.js`) — scripts/lint-bundle.js
// requires this module purely for APP_MODULES/read and must not trigger a
// build as a side effect of `require`.
if (require.main === module) build();
