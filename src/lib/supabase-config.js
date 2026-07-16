  const SUPABASE_URL = "https://vhwrflyqcubvybolbifl.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod3JmbHlxY3Vidnlib2xiaWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMzQ5NzUsImV4cCI6MjA5OTgxMDk3NX0.PKKtR6c6mcXV-Sfou3awEDI0HL_1MePaumoOMUZcAug";
  const isSupabaseConfigured = () => !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
  const supabaseClient = isSupabaseConfigured() ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
