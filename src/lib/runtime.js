  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  // Object spread, as the transpiled source spells it. These were esbuild's
  // down-levelling helpers, which copy property by property through an `in`
  // check and, for some keys, Object.defineProperty — and they sit in the
  // hottest loop in the app: every occurrence of every entry, every year, on
  // every edit. Profiled at 300 entries over three years, they (and the
  // garbage they made) were most of a 190 ms recompute. For the plain data
  // objects this app spreads, Object.assign is the same result natively.
  //
  // The one difference that matters is an own "__proto__" key, which a
  // hand-edited backup file could carry: assigning it would set the target's
  // prototype, where the old helper defined an ordinary property. That case
  // alone keeps the old path.
  var __spreadSlow = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadValues = (a, b) => b != null && __hasOwnProp.call(b, "__proto__") ? __spreadSlow(a, b) : Object.assign(a, b);
  var __spreadProps = (a, b) => b != null && __hasOwnProp.call(b, "__proto__") ? __defProps(a, __getOwnPropDescs(b)) : Object.assign(a, b);
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  const { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef, useContext, createContext } = React;
  // Every new entry/goal/debt-row/clone id goes through this — Date.now() had
  // a real (if small) collision window: two adds in the same millisecond (a
  // fast double-tap, two goal-linked entries created in one save) produced
  // identical ids, which corrupts anything keyed by id (overrides, completed
  // flags, occurrence keys). Declared here (not app-data.js, where the rest of
  // these shared helpers live) because migrate.js's schema v1 backfill calls
  // this at module-load time, before app-data.js's declarations would exist —
  // runtime.js is the first file in build.js's concatenation order.
  function genId() {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {
      // Falls through to the Math.random id path below on older browsers.
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }
  // localStorage/sessionStorage that never throw. Both can throw outright — in
  // a private window, with storage partitioned or full — and the app wrapped
  // each call in its own try/catch with its own copy of the same comment,
  // twenty-odd times. Anything that must tell the user a write failed uses
  // useLS (notifyStorageWriteFailure) instead; these are the calls where a
  // failure is genuinely ignorable. get returns null on any failure.
  const safeStorage = {
    area(which) {
      try {
        return which === "session" ? window.sessionStorage : window.localStorage;
      } catch (e) {
        return null;
      }
    },
    get(key, which) {
      try {
        const a = safeStorage.area(which);
        return a ? a.getItem(key) : null;
      } catch (e) {
        return null;
      }
    },
    set(key, value, which) {
      try {
        const a = safeStorage.area(which);
        if (a) a.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key, which) {
      try {
        const a = safeStorage.area(which);
        if (a) a.removeItem(key);
      } catch (e) {
        // Nothing to undo.
      }
    }
  };
