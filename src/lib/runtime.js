  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
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
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
