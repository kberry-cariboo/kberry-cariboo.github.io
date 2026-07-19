  function getCatColor(category, categories, categoryColors = {}) {
    if (categoryColors && categoryColors[category]) return categoryColors[category];
    const sorted = [...categories].sort((a, b) => a.localeCompare(b));
    const idx = sorted.indexOf(category);
    return CAT_PALETTE[(idx < 0 ? 0 : idx) % CAT_PALETTE.length];
  }
  const CatChip = ({ category, categories, categoryColors, style = {} }) => {
    const ctxCats = useContext(CategoriesContext);
    const cats = categories || ctxCats.categories;
    const catColors = categoryColors || ctxCats.categoryColors;
    const color = getCatColor(category, cats, catColors);
    return /* @__PURE__ */ React.createElement("span", { style: __spreadValues({
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 10,
      fontWeight: 600,
      padding: "2px 7px",
      borderRadius: 10,
      background: color + "22",
      color: `color-mix(in srgb, ${color} var(--chipKeep, 100%), #fff)`,
      border: `1px solid ${color}44`,
      whiteSpace: "nowrap"
    }, style) }, category);
  };
  // Sparklines are context, not verdicts: neutral ink by default. First-vs-last
  // trend coloring was misleading (a red line beside a green income KPI, green
  // for rising expenses), so it's gone — pass `color` explicitly if needed.
  const Sparkline = ({ data, color = "var(--textMid)", height = 32, width = 80 }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => [
      i / (data.length - 1) * width,
      height - (v - min) / range * (height - 4) - 2
    ]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const lastPt = pts[pts.length - 1];
    return /* @__PURE__ */ React.createElement("svg", { width, height, style: { display: "block", overflow: "visible" } }, /* @__PURE__ */ React.createElement("path", { d: path, fill: "none", stroke: color, strokeWidth: 1.5 }), /* @__PURE__ */ React.createElement("circle", { cx: lastPt[0], cy: lastPt[1], r: 2.5, fill: color }));
  };
  function QuickAddFAB({ categories, templates = [], setTemplates, onSave, open = false, setOpen = () => {
  }, onImportCSV = null }) {
    const [menu, setMenu] = useState(false);
    const [form, setForm] = useState(false);
    const [scrolling, setScrolling] = useState(false);
    useEffect(() => {
      if (open) {
        setForm(true);
        setMenu(false);
      }
    }, [open]);
    useEffect(() => {
      let idleTimer = null;
      const onScroll = () => {
        setScrolling(true);
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => setScrolling(false), 400);
      };
      window.addEventListener("scroll", onScroll, { passive: true, capture: true });
      return () => {
        window.removeEventListener("scroll", onScroll, { capture: true });
        clearTimeout(idleTimer);
      };
    }, []);
    const closeForm = () => {
      setForm(false);
      setOpen(false);
    };
    const openAdd = () => {
      setMenu(false);
      setForm(true);
    };
    const fabActive = menu || form;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, form && /* @__PURE__ */ React.createElement("div", { className: "fab-panel cf-quickfab-panel", role: "dialog", "aria-label": "Add entry" }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 14,
      fontWeight: 700,
      color: "var(--text)",
      marginBottom: 16
    } }, "Add Entry"), /* @__PURE__ */ React.createElement(
      EntryForm,
      {
        initial: null,
        onSave: (data) => {
          onSave(data);
          closeForm();
        },
        onCancel: closeForm,
        categories,
        templates: templates || [],
        onSaveTemplate: (t) => setTemplates && setTemplates((prev) => [...prev.filter((x) => x.desc !== t.desc), t])
      }
    )), onImportCSV && menu && !form && /* @__PURE__ */ React.createElement("div", { className: "cf-quickfab-menu", role: "menu" }, /* @__PURE__ */ React.createElement("div", { onClick: () => setMenu(false), style: { position: "fixed", inset: 0, zIndex: -1 } }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMenu(false);
          onImportCSV();
        },
        className: "cf-fab-menu-btn",
        role: "menuitem"
      },
      /* @__PURE__ */ React.createElement("span", null, "\u2B06"),
      " Import CSV"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: openAdd,
        className: "cf-fab-menu-btn",
        role: "menuitem"
      },
      /* @__PURE__ */ React.createElement("span", null, "+"),
      " Add Entry"
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "cf-quickfab",
        onClick: () => {
          if (form) {
            closeForm();
            return;
          }
          if (onImportCSV) {
            setMenu((v) => !v);
          } else setForm(true);
        },
        "aria-label": fabActive ? "Close" : "Add entry",
        "aria-expanded": fabActive,
        title: fabActive ? "Close (Esc)" : onImportCSV ? "Entry actions" : "Add Entry (N)",
        "data-active": fabActive ? "true" : "false",
        "data-scrolling": scrolling ? "true" : "false"
      },
      "+"
    ));
  }
  function TemplatePicker({ templates = [], onSelect }) {
    const [open, setOpen] = useState(false);
    if (!templates.length) return null;
    return /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-block" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        "aria-expanded": open,
        "aria-haspopup": "menu",
        className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }
      },
      "\u{1F4CB} Templates ",
      open ? "\u25B2" : "\u25BC"
    ), open && /* @__PURE__ */ React.createElement("div", { className: "cf-popover" }, templates.map((t, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        onClick: () => {
          onSelect(t);
          setOpen(false);
        },
        className: "cf-menu-item cf-menu-item--compact",
        style: { display: "block", fontSize: 12 }
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600 } }, t.desc),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--textLt)", marginLeft: 8 } }, t.type === "income" ? "+" : "-", fmt(t.amount))
    ))));
  }
  const Card = ({ children, style = {}, className = "", id }) => /* @__PURE__ */ React.createElement("div", { id, className: `cf-card ${className}`.trim(), style }, children);
  const SectionTitle = ({ children, action }) => /* @__PURE__ */ React.createElement("div", { className: "cf-row-between", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("h2", { className: "cf-section-title-text" }, children), action);
  const EmptyState = ({ icon, message, actionLabel, onAction }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, marginBottom: 8 } }, icon), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, message), actionLabel && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onAction,
      className: "cf-btn cf-btn--primary",
      style: { fontSize: 12, fontWeight: 700, padding: "8px 18px" }
    },
    actionLabel
  ));
  const KpiCard = ({ label, value, color, sub }) => /* @__PURE__ */ React.createElement("div", { className: "kpi-card" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, label), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: color ? { color } : void 0 }, value), sub && /* @__PURE__ */ React.createElement("div", { className: "kpi-sub" }, sub));
  const MonthPicker = ({ value, onChange, noMargin = false, matchingMonths = null, onAddNextYear = null, nextYear = null }) => {
    const stripRef = useRef(null);
    useEffect(() => {
      const el = stripRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const btn = el.querySelector('[data-active="true"]');
      if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, [value]);
    return /* @__PURE__ */ React.createElement("div", { ref: stripRef, className: "month-picker", role: "group", "aria-label": "Month", style: { display: "flex", gap: 6, marginBottom: noMargin ? 0 : 20, flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "month-nav-arrow",
        onClick: () => onChange(Math.max(0, value - 1)),
        disabled: value === 0,
        title: "Previous month (\u2190 key)",
        "aria-label": "Previous month"
      },
      "\u2039"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "month-nav-arrow",
        onClick: () => onChange(Math.min(11, value + 1)),
        disabled: value === 11,
        title: "Next month (\u2192 key)",
        "aria-label": "Next month"
      },
      "\u203A"
    ), (() => {
      const cur = (/* @__PURE__ */ new Date()).getMonth();
      return value !== cur && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "month-today-pill cf-pill--dashed",
          onClick: () => onChange(cur),
          title: "Jump to current month",
          "aria-label": "Jump to current month"
        },
        "\u25CF ",
        MONTHS[cur]
      );
    })(), MONTHS.map((m, i) => {
      const isActive = value === i;
      const hasMatch = matchingMonths && matchingMonths.size > 0 && matchingMonths.has(i);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: m,
          onClick: () => onChange(i),
          className: "cf-pill month-pill",
          "aria-pressed": isActive,
          "data-active": isActive ? "true" : "false",
          "data-match": hasMatch ? "true" : "false"
        },
        m,
        hasMatch && !isActive && /* @__PURE__ */ React.createElement("span", { className: "month-pill-dot" })
      );
    }), onAddNextYear && nextYear != null && value >= 10 && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "month-nextyear-pill cf-pill--dashed",
        onClick: onAddNextYear,
        title: `Add budget year ${nextYear} — recurring entries carry forward automatically`
      },
      "+ Add ",
      nextYear
    ));
  };
  const ChartToggle = ({ options, value, onChange }) => /* @__PURE__ */ React.createElement("div", { role: "group", style: { display: "flex", gap: 2 } }, options.map((o) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: o.id,
      onClick: () => onChange(o.id),
      className: "chart-toggle-btn",
      title: o.label,
      "aria-label": o.label,
      "aria-pressed": value === o.id
    },
    o.icon || o.label
  )));
  // Base look lives in .cf-pill; explicitly-passed size props remain inline
  // overrides for the compact dashboard variants.
  const PillToggle = ({ options, value, onChange, gap = 6, fontSize, fontWeight, padding, borderRadius }) => {
    const override = {};
    if (fontSize !== void 0) override.fontSize = fontSize;
    if (fontWeight !== void 0) override.fontWeight = fontWeight;
    if (padding !== void 0) override.padding = padding;
    if (borderRadius !== void 0) override.borderRadius = borderRadius;
    const hasOverride = Object.keys(override).length > 0;
    return /* @__PURE__ */ React.createElement("div", { role: "group", style: { display: "flex", gap, flexWrap: "wrap", alignItems: "center" } }, options.map((o) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: o.id,
        onClick: () => onChange(o.id),
        className: "cf-pill",
        "aria-pressed": value === o.id,
        style: hasOverride ? override : void 0
      },
      o.label
    )));
  };
  const ChartTip = ({ active, payload, label }) => {
    if (!active || !(payload == null ? void 0 : payload.length)) return null;
    const total = payload.reduce((s, p) => s + Math.abs(p.value || 0), 0);
    return /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--primary)",
      borderRadius: 12,
      padding: "11px 15px",
      boxShadow: "var(--shadowLg)",
      minWidth: 160,
      border: "1px solid rgba(255,255,255,0.08)"
    } }, label && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 600 } }, label), payload.map((p) => {
      const isSurplus = p.name === "Surplus" || p.dataKey === "surplus";
      const lbl = isSurplus && p.value < 0 ? "Shortfall" : isSurplus ? "Surplus" : p.name;
      const pct = total > 0 && payload.length > 1 ? (100 * Math.abs(p.value) / total).toFixed(1) : null;
      const val = typeof p.value === "number" ? p.value : 0;
      return /* @__PURE__ */ React.createElement("div", { key: p.dataKey || p.name, style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 2,
        alignItems: "baseline"
      } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "rgba(255,255,255,0.6)" } }, lbl), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13", style: {
        color: p.color || "#fff",
        fontWeight: 600
      } }, fmt(val), pct && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.45)" } }, " ", pct, "%")));
    }));
  };
  const FieldError = ({ msg }) => msg ? /* @__PURE__ */ React.createElement("div", { className: "field-error-text" }, msg) : null;
  function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Delete" }) {
    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [onCancel]);
    return /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", role: "alertdialog", "aria-modal": "true", "aria-label": title }, /* @__PURE__ */ React.createElement("div", { className: "modal-card", style: { padding: "24px", width: "min(400px,calc(100vw - 32px))" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 12 } }, title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "var(--textMid)", marginBottom: 24, lineHeight: 1.6 } }, message), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "cf-btn cf-btn--secondary", style: { fontSize: 13, padding: "8px 18px" } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      haptic();
      onConfirm();
    }, className: "cf-btn cf-btn--danger-solid", autoFocus: true }, confirmLabel))));
  }
  const Toggle = ({ value, onChange, label }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, userSelect: "none" } }, /* @__PURE__ */ React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": value,
    "aria-label": label || void 0,
    onClick: () => onChange(!value),
    className: "cf-switch"
  }, /* @__PURE__ */ React.createElement("div", { className: "cf-switch-knob" })), label && /* @__PURE__ */ React.createElement("span", { onClick: () => onChange(!value), style: { fontSize: 13, color: "var(--text)", fontWeight: 600, cursor: "pointer" } }, label));
