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
        const effM = ov.month !== void 0 ? Math.min(Math.max(0, ov.month), 11) : m;
        const effD = Math.min(Math.max(1, ov.day !== void 0 ? ov.day : d), daysInMonth(effM, year));
        const effDate = effM !== m || effD !== d ? new Date(year, effM, effD) : date;
        events.push({
          id: eid,
          entryId: e.id,
          desc: ov.desc !== void 0 ? ov.desc : e.desc,
          type: e.type,
          amount: ov.amount !== void 0 ? ov.amount : amtForMonth(m),
          category: e.category,
          notes: ov.notes !== void 0 ? ov.notes : e.notes || "",
          attachment: ov.attachment !== void 0 ? ov.attachment : null,
          isOverride: Object.keys(ov).length > 0,
          month: effM,
          day: effD,
          date: effDate,
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
      } else if (unit === "month") {
        const anchorDay = startD.getDate();
        for (let mi = 0; mi < 12; mi++) {
          const startMi = startD.getFullYear() < year ? 0 : startD.getFullYear() === year ? startD.getMonth() : 999;
          if (mi < startMi) continue;
          const totalMo = (year - startD.getFullYear()) * 12 + mi - startD.getMonth();
          if (totalMo < 0 || totalMo % every !== 0) continue;
          addEv(new Date(year, mi, Math.min(anchorDay, daysInMonth(mi, year))));
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
    const newId = Date.now();
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
  function computeFlow(events, openBal) {
    let bal = openBal;
    return events.map((ev) => {
      bal += ev.type === "income" ? ev.amount : -ev.amount;
      return __spreadProps(__spreadValues({}, ev), { balance: roundMoney(bal) });
    });
  }
  function getMonthSummaries(flow, openBal) {
    return MONTHS.map((m, i) => {
      const evs = flow.filter((ev) => ev.month === i);
      const prev = flow.filter((ev) => ev.month < i);
      const open = prev.length > 0 ? prev[prev.length - 1].balance : openBal;
      const income = evs.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expense = evs.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const close = evs.length > 0 ? evs[evs.length - 1].balance : open;
      return { month: m, monthIdx: i, income, expense, surplus: income - expense, open, close };
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
