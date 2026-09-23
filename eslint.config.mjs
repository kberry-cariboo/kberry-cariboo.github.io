// Minimal correctness-only lint gate. src/ is ES modules (bundled by
// build.js with esbuild), so every file declares what it imports and the
// undefined/unused-name rules run on each file directly. They used to run on a
// stitched copy of the whole app (scripts/lint-bundle.js), because the files
// shared one global scope and a per-file pass saw every cross-file name as
// undefined. Style rules stay off; these catch real, silent bugs.
// Run: npm run lint

// True external globals the concatenated app code touches: browser/DOM APIs
// (not covered by ESLint's language built-ins) plus the vendor scripts that
// sit in sibling <script> tags — src/vendor/react-bundle.js (React,
// ReactDOM), src/vendor/mini-recharts.js (Recharts), and
// src/vendor/supabase-client.js (window.supabase, read off `window` below,
// not listed separately). Extend this list, not the rule severity, if a
// legitimate new browser API shows up as "not defined".
const browserGlobals = {
  window: "readonly", document: "readonly", navigator: "readonly",
  location: "readonly", history: "readonly", localStorage: "readonly",
  sessionStorage: "readonly", indexedDB: "readonly", fetch: "readonly", URL: "readonly",
  URLSearchParams: "readonly", Blob: "readonly", File: "readonly",
  FileReader: "readonly", Image: "readonly", CustomEvent: "readonly",
  Event: "readonly", TextEncoder: "readonly", TextDecoder: "readonly",
  crypto: "readonly", PublicKeyCredential: "readonly", console: "readonly",
  Notification: "readonly",
  alert: "readonly", confirm: "readonly", setTimeout: "readonly",
  clearTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly",
  requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
  MutationObserver: "readonly", IntersectionObserver: "readonly",
  ResizeObserver: "readonly", btoa: "readonly", atob: "readonly",
  performance: "readonly", structuredClone: "readonly", getComputedStyle: "readonly",
  queueMicrotask: "readonly", globalThis: "readonly", self: "readonly",
  React: "readonly", ReactDOM: "readonly", Recharts: "readonly",
  // Declared by src/bootstrap-head.js, which is not a module.
  CF_VERSION: "readonly"
};

const CORRECTNESS = {
  "no-dupe-keys": "error",
  "no-dupe-args": "error",
  "no-dupe-else-if": "error",
  "no-duplicate-case": "error",
  "no-unreachable": "error",
  "no-self-assign": "error",
  "no-const-assign": "error",
  "no-setter-return": "error",
  "no-compare-neg-zero": "error",
  "no-cond-assign": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
  // A `catch {}` with nothing in it is how two real bugs hid here for months
  // (a service worker that never registered, and a notification API that
  // throws on Android) — both failed loudly and were swallowed. no-empty does
  // not flag a block containing a comment, so the rule reads as: swallowing an
  // error is fine, but say why.
  "no-empty": ["error", { allowEmptyCatch: false }]
};

export default [
  {
    // A no-`files` ignores block is a global ignore in flat config.
    ignores: ["src/vendor/**", "src/bootstrap-head.js", "src/bootstrap-tail.js", "index.html"]
  },
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: browserGlobals },
    rules: Object.assign({}, CORRECTNESS, {
      "no-undef": "error",
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }]
    })
  },
  {
    // The service worker is a classic script with the worker's own globals.
    files: ["src/sw.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script", globals: {
      self: "readonly", caches: "readonly", fetch: "readonly", Request: "readonly", Response: "readonly",
      URL: "readonly", clients: "readonly", console: "readonly", Promise: "readonly" } },
    rules: Object.assign({}, CORRECTNESS, { "no-undef": "error" })
  },
  {
    files: ["build.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: { require: "readonly", module: "writable", __dirname: "readonly", process: "readonly", console: "readonly" } },
    rules: CORRECTNESS
  }
];
