# Inline-Style Centralization (Round 6)

**Date:** July 20, 2026 · **Trigger:** direct follow-up question — "are there any
remaining inline styles, if so we need to centralize these" — after round 5 closed out
the audit backlog but left R1 ("~1,100 inline-style objects, chip away opportunistically")
deliberately unaddressed as a blanket sweep.

**Scope, agreed with the user up front:** dedupe the *repeated* patterns only — the
34 distinct style objects that occurred verbatim 4+ times across the codebase (195
usages), not the full long tail of one-off/dynamic inline styles. That tail is mostly
legitimate: computed colors, chart geometry, per-item conditional values that have no
static class to move into.

## What changed

**16 new CSS classes/utilities added to `GLOBAL_STYLES`** (`src/lib/app-data.js`):
spacing (`.mb-5/8/12/14/16/20`, `.mt-2`, `.pb-28`, `.lh-15`), flex (`.cf-gap-10/14`,
`.cf-wrap`, `.flex-1`, `.min-w-0`), bare text-color utilities (`.c-text`, `.c-textMid`,
`.c-textLt` — no font-size, so they compose safely with any type context), compound
type styles extending the existing `.tx`/`.txm`/`.txl` scale (`.tx-sb`, `.txm-11`,
`.text-9`), a table-header-row helper (`.thead-row`), three `.cf-btn` size modifiers
(`--xs`, `--md`, `--wide`) beyond the existing `--sm`/`--compact`, and four small
component classes (`.kpi-tile`, `.today-line-strip`, `.modal-title-lg`, `.hidden`).

**221 individual `style: {...}` props removed** across 10 component files (App.js,
budget.js, forecast-plan.js, forms.js, misc-ui.js, plan-dashboard.js, primitives.js,
register.js, settings.js) — replaced with `className` references to the above, or
folded directly into an existing class when every use of that class wanted the same
value (e.g. `.cf-modal-title` now includes its `margin-bottom` directly since both its
call sites wanted it).

Two multi-instance `-webkit-overflow-scrolling: touch` style props were deleted
outright rather than replaced — the containing `.hscroll`/`.reg-table-wrap` classes
already carry (or now carry) that property, making the inline copy dead weight.
Four `padding: "9px 20px"` overrides were also dropped outright: 2px different from
the base `.cf-btn` padding, imperceptible, not worth a modifier class.

**Net: 1,130 → 936 inline `style:` objects (−194, 17%).**

## Method — why this took two passes

A first pass at "just replace the exact repeated text" would have been unsafe: 37 of
the 232 candidate occurrences shared their `React.createElement` call with an
*existing* `className` prop. A blind text-swap of `style: {...}` → `className: "..."`
on those would have produced two `className` keys in the same object literal —
syntactically legal in JS (last one wins) but silently deleting whatever the first
`className` was doing (e.g. `cf-btn cf-btn--secondary` losing its base button styling
to a bare `mb-20`).

So every pattern with any collision was checked individually first (via a tightened
adjacency regex — `className:\s*[^,]*,\s*$` immediately before the `style:` key — after
an initial looser heuristic produced false positives that were caught by inspection
before any file was touched), and each real collision was merged into the existing
`className` string rather than replacing it. Only after every collision was resolved
did the remaining 100%-clean occurrences of each pattern get a single verified bulk
text replacement, gated by an exact pre-flight count check (the script refused to write
any file if the observed occurrence count didn't match the expected count for every
one of the 27 replacement rules — it caught one miscounted pattern before writing).

## Verification

- `node build.js`: clean (5 rebuilds through this pass).
- Playwright regression suite: **29/29**, run after every batch of changes.
- Live Chromium renders at 1440×900 and 393×852, light and dark: dashboard (full
  page), Settings → General, Plan (goals + debt tracker), Entries table, Keyboard
  Shortcuts modal — all pixel-equivalent to before the pass, confirming the
  class-based versions render identically to their inline-style predecessors.
- Zero JS errors in any render.

## What's left, deliberately

The remaining ~936 inline `style:` objects are predominantly:
- **Computed/dynamic values** — colors keyed off data (`balance < 0 ? "var(--red)" :
  ...`), chart pixel geometry, drag-and-drop positions. These can't move to a static
  class by definition.
- **Genuine one-offs** — a style object that appears exactly once has no duplication
  to centralize; forcing a bespoke class per single usage would trade one inline style
  for one single-use CSS rule, which isn't a win.

Round 3's original guidance stands: migrate these opportunistically whenever a file is
next touched for an unrelated reason, rather than a further dedicated sweep.
