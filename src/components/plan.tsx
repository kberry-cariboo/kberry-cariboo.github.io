import { genId, useContext, useEffect, useState } from "../lib/runtime.js";
import { centsToDollars, dollarsToCents } from "../lib/migrate.js";
import { getCurrentBalance, humanShortDate, todayStr } from "../lib/dates.js";
import { ASSET_KINDS, assetKindLabel, netWorthSummary } from "../lib/networth.js";
import { ExportBar, downloadCSV, fmt, fmtAxisK, moneySymbol, printView, roundMoney } from "../lib/format.js";
import { CartesianGrid, DEFAULT_ALERT_THRESHOLD, HouseholdContext, Legend, Line, LineChart, MONTHS, ResponsiveContainer, Tooltip, XAxis, YAxis, autoFocusOnDesktop, debtStrategyFinding, haptic, simulateDebtStrategy, useLS } from "../lib/app-data.js";
import { Card, ChartTip, ConfirmDialog, EmptyState, FieldLabel, HelpTip, KpiCard, PillToggle, SectionTitle, SheetHandle, Sparkline } from "./primitives.js";
import { ContextMenu } from "./forms.js";
import { Icon } from "./misc-ui.js";
import { DASH_AXIS_TICK_X, DASH_AXIS_TICK_Y, projectPayoffBalances } from "./plan-dashboard-shared.js";
import { MoneyInput, toast } from "./auth-misc.js";
import type { Cents, Entry, FlowRow, Goal, YearConfig } from "../types.js";
  export interface StratCompareProps {
    av: any;
    sn: any;
    base: any;
    pick: any;
    onPick: (...args: any[]) => any;
  }
  // Hoisted out of PlanView's render body — an inline component
  // definition creates a new type each render and forces React to remount.
  // The screen exists to compare two strategies, and it used to stack them as
  // two cards — so on a phone you could never see both at once, which is the
  // one thing it is for. One table instead: the rows are the questions, the
  // columns are the answers, and the better answer in each row is marked.
  //
  // The payoff order was a 10px sentence of arrows wrapping to four lines. It
  // is a numbered list now, for the chosen strategy only, because that is the
  // form an ordered list of nine things has always wanted.
  export const StratCompare = ({ av, sn, base, pick, onPick }: StratCompareProps) => {
    const better = (a, b, lowerWins = true) => a === b ? null : (lowerWins ? a < b : a > b);
    const rows = [
      { label: "Debt-free", a: av.debtFreeDate, b: sn.debtFreeDate, win: better(av.months, sn.months) },
      { label: "Total interest", a: fmt(av.totalInterest), b: fmt(sn.totalInterest),
        win: better(av.totalInterest, sn.totalInterest) },
      { label: "Months to clear", a: av.months, b: sn.months, win: better(av.months, sn.months) }
    ];
    // What each strategy is worth against paying the minimums. A strategy can
    // be *worse* than the baseline — snowball often is — so these read as a
    // signed comparison rather than as "saved": "-1 months" saved is not a
    // sentence, and a negative saving is a cost the reader should see said
    // plainly.
    const lessMore = (d, unit) => {
      if (d === 0) return "same";
      const n = Math.abs(d);
      const word = unit === "months" ? (n === 1 ? "month" : "months") : "";
      return n + (word ? " " + word : "") + (d > 0 ? " less" : " more");
    };
    if (base && base.totalInterest !== av.totalInterest) {
      rows.push({ label: "Interest vs minimums",
        a: fmt(Math.abs(base.totalInterest - av.totalInterest)) + (base.totalInterest > av.totalInterest ? " less" : " more"),
        b: fmt(Math.abs(base.totalInterest - sn.totalInterest)) + (base.totalInterest > sn.totalInterest ? " less" : " more"),
        win: better(av.totalInterest, sn.totalInterest) });
    }
    if (base && (base.months !== av.months || base.months !== sn.months)) {
      rows.push({ label: "Time vs minimums", a: lessMore(base.months - av.months, "months"),
        b: lessMore(base.months - sn.months, "months"), win: better(av.months, sn.months) });
    }
    const chosen = pick === "snowball" ? sn : av;
    return <>
      <table className="strat-table">
        <caption className="cf-visually-hidden">Avalanche compared with Snowball</caption>
        <thead>
          <tr>
            <td />
            <th scope="col"><Icon name="mountain" size={13} />{" Avalanche"}</th>
            <th scope="col"><Icon name="snowflake" size={13} />{" Snowball"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td data-win={r.win === true ? "true" : void 0}>{r.a}</td>
            <td data-win={r.win === false ? "true" : void 0}>{r.b}</td>
          </tr>)}
        </tbody>
      </table>
      <div className="strat-order-head">
        <span className="lbl">Payoff order</span>
        <PillToggle
          size="sm"
          value={pick}
          onChange={onPick}
          options={[{ id: "avalanche", label: "Avalanche" }, { id: "snowball", label: "Snowball" }]}
        />
      </div>
      <ol className="strat-order-list">
        {chosen.payoffOrder.map((n, k) => <li key={n + k}>
          <span className="strat-order-n">{k + 1}</span>
          <span className="strat-order-name">{n}</span>
        </li>)}
      </ol>
    </>;
  };

  export interface PlanViewProps {
    flow: FlowRow[];
    openBal: Cents;
    assets?: any[];
    setAssets?: (...args: any[]) => any;
    entries?: Entry[];
    setEntries?: (...args: any[]) => any;
    goals?: Goal[];
    setGoals?: (...args: any[]) => any;
    categories?: string[];
    alertThreshold?: number;
    activeYear?: number;
    debtData?: Record<string, any>;
    setDebtData?: (...args: any[]) => any;
    globalSearch?: string;
    yearConfigs?: YearConfig[];
    setActiveYear?: (...args: any[]) => any;
    setDeletedCopyIds?: (...args: any[]) => any;
    planSub?: string;
    setPlanSub?: (...args: any[]) => any;
    debtExtra?: string;
    setDebtExtra?: (...args: any[]) => any;
    debtSimExcluded?: any[];
    setDebtSimExcluded?: (...args: any[]) => any;
  }
  export function PlanView({ flow, openBal, assets = [], setAssets = () => {
  }, entries = [], setEntries = () => {
  }, goals = [], setGoals = () => {
  }, categories = [], alertThreshold = DEFAULT_ALERT_THRESHOLD, activeYear = (new Date()).getFullYear(), debtData = {}, setDebtData = () => {
  }, globalSearch = "", yearConfigs = [], setActiveYear = () => {
  }, setDeletedCopyIds = () => {
  }, planSub = "debt", setPlanSub = () => {
  // The two inputs to the payoff simulation. Household data, not this
  // device's: they decide the debt-free date and the total interest this
  // screen reports, so two people looking at the same household have to be
  // looking at the same numbers.
  }, debtExtra = "100", setDebtExtra = () => {
  }, debtSimExcluded = [], setDebtSimExcluded = () => {
  } }: PlanViewProps) {
    const gq = (globalSearch || "").trim().toLowerCase();
    const activeGoals = goals.filter((g) => !g.archived);
    const archivedGoalsCount = goals.length - activeGoals.length;
    const goalsFiltered = gq ? activeGoals.filter((g) => (g.name || "").toLowerCase().includes(gq)) : activeGoals;
    const { logActivity } = useContext(HouseholdContext);

    // Which payoff order is on screen. Device-local: it is a reading
    // preference, not a decision the household has made.
    const [stratPick, setStratPick] = useLS("cf_debt_strategy", "avalanche");
    const [showDebtPicker, setShowDebtPicker] = useState(false);

    const [debtCtx, setDebtCtx] = useState(null);
    const [showDebtForm, setShowDebtForm] = useState(false);
    const [debtFormData, setDebtFormData] = useState({ label: "", balance: "", rate: "", payment: "", editKey: null });
    const [showAssetForm, setShowAssetForm] = useState(false);
    const [assetForm, setAssetForm] = useState(null);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [goalForm, setGoalForm] = useState(null);
    const [goalErrors, setGoalErrors] = useState<Record<string, string>>({});
    const [goalCtx, setGoalCtx] = useState(null);
    const [showFundForm, setShowFundForm] = useState(false);
    const [fundForm, setFundForm] = useState(null);
    const [confirmGoalDelete, setConfirmGoalDelete] = useState(null);
    // Escape closes, the backdrop doesn't — the bargain every other overlay in
    // the app strikes, and the four dialogs on this screen were the ones that
    // never struck it. The goal form, the funding form, the debt form and the
    // debt picker all opened over what you were reading with no keyboard way
    // out: a person who reaches for Escape (or an external keyboard on a
    // tablet) had to find Cancel with the pointer.
    //
    // One handler rather than four, because the state is all here and only one
    // of them is ever on screen. The delete confirmation is the exception: it
    // carries its own handler (ConfirmDialog), and it opens over the goal form
    // — so bail out while it is up rather than dismissing both with one press.
    useEffect(() => {
      if (confirmGoalDelete) return void 0;
      if (!showDebtPicker && !showFundForm && !showGoalForm && !showDebtForm) return void 0;
      const h = (e) => {
        if (e.key !== "Escape") return;
        if (showDebtPicker) setShowDebtPicker(false);
        else if (showFundForm) setShowFundForm(false);
        else if (showGoalForm) setShowGoalForm(false);
        else if (showDebtForm) setShowDebtForm(false);
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [confirmGoalDelete, showDebtPicker, showFundForm, showGoalForm, showDebtForm]);
    const saveGoal = () => {
      const errs: Record<string, string> = {};
      const name = (goalForm.name || "").trim();
      const target = dollarsToCents(goalForm.target);
      const saved = dollarsToCents(goalForm.saved);
      const monthly = dollarsToCents(goalForm.monthly);
      if (!name) errs.name = "Name is required.";
      if (isNaN(target) || target <= 0) errs.target = "Enter a target above $0.";
      if (saved < 0) errs.saved = "Cannot be negative.";
      if (monthly < 0) errs.monthly = "Cannot be negative.";
      if (goalForm.targetDate && isNaN((new Date(goalForm.targetDate + "T00:00:00")).getTime())) errs.targetDate = "Invalid date.";
      if (goalForm.payoutEntry && !goalForm.targetDate) errs.targetDate = "Target date is required for a payout expense.";
      setGoalErrors(errs);
      if (Object.keys(errs).length) return;
      haptic();
      if (goalForm.id) {
        const g0 = goals.find((g) => g.id === goalForm.id);
        if (g0?.payoutEntryId) {
          setEntries((prev) => prev.map((e) => e.id === g0.payoutEntryId ? { ...e, desc: `Goal payout: ${name}`, amount: target, startDate: goalForm.targetDate || e.startDate } : e));
        }
        setGoals((prev) => prev.map((g) => g.id === goalForm.id ? { ...g, repeatMonths: Number(goalForm.repeatMonths) || 0, name, target, saved, monthly, targetDate: goalForm.targetDate || "" } : g));
        logActivity("goal", `Edited the goal ${name} \u2014 ${fmt(saved)} of ${fmt(target)}`);
      } else {
        const id = genId();
        let entryId = null;
        if (goalForm.linkEntry && monthly > 0) {
          entryId = genId();
          const today = new Date();
          const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
          setEntries((prev) => [...prev, {
            id: entryId,
            desc: `Goal: ${name}`,
            type: "expense",
            amount: monthly,
            startDate,
            repeats: true,
            recurEvery: 1,
            recurUnit: "month",
            recurDays: [],
            recurEnd: goalForm.targetDate || "",
            category: "Savings / RRSP",
            notes: "Savings goal contribution"
          }]);
        }
        let payoutEntryId = null;
        if (goalForm.payoutEntry && goalForm.targetDate) {
          payoutEntryId = genId();
          setEntries((prev) => [...prev, {
            id: payoutEntryId,
            desc: `Goal payout: ${name}`,
            type: "expense",
            amount: target,
            startDate: goalForm.targetDate,
            repeats: false,
            recurEvery: 1,
            recurUnit: "month",
            recurDays: [],
            recurEnd: "",
            category: "Savings / RRSP",
            notes: "Planned goal spending"
          }]);
        }
        setGoals((prev) => [...prev, { id, repeatMonths: Number(goalForm.repeatMonths) || 0, name, target, saved, monthly, targetDate: goalForm.targetDate || "", entryId, payoutEntryId, createdAt: (new Date()).toISOString() }]);
        logActivity("goal", `Added the goal ${name} \u2014 ${fmt(target)}`);
      }
      toast(goalForm.id ? "Goal updated" : "Goal added");
      setShowGoalForm(false);
      setGoalForm(null);
    };
    const applyFunds = () => {
      const amt = dollarsToCents(fundForm.amount);
      if (amt <= 0) return;
      haptic();
      setGoals((prev) => prev.map((g) => g.id === fundForm.goal.id ? { ...g, saved: roundMoney(g.saved + amt) } : g));
      toast(`Added ${fmt(amt)} to ${fundForm.goal.name}`);
      setShowFundForm(false);
      setFundForm(null);
    };
    const archiveGoal = (goal) => {
      logActivity("goal", `Archived the goal ${goal.name}`);
      setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, archived: true } : g));
      toast(`"${goal.name}" archived`);
    };
    const restoreArchivedGoals = () => {
      setGoals((prev) => prev.map((g) => g.archived ? { ...g, archived: false } : g));
    };
    // The year badge is rendered by App.js *above* the sub-tabs, matching
    // Budget — it used to live here, which put the same two elements in the
    // opposite order one tap apart.
    return <div className="cf-page">
      {(() => {
      const openGoalForm = (g) => {
        setGoalForm(g ? { ...g, target: String(centsToDollars(g.target)), saved: String(centsToDollars(g.saved)), monthly: String(centsToDollars(g.monthly)) } : { id: null, name: "", target: "", saved: "0", monthly: "", targetDate: "", repeatMonths: 0, linkEntry: true, payoutEntry: true });
        setGoalErrors({});
        setShowGoalForm(true);
      };
      return <Card className={"mb-20" + (planSub === "goals" ? "" : " cf-hidden")}>
        <div className="goal-header-row" style={{ marginBottom: goals.length ? 14 : 0 }}>
          <SectionTitle className="mb-0">Savings Goals</SectionTitle>
          {goals.length > 0 && <div className="cf-row cf-gap-8">
            {archivedGoalsCount > 0 && <button onClick={restoreArchivedGoals} className="debt-restore-btn">
              {"Restore "}
              {archivedGoalsCount}
              {" archived"}
            </button>}
            <ExportBar
              onCSV={() => downloadCSV(
            "CashFlow_Goals.csv",
            activeGoals.map((g) => [g.name, centsToDollars(g.target), centsToDollars(g.saved), centsToDollars(g.monthly), g.targetDate || "", g.target > 0 ? Math.round(g.saved / g.target * 100) : 0]),
            ["Goal", "Target", "Saved", "Monthly", "Target Date", "% Funded"]
          )}
              onPrint={() => printView("CashFlow Savings Goals")}
            />
            <button
              onClick={() => openGoalForm(null)}
              className="cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap"
            >
              + Add
            </button>
          </div>}
        </div>
        {goals.length === 0 ? <div className="goal-empty-wrap">
          <EmptyState
            icon={<Icon name="target" size={26} className="c-textLt" />}
            message="Save toward big expenses — property taxes, vacations, emergency fund."
            actionLabel="+ Add Goal"
            onAction={() => openGoalForm(null)}
          />
        </div> : <>
        {gq && <div className="notice notice--sm mb-12" data-tone="warn" role="status">
          <Icon name="search" size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
          Filtering goals by "
          {globalSearch}
          {'" \u2014 '}
          {goalsFiltered.length}
          {" match"}
          {goalsFiltered.length !== 1 ? "es" : ""}
        </div>}
        {goalsFiltered.length === 0 ? <div className="goal-empty-wrap">
          {gq ? "No goals match your search." : "All goals are archived."}
        </div> : <div
          className="goal-list"
        >
          {goalsFiltered.map((g) => {
        const pct = g.target > 0 ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0;
        const remaining = Math.max(0, g.target - g.saved);
        let projLabel = null, onTrack = null;
        if (remaining <= 0) {
          projLabel = "Funded";
          onTrack = true;
        } else if (g.monthly > 0) {
          const m = Math.ceil(remaining / g.monthly);
          const d = new Date();
          d.setMonth(d.getMonth() + m);
          projLabel = MONTHS[d.getMonth()] + " " + d.getFullYear();
          if (g.targetDate) {
            const t = new Date(g.targetDate + "T00:00:00");
            onTrack = d <= new Date(t.getFullYear(), t.getMonth() + 1, 0);
          }
        }
        let neededMonthly = null;
        if (remaining > 0 && onTrack === false && g.targetDate) {
          const t = new Date(g.targetDate + "T00:00:00");
          const now = new Date();
          const monthsLeft = (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth());
          if (monthsLeft > 0) neededMonthly = Math.ceil(remaining / monthsLeft);
        }
        const barColor = remaining <= 0 ? "var(--greenDk)" : onTrack === false ? "var(--amberInk)" : "var(--text)";
        return <div
          key={g.id}
          onContextMenu={(e) => {
              e.preventDefault();
              setGoalCtx({ x: e.clientX, y: e.clientY, goal: g });
            }}
          className="goal-row-cursor"
        >
          <div className="goal-title-row">
            <span className="tx-sb goal-name" title={g.name}>{g.name}</span>
            <div className="goal-amounts-row">
              <span className="goal-amounts-text">
                {fmt(g.saved)}
                {" "}
                <span className="c-textLt">of</span>
                {" "}
                {fmt(g.target)}
                <span className="goal-pct" style={{ color: barColor }}>{pct}%</span>
              </span>
              <button
                onClick={(e) => {
                e.stopPropagation();
                setGoalCtx({ x: e.clientX, y: e.clientY, goal: g });
              }}
                aria-label={`${g.name} actions`}
                className="cf-checkbtn row-menu-btn"
              >
                ⋮
              </button>
            </div>
          </div>
          <div className="progress-track-8">
            <div className="progress-fill" style={{ width: pct + "%", background: barColor }} />
          </div>
          <div className="goal-footer-row">
            <span>
              {g.monthly > 0 ? fmt(g.monthly) + "/mo" : "No monthly funding set"}
              {g.targetDate && <span className="goal-target-date">
                {" \u00B7 by "}
                {(() => {
            const t = new Date(g.targetDate + "T00:00:00");
            return MONTHS[t.getMonth()] + " " + t.getFullYear();
          })()}
              </span>}
            </span>
            {projLabel && <span
              style={{ color: remaining <= 0 ? "var(--greenDk)" : onTrack === false ? "var(--amberInk)" : "var(--textLt)", fontWeight: onTrack === false || remaining <= 0 ? 700 : 400 }}
            >
              {remaining <= 0 ? "\u2713 Funded" : onTrack === false ? neededMonthly ? `\u26A0 Need ${fmt(neededMonthly)}/mo by target` : "\u26A0 Projected " + projLabel : "On track \u2014 " + projLabel}
            </span>}
          </div>
        </div>;
      })}
        </div>}
      </>}
        {goalCtx && <ContextMenu
          x={goalCtx.x}
          y={goalCtx.y}
          onClose={() => setGoalCtx(null)}
          items={[
            { icon: "\u270E", label: "Edit goal", action: () => openGoalForm(goalCtx.goal) },
            { icon: "\uFF0B", label: "Add funds", action: () => {
              setFundForm({ goal: goalCtx.goal, amount: "" });
              setShowFundForm(true);
            } },
            "---",
            { icon: <Icon name="eye-off" size={15} />, label: "Archive goal", action: () => archiveGoal(goalCtx.goal) },
            { icon: "\u2715", label: "Delete goal", action: () => setConfirmGoalDelete(goalCtx.goal), danger: true }
          ]}
        />}
        {showGoalForm && goalForm && <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Goal form"
        >
          <div className="modal-card goalform-modal-card" onClick={(e) => e.stopPropagation()}>
            <SheetHandle
              onDismiss={() => {
            setShowGoalForm(false);
            setGoalForm(null);
          }}
            />
            <div className="modal-title-lg">{goalForm.id ? "Edit Goal" : "Add Goal"}</div>
            {(() => {
            const lblCls = "field-label";
            const inpCls = (err) => "field-input" + (err ? " field-error" : "");
            const errTxt = (k) => goalErrors[k] && <div className="field-error-text">{goalErrors[k]}</div>;
            return <div className="cf-col cf-gap-14">
              <div>
                <label className={lblCls} htmlFor="goal-name">
                  Goal name
                  <span className="required-mark">*</span>
                </label>
                <input
                  id="goal-name"
                  autoFocus={autoFocusOnDesktop()}
                  className={inpCls(goalErrors.name)}
                  value={goalForm.name}
                  placeholder="e.g. Property Taxes"
                  onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
                />
                {errTxt("name")}
              </div>
              <div className="entry-form-row2-12">
                <div>
                  <label className={lblCls} htmlFor="goal-target">
                    Target $
                    <span className="required-mark">*</span>
                  </label>
                  <MoneyInput
                    id="goal-target"
                    className={inpCls(goalErrors.target)}
                    value={goalForm.target}
                    onChange={(v) => setGoalForm((f) => ({ ...f, target: v }))}
                  />
                  {errTxt("target")}
                </div>
                <div>
                  <label className={lblCls} htmlFor="goal-saved">Saved so far $</label>
                  <MoneyInput
                    id="goal-saved"
                    className={inpCls(goalErrors.saved)}
                    value={goalForm.saved}
                    onChange={(v) => setGoalForm((f) => ({ ...f, saved: v }))}
                  />
                  {errTxt("saved")}
                </div>
              </div>
              <div className="entry-form-row2-12">
                <div>
                  <label className={lblCls} htmlFor="goal-monthly">Monthly funding $</label>
                  <MoneyInput
                    id="goal-monthly"
                    className={inpCls(goalErrors.monthly)}
                    value={goalForm.monthly}
                    onChange={(v) => setGoalForm((f) => ({ ...f, monthly: v }))}
                  />
                  {errTxt("monthly")}
                </div>
                <div>
                  <label className={lblCls} htmlFor="goal-target-date">
                    Target date
                    {goalForm.payoutEntry && <span className="required-mark">*</span>}
                  </label>
                  <input
                    id="goal-target-date"
                    type="date"
                    className={inpCls(goalErrors.targetDate)}
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))}
                  />
                  {errTxt("targetDate")}
                </div>
              </div>
              <div className="mt-12">
                <label className={lblCls} htmlFor="goal-repeat">Repeats</label>
                <select
                  id="goal-repeat"
                  className="field-input"
                  value={String(goalForm.repeatMonths || 0)}
                  onChange={(e) => setGoalForm((f) => ({ ...f, repeatMonths: Number(e.target.value) }))}
                >
                  <option value="0">Once</option>
                  <option value="1">Every month</option>
                  <option value="3">Every 3 months</option>
                  <option value="6">Every 6 months</option>
                  <option value="12">Every year</option>
                </select>
                <div className="hint mt-6">
                  A goal that repeats is a sinking fund: when the target date arrives the money is spent, and the goal starts again for the next one. Anything saved over the target carries over.
                </div>
              </div>
              {!goalForm.id && <>
                <label className="goal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={goalForm.linkEntry}
                    onChange={(e) => setGoalForm((f) => ({ ...f, linkEntry: e.target.checked }))}
                    className="checkbox-16"
                  />
                  Add monthly contribution to my budget as a recurring entry
                </label>
                <div className="checkbox-help-row">
                  <label className="goal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={goalForm.payoutEntry}
                      onChange={(e) => setGoalForm((f) => ({ ...f, payoutEntry: e.target.checked }))}
                      className="checkbox-16"
                    />
                    Add the payout as a one-time expense on the target date
                  </label>
                  <HelpTip
                    label="Add the payout as an expense"
                    text="Models the spending in your forecast: on the target date the saved-up amount leaves the budget as a one-time expense, so the running balance shows the purchase actually happening."
                  />
                </div>
              </>}
            </div>;
          })()}
            <div className="oem-footer-row">
              <button onClick={() => setShowGoalForm(false)} className="cf-btn cf-btn--secondary">
                Cancel
              </button>
              <button onClick={saveGoal} className="cf-btn cf-btn--primary fw-700 btn-pad-24">Save</button>
            </div>
          </div>
        </div>}
        {showFundForm && fundForm && <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add funds"
        >
          <div className="modal-card modal-card-360" onClick={(e) => e.stopPropagation()}>
            <SheetHandle
              onDismiss={() => {
            setShowFundForm(false);
            setFundForm(null);
          }}
            />
            <div className="fundform-title">Add funds</div>
            <div className="fundform-subtitle">{fundForm.goal.name}</div>
            <MoneyInput
              autoFocus={autoFocusOnDesktop()}
              value={fundForm.amount}
              placeholder="Amount"
              onChange={(v) => setFundForm((f) => ({ ...f, amount: v }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFunds();
              }}
              className="moneyinput-lg"
            />
            <div className="modal-btn-row-18">
              <button onClick={() => setShowFundForm(false)} className="cf-btn cf-btn--secondary">
                Cancel
              </button>
              <button onClick={applyFunds} className="cf-btn cf-btn--primary fw-700 btn-pad-24">Add</button>
            </div>
          </div>
        </div>}
        {confirmGoalDelete && <ConfirmDialog
          title="Delete goal?"
          message={`"${confirmGoalDelete.name}" will be removed.${confirmGoalDelete.entryId || confirmGoalDelete.payoutEntryId ? " Its linked budget entries (contribution/payout) will also be deleted." : ""}`}
          onCancel={() => setConfirmGoalDelete(null)}
          onConfirm={() => {
            const rm = [confirmGoalDelete.entryId, confirmGoalDelete.payoutEntryId].filter(Boolean);
            if (rm.length) {
              const removedCopyFroms = entries.filter((e) => rm.includes(e.id) && e.copiedFrom !== void 0).map((e) => e.copiedFrom);
              if (removedCopyFroms.length) setDeletedCopyIds((prev) => {
                const next = { ...prev };
                removedCopyFroms.forEach((id) => {
                  next[id] = true;
                });
                return next;
              });
              setEntries((prev) => prev.filter((e) => !rm.includes(e.id)));
            }
            setGoals((prev) => prev.filter((g) => g.id !== confirmGoalDelete.id));
            setConfirmGoalDelete(null);
          }}
        />}
      </Card>;
    })()}
      {(() => {
      const debtKeywords = [
        "debt",
        "credit",
        "loan",
        "mortgage",
        "line of credit",
        "cc-",
        "visa",
        "amex",
        "mastercard",
        "car payment",
        "truck payment",
        "trailer payment",
        "scotialine",
        "loc",
        "vehicle",
        "tractor"
      ];
      const autoGroups: Record<string, FlowRow[]> = {};
      flow.filter((ev) => ev.type === "expense" && debtKeywords.some(
        (k) => ev.desc.toLowerCase().includes(k) || ev.category.toLowerCase().includes(k)
      )).forEach((ev) => {
        autoGroups[ev.desc] = (autoGroups[ev.desc] || []).concat(ev);
      });
      const manualKeys = Object.keys(debtData).filter((k) => {
        return k.startsWith("manual_") && !debtData[k]?.hidden;
      });
      // Recurring series get their monthly-equivalent from the recurrence rule
      // itself (periods/year * amount, annualized) rather than from summing
      // this calendar year's actual occurrences — a series that started or
      // ends mid-year only has a partial year's worth in `evs`, and dividing
      // that partial total by 12 understated the true monthly payment (e.g. a
      // bi-weekly payment starting in June only has ~13 of its 26 yearly
      // occurrences this year). One-off (non-repeating) matches keep the old
      // sum-and-divide behavior, which is the correct spread for those.
      //
      // A single description can also cover more than one underlying entry
      // (e.g. a "Mortgage" 1st-of-month entry and a separate "Mortgage"
      // 15th-of-month entry, both monthly) — `evs` mixes both entries'
      // occurrences together. Using only evs[0]'s recurrence rule would have
      // seen just one of the two entries and missed the other payment
      // entirely, so each distinct entryId is annualized separately and the
      // per-entry contributions are summed.
      const toMonthlyFromEvs = (evs) => {
        if (!evs || !evs.length) return 0;
        const byEntry: Record<string, FlowRow[]> = {};
        evs.forEach((ev) => {
          const eid = ev.entryId != null ? ev.entryId : ev.id;
          (byEntry[eid] || (byEntry[eid] = [])).push(ev);
        });
        const total = Object.values(byEntry).reduce((sum, occs) => {
          const ev = occs[0];
          if (ev.repeats) {
            const every = ev.recurEvery || 1;
            // expandEntries' semimonth branch always emits exactly 2
            // occurrences/month (24/yr) — it never reads recurEvery — so
            // dividing by `every` here (as every other unit correctly does)
            // silently halved this to 12/yr for any semimonth entry that
            // happened to carry a stale/leftover recurEvery of 2.
            const ppy = { day: 365 / every, week: 52 / every, month: 12 / every, monthend: 12 / every, monthweekday: 12 / every, year: 1 / every, semimonth: 24 }[ev.recurUnit || "month"] ?? 12;
            return sum + (ev.amount || 0) * (ppy / 12);
          }
          return sum + occs.reduce((s, e) => s + (e.amount || 0), 0) / 12;
        }, 0);
        return roundMoney(total);
      };
      const autoRows = Object.entries(autoGroups).filter(([desc]) => {
        return !debtData[desc.replace(/[^a-zA-Z0-9]/g, "_")]?.hidden;
      }).map(([desc, evs]) => {
        return {
          key: desc.replace(/[^a-zA-Z0-9]/g, "_"),
          label: desc,
          monthlyPmt: toMonthlyFromEvs(evs),
          annualTotal: roundMoney(evs.reduce((s, ev) => s + (ev.amount || 0), 0)),
          timesPerYear: evs.length,
          perOccurrence: (evs[0]?.amount) || 0,
          recurDesc: (() => {
            const ev = evs[0];
            if (!ev) return "";
            const count = evs.length;
            // Multiple distinct entries sharing one description (e.g. separate
            // 1st-of-month and 15th-of-month entries both called "Mortgage")
            // don't share a single recurrence rule to describe — fall back to
            // the combined occurrence count instead of evs[0]'s own pattern.
            const distinctEntries = new Set(evs.map((e2) => e2.entryId != null ? e2.entryId : e2.id)).size;
            if (distinctEntries === 1) {
              const u = ev.recurUnit || "month";
              const e = ev.recurEvery || 1;
              if (u === "semimonth") return `2\xD7/mo`;
              if (u === "monthend" || u === "monthweekday") return `Monthly`;
              if (u === "week" && e === 2) return "Bi-weekly";
              if (u === "week") return `Every ${e} wk`;
              if (u === "month") return e === 1 ? "Monthly" : `Every ${e} mo`;
              if (u === "year") return "Yearly";
            }
            if (count === 24) return "2\xD7/mo";
            if (count === 26) return "Bi-weekly";
            return `${count}\xD7/yr`;
          })(),
          isAuto: true
        };
      });
      const manualRows = manualKeys.map((k) => {
        return {
          key: k,
          label: (debtData[k]?.label) || "",
          monthlyPmt: parseFloat(debtData[k]?.payment) || 0,
          isAuto: false,
          perOccurrence: undefined,
          recurDesc: undefined,
          timesPerYear: undefined
        };
      });
      const allRows = [...autoRows, ...manualRows].filter((r) => {
        if (r.isAuto) return true;
        const d = debtData[r.key] || {};
        return r.label && r.label.trim() || parseFloat(d.balance) > 0 || parseFloat(d.rate) > 0 || parseFloat(d.payment) > 0;
      });
      const allRowsFiltered = gq ? allRows.filter((r) => (r.label || "").toLowerCase().includes(gq)) : allRows;
      // Amortised month by month, the same way simulateDebtStrategy does it,
      // because the two have to agree: the interest was `pmt * m - bal`, which
      // charges the whole of the final month's payment even though that
      // payment only ever clears what is left. On $4,000 at 19.9% paying $300
      // the tracker printed $800 of "Total Interest Remaining" against the
      // $558.33 the Payoff Strategy screen simulated for the same debt — a
      // 43% overstatement, on the number the screen exists to tell you.
      const calcPayoff = (bal, rate, pmt) => {
        if (!bal || !pmt) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        const r = rate / 100 / 12;
        if (r > 0 && pmt <= bal * r) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        let left = bal, accrued = 0, m = 0;
        while (left > 5e-3 && m < 600) {
          m++;
          const i = left * r;
          left += i;
          accrued += i;
          left -= Math.min(pmt, left);
        }
        if (m >= 600) return { monthsLeft: null, totalInterest: null, payoffDate: null };
        const interest = r > 0 ? roundMoney(accrued) : null;
        const d = new Date();
        d.setMonth(d.getMonth() + m);
        return { monthsLeft: m, totalInterest: interest, payoffDate: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
      };
      const debtKpiTotals = allRows.reduce((acc, r) => {
        const d = debtData[r.key] || {};
        const bal = parseFloat(d.balance) || 0;
        const rate = parseFloat(d.rate) || 0;
        const pmt = r.isAuto ? r.monthlyPmt : parseFloat(d.payment) || 0;
        const { totalInterest, payoffDate } = calcPayoff(bal, rate, pmt);
        acc.balance += bal;
        acc.payment += pmt;
        if (totalInterest != null) acc.interest += totalInterest;
        if (payoffDate) {
          const dt = new Date(payoffDate);
          if (!acc.latestPayoffDt || dt > acc.latestPayoffDt) {
            acc.latestPayoffDt = dt;
            acc.latestPayoff = payoffDate;
          }
        }
        return acc;
      }, { balance: 0, payment: 0, interest: 0, latestPayoffDt: null, latestPayoff: null });
      const addManualRow = () => {
        setDebtFormData({ label: "", balance: "", rate: "", payment: "", editKey: null });
        setShowDebtForm(true);
      };
      const editDebtRow = (key, autoLabel = "") => {
        const v = debtData[key] || {};
        setDebtFormData({ label: v.label || (autoLabel || key.replace(/_/g, " ")), balance: v.balance ? String(centsToDollars(Number(v.balance))) : "", rate: v.rate || "", payment: v.payment ? String(centsToDollars(Number(v.payment))) : "", editKey: key });
        setShowDebtForm(true);
      };
      const saveDebtForm = () => {
        if (!debtFormData.label.trim()) return;
        const balN = parseFloat(debtFormData.balance);
        const rateN = parseFloat(debtFormData.rate);
        const pmtN = parseFloat(debtFormData.payment);
        const { editKey } = debtFormData;
        // Balance/payment are entered in dollars but stored in cents — the
        // same at-rest convention schema v8 established for every other
        // money field (entries, goals, budget targets); rate is a percentage,
        // not money, and is stored as-is.
        const formVals = {
          label: debtFormData.label.trim(),
          // Numbers, the same type the cloud hands back (numeric columns in
          // the debts table). They were written as strings of cents, so a
          // debt held a number or a string depending on whether it had been
          // edited here or loaded. "" still means "not filled in yet".
          balance: isNaN(balN) || balN < 0 ? "" : dollarsToCents(balN),
          rate: isNaN(rateN) || rateN < 0 ? "" : rateN,
          payment: isNaN(pmtN) || pmtN < 0 ? "" : dollarsToCents(pmtN)
        };
        if (editKey) {
          setDebtData((p) => ({ ...p, [editKey]: { ...p[editKey], ...formVals } }));
          logActivity("debt", `Updated the debt ${debtFormData.label || editKey}`);
        } else {
          const id = "manual_" + genId();
          setDebtData((p) => ({ ...p, [id]: formVals }));
          logActivity("debt", `Added the debt ${debtFormData.label || "Untitled"}`);
        }
        setShowDebtForm(false);
        setDebtFormData({ label: "", balance: "", rate: "", payment: "", editKey: null });
      };
      const removeRow = (key, isAuto) => {
        if (isAuto) {
          setDebtData((p) => ({ ...p, [key]: { ...p[key], hidden: true } }));
        } else {
          setDebtData((p) => {
            const n = { ...p };
            delete n[key];
            return n;
          });
        }
      };
      const restoreHidden = () => {
        setDebtData((p) => {
          const n = { ...p };
          Object.keys(n).forEach((k) => {
            if (n[k].hidden) delete n[k].hidden;
          });
          return n;
        });
      };
      const hiddenCount = Object.values(debtData).filter((v) => v.hidden).length;
      // ── Net worth ────────────────────────────────────────────────────────
      // Two thirds of this the app already knew: debts carry balances, and the
      // projection knows what is in the accounts today. Assets were the
      // missing third, and without them the one number people mean by "how am
      // I doing overall" could not be formed at all.
      //
      // Nothing here is estimated. A value is whatever was last typed in, and
      // the date beside it says when — a house valuation grown forward by some
      // assumed rate would look like a measurement and be a guess.
      const nwCash = getCurrentBalance(flow, openBal, activeYear);
      const nw = netWorthSummary({ assets, debtData, cash: nwCash, asOf: todayStr() });
      const blankAsset = { id: null, name: "", kind: "property", value: "", asOf: todayStr(), note: "" };
      const saveAssetForm = () => {
        const name = ((assetForm && assetForm.name) || "").trim();
        if (!name) return;
        const valN = parseFloat(assetForm.value);
        const row = {
          name,
          kind: assetForm.kind || "other",
          value: Number.isFinite(valN) ? dollarsToCents(valN) : 0,
          asOf: assetForm.asOf || todayStr(),
          note: (assetForm.note || "").trim()
        };
        if (assetForm.id) {
          setAssets((prev) => prev.map((a) => a.id === assetForm.id ? { ...a, ...row } : a));
          logActivity("asset", `Updated the asset ${name}`);
        } else {
          setAssets((prev) => [...prev, { id: genId(), createdAt: (new Date()).toISOString(), ...row }]);
          logActivity("asset", `Added the asset ${name}`);
        }
        setShowAssetForm(false);
      };
      const removeAsset = (a) => {
        setAssets((prev) => prev.filter((x) => x.id !== a.id));
        logActivity("asset", `Removed the asset ${a.name}`);
        toast(`"${a.name}" removed.`);
      };
      const assetField = (id, label, input) => <div>
        <label className="field-label" htmlFor={id}>{label}</label>
        {input}
      </div>;
      const netWorthView = <Card className={"mb-20" + (planSub === "networth" ? "" : " cf-hidden")}>
        <SectionTitle
          help="What you own, plus what is in your accounts today, less what you owe. Asset values are whatever you last entered — nothing is estimated or grown for you, and the date beside each one says when you last confirmed it."
        >
          Net worth
        </SectionTitle>
        <div className="nw-total" data-tone={nw.total < 0 ? "bad" : "good"}>{fmt(nw.total, true)}</div>
        <div className="nw-parts">
          {[["Assets", nw.assets], ["In accounts", nw.cash], ["Debts", -nw.debts]].map((pair) =>
            <div key={pair[0]} className="nw-part">
              <div className="lbl">{pair[0]}</div>
              <div className="nw-part-amt">{fmt(pair[1], true)}</div>
            </div>)}
        </div>
        {nw.stale.length > 0 && <div className="notice notice--sm mt-12" data-tone="warn" role="status">
          {nw.stale.length === 1
            ? `${nw.stale[0].name} was last confirmed over a year ago.`
            : `${nw.stale.length} assets were last confirmed over a year ago.`}
        </div>}
        <div className="cf-row-between mt-16 mb-8">
          <h3 className="cf-section-title-text">What you own</h3>
          <button
            className="cf-btn cf-btn--secondary cf-btn--compact"
            onClick={() => { setAssetForm(blankAsset); setShowAssetForm(true); }}
          >
            + Add asset
          </button>
        </div>
        {assets.length === 0
          ? <div className="hint">
            Nothing recorded yet. Add the house, the car, an investment account — anything you would count if you were adding up what you are worth.
          </div>
          : <div className="nw-asset-list">
            {assets.map((a) => <div key={a.id} className="nw-asset-row">
              <div className="nw-asset-main">
                <div className="nw-asset-name">{a.name}</div>
                <div className="hint">
                  {assetKindLabel(a.kind)}
                  {a.asOf ? " · as of " + humanShortDate(a.asOf) : ""}
                  {a.note ? " · " + a.note : ""}
                </div>
              </div>
              <div className="nw-asset-amt">{fmt(a.value)}</div>
              <button
                className="link-btn-sm"
                onClick={() => { setAssetForm({ ...a, value: String(centsToDollars(a.value || 0)) }); setShowAssetForm(true); }}
                aria-label={`Edit ${a.name}`}
              >
                Edit
              </button>
              <button className="link-btn-sm" onClick={() => removeAsset(a)} aria-label={`Remove ${a.name}`}>
                Remove
              </button>
            </div>)}
          </div>}
      </Card>;
      const assetFormModal = planSub === "networth" && showAssetForm && assetForm && <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Asset form"
      >
        <div className="modal-card oem-card">
          <SheetHandle onDismiss={() => setShowAssetForm(false)} />
          <SectionTitle>{assetForm.id ? "Edit asset" : "Add asset"}</SectionTitle>
          {assetField("asset-name", "Name", <input
            id="asset-name"
            autoFocus={autoFocusOnDesktop()}
            placeholder="e.g. House"
            value={assetForm.name}
            className="field-input"
            onChange={(e) => setAssetForm((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && saveAssetForm()}
          />)}
          <div className="grid-2-12 mt-12">
            {assetField("asset-kind", "Kind", <select
              id="asset-kind"
              value={assetForm.kind}
              className="field-input"
              onChange={(e) => setAssetForm((p) => ({ ...p, kind: e.target.value }))}
            >
              {ASSET_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>)}
            {assetField("asset-value", "Value", <input
              id="asset-value"
              inputMode="decimal"
              placeholder="0.00"
              value={assetForm.value}
              className="field-input"
              onChange={(e) => setAssetForm((p) => ({ ...p, value: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && saveAssetForm()}
            />)}
          </div>
          <div className="grid-2-12 mt-12">
            {assetField("asset-asof", "Value confirmed on", <input
              id="asset-asof"
              type="date"
              value={assetForm.asOf}
              className="field-input"
              onChange={(e) => setAssetForm((p) => ({ ...p, asOf: e.target.value }))}
            />)}
            {assetField("asset-note", "Note", <input
              id="asset-note"
              placeholder="optional"
              value={assetForm.note}
              className="field-input"
              onChange={(e) => setAssetForm((p) => ({ ...p, note: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && saveAssetForm()}
            />)}
          </div>
          <div className="cf-row cf-gap-8 mt-16" style={{ justifyContent: "flex-end" }}>
            <button className="cf-btn cf-btn--secondary" onClick={() => setShowAssetForm(false)}>
              Cancel
            </button>
            <button className="cf-btn cf-btn--primary" onClick={saveAssetForm}>Save</button>
          </div>
        </div>
      </div>;

      return <>
        {netWorthView}
        {assetFormModal}
        {planSub === "strategy" && (() => {
        const simDebtsAll = allRows.map((row) => {
          return {
            key: row.key,
            label: row.label,
            bal: parseFloat(debtData[row.key]?.balance) || 0,
            rate: parseFloat(debtData[row.key]?.rate) || 0,
            pmt: row.monthlyPmt
          };
        }).filter((d) => d.bal > 0 && d.pmt > 0);
        if (simDebtsAll.length < 1) return <Card className="mt-16">
          <SectionTitle className="mb-12">Payoff Strategy</SectionTitle>
          <div className="goal-empty-wrap">
            <EmptyState
              icon={<Icon name="mountain" size={26} className="c-textLt" />}
              message="Add a balance and payment for at least one debt in Debt Payoff to see Avalanche vs Snowball strategies here."
              actionLabel="Go to Debt Payoff"
              onAction={() => setPlanSub("debt")}
            />
          </div>
        </Card>;
        const toggleSimDebt = (key) => {
          setDebtSimExcluded((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
        };
        // Nine checkboxes as chips cost about 500px of a phone screen to say
        // "all of them", which is the answer almost every time — and the names
        // that matter most ("CC-Scotia Infinite Visa") were the ones the chips
        // truncated. One line states the answer; changing it is a sheet, where
        // the full names fit and All / None are one tap.
        const includedCount = simDebtsAll.length - simDebtsAll.filter((d) => debtSimExcluded.includes(d.key)).length;
        const checklist = simDebtsAll.length > 1 && <div className="strat-include-row">
          <span className="strat-include-text">
            {includedCount === simDebtsAll.length
              ? `All ${simDebtsAll.length} debts included`
              : `${includedCount} of ${simDebtsAll.length} debts included`}
          </span>
          <button
            type="button"
            className="cf-btn cf-btn--secondary cf-btn--xs"
            onClick={() => setShowDebtPicker(true)}
            aria-haspopup="dialog"
          >
            Change
          </button>
        </div>;
        const debtPicker = showDebtPicker && <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Debts in the simulation"
        >
          <div className="modal-card entries-mobilefilters-card">
            <SheetHandle onDismiss={() => setShowDebtPicker(false)} />
            <div className="modal-title-lg">Debts in the simulation</div>
            <div className="strat-picker-actions">
              <button className="cf-btn cf-btn--secondary cf-btn--xs" onClick={() => setDebtSimExcluded([])}>
                All
              </button>
              <button
                className="cf-btn cf-btn--secondary cf-btn--xs"
                onClick={() => setDebtSimExcluded(simDebtsAll.map((d) => d.key))}
              >
                None
              </button>
            </div>
            <div className="strat-picker-list">
              {simDebtsAll.map((d) => <label key={d.key} className="strat-picker-item">
                <input
                  type="checkbox"
                  checked={!debtSimExcluded.includes(d.key)}
                  onChange={() => toggleSimDebt(d.key)}
                />
                <span className="strat-picker-name">{d.label}</span>
                <span className="cf-text-mono-13 strat-picker-bal">{fmt(d.bal)}</span>
              </label>)}
            </div>
            <div className="customize-done-row">
              <button
                onClick={() => setShowDebtPicker(false)}
                className="cf-btn cf-btn--primary fw-700 btn-pad-24"
              >
                Done
              </button>
            </div>
          </div>
        </div>;
        // debtExtra is entered/displayed in dollars; simDebts' bal/pmt are
        // cents, so this needs the same conversion before it's mixed in.
        const extraDollars = Math.max(0, parseFloat(debtExtra) || 0);
        const extra = dollarsToCents(extraDollars);
        const sliderMax = Math.max(2e3, Math.ceil(extraDollars / 100) * 100);
        const extraControl = <label className="strat-extra-label">
          Extra $/month
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={25}
            value={extraDollars}
            onChange={(e) => setDebtExtra(e.target.value)}
            className="strat-extra-slider"
            aria-label="Extra monthly payment slider"
          />
          <MoneyInput
            value={debtExtra}
            onChange={(v) => setDebtExtra(v)}
            className="strat-extra-input cf-text-mono-13"
          />
        </label>;
        const simDebts = simDebtsAll.filter((d) => !debtSimExcluded.includes(d.key));
        if (simDebts.length < 1) return <Card className="mt-16">
          <SectionTitle action={extraControl} className="goal-header-row mb-12">Payoff Strategy</SectionTitle>
          {checklist}
          <div className="strat-error">
            All debts are excluded from the simulation — include at least one above to see a strategy.
          </div>
        </Card>;
        const av = simulateDebtStrategy(simDebts, extra, "avalanche");
        const sn = simulateDebtStrategy(simDebts, extra, "snowball");
        const base = simulateDebtStrategy(simDebts, 0, "avalanche");
        if (!av || !sn) {
          const minExtraCents = Math.max(0, ...simDebts.map((d) => d.bal * (d.rate / 100 / 12) - d.pmt));
          const suggested = Math.ceil(centsToDollars(minExtraCents)) + 1;
          return <Card className="mt-16">
            <SectionTitle action={extraControl} className="goal-header-row mb-12">
              Payoff Strategy
            </SectionTitle>
            {checklist}
            <div className="strat-error">
              ⚠ Payments don't cover interest on at least one debt — payoff never completes.
              {minExtraCents > 0 && <>
                {" Try at least "}
                <button className="strat-suggest-btn" onClick={() => setDebtExtra(String(suggested))}>
                  {moneySymbol()}
                  {suggested}
                  /mo extra
                </button>
                .
              </>}
            </div>
          </Card>;
        }
        const maxLen = Math.max(av.timeline.length, sn.timeline.length);
        const chartData = Array.from({ length: maxLen }, (_, i) => ({
          month: i,
          Avalanche: i < av.timeline.length ? av.timeline[i] : 0,
          Snowball: i < sn.timeline.length ? sn.timeline[i] : 0
        }));
        // The same helper the Alerts centre reads, so the sentence here and
        // the one there cannot drift apart.
        const strategyFinding = debtStrategyFinding(simDebts, extra);
        const deltaCallout = strategyFinding && <div
          className="notice notice--sm"
          data-tone={strategyFinding.tone}
          role="status"
        >
          <Icon name={strategyFinding.icon} size={14} />
          <span className="notice-msg">{strategyFinding.text}</span>
        </div>;
        return <Card className="mt-16">
          <SectionTitle action={extraControl} className="goal-header-row mb-12">Payoff Strategy</SectionTitle>
          {checklist}
          {debtPicker}
          {deltaCallout}
          <StratCompare av={av} sn={sn} base={base} pick={stratPick} onPick={setStratPick} />
          <div className="strat-chart-wrap">
            <div className="strat-chart-label">Total balance remaining over time</div>
            <div className="pb-28">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={chartData}
                  ariaLabel={`Line chart of the total debt balance falling to zero over ${chartData.length} months, one line per strategy: Avalanche clears it in ${av.months} months paying ${fmt(av.totalInterest)} of interest, Snowball in ${sn.months} months paying ${fmt(sn.totalInterest)}. The two cards above give the same figures.`}
                  margin={{ top: 4, right: 4, bottom: 34, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={DASH_AXIS_TICK_X} tickMargin={4} />
                  <YAxis tickFormatter={fmtAxisK} tick={DASH_AXIS_TICK_Y} tickMargin={6} width={44} />
                  <Tooltip content={ChartTip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="Avalanche"
                    name="Avalanche"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Snowball"
                    name="Snowball"
                    stroke="var(--amberInk)"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="strat-footnote-row">
            <ExportBar
              onCSV={() => downloadCSV(
            "CashFlow_PayoffStrategy.csv",
            [
              ["Avalanche", av.debtFreeDate, centsToDollars(av.totalInterest), av.months, av.payoffOrder.join(" -> ")],
              ["Snowball", sn.debtFreeDate, centsToDollars(sn.totalInterest), sn.months, sn.payoffOrder.join(" -> ")]
            ],
            ["Strategy", "Debt-Free Date", "Total Interest", "Months", "Payoff Order"]
          )}
              onPrint={() => printView("CashFlow Payoff Strategy")}
            />
          </div>
        </Card>;
      })()}
        {planSub === "debt" && debtCtx && <ContextMenu
          x={debtCtx.x}
          y={debtCtx.y}
          onClose={() => setDebtCtx(null)}
          items={[
            { icon: "\u270E", label: "Edit entry", action: () => editDebtRow(debtCtx.key, debtCtx.label) },
            "---",
            {
              icon: debtCtx.isAuto ? <Icon name="eye" size={15} /> : "\u2715",
              label: debtCtx.isAuto ? "Hide from tracker" : "Remove entry",
              action: () => removeRow(debtCtx.key, debtCtx.isAuto),
              danger: true
            }
          ]}
        />}
        {planSub === "debt" && showDebtForm && <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Debt form"
        >
          <div className="modal-card oem-card">
            <SheetHandle onDismiss={() => setShowDebtForm(false)} />
            <div className="modal-title-lg">{debtFormData.editKey ? "Edit Debt" : "Add Debt"}</div>
            <div className="cf-col cf-gap-14">
              <div>
                <label className="field-label" htmlFor="debt-desc">
                  Description
                  <span className="required-mark">*</span>
                </label>
                <input
                  id="debt-desc"
                  autoFocus={autoFocusOnDesktop()}
                  placeholder="e.g. Personal Loan"
                  value={debtFormData.label}
                  onChange={(e) => setDebtFormData((p) => ({ ...p, label: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveDebtForm()}
                  className="field-input"
                />
              </div>
              <div className="grid-2-12">
                <div>
                  <label className="field-label" htmlFor="debt-balance">Current Balance $</label>
                  <MoneyInput
                    id="debt-balance"
                    placeholder="e.g. 10000"
                    value={debtFormData.balance}
                    className="field-input"
                    onChange={(v) => setDebtFormData((p) => ({ ...p, balance: v }))}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="debt-rate">Interest Rate %</label>
                  <input
                    id="debt-rate"
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 5.9"
                    value={debtFormData.rate}
                    className="field-input"
                    onChange={(e) => setDebtFormData((p) => ({ ...p, rate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <FieldLabel
                  htmlFor="debt-payment"
                  helpLabel="Monthly Payment"
                  help="Leave blank for a debt that is already in your budget — its payment is read from the matching entry. Fill it in for a debt you pay from somewhere else, or the payoff date can't be worked out."
                >
                  {"Monthly Payment $ "}
                  <span className="debtform-optional">(optional)</span>
                </FieldLabel>
                <MoneyInput
                  id="debt-payment"
                  placeholder="e.g. 500"
                  value={debtFormData.payment}
                  className="field-input"
                  onChange={(v) => setDebtFormData((p) => ({ ...p, payment: v }))}
                />
                {(() => {
          // Auto-detection only catches a payment whose description/category
          // happens to contain a debt-ish keyword (loan, mortgage, visa…) —
          // anything else (e.g. "Costco Mastercard") is silently missed. This
          // lets a user fill the payment from any recurring expense directly,
          // without depending on that guess.
          const recurExpenses = entries.filter((e) => e.type === "expense" && e.repeats);
          if (!recurExpenses.length) return null;
          const entryToMonthly = (e) => {
            const every = e.recurEvery || 1;
            const ppy = { day: 365 / every, week: 52 / every, month: 12 / every, monthend: 12 / every, monthweekday: 12 / every, year: 1 / every, semimonth: 24 }[e.recurUnit || "month"] ?? 12;
            return roundMoney((e.amount || 0) * (ppy / 12));
          };
          // Group by description so multiple entries sharing one name (e.g.
          // separate 1st-of-month and 15th-of-month "Mortgage" entries)
          // autofill their combined monthly total — selecting just one of
          // several same-named entries previously loaded only its own share
          // of the payment, same bug the Debt Payoff Tracker's own monthly
          // total had.
          const groupedByDesc: Record<string, Entry[]> = {};
          recurExpenses.forEach((e) => {
            const k = e.desc || "";
            (groupedByDesc[k] || (groupedByDesc[k] = [])).push(e);
          });
          const recurGroups = Object.entries(groupedByDesc).map(([desc, evs]) => ({
            desc,
            monthly: roundMoney(evs.reduce((s, e) => s + entryToMonthly(e), 0))
          })).sort((a, b) => a.desc.localeCompare(b.desc));
          return <div className="mt-8">
            <div className="debtform-hint mb-6">Or autofill from a recurring expense:</div>
            <select
              aria-label="Autofill payment from a recurring expense"
              value=""
              className="field-input"
              onChange={(e) => {
                const grp = recurGroups.find((g) => g.desc === e.target.value);
                if (grp) setDebtFormData((p) => ({ ...p, payment: String(centsToDollars(grp.monthly)) }));
              }}
            >
              <option value="">— choose an entry —</option>
              {recurGroups.map((g) => <option key={g.desc} value={g.desc}>
                {g.desc}
                {" ("}
                {fmt(g.monthly)}
                /mo)
              </option>)}
            </select>
          </div>;
        })()}
              </div>
            </div>
            <div className="oem-footer-row">
              <button onClick={() => setShowDebtForm(false)} className="cf-btn cf-btn--secondary">
                Cancel
              </button>
              <button
                onClick={saveDebtForm}
                disabled={!debtFormData.label.trim()}
                className="cf-btn cf-btn--primary btn-pad-24"
              >
                {debtFormData.editKey ? "Save Changes" : "Add Debt"}
              </button>
            </div>
          </div>
        </div>}
        <Card className={"mb-20 mt-16" + (planSub === "debt" ? "" : " cf-hidden")}>
          <div
            className="goal-header-row"
            style={{
        marginBottom: 12
      }}
          >
            <SectionTitle className="mb-0">Debt Payoff Tracker</SectionTitle>
          </div>
          {allRows.length > 0 && (debtKpiTotals.balance > 0 ? <div className="kpi-grid mt-16">
            <KpiCard label="Total Balance" value={fmt(debtKpiTotals.balance)} color="var(--red)" />
            <KpiCard label="Total Monthly Payment" value={fmt(debtKpiTotals.payment)} />
            <KpiCard label="Total Interest Remaining" value={fmt(debtKpiTotals.interest)} />
            <KpiCard
              label="Debt-Free By"
              value={debtKpiTotals.latestPayoff || "\u2014"}
              color={debtKpiTotals.latestPayoff ? "var(--greenDk)" : void 0}
            />
          </div> : <div
            className="debt-needs-balance mt-16"
          >
            <Icon name="credit-card" size={16} />
            <div>
              <strong>
                {allRows.length === 1 ? "One payment found, no balance yet" : `${allRows.length} payments found, no balances yet`}
              </strong>
              <div className="hint mt-2">
                Add what's still owed and the interest rate below, and this fills in with a payoff date, the total interest ahead of you, and what an extra payment would save.
              </div>
            </div>
          </div>)}
          {allRows.length > 0 && <div className="budget-toolbar-row budget-toolbar-row--end">
            <ExportBar
              onCSV={() => downloadCSV(
            "CashFlow_Debts.csv",
            allRows.map(({ key, label, monthlyPmt, isAuto }) => {
              const bal = parseFloat(debtData[key]?.balance) || 0;
              const rate = parseFloat(debtData[key]?.rate) || 0;
              const pmt = isAuto ? monthlyPmt : parseFloat(debtData[key]?.payment) || 0;
              const { totalInterest, payoffDate } = calcPayoff(bal, rate, pmt);
              return [label, centsToDollars(bal), rate, centsToDollars(pmt), payoffDate || "", totalInterest != null ? centsToDollars(totalInterest) : ""];
            }),
            ["Debt", "Balance", "Rate %", "Monthly Payment", "Payoff Date", "Total Interest"]
          )}
              onPrint={() => printView("CashFlow Debt Payoff Tracker")}
            />
            {hiddenCount > 0 && <button onClick={restoreHidden} className="debt-restore-btn">
              {"Restore "}
              {hiddenCount}
              {" hidden"}
            </button>}
            <button onClick={addManualRow} className="cf-btn cf-btn--primary cf-btn--md cf-btn--nowrap">
              + Add
            </button>
          </div>}
          {allRows.length === 0 ? <div className="goal-empty-wrap">
            <EmptyState
              icon={<Icon name="credit-card" size={26} className="c-textLt" />}
              message="No debt entries detected — debts matching your budget entries show up here automatically, or add one manually."
              actionLabel="+ Add Debt"
              onAction={addManualRow}
            />
          </div> : <>
        {gq && <div className="notice notice--sm mb-10" data-tone="warn" role="status">
          <Icon name="search" size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
          Filtering debts by "
          {globalSearch}
          {'" \u2014 '}
          {allRowsFiltered.length}
          {" match"}
          {allRowsFiltered.length !== 1 ? "es" : ""}
        </div>}
        {allRowsFiltered.length === 0 ? <div className="goal-empty-wrap">No debts match your search.</div> : <div
          className="debt-list"
        >
          {allRowsFiltered.map(({ key, label, monthlyPmt, isAuto, perOccurrence, recurDesc, timesPerYear }) => {
        const bal = parseFloat(debtData[key]?.balance) || 0;
        const rate = parseFloat(debtData[key]?.rate) || 0;
        const pmt = isAuto ? monthlyPmt : parseFloat(debtData[key]?.payment) || 0;
        const { monthsLeft, totalInterest, payoffDate } = calcPayoff(bal, rate, pmt);
        const payoffTrend = monthsLeft > 1 ? projectPayoffBalances(bal, rate, pmt, monthsLeft) : null;
        // One flat row, not a card in a card in a page. The balance used to
        // be printed twice — once beside the sparkline, once again in a
        // three-column stat grid below it — and the three nested boxes cost
        // 96px of a 390px screen, which is why a name like "CC-Scotia Line of
        // Credit" wrapped to three lines. Everything that was in the grid is
        // one meta line now, and the burn-down gets the width it was always
        // trying to show.
        const facts = [
          rate > 0 ? rate + "%" : null,
          pmt > 0 ? fmt(pmt) + "/mo" : null,
          isAuto && recurDesc && timesPerYear > 12 ? fmt(perOccurrence) + " " + recurDesc : null,
          totalInterest != null && totalInterest > 0 ? "+" + fmt(totalInterest) + " interest" : null
        ].filter(Boolean);
        return <div
          key={key}
          onContextMenu={(e) => {
              e.preventDefault();
              setDebtCtx({ x: e.clientX, y: e.clientY, key, label, isAuto });
            }}
          className="debt-item"
        >
          <div className="debt-item-head">
            <span className="debt-item-name">{label}</span>
            {bal > 0 && <span className="cf-text-mono-13 debt-item-bal">{fmt(bal)}</span>}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDebtCtx({ x: e.clientX, y: e.clientY, key, label, isAuto });
              }}
              className="cf-checkbtn row-menu-btn debt-item-menu"
              aria-label={label + " actions"}
              title={label + " actions"}
            >
              ⋮
            </button>
          </div>
          {(facts.length > 0 || payoffDate) && <div className="debt-item-meta">
            {facts.join(" \u00B7 ")}
            {payoffDate && <span className="debt-item-paid">
              {facts.length ? " \u00B7 " : ""}
              {"\u2713 paid off "}
              {payoffDate}
            </span>}
          </div>}
          {payoffTrend && <div className="debt-item-trend" title="Projected balance decline to payoff">
            <Sparkline
              data={payoffTrend}
              color="var(--red)"
              height={22}
              width={240}
              responsive={true}
              area={true}
            />
          </div>}
        </div>;
      })}
        </div>}
      </>}
        </Card>
      </>;
    })()}
    </div>;
  }
