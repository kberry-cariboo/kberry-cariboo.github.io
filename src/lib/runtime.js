  // The React hooks every component uses, taken once from the vendored React
  // global, plus the few helpers everything else leans on.
  export const { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef, useContext, createContext } = React;
  // Every new entry/goal/debt-row/clone id goes through this — Date.now() had
  // a real (if small) collision window: two adds in the same millisecond (a
  // fast double-tap, two goal-linked entries created in one save) produced
  // identical ids, which corrupts anything keyed by id (overrides, completed
  // flags, occurrence keys). It lives here rather than in app-data.js because
  // migrate.js's schema v1 backfill calls it at module-load time, and this
  // module has no imports of its own to wait on.
  export function genId() {
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
  export const safeStorage = {
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
