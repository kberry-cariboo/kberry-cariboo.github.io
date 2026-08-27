  // Extracted from app-data.js (round-9 AR4 remainder) — pure code motion.
  const isLeapYear = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const daysInMonth = (m, y) => MONTH_DAYS[m] + (m === 1 && isLeapYear(y) ? 1 : 0);
  function parseDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function humanShortDate(str) {
    const d = parseDate(str);
    if (!d || isNaN(d)) return str;
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
  function todayStr() {
    const t = /* @__PURE__ */ new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  function startOfToday() {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function isArchived(e, year) {
    const yr = year || (/* @__PURE__ */ new Date()).getFullYear();
    const yearStart = `${yr}-01-01`;
    const yearEnd = `${yr}-12-31`;
    if (!e.repeats) {
      return e.startDate < yearStart || e.startDate > yearEnd;
    }
    if (e.startDate > yearEnd) return true;
    if (!e.recurEnd) return false;
    return e.recurEnd < yearStart;
  }
  // Direct-deposit payroll doesn't land on a day the banks are shut: a payday
  // that falls on a weekend or a BC statutory holiday is deposited on the last
  // banking day before it, so pay dated Saturday 15 August is in the account on
  // Friday the 14th.
  //
  // The occurrence itself does not move. It stays on the payday in the budget —
  // same month, same running balance, same monthly totals — and carries the
  // deposit date alongside as metadata for the UI to mark. Moving it would drag
  // income across a month boundary whenever a 1st-of-month payday landed on a
  // Saturday (paid 31 July, budgeted in August), quietly rewriting the totals
  // and Budget vs Actual of two months to fix a display problem.
  //
  // Which entries this applies to is read from the description rather than a
  // per-entry setting: "Ken - Payroll (1st)", "Mel - Payroll" and "PAY ROLL —
  // Ken" all read as payroll to a person, and the alternative is a checkbox
  // that every payroll entry has to have ticked by hand.
  const PAYROLL_DESC_RE = /pay\s*-?\s*roll/i;
  // Repeating income only. A one-time entry's date was typed by hand — it is
  // already the date the money arrived — and expenses leave when the biller
  // pulls them, which is not this rule.
  function isPayrollDeposit(e, desc) {
    return !!e.repeats && e.type === "income" && PAYROLL_DESC_RE.test(String(desc || ""));
  }
  // The last banking day on or before `date`: steps back over Saturdays,
  // Sundays and BC holidays (see holidays.js, which includes the two BC lists
  // as optional — Easter Monday and Boxing Day). Returns the same object when
  // the date is already a banking day, so callers can compare by identity.
  //
  // The walk is bounded: a corrupt holiday list can't spin here, and ten days
  // is well past the longest real run of closures.
  function priorBankingDay(date) {
    let d = date;
    for (let i = 0; i < 10; i++) {
      const wd = d.getDay();
      const closed = wd === 0 || wd === 6 || !!holidayOn(localDateStr(d));
      if (!closed) return d;
      d = new Date(d);
      d.setDate(d.getDate() - 1);
    }
    return d;
  }
  // Why a row is marked. Names the holiday when there is one, because "Canada
  // Day" explains the early deposit in a way "a closed day" doesn't.
  function depositShiftNote(ev) {
    if (!ev || !ev.depositShifted || !ev.depositDate) return "";
    const paid = ev.depositDate;
    const hol = holidayOn(localDateStr(ev.date));
    const why = hol ? `is ${hol.name}${hol.optional ? " (an optional holiday)" : ""}` : "falls on a weekend";
    return `Payday ${WEEKDAYS[ev.date.getDay()]} ${MONTHS[ev.month]} ${ev.day} ${why} — direct deposit lands ${WEEKDAYS[paid.getDay()]} ${MONTHS[paid.getMonth()]} ${paid.getDate()}. The budget keeps it on the payday.`;
  }
  // The nth named weekday of a month — nth 1..5 counting forward, or -1 for
  // the last one. Returns null when a month has no 5th such weekday, so a
  // "5th Friday" entry simply produces nothing in the months that lack one
  // rather than silently sliding into the next month.
  function nthWeekdayInMonth(year, month, weekday, nth) {
    if (nth === -1) {
      const last = new Date(year, month, daysInMonth(month, year));
      last.setDate(last.getDate() - ((last.getDay() - weekday + 7) % 7));
      return last;
    }
    const first = new Date(year, month, 1);
    const day = 1 + ((weekday - first.getDay() + 7) % 7) + (nth - 1) * 7;
    return day > daysInMonth(month, year) ? null : new Date(year, month, day);
  }
  function expandEntries(entries, year, overrides = {}) {
    const events = [];
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    entries.forEach((e) => {
      const startD = parseDate(e.startDate) || new Date(year, 0, 1);
      const endD = e.repeats ? e.recurEnd ? parseDate(e.recurEnd) : new Date(9999, 11, 31) : startD;
      const every = Math.max(1, e.recurEvery || 1);
      const unit = e.recurUnit || "month";
      const wdays = e.recurDays || [];
      if (startD > yearEnd || endD < yearStart) return;
      const amtForMonth = (m) => {
        var _a;
        return ((_a = e.monthlyAmounts) == null ? void 0 : _a[m]) !== void 0 ? e.monthlyAmounts[m] : e.amount;
      };
      const addEv = (date) => {
        if (date.getFullYear() !== year) return;
        if (date < startD || date > endD) return;
        const m = date.getMonth(), d = date.getDate();
        const eid = `${e.id}-${year}-${m}-${d}`;
        const ov = overrides[eid] || {};
        // A skipped occurrence never enters the event stream at all — every
        // balance/total/report computation downstream (computeFlow,
        // getMonthSummaries, BvA, debt tracking, AI insights, ...) already
        // just sums whatever's in the array, so this is the only place that
        // needs to know about skips; nothing else has to remember to exclude
        // them. The override itself (and its skipped:true flag) still exists
        // in overridesByYr for the "skipped occurrences" list to read back.
        if (ov.skipped) return;
        const effM = ov.month !== void 0 ? Math.min(Math.max(0, ov.month), 11) : m;
        const effD = Math.min(Math.max(1, ov.day !== void 0 ? ov.day : d), daysInMonth(effM, year));
        const effDate = effM !== m || effD !== d ? new Date(year, effM, effD) : date;
        const evDesc = ov.desc !== void 0 ? ov.desc : e.desc;
        // When the money actually arrives, for payroll landing on a day the
        // banks are shut. Derived from the effective date, so an occurrence the
        // user has moved by hand is measured from where they put it. Nothing
        // downstream sorts, groups or totals by this — it exists to be shown.
        // A deposit in the previous month, or the previous year, is fine here
        // precisely because the occurrence is staying where it is.
        const depositDate = isPayrollDeposit(e, evDesc) ? priorBankingDay(effDate) : effDate;
        const depositShifted = depositDate !== effDate;
        const planned = ov.amount !== void 0 ? ov.amount : amtForMonth(m);
        // actualAmount is a separate, optional override recorded after the
        // fact (reconciliation) — e.g. a variable bill that was budgeted at
        // $150 but actually came out to $162. It drives the running balance
        // and BvA "spent" totals, while `plannedAmount` keeps the original
        // scheduled figure around for comparison (shown as a tooltip in the
        // budget grid and as the editable "Amount" in OccurrenceEditModal).
        const actual = ov.actualAmount !== void 0 ? ov.actualAmount : planned;
        events.push({
          id: eid,
          entryId: e.id,
          desc: evDesc,
          type: e.type,
          // Only meaningful when type is "transfer" — money moving out of
          // this tracked account (default) vs into it. Income/expense
          // entries ignore this entirely.
          transferDirection: e.transferDirection || "out",
          amount: actual,
          plannedAmount: planned,
          category: e.category,
          notes: ov.notes !== void 0 ? ov.notes : e.notes || "",
          attachment: ov.attachment !== void 0 ? ov.attachment : null,
          isOverride: Object.keys(ov).length > 0,
          // Who last edited this occurrence, and when — carried through for
          // display only, so the occurrence editor can attribute the change in
          // a shared household. Nothing totals or sorts by either.
          _by: ov._by,
          _savedAt: ov._savedAt,
          month: effM,
          day: effD,
          date: effDate,
          // The day the money reaches the account, when that isn't the payday
          // itself. Display-only: depositShifted is what the UI marks, and
          // depositDate is what it names. Every balance and total in the app
          // still runs off date/month/day above.
          depositDate,
          depositShifted,
          // Recurrence metadata — needed for monthly-equivalent calculations
          recurUnit: e.recurUnit || "month",
          recurEvery: e.recurEvery || 1,
          repeats: e.repeats || false
        });
      };
      if (!e.repeats) {
        addEv(new Date(startD));
        return;
      }
      if (unit === "semimonth") {
        const anchor = startD.getDate();
        const second = anchor <= 14 ? anchor + 14 : anchor - 14;
        for (let mi = 0; mi < 12; mi++) {
          const d1 = Math.min(anchor, daysInMonth(mi, year));
          const d2 = Math.min(second, daysInMonth(mi, year));
          addEv(new Date(year, mi, d1));
          addEv(new Date(year, mi, d2));
        }
      } else if (unit === "day") {
        let cur = new Date(startD);
        while (cur < yearStart) cur.setDate(cur.getDate() + every);
        cur.setDate(cur.getDate() - every);
        while (cur <= yearEnd) {
          if (cur >= yearStart) addEv(new Date(cur));
          cur.setDate(cur.getDate() + every);
        }
      } else if (unit === "week") {
        let cur = new Date(startD);
        while (cur < yearStart) cur.setDate(cur.getDate() + every * 7);
        cur.setDate(cur.getDate() - every * 7);
        while (cur <= yearEnd) {
          // Gate on each emitted date, not the anchor `cur` — the anchor's
          // week can start before yearStart while a weekday offset within
          // that same week (e.g. a Friday following a Monday anchor) still
          // falls inside the year. addEv() re-checks year/range anyway, but
          // skipping the whole offset loop here would drop that date before
          // addEv ever saw it.
          if (every === 1 && wdays.length > 1) {
            for (const wd of wdays) {
              const diff = (wd - cur.getDay() + 7) % 7;
              const c2 = new Date(cur);
              c2.setDate(c2.getDate() + diff);
              addEv(c2);
            }
          } else if (cur >= yearStart) {
            addEv(new Date(cur));
          }
          cur.setDate(cur.getDate() + every * 7);
        }
      } else if (unit === "month" || unit === "monthend" || unit === "monthweekday") {
        // All three step month by month from the start month; they differ only
        // in which day of the month they land on.
        //
        //   month         the same day number, clamped into short months
        //   monthend      the last day, whatever length the month is
        //   monthweekday  the nth (or last) named weekday
        //
        // "monthend" is not the same as a plain monthly entry anchored on the
        // 31st: that one lands on the 28th in February and the 31st in March,
        // but an entry *created* in February anchors on the 28th and then
        // stays on the 28th for the rest of the year. A bill genuinely due on
        // the last day needs the intent recorded, not inferred from whichever
        // month it was first entered in.
        const anchorDay = startD.getDate();
        const nth = Number.isFinite(e.recurNth) ? e.recurNth : 1;
        const weekday = Array.isArray(e.recurDays) && e.recurDays.length ? e.recurDays[0] : startD.getDay();
        for (let mi = 0; mi < 12; mi++) {
          const startMi = startD.getFullYear() < year ? 0 : startD.getFullYear() === year ? startD.getMonth() : 999;
          if (mi < startMi) continue;
          const totalMo = (year - startD.getFullYear()) * 12 + mi - startD.getMonth();
          if (totalMo < 0 || totalMo % every !== 0) continue;
          if (unit === "monthend") {
            addEv(new Date(year, mi, daysInMonth(mi, year)));
          } else if (unit === "monthweekday") {
            const d = nthWeekdayInMonth(year, mi, weekday, nth);
            if (d) addEv(d);
          } else {
            addEv(new Date(year, mi, Math.min(anchorDay, daysInMonth(mi, year))));
          }
        }
      } else if (unit === "year") {
        const sy = startD.getFullYear();
        if (year >= sy && (year - sy) % every === 0) {
          const mi = startD.getMonth();
          addEv(new Date(year, mi, Math.min(startD.getDate(), daysInMonth(mi, year))));
        }
      }
    });
    events.sort((a, b) => {
      const d = a.date - b.date;
      if (d !== 0) return d;
      if (a.type === "income" && b.type !== "income") return -1;
      if (b.type === "income" && a.type !== "income") return 1;
      return 0;
    });
    return events;
  }
  // Editing a recurring entry must never rewrite history: occurrences before
  // the current month keep the values they were actually shown with. When an
  // edited recurring entry already has occurrences before the 1st of the
  // current month (and still runs into it or beyond), the edit is applied as
  // a split: the original entry keeps its old values and is ended the day
  // before the new segment starts, and a new entry carries the edited values
  // forward. The new segment's start date is the edited pattern's first
  // occurrence on/after the 1st of the current month, so recurrence chains
  // (e.g. biweekly paydays) continue unbroken. For month/semi-month/year
  // patterns anchored on the 29th–31st, months too short for the anchor are
  // covered by the old entry and the boundary lands on the next full
  // occurrence, so the anchor day isn't permanently clamped by the split.
  // Returns { entries, newId, splitDate } — newId is null when the edit was
  // applied in place (no history to protect, or nothing value-affecting
  // changed).
  function splitEntryEditFromCurrentMonth(entries, editedId, data, now = new Date()) {
    const old = entries.find((e) => e.id === editedId);
    const inPlace = () => ({ entries: entries.map((e) => e.id === editedId ? __spreadProps(__spreadValues({}, data), { id: editedId }) : e), newId: null, splitDate: null });
    if (!old) return { entries, newId: null, splitDate: null };
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = localDateStr(monthStart);
    const oldStart = parseDate(old.startDate);
    if (!old.repeats || !oldStart || oldStart >= monthStart) return inPlace();
    // Already ended before this month: the user is deliberately editing a
    // historical record — apply exactly as asked.
    if (old.recurEnd && old.recurEnd < monthStartStr) return inPlace();
    const shape = (e) => JSON.stringify({
      desc: e.desc,
      type: e.type,
      amount: e.amount,
      category: e.category,
      notes: e.notes || "",
      repeats: !!e.repeats,
      recurEvery: e.recurEvery || 1,
      recurUnit: e.recurUnit || "month",
      recurDays: e.recurDays || [],
      // Part of the shape: changing only which weekday of the month a bill
      // falls on is a real change to the schedule, and without it here it
      // would read as "nothing changed" and be applied retroactively over
      // months already recorded.
      recurNth: Number.isFinite(e.recurNth) ? e.recurNth : null,
      startDate: e.startDate,
      monthlyAmounts: e.monthlyAmounts || null
    });
    // Only recurEnd (or nothing) changed: an explicit end date is date-scoped
    // intent, not a retroactive value change — apply in place.
    if (shape(old) === shape(data)) return inPlace();
    let newStartD = null;
    if (data.repeats) {
      const probe = __spreadProps(__spreadValues({}, data), { id: 0 });
      const anchorD = parseDate(data.startDate);
      const anchorDay = anchorD ? anchorD.getDate() : 1;
      const unit = data.recurUnit || "month";
      const semiSecond = anchorDay <= 14 ? anchorDay + 14 : anchorDay - 14;
      const dayOk = (ev) => unit === "month" || unit === "year" ? ev.day === anchorDay : unit === "semimonth" ? ev.day === anchorDay || ev.day === semiSecond : true;
      for (let yr = now.getFullYear(); yr <= now.getFullYear() + 10 && !newStartD; yr++) {
        const hit = expandEntries([probe], yr, {}).find((ev) => ev.date >= monthStart && dayOk(ev));
        if (hit) newStartD = hit.date;
      }
      // The edited pattern has no occurrence from this month on (e.g. its end
      // date is in the past): nothing forward-looking exists to split for.
      if (!newStartD) return inPlace();
    }
    const boundary = data.repeats ? newStartD : monthStart;
    const endD = new Date(boundary);
    endD.setDate(endD.getDate() - 1);
    const newId = genId();
    const next = entries.map((e) => e.id === editedId ? __spreadProps(__spreadValues({}, old), { recurEnd: localDateStr(endD) }) : e);
    next.push(__spreadProps(__spreadValues({}, data), { id: newId, startDate: data.repeats ? localDateStr(newStartD) : data.startDate }));
    return { entries: next, newId, splitDate: localDateStr(boundary) };
  }
  // After a split, occurrence-keyed data (overrides, mark-paid flags) dated
  // on/after the split boundary belongs to the new segment; earlier keys stay
  // with the original. Remapped keys whose dates the new pattern doesn't
  // generate simply never match anything — inert, not harmful.
  function remapOccurrenceKeys(obj, oldId, newId, fromDateStr) {
    const out = {};
    const re = new RegExp(`^${oldId}-(\\d+)-(\\d+)-(\\d+)$`);
    Object.keys(obj || {}).forEach((k) => {
      const m = k.match(re);
      if (m) {
        const dStr = `${m[1]}-${String(+m[2] + 1).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        if (dStr >= fromDateStr) {
          out[`${newId}-${m[1]}-${m[2]}-${m[3]}`] = obj[k];
          return;
        }
      }
      out[k] = obj[k];
    });
    return out;
  }
  // Which side of the account an event falls on. Income and an "in"-direction
  // transfer bring money in; an expense and an "out"-direction transfer (the
  // default) take it out.
  //
  // This is *cash direction*, not category of activity, and the two are
  // deliberately different things here. A transfer is money the household
  // already had — moving $500 to savings is not spending it — so it stays out
  // of the income and expense totals and out of Budget vs Actual, which is
  // what the Help page promises and what the "a transfer nets into the
  // balance and stays out of income totals" regression case pins down. Cash
  // direction is what the *ledger* runs on: which column a row prints in, and
  // which way the running balance moves.
  const isInflowEvent = (ev) => ev.type === "income" || ev.type === "transfer" && ev.transferDirection === "in";
  const isOutflowEvent = (ev) => !isInflowEvent(ev);
  // Cents, signed by which side of the account the event falls on. Used
  // anywhere a running total needs a signed amount instead of computeFlow's
  // per-event balance.
  function signedAmount(ev) {
    return isInflowEvent(ev) ? ev.amount : -ev.amount;
  }
  function computeFlow(events, openBal) {
    let bal = openBal;
    return events.map((ev) => {
      bal += signedAmount(ev);
      return __spreadProps(__spreadValues({}, ev), { balance: roundMoney(bal) });
    });
  }
  // Per-month totals. `income` and `expense` are the two *activity* totals and
  // count only entries of that type, per the rule above.
  //
  // `surplus` is the change in the balance — close minus open — and not
  // `income - expense`, which is what it used to be. With no transfers in the
  // month the two are identical, which is nearly every month for nearly every
  // household. With transfers they are not, and the old subtraction produced a
  // figure that contradicted the Closing Balance printed in the very next
  // column: a month with one $500 transfer out reported "+$2,670" beside a
  // balance that had risen $2,170, and the year's "Annual Total" surplus
  // missed the transfers twelvefold. Deriving it from the balance means the
  // row always reconciles, whatever mix of types the month holds.
  //
  // `transfersIn`/`transfersOut` are what closes the gap for a reader: they
  // are the difference between the activity totals and the balance movement,
  // so a UI showing all of them can be checked with mental arithmetic. Both
  // are 0 for a month with no transfers, which is how callers know not to
  // spend a column on them.
  function getMonthSummaries(flow, openBal) {
    return MONTHS.map((m, i) => {
      const evs = flow.filter((ev) => ev.month === i);
      const prev = flow.filter((ev) => ev.month < i);
      const open = prev.length > 0 ? prev[prev.length - 1].balance : openBal;
      const income = evs.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expense = evs.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const transfers = evs.filter((e) => e.type === "transfer");
      const transfersIn = transfers.filter(isInflowEvent).reduce((s, e) => s + e.amount, 0);
      const transfersOut = transfers.filter(isOutflowEvent).reduce((s, e) => s + e.amount, 0);
      const close = evs.length > 0 ? evs[evs.length - 1].balance : open;
      return { month: m, monthIdx: i, income, expense, transfersIn, transfersOut, surplus: roundMoney(close - open), open, close };
    });
  }
  function getCurrentBalance(flow, openBal, year) {
    const today = /* @__PURE__ */ new Date();
    if (today.getFullYear() < year) return openBal;
    if (today.getFullYear() > year) {
      return flow.length > 0 ? flow[flow.length - 1].balance : openBal;
    }
    const past = flow.filter((ev) => ev.date <= today);
    return past.length > 0 ? past[past.length - 1].balance : openBal;
  }
