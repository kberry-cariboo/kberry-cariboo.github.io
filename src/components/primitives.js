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
    // A dot, not a filled pill. Category is an attribute of a row, not a
    // verdict on it, and a list of twenty filled chips reads as confetti —
    // which is exactly what drowns out the two or three amounts that do
    // carry a warning. The hue still identifies the category; it just stops
    // competing with the state colours for attention.
    return /* @__PURE__ */ React.createElement("span", { className: ("cat-chip " + className).trim(), style: __spreadValues({}, style) },
      /* @__PURE__ */ React.createElement("i", { className: "cat-dot", style: { background: chipDot(color, ctxCats.chipSurface) }, "aria-hidden": "true" }),
      category);
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
    return /* @__PURE__ */ React.createElement("svg", { width, height, className: "sparkline-svg", role: "presentation", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: path, fill: "none", stroke: color, strokeWidth: 1.5 }), /* @__PURE__ */ React.createElement("circle", { cx: lastPt[0], cy: lastPt[1], r: 2.5, fill: color }));
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
      /* @__PURE__ */ React.createElement("span", { className: "template-item-amount" }, isInflowEvent(t) ? "+" : "-", fmt(t.amount))
    ))));
  }
  // Drag handle for the mobile bottom sheets, and the swipe-down-to-dismiss
  // gesture that makes it honest. The touch context menu has drawn a handle
  // for a while, but it was an inert <div> — an affordance promising a gesture
  // the app didn't implement, on sheets that also don't close on a backdrop
  // tap (deliberately: a slightly-off tap shouldn't discard a half-filled
  // form). Swiping the handle is the mis-tap-proof way to give that gesture
  // back, so every sheet now has the same one.
  //
  // Pointer events, not touch events: they cover pen and mouse for free, and
  // setPointerCapture keeps the drag alive if the finger leaves the handle.
  // The card follows the finger so the gesture reads as direct manipulation,
  // and snaps back below the dismiss threshold.
  const SheetHandle = ({ onDismiss }) => {
    const ref = useRef(null);
    const drag = useRef(null);
    if (!onDismiss) return null;
    const cardOf = (el) => el && el.closest && el.closest(".modal-card");
    const move = (card, dy) => {
      if (!card) return;
      card.style.transition = "none";
      card.style.transform = dy > 0 ? `translateY(${dy}px)` : "";
    };
    const release = (card, dismiss) => {
      if (!card) return;
      card.style.transition = "transform 0.18s ease-out";
      card.style.transform = "";
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref,
        className: "sheet-handle",
        "aria-hidden": "true",
        onPointerDown: (e) => {
          drag.current = { y: e.clientY, card: cardOf(e.currentTarget) };
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (err) {
            // Capture is an enhancement; the drag still tracks without it.
          }
        },
        onPointerMove: (e) => {
          if (!drag.current) return;
          move(drag.current.card, e.clientY - drag.current.y);
        },
        onPointerUp: (e) => {
          if (!drag.current) return;
          const dy = e.clientY - drag.current.y;
          const card = drag.current.card;
          drag.current = null;
          release(card);
          // ~90px, or a quarter of the sheet, whichever is smaller — a short
          // sheet shouldn't need a longer swipe than a tall one.
          const threshold = card ? Math.min(90, card.offsetHeight * 0.25) : 90;
          if (dy > threshold) {
            haptic();
            onDismiss();
          }
        },
        onPointerCancel: () => {
          if (!drag.current) return;
          release(drag.current.card);
          drag.current = null;
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "sheet-handle-bar" })
    );
  };
  const Card = ({ children, style = {}, className = "", id }) => /* @__PURE__ */ React.createElement("div", { id, className: `cf-card ${className}`.trim(), style }, children);
  // className replaces the default bottom margin (e.g. "mb-0" for flush headers).
  // `help` puts a HelpTip beside the heading — the section's explanatory
  // paragraph without the paragraph. (Defined below this line but hoisted, as
  // everything in this bundle's shared scope is.)
  const SectionTitle = ({ children, action, className, help }) => /* @__PURE__ */ React.createElement("div", { className: "cf-row-between " + (className || "mb-12") }, /* @__PURE__ */ React.createElement("div", { className: "section-title-wrap" }, /* @__PURE__ */ React.createElement("h2", { className: "cf-section-title-text" }, children), help && /* @__PURE__ */ React.createElement(HelpTip, { label: typeof children === "string" ? children : "", text: help })), action);
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
  // `inHeader` puts it in the navy header bar beside the logo, which is where
  // it lives on mobile: below 768px the year pills and the search are both
  // hidden, so the header had ~195px of empty navy while this cost a whole
  // row of content underneath it.
  const MobileYearBadge = ({ year, years = [], inHeader = false, onSelect = () => {
  } }) => {
    const [ctx, setCtx] = useState(null);
    const cls = "mobile-year-badge" + (inHeader ? " mobile-year-badge--header" : "");
    if (years.length < 2) {
      return /* @__PURE__ */ React.createElement("div", { className: cls }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 12 }), year);
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: cls + " mobile-year-badge--btn",
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
    const roving = useRovingTabs(".month-pill");
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
      if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
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
    return /* @__PURE__ */ React.createElement("div", { className: "relative" + (noMargin ? "" : " mb-20") }, fade.left && /* @__PURE__ */ React.createElement("div", { className: "month-picker-fade month-picker-fade--left", "aria-hidden": "true" }), fade.right && /* @__PURE__ */ React.createElement("div", { className: "month-picker-fade month-picker-fade--right", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", { ref: stripRef, className: "month-picker", role: "group", "aria-label": "Month", onKeyDown: roving.onKeyDown },/* @__PURE__ */ React.createElement(
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
          tabIndex: isActive ? 0 : -1,
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
    // Backdrop clicks no longer dismiss — only Cancel/the primary action do
    // (matching every other overlay) — so a slightly-off click doesn't lose
    // the user's place. Initial focus lands on Cancel — Enter must not
    // trigger the primary action by default. confirmVariant "danger" (the
    // default) is for destructive actions (delete/reset); "primary" is for
    // a plain yes/no confirmation of a safe, additive action, where a red
    // button would misrepresent risk.
    return /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", role: confirmVariant === "danger" ? "alertdialog" : "dialog", "aria-modal": "true", "aria-label": title }, /* @__PURE__ */ React.createElement("div", { className: "modal-card confirm-dialog-card", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(SheetHandle, { onDismiss: onCancel }), /* @__PURE__ */ React.createElement("div", { className: "confirm-dialog-title" }, title), /* @__PURE__ */ React.createElement("div", { className: "confirm-dialog-message" }, message), /* @__PURE__ */ React.createElement("div", { className: "cf-row cf-gap-10 justify-end" }, /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "cf-btn cf-btn--secondary", autoFocus: true }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      haptic();
      onConfirm();
    }, className: "cf-btn " + (confirmVariant === "danger" ? "cf-btn--danger-solid" : "cf-btn--primary") }, confirmLabel))));
  }
  // Field-level help: a small "?" beside a label that shows its explanation on
  // hover, on keyboard focus, and on tap. It replaces the sentences that used
  // to sit permanently under the fields they described — every one of those
  // was read once and then became furniture, pushing the actual controls apart
  // and making a six-field form read like a page of prose. The words are the
  // same, they're just one gesture away instead of always on screen.
  //
  // Not a `title` attribute: those never open on keyboard focus, are
  // unreachable on touch, and can't be styled. This is a real tooltip —
  // role="tooltip", wired to the button through aria-describedby, so it is
  // announced with the control it belongs to.
  //
  // The bubble is always in the DOM and hidden with CSS rather than
  // conditionally rendered: aria-describedby has to resolve to a live element
  // for screen readers to read it, and they read a referenced element whether
  // or not it is visually shown.
  //
  // `icon` swaps the "?" for another glyph, which is how the weekend-deposit
  // marker (↤) works: it is the same object — an icon that explains itself on
  // hover, focus or tap — and a row indicator with no way to ask what it means
  // is just a mystery character.
  let HELPTIP_SEQ = 0;
  function HelpTip({ text, label = "", align = "start", icon = "?", variant = "" }) {
    const [open, setOpen] = useState(false);
    const [tipId] = useState(() => `helptip-${++HELPTIP_SEQ}`);
    const wrapRef = useRef(null);
    // The bubble is absolutely positioned inside a 15px wrapper and hangs off
    // one edge of it, so a tip on a field near the right of the screen ran
    // straight past the viewport and lost its last words — and on a phone
    // neither edge works: the bubble is up to 272px wide and there is no
    // 272px window either side of a control in the middle of a 320px screen.
    // So rather than picking an edge, measure and slide it: keep the
    // caller's preferred alignment where it fits, and otherwise clamp the
    // offset until both ends of the bubble are inside the viewport.
    // (Closed tips overflowed too — styles.css zero-sizes them so they can't
    // drag the page sideways.)
    const [offset, setOffset] = useState(null);
    useLayoutEffect(() => {
      if (!open) {
        setOffset(null);
        return;
      }
      const place = () => {
        const wrap = wrapRef.current;
        const bubble = wrap && wrap.querySelector(".helptip-bubble");
        if (!bubble) return;
        const r = wrap.getBoundingClientRect();
        const w = bubble.getBoundingClientRect().width;
        const vw = document.documentElement.clientWidth;
        // All offsets are wrapper-relative, matching the CSS they replace:
        // start alignment is left:-6px, end alignment is right:-6px.
        const preferred = align === "end" ? r.width + 6 - w : -6;
        const min = 8 - r.left;
        const max = vw - 8 - w - r.left;
        // max < min only if the bubble is wider than the viewport, which its
        // max-width rules out; Math.max last keeps the left edge on screen.
        setOffset(Math.max(min, Math.min(preferred, max)));
      };
      place();
      window.addEventListener("resize", place);
      return () => window.removeEventListener("resize", place);
    }, [open, align]);
    // A tap opens the bubble; the next tap anywhere else closes it. Without
    // this an opened tip on a touch device has no dismiss gesture at all,
    // since there's no pointer to move away.
    useEffect(() => {
      if (!open) return;
      const away = (e) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
      };
      const esc = (e) => {
        // Stop here rather than letting Escape reach the dialog behind it —
        // closing the whole form because the user dismissed a tooltip would
        // lose everything they had typed.
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      };
      document.addEventListener("pointerdown", away);
      document.addEventListener("keydown", esc, true);
      return () => {
        document.removeEventListener("pointerdown", away);
        document.removeEventListener("keydown", esc, true);
      };
    }, [open]);
    if (!text) return null;
    return /* @__PURE__ */ React.createElement(
      "span",
      { className: "helptip-wrap", ref: wrapRef },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "helptip-btn" + (variant ? " helptip-btn--" + variant : ""),
          "aria-label": label ? `Help: ${label}` : "Help",
          "aria-expanded": open,
          "aria-describedby": tipId,
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          },
          // Rows underneath can own the pointer (the budget grid starts a
          // drag-to-reschedule on pointerdown) — asking what an icon means
          // must never begin dragging the thing it sits on.
          onPointerDown: (e) => e.stopPropagation(),
          // Mouse only: a touch tap also fires pointerenter, and letting it
          // through would leave the bubble open with no way to dismiss it
          // except the click handler that had just closed it.
          onPointerEnter: (e) => {
            if (e.pointerType === "mouse") setOpen(true);
          },
          onPointerLeave: (e) => {
            if (e.pointerType === "mouse") setOpen(false);
          },
          onFocus: () => setOpen(true),
          onBlur: () => setOpen(false)
        },
        icon
      ),
      /* @__PURE__ */ React.createElement(
        "span",
        {
          id: tipId,
          role: "tooltip",
          className: "helptip-bubble" + (align === "end" ? " helptip-bubble--end" : "") + (open ? " is-open" : ""),
          // Inline so it beats both alignment rules; `right` has to be cleared
          // too or an end-aligned bubble ends up constrained from both sides
          // and stretches to fill the gap.
          style: offset === null ? void 0 : { left: offset + "px", right: "auto" }
        },
        text
      )
    );
  }
  // A field label with its help beside it. The tip is a *sibling* of the
  // <label>, never a child: a control inside a label is folded into the field's
  // accessible name, so a help button in there makes the input announce itself
  // as "Actual Amount Paid Help: Actual Amount Paid" — noise a screen-reader
  // user can't skip. The row keeps the two on one line anyway.
  const FieldLabel = ({ htmlFor, children, help, helpLabel = "", helpAlign, className = "field-label" }) => /* @__PURE__ */ React.createElement(
    "div",
    { className: "field-label-row" },
    /* @__PURE__ */ React.createElement("label", { className, htmlFor }, children),
    help && /* @__PURE__ */ React.createElement(HelpTip, { label: helpLabel, text: help, align: helpAlign })
  );
  const Toggle = ({ value, onChange, label }) => /* @__PURE__ */ React.createElement("div", { className: "toggle-row" }, /* @__PURE__ */ React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": value,
    "aria-label": label || void 0,
    onClick: () => onChange(!value),
    className: "cf-switch"
  }, /* @__PURE__ */ React.createElement("div", { className: "cf-switch-knob" })), label && /* @__PURE__ */ React.createElement("span", { onClick: () => onChange(!value), className: "toggle-label" }, label));
