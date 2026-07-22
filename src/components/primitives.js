  function getCatColor(category, categories, categoryColors = {}) {
    if (categoryColors && categoryColors[category]) return categoryColors[category];
    const sorted = [...categories].sort((a, b) => a.localeCompare(b));
    const idx = sorted.indexOf(category);
    return CAT_PALETTE[(idx < 0 ? 0 : idx) % CAT_PALETTE.length];
  }
  const CatChip = ({ category, categories, categoryColors, style = {}, className = "" }) => {
    const ctxCats = useContext(CategoriesContext);
    const cats = categories || ctxCats.categories;
    const catColors = categoryColors || ctxCats.categoryColors;
    const color = getCatColor(category, cats, catColors);
    return /* @__PURE__ */ React.createElement("span", { className: ("cat-chip " + className).trim(), style: __spreadValues({
      background: color + "22",
      color: `color-mix(in srgb, ${color} var(--chipKeep, 100%), #fff)`,
      border: `1px solid ${color}44`
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
    // 3px horizontal inset keeps the end dot (r=2.5) inside the svg box —
    // it used to bleed past the card edge on narrow phone tiles.
    const pts = data.map((v, i) => [
      3 + i / (data.length - 1) * (width - 6),
      height - (v - min) / range * (height - 4) - 2
    ]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const lastPt = pts[pts.length - 1];
    return /* @__PURE__ */ React.createElement("svg", { width, height, className: "sparkline-svg" }, /* @__PURE__ */ React.createElement("path", { d: path, fill: "none", stroke: color, strokeWidth: 1.5 }), /* @__PURE__ */ React.createElement("circle", { cx: lastPt[0], cy: lastPt[1], r: 2.5, fill: color }));
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
    // Esc closes the quick-add panel/menu — same contract as the modal system.
    useEffect(() => {
      if (!form && !menu) return;
      const h = (e) => {
        if (e.key === "Escape") {
          setMenu(false);
          setForm(false);
          setOpen(false);
        }
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [form, menu]);
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
    return /* @__PURE__ */ React.createElement(React.Fragment, null, form && /* @__PURE__ */ React.createElement("div", { className: "fab-panel cf-quickfab-panel", role: "dialog", "aria-label": "Add entry", "data-noprint": true }, /* @__PURE__ */ React.createElement("div", { className: "fab-panel-title" }, "Add Entry"), /* @__PURE__ */ React.createElement(
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
    )), onImportCSV && menu && !form && /* @__PURE__ */ React.createElement("div", { className: "cf-quickfab-menu", role: "menu", "data-noprint": true }, /* @__PURE__ */ React.createElement("div", { onClick: () => setMenu(false), className: "fab-menu-backdrop" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMenu(false);
          onImportCSV();
        },
        className: "cf-fab-menu-btn",
        role: "menuitem"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "upload", size: 14 }),
      "Import CSV"
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
        "data-noprint": true,
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
    return /* @__PURE__ */ React.createElement("div", { className: "relative inline-block" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        "aria-expanded": open,
        "aria-haspopup": "menu",
        className: "cf-btn cf-btn--secondary template-picker-btn"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "clipboard", size: 13 }),
      "Templates ",
      open ? "\u25B2" : "\u25BC"
    ), open && /* @__PURE__ */ React.createElement("div", { className: "cf-popover" }, templates.map((t, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        onClick: () => {
          onSelect(t);
          setOpen(false);
        },
        className: "cf-menu-item cf-menu-item--compact template-item"
      },
      /* @__PURE__ */ React.createElement("span", { className: "fw-600" }, t.desc),
      /* @__PURE__ */ React.createElement("span", { className: "template-item-amount" }, t.type === "income" ? "+" : "-", fmt(t.amount))
    ))));
  }
  const Card = ({ children, style = {}, className = "", id }) => /* @__PURE__ */ React.createElement("div", { id, className: `cf-card ${className}`.trim(), style }, children);
  // className replaces the default bottom margin (e.g. "mb-0" for flush headers).
  const SectionTitle = ({ children, action, className }) => /* @__PURE__ */ React.createElement("div", { className: "cf-row-between " + (className || "mb-12") }, /* @__PURE__ */ React.createElement("h2", { className: "cf-section-title-text" }, children), action);
  const EmptyState = ({ icon, message, actionLabel, onAction }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "empty-state-icon" }, icon), /* @__PURE__ */ React.createElement("div", { className: "mb-14" }, message), actionLabel && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onAction,
      className: "cf-btn cf-btn--primary cf-btn--action"
    },
    actionLabel
  ));
  const KpiCard = ({ label, value, color, sub }) => /* @__PURE__ */ React.createElement("div", { className: "kpi-card" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, label), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: color ? { color } : void 0 }, value), sub && /* @__PURE__ */ React.createElement("div", { className: "kpi-sub" }, sub));
  // Mobile-only "which year am I on" indicator — desktop already shows the
  // year pills in the header, which are hidden on mobile to save space.
  const MobileYearBadge = ({ year }) => /* @__PURE__ */ React.createElement("div", { className: "mobile-year-badge" }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 12 }), year);
  const MonthPicker = ({ value, onChange, noMargin = false, matchingMonths = null, onAddNextYear = null, nextYear = null }) => {
    const stripRef = useRef(null);
    // Edge-scroll fade: on mobile the strip scrolls horizontally with no
    // visible scrollbar, so nothing hints that more months sit off-screen.
    // Recomputed on scroll and on resize/value change (month pills reflow at
    // some widths).
    const [fade, setFade] = useState({ left: false, right: false });
    const updateFade = () => {
      const el = stripRef.current;
      if (!el) return;
      setFade({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4
      });
    };
    useEffect(() => {
      const el = stripRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const btn = el.querySelector('[data-active="true"]');
      if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, [value]);
    useEffect(() => {
      const el = stripRef.current;
      if (!el) return;
      updateFade();
      el.addEventListener("scroll", updateFade, { passive: true });
      window.addEventListener("resize", updateFade);
      return () => {
        el.removeEventListener("scroll", updateFade);
        window.removeEventListener("resize", updateFade);
      };
    }, [value, matchingMonths]);
    return /* @__PURE__ */ React.createElement("div", { className: "relative" + (noMargin ? "" : " mb-20") }, fade.left && /* @__PURE__ */ React.createElement("div", { className: "month-picker-fade month-picker-fade--left", "aria-hidden": "true" }), fade.right && /* @__PURE__ */ React.createElement("div", { className: "month-picker-fade month-picker-fade--right", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", { ref: stripRef, className: "month-picker", role: "group", "aria-label": "Month" }, /* @__PURE__ */ React.createElement(
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
    )));
  };
  const ChartToggle = ({ options, value, onChange }) => /* @__PURE__ */ React.createElement("div", { role: "group", className: "chart-toggle-group" }, options.map((o) => /* @__PURE__ */ React.createElement(
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
  // size="sm" applies the .cf-pill--sm modifier — used where the toggle docks
  // into a tight card header (YoY metric, shared-view) instead of one-off
  // fontSize/padding/borderRadius overrides per call site.
  const PillToggle = ({ options, value, onChange, size }) => {
    return /* @__PURE__ */ React.createElement("div", { role: "group", className: "cf-row cf-gap-6 cf-wrap" }, options.map((o) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: o.id,
        onClick: () => onChange(o.id),
        className: "cf-pill" + (size === "sm" ? " cf-pill--sm" : ""),
        "aria-pressed": value === o.id
      },
      o.label
    )));
  };
  const ChartTip = ({ active, payload, label }) => {
    if (!active || !(payload == null ? void 0 : payload.length)) return null;
    const total = payload.reduce((s, p) => s + Math.abs(p.value || 0), 0);
    return /* @__PURE__ */ React.createElement("div", { className: "chart-tip" }, label && /* @__PURE__ */ React.createElement("div", { className: "chart-tip-label" }, label), payload.map((p) => {
      const isSurplus = p.name === "Surplus" || p.dataKey === "surplus";
      const lbl = isSurplus && p.value < 0 ? "Shortfall" : isSurplus ? "Surplus" : p.name;
      const pct = total > 0 && payload.length > 1 ? (100 * Math.abs(p.value) / total).toFixed(1) : null;
      const val = typeof p.value === "number" ? p.value : 0;
      return /* @__PURE__ */ React.createElement("div", { key: p.dataKey || p.name, className: "chart-tip-row" }, /* @__PURE__ */ React.createElement("span", { className: "chart-tip-name" }, lbl), /* @__PURE__ */ React.createElement("span", { className: "cf-text-mono-13 chart-tip-value", style: {
        color: p.color || "#fff"
      } }, fmt(val), pct && /* @__PURE__ */ React.createElement("span", { className: "chart-tip-pct" }, " ", pct, "%")));
    }));
  };
  const FieldError = ({ msg }) => msg ? /* @__PURE__ */ React.createElement("div", { className: "field-error-text" }, msg) : null;
  function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Delete", confirmVariant = "danger" }) {
    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [onCancel]);
    // Backdrop click dismisses (matching every other overlay) and initial
    // focus lands on Cancel — Enter must not trigger the primary action by
    // default. confirmVariant "danger" (the default) is for destructive
    // actions (delete/reset); "primary" is for a plain yes/no confirmation
    // of a safe, additive action, where a red button would misrepresent risk.
    return /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", role: confirmVariant === "danger" ? "alertdialog" : "dialog", "aria-modal": "true", "aria-label": title, onClick: (e) => {
      if (e.target === e.currentTarget) onCancel();
    } }, /* @__PURE__ */ React.createElement("div", { className: "modal-card confirm-dialog-card", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "confirm-dialog-title" }, title), /* @__PURE__ */ React.createElement("div", { className: "confirm-dialog-message" }, message), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 justify-end" }, /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "cf-btn cf-btn--secondary", autoFocus: true }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      haptic();
      onConfirm();
    }, className: "cf-btn " + (confirmVariant === "danger" ? "cf-btn--danger-solid" : "cf-btn--primary") }, confirmLabel))));
  }
  const Toggle = ({ value, onChange, label }) => /* @__PURE__ */ React.createElement("div", { className: "toggle-row" }, /* @__PURE__ */ React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": value,
    "aria-label": label || void 0,
    onClick: () => onChange(!value),
    className: "cf-switch"
  }, /* @__PURE__ */ React.createElement("div", { className: "cf-switch-knob" })), label && /* @__PURE__ */ React.createElement("span", { onClick: () => onChange(!value), className: "toggle-label" }, label));
