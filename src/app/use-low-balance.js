  // The next sixty days' lowest point, if it is under the alert threshold,
  // and whether its banner has been dismissed — by which dip, not by date.
  // Moved out of App as is.
  function useLowBalance({ activeFlow, viewFlows, activeYear, alertThresh }) {
    const navLowInfo = useMemo(() => {
      try {
        const now = /* @__PURE__ */ new Date();
        if (now.getFullYear() !== activeYear || !activeFlow.length) return null;
        const today = new Date(activeYear, now.getMonth(), now.getDate());
        const end = new Date(today);
        end.setDate(end.getDate() + 60);
        // The sixty days run into January from November on, and next year's
        // flow opens on this year's closing balance — so a dip in the first
        // week of January is as much this warning's business as one in
        // December. Reading only the active year used to miss it entirely.
        let min = null, minEv = null, minYear = null;
        [[activeYear, activeFlow], [activeYear + 1, viewFlows[activeYear + 1] || []]].forEach(([y, fl]) => {
          fl.forEach((ev) => {
            const d = new Date(y, ev.month, ev.day);
            if (d < today || d > end) return;
            if (min === null || ev.balance < min) {
              min = ev.balance;
              minEv = ev;
              minYear = y;
            }
          });
        });
        return min !== null && min < alertThresh ? { min, month: minEv.month, day: minEv.day, year: minYear } : null;
      } catch (err) {
        return null;
      }
    }, [activeFlow, viewFlows, activeYear, alertThresh]);
    const navLowAlert = !!navLowInfo;
    // Dismissing the low-balance banner used to mean "for today": the stored
    // value was a date, so the same warning about the same dip announced
    // itself again every morning. A warning you have read and decided about
    // should stay read.
    //
    // What is stored is which warning was dismissed, not when. It cannot be a
    // bare flag — the next dip is a different dip and has to be able to speak
    // — and it cannot be the forecast figure either, because that moves by a
    // few cents on any edit and would resurface the same warning for no
    // reason. It is the day the balance bottoms out and whether that bottom
    // is below zero or merely below the alert threshold, which are the two
    // things that change what the banner is telling you. A dip that moves to
    // another day, or crosses from "under your threshold" to "below zero",
    // is news again and says so.
    //
    // Anything left over from the old key is a date string, which matches no
    // identity, so a reader who had it snoozed sees the banner once more and
    // then dismisses it for good.
    const [lowBannerDismissed, setLowBannerDismissed] = useLS("cf_lowbal_dismissed", "");
    // A dip in next year carries its year; one in this year keeps the key it
    // always had, so a warning already dismissed stays dismissed.
    const lowBannerKey = navLowInfo
      ? `${navLowInfo.year !== activeYear ? navLowInfo.year + "-" : ""}${navLowInfo.month}-${navLowInfo.day}:${navLowInfo.min < 0 ? "below-zero" : "under-threshold"}`
      : "";
    const showLowBanner = navLowInfo && lowBannerDismissed !== lowBannerKey;
  return { navLowInfo, navLowAlert, lowBannerKey, showLowBanner, setLowBannerDismissed };
  }
