  // A description short enough for a log line, without cutting a word in half
  // when it already fits.
  const logDesc = (d) => {
    const t = String(d == null ? "" : d).trim() || "Entry";
    return t.length > 40 ? t.slice(0, 39) + "\u2026" : t;
  };
  // Everything that changes the budget from the main screens: adding and
  // editing entries (split at the current month), single-date overrides,
  // marking paid, accepting a drift fix, rolling into next year, and deleting
  // with undo. Each logs to the activity feed. Moved out of App as is.
  function useBudgetActions({ entries, setEntries, overridesByYr, setOverridesByYr, setCompleted, setGoals, deletedCopyIds, setDeletedCopyIds, budgetTargets, setBudgetTargets, yearConfigs, setYearConfigs, activeYear, setActiveYear, setBudgetMonth, sessionUser, logActivity, pushUndo }) {
    // Deleting an entry, expressed in those terms. The copy-provenance
    // bookkeeping is part of the delete (so a deleted copy doesn't come back
    // on the next year roll-forward) and part of the undo, so both live here
    // rather than at the two call sites.
    const pushUndoEntryDelete = useCallback((e) => {
      logActivity("entry", `Deleted ${logDesc(e.desc)} \u2014 ${fmt(signedAmount(e), true)}`);
      if (e.copiedFrom !== void 0) setDeletedCopyIds((prev) => __spreadProps(__spreadValues({}, prev), { [e.copiedFrom]: true }));
      const shortDesc = String(e.desc || "Entry").slice(0, 30) + (String(e.desc || "").length > 30 ? "\u2026" : "");
      pushUndo(`"${shortDesc}" deleted`, () => {
        setEntries((prev) => [...prev, e]);
        if (e.copiedFrom !== void 0) setDeletedCopyIds((prev) => {
          if (!(e.copiedFrom in prev)) return prev;
          const next = __spreadValues({}, prev);
          delete next[e.copiedFrom];
          return next;
        });
      });
    }, [pushUndo, setDeletedCopyIds, setEntries, logActivity]);
    const addEntry = (data) => {
      // Stamped with the member who added it, and with nothing when no one is
      // signed in. It used to fall back to the number 1 — not anybody's id —
      // and the dashboard's personal view, which keeps entries that are yours
      // or unowned, then hid every entry added before signing in.
      const entry = __spreadValues(__spreadValues({}, data), sessionUser && sessionUser.id ? { id: genId(), userId: sessionUser.id } : { id: genId() });
      setEntries((prev) => [...prev, entry]);
      // Adding an expense used to raise its category's budget target, in
      // every month of every configured year, by what the entry schedules —
      // without a word. The envelope then compared the plan with a target
      // copied from the plan, so nearly every one read "Fully spent" and
      // could never say anything. Targets change when someone sets them:
      // Envelopes offers "Use the plan as targets" for exactly this.
      logActivity("entry", `Added ${logDesc(entry.desc)} \u2014 ${fmt(signedAmount(entry), true)}`);
      return entry;
    };
    // Single save path for entry edits: recurring entries with history are
    // split at the current month (past occurrences keep their old values) and
    // occurrence-keyed data from the split onward follows the new segment.
    const saveEntryEdit = (editedId, data) => {
      const res = splitEntryEditFromCurrentMonth(entries, editedId, data);
      setEntries(res.entries);
      // Name what changed, not just that something did — "Rent edited" is the
      // log line people complain about. The amount is the one people notice.
      const before = entries.find((e) => e.id === editedId);
      const renamed = before && before.desc !== data.desc;
      const repriced = before && before.amount !== data.amount;
      logActivity("entry", `Edited ${logDesc(before ? before.desc : data.desc)}` + (renamed ? ` \u2014 renamed to ${logDesc(data.desc)}` : "") + (repriced ? ` \u2014 ${fmt(before.amount)} \u2192 ${fmt(data.amount)}` : ""));
      if (res.newId) {
        setOverridesByYr((prev) => {
          const next = {};
          Object.keys(prev).forEach((y) => {
            next[y] = remapOccurrenceKeys(prev[y], editedId, res.newId, res.splitDate);
          });
          return next;
        });
        setCompleted((prev) => remapOccurrenceKeys(prev, editedId, res.newId, res.splitDate));
        setGoals((prev) => prev.map((g) => g.entryId === editedId ? __spreadProps(__spreadValues({}, g), { entryId: res.newId }) : g));
      }
    };
    // Accepting a drifted-bill suggestion is an ordinary entry edit, and it
    // goes through the same path as one: splitEntryEditFromCurrentMonth means
    // the new amount applies from this month forward, so the months already
    // behind you keep what they actually cost. Rewriting those would destroy
    // the very actuals the suggestion was read from.
    //
    // No undo entry, deliberately: entry edits are not on the undo stack
    // anywhere else in the app, and the occurrence remapping a split can do
    // is not something a one-line revert can put back honestly.
    const applyDriftFix = (d) => {
      const before = entries.find((e) => e.id === d.entryId);
      if (!before || !d || !Number.isFinite(d.suggested)) return;
      saveEntryEdit(d.entryId, __spreadProps(__spreadValues({}, before), { amount: d.suggested }));
      toast(`${logDesc(before.desc)} updated to ${fmt(d.suggested)} from this month on.`);
    };
    const setOverride = (eventId, patch) => {
      // A single date changed. The Audit page has always shown these; the feed
      // shows them alongside everything else, which is how anyone finds out
      // that "the rent looks wrong" was somebody moving one month's payment.
      const parts = String(eventId).split("-");
      const src = entries.find((e) => String(e.id) === parts[0]);
      const when = parts.length >= 3 ? `${MONTHS[parseInt(parts[parts.length - 2], 10)] || "?"} ${parts[parts.length - 1]}` : "";
      logActivity("override", (patch && patch.skipped ? "Skipped " : "Changed ") + logDesc(src ? src.desc : "an occurrence") + (when ? ` on ${when}` : "") + (patch && patch.amount !== void 0 ? ` \u2014 ${fmt(patch.amount)}` : ""));
      setOverridesByYr((prev) => {
        const yOvs = __spreadValues({}, prev[activeYear] || {});
        const existing = yOvs[eventId] || {};
        const history = [...existing._history || [], { ts: (/* @__PURE__ */ new Date()).toISOString(), by: existing._by, prev: __spreadValues({}, existing) }].slice(-10);
        // Who made this edit, so a shared budget can answer "who moved the
        // rent?". The id is stamped rather than the name: names are editable
        // in Settings, and a stored copy would go stale the moment someone
        // corrected theirs. Every reader resolves it against the member list.
        yOvs[eventId] = __spreadProps(__spreadValues(__spreadValues({}, existing), patch), { _savedAt: (/* @__PURE__ */ new Date()).toISOString(), _by: (sessionUser == null ? void 0 : sessionUser.id) || void 0, _history: history });
        return __spreadProps(__spreadValues({}, prev), { [activeYear]: yOvs });
      });
    };
    const clearOverride = (eventId) => {
      const parts = String(eventId).split("-");
      const src = entries.find((e) => String(e.id) === parts[0]);
      const when = parts.length >= 3 ? `${MONTHS[parseInt(parts[parts.length - 2], 10)] || "?"} ${parts[parts.length - 1]}` : "";
      logActivity("override", `Reverted ${logDesc(src ? src.desc : "an occurrence")}${when ? ` on ${when}` : ""} to its usual value`);
      setOverridesByYr((prev) => {
        const yOvs = __spreadValues({}, prev[activeYear] || {});
        delete yOvs[eventId];
        return __spreadProps(__spreadValues({}, prev), { [activeYear]: yOvs });
      });
    };
    const markOccurrencesPaid = (occIds) => {
      if (!Array.isArray(occIds) || !occIds.length) return;
      setCompleted((prev) => {
        const next = __spreadValues({}, prev);
        occIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
    };
    const toggleComplete = (occId) => {
      setCompleted((prev) => {
        const next = __spreadValues({}, prev);
        if (next[occId]) delete next[occId];
        else next[occId] = true;
        return next;
      });
    };
    const latestYear = yearConfigs.length ? Math.max(...yearConfigs.map((yc) => yc.year)) : activeYear;
    // The "+ Add <year>" pill at the end of the Budget month picker. It used to
    // copy budget targets and stop there, so rolling into next year from the
    // grid in December — the obvious place to do it — silently produced a
    // thinner year than the identically-named button in Settings: no one-time
    // entries, no carried-over occurrence edits, no amount pattern. Same
    // routine for both doors now (src/lib/year-copy.js); only the wording
    // differs, and here it has to fit in a toast.
    const addNextYearInline = () => {
      const y = latestYear + 1;
      if (yearConfigs.find((yc) => yc.year === y)) return;
      const plan = planYearRollforward({ entries, overridesByYr, budgetTargets, fromYear: latestYear, toYear: y, deletedCopyIds });
      applyYearRollforward(plan, y, { setEntries, setOverridesByYr, setBudgetTargets });
      setYearConfigs((prev) => [...prev, { year: y, openingBalance: 0 }].sort((a, b) => a.year - b.year));
      setActiveYear(y);
      setBudgetMonth(0);
      const parts = yearRollforwardParts(plan.counts, latestYear);
      toast(parts.length ? `Year ${y} added — ${parts.join(", ")}.` : `Year ${y} added — recurring entries carry forward automatically.`);
    };
  return { pushUndoEntryDelete, addEntry, saveEntryEdit, applyDriftFix, setOverride, clearOverride, markOccurrencesPaid, toggleComplete, latestYear, addNextYearInline };
  }
