#!/usr/bin/env node
// Rebuilds index.html from the split source in src/ + index.template.html.
// The deployed app stays a single self-contained HTML file (no server-side
// includes, no CDN dependencies) — this script is the only thing that knows
// how to reassemble it, so `src/` is what you actually edit and review.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// The app is ES modules under src/, entered at src/main.js. esbuild bundles
// them into one IIFE that goes inline into index.html, between the bootstrap
// head (service worker registration, CF_VERSION, the error screen) and tail.
// It is the build's one dependency (package.json, pinned exactly).
const esbuild = require("esbuild");
function bundleApp() {
  const res = esbuild.buildSync({
    entryPoints: [path.join(ROOT, "src/main.js")],
    bundle: true,
    format: "iife",
    target: "es2020",
    charset: "utf8",
    legalComments: "none",
    write: false,
    logLevel: "silent",
  });
  return res.outputFiles[0].text;
}

// The service worker can't be inlined into index.html — it has to be fetched
// from a real same-origin URL — so it's the one build output besides
// index.html.
//
// Its cache name carries a content hash of the built page, not just
// CF_VERSION. That distinction matters more than it looks: the cache name is
// the only thing that makes sw.js differ between builds, and a byte-identical
// sw.js is how the browser decides there's no update — no install, no
// activate, no controllerchange, so an installed PWA never reloads and users
// stay on the old bundle. Keying on CF_VERSION alone made that a manual step
// everyone forgets (four rounds of notification changes all shipped under
// v177, and installs kept showing stale UI copy). Hashing the output makes it
// automatic: any change to src/ changes the hash, and no change leaves the
// worker untouched so browsers aren't churned for nothing.
//
// CF_VERSION stays in the name because it's the human-readable build tag shown
// in Settings — the hash is for correctness, the version is for people.
function buildServiceWorker(builtHtml) {
  const bootstrap = read("src/bootstrap-head.js");
  const m = bootstrap.match(/const CF_VERSION\s*=\s*'([^']+)'/);
  if (!m) {
    console.error("build.js: couldn't find CF_VERSION in src/bootstrap-head.js");
    process.exit(1);
  }
  const hash = crypto.createHash("sha256").update(builtHtml).digest("hex").slice(0, 12);
  const cacheName = `${m[1]}-${hash}`;
  const sw = read("src/sw.js").replace(/__CF_VERSION__/g, () => cacheName);
  fs.writeFileSync(path.join(ROOT, "sw.js"), sw);
  console.log(`build.js: wrote sw.js (${sw.length.toLocaleString()} bytes, cache cf-${cacheName})`);
}

// A Content-Security-Policy for the built page, as a <meta> (GitHub Pages sets
// no headers). The page holds a Supabase session and, for some users, an
// Anthropic key in localStorage; the policy is what stops a script that got
// into the page some other way from running, or from sending either anywhere.
//
// Scripts: only the four inline blocks this build wrote, each pinned by its
// SHA-256 — no 'unsafe-inline', no 'unsafe-eval' (nothing here evaluates
// strings). Connections: this origin, the Supabase project the app is built
// against (read out of supabase-config.js, so a self-hosted build allows its
// own project), Anthropic for the browser-key fallback, and the holiday feed.
// Styles keep 'unsafe-inline': the two inline <style> blocks and React's style
// props, and style injection is not the threat this is for.
function contentSecurityPolicy(html) {
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => `'sha256-${crypto.createHash("sha256").update(m[1], "utf8").digest("base64")}'`);
  if (hashes.length !== 4) {
    console.error(`build.js: expected 4 inline scripts to pin in the CSP, found ${hashes.length}`);
    process.exit(1);
  }
  const cfg = read("src/lib/supabase-config.js").match(/const SUPABASE_URL = "([^"]+)"/);
  const supa = cfg && /^https:\/\//.test(cfg[1]) ? new URL(cfg[1]).host : null;
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    ["connect-src 'self'", supa && `https://${supa} wss://${supa}`, "https://api.anthropic.com https://canada-holidays.ca"].filter(Boolean).join(" "),
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
  return `<meta http-equiv="Content-Security-Policy" content="${policy}"/>`;
}

function build() {
  const template = read("index.template.html");
  const globalStyles = read("src/styles.css");
  const reactBundle = read("src/vendor/react-bundle.js");
  const miniRecharts = read("src/vendor/mini-recharts.js");
  const supabaseClient = read("src/vendor/supabase-client.js");

  let bundled;
  try {
    bundled = bundleApp();
  } catch (err) {
    console.error("build.js: esbuild could not bundle src/main.js:\n" + (err.errors || []).map((e) => `  ${e.location ? e.location.file + ":" + e.location.line + " " : ""}${e.text}`).join("\n"));
    process.exit(1);
  }
  const appCode =
    read("src/bootstrap-head.js") +
    bundled +
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

  const withCsp = output.replace("__CSP__", () => contentSecurityPolicy(output));
  fs.writeFileSync(path.join(ROOT, "index.html"), withCsp);
  console.log(`build.js: wrote index.html (${withCsp.length.toLocaleString()} bytes)`);

  buildServiceWorker(withCsp);
}

module.exports = { ROOT, read, bundleApp };
// Only build when run directly (`node build.js`); tests require this module for
// bundleApp and must not trigger a build as a side effect of `require`.
if (require.main === module) build();
