# Mobile UI Audit, Round Two — CashFlow Budget

> **Status: closed.** Four defects found and fixed, three gaps taken, one gap
> deliberately left, one finding retracted as wrong. The findings below are
> kept as written — including the one that was mistaken — because they are the
> record of what was believed, what turned out to be true, and how the
> difference was settled.

The first audit (`MOBILE-UI-AUDIT.md`, build `v183`) fixed 21 defects in a
desktop layout that had been made narrow. The mobile-first redesign that
followed reshaped the information architecture, and this round audits the
result rather than the original.

Audited build `cf-v190`. Every number here was measured in headless Chromium
against the built `index.html` with the regression suite's own fixture, at
320 / 390 / 430 / 820 px wide and 844 × 390 landscape, in both themes, plus a
120-entry household and every sheet. Contrast is computed WCAG 2.1 relative
luminance against the composited background.

Nothing in this document changes behaviour — it is the audit itself. Fixes are
in `b3a0207`, `9a938b1`, `650b88f` and `8d8c7b1`.

---

## Method, and where it went wrong twice

Two probe bugs produced findings that were not real, and both are worth
recording because the permanent tests now defend against exactly them:

**Alpha was read as opacity 1.** The first contrast sweep treated
`rgba(39,174,115,0.08)` — an 8% wash over white — as a solid green, and
reported four failures that did not exist. They were discounted before the
report was published, and the permanent contrast test composites every layer
rather than reading the nearest background flat.

**A screenshot was read instead of a measurement.** Finding G4 below asserted
that Entries still used boxed cards with gaps. It does not. That one survived
into the published report and is retracted in place.

The lesson both times was the same: an impression of a screen is not a
measurement of it, and the difference is invisible until something checks.

---

## 1. Confirmed defects

### 1.1 The totals bands print green figures on navy — 2.08:1 (AA needs 4.5)

`.monthly-totals-row` and the sticky `.budget-totals-row` paint a navy band and
the amounts inside kept the on-white green.

```
$7,350.00    rgb(44,118,87) on rgb(20,65,58)   2.08:1   needs 4.5
+$2,670.00   rgb(44,118,87) on rgb(20,65,58)   2.08:1   needs 4.5
```

The cause is tidier than the symptom. `--coral` was already chosen as the ink
for text on the navy bands — the same value in both themes, because the band is
dark in both. Its green counterpart never existed, so those figures fell back
to the on-white token.

**Fixed** by adding `--mint` (`#7FD3A8`), coral's partner: 6.38:1 on the light
navy, 10.65:1 on the dark. The first fix caught only the mobile totals row; the
new contrast test found the second — the sticky desktop one, which renders only
above 768px and which no phone-width probe could have seen.

### 1.2 White on the dark theme's primary misses AA everywhere it is used

`#3E8C7C` with white text measures **4.00:1**, just under the line, beneath
every primary button, active lens pill, active month pill and checked control.

```
cf-btn       ×6   white on rgb(62,140,124)   4.00:1
bp-label     ×3   white on rgb(62,140,124)   4.00:1
cf-pill      ×2   white on rgb(62,140,124)   4.00:1
cf-checkbtn  ×1   white on rgb(62,140,124)   4.00:1
```

**Fixed**: `#3E8C7C` → `#377E70`, which clears it at 4.79:1 and is still
recognisably the same green. One token, every instance.

### 1.3 Swipe action labels are unreadable in the dark theme

The Paid and Skip panes revealed behind a swiped row used white on the light
action colours: **2.64:1** and **2.57:1** across 49 nodes.

**Fixed**: the panes take `--bg`, the page ground in each theme — light ink on
them in light, dark ink in dark. 5.6:1 and 7.1:1 respectively. These panes were
added during the redesign; the colours were chosen against the light theme and
never checked on the other ground.

### 1.4 A rotated phone is treated as a small desktop

The breakpoints were width-only, so landscape (844 × 390) crossed into the
desktop layout.

```
844×390   bottom nav 0px (hidden)   header 107px = 27% of viewport
#/flow/list   first ledger row at y=431 in a 390px viewport — off screen
```

You rotate to see more and get less.

**Fixed**: the phone layout now also applies at `(max-height:500px)` — height is
the honest test for "is there room for a tall header and no thumb nav", and it
catches a short desktop window too. Restoring the nav alone would have taken
chrome from 27% to 32%, so the header gives back what the nav costs: 107px →
44px. Same total chrome as before, with navigation restored, and the first row
at y=354.

This is the same class of problem §"How the responsive system is wired" in the
first audit described — two axes that disagree. It is narrower now, not gone.

---

## 2. Gaps

### 2.1 Help was 22 screens deep with no way back up — **taken**

```
#/help   22.0 screens   39 headings   10 quicklinks   sticky: 0   back-to-top: no
#/you     7.9 screens   15 headings   quicklinks      sticky: 0   back-to-top: no
```

Both offered a link index at the top and nothing after it. Fifteen screens
down, the index you came from was a long scroll away.

**Done**: a sticky bar naming the section you are in, which opens the full list.
On a phone it replaces the index strip rather than joining it — the strip is a
two-column grid of up to fourteen pills, about 200px, and only reachable at the
top of the page. Desktop keeps the strip and never renders the bar. Settings'
section list is now one array feeding both, so the two indexes cannot drift.

The current section is decided by scroll position — the last heading to have
passed the top of the viewport — rather than by which section is intersecting.
"First section on screen" is the wrong semantic near the foot of a page, where
several short sections are visible at once. Worth recording: this was changed
on the rule, not on a symptom. The intersection version was suspected of naming
the wrong section at the bottom of Settings, and when measured, its answer was
right — the last two cards sit below the detection line, so the section above
them genuinely is the one being read.

### 2.2 Flow spent 553px before the first ledger row — **taken**

Two-thirds of an 844px screen. The largest single item was the month's four KPI
tiles in a 2×2 grid above the rows they summarise; Forecast spent 751px, two
cards of which each wrapped a single control.

**Done**, across two commits:

| Lens | Before | After |
| --- | --- | --- |
| `#/flow/list` | 553px | **394px** |
| `#/flow/calendar` | 438px | 331px |
| `#/flow/curve` | 751px | 619px |

The month summary is one line stating the answer, with the four tiles a tap
below it. Forecast's two control blocks lose their card chrome on a phone. The
export bar moved under the ledger — export is something you do having read the
month, and its "+ Add" is the bottom nav's compose button a second time. The
desktop layout is unchanged: the lens wrapper is `display:contents` above
768px, asserted by test rather than assumed.

### 2.3 Swipe works on ledger rows and nowhere else — **left as is, deliberately**

```
swipeable   #/today  #/flow/list  #/flow/curve
not         #/flow/entries  #/envelopes  #/plan/goals  #/plan/debt
```

Swipe currently means "a dated thing you can tick off", which is a coherent
rule. Extending it to lists with no obvious pair of verbs would make the
gesture mean less, not more. Recorded as a decision, not an omission.

### 2.4 Four list screens, four row shapes — **retracted, this finding was wrong**

The finding as written claimed Entries was still boxed cards with 10px gaps
while debts and goals had moved to hairline lists. Measured, it is not:

```
ledger row     57px   full-bleed, no separator
debt item      68px   full-bleed, hairline separated
goal row        —     full-bleed, hairline separated
entries row    65px   full-bleed, hairline separated   ← measured, not eyeballed
envelope row   24px   full-bleed, bar as separator
```

Entries rows are 368px wide, radius 0, gap 0, one hairline between them and no
parent padding — the same pattern the other lists were brought onto. The
finding came from reading a screenshot instead of measuring. **Nothing was
changed.** Manufacturing a diff to match a bad finding would have been worse
than retracting it.

### 2.5 Sheets did not take focus — **taken**

Add Entry, the occurrence sheet and the filters sheet all trapped focus
correctly (0 of 14 tab stops escaped) and none of them *took* it, so a sheet
opened with the reader still standing outside it and a screen reader was never
told it appeared.

**Done**: `SheetHandle` focuses the card on mount, which covers every sheet with
a drag handle in one change. The card, not its first field — focusing an input
opens the phone keyboard over the sheet you have just been shown.

---

## 3. Measured healthy

Recorded so the next pass does not re-litigate it.

| Check | Result |
| --- | --- |
| 320 × 568, 10 routes | No sideways scroll, no clipped currency figures |
| 120-entry household | Pagination on every long list, ~1,300 DOM nodes, 20 scroll frames in 305ms — no virtualisation warranted |
| 13 routes | No heading-level jumps, no icon-only button without an accessible name |
| All sheets | Within viewport, max-height capped, primary action reachable, focus trapped |
| 4 widths × 2 themes | No horizontal overflow, no touch target under 24px |
| Text at 200% (WCAG 1.4.4) | 5 routes at a 32px root: no sideways scroll, nothing lost, nothing under the nav |
| `prefers-reduced-motion` | Zero elements still transition or animate |
| Contrast, both themes | Zero text nodes below AA after the fixes |
| Accessibility tree | Four landmarks per view, one `h1`, no unnamed interactive node, nothing focusable hidden from AT |

---

## 4. Outcome

| # | Item | Outcome | Commit |
| --- | --- | --- | --- |
| 1.1 | Totals bands green on navy | Fixed — added `--mint` | `b3a0207` |
| 1.2 | Dark primary 4.00:1 | Fixed — `#377E70` | `b3a0207` |
| 1.3 | Swipe labels 2.6:1 in dark | Fixed — panes take `--bg` | `b3a0207` |
| 1.4 | Landscape = desktop layout | Fixed — `(max-height:500px)` | `b3a0207` |
| 2.5 | Sheets did not take focus | Fixed — `SheetHandle` | `b3a0207` |
| 2.1 | Help/Settings unnavigable deep | Done — sticky section bar | `9a938b1` |
| 2.2 | 553px before the first row | Done — 394px | `9a938b1` |
| 2.4 | "Four row shapes" | Retracted — the finding was wrong | `650b88f` |
| 2.3 | Swipe only on ledger rows | Left as is, deliberately | — |
| 1.5 | Header and footer were not landmarks | Fixed — `<header>` / `<footer>` | `8d8c7b1` |

Nine tests were added, because every defect above was invisible to everything
the suite already did: contrast across four routes in both themes (compositing
alpha), the landscape layout, sheet focus, chrome budgets per lens, the section
bar, the desktop-layout assertion behind the export-bar move, text scaling to
200%, and `prefers-reduced-motion`.

Suite **116/116**, plus five non-browser suites, both lint gates, and no page
errors across 13 views × 2 themes.

---

### 1.5 The header and footer were not landmarks

Landmark navigation is one of the main ways a screen-reader user moves around a
page, and it offered only `nav` and `main`: the app header (logo, year, search,
alerts bell, account menu) and the footer were plain `div`s.

```
before   nav["Primary"]  main[unnamed]
after    header  nav["Primary"]  main[unnamed]  footer
```

**Fixed** by using the elements the roles are built into. The bottom nav was
already correct — `<nav aria-label="Primary">`.

---

## 5. Not covered by any of this

The accessibility tree is checked — landmarks, roles, accessible names, live
regions, and that nothing focusable is hidden from assistive tech. That is a
check of *what a screen reader is handed*, which is not the same question as
whether the app is **comprehensible** through one. Whether the ledger rows read
sensibly in sequence, whether the swipe actions are discoverable without sight,
whether the notice stack interrupts at the right moment — none of that is
answered here.

**No screen-reader pass has been done.** It needs a person and a real device,
and nothing in this document substitutes for one.
