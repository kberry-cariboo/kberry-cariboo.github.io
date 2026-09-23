import { genId } from "./runtime.js";
import { daysInMonth, localDateStr, parseDate } from "./dates.js";
  // Goals that come round again.
  //
  // A savings goal is a one-shot: a target, a date, and a monthly figure that
  // gets you there. That is the right shape for a roof or a holiday, and the
  // wrong shape for the obligations people actually budget for year after
  // year — insurance in August, property tax quarterly, the vehicle
  // inspection. Those are sinking funds: you save into them, you spend them,
  // and then you start again.
  //
  // The app could already express one cycle of that. What it could not do was
  // the "start again" — the target date passes, the linked contribution entry
  // ends with it, and the whole thing has to be recreated by hand at exactly
  // the moment nobody is thinking about next year.
  //
  // So a goal can repeat, and rolling it is a plan-then-apply pair, the same
  // shape as the year rollforward in year-copy.js and for the same reason: it
  // reaches several stores at once, it has to be safe to run twice, and it
  // runs unattended.
  //
  // Money is integer cents. Nothing here reads the clock — the caller says
  // what day it is.

  // Advance a YYYY-MM-DD by N months, clamping into short months so 31 August
  // plus six months is the last day of February rather than spilling into
  // March.
  export function addMonthsClamped(dateStr, months) {
    const d = parseDate(dateStr);
    if (!d || !Number.isFinite(months)) return "";
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    const target = new Date(y, m + months, 1);
    const dim = daysInMonth(target.getMonth(), target.getFullYear());
    return localDateStr(new Date(target.getFullYear(), target.getMonth(), Math.min(day, dim)));
  }

  // A goal repeats when it says how often. Zero, missing or nonsense means the
  // old behaviour — it happens once.
  export const goalRepeatMonths = (g) => {
    const n = Number(g && g.repeatMonths);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };

  // What one goal's next cycle looks like, or null when it is not due.
  //
  // Due means the target date has arrived or passed. Catching up is a loop
  // rather than a single step: an app left unopened for fourteen months owes
  // two rolls of a yearly fund, and landing on the correct date matters more
  // than the number of hops it took to get there.
  export function planGoalRollover(goal, today) {
    const every = goalRepeatMonths(goal);
    if (!every || !goal || !goal.targetDate || !today) return null;
    if (goal.targetDate > today) return null;

    let date = goal.targetDate;
    let saved = Number.isFinite(goal.saved) ? goal.saved : 0;
    const target = Number.isFinite(goal.target) ? goal.target : 0;
    let cycles = 0;
    // Bounded: a corrupt date cannot spin here, and twenty years of monthly
    // cycles is well past anything a real household will have missed.
    while (date <= today && cycles < 240) {
      // The money is spent when the fund matures. Anything over the target is
      // carried into the next cycle rather than quietly discarded — it is the
      // household's money, and it came from their contributions.
      saved = Math.max(0, saved - target);
      date = addMonthsClamped(date, every);
      if (!date) return null;
      cycles++;
    }
    if (!cycles) return null;
    return { goalId: goal.id, from: goal.targetDate, to: date, cycles, saved, target };
  }

  // Every goal that is due, plus the entry edits each roll implies.
  //
  // Two entries hang off a goal and both have to move, or the roll is cosmetic:
  //
  //   the contribution entry ends on the target date, so leaving it alone
  //   stops the saving at exactly the moment the next cycle starts
  //
  //   the payout entry is a one-time expense on the target date, so the
  //   forecast shows next year's bill only if a new one is written for it
  //
  // The old payout is left where it is. It is a record of a thing that
  // happened on a date that has passed, and rewriting history to point at the
  // next cycle would take that month's spending with it.
  export function planGoalRollovers(goals, entries, today) {
    const rolls = [];
    (Array.isArray(goals) ? goals : []).forEach((g) => {
      const roll = planGoalRollover(g, today);
      if (roll) rolls.push(roll);
    });
    const byId = new Map((Array.isArray(entries) ? entries : []).map((e) => [e.id, e]));
    const extend = [];
    const payouts = [];
    rolls.forEach((roll) => {
      const goal = goals.find((g) => g.id === roll.goalId);
      const contrib = goal && goal.entryId ? byId.get(goal.entryId) : null;
      // Only extend an end date that is actually in the way. A contribution
      // entry with no end runs for ever already.
      if (contrib && contrib.recurEnd && contrib.recurEnd < roll.to) {
        extend.push({ entryId: contrib.id, recurEnd: roll.to });
      }
      const oldPayout = goal && goal.payoutEntryId ? byId.get(goal.payoutEntryId) : null;
      if (oldPayout) {
        payouts.push({
          goalId: roll.goalId,
          entry: {
            desc: oldPayout.desc,
            type: "expense",
            amount: roll.target,
            startDate: roll.to,
            repeats: false,
            recurEvery: 1,
            recurUnit: "month",
            recurDays: [],
            recurEnd: "",
            category: oldPayout.category,
            notes: oldPayout.notes || "",
          },
        });
      }
    });
    return { rolls, extend, payouts, changed: rolls.length > 0 };
  }

  // Apply a plan to plain arrays. The caller hands in setters so this works
  // against React state and against a test's objects alike.
  export function applyGoalRollovers(plan, { setGoals, setEntries, newId = genId } = {}) {
    if (!plan || !plan.changed) return;
    const payoutIds = new Map();
    if (setEntries) {
      setEntries((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        plan.extend.forEach((x) => {
          const i = list.findIndex((e) => e.id === x.entryId);
          if (i >= 0) list[i] = { ...list[i], recurEnd: x.recurEnd };
        });
        plan.payouts.forEach((p) => {
          const id = newId();
          payoutIds.set(p.goalId, id);
          list.push({ ...p.entry, id });
        });
        return list;
      });
    }
    if (setGoals) {
      setGoals((prev) => (Array.isArray(prev) ? prev : []).map((g) => {
        const roll = plan.rolls.find((r) => r.goalId === g.id);
        if (!roll) return g;
        const next = { ...g, targetDate: roll.to, saved: roll.saved };
        const pid = payoutIds.get(g.id);
        if (pid) next.payoutEntryId = pid;
        return next;
      }));
    }
  }
