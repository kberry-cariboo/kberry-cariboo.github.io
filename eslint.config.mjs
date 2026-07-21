// Minimal correctness-only lint gate for the concatenated-module source.
// The src/ files are esbuild-style output stitched together by build.js, so
// style rules and no-undef would be pure noise — this config enables only the
// rules that catch real, silent bugs in hand-edited compiled code (a duplicate
// object key once disabled a touch target with no error anywhere).
// Run: npx --yes eslint@9 "src/lib/**/*.js" "src/components/**/*.js" src/App.js build.js
export default [
  {
    ignores: ["src/vendor/**", "src/bootstrap-head.js", "src/bootstrap-tail.js", "index.html"]
  },
  {
    files: ["src/**/*.js", "build.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script" },
    rules: {
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
      "valid-typeof": "error"
    }
  }
];
