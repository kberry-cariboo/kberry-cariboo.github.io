# CashFlow Budget — Full Application Audit (Round 7)

**Date:** July 21, 2026 · **Scope:** design/UX best practices, consistency, accessibility,
interaction & mobile issues, coding best practices (inline CSS, duplication, bugs, syntax),
React best practices, and architecture ·
**Method:** complete read of `src/` (all 14 app modules, ~10,600 lines), `build.js`,
`index.template.html`, CI workflow, and test harness; mechanical scans (inline-style census,
duplicate-prop scan, CSS-selector validity, storage-key audit); `node build.js` syntax gate;
the 29-test Playwright regression suite (**29/29 passing** on the audited tree).

This is a findings-only round — no code was changed. Six prior audit rounds
(`UI_AUDIT_2026-07.md` → `INLINE_STYLE_CENTRALIZATION_2026-07-20.md`) have landed and held:
all 15 modal surfaces carry dialog semantics, the SVG icon system is complete, the focus
trap and hash routing work, the mobile shell (bottom nav, internal scroller, bottom-sheet
modals, 16px inputs, safe-area insets) is solid, and the inline-style count is down to
~936 mostly-legitimate dynamic values. What follows is what's *left*, ordered by severity.

---

## 1. Bugs (correctness / syntax)

### B1. `paidBtn` has a duplicate `className` prop — touch halo silently lost
`src/components/plan-dashboard.js:869` and `:874` — the Upcoming widget's mark-paid button
declares `className: "cf-checkbtn"` and then, six lines later in the same props object,
`className: "paid-btn"`. In a JS object literal the second key wins, so `cf-checkbtn`
(the `::after` pseudo-element that pads the hit area to ~42px) never applies. The visible
button is 22×22px — **below every touch-target minimum**, on the single most-tapped
dashboard control. Fix: `className: "cf-checkbtn paid-btn"` on one line. (Duplicate keys
in a literal are also a lint-level syntax smell that esbuild passes through silently.)

### B2. Schema-v4 migration is a no-op — `cf_budgettargets` data is never migrated
`src/lib/app-data.js:109-114`. The live key is the typo'd `cf_budgtargets` (App.js:99).
The migration reads both spellings, then:

```js
if (!correct && typo) {                       // typo exists, correct absent
  localStorage.setItem("cf_budgtargets", typo);   // rewrites typo with itself
  localStorage.removeItem("cf_budgettargets");    // removes a key already absent
}
```

Every branch of this is a no-op. If the intent was to rescue targets stored under the
correctly-spelled key, the condition must be `correct && !typo` and the `setItem` must
write `correct`'s value. As written, any user who ever had data under `cf_budgettargets`
loses their budget targets on upgrade.

### B3. `cf_activeYear` defaults to a hardcoded `2026`
`src/App.js:83` — `useLS("cf_activeYear", 2026)` while `cf_years` defaults to
`new Date().getFullYear()`. From January 2027, a fresh install gets
`yearConfigs=[{year:2027}]` but `activeYear=2026`: the dashboard, budget, and forecast all
render an empty year, and the year pills show nothing selected. Default should be
`() => new Date().getFullYear()`.

### B4. Two conflicting `@keyframes slideUp` definitions — undo toast loses its centering
`GLOBAL_STYLES` defines `slideUp` twice: `app-data.js:1496`
(`translate(-50%,20px) → translate(-50%,0)`) and `app-data.js:1655`
(`translateY(40px) → translateY(0)`). The later definition wins document-wide. `.undo-toast`
is centered with a static `transform: translateX(-50%)` **and** animated with `slideUp` —
during the 0.25s animation the keyframe's `transform` replaces the static one, so the toast
animates in shifted half its width to the right, then snaps left when the animation ends.
Delete one definition and give the toast a keyframe that preserves `translateX(-50%)`
(the 1496 version is exactly that).

### B5. Letter shortcuts fire while modals are open
`src/App.js:517-576` — the digit shortcuts (`1`–`5`, line 243) and the `/` search shortcut
both bail when `.modal-overlay` is present; the letter handler (`D/B/P/A/S/N`, arrows, `?`)
checks only whether an input is focused. With a `ConfirmDialog` open (its Delete button is
`autoFocus`ed — a `BUTTON`, not an input), pressing `d` or `←`/`→` switches tabs or months
*underneath* the dialog. Same guard (`document.querySelector(".modal-overlay")`) belongs in
the second handler — or better, merge the two keydown handlers (see R3).

### B6. Initial page load pushes a redundant history entry
`src/App.js:122-133` — the hash-sync effect runs on mount; on a hashless first load it
`pushState`s `#/dashboard`, so the first Back press appears to do nothing. Use
`history.replaceState` when there was no prior hash (first run), `pushState` thereafter.

### B7. `renderAlertRow` renders keyless list items
`src/components/settings.js:8-27` — `critical.map((ev, i) => renderAlertRow(ev, i))` returns
buttons with no `key` (the `i` parameter is accepted and unused). React key warning in
console, positional reconciliation on re-sort.

### B8. Props passed to components that don't accept them (silently dead)
- `SectionTitle` takes `{ children, action }` only, but `PlanView` passes
  `className="mb-0"` (`plan-dashboard.js:100`) — ignored.
- `CatChip` takes `{ category, categories, categoryColors, style }`, but callers pass
  `className: "text-9"` in at least four places (`budget.js:304`, `budget.js:424`,
  `plan-dashboard.js:889`, `plan-dashboard.js:1042`) — ignored, so those chips render at
  the default 10px instead of the intended 9px. Either add `className` support to the two
  primitives or drop the dead props; today the code *looks* styled but isn't.

### B9. Dead / malformed CSS still coupled to inline styles that no longer exist
Round 6 removed the inline styles these selectors targeted, leaving them inert:
- `app-data.js:1618` — `[style*="padding:"20px 24px""]` is malformed attribute-selector
  quoting (browsers drop the rule) *and* targets nothing since cards moved to `.cf-card`.
- `app-data.js:1569` — `.glance-grid [style*="IBM Plex Mono"]` matches nothing
  (`.glance-value` uses Inter with `font-variant-numeric`).
- `app-data.js:1484` / `:1495` — the `span[style*="opacity:0"]` reveal-on-hover rules match
  zero elements (a source grep finds no `opacity:0` inline styles left).
Delete all four; they're traps for the next person editing styles.

### B10. `dismissBackup` leaks its object URL
`src/App.js:228-234` creates a blob URL for the backup download and never
`URL.revokeObjectURL`s it (the Settings export and `downloadCSV` both do). One-line fix.

---

## 2. Accessibility

### A1. Dark mode never sets `color-scheme`
Nothing in the codebase sets `color-scheme` (verified by grep). In dark mode, native UI the
CSS variables can't reach — `<select>` dropdown lists, `<input type="date">`/month pickers,
scrollbars, the autofill highlight — all render light-on-light-context. The theme
`useLayoutEffect` (App.js:304) should also set
`document.documentElement.style.colorScheme = darkMode ? "dark" : "light"`, and
`index.template.html` should carry `<meta name="color-scheme" content="dark light">`.
Related: the static `theme-color` (`#1C2B3A`) is fine while the header is navy in both
themes, but if the header ever follows the theme this needs a dynamic update too.

### A2. User menu declares `aria-haspopup="menu"` but the popup isn't a menu
`App.js:729-801` — the avatar button advertises a menu, yet the panel is a plain `div`
with plain buttons: no `role="menu"`/`role="menuitem"`, no arrow-key navigation, no Esc
close (backdrop click only), and focus is not moved into or restored from it. Either drop
`aria-haspopup` (honest: it's a disclosure) or finish the menu pattern. The desktop
`ContextMenu` has the same gap (Esc works; no roles, no arrow keys, no focus move).

### A3. `FilterPill` popovers miss disclosure semantics
`forms.js:521-575` — the trigger has no `aria-expanded`/`aria-haspopup` (compare
`TemplatePicker`, which has both), and the option rows are `<label onClick>` wrappers whose
checkboxes have a no-op `onChange` — keyboard users can focus the checkbox but
Space toggles only via the synthesized label click, and the label-click path runs the
handler twice per click (works today only because the second call is idempotent within one
render). Move the logic into the checkbox `onChange` and add the ARIA state.

### A4. Drag-only reordering has no keyboard path
Register/Budget column headers (`draggable` `<th>`) and Settings category rows are
reorderable exclusively by pointer drag. The Dashboard customize modal shows the right
pattern (↑/↓ buttons); categories and columns need the same fallback (also serves touch
users — HTML5 drag events don't fire from touch).

### A5. Async feedback mostly lacks live regions
`FeedbackToast` correctly uses `role="status"`, but inline outcomes elsewhere — sync
status/`houseMsg`, `yearMsg`/`catMsg`/`memberMsg` in Settings, `pfErr`/`pfOk` in the
profile modals, AI error banner — are plain divs. Screen-reader users get no announcement
when a save fails. Add `role="status"` (or `role="alert"` for errors) to these message
containers; the auth screens already do this (`cf-error-banner … role="alert"`).

### A6. Hidden-scrollbar tables give keyboard users no scroll affordance
`.hscroll`/`.reg-table-wrap` hide scrollbars in every engine and are not focusable, so a
keyboard-only user cannot horizontally scroll the monthly grid on a narrow desktop window.
Add `tabindex="0"` + `role="region"` + `aria-label` to scroll containers (also restores a
visible focus ring cue).

---

## 3. Mobile & interaction

### M1. iOS has no path to "Edit recurring entry" from the Budget ledger
Budget monthly/daily cards expose the context menu only via `onContextMenu`
(`budget.js:343`, `:700`), which iOS Safari never fires (no long-press contextmenu event).
The card tap opens the *occurrence* editor, whose hint literally says
'Right-click → "Edit recurring entry"' — meaningless on a phone. The Register's mobile
cards solved this with an explicit `⋮` button; Budget cards (and Plan's goal/debt rows,
which are context-menu-first with a `⋮` only on goals) should do the same. At minimum, add
an "Edit recurring entry" action inside `OccurrenceEditModal` — it already knows the parent
entry.

### M2. Upcoming "paid" button is a 22px target (see B1)
Consequence of the duplicate-className bug; called out separately because it's the one
regression that undoes a round-4 finding (F2 tap-target census).

### M3. Pull-to-refresh can clobber unsaved local edits
`App.js:428-461` + `household-sync.js`: autosave debounces 2s; `houseLoad()` (pull-down or
"Reload from Cloud") applies the server payload wholesale. Edit → pull down within 2s →
the pending save is cancelled by re-render and the server copy overwrites the local edit
with no prompt. Guard: flush the pending save before loading, or diff `savedAt` and warn.

### M4. Swipe-month gesture vs. horizontal table scroll
The 480px budget grid deliberately restores all 7 columns inside an `.hscroll` swipe-pane,
while the same surface listens for ≥140px horizontal swipes to change month
(`budget.js:434-463`). The handler doesn't exclude `.hscroll` descendants, so a fast
table-scroll fling that travels 140px in <600ms with <60px vertical drift changes the month
mid-scroll. Exclude targets inside `.hscroll` (like inputs/buttons already are) on surfaces
where the table itself pans.

### M5. `ContextMenu` measures with a hardcoded row height
`forms.js:454` — `menuH = items.length * 38 + 8` positions the desktop menu; touch items
are 15px font + 15px×2 padding (~50px). Wrong-height clamping can push the last items
off-screen near the viewport bottom. Measure after render (ref + `getBoundingClientRect`)
or clamp with `max-height + overflow-y:auto`.

---

## 4. Design / UX consistency

### D1. Two parallel "panel" systems for the same job
The entry form opens as a **`fab-panel`** (anchored bottom-right, backdrop, no dialog role,
no focus trap — `register.js:288-312`) on desktop Entries, but as a **`modal-overlay`
bottom-sheet** (role="dialog", trapped, Esc-guarded) from Budget (`budget.js:592`) and the
CSV importer likewise splits between `fab-panel` (Entries) and card-in-flow. Same form, two
interaction contracts: the fab-panel version misses the round-3 dialog semantics, the focus
trap (trap only queries `.modal-overlay`), and Esc-to-close. Converge on the modal system;
keep the FAB purely as the launcher.

### D2. Confirm-dialog affordances diverge
`ConfirmDialog` (used ~8 places) cannot be dismissed by clicking the backdrop, while every
other overlay closes on backdrop click; conversely it's the only surface that `autoFocus`es
its *destructive* button (Enter = delete). Both choices are defensible alone but
inconsistent together — recommended: backdrop-dismiss allowed, initial focus on Cancel.

### D3. Expense/negative color conventions drift by surface
The design system's stated rule (round-2/round-5 docs) is neutral ink for expenses with a
single minus-sign convention. Mostly held — but the **daily view** colors expense amounts
`var(--red)` (`budget.js:712`), the annual YoY table colors the whole Expenses column red
(`plan-dashboard.js:1197`), and mobile monthly totals use raw `#FF8A7A` (`.mno-700-coral`)
while desktop totals use the same coral only for negatives. Pick one rule; the coral
literal should at least become a token (it appears 4×).

### D4. "Alerts" is a hidden tab with three entry points and no way back
`tab === "alerts"` renders `AlertsPanel`, reachable from the bell, the low-balance banner,
and the nav dot — but it's absent from both the desktop tab bar and bottom nav, so once
there, no nav item is active (`aria-current` nothing) and the only exits are the bell
toggle or knowing a shortcut. Give the panel a back affordance (or render it as a sheet
over the current tab instead of a tab).

### D5. Header search affordance is desktop-only, but its consumers are mobile-first
`.header-search` is `display:none` ≤768px, yet global search drives the month-pill match
dots, the budget/forecast/register search banners, and the budget tab search dot — none of
which a phone user can ever trigger. Either surface a search affordance on mobile (e.g. in
the Entries toolbar it exists — but it doesn't set `globalSearch`) or accept and document
the asymmetry. Related copy nit: the Register placeholder advertises the `>100` operator
but the header search placeholder ("Search…") doesn't hint at operators at all.

### D6. Naming/copy nits
- `.year-pills-mobile` is the class that's *hidden* on mobile (inverted name).
- `settings-quicklinks` anchor order is alphabetical-ish but doesn't match the actual
  section order on the page (AI Key → Alert → Appearance → Years → Backup → *Sync* →
  Categories → Security → *Target Reset* → Danger; Sync and Target Reset have no pill).
- `EntryForm`'s "Save as Template" button silently overwrites any template with the same
  description and gives no confirmation toast.

---

## 5. React best practices

### R1. Components defined inside components (remount every render)
`GlanceTile` (`plan-dashboard.js:781`), `VizRow` (`forecast-plan.js:468`), `StratCard`
(`plan-dashboard.js:496`), `TodayLine`/`TodayLineCard` (`budget.js:328-329`) are function
components declared inside their parent's render. Each parent render creates a new
component type, so React unmounts and remounts their DOM subtrees instead of diffing —
wasted work on every dashboard state change (chart toggles, etc.) and a guaranteed defeat
of any future memoization. Hoist them to module scope (they only need props they already
receive). [`rerender-no-inline-components`]

### R2. Broken/no-op memoization
- `ForecastView` (`forecast-plan.js:4-18`): `today = new Date()` is created in render and
  listed in `futureEvents`' dependency array — the memo recomputes every render. Snapshot
  the date (`useMemo(() => new Date(), [])` or derive a primitive day-key).
- `BudgetView` (`budget.js:220`, `:393-401`): `monthEvents` is an unmemoized filter whose
  identity changes each render and then feeds the `days` `useMemo` — same effect.
- `AIInsightsView.vizCtx` depends on `buildContext` closing over unlisted values; it works
  because `flow`/`openBal` are listed, but `buildContext` also reads `localStorage` (see R5).

### R3. Overlapping global keydown handlers
App.js registers **three** window keydown handlers (digits+`/` at :237, letters+arrows at
:517, profile-modal Esc at :284) plus the capture-phase focus trap, and every modal adds
its own Esc listener. Beyond bug B5, the split is why the guards drifted. One
`useEffect`-managed keymap (with a single modal check) would be smaller and safer.

### R4. Custom-event bus where props/context would do
`cf:goto-tab`, `cf:goto-budget-sub`, `cf:quickadd`, `cf:reg-open-new`, `cf:reg-open-csv`,
`cf:toast` — six window-level CustomEvents used for parent→child and sibling communication
inside a single React tree. `toast` is a reasonable pub/sub; the navigation ones exist only
to avoid passing `setTab`/`setBudgetSub` (which most consumers already receive as props —
e.g. `AlertsPanel` gets `setTab` as a prop *and* dispatches `cf:goto-budget-sub`).
Consolidate on a small NavContext; the event bus hides real data flow from React tooling.

### R5. State read around React instead of through it
`AIInsightsView.buildContext` reads `cf_goals` and `cf_debt_data` straight from
`localStorage` (`forecast-plan.js:219-227`) even though `goals` lives in App state one prop
away (it's already passed to `PlanView` and synced to Supabase). If a household member's
sync updates goals mid-session, the AI report reads the stale local copy. `DashboardView`'s
`debtSnap` widget does the same for `cf_debt_data` (`plan-dashboard.js:1052`). Pass them as
props; `localStorage` should have exactly one reader/writer per key (`useLS`).

### R6. Uncontrolled prop-drilling pressure
`SettingsView` takes ~45 props; `useHouseholdData` takes 40 (20 value/setter pairs);
`DashboardView` 24. Every new synced setting touches four call sites (App state,
`useHouseholdData` args, `applyPayload`, `buildPayload`). A single `settings` object (one
`useLS` key, one setter) or a reducer+context would collapse most of this and remove the
main source of future wiring bugs. This is the largest *structural* React issue; everything
else is local.

### R7. Minor
- `UndoToast`'s countdown effect has `[]` deps but a fresh entry (second delete while
  visible) doesn't reset the 5s timer — the second deletion may get <1s of undo window.
- `Sparkline`/`getMonthSummaries` are recomputed per render in dashboards — fine at current
  data sizes; note only if entry counts grow (500+ entries × 12 expansions).
- `expandEntries` runs per year per render pass in `yearFlows` `useMemo` — correctly
  memoized at the top; keep new consumers going through `yearFlows` rather than calling
  `expandEntries` ad hoc (Settings' year-sync already re-expands, acceptable as an action).

---

## 6. Architecture

### AR1. The "source" is compiled output
`src/` is esbuild-transpiled JS (`__spreadValues`, `/* @__PURE__ */`, `…` escapes,
`var _a` chains) checked in as the editing source. It works — build.js validates and CI
gates drift — but every hand edit fights the transpiler idiom (B1's duplicate key is
exactly the class of bug a linter on real source would catch, and none can run usefully on
this output). Recommended, incremental: (1) add ESLint with just
`no-dupe-keys`, `react/jsx-key`-equivalent rules that *do* work on `React.createElement`
code, wired into CI next to `node build.js`; (2) longer term, regenerate a true JSX source
tree once and make esbuild part of `build.js` — the single-file deployment story doesn't
change.

### AR2. Sync is last-write-wins with no conflict detection
`save_household` uploads the entire payload; `savedAt` is written but never compared. Two
household members editing in the same window silently overwrite each other (2s debounce
windows collide easily), and M3's load-over-unsaved-edits is the single-device variant.
Minimum viable fix: send the `savedAt` you loaded, have the RPC reject if the row is newer,
and on rejection auto-load + toast ("Updated on another device — reloaded"). True merging
isn't needed for a two-person household; *detecting* the stomp is.

### AR3. `GLOBAL_STYLES` is a 1,300-line string in a data module
It's the de-facto stylesheet, but it lives in `app-data.js` between the theme objects and
the recurrence engine, is re-injected as a `<style>` element per auth screen, and its
per-component sections (`/* ── budget.js ── */`) already mirror real files. Move it to
`src/styles.css` and have `build.js` inline it into the template `<head>` — styles stop
re-parsing on React mount, the CSS becomes lintable (B4/B9 were both invisible precisely
because this is a JS string), and `app-data.js` drops 40% of its bulk.

### AR4. `app-data.js` is four modules in a trench coat
Migrations, WebAuthn, theme tokens+CSS, date/recurrence engine, formatting, search, debt
sim, palettes — 2,200 lines. The build already concatenates freely; splitting into
`styles.css`, `lib/dates.js` (recurrence/flow), `lib/format.js`, `lib/biometric.js`,
`lib/migrate.js` costs nothing at runtime and makes review diffs meaningful.

### AR5. Money as floats
Amount math is `Math.round(x*100)/100` at ~40 call sites, and correctness depends on
remembering to round after every fold (the BvA carry loop and yoy sums do; a few reduce
chains don't). Not causing visible defects today thanks to 2-dp inputs, but integer cents
(or one `sumMoney` helper used everywhere) would close the class of bug permanently.

### AR6. Good bones worth keeping (explicitly not problems)
Vendored React 19.2.5 + mini-recharts (no CDN, deterministic build) · migration
gate with fresh-install short-circuit · `?selftest` in-app suite + Playwright regression
suite + CI drift gate on `index.html` · autosave-disabled-until-load-succeeds rule ·
RLS-aware error surfacing in `updateMemberName` · receipts diffed out of the payload ·
`prefers-reduced-motion`, focus-visible ring, and the modal system where it's used.

---

## 7. Prioritized punch list

**Fix now (small, user-visible):**
1. B1 duplicate `className` → restores 44px paid-button target (also M2).
2. B3 `cf_activeYear` hardcoded 2026 → breaks every fresh install in 5 months.
3. B2 no-op v4 migration (decide intent; current code does nothing).
4. B5 modal guard on letter-shortcut handler.
5. B4 delete duplicate `slideUp` keyframes.
6. A1 `color-scheme` for dark mode.

**Next round (medium):**
7. M1 iOS-reachable "Edit recurring entry" (⋮ on budget cards or action in the occurrence modal).
8. D1 converge fab-panel forms onto the modal system (focus trap + Esc + role come free).
9. M3/AR2 sync stomp detection (flush-before-load + `savedAt` compare).
10. R1 hoist inline-defined components; R2 fix the two broken memos.
11. A2/A3 menu/disclosure semantics; B7/B8 dead props and missing key.

**Structural (when touching the area anyway):**
12. AR3 styles out of the JS string; delete B9's dead selectors on the way.
13. AR1 lint gate in CI (no-dupe-keys alone would have caught B1).
14. R6/AR4 settings-object consolidation and app-data split.
15. D3 single expense-color rule; tokenize `#FF8A7A`.
