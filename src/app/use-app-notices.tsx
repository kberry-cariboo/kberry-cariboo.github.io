import { useMemo } from "../lib/runtime.js";
import { fmt } from "../lib/format.js";
import { categoryAnomalies, categoryAnomalyFindings } from "../lib/anomaly.js";
import { MONTHS, computeSpendingInsight, debtStrategyFinding, spendingInsightFinding } from "../lib/app-data.js";
import type { DebtFigures } from "../types.js";
  // What the app has to say: findings (what it has worked out) and notices
  // (the banners at the top). Moved out of App as is.
  export function useAppNotices({ activeFlow, activeYear, debtData, debtExtra, canWrite, showLowBanner, tab, navLowInfo, alertThresh, lowBannerKey, setLowBannerDismissed, setTab, showBackupNudge, dismissBackup, entries, setEntries, yearConfigs, setActiveYear, setYouSub }) {
    // Findings, as opposed to warnings: the things the app has worked out that
    // you would want told. The Alerts centre lists every one, so it is the
    // place you can go to see everything the app has to say — the screens that
    // compute them still show them in context, from these same helpers.
    const appFindings = useMemo(() => {
      const simDebts = Object.entries((debtData || {}) as Record<string, DebtFigures>)
        .map(([key, v]) => ({
          key,
          bal: parseFloat(String(v?.balance)) || 0,
          rate: parseFloat(String(v?.rate)) || 0,
          pmt: parseFloat(String(v?.payment)) || 0
        }))
        .filter((d) => d.bal > 0 && d.pmt > 0 && !(debtData[d.key] || {}).hidden);
      const extra = Math.round((parseFloat(debtExtra) || 0) * 100);
      // The month-level insight says whether the month is heavy and names the
      // single biggest mover. These say which categories are spending unlike
      // themselves — a month can be unremarkable overall while two categories
      // have both moved, and that is the case the one-driver line cannot
      // report.
      const now = new Date();
      const anomalies = now.getFullYear() === activeYear
        ? categoryAnomalies(activeFlow, now.getMonth())
        : [];
      return [
        spendingInsightFinding(computeSpendingInsight(activeFlow, activeYear)),
        ...categoryAnomalyFindings(anomalies, MONTHS[now.getMonth()]),
        debtStrategyFinding(simDebts, extra)
      ].filter(Boolean);
    }, [activeFlow, activeYear, debtData, debtExtra]);
    // Every transient notice the app can raise, gathered in one list so they
    // share a shape, a scale and a collapse rule. Order here is irrelevant —
    // NoticeStack sorts by severity — but each entry carries a `plain` string
    // because that is what the collapsed summary shows.
    const appNotices = useMemo(() => {
      const out = [];
      // Said once, at the top, rather than by every control going quiet with
      // no explanation. A view-only member can read the whole budget; what
      // they cannot do is change it, and being told why beats discovering it
      // by pressing something.
      if (!canWrite) {
        out.push({
          id: "view-only",
          tone: "info",
          icon: "eye",
          msg: "You have view-only access to this household. You can see everything; changes are turned off.",
        });
      }
      // Not on the alerts page itself: there the banner is a summary of the
      // page under it, and its "View alerts" action goes nowhere.
      if (showLowBanner && tab !== "alerts") {
        const under = navLowInfo.min < 0
          ? " \u2014 below zero." : ` \u2014 under your ${fmt(alertThresh)} alert threshold.`;
        out.push({
          id: "lowbal", tone: navLowInfo.min < 0 ? "critical" : "warn", icon: "alert-triangle",
          plain: `Balance dips to ${fmt(navLowInfo.min)} on ${MONTHS[navLowInfo.month]} ${navLowInfo.day}`,
          msg: <>
            {"Heads-up: your balance is forecast to dip to "}
            <strong className="cf-text-mono-13">{fmt(navLowInfo.min)}</strong>
            {" around "}
            {MONTHS[navLowInfo.month]}
            {" "}
            {navLowInfo.day}
            {navLowInfo.year !== activeYear ? ", " + navLowInfo.year : ""}
            {under}
          </>,
          actions: [
            { label: "View alerts", onClick: () => setTab("alerts") },
            { label: "Dismiss", ariaLabel: "Dismiss this alert", onClick: () => setLowBannerDismissed(lowBannerKey) }
          ]
        });
      }
      if (showBackupNudge) {
        out.push({
          id: "backup", tone: "warn", icon: "save",
          plain: "A backup is 30+ days overdue",
          msg: <><strong>Time for a backup.</strong>{" It's been 30+ days since your last data export."}</>,
          actions: [
            { label: "Remind me later", onClick: () => dismissBackup(false) },
            { label: "\u2193 Export backup", onClick: () => dismissBackup(true), primary: true }
          ]
        });
      }
      if (entries.some((e) => e.sample)) {
        out.push({
          id: "sample", tone: "info", icon: "info",
          plain: "You're exploring sample data",
          msg: <>
            {"You're exploring "}
            <strong className="c-text">sample data</strong>
            {" \u2014 every entry is fictional and marked \u201C(Sample)\u201D."}
          </>,
          actions: [{ label: "Remove sample data", onClick: () => setEntries((prev) => prev.filter((e) => !e.sample)) }]
        });
      }
      // Every January this household's whole app quietly empties: the active
      // year is last year, so the forecast projects ninety days that contain
      // nothing, the ledger opens on a month that has been and gone, and the
      // only clue is a year badge in the header that a reader has no reason to
      // suspect. The screens are not wrong — there really is nothing scheduled
      // — they just never say why, so this does, and hands over the one action
      // that fixes it.
      const nowYear = (new Date()).getFullYear();
      if (activeYear !== nowYear) {
        const haveIt = yearConfigs.some((y) => y.year === nowYear);
        out.push({
          id: "staleyear", tone: "info", icon: "calendar",
          plain: `You are looking at ${activeYear}, and today is in ${nowYear}`,
          msg: <>
            {"You're looking at "}
            <strong>{String(activeYear)}</strong>
            {" \u2014 today is in "}
            <strong>{String(nowYear)}</strong>
            {haveIt
              ? ", so the forecast and the ledger are showing a year that has passed."
              : `, and ${nowYear} has not been set up yet.`}
          </>,
          actions: [haveIt
            ? { label: `Switch to ${nowYear}`, primary: true, onClick: () => setActiveYear(nowYear) }
            : { label: `Set up ${nowYear}`, primary: true,
                onClick: () => { setTab("you"); setYouSub("years"); } }]
        });
      }
      return out;
    }, [showLowBanner, navLowInfo, alertThresh, lowBannerKey, showBackupNudge, entries, tab,
        activeYear, yearConfigs, canWrite]);
    return { appFindings, appNotices };
  }
