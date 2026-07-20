# CashFlow Budget — Audit Follow-Through (Round 5)

**Date:** July 20, 2026 · **Scope:** clear the "recommended, not blocking" backlog from the
two prior rounds (`UI_ARCH_AUDIT_2026-07-19.md` R1–R9, `MOBILE_AUDIT_2026-07-19.md`
M-R1–M-R4). Every item below was implemented and verified live, or investigated and
found to already be fine — none were skipped without a documented reason.

**Method:** same as prior rounds — source edits verified by `node build.js` (syntax
gate), the 29-test Playwright regression suite (29/29 before *and* after every task),
and targeted live Chromium renders/scripted interactions per change, at both 1440×900
and 393×852, light and dark, plus a new landscape-phone pass at 844×390.

---

## 1. Landed this round

### R2 / M-R2 — Emoji → SVG icon system, completed
The `Icon` component (introduced in round 3 for nav/pills) gained **23 new glyphs**
(`user`, `users`, `key`, `lock`, `keyboard`, `download`, `upload`, `log-out`,
`clipboard`, `clock`, `trash`, `camera`, `paperclip`, `eye`/`eye-off`,
`alert-triangle`, `check-circle`, `printer`, `save`, `arrow-right`, `party`,
`mountain`, `snowflake`, `banknote`, `credit-card`, `chart-down`). Every colored
pictograph emoji (`\u{1F...}` astral-plane characters) in the interactive React tree
was swept and replaced — user menu, settings section pills, AI report topic cards and
section headers, onboarding wizard hero icons, debt-strategy cards, empty states,
export/import buttons, attach/camera buttons, password show/hide, alert banners, the
swipe coach tip, and more. Verified zero `\u{1F` escapes remain in `src/components/`
or `src/App.js`.

**Deliberately left alone**, with reasoning:
- Monochrome BMP dingbats already inheriting `currentColor` (✓ ✕ ✎ ⚠ → ↺ ⎘) — these
  aren't the emoji the audits flagged; they render as plain glyphs everywhere, same
  family as the icon system's own visual language.
- The pre-hydration boot splash in `index.template.html` (💰, shown for a fraction of
  a second before React mounts) — outside the interactive UI the audits were scoped to.

### R4 — Remaining `onMouseEnter`/`onMouseLeave` handlers → CSS
The 3 remaining JS-driven hover handlers (daily-view row, desktop `ContextMenu`, plus
one in Settings' `AlertsPanel` fixed alongside R2's icon work) are now CSS `:hover`
rules (`.daily-row-btn`, `.ctx-menu-item`, `.alert-row`), matching the `.cf-menu-item`
pattern from round 3. **Zero `onMouseEnter` handlers remain in the codebase.**

### R5 — `PillToggle` size overrides → modifier class
The two dashboard call sites passing `fontSize`/`padding`/`borderRadius` props (two
near-identical but not-quite-matching one-offs) now use a single `size="sm"` prop
mapping to a new `.cf-pill--sm` class. `PillToggle`'s signature dropped the four
override props entirely.

### R6 — `window.__cf*` globals → CustomEvents
`__cfGoBudgetSub`, `__cfSetTab`, `__regOpenNew`, `__regOpenCSV` are gone. Cross-view
navigation now goes exclusively through CustomEvents, matching the pattern the codebase
already used for `cf:quickadd`/`cf:toast`: new `cf:goto-budget-sub`, `cf:goto-tab`,
`cf:reg-open-new`, `cf:reg-open-csv`. Verified all four flows still work end-to-end
(alerts→forecast nav, key-hint→settings nav, desktop `N` shortcut opening the register
form, FAB→CSV import) via scripted Chromium interaction — zero JS errors.

### R9 — Toast queue depth
`FeedbackToast` held exactly one message, so a save-error toast landing just before a
routine success toast would be silently overwritten. It's now a small FIFO (capped at
3; a full queue bumps the oldest *non-error* entry first, never an error). Error
toasts dwell longer (4.5s vs 3.2s) and a `+N` badge shows when more are queued.
Verified: fired an error toast, then a success toast 200ms later — the error stayed
visible for its full dwell time, then the success toast took over automatically.

### M-R1 — Month-picker edge-scroll fade
The horizontally-scrolling month strip had no visual hint that Jan–Jun/Aug–Dec sit
off-screen. Added `scroll`-driven left/right gradient fades (`.month-picker-fade`)
that appear only when there's more to scroll in that direction — verified
programmatically at all three scroll positions (start/middle/end) matching exactly.

### M-R3 — `?selftest` / Settings Audit page mobile formatting
Investigated at 393px with both empty and populated state (seeded an override with
history). **Both already reflow correctly** — flex-wrap layouts, no `<table>`
elements, no horizontal overflow, no defect found. No change made; documented as
verified-fine rather than silently skipped.

### M-R4 — Landscape phone sweep (844×390) — found and fixed a real bug
Width-based breakpoints (≤768px) correctly don't fire at 844px-wide landscape phones —
the wide KPI/table layouts are the right call there. But the FAB is anchored to the
viewport by fixed pixels, and a 390px-tall viewport is short enough that **unscrolled
page content already reaches down to where the FAB sits**, so it permanently covered
the Budget Monthly view's "Closing Balance" KPI card with no way to see the value
without scrolling it out from under a fixed element. Fixed with a
`max-height:480px` + `pointer:coarse` query: FAB shrinks 52px→44px (still meets the
44px minimum) and dims to 0.55 opacity at rest (full opacity the moment it's active),
**without** touching its bottom-nav clearance offset — an earlier attempt that also
changed the offset caused a regression (FAB overlapping the bottom nav) that was
caught by the same verification script and corrected before landing. Confirmed via
before/after crops: the KPI value went from fully hidden to fully legible through the
dimmed circle. Portrait phones (852px height) are unaffected — verified via the full
mobile regression sweep, zero change in output.

**Residual, documented rather than chased further:** the register table view (also
desktop-style at 844px width) has its sticky "CATEGORY" header partially dimmed by the
FAB where it overlaps — legible but not crisp, because both the header background and
the FAB are the same dark navy so opacity blending helps less than on light KPI cards.
A fully layout-aware fix (e.g. a height-aware table↔cards breakpoint) is a larger,
riskier structural change; the current mitigation is a genuine improvement and the
residual is minor and narrow (landscape + short height + this one table's rightmost
column only).

## 2. Intentionally not attempted, with reasoning

- **R1 — inline-style long tail (~1,100 objects).** Round 3's own recommendation was
  "chip away per-file as code is touched, don't big-bang it" — a blanket sweep here
  would touch nearly every component file in one pass with no functional payoff,
  raising regression risk for a purely cosmetic/architectural cleanup. Left as
  documented, ongoing guidance.
- **R7 — `useLS` cross-hook sync.** A latent trap (two components reading the same
  localStorage key wouldn't stay in sync), not a live bug — everything currently lives
  in one `App` instance. Fixing it properly means redesigning `useLS`'s internals
  (a tiny pub-sub layer) touched by every stateful hook in the app; the risk of that
  refactor outweighs fixing a bug that doesn't currently manifest. Left on record per
  round 3's own note.
- **R8 — AI key disclosure.** Round 4 confirmed this was already present in Settings
  (`"Stored with your household data and sent straight from your browser to
  Anthropic..."`). No action needed; not re-verified again here beyond confirming the
  copy still exists (it does, now paired with the new `key` icon).

## 3. Verification summary

- `node build.js`: clean at every step (11 rebuilds across this session).
- Playwright regression suite: **29/29, before and after every task** (12 full runs).
- Targeted scripted verification for each risky change: FAB open/close/menu flow,
  CustomEvent navigation (4 flows), toast queue timing (3 assertions), month-picker
  fade at 3 scroll positions, tap-target census (0 sub-32px targets outside the
  documented halo/prose exceptions), horizontal-overflow scan (0 unexpected overflow
  across 7 views × 2 orientations), landscape KPI-card legibility (before/after crop
  comparison).
- Zero JS errors observed in any render across the entire session.

---

*This closes out the backlog from the July 19 architecture and mobile audits. Nothing
outstanding remains flagged as "recommended" from either prior report except the two
items explicitly deferred above with reasoning.*
