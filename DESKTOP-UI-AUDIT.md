# Desktop UI Audit — CashFlow Budget

Companion to `MOBILE-UI-AUDIT.md`, same method: findings come from reading
`src/` **and** from driving the built app in Chromium at 1280 / 1440 / 1920 /
2560 px with a mouse and keyboard, against ~20 realistic entries, two budget
years, two debts and two goals. Every number below was taken from the live DOM
or from a scripted interaction, not estimated.

Touch and desktop fail differently. The mobile audit was mostly about space and
hit targets; at desktop width the space is there, so the questions are whether
you can drive the app from the keyboard, whether long tables stay readable as
you scroll, and whether a 1120px-wide row still reads as one row.

Nothing here changes behaviour — this is the audit.

---

## 1. Confirmed bugs

### 1.1 No table in the app has a working sticky header

Three separate rules declare sticky column headers:

```
styles.css:1617   .hscroll>table>thead>tr>th        { position:sticky; top:0 }
styles.css:1626   .entries-table thead .entries-th  { position:sticky; top:0 }
```

None of them stick. Scrolling the page 600px on each of the three main grids:

| view | thead top before | after | table height |
| --- | --- | --- | --- |
| Monthly | 360 | **−213** | 972px |
| Entries | 335 | **−175** | 934px |
| Forecast | 324 | **−276** | 1972px |

The header leaves the viewport with the rest of the table. On Forecast — 1972px
of rows — you are reading unlabelled columns of money for most of the scroll.

**Cause.** `position:sticky` sticks inside its nearest *scrolling* ancestor. All
three wrappers are scroll containers, and none of them has any scroll room:

```
.hscroll--paged      overflow-x:auto  overflow-y:auto  max-height:none   client 1024  scroll 1024  → 0px
.entries-table-wrap  overflow-x:auto  overflow-y:auto  max-height:none   client  934  scroll  934  → 0px
.hscroll             overflow-x:auto  overflow-y:auto  max-height:648px  client  503  scroll  503  → 0px
```

Two things combine. First, `overflow-y` is `auto` on all three even though only
`.hscroll` asks for it — per CSS, when one axis is not `visible` the other's
`visible` computes to `auto`, so `.hscroll--paged{overflow-y:visible}` and
`.entries-table-wrap{overflow-x:auto}` both silently become vertical scroll
containers. Second, with `max-height:none` the scrollport is exactly as tall as
its content, so there is nothing to scroll and sticky never engages.

`.hscroll` (Dashboard summary, YoY) does cap at `72vh` and *would* work — but
only once the table exceeds it, and a twelve-month table is 503px, so it never
does either.

**Fix:** give the header a sticky context that actually scrolls — either cap the
wrapper's height so the table scrolls internally (and the sticky top works), or
drop the wrapper's vertical scroll container entirely (`overflow-y` cannot be
`visible` alongside `overflow-x:auto`, so this means a different wrapper
structure) and let the header stick to the page.

### 1.2 Focus is not returned when a dialog closes

Measured: focus the "+ Add Entry" button, open the dialog, press Cancel.

```
before open : button "+ Add Entry"
while open  : inside .modal-card          ✓ (focus moves in correctly)
after close : <body>                      ✗ (should be back on "+ Add Entry")
```

The app already implements the harder half — `App.js:273` traps Tab inside the
open overlay, and Escape closes every surface. But on close, focus falls to
`<body>`, so a keyboard user is returned to the very top of the tab order and
has to traverse ~32 stops to get back to where they were (§2.3). This applies to
every modal: entry form, occurrence editor, CSV import, confirm dialogs, goal
and debt forms, Customize.

**Fix:** record `document.activeElement` when a dialog opens and restore it on
close.

### 1.3 The desktop context menu never takes focus

Right-clicking a row opens `.ctx-menu-desktop` correctly, but focus stays on
whatever was focused before, so the menu cannot be driven with the keyboard at
all — no arrow keys, no Enter to choose, and Tab moves through the page
*behind* the menu. Escape only works because the handler is bound to `window`.

There is also no keyboard route to open it: the row's kebab button opens the
same menu, so the menu is reachable, but once open it is mouse-only.

**Fix:** move focus to the first item on open, wire Up/Down/Home/End, and
restore focus to the trigger on close — the same contract §1.2 needs.

### 1.4 Daily view: strikethrough means "in the past", not "paid"

`budget.js:859,864` — the Daily row binds strikethrough and muted text to
`isPast(dayObj.day)`. Everywhere else in the app the identical treatment means
*paid*: `budget.js:372–480` binds it to `isDone` (`completed[ev.id]`) in the
Monthly rows and cards, the Forecast cards do the same, and so does the
Dashboard's Upcoming list.

So in Daily:

- an overdue **unpaid** bill is struck through, exactly like a settled one;
- a **paid** bill on a future date is not struck through at all;
- there is no paid/unpaid control in the view — `completed` is never read or
  written by the Daily renderer, while every other money view has a checkbox.

Daily is hidden on mobile, so this is squarely a desktop surface.

**Fix:** bind the strikethrough to `completed[ev.id]` as everywhere else, use the
existing `pastBg` surface for past dates (which is what Monthly does), and add
the paid checkbox.

---

## 2. Keyboard and assistive technology

### 2.1 Eleven colour inputs in Settings have no accessible name

`input.color-swatch-input` (`settings.js:829, 878`) is the transparent
`<input type="color">` layered over each category's colour dot. It has no
`aria-label`, no `<label>`, and no title — eleven of them on the General page,
announced only as "color picker". It is also the control the mobile audit had to
give a hit-area halo to, so it is a real target, not decoration.

**Fix:** `aria-label={`${cat} colour`}`.

### 2.2 Sub-tabs and year pills expose no active state

Three tab-like controls, three different levels of support:

| control | active state exposed | container role |
| --- | --- | --- |
| top tabs (Dashboard/Budget/Plan/AI) | `aria-current="page"` ✓ | `<nav>` ✓ |
| month pills | `aria-pressed` ✓ | `role="group"` ✓ |
| **Budget/Plan sub-tabs** | **none** — `data-active` only | none |
| **header year pills** | **none** | none |

`data-active` is a styling hook; assistive tech cannot see it. A screen-reader
user on desktop cannot tell which of Monthly / Daily / Budget vs Actual /
Forecast / Entries is showing, or which budget year is selected — for the year
pills the *only* cue is background colour.

**Fix:** `aria-pressed` (or `aria-current`) on both, matching the month pills
that already do it correctly one row below.

### 2.3 It takes 32 tab stops to reach the first row of data

Full tab order on Budget → Monthly, measured:

```
 1  skip link
 2–3   year pills          (2)
 4–5   search, avatar      (2)
 6–9   top tabs            (4)
10–14  sub-tabs            (5)
15–16  month prev/next     (2)
17–28  month pills         (12)
29–32  Compare / CSV / PDF / + Add
33     the table's scroll region
34     select-all
35–39  column headers      (5)
40     first row's checkbox
```

Twelve month pills, five sub-tabs and four top tabs are each individually
tabbable. The conventional pattern for a set of mutually exclusive options is a
roving tabindex — one stop for the group, arrow keys to move within it — which
would take this from 32 stops to about 12. The month strip already declares
`role="group"`, so it is half-way there.

The five column headers (35–39) are tabbable to expose keyboard column
reordering. Worth keeping, but they sit between the user and the data.

The skip link works correctly and lands focus on `#main-content`.

---

## 3. Layout at desktop width

### 3.1 Rows are mostly empty space

At the 1120px content measure, several row types put the label hard left and the
number hard right with nothing in between. Widest empty run inside one row,
measured between rendered boxes:

| row | row width | widest empty run |
| --- | --- | --- |
| Budget vs Actual | 1070px | **826px (77%)** |
| Savings goal | 1070px | **741px (69%)** |
| Dashboard "Upcoming" | 1070px | **648px (61%)** |
| Settings budget-year row | 1070px | **622px (58%)** |

Budget vs Actual is the worst: a `Housing` chip at x=0 and `$2,825.00 / $2,825.00`
at x=1050, with 826px of nothing between them. Pairing a category with its
number takes a deliberate eye movement per row, and there is no column structure
to help — the amounts are not aligned to a shared axis, they are just
right-justified against the card edge, so their left edges are ragged.

These layouts are correct on a phone, where the row is 400px wide. They were
never given a desktop treatment.

**Fix:** at desktop width give these rows real columns — category | progress |
actual | target | variance for BvA — so the numbers share an axis and the eye
travels vertically instead of horizontally.

### 3.2 Prose runs to 165 characters per line

| where | measured |
| --- | --- |
| Settings → Budget Years description | **165ch** |
| Settings → Notifications description | **165ch** |
| Settings → AI key disclaimer | 123ch |
| AI Insights subtitle | 122ch |

Typographic comfort is roughly 45–75 characters; past ~90 the eye loses the line
return. Five blocks on Settings and one on AI exceed 120. The card is 1120px
wide and the text is 13px, so a paragraph simply spans the whole measure.

**Fix:** `max-width: 68ch` on the explanatory body copy — it does not need the
full card width, and nothing else has to change.

### 3.3 The dashboard toolbar fix never reached desktop

The mobile audit merged "⚙ Customize" and the "My entries / All users" toggle
onto one line (`.dash-toolbar`), but the rule is inside
`@media(max-width:768px)`, so on desktop they are still two stacked rows, each
holding one right-aligned control, above the first number. Same code, two
behaviours, for no reason other than where the rule was scoped.

### 3.4 Settings is a column of mostly-empty cards

At 1440px, Appearance is a full-width card containing one toggle and two words;
Alert Threshold is a label and a 120px input in another full-width card. The
page is ~4200px tall on a 900px viewport. The quicklink pill row helps, but the
underlying layout spends a lot of scroll on very little.

**Fix:** two columns for the short cards at ≥1100px, or group the one-control
cards into a single "Preferences" card.

### 3.5 Unused width is a deliberate choice, noted for completeness

Content is 1120px inside the 1200px measure at every width ≥1400px, so a 2560px
display leaves 1440px unused. That is the measure you asked for and long-line
readability (§3.2) argues for keeping it. The opportunity it creates is
*columns*, not a wider measure: the dashboard already goes two-up for charts,
and Settings (§3.4) and the AI report could do the same.

---

## 4. What is already right

Worth recording so it does not get "fixed":

- **Focus rings are present and adequate everywhere.** 2px solid accent at 2px
  offset; measured 4.55:1 against the translucent header controls and 3.17:1
  against the navy for the top tabs — above the 3:1 non-text minimum. (An
  earlier reading of "no ring" was my own measurement error: `transition:all`
  on those pills means a probe taken immediately after `.focus()` catches the
  outline mid-animation at 0px.)
- **Nothing is hover-only.** Zero CSS rules toggle `display`/`visibility`/
  `opacity` on `:hover`, so no affordance is hidden from keyboard or touch.
- **Escape closes every surface** — modals, the user menu, the context menu.
- **No duplicate IDs, no positive `tabindex`, no click handlers on
  non-focusable elements** across all eleven views.
- **The layout survives resizing** across the 768px breakpoint in both
  directions and restores the desktop table and tab bar correctly.
- **Chart tooltips** work on hover with correct edge-flipping, and the row
  context menu is available by right-click *and* by an always-visible kebab.
- **Zero page errors** across all eleven views.

---

## 5. Suggested order

**Tier 1 — correctness**

1. Daily's strikethrough means "past" where everywhere else it means "paid", and
   Daily has no paid control at all (§1.4)
2. Sticky headers on Monthly / Forecast / Entries (§1.1)
3. Restore focus to the trigger when a dialog closes (§1.2)

**Tier 2 — keyboard and AT**

4. `aria-label` on the eleven colour inputs (§2.1)
5. `aria-pressed` on sub-tabs and year pills (§2.2)
6. Focus and arrow keys in the desktop context menu (§1.3)
7. Roving tabindex for the month strip, sub-tabs and top tabs (§2.3)

**Tier 3 — desktop layout**

8. Column structure for BvA / goals / upcoming rows (§3.1)
9. `max-width` on explanatory prose (§3.2)
10. Take the dashboard toolbar merge out of the mobile-only block (§3.3)
11. Two-column Settings for the short cards (§3.4)
