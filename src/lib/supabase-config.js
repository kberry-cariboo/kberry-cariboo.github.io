  const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
  const isSupabaseConfigured = () => !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
  const supabaseClient = isSupabaseConfigured() ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
