// Minimal correctness-only lint gate. src/ is TypeScript (ES modules, bundled
// by build.js with esbuild; type-checked by tsc, `npm run typecheck`), so
// ESLint parses it with typescript-eslint and leaves undefined names to tsc.
// Style rules stay off; these catch real, silent bugs.
// Run: npm run lint

import tseslint from "typescript-eslint";

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
    ignores: ["src/vendor/**", "src/bootstrap-head.js", "src/bootstrap-tail.js", "src/**/*.d.ts", "index.html"]
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: { parser: tseslint.parser, ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: Object.assign({}, CORRECTNESS, {
      "@typescript-eslint/no-unused-vars": ["error", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }]
    })
  },
  {
    // The service worker is a classic script with the worker's own globals.
    files: ["src/sw.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script", parserOptions: { ecmaFeatures: { jsx: false } }, globals: {
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
