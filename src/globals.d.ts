// The page's globals: what src/bootstrap-head.js and src/vendor/ put on
// window before the app bundle runs.
import type * as ReactDOMClient from "react-dom/client";

declare global {
  /** The release, set by bootstrap-head.js (also the service worker's cache name). */
  const CF_VERSION: string;
  /** react-dom/client, from vendor/react-bundle.js. */
  const ReactDOM: typeof ReactDOMClient;
  /** vendor/mini-recharts.js: the subset of the Recharts API the charts use. */
  const Recharts: Record<string, any>;
  interface Window {
    /** The same object as the Recharts global (the self-test checks it loaded). */
    Recharts?: Record<string, any>;
    /** The Supabase client library, from vendor/supabase-client.js. */
    supabase?: { createClient: (url: string, key: string, options?: object) => any };
  }
}
export {};
