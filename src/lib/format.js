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
  const fmtAxisK = (v) => (v < 0 ? "-$" : "$") + (Math.abs(centsToDollars(v)) / 1e3).toFixed(0) + "k";
  function downloadCSV(filename, rows, headers) {
    const esc = (v) => {
      const s = v === null || v === void 0 ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function printView(title) {
    const prev = document.title;
    document.title = title;
    window.print();
    document.title = prev;
  }
  const ExportBar = ({ onAdd, onCSV, onPrint, style = {} }) => /* @__PURE__ */ React.createElement("div", { "data-noprint": true, style: __spreadValues({ display: "flex", gap: 6 }, style) }, onAdd && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onAdd,
      title: "Add Entry",
      className: "cf-btn cf-btn--primary exportbar-add-btn", style: { fontSize: 11, padding: "4px 12px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }
    },
    "+ Add"
  ), onCSV && /* @__PURE__ */ React.createElement(
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
  ));
  function fmtVarRange(monthlyAmounts) {
    try {
      const vals = (Array.isArray(monthlyAmounts) ? monthlyAmounts : Object.values(monthlyAmounts || {})).map(Number).filter((v) => !isNaN(v)).map(centsToDollars);
      if (!vals.length) return "Variable";
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const k = (v) => v >= 1e3 ? "$" + (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1) + "k" : "$" + Math.round(v);
      return mn === mx ? "\u2248 " + k(mn) : k(mn) + "\u2013" + k(mx);
    } catch (err) {
      return "Variable";
    }
  }
