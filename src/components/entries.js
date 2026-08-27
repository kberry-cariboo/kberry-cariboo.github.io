  function EntriesView({ entries, setEntries, saveEntryEdit = null, addEntry, categories, categoryColors = {}, activeYear, apiKey = "", isOffline = false, onDeleted = () => {
  }, templates = [], setTemplates, globalSearch = "", allYearFlows = null, colOrder = DEFAULT_ENTRIES_COLS, setColOrder = () => {
  }, filter = "all", setFilter = () => {
  }, filterCats = [], setFilterCats = () => {
  }, filterScheds = [], setFilterScheds = () => {
  }, filterStatus = [], setFilterStatus = () => {
  } }) {
    const cols = Array.isArray(colOrder) && colOrder.length ? colOrder : DEFAULT_ENTRIES_COLS;
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchAllYears, setSearchAllYears] = useState(false);
    const [sortCol, setSortCol] = useState("startDate");
    const [sortDir, setSortDir] = useState("asc");
    const [pgPage, setPgPage] = useState(0);
    const [pgSize, setPgSize] = useState(20);
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
    const [search, setSearch] = useState("");
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
      const copy = __spreadProps(__spreadValues({}, e), { id: genId(), desc: e.desc + " (copy)" });
      if (addEntry) addEntry(copy);
      else setEntries((prev) => [...prev, copy]);
    };
    const handleSave = (data) => {
      if (editing) {
        if (saveEntryEdit) saveEntryEdit(editing.id, data);
        else setEntries((prev) => prev.map((e) => e.id === editing.id ? __spreadProps(__spreadValues({}, data), { id: editing.id }) : e));
      } else if (addEntry) addEntry(data);
      else setEntries((prev) => [...prev, __spreadProps(__spreadValues({}, data), { id: genId() })]);
      close();
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
      const q = (search || globalSearch || "").toLowerCase();
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
    }), [entries, yearScoped, activeYear, filter, filterCats, filterScheds, filterStatus, search, globalSearch, dateFrom, dateTo, sortCol, sortDir]);
    const pgInfo = isMobile ? cumulativeRows(filtered, mobileLoaded, pgSize) : paginateRows(filtered, pgPage, pgSize);
    useInfiniteScroll(isMobile && pgInfo.hasMore, () => setMobileLoaded((l) => l + 1));
    const paged = pgInfo.rows;
    const recurLabel = (e) => {
      var _a;
      if (!e.repeats) return /* @__PURE__ */ React.createElement("span", { className: "recur-onetime" }, "One-time");
      const u = e.recurUnit || "month", ev = e.recurEvery || 1;
      if (u === "semimonth") return "Semi-monthly";
      if (u === "week" && ((_a = e.recurDays) == null ? void 0 : _a.length) > 1) return `Every ${ev}w \xB7 ${e.recurDays.map((d) => WEEKDAYS[d].slice(0, 2)).join("/")}`;
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
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-desc-cell", style: arcText, title: e.desc }, e.desc, archived && /* @__PURE__ */ React.createElement("span", { className: "historical-tag" }, " \xB7 historical"));
        case "type":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-col-type", style: { opacity: archived ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("span", { className: "entries-type-badge", style: { background: e.type === "income" ? "#E8F8F1" : e.type === "transfer" ? "var(--accentLt)" : "var(--redLt)", color: e.type === "income" ? "var(--greenDk)" : e.type === "transfer" ? "var(--accent)" : "var(--red)" } }, e.type));
        case "amount":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-col-amount cf-text-mono-13", style: { color: archived ? "var(--textLt)" : e.type === "transfer" ? "var(--accent)" : e.type === "income" ? "var(--greenDk)" : "var(--text)", textDecoration: archived ? "line-through" : "none" } }, (signedAmount(e) >= 0 ? "+" : "-") + (e.monthlyAmounts ? fmtVarRange(e.monthlyAmounts) : fmt(e.amount)));
        case "startDate":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-col-date", style: arcMeta }, e.startDate || "\u2014");
        case "schedule":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-col-sched", style: arcMeta }, recurLabel(e));
        case "until":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-col-until", style: arcMeta }, e.repeats ? e.recurEnd ? /* @__PURE__ */ React.createElement("span", __spreadValues({}, arcMeta), e.recurEnd) : /* @__PURE__ */ React.createElement("span", { style: { color: archived ? "var(--textLt)" : "var(--greenDk)", textDecoration: archived ? "line-through" : "none" } }, "ongoing") : "\u2014");
        case "category":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-col-cat", style: { opacity: archived ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement(CatChip, { category: e.category, categories, categoryColors }));
        case "notes":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "entries-col-notes", style: arcMeta }, e.notes);
        default:
          return /* @__PURE__ */ React.createElement("td", { key: col });
      }
    };
    const activeFilterCount = filterCats.length + filterScheds.length + filterStatus.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
    const filterControls = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      FilterPill,
      {
        label: "Category",
        allLabel: "All categories",
        inline: isMobile,
        selected: filterCats,
        onChange: setFilterCats,
        options: [...categories].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c }))
      }
    ), /* @__PURE__ */ React.createElement(
      FilterPill,
      {
        label: "Schedule",
        allLabel: "All schedules",
        inline: isMobile,
        selected: filterScheds,
        onChange: setFilterScheds,
        options: [{ value: "recurring", label: "Recurring" }, { value: "onetime", label: "One-time" }]
      }
    ), /* @__PURE__ */ React.createElement(
      FilterPill,
      {
        label: "Status",
        allLabel: "All statuses",
        inline: isMobile,
        selected: filterStatus,
        onChange: setFilterStatus,
        options: [{ value: "active", label: "Active" }, { value: "historical", label: "Historical" }]
      }
    ),
    // Real <label>s wrapping their own field, not floating spans. As two
    // siblings in a wrapping flex row the labels drifted away from their
    // inputs at phone width — "To" ended up stranded on the line above the
    // field it names, beside the *From* input. A label that wraps its control
    // can't come apart from it, and screen readers stop needing the
    // aria-label crutch.
    /* @__PURE__ */ React.createElement("div", { className: "entries-daterange" },
      /* @__PURE__ */ React.createElement("label", { className: "entries-daterange-field" },
        /* @__PURE__ */ React.createElement("span", { className: "txl" }, "From"),
        /* @__PURE__ */ React.createElement("input", {
          type: "date",
          value: dateFrom,
          onChange: (e) => setDateFrom(e.target.value),
          className: "entries-date-input"
        })
      ),
      /* @__PURE__ */ React.createElement("label", { className: "entries-daterange-field" },
        /* @__PURE__ */ React.createElement("span", { className: "txl" }, "To"),
        /* @__PURE__ */ React.createElement("input", {
          type: "date",
          value: dateTo,
          onChange: (e) => setDateTo(e.target.value),
          className: "entries-date-input"
        })
      ),
      (dateFrom || dateTo) && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setDateFrom("");
            setDateTo("");
          },
          "aria-label": "Clear date range",
          title: "Clear date range",
          className: "link-btn-sm"
        },
        "✕"
      )
    ));
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement("div", { className: "entries-toptools-row" }, /* @__PURE__ */ React.createElement(PillToggle, { options: [{ id: "all", label: "All Types" }, { id: "income", label: "Income" }, { id: "expense", label: "Expenses" }], value: filter, onChange: setFilter })), /* @__PURE__ */ React.createElement("div", { className: "entries-filter-row" }, !isMobile && filterControls, isMobile && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowMobileFilters(true),
        "aria-haspopup": "dialog",
        className: "entries-mobile-filter-btn",
        style: {
          border: "1.5px solid " + (activeFilterCount > 0 ? "var(--navy)" : "var(--border)"),
          background: activeFilterCount > 0 ? "rgba(28,43,58,0.07)" : "var(--bgCard)",
          color: activeFilterCount > 0 ? "var(--navy)" : "var(--text)"
        }
      },
      "\u2699\ufe0f Filters",
      activeFilterCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "entries-filter-count-badge" }, activeFilterCount)
    ), (search || globalSearch) && /* @__PURE__ */ React.createElement("label", { className: "entries-allyears-label" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: searchAllYears, onChange: (e) => setSearchAllYears(e.target.checked), className: "cursor-pointer" }), "All years"), /* @__PURE__ */ React.createElement("div", { className: "entries-search-wrap" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 13, className: "entries-search-icon" }), /* @__PURE__ */ React.createElement(
      "input",
      {
        // The placeholder used to be empty whenever the header search was
        // idle, on the grounds that the magnifier carried the meaning. It
        // doesn't at phone width: the header search is hidden below 768px, so
        // this is the *only* search in the app there, and it rendered as a
        // wide unlabelled pill sitting next to "Filters".
        placeholder: globalSearch ? `Search\u2026 (header: "${globalSearch}")` : "Search entries\u2026",
        value: search,
        onChange: (e) => setSearch(e.target.value),
        "aria-label": "Search entries",
        type: "search",
        className: "entries-search-input"
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      { onClick: () => setShowCsvImport(true), className: "cf-btn cf-btn--secondary cf-btn--md cf-btn--nowrap" },
      "Import CSV"
    ), /* @__PURE__ */ React.createElement(
      "button",
      { onClick: openNew, className: "cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap" },
      "+ Add Entry"
    ), !search && globalSearch && /* @__PURE__ */ React.createElement("div", { className: "entries-headersearch-banner" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering entries by "', globalSearch, '" from header search \u2014 ', filtered.length, " match", filtered.length !== 1 ? "es" : "")), isMobile && showMobileFilters && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Filters"
      },
      /* @__PURE__ */ React.createElement("div", { className: "modal-card entries-mobilefilters-card" }, /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: () => setShowMobileFilters(false) }), /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("span", { className: "csv-title" }, "Filters"),
        // The button that opens this sheet shows a count badge, but there was
        // no way to act on it \u2014 clearing meant reopening each pill and
        // unticking. Only offered when something is actually set.
        /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8" }, activeFilterCount > 0 && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              setFilterCats([]);
              setFilterScheds([]);
              setFilterStatus([]);
              setDateFrom("");
              setDateTo("");
            },
            className: "cf-btn cf-btn--secondary cf-btn--sm"
          },
          "Clear all"
        ), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowMobileFilters(false), "aria-label": "Close filters", title: "Close filters", className: "cf-close-x" }, "\u2715"))), /* @__PURE__ */ React.createElement("div", { className: "entries-mobilefilters-stack" }, filterControls), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowMobileFilters(false),
          className: "cf-btn cf-btn--primary entries-showresults-btn"
        },
        "Show results"
      ))
    ), showForm && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": editing ? "Edit entry" : "Add entry"
      },
      /* @__PURE__ */ React.createElement("div", { className: "modal-card entryform-modal-card", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: close }), /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "modal-title-lg", style: { marginBottom: 0 } }, editing ? "Edit Entry" : "Add Entry"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: close,
          "aria-label": "Close",
          className: "cf-close-x"
        },
        "\u2715"
      )), /* @__PURE__ */ React.createElement(
        EntryForm,
        {
          initial: editing,
          onSave: handleSave,
          onCancel: close,
          categories,
          apiKey,
          isOffline,
          templates: templates || [],
          onSaveTemplate: (t) => setTemplates && setTemplates((prev) => [...prev.filter((x) => x.desc !== t.desc), t])
        }
      ))
    ), /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "entries-table-wrap", tabIndex: 0, role: "region", "aria-label": "Entries table" }, /* @__PURE__ */ React.createElement("table", { className: "entries-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, visibleCols.map((col) => /* @__PURE__ */ React.createElement(
      "th",
      {
        key: col,
        // Per-column modifier so a column can be styled by identity rather
        // than position — the columns are drag-reorderable, so nth-child
        // would follow whatever slot the user dragged it into.
        className: "entries-th entries-th--col entries-th--" + col,
        tabIndex: 0,
        "aria-label": `${ENTRIES_COL_LABELS[col] || col} column${isCoarsePointer ? "" : " — press left or right arrow to reorder"}`,
        draggable: !isCoarsePointer,
        "aria-sort": sortCol === col ? sortDir === "asc" ? "ascending" : "descending" : void 0,
        onKeyDown: (e) => {
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
        },
        onDragStart: () => onDragStart(col),
        onDragOver: (e) => onDragOver(e, col),
        onDrop: () => onDrop(col),
        style: {
          background: dragOver === col ? "#3d5570" : "var(--navy)"
        }
      },
      ["desc", "amount", "startDate", "category", "schedule"].includes(col) ? /* @__PURE__ */ React.createElement(
        "span",
        {
          onClick: (e) => {
            e.stopPropagation();
            toggleSort(col);
          },
          className: "entries-th-sort-label",
          title: `Sort by ${ENTRIES_COL_LABELS[col]}`
        },
        ENTRIES_COL_LABELS[col],
        /* @__PURE__ */ React.createElement("span", { className: "entries-sort-arrow", style: { opacity: sortCol === col ? 1 : 0.35 } }, sortCol === col ? sortDir === "asc" ? "\u25B2" : "\u25BC" : "\u283F")
      ) : /* @__PURE__ */ React.createElement(React.Fragment, null, ENTRIES_COL_LABELS[col], col !== "actions" && col !== "notes" ? /* @__PURE__ */ React.createElement("span", { className: "entries-th-drag-hint" }, " \u283F") : "")
    )), /* @__PURE__ */ React.createElement("th", { key: "actions-hdr", className: "entries-th entries-th--actions", "aria-label": "Actions" }))), /* @__PURE__ */ React.createElement("tbody", null, paged.map((e, i) => /* @__PURE__ */ React.createElement("tr", { key: e.id, onContextMenu: (ev) => openCtx(ev, e), className: "entries-tr", style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" } }, visibleCols.map((col) => cellVal(e, col)), /* @__PURE__ */ React.createElement("td", { key: "actions", className: "entries-actions" }, /* @__PURE__ */ React.createElement("button", { onClick: (ev) => openCtx(ev, e), "aria-label": "Entry actions", title: "Entry actions", className: "cf-checkbtn row-menu-btn" }, "\u22EE")))), filtered.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: visibleCols.length + 1, className: "entries-empty-cell" }, /* @__PURE__ */ React.createElement(EmptyState, {
      icon: /* @__PURE__ */ React.createElement(Icon, { name: search || globalSearch ? "search" : "clipboard", size: 26, className: "c-textLt" }),
      message: search || globalSearch ? `No entries matching "${search || globalSearch}"` : "No entries found matching your filters.",
      actionLabel: !(search || globalSearch) && "+ Add Entry",
      onAction: openNew
    })))))), /* @__PURE__ */ React.createElement("div", { className: "entries-cards" }, paged.map((e, i) => {
      const archived = isArchived(e, activeYear);
      const arcStyle = {
        color: archived ? "var(--textLt)" : "var(--text)",
        textDecoration: archived ? "line-through" : "none"
      };
      const isInc = signedAmount(e) >= 0;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: e.id,
          onContextMenu: (ev) => openCtx(ev, e),
          className: "entries-mobile-card"
        },
        /* @__PURE__ */ React.createElement("div", { className: "entries-mobile-card-toprow" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "entries-mobile-desc", style: arcStyle }, e.desc, archived && /* @__PURE__ */ React.createElement("span", { className: "historical-tag" }, " \xB7 historical"))), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 entries-mobile-amount", style: {
          color: archived ? "var(--textLt)" : isInc ? "var(--greenDk)" : "var(--text)",
          textDecoration: archived ? "line-through" : "none"
        } }, (isInc ? "+" : "-") + (e.monthlyAmounts ? fmtVarRange(e.monthlyAmounts) : fmt(e.amount))), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (ev) => {
              ev.stopPropagation();
              openCtx(ev, e);
            },
            "aria-label": "Entry actions",
            className: "cf-checkbtn row-menu-btn"
          },
          "⋮"
        )),
        /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 cf-wrap" }, e.category && /* @__PURE__ */ React.createElement(CatChip, { category: e.category, categories, categoryColors }), e.startDate && /* @__PURE__ */ React.createElement("span", { className: "entries-mobile-date" }, humanShortDate(e.startDate), e.repeats && ` \xB7 ${recurLabel(e)}`), e.notes && /* @__PURE__ */ React.createElement("span", { className: "entries-mobile-notes" }, e.notes))
      );
    }), filtered.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "entries-empty-cell" }, /* @__PURE__ */ React.createElement(EmptyState, {
      icon: /* @__PURE__ */ React.createElement(Icon, { name: search || globalSearch ? "search" : "clipboard", size: 26, className: "c-textLt" }),
      message: search || globalSearch ? `No entries matching "${search || globalSearch}"` : "No entries found matching your filters.",
      actionLabel: !(search || globalSearch) && "+ Add Entry",
      onAction: openNew
    }))), /* @__PURE__ */ React.createElement(GridPagination, { pageInfo: pgInfo, setPage: setPgPage, pageSize: pgSize, setPageSize: changePageSize, label: "entries", isMobile })), confirmDelEntry !== null && /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        title: "Delete Entry?",
        message: "This will permanently remove this entry and all its scheduled occurrences. This cannot be undone.",
        onConfirm: confirmDelete,
        onCancel: () => setConfirmDelEntry(null)
      }
    ), ctxMenu && /* @__PURE__ */ React.createElement(
      ContextMenu,
      {
        x: ctxMenu.x,
        y: ctxMenu.y,
        onClose: () => setCtxMenu(null),
        items: [
          { icon: "\u270E", label: "Edit entry", action: () => openEdit(ctxMenu.entry) },
          { icon: "\u2398", label: "Duplicate", action: () => {
            doCopy(ctxMenu.entry);
          } },
          "---",
          { icon: "\u2715", label: "Delete entry", action: () => setConfirmDelEntry(ctxMenu.entry.id), danger: true }
        ]
      }
    ), /* @__PURE__ */ React.createElement(CsvImportModal, {
      show: showCsvImport,
      onClose: () => setShowCsvImport(false),
      onImport: handleCsvImport,
      categories,
      existingEntries: entries,
      // Every scheduled occurrence the app knows about, so the import can
      // recognise a statement row the budget already predicts (a recurring
      // bill) and not add a second copy of it.
      scheduledOccurrences: csvScheduled,
      apiKey,
      isOffline
    }));
  }
