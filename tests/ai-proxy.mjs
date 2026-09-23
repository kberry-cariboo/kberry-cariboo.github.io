// Who the ai-proxy Edge Function will spend the Anthropic key for.
//
// Signing up is open to anyone who finds the app, and the function used to
// accept any valid login — so anyone could create an account and use this
// deployment as a free relay to Claude on the owner's bill. It now answers
// active household members only. This drives the real handler
// (supabase/functions/ai-proxy/handler.ts) with a fake caller and a fake
// Anthropic, so it needs no Deno, no Supabase and no network.
//
//   node --experimental-strip-types tests/ai-proxy.mjs
//
// (Node 23.6+ strips types by default; the flag is for Node 22.)
import { handle, MAX_OUTPUT_TOKENS } from '../supabase/functions/ai-proxy/handler.ts';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  ↳ ' + detail));
};

const CALLERS = {
  'Bearer member': { ok: true, userId: 'u-member', member: true },
  'Bearer outsider': { ok: true, userId: 'u-outsider', member: false },
  'Bearer bad': { ok: false },
};
const run = async ({ auth = 'Bearer member', body, method = 'POST', key = 'sk-test', quota, origins, origin } = {}) => {
  const sent = [];
  let quotaTaken = 0;
  const deps = {
    anthropicKey: key,
    allowedOrigins: origins,
    takeQuota: quota === undefined ? undefined : async () => { quotaTaken++; return quota; },
    identify: async (h) => CALLERS[h] || { ok: false },
    fetch: async (url, init) => {
      sent.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'hi' }] }), { status: 200 });
    },
  };
  const headers = Object.assign(auth ? { Authorization: auth } : {}, origin ? { Origin: origin } : {});
  const req = new Request('https://x/functions/v1/ai-proxy', {
    method, headers, body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  });
  const res = await handle(req, deps);
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, sent, quotaTaken, allowOrigin: res.headers.get('Access-Control-Allow-Origin') };
};
const call = { request: { model: 'claude-opus-5', max_tokens: 100, messages: [{ role: 'user', content: 'hi' }] } };

// ── Who is answered ──────────────────────────────────────────────────────────
{
  const r = await run({ auth: 'Bearer outsider', body: call });
  check('a signed-in account in no household is refused, and nothing reaches Anthropic',
    r.status === 403 && r.sent.length === 0, `status ${r.status}, ${r.sent.length} upstream call(s)`);
}
{
  const r = await run({ auth: 'Bearer outsider', body: { ping: true } });
  check('an outsider cannot even probe whether a key is configured',
    r.status === 403 && !(r.json && r.json.ok), `status ${r.status} ${JSON.stringify(r.json)}`);
}
{
  const r = await run({ auth: null, body: call });
  check('no Authorization header is refused as not signed in', r.status === 401 && r.sent.length === 0, `status ${r.status}`);
}
{
  const r = await run({ auth: 'Bearer bad', body: call });
  check('a token that does not resolve to a user is refused', r.status === 401 && r.sent.length === 0, `status ${r.status}`);
}
{
  const r = await run({ body: call });
  check('a household member is answered, through Anthropic',
    r.status === 200 && r.sent.length === 1 && r.sent[0].url === 'https://api.anthropic.com/v1/messages',
    `status ${r.status}, ${r.sent.length} upstream call(s)`);
}
{
  const r = await run({ body: { ping: true } });
  check('a member\'s probe reports the key as available', r.status === 200 && r.json && r.json.ok === true, JSON.stringify(r.json));
}
{
  const r = await run({ body: { ping: true }, key: '' });
  check('with no key set, a member\'s probe says so rather than claiming readiness',
    r.status === 200 && r.json && r.json.ok === false, JSON.stringify(r.json));
}

// ── What is sent on their behalf ─────────────────────────────────────────────
// Unchanged by the membership check, and pinned here now that the handler can
// be run at all: a member still cannot choose their own model or reply size.
{
  const r = await run({ body: { request: { ...call.request, model: 'claude-some-other' } } });
  check('a model outside the allowlist is refused', r.status === 400 && r.sent.length === 0, `status ${r.status}`);
}
{
  const r = await run({ body: { request: { ...call.request, max_tokens: 200000, temperature: 1, tools: [] } } });
  const b = r.sent[0] && r.sent[0].body;
  check('max_tokens is capped and unreviewed parameters are dropped',
    b && b.max_tokens === MAX_OUTPUT_TOKENS && !('temperature' in b) && !('tools' in b), JSON.stringify(b));
}
{
  const r = await run({ method: 'GET' });
  check('only POST is served', r.status === 405, `status ${r.status}`);
}

// ── How much ─────────────────────────────────────────────────────────────────
// A per-member daily allowance (ai_usage / ai_take_quota in schema.sql).
{
  const r = await run({ body: call, quota: false });
  check('a member over today\'s allowance gets 429, and nothing reaches Anthropic',
    r.status === 429 && r.sent.length === 0, `status ${r.status}, ${r.sent.length} upstream call(s)`);
}
{
  const r = await run({ body: call, quota: true });
  check('a member within it is answered', r.status === 200 && r.sent.length === 1 && r.quotaTaken === 1, `status ${r.status}, taken ${r.quotaTaken}`);
}
{
  const r = await run({ body: { ping: true }, quota: false });
  check('the capability probe spends no allowance', r.status === 200 && r.quotaTaken === 0, `status ${r.status}, taken ${r.quotaTaken}`);
}
{
  const r = await run({ auth: 'Bearer outsider', body: call, quota: true });
  check('an outsider is refused before any allowance is counted', r.status === 403 && r.quotaTaken === 0, `taken ${r.quotaTaken}`);
}
{
  const r = await run({ body: { request: { ...call.request, model: 'nope' } }, quota: true });
  check('a malformed request is refused without spending allowance', r.status === 400 && r.quotaTaken === 0, `taken ${r.quotaTaken}`);
}
{
  const r = await run({ body: call, quota: null });
  check('a database without the counter lets the call through (and logs it)', r.status === 200, `status ${r.status}`);
}

// ── From where ───────────────────────────────────────────────────────────────
{
  const allowed = await run({ body: call, origins: ['https://me.github.io'], origin: 'https://me.github.io' });
  const other = await run({ body: call, origins: ['https://me.github.io'], origin: 'https://evil.example' });
  const open = await run({ body: call });
  check('with ALLOWED_ORIGINS set, only the named site is granted CORS',
    allowed.allowOrigin === 'https://me.github.io' && other.allowOrigin === null && open.allowOrigin === '*',
    JSON.stringify({ allowed: allowed.allowOrigin, other: other.allowOrigin, open: open.allowOrigin }));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
