import { useEffect, useLayoutEffect, useState } from "../lib/runtime.js";
import { setMoneyFormat } from "../lib/format.js";
  // The two pieces of global presentation state the app's synchronous helpers
  // read: the theme attribute on <html> (plus the browser's theme-color), and
  // the money format fmt() uses — with the one forced re-render a currency
  // change needs, since fmt()'s output changing is invisible to React. Moved
  // out of App as is.
  export function useThemeAndFormat({ darkMode, sessionUser, locale, currency }) {
    // fmt() reads module state, so React has no idea its output changed when
    // the currency does. This is the one re-render that has to be forced.
    const [, setMoneyTick] = useState(0);
    useEffect(() => {
      setMoneyTick((t) => t + 1);
    }, [locale, currency]);
    useLayoutEffect(() => {
      // One attribute, not thirty-four inline properties. The values live in
      // src/styles.css; this only says which set applies. Writing them onto
      // <html> meant every rule that needed to override one — the whole print
      // stylesheet — had to fight an inline style with !important.
      //
      // Signed out is always light: the login screen is the same for everyone,
      // and the stored preference belongs to a household nobody has opened yet.
      const dark = !!(sessionUser && darkMode);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      // The browser paints its own chrome — the address bar, the task
      // switcher card, the notch area on an installed app — from this, and it
      // is not reachable by CSS. The value is read back out of the token
      // rather than written down again here: a fourth copy of the palette is
      // a fourth thing to drift, and this one would drift somewhere only
      // visible outside the page.
      try {
        const meta = document.querySelector('meta[name="theme-color"]');
        const headerBg = getComputedStyle(document.documentElement)
          .getPropertyValue("--headerBg").trim();
        if (meta && headerBg) meta.setAttribute("content", headerBg);
      } catch (e) {
        // Cosmetic and outside the page; a failure here is not worth a
        // broken render.
      }
      // color-scheme rides along in CSS with the tokens, so native UI (selects,
      // date pickers, scrollbars, autofill) follows without a second write.
    }, [darkMode, sessionUser]);
    // Currency and number format reach fmt() the same way holidays reach
    // expandEntries: through a module-level registry, because both are read
    // from synchronous helpers called in dozens of places that have no access
    // to React state. Done in a layout effect so the first paint after a
    // change is already formatted correctly.
    useLayoutEffect(() => {
      setMoneyFormat(locale, currency);
    }, [locale, currency]);
  }
