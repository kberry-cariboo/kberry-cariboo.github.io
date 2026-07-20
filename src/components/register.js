  function RegisterView({ entries, setEntries, addEntry, categories, setCategories = () => {
  }, categoryColors = {}, activeYear, onDeleted = () => {
  }, templates = [], setTemplates, globalSearch = "", allYearFlows = null, colOrder = DEFAULT_REG_COLS, setColOrder = () => {
  }, filter = "all", setFilter = () => {
  }, filterCats = [], setFilterCats = () => {
  }, filterScheds = [], setFilterScheds = () => {
  }, filterStatus = [], setFilterStatus = () => {
  }, flow = [], completed = {}, markOccurrencesPaid = () => {
  } }) {
    const cols = Array.isArray(colOrder) && colOrder.length ? colOrder : DEFAULT_REG_COLS;
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [searchAllYears, setSearchAllYears] = useState(false);
    const [selIds, setSelIds] = useState(() => /* @__PURE__ */ new Set());
    const toggleSel = (id) => setSelIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    const markSelectedPaid = () => {
      try {
        const cm = (/* @__PURE__ */ new Date()).getMonth();
        const occIds = [];
        selIds.forEach((id) => {
          (flow || []).forEach((ev) => {
            if (ev.entryId === id && ev.month === cm && !completed[ev.id]) occIds.push(ev.id);
          });
        });
        if (!occIds.length) {
          toast("No unpaid items this month in selection", "error");
          return;
        }
        markOccurrencesPaid(occIds);
        haptic();
        toast(`Marked ${occIds.length} item${occIds.length !== 1 ? "s" : ""} paid for ${MONTHS[cm]}`);
        setSelIds(/* @__PURE__ */ new Set());
      } catch (err) {
        toast("Bulk update failed: " + err.message, "error");
      }
    };
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
      if (!e.repeats) return /* @__PURE__ */ React.createElement("span", { style: { color: "var(--amber)", fontSize: 13 } }, "One-time");
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
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-desc-cell", style: __spreadValues({ fontSize: 13, padding: "10px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "40%", minWidth: 120 }, arcText) }, e.desc, archived && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 11, fontStyle: "italic" } }, " \xB7 historical"));
        case "type":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-type", style: { padding: "10px 12px", opacity: archived ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", background: e.type === "income" ? "#E8F8F1" : "var(--redLt)", color: e.type === "income" ? "var(--greenDk)" : "var(--red)" } }, e.type));
        case "amount":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-amount cf-text-mono-13", style: { fontWeight: 600, padding: "10px 12px", color: archived ? "var(--textLt)" : e.type === "income" ? "var(--greenDk)" : "var(--text)", textDecoration: archived ? "line-through" : "none" } }, (e.type === "income" ? "+" : "-") + (e.monthlyAmounts ? fmtVarRange(e.monthlyAmounts) : fmt(e.amount)));
        case "startDate":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-date", style: __spreadValues({ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }, arcMeta) }, e.startDate || "\u2014");
        case "schedule":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-sched", style: __spreadValues({ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }, arcMeta) }, recurLabel(e));
        case "until":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-until", style: __spreadValues({ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }, arcMeta) }, e.repeats ? e.recurEnd ? /* @__PURE__ */ React.createElement("span", __spreadValues({}, arcMeta), e.recurEnd) : /* @__PURE__ */ React.createElement("span", { style: { color: archived ? "var(--textLt)" : "var(--greenDk)", textDecoration: archived ? "line-through" : "none" } }, "ongoing") : "\u2014");
        case "category":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-cat", style: { padding: "10px 12px", opacity: archived ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement(CatChip, { category: e.category, categories, categoryColors }));
        case "notes":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-col-notes", style: __spreadValues({ fontSize: 13, padding: "10px 12px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, arcMeta) }, e.notes);
        case "actions":
          return /* @__PURE__ */ React.createElement("td", { key: col, className: "reg-actions", style: { padding: "10px 8px", whiteSpace: "nowrap" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => openEdit(e), title: "Edit", "aria-label": "Edit entry", className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 9px", borderRadius: 5 } }, "\u270E"), /* @__PURE__ */ React.createElement("button", { onClick: () => doCopy(e), title: "Copy", "aria-label": "Duplicate entry", className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "4px 9px", borderRadius: 5 } }, "\u2398"), /* @__PURE__ */ React.createElement("button", { onClick: () => del(e.id), title: "Delete", "aria-label": "Delete entry", className: "cf-btn cf-btn--danger", style: { fontSize: 11, padding: "4px 9px", borderRadius: 5 } }, "\u2715")));
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
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { className: "txl" }, "From"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "date",
        value: dateFrom,
        onChange: (e) => setDateFrom(e.target.value),
        style: {
          fontSize: 12,
          padding: "5px 8px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--bgCard)",
          color: "var(--text)",
          outline: "none"
        }
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "txl" }, "To"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "date",
        value: dateTo,
        onChange: (e) => setDateTo(e.target.value),
        style: {
          fontSize: 12,
          padding: "5px 8px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--bgCard)",
          color: "var(--text)",
          outline: "none"
        }
      }
    ), (dateFrom || dateTo) && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setDateFrom("");
          setDateTo("");
        },
        style: { fontSize: 13, color: "var(--textLt)", background: "none", border: "none", cursor: "pointer", padding: "4px" }
      },
      "✕"
    )));
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(PillToggle, { options: [{ id: "all", label: "All Types" }, { id: "income", label: "Income" }, { id: "expense", label: "Expenses" }], value: filter, onChange: setFilter })), /* @__PURE__ */ React.createElement("div", { className: "reg-filter-row", style: { display: "flex", justifyContent: "flex-start", alignItems: "center", marginBottom: 12, gap: 6, flexWrap: "wrap", rowGap: 8 } }, !isMobile && filterControls, isMobile && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowMobileFilters(true),
        "aria-haspopup": "dialog",
        style: {
          fontSize: 13,
          fontWeight: 600,
          padding: "8px 14px",
          border: "1.5px solid " + (activeFilterCount > 0 ? "var(--navy)" : "var(--border)"),
          borderRadius: 20,
          background: activeFilterCount > 0 ? "rgba(28,43,58,0.07)" : "var(--bgCard)",
          color: activeFilterCount > 0 ? "var(--navy)" : "var(--text)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      },
      "\u2699\ufe0f Filters",
      activeFilterCount > 0 && /* @__PURE__ */ React.createElement("span", { style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 9,
        background: "var(--navy)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700
      } }, activeFilterCount)
    ), (search || globalSearch) && /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--textMid)", cursor: "pointer", whiteSpace: "nowrap" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: searchAllYears, onChange: (e) => setSearchAllYears(e.target.checked), style: { cursor: "pointer" } }), "All years"), /* @__PURE__ */ React.createElement(
      "input",
      {
        placeholder: globalSearch ? `Search\u2026 (header: "${globalSearch}")` : "Search\u2026 try >100",
        value: search,
        onChange: (e) => setSearch(e.target.value),
        style: {
          fontSize: 13,
          padding: "6px 12px",
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--bgCard)",
          color: "var(--text)",
          outline: "none",
          width: 200
        }
      }
    ), !isMobile && /* @__PURE__ */ React.createElement(
      "button",
      { onClick: openNew, className: "cf-btn cf-btn--primary", style: { fontSize: 12, padding: "7px 16px", whiteSpace: "nowrap" } },
      "+ Add Entry"
    ), !isMobile && /* @__PURE__ */ React.createElement(
      "button",
      { onClick: () => setShowCSV((v) => !v), className: "cf-btn cf-btn--secondary", style: { fontSize: 12, padding: "7px 14px", whiteSpace: "nowrap" } },
      "Import CSV"
    ), !search && globalSearch && /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 12,
      color: "var(--amber)",
      padding: "6px 10px",
      background: "var(--amberLt)",
      borderRadius: 6,
      border: "1px solid var(--amber)",
      width: "100%",
      marginTop: 6
    } }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 12, style: { marginRight: 4, verticalAlign: -2 } }), 'Filtering register by "', globalSearch, '" from header search \u2014 ', filtered.length, " match", filtered.length !== 1 ? "es" : "")), isMobile && showMobileFilters && /* @__PURE__ */ React.createElement(
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
      /* @__PURE__ */ React.createElement("div", { className: "modal-card", style: { padding: "20px 20px 16px", width: "min(480px,calc(100vw - 32px))", maxHeight: "80vh", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)" } }, "Filters"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowMobileFilters(false), "aria-label": "Close filters", style: { background: "none", border: "none", fontSize: 20, color: "var(--textLt)", cursor: "pointer", lineHeight: 1 } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 } }, filterControls), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowMobileFilters(false),
          className: "cf-btn cf-btn--primary",
          style: { width: "100%", marginTop: 18, padding: "12px" }
        },
        "Show results"
      ))
    ), showCSV && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: () => setShowCSV(false),
        style: { position: "fixed", inset: 0, zIndex: 1499, background: "rgba(0,0,0,0.25)" }
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "fab-panel", style: {
      position: "fixed",
      bottom: "calc(80px + env(safe-area-inset-bottom))",
      right: 16,
      zIndex: 1500,
      background: "var(--bgCard)",
      borderRadius: 16,
      padding: 20,
      boxShadow: "var(--shadowXl)",
      border: "1px solid var(--border)",
      width: "min(400px, calc(100vw - 32px))",
      maxHeight: "80vh",
      overflowY: "auto"
    } }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)" } }, "Import CSV"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowCSV(false),
        "aria-label": "Close",
        style: {
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          color: "var(--textLt)",
          padding: 4,
          lineHeight: 1
        }
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
    ))), selIds.size > 0 && /* @__PURE__ */ React.createElement("div", { className: "reg-bulkbar", style: {
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
      MONTHS[(/* @__PURE__ */ new Date()).getMonth()],
      ")"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setSelIds(/* @__PURE__ */ new Set()),
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
    )), showForm && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: close,
        style: { position: "fixed", inset: 0, zIndex: 1499, background: "rgba(0,0,0,0.25)" }
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "fab-panel", style: {
      position: "fixed",
      bottom: "calc(80px + env(safe-area-inset-bottom))",
      right: 16,
      zIndex: 1500,
      background: "var(--bgCard)",
      borderRadius: 16,
      padding: 20,
      boxShadow: "var(--shadowXl)",
      border: "1px solid var(--border)",
      width: "min(680px, calc(100vw - 32px))",
      maxHeight: "80vh",
      overflowY: "auto"
    } }, /* @__PURE__ */ React.createElement("div", { className: "cf-row-between mb-16" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)" } }, editing ? "Edit Entry" : "Add Entry"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: close,
        "aria-label": "Close",
        style: {
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          color: "var(--textLt)",
          padding: 4,
          lineHeight: 1
        }
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
    ))), /* @__PURE__ */ React.createElement(Card, { className: "cf-card--flush" }, /* @__PURE__ */ React.createElement("div", { className: "reg-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "reg-table", style: { width: "100%", borderCollapse: "collapse", minWidth: 540 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "thead-row" }, /* @__PURE__ */ React.createElement("th", { className: "reg-th", style: { padding: "10px 6px 10px 12px", width: 34, background: "var(--navy)" } }, (() => {
      const allSel = filtered.length > 0 && filtered.every((e) => selIds.has(e.id));
      const someSel = filtered.some((e) => selIds.has(e.id));
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            if (allSel) setSelIds(/* @__PURE__ */ new Set());
            else setSelIds(new Set(filtered.map((e) => e.id)));
          },
          role: "checkbox",
          "aria-checked": allSel,
          "aria-label": allSel ? "Deselect all" : "Select all",
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
    })()), visibleCols.map((col) => /* @__PURE__ */ React.createElement(
      "th",
      {
        key: col,
        className: "reg-th",
        draggable: true,
        onDragStart: () => onDragStart(col),
        onDragOver: (e) => onDragOver(e, col),
        onDrop: () => onDrop(col),
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          padding: "10px 12px",
          textAlign: "left",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          cursor: "grab",
          userSelect: "none",
          background: dragOver === col ? "#3d5570" : "var(--navy)",
          transition: "background 0.1s"
        }
      },
      ["desc", "amount", "startDate", "category", "schedule"].includes(col) ? /* @__PURE__ */ React.createElement(
        "span",
        {
          onClick: (e) => {
            e.stopPropagation();
            toggleSort(col);
          },
          style: { cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, userSelect: "none" },
          title: `Sort by ${REG_COL_LABELS[col]}`
        },
        REG_COL_LABELS[col],
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, opacity: sortCol === col ? 1 : 0.35 } }, sortCol === col ? sortDir === "asc" ? "\u25B2" : "\u25BC" : "\u283F")
      ) : /* @__PURE__ */ React.createElement(React.Fragment, null, REG_COL_LABELS[col], col !== "actions" && col !== "notes" ? " \u283F" : "")
    )))), /* @__PURE__ */ React.createElement("tbody", null, filtered.map((e, i) => /* @__PURE__ */ React.createElement("tr", { key: e.id, onContextMenu: (ev) => openCtx(ev, e), style: { background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)", borderBottom: "1px solid var(--border)", cursor: "context-menu" } }, /* @__PURE__ */ React.createElement("td", { onClick: (ev) => ev.stopPropagation(), style: { padding: "8px 6px 8px 12px", width: 34 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          haptic();
          toggleSel(e.id);
        },
        role: "checkbox",
        "aria-checked": selIds.has(e.id),
        "aria-label": selIds.has(e.id) ? "Deselect row" : "Select row",
        className: "cf-checkbtn",
        style: {
          width: 20,
          height: 20,
          borderRadius: 5,
          cursor: "pointer",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: selIds.has(e.id) ? "none" : "1.5px solid var(--border)",
          background: selIds.has(e.id) ? "var(--primary)" : "transparent",
          color: "#fff",
          fontSize: 12,
          lineHeight: 1
        }
      },
      selIds.has(e.id) ? "\u2713" : ""
    )), visibleCols.map((col) => cellVal(e, col)))), filtered.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: visibleCols.length + 1, style: { padding: "32px", textAlign: "center", color: "var(--textLt)" } }, /* @__PURE__ */ React.createElement(EmptyState, {
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
          style: {
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bgCard)",
            cursor: "context-menu"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (ev) => {
              ev.stopPropagation();
              haptic();
              toggleSel(e.id);
            },
            role: "checkbox",
            "aria-checked": selIds.has(e.id),
            "aria-label": selIds.has(e.id) ? "Deselect entry" : "Select entry",
            className: "cf-checkbtn",
            style: {
              width: 22,
              height: 22,
              borderRadius: 5,
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
              marginTop: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: selIds.has(e.id) ? "none" : "1.5px solid var(--border)",
              background: selIds.has(e.id) ? "var(--navy)" : "transparent",
              color: "#fff",
              fontSize: 13,
              lineHeight: 1
            }
          },
          selIds.has(e.id) ? "\u2713" : ""
        ), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: __spreadValues({
          fontSize: 13,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }, arcStyle) }, e.desc, archived && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 11, fontStyle: "italic" } }, " \xB7 historical"))), /* @__PURE__ */ React.createElement("div", { className: "cf-text-mono-13", style: {
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
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
            className: "cf-checkbtn",
            style: {
              width: 26,
              height: 26,
              flexShrink: 0,
              marginTop: -2,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              background: "transparent",
              color: "var(--textLt)",
              fontSize: 16,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          "⋮"
        )),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } }, e.category && /* @__PURE__ */ React.createElement(CatChip, { category: e.category, categories, categoryColors }), e.startDate && /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 11,
          color: "var(--textMid)"
        } }, humanShortDate(e.startDate), e.repeats && ` · ${recurLabel(e)}`), e.notes && /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 11,
          color: "var(--textLt)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 120
        } }, e.notes))
      );
    }), filtered.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "32px", textAlign: "center", color: "var(--textLt)" } }, /* @__PURE__ */ React.createElement(EmptyState, {
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
