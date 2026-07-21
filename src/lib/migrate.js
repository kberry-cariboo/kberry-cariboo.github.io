  // Extracted from app-data.js (round-9 AR4 remainder) — pure code motion.
  // Defined here (not format.js) because the schema v8 migration below needs
  // them at module-load time — migrate.js runs before format.js in the
  // concatenation order, and a `const` in a later file isn't hoisted.
  const dollarsToCents = (x) => {
    const n = Number(x);
    return isFinite(n) ? Math.round(n * 100) : 0;
  };
  const centsToDollars = (c) => {
    const n = Number(c);
    return isFinite(n) ? n / 100 : 0;
  };
  // Same schema-v8 dollars->cents upgrade as migrateData below, but for a
  // household payload just loaded from Supabase rather than localStorage —
  // a household member's browser can still be holding an older, un-migrated
  // save (or an even older client saved after this shipped but before that
  // device reloaded), so this runs on every load whose schemaVersion is
  // stale, independent of this device's own local schema version.
  function centsifyHouseholdPayload(d) {
    if (!d) return d;
    const toCents = (v) => typeof v === "number" && isFinite(v) ? dollarsToCents(v) : v;
    const out = __spreadValues({}, d);
    if (Array.isArray(out.entries)) {
      out.entries = out.entries.map((e) => __spreadProps(__spreadValues({}, e), {
        amount: toCents(e.amount),
        monthlyAmounts: Array.isArray(e.monthlyAmounts) ? e.monthlyAmounts.map(toCents) : e.monthlyAmounts
      }));
    }
    if (out.overridesByYr && typeof out.overridesByYr === "object") {
      const nextOvr = {};
      Object.keys(out.overridesByYr).forEach((year) => {
        const yOvr = out.overridesByYr[year] || {};
        nextOvr[year] = {};
        Object.keys(yOvr).forEach((evId) => {
          const o = yOvr[evId] || {};
          nextOvr[year][evId] = o.amount !== void 0 ? __spreadProps(__spreadValues({}, o), { amount: toCents(o.amount) }) : o;
        });
      });
      out.overridesByYr = nextOvr;
    }
    if (Array.isArray(out.yearConfigs)) {
      out.yearConfigs = out.yearConfigs.map((yc) => __spreadProps(__spreadValues({}, yc), { openingBalance: toCents(yc.openingBalance) }));
    }
    if (out.budgetTargets && typeof out.budgetTargets === "object") {
      const nextTargets = {};
      Object.keys(out.budgetTargets).forEach((key) => {
        const cats = out.budgetTargets[key] || {};
        const nextCats = {};
        Object.keys(cats).forEach((cat) => {
          nextCats[cat] = toCents(cats[cat]);
        });
        nextTargets[key] = nextCats;
      });
      out.budgetTargets = nextTargets;
    }
    if (Array.isArray(out.goals)) {
      out.goals = out.goals.map((g) => __spreadProps(__spreadValues({}, g), {
        target: toCents(g.target),
        saved: toCents(g.saved),
        monthly: toCents(g.monthly)
      }));
    }
    if (Array.isArray(out.templates)) {
      out.templates = out.templates.map((t) => __spreadProps(__spreadValues({}, t), {
        amount: toCents(t.amount),
        monthlyAmounts: Array.isArray(t.monthlyAmounts) ? t.monthlyAmounts.map(toCents) : t.monthlyAmounts
      }));
    }
    if (out.alertThreshold !== void 0) out.alertThreshold = toCents(out.alertThreshold);
    if (out.debtData && typeof out.debtData === "object") {
      const toCentsStr = (s) => {
        const n = parseFloat(s);
        return isFinite(n) ? String(dollarsToCents(n)) : s;
      };
      const nextDebt = {};
      Object.keys(out.debtData).forEach((key) => {
        const d = out.debtData[key] || {};
        nextDebt[key] = __spreadProps(__spreadValues({}, d), {
          balance: d.balance ? toCentsStr(d.balance) : d.balance,
          payment: d.payment ? toCentsStr(d.payment) : d.payment
        });
      });
      out.debtData = nextDebt;
    }
    return out;
  }
  const SCHEMA_VERSION = 9;
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
    if (storedVersion < 8) {
      // Money moves from dollar-floats to integer cents everywhere it's
      // stored — entries, overrides, opening balances, budget targets,
      // goals, templates, the low-balance alert threshold — closing the
      // float-drift class of bug properly instead of just rounding after
      // every fold (the earlier AR5 fix). One-time and idempotent, gated on
      // storedVersion like every migration here.
      const toCents = (v) => typeof v === "number" && isFinite(v) ? dollarsToCents(v) : v;
      const entries = readJSON("cf_entries", null);
      if (Array.isArray(entries)) {
        write("cf_entries", entries.map((e) => __spreadProps(__spreadValues({}, e), {
          amount: toCents(e.amount),
          monthlyAmounts: Array.isArray(e.monthlyAmounts) ? e.monthlyAmounts.map(toCents) : e.monthlyAmounts
        })));
      }
      const ovr = readJSON("cf_overrides", null);
      if (ovr && typeof ovr === "object") {
        const nextOvr = {};
        Object.keys(ovr).forEach((year) => {
          const yOvr = ovr[year] || {};
          nextOvr[year] = {};
          Object.keys(yOvr).forEach((evId) => {
            const o = yOvr[evId] || {};
            nextOvr[year][evId] = o.amount !== void 0 ? __spreadProps(__spreadValues({}, o), { amount: toCents(o.amount) }) : o;
          });
        });
        write("cf_overrides", nextOvr);
      }
      const years = readJSON("cf_years", null);
      if (Array.isArray(years)) {
        write("cf_years", years.map((yc) => __spreadProps(__spreadValues({}, yc), { openingBalance: toCents(yc.openingBalance) })));
      }
      const targets = readJSON("cf_budgtargets", null);
      if (targets && typeof targets === "object") {
        const nextTargets = {};
        Object.keys(targets).forEach((key) => {
          const cats = targets[key] || {};
          const nextCats = {};
          Object.keys(cats).forEach((cat) => {
            nextCats[cat] = toCents(cats[cat]);
          });
          nextTargets[key] = nextCats;
        });
        write("cf_budgtargets", nextTargets);
      }
      const goals = readJSON("cf_goals", null);
      if (Array.isArray(goals)) {
        write("cf_goals", goals.map((g) => __spreadProps(__spreadValues({}, g), {
          target: toCents(g.target),
          saved: toCents(g.saved),
          monthly: toCents(g.monthly)
        })));
      }
      const templates = readJSON("cf_templates", null);
      if (Array.isArray(templates)) {
        write("cf_templates", templates.map((t) => __spreadProps(__spreadValues({}, t), {
          amount: toCents(t.amount),
          monthlyAmounts: Array.isArray(t.monthlyAmounts) ? t.monthlyAmounts.map(toCents) : t.monthlyAmounts
        })));
      }
      const thresh = readJSON("cf_alertThresh", null);
      if (typeof thresh === "number" && isFinite(thresh)) write("cf_alertThresh", toCents(thresh));
    }
    if (storedVersion < 9) {
      // Debt tracker balance/payment were left in dollars when the v8
      // migration above moved every other money field to cents — this closes
      // that gap. Rate is a percentage, not money, and is left untouched.
      const toCentsStr = (s) => {
        const n = parseFloat(s);
        return isFinite(n) ? String(dollarsToCents(n)) : s;
      };
      const debt = readJSON("cf_debt_data", null);
      if (debt && typeof debt === "object") {
        const next = {};
        Object.keys(debt).forEach((key) => {
          const d = debt[key] || {};
          next[key] = __spreadProps(__spreadValues({}, d), {
            balance: d.balance ? toCentsStr(d.balance) : d.balance,
            payment: d.payment ? toCentsStr(d.payment) : d.payment
          });
        });
        write("cf_debt_data", next);
      }
    }
    try {
      localStorage.setItem("cf_schema_version", String(SCHEMA_VERSION));
    } catch (e) {
    }
  }
  migrateData();
