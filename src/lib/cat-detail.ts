  // What a category's total is actually made of.
  //
  // Today's "Top expense categories" widget answers "where does the money go"
  // and stops there: a bar says Housing is $19,800 and the only way to find
  // out which payments that is was to go to Flow and filter by hand. The
  // number is the interesting part and the breakdown behind it was two
  // screens away.
  //
  // So this takes the events already behind the bar and groups them the way a
  // person reads them — by the thing being paid, not by date. A year of
  // groceries is one line saying twenty-six payments, not twenty-six lines;
  // the dates are still there, one level down, for when that is the question.
  //
  // Pure functions over the flow. Money is integer cents.

  // One category's expenses, grouped by what was being paid.
  //
  // Grouped by entryId where there is one, falling back to the description:
  // two different entries can share a description ("Insurance" for the car and
  // the house) and should not be added together, while one entry's occurrences
  // should be, even if a per-date override renamed one of them.
  export function categoryDetail(flow, category) {
    const events = (Array.isArray(flow) ? flow : []).filter(
      (e) => e && e.type === "expense" && (e.category || "") === category
    );
    const groups = new Map();
    events.forEach((e) => {
      const key = e.entryId || ("desc:" + (e.desc || ""));
      let g = groups.get(key);
      if (!g) {
        g = { key, desc: e.desc || "(no description)", total: 0, count: 0, occurrences: [] };
        groups.set(key, g);
      }
      g.total += e.amount || 0;
      g.count++;
      g.occurrences.push({
        id: e.id,
        date: e.date,
        month: e.month,
        day: e.day,
        desc: e.desc,
        amount: e.amount || 0,
        // Whether this one was a per-date override rather than the scheduled
        // figure. Worth showing: it is the usual reason a line is not simply
        // the entry's amount times its count.
        edited: e.plannedAmount !== void 0 && e.plannedAmount !== e.amount,
      });
    });
    const rows = [...groups.values()].sort((a, b) => b.total - a.total || a.desc.localeCompare(b.desc));
    // Occurrences in date order within a row, because that is the only order
    // that reads as a history.
    rows.forEach((r) => r.occurrences.sort((a, b) => (a.month - b.month) || (a.day - b.day)));
    return {
      category,
      rows,
      total: rows.reduce((s, r) => s + r.total, 0),
      count: events.length,
    };
  }
