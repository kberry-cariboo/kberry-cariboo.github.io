import { useContext, useEffect, useMemo, useState } from "../lib/runtime.js";
import { centsToDollars, dollarsToCents } from "../lib/migrate.js";
import { daysInMonth, depositShiftNote, humanShortDate, parseDate, todayStr } from "../lib/dates.js";
import { fmt, memberName } from "../lib/format.js";
import { HouseholdContext, LOGO_SRC, MONTHS, autoFocusOnDesktop, compressReceiptImage, haptic, prefersReducedMotion } from "../lib/app-data.js";
import { aiCanRun, aiErrorMessage, aiExtractReceipt } from "../lib/ai.js";
import { FieldError, FieldLabel, HelpTip, SheetHandle } from "./primitives.js";
  // Shown only when this device has edits the server never received *and* the
  // cloud copy also changed since. Both outcomes lose somebody's work, so the
  // app refuses to guess — it stops syncing and asks. Local state is left
  // exactly as-is until a button is pressed, so dismissing by accident can't
  // destroy anything (there is deliberately no dismiss).
  export function SyncDivergenceModal({ divergence, onKeepLocal, onUseCloud }) {
    const [busy, setBusy] = useState(false);
    if (!divergence) return null;
    const when = (() => {
      try {
        const iso = localStorage.getItem("cf_unsaved_since");
        return iso ? new Date(iso).toLocaleString() : null;
      } catch (e) {
        return null;
      }
    })();
    const cloudWhen = (() => {
      try {
        return divergence.payload && divergence.payload.savedAt
          ? new Date(divergence.payload.savedAt).toLocaleString()
          : null;
      } catch (e) {
        return null;
      }
    })();
    const run = (fn) => async () => {
      setBusy(true);
      try {
        await fn();
      } finally {
        setBusy(false);
      }
    };
    return <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sync-divergence-title"
    >
      <div className="modal-card profile-modal-card">
        <div id="sync-divergence-title" className="settings-header-title mb-8">
          Two versions of your budget
        </div>
        <div className="txm mb-14">
          This device has changes that were never saved to the cloud
          {when ? ` (since ${when})` : ""}
          , and the cloud copy has changed too
          {cloudWhen ? ` (last saved ${cloudWhen})` : ""}
          . Keeping one means losing the other, so pick which to keep.
        </div>
        <div className="cf-row cf-gap-12 cf-wrap">
          <button onClick={run(onKeepLocal)} disabled={busy} className="cf-btn cf-btn--primary cf-btn--md">
            {busy ? "Working\u2026" : "Keep this device's version"}
          </button>
          <button onClick={run(onUseCloud)} disabled={busy} className="cf-btn cf-btn--secondary cf-btn--md">
            Use the cloud version
          </button>
        </div>
        <div className="txl mt-14">
          {"Not sure? Export a backup first from Settings \u2192 Data Backup & Restore \u2014 that saves this device's current version to a file either way."}
        </div>
      </div>
    </div>;
  }

  export function ReceiptLightbox({ src, onClose }) {
    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [onClose]);
    if (!src) return null;
    return <div onClick={onClose} className="receipt-lightbox">
      <img src={src} alt="Receipt" className="receipt-lightbox-img" />
      <button onClick={onClose} aria-label="Close" className="receipt-lightbox-close">✕</button>
    </div>;
  }
  // The account filter. Only rendered once a household has more than one
  // account — with a single account "All accounts" and "Chequing" are the same
  // set, and a control whose two options do the same thing is worse than no
  // control.
  //
  // Combined stands first and is the default. Every view behind this reads a
  // flow and an opening balance, so narrowing is a matter of handing them a
  // smaller pair; none of them knows this exists.
  export function AccountFilter({ accounts = [], value = "", onChange = () => {
  } }) {
    if (!Array.isArray(accounts) || accounts.length < 2) return null;
    return <div className="account-filter" data-noprint={true}>
      <label htmlFor="account-filter-select" className="account-filter-label">Account</label>
      <select
        id="account-filter-select"
        className="account-filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All accounts</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </div>;
  }
  export function Icon({ name, size = 20, strokeWidth = 2, style }) {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", style, "aria-hidden": "true", focusable: "false" };
    switch (name) {
      case "plus":
        return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
      // Points down. A disclosure that opens upward rotates it rather than
      // swapping in a second glyph, so the two states are the same shape.
      case "chevron-down":
        return <svg {...common}><path d="M6 9.5 12 15.5 18 9.5" /></svg>;
      case "home":
        return <svg {...common}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
          <path d="M10 20v-6h4v6" />
        </svg>;
      case "calendar":
        return <svg {...common}>
          <rect x={3} y={5} width={18} height={16} rx={2} />
          <line x1={3} y1={10} x2={21} y2={10} />
          <line x1={8} y1={3} x2={8} y2={7} />
          <line x1={16} y1={3} x2={16} y2={7} />
        </svg>;
      case "target":
        return <svg {...common}>
          <circle cx={12} cy={12} r={8} />
          <circle cx={12} cy={12} r={4} />
          <circle cx={12} cy={12} r={0.6} fill="currentColor" stroke="none" />
        </svg>;
      case "sparkle":
        return <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
        </svg>;
      case "settings":
        return <svg {...common}>
          <circle cx={12} cy={12} r={3} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => <line
            key={deg}
            x1={12}
            y1={3.3}
            x2={12}
            y2={6}
            transform={`rotate(${deg} 12 12)`}
          />)}
        </svg>;
      case "search":
        return <svg {...common}>
          <circle cx={11} cy={11} r={7} />
          <line x1={21} y1={21} x2={16.65} y2={16.65} />
        </svg>;
      case "bell":
        return <svg {...common}>
          <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
          <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
        </svg>;
      case "grid":
        return <svg {...common}>
          <rect x={3} y={3} width={7} height={7} rx={1} />
          <rect x={14} y={3} width={7} height={7} rx={1} />
          <rect x={3} y={14} width={7} height={7} rx={1} />
          <rect x={14} y={14} width={7} height={7} rx={1} />
        </svg>;
      case "day":
        return <svg {...common}>
          <rect x={4} y={4} width={16} height={16} rx={2} />
          <line x1={4} y1={9.5} x2={20} y2={9.5} />
          <circle cx={12} cy={15} r={1.6} fill="currentColor" stroke="none" />
        </svg>;
      case "scale":
        return <svg {...common}>
          <line x1={6} y1={20} x2={6} y2={10} />
          <line x1={12} y1={20} x2={12} y2={4} />
          <line x1={18} y1={20} x2={18} y2={14} />
        </svg>;
      case "trending-up":
        return <svg {...common}>
          <polyline points="3,17 9,11 13,15 21,7" />
          <polyline points="15,7 21,7 21,13" />
        </svg>;
      case "file-list":
        return <svg {...common}>
          <path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
          <line x1={8} y1={13} x2={16} y2={13} />
          <line x1={8} y1={17} x2={16} y2={17} />
        </svg>;
      case "chart-bar":
        return <svg {...common}>
          <line x1={6} y1={20} x2={6} y2={12} />
          <line x1={12} y1={20} x2={12} y2={5} />
          <line x1={18} y1={20} x2={18} y2={9} />
        </svg>;
      case "chart-grouped":
        return <svg {...common}>
          <line x1={5} y1={20} x2={5} y2={10} />
          <line x1={9} y1={20} x2={9} y2={14} />
          <line x1={15} y1={20} x2={15} y2={6} />
          <line x1={19} y1={20} x2={19} y2={12} />
        </svg>;
      case "chart-stacked":
        return <svg {...common}>
          <rect x={5} y={11} width={5} height={9} />
          <rect x={5} y={5} width={5} height={6} />
          <rect x={14} y={13} width={5} height={7} />
          <rect x={14} y={8} width={5} height={5} />
        </svg>;
      case "chart-line":
        return <svg {...common}><polyline points="4,17 9,11 14,14 20,6" /></svg>;
      case "chart-area":
        return <svg {...common}>
          <path d="M4 19V13l5-5 5 3 6-6v14z" fill="currentColor" fillOpacity={0.25} />
          <polyline points="4,13 9,8 14,11 20,5" />
        </svg>;
      case "chart-pie":
        return <svg {...common}><circle cx={12} cy={12} r={8} /><path d="M12 4v8l6 5" /></svg>;
      case "chart-down":
        return <svg {...common}>
          <polyline points="3,7 9,13 13,9 21,17" />
          <polyline points="15,17 21,17 21,11" />
        </svg>;
      case "user":
        return <svg {...common}>
          <circle cx={12} cy={8} r={4} />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>;
      case "users":
        return <svg {...common}>
          <circle cx={9} cy={8} r={3.2} />
          <path d="M2.5 21c0-3.9 2.9-6 6.5-6s6.5 2.1 6.5 6" />
          <path d="M16 8.5a2.7 2.7 0 1 0 0-5.4" />
          <path d="M17.5 15c2.6.4 4 2 4 6" />
        </svg>;
      case "key":
        return <svg {...common}>
          <circle cx={7} cy={17} r={4} />
          <path d="M9.5 14.5 20 4" />
          <path d="M17 7l3 3" />
          <path d="M14 10l2 2" />
        </svg>;
      case "lock":
        return <svg {...common}>
          <rect x={5} y={11} width={14} height={10} rx={2} />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>;
      case "keyboard":
        return <svg {...common}>
          <rect x={2} y={6} width={20} height={13} rx={2} />
          <line x1={6} y1={10} x2={6.01} y2={10} />
          <line x1={10} y1={10} x2={10.01} y2={10} />
          <line x1={14} y1={10} x2={14.01} y2={10} />
          <line x1={18} y1={10} x2={18.01} y2={10} />
          <line x1={7} y1={15} x2={17} y2={15} />
        </svg>;
      case "download":
        return <svg {...common}>
          <path d="M12 3v12" />
          <polyline points="7,10 12,15 17,10" />
          <line x1={5} y1={21} x2={19} y2={21} />
        </svg>;
      case "upload":
        return <svg {...common}>
          <path d="M12 15V3" />
          <polyline points="7,8 12,3 17,8" />
          <line x1={5} y1={21} x2={19} y2={21} />
        </svg>;
      case "log-out":
        return <svg {...common}>
          <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
          <polyline points="16,17 21,12 16,7" />
          <line x1={21} y1={12} x2={9} y2={12} />
        </svg>;
      case "clipboard":
        return <svg {...common}>
          <rect x={6} y={4} width={12} height={16} rx={2} />
          <rect x={9} y={2} width={6} height={4} rx={1} />
          <line x1={9} y1={11} x2={15} y2={11} />
          <line x1={9} y1={15} x2={15} y2={15} />
        </svg>;
      case "clock":
        return <svg {...common}><circle cx={12} cy={12} r={9} /><polyline points="12,7 12,12 15.5,14" /></svg>;
      case "trash":
        return <svg {...common}>
          <path d="M4 7h16" />
          <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
          <path d="M19 7l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" />
          <line x1={10} y1={11} x2={10} y2={17} />
          <line x1={14} y1={11} x2={14} y2={17} />
        </svg>;
      case "camera":
        return <svg {...common}>
          <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx={12} cy={14} r={3.5} />
        </svg>;
      case "paperclip":
        return <svg {...common}>
          <path
            d="M20.5 12.5 12.9 20a4.2 4.2 0 0 1-6-6l7.6-7.5a2.8 2.8 0 0 1 4 4L11 18a1.4 1.4 0 0 1-2-2l6.5-6.4"
          />
        </svg>;
      case "eye":
        return <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx={12} cy={12} r={3} />
        </svg>;
      case "eye-off":
        return <svg {...common}>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1={1} y1={1} x2={23} y2={23} />
        </svg>;
      case "alert-triangle":
        return <svg {...common}>
          <path d="M12 3 22 20H2z" />
          <line x1={12} y1={9} x2={12} y2={13.5} />
          <circle cx={12} cy={16.5} r={0.6} fill="currentColor" stroke="none" />
        </svg>;
      case "check-circle":
        return <svg {...common}>
          <circle cx={12} cy={12} r={9} />
          <polyline points="8,12.5 11,15.5 16,9" />
        </svg>;
      case "help":
        return <svg {...common}>
          <circle cx={12} cy={12} r={9} />
          <path d="M9.4 9.2a2.7 2.7 0 1 1 3.4 3.1c-.6.2-.8.6-.8 1.2v.4" />
          <line x1={12} y1={16.8} x2={12} y2={16.9} />
        </svg>;
      case "printer":
        return <svg {...common}>
          <path d="M6 9V3h12v6" />
          <rect x={4} y={9} width={16} height={8} rx={1} />
          <rect x={8} y={13} width={8} height={6} />
        </svg>;
      case "save":
        return <svg {...common}>
          <path d="M5 3h11l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M8 3v6h8V3" />
          <path d="M8 21v-7h8v7" />
        </svg>;
      case "arrow-right":
        return <svg {...common}>
          <line x1={4} y1={12} x2={20} y2={12} />
          <polyline points="13,5 20,12 13,19" />
        </svg>;
      case "party":
        return <svg {...common}>
          <path d="M4 21 14 9" />
          <path d="M15 3l1.5 2.3L19 4l-.7 2.6L21 8l-2.4.8L18 11l-2.1-1.5L14 11l.3-2.6L12 7l2.5-.8L15 3z" />
          <circle cx={5.5} cy={15} r={1} fill="currentColor" stroke="none" />
          <circle cx={9} cy={19.5} r={1} fill="currentColor" stroke="none" />
        </svg>;
      case "mountain":
        return <svg {...common}><path d="M3 20 9.5 7l4 6.5L16 10l5 10z" /></svg>;
      case "snowflake":
        return <svg {...common}>
          <line x1={12} y1={2} x2={12} y2={22} />
          <line x1={4.5} y1={6.5} x2={19.5} y2={17.5} />
          <line x1={4.5} y1={17.5} x2={19.5} y2={6.5} />
        </svg>;
      case "banknote":
        return <svg {...common}>
          <rect x={2} y={6} width={20} height={12} rx={2} />
          <circle cx={12} cy={12} r={3} />
          <line x1={6} y1={9} x2={6.01} y2={9} />
          <line x1={18} y1={15} x2={18.01} y2={15} />
        </svg>;
      case "credit-card":
        return <svg {...common}>
          <rect x={2} y={5} width={20} height={14} rx={2} />
          <line x1={2} y1={10} x2={22} y2={10} />
          <line x1={6} y1={15} x2={10} y2={15} />
        </svg>;
      default:
        return null;
    }
  }
  // Help runs 22 phone screens across 39 headings and Settings 7.9 across 15.
  // Both offered a link index at the top and nothing after it, so fifteen
  // screens down the way back was a long scroll. This is that index, made
  // permanent: a sticky bar naming the section you are actually in, which
  // opens the full list.
  //
  // On a phone it replaces the index strip rather than joining it — the strip
  // is a two-column grid of fourteen pills, about 200px, and it is only useful
  // at the top of the page. Desktop keeps the strip and never renders this.
  export function SectionNav({ sections = [], label = "Section" }) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState(null);
    // Scroll position, not intersection. "First section currently on screen"
    // reads wrong at the foot of the page, where several short sections are
    // visible at once and the earliest one wins — jump to the last section and
    // the bar names one several above it. The last section whose heading has
    // passed the top of the viewport is what you are actually reading.
    useEffect(() => {
      if (!sections.length) return void 0;
      const scroller = document.querySelector(".app-scroll") || window;
      let frame = 0;
      const measure = () => {
        frame = 0;
        let found = null;
        for (const s of sections) {
          const el = document.getElementById(s.id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= 96) found = s.id;
        }
        setCurrent(found || (sections[0] && sections[0].id));
      };
      const onScroll = () => {
        if (frame) return;
        frame = requestAnimationFrame(measure);
      };
      measure();
      scroller.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        if (frame) cancelAnimationFrame(frame);
        scroller.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }, [sections]);
    if (sections.length < 3) return null;
    const here = sections.find((s) => s.id === current) || sections[0];
    const go = (id) => {
      setOpen(false);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    };
    return <div className="section-nav" data-noprint={true}>
      <button
        className="section-nav-btn"
        onClick={() => { haptic(); setOpen(true); }}
        aria-haspopup="dialog"
        aria-label={label + ": " + here.title + ". Jump to a section"}
      >
        <span className="section-nav-here">{here.title}</span>
        <span className="section-nav-count">{sections.length}{" sections"}</span>
        <span className="section-nav-chev"><Icon name="chevron-down" size={15} strokeWidth={2.25} /></span>
      </button>
      {open && <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Jump to a section">
        <div className="modal-card entries-mobilefilters-card">
          <SheetHandle onDismiss={() => setOpen(false)} />
          <div className="modal-title-lg">Jump to a section</div>
          <div className="section-nav-list">
            {sections.map((s) => <button
              key={s.id}
              className="section-nav-item"
              onClick={() => go(s.id)}
              aria-current={s.id === here.id ? "true" : void 0}
            >
              {s.title}
            </button>)}
          </div>
        </div>
      </div>}
    </div>;
  }
  // Every transient notice in the app, in one place, on one scale.
  //
  // They used to be scattered: a low-balance banner and a backup nudge at app
  // level, an alert banner and a sample-data strip inside Today, each with its
  // own shape, padding and margin. On an overdrawn household two of them fired
  // at once and printed the same figure and the same date in two differently
  // sized red boxes — 238px of banner before the first real content. They read
  // as one family and then missed each other by 4px of padding and 2px of
  // margin, which is the tell that they were never designed together.
  //
  // One notice renders as a row. More than one collapses behind a count, so a
  // bad month can never rebuild the wall: the worst tone leads, and opening it
  // is one tap. Sorting is by severity, not by which effect happened to run
  // first, so the thing that matters is the thing you read.
  export const NOTICE_RANK = { critical: 0, warn: 1, info: 2 };
  export function NoticeStack({ notices = [] }) {
    const [open, setOpen] = useState(false);
    const list = useMemo(
      () => notices.filter(Boolean).slice().sort((a, b) => NOTICE_RANK[a.tone] - NOTICE_RANK[b.tone]),
      [notices]
    );
    if (!list.length) return null;
    const row = (n) => <div
      key={n.id}
      className="notice"
      data-tone={n.tone}
      role={n.tone === "critical" ? "alert" : "status"}
    >
      <span className="notice-icon" aria-hidden="true">
        <Icon name={n.icon || "alert-triangle"} size={16} />
      </span>
      <span className="notice-msg">{n.msg}</span>
      {// Every action is a labelled button, including the one that dismisses.
      // A bare "×" on "back up your data" does not say whether it defers the
      // prompt or turns it off, and the words already existed.
      <span className="notice-actions">
        {(n.actions || []).map((a) => <button
          key={a.label}
          onClick={a.onClick}
          aria-label={a.ariaLabel}
          className={"cf-btn cf-btn--tiny " + (a.primary ? "cf-btn--primary fw-700" : "cf-btn--secondary")}
        >
          {a.label}
        </button>)}
      </span>
}
    </div>;
    if (list.length === 1) {
      return <div className="cf-page notice-stack" data-noprint={true}>{row(list[0])}</div>;
    }
    return <div className="cf-page notice-stack" data-noprint={true}>
      <button
        className="notice notice-summary"
        data-tone={list[0].tone}
        aria-expanded={open ? "true" : "false"}
        onClick={() => { haptic(); setOpen(!open); }}
      >
        <span className="notice-icon" aria-hidden="true">
          <Icon name={list[0].icon || "alert-triangle"} size={16} />
        </span>
        <span className="notice-msg">
          <strong>{list.length}{" notices"}</strong>
          {" \u2014 "}
          {list[0].plain}
        </span>
        <span className="notice-chev" aria-hidden="true">{open ? "\u2303" : "\u2304"}</span>
      </button>
      {open && <div className="notice-stack-body">{list.map(row)}</div>}
    </div>;
  }
  // Four destinations and one action. Settings, Help and the account moved
  // behind the avatar as "You" — they are things you visit occasionally, and
  // they were taking a fifth of the thumb's reach from the money.
  //
  // The centre button is the one thing the old nav had no room for: adding an
  // entry. It was reachable only through Budget → Entries → the toolbar, which
  // is three taps for the app's most common act.
  export function BottomNav({ tab, setTab, lowAlert = false, onCompose }) {
    const items = [
      { id: "today", icon: "home", label: "Today" },
      { id: "flow", icon: "trending-up", label: "Flow" },
      { compose: true, icon: "plus", label: "Add" },
      { id: "envelopes", icon: "scale", label: "Envelopes" },
      { id: "plan", icon: "target", label: "Plan" }
    ];
    return <nav className="cf-bottomnav" aria-label="Primary" data-noprint={true}>
      {items.map((it) => it.compose ? <button
        key="compose"
        onClick={() => {
          haptic();
          if (onCompose) onCompose();
        }}
        aria-label="Add an entry"
        className="bottomnav-btn bottomnav-compose"
      >
        <span className="bottomnav-compose-mark"><Icon name={it.icon} size={21} /></span>
        <span className="bottomnav-label">{it.label}</span>
      </button> : <button
      key={it.id}
      onClick={() => {
          haptic();
          setTab(it.id);
        }}
      aria-label={it.label}
      aria-current={tab === it.id ? "page" : void 0}
      className="bottomnav-btn"
      style={{
          color: tab === it.id ? "var(--text)" : "var(--textLt)",
          fontWeight: tab === it.id ? 700 : 500
        }}
    >
      <span
        className="bottomnav-icon-wrap"
        style={{
        background: tab === it.id ? "var(--accentLt)" : "transparent"
      }}
      >
        <Icon name={it.icon} size={18} />
        {it.id === "today" && lowAlert && <span className="bottomnav-alert-dot" />}
      </span>
      <span className="bottomnav-label">{it.label}</span>
    </button>)}
    </nav>;
  }
  // "The app says $2,140. What does the bank actually say?"
  //
  // Every balance in the app is projected from one figure — the year's opening
  // balance — plus the entries. Nothing measures it against reality, and the
  // Help page is explicit that marking an occurrence paid is a tick-off, not a
  // reconciliation. So the projection drifts: cash spent, a rounding, a
  // purchase nobody entered. Until now the only correction was to edit
  // January's opening balance, which rewrites every balance in the year
  // including the months you had already checked.
  //
  // The adjustment is posted as a dated one-time **transfer** rather than an
  // income or expense entry. That is exactly the meaning transfers already
  // carry (see getMonthSummaries): it moves the running balance without
  // pretending to be earnings or spending, so it doesn't land in Budget vs
  // Actual, distort a category, or turn up in the AI's spending analysis. It
  // is visible in the ledger on the day it was made, and can be deleted like
  // any other entry if it was a mistake.
  export function ReconcileModal({ projected, categories = [], lastReconciled = null, onCancel, onConfirm }) {
    const [actual, setActual] = useState("");
    const [err, setErr] = useState("");
    // How long the projection has been running unchecked. The adjustment about
    // to be recorded *is* the drift accumulated over that stretch, which is the
    // only reading of the number that says anything: $40 out after three days
    // is a missed transaction, $40 out after five months is the app being
    // essentially right.
    const sinceDays = (() => {
      const from = parseDate(lastReconciled);
      if (!from) return null;
      const days = Math.round((new Date(todayStr()) - from) / 864e5);
      return Number.isFinite(days) && days >= 0 ? days : null;
    })();
    const parsed = actual.trim() === "" ? null : Number(actual);
    const valid = parsed !== null && Number.isFinite(parsed);
    const actualCents = valid ? dollarsToCents(actual) : null;
    const diff = valid ? actualCents - projected : null;
    // What the adjustment says about the projection, rather than just its size.
    // Only worth saying when there is a stretch of time to divide by — the
    // first reconciliation has nothing to compare against.
    const driftLine = (() => {
      if (!valid || !diff || !sinceDays) return "";
      const perMonth = Math.round(Math.abs(diff) / sinceDays * 30);
      const direction = diff > 0 ? "under" : "over";
      return `The forecast has drifted ${fmt(Math.abs(diff))} in ${sinceDays} day${sinceDays === 1 ? "" : "s"} \u2014 about ${fmt(perMonth)} a month, ${direction}-counting what you actually have.`;
    })();
    const submit = () => {
      if (!valid) {
        setErr("Enter the balance your bank shows today.");
        return;
      }
      if (diff === 0) {
        setErr("");
        onCancel();
        return;
      }
      onConfirm({ actualCents, diff });
    };
    return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Reconcile to bank">
      <div className="modal-card oem-card">
        <SheetHandle onDismiss={onCancel} />
        <div className="modal-title-lg">Reconcile to your bank</div>
        <div className="oem-hint">
          Enter what your account actually shows today. Anything left over is recorded as a dated adjustment, so today's balance matches reality without rewriting the year behind it.
        </div>
        {lastReconciled && <div className="oem-editedby">
          {"Last reconciled "}
          {humanShortDate(lastReconciled)}
          {sinceDays !== null && ` \u00b7 ${sinceDays} day${sinceDays === 1 ? "" : "s"} ago`}
        </div>}
        <div className="reconcile-row">
          <span className="txm">This app projects</span>
          <span className="cf-text-mono-13 reconcile-figure">{fmt(projected)}</span>
        </div>
        <label className="field-label" htmlFor="rec-actual">Your bank shows</label>
        <input
          id="rec-actual"
          type="number"
          inputMode="decimal"
          step="0.01"
          autoFocus={true}
          className={"field-input field-input--mono" + (err ? " field-error" : "")}
          placeholder="0.00"
          value={actual}
          onChange={(e) => {
          setActual(e.target.value);
          if (err) setErr("");
        }}
          onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        />
        {err && <FieldError msg={err} />}
        {valid && <div className="reconcile-diff">
          {diff === 0 ? "Already matches \u2014 nothing to adjust." : <>
            {"Adjustment of "}
            <strong style={{ color: diff > 0 ? "var(--greenDk)" : "var(--red)" }}>{fmt(diff, true)}</strong>
            {` will be added today under "${reconcileCategory(categories)}". It moves the balance without counting as income or spending.`}
            {driftLine && <div className="reconcile-drift">{driftLine}</div>}
          </>}
        </div>}
        <div className="oem-footer-row">
          <button onClick={onCancel} className="cf-btn cf-btn--secondary">Cancel</button>
          <button onClick={submit} disabled={!valid || diff === 0} className="cf-btn cf-btn--primary">
            Record adjustment
          </button>
        </div>
      </div>
    </div>;
  }
  // Where a reconciliation adjustment is filed. "Other" is the default
  // category list's catch-all and the natural home; a household that renamed
  // or removed it gets the last category instead, which is where the defaults
  // put the catch-all anyway.
  export function reconcileCategory(categories) {
    if (!Array.isArray(categories) || !categories.length) return "Other";
    return categories.includes("Other") ? "Other" : categories[categories.length - 1];
  }
  // The marker that makes an adjustment recognisable later, for the "last
  // reconciled" line. Deliberately the visible description rather than a
  // hidden field: it needs no new column, it reads correctly in the ledger and
  // in a CSV export, and if someone renames one the only consequence is that
  // this stops counting it.
  export const RECONCILE_DESC = "Balance adjustment";
  export function lastReconciledDate(entries) {
    if (!Array.isArray(entries)) return null;
    let latest = null;
    entries.forEach((e) => {
      if (e && e.desc === RECONCILE_DESC && e.startDate && (!latest || e.startDate > latest)) latest = e.startDate;
    });
    return latest;
  }
  export function OccurrenceEditModal({ ev, orig, onSave, onCancel, onReset, onDelete, onEditEntry = null, onSkip = null, apiKey = "", isOffline = false, categories = [] }) {
    const [desc, setDesc] = useState(ev.desc || (orig.desc || ""));
    const plannedCents = ev.plannedAmount !== void 0 ? ev.plannedAmount : ev.amount;
    const [amount, setAmount] = useState(String(centsToDollars(plannedCents)));
    const [actualAmount, setActualAmount] = useState(
      ev.actualAmount !== void 0 ? String(centsToDollars(ev.actualAmount)) : ev.plannedAmount !== void 0 && ev.amount !== ev.plannedAmount ? String(centsToDollars(ev.amount)) : ""
    );
    const [actualErr, setActualErr] = useState("");
    const [day, setDay] = useState(String(ev.day));
    const [month, setMonth] = useState(String(ev.month));
    const evYear = ev.date ? ev.date.getFullYear() : (new Date()).getFullYear();
    const monthNum = parseInt(month, 10);
    const maxDay = daysInMonth(isNaN(monthNum) ? ev.month : monthNum, evYear);
    const [notes, setNotes] = useState(ev.notes || (orig.notes || ""));
    const [attachment, setAttachment] = useState(ev.attachment || null);
    const [err, setErr] = useState("");
    const [dayErr, setDayErr] = useState("");
    // Who last edited this occurrence, in a household of more than one. This
    // is the question a shared budget actually generates — "who moved the rent
    // to the 3rd?" — and the override has carried a timestamp all along with
    // nothing beside it saying whose.
    const { members: hhMembers, sessionUser: hhUser } = useContext(HouseholdContext);
    const editedBy = memberName(ev._by, hhMembers, { selfId: hhUser && hhUser.id });
    const attachFile = (e) => {
      compressReceiptImage(e.target.files[0], (b64) => {
        if (b64) setAttachment(b64);
      });
      e.target.value = "";
    };
    const [lightbox, setLightbox] = useState(false);
    const [scanBusy, setScanBusy] = useState(false);
    const [scanErr, setScanErr] = useState("");
    const [scanNote, setScanNote] = useState("");
    // Reads the attached photo and fills the form in from it. Nothing is
    // saved: the extracted values land in the same fields the user was already
    // editing, so a misread costs a correction rather than a bad entry.
    const readReceipt = async () => {
      setScanBusy(true);
      setScanErr("");
      setScanNote("");
      try {
        const got = await aiExtractReceipt({ dataUrl: attachment, categories, apiKey });
        const filled = [];
        if (got.merchant && got.merchant.trim()) {
          setDesc(got.merchant.trim());
          filled.push("description");
        }
        if (Number.isFinite(got.total) && got.total > 0) {
          setAmount(String(got.total));
          filled.push("amount");
        }
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(got.date || "");
        if (m) {
          const mo = parseInt(m[2], 10) - 1;
          const dy = parseInt(m[3], 10);
          // The occurrence is pinned to its own year — a receipt dated in a
          // different one is almost certainly a misread, and silently moving
          // the occurrence would be worse than leaving the date alone.
          if (parseInt(m[1], 10) === evYear && mo >= 0 && mo <= 11 && dy >= 1 && dy <= daysInMonth(mo, evYear)) {
            setMonth(String(mo));
            setDay(String(dy));
            filled.push("date");
          }
        }
        setScanNote(filled.length ? `Filled in ${filled.join(", ")} from the receipt — check before saving.` : "Couldn't make out any usable fields on that receipt.");
      } catch (e) {
        setScanErr(aiErrorMessage(e));
      } finally {
        setScanBusy(false);
      }
    };
    const inpCls = (isErr) => "field-input" + (isErr ? " field-error" : "");
    const lblCls = "field-label";
    const save = () => {
      const rawAmount = Number(amount);
      if (amount.trim() === "" || isNaN(rawAmount) || rawAmount < 0) {
        setErr("Enter a valid amount.");
        return;
      }
      let rawActual = null;
      if (actualAmount.trim() !== "") {
        rawActual = Number(actualAmount);
        if (isNaN(rawActual) || rawActual < 0) {
          setActualErr("Enter a valid actual amount, or leave it blank.");
          return;
        }
      }
      const a = dollarsToCents(amount);
      const dNum = parseInt(day, 10);
      if (isNaN(dNum) || dNum < 1 || dNum > maxDay) {
        setDayErr(`Enter a day between 1 and ${maxDay}.`);
        return;
      }
      setErr("");
      setDayErr("");
      setActualErr("");
      onSave({
        desc,
        amount: a,
        month: isNaN(monthNum) ? ev.month : monthNum,
        day: dNum,
        notes,
        attachment,
        actualAmount: rawActual === null ? void 0 : dollarsToCents(actualAmount)
      });
    };
    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [onCancel]);
    return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit occurrence">
      <div className="modal-card oem-card" onClick={(e) => e.stopPropagation()}>
        <SheetHandle onDismiss={onCancel} />
        <div className="oem-header-row">
          <div className="oem-title">
            {"Edit \u2014 "}
            {MONTHS[ev.month]}
            {" "}
            {ev.day}
            {ev.depositShifted && <HelpTip
              icon="↤"
              variant="mark"
              label="Deposit date"
              text={depositShiftNote(ev)}
            />}
          </div>
          <button onClick={onCancel} aria-label="Close" className="cf-close-x">✕</button>
        </div>
        {editedBy && editedBy !== "you" && <div className="oem-editedby">
          {"Last edited by "}
          {editedBy}
          {ev._savedAt ? ` on ${new Date(ev._savedAt).toLocaleDateString()}` : ""}
        </div>}
        <div className="oem-hint">
          Changes apply to this date only.
          {orig.repeats && onEditEntry && <>
            {" "}
            <button type="button" onClick={onEditEntry} className="ai-settings-link">
              Edit the recurring entry instead →
            </button>
          </>}
        </div>
        <div className="cf-col cf-gap-14">
          <div>
            <label className={lblCls} htmlFor="oem-desc">Description</label>
            <input
              id="oem-desc"
              autoFocus={autoFocusOnDesktop()}
              className={inpCls(false)}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            />
          </div>
          <div>
            <label className={lblCls} htmlFor="oem-amount">
              Amount $
              <span className="required-mark">*</span>
            </label>
            <input
              id="oem-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              className={inpCls(!!err)}
              value={amount}
              onChange={(e) => {
              setAmount(e.target.value);
              setErr("");
            }}
              onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            />
            {err && <div className="field-error-text">{err}</div>}
          </div>
          <div>
            <FieldLabel
              className={lblCls}
              htmlFor="oem-actual-amount"
              helpLabel="Actual Amount Paid"
              help="Leave blank if you paid the scheduled amount. Filling it in records what actually left the account — the running balance and Budget vs Actual follow it, while the scheduled amount above stays as planned for every other date."
            >
              Actual Amount Paid
            </FieldLabel>
            <input
              id="oem-actual-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder={`Same as scheduled ($${amount || "0.00"})`}
              className={inpCls(!!actualErr)}
              value={actualAmount}
              onChange={(e) => {
              setActualAmount(e.target.value);
              setActualErr("");
            }}
              onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            />
            {actualErr && <div className="field-error-text">{actualErr}</div>}
          </div>
          <div>
            <div className="cf-row cf-gap-10">
              <div className="flex-55">
                <label className={lblCls} htmlFor="oem-month">Month</label>
                <select
                  id="oem-month"
                  className="field-input"
                  value={month}
                  onChange={(e) => {
              setMonth(e.target.value);
              setDayErr("");
            }}
                >
                  {MONTHS.map((mn, mi) => <option key={mn} value={String(mi)}>{mn}{" "}{evYear}</option>)}
                </select>
              </div>
              <div className="flex-45">
                <FieldLabel
                  className={lblCls}
                  htmlFor="oem-day"
                  helpLabel="Day"
                  helpAlign="end"
                  help={`1–${maxDay} for this month. Setting a date here moves this one occurrence and nothing else — the same as dragging the row to a new date in the grid.`}
                >
                  Day
                  <span className="required-mark">*</span>
                </FieldLabel>
                <input
                  id="oem-day"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxDay}
                  step="1"
                  className={inpCls(!!dayErr)}
                  value={day}
                  onChange={(e) => {
              setDay(e.target.value);
              setDayErr("");
            }}
                  onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
                />
              </div>
            </div>
            {dayErr ? <div className="field-error-text">{dayErr}</div> : monthNum !== ev.month ? (
          // Kept inline rather than moved into the help tip: this isn't help,
          // it's the consequence of the change the user just made to the month
          // dropdown, and it has to be seen without going looking for it.
          <div className="field-hint-text">
            {`Moves this occurrence to ${MONTHS[isNaN(monthNum) ? ev.month : monthNum]}`}
          </div>
        ) : null}
          </div>
          <div>
            <label className={lblCls} htmlFor="oem-notes">Notes</label>
            <input
              id="oem-notes"
              className={inpCls(false)}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            />
          </div>
          <div>
            <label className={lblCls}>Receipt / Photo</label>
            {attachment ? <div className="cf-row cf-gap-12 cf-wrap">
              <img
                src={attachment}
                alt="attachment"
                className="oem-attach-img"
                onClick={() => setLightbox(true)}
              />
              <div className="cf-row cf-gap-8 cf-wrap">
                <button
                  type="button"
                  onClick={readReceipt}
                  disabled={scanBusy || isOffline || !aiCanRun(apiKey)}
                  title={isOffline ? "You're offline — reading a receipt needs a connection." : !aiCanRun(apiKey) ? "Add an Anthropic API key in Settings → General, or deploy the ai-proxy Edge Function." : void 0}
                  className="cf-btn cf-btn--secondary cf-btn--tiny"
                >
                  {scanBusy ? "Reading…" : "✦ Read receipt"}
                </button>
                <button type="button" onClick={() => setAttachment(null)} className="oem-remove-btn">
                  Remove
                </button>
              </div>
              {(scanErr || scanNote) && <div
                className={scanErr ? "field-error-text" : "field-hint-text"}
                style={{ flexBasis: "100%" }}
              >
                {scanErr || scanNote}
              </div>}
              {lightbox && <ReceiptLightbox src={attachment} onClose={() => setLightbox(false)} />}
            </div> : <div
          className="cf-row cf-gap-8 cf-wrap"
        >
          <label className="attach-camera attach-label">
            <Icon name="camera" size={14} />
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={attachFile}
              className="hidden"
            />
          </label>
          <label className="attach-label">
            <Icon name="paperclip" size={14} />
            From gallery
            <input
              type="file"
              accept="image/*"
              onChange={attachFile}
              className="hidden"
            />
          </label>
        </div>}
          </div>
        </div>
        {(() => {
          // Whichever of Delete/Reset/Skip renders last gets marginRight:auto
          // (the flexbox trick .oem-footer-row's justify-content:flex-end
          // relies on to pin this leading cluster left while Cancel/Save
          // pack right) — the others get 0 so only one button ever splits
          // the row.
          const hasReset = ev.isOverride && onReset;
          const lastLeading = onSkip ? "skip" : hasReset ? "reset" : onDelete ? "delete" : null;
          return <div className="oem-footer-row">
            {onDelete && <button
              onClick={onDelete}
              className="cf-btn cf-btn--danger"
              style={{ marginRight: lastLeading === "delete" ? "auto" : 0 }}
            >
              Delete…
            </button>}
            {hasReset && <button
              onClick={onReset}
              className="oem-reset-btn"
              style={{ marginRight: lastLeading === "reset" ? "auto" : 0 }}
            >
              ↺ Reset entry
            </button>}
            {onSkip && <button
              onClick={onSkip}
              className="cf-btn cf-btn--secondary"
              title="Remove just this date — the recurring entry keeps going"
              style={{ marginRight: "auto" }}
            >
              ⏭ Skip this date
            </button>}
            <button onClick={onCancel} className="cf-btn cf-btn--secondary">Cancel</button>
            <button onClick={save} className="cf-btn cf-btn--primary oem-save-btn">Save</button>
          </div>;
        })()}
      </div>
    </div>;
  }
  export function HouseholdOnboardingView({ email, createHousehold, joinHousehold, signOut }) {
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
    return <div className="household-onboard-wrap">
      <div className="household-onboard-inner">
        <div className="household-onboard-header">
          <img src={LOGO_SRC} alt="CashFlow" className="household-onboard-logo" />
          <div className="household-onboard-email">{"Signed in as "}{email}</div>
        </div>
        <div className="household-onboard-card">
          <div className="household-onboard-title">One more step</div>
          <div className="household-onboard-subtitle">
            Create a new household budget, or join one a family member already set up.
          </div>
          <div className="cf-row cf-gap-6 justify-center mb-20">
            <button
              onClick={() => {
          setMode("create");
          setError("");
        }}
              className="household-mode-btn"
              style={{
          background: mode === "create" ? "var(--stripe)" : "transparent",
          color: mode === "create" ? "var(--text)" : "var(--textLt)"
        }}
            >
              Create household
            </button>
            <button
              onClick={() => {
          setMode("join");
          setError("");
        }}
              className="household-mode-btn"
              style={{
          background: mode === "join" ? "var(--stripe)" : "transparent",
          color: mode === "join" ? "var(--text)" : "var(--textLt)"
        }}
            >
              Join with invite code
            </button>
          </div>
          <div className="mb-12">
            <label className="field-label" htmlFor="hh-name">Your name</label>
            <input
              id="hh-name"
              type="text"
              className="field-input field-input--lg"
              value={fullName}
              onChange={(e) => {
        setFullName(e.target.value);
        setError("");
      }}
              placeholder="e.g. Ken"
            />
          </div>
          {mode === "join" && <div className="mb-12">
            <label className="field-label" htmlFor="hh-code">Invite code</label>
            <input
              id="hh-code"
              type="text"
              className="field-input field-input--lg field-input--mono field-input--spaced"
              value={code}
              onChange={(e) => {
        setCode(e.target.value.toUpperCase());
        setError("");
      }}
              placeholder="e.g. 4F9B2C1D"
            />
          </div>}
          {error && <div
            className="notice notice--sm household-onboard-error"
            data-tone="critical"
            role="alert"
          >
            {error}
          </div>}
          <button
            onClick={submit}
            disabled={loading}
            className="household-submit-btn"
            style={{
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1
        }}
          >
            {loading ? "One moment…" : mode === "create" ? "Create household" : "Join household"}
          </button>
        </div>
        <div className="household-signout-wrap">
          <button onClick={signOut} className="household-signout-btn">Sign out</button>
        </div>
      </div>
    </div>;
  }
