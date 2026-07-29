#!/usr/bin/env node
// Generates a VAPID key pair for Web Push.
//
//   node scripts/gen-vapid-keys.js
//
// Uses only Node's built-in crypto — no dependency to install, and nothing
// leaves the machine. VAPID keys are an ECDSA P-256 pair; the public half is
// the uncompressed point (65 bytes, 0x04 || X || Y) and the private half is the
// raw 32-byte scalar, both base64url with the padding stripped. That is exactly
// the encoding pushManager.subscribe() and the web-push library expect.
//
// The public key is not a secret: it ships to every browser in the app bundle.
// The private key is — it goes into the Edge Function's secrets and nowhere
// else. Don't commit it.
"use strict";
const crypto = require("crypto");

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });

// jwk gives X, Y and D already base64url-encoded, which saves unpicking DER.
const jwk = privateKey.export({ format: "jwk" });
const x = Buffer.from(jwk.x, "base64url");
const y = Buffer.from(jwk.y, "base64url");
const d = Buffer.from(jwk.d, "base64url");

const pub = b64url(Buffer.concat([Buffer.from([4]), x, y]));
const priv = b64url(d);

// Sanity check: the public key must be the 65-byte uncompressed form, or
// applicationServerKey will be rejected by the browser at subscribe() time.
if (Buffer.from(pub, "base64url").length !== 65) {
  console.error("gen-vapid-keys: unexpected public key length — aborting");
  process.exit(1);
}
void publicKey;

console.log(`
VAPID key pair
==============

Public key (safe to commit — paste into src/lib/supabase-config.js as
VAPID_PUBLIC_KEY, then run 'node build.js'):

  ${pub}

Private key (SECRET — never commit; set it on the Edge Function):

  ${priv}

Next steps:

  supabase secrets set VAPID_PUBLIC_KEY=${pub}
  supabase secrets set VAPID_PRIVATE_KEY=${priv}
  supabase secrets set VAPID_SUBJECT=mailto:you@example.com
  supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
`);
