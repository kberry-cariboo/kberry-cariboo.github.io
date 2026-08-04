  // Single call path to Claude for every AI feature in the app.
  //
  // Two transports, in preference order:
  //
  //   1. The `ai-proxy` Edge Function, which holds ANTHROPIC_API_KEY as a
  //      Supabase secret. The key never reaches the browser, one deployment
  //      serves every device and household member, and the function is the
  //      one place a rate limit or an audit log can live.
  //   2. A direct browser -> api.anthropic.com call using a key the user
  //      pasted into Settings. This is the original (and only) transport the
  //      app had; it stays as a fallback so the AI features keep working for
  //      anyone who hasn't deployed the function, and so the app is usable
  //      without a household account at all.
  //
  // Transport 2 necessarily exposes the key to anything that can run script on
  // the page, which is why 1 exists and is tried first. Which one served a
  // given call comes back as `via` so the UI can say so.
  const AI_MODEL = "claude-opus-5";
  const AI_PROXY_FN = "ai-proxy";
  // Probed once per page load and remembered here: null = not yet asked,
  // true/false = the answer. A missing function is a 404 on every call, so
  // there's no point re-probing it per feature.
  let _aiProxyAvailable = null;
  let _aiProxyProbe = null;

  function aiSignedIn() {
    return !!(supabaseClient && supabaseClient.auth);
  }

  // Asks the Edge Function whether it's deployed and configured, without
  // spending any Anthropic tokens — the function answers `{ping:true}` from
  // its own process. Resolves false (never throws) so callers can treat it as
  // a plain capability flag.
  async function aiProbeProxy() {
    if (_aiProxyAvailable !== null) return _aiProxyAvailable;
    if (_aiProxyProbe) return _aiProxyProbe;
    if (!aiSignedIn()) {
      _aiProxyAvailable = false;
      return false;
    }
    _aiProxyProbe = (async () => {
      try {
        const { data: sess } = await supabaseClient.auth.getSession();
        // The function verifies the caller's JWT, so a signed-out visitor
        // can't use it even if it is deployed.
        if (!sess || !sess.session) {
          _aiProxyAvailable = false;
          return false;
        }
        const { data, error } = await supabaseClient.functions.invoke(AI_PROXY_FN, { body: { ping: true } });
        _aiProxyAvailable = !error && !!(data && data.ok);
      } catch (e) {
        _aiProxyAvailable = false;
      }
      _aiProxyProbe = null;
      return _aiProxyAvailable;
    })();
    return _aiProxyProbe;
  }

  // True when *some* transport can serve a call. The UI uses this to decide
  // whether to nag for an API key: with the proxy deployed, no key is needed.
  function aiCanRun(apiKey) {
    return !!(apiKey && apiKey.trim()) || _aiProxyAvailable === true;
  }

  function aiErrorMessage(e) {
    const msg = (e && e.message) || "Unknown error";
    if (e && e.code === "no_transport") {
      return "No AI access configured. Add an Anthropic API key in Settings → General, or deploy the ai-proxy Edge Function.";
    }
    if (e && e.code === "refusal") {
      return "Claude declined to answer this one. Try again, or adjust the data you're sending.";
    }
    if (e && e.code === "bad_json") {
      return "Claude's reply wasn't in the expected format. Try again.";
    }
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return "Couldn't reach the AI service. Check your connection and try again.";
    }
    return msg;
  }

  function aiFail(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  // Pulls the answer out of a Messages API response, applying the checks every
  // caller would otherwise repeat: a refusal is a successful HTTP 200 with an
  // empty `content`, and a truncated reply is only visible via stop_reason —
  // both look like "it worked" if you go straight for content[0].text.
  function aiReadResponse(body, schema) {
    if (!body || !Array.isArray(body.content)) {
      throw aiFail("bad_response", "The AI service returned an unexpected response.");
    }
    if (body.stop_reason === "refusal") {
      const cat = body.stop_details && body.stop_details.category;
      throw aiFail("refusal", cat ? `Claude declined this request (${cat}).` : "Claude declined this request.");
    }
    const text = body.content.filter((b) => b.type === "text").map((b) => b.text || "").join("");
    const truncated = body.stop_reason === "max_tokens";
    let data = null;
    if (schema) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // With output_config.format the reply is schema-constrained, so the
        // realistic cause is truncation partway through the JSON rather than
        // the model free-styling. Say which.
        throw aiFail(
          "bad_json",
          truncated
            ? "Claude's reply was cut off before it finished. Try again."
            : "Claude's reply wasn't valid JSON."
        );
      }
    }
    return { data, text, truncated, usage: body.usage || null };
  }

  // Builds the Messages API request body. Kept in one place because the proxy
  // and the direct call must send byte-identical requests — otherwise the two
  // transports quietly produce different output.
  //
  // Thinking is left on (adaptive) everywhere. Claude Opus 5 thinks by default
  // and disabling it is only permitted at effort `high` or below; `effort` is
  // the intended dial for cost, and a lower effort is both cheaper and safer
  // than turning thinking off.
  function aiBuildRequest({ system, messages, schema, maxTokens = 2048, effort = "high" }) {
    const outputConfig = { effort };
    if (schema) outputConfig.format = { type: "json_schema", schema };
    return {
      model: AI_MODEL,
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      output_config: outputConfig,
      ...(system ? { system } : {}),
      messages
    };
  }

  // Runs a request through whichever transport is available.
  //
  // Returns { data, text, truncated, usage, via } where `data` is the parsed
  // object when a schema was supplied. Throws an Error carrying a `.code` —
  // pass it through aiErrorMessage() for something worth showing a user.
  async function callClaude({ system, messages, schema, maxTokens = 2048, effort = "high", apiKey = "" }) {
    const request = aiBuildRequest({ system, messages, schema, maxTokens, effort });
    const proxyReady = await aiProbeProxy();
    if (proxyReady) {
      const { data, error } = await supabaseClient.functions.invoke(AI_PROXY_FN, { body: { request } });
      if (!error) return { ...aiReadResponse(data, schema), via: "proxy" };
      // The proxy answered and said no. That's a real error (bad key on the
      // server, rate limited, Anthropic down) — falling back to the user's own
      // key here would hide a server problem and silently spend their money,
      // so surface it instead. The one exception is the function having gone
      // away since we probed, which is worth re-checking.
      const status = error.context && error.context.status;
      if (status === 404) {
        _aiProxyAvailable = false;
      } else {
        let detail = "";
        try {
          const body = error.context && (await error.context.json());
          detail = (body && (body.error || body.message)) || "";
        } catch (e) {
          // Non-JSON error body (a gateway HTML page, say). The status line
          // below is still worth showing.
        }
        throw aiFail("proxy_error", detail || error.message || "The AI service rejected the request.");
      }
    }
    const key = (apiKey || "").trim();
    if (!key) throw aiFail("no_transport", "No AI transport available.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw aiFail("api_error", (e && e.error && e.error.message) || `API error ${res.status}`);
    }
    return { ...aiReadResponse(await res.json(), schema), via: "direct" };
  }
