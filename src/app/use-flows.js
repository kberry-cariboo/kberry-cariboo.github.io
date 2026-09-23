import { __spreadProps, __spreadValues, useMemo } from "../lib/runtime.js";
import { setHolidayRegion, setStoredHolidays } from "../lib/holidays.js";
import { accountIdOf, buildYearFlows, computeFlow } from "../lib/dates.js";
import { accountOpenings, useLS } from "../lib/app-data.js";
  // Every running balance the app shows: each budget year's flow (each
  // opening on the last one's close), the what-if scenario over the same
  // entries, and the account-filtered view of both. Moved out of App as is;
  // the computing is buildYearFlows/computeFlow in dates.js.
  export function useFlows({ entries, yearConfigs, overridesByYr, holidays, holidayRegionCode, accounts, activeYear }) {
    // Holiday lookups inside expandEntries are synchronous and reach through a
    // module-level reference rather than a prop — it's called from a dozen
    // places that have no access to this state (settings year-copy, the debt
    // scan, the split-edit probe). Pushing the current list in here, in the
    // same memo that consumes it, is what keeps that reference honest: the
    // flows can never be built against a stale list, which an effect running
    // after render would allow for one paint.
    const yearFlows = useMemo(() => {
      setStoredHolidays(holidays);
      // Same reasoning as setStoredHolidays directly above: pushed in from the
      // memo that consumes it, so the flows can never be built against the
      // previous region's computed dates for one paint.
      setHolidayRegion(holidayRegionCode);
      return buildYearFlows(entries, yearConfigs, overridesByYr);
    }, [entries, yearConfigs, overridesByYr, holidays, holidayRegionCode]);
    // ── What-if ──────────────────────────────────────────────────────────
    // A scenario is a set of adjustments over the entries you already have —
    // drop this one, change that one's amount — not a second budget. That is
    // what makes it cheap: the same expandEntries/computeFlow the real year
    // goes through, run a second time over an adjusted entry list, so a
    // scenario can never disagree with the budget about how a schedule works.
    //
    // Deliberately device-local rather than a synced household field. A
    // half-finished "what if I quit my job" appearing on a partner's phone is
    // not a feature, and nothing downstream of it is a record of anything.
    const [scenarioOn, setScenarioOn] = useLS("cf_scenario_on", false);
    const [scenarioAdj, setScenarioAdj] = useLS("cf_scenario_adj", {});
    const scenarioActive = scenarioOn && Object.keys(scenarioAdj || {}).length > 0;
    const scenarioEntries = useMemo(() => {
      if (!scenarioActive) return entries;
      return entries.reduce((out, e) => {
        const adj = scenarioAdj[e.id];
        if (!adj) out.push(e);
        else if (adj.drop) return out;
        else out.push(__spreadProps(__spreadValues({}, e), { amount: Number.isFinite(adj.amount) ? adj.amount : e.amount }));
        return out;
      }, []);
    }, [entries, scenarioAdj, scenarioActive]);
    const scenarioFlows = useMemo(() => {
      if (!scenarioActive) return null;
      return buildYearFlows(scenarioEntries, yearConfigs, overridesByYr);
    }, [scenarioEntries, yearConfigs, overridesByYr, scenarioActive]);
    const sortedConfigs = [...yearConfigs].sort((a, b) => a.year - b.year);
    const openBalOf = (flowsByYear, firstOpening) => {
      var _a2, _b, _c, _d;
      const idx = sortedConfigs.findIndex((yc) => yc.year === activeYear);
      if (idx <= 0) return firstOpening !== void 0 ? firstOpening : (_b = (_a2 = yearConfigs.find((yc) => yc.year === activeYear)) == null ? void 0 : _a2.openingBalance) != null ? _b : 0;
      const prevFlow = flowsByYear[sortedConfigs[idx - 1].year];
      if ((prevFlow == null ? void 0 : prevFlow.length) > 0) return prevFlow[prevFlow.length - 1].balance;
      return firstOpening !== void 0 ? firstOpening : (_d = (_c = yearConfigs.find((yc) => yc.year === activeYear)) == null ? void 0 : _c.openingBalance) != null ? _d : 0;
    };
    // ── The account filter ───────────────────────────────────────────────
    // Combined is the default and always available: every view shows the
    // household's whole position unless you narrow it. Narrowing recomputes
    // the running balance from that account's own share of the opening
    // balance, over only its own events — which is why nothing downstream of
    // here needs to know accounts exist. It receives a flow and an opening
    // balance, exactly as it always did; they are just a narrower pair.
    //
    // Device-local: which account you are looking at is a view, not a fact
    // about the household, and syncing it would move a partner's screen.
    const [accountFilter, setAccountFilter] = useLS("cf_account_filter", "");
    // A filter naming an account that has since been deleted would silently
    // show an empty budget, which reads as data loss. Fall back to combined.
    const activeAccount = accountFilter && accounts.some((a) => a.id === accountFilter) ? accountFilter : "";
    const accountYearFlows = useMemo(() => {
      if (!activeAccount) return null;
      const first = sortedConfigs[0];
      const openings = accountOpenings(accounts, first ? first.openingBalance : 0);
      const out = {};
      let carry = openings[activeAccount] || 0;
      sortedConfigs.forEach((yc) => {
        const evs = (yearFlows[yc.year] || []).filter((ev) => accountIdOf(ev) === activeAccount);
        const flow = computeFlow(evs, carry);
        out[yc.year] = flow;
        carry = flow.length ? flow[flow.length - 1].balance : carry;
      });
      return out;
    }, [activeAccount, accounts, sortedConfigs, yearFlows]);
    const viewFlows = accountYearFlows || yearFlows;
    const activeFlow = viewFlows[activeYear] || [];
    const activeOpenBal = useMemo(() => {
      if (!activeAccount) return openBalOf(yearFlows);
      const first = sortedConfigs[0];
      return openBalOf(viewFlows, accountOpenings(accounts, first ? first.openingBalance : 0)[activeAccount] || 0);
      // openBalOf closes over sortedConfigs/activeYear/yearConfigs, all of
      // which are listed below so the memo cannot go stale on any of them.
    }, [activeAccount, accounts, sortedConfigs, activeYear, yearConfigs, yearFlows, viewFlows]);
    const prevYearConfigured = yearConfigs.some((yc) => Number(yc.year) === Number(activeYear) - 1);
    const prevYearFlow = prevYearConfigured ? yearFlows[activeYear - 1] || [] : [];
  return { yearFlows, scenarioOn, setScenarioOn, scenarioAdj, setScenarioAdj, scenarioActive, scenarioFlows, sortedConfigs, openBalOf, accountFilter, setAccountFilter, activeAccount, accountYearFlows, viewFlows, activeFlow, activeOpenBal, prevYearConfigured, prevYearFlow };
  }
