# CashFlow Budget — UI/UX & Data-Visualization Review

**Date:** July 18, 2026 · **Build reviewed:** v176 (source in `src/`, built via `build.js`) ·
**Method:** full code review of `src/` plus live rendering in Chromium (Playwright) at 1440×900 and 393×852 (touch), light and dark themes, all tabs — using a stubbed Supabase client and fictional demo data. Chart palettes were checked with a runnable colorblind-safety validator (OKLab ΔE), not by eye.

This is a follow-up to `UI_AUDIT_2026-07.md` (July 16). A large share of that audit has landed and it shows.

---

## 1. What's improved since the last audit (keep all of this)

- **Source restored** (`src/` + `build.js` + CI check) — the single biggest architectural item, done.
- **SVG icon system** (`Icon` in `misc-ui.js`) now covers bottom nav, budget sub-tabs, and header — the emoji nav is gone.
- **Mobile money visibility**: the monthly ledger is day-grouped cards on phones, Upcoming rows are two-line, and the Entries filter stack collapsed into a "Filters" chip. All three of the old top mobile issues are fixed.
- **Hash routing** (`#/budget/forecast`), real `manifest.json` + PNG icons, self-hosted fonts.
- **Dark-mode charts** read from CSS variables — the invisible navy line on near-black is fixed.
- **Login page** now uses the real SVG wordmark and looks credible.
- Category chips are tinted (10–12% background + colored text) — the old rainbow-chip issue is resolved in tables.
- Hero KPI row (Balance today / Next low point / Due rest of month) is a genuinely good dashboard opening — the right three numbers, biggest first.

The overall impression on desktop light mode is a disciplined, professional product. The remaining problems cluster in three places: **dark-mode state visibility**, **chart correctness/accessibility**, and **color semantics**.

---

## 2. Critical

### C1. Dark mode: every `--navy`-filled control loses its state ★ top issue
In the dark theme `--navy` is `#0F1923` — nearly identical to the page background (`#111921`) and the header. Every control that signals "active/primary" with a navy fill silently vanishes:

- **Month picker**: the active "Jul" pill has no visible pill at all — it's the *only* month that looks unstyled.
- **Budget sub-tabs**: active "Monthly" looks like plain text while inactive tabs have visible chips — the affordance is inverted.
- **Bottom nav (mobile)**: active tab color is `var(--navy)` → the active "Home" icon+label render *darker than the inactive ones*.
- **FAB**: near-invisible dark circle on dark background.
- Same applies to `PillToggle`, `ChartToggle`, `cf-btn--primary`, and the `Toggle` switch's on-state.

**Fix:** add a `--primary` token for interactive fills, distinct from the brand navy that doubles as a dark surface. Light: `#1C2B3A` (unchanged look). Dark: something that clears the surface — the existing `--accent` `#5B8DEF`, or a lightened navy (`#3A5578`+). Replace `background: var(--navy)` / `color: var(--navy)` on *interactive* elements with `var(--primary)`; leave decorative navy alone.

### C2. Y-axis labels collide with the first data column
`mini-recharts.js` renders Y tick labels *inside* the plot area at `x:4`. In every bar chart the January bar paints over them ("$6k/$4k/$2k" behind the first bar in Surplus/Shortfall and Income vs Expenses, both themes).
**Fix:** reserve a left gutter — measure the widest formatted tick (or take `yDesc.props.width`, which callers already pass as `44` and the chart ignores) and shift the plot right by that amount. A `paint-order: stroke` halo in the surface color is a cheap extra safeguard.

### C3. Income/expense is encoded by red-vs-green alone in places — and that pair fails colorblind validation
Validator result: `#27AE73` (green) vs `#E85D4A` (red) ΔE **5.9** under deuteranopia — below even the conditional 6–8 floor. Where signs or position also carry the meaning, that's survivable; two places rely on color *alone*:

- **Entries list (mobile + desktop)**: amounts have no `+`/`−` sign — `$3,250.00` green vs `$1,650.00` red is the only type indicator. The dashboard's Upcoming list already does this right (`+$850.00` / `-$260.00`).
- **Income vs Expenses, line view**: two lines distinguished only by hue.

**Fix:** (a) restore signed amounts in the Entries/register views; (b) for the line view, add direct end-labels ("Income", "Expenses") next to the final points — the legend alone doesn't survive CVD when the hues collapse. Longer-term, consider a blue/orange series pair for income/expense charts and keep red strictly for "negative/over" states.

---

## 3. Charts & dashboard

### CH1. Axis ticks aren't "nice" numbers
`mkTicks` divides the padded extent into 5 equal steps, producing $63k / $49k / $35k / $21k / $7k / −$7k. Implement a 1–2–5×10ⁿ nice-tick routine (snap lo/hi outward to round steps) so gridlines land on values people can do arithmetic with.

### CH2. Sparkline trend color contradicts the KPI it sits beside
Sparklines self-color green/red by `last >= first`. Result on the dashboard: **"Annual Income $95,650" in green with a red sparkline** beside it (January's extra pay period makes the series end lower than it starts). Worse, the logic inverts for expenses: rising spending sparks *green*.
**Fix:** neutral sparklines (`--textMid`) — they're context, not verdicts. If trend coloring stays, give `Sparkline` a `goodWhenUp` prop and set it per metric.

### CH3. "Income Sources" widget is grouped by category, so it shows one bar
All income entries share the "Income" category; the widget renders a single full-width bar labeled "Income $95,650" — zero information. Group income by entry description (`Salary — Acme Corp`, `Freelance design`, `Tax refund`) instead of category. Same applies to its pie view.

### CH4. Category palettes fail validation (both of them)
Ran the validator on both 15-color sets:

- `DEFAULT_CATEGORY_COLORS`: **normal-vision FAIL** — Food `#85D039` vs Utilities `#39D085` are ΔE 8.2 apart; with Income `#29AE29` that's three near-identical greens (clearly visible in the Entries list). Also two colors read as gray (`#5A626E` Insurance, `#785032` Farm/Animals) and six are under 3:1 contrast on white.
- `CAT_PALETTE` (fallback): deutan FAIL on the green/red adjacency, gray-floor fails on `#7F8C8D`/`#34495E`, five colors under-contrast in dark mode.

Chips survive because they always carry a text label. Pie slices only label when the slice is big enough — small slices are color-only.
**Fix:** re-step both palettes against the validator (light *and* dark surfaces): keep each category's hue family, but pull all colors into a consistent lightness band, separate the three greens into green/teal/lime-shifted-to-olive, and darken the yellows. Always direct-label pie slices ≥ some threshold and fold the rest into "Other".

### CH5. Hardcoded grays in `mini-recharts` ignore the theme
Pie slice labels and default tooltips use `fill:'#555'` / `color:'#555'`, Y ticks default `#aaa`, X axis title `#6b7280`, pie slice borders `stroke:'#fff'`. In dark mode #555 on a `#1A2535` card is ~2.3:1. Use `var(--text*)`/`var(--bgCard)` like the rest of the file already does for grid/ticks.

### CH6. Chart-type toggles are still cryptic glyphs
`◿ ╱ ▮` / `▮▮ ▰ ╱` at 10px inside 34×34 buttons. `aria-label`/`aria-pressed` are there (good), but sighted users get no better hint than a hover title. You already own an `Icon` set — add `bar`, `line`, `area`, `pie` icons and use them at 15px. (34px also remains under the 44px touch minimum; bump the touch target with padding even if the visual stays compact.)

### CH7. Small chart polish
- Bar hover targets are the bars themselves; line charts' hover targets are 3–4px dots — smaller than the recommended ≥8px hit area. Consider full-height invisible hover columns per x-index (you already track `idx`).
- The Upcoming rows' 4px micro progress bar encodes `|amount| / (|amount|+|balance|)` — a ratio nobody can name. It reads as decoration at best, a rendering artifact at worst. Drop it, or replace with something meaningful (e.g., balance headroom vs alert threshold).
- Forecast "Confidence" column mixes two encodings: `100%` green text vs `✓` checkmarks vs `25%` red. Pick one (a checkmark for confirmed, % otherwise — or % everywhere).

---

## 4. Color semantics (carried over, still the biggest visual-calm lever)

- **Every expense in the app is alarm red** — ledger Expense column, Forecast OUT column, Monthly Summary's entire Expenses column. Red-as-column-identity destroys red-as-warning. Neutral ink for routine magnitudes; red for negatives, over-budget, and below-threshold only.
- **Balance columns are solid green walls** (green whenever above the alert threshold). Neutral by default; amber/red only when it matters. The information "everything is fine" is better conveyed by *absence* of color.
- **Double encoding persists on mobile ledger**: `($1,650.00)` in red — parentheses *and* color *and* placement in an Expense-labeled context. Pick sign *or* parentheses app-wide (the desktop dashboard uses signs; standardize on that).

## 5. UX / layout details

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| U1 | Mobile hero tiles wrap mid-phrase: "in **/** 10d", "7 **/** items" | 🟡 | Make the sub-label a block-level second line (`display:block`, smaller size), or hide it <480px |
| U2 | Swipe-tip's "Got it" button wraps to two lines | 🟢 | `flex-shrink:0; white-space:nowrap` |
| U3 | FAB occludes row amounts/menus mid-scroll (fade-to-40% helps but rows stay blocked); it also renders on **desktop**, floating over tables at 1440px | 🟡 | Hide `QuickAddFAB` on `pointer:fine` (desktop has header/inline Add buttons); on touch, fully hide on scroll-down / reveal on scroll-up |
| U4 | BvA rows read `$2,095.00 / $320.00 ▲$1,775.00` with no header — which number is spent vs budget is guesswork; ▲ is unexplained | 🟡 | One-time header row ("Spent / Budget") or microcopy `"$2,095 spent of $320 · $1,775 over"` on the first row; tooltip on ▲ |
| U5 | Plan empty state uses the 🎯 emoji — last emoji holdout alongside the SVG icon system; card also shows two adjacent add buttons ("+ Add" and "+ Add Goal") | 🟢 | `Icon name="target"` at 26px in `--textLt`; drop the header "+ Add" when the empty-state CTA is visible |
| U6 | `KpiCard` label/`SectionTitle` 11px all-caps everywhere still creates the "terminal wall" on dense views | 🟢 | Reserve caps-label style for card headers only; sentence-case sub-labels |
| U7 | Default `cf_years` opening balance in `App.js` is `19005.69` — looks like a real personal balance shipping as the default for every fresh profile | 🟡 | Change default to `0` (echo of old audit C1; the value is meaningless to new users anyway) |

## 6. Suggested order of attack

**P0 — visibility & correctness (small, high-impact diffs)**
1. C1 `--primary` token for interactive fills (dark-mode active states, FAB, buttons).
2. C2 Y-axis gutter in `mini-recharts`.
3. C3 signed amounts in Entries + direct labels on the income/expense line chart.

**P1 — trust in the numbers**
4. CH1 nice ticks; CH2 neutral sparklines; CH5 theme-token grays.
5. §4 color-semantics pass (neutral expenses/balances; one negative-number convention).
6. CH3 income-sources grouping; U7 default-balance scrub; U1/U3 mobile tile wrap + FAB scope.

**P2 — polish**
7. CH4 palette re-step (run the validator on both modes before committing).
8. CH6 toggle icons; U4 BvA labeling; CH7/U2/U5/U6 details.

---

## 7. Round 2 — platform-appropriate features *(implemented Jul 18)*

Principle: a feature that can't work — or has already done its job — on the current device should not render. Applied to the biometric unlock flow and audited across the app:

| Surface | Before | After |
|---|---|---|
| Settings → Security biometric toggle | Shown whenever WebAuthn reported a platform authenticator — including desktops (Windows Hello / Touch ID) | Offered only on coarse-pointer (touch) devices; still shown if a credential is already registered so it can be disabled anywhere |
| User-menu "Fingerprint / Face Unlock" shortcut | Always present, on every device, forever | Now "Set Up Fingerprint / Face Unlock"; appears only on touch devices that support it **and haven't set it up yet** — once registered it disappears (managed from Settings) |
| Auto-lock hint copy | Always said "unlock with your fingerprint / face or your password" | Mentions fingerprint/face only when biometric unlock is actually enabled |
| User-menu "Keyboard Shortcuts" | Shown on phones, where there is no keyboard | Hidden on coarse-pointer devices |

Verified in four live scenarios (desktop/mobile × credential registered/not) with a forced-available WebAuthn stub. Already correct and left alone: `LockScreen` only offers biometric once registered; camera-capture button and swipe coach-mark are already touch-only; "Install App" is gated on `beforeinstallprompt`.

**Remaining item in this class:** the QuickAdd FAB still renders on desktop (see U3) — same principle, recommended same fix.

## 8. Feature suggestions (open list, not yet implemented)

Ordered by value-to-effort for a cash-flow app:

1. **First-run experience.** A fresh household lands on an empty dashboard. Offer a 3-step start (opening balance → first income → first bills) and/or a "Load sample data" button that seeds clearly-fictional entries and can be undone in one tap.
2. **Mark-as-paid from the dashboard.** The Upcoming list is the most-viewed widget but is read-only; the ledger's occurrence checkboxes are a tab away. A tap/long-press on an Upcoming row to mark it paid (or edit that occurrence) would close the most common daily loop.
3. **Insight strip.** One sentence above the charts computed from data you already have: "July spending is 12% above your 6-month average — driven by Personal (+$1,800)." This is what the AI tab does, but free, instant, and offline.
4. **Budget rollover (envelope carry).** Optional per-category: unspent target rolls into next month. Standard in envelope-style budget apps and cheap given `budgetTargets` is already per-month.
5. **Search operator discoverability.** The register search supports `>100` / `<20` / exact-amount queries, but nothing reveals this. Put it in the placeholder ("Search… try >100") or a one-line hint under the box.
6. **Bank-import profiles.** CSV import exists; remember the column mapping per source ("RBC chequing") so repeat imports are one tap.
7. **Low-balance heads-up.** When the forecast's next low point crosses the alert threshold, surface it on app open (banner exists?) and — as a PWA — consider a local notification the day before a big scheduled debit.
8. **December nudge.** When viewing Nov/Dec of the latest configured year, offer "Add {year+1}" inline instead of requiring the trip to Settings → Budget Years.

---

*Verification notes: all findings were confirmed on live renders (16 screenshots: 7 desktop-light views, 2 desktop-dark, 4 mobile-light, 1 mobile-dark, 2 login) with fictional seeded data; no JS errors were observed in any render. Palette findings come from an OKLab-based CVD validator run against both themes' card surfaces. §7 changes verified live in 4 device/credential scenarios.*
