# CashFlow Budget — UI, Accessibility & Architecture Audit (Round 3)

**Date:** July 19, 2026 · **Build audited:** source in `src/` at v178-era `main` ·
**Method:** full code review of `src/` (components, lib, build, schema), mechanical scans
(inline-style census, aria/role census, duplication census), plus live Chromium renders at
1440×900 and 393×852 in both themes with a stubbed Supabase client. Verified against the
29-test Playwright regression suite (29/29 before **and** after the changes below).

Focus this round, per request: UI feature/improvement audit, usability, accessibility,
consistency — and an architecture pass on **inline CSS**, **backend centralization**, and
**duplication**.

---

## 1. State of the app

The two previous audits (`UI_AUDIT_2026-07.md`, `UI_UX_REVIEW_2026-07-18.md`) are fully
landed and it shows: source-of-truth `src/`, SVG icon nav, theme-safe charts, validated
palettes, mobile card ledgers, hash routing, a global modal focus trap, `?selftest`, and a
real regression suite. This round found **no critical defects**. What remained clustered in
three places:

1. **Two modals had escaped the modal system** (App's Edit Profile / Change Password) —
   hand-rolled overlays that missed the focus trap, Esc handling, bottom-sheet styling,
   and the shortcut guard, and duplicated label/input styles inline at 11px-caps (the
   style U6 retired).
2. **Dialog semantics were missing everywhere** — 15 `.modal-overlay` sites, zero
   `role="dialog"` / `aria-modal`.
3. **The shared component layer carried its styling inline** — every `KpiCard`,
   `Toggle`, `MonthPicker` pill, `PillToggle`, `ChartToggle`, FAB, menu item, and error
   banner re-created identical style objects on each render, while a parallel set of
   `.cf-*` classes already existed for some of the same patterns.

## 2. Implemented in this round

### Accessibility
- **All 15 modal surfaces** now declare `role="dialog"` (or `role="alertdialog"` for
  `ConfirmDialog`) with `aria-modal="true"` and an `aria-label` naming the dialog.
- **Edit Profile / Change Password rebuilt on the modal system**: `.modal-overlay` /
  `.modal-card` classes (global focus trap + mobile bottom-sheet now apply), Esc closes
  them, labels are real `<label htmlFor>` pairs on the shared `.field-label` /
  `.field-input` classes, and the password fields carry `autocomplete="current-password"` /
  `"new-password"`.
- **`ConfirmDialog`**: Esc cancels; the destructive action is a shared
  `.cf-btn--danger-solid` and receives initial focus.
- **Desktop tab bar**: active tab now sets `aria-current="page"` (bottom nav already did).
- **User menu button**: `aria-haspopup` + `aria-expanded`; TemplatePicker toggle likewise;
  the quick-add FAB exposes `aria-expanded`.
- **Month picker**: month pills expose `aria-pressed`; the strip is a labelled `group`.
- **Error/info banners** on auth screens now announce via `role="alert"` / `role="status"`.
- The header alert bell is now a real SVG `Icon` (`bell`) instead of the 🔔 emoji, so it
  recolors with its warning/critical state like the rest of the icon system.
- **Alerts view added to hash routing** (`#/alerts`): the Back button and deep links now
  work for the bell's destination, matching every other tab.

### Styling architecture (inline CSS → classes)
Policy adopted (and now documented here): **static styles live in `GLOBAL_STYLES` classes;
inline `style` objects are only for genuinely dynamic values** (computed colors, chart
geometry, drag positions).

- New shared classes: `.cf-page` (the 1160px page column, replacing 8 inline copies),
  `.cf-error-banner` / `.cf-info-banner`, `.cf-menu-item` (+ `--danger`, `--compact` —
  CSS `:hover` replaces per-item `onMouseEnter/Leave` JS), `.cf-modal-title`,
  `.cf-close-x`, `.cf-popover`, `.cf-pill` (+ `--dashed`), `.cf-switch`, `.kpi-card`,
  `.cf-fab-menu-btn`, `.cf-quickfab` (state via `data-active`/`data-scrolling`),
  `.field-input--lg`, `.cf-footer-link`, `.cf-btn--danger-solid`, `.month-nav-arrow`,
  `.month-pill` (match/active via data attributes).
- Converted wholesale to classes: `KpiCard`, `Toggle`, `PillToggle`, `ChartToggle`,
  `MonthPicker`, `TemplatePicker`, `ConfirmDialog`, `FieldError`, `QuickAddFAB`
  (panel, menu, button), user menu, footer links, onboarding form, auth error banners,
  occurrence-editor errors/hints/close button.
- `index.template.html` boot screen: the last 3 `style=""` attributes moved into the boot
  stylesheet (`.bicon`/`.bname`/`.bmsg`). **HTML attribute–style inline CSS is now zero.**
- Net effect: −468 lines of source; the duplicated *repeated* style objects in the shared
  layer are gone at the source, so every consumer inherits the class automatically.

### Backend centralization & duplication
- **All Supabase calls now live in `src/lib/household-sync.js`.** New `sbSignIn` /
  `sbSignUp` / `sbChangePassword` helpers absorb the five `supabaseClient.auth.*` calls
  that had leaked into `LoginView`, `LockScreen`, and App's password form — including a
  duplicated "re-auth to verify current password" flow that existed in two places.
  Components no longer touch `supabaseClient` at all.
- Verified already-centralized (no action needed): data I/O goes exclusively through the
  `load_household` / `save_household` / `put_receipt` / `delete_receipt` RPCs in
  `useHouseholdData`; membership through `useHousehold`.
- **`supabase/schema.sql` reviewed for duplication: clean.** Shared cast helpers
  (`cf_num`, `cf_int`, …), one `cf_apply_household_payload` used by both the save RPC and
  the migration block, and two RLS predicate functions (`is_household_member/owner`)
  reused by all 16 policies.

All of the above verified: `node build.js` clean, **regression suite 29/29, zero JS
errors**, and side-by-side renders (desktop/mobile × light/dark, menus, modals, login)
show visual parity.

## 3. Remaining findings (recommended, not blocking)

| # | Finding | Severity | Suggested fix |
|---|---------|----------|---------------|
| R1 | **Inline-style long tail**: ~1,100 `style:` objects remain, mostly one-off layout in `plan-dashboard.js` (127), `budget.js` (90), `settings.js` (81). Many are legitimate (dynamic values); the rest should migrate opportunistically whenever a file is touched, per the policy above. | 🟡 | Chip away per-file; don't big-bang it — the regression suite is the safety net |
| R2 | **Emoji glyphs persist on secondary surfaces** (~25 sites): user-menu icons (👤 🔑 ⚙ 🔒 ⌨ ⬇ 🚪), Settings section headers (⚙ 👪 📋 🕐), register empty state (📒 🔍), attach buttons (📷 📎), ExportBar (⬇ 🖨), goal celebration 🎉, show/hide password 👁/🙈. The primary nav is fully SVG. | 🟡 | Extend `Icon` with ~10 glyphs (user, key, lock, keyboard, download, upload, printer, camera, paperclip, eye) and sweep |
| R3 | **KPI sparklines still bleed to the card edge on mobile** (Annual Income/Expenses tiles clip the polyline/end-dot at 393px). | 🟢 | Give the sparkline column a fixed flex-basis or `overflow:visible` + right padding inside `.kpi-card` |
| R4 | **3 remaining `onMouseEnter` JS-hover handlers** (budget.js, forms.js, settings.js — one each). | 🟢 | Same `.cf-menu-item`/`:hover` treatment |
| R5 | **`PillToggle` size props** (`fontSize`/`padding`/`borderRadius` passed at 2 dashboard call sites) would be cleaner as a `.cf-pill--sm` modifier. | 🟢 | Add modifier, drop props |
| R6 | **Cross-view navigation uses `window.__cf*` globals** (`__cfGoBudgetSub`, `__cfSetTab`, `__regOpenNew`, `__regOpenCSV`) alongside one CustomEvent (`cf:quickadd`). Works, but two mechanisms for one job. | 🟡 | Standardize on CustomEvents (already proven by `cf:quickadd` and `cf:toast`) |
| R7 | **`useLS` instances don't sync across hooks on the same key** (each hook owns its state). Everything currently lives in `App` so it's latent, not live — carried from the 2026-07-16 audit as a refactor trap. | 🟡 | Note kept on record; a tiny pub-sub inside `useLS` would close it for good |
| R8 | **The Anthropic API key syncs to the whole household** — `aiApiKey` rides in the `save_household` payload, so every member (and the household_settings row) receives it. Defensible for a shared household, but nothing in Settings says so. | 🟡 | One sentence of disclosure next to the key field, or keep the key device-local |
| R9 | **Toast queue depth is 1** — a save-error toast can be overwritten by a routine success toast 200 ms later. | 🟢 | Small FIFO (max 2–3) or let error toasts pin until dismissed |

## 4. Feature ideas (next round candidates)

Grounded in what the data model already supports, ordered by value-to-effort:

1. **Skip/pause a recurring entry** — a "skip this occurrence" action on the occurrence
   editor (amount 0 + strikethrough today requires two steps and loses history).
2. **Month notes** — one free-text note per month on the Monthly view (the override
   `_history` pattern already shows how to sync it).
3. **Export forecast to CSV** — the register and monthly ledger export; the forecast table
   doesn't yet.
4. **Undo for occurrence edits** — entry deletion has one-tap undo; occurrence
   saves/resets don't, though `_history` already records the previous state.
5. **Category merge** — renaming a category in Settings strands old entries; a
   "merge into…" action would fix a real data-hygiene papercut.

---

*Verification notes: before/after renders captured at 1440×900 and 393×852 in both themes
(dashboard, budget monthly, entries, user menu, password modal, login, mobile dark budget);
zero page errors across all renders; regression suite 29/29 both before and after.*
