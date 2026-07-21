  function RegisterView({ entries, setEntries, addEntry, categories, setCategories = () => {
  }, categoryColors = {}, activeYear, onDeleted = () => {
  }, templates = [], setTemplates, globalSearch = "", allYearFlows = null, colOrder = DEFAULT_REG_COLS, setColOrder = () => {
  }, filter = "all", setFilter = () => {
  }, filterCats = [], setFilterCats = () => {
  }, filterScheds = [], setFilterScheds = () => {
  }, filterStatus = [], setFilterStatus = () => {
  } }) {
    const cols = Array.isArray(colOrder) && colOrder.length ? colOrder : DEFAULT_REG_COLS;
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchAllYears, setSearchAllYears] = useState(false);
    const [sortCol, setSortCol] = useState("startDate");
    const [sortDir, setSortDir] = useState("asc");
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
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showCSV, setShowCSV] = useState(false);
    const [dragCol, setDragCol] = useState(null);
    const [dragOver, setDragOver] = useState(null);
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
      const onCSV = () => setShowCSV((v) => !v);
      window.addEventListener("cf:reg-open-new", onNew);
      window.addEventListener("cf:reg-open-csv", onCSV);
      return () => {
        window.removeEventListener("cf:reg-open-new", onNew);
        window.removeEventListener("cf:reg-open-csv", onCSV);
      };
    }, []);
    const doCopy = (e) => {
      const copy = __spreadProps(__spreadValues({}, e), { id: Date.now(), desc: e.desc + " (copy)" });
      if (addEntry) addEntry(copy);
      else setEntries((prev) => [...prev, copy]);
    };
    const handleSave = (data) => {
      if (editing) setEntries((prev) => prev.map((e) => e.id === editing.id ? __spreadProps(__spreadValues({}, data), { id: editing.id }) : e));
      else if (addEntry) addEntry(data);
      else setEntries((prev) => [...prev, __spreadProps(__spreadValues({}, data), { id: Date.now() })]);
      close();
    };
    const [confirmDelEntry, setConfirmDelEntry] = useState(null);
    const del = (id) => setConfirmDelEntry(id);
    const confirmDelete = () => {
      const deleted = entries.find((e) => e.id === confirmDelEntry);
      setEntries((prev) => prev.filter((e) => e.id !== confirmDelEntry));
      setConfirmDelEntry(null);
      if (deleted) onDeleted(deleted);
    };
    const yearScoped = !searchAllYears;
    const visibleCols = cols.filter((c) => c !== "actions");
    const filtered = entries.filter((e) => !yearScoped || !activeYear || e.startDate && e.startDate.startsWith(String(activeYear)) || !e.startDate || e.repeats && (!e.recurEnd || e.recurEnd >= String(activeYear) + "-01-01")).filter((e) => filter === "all" || e.type === filter).filter((e) => filterCats.length === 0 || filterCats.includes(e.category)).filter((e) => filterScheds.length === 0 || filterScheds.includes("recurring") && e.repeats || filterScheds.includes("onetime") && !e.repeats).filter((e) => {
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
    });
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
    const cellVal = (e, col) => {
      const archived = isArchived(e, activeYear);
      const arcText = { color: archived ? "var(--textLt)" : "var(--text)", textDecoration: archived ? "line-through" : "none" };
      const arcMeta = { color: archived ? "var(--textLt)" : "var(--textMid)", textDecoration: archived ? "line-through" : "none" };
      const arcMono = { color: archived ? "var(--textLt)" : "var(--text)", textDecoration: archived ? "line-through" : "none" };
      switch (col) {
        case "desc":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-desc-cell", style: arcText }, e.desc, archived && /* @__PURE__ */ React.createElement("span", { className: "historical-tag" }, " \xB7 historical"));
        case "type":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-type", style: { opacity: archived ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("span", { className: "reg-type-badge", style: { background: e.type === "income" ? "#E8F8F1" : "var(--redLt)", color: e.type === "income" ? "var(--greenDk)" : "var(--red)" } }, e.type));
        case "amount":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-amount cf-text-mono-13", style: { color: archived ? "var(--textLt)" : e.type === "income" ? "var(--greenDk)" : "var(--text)", textDecoration: archived ? "line-through" : "none" } }, (e.type === "income" ? "+" : "-") + (e.monthlyAmounts ? fmtVarRange(e.monthlyAmounts) : fmt(e.amount)));
        case "startDate":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-date", style: arcMeta }, e.startDate || "\u2014");
        case "schedule":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-sched", style: arcMeta }, recurLabel(e));
        case "until":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-until", style: arcMeta }, e.repeats ? e.recurEnd ? /* @__PURE__ */ React.createElement("span", __spreadValues({}, arcMeta), e.recurEnd) : /* @__PURE__ */ React.createElement("span", { style: { color: archived ? "var(--textLt)" : "var(--greenDk)", textDecoration: archived ? "line-through" : "none" } }, "ongoing") : "\u2014");
        case "category":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-cat", style: { opacity: archived ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement(CatChip, { category: e.category, categories, categoryColors }));
        case "notes":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-notes", style: arcMeta }, e.notes);
        case "actions":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-actions" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-4" }, /* @__PURE__ */ React.createElement("button", { onClick: () => openEdit(e), title: "Edit", "aria-label": "Edit entry", className: "cf-btn cf-btn--secondary reg-action-btn" }, "\u270E"), /* @__PURE__ */ React.createElement("button", { onClick: () => doCopy(e), title: "Copy", "aria-label": "Duplicate entry", className: "cf-btn cf-btn--secondary reg-action-btn" }, "\u2398"), /* @__PURE__ */ React.createElement("button", { onClick: () => del(e.id), title: "Delete", "aria-label": "Delete entry", className: "cf-btn cf-btn--danger reg-action-btn" }, "\u2715")));
        default:
          return /* @__PURE__ */ React.createElement("td", { key: col });
      }
    };
    const activeFilterCount = filterCats.length + filterScheds.length + filterStatus.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
    const filterControls = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      FilterPill,
      {
        label: "Category",
        selected: filterCats,
        onChange: setFilterCats,
        options: [...categories].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c }))
      }
    ), /* @__PURE__ */ React.createElement(
      FilterPill,
      {
        label: "Schedule",
        selected: filterScheds,
        onChange: setFilterScheds,
        options: [{ value: "recurring", label: "Recurring" }, { value: "onetime", label: "One-time" }]
      }
    ), /* @__PURE__ */ React.createElement(
      FilterPill,
      {
        label: "Status",
        selected: filterStatus,
        onChange: setFilterStatus,
        options: [{ value: "active", label: "Active" }, { value: "historical", label: "Historical" }]
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-4 cf-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "txl" }, "From"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "date",
        value: dateFrom,
        onChange: (e) => setDateFrom(e.target.value),
        className: "reg-date-input"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "txl" }, "To"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "date",
        value: dateTo,
        onChange: (e) => setDateTo(e.target.value),
        className: "reg-date-input"
      }
    ), (dateFrom || dateTo) && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setDateFrom("");
          setDateTo("");
        },
        className: "reg-clear-dates-btn"
      },
      "✕"
    )));
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement("div", { className: "reg-toptools-row" }, /* @__PURE__ */ React.createElement(PillToggle, { options: [{ id: "all", label: "All Types" }, { id: "income", label: "Income" }, { id: "expense", label: "Expenses" }], value: filter, onChange: setFilter })), /* @__PURE__ */ React.createElement("div", { className: "reg-filter-row" }, !isMobile && filterControls, isMobile && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowMobileFilters(true),
        "aria-haspopup": "dialog",
        className: "reg-mobile-filter-btn",
        style: {
          border: "1.5px solid " + (activeFilterCount > 0 ? "var(--navy)" : "var(--border)"),
          background: activeFilterCount > 0 ? "rgba(28,43,58,0.07)" : "var(--bgCard)",
          color: activeFilterCount > 0 ? "var(--navy)" : "var(--text)"
        }
      },
      "\u2699\ufe0f Filters",
      activeFilterCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "reg-filter-count-badge" }, activeFilterCount)
    ), (search || globalSearch) && /* @__PURE__ */ React.createElement("label", { className: "reg-allyears-label" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: searchAllYears, onChange: (e) => setSearchAllYears(e.target.checked), className: "cursor-pointer" }), "All years"), /* @__PURE__ */ React.createElement(
      "input",
      {
        placeholder: globalSearch ? `Search\u2026 (header: "${globalSearch}")` : "Search\u2026 try >100",
        value: search,
        onChange: (e) => setSearch(e.target.value),
        className: "reg-search-input"
      }
    ), !isMobile && /* @__PURE__ */ React.createElement(
      "button",
      { onClick: openNew, className: "cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap" },
      "+ Add Entry"
    ), !isMobile && /* @__PURE__ */ React.createElement(
      "button",
      { onClick: () => setShowCSV((v) => !v), className: "cf-btn cf-btn--secondary cf-btn--md cf-btn--nowrap" },
      "Import CSV"
    ), !search && globalSearch && /* @__PURE__ */ React.createElement("div", { className: "reg-headersearch-banner" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering register by "', globalSearch, '" from header search \u2014 ', filtered.length, " match", filtered.length !== 1 ? "es" : "")), isMobile && showMobileFilters && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Filters",
        onClick: (e) => {
          if (e.target === e.currentTarget) setShowMobileFilters(false);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "modal-card reg-mobilefilters-card" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("span", { className: "csv-title" }, "Filters"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowMobileFilters(false), "aria-label": "Close filters", className: "shortcuts-close" }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "reg-mobilefilters-stack" }, filterControls), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowMobileFilters(false),
          className: "cf-btn cf-btn--primary reg-showresults-btn"
        },
        "Show results"
      ))
    ), showCSV && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: () => setShowCSV(false),
        className: "fab-panel-backdrop"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "fab-panel fab-panel--sm" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "fab-panel-title-sm" }, "Import CSV"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowCSV(false),
        "aria-label": "Close",
        className: "fab-panel-close"
      },
      "\u2715"
    )), /* @__PURE__ */ React.createElement(
      CSVImporter,
      {
        categories,
        onImport: (imported) => {
          const newCats = [...new Set(imported.map((e) => e.category).filter(Boolean))];
          setCategories((prev) => [.../* @__PURE__ */ new Set([...prev, ...newCats])]);
          setEntries((prev) => [...prev, ...imported]);
          setShowCSV(false);
        },
        onClose: () => setShowCSV(false)
      }
    ))), showForm && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: close,
        className: "fab-panel-backdrop"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "fab-panel fab-panel--lg" }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "fab-panel-title-sm" }, editing ? "Edit Entry" : "Add Entry"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: close,
        "aria-label": "Close",
        className: "fab-panel-close"
      },
      "\u2715"
    )), /* @__PURE__ */ React.createElement(
      EntryForm,
      {
        initial: editing,
        onSave: handleSave,
        onCancel: close,
        categories,
        templates: templates || [],
        onSaveTemplate: (t) => setTemplates && setTemplates((prev) => [...prev.filter((x) => x.desc !== t.desc), t])
      }
    ))), /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "reg-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "reg-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, visibleCols.map((col) => /* @__PURE__ */ React.createElement(
      "th",
      {
        key: col,
        className: "reg-th reg-th--col",
        draggable: true,
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
          className: "reg-th-sort-label",
          title: `Sort by ${REG_COL_LABELS[col]}`
        },
        REG_COL_LABELS[col],
        /* @__PURE__ */ React.createElement("span", { className: "reg-sort-arrow", style: { opacity: sortCol === col ? 1 : 0.35 } }, sortCol === col ? sortDir === "asc" ? "\u25B2" : "\u25BC" : "\u283F")
      ) : /* @__PURE__ */ React.createElement(React.Fragment, null, REG_COL_LABELS[col], col !== "actions" && col !== "notes" ? " \u283F" : "")
    )))), /* @__PURE__ */ React.createElement("tbody", null, filtered.map((e, i) => /* @__PURE__ */ React.createElement("tr", { key: e.id, onContextMenu: (ev) => openCtx(ev, e), className: "reg-tr", style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" } }, visibleCols.map((col) => cellVal(e, col)))), filtered.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: visibleCols.length, className: "reg-empty-cell" }, /* @__PURE__ */ React.createElement(EmptyState, {
      icon: /* @__PURE__ */ React.createElement(Icon, { name: search || globalSearch ? "search" : "clipboard", size: 26, className: "c-textLt" }),
      message: search || globalSearch ? `No entries matching "${search || globalSearch}"` : "No entries found matching your filters.",
      actionLabel: !(search || globalSearch) && "+ Add Entry",
      onAction: openNew
    })))))), /* @__PURE__ */ React.createElement("div", { className: "reg-cards" }, filtered.map((e, i) => {
      const archived = isArchived(e, activeYear);
      const arcStyle = {
        color: archived ? "var(--textLt)" : "var(--text)",
        textDecoration: archived ? "line-through" : "none"
      };
      const isInc = e.type === "income";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: e.id,
          onContextMenu: (ev) => openCtx(ev, e),
          className: "reg-mobile-card"
        },
        /* @__PURE__ */ React.createElement("div", { className: "reg-mobile-card-toprow" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "reg-mobile-desc", style: arcStyle }, e.desc, archived && /* @__PURE__ */ React.createElement("span", { className: "historical-tag" }, " \xB7 historical"))), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13 reg-mobile-amount", style: {
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
            className: "cf-checkbtn reg-mobile-actions-btn"
          },
          "⋮"
        )),
        /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-8 cf-wrap" }, e.category && /* @__PURE__ */ React.createElement(CatChip, { category: e.category, categories, categoryColors }), e.startDate && /* @__PURE__ */ React.createElement("span", { className: "reg-mobile-date" }, humanShortDate(e.startDate), e.repeats && ` \xB7 ${recurLabel(e)}`), e.notes && /* @__PURE__ */ React.createElement("span", { className: "reg-mobile-notes" }, e.notes))
      );
    }), filtered.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "reg-empty-cell" }, /* @__PURE__ */ React.createElement(EmptyState, {
      icon: /* @__PURE__ */ React.createElement(Icon, { name: search || globalSearch ? "search" : "clipboard", size: 26, className: "c-textLt" }),
      message: search || globalSearch ? `No entries matching "${search || globalSearch}"` : "No entries found matching your filters.",
      actionLabel: !(search || globalSearch) && "+ Add Entry",
      onAction: openNew
    })))), confirmDelEntry !== null && /* @__PURE__ */ React.createElement(
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
    ));
  }
