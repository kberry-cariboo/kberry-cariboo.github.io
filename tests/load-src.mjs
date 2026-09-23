// Loads app modules for a browser-free test.
//
// The source is ES modules, so a test can no longer glue files together and
// run them with `new Function`, which is how these suites used to load it. This
// bundles the files asked for (and whatever they import) with the same esbuild
// the build uses, then runs the bundle with the test's stand-ins for the
// browser: every name in `globals` (React, localStorage, window, ...) is in
// scope for the bundle exactly as the real ones are in the page.
//
//   const { expandEntries } = loadSrc(['src/lib/dates.js'], { React, localStorage, window });
//
// Anything a module touches while loading and the test does not supply falls
// back to a harmless stand-in (see STUBS), because importing one lib module can
// pull in half the app: the source has always been one mutually-referencing
// scope, and modules keep those references.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const { JSX_OPTIONS } = require('../build.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Callable, indexable, and constructible to any depth — enough for module-level
// `const { X } = Recharts` or `React.createContext(...)` to load quietly.
export const anything = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : anything()),
  apply: () => anything(),
  construct: () => anything(),
});
const STUBS = () => ({
  React: anything(), ReactDOM: anything(), Recharts: anything(),
  window: { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {}, supabase: anything() },
  document: anything(),
  navigator: {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  CF_VERSION: 'test',
});

export function loadSrc(files, globals = {}) {
  const entry = files.map((f) => `export * from ${JSON.stringify(join(ROOT, f))};`).join('\n');
  const res = esbuild.buildSync({
    ...JSX_OPTIONS,
    stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'test-entry.js' },
    bundle: true, format: 'iife', globalName: '__src', write: false, logLevel: 'silent', target: 'es2020',
  });
  const base = STUBS();
  const scope = Object.assign(base, globals);
  // A test's window is usually just what it cares about (matchMedia); layer it
  // over the default so what other modules read while loading is still there.
  if (globals.window) scope.window = Object.assign({}, base.window, STUBS().window, globals.window);
  // A test's own React is often one that throws on any use, to prove the code
  // under test never needs it. Loading can't honour that — importing a lib
  // module brings components along, and they define classes and contexts from
  // React as they load — so loading gets a lenient React, and once loading is
  // done every React.x call goes to the test's. (Hooks destructured at load
  // time keep the lenient versions; the guarantee is for calls made later.)
  if (globals.React) {
    let target = anything();
    scope.React = new Proxy(function () {}, {
      get: (t, k) => target[k],
      apply: (t, self, args) => target(...args),
      construct: (t, args) => new target(...args),
    });
    const names = Object.keys(scope);
    const mod = new Function(...names, res.outputFiles[0].text + '\nreturn __src;')(...names.map((k) => scope[k]));
    target = globals.React;
    return mod;
  }
  const names = Object.keys(scope);
  return new Function(...names, res.outputFiles[0].text + '\nreturn __src;')(...names.map((k) => scope[k]));
}
