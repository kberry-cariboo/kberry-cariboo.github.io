  function EntryForm({ initial, onSave, onCancel, categories, templates = [], onSaveTemplate = null }) {
    var _a, _b, _c, _d, _e;
    const today = todayStr();
    const blank = {
      desc: "",
      type: "expense",
      amount: "",
      category: "",
      notes: "",
      startDate: today,
      repeats: false,
      recurEvery: 1,
      recurUnit: "month",
      recurDays: [],
      recurEnd: "",
      monthlyAmounts: null
    };
    const [f, setF] = useState(initial ? __spreadProps(__spreadValues({}, initial), {
      // Money is cents at rest; this form's fields are plain dollar text the
      // whole time it's open, converted back to cents only in handleSave.
      amount: String(centsToDollars(initial.amount)),
      monthlyAmounts: Array.isArray(initial.monthlyAmounts) ? initial.monthlyAmounts.map(centsToDollars) : null,
      recurEvery: (_a = initial.recurEvery) != null ? _a : 1,
      recurUnit: (_b = initial.recurUnit) != null ? _b : "month",
      recurDays: (_c = initial.recurDays) != null ? _c : [],
      recurEnd: (_d = initial.recurEnd) != null ? _d : "",
      repeats: (_e = initial.repeats) != null ? _e : false
    }) : blank);
    const [errors, setErrors] = useState({});
    const [showMonthly, setShowMonthly] = useState(!!(initial == null ? void 0 : initial.monthlyAmounts));
    const set = (patch) => setF((p) => __spreadValues(__spreadValues({}, p), patch));
    const startD = f.startDate ? parseDate(f.startDate) : null;
    const startWD = startD ? startD.getDay() : null;
    const setStartDate = (val) => {
      const d = parseDate(val);
      const wd = d ? d.getDay() : null;
      const newDays = f.recurUnit === "week" ? wd !== null ? [wd] : f.recurDays : f.recurDays;
      set({ startDate: val, recurDays: newDays });
    };
    const setUnit = (unit) => set({ recurUnit: unit, recurDays: unit === "week" && startWD !== null ? [startWD] : [] });
    const toggleWD = (wd) => {
      if (f.recurEvery > 1 || wd === startWD) return;
      const next = f.recurDays.includes(wd) ? f.recurDays.filter((d) => d !== wd) : [...f.recurDays, wd].sort((a, b) => a - b);
      set({ recurDays: next });
    };
    const recurSummary = () => {
      if (!f.repeats) return null;
      const e = f.recurEvery, u = f.recurUnit, until = f.recurEnd ? ` until ${f.recurEnd}` : " (ongoing)";
      if (u === "semimonth") return `Semi-monthly (1st & 15th pattern)${until}`;
      if (u === "day") return `Every ${e} day${e > 1 ? "s" : ""}${until}`;
      if (u === "month") return `Every ${e} month${e > 1 ? "s" : ""}${until}`;
      if (u === "year") return `Every ${e} year${e > 1 ? "s" : ""}${until}`;
      if (u === "week") {
        const days = (f.recurDays.length ? f.recurDays : [startWD]).filter(Boolean).map((d) => WEEKDAYS[d]).join(", ");
        return `Every ${e} week${e > 1 ? "s" : ""} on ${days}${until}`;
      }
      return "";
    };
    const validate = () => {
      const errs = {};
      if (!f.desc.trim()) errs.desc = "Description is required.";
      if (!f.category) errs.category = "Please select a category.";
      const amt = parseFloat(f.amount);
      if (isNaN(amt) || amt < 0) errs.amount = "Enter a valid amount ($0.00 or more).";
      if (amt === 0 && !f.notes.trim()) errs.notes = "A note is required when the amount is $0.00.";
      if (!f.startDate) errs.startDate = "Date is required.";
      if (f.repeats && f.recurEnd && f.startDate && f.recurEnd <= f.startDate) errs.recurEnd = "End date must be after start date.";
      setErrors(errs);
      return !Object.keys(errs).length;
    };
    const handleSave = () => {
      if (!validate()) return;
      const maDollars = showMonthly ? f.monthlyAmounts || Array(12).fill(parseFloat(f.amount) || 0) : null;
      onSave(__spreadProps(__spreadValues({}, f), {
        amount: dollarsToCents(f.amount),
        recurEvery: parseInt(f.recurEvery) || 1,
        monthlyAmounts: maDollars ? maDollars.map((v) => dollarsToCents(v)) : null,
        recurDays: f.recurUnit === "week" && startWD !== null ? [.../* @__PURE__ */ new Set([startWD, ...f.recurDays])].sort() : []
      }));
    };
    const inpCls = (hasErr) => "field-input" + (hasErr ? " field-error" : "");
    const lblCls = "field-label";
    const summary = recurSummary();
    return /* @__PURE__ */ React.createElement(React.Fragment, null, templates.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement(TemplatePicker, { templates, onSelect: (t) => {
      setF((p) => __spreadProps(__spreadValues({}, p), {
        desc: t.desc,
        type: t.type,
        amount: String(centsToDollars(t.amount)),
        category: t.category,
        repeats: t.repeats || false,
        recurEvery: t.recurEvery || 1,
        recurUnit: t.recurUnit || "month",
        recurDays: t.recurDays || [],
        notes: t.notes || ""
      }));
    } })), /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-desc" }, "Description", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "ef-desc",
        autoFocus: true,
        className: inpCls(errors.desc),
        value: f.desc,
        placeholder: "e.g. Mortgage payment",
        onChange: (e) => {
          set({ desc: e.target.value });
          if (errors.desc) setErrors((p) => __spreadProps(__spreadValues({}, p), { desc: void 0 }));
        }
      }
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.desc })), /* @__PURE__ */ React.createElement("div", { className: "entry-form-row2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-type" }, "Type"), /* @__PURE__ */ React.createElement("select", { id: "ef-type", className: inpCls(false), value: f.type, onChange: (e) => set({ type: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "income" }, "Income"), /* @__PURE__ */ React.createElement("option", { value: "expense" }, "Expense"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-amount" }, "Amount ($)", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "ef-amount",
        type: "number",
        inputMode: "decimal",
        step: "0.01",
        min: "0",
        className: inpCls(errors.amount),
        value: f.amount,
        placeholder: "0.00",
        onChange: (e) => {
          set({ amount: e.target.value });
          if (errors.amount) setErrors((p) => __spreadProps(__spreadValues({}, p), { amount: void 0 }));
        }
      }
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.amount })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-category" }, "Category", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement("select", { id: "ef-category", className: inpCls(errors.category), value: f.category, onChange: (e) => {
      set({ category: e.target.value });
      if (errors.category) setErrors((p) => __spreadProps(__spreadValues({}, p), { category: void 0 }));
    } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 Select category \u2014"), [...categories].sort((a, b) => a.localeCompare(b)).map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.category }))), /* @__PURE__ */ React.createElement("div", { className: "entry-form-date-row" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-160" }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-date" }, "Date", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "ef-date",
        type: "date",
        className: inpCls(errors.startDate),
        value: f.startDate,
        onChange: (e) => {
          setStartDate(e.target.value);
          if (errors.startDate) setErrors((p) => __spreadProps(__spreadValues({}, p), { startDate: void 0 }));
        }
      }
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.startDate })), /* @__PURE__ */ React.createElement("div", { className: "repeats-toggle-row" }, /* @__PURE__ */ React.createElement(Toggle, { value: f.repeats, onChange: (v) => set({ repeats: v }), label: "Repeats" }), f.repeats && summary && /* @__PURE__ */ React.createElement("span", { className: "recur-summary-chip" }, summary))), f.repeats && /* @__PURE__ */ React.createElement("div", { className: "recur-panel" }, /* @__PURE__ */ React.createElement("div", { className: "recur-panel-heading" }, "Recurrence Settings"), /* @__PURE__ */ React.createElement("div", { className: "recur-grid-2" }, f.recurUnit !== "semimonth" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-recur-every" }, "Every"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "ef-recur-every",
        type: "number",
        inputMode: "decimal",
        min: "1",
        max: "99",
        className: inpCls(errors.recurEvery),
        value: f.recurEvery,
        onChange: (e) => {
          const every = parseInt(e.target.value) || 1;
          set(
            f.recurUnit === "week" && every > 1 ? { recurEvery: every, recurDays: startWD !== null ? [startWD] : [] } : { recurEvery: every }
          );
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { gridColumn: f.recurUnit === "semimonth" ? "1 / -1" : "auto" } }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-recur-unit" }, "Period"), /* @__PURE__ */ React.createElement("select", { id: "ef-recur-unit", className: inpCls(false), value: f.recurUnit, onChange: (e) => setUnit(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "day" }, "Day(s)"), /* @__PURE__ */ React.createElement("option", { value: "week" }, "Week(s)"), /* @__PURE__ */ React.createElement("option", { value: "semimonth" }, "Semi-monthly (1st & 15th)"), /* @__PURE__ */ React.createElement("option", { value: "month" }, "Month(s)"), /* @__PURE__ */ React.createElement("option", { value: "year" }, "Year(s)")))), f.recurUnit === "week" && /* @__PURE__ */ React.createElement("div", { className: "mb-10" }, /* @__PURE__ */ React.createElement("label", { className: lblCls }, f.recurEvery > 1 ? "Fixed to start day" : "Weekday(s)"), /* @__PURE__ */ React.createElement("div", { className: "weekday-btn-row" }, WEEKDAYS.map((wd, i) => {
      const isAnch = i === startWD, isSel = f.recurDays.includes(i) || isAnch, isLock = isAnch || f.recurEvery > 1;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: wd,
          onClick: () => !isLock && toggleWD(i),
          className: "weekday-btn",
          style: {
            cursor: isLock ? "default" : "pointer",
            border: isAnch ? `2px solid var(--amber)` : "none",
            background: isSel ? isAnch ? "var(--primary)" : "var(--navyLt)" : "var(--border)",
            color: isSel ? "#fff" : "var(--textMid)",
            opacity: !isSel && isLock ? 0.4 : 1
          }
        },
        wd.slice(0, 2)
      );
    })), f.recurEvery === 1 && startWD !== null && /* @__PURE__ */ React.createElement("div", { className: "recur-hint" }, WEEKDAYS[startWD], " is locked to your start date."), f.recurEvery > 1 && /* @__PURE__ */ React.createElement("div", { className: "recur-hint-amber" }, "Every ", f.recurEvery, " weeks always lands on ", startWD !== null ? WEEKDAYS[startWD] : "the start day", ".")), f.recurUnit === "semimonth" && /* @__PURE__ */ React.createElement("div", { className: "recur-semimonth-desc" }, "Occurs on day ", /* @__PURE__ */ React.createElement("strong", null, (startD == null ? void 0 : startD.getDate()) || 1), " and day ", /* @__PURE__ */ React.createElement("strong", null, Math.min(((startD == null ? void 0 : startD.getDate()) || 1) + 14, 28)), " of each month."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-recur-until" }, "Until (optional)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "ef-recur-until",
        type: "date",
        className: inpCls(errors.recurEnd),
        value: f.recurEnd,
        min: f.startDate,
        onChange: (e) => {
          set({ recurEnd: e.target.value });
          if (errors.recurEnd) setErrors((p) => __spreadProps(__spreadValues({}, p), { recurEnd: void 0 }));
        }
      }
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.recurEnd }), /* @__PURE__ */ React.createElement("div", { className: "recur-hint" }, "Leave blank to recur indefinitely")), f.recurUnit === "month" && /* @__PURE__ */ React.createElement("div", { className: "monthly-toggle-wrap" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: showMonthly,
        onChange: (v) => {
          setShowMonthly(v);
          if (!v) set({ monthlyAmounts: null });
        },
        label: "Amount varies by month"
      }
    ), showMonthly && /* @__PURE__ */ React.createElement("div", { className: "mt-10" }, [0, 1].map((row) => /* @__PURE__ */ React.createElement("div", { key: row, className: "monthly-amounts-grid", style: { marginBottom: row === 0 ? 8 : 0 } }, MONTHS.slice(row * 6, row * 6 + 6).map((m, i) => {
      const mi = row * 6 + i;
      return /* @__PURE__ */ React.createElement("div", { key: m }, /* @__PURE__ */ React.createElement("div", { className: "month-amt-label" }, m), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          step: "0.01",
          className: "month-amt-input",
          value: (f.monthlyAmounts || Array(12).fill(f.amount || 0))[mi] || "",
          onChange: (ev) => {
            const ma = [...f.monthlyAmounts || Array(12).fill(parseFloat(f.amount) || 0)];
            ma[mi] = parseFloat(ev.target.value) || 0;
            set({ monthlyAmounts: ma });
          }
        }
      ));
    })))))), /* @__PURE__ */ React.createElement("div", { className: "mb-16" }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-notes" }, "Notes"), /* @__PURE__ */ React.createElement("input", { id: "ef-notes", className: inpCls(false), value: f.notes, placeholder: "Optional", onChange: (e) => set({ notes: e.target.value }) })), /* @__PURE__ */ React.createElement("div", { className: "oem-footer-row" }, onSaveTemplate && /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const amt = dollarsToCents(f.amount);
      onSaveTemplate({
        desc: f.desc,
        type: f.type,
        amount: amt,
        category: f.category,
        repeats: f.repeats,
        recurEvery: parseInt(f.recurEvery) || 1,
        recurUnit: f.recurUnit,
        recurDays: f.recurDays || [],
        notes: f.notes
      });
      toast(`Template "${f.desc || "Untitled"}" saved${templates.some((t) => t.desc === f.desc) ? " (replaced existing)" : ""}`);
    }, className: "ef-save-template" }, /* @__PURE__ */ React.createElement(Icon, { name: "save", size: 13 }), "Save as Template"), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary", onClick: onCancel }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--primary entry-form-save-btn", onClick: handleSave }, "Save Entry")));
  }
  function CSVImporter({ categories, onImport, onClose }) {
    const [rows, setRows] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [map, setMap] = useState({ desc: "", amount: "", date: "", type: "", category: "" });
    const [preview, setPreview] = useState([]);
    const [err, setErr] = useState("");
    const [done, setDone] = useState(false);
    const todayS = todayStr();
    const PROFILES_KEY = "cf_csvProfiles";
    const loadProfiles = () => {
      try {
        return JSON.parse(localStorage.getItem(PROFILES_KEY)) || {};
      } catch (e) {
        return {};
      }
    };
    const [profiles, setProfiles] = useState(loadProfiles);
    const [profName, setProfName] = useState("");
    const [appliedProf, setAppliedProf] = useState("");
    const persistProfiles = (next) => {
      setProfiles(next);
      try {
        localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
      } catch (e) {
      }
    };
    const profileFits = (p, h) => {
      const cols = Object.values(p.map || {}).filter(Boolean);
      return cols.length > 0 && cols.every((col) => h.includes(col));
    };
    const applyProfile = (name, h) => {
      const p = profiles[name];
      if (!p || !profileFits(p, h || headers)) return false;
      setMap({ desc: "", amount: "", date: "", type: "", category: "", ...p.map });
      setAppliedProf(name);
      setPreview([]);
      return true;
    };
    const saveProfile = () => {
      const name = profName.trim();
      if (!name) return;
      persistProfiles({ ...profiles, [name]: { map: { ...map }, sig: headers } });
      setAppliedProf(name);
      setProfName("");
    };
    const deleteProfile = (name) => {
      const next = { ...profiles };
      delete next[name];
      persistProfiles(next);
      if (appliedProf === name) setAppliedProf("");
    };
    const parseCSV = (text) => {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return { headers: [], rows: [] };
      const splitLine = (l) => {
        const out = [];
        let cur = "", q = false;
        for (const ch of l) {
          if (ch === '"') q = !q;
          else if (ch === "," && !q) {
            out.push(cur.trim());
            cur = "";
          } else cur += ch;
        }
        out.push(cur.trim());
        return out;
      };
      const hdrs = splitLine(lines[0]);
      const rws = lines.slice(1).map(splitLine).filter((r) => r.some((c) => c));
      return { headers: hdrs, rows: rws };
    };
    const handleFile = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setErr("");
      setDone(false);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const { headers: h, rows: r } = parseCSV(ev.target.result);
        if (!h.length) {
          setErr("Could not parse CSV \u2014 ensure the file has a header row.");
          return;
        }
        setHeaders(h);
        setRows(r);
        const guess = (name) => h.find((c) => c.toLowerCase().includes(name.toLowerCase())) || "";
        setMap({
          desc: guess("desc") || guess("name") || guess("memo") || guess("narr") || "",
          amount: guess("amount") || guess("debit") || guess("credit") || "",
          date: guess("date") || guess("time") || "",
          type: guess("type") || guess("debit") || "",
          category: guess("categ") || guess("tag") || ""
        });
        const saved = Object.entries(loadProfiles());
        const exact = saved.find(([, p]) => (p.sig || []).join("\x1F") === h.join("\x1F") && profileFits(p, h));
        const fit = exact || saved.find(([, p]) => profileFits(p, h));
        if (fit) {
          setMap({ desc: "", amount: "", date: "", type: "", category: "", ...fit[1].map });
          setAppliedProf(fit[0]);
        } else {
          setAppliedProf("");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    };
    const buildPreview = () => {
      if (!map.desc || !map.amount || !map.date) {
        setErr("Map at minimum: Description, Amount, and Date.");
        return;
      }
      const di = headers.indexOf(map.desc), ai = headers.indexOf(map.amount);
      const dti = headers.indexOf(map.date), ti = headers.indexOf(map.type);
      const ci = headers.indexOf(map.category);
      const prev = rows.slice(0, 5).map((r) => {
        const rawAmt = parseFloat((r[ai] || "").replace(/[$,]/g, ""));
        const amt = isNaN(rawAmt) ? 0 : roundMoney(Math.abs(rawAmt));
        const raw = r[dti] || todayS;
        const parsed = new Date(raw);
        const dateStr = isNaN(parsed) ? todayS : localDateStr(parsed);
        const typeGuess = ti > -1 ? (r[ti] || "").toLowerCase().includes("credit") || rawAmt > 0 ? "income" : "expense" : rawAmt >= 0 ? "income" : "expense";
        return {
          desc: r[di] || "(no description)",
          amount: amt,
          startDate: dateStr,
          type: typeGuess,
          category: ci > -1 ? r[ci] : "Uncategorized",
          notes: ""
        };
      });
      setPreview(prev);
      setErr("");
    };
    const doImport = () => {
      const di = headers.indexOf(map.desc), ai = headers.indexOf(map.amount);
      const dti = headers.indexOf(map.date), ti = headers.indexOf(map.type);
      const ci = headers.indexOf(map.category);
      const imported = rows.map((r, idx) => {
        const rawAmt = parseFloat((r[ai] || "").replace(/[$,]/g, ""));
        const amt = isNaN(rawAmt) ? 0 : dollarsToCents(Math.abs(rawAmt));
        const raw = r[dti] || todayS;
        const parsed = new Date(raw);
        const dateStr = isNaN(parsed) ? todayS : localDateStr(parsed);
        const typeGuess = ti > -1 ? (r[ti] || "").toLowerCase().includes("credit") || rawAmt > 0 ? "income" : "expense" : rawAmt >= 0 ? "income" : "expense";
        const cat = ci > -1 ? r[ci] : "Uncategorized";
        return {
          id: Date.now() + idx,
          desc: r[di] || "Imported",
          amount: amt,
          startDate: dateStr,
          type: typeGuess,
          category: cat,
          notes: "",
          repeats: false,
          recurEvery: 1,
          recurUnit: "month",
          recurDays: [],
          recurEnd: ""
        };
      }).filter((e) => e.amount > 0 || e.desc !== "Imported");
      onImport(imported);
      setDone(true);
    };
    const sel = (field, label, required = false) => /* @__PURE__ */ React.createElement("div", { className: "mb-10" }, /* @__PURE__ */ React.createElement("label", { htmlFor: `csv-map-${field}`, className: "csv-sel-label" }, label, required && /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: `csv-map-${field}`,
        value: map[field],
        onChange: (e) => setMap((m) => __spreadProps(__spreadValues({}, m), { [field]: e.target.value })),
        className: "csv-select-input csv-select-input--full"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 not mapped \u2014"),
      headers.map((h) => /* @__PURE__ */ React.createElement("option", { key: h, value: h }, h))
    ));
    return /* @__PURE__ */ React.createElement("div", { className: "csv-importer-card" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "csv-title" }, "\u2B06 Import from CSV"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": "Close", title: "Close", className: "shortcuts-close" }, "\u2715")), !rows.length && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "csv-instructions" }, "Upload a CSV file from your bank or spreadsheet. The file must have a header row. Required columns: ", /* @__PURE__ */ React.createElement("strong", null, "Description"), ", ", /* @__PURE__ */ React.createElement("strong", null, "Amount"), ", ", /* @__PURE__ */ React.createElement("strong", null, "Date"), "."), /* @__PURE__ */ React.createElement("label", { className: "cf-btn cf-btn--primary cf-btn--upload" }, "Choose CSV File", /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".csv,text/csv", className: "hidden", onChange: handleFile }))), rows.length > 0 && !done && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "csv-success-text" }, "\u2713 Loaded ", rows.length, " rows. Map your columns:"), appliedProf && /* @__PURE__ */ React.createElement("div", { className: "csv-applied-text" }, "Applied saved mapping ", /* @__PURE__ */ React.createElement("strong", { className: "c-text" }, appliedProf), " ", /* @__PURE__ */ React.createElement("button", { onClick: () => deleteProfile(appliedProf), title: "Forget this saved mapping", className: "csv-forget-btn" }, "forget")), /* @__PURE__ */ React.createElement("div", { className: "csv-mapping-row" }, Object.keys(profiles).length > 0 && /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": "Apply saved mapping",
        value: "",
        onChange: (e) => {
          if (e.target.value) applyProfile(e.target.value);
        },
        className: "csv-select-input"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Apply saved mapping\u2026"),
      Object.keys(profiles).sort().map((n) => /* @__PURE__ */ React.createElement("option", { key: n, value: n, disabled: !profileFits(profiles[n], headers) }, n, profileFits(profiles[n], headers) ? "" : " (columns don't match)"))
    ), /* @__PURE__ */ React.createElement("input", {
      value: profName,
      onChange: (e) => setProfName(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter") saveProfile();
      },
      placeholder: 'Name this mapping (e.g. "RBC chequing")',
      "aria-label": "Mapping name",
      className: "csv-select-input csv-name-input"
    }), /* @__PURE__ */ React.createElement("button", { onClick: saveProfile, disabled: !profName.trim(), className: "cf-btn cf-btn--secondary cf-btn--csvsave" }, "Save mapping")),/* @__PURE__ */ React.createElement("div", { className: "csv-field-grid" }, sel("desc", "Description", true), sel("amount", "Amount", true), sel("date", "Date", true), sel("type", "Type (income/expense)"), sel("category", "Category")), err && /* @__PURE__ */ React.createElement("div", { className: "csv-error-text" }, err), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 mt-8" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: buildPreview,
        className: "csv-preview-btn"
      },
      "Preview"
    ), preview.length > 0 && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: doImport,
        className: "csv-import-btn"
      },
      "Import ",
      rows.length,
      " Entries"
    )), preview.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-12" }, /* @__PURE__ */ React.createElement("div", { className: "csv-preview-label" }, "Preview (first ", Math.min(5, rows.length), " rows):"), preview.map((p, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "csv-preview-row" }, /* @__PURE__ */ React.createElement("span", { className: "csv-preview-desc" }, p.desc), /* @__PURE__ */ React.createElement("span", { className: "csv-preview-amt", style: { color: p.type === "income" ? "var(--greenDk)" : "var(--red)" } }, p.type === "income" ? "+" : "-", p.amount.toFixed(2)), /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, p.startDate), /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, p.category))))), done && /* @__PURE__ */ React.createElement("div", { className: "csv-done-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "csv-done-icon" }, "\u2705"), /* @__PURE__ */ React.createElement("div", { className: "csv-done-text" }, "Import complete!"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "cf-btn cf-btn--primary cf-btn--md mt-12" }, "Done")));
  }
  function ContextMenu({ x, y, items, onClose }) {
    const menuRef = useRef(null);
    useEffect(() => {
      const h = (e) => {
        if (e.button !== 2 && menuRef.current && !menuRef.current.contains(e.target)) onClose();
      };
      const k = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("mousedown", h);
      window.addEventListener("touchstart", h, { passive: true });
      window.addEventListener("keydown", k);
      return () => {
        window.removeEventListener("mousedown", h);
        window.removeEventListener("touchstart", h);
        window.removeEventListener("keydown", k);
      };
    }, [onClose]);
    const isTouch = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
    // Position from the menu's real rendered size, not a guessed row height —
    // clamped after first paint so the last items can't land off-screen.
    const [pos, setPos] = useState({ x, y });
    useLayoutEffect(() => {
      const el = menuRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        x: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
        y: Math.max(8, Math.min(y, window.innerHeight - r.height - 8))
      });
    }, [x, y, items.length]);
    const ax = pos.x, ay = pos.y;
    if (isTouch) {
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "ctx-menu-backdrop",
          onClick: onClose,
          onContextMenu: (e) => e.preventDefault()
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            ref: menuRef,
            className: "modal-card ctx-menu-sheet",
            onClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement("div", { className: "ctx-menu-handle" }),
          items.map((item, i) => item === "---" ? /* @__PURE__ */ React.createElement("div", { key: i, className: "ctx-menu-divider--touch" }) : /* @__PURE__ */ React.createElement(
            "button",
            {
              key: i,
              onClick: () => {
                item.action();
                onClose();
              },
              className: "ctx-menu-item--touch",
              style: {
                color: item.danger ? "var(--red)" : "var(--text)"
              }
            },
            /* @__PURE__ */ React.createElement("span", { className: "ctx-menu-icon--touch" }, item.icon),
            item.label
          ))
        )
      );
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: menuRef,
        className: "ctx-menu-desktop",
        style: { left: ax, top: ay },
        onContextMenu: (e) => e.preventDefault(),
        onClick: (e) => e.stopPropagation()
      },
      items.map(
        (item, i) => item === "---" ? /* @__PURE__ */ React.createElement("div", { key: i, className: "ctx-menu-divider" }) : /* @__PURE__ */ React.createElement(
          "button",
          {
            key: i,
            onClick: () => {
              item.action();
              onClose();
            },
            className: "ctx-menu-item",
            style: {
              color: item.danger ? "var(--red)" : "var(--text)"
            }
          },
          /* @__PURE__ */ React.createElement("span", { className: "ctx-menu-icon" }, item.icon),
          item.label
        )
      )
    );
  }
  function FilterPill({ label, options, selected, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const h = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      window.addEventListener("mousedown", h);
      return () => window.removeEventListener("mousedown", h);
    }, []);
    const allSel = selected.length === 0;
    const label2 = allSel ? label : `${label} (${selected.length})`;
    return /* @__PURE__ */ React.createElement("div", { ref, className: "relative shrink-0" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        "aria-expanded": open,
        className: "filter-pill-btn",
        style: {
          border: "1.5px solid " + (allSel ? "var(--border)" : "var(--primary)"),
          background: allSel ? "var(--bgCard)" : "rgba(28,43,58,0.07)",
          color: allSel ? "var(--text)" : "var(--primary)",
          fontWeight: allSel ? 400 : 600
        }
      },
      label2,
      /* @__PURE__ */ React.createElement("span", { className: "filter-pill-chevron" }, open ? "\u25B2" : "\u25BC")
    ), open && /* @__PURE__ */ React.createElement("div", { className: "filter-pill-dropdown" }, /* @__PURE__ */ React.createElement(
      "label",
      {
        className: "filter-pill-all-row"
      },
      /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: allSel, onChange: () => onChange([]), className: "filter-pill-checkbox" }),
      "All ",
      label,
      "s"
    ), options.map((o) => {
      const sel = selected.includes(o.value);
      return /* @__PURE__ */ React.createElement(
        "label",
        {
          key: o.value,
          className: "filter-pill-option-row",
          style: {
            background: sel ? "rgba(28,43,58,0.05)" : "transparent"
          }
        },
        /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: sel, onChange: () => onChange(sel ? selected.filter((x) => x !== o.value) : [...selected, o.value]), className: "filter-pill-checkbox" }),
        o.label
      );
    })));
  }
