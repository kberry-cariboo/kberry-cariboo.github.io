  // Minimal, dependency-free CSV parser (RFC 4180-ish): handles quoted
  // fields with embedded commas/newlines and doubled-quote escapes, since
  // real bank exports routinely quote the description column. A naive
  // text.split(",").split("\n") breaks the moment a description contains a
  // comma — which for a "Vendor, Inc." style payee is common enough to matter.
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else inQuotes = false;
        } else field += c;
        continue;
      }
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.map((r) => r.map((f) => f.trim()));
  }
  // Tries the unambiguous ISO/slash forms first, then MM/DD/YYYY (the more
  // common bank-export convention), then falls back to native Date parsing
  // for anything else (e.g. "Jan 5, 2026") — this is a best-effort guess the
  // user reviews in the preview table before anything is imported, not a
  // silent authority, so an occasional wrong guess is recoverable by editing
  // the mapped column or fixing the row afterward in the register.
  function parseCsvDate(str) {
    const s = (str || "").trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return `${m[3]}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return localDateStr(d);
    return null;
  }
  // Strips currency symbols/thousands separators; treats parenthesized
  // amounts ("($42.50)") as negative, matching common statement formatting.
  function parseCsvAmount(str) {
    let s = (str || "").trim();
    if (!s) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) {
      neg = true;
      s = s.slice(1, -1);
    }
    s = s.replace(/[^0-9.-]/g, "");
    if (s.startsWith("-")) {
      neg = true;
      s = s.slice(1);
    }
    if (!s) return null;
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    return neg ? -n : n;
  }
  const CSV_DATE_HINTS = ["date", "posted", "transaction date", "post date"];
  const CSV_DESC_HINTS = ["description", "memo", "payee", "name", "merchant"];
  const CSV_AMOUNT_HINTS = ["amount", "value"];
  const CSV_DEBIT_HINTS = ["debit", "withdrawal", "money out"];
  const CSV_CREDIT_HINTS = ["credit", "deposit", "money in"];
  function guessColumn(headers, hints) {
    const lower = headers.map((h) => (h || "").toLowerCase());
    for (const hint of hints) {
      const idx = lower.findIndex((h) => h === hint);
      if (idx >= 0) return idx;
    }
    for (const hint of hints) {
      const idx = lower.findIndex((h) => h.includes(hint));
      if (idx >= 0) return idx;
    }
    return -1;
  }
  // Bank CSV → one-time entries. Three steps: pick a file, confirm which
  // columns are date/description/amount (pre-guessed from the header row),
  // then review a preview (with likely duplicates flagged against existing
  // entries) before anything is actually added.
  function CsvImportModal({ show, onClose, onImport, categories = [], existingEntries = [] }) {
    const [step, setStep] = useState("upload");
    const [fileName, setFileName] = useState("");
    const [headers, setHeaders] = useState([]);
    const [dataRows, setDataRows] = useState([]);
    const [parseErr, setParseErr] = useState("");
    const [dateCol, setDateCol] = useState(-1);
    const [descCol, setDescCol] = useState(-1);
    const [amountMode, setAmountMode] = useState("single");
    const [amountCol, setAmountCol] = useState(-1);
    const [debitCol, setDebitCol] = useState(-1);
    const [creditCol, setCreditCol] = useState(-1);
    const [flipSign, setFlipSign] = useState(false);
    // Bank exports are overwhelmingly expenses, so default to "Other" (never
    // the raw categories[0] — that's "Income" in the app's own default list,
    // a bad first guess for a pile of card transactions) when it exists,
    // otherwise fall back to whatever's alphabetically first.
    const [category, setCategory] = useState(() => {
      if (categories.includes("Other")) return "Other";
      const sorted = [...categories].sort((a, b) => a.localeCompare(b));
      return sorted[0] || "";
    });
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [excludedRows, setExcludedRows] = useState(() => /* @__PURE__ */ new Set());
    const reset = () => {
      setStep("upload");
      setFileName("");
      setHeaders([]);
      setDataRows([]);
      setParseErr("");
      setDateCol(-1);
      setDescCol(-1);
      setAmountMode("single");
      setAmountCol(-1);
      setDebitCol(-1);
      setCreditCol(-1);
      setFlipSign(false);
      setExcludedRows(/* @__PURE__ */ new Set());
    };
    const close = () => {
      reset();
      onClose();
    };
    const handleFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rows = parseCSV(String(ev.target.result || ""));
          if (rows.length < 2) {
            setParseErr("That file doesn't look like a CSV with a header row and at least one data row.");
            return;
          }
          const [hdr, ...rest] = rows;
          setHeaders(hdr);
          setDataRows(rest);
          setParseErr("");
          setDateCol(guessColumn(hdr, CSV_DATE_HINTS));
          setDescCol(guessColumn(hdr, CSV_DESC_HINTS));
          const guessedAmount = guessColumn(hdr, CSV_AMOUNT_HINTS);
          const guessedDebit = guessColumn(hdr, CSV_DEBIT_HINTS);
          const guessedCredit = guessColumn(hdr, CSV_CREDIT_HINTS);
          if (guessedAmount < 0 && (guessedDebit >= 0 || guessedCredit >= 0)) {
            setAmountMode("split");
            setDebitCol(guessedDebit);
            setCreditCol(guessedCredit);
          } else {
            setAmountMode("single");
            setAmountCol(guessedAmount);
          }
          setFileName(file.name);
          setStep("map");
        } catch (err) {
          setParseErr("Couldn't read that file: " + (err.message || "unknown error"));
        }
      };
      reader.onerror = () => setParseErr("Couldn't read that file.");
      reader.readAsText(file);
    };
    // Every parsed row, with its resolved date/desc/amount/type and a
    // best-effort duplicate flag (same date + same absolute amount already
    // present as a one-time entry) — computed fresh each time the mapping
    // changes so the preview always reflects the current column choices.
    const parsedRows = useMemo(() => {
      if (step !== "preview" && step !== "map") return [];
      const existingKeys = /* @__PURE__ */ new Set(
        existingEntries.filter((e) => !e.repeats).map((e) => `${e.startDate}|${Math.abs(e.amount)}`)
      );
      return dataRows.map((r, i) => {
        const date = dateCol >= 0 ? parseCsvDate(r[dateCol]) : null;
        const desc = descCol >= 0 ? (r[descCol] || "").trim() : "";
        let rawAmount = null;
        if (amountMode === "single") {
          rawAmount = amountCol >= 0 ? parseCsvAmount(r[amountCol]) : null;
          if (rawAmount != null && flipSign) rawAmount = -rawAmount;
        } else {
          const debit = debitCol >= 0 ? parseCsvAmount(r[debitCol]) : null;
          const credit = creditCol >= 0 ? parseCsvAmount(r[creditCol]) : null;
          if (credit) rawAmount = Math.abs(credit);
          else if (debit) rawAmount = -Math.abs(debit);
        }
        const type = rawAmount != null && rawAmount >= 0 ? "income" : "expense";
        const amountCents = rawAmount != null ? dollarsToCents(Math.abs(rawAmount)) : null;
        const valid = !!date && !!desc && rawAmount != null;
        const isDuplicate = valid && existingKeys.has(`${date}|${amountCents}`);
        return { i, date, desc, amountCents, type, valid, isDuplicate };
      });
    }, [dataRows, dateCol, descCol, amountMode, amountCol, debitCol, creditCol, flipSign, step, existingEntries]);
    // All hooks must run before this — React requires the same hooks in the
    // same order on every render, so the early return for a closed modal has
    // to come after every useState/useMemo above, not before.
    if (!show) return null;
    const toggleExcluded = (i) => setExcludedRows((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
    const rowsToImport = parsedRows.filter((r) => r.valid && !excludedRows.has(r.i) && !(skipDuplicates && r.isDuplicate));
    const doImport = () => {
      const newEntries = rowsToImport.map((r) => ({
        id: genId(),
        desc: r.desc,
        type: r.type,
        amount: r.amountCents,
        category,
        notes: "",
        startDate: r.date,
        repeats: false,
        recurEvery: 1,
        recurUnit: "month",
        recurDays: [],
        recurEnd: "",
        monthlyAmounts: null,
        importedFrom: fileName || "CSV"
      }));
      onImport(newEntries);
      toast(`Imported ${newEntries.length} entr${newEntries.length === 1 ? "y" : "ies"} from ${fileName}`);
      close();
    };
    const colOptions = (value, onChange, placeholder) => /* @__PURE__ */ React.createElement(
      "select",
      { className: "field-input", value, onChange: (e) => onChange(parseInt(e.target.value, 10)) },
      /* @__PURE__ */ React.createElement("option", { value: -1 }, placeholder),
      headers.map((h, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i }, h || `Column ${i + 1}`))
    );
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Import CSV"
      },
      /* @__PURE__ */ React.createElement("div", { className: "modal-card csvimport-modal-card", onClick: (e) => e.stopPropagation() },
        /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg", style: { marginBottom: 0 } }, "Import CSV"), /* @__PURE__ */ React.createElement("button", { onClick: close, "aria-label": "Close", className: "fab-panel-close" }, "✕")),
        step === "upload" && /* @__PURE__ */ React.createElement(React.Fragment, null,
          /* @__PURE__ */ React.createElement("div", { className: "txl mb-16" }, "Import transactions from your bank's CSV export as one-time entries. You'll map the columns and review everything before it's added."),
          /* @__PURE__ */ React.createElement("label", { className: "csvimport-drop-zone" },
            /* @__PURE__ */ React.createElement(Icon, { name: "upload", size: 22 }),
            /* @__PURE__ */ React.createElement("span", null, "Choose a CSV file"),
            /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".csv,text/csv", className: "hidden", onChange: (e) => handleFile(e.target.files[0]) })
          ),
          parseErr && /* @__PURE__ */ React.createElement("div", { className: "field-error-text mt-8" }, parseErr)
        ),
        step === "map" && /* @__PURE__ */ React.createElement(React.Fragment, null,
          /* @__PURE__ */ React.createElement("div", { className: "txl mb-14" }, fileName, " — ", dataRows.length, " row", dataRows.length !== 1 ? "s" : "", ". Confirm which columns to use:"),
          /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Date column"), colOptions(dateCol, setDateCol, "— Select —")),
          /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Description column"), colOptions(descCol, setDescCol, "— Select —")),
          /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement(PillToggle, {
            options: [{ id: "single", label: "One amount column" }, { id: "split", label: "Separate debit / credit" }],
            value: amountMode,
            onChange: setAmountMode
          })),
          amountMode === "single" ? /* @__PURE__ */ React.createElement(React.Fragment, null,
            /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Amount column"), colOptions(amountCol, setAmountCol, "— Select —")),
            /* @__PURE__ */ React.createElement(Toggle, { value: flipSign, onChange: setFlipSign, label: "Flip sign (negative = income)" })
          ) : /* @__PURE__ */ React.createElement("div", { className: "entry-form-row2" },
            /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Debit (money out) column"), colOptions(debitCol, setDebitCol, "— Select —")),
            /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Credit (money in) column"), colOptions(creditCol, setCreditCol, "— Select —"))
          ),
          /* @__PURE__ */ React.createElement("div", { className: "mt-12" }, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Category for imported entries"),
            /* @__PURE__ */ React.createElement("select", { className: "field-input", value: category, onChange: (e) => setCategory(e.target.value) },
              [...categories].sort((a, b) => a.localeCompare(b)).map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))
            ),
            /* @__PURE__ */ React.createElement("div", { className: "field-hint-text" }, "Applied to every imported row — recategorize individual entries afterward in Entries.")
          ),
          /* @__PURE__ */ React.createElement("div", { className: "oem-footer-row" },
            /* @__PURE__ */ React.createElement("button", { onClick: () => setStep("upload"), className: "cf-btn cf-btn--secondary", style: { marginRight: "auto" } }, "← Back"),
            /* @__PURE__ */ React.createElement("button", { onClick: close, className: "cf-btn cf-btn--secondary" }, "Cancel"),
            /* @__PURE__ */ React.createElement(
              "button",
              {
                onClick: () => setStep("preview"),
                disabled: dateCol < 0 || descCol < 0 || (amountMode === "single" ? amountCol < 0 : debitCol < 0 && creditCol < 0) || !category,
                className: "cf-btn cf-btn--primary btn-pad-24"
              },
              "Preview →"
            )
          )
        ),
        step === "preview" && /* @__PURE__ */ React.createElement(React.Fragment, null,
          /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-12" },
            /* @__PURE__ */ React.createElement("span", { className: "txl" }, rowsToImport.length, " of ", parsedRows.length, " row", parsedRows.length !== 1 ? "s" : "", " will be imported"),
            /* @__PURE__ */ React.createElement("label", { className: "cf-row cf-gap-6", style: { fontSize: 12 } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: skipDuplicates, onChange: (e) => setSkipDuplicates(e.target.checked) }), "Skip likely duplicates")
          ),
          /* @__PURE__ */ React.createElement("div", { className: "hscroll csvimport-preview-wrap", role: "region", "aria-label": "Import preview" },
            /* @__PURE__ */ React.createElement("table", { className: "forecast-table" },
              /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, ["", "Date", "Description", "Amount", "Type"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, className: "forecast-th" }, h)))),
              /* @__PURE__ */ React.createElement("tbody", null, parsedRows.map((r) => {
                const excluded = excludedRows.has(r.i) || (skipDuplicates && r.isDuplicate) || !r.valid;
                return /* @__PURE__ */ React.createElement("tr", { key: r.i, className: "forecast-tr", style: { opacity: excluded ? 0.45 : 1 } },
                  /* @__PURE__ */ React.createElement("td", null, r.valid && /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !excludedRows.has(r.i) && !(skipDuplicates && r.isDuplicate), disabled: skipDuplicates && r.isDuplicate, onChange: () => toggleExcluded(r.i) })),
                  /* @__PURE__ */ React.createElement("td", { className: "forecast-td-date" }, r.date || "—"),
                  /* @__PURE__ */ React.createElement("td", { className: "forecast-desc-cell" }, r.desc || "—", !r.valid && /* @__PURE__ */ React.createElement("span", { className: "field-error-text" }, " Couldn't parse this row"), r.isDuplicate && /* @__PURE__ */ React.createElement("span", { className: "yoy-tag yoy-tag--gone" }, "Possible duplicate")),
                  /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13" }, r.amountCents != null ? fmt(r.amountCents) : "—"),
                  /* @__PURE__ */ React.createElement("td", null, r.type)
                );
              }))
            )
          ),
          /* @__PURE__ */ React.createElement("div", { className: "oem-footer-row" },
            /* @__PURE__ */ React.createElement("button", { onClick: () => setStep("map"), className: "cf-btn cf-btn--secondary", style: { marginRight: "auto" } }, "← Back"),
            /* @__PURE__ */ React.createElement("button", { onClick: close, className: "cf-btn cf-btn--secondary" }, "Cancel"),
            /* @__PURE__ */ React.createElement(
              "button",
              { onClick: doImport, disabled: rowsToImport.length === 0, className: "cf-btn cf-btn--primary btn-pad-24" },
              `Import ${rowsToImport.length} entr${rowsToImport.length === 1 ? "y" : "ies"}`
            )
          )
        )
      )
    );
  }
