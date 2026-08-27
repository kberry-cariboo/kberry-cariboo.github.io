  // British Columbia statutory holidays, used to work out the day a direct
  // deposit actually lands (see priorBankingDay in dates.js). Banks don't
  // process on a holiday any more than they do on a Sunday, so a payday that
  // falls on one is deposited the last banking day before it.
  //
  // The dates are household data. They live in Postgres as ordinary rows — the
  // `holidays` and `holiday_years` tables in supabase/schema.sql, one row per
  // date, queryable in the SQL editor like anything else — and travel in the
  // same load_household/save_household payload as entries and budget targets.
  // Settings → Statutory Holidays adds, edits and removes them, and can pull a
  // year from canada-holidays.ca on demand. Nothing fetches on its own: a
  // background request that quietly overwrote a hand-corrected date and then
  // synced it to everyone else in the household is not a thing the app should
  // do on its own initiative.
  //
  // A year with nothing stored falls back to computeRegionHolidays() below, which
  // works the list out from the rules. That fallback is the floor the feature
  // stands on rather than a stopgap: the app is offline-first and ships as a
  // single static page, so the deposit marker has to be right on a plane, on a
  // budget year opened for the first time, and if that site ever moves. The
  // fetch earns its place where rules can't reach — a proclaimed one-off, or a
  // change like BC moving Family Day to the third Monday in 2019.
  const HOLIDAY_API_URL = (year, region) => `https://canada-holidays.ca/api/v1/provinces/${holidayRegion(region).code}?year=${year}&optional=true`;

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
  // A holiday landing on a weekend is observed on the next open day, and the
  // observed day is the only one that matters here: it is the day the banks are
  // shut, and the day the holiday is actually taken. The calendar date it slid
  // off was either a Saturday or a Sunday, which the weekend rule already
  // covers, so listing both only ever produced a duplicate — "Boxing Day" on
  // the 26th and "Boxing Day (observed)" on the 28th, two rows for one day off.
  //
  // `taken` is what makes Christmas week come out right. When Christmas is a
  // Saturday, it is observed on the Monday and Boxing Day moves past it to the
  // Tuesday rather than doubling up — two closed days, not one.
  const observedFor = (d, taken) => {
    let obs = d;
    while (obs.getDay() === 0 || obs.getDay() === 6 || taken.has(localDateStr(obs))) obs = addDays(obs, 1);
    return obs;
  };
  // Which region's rules the built-in list is computed from. Provinces and
  // territories differ in three places — the February holiday, the August
  // civic one, and which of Victoria Day / Truth and Reconciliation /
  // Remembrance Day / Boxing Day they observe — and everything else is common
  // across the country.
  //
  // This is a computed baseline, not an authority. Provincial rules change,
  // one-off proclamations happen, and some of these days are "optional" or
  // employer-discretionary in ways a rule table can't capture. Settings →
  // Statutory Holidays can fetch the published list for the chosen region from
  // canada-holidays.ca, and every date can be added, edited or removed by
  // hand; that is what the feature is for. `optional` here marks the days a
  // region commonly treats as discretionary, matching how BC has always
  // treated Easter Monday and Boxing Day.
  const HOLIDAY_REGIONS = [
    { code: "BC", name: "British Columbia", feb: "Family Day", aug: "British Columbia Day", victoria: true, truth: true, remembrance: true, boxingOptional: true },
    { code: "AB", name: "Alberta", feb: "Family Day", aug: "Heritage Day", augOptional: true, victoria: true, truth: false, remembrance: true },
    { code: "SK", name: "Saskatchewan", feb: "Family Day", aug: "Saskatchewan Day", victoria: true, truth: false, remembrance: true },
    { code: "MB", name: "Manitoba", feb: "Louis Riel Day", aug: "Terry Fox Day", augOptional: true, victoria: true, truth: true, remembrance: true },
    { code: "ON", name: "Ontario", feb: "Family Day", aug: "Civic Holiday", augOptional: true, victoria: true, truth: false, remembrance: false, boxing: true },
    { code: "QC", name: "Quebec", feb: null, aug: null, victoria: true, victoriaName: "National Patriots' Day", truth: false, remembrance: false, stJean: true },
    { code: "NB", name: "New Brunswick", feb: "Family Day", aug: "New Brunswick Day", victoria: true, truth: false, remembrance: true },
    { code: "NS", name: "Nova Scotia", feb: "Heritage Day", aug: "Natal Day", augOptional: true, victoria: true, truth: true, remembrance: true },
    { code: "PE", name: "Prince Edward Island", feb: "Islander Day", aug: "Gold Cup Parade Day", augOptional: true, victoria: true, truth: true, remembrance: true },
    { code: "NL", name: "Newfoundland and Labrador", feb: null, aug: "Civic Holiday", augOptional: true, victoria: true, truth: false, remembrance: true },
    { code: "YT", name: "Yukon", feb: "Heritage Day", aug: "Discovery Day", augMonday: 3, victoria: true, truth: true, remembrance: true },
    { code: "NT", name: "Northwest Territories", feb: null, aug: "Civic Holiday", augOptional: true, victoria: true, truth: true, remembrance: true },
    { code: "NU", name: "Nunavut", feb: null, aug: "Civic Holiday", augOptional: true, victoria: true, truth: true, remembrance: true, nunavutDay: true }
  ];
  const DEFAULT_HOLIDAY_REGION = "BC";
  const holidayRegion = (code) => HOLIDAY_REGIONS.find((r) => r.code === code) || HOLIDAY_REGIONS[0];
  function computeRegionHolidays(year, regionCode) {
    const r = holidayRegion(regionCode);
    const may25 = new Date(year, 4, 25);
    // Victoria Day is the Monday *preceding* May 25 — on a May 25 Monday the
    // holiday is the week before, not that day.
    const victoria = addDays(may25, -((may25.getDay() + 6) % 7 || 7));
    const easter = easterSunday(year);
    const fixed = [
      [new Date(year, 0, 1), "New Year's Day", false],
      [addDays(easter, -2), "Good Friday", false],
      [addDays(easter, 1), "Easter Monday", true],
      [new Date(year, 6, 1), "Canada Day", false],
      [nthWeekdayOfMonth(year, 8, 1, 1), "Labour Day", false],
      [nthWeekdayOfMonth(year, 9, 1, 2), "Thanksgiving", false],
      [new Date(year, 11, 25), "Christmas Day", false]
    ];
    if (r.feb) fixed.push([nthWeekdayOfMonth(year, 1, 1, 3), r.feb, false]);
    if (r.victoria) fixed.push([victoria, r.victoriaName || "Victoria Day", false]);
    if (r.stJean) fixed.push([new Date(year, 5, 24), "St-Jean-Baptiste Day", false]);
    if (r.nunavutDay) fixed.push([new Date(year, 6, 9), "Nunavut Day", false]);
    if (r.aug) fixed.push([nthWeekdayOfMonth(year, 7, 1, r.augMonday || 1), r.aug, !!r.augOptional]);
    if (r.truth) fixed.push([new Date(year, 8, 30), "National Day for Truth and Reconciliation", false]);
    if (r.remembrance) fixed.push([new Date(year, 10, 11), "Remembrance Day", false]);
    if (r.boxing || r.boxingOptional) fixed.push([new Date(year, 11, 26), "Boxing Day", !!r.boxingOptional]);
    const out = {};
    const taken = /* @__PURE__ */ new Set();
    // In date order, so an earlier holiday claims its observed day before a
    // later one looks for its own.
    fixed.sort((a, b) => a[0] - b[0]).forEach(([date, name, optional]) => {
      const obs = observedFor(date, taken);
      const obsStr = localDateStr(obs);
      taken.add(obsStr);
      // The suffix only appears when the day actually moved, so a list that
      // reads oddly — Boxing Day on a Tuesday — says why on the same line.
      const moved = obsStr !== localDateStr(date);
      if (!out[obsStr]) out[obsStr] = { name: moved ? `${name} (observed)` : name, optional };
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
      // observedDate, not date: the published feed carries both, and the
      // observed one is the day off. Taking both listed a holiday twice
      // whenever it fell on a weekend.
      const raw = h && (h.observedDate || h.date);
      if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
      if (Number(raw.slice(0, 4)) !== year) return;
      if (!out[raw]) out[raw] = { name, optional };
    });
    return Object.keys(out).length ? out : null;
  }
  // ── Store-backed lookup ────────────────────────────────────────────────────
  // The household's stored holidays, as { [year]: { [dateStr]: entry } }, kept
  // here so the synchronous readers below can see them. expandEntries runs
  // inside render-time useMemos and can't await or subscribe to anything, so
  // App.js pushes the current state in before it recomputes (see yearFlows).
  let storedHolidays = {};
  // Computed years are worked out once and kept — the rules for a given year
  // can't change, and this is read once per occurrence during expansion.
  const computedCache = {};
  function setStoredHolidays(stored) {
    storedHolidays = stored && typeof stored === "object" ? stored : {};
  }
  // Only for callers that have to put the registry back exactly as they found
  // it — the in-app self-tests run against the same module state the live
  // budget is using, and must not leave a fixture behind in it.
  function getStoredHolidays() {
    return storedHolidays;
  }
  // Which region the computed list is worked out for. Pushed in from App the
  // same way the stored holidays are — the readers below are called from a
  // dozen synchronous places with no access to React state. Changing it clears
  // the cache, so the next lookup recomputes rather than serving the previous
  // region's dates.
  let computedRegion = DEFAULT_HOLIDAY_REGION;
  function setHolidayRegion(code) {
    const next = holidayRegion(code).code;
    if (next === computedRegion) return;
    computedRegion = next;
    Object.keys(computedCache).forEach((k) => delete computedCache[k]);
  }
  function computedHolidaysForYear(year) {
    if (!computedCache[year]) computedCache[year] = computeRegionHolidays(year, computedRegion);
    return computedCache[year];
  }
  // A stored year replaces the computed one outright rather than merging with
  // it. Merging would make a deleted holiday impossible to express: the rules
  // would keep putting it back, and "remove" in the UI would silently do
  // nothing. Storing a year means the household owns that year's list.
  const isHolidayDateKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
  // Every reader takes an optional store. Rendering a component must not have
  // to push state into the module registry to read from it — a Settings panel
  // rendered with a fixture (the in-app self-tests do exactly that) would leave
  // the fixture behind for the live budget to use.
  const resolveStore = (store) => (store && typeof store === "object" ? store : storedHolidays);
  const yearIn = (store, year) => {
    const s = resolveStore(store);
    return s[year] || s[String(year)];
  };
  // A year *key being present* is what marks it as the household's, even when
  // the object is empty — that is how "we deleted every holiday in 2027" comes
  // back from the database (a holiday_years row with no holidays rows), and it
  // has to stay distinct from "nobody has touched 2027", which falls back to
  // the rules.
  function isYearStored(year, store) {
    const y = yearIn(store, year);
    return !!y && typeof y === "object";
  }
  function holidaysForYear(year, store) {
    const y = yearIn(store, year);
    return y && typeof y === "object" ? y : computedHolidaysForYear(year);
  }
  function holidayOn(dateStr) {
    const year = Number(String(dateStr).slice(0, 4));
    if (!year) return null;
    return holidaysForYear(year)[dateStr] || null;
  }
  // What Settings shows: one row per date, sorted, carrying where it came from.
  // `source` is "manual" for a hand-added or hand-edited date, "published" for
  // one that came from a fetch, and "computed" for the rules-based fallback.
  function holidayRowsForYear(year, store) {
    const days = holidaysForYear(year, store);
    const stored = isYearStored(year, store);
    return Object.keys(days).filter(isHolidayDateKey).sort().map((date) => {
      const h = days[date] || {};
      return {
        date,
        name: h.name || "Holiday",
        optional: !!h.optional,
        source: stored ? h.source || "published" : "computed"
      };
    });
  }
  // ── Fetching a year on demand ──────────────────────────────────────────────
  // Throws with a message meant to be shown as-is: this is only ever called
  // from a button the user pressed, so a failure has to say what happened
  // rather than fall back silently the way an automatic refresh would.
  async function fetchHolidayYear(year, region) {
    let res;
    try {
      res = await fetch(HOLIDAY_API_URL(year, region), { headers: { accept: "application/json" } });
    } catch (e) {
      throw new Error("Couldn't reach canada-holidays.ca. Check your connection and try again.");
    }
    if (!res.ok) throw new Error(`canada-holidays.ca returned ${res.status}. Try again in a moment.`);
    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error("canada-holidays.ca sent something this app couldn't read.");
    }
    const days = parseHolidayPayload(json, year);
    if (!days) throw new Error(`canada-holidays.ca had no BC dates for ${year}.`);
    return days;
  }
  // Folds a fetched year into what's already stored. Dates the user added or
  // edited by hand survive — losing them to a button labelled "fetch" would be
  // the same silent overwrite the automatic refresh was removed for — while
  // published dates are replaced wholesale, so a date that has been corrected
  // upstream, or dropped from the list entirely, follows.
  //
  // A published date the user deleted does come back on a re-fetch. That's the
  // honest reading of "fetch the published list", and the confirm text says so.
  function mergeFetchedHolidays(existing, fetched) {
    const out = {};
    const before = existing && typeof existing === "object" ? existing : {};
    const manualDates = Object.keys(before).filter((d) => (before[d] || {}).source === "manual");
    let added = 0, updated = 0;
    Object.keys(fetched).forEach((date) => {
      const f = fetched[date];
      const prev = before[date];
      if (prev && prev.source === "manual") return; // theirs wins
      if (!prev) added++;
      else if (prev.name !== f.name || !!prev.optional !== !!f.optional) updated++;
      out[date] = { name: f.name, optional: !!f.optional, source: "published" };
    });
    manualDates.forEach((date) => {
      out[date] = before[date];
    });
    const removed = Object.keys(before).filter((d) => (before[d] || {}).source !== "manual" && !out[d]).length;
    return { days: out, added, updated, removed, kept: manualDates.length };
  }
  // Readers filter to date-shaped keys throughout: an empty year is written as
  // {} today, but households saved by an earlier build carry a non-date
  // tombstone key instead, and that must not surface as a holiday called
  // "undefined".
  //
  // Materialises a year so it can be edited: an unstored year is seeded from
  // the computed rules first, because the alternative — starting from an empty
  // list — would silently drop every real holiday the moment someone added one
  // date of their own.
  function holidayYearForEditing(year, store) {
    const days = holidaysForYear(year, store);
    const out = {};
    Object.keys(days).filter(isHolidayDateKey).forEach((date) => {
      const h = days[date];
      out[date] = { name: h.name, optional: !!h.optional, source: h.source || (isYearStored(year, store) ? "published" : "computed") };
    });
    return out;
  }
