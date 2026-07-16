  const SUPABASE_URL = "https://vhwrflyqcubvybolbifl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_Sgbw04FRX-aSiuqjwEK9OA_www_zmup";
  const isSupabaseConfigured = () => !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
  const supabaseClient = isSupabaseConfigured() ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
