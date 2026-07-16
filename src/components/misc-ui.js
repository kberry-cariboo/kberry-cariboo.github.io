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
          color: tab === it.id ? "var(--navy)" : "var(--textLt)",
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
  function CollapseHeader({ id, title, summary, children }) {
    const [collapsed, setCollapsed] = useState(() => {
      try {
        return localStorage.getItem("cf_collapse_" + id) === "1";
      } catch (e) {
        return false;
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
  function OccurrenceEditModal({ ev, orig, onSave, onCancel, onReset }) {
    const [desc, setDesc] = useState(ev.desc || (orig.desc || ""));
    const [amount, setAmount] = useState(String(ev.amount));
    const [day, setDay] = useState(String(ev.day));
    const maxDay = daysInMonth(ev.month, ev.date ? ev.date.getFullYear() : (/* @__PURE__ */ new Date()).getFullYear());
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
      onSave({ desc, amount: a, day: dNum, notes, attachment });
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
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)" } }, "Edit \u2014 ", MONTHS[ev.month], " ", ev.day), /* @__PURE__ */ React.createElement("button", { onClick: onCancel, style: {
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          color: "var(--textLt)",
          lineHeight: 1,
          padding: "0 0 0 8px"
        } }, "\u2715")),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--amber)", marginBottom: 18 } }, 'Changes apply to this date only. Right-click \u2192 "Edit this entry" to change all occurrences.'),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-desc" }, "Description"), /* @__PURE__ */ React.createElement(
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
        ), err && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--red)", marginTop: 4 } }, err)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-day" }, "Date \u2014 ", MONTHS[ev.month], " (day of month)"), /* @__PURE__ */ React.createElement(
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
        ), dayErr ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--red)", marginTop: 4 } }, dayErr) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--textLt)", marginTop: 4 } }, "1\u2013", maxDay, " \xB7 same as dragging this row to a new date")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: lblCls, htmlFor: "oem-notes" }, "Notes"), /* @__PURE__ */ React.createElement(
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
        ), lightbox && /* @__PURE__ */ React.createElement(ReceiptLightbox, { src: attachment, onClose: () => setLightbox(false) })) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("label", { className: "attach-camera", style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px dashed var(--border)", cursor: "pointer", color: "var(--textMid)", background: "var(--inputBg)" } }, "\u{1F4F7} Take photo", /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", onChange: attachFile, style: { display: "none" } })), /* @__PURE__ */ React.createElement("label", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px dashed var(--border)", cursor: "pointer", color: "var(--textMid)", background: "var(--inputBg)" } }, "\u{1F4CE} From gallery", /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", onChange: attachFile, style: { display: "none" } }))))),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, flexWrap: "wrap" } }, ev.isOverride && onReset && /* @__PURE__ */ React.createElement(
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
        ), /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "cf-btn cf-btn--secondary", style: { padding: "9px 20px" } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: save, className: "cf-btn cf-btn--primary", style: { fontWeight: 700, padding: "9px 24px" } }, "Save"))
      )
    );
  }
