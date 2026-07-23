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
  // Shared row-pagination for grids that used to be internally-scrolling
  // (Monthly, Forecast, Entries). `paginateRows` just slices; callers own
  // deriving any grouped/sectioned subsets (e.g. period headers) from the
  // returned `rows`. `page` is clamped into range here so callers never need
  // a separate "reset page on filter change" effect — a page that no longer
  // exists just clamps back into range on the next render.
  const PAGE_SIZE_OPTIONS = [10, 20, 50, "all"];
  function paginateRows(rows, page, pageSize) {
    const total = rows.length;
    const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);
    const start = pageSize === "all" ? 0 : safePage * pageSize;
    const end = pageSize === "all" ? total : Math.min(total, start + pageSize);
    return { rows: rows.slice(start, end), total, totalPages, safePage, start, end, hasMore: end < total };
  }
  // Mobile counterpart of paginateRows: instead of a single windowed page,
  // shows everything loaded so far (page 1..loadedPages worth), so scrolling
  // to the bottom can just load the next batch on top of what's visible
  // rather than replacing it.
  function cumulativeRows(rows, loadedPages, pageSize) {
    const total = rows.length;
    const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));
    const safeLoaded = Math.min(Math.max(1, loadedPages), totalPages);
    const end = pageSize === "all" ? total : Math.min(total, safeLoaded * pageSize);
    return { rows: rows.slice(0, end), total, totalPages, safePage: safeLoaded - 1, start: 0, end, hasMore: end < total };
  }
  // Fires onLoadMore (repeatedly, harmlessly — callers clamp) whenever
  // scrolling comes within reach of the bottom of the whole page. Touch
  // devices scroll `.app-scroll` internally rather than the window/body (see
  // its CSS: mobile keeps body fixed so the browser chrome/URL bar never
  // animates the bottom nav), so this checks both — whichever one is
  // actually the scrolling context reports real overflow, the other reports
  // none and is a harmless no-op.
  function useInfiniteScroll(active, onLoadMore) {
    const cbRef = useRef(onLoadMore);
    cbRef.current = onLoadMore;
    useEffect(() => {
      if (!active) return;
      const shell = document.querySelector(".app-scroll");
      const check = () => {
        const winRemaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
        const shellRemaining = shell ? shell.scrollHeight - shell.clientHeight - shell.scrollTop : Infinity;
        if (Math.min(winRemaining, shellRemaining) < 400) cbRef.current();
      };
      window.addEventListener("scroll", check, { passive: true });
      if (shell) shell.addEventListener("scroll", check, { passive: true });
      check();
      return () => {
        window.removeEventListener("scroll", check);
        if (shell) shell.removeEventListener("scroll", check);
      };
    }, [active]);
  }
  const GridPagination = ({ pageInfo, setPage, pageSize, setPageSize, label = "rows", isMobile = false }) => {
    const { total, totalPages, safePage, start, end } = pageInfo;
    if (total === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "grid-pagination" + (isMobile ? " grid-pagination--mobile" : ""), "data-noprint": true }, /* @__PURE__ */ React.createElement("div", { className: "grid-pagination-info" }, `${start + 1}–${end} of ${total} ${label}`), /* @__PURE__ */ React.createElement("div", { className: "grid-pagination-controls" }, /* @__PURE__ */ React.createElement("label", { className: "grid-pagination-size" }, "Show", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: pageSize,
        "aria-label": "Rows per page",
        onChange: (e) => {
          const v = e.target.value === "all" ? "all" : parseInt(e.target.value, 10);
          setPageSize(v);
        }
      },
      PAGE_SIZE_OPTIONS.map((v) => /* @__PURE__ */ React.createElement("option", { key: v, value: v }, v === "all" ? "All" : v))
    )), !isMobile && totalPages > 1 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "grid-pagination-nav",
        onClick: () => setPage((p) => Math.max(0, p - 1)),
        disabled: safePage === 0,
        "aria-label": "Previous page"
      },
      "‹"
    ), /* @__PURE__ */ React.createElement("span", { className: "grid-pagination-page" }, `Page ${safePage + 1} of ${totalPages}`), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "grid-pagination-nav",
        onClick: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
        disabled: safePage >= totalPages - 1,
        "aria-label": "Next page"
      },
      "›"
    ))));
  };
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
  // Tapping it opens the same year switcher the header pills provide.
  const MobileYearBadge = ({ year, years = [], onSelect = () => {
  } }) => {
    const [ctx, setCtx] = useState(null);
    if (years.length < 2) {
      return /* @__PURE__ */ React.createElement("div", { className: "mobile-year-badge" }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 12 }), year);
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "mobile-year-badge mobile-year-badge--btn",
        "aria-label": "Switch year",
        "aria-haspopup": "menu",
        onClick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setCtx({ x: r.left, y: r.bottom + 4 });
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 12 }),
      year,
      /* @__PURE__ */ React.createElement("span", { className: "mobile-year-badge-caret" }, "▾")
    ), ctx && /* @__PURE__ */ React.createElement(
      ContextMenu,
      {
        x: ctx.x,
        y: ctx.y,
        onClose: () => setCtx(null),
        items: years.map((y) => ({ icon: y === year ? "✓" : "", label: String(y), action: () => onSelect(y) }))
      }
    ));
  };
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
