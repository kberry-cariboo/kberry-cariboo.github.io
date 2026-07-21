# CashFlow Budget — Round-7 Audit Fix Pass (Round 8)

**Date:** July 21, 2026 · **Scope:** implement every finding from
`FULL_AUDIT_2026-07-21.md` · **Verification:** `node build.js` (syntax gate), the new
ESLint correctness gate (clean), and the 29-test Playwright regression suite —
**29/29 before and after**.

## Bugs — all 10 fixed

- **B1** `paid-btn` duplicate `className` → `"cf-checkbtn paid-btn"`; the 44px touch halo
  is back on the Upcoming mark-paid button (also closes M2).
- **B2** v4 migration condition corrected (`correct && !typo` → copy `correct`'s value to
  the live `cf_budgtargets` key, then remove the old key). Previously a no-op.
- **B3** `cf_activeYear` default is now `new Date().getFullYear()` (was hardcoded 2026).
- **B4** Duplicate `@keyframes slideUp` resolved: `.undo-toast` uses a new
  `slideUpCentered` (preserves `translateX(-50%)`); `.modal-card` keeps `slideUp`.
- **B5** All keyboard shortcuts (digits, letters, arrows, `/`) now share one handler with
  one guard set — nothing fires while any `.modal-overlay` or `.fab-panel` is open
  (Escape still passes through to clear search/help). This also lands **R3**.
- **B6** First hashless load uses `history.replaceState` — no phantom Back entry.
- **B7** `renderAlertRow` keys rows by `ev.id`.
- **B8** `SectionTitle` and `CatChip` accept `className`; the previously-dead
  `text-9`/`mb-0` call-site props now actually apply.
- **B9** All four dead/malformed inline-style-coupled selectors deleted.
- **B10** `dismissBackup` revokes its object URL.

## Accessibility — all 6 addressed

- **A1** `color-scheme` follows the theme (set on `<html>` in the theme effect) +
  `<meta name="color-scheme" content="dark light">` in the template — native selects,
  date pickers, and scrollbars now match dark mode.
- **A2** The avatar button no longer advertises `aria-haspopup="menu"` (it's a
  disclosure, honestly labeled with `aria-expanded`), and Escape now closes the menu.
- **A3** `FilterPill` triggers expose `aria-expanded`; option toggling moved into the
  checkboxes' own `onChange` (kills the double-firing label-click path).
- **A4** Keyboard/touch reorder paths added: ↑/↓ buttons on Settings category rows;
  Register and Budget column headers are focusable with ArrowLeft/ArrowRight to reorder
  and Enter/Space to sort (sortable columns also expose `aria-sort`).
- **A5** Live regions on async feedback: sync status row, year/backup/category/member
  messages, target-reset and biometric messages, profile-modal error/success, AI error
  banner (`role="status"` / `role="alert"` as appropriate).
- **A6** Every hidden-scrollbar `.hscroll`/`.reg-table-wrap` data table is now a
  focusable labeled region (`tabindex=0`, `role="region"`, `aria-label`) so keyboard
  users can scroll it.

## Mobile & interaction — all 5 fixed

- **M1** `OccurrenceEditModal` gained an "Edit the recurring entry instead →" action
  (shown for recurring entries) — recurring-entry editing is now reachable on iOS
  without a context menu; the "right-click" hint copy is gone.
- **M3** `loadData` flushes any pending debounced save before pulling from the cloud —
  pull-to-refresh / "Reload from Cloud" can no longer stomp an edit made in the 2s
  autosave window.
- **M4** The change-month swipe ignores gestures starting inside `.hscroll` panes.
- **M5** `ContextMenu` clamps from its real rendered rect (layout-effect measure) and
  the desktop menu gained `max-height:70vh; overflow-y:auto`.

## Design / UX — all 6 addressed

- **D1** Register's entry form and CSV importer moved from untrapped `fab-panel`s onto
  the modal system (dialog role, focus trap, Esc, backdrop dismiss, mobile bottom-sheet).
  The mobile QuickAdd panel keeps its FAB-anchored layout but now has the full modal
  contract: the focus trap and shortcut guard treat `.fab-panel` as modal, and Esc closes it.
- **D2** `ConfirmDialog`: backdrop click dismisses; initial focus is on **Cancel** —
  Enter no longer deletes by default.
- **D3** One expense-ink rule: daily-view amounts and the annual table's Expenses column
  are neutral ink (income stays green, signs carry direction); the `#FF8A7A` literal is
  now the `--coral` theme token used only for negatives on navy surfaces.
- **D4** The Alerts view has a "← Back" button (it lives outside the tab bar), and its
  rows navigate via a `gotoForecast` prop instead of a window event.
- **D5** Accepted + documented asymmetry (comment in `styles.css`): global search is
  desktop-only; mobile searches per-view. The header search placeholder now teaches the
  `>100` operator, matching the Entries search.
- **D6** `.year-pills-mobile` renamed to `.year-pills` (dead duplicate rule deleted);
  Settings quick-links reordered to match the page and gained the missing Sync
  (conditional) and Target Reset pills; "Save as Template" now confirms with a toast and
  says when it replaced an existing template.

## React practices

- **R1** `GlanceTile`, `VizRow`, `StratCard` (takes `base` as a prop now), `TodayLine`,
  `TodayLineCard` hoisted to module scope — no more remount-per-render.
- **R2** `ForecastView` snapshots `today` in a `useMemo`; `BudgetView` memoizes
  `monthEvents` and completes the `days` dependency list (`activeYear`, `openBal`).
- **R3** Single merged keydown handler (see B5).
- **R4** `cf:goto-tab` / `cf:goto-budget-sub` events removed — `AIInsightsView` gets
  `setTab`, `AlertsPanel` gets `gotoForecast` as props. The remaining events
  (`cf:toast`, `cf:quickadd`, `cf:reg-open-new/csv`) are genuinely cross-cutting
  (keyboard shortcut → deep view action) and stay.
- **R5** `cf_debt_data` ownership hoisted to App (one `useLS` reader/writer), passed to
  `PlanView`, `DashboardView` (debt snapshot), and `AIInsightsView`; goals flow into
  `AIInsightsView` as a prop. No component reads another's localStorage anymore.
- **R7** `UndoToast` restarts its 5s window when a further delete lands.

## Architecture

- **AR3 done** — `GLOBAL_STYLES` is now `src/styles.css` (1,300 lines of real,
  lintable CSS), inlined into `<head>` by `build.js` via a `__GLOBAL_STYLES__`
  placeholder. Styles load before React mounts (no re-parse per screen), and
  `app-data.js` shrank from 2,217 to ~890 lines — which also substantially delivers
  **AR4**'s "get the CSS out of the data module".
- **AR1 done** — `eslint.config.mjs` (correctness-only rules: `no-dupe-keys` — the rule
  that would have caught B1 — `no-dupe-args`, `no-duplicate-case`, `no-unreachable`,
  `use-isnan`, etc.) runs in CI via `npx eslint@9` next to the build-drift gate.

### Deferred items — since resolved (round-9)

All four items originally deferred above were later implemented in a dedicated pass:

- **AR2 server-side conflict rejection** — `save_household` gained an additive 2-arg
  overload (`p_data`, `p_expected_saved_at`); rejects a save with `CONFLICT: ...` when
  another device's save landed first instead of silently overwriting it. Client tracks
  the `savedAt` it last loaded and reloads + toasts on conflict. The 1-arg overload
  stays so an un-migrated tab still works.
- **R6 payload/props consolidation** — `useHouseholdData`'s ~40 flat named params
  collapsed into `{household, values, setters}`, backed by a `HOUSEHOLD_SYNCED_FIELDS`
  registry shared by `applyPayload`/`buildPayload` so a field can't drift between them.
  The wire format itself didn't need to change, so this shipped without a payload
  migration.
- **AR4 remainder** — `app-data.js` split into `dates.js`, `format.js`, `biometric.js`,
  `migrate.js` (888 → 349 lines).
- **AR5 integer cents** — money is now stored as integer cents everywhere (state,
  localStorage, the cloud payload, JSON backups), not dollar-floats. A schema-v8
  migration (`migrate.js`) converts existing localStorage data once; `household-sync.js`
  and the Backup Import path upgrade older cloud/backup payloads the same way, gated on
  a `schemaVersion` field already tracked server-side (`household_settings.schema_version`)
  from the AR2 work. `fmt()`/`fmtAxisK()`/`fmtVarRange()` are the sole cents→dollars
  display boundary; `dollarsToCents()`/`centsToDollars()` are the sole conversion points
  at form inputs. `supabase/schema.sql`'s `numeric(14,2)` money columns needed no schema
  change — they pass values through untouched regardless of unit, documented inline.
