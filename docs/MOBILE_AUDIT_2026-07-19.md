# CashFlow Budget — Mobile UX Audit (Round 4)

**Date:** July 19, 2026 · **Focus:** phone experience (393×852, touch, both themes) ·
**Method:** live Chromium sweep of every tab, sub-tab, and modal with a stubbed Supabase
client and seeded demo data, plus three automated scanners run per view: a **tap-target
census** (every visible `button`/`a`/`switch` under 32px), a **horizontal-overflow
detector**, and scripted touch flows (FAB open→add→close, filters sheet, occurrence
editor, month switching, tab switching). Verified against the 29-test regression suite
(29/29 before and after).

Follow-up to `UI_ARCH_AUDIT_2026-07-19.md`; this round is exclusively about phones.

---

## 1. What mobile already does well (unchanged)

Bottom nav with safe-area insets · day-grouped ledger cards · two-line Upcoming rows ·
filters collapsed behind a "Filters" chip opening a bottom sheet · 16px inputs (no iOS
zoom) · internal `.app-scroll` scroller so the browser chrome never displaces the nav ·
swipe-to-change-month with a dismissible coach mark · pull-down-to-sync · haptics ·
camera capture only on touch devices · FAB hidden on desktop. The foundation is solid;
this round was about friction, not structure.

## 2. Defects found & fixed

### F1. Quick-add panel covered its own close button ★ worst finding
With the entry panel open, the FAB (which rotates into the "✕" close control) was
half-buried **under the panel itself**: a stale `.fab-panel{bottom:84px}` mobile rule
out-specificity'd the intended 128px clearance, and the same rule spelled `maxHeight`
as a camelCase property — invalid CSS, silently ignored, so the 78vh cap never applied
either. Scripted tap of the close button timed out 100% of the time.
**Fixed:** panel bottom now clears the FAB (`128px + safe-area`), real `max-height:70vh`,
and the FAB's z-index (1501) puts it above the panel and the menu backdrop so the close
tap always lands. Verified by scripted open → menu → form → close flow.

### F2. Tap targets far below touch minimums, everywhere
The census found dozens of sub-32px controls per view. Worst offenders:

| Control | Was | Now |
|---|---|---|
| Month pills (the primary budget navigation!) | **26×17px** | 39×36px (strip already scrolls horizontally, so height was free) |
| Mark-as-paid / row-select checkboxes | 20–22px | visual unchanged + ±10px hit halo (`.cf-checkbtn::after`) |
| Row "⋮" actions, year Active/Switch, color Reset | 26px | same halo treatment |
| `.cf-btn` (CSV/PDF/Customize/Settings actions) | 24–31px | `min-height:40px` on coarse pointers |
| Type/horizon pills (`.cf-pill`) | 27px | `min-height:36px` on coarse |
| Toggle switches | 24px | ±10px hit halo |
| Collapse headers ("▼ Monthly Summary") | 14px tall | `min-height:36px` |
| Footer Privacy/Terms links, swipe-tip "Got it" | 16–23px | padded to ≥36px |
| Settings section pills & quick-jump links | 29–31px | `min-height:40px` |

All fixes are coarse-pointer-scoped (or invisible halos), so desktop density is
untouched. Post-fix census: **zero remaining sub-32px targets** except prose links
(WCAG inline exception) — and the switch, whose halo the scanner can't see.

### F3. Tab switches kept the old scroll position
The app root is one shared scroller, so scrolling deep into the dashboard and tapping
"Budget" dumped you mid-ledger with no month picker or context in view (reproduced on
every tab pair). **Fixed:** view changes (`tab`/`budgetSub`) reset the scroller to top;
first render exempted so the restored session position survives app launch.

### F4. Bottom sheets floated 16px above the bottom edge
The desktop modal overlay's `padding:16px` leaked into the mobile bottom-sheet layout,
so sheets with flat bottom corners (designed to sit flush) hovered above the nav with
the dimmed page peeking through. **Fixed:** overlay padding zeroed at ≤768px; sheet
bottom now lands exactly at the viewport edge (asserted programmatically).

### F5. KPI sparklines clipped at the card edge (carried R3)
On 2-column phone grids, the value + sparkline row couldn't fit both; the sparkline was
pushed into the card border and its end-dot rendered outside the SVG box. **Fixed:**
the row wraps (`.kpi-spark-row`), dropping the sparkline below the value on narrow
tiles, and `Sparkline` insets its endpoints 3px so the dot stays inside its own box.

### F6. Register selected-checkbox used `var(--navy)`
One leftover from the old dark-mode C1 class of bugs: the desktop register's selected
row checkbox filled with `--navy` (invisible against dark surfaces). Now `--primary`.

## 3. Investigated, not bugs

- **"White box" over the bottom nav** in early sweep frames — pixel-level inspection
  showed it's just the white nav beside the dark footer band at max scroll. No defect.
- **Settings quick-jump links appearing clipped** — the row is a proper horizontal
  scroller; the overflow scanner flagged it because it can't see scroll containers.
  (They did need taller targets — covered in F2.)
- **Budget/entries "auto-scroll" mystery** — was F3's stale scroll, not a feature.
- **Anthropic-key sharing disclosure (R8 from round 3)** — already present in
  Settings → AI key; no action needed.

## 4. Remaining mobile recommendations (small, next round)

| # | Item | Note |
|---|---|---|
| M-R1 | Month-picker could show a subtle right-edge fade when more months are off-screen | affordance only; swipe + scroll both already work |
| M-R2 | Emoji still used for Settings section pills, alerts ✅/🔔, register empty state | same as round-3 R2; extend the `Icon` set |
| M-R3 | The `?selftest` and Audit pages are desktop-formatted | low traffic; tables could stack |
| M-R4 | Landscape phones (~740×393) untested this round | worth one sweep when convenient |

---

*Verification: post-fix sweep re-ran all three scanners (tap census clean, no
horizontal overflow, zero JS errors across 12 views × 2 themes); scripted flows for
FAB open/close, filters sheet flush, month-pill sizing, and tab-switch scroll reset all
pass; Playwright regression suite 29/29 before and after.*
