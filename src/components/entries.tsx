import { genId, useEffect, useMemo, useState } from "../lib/runtime.js";
import { isArchived, signedAmount } from "../lib/dates.js";
import { fmt, fmtDate, fmtVarRange } from "../lib/format.js";
import { DEFAULT_ENTRIES_COLS, ENTRIES_COL_LABELS, WEEKDAYS, eventMatchesSearch, scheduleSentence, useIsCoarsePointer, useIsMobile, useLS } from "../lib/app-data.js";
import { Card, CatChip, ConfirmDialog, EmptyState, GridPagination, PillToggle, SheetHandle, cumulativeRows, paginateRows, useInfiniteScroll } from "./primitives.js";
import { ContextMenu, EntryForm, FilterPill } from "./forms.js";
import { CsvImportModal } from "./csv-import.js";
import { Icon } from "./misc-ui.js";
import type { Entry } from "../types.js";
  export interface EntriesViewProps {
    entries: Entry[];
    setEntries: (...args: any[]) => any;
    saveEntryEdit?: any;
    addEntry: (...args: any[]) => any;
    categories: string[];
    categoryColors?: Record<string, any>;
    activeYear: number;
    apiKey?: string;
    isOffline?: boolean;
    onDeleted?: (...args: any[]) => any;
    templates?: any[];
    setTemplates?: (...args: any[]) => any;
    globalSearch?: string;
    allYearFlows?: any;
    colOrder?: string[];
    setColOrder?: (...args: any[]) => any;
    filter?: string;
    setFilter?: (...args: any[]) => any;
    filterCats?: any[];
    setFilterCats?: (...args: any[]) => any;
    filterScheds?: any[];
    setFilterScheds?: (...args: any[]) => any;
    pushUndo?: (...args: any[]) => any;
    setGlobalSearch?: (...args: any[]) => any;
    filterStatus?: any[];
    setFilterStatus?: (...args: any[]) => any;
  }
  export function EntriesView({ entries, setEntries, saveEntryEdit = null, addEntry, categories, categoryColors = {}, activeYear, apiKey = "", isOffline = false, onDeleted = () => {
  }, templates = [], setTemplates, globalSearch = "", allYearFlows = null, colOrder = DEFAULT_ENTRIES_COLS, setColOrder = () => {
  }, filter = "all", setFilter = () => {
  }, filterCats = [], setFilterCats = () => {
  }, filterScheds = [], setFilterScheds = () => {
  }, pushUndo = () => {
  }, setGlobalSearch = () => {
  }, filterStatus = [], setFilterStatus = () => {
  } }: EntriesViewProps) {
    const cols = Array.isArray(colOrder) && colOrder.length ? colOrder : DEFAULT_ENTRIES_COLS;
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchAllYears, setSearchAllYears] = useState(false);
    const [sortCol, setSortCol] = useState("startDate");
    const [sortDir, setSortDir] = useState("asc");
    const [pgPage, setPgPage] = useState(0);
    // Remembered, like every other preference in this app. A reader who sets
    // a table to 100 rows has said something about how they read it, and it
    // was being thrown away on every navigation — three pagination controls
    // did this, in an app where the account filter, the budget month, the
    // debt strategy and every sub-tab are all kept. Distinct keys, because
    // "how many ledger entries fit" and "how many forecast days fit" are
    // different questions about different tables.
    const [pgSize, setPgSize] = useLS("cf_entriesPageSize", 20);
    const [mobileLoaded, setMobileLoaded] = useState(1);
    const changePageSize = (v) => {
      setPgSize(v);
      setPgPage(0);
      setMobileLoaded(1);
    };
    const toggleSort = (col) => {
      if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
      else {
        setSortCol(col);
        setSortDir("asc");
      }
    };
    const [ctxMenu, setCtxMenu] = useState(null);
    const openCtx = (e, entry) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ x: e.clientX, y: e.clientY, entry });
    };
    const isMobile = useIsMobile();
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const isCoarsePointer = useIsCoarsePointer();
    // Entries used to keep its own search box alongside the header one, so on
    // desktop there were two searches with undeclared scopes and a placeholder
    // that had to explain the other one ("Search… (header: …)"). There is one
    // search now, in one piece of state: the header owns it above 768px, this
    // box owns it below (where the header search is hidden), and either way it
    // filters the same list.
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [dragCol, setDragCol] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [showCsvImport, setShowCsvImport] = useState(false);
    // Flattened across every configured year: a statement can span a year
    // boundary, and the modal only needs date/amount/desc to match on.
    const csvScheduled = useMemo(() => {
      if (!allYearFlows) return [];
      const out = [];
      Object.keys(allYearFlows).forEach((yr) => {
        (allYearFlows[yr] || []).forEach((ev) => {
          out.push({ date: ev.date, amount: ev.amount, desc: ev.desc });
        });
      });
      return out;
    }, [allYearFlows]);
    const handleCsvImport = (newEntries) => {
      if (addEntry) newEntries.forEach((e) => addEntry(e));
      else setEntries((prev) => [...prev, ...newEntries]);
    };
    const openNew = () => {
      setEditing(null);
      setShowForm(true);
    };
    const openEdit = (e) => {
      setEditing(e);
      setShowForm(true);
    };
    const close = () => {
      setShowForm(false);
      setEditing(null);
    };
    useEffect(() => {
      const onNew = () => openNew();
      window.addEventListener("cf:entries-open-new", onNew);
      return () => {
        window.removeEventListener("cf:entries-open-new", onNew);
      };
    }, []);
    useEffect(() => {
      if (!showForm) return;
      const h = (e) => {
        if (e.key === "Escape") {
          setShowForm(false);
          setEditing(null);
        }
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [showForm]);
    const doCopy = (e) => {
      const copy = { ...e, id: genId(), desc: e.desc + " (copy)" };
      if (addEntry) addEntry(copy);
      else setEntries((prev) => [...prev, copy]);
    };
    const handleSave = (data) => {
      if (editing) {
        if (saveEntryEdit) saveEntryEdit(editing.id, data);
        else setEntries((prev) => prev.map((e) => e.id === editing.id ? { ...data, id: editing.id } : e));
      } else if (addEntry) addEntry(data);
      else setEntries((prev) => [...prev, { ...data, id: genId() }]);
      close();
    };
    // Bulk selection. The Monthly grid has had row checkboxes and a select-all
    // since it was written; Entries — the list where "recategorise these six"
    // and "delete these old one-offs" actually come up — had none, so the only
    // way to do either was one row menu at a time.
    const [selIds, setSelIds] = useState(() => new Set());
    const [bulkCat, setBulkCat] = useState("");
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const toggleSel = (id) => setSelIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    const clearSel = () => setSelIds(() => new Set());
    const bulkRecategorise = (cat) => {
      if (!cat) return;
      const ids = new Set(selIds);
      const before = entries;
      setEntries((prev) => prev.map((e) => ids.has(e.id) ? { ...e, category: cat } : e));
      pushUndo(`${ids.size} ${ids.size === 1 ? "entry" : "entries"} moved to "${cat}"`, () => setEntries(before));
      setBulkCat("");
      clearSel();
    };
    const bulkDelete = () => {
      const ids = new Set(selIds);
      const removed = entries.filter((e) => ids.has(e.id));
      setEntries((prev) => prev.filter((e) => !ids.has(e.id)));
      // One undo for the whole selection rather than one per row, so undoing a
      // ten-row delete is one press.
      pushUndo(`${removed.length} ${removed.length === 1 ? "entry" : "entries"} deleted`, () => setEntries((prev) => [...prev, ...removed]));
      setConfirmBulkDelete(false);
      clearSel();
    };
    const [confirmDelEntry, setConfirmDelEntry] = useState(null);
    const confirmDelete = () => {
      const deleted = entries.find((e) => e.id === confirmDelEntry);
      setEntries((prev) => prev.filter((e) => e.id !== confirmDelEntry));
      setConfirmDelEntry(null);
      if (deleted) onDeleted(deleted);
    };
    const yearScoped = !searchAllYears;
    const visibleCols = cols.filter((c) => c !== "actions");
    // Memoized so opening a context menu, toggling a mobile filter sheet, or
    // any other unrelated re-render doesn't re-run the full filter/sort chain
    // over every entry — only when something that actually changes the
    // result set does.
    const filtered = useMemo(() => entries.filter((e) => !yearScoped || !activeYear || e.startDate && e.startDate.startsWith(String(activeYear)) || !e.startDate || e.repeats && (!e.recurEnd || e.recurEnd >= String(activeYear) + "-01-01")).filter((e) => filter === "all" || e.type === filter).filter((e) => filterCats.length === 0 || filterCats.includes(e.category)).filter((e) => filterScheds.length === 0 || filterScheds.includes("recurring") && e.repeats || filterScheds.includes("onetime") && !e.repeats).filter((e) => {
      if (filterStatus.length === 0) return true;
      const arc = isArchived(e, activeYear);
      return filterStatus.includes("active") && !arc || filterStatus.includes("historical") && arc;
    }).filter((e) => {
      const q = (globalSearch || "").toLowerCase();
      return eventMatchesSearch(e, q);
    }).filter((e) => {
      if (!dateFrom && !dateTo) return true;
      const sd = e.startDate || "";
      if (dateFrom && sd && sd < dateFrom) return false;
      if (dateTo && sd && sd > dateTo) return false;
      return true;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortCol === "startDate") cmp = (a.startDate || "").localeCompare(b.startDate || "");
      else if (sortCol === "amount") cmp = (a.amount || 0) - (b.amount || 0);
      else if (sortCol === "desc") cmp = (a.desc || "").localeCompare(b.desc || "");
      else if (sortCol === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else if (sortCol === "schedule") cmp = a.repeats === b.repeats ? 0 : a.repeats ? 1 : -1;
      else cmp = (a.desc || "").localeCompare(b.desc || "");
      return sortDir === "asc" ? cmp : -cmp;
    }), [entries, yearScoped, activeYear, filter, filterCats, filterScheds, filterStatus, globalSearch, dateFrom, dateTo, sortCol, sortDir]);
    const pgInfo = isMobile ? cumulativeRows(filtered, mobileLoaded, pgSize) : paginateRows(filtered, pgPage, pgSize);
    useInfiniteScroll(isMobile && pgInfo.hasMore, () => setMobileLoaded((l) => l + 1));
    const paged = pgInfo.rows;
    const recurLabel = (e) => {
      if (!e.repeats) return <span className="recur-onetime">One-time</span>;
      const u = e.recurUnit || "month", ev = e.recurEvery || 1;
      if (u === "semimonth") return "Semi-monthly";
      if (u === "monthend") return "Month end";
      if (u === "monthweekday") return "Monthly (weekday)";
      if (u === "week" && e.recurDays?.length > 1) return `Every ${ev}w \xB7 ${e.recurDays.map((d) => WEEKDAYS[d].slice(0, 2)).join("/")}`;
      if (u === "week") return `Every ${ev}wk`;
      if (u === "day") return `Every ${ev}d`;
      if (u === "month") return ev === 1 ? "Monthly" : `Every ${ev}mo`;
      if (u === "year") return ev === 1 ? "Annually" : `Every ${ev}yr`;
      return "\u2014";
    };
    const onDragStart = (col) => {
      setDragCol(col);
    };
    const onDragOver = (e, col) => {
      e.preventDefault();
      setDragOver(col);
    };
    const onDrop = (col) => {
      if (!dragCol || dragCol === col) return;
      const arr = [...colOrder];
      const from = arr.indexOf(dragCol), to = arr.indexOf(col);
      arr.splice(from, 1);
      arr.splice(to, 0, dragCol);
      setColOrder(arr);
      setDragCol(null);
      setDragOver(null);
    };
    // Keyboard alternative to drag-reordering the columns.
    const moveCol = (col, dir) => {
      const arr = [...cols];
      const from = arr.indexOf(col), to = from + dir;
      if (from < 0 || to < 0 || to >= arr.length) return;
      arr.splice(from, 1);
      arr.splice(to, 0, col);
      setColOrder(arr);
    };
    const cellVal = (e, col) => {
      const archived = isArchived(e, activeYear);
      const arcText = { color: archived ? "var(--textLt)" : "var(--text)", textDecoration: archived ? "line-through" : "none" };
      const arcMeta = { color: archived ? "var(--textLt)" : "var(--textMid)", textDecoration: archived ? "line-through" : "none" };
      switch (col) {
        case "desc":
          return <td key={col} className="entries-desc-cell" style={arcText} title={e.desc}>
            {e.desc}
            {archived && <span className="historical-tag">{" \xB7 historical"}</span>}
          </td>;
        case "type":
          return <td key={col} className="entries-col-type" style={{ opacity: archived ? 0.5 : 1 }}>
            <span
              className="entries-type-badge"
              style={{ background: e.type === "income" ? "#E8F8F1" : e.type === "transfer" ? "var(--accentLt)" : "var(--redLt)", color: e.type === "income" ? "var(--greenDk)" : e.type === "transfer" ? "var(--accent)" : "var(--red)" }}
            >
              {e.type}
            </span>
          </td>;
        case "amount":
          return <td
            key={col}
            className="entries-col-amount cf-text-mono-13"
            style={{ color: archived ? "var(--textLt)" : e.type === "transfer" ? "var(--accent)" : e.type === "income" ? "var(--greenDk)" : "var(--text)", textDecoration: archived ? "line-through" : "none" }}
          >
            {e.monthlyAmounts ? (signedAmount(e) >= 0 ? "+" : "-") + fmtVarRange(e.monthlyAmounts) : fmt(signedAmount(e), true)}
          </td>;
        case "startDate":
          return <td key={col} className="entries-col-date" style={arcMeta}>
            {e.startDate ? fmtDate(e.startDate, null) : "\u2014"}
          </td>;
        case "schedule":
          return <td key={col} className="entries-col-sched" style={arcMeta} title={scheduleSentence(e)}>
            {recurLabel(e)}
          </td>;
        case "until":
          return <td key={col} className="entries-col-until" style={arcMeta}>
            {e.repeats ? e.recurEnd ? <span {...arcMeta}>{fmtDate(e.recurEnd, null)}</span> : <span
              style={{ color: archived ? "var(--textLt)" : "var(--greenDk)", textDecoration: archived ? "line-through" : "none" }}
            >
              ongoing
            </span> : "\u2014"}
          </td>;
        case "category":
          return <td key={col} className="entries-col-cat" style={{ opacity: archived ? 0.5 : 1 }}>
            <CatChip category={e.category} categories={categories} categoryColors={categoryColors} />
          </td>;
        case "notes":
          return <td key={col} className="entries-col-notes" style={arcMeta}>{e.notes}</td>;
        default:
          return <td key={col} />;
      }
    };
    const activeFilterCount = filterCats.length + filterScheds.length + filterStatus.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
    const filterControls = <>
      <FilterPill
        label="Category"
        allLabel="All categories"
        inline={isMobile}
        selected={filterCats}
        onChange={setFilterCats}
        options={[...categories].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c }))}
      />
      <FilterPill
        label="Schedule"
        allLabel="All schedules"
        inline={isMobile}
        selected={filterScheds}
        onChange={setFilterScheds}
        options={[{ value: "recurring", label: "Recurring" }, { value: "onetime", label: "One-time" }]}
      />
      <FilterPill
        label="Status"
        allLabel="All statuses"
        inline={isMobile}
        selected={filterStatus}
        onChange={setFilterStatus}
        options={[{ value: "active", label: "Active" }, { value: "historical", label: "Historical" }]}
      />
      {// Real <label>s wrapping their own field, not floating spans. As two
    // siblings in a wrapping flex row the labels drifted away from their
    // inputs at phone width — "To" ended up stranded on the line above the
    // field it names, beside the *From* input. A label that wraps its control
    // can't come apart from it, and screen readers stop needing the
    // aria-label crutch.
    <div className="entries-daterange">
      <label className="entries-daterange-field">
        <span className="txl">From</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="entries-date-input"
        />
      </label>
      <label className="entries-daterange-field">
        <span className="txl">To</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="entries-date-input"
        />
      </label>
      {(dateFrom || dateTo) && <button
        onClick={() => {
            setDateFrom("");
            setDateTo("");
          }}
        aria-label="Clear date range"
        title="Clear date range"
        className="link-btn-sm"
      >
        ✕
      </button>}
    </div>
}
    </>;
    return <div className="cf-page">
      <div className="entries-toptools-row">
        <PillToggle
          options={[{ id: "all", label: "All Types" }, { id: "income", label: "Income" }, { id: "expense", label: "Expenses" }]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <div className="entries-filter-row">
        {!isMobile && filterControls}
        {isMobile && <button
          onClick={() => setShowMobileFilters(true)}
          aria-haspopup="dialog"
          className="entries-mobile-filter-btn"
          style={{
          border: "1.5px solid " + (activeFilterCount > 0 ? "var(--navy)" : "var(--border)"),
          background: activeFilterCount > 0 ? "rgba(28,43,58,0.07)" : "var(--bgCard)",
          color: activeFilterCount > 0 ? "var(--navy)" : "var(--text)"
        }}
        >
          ⚙️ Filters
          {activeFilterCount > 0 && <span className="entries-filter-count-badge">{activeFilterCount}</span>}
        </button>}
        {globalSearch && <label className="entries-allyears-label">
          <input
            type="checkbox"
            checked={searchAllYears}
            onChange={(e) => setSearchAllYears(e.target.checked)}
            className="cursor-pointer"
          />
          All years
        </label>}
        <div className="entries-search-wrap">
          <Icon name="search" size={13} className="entries-search-icon" />
          <input
            // Names its scope, so it is clear what will and won't be searched.
            placeholder={`Search ${activeYear} entries\u2026`}
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            aria-label={`Search ${activeYear} entries`}
            type="search"
            className="entries-search-input"
          />
        </div>
        <button
          onClick={() => setShowCsvImport(true)}
          className="cf-btn cf-btn--secondary cf-btn--md cf-btn--nowrap"
        >
          Import CSV
        </button>
        <button onClick={openNew} className="cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap">
          + Add Entry
        </button>
        {globalSearch && <div className="notice notice--sm" data-tone="warn" role="status">
          <Icon name="search" size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
          Filtering by "
          {globalSearch}
          {'" \u2014 '}
          {filtered.length}
          {" match"}
          {filtered.length !== 1 ? "es" : ""}
        </div>}
      </div>
      {isMobile && showMobileFilters && <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="modal-card entries-mobilefilters-card">
          <SheetHandle onDismiss={() => setShowMobileFilters(false)} />
          <div className="cf-row-between mb-16">
            <span className="csv-title">Filters</span>
            {// The button that opens this sheet shows a count badge, but there was
        // no way to act on it \u2014 clearing meant reopening each pill and
        // unticking. Only offered when something is actually set.
        <div className="cf-row cf-gap-8">
          {activeFilterCount > 0 && <button
            onClick={() => {
              setFilterCats([]);
              setFilterScheds([]);
              setFilterStatus([]);
              setDateFrom("");
              setDateTo("");
            }}
            className="cf-btn cf-btn--secondary cf-btn--sm"
          >
            Clear all
          </button>}
          <button
            onClick={() => setShowMobileFilters(false)}
            aria-label="Close filters"
            title="Close filters"
            className="cf-close-x"
          >
            ✕
          </button>
        </div>
}
          </div>
          <div className="entries-mobilefilters-stack">{filterControls}</div>
          <button
            onClick={() => setShowMobileFilters(false)}
            className="cf-btn cf-btn--primary entries-showresults-btn"
          >
            Show results
          </button>
        </div>
      </div>}
      {showForm && <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit entry" : "Add entry"}
      >
        <div className="modal-card entryform-modal-card" onClick={(e) => e.stopPropagation()}>
          <SheetHandle onDismiss={close} />
          <div className="cf-row-between mb-16">
            <div className="modal-title-lg" style={{ marginBottom: 0 }}>
              {editing ? "Edit Entry" : "Add Entry"}
            </div>
            <button onClick={close} aria-label="Close" className="cf-close-x">✕</button>
          </div>
          <EntryForm
            initial={editing}
            onSave={handleSave}
            onCancel={close}
            categories={categories}
            apiKey={apiKey}
            isOffline={isOffline}
            templates={templates || []}
            onSaveTemplate={(t) => setTemplates && setTemplates((prev) => [...prev.filter((x) => x.desc !== t.desc), t])}
          />
        </div>
      </div>}
      {selIds.size > 0 && <div className="budget-bulkbar budget-bulkbar--accent" role="status">
        <span className="budget-bulkbar-count">{selIds.size}{" selected"}</span>
        <select
          aria-label="Move selected entries to a category"
          className="entries-bulk-cat"
          value={bulkCat}
          onChange={(e) => bulkRecategorise(e.target.value)}
        >
          <option value="">Move to category…</option>
          {[...categories].sort((a, b) => a.localeCompare(b)).map((c) => <option key={c} value={c}>
            {c}
          </option>)}
        </select>
        <button
          onClick={() => setConfirmBulkDelete(true)}
          className="budget-bulk-markpaid-btn entries-bulk-delete"
        >
          Delete
        </button>
        <button onClick={clearSel} aria-label="Clear selection" className="budget-bulk-clear-btn">
          Clear
        </button>
      </div>}
      <Card className="cf-card--flush">
        <div className="entries-table-wrap" tabIndex={0} role="region" aria-label="Entries table">
          <table className="entries-table">
            <thead>
              <tr className="thead-row">
                <th className="entries-th entries-th--select">
                  <input
                    type="checkbox"
                    aria-label={paged.length && paged.every((e) => selIds.has(e.id)) ? "Clear selection" : "Select all rows on this page"}
                    title="Select every row on this page"
                    checked={paged.length > 0 && paged.every((e) => selIds.has(e.id))}
                    onChange={(ev) => {
        // Scoped to the page you can see, like the Monthly grid's — selecting
        // rows that are scrolled out of a filtered list is not something you
        // can check before acting on it.
        const all = ev.target.checked;
        setSelIds((prev) => {
          const next = new Set(prev);
          paged.forEach((e) => all ? next.add(e.id) : next.delete(e.id));
          return next;
        });
      }}
                  />
                </th>
                {visibleCols.map((col) => <th
                  key={col}
                  // Per-column modifier so a column can be styled by identity rather
                  // than position — the columns are drag-reorderable, so nth-child
                  // would follow whatever slot the user dragged it into.
                  className={"entries-th entries-th--col entries-th--" + col}
                  tabIndex={0}
                  aria-label={`${ENTRIES_COL_LABELS[col] || col} column${isCoarsePointer ? "" : " — press left or right arrow to reorder"}`}
                  draggable={!isCoarsePointer}
                  aria-sort={sortCol === col ? sortDir === "asc" ? "ascending" : "descending" : void 0}
                  onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveCol(col, -1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            moveCol(col, 1);
          } else if ((e.key === "Enter" || e.key === " ") && ["desc", "amount", "startDate", "category", "schedule"].includes(col)) {
            e.preventDefault();
            toggleSort(col);
          }
        }}
                  onDragStart={() => onDragStart(col)}
                  onDragOver={(e) => onDragOver(e, col)}
                  onDrop={() => onDrop(col)}
                  style={{
          background: dragOver === col ? "#3d5570" : "var(--navy)"
        }}
                >
                  {["desc", "amount", "startDate", "category", "schedule"].includes(col) ? <span
                    onClick={(e) => {
            e.stopPropagation();
            toggleSort(col);
          }}
                    className="entries-th-sort-label"
                    title={`Sort by ${ENTRIES_COL_LABELS[col]}`}
                  >
                    {ENTRIES_COL_LABELS[col]}
                    <span className="entries-sort-arrow" style={{ opacity: sortCol === col ? 1 : 0.35 }}>
                      {sortCol === col ? sortDir === "asc" ? "\u25B2" : "\u25BC" : "\u283F"}
                    </span>
                  </span> : <>
        {ENTRIES_COL_LABELS[col]}
        {col !== "actions" && col !== "notes" ? <span className="entries-th-drag-hint">{" \u283F"}</span> : ""}
      </>}
                </th>)}
                <th key="actions-hdr" className="entries-th entries-th--actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {paged.map((e, i) => <tr
                key={e.id}
                onContextMenu={(ev) => openCtx(ev, e)}
                className="entries-tr"
                style={{ background: selIds.has(e.id) ? "var(--stripe)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" }}
              >
                <td className="entries-col-select">
                  <input
                    type="checkbox"
                    aria-label={`Select ${e.desc}`}
                    checked={selIds.has(e.id)}
                    onChange={() => toggleSel(e.id)}
                  />
                </td>
                {visibleCols.map((col) => cellVal(e, col))}
                <td key="actions" className="entries-actions">
                  <button
                    onClick={(ev) => openCtx(ev, e)}
                    aria-label={`${e.desc} actions`}
                    title={`${e.desc} actions`}
                    className="cf-checkbtn row-menu-btn"
                  >
                    ⋮
                  </button>
                </td>
              </tr>)}
              {filtered.length === 0 && <tr>
                <td colSpan={visibleCols.length + 2} className="entries-empty-cell">
                  <EmptyState
                    icon={<Icon name={globalSearch ? "search" : "clipboard"} size={26} className="c-textLt" />}
                    message={globalSearch ? `No entries matching "${globalSearch}"` : "No entries found matching your filters."}
                    actionLabel={!(globalSearch) && "+ Add Entry"}
                    onAction={openNew}
                  />
                </td>
              </tr>}
            </tbody>
          </table>
        </div>
        <div className="entries-cards">
          {paged.map((e, i) => {
      const archived = isArchived(e, activeYear);
      const arcStyle = {
        color: archived ? "var(--textLt)" : "var(--text)",
        textDecoration: archived ? "line-through" : "none"
      };
      const isInc = signedAmount(e) >= 0;
      return <div key={e.id} onContextMenu={(ev) => openCtx(ev, e)} className="entries-mobile-card">
        <div className="entries-mobile-card-toprow">
          <div className="flex-1 min-w-0">
            <div className="entries-mobile-desc" style={arcStyle}>
              {e.desc}
              {archived && <span className="historical-tag">{" \xB7 historical"}</span>}
            </div>
          </div>
          <div
            className="cf-text-mono-13 entries-mobile-amount"
            style={{
          color: archived ? "var(--textLt)" : e.type === "transfer" ? "var(--accent)" : isInc ? "var(--greenDk)" : "var(--text)",
          textDecoration: archived ? "line-through" : "none"
        }}
          >
            {e.monthlyAmounts ? (isInc ? "+" : "-") + fmtVarRange(e.monthlyAmounts) : fmt(signedAmount(e), true)}
          </div>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              openCtx(ev, e);
            }}
            aria-label={`${e.desc} actions`}
            className="cf-checkbtn row-menu-btn"
          >
            ⋮
          </button>
        </div>
        <div className="cf-row cf-gap-8 cf-wrap">
          {e.category && <CatChip
            category={e.category}
            categories={categories}
            categoryColors={categoryColors}
          />}
          {e.startDate && <span className="entries-mobile-date">
            {fmtDate(e.startDate, null)}
            {e.repeats && ` \xB7 ${recurLabel(e)}`}
          </span>}
          {e.notes && <span className="entries-mobile-notes">{e.notes}</span>}
        </div>
      </div>;
    })}
          {filtered.length === 0 && <div className="entries-empty-cell">
            <EmptyState
              icon={<Icon name={globalSearch ? "search" : "clipboard"} size={26} className="c-textLt" />}
              message={globalSearch ? `No entries matching "${globalSearch}"` : "No entries found matching your filters."}
              actionLabel={!(globalSearch) && "+ Add Entry"}
              onAction={openNew}
            />
          </div>}
        </div>
        <GridPagination
          pageInfo={pgInfo}
          setPage={setPgPage}
          pageSize={pgSize}
          setPageSize={changePageSize}
          label="entries"
          isMobile={isMobile}
        />
      </Card>
      {confirmDelEntry !== null && <ConfirmDialog
        title="Delete Entry?"
        message="This will permanently remove this entry and all its scheduled occurrences. This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDelEntry(null)}
      />}
      {ctxMenu && <ContextMenu
        x={ctxMenu.x}
        y={ctxMenu.y}
        onClose={() => setCtxMenu(null)}
        items={[
          { icon: "\u270E", label: "Edit entry", action: () => openEdit(ctxMenu.entry) },
          { icon: "\u2398", label: "Duplicate", action: () => {
            doCopy(ctxMenu.entry);
          } },
          "---",
          { icon: "\u2715", label: "Delete entry", action: () => setConfirmDelEntry(ctxMenu.entry.id), danger: true }
        ]}
      />}
      <CsvImportModal
        show={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        onImport={handleCsvImport}
        categories={categories}
        existingEntries={entries}
        // Every scheduled occurrence the app knows about, so the import can
        // recognise a statement row the budget already predicts (a recurring
        // bill) and not add a second copy of it.
        scheduledOccurrences={csvScheduled}
        apiKey={apiKey}
        isOffline={isOffline}
      />
      {confirmBulkDelete && <ConfirmDialog
        title={`Delete ${selIds.size} ${selIds.size === 1 ? "entry" : "entries"}?`}
        message={`Every scheduled occurrence of ${selIds.size === 1 ? "this entry" : "these entries"} disappears from the budget. The toast that follows offers one undo.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={bulkDelete}
      />}
    </div>;
  }
