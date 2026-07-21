  // Extracted from app-data.js (round-9 AR4 remainder) — pure code motion.
  const SCHEMA_VERSION = 7;
  function migrateData() {
    let storedVersion = 0;
    try {
      storedVersion = parseInt(localStorage.getItem("cf_schema_version") || "0");
    } catch (e) {
    }
    if (storedVersion >= SCHEMA_VERSION) return;
    // Fresh install: nothing to migrate — just stamp the schema version.
    // Running the steps anyway persists empty arrays (cf_categories = []),
    // which shadows the useLS defaults forever: a new user would get an empty
    // category list and couldn't fill the entry form's required Category field.
    let isFresh = false;
    try {
      isFresh = storedVersion === 0 && localStorage.getItem("cf_entries") == null && localStorage.getItem("cf_categories") == null;
    } catch (e) {
    }
    if (isFresh) {
      try {
        localStorage.setItem("cf_schema_version", String(SCHEMA_VERSION));
      } catch (e) {
      }
      return;
    }
    const readJSON = (key, fallback) => {
      try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
      } catch (e) {
        return fallback;
      }
    };
    const write = (key, val) => {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
      }
    };
    if (storedVersion < 1) {
      const entries = readJSON("cf_entries", null);
      if (Array.isArray(entries)) {
        let uid = Date.now();
        const fixed = entries.map((e) => ({
          id: e.id != null ? e.id : ++uid,
          desc: typeof e.desc === "string" ? e.desc : "Untitled",
          type: e.type === "income" ? "income" : "expense",
          amount: isFinite(Number(e.amount)) ? Math.abs(Number(e.amount)) : 0,
          startDate: typeof e.startDate === "string" && e.startDate ? e.startDate : localDateStr(/* @__PURE__ */ new Date()),
          repeats: !!e.repeats,
          recurEvery: parseInt(e.recurEvery) > 0 ? parseInt(e.recurEvery) : 1,
          recurUnit: ["day", "week", "month", "year", "semimonth"].includes(e.recurUnit) ? e.recurUnit : "month",
          recurDays: Array.isArray(e.recurDays) ? e.recurDays : [],
          recurEnd: typeof e.recurEnd === "string" ? e.recurEnd : "",
          category: typeof e.category === "string" && e.category ? e.category : "Uncategorized",
          notes: typeof e.notes === "string" ? e.notes : "",
          monthlyAmounts: e.monthlyAmounts != null ? e.monthlyAmounts : null
        }));
        write("cf_entries", fixed);
      }
    }
    if (storedVersion < 2) {
      const entries = readJSON("cf_entries", []);
      const cats = readJSON("cf_categories", null);
      if (Array.isArray(entries) && (Array.isArray(cats) || entries.length > 0)) {
        const used = entries.map((e) => e.category).filter(Boolean);
        const merged = [.../* @__PURE__ */ new Set([...cats || [], ...used])].sort((a, b) => a.localeCompare(b));
        // never persist an empty list over the useLS default
        if (merged.length > 0) write("cf_categories", merged);
      }
    }
    if (storedVersion < 3) {
      const entries = readJSON("cf_entries", []);
      if (Array.isArray(entries)) {
        const fixed = entries.map((e) => __spreadProps(__spreadValues({}, e), {
          monthlyAmounts: e.monthlyAmounts != null ? e.monthlyAmounts : null
        }));
        write("cf_entries", fixed);
      }
      const ovr = readJSON("cf_overrides", {});
      if (ovr && typeof ovr === "object") {
        const cleaned = {};
        Object.keys(ovr).forEach((year) => {
          cleaned[year] = {};
          const yearOvr = ovr[year] || {};
          Object.keys(yearOvr).forEach((evId) => {
            var _a;
            const o = yearOvr[evId] || {};
            cleaned[year][evId] = {
              amount: isFinite(Number(o.amount)) ? Number(o.amount) : void 0,
              notes: typeof o.notes === "string" ? o.notes : void 0,
              _savedAt: (_a = o._savedAt) != null ? _a : null,
              _history: Array.isArray(o._history) ? o._history : []
            };
            Object.keys(cleaned[year][evId]).forEach((k) => {
              if (cleaned[year][evId][k] === void 0) delete cleaned[year][evId][k];
            });
          });
        });
        write("cf_overrides", cleaned);
      }
    }
    if (storedVersion < 4) {
      try {
        // The live key is the historically typo'd "cf_budgtargets"; rescue any
        // data stored under the correctly-spelled key without clobbering the
        // live key if it already has data.
        const correct = localStorage.getItem("cf_budgettargets");
        const typo = localStorage.getItem("cf_budgtargets");
        if (correct && !typo) {
          localStorage.setItem("cf_budgtargets", correct);
        }
        if (correct) localStorage.removeItem("cf_budgettargets");
        const targets = readJSON("cf_budgtargets", null);
        if (targets && typeof targets !== "object") {
          write("cf_budgtargets", {});
        }
      } catch (e) {
      }
    }
    if (storedVersion < 6) {
      // GitHub Gist sync was removed — clear its stored credentials/state.
      try {
        localStorage.removeItem("cf_gist_token");
        localStorage.removeItem("cf_gist_id");
        localStorage.removeItem("cf_last_snapshot");
      } catch (e) {
      }
    }
    if (storedVersion < 7) {
      // Receipts are per-occurrence only now: move any entry-level attachment
      // onto the entry's start-date occurrence so the image is kept.
      const entries = readJSON("cf_entries", null);
      if (Array.isArray(entries) && entries.some((e) => e && e.attachment)) {
        const ovr = readJSON("cf_overrides", {});
        const res = moveEntryAttachmentsToOverrides(entries, ovr && typeof ovr === "object" ? ovr : {});
        write("cf_entries", res.entries);
        write("cf_overrides", res.overridesByYr);
      }
    }
    try {
      localStorage.setItem("cf_schema_version", String(SCHEMA_VERSION));
    } catch (e) {
    }
  }
  migrateData();
