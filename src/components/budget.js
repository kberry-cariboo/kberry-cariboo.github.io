  function BudgetView({ flow, openBal, entries = [], setOverride, clearOverride, categories, categoryColors = {}, setEntries, addEntry, budgetSub = "monthly", setBudgetSub = () => {
  }, monthIdx, setMonthIdx, alertThreshold = DEFAULT_ALERT_THRESHOLD, globalSearch = "", templates = [], setTemplates, budgetTargets = {}, setBudgetTargets, completed = {}, toggleComplete = () => {
  }, markOccurrencesPaid = () => {
  }, activeYear = (/* @__PURE__ */ new Date()).getFullYear(), budgetColOrder = DEFAULT_BUDGET_COLS, setBudgetColOrder = () => {
  } }) {
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
        setOverride(editingEv.id, { desc: data.desc, amount: data.amount, day: data.day, notes: data.notes || "", attachment: data.attachment || null });
      }
      setShowOccurrenceForm(false);
      setEditingEv(null);
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
        setEntries((prev) => prev.map((e) => e.id === editingEntry.id ? finalData : e));
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
    const todayDate = /* @__PURE__ */ new Date();
    const gq = (globalSearch || "").toLowerCase();
    const matchingMonths = useMemo(() => {
      if (!gq) return /* @__PURE__ */ new Set();
      const s2 = /* @__PURE__ */ new Set();
      flow.filter((ev) => ev.desc.toLowerCase().includes(gq) || ev.category.toLowerCase().includes(gq)).forEach((ev) => s2.add(ev.month));
      return s2;
    }, [gq, flow]);
    useEffect(() => {
      if (!gq) return;
      const latest = [...matchingMonths].sort((a, b) => b - a)[0];
      if (latest !== void 0 && latest !== monthIdx) setMonthIdx(latest);
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
    const monthEvents = flow.filter((ev) => ev.month === monthIdx && (!gq || ev.desc.toLowerCase().includes(gq) || ev.category.toLowerCase().includes(gq)));
    const period1 = monthEvents.filter((ev) => ev.day <= 14);
    const period2 = monthEvents.filter((ev) => ev.day > 14);
    const _isCurMonth = todayDate.getMonth() === monthIdx && todayDate.getFullYear() === activeYear;
    const todayMarkerId = _isCurMonth ? (_b = (_a = monthEvents.find((ev) => ev.day >= todayDate.getDate())) == null ? void 0 : _a.id) != null ? _b : "AFTER_ALL" : null;
    const isToday = (day) => todayDate.getMonth() === monthIdx && todayDate.getDate() === day;
    const isPast = (day) => monthIdx < todayDate.getMonth() || monthIdx === todayDate.getMonth() && day < todayDate.getDate();
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
          style: {
            background: selIds.has(ev.id) ? "var(--stripe)" : isDone ? "var(--doneBg)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)",
            borderBottom: isDropTarget ? "2px solid var(--navy)" : "1px solid var(--border)",
            cursor: "pointer",
            opacity: past && !isDone ? 0.7 : isDragging ? 0.4 : 1
          }
        },
        /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox", onClick: (e) => e.stopPropagation(), style: {
          padding: "8px 4px 8px 9px",
          width: 30,
          whiteSpace: "nowrap",
          textAlign: "center",
          background: isDone ? "var(--doneBg)" : selIds.has(ev.id) ? "var(--stripe)" : i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)",
          boxShadow: isDone ? "inset 3px 0 0 0 var(--greenDk)" : "inset 3px 0 0 0 transparent"
        } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              haptic();
              toggleSel(ev.id);
            },
            role: "checkbox",
            "aria-checked": selIds.has(ev.id),
            "aria-label": selIds.has(ev.id) ? "Deselect row" : "Select row",
            title: isDone ? "Paid \u2014 select to change" : "Select to mark paid",
            style: {
              width: 20,
              height: 20,
              borderRadius: 5,
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: isDone || selIds.has(ev.id) ? "none" : "1.5px solid var(--border)",
              background: isDone ? "var(--greenDk)" : selIds.has(ev.id) ? "var(--navy)" : "transparent",
              color: "#fff",
              fontSize: 12,
              lineHeight: 1
            }
          },
          isDone ? "\u2713" : selIds.has(ev.id) ? "\u2713" : ""
        )),
        /* @__PURE__ */ React.createElement(
          "td",
          {
            className: "budget-col-day cf-text-mono-13",
            onPointerDown: (e) => handleDragStart(e, ev),
            onPointerMove: handleDragMove,
            onPointerUp: handleDragEnd,
            onPointerCancel: handleDragEnd,
            title: "Drag up/down to reschedule within this month",
            style: {
              padding: "8px 6px 8px 8px",
              color: isDone ? "var(--textLt)" : "var(--textMid)",
              textDecoration: isDone ? "line-through" : "none",
              whiteSpace: "nowrap",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
              verticalAlign: "middle"
            }
          },
          ev.day,
          /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.3, fontSize: 9, marginLeft: 2 } }, "\u283F")
        ),
        bCols.map((col) => {
          if (col === "desc") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-desc-cell budget-col-desc", title: ev.desc, style: {
            fontSize: 13,
            padding: "8px 14px",
            color: isDone ? "var(--textLt)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          } }, ev.desc, ev.attachment && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 10 }, title: "Has receipt" }, "\u{1F4CE}"), ev.isOverride && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 10, color: "var(--amber)", fontWeight: 700 } }, "\u270E"));
          if (col === "category") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-cat", style: { padding: "8px 14px" } }, /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, style: { fontSize: 9 } }));
          if (col === "income") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-income cf-text-mono-13", style: {
            padding: "8px 14px",
            textAlign: "right",
            color: isDone ? "var(--textLt)" : "var(--greenDk)",
            fontWeight: 600,
            textDecoration: isDone ? "line-through" : "none"
          } }, ev.type === "income" ? fmt(ev.amount) : "");
          if (col === "expense") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-expense cf-text-mono-13", style: {
            padding: "8px 14px",
            textAlign: "right",
            color: isDone ? "var(--textLt)" : "var(--red)",
            fontWeight: 600,
            textDecoration: isDone ? "line-through" : "none"
          } }, ev.type === "expense" ? fmt(ev.amount) : "");
          if (col === "balance") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-balance cf-text-mono-13", style: {
            padding: "8px 14px",
            textAlign: "right",
            fontWeight: 700,
            textDecoration: isDone ? "line-through" : "none",
            color: isDone ? "var(--textLt)" : ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amber)" : "var(--greenDk)"
          } }, fmt(ev.balance));
          return null;
        })
      );
    };
    const renderPeriodHdr = (label) => (
      // borderLeft on <tr> (not <td>) so the 3px sits OUTSIDE the cell width,
      // matching exactly how data rows position the green/transparent stripe.
      /* @__PURE__ */ React.createElement("tr", { key: label }, /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox", style: {
        width: 30,
        background: "var(--navyMid)",
        padding: 0,
        boxShadow: "inset 3px 0 0 0 transparent"
      } }), /* @__PURE__ */ React.createElement("td", { colSpan: 6, style: {
        background: "var(--navyMid)",
        padding: "8px 14px",
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "0.1em",
        textTransform: "uppercase"
      } }, label))
    );
    const TodayLine = () => /* @__PURE__ */ React.createElement("tr", { key: "today-marker" }, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: {
      padding: "0",
      background: "transparent",
      boxShadow: "inset 3px 0 0 0 transparent"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, background: "var(--amber)", borderRadius: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: "var(--amber)", whiteSpace: "nowrap", letterSpacing: "0.1em" } }, "TODAY"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, background: "var(--amber)", borderRadius: 1 } }))));
    const TodayLineCard = () => /* @__PURE__ */ React.createElement("div", { key: "today-marker-card", style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, background: "var(--amber)", borderRadius: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: "var(--amber)", whiteSpace: "nowrap", letterSpacing: "0.1em" } }, "TODAY"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, background: "var(--amber)", borderRadius: 1 } }));
    const renderPeriodCardHdr = (label) => /* @__PURE__ */ React.createElement("div", { key: label, style: {
      background: "var(--navyMid)",
      padding: "8px 14px",
      fontSize: 11,
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "0.1em",
      textTransform: "uppercase"
    } }, label);
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
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 14px",
            background: isSel ? "var(--stripe)" : isDone ? "var(--doneBg)" : "var(--bgCard)",
            borderBottom: "1px solid var(--border)",
            boxShadow: isDone ? "inset 3px 0 0 0 var(--greenDk)" : "inset 3px 0 0 0 transparent",
            cursor: "pointer",
            opacity: past && !isDone ? 0.7 : 1
          }
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              haptic();
              toggleSel(ev.id);
            },
            role: "checkbox",
            "aria-checked": isSel,
            "aria-label": isSel ? "Deselect row" : "Select row",
            title: isDone ? "Paid — select to change" : "Select to mark paid",
            style: {
              flexShrink: 0,
              marginTop: 2,
              width: 22,
              height: 22,
              borderRadius: 6,
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: isDone || isSel ? "none" : "1.5px solid var(--border)",
              background: isDone ? "var(--greenDk)" : isSel ? "var(--navy)" : "transparent",
              color: "#fff",
              fontSize: 13,
              lineHeight: 1
            }
          },
          isDone || isSel ? "✓" : ""
        ),
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", {
          className: "tx",
          title: ev.desc,
          style: {
            fontWeight: 600,
            fontSize: 14,
            color: isDone ? "var(--textLt)" : "var(--text)",
            textDecoration: isDone ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0
          }
        }, ev.desc, ev.attachment && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 10 }, title: "Has receipt" }, "\u{1F4CE}"), ev.isOverride && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 10, color: "var(--amber)", fontWeight: 700 } }, "✎")), /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, style: { fontSize: 9, flexShrink: 0 } })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", justifyContent: hideDayLabel ? "flex-end" : "space-between", marginTop: 4 } }, !hideDayLabel && /* @__PURE__ */ React.createElement("span", { className: "txl", style: { fontSize: 12 } }, "Day ", ev.day), /* @__PURE__ */ React.createElement("span", { style: { display: "flex", gap: 10, alignItems: "baseline" } }, /* @__PURE__ */ React.createElement("span", { className: "mno", style: {
          fontWeight: 600,
          textDecoration: isDone ? "line-through" : "none",
          color: isDone ? "var(--textLt)" : signed >= 0 ? "var(--greenDk)" : "var(--red)"
        } }, fmt(signed, true)), /* @__PURE__ */ React.createElement("span", { className: "mno", style: {
          fontWeight: 700,
          minWidth: 74,
          textAlign: "right",
          textDecoration: isDone ? "line-through" : "none",
          color: isDone ? "var(--textLt)" : ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amber)" : "var(--greenDk)"
        } }, fmt(ev.balance)))))
      );
    };
    const renderMonthlyMobileCards = () => /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      background: "var(--amberLt)",
      borderBottom: "1px solid var(--border)"
    } }, /* @__PURE__ */ React.createElement("span", { className: "lbl" }, "Opening Balance"), /* @__PURE__ */ React.createElement("span", { className: "mno", style: {
      fontWeight: 700,
      color: s.open < 0 ? "var(--red)" : s.open < alertThreshold ? "var(--amber)" : "var(--greenDk)"
    } }, fmt(s.open))), period1.length === 0 && period2.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { padding: "28px 14px", textAlign: "center", fontSize: 13, color: "var(--textLt)" } }, gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month — matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`) : /* @__PURE__ */ React.createElement(React.Fragment, null, period1.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodCardHdr(`${MONTHS[monthIdx]} 1–14`), period1.map((ev) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLineCard, null), renderEventCard(ev)))), period2.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodCardHdr(`${MONTHS[monthIdx]} 15–${daysInMonth(monthIdx, activeYear)}`), period2.map((ev) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLineCard, null), renderEventCard(ev)))), todayMarkerId === "AFTER_ALL" && /* @__PURE__ */ React.createElement(TodayLineCard, null)), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      background: "var(--navy)"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" } }, "Monthly Totals"), /* @__PURE__ */ React.createElement("span", { style: { display: "flex", gap: 12, alignItems: "baseline" } }, /* @__PURE__ */ React.createElement("span", { className: "mno", style: { fontWeight: 700, color: "var(--green)" } }, fmt(s.income)), /* @__PURE__ */ React.createElement("span", { className: "mno", style: { fontWeight: 700, color: "#FF8A7A" } }, fmt(s.expense)), /* @__PURE__ */ React.createElement("span", { className: "mno", style: { fontWeight: 700, color: s.surplus >= 0 ? "var(--green)" : "#FF8A7A" } }, fmt(s.surplus, true)))));
    const days = useMemo(() => {
      let runBal = s ? s.open : openBal;
      return Array.from({ length: daysInMonth(monthIdx, activeYear) }, (_, i) => {
        const day = i + 1;
        const evs = monthEvents.filter((ev) => ev.day === day);
        if (evs.length > 0) runBal = evs[evs.length - 1].balance;
        return { day, events: evs, balance: runBal };
      }).filter((d) => d.events.length > 0);
    }, [monthEvents, s, monthIdx]);
    const renderDailyMobileCards = () => /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, days.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { padding: "28px 14px", textAlign: "center", fontSize: 13, color: "var(--textLt)" } }, gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month — matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`) : days.map((dayObj) => /* @__PURE__ */ React.createElement(React.Fragment, { key: dayObj.day }, isToday(dayObj.day) && /* @__PURE__ */ React.createElement(TodayLineCard, null), renderPeriodCardHdr(`${MONTHS[monthIdx]} ${dayObj.day}`), dayObj.events.map((ev) => renderEventCard(ev, { hideDayLabel: true })))));
    const touchStart = useRef(null);
    const handleTouchStart = (e) => {
      const t = e.target;
      if (t.closest && t.closest("input,button,select,textarea,a,.modal-overlay,.modal-card,[draggable]")) {
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
        style: { maxWidth: 1160, width: "100%", margin: "0 auto" },
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd
      },
      selIds.size > 0 && budgetSub === "monthly" && /* @__PURE__ */ React.createElement("div", { className: "reg-bulkbar", style: {
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(18px + env(safe-area-inset-bottom))",
        zIndex: 1450,
        background: "var(--navy)",
        borderRadius: 26,
        padding: "8px 10px 8px 18px",
        boxShadow: "var(--shadowXl)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: "calc(100vw - 24px)"
      } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" } }, selIds.size, " selected"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: markSelectedPaid,
          style: {
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: 18,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
            background: "var(--greenDk)",
            color: "#fff"
          }
        },
        "\u2713 Mark paid (",
        MONTHS[monthIdx],
        ")"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: clearSel,
          "aria-label": "Clear selection",
          style: {
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 12px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.35)",
            cursor: "pointer",
            background: "transparent",
            color: "#fff"
          }
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
          matchingMonths: budgetSub !== "bva" && gq ? matchingMonths : null
        }
      ),
      budgetSub === "monthly" && showSwipeCoach && /* @__PURE__ */ React.createElement("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        color: "var(--textMid)",
        background: "var(--stripe)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 12
      }, className: "swipe-coach" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F449} Tip: swipe left or right on the grid to change months"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: dismissSwipeCoach,
          style: {
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--navy)"
          }
        },
        "Got it"
      )),
      gq && /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 12,
        color: "var(--amber)",
        marginBottom: 8,
        padding: "6px 10px",
        background: "var(--amberLt)",
        borderRadius: 6,
        border: "1px solid var(--amber)"
      } }, '\u{1F50D} Filtering by "', globalSearch, '" \u2014 ', monthEvents.length, " match", monthEvents.length !== 1 ? "es" : "", ". Clear search to see all entries."),
      /* @__PURE__ */ React.createElement("div", { className: "kpi-grid", style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 } }, /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Income", value: fmt(s.income), color: "var(--greenDk)" }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Total Expenses", value: fmt(s.expense), color: "var(--text)" }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Surplus/Shortfall", value: fmt(s.surplus, true), color: s.surplus >= 0 ? "var(--greenDk)" : "var(--red)" }), /* @__PURE__ */ React.createElement(KpiCard, { label: "Closing Balance", value: fmt(s.close), color: s.close < 0 ? "var(--red)" : s.close < alertThreshold ? "var(--amber)" : "var(--greenDk)" })),
      budgetSub === "monthly" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 8 } }, /* @__PURE__ */ React.createElement(
        ExportBar,
        {
          onCSV: () => {
            const rows = monthEvents.map((ev) => [`${MONTHS[monthIdx]} ${ev.day}`, ev.desc, ev.category, ev.type === "income" ? ev.amount : "", ev.type === "expense" ? ev.amount : "", ev.balance]);
            downloadCSV(`CashFlow_Budget_${MONTHS[monthIdx]}_Monthly.csv`, rows, ["Date", "Description", "Category", "Income", "Expense", "Balance"]);
          },
          onPrint: () => printView(`CashFlow Budget - ${MONTHS[monthIdx]} (Monthly)`)
        }
      )), isMobile ? renderMonthlyMobileCards() : /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "hscroll", style: { WebkitOverflowScrolling: "touch" } }, /* @__PURE__ */ React.createElement("table", { className: "forecast-table budget-monthly-table", style: { width: "100%", borderCollapse: "collapse", minWidth: 360 } }, (() => {
        const allIds = [...period1, ...period2].map((e) => e.id);
        const allDone = allIds.length > 0 && allIds.every((id) => completed[id]);
        const someDone = allIds.some((id) => completed[id]);
        const toggleAll = () => {
          if (allDone) {
            allIds.forEach((id) => completed[id] && toggleComplete(id));
          } else {
            allIds.forEach((id) => !completed[id] && toggleComplete(id));
          }
        };
        return /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "var(--navy)" } }, /* @__PURE__ */ React.createElement("th", { className: "budget-col-checkbox", style: { width: 30, padding: "10px 4px", textAlign: "center" }, "aria-label": "Select all rows" }, (() => {
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
              style: {
                width: 20,
                height: 20,
                borderRadius: 5,
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: allSel ? "none" : "1.5px solid rgba(255,255,255,0.4)",
                background: allSel ? "var(--navy)" : someSel ? "rgba(255,255,255,0.25)" : "transparent",
                color: "#fff",
                fontSize: 11,
                lineHeight: 1,
                boxShadow: allSel ? "0 0 0 1.5px #fff" : "none"
              }
            },
            allSel ? "\u2713" : someSel ? "\u2013" : ""
          );
        })()), /* @__PURE__ */ React.createElement("th", { className: "budget-col-day", style: {
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          padding: "10px 6px",
          textAlign: "left",
          letterSpacing: "0.04em",
          textTransform: "uppercase"
        } }, "Day"), bCols.map((col) => /* @__PURE__ */ React.createElement(
          "th",
          {
            key: col,
            draggable: true,
            onDragStart: () => onBColDragStart(col),
            onDragOver: (e) => onBColDragOver(e, col),
            onDrop: () => onBColDrop(col),
            className: col === "category" ? "budget-col-cat budget-col-category" : `budget-col-${col}`,
            style: {
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              padding: "10px 14px",
              textAlign: ["income", "expense", "balance"].includes(col) ? "right" : "left",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "grab",
              userSelect: "none",
              background: dragOverBCol === col ? "#3d5570" : "var(--navy)",
              transition: "background 0.1s"
            }
          },
          BUDGET_COL_LABELS[col]
        ))));
      })(), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "var(--amberLt)" } }, /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox", style: {
        width: 30,
        background: "var(--amberLt)",
        padding: 0,
        boxShadow: "inset 3px 0 0 0 transparent"
      } }), /* @__PURE__ */ React.createElement("td", { className: "budget-col-day", style: { width: 40, background: "var(--amberLt)", padding: 0 } }), bCols.map((col) => {
        if (col === "balance") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-balance cf-text-mono-13", style: { fontWeight: 700, padding: "8px 14px", textAlign: "right", color: s.open < 0 ? "var(--red)" : s.open < alertThreshold ? "var(--amber)" : "var(--greenDk)" } }, fmt(s.open));
        if (col === "desc") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-desc", style: { fontSize: 12, fontWeight: 700, padding: "8px 14px", color: "var(--textMid)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" } }, "Opening Balance");
        const cls = col === "category" ? "budget-col-cat budget-col-category" : `budget-col-${col}`;
        return /* @__PURE__ */ React.createElement("td", { key: col, className: cls, style: { padding: "8px 14px" } });
      })), period1.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodHdr(`${MONTHS[monthIdx]} 1\u201314`), period1.map((ev, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLine, null), renderEventRow(ev, i)))), period2.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, renderPeriodHdr(`${MONTHS[monthIdx]} 15\u2013${daysInMonth(monthIdx, activeYear)}`), period2.map((ev, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: ev.id }, ev.id === todayMarkerId && /* @__PURE__ */ React.createElement(TodayLine, null), renderEventRow(ev, i)))), period1.length === 0 && period2.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: {
        padding: "28px 14px",
        textAlign: "center",
        fontSize: 13,
        color: "var(--textLt)"
      } }, gq ? `No entries match "${globalSearch}" in ${MONTHS[monthIdx]}. Try another month \u2014 matching months are marked above.` : `No entries scheduled for ${MONTHS[monthIdx]} ${activeYear}.`)), todayMarkerId === "AFTER_ALL" && /* @__PURE__ */ React.createElement(TodayLine, null), /* @__PURE__ */ React.createElement("tr", { className: "budget-totals-row", style: { background: "var(--navy)", position: "sticky", bottom: 0 } }, /* @__PURE__ */ React.createElement("td", { className: "budget-col-checkbox", style: {
        width: 30,
        background: "var(--navy)",
        padding: 0,
        boxShadow: "inset 3px 0 0 0 transparent"
      } }), /* @__PURE__ */ React.createElement("td", { className: "budget-col-day", style: { width: 40, background: "var(--navy)", padding: 0 } }), bCols.map((col) => {
        if (col === "desc") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-desc", style: { fontSize: 12, fontWeight: 700, padding: "10px 14px", color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" } }, "Monthly Totals");
        if (col === "category") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-cat budget-col-category", style: { padding: "10px 14px" } });
        if (col === "income") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-income cf-text-mono-13", style: { fontWeight: 700, padding: "10px 14px", textAlign: "right", color: "var(--green)" } }, fmt(s.income));
        if (col === "expense") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-expense cf-text-mono-13", style: { fontWeight: 700, padding: "10px 14px", textAlign: "right", color: "#FF8A7A" } }, fmt(s.expense));
        if (col === "balance") return /* @__PURE__ */ React.createElement("td", { key: col, className: "budget-col-balance cf-text-mono-13", style: { fontWeight: 700, padding: "10px 14px", textAlign: "right", color: s.surplus >= 0 ? "var(--green)" : "#FF8A7A" } }, fmt(s.surplus, true));
        return null;
      })))))), showEntryForm && /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-overlay",
          onClick: (e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setShowEntryForm(false);
              setEditingEntry(null);
            }
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "modal-card", onClick: (e) => e.stopPropagation(), style: { padding: "24px 24px 20px", width: "min(680px,calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 18 } }, editingEntry ? "Edit Entry" : "Add Entry"), /* @__PURE__ */ React.createElement(
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
          } : null
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
            { icon: "\u270E", label: "Edit this entry", action: () => {
              openEntryEdit(budgetCtx.ev);
            } },
            ...budgetCtx.ev.repeats ? [{ icon: "\u21BA", label: "Reset entry", action: () => {
              clearOverride && clearOverride(budgetCtx.ev.id);
            } }] : []
          ]
        }
      )),
      budgetSub === "daily" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 8 } }, /* @__PURE__ */ React.createElement(
        ExportBar,
        {
          onCSV: () => {
            const rows = days.flatMap((d) => d.events.map((ev) => [`${MONTHS[monthIdx]} ${d.day}`, ev.desc, ev.category, ev.type === "income" ? ev.amount : "", ev.type === "expense" ? ev.amount : "", d.balance]));
            downloadCSV(`CashFlow_Budget_${MONTHS[monthIdx]}_Daily.csv`, rows, ["Date", "Description", "Category", "Income", "Expense", "Balance"]);
          },
          onPrint: () => printView(`CashFlow Budget - ${MONTHS[monthIdx]} (Daily)`)
        }
      )), isMobile ? renderDailyMobileCards() : /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, days.map((dayObj, di) => /* @__PURE__ */ React.createElement("div", { key: dayObj.day }, isToday(dayObj.day) && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, margin: "4px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, background: "var(--amber)", borderRadius: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: "var(--amber)" } }, "TODAY"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, background: "var(--amber)", borderRadius: 1 } })), /* @__PURE__ */ React.createElement("div", { className: "daily-card", style: {
        display: "grid",
        gridTemplateColumns: "60px 1fr 180px",
        borderBottom: "1px solid var(--border)",
        background: di % 2 === 0 ? "var(--bgCard)" : "var(--stripe)",
        alignItems: "stretch"
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 8px",
        borderRight: "1px solid var(--border)"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 700, color: "var(--navy)", lineHeight: 1 } }, dayObj.day), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--textLt)", marginTop: 2 } }, MONTHS[monthIdx]), isPast(dayObj.day) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--textLt)" } }, "\u2713")), /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 16px" } }, dayObj.events.map((ev) => /* @__PURE__ */ React.createElement("div", { key: ev.id }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => openOccurrenceEdit(ev),
          onContextMenu: (e) => {
            e.preventDefault();
            setBudgetCtx({ x: e.clientX, y: e.clientY, ev });
          },
          style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4, cursor: "pointer", borderRadius: 6, padding: "4px 6px", width: "100%", border: "none", background: "transparent", font: "inherit", textAlign: "left" },
          onMouseEnter: (e) => e.currentTarget.style.background = "rgba(47,84,150,0.06)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
        },
        /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 13,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: isPast(dayObj.day) ? "var(--textLt)" : "var(--text)",
          textDecoration: isPast(dayObj.day) ? "line-through" : "none"
        } }, ev.desc, ev.isOverride && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 10, color: "var(--amber)", fontWeight: 700 } }, "\u270E")),
        /* @__PURE__ */ React.createElement("span", { className: "daily-cat" }, /* @__PURE__ */ React.createElement(CatChip, { category: ev.category, categories, categoryColors, style: { fontSize: 9 } })),
        /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
          fontWeight: 700,
          minWidth: 90,
          textAlign: "right",
          color: isPast(dayObj.day) ? "var(--textLt)" : ev.type === "income" ? "var(--greenDk)" : "var(--red)",
          textDecoration: isPast(dayObj.day) ? "line-through" : "none"
        } }, ev.type === "income" ? "+" : "-", fmt(ev.amount))
      )))), /* @__PURE__ */ React.createElement("div", { className: "daily-balance", style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "12px 20px",
        borderLeft: "1px solid var(--border)",
        background: dayObj.balance < 0 ? "var(--redLt)" : dayObj.balance < alertThreshold ? "var(--amberLt)" : "rgba(46,204,138,0.06)"
      } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", textAlign: "right", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.08em" } }, "Balance"), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13", style: {
        fontWeight: 700,
        color: dayObj.balance < 0 ? "var(--red)" : dayObj.balance < alertThreshold ? "var(--amber)" : "var(--greenDk)",
        textAlign: "right"
      } }, fmt(dayObj.balance))))))), days.length === 0 && /* @__PURE__ */ React.createElement("p", { style: { textAlign: "center", color: "var(--textLt)", padding: "32px 24px" } }, "No activity this month."))),
      bvaCtxMenu && /* @__PURE__ */ React.createElement(
        ContextMenu,
        {
          x: bvaCtxMenu.x,
          y: bvaCtxMenu.y,
          onClose: () => setBvaCtxMenu(null),
          items: [
            { icon: "\u270E", label: "Edit target", action: () => {
              setBvaModalData({ cat: bvaCtxMenu.cat, target: String(bvaCtxMenu.target || ""), editCat: bvaCtxMenu.cat });
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
          setBudgetTargets((prev) => __spreadProps(__spreadValues({}, prev), { [bKey]: __spreadProps(__spreadValues({}, prev[bKey] || {}), { [bvaModalData.cat]: Math.round(t * 100) / 100 }) }));
          setShowBvaModal(false);
        };
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "modal-overlay",
            onClick: (e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) setShowBvaModal(false);
            }
          },
          /* @__PURE__ */ React.createElement("div", { className: "modal-card", onClick: (e) => e.stopPropagation(), style: { padding: "24px", width: "min(400px,calc(100vw - 32px))" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 18 } }, bvaModalData.editCat ? "Edit Budget Target" : "Add Budget Line"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, !bvaModalData.editCat ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Category"), /* @__PURE__ */ React.createElement(
            "select",
            {
              autoFocus: true,
              value: bvaModalData.cat,
              onChange: (e) => setBvaModalData((p) => __spreadProps(__spreadValues({}, p), { cat: e.target.value })),
              className: "field-input"
            },
            /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 Select category \u2014"),
            availCats.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))
          )) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)" } }, "Category: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--text)" } }, bvaModalData.editCat)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "field-label" }, "Monthly Budget Target $"), /* @__PURE__ */ React.createElement(
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
          ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowBvaModal(false), className: "cf-btn cf-btn--secondary", style: { fontSize: 13, padding: "9px 20px" } }, "Cancel"), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: saveBva,
              disabled: !bvaModalData.cat || !bvaModalData.target,
              className: "cf-btn cf-btn--primary",
              style: { padding: "9px 24px" }
            },
            bvaModalData.editCat ? "Save Target" : "Add Line"
          )))
        );
      })(),
      budgetSub === "bva" && (() => {
        const bKey = `${activeYear || (/* @__PURE__ */ new Date()).getFullYear()}:${monthIdx}`;
        const targets = budgetTargets[bKey] || {};
        const catExpenses = {};
        flow.filter((ev) => ev.month === monthIdx && ev.type === "expense").forEach((ev) => {
          catExpenses[ev.category] = (catExpenses[ev.category] || 0) + ev.amount;
        });
        const cats = [.../* @__PURE__ */ new Set([...Object.keys(targets), ...Object.keys(catExpenses)])].sort((a, b) => (catExpenses[b] || 0) - (catExpenses[a] || 0));
        return /* @__PURE__ */ React.createElement(Card, { style: { marginTop: 20, marginBottom: 12, padding: 0, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: budgetOpen ? 12 : 0
        } }, /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--textLt)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0
        } }, "Budget vs Actual \u2014 ", MONTHS[monthIdx]), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, budgetOpen && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              setBvaModalData({ cat: "", target: "", editCat: null });
              setShowBvaModal(true);
            },
            className: "cf-btn cf-btn--primary", style: { fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 7, whiteSpace: "nowrap" }
          },
          "+ Add"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setBudgetOpen((v) => !v),
            className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "6px 12px", borderRadius: 7, flexShrink: 0 }
          },
          budgetOpen ? "Collapse \u25B2" : "Expand \u25BC"
        ))), budgetOpen && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, padding: "0 24px 20px" } }, cats.length === 0 && /* @__PURE__ */ React.createElement("div", { style: {
          fontSize: 13,
          color: "var(--textLt)",
          textAlign: "center",
          padding: "8px 0"
        } }, /* @__PURE__ */ React.createElement(EmptyState, {
          icon: "\u{1F3AF}",
          message: "No budget lines yet. Track a category against a monthly target.",
          actionLabel: "+ Add Budget Line",
          onAction: () => {
            setBvaModalData({ cat: "", target: "", editCat: null });
            setShowBvaModal(true);
          }
        })), cats.map((cat) => {
          const actual = Math.round((catExpenses[cat] || 0) * 100) / 100;
          const target = Math.round((targets[cat] || 0) * 100) / 100;
          const diff = Math.round((actual - target) * 100) / 100;
          const over = target > 0 && diff > 0;
          const color = !over ? "var(--greenDk)" : diff <= 50 ? "var(--amber)" : "var(--red)";
          const pct = target > 0 ? Math.min(actual / target * 100, 100) : 0;
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: cat,
              onContextMenu: (e) => {
                e.preventDefault();
                setBvaCtxMenu({ x: e.clientX, y: e.clientY, cat, target });
              },
              style: { cursor: "context-menu" }
            },
            /* @__PURE__ */ React.createElement("div", { className: "bva-row", style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 6, flexWrap: "nowrap" } }, /* @__PURE__ */ React.createElement(CatChip, { category: cat, categories, categoryColors, style: { fontSize: 9, flexShrink: 0 } }), /* @__PURE__ */ React.createElement("div", { className: "bva-amounts", style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", flex: 1, justifyContent: "flex-end", minWidth: 0 } }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
              fontWeight: 600,
              color: over ? color : "var(--text)",
              whiteSpace: "nowrap",
              flexShrink: 1,
              overflow: "hidden",
              textOverflow: "ellipsis"
            } }, fmt(actual)), target > 0 && /* @__PURE__ */ React.createElement("span", { className: "bva-target cf-text-mono-13", style: { color: "var(--textMid)", whiteSpace: "nowrap", flexShrink: 0 } }, "/ ", fmt(target)), over && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color, whiteSpace: "nowrap", flexShrink: 0 } }, "\u25B2", fmt(diff)))),
            target > 0 && /* @__PURE__ */ React.createElement("div", { style: { height: 6, background: "var(--border)", borderRadius: 3 } }, /* @__PURE__ */ React.createElement("div", { style: {
              height: "100%",
              width: `${pct}%`,
              borderRadius: 3,
              background: color,
              transition: "width 0.4s ease"
            } }))
          );
        }), cats.length > 0 && (() => {
          const totalActual = Math.round(cats.reduce((s2, c) => s2 + (catExpenses[c] || 0), 0) * 100) / 100;
          const totalTarget = Math.round(cats.reduce((s2, c) => s2 + (targets[c] || 0), 0) * 100) / 100;
          const tDiff = Math.round((totalActual - totalTarget) * 100) / 100;
          const tOver = totalTarget > 0 && tDiff > 0;
          const tColor = !tOver ? "var(--greenDk)" : tDiff <= 50 ? "var(--amber)" : "var(--red)";
          return /* @__PURE__ */ React.createElement("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
            paddingTop: 10,
            borderTop: "2px solid var(--border)"
          } }, /* @__PURE__ */ React.createElement("span", { style: {
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--textMid)"
          } }, "Total"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
            fontWeight: 700,
            color: tOver ? tColor : "var(--text)"
          } }, fmt(totalActual)), totalTarget > 0 && /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: { color: "var(--textMid)" } }, "/ ", fmt(totalTarget)), tOver && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: tColor } }, "\u25B2", fmt(tDiff))));
        })()));
      })()
    );
  }
