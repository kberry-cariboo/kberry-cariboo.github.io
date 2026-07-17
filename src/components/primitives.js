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
      color,
      border: `1px solid ${color}44`,
      whiteSpace: "nowrap"
    }, style) }, category);
  };
  const Sparkline = ({ data, color = "var(--navy)", height = 32, width = 80 }) => {
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
    const trend = data[data.length - 1] >= data[0];
    const lineColor = trend ? "var(--greenDk)" : "var(--red)";
    return /* @__PURE__ */ React.createElement("svg", { width, height, style: { display: "block", overflow: "visible" } }, /* @__PURE__ */ React.createElement("path", { d: path, fill: "none", stroke: lineColor, strokeWidth: 1.5 }), /* @__PURE__ */ React.createElement("circle", { cx: lastPt[0], cy: lastPt[1], r: 2.5, fill: lineColor }));
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
    return /* @__PURE__ */ React.createElement(React.Fragment, null, form && /* @__PURE__ */ React.createElement("div", { className: "fab-panel cf-quickfab-panel", style: {
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
    } }, /* @__PURE__ */ React.createElement("div", { style: {
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
    )), onImportCSV && menu && !form && /* @__PURE__ */ React.createElement("div", { className: "cf-quickfab-menu", style: {
      position: "fixed",
      bottom: "calc(80px + env(safe-area-inset-bottom))",
      right: 16,
      zIndex: 1500,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 10
    } }, /* @__PURE__ */ React.createElement("div", { onClick: () => setMenu(false), style: { position: "fixed", inset: 0, zIndex: -1 } }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMenu(false);
          onImportCSV();
        },
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "10px 18px",
          borderRadius: 20,
          border: "1px solid var(--border)",
          cursor: "pointer",
          background: "var(--bgCard)",
          color: "var(--text)",
          boxShadow: "var(--shadowMd)",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 8
        }
      },
      /* @__PURE__ */ React.createElement("span", null, "\u2B06"),
      " Import CSV"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: openAdd,
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "10px 18px",
          borderRadius: 20,
          border: "1px solid var(--border)",
          cursor: "pointer",
          background: "var(--bgCard)",
          color: "var(--text)",
          boxShadow: "var(--shadowMd)",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 8
        }
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
        title: fabActive ? "Close (Esc)" : onImportCSV ? "Entry actions" : "Add Entry (N)",
        style: {
          position: "fixed",
          bottom: "calc(20px + env(safe-area-inset-bottom))",
          right: 16,
          zIndex: 1499,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: fabActive ? "var(--red)" : "var(--navy)",
          color: "#fff",
          fontSize: 24,
          fontWeight: 300,
          lineHeight: 1,
          boxShadow: "var(--shadowLg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s,transform 0.2s,opacity 0.2s",
          transform: fabActive ? "rotate(45deg)" : "rotate(0deg)",
          opacity: scrolling && !fabActive ? 0.4 : 1
        }
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
        className: "cf-btn cf-btn--secondary", style: { fontSize: 11, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }
      },
      "\u{1F4CB} Templates ",
      open ? "\u25B2" : "\u25BC"
    ), open && /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      top: "100%",
      left: 0,
      zIndex: 100,
      background: "var(--bgCard)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: 6,
      minWidth: 200,
      boxShadow: "var(--shadowMd)",
      marginTop: 4
    } }, templates.map((t, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        onClick: () => {
          onSelect(t);
          setOpen(false);
        },
        style: {
          display: "block",
          width: "100%",
          textAlign: "left",
          fontSize: 12,
          padding: "8px 10px",
          border: "none",
          cursor: "pointer",
          background: "transparent",
          color: "var(--text)",
          borderRadius: 6
        },
        onMouseEnter: (e) => e.currentTarget.style.background = "var(--stripe)",
        onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
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
  const KpiCard = ({ label, value, color, sub }) => /* @__PURE__ */ React.createElement("div", { style: { background: "var(--bgCard)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textMid)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Inter,sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 20, fontWeight: 700, color: color || "var(--text)", lineHeight: 1 } }, value), sub && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--textLt)", marginTop: 4 } }, sub));
  const MonthPicker = ({ value, onChange, noMargin = false, matchingMonths = null }) => {
    const stripRef = useRef(null);
    useEffect(() => {
      const el = stripRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const btn = el.querySelector('[data-active="true"]');
      if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, [value]);
    return /* @__PURE__ */ React.createElement("div", { ref: stripRef, className: "month-picker", style: { display: "flex", gap: 6, marginBottom: noMargin ? 0 : 20, flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "month-nav-arrow",
        onClick: () => onChange(Math.max(0, value - 1)),
        disabled: value === 0,
        title: "Previous month (\u2190 key)",
        "aria-label": "Previous month",
        style: {
          fontSize: 14,
          padding: "2px 9px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          cursor: value === 0 ? "default" : "pointer",
          background: "transparent",
          color: value === 0 ? "var(--border)" : "var(--textMid)",
          lineHeight: 1.2,
          flexShrink: 0
        }
      },
      "\u2039"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "month-nav-arrow",
        onClick: () => onChange(Math.min(11, value + 1)),
        disabled: value === 11,
        title: "Next month (\u2192 key)",
        "aria-label": "Next month",
        style: {
          fontSize: 14,
          padding: "2px 9px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          cursor: value === 11 ? "default" : "pointer",
          background: "transparent",
          color: value === 11 ? "var(--border)" : "var(--textMid)",
          lineHeight: 1.2,
          flexShrink: 0
        }
      },
      "\u203A"
    ), (() => {
      const cur = (/* @__PURE__ */ new Date()).getMonth();
      return value !== cur && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "month-today-pill",
          onClick: () => onChange(cur),
          title: "Jump to current month",
          "aria-label": "Jump to current month",
          style: {
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: 20,
            border: "1.5px dashed var(--navy)",
            cursor: "pointer",
            flexShrink: 0,
            background: "transparent",
            color: "var(--navy)"
          }
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
          "data-active": isActive ? "true" : "false",
          style: {
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: 20,
            border: "none",
            cursor: "pointer",
            position: "relative",
            flexShrink: 0,
            background: isActive ? "var(--navy)" : hasMatch ? "var(--amberLt)" : "var(--border)",
            color: isActive ? "#fff" : hasMatch ? "var(--amber)" : "var(--textMid)",
            outline: hasMatch && !isActive ? "2px solid var(--amber)" : "none"
          }
        },
        m,
        hasMatch && !isActive && /* @__PURE__ */ React.createElement("span", { style: {
          position: "absolute",
          top: -3,
          right: -3,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--amber)",
          border: "2px solid var(--bgCard)"
        } })
      );
    }));
  };
  const ChartToggle = ({ options, value, onChange }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2 } }, options.map((o) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: o.id,
      onClick: () => onChange(o.id),
      title: o.label,
      "aria-label": o.label,
      "aria-pressed": value === o.id,
      style: {
        fontSize: 10,
        fontWeight: 700,
        minWidth: 34,
        minHeight: 34,
        padding: "2px 8px",
        borderRadius: 5,
        border: "none",
        cursor: "pointer",
        letterSpacing: "0.04em",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: value === o.id ? "var(--navy)" : "var(--border)",
        color: value === o.id ? "#fff" : "var(--textMid)"
      }
    },
    o.icon || o.label
  )));
  const PillToggle = ({ options, value, onChange, gap = 6, fontSize = 12, fontWeight = 600, padding = "6px 14px", borderRadius = 20 }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap, flexWrap: "wrap", alignItems: "center" } }, options.map((o) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: o.id,
      onClick: () => onChange(o.id),
      style: {
        fontSize,
        fontWeight,
        padding,
        borderRadius,
        border: "none",
        cursor: "pointer",
        background: value === o.id ? "var(--navy)" : "var(--border)",
        color: value === o.id ? "#fff" : "var(--textMid)"
      }
    },
    o.label
  )));
  const ChartTip = ({ active, payload, label }) => {
    if (!active || !(payload == null ? void 0 : payload.length)) return null;
    const total = payload.reduce((s, p) => s + Math.abs(p.value || 0), 0);
    return /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--navy)",
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
  const FieldError = ({ msg }) => msg ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--red)", marginTop: 4 } }, msg) : null;
  function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Delete" }) {
    return /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2e3, display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "modal-card", style: { padding: "24px", width: "min(400px,calc(100vw - 32px))" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 12 } }, title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "var(--textMid)", marginBottom: 24, lineHeight: 1.6 } }, message), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "cf-btn cf-btn--secondary", style: { fontSize: 13, padding: "8px 18px" } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      haptic();
      onConfirm();
    }, style: { fontSize: 13, fontWeight: 700, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--red)", color: "#fff" } }, confirmLabel))));
  }
  const Toggle = ({ value, onChange, label }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, userSelect: "none" } }, /* @__PURE__ */ React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": value,
    "aria-label": label || void 0,
    onClick: () => onChange(!value),
    style: {
      position: "relative",
      width: 44,
      height: 24,
      borderRadius: 12,
      border: "none",
      padding: 0,
      cursor: "pointer",
      background: value ? "var(--navy)" : "var(--border)",
      transition: "background 0.2s",
      flexShrink: 0
    }
  }, /* @__PURE__ */ React.createElement("div", { style: {
    position: "absolute",
    top: 3,
    left: value ? 23 : 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    background: "#fff",
    transition: "left 0.2s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
  } })), label && /* @__PURE__ */ React.createElement("span", { onClick: () => onChange(!value), style: { fontSize: 13, color: "var(--text)", fontWeight: 600, cursor: "pointer" } }, label));
