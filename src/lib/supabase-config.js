  const SUPABASE_URL = "https://vhwrflyqcubvybolbifl.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod3JmbHlxY3Vidnlib2xiaWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMzQ5NzUsImV4cCI6MjA5OTgxMDk3NX0.PKKtR6c6mcXV-Sfou3awEDI0HL_1MePaumoOMUZcAug";
  // Web Push application server key (VAPID), base64url, uncompressed P-256
  // public point. Generate a pair with `node scripts/gen-vapid-keys.js`; the
  // public half belongs here (it ships to every browser by design and is not a
  // secret), the private half goes into the Edge Function's
  // VAPID_PRIVATE_KEY secret and must never be committed. Leaving this empty
  // simply disables background push — the app falls back to foreground-only
  // notifications and says so in Settings.
  const VAPID_PUBLIC_KEY = "prime256v1";
  const isSupabaseConfigured = () => !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
  const supabaseClient = isSupabaseConfigured() ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
