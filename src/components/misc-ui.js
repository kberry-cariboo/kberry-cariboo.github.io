  function ReceiptLightbox({ src, onClose }) {
    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [onClose]);
    if (!src) return null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: onClose,
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 9500,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          touchAction: "pinch-zoom",
          cursor: "zoom-out"
        }
      },
      /* @__PURE__ */ React.createElement(
        "img",
        {
          src,
          alt: "Receipt",
          style: {
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: 10,
            boxShadow: "var(--shadowXl)"
          }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: onClose,
          "aria-label": "Close",
          style: {
            position: "fixed",
            top: "calc(14px + env(safe-area-inset-top))",
            right: 16,
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: 18
          }
        },
        "\u2715"
      )
    );
  }
  function Icon({ name, size = 20, strokeWidth = 2, style }) {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", style, "aria-hidden": "true", focusable: "false" };
    switch (name) {
      case "home":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M4 11.5 12 4l8 7.5" }), /* @__PURE__ */ React.createElement("path", { d: "M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" }), /* @__PURE__ */ React.createElement("path", { d: "M10 20v-6h4v6" }));
      case "calendar":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 3, y: 5, width: 18, height: 16, rx: 2 }), /* @__PURE__ */ React.createElement("line", { x1: 3, y1: 10, x2: 21, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 8, y1: 3, x2: 8, y2: 7 }), /* @__PURE__ */ React.createElement("line", { x1: 16, y1: 3, x2: 16, y2: 7 }));
      case "target":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 8 }), /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 4 }), /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 0.6, fill: "currentColor", stroke: "none" }));
      case "sparkle":
        return /* @__PURE__ */ React.createElement("svg", __spreadProps(__spreadValues({}, common), { fill: "currentColor", stroke: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" }));
      case "settings":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 3 }), [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => /* @__PURE__ */ React.createElement("line", { key: deg, x1: 12, y1: 3.3, x2: 12, y2: 6, transform: `rotate(${deg} 12 12)` })));
      case "search":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 11, cy: 11, r: 7 }), /* @__PURE__ */ React.createElement("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 }));
      case "bell":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" }), /* @__PURE__ */ React.createElement("path", { d: "M10.3 19.5a2 2 0 0 0 3.4 0" }));
      case "grid":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 3, y: 3, width: 7, height: 7, rx: 1 }), /* @__PURE__ */ React.createElement("rect", { x: 14, y: 3, width: 7, height: 7, rx: 1 }), /* @__PURE__ */ React.createElement("rect", { x: 3, y: 14, width: 7, height: 7, rx: 1 }), /* @__PURE__ */ React.createElement("rect", { x: 14, y: 14, width: 7, height: 7, rx: 1 }));
      case "day":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 4, y: 4, width: 16, height: 16, rx: 2 }), /* @__PURE__ */ React.createElement("line", { x1: 4, y1: 9.5, x2: 20, y2: 9.5 }), /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 15, r: 1.6, fill: "currentColor", stroke: "none" }));
      case "scale":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("line", { x1: 6, y1: 20, x2: 6, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 12, y1: 20, x2: 12, y2: 4 }), /* @__PURE__ */ React.createElement("line", { x1: 18, y1: 20, x2: 18, y2: 14 }));
      case "trending-up":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("polyline", { points: "3,17 9,11 13,15 21,7" }), /* @__PURE__ */ React.createElement("polyline", { points: "15,7 21,7 21,13" }));
      case "file-list":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" }), /* @__PURE__ */ React.createElement("line", { x1: 8, y1: 13, x2: 16, y2: 13 }), /* @__PURE__ */ React.createElement("line", { x1: 8, y1: 17, x2: 16, y2: 17 }));
      case "chart-bar":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("line", { x1: 6, y1: 20, x2: 6, y2: 12 }), /* @__PURE__ */ React.createElement("line", { x1: 12, y1: 20, x2: 12, y2: 5 }), /* @__PURE__ */ React.createElement("line", { x1: 18, y1: 20, x2: 18, y2: 9 }));
      case "chart-grouped":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("line", { x1: 5, y1: 20, x2: 5, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 9, y1: 20, x2: 9, y2: 14 }), /* @__PURE__ */ React.createElement("line", { x1: 15, y1: 20, x2: 15, y2: 6 }), /* @__PURE__ */ React.createElement("line", { x1: 19, y1: 20, x2: 19, y2: 12 }));
      case "chart-stacked":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 5, y: 11, width: 5, height: 9 }), /* @__PURE__ */ React.createElement("rect", { x: 5, y: 5, width: 5, height: 6 }), /* @__PURE__ */ React.createElement("rect", { x: 14, y: 13, width: 5, height: 7 }), /* @__PURE__ */ React.createElement("rect", { x: 14, y: 8, width: 5, height: 5 }));
      case "chart-line":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("polyline", { points: "4,17 9,11 14,14 20,6" }));
      case "chart-area":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M4 19V13l5-5 5 3 6-6v14z", fill: "currentColor", fillOpacity: 0.25 }), /* @__PURE__ */ React.createElement("polyline", { points: "4,13 9,8 14,11 20,5" }));
      case "chart-pie":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 8 }), /* @__PURE__ */ React.createElement("path", { d: "M12 4v8l6 5" }));
      case "chart-down":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("polyline", { points: "3,7 9,13 13,9 21,17" }), /* @__PURE__ */ React.createElement("polyline", { points: "15,17 21,17 21,11" }));
      case "user":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 8, r: 4 }), /* @__PURE__ */ React.createElement("path", { d: "M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" }));
      case "users":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 9, cy: 8, r: 3.2 }), /* @__PURE__ */ React.createElement("path", { d: "M2.5 21c0-3.9 2.9-6 6.5-6s6.5 2.1 6.5 6" }), /* @__PURE__ */ React.createElement("path", { d: "M16 8.5a2.7 2.7 0 1 0 0-5.4" }), /* @__PURE__ */ React.createElement("path", { d: "M17.5 15c2.6.4 4 2 4 6" }));
      case "key":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 7, cy: 17, r: 4 }), /* @__PURE__ */ React.createElement("path", { d: "M9.5 14.5 20 4" }), /* @__PURE__ */ React.createElement("path", { d: "M17 7l3 3" }), /* @__PURE__ */ React.createElement("path", { d: "M14 10l2 2" }));
      case "lock":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 5, y: 11, width: 14, height: 10, rx: 2 }), /* @__PURE__ */ React.createElement("path", { d: "M8 11V7a4 4 0 0 1 8 0v4" }));
      case "keyboard":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 2, y: 6, width: 20, height: 13, rx: 2 }), /* @__PURE__ */ React.createElement("line", { x1: 6, y1: 10, x2: 6.01, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 10, y1: 10, x2: 10.01, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 14, y1: 10, x2: 14.01, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 18, y1: 10, x2: 18.01, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 7, y1: 15, x2: 17, y2: 15 }));
      case "download":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M12 3v12" }), /* @__PURE__ */ React.createElement("polyline", { points: "7,10 12,15 17,10" }), /* @__PURE__ */ React.createElement("line", { x1: 5, y1: 21, x2: 19, y2: 21 }));
      case "upload":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M12 15V3" }), /* @__PURE__ */ React.createElement("polyline", { points: "7,8 12,3 17,8" }), /* @__PURE__ */ React.createElement("line", { x1: 5, y1: 21, x2: 19, y2: 21 }));
      case "log-out":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" }), /* @__PURE__ */ React.createElement("polyline", { points: "16,17 21,12 16,7" }), /* @__PURE__ */ React.createElement("line", { x1: 21, y1: 12, x2: 9, y2: 12 }));
      case "clipboard":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 6, y: 4, width: 12, height: 16, rx: 2 }), /* @__PURE__ */ React.createElement("rect", { x: 9, y: 2, width: 6, height: 4, rx: 1 }), /* @__PURE__ */ React.createElement("line", { x1: 9, y1: 11, x2: 15, y2: 11 }), /* @__PURE__ */ React.createElement("line", { x1: 9, y1: 15, x2: 15, y2: 15 }));
      case "clock":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 9 }), /* @__PURE__ */ React.createElement("polyline", { points: "12,7 12,12 15.5,14" }));
      case "trash":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" }), /* @__PURE__ */ React.createElement("path", { d: "M19 7l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" }), /* @__PURE__ */ React.createElement("line", { x1: 10, y1: 11, x2: 10, y2: 17 }), /* @__PURE__ */ React.createElement("line", { x1: 14, y1: 11, x2: 14, y2: 17 }));
      case "camera":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" }), /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 14, r: 3.5 }));
      case "paperclip":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M20.5 12.5 12.9 20a4.2 4.2 0 0 1-6-6l7.6-7.5a2.8 2.8 0 0 1 4 4L11 18a1.4 1.4 0 0 1-2-2l6.5-6.4" }));
      case "eye":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" }), /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 3 }));
      case "eye-off":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" }), /* @__PURE__ */ React.createElement("path", { d: "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" }), /* @__PURE__ */ React.createElement("path", { d: "M14.12 14.12a3 3 0 1 1-4.24-4.24" }), /* @__PURE__ */ React.createElement("line", { x1: 1, y1: 1, x2: 23, y2: 23 }));
      case "alert-triangle":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M12 3 22 20H2z" }), /* @__PURE__ */ React.createElement("line", { x1: 12, y1: 9, x2: 12, y2: 13.5 }), /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 16.5, r: 0.6, fill: "currentColor", stroke: "none" }));
      case "check-circle":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 9 }), /* @__PURE__ */ React.createElement("polyline", { points: "8,12.5 11,15.5 16,9" }));
      case "printer":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M6 9V3h12v6" }), /* @__PURE__ */ React.createElement("rect", { x: 4, y: 9, width: 16, height: 8, rx: 1 }), /* @__PURE__ */ React.createElement("rect", { x: 8, y: 13, width: 8, height: 6 }));
      case "save":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M5 3h11l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" }), /* @__PURE__ */ React.createElement("path", { d: "M8 3v6h8V3" }), /* @__PURE__ */ React.createElement("path", { d: "M8 21v-7h8v7" }));
      case "arrow-right":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("line", { x1: 4, y1: 12, x2: 20, y2: 12 }), /* @__PURE__ */ React.createElement("polyline", { points: "13,5 20,12 13,19" }));
      case "party":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M4 21 14 9" }), /* @__PURE__ */ React.createElement("path", { d: "M15 3l1.5 2.3L19 4l-.7 2.6L21 8l-2.4.8L18 11l-2.1-1.5L14 11l.3-2.6L12 7l2.5-.8L15 3z" }), /* @__PURE__ */ React.createElement("circle", { cx: 5.5, cy: 15, r: 1, fill: "currentColor", stroke: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: 9, cy: 19.5, r: 1, fill: "currentColor", stroke: "none" }));
      case "mountain":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("path", { d: "M3 20 9.5 7l4 6.5L16 10l5 10z" }));
      case "snowflake":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("line", { x1: 12, y1: 2, x2: 12, y2: 22 }), /* @__PURE__ */ React.createElement("line", { x1: 4.5, y1: 6.5, x2: 19.5, y2: 17.5 }), /* @__PURE__ */ React.createElement("line", { x1: 4.5, y1: 17.5, x2: 19.5, y2: 6.5 }));
      case "banknote":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 2, y: 6, width: 20, height: 12, rx: 2 }), /* @__PURE__ */ React.createElement("circle", { cx: 12, cy: 12, r: 3 }), /* @__PURE__ */ React.createElement("line", { x1: 6, y1: 9, x2: 6.01, y2: 9 }), /* @__PURE__ */ React.createElement("line", { x1: 18, y1: 15, x2: 18.01, y2: 15 }));
      case "credit-card":
        return /* @__PURE__ */ React.createElement("svg", common, /* @__PURE__ */ React.createElement("rect", { x: 2, y: 5, width: 20, height: 14, rx: 2 }), /* @__PURE__ */ React.createElement("line", { x1: 2, y1: 10, x2: 22, y2: 10 }), /* @__PURE__ */ React.createElement("line", { x1: 6, y1: 15, x2: 10, y2: 15 }));
      default:
        return null;
    }
  }
  function BottomNav({ tab, setTab, lowAlert = false }) {
    const items = [
      { id: "dashboard", icon: "home", label: "Home" },
      { id: "budget", icon: "calendar", label: "Budget" },
      { id: "plan", icon: "target", label: "Plan" },
      { id: "ai", icon: "sparkle", label: "AI" },
      { id: "settings", icon: "settings", label: "Settings" }
    ];
    return /* @__PURE__ */ React.createElement("nav", { className: "cf-bottomnav", "aria-label": "Primary" }, items.map((it) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: it.id,
        onClick: () => {
          haptic();
          setTab(it.id);
        },
        "aria-label": it.label,
        "aria-current": tab === it.id ? "page" : void 0,
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          padding: "7px 0 4px",
          border: "none",
          cursor: "pointer",
          background: "transparent",
          color: tab === it.id ? "var(--text)" : "var(--textLt)",
          fontSize: 9,
          fontWeight: tab === it.id ? 700 : 500
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: 17,
        lineHeight: 1,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 24,
        borderRadius: 12,
        background: tab === it.id ? "var(--accentLt)" : "transparent",
        transition: "background 0.15s"
      } }, /* @__PURE__ */ React.createElement(Icon, { name: it.icon, size: 18 }), it.id === "dashboard" && lowAlert && /* @__PURE__ */ React.createElement("span", { style: {
        position: "absolute",
        top: -2,
        right: -6,
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--amber)",
        border: "2px solid var(--bgCard)"
      } })),
      it.label
    )));
  }
  function CollapseHeader({ id, title, summary, children, defaultCollapsed = false }) {
    const [collapsed, setCollapsed] = useState(() => {
      try {
        const stored = localStorage.getItem("cf_collapse_" + id);
        return stored === null ? defaultCollapsed : stored === "1";
      } catch (e) {
        return defaultCollapsed;
      }
    });
    const toggle = () => {
      setCollapsed((v) => {
        const n = !v;
        try {
          localStorage.setItem("cf_collapse_" + id, n ? "1" : "0");
        } catch (e) {
        }
        return n;
      });
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: toggle,
        "aria-expanded": !collapsed,
        className: "collapse-header-btn",
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          width: "100%",
          border: "none",
          background: "transparent",
          padding: 0,
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          userSelect: "none",
          marginBottom: collapsed ? 0 : 2
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 } }, /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: 10,
        color: "var(--textLt)",
        transition: "transform 0.15s ease",
        transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        display: "inline-block"
      } }, "\u25BC"), title),
      collapsed && summary && /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "var(--textLt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, summary)
    ), !collapsed && children);
  }
  function OccurrenceEditModal({ ev, orig, onSave, onCancel, onReset, onDelete }) {
    const [desc, setDesc] = useState(ev.desc || (orig.desc || ""));
    const [amount, setAmount] = useState(String(ev.amount));
    const [day, setDay] = useState(String(ev.day));
    const [month, setMonth] = useState(String(ev.month));
    const evYear = ev.date ? ev.date.getFullYear() : (/* @__PURE__ */ new Date()).getFullYear();
    const monthNum = parseInt(month, 10);
    const maxDay = daysInMonth(isNaN(monthNum) ? ev.month : monthNum, evYear);
    const [notes, setNotes] = useState(ev.notes || (orig.notes || ""));
    const [attachment, setAttachment] = useState(ev.attachment || null);
    const [err, setErr] = useState("");
    const [dayErr, setDayErr] = useState("");
    const attachFile = (e) => {
      compressReceiptImage(e.target.files[0], (b64) => {
        if (b64) setAttachment(b64);
      });
      e.target.value = "";
    };
    const [lightbox, setLightbox] = useState(false);
    const inpCls = (isErr) => "field-input" + (isErr ? " field-error" : "");
    const lblCls = "field-label";
    const save = () => {
      const a = parseFloat(amount);
      if (isNaN(a) || a < 0) {
        setErr("Enter a valid amount.");
        return;
      }
      const dNum = parseInt(day, 10);
      if (isNaN(dNum) || dNum < 1 || dNum > maxDay) {
        setDayErr(`Enter a day between 1 and ${maxDay}.`);
        return;
      }
      setErr("");
      setDayErr("");
      onSave({ desc, amount: a, month: isNaN(monthNum) ? ev.month : monthNum, day: dNum, notes, attachment });
    };
    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [onCancel]);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Edit occurrence",
        onClick: (e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) onCancel();
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-card",
          onClick: (e) => e.stopPropagation(),
          style: { padding: "24px 24px 20px", width: "min(460px,calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto" }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)" } }, "Edit \u2014 ", MONTHS[ev.month], " ", ev.day), /* @__PURE__ */ React.createElement("button", { onClick: onCancel, "aria-label": "Close", className: "cf-close-x" }, "\u2715")),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--amber)", marginBottom: 18 } }, 'Changes apply to this date only. Right-click \u2192 "Edit this entry" to change all occurrences.'),
        /* @__PURE__ */ React.createElement("div", { className: "cf-col cf-gap-14" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-desc" }, "Description"), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "oem-desc",
            autoFocus: true,
            className: inpCls(false),
            value: desc,
            onChange: (e) => setDesc(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") save();
            }
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-amount" }, "Amount $"), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "oem-amount",
            type: "number",
            inputMode: "decimal",
            step: "0.01",
            className: inpCls(!!err),
            value: amount,
            onChange: (e) => {
              setAmount(e.target.value);
              setErr("");
            },
            onKeyDown: (e) => {
              if (e.key === "Enter") save();
            }
          }
        ), err && /* @__PURE__ */ React.createElement("div", { className: "field-error-text" }, err)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 55%" } }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-month" }, "Month"), /* @__PURE__ */ React.createElement(
          "select",
          {
            id: "oem-month",
            className: "field-input",
            value: month,
            onChange: (e) => {
              setMonth(e.target.value);
              setDayErr("");
            }
          },
          MONTHS.map((mn, mi) => /* @__PURE__ */ React.createElement("option", { key: mn, value: String(mi) }, mn, " ", evYear))
        )), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 45%" } }, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-day" }, "Day"), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "oem-day",
            type: "number",
            inputMode: "numeric",
            min: 1,
            max: maxDay,
            step: "1",
            className: inpCls(!!dayErr),
            value: day,
            onChange: (e) => {
              setDay(e.target.value);
              setDayErr("");
            },
            onKeyDown: (e) => {
              if (e.key === "Enter") save();
            }
          }
        ))), dayErr ? /* @__PURE__ */ React.createElement("div", { className: "field-error-text" }, dayErr) : /* @__PURE__ */ React.createElement("div", { className: "field-hint-text" }, "1\u2013", maxDay, monthNum !== ev.month ? ` \xB7 moves this occurrence to ${MONTHS[isNaN(monthNum) ? ev.month : monthNum]}` : " \xB7 same as dragging this row to a new date")),/* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-notes" }, "Notes"), /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "oem-notes",
            className: inpCls(false),
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") save();
            }
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls }, "Receipt / Photo"), attachment ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: attachment,
            alt: "attachment",
            style: { height: 56, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" },
            onClick: () => setLightbox(true)
          }
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setAttachment(null),
            style: { fontSize: 12, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--red)", cursor: "pointer", background: "transparent", color: "var(--red)" }
          },
          "Remove"
        ), lightbox && /* @__PURE__ */ React.createElement(ReceiptLightbox, { src: attachment, onClose: () => setLightbox(false) })) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("label", { className: "attach-camera", style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px dashed var(--border)", cursor: "pointer", color: "var(--textMid)", background: "var(--inputBg)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "camera", size: 14 }), "Take photo", /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", onChange: attachFile, className: "hidden" })), /* @__PURE__ */ React.createElement("label", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px dashed var(--border)", cursor: "pointer", color: "var(--textMid)", background: "var(--inputBg)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "paperclip", size: 14 }), "From gallery", /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", onChange: attachFile, className: "hidden" }))))),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, flexWrap: "wrap" } }, onDelete && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onDelete,
            className: "cf-btn cf-btn--danger",
            style: { padding: "9px 16px", marginRight: ev.isOverride && onReset ? 0 : "auto" }
          },
          "Delete…"
        ), ev.isOverride && onReset && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onReset,
            style: {
              fontSize: 13,
              padding: "9px 16px",
              borderRadius: 8,
              border: "1px solid var(--amber)",
              cursor: "pointer",
              background: "transparent",
              color: "var(--amber)",
              marginRight: "auto"
            }
          },
          "\u21BA Reset entry"
        ), /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "cf-btn cf-btn--secondary" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: save, className: "cf-btn cf-btn--primary", style: { fontWeight: 700, padding: "9px 24px" } }, "Save"))
      )
    );
  }
  function HouseholdOnboardingView({ email, createHousehold, joinHousehold, signOut }) {
    const [mode, setMode] = useState("create");
    const [fullName, setFullName] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const submit = async () => {
      if (!fullName.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (mode === "join" && !code.trim()) {
        setError("Please enter the invite code you were given.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        if (mode === "create") await createHousehold(fullName.trim());
        else await joinHousehold(code.trim(), fullName.trim());
      } catch (err) {
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: {
      minHeight: "100vh",
      background: "var(--headerBg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "Inter,sans-serif"
    } }, /* @__PURE__ */ React.createElement("div", { style: { width: "100%", maxWidth: 420 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 28 } }, /* @__PURE__ */ React.createElement("img", { src: LOGO_SRC, alt: "CashFlow", style: { height: 48, marginBottom: 10 } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 } }, "Signed in as ", email)), /* @__PURE__ */ React.createElement("div", { style: {
      background: "var(--bgCard)",
      borderRadius: 16,
      padding: 32,
      boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      border: "1px solid var(--border)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 8, textAlign: "center" } }, "One more step"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--textMid)", textAlign: "center", marginBottom: 20, lineHeight: 1.5 } }, "Create a new household budget, or join one a family member already set up."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("create");
          setError("");
        },
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: mode === "create" ? "var(--stripe)" : "transparent",
          color: mode === "create" ? "var(--text)" : "var(--textLt)"
        }
      },
      "Create household"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMode("join");
          setError("");
        },
        style: {
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: mode === "join" ? "var(--stripe)" : "transparent",
          color: mode === "join" ? "var(--text)" : "var(--textLt)"
        }
      },
      "Join with invite code"
    )), /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "hh-name" }, "Your name"), /* @__PURE__ */ React.createElement("input", {
      id: "hh-name",
      type: "text",
      className: "field-input field-input--lg",
      value: fullName,
      onChange: (e) => {
        setFullName(e.target.value);
        setError("");
      },
      placeholder: "e.g. Ken"
    })), mode === "join" && /* @__PURE__ */ React.createElement("div", { className: "mb-12" }, /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "hh-code" }, "Invite code"), /* @__PURE__ */ React.createElement("input", {
      id: "hh-code",
      type: "text",
      className: "field-input field-input--lg field-input--mono",
      value: code,
      onChange: (e) => {
        setCode(e.target.value.toUpperCase());
        setError("");
      },
      placeholder: "e.g. 4F9B2C1D",
      style: { letterSpacing: "0.05em" }
    })), error && /* @__PURE__ */ React.createElement("div", { className: "cf-error-banner", role: "alert", style: { marginTop: 8, marginBottom: 8 } }, error), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: submit,
        disabled: loading,
        style: {
          width: "100%",
          fontFamily: "Inter,sans-serif",
          fontSize: 15,
          fontWeight: 700,
          padding: "12px",
          borderRadius: 8,
          border: "none",
          cursor: loading ? "wait" : "pointer",
          background: "var(--primary)",
          color: "#fff",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 0.15s",
          marginTop: 8
        }
      },
      loading ? "One moment…" : mode === "create" ? "Create household" : "Join household"
    )), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 20 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: signOut,
        style: { fontSize: 12, color: "rgba(255,255,255,0.4)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }
      },
      "Sign out"
    ))));
  }
