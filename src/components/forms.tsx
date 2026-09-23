import { useContext, useEffect, useLayoutEffect, useRef, useState } from "../lib/runtime.js";
import { centsToDollars, dollarsToCents } from "../lib/migrate.js";
import { parseDate, todayStr } from "../lib/dates.js";
import { memberName, moneySymbol } from "../lib/format.js";
import { HouseholdContext, MONTHS, WEEKDAYS, autoFocusOnDesktop, scheduleSentence } from "../lib/app-data.js";
import { aiCanRun, aiErrorMessage, callClaude } from "../lib/ai.js";
import { FieldError, FieldLabel, SheetHandle, TemplatePicker, Toggle } from "./primitives.js";
import { Icon } from "./misc-ui.js";
import { toast } from "./auth-misc.js";
  export interface EntryFormProps {
    initial: any;
    onSave: (...args: any[]) => any;
    onCancel: (...args: any[]) => any;
    categories: string[];
    templates?: any[];
    onSaveTemplate?: any;
    apiKey?: string;
    isOffline?: boolean;
  }
  export function EntryForm({ initial, onSave, onCancel, categories, templates = [], onSaveTemplate = null, apiKey = "", isOffline = false }: EntryFormProps) {
    // Off the household context rather than a prop: the form is opened from
    // six places and threading the account list through all of them is how one
    // of them ends up without it.
    const { accounts: formAccounts } = useContext(HouseholdContext);
    const accounts = Array.isArray(formAccounts) && formAccounts.length ? formAccounts : [];
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
      // Which occurrence in the month, for the "nth weekday" schedule:
      // 1..5 counting forward, or -1 for the last one. Ignored by every other
      // unit. Stored rather than derived from the start date, because the
      // start date can't tell "the fourth Friday" from "the last Friday" —
      // they are the same day in most months and different in the long ones,
      // and which one the bill means is not something to guess.
      recurNth: 1,
      // Whether the banking-day rule applies to this entry, overriding the
      // description heuristic. "" means unset — keep guessing from the
      // description, which is what every entry written before this existed
      // does. See isPayrollDeposit in dates.js.
      bankingDay: "",
      recurEnd: "",
      monthlyAmounts: null,
      transferDirection: "out",
      // Which account the money moves in. "" means the household's first
      // account, which is also what every entry written before accounts
      // existed means.
      accountId: "",
      // Only for a transfer: the account the money moves into. Set, and the
      // entry becomes two movements — out of one account, into the other.
      toAccountId: ""
    };
    const [f, setF] = useState(initial ? {
      ...initial,
      // Money is cents at rest; this form's fields are plain dollar text the
      // whole time it's open, converted back to cents only in handleSave.
      amount: String(centsToDollars(initial.amount)),
      monthlyAmounts: Array.isArray(initial.monthlyAmounts) ? initial.monthlyAmounts.map(centsToDollars) : null,
      recurEvery: initial.recurEvery ?? 1,
      recurUnit: initial.recurUnit ?? "month",
      recurDays: initial.recurDays ?? [],
      recurNth: Number.isFinite(initial.recurNth) ? initial.recurNth : 1,
      bankingDay: initial.bankingDay === true ? "yes" : initial.bankingDay === false ? "no" : "",
      recurEnd: initial.recurEnd ?? "",
      repeats: initial.repeats ?? false,
      transferDirection: initial.transferDirection || "out",
      accountId: initial.accountId || "",
      toAccountId: initial.toAccountId || ""
    } : blank);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showMonthly, setShowMonthly] = useState(!!initial?.monthlyAmounts);
    const set = (patch) => setF((p) => ({ ...p, ...patch }));
    const [nlText, setNlText] = useState("");
    const [nlBusy, setNlBusy] = useState(false);
    const [nlErr, setNlErr] = useState("");
    const [nlNote, setNlNote] = useState("");
    // Turns "hydro $180 every second Tuesday" into the fields below. It fills
    // the form rather than saving, because the recurrence model has more
    // corners than a sentence usually specifies — the user confirms the
    // schedule the same way they would if they had typed it in by hand.
    const fillFromText = async () => {
      const text = nlText.trim();
      if (!text) return;
      setNlBusy(true);
      setNlErr("");
      setNlNote("");
      try {
        const sortedCats = [...categories].sort((a, b) => a.localeCompare(b));
        const properties: Record<string, object> = {
          desc: { type: "string", description: "Short label for the entry, usually the payee or purpose." },
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number", description: "Amount in dollars, always positive. 0 when the text doesn't say." },
          start_date: { type: "string", description: "Date it first applies, as YYYY-MM-DD. Use today when the text doesn't say." },
          repeats: { type: "boolean", description: "true only when the text describes something recurring." },
          recur_every: { type: "integer", description: "Interval between repeats, e.g. 2 for 'every second week'. 1 otherwise." },
          recur_unit: { type: "string", enum: ["day", "week", "month", "year", "semimonth", "monthend", "monthweekday"] },
          recur_days: { type: "array", description: "Weekly repeats only: weekday numbers, 0 = Sunday through 6 = Saturday.", items: { type: "integer" } },
          recur_end: { type: "string", description: "Last date as YYYY-MM-DD, or an empty string when ongoing." },
          notes: { type: "string", description: "Anything in the text that doesn't fit the other fields. Empty string if none." }
        };
        const required = ["desc", "type", "amount", "start_date", "repeats", "recur_every", "recur_unit", "recur_days", "recur_end", "notes"];
        if (sortedCats.length) {
          properties.category = { type: "string", enum: sortedCats };
          required.push("category");
        }
        const { data } = await callClaude({
          system: "You convert short notes about money into structured budget entries. Use only what the text states — never invent an amount, a date or a schedule that isn't there.",
          messages: [{ role: "user", content: `Today is ${today}. Turn this into a single budget entry:\n\n${text}` }],
          schema: { type: "object", properties, required, additionalProperties: false },
          maxTokens: 2e3,
          effort: "low",
          apiKey
        });
        const patch: Record<string, any> = {};
        if (data.desc && data.desc.trim()) patch.desc = data.desc.trim();
        if (data.type === "income" || data.type === "expense") patch.type = data.type;
        if (Number.isFinite(data.amount) && data.amount > 0) patch.amount = String(data.amount);
        if (data.category && sortedCats.includes(data.category)) patch.category = data.category;
        if (/^\d{4}-\d{2}-\d{2}$/.test(data.start_date || "")) patch.startDate = data.start_date;
        patch.repeats = !!data.repeats;
        if (patch.repeats) {
          patch.recurUnit = ["day", "week", "month", "year", "semimonth", "monthend", "monthweekday"].includes(data.recur_unit) ? data.recur_unit : "month";
          patch.recurEvery = Number.isInteger(data.recur_every) && data.recur_every > 0 ? data.recur_every : 1;
          // recurDays is only meaningful for weekly repeats, and the form's
          // own weekday toggles assume clean 0-6 values.
          patch.recurDays = patch.recurUnit === "week" && Array.isArray(data.recur_days) ? data.recur_days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
          if (/^\d{4}-\d{2}-\d{2}$/.test(data.recur_end || "")) patch.recurEnd = data.recur_end;
        }
        if (data.notes && data.notes.trim()) patch.notes = data.notes.trim();
        set(patch);
        setNlNote("Filled the form in from your description — check it over before saving.");
      } catch (e) {
        setNlErr(aiErrorMessage(e));
      } finally {
        setNlBusy(false);
      }
    };
    const startD = f.startDate ? parseDate(f.startDate) : null;
    const startWD = startD ? startD.getDay() : null;
    const setStartDate = (val) => {
      const d = parseDate(val);
      const wd = d ? d.getDay() : null;
      const newDays = f.recurUnit === "week" ? wd !== null ? [wd] : f.recurDays : f.recurDays;
      set({ startDate: val, recurDays: newDays });
    };
    const setUnit = (unit) => {
      // recurDays carries the weekday for both "week" and "monthweekday"; the
      // start date is the natural default for each, so switching to either
      // pre-selects the day the user already picked rather than Sunday.
      if (unit === "monthweekday") {
        const d = startD || null;
        set({
          recurUnit: unit,
          recurDays: startWD !== null ? [startWD] : [],
          // Which occurrence of that weekday the start date already is.
          recurNth: d ? Math.floor((d.getDate() - 1) / 7) + 1 : 1
        });
        return;
      }
      set({ recurUnit: unit, recurDays: unit === "week" && startWD !== null ? [startWD] : [] });
    };
    const toggleWD = (wd) => {
      if (f.recurEvery > 1 || wd === startWD) return;
      const next = f.recurDays.includes(wd) ? f.recurDays.filter((d) => d !== wd) : [...f.recurDays, wd].sort((a, b) => a - b);
      set({ recurDays: next });
    };
    // One description of a schedule, shared with the Entries list rather than
    // written twice — the two used to disagree, this one saying "Fri" where
    // the list said "Monthly (weekday)" and neither saying which Friday.
    const recurSummary = () => {
      if (!f.repeats) return null;
      const sentence = scheduleSentence({
        repeats: true, recurUnit: f.recurUnit, recurEvery: f.recurEvery,
        recurDays: f.recurDays && f.recurDays.length ? f.recurDays : (startWD !== null ? [startWD] : []),
        recurNth: f.recurNth, recurEnd: f.recurEnd, startDate: f.startDate
      });
      return f.recurEnd ? sentence : sentence + " (ongoing)";
    };
    const validate = () => {
      const errs: Record<string, string> = {};
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
      onSave({
        ...f,
        amount: dollarsToCents(f.amount),
        recurEvery: parseInt(f.recurEvery) || 1,
        monthlyAmounts: maDollars ? maDollars.map((v) => dollarsToCents(v)) : null,
        recurNth: f.recurUnit === "monthweekday" ? parseInt(f.recurNth, 10) || 1 : void 0,
        // Only meaningful on repeating income, which is the only thing the
        // rule applies to — anything else stores nothing rather than a
        // preference that can never take effect.
        bankingDay: f.repeats && f.type === "income" && (f.bankingDay === "yes" || f.bankingDay === "no") ? f.bankingDay === "yes" : void 0,
        accountId: f.accountId || void 0,
        // A destination only means anything on a transfer, and only when it is
        // somewhere else: "into the account it came out of" is not a movement.
        toAccountId: f.type === "transfer" && f.toAccountId && f.toAccountId !== (f.accountId || (accounts[0] || {}).id) ? f.toAccountId : void 0,
        // "monthweekday" keeps exactly one weekday (the schedule names one);
        // "week" keeps the start day plus any extras the user ticked.
        recurDays: f.recurUnit === "monthweekday" ? [f.recurDays[0] != null ? f.recurDays[0] : startWD || 0] : f.recurUnit === "week" && startWD !== null ? [...new Set([startWD, ...f.recurDays])].sort() : []
      });
    };
    // Who added this entry, when the household has more than one person in it
    // and it wasn't you. The id has round-tripped as `userId` since entries
    // were first synced; nothing ever displayed it, so "who put this here?"
    // had no answer in a shared budget.
    const { members: hhMembers, sessionUser: hhUser } = useContext(HouseholdContext);
    const addedBy = initial ? memberName(initial.userId, hhMembers, { selfId: hhUser && hhUser.id }) : "";
    const inpCls = (hasErr) => "field-input" + (hasErr ? " field-error" : "");
    const lblCls = "field-label";
    const summary = recurSummary();
    return <>
      {addedBy && addedBy !== "you" && <div className="entry-addedby">{"Added by "}{addedBy}</div>}
      {!initial && <div className="mb-12">
        <label className="field-label" htmlFor="entry-nl">Describe it (optional)</label>
        <div className="cf-row cf-gap-8 cf-wrap">
          <input
            id="entry-nl"
            className="field-input"
            style={{ flex: "1 1 220px" }}
            placeholder="hydro $180 every second Tuesday"
            value={nlText}
            disabled={nlBusy}
            onChange={(e) => setNlText(e.target.value)}
            onKeyDown={(e) => {
            // Enter inside a form would otherwise submit it; here it should
            // run the parse the user is obviously asking for.
            if (e.key === "Enter") {
              e.preventDefault();
              if (!nlBusy && nlText.trim() && !isOffline && aiCanRun(apiKey)) fillFromText();
            }
          }}
          />
          <button
            type="button"
            onClick={fillFromText}
            disabled={nlBusy || !nlText.trim() || isOffline || !aiCanRun(apiKey)}
            title={isOffline ? "You're offline — this needs a connection." : !aiCanRun(apiKey) ? "Add an Anthropic API key in Settings → General, or deploy the ai-proxy Edge Function." : void 0}
            className="cf-btn cf-btn--secondary"
          >
            {nlBusy ? "Reading…" : "✦ Fill in"}
          </button>
        </div>
        {(nlErr || nlNote) && <div className={nlErr ? "field-error-text" : "field-hint-text"}>
          {nlErr || nlNote}
        </div>}
      </div>}
      {templates.length > 0 && <div className="mb-12">
        <TemplatePicker
          templates={templates}
          onSelect={(t) => {
      setF((p) => ({
        ...p,
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
    }}
        />
      </div>}
      <div className="mb-12">
        <label className={lblCls} htmlFor="ef-desc">
          Description
          <span className="required-mark">*</span>
        </label>
        <input
          id="ef-desc"
          autoFocus={autoFocusOnDesktop()}
          className={inpCls(errors.desc)}
          value={f.desc}
          placeholder="e.g. Mortgage payment"
          onChange={(e) => {
          set({ desc: e.target.value });
          if (errors.desc) setErrors((p) => ({ ...p, desc: void 0 }));
        }}
        />
        <FieldError msg={errors.desc} />
      </div>
      <div className="entry-form-row2">
        <div>
          <label className={lblCls} htmlFor="ef-type">Type</label>
          <select
            id="ef-type"
            className={inpCls(false)}
            value={f.type}
            onChange={(e) => set({ type: e.target.value })}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          {f.type === "transfer" && !f.toAccountId && <select
            aria-label="Transfer direction"
            className={inpCls(false) + " mt-6"}
            value={f.transferDirection}
            onChange={(e) => set({ transferDirection: e.target.value })}
          >
            <option value="out">Money out of this account</option>
            <option value="in">Money into this account</option>
          </select>}
        </div>
        <div>
          <label className={lblCls} htmlFor="ef-amount">
            {"Amount (" + moneySymbol().trim() + ")"}
            <span className="required-mark">*</span>
          </label>
          <input
            id="ef-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className={inpCls(errors.amount)}
            value={f.amount}
            placeholder="0.00"
            onChange={(e) => {
          set({ amount: e.target.value });
          if (errors.amount) setErrors((p) => ({ ...p, amount: void 0 }));
        }}
          />
          <FieldError msg={errors.amount} />
        </div>
        {accounts.length > 1 && <div>
          <FieldLabel
            htmlFor="ef-account"
            className={lblCls}
            helpLabel="Account"
            help="Which of your accounts this money moves in. A transfer can also name a second account to move it into, which makes it one entry and two movements — out of the first, into the second — so the household total is unchanged and each account’s own balance is right."
          >
            {f.type === "transfer" ? "From account" : "Account"}
          </FieldLabel>
          <select
            id="ef-account"
            className={inpCls(false)}
            value={f.accountId || (accounts[0] || {}).id || ""}
            onChange={(e) => set({ accountId: e.target.value, toAccountId: f.toAccountId === e.target.value ? "" : f.toAccountId })}
          >
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {f.type === "transfer" && <>
            <label className={lblCls + " mt-10"} htmlFor="ef-to-account">To account</label>
            <select
              id="ef-to-account"
              className={inpCls(false)}
              value={f.toAccountId}
              onChange={(e) => set({ toAccountId: e.target.value })}
            >
              <option value="">— Outside these accounts —</option>
              {accounts.filter((a) => a.id !== (f.accountId || (accounts[0] || {}).id)).map((a) => <option
                key={a.id}
                value={a.id}
              >
                {a.name}
              </option>)}
            </select>
          </>}
        </div>}
        <div>
          <label className={lblCls} htmlFor="ef-category">
            Category
            <span className="required-mark">*</span>
          </label>
          <select
            id="ef-category"
            className={inpCls(errors.category)}
            value={f.category}
            onChange={(e) => {
      set({ category: e.target.value });
      if (errors.category) setErrors((p) => ({ ...p, category: void 0 }));
    }}
          >
            <option value="">— Select category —</option>
            {[...categories].sort((a, b) => a.localeCompare(b)).map((c) => <option key={c} value={c}>
              {c}
            </option>)}
          </select>
          <FieldError msg={errors.category} />
        </div>
      </div>
      <div className="entry-form-date-row">
        <div className="min-w-160">
          <label className={lblCls} htmlFor="ef-date">Date<span className="required-mark">*</span></label>
          <input
            id="ef-date"
            type="date"
            className={inpCls(errors.startDate)}
            value={f.startDate}
            onChange={(e) => {
          setStartDate(e.target.value);
          if (errors.startDate) setErrors((p) => ({ ...p, startDate: void 0 }));
        }}
          />
          <FieldError msg={errors.startDate} />
        </div>
        <div className="repeats-toggle-row">
          <Toggle value={f.repeats} onChange={(v) => set({ repeats: v })} label="Repeats" />
          {f.repeats && summary && <span className="recur-summary-chip">{summary}</span>}
        </div>
      </div>
      {f.repeats && <div className="recur-panel">
        <div className="recur-panel-heading">Recurrence Settings</div>
        <div className="recur-grid-2">
          {f.recurUnit !== "semimonth" && <div>
            <label className={lblCls} htmlFor="ef-recur-every">Every</label>
            <input
              id="ef-recur-every"
              type="number"
              inputMode="decimal"
              min="1"
              max="99"
              className={inpCls(errors.recurEvery)}
              value={f.recurEvery}
              onChange={(e) => {
          const every = parseInt(e.target.value) || 1;
          set(
            f.recurUnit === "week" && every > 1 ? { recurEvery: every, recurDays: startWD !== null ? [startWD] : [] } : { recurEvery: every }
          );
        }}
            />
          </div>}
          <div style={{ gridColumn: f.recurUnit === "semimonth" ? "1 / -1" : "auto" }}>
            <label className={lblCls} htmlFor="ef-recur-unit">Period</label>
            <select
              id="ef-recur-unit"
              className={inpCls(false)}
              value={f.recurUnit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="day">Day(s)</option>
              <option value="week">Week(s)</option>
              <option value="semimonth">{"Semi-monthly (1st & 15th)"}</option>
              <option value="month">Month(s)</option>
              <option value="monthend">Monthly — last day</option>
              <option value="monthweekday">Monthly — nth weekday</option>
              <option value="year">Year(s)</option>
            </select>
          </div>
        </div>
        {f.recurUnit === "monthweekday" && <div className="mb-10">
          <FieldLabel
            className={lblCls}
            helpLabel="Which weekday"
            help="A month with only four of the chosen weekday has no fifth one, so a “5th” entry simply doesn’t occur in those months. Pick “Last” for the one that should always land in the final week."
          >
            Which weekday
          </FieldLabel>
          <div className="cf-row cf-gap-8 cf-wrap">
            <select
              aria-label="Which occurrence in the month"
              className={inpCls(false)}
              style={{ flex: "0 1 130px" }}
              value={String(f.recurNth)}
              onChange={(e) => set({ recurNth: parseInt(e.target.value, 10) })}
            >
              {[[1, "First"], [2, "Second"], [3, "Third"], [4, "Fourth"], [5, "Fifth"], [-1, "Last"]].map(([v, lbl]) => <option
                key={v}
                value={String(v)}
              >
                {lbl}
              </option>)}
            </select>
            <select
              aria-label="Weekday"
              className={inpCls(false)}
              style={{ flex: "0 1 150px" }}
              value={String(f.recurDays[0] != null ? f.recurDays[0] : startWD || 0)}
              onChange={(e) => set({ recurDays: [parseInt(e.target.value, 10)] })}
            >
              {WEEKDAYS.map((wd, i) => <option key={wd} value={String(i)}>{wd}</option>)}
            </select>
          </div>
        </div>}
        {f.recurUnit === "week" && <div className="mb-10">
          <FieldLabel
            className={lblCls}
            helpLabel="Weekdays"
            help={f.recurEvery > 1 ? `Every ${f.recurEvery} weeks always lands on ${startWD !== null ? WEEKDAYS[startWD] : "the start day"}, so the weekdays are fixed. Change the start date to move it.` : startWD !== null ? `${WEEKDAYS[startWD]} is locked to your start date. Add more weekdays to repeat several times a week — “every Monday and Thursday” is one entry.` : "Choose the weekdays this repeats on."}
          >
            {f.recurEvery > 1 ? "Fixed to start day" : "Weekday(s)"}
          </FieldLabel>
          <div className="weekday-btn-row">
            {WEEKDAYS.map((wd, i) => {
      const isAnch = i === startWD, isSel = f.recurDays.includes(i) || isAnch, isLock = isAnch || f.recurEvery > 1;
      return <button
        key={wd}
        onClick={() => !isLock && toggleWD(i)}
        className="weekday-btn"
        style={{
            cursor: isLock ? "default" : "pointer",
            border: isAnch ? `2px solid var(--amber)` : "none",
            background: isSel ? isAnch ? "var(--primary)" : "var(--navyLt)" : "var(--border)",
            color: isSel ? "#fff" : "var(--textMid)",
            opacity: !isSel && isLock ? 0.4 : 1
          }}
      >
        {wd.slice(0, 2)}
      </button>;
    })}
          </div>
        </div>}
        {f.recurUnit === "semimonth" && <div className="recur-semimonth-desc">
          {"Occurs on day "}
          <strong>{(startD?.getDate()) || 1}</strong>
          {" and day "}
          <strong>{Math.min(((startD?.getDate()) || 1) + 14, 28)}</strong>
          {" of each month."}
        </div>}
        <div>
          <FieldLabel
            className={lblCls}
            htmlFor="ef-recur-until"
            helpLabel="Until"
            help="Leave blank to recur indefinitely. A date here is the last one the entry can land on — a loan that finishes in September stops generating occurrences after it."
          >
            Until (optional)
          </FieldLabel>
          <input
            id="ef-recur-until"
            type="date"
            className={inpCls(errors.recurEnd)}
            value={f.recurEnd}
            min={f.startDate}
            onChange={(e) => {
          set({ recurEnd: e.target.value });
          if (errors.recurEnd) setErrors((p) => ({ ...p, recurEnd: void 0 }));
        }}
          />
          <FieldError msg={errors.recurEnd} />
        </div>
        {f.repeats && f.type === "income" && <div className="mb-10">
          <FieldLabel
            htmlFor="ef-banking-day"
            helpLabel="Banking days"
            help="Money paid in by direct deposit doesn’t land on a day the banks are shut — a payday falling on a weekend or a statutory holiday is in the account on the last banking day before it. The occurrence stays on its own date in the budget either way; only the deposit date it is marked with changes. Left on “Decide from the description”, anything whose description reads as payroll gets the rule."
          >
            Deposit date
          </FieldLabel>
          <select
            id="ef-banking-day"
            className={inpCls(false)}
            value={f.bankingDay}
            onChange={(e) => set({ bankingDay: e.target.value })}
          >
            <option value="">Decide from the description</option>
            <option value="yes">Paid the last banking day before</option>
            <option value="no">Paid on the date shown</option>
          </select>
        </div>}
        {f.recurUnit === "month" && <div className="monthly-toggle-wrap">
          <Toggle
            value={showMonthly}
            onChange={(v) => {
          setShowMonthly(v);
          if (!v) set({ monthlyAmounts: null });
        }}
            label="Amount varies by month"
          />
          {showMonthly && <div className="mt-10">
            {[0, 1].map((row) => <div
              key={row}
              className="monthly-amounts-grid"
              style={{ marginBottom: row === 0 ? 8 : 0 }}
            >
              {MONTHS.slice(row * 6, row * 6 + 6).map((m, i) => {
      const mi = row * 6 + i;
      return <div key={m}>
        <div className="month-amt-label">{m}</div>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          className="month-amt-input"
          value={(f.monthlyAmounts || Array(12).fill(f.amount || 0))[mi] || ""}
          onChange={(ev) => {
            const ma = [...f.monthlyAmounts || Array(12).fill(parseFloat(f.amount) || 0)];
            ma[mi] = parseFloat(ev.target.value) || 0;
            set({ monthlyAmounts: ma });
          }}
        />
      </div>;
    })}
            </div>)}
          </div>}
        </div>}
      </div>}
      <div className="mb-16">
        <label className={lblCls} htmlFor="ef-notes">Notes</label>
        <input
          id="ef-notes"
          className={inpCls(false)}
          value={f.notes}
          placeholder="Optional"
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
      <div className="oem-footer-row">
        {onSaveTemplate && <button
          onClick={() => {
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
    }}
          className="ef-save-template"
          title="Save as Template"
        >
          <Icon name="save" size={13} />
          <span className="ef-save-template-full">Save as Template</span>
          <span className="ef-save-template-short">Template</span>
        </button>}
        <button className="cf-btn cf-btn--secondary" onClick={onCancel}>Cancel</button>
        <button className="cf-btn cf-btn--primary entry-form-save-btn" onClick={handleSave}>
          Save Entry
        </button>
      </div>
    </>;
  }
  export interface AddEntryModalProps {
    show: any;
    onClose: (...args: any[]) => any;
    onSave: (...args: any[]) => any;
    categories: string[];
    templates?: any[];
    setTemplates?: any;
    apiKey?: string;
    isOffline?: boolean;
  }
  // Shared "Add Entry" modal \u2014 wraps EntryForm in the same modal chrome used
  // wherever an explicit Add button (top-right, next to CSV/PDF) needs to
  // open a blank entry form.
  export function AddEntryModal({ show, onClose, onSave, categories, templates = [], setTemplates = null, apiKey = "", isOffline = false }: AddEntryModalProps) {
    // Escape closes, the backdrop doesn't — the same bargain every other
    // overlay here strikes. It matters more now: this modal is mounted at app
    // level and opens over whatever you were reading, so the way out has to be
    // the one your fingers already know.
    useEffect(() => {
      if (!show) return void 0;
      const h = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [show, onClose]);
    if (!show) return null;
    return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add entry">
      <div className="modal-card entryform-modal-card" onClick={(e) => e.stopPropagation()}>
        <SheetHandle onDismiss={onClose} />
        <div className="modal-title-lg">Add Entry</div>
        <EntryForm
          initial={null}
          onSave={(data) => {
            onSave(data);
            onClose();
          }}
          onCancel={onClose}
          categories={categories}
          apiKey={apiKey}
          isOffline={isOffline}
          templates={templates}
          onSaveTemplate={(t) => setTemplates && setTemplates((prev) => [...prev.filter((x) => x.desc !== t.desc), t])}
        />
      </div>
    </div>;
  }
  export interface ContextMenuProps {
    x: any;
    y: any;
    items: any;
    onClose: (...args: any[]) => any;
  }
  export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
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
    // Focus the first item on open (pointer devices only — on touch this is a
    // bottom sheet and focusing an item would raise nothing useful).
    useEffect(() => {
      if (isTouch || !menuRef.current) return;
      const first = menuRef.current.querySelector("button");
      if (first) first.focus({ preventScroll: true });
    }, [isTouch]);
    const ax = pos.x, ay = pos.y;
    if (isTouch) {
      return <div className="ctx-menu-backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
        <div ref={menuRef} className="modal-card ctx-menu-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="ctx-menu-handle" />
          {items.map((item, i) => item === "---" ? <div key={i} className="ctx-menu-divider--touch" /> : <button
            key={i}
            onClick={() => {
                item.action();
                onClose();
              }}
            className="ctx-menu-item--touch"
            style={{
                color: item.danger ? "var(--red)" : "var(--text)"
              }}
          >
            <span className="ctx-menu-icon--touch">{item.icon}</span>
            {item.label}
          </button>)}
        </div>
      </div>;
    }
    return <div
      ref={menuRef}
      className="ctx-menu-desktop"
      role="menu"
      style={{ left: ax, top: ay }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
      // The menu opened but never took focus, so it was mouse-only: no
      // arrow keys, Enter did nothing, and Tab walked the page *behind* it.
      // Escape only appeared to work because that handler is on window.
      onKeyDown={(e) => {
          const btns = menuRef.current ? [...menuRef.current.querySelectorAll("button")] : [];
          if (!btns.length) return;
          const at = btns.indexOf(document.activeElement);
          const go = (i) => {
            e.preventDefault();
            btns[(i + btns.length) % btns.length].focus();
          };
          if (e.key === "ArrowDown") go(at + 1);
          else if (e.key === "ArrowUp") go(at <= 0 ? btns.length - 1 : at - 1);
          else if (e.key === "Home") go(0);
          else if (e.key === "End") go(btns.length - 1);
          else if (e.key === "Tab") {
            // A menu is a modal surface — Tab must not walk out of it into
            // the page underneath.
            e.preventDefault();
            go(e.shiftKey ? at - 1 : at + 1);
          }
        }}
    >
      {items.map(
        (item, i) => item === "---" ? <div key={i} className="ctx-menu-divider" /> : <button
          key={i}
          role="menuitem"
          onClick={() => {
              item.action();
              onClose();
            }}
          className="ctx-menu-item"
          style={{
              color: item.danger ? "var(--red)" : "var(--text)"
            }}
        >
          <span className="ctx-menu-icon">{item.icon}</span>
          {item.label}
        </button>
      )}
    </div>;
  }
  export interface FilterPillProps {
    label: any;
    allLabel: any;
    options: any;
    selected: any;
    onChange: (...args: any[]) => any;
    inline?: boolean;
  }
  // `inline` renders the options in flow instead of as a floating popover.
  // Inside the mobile filter sheet the popover was absolutely positioned in a
  // scrolling card, so it escaped past the bottom of the screen and covered
  // the date fields and the "Show results" button.
  export function FilterPill({ label, allLabel, options, selected, onChange, inline = false }: FilterPillProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const h = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      window.addEventListener("mousedown", h);
      // Touch too: without this the dropdown only closed on the synthetic
      // mouse event a tap emits ~300ms later, which is why it felt sticky.
      // ContextMenu has always listened for both.
      window.addEventListener("touchstart", h, { passive: true });
      return () => {
        window.removeEventListener("mousedown", h);
        window.removeEventListener("touchstart", h);
      };
    }, []);
    const allSel = selected.length === 0;
    const label2 = allSel ? label : `${label} (${selected.length})`;
    return <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="filter-pill-btn"
        style={{
          border: "1.5px solid " + (allSel ? "var(--border)" : "var(--primary)"),
          background: allSel ? "var(--bgCard)" : "rgba(28,43,58,0.07)",
          color: allSel ? "var(--text)" : "var(--primary)",
          fontWeight: allSel ? 400 : 600
        }}
      >
        {label2}
        <span className={"filter-pill-chevron" + (open ? " filter-pill-chevron--open" : "")}>
          <Icon name="chevron-down" size={13} strokeWidth={2.25} />
        </span>
      </button>
      {open && <div className={"filter-pill-dropdown" + (inline ? " filter-pill-dropdown--inline" : "")}>
        <label className="filter-pill-all-row">
          <input
            type="checkbox"
            checked={allSel}
            onChange={() => onChange([])}
            className="filter-pill-checkbox"
          />
          {// Was `"All " + label + "s"`, which rendered "All Categorys" and
      // "All Statuss". The plural is a property of the label, not something
      // to derive from it.
      allLabel || `All ${label}`
}
        </label>
        {options.map((o) => {
      const sel = selected.includes(o.value);
      return <label
        key={o.value}
        className="filter-pill-option-row"
        style={{
            background: sel ? "rgba(28,43,58,0.05)" : "transparent"
          }}
      >
        <input
          type="checkbox"
          checked={sel}
          onChange={() => onChange(sel ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
          className="filter-pill-checkbox"
        />
        {o.label}
      </label>;
    })}
      </div>}
    </div>;
  }
