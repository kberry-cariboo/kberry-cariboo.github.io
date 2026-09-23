import { genId, useMemo, useState } from "../lib/runtime.js";
import { dollarsToCents } from "../lib/migrate.js";
import { humanShortDate, localDateStr, parseDate } from "../lib/dates.js";
import { fmt } from "../lib/format.js";
import { aiCanRun, aiErrorMessage, callClaude } from "../lib/ai.js";
import { FieldLabel, PillToggle, SheetHandle, Toggle } from "./primitives.js";
import { Icon } from "./misc-ui.js";
import { toast } from "./auth-misc.js";
  // Minimal, dependency-free CSV parser (RFC 4180-ish): handles quoted
  // fields with embedded commas/newlines and doubled-quote escapes, since
  // real bank exports routinely quote the description column. A naive
  // text.split(",").split("\n") breaks the moment a description contains a
  // comma — which for a "Vendor, Inc." style payee is common enough to matter.
  export function parseCSV(text) {
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
  // the mapped column or fixing the row afterward in Entries.
  export function parseCsvDate(str) {
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
  export function parseCsvAmount(str) {
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
  export const CSV_DATE_HINTS = ["date", "posted", "transaction date", "post date"];
  export const CSV_DESC_HINTS = ["description", "memo", "payee", "name", "merchant"];
  export const CSV_AMOUNT_HINTS = ["amount", "value"];
  export const CSV_DEBIT_HINTS = ["debit", "withdrawal", "money out"];
  export const CSV_CREDIT_HINTS = ["credit", "deposit", "money in"];
  export function guessColumn(headers, hints) {
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
  // Rows per classification request. Descriptions are short, so the limit that
  // matters is the reply: one {index, category} pair per row, all of which has
  // to fit inside max_tokens. 60 keeps a batch comfortably inside the 4000 we
  // ask for while still importing a year of transactions in a handful of
  // calls.
  export const CSV_AI_BATCH = 60;
  export interface CsvImportModalProps {
    show: any;
    onClose: (...args: any[]) => any;
    onImport: (...args: any[]) => any;
    categories?: string[];
    existingEntries?: any[];
    scheduledOccurrences?: any[];
    apiKey?: string;
    isOffline?: boolean;
  }
  export function CsvImportModal({ show, onClose, onImport, categories = [], existingEntries = [], scheduledOccurrences = [], apiKey = "", isOffline = false }: CsvImportModalProps) {
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
    const [excludedRows, setExcludedRows] = useState(() => new Set());
    // Rows flagged as duplicates that the user has ticked back on. "Skip
    // likely duplicates" is a bulk default, not a verdict — the match is
    // best-effort (and now matches scheduled occurrences within a few days,
    // which is looser still), so a wrong flag has to cost one click rather
    // than forcing the whole option off to rescue one row.
    const [keptDuplicates, setKeptDuplicates] = useState(() => new Set());
    // Per-row category overrides, keyed by row index. Empty means "use the
    // bulk category chosen on the mapping step", so the import works exactly
    // as before if nothing here is ever touched.
    const [rowCats, setRowCats] = useState({});
    const [catBusy, setCatBusy] = useState(false);
    const [catErr, setCatErr] = useState("");
    const [catCount, setCatCount] = useState(0);
    const sortedCats = useMemo(() => [...categories].sort((a, b) => a.localeCompare(b)), [categories]);
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
      setExcludedRows(new Set());
      setRowCats({});
      setCatErr("");
      setCatCount(0);
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
    // best-effort duplicate flag — computed fresh each time the mapping
    // changes so the preview always reflects the current column choices.
    //
    // A statement row can already be in the budget two ways, and both have to
    // be checked. The obvious one is an entry someone typed in. The one that
    // used to be missed is a **scheduled occurrence of a recurring entry**:
    // this only compared against `existingEntries.filter((e) => !e.repeats)`,
    // so importing a bank statement into a budget that already forecasts Rent
    // produced a second Rent as a one-time entry — double-counted in the
    // running balance and in Budget vs Actual, with "Possible duplicate"
    // never firing because the recurring original was excluded from the
    // comparison. Most rows on a statement are bills the budget predicted, so
    // that was the common case, not the corner one.
    //
    // Occurrences match within a few days rather than on the exact date: a
    // scheduled date is a prediction, and a bill due on the 1st routinely
    // posts on the 3rd. A typed one-time entry's date came from reality, so
    // it keeps the exact-date rule it always had.
    const parsedRows = useMemo(() => {
      if (step !== "preview" && step !== "map") return [];
      const existingKeys = new Set(
        existingEntries.filter((e) => !e.repeats).map((e) => `${e.startDate}|${Math.abs(e.amount)}`)
      );
      const OCCURRENCE_DAY_WINDOW = 3;
      const byAmount = {};
      (scheduledOccurrences || []).forEach((o) => {
        const k = String(Math.abs(o.amount));
        (byAmount[k] = byAmount[k] || []).push(o);
      });
      const matchOccurrence = (dateStr, amountCents) => {
        const near = byAmount[String(Math.abs(amountCents))];
        if (!near || !dateStr) return null;
        const t = parseDate(dateStr);
        if (!t || isNaN(t.getTime())) return null;
        return near.find((o) => Math.abs((o.date - t.getTime()) / 864e5) <= OCCURRENCE_DAY_WINDOW) || null;
      };
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
        const matchedEntry = valid && existingKeys.has(`${date}|${amountCents}`);
        const matchedOcc = !matchedEntry && valid ? matchOccurrence(date, amountCents) : null;
        const isDuplicate = !!matchedEntry || !!matchedOcc;
        const duplicateReason = matchedOcc ? `Already scheduled: ${matchedOcc.desc} on ${humanShortDate(localDateStr(matchedOcc.date))}` : matchedEntry ? "Already entered with this date and amount" : "";
        return { i, date, desc, amountCents, type, valid, isDuplicate, duplicateReason };
      });
    }, [dataRows, dateCol, descCol, amountMode, amountCol, debitCol, creditCol, flipSign, step, existingEntries, scheduledOccurrences]);
    // All hooks must run before this — React requires the same hooks in the
    // same order on every render, so the early return for a closed modal has
    // to come after every useState/useMemo above, not before.
    if (!show) return null;
    const dupSuppressed = (r) => skipDuplicates && r.isDuplicate && !keptDuplicates.has(r.i);
    const willImport = (r) => r.valid && !excludedRows.has(r.i) && !dupSuppressed(r);
    const toggleRow = (r) => {
      // For a row currently held back by the duplicate flag, the tick means
      // "import this one after all" — flipping excludedRows instead would
      // leave the checkbox visibly inert, since the flag suppresses it either
      // way.
      if (dupSuppressed(r)) {
        setKeptDuplicates((prev) => new Set(prev).add(r.i));
        setExcludedRows((prev) => {
          const next = new Set(prev);
          next.delete(r.i);
          return next;
        });
        return;
      }
      if (r.isDuplicate && keptDuplicates.has(r.i)) {
        setKeptDuplicates((prev) => {
          const next = new Set(prev);
          next.delete(r.i);
          return next;
        });
        return;
      }
      setExcludedRows((prev) => {
        const next = new Set(prev);
        next.has(r.i) ? next.delete(r.i) : next.add(r.i);
        return next;
      });
    };
    const rowsToImport = parsedRows.filter(willImport);
    // Classifies each row's description against the household's own category
    // list. Everything lands in the preview as an editable dropdown rather
    // than being applied on import, so a wrong guess costs one click and the
    // user still reviews every row before anything is written.
    const autoCategorize = async () => {
      const rows = parsedRows.filter((r) => r.valid);
      if (!rows.length || !sortedCats.length) return;
      setCatBusy(true);
      setCatErr("");
      const validIndices = new Set(rows.map((r) => r.i));
      const schema = {
        type: "object",
        properties: {
          assignments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "integer", description: "The row number given in the list." },
                // Constraining to an enum is what stops the model inventing a
                // category that doesn't exist in this household — the reply
                // can only name one the user already has.
                category: { type: "string", enum: sortedCats }
              },
              required: ["index", "category"],
              additionalProperties: false
            }
          }
        },
        required: ["assignments"],
        additionalProperties: false
      };
      const next = {};
      try {
        for (let start = 0; start < rows.length; start += CSV_AI_BATCH) {
          const batch = rows.slice(start, start + CSV_AI_BATCH);
          const list = batch.map((r) => `${r.i}. ${r.desc} — ${r.type} ${fmt(r.amountCents)}`).join("\n");
          const { data } = await callClaude({
            system: "You categorise personal bank transactions. Use only the categories you are given. Where a description is ambiguous, pick the closest fit rather than a generic catch-all.",
            messages: [{ role: "user", content: `Assign exactly one category to each transaction below. Return one assignment per transaction, using the row number shown.\n\nAvailable categories: ${sortedCats.join(", ")}\n\nTransactions:\n${list}` }],
            schema,
            maxTokens: 4e3,
            effort: "low",
            apiKey
          });
          ((data && data.assignments) || []).forEach((a) => {
            // Guard the index too: the schema pins the category to a real one,
            // but nothing stops a row number being echoed back wrong, and a
            // stray key would silently categorise a row the user never saw.
            if (validIndices.has(a.index) && sortedCats.includes(a.category)) next[a.index] = a.category;
          });
        }
        setRowCats((prev) => ({ ...prev, ...next }));
        setCatCount(Object.keys(next).length);
      } catch (e) {
        setCatErr(aiErrorMessage(e));
      } finally {
        setCatBusy(false);
      }
    };
    const doImport = () => {
      const newEntries = rowsToImport.map((r) => ({
        id: genId(),
        desc: r.desc,
        type: r.type,
        amount: r.amountCents,
        category: rowCats[r.i] || category,
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
    const colOptions = (value, onChange, placeholder) => <select
      className="field-input"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
    >
      <option value={-1}>{placeholder}</option>
      {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
    </select>;
    return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Import CSV">
      <div className="modal-card csvimport-modal-card" onClick={(e) => e.stopPropagation()}>
        <SheetHandle onDismiss={close} />
        <div className="cf-row-between mb-16">
          <div className="modal-title-lg" style={{ marginBottom: 0 }}>Import CSV</div>
          <button onClick={close} aria-label="Close" className="cf-close-x">✕</button>
        </div>
        {step === "upload" && <>
          <label className="csvimport-drop-zone">
            <Icon name="upload" size={22} />
            <span>Choose a CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </label>
          {parseErr && <div className="field-error-text mt-8">{parseErr}</div>}
        </>}
        {step === "map" && <>
          <div className="txl mb-14">
            {fileName}
            {" — "}
            {dataRows.length}
            {" row"}
            {dataRows.length !== 1 ? "s" : ""}
            . Confirm which columns to use:
          </div>
          <div className="mb-12">
            <label className="field-label">Date column</label>
            {colOptions(dateCol, setDateCol, "— Select —")}
          </div>
          <div className="mb-12">
            <label className="field-label">Description column</label>
            {colOptions(descCol, setDescCol, "— Select —")}
          </div>
          <div className="mb-12">
            <PillToggle
              options={[{ id: "single", label: "One amount column" }, { id: "split", label: "Separate debit / credit" }]}
              value={amountMode}
              onChange={setAmountMode}
            />
          </div>
          {amountMode === "single" ? <>
            <div className="mb-12">
              <label className="field-label">Amount column</label>
              {colOptions(amountCol, setAmountCol, "— Select —")}
            </div>
            <Toggle value={flipSign} onChange={setFlipSign} label="Flip sign (negative = income)" />
          </> : <div className="entry-form-row2">
            <div>
              <label className="field-label">Debit (money out) column</label>
              {colOptions(debitCol, setDebitCol, "— Select —")}
            </div>
            <div>
              <label className="field-label">Credit (money in) column</label>
              {colOptions(creditCol, setCreditCol, "— Select —")}
            </div>
          </div>}
          <div className="mt-12">
            <FieldLabel
              helpLabel="Default category"
              help="A starting point for every row. On the next step you can set categories row by row, or have Claude suggest them from the descriptions."
            >
              Default category
            </FieldLabel>
            <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {sortedCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="oem-footer-row">
            <button
              onClick={() => setStep("upload")}
              className="cf-btn cf-btn--secondary"
              style={{ marginRight: "auto" }}
            >
              ← Back
            </button>
            <button onClick={close} className="cf-btn cf-btn--secondary">Cancel</button>
            <button
              onClick={() => setStep("preview")}
              disabled={dateCol < 0 || descCol < 0 || (amountMode === "single" ? amountCol < 0 : debitCol < 0 && creditCol < 0) || !category}
              className="cf-btn cf-btn--primary btn-pad-24"
            >
              Preview →
            </button>
          </div>
        </>}
        {step === "preview" && <>
          <div className="cf-row-between mb-12">
            <span className="txl">
              {rowsToImport.length}
              {" of "}
              {parsedRows.length}
              {" row"}
              {parsedRows.length !== 1 ? "s" : ""}
              {" will be imported"}
            </span>
            <label className="cf-row cf-gap-6" style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              Skip likely duplicates
            </label>
          </div>
          <div className="cf-row cf-gap-10 cf-wrap mb-12">
            <button
              onClick={autoCategorize}
              disabled={catBusy || isOffline || !aiCanRun(apiKey) || !parsedRows.some((r) => r.valid)}
              title={isOffline ? "You're offline — categorising needs a connection." : !aiCanRun(apiKey) ? "Add an Anthropic API key in Settings → General, or deploy the ai-proxy Edge Function." : void 0}
              className="cf-btn cf-btn--secondary"
            >
              {catBusy ? "Categorising…" : "✦ Suggest categories"}
            </button>
            {catCount > 0 && !catBusy && <span className="field-hint-text">
              {"Claude set "}
              {catCount}
              {" categor"}
              {catCount === 1 ? "y" : "ies"}
              {" — review them below before importing."}
            </span>}
          </div>
          {catErr && <div className="field-error-text mb-12">{catErr}</div>}
          <div className="hscroll csvimport-preview-wrap" role="region" aria-label="Import preview">
            <table className="forecast-table">
              <thead>
                <tr className="thead-row">
                  {["", "Date", "Description", "Amount", "Type", "Category"].map((h) => <th
                    key={h}
                    className="forecast-th"
                  >
                    {h}
                  </th>)}
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r) => {
                const excluded = !willImport(r);
                return <tr key={r.i} className="forecast-tr" style={{ opacity: excluded ? 0.45 : 1 }}>
                  <td>
                    {r.valid && <input
                      type="checkbox"
                      aria-label={`Import row ${r.i + 1}: ${r.desc || "untitled"}`}
                      checked={willImport(r)}
                      onChange={() => toggleRow(r)}
                    />}
                  </td>
                  <td className="forecast-td-date">{r.date || "—"}</td>
                  <td className="forecast-desc-cell">
                    {r.desc || "—"}
                    {!r.valid && <span className="field-error-text">{" Couldn't parse this row"}</span>}
                    {r.isDuplicate && <span className="yoy-tag yoy-tag--gone" title={r.duplicateReason}>
                      Possible duplicate
                    </span>}
                    {r.isDuplicate && r.duplicateReason && <div className="csvimport-dup-reason">
                      {r.duplicateReason}
                    </div>}
                  </td>
                  <td className="cf-text-mono-13">{r.amountCents != null ? fmt(r.amountCents) : "—"}</td>
                  <td>{r.type}</td>
                  <td>
                    {r.valid && <select
                      className="field-input csvimport-cat-select"
                      aria-label={`Category for ${r.desc || "row " + (r.i + 1)}`}
                      value={rowCats[r.i] || category}
                      onChange={(e) => setRowCats((prev) => ({ ...prev, [r.i]: e.target.value }))}
                    >
                      {sortedCats.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>}
                  </td>
                </tr>;
              })}
              </tbody>
            </table>
          </div>
          <div className="oem-footer-row">
            <button
              onClick={() => setStep("map")}
              className="cf-btn cf-btn--secondary"
              style={{ marginRight: "auto" }}
            >
              ← Back
            </button>
            <button onClick={close} className="cf-btn cf-btn--secondary">Cancel</button>
            <button
              onClick={doImport}
              disabled={rowsToImport.length === 0}
              className="cf-btn cf-btn--primary btn-pad-24"
            >
              {`Import ${rowsToImport.length} entr${rowsToImport.length === 1 ? "y" : "ies"}`}
            </button>
          </div>
        </>}
      </div>
    </div>;
  }
