import { safeStorage, useCallback, useEffect, useMemo, useState } from "../lib/runtime.js";
import { centsToDollars, dollarsToCents } from "../lib/migrate.js";
import { depositShiftNote, getMonthSummaries, isInflowEvent, isOutflowEvent, signedAmount } from "../lib/dates.js";
import { ExportBar, downloadCSV, fmt, fmtAxisK, fmtDate, moneySymbol, printView, roundMoney } from "../lib/format.js";
import { Area, AreaChart, CartesianGrid, DEFAULT_ALERT_THRESHOLD, Legend, Line, MONTHS, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, eventMatchesSearch, prefersReducedMotion, useIsMobile, useLS } from "../lib/app-data.js";
import { aiCanRun, aiErrorMessage, aiProbeProxy, callClaude } from "../lib/ai.js";
import { Card, CatChip, ChartTip, GridPagination, HelpTip, KpiCard, LedgerRow, PillToggle, Toggle, cumulativeRows, useInfiniteScroll } from "./primitives.js";
import { AddEntryModal } from "./forms.js";
import { Icon } from "./misc-ui.js";
import { DASH_AXIS_TICK_X, DASH_AXIS_TICK_Y } from "./plan-dashboard-shared.js";
import type { Cents, Entry, FlowRow, Goal, YearConfig } from "../types.js";
  export interface ForecastViewProps {
    apiKey?: string;
    isOffline?: boolean;
    yearFlows: any;
    yearConfigs: YearConfig[];
    openBalByYear: any;
    alertThreshold?: number;
    globalSearch?: string;
    budgetTargets?: Record<string, any>;
    horizon?: number;
    setHorizon?: (...args: any[]) => any;
    categories?: string[];
    categoryColors?: Record<string, any>;
    addEntry?: any;
    templates?: any[];
    setTemplates?: any;
    completed?: Record<string, any>;
    toggleComplete?: (...args: any[]) => any;
    entries?: Entry[];
    scenarioOn?: boolean;
    setScenarioOn?: (...args: any[]) => any;
    scenarioAdj?: Record<string, any>;
    setScenarioAdj?: (...args: any[]) => any;
    scenarioFlows?: any;
  }
  export function ForecastView({ apiKey = "", isOffline = false, yearFlows, yearConfigs, openBalByYear, alertThreshold = DEFAULT_ALERT_THRESHOLD, globalSearch = "", budgetTargets = {}, horizon = 90, setHorizon = () => {
  }, categories = [], categoryColors = {}, addEntry = null, templates = [], setTemplates = null, completed = {}, toggleComplete = () => {
  }, entries = [], scenarioOn = false, setScenarioOn = () => {
  }, scenarioAdj = {}, setScenarioAdj = () => {
  }, scenarioFlows = null }: ForecastViewProps) {
    const isMobile = useIsMobile();
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [pgSize, setPgSize] = useLS("cf_forecastPageSize", 20);
    // How many pages' worth have been revealed so far. Not a page *number*:
    // the forecast loads cumulatively at every width (see pgInfo).
    const [loaded, setLoaded] = useState(1);
    const changePageSize = (v) => {
      setPgSize(v);
      setLoaded(1);
    };
    // Snapshot once: a fresh Date each render changes the memo dependency's
    // identity and would recompute futureEvents on every render.
    const today = useMemo(() => new Date(), []);
    const horizons = [30, 60, 90];
    const gq2 = (globalSearch || "").toLowerCase();
    const futureEvents = useMemo(() => {
      const end = new Date(today);
      end.setDate(end.getDate() + horizon);
      const all = [];
      yearConfigs.forEach((yc) => {
        const flow = yearFlows[yc.year] || [];
        flow.forEach((ev) => {
          if (ev.date >= today && ev.date <= end) all.push({ ...ev, year: yc.year });
        });
      });
      return all.sort((a, b) => a.date - b.date);
    }, [yearFlows, yearConfigs, horizon, today]);
    // Running month-to-date outflow per category, keyed by occurrence id, so
    // the "vs target" column can compare a month's spending against a month's
    // target.
    //
    // The column used to divide a *single* occurrence's amount by the whole
    // month's target and print the result as a "confidence" percentage. Two
    // separate problems: the units didn't match — a bi-weekly $260 grocery
    // against a $560 monthly Food target scored a reassuring ✓ even though
    // the second one blows it — and no reading of "confidence" describes a
    // budget ratio, so a row over its target looked like a forecast the app
    // wasn't sure about.
    //
    // Accumulated across the whole year's flow rather than futureEvents,
    // because a September occurrence has to count what September already
    // spent before today, which is behind the forecast window.
    const catMtdById = useMemo(() => {
      const out = {};
      yearConfigs.forEach((yc) => {
        const running = {};
        (yearFlows[yc.year] || []).forEach((ev) => {
          // Expenses only, matching what Budget vs Actual counts. Transfers
          // sit outside the target system by design (see the Help page and
          // getMonthSummaries), so counting one here would judge a row
          // against a target Budget vs Actual will never show it against.
          if (ev.type !== "expense") return;
          const key = `${ev.month}:${ev.category}`;
          running[key] = (running[key] || 0) + ev.amount;
          out[ev.id] = running[key];
        });
      });
      return out;
    }, [yearFlows, yearConfigs]);
    // The balance day by day across the horizon — the one thing the view whose
    // job is "where is this heading" had no way to show. It was a paginated
    // table: three pages for a 90-day horizon, with the low point unmarked even
    // though the Dashboard knows it well enough to put it in a tile.
    //
    // Every occurrence already carries the running balance after it, so a day
    // with something on it takes the balance of its last event and a quiet day
    // holds the one before — which is what makes this a curve rather than a
    // scatter of the days something happened.
    // The same window over the scenario's flows. Built from the identical
    // filter so the two curves are comparable day for day: any difference
    // between them is the adjustments and nothing else.
    const scenarioEvents = useMemo(() => {
      if (!scenarioFlows) return null;
      const end = new Date(today);
      end.setDate(end.getDate() + horizon);
      const all = [];
      yearConfigs.forEach((yc) => {
        (scenarioFlows[yc.year] || []).forEach((ev) => {
          if (ev.date >= today && ev.date <= end) all.push(ev);
        });
      });
      return all.sort((a, b) => a.date - b.date);
    }, [scenarioFlows, yearConfigs, horizon, today]);
    // A day-by-day balance series over the horizon, from a list of the events
    // that fall in it. Shared by the real forecast and by a what-if scenario,
    // so the two curves can never be built differently and disagree about
    // anything except the adjustments themselves.
    const curveFrom = useCallback((events, flowsByYear) => {
      const dayStart = (d) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };
      const t0 = dayStart(today);
      // What the horizon opens on: the balance standing before its first
      // event, or — with nothing scheduled in it at all — the figure the last
      // event before today left behind.
      let bal = 0;
      if (events.length) {
        bal = events[0].balance - signedAmount(events[0]);
      } else {
        let latest = null;
        yearConfigs.forEach((yc) => ((flowsByYear || {})[yc.year] || []).forEach((ev) => {
          if (ev.date <= today && (!latest || ev.date > latest.date)) latest = ev;
        }));
        bal = latest ? latest.balance : openBalByYear[today.getFullYear()] || 0;
      }
      // Last event of a day wins: the list is date-sorted, so the final write
      // for a key is that day's closing balance.
      const closeOf = new Map();
      events.forEach((ev) => closeOf.set(dayStart(ev.date).getTime(), ev.balance));
      const out = [];
      for (let i = 0; i <= horizon; i++) {
        const d = new Date(t0);
        d.setDate(d.getDate() + i);
        const k = d.getTime();
        if (closeOf.has(k)) bal = closeOf.get(k);
        out.push({
          // `day` names the row — it is what the tooltip shows. `tick` is what
          // the axis prints, which is not the same thing: ninety date labels
          // will not fit, and thinning them by every-Nth would land on
          // arbitrary days. Name the 1st of each month and the day the horizon
          // opens; everything else prints nothing.
          day: fmtDate(d, today.getFullYear()),
          tick: (i === 0 && d.getDate() <= 25) || d.getDate() === 1 ? fmtDate(d, today.getFullYear()) : "",
          date: d,
          balance: bal
        });
      }
      return out;
    }, [today, horizon, yearConfigs, openBalByYear]);
    const curve = useMemo(() => {
      const base = curveFrom(futureEvents, yearFlows);
      if (!scenarioEvents) return base;
      // Both series on the same rows rather than two charts side by side: the
      // question is "how far apart do these two get, and when", which is a
      // comparison you cannot make across two sets of axes.
      const alt = curveFrom(scenarioEvents, scenarioFlows);
      return base.map((p, i) => ({ ...p, scenario: alt[i] ? alt[i].balance : p.balance }));
    }, [curveFrom, futureEvents, yearFlows, scenarioEvents, scenarioFlows]);
    // What a scenario can vary. One-time entries are already a decision made on
    // a date; "what if I dropped this" is a question about the things that keep
    // coming back. Biggest first, which is the order someone looking for room
    // in a budget reads them in.
    const recurringEntries = useMemo(
      () => entries.filter((e) => e.repeats).slice().sort((a, b) => b.amount - a.amount),
      [entries]
    );
    // What the scenario is worth, in the two numbers people actually act on.
    const scenarioDelta = useMemo(() => {
      if (!scenarioEvents || !curve.length) return null;
      const last = curve[curve.length - 1];
      const lowBase = curve.reduce((m, p) => Math.min(m, p.balance), Infinity);
      const lowAlt = curve.reduce((m, p) => Math.min(m, p.scenario), Infinity);
      return { end: last.scenario - last.balance, low: lowAlt - lowBase, lowAlt };
    }, [scenarioEvents, curve]);
    // Where the curve bottoms out, and how far down. The chart marks it; until
    // now the number appeared only in the danger banner, without a date.
    const lowPoint = useMemo(() => {
      if (!curve.length) return null;
      let best = 0;
      curve.forEach((p, i) => {
        if (p.balance < curve[best].balance) best = i;
      });
      return { index: best, balance: curve[best].balance, date: curve[best].date };
    }, [curve]);
    // The banner's figure and the chart's marker are the same number, read off
    // the same curve. They used to be computed two different ways on one
    // screen — the banner over event balances, which is the same answer only
    // as long as nothing about how the horizon opens ever differs.
    const searchedEvents = futureEvents.filter((ev) => eventMatchesSearch(ev, gq2));
    // Cumulative at every width, where the desktop table used to paginate. A
    // forecast is a rolling window — "the next 90 days" cut into page 1, page 2
    // and page 3 stops rolling the moment you have to press Next, and the
    // stretch that matters (the run-up to the low point) is as likely to
    // straddle a page break as not. Scrolling keeps the run continuous, and the
    // chart above answers "where is this heading" without any scrolling at all.
    const pgInfo = cumulativeRows(searchedEvents, loaded, pgSize);
    useInfiniteScroll(pgInfo.hasMore, () => setLoaded((l) => l + 1));
    const pagedEvents = pgInfo.rows;
    // Mobile presentation matches Budget → Monthly and Entries: the same card,
    // the same paid checkbox, the same category chip. Forecast used to be the
    // one list in the Budget tab that stayed a table on a phone, which meant a
    // row you could tick off in Monthly went inert two taps away, and the
    // description column was hard-capped at 130px while the balance column had
    // slack. Editing still isn't offered here — Forecast projects across year
    // boundaries and the override machinery is year-scoped — so a row opens
    // nothing; the checkbox is the whole interaction.
    const renderForecastCards = () => <Card className="cf-card--flush">
      {pagedEvents.map((ev) => <LedgerRow
        key={ev.id}
        ev={ev}
        alertThreshold={alertThreshold}
        paid={!!completed[ev.id]}
        dateLabel={fmtDate(ev.date, today.getFullYear())}
        onTogglePaid={toggleComplete}
        categories={categories}
        categoryColors={categoryColors}
      />)}
      <GridPagination
        pageInfo={pgInfo}
        pageSize={pgSize}
        setPageSize={changePageSize}
        label="events"
        isMobile={true}
      />
    </Card>;
    return <div className="cf-page forecast-page">
      <Card className="mb-16 forecast-setup">
        <div className="forecast-header-row">
          <span className="forecast-label">{horizon}-Day Forecast</span>
          <div className="cf-row cf-gap-8 cf-wrap">
            <PillToggle
              options={horizons.map((h) => ({ id: h, label: h + " days" }))}
              value={horizon}
              onChange={setHorizon}
            />
          </div>
        </div>
        <div className="txm forecast-sub">Rolling cash flow from today</div>
        {gq2 && <div className="notice notice--sm" data-tone="warn" role="status">
          <Icon name="search" size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
          Filtering forecast by "
          {globalSearch}
          {'" \u2014 '}
          {futureEvents.length}
          {" match"}
          {futureEvents.length !== 1 ? "es" : ""}
        </div>}
      </Card>
      <Card className="mb-16 forecast-setup">
        <div className="cf-row-between cf-gap-10 cf-wrap">
          <div className="section-title-wrap">
            <h2 className="cf-section-title-text">What if…</h2>
            <HelpTip
              label="What if"
              text="Try a change without making it. Drop a recurring entry or put a different amount on it, and the dashed line on the chart below shows where the balance would go instead. Nothing here touches your budget, and it stays on this device — it is a question, not a plan."
            />
          </div>
          <Toggle value={scenarioOn} onChange={setScenarioOn} label="Try a change" />
        </div>
        {scenarioOn && <>
          <div className="txm mt-8 mb-12">
            Pick the recurring entries to change. The forecast below draws both.
          </div>
          <div className="scenario-list">
            {recurringEntries.length === 0 ? <div className="italic-hint">
              No recurring entries to vary yet.
            </div> : recurringEntries.map((e) => {
      const adj = (scenarioAdj || {})[e.id];
      const dropped = !!(adj && adj.drop);
      const amt = adj && Number.isFinite(adj.amount) ? adj.amount : e.amount;
      const setAdj = (next) => setScenarioAdj((prev) => {
        const out = { ...prev || {} };
        if (next) out[e.id] = next;
        else delete out[e.id];
        return out;
      });
      return <div key={e.id} className={"scenario-row" + (adj ? " scenario-row--on" : "")}>
        <span className="tx scenario-desc" title={e.desc}>{e.desc}</span>
        <CatChip
          category={e.category}
          categories={categories}
          categoryColors={categoryColors}
          style={{ fontSize: 9, flexShrink: 0 }}
        />
        <span className="cf-row cf-gap-6 shrink-0">
          <span className="dollar-sm">{moneySymbol()}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            aria-label={`New amount for ${e.desc}`}
            className="field-input field-input--mono scenario-amt"
            disabled={dropped}
            value={centsToDollars(amt)}
            onChange={(ev) => {
          const v = dollarsToCents(ev.target.value);
          setAdj(v === e.amount ? null : { amount: v });
        }}
          />
          <button
            type="button"
            aria-pressed={dropped}
            title={dropped ? "Put it back" : "Drop it from the scenario"}
            className="cf-btn cf-btn--secondary cf-btn--micro"
            onClick={() => setAdj(dropped ? null : { drop: true })}
          >
            {dropped ? "Restore" : "Drop"}
          </button>
        </span>
      </div>;
    })}
          </div>
          {scenarioDelta ? <div className="scenario-summary">
            <div>
              {"In "}
              {horizon}
              {" days you would end "}
              <strong style={{ color: scenarioDelta.end >= 0 ? "var(--greenDk)" : "var(--red)" }}>
                {fmt(scenarioDelta.end, true)}
              </strong>
              {" on where you are heading now."}
            </div>
            <div className="mt-4">
              {"The low point moves to "}
              <strong className="cf-text-mono-13">{fmt(scenarioDelta.lowAlt)}</strong>
              {" \u2014 "}
              <strong style={{ color: scenarioDelta.low >= 0 ? "var(--greenDk)" : "var(--red)" }}>
                {fmt(scenarioDelta.low, true)}
              </strong>
              .
            </div>
            {Object.keys(scenarioAdj || {}).length > 0 && <button
              type="button"
              className="cf-btn cf-btn--secondary cf-btn--tiny mt-10"
              onClick={() => setScenarioAdj({})}
            >
              Clear the scenario
            </button>}
          </div> : <div
            className="italic-hint mt-10"
          >
            Change an amount or drop an entry, and the comparison appears here.
          </div>}
        </>}
      </Card>
      {futureEvents.length > 0 && <Card className="mb-16">
        <div className="forecast-chart-label">Projected balance, day by day</div>
        <div className="pb-28">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={curve}
              // Room above the plot for the low-point marker's caption, which is
              // drawn just outside the top of the plotting area.
              margin={{ top: 22, right: 8, bottom: 0, left: 4 }}
              ariaLabel={`Chart of the projected balance for each of the next ${horizon} days. It opens at ${fmt(curve[0].balance)} and ends at ${fmt(curve[curve.length - 1].balance)}` + (lowPoint && lowPoint.index > 0 ? `, dipping to a low of ${fmt(lowPoint.balance)} on ${fmtDate(lowPoint.date, null)}` : "") + `. Your alert threshold is ${fmt(alertThreshold)}.` + (scenarioDelta ? ` A second, dashed line shows the what-if scenario: it ends ${fmt(scenarioDelta.end, true)} on that, with its low at ${fmt(scenarioDelta.lowAlt)}.` : "") + " The table below lists every event behind it."}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
                interval={0}
                tickFormatter={(v, i) => curve[i] ? curve[i].tick : ""}
                tick={DASH_AXIS_TICK_X}
                tickMargin={4}
              />
              <YAxis tickFormatter={fmtAxisK} tick={DASH_AXIS_TICK_Y} tickMargin={6} width={44} />
              <Tooltip content={ChartTip} />
              <ReferenceLine y={0} stroke="var(--red)" strokeDasharray="4 4" />
              {// The threshold the danger banner is counting against, drawn where the
      // curve can be read against it rather than described underneath.
      <ReferenceLine
        y={alertThreshold}
        stroke="var(--amberInk)"
        strokeDasharray="5 4"
        label={`Alert ${fmt(alertThreshold)}`}
      />
}
              {lowPoint && lowPoint.index > 0 && <ReferenceLine
                x={lowPoint.index}
                stroke={lowPoint.balance < 0 ? "var(--red)" : "var(--amberInk)"}
                strokeDasharray="2 3"
                label={`Low ${fmt(lowPoint.balance)} \u00b7 ${fmtDate(lowPoint.date, null)}`}
              />}
              <Area
                type="monotone"
                dataKey="balance"
                name={scenarioEvents ? "As it stands" : "Balance"}
                stroke="var(--text)"
                strokeWidth={2}
                fill="var(--text)"
                fillOpacity={0.1}
                dot={false}
              />
              {// Drawn as a line, not a second filled area: two overlapping fills read
      // as a third colour where they cross, which is the region that matters.
      scenarioEvents && <Line
        type="monotone"
        dataKey="scenario"
        name="What-if"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeDasharray="6 4"
        dot={false}
      />
}
              {scenarioEvents && <Legend wrapperStyle={{ fontSize: 12 }} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>}
      <div className="forecast-exportbar-row">
        <ExportBar
          onAdd={addEntry ? () => setShowAddEntry(true) : null}
          onCSV={futureEvents.length === 0 ? null : () => {
          const rows = searchedEvents.map((ev) => {
            const dateStr = fmtDate(ev.date, null);
            return [dateStr, ev.desc, ev.category, isInflowEvent(ev) ? centsToDollars(ev.amount) : "", isOutflowEvent(ev) ? centsToDollars(ev.amount) : "", centsToDollars(ev.balance)];
          });
          downloadCSV(`CashFlow_Forecast_${horizon}day.csv`, rows, ["Date", "Description", "Category", "In", "Out", "Balance"]);
        }}
          onPrint={futureEvents.length === 0 ? null : () => printView(`CashFlow Forecast - ${horizon} Days`)}
        />
      </div>
      <AddEntryModal
        show={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        onSave={addEntry || (() => {})}
        categories={categories}
        apiKey={apiKey}
        isOffline={isOffline}
        templates={templates}
        setTemplates={setTemplates}
      />
      {futureEvents.length === 0 && <Card>
        <p className="forecast-empty-text">{"No upcoming events in the next "}{horizon}{" days."}</p>
      </Card>}
      {futureEvents.length > 0 && (isMobile ? renderForecastCards() : <Card className="cf-card--flush">
        <div className="hscroll hscroll--paged" tabIndex={0} role="region" aria-label="Forecast table">
          <table className="forecast-table">
            <thead>
              <tr className="thead-row">
                {["Date", "Description", "Category", "In", "Out", "Balance", "vs Target"].map((h, i) => <th
                  key={h}
                  className={(h === "Category" ? "forecast-col-cat " : "") + (h === "vs Target" ? "forecast-conf-col " : "") + "forecast-th"}
                  style={{
      textAlign: i >= 3 ? "right" : "left"
    }}
                >
                  {h}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {pagedEvents.map((ev, i) => {
      const dateStr = fmtDate(ev.date, today.getFullYear());
      return <tr
        key={ev.id}
        className="forecast-tr"
        style={{ background: i % 2 === 0 ? "var(--bgCard)" : "var(--stripe)" }}
      >
        <td className="forecast-td-date">
          {dateStr}
          {ev.depositShifted && <HelpTip
            icon="↤"
            variant="mark"
            label="Deposit date"
            text={depositShiftNote(ev)}
          />}
        </td>
        <td className="forecast-desc-cell" style={{ maxWidth: 180 }}>{ev.desc}</td>
        <td className="forecast-col-cat">
          <CatChip category={ev.category} categories={categories} categoryColors={categoryColors} />
        </td>
        <td className="cf-text-mono-13 forecast-td-income">{isInflowEvent(ev) ? fmt(ev.amount) : ""}</td>
        <td className="cf-text-mono-13 forecast-td-expense">{isOutflowEvent(ev) ? fmt(ev.amount) : ""}</td>
        <td
          className="cf-text-mono-13 forecast-td-balance"
          style={{
        color: ev.balance < 0 ? "var(--red)" : ev.balance < alertThreshold ? "var(--amberInk)" : "var(--text)",
        background: ev.balance < 0 ? "var(--redLt)" : ev.balance < alertThreshold ? "var(--amberLt)" : "transparent"
      }}
        >
          {fmt(ev.balance)}
        </td>
        {(() => {
        const m = ev.month;
        const cat = ev.category;
        const yr = ev.year;
        const target = (budgetTargets[`${yr}:${m}`] || {})[cat] || 0;
        if (ev.type !== "expense") return <td className="forecast-conf-col">
          <span
            className="c-textLt"
            title={isInflowEvent(ev) ? "Money in — budget targets cover spending only" : "Transfers sit outside the budget target system"}
          >
            —
          </span>
        </td>;
        if (!target) return <td className="forecast-conf-col">
          <span className="c-textLt" title={`No monthly budget target set for ${cat}`}>—</span>
        </td>;
        // Where this occurrence leaves the category's month, not what this one
        // occurrence is worth on its own — see catMtdById.
        const mtd = catMtdById[ev.id] != null ? catMtdById[ev.id] : ev.amount;
        const pct = Math.round(mtd / target * 100);
        // The overage, not the ratio. A column headed "vs Target" that shows a
        // figure only once the target is passed is asked exactly one question
        // — how far past — and "107%" makes the reader subtract to answer it,
        // on a screen full of other numbers where a stray 107 reads as an
        // amount. The Help page has always described this as "over its
        // monthly target here, and by how much"; the cell was the one place
        // that disagreed.
        //
        // Derived from the rounded ratio so the ✓ boundary is exactly where it
        // was: 100.4% of target still rounds to 100 and still reads ✓.
        const over = pct - 100;
        if (over <= 0) return <td className="forecast-conf-col">
          <span
            className="c-textLt"
            title={`${cat} in ${MONTHS[m]}: ${fmt(mtd)} of the ${fmt(target)} target`}
          >
            ✓
          </span>
        </td>;
        const color = over <= 20 ? "var(--amberInk)" : "var(--red)";
        return <td className="forecast-conf-col">
          <span
            className="forecast-conf-pct"
            style={{ color }}
            title={`${cat} in ${MONTHS[m]}: ${fmt(mtd)} of the ${fmt(target)} target, ${fmt(mtd - target)} over`}
          >
            +
            {over}
            %
          </span>
        </td>;
      })()}
      </tr>;
    })}
            </tbody>
          </table>
        </div>
        <div className="forecast-legend">
          {"vs Target \u2014 how far past its month\u2019s budget target this occurrence leaves its category. "}
          <span className="c-textLt">✓</span>
          {" within target \u00b7 "}
          <span style={{ color: "var(--amberInk)", fontWeight: 600 }}>+1–20%</span>
          {" slightly over \u00b7 "}
          <span style={{ color: "var(--red)", fontWeight: 600 }}>more than +20%</span>
          {" well over \u00b7 "}
          <span className="c-textLt">—</span>
          {" money in, or no target set"}
        </div>
        <GridPagination
          pageInfo={pgInfo}
          pageSize={pgSize}
          setPageSize={changePageSize}
          label="events"
          isMobile={true}
        />
      </Card>)}
    </div>;
  }
  export interface OnboardingWizardProps {
    yearConfigs: YearConfig[];
    setYearConfigs: (...args: any[]) => any;
    addEntry: (...args: any[]) => any;
    categories: string[];
    setTab: (...args: any[]) => any;
  }
  export function OnboardingWizard({ yearConfigs, setYearConfigs, addEntry, categories, setTab }: OnboardingWizardProps) {
    const [step, setStep] = useState(0);
    const [openBal, setOpenBal] = useState("");
    const [income, setIncome] = useState({ desc: "", amount: "", category: "Income" });
    const [expense, setExpense] = useState({ desc: "", amount: "", category: categories[0] || "" });
    const [done, setDone] = useState(false);
    if (done) return null;
    const steps = [
      // Step 0: Opening balance
      <div key="s0">
        <div className="wizard-step-icon wizard-icon--primary"><Icon name="banknote" size={34} /></div>
        <div className="wizard-step-title">Welcome to CashFlow!</div>
        <div className="wizard-step-subtitle wizard-step-subtitle--lh">
          Let's set up your budget in 3 quick steps. First, what's your current bank balance?
        </div>
        <div className="wizard-amount-row">
          <span className="wizard-dollar-lg">{moneySymbol()}</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="e.g. 5000.00"
            value={openBal}
            onChange={(e) => setOpenBal(e.target.value)}
            autoFocus={true}
            className="wizard-openbal-input"
          />
        </div>
        <div className="wizard-btn-row">
          <button
            onClick={() => {
        const v = dollarsToCents(openBal);
        setYearConfigs((prev) => prev.map((yc, i) => i === 0 ? { ...yc, openingBalance: v } : yc));
        setStep(1);
      }}
            className="cf-btn cf-btn--primary wizard-next-btn"
          >
            Next →
          </button>
          <button onClick={() => setDone(true)} className="cf-btn cf-btn--secondary cf-btn--wide">
            Skip
          </button>
        </div>
      </div>,
      // Step 1: First income
      <div key="s1">
        <div className="wizard-step-icon wizard-icon--green"><Icon name="banknote" size={34} /></div>
        <div className="wizard-step-title">Add your first income</div>
        <div className="wizard-step-subtitle">{`What's your main source of income? (e.g. "Payroll")`}</div>
        <div className="wizard-field-stack">
          <input
            placeholder="Description e.g. Payroll"
            value={income.desc}
            autoFocus={true}
            onChange={(e) => setIncome((p) => ({ ...p, desc: e.target.value }))}
            className="wizard-text-input"
          />
          <div className="cf-row cf-gap-8">
            <span className="c-textMid">{moneySymbol()}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount"
              value={income.amount}
              className="cf-text-mono-13 wizard-amount-input"
              onChange={(e) => setIncome((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>
        </div>
        <div className="wizard-btn-row">
          <button onClick={() => setStep(0)} className="cf-btn cf-btn--secondary cf-btn--wide">← Back</button>
          <button
            onClick={() => {
        if (income.desc.trim() && income.amount) {
          addEntry({
            desc: income.desc.trim(),
            type: "income",
            amount: dollarsToCents(income.amount),
            category: income.category,
            repeats: true,
            recurEvery: 1,
            recurUnit: "semimonth",
            recurDays: [],
            recurEnd: "",
            startDate: (new Date()).getFullYear() + "-01-01",
            notes: "Added during setup"
          });
        }
        setStep(2);
      }}
            className="cf-btn cf-btn--primary wizard-next-btn"
          >
            {income.desc.trim() && income.amount ? "Next \u2192" : "Skip \u2192"}
          </button>
        </div>
      </div>,
      // Step 2: First expense
      <div key="s2">
        <div className="wizard-step-icon wizard-icon--red"><Icon name="credit-card" size={34} /></div>
        <div className="wizard-step-title">Add your first expense</div>
        <div className="wizard-step-subtitle">{`What's a recurring expense? (e.g. "Mortgage", "Rent")`}</div>
        <div className="wizard-field-stack">
          <input
            placeholder="Description e.g. Mortgage"
            value={expense.desc}
            autoFocus={true}
            onChange={(e) => setExpense((p) => ({ ...p, desc: e.target.value }))}
            className="wizard-text-input"
          />
          <div className="cf-row cf-gap-8">
            <span className="c-textMid">{moneySymbol()}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Monthly amount"
              value={expense.amount}
              className="cf-text-mono-13 wizard-amount-input"
              onChange={(e) => setExpense((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <select
            value={expense.category}
            onChange={(e) => setExpense((p) => ({ ...p, category: e.target.value }))}
            className="wizard-text-input"
          >
            {categories.filter((c) => c !== "Income").map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="wizard-btn-row">
          <button onClick={() => setStep(1)} className="cf-btn cf-btn--secondary cf-btn--wide">← Back</button>
          <button
            onClick={() => {
        if (expense.desc.trim() && expense.amount) {
          addEntry({
            desc: expense.desc.trim(),
            type: "expense",
            amount: dollarsToCents(expense.amount),
            category: expense.category,
            repeats: true,
            recurEvery: 1,
            recurUnit: "month",
            recurDays: [],
            recurEnd: "",
            startDate: (new Date()).getFullYear() + "-01-01",
            notes: "Added during setup"
          });
        }
        setDone(true);
        setTab("flow");
      }}
            className="wizard-finish-btn"
          >
            {expense.desc.trim() && expense.amount ? "Finish \u2713" : "Skip & Finish"}
          </button>
        </div>
      </div>
    ];
    return <Card className="wizard-card">
      <div className="wizard-dots-row">
        {[0, 1, 2].map((i) => <div
          key={i}
          className="wizard-dot"
          style={{
      background: i <= step ? "var(--primary)" : "var(--border)"
    }}
        />)}
      </div>
      {steps[step]}
    </Card>;
  }
  export interface BoldTextProps {
    text?: string;
  }
  export function BoldText({ text = "" }: BoldTextProps) {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return React.createElement(React.Fragment, null, ...parts.map(
      (p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p
    ));
  }
  export interface VizRowProps {
    label: any;
    fillPct: any;
    fillColor: any;
    value: any;
    sub?: any;
    rowTitle: any;
  }
  // Hoisted out of AIInsightsView (was remounted every parent render).
  export const VizRow = ({ label, fillPct, fillColor, value, sub, rowTitle }: VizRowProps) => <div
    title={rowTitle || void 0}
    className="vizrow-wrap"
  >
    <div className="vizrow-toprow">
      <span className="txm vizrow-label">{label}</span>
      <span className="mno vizrow-value">
        {value}
        {sub && <span className="vizrow-sub">{" "}{sub}</span>}
      </span>
    </div>
    <div className="vizrow-track">
      <div
        className="vizrow-fill"
        style={{ width: Math.max(3, Math.min(100, fillPct)) + "%", background: fillColor }}
      />
    </div>
  </div>;
  export interface AIInsightsViewProps {
    flow: FlowRow[];
    openBal: Cents;
    yearConfigs: YearConfig[];
    budgetTargets: any;
    activeYear: number;
    categories?: string[];
    apiKey?: string;
    goals?: Goal[];
    debtData?: Record<string, any>;
    isOffline?: boolean;
    setTab?: (...args: any[]) => any;
  }
  export function AIInsightsView({ flow, openBal, yearConfigs, budgetTargets, activeYear, categories = [], apiKey = "", goals = [], debtData = {}, isOffline = false, setTab = () => {
  } }: AIInsightsViewProps) {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [err, setErr] = useState("");
    const [truncated, setTruncated] = useState(false);
    const [lastRun, setLastRun] = useState(null);
    const [proxyReady, setProxyReady] = useState(false);
    // v2 because the cached shape changed: reports used to be markdown text
    // that got re-parsed on load, and are now the structured object the model
    // returns. An old v1 entry can't be rendered by the current code, so it
    // gets a new key rather than a migration — the report is a cache, and the
    // cost of a miss is one button press.
    const CACHE_KEY = `cf_ai_report_v2_${activeYear}`;
    useEffect(() => {
      let alive = true;
      aiProbeProxy().then((ok) => {
        if (alive) setProxyReady(ok);
      });
      return () => {
        alive = false;
      };
    }, []);
    useEffect(() => {
      try {
        localStorage.removeItem(`cf_ai_report_${activeYear}`);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { report: saved, ts } = JSON.parse(cached);
          if (saved && typeof saved === "object") {
            setReport(saved);
            setLastRun(new Date(ts));
          }
        }
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    }, [activeYear]);
    const saveReport = (saved) => {
      safeStorage.set(CACHE_KEY, JSON.stringify({ report: saved, ts: (new Date()).toISOString() }));
    };
    const buildContext = () => {
      const now = new Date();
      const summaries = getMonthSummaries(flow, openBal);
      const currentMonth = now.getFullYear() === activeYear ? now.getMonth() : 11;
      // Goals and debt-tracker data come in as props (single source of truth
      // in App state) rather than re-reading localStorage, which went stale
      // when household sync updated them mid-session.
      const debtTrackerData = debtData && typeof debtData === "object" ? debtData : {};
      // This context is used two ways: as vizCtx, feeding the on-screen KPI
      // tiles/charts via fmt() (which expects cents, like everywhere else in
      // the app), and serialized into the AI prompt text below, which needs
      // plain dollars. So buildContext's return stays in cents — the
      // prompt-building code down in runAssessment is the one place that
      // converts, right where the numbers get interpolated into text.
      const savingsGoals = (Array.isArray(goals) ? goals : []).filter((x) => !x.archived).map((x) => ({
        name: x.name,
        target: roundMoney(x.target),
        saved: roundMoney(x.saved),
        monthly: roundMoney(x.monthly),
        targetDate: x.targetDate || null,
        pct: x.target > 0 ? Math.round(x.saved / x.target * 100) : 0
      }));
      const ytdMonths = summaries.slice(0, currentMonth + 1).map((m) => ({
        month: m.month,
        income: m.income,
        expenses: m.expense,
        surplus: m.surplus,
        closingBalance: m.close
      }));
      const expenseCats: Record<string, number> = {}, incomeCats: Record<string, number> = {};
      flow.filter((e) => e.month <= currentMonth).forEach((e) => {
        // Classified by flow direction, not by type, so these two add up to
        // the totalIncome/totalExpenses printed above them in the same
        // prompt — those come from getMonthSummaries, which counts an
        // "out"-direction transfer as money leaving. Excluding transfers here
        // (on the reasoning that they only move between the user's own
        // accounts) would hand the model a category breakdown that doesn't
        // reconcile with its own headline totals; and the reasoning doesn't
        // hold anyway while the app tracks a single account, where a transfer
        // out leaves and never comes back.
        if (isOutflowEvent(e)) expenseCats[e.category] = (expenseCats[e.category] || 0) + e.amount;
        else incomeCats[e.category] = (incomeCats[e.category] || 0) + e.amount;
      });
      const bvaRows = [];
      const targetByCat = {};
      for (let m = 0; m <= currentMonth; m++) {
        const t = budgetTargets[`${activeYear}:${m}`] || {};
        Object.entries(t).forEach(([cat, amt]) => {
          targetByCat[cat] = (targetByCat[cat] || 0) + (Number(amt) || 0);
        });
      }
      Object.entries(targetByCat).forEach(([cat, tgt]) => {
        const act = roundMoney(expenseCats[cat] || 0);
        const t = roundMoney(tgt);
        bvaRows.push({ category: cat, actual: act, target: t, variance: roundMoney(act - t) });
      });
      bvaRows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
      const debtKeywords = ["debt", "credit", "loan", "mortgage", "line of credit", "lease", "cc-", "visa", "amex", "mastercard", "car payment", "truck payment", "trailer payment", "child support"];
      const debtItems = Object.entries(expenseCats).filter(
        ([c]) => debtKeywords.some((k) => c.toLowerCase().includes(k))
      ).sort((a, b) => b[1] - a[1]);
      const totalIncome = ytdMonths.reduce((s, m) => s + m.income, 0);
      const totalExp = ytdMonths.reduce((s, m) => s + m.expenses, 0);
      const totalSurplus = ytdMonths.reduce((s, m) => s + m.surplus, 0);
      const avgMonthly = ytdMonths.length ? totalExp / ytdMonths.length : 0;
      const savingsRate = totalIncome > 0 ? (totalIncome - totalExp) / totalIncome * 100 : 0;
      const closingBal = (summaries[currentMonth]?.close) || openBal;
      const lowestBal = Math.min(...summaries.slice(0, currentMonth + 1).map((m) => m.close));
      return {
        year: activeYear,
        savingsGoals,
        reportingWindow: `January\u2013${MONTHS[currentMonth]} ${activeYear} (${currentMonth + 1} months)`,
        openingBalance: roundMoney(openBal),
        closingBalance: roundMoney(closingBal),
        totalIncome: roundMoney(totalIncome),
        totalExpenses: roundMoney(totalExp),
        totalSurplus: roundMoney(totalSurplus),
        avgMonthlyExpense: roundMoney(avgMonthly),
        savingsRatePct: Math.round(savingsRate * 10) / 10,
        lowestBalance: roundMoney(lowestBal),
        monthlyBreakdown: ytdMonths,
        topExpenseCategories: Object.entries(expenseCats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([cat, amt]) => ({
          category: cat,
          total: roundMoney(amt),
          pctOfExpenses: totalExp > 0 ? Math.round(amt / totalExp * 1e3) / 10 : 0
        })),
        incomeCategories: Object.entries(incomeCats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ category: cat, total: roundMoney(amt) })),
        debtObligations: debtItems.map(([cat, amt]) => ({ category: cat, ytdPaid: roundMoney(amt) })),
        budgetVsActual: bvaRows.slice(0, 15),
        hasBudgetTargets: Object.keys(targetByCat).length > 0,
        // Debt tracker data (balances + rates user has entered)
        debtTrackerItems: Object.entries(debtTrackerData).filter(([, v]) => !v.hidden && parseFloat(v.balance) > 0).map(([k, v]) => ({
          name: v.label || k.replace("manual_", "").replace(/_/g, " "),
          balance: roundMoney(parseFloat(v.balance || 0)),
          rate: parseFloat(v.rate || 0),
          monthlyPayment: roundMoney(parseFloat(v.payment || 0))
        }))
      };
    };
    // One entry per section of the report. This list is the single source of
    // truth for three things that used to be maintained separately and could
    // drift: the JSON schema the model must fill, the order sections render
    // in, and their on-screen titles.
    //
    // It replaces splitting the reply on `##` headers. That approach had the
    // model responsible for the document's structure as well as its content —
    // a renamed header produced an unstyled section, a dropped one vanished
    // silently, and the order had to be re-imposed afterwards because cached
    // reports predated the ordering instruction. A schema makes the shape the
    // API's job instead: every key arrives, spelled correctly, every time.
    const AI_SECTIONS = [
      { key: "executive_summary", title: "Executive Summary", wide: true, numbered: false, prompt: "2-4 bullets summarising the overall position." },
      { key: "priority_actions", title: "Priority Action Items", wide: true, numbered: true, prompt: "Exactly the top 5 actions, most important first, each with a concrete dollar target where possible." },
      { key: "cash_flow_risk", title: "Cash Flow & Risk", wide: false, numbered: false, prompt: "2-4 bullets on cash flow timing and the risk of running low." },
      { key: "budget_performance", title: "Budget Performance", wide: false, numbered: false, prompt: "2-4 bullets on actual spending against budget targets." },
      { key: "spending_analysis", title: "Spending Analysis", wide: false, numbered: false, prompt: "2-4 bullets on where the money goes and what stands out." },
      { key: "debt_management", title: "Debt Management", wide: false, numbered: false, prompt: "2-4 bullets on debt balances, rates and payoff priority." },
      { key: "income_analysis", title: "Income Analysis", wide: false, numbered: false, prompt: "2-4 bullets on income sources, stability and concentration." },
      { key: "savings_goals", title: "Savings Goals", wide: false, numbered: false, prompt: "One bullet per goal: percent funded, on or off track for its target date, and the exact monthly adjustment if off track." }
    ];
    const AI_REPORT_SCHEMA = (() => {
      const properties = {
        score: { type: "integer", description: "Overall financial health from 1 (severe distress) to 10 (excellent)." },
        score_rationale: { type: "string", description: "One sentence justifying the score." }
      };
      AI_SECTIONS.forEach((s) => {
        properties[s.key] = { type: "array", description: s.prompt, items: { type: "string" } };
      });
      return {
        type: "object",
        properties,
        required: ["score", "score_rationale"].concat(AI_SECTIONS.map((s) => s.key)),
        additionalProperties: false
      };
    })();
    const runAssessment = async () => {
      if (!aiCanRun(apiKey)) {
        setErr("No API key configured. Please add your Anthropic API key in Settings \u2192 General.");
        return;
      }
      setLoading(true);
      setErr("");
      setReport(null);
      setTruncated(false);
      const ctx = buildContext();
      const prompt = `You are a certified financial planner reviewing a personal budget for ${ctx.year}. Analyse the financial data below and provide a comprehensive, actionable assessment. Be specific \u2014 reference actual dollar amounts and category names from the data.

FINANCIAL DATA (${ctx.reportingWindow}):
Opening Balance: ${fmt(ctx.openingBalance)}
Closing Balance: ${fmt(ctx.closingBalance)}
Total Income: ${fmt(ctx.totalIncome)}
Total Expenses: ${fmt(ctx.totalExpenses)}
Net Surplus/Shortfall: ${fmt(ctx.totalSurplus)} (${ctx.totalSurplus >= 0 ? "+" : ""}${ctx.savingsRatePct}% savings rate)
Lowest Balance This Period: ${fmt(ctx.lowestBalance)}
Average Monthly Expenses: ${fmt(ctx.avgMonthlyExpense)}

MONTHLY BREAKDOWN:
${ctx.monthlyBreakdown.map((m) => `  ${m.month}: Income ${fmt(m.income)}, Expenses ${fmt(m.expenses)}, ${m.surplus >= 0 ? "Surplus" : "Shortfall"} ${fmt(Math.abs(m.surplus))}, Balance ${fmt(m.closingBalance)}`).join("\n")}

TOP EXPENSE CATEGORIES (YTD):
${ctx.topExpenseCategories.map((c) => `  ${c.category}: ${fmt(c.total)} (${c.pctOfExpenses}% of expenses)`).join("\n")}

INCOME SOURCES:
${ctx.incomeCategories.map((c) => `  ${c.category}: ${fmt(c.total)}`).join("\n")}

${ctx.debtObligations.length ? `DEBT / CREDIT OBLIGATIONS (YTD paid):
${ctx.debtObligations.map((d) => `  ${d.category}: ${fmt(d.ytdPaid)}`).join("\n")}` : "No debt categories identified."}

${ctx.debtTrackerItems?.length ? `DEBT TRACKER (user-entered balances & rates):
${ctx.debtTrackerItems.map((d) => `  ${d.name}: Balance ${fmt(d.balance)}, Rate ${d.rate}%, Payment ${fmt(d.monthlyPayment)}/mo`).join("\n")}` : "No debt balances entered in tracker yet."}

${ctx.hasBudgetTargets ? `BUDGET VS ACTUAL (top variances):
${ctx.budgetVsActual.map((r) => `  ${r.category}: Actual ${fmt(r.actual)} vs Target ${fmt(r.target)} (${r.variance >= 0 ? "over" : "under"} by ${fmt(Math.abs(r.variance))})`).join("\n")}` : "No budget targets have been set yet."}

Fill every field of the response schema. Rules:
- Each bullet is one short sentence (under ~18 words), anchored to a specific dollar amount or category from the data above.
- No preamble, no restating the data tables, no generic advice, no hedging filler ("consider", "you may want to").
- Plain text only in every string: no markdown, no leading bullet characters, no numbering.`;
      try {
        const { data, truncated: cut } = await callClaude({
          system: "You are a certified financial planner specialising in personal budgeting and cash flow management. Be blunt and brief: short, numbers-first bullets, no filler.",
          messages: [{ role: "user", content: prompt }],
          schema: AI_REPORT_SCHEMA,
          // Adaptive thinking draws on the same budget as the visible answer,
          // so this has to cover both. The old 1200 was sized for a
          // thinking-off model and would truncate the report itself now.
          maxTokens: 4e3,
          effort: "high",
          apiKey
        });
        setReport(data);
        setTruncated(cut);
        setLastRun(new Date());
        saveReport(data);
      } catch (e) {
        setErr(aiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    const slugifySection = (t) => "ai-sec-" + t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const sectionIcon = {
      "Executive Summary": "chart-bar",
      "Income Analysis": "banknote",
      "Spending Analysis": "chart-down",
      "Debt Management": "credit-card",
      "Savings Goals": "target",
      "Budget Performance": "target",
      "Cash Flow & Risk": "alert-triangle",
      "Priority Action Items": "check-circle"
    };
    const sectionColor = {
      "Executive Summary": "var(--primary)",
      "Income Analysis": "var(--greenDk)",
      "Spending Analysis": "var(--amberInk)",
      "Debt Management": "var(--red)",
      "Savings Goals": "var(--greenDk)",
      "Budget Performance": "var(--primary)",
      "Cash Flow & Risk": "var(--amberInk)",
      "Priority Action Items": "var(--greenDk)"
    };
    // AI_SECTIONS already fixes the order, so there is nothing to re-sort: the
    // model fills named fields and can't return them out of sequence. Sections
    // it had nothing to say about are dropped rather than rendered as an empty
    // card.
    const reportSections = useMemo(() => {
      if (!report) return null;
      return AI_SECTIONS.map((s) => ({
        key: s.key,
        title: s.title,
        wide: s.wide,
        numbered: s.numbered,
        items: (Array.isArray(report[s.key]) ? report[s.key] : []).filter((t) => t && String(t).trim())
      })).filter((s) => s.items.length);
    }, [report]);
    // The same numbers the model was given, used to draw charts next to its
    // bullets — the visual carries the data, the text carries the judgement.
    const vizCtx = useMemo(() => {
      try {
        return report ? buildContext() : null;
      } catch (e) {
        return null;
      }
    }, [report, flow, openBal, budgetTargets, activeYear, goals, debtData]);
    const sectionViz = (t) => {
      const c = vizCtx;
      if (!c) return null;
      const wrap = (kids) => <div className="mb-14">{kids}</div>;
      if (t === "Spending Analysis" && c.topExpenseCategories.length) {
        const rows = c.topExpenseCategories.slice(0, 5);
        const max = rows[0].total || 1;
        return wrap(rows.map((r) => <VizRow
          key={r.category}
          label={r.category}
          fillPct={r.total / max * 100}
          fillColor="var(--accent)"
          value={fmt(r.total)}
          sub={r.pctOfExpenses + "%"}
          rowTitle={`${r.category}: ${fmt(r.total)} (${r.pctOfExpenses}% of expenses)`}
        />));
      }
      if (t === "Income Analysis" && c.incomeCategories.length) {
        const rows = c.incomeCategories.slice(0, 5);
        const max = rows[0].total || 1;
        return wrap(rows.map((r) => <VizRow
          key={r.category}
          label={r.category}
          fillPct={r.total / max * 100}
          fillColor="var(--greenDk)"
          value={fmt(r.total)}
          rowTitle={`${r.category}: ${fmt(r.total)} YTD`}
        />));
      }
      if (t === "Budget Performance" && c.budgetVsActual.length) {
        const rows = c.budgetVsActual.slice(0, 5);
        return wrap(rows.map((r) => <VizRow
          key={r.category}
          label={r.category}
          fillPct={r.target > 0 ? r.actual / r.target * 100 : 100}
          fillColor={r.variance > 0 ? "var(--red)" : "var(--greenDk)"}
          value={fmt(r.actual)}
          sub={`/ ${fmt(r.target)} \u00B7 ${r.variance > 0 ? "over" : "under"} by ${fmt(Math.abs(r.variance))}`}
          rowTitle={`${r.category}: actual ${fmt(r.actual)} vs target ${fmt(r.target)}`}
        />));
      }
      if (t === "Debt Management" && (c.debtTrackerItems.length || c.debtObligations.length)) {
        if (c.debtTrackerItems.length) {
          const max = Math.max(...c.debtTrackerItems.map((d) => d.balance), 1);
          return wrap(c.debtTrackerItems.map((d) => <VizRow
            key={d.name}
            label={d.name + (d.rate ? ` \u00B7 ${d.rate}%` : "")}
            fillPct={d.balance / max * 100}
            fillColor="var(--accent)"
            value={fmt(d.balance)}
            sub={d.monthlyPayment ? `\u00B7 ${fmt(d.monthlyPayment)}/mo` : ""}
            rowTitle={`${d.name}: balance ${fmt(d.balance)} at ${d.rate}%`}
          />));
        }
        const max = Math.max(...c.debtObligations.map((d) => d.ytdPaid), 1);
        return wrap(c.debtObligations.slice(0, 5).map((d) => <VizRow
          key={d.category}
          label={d.category}
          fillPct={d.ytdPaid / max * 100}
          fillColor="var(--accent)"
          value={fmt(d.ytdPaid)}
          sub="paid YTD"
          rowTitle={`${d.category}: ${fmt(d.ytdPaid)} paid YTD`}
        />));
      }
      if (t === "Savings Goals" && c.savingsGoals.length) {
        return wrap(c.savingsGoals.map((g) => <VizRow
          key={g.name}
          label={g.name}
          fillPct={g.pct}
          fillColor="var(--greenDk)"
          value={g.pct + "%"}
          sub={`${fmt(g.saved)} / ${fmt(g.target)}`}
          rowTitle={`${g.name}: ${fmt(g.saved)} of ${fmt(g.target)} (${g.pct}%)`}
        />));
      }
      if (t === "Cash Flow & Risk" && c.monthlyBreakdown.length) {
        const maxAbs = Math.max(...c.monthlyBreakdown.map((m) => Math.abs(m.surplus)), 1);
        return <div className="mb-14">
          <div className="cashflow-chart-label">Monthly surplus (above line) / shortfall (below line)</div>
          <div className="cashflow-bars-row">
            {c.monthlyBreakdown.map((m) => <div
              key={m.month}
              title={`${m.month}: ${fmt(m.surplus, true)}`}
              className="flex-1 min-w-0"
            >
              <div className="cashflow-bar-container">
                <div className="cashflow-zero-line" />
                <div
                  className="cashflow-bar"
                  style={{ background: m.surplus >= 0 ? "var(--greenDk)" : "var(--red)", height: Math.max(2, Math.round(Math.abs(m.surplus) / maxAbs * 26)), bottom: m.surplus >= 0 ? "50%" : "auto", top: m.surplus < 0 ? "50%" : "auto" }}
                />
              </div>
              <div className="cashflow-month-label">{m.month[0]}</div>
            </div>)}
          </div>
        </div>;
      }
      return null;
    };
    // Three separate reasons the button can't run, each worth its own message:
    // no transport configured at all, no network, or a run already in flight.
    // Previously only the key was checked, so an offline tap failed with
    // "check your API key and internet connection" after a pointless round
    // trip.
    const canRun = aiCanRun(apiKey);
    const disabled = loading || !canRun || isOffline;
    const blockedReason = isOffline ? "You're offline — generating an assessment needs a connection." : !canRun ? "AI features aren't set up yet." : "";
    return <div className="cf-page">
      <Card className="mb-20">
        <div className="ai-header-row">
          <div>
            <div className="ai-title">{"✦ AI Financial Assessment — "}{activeYear}</div>
            {// Only before there is a report. Once one exists this sentence is
            // describing something the reader is already looking at, and it
            // costs three lines above it on a phone.
            !report && <div className="ai-subtitle">
              {"Claude reviews your "}
              {activeYear}
              {" budget data and provides personalised suggestions on spending, debt, cash flow and financial health."}
            </div>
}
          </div>
          {lastRun && <div className="ai-lastrun">{"Last run: "}{lastRun.toLocaleTimeString()}</div>}
        </div>
        {blockedReason && <div className="notice notice--sm" data-tone="warn" role="status">
          <span className="notice-icon" aria-hidden="true">
            <Icon name={isOffline ? "alert-triangle" : "key"} size={16} />
          </span>
          <div className="txm notice-msg">
            {blockedReason}
            {!canRun && !isOffline && <>
              {" Add your Anthropic API key in"}
              {" "}
              <button onClick={() => setTab("you")} className="ai-settings-link">Settings → General</button>
              , or deploy the ai-proxy Edge Function so this household shares one server-side key.
            </>}
          </div>
        </div>}
        {canRun && <div className="ai-disclaimer-row">
          <span className="ai-disclaimer-icon"><Icon name="key" size={12} /></span>
          <span>
            {proxyReady ? "Running this sends your budget data to Claude through your project's ai-proxy function. Your API key stays on the server." : "Running this sends your budget data and API key straight to Anthropic from this browser."}
          </span>
        </div>}
        <div className="ai-actionrow">
          <button
            onClick={runAssessment}
            disabled={disabled}
            title={blockedReason || void 0}
            className="ai-generate-btn"
            style={{
                cursor: disabled ? "not-allowed" : "pointer",
                background: disabled ? "var(--border)" : "var(--primary)",
                color: disabled ? "var(--textMid)" : "#fff"
              }}
          >
            {loading ? <><span className="ai-spinner">⟳</span>{" Analysing your finances…"}</> : <
            >
              <span>✦</span>
              {" Generate AI Assessment"}
            </>}
          </button>
          {report && <button
            onClick={() => {
                setReport(null);
                setTruncated(false);
                setLastRun(null);
                safeStorage.remove(CACHE_KEY);
              }}
            className="cf-btn cf-btn--secondary cf-btn--wide"
          >
            Clear
          </button>}
        </div>
        {err && <div className="notice notice--sm" data-tone="critical" role="alert">{"⚠ "}{err}</div>}
        {truncated && <div className="notice notice--sm" data-tone="critical" role="status">
          ⚠ Claude ran out of room before finishing this report — some sections may be short. Re-run to try again.
        </div>}
      </Card>
      {loading && <div className="ai-skeleton-wrap">
        {AI_SECTIONS.slice(0, 5).map((s) => <Card key={s.key}>
          <div className="ai-skeleton-title" />
          {[80, 100, 65, 90].map((w, i) => <div
            key={i}
            className="ai-skeleton-line"
            style={{ width: `${w}%` }}
          />)}
        </Card>)}
      </div>}
      {reportSections && !loading && <>
        <div className="settings-quicklinks ai-quicklinks">
          {reportSections.map((section) => {
          const anchorId = slugifySection(section.title);
          return <a
            key={anchorId}
            href={`#${anchorId}`}
            onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(anchorId);
                if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
              }}
            className="quicklink-pill"
          >
            {section.title}
          </a>;
        })}
        </div>
        {// The score is a field on the response now, not something scraped back
        // out of the prose with a regex that had to guess between "8/10" and
        // "Score: 8".
        Number.isFinite(report.score) && (() => {
          const score = Math.max(1, Math.min(10, Math.round(report.score)));
          const color = score >= 7 ? "var(--greenDk)" : score >= 4 ? "var(--amberInk)" : "var(--red)";
          return <div
            className="ai-score-badge"
            style={{ border: `2px solid ${color}`, boxShadow: `0 0 0 4px ${color}22` }}
          >
            <div className="ai-score-number" style={{ color }}>
              {score}
              <span className="ai-score-outof">/10</span>
            </div>
            <div>
              <div className="ai-score-label">Financial Health Score</div>
              <div className="txm">
                {report.score_rationale || (score >= 8 ? "Strong financial position — keep building on this foundation." : score >= 6 ? "Good foundation with clear areas for improvement." : score >= 4 ? "Several areas need attention — see action items below." : "Significant financial stress detected — prioritise the action items.")}
              </div>
            </div>
          </div>;
        })()
}
        {vizCtx && <div className="kpi-grid-4">
          <KpiCard
            label="Savings Rate"
            value={vizCtx.savingsRatePct + "%"}
            color={vizCtx.savingsRatePct >= 0 ? "var(--greenDk)" : "var(--red)"}
            sub={vizCtx.reportingWindow}
          />
          <KpiCard
            label="YTD Surplus"
            value={fmt(vizCtx.totalSurplus, true)}
            color={vizCtx.totalSurplus >= 0 ? "var(--greenDk)" : "var(--red)"}
            sub={`${fmt(vizCtx.totalIncome)} in · ${fmt(vizCtx.totalExpenses)} out`}
          />
          <KpiCard
            label="Lowest Balance"
            value={fmt(vizCtx.lowestBalance)}
            color={vizCtx.lowestBalance < 0 ? "var(--red)" : "var(--text)"}
            sub="this period"
          />
          <KpiCard
            label="Closing Balance"
            value={fmt(vizCtx.closingBalance)}
            color="var(--text)"
            sub="current month"
          />
        </div>}
        <div className="ai-report-grid">
          {reportSections.map((section) => <Card
            key={section.key}
            id={slugifySection(section.title)}
            className="ai-section-card"
            style={{ gridColumn: section.wide ? "1 / -1" : "auto" }}
          >
            <div className="ai-section-header">
              <span style={{ color: sectionColor[section.title] || "var(--primary)" }}>
                <Icon name={sectionIcon[section.title] || "clipboard"} size={20} />
              </span>
              <div
                className="ai-section-title"
                style={{ color: sectionColor[section.title] || "var(--primary)" }}
              >
                {section.title}
              </div>
            </div>
            {sectionViz(section.title)}
            {// Items are plain sentences from a schema-constrained reply, so the
          // markdown handling this used to do — stripping **bold**, spotting
          // "1." and "- " prefixes, detecting indentation — has nothing left to
          // parse. Numbering comes from the section definition instead of from
          // characters the model happened to emit.
          section.items.map((text, li) => section.numbered ? <div key={li} className="ai-numbered-row">
            <div className="ai-numbered-badge">{li + 1}</div>
            <div className="ai-item-text"><BoldText text={text} /></div>
          </div> : (() => {
            const isWarning = /(over budget|exceeded|shortfall|risk|concern|warning|negative|debt|danger|critical|problem|unsustainable)/i.test(text);
            const isPositive = /(well|strong|excellent|good|under budget|saving|positive|recommendation)/i.test(text);
            return <div key={li} className="ai-bullet-row" style={{ marginBottom: 8 }}>
              <div
                className="ai-bullet-dot"
                style={{ width: 6, height: 6, background: isWarning ? "var(--amberInk)" : isPositive ? "var(--greenDk)" : "var(--navyLt)", marginTop: 7 }}
              />
              <div className="ai-item-text"><BoldText text={text} /></div>
            </div>;
          })())
}
          </Card>)}
        </div>
        <div className="ai-footer-disclaimer">
          AI assessment generated by Claude. This is not professional financial advice. Always consult a certified financial planner for major decisions.
        </div>
      </>}
      {!report && !loading && !err && <Card>
        <div className="ai-empty-wrap">
          <div className="ai-empty-icon"><Icon name="sparkle" size={40} /></div>
          <div className="ai-empty-title">
            {canRun ? "Ready to analyse your finances" : "What an assessment covers"}
          </div>
          <div className="ai-empty-desc">
            {canRun ? <>{"Click "}<strong>Generate AI Assessment</strong>. Claude will review</> : "Once AI is set up, Claude will review"}
            {" your income, expenses, debt obligations, budget performance and cash flow for "}
            {activeYear}
            {" and provide personalised recommendations."}
          </div>
          <div className="ai-empty-feature-grid">
            {[
          { icon: "chart-bar", label: "Executive Summary" },
          { icon: "banknote", label: "Income Analysis" },
          { icon: "chart-down", label: "Spending Analysis" },
          { icon: "credit-card", label: "Debt Management" },
          { icon: "target", label: "Budget vs Actual" },
          { icon: "check-circle", label: "Priority Actions" }
        ].map(({ icon, label }) => <div key={label} className="ai-feature-card">
          <div className="ai-feature-icon"><Icon name={icon} size={20} /></div>
          <div className="ai-feature-label">{label}</div>
        </div>)}
          </div>
        </div>
      </Card>}
    </div>;
  }
