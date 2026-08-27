  // Extracted from app-data.js (round-9 AR4 remainder) — pure code motion.
  // Money is stored as integer cents everywhere at rest (state, localStorage,
  // the cloud payload) — see migrate.js's schema v8 migration, which also
  // defines dollarsToCents/centsToDollars (it needs them at module-load time,
  // before this file's consts would exist). roundMoney now rounds to the
  // nearest whole cent (an integer), not the nearest 1/100 of a dollar; the
  // two coincide at every existing call site since those are all
  // post-arithmetic "fold" points (proration, splits, percentages) that can
  // land on a fractional cent.
  const roundMoney = (n) => Math.round(Number(n) + Number.EPSILON);
  // One negative-number convention app-wide: a minus sign, never parentheses
  // (parens + red was double-encoding, and mixed with signed amounts elsewhere).
  // `n` is cents.
  const fmt = (n, showSign = false) => {
    if (n === void 0 || n === null || isNaN(n)) return "\u2014";
    const abs = Math.abs(centsToDollars(n)).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n < 0) return `-$${abs}`;
    if (showSign && n > 0) return `+$${abs}`;
    return `$${abs}`;
  };
  // Rolls over to millions rather than running the k tier forever — without
  // it a $15M axis tick reads "$15000k". (mini-recharts' own defaultFmt
  // already tiers this way; the charts pass this formatter instead, so it
  // needs to agree.)
  const fmtAxisK = (v) => {
    const d = Math.abs(centsToDollars(v));
    const sign = v < 0 ? "-$" : "$";
    // The zero line read "$0k" before — the suffix was unconditional.
    if (d === 0) return "$0";
    return d >= 1e6 ? sign + (d / 1e6).toFixed(1) + "M" : sign + (d / 1e3).toFixed(0) + "k";
  };
  // One download path for every export (CSV here, JSON backup in App.js and
  // Settings). The old inline version built a *detached* anchor and revoked
  // the object URL on the very next line — both are fine on desktop and both
  // are unreliable on mobile: some engines ignore a click on an element that
  // isn't in the document, and revoking synchronously can abort a download
  // that hasn't started yet. This appends the anchor, clicks it, and defers
  // the revoke past the navigation. It also reports failure instead of
  // silently doing nothing, which matters because Settings names local export
  // as the only backup path and the app nudges for one every 30 days.
  // Resolve a stored user id to a display name. Ids are what get stamped on
  // entries and overrides — names are editable in Settings, so a stored copy
  // would go stale the moment someone corrected theirs — and this is the one
  // place that turns one back into something to show.
  //
  // Returns "" when there is nobody to name: a legacy row with no author, a
  // household of one (where "by Ken" on every row is noise), or an id no
  // longer in the member list. Callers render nothing at all in that case
  // rather than "Unknown".
  function memberName(userId, members, opts = {}) {
    if (!userId || !Array.isArray(members) || members.length < 2 && !opts.always) return "";
    const m = members.find((x) => x && x.user_id === userId);
    if (!m) return "";
    if (opts.selfId && m.user_id === opts.selfId) return "you";
    return m.full_name || m.email || "";
  }
  function downloadBlob(filename, blob) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
          a.remove();
        } catch (e) {
          // The anchor may already be gone if the page navigated; nothing
          // to clean up and nothing the user needs to hear about.
        }
      }, 4e4);
      return true;
    } catch (e) {
      toast("Couldn't save the file on this device. Try again from a desktop browser.");
      return false;
    }
  }
  function downloadCSV(filename, rows, headers) {
    const esc = (v) => {
      const s = v === null || v === void 0 ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
    return downloadBlob(filename, new Blob([lines.join("\n")], { type: "text/csv" }));
  }
  function printView(title) {
    const prev = document.title;
    document.title = title;
    window.print();
    document.title = prev;
  }
  const ExportBar = ({ onAdd, onCSV, onPrint, style = {} }) => /* @__PURE__ */ React.createElement("div", { "data-noprint": true, style: __spreadValues({ display: "flex", gap: 6 }, style) }, onCSV && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCSV,
      title: "Export to CSV",
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 12 }),
    "CSV"
  ), onPrint && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onPrint,
      title: "Print / Save as PDF",
      className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "printer", size: 12 }),
    "PDF"
  ), onAdd && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onAdd,
      title: "Add Entry",
      className: "cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap"
    },
    "+ Add"
  ));
  function fmtVarRange(monthlyAmounts) {
    try {
      const vals = (Array.isArray(monthlyAmounts) ? monthlyAmounts : Object.values(monthlyAmounts || {})).map(Number).filter((v) => !isNaN(v)).map(centsToDollars);
      if (!vals.length) return "Variable";
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const k = (v) => v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1) + "k" : "$" + Math.round(v);
      return mn === mx ? "\u2248 " + k(mn) : k(mn) + "\u2013" + k(mx);
    } catch (err) {
      return "Variable";
    }
  }
