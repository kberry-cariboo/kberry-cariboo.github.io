# Mobile UI Audit — CashFlow Budget

> **Status: all 21 items addressed.** The findings below are kept as written —
> they are the record of what was wrong and why, and every fix commit points
> back at a section number here. See §7 for the item-by-item outcome.

Audited build `v183` (`3c599fd`). Findings come from reading `src/` **and** from
running the built app in Chromium at 320 / 390 / 430 / 820 px CSS widths with
`isMobile: true, hasTouch: true`, against ~20 realistic entries, two budget
years, two debts and two goals. Measurements (box overflow, touch-target size,
overlap with the fixed bottom nav) were taken from the live DOM, not estimated.

Nothing in this document changes behaviour — it is the audit itself. Each
finding names the file and line so the fix is unambiguous.

---

## How the responsive system is wired (context for everything below)

The app switches on **two independent axes**, and they disagree:

| Axis | Threshold | What it controls |
| --- | --- | --- |
| `@media (pointer:coarse)` | pointer type | bottom nav vs. top tab bar, touch minimums, camera capture, app-shell scrolling, context menus as bottom sheets |
| `@media (max-width:768px)` + `useIsMobile()` | width | table-vs-card layouts, header search, year pills, sub-tab labels, bottom-sheet modals |
| `@media (max-width:480px)` + `useIsPhone()` | width | tightest column sets, KPI grids |

Because the axes are different, an 820 px touch tablet gets the **phone bottom
nav** and the **desktop tables** at once, while a 700 px-wide desktop window gets
the **phone card layouts** and the **desktop top tab bar**. Neither combination
is designed for; both are reachable today. Picking one axis (width, with
`pointer:coarse` used only for genuinely input-related rules like camera capture
and hit-target padding) would remove a whole class of these bugs.

---

## 1. Confirmed layout bugs

### 1.1 Dashboard "at a glance" tiles overflow and are clipped — content becomes unreachable

`src/components/dashboard.js:776` builds the glance row with
`gridTemplateColumns: repeat(3,1fr)` and there is **no mobile override** for
`.glance-grid` anywhere in `styles.css`. `1fr` is `minmax(auto,1fr)`, so the
tiles' min-content width wins and the grid blows past the viewport. The parent
`.dash-page` is `overflow-x:hidden` (`styles.css:890`), so the overflow is
*clipped*, not scrollable.

Measured at 320 px with a modest balance:

```
div.dash-page   clipped=true  scrollWidth=354 clientWidth=308
div.glance-tile past=true     right=360  viewport=320
```

At 390 px it survives four-figure balances but fails on six-figure ones — the
first capture with $3.9 M balances cut "Due rest of Aug" clean off the screen.

The KPI cards already solve exactly this problem
(`styles.css:1354–1361` steps `.kpi-value` down to 15 px and tightens the label
tracking at ≤360 px). `.glance-tile` / `.glance-value` got none of it.

**Fix:** `@media(max-width:480px){.glance-grid{grid-template-columns:1fr 1fr!important}}`
plus the same font step-down `.kpi-card` gets, and let a lone third tile span
both columns.

### 1.2 "Monthly Totals" is cut off on narrow phones

`.monthly-totals-row` (`styles.css:682`) is `justify-content:space-between` and
`.totals-amounts-row` (`styles.css:684`) has `gap:12px` with no wrap and no
shrink. At 320 px the three figures need 250 px inside a 232 px space:

```
span.totals-amounts-row past=true right=337 viewport=320   ("$10,630.00 $6,190.73 +$4,439.27")
div.cf-card--flush      clipped=true scrollWidth=330 clientWidth=306
```

The surplus renders as `+$4,439` with the cents sliced off by the card's
`overflow:hidden`. This is the summary line of the app's primary screen.
(Screenshot: `AUG` totals row, 320 px.)

**Fix:** stack the totals row (label above amounts) below ~360 px, or let
`.totals-amounts-row` wrap.

### 1.3 The footer is permanently underneath the bottom nav

`.content-area` gets `padding-bottom:calc(92px + env(safe-area-inset-bottom))`
on coarse pointers (`styles.css:1074`), but `.app-footer` is a **sibling** of
`<main>` inside `.app-scroll` (`App.js:1421`) and gets no clearance. Because
`.app-footer` has `margin-top:auto` in a `min-height:100vh` flex column, it is
pinned to the bottom on short pages and is the last element on long ones —
either way the fixed nav covers it.

```
div.app-footer   top=763 bottom=844   navTop=795
a.cf-footer-link top=781 bottom=816   navTop=795   ("Privacy")
```

**Privacy and Terms of Use are not tappable on any phone.** For an app that
stores household financial data, that is the one link that has to work.

**Fix:** move the nav clearance from `.content-area` to `.app-scroll`
(`padding-bottom`) so every child clears it, or add matching padding to
`.app-footer`.

### 1.4 Settings → Manage Categories: the row actions run off-screen at 320 px

`.cat-row` wraps, but `.cat-actions-row` is `margin-left:auto;flex-shrink:0`
(`styles.css:619`) so the ↑ ↓ Reset Edit Remove cluster can neither shrink nor
wrap internally. At 320 px it pushes the whole app root 61 px wide:

```
div.app-scroll clipped=true scrollWidth=381 clientWidth=320
button "+ Add" past=true right=381 viewport=320
```

`html,body{overflow-x:clip}` (`styles.css:981`) then makes it unrecoverable —
"Remove" is half off the card and the **"+ Add" button for creating a category
is entirely outside the viewport with no way to scroll to it.**
(Screenshot: `x-320-settings-categories.png`.)

**Fix:** allow `.cat-actions-row` to wrap and drop `flex-shrink:0` below 480 px;
put the add-category input and button on their own row.

### 1.5 Entries filter sheet: the date range wraps into nonsense

`entries.js:217` puts `From [input] To [input] ✕` in one `cf-row cf-gap-4
cf-wrap`. At phone width the first input consumes the line, so **"To" is
orphaned on the previous line, above and right of the field it labels**, and the
second input drops below it. Visible in `phone-11-entries-filters.png` and
`x-390-filterpill-open.png`.

They are also plain `<span>`s, not `<label for>`s — the `aria-label`s carry
screen readers but sighted users get a label pointing at the wrong control.

**Fix:** stack as two labelled fields below 480 px.

### 1.6 Filter dropdowns escape the filter sheet

`.filter-pill-dropdown` is `position:absolute` with `max-height:260px`
(`styles.css:380`) inside `.entries-mobilefilters-card`, which is itself
`max-height:80vh;overflow-y:auto` (`styles.css:427`). Opening "Category" in the
mobile sheet renders a list that runs past the bottom of the screen, covering the
date fields and the "Show results" button, with its own scrollport partly
off-viewport. (Screenshot: `x-390-filterpill-open.png`.)

`FilterPill` also closes only on `mousedown` (`forms.js:461`) — `ContextMenu`
registers `touchstart` as well (`forms.js:368`). The pill relies on synthetic
mouse events, which is why it feels laggy to dismiss on touch.

**Fix:** inside the mobile sheet, render the options inline (accordion) rather
than as a floating popover; add the `touchstart` outside-click listener.

### 1.7 Fixed-pixel truncation where there is room to spare

- `.forecast-desc-cell{max-width:130px!important}` at ≤480 and `180px` at ≤768
  truncates "Groceries - weekly sh…" while the Balance column has slack:
  `td.forecast-desc-cell clipped=true scrollWidth=145 clientWidth=141`.
- `.entries-mobile-notes{max-width:120px}` (`styles.css:443`) truncates at a
  hardcoded 120 px regardless of viewport:
  `clipped=true scrollWidth=133 clientWidth=120`.

**Fix:** use `flex:1;min-width:0` with ellipsis instead of pixel caps.

---

## 2. Features that silently disappear on mobile

### 2.1 "Budget vs Actual" hides the budget

`styles.css:1338` — `@media(max-width:480px){.bva-target{display:none!important}}`
with the comment *"it's already visible in the input field"*. **There is no input
field.** `budget.js:1020–1022` renders the target as a text span; editing happens
through the kebab → modal. So on a phone a BvA row shows the actual spend and
(only if over) the overage — the target itself is nowhere on screen, and a
category with no target looks identical to one that is comfortably under.
(Screenshot: `phone-06-budget-bva.png` — "Savings $500.00" with no bar, no
target, no way to tell.)

The comment describes an input that was removed at some point; the rule outlived
it.

### 2.2 Templates can be used on mobile but never created

`styles.css:1260` — `@media(max-width:768px){.ef-save-template{display:none!important}}`
hides "Save as Template" in the entry form. `TemplatePicker` stays visible, and
**Settings → Templates literally instructs the user to** *"Save templates from
the entry form using 'Save as template'"* (`settings.js`, templates page) — a
button that does not exist on the device they're reading it on. Templates can
only be deleted from a phone.

### 2.3 Column reordering is advertised on touch but cannot work

`entries.js:336` and `budget.js:683` set `draggable:true` with HTML5
`onDragStart`/`onDrop`, plus `cursor:grab`, drag dots, and an aria hint. HTML5
drag-and-drop does not fire on touch. On an 820 px tablet the user sees every
affordance and nothing happens. (The category list in Settings gets this right —
it ships ↑/↓ buttons alongside the drag.)

Worse: below 768 px both grids are replaced by cards, so `cf_col_order` and
`cf_budget_col_order` — settings that are persisted and synced across the
household — have **no effect at all** on a phone.

### 2.4 Global search is desktop-only, and the mobile substitute is unlabelled

`.header-search{display:none!important}` at ≤768 (`styles.css:1140`). The
documented substitute is the Entries toolbar search, whose placeholder is
deliberately empty (`entries.js:266`, `styles.css:416–420`). On a phone that
renders as a **wide empty rounded box with a magnifier**, sitting next to
"Filters" — see `phone-08-budget-entries.png`. The desktop reasoning ("the
magnifier carries the meaning") doesn't survive the size change.

Consequences that follow from search being desktop-only: the month-strip match
dots, the "matching months" search banners, and the cross-view search jump
(`App.js:399–410`) are all unreachable from a phone.

### 2.5 Backup/CSV export is likely to fail in an installed iOS PWA

`downloadCSV` (`lib/format.js:32`) and the backup export (`App.js:376`) build a
detached `<a download>` on an object URL, `.click()` it, and revoke the URL
synchronously on the next line. The anchor is never appended to the document,
and the synchronous revoke can abort a download that hasn't started. Both are
known-fragile on iOS Safari / standalone PWAs. Given that the app *nudges* users
to export a backup every 30 days (`App.js:348`) and Settings names local export
as the only backup path, this deserves a real device check.

### 2.6 "Daily" is reachable on mobile but has no tab

`.budget-subtab-pill.bp-daily{display:none!important}` at ≤768 (`styles.css:1270`),
yet `daily` is a valid deep-link segment (`ROUTE_BUDGET_SUBS`, `app-data.js:351`)
and `cf_budget_subtab` persists per device. Land on `#/budget/daily` on a phone
and you get the Daily view with a sub-tab strip where **nothing is selected** —
`renderDailyMobileCards()` exists and runs, so the view is fully built, just
unlabelled and unreachable by tapping.

---

## 3. Touch targets

WCAG 2.5.5 / Material / HIG all want ≥44 px. The coarse-pointer block
(`styles.css:1037–1055`) deliberately sets 40 px for `.cf-btn` and **36 px** for
`.cf-pill`, and it misses the controls that only exist on mobile. Measured at
390 px:

| Control | Measured | Where |
| --- | --- | --- |
| `.mobile-year-badge--btn` — year switcher | **84 × 27** | mobile-only control |
| `.entries-mobile-filter-btn` — "⚙️ Filters" | **89 × 34** | mobile-only control |
| `.user-avatar-btn` — the only route to profile / password / sign-out | **34 × 34** | `App.js:1059` |
| `.cf-pill.month-pill` — month switching | 36–43 × **36** | primary navigation |
| `.budget-subtab-pill` | 40 × 40 | primary sub-navigation |
| `.entries-search-input` | 200 × **32** | |
| `select` (rows per page) | 58 × **32** | |
| `.cf-footer-link` | 47 × **35** | already has coarse-pointer padding |
| `.ai-settings-link` — "Settings → General" | 121 × **16** | `AIInsightsView` |
| `.weekday-btn` | min 34 × **32** (from CSS) | `styles.css:358`, recurrence editor |

The two mobile-only controls being the *smallest* things on screen is the part
worth fixing first: they were added for touch and then styled at desktop scale.

---

## 4. Inconsistencies

### 4.1 Three different mobile presentations for the same kind of list, inside one tab

Within **Budget**: Monthly → cards; Forecast → a real table; Entries → cards.
Same data shape (date, description, category, amount, running balance), three
layouts, three sets of affordances:

| | mark paid | edit | category shown | running balance |
| --- | --- | --- | --- | --- |
| Monthly (cards) | ✅ checkbox | ✅ kebab | ✅ chip | ✅ |
| Forecast (table) | ❌ | ❌ | ❌ hidden | ✅ |
| Entries (cards) | n/a | ✅ kebab | ✅ chip | n/a |

A row you can act on in Monthly becomes inert three taps away in Forecast.

### 4.2 Inactive sub-tab pills are invisible in light mode

`BudgetSubTabs`/`PlanSubTabs` (`auth-misc.js:754`, `:788`) set inactive
`background: var(--stripe)` with `border:none`. In `LIGHT`, `stripe` is
`#F7F4EF` — **byte-identical to `bg`** (`app-data.js:94–95`). Combined with
`.bp-label-full{display:none}` on mobile, inactive sub-tabs render as bare
40 × 40 glyphs floating on the page with no container at all
(`phone-04-budget-monthly.png`). Dark mode is fine (`#1E2D3E` vs `#111921`).

Compounding it: with labels hidden, Budget's four mobile tabs are ⊞ / ⚖ / ↗ / 📄
and Plan's are 💳 / ⛰ / ◎. "Payoff Strategy" as a mountain and "Budget vs
Actual" as a bar chart are not learnable, and `title` tooltips never fire on
touch. There is room for short labels at 390 px — four 40 px pills plus gaps use
under half the available width.

### 4.3 The year badge sits above the sub-tabs on Budget and below them on Plan

`App.js:1254` renders `MobileYearBadge` → `BudgetSubTabs`; `App.js:1321` renders
`PlanSubTabs` and lets `PlanView` render its own badge underneath. Same two
elements, opposite order, one tap apart.

### 4.4 Bottom-sheet vocabulary is inconsistent

- `ContextMenu` (touch) has a drag handle, dismisses on backdrop tap.
- All 15 `.modal-overlay` sheets have **no** handle and **no** backdrop dismiss
  (deliberate, per the `ConfirmDialog` comment) — so the two sheet types behave
  oppositely.
- **Neither** supports swipe-down-to-dismiss. `.ctx-menu-handle` is a
  non-interactive `<div>`: an affordance that promises a gesture the app doesn't
  implement.
- Close buttons use three classes for one ✕: `.cf-close-x` (18 px),
  `.fab-panel-close` (18 px), `.shortcuts-close` (20 px) — and `.fab-panel-close`
  is named after a component that no longer exists.
- Sheet actions (Cancel / Save Entry) scroll away with the content instead of
  being pinned. With "Repeats" enabled the Add Entry sheet exceeds its 92 vh cap
  and Save is off-screen (`phone-10-add-entry-recur.png`).

### 4.5 `autoFocus` + bottom sheet + software keyboard

`EntryForm` autofocuses Description (`forms.js:196`) and `OccurrenceEditModal`
autofocuses its Description (`misc-ui.js:339`). The keyboard opens during the
sheet's slide-up animation, and because `.modal-overlay` is `position:fixed;
inset:0` against the *layout* viewport, iOS (which does not resize it) puts the
sheet's action row behind the keyboard. `max-height:92vh` should be `92dvh` at
minimum; better, drop `autoFocus` on touch.

### 4.6 The pull-to-refresh handler re-subscribes on every touch frame

`App.js:607–642` — the effect depends on `[pullProgress]`, and `onMove` calls
`setPullProgress` on every `touchmove`. Each frame therefore tears down and
re-adds three window listeners. It works, but it is the hottest path on the
device with the least CPU. A ref for the progress value fixes it.

### 4.7 `aria-label`s that fight the visible text

`BottomNav` (`misc-ui.js:190`) labels the Dashboard tab **"Home"** while the tab
bar, the keyboard shortcut list and the hash route all call it **"Dashboard"**.
Screen-reader users on mobile hear a name that appears nowhere else.

---

## 5. Dead and self-contradicting mobile CSS

Because Monthly, Daily and Entries all swap to card renderers at `useIsMobile()`
(≤768 px), every table-tuning rule below that breakpoint is unreachable:

| Rule | Line | Why it's dead |
| --- | --- | --- |
| `.budget-col-cat{display:none}` | 1280 | monthly table not rendered ≤768 |
| `.daily-card`, `.daily-cat` | 1286–1287 | daily uses `renderDailyMobileCards()` |
| `.entries-table{font-size:12px}`, `.entries-table td/th` | 1289–1290 | `.entries-table-wrap{display:none}` at 1230 |
| `.budget-desc-cell` | 1316 | table cell class, table not rendered |
| `.budget-monthly-table` + 7 column widths | 1322–1333 | **32-line comment describes a horizontal-swipe table that no longer renders on phones** |
| `.entries-col-cat/-sched/-until/-notes{display:none}` | 1342 | table not rendered |
| `.forecast-col-cat`, `.forecast-conf-col` | 1283, 1346 | redundant — `forecast-plan.js:61–68` already omits those cells |
| `.cf-fab` (+ 2 overrides) | 1075, 1079–1083 | **no component renders `cf-fab`** |
| `.fab-panel` selectors | `App.js:278, 707` | no component renders `.fab-panel` |

Two of these are worth calling out as more than tidy-up:

- **The FAB was designed and never wired.** The CSS is complete (56 px, thumb
  reach, `bottom:calc(66px + safe-area)` clearing the nav), `LIGHT.primary` is
  even commented *"Interactive fills (active pills, primary buttons, FAB)"*, and
  a `cf:quickadd` event handler exists (`App.js:682`) — but it is only reachable
  via the `n` keyboard shortcut, i.e. desktop only. On a phone, adding an entry
  means Budget → Entries → scroll past three toolbar rows → "+ Add Entry". This
  is the single biggest featureset gap; the fix is ~5 lines.
- **Contradictory comment at `styles.css:1208–1211`:** it says narrow tabular
  inputs "keep their compact size", then line 1228 sets
  `input,select,textarea{font-size:16px!important}` for *every* input ≤768 px.
  Line 1211 (`.search-box input, .header-search input`) is fully redundant with
  it. The monthly-amounts grid does not keep its compact size.

---

## 6. Density: the first screen is mostly chrome

Measured at 390 × 844:

- **Dashboard** — "⚙ Customize" occupies a full row alone (~64 px), then
  "My entries / All users" occupies another full row alone (~60 px). ~150 px,
  ~18 % of the viewport, before any number appears. Both are settings-grade
  controls given hero placement.
- **Entries** — three stacked toolbar rows (type pills / Filters + search /
  Import CSV + Add Entry) ≈ 250 px before the first entry. "Import CSV" gets
  equal weight to "+ Add Entry", despite its own preview step being a six-column
  table with per-row `<select>`s inside a bottom sheet.
- **Budget → Monthly** — year badge, sub-tabs, month strip, 2 × 2 KPI grid and a
  four-button toolbar ≈ 700 px before the first row.
- **Header** — with search and year pills hidden ≤768 px, the header is a logo
  and an avatar separated by ~250 px of empty navy. The offline chip and alert
  bell live there conditionally; the rest of the time it is wasted.

The dashboard "Monthly Summary" table is correctly wrapped in `.hscroll`, so its
686 px width is a genuine horizontal swipe, not a clip — that one is fine.

---

## 7. Outcome

All 21 items are fixed. Verified by re-running the same measurement pass
(box overflow, touch-target size, bottom-nav overlap at 320 and 390px — both
now report zero findings across all nine views), a 19-check functional script,
and the existing 37-test regression suite.

**Tier 1 — things that lost or hid data**

| # | Item | Fix |
| --- | --- | --- |
| 1 | Glance tiles clipped (§1.1) | `min-width:0` on the tile, 2-up below 480px with a lone third spanning, value step-down at 360px |
| 2 | Monthly Totals cut off (§1.2) | Totals row and amounts group both wrap |
| 3 | Footer under the nav (§1.3) | Nav clearance moved from `.content-area` to `.app-scroll`, so every child clears it |
| 4 | BvA target hidden (§2.1) | `display:none` rule and its stale comment deleted; row wraps instead |
| 5 | Settings "+ Add" off-screen (§1.4) | `min-width:0` on `.settings-input`, `.cat-actions-row` can shrink and wrap |

**Tier 2 — features unreachable from a phone**

| # | Item | Fix |
| --- | --- | --- |
| 6 | FAB styled but never rendered (§5) | Rendered on Dashboard and Budget, wired to the existing `cf:quickadd` event, retracts while scrolling down so it never parks over a balance |
| 7 | Templates un-creatable (§2.2) | `.ef-save-template` unhidden; label shortens to "Template" so the sticky action bar stays one line |
| 8 | Unlabelled mobile search (§2.4) | Real placeholder; search takes the remaining width of the Filters row |
| 9 | Column reorder advertised but impossible on touch (§2.3) | `draggable`, the grab cursor, the ⠿ hints and the "arrow to reorder" wording all drop on coarse pointers — same for the category list, whose copy now points at its ↑/↓ buttons |
| 10 | Fragile blob download (§2.5) | One `downloadBlob` helper: anchor appended to the document, revoke deferred, failure reported instead of silent |

**Tier 3 — consistency**

| # | Item | Fix |
| --- | --- | --- |
| 11 | Invisible inactive sub-tabs (§4.2) | Inactive surface is `--border` (was `--stripe`, identical to `--bg` in light); short labels beside the icons, pills share the row equally |
| 12 | Three list presentations in one tab (§4.1) | Forecast uses the Budget/Entries card on mobile, with the mark-paid checkbox it was missing |
| 13 | Bottom-sheet vocabulary (§4.4) | One `SheetHandle` on every sheet, with a real swipe-down-to-dismiss behind it; sticky action bar; one close-button class |
| 14 | Touch targets (§3) | 44px floor for shared controls *and* the mobile-only ones that the block missed, plus a blanket rule for form controls |
| 15 | Year badge / sub-tab order (§4.3) | Badge above the sub-tabs on both Budget and Plan |
| 16 | `vh` sheets, forced keyboard (§4.5) | `dvh` with a `vh` fallback; `autoFocus` gated to fine pointers |

**Tier 4 — hygiene**

| # | Item | Fix |
| --- | --- | --- |
| 17 | Dead mobile CSS (§5) | ~30 lines of unreachable table rules removed, along with the comments describing behaviour that no longer happens |
| 18 | Pull-to-refresh listener churn (§4.6) | Progress mirrored into a ref; the effect mounts once instead of re-subscribing every frame |
| 19 | `aria-label` "Home" (§4.7) | "Dashboard", matching the rest of the app; the nav still *shows* "Home" |
| 20 | "All Categorys" (§20) | Plural is a property of the label now, not derived from it |
| 21 | Two responsive axes (§ context) | Layout is now width-only at 768px — nav variant, FAB, card/table swap, container measure. `pointer:coarse` is reserved for input ergonomics: hit targets, camera capture, menus as sheets, the app-shell scroll lock, and affordances for gestures touch can't perform |

Two things were deliberately **not** changed:

- **Backdrop tap still doesn't dismiss a form sheet.** That was a considered
  decision (a slightly-off tap shouldn't discard a half-filled form) and it
  stands. The gesture gap it left is now filled by swipe-down, which can't be
  triggered by a mis-tap. Menus — which have nothing to lose — keep their
  backdrop dismiss.
- **Forecast rows still aren't editable.** Forecast projects across year
  boundaries and the override machinery is year-scoped, so the card offers the
  paid checkbox and nothing else.

Remaining sub-44px targets are the inline prose link to `console.anthropic.com`
(covered by the WCAG inline exception) and the keyboard-only skip link.

---

## 8. Container system

The measure was the last thing still inconsistent. There were three of them:
`.cf-page` and `.header-inner` at 1160px, plus a ≥1400px override widening
`.content-area` to 1400px — but `.content-area` *is* a `.cf-page` (one element
carries both classes) and the views it wraps are `.cf-page` too, so a wide
screen rendered a 1400px main with 1160px content nested inside it and the
sub-tab strip agreeing with neither. The horizontal gutter made it worse: it
sat on `.tab-bar-outer` (the full-bleed navy band) while `<main>` took its own
padding from inside the measure, so the logo sat a full gutter-width outside
the content column at every width.

Both are single tokens now:

```
:root{--container-w:1200px; --container-w-mobile:430px; --container-gutter:24px;}
@media(min-width:1400px){:root{--container-gutter:40px;}}
@media(max-width:768px) {:root{--container-gutter:12px;}}
@media(max-width:480px) {:root{--container-gutter:10px;}}
```

`--container-w` is carried by `.cf-page`, `.header-inner` and
`.budget-subtabs-row`; the gutter is carried by the same three. Measured
content-box left edges now agree exactly at every width:

| viewport | header | main | tab strip | sub-tabs |
| --- | --- | --- | --- | --- |
| 320 | 10 | 10 | — | 10 |
| 820 | 24 | 24 | 24 | 24 |
| 1440 | 153 | 153 | 153 | 153 |
| 1920 | 393 | 393 | 393 | 393 |

`--container-w-mobile` is the width the phone layout is *designed* at (430px,
the largest common phone), not a ceiling. Applying it as a `max-width` was
tried and reverted: it letterboxed everything between 430px and the 768px
breakpoint, so a 600px window rendered a 430px column with ~85px of dead
gutter either side — worse than the stretched cards it was avoiding. The
mobile column is fluid and fills what it's given; the token stays as the
reference the card layouts are tuned against.

## 9. Density, after

§6 measured how much chrome sat above the first piece of content at 390px.
Moving the year badge into the header — which is where the ~195px of empty
navy was, and which cost a whole row underneath — closed most of the gap:

| | audit | now |
| --- | --- | --- |
| Dashboard → first number | ~330px | **120px** |
| Entries → first entry | ~500px | **289px** |
| Budget Monthly → first row | ~700px | **489px** |

Budget Monthly is the one still worth a look: the remaining 489px is five
genuine functional bands (sub-tabs, month strip, 2×2 KPI grid, export
toolbar, opening balance) rather than dead space, so shrinking it further
means cutting a feature rather than tightening a layout.

## 10. Still open

**§2.5 — blob download on iOS.** The code is hardened (anchor appended to the
document, revoke deferred past navigation, failure surfaced as a toast
instead of silently doing nothing), but it has not been exercised on a real
iOS device in an installed PWA, which is the case that was suspect. Worth one
manual Export Backup from an installed iOS home-screen app before trusting
it as the backup path Settings says it is.
