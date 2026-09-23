import { safeStorage, useEffect, useRef, useState } from "../lib/runtime.js";
import { LEGACY_FLOW_SUBS, ROUTE_FLOW_SUBS, parseTabHash, useLS, viewDocTitle } from "../lib/app-data.js";
  // Where the reader is: the tab, the Flow and Plan lenses, the Settings page,
  // and the hash route that mirrors them (Back/Forward, deep links, legacy
  // routes, the document title, scroll reset on navigation). Moved out of App
  // as is.
  export function useRoute() {
    const [tab, setTab] = useState(() => {
      const fromHash = parseTabHash().tab;
      if (fromHash) return fromHash;
      try {
        return sessionStorage.getItem("cf_tab") || "today";
      } catch (e) {
        return "today";
      }
    });
    useEffect(() => {
      safeStorage.set("cf_tab", tab, "session");
    }, [tab]);
    const [flowSubRaw, setFlowSub] = useLS("cf_budget_subtab", "list");
    // The key keeps its old name on purpose: renaming a storage key silently
    // resets every existing device on upgrade. Only the value vocabulary moved.
    const flowSub = ROUTE_FLOW_SUBS.includes(flowSubRaw) ? flowSubRaw : (LEGACY_FLOW_SUBS[flowSubRaw] || "list");
    const [planSub, setPlanSub] = useLS("cf_plan_subtab", "goals");
    // Deliberately not useLS, unlike the other two. Flow and Plan remember
    // which lens you read them in, because that is a preference. Settings is a
    // directory: opening it should show the directory, not drop you back
    // inside whichever page you were last in. The route carries it instead, so
    // Back works and a link to a settings page is a link.
    const [youSub, setYouSub] = useState(null);
    const hashSyncGuard = useRef(false);
    const hashInitialized = useRef(false);
    useEffect(() => {
      const fromHash = parseTabHash();
      if (fromHash.flowSub) setFlowSub(fromHash.flowSub);
      if (fromHash.planSub) setPlanSub(fromHash.planSub);
      if (fromHash.youSub) setYouSub(fromHash.youSub);
    }, []);
    // Leaving Settings closes whichever page was open, so coming back lands on
    // the directory rather than three levels in.
    useEffect(() => {
      if (tab !== "you" && youSub) setYouSub(null);
    }, [tab, youSub]);
    useEffect(() => {
      if (hashSyncGuard.current) {
        hashSyncGuard.current = false;
        return;
      }
      let newHash;
      try {
        newHash = "#/" + tab + (tab === "flow" && flowSub ? "/" + flowSub : "") + (tab === "plan" && planSub ? "/" + planSub : "") + (tab === "you" && youSub ? "/" + youSub : "");
        if (location.hash !== newHash) {
          // First sync on a hashless load replaces the entry instead of
          // pushing — otherwise the first Back press appears to do nothing.
          if (!hashInitialized.current && !location.hash) history.replaceState(null, "", newHash);
          else history.pushState(null, "", newHash);
        }
        hashInitialized.current = true;
      } catch (e) {
        // A malformed or inaccessible hash just means no deep link; the
        // default view is correct.
      }
    }, [tab, flowSub, planSub, youSub]);
    // Name the view in the one place the browser reads: the tab strip, the
    // history entry and the bookmark. Every one of them used to say
    // "CashFlow Budget", which made a back button through six views
    // indistinguishable from a back button through one.
    //
    // printView() swaps the title and puts it back, so this deliberately
    // does not reset it on unmount — it would race the restore.
    const docTitle = viewDocTitle(tab, flowSub, planSub);
    useEffect(() => {
      try {
        document.title = docTitle;
      } catch (e) {
        // A document that won't take a title is not worth failing a render
        // over; the view still renders under whatever title it has.
      }
    }, [docTitle]);
    useEffect(() => {
      const onPopState = () => {
        const parsed = parseTabHash();
        // Not every hash is a route: the skip link is "#main-content", and
        // in-page anchors elsewhere are their own element ids. Claiming the
        // sync guard for one of those swallowed the *next* real tab change's
        // hash write, which left the URL stuck on "#main-content" — a stale
        // deep link and a Back button pointing at the wrong view.
        if (!parsed.tab) return;
        // A retired route is rewritten here rather than left to the sync
        // effect below, because that effect only runs when one of the setters
        // actually changes something — and "#/budget/monthly" while you are
        // already on the List lens changes nothing, so the address bar would
        // keep showing a route the app no longer has. replaceState, not push:
        // Back should return to wherever you came from, not to the dead link.
        if (parsed.redirected) {
          try {
            const canonical = "#/" + parsed.tab
              + (parsed.tab === "flow" && parsed.flowSub ? "/" + parsed.flowSub : "")
              + (parsed.tab === "plan" && parsed.planSub ? "/" + parsed.planSub : "")
              + (parsed.tab === "you" && parsed.youSub ? "/" + parsed.youSub : "");
            if (location.hash !== canonical) history.replaceState(null, "", canonical);
          } catch (e) {
            // An inaccessible history just means the old hash stays in the
            // address bar; the view underneath it is still the right one.
          }
        }
        hashSyncGuard.current = true;
        // The guard is normally consumed by the sync effect below — but that
        // effect only re-runs when one of these setters actually changes
        // something, and a hash naming the view you are already on doesn't.
        // Drop it on the next tick so a no-op navigation can't leave it armed
        // for the next real one. (Clearing early is harmless: the effect
        // still checks location.hash before it pushes anything.)
        setTimeout(() => {
          hashSyncGuard.current = false;
        }, 0);
        setTab(parsed.tab);
        if (parsed.tab === "flow" && parsed.flowSub) setFlowSub(parsed.flowSub);
        if (parsed.tab === "plan" && parsed.planSub) setPlanSub(parsed.planSub);
        // Unlike the other two this is set unconditionally, including to null:
        // Back out of a settings page has to return to the directory, and a
        // hash of "#/you" is exactly how the history entry says so.
        setYouSub(parsed.tab === "you" ? parsed.youSub : null);
      };
      window.addEventListener("popstate", onPopState);
      // popstate doesn't fire for an ordinary in-page link to "#/help" or for
      // a hash typed into the address bar — only Back/Forward reach it. The
      // Help page is linked to as a plain <a href="#/help"> from the copy it
      // replaced, so the same handler runs on hashchange too.
      window.addEventListener("hashchange", onPopState);
      return () => {
        window.removeEventListener("popstate", onPopState);
        window.removeEventListener("hashchange", onPopState);
      };
    }, []);
    useEffect(() => {
      if (tab === "register") {
        setTab("flow");
        setFlowSub("entries");
      } else if (tab === "forecast") {
        setTab("flow");
        setFlowSub("curve");
      }
    }, []);
    // Switching views keeps the old scroll offset (the app root is one shared
    // scroller), so a scrolled dashboard dumped users mid-list on the next tab.
    const scrollResetReady = useRef(false);
    useEffect(() => {
      if (!scrollResetReady.current) {
        scrollResetReady.current = true;
        return;
      }
      try {
        const sc = document.querySelector(".app-scroll");
        if (sc) sc.scrollTop = 0;
        window.scrollTo(0, 0);
      } catch (e) {
        // Scroll/focus restoration is cosmetic; failing it must not break
        // navigation.
      }
    }, [tab, flowSub, planSub]);
    return { tab, setTab, flowSub, setFlowSub, planSub, setPlanSub, youSub, setYouSub };
  }
