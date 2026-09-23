// ai-proxy's request handling, with nothing platform-specific in it.
//
// index.ts wires this to Deno.serve and Supabase; everything that decides who
// is answered and what reaches Anthropic lives here, behind two injected
// functions, so tests/ai-proxy.mjs can drive it under plain Node with a fake
// caller and a fake Anthropic. It imports nothing for the same reason.
//
// Keep it to erasable TypeScript (types only — no enums, no parameter
// properties): the test runs it through Node's type stripping, not a compiler.

// Models this function is willing to bill your account for. The client only
// ever sends one of these, but the allowlist is what makes that true rather
// than merely intended — without it, anyone with a login could ask for the
// most expensive model available and you'd pay for it.
export const ALLOWED_MODELS = new Set(["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"]);
// Ceiling on a single response. The app's largest request (the yearly
// assessment) asks for 4000; this leaves headroom without letting a caller
// request a 128k-token essay on your bill.
export const MAX_OUTPUT_TOKENS = 8000;
// Ceiling on a single request body. Receipt images are the big ones — a
// base64 photo runs to a few hundred KB — so this is generous, but it stops
// an unbounded upload from turning into an unbounded input-token bill.
export const MAX_BODY_BYTES = 6 * 1024 * 1024;

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Who is calling. `member` is the answer that matters: signing up is open to
// anyone who finds the app, so a valid login proves only that someone has an
// account. It is membership of a household — an active one, not disabled —
// that makes them someone this deployment's owner has agreed to pay for.
export type Caller =
  | { ok: true; userId: string; member: boolean }
  | { ok: false };

export type Deps = {
  anthropicKey: string;
  // Resolves the Authorization header to a caller. Never throws for a bad
  // token; that is `{ ok: false }`.
  identify: (authHeader: string) => Promise<Caller>;
  fetch: typeof fetch;
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
export function sanitize(request: Record<string, unknown>): Record<string, unknown> | { error: string } {
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

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Who's asking. Supabase already rejects an unsigned request before we get
  // here (verify_jwt defaults on), but checking explicitly means a
  // misconfigured deployment fails closed rather than becoming an open relay.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.replace(/^Bearer\s+/i, "")) return json({ error: "Not signed in." }, 401);
  const caller = await deps.identify(authHeader);
  if (!caller.ok) return json({ error: "Not signed in." }, 401);
  // Checked before anything else is read — the capability probe included, so
  // an outsider learns nothing about whether a key is configured.
  if (!caller.member) {
    return json({ error: "AI features are available to household members only." }, 403);
  }

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
    return deps.anthropicKey
      ? json({ ok: true, models: [...ALLOWED_MODELS] })
      : json({ ok: false, error: "ANTHROPIC_API_KEY is not set on this project." });
  }

  if (!deps.anthropicKey) return json({ error: "ANTHROPIC_API_KEY is not set on this project." }, 500);

  const request = body.request;
  if (!request || typeof request !== "object") return json({ error: "Missing `request`." }, 400);
  const clean = sanitize(request as Record<string, unknown>);
  if ("error" in clean) return json({ error: clean.error }, 400);

  // Rate limiting hook: `caller.userId` identifies the caller, so a per-user
  // daily counter (a small table plus an upsert here) is the natural next step
  // if this ever faces more than a household's worth of traffic. Deliberately
  // not implemented yet — it needs a schema change, and the membership check
  // above already bounds who can spend at all.

  const res = await deps.fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": deps.anthropicKey,
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
}
