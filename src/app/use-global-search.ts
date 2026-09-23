import { useEffect, useMemo, useRef, useState } from "../lib/runtime.js";
  // The header search: its text, what it will search from where you are, and
  // taking you to the ledger when a search starts somewhere that can't show
  // results. Moved out of App as is.
  export function useGlobalSearch({ tab, flowSub, activeYear, setTab, setFlowSub }) {
    const [globalSearch, setGlobalSearch] = useState("");
    const prevSearchRef = useRef("");
    useEffect(() => {
      const had = !!prevSearchRef.current;
      prevSearchRef.current = globalSearch;
      if (!globalSearch || had) return;
      // Plan and Entries filter their own lists in place — don't yank the
      // user off the thing they are already searching the moment they type.
      if (tab === "plan") return;
      if (tab === "flow" && flowSub === "entries") return;
      // Starting a search shows results in the Budget monthly view (which
      // jumps to the most recent matching month), not the Entries list.
      setTab("flow");
      setFlowSub("list");
    }, [globalSearch, tab, flowSub]);
    // What the header search will actually search, from where the user is.
    const searchScopeLabel = useMemo(() => {
      if (tab === "plan") return "Search goals and debts";
      if (tab === "flow" && flowSub === "entries") return `Search ${activeYear} entries`;
      return `Search ${activeYear}`;
    }, [tab, flowSub, activeYear]);
  return { globalSearch, setGlobalSearch, searchScopeLabel };
  }
