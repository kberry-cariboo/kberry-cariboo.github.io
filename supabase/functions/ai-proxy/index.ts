// ai-proxy — server-side holder of the Anthropic API key.
//
// Every AI feature in the app (the yearly assessment, receipt scanning, CSV
// categorisation, natural-language entry capture, monthly commentary) calls
// Claude through here. The point is that ANTHROPIC_API_KEY lives in Supabase
// secrets instead of in each browser: the app's original design pasted a key
// into Settings and called api.anthropic.com directly, which meant the key sat
// in localStorage on every device and anything able to run script on the page
// could read it. That path still exists as a fallback (see src/lib/ai.js), but
// once this function is deployed the client prefers it and no key is shipped.
//
// It is also the only chokepoint in the system: if you want per-user quotas,
// spend caps or an audit log, this is where they go. See "Rate limiting" below.
//
// Deploy:  supabase functions deploy ai-proxy
//          (JWT verification stays ON — unlike send-notifications, this is
//          called by signed-in browsers, and the check is what stops the
//          function being an open relay to your Anthropic account.)
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          (SUPABASE_URL / SUPABASE_ANON_KEY are injected already)
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle, type Caller } from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// Calls per member per UTC day. Generous for a household (the heaviest
// feature, the yearly assessment, is one call) and a ceiling on a runaway.
const AI_DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "100") || 100;
// Optional: the site(s) allowed to call this from a browser, comma-separated,
// e.g. https://you.github.io. Unset allows any (see corsFor in handler.ts).
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

// Everything this function decides is in handler.ts; this file only connects
// it to Supabase. The membership read runs *as the caller* (their JWT, the
// anon key) so row-level security answers it: the "read household members"
// policy only shows rows of a household the caller is an active member of,
// which means a disabled member finds no row of their own and is refused.
const asCaller = (authHeader: string) => createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: authHeader } },
  auth: { persistSession: false, autoRefreshToken: false },
});

async function identify(authHeader: string): Promise<Caller> {
  const db = asCaller(authHeader);
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userData?.user) return { ok: false };
  const userId = userData.user.id;
  const { data: rows, error } = await db
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .eq("disabled", false)
    .limit(1);
  // A failed lookup is not proof of membership: fail closed.
  return { ok: true, userId, member: !error && Array.isArray(rows) && rows.length > 0 };
}

Deno.serve((req: Request) => handle(req, {
  anthropicKey: ANTHROPIC_API_KEY,
  allowedOrigins: ALLOWED_ORIGINS,
  identify,
  // As the caller, so ai_take_quota counts against their own auth.uid().
  takeQuota: async () => {
    const { data, error } = await asCaller(req.headers.get("Authorization") ?? "").rpc("ai_take_quota", { p_limit: AI_DAILY_LIMIT });
    if (error) {
      console.warn("ai_take_quota unavailable — re-run supabase/schema.sql:", error.message);
      return null;
    }
    return data === true;
  },
  fetch,
}));
