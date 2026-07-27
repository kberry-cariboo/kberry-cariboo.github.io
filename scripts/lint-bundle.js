#!/usr/bin/env node
// Writes the same bootstrap-head + APP_MODULES + bootstrap-tail concatenation
// build.js assembles into index.html's <script> to .eslint-bundle.js, so it
// can be linted as the single shared-scope file it actually runs as.
//
// Linting src/*.js individually (as eslint.config.mjs's other block does)
// can't catch a reference to an undefined identifier or a genuinely-unused
// function — every file freely references functions/consts defined in
// sibling files, so per-file no-undef/no-unused-vars would be pure noise
// (every cross-file reference looks "undefined" in isolation). Concatenated
// exactly like the real app, those rules see the real single scope and only
// flag what's actually wrong — this is how a dead function referencing a
// setter that was never defined (setShowAddForm) slipped through before.
"use strict";
const fs = require("fs");
const path = require("path");
const { APP_MODULES, ROOT, read } = require("../build.js");

const bundle =
  read("src/bootstrap-head.js") +
  APP_MODULES.map(read).join("") +
  read("src/bootstrap-tail.js");

fs.writeFileSync(path.join(ROOT, ".eslint-bundle.js"), bundle);
console.log("scripts/lint-bundle.js: wrote .eslint-bundle.js");
