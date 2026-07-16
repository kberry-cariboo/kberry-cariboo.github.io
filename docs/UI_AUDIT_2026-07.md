# CashFlow Budget — UI / UX & Architecture Audit

**Date:** July 16, 2026 · **Build audited:** v174 · **Method:** full code review of `index.html` plus live rendering in Chromium at 393×852 (touch/coarse pointer) and 1440×900, light and dark themes, all tabs and sub-tabs, seeded with representative demo data.

---

## 1. Executive summary

The app is in far better shape than most single-file PWAs: it already has a bottom navigation bar, FAB, bottom-sheet modals, card-based register on mobile, safe-area insets, 16px inputs (no iOS zoom), reduced-motion support, focus rings, a coherent token palette with light/dark themes, and a serious accessibility pass behind it.

The remaining gaps cluster into four themes:

1. **Money is hidden on phones.** The two most important tables (Budget → Monthly, Budget → Forecast) overflow horizontally with the scrollbar deliberately hidden, so the Income/Expense/Balance columns are simply off-screen with no affordance that they exist.
2. **Emoji iconography caps how professional the UI can look.** Navigation, sub-tabs, empty states, and buttons mix colored emoji (🏠 📅 🎯 ⚙️ 💰 🧾) with monochrome glyphs; rendering differs per OS and clashes with the otherwise disciplined navy/green design system.
3. **Trust & correctness issues in the bundle** — a plaintext credential and personal seed data ship in the public page, and a migration bug means seed/demo data never loads for a fresh visitor.
4. **The repo has no source of truth.** Only the compiled 800 KB `index.html` is committed; there is no `src/`, so every change is surgery on transpiled output.

---

## 2. Critical (fix first)

### C1. Plaintext password and personal data in the public bundle
- `App()` (~line 8931) embeds a real email + **plaintext password** as arguments to `hashPw(...)` in a shipped `useEffect`. Anyone can view-source this on the public GitHub Pages site.
- `SEED_ENTRIES` (~line 1245) contains what appears to be real household finance data — names, payroll amounts, support payments, lender names.
- The FNV-32 client-side hash and the login screen provide **no actual security**: all data lives in the visitor's own `localStorage`, and the "auth" gate can be bypassed by writing one `sessionStorage` key.

**Recommendation:** remove the plaintext credential and the personal seed data from the source; rotate that password everywhere it is used (git history keeps it forever — assume it is public). Replace `SEED_ENTRIES` with clearly fictional demo data, and reposition the login as what it really is: a privacy lock-screen for a shared device (consider a PIN + the existing WebAuthn biometric path), not account security.

### C2. Fresh installs never receive seed/demo data (migration bug)
`migrateData()` runs before React on every load. On a brand-new profile (`storedVersion = 0`), the `storedVersion < 3` branch does `readJSON("cf_entries", []) → write("cf_entries", [])`, persisting an **empty** entries array. `useLS("cf_entries", SEED_ENTRIES)` then finds the key present and never applies the default. Verified in a clean browser profile: `cf_entries` = `[]` after first paint.

**Recommendation:** skip migration entirely when `storedVersion === 0 && localStorage.getItem("cf_entries") == null` (fresh install → just stamp the schema version), or make each migration step write only when it actually read something.

### C3. Anthropic API key handling
The key is stored in `localStorage` (`cf_ai_key`) and used with `anthropic-dangerous-direct-browser-access`. For a personal tool this is a known tradeoff, but the Settings copy should state plainly that any script injected into the page could read the key, and the model ID (`claude-sonnet-4-6`, ~line 5037) is hardcoded — it will silently age; surface errors from the API (including model-not-found) in the UI.

---

## 3. Mobile UX findings (highest impact)

### M1. Budget → Monthly table hides all amounts on phones — *the* top mobile issue
At 393px the table keeps 7 columns with `min-width: 640px` inside `.hscroll`, whose scrollbars are hidden on every engine. Result: users see Day + Description + Category; Income/Expense/Balance are off-screen, and nothing indicates horizontal scrolling is possible. The header row is also clipped mid-letter ("I…").

**Recommendation (preferred):** on ≤ 768px, render the monthly ledger as day-grouped **cards/rows** like the Entries view already does: line 1 = description + category chip, line 2 = date • signed amount (green/red) • running balance right-aligned. Keep the table only for desktop.
**Minimum fix:** visible scroll affordance (fade/chevron at the clipped edge), sticky Description column, and un-hide the horizontal scrollbar on coarse pointers.

### M2. Forecast table: Balance column clipped
Same `.hscroll` pattern: at 393px the Balance value renders "$17,839." and truncates. Merging IN/OUT into a single signed **Amount** column on mobile frees ~90px and lets Balance fit; keep separate columns on desktop.

### M3. Dashboard "Upcoming" rows truncate to 2–4 characters
"Freelance design" → "Free…", "Car insurance" → "Ca…". The row tries to fit long-date + title + chip + amount + running balance in 361px.
**Recommendation:** two-line layout on mobile — line 1: title (flex-grow, single ellipsis) + category chip; line 2: short date ("Jul 20") + signed amount; drop the running-balance column below 480px (it's available one tap away) or show it as the second line's right edge.

### M4. Chart defects on mobile
- **Income vs Expenses:** the Recharts legend overlaps the X-axis month labels (legend renders on top of "May/Jul/Sep").
- **Dark mode: Running Balance line + dots are navy on near-black** — effectively invisible. Chart series colors don't switch with the theme; drive them from the same CSS-var palette (read `getComputedStyle` values or pass theme-conditional colors).
- Y-axis tick format "$-1k" should be "-$1k" (or "($1k)" to match the accounting format used elsewhere).
- Chart-type toggle buttons (~28px) are below the 44px touch minimum and their glyphs (⧄ / ▯) are cryptic; use labeled segmented controls or larger icon buttons with `aria-pressed`.

### M5. Entries filter stack eats ~40% of the phone viewport
Type segmented control + 3 dropdown pills + 2 date fields + search = ~400px before the first entry. Collapse Category/Schedule/Status/date-range behind a single **"Filters" chip that opens a bottom sheet** (with active-filter count badge), keeping only search + type toggle inline.

### M6. FAB covers right-aligned amounts
In Entries/BvA/Forecast lists the 56px FAB sits on top of the last rows' amounts mid-scroll. Add end-of-list padding equal to the FAB diameter, or auto-hide the FAB on scroll-down / reveal on scroll-up.

### M7. `isMobile` is read once, not reactively
`BudgetView` (~line 3983) checks `window.innerWidth <= 768` in an effect to kick users off the Daily sub-tab. Rotating a tablet or resizing never re-evaluates; other components use `pointer:coarse` CSS. Standardize on one `useMediaQuery` hook (`matchMedia` + listener) used everywhere JS needs the breakpoint, matching the CSS breakpoints exactly.

### M8. Entry cards triple-encode type and show raw ISO dates
Each card shows an "EXPENSE" tag **and** a red amount **and** a category chip; dates render as `2026-01-05`. Drop the INCOME/EXPENSE tag (sign + color already carry it), humanize dates ("Jan 5 · Monthly"), and remove the zebra striping — alternating white/beige on separated cards reads as inconsistency rather than rhythm.

### M9. Bottom-nav active state is weak, and the tab set mislabels
Active tab differs only by bold text under an emoji. Use the accent color on icon + label, `aria-current="page"`, and consider a small pill indicator. (Icons themselves: see D1.)

**Already good on mobile (keep):** bottom sheets for modals, 16px inputs, `env(safe-area-inset-*)` everywhere, haptics on tab taps, swipe coach mark, camera-only-on-touch attach button, register card view, `overscroll-behavior: contain` on modals.

---

## 4. Visual design / professionalism (both form factors)

### D1. Replace emoji with a real icon system — the single biggest "professional" lever
Emoji appear in: bottom nav (🏠 red-calendar 🎯 ✦ ⚙️), budget sub-tab pills (mixed emoji + text glyphs ☰ ▦), empty states (🎯 📔 💰), AI cards, Settings (⚙ 🔑), search (🔍), login logo (💰 — which also doesn't match the header wordmark). Emoji render differently on iOS/Android/Windows, can't be recolored, and fight the navy/green palette.
**Recommendation:** one inline-SVG icon set (Lucide/Feather style, 24px grid, 1.5–2px stroke, `currentColor`), delivered as a tiny `Icon` component. This instantly unifies nav, pills, buttons, and empty states in both themes.

### D2. Calm the color semantics
Green/red currently mark *category totals* as well as *state*. "Total Expenses $8,629" in alarm-red reads as an error even when on-plan, and negative amounts get both parentheses **and** red (double encoding).
**Recommendation:** neutral ink (`--text`) for totals and balances; reserve green/red for deltas, over/under-target states, and signed amounts in ledgers. Pick one negative-number convention (sign or parentheses) and use it everywhere.

### D3. Typography: reduce the "terminal wall" effect
IBM Plex Mono at large sizes for every KPI plus 11px ALL-CAPS letter-spaced labels on every card creates monotony and hurts scanability.
**Recommendation:** Inter with `font-variant-numeric: tabular-nums` for large KPI numbers (keep mono for in-table amounts where column alignment matters); sentence-case 13px/600 section titles, reserving the caps style for true micro-labels. Establish a 4-step type scale (11/13/16/22) and stick to it.

### D4. Category chip palette
15 fully saturated hues (`DEFAULT_CATEGORY_COLORS`) produce a rainbow in dense tables. Derive chips as 10–12% tints with darker text of the same hue (the BvA chips already do this well — extend that treatment everywhere), and validate the generated pairs for AA contrast in both themes.

### D5. Small polish list
- Desktop Budget table header shows "DA" (clipped "DAY").
- Sparklines in the Annual Income/Expenses tiles bleed to the card edge — inset them.
- Radius tokens: 5/8/14/16/20px + circles all coexist; define `--r-sm/md/lg` (e.g. 6/10/16) and apply consistently.
- The login screen's tagline/logo don't match the in-app brand (emoji vs. SVG wordmark).
- "Connect & Create Gist" primary action renders grey (looks disabled) in Settings.
- `fmt()` hardcodes `en-CA`/`$` — fine today, but centralize currency/locale in one place if that ever changes.

---

## 5. Architecture

### A1. No source in the repo — the compiled bundle is the codebase
`index.html` (796 KB, 10,190 lines) contains minified React, a Recharts build, and ~9,600 lines of esbuild-transpiled app code (`__spreadValues`, `/* @__PURE__ */` markers). There is no `src/`, no build config, no way to run the "real" code.
**Recommendation:** commit the actual source (`src/` modules + esbuild config) and add a GitHub Action that builds and deploys the single-file artifact to Pages. You keep the zero-dependency deployment while regaining reviewable diffs, JSX, and the ability to split the app into modules. This is the highest-leverage architectural change; almost everything else in this report becomes easier after it.

### A2. Monolith component file / styling model
~40 components in one closure with 560 inline `style:{...}` objects, plus a global stylesheet whose mobile layer must fight those inline styles with ~90 `!important` rules. Migrate hot spots (tables, cards, buttons, form fields — the `.cf-*`/`.tx*` classes already started this) to classes driven by the existing CSS custom properties, and delete the `!important` overrides as inline styles disappear.

### A3. State management
`App()` owns 20+ `useLS` hooks and prop-drills into every view; cross-view actions already resort to a global (`window.__cfGoBudgetSub`). Group state into 3–4 contexts (data, settings, UI) or a reducer per domain. Also note `useLS` state is per-hook-instance: two components reading the same key won't stay in sync — fine today because everything lives in `App`, but a trap for refactors (and another argument for A1/A2).

### A4. No URL routing
Tab/sub-tab live in `sessionStorage`; Back exits the app and nothing is deep-linkable. Hash-based routing (`#/budget/forecast`) would give mobile users a working Back button (big Android win), shareable locations, and browser history for modals (close-on-back).

### A5. PWA details
- Service worker is generated from an inline string into a Blob URL with a manually bumped `CACHE='cf-v174'` — easy to forget; derive the version from a build hash once A1 lands.
- The manifest is a `data:` URI with an SVG-emoji icon; some launchers won't render maskable icons from this. Ship real `manifest.json` + PNG icons (192/512).
- **Fonts:** Inter and IBM Plex Mono load via Google Fonts `@import` — render-delayed online and **absent offline**, so the installed PWA falls back to system fonts precisely when it's being used as an app. Self-host the WOFF2 files (or accept a system-font stack as the offline design).

### A6. Performance
796 KB HTML parsed on every cold load (SW mitigates repeats). The base64 PNG logo (~40 KB) could be SVG. Recharts is the heaviest dependency for four chart types; long-term, a hand-rolled SVG chart layer (the sparklines already prove the approach) could cut the bundle dramatically — only worth doing after A1.

---

## 6. Prioritized plan

**P0 — trust & correctness (small diffs)**
1. C1 credential/personal-data removal (+ rotate the password).
2. C2 migration guard so demo data loads for new users.
3. M4 dark-mode chart colors (theme the series palette).

**P1 — mobile money visibility (the audit's core)**
4. M1 monthly ledger cards on mobile.
5. M2 forecast signed-amount column.
6. M3 two-line Upcoming rows.
7. M5 filters bottom sheet; M6 FAB clearance.

**P2 — professional visual system**
8. D1 SVG icon set replacing all emoji UI glyphs (incl. bottom nav + login logo).
9. D2/D3 color-semantics and typography pass; D4 chip tints; D5 polish list.
10. M9 bottom-nav active state.

**P3 — architecture**
11. A1 restore source + CI build (do this before, or together with, P2 to avoid editing compiled output).
12. A4 hash routing; A5 manifest/fonts; A2/A3 incremental refactor.

---

*Verification notes: findings M1–M4, M6, C2, and the dark-mode chart issue were confirmed by rendering the live page in Chromium with seeded fictional data at 393×852 (coarse pointer) and 1440×900; screenshots were reviewed for every tab, sub-tab, modal, and both themes.*
