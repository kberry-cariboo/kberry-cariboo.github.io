  // Hoisted out of BudgetView: defining these inside the component made React
  // see a new component type each render and remount their DOM.
  const TodayLine = () => /* @__PURE__ */ React.createElement("tr", { key: "today-marker" }, /* @__PURE__ */ React.createElement("td", { colSpan: 7, className: "today-line-td" }, /* @__PURE__ */ React.createElement("div", { className: "today-line-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "today-line-strip" }), /* @__PURE__ */ React.createElement("span", { className: "today-label" }, "TODAY"), /* @__PURE__ */ React.createElement("div", { className: "today-line-strip" }))));
  const TodayLineCard = () => /* @__PURE__ */ React.createElement("div", { key: "today-marker-card", className: "today-line-card-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "today-line-strip" }), /* @__PURE__ */ React.createElement("span", { className: "today-label" }, "TODAY"), /* @__PURE__ */ React.createElement("div", { className: "today-line-strip" }));
  function BudgetView({ flow, prevYearFlow = [], prevYearConfigured = false, openBal, entries = [], setOverride, clearOverride, categories, categoryColors = {}, setEntries, saveEntryEdit = null, addEntry, budgetSub = "monthly", setBudgetSub = () => {
  }, monthIdx, setMonthIdx, alertThreshold = DEFAULT_ALERT_THRESHOLD, globalSearch = "", templates = [], setTemplates, budgetTargets = {}, setBudgetTargets, completed = {}, toggleComplete = () => {
  }, markOccurrencesPaid = () => {
  }, activeYear = (/* @__PURE__ */ new Date()).getFullYear(), budgetColOrder = DEFAULT_BUDGET_COLS, setBudgetColOrder = () => {
  }, onDeleted = () => {
  }, onAddNextYear = null }) {
    var _a, _b;
    const isMobile = useIsMobile();
    const [editingId, setEditingId] = useState(null);
    const [showSwipeCoach, setShowSwipeCoach] = useState(() => {
      try {
        return window.matchMedia && window.matchMedia("(pointer:coarse)").matches && !localStorage.getItem("cf_coach_swipe");
      } catch (e) {
        return false;
      }
    });
    const dismissSwipeCoach = () => {
      try {
        localStorage.setItem("cf_coach_swipe", "1");
      } catch (e) {
      }
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
        setOverride(editingEv.id, { desc: data.desc, amount: data.amount, month: data.month, day: data.day, notes: data.notes || "", attachment: data.attachment || null });
      }
      setShowOccurrenceForm(false);
      setEditingEv(null);
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
      toast(`Deleted "${(orig == null ? void 0 : orig.desc) || confirmDelEv.desc}"`);
    };
    const openEntryEdit = (ev) => {
      const orig = entries.find((e) => e.id === ev.entryId);
      if (!orig) return;
      setEditingEntry(__spreadProps(__spreadValues({}, orig), { _editMonth: ev.month }));
      setEditingInitial(orig);
      setShowEntryForm(true);
    };
    const handleEntrySave = (data) => {
      if (editingEntry) {
        let finalData = __spreadProps(__spreadValues({}, data), { id: editingEntry.id });
        delete finalData._editMonth;
        if (saveEntryEdit) saveEntryEdit(editingEntry.id, finalData);
        else setEntries((prev) => prev.map((e) => e.id === editingEntry.id ? finalData : e));
      } else if (addEntry) addEntry(data);
      else setEntries((prev) => [...prev, __spreadProps(__spreadValues({}, data), { id: Date.now() })]);
      setShowEntryForm(false);
      setEditingEntry(null);
      setEditingInitial(null);
    };
    const [budgetOpen, setBudgetOpen] = useLS("cf_budgetOpen", true);
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
    const prevYear = (activeYear || (/* @__PURE__ */ new Date()).getFullYear()) - 1;
    const [compareYoy, setCompareYoy] = useLS("cf_budgetCompareYoy", false);
    const yoyActive = budgetSub === "monthly" && compareYoy && prevYearConfigured;
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
      const map = /* @__PURE__ */ new Map();
      const add = (ev, key) => {
        const k = ev.type + "|" + norm(ev.desc);
        const signed = ev.type === "income" ? ev.amount : -ev.amount;
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
      const rows = [...map.values()].map((row) => __spreadProps(__spreadValues({}, row), { cur: r2(row.cur), prev: r2(row.prev), delta: r2(row.cur - row.prev) }));
      rows.sort((a, b) => a.day - b.day || (a.desc || "").localeCompare(b.desc || ""));
      return rows;
    }, [yoyActive, flow, prevYearFlow, monthIdx]);
    const todayDate = /* @__PURE__ */ new Date();
    const gq = (globalSearch || "").toLowerCase();
    const matchingMonths = useMemo(() => {
      if (!gq) return /* @__PURE__ */ new Set();
      const s2 = /* @__PURE__ */ new Set();
      flow.filter((ev) => eventMatchesSearch(ev, gq)).forEach((ev) => s2.add(ev.month));
      return s2;
    }, [gq, flow]);
    useEffect(() => {
      if (!gq) return;
      const arr = [...matchingMonths];
      if (!arr.length) return;
      // "Most recent" month with a match: the latest one up to today (for the
      // current year), falling back to the earliest future match.
      const nowMo = (/* @__PURE__ */ new Date()).getFullYear() === activeYear ? (/* @__PURE__ */ new Date()).getMonth() : 11;
      const past = arr.filter((m) => m <= nowMo);
      const target = past.length ? Math.max(...past) : Math.min(...arr);
      if (target !== monthIdx) setMonthIdx(target);
    }, [gq]);
    const [showBvaModal, setShowBvaModal] = useState(false);
    const view = budgetSub === "daily" ? "daily" : "monthly";
    const [budgetCtx, setBudgetCtx] = useState(null);
    const [selIds, setSelIds] = useState(() => /* @__PURE__ */ new Set());
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
    const clearSel = () => setSelIds(/* @__PURE__ */ new Set());
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
    }, [monthIdx, budgetSub]);
    const [bvaModalData, setBvaModalData] = useState({ cat: "", target: "", editCat: null });
    const [bvaCtxMenu, setBvaCtxMenu] = useState(null);
    const monthEvents = useMemo(() => flow.filter((ev) => ev.month === monthIdx && eventMatchesSearch(ev, gq)), [flow, monthIdx, gq]);
    const period1 = monthEvents.filter((ev) => ev.day <= 14);
    const period2 = monthEvents.filter((ev) => ev.day > 14);
    const selTotal = monthEvents.filter((ev) => selIds.has(ev.id)).reduce((sum, ev) => sum + (ev.type === "income" ? ev.amount : -ev.amount), 0);
    const _isCurMonth = todayDate.getMonth() === monthIdx && todayDate.getFullYear() === activeYear;
    const todayMarkerId = _isCurMonth ? (_b = (_a = monthEvents.find((ev) => ev.day >= todayDate.getDate())) == null ? void 0 : _a.id) != null ? _b : "AFTER_ALL" : null;
    const isToday = (day) => activeYear === todayDate.getFullYear() && todayDate.getMonth() === monthIdx && todayDate.getDate() === day;
    const isPast = (day) => activeYear < todayDate.getFullYear() || activeYear === todayDate.getFullYear() && (monthIdx < todayDate.getMonth() || monthIdx === todayDate.getMonth() && day < todayDate.getDate());
    const handleAdd = (data) => {
      if (addEntry) addEntry(data);
      else setEntries((prev) => [...prev, __spreadProps(__spreadValues({}, data), { id: Date.now() })]);
      setShowAddForm(false);
    };
    const renderEventRow = (ev, i) => {
      const past = isPast(ev.day);
      const isDone = !!completed[ev.id];
      const isDragging = draggingId === ev.id;
      const isDropTarget = draggingId != null && draggingId !== ev.id && dragOverDay === ev.day;
      return /* @__PURE__ */ React.createElement(
        "tr",
        {
          key: ev.id,
          "data-day": ev.day,
          onClick: () => {
            if (justDraggedRef.current) return;
            openOccurrenceEdit(ev);
          },
          onContextMenu: (e) => {
            e.preventDefault();
            setBudgetCtx({ x: e.clientX, y: e.clientY, ev });
          },
          className: "budget-event-tr",
          style: {
            background: selIds.has(ev.id) ? "var(--stripe)" : isDone ? "var(--doneBg)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)",
            borderBottom: isDropTarget ? "2px solid var(--primary)" : "1px solid var(--border)",
            opacity: past && !isDone ? 0.7 : isDragging ? 0.4 : 1
          }
        },
        /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox budget-col-checkbox--cell", onClick: (e) => e.stopPropagation(), style: {
          background: isDone ? "var(--doneBg)" : selIds.has(ev.id) ? "var(--stripe)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)",
          boxShadow: isDone ? "inset 3px 0 0 0 var(--greenDk)" : "inset 3px 0 0 0 transparent"
        } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              haptic();
              if (isDone) toggleComplete(ev.id);
              else toggleSel(ev.id);
            },
            role: "checkbox",
            "aria-checked": isDone || selIds.has(ev.id),
            "aria-label": isDone ? "Mark unpaid" : selIds.has(ev.id) ? "Deselect row" : "Select row",
            title: isDone ? "Paid \u2014 click to mark unpaid" : "Select to mark paid",
            className: "cf-checkbtn budget-row-checkbtn",
            style: {
              border: isDone || selIds.has(ev.id) ? "none" : "1.5px solid var(--border)",
              background: isDone ? "var(--greenDk)" : selIds.has(ev.id) ? "var(--primary)" : "transparent"
            }
          },
          isDone ? "\u2713" : selIds.has(ev.id) ? "\u2713" : ""
        )),
        /* @__PURE__ */ React.createElement(
          "td",
          {
            className: "budget-col-day cf-text-mono-13 budget-day-cell",
            onPointerDown: (e) => handleDragStart(e, ev),
            onPointerMove: handleDragMove,
            onPointerUp: handleDragEnd,
            onPointerCancel: handleDragEnd,
            title: "Drag up/down to reschedule within this month",
            style: {
              color: isDone ? "var(--textLt)" : "var(--textMid)",
              textDecoration: isDone ? "line-through" : "none"
            }
          },
          ev.day,
          /* @__PURE__ */ React.createElement("span", { className: "drag-dots" }, "\u283F")
        ),
        bCols.map((col) => {
          if (col === "desc") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-desc-cell budget-col-desc budget-desc-td", title: ev.desc, style: {
            color: isDone ? "var(--textLt)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none"
          } }, ev.desc, ev.attachment && /* @__PURE__ */ React.createElement("span", { className: "attach-indicator", title: "Has receipt" }, /* @__PURE__ */ React.createElement(Icon, { name: "paperclip", size: 11 })), ev.isOverride && /* @__PURE__ */ React.createElement("span", { className: "override-mark" }, "\u270E"));
          if (col === "category") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-cat" }, /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, className: "text-9" }));
          if (col === "income") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-income cf-text-mono-13 budget-amount-td", style: {
            color: isDone ? "var(--textLt)" : "var(--greenDk)",
            textDecoration: isDone ? "line-through" : "none"
          } }, ev.type === "income" ? fmt(ev.amount) : "");
          if (col === "expense") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-expense cf-text-mono-13 budget-amount-td", style: {
            color: isDone ? "var(--textLt)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none"
          } }, ev.type === "expense" ? fmt(ev.amount) : "");
          if (col === "balance") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-balance cf-text-mono-13 budget-balance-td", style: {
            textDecoration: isDone ? "line-through" : "none",
            color: isDone ? "var(--textLt)" : ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amber)" : "var(--text)"
          } }, fmt(ev.balance));
          return null;
        })
      );
    };
    const renderPeriodHdr = (label) => (
      // borderLeft on <tr> (not <td>) so the 3px sits OUTSIDE the cell width,
      // matching exactly how data rows position the green/transparent stripe.
      /* @__PURE__ */ React.createElement("tr", { key: label }, /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox budget-spacer-td", style: {
        background: "var(--navyMid)"
      } }), /* @__PURE__ */ React.createElement("td", { colSpan: 6, className: "period-hdr-td" }, label))
    );
    const renderPeriodCardHdr = (label) => /* @__PURE__ */ React.createElement("div", { key: label, className: "period-hdr-td" }, label);
    const renderEventCard = (ev, opts = {}) => {
      const hideDayLabel = !!opts.hideDayLabel;
      const past = isPast(ev.day);
      const isDone = !!completed[ev.id];
      const isSel = selIds.has(ev.id);
      const signed = ev.type === "income" ? ev.amount : -ev.amount;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: ev.id,
          className: "budget-card-row",
          onClick: () => openOccurrenceEdit(ev),
          onContextMenu: (e) => {
            e.preventDefault();
            setBudgetCtx({ x: e.clientX, y: e.clientY, ev });
          },
          style: {
            background: isSel ? "var(--stripe)" : isDone ? "var(--doneBg)" : "var(--bgCard)",
            boxShadow: isDone ? "inset 3px 0 0 0 var(--greenDk)" : "inset 3px 0 0 0 transparent",
            opacity: past && !isDone ? 0.7 : 1
          }
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              haptic();
              if (isDone) toggleComplete(ev.id);
              else toggleSel(ev.id);
            },
            role: "checkbox",
            "aria-checked": isDone || isSel,
            "aria-label": isDone ? "Mark unpaid" : isSel ? "Deselect row" : "Select row",
            title: isDone ? "Paid — click to mark unpaid" : "Select to mark paid",
            className: "cf-checkbtn budget-card-checkbtn",
            style: {
              border: isDone || isSel ? "none" : "1.5px solid var(--border)",
              background: isDone ? "var(--greenDk)" : isSel ? "var(--primary)" : "transparent"
            }
          },
          isDone || isSel ? "✓" : ""
        ),
        /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "card-top-row" }, /* @__PURE__ */ React.createElement("span", {
          className: "tx card-desc-span",
          title: ev.desc,
          style: {
            color: isDone ? "var(--textLt)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none"
          }
        }, ev.desc, ev.attachment && /* @__PURE__ */ React.createElement("span", { className: "attach-indicator", title: "Has receipt" }, /* @__PURE__ */ React.createElement(Icon, { name: "paperclip", size: 11 })), ev.isOverride && /* @__PURE__ */ React.createElement("span", { className: "override-mark" }, "✎")), /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, style: { fontSize: 9, flexShrink: 0 } })), /* @__PURE__ */ React.createElement("div", { className: "card-bottom-row", style: { justifyContent: hideDayLabel ? "flex-end" : "space-between" } }, !hideDayLabel && /* @__PURE__ */ React.createElement("span", { className: "txl" }, "Day ", ev.day), /* @__PURE__ */ React.createElement("span", { className: "amounts-row-baseline" }, /* @__PURE__ */ React.createElement("span", { className: "mno card-signed-amt", style: {
          textDecoration: isDone ? "line-through" : "none",
          color: isDone ? "var(--textLt)" : signed >= 0 ? "var(--greenDk)" : "var(--text)"
        } }, fmt(signed, true)), /* @__PURE__ */ React.createElement("span", { className: "mno card-balance-amt", style: {
          textDecoration: isDone ? "line-through" : "none",
          color: isDone ? "var(--textLt)" : ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amber)" : "var(--text)"
        } }, fmt(ev.balance)))))
      );
    };
    const renderMonthlyMobileCards = () => /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "openbal-card-row" }, /* @__PURE__ */ React.createElement("span", { className: "lbl" }, "Opening Balance"), /* @__PURE__ */ React.createElement("span", { className: "mno mno-700", style: {
      color: s.open < 0 ? "var(--red)" : s.open < alertThreshold ? "var(--amber)" : "var(--text)"
    } }, fmt(s.open))), period1.length === 0 && period2.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "budget-empty-msg" }, gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month — matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`) : /* @__PURE__ */ React.createElement(React.Fragment, null, period1.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodCardHdr(`${MONTHS[monthIdx]} 1–14`), period1.map((ev) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLineCard, null), renderEventCard(ev)))), period2.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodCardHdr(`${MONTHS[monthIdx]} 15–${daysInMonth(monthIdx, activeYear)}`), period2.map((ev) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLineCard, null), renderEventCard(ev)))), todayMarkerId === "AFTER_ALL" && /* @__PURE__ */ React.createElement(TodayLineCard, null)), /* @__PURE__ */ React.createElement("div", { className: "monthly-totals-row" }, /* @__PURE__ */ React.createElement("span", { className: "totals-label" }, "Monthly Totals"), /* @__PURE__ */ React.createElement("span", { className: "totals-amounts-row" }, /* @__PURE__ */ React.createElement("span", { className: "mno mno-700-green" }, fmt(s.income)), /* @__PURE__ */ React.createElement("span", { className: "mno mno-700-coral" }, fmt(s.expense)), /* @__PURE__ */ React.createElement("span", { className: "mno mno-700", style: { color: s.surplus >= 0 ? "var(--green)" : "var(--coral)" } }, fmt(s.surplus, true)))));
    const days = useMemo(() => {
      let runBal = s ? s.open : openBal;
      return Array.from({ length: daysInMonth(monthIdx, activeYear) }, (_, i) => {
        const day = i + 1;
        const evs = monthEvents.filter((ev) => ev.day === day);
        if (evs.length > 0) runBal = evs[evs.length - 1].balance;
        return { day, events: evs, balance: runBal };
      }).filter((d) => d.events.length > 0);
    }, [monthEvents, s, monthIdx, activeYear, openBal]);
    const renderDailyMobileCards = () => /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, days.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "budget-empty-msg" }, gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month — matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`) : days.map((dayObj) => /* @__PURE__ */ React.createElement(React.Fragment, { key: dayObj.day }, isToday(dayObj.day) && /* @__PURE__ */ React.createElement(TodayLineCard, null), renderPeriodCardHdr(`${MONTHS[monthIdx]} ${dayObj.day}`), dayObj.events.map((ev) => renderEventCard(ev, { hideDayLabel: true })))));
    const renderYoyCompare = () => {
      const deltaCls = (d) => d > 0 ? "yoy-delta-pos" : d < 0 ? "yoy-delta-neg" : "";
      const amtCell = (v) => v === 0 ? /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, "—") : fmt(v, true);
      const totCur = yoyRows.reduce((a, r) => a + r.cur, 0);
      const totPrev = yoyRows.reduce((a, r) => a + r.prev, 0);
      const totDelta = roundMoney((totCur - totPrev));
      return /* @__PURE__ */ React.createElement(
        Card,
        { className: "cf-card--flush yoy-card" },
        /* @__PURE__ */ React.createElement("div", { className: "yoy-header-row" }, /* @__PURE__ */ React.createElement("span", { className: "yoy-title" }, `${MONTHS[monthIdx]} ${activeYear} vs ${MONTHS[monthIdx]} ${prevYear}`)),
        !prevHasData ? /* @__PURE__ */ React.createElement("div", { className: "budget-empty-msg" }, `No ${prevYear} entries to compare against.`) : yoyRows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "budget-empty-msg" }, `No entries in ${MONTHS[monthIdx]} for either year.`) : /* @__PURE__ */ React.createElement(
          "div",
          { className: "hscroll", tabIndex: 0, role: "region", "aria-label": "Year-over-year comparison table" },
          /* @__PURE__ */ React.createElement(
            "table",
            { className: "forecast-table yoy-table" },
            /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, /* @__PURE__ */ React.createElement("th", { className: "yoy-th-desc" }, "Description"), /* @__PURE__ */ React.createElement("th", { className: "yoy-th-cat" }, "Category"), /* @__PURE__ */ React.createElement("th", { className: "yoy-th-num" }, prevYear), /* @__PURE__ */ React.createElement("th", { className: "yoy-th-num" }, activeYear), /* @__PURE__ */ React.createElement("th", { className: "yoy-th-num" }, "Δ"))),
            /* @__PURE__ */ React.createElement("tbody", null, yoyRows.map((r, i) => /* @__PURE__ */ React.createElement(
              "tr",
              { key: r.type + "|" + r.desc + "|" + i, className: "yoy-tr" },
              /* @__PURE__ */ React.createElement("td", { className: "yoy-td-desc", title: r.desc }, r.desc, r.prev === 0 && r.cur !== 0 && /* @__PURE__ */ React.createElement("span", { className: "yoy-tag yoy-tag--new" }, "New"), r.cur === 0 && r.prev !== 0 && /* @__PURE__ */ React.createElement("span", { className: "yoy-tag yoy-tag--gone" }, "Dropped")),
              /* @__PURE__ */ React.createElement("td", { className: "yoy-td-cat" }, /* @__PURE__ */ React.createElement(CatChip, { category: r.category, categories, categoryColors, className: "text-9" })),
              /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 yoy-num" }, amtCell(r.prev)),
              /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 yoy-num" }, amtCell(r.cur)),
              /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 yoy-num " + deltaCls(r.delta) }, r.delta === 0 ? /* @__PURE__ */ React.createElement("span", { className: "c-textLt" }, "—") : fmt(r.delta, true))
            ))),
            /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", { className: "yoy-foot" }, /* @__PURE__ */ React.createElement("td", { className: "yoy-td-desc" }, "Net"), /* @__PURE__ */ React.createElement("td", null), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 yoy-num" }, fmt(totPrev, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 yoy-num" }, fmt(totCur, true)), /* @__PURE__ */ React.createElement("td", { className: "cf-text-mono-13 yoy-num " + deltaCls(totDelta) }, fmt(totDelta, true))))
          )
        )
      );
    };
    const touchStart = useRef(null);
    const handleTouchStart = (e) => {
      const t = e.target;
      // .hscroll panes scroll horizontally themselves — a fast table fling
      // must never double as a change-month swipe.
      if (t.closest && t.closest("input,button,select,textarea,a,.modal-overlay,.modal-card,[draggable],.hscroll")) {
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
      setEditingId(null);
      setShowOccurrenceForm(false);
      setEditingEv(null);
      setShowEntryForm(false);
      setEditingEntry(null);
      setEditingInitial(null);
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "cf-page",
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd
      },
      selIds.size > 0 && budgetSub === "monthly" && /* @__PURE__ */ React.createElement("div", { className: "reg-bulkbar reg-bulkbar--accent" }, /* @__PURE__ */ React.createElement("span", { className: "reg-bulkbar-count" }, selIds.size, " selected"), /* @__PURE__ */ React.createElement("span", { className: "reg-bulkbar-total" }, fmt(selTotal, true)), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: markSelectedPaid,
          className: "reg-bulk-markpaid-btn"
        },
        "\u2713 Mark paid (",
        MONTHS[monthIdx],
        ")"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: clearSel,
          "aria-label": "Clear selection",
          className: "reg-bulk-clear-btn"
        },
        "Clear"
      )),
      /* @__PURE__ */ React.createElement(
        MonthPicker,
        {
          value: monthIdx,
          onChange: (v) => {
            setMonthIdx(v);
            setEditingId(null);
          },
          noMargin: false,
          matchingMonths: budgetSub !== "bva" && gq ? matchingMonths : null,
          onAddNextYear,
          nextYear: onAddNextYear ? activeYear + 1 : null
        }
      ),
      budgetSub === "monthly" && showSwipeCoach && /* @__PURE__ */ React.createElement("div", { className: "swipe-coach" }, /* @__PURE__ */ React.createElement("span", { className: "cf-row cf-gap-6" }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-right", size: 13, style: { flexShrink: 0 } }), "Tip: swipe left or right on the grid to change months"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: dismissSwipeCoach,
          className: "gotit-btn"
        },
        "Got it"
      )),
      gq && /* @__PURE__ */ React.createElement("div", { className: "budget-search-banner" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering by "', globalSearch, '" \u2014 ', monthEvents.length, " match", monthEvents.length !== 1 ? "es" : "", ". Clear search to see all entries."),
      /* @__PURE__ */ React.createElement("div", { className: "kpi-grid" }, /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Income", value: fmt(s.income), color: "var(--greenDk)", sub: yoyDeltaSub(s.income, ps.income) }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Expenses", value: fmt(s.expense), color: "var(--text)", sub: yoyDeltaSub(s.expense, ps.expense) }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Surplus/Shortfall", value: fmt(s.surplus, true), color: s.surplus >= 0 ? "var(--greenDk)" : "var(--red)", sub: yoyDeltaSub(s.surplus, ps.surplus) }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Closing Balance", value: fmt(s.close), color: s.close < 0 ? "var(--red)" : s.close < alertThreshold ? "var(--amber)" : "var(--text)" })),
      budgetSub === "monthly" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "budget-toolbar-row" + (prevYearConfigured ? "" : " budget-toolbar-row--end") }, prevYearConfigured && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            haptic();
            setCompareYoy((v) => !v);
          },
          "aria-pressed": compareYoy,
          title: `Compare ${MONTHS[monthIdx]} ${activeYear} with ${prevYear}`,
          className: "cf-btn cf-btn--secondary cf-btn--sm cf-btn--iconrow-sm" + (compareYoy ? " yoy-toggle-active" : "")
        },
        /* @__PURE__ */ React.createElement(Icon, { name: "chart-grouped", size: 12 }),
        `Compare ${prevYear}`
      ), /* @__PURE__ */ React.createElement(
        ExportBar,
        {
          onCSV: () => {
            const rows = monthEvents.map((ev) => [`${MONTHS[monthIdx]} ${ev.day}`, ev.desc, ev.category, ev.type === "income" ? ev.amount : "", ev.type === "expense" ? ev.amount : "", ev.balance]);
            downloadCSV(`CashFlow_Budget_${MONTHS[monthIdx]}_Monthly.csv`, rows, ["Date", "Description", "Category", "Income", "Expense", "Balance"]);
          },
          onPrint: () => printView(`CashFlow Budget - ${MONTHS[monthIdx]} (Monthly)`)
        }
      )), yoyActive && renderYoyCompare(), isMobile ? renderMonthlyMobileCards() : /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll", tabIndex: 0, role: "region", "aria-label": "Monthly budget table" }, /* @__PURE__ */ React.createElement("table", { className: "forecast-table budget-monthly-table" }, (() => {
        const allIds = [...period1, ...period2].map((e) => e.id);
        return /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, /* @__PURE__ */ React.createElement("th", { className: "budget-col-checkbox budget-th-checkbox", "aria-label": "Select all rows" }, (() => {
          const allSel = allIds.length > 0 && allIds.every((id) => selIds.has(id));
          const someSel = allIds.some((id) => selIds.has(id));
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => {
                if (allSel) clearSel();
                else setSelIds(new Set(allIds));
              },
              role: "checkbox",
              "aria-checked": allSel,
              "aria-label": allSel ? "Deselect all rows" : "Select all rows",
              title: allSel ? "Deselect all" : "Select all",
              className: "reg-selectall-btn",
              style: {
                border: allSel ? "none" : "1.5px solid rgba(255,255,255,0.4)",
                background: allSel ? "var(--navy)" : someSel ? "rgba(255,255,255,0.25)" : "transparent",
                boxShadow: allSel ? "0 0 0 1.5px #fff" : "none"
              }
            },
            allSel ? "\u2713" : someSel ? "\u2013" : ""
          );
        })()), /* @__PURE__ */ React.createElement("th", { className: "budget-col-day budget-th-day" }, "Day"), bCols.map((col) => /* @__PURE__ */ React.createElement(
          "th",
          {
            key: col,
            draggable: true,
            tabIndex: 0,
            "aria-label": `${BUDGET_COL_LABELS[col]} column — press left or right arrow to reorder`,
            onKeyDown: (e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                moveBCol(col, -1);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                moveBCol(col, 1);
              }
            },
            onDragStart: () => onBColDragStart(col),
            onDragOver: (e) => onBColDragOver(e, col),
            onDrop: () => onBColDrop(col),
            className: (col === "category" ? "budget-col-cat budget-col-category" : `budget-col-${col}`) + " budget-th-col",
            style: {
              textAlign: ["income", "expense", "balance"].includes(col) ? "right" : "left",
              background: dragOverBCol === col ? "#3d5570" : "var(--navy)"
            }
          },
          BUDGET_COL_LABELS[col]
        ))));
      })(), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", { className: "openbal-row" }, /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox budget-spacer-td", style: {
        background: "var(--amberLt)"
      } }), /* @__PURE__ */ React.createElement("td", { className: "budget-col-day budget-day-spacer-td", style: { background: "var(--amberLt)" } }), bCols.map((col) => {
        if (col === "balance") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-balance cf-text-mono-13 budget-balance-td", style: { color: s.open < 0 ? "var(--red)" : s.open < alertThreshold ? "var(--amber)" : "var(--text)" } }, fmt(s.open));
        if (col === "desc") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-desc budget-label-cell" }, "Opening Balance");
        const cls = col === "category" ? "budget-col-cat budget-col-category" : `budget-col-${col}`;
        return /* @__PURE__ */ React.createElement("td", { key: col, className: `${cls} pad-8-14` });
      })), period1.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodHdr(`${MONTHS[monthIdx]} 1\u201314`), period1.map((ev, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLine, null), renderEventRow(ev, i)))), period2.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodHdr(`${MONTHS[monthIdx]} 15\u2013${daysInMonth(monthIdx, activeYear)}`), period2.map((ev, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLine, null), renderEventRow(ev, i)))), period1.length === 0 && period2.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, className: "budget-empty-msg" }, gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month \u2014 matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`)), todayMarkerId === "AFTER_ALL" && /* @__PURE__ */ React.createElement(TodayLine, null), /* @__PURE__ */ React.createElement("tr", { className: "budget-totals-row" }, /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox budget-spacer-td", style: {
        background: "var(--navy)"
      } }), /* @__PURE__ */ React.createElement("td", { className: "budget-col-day budget-day-spacer-td", style: { background: "var(--navy)" } }), bCols.map((col) => {
        if (col === "desc") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-desc budget-totals-label" }, "Monthly Totals");
        if (col === "category") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-cat budget-col-category pad-10-14" });
        if (col === "income") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-income cf-text-mono-13 budget-totals-amt", style: { color: "var(--green)" } }, fmt(s.income));
        if (col === "expense") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-expense cf-text-mono-13 budget-totals-amt", style: { color: "var(--coral)" } }, fmt(s.expense));
        if (col === "balance") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-balance cf-text-mono-13 budget-totals-amt", style: { color: s.surplus >= 0 ? "var(--green)" : "var(--coral)" } }, fmt(s.surplus, true));
        return null;
      })))))), showEntryForm && /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-overlay",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Entry form",
          onClick: (e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setShowEntryForm(false);
              setEditingEntry(null);
            }
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "modal-card entryform-modal-card", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg" }, editingEntry ? "Edit Entry" : "Add Entry"), /* @__PURE__ */ React.createElement(
          EntryForm,
          {
            initial: editingInitial || editingEntry,
            onSave: handleEntrySave,
            onCancel: () => {
              setShowEntryForm(false);
              setEditingEntry(null);
            },
            categories,
            templates,
            onSaveTemplate: (t) => {
              setTemplates((prev) => [...prev.filter((x) => x.desc !== t.desc), t]);
            }
          }
        ))
      ), showOccurrenceForm && editingEv && /* @__PURE__ */ React.createElement(
        OccurrenceEditModal,
        {
          ev: editingEv,
          orig: entries.find((e) => e.id === editingEv.entryId) || {},
          onSave: handleOccurrenceSave,
          onCancel: () => {
            setShowOccurrenceForm(false);
            setEditingEv(null);
          },
          onReset: clearOverride ? () => {
            clearOverride(editingEv.id);
            setShowOccurrenceForm(false);
            setEditingEv(null);
          } : null,
          onDelete: () => requestDeleteEntry(editingEv),
          onEditEntry: () => {
            const ev = editingEv;
            setShowOccurrenceForm(false);
            setEditingEv(null);
            openEntryEdit(ev);
          }
        }
      ), confirmDelEv && /* @__PURE__ */ React.createElement(
        ConfirmDialog,
        {
          title: "Delete Entry?",
          message: confirmDelEv.repeats ? `This permanently removes "${confirmDelEv.desc}" and every scheduled occurrence in all months — not just this one.` : `This permanently removes "${confirmDelEv.desc}".`,
          onConfirm: confirmDeleteEntry,
          onCancel: () => setConfirmDelEv(null)
        }
      ), budgetCtx && /* @__PURE__ */ React.createElement(
        ContextMenu,
        {
          x: budgetCtx.x,
          y: budgetCtx.y,
          onClose: () => setBudgetCtx(null),
          items: [
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
          ]
        }
      )),
      budgetSub === "daily" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "forecast-exportbar-row" }, /* @__PURE__ */ React.createElement(
        ExportBar,
        {
          onCSV: () => {
            const rows = days.flatMap((d) => d.events.map((ev) => [`${MONTHS[monthIdx]} ${d.day}`, ev.desc, ev.category, ev.type === "income" ? ev.amount : "", ev.type === "expense" ? ev.amount : "", d.balance]));
            downloadCSV(`CashFlow_Budget_${MONTHS[monthIdx]}_Daily.csv`, rows, ["Date", "Description", "Category", "Income", "Expense", "Balance"]);
          },
          onPrint: () => printView(`CashFlow Budget - ${MONTHS[monthIdx]} (Daily)`)
        }
      )), isMobile ? renderDailyMobileCards() : /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, days.map((dayObj, di) => /* @__PURE__ */ React.createElement("div", { key: dayObj.day }, isToday(dayObj.day) && /* @__PURE__ */ React.createElement("div", { className: "daily-today-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "today-line-strip" }), /* @__PURE__ */ React.createElement("span", { className: "today-label" }, "TODAY"), /* @__PURE__ */ React.createElement("div", { className: "today-line-strip" })), /* @__PURE__ */ React.createElement("div", { className: "daily-card", style: {
        background: di % 2 === 0 ? "var(--bgCard)" : "var(--stripe)"
      } }, /* @__PURE__ */ React.createElement("div", { className: "daily-day-col" }, /* @__PURE__ */ React.createElement("div", { className: "daily-day-number" }, dayObj.day), /* @__PURE__ */ React.createElement("div", { className: "caption-10" }, MONTHS[monthIdx]), isPast(dayObj.day) && /* @__PURE__ */ React.createElement("div", { className: "caption-10-nomargin" }, "\u2713")), /* @__PURE__ */ React.createElement("div", { className: "daily-events-pad" }, dayObj.events.map((ev) => /* @__PURE__ */ React.createElement("div", { key: ev.id }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => openOccurrenceEdit(ev),
          onContextMenu: (e) => {
            e.preventDefault();
            setBudgetCtx({ x: e.clientX, y: e.clientY, ev });
          },
          className: "daily-row-btn"
        },
        /* @__PURE__ */ React.createElement("span", { className: "daily-row-desc", style: {
          color: isPast(dayObj.day) ? "var(--textLt)" : "var(--text)",
          textDecoration: isPast(dayObj.day) ? "line-through" : "none"
        } }, ev.desc, ev.isOverride && /* @__PURE__ */ React.createElement("span", { className: "override-mark" }, "\u270E")),
        /* @__PURE__ */ React.createElement("span", { className: "daily-cat" }, /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, className: "text-9" })),
        /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 daily-row-amt", style: {
          color: isPast(dayObj.day) ? "var(--textLt)" : ev.type === "income" ? "var(--greenDk)" : "var(--text)",
          textDecoration: isPast(dayObj.day) ? "line-through" : "none"
        } }, ev.type === "income" ? "+" : "-", fmt(ev.amount))
      )))), /* @__PURE__ */ React.createElement("div", { className: "daily-balance", style: {
        background: dayObj.balance < 0 ? "var(--redLt)" : dayObj.balance < alertThreshold ? "var(--amberLt)" : "rgba(46,204,138,0.06)"
      } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "daily-balance-caption" }, "Balance"), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 daily-balance-amt", style: {
        color: dayObj.balance < 0 ? "var(--red)" : dayObj.balance < alertThreshold ? "var(--amber)" : "var(--greenDk)"
      } }, fmt(dayObj.balance))))))), days.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "no-activity-msg" }, "No activity this month."))),
      bvaCtxMenu && /* @__PURE__ */ React.createElement(
        ContextMenu,
        {
          x: bvaCtxMenu.x,
          y: bvaCtxMenu.y,
          onClose: () => setBvaCtxMenu(null),
          items: [
            { icon: "\u270E", label: "Edit target", action: () => {
              setBvaModalData({ cat: bvaCtxMenu.cat, target: String(bvaCtxMenu.target || ""), editCat: bvaCtxMenu.cat, rollover: !!(budgetTargets._rollover || {})[bvaCtxMenu.cat] });
              setShowBvaModal(true);
            } },
            { icon: "\u2715", label: "Remove target", action: () => {
              const bk = `${activeYear || (/* @__PURE__ */ new Date()).getFullYear()}:${monthIdx}`;
              setBudgetTargets((prev) => {
                const n = __spreadValues({}, prev);
                if (n[bk]) {
                  const m = __spreadValues({}, n[bk]);
                  delete m[bvaCtxMenu.cat];
                  n[bk] = m;
                }
                return n;
              });
            }, danger: true }
          ]
        }
      ), showBvaModal && (() => {
        const bKey = `${activeYear || (/* @__PURE__ */ new Date()).getFullYear()}:${monthIdx}`;
        const availCats = !bvaModalData.editCat ? [...categories].sort((a, b) => a.localeCompare(b)).filter((c) => !(c in (budgetTargets[bKey] || {}))) : null;
        const saveBva = () => {
          const t = parseFloat(bvaModalData.target);
          if (!bvaModalData.cat || isNaN(t) || t < 0) return;
          setBudgetTargets((prev) => {
            const next = __spreadProps(__spreadValues({}, prev), { [bKey]: __spreadProps(__spreadValues({}, prev[bKey] || {}), { [bvaModalData.cat]: roundMoney(t) }) });
            const ro = __spreadValues({}, prev._rollover || {});
            if (bvaModalData.rollover) ro[bvaModalData.cat] = true;
            else delete ro[bvaModalData.cat];
            next._rollover = ro;
            return next;
          });
          setShowBvaModal(false);
        };
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "modal-overlay",
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Budget target",
            onClick: (e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) setShowBvaModal(false);
            }
          },
          /* @__PURE__ */ React.createElement("div", { className: "modal-card confirm-dialog-card", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg" }, bvaModalData.editCat ? "Edit Budget Target" : "Add Budget Line"), /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, !bvaModalData.editCat ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Category", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
            "select",
            {
              autoFocus: true,
              value: bvaModalData.cat,
              onChange: (e) => setBvaModalData((p) => __spreadProps(__spreadValues({}, p), { cat: e.target.value })),
              className: "field-input"
            },
            /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 Select category \u2014"),
            availCats.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))
          )) : /* @__PURE__ */ React.createElement("div", { className: "txm" }, "Category: ", /* @__PURE__ */ React.createElement("strong", { className: "c-text" }, bvaModalData.editCat)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Monthly Budget Target $", /* @__PURE__ */ React.createElement("span", { className: "required-mark" }, "*")), /* @__PURE__ */ React.createElement(
            "input",
            {
              autoFocus: !!bvaModalData.editCat,
              type: "number",
              inputMode: "decimal",
              min: "0",
              placeholder: "e.g. 1500",
              className: "field-input field-input--mono",
              value: bvaModalData.target,
              onChange: (e) => setBvaModalData((p) => __spreadProps(__spreadValues({}, p), { target: e.target.value })),
              onKeyDown: (e) => {
                if (e.key === "Enter") saveBva();
              }
            }
          )), /* @__PURE__ */ React.createElement("label", { className: "rollover-label" }, /* @__PURE__ */ React.createElement("input", {
            type: "checkbox",
            checked: !!bvaModalData.rollover,
            onChange: (e) => setBvaModalData((p) => __spreadProps(__spreadValues({}, p), { rollover: e.target.checked })),
            className: "mt-2"
          }), /* @__PURE__ */ React.createElement("span", null, "Roll over unspent budget", /* @__PURE__ */ React.createElement("span", { className: "rollover-hint" }, "Unused amounts from earlier months this year add to this month's target (envelope style).")))), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 justify-end mt-20" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowBvaModal(false),className: "cf-btn cf-btn--secondary" }, "Cancel"), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: saveBva,
              disabled: !bvaModalData.cat || !bvaModalData.target,
              className: "cf-btn cf-btn--primary btn-pad-24"
            },
            bvaModalData.editCat ? "Save Target" : "Add Line"
          )))
        );
      })(),
      budgetSub === "bva" && (() => {
        const yr = activeYear || (/* @__PURE__ */ new Date()).getFullYear();
        const bKey = `${yr}:${monthIdx}`;
        const targets = budgetTargets[bKey] || {};
        const rollover = budgetTargets._rollover || {};
        const catExpenses = {};
        flow.filter((ev) => ev.month === monthIdx && ev.type === "expense").forEach((ev) => {
          catExpenses[ev.category] = (catExpenses[ev.category] || 0) + ev.amount;
        });
        // Envelope carry: for opted-in categories, unspent target from earlier
        // months this year rolls forward (floored at zero, YNAB-style).
        const carryFor = (cat) => {
          if (!rollover[cat]) return 0;
          let carry = 0;
          for (let mi = 0; mi < monthIdx; mi++) {
            const t = (budgetTargets[`${yr}:${mi}`] || {})[cat] || 0;
            if (t <= 0 && carry <= 0) continue;
            const spent = flow.filter((ev) => ev.month === mi && ev.type === "expense" && ev.category === cat).reduce((s, ev) => s + ev.amount, 0);
            carry = Math.max(0, carry + t - spent);
          }
          return roundMoney(carry);
        };
        const cats = [.../* @__PURE__ */ new Set([...Object.keys(targets), ...Object.keys(catExpenses)])].sort((a, b) => (catExpenses[b] || 0) - (catExpenses[a] || 0));
        return /* @__PURE__ */ React.createElement(Card, { className: "bva-card" }, /* @__PURE__ */ React.createElement("div", { className: "bva-header-row", style: {
          marginBottom: budgetOpen ? 12 : 0
        } }, /* @__PURE__ */ React.createElement("span", { className: "bva-header-label" }, "Budget vs Actual \u2014 ", MONTHS[monthIdx]), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, budgetOpen && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              setBvaModalData({ cat: "", target: "", editCat: null, rollover: false });
              setShowBvaModal(true);
            },
            className: "cf-btn cf-btn--primary bva-add-btn"
          },
          "+ Add"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setBudgetOpen((v) => !v),
            className: "cf-btn cf-btn--secondary bva-collapse-btn"
          },
          budgetOpen ? "Collapse \u25B2" : "Expand \u25BC"
        ))), budgetOpen && /* @__PURE__ */ React.createElement("div", { className: "bva-body" }, cats.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "bva-empty-wrap" }, /* @__PURE__ */ React.createElement(EmptyState, {
          icon: /* @__PURE__ */ React.createElement(Icon, { name: "target", size: 26, className: "c-textLt" }),
          message: "No budget lines yet. Track a category against a monthly target.",
          actionLabel: "+ Add Budget Line",
          onAction: () => {
            setBvaModalData({ cat: "", target: "", editCat: null, rollover: false });
            setShowBvaModal(true);
          }
        })), cats.map((cat) => {
          const actual = roundMoney((catExpenses[cat] || 0));
          const baseTarget = roundMoney((targets[cat] || 0));
          const carry = carryFor(cat);
          const target = roundMoney((baseTarget + carry));
          const diff = roundMoney((actual - target));
          const over = target > 0 && diff > 0;
          const color = !over ? "var(--greenDk)" : diff <= 50 ? "var(--amber)" : "var(--red)";
          const pct = target > 0 ? Math.min(actual / target * 100, 100) : 0;
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: cat,
              onContextMenu: (e) => {
                e.preventDefault();
                setBvaCtxMenu({ x: e.clientX, y: e.clientY, cat, target: baseTarget });
              },
              className: "context-menu-cursor"
            },
            /* @__PURE__ */ React.createElement("div", { className: "bva-row" }, /* @__PURE__ */ React.createElement(CatChip, { category: cat, categories, categoryColors, style: { fontSize: 9, flexShrink: 0 } }), /* @__PURE__ */ React.createElement("div", { className: "bva-amounts" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 bva-actual-amt", style: {
              color: over ? color : "var(--text)"
            } }, fmt(actual)), target > 0 && /* @__PURE__ */ React.createElement("span", { className: "bva-target cf-text-mono-13" }, "/ ", fmt(target)), carry > 0 && /* @__PURE__ */ React.createElement("span", { className: "carry-note" }, "incl. ", fmt(carry), " carried"), over &&/* @__PURE__ */ React.createElement("span", { className: "over-note", style: { color } }, fmt(diff) + " over"), /* @__PURE__ */ React.createElement(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  setBvaCtxMenu({ x: e.clientX, y: e.clientY, cat, target: baseTarget });
                },
                "aria-label": `Edit ${cat} budget target`,
                className: "bva-edit-btn"
              },
              "\u22EE"
            ))),
            target > 0 && /* @__PURE__ */ React.createElement("div", { className: "bva-progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "bva-progress-fill", style: {
              width: `${pct}%`,
              background: color
            } }))
          );
        }), cats.length > 0 && (() => {
          const totalActual = roundMoney(cats.reduce((s2, c) => s2 + (catExpenses[c] || 0), 0));
          const totalTarget = roundMoney(cats.reduce((s2, c) => s2 + (targets[c] || 0), 0));
          const tDiff = roundMoney((totalActual - totalTarget));
          const tOver = totalTarget > 0 && tDiff > 0;
          const tColor = !tOver ? "var(--greenDk)" : tDiff <= 50 ? "var(--amber)" : "var(--red)";
          return /* @__PURE__ */ React.createElement("div", { className: "bva-totals-row" }, /* @__PURE__ */ React.createElement("span", { className: "bva-total-label" }, "Total"), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 fw-700", style: {
            color: tOver ? tColor : "var(--text)"
          } }, fmt(totalActual)), totalTarget > 0 && /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 c-textMid" }, "/ ", fmt(totalTarget)), tOver && /* @__PURE__ */ React.createElement("span", { className: "total-over-note", style: { color: tColor } }, fmt(tDiff) + " over")));
        })()));
      })()
    );
  }
