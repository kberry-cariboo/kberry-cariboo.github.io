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
  // The household's currency and number formatting. Pushed in from App the
  // same way holidays are (setStoredHolidays) — fmt() is called from about
  // ninety places, none of which have access to React state, and threading a
  // formatter through all of them would be a much larger change than the
  // feature is worth.
  //
  // Only 2-decimal currencies are offered. Money is integer cents everywhere
  // at rest, so a 0-decimal currency (yen) or a 3-decimal one (dinar) would
  // need the storage model changed, not just the formatting — offering one
  // here would produce amounts that are quietly wrong by a factor of ten.
  const CURRENCIES = [
    { code: "CAD", name: "Canadian dollar" },
    { code: "USD", name: "US dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "Pound sterling" },
    { code: "AUD", name: "Australian dollar" },
    { code: "NZD", name: "New Zealand dollar" },
    { code: "CHF", name: "Swiss franc" },
    { code: "SEK", name: "Swedish krona" },
    { code: "NOK", name: "Norwegian krone" },
    { code: "DKK", name: "Danish krone" },
    { code: "PLN", name: "Polish z\u0142oty" },
    { code: "MXN", name: "Mexican peso" },
    { code: "BRL", name: "Brazilian real" },
    { code: "ZAR", name: "South African rand" },
    { code: "INR", name: "Indian rupee" },
    { code: "SGD", name: "Singapore dollar" },
    { code: "HKD", name: "Hong Kong dollar" }
  ];
  // Number formatting only — which separators go where. Kept deliberately
  // short and described by what each one looks like rather than by country,
  // because that is the actual choice being made: someone in Ireland wanting
  // 1.234,56 should not have to know which locale tag produces it.
  const NUMBER_LOCALES = [
    { code: "en-CA", name: "1,234.56  (comma / point)" },
    { code: "de-DE", name: "1.234,56  (point / comma)" },
    { code: "fr-FR", name: "1 234,56  (space / comma)" },
    { code: "en-IN", name: "1,23,456.78  (Indian grouping)" },
    { code: "de-CH", name: "1\u2019234.56  (apostrophe / point)" }
  ];
  const DEFAULT_CURRENCY = "CAD";
  const DEFAULT_LOCALE = "en-CA";
  let _money = { locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY, symbol: "$", nf: null };
  // The symbol on its own, which is what the app's own sign convention needs:
  // a leading minus, then the symbol, then the grouped number. Intl's
  // style:"currency" puts the sign wherever the locale wants it and would
  // give three different shapes across the app's tiles and tables.
  function currencySymbol(locale, currency) {
    try {
      const parts = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0);
      const sym = parts.find((p) => p.type === "currency");
      if (sym && sym.value) return sym.value;
    } catch (e) {
      // An unsupported locale/currency pair, or an engine without
      // narrowSymbol: fall through to the code itself, which is always
      // intelligible even if it isn't pretty.
    }
    return currency + "\u00a0";
  }
  function setMoneyFormat(locale, currency) {
    const loc = locale || DEFAULT_LOCALE;
    const cur = currency || DEFAULT_CURRENCY;
    if (_money.locale === loc && _money.currency === cur && _money.nf) return;
    let nf = null;
    try {
      nf = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      // A locale tag the engine doesn't know must not take the app down; the
      // default grouping is still readable.
      try {
        nf = new Intl.NumberFormat(DEFAULT_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } catch (e2) {
        nf = null;
      }
    }
    _money = { locale: loc, currency: cur, symbol: currencySymbol(loc, cur), nf };
  }
  setMoneyFormat(DEFAULT_LOCALE, DEFAULT_CURRENCY);
  // The bare symbol, for the handful of places that put one beside an input
  // rather than formatting a number — the alert threshold, an opening balance,
  // a goal target. They were literal "$" characters, which is how a household
  // set to euros ends up typing into a box labelled with a dollar sign.
  const moneySymbol = () => _money.symbol;
  const fmt = (n, showSign = false) => {
    if (n === void 0 || n === null || isNaN(n)) return "\u2014";
    const d = Math.abs(centsToDollars(n));
    const abs = _money.nf ? _money.nf.format(d) : d.toFixed(2);
    const sym = _money.symbol;
    if (n < 0) return `-${sym}${abs}`;
    if (showSign && n > 0) return `+${sym}${abs}`;
    return `${sym}${abs}`;
  };
  // Rolls over to millions rather than running the k tier forever — without
  // it a $15M axis tick reads "$15000k". (mini-recharts' own defaultFmt
  // already tiers this way; the charts pass this formatter instead, so it
  // needs to agree.)
  const fmtAxisK = (v) => {
    const d = Math.abs(centsToDollars(v));
    const sign = (v < 0 ? "-" : "") + _money.symbol;
    // The zero line read "$0k" before — the suffix was unconditional.
    if (d === 0) return _money.symbol + "0";
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
      const k = (v) => v >= 1e6 ? _money.symbol + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? _money.symbol + (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1) + "k" : _money.symbol + Math.round(v);
      return mn === mx ? "\u2248 " + k(mn) : k(mn) + "\u2013" + k(mx);
    } catch (err) {
      return "Variable";
    }
  }
