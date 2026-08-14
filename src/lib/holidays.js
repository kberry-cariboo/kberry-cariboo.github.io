  // British Columbia statutory holidays, used to work out the day a direct
  // deposit actually lands (see priorBankingDay in dates.js). Banks don't
  // process on a holiday any more than they do on a Sunday, so a payday that
  // falls on one is deposited the last banking day before it.
  //
  // Two sources, in that order of preference:
  //
  //   1. canada-holidays.ca — the dates as published, including the ones BC
  //      lists as optional (Easter Monday, Boxing Day). Fetched once per
  //      budget year and cached in localStorage; holidays for a given year
  //      don't change, so a hit is good until the TTL runs out.
  //   2. computeBCHolidays() below — the same list worked out from the rules.
  //      This is not a stopgap for a failed fetch, it's the floor the feature
  //      stands on: the app is offline-first and ships as a single static
  //      page, so the holiday rule has to work on a plane, on first run before
  //      any fetch completes, and if that site ever moves or goes away.
  //
  // The two agree on ordinary years. Where they can differ is exactly where a
  // published list earns its place — a one-off proclaimed holiday, or a rule
  // change like BC moving Family Day from the second Monday to the third in
  // 2019 — so the fetch is worth making even though the fallback is good.
  const HOLIDAY_API_URL = (year) => `https://canada-holidays.ca/api/v1/provinces/BC?year=${year}&optional=true`;
  const HOLIDAY_CACHE_KEY = (year) => `cf_holidays_bc_${year}`;
  // Long enough that a normal user fetches each year roughly once, short
  // enough that a correction to a published date reaches them the same year.
  const HOLIDAY_TTL_MS = 120 * 24 * 60 * 60 * 1000;
  // year -> { "YYYY-MM-DD": { name, optional } }. Read synchronously by
  // expandEntries (which is called from render-time useMemos and can't await
  // anything), refreshed asynchronously by ensureHolidayYears.
  const holidayRegistry = {};

  const nthWeekdayOfMonth = (year, month, weekday, n) => {
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  };
  // Anonymous Gregorian computus. Easter anchors Good Friday (statutory) and
  // Easter Monday (optional in BC).
  const easterSunday = (year) => {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    return new Date(year, month - 1, day);
  };
  const addDays = (d, n) => {
    const out = new Date(d);
    out.setDate(out.getDate() + n);
    return out;
  };
  // A holiday landing on a weekend is observed on the next open day, and it's
  // the observed day the banks are shut. Both days are registered: the real one
  // so a tooltip can name it, the observed one so the deposit maths steps over
  // the right day.
  //
  // `taken` is what makes Christmas week come out right. When Christmas is a
  // Saturday, it is observed on the Monday and Boxing Day moves past it to the
  // Tuesday rather than doubling up — two closed days, not one.
  const observedFor = (d, taken) => {
    let obs = d;
    while (obs.getDay() === 0 || obs.getDay() === 6 || taken.has(localDateStr(obs))) obs = addDays(obs, 1);
    return obs;
  };
  function computeBCHolidays(year) {
    const may25 = new Date(year, 4, 25);
    // Victoria Day is the Monday *preceding* May 25 — on a May 25 Monday the
    // holiday is the week before, not that day.
    const victoria = addDays(may25, -((may25.getDay() + 6) % 7 || 7));
    const easter = easterSunday(year);
    const fixed = [
      [new Date(year, 0, 1), "New Year's Day", false],
      [nthWeekdayOfMonth(year, 1, 1, 3), "Family Day", false],
      [addDays(easter, -2), "Good Friday", false],
      [addDays(easter, 1), "Easter Monday", true],
      [victoria, "Victoria Day", false],
      [new Date(year, 6, 1), "Canada Day", false],
      [nthWeekdayOfMonth(year, 7, 1, 1), "British Columbia Day", false],
      [nthWeekdayOfMonth(year, 8, 1, 1), "Labour Day", false],
      [new Date(year, 8, 30), "National Day for Truth and Reconciliation", false],
      [nthWeekdayOfMonth(year, 9, 1, 2), "Thanksgiving", false],
      [new Date(year, 10, 11), "Remembrance Day", false],
      [new Date(year, 11, 25), "Christmas Day", false],
      [new Date(year, 11, 26), "Boxing Day", true]
    ];
    const out = {};
    const taken = /* @__PURE__ */ new Set();
    // In date order, so an earlier holiday claims its observed day before a
    // later one looks for its own.
    fixed.sort((a, b) => a[0] - b[0]).forEach(([date, name, optional]) => {
      const dateStr = localDateStr(date);
      if (!out[dateStr]) out[dateStr] = { name, optional };
      const obsStr = localDateStr(observedFor(date, taken));
      taken.add(obsStr);
      if (!out[obsStr]) out[obsStr] = { name: `${name} (observed)`, optional };
    });
    return out;
  }
  // The API returns { province: { holidays: [{ date, observedDate, nameEn,
  // optional }] } }. Everything here is defensive on purpose: this is a third
  // party's shape, the payload is not something the app controls, and a
  // surprise in it must degrade to the computed list rather than throw inside
  // a render.
  function parseHolidayPayload(payload, year) {
    var _a;
    const list = Array.isArray(payload == null ? void 0 : payload.holidays) ? payload.holidays : Array.isArray((_a = payload == null ? void 0 : payload.province) == null ? void 0 : _a.holidays) ? payload.province.holidays : null;
    if (!list || !list.length) return null;
    const out = {};
    list.forEach((h) => {
      const name = (h && (h.nameEn || h.name) || "Holiday").trim();
      const optional = !!(h && (h.optional === true || h.optional === 1));
      [h && h.date, h && h.observedDate].forEach((raw) => {
        if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
        if (Number(raw.slice(0, 4)) !== year) return;
        if (!out[raw]) out[raw] = { name, optional };
      });
    });
    return Object.keys(out).length ? out : null;
  }
  function readHolidayCache(year) {
    try {
      const raw = localStorage.getItem(HOLIDAY_CACHE_KEY(year));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.days || !parsed.fetchedAt) return null;
      if (Date.now() - Date.parse(parsed.fetchedAt) > HOLIDAY_TTL_MS) return null;
      return parsed.days;
    } catch (e) {
      return null;
    }
  }
  // Synchronous, always answers. First call for a year seeds the registry from
  // the cache or the computed rules, so nothing downstream has to care whether
  // a fetch has happened yet.
  function holidaysForYear(year) {
    if (!holidayRegistry[year]) holidayRegistry[year] = readHolidayCache(year) || computeBCHolidays(year);
    return holidayRegistry[year];
  }
  function holidayOn(dateStr) {
    const year = Number(String(dateStr).slice(0, 4));
    if (!year) return null;
    return holidaysForYear(year)[dateStr] || null;
  }
  // Fetches one year and returns true when the registry actually changed —
  // the caller uses that to decide whether a re-render is needed.
  async function refreshHolidayYear(year) {
    try {
      const res = await fetch(HOLIDAY_API_URL(year), { headers: { accept: "application/json" } });
      if (!res.ok) return false;
      const days = parseHolidayPayload(await res.json(), year);
      if (!days) return false;
      const changed = JSON.stringify(days) !== JSON.stringify(holidaysForYear(year));
      holidayRegistry[year] = days;
      try {
        localStorage.setItem(HOLIDAY_CACHE_KEY(year), JSON.stringify({ fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), days }));
      } catch (e) {
        // Storage full or blocked — the dates are still in the registry for
        // this session, they'll just be fetched again next launch.
      }
      return changed;
    } catch (e) {
      // Offline, blocked, or the site is down. The computed list is already in
      // place; this is not worth telling the user about.
      return false;
    }
  }
  // Call with the budget years in play. Years already cached inside the TTL
  // cost nothing, so this is safe to run on every launch — which is what makes
  // it "run each year": a new budget year has no cache entry and is fetched
  // the first time the app sees it, and an old one is re-fetched once its
  // cache goes stale. Resolves to true if any year's dates changed.
  async function ensureHolidayYears(years) {
    const wanted = [...new Set((years || []).map(Number).filter((y) => y >= 1970 && y <= 9999))];
    const stale = wanted.filter((y) => !readHolidayCache(y));
    if (!stale.length) {
      wanted.forEach(holidaysForYear);
      return false;
    }
    const results = await Promise.all(stale.map(refreshHolidayYear));
    return results.some(Boolean);
  }
