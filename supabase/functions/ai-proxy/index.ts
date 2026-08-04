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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

// Models this function is willing to bill your account for. The client only
// ever sends one of these, but the allowlist is what makes that true rather
// than merely intended — without it, anyone with a login could ask for the
// most expensive model available and you'd pay for it.
const ALLOWED_MODELS = new Set(["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"]);
// Ceiling on a single response. The app's largest request (the yearly
// assessment) asks for 4000; this leaves headroom without letting a caller
// request a 128k-token essay on your bill.
const MAX_OUTPUT_TOKENS = 8000;
// Ceiling on a single request body. Receipt images are the big ones — a
// base64 photo runs to a few hundred KB — so this is generous, but it stops
// an unbounded upload from turning into an unbounded input-token bill.
const MAX_BODY_BYTES = 6 * 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Rebuilds the request from validated fields instead of forwarding what the
// caller sent. Passing the body through verbatim would let a client set any
// Messages API parameter it liked — a different model, a huge max_tokens, or
// parameters this function hasn't been reviewed against. Anything not listed
// here simply doesn't reach Anthropic.
function sanitize(request: Record<string, unknown>): Record<string, unknown> | { error: string } {
  const model = String(request.model ?? "");
  if (!ALLOWED_MODELS.has(model)) return { error: `Model not allowed: ${model || "(none)"}` };

  const maxTokens = Number(request.max_tokens ?? 0);
  if (!Number.isInteger(maxTokens) || maxTokens < 1) return { error: "max_tokens must be a positive integer" };

  const messages = request.messages;
  if (!Array.isArray(messages) || messages.length === 0) return { error: "messages must be a non-empty array" };

  const out: Record<string, unknown> = {
    model,
    max_tokens: Math.min(maxTokens, MAX_OUTPUT_TOKENS),
    messages,
  };
  if (typeof request.system === "string" && request.system) out.system = request.system;
  if (request.thinking && typeof request.thinking === "object") out.thinking = request.thinking;
  if (request.output_config && typeof request.output_config === "object") out.output_config = request.output_config;
  return out;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Who's asking. Supabase already rejects an unsigned request before we get
  // here (verify_jwt defaults on), but checking explicitly means a
  // misconfigured deployment fails closed rather than becoming an open relay.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not signed in." }, 401);
  const db = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "Not signed in." }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Request too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // Capability probe. The client calls this once per page load to decide
  // whether to prefer this function over a browser-held key, so it must not
  // spend tokens — and it must report an unconfigured key as "not available"
  // rather than pretending readiness and failing on the first real call.
  if (body.ping === true) {
    return ANTHROPIC_API_KEY
      ? json({ ok: true, models: [...ALLOWED_MODELS] })
      : json({ ok: false, error: "ANTHROPIC_API_KEY is not set on this project." });
  }

  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY is not set on this project." }, 500);

  const request = body.request;
  if (!request || typeof request !== "object") return json({ error: "Missing `request`." }, 400);
  const clean = sanitize(request as Record<string, unknown>);
  if ("error" in clean) return json({ error: clean.error }, 400);

  // Rate limiting hook: `userData.user.id` identifies the caller, so a per-user
  // daily counter (a small table plus an upsert here) is the natural next step
  // if this ever faces more than a household's worth of traffic. Deliberately
  // not implemented yet — it needs a schema change, and the validation above
  // already bounds the cost of any single call.

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(clean),
  });

  const text = await res.text();
  if (!res.ok) {
    // Pass Anthropic's own message through — "credit balance too low" or
    // "rate limited" is far more actionable than a generic 502, and none of
    // it leaks the key.
    let message = `Anthropic returned ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.error?.message ?? message;
    } catch {
      // Non-JSON error body; the status line above stands on its own.
    }
    return json({ error: message }, res.status);
  }

  return new Response(text, { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
});
