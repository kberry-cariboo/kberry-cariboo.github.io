  // Extracted from app-data.js (round-9 AR4 remainder) — pure code motion.

  // ── Biometric unlock (WebAuthn platform authenticator) ──────────────
  // This is a *local device unlock*, not a replacement for Supabase auth:
  // there's no relying-party server to verify the assertion against, so a
  // successful ceremony only proves "the same fingerprint/face that
  // registered this device is present right now." It gates re-entry after
  // the auto-lock timeout; it never signs anyone in or out of Supabase.
  function b64urlEncode(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function randomChallenge() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return arr;
  }
  async function isBiometricAvailable() {
    try {
      if (!window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }
  function getBiometricCredId(userId) {
    try {
      return localStorage.getItem("cf_webauthn_" + userId);
    } catch (e) {
      return null;
    }
  }
  async function registerBiometric(userId, email, fullName) {
    const cred = await navigator.credentials.create({
      publicKey: {
        rp: { name: "CashFlow" },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: fullName || email
        },
        challenge: randomChallenge(),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 6e4,
        attestation: "none"
      }
    });
    if (!cred) throw new Error("No credential returned.");
    const credId = b64urlEncode(cred.rawId);
    try {
      localStorage.setItem("cf_webauthn_" + userId, credId);
    } catch (e) {
      // Surface this instead of returning as if it succeeded — otherwise the
      // caller shows "enabled" while nothing was actually saved, and the next
      // unlock attempt fails with a confusing "not set up" error instead.
      throw new Error("Couldn't save the fingerprint/face credential on this device (storage may be full or blocked).");
    }
    return credId;
  }
  function clearBiometric(userId) {
    try {
      localStorage.removeItem("cf_webauthn_" + userId);
    } catch (e) {
    }
  }
  async function verifyBiometric(userId) {
    const credId = getBiometricCredId(userId);
    if (!credId) throw new Error("No biometric unlock set up on this device.");
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ id: b64urlDecode(credId), type: "public-key" }],
        userVerification: "required",
        timeout: 6e4
      }
    });
    if (!assertion) throw new Error("Verification failed.");
    return true;
  }
