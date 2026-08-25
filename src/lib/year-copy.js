  // ── Rolling one budget year forward into the next ────────────────────────
  //
  // Three doors lead here — Settings "+ Add <year>", Settings "Copy → <year>",
  // and the "+ Add <year>" pill at the end of the Budget month picker — and
  // they used to do three different amounts of work. The inline pill copied
  // budget targets and nothing else, so rolling into next year from the grid
  // in December (the obvious place to do it) produced a year with none of the
  // one-time entries, none of the carried-over occurrence edits and none of
  // the amount pattern, while the same action in Settings produced all four.
  // Nothing told the user which door they had used. So the work lives here
  // now, once, and the three callers differ only in what they say afterwards.
  //
  // Everything below is a pure function of the data handed in: planYearRollforward
  // returns a patch, applyYearRollforward writes it through the setters. That
  // split is what lets tests/year-copy.mjs drive every scenario without a
  // browser, and what keeps the callers' functional setState updates intact.
  // One-time (non-repeating) entries exist only in the year of their startDate,
  // so carrying them into another year means cloning them onto the same
  // month/day, with any per-occurrence edit made in the source year (moved
  // date, changed amount/description/notes) baked in so the copy reflects
  // what the user actually sees, not the original saved values.
  //
  // Copies can also go stale: a copy made before an edit (or by an older app
  // version that ignored edits) keeps the outdated date/amount forever, and a
  // date-only dedupe would then re-clone the entry as a duplicate. So this is
  // a sync, not a blind copy: source and target singles are paired by
  // desc + type + category (positionally, in date order, when there are
  // several of the same name). Paired copies the user hasn't edited in the
  // target year are UPDATED to the source's effective date/amount/notes;
  // paired copies with their own target-year edits are left entirely alone;
  // unpaired source entries are cloned. Returns { clones, updates } where
  // updates is [{ id, startDate, amount, notes }] to apply to existing
  // entries. Re-running converges: a second pass changes nothing.
  // Pairing a source entry with its copy uses provenance first: every clone is
  // stamped with copiedFrom = the source entry's id, making later syncs exact.
  // Copies that predate the stamp fall back to matching by desc + type +
  // category + month/day (the source's effective or original date, so both
  // accurate and stale legacy copies are found) — and get stamped on the way,
  // so a copy the user renamed or moved to an unrelated date simply stops
  // being treated as a copy. A target-year entry that pairs with nothing —
  // e.g. one the user added themselves — is never touched or re-dated.
  //
  // Updates are per-field: a field is only changed when it still holds the
  // source's original value (a stale copy), never when the user has set it to
  // something of their own — so editing a copy through the entry form keeps
  // that edit, and a copy with its own occurrence edit is skipped entirely.
  function syncSingleEntriesToYear(entries, fromYear, toYear, fromOvs = {}, toOvs = {}, deletedCopyIds = {}) {
    const srcs = [];
    const tgts = [];
    entries.forEach((e) => {
      if (e.repeats || !e.startDate) return;
      if (e.startDate.startsWith(`${fromYear}-`)) {
        const [, mm, dd] = e.startDate.split("-").map(Number);
        const ov = fromOvs[`${e.id}-${fromYear}-${mm - 1}-${dd}`] || {};
        const effM = ov.month !== void 0 ? Math.min(Math.max(0, ov.month), 11) : mm - 1;
        const effD = Math.min(Math.max(1, ov.day !== void 0 ? ov.day : dd), daysInMonth(effM, toYear));
        srcs.push({
          e,
          desc: ov.desc !== void 0 ? ov.desc : e.desc,
          amount: ov.amount !== void 0 ? ov.amount : e.amount,
          notes: ov.notes !== void 0 ? ov.notes : e.notes || "",
          effMD: `${String(effM + 1).padStart(2, "0")}-${String(effD).padStart(2, "0")}`,
          rawMD: e.startDate.slice(5)
        });
      } else if (e.startDate.startsWith(`${toYear}-`)) {
        const [, tm, td] = e.startDate.split("-").map(Number);
        tgts.push({ e, edited: !!toOvs[`${e.id}-${toYear}-${tm - 1}-${td}`] });
      }
    });
    const claimed = new Set();
    const pairOf = {};
    const tgtByProv = {};
    tgts.forEach((t) => {
      if (t.e.copiedFrom !== void 0 && tgtByProv[t.e.copiedFrom] === void 0) tgtByProv[t.e.copiedFrom] = t;
    });
    srcs.forEach((s) => {
      const t = tgtByProv[s.e.id];
      if (t && !claimed.has(t.e.id)) {
        claimed.add(t.e.id);
        pairOf[s.e.id] = t;
      }
    });
    // Legacy fallback: unstamped copies matched by identity + date (effective
    // date first so accurate copies win, then the raw date to catch stale ones).
    ["effMD", "rawMD"].forEach((dateField) => {
      srcs.forEach((s) => {
        if (pairOf[s.e.id]) return;
        const t = tgts.find(
          (t2) => !claimed.has(t2.e.id) && t2.e.copiedFrom === void 0 && t2.e.type === s.e.type && t2.e.category === s.e.category && (t2.e.desc === s.desc || t2.e.desc === s.e.desc) && t2.e.startDate.slice(5) === s[dateField]
        );
        if (t) {
          claimed.add(t.e.id);
          pairOf[s.e.id] = t;
        }
      });
    });
    const clones = [];
    const updates = [];
    srcs.forEach((s) => {
      const t = pairOf[s.e.id];
      if (!t) {
        // The user deliberately deleted a previous copy of this source entry —
        // don't resurrect it just because it's "missing" from the target year.
        if (deletedCopyIds[s.e.id]) return;
        clones.push(__spreadProps(__spreadValues({}, s.e), { id: genId(), desc: s.desc, amount: s.amount, notes: s.notes, startDate: `${toYear}-${s.effMD}`, copiedFrom: s.e.id }));
        return;
      }
      // The user edited this copy's occurrence in the target year — theirs wins.
      if (t.edited) return;
      const desired = { startDate: `${toYear}-${s.effMD}`, amount: s.amount, notes: s.notes };
      const original = { startDate: `${toYear}-${s.rawMD}`, amount: s.e.amount, notes: s.e.notes || "" };
      const patch = {};
      ["startDate", "amount", "notes"].forEach((f) => {
        const cur = f === "notes" ? t.e.notes || "" : t.e[f];
        if (cur !== desired[f] && cur === original[f]) patch[f] = desired[f];
      });
      if (t.e.copiedFrom !== s.e.id) patch.copiedFrom = s.e.id;
      if (Object.keys(patch).length) updates.push({ id: t.e.id, patch });
    });
    return { clones, updates };
  }
  // Per-occurrence edits (overridesByYr) are keyed by entry + calendar date,
  // so a modified recurring occurrence silently reverts to its base values in
  // a newly added year. This maps the source year's overrides onto target-year
  // occurrences that fall on the same month/day (monthly, semi-monthly and
  // yearly recurrences; daily/weekly occurrences land on different dates so
  // nothing matches and they're skipped). Only user-facing edit fields are
  // carried — receipts and edit history stay in their own year — and existing
  // target-year overrides are never touched.
  // Overrides the user creates through the occurrence editor are stamped with
  // _savedAt; overrides written by this sync are not. That stamp is the
  // ownership marker: user-stamped target overrides are never touched, while
  // sync-written ones may be refreshed on a later run so source-year edits
  // made after the target year was created still flow forward.
  function copyOccurrenceOverridesToYear(entries, fromOvs, fromYear, toYear, existingToOvs = {}) {
    const valid = new Set(expandEntries(entries, toYear, {}).map((ev) => ev.id));
    const added = {};
    Object.keys(fromOvs || {}).forEach((key) => {
      const m = key.match(new RegExp(`^(.+)-${fromYear}-(\\d+)-(\\d+)$`));
      if (!m) return;
      const newKey = `${m[1]}-${toYear}-${m[2]}-${m[3]}`;
      if (!valid.has(newKey)) return;
      const existing = existingToOvs[newKey];
      if (existing && existing._savedAt !== void 0) return;
      const copy = {};
      let changed = false;
      ["desc", "amount", "notes", "month", "day"].forEach((f) => {
        if (fromOvs[key][f] === void 0) return;
        copy[f] = fromOvs[key][f];
        if (!existing || existing[f] !== copy[f]) changed = true;
      });
      if (!Object.keys(copy).length || !changed) return;
      added[newKey] = existing ? __spreadValues(__spreadValues({}, existing), copy) : copy;
    });
    return added;
  }
  // Recurring amounts often vary WITHIN a year (net pay starts lower in
  // January and rises once CPP/EI max out, then resets the next January), so
  // no single amount can represent an entry. Rule for carrying amounts into a
  // new year: mirror the source year's amount profile occurrence-by-occurrence
  // — the target year's Nth occurrence gets the effective amount (base +
  // occurrence edits) of the source year's Nth occurrence, and the dates still
  // come purely from the recurrence pattern. If the target year has more
  // occurrences (e.g. 27 biweekly paydays vs 26), the extras repeat the final
  // source amount. Overrides are only written where the mirrored amount
  // differs from what the occurrence would show anyway; user-made overrides
  // in the target year (stamped _savedAt) are never touched.
  function mirrorRecurringAmountsToYear(entries, fromOvs, fromYear, toYear, existingToOvs = {}, plannedAdds = {}) {
    const recurring = entries.filter((e) => e.repeats);
    if (!recurring.length) return {};
    // Nth-occurrence alignment only holds if both years expand to the same
    // shape, and expandEntries drops a skipped occurrence entirely. Skipping
    // one month in the source year therefore used to shift every later month's
    // amount onto its neighbour: skip 2026's March and 2027's March mirrored
    // 2026's April, April mirrored May, and so on to the end of the year,
    // silently, in a whole year's budget. Strip `skipped` for this pass only,
    // so a skipped month still occupies its slot (carrying whatever amount it
    // was planned at) and everything after it stays lined up. The skip itself
    // is not carried forward — copyOccurrenceOverridesToYear deliberately
    // leaves it behind, since a month skipped once is not skipped for ever.
    const srcOvs = {};
    Object.keys(fromOvs || {}).forEach((k) => {
      const ov = fromOvs[k];
      if (ov && ov.skipped) {
        const rest = __spreadValues({}, ov);
        delete rest.skipped;
        srcOvs[k] = rest;
      } else {
        srcOvs[k] = ov;
      }
    });
    // Anchored on the calendar month, not on a running count across the year.
    // Counting straight through assumes both years expand to the same shape,
    // and they routinely don't: an entry added part-way through the source
    // year has fewer occurrences in it than in the next full year, so a
    // payroll entry created in March 2026 had 2027's January mirroring 2026's
    // March, February mirroring April, and every month after that two months
    // out of phase — which lands the January reset of a CPP/EI ramp in the
    // middle of spring. Biweekly dates never repeat year to year, so some
    // index is unavoidable; making it an index *within the month* keeps every
    // occurrence in the part of the year it belongs to, and reduces to exactly
    // the old behaviour when the two years do have the same shape.
    const srcByMonth = {};
    expandEntries(recurring, fromYear, srcOvs).forEach((ev) => {
      const byMonth = srcByMonth[ev.entryId] = srcByMonth[ev.entryId] || {};
      (byMonth[ev.month] = byMonth[ev.month] || []).push(ev.amount);
    });
    // The k-th occurrence of `month`, or the nearest thing to it: a month with
    // fewer occurrences than the target repeats its last, and a month with
    // none at all (the target year starts before the entry did, or runs past
    // its end) borrows the closest month that has one.
    const srcAmountFor = (byMonth, month, k) => {
      const inMonth = byMonth[month];
      if (inMonth && inMonth.length) return inMonth[Math.min(k, inMonth.length - 1)];
      for (let m = month - 1; m >= 0; m--) if (byMonth[m] && byMonth[m].length) return byMonth[m][byMonth[m].length - 1];
      for (let m = month + 1; m <= 11; m++) if (byMonth[m] && byMonth[m].length) return byMonth[m][0];
      return void 0;
    };
    const added = {};
    const idxByEntryMonth = {};
    expandEntries(recurring, toYear, {}).forEach((ev) => {
      const byMonth = srcByMonth[ev.entryId];
      if (!byMonth) return;
      const key = `${ev.entryId}:${ev.month}`;
      const i = idxByEntryMonth[key] = (idxByEntryMonth[key] || 0) + 1;
      const srcAmt = srcAmountFor(byMonth, ev.month, i - 1);
      if (srcAmt === void 0) return;
      if (plannedAdds[ev.id]) return;
      const existing = existingToOvs[ev.id];
      if (existing) {
        // _savedAt marks a user-made override — protected. Sync-written ones
        // may be refreshed so later source-year edits still mirror forward.
        if (existing._savedAt !== void 0 || existing.amount === srcAmt) return;
        added[ev.id] = __spreadProps(__spreadValues({}, existing), { amount: srcAmt });
      } else {
        if (srcAmt === ev.amount) return;
        added[ev.id] = { amount: srcAmt };
      }
    });
    return added;
  }
  // Computes everything rolling `fromYear` into `toYear` should change, without
  // touching state. Returns a patch plus the counts each caller words its own
  // message from. `changed` is false when the target year already matches, which
  // is the "nothing to do" case the Copy button reports rather than claiming a
  // successful copy.
  function planYearRollforward({ entries, overridesByYr = {}, budgetTargets = {}, fromYear, toYear, deletedCopyIds = {} }) {
    // Budget targets: fill gaps only. A month already set in the target year is
    // the user's number and is never replaced by the source year's.
    const targetAdds = {};
    let targets = 0;
    for (let m = 0; m < 12; m++) {
      const src = budgetTargets[`${fromYear}:${m}`];
      if (!src || !Object.keys(src).length) continue;
      const existing = budgetTargets[`${toYear}:${m}`] || {};
      const merged = __spreadValues({}, existing);
      let changed = false;
      Object.keys(src).forEach((cat) => {
        if (merged[cat] === void 0) {
          merged[cat] = src[cat];
          targets++;
          changed = true;
        }
      });
      if (changed) targetAdds[`${toYear}:${m}`] = merged;
    }
    const fromOvs = overridesByYr[fromYear] || {};
    const toOvs = overridesByYr[toYear] || {};
    const { clones, updates } = syncSingleEntriesToYear(entries, fromYear, toYear, fromOvs, toOvs, deletedCopyIds);
    const overrideAdds = copyOccurrenceOverridesToYear(entries, fromOvs, fromYear, toYear, toOvs);
    const amountAdds = mirrorRecurringAmountsToYear(entries, fromOvs, fromYear, toYear, toOvs, overrideAdds);
    // A copiedFrom-only update re-stamps provenance on a legacy copy. Real work
    // as far as convergence goes, but nothing the user can see, so it is counted
    // separately and left out of the message.
    const visibleUpdates = updates.filter((u) => u.patch.startDate !== void 0 || u.patch.amount !== void 0 || u.patch.notes !== void 0).length;
    const counts = {
      targets,
      clones: clones.length,
      updates: visibleUpdates,
      overrides: Object.keys(overrideAdds).length,
      amounts: Object.keys(amountAdds).length
    };
    return {
      targetAdds,
      clones,
      updates,
      overrideAdds,
      amountAdds,
      counts,
      changed: targets > 0 || clones.length > 0 || updates.length > 0 || counts.overrides > 0 || counts.amounts > 0
    };
  }
  // Writes a plan through the setters. Functional updates throughout: the plan
  // was computed from a render's props, but a household sync can land between
  // the click and the write, and merging into `prev` keeps whatever arrived.
  function applyYearRollforward(plan, toYear, { setEntries, setOverridesByYr, setBudgetTargets }) {
    if (plan.clones.length || plan.updates.length) {
      setEntries((prev) => [
        ...prev.map((e) => {
          const u = plan.updates.find((x) => x.id === e.id);
          return u ? __spreadValues(__spreadValues({}, e), u.patch) : e;
        }),
        ...plan.clones
      ]);
    }
    const ovAdds = __spreadValues(__spreadValues({}, plan.overrideAdds), plan.amountAdds);
    if (Object.keys(ovAdds).length) {
      setOverridesByYr((prev) => __spreadProps(__spreadValues({}, prev), {
        [toYear]: __spreadValues(__spreadValues({}, prev[toYear] || {}), ovAdds)
      }));
    }
    if (Object.keys(plan.targetAdds).length) {
      setBudgetTargets((prev) => __spreadValues(__spreadValues({}, prev), plan.targetAdds));
    }
  }
  // The shared sentence fragments, so all three doors describe the same work the
  // same way.
  function yearRollforwardParts(counts, fromYear) {
    const parts = [];
    if (counts.targets) parts.push(`${counts.targets} budget target${counts.targets === 1 ? "" : "s"} added`);
    if (counts.clones) parts.push(`${counts.clones} one-time entr${counts.clones === 1 ? "y" : "ies"} copied`);
    if (counts.updates) parts.push(`${counts.updates} one-time entr${counts.updates === 1 ? "y" : "ies"} updated to match ${fromYear}`);
    if (counts.overrides) parts.push(`${counts.overrides} modified occurrence${counts.overrides === 1 ? "" : "s"} carried over`);
    if (counts.amounts) parts.push(`${fromYear}'s amount pattern mirrored onto ${counts.amounts} occurrence${counts.amounts === 1 ? "" : "s"}`);
    return parts;
  }
