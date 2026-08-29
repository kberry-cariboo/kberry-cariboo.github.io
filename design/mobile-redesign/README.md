# CashFlow Runway — a mobile-first concept

A self-contained, clickable prototype of what CashFlow Budget could be if the
phone were the starting point rather than the narrow case. It is **not** part of
the app: nothing under `src/`, `index.html` or `sw.js` is touched, and the
prototype reads none of your data — it runs on a seeded fictional household.

```
design/mobile-redesign/
  index.html        the whole prototype, one self-contained file
  screens/          48 screenshots (every screen, light and dark) + a contact sheet
  README.md         this file
```

## Running it

Serve the repo root with any static file server and open
`/design/mobile-redesign/index.html`. On a phone it fills the screen; on a
desktop it renders in a device frame with the rationale beside it.

```bash
npx http-server -p 8080 -s .
# then http://localhost:8080/design/mobile-redesign/index.html
```

Open `screens/index.html` for the contact sheet.

## What it changes

### Fifteen destinations become four, plus one compose action

Today's app has 5 tabs, 5 Budget sub-views, 3 Plan sub-views, 4 Settings pages,
plus Alerts and Help. The concept has **Today · Flow · Envelopes · Plan**, a
centre **+**, and **You** behind the avatar. Nothing is dropped — the *Design
notes* screen inside the prototype maps every feature of the current app to its
new home.

The five Budget sub-tabs become four **lenses** over one timeline (List ·
Calendar · Curve · Entries). Because they are lenses rather than tabs, the
month, the account, the filters and the search all survive a switch.

### One row, everywhere

The audit's §4.1 finding — Monthly, Forecast and Entries rendering the same data
three different ways inside one tab — is designed out rather than patched. A
dated occurrence uses the same component with the same affordances on Today, in
every lens, and in the calendar day panel.

### Colour is reserved for state

The current app paints every income green and every expense red, which flattens
the signal: a genuinely alarming number looks like an ordinary one. Here the
substrate is ink on ruled ledger paper, and the only coloured things on screen
are the ones that mean something — below threshold, over target, on track, paid,
transfer. Category identity is a small tinted dot, not a filled chip, so a dense
list stays quiet.

### The balance rail

A hairline rail runs down the left of the timeline, tinted by projected balance
against the alert threshold. Scroll the year and the runway changes colour under
your thumb. The same idea drives the 90-day bar on Today. It replaces reading a
KPI tile and then a chart.

### Other departures

- **The scrubber.** The sticky month strip *is* the year's closing-balance
  curve, and you can drag across it to scrub months. It replaces the month
  pills, the year badge and the 2 × 2 KPI grid.
- **Swipe right to pay, left to skip.** The two things people actually do to a
  ledger row get the gesture; the rest stays in the row menu.
- **Plain-English recurrence.** All seven recurrence units as tappable chips —
  "the third Friday", "1st & 15th", "last banking day before" — with the
  resulting schedule written out underneath.

Kept from the current app because they are already right: sheets with drag
handles, snap points and swipe-down dismiss; pinned sheet action bars; `dvh`
sizing; haptics; the 44px floor; safe-area insets.

## The numbers are real

Every figure is computed in **integer cents** — the app's own convention — from
one seeded household, so they agree wherever you look. The prototype implements
recurrence expansion for all seven units (daily, weekly-on-days, monthly,
yearly, semi-monthly, month-end, nth-weekday), the statutory-holiday banking-day
shift for payroll, per-occurrence overrides and actual-paid amounts, skips,
running balances per account, envelope rollover, and the avalanche/snowball
payoff simulation.

The seeded household is deliberately *tight*: income covers the year by about
$300 a month, and the lumpy annual bills (property tax in July, tyres and the
car-insurance renewal in October) push the projected balance under the $1,500
floor through November and briefly overdrawn on the 12th. That is what makes
the runway worth looking at.

## How it was checked

Driven in Chromium at **320 / 390 / 430 / 820 px** with `isMobile` and
`hasTouch`, across 19 states in both themes — the same method
`MOBILE-UI-AUDIT.md` used:

| Check | Result |
| --- | --- |
| Horizontal overflow (box escapes the frame, or a non-scrollable clip) | **0** |
| Content overlapping the bottom nav | **0** |
| Touch targets below the WCAG 2.5.8 AA floor of 24 × 24 | **0** |
| JavaScript errors | **0** |

Two control groups sit below the 44px HIG target but above the AA floor,
because a phone cannot fit them otherwise: the twelve month buttons in the
scrubber (26–35 × 44 — the whole strip is also draggable) and the seven
calendar day cells (39 × 46).

## Migration, if this were ever built

**No financial data changes shape.** All 19 money-bearing fields in
`HOUSEHOLD_FIELDS` (`src/lib/household-sync.js`) are read exactly as they are
today, and `cf_payload_keys()`, `cf_apply_household_payload` and the
`load_household` / `save_household` RPCs are untouched — so no Supabase
migration, and none of the silent inner-field-drop risk the main README warns
about.

Four of the 28 synced fields are affected, and all four are layout preferences
the app already excludes from its own backup export:

| Field | What happens |
| --- | --- |
| `colOrder` (+ device-local `cf_budget_col_order`) | Column order for tables this design doesn't render; already inert on phones. Keep the key (the schema *refuses* unknown top-level keys) and stop reading it, or repurpose it for the Entries lens. |
| `dashOrder` / `dashHidden` | 18 widget ids need an explicit map to the new Today blocks. Worst case a custom order falls back to the default. |
| `regFilter*` | Survives unchanged into the Entries lens. |

The one genuine breakage is **routing**: bookmarks and home-screen shortcuts
pointing at `#/budget/monthly`, `#/plan/strategy`, `#/ai`, `#/alerts` and
friends need a redirect table in `parseTabHash` (`src/lib/app-data.js`), or old
links quietly fall back to the home screen. The Web Push schedule and installed
PWAs need no handling at all.
