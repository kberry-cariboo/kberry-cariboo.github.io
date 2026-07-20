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
      amount: String(initial.amount),
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
      const ma = showMonthly ? f.monthlyAmounts || Array(12).fill(parseFloat(f.amount) || 0) : null;
      onSave(__spreadProps(__spreadValues({}, f), {
        amount: parseFloat(f.amount),
        recurEvery: parseInt(f.recurEvery) || 1,
        monthlyAmounts: ma,
        recurDays: f.recurUnit === "week" && startWD !== null ? [.../* @__PURE__ */ new Set([startWD, ...f.recurDays])].sort() : []
      }));
    };
    const inpCls = (hasErr) => "field-input" + (hasErr ? " field-error" : "");
    const lblCls = "field-label";
    const summary = recurSummary();
    return /* @__PURE__ */ React.createElement(Card, { style: { marginBottom: 20, background: "var(--stripe)" } }, templates.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement(TemplatePicker, { templates, onSelect: (t) => {
      setF((p) => __spreadProps(__spreadValues({}, p), {
        desc: t.desc,
        type: t.type,
        amount: String(t.amount),
        category: t.category,
        repeats: t.repeats || false,
        recurEvery: t.recurEvery || 1,
        recurUnit: t.recurUnit || "month",
        recurDays: t.recurDays || [],
        notes: t.notes || ""
      }));
    } })), /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-desc" }, "Description *"), /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.desc })), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }, className: "entry-form-row2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-type" }, "Type"), /* @__PURE__ */ React.createElement("select", { id: "ef-type", className: inpCls(false), value: f.type, onChange: (e) => set({ type: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "income" }, "Income"), /* @__PURE__ */ React.createElement("option", { value: "expense" }, "Expense"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-amount" }, "Amount ($)", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--red)", marginLeft: 2 } }, "*")), /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.amount })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-category" }, "Category", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--red)", marginLeft: 2 } }, "*")), /* @__PURE__ */ React.createElement("select", { id: "ef-category", className: inpCls(errors.category), value: f.category, onChange: (e) => {
      set({ category: e.target.value });
      if (errors.category) setErrors((p) => __spreadProps(__spreadValues({}, p), { category: void 0 }));
    } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 Select category \u2014"), [...categories].sort((a, b) => a.localeCompare(b)).map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.category }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { minWidth: 160 } }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-date" }, "Date *"), /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.startDate })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, paddingBottom: 2 } }, /* @__PURE__ */ React.createElement(Toggle, { value: f.repeats, onChange: (v) => set({ repeats: v }), label: "Repeats" }), f.repeats && summary && /* @__PURE__ */ React.createElement("span", { style: {
      fontFamily: "'IBM Plex Mono',monospace",
      fontSize: 11,
      color: "var(--navyLt)",
      background: "var(--stripe)",
      borderRadius: 6,
      padding: "3px 8px",
      border: "1px solid var(--border)"
    } }, summary))), f.repeats && /* @__PURE__ */ React.createElement("div", { style: { background: "var(--bg)", borderRadius: 10, padding: "12px 14px", marginBottom: 12, border: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 11,
      fontWeight: 700,
      color: "var(--textMid)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginBottom: 10
    } }, "Recurrence Settings"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } }, f.recurUnit !== "semimonth" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-recur-every" }, "Every"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "ef-recur-every",
        type: "number",
        inputMode: "decimal",
        min: "1",
        max: "99",
        className: inpCls(errors.recurEvery),
        value: f.recurEvery,
        onChange: (e) => set({ recurEvery: parseInt(e.target.value) || 1 })
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { gridColumn: f.recurUnit === "semimonth" ? "1 / -1" : "auto" } }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-recur-unit" }, "Period"), /* @__PURE__ */ React.createElement("select", { id: "ef-recur-unit", className: inpCls(false), value: f.recurUnit, onChange: (e) => setUnit(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "day" }, "Day(s)"), /* @__PURE__ */ React.createElement("option", { value: "week" }, "Week(s)"), /* @__PURE__ */ React.createElement("option", { value: "semimonth" }, "Semi-monthly (1st & 15th)"), /* @__PURE__ */ React.createElement("option", { value: "month" }, "Month(s)"), /* @__PURE__ */ React.createElement("option", { value: "year" }, "Year(s)")))), f.recurUnit === "week" && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("label", { className: lblCls }, f.recurEvery > 1 ? "Fixed to start day" : "Weekday(s)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" } }, WEEKDAYS.map((wd, i) => {
      const isAnch = i === startWD, isSel = f.recurDays.includes(i) || isAnch, isLock = isAnch || f.recurEvery > 1;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: wd,
          onClick: () => !isLock && toggleWD(i),
          style: {
            fontSize: 11,
            fontWeight: 700,
            flex: "1 1 auto",
            minWidth: 34,
            height: 32,
            borderRadius: 6,
            cursor: isLock ? "default" : "pointer",
            border: isAnch ? `2px solid var(--amber)` : "none",
            background: isSel ? isAnch ? "var(--primary)" : "var(--navyLt)" : "var(--border)",
            color: isSel ? "#fff" : "var(--textMid)",
            opacity: !isSel && isLock ? 0.4 : 1
          }
        },
        wd.slice(0, 2)
      );
    })), f.recurEvery === 1 && startWD !== null && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--textLt)", marginTop: 4 } }, WEEKDAYS[startWD], " is locked to your start date."), f.recurEvery > 1 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--amber)", marginTop: 4 } }, "Every ", f.recurEvery, " weeks always lands on ", startWD !== null ? WEEKDAYS[startWD] : "the start day", ".")), f.recurUnit === "semimonth" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", marginBottom: 10 } }, "Occurs on day ", /* @__PURE__ */ React.createElement("strong", null, (startD == null ? void 0 : startD.getDate()) || 1), " and day ", /* @__PURE__ */ React.createElement("strong", null, Math.min(((startD == null ? void 0 : startD.getDate()) || 1) + 14, 28)), " of each month."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-recur-until" }, "Until (optional)"), /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(FieldError, { msg: errors.recurEnd }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--textLt)", marginTop: 3 } }, "Leave blank to recur indefinitely")), f.recurUnit === "month" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" } }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: showMonthly,
        onChange: (v) => {
          setShowMonthly(v);
          if (!v) set({ monthlyAmounts: null });
        },
        label: "Amount varies by month"
      }
    ), showMonthly && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, [0, 1].map((row) => /* @__PURE__ */ React.createElement("div", { key: row, className: "monthly-amounts-grid", style: { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginBottom: row === 0 ? 8 : 0 } }, MONTHS.slice(row * 6, row * 6 + 6).map((m, i) => {
      const mi = row * 6 + i;
      return /* @__PURE__ */ React.createElement("div", { key: m }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--textLt)", textAlign: "center", marginBottom: 3 } }, m), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          step: "0.01",
          style: {
            fontSize: 12,
            padding: "6px 6px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--inputBg)",
            color: "var(--text)",
            width: "100%",
            boxSizing: "border-box",
            outline: "none"
          },
          value: (f.monthlyAmounts || Array(12).fill(f.amount || 0))[mi] || "",
          onChange: (ev) => {
            const ma = [...f.monthlyAmounts || Array(12).fill(parseFloat(f.amount) || 0)];
            ma[mi] = parseFloat(ev.target.value) || 0;
            set({ monthlyAmounts: ma });
          }
        }
      ));
    })))))), /* @__PURE__ */ React.createElement("div", { className: "mb-16" }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "ef-notes" }, "Notes"), /* @__PURE__ */ React.createElement("input", { id: "ef-notes", className: inpCls(false), value: f.notes, placeholder: "Optional", onChange: (e) => set({ notes: e.target.value }) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--primary", onClick: handleSave, style: { fontSize: 13, fontWeight: 600, padding: "9px 22px" } }, "Save Entry"), /* @__PURE__ */ React.createElement("button", { className: "cf-btn cf-btn--secondary", onClick: onCancel, style: { fontSize: 13, padding: "9px 16px" } }, "Cancel"), onSaveTemplate && /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const amt = parseFloat(f.amount) || 0;
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
    }, className: "ef-save-template", style: {
      fontSize: 12,
      fontWeight: 600,
      padding: "9px 14px",
      borderRadius: 8,
      border: "1px dashed var(--border)",
      cursor: "pointer",
      marginLeft: "auto",
      background: "transparent",
      color: "var(--textMid)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "save", size: 13 }), "Save as Template")));
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
        const amt = isNaN(rawAmt) ? 0 : roundMoney(Math.abs(rawAmt));
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
    const sel = (field, label) => /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("label", { htmlFor: `csv-map-${field}`, style: { fontSize: 11, color: "var(--textLt)", marginBottom: 4, display: "block" } }, label), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: `csv-map-${field}`,
        value: map[field],
        onChange: (e) => setMap((m) => __spreadProps(__spreadValues({}, m), { [field]: e.target.value })),
        style: {
          fontSize: 12,
          padding: "6px 10px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--inputBg)",
          color: "var(--text)",
          outline: "none",
          width: "100%"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 not mapped \u2014"),
      headers.map((h) => /* @__PURE__ */ React.createElement("option", { key: h, value: h }, h))
    ));
    return /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--bgCard)",
      borderRadius: 14,
      padding: 20,
      marginBottom: 16,
      border: "1px solid var(--border)",
      maxWidth: 600
    } }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)" } }, "\u2B06 Import from CSV"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": "Close", title: "Close", style: {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: 18,
      color: "var(--textLt)"
    } }, "\u2715")), !rows.length && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textLt)", marginBottom: 12, lineHeight: 1.5 } }, "Upload a CSV file from your bank or spreadsheet. The file must have a header row. Required columns: ", /* @__PURE__ */ React.createElement("strong", null, "Description"), ", ", /* @__PURE__ */ React.createElement("strong", null, "Amount"), ", ", /* @__PURE__ */ React.createElement("strong", null, "Date"), "."), /* @__PURE__ */ React.createElement("label", { className: "cf-btn cf-btn--primary", style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px" } }, "Choose CSV File", /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".csv,text/csv", className: "hidden", onChange: handleFile }))), rows.length > 0 && !done && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--greenDk)", marginBottom: 8 } }, "\u2713 Loaded ", rows.length, " rows. Map your columns:"), appliedProf && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--textMid)", marginBottom: 8 } }, "Applied saved mapping ", /* @__PURE__ */ React.createElement("strong", { className: "c-text" }, appliedProf), " ", /* @__PURE__ */ React.createElement("button", { onClick: () => deleteProfile(appliedProf), title: "Forget this saved mapping", style: { fontSize: 11, background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", padding: "0 4px" } }, "forget")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 } }, Object.keys(profiles).length > 0 && /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": "Apply saved mapping",
        value: "",
        onChange: (e) => {
          if (e.target.value) applyProfile(e.target.value);
        },
        style: { fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--inputBg)", color: "var(--text)", outline: "none" }
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
      style: { fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--inputBg)", color: "var(--text)", outline: "none", flex: "1 1 180px", minWidth: 140 }
    }), /* @__PURE__ */ React.createElement("button", { onClick: saveProfile, disabled: !profName.trim(), className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "6px 12px" } }, "Save mapping")),/* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" } }, sel("desc", "Description *"), sel("amount", "Amount *"), sel("date", "Date *"), sel("type", "Type (income/expense)"), sel("category", "Category")), err && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--red)", marginBottom: 8 } }, err), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: buildPreview,
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "7px 16px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: "var(--navyMid)",
          color: "#fff"
        }
      },
      "Preview"
    ), preview.length > 0 && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: doImport,
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "7px 16px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: "var(--greenDk)",
          color: "#fff"
        }
      },
      "Import ",
      rows.length,
      " Entries"
    )), preview.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginBottom: 6 } }, "Preview (first ", Math.min(5, rows.length), " rows):"), preview.map((p, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
      fontSize: 11,
      padding: "4px 0",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      gap: 10,
      alignItems: "center"
    } }, /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontWeight: 600, color: "var(--text)" } }, p.desc), /* @__PURE__ */ React.createElement("span", { style: { color: p.type === "income" ? "var(--greenDk)" : "var(--red)", fontFamily: "IBM Plex Mono,monospace" } }, p.type === "income" ? "+" : "-", p.amount.toFixed(2)), /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, p.startDate), /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, p.category))))), done && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "20px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u2705"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--text)" } }, "Import complete!"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "cf-btn cf-btn--primary", style: { marginTop: 12, fontSize: 12, padding: "7px 16px", borderRadius: 6 } }, "Done")));
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
    const menuW = 180, menuH = items.length * 38 + 8;
    const ax = Math.min(x, window.innerWidth - menuW - 8);
    const ay = Math.min(y, window.innerHeight - menuH - 8);
    if (isTouch) {
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          style: { position: "fixed", inset: 0, zIndex: 9e3, background: "rgba(0,0,0,0.35)" },
          onClick: onClose,
          onContextMenu: (e) => e.preventDefault()
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            ref: menuRef,
            className: "modal-card",
            style: {
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: "20px 20px 0 0",
              padding: "10px 0 calc(10px + env(safe-area-inset-bottom))",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
              userSelect: "none"
            },
            onClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "2px auto 8px" } }),
          items.map((item, i) => item === "---" ? /* @__PURE__ */ React.createElement("div", { key: i, style: { height: 1, background: "var(--border)", margin: "4px 16px" } }) : /* @__PURE__ */ React.createElement(
            "button",
            {
              key: i,
              onClick: () => {
                item.action();
                onClose();
              },
              style: {
                display: "flex",
                alignItems: "center",
                gap: 14,
                width: "100%",
                padding: "15px 22px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 15,
                color: item.danger ? "var(--red)" : "var(--text)"
              }
            },
            /* @__PURE__ */ React.createElement("span", { style: { fontSize: 17, width: 22, textAlign: "center" } }, item.icon),
            item.label
          ))
        )
      );
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: menuRef,
        style: {
          position: "fixed",
          left: ax,
          top: ay,
          zIndex: 9e3,
          background: "var(--bgCard)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          boxShadow: "var(--shadowLg)",
          minWidth: menuW,
          padding: "4px 0",
          userSelect: "none"
        },
        onContextMenu: (e) => e.preventDefault(),
        onClick: (e) => e.stopPropagation()
      },
      items.map(
        (item, i) => item === "---" ? /* @__PURE__ */ React.createElement("div", { key: i, style: { height: 1, background: "var(--border)", margin: "3px 8px" } }) : /* @__PURE__ */ React.createElement(
          "button",
          {
            key: i,
            onClick: () => {
              item.action();
              onClose();
            },
            className: "ctx-menu-item",
            style: {
              fontSize: 13,
              padding: "9px 16px",
              border: "none",
              width: "100%",
              cursor: "pointer",
              textAlign: "left",
              background: "transparent",
              color: item.danger ? "var(--red)" : "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: 10
            }
          },
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, width: 18, textAlign: "center" } }, item.icon),
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
    return /* @__PURE__ */ React.createElement("div", { ref, style: { position: "relative", flexShrink: 0 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        style: {
          fontSize: 12,
          padding: "6px 14px",
          border: "1.5px solid " + (allSel ? "var(--border)" : "var(--primary)"),
          borderRadius: 20,
          background: allSel ? "var(--bgCard)" : "rgba(28,43,58,0.07)",
          color: allSel ? "var(--text)" : "var(--primary)",
          outline: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          fontWeight: allSel ? 400 : 600
        }
      },
      label2,
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, opacity: 0.5 } }, open ? "\u25B2" : "\u25BC")
    ), open && /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      zIndex: 500,
      background: "var(--bgCard)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      boxShadow: "var(--shadowLg)",
      minWidth: 180,
      maxHeight: 260,
      overflowY: "auto",
      padding: "6px 0"
    } }, /* @__PURE__ */ React.createElement(
      "label",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text)",
          borderBottom: "1px solid var(--border)",
          marginBottom: 4
        },
        onClick: () => onChange([])
      },
      /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: allSel, onChange: () => {
      }, style: { cursor: "pointer", accentColor: "var(--primary)" } }),
      "All ",
      label,
      "s"
    ), options.map((o) => {
      const sel = selected.includes(o.value);
      return /* @__PURE__ */ React.createElement(
        "label",
        {
          key: o.value,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 14px",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text)",
            background: sel ? "rgba(28,43,58,0.05)" : "transparent"
          },
          onClick: () => onChange(sel ? selected.filter((x) => x !== o.value) : [...selected, o.value])
        },
        /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: sel, onChange: () => {
        }, style: { cursor: "pointer", accentColor: "var(--primary)" } }),
        o.label
      );
    })));
  }
