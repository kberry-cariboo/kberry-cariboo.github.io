import { genId, safeStorage, useContext, useEffect, useMemo, useRef, useState } from "../lib/runtime.js";
import { centsToDollars, dollarsToCents } from "../lib/migrate.js";
import { accountIdOf, daysInMonth, depositShiftNote, getMonthSummaries, isInflowEvent, isOutflowEvent, signedAmount, startOfToday } from "../lib/dates.js";
import { categoryDetail } from "../lib/cat-detail.js";
import { ExportBar, downloadCSV, fmt, printView, roundMoney } from "../lib/format.js";
import { BUDGET_COL_LABELS, DEFAULT_ALERT_THRESHOLD, DEFAULT_BUDGET_COLS, HouseholdContext, MONTHS, accountName, autoFocusOnDesktop, eventMatchesSearch, haptic, useIsCoarsePointer, useIsMobile, useLS, varianceTitle } from "../lib/app-data.js";
import { Card, CatChip, CategoryDetailSheet, ConfirmDialog, EmptyState, GridPagination, HelpTip, KpiCard, LedgerRow, MonthPicker, SheetHandle, cumulativeRows, getCatColor, paginateRows, useInfiniteScroll } from "./primitives.js";
import { ContextMenu, EntryForm } from "./forms.js";
import { Icon, OccurrenceEditModal } from "./misc-ui.js";
import { toast } from "./auth-misc.js";
import type { Cents, Entry, FlowRow } from "../types.js";
  // Hoisted out of BudgetView: defining these inside the component made React
  // see a new component type each render and remount their DOM.
  export const TodayLine = () => <tr key="today-marker">
    <td colSpan={8} className="today-line-td">
      <div className="today-line-wrap">
        <div className="today-line-strip" />
        <span className="today-label">TODAY</span>
        <div className="today-line-strip" />
      </div>
    </td>
  </tr>;
  export const TodayLineCard = () => <div key="today-marker-card" className="today-line-card-wrap">
    <div className="today-line-strip" />
    <span className="today-label">TODAY</span>
    <div className="today-line-strip" />
  </div>;
  export interface BudgetViewProps {
    apiKey?: string;
    isOffline?: boolean;
    flow: FlowRow[];
    prevYearFlow?: FlowRow[];
    prevYearConfigured?: boolean;
    openBal: Cents;
    entries?: Entry[];
    setOverride: (...args: any[]) => any;
    clearOverride: (...args: any[]) => any;
    categories: string[];
    categoryColors?: Record<string, any>;
    setEntries: (...args: any[]) => any;
    saveEntryEdit?: any;
    addEntry: (...args: any[]) => any;
    pushUndo?: (...args: any[]) => any;
    flowSub?: string;
    showEnvelopes?: boolean;
    setFlowSub?: (...args: any[]) => any;
    monthIdx: number;
    setMonthIdx: (...args: any[]) => any;
    alertThreshold?: number;
    globalSearch?: string;
    templates?: any[];
    setTemplates?: (...args: any[]) => any;
    budgetTargets?: Record<string, any>;
    setBudgetTargets?: (...args: any[]) => any;
    completed?: Record<string, any>;
    toggleComplete?: (...args: any[]) => any;
    markOccurrencesPaid?: (...args: any[]) => any;
    activeYear?: number;
    budgetColOrder?: string[];
    setBudgetColOrder?: (...args: any[]) => any;
    onDeleted?: (...args: any[]) => any;
    onAddNextYear?: any;
    skippedOccurrences?: any[];
  }
  export function BudgetView({ apiKey = "", isOffline = false, flow, prevYearFlow = [], prevYearConfigured = false, openBal, entries = [], setOverride, clearOverride, categories, categoryColors = {}, setEntries, saveEntryEdit = null, addEntry, pushUndo = () => {
  }, flowSub = "list", showEnvelopes = false, setFlowSub = () => {
  }, monthIdx, setMonthIdx, alertThreshold = DEFAULT_ALERT_THRESHOLD, globalSearch = "", templates = [], setTemplates, budgetTargets = {}, setBudgetTargets, completed = {}, toggleComplete = () => {
  }, markOccurrencesPaid = () => {
  }, activeYear = (new Date()).getFullYear(), budgetColOrder = DEFAULT_BUDGET_COLS, setBudgetColOrder = () => {
  }, onDeleted = () => {
  }, onAddNextYear = null, skippedOccurrences = [] }: BudgetViewProps) {
    const isMobile = useIsMobile();
    const isCoarsePointer = useIsCoarsePointer();
    const { logActivity, accounts: hhAccounts } = useContext(HouseholdContext);
    // Which account a row is in, shown only once there is more than one — with
    // a single account it would name the only place the money could be, on
    // every row. It also tells the two halves of an internal transfer apart:
    // in the combined ledger they are the same description twice, once leaving
    // one account and once arriving in the other.
    const acctTag = (ev) => (hhAccounts || []).length > 1
      ? <span className="row-account-tag">{accountName(hhAccounts, accountIdOf(ev))}</span>
      : null;
    // Envelopes is its own destination, so it wins over whichever lens the
    // Flow tab was last left on.
    const lens = showEnvelopes ? "bva" : flowSub;
    const [showSwipeCoach, setShowSwipeCoach] = useState(() => {
      try {
        return window.matchMedia && window.matchMedia("(pointer:coarse)").matches && !localStorage.getItem("cf_coach_swipe");
      } catch (e) {
        return false;
      }
    });
    const dismissSwipeCoach = () => {
      safeStorage.set("cf_coach_swipe", "1");
      setShowSwipeCoach(false);
    };
    const [showOccurrenceForm, setShowOccurrenceForm] = useState(false);
    const [editingEv, setEditingEv] = useState(null);
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [editingInitial, setEditingInitial] = useState(null);
    const openOccurrenceEdit = (ev) => {
      setEditingEv(ev);
      setShowOccurrenceForm(true);
    };
    const handleOccurrenceSave = (data) => {
      if (editingEv && setOverride) {
        setOverride(editingEv.id, { desc: data.desc, amount: data.amount, month: data.month, day: data.day, notes: data.notes || "", attachment: data.attachment || null, actualAmount: data.actualAmount });
      }
      setShowOccurrenceForm(false);
      setEditingEv(null);
    };
    // Skipping removes just this one date from the recurrence — the entry
    // and every other occurrence are untouched. Only meaningful for
    // recurring entries; a one-time entry's only "occurrence" is the entry
    // itself, which is what Delete already covers.
    const skipOccurrence = (ev) => {
      if (!setOverride) return;
      haptic();
      setOverride(ev.id, { skipped: true });
      toast(`Skipped "${ev.desc}" — ${MONTHS[ev.month]} ${ev.day}`);
      setShowOccurrenceForm(false);
      setEditingEv(null);
    };
    const restoreSkipped = (occId) => {
      if (!clearOverride) return;
      clearOverride(occId);
    };
    const [confirmDelEv, setConfirmDelEv] = useState(null);
    const requestDeleteEntry = (ev) => setConfirmDelEv(ev);
    const confirmDeleteEntry = () => {
      if (!confirmDelEv) return;
      const orig = entries.find((e) => e.id === confirmDelEv.entryId);
      setEntries((prev) => prev.filter((e) => e.id !== confirmDelEv.entryId));
      if (orig) onDeleted(orig);
      setConfirmDelEv(null);
      setShowOccurrenceForm(false);
      setEditingEv(null);
      toast(`Deleted "${orig?.desc || confirmDelEv.desc}"`);
    };
    const openEntryEdit = (ev) => {
      const orig = entries.find((e) => e.id === ev.entryId);
      if (!orig) return;
      setEditingEntry({ ...orig, _editMonth: ev.month });
      setEditingInitial(orig);
      setShowEntryForm(true);
    };
    const openAddEntry = () => {
      setEditingEntry(null);
      setEditingInitial(null);
      setShowEntryForm(true);
    };
    const handleEntrySave = (data) => {
      if (editingEntry) {
        let finalData = { ...data, id: editingEntry.id };
        delete finalData._editMonth;
        if (saveEntryEdit) saveEntryEdit(editingEntry.id, finalData);
        else setEntries((prev) => prev.map((e) => e.id === editingEntry.id ? finalData : e));
      } else if (addEntry) addEntry(data);
      else setEntries((prev) => [...prev, { ...data, id: genId() }]);
      setShowEntryForm(false);
      setEditingEntry(null);
      setEditingInitial(null);
    };
    const dragRef = useRef(null);
    const justDraggedRef = useRef(false);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverDay, setDragOverDay] = useState(null);
    const handleDragStart = (e, ev) => {
      dragRef.current = { id: ev.id, fromDay: ev.day, startY: e.clientY, active: false, pointerId: e.pointerId };
    };
    const handleDragMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dy = e.clientY - d.startY;
      if (!d.active && Math.abs(dy) > 6) {
        d.active = true;
        setDraggingId(d.id);
        try {
          e.target.setPointerCapture(d.pointerId);
        } catch (e2) {
          // Pointer capture is an enhancement; drag still works without it.
        }
      }
      if (d.active) {
        e.preventDefault();
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const rowEl = el && el.closest && el.closest("tr[data-day]");
        if (rowEl) {
          const day = parseInt(rowEl.getAttribute("data-day"), 10);
          if (!isNaN(day)) setDragOverDay(day);
        }
      }
    };
    const handleDragEnd = (e) => {
      const d = dragRef.current;
      if (d && d.active) {
        e.stopPropagation();
        if (dragOverDay != null && dragOverDay !== d.fromDay) setOverride(d.id, { day: dragOverDay });
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
      }
      dragRef.current = null;
      setDraggingId(null);
      setDragOverDay(null);
    };
    const summaries = useMemo(() => getMonthSummaries(flow, openBal), [flow, openBal]);
    const s = summaries[monthIdx] || summaries[0];
    // month -> category -> expense total, computed once per flow change in a
    // single pass — feeds both this month's BvA actuals and the envelope-
    // rollover carry loop below, which used to re-filter the whole `flow`
    // array per (month, category) pair (O(months * categories * flow.length)
    // on a year with several rollover categories active in December).
    const monthCatExpense = useMemo(() => {
      const byMonth = Array.from({ length: 12 }, () => ({}));
      flow.forEach((ev) => {
        if (ev.type !== "expense") return;
        const m = byMonth[ev.month];
        m[ev.category] = (m[ev.category] || 0) + ev.amount;
      });
      return byMonth;
    }, [flow]);
    const prevYear = (activeYear || (new Date()).getFullYear()) - 1;
    const [compareYoy, setCompareYoy] = useLS("cf_budgetCompareYoy", false);
    const yoyActive = lens === "list" && compareYoy && prevYearConfigured;
    const prevSummaries = useMemo(() => getMonthSummaries(prevYearFlow, 0), [prevYearFlow]);
    const ps = prevSummaries[monthIdx] || { income: 0, expense: 0, surplus: 0 };
    const prevHasData = prevYearFlow.length > 0;
    const yoyDeltaSub = (cur, prev) => {
      if (!yoyActive || !prevHasData) return null;
      const d = roundMoney((cur - prev));
      const sign = d > 0 ? "▲ " : d < 0 ? "▼ " : "";
      return `${sign}${fmt(Math.abs(d))} vs ${prevYear}`;
    };
    const yoyRows = useMemo(() => {
      if (!yoyActive) return [];
      const norm = (str) => (str || "").toLowerCase().trim();
      const r2 = (n) => roundMoney(n);
      const map = new Map();
      const add = (ev, key) => {
        const k = ev.type + "|" + norm(ev.desc);
        const signed = signedAmount(ev);
        let row = map.get(k);
        if (!row) {
          row = { desc: ev.desc, category: ev.category, type: ev.type, cur: 0, prev: 0, day: ev.day };
          map.set(k, row);
        }
        row[key] += signed;
        if (key === "cur" || row.day == null) row.day = ev.day;
      };
      flow.filter((ev) => ev.month === monthIdx).forEach((ev) => add(ev, "cur"));
      prevYearFlow.filter((ev) => ev.month === monthIdx).forEach((ev) => add(ev, "prev"));
      const rows = [...map.values()].map((row) => ({ ...row, cur: r2(row.cur), prev: r2(row.prev), delta: r2(row.cur - row.prev) }));
      rows.sort((a, b) => a.day - b.day || (a.desc || "").localeCompare(b.desc || ""));
      return rows;
    }, [yoyActive, flow, prevYearFlow, monthIdx]);
    const todayDate = new Date();
    const gq = (globalSearch || "").toLowerCase();
    const matchingMonths = useMemo(() => {
      if (!gq) return new Set<number>();
      const s2 = new Set<number>();
      flow.filter((ev) => eventMatchesSearch(ev, gq)).forEach((ev) => s2.add(ev.month));
      return s2;
    }, [gq, flow]);
    useEffect(() => {
      if (!gq) return;
      const arr = [...matchingMonths];
      if (!arr.length) return;
      // "Most recent" month with a match: the latest one up to today (for the
      // current year), falling back to the earliest future match.
      const nowMo = (new Date()).getFullYear() === activeYear ? (new Date()).getMonth() : 11;
      const past = arr.filter((m) => m <= nowMo);
      const target = past.length ? Math.max(...past) : Math.min(...arr);
      if (target !== monthIdx) setMonthIdx(target);
    }, [gq]);
    const [showBvaModal, setShowBvaModal] = useState(false);
    const [budgetCtx, setBudgetCtx] = useState(null);
    // Device-local: whether you want the month's four totals open is a
    // property of the screen you are reading on, like the analysis on Today.
    const [monthSummaryOpen, setMonthSummaryOpen] = useLS("cf_month_summary", false);
    const [selIds, setSelIds] = useState(() => new Set<string>());
    const [pgPage, setPgPage] = useState(0);
    const [pgSize, setPgSize] = useLS("cf_budgetPageSize", "all");
    const [mobileLoaded, setMobileLoaded] = useState(1);
    const changePageSize = (v) => {
      setPgSize(v);
      setPgPage(0);
      setMobileLoaded(1);
    };
    const bCols = Array.isArray(budgetColOrder) && budgetColOrder.length ? budgetColOrder : DEFAULT_BUDGET_COLS;
    const [dragBCol, setDragBCol] = useState(null);
    const [dragOverBCol, setDragOverBCol] = useState(null);
    const onBColDragStart = (col) => {
      setDragBCol(col);
    };
    const onBColDragOver = (e, col) => {
      e.preventDefault();
      setDragOverBCol(col);
    };
    const onBColDrop = (col) => {
      if (!dragBCol || dragBCol === col) return;
      const arr = [...bCols];
      const from = arr.indexOf(dragBCol), to = arr.indexOf(col);
      arr.splice(from, 1);
      arr.splice(to, 0, dragBCol);
      setBudgetColOrder(arr);
      setDragBCol(null);
      setDragOverBCol(null);
    };
    // Keyboard alternative to drag-reordering the columns.
    const moveBCol = (col, dir) => {
      const arr = [...bCols];
      const from = arr.indexOf(col), to = from + dir;
      if (from < 0 || to < 0 || to >= arr.length) return;
      arr.splice(from, 1);
      arr.splice(to, 0, col);
      setBudgetColOrder(arr);
    };
    const toggleSel = (id) => setSelIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    const clearSel = () => setSelIds(new Set());
    const markSelectedPaid = () => {
      try {
        const ids = [...selIds].filter((id) => !completed[id]);
        if (!ids.length) {
          toast("Nothing unpaid in selection", "error");
          return;
        }
        markOccurrencesPaid(ids);
        haptic();
        toast(`Marked ${ids.length} item${ids.length !== 1 ? "s" : ""} paid for ${MONTHS[monthIdx]}`);
        clearSel();
      } catch (err) {
        toast("Bulk update failed: " + err.message, "error");
      }
    };
    useEffect(() => {
      clearSel();
    }, [monthIdx, flowSub, activeYear]);
    const [bvaModalData, setBvaModalData] = useState<{ cat: string; target: string; editCat: string | null; rollover?: boolean }>({ cat: "", target: "", editCat: null });
    const [bvaCtxMenu, setBvaCtxMenu] = useState(null);
    // Which envelope's breakdown is open. The row says Housing is $4,183.32
    // of $4,183.32 and stops there; the payments behind it were two screens
    // away, in Flow, behind a filter set by hand — the same gap Today's
    // category widget had, one scope down.
    const [bvaDetailCat, setBvaDetailCat] = useState(null);
    const [bvaOpenRows, setBvaOpenRows] = useState({});
    const openBvaDetail = (cat) => { setBvaOpenRows({}); setBvaDetailCat(cat); };
    const closeBvaDetail = () => { setBvaOpenRows({}); setBvaDetailCat(null); };
    // Escape closes it, as it does every other reading surface in the app.
    useEffect(() => {
      if (bvaDetailCat === null) return;
      const h = (e) => { if (e.key === "Escape") closeBvaDetail(); };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [bvaDetailCat]);
    // Scoped to the month on screen, and scoped the same way the row's own
    // total is: monthCatExpense sums `flow` by ev.month, so this filters
    // `flow` by ev.month and nothing else. A breakdown that does not add up
    // to the figure the reader pressed is worse than no breakdown.
    const bvaDetail = useMemo(
      () => (bvaDetailCat === null ? null
        : categoryDetail(flow.filter((ev) => ev.month === monthIdx), bvaDetailCat)),
      [flow, monthIdx, bvaDetailCat]
    );
    const monthEvents = useMemo(() => flow.filter((ev) => ev.month === monthIdx && eventMatchesSearch(ev, gq)), [flow, monthIdx, gq]);
    // Skipped occurrences never enter `flow` at all, so this is the only way
    // to find (and undo) one — surfaced only for the currently-viewed month
    // to keep it relevant rather than a growing year-long list.
    const skippedThisMonth = useMemo(() => skippedOccurrences.filter((s) => s.month === monthIdx), [skippedOccurrences, monthIdx]);
    const period1 = monthEvents.filter((ev) => ev.day <= 14);
    const period2 = monthEvents.filter((ev) => ev.day > 14);
    // Monthly grid is paginated (bounded rows-per-page) rather than internally
    // scrolling — period1/period2 above stay as the "does this month have any
    // events at all" source of truth; the paged-* variants below are what
    // actually get rendered, re-split by period so the "Jan 1–14" / "15–31"
    // section headers only show when the current page has rows in them.
    const monthPg = isMobile ? cumulativeRows(monthEvents, mobileLoaded, pgSize) : paginateRows(monthEvents, pgPage, pgSize);
    useInfiniteScroll(isMobile && monthPg.hasMore, () => setMobileLoaded((l) => l + 1));
    const pagedPeriod1 = monthPg.rows.filter((ev) => ev.day <= 14);
    const pagedPeriod2 = monthPg.rows.filter((ev) => ev.day > 14);
    const selTotal = monthEvents.filter((ev) => selIds.has(ev.id)).reduce((sum, ev) => sum + signedAmount(ev), 0);
    const _isCurMonth = todayDate.getMonth() === monthIdx && todayDate.getFullYear() === activeYear;
    const todayMarkerId = _isCurMonth ? monthEvents.find((ev) => ev.day >= todayDate.getDate())?.id ?? "AFTER_ALL" : null;
    const isToday = (day) => activeYear === todayDate.getFullYear() && todayDate.getMonth() === monthIdx && todayDate.getDate() === day;
    const isPast = (day) => activeYear < todayDate.getFullYear() || activeYear === todayDate.getFullYear() && (monthIdx < todayDate.getMonth() || monthIdx === todayDate.getMonth() && day < todayDate.getDate());
    const renderEventRow = (ev, i) => {
      const past = isPast(ev.day);
      // A recurring entry appears several times in one month, so its name on
      // its own does not identify the row: five of September's ledger rows are
      // "Fuel". The day is what tells them apart on screen, so it is what
      // tells them apart to a screen reader too.
      const rowName = `${ev.desc}, ${MONTHS[monthIdx]} ${ev.day}`;
      const isDone = !!completed[ev.id];
      const isDragging = draggingId === ev.id;
      const isDropTarget = draggingId != null && draggingId !== ev.id && dragOverDay === ev.day;
      return <tr
        key={ev.id}
        data-day={ev.day}
        onClick={() => {
            if (justDraggedRef.current) return;
            openOccurrenceEdit(ev);
          }}
        onContextMenu={(e) => {
            e.preventDefault();
            setBudgetCtx({ x: e.clientX, y: e.clientY, ev });
          }}
        className="budget-event-tr"
        style={{
            background: selIds.has(ev.id) ? "var(--stripe)" : isDone ? "var(--doneBg)" : past ? "var(--pastBg)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)",
            borderBottom: isDropTarget ? "2px solid var(--primary)" : "1px solid var(--border)",
            // Past rows are tinted, not faded — see pastBg in app-data.js.
            // Drag opacity stays: it's a transient gesture, not a way of
            // presenting content you still have to read.
            opacity: isDragging ? 0.4 : 1
          }}
      >
        <td
          className="budget-col-checkbox budget-col-checkbox--cell"
          onClick={(e) => e.stopPropagation()}
          style={{
          background: isDone ? "var(--doneBg)" : selIds.has(ev.id) ? "var(--stripe)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)",
          boxShadow: isDone ? "inset 3px 0 0 0 var(--greenDk)" : "inset 3px 0 0 0 transparent"
        }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptic();
              if (isDone) toggleComplete(ev.id);
              else toggleSel(ev.id);
            }}
            role="checkbox"
            aria-checked={isDone || selIds.has(ev.id)}
            // Named, like the phone card beside it (LedgerRow) and the Entries
            // table's own checkbox — a monthly ledger puts twenty of these on
            // screen, and "Select row" told a screen reader nothing about
            // which row it had landed on.
            aria-label={(isDone ? "Mark unpaid: " : selIds.has(ev.id) ? "Deselect: " : "Select: ") + rowName}
            title={isDone ? "Paid \u2014 click to mark unpaid" : "Select to mark paid"}
            className="cf-checkbtn budget-row-checkbtn"
            style={{
              border: isDone || selIds.has(ev.id) ? "none" : "1.5px solid var(--border)",
              background: isDone ? "var(--greenDk)" : selIds.has(ev.id) ? "var(--primary)" : "transparent"
            }}
          >
            {isDone ? "\u2713" : selIds.has(ev.id) ? "\u2713" : ""}
          </button>
        </td>
        <td
          className="budget-col-day cf-text-mono-13 budget-day-cell"
          onPointerDown={(e) => handleDragStart(e, ev)}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          title="Drag up/down to reschedule within this month"
          style={{
              color: isDone ? "var(--textLt)" : "var(--textMid)",
              textDecoration: isDone ? "line-through" : "none"
            }}
        >
          {ev.day}
          {ev.depositShifted && <HelpTip
            icon="↤"
            variant="mark"
            label="Deposit date"
            text={depositShiftNote(ev)}
          />}
          <span className="drag-dots">⠿</span>
        </td>
        {bCols.map((col) => {
          if (col === "desc") return <td
            key={col}
            className="budget-desc-cell budget-col-desc budget-desc-td"
            title={ev.desc}
            style={{
            color: isDone ? "var(--textLt)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none"
          }}
          >
            {ev.desc}
            {ev.attachment && <span className="attach-indicator" title="Has receipt">
              <Icon name="paperclip" size={11} />
            </span>}
            {ev.isOverride && <span className="override-mark">✎</span>}
            {acctTag(ev)}
          </td>;
          if (col === "category") return <td key={col} className="budget-col-cat">
            <CatChip
              category={ev.category}
              categories={categories}
              categoryColors={categoryColors}
              className="text-9"
            />
          </td>;
          if (col === "income") {
            const showHere = isInflowEvent(ev);
            return <td
              key={col}
              className="budget-col-income cf-text-mono-13 budget-amount-td"
              title={showHere ? varianceTitle(ev) : void 0}
              style={{
              color: isDone ? "var(--textLt)" : ev.type === "transfer" ? "var(--accent)" : "var(--greenDk)",
              textDecoration: isDone ? "line-through" : "none"
            }}
            >
              {showHere ? fmt(ev.amount) : ""}
            </td>;
          }
          if (col === "expense") {
            const showHere = isOutflowEvent(ev);
            return <td
              key={col}
              className="budget-col-expense cf-text-mono-13 budget-amount-td"
              title={showHere ? varianceTitle(ev) : void 0}
              style={{
              color: isDone ? "var(--textLt)" : ev.type === "transfer" ? "var(--accent)" : "var(--text)",
              textDecoration: isDone ? "line-through" : "none"
            }}
            >
              {showHere ? fmt(ev.amount) : ""}
            </td>;
          }
          if (col === "balance") return <td
            key={col}
            className="budget-col-balance cf-text-mono-13 budget-balance-td"
            style={{
            textDecoration: isDone ? "line-through" : "none",
            color: isDone ? "var(--textLt)" : ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amberInk)" : "var(--text)"
          }}
          >
            {fmt(ev.balance)}
          </td>;
          return null;
        })}
        <td className="budget-th-actions" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBudgetCtx({ x: e.clientX, y: e.clientY, ev });
            }}
            aria-label={rowName + " actions"}
            title={ev.desc + " actions"}
            className="cf-checkbtn row-menu-btn"
          >
            ⋮
          </button>
        </td>
      </tr>;
    };
    const renderPeriodHdr = (label) => (
      // borderLeft on <tr> (not <td>) so the 3px sits OUTSIDE the cell width,
      // matching exactly how data rows position the green/transparent stripe.
      <tr key={label}>
        <td
          className="budget-col-checkbox budget-spacer-td"
          style={{
        background: "var(--navyMid)"
      }}
        />
        <td colSpan={7} className="period-hdr-td">{label}</td>
      </tr>
    );
    const renderPeriodCardHdr = (label) => <div key={label} className="period-hdr-td">{label}</div>;
    const renderEventCard = (ev, opts: { hideDayLabel?: boolean } = {}) => <LedgerRow
      key={ev.id}
      ev={ev}
      alertThreshold={alertThreshold}
      paid={!!completed[ev.id]}
      selected={selIds.has(ev.id)}
      past={isPast(ev.day)}
      // "Day 3" is not how the rest of the app dates a row — the alerts feed
      // and the forecast ledger both print "Sep 3" — and repeated down a
      // phone screen the word is ten copies of something the column header
      // says once on a desktop.
      dateLabel={opts.hideDayLabel ? null : MONTHS[ev.month] + " " + ev.day}
      onTogglePaid={toggleComplete}
      onToggleSelect={toggleSel}
      onOpen={openOccurrenceEdit}
      onMenu={(e, row) => setBudgetCtx({ x: e.clientX, y: e.clientY, ev: row })}
      onSwipeLeft={(row) => skipOccurrence(row)}
      categories={categories}
      categoryColors={categoryColors}
    />;
    const renderMonthlyMobileCards = () => <Card className="cf-card--flush">
      <div className="openbal-card-row">
        <span className="lbl">Opening Balance</span>
        <span
          className="mno mno-700"
          style={{
      color: s.open < 0 ? "var(--red)" : s.open < alertThreshold ? "var(--amberInk)" : "var(--text)"
    }}
        >
          {fmt(s.open)}
        </span>
      </div>
      {period1.length === 0 && period2.length === 0 ? <div className="budget-empty-msg">
        {gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month — matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`}
      </div> : <
      >
        {pagedPeriod1.length > 0 && <>
          {renderPeriodCardHdr(`${MONTHS[monthIdx]} 1–14`)}
          {pagedPeriod1.map((ev) => <React.Fragment key={ev.id}>
            {ev.id === todayMarkerId && <TodayLineCard />}
            {renderEventCard(ev)}
          </React.Fragment>)}
        </>}
        {pagedPeriod2.length > 0 && <>
          {renderPeriodCardHdr(`${MONTHS[monthIdx]} 15–${daysInMonth(monthIdx, activeYear)}`)}
          {pagedPeriod2.map((ev) => <React.Fragment key={ev.id}>
            {ev.id === todayMarkerId && <TodayLineCard />}
            {renderEventCard(ev)}
          </React.Fragment>)}
        </>}
        {todayMarkerId === "AFTER_ALL" && monthPg.safePage === monthPg.totalPages - 1 && <TodayLineCard />}
      </>}
      <div className="monthly-totals-row">
        <span className="totals-label">Monthly Totals</span>
        <span className="totals-amounts-row">
          <span className="mno mno-700-green">{fmt(s.income)}</span>
          <span className="mno mno-700-coral">{fmt(s.expense)}</span>
          <span className="mno mno-700" style={{ color: s.surplus >= 0 ? "var(--mint)" : "var(--coral)" }}>
            {fmt(s.surplus, true)}
          </span>
        </span>
      </div>
      <GridPagination
        pageInfo={monthPg}
        setPage={setPgPage}
        pageSize={pgSize}
        setPageSize={changePageSize}
        label="events"
        isMobile={true}
      />
    </Card>;
    // ── Calendar ───────────────────────────────────────────────────────────
    // The month laid out as a month, which is the shape people already hold
    // this question in: "what's hitting my account, and when". Replaces Daily,
    // which restated Monthly one row per day — at 1440px that was a day
    // number, a wide empty middle and a balance pinned to the far right, about
    // a third of Monthly's density for the same content, which is why it was
    // cut from a phone. A grid earns the width Daily wasted, and it earns its
    // place on a phone too.
    const [calSelDay, setCalSelDay] = useState(null);
    // Reset the open day whenever the month or year moves — day 19 of the
    // month you just left is not a selection, it is a stale index.
    useEffect(() => {
      setCalSelDay(null);
    }, [monthIdx, activeYear]);
    const calendar = useMemo(() => {
      const total = daysInMonth(monthIdx, activeYear);
      // Weeks start Sunday, matching the app's other weekday handling
      // (recurDays, nthWeekdayInMonth) where 0 is Sunday.
      const lead = new Date(activeYear, monthIdx, 1).getDay();
      let runBal = s ? s.open : openBal;
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push(null);
      for (let day = 1; day <= total; day++) {
        const evs = monthEvents.filter((ev) => ev.day === day);
        // A quiet day carries the balance from the day before — that carry is
        // what makes the grid a running balance rather than a scatter of the
        // days something happened.
        if (evs.length > 0) runBal = evs[evs.length - 1].balance;
        cells.push({
          day,
          events: evs,
          balance: runBal,
          net: evs.reduce((sum, ev) => sum + signedAmount(ev), 0)
        });
      }
      while (cells.length % 7 !== 0) cells.push(null);
      const weeks = [];
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
      return weeks;
    }, [monthEvents, s, monthIdx, activeYear, openBal]);
    const calSelected = calSelDay == null ? null : calendar.flat().find((c) => c && c.day === calSelDay) || null;
    const CAL_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const renderCalendar = () => <>
      <Card className="cf-card--flush">
        <div
          className="cal-grid"
          role="grid"
          aria-label={`${MONTHS[monthIdx]} ${activeYear}, balance by day`}
        >
          <div className="cal-row cal-row--head" role="row">
            {CAL_DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">
              <span className="cal-dow-full">{d}</span>
              <span className="cal-dow-short" aria-hidden={true}>{d[0]}</span>
            </div>)}
          </div>
          {calendar.map((week, wi) => <div key={wi} className="cal-row" role="row">
            {week.map((cell, ci) => {
        if (!cell) return <div
          key={ci}
          className="cal-cell cal-cell--blank"
          role="gridcell"
          aria-hidden={true}
        />;
        const low = cell.balance < 0 ? "neg" : cell.balance < alertThreshold ? "warn" : "";
        const today = isToday(cell.day);
        const openDay = calSelDay === cell.day;
        // Everything the cell shows, said once for a screen reader — reading
        // out a day number, a stack of amounts and a balance as loose text
        // gives no clue which day they belong to.
        const label = `${MONTHS[monthIdx]} ${cell.day}` + (today ? ", today" : "") + ", " + (cell.events.length === 0 ? "nothing scheduled" : `${cell.events.length} event${cell.events.length === 1 ? "" : "s"}, net ${fmt(cell.net, true)}`) + `, balance ${fmt(cell.balance)}` + (low === "neg" ? ", overdrawn" : low === "warn" ? ", below your alert threshold" : "");
        return <button
          key={ci}
          type="button"
          role="gridcell"
          className={"cal-cell" + (low ? " cal-cell--" + low : "") + (today ? " cal-cell--today" : "") + (openDay ? " cal-cell--open" : "") + (cell.events.length === 0 ? " cal-cell--quiet" : "")}
          aria-label={label}
          aria-pressed={openDay}
          onClick={() => {
              haptic();
              setCalSelDay(openDay ? null : cell.day);
            }}
        >
          <span className="cal-daynum">{cell.day}</span>
          <span className="cal-bal mno">{fmt(cell.balance)}</span>
          <span className="cal-events">
            {cell.events.slice(0, 3).map((ev) => <span
              key={ev.id}
              className={"cal-ev" + (completed[ev.id] ? " cal-ev--done" : "")}
              title={`${ev.desc} ${fmt(signedAmount(ev), true)}`}
            >
              <span
                className="cal-ev-dot"
                style={{ background: getCatColor(ev.category, categories, categoryColors) }}
              />
              <span className="cal-ev-desc">{ev.desc}</span>
              <span className="cal-ev-amt mno">{fmt(signedAmount(ev), true)}</span>
            </span>)}
            {cell.events.length > 3 && <span className="cal-ev-more">+{cell.events.length - 3}{" more"}</span>}
          </span>
          {// The phone cell has no room for the lines above; it gets a dot per
          // event (capped) and the same tint, and opens the day below on tap.
          cell.events.length > 0 && <span className="cal-dots" aria-hidden={true}>
            {cell.events.slice(0, 4).map((ev) => <span
              key={ev.id}
              className="cal-dot"
              style={{ background: getCatColor(ev.category, categories, categoryColors) }}
            />)}
          </span>
}
        </button>;
      })}
          </div>)}
        </div>
      </Card>
      {calSelected && <Card className="cf-card--flush mt-16">
        <div className="cal-day-hdr">
          <span>
            {MONTHS[monthIdx]}
            {" "}
            {calSelected.day}
            <span className="cal-day-bal mno">{"balance "}{fmt(calSelected.balance)}</span>
          </span>
          <button
            type="button"
            className="cf-btn cf-btn--secondary cf-btn--tiny"
            onClick={() => setCalSelDay(null)}
          >
            Close
          </button>
        </div>
        {calSelected.events.length === 0 ? <div className="budget-empty-msg">
          Nothing scheduled on this day.
        </div> : calSelected.events.map((ev) => renderEventCard(ev, { hideDayLabel: true }))}
      </Card>}
    </>;
    const renderYoyCompare = () => {
      const deltaCls = (d) => d > 0 ? "yoy-delta-pos" : d < 0 ? "yoy-delta-neg" : "";
      const amtCell = (v) => v === 0 ? <span className="c-textLt">—</span> : fmt(v, true);
      const totCur = yoyRows.reduce((a, r) => a + r.cur, 0);
      const totPrev = yoyRows.reduce((a, r) => a + r.prev, 0);
      const totDelta = roundMoney((totCur - totPrev));
      return <Card className="cf-card--flush yoy-card">
        <div className="yoy-header-row">
          <span className="yoy-title">
            {`${MONTHS[monthIdx]} ${activeYear} vs ${MONTHS[monthIdx]} ${prevYear}`}
          </span>
        </div>
        {!prevHasData ? <div className="budget-empty-msg">{`No ${prevYear} entries to compare against.`}</div> : yoyRows.length === 0 ? <div
          className="budget-empty-msg"
        >
          {`No entries in ${MONTHS[monthIdx]} for either year.`}
        </div> : <div
          className="hscroll"
          tabIndex={0}
          role="region"
          aria-label="Year-over-year comparison table"
        >
          <table className="forecast-table yoy-table">
            <thead>
              <tr className="thead-row">
                <th className="yoy-th-desc">Description</th>
                <th className="yoy-th-cat">Category</th>
                <th className="yoy-th-num">{prevYear}</th>
                <th className="yoy-th-num">{activeYear}</th>
                <th className="yoy-th-num">Δ</th>
              </tr>
            </thead>
            <tbody>
              {yoyRows.map((r, i) => <tr key={r.type + "|" + r.desc + "|" + i} className="yoy-tr">
                <td className="yoy-td-desc" title={r.desc}>
                  {r.desc}
                  {r.prev === 0 && r.cur !== 0 && <span className="yoy-tag yoy-tag--new">New</span>}
                  {r.cur === 0 && r.prev !== 0 && <span className="yoy-tag yoy-tag--gone">Dropped</span>}
                </td>
                <td className="yoy-td-cat">
                  <CatChip
                    category={r.category}
                    categories={categories}
                    categoryColors={categoryColors}
                    className="text-9"
                  />
                </td>
                <td className="cf-text-mono-13 yoy-num">{amtCell(r.prev)}</td>
                <td className="cf-text-mono-13 yoy-num">{amtCell(r.cur)}</td>
                <td className={"cf-text-mono-13 yoy-num " + deltaCls(r.delta)}>
                  {r.delta === 0 ? <span className="c-textLt">—</span> : fmt(r.delta, true)}
                </td>
              </tr>)}
            </tbody>
            <tfoot>
              <tr className="yoy-foot">
                <td className="yoy-td-desc">Net</td>
                <td />
                <td className="cf-text-mono-13 yoy-num">{fmt(totPrev, true)}</td>
                <td className="cf-text-mono-13 yoy-num">{fmt(totCur, true)}</td>
                <td className={"cf-text-mono-13 yoy-num " + deltaCls(totDelta)}>{fmt(totDelta, true)}</td>
              </tr>
            </tfoot>
          </table>
        </div>}
      </Card>;
    };
    const touchStart = useRef(null);
    const handleTouchStart = (e) => {
      const t = e.target;
      // .hscroll panes scroll horizontally themselves — a fast table fling
      // must never double as a change-month swipe.
      if (t.closest && t.closest("input,button,select,textarea,a,.modal-overlay,.modal-card,[draggable],.hscroll,.ledger-row-wrap")) {
        touchStart.current = null;
        return;
      }
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    };
    const handleTouchEnd = (e) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.t;
      touchStart.current = null;
      if (document.querySelector(".modal-overlay")) return;
      if (dt > 600) return;
      if (Math.abs(dx) < 140) return;
      if (Math.abs(dy) > 60) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.4) return;
      const dir = dx < 0 ? 1 : -1;
      haptic();
      setMonthIdx((v) => Math.max(0, Math.min(11, v + dir)));
      setShowOccurrenceForm(false);
      setEditingEv(null);
      setShowEntryForm(false);
      setEditingEntry(null);
      setEditingInitial(null);
    };
    return <div className="cf-page" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {selIds.size > 0 && lens === "list" && <div className="budget-bulkbar budget-bulkbar--accent">
        <span className="budget-bulkbar-count">{selIds.size}{" selected"}</span>
        <span className="budget-bulkbar-total">{fmt(selTotal, true)}</span>
        <button onClick={markSelectedPaid} className="budget-bulk-markpaid-btn">
          ✓ Mark paid (
          {MONTHS[monthIdx]}
          )
        </button>
        <button onClick={clearSel} aria-label="Clear selection" className="budget-bulk-clear-btn">
          Clear
        </button>
      </div>}
      <MonthPicker
        value={monthIdx}
        onChange={(v) => {
            setMonthIdx(v);
          }}
        noMargin={false}
        // Which months close below the alert threshold, so the strip marks
        // them rather than making you open each one to find out.
        monthCloses={summaries.map((m) => m.close)}
        alertThreshold={alertThreshold}
        matchingMonths={true && gq ? matchingMonths : null}
        onAddNextYear={onAddNextYear}
        nextYear={onAddNextYear ? activeYear + 1 : null}
      />
      {(lens === "list" || lens === "calendar") && skippedThisMonth.length > 0 && <div
        className="notice notice--sm"
        data-tone="warn"
        role="status"
        data-noprint={true}
      >
        <div className="cf-row cf-gap-8 cf-wrap" style={{ alignItems: "center" }}>
          <Icon name="clock" size={12} style={{ flexShrink: 0 }} />
          <span>
            {skippedThisMonth.length}
            {" occurrence"}
            {skippedThisMonth.length !== 1 ? "s" : ""}
            {" skipped in "}
            {MONTHS[monthIdx]}
            :
          </span>
          {skippedThisMonth.map((s) => <span
            key={s.occId}
            className="cf-row cf-gap-6"
            style={{ background: "var(--bgCard)", border: "1px solid var(--amber)", borderRadius: 6, padding: "2px 8px", alignItems: "center" }}
          >
            {s.desc}
            {" ("}
            {s.day}
            )
            <button
              onClick={() => restoreSkipped(s.occId)}
              aria-label={`Restore ${s.desc} on ${MONTHS[s.month]} ${s.day}`}
              title="Restore this occurrence"
              className="link-btn-sm"
            >
              ↺
            </button>
          </span>)}
        </div>
      </div>}
      {lens === "list" && showSwipeCoach && <div className="swipe-coach" data-noprint={true}>
        <span className="cf-row cf-gap-6">
          <Icon name="arrow-right" size={13} style={{ flexShrink: 0 }} />
          Tip: swipe left or right on the grid to change months
        </span>
        <button onClick={dismissSwipeCoach} className="gotit-btn">Got it</button>
      </div>}
      {gq && <div className="notice notice--sm" data-tone="warn" role="status">
        <Icon name="search" size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
        Filtering by "
        {globalSearch}
        {'" \u2014 '}
        {monthEvents.length}
        {" match"}
        {monthEvents.length !== 1 ? "es" : ""}
        . Clear search to see all entries.
      </div>}
      {// Surplus/Shortfall is the month's balance movement, so when the month
      // holds transfers it deliberately differs from Total Income minus Total
      // Expenses sitting beside it — those two exclude transfers by design.
      // The card says so in its sub-line rather than leaving the reader to
      // find a gap they can't account for; the year-over-year delta gives up
      // its place for that, which only happens in months that have transfers.
      lens !== "bva" && <div className="month-summary">
        {// Two-thirds of a phone screen went by before the first ledger row,
        // and the biggest single item was this: four tiles in a 2x2 grid,
        // ~200px, above the rows they summarise. The line states the month's
        // answer; the tiles are one tap under it, with the year-over-year
        // deltas and the transfer note they carry.
        <button
          className="month-summary-line"
          aria-expanded={monthSummaryOpen ? "true" : "false"}
          onClick={() => { haptic(); setMonthSummaryOpen(!monthSummaryOpen); }}
        >
          <span className="month-summary-lead">
            <strong
              className="cf-text-mono-13"
              style={{ color: s.surplus >= 0 ? "var(--greenDk)" : "var(--red)" }}
            >
              {fmt(s.surplus, true)}
            </strong>
            {s.surplus >= 0 ? " surplus" : " shortfall"}
          </span>
          <span className="month-summary-close">
            {"closes "}
            <strong className="cf-text-mono-13">{fmt(s.close)}</strong>
          </span>
          <span className={"month-summary-chev" + (monthSummaryOpen ? " month-summary-chev--open" : "")}>
            <Icon name="chevron-down" size={15} strokeWidth={2.25} />
          </span>
        </button>
}
        {monthSummaryOpen && <div className="kpi-grid">
          <KpiCard
            label="Total Income"
            value={fmt(s.income)}
            color="var(--greenDk)"
            sub={yoyDeltaSub(s.income, ps.income)}
          />
          <KpiCard
            label="Total Expenses"
            value={fmt(s.expense)}
            color="var(--text)"
            sub={yoyDeltaSub(s.expense, ps.expense)}
          />
          <KpiCard
            label="Surplus/Shortfall"
            value={fmt(s.surplus, true)}
            color={s.surplus >= 0 ? "var(--greenDk)" : "var(--red)"}
            sub={s.transfersIn || s.transfersOut ? `incl. ${fmt(s.transfersIn - s.transfersOut, true)} transfers` : yoyDeltaSub(s.surplus, ps.surplus)}
          />
          <KpiCard
            label="Closing Balance"
            value={fmt(s.close)}
            color={s.close < 0 ? "var(--red)" : s.close < alertThreshold ? "var(--amberInk)" : "var(--text)"}
          />
        </div>}
      </div>
}
      {lens === "list" && <div className="budget-list-lens">
        <div className={"budget-toolbar-row" + (prevYearConfigured ? "" : " budget-toolbar-row--end")}>
          {prevYearConfigured && <button
            onClick={() => {
            haptic();
            setCompareYoy((v) => !v);
          }}
            aria-pressed={compareYoy}
            title={`Compare ${MONTHS[monthIdx]} ${activeYear} with ${prevYear}`}
            data-noprint={true}
            className={"cf-btn cf-btn--secondary cf-btn--sm cf-btn--iconrow-sm" + (compareYoy ? " yoy-toggle-active" : "")}
          >
            <Icon name="chart-grouped" size={12} />
            {`Compare ${prevYear}`}
          </button>}
          <ExportBar
            onAdd={openAddEntry}
            onCSV={() => {
            const rows = monthEvents.map((ev) => [`${MONTHS[monthIdx]} ${ev.day}`, ev.desc, ev.category, isInflowEvent(ev) ? centsToDollars(ev.amount) : "", isOutflowEvent(ev) ? centsToDollars(ev.amount) : "", centsToDollars(ev.balance)]);
            downloadCSV(`CashFlow_Budget_${MONTHS[monthIdx]}_Monthly.csv`, rows, ["Date", "Description", "Category", "Income", "Expense", "Balance"]);
          }}
            onPrint={() => printView(`CashFlow Budget - ${MONTHS[monthIdx]} (Monthly)`)}
          />
        </div>
        {yoyActive && renderYoyCompare()}
        {isMobile ? renderMonthlyMobileCards() : <Card className="cf-card--flush">
          <div
            className="hscroll hscroll--paged"
            tabIndex={0}
            role="region"
            aria-label="Monthly budget table"
          >
            <table className="forecast-table budget-monthly-table">
              {(() => {
        const allIds = [...pagedPeriod1, ...pagedPeriod2].map((e) => e.id);
        return <thead>
          <tr className="thead-row">
            <th className="budget-col-checkbox budget-th-checkbox" aria-label="Select all rows">
              {(() => {
          const allSel = allIds.length > 0 && allIds.every((id) => selIds.has(id));
          const someSel = allIds.some((id) => selIds.has(id));
          return <button
            onClick={() => {
                if (allSel) clearSel();
                else setSelIds(new Set(allIds));
              }}
            role="checkbox"
            aria-checked={allSel}
            aria-label={allSel ? "Deselect all rows" : "Select all rows"}
            title={allSel ? "Deselect all" : "Select all"}
            className="budget-selectall-btn"
            style={{
                border: allSel ? "none" : "1.5px solid rgba(255,255,255,0.4)",
                background: allSel ? "var(--navy)" : someSel ? "rgba(255,255,255,0.25)" : "transparent",
                boxShadow: allSel ? "0 0 0 1.5px #fff" : "none"
              }}
          >
            {allSel ? "\u2713" : someSel ? "\u2013" : ""}
          </button>;
        })()}
            </th>
            <th className="budget-col-day budget-th-day">Day</th>
            {bCols.map((col) => <th
              key={col}
              draggable={!isCoarsePointer}
              tabIndex={0}
              aria-label={`${BUDGET_COL_LABELS[col]} column${isCoarsePointer ? "" : " — press left or right arrow to reorder"}`}
              onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                moveBCol(col, -1);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                moveBCol(col, 1);
              }
            }}
              onDragStart={() => onBColDragStart(col)}
              onDragOver={(e) => onBColDragOver(e, col)}
              onDrop={() => onBColDrop(col)}
              className={(col === "category" ? "budget-col-cat budget-col-category" : `budget-col-${col}`) + " budget-th-col"}
              style={{
              textAlign: ["income", "expense", "balance"].includes(col) ? "right" : "left",
              background: dragOverBCol === col ? "#3d5570" : "var(--navy)"
            }}
            >
              {BUDGET_COL_LABELS[col]}
            </th>)}
            <th className="budget-th-actions" aria-label="Actions" />
          </tr>
        </thead>;
      })()}
              <tbody>
                <tr className="openbal-row">
                  {// No background of their own: .openbal-row paints the row, and these two
      // were left painting --amberLt from an earlier design where the whole
      // row was amber. Against the row's --stripe that is a 68px cream block
      // at its head, in both themes. The totals row below does the same thing
      // with --navy on a navy row, which is why only this one shows a seam.
      <td className="budget-col-checkbox budget-spacer-td" />
}
                  <td className="budget-col-day budget-day-spacer-td" />
                  {bCols.map((col) => {
        if (col === "balance") return <td
          key={col}
          className="budget-col-balance cf-text-mono-13 budget-balance-td"
          style={{ color: s.open < 0 ? "var(--red)" : s.open < alertThreshold ? "var(--amberInk)" : "var(--text)" }}
        >
          {fmt(s.open)}
        </td>;
        if (col === "desc") return <td key={col} className="budget-col-desc budget-label-cell">
          Opening Balance
        </td>;
        const cls = col === "category" ? "budget-col-cat budget-col-category" : `budget-col-${col}`;
        return <td key={col} className={`${cls} pad-8-14`} />;
      })}
                  <td className="budget-th-actions" />
                </tr>
                {pagedPeriod1.length > 0 && <>
                  {renderPeriodHdr(`${MONTHS[monthIdx]} 1\u201314`)}
                  {pagedPeriod1.map((ev, i) => <React.Fragment key={ev.id}>
                    {ev.id === todayMarkerId && <TodayLine />}
                    {renderEventRow(ev, i)}
                  </React.Fragment>)}
                </>}
                {pagedPeriod2.length > 0 && <>
                  {renderPeriodHdr(`${MONTHS[monthIdx]} 15\u2013${daysInMonth(monthIdx, activeYear)}`)}
                  {pagedPeriod2.map((ev, i) => <React.Fragment key={ev.id}>
                    {ev.id === todayMarkerId && <TodayLine />}
                    {renderEventRow(ev, i)}
                  </React.Fragment>)}
                </>}
                {period1.length === 0 && period2.length === 0 && <tr>
                  <td colSpan={8} className="budget-empty-msg">
                    {gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month \u2014 matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`}
                  </td>
                </tr>}
                {todayMarkerId === "AFTER_ALL" && monthPg.safePage === monthPg.totalPages - 1 && <TodayLine />}
                <tr className="budget-totals-row">
                  <td
                    className="budget-col-checkbox budget-spacer-td"
                    style={{
        background: "var(--navy)"
      }}
                  />
                  <td className="budget-col-day budget-day-spacer-td" style={{ background: "var(--navy)" }} />
                  {bCols.map((col) => {
        // The In and Out cells sum what the columns above them actually show,
        // transfers included — this is the ledger's own footer, not the
        // activity totals. They used to print s.income/s.expense, which leave
        // transfers out (see getMonthSummaries), so a month with one $500
        // transfer out showed a $5,180 column of figures under a $4,680
        // total. The Surplus cell is the balance movement, so the three cells
        // reconcile with each other and with the Closing Balance above.
        if (col === "desc") return <td key={col} className="budget-col-desc budget-totals-label">
          Monthly Totals
        </td>;
        if (col === "category") return <td
          key={col}
          className="budget-col-cat budget-col-category pad-10-14"
        />;
        if (col === "income") return <td
          key={col}
          className="budget-col-income cf-text-mono-13 budget-totals-amt"
          style={{ color: "var(--mint)" }}
        >
          {fmt(s.income + s.transfersIn)}
        </td>;
        if (col === "expense") return <td
          key={col}
          className="budget-col-expense cf-text-mono-13 budget-totals-amt"
          style={{ color: "var(--coral)" }}
        >
          {fmt(s.expense + s.transfersOut)}
        </td>;
        if (col === "balance") return <td
          key={col}
          className="budget-col-balance cf-text-mono-13 budget-totals-amt"
          style={{ color: s.surplus >= 0 ? "var(--mint)" : "var(--coral)" }}
        >
          {fmt(s.surplus, true)}
        </td>;
        return null;
      })}
                  <td className="budget-th-actions" />
                </tr>
              </tbody>
            </table>
            <GridPagination
              pageInfo={monthPg}
              setPage={setPgPage}
              pageSize={pgSize}
              setPageSize={changePageSize}
              label="events"
            />
          </div>
        </Card>}
        {showEntryForm && <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Entry form"
        >
          <div className="modal-card entryform-modal-card" onClick={(e) => e.stopPropagation()}>
            <SheetHandle
              onDismiss={() => {
          setShowEntryForm(false);
          setEditingEntry(null);
        }}
            />
            <div className="modal-title-lg">{editingEntry ? "Edit Entry" : "Add Entry"}</div>
            <EntryForm
              initial={editingInitial || editingEntry}
              onSave={handleEntrySave}
              onCancel={() => {
              setShowEntryForm(false);
              setEditingEntry(null);
            }}
              categories={categories}
              apiKey={apiKey}
              isOffline={isOffline}
              templates={templates}
              onSaveTemplate={(t) => {
              setTemplates((prev) => [...prev.filter((x) => x.desc !== t.desc), t]);
            }}
            />
          </div>
        </div>}
        {showOccurrenceForm && editingEv && <OccurrenceEditModal
          apiKey={apiKey}
          isOffline={isOffline}
          categories={categories}
          ev={editingEv}
          orig={entries.find((e) => e.id === editingEv.entryId) || {}}
          onSave={handleOccurrenceSave}
          onCancel={() => {
            setShowOccurrenceForm(false);
            setEditingEv(null);
          }}
          onReset={clearOverride ? () => {
            clearOverride(editingEv.id);
            setShowOccurrenceForm(false);
            setEditingEv(null);
          } : null}
          onDelete={() => requestDeleteEntry(editingEv)}
          onEditEntry={() => {
            const ev = editingEv;
            setShowOccurrenceForm(false);
            setEditingEv(null);
            openEntryEdit(ev);
          }}
          onSkip={editingEv.repeats ? () => skipOccurrence(editingEv) : null}
        />}
        {confirmDelEv && <ConfirmDialog
          title="Delete Entry?"
          message={confirmDelEv.repeats ? `This permanently removes "${confirmDelEv.desc}" and every scheduled occurrence in all months — not just this one.` : `This permanently removes "${confirmDelEv.desc}".`}
          onConfirm={confirmDeleteEntry}
          onCancel={() => setConfirmDelEv(null)}
        />}
        {budgetCtx && <ContextMenu
          x={budgetCtx.x}
          y={budgetCtx.y}
          onClose={() => setBudgetCtx(null)}
          items={[
            {
              icon: completed[budgetCtx.ev.id] ? "\u2610" : "\u2611",
              label: completed[budgetCtx.ev.id] ? "Mark incomplete" : "Mark complete",
              action: () => {
                haptic();
                toggleComplete(budgetCtx.ev.id);
              }
            },
            "---",
            ...budgetCtx.ev.repeats ? [
              { icon: "\u270E", label: "Edit this occurrence", action: () => {
                openOccurrenceEdit(budgetCtx.ev);
              } },
              { icon: "\u21BB", label: "Edit recurring entry", action: () => {
                openEntryEdit(budgetCtx.ev);
              } },
              { icon: "\u23ED", label: "Skip this occurrence", action: () => {
                skipOccurrence(budgetCtx.ev);
              } }
            ] : [
              { icon: "\u270E", label: "Edit entry", action: () => {
                openEntryEdit(budgetCtx.ev);
              } }
            ],
            ...budgetCtx.ev.isOverride ? [{ icon: "\u21BA", label: "Reset occurrence", action: () => {
              clearOverride && clearOverride(budgetCtx.ev.id);
            } }] : [],
            "---",
            { icon: "\u2715", label: "Delete entry", action: () => requestDeleteEntry(budgetCtx.ev), danger: true }
          ]}
        />}
      </div>}
      {lens === "calendar" && <>
        <div className="forecast-exportbar-row">
          <ExportBar
            onAdd={openAddEntry}
            onCSV={() => {
            const rows = calendar.flat().filter(Boolean).flatMap((d) => d.events.map((ev) => [`${MONTHS[monthIdx]} ${d.day}`, ev.desc, ev.category, isInflowEvent(ev) ? centsToDollars(ev.amount) : "", isOutflowEvent(ev) ? centsToDollars(ev.amount) : "", centsToDollars(d.balance)]));
            downloadCSV(`CashFlow_Budget_${MONTHS[monthIdx]}_Calendar.csv`, rows, ["Date", "Description", "Category", "Income", "Expense", "Balance"]);
          }}
            onPrint={() => printView(`CashFlow Budget - ${MONTHS[monthIdx]} (Calendar)`)}
          />
        </div>
        {renderCalendar()}
      </>}
      {bvaCtxMenu && <ContextMenu
        x={bvaCtxMenu.x}
        y={bvaCtxMenu.y}
        onClose={() => setBvaCtxMenu(null)}
        items={[
            { icon: "\u{1F50D}", label: "Show the expenses", action: () => openBvaDetail(bvaCtxMenu.cat) },
            { icon: "\u270E", label: "Edit target", action: () => {
              setBvaModalData({ cat: bvaCtxMenu.cat, target: bvaCtxMenu.target ? String(centsToDollars(bvaCtxMenu.target)) : "", editCat: bvaCtxMenu.cat, rollover: !!(budgetTargets._rollover || {})[bvaCtxMenu.cat] });
              setShowBvaModal(true);
            } },
            // Removing a target is undoable; editing one is not, deliberately
            // — an edit leaves the new value on screen in a field you can type
            // over, so a toast per save would be noise. A removal leaves
            // nothing behind to correct from.
            { icon: "\u2715", label: "Remove target", action: () => {
              const bk = `${activeYear || (new Date()).getFullYear()}:${monthIdx}`;
              const prevTargets = budgetTargets, removedCat = bvaCtxMenu.cat;
              pushUndo(`Target for "${removedCat}" removed`, () => setBudgetTargets(prevTargets));
              logActivity("target", `Removed the ${MONTHS[monthIdx]} target for ${removedCat}`);
              setBudgetTargets((prev) => {
                const n = { ...prev };
                if (n[bk]) {
                  const m = { ...n[bk] };
                  delete m[bvaCtxMenu.cat];
                  n[bk] = m;
                }
                return n;
              });
            }, danger: true }
          ]}
      />}
      <CategoryDetailSheet
        detail={bvaDetail}
        openRows={bvaOpenRows}
        onToggleRow={(key) => setBvaOpenRows((prev) => ({ ...prev, [key]: !prev[key] }))}
        onClose={closeBvaDetail}
        // A month, where Today's widget asks about a year. Same sheet, and
        // the only thing that changes is the sentence under the total.
        scope={`${MONTHS[monthIdx]} ${activeYear || (new Date()).getFullYear()}`}
        year={activeYear}
      />
      {showBvaModal && (() => {
        const bKey = `${activeYear || (new Date()).getFullYear()}:${monthIdx}`;
        const availCats = !bvaModalData.editCat ? [...categories].sort((a, b) => a.localeCompare(b)).filter((c) => !(c in (budgetTargets[bKey] || {}))) : null;
        const saveBva = () => {
          const t = dollarsToCents(bvaModalData.target);
          if (!bvaModalData.cat || t < 0) return;
          setBudgetTargets((prev) => {
            const next = { ...prev, [bKey]: { ...prev[bKey] || {}, [bvaModalData.cat]: t } };
            const ro = { ...prev._rollover || {} };
            if (bvaModalData.rollover) ro[bvaModalData.cat] = true;
            else delete ro[bvaModalData.cat];
            next._rollover = ro;
            return next;
          });
          logActivity("target", `${bvaModalData.editCat ? "Changed" : "Set"} the ${MONTHS[monthIdx]} target for ${bvaModalData.cat} to ${fmt(t)}`);
          setShowBvaModal(false);
        };
        return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Budget target">
          <div className="modal-card confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-lg">
              {bvaModalData.editCat ? "Edit Budget Target" : "Add Budget Line"}
            </div>
            <div className="cf-col cf-gap-14">
              {!bvaModalData.editCat ? <div>
                <label className="field-label">Category<span className="required-mark">*</span></label>
                <select
                  autoFocus={autoFocusOnDesktop()}
                  value={bvaModalData.cat}
                  onChange={(e) => setBvaModalData((p) => ({ ...p, cat: e.target.value }))}
                  className="field-input"
                >
                  <option value="">— Select category —</option>
                  {availCats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div> : <div className="txm">
            {"Category: "}
            <strong className="c-text">{bvaModalData.editCat}</strong>
          </div>}
              <div>
                <label className="field-label">
                  Monthly Budget Target $
                  <span className="required-mark">*</span>
                </label>
                <input
                  autoFocus={!!bvaModalData.editCat}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="e.g. 1500"
                  className="field-input field-input--mono"
                  value={bvaModalData.target}
                  onChange={(e) => setBvaModalData((p) => ({ ...p, target: e.target.value }))}
                  onKeyDown={(e) => {
                if (e.key === "Enter") saveBva();
              }}
                />
              </div>
              <div className="checkbox-help-row">
                <label className="rollover-label">
                  <input
                    type="checkbox"
                    checked={!!bvaModalData.rollover}
                    onChange={(e) => setBvaModalData((p) => ({ ...p, rollover: e.target.checked }))}
                    className="mt-2"
                  />
                  <span>Roll over unspent budget</span>
                </label>
                <HelpTip
                  label="Roll over unspent budget"
                  text="Envelope-style budgeting: anything you didn't spend against this category earlier in the year is added to this month's target, so a quiet month funds a heavy one instead of being lost."
                />
              </div>
            </div>
            <div className="cf-row cf-gap-10 justify-end mt-20">
              <button onClick={() => setShowBvaModal(false)} className="cf-btn cf-btn--secondary">
                Cancel
              </button>
              <button
                onClick={saveBva}
                disabled={!bvaModalData.cat || !bvaModalData.target}
                className="cf-btn cf-btn--primary btn-pad-24"
              >
                {bvaModalData.editCat ? "Save Target" : "Add Line"}
              </button>
            </div>
          </div>
        </div>;
      })()}
      {lens === "bva" && (() => {
        const yr = activeYear || (new Date()).getFullYear();
        const bKey = `${yr}:${monthIdx}`;
        const targets = budgetTargets[bKey] || {};
        const rollover = budgetTargets._rollover || {};
        const catExpenses = monthCatExpense[monthIdx];
        // What has actually gone out of each envelope, as distinct from what is
        // merely scheduled to. The row used to show one number — every expense
        // dated in the month — and call it "spent", so on the 3rd of the month
        // a groceries envelope read as nearly empty with three weeks of
        // shopping still ahead. An occurrence counts as spent once its date has
        // passed or it has been marked paid, which is the same line the ledger
        // draws; the rest is scheduled.
        const todayD = startOfToday();
        const catSpent = {};
        flow.forEach((ev) => {
          if (ev.type !== "expense" || ev.month !== monthIdx) return;
          const dated = new Date(yr, ev.month, ev.day);
          if (dated < todayD || completed[ev.id]) catSpent[ev.category] = (catSpent[ev.category] || 0) + ev.amount;
        });
        // Envelope carry: for opted-in categories, unspent target from earlier
        // months this year rolls forward (floored at zero, YNAB-style).
        const carryFor = (cat) => {
          if (!rollover[cat]) return 0;
          let carry = 0;
          for (let mi = 0; mi < monthIdx; mi++) {
            const t = (budgetTargets[`${yr}:${mi}`] || {})[cat] || 0;
            if (t <= 0 && carry <= 0) continue;
            const spent = monthCatExpense[mi][cat] || 0;
            carry = Math.max(0, carry + t - spent);
          }
          return roundMoney(carry);
        };
        const cats = [...new Set([...Object.keys(targets), ...Object.keys(catExpenses)])].sort((a, b) => (catExpenses[b] || 0) - (catExpenses[a] || 0));
        return <Card className="bva-card">
          <div
            className="bva-header-row"
            style={{
          marginBottom: 12
        }}
          >
            <span className="bva-header-label">{"Envelopes \u2014 "}{MONTHS[monthIdx]}</span>
            <div className="cf-row cf-gap-8">
              <button
                onClick={() => {
              setBvaModalData({ cat: "", target: "", editCat: null, rollover: false });
              setShowBvaModal(true);
            }}
                className="cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap"
              >
                + Add
              </button>
            </div>
          </div>
          {cats.length > 0 && Object.keys(targets).length === 0 && Object.keys(catExpenses).length > 0 && <div
            className="bva-plan-offer"
          >
            {// A month with spending and no targets. Targets are never raised
          // behind anyone's back any more, so this is the one-tap way to start
          // from what is already scheduled: each month of the year that has no
          // targets gets its own plan, and months someone has set are left alone.
          <span className="c-textMid">{"No targets for "}{MONTHS[monthIdx]}{" yet."}</span>
}
            <button
              type="button"
              className="cf-btn cf-btn--secondary cf-btn--md"
              onClick={() => {
              const before = budgetTargets;
              setBudgetTargets((prev) => {
                const next = { ...prev };
                for (let mi = 0; mi < 12; mi++) {
                  const key = `${yr}:${mi}`;
                  if (next[key] && Object.keys(next[key]).length) continue;
                  const plan = monthCatExpense[mi];
                  if (!Object.keys(plan).length) continue;
                  next[key] = Object.keys(plan).reduce((o, c) => {
                    o[c] = roundMoney(plan[c]);
                    return o;
                  }, {});
                }
                return next;
              });
              pushUndo(`Targets set from the ${yr} plan`, () => setBudgetTargets(before));
            }}
            >
              Use the plan as targets
            </button>
          </div>}
          <div className="bva-body">
            {cats.length === 0 && <div className="bva-empty-wrap">
              <EmptyState
                icon={<Icon name="target" size={26} className="c-textLt" />}
                message="No budget lines yet. Track a category against a monthly target."
                actionLabel="+ Add Budget Line"
                onAction={() => {
            setBvaModalData({ cat: "", target: "", editCat: null, rollover: false });
            setShowBvaModal(true);
          }}
              />
            </div>}
            {cats.map((cat) => {
          // `actual` stays the month's whole plan — spent and still scheduled —
          // because that is what can go over; `spent` is the part already gone.
          const actual = roundMoney((catExpenses[cat] || 0));
          const spent = roundMoney(Math.min(catSpent[cat] || 0, actual));
          const scheduled = roundMoney(actual - spent);
          const baseTarget = roundMoney((targets[cat] || 0));
          const carry = carryFor(cat);
          const target = roundMoney((baseTarget + carry));
          const diff = roundMoney((actual - target));
          const over = target > 0 && diff > 0;
          const color = !over ? "color-mix(in srgb, var(--primary) 45%, transparent)" : diff <= 5000 ? "var(--amberInk)" : "var(--red)";
          const pct = target > 0 ? Math.min(actual / target * 100, 100) : 0;
          const spentPct = target > 0 ? Math.min(spent / target * 100, pct) : 0;
          return <div
            key={cat}
            onContextMenu={(e) => {
                e.preventDefault();
                setBvaCtxMenu({ x: e.clientX, y: e.clientY, cat, target: baseTarget });
              }}
            className="context-menu-cursor"
          >
            <button
              type="button"
              className="bva-row-open"
              onClick={() => openBvaDetail(cat)}
              aria-label={`${cat}, ${fmt(spent)} spent${scheduled > 0 ? ", " + fmt(scheduled) + " scheduled" : ""}${target > 0 ? ", of " + fmt(target) : ""} \u2014 show the expenses behind it`}
            />
            <div className="bva-row">
              <CatChip
                category={cat}
                categories={categories}
                categoryColors={categoryColors}
                style={{ fontSize: 9, flexShrink: 1, minWidth: 0 }}
              />
              <div className="bva-amounts">
                <span
                  className="cf-text-mono-13 bva-actual-amt"
                  style={{
              color: over ? color : "var(--text)"
            }}
                >
                  {fmt(spent)}
                </span>
                {target > 0 ? <span className="bva-target cf-text-mono-13">{"/ "}{fmt(target)}</span> : <button
                  className="bva-set-target"
                  onClick={(e) => {
                e.stopPropagation();
                setBvaModalData({ cat, target: "", editCat: cat, rollover: !!(budgetTargets._rollover || {})[cat] });
                setShowBvaModal(true);
              }}
                >
                  Set a target
                </button>}
                {carry > 0 && <span className="carry-note">{"incl. "}{fmt(carry)}{" carried"}</span>}
                {scheduled > 0 && <span className="bva-scheduled-note">
                  {"+ "}
                  {fmt(scheduled)}
                  {" scheduled"}
                </span>}
                {target > 0 && (over ? <span className="over-note" style={{ color }}>
                  {fmt(diff) + (scheduled > 0 ? " over plan" : " over")}
                </span> : <span
                  className="left-note"
                >
                  {diff === 0 ? (scheduled > 0 ? "All planned" : "Fully spent") : fmt(roundMoney(target - actual)) + (scheduled > 0 ? " unplanned" : " left")}
                </span>)}
              </div>
              {// The kebab is a sibling of .bva-amounts, not a child of it: the
            // amounts group wraps to a second line on a phone once the actual,
            // the target and an overage all have to fit, and a row action that
            // wraps with them ends up orphaned on its own line.
            <button
              onClick={(e) => {
                  e.stopPropagation();
                  setBvaCtxMenu({ x: e.clientX, y: e.clientY, cat, target: baseTarget });
                }}
              aria-label={`Edit ${cat} budget target`}
              className="cf-checkbtn row-menu-btn"
            >
              ⋮
            </button>
}
            </div>
            {// Two segments on one track: solid for what has gone, hatched for
            // what is booked but has not happened yet.
            target > 0 && <div className="bva-progress-track">
              <div
                className="bva-progress-fill"
                style={{
              width: `${spentPct}%`,
              background: color
            }}
              />
              {pct > spentPct && <div
                className="bva-progress-fill bva-progress-fill--scheduled"
                style={{
              left: `${spentPct}%`,
              width: `${pct - spentPct}%`,
              "--bva-fill": color
            } as React.CSSProperties}
              />}
            </div>
}
          </div>;
        })}
            {cats.length > 0 && (() => {
          const totalActual = roundMoney(cats.reduce((s2, c) => s2 + (catExpenses[c] || 0), 0));
          const totalSpent = roundMoney(cats.reduce((s2, c) => s2 + Math.min(catSpent[c] || 0, catExpenses[c] || 0), 0));
          const totalScheduled = roundMoney(totalActual - totalSpent);
          const totalTarget = roundMoney(cats.reduce((s2, c) => s2 + (targets[c] || 0) + carryFor(c), 0));
          const tDiff = roundMoney((totalActual - totalTarget));
          const tOver = totalTarget > 0 && tDiff > 0;
          const tColor = !tOver ? "var(--greenDk)" : tDiff <= 5000 ? "var(--amberInk)" : "var(--red)";
          return <div className="bva-totals-row">
            <span className="bva-total-label">Total</span>
            <div className="cf-row cf-gap-8">
              <span
                className="cf-text-mono-13 fw-700"
                style={{
            color: tOver ? tColor : "var(--text)"
          }}
              >
                {fmt(totalSpent)}
              </span>
              {totalTarget > 0 && <span className="cf-text-mono-13 c-textMid">{"/ "}{fmt(totalTarget)}</span>}
              {totalScheduled > 0 && <span className="bva-scheduled-note">
                {"+ "}
                {fmt(totalScheduled)}
                {" scheduled"}
              </span>}
              {totalTarget > 0 && (tOver ? <span className="total-over-note" style={{ color: tColor }}>
                {fmt(tDiff) + (totalScheduled > 0 ? " over plan" : " over")}
              </span> : <span
                className="total-over-note left-note"
              >
                {tDiff === 0 ? (totalScheduled > 0 ? "All planned" : "Fully spent") : fmt(roundMoney(totalTarget - totalActual)) + (totalScheduled > 0 ? " unplanned" : " left")}
              </span>)}
            </div>
          </div>;
        })()}
          </div>
        </Card>;
      })()}
    </div>;
  }
